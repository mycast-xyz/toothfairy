// $types에서 LayoutServerLoad가 없으므로, LayoutServerData를 사용하거나 타입을 명시적으로 작성해야 합니다.
// 또한 jwtDecode의 반환 타입이 JwtPayload로, name이 없을 수 있으니 타입 가드를 추가합니다.
import type { LayoutServerData } from './$types';
import { jwtDecode, type JwtPayload } from 'jwt-decode';

export const load = async ({
	cookies
}: {
	cookies: any;
}): Promise<{ user: { id: string; name?: string } | null }> => {
	const token = cookies.get('jwt');

	if (token) {
		try {
			const decoded = jwtDecode<JwtPayload & { name?: string }>(token);
			// exp가 undefined일 수 있으니 체크
			if (decoded.exp && decoded.exp * 1000 > Date.now()) {
				return {
					user: { id: decoded.sub as string, name: decoded.name }
				};
			}
		} catch {
			// 유효하지 않은 토큰이면 user는 null
		}
	}

	return {
		user: null
	};
};
