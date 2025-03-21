<script lang="ts">
	import { AdminSideMenuService } from '../app/service/menu/SiderMenuService';

	// 사이드바 토글 상태
	let isSidebarCollapsed = $state(AdminSideMenuService.SidebarCollapsed);

	// 사이드바 토글 함수
	function toggleSidebar() {
		AdminSideMenuService.toggleSidebar();
	}

	// 사이드바 너비 상태 감시
	let sidebarWidth = $derived($isSidebarCollapsed.collapsed ? 'w-64' : 'w-20');
</script>

<style lang="scss">
</style>
