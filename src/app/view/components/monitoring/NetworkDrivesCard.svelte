<script lang="ts">
	import {
		formatBytes,
		formatDiskSize,
		getUsageColor,
		getUsageTextColor
	} from '../../../service/SystemMonitoringService';

	// Props
	let {
		networkDrives = []
	}: {
		networkDrives?: Array<{
			path: string;
			name: string;
			total: number;
			used: number;
			free: number;
			usage: number;
			available: boolean;
			lastChecked: number;
		}>;
	} = $props();

	// 네트워크 드라이브 상태에 따른 아이콘
	function getDriveStatusIcon(available: boolean): string {
		return available ? 'ri-check-line' : 'ri-close-line';
	}

	// 네트워크 드라이브 상태에 따른 색상
	function getDriveStatusColor(available: boolean): string {
		return available ? 'text-green-600' : 'text-red-600';
	}

	// 마지막 확인 시간 포맷
	function formatLastChecked(timestamp: number): string {
		const date = new Date(timestamp);
		return date.toLocaleString('ko-KR');
	}
</script>

<div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
	<!-- 헤더 -->
	<div class="mb-4 flex items-center justify-between">
		<div class="flex items-center">
			<div class="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
				<i class="ri-hard-drive-2-line text-lg text-purple-600"></i>
			</div>
			<h3 class="ml-3 text-lg font-medium text-gray-900">네트워크 드라이브</h3>
		</div>
		<span class="text-sm text-gray-500">
			{networkDrives.length}개 드라이브
		</span>
	</div>

	{#if networkDrives && networkDrives.length > 0}
		<!-- 네트워크 드라이브 목록 -->
		<div class="space-y-4">
			{#each networkDrives as drive}
				<div class="rounded-md border border-gray-100 p-4">
					<!-- 드라이브 헤더 -->
					<div class="mb-3 flex items-center justify-between">
						<div class="flex items-center">
							<i
								class="{getDriveStatusIcon(drive.available)} mr-2 text-lg {getDriveStatusColor(
									drive.available
								)}"
							></i>
							<h4 class="font-medium text-gray-900">{drive.name}</h4>
							<span class="ml-2 text-sm text-gray-500">({drive.path})</span>
						</div>
						<div class="flex items-center">
							<span class="text-sm {getDriveStatusColor(drive.available)}">
								{drive.available ? '연결됨' : '연결 안됨'}
							</span>
						</div>
					</div>

					{#if drive.available}
						<!-- 사용률 표시 -->
						<div class="mb-3">
							<div class="mb-2 flex justify-between text-sm text-gray-600">
								<span>사용률</span>
								<span class={getUsageTextColor(drive.usage)}>
									{drive.usage.toFixed(1)}%
								</span>
							</div>
							<div class="h-2 w-full rounded-full bg-gray-200">
								<div
									class="{getUsageColor(drive.usage)} h-2 rounded-full transition-all duration-300"
									style="width: {Math.min(drive.usage, 100)}%"
								></div>
							</div>
						</div>

						<!-- 용량 정보 -->
						<div class="space-y-1 text-sm text-gray-600">
							<div class="flex justify-between">
								<span>총용량:</span>
								<span class="font-medium">{formatDiskSize(drive.total)}</span>
							</div>
							<div class="flex justify-between">
								<span>사용량:</span>
								<span class="font-medium">{formatDiskSize(drive.used)}</span>
							</div>
							<div class="flex justify-between">
								<span>여유공간:</span>
								<span class="font-medium">{formatDiskSize(drive.free)}</span>
							</div>
						</div>
					{:else}
						<!-- 연결 실패 메시지 -->
						<div class="rounded-md bg-red-50 p-3">
							<div class="flex">
								<i class="ri-error-warning-line mr-2 mt-0.5 text-red-400"></i>
								<p class="text-sm text-red-700">
									네트워크 드라이브에 연결할 수 없습니다. 네트워크 연결 상태를 확인해주세요.
								</p>
							</div>
						</div>
					{/if}

					<!-- 마지막 확인 시간 -->
					<div class="mt-3 border-t border-gray-100 pt-3">
						<p class="text-xs text-gray-500">
							<i class="ri-time-line mr-1"></i>
							마지막 확인: {formatLastChecked(drive.lastChecked)}
						</p>
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<!-- 네트워크 드라이브가 없는 경우 -->
		<div class="rounded-md bg-gray-50 p-6 text-center">
			<i class="ri-hard-drive-2-line mb-3 text-4xl text-gray-400"></i>
			<h4 class="mb-2 font-medium text-gray-900">네트워크 드라이브 없음</h4>
			<p class="text-sm text-gray-600">
				설정된 네트워크 드라이브가 없습니다.<br />
				시스템 관리자에게 문의하여 네트워크 스토리지를 설정해주세요.
			</p>
		</div>
	{/if}
</div>
