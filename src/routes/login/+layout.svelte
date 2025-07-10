<script lang="ts">
	import type { PageData } from './$types';
	import '../../app.css';
	import Toast from '../../app/view/toast/Toast.svelte';

	const { data, children } = $props<{ data: PageData; children: any }>();
</script>

<!-- 토스트 메시지 -->
<Toast />

<!-- 페이지 컨텐츠 -->
{@render children()}
