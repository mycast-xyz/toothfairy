<script lang="ts">
	import { v6 as uuidv6 } from 'uuid';
	import PageHeaderBar from '../../components/PageHeaderBar.svelte';
	import SearchableDropdown from '../../components/SearchableDropdown.svelte';

	// 캘린더 처리용 DatePicker
	import { format } from 'date-fns';

	// RequestStore 가져오기
	import {
		requestInfo,
		treatmentItems,
		isLoadingTreatmentItems,
		treatmentForms,
		editingFormId,
		requestStore,
		type TreatmentForm
	} from '../../../service/request/RequestStore';

	// ToastService 가져오기
	import { toastStore } from '../../../service/ToastService';

	// props로 부모 컴포넌트의 nextStep, prevStep 함수를 받음
	let { nextStep, prevStep } = $props<{ nextStep: () => void; prevStep: () => void }>();

	const options = {
		clockseq: 0x1234,
		msecs: new Date().getTime(),
		nsecs: 5678
	};

	// 타입 정의는 RequestStore에서 import

	interface TreatmentItem {
		id: number;
		technicianname: string;
		prkey: string;
		price: number;
	}

	interface PatientInfo {
		name: string;
		startDate: string;
		endDate: string;
		sendCompany: string;
		totalPrice: number;
		option: any[];
		uuid: string;
		photoFile: string | null;
	}

	// 유틸리티 클래스
	class DateUtils {
		private static readonly MILLISECONDS_IN_DAY = 24 * 60 * 60 * 1000;
		private static readonly DATE_FORMAT = 'yyyy-MM-dd';

		static getToday(): string {
			const date = new Date();
			const year = date.getFullYear();
			const month = ('0' + (1 + date.getMonth())).slice(-2);
			const day = ('0' + date.getDate()).slice(-2);
			return `${year}-${month}-${day}`;
		}

		static getDateFromToday(days: number): number {
			return Date.now() + days * this.MILLISECONDS_IN_DAY;
		}

		static formatDate(dateString: string | Date): string {
			return (dateString && format(new Date(dateString), this.DATE_FORMAT)) || '';
		}
	}

	// 파일 처리 클래스
	class FileHandler {
		static async handlePhotoFile(event: Event): Promise<string | null> {
			const file = (event.target as HTMLInputElement).files?.[0];
			if (!file) return null;

			return new Promise((resolve) => {
				const reader = new FileReader();
				reader.onload = (e) => {
					if (e.target?.result) {
						resolve(e.target.result as string);
					} else {
						resolve(null);
					}
				};
				reader.readAsDataURL(file);
			});
		}
	}

	// 치식 처리 클래스
	class ToothProcessor {
		private static readonly JAW_TYPES = ['상악', '하악'] as const;
		private static readonly TOOTH_RANGES = {
			상악: { left: [11, 18], right: [21, 28] },
			하악: { left: [41, 48], right: [31, 38] }
		} as const;

		static validateInput(event: KeyboardEvent): void {
			const input = event.target as HTMLInputElement;
			const key = event.key;

			const allowedKeys = [
				'1',
				'2',
				'3',
				'4',
				'5',
				'6',
				'7',
				'8',
				',',
				'Backspace',
				'Delete',
				'ArrowLeft',
				'ArrowRight',
				'Tab'
			];

			if (!allowedKeys.includes(key)) {
				event.preventDefault();
				return;
			}

			if (key >= '1' && key <= '8') {
				const currentValue = input.value;
				const existingNumbers = currentValue
					.split(',')
					.map((num) => num.trim())
					.filter((num) => num !== '');

				if (existingNumbers.includes(key)) {
					event.preventDefault();
					return;
				}
			}

			if (key === ',') {
				const currentValue = input.value;
				const cursorPosition = input.selectionStart || 0;
				const beforeCursor = currentValue.substring(0, cursorPosition);
				const afterCursor = currentValue.substring(cursorPosition);

				if (beforeCursor.endsWith(',') || afterCursor.startsWith(',')) {
					event.preventDefault();
					return;
				}
			}
		}

		static formatInput(event: Event): void {
			const input = event.target as HTMLInputElement;
			let value = input.value;

			value = value.replace(/^,|,$/g, '');
			value = value.replace(/,+/g, ',');

			const numbers = value.split(',').filter((num) => {
				const n = parseInt(num.trim());
				return !isNaN(n) && n >= 1 && n <= 8;
			});

			const uniqueNumbers = [...new Set(numbers)];
			input.value = uniqueNumbers.length > 1 ? uniqueNumbers.join(',') : uniqueNumbers.join('');
		}

		static convertToToothNumbers(
			inputValue: string,
			jawType: string,
			position: 'left' | 'right'
		): string {
			if (!inputValue.trim()) return '';

			const numbers = inputValue
				.split(',')
				.map((num) => parseInt(num.trim()))
				.filter((num) => !isNaN(num) && num >= 1 && num <= 8);

			if (numbers.length === 0) return '';

			const prefix =
				jawType === '상악' ? (position === 'left' ? 10 : 20) : position === 'left' ? 40 : 30;

			return numbers.map((num) => prefix + num).join(',');
		}

		static countTeeth(upperJaw: string, lowerJaw: string): number {
			let count = 0;

			if (upperJaw && upperJaw !== '-') {
				const upperTeeth = upperJaw.split(',').filter((teeth) => teeth.trim() !== '');
				count += upperTeeth.length;
			}

			if (lowerJaw && lowerJaw !== '-') {
				const lowerTeeth = lowerJaw.split(',').filter((teeth) => teeth.trim() !== '');
				count += lowerTeeth.length;
			}

			return count;
		}

		static loadToothDataToInputs(
			upperJaw: string,
			lowerJaw: string
		): {
			upperJawLeftValue: string;
			upperJawRightValue: string;
			lowerJawLeftValue: string;
			lowerJawRightValue: string;
		} {
			const result = {
				upperJawLeftValue: '',
				upperJawRightValue: '',
				lowerJawLeftValue: '',
				lowerJawRightValue: ''
			};

			// 상악 데이터 처리
			if (upperJaw && upperJaw !== '-') {
				const upperTeeth = upperJaw.split(',').map((teeth) => teeth.trim());
				const leftTeeth = upperTeeth
					.filter((teeth) => {
						const num = parseInt(teeth);
						return num >= 11 && num <= 18;
					})
					.map((teeth) => (parseInt(teeth) - 10).toString());
				const rightTeeth = upperTeeth
					.filter((teeth) => {
						const num = parseInt(teeth);
						return num >= 21 && num <= 28;
					})
					.map((teeth) => (parseInt(teeth) - 20).toString());

				result.upperJawLeftValue = leftTeeth.join(',');
				result.upperJawRightValue = rightTeeth.join(',');
			}

			// 하악 데이터 처리
			if (lowerJaw && lowerJaw !== '-') {
				const lowerTeeth = lowerJaw.split(',').map((teeth) => teeth.trim());
				const leftTeeth = lowerTeeth
					.filter((teeth) => {
						const num = parseInt(teeth);
						return num >= 41 && num <= 48;
					})
					.map((teeth) => (parseInt(teeth) - 40).toString());
				const rightTeeth = lowerTeeth
					.filter((teeth) => {
						const num = parseInt(teeth);
						return num >= 31 && num <= 38;
					})
					.map((teeth) => (parseInt(teeth) - 30).toString());

				result.lowerJawLeftValue = leftTeeth.join(',');
				result.lowerJawRightValue = rightTeeth.join(',');
			}

			return result;
		}
	}

	// 금액 계산 클래스
	class PriceCalculator {
		static calculateExpectedAmount(
			selectedJawTypes: string[],
			upperJawLeftValue: string,
			upperJawRightValue: string,
			lowerJawLeftValue: string,
			lowerJawRightValue: string,
			selectedTreatmentItem: TreatmentItem | null,
			adjustmentAmount: number
		): number {
			let upperJaw = '';
			let lowerJaw = '';

			if (selectedJawTypes.includes('상악')) {
				upperJaw = '11,12,13,14,15,16,17,18,21,22,23,24,25,26,27,28';
			} else {
				const upperLeft = upperJawLeftValue
					? ToothProcessor.convertToToothNumbers(upperJawLeftValue, '상악', 'left')
					: '';
				const upperRight = upperJawRightValue
					? ToothProcessor.convertToToothNumbers(upperJawRightValue, '상악', 'right')
					: '';
				upperJaw = [upperLeft, upperRight].filter((val) => val).join(',');
			}

			if (selectedJawTypes.includes('하악')) {
				lowerJaw = '41,42,43,44,45,46,47,48,31,32,33,34,35,36,37,38';
			} else {
				const lowerLeft = lowerJawLeftValue
					? ToothProcessor.convertToToothNumbers(lowerJawLeftValue, '하악', 'left')
					: '';
				const lowerRight = lowerJawRightValue
					? ToothProcessor.convertToToothNumbers(lowerJawRightValue, '하악', 'right')
					: '';
				lowerJaw = [lowerLeft, lowerRight].filter((val) => val).join(',');
			}

			if (!upperJaw.trim() && !lowerJaw.trim()) return 0;

			const teethCount = ToothProcessor.countTeeth(upperJaw, lowerJaw);
			if (teethCount === 0) return 0;

			if (!selectedTreatmentItem) return teethCount;

			const baseAmount = selectedTreatmentItem.price * teethCount;
			return baseAmount + adjustmentAmount;
		}

		static calculateTotalAmount(treatmentForms: TreatmentForm[]): {
			totalAmount: number;
			totalAdjustment: number;
			totalItems: number;
			baseAmount: number;
		} {
			let totalAmount = 0;
			let totalAdjustment = 0;
			let totalItems = 0;

			treatmentForms.forEach((form) => {
				const teethCount = ToothProcessor.countTeeth(form.upperJaw, form.lowerJaw);
				const baseAmount = form.price * teethCount;
				const adjustment = form.adjustmentAmount || 0;

				totalAmount += baseAmount + adjustment;
				totalAdjustment += adjustment;
				totalItems += teethCount;
			});

			return {
				totalAmount,
				totalAdjustment,
				totalItems,
				baseAmount: totalAmount - totalAdjustment
			};
		}
	}

	// 상태 관리 클래스
	class StateManager {
		// 환자 정보
		static createPatientInfo(): PatientInfo {
			return {
				name: '',
				startDate: DateUtils.getToday(),
				endDate: '',
				sendCompany: '',
				totalPrice: 0,
				option: [],
				uuid: uuidv6(options),
				photoFile: null
			};
		}

		// 폼 초기화
		static resetForm(): {
			selectedTreatmentItem: null;
			selectedJawTypes: string[];
			isRemakeChecked: boolean;
			adjustmentAmount: number;
			upperJawLeftValue: string;
			upperJawRightValue: string;
			lowerJawLeftValue: string;
			lowerJawRightValue: string;
		} {
			return {
				selectedTreatmentItem: null,
				selectedJawTypes: [],
				isRemakeChecked: false,
				adjustmentAmount: 0,
				upperJawLeftValue: '',
				upperJawRightValue: '',
				lowerJawLeftValue: '',
				lowerJawRightValue: ''
			};
		}
	}

	// 상태 변수들 (로컬 상태만 유지)
	let photoFile = $state<string | null>(null);
	let isRemakeChecked = $state(false);
	let adjustmentAmount = $state<number>(0);
	let selectedJawTypes = $state<string[]>([]);
	let editingForm = $state<TreatmentForm | null>(null);
	let selectedTreatmentItem = $state<TreatmentItem | null>(null);

	// 치료종목 옵션 생성 (SearchableDropdown용)
	const treatmentItemOptions = $derived(
		$treatmentItems.map((item) => ({
			id: item.id.toString(),
			name: `${item.technicianname} - ${item.prkey}`,
			label: `${item.technicianname} - ${item.prkey}`,
			value: item.technicianname,
			searchKey: `${item.technicianname} ${item.prkey}`,
			originalData: item
		}))
	);

	// 치식 입력 필드 참조
	let toothInputRefs = $state<{ [key: string]: HTMLInputElement[] }>({
		상악: [],
		하악: []
	});

	// 치식 입력값 추적을 위한 반응형 변수들
	let upperJawLeftValue = $state('');
	let upperJawRightValue = $state('');
	let lowerJawLeftValue = $state('');
	let lowerJawRightValue = $state('');

	// 전체 선택 상태 변경 시 입력 필드 초기화
	$effect(() => {
		selectedJawTypes.forEach((jawType) => {
			if (toothInputRefs[jawType]) {
				toothInputRefs[jawType].forEach((input) => {
					if (input) {
						input.value = '';
					}
				});
			}
		});
	});

	// 파일 처리 함수
	const handlePhotoFile = async (event: Event) => {
		const result = await FileHandler.handlePhotoFile(event);
		if (result) {
			photoFile = result;
		}
	};

	// 치료폼 관리 클래스 (RequestStore 사용)
	class TreatmentFormManager {
		static addTreatmentForm(
			selectedTreatmentItem: TreatmentItem | null,
			selectedJawTypes: string[],
			toothInputRefs: { [key: string]: HTMLInputElement[] },
			isRemakeChecked: boolean,
			adjustmentAmount: number
		): boolean {
			// 선택된 치료종목 확인
			if (!selectedTreatmentItem) {
				toastStore.error('치료종목을 선택해주세요.');
				return false;
			}

			// 현재 입력된 치식 정보 가져오기
			const upperJawLeftInput = toothInputRefs['상악'][0];
			const upperJawRightInput = toothInputRefs['상악'][1];
			const lowerJawLeftInput = toothInputRefs['하악'][0];
			const lowerJawRightInput = toothInputRefs['하악'][1];

			let upperJaw = '';
			let lowerJaw = '';

			// 전체 선택이 체크된 경우 자동으로 모든 치식 추가
			if (selectedJawTypes.includes('상악')) {
				upperJaw = '11,12,13,14,15,16,17,18,21,22,23,24,25,26,27,28';
			} else {
				const upperLeft = ToothProcessor.convertToToothNumbers(
					upperJawLeftInput?.value || '',
					'상악',
					'left'
				);
				const upperRight = ToothProcessor.convertToToothNumbers(
					upperJawRightInput?.value || '',
					'상악',
					'right'
				);
				upperJaw = [upperLeft, upperRight].filter((val) => val).join(',');
			}

			if (selectedJawTypes.includes('하악')) {
				lowerJaw = '41,42,43,44,45,46,47,48,31,32,33,34,35,36,37,38';
			} else {
				const lowerLeft = ToothProcessor.convertToToothNumbers(
					lowerJawLeftInput?.value || '',
					'하악',
					'left'
				);
				const lowerRight = ToothProcessor.convertToToothNumbers(
					lowerJawRightInput?.value || '',
					'하악',
					'right'
				);
				lowerJaw = [lowerLeft, lowerRight].filter((val) => val).join(',');
			}

			// 빈 값 검증
			if (!upperJaw.trim() && !lowerJaw.trim()) {
				toastStore.error('치식을 입력해주세요.');
				return false;
			}

			// 새로운 치료폼 생성 및 스토어에 추가
			const newTreatmentForm: TreatmentForm = {
				id: uuidv6(options),
				treatmentType: selectedTreatmentItem.technicianname,
				upperJaw: upperJaw.trim(),
				lowerJaw: lowerJaw.trim(),
				isRemake: isRemakeChecked,
				price: selectedTreatmentItem.price,
				prkey: selectedTreatmentItem.prkey,
				adjustmentAmount: adjustmentAmount || 0
			};

			requestStore.addTreatmentForm(newTreatmentForm);
			return true;
		}

		static removeTreatmentForm(id: string): void {
			requestStore.removeTreatmentForm(id);
		}

		static updateTreatmentForm(
			editingFormId: string | null,
			selectedTreatmentItem: TreatmentItem | null,
			selectedJawTypes: string[],
			toothInputRefs: { [key: string]: HTMLInputElement[] },
			isRemakeChecked: boolean,
			adjustmentAmount: number
		): boolean {
			if (!editingFormId) return false;

			// 현재 입력된 치식 정보 가져오기
			const upperJawLeftInput = toothInputRefs['상악'][0];
			const upperJawRightInput = toothInputRefs['상악'][1];
			const lowerJawLeftInput = toothInputRefs['하악'][0];
			const lowerJawRightInput = toothInputRefs['하악'][1];

			let upperJaw = '';
			let lowerJaw = '';

			if (selectedJawTypes.includes('상악')) {
				upperJaw = '11,12,13,14,15,16,17,18,21,22,23,24,25,26,27,28';
			} else {
				const upperLeft = ToothProcessor.convertToToothNumbers(
					upperJawLeftInput?.value || '',
					'상악',
					'left'
				);
				const upperRight = ToothProcessor.convertToToothNumbers(
					upperJawRightInput?.value || '',
					'상악',
					'right'
				);
				upperJaw = [upperLeft, upperRight].filter((val) => val).join(',');
			}

			if (selectedJawTypes.includes('하악')) {
				lowerJaw = '41,42,43,44,45,46,47,48,31,32,33,34,35,36,37,38';
			} else {
				const lowerLeft = ToothProcessor.convertToToothNumbers(
					lowerJawLeftInput?.value || '',
					'하악',
					'left'
				);
				const lowerRight = ToothProcessor.convertToToothNumbers(
					lowerJawRightInput?.value || '',
					'하악',
					'right'
				);
				lowerJaw = [lowerLeft, lowerRight].filter((val) => val).join(',');
			}

			// 빈 값 검증
			if (!upperJaw.trim() && !lowerJaw.trim()) {
				toastStore.error('치식을 입력해주세요.');
				return false;
			}

			// 치료폼 업데이트
			requestStore.updateTreatmentForm(editingFormId, {
				treatmentType: selectedTreatmentItem?.technicianname || '',
				upperJaw: upperJaw.trim(),
				lowerJaw: lowerJaw.trim(),
				isRemake: isRemakeChecked,
				price: selectedTreatmentItem?.price || 0,
				prkey: selectedTreatmentItem?.prkey || '',
				adjustmentAmount: adjustmentAmount || 0
			});

			return true;
		}
	}

	// 치료폼 추가 함수
	function addTreatmentForm() {
		const success = TreatmentFormManager.addTreatmentForm(
			selectedTreatmentItem,
			selectedJawTypes,
			toothInputRefs,
			isRemakeChecked,
			adjustmentAmount
		);

		if (success) {
			// 입력 필드 초기화
			const resetState = StateManager.resetForm();
			selectedTreatmentItem = resetState.selectedTreatmentItem;
			selectedJawTypes = resetState.selectedJawTypes;
			isRemakeChecked = resetState.isRemakeChecked;
			adjustmentAmount = resetState.adjustmentAmount;
			upperJawLeftValue = resetState.upperJawLeftValue;
			upperJawRightValue = resetState.upperJawRightValue;
			lowerJawLeftValue = resetState.lowerJawLeftValue;
			lowerJawRightValue = resetState.lowerJawRightValue;

			// 입력 필드 DOM 초기화
			if (toothInputRefs['상악'][0]) toothInputRefs['상악'][0].value = '';
			if (toothInputRefs['상악'][1]) toothInputRefs['상악'][1].value = '';
			if (toothInputRefs['하악'][0]) toothInputRefs['하악'][0].value = '';
			if (toothInputRefs['하악'][1]) toothInputRefs['하악'][1].value = '';
		}
	}

	// 치료폼 삭제 함수
	function removeTreatmentForm(id: string) {
		TreatmentFormManager.removeTreatmentForm(id);
	}

	// 치료폼 수정 시작 함수
	function editTreatmentForm(id: string) {
		const formToEdit = requestStore.getTreatmentFormById(id);
		if (!formToEdit) return;

		requestStore.startEditing(id);
		editingForm = { ...formToEdit };

		// 수정할 폼의 데이터를 상단 폼에 로드
		selectedTreatmentItem = {
			id: 0, // 임시 ID
			technicianname: formToEdit.treatmentType,
			prkey: formToEdit.prkey,
			price: formToEdit.price
		};

		// 치식 데이터를 입력 필드에 로드
		const toothData = ToothProcessor.loadToothDataToInputs(
			formToEdit.upperJaw,
			formToEdit.lowerJaw
		);
		upperJawLeftValue = toothData.upperJawLeftValue;
		upperJawRightValue = toothData.upperJawRightValue;
		lowerJawLeftValue = toothData.lowerJawLeftValue;
		lowerJawRightValue = toothData.lowerJawRightValue;

		// 리메이크 상태 로드
		isRemakeChecked = formToEdit.isRemake;

		// 금액 조정 로드
		adjustmentAmount = formToEdit.adjustmentAmount || 0;

		// 상단으로 스크롤
		document.querySelector('.inputform')?.scrollIntoView({ behavior: 'smooth' });
	}

	// 치료폼 수정 완료 함수
	function updateTreatmentForm() {
		const success = TreatmentFormManager.updateTreatmentForm(
			$editingFormId,
			selectedTreatmentItem,
			selectedJawTypes,
			toothInputRefs,
			isRemakeChecked,
			adjustmentAmount
		);

		if (success) {
			cancelEdit();
		}
	}

	// 수정 취소 함수
	function cancelEdit() {
		requestStore.stopEditing();
		editingForm = null;
		const resetState = StateManager.resetForm();
		selectedTreatmentItem = resetState.selectedTreatmentItem;
		selectedJawTypes = resetState.selectedJawTypes;
		isRemakeChecked = resetState.isRemakeChecked;
		adjustmentAmount = resetState.adjustmentAmount;
		upperJawLeftValue = resetState.upperJawLeftValue;
		upperJawRightValue = resetState.upperJawRightValue;
		lowerJawLeftValue = resetState.lowerJawLeftValue;
		lowerJawRightValue = resetState.lowerJawRightValue;

		// 입력 필드 DOM 초기화
		if (toothInputRefs['상악'][0]) toothInputRefs['상악'][0].value = '';
		if (toothInputRefs['상악'][1]) toothInputRefs['상악'][1].value = '';
		if (toothInputRefs['하악'][0]) toothInputRefs['하악'][0].value = '';
		if (toothInputRefs['하악'][1]) toothInputRefs['하악'][1].value = '';
	}

	// 현재 선택된 치료종목의 예상 금액 계산 함수
	function calculateExpectedAmount() {
		return PriceCalculator.calculateExpectedAmount(
			selectedJawTypes,
			upperJawLeftValue,
			upperJawRightValue,
			lowerJawLeftValue,
			lowerJawRightValue,
			selectedTreatmentItem,
			adjustmentAmount
		);
	}

	// 전체 금액 계산 함수
	function calculateTotalAmount() {
		return requestStore.calculateTotalAmount();
	}

	// 저장
	function sendPatientInfo() {
		// 다음 단계로 이동
		nextStep();
	}
</script>

<main class="ml-64 mt-8 h-svh flex-1 bg-gray-100 p-8">
	<PageHeaderBar title="의뢰 목록" description="치과 기공물 관리 페이지 입니다."></PageHeaderBar>
	<div class="grid h-[calc(100vh-200px)] grid-cols-6 gap-8">
		<!-- 왼쪽 패널: 의뢰서 등록 폼 -->
		<div
			class="col-span-4 flex h-[calc(100vh-200px)] flex-col justify-between rounded-lg bg-white shadow-md"
		>
			<!-- 폼 필드들 -->
			<div class="grow p-6">
				<div class="inputform space-y-4">
					<div class="mb-4 flex items-center space-x-3">
						<label class="w-32 text-sm font-medium text-gray-700">치료종목</label>
						<div class="flex-1">
							<SearchableDropdown
								options={treatmentItemOptions}
								value={selectedTreatmentItem?.id.toString() || ''}
								placeholder="치료종목을 선택하세요"
								emptyMessage="검색 결과가 없습니다"
								disabled={$isLoadingTreatmentItems}
								loading={$isLoadingTreatmentItems}
								enableChoseongSearch={true}
								on:change={(e) => {
									const selectedOption = treatmentItemOptions.find(
										(option: any) => option.id === e.detail.id
									);
									if (selectedOption) {
										selectedTreatmentItem = selectedOption.originalData;
									}
								}}
							/>
						</div>
					</div>
					<div class="mb-4 flex items-start space-x-3">
						<label class="w-32 pt-3 text-sm font-medium text-gray-700">치식</label>
						<div class="flex-1">
							<!-- 상악 -->
							<div class="mb-2 flex items-stretch space-x-3">
								<label
									for="jaw-상악"
									class="inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-lg border-2 p-3 transition-colors hover:border-violet-300 hover:text-violet-900 {selectedJawTypes.includes(
										'상악'
									)
										? 'border-violet-500 bg-violet-50 text-violet-700'
										: 'border-gray-300'}"
								>
									<input
										type="checkbox"
										id="jaw-상악"
										class="hidden"
										bind:group={selectedJawTypes}
										value="상악"
									/>
									<span class="text-sm font-medium">상악 전체 선택</span>
								</label>
								<div class="flex flex-1 space-x-2">
									<input
										type="text"
										class="h-[44px] flex-1 rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 {selectedJawTypes.includes(
											'상악'
										)
											? 'cursor-not-allowed bg-gray-100'
											: ''}"
										placeholder="상악 왼쪽 (예: 1,2,3)"
										onkeydown={ToothProcessor.validateInput}
										onblur={ToothProcessor.formatInput}
										disabled={selectedJawTypes.includes('상악')}
										bind:this={toothInputRefs['상악'][0]}
										bind:value={upperJawLeftValue}
									/>
									<input
										type="text"
										class="h-[44px] flex-1 rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 {selectedJawTypes.includes(
											'상악'
										)
											? 'cursor-not-allowed bg-gray-100'
											: ''}"
										placeholder="상악 오른쪽 (예: 4,5,6)"
										onkeydown={ToothProcessor.validateInput}
										onblur={ToothProcessor.formatInput}
										disabled={selectedJawTypes.includes('상악')}
										bind:this={toothInputRefs['상악'][1]}
										bind:value={upperJawRightValue}
									/>
								</div>
							</div>
							<!-- 하악 -->
							<div class="mb-2 flex items-stretch space-x-3">
								<label
									for="jaw-하악"
									class="inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-lg border-2 p-3 transition-colors hover:border-violet-300 hover:text-violet-900 {selectedJawTypes.includes(
										'하악'
									)
										? 'border-violet-500 bg-violet-50 text-violet-700'
										: 'border-gray-300'}"
								>
									<input
										type="checkbox"
										id="jaw-하악"
										class="hidden"
										bind:group={selectedJawTypes}
										value="하악"
									/>
									<span class="text-sm font-medium">하악 전체 선택</span>
								</label>
								<div class="flex flex-1 space-x-2">
									<input
										type="text"
										class="h-[44px] flex-1 rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 {selectedJawTypes.includes(
											'하악'
										)
											? 'cursor-not-allowed bg-gray-100'
											: ''}"
										placeholder="하악 왼쪽 (예: 1,2,3)"
										onkeydown={ToothProcessor.validateInput}
										onblur={ToothProcessor.formatInput}
										disabled={selectedJawTypes.includes('하악')}
										bind:this={toothInputRefs['하악'][0]}
										bind:value={lowerJawLeftValue}
									/>
									<input
										type="text"
										class="h-[44px] flex-1 rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 {selectedJawTypes.includes(
											'하악'
										)
											? 'cursor-not-allowed bg-gray-100'
											: ''}"
										placeholder="하악 오른쪽 (예: 4,5,6)"
										onkeydown={ToothProcessor.validateInput}
										onblur={ToothProcessor.formatInput}
										disabled={selectedJawTypes.includes('하악')}
										bind:this={toothInputRefs['하악'][1]}
										bind:value={lowerJawRightValue}
									/>
								</div>
							</div>
						</div>
					</div>
					<div class="mb-2 flex items-center space-x-3">
						<label class="w-32 text-sm font-medium text-gray-700">리메이크</label>
						<div class="flex flex-1 space-x-4">
							<label
								for="classification-lab"
								class="inline-flex flex-1 cursor-pointer items-center justify-center rounded-lg border-2 p-2 transition-colors hover:border-violet-300 hover:text-violet-900 {isRemakeChecked
									? 'border-violet-500 bg-violet-50 text-violet-700'
									: 'border-gray-300'}"
							>
								<input
									type="checkbox"
									name="classification"
									id="classification-lab"
									class="hidden"
									value="remake"
									bind:checked={isRemakeChecked}
								/>
								<i
									class="ri-tools-fill mr-3 h-8 w-8 text-2xl {isRemakeChecked
										? 'text-violet-600'
										: ''}"
								></i>
								<span class="text-base font-medium">리메이크</span>
							</label>
						</div>
					</div>
					<!-- 금액 조정 섹션 -->
					<div class="mb-2 flex items-center space-x-3">
						<label class="w-32 text-sm font-medium text-gray-700">금액 조정</label>
						<div class="flex flex-1 items-center space-x-2">
							<button
								type="button"
								class="h-9 w-9 rounded border border-gray-300 bg-white text-xl font-bold text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
								onclick={() => {
									adjustmentAmount = Math.max(-999999, (adjustmentAmount || 0) - 1000);
								}}
								disabled={!selectedTreatmentItem}
							>
								-
							</button>
							<input
								type="number"
								class="h-9 w-32 rounded border px-3 py-1 text-center text-base focus:outline-none focus:ring-2 focus:ring-violet-400 disabled:cursor-not-allowed disabled:bg-gray-100"
								bind:value={adjustmentAmount}
								min="-999999"
								max="999999"
								step="1000"
								placeholder="0"
								disabled={!selectedTreatmentItem}
								oninput={(e) => {
									const value = parseInt((e.target as HTMLInputElement).value) || 0;
									adjustmentAmount = Math.max(-999999, Math.min(999999, value));
								}}
							/>
							<button
								type="button"
								class="h-9 w-9 rounded border border-gray-300 bg-white text-xl font-bold text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
								onclick={() => {
									adjustmentAmount = Math.min(999999, (adjustmentAmount || 0) + 1000);
								}}
								disabled={!selectedTreatmentItem}
							>
								+
							</button>
							<span class="ml-2 text-sm text-gray-500">원</span>
							{#if adjustmentAmount !== 0}
								<span
									class="ml-2 text-sm {adjustmentAmount > 0 ? 'text-green-600' : 'text-red-600'}"
								>
									{adjustmentAmount > 0 ? '+' : ''}{adjustmentAmount.toLocaleString()}원
								</span>
							{/if}
						</div>
					</div>

					<!-- 예상 금액 표시 -->
					<div class="mb-4 flex items-center space-x-3">
						<label class="w-32 text-sm font-medium text-gray-700">예상 금액</label>
						<div class="flex flex-1 items-center space-x-2">
							<div class="w-full rounded-lg border border-violet-200 bg-white px-4 py-2">
								{#if calculateExpectedAmount() > 0}
									{@const expectedAmount = calculateExpectedAmount()}
									{#if selectedTreatmentItem}
										<span class="text-lg font-bold text-violet-600">
											{expectedAmount.toLocaleString()}원
										</span>
										<span class="text-sm text-gray-500">
											({selectedTreatmentItem.technicianname} - {selectedTreatmentItem.prkey})
										</span>
									{:else}
										<span class="text-lg font-bold text-blue-600">
											{expectedAmount}개
										</span>
										<span class="text-sm text-gray-500"> (치료종목을 선택해주세요) </span>
									{/if}
								{:else}
									<span class="text-sm text-gray-500"> 치식을 입력해주세요 </span>
								{/if}
							</div>
						</div>
					</div>

					<div class="btn">
						{#if $editingFormId}
							<!-- 수정 모드 버튼들 -->
							<div class="flex space-x-2">
								<button
									onclick={updateTreatmentForm}
									class="flex-1 rounded-md bg-green-600 px-2 py-4 font-medium text-white transition-colors duration-200 hover:bg-green-700"
								>
									<i class="ri-check-line mr-1 h-4 w-4"></i>
									수정 완료
								</button>
								<button
									onclick={cancelEdit}
									class="flex-1 rounded-md bg-gray-500 px-2 py-4 font-medium text-white transition-colors duration-200 hover:bg-gray-600"
								>
									<i class="ri-close-line mr-1 h-4 w-4"></i>
									수정 취소
								</button>
							</div>
						{:else}
							<!-- 치료 폼 필드 추가 버튼-->
							<button
								onclick={addTreatmentForm}
								class="w-full rounded-md bg-purple-600 px-2 py-4 font-medium text-white transition-colors duration-200 hover:bg-purple-700"
							>
								리스트 추가
							</button>
						{/if}
					</div>
				</div>
				<hr />
				<div>
					<!-- 치료폼 리스트 처리-->
					{#if $treatmentForms.length > 0}
						<div class="mt-2">
							<h3 class="mb-2 text-lg font-semibold text-gray-800">기공물 리스트</h3>
							<div class="overflow-hidden rounded-t-lg border border-gray-200">
								<table class="min-w-full divide-y divide-gray-200">
									<thead class="bg-gray-50">
										<tr>
											<th
												class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
											>
												치료종목
											</th>
											<th
												class="max-w-[120px] px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
											>
												상악
											</th>
											<th
												class="max-w-[120px] px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
											>
												하악
											</th>
											<th
												class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
											>
												가격
											</th>
											<th
												class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
											>
												리메이크
											</th>
											<th
												class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
											>
												작업
											</th>
										</tr>
									</thead>
								</table>
								<div class="max-h-[calc(100vh-900px)] overflow-y-auto">
									<table class="min-w-full divide-y divide-gray-200">
										<tbody class="divide-y divide-gray-200 bg-white">
											{#each $treatmentForms as form, index}
												<tr class="hover:bg-gray-50">
													<td class="whitespace-nowrap px-4 py-4 text-sm text-gray-900">
														<div>
															<div class="font-medium">{form.treatmentType}</div>
															<div class="text-xs text-gray-500">{form.prkey}</div>
														</div>
													</td>
													<td class="max-w-[120px] px-4 py-4 text-sm text-gray-900">
														<div class="break-words leading-tight">
															{form.upperJaw || '-'}
														</div>
													</td>
													<td class="max-w-[120px] px-4 py-4 text-sm text-gray-900">
														<div class="break-words leading-tight">
															{form.lowerJaw || '-'}
														</div>
													</td>
													<td class="whitespace-nowrap px-4 py-4 text-sm text-gray-900">
														<div class="text-right">
															<div class="font-medium text-green-600">
																{(
																	form.price *
																		ToothProcessor.countTeeth(form.upperJaw, form.lowerJaw) +
																	(form.adjustmentAmount || 0)
																).toLocaleString()}원
															</div>
															<div class="text-xs text-gray-500">
																{ToothProcessor.countTeeth(form.upperJaw, form.lowerJaw)}개 × {form.price.toLocaleString()}원
																{#if form.adjustmentAmount && form.adjustmentAmount !== 0}
																	<br />
																	<span class="text-blue-600">
																		조정: {form.adjustmentAmount > 0
																			? '+'
																			: ''}{form.adjustmentAmount.toLocaleString()}원
																	</span>
																{/if}
															</div>
														</div>
													</td>
													<td class="whitespace-nowrap px-4 py-4 text-sm text-gray-900">
														{#if form.isRemake}
															<span
																class="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800"
															>
																리메이크
															</span>
														{:else}
															<span
																class="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800"
															>
																신규
															</span>
														{/if}
													</td>
													<td class="whitespace-nowrap px-4 py-4 text-sm text-gray-900">
														<div class="flex space-x-2">
															<button
																onclick={() => editTreatmentForm(form.id)}
																class="inline-flex items-center rounded-md bg-blue-100 px-3 py-1.5 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-200"
															>
																<i class="ri-edit-line mr-1 h-4 w-4"></i>
																수정
															</button>
															<button
																onclick={() => removeTreatmentForm(form.id)}
																class="inline-flex items-center rounded-md bg-red-100 px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-200"
															>
																<i class="ri-delete-bin-line mr-1 h-4 w-4"></i>
																삭제
															</button>
														</div>
													</td>
												</tr>
											{/each}
										</tbody>
									</table>
								</div>
							</div>
						</div>
					{:else}
						<div class="mt-6 text-center">
							<div class="rounded-lg border-2 border-dashed border-gray-300 p-8">
								<i class="ri-file-list-3-line mx-auto h-12 w-12 text-gray-400"></i>
								<p class="mt-2 text-sm text-gray-500">추가된 기공물이 없습니다.</p>
								<p class="text-xs text-gray-400">
									위의 폼을 작성하고 '리스트 추가' 버튼을 눌러주세요.
								</p>
							</div>
						</div>
					{/if}
				</div>

				<!-- 금액 요약 섹션 -->
				{#if $treatmentForms.length > 0}
					{@const totals = calculateTotalAmount()}
					<div class="mt-0 rounded-b-lg border border-gray-200 bg-gray-50 px-4 py-2">
						<div class="space-y-2">
							<div class="flex items-center justify-between">
								<div class="flex items-center space-x-4">
									<span class="text-sm text-gray-600">
										기본 금액 <span class="text-sm font-medium text-gray-900"
											>{totals.baseAmount.toLocaleString()}원</span
										>
									</span>
									{#if totals.totalAdjustment !== 0}
										<span class="text-sm text-gray-600">
											금액 조정
											<span
												class="text-sm font-medium {totals.totalAdjustment > 0
													? 'text-green-600'
													: 'text-red-600'}"
											>
												{totals.totalAdjustment > 0
													? '+'
													: ''}{totals.totalAdjustment.toLocaleString()}원
											</span>
										</span>
									{/if}
								</div>
								<div class="flex items-center space-x-2">
									<span class="text-base font-semibold text-gray-800">총 금액</span>
									<span class="text-lg font-bold text-purple-600"
										>{totals.totalAmount.toLocaleString()}원</span
									>
								</div>
							</div>
						</div>
					</div>
				{/if}
			</div>

			<!-- 전송 버튼 -->
			<div class="mt-2">
				<button
					onclick={sendPatientInfo}
					class="w-full rounded-b-md bg-purple-600 px-6 py-4 font-medium text-white transition-colors duration-200 hover:bg-purple-700"
				>
					다음 단계
				</button>
			</div>
		</div>

		<!-- 오른쪽 패널: 저장된 이미지 표기 -->
		<div class="col-span-2 flex h-[calc(100vh-200px)] flex-col rounded-lg bg-white shadow-md">
			{#if $editingFormId}
				<!-- 수정 모드 알림 -->
				<div class="m-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
					<div class="flex items-center">
						<i class="ri-edit-line mr-2 h-5 w-5 text-blue-600"></i>
						<span class="text-sm font-medium text-blue-800">수정 모드</span>
						<span class="ml-2 text-sm text-blue-600">기공물 정보를 수정하고 있습니다.</span>
					</div>
				</div>
			{/if}
			<div class="flex h-full w-full items-center justify-center overflow-hidden p-1">
				{#if $requestInfo.screenshotDataUrl}
					<img
						src={$requestInfo.screenshotDataUrl}
						alt="의뢰서 스크린샷"
						class="h-full w-full rounded-lg object-contain shadow-sm"
					/>
				{:else}
					<div class="flex h-full items-center justify-center p-6 text-gray-500">
						<div class="text-center">
							<svg
								class="mx-auto h-12 w-12 text-gray-400"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
								/>
							</svg>
							<p class="mt-2 text-sm">저장된 이미지가 없습니다</p>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
</main>
