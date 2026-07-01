import { redirect, type Handle } from '@sveltejs/kit';
import { jwtDecode, type JwtPayload } from 'jwt-decode';
import { PermissionService } from './app/service/auth/PermissionService';
import type { UserRole } from './app/model/user/UserRole';
import { configService } from './app/service/ConfigService';

// 사용자 정보를 위한 타입 정의
type User = {
	id?: string;
	uuid?: string;
	role?: string;
	// name 필드는 JWT에 없으므로 제거
};

// SvelteKit Locals 타입 확장 (tsconfig의 app.d.ts에서 확장하는 것이 정석이지만, 여기선 주석으로 안내)
// declare module '@sveltejs/kit' {
//   interface Locals {
//     user: User | null;
//   }
// }

// 백엔드 API 주소 (환경 변수로 관리하는 것을 권장합니다)
const BACKEND_API_URL = 'http://localhost:3000'; // ConfigService에서 관리되도록 개선 예정

/**
 * 모든 서버 요청을 가로채는 핸들러 함수입니다.
 * 사용자의 인증 상태를 확인하고, 필요 시 토큰을 갱신하며, 페이지 접근을 제어합니다.
 */
export const handle: Handle = async ({ event, resolve }) => {
	// 설정에서 쿠키 정보 가져오기
	const accessTokenConfig = configService.getAccessTokenCookieConfig();
	const refreshTokenConfig = configService.getRefreshTokenCookieConfig();

	// 1. 쿠키에서 Access Token과 Refresh Token을 가져옵니다.
	// 기존 쿠키 이름과 새로운 쿠키 이름 모두 확인 (호환성 유지)
	let accessToken = event.cookies.get(accessTokenConfig?.name || 'jwt');
	if (!accessToken) {
		accessToken = event.cookies.get('jwt'); // 기존 쿠키 이름으로도 확인
	}

	let refreshToken = event.cookies.get(refreshTokenConfig?.name || 'refreshToken');
	if (!refreshToken) {
		refreshToken = event.cookies.get('refreshToken'); // 기존 쿠키 이름으로도 확인
	}

	// 기본적으로 로그아웃 상태로 초기화합니다.
	// @ts-expect-error - Locals 타입 확장 필요
	event.locals.user = null;

	if (accessToken) {
		try {
			// 2. Access Token이 유효한지 확인합니다.
			// JWT 페이로드를 직접 디코딩
			const payloadPart = accessToken.split('.')[1];
			const decoded = JSON.parse(atob(payloadPart));

			// 테스트 로그: Access Token 디코딩 값 출력
			console.log('🔍 Access Token 디코딩 테스트:');
			console.log('🔍 전체 디코딩 값:', decoded);
			console.log('🔍 만료 시간 (exp):', decoded.exp);
			console.log('🔍 현재 시간:', Date.now());
			console.log(
				'🔍 만료 여부:',
				decoded.exp ? (decoded.exp * 1000 > Date.now() ? '유효' : '만료') : 'exp 없음'
			);
			console.log('🔍 사용자 ID (sub):', decoded.sub);
			console.log('🔍 사용자 ID (userId):', decoded.userId);
			console.log('🔍 사용자 UUID (userUUID):', decoded.userUUID);
			console.log('🔍 사용자 역할 (userRole):', decoded.userRole);
			console.log('🔍 사용자 역할 (role):', decoded.role);
			console.log('🔍 사용자 이름 (name):', decoded.name);
			console.log('🔍 토큰 길이:', accessToken.length);
			console.log('🔍 토큰 시작 부분:', accessToken.substring(0, 50) + '...');

			if (decoded.exp && decoded.exp * 1000 > Date.now()) {
				// 2-1. JWT에서 사용자 정보 추출 시도
				let userId = decoded.sub || decoded.userId;
				let userUuid = decoded.userUUID;
				let userRole = decoded.userRole || decoded.role; // userRole을 우선으로 확인

				// JWT에 정보가 없으면 userInfo 쿠키에서 가져오기
				if (!userId || !userRole) {
					const userInfoCookie = event.cookies.get('userInfo');
					if (userInfoCookie) {
						try {
							const userInfo = JSON.parse(userInfoCookie);
							userId = userId || userInfo.id;
							userRole = userRole || userInfo.role;
							userUuid = userUuid || userInfo.uuid;
						} catch (error) {
							console.error('userInfo 쿠키 파싱 오류:', error);
						}
					}
				}

				// 기본값 설정
				userId = userId || 'unknown';
				userRole = userRole || 'user';

				// @ts-expect-error - Locals 타입 확장 필요
				event.locals.user = { id: userId, uuid: userUuid, role: userRole };
			} else {
				// 2-2. 만료되었다면 토큰 갱신을 시도합니다.
				console.log('Access Token 만료, 갱신을 시도합니다.');
				console.log('만료된 JWT 토큰:', `${accessToken.substring(0, 20)}...`);
				// @ts-expect-error - Locals 타입 확장 필요
				event.locals.user = await refreshAccessToken(event.cookies, refreshToken);
			}
		} catch (error) {
			// 2-3. 토큰 형식이 잘못된 경우에도 갱신을 시도합니다.
			console.error('Access Token 파싱 오류, 갱신을 시도합니다:', error);
			console.log('파싱 오류가 발생한 JWT 토큰:', `${accessToken.substring(0, 20)}...`);
			// @ts-expect-error - Locals 타입 확장 필요
			event.locals.user = await refreshAccessToken(event.cookies, refreshToken);
		}
	} else if (refreshToken) {
		// 3. Access Token은 없지만 Refresh Token이 있는 경우, 갱신을 시도합니다.
		// (예: 브라우저를 껐다 켰을 때)
		console.log('Access Token 없음, Refresh Token으로 갱신을 시도합니다.');
		// @ts-expect-error - Locals 타입 확장 필요
		event.locals.user = await refreshAccessToken(event.cookies, refreshToken);
	}

	// 4. 페이지 접근 제어
	const { pathname } = event.url;
	// 공개 경로: 로그인/회원가입(/login, /login/create, /login/password 등)·회원가입(/register)
	const isPublicRoute =
		pathname === '/login' || pathname.startsWith('/login/') || pathname === '/register';

	// 로그인 상태가 아닌데 보호된 페이지에 접근하려 할 때
	// @ts-expect-error - Locals 타입 확장 필요
	if (!event.locals.user && !isPublicRoute) {
		throw redirect(303, '/login');
	}

	// 5. 권한 기반 페이지 접근 제어 (메인 페이지는 제외)
	// @ts-expect-error - Locals 타입 확장 필요
	if (event.locals.user && !isPublicRoute && pathname !== '/') {
		// @ts-expect-error - Locals 타입 확장 필요
		const userRole = event.locals.user.role as UserRole;

		// 페이지 접근 권한 확인
		if (!PermissionService.canAccessPage(userRole, pathname)) {
			console.log(`권한 없음: ${userRole} 사용자가 ${pathname}에 접근 시도`);
			throw redirect(303, '/'); // 메인 페이지로 리다이렉트
		}
	}

	// 6. 모든 처리가 끝나면 요청을 다음 단계로 전달합니다.
	return resolve(event);
};

/**
 * Refresh Token을 사용하여 새로운 Access Token을 발급받는 헬퍼 함수입니다.
 * @param cookies - SvelteKit의 쿠키 객체 (any 타입 허용)
 * @param refreshToken - 갱신에 사용할 Refresh Token
 * @returns 성공 시 새로운 사용자 정보, 실패 시 null
 */
async function refreshAccessToken(
	cookies: any,
	refreshToken: string | undefined
): Promise<User | null> {
	if (!refreshToken) {
		return null;
	}

	console.log('백엔드에 토큰 갱신 요청...');

	// 기존 Refresh Token 디코딩해서 확인
	try {
		console.log('=== 토큰 갱신 - 기존 Refresh Token 디코딩 ===');
		const refreshPayloadPart = refreshToken.split('.')[1];
		const refreshDecoded = JSON.parse(atob(refreshPayloadPart));
		console.log('기존 Refresh Token 내용:', refreshDecoded);
		console.log('기존 Refresh Token userRole:', refreshDecoded.userRole);
		console.log('기존 Refresh Token role:', refreshDecoded.role);
	} catch (error) {
		console.error('기존 Refresh Token 디코딩 오류:', error);
	}
	try {
		// 백엔드의 토큰 갱신 API 호출
		const response = await fetch(`${BACKEND_API_URL}/api/v0/auth/refresh`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ refreshToken })
		});

		if (!response.ok) {
			console.error('토큰 갱신 실패: 백엔드에서 에러 응답');
			// 설정에서 쿠키 정보 가져오기
			const accessTokenConfig = configService.getAccessTokenCookieConfig();
			const refreshTokenConfig = configService.getRefreshTokenCookieConfig();

			// 갱신에 실패하면 기존의 만료된 토큰들을 삭제합니다.
			// 기존 쿠키 이름과 새로운 쿠키 이름 모두 삭제 (호환성 유지)
			cookies.delete(accessTokenConfig?.name || 'jwt', { path: '/' });
			cookies.delete('jwt', { path: '/' }); // 기존 쿠키도 삭제
			cookies.delete(refreshTokenConfig?.name || 'refreshToken', { path: '/' });
			cookies.delete('refreshToken', { path: '/' }); // 기존 쿠키도 삭제
			return null;
		}

		const data = await response.json();
		console.log('백엔드 토큰 갱신 응답:', data);
		const newAccessToken = data.accessToken;
		const newRefreshToken = data.refreshToken;

		// 백엔드 응답 검증
		if (!newAccessToken) {
			console.error('❌ 백엔드 오류: accessToken이 없습니다');
			return null;
		}

		// 새 Access Token에 role 정보가 있는지 확인
		try {
			const accessPayloadPart = newAccessToken.split('.')[1];
			const accessDecoded = JSON.parse(atob(accessPayloadPart));
			if (!accessDecoded.userRole && !accessDecoded.role) {
				console.error('❌ 백엔드 오류: 새 Access Token에 role 정보가 없습니다');
				console.error('필요한 필드: userRole 또는 role');
				console.error('현재 토큰 내용:', accessDecoded);
			}
		} catch (error) {
			console.error('Access Token 디코딩 오류:', error);
		}

		if (!newAccessToken) {
			console.error('토큰 갱신 실패: 백엔드가 새 토큰을 반환하지 않음');
			return null;
		}

		// 새로 받은 Access Token과 Refresh Token 모두 디코딩해서 확인
		try {
			console.log('=== 토큰 갱신 - 새 토큰 디코딩 ===');

			// Access Token 디코딩
			const accessPayloadPart = newAccessToken.split('.')[1];
			const accessDecoded = JSON.parse(atob(accessPayloadPart));
			console.log('🔍 새 Access Token 디코딩 테스트:');
			console.log('🔍 전체 디코딩 값:', accessDecoded);
			console.log('🔍 만료 시간 (exp):', accessDecoded.exp);
			console.log('🔍 현재 시간:', Date.now());
			console.log(
				'🔍 만료 여부:',
				accessDecoded.exp ? (accessDecoded.exp * 1000 > Date.now() ? '유효' : '만료') : 'exp 없음'
			);
			console.log('🔍 사용자 ID (sub):', accessDecoded.sub);
			console.log('🔍 사용자 ID (userId):', accessDecoded.userId);
			console.log('🔍 사용자 UUID (userUUID):', accessDecoded.userUUID);
			console.log('🔍 사용자 역할 (userRole):', accessDecoded.userRole);
			console.log('🔍 사용자 역할 (role):', accessDecoded.role);
			console.log('🔍 사용자 이름 (name):', accessDecoded.name);
			console.log('🔍 토큰 길이:', newAccessToken.length);
			console.log('🔍 토큰 시작 부분:', newAccessToken.substring(0, 50) + '...');

			// Refresh Token 디코딩 (있는 경우)
			if (newRefreshToken) {
				const refreshPayloadPart = newRefreshToken.split('.')[1];
				const refreshDecoded = JSON.parse(atob(refreshPayloadPart));
				console.log('🔍 새 Refresh Token 디코딩 테스트:');
				console.log('🔍 전체 디코딩 값:', refreshDecoded);
				console.log('🔍 만료 시간 (exp):', refreshDecoded.exp);
				console.log('🔍 사용자 ID (sub):', refreshDecoded.sub);
				console.log('🔍 사용자 UUID (userUUID):', refreshDecoded.userUUID);
				console.log('🔍 사용자 역할 (userRole):', refreshDecoded.userRole);
				console.log('🔍 사용자 역할 (role):', refreshDecoded.role);
				console.log('🔍 토큰 길이:', newRefreshToken.length);
				console.log('🔍 토큰 시작 부분:', newRefreshToken.substring(0, 50) + '...');
			} else {
				console.log('새 Refresh Token이 없습니다.');
			}
		} catch (error) {
			console.error('토큰 디코딩 오류:', error);
		}

		// 설정에서 쿠키 정보 가져오기
		const accessTokenConfig = configService.getAccessTokenCookieConfig();
		const refreshTokenConfig = configService.getRefreshTokenCookieConfig();

		// 새로 발급받은 Access Token을 쿠키에 저장합니다.
		cookies.set(accessTokenConfig?.name || 'jwt', newAccessToken, {
			path: '/',
			httpOnly: accessTokenConfig?.httpOnly ?? true,
			secure: accessTokenConfig?.secure ?? false,
			sameSite: (accessTokenConfig?.sameSite as 'strict' | 'lax' | 'none') || 'strict',
			maxAge: accessTokenConfig?.maxAge ? Math.floor(accessTokenConfig.maxAge / 1000) : 60 * 15 // 설정값을 초 단위로 변환
		});

		// 새로 발급받은 Refresh Token도 쿠키에 저장합니다 (있는 경우)
		if (newRefreshToken) {
			cookies.set(refreshTokenConfig?.name || 'refreshToken', newRefreshToken, {
				path: '/',
				httpOnly: refreshTokenConfig?.httpOnly ?? true,
				secure: refreshTokenConfig?.secure ?? false,
				sameSite: (refreshTokenConfig?.sameSite as 'strict' | 'lax' | 'none') || 'strict',
				maxAge: refreshTokenConfig?.maxAge
					? Math.floor(refreshTokenConfig.maxAge / 1000)
					: 60 * 60 * 24 * 7 // 설정값을 초 단위로 변환
			});
			console.log('새 Refresh Token 저장 완료:', `${newRefreshToken.substring(0, 20)}...`);
		} else {
			console.warn('백엔드에서 새 Refresh Token을 반환하지 않았습니다. 기존 토큰을 유지합니다.');
		}

		console.log('✅ 토큰이 성공적으로 갱신되었습니다.');
		console.log('새 JWT 토큰:', `${newAccessToken.substring(0, 20)}...`);

		// 새로 받은 토큰에서 사용자 정보를 디코딩하여 반환합니다.
		const decoded = jwtDecode<
			JwtPayload & {
				userRole?: string;
				role?: string;
				sub?: string;
				id?: string;
				name?: string;
				userUUID?: string;
			}
		>(newAccessToken);
		const userId = decoded.sub || decoded.id;
		let userUuid = decoded.userUUID;
		let userRole = decoded.userRole || decoded.role; // userRole을 우선으로 확인

		console.log('토큰 갱신 후 사용자 정보 추출:', { userId, userUuid, userRole });

		// 새 토큰에 role 정보가 없으면 기존 Refresh Token에서 가져오기
		if (!userRole) {
			try {
				const refreshPayloadPart = refreshToken.split('.')[1];
				const refreshDecoded = JSON.parse(atob(refreshPayloadPart));
				userRole = refreshDecoded.userRole || refreshDecoded.role;
				userUuid = userUuid || refreshDecoded.userUUID;
				console.log('기존 Refresh Token에서 role 정보 복원:', userRole);
			} catch (error) {
				console.error('기존 Refresh Token에서 role 정보 추출 오류:', error);
			}
		}

		// 그래도 없으면 userInfo 쿠키에서 가져오기
		if (!userId || !userRole) {
			const userInfoCookie = cookies.get('userInfo');
			if (userInfoCookie) {
				try {
					const userInfo = JSON.parse(userInfoCookie);
					userRole = userRole || userInfo.role;
					userUuid = userUuid || userInfo.uuid;
					console.log('userInfo 쿠키에서 보완한 정보:', { userId, userUuid, userRole });
				} catch (error) {
					console.error('userInfo 쿠키 파싱 오류:', error);
				}
			}
		}

		// 기본값 설정
		userRole = userRole || 'user';

		// userInfo 쿠키도 업데이트
		const userInfo = {
			id: userId,
			uuid: userUuid,
			role: userRole,
			name: decoded.name || 'Unknown'
		};
		cookies.set('userInfo', JSON.stringify(userInfo), {
			path: '/',
			httpOnly: true,
			secure: false,
			sameSite: 'strict',
			maxAge: 60 * 15 // 15분
		});
		console.log('userInfo 쿠키 업데이트 완료:', userInfo);

		return { id: userId, uuid: userUuid, role: userRole };
	} catch (error) {
		console.error('💥 토큰 갱신 중 네트워크 또는 기타 오류 발생:', error);
		return null;
	}
}
