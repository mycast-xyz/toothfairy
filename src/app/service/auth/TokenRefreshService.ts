import { browser } from '$app/environment';
import { authService } from '../AuthService';

export class TokenRefreshService {
	private refreshInterval: NodeJS.Timeout | null = null;
	private readonly CHECK_INTERVAL = 60 * 1000; // 1분마다 체크
	private readonly REFRESH_THRESHOLD = 10 * 60 * 1000; // 10분 전에 갱신
	private isRefreshing = false;

	constructor() {
		if (browser) {
			this.startBackgroundRefresh();
		}
	}

	// 백그라운드 토큰 갱신 시작
	private startBackgroundRefresh(): void {
		if (this.refreshInterval) {
			clearInterval(this.refreshInterval);
		}

		this.refreshInterval = setInterval(() => {
			this.checkAndRefreshToken();
		}, this.CHECK_INTERVAL);

		console.log('🔄 백그라운드 토큰 갱신 서비스 시작');
	}

	// 토큰 상태 확인 및 필요시 갱신
	private async checkAndRefreshToken(): Promise<void> {
		if (this.isRefreshing) {
			return; // 이미 갱신 중이면 스킵
		}

		try {
			const token = this.getStoredToken();
			if (!token) {
				return; // 토큰이 없으면 스킵
			}

			const timeUntilExpiry = this.getTimeUntilExpiry(token);
			if (timeUntilExpiry === null) {
				return; // 토큰 파싱 실패시 스킵
			}

			// 만료 10분 전에 갱신
			if (timeUntilExpiry < this.REFRESH_THRESHOLD) {
				console.log(`🕐 토큰 만료 ${Math.round(timeUntilExpiry / 1000)}초 전 - 갱신 시작`);
				await this.refreshToken();
			}
		} catch (error) {
			console.error('토큰 상태 확인 오류:', error);
		}
	}

	// 토큰 갱신
	private async refreshToken(): Promise<void> {
		if (this.isRefreshing) {
			return;
		}

		this.isRefreshing = true;

		try {
			console.log('🔄 백그라운드 토큰 갱신 시작...');
			const newToken = await authService.refreshJwtToken();

			if (newToken) {
				console.log('✅ 백그라운드 토큰 갱신 성공');
				this.updateStoredToken(newToken);
			} else {
				console.warn('⚠️ 백그라운드 토큰 갱신 실패');
				// 갱신 실패 시 로그아웃 처리
				this.handleRefreshFailure();
			}
		} catch (error) {
			console.error('백그라운드 토큰 갱신 오류:', error);
			this.handleRefreshFailure();
		} finally {
			this.isRefreshing = false;
		}
	}

	// 갱신 실패 처리
	private handleRefreshFailure(): void {
		// 로컬 스토리지에서 토큰 제거
		localStorage.removeItem('auth_token');
		localStorage.removeItem('refresh_token');

		// 사용자에게 알림 (선택사항)
		this.showRefreshFailureNotification();

		// 로그인 페이지로 리디렉션
		setTimeout(() => {
			window.location.href = '/login';
		}, 1000);
	}

	// 갱신 실패 알림
	private showRefreshFailureNotification(): void {
		// 브라우저 알림 또는 커스텀 알림 표시
		if ('Notification' in window && Notification.permission === 'granted') {
			new Notification('인증 만료', {
				body: '보안을 위해 다시 로그인해주세요.',
				icon: '/favicon.png'
			});
		}
	}

	// 저장된 토큰 가져오기
	private getStoredToken(): string | null {
		return localStorage.getItem('auth_token');
	}

	// 토큰 업데이트
	private updateStoredToken(token: string): void {
		localStorage.setItem('auth_token', token);
	}

	// 토큰 만료까지 남은 시간 계산
	private getTimeUntilExpiry(token: string): number | null {
		try {
			const payload = JSON.parse(atob(token.split('.')[1]));
			const expirationTime = payload.exp * 1000; // Convert to milliseconds
			return Math.max(expirationTime - Date.now(), 0);
		} catch (error) {
			return null;
		}
	}

	// 서비스 중지
	stop(): void {
		if (this.refreshInterval) {
			clearInterval(this.refreshInterval);
			this.refreshInterval = null;
		}
		console.log('🛑 백그라운드 토큰 갱신 서비스 중지');
	}

	// 서비스 재시작
	restart(): void {
		this.stop();
		this.startBackgroundRefresh();
	}

	// 수동 토큰 갱신 (긴급 상황)
	async forceRefresh(): Promise<boolean> {
		try {
			const newToken = await authService.refreshJwtToken();
			if (newToken) {
				this.updateStoredToken(newToken);
				return true;
			}
			return false;
		} catch (error) {
			console.error('강제 토큰 갱신 오류:', error);
			return false;
		}
	}
}

// 싱글톤 인스턴스 생성
export const tokenRefreshService = new TokenRefreshService();
