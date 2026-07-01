<script lang="ts">
	// ===== IMPORTS =====
	import InvoicePdfRenderer from './InvoicePdfRenderer.svelte';
	import PageHeaderBar from '../../view/components/PageHeaderBar.svelte';
	import { InvoicePageType } from '../../model/invoice/InvoicePageType';
	import { SUPPLIER_INFO } from '../../service/invoice/InvoiceCommonService';
	import { toastStore } from '../../service/ToastService';
	import {
		initializeInvoiceStore,
		updateInvoiceMoney,
		updateDeliveryInvoice,
		openPdfModal,
		closePdfModal,
		getInvoiceService,
		getTableHeaders,
		resetInvoiceStore,
		invoiceMoney,
		deliveryInvoice,
		showPdfRenderer,
		corpInfo,
		dateInfo,
		totalPrice,
		deliveryCount,
		deliveryDiscount,
		invoiceViewData
	} from '../../service/invoice/InvoiceViewStore';

	// ===== PROPS =====
	const {
		data,
		pageType = InvoicePageType.CAP,
		typeLabel = ''
	} = $props<{
		data: any;
		pageType?: InvoicePageType;
		typeLabel?: string;
	}>();

	// ===== SERVICE INITIALIZATION =====
	initializeInvoiceStore(data, pageType);
	const invoiceService = getInvoiceService();
	const calendarData = invoiceService?.getCalendarData() || [];

	// 날짜 미지정 시 더미(2024-01) 대신 현재 연-월을 폴백으로 사용
	const now = new Date();
	const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
	const invoiceDate = data.param?.date || currentYearMonth;
	const [year, month] = invoiceDate.split('-').map(Number);

	// PDF 생성 도중 사용자가 취소했는지 여부. 취소 후 뒤늦게 도착하는
	// 완료/실패 콜백이 토스트를 띄우지 않도록 가드하는 플래그.
	let pdfCancelled = $state(false);

	// ===== EVENT HANDLERS =====
	function handlePdfRenderComplete(success: boolean, error?: string) {
		closePdfModal();
		// 이미 취소했으면 늦게 도착한 결과의 토스트는 무시
		if (pdfCancelled) {
			pdfCancelled = false;
			return;
		}
		if (success) {
			toastStore.success('PDF가 성공적으로 생성되었습니다.');
		} else {
			// 에러 메시지를 더 사용자 친화적으로 표시
			let errorMessage = '알 수 없는 오류가 발생했습니다.';

			if (error) {
				if (error.includes('PDF 생성 서버에 연결할 수 없습니다')) {
					errorMessage = 'PDF 생성 서버에 연결할 수 없습니다. 서버 상태를 확인해주세요.';
				} else if (error.includes('PDF 생성 시간이 초과되었습니다')) {
					errorMessage = 'PDF 생성 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.';
				} else if (error.includes('PDF 생성에 실패했습니다')) {
					errorMessage = 'PDF 생성에 실패했습니다. 잠시 후 다시 시도해주세요.';
				} else if (error.includes('네트워크')) {
					errorMessage = '네트워크 연결을 확인해주세요.';
				} else {
					errorMessage = `PDF 생성 오류: ${error}`;
				}
			}

			toastStore.error(errorMessage);
		}
	}

	function handlePdfRenderStart() {
		pdfCancelled = false; // 새 생성 시작 시 취소 플래그 초기화
		toastStore.info('PDF 생성 중입니다. 잠시만 기다려주세요...');
	}

	// PDF 모달 취소: 진행 중 결과의 뒤늦은 토스트를 막고 모달을 닫는다.
	function handlePdfCancel() {
		pdfCancelled = true;
		closePdfModal();
		toastStore.info('PDF 생성을 취소했습니다.');
	}

	function handleInvoiceMoneyChange(event: Event) {
		const target = event.target as HTMLInputElement;
		updateInvoiceMoney(Number(target.value) || 0);
	}

	function handleDeliveryInvoiceChange(event: Event) {
		const target = event.target as HTMLInputElement;
		updateDeliveryInvoice(Number(target.value) || 0);
	}

	// ===== COMPONENT CONFIGURATION =====
	const config = {
		[InvoicePageType.CAP]: {
			title: '청구서',
			showPatientName: false,
			showDeliveryStandards: true,
			priceType: 'cap' as const
		},
		[InvoicePageType.CUSTOM]: {
			title: '청구서',
			showPatientName: false,
			showDeliveryStandards: false,
			priceType: 'custom' as const
		},
		[InvoicePageType.PARTIAL]: {
			title: '청구서',
			showPatientName: true,
			showDeliveryStandards: false,
			priceType: 'partial' as const
		},
		[InvoicePageType.ALLONFOUR]: {
			title: '청구서',
			showPatientName: true,
			showDeliveryStandards: false,
			priceType: 'allonfour' as const
		}
	};

	const currentConfig = config[pageType as keyof typeof config];

	// 상세 헤더 제목: 청구서 종류 라벨이 있으면 표시(예: '캡 청구서'), 없으면 기본 '청구서'
	const headerTitle = typeLabel || currentConfig.title;

	// ===== HELPER FUNCTIONS =====
	// getTableHeaders는 이제 스토어에서 가져옴
</script>

<main class="ml-64 mt-8 min-h-screen flex-1 bg-gray-100 p-8">
	<article class="w-full pl-3 pr-5 pt-3">
		<PageHeaderBar
			title={headerTitle}
			description="청구서 저장 및 pdf 다운로드 페이지입니다."
		>
			<div class="flex flex-wrap items-center gap-2">
				<button
					type="button"
					onclick={() => {
						handlePdfRenderStart();
						openPdfModal();
					}}
					class="mb-2 rounded-lg bg-violet-500 px-5 py-3 text-sm font-medium text-white hover:bg-violet-800 focus:outline-none focus:ring-4 focus:ring-violet-300 dark:bg-violet-600 dark:hover:bg-violet-700 dark:focus:ring-violet-900"
				>
					PDF 다운로드
				</button>
			</div>
		</PageHeaderBar>
		<nav
			class="request-list content-nav-box block h-auto w-full rounded-lg border border-gray-200 bg-white px-4 py-3 shadow"
		>
			<div class="nav-search-box flex flex-wrap items-center gap-4">
				<div class="flex items-center space-x-2">
					<label for="invoiceMoney" class="whitespace-nowrap text-sm font-medium text-gray-700"
						>선결제 남은금액</label
					>
					<input
						id="invoiceMoney"
						type="text"
						class="h-10 w-32 rounded-lg border border-gray-300 px-4 py-1 text-sm focus:border-blue-500 focus:outline-none"
						placeholder="선결제 남은금액"
						value={$invoiceMoney}
						oninput={handleInvoiceMoneyChange}
					/>
				</div>
				<div class="flex items-center space-x-2">
					<label for="deliveryInvoice" class="whitespace-nowrap text-sm font-medium text-gray-700"
						>배송비</label
					>
					<input
						id="deliveryInvoice"
						type="text"
						class="h-10 w-32 rounded-lg border border-gray-300 px-4 py-1 text-sm focus:border-blue-500 focus:outline-none"
						placeholder="배송비"
						value={$deliveryInvoice}
						oninput={handleDeliveryInvoiceChange}
					/>
				</div>
			</div>
		</nav>
	</article>
	<article class="w-full pl-3 pr-5 pt-3">
		<div
			id="invoice-content"
			class="flex flex-col rounded-xl bg-white p-6 shadow-md dark:bg-neutral-800 sm:p-10"
		>
			<!-- 헤더 부분 (PDF에서 고정) -->
			<div class="invoice-header">
				<!-- Grid -->
				<div class="flex justify-between">
					<div>
						<h1 class=" text-4xl font-semibold text-gray-800 dark:text-neutral-200 md:text-3xl">
							{headerTitle}
						</h1>
					</div>
					<!-- Col -->
					<div class="text-end">
						<span
							class="mt-1 block text-gray-500 dark:text-neutral-500"
							data-date={invoiceDate}
							data-company-name={$corpInfo?.corp_name || 'company'}
							data-item={data.param?.item || 'item'}
							>#{invoiceDate}-{$corpInfo?.corp_name || 'company'}-{data.param?.item || 'item'}</span
						>
					</div>
					<!-- Col -->
				</div>
				<!-- End Grid -->
				<hr class="-mx-6 my-4" />
				<!-- Grid -->
				<div class="grid gap-12 sm:grid-cols-2">
					<div>
						<h2 class="pb-3 text-lg font-semibold text-gray-800">공급 받으시는 분</h2>
						<p class="pb-2 text-base font-normal text-gray-800">
							사업주 : <strong>{$corpInfo?.corp_name}</strong>
						</p>
						<p class="pb-2 text-base font-normal text-gray-800">
							건　명 : <strong>{year}년 {month}월 청구서</strong>
						</p>
						<p class="pb-2 text-base font-normal text-gray-800">
							일　자 : <strong>{invoiceDate}</strong>
						</p>
						<div class="flex bg-violet-700 p-4 text-white">
							<h1 class="text-left text-2xl font-bold text-white">
								청구 금액<small class="text-sm">(합계)</small>
							</h1>
							<h1
								class="ml-auto text-end text-3xl font-bold text-white"
								data-total-price={$totalPrice - Number($invoiceMoney)}
								data-prepaid-amount={Number($invoiceMoney)}
							>
								{($totalPrice - Number($invoiceMoney)).toLocaleString()}원
							</h1>
						</div>
					</div>
					<!-- Col -->

					<div class="space-y-2">
						<!-- Grid -->
						<div class="">
							<h2 class="pb-3 text-lg font-semibold text-gray-800 dark:text-neutral-200">공급자</h2>
							<p class="pb-2 text-base font-normal text-gray-800 dark:text-neutral-200">
								회　사　명 : <strong>{SUPPLIER_INFO.companyName}</strong>
							</p>
							<p class="pb-2 text-base font-normal text-gray-800 dark:text-neutral-200">
								사업자번호 : <strong>{SUPPLIER_INFO.businessNumber}</strong>
							</p>
							<p class="pb-2 text-base font-normal text-gray-800 dark:text-neutral-200">
								주　　　소 : <strong>{SUPPLIER_INFO.address}</strong>
							</p>
							<div class="grid grid-cols-2 gap-3">
								<p class="pb-2 text-base font-normal text-gray-800 dark:text-neutral-200">
									담　당　자 : <strong>{SUPPLIER_INFO.contactPerson}</strong>
								</p>
								<p class="pb-2 text-base font-normal text-gray-800 dark:text-neutral-200">
									연　락　처 : <strong>{SUPPLIER_INFO.phone}</strong>
								</p>
							</div>
							<p class="pb-2 text-base font-normal text-gray-800 dark:text-neutral-200">
								계 좌 번 호 : <strong>{SUPPLIER_INFO.account}</strong>
							</p>
						</div>
					</div>
					<!-- Col -->
				</div>
				<!-- End Grid -->
				<hr class="-mx-6 mb-2 mt-4" />
				<!-- Grid -->
				<div class="flex justify-between">
					<!-- Col -->
					<div class="text-end">
						<span class="block text-sm font-normal text-gray-500 dark:text-neutral-500"
							># 위 청구금액과 관련하여 아래와 같이 세부내역을 드립니다.</span
						>
					</div>
					<!-- Col -->
				</div>
				<!-- End Grid -->
				<hr class="-mx-6 mt-2" />
			</div>
			<!-- Table -->
			<table class="-mx-6 min-w-full divide-y divide-gray-200 dark:divide-gray-700">
				<thead class="bg-gray-50 dark:bg-gray-800">
					<tr>
						{#each getTableHeaders(pageType) as header}
							<th
								scope="col"
								class="cursor-pointer px-4 py-2.5 text-left text-sm font-normal text-gray-500 dark:text-gray-400 rtl:text-right"
							>
								{header}
							</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each $dateInfo as item}
						{@const calendarInfo = invoiceService?.getCalendarInfo(item.date) || null}
						{@const rowClass = invoiceService?.getRowClass(calendarInfo)}
						<tr class="border-b border-gray-200 {rowClass}">
							<td class="whitespace-nowrap border-r px-4 py-2 text-sm font-medium">{item.date}</td>
							<td class="whitespace-nowrap border-r px-4 py-2 text-sm font-medium">
								{item.stlListData?.normalUnitNum || 0}
							</td>
							<td class="whitespace-nowrap border-r px-4 py-2 text-sm font-medium">
								{item.stlListData?.normalUnitNum
									? invoiceService
											?.getInvoicePrices(
												item.stlListData?.normalUnitNum,
												'normal',
												currentConfig.priceType
											)
											.toLocaleString() + '원'
									: '0원'}
							</td>
							<td class="whitespace-nowrap border-r px-4 py-2 text-sm font-medium">
								{item.stlListData?.remakeUnitNum || 0}
							</td>
							<td class="whitespace-nowrap border-r px-4 py-2 text-sm font-medium">
								{item.stlListData?.remakeUnitNum
									? invoiceService
											?.getInvoicePrices(
												item.stlListData?.remakeUnitNum,
												'remake',
												currentConfig.priceType
											)
											.toLocaleString() + '원'
									: '0원'}
							</td>
							{#if currentConfig.showPatientName}
								<td
									class="cursor-pointer border-r px-4 py-2.5 text-left text-sm font-normal text-gray-500 dark:text-gray-400 rtl:text-right"
								>
									{#if item.stlListData?.directory}
										<p
											class=" max-w-[500px] whitespace-normal break-words text-xs font-normal text-gray-500 dark:text-gray-400"
										>
											{#each invoiceService?.getFileInfo(item.stlListData.directory.remakeFiles, item.stlListData.corpName)?.types || [] as type, i}
												{type}{i <
												(invoiceService?.getFileInfo(
													item.stlListData.directory.remakeFiles,
													item.stlListData.corpName
												)?.types.length || 0) -
													1
													? ', '
													: ''}
											{/each}
										</p>
									{/if}
								</td>
							{/if}
							<td class="whitespace-nowrap bg-white px-4 py-2 text-sm font-medium">
								{item.deliveryStandard || ''}
							</td>
						</tr>
					{/each}
				</tbody>
				<tfoot>
					<tr class="bg-gray-50 dark:bg-gray-800">
						<td class="whitespace-nowrap px-4 py-4 text-sm font-medium">소계</td>
						<td class="whitespace-nowrap px-4 py-4 text-sm font-medium"
							>{$corpInfo?.totalNormalUnitNum ?? 0}개</td
						>
						<td class="whitespace-nowrap px-4 py-4 text-sm font-medium">
							{($corpInfo?.totalNormalPrice ?? 0).toLocaleString()}원
						</td>
						<td class="whitespace-nowrap px-4 py-4 text-sm font-medium"
							>{$corpInfo?.totalRemakeUnitNum ?? 0}개</td
						>
						<td class="whitespace-nowrap px-4 py-4 text-sm font-medium"
							>{($corpInfo?.totalRemakePrice ?? 0).toLocaleString()}원</td
						>
						{#if currentConfig.showPatientName}
							<td class="whitespace-nowrap px-4 py-4 text-sm font-medium"
								>{#if $invoiceMoney > 0}전월 잔액 : {Number(
										$invoiceMoney
									).toLocaleString()}원{/if}</td
							>
							<td class="whitespace-nowrap px-4 py-4 text-lg font-semibold"></td>
						{:else}
							<td class="whitespace-nowrap px-4 py-4 text-sm font-medium"
								>{#if $invoiceMoney > 0}전월 잔액 : {Number(
										$invoiceMoney
									).toLocaleString()}원{/if}</td
							>
						{/if}
					</tr>
					<tr class="bg-violet-700 text-white">
						<td class="whitespace-nowrap px-4 py-4 text-lg font-semibold">배송비용</td>
						<td
							class="whitespace-nowrap px-4 py-4 text-lg font-semibold"
							data-delivery-fee={$deliveryInvoice}>{$deliveryInvoice.toLocaleString()}원</td
						>
						<td class="whitespace-nowrap px-4 py-4 text-lg font-semibold"></td>
						<td class="whitespace-nowrap px-4 py-4 text-lg font-semibold"></td>
						<td class="whitespace-nowrap px-4 py-4 text-lg font-semibold">출력금액</td>
						{#if currentConfig.showPatientName}
							<td class="whitespace-nowrap px-4 py-4 text-end text-lg font-semibold"
								>{($totalPrice - Number($invoiceMoney)).toLocaleString()}원</td
							>
							<td class="whitespace-nowrap px-4 py-4 text-lg font-semibold"></td>
						{:else}
							<td class="whitespace-nowrap px-4 py-4 text-lg font-semibold"
								>{($totalPrice - Number($invoiceMoney)).toLocaleString()}원</td
							>
						{/if}
					</tr>
				</tfoot>
			</table>
			<!-- End Table -->
			{#if currentConfig.showDeliveryStandards && $corpInfo?.deliveryType !== 'courier'}
				<div class="text-start">
					<span
						class="block pt-2 text-sm font-normal text-gray-500 dark:text-neutral-500"
						data-delivery-count={$deliveryCount}
						data-delivery-discount={$deliveryDiscount}
					>
						# {$deliveryCount}회 배송 / 총 {$corpInfo?.totalNormalUnitNum}개 출력으로 배송 비용 {$deliveryDiscount.toLocaleString()}%
						절약
					</span>
				</div>
			{/if}
		</div>
	</article>
</main>

<!-- PDF 렌더링 컴포넌트 - 고정 위치에 배치 -->
{#if $showPdfRenderer}
	<div class="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-50">
		<div
			class="relative max-h-[90vh] w-full max-w-4xl overflow-auto rounded-lg bg-white p-6 shadow-xl"
		>
			<div class="mb-4 flex items-center justify-between">
				<div>
					<h3 class="text-lg font-semibold text-gray-900">PDF 생성 중...</h3>
					<p class="mt-1 text-sm text-gray-600">잠시만 기다려주세요. PDF가 생성되고 있습니다.</p>
				</div>
				<button
					type="button"
					onclick={handlePdfCancel}
					class="rounded-lg bg-gray-200 px-3 py-1 text-sm text-gray-700 hover:bg-gray-300"
				>
					취소
				</button>
			</div>

			<!-- 진행 상태 표시 -->
			<div class="mb-4">
				<div class="flex items-center space-x-2">
					<div class="h-4 w-4 animate-spin rounded-full border-b-2 border-violet-500"></div>
					<span class="text-sm text-gray-600">PDF 생성 중...</span>
				</div>
				<div class="mt-2 text-xs text-gray-500">
					• HTML 생성 완료<br />
					• PDF 렌더링 서버로 전송 중...<br />
					• PDF 파일 생성 중...
				</div>
			</div>

			<div class="max-h-[70vh] overflow-auto">
				<InvoicePdfRenderer
					{pageType}
					{data}
					fileName={invoiceService?.getPdfFileName() || ''}
					onRenderComplete={handlePdfRenderComplete}
				/>
			</div>
		</div>
	</div>
{/if}

<style>
	h1 {
		text-align: center;
	}
</style>
