<script lang="ts">
	// 캘린더 처리용 DatePicker

	import { writable } from 'svelte/store';

	const today = new Date();
	const currentYear = today.getFullYear();
	const currentMonth = today.getMonth() + 1; // 월은 0부터 시작하므로 1을 더해줍니다.

	const years = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3, currentYear - 4];
	let selectedYear = writable(years[0]);
	let selectedMonth = writable(currentMonth);

	$: console.log($selectedYear);
	function changeYear(direction: 'prev' | 'next') {
		selectedYear.update((currentYear) => {
			const currentIndex = years.indexOf(currentYear);
			if (direction === 'prev') {
				if (currentIndex > 0) {
					return years[currentIndex - 1];
				}
			} else if (direction === 'next') {
				if (currentIndex < years.length - 1) {
					return years[currentIndex + 1];
				}
			}
			return currentYear;
		});
	}

	function handleMonthClick(month: number) {
		console.log(`${month}월 버튼 클릭됨`);
		selectedMonth.set(month);
	}

	let dateSelectisOpen = false;
</script>

<main class="ml-64 mt-8 min-h-screen flex-1 bg-gray-100 p-8">
	<article class="w-full pl-3 pr-5 pt-3">
		<nav
			class="request-list content-nav-box block h-auto w-full rounded-lg border border-gray-200 bg-white px-4 py-3 shadow"
		>
			<div class="re-list-title flex w-full flex-row">
				<div class="box-title inline-block items-center">
					<h3 class="py-1 py-px text-3xl font-extrabold text-pink-500">출력물 목록</h3>
				</div>
			</div>
			<div class="nav-search-box mt-4 border-t border-gray-100 pt-4">
				<div class="shadow-xs inline-flex rounded-md" role="group">
					<button
						type="button"
						class="rounded-s-lg border border-gray-900 bg-transparent px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-900 hover:text-white focus:z-10 focus:bg-gray-900 focus:text-white focus:ring-2 focus:ring-gray-500 dark:border-white dark:text-white dark:hover:bg-gray-700 dark:hover:text-white dark:focus:bg-gray-700"
					>
						전체
					</button>
					<button
						type="button"
						class="border-b border-r border-t border-gray-900 bg-transparent px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-900 hover:text-white focus:z-10 focus:bg-gray-900 focus:text-white focus:ring-2 focus:ring-gray-500 dark:border-white dark:text-white dark:hover:bg-gray-700 dark:hover:text-white dark:focus:bg-gray-700"
					>
						캡
					</button>
					<button
						type="button"
						class="border-b border-r border-t border-gray-900 bg-transparent px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-900 hover:text-white focus:z-10 focus:bg-gray-900 focus:text-white focus:ring-2 focus:ring-gray-500 dark:border-white dark:text-white dark:hover:bg-gray-700 dark:hover:text-white dark:focus:bg-gray-700"
					>
						파샬
					</button>
					<button
						type="button"
						class="border-b border-t border-gray-900 bg-transparent px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-900 hover:text-white focus:z-10 focus:bg-gray-900 focus:text-white focus:ring-2 focus:ring-gray-500 dark:border-white dark:text-white dark:hover:bg-gray-700 dark:hover:text-white dark:focus:bg-gray-700"
					>
						커스텀
					</button>
					<button
						type="button"
						class="rounded-e-lg border border-gray-900 bg-transparent px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-900 hover:text-white focus:z-10 focus:bg-gray-900 focus:text-white focus:ring-2 focus:ring-gray-500 dark:border-white dark:text-white dark:hover:bg-gray-700 dark:hover:text-white dark:focus:bg-gray-700"
					>
						올온포
					</button>
				</div>
				<div class="relative ml-2 inline-block">
					<button
						type="button"
						onclick={() => (dateSelectisOpen = !dateSelectisOpen)}
						class="inline-flex items-center rounded-lg border border-gray-700 bg-white px-4 py-1 text-sm font-medium text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300"
					>
						<i class="ri-calendar-2-line mr-2 text-lg"></i>
						<p>{$selectedYear}년 {$selectedMonth}월</p>
					</button>
					{#if dateSelectisOpen}
						<div
							class="absolute left-0 mt-2 w-64 rounded-lg border border-gray-100 bg-white p-4 shadow-lg"
						>
							<div class="mb-4 flex items-center justify-between">
								<button
									class="text-gray-600 hover:text-gray-900"
									aria-label="이전 년도"
									onclick={() => changeYear('next')}
								>
									<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M15 19l-7-7 7-7"
										/>
									</svg>
								</button>
								<p class="text-lg font-bold">{$selectedYear}</p>
								<button
									class="text-gray-600 hover:text-gray-900"
									aria-label="다음 년도"
									onclick={() => changeYear('prev')}
								>
									<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M9 5l7 7-7 7"
										/>
									</svg>
								</button>
							</div>

							<div class="grid grid-cols-3 gap-2">
								{#each Array(12) as _, i}
									<button
										class="rounded-lg border p-2 text-sm hover:bg-gray-100"
										onclick={() => handleMonthClick(i + 1)}
									>
										{i + 1}월
									</button>
								{/each}
							</div>
						</div>
					{/if}
				</div>
				<div class="float-right ml-auto inline-block w-auto items-center">
					<button
						type="button"
						class="mb-2 rounded-lg bg-pink-500 px-5 py-3 text-sm font-medium text-white hover:bg-pink-800 focus:outline-none focus:ring-4 focus:ring-violet-300 dark:bg-pink-600 dark:hover:bg-pink-700 dark:focus:ring-pink-900"
					>
						검색
					</button>
				</div>
			</div>
		</nav>
		<article class="print-list">
			<div class="mt-6 flex flex-col">
				<div class="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
					<div class="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
						<div class="overflow-hidden border border-gray-200 dark:border-gray-700 md:rounded-lg">
							<table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
								<thead class="bg-gray-50 dark:bg-gray-800">
									<tr>
										<th
											scope="col"
											class="px-4 py-3.5 text-left text-sm font-normal text-gray-500 dark:text-gray-400 rtl:text-right"
										>
											<span>날짜</span>
										</th>
										<th
											scope="col"
											class="px-4 py-3.5 text-left text-sm font-normal text-gray-500 dark:text-gray-400 rtl:text-right"
										>
											<span>회사</span>
										</th>
										<th
											scope="col"
											class="px-12 py-3.5 text-left text-sm font-normal text-gray-500 dark:text-gray-400 rtl:text-right"
										>
											출력물 종류
										</th>

										<th
											scope="col"
											class="px-4 py-3.5 text-left text-sm font-normal text-gray-500 dark:text-gray-400 rtl:text-right"
										>
											출럭 파일 갯수
										</th>

										<th
											scope="col"
											class="px-4 py-3.5 text-left text-sm font-normal text-gray-500 dark:text-gray-400 rtl:text-right"
										>
											출력 유닛 갯수
										</th>

										<th
											scope="col"
											class="px-4 py-3.5 text-left text-sm font-normal text-gray-500 dark:text-gray-400 rtl:text-right"
										>
											파일 명
										</th>

										<th scope="col" class="relative px-4 py-3.5">
											<span class="sr-only">Edit</span>
										</th>
									</tr>
								</thead>
								<tbody
									class="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900"
								>
									<tr>
										<td class="whitespace-nowrap px-4 py-4 text-sm font-medium">
											<div>
												<h2 class="font-medium text-gray-800 dark:text-white">2025-02-04</h2>
												<p class="text-sm font-normal text-gray-600 dark:text-gray-400">월요일</p>
											</div>
										</td>
										<td class="whitespace-nowrap px-4 py-4 text-sm font-medium">
											<div>
												<h2 class="font-medium text-gray-800 dark:text-white">이정</h2>
											</div>
										</td>
										<td class="whitespace-nowrap px-12 py-4 text-sm font-medium">
											<div
												class="inline gap-x-2 rounded-full bg-gray-100 px-3 py-1 text-sm font-normal text-gray-500 dark:bg-gray-800 dark:text-gray-400"
											>
												캡
											</div>
										</td>
										<td class="whitespace-nowrap px-4 py-4 text-sm">
											<div>
												<h4 class="text-gray-700 dark:text-gray-200">총합 : 15</h4>
												<p class="font-normal text-gray-500 dark:text-gray-400">
													정상 : 10개, 리메이크 : 5개
												</p>
											</div>
										</td>
										<td class="whitespace-nowrap px-4 py-4 text-sm">
											<div>
												<h4 class="text-gray-700 dark:text-gray-200">총합 : 30</h4>
												<p class="font-normal text-gray-500 dark:text-gray-400">
													정상 : 20개, 리메이크 : 10개
												</p>
											</div>
										</td>
										<td class="whitespace-nowrap px-4 py-4 text-sm"> </td>
										<td class="whitespace-nowrap px-4 py-4 text-sm">
											<button
												class="rounded-lg px-2 py-1 text-gray-500 transition-colors duration-200 hover:bg-gray-100 dark:text-gray-300"
											>
												<i class="ri-more-2-line text-lg"></i>
											</button>
										</td>
									</tr>
									<tr>
										<td class="whitespace-nowrap px-4 py-4 text-sm font-medium">
											<div>
												<h2 class="font-medium text-gray-800 dark:text-white">2025-02-04</h2>
												<p class="text-sm font-normal text-gray-600 dark:text-gray-400">월요일</p>
											</div>
										</td>
										<td class="whitespace-nowrap px-4 py-4 text-sm font-medium">
											<div>
												<h2 class="font-medium text-gray-800 dark:text-white">이정</h2>
											</div>
										</td>
										<td class="whitespace-nowrap px-12 py-4 text-sm font-medium">
											<div
												class="inline gap-x-2 rounded-full bg-emerald-100/60 px-3 py-1 text-sm font-normal text-emerald-500 dark:bg-gray-800"
											>
												파샬
											</div>
										</td>
										<td class="whitespace-nowrap px-4 py-4 text-sm">
											<div>
												<h4 class="text-gray-700 dark:text-gray-200">총합 : 15</h4>
												<p class="font-normal text-gray-500 dark:text-gray-400">
													정상 : 10개, 리메이크 : 5개
												</p>
											</div>
										</td>
										<td class="whitespace-nowrap px-4 py-4 text-sm">
											<div>
												<h4 class="text-gray-700 dark:text-gray-200">총합 : 30</h4>
												<p class="font-normal text-gray-500 dark:text-gray-400">
													정상 : 20개, 리메이크 : 10개
												</p>
											</div>
										</td>
										<td class="whitespace-nowrap px-4 py-4 text-sm">
											<p class="max-w-64 font-normal text-gray-500 dark:text-gray-400">
												차헌영_상악, 차헌역_하악, 이병구_상악, 이병구_하악
											</p>
										</td>
										<td class="whitespace-nowrap px-4 py-4 text-sm">
											<button
												class="rounded-lg px-2 py-1 text-gray-500 transition-colors duration-200 hover:bg-gray-100 dark:text-gray-300"
											>
												<i class="ri-more-2-line text-lg"></i>
											</button>
										</td>
									</tr>
									<tr>
										<td class="whitespace-nowrap px-4 py-4 text-sm font-medium">
											<div>
												<h2 class="font-medium text-gray-800 dark:text-white">2025-02-04</h2>
												<p class="text-sm font-normal text-gray-600 dark:text-gray-400">월요일</p>
											</div>
										</td>
										<td class="whitespace-nowrap px-4 py-4 text-sm font-medium">
											<div>
												<h2 class="font-medium text-gray-800 dark:text-white">이정</h2>
											</div>
										</td>
										<td class="whitespace-nowrap px-12 py-4 text-sm font-medium">
											<div
												class="inline gap-x-2 rounded-full bg-amber-100/60 px-3 py-1 text-sm font-normal text-amber-500 dark:bg-gray-800"
											>
												커스텀
											</div>
										</td>
										<td class="whitespace-nowrap px-4 py-4 text-sm">
											<div>
												<h4 class="text-gray-700 dark:text-gray-200">총합 : 15</h4>
												<p class="font-normal text-gray-500 dark:text-gray-400">
													정상 : 10개, 리메이크 : 5개
												</p>
											</div>
										</td>
										<td class="whitespace-nowrap px-4 py-4 text-sm">
											<div>
												<h4 class="text-gray-700 dark:text-gray-200">총합 : 30</h4>
												<p class="font-normal text-gray-500 dark:text-gray-400">
													정상 : 20개, 리메이크 : 10개
												</p>
											</div>
										</td>
										<td class="whitespace-nowrap px-4 py-4 text-sm">
											<p class="max-w-64 font-normal text-gray-500 dark:text-gray-400">
												차헌영_상악, 차헌역_하악, 이병구_상악, 이병구_하악
											</p>
										</td>
										<td class="whitespace-nowrap px-4 py-4 text-sm">
											<button
												class="rounded-lg px-2 py-1 text-gray-500 transition-colors duration-200 hover:bg-gray-100 dark:text-gray-300"
											>
												<i class="ri-more-2-line text-lg"></i>
											</button>
										</td>
									</tr>
									<tr>
										<td class="whitespace-nowrap px-4 py-4 text-sm font-medium">
											<div>
												<h2 class="font-medium text-gray-800 dark:text-white">2025-02-04</h2>
												<p class="text-sm font-normal text-gray-600 dark:text-gray-400">월요일</p>
											</div>
										</td>
										<td class="whitespace-nowrap px-4 py-4 text-sm font-medium">
											<div>
												<h2 class="font-medium text-gray-800 dark:text-white">이정</h2>
											</div>
										</td>
										<td class="whitespace-nowrap px-12 py-4 text-sm font-medium">
											<div
												class="inline gap-x-2 rounded-full bg-pink-100/60 px-3 py-1 text-sm font-normal text-pink-500 dark:bg-gray-800"
											>
												올온포
											</div>
										</td>
										<td class="whitespace-nowrap px-4 py-4 text-sm">
											<div>
												<h4 class="text-gray-700 dark:text-gray-200">총합 : 15</h4>
												<p class="font-normal text-gray-500 dark:text-gray-400">
													정상 : 10개, 리메이크 : 5개
												</p>
											</div>
										</td>
										<td class="whitespace-nowrap px-4 py-4 text-sm">
											<div>
												<h4 class="text-gray-700 dark:text-gray-200">총합 : 30</h4>
												<p class="font-normal text-gray-500 dark:text-gray-400">
													정상 : 20개, 리메이크 : 10개
												</p>
											</div>
										</td>
										<td class="whitespace-nowrap px-4 py-4 text-sm">
											<p class="max-w-64 font-normal text-gray-500 dark:text-gray-400">
												차헌영_상악, 차헌역_하악, 이병구_상악, 이병구_하악
											</p>
										</td>
										<td class="whitespace-nowrap px-4 py-4 text-sm">
											<button
												class="rounded-lg px-2 py-1 text-gray-500 transition-colors duration-200 hover:bg-gray-100 dark:text-gray-300"
											>
												<i class="ri-more-2-line text-lg"></i>
											</button>
										</td>
									</tr>
								</tbody>
							</table>
						</div>
					</div>
				</div>
			</div>

			<div class="mt-6 sm:flex sm:items-center sm:justify-between">
				<div class="text-sm text-gray-500 dark:text-gray-400">
					Page <span class="font-medium text-gray-700 dark:text-gray-100">1 of 10</span>
				</div>

				<div class="mt-4 flex items-center gap-x-4 sm:mt-0">
					<a
						href="#"
						class="flex w-1/2 items-center justify-center gap-x-2 rounded-md border bg-white px-5 py-2 text-sm capitalize text-gray-700 transition-colors duration-200 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800 sm:w-auto"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							stroke-width="1.5"
							stroke="currentColor"
							class="h-5 w-5 rtl:-scale-x-100"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M6.75 15.75L3 12m0 0l3.75-3.75M3 12h18"
							/>
						</svg>

						<span> previous </span>
					</a>

					<a
						href="#"
						class="flex w-1/2 items-center justify-center gap-x-2 rounded-md border bg-white px-5 py-2 text-sm capitalize text-gray-700 transition-colors duration-200 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800 sm:w-auto"
					>
						<span> Next </span>

						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							stroke-width="1.5"
							stroke="currentColor"
							class="h-5 w-5 rtl:-scale-x-100"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3"
							/>
						</svg>
					</a>
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
</style>
