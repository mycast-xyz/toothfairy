<script lang="ts">
	// 캘린더 처리용 DatePicker
	import { WindowService } from '../../../app/service/WindowService';
	import { CenterCompany } from '../../../app/model/company/CenterCompany';

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
			companyData.item = companyData.item.split(',').map((item) => item.trim());
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

<main class="ml-64 mt-8 min-h-screen flex-1 bg-gray-100 p-8">
	<article class="w-full pl-3 pr-5 pt-3">
		<nav
			class="request-list content-nav-box block h-auto w-full rounded-lg border border-gray-200 bg-white px-4 py-3 shadow"
		>
			<div class="re-list-title flex w-full flex-row">
				<div class="box-title inline-block items-center">
					<h3 class="py-1 py-px text-3xl font-extrabold text-violet-500">거래처 목록</h3>
				</div>
				<button
					type="button"
					onclick={addNewCompany}
					class="mb-2 ml-auto rounded-lg bg-violet-500 px-5 py-3 text-sm font-medium text-white hover:bg-violet-800 focus:outline-none focus:ring-4 focus:ring-violet-300 dark:bg-violet-600 dark:hover:bg-violet-700 dark:focus:ring-violet-900"
				>
					거래처 추가
				</button>
			</div>
			<div class="float-right ml-auto inline-block w-auto items-center"></div>
		</nav>
		<article class="print-list">
			<div class="mt-6 flex flex-col">
				<div class="-mx-4 -my-2 sm:-mx-6 lg:-mx-8">
					<div class="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
						<div
							class=" overflow-auto border border-gray-200 shadow-lg dark:border-gray-700 md:rounded-lg"
						>
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
