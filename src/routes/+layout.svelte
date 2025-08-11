<script lang="ts">
	import type { PageData } from './$types';
	import '../app.css';
	import DesktopHeaderMenu from '../app/view/desktop/menu/HeaderMenu.svelte';
	import MobileHeaderMenu from '../app/view/mobile/menu/HeaderMenu.svelte';
	import SliderMenu from '../app/view/desktop/menu/SliderMenu.svelte';
	import Toast from '../app/view/toast/Toast.svelte';
	import DesktopModal from '../app/view/modal/DesktopModal.svelte';
	import { writable } from 'svelte/store';
	import { onMount, onDestroy } from 'svelte';
	import { tokenRefreshService } from '../app/service/auth/TokenRefreshService';
	import { authTokenService } from '../app/service/auth/AuthTokenService';
	import { userActivityService } from '../app/service/auth/UserActivityService';

	const {
		data,
		children,
		title = 'tt'
	} = $props<{ data: PageData; children: any; title?: string }>();

	// 토큰 상태 모니터링
	let tokenExpiryTime: string = '';
	let timeUntilExpiry: string = '';
	let userActivityStatus: string = '활성';

	onMount(() => {
		// 토큰 갱신 서비스 시작
		console.log('🚀 토큰 갱신 서비스 초기화');
		console.log('🚀 사용자 활동 추적 서비스 초기화');

		// 토큰 상태 주기적 업데이트
		const updateTokenStatus = () => {
			const expiryTime = authTokenService.getTokenExpirationTime();
			const timeLeft = authTokenService.getTimeUntilExpiry();

			if (expiryTime) {
				tokenExpiryTime = new Date(expiryTime).toLocaleString('ko-KR');
			}

			if (timeLeft !== null) {
				const minutes = Math.floor(timeLeft / (1000 * 60));
				const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
				timeUntilExpiry = `${minutes}분 ${seconds}초`;
			}
		};

		// 사용자 활동 상태 업데이트
		const updateActivityStatus = () => {
			const status = userActivityService.getCurrentActivityStatus();
			userActivityStatus = status.isActive ? '활성' : '비활성';
		};

		// 초기 상태 업데이트
		updateTokenStatus();
		updateActivityStatus();

		// 1초마다 상태 업데이트
		const statusInterval = setInterval(() => {
			updateTokenStatus();
			updateActivityStatus();
		}, 1000);

		// 컴포넌트 정리 시 인터벌 정리
		return () => {
			clearInterval(statusInterval);
		};
	});

	onDestroy(() => {
		// 서비스 정리
		tokenRefreshService.stop();
		userActivityService.destroy();
	});
</script>

<svelte:head>
	<title>{title}</title>
</svelte:head>

<!-- 토스트 메시지 -->
<Toast />

<!-- 데스크탑 모달 -->
<DesktopModal />

<!-- 메인 메뉴 -->
{#if !data.isNotLayoutPage}
	{#if data.isMobile}
		<MobileHeaderMenu title="ToothFairy" infoText="토스트 메시지" />
	{:else}
		<DesktopHeaderMenu title="ToothFairy" infoText="토스트 메시지" />
		<!-- 슬라이더 메뉴 -->
		<SliderMenu {data} />
	{/if}
{/if}

<!-- 페이지 컨텐츠 -->
{@render children()}

<!-- 토큰 상태 표시 (개발 모드에서만) -->
{#if import.meta.env.DEV && tokenExpiryTime}
	<div
		class="fixed bottom-4 right-4 rounded-lg bg-gray-800 p-3 text-xs text-white opacity-75 transition-opacity hover:opacity-100"
	>
		<div>토큰 만료: {tokenExpiryTime}</div>
		<div>남은 시간: {timeUntilExpiry}</div>
		<div>사용자 상태: {userActivityStatus}</div>
	</div>
{/if}
