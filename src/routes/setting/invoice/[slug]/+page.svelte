<script lang="ts">
	import InvoiceView from '../../../../app/view/invoice/InvoiceView.svelte';
	import { InvoicePageType } from '../../../../app/model/invoice/InvoicePageType';

	const { data } = $props<{ data: any }>();

	// URL 파라미터에 따라 InvoicePageType 및 청구서 종류 라벨 결정
	let pageType = $state<InvoicePageType>(InvoicePageType.CAP);
	// 청구서 종류를 상세 헤더에 표시하기 위한 라벨 (용어 통일: '청구서', 올온포)
	let typeLabel = $state('청구서');

	switch (data.param.item) {
		case 'custom':
			pageType = InvoicePageType.CUSTOM;
			typeLabel = '커스텀 청구서';
			break;
		case 'cap':
			pageType = InvoicePageType.CAP;
			typeLabel = '캡 청구서';
			break;
		case 'partial':
			pageType = InvoicePageType.PARTIAL;
			typeLabel = '파샬 청구서';
			break;
		case 'allonfour':
			pageType = InvoicePageType.ALLONFOUR;
			typeLabel = '올온포 청구서';
			break;
		default:
			pageType = InvoicePageType.CAP;
			typeLabel = '청구서';
			break;
	}
</script>

<InvoiceView {data} {pageType} {typeLabel} />
