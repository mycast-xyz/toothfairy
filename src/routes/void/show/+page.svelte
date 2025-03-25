<script lang="ts">
	// 캘린더 처리용 DatePicker
	import { writable } from 'svelte/store';
	import { onMount } from 'svelte';

	import MultiSTLViewer from '../../../app/view/stlviewer/PrintOutPutViewer.svelte';
	const stlFiles = ['/test/print/1.stl', '/test/print/4.stl', '/test/print/3.stl'];
	const scale = 0.1; // 크기 단위 스케일 (예: 1mm = 0.1)

	let boxWidth: number = 0;
</script>

<main class="ml-64 mt-8 min-h-screen flex-1 bg-gray-100 p-8">
	<article class="w-full pl-3 pr-5 pt-3">
		<div class="mx-2 mt-6 flex flex-col lg:flex-row">
			<div class="m-1 w-full rounded-sm border border-gray-200 bg-white text-lg shadow-lg lg:w-1/3">
				내용 박스
			</div>
			<div
				class="m-1 h-full w-full rounded-sm border border-gray-200 bg-white text-lg shadow-lg lg:w-2/3"
			>
				<div class="h-full w-full overflow-x-auto rounded-lg p-3">
					<script>
						import { onMount } from 'svelte';
						let boxWidth;

						onMount(() => {
							const box = document.querySelector('.h-full.w-full.overflow-x-auto.rounded-lg.p-3');
							boxWidth = box ? box.clientWidth : 0;
							console.log('박스 너비:', boxWidth);
						});
					</script>
					<MultiSTLViewer stlUrls={stlFiles} unitScale={scale} />
				</div>
			</div>
		</div>
	</article>
</main>

<style lang="scss">
</style>
