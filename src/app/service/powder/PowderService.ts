import axios from 'axios';
import { configService } from '../ConfigService';
import { authService } from '../auth/AuthService';
import type { PowderDayUnits, PowderStream } from '../../model/powder/PowderType';

/**
 * 파우더 관리 서비스 — API 호출 캡슐화.
 * 엔드포인트는 ConfigService 경유, 인증은 토큰/쿠키.
 */

export interface PowderRecord {
	powderType: PowderStream;
	date: string; // YYYY-MM-DD
	remainingAmt: number | string;
	/** 직접 보충량(g) */
	refillAmt: number | string;
	/** 다른 스트림으로 보낸 양(g). 캡에서 파샬+올온포로 보낼 때 사용 */
	transferOutAmt: number | string;
	/** 다른 스트림에서 받은 양(g). 파샬+올온포가 캡에서 받을 때 사용 */
	transferInAmt: number | string;
}

export interface PowderListData {
	days: PowderDayUnits[];
	records: PowderRecord[];
	config: Record<string, number>; // { cap: g, partialAllonfour: g }
}

function backendUrl(): string {
	const config = configService.getConfig();
	if (!config) throw new Error('설정 정보를 불러올 수 없습니다.');
	return configService.getBackendUrl();
}

async function authHeaders() {
	const token = await authService.getJwtToken();
	return token ? { Authorization: `Bearer ${token}` } : {};
}

/** 월별 유닛만(Phase 1 호환) */
export async function fetchPowderUnits(date: string): Promise<PowderDayUnits[]> {
	const url = `${backendUrl()}/api/v0/powder/units?date=${encodeURIComponent(date)}`;
	const res = await axios.get(url, {
		withCredentials: true,
		headers: await authHeaders()
	});
	return res.data?.status === 'ok' && res.data.data?.days ? res.data.data.days : [];
}

/** 월별 종합(유닛 + 남은량/보충 기록 + 통용량) */
export async function fetchPowderList(date: string): Promise<PowderListData> {
	const url = `${backendUrl()}/api/v0/powder/list?date=${encodeURIComponent(date)}`;
	const res = await axios.get(url, {
		withCredentials: true,
		headers: await authHeaders()
	});
	const d = res.data?.data || {};
	return {
		days: d.days || [],
		records: d.records || [],
		config: d.config || { cap: 1000, partialAllonfour: 1000 }
	};
}

/** 일자 기록(남은량/보충/이동) 저장. 보충·이동 모두 g 단위 */
export async function savePowderRecord(
	powderType: PowderStream,
	recordDate: string,
	remainingAmt: number,
	refillAmt: number,
	transferOutAmt: number,
	transferInAmt: number
): Promise<void> {
	const url = `${backendUrl()}/api/v0/powder/record`;
	const res = await axios.post(
		url,
		{
			powderType,
			recordDate,
			remainingAmt,
			refillAmt,
			transferOutAmt,
			transferInAmt
		},
		{ withCredentials: true, headers: await authHeaders() }
	);
	if (res.data?.status !== 'ok') {
		throw new Error(res.data?.message || '저장에 실패했습니다.');
	}
}

/** 통 용량 설정 저장 */
export async function savePowderConfig(
	config: Array<{ powderType: PowderStream; bottleCapacityG: number }>
): Promise<void> {
	const url = `${backendUrl()}/api/v0/powder/config`;
	const res = await axios.put(
		url,
		{ config },
		{ withCredentials: true, headers: await authHeaders() }
	);
	if (res.data?.status !== 'ok') {
		throw new Error(res.data?.message || '통 용량 저장에 실패했습니다.');
	}
}
