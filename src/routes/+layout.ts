import type { LayoutLoad } from './$types';
import { browser } from '$app/environment';
import { page } from '$app/stores';
import axios from 'axios';
import { MobileUtils } from '../utils/mobile/MobileUtils';
import { error } from '@sveltejs/kit';

export const load: LayoutLoad = async ({ params, url }) => {
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
		url: currentUrl
	};
};
