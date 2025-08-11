import { writable, type Writable } from 'svelte/store';
import { configService } from './ConfigService';
import { authService } from './AuthService';

// 시스템 정보 타입 정의
export interface SystemInfo {
	timestamp: number;
	cpu: {
		usage: number;
		cores: number;
		model: string;
	};
	memory: {
		total: number;
		used: number;
		free: number;
		usage: number;
	};
	disk: {
		total: number;
		used: number;
		free: number;
		usage: number;
	};
	network: {
		uploadSpeed: number;
		downloadSpeed: number;
		connections: number;
	};
	networkDrives?: {
		path: string;
		name: string;
		total: number;
		used: number;
		free: number;
		usage: number;
		available: boolean;
		lastChecked: number;
	}[];
	process: {
		pid: number;
		uptime: number;
		memoryUsage: {
			rss: number;
			heapTotal: number;
			heapUsed: number;
			external: number;
		};
	};
	system: {
		platform: string;
		arch: string;
		hostname: string;
		uptime: number;
		loadAverage: number[];
	};
}

// Socket.IO 클라이언트 타입 정의
interface MonitoringSocket {
	connect(): void;
	disconnect(): void;
	on(event: string, callback: (data: any) => void): void;
	off(event: string, callback?: (data: any) => void): void;
	emit(event: string, data?: any): void;
	connected: boolean;
}

// 상태 스토어
export const systemInfo = writable<SystemInfo | null>(null);
export const isMonitoringConnected = writable(false);
export const monitoringError = writable<string | null>(null);
export const isMonitoringActive = writable(false);

class SystemMonitoringService {
	private socket: MonitoringSocket | null = null;
	private monitoringInterval: number = 5000; // 5초 간격
	private reconnectAttempts = 0;
	private maxReconnectAttempts = 5;

	constructor() {
		// 브라우저 환경에서만 초기화
		if (typeof window !== 'undefined') {
			this.initialize();
		}
	}

	private async initialize() {
		try {
			// Socket.IO 동적 임포트
			const { io } = await import('socket.io-client');

			// 모니터링 전용 소켓은 3000 포트로 고정
			const socketUrl = this.getMonitoringBackendUrl();
			const token = await authService.getJwtToken();

			console.log('🔌 시스템 모니터링 소켓 초기화:', socketUrl);
			console.log('🔑 JWT 토큰:', token ? '토큰 있음' : '토큰 없음');

			this.socket = io(socketUrl, {
				path: '/socket.io',
				auth: {
					token
				},
				autoConnect: false,
				forceNew: true, // 새로운 연결 강제
				reconnection: true,
				reconnectionAttempts: 5,
				reconnectionDelay: 2000,
				timeout: 10000,
				transports: ['websocket', 'polling']
			}) as MonitoringSocket;

			this.setupEventHandlers();
		} catch (error) {
			console.error('❌ 시스템 모니터링 소켓 초기화 실패:', error);
			monitoringError.set('소켓 초기화에 실패했습니다.');
		}
	}

	private setupEventHandlers() {
		if (!this.socket) return;

		// 연결 성공
		this.socket.on('connect', () => {
			console.log('✅ 시스템 모니터링 소켓 연결 성공');
			console.log('📡 연결된 소켓 ID:', (this.socket as any)?.id);
			console.log('🔗 연결된 URL:', this.getMonitoringBackendUrl());
			isMonitoringConnected.set(true);
			monitoringError.set(null);
			this.reconnectAttempts = 0;
		});

		// 연결 해제
		this.socket.on('disconnect', (reason) => {
			console.log('❌ 시스템 모니터링 소켓 연결 해제:', reason);
			console.log('🔄 자동 재연결 시도 중...');
			isMonitoringConnected.set(false);
			isMonitoringActive.set(false);
		});

		// 연결 오류
		this.socket.on('connect_error', (error) => {
			console.error('❌ 시스템 모니터링 소켓 연결 오류:', error);
			console.error('🔗 시도한 URL:', this.getMonitoringBackendUrl());
			console.error('⚠️ 에러 상세:', error.message);

			this.reconnectAttempts++;
			console.log(`🔄 재연결 시도 횟수: ${this.reconnectAttempts}/5`);

			if (this.reconnectAttempts >= 5) {
				monitoringError.set('모니터링 서버에 연결할 수 없습니다. (최대 재시도 초과)');
			} else {
				monitoringError.set(`모니터링 서버 연결 시도 중... (${this.reconnectAttempts}/5)`);
			}

			isMonitoringConnected.set(false);
		});

		// 시스템 정보 수신
		this.socket.on('system-info', (data: SystemInfo) => {
			console.log('📊 시스템 정보 수신:', data);
			systemInfo.set(data);
		});

		// CPU 정보 수신
		this.socket.on('cpu-info', (data) => {
			systemInfo.update((current) => {
				if (current) {
					return { ...current, cpu: data.cpu };
				}
				return current;
			});
		});

		// 메모리 정보 수신
		this.socket.on('memory-info', (data) => {
			systemInfo.update((current) => {
				if (current) {
					return { ...current, memory: data.memory };
				}
				return current;
			});
		});

		// 디스크 정보 수신
		this.socket.on('disk-info', (data) => {
			systemInfo.update((current) => {
				if (current) {
					return { ...current, disk: data.disk };
				}
				return current;
			});
		});

		// 네트워크 정보 수신
		this.socket.on('network-info', (data) => {
			systemInfo.update((current) => {
				if (current) {
					return { ...current, network: data.network };
				}
				return current;
			});
		});

		// 네트워크 드라이브 정보 수신
		this.socket.on('network-drives-info', (data) => {
			console.log('📁 네트워크 드라이브 정보 수신:', data);
			systemInfo.update((current) => {
				if (current) {
					return { ...current, networkDrives: data.networkDrives };
				}
				return current;
			});
		});
	}

	// 모니터링 연결
	async connect(): Promise<void> {
		if (!this.socket) {
			await this.initialize();
		}

		if (this.socket && !this.socket.connected) {
			console.log('🔌 시스템 모니터링 소켓 연결 시도');
			this.socket.connect();
		}
	}

	// 모니터링 연결 해제
	disconnect(): void {
		if (this.socket?.connected) {
			console.log('🔌 시스템 모니터링 소켓 연결 해제');
			this.socket.disconnect();
		}
		isMonitoringConnected.set(false);
		isMonitoringActive.set(false);
	}

	// 모니터링 시작
	startMonitoring(interval: number = 5000): void {
		if (!this.socket?.connected) {
			console.warn('⚠️ 소켓이 연결되지 않아 모니터링을 시작할 수 없습니다.');
			return;
		}

		this.monitoringInterval = interval;
		console.log(`📊 시스템 모니터링 시작 (${interval}ms 간격)`);

		this.socket.emit('start-monitoring', { interval });
		isMonitoringActive.set(true);
	}

	// 모니터링 중지
	stopMonitoring(): void {
		if (!this.socket?.connected) {
			console.warn('⚠️ 소켓이 연결되지 않아 모니터링을 중지할 수 없습니다.');
			return;
		}

		console.log('⏹️ 시스템 모니터링 중지');
		this.socket.emit('stop-monitoring');
		isMonitoringActive.set(false);
	}

	// 수동 시스템 정보 요청
	requestSystemInfo(): void {
		if (!this.socket?.connected) {
			console.warn('⚠️ 소켓이 연결되지 않아 시스템 정보를 요청할 수 없습니다.');
			return;
		}

		console.log('📊 시스템 정보 수동 요청');
		this.socket.emit('request-system-info');
	}

	// 개별 리소스 정보 요청
	requestCpuInfo(): void {
		if (this.socket?.connected) {
			this.socket.emit('request-cpu-info');
		}
	}

	requestMemoryInfo(): void {
		if (this.socket?.connected) {
			this.socket.emit('request-memory-info');
		}
	}

	requestDiskInfo(): void {
		if (this.socket?.connected) {
			this.socket.emit('request-disk-info');
		}
	}

	requestNetworkInfo(): void {
		if (this.socket?.connected) {
			this.socket.emit('request-network-info');
		}
	}

	requestNetworkDrivesInfo(): void {
		if (this.socket?.connected) {
			this.socket.emit('request-network-drives-info');
		}
	}

	// 모니터링 전용 백엔드 URL (포트 3000 고정)
	private getMonitoringBackendUrl(): string {
		const baseUrl = configService.getBackendUrl();
		console.log('📡 ConfigService에서 가져온 baseUrl:', baseUrl);

		if (!baseUrl) {
			console.log('⚠️ baseUrl이 없어서 localhost:3000 사용');
			return 'http://localhost:3000';
		}

		try {
			// 기존 URL의 포트를 3000으로 변경
			const url = new URL(baseUrl);
			const originalPort = url.port;
			url.port = '3000';

			console.log(`🔄 포트 변경: ${originalPort} → 3000`);
			console.log('🔌 최종 모니터링 URL:', url.toString());

			return url.toString();
		} catch (error) {
			console.error('❌ URL 파싱 실패:', error);
			console.log('🔄 localhost:3000으로 폴백');
			return 'http://localhost:3000';
		}
	}

	// REST API를 통한 시스템 정보 조회
	async fetchSystemInfo(): Promise<SystemInfo | null> {
		try {
			const backendUrl = this.getMonitoringBackendUrl();
			const token = await authService.getJwtToken();

			const response = await fetch(`${backendUrl}api/v0/monitoring/system`, {
				method: 'GET',
				headers: {
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json'
				}
			});

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			const result = await response.json();

			if (result.resultCode === 200 && result.data) {
				systemInfo.set(result.data);
				return result.data;
			} else {
				throw new Error('시스템 정보를 가져올 수 없습니다.');
			}
		} catch (error) {
			console.error('❌ 시스템 정보 조회 실패:', error);
			monitoringError.set(error instanceof Error ? error.message : '시스템 정보 조회 실패');
			return null;
		}
	}

	// 네트워크 드라이브 정보 조회
	async fetchNetworkDrives(): Promise<any> {
		try {
			const backendUrl = this.getMonitoringBackendUrl();
			const token = await authService.getJwtToken();

			const response = await fetch(`${backendUrl}api/v0/monitoring/network-drives`, {
				method: 'GET',
				headers: {
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json'
				}
			});

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			const result = await response.json();

			if (result.resultCode === 200 && result.data) {
				// 네트워크 드라이브 정보를 시스템 정보에 업데이트
				systemInfo.update((current) => {
					if (current) {
						return { ...current, networkDrives: result.data.networkDrives };
					}
					return current;
				});
				return result.data;
			} else {
				throw new Error('네트워크 드라이브 정보를 가져올 수 없습니다.');
			}
		} catch (error) {
			console.error('❌ 네트워크 드라이브 정보 조회 실패:', error);
			monitoringError.set(error instanceof Error ? error.message : '네트워크 드라이브 조회 실패');
			return null;
		}
	}

	// 네트워크 스토리지 요약 정보 조회
	async fetchNetworkStorageSummary(): Promise<any> {
		try {
			const backendUrl = this.getMonitoringBackendUrl();
			const token = await authService.getJwtToken();

			const response = await fetch(`${backendUrl}api/v0/monitoring/network-storage-summary`, {
				method: 'GET',
				headers: {
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json'
				}
			});

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			const result = await response.json();

			if (result.resultCode === 200 && result.data) {
				return result.data;
			} else {
				throw new Error('네트워크 스토리지 요약 정보를 가져올 수 없습니다.');
			}
		} catch (error) {
			console.error('❌ 네트워크 스토리지 요약 정보 조회 실패:', error);
			monitoringError.set(
				error instanceof Error ? error.message : '네트워크 스토리지 요약 조회 실패'
			);
			return null;
		}
	}

	// 헬스체크
	async checkHealth(): Promise<boolean> {
		try {
			const backendUrl = this.getMonitoringBackendUrl();
			const token = await authService.getJwtToken();

			const response = await fetch(`${backendUrl}api/v0/monitoring/health`, {
				method: 'GET',
				headers: {
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json'
				}
			});

			return response.ok;
		} catch (error) {
			console.error('❌ 헬스체크 실패:', error);
			return false;
		}
	}

	// 연결 상태 확인
	isConnected(): boolean {
		return this.socket?.connected || false;
	}

	// 모니터링 간격 설정
	setMonitoringInterval(interval: number): void {
		this.monitoringInterval = interval;
		if (this.socket?.connected) {
			this.socket.emit('start-monitoring', { interval });
		}
	}

	// 현재 모니터링 간격 조회
	getMonitoringInterval(): number {
		return this.monitoringInterval;
	}
}

// 싱글톤 인스턴스
export const systemMonitoringService = new SystemMonitoringService();

// 유틸리티 함수들
export function formatBytes(bytes: number): string {
	if (bytes === 0) return '0 B';

	const k = 1024;
	const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));

	// 크기에 따라 소수점 자릿수 조정
	let decimals = 2;
	if (i === 0)
		decimals = 0; // Bytes는 소수점 없음
	else if (i === 1)
		decimals = 0; // KB도 소수점 없음
	else if (i >= 4) decimals = 3; // TB 이상은 3자리

	const value = bytes / Math.pow(k, i);
	return value.toFixed(decimals) + ' ' + sizes[i];
}

// 디스크 용량 전용 포맷터 (기가바이트 고정)
export function formatDiskSize(bytes: number): string {
	if (bytes === 0) return '0 GB';

	const gb = bytes / (1024 * 1024 * 1024);

	// 1GB 미만은 소수점 3자리, 1GB 이상은 소수점 2자리
	if (gb < 1) {
		return gb.toFixed(3) + ' GB';
	} else if (gb < 10) {
		return gb.toFixed(2) + ' GB';
	} else {
		return gb.toFixed(1) + ' GB';
	}
}

export function formatUptime(seconds: number): string {
	const days = Math.floor(seconds / (24 * 3600));
	const hours = Math.floor((seconds % (24 * 3600)) / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);

	if (days > 0) {
		return `${days}일 ${hours}시간 ${minutes}분`;
	} else if (hours > 0) {
		return `${hours}시간 ${minutes}분`;
	} else {
		return `${minutes}분`;
	}
}

export function getUsageColor(usage: number): string {
	if (usage >= 90) return 'bg-red-500';
	if (usage >= 70) return 'bg-orange-500';
	if (usage >= 50) return 'bg-yellow-500';
	return 'bg-green-500';
}

export function getUsageTextColor(usage: number): string {
	if (usage >= 90) return 'text-red-600';
	if (usage >= 70) return 'text-orange-600';
	if (usage >= 50) return 'text-yellow-600';
	return 'text-green-600';
}
