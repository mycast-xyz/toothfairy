<script lang="ts">
	import type { PageData } from './$types';
	import '../app.css';
	import HeaderMenu from '../app/view/menu/HeaderMenu.svelte';
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

<!-- 헤더 메뉴 -->
<HeaderMenu title="ToothFairy" infoText="토스트 메시지" />

<!-- 슬라이더 메뉴 -->
<SliderMenu />

<!-- 페이지 컨텐츠 -->
{@render children()}
