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
	if (url.pathname.includes('admin')) {
		isNotLayoutPage = true;
	}

	let data: any = {};

	const currentUrl = 'http://' + url.hostname + ':3000';
	await axios
		.get(currentUrl + '/api/v0/game/list')
		.then((res) => {
			if (res.data.resultCode === 200) {
				data = res.data.items;
			} else {
				console.log('err: 서버 코드 에러');
			}
		})
		.catch((err) => {
			console.log(err);
		});

	return {
		params: params.slug,
		isNotLayoutPage: isNotLayoutPage,
		isMobile: isMobile,
		url: currentUrl,
		info: data
	};
};
