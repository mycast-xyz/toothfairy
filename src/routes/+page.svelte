<script lang="ts">
	import type { PageData } from '$types';

	// 1부터 5까지의 랜덤값 생성
	const randomNumber = Math.floor(Math.random() * 5) + 1;

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>KingDuck</title>
	<meta name="description" content="킹덕, KingDuck" />
	<meta name="keywords" content="킹덕, KingDuck" />
</svelte:head>

{#if data.isMobile}
	<div class="h-screen w-screen overflow-hidden overflow-x-hidden bg-gray-100 dark:bg-gray-800">
		<!-- 메인 컨텐츠 영역 -->
		<div class="relative h-full w-full">
			<!-- 배경 이미지 -->
			<div class="absolute inset-0">
				<img
					src="/assets/main/bg_0{randomNumber}.webp"
					alt="Background"
					class="h-full w-full object-cover object-center"
				/>
			</div>

			<!-- 컨텐츠 오버레이 -->
			<div class="bg-gradient-m relative z-10 flex h-full flex-col items-end justify-end px-2">
				<div class="max-w-2xl pl-2 text-white">
					<!-- 메인 텍스트 -->
					<h1 class="mb-3 text-3xl font-bold tracking-tight">
						좋아하는 서브컬쳐 게임을<br />위한 정보 서비스
					</h1>
					<p class="mb-4 text-sm font-light">
						KingDuck는 붕괴: 스타레일, 소녀전선2: 망명, 니케, 젠레스 존 제로, 원신, 명조 와 같은
						서브 컬처 게임에 대한 정보를 제공하는 서비스입니다.
					</p>

					<!-- 버튼 그룹 -->
					<div class="flex gap-4">
						<a
							href="/login/create"
							class="rounded-lg bg-white px-5 py-2 font-semibold text-gray-900 transition-colors hover:bg-gray-200"
						>
							회원가입
						</a>
						<a
							href="/login/"
							class="rounded-lg border-2 border-white px-5 py-2 font-semibold text-white transition-colors hover:bg-white hover:text-gray-900"
						>
							로그인
						</a>
					</div>
				</div>
				<!-- 버튼 그룹 -->
				<div class="mb-5 mt-10 flex flex-col pl-2">
					<h2 class="text-xl font-bold text-white">최근 추가된 게임</h2>
					<div class="mt-4 flex gap-3">
						{#each data.info as gameItem}
							<a href="/list/{gameItem.title.slug}" class="mr-4 flex flex-col items-center">
								<img
									src={data.url + '/' + gameItem.images[0].url}
									alt="Honkai Star Rail"
									class="w-32"
								/>
								<p class="mt-2 text-xs font-medium text-white">{gameItem.title.kr}</p>
							</a>
						{/each}
					</div>
				</div>
			</div>
		</div>
	</div>
{:else}
	<div
		class="h-screen w-screen min-w-[1700px] overflow-hidden overflow-x-hidden bg-gray-100 dark:bg-gray-800"
	>
		<!-- 메인 컨텐츠 영역 -->
		<div class="relative h-full w-full">
			<!-- 배경 이미지 -->
			<div class="absolute inset-0">
				<img
					src="/assets/main/bg_0{randomNumber}.webp"
					alt="Background"
					class="h-full w-full object-cover object-center"
				/>
			</div>

			<!-- 컨텐츠 오버레이 -->
			<div class="bg-gradient relative z-10 flex h-full items-center px-20">
				<div class="max-w-2xl pl-20 text-white">
					<!-- 메인 텍스트 -->
					<h1 class="mb-6 text-5xl font-bold tracking-tight">
						좋아하는 서브컬쳐 게임을<br />위한 정보 서비스
					</h1>
					<p class="mb-8 text-lg font-medium">
						KingDuck는 붕괴: 스타레일, 소녀전선2: 망명, 니케, 젠레스 존 제로, 원신, 명조 와 같은
						서브 컬처 게임에 대한 정보를 제공하는 서비스입니다.
					</p>

					<!-- 버튼 그룹 -->
					<div class="flex gap-4">
						<a
							href="/login/create"
							class="rounded-lg bg-white px-8 py-3 font-semibold text-gray-900 transition-colors hover:bg-gray-200"
						>
							회원가입
						</a>
						<a
							href="/login/"
							class="rounded-lg border-2 border-white px-8 py-3 font-semibold text-white transition-colors hover:bg-white hover:text-gray-900"
						>
							로그인
						</a>
					</div>
				</div>
				<!-- 버튼 그룹 -->
				<div class="absolute bottom-10 left-20 flex flex-col pl-20">
					<h2 class="text-2xl font-bold text-white">최근 추가된 게임</h2>
					<div class="mt-4 flex gap-3">
						{#each data.info as gameItem}
							<a href="/list/{gameItem.title.slug}" class="mr-4 flex flex-col items-center">
								<img
									src={data.url + '/' + gameItem.images[0].url}
									alt="Honkai Star Rail"
									class="w-32"
								/>
								<p class="mt-2 text-xs font-medium text-white">{gameItem.title.kr}</p>
							</a>
						{/each}
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}

<style lang="scss">
	.bg-gradient {
		background: rgb(0, 0, 0);
		background: linear-gradient(90deg, rgba(0, 0, 0, 0.7497373949579832) 9%, rgba(0, 0, 0, 0) 78%);
	}
	.bg-gradient-m {
		background: rgb(0, 0, 0);
		background: linear-gradient(0deg, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0) 100%);
	}
</style>
