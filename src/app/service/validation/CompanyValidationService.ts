import { toastStore } from '../ToastService';

export interface CompanyValidationResult {
	isValid: boolean;
	errors: string[];
	warnings: string[];
}

export class CompanyValidationService {
	/**
	 * 전체 회사 정보 검증
	 */
	static validateCompanyData(formData: any): CompanyValidationResult {
		const errors: string[] = [];
		const warnings: string[] = [];

		// 1. 기본 회사 정보 검증
		const basicValidation = this.validateBasicCompanyInfo(formData);
		errors.push(...basicValidation.errors);
		warnings.push(...basicValidation.warnings);

		// 2. 구분별 추가 정보 검증
		if (formData.classification === '기공소') {
			const labValidation = this.validateLabCompanyInfo(formData);
			errors.push(...labValidation.errors);
			warnings.push(...labValidation.warnings);
		} else if (formData.classification === '치과') {
			const dentalValidation = this.validateDentalCompanyInfo(formData);
			errors.push(...dentalValidation.errors);
			warnings.push(...dentalValidation.warnings);
		}

		// 3. 배송 정보 검증
		const shippingValidation = this.validateShippingInfo(formData);
		errors.push(...shippingValidation.errors);
		warnings.push(...shippingValidation.warnings);

		return {
			isValid: errors.length === 0,
			errors,
			warnings
		};
	}

	/**
	 * 기본 회사 정보 검증 (corp_client 테이블)
	 */
	private static validateBasicCompanyInfo(formData: any): CompanyValidationResult {
		const errors: string[] = [];
		const warnings: string[] = [];

		// 필수 필드 검증
		if (!formData.corpName || formData.corpName.trim() === '') {
			errors.push('회사명은 필수 입력 항목입니다.');
		} else if (formData.corpName.length > 200) {
			errors.push('회사명은 200자를 초과할 수 없습니다.');
		}

		if (!formData.classification || !['기공소', '치과'].includes(formData.classification)) {
			errors.push('구분은 "기공소" 또는 "치과" 중 하나를 선택해야 합니다.');
		}

		if (!formData.region || formData.region.trim() === '') {
			errors.push('지역은 필수 입력 항목입니다.');
		} else if (formData.region.length > 100) {
			errors.push('지역은 100자를 초과할 수 없습니다.');
		}

		if (!formData.address || formData.address.trim() === '') {
			errors.push('주소는 필수 입력 항목입니다.');
		}

		// 상세 주소는 선택사항이지만 입력 시 길이 제한
		if (formData.detailAddress && formData.detailAddress.trim() !== '') {
			if (formData.detailAddress.length > 100) {
				errors.push('상세 주소는 100자를 초과할 수 없습니다.');
			}
		}

		// 전체 주소 길이 체크 (기본 주소 + 쉼표 + 상세 주소)
		const totalAddressLength =
			formData.address.length + (formData.detailAddress ? formData.detailAddress.length + 2 : 0); // +2는 쉼표와 공백
		if (totalAddressLength > 200) {
			errors.push('전체 주소는 200자를 초과할 수 없습니다.');
		}

		if (!formData.phoneNumber || formData.phoneNumber.trim() === '') {
			errors.push('전화번호는 필수 입력 항목입니다.');
		} else if (formData.phoneNumber.length > 20) {
			errors.push('전화번호는 20자를 초과할 수 없습니다.');
		} else if (!/^[\d-]+$/.test(formData.phoneNumber.replace(/\s/g, ''))) {
			errors.push('전화번호는 숫자와 하이픈(-)만 입력 가능합니다.');
		}

		if (!formData.businessNumber || formData.businessNumber.trim() === '') {
			errors.push('사업자등록번호는 필수 입력 항목입니다.');
		} else if (formData.businessNumber.length > 20) {
			errors.push('사업자등록번호는 20자를 초과할 수 없습니다.');
		} else if (!this.isValidBusinessNumber(formData.businessNumber)) {
			warnings.push('사업자등록번호 형식이 올바르지 않습니다. (예: 111-22-33333)');
		}

		if (formData.email && formData.email.trim() !== '') {
			if (formData.email.length > 100) {
				errors.push('이메일은 100자를 초과할 수 없습니다.');
			} else if (!this.isValidEmail(formData.email)) {
				warnings.push('이메일 형식이 올바르지 않습니다.');
			}
		}

		return { isValid: errors.length === 0, errors, warnings };
	}

	/**
	 * 기공소 정보 검증 (dental_lab_price 테이블)
	 */
	private static validateLabCompanyInfo(formData: any): CompanyValidationResult {
		const errors: string[] = [];
		const warnings: string[] = [];

		// printType 검증
		if (
			!formData.printType ||
			!Array.isArray(formData.printType) ||
			formData.printType.length === 0
		) {
			errors.push('기공소는 최소 1개 이상의 출력물 종류를 선택해야 합니다.');
		} else {
			formData.printType.forEach((printType: any, index: number) => {
				if (!printType.type || printType.type.trim() === '') {
					errors.push(`출력물 종류 ${index + 1}의 이름이 입력되지 않았습니다.`);
				}

				if (
					!printType.normalPrice ||
					isNaN(Number(printType.normalPrice)) ||
					Number(printType.normalPrice) <= 0
				) {
					errors.push(`출력물 종류 ${index + 1}의 정상 가격이 올바르지 않습니다.`);
				}

				if (
					!printType.remakePrice ||
					isNaN(Number(printType.remakePrice)) ||
					Number(printType.remakePrice) <= 0
				) {
					errors.push(`출력물 종류 ${index + 1}의 리메이크 가격이 올바르지 않습니다.`);
				}

				// 가격 범위 검증
				const normalPrice = Number(printType.normalPrice);
				const remakePrice = Number(printType.remakePrice);
				if (normalPrice < remakePrice) {
					warnings.push(`출력물 종류 ${index + 1}의 정상 가격이 리메이크 가격보다 낮습니다.`);
				}
			});
		}

		return { isValid: errors.length === 0, errors, warnings };
	}

	/**
	 * 치과 정보 검증 (dental_clinic_price 테이블)
	 */
	private static validateDentalCompanyInfo(formData: any): CompanyValidationResult {
		const errors: string[] = [];
		const warnings: string[] = [];

		// priceData 검증
		if (
			!formData.priceData ||
			!Array.isArray(formData.priceData) ||
			formData.priceData.length === 0
		) {
			warnings.push(
				'치과는 수가 정보가 없어도 등록 가능하지만, 수가 정보를 추가하는 것을 권장합니다.'
			);
		} else {
			formData.priceData.forEach((priceItem: any, index: number) => {
				if (!priceItem.type || priceItem.type.trim() === '') {
					errors.push(`수가 항목 ${index + 1}의 치료 종류가 입력되지 않았습니다.`);
				}

				if (!priceItem.technicianname || priceItem.technicianname.trim() === '') {
					errors.push(`수가 항목 ${index + 1}의 기공명칭이 입력되지 않았습니다.`);
				}

				if (!priceItem.price || isNaN(Number(priceItem.price)) || Number(priceItem.price) < 0) {
					errors.push(`수가 항목 ${index + 1}의 가격이 올바르지 않습니다.`);
				}

				// 가격 범위 검증
				const price = Number(priceItem.price);
				if (price > 1000000) {
					warnings.push(`수가 항목 ${index + 1}의 가격이 1백만원을 초과합니다.`);
				}
			});
		}

		return { isValid: errors.length === 0, errors, warnings };
	}

	/**
	 * 배송 정보 검증
	 */
	private static validateShippingInfo(formData: any): CompanyValidationResult {
		const errors: string[] = [];
		const warnings: string[] = [];

		if (!formData.delivery || !['company', 'courier'].includes(formData.delivery)) {
			errors.push('배송 방식을 선택해야 합니다.');
		}

		if (formData.deliveryCost && formData.deliveryCost.trim() !== '') {
			const cost = Number(formData.deliveryCost);
			if (isNaN(cost) || cost < 0) {
				errors.push('배달비용은 0 이상의 숫자여야 합니다.');
			} else if (cost > 500000) {
				warnings.push('배달비용이 50만원을 초과합니다.');
			}
		}

		return { isValid: errors.length === 0, errors, warnings };
	}

	/**
	 * 사업자등록번호 형식 검증
	 */
	private static isValidBusinessNumber(businessNumber: string): boolean {
		// 사업자등록번호 형식: 111-22-33333
		const businessNumberRegex = /^\d{3}-?\d{2}-?\d{5}$/;
		return businessNumberRegex.test(businessNumber);
	}

	/**
	 * 이메일 형식 검증
	 */
	private static isValidEmail(email: string): boolean {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return emailRegex.test(email);
	}

	/**
	 * 검증 결과를 토스트로 표시
	 */
	static showValidationResult(result: CompanyValidationResult): void {
		// 모든 에러를 순차적으로 토스트로 표시
		if (result.errors.length > 0) {
			result.errors.forEach((error, index) => {
				// 에러들을 약간의 지연을 두고 순차적으로 표시
				setTimeout(() => {
					toastStore.error(error);
				}, index * 100); // 100ms 간격으로 표시
			});
		}

		// 모든 경고를 순차적으로 토스트로 표시
		if (result.warnings.length > 0) {
			result.warnings.forEach((warning, index) => {
				// 경고들을 약간의 지연을 두고 순차적으로 표시
				setTimeout(
					() => {
						toastStore.warning(warning);
					},
					result.errors.length * 100 + index * 100
				); // 에러 표시 후 경고 표시
			});
		}

		// 모든 검증이 통과했을 때만 성공 토스트 표시
		if (result.isValid && result.errors.length === 0) {
			setTimeout(
				() => {
					toastStore.success('모든 정보가 올바르게 입력되었습니다.');
				},
				result.errors.length * 100 + result.warnings.length * 100 + 100
			);
		}
	}

	/**
	 * 에러 메시지에서 필드명 추출
	 */
	static getFieldFromError(error: string): string | null {
		console.log('에러 메시지 분석:', error);

		if (error.includes('회사명')) return 'corpName';
		if (error.includes('구분')) return 'classification';
		if (error.includes('지역')) return 'region';
		if (error.includes('주소')) {
			if (error.includes('상세 주소')) return 'detailAddress';
			return 'address';
		}
		if (error.includes('전화번호')) return 'phoneNumber';
		if (error.includes('사업자등록번호')) return 'businessNumber';
		if (error.includes('이메일')) return 'email';
		if (error.includes('배송 방식')) return 'delivery';
		if (error.includes('배달비용')) return 'deliveryCost';
		if (error.includes('출력물 종류')) return 'printType';
		if (error.includes('수가 항목')) return 'priceData';

		console.log('매칭되는 필드 없음:', error);
		return null;
	}

	/**
	 * 경고 메시지에서 필드명 추출
	 */
	static getFieldFromWarning(warning: string): string | null {
		if (warning.includes('전화번호')) return 'phoneNumber';
		if (warning.includes('사업자등록번호')) return 'businessNumber';
		if (warning.includes('이메일')) return 'email';
		if (warning.includes('배달비용')) return 'deliveryCost';
		if (warning.includes('정상 가격이 리메이크 가격보다 낮습니다')) return 'printType';
		if (warning.includes('수가 정보가 없어도 등록 가능하지만')) return 'priceData';
		if (warning.includes('가격이 1천만원을 초과합니다')) return 'priceData';
		if (warning.includes('배달비용이 10만원을 초과합니다')) return 'deliveryCost';
		return null;
	}

	/**
	 * 데이터베이스 저장 전 최종 검증
	 */
	static validateForDatabase(formData: any): boolean {
		const result = this.validateCompanyData(formData);

		if (!result.isValid) {
			this.showValidationResult(result);
			return false;
		}

		// 경고가 있어도 저장 가능하도록 설정
		if (result.warnings.length > 0) {
			this.showValidationResult(result);
		}

		return true;
	}
}
