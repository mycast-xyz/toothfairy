import { configService } from '../ConfigService';
import { authService } from '../auth/AuthService';
import axios, { type AxiosInstance, type AxiosResponse, type AxiosError } from 'axios';

// API 응답 타입 정의
export interface ApiResponse<T = any> {
	success: boolean;
	data?: T;
	message?: string;
}

// 타입 정의
export interface User {
	id: string;
	email: string;
	name: string;
	isPermitted: boolean;
	roleId: number;
	createdAt: string;
	updatedAt: string;
	role?: Role;
}

export interface Role {
	id: number;
	name: string;
	description?: string;
}

class UserApiService {
	private api: AxiosInstance;
	private configLoaded: boolean = false;

	constructor() {
		// 초기 설정으로 API 인스턴스 생성
		this.api = this.createApiInstance();
		this.initializeConfig();
	}

	/**
	 * ConfigService 초기화 및 설정 로드
	 */
	private async initializeConfig() {
		try {
			// ConfigService가 로드될 때까지 기다리기
			const configLoaded = await configService.waitForConfig(5000);

			if (configLoaded) {
				console.log('✅ UserApiService: ConfigService 로드 완료');
				this.configLoaded = true;

				// 백엔드 URL 업데이트
				const backendUrl = configService.getBackendUrl();
				if (backendUrl && backendUrl !== this.api.defaults.baseURL) {
					console.log(
						`🔄 UserApiService: 백엔드 URL 업데이트 ${this.api.defaults.baseURL} → ${backendUrl}`
					);
					this.api.defaults.baseURL = backendUrl;
				}
			} else {
				console.warn('⚠️ UserApiService: ConfigService 로드 타임아웃, 기본 설정 사용');
			}
		} catch (error) {
			console.error('❌ UserApiService: ConfigService 초기화 오류:', error);
		}
	}

	/**
	 * API 인스턴스 생성
	 */
	private createApiInstance(): AxiosInstance {
		// 백엔드 서버 URL 가져오기
		const backendUrl = configService.getBackendUrl() || 'http://localhost:3000';

		const api = axios.create({
			baseURL: backendUrl,
			timeout: 10000,
			headers: {
				'Content-Type': 'application/json'
			},
			withCredentials: true
		});

		// 요청 인터셉터
		api.interceptors.request.use(
			async (config) => {
				// 인증 토큰 첨부.
				// 토큰은 localStorage 에 보관되며 서버는 쿠키를 설정하지 않는다.
				// 이 헤더가 없으면 사용자관리 API 가 '액세스 토큰이 없습니다' 로 실패한다.
				const token = await authService.getJwtToken();
				if (token) {
					config.headers = config.headers || {};
					config.headers['Authorization'] = `Bearer ${token}`;
				}

				// 요청 전 로깅 (개발 환경에서만)
				if (import.meta.env.DEV) {
					console.log(
						'🔗 UserApiService Request:',
						config.method?.toUpperCase(),
						config.url,
						config.data
					);
				}
				return config;
			},
			(error) => {
				console.error('❌ UserApiService Request Error:', error);
				return Promise.reject(error);
			}
		);

		// 응답 인터셉터
		api.interceptors.response.use(
			(response: AxiosResponse<ApiResponse>) => {
				// 응답 후 로깅 (개발 환경에서만)
				if (import.meta.env.DEV) {
					console.log('✅ UserApiService Response:', response.status, response.data);
				}
				return response;
			},
			async (error: AxiosError<ApiResponse>) => {
				// 에러 처리
				console.error(
					'❌ UserApiService Response Error:',
					error.response?.status,
					error.response?.data
				);

				// 네트워크 에러 처리
				if (!error.response) {
					return Promise.reject(new Error('네트워크 연결에 실패했습니다.'));
				}

				// 토큰 만료 에러 처리 (401 또는 토큰 만료 메시지)
				if (
					error.response.status === 401 ||
					error.response.data?.message?.includes('토큰이 만료되었습니다') ||
					error.response.data?.message?.includes('Token expired') ||
					error.response.data?.message?.includes('인증이 필요합니다')
				) {
					console.log('🔐 UserApiService: 토큰 만료 감지 - JWT 토큰 재갱신 시도');

					try {
						// JWT 토큰 재갱신 시도
						const newToken = await authService.refreshJwtToken();

						if (newToken) {
							console.log('✅ UserApiService: JWT 토큰 재갱신 성공 - 원본 요청 재시도');

							// 원본 요청 재시도
							const originalRequest = error.config;
							if (originalRequest) {
								// 새로운 토큰으로 헤더 업데이트
								originalRequest.headers = originalRequest.headers || {};
								originalRequest.headers['Authorization'] = `Bearer ${newToken}`;

								// 원본 요청 재시도
								return this.api.request(originalRequest);
							}
						} else {
							console.log('❌ UserApiService: JWT 토큰 재갱신 실패');
							return Promise.reject(new Error('인증이 만료되었습니다. 다시 로그인해주세요.'));
						}
					} catch (refreshError) {
						console.error('❌ UserApiService: 토큰 재갱신 중 오류:', refreshError);
						return Promise.reject(new Error('인증이 만료되었습니다. 다시 로그인해주세요.'));
					}
				}

				// HTTP 상태 코드별 에러 메시지
				const status = error.response.status;
				let message = '알 수 없는 오류가 발생했습니다.';

				switch (status) {
					case 400:
						message = error.response.data?.message || '잘못된 요청입니다.';
						break;
					case 401:
						message = '인증이 필요합니다.';
						break;
					case 403:
						message = '접근 권한이 없습니다.';
						break;
					case 404:
						message = '요청한 리소스를 찾을 수 없습니다.';
						break;
					case 500:
						message = '서버 내부 오류가 발생했습니다.';
						break;
					default:
						message = error.response.data?.message || `오류가 발생했습니다. (${status})`;
				}

				return Promise.reject(new Error(message));
			}
		);

		return api;
	}

	// ==================== USER API METHODS ====================

	/**
	 * 모든 사용자 목록 조회
	 */
	public async getAllUsers(): Promise<ApiResponse<User[]>> {
		try {
			// ConfigService 로딩 상태 확인
			if (!this.configLoaded) {
				console.warn(
					'⚠️ UserApiService: ConfigService가 아직 로드되지 않았습니다. 기본 설정으로 진행합니다.'
				);
			}

			const endpoint = configService.getApiEndpoint('setting', 'users');
			console.log('🔗 UserApiService: 사용자 목록 조회 엔드포인트:', endpoint);

			const response = await this.api.get<ApiResponse<User[]>>(endpoint);
			console.log(
				'✅ UserApiService: 사용자 목록 조회 성공, 사용자 수:',
				response.data.data?.length || 0
			);
			return response.data;
		} catch (error) {
			console.error('❌ UserApiService: 사용자 목록 조회 오류:', error);
			throw error;
		}
	}

	/**
	 * 특정 사용자 조회
	 */
	public async getUserById(id: string): Promise<ApiResponse<User>> {
		try {
			const baseEndpoint = configService.getApiEndpoint('setting', 'users');
			const response = await this.api.get<ApiResponse<User>>(`${baseEndpoint}/${id}`);
			return response.data;
		} catch (error) {
			console.error('❌ UserApiService: 사용자 조회 오류:', error);
			throw error;
		}
	}

	/**
	 * 사용자 승인 (isPermitted = true)
	 */
	public async permitUser(id: string): Promise<ApiResponse<User>> {
		try {
			const baseEndpoint = configService.getApiEndpoint('setting', 'users');
			const response = await this.api.patch<ApiResponse<User>>(`${baseEndpoint}/${id}/permit`);
			return response.data;
		} catch (error) {
			console.error('❌ UserApiService: 사용자 승인 오류:', error);
			throw error;
		}
	}

	/**
	 * 사용자 역할 및 승인 상태 업데이트
	 */
	public async updateUserRole(
		id: string,
		data: { roleId?: number; isPermitted?: boolean }
	): Promise<ApiResponse<User>> {
		try {
			const baseEndpoint = configService.getApiEndpoint('setting', 'users');
			const response = await this.api.patch<ApiResponse<User>>(`${baseEndpoint}/${id}/role`, data);
			return response.data;
		} catch (error) {
			console.error('❌ UserApiService: 사용자 역할 업데이트 오류:', error);
			throw error;
		}
	}

	/**
	 * 사용자 삭제
	 */
	public async deleteUser(id: string): Promise<ApiResponse> {
		try {
			const baseEndpoint = configService.getApiEndpoint('setting', 'users');
			const response = await this.api.delete<ApiResponse>(`${baseEndpoint}/${id}`);
			return response.data;
		} catch (error) {
			console.error('❌ UserApiService: 사용자 삭제 오류:', error);
			throw error;
		}
	}

	// ==================== ROLE API METHODS ====================

	/**
	 * 모든 역할 목록 조회
	 */
	public async getAllRoles(): Promise<ApiResponse<Role[]>> {
		try {
			// ConfigService 로딩 상태 확인
			if (!this.configLoaded) {
				console.warn(
					'⚠️ UserApiService: ConfigService가 아직 로드되지 않았습니다. 기본 설정으로 진행합니다.'
				);
			}

			const endpoint = configService.getApiEndpoint('setting', 'userrole');
			console.log('🔗 UserApiService: 역할 목록 조회 엔드포인트:', endpoint);

			const response = await this.api.get<ApiResponse<Role[]>>(endpoint);
			console.log(
				'✅ UserApiService: 역할 목록 조회 성공, 역할 수:',
				response.data.data?.length || 0
			);
			return response.data;
		} catch (error) {
			console.error('❌ UserApiService: 역할 목록 조회 오류:', error);
			throw error;
		}
	}

	/**
	 * 특정 역할 조회
	 */
	public async getRoleById(id: number): Promise<ApiResponse<Role>> {
		try {
			const baseEndpoint = configService.getApiEndpoint('setting', 'userrole');
			const response = await this.api.get<ApiResponse<Role>>(`${baseEndpoint}/${id}`);
			return response.data;
		} catch (error) {
			console.error('❌ 역할 조회 오류:', error);
			throw error;
		}
	}

	/**
	 * 역할 생성
	 */
	public async createRole(data: {
		name: string;
		description?: string;
	}): Promise<ApiResponse<Role>> {
		try {
			const endpoint = configService.getApiEndpoint('setting', 'userrole');
			const response = await this.api.post<ApiResponse<Role>>(endpoint, data);
			return response.data;
		} catch (error) {
			console.error('❌ 역할 생성 오류:', error);
			throw error;
		}
	}

	/**
	 * 역할 수정
	 */
	public async updateRole(
		id: number,
		data: { name?: string; description?: string }
	): Promise<ApiResponse<Role>> {
		try {
			const baseEndpoint = configService.getApiEndpoint('setting', 'userrole');
			const response = await this.api.put<ApiResponse<Role>>(`${baseEndpoint}/${id}`, data);
			return response.data;
		} catch (error) {
			console.error('❌ 역할 수정 오류:', error);
			throw error;
		}
	}

	/**
	 * 역할 삭제
	 */
	public async deleteRole(id: number): Promise<ApiResponse> {
		try {
			const baseEndpoint = configService.getApiEndpoint('setting', 'userrole');
			const response = await this.api.delete<ApiResponse>(`${baseEndpoint}/${id}`);
			return response.data;
		} catch (error) {
			console.error('❌ 역할 삭제 오류:', error);
			throw error;
		}
	}
}

export const userApiService = new UserApiService();
