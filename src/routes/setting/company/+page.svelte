<script lang="ts">
	// 캘린더 처리용 DatePicker
	import { WindowService } from '../../../app/service/WindowService';
	import { CenterCompany } from '../../../app/model/company/CenterCompany';
	import PageHeaderBar from '../../../app/view/components/PageHeaderBar.svelte';

	// 새 태스크 추가
	function addNewCompany() {
		console.log('거래처 추가');

		WindowService.openModal('company-add');
	}

	// 페이지 데이터 처리
	const { data } = $props<{ data: any }>();

	// 출력물 종류 변환 함수
	function convertItemTypes(items: string): string {
		if (!items) return '';

		const typeMap: Record<string, string> = {
			cap: '캡',
			partial: '파샬',
			custom: '커스텀',
			allonfour: '올온포'
		};

		return items
			.split(',')
			.map((item) => typeMap[item.trim()] || item)
			.join(', ');
	}

	// 거래처 데이터를 CenterCompanyInit에 설정하는 함수
	function setCompanyData(companyData: any) {
		if (typeof companyData.item === 'string') {
			companyData.item = companyData.item.split(',').map((item: any) => item.trim());
		}
		CenterCompany.setCompany({
			name: companyData.name || '',
			companyName: companyData.companyname || '',
			businessNumber: companyData.businessnumber || '',
			representative: companyData.representative || '',
			address: companyData.address || '',
			cellnumber: companyData.cellnumber || '',
			item: companyData.item || [],
			prices: {
				cap: {
					normal: companyData.prices?.cap?.normal || 0,
					remake: companyData.prices?.cap?.remake || 0
				},
				partial: {
					normal: companyData.prices?.partial?.normal || 0,
					remake: companyData.prices?.partial?.remake || 0
				},
				allonfour: {
					normal: companyData.prices?.allonfour?.normal || 0,
					remake: companyData.prices?.allonfour?.remake || 0
				},
				custom: {
					normal: companyData.prices?.custom?.normal || 0,
					remake: companyData.prices?.custom?.remake || 0
				}
			},
			deliveryFee: companyData.deliveryFee || 0,
			id: companyData.id || 0
		});
	}

	// 거래처 추가 버튼 클릭 시 호출되는 함수 수정
	function editNewCompany(companyData: any) {
		console.log('거래처 수정');
		console.log(companyData);
		setCompanyData(companyData); // 빈 데이터로 초기화
		WindowService.openModal('company-edit');
	}
</script>

<main class="ml-64 mt-8 flex-1 bg-gray-100 p-8">
	<article class="w-full">
		<PageHeaderBar title="거래처 관리" description="기공소, 센터 통합 거래처 관리 페이지입니다.">
			<div class="flex flex-wrap items-center gap-2">
				<!-- 거래처 추가 -->
				<button
					type="button"
					onclick={addNewCompany}
					class="mb-2 ml-auto rounded-lg bg-violet-500 px-5 py-3 text-sm font-medium text-white hover:bg-violet-800 focus:outline-none focus:ring-4 focus:ring-violet-300 dark:bg-violet-600 dark:hover:bg-violet-700 dark:focus:ring-violet-900"
				>
					<i class="ri-apps-2-add-line"></i>
					거래처 추가
				</button>
			</div>
		</PageHeaderBar>
		<article class="print-list">
			<div class="flex flex-col">
				<div class="-mx-4 -my-2 sm:-mx-6 lg:-mx-8">
					<div class="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
						<div
							class=" overflow-auto border border-gray-200 shadow-lg dark:border-gray-700 md:rounded-lg"
						>
							<!-- 상단 탭 및 필터 바 UI (이미지 참고) -->
							<div class="user-tab-bar w-full border-b border-gray-200 bg-white">
								<div class="flex flex-wrap items-center justify-between">
									<!-- 탭 메뉴 -->
									<div class="flex w-full px-2 pt-2">
										<button
											class="tab-btn min-w-24 border-b-2 border-violet-500 px-4 py-3 pt-2 text-sm font-semibold text-violet-600 focus:outline-none"
											disabled
										>
											전체
										</button>
										<button
											class="tab-btn min-w-24 cursor-not-allowed border-b-2 border-transparent px-4 py-3 pt-2 text-sm font-semibold text-gray-400"
											disabled
										>
											기공소
										</button>
										<button
											class="tab-btn min-w-24 cursor-not-allowed border-b-2 border-transparent px-4 py-3 pt-2 text-sm font-semibold text-gray-400"
											disabled
										>
											센터
										</button>
									</div>
									<!-- 오른쪽 필터/검색 -->
									<div
										class="flex w-full items-center gap-2 border-t border-gray-200 bg-gray-100 px-2 py-4"
									>
										<!-- 검색 입력
										<div class="relative">
											<div class="relative">
												<i
													class="ri-search-line absolute left-2 top-1/2 -translate-y-1/2 text-gray-400"
												></i>
												<input
													type="text"
													class="h-12 w-80 rounded border border-gray-300 py-4 pl-8 pr-2 text-sm text-gray-600 placeholder-gray-400 focus:border-violet-500 focus:outline-none"
													placeholder="이름을 적어주세요 (예: 홍길동)"
													bind:value={$userStore.searchTerm}
												/>
											</div>
										</div> -->
									</div>
								</div>
							</div>
							<table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
								<thead class="bg-gray-50 dark:bg-gray-800">
									<tr>
										<th
											scope="col"
											class="cursor-pointer px-4 py-3.5 text-left text-sm font-normal text-gray-500 dark:text-gray-400 rtl:text-right"
										>
											<span>회사명</span>
										</th>
										<th
											scope="col"
											class="cursor-pointer px-4 py-3.5 text-left text-sm font-normal text-gray-500 dark:text-gray-400 rtl:text-right"
										>
											출력물 종류
										</th>
										<th
											scope="col"
											class="cursor-pointer px-4 py-3.5 text-left text-sm font-normal text-gray-500 dark:text-gray-400 rtl:text-right"
										>
											<span>사업자번호</span>
										</th>
										<th
											scope="col"
											class="cursor-pointer px-4 py-3.5 text-left text-sm font-normal text-gray-500 dark:text-gray-400 rtl:text-right"
										>
											<span>대표자</span>
											<i class="float-right ml-auto"></i>
										</th>
										<th
											scope="col"
											class="cursor-pointer px-12 py-3.5 text-left text-sm font-normal text-gray-500 dark:text-gray-400 rtl:text-right"
										>
											주소
										</th>
										<th
											scope="col"
											class="cursor-pointer px-4 py-3.5 text-left text-sm font-normal text-gray-500 dark:text-gray-400 rtl:text-right"
										>
											전화번호
										</th>
										<th scope="col" class="relative px-4 py-3.5">
											<span class="sr-only">Edit</span>
										</th>
									</tr>
								</thead>
								<tbody
									class="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900"
								>
									{#each data.info as item}
										<tr>
											<th
												scope="col"
												class="cursor-pointer px-4 py-3.5 text-left text-sm font-normal text-gray-500 dark:text-gray-400 rtl:text-right"
											>
												<span>{item.name}</span>
											</th>
											<td
												scope="col"
												class="cursor-pointer px-4 py-3.5 text-left text-sm font-normal text-gray-500 dark:text-gray-400 rtl:text-right"
											>
												<span>{convertItemTypes(item.item)}</span>
											</td>
											<td
												scope="col"
												class="cursor-pointer px-4 py-3.5 text-left text-sm font-normal text-gray-500 dark:text-gray-400 rtl:text-right"
											>
												<span>{item.businessnumber}</span>
											</td>
											<td
												scope="col"
												class="cursor-pointer px-4 py-3.5 text-left text-sm font-normal text-gray-500 dark:text-gray-400 rtl:text-right"
											>
												<span>{item.representative}</span>
												<i class="float-right ml-auto"></i>
											</td>
											<td
												scope="col"
												class="cursor-pointer px-12 py-3.5 text-left text-sm font-normal text-gray-500 dark:text-gray-400 rtl:text-right"
											>
												<span>{item.address}</span>
											</td>
											<td
												scope="col"
												class="cursor-pointer px-4 py-3.5 text-left text-sm font-normal text-gray-500 dark:text-gray-400 rtl:text-right"
											>
												<span>{item.cellnumber}</span>
											</td>
											<td class="whitespace-nowrap px-4 py-4 text-sm">
												<button
													class="rounded-lg px-2 py-1 text-gray-500 transition-colors duration-200 hover:bg-gray-100 dark:text-gray-300"
													aria-label="수정"
													onclick={() => editNewCompany(item)}
												>
													<i class="ri-more-2-line text-lg"></i>
												</button>
												<button
													class="rounded-lg px-2 py-1 text-gray-500 transition-colors duration-200 hover:bg-gray-100 dark:text-gray-300"
													aria-label="삭제"
												>
													<i class="ri-delete-bin-line"></i>
												</button>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
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
