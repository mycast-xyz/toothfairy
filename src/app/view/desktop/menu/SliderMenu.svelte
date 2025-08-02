<script lang="ts">
	import { page } from '$app/stores';
	import {
		getFilteredMenus,
		groupMenusBySection,
		type UserRole
	} from '../../../model/user/UserRole';

	// props로 데이터 받기
	const { data } = $props<{ data: any }>();

	// 사용자 권한에 따른 메뉴 필터링
	const userRole: UserRole = data?.user?.role || 'user';
	const filteredMenus = getFilteredMenus(userRole);
	const groupedMenus = groupMenusBySection(filteredMenus);

	/*
	import { AdminSideMenuService } from '../../service/AdminSiedMenuService';

	// 사이드바 토글 상태
	let isSidebarCollapsed = $state(AdminSideMenuService.SidebarCollapsed);

	// 사이드바 토글 함수
	function toggleSidebar() {
		AdminSideMenuService.toggleSidebar();
	}

	// 사이드바 너비 상태 감시
	let sidebarWidth = $derived($isSidebarCollapsed.collapsed ? 'w-64' : 'w-20');
*/
</script>

<aside
	id="logo-sidebar"
	class="fixed left-0 top-0 z-20 h-screen w-64 -translate-x-full pt-20 transition-transform sm:translate-x-0"
	aria-label="Sidebar"
>
	<div class="h-full overflow-y-auto px-3 pl-4 pb-4">
		{#if Object.keys(groupedMenus).length > 0}
			<ul class="space-y-2 font-medium">
				{#each Object.entries(groupedMenus) as [section, menus]}
					{#if section !== '기타'}
						<hr class="my-8 h-px border-0 bg-gray-100 dark:bg-gray-800" />
						<h3 class="ml-2 text-sm font-medium text-gray-500">{section}</h3>
					{/if}

					{#each menus as menu}
						{@const isActive = $page.url.pathname === menu.path}
						<li>
							<a
								href={menu.path}
								class="group flex items-center rounded-lg p-2 transition-all duration-200 {isActive 
									? 'text-violet-700' 
									: 'text-gray-900 hover:bg-gray-100'}"
							>
								<div
									class="h-5 w-5 text-center transition duration-75 {isActive 
										? 'text-violet-600' 
										: 'text-gray-500 group-hover:text-gray-900'}"
								>
									<i class="{menu.icon} text-xl leading-5"></i>
								</div>
								<span
									class="ms-3 text-sm font-medium transition duration-75 {isActive 
										? 'text-violet-700 font-semibold' 
										: 'text-gray-500 group-hover:text-gray-900'}"
									>{menu.label}
								</span>
							</a>
						</li>
					{/each}
				{/each}
			</ul>
		{:else}
			<div class="p-4 text-center text-gray-500">
				<p>메뉴를 불러오는 중...</p>
			</div>
		{/if}
	</div>
</aside>

<style lang="scss">
</style>
