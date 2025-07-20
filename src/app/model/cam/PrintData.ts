// CAM 출력물 상태 타입
export type PrintStatus =
	| 'received'
	| 'processing'
	| 'completed'
	| 'error'
	| 'paused'
	| 'waiting'
	| 'printing'
	| 'unknown';

// CAM 출력물 우선순위 타입
export type PrintPriority = 'high' | 'urgent' | 'normal' | 'low';

// CAM 출력물 폴더 타입
export type FolderType = 'urgent' | 'normal';

// CAM 출력물 카테고리 타입
export type PrintCategory =
	| 'Zirconia'
	| 'Etc'
	| 'H_Inlay'
	| 'Zig'
	| 'Model'
	| 'Abutment'
	| 'Resin'
	| 'Onlay';

// CAM 출력물 데이터 인터페이스
export interface PrintItem {
	id: string;
	fileName: string;
	status: PrintStatus;
	progress: number;
	startTime?: string;
	estimatedTime?: string;
	processingStartedAt?: string;
	processingCompletedAt?: string;
	priority: PrintPriority;
	folderType: FolderType;
	fileSize?: string | number;
	fileExtension?: string;
	receivedAt?: string;
	receivedBy?: string;
	checkResult?: string | null;
	downloadStatus?: string;
	directory?: string;
	category?: PrintCategory;
}

// 진행률 바 데이터 인터페이스
export interface ProgressBarData {
	title: string;
	percent: number;
	remaining: number;
	total: number;
	barColor: string;
}

// 실시간 진행률 데이터 인터페이스
export interface ProgressData {
	today?: {
		percent: number;
		remaining: number;
		total: number;
	};
	urgent?: {
		percent: number;
		remaining: number;
		total: number;
	};
	processing?: {
		percent: number;
		remaining: number;
		total: number;
	};
	completed?: {
		percent: number;
		remaining: number;
		total: number;
	};
	totalAmount?: number;
	remainingAmount?: number;
}

// 필터 옵션 인터페이스
export interface FilterOption {
	value: string;
	label: string;
}

// 폴더 모니터링 상태 인터페이스
export interface FolderMonitorStatus {
	urgent: boolean;
	normal: boolean;
}

// 폴더 모니터링 알림 인터페이스
export interface FolderMonitorNotification {
	message: string;
	type: 'info' | 'warning' | 'error' | 'success';
	timestamp: Date;
}
