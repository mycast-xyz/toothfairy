import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, url }) => {
	const currentUrl = 'http://' + url.hostname + ':3000';

	// 로그인 여부 판정은 서버(+page.server.ts / hooks.server.ts)가 쿠키로 처리한다.
	// 여기서 localStorage 를 보던 코드는 소스가 달라 오판이 가능해 제거했다.

	return {
		url: currentUrl,
		form: null
	};
};
