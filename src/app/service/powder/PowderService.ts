import axios from 'axios';
import { configService } from '../ConfigService';
import { authService } from '../auth/AuthService';
import type { PowderDayUnits } from '../../model/powder/PowderType';

/**
 * 파우더 관리 서비스 — API 호출 캡슐화.
 * 엔드포인트는 ConfigService 경유(하드코딩 금지), 인증은 토큰/쿠키.
 */
export async function fetchPowderUnits(date: string): Promise<PowderDayUnits[]> {
	const config = configService.getConfig();
	if (!config) {
		throw new Error('설정 정보를 불러올 수 없습니다.');
	}
	const backendUrl = configService.getBackendUrl();
	const endpoint =
		configService.getApiEndpoint('powder', 'units') || '/api/v0/powder/units';
	const url = `${backendUrl}${endpoint}?date=${encodeURIComponent(date)}`;

	const token = await authService.getJwtToken();
	const response = await axios.get(url, {
		withCredentials: true,
		headers: token ? { Authorization: `Bearer ${token}` } : {}
	});

	const data = response.data;
	if (data?.status === 'ok' && data.data?.days) {
		return data.data.days as PowderDayUnits[];
	}
	return [];
}
