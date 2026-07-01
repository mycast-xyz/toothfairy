<script lang="ts">
	import { onMount } from 'svelte';
	import { writable } from 'svelte/store';
	import PageHeaderBar from '../../../app/view/components/PageHeaderBar.svelte';
	import MonthDatePicker from '../../../app/view/components/datepicker/MonthDatePicker.svelte';
	import { fetchPowderUnits } from '../../../app/service/powder/PowderService';
	import type { PowderDayUnits } from '../../../app/model/powder/PowderType';

	export let data: { date: string };

	const now = new Date();
	const [y, m] = (data?.date || '').split('-').map(Number);
	let selectedYear = writable(y || now.getFullYear());
	let selectedMonth = writable(m || now.getMonth() + 1);

	let days: PowderDayUnits[] = [];
	let loading = false;
	let error = '';

	$: dateStr = `${$selectedYear}-${String($selectedMonth).padStart(2, '0')}`;

	async function loadData() {
		loading = true;
		error = '';
		try {
			days = await fetchPowderUnits(dateStr);
		} catch (e) {
			console.error('❌ 파우더 유닛 조회 실패:', e);
			error = '파우더 유닛을 불러오지 못했습니다.';
			days = [];
		} finally {
			loading = false;
		}
	}

	onMount(loadData);

	function handleYearChange(event: CustomEvent) {
		selectedYear.set(event.detail.year);
		loadData();
	}
	function handleMonthSelect(event: CustomEvent) {
		selectedYear.set(event.detail.year);
		selectedMonth.set(event.detail.month);
		loadData();
	}

	$: totalCapPartial = days.reduce((s, d) => s + d.capPartialUnits, 0);
	$: totalAllonfour = days.reduce((s, d) => s + d.allonfourUnits, 0);

	// 요일 표시용
	const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
	function weekday(dateStr: string): string {
		return weekdays[new Date(dateStr).getDay()] ?? '';
	}
</script>

<svelte:head>
	<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/remixicon@3.5.0/fonts/remixicon.css" />
</svelte:head>

<main class="ml-64 mt-8 min-h-screen flex-1 bg-gray-100 p-8 dark:bg-gray-900">
	<PageHeaderBar
		title="파우더 관리"
		description="일자별 출력 유닛과 파우더 소모량을 관리합니다."
	></PageHeaderBar>

	<div class="mt-4 rounded-lg bg-white p-4 shadow dark:bg-gray-800">
		<!-- 월 선택 -->
		<div class="mb-4 flex items-center gap-3">
			<MonthDatePicker
				bind:selectedYear={$selectedYear}
				selectedMonth={$selectedMonth}
				on:yearChange={handleYearChange}
				on:select={handleMonthSelect}
			/>
			<span class="text-sm text-gray-500 dark:text-gray-400">
				유닛 수는 센터 출력물에서 자동 연동됩니다(정상+리메이크, 커스텀 제외).
			</span>
		</div>

		<!-- 일자별 유닛 테이블 -->
		<div class="overflow-x-auto">
			<table class="min-w-full text-sm">
				<thead>
					<tr class="border-b border-gray-200 text-gray-500 dark:border-gray-700 dark:text-gray-400">
						<th class="px-4 py-3 text-left">날짜</th>
						<th class="px-4 py-3 text-right">캡·파샬 유닛</th>
						<th class="px-4 py-3 text-right">올온포 유닛</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-100 dark:divide-gray-700">
					{#if loading}
						<tr><td colspan="3" class="px-4 py-10 text-center text-gray-500">불러오는 중...</td></tr>
					{:else if error}
						<tr><td colspan="3" class="px-4 py-10 text-center text-red-600">{error}</td></tr>
					{:else if days.length === 0}
						<tr
							><td colspan="3" class="px-4 py-10 text-center text-gray-500"
								>해당 월에 출력 유닛 기록이 없습니다.</td
							></tr
						>
					{:else}
						{#each days as d (d.date)}
							<tr class="text-gray-800 dark:text-gray-200">
								<td class="whitespace-nowrap px-4 py-2.5">
									{d.date}
									<span class="ml-1 text-xs text-gray-400">({weekday(d.date)})</span>
								</td>
								<td class="px-4 py-2.5 text-right font-medium">{d.capPartialUnits}</td>
								<td class="px-4 py-2.5 text-right font-medium">{d.allonfourUnits}</td>
							</tr>
						{/each}
					{/if}
				</tbody>
				{#if days.length > 0}
					<tfoot>
						<tr class="border-t-2 border-gray-300 font-semibold dark:border-gray-600">
							<td class="px-4 py-3">월 합계</td>
							<td class="px-4 py-3 text-right">{totalCapPartial}</td>
							<td class="px-4 py-3 text-right">{totalAllonfour}</td>
						</tr>
					</tfoot>
				{/if}
			</table>
		</div>

		<p class="mt-3 text-xs text-gray-400">
			※ 다음 단계에서 일자별 파우더 남은량·보충(통) 입력과 소모량·유닛당 사용량 계산이 추가됩니다.
		</p>
	</div>
</main>
