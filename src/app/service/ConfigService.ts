import { writable } from 'svelte/store';

// 설정 타입 정의
export interface ServerConfig {
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
}

export interface ApiConfig {
	endpoints: {
		auth: {
			login: string;
			logout: string;
			refresh: string;
		};
		company: {
			list: string;
			add: string;
			update: string;
			delete: string;
		};
		file: {
			check: string;
			show: string;
			item: string;
		};
		invoice: {
			list: string;
			corp: string;
		};
		cam: {
			data: {
				receipts: string;
				download: {
					single: string;
					multi: string;
				};
			};
		};
	};
}

export interface SocketConfig {
	channels: {
		camPrint: string;
	};
	reconnect: {
		maxAttempts: number;
		interval: number;
	};
	timeout: {
		connection: number;
		message: number;
	};
}

export interface AppConfig {
	name: string;
	version: string;
	environment: string;
	debug: boolean;
	features: {
		socket: boolean;
		notifications: boolean;
		mobile: boolean;
	};
}

export interface SecurityConfig {
	jwt: {
		secret: string;
		expiresIn: string;
		refreshExpiresIn: string;
	};
	cors: {
		origin: string[];
		credentials: boolean;
	};
	cookies: {
		accessToken: {
			name: string;
			httpOnly: boolean;
			secure: boolean;
			sameSite: string;
			maxAge: number;
		};
		refreshToken: {
			name: string;
			httpOnly: boolean;
			secure: boolean;
			sameSite: string;
			maxAge: number;
		};
	};
}

export interface DatabaseConfig {
	type: string;
	host: string;
	port: number;
	name: string;
	username: string;
	password: string;
}

export interface LoggingConfig {
	level: string;
	file: string;
	console: boolean;
}

export interface ApplicationConfig {
	server: ServerConfig;
	api: ApiConfig;
	socket: SocketConfig;
	app: AppConfig;
	security: SecurityConfig;
	database: DatabaseConfig;
	logging: LoggingConfig;
}

// 설정 스토어
export const configStore = writable<ApplicationConfig | null>(null);

class ConfigService {
	private config: ApplicationConfig | null = null;
	private environment: string = 'dev';

	constructor() {
		this.loadConfig();
	}

	/**
	 * 환경에 따른 설정 파일 로드
	 */
	private async loadConfig(): Promise<void> {
		try {
			// 환경 변수에서 환경 설정 가져오기
			this.environment = import.meta.env.VITE_APP_ENV || 'dev';

			// 브라우저 환경에서는 동적으로 설정 파일 로드
			if (typeof window !== 'undefined') {
				const configPath = `/src/app/config/application.${this.environment}.json`;

				try {
					const response = await fetch(configPath);
					if (response.ok) {
						this.config = await response.json();
					} else {
						// 설정 파일을 찾을 수 없는 경우 기본값 사용
						this.config = this.getDefaultConfig();
					}
				} catch (error) {
					console.warn('설정 파일 로드 실패, 기본값 사용:', error);
					this.config = this.getDefaultConfig();
				}
			} else {
				// 서버 환경에서는 기본값 사용
				this.config = this.getDefaultConfig();
			}

			// 설정 스토어 업데이트
			configStore.set(this.config);

			console.log(`설정 로드 완료 (환경: ${this.environment})`);
		} catch (error) {
			console.error('설정 로드 중 오류 발생:', error);
			this.config = this.getDefaultConfig();
			configStore.set(this.config);
		}
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
						add: '/api/v0/corp/add',
						update: '/api/v0/corp/update',
						delete: '/api/v0/corp/delete'
					},
					file: {
						check: '/api/v0/file/chk',
						show: '/api/v0/file/show',
						item: '/api/v0/file/item'
					},
					invoice: {
						list: '/api/v0/invoice/list',
						corp: '/api/v0/invoice/corp'
					},
					cam: {
						data: {
							receipts: '/api/v0/cam/data/receipts',
							download: {
								single: '/api/v0/cam/data/download/single',
								multi: '/api/v0/cam/data/download/multi'
							}
						}
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
					refreshExpiresIn: '7d'
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
	 * 서버 설정 반환
	 */
	getServerConfig(): ServerConfig | null {
		return this.config?.server || null;
	}

	/**
	 * 백엔드 서버 URL 반환
	 */
	getBackendUrl(): string {
		return this.config?.server.backend.baseUrl || 'http://localhost:3000';
	}

	/**
	 * 소켓 서버 URL 반환
	 */
	getSocketUrl(): string {
		return this.config?.server.socket.baseUrl || 'ws://localhost:30090';
	}

	/**
	 * API 엔드포인트 반환
	 */
	getApiEndpoint(category: keyof ApiConfig['endpoints'], endpoint: string): string {
		const endpoints = this.config?.api.endpoints;
		if (
			endpoints &&
			endpoints[category] &&
			endpoints[category][endpoint as keyof (typeof endpoints)[typeof category]]
		) {
			return endpoints[category][endpoint as keyof (typeof endpoints)[typeof category]];
		}
		return '';
	}

	/**
	 * 소켓 설정 반환
	 */
	getSocketConfig(): SocketConfig | null {
		return this.config?.socket || null;
	}

	/**
	 * 앱 설정 반환
	 */
	getAppConfig(): AppConfig | null {
		return this.config?.app || null;
	}

	/**
	 * 보안 설정 반환
	 */
	getSecurityConfig(): SecurityConfig | null {
		return this.config?.security || null;
	}

	getCookieConfig(): SecurityConfig['cookies'] | null {
		return this.config?.security?.cookies || null;
	}

	getAccessTokenCookieConfig(): SecurityConfig['cookies']['accessToken'] | null {
		return this.config?.security?.cookies?.accessToken || null;
	}

	getRefreshTokenCookieConfig(): SecurityConfig['cookies']['refreshToken'] | null {
		return this.config?.security?.cookies?.refreshToken || null;
	}

	/**
	 * 데이터베이스 설정 반환
	 */
	getDatabaseConfig(): DatabaseConfig | null {
		return this.config?.database || null;
	}

	/**
	 * 로깅 설정 반환
	 */
	getLoggingConfig(): LoggingConfig | null {
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
		return this.config?.app.debug || false;
	}

	/**
	 * 특정 기능 활성화 여부 반환
	 */
	isFeatureEnabled(feature: keyof AppConfig['features']): boolean {
		return this.config?.app.features[feature] || false;
	}

	/**
	 * 설정 리로드
	 */
	async reloadConfig(): Promise<void> {
		await this.loadConfig();
	}
}

// 싱글톤 인스턴스 생성
export const configService = new ConfigService();

// 편의 함수들
export const getBackendUrl = () => configService.getBackendUrl();
export const getSocketUrl = () => configService.getSocketUrl();
export const getApiEndpoint = (category: keyof ApiConfig['endpoints'], endpoint: string) =>
	configService.getApiEndpoint(category, endpoint);
export const isDebug = () => configService.isDebug();
export const isFeatureEnabled = (feature: keyof AppConfig['features']) =>
	configService.isFeatureEnabled(feature);
