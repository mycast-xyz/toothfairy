<script lang="ts">
	import { WindowService } from '../../service/WindowService';
	import { toastStore } from '../../service/ToastService';
	import { getApiEndpoint, getBackendUrl } from '../../../app/service/ConfigService';
	import { authService } from '../../../app/service/auth/AuthService';

	// 토스트 메시지 표시 함수
	const showToast = (type: 'success' | 'error' | 'info' | 'warning', message: string) => {
		toastStore[type](message);
	};

	// 폼 데이터
	let formData = $state({
		key: '',
		prkey: '',
		type: '',
		koName: '',
		price: '',
		fixed: false,
		isScan: false
	});

	// prkey 자동 생성 로직
	$effect(() => {
		const typeMap: Record<string, string> = {
			gold: '1',
			crown: '2',
			por: '3',
			zir: '4',
			denture: '5',
			allonx: '6',
			braces: '7',
			etc: '8'
		};

		const typeDigit = typeMap[formData.type] || '0';
		// key가 없으면 '00', 1자리만 있으면 앞에 '0' 붙임
		const keyDigits = formData.key.padStart(2, '0');

		console.log(
			`[Debug] Type: ${formData.type}, TypeDigit: ${typeDigit}, Key: ${formData.key}, KeyDigits: ${keyDigits}`
		);

		// 1000 단위 (기본값) + 대분류(100단위) + 고유번호(10단위 이하)
		// 예: gold(1) + key(5) -> 1105
		if (formData.key) {
			formData.prkey = `1${typeDigit}${keyDigits}`;
		} else {
			// 입력이 없으면 초기값 혹은 빈값 처리 (여기서는 계산된 값 유지하되 key가 없으므로 뒷자리는 00)
			formData.prkey = `1${typeDigit}00`;
		}
		console.log(`[Debug] Generated Prkey: ${formData.prkey}`);
	});

	// 전체 가격목록 조회
	async function fetchPriceSearch() {
		try {
			// JWT 토큰 가져오기
			const token = await authService.getJwtToken();
			if (!token) {
				return 'token';
			}

			// ConfigService에서 API 엔드포인트와 백엔드 URL 가져오기
			const backendUrl = getBackendUrl();
			const listEndpoint = getApiEndpoint('price', 'search');
			if (!listEndpoint) {
				return 'api';
			}

			const fullUrl = `${backendUrl}${listEndpoint.replace(':prkey', formData.prkey)}`;
			console.log('가격 목록 조회 URL:', fullUrl);

			const response = await fetch(fullUrl, {
				method: 'GET',
				headers: {
					Authorization: 'Bearer ' + token,
					'Content-Type': 'application/json'
				}
			});

			if (response.ok) {
				const result = await response.json();
				if (result.success) {
					return 'true';
				} else {
					return 'false';
				}
			} else {
				return 'error';
			}
		} catch (error) {
			console.error('가격 목록 조회 오류:', error);
			return 'error';
		}
	}

	// 폼 데이터 검증
	async function validateForm(): Promise<{ isValid: boolean; errors: string[]; errorId?: string }> {
		const errors: string[] = [];
		let errorId: string | undefined;
		const price = parseInt(formData.price);

		if (!formData.key.trim()) {
			errors.push('임의 지정 고유번호를 입력해주세요.');
			if (!errorId) errorId = 'key';
		} else if (formData.key.length > 2) {
			errors.push('고유번호는 2자리 미만이어야 합니다.');
			if (!errorId) errorId = 'key';
		} else if (!formData.type.trim()) {
			errors.push('대분류를 선택해주세요.');
			if (!errorId) errorId = 'type';
		} else if (!formData.koName.trim()) {
			errors.push('한글이름을 입력해주세요.');
			if (!errorId) errorId = 'koName';
		} else if (!String(formData.price).trim() || isNaN(price) || price < 0) {
			errors.push('유효한 금액을 입력해주세요.');
			if (!errorId) errorId = 'price';
		} else {
			// 중복 검사 (다른 유효성 검사가 통과된 경우에만 실행)
			const exists = await fetchPriceSearch();
			if (exists === 'true') {
				errors.push('이미 존재하는 고유번호입니다.');
				if (!errorId) errorId = 'key';
			} else if (exists === 'error' || exists === 'api' || exists === 'token') {
				// 에러 처리 (선택사항: 에러를 표시하거나 넘어가거나)
				errors.push('중복 확인 중 오류가 발생했습니다.');
				// if (!errorId) errorId = 'key';
			}
		}

		return { isValid: errors.length === 0, errors, errorId };
	}

	// 폼 제출 처리
	async function handleSubmit() {
		const validation = await validateForm();
		if (!validation.isValid) {
			toastStore.error(`입력 오류:\n${validation.errors.join('\n')}`);
			// 에러 발생 필드로 포커스 이동
			if (validation.errorId) {
				const element = document.getElementById(validation.errorId);
				element?.focus();
			}
			return;
		}

		try {
			// 여기에 실제 등록 로직 추가
			// console.log('새 가격 등록:', formData);

			// 성공 시 모달 닫기
			toastStore.success('가격 정보가 성공적으로 등록되었습니다.');
			WindowService.closeModal();
		} catch (error) {
			console.error('가격 등록 오류:', error);
			toastStore.error('가격 등록 중 오류가 발생했습니다.');
		}
	}

	// 취소
	function cancelSubmit() {
		WindowService.closeModal();
	}
</script>

<div class="space-y-4">
	<div>
		<!-- 폼 필드들 -->
		<div class="space-y-4">
			<div>
				<label for="key" class="mb-2 block text-sm font-medium text-gray-700"
					>임의 지정 고유번호 *</label
				>
				<input
					id="key"
					type="text"
					bind:value={formData.key}
					class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
					placeholder="예: 01"
					required
				/>
			</div>

			<div>
				<label for="type" class="mb-2 block text-sm font-medium text-gray-700">대분류 *</label>
				<select
					id="type"
					bind:value={formData.type}
					class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
					required
				>
					<option value="">선택하세요</option>
					<option value="gold">골드</option>
					<option value="crown">크라운</option>
					<option value="por">POR</option>
					<option value="zir">지르코니아</option>
					<option value="denture">덴쳐</option>
					<option value="allonx">올온포</option>
					<option value="braces">교정</option>
					<option value="etc">기타</option>
				</select>
			</div>

			<div>
				<label for="koName" class="mb-2 block text-sm font-medium text-gray-700">한글이름 *</label>
				<input
					id="koName"
					type="text"
					bind:value={formData.koName}
					class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
					placeholder="예: 캡 리메이크"
					required
				/>
			</div>

			<div>
				<label for="price" class="mb-2 block text-sm font-medium text-gray-700">금액 *</label>
				<input
					id="price"
					type="number"
					bind:value={formData.price}
					class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
					placeholder="0"
					min="0"
					step="1000"
					required
				/>
			</div>

			<div class="flex flex-col space-y-4">
				<label class="relative inline-flex cursor-pointer items-center justify-between">
					<span class="mr-3 text-sm font-medium text-gray-900 dark:text-gray-300">고정금액</span>
					<div class="relative">
						<input type="checkbox" bind:checked={formData.fixed} class="peer sr-only" />
						<div
							class="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-violet-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-violet-300 dark:border-gray-600 dark:bg-gray-700 dark:peer-focus:ring-violet-800"
						></div>
					</div>
				</label>
				<label class="relative inline-flex cursor-pointer items-center justify-between">
					<span class="mr-3 text-sm font-medium text-gray-900 dark:text-gray-300">스캔여부</span>
					<div class="relative">
						<input type="checkbox" bind:checked={formData.isScan} class="peer sr-only" />
						<div
							class="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-violet-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-violet-300 dark:border-gray-600 dark:bg-gray-700 dark:peer-focus:ring-violet-800"
						></div>
					</div>
				</label>
			</div>
		</div>
	</div>

	<div
		class="flex items-center justify-end space-x-3 rounded-b border-t border-gray-200 p-4 dark:border-gray-600 md:p-5 rtl:space-x-reverse"
	>
		<button
			class="rounded-md bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300"
			onclick={cancelSubmit}
		>
			취소
		</button>
		<button
			type="button"
			class="rounded bg-violet-500 px-4 py-2 text-sm font-medium text-white hover:bg-violet-600"
			onclick={handleSubmit}
		>
			등록
		</button>
	</div>
</div>
