<script lang="ts">
	import { WindowService } from '../../service/WindowService';
	import { userActions, userStore } from '../../service/user/UserStore';
	import { toastStore } from '../../service/ToastService';

	// 토스트 메시지 표시 함수
	const showToast = (type: 'success' | 'error' | 'info' | 'warning', message: string) => {
		toastStore[type](message);
	};

	// 편집할 사용자 데이터를 전역에서 가져오기
	let userData = (window as any).userData;

	let selectedRoleId = $state(userData?.roleId || '');
	let isPermitted = $state(userData?.isPermitted || false);

	// 사용자 권한 업데이트
	async function updateUserRole() {
		if (!selectedRoleId) {
			showToast('error', '역할을 선택해주세요.');
			return;
		}

		try {
			// 사용자 역할 및 승인 상태 업데이트
			await userActions.updateUserRole(userData.id, {
				roleId: parseInt(selectedRoleId),
				isPermitted: isPermitted
			});

			showToast('success', '사용자 권한이 성공적으로 수정되었습니다.');
			WindowService.closeModal();
		} catch (error) {
			console.error('사용자 권한 수정 오류:', error);
			showToast('error', '사용자 권한 수정 중 오류가 발생했습니다.');
		}
	}

	// 취소
	function cancelEdit() {
		WindowService.closeModal();
	}

	// 사용자 이름 가져오기
	function getUserName() {
		return userData?.name || '사용자';
	}

	// 현재 역할 이름 가져오기
	function getCurrentRoleName() {
		return userData?.role?.name || '역할 없음';
	}
</script>

<div class="space-y-4">
	<div>
		<h3 class="mb-4 text-lg font-medium text-gray-900">사용자 권한 수정</h3>

		<!-- 사용자 정보 표시 -->
		<div class="mb-4 rounded-lg bg-gray-50 p-3">
			<div class="grid grid-cols-2 gap-4 text-sm">
				<div>
					<span class="font-medium text-gray-700">사용자:</span>
					<span class="ml-2 text-gray-900">{getUserName()}</span>
				</div>
				<div>
					<span class="font-medium text-gray-700">이메일:</span>
					<span class="ml-2 text-gray-900">{userData?.email || ''}</span>
				</div>
				<div>
					<span class="font-medium text-gray-700">현재 역할:</span>
					<span class="ml-2 text-gray-900">{getCurrentRoleName()}</span>
				</div>
				<div>
					<span class="font-medium text-gray-700">승인 상태:</span>
					<span class="ml-2 text-gray-900">
						{#if userData?.isPermitted}
							<span
								class="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800"
							>
								승인됨
							</span>
						{:else}
							<span
								class="inline-flex items-center rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800"
							>
								대기중
							</span>
						{/if}
					</span>
				</div>
			</div>
		</div>

		<!-- 역할 선택 -->
		<div>
			<label class="mb-2 block text-sm font-medium text-gray-700">새로운 역할 선택 *</label>
			<select
				bind:value={selectedRoleId}
				class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
			>
				<option value="">역할을 선택하세요</option>
				{#each $userStore.roles as role}
					<option value={role.id} selected={role.id === userData?.roleId}>
						{role.name}
					</option>
				{/each}
			</select>
		</div>
	</div>

	<div
		class="flex items-center justify-end space-x-3 rounded-b border-t border-gray-200 p-4 dark:border-gray-600 md:p-5 rtl:space-x-reverse"
	>
		<button
			class="rounded-md bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300"
			onclick={cancelEdit}
		>
			취소
		</button>
		<button
			class="rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
			onclick={updateUserRole}
		>
			저장
		</button>
	</div>
</div>
