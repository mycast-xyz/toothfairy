<script>
	// @ts-nocheck
	import { tick } from 'svelte';
	import { clickOutside } from '../actions';

	/**
	 * Represents the start date for a date picker.
	 * @type {any}
	 */
	export let startDate = null;

	/**
	 * Represents the end date for a date picker.
	 * @type {any}
	 */
	export let endDate = null;

	/**
	 * Represents the start time for the date picker (in HH:mm format).
	 * @type {string}
	 */
	export let startDateTime = '00:00';

	/**
	 * Represents the end time for the date picker (in HH:mm format).
	 * @type {string}
	 */
	export let endDateTime = '00:00';

	/**
	 * Represents the current date.
	 * @type {Date}
	 */
	export let today = new Date();

	/**
	 * Represents the default year for the date picker.
	 * @type {number}
	 */
	export let defaultYear = today.getFullYear();

	/**
	 * Represents the default month for the date picker.
	 * @type {number}
	 */
	export let defaultMonth = today.getMonth();

	/**
	 * Represents the start day of the week (0 for Sunday, 1 for Monday, etc.).
	 * @type {number}
	 */
	export let startOfWeek = 0;

	/**
	 * Indicates whether the date picker has multiple panes.
	 * @type {boolean}
	 */
	export let isMultipane = false;

	/**
	 * Indicates whether the date picker is in range mode.
	 * @type {boolean}
	 */
	export let isRange = false;

	/**
	 * Indicates whether the date picker is open.
	 * @type {boolean}
	 */
	export let isOpen = false;

	/**
	 * Specifies the alignment of the date picker (e.g., 'left', 'center', 'right').
	 * @type {string}
	 */
	export let align = 'left';

	/**
	 * Represents the theme of the date picker.
	 * @type {string}
	 */
	export let theme = '';

	/**
	 * An array of disabled dates.
	 * @type {Date[]}
	 */
	export let disabledDates = [];

	/**
	 * An array of enabled dates.
	 * @type {Date[]}
	 */
	export let enabledDates = [];

	/**
	 * Callback function triggered when a date or date range changes.
	 * @type {function}
	 * @default () => {}
	 */
	export let onDateChange = () => {};

	/**
	 * Callback function to handle day click events.
	 * @type {(event: Object) => void}
	 */
	export let onDayClick = () => {};

	/**
	 * Callback function to handle the navigation click event for months and years
	 * @type {(event: Object) => void}
	 */
	export let onNavigationChange = () => {};

	/**
	 * Indicates whether the date picker should always be shown.
	 * @type {boolean}
	 */
	export let alwaysShow = false;

	/**
	 * Indicates whether year controls are displayed in the date picker.
	 * @type {boolean}
	 */
	export let showYearControls = true;

	/**
	 * Indicates whether preset options are displayed in the date picker.
	 * @type {boolean}
	 */
	export let showPresets = false;

	/**
	 * Indicates whether preset date ranges should only be displayed
	 * @type {boolean}
	 * @default false
	 */
	export let showPresetsOnly = false;

	/**
	 * Indicates whether the time picker is shown in the date picker.
	 * @type {boolean}
	 */
	export let showTimePicker = false;

	/**
	 * Indicates whether future dates are enabled.
	 * @type {boolean}
	 */
	export let enableFutureDates = false;

	/**
	 * Indicates whether past dates are enabled.
	 * @type {boolean}
	 */
	export let enablePastDates = true;

	/**
	 * An array of preset date range labels.
	 * @type {string[]}
	 */
	export let presetLabels = ['오늘', '지난 7일', '지난 30일', '지난 60일', '지난 90일', '지난 1년'];

	/**
	 * An array of day-of-week labels.
	 * @type {string[]}
	 */
	export let dowLabels = ['일', '월', '화', '수', '목', '금', '토'];

	/**
	 * An array of month labels.
	 * @type {string[]}
	 */
	export let monthLabels = [
		'1월',
		'2월',
		'3월',
		'4월',
		'5월',
		'6월',
		'7월',
		'8월',
		'9월',
		'10월',
		'11월',
		'12월'
	];

	/**
	 * Determines if the default font "Rubik" should be loaded.
	 * @type {boolean}
	 */
	export let includeFont = true;

	/**
	 * The number of milliseconds in a day.
	 * @type {number}
	 */
	export const MILLISECONDS_IN_DAY = 24 * 60 * 60 * 1000;

	/**
	 * Calculates a date based on the number of days from today.
	 *
	 * @param {number} days - The number of days to subtract from today.
	 * @returns {number} - The timestamp of the calculated date.
	 */
	export const getDateFromToday = (days) => {
		return Date.now() - days * MILLISECONDS_IN_DAY;
	};

	/**
	 * An array of preset date ranges with labels and start/end timestamps.
	 * @type {Object[]}
	 */
	export let presetRanges = [
		{
			label: presetLabels[0],
			start: getDateFromToday(0),
			end: getDateFromToday(0)
		},
		{
			label: presetLabels[1],
			start: getDateFromToday(6),
			end: getDateFromToday(0)
		},
		{
			label: presetLabels[2],
			start: getDateFromToday(29),
			end: getDateFromToday(0)
		},
		{
			label: presetLabels[3],
			start: getDateFromToday(59),
			end: getDateFromToday(0)
		},
		{
			label: presetLabels[4],
			start: getDateFromToday(89),
			end: getDateFromToday(0)
		},
		{
			label: presetLabels[5],
			start: getDateFromToday(364),
			end: getDateFromToday(0)
		}
	];

	/**
	 * Initialization flag to delay some actions
	 * @type {boolean}
	 */
	let initialize = false;

	/**
	 * Stores the possible end date for a date range.
	 * @type {any}
	 */
	let tempEndDate;

	/**
	 * Stores the start date for any revert operation.
	 * @type {any}
	 */
	let prevStartDate;

	/**
	 * Stores the end date for any revert operation.
	 * @type {any}
	 */
	let prevEndDate;

	/**
	 * Generates a calendar representation as a two-dimensional array. (Pulled from github.com/lukeed/calendarize)
	 *
	 * @param {Date} target - The target date for the calendar (defaults to the current date if not provided).
	 * @param {number} offset - The offset for the first day of the week (0 for Sunday, 1 for Monday, etc.).
	 * @returns {Array<Array<number>>} A two-dimensional array representing the calendar.
	 */
	const calendarize = (target, offset) => {
		const out = [];
		const date = new Date(target || new Date());
		const year = date.getFullYear();
		const month = date.getMonth();
		const days = new Date(year, month + 1, 0).getDate();

		let first = new Date(year, month, 1 - (offset | 0)).getDay();
		let i = 0;
		let j = 0;
		let week;

		while (i < days) {
			for (j = 0, week = Array(7); j < 7; ) {
				while (j < first) {
					week[j++] = 0;
				}

				week[j++] = ++i > days ? 0 : i;

				first = 0;
			}

			out.push(week);
		}

		return out;
	};

	/**
	 * Creates a timestamp for a given year, month, and day.
	 *
	 * @param {number} year - The year.
	 * @param {number} month - The month (0-11, where 0 is January and 11 is December).
	 * @param {number} day - The day of the month.
	 * @returns {number} - The timestamp representing the specified date.
	 */
	const createTimestamp = (year, month, day) => new Date(year, month, day).getTime();

	/**
	 * Creates a date in Korean timezone (KST) for consistent date handling.
	 *
	 * @param {number} year - The year.
	 * @param {number} month - The month (0-11, where 0 is January and 11 is December).
	 * @param {number} day - The day of the month.
	 * @returns {Date} - The date object in KST.
	 */
	const createKoreanDate = (year, month, day) => {
		// UTC 기준으로 날짜 생성 후 한국 시간대로 변환
		const utcDate = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
		// 한국 시간대 오프셋 (UTC+9)
		const kstOffset = 9 * 60 * 60 * 1000;
		return new Date(utcDate.getTime() + kstOffset);
	};

	/**
	 * Gets the timestamp for a given date.
	 *
	 * @param {Date} date - The date.
	 * @returns {number} - The timestamp of the date.
	 */
	const getTimestamp = (date) => new Date(date).getTime();

	/**
	 * Normalizes a timestamp by setting the time to midnight (00:00:00.000).
	 *
	 * @param {any} timestamp - The timestamp to normalize.
	 * @returns {number} - The normalized timestamp.
	 */
	const normalizeTimestamp = (timestamp) => {
		const date = new Date(timestamp);
		// 한국 시간대 기준으로 정확히 자정으로 설정
		date.setHours(0, 0, 0, 0);
		return date.getTime();
	};

	/**
	 * Handles the click outside event of the date picker.
	 */
	const onClickOutside = () => {
		if (alwaysShow) {
			return;
		}

		if (prevStartDate && prevEndDate && startDate && !endDate) {
			startDate = prevStartDate;
			endDate = prevEndDate;
			prevStartDate = null;
			prevEndDate = null;
		}

		isOpen = false;
	};

	let startDateYear = Number(defaultYear);
	let startDateMonth = Number(defaultMonth);

	const updateCalendars = () => {
		startDateCalendar = startDateCalendar;
		endDateCalendar = endDateCalendar;
	};

	/**
	 * Handles the navigation click event for months and years
	 * @param {string} direction - The direction of the navigation (previous or next).
	 * @param {string} type - The type of navigation (month or year).
	 */
	const onNavigation = async (direction, type) => {
		await tick();

		const initial = new Date(defaultYear, defaultMonth);
		const initialDayOffMonth = '01';

		let current = new Date(startDateYear, startDateMonth);
		let month = startDateMonth + 1;

		const calendar = isMultipane ? endDateCalendar : startDateCalendar;
		const lastWeekOfMonth = calendar[calendar.length - 1].filter(Boolean);
		const lastDayOfMonth = lastWeekOfMonth[lastWeekOfMonth.length - 1];

		const currentPeriod = {
			start: `${startDateYear}-${month >= 10 ? month : `0${month}`}-${initialDayOffMonth}`,
			end: `${startDateYear}-${month >= 10 ? month : `0${month}`}-${lastDayOfMonth}`
		};

		if (isMultipane) {
			month += 1;

			if (month > 11) {
				month = 1;
			}

			currentPeriod.end = `${endDateYear}-${month >= 10 ? month : `0${month}`}-${lastDayOfMonth}`;
			current = new Date(endDateYear, endDateMonth);
		}

		onNavigationChange({
			direction,
			type,
			currentPeriod,
			current
		});
	};

	/**
	 * Handles the previous month navigation.
	 */
	const previousMonth = async () => {
		if (startDateMonth === 0) {
			startDateMonth = 11;
			startDateYear--;
		} else {
			startDateMonth--;
		}

		await onNavigation('previous', 'month');
	};

	/**
	 * Handles the next month navigation.
	 */
	const nextMonth = async () => {
		if (startDateMonth === 11) {
			startDateMonth = 0;
			startDateYear++;
		} else {
			startDateMonth++;
		}

		await onNavigation('next', 'month');
	};

	/**
	 * Handles the previous year navigation.
	 */
	const previousYear = async () => {
		startDateYear--;

		await onNavigation('previous', 'year');
	};

	/**
	 * Handles the next year navigation.
	 */
	const nextYear = async () => {
		startDateYear++;

		await onNavigation('next', 'year');
	};

	/**
	 * Handles the day click event.
	 * @param {number} day - The day that was clicked.
	 * @param {number} month - The month of the clicked day.
	 * @param {number} year - The year of the clicked day.
	 */
	const handleDayClick = (day, month, year) => {
		// 한국 시간대(KST)로 명시적으로 날짜 생성
		const clickedDate = createKoreanDate(year, month, day);
		const clickedTimestamp = normalizeTimestamp(clickedDate);

		onDayClick({
			day,
			month,
			year,
			date: clickedDate,
			timestamp: clickedTimestamp
		});

		if (isRange) {
			if (!startDate) {
				startDate = clickedDate;
				prevStartDate = clickedDate;
				prevEndDate = endDate;
				endDate = null;
			} else if (!endDate) {
				if (clickedTimestamp < normalizeTimestamp(startDate)) {
					endDate = startDate;
					startDate = clickedDate;
				} else {
					endDate = clickedDate;
				}
			} else {
				startDate = clickedDate;
				endDate = null;
				prevStartDate = clickedDate;
				prevEndDate = null;
			}
		} else {
			startDate = clickedDate;
		}

		onDateChange({
			startDate,
			endDate,
			startDateTime,
			endDateTime
		});

		if (!isRange || (isRange && startDate && endDate)) {
			setTimeout(() => {
				isOpen = false;
			}, 100);
		}
	};

	/**
	 * Handles the preset range click event.
	 * @param {Object} preset - The preset range object.
	 */
	const onPresetClick = (preset) => {
		startDate = new Date(preset.start);
		endDate = new Date(preset.end);

		onDateChange({
			startDate,
			endDate,
			startDateTime,
			endDateTime
		});

		setTimeout(() => {
			isOpen = false;
		}, 100);
	};

	/**
	 * Toggles the date picker open/close state.
	 */
	const toggleDatePicker = () => {
		isOpen = !isOpen;
	};

	// 연도 편집 관련 상태
	let isEditingYear = false;
	let editingYear = startDateYear;

	/**
	 * 연도 편집 모드를 토글합니다.
	 */
	const toggleYearEdit = () => {
		if (isEditingYear) {
			// 편집 완료: 유효한 연도인지 확인
			const newYear = parseInt(editingYear);
			if (newYear >= 1900 && newYear <= 2100) {
				startDateYear = newYear;
				// 캘린더 업데이트
				startDateCalendar = calendarize(new Date(startDateYear, startDateMonth), startOfWeek);
			} else {
				// 유효하지 않은 연도면 원래 값으로 복원
				editingYear = startDateYear;
			}
		} else {
			// 편집 시작
			editingYear = startDateYear;
		}
		isEditingYear = !isEditingYear;
	};

	/**
	 * 연도 입력 필드에서 Enter 키를 눌렀을 때 처리
	 */
	const handleYearKeydown = (event) => {
		if (event.key === 'Enter') {
			toggleYearEdit();
		} else if (event.key === 'Escape') {
			// 취소: 원래 값으로 복원
			editingYear = startDateYear;
			isEditingYear = false;
		}
	};

	/**
	 * Generates the calendar for the start date.
	 * @type {Array<Array<number>>}
	 */
	$: startDateCalendar = calendarize(new Date(startDateYear, startDateMonth), startOfWeek);

	/**
	 * Generates the calendar for the end date (if multipane is enabled).
	 * @type {Array<Array<number>>}
	 */
	$: endDateCalendar = isMultipane
		? calendarize(new Date(endDateYear, endDateMonth), startOfWeek)
		: [];

	/**
	 * Determines if a date is disabled.
	 * @param {Date} date - The date to check.
	 * @returns {boolean} - True if the date is disabled, false otherwise.
	 */
	const isDateDisabled = (date) => {
		const timestamp = normalizeTimestamp(date);

		if (disabledDates.length > 0) {
			return disabledDates.some((disabledDate) => {
				const disabledTimestamp = normalizeTimestamp(disabledDate);
				return timestamp === disabledTimestamp;
			});
		}

		if (enabledDates.length > 0) {
			return !enabledDates.some((enabledDate) => {
				const enabledTimestamp = normalizeTimestamp(enabledDate);
				return timestamp === enabledTimestamp;
			});
		}

		if (!enableFutureDates && timestamp > normalizeTimestamp(today)) {
			return true;
		}

		if (!enablePastDates && timestamp < normalizeTimestamp(today)) {
			return true;
		}

		return false;
	};

	/**
	 * Determines if a date is selected.
	 * @param {Date} date - The date to check.
	 * @returns {boolean} - True if the date is selected, false otherwise.
	 */
	const isDateSelected = (date) => {
		const timestamp = normalizeTimestamp(date);

		if (startDate) {
			const startTimestamp = normalizeTimestamp(startDate);
			if (timestamp === startTimestamp) {
				return true;
			}
		}

		if (endDate) {
			const endTimestamp = normalizeTimestamp(endDate);
			if (timestamp === endTimestamp) {
				return true;
			}
		}

		return false;
	};

	/**
	 * Determines if a date is in the selected range.
	 * @param {Date} date - The date to check.
	 * @returns {boolean} - True if the date is in the range, false otherwise.
	 */
	const isDateInRange = (date) => {
		if (!isRange || !startDate || !endDate) {
			return false;
		}

		const timestamp = normalizeTimestamp(date);
		const startTimestamp = normalizeTimestamp(startDate);
		const endTimestamp = normalizeTimestamp(endDate);

		return timestamp >= startTimestamp && timestamp <= endTimestamp;
	};

	/**
	 * Determines if a date is today.
	 * @param {Date} date - The date to check.
	 * @returns {boolean} - True if the date is today, false otherwise.
	 */
	const isToday = (date) => {
		const todayTimestamp = normalizeTimestamp(today);
		const dateTimestamp = normalizeTimestamp(date);
		return todayTimestamp === dateTimestamp;
	};

	/**
	 * Formats a date for display.
	 * @param {Date} date - The date to format.
	 * @returns {string} - The formatted date string.
	 */
	const formatDate = (date) => {
		if (!date) return '';

		// 한국 시간대 기준으로 날짜 포맷팅
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	};

	/**
	 * Gets the display text for the date picker.
	 * @type {string}
	 */
	$: displayText = (() => {
		if (isRange) {
			if (startDate && endDate) {
				return `${formatDate(startDate)} ~ ${formatDate(endDate)}`;
			} else if (startDate) {
				return `${formatDate(startDate)} ~ 선택 중...`;
			}
		} else {
			if (startDate) {
				return formatDate(startDate);
			}
		}
		return '날짜 선택';
	})();

	// Initialize end date year and month for multipane
	let endDateYear = startDateYear;
	let endDateMonth = startDateMonth + 1;

	if (endDateMonth > 11) {
		endDateMonth = 0;
		endDateYear++;
	}

	// Watch for external value changes
	$: if (startDate && startDate instanceof Date) {
		startDateYear = startDate.getFullYear();
		startDateMonth = startDate.getMonth();
	}

	$: if (endDate && endDate instanceof Date) {
		endDateYear = endDate.getFullYear();
		endDateMonth = endDate.getMonth();
	}
</script>

<svelte:head>
	<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/remixicon@3.5.0/fonts/remixicon.css" />
</svelte:head>

<div class="relative" use:clickOutside={{ onClickOutside }}>
	<!-- Input field -->
	<div class="relative w-full">
		<div class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
			<i class="ri-calendar-line"></i>
		</div>
		<input
			type="text"
			readonly
			value={displayText}
			on:click={toggleDatePicker}
			class="flex h-12 w-full cursor-pointer items-center rounded-md border border-gray-300 pl-10 pr-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-violet-500"
		/>
	</div>

	<!-- Calendar dropdown -->
	{#if isOpen || alwaysShow}
		<div
			class="absolute left-0 top-full z-50 mt-1 min-w-[320px] rounded-xl border border-gray-200 bg-white shadow-xl"
		>
			<div class="p-4">
				<div class="w-full">
					<header class="mb-6 flex items-center justify-between px-2">
						<button
							type="button"
							on:click={previousMonth}
							class="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-gray-100"
						>
							<i class="ri-arrow-left-s-line text-lg text-gray-700" aria-label="Previous month"></i>
						</button>
						<span class="text-base font-medium text-gray-900">
							{monthLabels[startDateMonth]}{' '}
							{#if isEditingYear}
								<input
									type="number"
									bind:value={editingYear}
									on:keydown={handleYearKeydown}
									on:blur={toggleYearEdit}
									class="w-16 border-none bg-transparent p-0 text-center text-base font-medium text-gray-900 focus:outline-none focus:ring-0"
									min="1900"
									max="2100"
									autofocus
								/>
							{:else}
								<button
									type="button"
									on:click={toggleYearEdit}
									class="cursor-pointer transition-colors hover:text-violet-600"
								>
									{startDateYear}
								</button>
							{/if}
						</span>
						<button
							type="button"
							on:click={nextMonth}
							class="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-gray-100"
						>
							<i class="ri-arrow-right-s-line text-lg text-gray-700" aria-label="Next month"></i>
						</button>
					</header>

					<div class="grid grid-cols-7 gap-1">
						{#each dowLabels as day}
							<div class="flex h-8 items-center justify-center text-xs font-medium text-gray-500">
								{day}
							</div>
						{/each}

						{#each startDateCalendar as week}
							{#each week as day}
								{#if day > 0}
									{@const date = createKoreanDate(startDateYear, startDateMonth, day)}
									{@const isDisabled = isDateDisabled(date)}
									{@const isSelected = isDateSelected(date)}
									{@const isInRange = isDateInRange(date)}
									{@const isTodayDate = isToday(date)}

									<button
										type="button"
										class="flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition-colors
											{isSelected
											? 'bg-violet-500 text-white hover:bg-violet-600'
											: isInRange
												? 'bg-violet-50 text-violet-700 hover:bg-violet-100'
												: isTodayDate
													? 'bg-gray-200 text-gray-900 hover:bg-gray-300'
													: 'text-gray-700 hover:bg-gray-100'} 
											{isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}"
										on:click={() => handleDayClick(day, startDateMonth, startDateYear)}
									>
										{day}
									</button>
								{:else}
									<div class="h-10 w-10"></div>
								{/if}
							{/each}
						{/each}
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	/* 필요한 경우에만 추가 스타일 */
</style>
