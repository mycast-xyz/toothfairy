import { configService } from '../ConfigService';
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
			const response = await axios.get(tokenEndpoint, {
				withCredentials: true, // 쿠키 포함
				headers: {
					'Content-Type': 'application/json'
				}
			});

			const data = response.data;

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

	// 토큰 재갱신은 서버(hooks.server.ts)가 담당한다.
	// 여기 있던 refreshJwtToken() 은 body 없이 POST 해서 백엔드가 항상 401 을 주고,
	// 응답도 {success, token} 으로 검사하는데 백엔드는 {resultCode, accessToken,
	// refreshToken} 을 주기 때문에 성공해도 실패로 처리되던 죽은 코드였다.
}

export const authService = new AuthService();
