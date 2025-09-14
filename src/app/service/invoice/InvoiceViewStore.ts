import { writable, derived, type Writable } from 'svelte/store';
import { InvoiceCommonService } from './InvoiceCommonService';
import { InvoicePageType } from '../../model/invoice/InvoicePageType';
import { configService } from '../ConfigService';

// ===== STORE TYPES =====
export interface InvoiceViewData {
	corpInfo: any;
	dateInfo: any[];
	invoiceMoney: number;
	deliveryInvoice: number;
	totalPrice: number;
	deliveryCount: number;
	deliveryDiscount: number;
	pageType: InvoicePageType;
	fileName: string;
}

export interface PdfSaveData {
	fileName: string;
	filePath: string;
	fileSize?: number;
	pdfType: 'dentistry' | 'lab';
	companyName?: string;
	invoiceDate?: string;
	invoiceData: any;
	generatedBy?: string;
	corp_id?: number;
	invoiceId?: number;
}

// ===== STORES =====
export const invoiceMoney = writable<number>(0);
export const deliveryInvoice = writable<number>(0);
export const showPdfRenderer = writable<boolean>(false);

// ===== SERVICE STORE =====
let invoiceService: InvoiceCommonService | null = null;

// ===== DERIVED STORES =====
export const corpInfo = derived(
	[invoiceMoney, deliveryInvoice],
	([$invoiceMoney, $deliveryInvoice]) => {
		if (!invoiceService) return null;
		return invoiceService.getCorpInfo();
	}
);

export const dateInfo = derived(
	[invoiceMoney, deliveryInvoice],
	([$invoiceMoney, $deliveryInvoice]) => {
		if (!invoiceService) return [];
		return invoiceService.getDateInfo();
	}
);

export const totalPrice = derived(
	[invoiceMoney, deliveryInvoice],
	([$invoiceMoney, $deliveryInvoice]) => {
		if (!invoiceService) return 0;
		return invoiceService.calculateTotalPrice();
	}
);

export const deliveryCount = derived(
	[invoiceMoney, deliveryInvoice],
	([$invoiceMoney, $deliveryInvoice]) => {
		if (!invoiceService) return 0;
		return invoiceService.calculateDeliveryCount();
	}
);

export const deliveryDiscount = derived(
	[invoiceMoney, deliveryInvoice],
	([$invoiceMoney, $deliveryInvoice]) => {
		if (!invoiceService) return 0;
		return invoiceService.calculateDeliveryDiscount();
	}
);

// ===== COMBINED STORE =====
export const invoiceViewData = derived(
	[corpInfo, dateInfo, invoiceMoney, deliveryInvoice, totalPrice, deliveryCount, deliveryDiscount],
	([
		$corpInfo,
		$dateInfo,
		$invoiceMoney,
		$deliveryInvoice,
		$totalPrice,
		$deliveryCount,
		$deliveryDiscount
	]) => {
		return {
			corpId: $corpInfo?.corp_id,
			corpInfo: $corpInfo,
			dateInfo: $dateInfo,
			invoiceMoney: $invoiceMoney,
			deliveryInvoice: $deliveryInvoice,
			totalPrice: $totalPrice,
			deliveryCount: $deliveryCount,
			deliveryDiscount: $deliveryDiscount,
			pageType: InvoicePageType.CAP, // 기본값
			fileName: invoiceService?.getPdfFileName() || ''
		} as InvoiceViewData;
	}
);

// ===== STORE ACTIONS =====
export function initializeInvoiceStore(data: any, pageType: InvoicePageType = InvoicePageType.CAP) {
	invoiceService = new InvoiceCommonService(data);
	invoiceService.initialize('cap'); // 모든 타입이 cap 방식으로 통일됨

	// 배송비 초기화
	deliveryInvoice.set(invoiceService.calculateDeliveryInvoice());
}

export function updateInvoiceMoney(value: number) {
	invoiceMoney.set(value);
}

export function updateDeliveryInvoice(value: number) {
	deliveryInvoice.set(value);
}

export function openPdfModal() {
	showPdfRenderer.set(true);
}

export function closePdfModal() {
	showPdfRenderer.set(false);
}

// ===== HELPER FUNCTIONS =====
export function getInvoiceService(): InvoiceCommonService | null {
	return invoiceService;
}

export function getTableHeaders(pageType: InvoicePageType = InvoicePageType.CAP) {
	const baseHeaders = ['날짜', '출력', '출력 금액', '리메이크', '리메이크 금액'];

	const config = {
		[InvoicePageType.CAP]: { showPatientName: false },
		[InvoicePageType.CUSTOM]: { showPatientName: false },
		[InvoicePageType.PARTIAL]: { showPatientName: true },
		[InvoicePageType.ALLONFOUR]: { showPatientName: true }
	};

	const currentConfig = config[pageType as keyof typeof config];

	if (currentConfig.showPatientName) {
		baseHeaders.push('환자명');
	}

	baseHeaders.push('비고');

	return baseHeaders;
}

// ===== PDF SAVE FUNCTION =====
export async function savePdfToDatabase(
	invoiceData: PdfSaveData
): Promise<{ success: boolean; error?: string }> {
	console.log('🌐 [백엔드 API] 저장 요청 시작');
	console.log('📋 전송할 데이터:', invoiceData);

	try {
		// configService를 사용하여 백엔드 서버 URL과 API 엔드포인트 가져오기
		console.log('⚙️ 설정 정보 로딩 중...');
		const config = configService.getConfig();
		if (!config) {
			console.error('❌ 설정을 불러올 수 없습니다.');
			throw new Error('설정을 불러올 수 없습니다.');
		}

		const backendServerUrl = config.server.backend.baseUrl;
		const invoiceSaveEndpoint = config.api.endpoints.invoice.save;
		const fullUrl = `${backendServerUrl}${invoiceSaveEndpoint}`;

		console.log('🔗 백엔드 서버 URL:', backendServerUrl);
		console.log('📍 API 엔드포인트:', invoiceSaveEndpoint);
		console.log('🌍 전체 URL:', fullUrl);

		console.log('📤 HTTP 요청 전송 중...');
		const response = await fetch(fullUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(invoiceData)
		});

		console.log('📡 HTTP 응답 상태:', response.status, response.statusText);
		console.log('📊 응답 헤더:', Object.fromEntries(response.headers.entries()));

		if (!response.ok) {
			console.error('❌ HTTP 요청 실패:', response.status, response.statusText);
			let errorData;
			try {
				errorData = await response.json();
				console.error('📋 에러 응답 데이터:', errorData);
			} catch (parseError) {
				console.error('⚠️ 에러 응답 파싱 실패:', parseError);
				errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
			}
			throw new Error(errorData.message || `서버 오류: ${response.status}`);
		}

		const result = await response.json();
		console.log('✅ Invoice 저장 성공:', result);
		return { success: true };
	} catch (error) {
		console.error('💥 Invoice 저장 오류:', error);
		console.error('🔍 오류 상세 정보:', {
			message: error instanceof Error ? error.message : '알 수 없는 오류',
			stack: error instanceof Error ? error.stack : undefined,
			invoiceData: invoiceData
		});
		return {
			success: false,
			error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
		};
	}
}

// ===== PDF DATA PREPARATION =====
export function preparePdfSaveData(
	fileName: string,
	filePath: string,
	fileSize: number,
	pageType: InvoicePageType,
	companyName: string,
	invoiceDate: string,
	generatedBy?: string,
	corp_id?: number,
	invoiceId?: number
): PdfSaveData {
	console.log('🔧 [PDF 데이터 준비] 함수 시작');
	console.log('📄 입력 파라미터:', {
		fileName,
		filePath,
		fileSize,
		pageType,
		companyName,
		invoiceDate,
		generatedBy,
		corp_id,
		invoiceId
	});

	// 현재 스토어 데이터를 가져오기 위해 getter 함수 사용
	const getCurrentStoreData = () => {
		console.log('📊 스토어 데이터 수집 중...');
		if (!invoiceService) {
			console.warn('⚠️ invoiceService가 없습니다.');
			return null;
		}

		const storeData = {
			corpInfo: invoiceService.getCorpInfo(),
			dateInfo: invoiceService.getDateInfo(),
			invoiceMoney: 0, // 실제 값은 별도로 전달받아야 함
			deliveryInvoice: 0, // 실제 값은 별도로 전달받아야 함
			totalPrice: invoiceService.calculateTotalPrice(),
			deliveryCount: invoiceService.calculateDeliveryCount(),
			deliveryDiscount: invoiceService.calculateDeliveryDiscount(),
			pageType,
			fileName
		};

		console.log('📋 수집된 스토어 데이터:', storeData);
		return storeData;
	};

	const currentData = getCurrentStoreData();

	const result: PdfSaveData = {
		fileName,
		filePath,
		fileSize,
		pdfType: pageType === InvoicePageType.CAP ? 'dentistry' : 'lab',
		companyName,
		invoiceDate,
		invoiceData: currentData,
		generatedBy,
		corp_id,
		invoiceId
	};

	console.log('✅ 최종 PDF 저장 데이터:', result);
	return result;
}

// ===== RESET FUNCTION =====
export function resetInvoiceStore() {
	invoiceMoney.set(0);
	deliveryInvoice.set(0);
	showPdfRenderer.set(false);
	invoiceService = null;
}
