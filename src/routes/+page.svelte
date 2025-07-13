<script lang="ts">
	import { AdminSideMenuService } from '../app/service/menu/SiderMenuService';
	import { onMount } from 'svelte';

	// props로 데이터 받기
	const { data } = $props<{ data: any }>();

	// 사이드바 토글 상태
	let isSidebarCollapsed = $state(AdminSideMenuService.SidebarCollapsed);

	// 사이드바 토글 함수
	function toggleSidebar() {
		AdminSideMenuService.toggleSidebar();
	}

	// 사이드바 너비 상태 감시
	let sidebarWidth = $derived($isSidebarCollapsed.collapsed ? 'w-64' : 'w-20');

	onMount(() => {
		// role이 'user'로 설정되는 경우 경고
		if (data?.user?.role === 'user') {
			console.warn('메인 페이지 마운트: role이 "user"로 설정되었습니다!');
		}
	});
</script>

<style lang="scss">
</style>
