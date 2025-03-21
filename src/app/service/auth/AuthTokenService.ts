import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export class AuthTokenService {
	private static readonly TOKEN_KEY = 'auth_token';
	private static readonly REFRESH_TOKEN_KEY = 'refresh_token';
	private _token = writable<string | null>(null);
	private _isAuthenticated = writable<boolean>(false);

	constructor() {
		if (browser) {
			// 브라우저 환경에서만 localStorage 접근
			const savedToken = localStorage.getItem(AuthTokenService.TOKEN_KEY);
			if (savedToken) {
				this._token.set(savedToken);
				this._isAuthenticated.set(true);
			}
		}
	}

	// 토큰 저장
	setToken(token: string) {
		if (browser) {
			localStorage.setItem(AuthTokenService.TOKEN_KEY, token);
		}
		this._token.set(token);
		this._isAuthenticated.set(true);
	}

	// 리프레시 토큰 저장
	setRefreshToken(token: string) {
		if (browser) {
			localStorage.setItem(AuthTokenService.REFRESH_TOKEN_KEY, token);
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

	// 리프레시 토큰 가져오기
	getRefreshToken(): string | null {
		if (!browser) return null;
		return localStorage.getItem(AuthTokenService.REFRESH_TOKEN_KEY);
	}

	// 토큰 삭제 (로그아웃)
	clearTokens() {
		if (browser) {
			localStorage.removeItem(AuthTokenService.TOKEN_KEY);
			localStorage.removeItem(AuthTokenService.REFRESH_TOKEN_KEY);
		}
		this._token.set(null);
		this._isAuthenticated.set(false);
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

	// 토큰 갱신이 필요한지 확인
	needsRefresh(token: string): boolean {
		if (!token) return true;

		try {
			const payload = JSON.parse(atob(token.split('.')[1]));
			const expirationTime = payload.exp * 1000; // Convert to milliseconds
			const refreshThreshold = 5 * 60 * 1000; // 5 minutes before expiration
			return Date.now() > expirationTime - refreshThreshold;
		} catch (error) {
			return true;
		}
	}

	// 인증 상태 구독
	get isAuthenticated() {
		return {
			subscribe: this._isAuthenticated.subscribe
		};
	}

	// 토큰 구독
	get token() {
		return {
			subscribe: this._token.subscribe
		};
	}

	// HTTP 요청을 위한 Authorization 헤더 생성
	getAuthHeader(): { Authorization: string } | {} {
		const token = this.getToken();
		return token ? { Authorization: `Bearer ${token}` } : {};
	}
}

// 싱글톤 인스턴스 생성 및 export
export const authTokenService = new AuthTokenService();
