import { browser } from '$app/environment';
import type { PageLoad } from './$types';
import axios from 'axios';
// 유틸

// 캐릭터 목록 서비스
export const load: PageLoad = async ({ url }) => {
	const currentUrl = 'http://' + url.hostname + ':3000';
	let isMobile = false;
	let data: any = {};

	const dateParam = url.searchParams.get('date');
	const today = new Date();
	const yyyy = today.getFullYear();
	const mm = String(today.getMonth() + 1).padStart(2, '0'); // 월은 0부터 시작하므로 1을 더해줍니다.
	const currentDate = `${yyyy}-${mm}`;
	const date = dateParam ? dateParam : currentDate;

	await axios
		.get(currentUrl + '/api/v0/file/chk?date=' + date)
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
