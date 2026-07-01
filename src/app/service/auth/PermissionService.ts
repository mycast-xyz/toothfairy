import type { UserRole } from '../../model/user/UserRole';
import { MENU_PERMISSIONS, hasPermission } from '../../model/user/UserRole';

/**
 * 권한 판정 서비스
 *
 * ⚠️ 권한의 단일 소스(Single Source of Truth)는 `MENU_PERMISSIONS`(UserRole.ts)다.
 * 페이지 접근 권한도 별도 표를 두지 않고 `MENU_PERMISSIONS`에서 파생한다.
 * (과거 `pagePermissions` 별도 표가 MENU_PERMISSIONS와 어긋나
 *  "메뉴엔 보이는데 진입 시 차단"되는 버그가 있어 표를 단일화함.)
 */
export class PermissionService {
	/** 모든 역할이 접근 가능한 공통 경로 (대시보드/캘린더 등) */
	private static readonly ALWAYS_ALLOWED = ['/', '/main', '/calender'];

	// 권한 확인 함수
	static hasPermission(userRole: UserRole, requiredRoles: UserRole[]): boolean {
		return hasPermission(userRole, requiredRoles);
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

	/**
	 * 페이지 접근 권한 확인 — MENU_PERMISSIONS 기반.
	 *
	 * 판정 순서:
	 * 1) all_admin 은 전 페이지 허용.
	 * 2) 공통 허용 경로(ALWAYS_ALLOWED) 허용.
	 * 3) MENU_PERMISSIONS 에서 정확/하위경로 일치 항목(가장 구체적인 것)의 roles 로 판정.
	 * 4) 메뉴 미등록 경로(상세페이지 등)는 같은 영역(첫 경로 세그먼트) 메뉴들의 roles 합집합으로 판정.
	 *    예) /center/show/[slug] → '/center' 영역 → {all_center, all_admin}
	 * 5) 그 외 알 수 없는 경로는 보수적으로 차단.
	 */
	static canAccessPage(userRole: UserRole, pagePath: string): boolean {
		if (!userRole) return false;
		// 1) 전체 관리자는 무조건 허용
		if (userRole === 'all_admin') return true;
		// 2) 공통 허용 경로
		if (this.ALWAYS_ALLOWED.includes(pagePath)) return true;

		// 3) 정확/하위경로 일치 — 가장 긴(구체적인) path 우선
		const matched = MENU_PERMISSIONS.filter(
			(m) => pagePath === m.path || pagePath.startsWith(m.path + '/')
		).sort((a, b) => b.path.length - a.path.length);
		if (matched.length > 0) {
			return matched[0].roles.includes(userRole);
		}

		// 4) 메뉴 미등록 경로 → 영역(첫 세그먼트) 단위 roles 합집합으로 판정
		const area = '/' + (pagePath.split('/')[1] || '');
		const areaRoles = new Set<UserRole>();
		for (const m of MENU_PERMISSIONS) {
			if (m.path === area || m.path.startsWith(area + '/')) {
				m.roles.forEach((r) => areaRoles.add(r));
			}
		}
		if (areaRoles.size > 0) return areaRoles.has(userRole);

		// 5) 알 수 없는 경로는 차단
		return false;
	}

	// 사용자 권한 레벨 확인
	static getPermissionLevel(userRole: UserRole): number {
		const permissionLevels: Record<UserRole, number> = {
			user: 100,
			all_cam: 200,
			all_center: 300,
			all_lab: 400,
			admin: 450,
			all_admin: 500
		};

		return permissionLevels[userRole] || 1;
	}

	// 권한 레벨 비교
	static hasMinimumPermission(userRole: UserRole, minimumLevel: number): boolean {
		return this.getPermissionLevel(userRole) >= minimumLevel;
	}
}
