<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import PageHeaderBar from '../../app/view/components/PageHeaderBar.svelte';
	import { getViewportSize } from '@toss/utils';
	import '@toast-ui/calendar/dist/toastui-calendar.min.css';
	// import 'tui-date-picker/dist/tui-date-picker.css'; // 커스텀 모달 사용으로 주석 처리
	// import 'tui-time-picker/dist/tui-time-picker.css'; // 커스텀 모달 사용으로 주석 처리
	import { calendarService, type CalendarEvent } from '../../app/service/calendar/CalendarService'; // Adjust path if needed
	import EventModal from '../../app/view/calendar/EventModal.svelte';

	let calendarInstance: any = null;
	let container: HTMLDivElement;

	// State
	let currentView: 'month' | 'week' | 'day' = 'month';
	let currentDateRangeString = '';

	// Team/Calendar Configurations
	const calendars = [
		{
			id: 'team_1',
			name: '중요',
			color: '#ffffff',
			backgroundColor: '#9e5fff',
			dragBackgroundColor: '#9e5fff',
			borderColor: '#9e5fff'
		},
		{
			id: 'team_2',
			name: '미팅',
			color: '#ffffff',
			backgroundColor: '#00a9ff',
			dragBackgroundColor: '#00a9ff',
			borderColor: '#00a9ff'
		},
		{
			id: 'team_3',
			name: '회의',
			color: '#ffffff',
			backgroundColor: '#03bd9e',
			dragBackgroundColor: '#03bd9e',
			borderColor: '#03bd9e'
		}
	];

	// Filter State
	let activeCalendarIds = calendars.map((c) => c.id);

	// Mock Data Store
	let mockEvents: CalendarEvent[] = [];

	// Modal State
	let isModalOpen = false;
	let modalMode: 'create' | 'update' = 'create';
	let currentEventData: Partial<CalendarEvent> = {};

	onMount(async () => {
		if (browser) {
			const Calendar = (await import('@toast-ui/calendar')).default;
			initCalendar(Calendar);
			await loadEvents();
			updateDateRange();

			// Resize observer to handle window resizing
			window.addEventListener('resize', handleResize);
		}
	});

	onDestroy(() => {
		if (calendarInstance) {
			calendarInstance.destroy();
		}
		if (browser) {
			window.removeEventListener('resize', handleResize);
		}
	});

	function handleResize() {
		calendarInstance?.render();
	}

	function initCalendar(Calendar: any) {
		if (!container) return;

		calendarInstance = new Calendar(container, {
			defaultView: currentView,
			usageStatistics: false,
			useFormPopup: false,
			useDetailPopup: false,
			calendars: calendars,
			month: {
				dayNames: ['일', '월', '화', '수', '목', '금', '토']
			},
			week: {
				dayNames: ['일', '월', '화', '수', '목', '금', '토'],
				taskView: false
			},
			template: {
				time(event: any) {
					return `<span style="color: white;">${event.title}</span>`;
				}
			}
		});

		// Event Handlers

		// 1. 드래그하여 날짜 선택 시 (새 일정 생성)
		calendarInstance.on('selectDateTime', (eventObj: any) => {
			console.log('selectDateTime:', eventObj);
			modalMode = 'create';
			currentEventData = {
				start: new Date(eventObj.start),
				end: new Date(eventObj.end),
				isAllday: eventObj.isAllday,
				calendarId: calendars[0].id // 기본값
			};
			isModalOpen = true;
			calendarInstance?.clearGridSelections(); // 선택 하이라이트 제거
		});

		// 2. 일정 클릭 시 (편집)
		calendarInstance.on('clickEvent', ({ event }: { event: any }) => {
			console.log('clickEvent:', event);
			modalMode = 'update';
			// TUI EventObject를 CalendarEvent로 변환
			currentEventData = {
				id: event.id,
				calendarId: event.calendarId,
				title: event.title,
				body: event.body,
				start: new Date(event.start),
				end: new Date(event.end),
				isAllday: event.isAllday,
				location: event.location,
				state: event.state
			};
			isModalOpen = true;
		});
	}

	async function handleSaveEvent(e: CustomEvent) {
		const savedEvent = e.detail;
		console.log('handleSaveEvent:', savedEvent);

		if (modalMode === 'create') {
			const newEvent: CalendarEvent = {
				id: String(Date.now()),
				calendarId: savedEvent.calendarId,
				title: savedEvent.title,
				body: savedEvent.body,
				start: savedEvent.start,
				end: savedEvent.end,
				isAllday: savedEvent.isAllday,
				location: savedEvent.location,
				state: 'Busy',
				category: savedEvent.isAllday ? 'allday' : 'time',
				color: '#ffffff',
				backgroundColor: calendars.find((c) => c.id === savedEvent.calendarId)?.backgroundColor,
				dragBackgroundColor: calendars.find((c) => c.id === savedEvent.calendarId)
					?.dragBackgroundColor,
				borderColor: calendars.find((c) => c.id === savedEvent.calendarId)?.borderColor
			};

			// Mock Create
			mockEvents.push(newEvent);
			// UI Update
			await loadEvents();
		} else {
			// Update
			const targetIndex = mockEvents.findIndex((ev) => String(ev.id) === String(savedEvent.id));
			if (targetIndex !== -1) {
				const updated = {
					...mockEvents[targetIndex],
					...savedEvent,
					// Update colors if calendar changed
					backgroundColor: calendars.find((c) => c.id === savedEvent.calendarId)?.backgroundColor,
					dragBackgroundColor: calendars.find((c) => c.id === savedEvent.calendarId)
						?.dragBackgroundColor,
					borderColor: calendars.find((c) => c.id === savedEvent.calendarId)?.borderColor
				};
				mockEvents[targetIndex] = updated;
				await loadEvents();
			}
		}
		isModalOpen = false;
	}

	async function handleDeleteEvent(e: CustomEvent) {
		const eventToDelete = e.detail;
		mockEvents = mockEvents.filter((ev) => String(ev.id) !== String(eventToDelete.id));
		await loadEvents();
		isModalOpen = false;
	}

	async function loadEvents() {
		if (!calendarInstance) return;
		calendarInstance.clear();

		// Mock Load
		const events = mockEvents;

		/* Server Call Commented Out
		const events = await calendarService.getEvents();
		*/

		// Filter by active calendars
		const filteredEvents = events.filter((e) => activeCalendarIds.includes(e.calendarId));

		// Convert CalendarEvent to TUI EventObject
		// In mock mode, we try to keep them compatible, but TUI expects specific structure
		const tuiEvents = filteredEvents.map((e) => ({
			id: String(e.id),
			calendarId: e.calendarId,
			title: e.title,
			body: e.body,
			start: e.start,
			end: e.end,
			isAllday: e.isAllday,
			category: e.isAllday ? 'allday' : 'time',
			location: e.location,
			state: e.state,
			color: e.color || '#ffffff',
			backgroundColor:
				e.backgroundColor || calendars.find((c) => c.id === e.calendarId)?.backgroundColor,
			dragBackgroundColor: e.dragBackgroundColor,
			borderColor: e.borderColor
		}));

		calendarInstance.createEvents(tuiEvents);
	}

	function updateDateRange() {
		if (!calendarInstance) return;
		const viewDate = calendarInstance.getDate();
		const start = calendarInstance.getDateRangeStart();
		const end = calendarInstance.getDateRangeEnd();

		if (currentView === 'month') {
			currentDateRangeString = `${viewDate.getFullYear()}년 ${viewDate.getMonth() + 1}월`;
		} else {
			currentDateRangeString = `${start.getFullYear()}.${start.getMonth() + 1}.${start.getDate()} ~ ${end.getFullYear()}.${end.getMonth() + 1}.${end.getDate()}`;
		}
	}

	// Navigation
	function moveNext() {
		calendarInstance?.next();
		updateDateRange();
	}

	function movePrev() {
		calendarInstance?.prev();
		updateDateRange();
	}

	function moveToday() {
		calendarInstance?.today();
		updateDateRange();
	}

	function changeView(view: 'month' | 'week' | 'day') {
		currentView = view;
		calendarInstance?.changeView(view);
		updateDateRange();
	}

	function toggleCalendar(id: string) {
		if (activeCalendarIds.includes(id)) {
			activeCalendarIds = activeCalendarIds.filter((cid) => cid !== id);
			calendarInstance?.setCalendarVisibility(id, false);
		} else {
			activeCalendarIds = [...activeCalendarIds, id];
			calendarInstance?.setCalendarVisibility(id, true);
		}
	}
</script>

<main class="ml-64 mt-8 min-h-screen flex-1 bg-gray-100 p-8 pb-0">
	<article class="w-full">
		<PageHeaderBar title="기공소 캘린더" description="기공 센터 출력물 관리 페이지 입니다.">
			<div class="w-2xl flex items-center justify-between rounded-xl bg-white p-4 shadow-sm">
				<div class="flex items-center gap-4 pr-24">
					<h2 class="text-2xl font-bold text-gray-800">{currentDateRangeString}</h2>
					<div class="flex items-center gap-1 rounded-lg border bg-gray-100 p-1">
						<button class="rounded-md px-3 py-1 hover:bg-white hover:shadow-sm" on:click={movePrev}>
							<i class="ri-arrow-left-s-line"></i>
						</button>
						<button
							class="rounded-md px-3 py-1 text-sm font-medium hover:bg-white hover:shadow-sm"
							on:click={moveToday}
						>
							오늘
						</button>
						<button class="rounded-md px-3 py-1 hover:bg-white hover:shadow-sm" on:click={moveNext}>
							<i class="ri-arrow-right-s-line"></i>
						</button>
					</div>
				</div>

				<div class="flex gap-2">
					<button
						class="rounded-lg px-4 py-2 text-sm font-medium transition-colors {currentView ===
						'month'
							? 'bg-violet-600 text-white shadow-md'
							: 'border bg-white text-gray-600 hover:bg-gray-50'}"
						on:click={() => changeView('month')}
					>
						월간
					</button>
					<button
						class="rounded-lg px-4 py-2 text-sm font-medium transition-colors {currentView ===
						'week'
							? 'bg-violet-600 text-white shadow-md'
							: 'border bg-white text-gray-600 hover:bg-gray-50'}"
						on:click={() => changeView('week')}
					>
						주간
					</button>
					<button
						class="rounded-lg px-4 py-2 text-sm font-medium transition-colors {currentView === 'day'
							? 'bg-violet-600 text-white shadow-md'
							: 'border bg-white text-gray-600 hover:bg-gray-50'}"
						on:click={() => changeView('day')}
					>
						일간
					</button>
				</div>
			</div></PageHeaderBar
		>
	</article>
	<div class="flex h-full flex-col" style="height: {getViewportSize().height - 212}px">
		<div class="flex flex-1 gap-6 overflow-hidden">
			<!-- Sidebar (Team Filters) -->
			<aside class="flex w-64 flex-shrink-0 flex-col gap-4">
				<div class="h-full rounded-xl bg-white p-5 shadow-sm">
					<h3 class="mb-4 text-lg font-bold text-gray-800">내 캘린더</h3>
					<div class="space-y-3">
						{#each calendars as calendar}
							<label
								class="flex cursor-pointer items-center gap-3 rounded-lg p-2 transition-colors hover:bg-gray-50"
							>
								<input
									type="checkbox"
									checked={activeCalendarIds.includes(calendar.id)}
									on:change={() => toggleCalendar(calendar.id)}
									class="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
									style="accent-color: {calendar.backgroundColor}"
								/>
								<span
									class="h-3 w-3 rounded-full"
									style="background-color: {calendar.backgroundColor}"
								></span>
								<span class="font-medium text-gray-700">{calendar.name}</span>
							</label>
						{/each}
					</div>

					<div class="mt-8">
						<div class="rounded-lg bg-blue-50 p-4">
							<p class="text-sm font-medium text-blue-800">💡 팁</p>
							<p class="mt-1 text-xs text-blue-600">
								캘린더의 빈 공간을 드래그하거나 클릭하여 새 일정을 추가할 수 있습니다.
							</p>
						</div>
					</div>
				</div>
			</aside>

			<!-- Calendar View -->
			<main class="flex flex-1 flex-col overflow-hidden rounded-xl bg-white p-4 shadow-sm">
				<div bind:this={container} class="h-full w-full flex-1"></div>
			</main>
		</div>
	</div>
</main>

<EventModal
	bind:isOpen={isModalOpen}
	event={currentEventData}
	{calendars}
	mode={modalMode}
	on:close={() => (isModalOpen = false)}
	on:save={handleSaveEvent}
	on:delete={handleDeleteEvent}
/>

<style>
	:global(.toastui-calendar-layout) {
		font-family: inherit !important;
	}
	:global(.toastui-calendar-popup-container) {
		z-index: 50 !important;
	}
</style>
