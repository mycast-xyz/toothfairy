<script lang="ts">
	import type { PageData } from './$types';
	import '../app.css';
	import DesktopHeaderMenu from '../app/view/desktop/menu/HeaderMenu.svelte';
	import MobileHeaderMenu from '../app/view/mobile/menu/HeaderMenu.svelte';
	import SliderMenu from '../app/view/menu/SliderMenu.svelte';
	import Toast from '../app/view/toast/Toast.svelte';
	import DesktopModal from '../app/view/modal/DesktopModal.svelte';

	const {
		data,
		children,
		title = 'tt'
	} = $props<{ data: PageData; children: any; title?: string }>();
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
		<SliderMenu />
	{/if}
{/if}

<!-- 페이지 컨텐츠 -->
{@render children()}
