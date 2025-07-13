import type { LayoutLoad } from './$types';
import { browser } from '$app/environment';
import { MobileUtils } from '../utils/mobile/MobileUtils';

export const load: LayoutLoad = async ({ params, url, data, fetch }) => {
	// 🔑 `data` 객체를 통해 `+layout.server.ts`의 반환값(`user`)을 받음
	const { user } = data;

	// role이 'user'로 설정되는 경우 경고
	if (user?.role === 'user') {
		console.warn('Layout Load: role이 "user"로 설정되었습니다!');
	}

	let isMobile = false;
	let isNotLayoutPage = false;
	if (browser) {
		isMobile = MobileUtils.isMobile();
	}
	if (url.pathname.includes('login')) {
		isNotLayoutPage = true;
	}
	// ConfigService에서 백엔드 URL 가져오기 (동적 로딩을 위해 기본값 사용)
	const currentUrl = 'http://' + url.hostname + ':3000'; // ConfigService에서 관리되도록 개선 예정

	const result = {
		params: params.slug,
		isNotLayoutPage: isNotLayoutPage,
		isMobile: isMobile,
		url: currentUrl,
		user: user
	};

	console.log('Layout 반환 데이터:', result);
	return result;
};
