import { configService, getBackendUrl, getSocketUrl, resolveUrl } from '../app/service/ConfigService';

/**
 * 현재 환경에 맞는 백엔드 URL을 반환합니다.
 * ConfigService가 로드되지 않은 경우 기본값을 사용합니다.
 */
export function getCurrentBackendUrl(hostname?: string): string {
	try {
		// ConfigService에서 백엔드 URL 가져오기 시도
		const configUrl = getBackendUrl();
		if (configUrl && configUrl !== 'http://localhost:3000') {
			return configUrl;
		}
	} catch (error) {
		console.warn('ConfigService에서 URL을 가져올 수 없어 기본값을 사용합니다:', error);
	}

	// 기본값 반환
	if (hostname) {
		return `http://${hostname}:3000`;
	}
	return resolveUrl('http://localhost:3000');
}

/**
 * 현재 환경에 맞는 소켓 URL을 반환합니다.
 */
export function getCurrentSocketUrl(): string {
	try {
		return getSocketUrl();
	} catch (error) {
		console.warn('ConfigService에서 소켓 URL을 가져올 수 없어 기본값을 사용합니다:', error);
	}

	return resolveUrl('ws://localhost:30090');
}

/**
 * API 엔드포인트를 생성합니다.
 */
export function buildApiUrl(endpoint: string, hostname?: string): string {
	const baseUrl = getCurrentBackendUrl(hostname);
	return `${baseUrl}${endpoint}`;
}

/**
 * 환경별 설정을 확인합니다.
 */
export function isDevelopment(): boolean {
	try {
		return configService.getEnvironment() === 'dev';
	} catch (error) {
		return true; // 기본값은 개발 환경
	}
}

/**
 * 디버그 모드 여부를 확인합니다.
 */
export function isDebugMode(): boolean {
	try {
		return configService.isDebug();
	} catch (error) {
		return true; // 기본값은 디버그 모드
	}
}
