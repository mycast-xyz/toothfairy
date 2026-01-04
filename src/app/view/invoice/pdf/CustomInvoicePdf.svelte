<script lang="ts">
	import {
		InvoiceCommonService,
		SUPPLIER_INFO
	} from '../../../service/invoice/InvoiceCommonService';

	// ===== PROPS =====
	interface Props {
		data: any;
		invoiceMoney?: number;
		deliveryInvoice?: number;
	}

	const { data, invoiceMoney = 0, deliveryInvoice = 0 }: Props = $props();

	// ===== SERVICE INITIALIZATION =====
	const invoiceService = new InvoiceCommonService(data);
	invoiceService.initialize('cap');

	// ===== GETTERS =====
	const corpInfo = invoiceService.getCorpInfo();
	const dateInfo = invoiceService.getDateInfo();
	const calendarData = invoiceService.getCalendarData();
	const [year, month] = (data.param?.date || '2024-01').split('-').map(Number);

	// ===== REACTIVE CALCULATIONS =====
	const deliveryCount = $derived(invoiceService.calculateDeliveryCount());
	const totalPrice = $derived(invoiceService.calculateTotalPrice());
	const deliveryDiscount = $derived(invoiceService.calculateDeliveryDiscount());
</script>

<main
	class="bg-white"
	style="width: 210mm; min-height: 297mm; max-width: 210mm; margin: 0 auto; box-sizing: border-box;"
>
	<div id="invoice-content" class="flex flex-col" style="width: 100%; height: 100%;">
		<!-- 헤더 부분 (PDF에서 고정) -->
		<div class="invoice-header" style="margin-bottom: 16px;">
			<!-- Grid -->
			<div class="flex items-center justify-between" style="margin-bottom: 12px;">
				<div>
					<h1 class="text-2xl font-semibold text-gray-800 dark:text-neutral-200">청구서</h1>
				</div>
				<!-- Col -->
				<div class="text-end">
					<span
						class="text-sm text-gray-500 dark:text-neutral-500"
						data-date={data.param.date}
						data-company-name={corpInfo.corp_name}
						data-item={data.param.item}
						>#{data.param.date}-{corpInfo.corp_name}-{data.param.item}</span
					>
				</div>
				<!-- Col -->
			</div>
			<!-- End Grid -->
			<hr class="my-3" />
			<!-- Grid -->
			<div class="grid gap-6 sm:grid-cols-2">
				<div>
					<h2 class="pb-2 text-base font-semibold text-gray-800">공급 받으시는 분</h2>
					<p class="pb-1 text-xs font-normal text-gray-800">
						사업주 : <strong>{corpInfo.corp_name}</strong>
					</p>
					<p class="pb-1 text-xs font-normal text-gray-800">
						건　명 : <strong>{year}년 {month}월 청구서</strong>
					</p>
					<p class="pb-1 text-xs font-normal text-gray-800">
						일　자 : <strong>{data.param.date}</strong>
					</p>
					<div class="flex bg-violet-700 p-2 text-white">
						<h1 class="text-left text-base font-bold text-white">
							청구 금액<small class="text-xs">(합계)</small>
						</h1>
						<h1
							class="ml-auto text-end text-base font-bold text-white"
							data-total-price={totalPrice - Number(invoiceMoney)}
							data-prepaid-amount={Number(invoiceMoney)}
						>
							{(totalPrice - Number(invoiceMoney)).toLocaleString()}원
						</h1>
					</div>
				</div>
				<!-- Col -->

				<div class="space-y-1">
					<!-- Grid -->
					<div class="">
						<h2 class="pb-2 text-base font-semibold text-gray-800 dark:text-neutral-200">공급자</h2>
						<p class="pb-1 text-xs font-normal text-gray-800 dark:text-neutral-200">
							회　사　명 : <strong>{SUPPLIER_INFO.companyName}</strong>
						</p>
						<p class="pb-1 text-xs font-normal text-gray-800 dark:text-neutral-200">
							사업자번호 : <strong>{SUPPLIER_INFO.businessNumber}</strong>
						</p>
						<p class="pb-1 text-xs font-normal text-gray-800 dark:text-neutral-200">
							주　　　소 : <strong>{SUPPLIER_INFO.address}</strong>
						</p>
						<div class="grid grid-cols-2 gap-2">
							<p class="pb-1 text-xs font-normal text-gray-800 dark:text-neutral-200">
								담　당　자 : <strong>{SUPPLIER_INFO.contactPerson}</strong>
							</p>
							<p class="pb-1 text-xs font-normal text-gray-800 dark:text-neutral-200">
								연　락　처 : <strong>{SUPPLIER_INFO.phone}</strong>
							</p>
						</div>
						<p class="pb-1 text-xs font-normal text-gray-800 dark:text-neutral-200">
							계 좌 번 호 : <strong>{SUPPLIER_INFO.account}</strong>
						</p>
					</div>
				</div>
				<!-- Col -->
			</div>
			<!-- End Grid -->
			<hr class="my-3" />
			<!-- Grid -->
			<div class="flex justify-between">
				<!-- Col -->
				<div class="text-end">
					<span class="block text-xs font-normal text-gray-500 dark:text-neutral-500"
						># 위 청구금액과 관련하여 아래와 같이 세부내역을 드립니다.</span
					>
				</div>
				<!-- Col -->
			</div>
			<!-- End Grid -->
			<hr class="mt-2" />
		</div>
		<!-- Table -->
		<table
			class="min-w-full divide-y divide-gray-200 dark:divide-gray-700"
			style="font-size: 11px;"
		>
			<thead class="bg-gray-50 dark:bg-gray-800">
				<tr>
					<th
						scope="col"
						class="cursor-pointer px-2 py-1.5 text-left text-xs font-normal text-gray-500 dark:text-gray-400 rtl:text-right"
						>날짜</th
					>
					<th
						scope="col"
						class="cursor-pointer px-2 py-1.5 text-left text-xs font-normal text-gray-500 dark:text-gray-400 rtl:text-right"
						>출력</th
					>
					<th
						scope="col"
						class="cursor-pointer px-2 py-1.5 text-left text-xs font-normal text-gray-500 dark:text-gray-400 rtl:text-right"
						>출력 금액</th
					>
					<th
						scope="col"
						class="cursor-pointer px-2 py-1.5 text-left text-xs font-normal text-gray-500 dark:text-gray-400 rtl:text-right"
						>리메이크</th
					>
					<th
						scope="col"
						class="cursor-pointer px-2 py-1.5 text-left text-xs font-normal text-gray-500 dark:text-gray-400 rtl:text-right"
						>리메이크 금액</th
					>
					<th
						scope="col"
						class="cursor-pointer px-2 py-1.5 text-left text-xs font-normal text-gray-500 dark:text-gray-400 rtl:text-right"
						>비고</th
					>
				</tr>
			</thead>
			<tbody>
				{#each dateInfo as item}
					{@const calendarInfo = invoiceService.getCalendarInfo(item.date)}
					{@const rowClass = invoiceService.getRowClass(calendarInfo)}
					<tr class="border-b border-gray-200 {rowClass}">
						<td class="whitespace-nowrap border-r px-2 py-1 text-xs font-medium">{item.date}</td>
						<td class="whitespace-nowrap border-r px-2 py-1 text-xs font-medium"
							>{item.stlListData?.normalUnitNum || 0}</td
						>
						<td class="whitespace-nowrap border-r px-2 py-1 text-xs font-medium"
							>{item.stlListData?.normalUnitNum
								? invoiceService
										.getInvoicePrices(item.stlListData?.normalUnitNum, 'normal', 'cap')
										.toLocaleString() + '원'
								: '0원'}</td
						>
						<td class="whitespace-nowrap border-r px-2 py-1 text-xs font-medium"
							>{item.stlListData?.remakeUnitNum || 0}</td
						>
						<td class="whitespace-nowrap border-r px-2 py-1 text-xs font-medium"
							>{item.stlListData?.remakeUnitNum
								? invoiceService
										.getInvoicePrices(item.stlListData?.remakeUnitNum, 'remake', 'cap')
										.toLocaleString() + '원'
								: '0원'}</td
						>
						<td class="whitespace-nowrap bg-white px-2 py-1 text-xs font-medium">
							{#if item.stlListData?.directory}
								<p
									class=" max-w-[500px] whitespace-normal break-words text-xs font-normal text-gray-500 dark:text-gray-400"
								>
									{#each invoiceService.getFileInfo(item.stlListData.directory.remakeFiles, item.stlListData.corpName).types as type, i}
										{type}
										{#if i < invoiceService.getFileInfo(item.stlListData.directory.remakeFiles, item.stlListData.corpName).types.length - 1}
											,
										{/if}
									{/each}
								</p>
							{/if}
						</td>
					</tr>
				{/each}
			</tbody>
			<tfoot>
				<tr class="bg-gray-50 dark:bg-gray-800">
					<td class="whitespace-nowrap px-2 py-2 text-xs font-medium">소계</td>
					<td class="whitespace-nowrap px-2 py-2 text-xs font-medium"
						>{corpInfo.totalNormalUnitNum}개</td
					>
					<td class="whitespace-nowrap px-2 py-2 text-xs font-medium">
						{corpInfo.totalNormalPrice.toLocaleString()}원
					</td>
					<td class="whitespace-nowrap px-2 py-2 text-xs font-medium"
						>{corpInfo.totalRemakeUnitNum}개</td
					>
					<td class="whitespace-nowrap px-2 py-2 text-xs font-medium">
						{corpInfo.totalRemakePrice.toLocaleString()}원
					</td>
					<td class="whitespace-nowrap px-2 py-2 text-xs font-medium"
						>{#if invoiceMoney > 0}전월 잔액 : {Number(invoiceMoney).toLocaleString()}원{/if}</td
					>
				</tr>
				<tr class="bg-violet-700 text-white">
					<td class="whitespace-nowrap px-2 py-2 text-sm font-semibold">배송비용</td>
					<td
						class="whitespace-nowrap px-2 py-2 text-sm font-semibold"
						data-delivery-fee={deliveryInvoice}>{deliveryInvoice.toLocaleString()}원</td
					>
					<td class="whitespace-nowrap px-2 py-2 text-sm font-semibold"></td>
					<td class="whitespace-nowrap px-2 py-2 text-sm font-semibold"></td>
					<td class="whitespace-nowrap px-2 py-2 text-sm font-semibold">출력금액</td>
					<td class="whitespace-nowrap px-2 py-2 text-end text-sm font-semibold"
						>{(totalPrice - Number(invoiceMoney)).toLocaleString()}원</td
					>
				</tr>
			</tfoot>
		</table>
		<!-- End Table -->
		{#if corpInfo.deliveryType !== 'courier'}
			<div class="text-start" style="margin-top: 8px;">
				<span
					class="block text-xs font-normal text-gray-500 dark:text-neutral-500"
					data-delivery-count={deliveryCount}
					data-delivery-discount={deliveryDiscount}
				>
					# {deliveryCount}회 배송 / 총 {corpInfo.totalNormalUnitNum}개 출력으로 배송 비용 {deliveryDiscount.toLocaleString()}%
					절약
				</span>
			</div>
		{/if}
	</div>
</main>

<style>
	h1 {
		text-align: center;
	}

	/* A4 크기 최적화 스타일 */
	@media print {
		main {
			width: 210mm !important;
			min-height: 297mm !important;
			max-width: 210mm !important;
			margin: 0 !important;
			padding: 10mm !important;
			box-sizing: border-box !important;
			page-break-inside: avoid;
		}

		#invoice-content {
			width: 100% !important;
			height: 100% !important;
		}

		table {
			font-size: 10px !important;
			page-break-inside: avoid;
		}

		th,
		td {
			padding: 2px 4px !important;
			font-size: 10px !important;
		}

		.invoice-header {
			margin-bottom: 10mm !important;
		}

		/* 페이지 나누기 방지 */
		.invoice-header,
		table,
		tfoot {
			page-break-inside: avoid;
		}
	}

	/* 화면에서 보기 위한 스타일 */
	main {
		box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
		border: 1px solid #e5e7eb;
	}
</style>
