<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { CalendarEvent } from '../../../service/calendar/CalendarService';

	export let isOpen = false;
	export let event: Partial<CalendarEvent> = {};
	export let calendars: { id: string; name: string; backgroundColor: string }[] = [];
	export let mode: 'create' | 'update' = 'create';

	const dispatch = createEventDispatcher();

	let title = '';
	let calendarId = '';
	let start = '';
	let end = '';
	let location = '';
	let isAllday = false;

	// isOpen이나 event가 변경될 때 내부 상태 업데이트
	$: if (isOpen && event) {
		title = event.title || '';
		calendarId = event.calendarId || (calendars.length > 0 ? calendars[0].id : '');
		location = event.location || '';
		isAllday = event.isAllday || false;

		updateDatesFromEvent();
	}

	function updateDatesFromEvent() {
		if (event.start) start = formatDate(event.start, isAllday);
		if (event.end) end = formatDate(event.end, isAllday);
	}

	// isAllday 변경 감지하여 포맷 업데이트
	function handleAlldayChange() {
		// 현재 값을 Date 객체로 변환 후 재포맷
		const startDate = new Date(start);
		const endDate = new Date(end);

		if (!isNaN(startDate.getTime())) start = formatDate(startDate, isAllday);
		if (!isNaN(endDate.getTime())) end = formatDate(endDate, isAllday);
	}

	function formatDate(date: any, allday: boolean = false): string {
		if (!date) return '';
		const d = new Date(date);
		const offset = d.getTimezoneOffset() * 60000;
		const localDate = new Date(d.getTime() - offset);

		if (allday) {
			return localDate.toISOString().slice(0, 10);
		}
		return localDate.toISOString().slice(0, 16);
	}

	function close() {
		dispatch('close');
	}

	function save() {
		const newEvent: Partial<CalendarEvent> = {
			...event,
			title,
			calendarId,
			location,
			isAllday,
			start: new Date(start),
			end: new Date(end) // Time will be 00:00:00 for Date-only strings
		};
		dispatch('save', newEvent);
	}

	function remove() {
		if (confirm('정말 삭제하시겠습니까?')) {
			dispatch('delete', event);
		}
	}
</script>

{#if isOpen}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
		<div class="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
			<h2 class="mb-4 text-xl font-bold text-gray-800">
				{mode === 'create' ? '새 일정 만들기' : '일정 수정'}
			</h2>

			<div class="space-y-4">
				<!-- Title -->
				<div>
					<label class="mb-1 block text-sm font-medium text-gray-700">제목</label>
					<input
						type="text"
						bind:value={title}
						class="w-full rounded-lg border border-gray-300 p-2 focus:border-blue-500 focus:outline-none"
						placeholder="일정 제목을 입력하세요"
					/>
				</div>

				<!-- Calendar -->
				<div>
					<label class="mb-1 block text-sm font-medium text-gray-700">캘린더</label>
					<select
						bind:value={calendarId}
						class="w-full rounded-lg border border-gray-300 p-2 focus:border-blue-500 focus:outline-none"
					>
						{#each calendars as cal}
							<option value={cal.id}>{cal.name}</option>
						{/each}
					</select>
				</div>

				<!-- Dates -->
				<div class="grid grid-cols-2 gap-4">
					<div>
						<label class="mb-1 block text-sm font-medium text-gray-700">시작</label>
						<input
							type={isAllday ? 'date' : 'datetime-local'}
							bind:value={start}
							class="w-full rounded-lg border border-gray-300 p-2 focus:border-blue-500 focus:outline-none"
						/>
					</div>
					<div>
						<label class="mb-1 block text-sm font-medium text-gray-700">종료</label>
						<input
							type={isAllday ? 'date' : 'datetime-local'}
							bind:value={end}
							class="w-full rounded-lg border border-gray-300 p-2 focus:border-blue-500 focus:outline-none"
						/>
					</div>
				</div>

				<!-- All Day Checkbox -->
				<div class="flex items-center gap-2">
					<input
						type="checkbox"
						id="allday"
						bind:checked={isAllday}
						on:change={handleAlldayChange}
						class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
					/>

					<label for="allday" class="text-sm text-gray-700">종일</label>
				</div>

				<!-- Location -->
				<div>
					<label class="mb-1 block text-sm font-medium text-gray-700">위치</label>
					<input
						type="text"
						bind:value={location}
						class="w-full rounded-lg border border-gray-300 p-2 focus:border-blue-500 focus:outline-none"
						placeholder="위치 정보"
					/>
				</div>
			</div>

			<div class="mt-6 flex justify-end gap-2">
				{#if mode === 'update'}
					<button
						on:click={remove}
						class="rounded-lg bg-red-100 px-4 py-2 font-medium text-red-600 hover:bg-red-200"
					>
						삭제
					</button>
					<div class="flex-1"></div>
				{/if}

				<button
					on:click={close}
					class="rounded-lg bg-gray-100 px-4 py-2 font-medium text-gray-600 hover:bg-gray-200"
				>
					취소
				</button>
				<button
					on:click={save}
					class="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white shadow-md hover:bg-blue-700"
				>
					저장
				</button>
			</div>
		</div>
	</div>
{/if}
