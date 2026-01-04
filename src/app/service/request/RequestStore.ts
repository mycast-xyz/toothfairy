import { writable } from 'svelte/store';
import { dentalApiService, type DentalClinic, type TreatmentItem } from './DentalApiService';

/**
 * 치료폼 인터페이스
 */
export interface TreatmentForm {
	id: string;
	treatmentType: string;
	upperJaw: string;
	lowerJaw: string;
	isRemake: boolean;
	price: number;
	prkey: string;
	adjustmentAmount: number;
}

/**
 * 참고 이미지 인터페이스
 */
export interface ReferenceImage {
	id: string;
	name: string;
	dataUrl: string;
	file: File;
}

/**
 * 의뢰서 정보 인터페이스
 */
export interface RequestInfo {
	requestId: string; // 의뢰서 ID (mmdd-count 형식)
	patientName: string;
	deliveryDate: string;
	dentalClinic: string;
	dentalClinicId: string; // 치과 ID 추가
	screenshotDataUrl: string;
	screenshotFile: string;
	requestDetails: string;
	userUuid: string; // 사용자 고유번호 추가
	referenceImages: ReferenceImage[]; // 참고 이미지 배열 추가
}

/**
 * 의뢰서 정보 초기값
 */
const initialRequestInfo: RequestInfo = {
	requestId: '',
	patientName: '',
	deliveryDate: '',
	dentalClinic: 'test',
	dentalClinicId: '',
	screenshotDataUrl: '',
	screenshotFile: 'test.jpg',
	requestDetails: '',
	userUuid: '',
	referenceImages: []
};

/**
 * 의뢰서 정보를 관리하는 스토어 클래스
 */
export class RequestStore {
	#requestInfo = writable<RequestInfo>(initialRequestInfo);
	#dentalClinicList = writable<DentalClinic[]>([]);
	#isLoadingDentalList = writable<boolean>(false);
	#treatmentItems = writable<TreatmentItem[]>([]);
	#isLoadingTreatmentItems = writable<boolean>(false);
	#treatmentForms = writable<TreatmentForm[]>([]);
	#editingFormId = writable<string | null>(null);

	constructor() {
		// 생성자에서는 비동기 작업을 하지 않음
		// requestId는 필요할 때 generateAndSetRequestId()를 호출하여 생성

		// 초기 requestId 생성 (비동기이지만 에러가 발생해도 서버가 중단되지 않음)
		this.initializeRequestId();
	}

	/**
	 * 초기 requestId 생성 (비동기)
	 */
	private async initializeRequestId() {
		try {
			await this.generateAndSetRequestId();
		} catch (error) {
			// 초기화 실패해도 서버가 중단되지 않도록 에러를 무시
			console.warn('초기 requestId 생성 실패, 나중에 수동으로 생성 가능:', error);
		}
	}

	/**
	 * 의뢰서 정보 스토어 getter
	 */
	get requestInfo() {
		return this.#requestInfo;
	}

	/**
	 * 치과 리스트 스토어 getter
	 */
	get dentalClinicList() {
		return this.#dentalClinicList;
	}

	/**
	 * 치과 리스트 로딩 상태 getter
	 */
	get isLoadingDentalList() {
		return this.#isLoadingDentalList;
	}

	/**
	 * 치료 종목 리스트 스토어 getter
	 */
	get treatmentItems() {
		return this.#treatmentItems;
	}

	/**
	 * 치료 종목 로딩 상태 getter
	 */
	get isLoadingTreatmentItems() {
		return this.#isLoadingTreatmentItems;
	}

	/**
	 * 치료폼 리스트 스토어 getter
	 */
	get treatmentForms() {
		return this.#treatmentForms;
	}

	/**
	 * 수정 중인 폼 ID 스토어 getter
	 */
	get editingFormId() {
		return this.#editingFormId;
	}

	/**
	 * 의뢰서 정보 전체 설정
	 * @param requestInfo 새로운 의뢰서 정보
	 */
	setRequestInfo(requestInfo: RequestInfo) {
		this.#requestInfo.set(requestInfo);
	}

	/**
	 * 의뢰서 정보 부분 업데이트
	 * @param partialRequestInfo 업데이트할 부분 정보
	 */
	updateRequestInfo(partialRequestInfo: Partial<RequestInfo>) {
		this.#requestInfo.update((current) => ({
			...current,
			...partialRequestInfo
		}));
	}

	/**
	 * 환자 이름 설정
	 * @param name 환자 이름
	 */
	setPatientName(name: string) {
		this.#requestInfo.update((current) => ({
			...current,
			patientName: name
		}));
	}

	/**
	 * 납품 요구일 설정
	 * @param date 납품 요구일 (YYYY-MM-DD 형식)
	 */
	setDeliveryDate(date: string) {
		this.#requestInfo.update((current) => ({
			...current,
			deliveryDate: date
		}));
	}

	/**
	 * 의뢰 치과 설정
	 * @param clinic 의뢰 치과명
	 */
	setDentalClinic(clinic: string) {
		this.#requestInfo.update((current) => ({
			...current,
			dentalClinic: clinic
		}));
	}

	/**
	 * 의뢰 치과 ID 설정
	 * @param clinicId 치과 ID
	 */
	setDentalClinicId(clinicId: string) {
		this.#requestInfo.update((current) => ({
			...current,
			dentalClinicId: clinicId
		}));
	}

	/**
	 * 치과 ID와 이름을 함께 설정
	 * @param clinicId 치과 ID
	 * @param clinicName 치과 이름
	 */
	setDentalClinicWithId(clinicId: string, clinicName: string) {
		this.#requestInfo.update((current) => ({
			...current,
			dentalClinicId: clinicId,
			dentalClinic: clinicName
		}));

		// 치과가 선택되면 해당 치과의 치료 종목을 자동으로 로드
		this.loadTreatmentItems(clinicId);
	}

	/**
	 * 스크린샷 데이터 설정
	 * @param dataUrl base64 데이터 URL
	 * @param fileName 파일명
	 */
	setScreenshot(dataUrl: string, fileName: string) {
		this.#requestInfo.update((current) => ({
			...current,
			screenshotDataUrl: dataUrl,
			screenshotFile: fileName
		}));
	}

	/**
	 * 스크린샷 데이터 초기화
	 */
	clearScreenshot() {
		this.#requestInfo.update((current) => ({
			...current,
			screenshotDataUrl: '',
			screenshotFile: 'test.jpg'
		}));
	}

	/**
	 * 의뢰 사항 설정
	 * @param details 의뢰 사항 내용
	 */
	setRequestDetails(details: string) {
		this.#requestInfo.update((current) => ({
			...current,
			requestDetails: details
		}));
	}

	/**
	 * 사용자 UUID 설정
	 * @param uuid 사용자 고유번호
	 */
	setUserUuid(uuid: string) {
		this.#requestInfo.update((current) => ({
			...current,
			userUuid: uuid
		}));
	}

	/**
	 * 참고 이미지 추가
	 * @param image 참고 이미지 객체
	 */
	addReferenceImage(image: ReferenceImage) {
		this.#requestInfo.update((current) => ({
			...current,
			referenceImages: [...current.referenceImages, image]
		}));
	}

	/**
	 * 참고 이미지 제거
	 * @param imageId 제거할 이미지 ID
	 */
	removeReferenceImage(imageId: string) {
		this.#requestInfo.update((current) => ({
			...current,
			referenceImages: current.referenceImages.filter((img) => img.id !== imageId)
		}));
	}

	/**
	 * 참고 이미지 리스트 초기화
	 */
	clearReferenceImages() {
		this.#requestInfo.update((current) => ({
			...current,
			referenceImages: []
		}));
	}

	/**
	 * 의뢰서 정보 초기화
	 */
	resetRequestInfo() {
		this.#requestInfo.set(initialRequestInfo);
	}

	/**
	 * 의뢰서 정보 초기화 및 requestId 생성
	 */
	async resetRequestInfoWithId() {
		// 안전한 requestId 생성 (에러 시 기본값 반환)
		const requestId = await this.generateRequestIdSafe();
		this.#requestInfo.set({
			...initialRequestInfo,
			requestId: requestId
		});
	}

	/**
	 * requestId 생성 (오늘 날짜 + count)
	 * @returns Promise<string> 생성된 requestId (mmdd-count 형식)
	 */
	async generateRequestId(): Promise<string> {
		try {
			// 오늘 날짜를 MMDD 형식으로 변환
			const today = new Date();
			const month = String(today.getMonth() + 1).padStart(2, '0');
			const day = String(today.getDate()).padStart(2, '0');
			const mmdd = `${month}${day}`;

			// 오늘 날짜를 YYYY-MM-DD 형식으로 변환 (API 호출용)
			const year = today.getFullYear();
			const startDate = `${year}-${month}-${day}`;

			// API에서 count 가져오기
			const count = await dentalApiService.getRequestCount(startDate);

			// mmdd-count 형식으로 requestId 생성
			const requestId = `${mmdd}-${count + 1}`;

			console.log('RequestId 생성:', requestId, '(날짜:', startDate, ', count:', count, ')');
			return requestId;
		} catch (error) {
			console.error('RequestId 생성 실패:', error);

			// 인증 오류인 경우 에러를 다시 던져서 상위에서 처리하도록 함
			if (error instanceof Error && error.message.includes('인증')) {
				console.error('인증 오류로 인한 RequestId 생성 실패');
				throw error;
			}

			// 기타 오류 시 기본값 반환 (오늘 날짜 + 1)
			const today = new Date();
			const month = String(today.getMonth() + 1).padStart(2, '0');
			const day = String(today.getDate()).padStart(2, '0');
			return `${month}${day}-1`;
		}
	}

	/**
	 * 안전한 requestId 생성 (에러 시 기본값 반환)
	 * @returns Promise<string> 생성된 requestId 또는 기본값
	 */
	async generateRequestIdSafe(): Promise<string> {
		try {
			return await this.generateRequestId();
		} catch (error) {
			console.error('RequestId 생성 실패, 기본값 사용:', error);
			// 오류 시 기본값 반환 (오늘 날짜 + 1)
			const today = new Date();
			const month = String(today.getMonth() + 1).padStart(2, '0');
			const day = String(today.getDate()).padStart(2, '0');
			return `${month}${day}-1`;
		}
	}

	/**
	 * requestId 설정
	 * @param requestId 설정할 requestId
	 */
	setRequestId(requestId: string) {
		this.#requestInfo.update((current) => ({
			...current,
			requestId: requestId
		}));
	}

	/**
	 * requestId 자동 생성 및 설정
	 */
	async generateAndSetRequestId() {
		const requestId = await this.generateRequestIdSafe();
		this.setRequestId(requestId);
		return requestId;
	}

	/**
	 * 기본 납품 요구일 생성 (오늘로부터 7일 후)
	 * @returns YYYY-MM-DD 형식의 날짜 문자열
	 */
	getDefaultDeliveryDate(): string {
		const today = new Date();
		today.setDate(today.getDate() + 7);
		const year = today.getFullYear();
		const month = String(today.getMonth() + 1).padStart(2, '0');
		const day = String(today.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	}

	/**
	 * UUID 유효성 검증
	 * @param uuid 검증할 UUID
	 * @returns 유효한 UUID인지 여부
	 */
	isValidUUID(uuid: string): boolean {
		const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
		return uuidRegex.test(uuid);
	}

	/**
	 * 의뢰서 데이터 검증
	 * @returns 검증 결과와 오류 메시지
	 */
	validateRequestInfo(): { isValid: boolean; errors: string[] } {
		const errors: string[] = [];

		// 현재 스토어 값 가져오기
		let currentInfo: RequestInfo = initialRequestInfo;
		this.#requestInfo.subscribe((info) => {
			currentInfo = info;
		})();

		if (!currentInfo.patientName.trim()) {
			errors.push('환자 이름을 입력해주세요.');
		}

		if (!currentInfo.deliveryDate) {
			errors.push('납품 요구일을 선택해주세요.');
		}

		if (!currentInfo.dentalClinic.trim()) {
			errors.push('의뢰 치과를 입력해주세요.');
		}

		if (!currentInfo.dentalClinicId || currentInfo.dentalClinicId.trim() === '') {
			errors.push('의뢰 치과를 선택해주세요.');
		}

		if (!currentInfo.screenshotDataUrl) {
			errors.push('스크린샷을 촬영해주세요.');
		}

		// UUID가 없으면 자동 생성
		if (!currentInfo.userUuid.trim()) {
			currentInfo.userUuid = crypto.randomUUID();
			this.setUserUuid(currentInfo.userUuid);
		}

		return {
			isValid: errors.length === 0,
			errors
		};
	}

	/**
	 * 치과 리스트를 가져옵니다
	 * @param classification 분류 (기본값: '치과')
	 */
	async loadDentalClinicList(classification: string = '치과') {
		this.#isLoadingDentalList.set(true);
		try {
			const clinics = await dentalApiService.getDentalClinicList(classification);
			this.#dentalClinicList.set(clinics);
		} catch (error) {
			console.error('치과 리스트 로드 실패:', error);
			this.#dentalClinicList.set([]);
		} finally {
			this.#isLoadingDentalList.set(false);
		}
	}

	/**
	 * 치과 리스트를 초기화합니다
	 */
	clearDentalClinicList() {
		this.#dentalClinicList.set([]);
	}

	/**
	 * 치료 종목을 가져옵니다
	 * @param dentalClinicId 치과 ID
	 */
	async loadTreatmentItems(dentalClinicId: string) {
		if (!dentalClinicId || dentalClinicId.trim() === '') {
			console.warn('치과 ID가 없어서 치료 종목을 로드할 수 없습니다.');
			this.#treatmentItems.set([]);
			return;
		}

		this.#isLoadingTreatmentItems.set(true);
		try {
			const treatmentItems = await dentalApiService.getTreatmentItems(dentalClinicId);
			this.#treatmentItems.set(treatmentItems);
		} catch (error) {
			console.error('치료 종목 로드 실패:', error);
			this.#treatmentItems.set([]);
		} finally {
			this.#isLoadingTreatmentItems.set(false);
		}
	}

	/**
	 * 치료 종목 리스트를 초기화합니다
	 */
	clearTreatmentItems() {
		this.#treatmentItems.set([]);
	}

	/**
	 * 치료폼 추가
	 * @param treatmentForm 추가할 치료폼
	 */
	addTreatmentForm(treatmentForm: TreatmentForm) {
		this.#treatmentForms.update((forms) => [...forms, treatmentForm]);
	}

	/**
	 * 치료폼 업데이트
	 * @param id 수정할 치료폼 ID
	 * @param updatedForm 업데이트된 치료폼 데이터
	 */
	updateTreatmentForm(id: string, updatedForm: Partial<TreatmentForm>) {
		this.#treatmentForms.update((forms) =>
			forms.map((form) => (form.id === id ? { ...form, ...updatedForm } : form))
		);
	}

	/**
	 * 치료폼 삭제
	 * @param id 삭제할 치료폼 ID
	 */
	removeTreatmentForm(id: string) {
		this.#treatmentForms.update((forms) => forms.filter((form) => form.id !== id));
	}

	/**
	 * 치료폼 리스트 전체 설정
	 * @param forms 새로운 치료폼 리스트
	 */
	setTreatmentForms(forms: TreatmentForm[]) {
		this.#treatmentForms.set(forms);
	}

	/**
	 * 치료폼 리스트 초기화
	 */
	clearTreatmentForms() {
		this.#treatmentForms.set([]);
		this.#editingFormId.set(null);
	}

	/**
	 * 수정 모드 시작
	 * @param formId 수정할 폼 ID
	 */
	startEditing(formId: string) {
		this.#editingFormId.set(formId);
	}

	/**
	 * 수정 모드 종료
	 */
	stopEditing() {
		this.#editingFormId.set(null);
	}

	/**
	 * 특정 치료폼 가져오기
	 * @param id 치료폼 ID
	 * @returns 해당 치료폼 또는 null
	 */
	getTreatmentFormById(id: string): TreatmentForm | null {
		let result: TreatmentForm | null = null;
		this.#treatmentForms.subscribe((forms) => {
			result = forms.find((form) => form.id === id) || null;
		})();
		return result;
	}

	/**
	 * 치료폼 총 금액 계산
	 * @returns 총 금액 정보
	 */
	calculateTotalAmount(): {
		totalAmount: number;
		totalAdjustment: number;
		totalItems: number;
		baseAmount: number;
	} {
		let totalAmount = 0;
		let totalAdjustment = 0;
		let totalItems = 0;

		this.#treatmentForms.subscribe((forms) => {
			forms.forEach((form) => {
				// 치식 개수 계산 (간단한 버전)
				const upperTeeth = form.upperJaw
					? form.upperJaw.split(',').filter((t) => t.trim() !== '').length
					: 0;
				const lowerTeeth = form.lowerJaw
					? form.lowerJaw.split(',').filter((t) => t.trim() !== '').length
					: 0;
				const teethCount = upperTeeth + lowerTeeth;

				const baseAmount = form.price * teethCount;
				const adjustment = form.adjustmentAmount || 0;

				totalAmount += baseAmount + adjustment;
				totalAdjustment += adjustment;
				totalItems += teethCount;
			});
		})();

		return {
			totalAmount,
			totalAdjustment,
			totalItems,
			baseAmount: totalAmount - totalAdjustment
		};
	}

	/**
	 * 의뢰서 데이터 전송 준비
	 * @returns 전송용 데이터 객체
	 */
	getRequestData() {
		let currentInfo: RequestInfo = initialRequestInfo;
		this.#requestInfo.subscribe((info) => {
			currentInfo = info;
		})();

		return {
			...currentInfo,
			timestamp: new Date().toISOString(),
			uuid: crypto.randomUUID()
		};
	}

	/**
	 * 완료 시 모든 데이터 통합 가져오기
	 * @returns 완전한 의뢰서 데이터
	 */
	getCompleteRequestData() {
		let currentInfo: RequestInfo = initialRequestInfo;
		let currentTreatmentForms: TreatmentForm[] = [];

		this.#requestInfo.subscribe((info) => {
			currentInfo = info;
		})();

		this.#treatmentForms.subscribe((forms) => {
			currentTreatmentForms = forms;
		})();

		// UUID가 없으면 자동 생성
		if (!currentInfo.userUuid.trim()) {
			currentInfo.userUuid = crypto.randomUUID();
			this.setUserUuid(currentInfo.userUuid);
		}

		// 총 금액 계산
		const totalAmount = this.calculateTotalAmount();

		// requestInfo에 총 금액 정보 포함
		const enrichedRequestInfo = {
			...currentInfo,
			totalAmount: totalAmount.totalAmount,
			totalAdjustment: totalAmount.totalAdjustment,
			totalItems: totalAmount.totalItems,
			baseAmount: totalAmount.baseAmount
		};

		const completeData = {
			// 기본 의뢰서 정보 (총 금액 포함)
			requestInfo: enrichedRequestInfo,
			// 치료 정보
			treatmentForms: currentTreatmentForms,
			// 메타데이터
			metadata: {
				timestamp: new Date().toISOString(),
				requestId: crypto.randomUUID(),
				version: '1.0',
				status: 'completed'
			}
		};

		return completeData;
	}
}

// 싱글턴 인스턴스 생성 및 export
export const requestStore = new RequestStore();

// 스토어에서 직접 변수들을 export (InvoiceView 방식)
export const requestInfo = requestStore.requestInfo;
export const dentalClinicList = requestStore.dentalClinicList;
export const isLoadingDentalList = requestStore.isLoadingDentalList;
export const treatmentItems = requestStore.treatmentItems;
export const isLoadingTreatmentItems = requestStore.isLoadingTreatmentItems;
export const treatmentForms = requestStore.treatmentForms;
export const editingFormId = requestStore.editingFormId;
