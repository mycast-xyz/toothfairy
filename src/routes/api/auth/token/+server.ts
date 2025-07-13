import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { configService } from '../../../../app/service/ConfigService';

export const GET: RequestHandler = async ({ cookies }) => {
	try {
		// 설정에서 access 토큰 쿠키 정보 가져오기
		const accessTokenConfig = configService.getAccessTokenCookieConfig();
		const cookieName = accessTokenConfig?.name || 'access_token';

		// 설정된 쿠키 이름으로 JWT 토큰 가져오기
		let jwtToken = cookies.get(cookieName);

		// 기존 쿠키 이름도 확인 (호환성 유지)
		if (!jwtToken) {
			const legacyCookieName = 'jwt';
			jwtToken = cookies.get(legacyCookieName);
		}

		if (!jwtToken) {
			return json(
				{
					success: false,
					message: 'JWT 토큰이 없습니다.'
				},
				{ status: 401 }
			);
		}

		// 토큰 유효성 검사 (기본적인 형식 검사)
		const tokenParts = jwtToken.split('.');
		if (tokenParts.length !== 3) {
			return json(
				{
					success: false,
					message: '잘못된 JWT 토큰 형식입니다.'
				},
				{ status: 400 }
			);
		}

		// 토큰 만료 시간 확인
		try {
			const payload = JSON.parse(atob(tokenParts[1]));
			const currentTime = Math.floor(Date.now() / 1000);

			if (payload.exp && payload.exp < currentTime) {
				return json(
					{
						success: false,
						message: 'JWT 토큰이 만료되었습니다.'
					},
					{ status: 401 }
				);
			}
		} catch (error) {
			return json(
				{
					success: false,
					message: 'JWT 토큰 파싱 오류입니다.'
				},
				{ status: 400 }
			);
		}

		return json({
			success: true,
			token: jwtToken
		});
	} catch (error) {
		console.error('❌ 토큰 가져오기 오류:', error);
		return json(
			{
				success: false,
				message: '서버 오류가 발생했습니다.'
			},
			{ status: 500 }
		);
	}
};
