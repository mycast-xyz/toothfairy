<script lang="ts">
	// 캘린더 처리용 DatePicker
	import { DatePicker } from '@svelte-plugins/datepicker';
	import { format } from 'date-fns';
	import { defaultConfig } from '../../../app/model/date/DatepickerConfig';

	// 캘린더 버튼 처리
	const today = new Date();
	const MILLISECONDS_IN_DAY = 24 * 60 * 60 * 1000;
	const getDateFromToday = (days) => {
		return Date.now() - days * MILLISECONDS_IN_DAY;
	};

	let startDate = getDateFromToday(6);
	let endDate = getDateFromToday(0);
	let dateFormat = 'yyyy.MM';
	let isOpen = false;

	let formattedStartDate = '';
	let formattedEndDate = '';

	const onClearDates = () => {
		startDate = '';
		endDate = '';
	};

	const toggleDatePicker = () => (isOpen = !isOpen);
	const formatDate = (dateString) => (dateString && format(new Date(dateString), dateFormat)) || '';

	$: formattedStartDate = formatDate(startDate);
	$: formattedEndDate = formatDate(endDate);
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
			<div class="nav-search-box mt-3 h-auto w-full border-t border-gray-100 pt-2">
				<div class="m-0 inline-block flex w-full flex-row">
					<div class="box-button-group inline-block inline-flex rounded-md shadow-sm" role="group">
						<button
							type="button"
							class="w-24 rounded-s-lg border border-gray-700 bg-transparent px-4 py-0 text-sm font-medium text-gray-900 checked:bg-gray-500 hover:bg-gray-50 hover:text-white focus:z-10 focus:bg-gray-700 focus:text-white focus:ring-2 focus:ring-gray-300"
						>
							전체
						</button>
						<button
							type="button"
							class="w-24 border-b border-r border-t border-gray-700 bg-transparent px-4 py-0 text-sm font-medium text-gray-900 checked:bg-gray-500 hover:bg-gray-50 hover:text-white focus:z-10 focus:bg-gray-700 focus:text-white focus:ring-2 focus:ring-gray-300"
						>
							캡
						</button>
						<button
							type="button"
							class="w-24 border-b border-r border-t border-gray-700 bg-transparent px-4 py-0 text-sm font-medium text-gray-900 checked:bg-gray-500 hover:bg-gray-50 hover:text-white focus:z-10 focus:bg-gray-700 focus:text-white focus:ring-2 focus:ring-gray-300"
						>
							파샬
						</button>

						<button
							type="button"
							class="w-24 border-b border-t border-gray-700 bg-transparent px-4 py-0 text-sm font-medium text-gray-900 checked:bg-gray-500 hover:bg-gray-50 hover:text-white focus:z-10 focus:bg-gray-700 focus:text-white focus:ring-2 focus:ring-gray-300"
						>
							커스텀
						</button>
						<button
							type="button"
							class="w-24 rounded-e-lg border border-gray-700 bg-transparent px-4 py-0 text-sm font-medium text-gray-900 checked:bg-gray-500 hover:bg-gray-50 hover:text-white focus:z-10 focus:bg-gray-700 focus:text-white focus:ring-2 focus:ring-gray-300"
						>
							올온포
						</button>
					</div>
					<!-- svelte-ignore a11y-click-events-have-key-events -->
					<DatePicker
						bind:isOpen
						bind:startDate
						isRange
						showPresets
						monthLabels={defaultConfig.monthLabels}
						presetLabels={defaultConfig.presetLabels}
					>
						<!-- svelte-ignore a11y-no-static-element-interactions -->
						<div
							class="date-field ml-4 mr-4 block flex basis-60 flex-row items-center rounded-lg border border-gray-300 bg-gray-50 p-2.5 pr-4 text-sm text-gray-900"
							on:click={toggleDatePicker}
							class:open={isOpen}
						>
							<i
								class="icon-calendar ri-calendar-line mx-2 border-r border-gray-200 pr-2 text-base text-gray-700"
							></i>
							<div class="date">
								{#if startDate}
									{formattedStartDate} - {formattedEndDate}
								{:else}
									Pick a date
								{/if}
							</div>
							{#if startDate}
								<!-- svelte-ignore a11y-click-events-have-key-events -->
								<!-- svelte-ignore a11y-no-static-element-interactions -->
								<span on:click={onClearDates}>
									<i class="os-icon-x" />
								</span>
							{/if}
						</div>
					</DatePicker>
					<div class="ml-auto inline-block flex w-auto flex-row items-center">
						<button
							type="button"
							class="mb-2 rounded-lg bg-violet-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-800 focus:outline-none focus:ring-4 focus:ring-violet-300 dark:bg-violet-600 dark:hover:bg-violet-700 dark:focus:ring-violet-900"
						>
							검색
						</button>
					</div>
				</div>
			</div>
		</nav>
		<article class="print-list"></article>
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
