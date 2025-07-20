import type { PrintStatus, PrintPriority, PrintCategory } from './PrintData';

// 출력물 상태에 따른 색상 반환
export function getStatusColor(status: PrintStatus): string {
	const statusColors: Record<PrintStatus, string> = {
		received: 'bg-blue-100 text-blue-800',
		processing: 'bg-yellow-100 text-yellow-800',
		completed: 'bg-green-100 text-green-800',
		error: 'bg-red-100 text-red-800',
		paused: 'bg-gray-100 text-gray-800',
		waiting: 'bg-yellow-100 text-yellow-800',
		printing: 'bg-blue-100 text-blue-800',
		unknown: 'bg-gray-100 text-gray-800'
	};
	return statusColors[status] || 'bg-gray-100 text-gray-800';
}

// 출력물 상태 한글명 반환
export function getStatusText(status: PrintStatus): string {
	const statusTexts: Record<PrintStatus, string> = {
		received: '다운로드전',
		processing: '다운로드완료',
		completed: '가공완료',
		error: '오류',
		paused: '일시정지',
		waiting: '대기중',
		printing: '출력중',
		unknown: '알 수 없음'
	};
	return statusTexts[status] || '알 수 없음';
}

// 우선순위에 따른 색상 반환
export function getPriorityColor(priority: PrintPriority): string {
	const priorityColors: Record<PrintPriority, string> = {
		high: 'bg-red-500',
		urgent: 'bg-red-600',
		normal: 'bg-blue-500',
		low: 'bg-gray-500'
	};
	return priorityColors[priority] || 'bg-gray-500';
}

// 파일 크기 포맷팅 (KB 단위)
export function formatFileSize(size: string | number): string {
	if (!size) return '-';
	const sizeNum = typeof size === 'string' ? parseInt(size) : size;
	if (isNaN(sizeNum)) return '-';
	if (sizeNum < 1024) {
		return `${sizeNum} B`;
	} else if (sizeNum < 1024 * 1024) {
		return `${(sizeNum / 1024).toFixed(1)} KB`;
	} else {
		return `${(sizeNum / (1024 * 1024)).toFixed(1)} MB`;
	}
}

// 검사 결과 텍스트 반환
export function getCheckResultText(checkResult: string | null): string {
	if (!checkResult) return '검사 대기';
	const resultTexts: Record<string, string> = {
		success: '검사 성공',
		not_started: '검사 대기',
		failed: '검사 실패',
		error: '검사 오류'
	};
	return resultTexts[checkResult] || '검사 대기';
}

// 검사 결과 색상 반환
export function getCheckResultColor(checkResult: string | null): string {
	if (!checkResult) return 'bg-gray-100 text-gray-800';
	const resultColors: Record<string, string> = {
		success: 'bg-green-100 text-green-800',
		not_started: 'bg-yellow-100 text-yellow-800',
		failed: 'bg-red-100 text-red-800',
		error: 'bg-red-100 text-red-800'
	};
	return resultColors[checkResult] || 'bg-gray-100 text-gray-800';
}

// 카테고리별 색상 반환
export function getCategoryColor(category: PrintCategory): string {
	const categoryColors: Record<PrintCategory, string> = {
		Zirconia: 'bg-blue-100 text-blue-800',
		Etc: 'bg-gray-100 text-gray-800',
		H_Inlay: 'bg-green-100 text-green-800',
		Zig: 'bg-purple-100 text-purple-800',
		Model: 'bg-orange-100 text-orange-800',
		Abutment: 'bg-pink-100 text-pink-800',
		Resin: 'bg-indigo-100 text-indigo-800',
		Onlay: 'bg-teal-100 text-teal-800'
	};
	return categoryColors[category] || 'bg-gray-100 text-gray-800';
}

// 카테고리 한글명 반환
export function getCategoryText(category: PrintCategory): string {
	const categoryTexts: Record<PrintCategory, string> = {
		Zirconia: '지르코니아',
		Etc: '기타',
		H_Inlay: 'h인레이',
		Zig: '지그',
		Model: '모델',
		Abutment: '어버트먼트',
		Resin: '레진',
		Onlay: '온레이'
	};
	return categoryTexts[category] || category;
}

// 필터 옵션 상수
export const FOLDER_OPTIONS = [
	{ value: '', label: '전체' },
	{ value: 'urgent', label: '긴급' },
	{ value: 'normal', label: '일반' }
];

export const CATEGORY_OPTIONS = [
	{ value: '', label: '전체' },
	{ value: 'Zirconia', label: '지르코니아' },
	{ value: 'Model', label: '모델' },
	{ value: 'Abutment', label: '어버트먼트' },
	{ value: 'Resin', label: '레진' },
	{ value: 'Onlay', label: '온레이' },
	{ value: 'Etc', label: '기타' },
	{ value: 'H_Inlay', label: 'h인레이' },
	{ value: 'Zig', label: '지그' }
];

export const STATUS_OPTIONS = [
	{ value: '', label: '전체' },
	{ value: 'processing', label: '처리중' },
	{ value: 'completed', label: '완료' },
	{ value: 'error', label: '오류' },
	{ value: 'received', label: '수신됨' }
];

// 기본 진행률 바 데이터
export const DEFAULT_PROGRESS_BAR_DATA = [
	{
		title: '오늘 출력물',
		percent: 32.5,
		remaining: 650,
		total: 2000,
		barColor: 'bg-blue-500'
	},
	{
		title: '긴급 출력물',
		percent: 15.2,
		remaining: 320,
		total: 2100,
		barColor: 'bg-red-500'
	},
	{
		title: '전날 출력물',
		percent: 32.5,
		remaining: 650,
		total: 2000,
		barColor: 'bg-green-500'
	},
	{
		title: '이번달 출력물',
		percent: 32.5,
		remaining: 650,
		total: 2000,
		barColor: 'bg-yellow-500'
	}
];
