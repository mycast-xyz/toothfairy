import { browser } from '$app/environment';
import type { PageLoad } from './$types';
import { configService } from '../../../app/service/ConfigService';
import axios from 'axios';

// 캐릭터 목록 서비스
export const load: PageLoad = async ({ url }) => {
	const backendUrl = configService.getBackendUrl();
	let isMobile = false;
	let data: any = {};

	const dateParam = url.searchParams.get('date');
	const typeParam = url.searchParams.get('type') || 'all';
	const corpNameParam = url.searchParams.get('corpName') || '';

	const today = new Date();
	const yyyy = today.getFullYear();
	const mm = String(today.getMonth() + 1).padStart(2, '0'); // 월은 0부터 시작하므로 1을 더해줍니다.
	const currentDate = `${yyyy}-${mm}`;
	const date = dateParam ? dateParam : currentDate;

	console.log('조회 날짜:', date);

	try {
		// ConfigService를 사용하여 API 엔드포인트 가져오기
		const fileCheckEndpoint = configService.getApiEndpoint('file', 'check');
		const apiUrl = `${backendUrl}${fileCheckEndpoint}?date=${date}&type=${typeParam}&corpName=${corpNameParam}`;

		console.log('API 호출 URL:', apiUrl);

		const response = await axios.get(apiUrl);

		if (response.data.resultCode === 200) {
			data = response.data.item;
		} else {
			console.error('서버 응답 오류:', response.data);
		}
	} catch (error) {
		console.error('API 호출 오류:', error);
	}

	return {
		url: backendUrl,
		isMobile: isMobile,
		info: data,
		param: {
			date: date,
			type: typeParam,
			corpName: corpNameParam
		}
	};
};
