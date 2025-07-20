<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import ProgressBar from '../components/progressBar/ProgressBar.svelte';
	import DropdownFilter from '../components/DropdownFilter.svelte';
	import CustomDatePicker from '../components/CustomDatePicker.svelte';
	import { camPrintViewService } from '../../service/CamPrintView';
	import { toastStore } from '../../service/ToastService';
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

	// 서비스 스토어 구독
	camPrintViewService.selectedItems.subscribe((val) => (selectedItems = val));
	camPrintViewService.isConnected.subscribe((val) => (isConnected = val));
	camPrintViewService.connectionError.subscribe((val) => (connectionError = val));
	camPrintViewService.progressBarData.subscribe((val) => (progressBarData = val));
	camPrintViewService.printListData.subscribe((val) => (printListData = val));
	camPrintViewService.searchQuery.subscribe((val) => (searchQuery = val));
	camPrintViewService.statusFilter.subscribe((val) => (statusFilter = val));
	camPrintViewService.folderFilter.subscribe((val) => (folderFilter = val));
	camPrintViewService.categoryFilter.subscribe((val) => (categoryFilter = val));
	camPrintViewService.startDate.subscribe((val) => (startDate = val));
	camPrintViewService.endDate.subscribe((val) => (endDate = val));
	camPrintViewService.unifiedMonitorActive.subscribe((val) => (unifiedMonitorActive = val));

	// 전체 선택 상태 계산
	$: allSelected = printListData.length > 0 && selectedItems.length === printListData.length;

	// 옵션 상수들
	const folderOptions = FOLDER_OPTIONS;
	const categoryOptions = CATEGORY_OPTIONS;
	const statusOptions = STATUS_OPTIONS;

	// 전체 선택/해제
	function toggleAll(e: Event) {
		const isChecked = (e.target as HTMLInputElement).checked;
		camPrintViewService.toggleAll(isChecked);
	}

	onMount(async () => {
		// 사용자 권한 확인
		if (!data.user) {
			toastStore.error('로그인이 필요합니다.');
			return;
		}

		console.log('🔍 CAM Print 페이지 사용자 정보:', data.user);
		console.log('🔍 사용자 역할:', data.user.role);

		// 초기 데이터 로드 확인
		if (data.initialPrintData && data.initialPrintData.length > 0) {
			console.log(`✅ 초기 데이터 로드 완료: ${data.initialPrintData.length}개 출력물`);
		} else if (data.initialPrintData && data.initialPrintData.length === 0) {
			console.log('ℹ️ 현재 출력 대기 중인 작업이 없습니다.');
		}

		// 서비스 초기화 및 연결
		await camPrintViewService.initialize(data);
		camPrintViewService.connect();
	});

	onDestroy(() => {
		// 서비스 연결 해제
		camPrintViewService.disconnect();
	});

	// 서비스 함수들을 사용하는 래퍼 함수들
	async function startPrintJob(fileId: string) {
		await camPrintViewService.startPrintJob(fileId);
	}

	function stopPrintJob(jobId: string) {
		camPrintViewService.stopPrintJob(jobId);
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
		await camPrintViewService.filterPrintList();
	}

	async function clearSearch() {
		await camPrintViewService.clearSearch();
	}
</script>

<svelte:head>
	<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/remixicon@3.5.0/fonts/remixicon.css" />
</svelte:head>

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
				<div class="box-title inline-block flex flex-row items-center">
					<h3 class="py-1 py-px text-3xl font-extrabold text-violet-500">출력물 목록</h3>

					<!-- 선택된 날짜 범위 표시 -->
					{#if startDate || endDate}
						<div class="ml-2 pt-3 text-base text-gray-500">
							{startDate ? new Date(startDate).toLocaleDateString('ko-KR') : ''} ~ {endDate
								? new Date(endDate).toLocaleDateString('ko-KR')
								: ''}
						</div>
					{/if}
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
						{#if unifiedMonitorActive}
							<button
								on:click={stopUnifiedFolderMonitoring}
								class="rounded bg-red-500 px-3 py-1 text-xs text-white hover:bg-red-600"
							>
								중지
							</button>
							<div class="h-2 w-2 rounded-full bg-green-500"></div>
						{:else}
							<button
								on:click={startUnifiedFolderMonitoring}
								class="rounded bg-green-500 px-3 py-1 text-xs text-white hover:bg-green-600"
							>
								시작
							</button>
							<div class="h-2 w-2 rounded-full bg-gray-400"></div>
						{/if}
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
					<!-- 날짜 선택 및 검색 입력창 -->
					<div class="flex w-full items-center space-x-2 border-b border-gray-200 bg-gray-50 p-4">
						<!-- 날짜 범위 선택기 -->
						<div class="flex items-center space-x-1">
							<div class="relative">
								<CustomDatePicker
									isRange={true}
									onDateChange={({ startDate, endDate }) => {
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
							on:input={(e) =>
								camPrintViewService.searchQuery.set((e.target as HTMLInputElement).value)}
							class="w-48 rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
							on:keydown={(e) => {
								if (e.key === 'Enter') filterPrintList();
							}}
						/>

						<!-- 검색 버튼 -->
						<button
							class="rounded bg-violet-500 px-4 py-2 text-sm text-white hover:bg-violet-600"
							on:click={filterPrintList}
						>
							검색
						</button>

						<!-- 초기화 버튼 -->
						{#if searchQuery || startDate || endDate}
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
								class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
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
