<script lang="ts">
	// 캘린더 처리용 DatePicker
	import type { PageData } from './$types';
	import { writable } from 'svelte/store';
	import { goto } from '$app/navigation';
	import PageHeaderBar from '../../../app/view/components/PageHeaderBar.svelte';
	import MonthDatePicker from '../../../app/view/components/datepicker/MonthDatePicker.svelte';

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

	// svelte-ignore non_reactive_update
	let selectedType = data.param.type ? data.param.type : 'all';

	// 정렬 처리
	let currentSort = writable({
		column: data.info, // 초기 정렬 컬럼
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

	// 출력물 종류 처리
	function getColorAndName(info: string) {
		const typeMap: Record<string, { color: string; name: string }> = {
			cap: {
				color: 'bg-gray-100/60 text-gray-500 dark:bg-gray-800',
				name: '캡'
			},
			partial: {
				color: 'bg-emerald-100/60 text-emerald-500 dark:bg-gray-800',
				name: '파샬'
			},
			custom: {
				color: 'bg-amber-100/60 text-amber-500 dark:bg-gray-800',
				name: '커스텀'
			},
			allonfour: {
				color: 'bg-pink-100/60 text-pink-500 dark:bg-gray-800',
				name: '올온포'
			}
		};

		return typeMap[info] || { color: '', name: '' };
	}
	// 파일 정보 처리
	function getFileInfo(fileName: any, sender: string) {
		// 파일 배열 초기화
		const allFiles: any[] = [];

		// 파일 객체에서 re와 ok 배열 병합
		if (fileName && typeof fileName === 'object') {
			if (Array.isArray(fileName.re)) allFiles.push(...fileName.re);
			if (Array.isArray(fileName.ok)) allFiles.push(...fileName.ok);
		}

		const result = {
			name: allFiles,
			sender: sender,
			types: [] as string[]
		};

		// 발송처별 파일 처리
		const senderGroups = {
			ire: [
				'이레',
				'남원',
				'남원이레',
				'남원이레pa',
				'남원이레PA',
				'남원 이레',
				'남원 이레 pa',
				'남원 이레 PA',
				'이레pa',
				'이레PA',
				'이레 pa',
				'이레 PA'
			],
			ijung: ['이정', '이정pa', '이정 pa', '이정 PA', '이정PA']
		};

		// 이레/남원 그룹 처리
		if (senderGroups.ire.includes(sender)) {
			allFiles.forEach((file) => {
				const parts = file.split('_').filter(Boolean);
				if (parts.length >= 3) result.types.push(parts[2]);
			});
		}
		// 이정 그룹 처리
		else if (senderGroups.ijung.includes(sender)) {
			allFiles.forEach((file) => {
				const parts = file.split('_').filter(Boolean);
				if (parts.length >= 3) {
					const combinedPart = (parts[0] + '_' + parts[1]).replace(/[0-9]/g, '');
					const isRemake = ['re', '리메이크', '리메'].some((keyword) =>
						file.toLowerCase().includes(keyword)
					);
					result.types.push(isRemake ? `${combinedPart}(re)` : combinedPart);
				}
			});
		}

		return result;
	}

	function handleRowClick(item: any) {
		console.log(item);
		goto('/center/show/' + item);
	}

	function handleSearchClick() {
		const params = new URLSearchParams();
		params.append(
			'date',
			$selectedYear.toString() + '-' + $selectedMonth.toString().padStart(2, '0')
		);
		params.append('type', selectedType);
		params.append('corpName', $selectedCorpName.toString());

		window.location.href = `/center/print?${params.toString()}`;
	}

	// MonthDatePicker 이벤트 핸들러
	function handleYearChange(event: CustomEvent) {
		selectedYear.set(event.detail.year);
	}

	function handleMonthSelect(event: CustomEvent) {
		selectedYear.set(event.detail.year);
		selectedMonth.set(event.detail.month);
	}
</script>

<main class="ml-64 mt-8 min-h-screen flex-1 bg-gray-100 p-8">
	<article class="w-full">
		<PageHeaderBar title="센터 출력물 리스트" description="기공 센터 출력물 관리 페이지 입니다."
		></PageHeaderBar>

		<article class="print-list">
			<div class="flex flex-col">
				<div class="-mx-4 -my-2 sm:-mx-6 lg:-mx-8">
					<div class="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
						<div class="border border-gray-200 shadow-lg dark:border-gray-700 md:rounded-lg">
							<!-- 상단 탭 및 필터 바 UI (이미지 참고) -->
							<div class="user-tab-bar w-full rounded-t-lg border-b border-gray-200 bg-white">
								<div class="flex flex-wrap items-center justify-between">
									<!-- 탭 메뉴 -->
									<div class="flex w-full px-2 pt-2">
										<button
											type="button"
											class="tab-btn min-w-24 border-b-2 px-4 py-3 pt-2 text-sm font-semibold focus:outline-none
												{selectedType === 'all' ? 'border-violet-500 text-violet-600' : 'border-transparent text-gray-400'}"
											onclick={() => (selectedType = 'all')}
										>
											전체
										</button>
										<button
											type="button"
											class="tab-btn min-w-24 border-b-2 px-4 py-3 pt-2 text-sm font-semibold focus:outline-none
												{selectedType === 'cap' ? 'border-violet-500 text-violet-600' : 'border-transparent text-gray-400'}"
											onclick={() => (selectedType = 'cap')}
										>
											캡
										</button>
										<button
											type="button"
											class="tab-btn min-w-24 border-b-2 px-4 py-3 pt-2 text-sm font-semibold focus:outline-none
												{selectedType === 'partial'
												? 'border-violet-500 text-violet-600'
												: 'border-transparent text-gray-400'}"
											onclick={() => (selectedType = 'partial')}
										>
											파샬
										</button>
										<button
											type="button"
											class="tab-btn min-w-24 border-b-2 px-4 py-3 pt-2 text-sm font-semibold focus:outline-none
												{selectedType === 'custom'
												? 'border-violet-500 text-violet-600'
												: 'border-transparent text-gray-400'}"
											onclick={() => (selectedType = 'custom')}
										>
											커스텀
										</button>
										<button
											type="button"
											class="tab-btn min-w-24 border-b-2 px-4 py-3 pt-2 text-sm font-semibold focus:outline-none
												{selectedType === 'allonfour'
												? 'border-violet-500 text-violet-600'
												: 'border-transparent text-gray-400'}"
											onclick={() => (selectedType = 'allonfour')}
										>
											올온포
										</button>
									</div>
									<!-- 오른쪽 필터/검색 -->
									<div
										class="flex w-full items-center gap-2 border-t border-gray-200 bg-gray-100 px-2 py-4"
									>
										<!-- 검색 입력 -->
										<div class="relative">
											<div class="relative">
												<i
													class="ri-search-line absolute left-2 top-1/2 -translate-y-1/2 text-gray-400"
												></i>
												<input
													type="text"
													class="h-12 w-80 rounded border border-gray-300 py-4 pl-8 pr-2 text-sm text-gray-600 placeholder-gray-400 focus:border-violet-500 focus:outline-none"
													placeholder="회사 이름을 적어주세요."
													bind:value={$selectedCorpName}
												/>
											</div>
										</div>
										<div class="relative inline-flex space-x-2">
											<!-- MonthDatePicker 컴포넌트 사용 -->
											<div class="inline-block">
												<MonthDatePicker
													bind:selectedYear={$selectedYear}
													bind:selectedMonth={$selectedMonth}
													on:yearChange={handleYearChange}
													on:select={handleMonthSelect}
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
								</div>
							</div>
							<table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
								<thead class="bg-gray-50 dark:bg-gray-800">
									<tr>
										<th
											scope="col"
											class="cursor-pointer px-4 py-3.5 text-left text-sm font-normal text-gray-500 dark:text-gray-400 rtl:text-right"
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
											class="cursor-pointer px-4 py-3.5 text-left text-sm font-normal text-gray-500 dark:text-gray-400 rtl:text-right"
										>
											<span>확인</span>
											<i class="float-right ml-auto"></i>
										</th>
										<th
											scope="col"
											class="cursor-pointer px-12 py-3.5 text-left text-sm font-normal text-gray-500 dark:text-gray-400 rtl:text-right"
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
									{#each data.info as item}
										<tr onclick={() => handleRowClick(item.id)}>
											<td class="whitespace-nowrap px-4 py-4 text-sm font-medium">
												<div>
													<h2 class="font-medium text-gray-800 dark:text-white">
														{item.printDate}
													</h2>
													<p class="text-sm font-normal text-gray-600 dark:text-gray-400">
														{new Date(item.printDate)
															.toLocaleDateString('ko-KR', { weekday: 'long' })
															.slice(0, 1)}요일
													</p>
												</div>
											</td>
											<td class="whitespace-nowrap px-4 py-4 text-sm font-medium">
												<div>
													<h2 class="font-medium text-gray-800 dark:text-white">
														{item.corpName}
													</h2>
												</div>
											</td>
											<td
												scope="col"
												class="cursor-pointer px-4 py-3.5 text-left text-sm font-normal text-gray-500 dark:text-gray-400 rtl:text-right"
											>
												<span
													class={item.normalFileNum > 0
														? item.normalUnitNum === 0
															? 'text-red-500'
															: 'text-green-500'
														: 'text-gray-500'}>정상</span
												>
												<i
													class={item.normalFileNum > 0
														? item.normalUnitNum === 0
															? 'ri-checkbox-circle-line ml-auto mr-2 text-red-500'
															: 'ri-checkbox-circle-line ml-auto mr-2 text-green-500'
														: 'ri-checkbox-circle-line ml-auto mr-2 text-gray-500'}
												></i>
												<span
													class={item.remakeFileNum > 0
														? item.remakeUnitNum === 0
															? 'text-red-500'
															: 'text-green-500'
														: 'text-gray-500'}>리메이크</span
												>
												<i
													class={item.remakeFileNum > 0
														? item.remakeUnitNum === 0
															? 'ri-checkbox-circle-line ml-auto mr-2 text-red-500'
															: 'ri-checkbox-circle-line ml-auto mr-2 text-green-500'
														: 'ri-checkbox-circle-line ml-auto mr-2 text-gray-500'}
												></i>
											</td>
											<td class="whitespace-nowrap px-12 py-4 text-sm font-medium">
												<div
													class={`inline gap-x-2 rounded-full ${getColorAndName(item.info).color} px-3 py-1 text-sm font-normal`}
												>
													{getColorAndName(item.info).name}
												</div>
											</td>
											<td class="whitespace-nowrap px-4 py-4 text-sm">
												<div>
													<h4 class="text-gray-700 dark:text-gray-200">
														총합 : {item.normalFileNum + item.remakeFileNum}
													</h4>
													<p class="font-normal text-gray-500 dark:text-gray-400">
														정상 : {item.normalFileNum}개, 리메이크 : {item.remakeFileNum}개
													</p>
												</div>
											</td>
											<td class="whitespace-nowrap px-4 py-4 text-sm">
												{#if item.info === 'cap'}
													<div>
														<h4 class="text-gray-700 dark:text-gray-200">
															총합 : {item.normalUnitNum + item.remakeUnitNum}
														</h4>
														<p class="font-normal text-gray-500 dark:text-gray-400">
															정상 : {item.normalUnitNum}개, 리메이크 : {item.remakeUnitNum}개
														</p>
													</div>
												{:else}
													<div>
														<h4 class="text-gray-700 dark:text-gray-200">
															총합 : {item.normalFileNum + item.remakeFileNum}
														</h4>
														<p class="font-normal text-gray-500 dark:text-gray-400">
															정상 : {item.normalFileNum}개, 리메이크 : {item.remakeFileNum}개
														</p>
													</div>
												{/if}
											</td>
											<td class="pointer-events-none whitespace-nowrap px-4 py-4 text-sm">
												{#if item.info === 'partial'}
													<p
														class=" max-w-[400px] whitespace-normal break-words font-normal text-gray-500 dark:text-gray-400"
													>
														{#each getFileInfo(item.directory.remakeFiles, item.corpName).types as type, i}
															{type}{i <
															getFileInfo(item.directory.remakeFiles, item.corpName).types.length -
																1
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
	.nav-search-box {
		button.active {
			background-color: rgb(91 33 182 / var(--tw-bg-opacity, 1));
			border-color: rgb(91 33 182 / var(--tw-bg-opacity, 1));
			color: white;
		}
	}
</style>
