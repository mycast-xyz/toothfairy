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
		// all_admin은 모든 페이지에 접근 가능하도록 처리
		const pagePermissions: Record<string, UserRole[]> = {
			'/': ['all_admin', 'all_lab', 'all_center', 'all_cam', 'user'], // 메인 페이지는 모든 사용자 접근 가능
			'/admin': ['all_admin'],
			'/lab/request': ['all_admin'],
			'/lab/requestlist': ['all_lab'],
			'/center/print': ['all_center', 'all_cam'],
			'/cam/print': ['all_admin', 'all_cam'], // CAM Print 페이지 권한 추가
			'/center/invoice': ['all_admin'],
			'/center/company': ['all_admin'],
			'/settings': ['all_admin']
		};

		// all_admin이면 무조건 true 반환
		if (userRole === 'all_admin') {
			return true;
		}

		const requiredRoles = pagePermissions[pagePath] || [];
		return this.hasPermission(userRole, requiredRoles);
	}

	// 사용자 권한 레벨 확인
	static getPermissionLevel(userRole: UserRole): number {
		const permissionLevels: Record<UserRole, number> = {
			user: 100,
			all_cam: 200,
			all_center: 300,
			all_lab: 400,
			all_admin: 500
		};

		return permissionLevels[userRole] || 1;
	}

	// 권한 레벨 비교
	static hasMinimumPermission(userRole: UserRole, minimumLevel: number): boolean {
		return this.getPermissionLevel(userRole) >= minimumLevel;
	}
}
