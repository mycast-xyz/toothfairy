<script lang="ts">
	import type { PageData } from './$types';
	import PrintView from '../../../app/view/cam/PrintView.svelte';

	// 페이지 데이터 받기
	export let data: PageData;
</script>

<PrintView {data} />
