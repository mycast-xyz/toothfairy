<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import ProgressBar from '../components/progressBar/ProgressBar.svelte';
	import DropdownFilter from '../components/DropdownFilter.svelte';
	import CustomDatePicker from '../components/datepicker/CustomDatePicker.svelte';
	import PageHeaderBar from '../components/PageHeaderBar.svelte';
	import { camPrintViewService } from '../../service/cam/CamPrintView';
	import { folderMonitorHealth } from '../../service/cam/CamSocketService';
	import { toastStore } from '../../service/ToastService';
	import { WindowService } from '../../service/WindowService';
	import {
		getStatusColor,
		getStatusText,
		getCategoryColor,
		getCategoryText,
		FOLDER_OPTIONS,
		CATEGORY_OPTIONS,
		STATUS_OPTIONS
	} from '../../model/cam/PrintUtils';

	// Props
	export let data: any;

	// 서비스 스토어 구독
	let selectedItems: string[] = [];
	let isConnected = false;
	let connectionError: string | null = null;
	let progressBarData: any[] = [];
	let printListData: any[] = [];
	let searchQuery = '';
	let statusFilter = '';
	let folderFilter = '';
	let categoryFilter = '';
	let startDate = '';
	let endDate = '';
	let unifiedMonitorActive = false;
	let allSelected = false;

	// 탭 필터 상태
	let activeTab = 'all'; // 'all', 'received', 'processing', 'completed'
	let isTabClick = false; // 탭 클릭으로 인한 상태 변경인지 구분

	// 페이지네이션(클라이언트 렌더): 로드된 데이터를 페이지 단위로 잘라 렌더 → 대량에서도 DOM 부담 최소화
	let currentPage = 1;
	const pageSize = 50;

	// 서비스 스토어 구독
	camPrintViewService.selectedItems.subscribe((val) => (selectedItems = val));
	camPrintViewService.isConnected.subscribe((val) => (isConnected = val));
	camPrintViewService.connectionError.subscribe((val) => (connectionError = val));
	camPrintViewService.progressBarData.subscribe((val) => (progressBarData = val));
	camPrintViewService.printListData.subscribe((val) => (printListData = val));
	camPrintViewService.searchQuery.subscribe((val) => (searchQuery = val));
	camPrintViewService.statusFilter.subscribe((val) => {
		statusFilter = val;

		// 탭 클릭이 아닌 외부 상태 변경 시에만 탭 동기화
		if (!isTabClick) {
			switch (val) {
				case '':
					activeTab = 'all';
					break;
				case 'received':
					activeTab = 'received';
					break;
				case 'processing':
					activeTab = 'processing';
					break;
				case 'completed':
					activeTab = 'completed';
					break;
				default:
					activeTab = 'all';
			}
		}

		// 플래그 리셋
		isTabClick = false;
	});
	camPrintViewService.folderFilter.subscribe((val) => (folderFilter = val));
	camPrintViewService.categoryFilter.subscribe((val) => (categoryFilter = val));
	camPrintViewService.startDate.subscribe((val) => (startDate = val));
	camPrintViewService.endDate.subscribe((val) => (endDate = val));
	camPrintViewService.unifiedMonitorActive.subscribe((val) => (unifiedMonitorActive = val));

	// 전체 선택 상태 계산
	$: allSelected = printListData.length > 0 && selectedItems.length === printListData.length;

	// 탭 카운트를 반응형으로 계산.
	// (기존 {getTabCount('all')}는 함수 호출이라 Svelte가 printListData 의존성을 추적 못 해
	//  목록이 갱신돼도 배지가 0으로 고정되는 버그가 있었음)
	$: tabCounts = {
		all: printListData.length,
		received: printListData.filter((item) => item.status === 'received').length,
		processing: printListData.filter((item) => item.status === 'processing').length,
		completed: printListData.filter((item) => item.status === 'completed').length
	};

	// 페이지네이션 파생값. 데이터가 줄면 현재 페이지를 유효 범위로 보정(소켓 새로고침 시 페이지 튐 방지: 리셋은 검색/탭에서만)
	$: totalItems = printListData.length;
	$: totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
	$: if (currentPage > totalPages) currentPage = totalPages;
	$: if (currentPage < 1) currentPage = 1;
	$: pageStartIndex = (currentPage - 1) * pageSize;
	$: pagedList = printListData.slice(pageStartIndex, pageStartIndex + pageSize);

	function goToPage(p: number) {
		currentPage = Math.min(Math.max(1, p), totalPages);
	}

	// 옵션 상수들
	const folderOptions = FOLDER_OPTIONS;
	const categoryOptions = CATEGORY_OPTIONS;
	const statusOptions = STATUS_OPTIONS;

	// 전체 선택/해제
	function toggleAll(e: Event) {
		const isChecked = (e.target as HTMLInputElement).checked;
		camPrintViewService.toggleAll(isChecked);
	}

	// 탭 클릭 핸들러
	function handleTabClick(tab: string) {
		if (activeTab === tab) return; // 이미 선택된 탭이면 무시

		// 탭 클릭으로 인한 변경임을 표시
		isTabClick = true;
		activeTab = tab;
		console.log('📂 탭 변경:', tab);

		// 탭에 따른 상태 필터 적용
		switch (tab) {
			case 'all':
				camPrintViewService.statusFilter.set('');
				break;
			case 'received':
				camPrintViewService.statusFilter.set('received');
				break;
			case 'processing':
				camPrintViewService.statusFilter.set('processing');
				break;
			case 'completed':
				camPrintViewService.statusFilter.set('completed');
				break;
			default:
				camPrintViewService.statusFilter.set('');
		}

		// 필터링 실행
		filterPrintList();
	}


	// 파일명과 확장자를 분리해서 표시하는 함수들
	function getDisplayFileName(item: any) {
		const fileName = item.fileName || '';
		const fileExtension = item.fileExtension || '';

		// 파일명에서 확장자 제거
		if (fileName.includes('.') && fileExtension && fileName.endsWith(`.${fileExtension}`)) {
			return fileName.replace(`.${fileExtension}`, '');
		}

		// 파일명에 다른 확장자가 있으면 그대로 반환
		if (fileName.includes('.')) {
			return fileName;
		}

		return fileName;
	}

	function getFileExtension(item: any) {
		const fileName = item.fileName || '';
		const fileExtension = item.fileExtension || '';

		// fileExtension 필드가 있으면 우선 사용
		if (fileExtension) {
			return fileExtension.startsWith('.') ? fileExtension : `.${fileExtension}`;
		}

		// 파일명에서 확장자 추출
		if (fileName.includes('.')) {
			const parts = fileName.split('.');
			return `.${parts[parts.length - 1]}`;
		}

		return '';
	}

	onMount(async () => {
		// 사용자 권한 확인
		if (!data.user) {
			toastStore.error('로그인이 필요합니다.');
			return;
		}

		console.log('🔍 CAM Print 페이지 사용자 정보:', data.user);
		console.log('🔍 사용자 역할:', data.user.role);
		console.log('🔍 페이지 전체 데이터:', data);

		// 초기 데이터 로드 확인
		if (data.initialPrintData && data.initialPrintData.length > 0) {
			console.log(`✅ 초기 데이터 로드 완료: ${data.initialPrintData.length}개 출력물`);
		} else if (data.initialPrintData && data.initialPrintData.length === 0) {
			console.log('ℹ️ 현재 출력 대기 중인 작업이 없습니다.');
		} else {
			console.log('⚠️ 초기 데이터가 정의되지 않았습니다:', data.initialPrintData);
		}

		// 서비스 초기화 및 연결
		console.log('🚀 CAM 서비스 초기화 시작');
		await camPrintViewService.initialize(data);

		console.log('🔗 CAM 서비스 연결 시작');
		await camPrintViewService.connect();

		// 연결 상태 모니터링
		setTimeout(() => {
			console.log('🔍 5초 후 연결 상태 확인:', isConnected);
			if (!isConnected) {
				console.warn('⚠️ 5초 경과 후에도 CAM 소켓에 연결되지 않았습니다.');
			}
		}, 5000);
	});

	onDestroy(() => {
		// 서비스 연결 해제
		camPrintViewService.disconnect();
	});

	// 서비스 함수들을 사용하는 래퍼 함수들
	async function startPrintJob(fileId: string) {
		await camPrintViewService.startPrintJob(fileId);
	}

	// 잘못 들어온 항목 삭제(확인 후 소프트 삭제 → 목록에서 숨김)
	async function deleteFile(fileId: string) {
		if (!confirm('이 항목을 목록에서 삭제하시겠습니까?')) return;
		await camPrintViewService.deleteFile(fileId);
	}

	async function downloadFile(fileId: string) {
		await camPrintViewService.downloadFile(fileId);
	}

	async function downloadSelectedFiles() {
		await camPrintViewService.downloadSelectedFiles();
	}

	async function refreshFromDB() {
		await camPrintViewService.refreshFromDB();
	}

	function startUnifiedFolderMonitoring() {
		camPrintViewService.startUnifiedFolderMonitoring();
	}

	function stopUnifiedFolderMonitoring() {
		camPrintViewService.stopUnifiedFolderMonitoring();
	}

	async function filterPrintList() {
		currentPage = 1; // 검색/탭 변경 시 첫 페이지로
		await camPrintViewService.filterPrintList();
	}

	async function clearSearch() {
		// 탭을 전체로 리셋
		activeTab = 'all';
		currentPage = 1;
		await camPrintViewService.clearSearch();
	}
</script>

<svelte:head>
	<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/remixicon@3.5.0/fonts/remixicon.css" />
</svelte:head>

<main class="ml-64 mt-8 min-h-screen flex-1 bg-gray-100 p-8">
	<PageHeaderBar title="출력물 목록" description="출력물 목록 페이지입니다.">
		<div class="flex space-x-2">
			<!-- CAM 실시간 연결 상태 표시 (아이콘 형태로 개선) -->
			<div class="mb-1 ml-auto flex items-center gap-2">
				{#if isConnected}
					<span class="text-sm pt-2 text-green-700">실시간 연결됨</span>
				{:else}
					<span class="text-sm pt-2 text-red-600">연결 중...</span>
				{/if}
			</div>
			<button
				onclick={refreshFromDB}
				class="rounded bg-gray-500 px-3 py-3 text-xs text-white hover:bg-gray-600"
			>
				<i class="ri-refresh-line pr-1 text-base"></i>
				재로드
			</button>
			{#if unifiedMonitorActive}
				<button
					onclick={stopUnifiedFolderMonitoring}
					class="rounded bg-red-500 px-3 py-1 text-xs text-white hover:bg-red-600"
				>
					<i class="ri-stop-circle-line pr-1 text-base"></i>
					모니터링 중지
				</button>
			{:else}
				<button
					onclick={startUnifiedFolderMonitoring}
					class="rounded bg-green-500 px-3 py-1 text-xs text-white hover:bg-green-600"
				>
					<i class="ri-play-circle-line pr-1 text-base"></i>
					모니터링 시작
				</button>
			{/if}
			<button
				onclick={() => {
					WindowService.openModal('backup-reset');
				}}
				class="rounded bg-orange-500 px-3 py-3 text-xs text-white hover:bg-orange-600"
			>
				<i class="ri-database-line pr-1 text-base"></i>
				작업 폴더 초기화
			</button>
		</div>
	</PageHeaderBar>

	<article class="progress-bar mb-4 flex w-full flex-row px-2">
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
	<article class="w-full px-2 pt-3">
		<!-- 연결 상태 표시 -->
		{#if connectionError}
			<div
				class="mb-4 flex flex-wrap items-center gap-2 rounded-lg bg-red-100 p-4 text-red-700 dark:bg-red-900/30 dark:text-red-300"
			>
				<span><strong>연결 오류:</strong> {connectionError}</span>
				<!-- 인증 만료로 복구 불가 시 재로그인 링크(데드엔드 방지) -->
				{#if connectionError.includes('인증') || connectionError.includes('로그인')}
					<a
						href="/login"
						class="rounded bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700"
					>
						다시 로그인
					</a>
				{/if}
			</div>
		{/if}

		<!-- 수신 폴더 헬스 경보: 감시 폴더 접근 불가 시(볼륨 미마운트 등) 무음 수신 실패 방지 -->
		{#if $folderMonitorHealth && !$folderMonitorHealth.healthy}
			<div
				class="mb-4 flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 p-4 text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-300"
			>
				<i class="ri-error-warning-line mt-0.5 text-lg"></i>
				<div>
					<strong>수신 폴더에 접근할 수 없습니다{$folderMonitorHealth.inaccessible?.length
							? ` (${$folderMonitorHealth.inaccessible
									.map((t) => (t === 'urgent' ? '긴급' : '일반'))
									.join(', ')})`
							: ''}.</strong>
					새 파일 수신이 중단될 수 있습니다. 저장소(네트워크 드라이브/폴더) 연결 상태를 확인해
					주세요.
				</div>
			</div>
		{/if}

		<!-- 선택 다운로드: 체크된 항목이 있을 때만 노출 (여러 파일 ZIP 다운로드) -->
		{#if selectedItems.length > 0}
			<div class="mb-2 flex justify-end">
				<button
					type="button"
					onclick={downloadSelectedFiles}
					class="rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-green-600 focus:outline-none focus:ring-4 focus:ring-green-300 dark:bg-green-600 dark:hover:bg-green-700 dark:focus:ring-green-900"
				>
					<i class="ri-download-2-line pr-1"></i>선택 다운로드 ({selectedItems.length})
				</button>
			</div>
		{/if}

		<!-- 실시간 출력물 목록 -->
		<article class="print-list">
			<div class="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
				<div class="flex flex-wrap items-center justify-between">
					<!-- 탭 메뉴 -->
					<div class="flex w-full px-2 pt-2">
						<button
							class="tab-btn min-w-24 cursor-pointer border-b-2 px-4 py-3 pt-2 text-sm font-semibold transition-colors duration-200 hover:bg-gray-100 focus:outline-none {activeTab ===
							'all'
								? 'border-violet-500 bg-white text-violet-600'
								: 'border-transparent text-gray-500 hover:text-gray-700'}"
							onclick={() => handleTabClick('all')}
						>
							전체
							<span
								class="ml-1 rounded-full px-2 py-0.5 text-xs {activeTab === 'all'
									? 'bg-violet-100 text-violet-700'
									: 'bg-gray-200 text-gray-600'}"
							>
								{tabCounts.all}
							</span>
						</button>
						<button
							class="tab-btn min-w-24 cursor-pointer border-b-2 px-4 py-3 pt-2 text-sm font-semibold transition-colors duration-200 hover:bg-gray-100 focus:outline-none {activeTab ===
							'received'
								? 'border-violet-500 bg-white text-violet-600'
								: 'border-transparent text-gray-500 hover:text-gray-700'}"
							onclick={() => handleTabClick('received')}
						>
							다운로드 전
							<span
								class="ml-1 rounded-full px-2 py-0.5 text-xs {activeTab === 'received'
									? 'bg-violet-100 text-violet-700'
									: 'bg-gray-200 text-gray-600'}"
							>
								{tabCounts.received}
							</span>
						</button>
						<button
							class="tab-btn min-w-24 cursor-pointer border-b-2 px-4 py-3 pt-2 text-sm font-semibold transition-colors duration-200 hover:bg-gray-100 focus:outline-none {activeTab ===
							'processing'
								? 'border-violet-500 bg-white text-violet-600'
								: 'border-transparent text-gray-500 hover:text-gray-700'}"
							onclick={() => handleTabClick('processing')}
						>
							다운로드 완료
							<span
								class="ml-1 rounded-full px-2 py-0.5 text-xs {activeTab === 'processing'
									? 'bg-violet-100 text-violet-700'
									: 'bg-gray-200 text-gray-600'}"
							>
								{tabCounts.processing}
							</span>
						</button>
						<button
							class="tab-btn min-w-24 cursor-pointer border-b-2 px-4 py-3 pt-2 text-sm font-semibold transition-colors duration-200 hover:bg-gray-100 focus:outline-none {activeTab ===
							'completed'
								? 'border-violet-500 bg-white text-violet-600'
								: 'border-transparent text-gray-500 hover:text-gray-700'}"
							onclick={() => handleTabClick('completed')}
						>
							가공완료
							<span
								class="ml-1 rounded-full px-2 py-0.5 text-xs {activeTab === 'completed'
									? 'bg-violet-100 text-violet-700'
									: 'bg-gray-200 text-gray-600'}"
							>
								{tabCounts.completed}
							</span>
						</button>
					</div>
					<!-- 오른쪽 필터/검색 -->
					<div
						class="flex w-full items-center gap-2 border-t border-gray-200 bg-gray-100 px-2 py-4"
					>
						<div class="flex flex-row items-center space-x-2">
							<!-- 날짜 범위 선택기 -->
							<div class="flex items-center space-x-1">
								<div class="relative">
									<CustomDatePicker
										isRange={true}
										onDateChange={({
											startDate,
											endDate
										}: {
											startDate: Date | null;
											endDate: Date | null;
										}) => {
											console.log('CustomDatePicker change event:', { startDate, endDate });

											if (startDate) {
												const newStartDate = startDate.toISOString().split('T')[0];
												console.log('Setting start date:', newStartDate);
												camPrintViewService.startDate.set(newStartDate);
											}

											if (endDate) {
												const newEndDate = endDate.toISOString().split('T')[0];
												console.log('Setting end date:', newEndDate);
												camPrintViewService.endDate.set(newEndDate);
											}

											// 날짜 변경 후 자동으로 필터링 실행
											if (startDate || endDate) {
												setTimeout(() => filterPrintList(), 100);
											}
										}}
									/>
								</div>
							</div>
							<!-- 파일명 검색 -->
							<input
								type="text"
								placeholder="파일명 검색"
								value={searchQuery}
								oninput={(e) =>
									camPrintViewService.searchQuery.set((e.target as HTMLInputElement).value)}
								class="w-48 rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
								onkeydown={(e) => {
									if (e.key === 'Enter') filterPrintList();
								}}
							/>

							<!-- 검색 버튼 -->
							<button
								class="rounded bg-violet-500 px-4 py-2 text-sm text-white hover:bg-violet-600"
								onclick={filterPrintList}
							>
								검색
							</button>

							<!-- 초기화 버튼 -->
							{#if searchQuery || startDate || endDate}
								<button
									class="rounded bg-gray-300 px-2 py-2 text-xs text-gray-700 hover:bg-gray-400"
									onclick={clearSearch}
								>
									초기화
								</button>
							{/if}
						</div>
					</div>
				</div>

				<!-- 테이블 래퍼 - 수평 스크롤 처리 -->
				<div class="overflow-x-auto">
					<table class="min-w-full divide-y divide-gray-200">
						<thead class="bg-gray-50">
							<tr>
								<th class="w-12 p-4">
									<div class="flex items-center">
										<input
											id="checkbox-all"
											type="checkbox"
											onchange={toggleAll}
											checked={allSelected}
											class="h-4 w-4 rounded border-gray-300 bg-gray-100 text-blue-600 focus:ring-2 focus:ring-blue-500"
										/>
										<label for="checkbox-all" class="sr-only">checkbox</label>
									</div>
								</th>
								<th
									class="w-24 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
								>
									<DropdownFilter
										label="폴더"
										options={folderOptions}
										selected={folderFilter}
										onSelect={(v) => {
											camPrintViewService.folderFilter.set(v);
											filterPrintList();
										}}
										bgColor="bg-gray-50"
										textColor="text-gray-500"
										hoverBgColor="bg-gray-100"
										hoverTextColor="text-gray-500"
									/>
								</th>
								<th
									class="w-28 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
								>
									<DropdownFilter
										label="카테고리"
										options={categoryOptions}
										selected={categoryFilter}
										onSelect={(v) => {
											camPrintViewService.categoryFilter.set(v);
											filterPrintList();
										}}
										bgColor="bg-gray-50"
										textColor="text-gray-500"
										hoverBgColor="bg-gray-100"
										hoverTextColor="text-gray-500"
									/>
								</th>
								<th
									class="min-w-48 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
								>
									디렉터리
								</th>
								<th
									class="min-w-48 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
								>
									파일명
								</th>
								<th
									class="w-20 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
								>
									확장자
								</th>
								<th
									class="w-24 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
								>
									<DropdownFilter
										label="상태"
										options={statusOptions}
										selected={statusFilter}
										onSelect={(v) => {
											camPrintViewService.statusFilter.set(v);
											filterPrintList();
										}}
										bgColor="bg-gray-50"
										textColor="text-gray-500"
										hoverBgColor="bg-gray-100"
										hoverTextColor="text-gray-500"
									/>
								</th>
								<th
									class="w-32 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
								>
									수신시간
								</th>
								<th
									class="w-24 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
								>
									작업확인
								</th>
							</tr>
						</thead>
						{#if printListData.length > 0}
							<tbody class="divide-y divide-gray-200 bg-white">
								{#each pagedList as item (item.id)}
									{@const displayFileName = getDisplayFileName(item)}
									{@const fileExtension = getFileExtension(item)}
									<tr class="align-top hover:bg-gray-50">
										<td class="p-4 align-top">
											<div class="flex items-start pt-1">
												<input
													type="checkbox"
													value={item.id}
													checked={selectedItems.includes(item.id)}
													disabled={item.status === 'completed'}
													onchange={(e) => {
														if (item.status === 'completed') return;
														const checked = (e.target as HTMLInputElement).checked;
														camPrintViewService.toggleItem(item.id, checked);
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
										<td class="min-w-48 px-6 py-4 text-sm text-gray-500">
											{#if item.directory}
												<span
													class="block break-all text-xs leading-relaxed text-gray-600"
													title={item.directory}>{item.directory}</span
												>
											{:else}
												-
											{/if}
										</td>
										<td class="min-w-48 max-w-64 px-6 py-4 text-sm font-medium text-gray-900">
											{#if item.status === 'completed'}
												<span
													class="block cursor-not-allowed truncate text-gray-400"
													title={displayFileName}
												>
													{displayFileName}
												</span>
											{:else}
												<button
													onclick={() => downloadFile(item.id)}
													class="block w-full cursor-pointer truncate border-none bg-transparent p-0 text-left text-blue-600 hover:underline"
													title={displayFileName}
												>
													{displayFileName}
												</button>
											{/if}
										</td>
										<td class="w-20 px-6 py-4 text-sm text-gray-500">
											{#if fileExtension}
												<span class="text-xs font-medium">
													{fileExtension}
												</span>
											{:else}
												-
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
											{item.receivedAt
												? new Date(item.receivedAt).toLocaleString('ko-KR', {
														dateStyle: 'short',
														timeStyle: 'short'
													})
												: '-'}
										</td>
										<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
											<div class="flex items-center gap-2">
												{#if item.status === 'processing'}
													<button
														onclick={() => startPrintJob(item.id)}
														class="rounded bg-blue-500 px-3 py-1 text-xs text-white hover:bg-blue-600"
													>
														가공완료 처리
													</button>
												{/if}
												<button
													onclick={() => deleteFile(item.id)}
													class="rounded bg-gray-100 px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:bg-gray-700 dark:text-red-400 dark:hover:bg-gray-600"
													title="잘못 들어온 항목 삭제"
													aria-label="항목 삭제"
												>
													<i class="ri-delete-bin-line"></i>
												</button>
											</div>
										</td>
									</tr>
								{/each}
							</tbody>
						{:else}
							<tbody class="rounded-lg border border-gray-200 bg-white p-8 text-center">
								<tr>
									<td colspan="9" class="text-gray-500">
										<p class="py-10 text-gray-500">
											{isConnected
												? '해당 조건에 수신된 출력물이 없습니다. 날짜를 선택해 다른 기간을 조회해 보세요.'
												: '데이터를 불러오는 중...'}
										</p>
									</td>
								</tr>
							</tbody>
						{/if}
					</table>
				</div>

				<!-- 페이지네이션: 로드된 항목이 한 페이지를 넘을 때만 노출 -->
				{#if totalItems > pageSize}
					<div
						class="flex flex-wrap items-center justify-between gap-2 border-t border-gray-200 px-4 py-3 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-400"
					>
						<span>
							{pageStartIndex + 1}–{Math.min(pageStartIndex + pageSize, totalItems)} / 총 {totalItems}개
						</span>
						<div class="flex items-center gap-1">
							<button
								type="button"
								class="rounded border border-gray-300 px-2 py-1 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-600 dark:hover:bg-gray-700"
								onclick={() => goToPage(1)}
								disabled={currentPage === 1}
								aria-label="첫 페이지">«</button
							>
							<button
								type="button"
								class="rounded border border-gray-300 px-2 py-1 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-600 dark:hover:bg-gray-700"
								onclick={() => goToPage(currentPage - 1)}
								disabled={currentPage === 1}
								aria-label="이전 페이지">‹</button
							>
							<span class="px-2">{currentPage} / {totalPages}</span>
							<button
								type="button"
								class="rounded border border-gray-300 px-2 py-1 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-600 dark:hover:bg-gray-700"
								onclick={() => goToPage(currentPage + 1)}
								disabled={currentPage === totalPages}
								aria-label="다음 페이지">›</button
							>
							<button
								type="button"
								class="rounded border border-gray-300 px-2 py-1 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-600 dark:hover:bg-gray-700"
								onclick={() => goToPage(totalPages)}
								disabled={currentPage === totalPages}
								aria-label="마지막 페이지">»</button
							>
						</div>
					</div>
				{/if}
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

	// 날짜 필터 스타일
	.date-filter {
		.date-field {
			align-items: center;
			background-color: #fff;
			border: 1px solid #e8e9ea;
			border-radius: 6px;
			display: inline-flex;
			gap: 8px;
			min-width: 200px;
			padding: 8px 12px;
			cursor: pointer;
			transition: border-color 0.2s ease;

			&:hover {
				border-color: #0087ff;
			}

			&.open {
				border-color: #0087ff;
				box-shadow: 0 0 0 2px rgba(0, 135, 255, 0.1);
			}

			.icon-calendar {
				background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAACXBIWXMAABYlAAAWJQFJUiTwAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAEmSURBVHgB7ZcPzcIwEMUfXz4BSCgKwAGgACRMAg6YBBxsOMABOAAHFAXgAK5Z2Y6lHbfQ8SfpL3lZaY/1rb01N+BHUKSMNBfEJjZWISA56Uo6C2KvVpkgFn9oRx9vICFtUT1JKO3tvRtZdjBxXQs+YY+1FenIfuesPUGVVLzfRWKvmrSzbbN19wS+kAb2+sCEuUxrYzkbe4YvCVM2Vr5NPAkVa+van7Wn38U95uTpN5TJ/A8ZKemAakmbmJJGpI0gVmwA0huieFItjG19DgTHtwIZhCfZq3ztCuzQYh+FKBSvusjAGs8PnLYkLgMf34JoIBqIBqKBaIAb0Kw9RlhMCTbzzPWAqYq7LsuPaGDUsYmznaOk5zChUJTNQ4TFVMkrOL4HPsoNn26PxROHCggAAAAASUVORK5CYII=)
					no-repeat center center;
				background-size: 14px 14px;
				height: 14px;
				width: 14px;
				flex-shrink: 0;
			}

			.date {
				flex: 1;
				font-size: 14px;
				color: #333;
				white-space: nowrap;
				overflow: hidden;
				text-overflow: ellipsis;
			}

			.clear-btn {
				display: flex;
				align-items: center;
				justify-content: center;
				width: 16px;
				height: 16px;
				border-radius: 50%;
				background-color: #f0f0f0;
				cursor: pointer;
				transition: background-color 0.2s ease;

				&:hover {
					background-color: #e0e0e0;
				}

				.os-icon-x {
					font-size: 12px;
					color: #666;
					font-weight: bold;
				}
			}
		}
	}
</style>
