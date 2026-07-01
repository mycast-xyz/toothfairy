<script lang="ts">
	// 캘린더 처리용 DatePicker
	import type { PageData } from './$types';
	import { writable } from 'svelte/store';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import PageHeaderBar from '../../../app/view/components/PageHeaderBar.svelte';
	import MonthDatePicker from '../../../app/view/components/datepicker/MonthDatePicker.svelte';
	import { configService } from '../../../app/service/ConfigService';

	const { data } = $props<{ data: any }>();

	// 쿠키 관련 유틸리티 함수들
	function setCookie(name: string, value: string, days: number = 30) {
		if (!browser) return;
		const expires = new Date();
		expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
		document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
	}

	function getCookie(name: string): string | null {
		if (!browser) return null;
		const nameEQ = name + '=';
		const ca = document.cookie.split(';');
		for (let i = 0; i < ca.length; i++) {
			let c = ca[i];
			while (c.charAt(0) === ' ') c = c.substring(1, c.length);
			if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
		}
		return null;
	}

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

	// selectedType을 반응형 변수로 변경 - 쿠키에서 초기값 로드
	let selectedType = $state('all'); // 기본값은 'all'

	// 브라우저 환경에서 쿠키에서 저장된 탭 선택값 로드
	$effect(() => {
		if (browser) {
			const savedTabType = getCookie('selectedTabType');
			if (savedTabType && ['all', 'cap', 'partial', 'custom', 'allonfour'].includes(savedTabType)) {
				selectedType = savedTabType;
			} else if (
				data.param.type &&
				['all', 'cap', 'partial', 'custom', 'allonfour'].includes(data.param.type)
			) {
				// URL 파라미터가 있으면 우선 사용하고 쿠키에 저장
				selectedType = data.param.type;
				setCookie('selectedTabType', data.param.type, 30);
			}
		}
	});

	// 완료 상태 필터 추가 (전체/완료/미완료) - 쿠키에서 초기값 로드
	let completionFilter = $state('all'); // 'all', 'completed', 'incomplete'

	// 브라우저 환경에서 쿠키에서 저장된 값 로드
	$effect(() => {
		if (browser) {
			const savedFilter = getCookie('completionFilter');
			if (savedFilter && ['all', 'completed', 'incomplete'].includes(savedFilter)) {
				completionFilter = savedFilter;
			}

			// 저장된 회사이름 로드
			const savedCorpName = getCookie('selectedCorpName');
			if (savedCorpName) {
				selectedCorpName.set(savedCorpName);
			}

			// 저장된 날짜 로드
			const savedDate = getCookie('selectedDate');
			if (savedDate) {
				const [year, month] = savedDate.split('-').map(Number);
				if (year && month) {
					selectedYear.set(year);
					selectedMonth.set(month);
				}
			}
		}
	});

	// completionFilter 변경 핸들러 - 쿠키에 저장
	function handleCompletionFilterChange(value: string) {
		completionFilter = value;
		setCookie('completionFilter', value, 30); // 30일간 유지
	}

	// selectedType 변경 핸들러 - 쿠키에 저장
	function handleTabTypeChange(value: string) {
		selectedType = value;
		setCookie('selectedTabType', value, 30); // 30일간 유지
	}

	// 회사이름 변경 핸들러 - 쿠키에 저장
	function handleCorpNameChange(value: string) {
		selectedCorpName.set(value);
		setCookie('selectedCorpName', value, 30); // 30일간 유지
	}

	// 날짜 변경 핸들러 - 쿠키에 저장
	function handleDateChange(year: number, month: number) {
		selectedYear.set(year);
		selectedMonth.set(month);
		const dateString = `${year}-${month.toString().padStart(2, '0')}`;
		setCookie('selectedDate', dateString, 30); // 30일간 유지
	}

	// 클라이언트 사이드에서 관리할 데이터와 로딩 상태
	let apiData = $state<any[]>([]);
	let isLoading = $state(true);

	// 반응형 필터링: selectedType과 완료 상태에 따라 자동으로 필터링
	let filteredData = $derived(
		apiData.filter((item: any) => {
			// 타입 필터링
			const typeMatch = selectedType === 'all' || item.info === selectedType;

			// 완료 상태 필터링
			let completionMatch = true;
			if (completionFilter === 'completed') {
				completionMatch = item.normalUnitNum > 0 || item.remakeUnitNum > 0;
			} else if (completionFilter === 'incomplete') {
				completionMatch = item.normalUnitNum === 0 && item.remakeUnitNum === 0;
			}

			return typeMatch && completionMatch;
		})
	);

	// 데이터가 있는지 확인하는 반응형 변수
	let hasData = $derived(apiData && apiData.length > 0);

	// API 데이터 로드 함수
	async function loadData() {
		try {
			isLoading = true;

			// ConfigService에서 API URL 구성하기
			const backendUrl = data.url;
			const fileCheckEndpoint = configService.getApiEndpoint('file', 'check');
			const apiUrl = `${backendUrl}${fileCheckEndpoint}?date=${data.param.date}&corpName=${data.param.corpName || ''}&type=all`;

			console.log('API 호출 URL:', apiUrl);
			const response = await fetch(apiUrl);

			if (response.ok) {
				const result = await response.json();
				if (result.resultCode === 200 && result.item) {
					apiData = result.item;
				} else {
					apiData = [];
				}
			} else {
				apiData = [];
			}
		} catch (error) {
			console.error('데이터 로드 오류:', error);
			apiData = [];
		} finally {
			isLoading = false;
		}
	}

	// 페이지 로드 시 데이터 로드
	$effect(() => {
		loadData();
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
	// 유니코드 정규화 및 문자열 정리 유틸리티 함수
	function normalizeString(str: string): string {
		if (!str || typeof str !== 'string') return '';

		// 유니코드 정규화 (NFC 형태로 통일)
		let normalized = str.normalize('NFC');

		// 다양한 공백 문자를 일반 공백으로 통일
		normalized = normalized.replace(/[\s\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000\uFEFF]/g, ' ');

		// 연속된 공백을 하나로 통일
		normalized = normalized.replace(/\s+/g, ' ');

		// 앞뒤 공백 제거
		normalized = normalized.trim();

		return normalized;
	}

	// 발송처명 매칭 함수 (유니코드 안전)
	function isSenderMatch(sender: string, targetGroup: string[]): boolean {
		const normalizedSender = normalizeString(sender).toLowerCase();

		return targetGroup.some((target) => {
			const normalizedTarget = normalizeString(target).toLowerCase();
			return normalizedSender === normalizedTarget;
		});
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

		// 발송처별 파일 처리 (유니코드 안전한 매칭)
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
			ijung: ['이정', '이정pa', '이정 pa', '이정 PA', '이정PA'],
			void: ['공백', '공백pa', '공백 pa', '공백 PA', '공백PA'],
			top: ['가산탑pa', '가산탑 PA', '가산탑PA', '가산탑 pa']
		};

		// 이레/남원 그룹 처리
		if (isSenderMatch(sender, senderGroups.ire)) {
			allFiles.forEach((file) => {
				if (!file || typeof file !== 'string') return;

				// 파일명 정규화
				const normalizedFile = normalizeString(file);
				const parts = normalizedFile.split('_').filter((part) => part && part.trim());

				if (parts.length >= 3) {
					const typePart = normalizeString(parts[2]);
					if (typePart) {
						result.types.push(typePart);
					}
				}
			});
		}
		// 이정 그룹 처리
		else if (isSenderMatch(sender, senderGroups.ijung)) {
			allFiles.forEach((file) => {
				if (!file || typeof file !== 'string') return;

				// 파일명 정규화
				const normalizedFile = normalizeString(file);

				// @ 기호로 구분하여 앞부분만 처리
				let processFile = normalizedFile;
				if (normalizedFile.includes('@')) {
					processFile = normalizedFile.split('@')[1]; // @ 앞부분만 추출
				}

				const parts = processFile.split('_').filter((part) => part && part.trim());

				if (parts.length >= 3) {
					// 숫자 제거 후 조합
					const combinedPart = (parts[0] + '_' + parts[1]).replace(/[0-9]/g, '');
					const normalizedCombined = normalizeString(combinedPart);

					// 리메이크 키워드 검사 (유니코드 안전)
					const isRemake = ['re', '리메이크', '리메'].some((keyword) => {
						const normalizedKeyword = normalizeString(keyword).toLowerCase();
						return normalizedFile.toLowerCase().includes(normalizedKeyword);
					});

					if (normalizedCombined) {
						result.types.push(isRemake ? `${normalizedCombined}(re)` : normalizedCombined);
					}
				}
			});
		}

		// 중복 제거 및 정렬
		result.types = [...new Set(result.types)].sort();

		return result;
	}

	function handleRowClick(item: any) {
		console.log(item);
		goto('/center/show/' + item);
	}

	async function handleSearchClick() {
		// URL 파라미터 업데이트
		const newDate = $selectedYear.toString() + '-' + $selectedMonth.toString().padStart(2, '0');
		const newCorpName = $selectedCorpName.toString();

		// 쿠키에 저장
		setCookie('selectedDate', newDate, 30);
		setCookie('selectedCorpName', newCorpName, 30);

		// 파라미터 업데이트
		data.param.date = newDate;
		data.param.corpName = newCorpName;

		// 데이터 다시 로드
		await loadData();

		// URL 업데이트 (선택사항)
		const params = new URLSearchParams();
		params.append('date', newDate);
		params.append('type', 'all');
		params.append('corpName', newCorpName);
		window.history.pushState({}, '', `/center/print?${params.toString()}`);
	}

	// MonthDatePicker 이벤트 핸들러
	function handleYearChange(event: CustomEvent) {
		selectedYear.set(event.detail.year);
		handleDateChange(event.detail.year, $selectedMonth);
	}

	function handleMonthSelect(event: CustomEvent) {
		selectedYear.set(event.detail.year);
		selectedMonth.set(event.detail.month);
		handleDateChange(event.detail.year, event.detail.month);
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
											disabled={!hasData || isLoading}
											class="tab-btn min-w-24 border-b-2 px-4 py-3 pt-2 text-sm font-semibold focus:outline-none
												{selectedType === 'all' ? 'border-violet-500 text-violet-600' : 'border-transparent text-gray-400'}
												{!hasData || isLoading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}"
											onclick={() => hasData && !isLoading && handleTabTypeChange('all')}
										>
											전체
										</button>
										<button
											type="button"
											disabled={!hasData || isLoading}
											class="tab-btn min-w-24 border-b-2 px-4 py-3 pt-2 text-sm font-semibold focus:outline-none
												{selectedType === 'cap' ? 'border-violet-500 text-violet-600' : 'border-transparent text-gray-400'}
												{!hasData || isLoading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}"
											onclick={() => hasData && !isLoading && handleTabTypeChange('cap')}
										>
											캡
										</button>
										<button
											type="button"
											disabled={!hasData || isLoading}
											class="tab-btn min-w-24 border-b-2 px-4 py-3 pt-2 text-sm font-semibold focus:outline-none
												{selectedType === 'partial'
												? 'border-violet-500 text-violet-600'
												: 'border-transparent text-gray-400'}
												{!hasData || isLoading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}"
											onclick={() => hasData && !isLoading && handleTabTypeChange('partial')}
										>
											파샬
										</button>
										<button
											type="button"
											disabled={!hasData || isLoading}
											class="tab-btn min-w-24 border-b-2 px-4 py-3 pt-2 text-sm font-semibold focus:outline-none
												{selectedType === 'custom'
												? 'border-violet-500 text-violet-600'
												: 'border-transparent text-gray-400'}
												{!hasData || isLoading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}"
											onclick={() => hasData && !isLoading && handleTabTypeChange('custom')}
										>
											커스텀
										</button>
										<button
											type="button"
											disabled={!hasData || isLoading}
											class="tab-btn min-w-24 border-b-2 px-4 py-3 pt-2 text-sm font-semibold focus:outline-none
												{selectedType === 'allonfour'
												? 'border-violet-500 text-violet-600'
												: 'border-transparent text-gray-400'}
												{!hasData || isLoading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}"
											onclick={() => hasData && !isLoading && handleTabTypeChange('allonfour')}
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
													oninput={(e) => handleCorpNameChange(e.target.value)}
												/>
											</div>
										</div>

										<!-- 완료 상태 필터 -->
										<div class="flex items-center gap-4">
											<span class="text-sm font-medium text-gray-700 dark:text-gray-300">상태:</span
											>
											<div class="flex items-center">
												<button
													type="button"
													class="rounded-l-md border-b border-l border-t px-4 py-2 text-sm font-medium transition-colors duration-200 {completionFilter ===
													'all'
														? 'bg-violet-600 text-white'
														: 'bg-white text-black hover:bg-gray-100'}"
													onclick={() => handleCompletionFilterChange('all')}
												>
													전체
												</button>
												<button
													type="button"
													class="border px-4 py-2 text-sm font-medium transition-colors duration-200 hover:bg-gray-100 {completionFilter ===
													'completed'
														? 'bg-violet-600 text-white'
														: 'bg-white text-black hover:bg-gray-100'}"
													onclick={() => handleCompletionFilterChange('completed')}
												>
													완료
												</button>
												<button
													type="button"
													class="rounded-r-md border-b border-r border-t px-4 py-2 text-sm font-medium transition-colors duration-200 {completionFilter ===
													'incomplete'
														? 'bg-violet-600 text-white'
														: 'bg-white text-black hover:bg-gray-100'}"
													onclick={() => handleCompletionFilterChange('incomplete')}
												>
													미완료
												</button>
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
											class="px-4 py-3.5 text-left text-sm font-normal text-gray-500 dark:text-gray-400 rtl:text-right"
										>
											<span>확인</span>
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
											출력 파일 갯수
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
									{#if isLoading}
										<tr>
											<td colspan="8" class="py-12 text-center">
												<div class="flex flex-col items-center justify-center">
													<div
														class="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent"
													></div>
													<p class="text-lg font-medium text-gray-600 dark:text-gray-400">
														서버에서 파일들을 불러오고 있습니다
													</p>
													<p class="mt-2 text-sm text-gray-500 dark:text-gray-500">
														잠시만 기다려주세요...
													</p>
												</div>
											</td>
										</tr>
									{:else if !hasData}
										<tr>
											<td colspan="8" class="py-12 text-center">
												<div class="flex flex-col items-center justify-center">
													<i class="ri-file-damage-line mb-4 text-4xl text-gray-400"></i>
													<p class="text-lg font-medium text-gray-600 dark:text-gray-400">
														{data.param.date} 데이터가 존재하지 않습니다.
													</p>
													<p class="mt-2 text-sm text-gray-500 dark:text-gray-500">
														다른 날짜를 선택하거나 검색 조건을 변경해보세요.
													</p>
												</div>
											</td>
										</tr>
									{:else if filteredData.length === 0}
										<tr>
											<td colspan="8" class="py-12 text-center">
												<div class="flex flex-col items-center justify-center">
													<i class="ri-filter-off-line mb-4 text-4xl text-gray-400"></i>
													<p class="text-lg font-medium text-gray-600 dark:text-gray-400">
														조건에 맞는 출력물이 없습니다.
													</p>
													<p class="mt-2 text-sm text-gray-500 dark:text-gray-500">
														탭이나 상태 필터를 변경해보세요.
													</p>
												</div>
											</td>
										</tr>
									{:else}
										{#each filteredData as item}
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
													<div class="flex flex-col gap-1">
														<div class="flex items-center justify-between">
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
																		? 'ri-close-circle-line text-red-500'
																		: 'ri-checkbox-circle-line text-green-500'
																	: 'ri-checkbox-circle-line text-gray-500'}
															></i>
														</div>
														<div class="flex items-center justify-between">
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
																		? 'ri-close-circle-line text-red-500'
																		: 'ri-checkbox-circle-line text-green-500'
																	: 'ri-checkbox-circle-line text-gray-500'}
															></i>
														</div>
													</div>
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
																getFileInfo(item.directory.remakeFiles, item.corpName).types
																	.length -
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
									{/if}
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
