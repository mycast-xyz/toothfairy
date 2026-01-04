/**
 * 인보이스 페이지 타입 정의
 */
export enum InvoicePageType {
	CAP = 'cap',
	CUSTOM = 'custom',
	PARTIAL = 'partial',
	ALLONFOUR = 'allonfour',
	DENTISTRY = 'dentistry'
}

/**
 * 인보이스 페이지 정보 인터페이스
 */
export interface InvoicePageInfo {
	type: InvoicePageType;
	name: string;
	description: string;
	route: string;
}

/**
 * 인보이스 페이지 정보 맵
 */
export const INVOICE_PAGE_INFO: Record<InvoicePageType, InvoicePageInfo> = {
	[InvoicePageType.CAP]: {
		type: InvoicePageType.CAP,
		name: '캡 인보이스',
		description: '캡 제품 청구서',
		route: '/invoice/cap'
	},
	[InvoicePageType.CUSTOM]: {
		type: InvoicePageType.CUSTOM,
		name: '커스텀 인보이스',
		description: '커스텀 제품 청구서',
		route: '/invoice/custom'
	},
	[InvoicePageType.PARTIAL]: {
		type: InvoicePageType.PARTIAL,
		name: '부분 인보이스',
		description: '부분 제품 청구서',
		route: '/invoice/partial'
	},
	[InvoicePageType.ALLONFOUR]: {
		type: InvoicePageType.ALLONFOUR,
		name: '올인원 인보이스',
		description: '올인원 제품 청구서',
		route: '/invoice/all-in-one'
	}
};

/**
 * PDF 렌더링 요청 데이터 인터페이스
 */
export interface PdfRenderRequest {
	pageType: InvoicePageType;
	data: any;
	options?: {
		fileName?: string;
		format?: 'A4' | 'A3' | 'Letter';
		orientation?: 'portrait' | 'landscape';
		scale?: number;
	};
}

/**
 * PDF 렌더링 응답 데이터 인터페이스
 */
export interface PdfRenderResponse {
	success: boolean;
	fileName?: string;
	downloadUrl?: string;
	fileSize?: number;
	pageType?: InvoicePageType;
	timestamp?: string;
	error?: string;
}
