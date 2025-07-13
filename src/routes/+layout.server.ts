// $types에서 LayoutServerLoad가 없으므로, LayoutServerData를 사용하거나 타입을 명시적으로 작성해야 합니다.
// 또한 jwtDecode의 반환 타입이 JwtPayload로, name이 없을 수 있으니 타입 가드를 추가합니다.
import type { LayoutServerData } from './$types';
import { jwtDecode, type JwtPayload } from 'jwt-decode';
import type { User, UserRole } from '../app/model/user/UserRole';
import { configService } from '../app/service/ConfigService';

export const load = async ({ cookies }: { cookies: any }): Promise<{ user: User | null }> => {
	// 설정에서 쿠키 정보 가져오기
	const accessTokenConfig = configService.getAccessTokenCookieConfig();

	// 기존 쿠키 이름과 새로운 쿠키 이름 모두 확인 (호환성 유지)
	let token = cookies.get(accessTokenConfig?.name || 'jwt');
	if (!token) {
		token = cookies.get('jwt'); // 기존 쿠키 이름으로도 확인
	}

	if (token) {
		try {
			// JWT 페이로드를 직접 디코딩
			const payloadPart = token.split('.')[1];
			const decoded = JSON.parse(atob(payloadPart));

			// 테스트 로그: LayoutServer에서 Access Token 디코딩 값 출력
			console.log('🔍 LayoutServer Access Token 디코딩 테스트:');
			console.log('🔍 전체 디코딩 값:', decoded);
			console.log('🔍 만료 시간 (exp):', decoded.exp);
			console.log('🔍 현재 시간:', Date.now());
			console.log(
				'🔍 만료 여부:',
				decoded.exp ? (decoded.exp * 1000 > Date.now() ? '유효' : '만료') : 'exp 없음'
			);
			console.log('🔍 사용자 ID (sub):', decoded.sub);
			console.log('🔍 사용자 ID (userId):', decoded.userId);
			console.log('🔍 사용자 UUID (userUUID):', decoded.userUUID);
			console.log('🔍 사용자 역할 (userRole):', decoded.userRole);
			console.log('🔍 사용자 역할 (role):', decoded.role);
			console.log('🔍 사용자 이름 (name):', decoded.name);
			console.log('🔍 토큰 길이:', token.length);
			console.log('🔍 토큰 시작 부분:', token.substring(0, 50) + '...');

			// exp가 undefined일 수 있으니 체크
			if (decoded.exp && decoded.exp * 1000 > Date.now()) {
				// JWT에서 사용자 정보 추출 시도
				let userId = decoded.sub || decoded.id;
				let userUuid = decoded.userUUID;
				let userRole = decoded.userRole || decoded.role; // userRole을 우선으로 확인
				let userName = decoded.name;

				// JWT에 정보가 없으면 userInfo 쿠키에서 가져오기
				if (!userId || !userRole) {
					const userInfoCookie = cookies.get('userInfo');
					if (userInfoCookie) {
						try {
							const userInfo = JSON.parse(userInfoCookie);
							userId = userId || userInfo.id;
							userUuid = userUuid || userInfo.uuid;
							userRole = userRole || userInfo.role;
							userName = userName || userInfo.name;
						} catch (error) {
							console.error('userInfo 쿠키 파싱 오류:', error);
						}
					}
				}

				// 기본값 설정
				userId = userId || 'unknown';
				userRole = userRole || 'user';

				// role이 'user'로 설정되는 경우 경고
				if (userRole === 'user') {
					console.warn('LayoutServer 경고: role이 기본값 "user"로 설정되었습니다.');
				}

				return {
					user: {
						id: userId as string,
						uuid: userUuid,
						name: userName,
						role: userRole
					}
				};
			}
		} catch (error) {
			console.error('JWT 디코딩 오류:', error);
			// 유효하지 않은 토큰이면 user는 null
		}
	}

	return {
		user: null
	};
};
