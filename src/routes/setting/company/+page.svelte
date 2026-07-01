<script lang="ts">
	// 캘린더 처리용 DatePicker
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import CompanyForm from '../../../app/view/company/CompanyForm.svelte';
	import PageHeaderBar from '../../../app/view/components/PageHeaderBar.svelte';
	import { getApiEndpoint, getBackendUrl } from '../../../app/service/ConfigService';
	import { authService } from '../../../app/service/auth/AuthService';
	import { toastStore } from '../../../app/service/ToastService';

	// 거래처 목록 조회
	async function fetchCompanies() {
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
			const listEndpoint = getApiEndpoint('company', 'list');
			if (!listEndpoint) {
				showToast('error', 'API 엔드포인트를 찾을 수 없습니다.');
				return;
			}

			const fullUrl = `${backendUrl}${listEndpoint}`;
			console.log('거래처 목록 조회 URL:', fullUrl);

			const response = await fetch(fullUrl, {
				method: 'GET',
				headers: {
					Authorization: 'Bearer ' + token,
					'Content-Type': 'application/json'
				}
			});

			if (response.ok) {
				const result = await response.json();
				console.log('API 응답:', result);
				if (result.success) {
					companies = result.data || [];
					console.log('거래처 목록 조회 성공:', result);
					console.log('companies 상태 업데이트:', companies);
					showToast('success', `총 ${companies.length}개의 거래처를 불러왔습니다.`);
				} else {
					showToast('error', result.message || '거래처 목록 조회에 실패했습니다.');
				}
			} else {
				const errorData = await response.json();
				console.error('API 오류 응답:', errorData);
				showToast('error', errorData.message || '거래처 목록 조회에 실패했습니다.');
			}
		} catch (error) {
			console.error('거래처 목록 조회 오류:', error);
			showToast('error', '네트워크 오류가 발생했습니다. 다시 시도해주세요.');
		} finally {
			isLoading = false;
		}
	}

	// 새 태스크 추가
	function addNewCompany() {
		console.log('거래처 추가');

		// 폼 데이터 초기화
		formData.corpName = '';
		formData.classification = '기공소';
		formData.region = '';
		formData.address = '';
		formData.detailAddress = '';
		formData.phoneNumber = '';
		formData.businessNumber = '';
		formData.email = '';
		formData.delivery = '';
		formData.deliveryCost = '';
		formData.printType = [];
		formData.priceData = [];

		// 선택된 거래처 정보 초기화
		selectedCompany = null;

		// 추가 뷰로 전환
		activeView = 'add';
	}

	// 목록으로 돌아가기
	function backToList() {
		activeView = 'list';
		selectedCompany = null;
		fetchCompanies(); // 목록 새로고침
	}

	// 페이지 데이터 처리
	const { data } = $props<{ data: any }>();

	// 활성 뷰잉 상태 관리
	let activeView = $state('list'); // 'list' 또는 'add'

	// 거래처 목록 상태
	let companies = $state<any[]>([]);
	let isLoading = $state(false);

	// 토스트 메시지 표시 함수
	const showToast = (type: 'success' | 'error' | 'info' | 'warning', message: string) => {
		toastStore[type](message);
	};

	// 폼 데이터 객체
	let formData = $state({
		corpName: '', // 회사명(치과명,기공소명)
		classification: '기공소', // 구분(기공소, 치과) - 기본값 설정
		region: '', // 지역
		address: '', // 주소
		detailAddress: '', // 상세 주소
		phoneNumber: '', // 전화번호
		businessNumber: '', // 사업자등록번호
		email: '', // 이메일
		printType: [], // 출력물 종류 (기공소용) - [{type: 'cap', normalPrice: 0, remakePrice: 0}]
		priceData: [],
		delivery: '',
		deliveryCost: ''
	});

	// 폼 제출 처리 함수 추가
	function handleSubmit() {
		console.log('폼 제출:', formData);
		// 여기에 실제 저장 로직 추가
	}

	// 페이지 로드 시 거래처 목록 자동 조회
	onMount(() => {
		fetchCompanies();
	});

	// 구분 변경 시 디버깅
	$effect(() => {
		if (formData.classification) {
			console.log('구분 선택됨:', formData.classification);
		}
	});

	// 거래처 선택 시 상세 정보 표시
	let selectedCompany = $state<any>(null);

	// 거래처 수정 버튼 클릭 시 호출되는 함수
	function editNewCompany(company: any) {
		console.log('거래처 수정 버튼 클릭됨');
		console.log('전달받은 company 데이터:', company);
		console.log('company.id:', company.id);
		console.log('company.corp_name:', company.corp_name);

		selectedCompany = company;
		console.log('selectedCompany 설정됨:', selectedCompany);

		activeView = 'detail';
		console.log('activeView 변경됨:', activeView);
	}

	// 삭제 확인 대상 거래처 (null이면 확인 모달 닫힘)
	let companyToDelete = $state<any>(null);
	let isDeleting = $state(false);

	// 삭제 버튼 클릭 → 확인 모달 열기 (즉시 삭제하지 않음)
	function requestDeleteCompany(company: any) {
		companyToDelete = company;
	}

	// 삭제 취소
	function cancelDeleteCompany() {
		if (isDeleting) return;
		companyToDelete = null;
	}

	// 삭제 확인 → 거래처 삭제 API 호출
	async function confirmDeleteCompany() {
		if (!companyToDelete) return;

		try {
			isDeleting = true;

			// JWT 토큰 가져오기
			const token = await authService.getJwtToken();
			if (!token) {
				showToast('error', '인증 토큰이 없습니다. 다시 로그인해주세요.');
				return;
			}

			// ConfigService에서 API 엔드포인트와 백엔드 URL 가져오기
			const backendUrl = getBackendUrl();
			const deleteEndpoint = getApiEndpoint('company', 'delete');
			if (!deleteEndpoint) {
				showToast('error', 'API 엔드포인트를 찾을 수 없습니다.');
				return;
			}

			// 거래처 ID 확인 (여러 가능한 필드명 대응 - CompanyForm과 동일 패턴)
			const companyId =
				companyToDelete.id ||
				companyToDelete.corp_id ||
				companyToDelete.corpClientId ||
				companyToDelete.corpClient_id;
			if (!companyId) {
				showToast('error', '거래처 ID를 찾을 수 없습니다.');
				return;
			}

			// 백엔드 계약: DELETE /api/v0/corp/list/:id (ID는 경로 파라미터, 바디 없음)
			const fullUrl = `${backendUrl}${deleteEndpoint.replace(':id', companyId)}`;

			const response = await fetch(fullUrl, {
				method: 'DELETE',
				headers: {
					Authorization: 'Bearer ' + token
				}
			});

			if (response.ok) {
				const result = await response.json();
				if (result.success) {
					showToast('success', '거래처가 성공적으로 삭제되었습니다.');
					companyToDelete = null;
					// 삭제된 거래처를 상세/수정 뷰에서 보고 있었다면 목록으로 복귀
					activeView = 'list';
					selectedCompany = null;
					await fetchCompanies(); // 목록 갱신
				} else {
					showToast('error', result.message || '거래처 삭제에 실패했습니다.');
				}
			} else {
				const errorData = await response.json().catch(() => ({}));
				console.error('거래처 삭제 API 오류 응답:', errorData);
				showToast('error', errorData.message || '거래처 삭제에 실패했습니다.');
			}
		} catch (error) {
			console.error('거래처 삭제 오류:', error);
			showToast('error', '네트워크 오류가 발생했습니다. 다시 시도해주세요.');
		} finally {
			isDeleting = false;
		}
	}
</script>

<main class="ml-64 mt-8 flex-1 bg-gray-100 p-8">
	<article class="w-full">
		<PageHeaderBar title="거래처 관리" description="기공소, 센터 통합 거래처 관리 페이지입니다.">
			<div class="flex flex-wrap items-center gap-2">
				<button
					type="button"
					onclick={fetchCompanies}
					disabled={isLoading}
					class="rounded-lg bg-gray-500 px-4 py-2 text-sm font-medium text-white hover:bg-gray-600 focus:outline-none focus:ring-4 focus:ring-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
				>
					<i class="ri-refresh-line pr-1 text-base" class:animate-spin={isLoading}></i>
					{isLoading ? '로딩 중...' : '새로고침'}
				</button>
				<button
					type="button"
					onclick={() => goto('/setting/pricelist')}
					class="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-300"
				>
					<i class="ri-book-marked-line pr-1 text-base"></i>
					기본 수가 설정
				</button>
				<!-- 거래처 추가 -->
				<button
					type="button"
					onclick={addNewCompany}
					class="rounded-lg bg-violet-500 px-4 py-2 text-sm font-medium text-white hover:bg-violet-600 focus:outline-none focus:ring-4 focus:ring-violet-300"
				>
					<i class="ri-tooth-line pr-1 text-base"></i>
					거래처 추가
				</button>
			</div>
		</PageHeaderBar>
		<article class="print-list">
			<div class="flex flex-col">
				<div class="flex h-full w-full flex-col lg:flex-row">
					<div
						class="mr-4 w-full overflow-auto border border-gray-200 shadow-lg dark:border-gray-700 md:rounded-lg lg:w-1/3"
					>
						<!-- 상단 탭 및 필터 바 UI (이미지 참고) -->
						<div class="user-tab-bar w-full border-b border-gray-200 bg-white">
							<div class="flex flex-wrap items-center justify-between">
								<!-- 탭 메뉴 -->
								<div class="flex w-full px-2 pt-2">
									<button
										class="tab-btn min-w-24 border-b-2 border-violet-500 px-4 py-3 pt-2 text-sm font-semibold text-violet-600 focus:outline-none"
										disabled
									>
										전체
									</button>
									<button
										class="tab-btn min-w-24 cursor-not-allowed border-b-2 border-transparent px-4 py-3 pt-2 text-sm font-semibold text-gray-400"
										disabled
									>
										기공소
									</button>
									<button
										class="tab-btn min-w-24 cursor-not-allowed border-b-2 border-transparent px-4 py-3 pt-2 text-sm font-semibold text-gray-400"
										disabled
									>
										센터
									</button>
								</div>
								<!-- 오른쪽 필터/검색 -->
								<div
									class="flex w-full items-center gap-2 border-t border-gray-200 bg-gray-100 px-2 py-4"
								>
									<!-- 검색 입력
										<div class="relative">
											<div class="relative">
												<i
													class="ri-search-line absolute left-2 top-1/2 -translate-y-1/2 text-gray-400"
												></i>
												<input
													type="text"
													class="h-12 w-80 rounded border border-gray-300 py-4 pl-8 pr-2 text-sm text-gray-600 placeholder-gray-400 focus:border-violet-500 focus:outline-none"
													placeholder="이름을 적어주세요 (예: 홍길동)"
													bind:value={$userStore.searchTerm}
												/>
											</div>
										</div> -->
								</div>
							</div>
						</div>
						<table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
							<thead class="bg-gray-50 dark:bg-gray-800">
								<tr>
									<th
										scope="col"
										class="cursor-pointer px-4 py-3.5 text-left text-sm font-normal text-gray-500 dark:text-gray-400 rtl:text-right"
									>
										<span>회사명</span>
									</th>
									<th
										scope="col"
										class="cursor-pointer px-4 py-3.5 text-left text-sm font-normal text-gray-500 dark:text-gray-400 rtl:text-right"
									>
										<span>구분</span>
									</th>
									<th
										scope="col"
										class="cursor-pointer px-4 py-3.5 text-left text-sm font-normal text-gray-500 dark:text-gray-400 rtl:text-right"
									>
										<span>지역</span>
									</th>
									<th
										scope="col"
										class="cursor-pointer px-4 py-3.5 text-left text-sm font-normal text-gray-500 dark:text-gray-400 rtl:text-right"
									>
										<span>관리</span>
									</th>
								</tr>
							</thead>
							<tbody
								class="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900"
							>
								{#if isLoading}
									<tr>
										<td colspan="7" class="py-12 text-center">
											<div class="flex flex-col items-center justify-center">
												<i class="ri-loader-4-line mb-4 animate-spin text-4xl text-gray-400"></i>
												<p class="text-lg font-medium text-gray-600 dark:text-gray-400">
													거래처 목록을 불러오는 중...
												</p>
											</div>
										</td>
									</tr>
								{:else if !companies || companies.length === 0}
									<tr>
										<td colspan="7" class="py-12 text-center">
											<div class="flex flex-col items-center justify-center">
												<i class="ri-file-damage-line mb-4 text-4xl text-gray-400"></i>
												<p class="text-lg font-medium text-gray-600 dark:text-gray-400">
													거래처가 존재하지 않습니다.
												</p>
												<p class="mt-2 text-sm text-gray-500 dark:text-gray-500">
													새로운 거래처를 추가해주세요.
												</p>
											</div>
										</td>
									</tr>
								{:else}
									{#each companies as company}
										<tr class="hover:bg-gray-50">
											<td class="px-4 py-3.5 text-sm text-gray-900">
												<span class="font-medium">{company.corp_name}</span>
											</td>
											<td class="px-4 py-3.5 text-sm text-gray-500">
												<span
													class="inline-flex items-center rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-800"
												>
													{company.classification}
												</span>
											</td>
											<td class="px-4 py-3.5 text-sm text-gray-500">
												{company.region}
											</td>
											<td class="whitespace-nowrap px-4 py-4 text-sm">
												<button
													class="rounded-lg px-2 py-1 text-gray-500 transition-colors duration-200 hover:bg-gray-100 dark:text-gray-300"
													aria-label="수정"
													onclick={() => editNewCompany(company)}
												>
													<i class="ri-edit-line text-lg"></i>
												</button>
												<button
													class="rounded-lg px-2 py-1 text-gray-500 transition-colors duration-200 hover:bg-gray-100 dark:text-gray-300"
													aria-label="삭제"
													onclick={() => requestDeleteCompany(company)}
												>
													<i class="ri-delete-bin-line"></i>
												</button>
											</td>
										</tr>
									{/each}
								{/if}
							</tbody>
						</table>
					</div>
					<div
						class="mr-4 w-full rounded-sm border border-gray-200 bg-white text-lg shadow-lg lg:w-2/3"
					>
						{#if activeView === 'list'}
							<!-- 기본 뷰: 거래처 정보 요약 -->
							<div class="flex border-b border-gray-200 p-4">
								<h4 class="text-lg font-semibold text-gray-700">거래처 정보</h4>
							</div>
							<div class="p-8">
								<div class="flex flex-col items-center justify-center text-center">
									<i class="ri-building-line mb-4 text-6xl text-gray-300"></i>
									<h3 class="mb-2 text-xl font-medium text-gray-600">거래처를 선택하세요</h3>
									<p class="mb-6 text-sm text-gray-500">
										왼쪽 목록에서 거래처를 선택하면 상세 정보를 확인할 수 있습니다.
									</p>
									<button
										type="button"
										onclick={addNewCompany}
										class="rounded-lg bg-violet-500 px-6 py-3 text-sm font-medium text-white hover:bg-violet-600 focus:outline-none focus:ring-4 focus:ring-violet-300"
									>
										<i class="ri-add-line mr-2"></i>
										새 거래처 추가
									</button>
								</div>
							</div>
						{:else if activeView === 'add'}
							<!-- 거래처 추가 뷰 -->
							<div class="flex items-center justify-between border-b border-gray-200 p-4">
								<h4 class="text-lg font-semibold text-gray-700">신규 거래처 추가</h4>
								<button
									type="button"
									onclick={backToList}
									class="rounded-lg bg-gray-500 px-3 py-2 text-sm font-medium text-white hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300"
								>
									<i class="ri-arrow-left-line mr-1"></i>
									목록으로
								</button>
							</div>
							<div class="p-2">
								<CompanyForm
									{formData}
									onAddCompany={() => {
										// 거래처 추가 성공 시 목록으로 돌아가기
										backToList();
									}}
									onUpdateFormData={(updates) => {
										Object.assign(formData, updates);
									}}
								/>
							</div>
						{:else if activeView === 'detail' && selectedCompany}
							<!-- 거래처 수정 뷰 -->
							<div class="flex items-center justify-between border-b border-gray-200 p-4">
								<h4 class="text-lg font-semibold text-gray-700">거래처 정보 수정</h4>
								<button
									type="button"
									onclick={backToList}
									class="rounded-lg bg-gray-500 px-3 py-2 text-sm font-medium text-white hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300"
								>
									<i class="ri-arrow-left-line mr-1"></i>
									목록으로
								</button>
							</div>
							<div class="p-2">
								<CompanyForm
									{formData}
									editMode={true}
									editData={selectedCompany}
									onAddCompany={() => {
										// 수정 완료 후 목록으로 돌아가기
										backToList();
									}}
									onUpdateFormData={(updates) => {
										Object.assign(formData, updates);
									}}
								/>
							</div>
						{/if}
					</div>
				</div>
			</div>
		</article>
	</article>
</main>

<!-- 거래처 삭제 확인 모달 -->
{#if companyToDelete}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
		<div class="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
			<div class="text-center">
				<div
					class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100"
				>
					<i class="ri-delete-bin-line text-2xl text-red-600"></i>
				</div>
				<h3 class="mb-2 text-lg font-medium text-gray-900 dark:text-gray-100">거래처 삭제 확인</h3>
				<p class="text-sm text-gray-500 dark:text-gray-400">
					정말로 거래처 "{companyToDelete.corp_name}"을(를) 삭제하시겠습니까?
				</p>
				<p class="mt-2 text-xs text-red-500">이 작업은 되돌릴 수 없습니다.</p>
			</div>
			<div class="mt-6 flex items-center justify-end space-x-3">
				<button
					type="button"
					onclick={cancelDeleteCompany}
					disabled={isDeleting}
					class="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
				>
					취소
				</button>
				<button
					type="button"
					onclick={confirmDeleteCompany}
					disabled={isDeleting}
					class="rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
				>
					<i class="ri-delete-bin-line pr-1" class:animate-spin={isDeleting}></i>
					{isDeleting ? '삭제 중...' : '삭제'}
				</button>
			</div>
		</div>
	</div>
{/if}

<style lang="scss">
	#sidebar {
		&.hover {
			.collapsed-hidden {
				display: block;
			}
		}
		&.active {
			.collapsed-hidden {
				display: block;
			}
		}

		.collapsed-hidden {
			display: none;
		}
	}
	.dropdownMenu {
		&.active {
			.dropdownMenuContnet {
				display: block;
			}
		}
	}
	.nav-search-box {
		button.active {
			background-color: rgb(236 72 153 / var(--tw-text-opacity, 1));
			border-color: rgb(236 72 153 / var(--tw-text-opacity, 1));
			color: white;
		}
	}
</style>
