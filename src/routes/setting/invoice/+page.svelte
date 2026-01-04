<script lang="ts">
	// 캘린더 처리용 DatePicker
	import { writable } from 'svelte/store';
	import PageHeaderBar from '../../../app/view/components/PageHeaderBar.svelte';
	import MonthDatePicker from '../../../app/view/components/datepicker/MonthDatePicker.svelte';
	import DentistryInvoiceList from '../../../app/view/invoice/DentistryInvoiceList.svelte';
	import LabInvoiceList from '../../../app/view/invoice/LabInvoiceList.svelte';

	const { data } = $props<{ data: any }>();

	console.log(data.info);

	// 탭 상태 관리
	let activeTab = writable('dentistry'); // 'dentistry' 또는 'lab'

	// 날짜 초기화 함수
	function initializeDate() {
		const today = new Date();
		const defaultYear = today.getFullYear();
		const defaultMonth = today.getMonth() + 1;

		if (data.param.date) {
			const [year, month] = data.param.date.split('-').map(Number);
			return { year, month };
		}
		return { year: defaultYear, month: defaultMonth };
	}

	const { year, month } = initializeDate();
	let selectedYear = writable(year);
	let selectedMonth = writable(month);
	let selectedCorpName = writable('');

	function handleSearchClick() {
		const params = new URLSearchParams();
		params.append(
			'date',
			$selectedYear.toString() + '-' + $selectedMonth.toString().padStart(2, '0')
		);
		params.append('corpName', $selectedCorpName.toString());
		params.append('tab', $activeTab);

		window.location.href = `/setting/invoice?${params.toString()}`;
	}

	// MonthDatePicker 이벤트 핸들러
	function handleYearChange(event: CustomEvent) {
		selectedYear.set(event.detail.year);
	}

	function handleMonthSelect(event: CustomEvent) {
		selectedYear.set(event.detail.year);
		selectedMonth.set(event.detail.month);
	}

	// 탭 변경 핸들러
	function handleTabChange(tab: string) {
		activeTab.set(tab);
	}
</script>

<main class="ml-64 mt-8 min-h-screen flex-1 bg-gray-100 p-8">
	<article class="w-full">
		<PageHeaderBar title="청구서 관리" description="청구서 관리 페이지입니다."></PageHeaderBar>
		<article class="print-list">
			<div class="flex flex-col">
				<div class="-mx-4 -my-2 sm:-mx-6 lg:-mx-8">
					<div class="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
						<div class="border border-gray-200 shadow-lg dark:border-gray-700 md:rounded-lg">
							<!-- 상단 탭 및 필터 바 UI -->
							<div class="user-tab-bar w-full rounded-t-lg border-b border-gray-200 bg-white">
								<div class="flex flex-wrap items-center justify-between">
									<!-- 탭 메뉴 -->
									<div class="flex w-full px-2 pt-2">
										<button
											class="tab-btn min-w-24 cursor-pointer border-b-2 px-4 py-3 pt-2 text-sm font-semibold transition-colors duration-200 {$activeTab ===
											'dentistry'
												? 'border-violet-500 text-violet-600'
												: 'border-transparent text-gray-500 hover:text-gray-700'}"
											onclick={() => handleTabChange('dentistry')}
										>
											치과 청구서
										</button>
										<button
											class="tab-btn min-w-24 cursor-pointer border-b-2 px-4 py-3 pt-2 text-sm font-semibold transition-colors duration-200 {$activeTab ===
											'lab'
												? 'border-violet-500 text-violet-600'
												: 'border-transparent text-gray-500 hover:text-gray-700'}"
											onclick={() => handleTabChange('lab')}
										>
											기공소 청구서
										</button>
									</div>
									<!-- 오른쪽 필터/검색 -->
									<div
										class="flex w-full items-center gap-2 border-t border-gray-200 bg-gray-100 px-2 py-4"
									>
										<!-- MonthDatePicker 컴포넌트 사용 -->
										<div class="inline-block">
											<MonthDatePicker
												bind:selectedYear={$selectedYear}
												bind:selectedMonth={$selectedMonth}
												on:yearChange={handleYearChange}
												on:select={handleMonthSelect}
											/>
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
								<!-- 탭에 따른 컴포넌트 렌더링 -->
								{#if $activeTab === 'dentistry'}
									<DentistryInvoiceList {data} />
								{:else if $activeTab === 'lab'}
									<LabInvoiceList {data} />
								{/if}
							</div>
						</div>
					</div>
				</div>
			</div>
		</article>
	</article>
</main>
