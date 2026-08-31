import { browser } from '$app/environment';
import type { PageLoad } from './$types';
// 유틸
import { MobileUtils } from '../utils/mobile/MobileUtils';

export const load: PageLoad = async ({ url, parent }) => {
	// 사용자 정보는 레이아웃(+layout.server.ts → +layout.ts)에서 내려온다.
	// 예전에는 `data?.user` 를 읽었는데, 이 라우트에는 +page.server.ts 가 없어
	// `data` 가 항상 null 이었다. 그 결과 `user: undefined` 가 페이지 데이터로
	// 병합되면서 레이아웃이 내려준 user 를 덮어써 버렸다.
	const parentData = await parent();
	const currentUrl = 'http://' + url.hostname + ':3000';
	let isMobile = false;

	if (browser) {
		isMobile = MobileUtils.isMobile();
	}

	return {
		url: currentUrl,
		isMobile: isMobile,
		info: parentData,
		user: parentData?.user
	};
};
