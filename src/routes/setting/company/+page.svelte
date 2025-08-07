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

	// 활성 뷰잉 상태 관리
	let activeView = $state('view1');

	// 폼 데이터 객체
	let formData = $state({
		corpName: '',
		classification: '',
		region: '',
		address: '',
		phoneNumber: '',
		businessNumber: '',
		email: ''
	});

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
				<button
					type="button"
					class="rounded-lg bg-gray-500 px-4 py-2 text-sm font-medium text-white hover:bg-gray-600 focus:outline-none focus:ring-4 focus:ring-gray-300"
				>
					<i class="ri-book-marked-line pr-1 text-base"></i>
					기본 수가 설정
				</button>
				<!-- 거래처 추가 -->
				<button
					type="button"
					onclick={addNewCompany}
					class="rounded-lg bg-violet-500 px-4 py-2 text-sm font-medium text-white hover:bg-violet-600 focus:outline-none focus:ring-4 focus:ring-violet-300"
				>
					<i class="ri-tooth-line pr-1 text-base"></i>
					거래처 추가
				</button>
			</div>
		</PageHeaderBar>
		<article class="print-list">
			<div class="flex flex-col">
				<div class="flex h-full w-full flex-col lg:flex-row">
					<div
						class="mr-4 w-full rounded-sm border border-gray-200 bg-white text-lg shadow-lg lg:w-1/3"
					>
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
											분류
										</th>
										<th
											scope="col"
											class="cursor-pointer px-4 py-3.5 text-left text-sm font-normal text-gray-500 dark:text-gray-400 rtl:text-right"
										>
											<span>권역</span>
										</th>
									</tr>
								</thead>
								<tbody
									class="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900"
								>
									{#if !data.info || data.info.length === 0}
										<tr>
											<td colspan="8" class="py-12 text-center">
												<div class="flex flex-col items-center justify-center">
													<i class="ri-file-damage-line mb-4 text-4xl text-gray-400"></i>
													<p class="text-lg font-medium text-gray-600 dark:text-gray-400">
														거래처가 존재하지 않습니다.
													</p>
													<p class="mt-2 text-sm text-gray-500 dark:text-gray-500">
														새로운 거래처를 추가해주세요.
													</p>
												</div>
											</td>
										</tr>
									{:else}
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
									{/if}
								</tbody>
							</table>
						</div>
					</div>
					<div
						class="mr-4 w-full rounded-sm border border-gray-200 bg-white text-lg shadow-lg lg:w-2/3"
					>
						<!-- 뷰잉 컨트롤 버튼 -->
						<div class="flex border-b border-gray-200 p-4">
							<h4 class="text-lg font-semibold text-gray-700">신규 거래처 추가</h4>
						</div>

						<!-- 뷰잉 컨텐츠 영역 -->
						<div class="p-2">
							{#if activeView === 'view1'}
								<div class="view1-content">
									<form class="space-y-6 p-4">
										<div class="grid grid-cols-1 gap-6 font-medium">
											<!-- 한 줄에 하나씩 배치 -->
											<div class="mb-2 flex items-center space-x-3">
												<label class="w-32 text-sm font-medium text-gray-700">회사명</label>
												<input
													type="text"
													bind:value={formData.corpName}
													class="flex-1 rounded border px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
													placeholder="회사명 입력"
												/>
											</div>
											<div class="mb-2 flex items-center space-x-3">
												<label class="w-32 text-sm font-medium text-gray-700">구분</label>
												<select
													bind:value={formData.classification}
													class="flex-1 rounded border px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
												>
													<option value="">선택</option>
													<option value="기공소">기공소</option>
													<option value="치과">치과</option>
												</select>
											</div>
											<div class="mb-2 flex items-center space-x-3">
												<label class="w-32 text-sm font-medium text-gray-700">지역</label>
												<input
													type="text"
													bind:value={formData.region}
													class="flex-1 rounded border px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
													placeholder="지역 입력"
												/>
											</div>
											<div class="mb-2 flex items-center space-x-3">
												<label class="w-32 text-sm font-medium text-gray-700">주소</label>
												<input
													type="text"
													bind:value={formData.address}
													class="flex-1 rounded border px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
													placeholder="주소 입력"
												/>
											</div>
											<div class="mb-2 flex items-center space-x-3">
												<label class="w-32 text-sm font-medium text-gray-700">전화번호</label>
												<input
													type="text"
													bind:value={formData.phoneNumber}
													class="flex-1 rounded border px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
													placeholder="전화번호 입력"
												/>
											</div>
											<div class="mb-2 flex items-center space-x-3">
												<label class="w-32 text-sm font-medium text-gray-700">사업자번호</label>
												<input
													type="text"
													bind:value={formData.businessNumber}
													class="flex-1 rounded border px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
													placeholder="사업자등록번호 입력"
												/>
											</div>
											<div class="mb-2 flex items-center space-x-3">
												<label class="w-32 text-sm font-medium text-gray-700">이메일</label>
												<input
													type="email"
													bind:value={formData.email}
													class="flex-1 rounded border px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
													placeholder="이메일 입력"
												/>
											</div>
										</div>
										<div class="flex justify-end pt-3">
											<button
												type="submit"
												class="rounded bg-violet-500 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-violet-600"
												>저장</button
											>
										</div>
									</form>
								</div>
							{:else if activeView === 'view2'}
								<div class="view2-content">
									<h3 class="mb-4 text-lg font-semibold text-gray-800">뷰잉 2 컨텐츠</h3>
									<div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
										<p class="text-gray-600">여기에 뷰잉 2의 내용이 들어갑니다.</p>
										<p class="mt-2 text-sm text-gray-500">
											이 영역에 다른 컴포넌트나 데이터를 표시할 수 있습니다.
										</p>
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
