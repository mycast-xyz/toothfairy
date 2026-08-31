<script lang="ts">
	import type { PageData } from './$types';
	import '../app.css';
	import DesktopHeaderMenu from '../app/view/desktop/menu/HeaderMenu.svelte';
	import MobileHeaderMenu from '../app/view/mobile/menu/HeaderMenu.svelte';
	import SliderMenu from '../app/view/desktop/menu/SliderMenu.svelte';
	import Toast from '../app/view/toast/Toast.svelte';
	import DesktopModal from '../app/view/modal/DesktopModal.svelte';
	import { derived } from 'svelte/store';
	import { page } from '$app/stores';

	const {
		data,
		children,
		title = 'tt'
	} = $props<{ data: PageData; children: any; title?: string }>();

	// /test 경로 확인
	const isTestPath = derived(page, ($page) => $page.url.pathname.startsWith('/test'));

	// 토큰 갱신은 서버(hooks.server.ts)가 담당한다.
	// 브라우저측 자동 갱신(TokenRefreshService/AuthTokenService/UserActivityService)은
	// 백엔드가 요구하는 요청 형식과 맞지 않아 항상 실패하면서 1분마다 /login 으로
	// 튕기고 인증 rate limit 만 소진시켰기 때문에 제거했다.
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
