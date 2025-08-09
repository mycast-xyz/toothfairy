<script lang="ts">
	import { WindowService, ModalView } from '../../service/WindowService';
	import DesktopModal from '../../view-framework/modal/DesktopModal.svelte';
	import AddCompany from '../company/AddCompany.svelte';
	import EditCompany from '../company/EditCompany.svelte';
	import AddUserRole from '../userrole/AddUserRole.svelte';
	import EditUserRole from '../userrole/EditUserRole.svelte';
	import DeleteConfirmModal from '../userrole/DeleteConfirmModal.svelte';
	import EditUserRoleModal from '../userrole/EditUserRoleModal.svelte';
	import BackupResetModal from '../cam/BackupResetModal.svelte';
	// props에서 데이터 가져오기
	//const { data } = $props<{ data: any }>();

	let ModalComponent = $state();
	let ModalTitle = $state('');
	let ModalSize = $state('');

	WindowService.modal.subscribe((m) => {
		switch (m) {
			case 'company-add':
				ModalComponent = AddCompany;
				ModalTitle = '센터 거래처 추가';
				ModalSize = 'large';
				break;
			case 'company-edit':
				ModalComponent = EditCompany;
				ModalTitle = '센터 거래처 수정';
				ModalSize = 'large';
				break;
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
			default:
				ModalTitle = '';
				break;
		}
	});

	// svelte-ignore state_referenced_locally

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
