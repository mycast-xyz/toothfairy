import { writable } from 'svelte/store';

export class AdminSideMenuServiceInit {
	private _isSidebarCollapsed = writable({
		icon: 'ri-checkbox-circle-line',
		collapsed: true,
		hover: false
	});

	get SidebarCollapsed() {
		return this._isSidebarCollapsed;
	}

	// 사이드바 토글 함수
	toggleSidebar() {
		this._isSidebarCollapsed.update((state) => {
			const newCollapsed = !state.collapsed;
			return {
				...state,
				collapsed: newCollapsed,
				icon: newCollapsed ? 'ri-checkbox-circle-line' : 'ri-checkbox-blank-circle-line'
			};
		});
	}

	hoverSidebar() {
		this._isSidebarCollapsed.update((state) => {
			const newCollapsed = !state.hover;
			return { ...state, hover: newCollapsed };
		});
	}
}

export const AdminSideMenuService = new AdminSideMenuServiceInit();
