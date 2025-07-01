<script lang="ts">
	import { WindowService } from '../../../service/WindowService';
	const { title, infoText } = $props<{ title: string; infoText: string }>();

	let navActive = $state(false);
	const toggleNav = () => {
		console.log('toggleNav');

		navActive = !navActive;
		WindowService.closeModal();
	};
</script>

<header class="" class:active={navActive}>
	<div
		class="shadow-m fixed inset-y-0 left-0 z-50 flex h-16 w-screen flex-wrap items-center justify-between border-b border-gray-200 bg-white p-3"
	>
		<a href="/">
			<img
				class="h-10 w-10 rounded-full fill-current"
				src="/assets/logo/500.png"
				alt="Your Company"
			/>
		</a>
		<div class="flex">
			<button id="hamburger" onclick={toggleNav} aria-label="메뉴 열기">
				<i class="ri-menu-line h-10 w-10 text-2xl"></i>
			</button>
		</div>
	</div>
	<div
		class="toggle text-bold fixed inset-y-0 left-0 top-16 z-50 hidden h-full w-full bg-white text-right"
	>
		<div class="w-full px-2">
			<!-- 반복 area -->
			<div class=" flex w-full flex-col items-center border-t border-gray-300">
				<ul class="w-full space-y-2 font-medium">
					<li>
						<a
							href="main"
							onclick={() => {
								toggleNav();
							}}
							class="group flex items-center rounded-lg p-2 text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700"
						>
							<div
								class="h-5 w-5 text-center text-gray-500 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
							>
								<i class="ri-home-6-line text-xl leading-5"></i>
							</div>
							<span
								class="ms-3 text-sm font-medium text-gray-500 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
								>대시보드
							</span>
						</a>
					</li>

					<hr class="my-8 h-px border-0 bg-gray-100 dark:bg-gray-800" />

					<h3 class="ml-2 text-left text-sm font-medium text-gray-500">치과기공소</h3>
					<li>
						<a
							href="/lab/request"
							onclick={() => {
								toggleNav();
							}}
							class="group flex items-center rounded-lg p-2 text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700"
						>
							<div
								class="h-5 w-5 text-center text-gray-500 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
							>
								<i class="ri-file-add-line text-xl leading-5"></i>
							</div>
							<span
								class="ms-3 text-sm font-medium text-gray-500 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
								>의뢰서 등록
							</span>
						</a>
					</li>
					<hr class="my-8 h-px border-0 bg-gray-100 dark:bg-gray-800" />
					<li>
						<a
							href="requestlist"
							onclick={() => {
								toggleNav();
							}}
							class="group flex items-center rounded-lg p-2 text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700"
						>
							<div
								class="h-5 w-5 text-center text-gray-500 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
							>
								<i class="ri-folder-user-line text-xl leading-5"></i>
							</div>
							<span
								class="ms-3 text-sm font-medium text-gray-500 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
								>의뢰 목록
							</span>
						</a>
					</li>
					<li>
						<a
							href="requestlist"
							onclick={() => {
								toggleNav();
							}}
							class="group flex items-center rounded-lg p-2 text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700"
						>
							<div
								class="h-5 w-5 text-center text-gray-500 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
							>
								<i class="ri-compasses-2-line text-xl leading-5"></i>
							</div>
							<span
								class="ms-3 text-sm font-medium text-gray-500 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
								>커스텀 확인
							</span>
						</a>
					</li>

					<hr class="my-8 h-px border-0 bg-gray-100 dark:bg-gray-800" />

					<li>
						<a
							href="setting"
							onclick={() => {
								toggleNav();
							}}
							class="group flex items-center rounded-lg p-2 text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700"
						>
							<div
								class="h-5 w-5 text-center text-gray-500 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
							>
								<i class="ri-settings-2-line text-xl leading-5"></i>
							</div>
							<span
								class="ms-3 text-sm font-medium text-gray-500 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
								>설정
							</span>
						</a>
					</li>
				</ul>
			</div>
			<!-- 반복 area
			<div class="mt-2 flex w-full flex-col items-center border-t border-gray-300 pb-5">
				{#each tmp_MenuSet as item}
					<a
						data-sveltekit-preload-data="false"
						id="menu-item"
						class=" mt-2 flex h-12 w-full items-center rounded px-1 hover:bg-gray-300"
						href={item.href}
					>
						<img
							class="h-10 w-10 rounded-full fill-current"
							src={item.image}
							alt="HonkaiStarRail"
						/>
						<span
							class:active={navActive}
							class="ml-2 text-sm font-medium transition-all delay-300 duration-200 ease-in-out"
							>{item.title}</span
						>
					</a>
				{/each}
			</div> -->
		</div>
	</div>
</header>

<style lang="scss">
	header {
		&.active {
			.toggle {
				display: block;
				opacity: 1;
			}
		}
		.toggle {
			display: none;
			opacity: 0;
		}
	}
</style>
