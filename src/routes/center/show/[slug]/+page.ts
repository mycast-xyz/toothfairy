import type { PageLoad } from './$types';
import axios from 'axios';
// 유틸

// 캐릭터 목록 서비스
export const load: PageLoad = async ({ url, params }) => {
	const currentUrl = 'http://' + url.hostname + ':3000';
	let isMobile = false;
	let data: any = {};
	const slug = params.slug;

	await axios
		.get(currentUrl + '/api/v0/file/item?id=' + slug)
		.then((res) => {
			if (res.data.resultCode === 200) {
				data = res.data.item;
			} else {
				console.log('err: 서버 코드 에러');
			}
		})
		.catch((err) => {
			console.log(err);
		});

	return {
		url: currentUrl,
		isMobile: isMobile,
		info: data
	};
};
