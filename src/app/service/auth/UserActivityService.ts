import { browser } from '$app/environment';
import { authTokenService } from './AuthTokenService';

export class UserActivityService {
	private activityTimer: NodeJS.Timeout | null = null;
	private readonly ACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5분 동안 활동이 없으면 토큰 갱신
	private lastActivityTime: number = Date.now();
	private isActive = true;

	constructor() {
		if (browser) {
			this.initializeActivityTracking();
		}
	}

	// 사용자 활동 추적 초기화
	private initializeActivityTracking(): void {
		// 마우스 이벤트
		document.addEventListener('mousemove', () => this.updateActivity());
		document.addEventListener('mousedown', () => this.updateActivity());
		document.addEventListener('mouseup', () => this.updateActivity());
		document.addEventListener('click', () => this.updateActivity());

		// 키보드 이벤트
		document.addEventListener('keydown', () => this.updateActivity());
		document.addEventListener('keyup', () => this.updateActivity());

		// 터치 이벤트 (모바일)
		document.addEventListener('touchstart', () => this.updateActivity());
		document.addEventListener('touchmove', () => this.updateActivity());
		document.addEventListener('touchend', () => this.updateActivity());

		// 스크롤 이벤트
		document.addEventListener('scroll', () => this.updateActivity());

		// 포커스 이벤트
		window.addEventListener('focus', () => this.updateActivity());
		window.addEventListener('blur', () => this.updateActivity());

		// 페이지 가시성 변경 이벤트
		document.addEventListener('visibilitychange', () => {
			if (!document.hidden) {
				this.updateActivity();
			}
		});

		// 활동 타이머 시작
		this.startActivityTimer();
	}

	// 사용자 활동 업데이트
	private updateActivity(): void {
		this.lastActivityTime = Date.now();
		this.isActive = true;

		// 활동 타이머 재시작
		this.restartActivityTimer();
	}

	// 활동 타이머 시작
	private startActivityTimer(): void {
		if (this.activityTimer) {
			clearTimeout(this.activityTimer);
		}

		this.activityTimer = setTimeout(() => {
			this.handleInactivity();
		}, this.ACTIVITY_TIMEOUT);
	}

	// 활동 타이머 재시작
	private restartActivityTimer(): void {
		this.startActivityTimer();
	}

	// 비활동 상태 처리
	private async handleInactivity(): Promise<void> {
		if (this.isActive) {
			this.isActive = false;
			console.log('🕐 사용자 비활동 상태 감지 - 토큰 상태 확인');

			// 토큰이 곧 만료될 예정인지 확인
			if (authTokenService.isTokenExpiringSoon(15 * 60 * 1000)) {
				// 15분 전
				console.log('🔄 토큰 만료 임박 - 자동 갱신 시작');
				await this.refreshTokenIfNeeded();
			}
		}
	}

	// 필요시 토큰 갱신
	private async refreshTokenIfNeeded(): Promise<void> {
		try {
			const success = await authTokenService.refreshToken();
			if (success) {
				console.log('✅ 사용자 비활동 중 토큰 갱신 성공');
			} else {
				console.warn('⚠️ 사용자 비활동 중 토큰 갱신 실패');
			}
		} catch (error) {
			console.error('사용자 비활동 중 토큰 갱신 오류:', error);
		}
	}

	// 강제 활동 상태 업데이트 (외부에서 호출)
	forceActivityUpdate(): void {
		this.updateActivity();
	}

	// 현재 활동 상태 확인
	getCurrentActivityStatus(): {
		isActive: boolean;
		lastActivityTime: number;
		timeSinceLastActivity: number;
	} {
		const now = Date.now();
		return {
			isActive: this.isActive,
			lastActivityTime: this.lastActivityTime,
			timeSinceLastActivity: now - this.lastActivityTime
		};
	}

	// 서비스 정리
	destroy(): void {
		if (this.activityTimer) {
			clearTimeout(this.activityTimer);
			this.activityTimer = null;
		}

		// 이벤트 리스너 제거
		if (browser) {
			document.removeEventListener('mousemove', () => this.updateActivity());
			document.removeEventListener('mousedown', () => this.updateActivity());
			document.removeEventListener('mouseup', () => this.updateActivity());
			document.removeEventListener('click', () => this.updateActivity());
			document.removeEventListener('keydown', () => this.updateActivity());
			document.removeEventListener('keyup', () => this.updateActivity());
			document.removeEventListener('touchstart', () => this.updateActivity());
			document.removeEventListener('touchmove', () => this.updateActivity());
			document.removeEventListener('touchend', () => this.updateActivity());
			document.removeEventListener('scroll', () => this.updateActivity());
			window.removeEventListener('focus', () => this.updateActivity());
			window.removeEventListener('blur', () => this.updateActivity());
			document.removeEventListener('visibilitychange', () => {});
		}
	}
}

// 싱글톤 인스턴스 생성
export const userActivityService = new UserActivityService();
