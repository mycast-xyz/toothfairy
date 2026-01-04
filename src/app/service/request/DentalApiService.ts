/**
 * 치과 API 서비스
 * 백엔드 서버에서 치과 리스트를 가져오는 서비스
 */
import { configService } from '../ConfigService';
import { authService } from '../auth/AuthService';
import axios from 'axios';

export interface DentalClinic {
	id: number;
	corp_name: string;
	classification: string;
	region: string;
	address: string;
	phone_number: string;
	business_number: string;
	email: string;
	createdAt: string;
	updatedAt: string;
}

export interface DentalApiResponse {
	success: boolean;
	data: DentalClinic[];
	message?: string;
}

export interface TreatmentItem {
	id: number;
	technicianname: string;
	prkey: string;
	price: number;
	category?: string;
	description?: string;
	createdAt?: string;
	updatedAt?: string;
}

export interface TreatmentApiResponse {
	success: boolean;
	data: {
		dentalClinicPrices: Array<{
			price_data: TreatmentItem[];
		}>;
	};
	message?: string;
}

export interface RequestCountResponse {
	success: boolean;
	message: string;
	data: {
		totalCount: number;
		statusCounts: Array<{
			status: string;
			count: string;
		}>;
		clinicCounts: Array<{
			dentalClinic: string;
			dentalClinicId: string;
			count: string;
		}>;
		filters: {
			status: string;
			startDate: string;
			endDate: string;
		};
	};
}

export class DentalApiService {
	private baseUrl: string;

	constructor() {
		// configService에서 백엔드 주소를 가져옵니다
		this.baseUrl = this.getBaseUrl();
	}

	/**
	 * configService에서 백엔드 주소를 가져옵니다
	 * @returns 백엔드 baseUrl
	 */
	private getBaseUrl(): string {
		try {
			const config = configService.getConfig();
			if (!config || !config.server || !config.server.backend) {
				throw new Error('Config가 올바르지 않습니다.');
			}
			return config.server.backend.baseUrl;
		} catch (error) {
			console.warn(
				'ConfigService에서 백엔드 주소를 가져올 수 없습니다. 기본값을 사용합니다.',
				error
			);
			// 기본값으로 localhost 사용
			return 'http://localhost:3000';
		}
	}

	/**
	 * 치과 리스트를 가져옵니다
	 * @param classification 분류 (기본값: '치과')
	 * @returns Promise<DentalClinic[]>
	 */
	async getDentalClinicList(classification: string = '치과'): Promise<DentalClinic[]> {
		try {
			const endpoint = `/api/v0/corp/list/classification/${encodeURIComponent(classification)}`;
			const url = `${this.baseUrl}${endpoint}`;
			console.log('치과 리스트 API 호출:', url);

			// JWT 토큰 가져오기
			const token = await authService.getJwtToken();

			const response = await axios.get(endpoint, {
				baseURL: this.baseUrl,
				withCredentials: true,
				headers: {
					Authorization: `Bearer ${token}`
				}
			});

			const result: DentalApiResponse = response.data;
			console.log('API 응답:', result);

			if (!result.success) {
				console.error('API 응답 실패:', result.message);
				throw new Error(result.message || '치과 리스트를 가져오는데 실패했습니다.');
			}

			// data 배열만 반환
			const dentalClinics = result.data || [];
			console.log('치과 리스트 로드 성공:', dentalClinics.length, '개');
			console.log('치과 리스트 데이터:', dentalClinics);
			return dentalClinics;
		} catch (error) {
			console.error('치과 리스트 가져오기 실패:', error);
			// 네트워크 오류나 기타 오류 시 빈 배열 반환
			return [];
		}
	}

	/**
	 * 특정 ID의 치과 정보를 가져옵니다
	 * @param id 치과 ID
	 * @returns Promise<DentalClinic | null>
	 */
	async getDentalClinicById(id: string): Promise<DentalClinic | null> {
		try {
			const clinics = await this.getDentalClinicList();
			return clinics.find((clinic) => clinic.id.toString() === id) || null;
		} catch (error) {
			console.error('치과 정보 가져오기 실패:', error);
			return null;
		}
	}

	/**
	 * 특정 치과의 치료 종목을 가져옵니다
	 * @param dentalClinicId 치과 ID
	 * @returns Promise<TreatmentItem[]>
	 */
	async getTreatmentItems(dentalClinicId: string): Promise<TreatmentItem[]> {
		try {
			const endpoint = `/api/v0/corp/list/${encodeURIComponent(dentalClinicId)}`;
			const url = `${this.baseUrl}${endpoint}`;
			console.log('치료 종목 API 호출:', url);

			// JWT 토큰 가져오기
			const token = await authService.getJwtToken();

			const response = await axios.get(endpoint, {
				baseURL: this.baseUrl,
				withCredentials: true,
				headers: {
					Authorization: `Bearer ${token}`
				}
			});

			const result: TreatmentApiResponse = response.data;
			console.log('치료 종목 API 응답:', result);

			if (!result.success) {
				console.error('치료 종목 API 응답 실패:', result.message);
				throw new Error(result.message || '치료 종목을 가져오는데 실패했습니다.');
			}

			// data.dentalClinicPrices[0].price_data 배열만 반환
			const treatmentItems = result.data.dentalClinicPrices[0].price_data || [];
			console.log('치료 종목 로드 성공:', treatmentItems.length, '개');
			console.log('치료 종목 데이터:', treatmentItems);
			return treatmentItems;
		} catch (error) {
			console.error('치료 종목 가져오기 실패:', error);
			// 네트워크 오류나 기타 오류 시 빈 배열 반환
			return [];
		}
	}

	/**
	 * 특정 날짜의 의뢰서 개수를 가져옵니다
	 * @param startDate 시작 날짜 (YYYY-MM-DD 형식)
	 * @returns Promise<number>
	 */
	async getRequestCount(startDate: string): Promise<number> {
		try {
			const endpoint = `/api/v0/request/count?startDate=${encodeURIComponent(startDate)}`;
			const url = `${this.baseUrl}${endpoint}`;
			console.log('의뢰서 개수 API 호출:', url);

			// JWT 토큰 가져오기 및 검증
			const token = await authService.getJwtToken();
			if (!token || token.trim() === '') {
				console.error('JWT 토큰이 없습니다.');
				throw new Error('인증 토큰이 없습니다. 로그인이 필요합니다.');
			}

			console.log('JWT 토큰 검증 완료');

			const response = await axios.get(endpoint, {
				baseURL: this.baseUrl,
				withCredentials: true,
				headers: {
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json'
				}
			});

			const result: RequestCountResponse = response.data;
			console.log('의뢰서 개수 API 응답:', result);

			if (!result.success) {
				console.error('의뢰서 개수 API 응답 실패:', result.message);
				throw new Error(result.message || '의뢰서 개수를 가져오는데 실패했습니다.');
			}

			const count = result.data.totalCount || 0;
			console.log('의뢰서 개수 로드 성공:', count);
			return count;
		} catch (error) {
			console.error('의뢰서 개수 가져오기 실패:', error);

			// 인증 오류인 경우 특별 처리
			if (error instanceof Error && error.message.includes('인증')) {
				console.error('인증 오류로 인한 의뢰서 개수 조회 실패');
				throw error;
			}

			// 네트워크 오류나 기타 오류 시 0 반환
			return 0;
		}
	}
}

// 싱글턴 인스턴스 생성 및 export
export const dentalApiService = new DentalApiService();
