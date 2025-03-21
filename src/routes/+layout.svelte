<script lang="ts">
	import type { PageData } from './$types';
	import '../app.css';
	import DesktopMainMenu from '../app/view/agent/desktop//MainMenu.svelte';
	import MobileMainMenu from '../app/view/agent/mobile/MainMenu.svelte';
	import Toast from '../app/view/toast/Toast.svelte';

	const {
		data,
		children,
		title = '게임 정보 사이트'
	} = $props<{ data: PageData; children: any; title?: string }>();
</script>

<svelte:head>
	<title>{title}</title>
</svelte:head>

<!-- 토스트 메시지 -->
<Toast />

<!-- 메인 메뉴 -->
{#if !data.isNotLayoutPage}
	{#if data.isMobile}
		<MobileMainMenu {data} />
	{:else}
		<DesktopMainMenu {data} />
	{/if}
{/if}

<!-- 페이지 컨텐츠 -->
{@render children()}
