<script lang="ts">
	// 캘린더 처리용 DatePicker
	import { writable } from 'svelte/store';
	import { onMount } from 'svelte';
	import { WindowService } from '../../../app/service/WindowService';
	import PageHeaderBar from '../../../app/view/components/PageHeaderBar.svelte';
	import { getApiEndpoint, getBackendUrl } from '../../../app/service/ConfigService';
	import { authService } from '../../../app/service/auth/AuthService';
	import { toastStore } from '../../../app/service/ToastService';

	const { data } = $props<{ data: any }>();

	// 토스트 메시지 표시 함수
	const showToast = (type: 'success' | 'error' | 'info' | 'warning', message: string) => {
		toastStore[type](message);
	};

	let isLoading = $state(false);

	// 가격 목록 데이터 구조 (백엔드 API 응답에 맞춤)
	let priceList = $state<any[]>([]);
	let totalCount = $state(0);

	// 검색어 상태
	let searchTerm = $state('');

	// 페이지네이션 상태
	let currentPage = $state(1);
	let itemsPerPage = $state(10);

	// 검색어 또는 페이지 당 항목 수 변경 시 페이지 초기화
	$effect(() => {
		searchTerm;
		itemsPerPage;
		currentPage = 1;
	});

	// 전체 가격목록 조회
	async function fetchPriceList() {
		try {
			isLoading = true;

			// JWT 토큰 가져오기
			const token = await authService.getJwtToken();
			if (!token) {
				showToast('error', '인증 토큰이 없습니다. 다시 로그인해주세요.');
				return;
			}

			// ConfigService에서 API 엔드포인트와 백엔드 URL 가져오기
			const backendUrl = getBackendUrl();
			const listEndpoint = getApiEndpoint('price', 'list');
			if (!listEndpoint) {
				showToast('error', 'API 엔드포인트를 찾을 수 없습니다.');
				return;
			}

			const fullUrl = `${backendUrl}${listEndpoint}`;
			console.log('가격 목록 조회 URL:', fullUrl);

			const response = await fetch(fullUrl, {
				method: 'GET',
				headers: {
					Authorization: 'Bearer ' + token,
					'Content-Type': 'application/json'
				}
			});

			if (response.ok) {
				const result = await response.json();
				if (result.success) {
					priceList = result.data || [];
					totalCount = result.count || 0;
					console.log('가격 목록 조회 성공:', result);
					showToast('success', `총 ${totalCount}개의 가격 정보를 불러왔습니다.`);
				} else {
					showToast('error', result.message || '가격 목록 조회에 실패했습니다.');
				}
			} else {
				const errorData = await response.json();
				showToast('error', errorData.message || '가격 목록 조회에 실패했습니다.');
			}
		} catch (error) {
			console.error('가격 목록 조회 오류:', error);
			showToast('error', '네트워크 오류가 발생했습니다. 다시 시도해주세요.');
		} finally {
			isLoading = false;
		}
	}

	// 페이지 로드 시 가격 목록 자동 조회
	onMount(() => {
		fetchPriceList();

		// 가격 업데이트 이벤트 리스너 추가
		window.addEventListener('priceUpdated', () => {
			fetchPriceList();
		});
	});

	// 검색 및 보기 모드에 따른 필터링된 목록
	let filteredPriceList = $derived.by(() => {
		let filtered = priceList;

		// 검색어 필터링
		if (searchTerm) {
			filtered = filtered.filter(
				(item) =>
					item.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
					item.technicianname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
					item.prkey?.toLowerCase().includes(searchTerm.toLowerCase())
			);
		}

		return filtered;
	});

	// 페이지네이션 파생 상태
	let totalPages = $derived(Math.ceil(filteredPriceList.length / itemsPerPage));
	let paginatedList = $derived(
		filteredPriceList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
	);
	let startRange = $derived((currentPage - 1) * itemsPerPage + 1);
	let endRange = $derived(Math.min(currentPage * itemsPerPage, filteredPriceList.length));
	let pages = $derived(Array.from({ length: totalPages }, (_, i) => i + 1));

	// 페이지 이동 함수
	function nextPage() {
		if (currentPage < totalPages) currentPage++;
	}

	function prevPage() {
		if (currentPage > 1) currentPage--;
	}

	function goToPage(page: number) {
		currentPage = page;
	}

	// 모달 열기 함수들
	function openNewPriceModal() {
		WindowService.openModal('new-price');
	}

	function openBulkAddModal() {
		WindowService.openModal('bulk-add');
	}

	// 가격 편집 모달 열기
	function openEditPriceModal(item: any) {
		WindowService.openModal('edit-price', item);
	}

	// 가격 삭제 함수
	function deletePrice(id: number) {
		if (confirm('정말로 이 가격 정보를 삭제하시겠습니까?')) {
			priceList = priceList.filter((item) => item.id !== id);
		}
	}
</script>

<main class="ml-64 mt-8 min-h-screen flex-1 bg-gray-100 p-8">
	<article class="w-full">
		<PageHeaderBar title="가격 목록 관리" description="거래처별 가격 정보를 관리하는 페이지입니다.">
			<!-- 헤더 버튼 영역 제거됨 (아래로 이동) -->
		</PageHeaderBar>

		<article class="print-list">
			<div class="flex flex-col">
				<div class="-mx-4 -my-2 sm:-mx-6 lg:-mx-8">
					<div class="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
						<div class="border border-gray-200 shadow-lg dark:border-gray-700 md:rounded-lg">
							<!-- 상단 검색 및 필터 바 -->
							<div class="user-tab-bar w-full rounded-t-lg border-b border-gray-200 bg-white">
								<div class="flex flex-wrap items-center justify-between p-4">
									<!-- 왼쪽: 검색 영역 -->
									<div class="flex items-center space-x-3">
										<label class="w-32 text-sm font-medium text-gray-700">항목 검색</label>
										<div class="flex items-center space-x-3">
											<input
												type="text"
												bind:value={searchTerm}
												placeholder="치료 종류, 기공명칭, 고유번호로 검색..."
												class="w-64 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200"
											/>
										</div>
									</div>

									<!-- 오른쪽: 버튼 영역 -->
									<div class="flex items-center space-x-2">
										<select
											bind:value={itemsPerPage}
											class="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200"
										>
											<option value={10}>10개씩 보기</option>
											<option value={20}>20개씩 보기</option>
											<option value={50}>50개씩 보기</option>
											<option value={100}>100개씩 보기</option>
										</select>
										<button
											type="button"
											onclick={fetchPriceList}
											disabled={isLoading}
											class="rounded-lg bg-gray-500 px-4 py-2 text-sm font-medium text-white hover:bg-gray-600 focus:outline-none focus:ring-4 focus:ring-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
										>
											<i class="ri-refresh-line pr-1 text-base" class:animate-spin={isLoading}></i>
											{isLoading ? '로딩 중...' : '새로고침'}
										</button>
										<button
											type="button"
											onclick={openNewPriceModal}
											class="rounded-lg bg-violet-500 px-4 py-2 text-sm font-medium text-white hover:bg-violet-600 focus:outline-none focus:ring-4 focus:ring-violet-300"
										>
											<i class="ri-add-line pr-1 text-base"></i>
											새 가격 등록
										</button>
										<button
											type="button"
											onclick={openBulkAddModal}
											class="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-300"
										>
											<i class="ri-list-check-2 pr-1 text-base"></i>
											전체 추가
										</button>
									</div>
								</div>

								<!-- 가격 목록 테이블 -->
								<table
									class="w-full table-fixed divide-y divide-gray-200 dark:divide-gray-700"
									style="table-layout: fixed;"
								>
									<colgroup>
										<col style="width: 80px;" />
										<col style="width: 140px;" />
										<col style="width: 100px;" />
										<col style="width: 120px;" />
										<col style="width: 280px;" />
										<col style="width: 100px;" />
									</colgroup>
									<thead class="bg-gray-50 dark:bg-gray-800">
										<tr>
											<th
												scope="col"
												class="px-4 py-3.5 text-left text-sm font-medium text-gray-700"
											>
												번호
											</th>
											<th
												scope="col"
												class="px-4 py-3.5 text-left text-sm font-medium text-gray-700"
											>
												의뢰서용 고유번호
											</th>
											<th
												scope="col"
												class="px-4 py-3.5 text-left text-sm font-medium text-gray-700"
											>
												대분류
											</th>
											<th
												scope="col"
												class="px-4 py-3.5 text-left text-sm font-medium text-gray-700"
											>
												기공명칭
											</th>
											<th
												scope="col"
												class="px-4 py-3.5 text-left text-sm font-medium text-gray-700"
											>
												금액
											</th>
											<th
												scope="col"
												class="px-4 py-3.5 text-left text-sm font-medium text-gray-700"
											>
												관리
											</th>
										</tr>
									</thead>
									<tbody
										class="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900"
									>
										{#if isLoading}
											<tr>
												<td colspan="6" class="py-12 text-center">
													<div class="flex flex-col items-center justify-center">
														<i class="ri-loader-4-line mb-4 animate-spin text-4xl text-gray-400"
														></i>
														<p class="text-lg font-medium text-gray-600 dark:text-gray-400">
															가격 목록을 불러오는 중...
														</p>
													</div>
												</td>
											</tr>
										{:else if filteredPriceList.length === 0}
											<tr>
												<td colspan="6" class="py-12 text-center">
													<div class="flex flex-col items-center justify-center">
														<i class="ri-price-tag-3-line mb-4 text-4xl text-gray-400"></i>
														<p class="text-lg font-medium text-gray-600 dark:text-gray-400">
															가격 정보가 존재하지 않습니다.
														</p>
														<p class="mt-2 text-sm text-gray-500 dark:text-gray-500">
															새로운 가격 정보를 등록해주세요.
														</p>
													</div>
												</td>
											</tr>
										{:else}
											{#each paginatedList as item}
												<tr class="hover:bg-gray-50">
													<td class="whitespace-nowrap px-4 py-4 text-sm font-medium text-gray-900">
														{item.id}
													</td>
													<td class="whitespace-nowrap px-4 py-4 text-sm text-gray-500">
														{item.prkey}
													</td>
													<td class="whitespace-nowrap px-4 py-4 text-sm text-gray-500">
														<span
															class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium {item.type ===
															'캡'
																? 'bg-blue-100 text-blue-800'
																: item.type === '파샬'
																	? 'bg-green-100 text-green-800'
																	: item.type === '커스텀'
																		? 'bg-purple-100 text-purple-800'
																		: 'bg-orange-100 text-orange-800'}"
														>
															{item.type}
														</span>
													</td>
													<td class="whitespace-nowrap px-4 py-4 text-sm text-gray-500">
														{item.technicianname}
													</td>
													<td class="whitespace-nowrap px-4 py-4 text-sm font-medium text-gray-900">
														<div class="flex h-8 w-48 items-center space-x-3">
															<span class="text-gray-800">
																{parseFloat(item.price).toLocaleString()}원
															</span>
														</div>
													</td>
													<td class="whitespace-nowrap px-4 py-4 text-sm">
														<div class="flex space-x-2">
															<button
																class="rounded-lg px-2 py-1 text-blue-500 transition-colors hover:bg-blue-100"
																aria-label="편집"
																onclick={() => openEditPriceModal(item)}
																title="가격 정보 편집"
															>
																<i class="ri-edit-line"></i>
															</button>
															<button
																class="rounded-lg px-2 py-1 text-red-500 transition-colors hover:bg-red-100"
																aria-label="삭제"
																onclick={() => deletePrice(item.id)}
															>
																<i class="ri-delete-bin-line"></i>
															</button>
														</div>
													</td>
												</tr>
											{/each}
										{/if}
									</tbody>
								</table>
								<!-- 페이지네이션 푸터 -->
								{#if filteredPriceList.length > 0}
									<div
										class="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6"
									>
										<div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
											<div>
												<p class="text-sm text-gray-700">
													총 <span class="font-medium">{filteredPriceList.length}</span>개 중
													<span class="font-medium">{startRange}</span>
													-
													<span class="font-medium">{endRange}</span>
													표시
												</p>
											</div>
											<div>
												<nav
													class="isolate inline-flex -space-x-px rounded-md shadow-sm"
													aria-label="Pagination"
												>
													<button
														onclick={prevPage}
														disabled={currentPage === 1}
														class="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
													>
														<span class="sr-only">이전</span>
														<i class="ri-arrow-left-s-line text-lg"></i>
													</button>
													{#each pages as page}
														<button
															onclick={() => goToPage(page)}
															class="relative inline-flex items-center px-4 py-2 text-sm font-semibold {currentPage ===
															page
																? 'bg-violet-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600'
																: 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'}"
														>
															{page}
														</button>
													{/each}
													<button
														onclick={nextPage}
														disabled={currentPage === totalPages}
														class="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
													>
														<span class="sr-only">다음</span>
														<i class="ri-arrow-right-s-line text-lg"></i>
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
			background-color: rgb(236 72 153 / var(--tw-text-opacity, 1));
			border-color: rgb(236 72 153 / var(--tw-text-opacity, 1));
			color: white;
		}
	}
</style>
