<script lang="ts">
	import CapInvoice from '../../../../app/view/invoice/CapInvoice.svelte';
	import CustomInvoice from '../../../../app/view/invoice/CustomInvoice.svelte';
	import PartialInvoice from '../../../../app/view/invoice/PartialInvoice.svelte';

	const { data } = $props<{ data: any }>();

	let ModalComponent = $state();
	let ModalTitle = $state('');

	console.log(data.param);

	switch (data.param.item) {
		case 'custom':
			ModalComponent = CustomInvoice;
			ModalTitle = '커스텀 견적서';
			break;
		case 'cap':
			ModalComponent = CapInvoice;
			ModalTitle = '캡 견적서';
			break;
		case 'partial':
			ModalComponent = PartialInvoice;
			ModalTitle = '파샬 견적서';
			break;
		default:
			ModalTitle = '';
			break;
	}
</script>

{#if ModalComponent}
	<svelte:component this={ModalComponent} {data} />
{/if}
