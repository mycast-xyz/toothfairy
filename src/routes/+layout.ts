import type { LayoutLoad } from './$types';
import { browser } from '$app/environment';
import { MobileUtils } from '../utils/mobile/MobileUtils';

export const load: LayoutLoad = async ({ params, url, data, fetch }) => {
	// 🔑 `data` 객체를 통해 `+layout.server.ts`의 반환값(`user`)을 받음
	const { user } = data;

	let isMobile = false;
	let isNotLayoutPage = false;
	if (browser) {
		isMobile = MobileUtils.isMobile();
	}
	if (url.pathname.includes('login')) {
		isNotLayoutPage = true;
	}
	const currentUrl = 'http://' + url.hostname + ':3000';

	return {
		params: params.slug,
		isNotLayoutPage: isNotLayoutPage,
		isMobile: isMobile,
		url: currentUrl,
		user: user
	};
};
