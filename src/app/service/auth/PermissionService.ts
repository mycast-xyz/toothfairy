import type { UserRole } from '../../model/user/UserRole';

export class PermissionService {
	// 권한 확인 함수
	static hasPermission(userRole: UserRole, requiredRoles: UserRole[]): boolean {
		return requiredRoles.includes(userRole);
	}

	// 특정 기능에 대한 권한 확인
	static canAccessFeature(userRole: UserRole, feature: string): boolean {
		const featurePermissions: Record<string, UserRole[]> = {
			'user-management': ['all_admin'],
			'request-management': ['all_admin', 'all_lab'],
			'invoice-management': ['all_admin', 'all_center'],
			'print-management': ['all_admin', 'all_center', 'all_cam'],
			settings: ['all_admin']
		};

		const requiredRoles = featurePermissions[feature] || [];
		return this.hasPermission(userRole, requiredRoles);
	}

	// 페이지 접근 권한 확인
	static canAccessPage(userRole: UserRole, pagePath: string): boolean {
		const pagePermissions: Record<string, UserRole[]> = {
			'/': ['all_admin', 'all_lab', 'all_center', 'all_cam', 'user'], // 메인 페이지는 모든 사용자 접근 가능
			'/admin': ['all_admin'],
			'/lab/request': ['all_admin'],
			'/lab/requestlist': ['all_lab'],
			'/center/print': ['all_center', 'all_cam'],
			'/center/invoice': ['all_admin'],
			'/center/company': ['all_admin'],
			'/settings': ['all_admin']
		};

		const requiredRoles = pagePermissions[pagePath] || [];
		return this.hasPermission(userRole, requiredRoles);
	}

	// 사용자 권한 레벨 확인
	static getPermissionLevel(userRole: UserRole): number {
		const permissionLevels: Record<UserRole, number> = {
			user: 10,
			all_cam: 20,
			all_center: 30,
			all_lab: 40,
			all_admin: 50
		};

		return permissionLevels[userRole] || 1;
	}

	// 권한 레벨 비교
	static hasMinimumPermission(userRole: UserRole, minimumLevel: number): boolean {
		return this.getPermissionLevel(userRole) >= minimumLevel;
	}
}
