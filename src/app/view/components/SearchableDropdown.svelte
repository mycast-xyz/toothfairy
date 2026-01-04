<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { getChoseong, josa } from 'es-hangul';

	// Props
	export let options: Array<{ id: string; name: string; [key: string]: any }> = [];
	export let value: string = '';
	export let placeholder: string = '선택하세요';
	export let emptyMessage: string = '검색 결과가 없습니다';
	export let disabled: boolean = false;
	export let loading: boolean = false;
	export let enableChoseongSearch: boolean = true; // 초성 검색 활성화 옵션

	// Internal state
	let open = false;
	let search = '';
	let focusedIndex = -1;
	let buttonElement: HTMLButtonElement;
	let searchElement: HTMLInputElement;
	let listboxElement: HTMLUListElement;

	// 고도화된 검색 함수
	function searchOptions(
		searchTerm: string,
		options: Array<{ id: string; name: string; [key: string]: any }>
	) {
		// 검색어가 없거나 공백만 있으면 모든 옵션 반환
		if (!searchTerm || searchTerm.trim() === '') return options;

		const lowerSearchTerm = searchTerm.toLowerCase().trim();
		console.log('검색어:', lowerSearchTerm);

		const filtered = options.filter((option) => {
			const optionName = option.name.toLowerCase();
			console.log(`옵션 "${option.name}" 검사 중...`);

			// 1. 일반 문자열 포함 검색
			if (optionName.includes(lowerSearchTerm)) {
				console.log(`✓ "${option.name}" - 일반 문자열 포함 검색으로 매치`);
				return true;
			}

			// 2. 초성 검색 (활성화된 경우, 한글만)
			if (enableChoseongSearch && /[가-힣]/.test(searchTerm)) {
				try {
					const optionChoseong = getChoseong(option.name);
					const searchChoseong = getChoseong(searchTerm);

					// 초성으로 검색
					if (optionChoseong.includes(searchChoseong)) {
						console.log(`✓ "${option.name}" - 초성 검색으로 매치`);
						return true;
					}

					// 초성과 일반 문자열 혼합 검색
					if (optionChoseong.includes(searchTerm) || searchChoseong.includes(optionName)) {
						console.log(`✓ "${option.name}" - 초성 혼합 검색으로 매치`);
						return true;
					}
				} catch (error) {
					// es-hangul 처리 중 오류 발생 시 일반 검색으로 fallback
					console.warn('초성 검색 중 오류 발생:', error);
				}
			}

			// 3. 공백 제거 후 검색 (예: "서울 강남" -> "서울강남")
			const normalizedOptionName = optionName.replace(/\s+/g, '');
			const normalizedSearchTerm = lowerSearchTerm.replace(/\s+/g, '');
			if (normalizedOptionName.includes(normalizedSearchTerm)) {
				console.log(`✓ "${option.name}" - 공백 제거 검색으로 매치`);
				return true;
			}

			console.log(`✗ "${option.name}" - 매치되지 않음`);
			return false;
		});

		console.log('최종 필터링 결과:', filtered.length, '개');
		return filtered;
	}

	// Computed values - options에서 중복 제거
	$: uniqueOptions = options.filter(
		(option, index, self) => index === self.findIndex((o) => o.id === option.id)
	);
	$: filteredOptions = searchOptions(search, uniqueOptions);

	// 디버깅용 로그
	$: {
		console.log('SearchableDropdown Debug:', {
			search,
			optionsLength: options.length,
			uniqueOptionsLength: uniqueOptions.length,
			filteredOptionsLength: filteredOptions.length,
			filteredOptions: filteredOptions.map((o) => o.name)
		});
	}

	$: selectedOption = uniqueOptions.find((option) => option.id === value);

	// Event dispatcher
	const dispatch = createEventDispatcher<{
		change: { id: string; name: string; option: any };
	}>();

	// Methods
	function toggleDropdown(event?: Event) {
		if (disabled || loading) return;

		// 이벤트가 있으면 전파 중지 (중복 실행 방지)
		if (event) {
			event.stopPropagation();
		}

		open = !open;
		if (open) {
			focusedIndex = filteredOptions.findIndex((option) => option.id === value);
			if (focusedIndex < 0) focusedIndex = 0;
			setTimeout(() => {
				searchElement?.focus();
				scrollToFocused();
			}, 0);
		} else {
			search = '';
			focusedIndex = -1;
		}
	}

	function closeDropdown() {
		open = false;
		search = '';
		focusedIndex = -1;
	}

	function selectOption(option: any) {
		value = option.id;
		dispatch('change', { id: option.id, name: option.name, option });
		closeDropdown();
	}

	function handleKeydown(event: KeyboardEvent) {
		if (!open) return;

		switch (event.key) {
			case 'Escape':
				closeDropdown();
				buttonElement?.focus();
				break;
			case 'Enter':
				event.preventDefault();
				if (focusedIndex >= 0 && filteredOptions[focusedIndex]) {
					selectOption(filteredOptions[focusedIndex]);
				}
				break;
			case 'ArrowDown':
				event.preventDefault();
				focusNext();
				break;
			case 'ArrowUp':
				event.preventDefault();
				focusPrevious();
				break;
		}
	}

	function focusNext() {
		if (focusedIndex < filteredOptions.length - 1) {
			focusedIndex++;
			scrollToFocused();
		}
	}

	function focusPrevious() {
		if (focusedIndex > 0) {
			focusedIndex--;
			scrollToFocused();
		}
	}

	function scrollToFocused() {
		if (listboxElement && focusedIndex >= 0) {
			const focusedElement = listboxElement.children[focusedIndex] as HTMLElement;
			if (focusedElement) {
				focusedElement.scrollIntoView({ block: 'center' });
			}
		}
	}

	function handleSearchInput() {
		focusedIndex = 0;
	}

	function handleOptionMouseEnter(index: number) {
		focusedIndex = index;
	}

	// 검색어 하이라이트 함수
	function highlightSearchTerm(text: string, searchTerm: string) {
		if (!searchTerm) return text;

		const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
		return text.replace(regex, '<mark class="bg-yellow-200 px-1 rounded">$1</mark>');
	}

	// Click outside to close
	function handleClickOutside(event: MouseEvent) {
		if (buttonElement && !buttonElement.contains(event.target as Node)) {
			closeDropdown();
		}
	}
</script>

<svelte:window on:click={handleClickOutside} />

<div
	class="relative"
	role="combobox"
	aria-controls="dropdown-listbox"
	aria-expanded={open}
	tabindex="0"
	on:keydown={handleKeydown}
>
	<span class="inline-block w-full rounded-md shadow-sm">
		<button
			bind:this={buttonElement}
			type="button"
			on:click={toggleDropdown}
			disabled={disabled || loading}
			class="focus:shadow-outline-blue relative z-0 flex h-12 w-full cursor-default items-center rounded-md border border-gray-300 bg-white pl-3 pr-10 text-left transition duration-150 ease-in-out focus:border-blue-300 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm sm:leading-5"
		>
			{#if loading}
				<span class="block h-full w-full truncate py-0 text-gray-500">로딩 중...</span>
			{:else if !open}
				<span
					class="block flex h-full w-full cursor-pointer items-center truncate py-0 {selectedOption
						? 'text-gray-900'
						: 'text-gray-500'}"
					on:click={(e) => toggleDropdown(e)}
					on:keydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							toggleDropdown(e);
						}
					}}
					tabindex="0"
					role="button"
					aria-label="드롭다운 열기"
				>
					{selectedOption ? selectedOption.name : placeholder}
				</span>
			{:else}
				<input
					bind:this={searchElement}
					bind:value={search}
					on:input={handleSearchInput}
					type="search"
					placeholder="검색... (초성 검색 가능)"
					class="flex h-full w-full items-center border-0 bg-transparent p-0 focus:outline-none focus:ring-0"
				/>
			{/if}

			<span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
				<svg class="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="none" stroke="currentColor">
					<path
						d="M7 7l3-3 3 3m0 6l-3 3-3-3"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					></path>
				</svg>
			</span>
		</button>
	</span>

	{#if open}
		<div class="absolute z-10 mt-1 w-full rounded-md bg-white shadow-lg" role="listbox">
			<ul
				bind:this={listboxElement}
				id="dropdown-listbox"
				role="listbox"
				tabindex="-1"
				class="shadow-xs max-h-60 overflow-auto rounded-md py-1 text-base leading-6 focus:outline-none sm:text-sm sm:leading-5"
			>
				{#each filteredOptions as option, index (option.id)}
					<li
						role="option"
						aria-selected={focusedIndex === index}
						on:click={() => selectOption(option)}
						on:keydown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault();
								selectOption(option);
							}
						}}
						on:mouseenter={() => handleOptionMouseEnter(index)}
						class="relative cursor-default select-none py-2 pl-3 pr-9 {focusedIndex === index
							? 'bg-indigo-600 text-white'
							: 'text-gray-900'}"
					>
						<span class="block truncate {focusedIndex === index ? 'font-semibold' : 'font-normal'}">
							{@html highlightSearchTerm(option.name, search)}
						</span>

						{#if option.id === value}
							<span
								class="absolute inset-y-0 right-0 flex items-center pr-4 {focusedIndex === index
									? 'text-white'
									: 'text-indigo-600'}"
							>
								<svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
									<path
										fill-rule="evenodd"
										d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
										clip-rule="evenodd"
									/>
								</svg>
							</span>
						{/if}
					</li>
				{/each}

				{#if filteredOptions.length === 0}
					<li class="cursor-default select-none px-3 py-2 text-gray-900">
						{emptyMessage}
					</li>
				{/if}
			</ul>
		</div>
	{/if}
</div>
