import { browser } from '$app/environment';
import type { PageLoad } from './$types';
import axios from 'axios';
// 유틸
import { MobileUtils } from '../utils/mobile/MobileUtils';

// 캐릭터 목록 서비스
export const load: PageLoad = async ({ url, data }) => {
	const currentUrl = 'http://' + url.hostname + ':3000';
	let isMobile = false;

	if (browser) {
		isMobile = MobileUtils.isMobile();
	}

	// 사용자 정보가 없으면 경고
	if (!data?.user) {
		console.warn('메인 페이지: 사용자 정보가 없습니다!');
	}

	return {
		url: currentUrl,
		isMobile: isMobile,
		info: data || {},
		user: data?.user
	};
};
