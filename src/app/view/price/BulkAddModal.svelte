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

	// 폼 데이터
	let formData = $state({
		prkey: '',
		type: '',
		technicianname: '',
		price: ''
	});

	let dropzoneElement: HTMLElement;
	let uploadedFiles = $state<any[]>([]);
	let csvData = $state<any[]>([]);
	let showCsvPreview = $state(false);
	const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

	// CSV 사용법 안내 상태
	let showUsageGuide = $state(false);
	// 주의사항 상태
	let showWarning = $state(false);

	onMount(async () => {
		// 파일 입력 이벤트 리스너 설정
		const fileInput = document.createElement('input');
		fileInput.type = 'file';
		fileInput.accept = '.csv';
		fileInput.style.display = 'none';

		// 파일 선택 이벤트
		fileInput.addEventListener('change', (event) => {
			const target = event.target as HTMLInputElement;
			if (target.files && target.files.length > 0) {
				const file = target.files[0];
				console.log('파일 선택됨:', file);
				uploadedFiles = [file];
				processCsvFile(file);
			}
		});

		// Dropzone 영역 클릭 시 파일 선택 다이얼로그 열기
		dropzoneElement.addEventListener('click', () => {
			fileInput.click();
		});

		// 드래그 앤 드롭 이벤트
		dropzoneElement.addEventListener('dragover', (e) => {
			e.preventDefault();
			dropzoneElement.classList.add('border-violet-400', 'bg-violet-50');
		});

		dropzoneElement.addEventListener('dragleave', (e) => {
			e.preventDefault();
			dropzoneElement.classList.remove('border-violet-400', 'bg-violet-50');
		});

		dropzoneElement.addEventListener('drop', (e) => {
			e.preventDefault();
			dropzoneElement.classList.remove('border-violet-400', 'bg-violet-50');

			const files = e.dataTransfer?.files;
			if (files && files.length > 0) {
				const file = files[0];
				if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
					console.log('파일 드롭됨:', file);
					uploadedFiles = [file];
					processCsvFile(file);
				} else {
					showToast('error', 'CSV 파일만 업로드 가능합니다.');
				}
			}
		});
	});

	// 파일 제거
	function removeFile() {
		uploadedFiles = [];
		csvData = [];
		showCsvPreview = false;
	}

	// CSV 파일 처리
	async function processCsvFile(file: File) {
		try {
			const text = await file.text();
			console.log('원본 CSV 텍스트:', text);

			// 줄바꿈 문자 정규화 (Windows, Mac, Unix 호환)
			const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
			const lines = normalizedText.split('\n');

			console.log('분할된 라인들:', lines);

			// 빈 줄 제거
			const nonEmptyLines = lines.filter((line) => line.trim());
			console.log('빈 줄 제거 후:', nonEmptyLines);

			if (nonEmptyLines.length < 2) {
				showToast('error', 'CSV 파일에 헤더와 데이터가 필요합니다.');
				return;
			}

			// 헤더 처리
			const headerLine = nonEmptyLines[0];
			const headers = headerLine.split(',').map((h) => h.trim());
			console.log('파싱된 헤더:', headers);

			// 데이터 파싱
			const parsedData = nonEmptyLines.slice(1).map((line, lineIndex) => {
				console.log(`라인 ${lineIndex + 1} 파싱:`, line);

				// 쉼표로 분할하되, 따옴표 안의 쉼표는 무시
				const values = parseCsvLine(line);
				console.log(`라인 ${lineIndex + 1} 값들:`, values);

				const row: any = {};
				headers.forEach((header, index) => {
					row[header] = values[index] || '';
				});

				console.log(`라인 ${lineIndex + 1} 결과:`, row);
				return row;
			});

			csvData = parsedData;
			showCsvPreview = true;
			console.log('최종 파싱 결과:', parsedData);
		} catch (error) {
			console.error('CSV 파싱 오류:', error);
			showToast('error', 'CSV 파일을 읽는 중 오류가 발생했습니다.');
		}
	}

	// CSV 라인 파싱 (쉼표로 분할하되 따옴표 안의 쉼표는 무시)
	function parseCsvLine(line: string): string[] {
		const result = [];
		let current = '';
		let inQuotes = false;

		for (let i = 0; i < line.length; i++) {
			const char = line[i];

			if (char === '"') {
				inQuotes = !inQuotes;
			} else if (char === ',' && !inQuotes) {
				result.push(current.trim());
				current = '';
			} else {
				current += char;
			}
		}

		// 마지막 값 추가
		result.push(current.trim());

		// 따옴표 제거
		return result.map((value) => value.replace(/^"|"$/g, ''));
	}

	// CSV 데이터를 폼 데이터로 변환 (미사용: 미리보기 용도로만 CSV를 파싱하며 업로드는 파일로 전송)
	function applyCsvData() {
		if (csvData.length === 0) return;
		const firstRow = csvData[0];
		formData.prkey = firstRow.prkey || '';
		formData.type = firstRow.type || '';
		formData.technicianname = firstRow.technicianname || '';
		formData.price = firstRow.price || '';
	}

	// 파일 업로드 처리 (axios + multipart/form-data + JWT 인증)
	async function handleSubmit() {
		if (!uploadedFiles.length) {
			showToast('error', 'CSV 파일을 먼저 업로드해주세요.');
			return;
		}

		const file = uploadedFiles[0] as File;
		if (!(file.type === 'text/csv' || file.name.endsWith('.csv'))) {
			showToast('error', 'CSV 파일만 업로드 가능합니다.');
			return;
		}
		if (file.size > MAX_FILE_SIZE_BYTES) {
			showToast('error', '파일 크기가 5MB를 초과합니다. 더 작은 파일을 업로드해주세요.');
			return;
		}

		// JWT 토큰 확인
		const token = await getAuthToken();
		if (!token) {
			showToast('error', '인증 토큰이 없습니다. 다시 로그인해주세요.');
			return;
		}

		try {
			const form = new FormData();
			form.append('csvFile', file);

			// ConfigService에서 백엔드 URL과 업로드 엔드포인트 가져오기
			const backendUrl = getBackendUrl();
			const uploadEndpoint = getApiEndpoint('price', 'upload');
			if (!uploadEndpoint) {
				showToast('error', 'API 엔드포인트를 찾을 수 없습니다.');
				return;
			}

			// 백엔드 URL과 엔드포인트 조합
			const fullUrl = `${backendUrl}${uploadEndpoint}`;
			console.log('업로드 URL:', fullUrl);

			const response = await axios.post(fullUrl, form, {
				headers: {
					Authorization: 'Bearer ' + token,
					'Content-Type': 'multipart/form-data'
				}
			});

			if (response.status >= 200 && response.status < 300) {
				const result = response.data;
				console.log('일괄 업로드 성공:', result);

				if (result.success) {
					showToast(
						'success',
						result.message || `성공적으로 ${csvData.length}개의 가격 정보가 업로드되었습니다.`
					);
					WindowService.closeModal();
				} else {
					showToast('error', result.message || '업로드에 실패했습니다.');
				}
			} else {
				showToast('error', '업로드에 실패했습니다. 잠시 후 다시 시도해주세요.');
			}
		} catch (error: any) {
			console.error('업로드 오류:', error);
			const msg =
				error?.response?.data?.message || error?.message || '네트워크 오류가 발생했습니다.';
			showToast('error', `일괄 업로드 실패: ${msg}`);
		}
	}

	// CSV 데이터 검증
	function validateCsvData(): { isValid: boolean; errors: string[] } {
		const errors: string[] = [];

		if (csvData.length === 0) {
			errors.push('CSV 데이터가 없습니다.');
			return { isValid: false, errors };
		}

		csvData.forEach((row, index) => {
			const rowNumber = index + 2; // 헤더 다음부터 시작하므로 +2

			if (!row.prkey) {
				errors.push(`${rowNumber}행: prkey(고유번호)가 누락되었습니다.`);
			}

			if (!row.type) {
				errors.push(`${rowNumber}행: type(대분류)가 누락되었습니다.`);
			}

			if (!row.technicianname) {
				errors.push(`${rowNumber}행: technicianname(기공명칭)가 누락되었습니다.`);
			}

			const price = row.price;
			if (!price || isNaN(parseInt(price))) {
				errors.push(`${rowNumber}행: price(가격)이 유효하지 않습니다.`);
			}
		});

		return { isValid: errors.length === 0, errors };
	}

	// 일괄 추가 전 데이터 검증 및 확인
	async function handleBulkAdd() {
		const validation = validateCsvData();

		if (!validation.isValid) {
			showToast('error', `데이터 검증 실패:\n${validation.errors.join('\n')}`);
			return;
		}

		// 사용자에게 최종 확인
		const confirmed = confirm(
			`총 ${csvData.length}개의 가격 정보를 일괄 등록하시겠습니까?\n\n` +
				`이 작업은 되돌릴 수 없습니다.`
		);

		if (confirmed) {
			await handleSubmit();
		}
	}

	// 취소
	function cancelSubmit() {
		WindowService.closeModal();
	}

	// CSV 템플릿 다운로드
	function downloadCsvTemplate() {
		const template = `prkey,type,technicianname,price
1403,partialDenture,"F.D frame (ticonium)",0000
1404,cap,"캡 기본",15000
1405,partial,"파샬 기본",25000
1406,custom,"커스텀 기본",35000
1407,allonfour,"올온포 기본",45000`;

		const blob = new Blob([template], { type: 'text/csv; charset=utf-8' });
		const url = window.URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = '가격_템플릿.csv';
		a.click();
		window.URL.revokeObjectURL(url);
	}
</script>

<div class="space-y-4">
	<div>
		<!-- CSV 업로드 섹션 -->
		<div class="mb-6">
			<!-- Dropzone 영역 -->
			<div
				bind:this={dropzoneElement}
				class="min-h-[120px] cursor-pointer rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-6 text-center transition-colors hover:border-gray-400"
			>
				{#if uploadedFiles.length === 0}
					<div class="text-gray-500">
						<i class="ri-upload-cloud-line mb-2 text-2xl"></i>
						<p>CSV 파일을 여기에 드래그하거나 클릭하여 선택하세요</p>
						<p class="text-sm">지원 형식: .csv (최대 5MB)</p>
					</div>
				{:else}
					<div class="text-gray-700">
						<i class="ri-file-text-line mb-2 text-2xl text-green-600"></i>
						<p class="font-medium">{uploadedFiles[0].name}</p>
						<p class="text-sm text-gray-500">파일이 선택되었습니다</p>
						<button
							type="button"
							onclick={removeFile}
							class="mt-2 rounded bg-red-100 px-3 py-1 text-sm text-red-600 hover:bg-red-200"
						>
							파일 제거
						</button>
					</div>
				{/if}
			</div>

			<!-- CSV 미리보기 -->
			{#if showCsvPreview && csvData.length > 0}
				<div class="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
					<div class="mb-3 flex items-center justify-between">
						<h5 class="font-medium text-gray-700">CSV 데이터 미리보기</h5>
						<span class="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-800">
							{csvData.length}개 항목
						</span>
					</div>
					<div class="max-h-[200px] overflow-y-auto rounded border border-gray-200 bg-white">
						<table class="w-full text-xs">
							<thead class="sticky top-0 bg-gray-100">
								<tr>
									{#each Object.keys(csvData[0] || {}) as header}
										<th
											class="border-b border-gray-200 px-3 py-2 text-left font-medium text-gray-700"
										>
											{header}
										</th>
									{/each}
								</tr>
							</thead>
							<tbody>
								{#each csvData as row, index}
									<tr class="border-b border-gray-100 hover:bg-gray-50">
										{#each Object.values(row) as value}
											<td class="border-r border-gray-100 px-3 py-2 text-gray-800">
												{value || '-'}
											</td>
										{/each}
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
					<div class="mt-2 text-center text-xs text-gray-500">
						💡 총 {csvData.length}개 행이 있습니다. 스크롤하여 모든 데이터를 확인하세요.
					</div>
				</div>
			{/if}
		</div>

		<!-- CSV 사용법 안내 (접을 수 있는 아코디언) -->
		<div class="mb-6 rounded-lg border border-gray-200 bg-gray-50">
			<button
				type="button"
				class="flex w-full items-center justify-between p-4 text-left hover:bg-gray-100"
				onclick={() => (showUsageGuide = !showUsageGuide)}
			>
				<h4 class="font-medium text-gray-800">📋 CSV 파일 사용법</h4>
				<i
					class="ri-arrow-down-s-line text-xl text-gray-600 transition-transform duration-200"
					class:rotate-180={showUsageGuide}
				></i>
			</button>

			{#if showUsageGuide}
				<div class="border-t border-gray-200 p-4">
					<div class="space-y-3 text-sm text-gray-700">
						<div>
							<p class="mb-2 font-medium">필수 칼럼 (4개):</p>
							<div class="ml-4 space-y-1">
								<p><strong>prkey:</strong> 고유번호 (예: 1403, 1404, 1405...)</p>
								<p>
									<strong>type:</strong> 대분류 (예: partialDenture, cap, partial, custom, allonfour)
								</p>
								<p>
									<strong>technicianname:</strong> 기공명칭 (예: F.D frame (ticonium), 캡 기본, 파샬
									기본...)
								</p>
								<p><strong>price:</strong> 가격 (예: 0000, 15000, 25000...)</p>
							</div>
						</div>

						<hr class="border-gray-300" />

						<div>
							<p class="mb-2 font-medium">사용 방법:</p>
							<div class="ml-4 space-y-1">
								<p>1. 하단의 "CSV 예시 템플릿 다운로드" 버튼을 클릭하여 템플릿 파일을 받습니다.</p>
								<p>2. 템플릿 파일을 열어서 가격과 정보를 입력합니다.</p>
								<p>3. 저장한 CSV 파일을 위 영역에 드래그하거나 클릭하여 업로드합니다.</p>
								<p>4. 데이터 미리보기에서 내용을 확인한 후 "일괄 추가" 버튼을 클릭합니다.</p>
							</div>
						</div>
					</div>
				</div>
			{/if}
		</div>

		<!-- 주의사항 (접을 수 있는 아코디언) -->
		<div class="mb-6 rounded-lg border border-red-200 bg-red-50">
			<button
				type="button"
				class="flex w-full items-center justify-between p-4 text-left hover:bg-red-100"
			>
				<h4 class="font-medium text-red-800">⚠️ 주의사항</h4>
			</button>
			<div class="border-t border-red-200 p-4">
				<div class="space-y-3 text-sm text-red-700">
					<div>
						<p class="mb-2 font-medium">
							1. 해당 기능은 사용자의 초기 설정을 편리하게 하기 위한 기능이며, 초기 설정 이외에
							쓰이는 것을 상정하여 처리 하지 않았습니다.
						</p>
						<p class="mb-2 font-medium">
							2. 초기화 형태로 다시 만들어서 넣는 경우 기존 거래처를 전부 백업을 하신 뒤에 하시길
							바라며,<br /> 월간 모니터링 기능은 이전 가격과 다르게 책정된 정보에 대해 오류가 나오는
							것은 인지하고 해당 기능을 쓰시길 바랍니다.
						</p>
					</div>
				</div>
			</div>
		</div>
	</div>

	<div
		class="flex items-center justify-between space-x-3 rounded-b border-t border-gray-200 p-4 dark:border-gray-600 md:p-5 rtl:space-x-reverse"
	>
		<!-- 템플릿 다운로드 버튼 -->
		<button
			type="button"
			onclick={downloadCsvTemplate}
			class="rounded-md border border-violet-300 bg-violet-100 px-4 py-2 text-sm font-medium text-violet-700 hover:bg-violet-200"
		>
			<i class="ri-download-line mr-2"></i>
			CSV 예시 템플릿 다운로드
		</button>

		<!-- 액션 버튼들 -->
		<div class="flex space-x-3">
			<button
				class="rounded-md bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300"
				onclick={cancelSubmit}
			>
				취소
			</button>
			<button
				class="rounded-md bg-violet-500 px-4 py-2 text-white hover:bg-violet-600"
				onclick={handleBulkAdd}
			>
				일괄 추가
			</button>
		</div>
	</div>
</div>

<style>
	/* Dropzone 스타일 오버라이드 */
	:global(.dz-preview) {
		margin: 0;
	}

	:global(.dz-message) {
		margin: 0;
	}
</style>
