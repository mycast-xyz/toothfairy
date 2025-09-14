<script lang="ts">
	import InvoiceView from '../../../../app/view/invoice/InvoiceView.svelte';
	import { InvoicePageType } from '../../../../app/model/invoice/InvoicePageType';

	const { data } = $props<{ data: any }>();

	console.log(data);
	console.log(data.param);

	// URL 파라미터에 따라 InvoicePageType 결정
	let pageType = $state<InvoicePageType>(InvoicePageType.CAP);
	let modalTitle = $state('');

	switch (data.param.item) {
		case 'custom':
			pageType = InvoicePageType.CUSTOM;
			modalTitle = '커스텀 견적서';
			break;
		case 'cap':
			pageType = InvoicePageType.CAP;
			modalTitle = '캡 견적서';
			break;
		case 'partial':
			pageType = InvoicePageType.PARTIAL;
			modalTitle = '파샬 견적서';
			break;
		case 'allonfour':
			pageType = InvoicePageType.ALLONFOUR;
			modalTitle = '올인원 견적서';
			break;
		default:
			pageType = InvoicePageType.CAP;
			modalTitle = '청구서';
			break;
	}
</script>

<InvoiceView {data} {pageType} />
