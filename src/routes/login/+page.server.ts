import { fail, redirect } from '@sveltejs/kit';
import { dev } from '$app/environment';
import type { PageServerLoad, Actions } from './$types';

/**
 * 페이지가 렌더링되기 전에 서버에서 실행되는 함수입니다.
 * 이미 로그인한 사용자가 로그인 페이지에 접근하는 것을 방지합니다.
 */
export const load: PageServerLoad = async ({ cookies }) => {
	// 브라우저의 쿠키에서 'jwt' 토큰을 확인합니다.
	const token = cookies.get('jwt');

	// 만약 토큰이 존재한다면, 사용자는 이미 로그인한 상태로 간주합니다.
	if (token) {
		// 메인 페이지('/')로 즉시 리디렉션시킵니다.
		// 303 코드는 'See Other'를 의미하며, GET 요청으로 리디렉션할 때 사용됩니다.
		throw redirect(303, '/');
	}

	// 토큰이 없다면 아무것도 하지 않고, 로그인 페이지를 정상적으로 보여줍니다.
	return {};
};

// 실제 백엔드 API 주소 (환경 변수로 관리하는 것을 권장)
const BACKEND_API_URL = 'http://localhost:3000';

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

		// 🔑 성공 시, 서버에서 직접 httpOnly 쿠키를 설정
		if (responseData.accessToken) {
			cookies.set('jwt', responseData.accessToken, {
				path: '/',
				httpOnly: true,
				secure: !dev,
				sameSite: 'strict',
				maxAge: 5 //* 15 // 15분
			});
		}
		if (responseData.refreshToken) {
			cookies.set('refreshToken', responseData.refreshToken, {
				path: '/',
				httpOnly: true,
				secure: !dev,
				sameSite: 'strict',
				maxAge: 60 * 60 * 24 * 7 // 7일
			});
		}

		// 로그인 성공 후 메인 페이지로 리디렉션
		return {
			success: true,
			redirect: '/'
		};
	},

	/**
	 * 로그아웃 액션
	 */
	logout: async ({ cookies }) => {
		// 🔑 서버에서 쿠키를 삭제하여 로그아웃 처리
		cookies.delete('jwt', { path: '/' });
		cookies.delete('refreshToken', { path: '/' });

		// 로그아웃 후 로그인 페이지로 리디렉션
		throw redirect(303, '/login');
	}
};
