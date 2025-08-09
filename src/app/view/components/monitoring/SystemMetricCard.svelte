<script lang="ts">
	import {
		formatBytes,
		formatDiskSize,
		getUsageColor,
		getUsageTextColor
	} from '../../../service/SystemMonitoringService';

	// Props
	let {
		title,
		icon,
		usage,
		total,
		used,
		free,
		unit = '%',
		details
	}: {
		title: string;
		icon: string;
		usage: number;
		total?: number;
		used?: number;
		free?: number;
		unit?: string;
		details?: string[];
	} = $props();
</script>

<div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
	<!-- 헤더 -->
	<div class="mb-4 flex items-center justify-between">
		<div class="flex items-center">
			<div class="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
				<i class="{icon} text-lg text-blue-600"></i>
			</div>
			<h3 class="ml-3 text-lg font-medium text-gray-900">{title}</h3>
		</div>
		<span class="text-2xl font-bold {getUsageTextColor(usage)}">
			{usage.toFixed(1)}{unit}
		</span>
	</div>

	<!-- 프로그레스 바 -->
	<div class="mb-4">
		<div class="mb-2 flex justify-between text-sm text-gray-600">
			<span>사용률</span>
			<span>{usage.toFixed(1)}{unit}</span>
		</div>
		<div class="h-3 w-full rounded-full bg-gray-200">
			<div
				class="{getUsageColor(usage)} h-3 rounded-full transition-all duration-300"
				style="width: {Math.min(usage, 100)}%"
			></div>
		</div>
	</div>

	<!-- 상세 정보 -->
	{#if total !== undefined && used !== undefined && free !== undefined}
		<div class="space-y-2 text-sm text-gray-600">
			<div class="flex justify-between">
				<span>총용량:</span>
				<span class="font-medium">
					{title.includes('디스크') || title.includes('Disk')
						? formatDiskSize(total)
						: formatBytes(total)}
				</span>
			</div>
			<div class="flex justify-between">
				<span>사용량:</span>
				<span class="font-medium">
					{title.includes('디스크') || title.includes('Disk')
						? formatDiskSize(used)
						: formatBytes(used)}
				</span>
			</div>
			<div class="flex justify-between">
				<span>여유공간:</span>
				<span class="font-medium">
					{title.includes('디스크') || title.includes('Disk')
						? formatDiskSize(free)
						: formatBytes(free)}
				</span>
			</div>
		</div>
	{/if}

	<!-- 추가 세부사항 -->
	{#if details && details.length > 0}
		<div class="mt-4 border-t border-gray-100 pt-4">
			<ul class="space-y-1 text-sm text-gray-600">
				{#each details as detail}
					<li class="flex justify-between">
						<span>{detail.split(':')[0]}:</span>
						<span class="font-medium">{detail.split(':')[1]}</span>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</div>
