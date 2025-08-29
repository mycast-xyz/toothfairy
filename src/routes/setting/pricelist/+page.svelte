<script lang="ts">
	// 캘린더 처리용 DatePicker
	import { writable } from 'svelte/store';
	import { onMount } from 'svelte';
	import { WindowService } from '../../../app/service/WindowService';
	import PageHeaderBar from '../../../app/view/components/PageHeaderBar.svelte';
	import { getApiEndpoint, getBackendUrl } from '../../../app/service/ConfigService';
	import { authService } from '../../../app/service/AuthService';
	import { toastStore } from '../../../app/service/ToastService';

	const { data } = $props<{ data: any }>();

	// 토스트 메시지 표시 함수
	const showToast = (type: 'success' | 'error' | 'info' | 'warning', message: string) => {
		toastStore[type](message);
	};

	let selectedCorpName = $state('');
	let isLoading = $state(false);

	// 가격 목록 데이터 구조 (백엔드 API 응답에 맞춤)
	let priceList = $state<any[]>([]);
	let totalCount = $state(0);

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

	// 검색 필터링
	let filteredPriceList = $derived.by(() => {
		let filtered = priceList;

		if (selectedCorpName) {
			filtered = filtered.filter(
				(item) =>
					item.koName?.toLowerCase().includes(selectedCorpName.toLowerCase()) ||
					item.enName?.toLowerCase().includes(selectedCorpName.toLowerCase()) ||
					item.type?.toLowerCase().includes(selectedCorpName.toLowerCase())
			);
		}

		return filtered;
	});

	function handleSearchClick() {
		const params = new URLSearchParams();
		params.append('corpName', selectedCorpName);

		// 실제 검색 로직 구현
		console.log('검색 파라미터:', params.toString());
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
			<div class="flex flex-wrap items-center gap-2">
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
		</PageHeaderBar>

		<article class="print-list">
			<div class="flex flex-col">
				<div class="-mx-4 -my-2 sm:-mx-6 lg:-mx-8">
					<div class="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
						<div class="border border-gray-200 shadow-lg dark:border-gray-700 md:rounded-lg">
							<!-- 상단 검색 및 필터 바 -->
							<div class="user-tab-bar w-full rounded-t-lg border-b border-gray-200 bg-white">
								<div class="flex flex-wrap items-center justify-between">
									<!-- 검색 및 필터 -->
									<div
										class="flex w-full items-center gap-4 border-t border-gray-200 bg-gray-100 px-4 py-4"
									>
										<!-- 회사명 검색 -->
										<div class="flex-1">
											<input
												type="text"
												bind:value={selectedCorpName}
												placeholder="제품명, 영어이름, 대분류로 검색..."
												class="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200"
											/>
										</div>

										<!-- 검색 버튼 -->
										<div class="inline-block">
											<button
												type="button"
												onclick={handleSearchClick}
												class="rounded-lg bg-violet-500 px-5 py-2 text-sm font-medium text-white hover:bg-violet-800 focus:outline-none focus:ring-4 focus:ring-violet-300"
											>
												<i class="ri-search-line mr-2"></i>
												검색
											</button>
										</div>
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
											{#each filteredPriceList as item}
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
