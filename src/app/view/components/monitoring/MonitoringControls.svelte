<script lang="ts">
	import {
		systemMonitoringService,
		isMonitoringConnected,
		isMonitoringActive,
		monitoringError
	} from '../../../service/SystemMonitoringService';
	import { toastStore } from '../../../service/ToastService';

	// 상태
	let selectedInterval = 5000;
	let isConnecting = false;

	// 간격 옵션
	const intervalOptions = [
		{ value: 1000, label: '1초' },
		{ value: 3000, label: '3초' },
		{ value: 5000, label: '5초' },
		{ value: 10000, label: '10초' },
		{ value: 30000, label: '30초' }
	];

	// 연결/해제
	async function toggleConnection() {
		if ($isMonitoringConnected) {
			systemMonitoringService.disconnect();
			toastStore.info('모니터링 서버 연결을 해제했습니다.');
		} else {
			isConnecting = true;
			try {
				await systemMonitoringService.connect();
				toastStore.success('모니터링 서버에 연결되었습니다.');
			} catch (error) {
				toastStore.error('모니터링 서버 연결에 실패했습니다.');
			} finally {
				isConnecting = false;
			}
		}
	}

	// 모니터링 시작/중지
	function toggleMonitoring() {
		if ($isMonitoringActive) {
			systemMonitoringService.stopMonitoring();
			toastStore.info('실시간 모니터링을 중지했습니다.');
		} else {
			if (!$isMonitoringConnected) {
				toastStore.error('먼저 모니터링 서버에 연결해주세요.');
				return;
			}
			systemMonitoringService.startMonitoring(selectedInterval);
			toastStore.success(`실시간 모니터링을 시작했습니다. (${selectedInterval / 1000}초 간격)`);
		}
	}

	// 수동 새로고침
	function refreshSystemInfo() {
		if (!$isMonitoringConnected) {
			toastStore.error('먼저 모니터링 서버에 연결해주세요.');
			return;
		}
		systemMonitoringService.requestSystemInfo();
		toastStore.info('시스템 정보를 새로고침했습니다.');
	}

	// 네트워크 드라이브 새로고침
	function refreshNetworkDrives() {
		if (!$isMonitoringConnected) {
			toastStore.error('먼저 모니터링 서버에 연결해주세요.');
			return;
		}
		systemMonitoringService.requestNetworkDrivesInfo();
		toastStore.info('네트워크 드라이브 정보를 새로고침했습니다.');
	}

	// 간격 변경
	function changeInterval() {
		if ($isMonitoringActive) {
			systemMonitoringService.setMonitoringInterval(selectedInterval);
			toastStore.info(`모니터링 간격을 ${selectedInterval / 1000}초로 변경했습니다.`);
		}
	}
</script>

<div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
	<div class="mb-6 flex items-center justify-between">
		<h2 class="text-xl font-semibold text-gray-900">모니터링 제어</h2>

		<!-- 연결 상태 표시 -->
		<div class="flex items-center space-x-2">
			<div class="flex items-center">
				<div
					class="mr-2 h-3 w-3 rounded-full"
					class:bg-green-500={$isMonitoringConnected}
					class:bg-red-500={!$isMonitoringConnected}
				></div>
				<span class="text-sm text-gray-600">
					{$isMonitoringConnected ? '연결됨' : '연결 안됨'}
				</span>
			</div>

			{#if $isMonitoringActive}
				<span
					class="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800"
				>
					<div class="mr-1 h-2 w-2 animate-pulse rounded-full bg-green-500"></div>
					실시간 모니터링 중
				</span>
			{/if}
		</div>
	</div>

	<!-- 에러 메시지 -->
	{#if $monitoringError}
		<div class="mb-4 rounded-md border border-red-200 bg-red-50 p-4">
			<div class="flex">
				<i class="ri-error-warning-line mr-2 mt-0.5 text-red-400"></i>
				<p class="text-sm text-red-700">{$monitoringError}</p>
			</div>
		</div>
	{/if}

	<!-- 제어 버튼들 -->
	<div class="grid grid-cols-1 gap-4 md:grid-cols-4">
		<!-- 연결/해제 버튼 -->
		<div class="space-y-2">
			<label for="connect-button" class="block text-sm font-medium text-gray-700">서버 연결</label>
			<button
				id="connect-button"
				onclick={toggleConnection}
				disabled={isConnecting}
				class="flex w-full items-center justify-center rounded-md border border-transparent px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors"
				class:bg-red-600={$isMonitoringConnected}
				class:hover:bg-red-700={$isMonitoringConnected}
				class:bg-blue-600={!$isMonitoringConnected && !isConnecting}
				class:hover:bg-blue-700={!$isMonitoringConnected && !isConnecting}
				class:bg-gray-400={isConnecting}
				class:cursor-not-allowed={isConnecting}
			>
				{#if isConnecting}
					<i class="ri-loader-4-line mr-2 animate-spin"></i>
					연결 중...
				{:else if $isMonitoringConnected}
					<i class="ri-stop-circle-line mr-2"></i>
					연결 해제
				{:else}
					<i class="ri-play-circle-line mr-2"></i>
					연결
				{/if}
			</button>
		</div>

		<!-- 모니터링 시작/중지 -->
		<div class="space-y-2">
			<label for="monitor-button" class="block text-sm font-medium text-gray-700"
				>실시간 모니터링</label
			>
			<button
				id="monitor-button"
				onclick={toggleMonitoring}
				disabled={!$isMonitoringConnected}
				class="flex w-full items-center justify-center rounded-md border border-transparent px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors"
				class:bg-red-600={$isMonitoringActive}
				class:hover:bg-red-700={$isMonitoringActive}
				class:bg-green-600={!$isMonitoringActive && $isMonitoringConnected}
				class:hover:bg-green-700={!$isMonitoringActive && $isMonitoringConnected}
				class:bg-gray-400={!$isMonitoringConnected}
				class:cursor-not-allowed={!$isMonitoringConnected}
			>
				{#if $isMonitoringActive}
					<i class="ri-pause-circle-line mr-2"></i>
					모니터링 중지
				{:else}
					<i class="ri-play-circle-line mr-2"></i>
					모니터링 시작
				{/if}
			</button>
		</div>

		<!-- 수동 새로고침 -->
		<div class="space-y-2">
			<label for="refresh-button" class="block text-sm font-medium text-gray-700"
				>수동 새로고침</label
			>
			<button
				id="refresh-button"
				onclick={refreshSystemInfo}
				disabled={!$isMonitoringConnected}
				class="flex w-full items-center justify-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium shadow-sm transition-colors"
				class:text-gray-700={$isMonitoringConnected}
				class:bg-white={$isMonitoringConnected}
				class:hover:bg-gray-50={$isMonitoringConnected}
				class:text-gray-400={!$isMonitoringConnected}
				class:bg-gray-100={!$isMonitoringConnected}
				class:cursor-not-allowed={!$isMonitoringConnected}
			>
				<i class="ri-refresh-line mr-2"></i>
				새로고침
			</button>
		</div>

		<!-- 네트워크 드라이브 새로고침 -->
		<div class="space-y-2">
			<label for="network-refresh-button" class="block text-sm font-medium text-gray-700"
				>네트워크 드라이브</label
			>
			<button
				id="network-refresh-button"
				onclick={refreshNetworkDrives}
				disabled={!$isMonitoringConnected}
				class="flex w-full items-center justify-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium shadow-sm transition-colors"
				class:text-gray-700={$isMonitoringConnected}
				class:bg-white={$isMonitoringConnected}
				class:hover:bg-gray-50={$isMonitoringConnected}
				class:text-gray-400={!$isMonitoringConnected}
				class:bg-gray-100={!$isMonitoringConnected}
				class:cursor-not-allowed={!$isMonitoringConnected}
			>
				<i class="ri-hard-drive-2-line mr-2"></i>
				네트워크 드라이브
			</button>
		</div>
	</div>

	<!-- 모니터링 간격 설정 -->
	<div class="mt-6 border-t border-gray-200 pt-6">
		<div class="flex items-center justify-between">
			<label for="interval" class="block text-sm font-medium text-gray-700"> 모니터링 간격 </label>
			<span class="text-xs text-gray-500">
				{$isMonitoringActive ? '(변경 시 즉시 적용)' : '(모니터링 시작 시 적용)'}
			</span>
		</div>
		<select
			id="interval"
			bind:value={selectedInterval}
			onchange={changeInterval}
			class="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
		>
			{#each intervalOptions as option}
				<option value={option.value}>{option.label}</option>
			{/each}
		</select>
	</div>
</div>
