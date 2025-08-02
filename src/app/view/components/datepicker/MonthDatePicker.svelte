<script>
	// @ts-nocheck
	import { createEventDispatcher } from 'svelte';
	import { clickOutside } from '../actions';

	export let selectedYear = new Date().getFullYear();
	export let selectedMonth = null; // 1~12 (null이면 미선택)
	export let minYear = 1970;
	export let maxYear = 2100;

	const dispatch = createEventDispatcher();

	const months = [
		{ label: '1월', value: 1 },
		{ label: '2월', value: 2 },
		{ label: '3월', value: 3 },
		{ label: '4월', value: 4 },
		{ label: '5월', value: 5 },
		{ label: '6월', value: 6 },
		{ label: '7월', value: 7 },
		{ label: '8월', value: 8 },
		{ label: '9월', value: 9 },
		{ label: '10월', value: 10 },
		{ label: '11월', value: 11 },
		{ label: '12월', value: 12 }
	];

	// 드롭다운 상태
	let isOpen = false;

	function prevYear() {
		if (selectedYear > minYear) {
			selectedYear -= 1;
			dispatch('yearChange', { year: selectedYear });
		}
	}

	function nextYear() {
		if (selectedYear < maxYear) {
			selectedYear += 1;
			dispatch('yearChange', { year: selectedYear });
		}
	}

	function selectMonth(monthIdx) {
		selectedMonth = monthIdx;
		dispatch('select', { year: selectedYear, month: selectedMonth });
		// 월 선택 후 드롭다운 닫기
		setTimeout(() => {
			isOpen = false;
		}, 100);
	}

	// 드롭다운 토글
	function toggleDropdown() {
		isOpen = !isOpen;
	}

	// 외부 클릭 시 드롭다운 닫기
	function onClickOutside() {
		isOpen = false;
	}

	// 표시 텍스트 생성
	$: displayText = selectedMonth
		? `${selectedYear}년 ${selectedMonth}월`
		: `${selectedYear}년 선택`;
</script>

<svelte:head>
	<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/remixicon@3.5.0/fonts/remixicon.css" />
</svelte:head>

<div class="relative" use:clickOutside={{ onClickOutside }}>
	<!-- 버튼 형태의 입력 필드 -->
	<div class="relative w-full">
		<div class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
			<i class="ri-calendar-line"></i>
		</div>
		<input
			type="text"
			readonly
			value={displayText}
			on:click={toggleDropdown}
			class="w-full cursor-pointer rounded-md border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-violet-500"
		/>
		<div class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
			<i class="ri-arrow-down-s-line"></i>
		</div>
	</div>

	<!-- 드롭다운 캘린더 (크기 키움) -->
	{#if isOpen}
		<div
			class="absolute left-0 top-full z-50 mt-1 min-w-[280px] rounded-xl border border-gray-200 bg-white shadow-2xl"
		>
			<div class="w-72 select-none rounded-[12px] bg-white px-2 pb-6 pt-4 text-base text-gray-600">
				<div class="mb-6 flex items-center justify-center gap-6 text-lg font-semibold">
					<button
						class="cursor-pointer border-none bg-none px-3 text-xl text-gray-500 transition-colors duration-150 disabled:cursor-not-allowed disabled:text-gray-300"
						on:click={prevYear}
						disabled={selectedYear <= minYear}
						aria-label="이전 연도"
						type="button"
					>
						<i class="ri-arrow-left-line"></i>
					</button>
					<span>{selectedYear}</span>
					<button
						class="cursor-pointer border-none bg-none px-3 text-xl text-gray-500 transition-colors duration-150 disabled:cursor-not-allowed disabled:text-gray-300"
						on:click={nextYear}
						disabled={selectedYear >= maxYear}
						aria-label="다음 연도"
						type="button"
					>
						<i class="ri-arrow-right-line"></i>
					</button>
				</div>
				<div class="grid grid-cols-4 justify-items-center gap-y-4">
					{#each months as m}
						<button
							class={`min-h-[36px] min-w-[44px] cursor-pointer rounded-[6px] border-none bg-none px-0 py-1 text-base font-medium text-gray-600 transition-colors duration-150
								${selectedMonth === m.value ? 'bg-violet-500 font-bold text-white' : 'hover:bg-gray-100'}
							`}
							on:click={() => selectMonth(m.value)}
							aria-label={m.label}
							type="button"
						>
							{m.label}
						</button>
					{/each}
				</div>
			</div>
		</div>
	{/if}
</div>
