<script lang="ts">
	import type { PageData } from './$types';
	import '../app.css';
	import HeaderMenu from '../app/view/menu/HeaderMenu.svelte';
	import SliderMenu from '../app/view/menu/SliderMenu.svelte';
	import Toast from '../app/view/toast/Toast.svelte';

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

<HeaderMenu title="ToothFairy" infoText="토스트 메시지" />
<SliderMenu />
<!-- 페이지 컨텐츠 -->
{@render children()}
