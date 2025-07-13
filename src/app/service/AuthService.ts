import { configService } from './ConfigService';
import axios from 'axios';

class AuthService {
	constructor() {
		// AuthService 초기화
	}

	// JWT 토큰 가져오기 (API를 통해 httpOnly 쿠키에서 추출)
	public async getJwtToken(): Promise<string | null> {
		try {
			// 설정에서 access 토큰 쿠키 정보 가져오기
			const accessTokenConfig = configService.getAccessTokenCookieConfig();
			const tokenEndpoint = configService.getApiEndpoint('auth', 'token') || '/api/auth/token';

			// API를 통해 토큰 가져오기
			const response = await fetch(tokenEndpoint, {
				method: 'GET',
				credentials: 'include', // 쿠키 포함
				headers: {
					'Content-Type': 'application/json'
				}
			});

			if (!response.ok) {
				return null;
			}

			const data = await response.json();

			if (data.success && data.token) {
				return data.token;
			} else {
				return null;
			}
		} catch (error) {
			console.error('❌ JWT 토큰 가져오기 오류:', error);
			return null;
		}
	}

	// JWT 토큰 재갱신
	public async refreshJwtToken(): Promise<string | null> {
		try {
			// 설정에서 refresh 토큰 쿠키 정보 가져오기
			const refreshEndpoint = configService.getApiEndpoint('auth', 'refresh');
			if (!refreshEndpoint) {
				console.error('❌ 리프레시 엔드포인트 설정이 없습니다.');
				return null;
			}

			const backendBaseUrl = configService.getBackendUrl();
			const fullUrl = `${backendBaseUrl}${refreshEndpoint}`;

			const response = await axios.post(
				fullUrl,
				{},
				{
					withCredentials: true
				}
			);

			if (response.status === 200 && response.data.success && response.data.token) {
				console.log('✅ JWT 토큰 재갱신 성공');
				return response.data.token;
			}

			console.log('❌ JWT 토큰 재갱신 실패:', response.status);
			return null;
		} catch (error) {
			console.error('❌ JWT 토큰 재갱신 중 오류:', error);
			return null;
		}
	}
}

export const authService = new AuthService();
