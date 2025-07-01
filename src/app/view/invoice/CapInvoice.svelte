<script lang="ts">
	// 캘린더 처리용 DatePicker
	import { jsPDF } from 'jspdf';
	import html2canvas from 'html2canvas';
	import { writable } from 'svelte/store';

	const { data } = $props<{ data: any }>();

	const corpInfo = data.info;

	let invoiceMoney = writable(0);

	const [year, month] = data.param.date.split('-').map(Number);
	const dateInfo = Array.from({ length: new Date(year, month, 0).getDate() }, (_, i) => {
		const date = new Date(year, month - 1, i + 1);
		return {
			date: `${year}-${String(month).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`,
			day: i + 1,
			dayOfWeek: ['일', '월', '화', '수', '목', '금', '토'][date.getDay()]
		};
	});

	async function generatePDF() {
		const element = document.getElementById('invoice-content');
		if (!element) {
			alert('청구서 요소를 찾을 수 없습니다.');
			return;
		}

		try {
			const canvas = await html2canvas(element, { scale: 2 });
			const imgData = canvas.toDataURL('image/png');
			const pdf = new jsPDF('p', 'mm', 'a4');
			const imgProps = pdf.getImageProperties(imgData);
			const pdfWidth = pdf.internal.pageSize.getWidth();
			const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

			const pdfName = `${data.param.date}-${corpInfo.companyname}-${data.param.item}.pdf`;

			pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
			pdf.save(pdfName);
		} catch (error) {
			console.error('PDF 생성 오류:', error);
			alert('PDF 생성 중 오류가 발생했습니다.');
		}
	}

	// dateInfo 배열에 invoice 정보 추가
	dateInfo.forEach((dateItem) => {
		const matchingInvoice = corpInfo.invoice.find((inv: any) => inv.printDate === dateItem.date);
		if (matchingInvoice) {
			dateItem.invoice = matchingInvoice;
		}
	});
	// 청구서 합계 초기화
	corpInfo.totalNormalUnitNum = 0;
	corpInfo.totalRemakeUnitNum = 0;
	corpInfo.totalNormalPrice = 0;
	corpInfo.totalRemakePrice = 0;
	corpInfo.totalPrice = 0;

	// 일반/리메이크 수량 합계 계산
	corpInfo.invoice.forEach((item: any) => {
		corpInfo.totalNormalUnitNum += item.normalUnitNum || 0;
		corpInfo.totalRemakeUnitNum += item.remakeUnitNum || 0;
	});

	// 일반/리메이크 금액 계산
	corpInfo.totalNormalPrice = corpInfo.totalNormalUnitNum * corpInfo.prices.cap.normal;
	corpInfo.totalRemakePrice = corpInfo.totalRemakeUnitNum * corpInfo.prices.cap.remake;

	// 청구서 가격 계산 함수
	function getInvoicePrices(invoice: any, type: string) {
		if (type === 'normal') {
			return invoice * corpInfo.prices.cap.normal;
		} else if (type === 'remake') {
			return invoice * corpInfo.prices.cap.remake;
		}
	}

	// 총 배송 수량 계산
	const deliveryCount = corpInfo.invoice.filter(
		(item: any) => item.normalUnitNum || item.remakeUnitNum
	).length;

	console.log(corpInfo.totalNormalUnitNum);

	// 배송비 계산 로직
	if (deliveryCount < 5) {
		// 5회 미만 배송 : 무료 배송
		corpInfo.deliveryInvoice = 0;
	} else if (deliveryCount < 10) {
		// 10회 미만 배송 : 기본 배송비의 50%
		corpInfo.deliveryInvoice = corpInfo.deliveryFee * 0.5;
	} else if (corpInfo.totalNormalUnitNum >= 200) {
		// 175개 이상: 무료 배송
		corpInfo.deliveryInvoice = 0;
	} else if (corpInfo.totalNormalUnitNum >= 150) {
		// 130개 이상: 기본 배송비의 25%
		corpInfo.deliveryInvoice = corpInfo.deliveryFee * 0.25;
	} else if (corpInfo.totalNormalUnitNum >= 100) {
		// 100개 이상: 기본 배송비의 50%
		corpInfo.deliveryInvoice = corpInfo.deliveryFee * 0.5;
	} else if (corpInfo.totalNormalUnitNum >= 50) {
		// 50개 이상: 기본 배송비
		corpInfo.deliveryInvoice = corpInfo.deliveryFee * 0.75;
	} else {
		// 50개 미만: 기본 배송비
		corpInfo.deliveryInvoice = corpInfo.deliveryFee;
	}

	// 최종 청구 금액 계산
	corpInfo.totalPrice =
		corpInfo.totalNormalPrice + corpInfo.totalRemakePrice + corpInfo.deliveryInvoice;

	console.log(corpInfo);

	// 배송비 절약율 계산 함수
	function calculateDeliveryDiscount() {
		const originalFee = corpInfo.deliveryFee;
		const finalFee = corpInfo.deliveryInvoice;

		if (originalFee === 0 || finalFee === 0) return 100;

		const discountRate = ((originalFee - finalFee) / originalFee) * 100;
		return Math.round(discountRate);
	}

	// 배송비 절약율 계산
	const deliveryDiscount = calculateDeliveryDiscount();

	// 배송비용 기준
	const deliveryFeeStandard = [
		'배송 비용 기준',
		'5회 미만 배송 : 0% 기준',
		'10회 미만 배송 : 50% 기준',
		'200u 이상: 0% 기준',
		'150u 이상: 25% 기준',
		'100u 이상: 50% 기준',
		'50u 이상: 75% 기준',
		'50u 미만: 100% 기준'
	];

	// dateInfo 배열에 배송비용 기준 정보 추가
	if (corpInfo.deliveryFee > 0 || corpInfo.companyname == '우일 치과기공소') {
		deliveryFeeStandard.reverse().forEach((standard, index) => {
			const lastIndex = dateInfo.length - 1 - index;
			if (lastIndex >= 0) {
				if (!dateInfo[lastIndex].invoice) {
					dateInfo[lastIndex].invoice = {};
				}
				dateInfo[lastIndex].deliveryStandard = standard;
			}
		});
	}
</script>

<main class="ml-64 mt-8 min-h-screen flex-1 bg-gray-100 p-8">
	<article class="w-full pl-3 pr-5 pt-3">
		<nav
			class="request-list content-nav-box block h-auto w-full rounded-lg border border-gray-200 bg-white px-4 py-3 shadow"
		>
			<div class="re-list-title flex w-full flex-row">
				<div class="box-title inline-block items-center">
					<h3 class="py-1 py-px text-3xl font-extrabold text-violet-700">청구서</h3>
				</div>
				<div class="float-right ml-auto inline-block w-auto items-center">
					<button
						type="button"
						onclick={generatePDF}
						class="mb-2 rounded-lg bg-violet-500 px-5 py-3 text-sm font-medium text-white hover:bg-violet-800 focus:outline-none focus:ring-4 focus:ring-violet-300 dark:bg-violet-600 dark:hover:bg-violet-700 dark:focus:ring-violet-900"
						>PDF 다운로드</button
					>
				</div>
			</div>
			<div class="nav-search-box mt-4 border-t border-gray-100 pt-4">
				<div class="relative inline-flex space-x-2">
					<label for="invoiceMoney" class="text-sm font-medium text-gray-700">선결제 남은금액</label
					>
					<input
						id="invoiceMoney"
						type="text"
						class="h-10 w-20 rounded-lg border border-gray-300 px-4 py-1 text-sm focus:border-blue-500 focus:outline-none"
						placeholder="선결제 남은금액"
						bind:value={$invoiceMoney}
					/>
				</div>
				<div class="relative inline-flex space-x-2">
					<label for="invoiceMoney" class="text-sm font-medium text-gray-700">배송비</label>
					<input
						id="invoiceMoney"
						type="text"
						class="h-10 w-20 rounded-lg border border-gray-300 px-4 py-1 text-sm focus:border-blue-500 focus:outline-none"
						placeholder="배송비"
						bind:value={corpInfo.deliveryInvoice}
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
			<!-- Grid -->
			<div class="flex justify-between">
				<div>
					<h1 class=" text-4xl font-semibold text-gray-800 dark:text-neutral-200 md:text-3xl">
						청구서
					</h1>
				</div>
				<!-- Col -->
				<div class="text-end">
					<span class="mt-1 block text-gray-500 dark:text-neutral-500"
						>#{data.param.date}-{corpInfo.companyname}-{data.param.item}</span
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
						사업주 : <strong>{corpInfo.companyname}</strong>
					</p>
					<p class="pb-2 text-base font-normal text-gray-800">
						건　명 : <strong>{year}년 {month}월 청구서</strong>
					</p>
					<p class="pb-2 text-base font-normal text-gray-800">
						일　자 : <strong>{data.param.date}</strong>
					</p>
					<div class="flex bg-violet-700 p-4 text-white">
						<h1 class="text-left text-2xl font-bold text-white">
							청구 금액<small class="text-sm">(합계)</small>
						</h1>
						<h1 class="ml-auto text-end text-3xl font-bold text-white">
							{(corpInfo.totalPrice - Number($invoiceMoney)).toLocaleString()}원
						</h1>
					</div>
				</div>
				<!-- Col -->

				<div class="space-y-2">
					<!-- Grid -->
					<div class="">
						<h2 class="pb-3 text-lg font-semibold text-gray-800 dark:text-neutral-200">공급자</h2>
						<p class="pb-2 text-base font-normal text-gray-800 dark:text-neutral-200">
							회　사　명 : <strong>공백치과기공소</strong>
						</p>
						<p class="pb-2 text-base font-normal text-gray-800 dark:text-neutral-200">
							사업자번호 : <strong>217-99-34005</strong>
						</p>
						<p class="pb-2 text-base font-normal text-gray-800 dark:text-neutral-200">
							주　　　소 : <strong>서울시 금천구 가산디지털1로 16, 6층 619호</strong>
						</p>
						<div class="grid grid-cols-2 gap-3">
							<p class="pb-2 text-base font-normal text-gray-800 dark:text-neutral-200">
								담　당　자 : <strong>문정준</strong>
							</p>
							<p class="pb-2 text-base font-normal text-gray-800 dark:text-neutral-200">
								연　락　처 : <strong>010-4085-5008</strong>
							</p>
						</div>
						<p class="pb-2 text-base font-normal text-gray-800 dark:text-neutral-200">
							계 좌 번 호 : <strong>110533422050, 신한은행 공백치과기공소 문정준</strong>
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
			<!-- Table -->
			<table class="-mx-6 min-w-full divide-y divide-gray-200 dark:divide-gray-700">
				<thead class="bg-gray-50 dark:bg-gray-800">
					<tr>
						<th
							scope="col"
							class="cursor-pointer px-4 py-2.5 text-left text-sm font-normal text-gray-500 dark:text-gray-400 rtl:text-right"
							>날짜</th
						>
						<th
							scope="col"
							class="cursor-pointer px-4 py-2.5 text-left text-sm font-normal text-gray-500 dark:text-gray-400 rtl:text-right"
							>출력</th
						>
						<th
							scope="col"
							class="cursor-pointer px-4 py-2.5 text-left text-sm font-normal text-gray-500 dark:text-gray-400 rtl:text-right"
							>출력 금액</th
						>
						<th
							scope="col"
							class="cursor-pointer px-4 py-2.5 text-left text-sm font-normal text-gray-500 dark:text-gray-400 rtl:text-right"
							>리메이크</th
						>
						<th
							scope="col"
							class="cursor-pointer px-4 py-2.5 text-left text-sm font-normal text-gray-500 dark:text-gray-400 rtl:text-right"
							>리메이크 금액</th
						>
						<th
							scope="col"
							class="cursor-pointer px-4 py-2.5 text-left text-sm font-normal text-gray-500 dark:text-gray-400 rtl:text-right"
							>비고</th
						>
					</tr>
				</thead>
				<tbody>
					{#each dateInfo as item}
						<tr
							class="border-b border-gray-200 {new Date(item.date).getDay() === 6
								? 'bg-blue-100'
								: new Date(item.date).getDay() === 0
									? 'bg-red-100'
									: ''}"
						>
							<td class="whitespace-nowrap border-r px-4 py-2 text-sm font-medium">{item.date}</td>
							<td class="whitespace-nowrap border-r px-4 py-2 text-sm font-medium"
								>{item.invoice?.normalUnitNum || 0}</td
							>
							<td class="whitespace-nowrap border-r px-4 py-2 text-sm font-medium"
								>{item.invoice?.normalUnitNum
									? getInvoicePrices(item.invoice?.normalUnitNum, 'normal').toLocaleString() + '원'
									: '0원'}</td
							>
							<td class="whitespace-nowrap border-r px-4 py-2 text-sm font-medium"
								>{item.invoice?.remakeUnitNum || 0}</td
							>
							<td class="whitespace-nowrap border-r px-4 py-2 text-sm font-medium"
								>{item.invoice?.remakeUnitNum
									? getInvoicePrices(item.invoice?.remakeUnitNum, 'remake').toLocaleString() + '원'
									: '0원'}</td
							>
							<td class="whitespace-nowrap bg-white px-4 py-2 text-sm font-medium"
								>{item.deliveryStandard ? item.deliveryStandard : ''}</td
							>
						</tr>
					{/each}
				</tbody>
				<tfoot>
					<tr class="bg-gray-50 dark:bg-gray-800">
						<td class="whitespace-nowrap px-4 py-4 text-sm font-medium">소계</td>
						<td class="whitespace-nowrap px-4 py-4 text-sm font-medium"
							>{corpInfo.totalNormalUnitNum}개</td
						>
						<td class="whitespace-nowrap px-4 py-4 text-sm font-medium">
							{corpInfo.totalNormalPrice.toLocaleString()}원
						</td>
						<td class="whitespace-nowrap px-4 py-4 text-sm font-medium"
							>{corpInfo.totalRemakeUnitNum}개</td
						>
						<td class="whitespace-nowrap px-4 py-4 text-sm font-medium"
							>{corpInfo.totalRemakePrice.toLocaleString()}원</td
						>
						<td class="whitespace-nowrap px-4 py-4 text-sm font-medium"
							>{#if $invoiceMoney > 0}전월 잔액 : {Number(
									$invoiceMoney
								).toLocaleString()}원{/if}</td
						>
					</tr>
					<tr class="bg-violet-700 text-white">
						<td class="whitespace-nowrap px-4 py-4 text-lg font-semibold">배송비용</td>
						<td class="whitespace-nowrap px-4 py-4 text-lg font-semibold"
							>{corpInfo.deliveryInvoice.toLocaleString()}원</td
						>
						<td class="whitespace-nowrap px-4 py-4 text-lg font-semibold"></td>
						<td class="whitespace-nowrap px-4 py-4 text-lg font-semibold"></td>
						<td class="whitespace-nowrap px-4 py-4 text-lg font-semibold">출력금액</td>
						<td class="whitespace-nowrap px-4 py-4 text-lg font-semibold"
							>{(corpInfo.totalPrice - Number($invoiceMoney)).toLocaleString()}원</td
						>
					</tr>
				</tfoot>
			</table>
			<!-- End Table -->
			<div class="text-start">
				<span class="block pt-2 text-sm font-normal text-gray-500 dark:text-neutral-500">
					# {deliveryCount}회 배송 / 총 {corpInfo.totalNormalUnitNum}개 출력으로 배송 비용 {deliveryDiscount.toLocaleString()}%
					절약
				</span>
			</div>
		</div>
	</article>
</main>

<style>
	h1 {
		text-align: center;
	}
</style>
