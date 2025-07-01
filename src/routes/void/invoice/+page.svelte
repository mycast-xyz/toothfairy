<script lang="ts">
	// 캘린더 처리용 DatePicker
	import type { PageData } from './$types';
	import { writable } from 'svelte/store';
	import { goto } from '$app/navigation';

	const { data } = $props<{ data: any }>();
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

		window.location.href = `/void/invoice?${params.toString()}`;
	}
</script>

<main class="ml-64 mt-8 min-h-screen flex-1 bg-gray-100 p-8">
	<article class="w-full pl-3 pr-5 pt-3">
		<nav
			class="request-list content-nav-box block h-auto w-full rounded-lg border border-gray-200 bg-white px-4 py-3 shadow"
		>
			<div class="re-list-title flex w-full flex-row">
				<div class="box-title inline-block items-center">
					<h3 class="py-1 py-px text-3xl font-extrabold text-violet-500">청구서 목록</h3>
				</div>
			</div>
			<div class="nav-search-box mt-4 border-t border-gray-100 pt-4">
				<div class="relative ml-2 inline-block">
					<div class="relative inline-flex space-x-2">
						<input
							type="number"
							class="h-10 w-24 rounded-lg border border-gray-300 px-4 py-1 text-sm focus:border-blue-500 focus:outline-none"
							placeholder="{$selectedYear}년"
							bind:value={$selectedYear}
						/>
						<input
							type="number"
							class="h-10 w-20 rounded-lg border border-gray-300 px-4 py-1 text-sm focus:border-blue-500 focus:outline-none"
							placeholder="{$selectedMonth}월"
							bind:value={$selectedMonth}
						/>
					</div>
				</div>
				<div class="float-right ml-auto inline-block w-auto items-center">
					<button
						type="button"
						onclick={handleSearchClick}
						class="mb-2 rounded-lg bg-violet-500 px-5 py-3 text-sm font-medium text-white hover:bg-violet-800 focus:outline-none focus:ring-4 focus:ring-violet-300 dark:bg-violet-600 dark:hover:bg-violet-700 dark:focus:ring-violet-900"
					>
						검색
					</button>
				</div>
			</div>
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
											캡
										</th>
										<th
											scope="col"
											class="cursor-pointer px-4 py-3.5 text-left text-sm font-normal text-gray-500 dark:text-gray-400 rtl:text-right"
										>
											<span>파샬</span>
										</th>
										<th
											scope="col"
											class="cursor-pointer px-4 py-3.5 text-left text-sm font-normal text-gray-500 dark:text-gray-400 rtl:text-right"
										>
											<span>커스텀</span>
											<i class="float-right ml-auto"></i>
										</th>
										<th
											scope="col"
											class="cursor-pointer px-4 py-3.5 text-left text-sm font-normal text-gray-500 dark:text-gray-400 rtl:text-right"
										>
											<span>올온포</span>
											<i class="float-right ml-auto"></i>
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
												<a href={`/void/invoice/${item.id}?date=${data.param.date}&item=cap`}>
													<span
														>출력: {item.invoice.cap.normal}, 리메이크: {item.invoice.cap
															.remake}</span
													>
												</a>
											</td>
											<td
												scope="col"
												class="cursor-pointer px-4 py-3.5 text-left text-sm font-normal text-gray-500 dark:text-gray-400 rtl:text-right"
											>
												<a href={`/void/invoice/${item.id}?date=${data.param.date}&item=partial`}>
													<span
														>출력: {item.invoice.partial.normal}, 리메이크: {item.invoice.partial
															.remake}</span
													>
												</a>
											</td>
											<td
												scope="col"
												class="cursor-pointer px-4 py-3.5 text-left text-sm font-normal text-gray-500 dark:text-gray-400 rtl:text-right"
											>
												<a href={`/void/invoice/${item.id}?date=${data.param.date}&item=custom`}>
													<span
														>출력: {item.invoice.custom.normal}, 리메이크: {item.invoice.custom
															.remake}</span
													>
												</a>
											</td>
											<td
												scope="col"
												class="cursor-pointer px-4 py-3.5 text-left text-sm font-normal text-gray-500 dark:text-gray-400 rtl:text-right"
											>
												<a href={`/void/invoice/${item.id}?date=${data.param.date}&item=allonfour`}>
													<span
														>출력: {item.invoice.allonfour.normal}, 리메이크: {item.invoice
															.allonfour.remake}</span
													>
												</a>
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
