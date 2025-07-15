<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { getFilteredMenus } from '../../../app/model/user/UserRole';
	import ProgressBar from '../../../app/view/components/progressBar/ProgressBar.svelte';
	import type { PageData } from './$types';
	import {
		camSocketService,
		camSocketConnected,
		camSocketError,
		camPrintStatusData,
		camPrintProgressData,
		folderMonitorStatus,
		folderMonitorNotification
	} from '../../../app/service/CamSocketService';
	import { toastStore } from '../../../app/service/ToastService';
	import {
		downloadCamFileById,
		downloadCamFilesAsZip,
		completeCamFileById
	} from '../../../app/service/CamDataService';
	import DropdownFilter from '../../../app/view/components/DropdownFilter.svelte';

	// 페이지 데이터 받기
	export let data: PageData;

	// 선택된 아이템 관리 (Set은 Svelte에서 양방향 바인딩이 불가하므로 배열로 변경)
	let selectedItems: string[] = [];

	// 전체 선택/해제
	function toggleAll(e: Event) {
		const isChecked = (e.target as HTMLInputElement).checked;
		if (isChecked) {
			selectedItems = printListData.map((item) => item.id);
		} else {
			selectedItems = [];
		}
	}

	// 전체 선택 상태
	$: allSelected = printListData.length > 0 && selectedItems.length === printListData.length;

	// 토스트 메시지 표시 함수
	const showToast = (type: 'success' | 'error' | 'info' | 'warning', message: string) => {
		toastStore[type](message);
	};

	// 소켓 연결 상태
	let isConnected = false;
	let connectionError: string | null = null;

	// 실시간 데이터
	let realtimePrintData: any[] = data.initialPrintData || [];
	let realtimeProgressData: any = data.initialProgressData || {};

	// 기존 정적 데이터 (소켓 연결 실패 시 폴백용)
	let progressBarData = [
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

	// 출력물 목록 데이터
	let printListData: any[] = data.initialPrintData || [];

	// 총 출력물 양(totalAmount)과 남은 출력 가능 양(remainingAmount)을 기준으로 진행율을 계산
	let totalAmount = 2000; // 예시: 총 출력 가능 양
	let remainingAmount = 650; // 예시: 남은 출력 가능 양

	// 진행율(%) 계산
	$: progressPercent =
		totalAmount > 0 ? Math.round(((totalAmount - remainingAmount) / totalAmount) * 100) : 0;

	// 초기 데이터로 UI 업데이트
	$: if (data.initialPrintData) {
		realtimePrintData = data.initialPrintData;
		updatePrintListData();
	}

	$: if (data.initialProgressData) {
		realtimeProgressData = data.initialProgressData;
		updateProgressBarData();
	}

	// 반드시 모든 함수/블록보다 먼저 선언!
	let searchQuery: string = '';
	let originalPrintListData: any[] = [];
	let statusFilter: string = '';
	let folderFilter: string = '';
	let categoryFilter: string = '';

	// 초기 데이터로 UI 업데이트
	$: if (printListData && originalPrintListData.length === 0 && printListData.length > 0) {
		originalPrintListData = [...printListData];
	}

	// CAM 소켓 연결 상태 구독
	let unsubscribeConnected: () => void;
	let unsubscribeError: () => void;
	let unsubscribeStatus: () => void;
	let unsubscribeProgress: () => void;
	let unsubscribeFolderStatus: () => void;
	let unsubscribeFolderNotification: () => void;

	onMount(() => {
		// 사용자 권한 확인
		if (!data.user) {
			showToast('error', '로그인이 필요합니다.');
			return;
		}

		console.log('🔍 CAM Print 페이지 사용자 정보:', data.user);
		console.log('🔍 사용자 역할:', data.user.role);

		// 초기 데이터 로드 확인 - 토스트 제거, 콘솔 로그만
		if (data.initialPrintData && data.initialPrintData.length > 0) {
			console.log(`✅ 초기 데이터 로드 완료: ${data.initialPrintData.length}개 출력물`);
		} else if (data.initialPrintData && data.initialPrintData.length === 0) {
			console.log('ℹ️ 현재 출력 대기 중인 작업이 없습니다.');
		}

		// 페이지 진입 시 연결 상태 확인 - 토스트 제거
		if (!isConnected) {
			console.log('⚠️ 실시간 연결을 시도 중입니다. 잠시만 기다려주세요.');
		}
		// 페이지 진입 시 폴더 모니터링 자동 시작
		camSocketService.startFolderMonitor('urgent');
		camSocketService.startFolderMonitor('normal');

		// 구독 등록
		unsubscribeConnected = camSocketConnected.subscribe((connected) => {
			isConnected = connected;
			if (connected) {
				// 연결 성공 토스트 제거 (UI에서 연결 상태가 표시되므로)
				// showToast('success', 'CAM 실시간 연결이 활성화되었습니다.');
				// 연결 후 최신 데이터 요청
				camSocketService.requestPrintStatus();
				camSocketService.requestPrintProgress();
			}
		});

		unsubscribeError = camSocketError.subscribe((error) => {
			connectionError = error;
			if (error) {
				// 에러 토스트는 유지 (중요한 정보)
				showToast('error', `CAM 소켓 연결 오류: ${error}`);
			}
		});

		unsubscribeStatus = camPrintStatusData.subscribe((data) => {
			console.log('camPrintStatusData 구독 데이터:', data.length, data);
			realtimePrintData = data;
			updatePrintListData();
			originalPrintListData = [...data]; // 항상 최신화!
			console.log(
				'originalPrintListData(갱신):',
				originalPrintListData.length,
				originalPrintListData
			);
		});

		unsubscribeProgress = camPrintProgressData.subscribe((data) => {
			realtimeProgressData = data;
			updateProgressBarData();
		});

		unsubscribeFolderStatus = folderMonitorStatus.subscribe((status) => {
			console.log('📁 폴더 모니터링 상태 업데이트:', status);
		});

		unsubscribeFolderNotification = folderMonitorNotification.subscribe((notification) => {
			if (notification) {
				// 토스트 제거, 콘솔 로그만 유지
				console.log('📢 폴더 모니터링 알림:', notification);
				// 알림 표시 후 3초 후에 알림 초기화
				setTimeout(() => {
					folderMonitorNotification.set(null);
				}, 3000);
			}
		});
	});

	onDestroy(() => {
		// 페이지 이탈 시 구독 해제
		if (typeof unsubscribeConnected === 'function') unsubscribeConnected();
		if (typeof unsubscribeError === 'function') unsubscribeError();
		if (typeof unsubscribeStatus === 'function') unsubscribeStatus();
		if (typeof unsubscribeProgress === 'function') unsubscribeProgress();
		if (typeof unsubscribeFolderStatus === 'function') unsubscribeFolderStatus();
		if (typeof unsubscribeFolderNotification === 'function') unsubscribeFolderNotification();
	});

	// 출력물 목록 데이터 업데이트
	function updatePrintListData() {
		if (realtimePrintData && realtimePrintData.length > 0) {
			printListData = realtimePrintData.map((item) => ({
				id: item.id,
				fileName: item.fileName || '알 수 없는 파일',
				status: item.status || 'unknown',
				progress: item.progress || 0,
				startTime: item.processingStartedAt || item.startTime,
				estimatedTime: item.processingCompletedAt || item.estimatedTime,
				priority: item.folderType === 'urgent' ? 'urgent' : 'normal',
				folderType: item.folderType,
				fileSize: item.fileSize,
				fileExtension: item.fileExtension,
				receivedAt: item.receivedAt,
				receivedBy: item.receivedBy,
				checkResult: item.checkResult,
				downloadStatus: item.downloadStatus,
				directory: item.directory || '',
				category: item.category || ''
			}));
			originalPrintListData = [...printListData];
		} else {
			printListData = [];
			originalPrintListData = [];
		}
	}

	// 진행률 바 데이터 업데이트
	function updateProgressBarData() {
		if (realtimeProgressData) {
			// 실시간 데이터로 진행률 바 업데이트
			progressBarData = [
				{
					title: '오늘 출력물',
					percent: realtimeProgressData.today?.percent || 32.5,
					remaining: realtimeProgressData.today?.remaining || 650,
					total: realtimeProgressData.today?.total || 2000,
					barColor: 'bg-blue-500'
				},
				{
					title: '긴급 출력물',
					percent: realtimeProgressData.urgent?.percent || 15.2,
					remaining: realtimeProgressData.urgent?.remaining || 320,
					total: realtimeProgressData.urgent?.total || 2100,
					barColor: 'bg-red-500'
				},
				{
					title: '전날 출력물',
					percent: realtimeProgressData.yesterday?.percent || 32.5,
					remaining: realtimeProgressData.yesterday?.remaining || 650,
					total: realtimeProgressData.yesterday?.total || 2000,
					barColor: 'bg-green-500'
				},
				{
					title: '이번달 출력물',
					percent: realtimeProgressData.monthly?.percent || 32.5,
					remaining: realtimeProgressData.monthly?.remaining || 650,
					total: realtimeProgressData.monthly?.total || 2000,
					barColor: 'bg-yellow-500'
				}
			];

			// 전체 통계 업데이트
			totalAmount = realtimeProgressData.totalAmount || 2000;
			remainingAmount = realtimeProgressData.remainingAmount || 650;
		}
	}

	// 출력물 작업 시작
	async function startPrintJob(fileId: string) {
		try {
			await completeCamFileById(fileId);
			refreshFromDB();
			showToast('info', 'CAM 작업이 완료되었습니다.');
		} catch (error) {
			console.error('❌ CAM 작업 완료 처리 실패:', error);
			showToast('error', 'CAM 작업 완료 처리에 실패했습니다.');
		}
	}

	// 출력물 작업 중지
	function stopPrintJob(jobId: string) {
		try {
			camSocketService.stopPrintJob(jobId);
			showToast('warning', 'CAM 출력 작업이 중지되었습니다.');
		} catch (error) {
			console.error('❌ CAM 출력 작업 중지 실패:', error);
			showToast('error', 'CAM 출력 작업 중지에 실패했습니다.');
		}
	}

	// 출력물 상태에 따른 색상 반환
	function getStatusColor(status: string) {
		const statusColors: Record<string, string> = {
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
	function getStatusText(status: string) {
		const statusTexts: Record<string, string> = {
			received: '수신됨',
			processing: '처리중',
			completed: '완료',
			error: '오류',
			paused: '일시정지',
			waiting: '대기중',
			printing: '출력중',
			unknown: '알 수 없음'
		};
		return statusTexts[status] || '알 수 없음';
	}

	// 우선순위에 따른 색상 반환
	function getPriorityColor(priority: string) {
		const priorityColors: Record<string, string> = {
			high: 'bg-red-500',
			urgent: 'bg-red-600',
			normal: 'bg-blue-500',
			low: 'bg-gray-500'
		};
		return priorityColors[priority] || 'bg-gray-500';
	}

	// 파일 크기 포맷팅 (KB 단위)
	function formatFileSize(size: string | number): string {
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
	function getCheckResultText(checkResult: string | null): string {
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
	function getCheckResultColor(checkResult: string | null): string {
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
	function getCategoryColor(category: string): string {
		const categoryColors: Record<string, string> = {
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
	function getCategoryText(category: string): string {
		const categoryTexts: Record<string, string> = {
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

	// 폴더 모니터링 시작
	function startFolderMonitoring(folderType: 'urgent' | 'normal') {
		camSocketService.startFolderMonitor(folderType);
		// 토스트 제거 (UI에서 상태가 표시되므로)
		// showToast('info', `${folderType === 'urgent' ? '긴급' : '일반'} 폴더 모니터링을 시작합니다.`);
	}

	// 폴더 모니터링 중지
	function stopFolderMonitoring(folderType: 'urgent' | 'normal') {
		camSocketService.stopFolderMonitor(folderType);
		// 토스트 제거 (UI에서 상태가 표시되므로)
		// showToast('warning', `${folderType === 'urgent' ? '긴급' : '일반'} 폴더 모니터링을 중지합니다.`);
	}

	// 수동으로 DB에서 최신 리스트 요청
	async function refreshFromDB() {
		try {
			await camSocketService.refreshPrintListFromDB();
			// 반환값을 사용하지 않으므로 관련 if문/console.log 제거
		} catch (error) {
			console.error('❌ DB에서 출력물 리스트 가져오기 실패:', error);
			toastStore.error('DB에서 출력물 리스트를 불러오는데 실패했습니다.');
		}
	}

	// 파일 다운로드
	async function downloadFile(fileId: string) {
		try {
			await downloadCamFileById(fileId);
			toastStore.success('파일 다운로드를 시작합니다.');
			refreshFromDB();
		} catch (error) {
			toastStore.error('파일 다운로드에 실패했습니다.');
			console.error('❌ 파일 다운로드 오류:', error);
		}
	}

	// 선택된 파일 일괄 다운로드 (ZIP)
	async function downloadSelectedFiles() {
		if (selectedItems.length === 0) {
			toastStore.warning('다운로드할 파일을 선택해주세요.');
			return;
		}

		try {
			toastStore.info(`${selectedItems.length}개의 파일을 ZIP으로 다운로드합니다.`);
			await downloadCamFilesAsZip(selectedItems);
			refreshFromDB();
		} catch (error) {
			toastStore.error('ZIP 파일 다운로드에 실패했습니다.');
		}
	}

	function filterPrintList() {
		console.log('필터링 시작', { statusFilter, folderFilter, categoryFilter, searchQuery });
		console.log('originalPrintListData', originalPrintListData);
		let filtered = [...originalPrintListData];

		if (searchQuery.trim()) {
			const query = searchQuery.trim().toLowerCase();
			filtered = filtered.filter(
				(item) =>
					(item.fileName && item.fileName.toLowerCase().includes(query)) ||
					(item.directory && item.directory.toLowerCase().includes(query)) ||
					(item.status && getStatusText(item.status).toLowerCase().includes(query)) ||
					(item.folderType && item.folderType.toLowerCase().includes(query)) ||
					(item.category && getCategoryText(item.category).toLowerCase().includes(query))
			);
		}
		if (statusFilter) {
			filtered = filtered.filter((item) => item.status === statusFilter);
		}
		if (folderFilter) {
			filtered = filtered.filter((item) => item.folderType === folderFilter);
		}
		if (categoryFilter) {
			filtered = filtered.filter((item) => item.category === categoryFilter);
		}
		printListData = filtered;
		console.log('필터링 결과', printListData);
	}

	function clearSearch() {
		searchQuery = '';
		statusFilter = '';
		folderFilter = '';
		categoryFilter = '';
		printListData = [...originalPrintListData];
	}

	const folderOptions = [
		{ value: '', label: '전체' },
		{ value: 'urgent', label: '긴급' },
		{ value: 'normal', label: '일반' }
	];
	const categoryOptions = [
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
	const statusOptions = [
		{ value: '', label: '전체' },
		{ value: 'processing', label: '처리중' },
		{ value: 'completed', label: '완료' },
		{ value: 'error', label: '오류' },
		{ value: 'received', label: '수신됨' }
	];
</script>

<main class="ml-64 mt-8 min-h-screen flex-1 bg-gray-100 p-8">
	<article class="progress-bar mb-4 flex w-full flex-row">
		{#each progressBarData as data (data.title)}
			<ProgressBar
				title={data.title}
				percent={data.percent}
				remaining={data.remaining}
				total={data.total}
				barColor={data.barColor}
			/>
		{/each}
	</article>
	<article class="w-full pl-3 pr-5 pt-3">
		<!-- 연결 상태 표시 -->
		{#if connectionError}
			<div class="mb-4 rounded-lg bg-red-100 p-4 text-red-700">
				<strong>연결 오류:</strong>
				{connectionError}
			</div>
		{/if}

		<nav
			class="request-list content-nav-box block h-auto w-full rounded-lg border border-gray-200 bg-white px-4 py-3 shadow"
		>
			<div class="re-list-title flex w-full flex-row">
				<div class="box-title inline-block items-center">
					<h3 class="py-1 py-px text-3xl font-extrabold text-violet-500">출력물 목록</h3>
				</div>
				<div class="ml-auto flex flex-col">
					<!-- CAM 실시간 연결 상태 표시 -->
					<div class="mb-1 ml-auto flex items-center gap-2">
						<div
							class="flex h-3 w-3 rounded-full"
							style="background-color: {isConnected ? '#22c55e' : '#ef4444'}"
						></div>
						<span class="text-bas3 pt-2" style="color: {isConnected ? '#16a34a' : '#dc2626'}">
							{isConnected ? 'CAM 실시간 연결됨' : 'CAM 연결 중...'}
						</span>
					</div>
				</div>
			</div>
			<!-- 폴더 모니터링 컨트롤 -->
			<div class="mt-4 border-t border-gray-100 pt-4">
				<div class="flex items-center justify-between">
					<!-- 폴더 모니터링 컨트롤-->
					<div class="flex items-center space-x-4">
						<span class="text-sm font-medium text-gray-700">폴더 모니터링:</span>

						<!-- 긴급 폴더 모니터링 -->
						<div class="flex items-center space-x-2">
							<span class="text-sm text-gray-600">긴급</span>
							{#if $folderMonitorStatus && $folderMonitorStatus.urgent}
								<button
									on:click={() => stopFolderMonitoring('urgent')}
									class="rounded bg-red-500 px-3 py-1 text-xs text-white hover:bg-red-600"
								>
									중지
								</button>
								<div class="h-2 w-2 rounded-full bg-green-500"></div>
							{:else}
								<button
									on:click={() => startFolderMonitoring('urgent')}
									class="rounded bg-green-500 px-3 py-1 text-xs text-white hover:bg-green-600"
								>
									시작
								</button>
								<div class="h-2 w-2 rounded-full bg-gray-400"></div>
							{/if}
						</div>

						<!-- 일반 폴더 모니터링 -->
						<div class="flex items-center space-x-2">
							<span class="text-sm text-gray-600">일반</span>
							{#if $folderMonitorStatus && $folderMonitorStatus.normal}
								<button
									on:click={() => stopFolderMonitoring('normal')}
									class="rounded bg-red-500 px-3 py-1 text-xs text-white hover:bg-red-600"
								>
									중지
								</button>
								<div class="h-2 w-2 rounded-full bg-green-500"></div>
							{:else}
								<button
									on:click={() => startFolderMonitoring('normal')}
									class="rounded bg-green-500 px-3 py-1 text-xs text-white hover:bg-green-600"
								>
									시작
								</button>
								<div class="h-2 w-2 rounded-full bg-gray-400"></div>
							{/if}
						</div>
					</div>

					<div class="flex items-center space-x-2">
						<button
							on:click={refreshFromDB}
							class="rounded bg-blue-500 px-3 py-3 text-xs text-white hover:bg-blue-600"
						>
							DB 새로고침
						</button>
						<button
							on:click={downloadSelectedFiles}
							class="rounded bg-green-500 px-3 py-3 text-xs text-white hover:bg-green-600"
							disabled={selectedItems.length === 0}
						>
							선택 다운로드
						</button>
					</div>
				</div>
			</div>
		</nav>

		<!-- 실시간 출력물 목록 -->
		<article class="print-list mt-4">
			<div class=" rounded-lg border border-gray-200 bg-white shadow">
				<div class="flex flex-row">
					<!-- 검색 입력창 및 버튼 -->
					<div class="flex w-full items-center space-x-2 border-b border-gray-200 bg-gray-50 p-4">
						<input
							type="text"
							placeholder="파일명 검색"
							bind:value={searchQuery}
							class="w-64 rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
							on:keydown={(e) => {
								if (e.key === 'Enter') filterPrintList();
							}}
						/>
						<button
							class="rounded bg-violet-500 px-4 py-2 text-sm text-white hover:bg-violet-600"
							on:click={filterPrintList}
						>
							검색
						</button>
						{#if searchQuery}
							<button
								class="rounded bg-gray-300 px-2 py-2 text-xs text-gray-700 hover:bg-gray-400"
								on:click={clearSearch}
							>
								초기화
							</button>
						{/if}
					</div>
				</div>
				<table class="min-w-full divide-y divide-gray-200">
					<thead class="bg-gray-50">
						<tr>
							<th class="p-4">
								<div class="flex items-center">
									<input
										id="checkbox-all"
										type="checkbox"
										on:change={toggleAll}
										checked={allSelected}
										class="h-4 w-4 rounded border-gray-300 bg-gray-100 text-blue-600 focus:ring-2 focus:ring-blue-500"
									/>
									<label for="checkbox-all" class="sr-only">checkbox</label>
								</div>
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
							>
								<DropdownFilter
									label="폴더"
									options={folderOptions}
									selected={folderFilter}
									onSelect={(v) => {
										folderFilter = v;
										filterPrintList();
									}}
									bgColor="bg-gray-50"
									textColor="text-gray-500"
									hoverBgColor="bg-gray-100"
									hoverTextColor="text-gray-500"
								/>
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
							>
								<DropdownFilter
									label="카테고리"
									options={categoryOptions}
									selected={categoryFilter}
									onSelect={(v) => {
										categoryFilter = v;
										filterPrintList();
									}}
									bgColor="bg-gray-50"
									textColor="text-gray-500"
									hoverBgColor="bg-gray-100"
									hoverTextColor="text-gray-500"
								/>
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
							>
								디렉터리
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
							>
								파일명
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
							>
								<DropdownFilter
									label="상태"
									options={statusOptions}
									selected={statusFilter}
									onSelect={(v) => {
										statusFilter = v;
										filterPrintList();
									}}
									bgColor="bg-gray-50"
									textColor="text-gray-500"
									hoverBgColor="bg-gray-100"
									hoverTextColor="text-gray-500"
								/>
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
							>
								수신시간
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
							>
								작업확인
							</th>
						</tr>
					</thead>
					{#if printListData.length > 0}
						<tbody class="divide-y divide-gray-200 bg-white">
							{#each printListData as item (item.id)}
								<tr class="hover:bg-gray-50">
									<td class="p-4">
										<div class="flex items-center">
											<input
												type="checkbox"
												value={item.id}
												checked={selectedItems.includes(item.id)}
												disabled={item.status === 'completed'}
												on:change={(e) => {
													if (item.status === 'completed') return;
													const checked = (e.target as HTMLInputElement).checked;
													if (checked) {
														if (!selectedItems.includes(item.id)) {
															selectedItems = [...selectedItems, item.id];
														}
													} else {
														selectedItems = selectedItems.filter((id) => id !== item.id);
													}
												}}
												class="h-4 w-4 rounded border-gray-300 bg-gray-100 text-blue-600 focus:ring-2 focus:ring-blue-500"
												id={'checkbox-' + item.id}
											/>
											<label for={'checkbox-' + item.id} class="sr-only">checkbox</label>
										</div>
									</td>

									<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
										<span
											class="inline-flex rounded-full px-2 py-1 text-xs font-semibold {item.folderType ===
											'urgent'
												? 'bg-red-100 text-red-800'
												: 'bg-blue-100 text-blue-800'}"
										>
											{item.folderType === 'urgent' ? '긴급' : '일반'}
										</span>
									</td>
									<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
										{#if item.category}
											<span
												class="inline-flex rounded-full px-2 py-1 text-xs font-semibold {getCategoryColor(
													item.category
												)}"
											>
												{getCategoryText(item.category)}
											</span>
										{:else}
											-
										{/if}
									</td>
									<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
										{#if item.directory}
											<span class="text-xs text-gray-600">{item.directory}</span>
										{:else}
											-
										{/if}
									</td>
									<td class="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
										{#if item.status === 'completed'}
											<span class="cursor-not-allowed text-gray-400">{item.fileName}</span>
										{:else}
											<a
												href="#"
												on:click|preventDefault={() => downloadFile(item.id)}
												class="cursor-pointer text-blue-600 hover:underline"
											>
												{item.fileName}
											</a>
										{/if}
									</td>
									<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
										<span
											class="inline-flex rounded-full px-2 py-1 text-xs font-semibold {getStatusColor(
												item.status
											)}"
										>
											{getStatusText(item.status)}
										</span>
									</td>
									<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
										{item.receivedAt ? new Date(item.receivedAt).toLocaleTimeString() : '-'}
									</td>
									<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
										{#if item.status === 'processing'}
											<button
												on:click={() => startPrintJob(item.id)}
												class="rounded bg-blue-500 px-3 py-1 text-xs text-white hover:bg-blue-600"
											>
												완료
											</button>
										{:else if item.status === 'completed'}
											<button
												on:click={() => stopPrintJob(item.id)}
												class="rounded bg-red-500 px-3 py-1 text-xs text-white hover:bg-red-600"
											>
												취소
											</button>
										{:else}
											-
										{/if}
									</td>
								</tr>
							{/each}
						</tbody>
					{:else}
						<tbody class="rounded-lg border border-gray-200 bg-white p-8 text-center">
							<tr>
								<td colspan="7" class="text-gray-500">
									<p class="py-10 text-gray-500">
										{isConnected
											? '현재 출력 대기 중인 작업이 없습니다.'
											: '데이터를 불러오는 중...'}
									</p>
								</td>
							</tr>
						</tbody>
					{/if}
				</table>
			</div>
		</article>
	</article>
</main>

<style lang="scss">
	#sidebar {
		&.hover {
			.collapsed-hidden {
				display: block;
			}
		}
		&.active {
			.collapsed-hidden {
				display: block;
			}
		}

		.collapsed-hidden {
			display: none;
		}
	}
	.dropdownMenu {
		&.active {
			.dropdownMenuContnet {
				display: block;
			}
		}
	}
	.nav-search-box {
		button.active {
			background-color: rgb(91 33 182 / var(--tw-bg-opacity, 1));
		}
	}
</style>
