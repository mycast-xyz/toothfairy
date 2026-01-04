import axios from 'axios';
import { configService } from '../ConfigService';
import { authService } from '../auth/AuthService';

// 요청 필터 파라미터 타입 정의
export interface RequestFilterParams {
	page?: number;
	limit?: number;
	status?: string;
	dentalClinicId?: string;
	search?: string;
	startDate?: string;
	endDate?: string;
	deliveryStartDate?: string;
	deliveryEndDate?: string;
}

// API 응답 타입 정의
export interface RequestApiResponse {
	status: string;
	data: {
		requests: any[];
		pagination: {
			total: number;
			page: number;
			limit: number;
			totalPages: number;
		};
	};
}

// 요청 서비스 클래스
export class RequestService {
	/**
	 * 백엔드 API에서 의뢰 목록을 가져옵니다
	 */
	static async fetchRequestListFromApi(filterParams?: RequestFilterParams) {
		let requestList = [];
		let paginationData: any = {};

		try {
			const config = configService.getConfig();

			let endpoint = '';
			if (!config) {
				console.warn('⚠️ 설정을 불러올 수 없어 기본 URL을 사용합니다.');
				endpoint = 'http://localhost:3000/api/v0/request';
			} else {
				const backendBaseUrl = config.server.backend.baseUrl;
				const requestEndpoint = config.api.endpoints?.request || '/api/v0/request';
				endpoint = `${backendBaseUrl}${requestEndpoint}`;
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

			console.log('🔗 Request API 호출:', endpoint, '필터:', filterParams);

			const token = await authService.getJwtToken();
			const response = await axios.get(endpoint, {
				withCredentials: true,
				headers: {
					Authorization: `Bearer ${token}`
				}
			});

			const apiData = response.data;

			// API 응답 구조에 맞게 수정: success와 data.requests 사용
			if (apiData.success && apiData.data && apiData.data.requests) {
				requestList = apiData.data.requests;
				paginationData = {
					total: apiData.data.totalCount || 0,
					page: apiData.data.page || 1,
					limit: apiData.data.limit || 10,
					totalPages: apiData.data.totalPages || 1
				};
			} else {
				// 기존 구조도 지원 (호환성)
				requestList = apiData.requests || [];
				paginationData = apiData.paginationData || {};
			}

			console.log('📡 Request 데이터(백엔드) 수신:', {
				requestList: requestList.length,
				paginationData,
				filterApplied: !!filterParams
			});

			return {
				requestList,
				paginationData: {
					total: paginationData.total || 0,
					page: paginationData.page || 1,
					limit: paginationData.limit || 10,
					totalPages: paginationData.totalPages || 1
				}
			};
		} catch (error) {
			console.error('❌ Request 데이터(백엔드) 가져오기 오류:', error);
			const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
			throw new Error(`Request 데이터(백엔드) 가져오기 오류: ${errorMessage}`);
		}
	}

	/**
	 * 특정 의뢰의 상세 정보를 가져옵니다
	 */
	static async fetchRequestDetail(requestId: string) {
		try {
			const config = configService.getConfig();

			let endpoint = '';
			if (!config) {
				endpoint = `http://localhost:3000/api/request/${requestId}`;
			} else {
				const backendBaseUrl = config.server.backend.baseUrl;
				endpoint = `${backendBaseUrl}/api/request/${requestId}`;
			}

			console.log('🔗 Request Detail API 호출:', endpoint);

			const token = await authService.getJwtToken();
			const response = await axios.get(endpoint, {
				withCredentials: true,
				headers: {
					Authorization: `Bearer ${token}`
				}
			});

			return response.data;
		} catch (error) {
			console.error('❌ Request 상세 정보 가져오기 오류:', error);
			throw error;
		}
	}

	/**
	 * 의뢰 상태를 업데이트합니다
	 */
	static async updateRequestStatus(requestId: string, status: string) {
		try {
			const config = configService.getConfig();

			let endpoint = '';
			if (!config) {
				endpoint = `http://localhost:3000/api/request/${requestId}/status`;
			} else {
				const backendBaseUrl = config.server.backend.baseUrl;
				endpoint = `${backendBaseUrl}/api/request/${requestId}/status`;
			}

			console.log('🔗 Request Status Update API 호출:', endpoint, '상태:', status);

			const token = await authService.getJwtToken();
			const response = await axios.patch(
				endpoint,
				{ status },
				{
					withCredentials: true,
					headers: {
						Authorization: `Bearer ${token}`,
						'Content-Type': 'application/json'
					}
				}
			);

			return response.data;
		} catch (error) {
			console.error('❌ Request 상태 업데이트 오류:', error);
			throw error;
		}
	}
}
