<script lang="ts">
	export let title: string = '진행율';
	export let percent: number = 0;
	export let remaining: number = 0;
	export let total: number = 0;
	export let iconClass: string = 'ri-todo-line';
	export let barColor: string = 'bg-blue-500';
	export let percentTextColor: string = 'text-gray-900';
</script>

<div
	class="relative mr-4 flex w-full flex-row flex-wrap items-center rounded-xl bg-white p-5 shadow"
>
	<div class="flex-1">
		<div class="mb-1 text-sm font-semibold text-gray-500">{title}</div>
		<div class="mb-1 text-3xl font-extrabold {percentTextColor}">{percent}%</div>
		<div class="mb-2 text-sm font-semibold text-green-500">
			{remaining} <span class="font-normal text-gray-400">/ {total}</span>
		</div>
	</div>
	<div class="ml-4 flex-shrink-0">
		<div class="flex h-12 w-12 items-center justify-center rounded-full {barColor}">
			<i class="{iconClass} text-white"></i>
		</div>
	</div>
	<div class="flex-2 mt-3 h-2 w-full overflow-hidden rounded bg-gray-200">
		<div class="h-2 rounded {barColor}" style="width: {percent}%"></div>
	</div>
</div>
