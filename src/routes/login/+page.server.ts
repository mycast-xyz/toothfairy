import { fail, redirect } from '@sveltejs/kit';
import { dev } from '$app/environment';
import type { PageServerLoad, Actions } from './$types';
import { configService } from '../../app/service/ConfigService';

/**
 * 페이지가 렌더링되기 전에 서버에서 실행되는 함수입니다.
 * 이미 로그인한 사용자가 로그인 페이지에 접근하는 것을 방지합니다.
 */
export const load: PageServerLoad = async ({ cookies }) => {
	// 설정에서 쿠키 정보 가져오기
	const accessTokenConfig = configService.getAccessTokenCookieConfig();

	// 브라우저의 쿠키에서 JWT 토큰을 확인합니다.
	// 기존 쿠키 이름과 새로운 쿠키 이름 모두 확인 (호환성 유지)
	let token = cookies.get(accessTokenConfig?.name || 'jwt');
	if (!token) {
		token = cookies.get('jwt'); // 기존 쿠키 이름으로도 확인
	}

	// 만약 토큰이 존재한다면, 사용자는 이미 로그인한 상태로 간주합니다.
	if (token) {
		// 메인 페이지('/')로 즉시 리디렉션시킵니다.
		// 303 코드는 'See Other'를 의미하며, GET 요청으로 리디렉션할 때 사용됩니다.
		throw redirect(303, '/');
	}

	// 토큰이 없다면 아무것도 하지 않고, 로그인 페이지를 정상적으로 보여줍니다.
	return {};
};

// 실제 백엔드 API 주소 (ConfigService에서 관리)
const BACKEND_API_URL = 'http://localhost:3000'; // ConfigService에서 관리되도록 개선 예정

export const actions: Actions = {
	/**
	 * 로그인 액션
	 */

	login: async ({ request, fetch, cookies }) => {
		console.log(`${BACKEND_API_URL}/api/v0/account/login`);
		const formData = await request.formData();
		const id = formData.get('id');
		const password = formData.get('password');

		// 백엔드 API로 로그인 요청
		const response = await fetch(`${BACKEND_API_URL}/api/v0/account/login`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id, password })
		});

		if (!response.ok) {
			const errorData = await response.json();
			// 로그인 실패 시, 사용자에게 에러 메시지와 입력했던 이메일 값을 돌려줌
			return fail(response.status, {
				id,
				error: errorData.resultMsg || '로그인에 실패했습니다.'
			});
		}

		const responseData = await response.json();

		console.log('로그인 성공');

		// 설정에서 쿠키 정보 가져오기
		const accessTokenConfig = configService.getAccessTokenCookieConfig();
		const refreshTokenConfig = configService.getRefreshTokenCookieConfig();

		// 🔑 성공 시, 서버에서 직접 httpOnly 쿠키를 설정
		if (responseData.accessToken) {
			// JWT 토큰 디코딩해서 내용 확인
			try {
				const payloadPart = responseData.accessToken.split('.')[1];
				const decoded = JSON.parse(atob(payloadPart));
				console.log('JWT 토큰 내용:', decoded);

				// role 정보가 없으면 경고
				if (!decoded.userRole && !decoded.role) {
					console.error('백엔드 오류: JWT에 role 정보가 없습니다!');
				}

				// userUUID 정보가 없으면 경고
				if (!decoded.userUUID) {
					console.error('백엔드 오류: JWT에 userUUID 정보가 없습니다!');
				}
			} catch (error) {
				console.error('JWT 디코딩 오류:', error);
			}

			cookies.set(accessTokenConfig?.name || 'jwt', responseData.accessToken, {
				path: '/',
				httpOnly: accessTokenConfig?.httpOnly ?? true,
				secure: accessTokenConfig?.secure ?? false,
				sameSite: (accessTokenConfig?.sameSite as 'strict' | 'lax' | 'none') || 'strict',
				maxAge: accessTokenConfig?.maxAge ? Math.floor(accessTokenConfig.maxAge / 1000) : 60 * 15 // 설정값을 초 단위로 변환
			});
		} else {
			console.error('Access Token이 없습니다!');
		}
		if (responseData.refreshToken) {
			cookies.set(refreshTokenConfig?.name || 'refreshToken', responseData.refreshToken, {
				path: '/',
				httpOnly: refreshTokenConfig?.httpOnly ?? true,
				secure: refreshTokenConfig?.secure ?? false,
				sameSite: (refreshTokenConfig?.sameSite as 'strict' | 'lax' | 'none') || 'strict',
				maxAge: refreshTokenConfig?.maxAge
					? Math.floor(refreshTokenConfig.maxAge / 1000)
					: 60 * 60 * 24 * 7 // 설정값을 초 단위로 변환
			});
		} else {
			console.error('Refresh Token이 없습니다!');
		}

		// JWT 토큰에서 사용자 정보를 추출해서 userInfo 쿠키에 저장
		try {
			const payloadPart = responseData.accessToken.split('.')[1];
			const decoded = JSON.parse(atob(payloadPart));

			const userInfo = {
				id: decoded.sub || 'unknown',
				uuid: decoded.userUUID || null,
				role: decoded.userRole || decoded.role || 'user',
				name: decoded.name || 'Unknown'
			};

			// role이 'user'로 설정되는 경우 경고
			if (userInfo.role === 'user') {
				console.warn('경고: role이 기본값 "user"로 설정되었습니다.');
			}

			cookies.set('userInfo', JSON.stringify(userInfo), {
				path: '/',
				httpOnly: true,
				secure: false, // 개발 환경에서는 false로 설정
				sameSite: 'strict',
				maxAge: 30 //* 15 // 15분
			});
		} catch (error) {
			console.error('JWT에서 사용자 정보 추출 오류:', error);
		}

		// 로그인 성공 후 메인 페이지로 리디렉션
		throw redirect(303, '/');
	},

	/**
	 * 로그아웃 액션
	 */
	logout: async ({ cookies }) => {
		// 설정에서 쿠키 정보 가져오기
		const accessTokenConfig = configService.getAccessTokenCookieConfig();
		const refreshTokenConfig = configService.getRefreshTokenCookieConfig();

		// 🔑 서버에서 쿠키를 삭제하여 로그아웃 처리
		// 기존 쿠키 이름과 새로운 쿠키 이름 모두 삭제 (호환성 유지)
		cookies.delete(accessTokenConfig?.name || 'jwt', { path: '/' });
		cookies.delete('jwt', { path: '/' }); // 기존 쿠키도 삭제
		cookies.delete(refreshTokenConfig?.name || 'refreshToken', { path: '/' });
		cookies.delete('refreshToken', { path: '/' }); // 기존 쿠키도 삭제
		cookies.delete('userInfo', { path: '/' }); // userInfo 쿠키도 삭제

		// 로그아웃 후 로그인 페이지로 리디렉션
		throw redirect(303, '/login');
	}
};
