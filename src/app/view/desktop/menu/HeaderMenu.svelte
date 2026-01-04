<script lang="ts">
	import { writable } from 'svelte/store';
	import { authTokenService } from '../../../service/auth/AuthTokenService';
	import { authService } from '../../../service/auth/AuthService';
	import { jwtDecode } from 'jwt-decode';
	import { onMount } from 'svelte';

	const { title, infoText } = $props<{ title: string; infoText: string }>();

	let isProfileMenuOpen = $state(false);
	let userName = $state('User');
	let userEmail = $state('user@example.com');

	onMount(async () => {
		let token = authTokenService.getToken();

		// 토큰이 없으면 API를 통해 가져오기 시도 (HttpOnly 쿠키 사용 시)
		if (!token) {
			token = await authService.getJwtToken();
			if (token) {
				authTokenService.setToken(token);
			}
		}

		if (token) {
			try {
				const decoded: any = jwtDecode(token);
				if (decoded) {
					userName = decoded.name || decoded.sub || 'User';
					userEmail = decoded.email || decoded.sub || 'user@example.com';
				}
			} catch (e) {
				console.error('Available to decode token', e);
			}
		}
	});

	function toggleProfileMenu() {
		isProfileMenuOpen = !isProfileMenuOpen;
	}
</script>

<!-- 상단 사용자 프로필 -->
<nav class="fixed top-0 z-30 w-full border-b border-gray-200 bg-white">
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
						>ANDIUM</span
					>
				</a>
			</div>
			<div class="flex items-center">
				<!-- 알림 아이콘들 -->
				<div class="mr-4 flex items-center space-x-4">
					<!-- 이메일 알림 -->
					<button
						type="button"
						class="relative rounded-lg p-2 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
					>
						<i class="ri-mail-line text-xl"></i>
						<span
							class="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-purple-500 text-xs text-white"
						>
							2
						</span>
					</button>

					<!-- 벨 알림 -->
					<button
						type="button"
						class="relative rounded-lg p-2 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
					>
						<i class="ri-notification-3-line text-xl"></i>
						<span
							class="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-purple-500 text-xs text-white"
						>
							2
						</span>
					</button>
				</div>

				<div class="relative ms-3 flex items-center">
					<div>
						<button
							type="button"
							class="flex rounded-full bg-gray-800 text-sm focus:ring-4 focus:ring-gray-300 dark:focus:ring-gray-600"
							aria-expanded={isProfileMenuOpen}
							onclick={toggleProfileMenu}
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
						class="absolute right-0 top-8 z-50 my-4 list-none divide-y divide-gray-100 rounded bg-white text-base shadow dark:divide-gray-600 dark:bg-gray-700 {isProfileMenuOpen
							? 'block'
							: 'hidden'}"
						id="dropdown-user"
					>
						<div class="px-4 py-3" role="none">
							<p class="text-sm text-gray-900 dark:text-white" role="none">{userName}</p>
							<p class="truncate text-sm font-medium text-gray-900 dark:text-gray-300" role="none">
								{userEmail}
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
