<script lang="ts">
	import { WindowService } from '../../service/WindowService';
	import { userActions } from '../../service/user/UserStore';
	import { toastStore } from '../../service/ToastService';

	// 토스트 메시지 표시 함수
	const showToast = (type: 'success' | 'error' | 'info' | 'warning', message: string) => {
		toastStore[type](message);
	};

	// 삭제할 데이터를 전역에서 가져오기
	let deleteData = (window as any).deleteData;

	// 삭제 실행
	async function confirmDelete() {
		try {
			if (deleteData.type === 'user') {
				await userActions.deleteUser(deleteData.id);
				showToast('success', '사용자가 성공적으로 삭제되었습니다.');
			} else if (deleteData.type === 'role') {
				await userActions.deleteRole(deleteData.id);
				showToast('success', '역할이 성공적으로 삭제되었습니다.');
			}
			WindowService.closeModal();
		} catch (error) {
			console.error('삭제 오류:', error);
			showToast('error', '삭제 중 오류가 발생했습니다.');
		}
	}

	// 취소
	function cancelDelete() {
		WindowService.closeModal();
	}

	// 삭제할 항목의 이름 가져오기
	function getItemName() {
		return deleteData?.name || '항목';
	}

	// 삭제할 항목의 타입에 따른 메시지
	function getMessage() {
		if (deleteData?.type === 'user') {
			return `정말로 사용자 "${getItemName()}"을(를) 삭제하시겠습니까?`;
		} else if (deleteData?.type === 'role') {
			return `정말로 역할 "${getItemName()}"을(를) 삭제하시겠습니까?`;
		}
		return '정말로 이 항목을 삭제하시겠습니까?';
	}
</script>

<div class="space-y-4">
	<div class="text-center">
		<div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
			<i class="ri-delete-bin-line text-2xl text-red-600"></i>
		</div>
		<h3 class="mb-2 text-lg font-medium text-gray-900">삭제 확인</h3>
		<p class="text-sm text-gray-500">
			{getMessage()}
		</p>
		<p class="mt-2 text-xs text-red-500">이 작업은 되돌릴 수 없습니다.</p>
	</div>

	<div
		class="flex items-center justify-end space-x-3 rounded-b border-t border-gray-200 p-4 dark:border-gray-600 md:p-5 rtl:space-x-reverse"
	>
		<button
			class="rounded-md bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300"
			onclick={cancelDelete}
		>
			취소
		</button>
		<button
			class="rounded-md bg-red-500 px-4 py-2 text-white hover:bg-red-600"
			onclick={confirmDelete}
		>
			삭제
		</button>
	</div>
</div>
