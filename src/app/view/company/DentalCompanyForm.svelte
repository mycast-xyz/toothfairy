<script lang="ts">
	import { onMount } from 'svelte';
	import { getApiEndpoint, getBackendUrl } from '../../service/ConfigService';
	import { authService } from '../../service/auth/AuthService';
	import { toastStore } from '../../service/ToastService';

	// props 정의
	let {
		formData,
		onUpdateFormData,
		editMode = false,
		editData = null
	} = $props<{
		formData: any;
		onUpdateFormData: (updates: any) => void;
		editMode?: boolean;
		editData?: any;
	}>();

	// 토스트 메시지 표시 함수
	const showToast = (type: 'success' | 'error' | 'info' | 'warning', message: string) => {
		toastStore[type](message);
	};

	// 검색어 상태
	let searchTerm = $state('');
	let isLoading = $state(false);
	let viewMode = $state<'all' | 'base' | 'company'>('all'); // 보기 모드: 전체, 기본 수가, 회사별 가격

	// 기본 수가 목록 데이터 (백엔드에서 가져옴)
	let basePriceList = $state<any[]>([]);

	// 회사별 가격 데이터 (formData.priceData에서 가져옴)
	let companyPriceList = $derived.by(() => {
		return formData.priceData || [];
	});

	// 전체 가격 목록 (수정 모드일 때는 수정된 가격만, 생성 모드일 때는 기본 수가 + 회사별 가격)
	let priceList = $derived.by(() => {
		if (editMode && editData) {
			// 수정 모드: 수정된 가격 데이터만 표시
			return companyPriceList;
		} else {
			// 생성 모드: 기본 수가 + 회사별 가격
			return [...basePriceList, ...companyPriceList];
		}
	});

	// 검색 및 보기 모드에 따른 필터링된 목록
	let filteredPriceList = $derived.by(() => {
		let filtered = priceList;

		// 보기 모드에 따른 필터링
		if (viewMode === 'base') {
			filtered = basePriceList;
		} else if (viewMode === 'company') {
			filtered = companyPriceList;
		}

		// 검색어 필터링
		if (searchTerm) {
			filtered = filtered.filter(
				(item: any) =>
					item.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
					item.technicianname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
					item.prkey?.toLowerCase().includes(searchTerm.toLowerCase())
			);
		}

		return filtered;
	});

	// 기본 수가 목록 조회 (백엔드 API)
	async function fetchBasePriceList() {
		try {
			isLoading = true;

			// JWT 토큰 가져오기
			const token = await authService.getJwtToken();
			if (!token) {
				showToast('error', '인증 토큰이 없습니다. 다시 로그인해주세요.');
				return;
			}

			// ConfigService에서 API 엔드포인트와 백엔드 URL 가져오기
			const backendUrl = getBackendUrl();
			const listEndpoint = getApiEndpoint('price', 'list');
			if (!listEndpoint) {
				showToast('error', 'API 엔드포인트를 찾을 수 없습니다.');
				return;
			}

			const fullUrl = `${backendUrl}${listEndpoint}`;
			console.log('기본 수가 목록 조회 URL:', fullUrl);

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
					basePriceList = result.data || [];
					console.log('기본 수가 목록 조회 성공:', result);
					showToast('success', `기본 수가 ${basePriceList.length}개를 불러왔습니다.`);

					// 기본 수가 리스트를 formData.priceData에 자동으로 포함
					const currentCompanyPrices = formData.priceData || [];
					const updatedPriceData = [...basePriceList, ...currentCompanyPrices];
					onUpdateFormData({
						priceData: updatedPriceData
					});
				} else {
					showToast('error', result.message || '기본 수가 목록 조회에 실패했습니다.');
				}
			} else {
				const errorData = await response.json();
				showToast('error', errorData.message || '기본 수가 목록 조회에 실패했습니다.');
			}
		} catch (error) {
			console.error('기본 수가 목록 조회 오류:', error);
			showToast('error', '네트워크 오류가 발생했습니다. 다시 시도해주세요.');
		} finally {
			isLoading = false;
		}
	}

	// 가격 수정 함수 (기본 수가와 회사별 가격 모두 수정 가능)
	function updatePrice(id: number, newPrice: number) {
		// 기본 수가인지 확인
		const basePriceIndex = basePriceList.findIndex((item: any) => item.id === id);
		if (basePriceIndex !== -1) {
			// 기본 수가 수정
			basePriceList[basePriceIndex] = {
				...basePriceList[basePriceIndex],
				price: newPrice.toString()
			};

			// 기본 수가 수정 시에도 formData.priceData 업데이트
			// 기존 formData.priceData에서 해당 항목만 업데이트
			const currentPriceData = formData.priceData || [];
			const updatedPriceData = currentPriceData.map((item: any) =>
				item.id === id ? { ...item, price: newPrice.toString() } : item
			);
			onUpdateFormData({
				priceData: updatedPriceData
			});
		} else {
			// 회사별 가격 수정
			const companyPriceIndex = companyPriceList.findIndex((item: any) => item.id === id);
			if (companyPriceIndex !== -1) {
				companyPriceList[companyPriceIndex] = {
					...companyPriceList[companyPriceIndex],
					price: newPrice.toString()
				};

				// 상위 컴포넌트의 formData.priceData 업데이트
				// 기존 formData.priceData에서 해당 항목만 업데이트
				const currentPriceData = formData.priceData || [];
				const updatedPriceData = currentPriceData.map((item: any) =>
					item.id === id ? { ...item, price: newPrice.toString() } : item
				);
				onUpdateFormData({
					priceData: updatedPriceData
				});
			}
		}
	}

	// 중복 검증 함수
	function validateDuplicatePrice(
		prkey: string,
		technicianname: string,
		excludeId?: number // 현재 수정 중인 항목의 ID (자기 자신은 제외)
	): { isValid: boolean; message: string } {
		console.log('=== 중복 검증 시작 ===');
		console.log('검증할 값:', { prkey, technicianname, excludeId });
		console.log('현재 기본 수가 목록:', basePriceList);
		console.log('현재 회사별 가격 목록:', companyPriceList);

		// 기본 수가와 중복 검사
		const baseDuplicate = basePriceList.find(
			(item: any) =>
				(item.prkey === prkey && prkey !== '') ||
				(item.technicianname === technicianname && technicianname !== '')
		);

		if (baseDuplicate) {
			console.log('기본 수가와 중복 발견:', baseDuplicate);
			return {
				isValid: false,
				message: `기본 수가와 겹치는 항목이 있습니다. (고유번호: ${baseDuplicate.prkey}, 기공명칭: ${baseDuplicate.technicianname})`
			};
		}

		// 회사별 가격과 중복 검사 (자기 자신 제외)
		const companyDuplicate = companyPriceList.find(
			(item: any) =>
				item.id !== excludeId && // 자기 자신은 제외
				((item.prkey === prkey && prkey !== '') ||
					(item.technicianname === technicianname && technicianname !== ''))
		);

		if (companyDuplicate) {
			console.log('회사별 가격과 중복 발견:', companyDuplicate);
			return {
				isValid: false,
				message: `이미 등록된 회사별 가격과 겹치는 항목이 있습니다. (고유번호: ${companyDuplicate.prkey}, 기공명칭: ${companyDuplicate.technicianname})`
			};
		}

		console.log('중복 검증 통과');
		return { isValid: true, message: '' };
	}

	// 가격 추가 함수 (기본 수가 + 회사별 가격 모두 포함)
	function addPrice() {
		// 기존 리스트에서 가장 큰 ID 찾기
		const allIds = [
			...basePriceList.map((item: any) => item.id),
			...companyPriceList.map((item: any) => item.id)
		];
		const maxId = allIds.length > 0 ? Math.max(...allIds) : 0;
		const newId = maxId + 10000; // 기존 최대 ID에 +10000

		const newPrice = {
			id: newId,
			prkey: '',
			type: '',
			technicianname: '',
			price: '0',
			isCompanyPrice: true // 회사별 가격임을 표시
		};

		// 기본 수가 + 기존 회사별 가격 + 새로운 가격
		const updatedPriceData = [...basePriceList, ...companyPriceList, newPrice];
		onUpdateFormData({
			priceData: updatedPriceData
		});
	}

	// 가격 삭제 함수 (회사별 가격만 삭제 가능, 기본 수가는 유지)
	function deletePrice(id: number) {
		// 기본 수가는 삭제 불가, 회사별 가격만 삭제 가능
		const companyPriceIndex = companyPriceList.findIndex((item: any) => item.id === id);
		if (companyPriceIndex !== -1) {
			if (confirm('정말로 이 회사별 가격 정보를 삭제하시겠습니까?')) {
				// 기본 수가 + 삭제 후 회사별 가격
				const updatedCompanyPriceData = companyPriceList.filter((item: any) => item.id !== id);
				const updatedPriceData = [...basePriceList, ...updatedCompanyPriceData];
				onUpdateFormData({
					priceData: updatedPriceData
				});
			}
		} else {
			showToast('info', '기본 수가는 삭제할 수 없습니다. 회사별 가격만 삭제 가능합니다.');
		}
	}

	// 페이지 로드 시 수정 모드 감지 및 데이터 처리
	onMount(() => {
		if (editMode && editData) {
			// 수정 모드: CompanyForm에서 이미 처리됨, 추가 처리 불필요
			console.log('수정 모드: CompanyForm에서 이미 데이터 처리됨');
		} else {
			// 생성 모드: 기본 수가 목록 조회
			fetchBasePriceList();
		}
	});
</script>

<div class="space-y-6">
	<!-- 상단 검색 및 추가 바 -->
	<div class="mb-4 flex items-center justify-between">
		<div class="flex items-center space-x-3">
			<label class="w-32 text-sm font-medium text-gray-700">치료 가격 검색</label>
			<div class="flex items-center space-x-3">
				<input
					type="text"
					bind:value={searchTerm}
					placeholder="치료 종류, 기공명칭, 고유번호로 검색..."
					class="w-64 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
				/>
			</div>
		</div>
		<div class="flex items-center space-x-2">
			<button
				type="button"
				onclick={fetchBasePriceList}
				disabled={isLoading}
				class="rounded-lg bg-gray-500 px-4 py-2 text-sm font-medium text-white hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:opacity-50"
			>
				<i class="ri-refresh-line mr-2" class:animate-spin={isLoading}></i>
				{isLoading ? '로딩 중...' : '기본 수가 새로고침'}
			</button>
			<button
				type="button"
				onclick={addPrice}
				class="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300"
			>
				<i class="ri-add-line mr-2"></i>
				회사별 가격 추가
			</button>
		</div>
	</div>

	<!-- 전체 가격 목록 테이블 -->
	<div class="rounded-lg border border-gray-200 bg-white shadow-sm">
		<div class="border-b border-gray-200 px-4 py-3">
			<div class="flex items-center justify-between">
				<h3 class="text-sm font-semibold text-gray-800">
					치료 가격 목록 (기본 수가: {basePriceList.length}개, 회사별 가격: {companyPriceList.length}개)
				</h3>
				<div class="flex space-x-1">
					<button
						type="button"
						onclick={() => (viewMode = 'all')}
						class="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors {viewMode === 'all'
							? 'bg-blue-500 text-white'
							: 'bg-gray-200 text-gray-700 hover:bg-gray-300'}"
					>
						전체
					</button>
					<button
						type="button"
						onclick={() => (viewMode = 'base')}
						class="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors {viewMode === 'base'
							? 'bg-blue-500 text-white'
							: 'bg-gray-200 text-gray-700 hover:bg-gray-300'}"
					>
						기본
					</button>
					<button
						type="button"
						onclick={() => (viewMode = 'company')}
						class="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors {viewMode ===
						'company'
							? 'bg-blue-500 text-white'
							: 'bg-gray-200 text-gray-700 hover:bg-gray-300'}"
					>
						회사별
					</button>
				</div>
			</div>
		</div>

		<div class="overflow-x-auto">
			{#if isLoading && basePriceList.length === 0}
				<div class="px-4 py-8 text-center">
					<div class="flex flex-col items-center justify-center">
						<i class="ri-loader-4-line mb-4 animate-spin text-4xl text-gray-400"></i>
						<p class="text-lg font-medium text-gray-600">기본 수가 목록을 불러오는 중...</p>
					</div>
				</div>
			{:else if filteredPriceList.length === 0}
				<div class="px-4 py-8 text-center">
					<div class="flex flex-col items-center justify-center">
						<i class="ri-price-tag-3-line mb-4 text-4xl text-gray-400"></i>
						<p class="text-lg font-medium text-gray-600">
							{searchTerm ? '검색 결과가 없습니다.' : '가격 정보가 존재하지 않습니다.'}
						</p>
						{#if !searchTerm}
							<p class="mt-2 text-sm text-gray-500">새로운 가격 정보를 등록해주세요.</p>
						{/if}
					</div>
				</div>
			{:else}
				<table class="w-full">
					<thead class="bg-gray-50">
						<tr>
							<th
								class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
								>구분</th
							>
							<th
								class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
								>번호</th
							>
							<th
								class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
								>고유번호</th
							>
							<th
								class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
								>치료 종류</th
							>
							<th
								class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
								>기공명칭</th
							>
							<th
								class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
								>가격</th
							>
							<th
								class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
								>관리</th
							>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200 bg-white">
						{#each filteredPriceList as item}
							{@const isBasePrice = !item.isCompanyPrice}
							<tr class="hover:bg-gray-50 {isBasePrice ? 'bg-white' : ''}">
								<td class="px-4 py-3 text-sm">
									<span
										class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium {isBasePrice
											? 'bg-blue-100 text-blue-800'
											: 'bg-green-100 text-green-800'}"
									>
										{isBasePrice ? '기본 수가' : '회사별 가격'}
									</span>
								</td>
								<td class="px-4 py-3 text-sm text-gray-900">{item.id}</td>
								<td class="px-4 py-3 text-sm text-gray-600">
									{#if isBasePrice}
										<span class="text-gray-600">{item.prkey || 'N/A'}</span>
									{:else}
										<input
											type="text"
											value={item.prkey || ''}
											onchange={(e) => {
												const newValue = (e.target as HTMLInputElement).value;
												const index = companyPriceList.findIndex((p: any) => p.id === item.id);
												if (index !== -1) {
													// 중복 검증 (자기 자신 제외)
													const validation = validateDuplicatePrice(
														newValue,
														companyPriceList[index].technicianname,
														item.id
													);
													if (validation.isValid) {
														companyPriceList[index] = {
															...companyPriceList[index],
															prkey: newValue
														};
														onUpdateFormData({ priceData: [...companyPriceList] });
													} else {
														showToast('error', validation.message);
														// 원래 값으로 되돌리기
														(e.target as HTMLInputElement).value = item.prkey || '';
													}
												}
											}}
											class="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
											placeholder="고유번호 입력"
										/>
									{/if}
								</td>
								<td class="px-4 py-3 text-sm">
									{#if isBasePrice}
										<span
											class="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800"
										>
											{item.type || 'N/A'}
										</span>
									{:else}
										<input
											type="text"
											value={item.type || ''}
											onchange={(e) => {
												const newValue = (e.target as HTMLInputElement).value;
												const index = companyPriceList.findIndex((p: any) => p.id === item.id);
												if (index !== -1) {
													// 중복 검증 (치료 종류는 고유번호와 기공명칭만 검증, 자기 자신 제외)
													const validation = validateDuplicatePrice(
														companyPriceList[index].prkey,
														companyPriceList[index].technicianname,
														item.id
													);
													if (validation.isValid) {
														companyPriceList[index] = {
															...companyPriceList[index],
															type: newValue
														};
														onUpdateFormData({ priceData: [...companyPriceList] });
														showToast('success', '치료 종류가 수정되었습니다.');
													} else {
														showToast('error', validation.message);
														// 원래 값으로 되돌리기
														(e.target as HTMLInputElement).value = item.type || '';
													}
												}
											}}
											class="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
											placeholder="치료 종류 입력"
										/>
									{/if}
								</td>
								<td class="px-4 py-3 text-sm text-gray-600">
									{#if isBasePrice}
										<span class="text-gray-600">{item.technicianname || 'N/A'}</span>
									{:else}
										<input
											type="text"
											value={item.technicianname || ''}
											onchange={(e) => {
												const newValue = (e.target as HTMLInputElement).value;
												const index = companyPriceList.findIndex((p: any) => p.id === item.id);
												if (index !== -1) {
													// 중복 검증 (자기 자신 제외)
													const validation = validateDuplicatePrice(
														companyPriceList[index].prkey,
														newValue,
														item.id
													);
													if (validation.isValid) {
														companyPriceList[index] = {
															...companyPriceList[index],
															technicianname: newValue
														};
														onUpdateFormData({ priceData: [...companyPriceList] });
														showToast('success', '기공명칭이 수정되었습니다.');
													} else {
														showToast('error', validation.message);
														// 원래 값으로 되돌리기
														(e.target as HTMLInputElement).value = item.technicianname || '';
													}
												}
											}}
											class="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
											placeholder="기공명칭 입력"
										/>
									{/if}
								</td>
								<td class="px-4 py-3 text-sm font-medium text-gray-900">
									<div class="flex items-center space-x-2">
										<input
											type="number"
											value={Number(item.price) || 0}
											onchange={(e) =>
												updatePrice(item.id, Number((e.target as HTMLInputElement).value))}
											class="w-24 rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
											min="0"
											step="1000"
										/>
										<span class="text-gray-500">원</span>
									</div>
									{#if isBasePrice}
										<div class="mt-1 flex space-x-1">
											<button
												type="button"
												onclick={() =>
													updatePrice(item.id, Math.max(0, Number(item.price) - 10000))}
												class="rounded bg-blue-500 px-2 py-1 text-xs font-medium text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300"
												title="-10,000원"
											>
												-10K
											</button>
											<button
												type="button"
												onclick={() => updatePrice(item.id, Math.max(0, Number(item.price) - 1000))}
												class="rounded bg-blue-500 px-2 py-1 text-xs font-medium text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300"
												title="-1,000원"
											>
												-1K
											</button>
											<button
												type="button"
												onclick={() => updatePrice(item.id, Number(item.price) + 1000)}
												class="rounded bg-blue-500 px-2 py-1 text-xs font-medium text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300"
												title="+1,000원"
											>
												+1K
											</button>
											<button
												type="button"
												onclick={() => updatePrice(item.id, Number(item.price) + 10000)}
												class="rounded bg-blue-500 px-2 py-1 text-xs font-medium text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300"
												title="+10,000원"
											>
												+10K
											</button>
										</div>
									{/if}
								</td>
								<td class="px-4 py-3 text-sm">
									{#if !isBasePrice}
										<button
											class="text-red-500 transition-colors hover:text-red-700"
											title="삭제"
											onclick={() => deletePrice(item.id)}
										>
											<i class="ri-delete-bin-line"></i>
										</button>
									{:else}
										<span class="text-xs text-gray-400">수정 불가</span>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{/if}
		</div>
	</div>
</div>
