import { writable } from 'svelte/store';
import { configService, getSocketUrl } from './ConfigService';
import { fetchCamPrintListFromApi } from './CamDataService';
import { authService } from './AuthService';

// Socket.IO 클라이언트 타입 정의
interface SocketIOClient {
	connect(): void;
	disconnect(): void;
	on(event: string, callback: (data: any) => void): void;
	emit(event: string, data: any): void;
	connected: boolean;
}

// CAM 소켓 연결 상태 관리
export const camSocketConnected = writable(false);
export const camSocketError = writable<string | null>(null);

// CAM 실시간 데이터 스토어
export const camPrintStatusData = writable<any[]>([]);
export const camPrintProgressData = writable<any>({});

// 폴더 모니터링 상태 스토어
export const folderMonitorStatus = writable<{
	urgent: boolean;
	normal: boolean;
}>({
	urgent: false,
	normal: false
});

// 폴더 모니터링 알림 스토어
export const folderMonitorNotification = writable<string | null>(null);

class CamSocketService {
	private socket: SocketIOClient | null = null;
	private reconnectAttempts = 0;
	private maxReconnectAttempts = 5;
	private reconnectInterval = 3000; // 3초

	constructor() {
		// 브라우저 환경에서만 초기화
		if (typeof window !== 'undefined') {
			this.initializeSocket();
		}
	}

	private async initializeSocket() {
		try {
			// Socket.IO 클라이언트 동적 import
			const { io } = await import('socket.io-client');

			// ConfigService에서 소켓 서버 주소 가져오기
			const socketConfig = configService.getSocketConfig();
			const socketUrl = getSocketUrl();

			console.log('🔌 CAM 소켓 초기화 시작');

			// 설정에서 재연결 설정 가져오기
			if (socketConfig) {
				this.maxReconnectAttempts = socketConfig.reconnect.maxAttempts;
				this.reconnectInterval = socketConfig.reconnect.interval;
			}

			// JWT 토큰 가져오기
			const jwtToken = await authService.getJwtToken();
			console.log('🔐 소켓 연결 시 사용하는 JWT 토큰:', jwtToken);

			// Socket.IO 클라이언트 생성 (JWT 토큰을 auth로 전송)
			this.socket = io(socketUrl, {
				transports: ['websocket', 'polling'],
				withCredentials: true, // 쿠키도 함께 전송
				reconnection: true, // 재연결 활성화
				reconnectionAttempts: this.maxReconnectAttempts,
				reconnectionDelay: this.reconnectInterval,
				reconnectionDelayMax: 10000, // 최대 재연결 지연 10초
				timeout: 20000,
				forceNew: true, // 새로운 연결 강제 생성
				auth: {
					token: jwtToken // JWT 토큰을 auth 객체로 전송
				}
			});

			this.setupSocketEventHandlers();
		} catch (error) {
			console.error('❌ CAM 소켓 초기화 오류:', error);
			camSocketError.set('CAM 소켓 초기화에 실패했습니다.');
		}
	}

	private setupSocketEventHandlers() {
		if (!this.socket) return;

		// 연결 성공
		this.socket.on('connect', () => {
			console.log('✅ CAM Socket.IO 서버에 연결되었습니다.');
			camSocketConnected.set(true);
			camSocketError.set(null);
			this.reconnectAttempts = 0;

			// 연결 후 cam/print 구독 요청
			this.subscribeToCamPrint();
		});

		// 연결 해제
		this.socket.on('disconnect', (reason) => {
			console.log('❌ CAM Socket.IO 연결이 종료되었습니다:', reason);
			camSocketConnected.set(false);

			// 재연결 시도 여부 확인
			if (reason === 'io server disconnect') {
				// 서버에서 의도적으로 연결을 끊은 경우
				this.attemptReconnect();
			}
		});

		// 연결 오류
		this.socket.on('connect_error', (error) => {
			console.error('❌ CAM Socket.IO 연결 오류:', error);

			// 연결 시도 중 401 에러인지 확인
			if (
				error.message?.includes('401') ||
				error.message?.includes('Unauthorized') ||
				error.message?.includes('인증이 필요합니다') ||
				error.data?.status === 401 ||
				error.data?.code === 401
			) {
				console.log('🔐 연결 시도 중 401 인증 에러 감지 - JWT 토큰 재갱신 시도');
				this.handleAuthError();
			} else {
				camSocketError.set('CAM Socket.IO 연결에 실패했습니다.');
				camSocketConnected.set(false);
			}
		});

		// 재연결 시도
		this.socket.on('reconnect_attempt', (attemptNumber) => {
			camSocketError.set(
				`CAM 소켓 재연결 시도 중... (${attemptNumber}/${this.maxReconnectAttempts})`
			);
		});

		// 재연결 성공
		this.socket.on('reconnect', (attemptNumber) => {
			console.log(`✅ CAM 소켓 재연결 성공 (시도 ${attemptNumber}회)`);
			camSocketConnected.set(true);
			camSocketError.set(null);
			this.reconnectAttempts = 0;

			// 재연결 후 구독 복원
			this.subscribeToCamPrint();
		});

		// 재연결 실패
		this.socket.on('reconnect_failed', () => {
			console.log('❌ CAM 소켓 재연결 실패 - 최대 시도 횟수 초과');
			camSocketError.set('CAM 소켓 재연결에 실패했습니다. 페이지를 새로고침해주세요.');
			camSocketConnected.set(false);
		});

		// CAM 출력물 상태 업데이트
		this.socket.on('cam/print/status', (data) => {
			camPrintStatusData.set(data);
		});

		// CAM 출력물 진행률 업데이트
		this.socket.on('cam/print/progress', (data) => {
			camPrintProgressData.set(data);
		});

		// CAM 출력물 알림
		this.socket.on('cam/print/notification', (data) => {
			this.handleNotification(data);
		});

		// 일반 메시지
		this.socket.on('message', (data) => {
			console.log('💬 CAM Socket.IO 메시지:', data);
		});

		// 에러 메시지
		this.socket.on('error', (error) => {
			console.error('❌ CAM Socket.IO 에러:', error);

			// 소켓 서버에서 보내는 401 에러 처리
			if (
				error.message?.includes('401') ||
				error.data?.status === 401 ||
				error.data?.code === 401 ||
				error.message?.includes('Unauthorized') ||
				error.message?.includes('인증이 필요합니다')
			) {
				console.log('🔐 401 인증 에러 감지 - JWT 토큰 재갱신 시도');
				this.handleAuthError();
			} else {
				camSocketError.set(`CAM Socket.IO 에러: ${error.message}`);
			}
		});

		// 인증 실패 이벤트 (서버에서 보내는 auth-error)
		this.socket.on('auth-error', (data) => {
			console.log('🔐 인증 실패 이벤트 수신:', data);
			this.handleAuthError();
		});

		// 기존 auth_error 이벤트도 유지 (호환성)
		this.socket.on('auth_error', (data) => {
			console.log('🔐 인증 실패 이벤트 수신:', data);
			this.handleAuthError();
		});

		// 토큰 만료 이벤트
		this.socket.on('token_expired', (data) => {
			console.log('🔐 토큰 만료 이벤트 수신:', data);
			this.handleAuthError();
		});

		// 소켓 서버에서 보내는 인증 실패 응답 처리
		this.socket.on('unauthorized', (data) => {
			console.log('🔐 인증되지 않음 이벤트 수신:', data);
			this.handleAuthError();
		});

		// 소켓 서버에서 보내는 에러 응답 처리
		this.socket.on('server_error', (data) => {
			// 401 에러인지 확인
			if (
				data.status === 401 ||
				data.code === 401 ||
				data.message?.includes('인증이 필요합니다') ||
				data.message?.includes('Unauthorized')
			) {
				console.log('🔐 서버에서 401 에러 감지 - JWT 토큰 재갱신 시도');
				this.handleAuthError();
			} else {
				camSocketError.set(`서버 에러: ${data.message || '알 수 없는 오류'}`);
			}
		});

		// 소켓 서버에서 보내는 응답 처리 (일반적인 응답 형태)
		this.socket.on('response', (data) => {
			// 응답에서 401 에러인지 확인
			if (
				data.status === 'error' &&
				(data.message?.includes('인증이 필요합니다') ||
					data.code === 401 ||
					data.statusCode === 401)
			) {
				console.log('🔐 응답에서 401 에러 감지 - JWT 토큰 재갱신 시도');
				this.handleAuthError();
			}
		});

		// 통합 폴더 모니터링 시작 알림
		this.socket.on('unified-monitor-started', (data) => {
			console.log('🟢 통합 폴더 모니터링 시작 알림:', data);
			folderMonitorNotification.set(data.message || '통합 폴더 모니터링이 시작되었습니다.');

			// 통합 모니터링이므로 모든 폴더 상태를 true로 설정
			folderMonitorStatus.update((status) => {
				const updated = { ...status };
				Object.keys(updated).forEach((key) => {
					updated[key as keyof typeof updated] = true;
				});
				return updated;
			});

			// 최신 리스트 요청
			this.refreshPrintListFromDB();
		});

		// 통합 폴더 모니터링 중지 알림
		this.socket.on('unified-monitor-stopped', (data) => {
			console.log('⏹️ 통합 폴더 모니터링 중지 알림:', data);
			folderMonitorNotification.set(data.message || '통합 폴더 모니터링이 중지되었습니다.');

			// 통합 모니터링이므로 모든 폴더 상태를 false로 설정
			folderMonitorStatus.update((status) => {
				const updated = { ...status };
				Object.keys(updated).forEach((key) => {
					updated[key as keyof typeof updated] = false;
				});
				return updated;
			});
		});

		// 개별 폴더 모니터링 시작 알림
		this.socket.on('folder-monitor-started', (data) => {
			console.log('🟢 개별 폴더 모니터링 시작 알림:', data);
			folderMonitorNotification.set(data.message || '폴더 모니터링이 시작되었습니다.');

			// 개별 폴더 모니터링
			if (data.folderType === 'urgent' || data.folderType === 'normal') {
				folderMonitorStatus.update((status) => ({
					...status,
					[data.folderType]: true
				}));
			}

			// 최신 리스트 요청
			this.refreshPrintListFromDB();
		});

		// 개별 폴더 모니터링 중지 알림
		this.socket.on('folder-monitor-stopped', (data) => {
			console.log('⏹️ 개별 폴더 모니터링 중지 알림:', data);
			folderMonitorNotification.set(data.message || '폴더 모니터링이 중지되었습니다.');

			// 개별 폴더 모니터링
			if (data.folderType === 'urgent' || data.folderType === 'normal') {
				folderMonitorStatus.update((status) => ({
					...status,
					[data.folderType]: false
				}));
			}
		});

		// 폴더 변경 감지 알림
		this.socket.on('folder-changed', (data) => {
			console.log('📁 [소켓] folder-changed 이벤트 수신:', data);
			folderMonitorNotification.set(`폴더 변경이 감지되었습니다: ${data.folderType}`);
			console.log('📁 [소켓] refreshPrintListFromDB 호출');
			this.refreshPrintListFromDB();
		});
	}

	private attemptReconnect() {
		if (this.reconnectAttempts >= this.maxReconnectAttempts) {
			console.log('❌ 최대 재연결 시도 횟수 초과');
			camSocketError.set('최대 재연결 시도 횟수를 초과했습니다.');
			return;
		}

		this.reconnectAttempts++;

		// 지연 후 재연결 시도
		setTimeout(() => {
			if (this.socket) {
				this.socket.connect();
			}
		}, this.reconnectInterval);
	}

	private subscribeToCamPrint() {
		if (this.socket?.connected) {
			const socketConfig = configService.getSocketConfig();
			const channel = socketConfig?.channels.camPrint || 'cam/print';

			const subscribeData = {
				channel: channel,
				data: {
					action: 'subscribe'
				}
			};

			this.socket.emit('subscribe', subscribeData);
		} else {
			console.warn('⚠️ 소켓이 연결되지 않아 구독 요청을 보낼 수 없습니다.');
		}
	}

	private handleNotification(notification: any) {
		// 브라우저 알림 또는 토스트 메시지 표시
		if (Notification.permission === 'granted') {
			new Notification('CAM 출력물 알림', {
				body: notification.message,
				icon: '/favicon.png'
			});
		}

		// 토스트 메시지로도 표시 (ToastService가 있다면)
		if (typeof window !== 'undefined' && (window as any).toastStore) {
			(window as any).toastStore.info(notification.message);
		}
	}

	// 인증 에러 처리 (JWT 토큰 재갱신)
	private async handleAuthError() {
		console.log('🔐 JWT 토큰 재갱신 프로세스 시작');

		try {
			// 현재 소켓 연결 해제
			if (this.socket?.connected) {
				this.socket.disconnect();
			}

			// JWT 토큰 재갱신 시도
			const newToken = await authService.refreshJwtToken();

			if (newToken) {
				console.log('✅ JWT 토큰 재갱신 성공 - 소켓 재연결 시도');
				camSocketError.set('토큰이 재갱신되었습니다. 재연결을 시도합니다.');

				// 새로운 토큰으로 소켓 재초기화
				await this.reinitializeSocketWithNewToken(newToken);

				// 재연결 후 폴더 모니터링 재시작
				setTimeout(() => {
					if (this.socket?.connected) {
						this.socket.emit('start-folder-monitor', { folderType: 'urgent' });
						this.socket.emit('start-folder-monitor', { folderType: 'normal' });
					}
				}, 1000);
			} else {
				console.log('❌ JWT 토큰 재갱신 실패 - 로그인 페이지로 리다이렉트 기능 임시 비활성화');
				camSocketError.set('인증이 만료되었습니다. 다시 로그인해주세요.');

				// 로그인 페이지로 리다이렉트
				// this.redirectToLogin();
			}
		} catch (error) {
			console.error('❌ 인증 에러 처리 중 오류:', error);
			camSocketError.set('인증 처리 중 오류가 발생했습니다.');
		}
	}

	// 새로운 토큰으로 소켓 재초기화
	private async reinitializeSocketWithNewToken(newToken: string) {
		try {
			// 기존 소켓 정리
			if (this.socket) {
				this.socket.disconnect();
				this.socket = null;
			}

			// 새로운 토큰으로 소켓 재생성
			const { io } = await import('socket.io-client');
			const socketConfig = configService.getSocketConfig();
			const socketUrl = getSocketUrl();

			console.log('🔐 재연결 시 사용하는 새로운 JWT 토큰:', newToken);

			this.socket = io(socketUrl, {
				transports: ['websocket', 'polling'],
				withCredentials: true,
				reconnection: true,
				reconnectionAttempts: this.maxReconnectAttempts,
				reconnectionDelay: this.reconnectInterval,
				reconnectionDelayMax: 10000,
				timeout: 20000,
				forceNew: true,
				auth: {
					token: newToken
				}
			});

			// 이벤트 핸들러 재설정
			this.setupSocketEventHandlers();

			console.log('✅ 새로운 토큰으로 소켓 재초기화 완료');
		} catch (error) {
			console.error('❌ 소켓 재초기화 중 오류:', error);
			camSocketError.set('소켓 재연결에 실패했습니다.');
		}
	}

	// 로그인 페이지로 리다이렉트
	private redirectToLogin() {
		if (typeof window !== 'undefined') {
			console.log('🔄 로그인 페이지로 리다이렉트');
			window.location.href = '/login';
		}
	}

	// 출력물 상태 요청
	requestPrintStatus() {
		if (this.socket?.connected) {
			const requestData = {
				channel: 'cam/print',
				data: {
					action: 'getStatus'
				}
			};

			this.socket.emit('request', requestData);
		} else {
			console.warn('⚠️ 소켓이 연결되지 않아 상태 요청을 보낼 수 없습니다.');
		}
	}

	// 출력물 진행률 요청
	requestPrintProgress() {
		if (this.socket?.connected) {
			const requestData = {
				channel: 'cam/print',
				data: {
					action: 'getProgress'
				}
			};

			this.socket.emit('request', requestData);
		} else {
			console.warn('⚠️ 소켓이 연결되지 않아 진행률 요청을 보낼 수 없습니다.');
		}
	}

	// 출력물 작업 시작 요청
	startPrintJob(printData: any) {
		if (this.socket?.connected) {
			const commandData = {
				channel: 'cam/print',
				data: {
					action: 'startPrint',
					...printData
				}
			};

			this.socket.emit('command', commandData);
		} else {
			console.warn('⚠️ 소켓이 연결되지 않아 작업 시작 요청을 보낼 수 없습니다.');
		}
	}

	// 출력물 작업 중지 요청
	stopPrintJob(jobId: string) {
		if (this.socket?.connected) {
			const commandData = {
				channel: 'cam/print',
				data: {
					action: 'stopPrint',
					jobId
				}
			};

			this.socket.emit('command', commandData);
		} else {
			console.warn('⚠️ 소켓이 연결되지 않아 작업 중지 요청을 보낼 수 없습니다.');
		}
	}

	// 통합 폴더 모니터링 시작 요청
	startUnifiedFolderMonitor() {
		if (this.socket?.connected) {
			console.log('👁️ 통합 폴더 모니터링 시작 요청');
			this.socket.emit('start-unified-monitor');
		} else {
			console.warn('⚠️ 소켓이 연결되지 않아 통합 폴더 모니터링 시작 요청을 보낼 수 없습니다.');
		}
	}

	// 통합 폴더 모니터링 중지 요청
	stopUnifiedFolderMonitor() {
		if (this.socket?.connected) {
			console.log('⏹️ 통합 폴더 모니터링 중지 요청');
			this.socket.emit('stop-unified-monitor');
		} else {
			console.warn('⚠️ 소켓이 연결되지 않아 통합 폴더 모니터링 중지 요청을 보낼 수 없습니다.');
		}
	}

	// 개별 폴더 모니터링 시작 요청
	startFolderMonitor(folderType: 'urgent' | 'normal') {
		if (this.socket?.connected) {
			console.log(`👁️ ${folderType} 폴더 모니터링 시작 요청`);
			this.socket.emit('start-folder-monitor', { folderType });
		} else {
			console.warn(
				`⚠️ 소켓이 연결되지 않아 ${folderType} 폴더 모니터링 시작 요청을 보낼 수 없습니다.`
			);
		}
	}

	// 개별 폴더 모니터링 중지 요청
	stopFolderMonitor(folderType: 'urgent' | 'normal') {
		if (this.socket?.connected) {
			console.log(`⏹️ ${folderType} 폴더 모니터링 중지 요청`);
			this.socket.emit('stop-folder-monitor', { folderType });
		} else {
			console.warn(
				`⚠️ 소켓이 연결되지 않아 ${folderType} 폴더 모니터링 중지 요청을 보낼 수 없습니다.`
			);
		}
	}

	// 폴더 모니터링 데이터 새로고침 (API에서 데이터 가져오기)
	async refreshPrintListFromDB() {
		try {
			console.log('🔄 [refreshPrintListFromDB] DB에서 최신 출력물 리스트 요청 중...');

			const data = await fetchCamPrintListFromApi();
			console.log('✅ [refreshPrintListFromDB] DB에서 최신 출력물 리스트 가져오기 성공:', data);

			if (data && data.printList) {
				console.log('✅ [refreshPrintListFromDB] camPrintStatusData.set 호출:', data.printList);
				camPrintStatusData.set(data.printList);

				if (data.progressData) {
					camPrintProgressData.set(data.progressData);
				}

				// 알림 표시 - 토스트 제거, 콘솔 로그만
				console.log(
					`📊 [refreshPrintListFromDB] 최신 데이터를 가져왔습니다: ${data.printList.length}개 출력물`
				);
				folderMonitorNotification.set(
					`최신 데이터를 가져왔습니다: ${data.printList.length}개 출력물`
				);
			} else {
				console.warn('⚠️ [refreshPrintListFromDB] DB에서 출력물 리스트를 가져올 수 없습니다.');
				folderMonitorNotification.set('데이터를 가져오는데 실패했습니다.');
			}
		} catch (error) {
			console.error('❌ [refreshPrintListFromDB] DB에서 출력물 리스트 가져오기 오류:', error);
			camSocketError.set('데이터 새로고침에 실패했습니다.');
			folderMonitorNotification.set('데이터 새로고침에 실패했습니다.');
		}
	}

	// 소켓 연결 해제
	disconnect() {
		if (this.socket) {
			console.log('🔌 CAM 소켓 연결 해제');
			this.socket.disconnect();
			this.socket = null;
		}
	}

	// 연결 상태 확인
	isConnected(): boolean {
		return this.socket?.connected || false;
	}

	// 소켓 ID 가져오기
	getSocketId(): string | null {
		return this.socket ? (this.socket as any).id : null;
	}
}

// 싱글톤 인스턴스 생성
export const camSocketService = new CamSocketService();

// 브라우저 알림 권한 요청
if (typeof window !== 'undefined' && 'Notification' in window) {
	Notification.requestPermission();
}
