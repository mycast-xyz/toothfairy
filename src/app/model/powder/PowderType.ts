/**
 * 파우더(분말) 관리 도메인 타입/상수.
 *
 * 파우더 스트림 2종:
 *  - cap:              캡 파우더
 *  - partialAllonfour: 파샬 + 올온포 공용 파우더
 * (커스텀 등은 파우더 추적 대상 아님)
 */

export type PowderStream = 'cap' | 'partialAllonfour';

/** 스트림 표시 라벨 */
export const POWDER_STREAM_LABEL: Record<PowderStream, string> = {
	cap: '캡 파우더',
	partialAllonfour: '올온포·파샬 파우더'
};

/**
 * 스트림별 1통 용량(g) 기본값. 실제 값은 UI 설정에서 저장·조정.
 * 소모량 계산: 보충량(g) = 보충 통 수 × 통 용량.
 */
export const POWDER_BOTTLE_CAPACITY_G: Record<PowderStream, number> = {
	cap: 1000,
	partialAllonfour: 1000
};

/** 백엔드 GET /api/v0/powder/units 응답의 일자 항목 */
export interface PowderDayUnits {
	date: string; // YYYY-MM-DD
	capUnits: number;
	partialAllonfourUnits: number;
}

/** 파우더 일자 기록(남은량/보충) */
export interface PowderDayRecord {
	date: string; // YYYY-MM-DD
	remainingAmt: number; // 남은량(g)
	refillBottles: number; // 보충 통 수
}
