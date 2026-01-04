<script lang="ts">
	import PageHeaderBar from '../../components/PageHeaderBar.svelte';
	import {
		requestStore,
		requestInfo,
		treatmentForms,
		type ReferenceImage
	} from '../../../service/request/RequestStore';
	import { onMount } from 'svelte';
	import { toastStore } from '../../../service/ToastService';
	import { authService } from '../../../service/auth/AuthService';
	import { configService } from '../../../service/ConfigService';

	// props로 부모 컴포넌트의 nextStep, prevStep 함수를 받음
	let { nextStep, prevStep } = $props<{ nextStep: () => void; prevStep: () => void }>();

	// 컴포넌트 마운트 시 치료 종목 로드
	onMount(() => {
		// 현재 선택된 치과의 치료 종목이 있다면 로드
		$requestInfo.dentalClinicId && requestStore.loadTreatmentItems($requestInfo.dentalClinicId);

		// requestInfo 콘솔 출력
		console.log('=== RequestInfo 데이터 ===');
		console.log(JSON.stringify($requestInfo, null, 2));
		console.log(JSON.stringify($treatmentForms, null, 2));
	});

	// 치료폼 삭제
	function removeTreatmentForm(id: string) {
		if (confirm('이 치료 항목을 삭제하시겠습니까?')) {
			requestStore.removeTreatmentForm(id);
		}
	}

	// 치료 정보 처리 함수 (완료 버튼)
	async function handleTreatmentInfo() {
		// 치료폼이 있는지 확인
		if ($treatmentForms.length === 0) {
			alert('최소 하나의 치료 항목을 추가해주세요.');
			return;
		}

		// 로딩 상태 시작
		isSubmitting = true;

		try {
			// 모든 데이터 통합 가져오기
			const completeData = requestStore.getCompleteRequestData();

			// 디버깅을 위한 콘솔 출력
			console.log('='.repeat(80));
			console.log('🎉 의뢰서 작성 완료 - 모든 데이터 통합');
			console.log('='.repeat(80));

			console.log('📋 기본 의뢰서 정보 (총 금액 포함):');
			console.log(JSON.stringify(completeData.requestInfo, null, 2));

			console.log('🏥 치료 폼 정보:');
			console.log(JSON.stringify(completeData.treatmentForms, null, 2));

			console.log('🖼️ 참고 이미지 정보:');
			console.log(`이미지 개수: ${completeData.requestInfo.referenceImages.length}`);
			completeData.requestInfo.referenceImages.forEach((image, index) => {
				console.log(`이미지 ${index + 1}: ${image.name} (ID: ${image.id})`);
			});

			console.log('📊 메타데이터:');
			console.log(JSON.stringify(completeData.metadata, null, 2));

			console.log('🔍 전체 통합 데이터:');
			console.log(JSON.stringify(completeData, null, 2));

			console.log('='.repeat(80));
			console.log('✅ 의뢰서 데이터가 성공적으로 통합되었습니다!');
			console.log('='.repeat(80));

			// 백엔드 서버로 데이터 전송
			await submitRequestData(completeData);
			console.log('🎉 의뢰서 제출 완료!');

			// 다음 단계로 이동
			nextStep();
		} catch (error) {
			console.error('의뢰서 제출 중 오류 발생:', error);
		} finally {
			// 로딩 상태 종료
			isSubmitting = false;
		}
	}

	// 총 금액 계산
	let totalAmount = $derived(requestStore.calculateTotalAmount());

	// 참고 이미지 관련 변수
	let fileInput = $state<HTMLInputElement>();

	// 로딩 상태
	let isSubmitting = $state(false);

	// 참고 이미지 추가 함수
	function handleFileUpload(event: Event) {
		const target = event.target as HTMLInputElement;
		const files = target.files;
		if (files) {
			processFiles(Array.from(files));
		}
	}

	// 파일 처리 함수
	async function processFiles(files: File[]) {
		const imageFiles = files.filter((file) => file.type.startsWith('image/'));

		for (const file of imageFiles) {
			const reader = new FileReader();
			reader.onload = (e) => {
				const dataUrl = e.target?.result as string;
				const referenceImage: ReferenceImage = {
					id: crypto.randomUUID(),
					name: file.name,
					dataUrl: dataUrl,
					file: file
				};
				requestStore.addReferenceImage(referenceImage);
			};
			reader.readAsDataURL(file);
		}
	}

	// 참고 이미지 삭제 함수
	function removeReferenceImage(imageId: string) {
		requestStore.removeReferenceImage(imageId);
	}

	// 백엔드 서버로 데이터 전송
	async function submitRequestData(completeData: any) {
		try {
			console.log('🚀 백엔드 서버로 데이터 전송 시작...');

			// configService에서 백엔드 주소 가져오기
			const config = configService.getConfig();
			const baseUrl = config?.server?.backend?.baseUrl || 'http://localhost:3000';
			const endpoint = '/api/v0/request/';
			const url = `${baseUrl}${endpoint}`;

			console.log('의뢰서 제출 API 호출:', url);

			// JWT 토큰 가져오기
			const token = await authService.getJwtToken();

			const response = await fetch(url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`
				},
				body: JSON.stringify(completeData)
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const result = await response.json();
			console.log('✅ 백엔드 응답:', result);

			toastStore.success('의뢰서가 성공적으로 제출되었습니다!');

			return result;
		} catch (error) {
			console.error('❌ 백엔드 전송 실패:', error);
			toastStore.error('의뢰서 제출에 실패했습니다. 다시 시도해주세요.');
			throw error;
		}
	}
</script>

<main class="ml-64 mt-8 min-h-screen flex-1 bg-gray-100 p-8">
	<PageHeaderBar title="치료 정보" description="치료 항목을 추가하고 관리하세요."></PageHeaderBar>

	<div class="grid h-[calc(100vh-200px)] grid-cols-6 gap-8">
		<!-- 왼쪽 패널: 의뢰서 등록 폼 -->
		<div
			class="col-span-4 flex h-[calc(100vh-200px)] flex-col justify-between rounded-lg bg-white shadow-md"
		>
			<!-- 폼 필드들 -->
			<div class="grow p-6">
				<div class="space-y-6">
					<!-- 현재 의뢰 정보 요약 -->
					<div>
						<h3 class="mb-4 text-lg font-semibold text-gray-900">의뢰 정보</h3>
						<div class="grid grid-cols-2 gap-4 text-sm">
							<div>
								<span class="font-medium text-gray-600">환자명:</span>
								<span class="ml-2">{$requestInfo.patientName || '미입력'}</span>
							</div>
							<div>
								<span class="font-medium text-gray-600">의뢰 치과:</span>
								<span class="ml-2">{$requestInfo.dentalClinic || '미선택'}</span>
							</div>
							<div>
								<span class="font-medium text-gray-600">납품 요구일:</span>
								<span class="ml-2">{$requestInfo.deliveryDate || '미선택'}</span>
							</div>
							<div>
								<span class="font-medium text-gray-600">총 치료 항목:</span>
								<span class="ml-2 font-semibold text-violet-600">{$treatmentForms.length}개</span>
							</div>
						</div>
					</div>
					<hr />
					<div class="flex items-center justify-between">
						<h3 class="text-lg font-semibold text-gray-900">참고 이미지 추가</h3>
						<button
							onclick={() => fileInput?.click()}
							class="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-purple-700"
						>
							이미지 추가
						</button>
					</div>

					<!-- 숨겨진 파일 입력 -->
					<input
						bind:this={fileInput}
						type="file"
						multiple
						accept="image/*"
						onchange={handleFileUpload}
						class="hidden"
					/>

					<!-- 업로드된 이미지 미리보기 -->
					{#if $requestInfo.referenceImages.length > 0}
						<div class="mb-4">
							<h4 class="mb-2 text-sm font-medium text-gray-700">
								업로드된 이미지 ({$requestInfo.referenceImages.length}개)
							</h4>
							<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
								{#each $requestInfo.referenceImages as image (image.id)}
									<div class="group relative">
										<img
											src={image.dataUrl}
											alt={image.name}
											class="h-24 w-full rounded-lg object-cover shadow-sm"
										/>
										<div
											class="absolute inset-0 rounded-lg bg-black bg-opacity-0 transition-all duration-200 group-hover:bg-opacity-50"
										>
											<button
												onclick={() => removeReferenceImage(image.id)}
												class="absolute right-1 top-1 rounded-full bg-red-500 p-1 text-white opacity-0 transition-opacity duration-200 hover:bg-red-600 group-hover:opacity-100"
												aria-label="이미지 삭제"
												title="이미지 삭제"
											>
												<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M6 18L18 6M6 6l12 12"
													/>
												</svg>
											</button>
										</div>
										<p class="mt-1 truncate text-xs text-gray-600">{image.name}</p>
									</div>
								{/each}
							</div>
						</div>
					{/if}

					<hr />
					<div class="flex items-center justify-between">
						<h3 class="text-lg font-semibold text-gray-900">치료 항목</h3>
					</div>
					<!-- 치료 항목 목록 -->
					<div class="rounded-lg bg-white">
						{#if $treatmentForms.length === 0}
							<div class="p-8 text-center text-gray-500">
								<p>추가된 치료 항목이 없습니다.</p>
								<p class="mt-1 text-sm">위의 "치료 항목 추가" 버튼을 클릭하여 항목을 추가하세요.</p>
							</div>
						{:else}
							<div class="overflow-x-auto">
								<table
									class="min-w-full divide-y divide-gray-200 rounded-lg border border-gray-200"
								>
									<thead class="bg-gray-50">
										<tr>
											<th
												class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
												>치료 종목</th
											>
											<th
												class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
												>상악</th
											>
											<th
												class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
												>하악</th
											>
											<th
												class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
												>가격</th
											>
											<th
												class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
												>조정금액</th
											>
											<th
												class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
												>재작업</th
											>
											<th
												class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
												>총액</th
											>
											<th
												class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
												>작업</th
											>
										</tr>
									</thead>
									<tbody class="divide-y divide-gray-200 bg-white">
										{#each $treatmentForms as form}
											<tr>
												<td class="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
													{form.treatmentType}
												</td>
												<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
													{form.upperJaw || '-'}
												</td>
												<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
													{form.lowerJaw || '-'}
												</td>
												<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
													{form.price.toLocaleString()}원
												</td>
												<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
													{form.adjustmentAmount.toLocaleString()}원
												</td>
												<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
													{form.isRemake ? '예' : '아니오'}
												</td>
												<td class="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
													{(
														form.price *
															((form.upperJaw?.split(',').filter((t: string) => t.trim() !== '')
																.length || 0) +
																(form.lowerJaw?.split(',').filter((t: string) => t.trim() !== '')
																	.length || 0)) +
														form.adjustmentAmount
													).toLocaleString()}원
												</td>
												<td class="whitespace-nowrap px-6 py-4 text-sm font-medium">
													<button
														onclick={() => removeTreatmentForm(form.id)}
														class="text-red-600 hover:text-red-900"
													>
														삭제
													</button>
												</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						{/if}
					</div>

					<!-- 총 금액 요약 -->
					{#if $treatmentForms.length > 0}
						<div class="rounded-lg bg-violet-50 p-6">
							<h3 class="mb-4 text-lg font-semibold text-gray-900">금액 요약</h3>
							<div class="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
								<div>
									<span class="font-medium text-gray-600">총 기공물 개수:</span>
									<span class="ml-2 font-semibold text-violet-600">{totalAmount.totalItems}개</span>
								</div>
								<div>
									<span class="font-medium text-gray-600">기본 금액:</span>
									<span class="ml-2">{totalAmount.baseAmount.toLocaleString()}원</span>
								</div>
								<div>
									<span class="font-medium text-gray-600">조정 금액:</span>
									<span class="ml-2">{totalAmount.totalAdjustment.toLocaleString()}원</span>
								</div>
								<div>
									<span class="font-medium text-gray-600">총 금액:</span>
									<span class="ml-2 text-lg font-bold text-violet-600"
										>{totalAmount.totalAmount.toLocaleString()}원</span
									>
								</div>
							</div>
						</div>
					{/if}
					<!-- 네비게이션 버튼 -->
					<div class="flex justify-between pt-6">
						<button
							onclick={prevStep}
							class="rounded-lg bg-gray-500 px-6 py-3 text-white transition-colors hover:bg-gray-600"
						>
							이전
						</button>
						<button
							onclick={handleTreatmentInfo}
							disabled={isSubmitting}
							class="rounded-lg bg-violet-600 px-6 py-3 text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
						>
							{#if isSubmitting}
								<div class="flex items-center gap-2">
									<svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
										<circle
											class="opacity-25"
											cx="12"
											cy="12"
											r="10"
											stroke="currentColor"
											stroke-width="4"
										></circle>
										<path
											class="opacity-75"
											fill="currentColor"
											d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
										></path>
									</svg>
									제출 중...
								</div>
							{:else}
								완료
							{/if}
						</button>
					</div>
				</div>
			</div>
		</div>

		<!-- 오른쪽 패널: 저장된 이미지 표기 -->
		<div class="col-span-2 flex h-[calc(100vh-200px)] flex-col rounded-lg bg-white shadow-md">
			<!-- 헤더 -->
			<div class="border-b border-gray-200 px-6 py-4">
				<h2 class="text-lg font-semibold text-gray-900">의뢰서 저장 이미지 예시</h2>
			</div>

			<!-- 이미지 영역 -->
			<div class="flex h-full w-full items-center justify-center overflow-hidden bg-gray-200 p-1">
				{#if $requestInfo.screenshotDataUrl}
					<div class="relative h-full w-full">
						<!-- 이미지가 차지하지 않는 영역을 그레이로 표시 -->
						<div class="absolute inset-0 bg-gray-200"></div>
						<!-- 이미지 컨테이너 -->
						<div class="relative z-10 flex h-full w-full items-center justify-center">
							<img
								src={$requestInfo.screenshotDataUrl}
								alt="의뢰서 스크린샷"
								class="max-h-full max-w-full rounded-lg object-contain shadow-lg"
								style="image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges;"
							/>
						</div>
					</div>
				{:else}
					<div class="flex h-full w-full items-center justify-center bg-gray-100 p-6 text-gray-500">
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
