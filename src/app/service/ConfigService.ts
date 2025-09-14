import { writable } from 'svelte/store';
import axios from 'axios';

// 기본 타입 정의 (필수 설정들)
export interface BaseConfig {
	server: {
		backend: {
			host: string;
			port: number;
			protocol: string;
			baseUrl: string;
		};
		socket: {
			host: string;
			port: number;
			protocol: string;
			baseUrl: string;
		};
		frontend: {
			host: string;
			port: number;
			protocol: string;
			baseUrl: string;
		};
	};
	api: {
		endpoints: Record<string, any>;
	};
	app: {
		name: string;
		version: string;
		environment: string;
		debug: boolean;
		features: Record<string, boolean>;
	};
	security: {
		jwt: {
			secret: string;
			expiresIn: string;
			refreshExpiresIn: string;
			autoRefresh?: {
				enabled: boolean;
				threshold: number;
				backgroundCheck: boolean;
				activityBased: boolean;
				activityTimeout: number;
			};
		};
		cors: {
			origin: string[];
			credentials: boolean;
		};
		cookies: Record<
			string,
			{
				name: string;
				httpOnly: boolean;
				secure: boolean;
				sameSite: string;
				maxAge: number;
			}
		>;
	};
}

// 확장 가능한 설정 타입 (JSON 파일의 모든 속성을 허용)
export type ApplicationConfig = BaseConfig & Record<string, any>;

// 설정 스토어
export const configStore = writable<ApplicationConfig | null>(null);

class ConfigService {
	private config: ApplicationConfig | null = null;
	private environment: string = 'dev';

	constructor() {
		// 비동기로 설정 로드 시작
		this.loadConfig().catch((error) => {
			console.error('설정 로드 실패:', error);
		});
	}

	/**
	 * 환경에 따른 설정 파일 로드
	 */
	private async loadConfig(): Promise<void> {
		try {
			// 환경 변수에서 환경 설정 가져오기
			this.environment = import.meta.env.VITE_APP_ENV || 'dev';
			console.log('현재 환경:', this.environment);

			// 브라우저 환경에서는 동적으로 설정 파일 로드
			if (typeof window !== 'undefined') {
				const configPath = `/config/application.${this.environment}.json`;
				console.log('설정 파일 경로:', configPath);

				try {
					const response = await axios.get(configPath);
					console.log('설정 파일 응답 상태:', response.status);

					if (response.status === 200) {
						const loadedConfig = response.data;
						console.log('로드된 JSON 설정:', loadedConfig);

						// 기본 설정과 병합
						this.config = this.mergeWithDefaults(loadedConfig);
						console.log('병합된 최종 설정:', this.config);
					} else {
						console.warn(`설정 파일 로드 실패 (${response.status}): ${response.statusText}`);
						// 설정 파일을 찾을 수 없는 경우 기본값 사용
						this.config = this.getDefaultConfig();
						console.log('기본 설정 사용');
					}
				} catch (error) {
					console.warn('설정 파일 로드 중 오류 발생, 기본값 사용:', error);
					this.config = this.getDefaultConfig();
					console.log('기본 설정 사용 (오류로 인해)');
				}
			} else {
				// 서버 환경에서는 기본값 사용
				this.config = this.getDefaultConfig();
				console.log('서버 환경: 기본 설정 사용');
			}

			// 설정 스토어 업데이트
			configStore.set(this.config);

			console.log(`설정 로드 완료 (환경: ${this.environment})`);
			console.log('최종 API 엔드포인트:', this.config?.api?.endpoints?.company);
		} catch (error) {
			console.error('설정 로드 중 오류 발생:', error);
			this.config = this.getDefaultConfig();
			configStore.set(this.config);
		}
	}

	/**
	 * 로드된 설정을 기본값과 병합
	 */
	private mergeWithDefaults(loadedConfig: any): ApplicationConfig {
		const defaults = this.getDefaultConfig();
		return this.deepMerge(defaults, loadedConfig);
	}

	/**
	 * 깊은 병합 함수
	 */
	private deepMerge(target: any, source: any): any {
		const result = { ...target };

		for (const key in source) {
			if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
				// 객체인 경우 재귀적으로 병합
				result[key] = this.deepMerge(target[key] || {}, source[key]);
			} else if (Array.isArray(source[key])) {
				// 배열인 경우 소스 배열로 완전 교체 (병합하지 않음)
				result[key] = [...source[key]];
			} else {
				// 기본 값인 경우 소스 값으로 교체
				result[key] = source[key];
			}
		}

		return result;
	}

	/**
	 * 기본 설정값 반환
	 */
	private getDefaultConfig(): ApplicationConfig {
		return {
			server: {
				backend: {
					host: 'localhost',
					port: 3000,
					protocol: 'http',
					baseUrl: 'http://localhost:3000'
				},
				socket: {
					host: 'localhost',
					port: 8080,
					protocol: 'ws',
					baseUrl: 'ws://localhost:30090'
				},
				frontend: {
					host: 'localhost',
					port: 5173,
					protocol: 'http',
					baseUrl: 'http://localhost:5173'
				}
			},
			api: {
				endpoints: {
					auth: {
						login: '/api/v0/account/login',
						logout: '/api/v0/account/logout',
						refresh: '/api/v0/account/refresh'
					},
					company: {
						list: '/api/v0/corp/list',
						create: '/api/v0/corp/list',
						add: '/api/v0/corp/add',
						update: '/api/v0/corp/list/:id', // 올바른 엔드포인트로 수정
						delete: '/api/v0/corp/delete'
					},
					file: {
						check: '/api/v0/center/file/chk',
						show: '/api/v0/center/file/show',
						item: '/api/v0/center/file/item'
					},
					data: {
						create: {
							ok: '/api/v0/center/data/create/ok',
							re: '/api/v0/center/data/create/re'
						}
					},
					invoice: {
						list: '/api/v0/invoice/list',
						corp: '/api/v0/invoice/corp',
						save: '/api/v0/invoice/save'
					},
					cam: {
						data: {
							receipts: '/api/v0/cam/data/receipts',
							download: {
								single: '/api/v0/cam/data/download/single',
								multi: '/api/v0/cam/data/download/multi'
							}
						}
					},
					setting: {
						users: '/api/v0/setting/users',
						user: '/api/v0/setting/user',
						userrole: '/api/v0/setting/roles',
						site: '/api/v0/setting/site'
					},
					price: {
						list: '/api/v0/price/list',
						upload: '/api/v0/price/upload',
						search: '/api/v0/price/search',
						type: '/api/v0/price/list/type',
						update: '/api/v0/price/list/:id'
					},
					monitoring: {
						system: '/api/v0/monitoring/system',
						summary: '/api/v0/monitoring/summary',
						cpu: '/api/v0/monitoring/cpu',
						memory: '/api/v0/monitoring/memory',
						disk: '/api/v0/monitoring/disk',
						network: '/api/v0/monitoring/network',
						process: '/api/v0/monitoring/process',
						health: '/api/v0/monitoring/health',
						start: '/api/v0/monitoring/start',
						stop: '/api/v0/monitoring/stop',
						networkDrives: '/api/v0/monitoring/network-drives',
						networkStorageSummary: '/api/v0/monitoring/network-storage-summary'
					}
				}
			},
			socket: {
				channels: {
					camPrint: 'cam/print'
				},
				reconnect: {
					maxAttempts: 5,
					interval: 3000
				},
				timeout: {
					connection: 10000,
					message: 5000
				}
			},
			app: {
				name: 'ToothFairy',
				version: '1.0.0',
				environment: this.environment,
				debug: this.environment === 'dev',
				features: {
					socket: true,
					notifications: true,
					mobile: true
				}
			},
			security: {
				jwt: {
					secret: 'default-jwt-secret',
					expiresIn: '1h',
					refreshExpiresIn: '7d',
					autoRefresh: {
						enabled: true,
						threshold: 10 * 60 * 1000, // 10분 전에 갱신
						backgroundCheck: true,
						activityBased: true,
						activityTimeout: 5 * 60 * 1000 // 5분 동안 활동이 없으면 체크
					}
				},
				cors: {
					origin: ['http://localhost:5173', 'http://localhost:3000'],
					credentials: true
				},
				cookies: {
					accessToken: {
						name: 'access_token',
						httpOnly: true,
						secure: false,
						sameSite: 'lax',
						maxAge: 3600000
					},
					refreshToken: {
						name: 'refresh_token',
						httpOnly: true,
						secure: false,
						sameSite: 'lax',
						maxAge: 604800000
					}
				}
			},
			database: {
				type: 'sqlite',
				host: 'localhost',
				port: 3306,
				name: 'toothfairy_dev',
				username: 'dev_user',
				password: 'dev_password'
			},
			logging: {
				level: 'debug',
				file: 'logs/app-dev.log',
				console: true
			}
		};
	}

	/**
	 * 전체 설정 반환
	 */
	getConfig(): ApplicationConfig | null {
		return this.config;
	}

	/**
	 * 동적 설정 값 가져오기 (점 표기법 지원)
	 * 예: get('server.backend.host') -> 'localhost'
	 * 예: get('api.endpoints.auth.login') -> '/api/v0/account/login'
	 */
	get(path: string): any {
		if (!this.config) return null;

		return path.split('.').reduce((obj, key) => {
			return obj && obj[key] !== undefined ? obj[key] : null;
		}, this.config);
	}

	/**
	 * 동적 설정 값 설정하기 (점 표기법 지원)
	 */
	set(path: string, value: any): void {
		if (!this.config) return;

		const keys = path.split('.');
		const lastKey = keys.pop()!;
		const target = keys.reduce((obj, key) => {
			if (!obj[key]) obj[key] = {};
			return obj[key];
		}, this.config);

		target[lastKey] = value;
		configStore.set(this.config);
	}

	/**
	 * 서버 설정 반환
	 */
	getServerConfig(): BaseConfig['server'] | null {
		return this.config?.server || null;
	}

	/**
	 * 백엔드 서버 URL 반환
	 */
	getBackendUrl(): string {
		return this.get('server.backend.baseUrl') || 'http://localhost:3000';
	}

	/**
	 * 소켓 서버 URL 반환
	 */
	getSocketUrl(): string {
		return this.get('server.socket.baseUrl') || 'ws://localhost:30090';
	}

	/**
	 * API 엔드포인트 반환 (유연한 방식)
	 */
	getApiEndpoint(category: string, endpoint: string): string {
		const endpoints = this.get(`api.endpoints.${category}`);
		if (endpoints && endpoints[endpoint]) {
			return endpoints[endpoint];
		}
		return '';
	}

	/**
	 * 중첩된 API 엔드포인트 반환
	 * 예: getNestedApiEndpoint('cam', 'data.download.single')
	 */
	getNestedApiEndpoint(category: string, path: string): string {
		const endpoints = this.get(`api.endpoints.${category}`);
		if (!endpoints) return '';

		return path.split('.').reduce((obj, key) => {
			return obj && obj[key] !== undefined ? obj[key] : '';
		}, endpoints);
	}

	/**
	 * 소켓 설정 반환
	 */
	getSocketConfig(): any {
		return this.config?.socket || null;
	}

	/**
	 * 앱 설정 반환
	 */
	getAppConfig(): BaseConfig['app'] | null {
		return this.config?.app || null;
	}

	/**
	 * 보안 설정 반환
	 */
	getSecurityConfig(): BaseConfig['security'] | null {
		return this.config?.security || null;
	}

	getCookieConfig(): BaseConfig['security']['cookies'] | null {
		return this.get('security.cookies') || null;
	}

	getAccessTokenCookieConfig(): BaseConfig['security']['cookies']['accessToken'] | null {
		return this.get('security.cookies.accessToken') || null;
	}

	getRefreshTokenCookieConfig(): BaseConfig['security']['cookies']['refreshToken'] | null {
		return this.config?.security?.cookies?.refreshToken || null;
	}

	/**
	 * JWT 자동 갱신 설정 반환
	 */
	getJwtAutoRefreshConfig(): any {
		return this.config?.security?.jwt?.autoRefresh || null;
	}

	/**
	 * JWT 자동 갱신이 활성화되어 있는지 확인
	 */
	isJwtAutoRefreshEnabled(): boolean {
		return this.config?.security?.jwt?.autoRefresh?.enabled === true;
	}

	/**
	 * JWT 토큰 갱신 임계값 반환 (밀리초)
	 */
	getJwtRefreshThreshold(): number {
		return this.config?.security?.jwt?.autoRefresh?.threshold || 10 * 60 * 1000; // 기본값: 10분
	}

	/**
	 * 사용자 활동 기반 토큰 갱신이 활성화되어 있는지 확인
	 */
	isActivityBasedRefreshEnabled(): boolean {
		return this.config?.security?.jwt?.autoRefresh?.activityBased === true;
	}

	/**
	 * 사용자 활동 타임아웃 반환 (밀리초)
	 */
	getActivityTimeout(): number {
		return this.config?.security?.jwt?.autoRefresh?.activityTimeout || 5 * 60 * 1000; // 기본값: 5분
	}

	/**
	 * 데이터베이스 설정 반환
	 */
	getDatabaseConfig(): any {
		return this.config?.database || null;
	}

	/**
	 * 로깅 설정 반환
	 */
	getLoggingConfig(): any {
		return this.config?.logging || null;
	}

	/**
	 * 현재 환경 반환
	 */
	getEnvironment(): string {
		return this.environment;
	}

	/**
	 * 디버그 모드 여부 반환
	 */
	isDebug(): boolean {
		return this.get('app.debug') || false;
	}

	/**
	 * 특정 기능 활성화 여부 반환
	 */
	isFeatureEnabled(feature: string): boolean {
		return this.get(`app.features.${feature}`) || false;
	}

	/**
	 * 설정 리로드
	 */
	async reloadConfig(): Promise<void> {
		await this.loadConfig();
	}

	/**
	 * 설정 유효성 검사
	 */
	validateConfig(): { isValid: boolean; errors: string[] } {
		const errors: string[] = [];

		if (!this.config) {
			errors.push('설정이 로드되지 않았습니다.');
			return { isValid: false, errors };
		}

		// 필수 설정 검사
		const requiredPaths = [
			'server.backend.baseUrl',
			'server.socket.baseUrl',
			'app.name',
			'app.environment',
			'security.jwt.secret'
		];

		requiredPaths.forEach((path) => {
			if (!this.get(path)) {
				errors.push(`필수 설정이 누락되었습니다: ${path}`);
			}
		});

		return {
			isValid: errors.length === 0,
			errors
		};
	}

	/**
	 * 설정이 로드되었는지 확인
	 */
	isConfigLoaded(): boolean {
		return this.config !== null;
	}

	/**
	 * 설정 로딩 대기
	 */
	async waitForConfig(maxWaitTime: number = 5000): Promise<boolean> {
		const startTime = Date.now();
		console.log('설정 로딩 대기 시작...');

		while (Date.now() - startTime < maxWaitTime) {
			if (this.config !== null) {
				console.log('설정 로딩 완료 (대기 시간:', Date.now() - startTime, 'ms)');
				return true;
			}
			await new Promise((resolve) => setTimeout(resolve, 100));
		}

		console.warn('설정 로딩 대기 시간 초과:', maxWaitTime, 'ms');
		return false;
	}
}

// 싱글톤 인스턴스 생성
export const configService = new ConfigService();

// 편의 함수들
export const getBackendUrl = () => configService.getBackendUrl();
export const getSocketUrl = () => configService.getSocketUrl();
export const getApiEndpoint = (category: string, endpoint: string) =>
	configService.getApiEndpoint(category, endpoint);
export const getNestedApiEndpoint = (category: string, path: string) =>
	configService.getNestedApiEndpoint(category, path);
export const isDebug = () => configService.isDebug();
export const isFeatureEnabled = (feature: string) => configService.isFeatureEnabled(feature);
export const getConfig = (path: string) => configService.get(path);
export const setConfig = (path: string, value: any) => configService.set(path, value);
