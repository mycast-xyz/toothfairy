// $types에서 LayoutServerLoad가 없으므로, LayoutServerData를 사용하거나 타입을 명시적으로 작성해야 합니다.
// 또한 jwtDecode의 반환 타입이 JwtPayload로, name이 없을 수 있으니 타입 가드를 추가합니다.
import type { LayoutServerData } from './$types';
import { jwtDecode, type JwtPayload } from 'jwt-decode';
import type { User, UserRole } from '../app/model/user/UserRole';

export const load = async ({ cookies }: { cookies: any }): Promise<{ user: User | null }> => {
	const token = cookies.get('jwt');

	if (token) {
		try {
			// JWT 페이로드를 직접 디코딩
			const payloadPart = token.split('.')[1];
			const decoded = JSON.parse(atob(payloadPart));

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
