<script lang="ts">
	import { WindowService, ModalView } from '../../service/WindowService';
	import MobileLayer from '../../view-framework/modal/MobileModal.svelte';
	import MobileFilter from './filter/MobileFilter.svelte';

	// props에서 데이터 가져오기
	const { data } = $props<{ data: any }>();

	let ModalComponent = $state();
	let ModalTitle = $state('');

	WindowService.modal.subscribe((m) => {
		switch (m) {
			case 'mobile-filter':
				ModalComponent = MobileFilter;
				ModalTitle = '필터';
				break;
			default:
				ModalTitle = '';
				break;
		}
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
	<MobileLayer
		title={ModalTitle}
		onresetclick={() => {
			console.log('aa');
		}}
	>
		<div slot="body">
			<ModalComponent {data} />
		</div>
	</MobileLayer>
{/if}
