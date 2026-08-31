import type { PageLoad } from './$types';
import axios from 'axios';
import { configService, resolveUrl } from '../../../app/service/ConfigService';

export const load: PageLoad = async ({ data }) => {
	// CAM Print 페이지 로드 - 사용자 정보 전달
	let initialPrintData = [];
	let initialProgressData = {};

	try {
		// ConfigService 설정 로드 대기 (최대 3초)
		const configLoaded = await configService.waitForConfig(3000);
		console.log('⏳ ConfigService 설정 로드 상태:', configLoaded);

		// 설정에서 백엔드 baseUrl과 CAM API 엔드포인트 가져오기
		const config = configService.getConfig();
		console.log('🔧 로드된 설정:', config);

		if (!config || !configLoaded) {
			console.warn('⚠️ 설정을 불러올 수 없어 기본 URL을 사용합니다.');
			// 기본 URL 사용 (withCredentials: 인증 쿠키 전송 — receipts는 인증 필요)
			const response = await axios.get(resolveUrl('http://localhost:3000') + '/api/v0/cam/data/receipts', {
				withCredentials: true
			});
			if (response.status === 200) {
				const apiData = response.data;
				// API 응답 구조에 맞게 수정
				if (apiData.status === 'ok' && apiData.data && apiData.data.receipts) {
					initialPrintData = apiData.data.receipts;
					initialProgressData = {
						total: apiData.data.pagination?.total || 0,
						page: apiData.data.pagination?.page || 1,
						limit: apiData.data.pagination?.limit || 50
					};
				} else {
					// 기존 구조도 지원
					initialPrintData = apiData.printList || apiData.receipts || [];
					initialProgressData = apiData.progressData || {};
				}
				console.log('📊 CAM Print 초기 데이터 로드 성공 (기본 URL):', {
					initialPrintData: initialPrintData.length,
					initialProgressData
				});
			}
		} else {
			const backendBaseUrl = config.server.backend.baseUrl;
			const camReceiptsEndpoint = config.api.endpoints.cam.data.receipts;
			const fullUrl = `${backendBaseUrl}${camReceiptsEndpoint}`;

			console.log('🔗 CAM Print API 호출:', fullUrl);

			// HTTP API에서 초기 출력물 데이터 가져오기 (withCredentials: 인증 쿠키 전송)
			const response = await axios.get(fullUrl, { withCredentials: true });
			if (response.status === 200) {
				const apiData = response.data;
				// API 응답 구조에 맞게 수정
				if (apiData.status === 'ok' && apiData.data && apiData.data.receipts) {
					initialPrintData = apiData.data.receipts;
					initialProgressData = {
						total: apiData.data.pagination?.total || 0,
						page: apiData.data.pagination?.page || 1,
						limit: apiData.data.pagination?.limit || 50
					};
				} else {
					// 기존 구조도 지원
					initialPrintData = apiData.printList || apiData.receipts || [];
					initialProgressData = apiData.progressData || {};
				}
				console.log('📊 CAM Print 초기 데이터 로드 성공:', {
					initialPrintData: initialPrintData.length,
					initialProgressData
				});
			} else {
				console.warn('⚠️ CAM Print 초기 데이터 로드 실패:', response.status);
			}
		}
	} catch (error) {
		console.error('❌ CAM Print 초기 데이터 로드 오류:', error);
	}

	return {
		user: data?.user || null,
		initialPrintData,
		initialProgressData
	};
};
