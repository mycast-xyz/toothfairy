import { redirect, type Handle } from '@sveltejs/kit';
import { jwtDecode, type JwtPayload } from 'jwt-decode';

// 사용자 정보를 위한 타입 정의
type User = {
	id?: string;
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
			const decoded = jwtDecode<JwtPayload>(accessToken);
			if (decoded.exp && decoded.exp * 1000 > Date.now()) {
				// 2-1. 유효하면 사용자 정보를 저장합니다.
				// @ts-expect-error - Locals 타입 확장 필요
				event.locals.user = { id: decoded.sub };
			} else {
				// 2-2. 만료되었다면 토큰 갱신을 시도합니다.
				console.log('Access Token 만료, 갱신을 시도합니다.');
				// @ts-expect-error - Locals 타입 확장 필요
				event.locals.user = await refreshAccessToken(event.cookies, refreshToken);
			}
		} catch (error) {
			// 2-3. 토큰 형식이 잘못된 경우에도 갱신을 시도합니다.
			console.error('Access Token 파싱 오류, 갱신을 시도합니다:', error);
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

	// 5. 모든 처리가 끝나면 요청을 다음 단계로 전달합니다.
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
		const newAccessToken = data.accessToken;

		if (!newAccessToken) {
			console.error('토큰 갱신 실패: 백엔드가 새 토큰을 반환하지 않음');
			return null;
		}

		// 새로 발급받은 Access Token을 쿠키에 저장합니다.
		cookies.set('jwt', newAccessToken, {
			path: '/',
			httpOnly: true,
			secure:
				typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'production',
			sameSite: 'strict',
			maxAge: 10 //* 15 // 15분
		});

		console.log('✅ 토큰이 성공적으로 갱신되었습니다.');

		// 새로 받은 토큰에서 사용자 정보를 디코딩하여 반환합니다.
		const decoded = jwtDecode<JwtPayload>(newAccessToken);
		return { id: decoded.sub };
	} catch (error) {
		console.error('💥 토큰 갱신 중 네트워크 또는 기타 오류 발생:', error);
		return null;
	}
}
