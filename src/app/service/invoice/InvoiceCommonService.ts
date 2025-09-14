// ===== TYPES =====
export interface StlListData {
	printDate: string;
	normalUnitNum: number;
	remakeUnitNum: number;
}

export interface CorpInfo {
	corp_id?: number;
	corp_name?: string;
	companyname?: string;
	deliveryFee: number;
	deliveryType: string;
	stlListData?: StlListData[];
	invoice?: any[];
	normalPrice?: number;
	remakePrice?: number;
	totalNormalUnitNum: number;
	totalRemakeUnitNum: number;
	totalNormalPrice: number;
	totalRemakePrice: number;
	totalPrice: number;
	deliveryInvoice: number;
	prices?: {
		custom?: { normal: number; remake: number };
		partial?: { normal: number; remake: number };
	};
}

export interface DateInfo {
	date: string;
	day: number;
	dayOfWeek: string;
	invoice: any;
	deliveryStandard?: string | null;
	stlListData?: any;
	courierFee?: number;
}

export interface CalendarInfo {
	dayOfWeek: number;
	isHoliday?: boolean;
}

// ===== CONSTANTS =====
export const SUPPLIER_INFO = {
	companyName: '공백치과기공소',
	businessNumber: '217-99-34005',
	address: '서울시 금천구 가산디지털1로 16, 6층 619호',
	contactPerson: '문정준',
	phone: '010-4085-5008',
	account: '110533422050, 신한은행 공백치과기공소 문정준'
};

export const DELIVERY_FEE_STANDARDS = [
	'배송 비용 기준',
	'5회 미만 배송 : 0% 기준',
	'10회 미만 배송 : 50% 기준',
	'200u 이상: 0% 기준',
	'150u 이상: 25% 기준',
	'100u 이상: 50% 기준',
	'50u 이상: 75% 기준',
	'50u 미만: 100% 기준'
];

export const DAYS_OF_WEEK = ['일', '월', '화', '수', '목', '금', '토'];

// ===== INVOICE COMMON SERVICE CLASS =====
export class InvoiceCommonService {
	private corpInfo: CorpInfo;
	private dateInfo: DateInfo[];
	private calendarData: any;
	private data: any;

	constructor(data: any) {
		this.data = data;
		this.calendarData = data.calendar || {};
		this.corpInfo = this.mapCorpInfo(data.info);
		this.dateInfo = this.generateDateInfo(data);
	}

	// ===== GETTERS =====
	getCorpInfo(): CorpInfo {
		return this.corpInfo;
	}

	getDateInfo(): DateInfo[] {
		return this.dateInfo;
	}

	getCalendarData(): any {
		return this.calendarData;
	}

	// ===== INITIALIZATION =====
	initialize(priceType: 'custom' | 'partial' | 'cap'): void {
		this.initializeInvoiceTotals();
		this.calculateUnitTotals();
		this.calculatePriceTotals(priceType);
		this.mapInvoiceData();
		this.calculateCourierFees();
		this.addDeliveryStandards();
	}

	// ===== UTILITY FUNCTIONS =====
	getCalendarInfo(date: string): CalendarInfo | null {
		if (this.calendarData.days && Array.isArray(this.calendarData.days)) {
			return this.calendarData.days.find((day: any) => day.date === date) || null;
		}
		return null;
	}

	getRowClass(calendarInfo: CalendarInfo | null): string {
		if (calendarInfo?.dayOfWeek === 6) return 'bg-blue-100'; // 토요일
		if (calendarInfo?.dayOfWeek === 0 || calendarInfo?.isHoliday) return 'bg-red-100'; // 일요일 또는 휴일
		return '';
	}

	getPdfFileName(): string {
		return `${this.data.param?.date || '2024-01'}-${this.corpInfo.corp_name || this.corpInfo.companyname || 'company'}-${this.data.param?.item || 'item'}.pdf`;
	}

	// ===== CALCULATION FUNCTIONS =====
	private initializeInvoiceTotals(): void {
		this.corpInfo.totalNormalUnitNum = 0;
		this.corpInfo.totalRemakeUnitNum = 0;
		this.corpInfo.totalNormalPrice = 0;
		this.corpInfo.totalRemakePrice = 0;
		this.corpInfo.totalPrice = 0;
		this.corpInfo.deliveryInvoice = 0;
	}

	private calculateUnitTotals(): void {
		if (this.corpInfo.stlListData && Array.isArray(this.corpInfo.stlListData)) {
			this.corpInfo.stlListData.forEach((item: any) => {
				this.corpInfo.totalNormalUnitNum += item.normalUnitNum || 0;
				this.corpInfo.totalRemakeUnitNum += item.remakeUnitNum || 0;
			});
		}
	}

	private calculatePriceTotals(priceType: 'custom' | 'partial' | 'cap'): void {
		if (this.corpInfo.normalPrice && this.corpInfo.remakePrice) {
			this.corpInfo.totalNormalPrice = this.corpInfo.totalNormalUnitNum * this.corpInfo.normalPrice;
			this.corpInfo.totalRemakePrice = this.corpInfo.totalRemakeUnitNum * this.corpInfo.remakePrice;
		}
	}

	getInvoicePrices(
		invoice: any,
		type: string,
		priceType: 'custom' | 'partial' | 'cap' | 'allonfour'
	): number {
		if (!invoice) return 0;

		if (this.corpInfo.normalPrice && this.corpInfo.remakePrice) {
			if (type === 'normal') return invoice * this.corpInfo.normalPrice;
			if (type === 'remake') return invoice * this.corpInfo.remakePrice;
		}

		return 0;
	}

	calculateDeliveryCount(): number {
		if (this.corpInfo.stlListData && Array.isArray(this.corpInfo.stlListData)) {
			return this.corpInfo.stlListData.filter(
				(item: any) => item.normalUnitNum || item.remakeUnitNum
			).length;
		} else if (this.corpInfo.invoice && Array.isArray(this.corpInfo.invoice)) {
			return this.corpInfo.invoice.filter((item: any) => item.normalUnitNum || item.remakeUnitNum)
				.length;
		}
		return 0;
	}

	// ===== UTILITY METHODS =====
	private normalizeString(str: string): string {
		if (!str || typeof str !== 'string') return '';
		return str.normalize('NFC').trim();
	}

	private isSenderMatch(sender: string, targetGroup: string[]): boolean {
		const normalizedSender = this.normalizeString(sender).toLowerCase();

		return targetGroup.some((target) => {
			const normalizedTarget = this.normalizeString(target).toLowerCase();
			return normalizedSender === normalizedTarget;
		});
	}

	private calculateCourierFees(): void {
		if (this.corpInfo.deliveryType === 'courier' && this.corpInfo.deliveryFee > 0) {
			this.dateInfo.forEach((dateItem) => {
				if (
					dateItem.stlListData &&
					(dateItem.stlListData.normalUnitNum > 0 || dateItem.stlListData.remakeUnitNum > 0)
				) {
					dateItem.courierFee = this.corpInfo.deliveryFee;
				} else {
					dateItem.courierFee = 0;
				}
			});
		} else {
			this.dateInfo.forEach((dateItem) => {
				dateItem.courierFee = 0;
			});
		}
	}

	calculateDeliveryInvoice(): number {
		if (!this.corpInfo) return 0;

		// deliveryType이 "courier"인 경우 택배비 합계 반환
		if (this.corpInfo.deliveryType === 'courier') {
			return this.dateInfo.reduce((total, dateItem) => total + (dateItem.courierFee || 0), 0);
		}

		// 기존 배송비 계산 로직 (일반 배송)
		const deliveryCount = this.calculateDeliveryCount();
		const baseFee = this.corpInfo.deliveryFee || 0;

		if (deliveryCount < 5) return 0; // 무료 배송
		if (deliveryCount < 10) return baseFee * 0.5; // 50% 할인
		if (this.corpInfo.totalNormalUnitNum >= 200) return 0; // 무료 배송
		if (this.corpInfo.totalNormalUnitNum >= 150) return baseFee * 0.25; // 25% 할인
		if (this.corpInfo.totalNormalUnitNum >= 100) return baseFee * 0.5; // 50% 할인
		if (this.corpInfo.totalNormalUnitNum >= 50) return baseFee * 0.75; // 25% 할인
		return baseFee; // 기본 배송비
	}

	calculateTotalPrice(): number {
		return (
			(this.corpInfo.totalNormalPrice || 0) +
			(this.corpInfo.totalRemakePrice || 0) +
			(this.corpInfo.deliveryInvoice || 0)
		);
	}

	calculateDeliveryDiscount(): number {
		const originalFee = this.corpInfo.deliveryFee;
		const finalFee = this.corpInfo.deliveryInvoice;

		if (originalFee === 0 || finalFee === 0) return 100;

		const discountRate = ((originalFee - finalFee) / originalFee) * 100;
		return Math.round(discountRate);
	}

	// ===== DATA MAPPING =====
	private mapCorpInfo(rawData: any): CorpInfo {
		const info = rawData || {};

		return {
			corp_id: info.id || 0,
			corp_name: info.corp_name || '',
			companyname: info.companyname || '',
			deliveryFee: Math.round(Number(info.dentalLabPriceData?.[0]?.shipping_price) || 0),
			deliveryType: info.dentalLabPriceData?.[0]?.shipping_type || '',
			stlListData: info.stlListData || [],
			invoice: info.invoice || [],
			normalPrice: Math.round(Number(info.dentalLabPriceData?.[0]?.print_type?.normalPrice) || 0),
			remakePrice: Math.round(Number(info.dentalLabPriceData?.[0]?.print_type?.remakePrice) || 0),
			prices: info.prices || {},
			totalNormalUnitNum: 0,
			totalRemakeUnitNum: 0,
			totalNormalPrice: 0,
			totalRemakePrice: 0,
			totalPrice: 0,
			deliveryInvoice: 0
		};
	}

	// ===== DATE INFO GENERATION =====
	private generateDateInfo(data: any): DateInfo[] {
		const dateString = data.param?.date || '2024-01';
		const [year, month] = dateString.split('-').map(Number);

		return Array.from({ length: new Date(year, month, 0).getDate() }, (_, i) => {
			const date = new Date(year, month - 1, i + 1);
			return {
				date: `${year}-${String(month).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`,
				day: i + 1,
				dayOfWeek: DAYS_OF_WEEK[date.getDay()],
				invoice: null as any,
				deliveryStandard: null as string | null,
				stlListData: null as any,
				courierFee: 0
			};
		});
	}

	// ===== INVOICE DATA MAPPING =====
	private mapInvoiceData(): void {
		// CAP 타입의 경우 stlListData 사용
		if (this.corpInfo.stlListData && Array.isArray(this.corpInfo.stlListData)) {
			this.dateInfo.forEach((dateItem) => {
				const matchingInvoice = this.corpInfo.stlListData!.find(
					(inv: StlListData) => inv.printDate === dateItem.date
				);
				if (matchingInvoice) {
					dateItem.stlListData = matchingInvoice;
				}
			});
		}
		// CUSTOM/PARTIAL 타입의 경우 invoice 사용
		else if (this.corpInfo.invoice && Array.isArray(this.corpInfo.invoice)) {
			this.dateInfo.forEach((dateItem) => {
				const matchingInvoice = this.corpInfo.invoice!.find(
					(inv: any) => inv.printDate === dateItem.date
				);
				if (matchingInvoice) {
					dateItem.invoice = matchingInvoice;
				}
			});
		}
	}

	// ===== DELIVERY STANDARDS =====
	private addDeliveryStandards(): void {
		if (this.corpInfo.deliveryFee > 0 && this.corpInfo.deliveryType !== 'courier') {
			DELIVERY_FEE_STANDARDS.reverse().forEach((standard, index) => {
				const lastIndex = this.dateInfo.length - 1 - index;
				if (lastIndex >= 0) {
					if (!this.dateInfo[lastIndex].invoice) {
						this.dateInfo[lastIndex].invoice = {};
					}
					this.dateInfo[lastIndex].deliveryStandard = standard;
				}
			});
		}
	}

	// ===== FILE INFO PROCESSING =====
	getFileInfo(fileName: any, sender: string) {
		// 파일 배열 초기화
		const allFiles: any[] = [];

		// 파일 객체에서 re와 ok 배열 병합
		if (fileName && typeof fileName === 'object') {
			if (Array.isArray(fileName.re)) allFiles.push(...fileName.re);
			if (Array.isArray(fileName.ok)) allFiles.push(...fileName.ok);
		}

		const result = {
			name: allFiles,
			sender: sender,
			types: [] as string[]
		};

		// 발송처별 파일 처리 (유니코드 안전한 매칭)
		const senderGroups = {
			ire: [
				'이레',
				'남원',
				'남원이레',
				'남원이레pa',
				'남원이레PA',
				'남원 이레',
				'남원 이레 pa',
				'남원 이레 PA',
				'이레pa',
				'이레PA',
				'이레 pa',
				'이레 PA'
			],
			ijung: ['이정', '이정pa', '이정 pa', '이정 PA', '이정PA'],
			void: ['공백', '공백pa', '공백 pa', '공백 PA', '공백PA'],
			top: ['가산탑pa', '가산탑 PA', '가산탑PA', '가산탑 pa']
		};

		// 이레/남원 그룹 처리
		if (this.isSenderMatch(sender, senderGroups.ire)) {
			allFiles.forEach((file) => {
				if (!file || typeof file !== 'string') return;

				// 파일명 정규화
				const normalizedFile = this.normalizeString(file);
				const parts = normalizedFile.split('_').filter((part) => part && part.trim());

				if (parts.length >= 3) {
					const typePart = this.normalizeString(parts[2]);
					if (typePart) {
						result.types.push(typePart);
					}
				}
			});
		}
		// 이정 그룹 처리
		else if (this.isSenderMatch(sender, senderGroups.ijung)) {
			allFiles.forEach((file) => {
				if (!file || typeof file !== 'string') return;

				// 파일명 정규화
				const normalizedFile = this.normalizeString(file);

				// @ 기호로 구분하여 앞부분만 처리
				let processFile = normalizedFile;
				if (normalizedFile.includes('@')) {
					processFile = normalizedFile.split('@')[1]; // @ 앞부분만 추출
				}

				const parts = processFile.split('_').filter((part) => part && part.trim());

				if (parts.length >= 3) {
					// 숫자 제거 후 조합
					const combinedPart = (parts[0] + '_' + parts[1]).replace(/[0-9]/g, '');
					const normalizedCombined = this.normalizeString(combinedPart);

					// 리메이크 키워드 검사 (유니코드 안전)
					const isRemake = ['re', '리메이크', '리메'].some((keyword) => {
						const normalizedKeyword = this.normalizeString(keyword).toLowerCase();
						return normalizedFile.toLowerCase().includes(normalizedKeyword);
					});

					if (normalizedCombined) {
						result.types.push(isRemake ? `${normalizedCombined}(re)` : normalizedCombined);
					}
				}
			});
		}

		// 중복 제거 및 정렬
		result.types = [...new Set(result.types)].sort();

		return result;
	}
}

// ===== LEGACY FUNCTION EXPORTS (for backward compatibility) =====
export function getCalendarInfo(calendarData: any, date: string): CalendarInfo | null {
	if (calendarData.days && Array.isArray(calendarData.days)) {
		return calendarData.days.find((day: any) => day.date === date) || null;
	}
	return null;
}

export function getRowClass(calendarInfo: CalendarInfo | null): string {
	if (calendarInfo?.dayOfWeek === 6) return 'bg-blue-100'; // 토요일
	if (calendarInfo?.dayOfWeek === 0 || calendarInfo?.isHoliday) return 'bg-red-100'; // 일요일 또는 휴일
	return '';
}

export function getPdfFileName(data: any, corpInfo: CorpInfo): string {
	return `${data.param?.date || '2024-01'}-${corpInfo.corp_name || corpInfo.companyname || 'company'}-${data.param?.item || 'item'}.pdf`;
}

export function getFileInfo(fileName: any, sender: string) {
	const allFiles: any[] = [];

	if (fileName && typeof fileName === 'object') {
		if (Array.isArray(fileName.re)) allFiles.push(...fileName.re);
		if (Array.isArray(fileName.ok)) allFiles.push(...fileName.ok);
	}

	const result = {
		name: allFiles,
		sender: sender,
		types: [] as string[]
	};

	const senderGroups = {
		ire: [
			'이레',
			'남원',
			'남원이레',
			'남원이레pa',
			'남원이레PA',
			'남원 이레',
			'남원 이레 pa',
			'남원 이레 PA',
			'이레pa',
			'이레PA',
			'이레 pa',
			'이레 PA'
		],
		ijung: ['이정', '이정pa', '이정 pa', '이정 PA', '이정PA']
	};

	if (senderGroups.ire.includes(sender)) {
		allFiles.forEach((file) => {
			const parts = file.split('_').filter(Boolean);
			if (parts.length >= 3) result.types.push(parts[2]);
		});
	} else if (senderGroups.ijung.includes(sender)) {
		allFiles.forEach((file) => {
			const parts = file.split('_').filter(Boolean);
			if (parts.length >= 3) {
				const combinedPart = (parts[0] + '_' + parts[1]).replace(/[0-9]/g, '');
				const isRemake = ['re', '리메이크', '리메'].some((keyword) =>
					file.toLowerCase().includes(keyword)
				);
				result.types.push(isRemake ? `${combinedPart}(re)` : combinedPart);
			}
		});
	}

	return result;
}
