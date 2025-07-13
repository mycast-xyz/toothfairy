import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }: { locals: any }) => {
	// 사용자 정보 반환
	return {
		user: locals.user
	};
};
