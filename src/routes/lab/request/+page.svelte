<script lang="ts">
	import type { PageData } from './$types';
	import DesktopRequestInfo from '../../../app/view/desktop/request/RequestInfo.svelte';
	import MobileRequestInfo from '../../../app/view/mobile/request/RequestInfo.svelte';

	export let data: PageData;
</script>

<article>
	{#if data.isMobile}
		<MobileRequestInfo {data} />
	{:else}
		<DesktopRequestInfo {data} />
	{/if}
</article>
