import type { PageLoad } from './$types';
import { configService } from '../../../../app/service/ConfigService';
import axios from 'axios';

// 캐릭터 목록 서비스
export const load: PageLoad = async ({ url, params }) => {
	const backendUrl = configService.getBackendUrl();
	console.log('backendUrl:', backendUrl);

	let isMobile = false;
	let data: any = {};
	const slug = params.slug;

	try {
		// ConfigService 설정 정보 확인
		const config = configService.getConfig();
		console.log('전체 config:', config);
		console.log('api.endpoints:', config?.api?.endpoints);

		// ConfigService를 사용하여 API 엔드포인트 가져오기
		let fileItemEndpoint = configService.getApiEndpoint('file', 'item');
		console.log('getApiEndpoint 결과:', fileItemEndpoint);

		// 대안으로 직접 설정에서 가져오기
		if (!fileItemEndpoint) {
			fileItemEndpoint = config?.api?.endpoints?.file?.item || '/api/v0/center/file/item';
			console.log('직접 설정에서 가져온 endpoint:', fileItemEndpoint);
		}

		const apiUrl = `${backendUrl}${fileItemEndpoint}?id=${slug}`;
		console.log('최종 API 호출 URL:', apiUrl);

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
	const config = configService.getConfig();
	const fileShowEndpoint =
		configService.getApiEndpoint('file', 'show') ||
		config?.api?.endpoints?.file?.show ||
		'/api/v0/center/file/show';
	const dataCreateOkEndpoint =
		configService.getNestedApiEndpoint('data', 'create.ok') ||
		config?.api?.endpoints?.data?.create?.ok ||
		'/api/v0/center/data/create/ok';
	const dataCreateReEndpoint =
		configService.getNestedApiEndpoint('data', 'create.re') ||
		config?.api?.endpoints?.data?.create?.re ||
		'/api/v0/center/data/create/re';

	console.log('엔드포인트들:', {
		fileShow: fileShowEndpoint,
		dataCreateOk: dataCreateOkEndpoint,
		dataCreateRe: dataCreateReEndpoint
	});

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
