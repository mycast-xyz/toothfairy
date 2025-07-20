<script lang="ts">
	import { WindowService } from '../../service/WindowService';
	import { userActions } from '../../service/user/UserStore';
	import { toastStore } from '../../service/ToastService';

	// 토스트 메시지 표시 함수
	const showToast = (type: 'success' | 'error' | 'info' | 'warning', message: string) => {
		toastStore[type](message);
	};

	let newRole = $state({
		name: '',
		description: ''
	});

	// 역할 저장
	async function saveRole() {
		if (!newRole.name.trim()) {
			showToast('error', '역할 이름을 입력해주세요.');
			return;
		}

		try {
			await userActions.createRole({
				name: newRole.name.trim(),
				description: newRole.description.trim() || undefined
			});

			showToast('success', '역할이 성공적으로 생성되었습니다.');
			WindowService.closeModal();
		} catch (error) {
			console.error('역할 생성 오류:', error);
			showToast('error', '역할 생성 중 오류가 발생했습니다.');
		}
	}
</script>

<div class="space-y-4">
	<div>
		<label class="block text-sm font-medium text-gray-700" for="name">역할 이름 *</label>
		<input
			type="text"
			bind:value={newRole.name}
			class="mt-1 w-full rounded-md border p-2"
			placeholder="역할 이름을 입력하세요"
		/>
	</div>
	<div>
		<label class="block text-sm font-medium text-gray-700" for="description">설명</label>
		<textarea
			bind:value={newRole.description}
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
		<button class="rounded-md bg-violet-500 px-4 py-2 text-white" onclick={saveRole}> 저장 </button>
	</div>
</div>
