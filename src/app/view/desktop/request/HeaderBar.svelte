<script lang="ts">
	import { log } from 'three/tsl';

	export let currentStep: number;

	console.log(currentStep);
</script>

<nav
	class="request-nav content-nav-box block h-auto w-full rounded-lg border border-gray-200 bg-white px-4 py-3 shadow dark:border-gray-700 dark:bg-gray-800"
>
	<div class="ca-list-title flex w-full flex-row">
		<div class="box-title m-0 inline-block flex flex-row items-center p-2">
			<h3 class="my-auto text-3xl font-extrabold text-violet-900">의뢰서 등록</h3>

			<h3 class="my-auto px-4 text-2xl text-gray-400">|</h3>
			<h3 class="my-auto py-1 text-2xl text-gray-400">기본 정보 등록</h3>
		</div>
		<div class="my-auto ml-auto w-auto items-center pr-2">
			<ol
				class="flex w-full items-center space-x-2 p-3 text-center text-sm font-medium text-gray-500"
			>
				<li class="flex items-center" class:text-violet-500={currentStep == 1}>
					<span
						class="me-2 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs"
						class:border-gray-500={currentStep != 1}
						class:border-violet-600={currentStep == 1}
					>
						1
					</span>
					기본정보 <span class="hidden sm:ms-2 sm:inline-flex">등록</span>
					<svg
						class="ms-2 h-3 w-3 sm:ms-4 rtl:rotate-180"
						aria-hidden="true"
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 12 10"
					>
						<path
							stroke="currentColor"
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="m7 9 4-4-4-4M1 9l4-4-4-4"
						/>
					</svg>
				</li>
				<li class="flex items-center pl-2" class:text-violet-500={currentStep == 2}>
					<span
						class="me-2 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs"
						class:border-gray-500={currentStep != 2}
						class:border-violet-600={currentStep == 2}
					>
						2
					</span>
					의뢰내용 <span class="hidden sm:ms-2 sm:inline-flex">입력</span>
					<svg
						class="ms-2 h-3 w-3 sm:ms-4 rtl:rotate-180"
						aria-hidden="true"
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 12 10"
					>
						<path
							stroke="currentColor"
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="m7 9 4-4-4-4M1 9l4-4-4-4"
						/>
					</svg>
				</li>
				<li class="flex items-center pl-2" class:text-violet-500={currentStep == 3}>
					<span
						class="me-2 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs"
						class:border-gray-500={currentStep != 3}
						class:border-violet-600={currentStep == 3}
					>
						3
					</span>
					최종확인
				</li>
			</ol>
		</div>
	</div>
</nav>
