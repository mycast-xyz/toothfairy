import { writable } from 'svelte/store';
import { configService, getSocketUrl } from '../ConfigService';
import { fetchCamPrintListFromApi } from './CamDataService';
import { authService } from '../auth/AuthService';

// Socket.IO 클라이언트 타입 정의
interface SocketIOClient {
	connect(): void;
	disconnect(): void;
	on(event: string, callback: (data: any) => void): void;
	off(event: string, callback?: (data: any) => void): void;
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

// 감시 폴더 접근 상태(수신 파이프라인 헬스). healthy=false면 파일 수신이 중단될 수 있음.
export const folderMonitorHealth = writable<{
	healthy: boolean;
	inaccessible: string[];
	checkedAt: string;
} | null>(null);

class CamSocketService {
	private socket: SocketIOClient | null = null;
	private reconnectAttempts = 0;
	private maxReconnectAttempts = 5;
	private reconnectInterval = 3000; // 3초
	// 소켓 파일/폴더 이벤트 폭주 시 REST 재조회를 합치기 위한 디바운스 타이머
	private refreshDebounceTimer: ReturnType<typeof setTimeout> | null = null;
	private readonly refreshDebounceMs = 400;

	constructor() {
		// 브라우저 환경에서만 초기화
		if (typeof window !== 'undefined') {
			// ConfigService 로드 후 소켓 초기화
			this.delayedInitialize();
		}
	}

	private async delayedInitialize() {
		try {
			// ConfigService 설정 로드 대기 (최대 5초)
			const configLoaded = await configService.waitForConfig(5000);
			if (configLoaded) {
				console.log('⏳ ConfigService 로드 완료 - 소켓 초기화 시작');
				await this.initializeSocket();
			} else {
				console.warn('⚠️ ConfigService 로드 실패 - 기본 설정으로 소켓 초기화');
				await this.initializeSocket();
			}
		} catch (error) {
			console.error('❌ 소켓 지연 초기화 오류:', error);
			camSocketError.set('소켓 초기화에 실패했습니다.');
		}
	}

	private async initializeSocket() {
		try {
			// Socket.IO 클라이언트 동적 import
			const { io } = await import('socket.io-client');

			// ConfigService에서 소켓 서버 주소 가져오기
			const socketConfig = configService.getSocketConfig();
			let socketUrl = getSocketUrl();

			console.log('🔌 CAM 소켓 초기화 시작');
			console.log('🔧 소켓 설정:', socketConfig);
			console.log('🌐 소켓 URL:', socketUrl);

			// 소켓 URL이 없거나 잘못된 경우 기본값 사용
			if (!socketUrl || socketUrl === 'undefined' || !socketUrl.startsWith('ws')) {
				socketUrl = 'ws://localhost:30090';
				console.warn('⚠️ 소켓 URL 설정 문제 - 기본값 사용:', socketUrl);
			}

			// 설정에서 재연결 설정 가져오기
			if (socketConfig && socketConfig.reconnect) {
				this.maxReconnectAttempts = socketConfig.reconnect.maxAttempts || 5;
				this.reconnectInterval = socketConfig.reconnect.interval || 3000;
				console.log('🔄 재연결 설정:', {
					maxAttempts: this.maxReconnectAttempts,
					interval: this.reconnectInterval
				});
			} else {
				console.log('🔄 기본 재연결 설정 사용:', {
					maxAttempts: this.maxReconnectAttempts,
					interval: this.reconnectInterval
				});
			}

			// JWT 토큰 가져오기
			const jwtToken = await authService.getJwtToken();
			console.log('🔐 JWT 토큰 상태:', jwtToken ? '✅ 토큰 존재' : '❌ 토큰 없음');
			if (jwtToken) {
				console.log('🔐 JWT 토큰 길이:', jwtToken.length);
			}

			// Socket.IO 클라이언트 생성 (JWT 토큰을 auth로 전송)
			const socketOptions: any = {
				transports: ['websocket', 'polling'],
				withCredentials: true, // 쿠키도 함께 전송
				reconnection: true, // 재연결 활성화
				reconnectionAttempts: this.maxReconnectAttempts,
				reconnectionDelay: this.reconnectInterval,
				reconnectionDelayMax: 10000, // 최대 재연결 지연 10초
				timeout: 20000,
				forceNew: false, // 기존 연결 재사용 허용
				autoConnect: true // 자동 연결
			};

			// JWT 토큰이 있는 경우에만 auth 추가
			if (jwtToken) {
				socketOptions.auth = {
					token: jwtToken
				};
			}

			console.log('⚙️ 소켓 옵션:', socketOptions);

			this.socket = io(socketUrl, socketOptions);

			// 연결 시도 로그
			console.log('🔌 소켓 연결 시도 중...', socketUrl);

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

			// 연결 후 cam/print 구독 요청 (상태 요청은 제거)
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

		// 감시 폴더 헬스 상태(수신 폴더 접근 가능 여부)
		this.socket.on('cam/monitor/health', (data) => {
			folderMonitorHealth.set(data);
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

			// 최신 리스트 요청(디바운스로 합침)
			this.scheduleRefreshPrintList();
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

			// 최신 리스트 요청(디바운스로 합침)
			this.scheduleRefreshPrintList();
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
			console.log('📁 [소켓] 리스트 재조회 예약(디바운스)');
			this.scheduleRefreshPrintList();
		});

		// 파일 이벤트 처리 (백엔드에서 보내는 파일 생성/수정/삭제 이벤트)
		this.socket.on('file-event', (data) => {
			console.log('📊 [소켓] file-event 이벤트 수신:', data);

			// .DS_Store 파일은 무시
			if (data.filename && data.filename.includes('.DS_Store')) {
				console.log('📊 .DS_Store 파일 이벤트 무시:', data.filename);
				return;
			}

			// 파일 이벤트 타입별 처리
			switch (data.eventType) {
				case 'create':
					console.log('📊 파일 생성 이벤트:', {
						filename: data.filename,
						folderType: data.folderType,
						timestamp: data.timestamp
					});
					folderMonitorNotification.set(`새 파일이 추가되었습니다: ${data.filename}`);
					break;

				case 'change':
				case 'modify':
					console.log('📊 파일 수정 이벤트:', {
						filename: data.filename,
						folderType: data.folderType,
						timestamp: data.timestamp
					});
					folderMonitorNotification.set(`파일이 수정되었습니다: ${data.filename}`);
					break;

				case 'delete':
				case 'unlink':
					console.log('📊 파일 삭제 이벤트:', {
						filename: data.filename,
						folderType: data.folderType,
						timestamp: data.timestamp
					});
					folderMonitorNotification.set(`파일이 삭제되었습니다: ${data.filename}`);
					break;

				default:
					console.log('📊 알 수 없는 파일 이벤트:', data);
			}

			// 파일 이벤트 발생 시 출력물 리스트 새로고침
			console.log('📊 [소켓] 파일 이벤트 → 리스트 재조회 예약(디바운스)');
			this.scheduleRefreshPrintList();
		});

		// 통합 파일 이벤트 처리 (unified-file-event)
		this.socket.on('unified-file-event', (data) => {
			console.log('📊 [소켓] unified-file-event 이벤트 수신:', data);

			// .DS_Store 파일은 무시
			if (data.filename && data.filename.includes('.DS_Store')) {
				console.log('📊 .DS_Store 파일 이벤트 무시:', data.filename);
				return;
			}

			// 통합 파일 이벤트 처리
			console.log('📊 통합 파일 이벤트:', {
				eventType: data.eventType,
				filename: data.filename,
				folderType: data.folderType,
				filePath: data.filePath,
				timestamp: data.timestamp
			});

			// 알림 메시지 설정
			const typeMessage =
				data.eventType === 'create'
					? '추가'
					: data.eventType === 'change' || data.eventType === 'modify'
						? '수정'
						: data.eventType === 'delete' || data.eventType === 'unlink'
							? '삭제'
							: '변경';

			folderMonitorNotification.set(
				`[${data.folderType}] 파일이 ${typeMessage}되었습니다: ${data.filename}`
			);

			// 파일 이벤트 발생 시 출력물 리스트 새로고침
			console.log('📊 [소켓] 통합 파일 이벤트 → 리스트 재조회 예약(디바운스)');
			this.scheduleRefreshPrintList();
		});

		// 폴더 변경 배치 이벤트 처리 (folder-changes-batch)
		this.socket.on('folder-changes-batch', (data) => {
			console.log('📊 [소켓] folder-changes-batch 이벤트 수신:', data);

			if (!data.changes || !Array.isArray(data.changes)) {
				console.warn('⚠️ 잘못된 배치 이벤트 데이터:', data);
				return;
			}

			// .DS_Store 파일 필터링
			const validChanges = data.changes.filter(
				(change: any) => change.filename && !change.filename.includes('.DS_Store')
			);

			if (validChanges.length === 0) {
				console.log('📊 모든 파일이 .DS_Store이므로 무시');
				return;
			}

			console.log('📊 배치 파일 변경 이벤트:', {
				folderType: data.folderType,
				totalChanges: data.count,
				validChanges: validChanges.length,
				timestamp: data.timestamp
			});

			// 변경 타입별 카운트
			const changeTypes = validChanges.reduce((acc: any, change: any) => {
				acc[change.eventType] = (acc[change.eventType] || 0) + 1;
				return acc;
			}, {});

			console.log('📊 변경 타입별 통계:', changeTypes);

			// 대표적인 파일들 로깅 (최대 5개)
			const sampleFiles = validChanges.slice(0, 5).map((change: any) => change.filename);
			console.log('📊 변경된 파일 예시:', sampleFiles);
			if (validChanges.length > 5) {
				console.log(`📊 ... 외 ${validChanges.length - 5}개 파일`);
			}

			// 알림 메시지 설정
			const createCount = changeTypes.create || 0;
			const modifyCount = (changeTypes.change || 0) + (changeTypes.modify || 0);
			const deleteCount = (changeTypes.delete || 0) + (changeTypes.unlink || 0);

			let notificationMessage = `[${data.folderType}] `;
			const messages = [];

			if (createCount > 0) messages.push(`${createCount}개 파일 추가`);
			if (modifyCount > 0) messages.push(`${modifyCount}개 파일 수정`);
			if (deleteCount > 0) messages.push(`${deleteCount}개 파일 삭제`);

			notificationMessage += messages.join(', ');

			folderMonitorNotification.set(notificationMessage);

			// 배치 이벤트 발생 시 출력물 리스트 새로고침
			console.log('📊 [소켓] 배치 파일 이벤트 → 리스트 재조회 예약(디바운스)');
			this.scheduleRefreshPrintList();
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

			// JWT 토큰 재갱신 시도.
			// 1순위: getJwtToken() — /api/auth/token(SvelteKit) 요청이 hooks.server.ts를 거치며
			//        만료된 access_token을 refresh_token으로 갱신 → 갱신된 토큰 반환(앱의 실제 복구 경로).
			// 2순위: refreshJwtToken() — 백엔드 직접 리프레시(폴백).
			let newToken = await authService.getJwtToken();
			if (!newToken) {
				newToken = await authService.refreshJwtToken();
			}

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
				// 리프레시 토큰까지 만료돼 복구 불가. 자동 리다이렉트는 작업 중단 위험이 있어
				// 하지 않고, 명확한 재로그인 유도 메시지를 남긴다(UI가 재로그인 링크 제공).
				console.log('❌ JWT 토큰 재갱신 실패 - 재로그인 필요');
				camSocketError.set('인증이 만료되었습니다. 다시 로그인해주세요.');
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

	// 통합 폴더 모니터링 시작 요청
	startUnifiedFolderMonitor() {
		if (this.socket?.connected) {
			console.log('👁️ 통합 폴더 모니터링 시작 요청');
			this.socket.emit('start-unified-monitor', {});
		} else {
			console.warn('⚠️ 소켓이 연결되지 않아 통합 폴더 모니터링 시작 요청을 보낼 수 없습니다.');
		}
	}

	// 통합 폴더 모니터링 중지 요청
	stopUnifiedFolderMonitor() {
		if (this.socket?.connected) {
			console.log('⏹️ 통합 폴더 모니터링 중지 요청');
			this.socket.emit('stop-unified-monitor', {});
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

	// 소켓 파일/폴더 이벤트로 인한 리스트 재조회를 디바운스로 합친다.
	// (짧은 시간에 여러 이벤트가 오면 마지막 한 번만 REST 재조회 → 깜빡임·부하 감소)
	private scheduleRefreshPrintList() {
		if (this.refreshDebounceTimer) {
			clearTimeout(this.refreshDebounceTimer);
		}
		this.refreshDebounceTimer = setTimeout(() => {
			this.refreshDebounceTimer = null;
			this.refreshPrintListFromDB();
		}, this.refreshDebounceMs);
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

	// 수동 연결 시도
	async connect() {
		if (this.socket && this.socket.connected) {
			console.log('🔗 이미 소켓에 연결되어 있습니다.');
			return;
		}

		if (!this.socket) {
			console.log('🔌 소켓이 초기화되지 않음 - 재초기화 시도');
			await this.initializeSocket();
		} else {
			console.log('🔌 기존 소켓으로 연결 시도');
			this.socket.connect();
		}
	}

	// 소켓 연결 해제
	disconnect() {
		if (this.socket) {
			console.log('🔌 CAM 소켓 연결 해제');
			this.socket.disconnect();
			this.socket = null;
		}
		camSocketConnected.set(false);
		this.reconnectAttempts = 0;
	}

	// 연결 상태 확인
	isConnected(): boolean {
		return this.socket?.connected || false;
	}

	// 모니터링 폴더 초기화 (비밀번호 인증 포함)
	initializeMonitoringFolders(password: string): Promise<{ success: boolean; message: string }> {
		return new Promise((resolve, reject) => {
			if (!this.socket?.connected) {
				console.warn('⚠️ 소켓이 연결되지 않아 모니터링 폴더를 초기화할 수 없습니다.');
				reject(new Error('소켓이 연결되지 않았습니다.'));
				return;
			}

			console.log('🔧 모니터링 폴더 초기화 요청 (비밀번호 인증)');

			// 일회성 이벤트 리스너 등록
			const handleSuccess = (data: any) => {
				console.log('✅ 모니터링 폴더 초기화 성공:', data);
				this.socket?.off('monitoring-folders-error', handleError);
				resolve({
					success: true,
					message: '모니터링 폴더가 성공적으로 초기화되었습니다.'
				});
			};

			const handleError = (data: any) => {
				console.error('❌ 모니터링 폴더 초기화 실패:', data);
				this.socket?.off('monitoring-folders-initialized', handleSuccess);
				reject(new Error(data.message || '모니터링 폴더 초기화에 실패했습니다.'));
			};

			// 이벤트 리스너 등록
			this.socket.on('monitoring-folders-initialized', handleSuccess);
			this.socket.on('monitoring-folders-error', handleError);

			// 서버로 초기화 요청 전송
			this.socket.emit('initialize-monitoring-folders', { password });

			// 타임아웃 설정 (30초)
			setTimeout(() => {
				this.socket?.off('monitoring-folders-initialized', handleSuccess);
				this.socket?.off('monitoring-folders-error', handleError);
				reject(new Error('요청 시간이 초과되었습니다.'));
			}, 30000);
		});
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
