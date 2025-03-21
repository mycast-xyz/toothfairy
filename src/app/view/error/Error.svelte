<script lang="ts">
	import { page } from '$app/stores';
</script>

<div class="flex h-screen w-full flex-col items-center justify-center">
	<div class="absolute inset-0 -z-10">
		<img
			src="/assets/main/error_01.webp"
			alt="에러 배경"
			class="h-full w-full object-cover opacity-20"
		/>
	</div>
	<div class="absolute inset-0 -z-10 bg-blue-700 opacity-40"></div>
	<div class="flex flex-col items-center justify-center gap-4">
		<h1 class="text-6xl font-bold text-white">무언가가 잘못되었습니다.</h1>
		<p class="text-xl text-white">
			{$page.status}: {$page.error?.message || '알 수 없는 오류가 발생했습니다.'}
		</p>
		<a
			href="/"
			class="mt-4 rounded-lg bg-white px-6 py-3 text-lg font-semibold text-blue-600 hover:bg-blue-500 hover:text-white"
		>
			홈으로 돌아가기
		</a>
	</div>
</div>
