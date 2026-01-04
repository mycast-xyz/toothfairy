<script lang="ts">
	import PageHeaderBar from '../../../app/view/components/PageHeaderBar.svelte';
	import SearchableDropdown from '../../../app/view/components/SearchableDropdown.svelte';
	import CustomDatePicker from '../../../app/view/components/datepicker/CustomDatePicker.svelte';
	import {
		requestStore,
		dentalClinicList,
		isLoadingDentalList
	} from '../../../app/service/request/RequestStore';
	import {
		RequestService,
		type RequestFilterParams
	} from '../../../app/service/request/RequestService';
	import { onMount } from 'svelte';

	// 치과 옵션 데이터 변환 (반응형)
	let dentalClinicOptions = $derived(
		$dentalClinicList.map((clinic) => ({
			id: clinic.id.toString(),
			name: `${clinic.corp_name} (${clinic.region})`,
			originalData: clinic
		}))
	);

	// 선택된 치과 ID
	let selectedClinicId = $state('');

	// 검색어
	let searchTerm = $state('');

	// 날짜 범위 (생성일)
	let startDate = $state<Date | null>(null);
	let endDate = $state<Date | null>(null);

	// 배송일 범위
	let deliveryStartDate = $state<Date | null>(null);
	let deliveryEndDate = $state<Date | null>(null);

	// 상태 필터
	let selectedStatus = $state('');

	// 탭 메뉴 상태
	let activeTab = $state('전체');

	// 페이지네이션
	let currentPage = $state(1);
	let itemsPerPage = $state(10);

	// 사용자 권한 (예시: 'general', 'design_manager', 'accounting')
	let userRole = $state('general');

	// API에서 받아온 의뢰 데이터
	let requestList = $state<any[]>([]);

	// API 호출을 위한 로딩 상태
	let isLoading = $state(false);

	// 페이지네이션 정보
	let paginationData = $state({
		total: 0,
		page: 1,
		limit: 10,
		totalPages: 1
	});

	// 검색 함수 - RequestService 사용
	async function handleSearchClick() {
		isLoading = true;

		try {
			// 필터 파라미터 구성
			const filterParams: RequestFilterParams = {
				page: currentPage,
				limit: itemsPerPage
			};

			// 필터 파라미터들 추가
			if (selectedStatus) filterParams.status = selectedStatus;
			if (selectedClinicId) filterParams.dentalClinicId = selectedClinicId;
			if (searchTerm) filterParams.search = searchTerm;

			// 날짜 파라미터들 (YYYY-MM-DD 형식)
			if (startDate) {
				filterParams.startDate = startDate.toISOString().split('T')[0];
			}
			if (endDate) {
				filterParams.endDate = endDate.toISOString().split('T')[0];
			}
			if (deliveryStartDate) {
				filterParams.deliveryStartDate = deliveryStartDate.toISOString().split('T')[0];
			}
			if (deliveryEndDate) {
				filterParams.deliveryEndDate = deliveryEndDate.toISOString().split('T')[0];
			}

			// RequestService를 사용한 API 호출
			const result = await RequestService.fetchRequestListFromApi(filterParams);

			requestList = result.requestList;
			paginationData = result.paginationData;

			console.log('📡 Request 데이터 수신:', {
				requestList: requestList.length,
				paginationData
			});
		} catch (error) {
			console.error('❌ Request 데이터 가져오기 오류:', error);
			// 에러 처리 (토스트 메시지 등)
		} finally {
			isLoading = false;
		}
	}

	// 필터 초기화 함수
	async function handleResetClick() {
		searchTerm = '';
		selectedClinicId = '';
		startDate = null;
		endDate = null;
		deliveryStartDate = null;
		deliveryEndDate = null;
		selectedStatus = '';
		activeTab = '전체';
		currentPage = 1;
		itemsPerPage = 10;
		console.log('필터 초기화');

		// 초기화 후 검색 실행
		await handleSearchClick();
	}

	onMount(async () => {
		// 치과 리스트 로드
		requestStore.loadDentalClinicList('치과');

		// 초기 데이터 로드
		await handleSearchClick();
	});
</script>

<main class="ml-64 mt-8 min-h-screen flex-1 bg-gray-100 p-8 pb-24">
	<article class="w-full">
		<PageHeaderBar title="의뢰 목록" description="치과 기공물 관리 페이지 입니다."></PageHeaderBar>

		<!-- 사용자 목록 테이블 -->
		<article class="request-list">
			<div class="flex flex-col">
				<div class="-mx-4 -my-2 sm:-mx-6 lg:-mx-8">
					<div class="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
						<div class="border border-gray-200 shadow-lg dark:border-gray-700 md:rounded-lg">
							<!-- 상단 탭 및 필터 바 UI (이미지 참고) -->
							<div class="user-tab-bar w-full border-b border-gray-200 bg-white">
								<div class="flex flex-wrap items-center justify-between">
									<!-- 탭 메뉴 -->
									<div class="flex w-full px-2 pt-2">
										{#each [{ id: '', label: '전체' }, { id: '디자인', label: '디자인' }, { id: '출력중', label: '출력중' }, { id: '후가공', label: '후가공' }, { id: '포장완료', label: '포장완료' }] as tab}
											<button
												onclick={() => {
													activeTab = tab.label;
													selectedStatus = tab.id;
													currentPage = 1;
													handleSearchClick();
												}}
												class="tab-btn min-w-24 border-b-2 px-4 py-3 pt-2 text-sm font-semibold focus:outline-none {activeTab ===
												tab.label
													? 'border-violet-500 text-violet-600'
													: 'border-transparent text-gray-400 hover:text-gray-600'}"
											>
												{tab.label}
											</button>
										{/each}
									</div>
									<!-- 오른쪽 필터/검색 -->
									<div
										class="flex w-full items-end gap-2 border-t border-gray-200 bg-gray-100 px-2 py-4"
									>
										<!-- 검색 입력 -->
										<div class="relative">
											<label for="search-input" class="mb-1 block text-xs font-medium text-gray-600"
												>환자명</label
											>
											<div class="relative">
												<i
													class="ri-search-line absolute left-2 top-1/2 -translate-y-1/2 text-gray-400"
												></i>
												<input
													id="search-input"
													type="text"
													bind:value={searchTerm}
													onkeydown={(e) => {
														if (e.key === 'Enter') {
															handleSearchClick();
														}
													}}
													class="h-12 w-64 rounded border border-gray-300 py-4 pl-8 pr-2 text-sm text-gray-600 placeholder-gray-400 focus:border-violet-500 focus:outline-none"
													placeholder="이름을 적어주세요 (예: 홍길동)"
												/>
											</div>
										</div>
										<!-- 치과 리스트 필터 -->
										<div class="relative ml-3 w-64">
											<label class="mb-1 block text-xs font-medium text-gray-600">치과</label>
											<SearchableDropdown
												options={dentalClinicOptions}
												value={selectedClinicId}
												placeholder="치과를 선택하세요"
												emptyMessage="검색 결과가 없습니다"
												disabled={$isLoadingDentalList}
												loading={$isLoadingDentalList}
												enableChoseongSearch={true}
												on:change={(e) => {
													selectedClinicId = e.detail.id;
													console.log('선택된 치과:', e.detail);
												}}
											/>
										</div>

										<!-- 생성일 범위 선택기 -->
										<div class="relative ml-3 w-64">
											<div class="mb-1 block text-xs font-medium text-gray-600">생성일</div>
											<CustomDatePicker
												isRange={true}
												onDateChange={({
													startDate: newStartDate,
													endDate: newEndDate
												}: {
													startDate: Date | null;
													endDate: Date | null;
												}) => {
													console.log('생성일 CustomDatePicker change event:', {
														newStartDate,
														newEndDate
													});
													startDate = newStartDate;
													endDate = newEndDate;

													// 날짜 변경 후 자동으로 검색 실행
													if (newStartDate || newEndDate) {
														setTimeout(() => handleSearchClick(), 100);
													}
												}}
											/>
										</div>

										<!-- 배송일 범위 선택기 -->
										<div class="relative ml-3 w-64">
											<div class="mb-1 block text-xs font-medium text-gray-600">배송일</div>
											<CustomDatePicker
												isRange={true}
												onDateChange={({
													startDate: newDeliveryStartDate,
													endDate: newDeliveryEndDate
												}: {
													startDate: Date | null;
													endDate: Date | null;
												}) => {
													console.log('배송일 CustomDatePicker change event:', {
														newDeliveryStartDate,
														newDeliveryEndDate
													});
													deliveryStartDate = newDeliveryStartDate;
													deliveryEndDate = newDeliveryEndDate;

													// 날짜 변경 후 자동으로 검색 실행
													if (newDeliveryStartDate || newDeliveryEndDate) {
														setTimeout(() => handleSearchClick(), 100);
													}
												}}
											/>
										</div>

										<!-- 상태 필터 -->
										<div class="relative ml-3 w-48">
											<label
												for="status-select"
												class="mb-1 block text-xs font-medium text-gray-600">상태</label
											>
											<select
												id="status-select"
												bind:value={selectedStatus}
												class="h-12 w-full rounded border border-gray-300 px-3 text-sm focus:border-violet-500 focus:outline-none"
											>
												<option value="">전체</option>
												<option value="준비중">준비중</option>
												<option value="진행중">진행중</option>
												<option value="완료">완료</option>
												<option value="작업중">작업중</option>
												<option value="출력중">출력중</option>
												<option value="후가공">후가공</option>
												<option value="포장완료">포장완료</option>
											</select>
										</div>

										<div class="float-right ml-auto inline-block w-auto items-center">
											<button
												type="button"
												onclick={handleSearchClick}
												class="rounded-lg bg-violet-500 px-5 py-3 text-sm font-medium text-white hover:bg-violet-800 focus:outline-none focus:ring-4 focus:ring-violet-300 dark:bg-violet-600 dark:hover:bg-violet-700 dark:focus:ring-violet-900"
											>
												검색
											</button>
										</div>
									</div>
								</div>
							</div>
							<!-- 의뢰 목록 카드들 -->
							<div class="request-list-card">
								{#if isLoading}
									<div class="flex justify-center py-8">
										<div class="text-gray-500">로딩 중...</div>
									</div>
								{:else if requestList.length === 0}
									<div class="flex flex-col items-center justify-center py-12">
										<div class="mb-2 text-lg text-gray-400">
											<i class="ri-inbox-line text-4xl"></i>
										</div>
										<div class="text-sm text-gray-500">검색 결과가 없습니다</div>
										<div class="mt-1 text-xs text-gray-400">다른 검색 조건을 시도해보세요</div>
									</div>
								{:else}
									{#each requestList as request, index}
										<div class="border border-gray-200 bg-white shadow-sm">
											<!-- 카드 헤더 -->
											<div class=" flex items-center justify-between">
												<div class="flex items-center space-x-4 px-6 py-4">
													<h2 class="mr-4 text-2xl font-bold text-gray-900">
														{request.patientName}
														<span class="text-red-500">{request.patientCode}</span>
													</h2>
													<div
														class="ml-8 flex flex-row gap-2 border-l border-gray-200 pl-8 text-sm font-normal text-gray-600"
													>
														<span class="w-64">
															<div>접수일: <b>{request.receptionDate}</b></div>
															<div>완성일: <b>{request.completionDate}</b></div>
														</span>
														<span class="w-64">
															<div>환자번호: <b>{request.patientNumber}</b></div>
															<div>치과이름: <b>{request.dentalClinic}</b></div>
														</span>
													</div>
												</div>
												<button
													class="w-60 rounded-r bg-blue-500 p-8 px-12 text-xl font-medium text-white"
												>
													{request.status}
												</button>
											</div>
											<hr class="mt-0" />

											{#if request.products && request.products.length > 0}
												{@const toothNumbers = {
													upperLeft:
														request.products
															?.filter((p: any) => p.upperJaw)
															.flatMap((p: any) =>
																p.upperJaw.split(',').map((n: string) => parseInt(n.trim()))
															)
															.filter((n: number) => n >= 11 && n <= 18)
															.reverse() || [],
													upperRight:
														request.products
															?.filter((p: any) => p.upperJaw)
															.flatMap((p: any) =>
																p.upperJaw.split(',').map((n: string) => parseInt(n.trim()))
															)
															.filter((n: number) => n >= 21 && n <= 28) || [],
													lowerLeft:
														request.products
															?.filter((p: any) => p.lowerJaw)
															.flatMap((p: any) =>
																p.lowerJaw.split(',').map((n: string) => parseInt(n.trim()))
															)
															.filter((n: number) => n >= 41 && n <= 48)
															.reverse() || [],
													lowerRight:
														request.products
															?.filter((p: any) => p.lowerJaw)
															.flatMap((p: any) =>
																p.lowerJaw.split(',').map((n: string) => parseInt(n.trim()))
															)
															.filter((n: number) => n >= 31 && n <= 38) || []
												}}
												{#each request.products as product, index}
													<!-- 치료 정보 -->
													<div class="my-2 flex flex-row gap-4 px-6">
														<div class="request-info">
															<div class="py-3">
																<div class="mb-2 text-sm text-gray-600">치료 유형</div>
																<div class="flex items-center space-x-2 py-4">
																	<span class="text-2xl font-bold text-purple-600">
																		{product.treatmentType}
																	</span>
																</div>
															</div>
														</div>
														<div class="tooth-number ml-auto rounded border-l border-gray-300 p-3">
															<div class="mb-2 text-sm font-medium text-gray-700">치식</div>
															<!-- 치아 번호 통합 박스 - 8칸 for문으로 생성 -->
															<div class="rounded">
																<div class="grid h-16 grid-cols-2 grid-rows-2">
																	{#each [{ position: 'upperLeft', numbers: toothNumbers.upperLeft, borderClass: 'border-b border-r border-gray-200' }, { position: 'upperRight', numbers: toothNumbers.upperRight, borderClass: 'border-b border-gray-200' }, { position: 'lowerLeft', numbers: toothNumbers.lowerLeft, borderClass: 'border-r border-gray-200' }, { position: 'lowerRight', numbers: toothNumbers.lowerRight, borderClass: '' }] as toothSection, index}
																		<div
																			class="flex items-center justify-start p-2 {toothSection.borderClass}"
																		>
																			<span class="text-sm font-medium text-gray-700">
																				{toothSection.numbers.length > 0
																					? toothSection.numbers.join(' ')
																					: ''}
																			</span>
																		</div>
																	{/each}
																</div>
															</div>
														</div>
														<!-- 치아 번호 및 가격 정보 (권한에 따라 표시) -->
														<div
															class="flex items-start justify-between border-l border-gray-300 p-3 px-6"
														>
															<div class="text-left">
																<div class="mb-2 text-sm font-medium text-gray-700">품목 가격</div>
																<div class="py-4 text-right text-2xl font-bold text-gray-900">
																	{Math.floor(product.price).toLocaleString()}원
																</div>
															</div>
														</div>
													</div>
												{/each}
											{/if}
											<hr class="mt-0" />

											<div class="flex flex-row gap-4 px-6 py-4">
												<div class="flex space-x-2">
													<button
														class="rounded border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-800"
													>
														세부사항
													</button>
													<button
														class="rounded border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-800"
													>
														주문 수정
													</button>
													<button
														class="rounded border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-800"
													>
														수정 내역
													</button>
													<button
														class="rounded border-2 border-red-500 px-4 py-2 text-sm text-red-500 hover:bg-red-50"
													>
														주문취소
													</button>
												</div>
												<div class="ml-auto flex items-center justify-between">
													<span class="pr-8 text-gray-600">합계금액</span>
													<span class="text-2xl font-bold text-purple-600"
														>{Math.floor(request.totalAmount).toLocaleString()}원</span
													>
												</div>
											</div>
										</div>
									{/each}
								{/if}
							</div>

							<!-- 페이지네이션 -->
							{#if !isLoading && requestList.length > 0}
								<div
									class="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6"
								>
									<div class="flex flex-1 justify-between sm:hidden">
										<button
											onclick={() => {
												if (currentPage > 1) {
													currentPage--;
													handleSearchClick();
												}
											}}
											disabled={currentPage === 1}
											class="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
										>
											이전
										</button>
										<button
											onclick={() => {
												currentPage++;
												handleSearchClick();
											}}
											class="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
										>
											다음
										</button>
									</div>
									<div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
										<div>
											<p class="text-sm text-gray-700">
												페이지 <span class="font-medium">{currentPage}</span> /
												<span class="font-medium">{paginationData.totalPages}</span>
												(총 {paginationData.total}개)
											</p>
										</div>
										<div>
											<nav
												class="isolate inline-flex -space-x-px rounded-md shadow-sm"
												aria-label="Pagination"
											>
												<button
													onclick={() => {
														if (currentPage > 1) {
															currentPage--;
															handleSearchClick();
														}
													}}
													disabled={currentPage === 1}
													class="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
												>
													<span class="sr-only">이전</span>
													<i class="ri-arrow-left-s-line h-5 w-5"></i>
												</button>

												<!-- 페이지 번호들 -->
												{#each Array.from( { length: Math.min(5, paginationData.totalPages) }, (_, i) => {
														const startPage = Math.max(1, currentPage - 2);
														return startPage + i;
													} ) as pageNum}
													{#if pageNum <= paginationData.totalPages}
														<button
															onclick={() => {
																currentPage = pageNum;
																handleSearchClick();
															}}
															class="relative inline-flex items-center px-4 py-2 text-sm font-semibold {pageNum ===
															currentPage
																? 'bg-violet-600 text-white'
																: 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50'} focus:z-20 focus:outline-offset-0"
														>
															{pageNum}
														</button>
													{/if}
												{/each}

												<button
													onclick={() => {
														currentPage++;
														handleSearchClick();
													}}
													disabled={currentPage >= paginationData.totalPages}
													class="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
												>
													<span class="sr-only">다음</span>
													<i class="ri-arrow-right-s-line h-5 w-5"></i>
												</button>
											</nav>
										</div>
									</div>
								</div>
							{/if}
						</div>
					</div>
				</div>
			</div>
		</article>
	</article>
</main>
