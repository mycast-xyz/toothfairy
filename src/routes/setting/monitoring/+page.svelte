<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import {
		systemMonitoringService,
		systemInfo,
		isMonitoringConnected,
		isMonitoringActive,
		formatBytes,
		formatUptime,
		type SystemInfo
	} from '../../../app/service/SystemMonitoringService';
	import { toastStore } from '../../../app/service/ToastService';
	import PageHeaderBar from '../../../app/view/components/PageHeaderBar.svelte';
	import SystemMetricCard from '../../../app/view/components/monitoring/SystemMetricCard.svelte';
	import MonitoringControls from '../../../app/view/components/monitoring/MonitoringControls.svelte';
	import NetworkDrivesCard from '../../../app/view/components/monitoring/NetworkDrivesCard.svelte';

	// Props
	export let data;

	// 상태
	let currentSystemInfo: SystemInfo | null = null;
	let lastUpdateTime: string = '';

	// 구독 해제 함수들
	let unsubscribeSystemInfo: (() => void) | null = null;

	onMount(async () => {
		// 권한 확인
		if (!data.user || data.user.role !== 'all_admin') {
			toastStore.error('관리자만 접근할 수 있습니다.');
			return;
		}

		console.log('🔍 시스템 모니터링 페이지 마운트');

		// 시스템 정보 구독
		unsubscribeSystemInfo = systemInfo.subscribe((info) => {
			currentSystemInfo = info;
			if (info) {
				lastUpdateTime = new Date(info.timestamp).toLocaleTimeString('ko-KR');
			}
		});

		// 초기 연결 시도
		try {
			await systemMonitoringService.connect();

			// REST API로 초기 데이터 로드
			await systemMonitoringService.fetchSystemInfo();

			// 네트워크 드라이브 정보 로드
			await systemMonitoringService.fetchNetworkDrives();
		} catch (error) {
			console.error('❌ 초기 모니터링 설정 실패:', error);
			toastStore.error('모니터링 시스템 초기화에 실패했습니다.');
		}
	});

	onDestroy(() => {
		// 구독 해제
		if (unsubscribeSystemInfo) {
			unsubscribeSystemInfo();
		}

		// 모니터링 중지 및 연결 해제
		systemMonitoringService.stopMonitoring();
		systemMonitoringService.disconnect();
	});

	// CPU 세부 정보
	$: cpuDetails = currentSystemInfo
		? [
				`코어 수:${currentSystemInfo.cpu.cores}개`,
				`모델:${currentSystemInfo.cpu.model.substring(0, 30)}...`
			]
		: [];

	// 메모리 세부 정보
	$: memoryDetails = currentSystemInfo
		? [
				`프로세스 RSS:${formatBytes(currentSystemInfo.process.memoryUsage.rss)}`,
				`힙 사용량:${formatBytes(currentSystemInfo.process.memoryUsage.heapUsed)}`,
				`힙 총량:${formatBytes(currentSystemInfo.process.memoryUsage.heapTotal)}`
			]
		: [];

	// 네트워크 세부 정보
	$: networkDetails = currentSystemInfo
		? [
				`업로드:${formatBytes(currentSystemInfo.network.uploadSpeed)}/s`,
				`다운로드:${formatBytes(currentSystemInfo.network.downloadSpeed)}/s`,
				`연결 수:${currentSystemInfo.network.connections}개`
			]
		: [];

	// 시스템 세부 정보
	$: systemDetails = currentSystemInfo
		? [
				`플랫폼:${currentSystemInfo.system.platform}`,
				`아키텍처:${currentSystemInfo.system.arch}`,
				`호스트명:${currentSystemInfo.system.hostname}`,
				`시스템 업타임:${formatUptime(currentSystemInfo.system.uptime)}`,
				`프로세스 업타임:${formatUptime(currentSystemInfo.process.uptime)}`,
				`프로세스 ID:${currentSystemInfo.process.pid}`
			]
		: [];
</script>

<svelte:head>
	<title>시스템 모니터링 - 설정</title>
	<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/remixicon@3.5.0/fonts/remixicon.css" />
</svelte:head>

<main class="ml-64 mt-8 min-h-screen flex-1 bg-gray-100 p-8">
	<PageHeaderBar title="시스템 모니터링" description="시스템 리소스 실시간 모니터링 및 관리">
		<div class="flex items-center space-x-4">
			<!-- 연결 상태 -->
			<div class="flex items-center text-sm">
				<div
					class="mr-2 h-3 w-3 rounded-full"
					class:bg-green-500={$isMonitoringConnected}
					class:bg-red-500={!$isMonitoringConnected}
				></div>
				<span class="text-gray-600">
					{$isMonitoringConnected ? '연결됨' : '연결 안됨'}
				</span>
			</div>

			<!-- 마지막 업데이트 시간 -->
			{#if lastUpdateTime}
				<div class="text-sm text-gray-500">
					<i class="ri-time-line mr-1"></i>
					마지막 업데이트: {lastUpdateTime}
				</div>
			{/if}

			<!-- 실시간 모니터링 상태 -->
			{#if $isMonitoringActive}
				<span
					class="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800"
				>
					<div class="mr-1 h-2 w-2 animate-pulse rounded-full bg-green-500"></div>
					실시간 모니터링 중
				</span>
			{/if}
		</div>
	</PageHeaderBar>

	<!-- 모니터링 제어 패널 -->
	<div class="mb-8">
		<MonitoringControls />
	</div>

	{#if currentSystemInfo}
		<!-- 시스템 메트릭 카드들 -->
		<div class="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
			<!-- CPU 사용률 -->
			<SystemMetricCard
				title="CPU 사용률"
				icon="ri-cpu-line"
				usage={currentSystemInfo.cpu.usage}
				details={cpuDetails}
			/>

			<!-- 메모리 사용률 -->
			<SystemMetricCard
				title="메모리 사용률"
				icon="ri-database-2-line"
				usage={currentSystemInfo.memory.usage}
				total={currentSystemInfo.memory.total}
				used={currentSystemInfo.memory.used}
				free={currentSystemInfo.memory.free}
				details={memoryDetails}
			/>

			<!-- 디스크 사용률 -->
			<SystemMetricCard
				title="디스크 사용률"
				icon="ri-hard-drive-line"
				usage={currentSystemInfo.disk.usage}
				total={currentSystemInfo.disk.total}
				used={currentSystemInfo.disk.used}
				free={currentSystemInfo.disk.free}
			/>

			<!-- 네트워크 활동 -->
			<SystemMetricCard
				title="네트워크"
				icon="ri-wifi-line"
				usage={0}
				unit=""
				details={networkDetails}
			/>
		</div>
		<!-- 네트워크 드라이브 정보 -->
		<div class="">
			<NetworkDrivesCard networkDrives={currentSystemInfo.networkDrives || []} />
		</div>

		<!-- 상세 시스템 정보 -->
		<div class="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
			<!-- 시스템 정보 -->
			<div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
				<h3 class="mb-4 flex items-center text-lg font-medium text-gray-900">
					<i class="ri-computer-line mr-2 text-blue-600"></i>
					시스템 정보
				</h3>
				<dl class="space-y-3">
					{#each systemDetails as detail}
						<div class="flex justify-between text-sm">
							<dt class="text-gray-600">{detail.split(':')[0]}:</dt>
							<dd class="font-medium text-gray-900">{detail.split(':')[1]}</dd>
						</div>
					{/each}
				</dl>
			</div>

			<!-- 로드 평균 -->
			<div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
				<h3 class="mb-4 flex items-center text-lg font-medium text-gray-900">
					<i class="ri-speed-line mr-2 text-blue-600"></i>
					시스템 로드 평균
				</h3>
				<div class="space-y-4">
					{#each currentSystemInfo.system.loadAverage as load, index}
						{@const period = ['1분', '5분', '15분'][index]}
						<div class="flex items-center justify-between">
							<span class="text-sm text-gray-600">{period}:</span>
							<div class="flex items-center">
								<div class="mr-3 h-2 w-32 rounded-full bg-gray-200">
									<div
										class="h-2 rounded-full transition-all duration-300"
										class:bg-green-500={load < 1}
										class:bg-yellow-500={load >= 1 && load < 2}
										class:bg-red-500={load >= 2}
										style="width: {Math.min((load / currentSystemInfo.cpu.cores) * 100, 100)}%"
									></div>
								</div>
								<span class="w-12 text-sm font-medium text-gray-900">
									{load.toFixed(2)}
								</span>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>

		<!-- 프로세스 메모리 사용량 차트 -->
		<div class="mt-8">
			<div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
				<h3 class="mb-4 flex items-center text-lg font-medium text-gray-900">
					<i class="ri-pie-chart-line mr-2 text-blue-600"></i>
					프로세스 메모리 사용량
				</h3>
				<div class="grid grid-cols-2 gap-4 md:grid-cols-4">
					<div class="text-center">
						<div class="text-2xl font-bold text-blue-600">
							{formatBytes(currentSystemInfo.process.memoryUsage.rss)}
						</div>
						<div class="text-sm text-gray-600">RSS</div>
					</div>
					<div class="text-center">
						<div class="text-2xl font-bold text-green-600">
							{formatBytes(currentSystemInfo.process.memoryUsage.heapUsed)}
						</div>
						<div class="text-sm text-gray-600">힙 사용량</div>
					</div>
					<div class="text-center">
						<div class="text-2xl font-bold text-yellow-600">
							{formatBytes(currentSystemInfo.process.memoryUsage.heapTotal)}
						</div>
						<div class="text-sm text-gray-600">힙 총량</div>
					</div>
					<div class="text-center">
						<div class="text-2xl font-bold text-purple-600">
							{formatBytes(currentSystemInfo.process.memoryUsage.external)}
						</div>
						<div class="text-sm text-gray-600">외부</div>
					</div>
				</div>
			</div>
		</div>
	{:else}
		<!-- 로딩 상태 -->
		<div class="flex h-96 items-center justify-center">
			<div class="text-center">
				<i class="ri-loader-4-line mb-4 animate-spin text-4xl text-gray-400"></i>
				<p class="text-gray-600">시스템 정보를 불러오는 중...</p>
				<p class="mt-2 text-sm text-gray-500">
					모니터링 서버에 연결한 후 시스템 정보를 요청해주세요.
				</p>
			</div>
		</div>
	{/if}
</main>

<style>
	/* 애니메이션 효과 */
	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}

	.animate-pulse {
		animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	.animate-spin {
		animation: spin 1s linear infinite;
	}
</style>
