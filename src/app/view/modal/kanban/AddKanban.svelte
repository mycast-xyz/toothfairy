<script lang="ts">
	let showAddTaskModal = $state(false);
	let newTask = $state({
		title: '',
		description: '',
		dueDate: '',
		priority: 'medium',
		assignees: [],
		labels: [],
		comments: 0,
		attachments: 0
	});

	// 태스크 저장
	function saveTask() {
		if (newTask.title) {
		}
	}
</script>

<div class="space-y-4">
	<div>
		<label class="block text-sm font-medium text-gray-700" for="title">제목</label>
		<input type="text" bind:value={newTask.title} class="mt-1 w-full rounded-md border p-2" />
	</div>
	<div>
		<label class="block text-sm font-medium text-gray-700" for="description">설명</label>
		<textarea bind:value={newTask.description} class="mt-1 w-full rounded-md border p-2"></textarea>
	</div>
	<div class="flex gap-4">
		<div class="flex-1">
			<label class="block text-sm font-medium text-gray-700" for="dueDate">마감일</label>
			<input type="date" bind:value={newTask.dueDate} class="mt-1 w-full rounded-md border p-2" />
		</div>
		<div class="flex-1">
			<label class="block text-sm font-medium text-gray-700" for="priority">우선순위</label>
			<select bind:value={newTask.priority} class="mt-1 w-full rounded-md border p-2">
				<option value="high">높음</option>
				<option value="medium">중간</option>
				<option value="low">낮음</option>
			</select>
		</div>
	</div>
	<div
		class="flex items-center space-x-3 rounded-b border-t border-gray-200 p-4 dark:border-gray-600 md:p-5 rtl:space-x-reverse"
	>
		<button class="rounded-md bg-gray-200 px-4 py-2" onclick={() => (showAddTaskModal = false)}>
			취소
		</button>
		<button class="rounded-md bg-blue-500 px-4 py-2 text-white" onclick={saveTask}> 저장 </button>
	</div>
</div>
