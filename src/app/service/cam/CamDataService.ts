// fetch 대신 axios 사용
import axios from 'axios';
// DB에서 최신 CAM 출력물 리스트를 API 백엔드 서버에서 받아오는 함수
import { configService } from '../ConfigService';
import { authService } from '../auth/AuthService';
import { toastStore } from '../ToastService';

// 필터 파라미터 타입 정의
export interface CamFilterParams {
	folderType?: string;
	status?: string;
	filename?: string;
	receivedBy?: string;
	page?: number;
	limit?: number;
	startDate?: string;
	endDate?: string;
	title?: string; // 카테고리 필터 추가
}

export async function fetchCamPrintListFromApi(filterParams?: CamFilterParams) {
	let printList = [];
	let progressData = {};

	try {
		const config = configService.getConfig();

		let endpoint = '';
		if (!config) {
			console.warn('⚠️ 설정을 불러올 수 없어 기본 URL을 사용합니다.');
			endpoint = 'http://localhost:3000/api/v0/cam/data/receipts';
		} else {
			const backendBaseUrl = config.server.backend.baseUrl;
			const camReceiptsEndpoint = config.api.endpoints.cam.data.receipts;
			endpoint = `${backendBaseUrl}${camReceiptsEndpoint}`;
		}

		// 필터 파라미터를 쿼리 스트링으로 변환
		const queryParams = new URLSearchParams();
		if (filterParams) {
			Object.entries(filterParams).forEach(([key, value]) => {
				if (value !== undefined && value !== null && value !== '') {
					queryParams.append(key, value.toString());
				}
			});
		}

		// 쿼리 파라미터가 있으면 URL에 추가
		if (queryParams.toString()) {
			endpoint += `?${queryParams.toString()}`;
		}

		console.log('🔗 CAM Print API 호출:', endpoint, '필터:', filterParams);

		const token = await authService.getJwtToken();
		// 토큰이 있으면 Bearer 헤더로, 없으면 헤더 생략 → 서버가 httpOnly 쿠키로 인증 폴백.
		// ('Bearer null'을 보내면 서버가 쿠키 폴백을 못 하고 401이 되므로 조건부로 붙인다.)
		const response = await axios.get(endpoint, {
			withCredentials: true,
			headers: token ? { Authorization: `Bearer ${token}` } : {}
		});

		const apiData = response.data;

		// API 응답 구조에 맞게 수정: data.receipts 사용
		if (apiData.status === 'ok' && apiData.data && apiData.data.receipts) {
			printList = apiData.data.receipts;
			progressData = {
				total: apiData.data.pagination?.total || 0,
				page: apiData.data.pagination?.page || 1,
				limit: apiData.data.pagination?.limit || 50
			};
		} else {
			// 기존 구조도 지원 (호환성)
			printList = apiData.printList || apiData.receipts || [];
			progressData = apiData.progressData || {};
		}

		console.log('📡 CAM 데이터(백엔드) 수신:', {
			printList: printList.length,
			progressData,
			filterApplied: !!filterParams
		});

		return {
			printList,
			progressData
		};
	} catch (error) {
		console.error('❌ CAM 데이터(백엔드) 가져오기 오류:', error);
		const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
		throw new Error(`CAM 데이터(백엔드) 가져오기 오류: ${errorMessage}`);
	}
}
/**
 * 파일 고유 번호(id)를 받아 백엔드 다운로드 API를 호출하여 파일을 다운로드합니다.
 * @param {string|number} fileId - 다운로드할 파일의 고유 번호
 * @returns {Promise<void>}
 */
export async function downloadCamFileById(fileId: string | number): Promise<void> {
	try {
		// 환경설정에서 다운로드 엔드포인트 가져오기
		const config = configService.getConfig();
		if (!config) {
			throw new Error('설정 정보를 불러올 수 없습니다.');
		}
		const backendBaseUrl = config.server.backend.baseUrl;
		let downloadEndpoint = config.api.endpoints.cam.data.download.single;

		// URL에 /single 이 포함되도록 보장
		if (!downloadEndpoint.endsWith('/single')) {
			downloadEndpoint = downloadEndpoint.replace(/\/$/, '') + '/single';
		}

		// 다운로드 API URL 생성 (예: /api/v0/cam/data/download/single?id=12)
		const url = `${backendBaseUrl}${downloadEndpoint}?id=${fileId}`;

		console.log('⬇️ CAM 파일 다운로드 API 호출:', url);

		const token = await authService.getJwtToken();
		const response = await axios.get(url, {
			responseType: 'blob',
			withCredentials: true,
			headers: {
				Authorization: `Bearer ${token}`
			}
		});

		console.log('📄 다운로드 응답 헤더:', response.headers);

		// 파일명 추출 (Content-Disposition 헤더에서)
		let fileName = 'downloaded_file';
		const disposition = response.headers['content-disposition'];
		if (disposition && disposition.includes('filename=')) {
			const match = disposition.match(/filename="?([^"]+)"?/);
			if (match && match[1]) {
				fileName = decodeURIComponent(match[1]);
			}
		}

		// 파일 데이터 blob으로 변환
		const blob = response.data;

		// 브라우저에서 다운로드 트리거
		const link = document.createElement('a');
		link.href = window.URL.createObjectURL(blob);
		link.download = fileName;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		window.URL.revokeObjectURL(link.href);

		console.log('✅ 파일 다운로드 완료:', fileName);
	} catch (error) {
		console.error('❌ 파일 다운로드 중 오류 발생:', error);
		throw new Error('파일 다운로드에 실패했습니다.');
	}
}

/**
 * 여러 파일 고유 번호(id)를 받아 백엔드 멀티 다운로드 API를 호출하여 zip 파일로 다운로드합니다.
 * @param {string[]} fileIds - 다운로드할 파일들의 고유 번호 배열
 * @returns {Promise<void>}
 */
export async function downloadCamFilesAsZip(fileIds: string[]): Promise<void> {
	try {
		const config = configService.getConfig();
		if (!config) {
			throw new Error('설정 정보를 불러올 수 없습니다.');
		}
		const backendBaseUrl = config.server.backend.baseUrl;
		const multiDownloadEndpoint = config.api.endpoints.cam.data.download.multi;

		const url = `${backendBaseUrl}${multiDownloadEndpoint}`;

		console.log('⬇️ CAM 파일 멀티 다운로드 API 호출:', url, '파일 개수:', fileIds.length);

		const token = await authService.getJwtToken();
		const response = await axios.post(
			url,
			{ fileIds },
			{
				responseType: 'blob',
				withCredentials: true,
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`
				}
			}
		);

		console.log('📄 ZIP 다운로드 응답 헤더:', response.headers);

		let fileName = `download_${new Date().getTime()}.zip`;
		const disposition = response.headers['content-disposition'];
		if (disposition && disposition.includes('filename=')) {
			const match = disposition.match(/filename="?([^"]+)"?/);
			if (match && match[1]) {
				fileName = decodeURIComponent(match[1]);
			}
		}

		const blob = response.data;

		const link = document.createElement('a');
		link.href = window.URL.createObjectURL(blob);
		link.download = fileName;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		window.URL.revokeObjectURL(link.href);

		console.log('✅ ZIP 파일 다운로드 완료:', fileName);
	} catch (error) {
		console.error('❌ ZIP 파일 다운로드 중 오류 발생:', error);
		throw new Error('ZIP 파일 다운로드에 실패했습니다.');
	}
}

/**
 * 파일 고유 번호(id)를 받아 백엔드에 완료처리 API를 호출하고, 결과를 토스트로 알림
 * @param {string|number} fileId - 완료처리할 파일의 고유 번호
 * @returns {Promise<void>}
 */
export async function completeCamFileById(fileId: string | number): Promise<void> {
	try {
		const config = configService.getConfig();
		if (!config) {
			throw new Error('설정 정보를 불러올 수 없습니다.');
		}
		const backendBaseUrl = config.server.backend.baseUrl;
		const completeEndpoint = '/api/v0/cam/data/complete'; // 실제 엔드포인트에 맞게 수정
		const url = `${backendBaseUrl}${completeEndpoint}`;

		console.log('✅ CAM 파일 완료처리 API 호출:', url, '파일ID:', fileId);

		const token = await authService.getJwtToken();
		const response = await axios.post(
			url,
			{ fileId },
			{
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`
				},
				withCredentials: true
			}
		);

		const data = response.data;
		if (data.status === 'ok') {
			toastStore.success(data.message || '파일이 완료 처리되었습니다.');
		} else {
			toastStore.error(data.message || '파일 완료 처리 중 오류가 발생했습니다.');
		}
	} catch (error: any) {
		console.error('❌ 파일 완료 처리 중 오류 발생:', error);
		const msg = error?.response?.data?.message || error.message || '파일 완료 처리에 실패했습니다.';
		toastStore.error(msg);
	}
}

/**
 * CAM 진행률 데이터를 API 백엔드 서버에서 받아오는 함수
 * @returns {Promise<any>} 진행률 데이터
 */
export async function fetchCamProgressFromApi() {
	try {
		const config = configService.getConfig();

		let endpoint = '';
		if (!config) {
			console.warn('⚠️ 설정을 불러올 수 없어 기본 URL을 사용합니다.');
			endpoint = 'http://localhost:3000/api/v0/cam/data/progress';
		} else {
			const backendBaseUrl = config.server.backend.baseUrl;
			const camProgressEndpoint = config.api.endpoints.cam.progress;
			endpoint = `${backendBaseUrl}${camProgressEndpoint}`;
		}

		console.log('🔗 CAM Progress API 호출:', endpoint);

		const token = await authService.getJwtToken();
		const response = await axios.get(endpoint, {
			withCredentials: true,
			headers: {
				Authorization: `Bearer ${token}`
			}
		});

		const apiData = response.data;

		// API 응답 구조에 맞게 수정
		if (apiData.status === 'ok' && apiData.data) {
			console.log('📊 CAM 진행률 데이터 수신:', apiData.data);
			return apiData.data;
		} else {
			// 기존 구조도 지원 (호환성)
			console.log('📊 CAM 진행률 데이터 수신 (기존 구조):', apiData);
			return apiData;
		}
	} catch (error) {
		console.error('❌ CAM 진행률 데이터 가져오기 오류:', error);
		const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
		throw new Error(`CAM 진행률 데이터 가져오기 오류: ${errorMessage}`);
	}
}
