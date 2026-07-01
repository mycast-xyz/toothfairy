/**
 * 파우더(분말) 관리 도메인 타입/상수.
 *
 * 파우더 스트림 2종:
 *  - capPartial: 캡·파샬 공용 파우더
 *  - allonfour:  올온포 파우더
 * (커스텀 등은 파우더 추적 대상 아님)
 */

export type PowderStream = 'capPartial' | 'allonfour';

/** 스트림 표시 라벨 */
export const POWDER_STREAM_LABEL: Record<PowderStream, string> = {
	capPartial: '캡·파샬 파우더',
	allonfour: '올온포 파우더'
};

/**
 * 스트림별 1통 용량(g). ⚠️ 실제 값은 현장 확인 필요(임시 기본값).
 * 소모량 계산에 사용: 보충량(g) = 보충 통 수 × 통 용량.
 * 추후 설정 페이지로 이관 가능.
 */
export const POWDER_BOTTLE_CAPACITY_G: Record<PowderStream, number> = {
	capPartial: 1000,
	allonfour: 1000
};

/** 백엔드 GET /api/v0/powder/units 응답의 일자 항목 */
export interface PowderDayUnits {
	date: string; // YYYY-MM-DD
	capPartialUnits: number;
	allonfourUnits: number;
}

/** 파우더 일자 기록(남은량/보충) — Phase 2에서 입력·저장에 사용 */
export interface PowderDayRecord {
	date: string; // YYYY-MM-DD
	remainingAmt: number; // 남은량(g)
	refillBottles: number; // 보충 통 수
}
