<script lang="ts">
	import { WindowService } from '../../service/WindowService';
	import { userActions } from '../../service/user/UserStore';
	import { toastStore } from '../../service/ToastService';

	// 토스트 메시지 표시 함수
	const showToast = (type: 'success' | 'error' | 'info' | 'warning', message: string) => {
		toastStore[type](message);
	};

	// 편집할 역할 데이터를 전역에서 가져오기
	let roleData = (window as any).roleData;

	let editRole = $state({
		name: roleData?.name || '',
		description: roleData?.description || ''
	});

	// 역할 업데이트
	async function updateRole() {
		if (!editRole.name.trim()) {
			showToast('error', '역할 이름을 입력해주세요.');
			return;
		}

		try {
			await userActions.updateRole(roleData.id, {
				name: editRole.name.trim(),
				description: editRole.description.trim() || undefined
			});

			showToast('success', '역할이 성공적으로 수정되었습니다.');
			WindowService.closeModal();
		} catch (error) {
			console.error('역할 수정 오류:', error);
			showToast('error', '역할 수정 중 오류가 발생했습니다.');
		}
	}
</script>

<div class="space-y-4">
	<div>
		<label class="block text-sm font-medium text-gray-700" for="name">역할 이름 *</label>
		<input
			type="text"
			bind:value={editRole.name}
			class="mt-1 w-full rounded-md border p-2"
			placeholder="역할 이름을 입력하세요"
		/>
	</div>
	<div>
		<label class="block text-sm font-medium text-gray-700" for="description">설명</label>
		<textarea
			bind:value={editRole.description}
			class="mt-1 w-full rounded-md border p-2"
			rows="3"
			placeholder="역할에 대한 설명을 입력하세요"
		></textarea>
	</div>
	<div
		class="flex items-center space-x-3 rounded-b border-t border-gray-200 p-4 dark:border-gray-600 md:p-5 rtl:space-x-reverse"
	>
		<button class="rounded-md bg-gray-200 px-4 py-2" onclick={() => WindowService.closeModal()}>
			취소
		</button>
		<button class="rounded-md bg-violet-500 px-4 py-2 text-white" onclick={updateRole}>
			저장
		</button>
	</div>
</div>
