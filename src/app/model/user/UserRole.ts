// 사용자 권한 타입 정의
export type UserRole = 'all_admin' | 'all_lab' | 'all_center' | 'all_cam' | 'user';

// 사용자 정보 인터페이스
export interface User {
	id: string;
	uuid?: string;
	name?: string;
	role: UserRole;
	email?: string;
}

// 권한별 메뉴 접근 권한 정의
export interface MenuPermission {
	path: string;
	label: string;
	icon: string;
	roles: UserRole[];
	section?: string;
}

// 메뉴 권한 설정
export const MENU_PERMISSIONS: MenuPermission[] = [
	// 대시보드 - 모든 사용자 접근 가능
	{
		path: 'main',
		label: '대시보드',
		icon: 'ri-home-6-line',
		roles: ['all_admin', 'all_lab', 'all_center', 'all_cam', 'user']
	},
	{
		path: 'main',
		label: '캘린더',
		icon: 'ri-calendar-line',
		roles: ['all_admin', 'all_lab', 'all_center', 'all_cam', 'user']
	},

	// 치과기공소 섹션
	{
		path: '/lab/request',
		label: '의뢰서 등록',
		icon: 'ri-file-add-line',
		roles: ['all_lab', 'all_admin'],
		section: '치과기공소'
	},
	{
		path: '/lab/requestlist',
		label: '의뢰 목록',
		icon: 'ri-folder-user-line',
		roles: ['all_lab', 'all_admin'],
		section: '치과기공소'
	},
	{
		path: '/lab/delivery',
		label: '배송 목록',
		icon: 'ri-truck-line',
		roles: ['all_lab', 'all_admin'],
		section: '치과기공소'
	},

	// 캠관리 섹션
	{
		path: '/cam/print',
		label: '출력물 관리',
		icon: 'ri-folder-5-line',
		roles: ['all_cam', 'all_admin'],
		section: '캠관리'
	},

	// 기공센터 섹션
	{
		path: '/center/print',
		label: '출력물 관리',
		icon: 'ri-fingerprint-line',
		roles: ['all_center', 'all_admin'],
		section: '기공센터'
	},

	// 관리 - 관리자만 접근 가능
	{
		path: '/setting/user',
		label: '사용자 관리',
		icon: 'ri-id-card-line',
		roles: ['all_admin'],
		section: '기공소 관리'
	},
	{
		path: '/setting/userrole',
		label: '사용자 권한 관리',
		icon: 'ri-user-settings-line',
		roles: ['all_admin'],
		section: '기공소 관리'
	},
	{
		path: '/setting/invoice',
		label: '청구서 관리',
		icon: 'ri-file-list-3-line',
		roles: ['all_admin'],
		section: '기공소 관리'
	},
	{
		path: '/setting/company',
		label: '거래처 관리',
		icon: 'ri-building-line',
		roles: ['all_admin'],
		section: '기공소 관리'
	},

	// 관리 - 관리자만 접근 가능
	{
		path: '/setting/user',
		label: '매출 통계',
		icon: 'ri-id-card-line',
		roles: ['all_admin'],
		section: '통계'
	},
	{
		path: '/setting/userrole',
		label: '재료 통계',
		icon: 'ri-user-settings-line',
		roles: ['all_admin'],
		section: '통계'
	},

	// 설정 - 관리자만 접근 가능
	{
		path: '/setting/site',
		label: '사이트 관리',
		icon: 'ri-settings-2-line',
		roles: ['all_admin'],
		section: '설정'
	}
];

// 사용자 권한 확인 함수
export function hasPermission(userRole: UserRole, requiredRoles: UserRole[]): boolean {
	if (!userRole || !requiredRoles || requiredRoles.length === 0) {
		return false;
	}
	return requiredRoles.includes(userRole);
}

// 사용자별 메뉴 필터링 함수
export function getFilteredMenus(userRole: UserRole): MenuPermission[] {
	if (!userRole) {
		// 기본 메뉴만 반환 (대시보드)
		return MENU_PERMISSIONS.filter((menu) => menu.roles.includes('user'));
	}
	return MENU_PERMISSIONS.filter((menu) => hasPermission(userRole, menu.roles));
}

// 섹션별 메뉴 그룹화 함수
export function groupMenusBySection(menus: MenuPermission[]): Record<string, MenuPermission[]> {
	const grouped: Record<string, MenuPermission[]> = {};

	menus.forEach((menu) => {
		const section = menu.section || '기타';
		if (!grouped[section]) {
			grouped[section] = [];
		}
		grouped[section].push(menu);
	});

	return grouped;
}
