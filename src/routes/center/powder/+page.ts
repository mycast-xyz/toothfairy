import type { PageLoad } from './$types';
import { configService } from '../../../app/service/ConfigService';

// 얇은 진입점: 설정 로드 대기 + 연-월 파라미터 정리. 실제 데이터는 컴포넌트에서 조회.
export const load: PageLoad = async ({ url }) => {
	await configService.waitForConfig(3000);

	const now = new Date();
	const currentDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
	const date = url.searchParams.get('date') || currentDate;

	return { date };
};
