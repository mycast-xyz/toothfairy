import { redirect, type Handle } from '@sveltejs/kit';
import { jwtDecode, type JwtPayload } from 'jwt-decode';
import { PermissionService } from './app/service/auth/PermissionService';
import type { UserRole } from './app/model/user/UserRole';

// 사용자 정보를 위한 타입 정의
type User = {
	id?: string;
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
const BACKEND_API_URL = 'http://localhost:3000'; // 실제 백엔드 주소로 변경하세요.

/**
 * 모든 서버 요청을 가로채는 핸들러 함수입니다.
 * 사용자의 인증 상태를 확인하고, 필요 시 토큰을 갱신하며, 페이지 접근을 제어합니다.
 */
export const handle: Handle = async ({ event, resolve }) => {
	// 1. 쿠키에서 Access Token과 Refresh Token을 가져옵니다.
	const accessToken = event.cookies.get('jwt');
	const refreshToken = event.cookies.get('refreshToken');

	// 기본적으로 로그아웃 상태로 초기화합니다.
	// @ts-expect-error - Locals 타입 확장 필요
	event.locals.user = null;

	if (accessToken) {
		try {
			// 2. Access Token이 유효한지 확인합니다.
			// JWT 페이로드를 직접 디코딩
			const payloadPart = accessToken.split('.')[1];
			const decoded = JSON.parse(atob(payloadPart));

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
	const publicRoutes = ['/login', '/register']; // 공개 경로 목록

	// 로그인 상태가 아닌데 보호된 페이지에 접근하려 할 때
	// @ts-expect-error - Locals 타입 확장 필요
	if (!event.locals.user && !publicRoutes.includes(pathname)) {
		throw redirect(303, '/login');
	}

	// 5. 권한 기반 페이지 접근 제어 (메인 페이지는 제외)
	// @ts-expect-error - Locals 타입 확장 필요
	if (event.locals.user && !publicRoutes.includes(pathname) && pathname !== '/') {
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
			// 갱신에 실패하면 기존의 만료된 토큰들을 삭제합니다.
			cookies.delete('jwt', { path: '/' });
			cookies.delete('refreshToken', { path: '/' });
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
			console.log('새 Access Token 내용:', accessDecoded);
			console.log('새 Access Token userRole:', accessDecoded.userRole);
			console.log('새 Access Token role:', accessDecoded.role);

			// Refresh Token 디코딩 (있는 경우)
			if (newRefreshToken) {
				const refreshPayloadPart = newRefreshToken.split('.')[1];
				const refreshDecoded = JSON.parse(atob(refreshPayloadPart));
				console.log('새 Refresh Token 내용:', refreshDecoded);
				console.log('새 Refresh Token userRole:', refreshDecoded.userRole);
				console.log('새 Refresh Token role:', refreshDecoded.role);
			} else {
				console.log('새 Refresh Token이 없습니다.');
			}
		} catch (error) {
			console.error('토큰 디코딩 오류:', error);
		}

		// 새로 발급받은 Access Token을 쿠키에 저장합니다.
		cookies.set('jwt', newAccessToken, {
			path: '/',
			httpOnly: true,
			secure: false, // 개발 환경에서는 false로 설정
			sameSite: 'strict',
			maxAge: 10 //* 15 // 15분
		});

		// 새로 발급받은 Refresh Token도 쿠키에 저장합니다 (있는 경우)
		if (newRefreshToken) {
			cookies.set('refreshToken', newRefreshToken, {
				path: '/',
				httpOnly: true,
				secure: false, // 개발 환경에서는 false로 설정
				sameSite: 'strict',
				maxAge: 60 * 60 * 24 * 7 // 7일
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
			maxAge: 30 //* 15 // 15분
		});
		console.log('userInfo 쿠키 업데이트 완료:', userInfo);

		return { id: userId, uuid: userUuid, role: userRole };
	} catch (error) {
		console.error('💥 토큰 갱신 중 네트워크 또는 기타 오류 발생:', error);
		return null;
	}
}
