import { browser } from '$app/environment';
import type { PageLoad } from './$types';
import { MobileUtils } from '../../../utils/mobile/MobileUtils';
import axios from 'axios';
// 유틸

// 캐릭터 목록 서비스
export const load: PageLoad = async ({ url }) => {
	const currentUrl = 'http://' + url.hostname + ':3000';
	let isMobile = false;
	let data: any = {};
	if (browser) {
		isMobile = MobileUtils.isMobile();
	}

	return {
		url: currentUrl,
		isMobile: isMobile,
		info: data,
		param: {}
	};
};
