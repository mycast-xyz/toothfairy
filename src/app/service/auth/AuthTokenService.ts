import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import { authService } from '../AuthService';

export class AuthTokenService {
	private static readonly TOKEN_KEY = 'auth_token';
	private static readonly REFRESH_TOKEN_KEY = 'refresh_token';
	private _token = writable<string | null>(null);
	private _isAuthenticated = writable<boolean>(false);
	private refreshTimer: NodeJS.Timeout | null = null;
	private readonly REFRESH_THRESHOLD = 5 * 60 * 1000; // 5분 전에 갱신

	constructor() {
		if (browser) {
			// 브라우저 환경에서만 localStorage 접근
			const savedToken = localStorage.getItem(AuthTokenService.TOKEN_KEY);
			if (savedToken) {
				this._token.set(savedToken);
				this._isAuthenticated.set(true);
				this.scheduleTokenRefresh(savedToken);
			}
		}
	}

	// 토큰 설정 및 자동 갱신 스케줄링
	setToken(token: string): void {
		if (!browser) return;

		localStorage.setItem(AuthTokenService.TOKEN_KEY, token);
		this._token.set(token);
		this._isAuthenticated.set(true);

		// 기존 타이머 정리
		if (this.refreshTimer) {
			clearTimeout(this.refreshTimer);
		}

		// 새로운 토큰 갱신 스케줄링
		this.scheduleTokenRefresh(token);
	}

	// 토큰 갱신 스케줄링
	private scheduleTokenRefresh(token: string): void {
		if (!browser) return;

		try {
			const payload = JSON.parse(atob(token.split('.')[1]));
			const expirationTime = payload.exp * 1000; // Convert to milliseconds
			const currentTime = Date.now();
			const timeUntilExpiry = expirationTime - currentTime;

			// 만료 5분 전에 갱신
			const refreshTime = Math.max(timeUntilExpiry - this.REFRESH_THRESHOLD, 0);

			console.log(`🕐 토큰 갱신 스케줄링: ${Math.round(refreshTime / 1000)}초 후`);

			this.refreshTimer = setTimeout(async () => {
				await this.refreshTokenSilently();
			}, refreshTime);
		} catch (error) {
			console.error('토큰 갱신 스케줄링 오류:', error);
		}
	}

	// 자동 토큰 갱신 (사용자에게 알리지 않음)
	private async refreshTokenSilently(): Promise<void> {
		try {
			console.log('🔄 자동 토큰 갱신 시작...');
			const newToken = await authService.refreshJwtToken();

			if (newToken) {
				console.log('✅ 자동 토큰 갱신 성공');
				this.setToken(newToken);
			} else {
				console.warn('⚠️ 자동 토큰 갱신 실패');
				// 갱신 실패 시 로그아웃 처리
				this.clearTokens();
			}
		} catch (error) {
			console.error('자동 토큰 갱신 오류:', error);
			this.clearTokens();
		}
	}

	// 토큰 만료 시간 확인
	getTokenExpirationTime(): number | null {
		if (!browser) return null;

		const token = this.getToken();
		if (!token) return null;

		try {
			const payload = JSON.parse(atob(token.split('.')[1]));
			return payload.exp * 1000; // Convert to milliseconds
		} catch (error) {
			return null;
		}
	}

	// 토큰 만료까지 남은 시간 (밀리초)
	getTimeUntilExpiry(): number | null {
		const expirationTime = this.getTokenExpirationTime();
		if (!expirationTime) return null;

		return Math.max(expirationTime - Date.now(), 0);
	}

	// 토큰이 곧 만료될 예정인지 확인 (기본값: 10분)
	isTokenExpiringSoon(threshold: number = 10 * 60 * 1000): boolean {
		const timeUntilExpiry = this.getTimeUntilExpiry();
		return timeUntilExpiry !== null && timeUntilExpiry < threshold;
	}

	// 수동 토큰 갱신 (사용자 액션에 의해 호출)
	async refreshToken(): Promise<boolean> {
		try {
			const newToken = await authService.refreshJwtToken();
			if (newToken) {
				this.setToken(newToken);
				return true;
			}
			return false;
		} catch (error) {
			console.error('수동 토큰 갱신 오류:', error);
			return false;
		}
	}

	// 토큰 가져오기
	getToken(): string | null {
		if (!browser) return null;
		const token = localStorage.getItem(AuthTokenService.TOKEN_KEY);
		if (!token || !this.isTokenValid(token)) {
			this.clearTokens();
			return null;
		}
		return localStorage.getItem(AuthTokenService.TOKEN_KEY);
	}

	// 인증 상태 가져오기
	get isAuthenticated(): boolean {
		if (!browser) return false;
		const token = this.getToken();
		return !!token && this.isTokenValid(token);
	}

	// 토큰 유효성 검사
	isTokenValid(token: string): boolean {
		if (!token) return false;

		try {
			const payload = JSON.parse(atob(token.split('.')[1]));
			const expirationTime = payload.exp * 1000; // Convert to milliseconds
			return Date.now() < expirationTime;
		} catch (error) {
			return false;
		}
	}

	// 토큰 삭제
	clearTokens(): void {
		if (!browser) return;

		localStorage.removeItem(AuthTokenService.TOKEN_KEY);
		localStorage.removeItem(AuthTokenService.REFRESH_TOKEN_KEY);
		this._token.set(null);
		this._isAuthenticated.set(false);

		// 타이머 정리
		if (this.refreshTimer) {
			clearTimeout(this.refreshTimer);
			this.refreshTimer = null;
		}
	}

	// HTTP 요청을 위한 Authorization 헤더 생성
	getAuthHeader(): { Authorization: string } | {} {
		const token = this.getToken();
		return token ? { Authorization: `Bearer ${token}` } : {};
	}

	// 서비스 정리
	destroy(): void {
		if (this.refreshTimer) {
			clearTimeout(this.refreshTimer);
			this.refreshTimer = null;
		}
	}
}

// 싱글톤 인스턴스 생성 및 export
export const authTokenService = new AuthTokenService();
