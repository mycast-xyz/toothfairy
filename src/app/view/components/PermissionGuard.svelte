<script lang="ts">
	import { PermissionService } from '../../service/auth/PermissionService';
	import type { UserRole } from '../../model/user/UserRole';

	interface Props {
		userRole: UserRole;
		requiredRoles: UserRole[];
		children: any;
		fallback?: any;
	}

	const { userRole, requiredRoles, children, fallback = null } = $props();

	// 권한 확인
	const hasPermission = PermissionService.hasPermission(userRole, requiredRoles);
</script>

{#if hasPermission}
	{@render children()}
{:else if fallback}
	{@render fallback()}
{/if}
