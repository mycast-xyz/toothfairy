import { browser } from '$app/environment';
import type { PageLoad } from './$types';
import axios from 'axios';
import { configService } from '../../../app/service/ConfigService';
// 유틸

// 캐릭터 목록 서비스
export const load: PageLoad = async ({ url }) => {
	const currentUrl = configService.getBackendUrl();
	let isMobile = false;

	let data: any = { lab: [], dental: [] };
	const dateParam = url.searchParams.get('date');
	const corpNameParam = url.searchParams.get('corpName') || '';

	const today = new Date();
	const yyyy = today.getFullYear();
	const mm = String(today.getMonth() + 1).padStart(2, '0'); // 월은 0부터 시작하므로 1을 더해줍니다.
	const currentDate = `${yyyy}-${mm}`;
	const date = dateParam ? dateParam : currentDate;

	await axios
		.get(currentUrl + '/api/v0/invoice/center/list?date=' + date)
		.then((res) => {
			if (res.data.resultCode === 200) {
				data.lab = res.data.item;
			} else {
				console.log('err: 서버 코드 에러');
				data.lab = [];
			}
		})
		.catch((err) => {
			console.log(err);
			data.lab = [];
		});

	await axios
		.get(currentUrl + '/api/v0/invoice/dental/list?date=' + date)
		.then((res) => {
			if (res.data.resultCode === 200) {
				data.dental = res.data.item;
			} else {
				console.log('err: 서버 코드 에러');
				data.dental = [];
			}
		})
		.catch((err) => {
			console.log(err);
			data.dental = [];
		});

	return {
		url: currentUrl,
		isMobile: isMobile,
		info: data,
		param: {
			date: date,
			corpName: corpNameParam
		}
	};
};
