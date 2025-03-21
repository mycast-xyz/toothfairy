<script lang="ts">
	import { writable } from 'svelte/store';
	const { title, infoText } = $props<{ title: string; infoText: string }>();
</script>

<!-- 상단 사용자 프로필 -->
<nav class="fixed top-0 z-50 w-full border-b border-gray-200 bg-white">
	<div class="px-3 py-3 lg:px-5 lg:pl-3">
		<div class="flex items-center justify-between">
			<div class="flex items-center justify-start rtl:justify-end">
				<button
					data-drawer-target="logo-sidebar"
					data-drawer-toggle="logo-sidebar"
					aria-controls="logo-sidebar"
					type="button"
					class="inline-flex items-center rounded-lg p-2 text-sm text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 sm:hidden"
				>
					<span class="sr-only">Open sidebar</span>
					<i class="ri-menu-2-fill"></i>
				</button>
				<a href="/main" class="  ms-2 flex h-8 w-8 md:me-24">
					<img
						src="/assets/logo/500.png"
						alt="Background"
						class="h-full w-full rounded-full object-cover object-center"
					/>
					<span
						class="ml-2 self-center whitespace-nowrap text-xl font-semibold dark:text-white sm:text-2xl"
						>ToothFairy</span
					>
				</a>
			</div>
			<div class="flex items-center">
				<div class="ms-3 flex items-center">
					<div>
						<button
							type="button"
							class="flex rounded-full bg-gray-800 text-sm focus:ring-4 focus:ring-gray-300 dark:focus:ring-gray-600"
							aria-expanded="false"
							data-dropdown-toggle="dropdown-user"
						>
							<span class="sr-only">Open user menu</span>
							<img
								class="h-8 w-8 rounded-full"
								src="https://flowbite.com/docs/images/people/profile-picture-5.jpg"
								alt="user photo"
							/>
						</button>
					</div>
					<div
						class="z-50 my-4 hidden list-none divide-y divide-gray-100 rounded bg-white text-base shadow dark:divide-gray-600 dark:bg-gray-700"
						id="dropdown-user"
					>
						<div class="px-4 py-3" role="none">
							<p class="text-sm text-gray-900 dark:text-white" role="none">Neil Sims</p>
							<p class="truncate text-sm font-medium text-gray-900 dark:text-gray-300" role="none">
								neil.sims@flowbite.com
							</p>
						</div>
						<ul class="py-1" role="none">
							<li>
								<a
									href="#"
									class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-600 dark:hover:text-white"
									role="menuitem">Dashboard</a
								>
							</li>
							<li>
								<a
									href="#"
									class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-600 dark:hover:text-white"
									role="menuitem">Settings</a
								>
							</li>
							<li>
								<a
									href="#"
									class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-600 dark:hover:text-white"
									role="menuitem">Earnings</a
								>
							</li>
							<li>
								<a
									href="#"
									class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-600 dark:hover:text-white"
									role="menuitem">Sign out</a
								>
							</li>
						</ul>
					</div>
				</div>
			</div>
		</div>
	</div>
</nav>
