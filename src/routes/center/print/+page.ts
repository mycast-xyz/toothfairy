import { browser } from '$app/environment';
import type { PageLoad } from './$types';
import { configService } from '../../../app/service/ConfigService';

// 캐릭터 목록 서비스
export const load: PageLoad = async ({ url }) => {
	let isMobile = false;
	let backendUrl = '';

	const dateParam = url.searchParams.get('date');
	const typeParam = url.searchParams.get('type') || 'all';
	const corpNameParam = url.searchParams.get('corpName') || '';

	const today = new Date();
	const yyyy = today.getFullYear();
	const mm = String(today.getMonth() + 1).padStart(2, '0'); // 월은 0부터 시작하므로 1을 더해줍니다.
	const currentDate = `${yyyy}-${mm}`;
	const date = dateParam ? dateParam : currentDate;

	try {
		// ConfigService 설정이 로드될 때까지 기다리기
		const configLoaded = await configService.waitForConfig(5000);
		if (!configLoaded) {
			console.warn('설정 로드 시간 초과, 기본값 사용');
		}

		backendUrl = configService.getBackendUrl();
		console.log('Backend URL:', backendUrl);
	} catch (error) {
		console.error('Config 로드 오류:', error);
	}

	return {
		url: backendUrl,
		isMobile: isMobile,
		param: {
			date: date,
			type: typeParam,
			corpName: corpNameParam
		}
	};
};
