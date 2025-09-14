<script lang="ts">
	import LabCompanyForm from './LabCompanyForm.svelte';
	import DentalCompanyForm from './DentalCompanyForm.svelte';
	import AddressSearch from './AddressSearch.svelte';
	import { configService } from '../../service/ConfigService';
	import { authService } from '../../service/auth/AuthService';
	import { toastStore } from '../../service/ToastService';
	import { CompanyValidationService } from '../../service/validation/CompanyValidationService';

	// props 정의
	let {
		formData = $bindable(),
		onAddCompany,
		onUpdateFormData,
		editMode = false,
		editData = null
	} = $props<{
		formData: any;
		onAddCompany: () => void;
		onUpdateFormData: (updates: any) => void;
		editMode?: boolean;
		editData?: any;
	}>();

	// 검증 상태 관리
	let validationErrors = $state<Record<string, string[]>>({});
	let validationWarnings = $state<Record<string, string[]>>({});

	// 수정 모드일 때 기존 데이터를 폼에 채우기
	$effect(() => {
		if (editMode && editData) {
			console.log('수정 모드: 기존 데이터를 폼에 채우기', editData);

			// 기본 정보 채우기
			formData.corpName = editData.corp_name || '';
			formData.classification = editData.classification || '기공소';
			formData.region = editData.region || '';

			// 주소 처리: 전체 주소에서 기본 주소와 상세 주소 분리
			if (editData.address) {
				const addressParts = editData.address.split(', ');
				if (addressParts.length >= 2) {
					formData.address = addressParts[0]; // 기본 주소
					formData.detailAddress = addressParts.slice(1).join(', '); // 상세 주소
				} else {
					formData.address = editData.address;
					formData.detailAddress = '';
				}
			}

			formData.phoneNumber = editData.phone_number || '';
			formData.businessNumber = editData.business_number || '';
			formData.email = editData.email || '';

			// 기공소 데이터 처리 (dentalLabPrices)
			if (editData.dentalLabPrices && editData.dentalLabPrices.length > 0) {
				formData.printType = editData.dentalLabPrices.map((item: any) => ({
					type: item.print_type?.type || '',
					normalPrice: item.print_type?.normalPrice || 0,
					remakePrice: item.print_type?.remakePrice || 0
				}));
				formData.delivery = editData.dentalLabPrices[0].shipping_type || '';
				formData.deliveryCost = editData.dentalLabPrices[0].shipping_price || '';
			}

			// 치과 데이터 처리 (dentalClinicPrices)
			if (editData.dentalClinicPrices && editData.dentalClinicPrices.length > 0) {
				formData.priceData = editData.dentalClinicPrices[0].price_data || [];
				formData.delivery = editData.dentalClinicPrices[0].shipping_type || '';
				formData.deliveryCost = editData.dentalClinicPrices[0].shipping_price || '';
			}

			console.log('폼 데이터 업데이트 완료:', formData);
		}
	});

	// 실시간 검증 함수
	function validateField(fieldName: string) {
		const validationResult = CompanyValidationService.validateCompanyData(formData);

		// 특정 필드의 에러와 경고만 추출
		const fieldErrors = validationResult.errors.filter((error) => {
			const field = CompanyValidationService.getFieldFromError(error);
			return field === fieldName;
		});

		const fieldWarnings = validationResult.warnings.filter((warning) => {
			const field = CompanyValidationService.getFieldFromWarning(warning);
			return field === fieldName;
		});

		// 검증 상태 업데이트
		validationErrors = { ...validationErrors, [fieldName]: fieldErrors };
		validationWarnings = { ...validationWarnings, [fieldName]: fieldWarnings };
	}

	// 폼 데이터 디버그 및 제출 핸들러
	async function handleSubmit() {
		console.log('=== 회사 정보 폼 데이터 디버그 ===');
		console.log('전체 formData:', formData);
		console.log('--- 개별 필드 ---');
		console.log('회사명:', formData.corpName);
		console.log('지역:', formData.region);
		console.log('기본 주소:', formData.address);
		console.log('상세 주소:', formData.detailAddress);
		console.log(
			'전체 주소:',
			formData.detailAddress ? `${formData.address}, ${formData.detailAddress}` : formData.address
		);
		console.log('전화번호:', formData.phoneNumber);
		console.log('사업자등록번호:', formData.businessNumber);
		console.log('이메일:', formData.email);
		console.log('구분:', formData.classification);
		console.log('배송 방식:', formData.delivery);
		console.log('배달비용:', formData.deliveryCost);
		console.log('--- 출력물 종류 및 가격 (기공소용) ---');
		console.log('선택된 출력물 종류:', formData.printType);
		if (formData.printType && formData.printType.length > 0) {
			formData.printType.forEach((printType: any, index: number) => {
				console.log(`  ${index + 1}. ${printType.type}:`);
				console.log(`     정상 가격: ${printType.normalPrice}원`);
				console.log(`     리메이크 가격: ${printType.remakePrice}원`);
			});
		}

		console.log('--- 치료 종류 및 가격 (치과용) ---');
		console.log('선택된 치료 종류:', formData.treatmentType);
		if (formData.treatmentType && formData.treatmentType.length > 0) {
			formData.treatmentType.forEach((treatmentType: any, index: number) => {
				console.log(`  ${index + 1}. ${treatmentType.type}:`);
				console.log(`     정상 가격: ${treatmentType.normalPrice}원`);
				console.log(`     리메이크 가격: ${treatmentType.remakePrice}원`);
			});
		}

		console.log('--- 치과 수가 목록 ---');
		console.log('등록된 수가 목록:', formData.priceData);
		if (formData.priceData && formData.priceData.length > 0) {
			formData.priceData.forEach((priceItem: any, index: number) => {
				console.log(`  ${index + 1}. ID: ${priceItem.id}`);
				console.log(`     고유번호: ${priceItem.prkey || 'N/A'}`);
				console.log(`     치료 종류: ${priceItem.type || 'N/A'}`);
				console.log(`     기공명칭: ${priceItem.technicianname || 'N/A'}`);
				console.log(`     가격: ${Number(priceItem.price).toLocaleString()}원`);
				console.log(`     구분: ${priceItem.isCompanyPrice ? '회사별 가격' : '기본 수가'}`);
			});
		} else {
			console.log('  등록된 수가 목록이 없습니다.');
		}

		console.log('=== 디버그 완료 ===');

		// 1. 전체 데이터 검증
		const validationResult = CompanyValidationService.validateCompanyData(formData);

		// 검증 결과를 필드별로 분류하여 상태 업데이트
		validationErrors = {};
		validationWarnings = {};

		// 에러와 경고를 필드별로 분류
		validationResult.errors.forEach((error) => {
			const field = CompanyValidationService.getFieldFromError(error);
			if (field) {
				if (!validationErrors[field]) validationErrors[field] = [];
				validationErrors[field].push(error);
			}
		});

		validationResult.warnings.forEach((warning) => {
			const field = CompanyValidationService.getFieldFromWarning(warning);
			if (field) {
				if (!validationWarnings[field]) validationWarnings[field] = [];
				validationWarnings[field].push(warning);
			}
		});

		// 검증 상태 강제 업데이트
		validationErrors = { ...validationErrors };
		validationWarnings = { ...validationWarnings };

		// 디버깅: 검증 상태 출력
		console.log('검증 에러:', validationErrors);
		console.log('검증 경고:', validationWarnings);

		if (!validationResult.isValid) {
			CompanyValidationService.showValidationResult(validationResult);
			return; // 검증 실패 시 함수 종료
		}

		// 2. 백엔드 API 호출
		try {
			await createCompany();
		} catch (error) {
			console.error('회사 생성 실패:', error);
		}
	}

	// 백엔드 API 호출 함수
	async function createCompany() {
		try {
			// 1. 데이터 검증
			if (!CompanyValidationService.validateForDatabase(formData)) {
				return; // 검증 실패 시 함수 종료
			}

			// 2. JWT 토큰 가져오기
			const token = await authService.getJwtToken();
			if (!token) {
				toastStore.error('인증 토큰이 없습니다. 다시 로그인해주세요.');
				return;
			}

			// API 엔드포인트와 백엔드 URL 가져오기
			const backendUrl = configService.getBackendUrl();
			console.log('백엔드 URL:', backendUrl);

			// 모든 company 엔드포인트 확인
			const companyEndpoints = configService.get('api.endpoints.company');
			console.log('Company 엔드포인트들:', companyEndpoints);
			console.log('companyEndpoints.update:', companyEndpoints?.update);
			console.log('전체 API 엔드포인트 구조:', configService.get('api.endpoints'));

			// 수정 모드인지 확인
			const isUpdate = editMode && editData;
			const endpoint = isUpdate ? companyEndpoints?.update : companyEndpoints?.create;
			const method = isUpdate ? 'PUT' : 'POST';

			console.log('API 모드:', isUpdate ? '수정' : '생성');
			console.log('editMode:', editMode);
			console.log('editData:', editData);
			console.log('사용할 엔드포인트:', endpoint);

			if (!endpoint) {
				toastStore.error('API 엔드포인트를 찾을 수 없습니다.');
				return;
			}

			// 수정 모드일 때는 ID를 URL에 포함
			let fullUrl = `${backendUrl}${endpoint}`;
			console.log('원본 URL:', fullUrl);

			if (isUpdate && editData) {
				// ID 필드를 여러 가능한 이름으로 확인
				const companyId =
					editData.id || editData.corp_id || editData.corpClientId || editData.corpClient_id;
				console.log('찾은 ID 값:', companyId);

				if (companyId) {
					// :id 부분을 실제 ID로 치환
					fullUrl = fullUrl.replace(':id', companyId.toString());
					console.log('ID 치환 후 URL:', fullUrl);
				} else {
					console.warn('수정 모드이지만 ID를 찾을 수 없습니다. 가능한 필드들:', {
						id: editData.id,
						corp_id: editData.corp_id,
						corpClientId: editData.corpClientId,
						corpClient_id: editData.corpClient_id
					});
				}
			}

			console.log('최종 API URL:', fullUrl);

			// 전체 주소 조합 (기본 주소 + 상세 주소)
			const fullAddress = formData.detailAddress
				? `${formData.address}, ${formData.detailAddress}`
				: formData.address;

			// API 요청 데이터 준비 - 백엔드 필드값과 정확히 일치
			const requestData: any = {
				corpName: formData.corpName,
				classification: formData.classification,
				region: formData.region,
				address: fullAddress,
				phoneNumber: formData.phoneNumber,
				businessNumber: formData.businessNumber,
				email: formData.email,
				delivery: formData.delivery,
				deliveryCost: formData.deliveryCost
			};

			// 기공소 데이터 추가
			if (
				formData.classification === '기공소' &&
				formData.printType &&
				formData.printType.length > 0
			) {
				requestData.printType = formData.printType.map((item: any) => ({
					type: item.type,
					normalPrice: item.normalPrice,
					remakePrice: item.remakePrice
				}));
			}

			// 치과 데이터 추가
			if (
				formData.classification === '치과' &&
				formData.priceData &&
				formData.priceData.length > 0
			) {
				requestData.priceData = formData.priceData.map((item: any) => ({
					id: item.id,
					prkey: item.prkey,
					type: item.type,
					technicianname: item.technicianname,
					price: item.price
				}));
			}

			console.log('API 요청 데이터:', requestData);

			const response = await fetch(fullUrl, {
				method: method,
				headers: {
					Authorization: 'Bearer ' + token,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(requestData)
			});

			if (response.ok) {
				const result = await response.json();
				if (result.success) {
					const successMessage = isUpdate
						? '회사 정보가 성공적으로 수정되었습니다.'
						: '회사가 성공적으로 생성되었습니다.';
					toastStore.success(successMessage);
					console.log(isUpdate ? '회사 수정 성공:' : '회사 생성 성공:', result);

					// 성공 시 원래 onAddCompany 함수 호출
					onAddCompany();
				} else {
					toastStore.error(
						result.message || (isUpdate ? '회사 수정에 실패했습니다.' : '회사 생성에 실패했습니다.')
					);
				}
			} else {
				const errorData = await response.json();
				toastStore.error(
					errorData.message ||
						(isUpdate ? '회사 수정에 실패했습니다.' : '회사 생성에 실패했습니다.')
				);
			}
		} catch (error) {
			console.error('회사 생성 API 오류:', error);
			toastStore.error('네트워크 오류가 발생했습니다. 다시 시도해주세요.');
		}
	}
</script>

<div class="view1-content">
	<form class="space-y-6 p-4">
		<div class="grid grid-cols-1 gap-6 font-medium">
			<!-- 한 줄에 하나씩 배치 -->
			<div class="mb-2 flex items-center space-x-3">
				<label class="w-32 text-sm font-medium text-gray-700">회사명</label>
				<div class="flex-1">
					<input
						type="text"
						bind:value={formData.corpName}
						oninput={() => validateField('corpName')}
						class="w-full rounded border px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 {validationErrors.corpName
							? 'border-red-500'
							: validationWarnings.corpName
								? 'border-yellow-500'
								: 'border-gray-300'}"
						placeholder="회사명 입력"
					/>
					{#if validationErrors.corpName}
						<div class="mt-1 text-xs text-red-600">
							{validationErrors.corpName[0]}
						</div>
					{/if}
					{#if validationWarnings.corpName}
						<div class="mt-1 text-xs text-yellow-600">
							{validationWarnings.corpName[0]}
						</div>
					{/if}
				</div>
			</div>
			<div class="mb-2 flex items-center space-x-3">
				<label class="w-32 text-sm font-medium text-gray-700">지역</label>
				<div class="flex-1">
					<input
						type="text"
						bind:value={formData.region}
						oninput={() => validateField('region')}
						class="w-full rounded border px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 {validationErrors.region
							? 'border-red-500'
							: validationWarnings.region
								? 'border-yellow-500'
								: 'border-gray-300'}"
						placeholder="지역 입력"
					/>
					{#if validationErrors.region}
						<div class="mt-1 text-xs text-red-600">
							{validationErrors.region[0]}
						</div>
					{/if}
					{#if validationWarnings.region}
						<div class="mt-1 text-xs text-yellow-600">
							{validationWarnings.region[0]}
						</div>
					{/if}
				</div>
			</div>
			<div class="mb-2 flex items-center space-x-3">
				<label class="w-32 text-sm font-medium text-gray-700">주소</label>
				<div class="flex-1">
					<AddressSearch
						bind:address={formData.address}
						hasError={!!validationErrors.address}
						hasWarning={!!validationWarnings.address}
						onAddressChange={(newAddress) => {
							formData.address = newAddress;
							validateField('address');
						}}
					/>
					{#if validationErrors.address}
						<div class="mt-1 text-xs text-red-600">
							{validationErrors.address[0]}
						</div>
					{/if}
					{#if validationWarnings.address}
						<div class="mt-1 text-xs text-yellow-600">
							{validationWarnings.address[0]}
						</div>
					{/if}
				</div>
			</div>

			<!-- 상세 주소 입력 필드 -->
			<div class="mb-2 flex items-center space-x-3">
				<label class="w-32 text-sm font-medium text-gray-700">상세 주소</label>
				<div class="flex-1">
					<input
						type="text"
						bind:value={formData.detailAddress}
						oninput={() => validateField('detailAddress')}
						class="w-full rounded border px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 {validationErrors.detailAddress
							? 'border-red-500'
							: validationWarnings.detailAddress
								? 'border-yellow-500'
								: 'border-gray-300'}"
						placeholder="상세 주소를 입력하세요 (예: 가산동, 스타벨리)"
					/>
					{#if validationErrors.detailAddress}
						<div class="mt-1 text-xs text-red-600">
							{validationErrors.detailAddress[0]}
						</div>
					{/if}
					{#if validationWarnings.detailAddress}
						<div class="mt-1 text-xs text-yellow-600">
							{validationWarnings.detailAddress[0]}
						</div>
					{/if}
				</div>
			</div>
			<div class="mb-2 flex items-center space-x-3">
				<label class="w-32 text-sm font-medium text-gray-700">전화번호</label>
				<div class="flex-1">
					<input
						type="text"
						bind:value={formData.phoneNumber}
						class="w-full rounded border px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 {validationErrors.phoneNumber
							? 'border-red-500'
							: validationWarnings.phoneNumber
								? 'border-yellow-500'
								: 'border-gray-300'}"
						placeholder="전화번호 입력"
					/>
					{#if validationErrors.phoneNumber}
						<div class="mt-1 text-xs text-red-600">
							{validationErrors.phoneNumber[0]}
						</div>
					{/if}
					{#if validationWarnings.phoneNumber}
						<div class="mt-1 text-xs text-yellow-600">
							{validationWarnings.phoneNumber[0]}
						</div>
					{/if}
				</div>
			</div>
			<div class="mb-2 flex items-center space-x-3">
				<label class="w-32 text-sm font-medium text-gray-700">사업자등록번호</label>
				<div class="flex-1">
					<input
						type="text"
						bind:value={formData.businessNumber}
						class="w-full rounded border px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 {validationErrors.businessNumber
							? 'border-red-500'
							: validationWarnings.businessNumber
								? 'border-yellow-500'
								: 'border-gray-300'}"
						placeholder="사업자등록번호 입력"
					/>
					{#if validationErrors.businessNumber}
						<div class="mt-1 text-xs text-red-600">
							{validationErrors.businessNumber[0]}
						</div>
					{/if}
					{#if validationWarnings.businessNumber}
						<div class="mt-1 text-xs text-yellow-600">
							{validationWarnings.businessNumber[0]}
						</div>
					{/if}
				</div>
			</div>
			<div class="mb-2 flex items-center space-x-3">
				<label class="w-32 text-sm font-medium text-gray-700">이메일</label>
				<div class="flex-1">
					<input
						type="email"
						bind:value={formData.email}
						class="w-full rounded border px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 {validationErrors.email
							? 'border-red-500'
							: validationWarnings.email
								? 'border-yellow-500'
								: 'border-gray-300'}"
						placeholder="이메일 입력"
					/>
					{#if validationErrors.email}
						<div class="mt-1 text-xs text-red-600">
							{validationErrors.email[0]}
						</div>
					{/if}
					{#if validationWarnings.email}
						<div class="mt-1 text-xs text-yellow-600">
							{validationWarnings.email[0]}
						</div>
					{/if}
				</div>
			</div>
			<div class="mb-2 flex items-center space-x-3">
				<label class="w-32 text-sm font-medium text-gray-700">구분</label>
				<div class="flex flex-1 space-x-4">
					<label
						for="classification-lab"
						class="inline-flex flex-1 cursor-pointer items-center justify-center rounded-lg border-2 p-2 transition-colors hover:border-violet-300 hover:text-violet-900 {formData.classification ===
						'기공소'
							? 'border-violet-500 bg-violet-100 text-violet-900'
							: 'border-neutral-200/70 bg-white text-neutral-600'}"
					>
						<input
							type="radio"
							name="classification"
							id="classification-lab"
							class="hidden"
							bind:group={formData.classification}
							value="기공소"
						/>
						<i class="ri-tools-fill mr-3 h-8 w-8 text-2xl"></i>
						<span class="text-base font-medium">기공소</span>
					</label>
					<label
						for="classification-dental"
						class="inline-flex flex-1 cursor-pointer items-center justify-center rounded-lg border-2 p-2 transition-colors hover:border-violet-300 hover:text-violet-900 {formData.classification ===
						'치과'
							? 'border-violet-500 bg-violet-100 text-violet-900'
							: 'border-neutral-200/70 bg-white text-neutral-600'}"
					>
						<input
							type="radio"
							name="classification"
							id="classification-dental"
							class="hidden"
							bind:group={formData.classification}
							value="치과"
						/>
						<i class="ri-tooth-line mr-3 h-8 w-8 text-2xl"></i>
						<span class="text-base font-medium">치과</span>
					</label>
				</div>
			</div>
			<div class="mb-2 flex items-center space-x-3">
				<label class="w-32 text-sm font-medium text-gray-700">배송 방식</label>
				<div class="flex flex-1 space-x-4">
					<label
						for="delivery-company"
						class="inline-flex flex-1 cursor-pointer items-center justify-center rounded-lg border-2 p-2 transition-colors hover:border-violet-300 hover:text-violet-900 {formData.delivery ===
						'company'
							? 'border-violet-500 bg-violet-100 text-violet-900'
							: 'border-neutral-200/70 bg-white text-neutral-600'}"
					>
						<input
							type="radio"
							name="delivery"
							id="delivery-company"
							class="hidden"
							bind:group={formData.delivery}
							value="company"
						/>
						<i class="ri-route-line mr-3 h-8 w-8 text-2xl"></i>
						<span class="text-base font-medium">배송업체</span>
					</label>
					<label
						for="delivery-courier"
						class="inline-flex flex-1 cursor-pointer items-center justify-center rounded-lg border-2 p-2 transition-colors hover:border-violet-300 hover:text-violet-900 {formData.delivery ===
						'courier'
							? 'border-violet-500 bg-violet-100 text-violet-900'
							: 'border-neutral-200/70 bg-white text-neutral-600'}"
					>
						<input
							type="radio"
							name="delivery"
							id="delivery-courier"
							class="hidden"
							bind:group={formData.delivery}
							value="courier"
						/>
						<i class="ri-truck-line mr-3 h-8 w-8 text-2xl"></i>
						<span class="text-base font-medium">택배</span>
					</label>
				</div>
			</div>
			<div class="mb-2 flex items-center space-x-3">
				<label class="w-32 text-sm font-medium text-gray-700">배달비용</label>
				<div class="flex-1">
					<input
						type="text"
						bind:value={formData.deliveryCost}
						class="w-full rounded border px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 {validationErrors.deliveryCost
							? 'border-red-500'
							: validationWarnings.deliveryCost
								? 'border-yellow-500'
								: 'border-gray-300'}"
						placeholder="배달비용 입력"
					/>
					{#if validationErrors.deliveryCost}
						<div class="mt-1 text-xs text-red-600">
							{validationErrors.deliveryCost[0]}
						</div>
					{/if}
					{#if validationWarnings.deliveryCost}
						<div class="mt-1 text-xs text-yellow-600">
							{validationWarnings.deliveryCost[0]}
						</div>
					{/if}
				</div>
			</div>
			<hr />

			<!-- 구분에 따른 동적 컴포넌트 렌더링 -->
			{#if formData.classification === '기공소'}
				<LabCompanyForm {formData} {onUpdateFormData} />
			{:else if formData.classification === '치과'}
				<DentalCompanyForm {formData} {onUpdateFormData} {editMode} {editData} />
			{/if}

			<hr />
			<div class="flex justify-end">
				<button
					type="button"
					class="mr-6 rounded-lg bg-gray-500 px-4 py-2 text-sm font-medium text-white hover:bg-gray-600 focus:outline-none focus:ring-4 focus:ring-gray-300"
				>
					<i class="ri-book-marked-line pr-1 text-base"></i>
					취소
				</button>
				<button
					type="button"
					onclick={handleSubmit}
					class="rounded-lg bg-violet-500 px-4 py-3 text-sm font-medium text-white hover:bg-violet-600 focus:outline-none focus:ring-4 focus:ring-violet-300"
				>
					<i
						class={editMode ? 'ri-edit-line' : 'ri-tooth-line'}
						class:pr-1={true}
						class:text-base={true}
					></i>
					{editMode ? '거래처 수정' : '거래처 추가'}
				</button>
			</div>
		</div>
	</form>
</div>
