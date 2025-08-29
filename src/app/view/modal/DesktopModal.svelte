<script lang="ts">
	import { WindowService, ModalView } from '../../service/WindowService';
	import DesktopModal from '../../view-framework/modal/DesktopModal.svelte';

	import AddUserRole from '../userrole/AddUserRole.svelte';
	import EditUserRole from '../userrole/EditUserRole.svelte';
	import DeleteConfirmModal from '../userrole/DeleteConfirmModal.svelte';
	import EditUserRoleModal from '../userrole/EditUserRoleModal.svelte';
	import BackupResetModal from '../cam/BackupResetModal.svelte';
	import NewPriceModal from '../price/NewPriceModal.svelte';
	import BulkAddModal from '../price/BulkAddModal.svelte';
	import EditPriceModal from '../price/EditPriceModal.svelte';
	// props에서 데이터 가져오기
	//const { data } = $props<{ data: any }>();

	let ModalComponent = $state();
	let ModalTitle = $state('');
	let ModalSize = $state('');
	let ModalData = $state<any>(null);

	// WindowService.modal 구독
	WindowService.modal.subscribe((modalType) => {
		if (modalType) {
			switch (modalType) {
				case 'userrole-add':
					ModalComponent = AddUserRole;
					ModalTitle = '새 역할 추가';
					ModalSize = 'default';
					break;
				case 'userrole-edit':
					ModalComponent = EditUserRole;
					ModalTitle = '역할 수정';
					ModalSize = 'default';
					break;
				case 'delete-confirm':
					ModalComponent = DeleteConfirmModal;
					ModalTitle = '삭제 확인';
					ModalSize = 'small';
					break;
				case 'edit-user-role':
					ModalComponent = EditUserRoleModal;
					ModalTitle = '사용자 권한 수정';
					ModalSize = 'default';
					break;
				case 'backup-reset':
					ModalComponent = BackupResetModal;
					ModalTitle = '백업 초기화';
					ModalSize = 'default';
					break;
				case 'new-price':
					ModalComponent = NewPriceModal;
					ModalTitle = '새 가격 추가';
					ModalSize = 'default';
					break;
				case 'bulk-add':
					ModalComponent = BulkAddModal;
					ModalTitle = '일괄 가격 추가';
					ModalSize = 'large';
					break;
				case 'edit-price':
					ModalComponent = EditPriceModal;
					ModalTitle = '가격 정보 수정';
					ModalSize = 'default';
					break;
				default:
					ModalTitle = '';
					break;
			}
		} else {
			// 모달이 닫힐 때 컴포넌트 초기화
			ModalComponent = null;
			ModalTitle = '';
			ModalSize = '';
			ModalData = null;
		}
	});

	// WindowService.modalData 구독
	WindowService.modalData.subscribe((data) => {
		ModalData = data;
	});

	$effect(() => {
		console.log('모달 상태:', $ModalView);
	});

	$effect(() => {
		if ($ModalView) {
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = 'auto';
		}
	});
</script>

{#if $ModalView}
	<DesktopModal title={ModalTitle} size={ModalSize} body={ModalComponent}></DesktopModal>
{/if}
