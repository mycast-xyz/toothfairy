import { writable, type Writable } from 'svelte/store';
import {
	camSocketService,
	camSocketConnected,
	camSocketError,
	camPrintStatusData,
	camPrintProgressData,
	folderMonitorStatus,
	folderMonitorNotification
} from './CamSocketService';
import { toastStore } from '../ToastService';
import {
	downloadCamFileById,
	downloadCamFilesAsZip,
	completeCamFileById,
	fetchCamProgressFromApi,
	fetchCamPrintListFromApi,
	type CamFilterParams
} from './CamDataService';
import type {
	PrintItem,
	ProgressBarData,
	ProgressData,
	PrintPriority,
	PrintCategory
} from '../../model/cam/PrintData';
import {
	getStatusText,
	getCategoryText,
	DEFAULT_PROGRESS_BAR_DATA
} from '../../model/cam/PrintUtils';

export class CamPrintViewService {
	// 상태 스토어
	private _selectedItems: Writable<string[]> = writable([]);
	private _isConnected: Writable<boolean> = writable(false);
	private _connectionError: Writable<string | null> = writable(null);
	private _realtimePrintData: Writable<PrintItem[]> = writable([]);
	private _realtimeProgressData: Writable<ProgressData> = writable({});
	private _progressBarData: Writable<ProgressBarData[]> = writable(DEFAULT_PROGRESS_BAR_DATA);
	private _printListData: Writable<PrintItem[]> = writable([]);
	private _originalPrintListData: Writable<PrintItem[]> = writable([]);
	private _searchQuery: Writable<string> = writable('');
	private _statusFilter: Writable<string> = writable('');
	private _folderFilter: Writable<string> = writable('');
	private _categoryFilter: Writable<string> = writable('');
	private _startDate: Writable<string> = writable('');
	private _endDate: Writable<string> = writable('');
	private _unifiedMonitorActive: Writable<boolean> = writable(false);
	private _totalAmount: Writable<number> = writable(0);
	private _remainingAmount: Writable<number> = writable(0);

	// 디바운싱을 위한 타이머
	private progressUpdateTimer: number | null = null;

	// 구독 해제 함수들
	private unsubscribeConnected?: () => void;
	private unsubscribeError?: () => void;
	private unsubscribeStatus?: () => void;
	private unsubscribeProgress?: () => void;
	private unsubscribeFolderStatus?: () => void;
	private unsubscribeFolderNotification?: () => void;

	// 스토어 getter
	get selectedItems() {
		return this._selectedItems;
	}
	get isConnected() {
		return this._isConnected;
	}
	get connectionError() {
		return this._connectionError;
	}
	get realtimePrintData() {
		return this._realtimePrintData;
	}
	get realtimeProgressData() {
		return this._realtimeProgressData;
	}
	get progressBarData() {
		return this._progressBarData;
	}
	get printListData() {
		return this._printListData;
	}
	get originalPrintListData() {
		return this._originalPrintListData;
	}
	get searchQuery() {
		return this._searchQuery;
	}
	get statusFilter() {
		return this._statusFilter;
	}
	get folderFilter() {
		return this._folderFilter;
	}
	get categoryFilter() {
		return this._categoryFilter;
	}
	get startDate() {
		return this._startDate;
	}
	get endDate() {
		return this._endDate;
	}
	get unifiedMonitorActive() {
		return this._unifiedMonitorActive;
	}
	get totalAmount() {
		return this._totalAmount;
	}
	get remainingAmount() {
		return this._remainingAmount;
	}

	// 진행율 계산
	get progressPercent() {
		let total = 0;
		let remaining = 0;
		this._totalAmount.subscribe((val) => (total = val))();
		this._remainingAmount.subscribe((val) => (remaining = val))();
		return total > 0 ? Math.round(((total - remaining) / total) * 100) : 0;
	}

	// 전체 선택 상태
	get allSelected() {
		let printList: PrintItem[] = [];
		let selected: string[] = [];
		this._printListData.subscribe((val) => (printList = val))();
		this._selectedItems.subscribe((val) => (selected = val))();
		return printList.length > 0 && selected.length === printList.length;
	}

	// 초기화
	async initialize(initialData: any) {
		if (initialData.initialPrintData) {
			this._realtimePrintData.set(initialData.initialPrintData);
			this.updatePrintListData();
		}

		// 초기 진행률 데이터를 API에서 가져오기
		try {
			await this.updateProgressBarData();
		} catch (error) {
			console.error('❌ 초기 진행률 데이터 로드 실패:', error);
			// 에러 발생 시 초기 데이터 사용
			if (initialData.initialProgressData) {
				this._realtimeProgressData.set(initialData.initialProgressData);
			}
		}
	}

	// 소켓 연결 및 구독 설정
	async connect() {
		// 소켓 서비스 수동 연결 시도
		console.log('🔗 CAM 소켓 서비스 연결 시도');
		await camSocketService.connect();

		// 통합 폴더 모니터링 자동 시작
		camSocketService.startUnifiedFolderMonitor();

		// 구독 등록
		this.unsubscribeConnected = camSocketConnected.subscribe((connected) => {
			this._isConnected.set(connected);
			if (connected) {
				// 소켓 연결 시 자동으로 데이터가 전송되므로 별도 요청 불필요
				console.log('🔗 CAM 소켓 연결됨 - 자동 데이터 수신 대기');
			} else {
				console.log('❌ CAM 소켓 연결 끊어짐');
			}
		});

		this.unsubscribeError = camSocketError.subscribe((error) => {
			this._connectionError.set(error);
			if (error) {
				toastStore.error(`CAM 소켓 연결 오류: ${error}`);
			}
		});

		this.unsubscribeStatus = camPrintStatusData.subscribe((data) => {
			console.log('[CamPrintViewService] camPrintStatusData 구독 데이터:', data.length, data);
			this._realtimePrintData.set(data);
			this.updatePrintListData();
			this._originalPrintListData.set([...data]);
		});

		this.unsubscribeProgress = camPrintProgressData.subscribe(async (data) => {
			this._realtimeProgressData.set(data);
			// 소켓 이벤트 발생 시 API에서 최신 진행률 데이터 가져오기
			try {
				await this.updateProgressBarData();
			} catch (error) {
				console.error('❌ 소켓 이벤트 후 진행률 데이터 업데이트 실패:', error);
			}
		});

		this.unsubscribeFolderStatus = folderMonitorStatus.subscribe((status) => {
			this._unifiedMonitorActive.set(!!(status.urgent || status.normal));
			console.log('📁 통합 폴더 모니터링 상태:', !!(status.urgent || status.normal));
		});

		this.unsubscribeFolderNotification = folderMonitorNotification.subscribe((notification) => {
			if (notification) {
				console.log('📢 폴더 모니터링 알림:', notification);
				setTimeout(() => {
					folderMonitorNotification.set(null);
				}, 3000);
			}
		});
	}

	// 연결 해제
	disconnect() {
		if (this.unsubscribeConnected) this.unsubscribeConnected();
		if (this.unsubscribeError) this.unsubscribeError();
		if (this.unsubscribeStatus) this.unsubscribeStatus();
		if (this.unsubscribeProgress) this.unsubscribeProgress();
		if (this.unsubscribeFolderStatus) this.unsubscribeFolderStatus();
		if (this.unsubscribeFolderNotification) this.unsubscribeFolderNotification();

		// 타이머 정리
		if (this.progressUpdateTimer) {
			clearTimeout(this.progressUpdateTimer);
			this.progressUpdateTimer = null;
		}
	}

	// 출력물 목록 데이터 업데이트
	private updatePrintListData() {
		let realtimeData: PrintItem[] = [];
		this._realtimePrintData.subscribe((val) => (realtimeData = val))();

		if (realtimeData && realtimeData.length > 0) {
			const mappedData = realtimeData.map((item) => ({
				id: item.id,
				fileName: item.fileName || '알 수 없는 파일',
				status: item.status || 'unknown',
				progress: item.progress || 0,
				startTime: item.processingStartedAt || item.startTime,
				estimatedTime: item.processingCompletedAt || item.estimatedTime,
				processingStartedAt: item.processingStartedAt,
				processingCompletedAt: item.processingCompletedAt,
				priority: (item.folderType === 'urgent' ? 'urgent' : 'normal') as PrintPriority,
				folderType: item.folderType,
				fileSize: item.fileSize,
				fileExtension: item.fileExtension,
				receivedAt: item.receivedAt,
				receivedBy: item.receivedBy,
				checkResult: item.checkResult,
				downloadStatus: item.downloadStatus,
				directory: item.directory || '',
				category: item.category as PrintCategory | undefined
			}));
			this._printListData.set(mappedData);
			this._originalPrintListData.set([...mappedData]);
		} else {
			this._printListData.set([]);
			this._originalPrintListData.set([]);
		}
	}

	// 진행률 바 데이터 업데이트 (API 호출 - 디바운싱 적용)
	private async updateProgressBarData() {
		// 디바운싱: 1000ms 내에 연속 호출되면 마지막 호출만 실행
		if (this.progressUpdateTimer) {
			clearTimeout(this.progressUpdateTimer);
		}

		return new Promise<void>((resolve) => {
			this.progressUpdateTimer = setTimeout(async () => {
				try {
					// API에서 진행률 데이터 가져오기
					const progressData = await fetchCamProgressFromApi();

					if (progressData) {
						this.updateProgressBarDataFromData(progressData);
						console.log('📊 API에서 진행률 바 데이터 업데이트 완료 (디바운싱 적용)');
					}
				} catch (error) {
					console.error('❌ 진행률 데이터 업데이트 실패:', error);
					this.setDefaultProgressBarData();
				} finally {
					this.progressUpdateTimer = null;
					resolve();
				}
			}, 1000);
		});
	}

	// 진행률 바 데이터 업데이트 (공통 로직)
	private updateProgressBarDataFromData(progressData: any) {
		const newProgressBarData = [
			{
				title: '일반 출력물',
				percent: progressData.today?.percent ?? 0,
				remaining: progressData.today?.remaining ?? 0,
				total: progressData.today?.total ?? 0,
				barColor: 'bg-blue-500'
			},
			{
				title: '긴급 출력물',
				percent: progressData.urgent?.percent ?? 0,
				remaining: progressData.urgent?.remaining ?? 0,
				total: progressData.urgent?.total ?? 0,
				barColor: 'bg-red-500'
			},
			{
				title: '다운로드 출력물',
				percent: progressData.processing?.percent ?? 0,
				remaining: progressData.processing?.remaining ?? 0,
				total: progressData.processing?.total ?? 0,
				barColor: 'bg-yellow-500'
			},
			{
				title: '완료 출력물',
				percent: progressData.completed?.percent ?? 0,
				remaining: progressData.completed?.remaining ?? 0,
				total: progressData.completed?.total ?? 0,
				barColor: 'bg-green-500'
			}
		];

		this._progressBarData.set(newProgressBarData);
		this._totalAmount.set(progressData.totalAmount ?? 0);
		this._remainingAmount.set(progressData.remainingAmount ?? 0);
	}

	// 기본 진행률 바 데이터 설정
	private setDefaultProgressBarData() {
		const defaultProgressBarData = [
			{
				title: '오늘 출력물',
				percent: 0,
				remaining: 0,
				total: 0,
				barColor: 'bg-blue-500'
			},
			{
				title: '긴급 출력물',
				percent: 0,
				remaining: 0,
				total: 0,
				barColor: 'bg-red-500'
			},
			{
				title: '다운로드 출력물',
				percent: 0,
				remaining: 0,
				total: 0,
				barColor: 'bg-yellow-500'
			},
			{
				title: '완료 출력물',
				percent: 0,
				remaining: 0,
				total: 0,
				barColor: 'bg-green-500'
			}
		];

		this._progressBarData.set(defaultProgressBarData);
		this._totalAmount.set(0);
		this._remainingAmount.set(0);
	}

	// 선택된 아이템 관리
	toggleAll(isChecked: boolean) {
		let printList: PrintItem[] = [];
		this._printListData.subscribe((val) => (printList = val))();

		if (isChecked) {
			this._selectedItems.set(printList.map((item) => item.id));
		} else {
			this._selectedItems.set([]);
		}
	}

	toggleItem(itemId: string, isChecked: boolean) {
		let selected: string[] = [];
		this._selectedItems.subscribe((val) => (selected = val))();

		if (isChecked) {
			if (!selected.includes(itemId)) {
				this._selectedItems.set([...selected, itemId]);
			}
		} else {
			this._selectedItems.set(selected.filter((id) => id !== itemId));
		}
	}

	// 필터링 (API 호출)
	async filterPrintList() {
		let searchQuery = '';
		let statusFilter = '';
		let folderFilter = '';
		let categoryFilter = '';
		let startDate = '';
		let endDate = '';

		this._searchQuery.subscribe((val) => (searchQuery = val))();
		this._statusFilter.subscribe((val) => (statusFilter = val))();
		this._folderFilter.subscribe((val) => (folderFilter = val))();
		this._categoryFilter.subscribe((val) => (categoryFilter = val))();
		this._startDate.subscribe((val) => (startDate = val))();
		this._endDate.subscribe((val) => (endDate = val))();

		console.log('🔍 필터링 시작', {
			statusFilter,
			folderFilter,
			categoryFilter,
			searchQuery,
			startDate,
			endDate
		});

		try {
			// 필터 파라미터 구성
			const filterParams: CamFilterParams = {};

			if (searchQuery.trim()) {
				// 파일명 검색은 filename 파라미터로 전송(백엔드에서 파일명 필드 매칭).
				// (기존엔 title로 보내 카테고리 필드와 충돌·덮어써지는 버그가 있었음)
				filterParams.filename = searchQuery.trim();
			}
			if (statusFilter) {
				filterParams.status = statusFilter;
			}
			if (folderFilter) {
				filterParams.folderType = folderFilter;
			}
			if (categoryFilter) {
				filterParams.title = categoryFilter; // 카테고리 필터는 title 파라미터(카테고리/폴더 필드)
			}
			if (startDate) {
				filterParams.startDate = startDate;
			}
			if (endDate) {
				filterParams.endDate = endDate;
			}

			// API 호출로 필터링된 데이터 가져오기
			const result = await fetchCamPrintListFromApi(filterParams);

			if (result.printList) {
				this._printListData.set(result.printList);
				this._originalPrintListData.set([...result.printList]);
				console.log('✅ API 필터링 완료:', result.printList.length, '개 항목');
			}
		} catch (error) {
			console.error('❌ API 필터링 실패:', error);
			toastStore.error('필터링 중 오류가 발생했습니다.');
		}
	}

	async clearSearch() {
		this._searchQuery.set('');
		this._statusFilter.set('');
		this._folderFilter.set('');
		this._categoryFilter.set('');
		this._startDate.set('');
		this._endDate.set('');

		try {
			// 필터 초기화 후 전체 데이터 다시 가져오기
			const result = await fetchCamPrintListFromApi();

			if (result.printList) {
				this._printListData.set(result.printList);
				this._originalPrintListData.set([...result.printList]);
				console.log('✅ 필터 초기화 완료:', result.printList.length, '개 항목');
			}
		} catch (error) {
			console.error('❌ 필터 초기화 실패:', error);
			toastStore.error('필터 초기화 중 오류가 발생했습니다.');
		}
	}

	// 폴더 모니터링
	startUnifiedFolderMonitoring() {
		camSocketService.startUnifiedFolderMonitor();
	}

	stopUnifiedFolderMonitoring() {
		camSocketService.stopUnifiedFolderMonitor();
	}

	// 출력물 작업
	async startPrintJob(fileId: string) {
		try {
			await completeCamFileById(fileId);
			this.refreshFromDB();
			toastStore.info('CAM 작업이 완료되었습니다.');
		} catch (error) {
			console.error('❌ CAM 작업 완료 처리 실패:', error);
			toastStore.error('CAM 작업 완료 처리에 실패했습니다.');
		}
	}

	stopPrintJob(jobId: string) {
		try {
			camSocketService.stopPrintJob(jobId);
			toastStore.warning('CAM 출력 작업이 중지되었습니다.');
		} catch (error) {
			console.error('❌ CAM 출력 작업 중지 실패:', error);
			toastStore.error('CAM 출력 작업 중지에 실패했습니다.');
		}
	}

	// 파일 다운로드
	async downloadFile(fileId: string) {
		try {
			await downloadCamFileById(fileId);
			toastStore.success('파일 다운로드를 시작합니다.');
			this.refreshFromDB();
		} catch (error) {
			toastStore.error('파일 다운로드에 실패했습니다.');
			console.error('❌ 파일 다운로드 오류:', error);
		}
	}

	async downloadSelectedFiles() {
		let selected: string[] = [];
		this._selectedItems.subscribe((val) => (selected = val))();

		if (selected.length === 0) {
			toastStore.warning('다운로드할 파일을 선택해주세요.');
			return;
		}

		try {
			toastStore.info(`${selected.length}개의 파일을 ZIP으로 다운로드합니다.`);
			await downloadCamFilesAsZip(selected);
			this.refreshFromDB();
		} catch (error) {
			toastStore.error('ZIP 파일 다운로드에 실패했습니다.');
		}
	}

	// DB 새로고침
	async refreshFromDB() {
		try {
			// 현재 필터 상태 가져오기
			let searchQuery = '';
			let statusFilter = '';
			let folderFilter = '';
			let categoryFilter = '';
			let startDate = '';
			let endDate = '';

			this._searchQuery.subscribe((val) => (searchQuery = val))();
			this._statusFilter.subscribe((val) => (statusFilter = val))();
			this._folderFilter.subscribe((val) => (folderFilter = val))();
			this._categoryFilter.subscribe((val) => (categoryFilter = val))();
			this._startDate.subscribe((val) => (startDate = val))();
			this._endDate.subscribe((val) => (endDate = val))();

			// 필터 파라미터 구성
			const filterParams: CamFilterParams = {};
			if (searchQuery.trim()) filterParams.filename = searchQuery.trim();
			if (statusFilter) filterParams.status = statusFilter;
			if (folderFilter) filterParams.folderType = folderFilter;
			if (categoryFilter) filterParams.title = categoryFilter; // 카테고리 필터 추가
			if (startDate) filterParams.startDate = startDate;
			if (endDate) filterParams.endDate = endDate;

			// 필터링된 상태로 데이터 새로고침
			await Promise.all([
				this.refreshPrintListWithFilter(filterParams),
				this.updateProgressBarData()
			]);
			console.log('✅ DB 새로고침 완료 (필터링된 출력물 리스트 + 진행률 데이터)');
		} catch (error) {
			console.error('❌ DB에서 출력물 리스트 가져오기 실패:', error);
			toastStore.error('DB에서 출력물 리스트를 불러오는데 실패했습니다.');
		}
	}

	// 필터링된 상태로 출력물 리스트 새로고침
	private async refreshPrintListWithFilter(filterParams?: CamFilterParams) {
		try {
			const result = await fetchCamPrintListFromApi(filterParams);

			if (result.printList) {
				this._printListData.set(result.printList);
				this._originalPrintListData.set([...result.printList]);
				console.log('✅ 필터링된 출력물 리스트 새로고침 완료:', result.printList.length, '개 항목');
			}
		} catch (error) {
			console.error('❌ 필터링된 출력물 리스트 새로고침 실패:', error);
			throw error;
		}
	}

	// 모니터링 폴더 초기화
	async initializeMonitoringFolders(
		password: string
	): Promise<{ success: boolean; message: string }> {
		try {
			console.log('🔧 [CamPrintViewService] 모니터링 폴더 초기화 요청');

			// 소켓 서비스를 통해 초기화 실행
			const result = await camSocketService.initializeMonitoringFolders(password);

			// 초기화 완료 후 데이터 새로고침
			if (result.success) {
				console.log('✅ 모니터링 폴더 초기화 성공 - 데이터 새로고침');
				await this.refreshFromDB();
			}

			return result;
		} catch (error) {
			console.error('❌ [CamPrintViewService] 모니터링 폴더 초기화 실패:', error);
			throw error;
		}
	}
}

// 싱글톤 인스턴스
export const camPrintViewService = new CamPrintViewService();
