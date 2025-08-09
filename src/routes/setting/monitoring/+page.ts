import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent }) => {
	const { user } = await parent();

	// 권한 확인 - 관리자만 접근 가능
	if (!user || user.role !== 'all_admin') {
		throw redirect(302, '/login');
	}

	return {
		user,
		title: '시스템 모니터링',
		description: '시스템 리소스 모니터링 및 관리'
	};
};
