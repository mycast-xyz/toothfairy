<script lang="ts">
	// 캘린더 처리용 DatePicker
	import type { PageData } from './$types';
	import { writable } from 'svelte/store';

	const { data } = $props<{ data: any }>();

	// 날짜 설정에 대한 처리
	const today = new Date();
	const currentYear = today.getFullYear();
	const currentMonth = today.getMonth() + 1; // 월은 0부터 시작하므로 1을 더해줍니다.

	const years = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3, currentYear - 4];
	let selectedYear = writable(years[0]);
	let selectedMonth = writable(currentMonth);

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

	// 정렬 처리
	let currentSort = writable({
		column: data.info,
		direction: 'asc',
		isAsc: {
			date: true,
			company: true,
			type: true,
			fileCount: true,
			unitCount: true,
			fileName: true
		}
	});

	$effect(() => {
		console.log(currentSort);
	});

	function handleSort(column: string) {
		let sortFunction;

		switch (column) {
			case 'date':
				currentSort.update((sort) => ({
					...sort,
					isAsc: { ...sort.isAsc, date: !sort.isAsc.date }
				}));
				sortFunction = (a: any, b: any) => {
					return $currentSort.isAsc.date
						? new Date(a.folderName.date).getTime() - new Date(b.folderName.date).getTime()
						: new Date(b.folderName.date).getTime() - new Date(a.folderName.date).getTime();
				};
				break;
			case 'company':
				currentSort.update((sort) => ({
					...sort,
					isAsc: { ...sort.isAsc, company: !sort.isAsc.company }
				}));
				sortFunction = (a: any, b: any) => {
					return $currentSort.isAsc.company
						? a.folderName.parts[1].localeCompare(b.folderName.parts[1])
						: b.folderName.parts[1].localeCompare(a.folderName.parts[1]);
				};
				break;
			case 'type':
				currentSort.update((sort) => ({
					...sort,
					isAsc: { ...sort.isAsc, type: !sort.isAsc.type }
				}));
				sortFunction = (a: any, b: any) => {
					return $currentSort.isAsc.type
						? a.folderName.info.localeCompare(b.folderName.info)
						: b.folderName.info.localeCompare(a.folderName.info);
				};
				break;
			case 'fileCount':
				currentSort.update((sort) => ({
					...sort,
					isAsc: { ...sort.isAsc, fileCount: !sort.isAsc.fileCount }
				}));
				sortFunction = (a: any, b: any) => {
					return $currentSort.isAsc.fileCount
						? a.remakeCount.ok + a.remakeCount.re - (b.remakeCount.ok + b.remakeCount.re)
						: b.remakeCount.ok + b.remakeCount.re - (a.remakeCount.ok + a.remakeCount.re);
				};
				break;
			case 'unitCount':
				currentSort.update((sort) => ({
					...sort,
					isAsc: { ...sort.isAsc, unitCount: !sort.isAsc.unitCount }
				}));
				sortFunction = (a: any, b: any) => {
					if (a.folderName.info === 'cap' && b.folderName.info === 'cap') {
						return 0;
					} else if (a.folderName.info === 'cap') {
						return $currentSort.isAsc.unitCount ? -1 : 1;
					} else if (b.folderName.info === 'cap') {
						return $currentSort.isAsc.unitCount ? 1 : -1;
					}
					return $currentSort.isAsc.unitCount
						? a.remakeCount.ok + a.remakeCount.re - (b.remakeCount.ok + b.remakeCount.re)
						: b.remakeCount.ok + b.remakeCount.re - (a.remakeCount.ok + a.remakeCount.re);
				};
				break;
			case 'fileName':
				currentSort.update((sort) => ({
					...sort,
					isAsc: { ...sort.isAsc, fileName: !sort.isAsc.fileName }
				}));
				sortFunction = (a: any, b: any) => {
					if (!a.files || !b.files) return 0;
					return $currentSort.isAsc.fileName
						? a.files[0].localeCompare(b.files[0])
						: b.files[0].localeCompare(a.files[0]);
				};
				break;
			default:
				return;
		}

		if ($currentSort.column === column) {
			// 같은 컬럼을 다시 클릭하면 정렬 방향을 반대로
			currentSort.update((sort) => ({
				...sort,
				direction: sort.direction === 'asc' ? 'desc' : 'asc'
			}));
		} else {
			// 새로운 컬럼 클릭시 오름차순으로 시작
			currentSort.update((sort) => ({ ...sort, column: column, direction: 'asc' }));
		}

		$currentSort.column = [...data.info].sort((a, b) => {
			const result = sortFunction(a, b);
			return $currentSort.direction === 'asc' ? result : -result;
		});
	}

	let dateSelectisOpen = false;

	// 출력물 종류 처리
	function getColorAndName(info: any) {
		let color = '';
		let name = '';

		if (info === 'cap') {
			color = 'bg-gray-100/60 text-gray-500 dark:bg-gray-800';
			name = '캡';
		} else if (info === 'partial') {
			color = 'bg-emerald-100/60 text-emerald-500 dark:bg-gray-800';
			name = '파샬';
		} else if (info === 'custom') {
			color = 'bg-amber-100/60 text-amber-500 dark:bg-gray-800';
			name = '커스텀';
		} else if (info === 'allonfour') {
			color = 'bg-pink-100/60 text-pink-500 dark:bg-gray-800';
			name = '올온포';
		}

		return { color, name };
	}

	// 파일 정보 처리
	function getFileInfo(fileName: any, sender: string) {
		let result = {
			name: fileName,
			sender: sender,
			types: [] as string[]
		};
		// 이레, 남원, 남원이레인 경우 2번과 0이 아닌 숫자 포함
		if (sender === '이레' || sender === '남원' || sender === '남원이레') {
			fileName.forEach((file) => {
				const parts = file.split('_').filter((item: string) => item.length > 0);
				if (parts.length >= 3) {
					result.types.push(parts[2]);
				}
			});
		} else if (sender === '이정' || sender === '이정pa' || sender === '이정 pa') {
			fileName.forEach((file) => {
				const parts = file.split('_').filter((item: string) => item.length > 0);
				if (parts.length >= 3) {
					const combinedPart = (parts[0] + '_' + parts[1]).replace(/[0-9]/g, '');

					const filePart = file;
					if (
						['re', '리메이크', '리메'].some((keyword) => filePart.toLowerCase().includes(keyword))
					) {
						result.types.push(combinedPart + '(re)');
					} else {
						result.types.push(combinedPart);
					}
				}
			});
		}

		return result;
	}
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
											onclick={() => handleSort('date')}
										>
											<span>날짜</span>
											<i
												class="float-right ml-auto"
												class:ri-sort-asc={$currentSort.isAsc.date}
												class:ri-sort-desc={!$currentSort.isAsc.date}
											></i>
										</th>
										<th
											scope="col"
											class="cursor-pointer px-4 py-3.5 text-left text-sm font-normal text-gray-500 dark:text-gray-400 rtl:text-right"
											onclick={() => handleSort('company')}
										>
											<span>회사</span>
											<i
												class="float-right ml-auto"
												class:ri-sort-asc={$currentSort.isAsc.company}
												class:ri-sort-desc={!$currentSort.isAsc.company}
											></i>
										</th>
										<th
											scope="col"
											class="cursor-pointer px-12 py-3.5 text-left text-sm font-normal text-gray-500 dark:text-gray-400 rtl:text-right"
											onclick={() => handleSort('type')}
										>
											출력물 종류
											<i
												class="float-right ml-auto"
												class:ri-sort-asc={$currentSort.isAsc.type}
												class:ri-sort-desc={!$currentSort.isAsc.type}
											></i>
										</th>

										<th
											scope="col"
											class="cursor-pointer px-4 py-3.5 text-left text-sm font-normal text-gray-500 dark:text-gray-400 rtl:text-right"
											onclick={() => handleSort('fileCount')}
										>
											출력 파일 갯수
											<i
												class="float-right ml-auto"
												class:ri-sort-asc={$currentSort.isAsc.fileCount}
												class:ri-sort-desc={!$currentSort.isAsc.fileCount}
											></i>
										</th>

										<th
											scope="col"
											class="cursor-pointer px-4 py-3.5 text-left text-sm font-normal text-gray-500 dark:text-gray-400 rtl:text-right"
											onclick={() => handleSort('unitCount')}
										>
											출력 유닛 갯수
											<i
												class="float-right ml-auto"
												class:ri-sort-asc={$currentSort.isAsc.unitCount}
												class:ri-sort-desc={!$currentSort.isAsc.unitCount}
											></i>
										</th>

										<th
											scope="col"
											class="cursor-pointer px-4 py-3.5 text-left text-sm font-normal text-gray-500 dark:text-gray-400 rtl:text-right"
											onclick={() => handleSort('fileName')}
										>
											파일 명
											<i
												class="float-right ml-auto"
												class:ri-sort-asc={$currentSort.isAsc.fileName}
												class:ri-sort-desc={!$currentSort.isAsc.fileName}
											></i>
										</th>

										<th scope="col" class="relative px-4 py-3.5">
											<span class="sr-only">Edit</span>
										</th>
									</tr>
								</thead>
								<tbody
									class="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900"
								>
									{#each $currentSort.column as item}
										<tr>
											<td class="whitespace-nowrap px-4 py-4 text-sm font-medium">
												<div>
													<h2 class="font-medium text-gray-800 dark:text-white">
														{item.folderName.date}
													</h2>
													<p class="text-sm font-normal text-gray-600 dark:text-gray-400">
														{new Date(item.folderName.date)
															.toLocaleDateString('ko-KR', { weekday: 'long' })
															.slice(0, 1)}요일
													</p>
												</div>
											</td>
											<td class="whitespace-nowrap px-4 py-4 text-sm font-medium">
												<div>
													<h2 class="font-medium text-gray-800 dark:text-white">
														{item.folderName.parts[1]}
													</h2>
												</div>
											</td>
											<td class="whitespace-nowrap px-12 py-4 text-sm font-medium">
												<div
													class={`inline gap-x-2 rounded-full ${getColorAndName(item.folderName.info).color} px-3 py-1 text-sm font-normal`}
												>
													{getColorAndName(item.folderName.info).name}
												</div>
											</td>
											<td class="whitespace-nowrap px-4 py-4 text-sm">
												<div>
													<h4 class="text-gray-700 dark:text-gray-200">
														총합 : {item.remakeCount.ok + item.remakeCount.re}
													</h4>
													<p class="font-normal text-gray-500 dark:text-gray-400">
														정상 : {item.remakeCount.ok}개, 리메이크 : {item.remakeCount.re}개
													</p>
												</div>
											</td>
											<td class="whitespace-nowrap px-4 py-4 text-sm">
												{#if item.folderName.info === 'cap'}
													<div>
														<h4 class="text-gray-700 dark:text-gray-200">총합 : 수정필요</h4>
														<p class="font-normal text-gray-500 dark:text-gray-400">
															정상 : "수정"개, 리메이크 : "수정"개
														</p>
													</div>
												{:else}
													<div>
														<h4 class="text-gray-700 dark:text-gray-200">
															총합 : {item.remakeCount.ok + item.remakeCount.re}
														</h4>
														<p class="font-normal text-gray-500 dark:text-gray-400">
															정상 : {item.remakeCount.ok}개, 리메이크 : {item.remakeCount.re}개
														</p>
													</div>
												{/if}
											</td>
											<td class="whitespace-nowrap px-4 py-4 text-sm">
												{#if item.folderName.info === 'partial'}
													<p
														class="max-w-[400px] whitespace-normal break-words font-normal text-gray-500 dark:text-gray-400"
													>
														{#each getFileInfo(item.files, item.folderName.parts[1]).types as type, i}
															{type}{i <
															getFileInfo(item.files, item.folderName.parts[1]).types.length - 1
																? ', '
																: ''}
														{/each}
													</p>
												{/if}
											</td>
											<td class="whitespace-nowrap px-4 py-4 text-sm">
												<button
													class="rounded-lg px-2 py-1 text-gray-500 transition-colors duration-200 hover:bg-gray-100 dark:text-gray-300"
												>
													<i class="ri-more-2-line text-lg"></i>
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
</style>
