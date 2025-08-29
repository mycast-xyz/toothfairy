import type { PageLoad } from './$types';
import { configService } from '../../../../app/service/ConfigService';
import axios from 'axios';

// 캐릭터 목록 서비스
export const load: PageLoad = async ({ url, params }) => {
	const backendUrl = configService.getBackendUrl();
	console.log('[Page Load] backendUrl:', backendUrl);

	let isMobile = false;
	let data: any = {};
	const slug = params.slug;

	console.log('[Page Load] slug:', slug);

	try {
		// ConfigService 설정 정보 확인
		const config = configService.getConfig();
		console.log('[Page Load] 전체 config:', config);
		console.log('[Page Load] api.endpoints:', config?.api?.endpoints);

		// ConfigService를 사용하여 API 엔드포인트 가져오기
		let fileItemEndpoint = configService.getApiEndpoint('file', 'item');
		console.log('[Page Load] getApiEndpoint 결과:', fileItemEndpoint);

		// 대안으로 직접 설정에서 가져오기
		if (!fileItemEndpoint) {
			fileItemEndpoint = config?.api?.endpoints?.file?.item || '/api/v0/center/file/item';
			console.log('[Page Load] 직접 설정에서 가져온 endpoint:', fileItemEndpoint);
		}

		const apiUrl = `${backendUrl}${fileItemEndpoint}?id=${slug}`;
		console.log('[Page Load] 최종 API 호출 URL:', apiUrl);

		const response = await axios.get(apiUrl);
		console.log('[Page Load] API 응답 전체:', response.data);

		if (response.data.resultCode === 200) {
			data = response.data.item;
			console.log('[Page Load] 성공적으로 데이터 로드됨:', data);

			// 파일 데이터 구조 확인
			if (data?.directory?.files) {
				console.log('[Page Load] 파일 목록 발견:', {
					fileCount: data.directory.files.length,
					files: data.directory.files
				});
			} else {
				console.warn('[Page Load] 파일 목록이 없습니다:', data?.directory);
			}

			// 리메이크 파일 데이터 구조 확인
			if (data?.directory?.remakeFiles) {
				console.log('[Page Load] 리메이크 파일 정보 발견:', {
					okCount: data.directory.remakeFiles.ok?.length || 0,
					reCount: data.directory.remakeFiles.re?.length || 0,
					remakeFiles: data.directory.remakeFiles
				});
			} else {
				console.warn('[Page Load] 리메이크 파일 정보가 없습니다');
			}
		} else {
			console.error('[Page Load] 서버 응답 오류:', response.data);
		}
	} catch (error) {
		console.error('[Page Load] API 호출 오류:', error);

		// 에러 상세 정보 출력
		if (axios.isAxiosError(error)) {
			console.error('[Page Load] Axios 에러 상세:', {
				status: error.response?.status,
				statusText: error.response?.statusText,
				data: error.response?.data,
				config: {
					url: error.config?.url,
					method: error.config?.method,
					headers: error.config?.headers
				}
			});
		}
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

	console.log('[Page Load] 엔드포인트들:', {
		fileShow: fileShowEndpoint,
		dataCreateOk: dataCreateOkEndpoint,
		dataCreateRe: dataCreateReEndpoint
	});

	const result = {
		url: backendUrl,
		isMobile: isMobile,
		info: data,
		endpoints: {
			fileShow: fileShowEndpoint,
			dataCreateOk: dataCreateOkEndpoint,
			dataCreateRe: dataCreateReEndpoint
		}
	};

	console.log('[Page Load] 최종 반환 데이터:', result);
	return result;
};
