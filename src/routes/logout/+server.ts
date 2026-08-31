import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { configService } from '../../app/service/ConfigService';

/**
 * 로그아웃 — 인증 쿠키를 삭제한다.
 *
 * 예전에는 로그아웃 경로가 사실상 없었다. HeaderMenu 의 "Sign out" 은
 * `<a href="#">` 였고, 유일한 logout 액션은 /login 의 form action 인데
 * /login 은 토큰이 있으면 '/' 로 리다이렉트해서 도달 자체가 불가능했다.
 *
 * JWT 가 stateless 라 서버측 무효화는 하지 않는다. 이미 발급된 access token 은
 * 남은 만료시간(최대 15분) 동안 유효하다. 즉시 무효화가 필요해지면 refresh token
 * 블랙리스트나 users.tokenVersion 컬럼이 있어야 한다.
 */
export const POST: RequestHandler = async ({ cookies }) => {
	const accessTokenConfig = configService.getAccessTokenCookieConfig();
	const refreshTokenConfig = configService.getRefreshTokenCookieConfig();

	// 설정된 쿠키 이름과 레거시 이름을 모두 삭제 (호환성 유지)
	const names = [
		accessTokenConfig?.name || 'jwt',
		'jwt',
		refreshTokenConfig?.name || 'refreshToken',
		'refreshToken',
		'userInfo'
	];

	for (const name of new Set(names)) {
		cookies.delete(name, { path: '/' });
	}

	throw redirect(303, '/login');
};
