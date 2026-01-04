<script lang="ts">
	import { WindowService } from '../../service/WindowService';
	import { onMount } from 'svelte';
	import axios from 'axios';
	import { toastStore } from '../../service/ToastService';
	import { getApiEndpoint, getBackendUrl } from '../../service/ConfigService';
	import { authService } from '../../service/auth/AuthService';

	// 토스트 메시지 표시 함수
	const showToast = (type: 'success' | 'error' | 'info' | 'warning', message: string) => {
		toastStore[type](message);
	};

	// JWT 토큰 가져오기 (AuthService를 통해)
	async function getAuthToken(): Promise<string | null> {
		try {
			return await authService.getJwtToken();
		} catch (error) {
			console.error('토큰 가져오기 오류:', error);
			return null;
		}
	}

	// 편집할 가격 항목 데이터
	let editingItem = $state<any>(null);

	// WindowService에서 편집할 항목 데이터 구독
	$effect(() => {
		const unsubscribe = WindowService.modalData.subscribe((data) => {
			if (data) {
				setEditingItem(data);
			}
		});
		return unsubscribe;
	});

	// 편집 폼 데이터
	let formData = $state({
		prkey: '',
		type: '',
		technicianname: '',
		price: '',
		fixed: false,
		isScan: false
	});

	// 모달이 열릴 때 편집할 항목 설정
	function setEditingItem(item: any) {
		if (!item) return;

		editingItem = item;
		formData.prkey = item.prkey || '';
		formData.type = item.type || '';
		formData.technicianname = item.technicianname || '';
		formData.price = item.price?.toString() || '';
		formData.fixed = item.fixed || false;
		formData.isScan = item.isScan || false;
	}

	// 편집 취소
	function cancelEdit() {
		formData.prkey = editingItem?.prkey || '';
		formData.type = editingItem?.type || '';
		formData.technicianname = editingItem?.technicianname || '';
		formData.price = editingItem?.price?.toString() || '';
	}

	// 가격 단위 조정 함수들
	function adjustPrice(amount: number) {
		const currentPrice = parseInt(formData.price) || 0;
		const newPrice = currentPrice + amount;
		// 가격이 0 이하로 내려가지 않도록 보호
		formData.price = Math.max(0, newPrice).toString();
	}

	// 폼 데이터 검증
	function validateForm(): { isValid: boolean; errors: string[] } {
		const errors: string[] = [];

		if (!formData.prkey.trim()) {
			errors.push('의뢰서용 고유번호를 입력해주세요.');
		}

		if (!formData.type.trim()) {
			errors.push('대분류를 선택해주세요.');
		}

		if (!formData.technicianname.trim()) {
			errors.push('기공명칭을 입력해주세요.');
		}

		const price = parseInt(formData.price);
		if (!formData.price.trim() || isNaN(price) || price < 0) {
			errors.push('유효한 가격을 입력해주세요.');
		}

		return { isValid: errors.length === 0, errors };
	}

	// 가격 수정 처리
	async function handleSubmit() {
		const validation = validateForm();
		if (!validation.isValid) {
			showToast('error', `입력 오류:\n${validation.errors.join('\n')}`);
			return;
		}

		if (!editingItem) {
			showToast('error', '편집할 항목이 없습니다.');
			return;
		}

		// JWT 토큰 확인
		const token = await getAuthToken();
		if (!token) {
			showToast('error', '인증 토큰이 없습니다. 다시 로그인해주세요.');
			return;
		}

		try {
			// ConfigService에서 백엔드 URL과 업데이트 엔드포인트 가져오기
			const backendUrl = getBackendUrl();
			const updateEndpoint = getApiEndpoint('price', 'update');
			if (!updateEndpoint) {
				showToast('error', 'API 엔드포인트를 찾을 수 없습니다.');
				return;
			}

			// 백엔드 URL과 엔드포인트 조합 (ID 치환)
			const fullUrl = `${backendUrl}${updateEndpoint.replace(':id', editingItem.id.toString())}`;
			console.log('수정 URL:', fullUrl);

			const response = await axios.put(fullUrl, formData, {
				headers: {
					Authorization: 'Bearer ' + token,
					'Content-Type': 'application/json'
				}
			});

			if (response.status >= 200 && response.status < 300) {
				const result = response.data;
				console.log('가격 수정 성공:', result);

				if (result.success) {
					showToast('success', '가격 정보가 성공적으로 수정되었습니다.');
					// 부모 컴포넌트에 수정 완료 알림
					WindowService.closeModal();
					// 페이지 새로고침을 위해 이벤트 발생
					window.dispatchEvent(new CustomEvent('priceUpdated'));
				} else {
					showToast('error', result.message || '수정에 실패했습니다.');
				}
			} else {
				showToast('error', '수정에 실패했습니다. 잠시 후 다시 시도해주세요.');
			}
		} catch (error: any) {
			console.error('수정 오류:', error);
			const msg =
				error?.response?.data?.message || error?.message || '네트워크 오류가 발생했습니다.';
			showToast('error', `가격 수정 실패: ${msg}`);
		}
	}

	// prkey가 2로 시작하면 스캔여부 자동 체크 및 고정
	$effect(() => {
		if (formData.prkey.startsWith('2')) {
			formData.isScan = true;
		}
	});

	// 취소
	function cancelSubmit() {
		WindowService.closeModal();
	}
</script>

<div class="space-y-6">
	<!-- 편집할 항목 정보 표시 -->
	{#if editingItem}
		<div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
			<h4 class="mb-3 font-medium text-gray-800">편집할 항목 정보</h4>
			<div class="grid grid-cols-2 gap-4 text-sm">
				<div>
					<span class="font-medium text-gray-600">ID:</span>
					<span class="ml-2 text-gray-800">{editingItem.id}</span>
				</div>
				<div>
					<span class="font-medium text-gray-600">현재 가격:</span>
					<span class="ml-2 text-gray-800">{editingItem.price?.toLocaleString()}원</span>
				</div>
			</div>
		</div>
	{/if}

	<!-- 편집 폼 -->
	<div class="space-y-4">
		<!-- 의뢰서용 고유번호 -->
		<div>
			<label for="prkey" class="mb-2 block text-sm font-medium text-gray-700">
				의뢰서용 고유번호 <span class="text-red-500">*</span>
			</label>
			<input
				id="prkey"
				type="text"
				bind:value={formData.prkey}
				class="w-full rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200"
				placeholder="예: 1403, 1404, 1405..."
				disabled
			/>
		</div>

		<!-- 대분류 -->
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

		<!-- 기공명칭 -->
		<div>
			<label for="technicianname" class="mb-2 block text-sm font-medium text-gray-700">
				기공명칭 <span class="text-red-500">*</span>
			</label>
			<input
				id="technicianname"
				type="text"
				bind:value={formData.technicianname}
				class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200"
				placeholder="예: F.D frame (ticonium), 캡 기본, 파샬 기본..."
			/>
		</div>

		<!-- 가격 -->
		<div>
			<label for="price" class="mb-2 block text-sm font-medium text-gray-700">
				가격 <span class="text-red-500">*</span>
			</label>
			<div class="flex items-center space-x-2">
				<input
					id="price"
					type="number"
					bind:value={formData.price}
					class="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200"
					placeholder="0"
					min="0"
					step="1"
				/>
				<span class="text-sm text-gray-500">원</span>
			</div>

			<!-- 가격 단위 조정 버튼들 (3분할) -->
			<div class="mt-2 grid grid-cols-3 gap-2">
				<!-- +10,000 / -10,000 -->
				<div class="flex flex-col space-y-1">
					<button
						type="button"
						onclick={() => adjustPrice(10000)}
						class="rounded-md bg-green-500 px-2 py-1 text-xs text-white hover:bg-green-600"
					>
						+10,000
					</button>
					<button
						type="button"
						onclick={() => adjustPrice(-10000)}
						class="rounded-md bg-red-500 px-2 py-1 text-xs text-white hover:bg-red-600"
					>
						-10,000
					</button>
				</div>

				<!-- +1,000 / -1,000 -->
				<div class="flex flex-col space-y-1">
					<button
						type="button"
						onclick={() => adjustPrice(1000)}
						class="rounded-md bg-green-500 px-2 py-1 text-xs text-white hover:bg-green-600"
					>
						+1,000
					</button>
					<button
						type="button"
						onclick={() => adjustPrice(-1000)}
						class="rounded-md bg-red-500 px-2 py-1 text-xs text-white hover:bg-red-600"
					>
						-1,000
					</button>
				</div>

				<!-- +500 / -500 -->
				<div class="flex flex-col space-y-1">
					<button
						type="button"
						onclick={() => adjustPrice(500)}
						class="rounded-md bg-green-500 px-2 py-1 text-xs text-white hover:bg-green-600"
					>
						+500
					</button>
					<button
						type="button"
						onclick={() => adjustPrice(-500)}
						class="rounded-md bg-red-500 px-2 py-1 text-xs text-white hover:bg-red-600"
					>
						-500
					</button>
				</div>

				<div class="flex flex-col space-y-4">
					<label class="relative inline-flex cursor-pointer items-center justify-between pt-4">
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
							<input
								type="checkbox"
								bind:checked={formData.isScan}
								class="peer sr-only"
								disabled={formData.prkey.startsWith('2')}
							/>
							<div
								class="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-violet-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-violet-300 dark:border-gray-600 dark:bg-gray-700 dark:peer-focus:ring-violet-800"
							></div>
						</div>
					</label>
				</div>
			</div>
		</div>
	</div>

	<!-- 액션 버튼들 -->
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
			class="rounded-md bg-violet-500 px-4 py-2 text-white hover:bg-violet-600"
			onclick={handleSubmit}
		>
			수정 완료
		</button>
	</div>
</div>
