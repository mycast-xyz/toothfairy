<script lang="ts">
	import { onMount } from 'svelte';
	import { writable } from 'svelte/store';
	import PageHeaderBar from '../../../app/view/components/PageHeaderBar.svelte';
	import MonthDatePicker from '../../../app/view/components/datepicker/MonthDatePicker.svelte';
	import {
		fetchPowderList,
		savePowderRecord,
		savePowderConfig
	} from '../../../app/service/powder/PowderService';
	import { toastStore } from '../../../app/service/ToastService';

	export let data: { date: string };

	const now = new Date();
	const [y, m] = (data?.date || '').split('-').map(Number);
	let selectedYear = writable(y || now.getFullYear());
	let selectedMonth = writable(m || now.getMonth() + 1);
	$: dateStr = `${$selectedYear}-${String($selectedMonth).padStart(2, '0')}`;

	// 통 용량(스트림별, g). UI에서 설정. cap=캡, pa=파샬+올온포
	let capCap = 1000;
	let capPa = 1000;
	let savingConfig = false;

	interface Cell {
		units: number;
		remaining: number | null;
		/** 직접 보충량(g) */
		refill: number;
		/** 파샬+올온포로 보낸 양(g). 캡에서만 사용 */
		transferOut: number;
		/** 캡에서 받은 양(g). 파샬+올온포에서만 사용 */
		transferIn: number;
	}
	interface Row {
		date: string;
		cap: Cell;
		pa: Cell;
	}
	let rows: Row[] = [];
	let loading = false;
	let error = '';

	const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
	const weekday = (d: string) => weekdays[new Date(d).getDay()] ?? '';

	async function loadData() {
		loading = true;
		error = '';
		try {
			const { days, records, config } = await fetchPowderList(dateStr);
			capCap = Number(config.cap) || 1000;
			capPa = Number(config.partialAllonfour) || 1000;

			const byDate: Record<string, Row> = {};
			for (const d of days) {
				byDate[d.date] = {
					date: d.date,
					cap: {
						units: d.capUnits,
						remaining: null,
						refill: 0,
						transferOut: 0,
						transferIn: 0
					},
					pa: {
						units: d.partialAllonfourUnits,
						remaining: null,
						refill: 0,
						transferOut: 0,
						transferIn: 0
					}
				};
			}
			for (const r of records) {
				if (!byDate[r.date]) {
					byDate[r.date] = {
						date: r.date,
						cap: { units: 0, remaining: null, refill: 0, transferOut: 0, transferIn: 0 },
						pa: { units: 0, remaining: null, refill: 0, transferOut: 0, transferIn: 0 }
					};
				}
				const cell = r.powderType === 'cap' ? byDate[r.date].cap : byDate[r.date].pa;
				cell.remaining = Number(r.remainingAmt);
				cell.refill = Number(r.refillAmt) || 0;
				cell.transferOut = Number(r.transferOutAmt) || 0;
				cell.transferIn = Number(r.transferInAmt) || 0;
			}
			rows = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
		} catch (e) {
			console.error('❌ 파우더 조회 실패:', e);
			error = '파우더 데이터를 불러오지 못했습니다.';
			rows = [];
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

	// 소모량/유닛당 계산. 직전 '남은량 기록 있는' 행 기준. 보충·이동 모두 g 단위.
	//   캡  소모량 = 직전 남은량 + 직접보충 − 파샬로 보낸 양 − 오늘 남은량
	//   파샬 소모량 = 직전 남은량 + 직접보충 + 캡에서 받은 양 − 오늘 남은량
	// 파샬+올온포는 캡에서 파우더를 옮겨 쓰므로, 이동분을 캡에서 빼주지 않으면
	// 캡 소모량이 과대 계상되어 유닛당 사용량이 실제보다 높게 나온다.
	$: computed = rows.map((row, i) => {
		const calc = (key: 'cap' | 'pa') => {
			const cur = row[key];
			if (cur.remaining == null) return { c: null as number | null, pu: null as number | null };
			let prev: Cell | null = null;
			for (let j = i - 1; j >= 0; j--) {
				if (rows[j][key].remaining != null) {
					prev = rows[j][key];
					break;
				}
			}
			if (!prev) return { c: null, pu: null }; // 첫 기록일: 기준값
			const c =
				(prev.remaining as number) +
				(cur.refill || 0) +
				(cur.transferIn || 0) -
				(cur.transferOut || 0) -
				cur.remaining;
			const pu = cur.units > 0 ? c / cur.units : null;
			return { c, pu };
		};
		return { cap: calc('cap'), pa: calc('pa') };
	});

	// 이동량 대조: 같은 날 '캡이 보낸 양' 과 '파샬이 받은 양' 이 어긋나면 표시한다.
	$: transferMismatch = rows.map((row) => (row.cap.transferOut || 0) !== (row.pa.transferIn || 0));
	$: mismatchCount = transferMismatch.filter(Boolean).length;

	const fmtG = (v: number | null) => (v == null ? '—' : `${Math.round(v).toLocaleString()}g`);
	const fmtPer = (v: number | null) => (v == null ? '—' : v.toFixed(1));

	async function onEdit(i: number, key: 'cap' | 'pa') {
		rows = rows; // 재계산 트리거
		const cell = rows[i][key];
		const powderType = key === 'cap' ? 'cap' : 'partialAllonfour';
		try {
			await savePowderRecord(
				powderType,
				rows[i].date,
				Number(cell.remaining) || 0,
				Number(cell.refill) || 0,
				Number(cell.transferOut) || 0,
				Number(cell.transferIn) || 0
			);
		} catch (e: any) {
			toastStore.error(e?.message || '저장에 실패했습니다.');
		}
	}

	async function saveConfig() {
		savingConfig = true;
		try {
			await savePowderConfig([
				{ powderType: 'cap', bottleCapacityG: Number(capCap) || 0 },
				{ powderType: 'partialAllonfour', bottleCapacityG: Number(capPa) || 0 }
			]);
			toastStore.success('통 용량을 저장했습니다.');
			rows = rows; // 소모량 재계산
		} catch (e: any) {
			toastStore.error(e?.message || '통 용량 저장에 실패했습니다.');
		} finally {
			savingConfig = false;
		}
	}
</script>

<svelte:head>
	<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/remixicon@3.5.0/fonts/remixicon.css" />
</svelte:head>

<main class="ml-64 mt-8 min-h-screen flex-1 bg-gray-100 p-8 dark:bg-gray-900">
	<PageHeaderBar
		title="파우더 관리"
		description="일자별 파우더 남은량·보충을 입력하면 소모량과 유닛당 사용량이 계산됩니다."
	></PageHeaderBar>

	<div class="mt-4 rounded-lg bg-white p-4 shadow dark:bg-gray-800">
		<!-- 상단: 월 선택 + 통용량 설정 -->
		<div class="mb-4 flex flex-wrap items-end justify-between gap-4">
			<div class="flex items-center gap-3">
				<MonthDatePicker
					bind:selectedYear={$selectedYear}
					selectedMonth={$selectedMonth}
					on:yearChange={handleYearChange}
					on:select={handleMonthSelect}
				/>
				<span class="text-xs text-gray-500 dark:text-gray-400">
					유닛은 센터 출력물 자동 연동(정상+리메이크, 커스텀 제외)
				</span>
			</div>
			<div class="flex items-end gap-2 text-sm">
				<label class="flex flex-col text-gray-500 dark:text-gray-400">
					캡 통 용량(g)
					<input
						type="number"
						bind:value={capCap}
						class="mt-1 w-28 rounded border border-gray-300 px-2 py-1 text-right dark:border-gray-600 dark:bg-gray-700 dark:text-white"
					/>
				</label>
				<label class="flex flex-col text-gray-500 dark:text-gray-400">
					올온포·파샬 통 용량(g)
					<input
						type="number"
						bind:value={capPa}
						class="mt-1 w-28 rounded border border-gray-300 px-2 py-1 text-right dark:border-gray-600 dark:bg-gray-700 dark:text-white"
					/>
				</label>
				<button
					type="button"
					onclick={saveConfig}
					disabled={savingConfig}
					class="rounded-lg bg-violet-500 px-3 py-2 text-white hover:bg-violet-600 disabled:opacity-60"
				>
					{savingConfig ? '저장 중...' : '통 용량 저장'}
				</button>
			</div>
		</div>

		<div class="overflow-x-auto">
			<table class="min-w-full text-sm">
				<thead>
					<tr class="text-gray-500 dark:text-gray-400">
						<th
							rowspan="2"
							class="border-b border-gray-200 px-3 py-2 text-left dark:border-gray-700">날짜</th
						>
						<th
							colspan="6"
							class="border-b border-l border-gray-200 px-3 py-2 text-center dark:border-gray-700"
							>캡 파우더</th
						>
						<th
							colspan="6"
							class="border-b border-l border-gray-200 px-3 py-2 text-center dark:border-gray-700"
							>올온포·파샬 파우더</th
						>
					</tr>
					<tr class="text-xs text-gray-400">
						<th class="border-b border-l border-gray-200 px-2 py-1 dark:border-gray-700"
							>남은량(g)</th
						>
						<th class="border-b border-gray-200 px-2 py-1 dark:border-gray-700">보충(g)</th>
						<th class="border-b border-gray-200 px-2 py-1 dark:border-gray-700">파샬로 보냄(g)</th>
						<th class="border-b border-gray-200 px-2 py-1 dark:border-gray-700">소모량</th>
						<th class="border-b border-gray-200 px-2 py-1 dark:border-gray-700">유닛</th>
						<th class="border-b border-gray-200 px-2 py-1 dark:border-gray-700">g/유닛</th>
						<th class="border-b border-l border-gray-200 px-2 py-1 dark:border-gray-700"
							>남은량(g)</th
						>
						<th class="border-b border-gray-200 px-2 py-1 dark:border-gray-700">보충(g)</th>
						<th class="border-b border-gray-200 px-2 py-1 dark:border-gray-700">캡에서 받음(g)</th>
						<th class="border-b border-gray-200 px-2 py-1 dark:border-gray-700">소모량</th>
						<th class="border-b border-gray-200 px-2 py-1 dark:border-gray-700">유닛</th>
						<th class="border-b border-gray-200 px-2 py-1 dark:border-gray-700">g/유닛</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-100 dark:divide-gray-700">
					{#if loading}
						<tr
							><td colspan="13" class="px-3 py-10 text-center text-gray-500">불러오는 중...</td></tr
						>
					{:else if error}
						<tr><td colspan="13" class="px-3 py-10 text-center text-red-600">{error}</td></tr>
					{:else if rows.length === 0}
						<tr
							><td colspan="13" class="px-3 py-10 text-center text-gray-500"
								>해당 월 데이터가 없습니다.</td
							></tr
						>
					{:else}
						{#each rows as row, i (row.date)}
							<tr class="text-gray-800 dark:text-gray-200">
								<td class="whitespace-nowrap px-3 py-1.5">
									{row.date}<span class="ml-1 text-xs text-gray-400">({weekday(row.date)})</span>
								</td>
								<!-- 캡 -->
								<td class="border-l border-gray-100 px-1 py-1 dark:border-gray-700">
									<input
										type="number"
										bind:value={rows[i].cap.remaining}
										onchange={() => onEdit(i, 'cap')}
										class="w-20 rounded border border-gray-200 px-1 py-0.5 text-right dark:border-gray-600 dark:bg-gray-700"
									/>
								</td>
								<td class="px-1 py-1">
									<input
										type="number"
										bind:value={rows[i].cap.refill}
										onchange={() => onEdit(i, 'cap')}
										class="w-20 rounded border border-gray-200 px-1 py-0.5 text-right dark:border-gray-600 dark:bg-gray-700"
									/>
								</td>
								<td class="px-1 py-1">
									<input
										type="number"
										bind:value={rows[i].cap.transferOut}
										onchange={() => onEdit(i, 'cap')}
										title="파샬+올온포로 옮긴 양(g)"
										class="w-20 rounded border px-1 py-0.5 text-right dark:bg-gray-700 {transferMismatch[
											i
										]
											? 'border-amber-400 bg-amber-50 dark:border-amber-500 dark:bg-amber-900/30'
											: 'border-gray-200 dark:border-gray-600'}"
									/>
								</td>
								<td class="px-2 py-1.5 text-right">{fmtG(computed[i].cap.c)}</td>
								<td class="px-2 py-1.5 text-right text-gray-500">{row.cap.units}</td>
								<td class="px-2 py-1.5 text-right font-medium">{fmtPer(computed[i].cap.pu)}</td>
								<!-- 올온포·파샬 -->
								<td class="border-l border-gray-100 px-1 py-1 dark:border-gray-700">
									<input
										type="number"
										bind:value={rows[i].pa.remaining}
										onchange={() => onEdit(i, 'pa')}
										class="w-20 rounded border border-gray-200 px-1 py-0.5 text-right dark:border-gray-600 dark:bg-gray-700"
									/>
								</td>
								<td class="px-1 py-1">
									<input
										type="number"
										bind:value={rows[i].pa.refill}
										onchange={() => onEdit(i, 'pa')}
										class="w-20 rounded border border-gray-200 px-1 py-0.5 text-right dark:border-gray-600 dark:bg-gray-700"
									/>
								</td>
								<td class="px-1 py-1">
									<input
										type="number"
										bind:value={rows[i].pa.transferIn}
										onchange={() => onEdit(i, 'pa')}
										title="캡에서 받은 양(g)"
										class="w-20 rounded border px-1 py-0.5 text-right dark:bg-gray-700 {transferMismatch[
											i
										]
											? 'border-amber-400 bg-amber-50 dark:border-amber-500 dark:bg-amber-900/30'
											: 'border-gray-200 dark:border-gray-600'}"
									/>
								</td>
								<td class="px-2 py-1.5 text-right">{fmtG(computed[i].pa.c)}</td>
								<td class="px-2 py-1.5 text-right text-gray-500">{row.pa.units}</td>
								<td class="px-2 py-1.5 text-right font-medium">{fmtPer(computed[i].pa.pu)}</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>

		{#if mismatchCount > 0}
			<p
				class="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
			>
				⚠ 캡이 보낸 양과 파샬+올온포가 받은 양이 다른 날이 {mismatchCount}일 있습니다. 표시된 칸을
				확인해주세요.
			</p>
		{/if}
		<p class="mt-3 text-xs text-gray-400">
			※ 캡 소모량 = 전날 남은량 + 보충(g) − 파샬로 보낸 양(g) − 오늘 남은량<br />
			※ 파샬+올온포 소모량 = 전날 남은량 + 보충(g) + 캡에서 받은 양(g) − 오늘 남은량<br />
			※ 첫 기록일·유닛 0인 날은 계산 불가(—). 유닛은 센터 출력물의 정상+리메이크 합계이며, 커스텀은 제외됩니다.
		</p>
	</div>
</main>
