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
		// ConfigService 설정이 로드될 때까지 기다리기
		const configLoaded = await configService.waitForConfig(5000);
		if (!configLoaded) {
			console.warn('설정 로드 시간 초과, 기본값 사용');
		}

		// ConfigService를 사용하여 API 엔드포인트 가져오기
		console.log('ConfigService 설정 로드 상태:', configService.isConfigLoaded());
		console.log('현재 환경:', configService.getEnvironment());
		console.log('전체 설정:', configService.getConfig());

		const fileCheckEndpoint = configService.getApiEndpoint('file', 'check');
		console.log('fileCheckEndpoint', fileCheckEndpoint);

		// 추가 디버깅: 직접 설정에서 확인
		const fileEndpoints = configService.get('api.endpoints.file');
		console.log('file endpoints 전체:', fileEndpoints);

		// 서버에서 필터링하지 않고 전체 데이터를 가져오기 위해 type 파라미터 제거
		const apiUrl = `${backendUrl}${fileCheckEndpoint}?date=${date}&corpName=${corpNameParam}&type=all`;

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
