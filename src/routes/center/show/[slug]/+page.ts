import type { PageLoad } from './$types';
import { configService } from '../../../../app/service/ConfigService';
import axios from 'axios';

// 캐릭터 목록 서비스
export const load: PageLoad = async ({ url, params }) => {
	const backendUrl = configService.getBackendUrl();
	let isMobile = false;
	let data: any = {};
	const slug = params.slug;

	try {
		// ConfigService를 사용하여 API 엔드포인트 가져오기
		const fileItemEndpoint = configService.getApiEndpoint('file', 'item');
		const apiUrl = `${backendUrl}${fileItemEndpoint}?id=${slug}`;

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

	// Svelte 컴포넌트에서 사용할 URL들을 미리 생성
	const fileShowEndpoint = configService.getApiEndpoint('file', 'show');
	const dataCreateOkEndpoint = '/api/v0/data/create/ok';
	const dataCreateReEndpoint = '/api/v0/data/create/re';

	return {
		url: backendUrl,
		isMobile: isMobile,
		info: data,
		endpoints: {
			fileShow: fileShowEndpoint,
			dataCreateOk: dataCreateOkEndpoint,
			dataCreateRe: dataCreateReEndpoint
		}
	};
};
