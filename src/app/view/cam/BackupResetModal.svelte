<script lang="ts">
	import { WindowService } from '../../service/WindowService';
	import { toastStore } from '../../service/ToastService';
	import { camPrintViewService } from '../../service/cam/CamPrintView';

	// 상태 변수
	let password = '';
	let isPasswordValid = false;
	let passwordError = '';
	let isProcessing = false;

	// 토스트 메시지 표시 함수
	const showToast = (type: 'success' | 'error' | 'info' | 'warning', message: string) => {
		toastStore[type](message);
	};

	// 비밀번호 검증
	function validatePassword() {
		if (password.length < 6) {
			passwordError = '비밀번호는 최소 6자 이상이어야 합니다.';
			isPasswordValid = false;
		} else {
			passwordError = '';
			isPasswordValid = true;
		}
	}

	// 백업 초기화 실행
	async function confirmBackupReset() {
		// 비밀번호 유효성 검사
		if (!isPasswordValid || !password) {
			showToast('error', '올바른 비밀번호를 입력해주세요.');
			return;
		}

		// 처리 중 상태 설정
		isProcessing = true;

		try {
			console.log('🔧 작업 폴더 초기화 실행 시작 (비밀번호 인증)');

			// CamPrintViewService를 통해 모니터링 폴더 초기화 실행
			const result = await camPrintViewService.initializeMonitoringFolders(password);

			if (result.success) {
				showToast('success', result.message || '작업 폴더가 성공적으로 초기화되었습니다.');
				WindowService.closeModal();
			} else {
				showToast('error', result.message || '작업 폴더 초기화에 실패했습니다.');
			}
		} catch (error) {
			console.error('❌ 작업 폴더 초기화 오류:', error);

			// 에러 메시지 분석
			const errorMessage = error instanceof Error ? error.message : String(error);

			if (errorMessage.includes('비밀번호가 올바르지 않습니다')) {
				showToast('error', '비밀번호가 올바르지 않습니다. 다시 확인해주세요.');
			} else if (errorMessage.includes('소켓이 연결되지 않았습니다')) {
				showToast('error', '서버와의 연결이 끊어졌습니다. 페이지를 새로고침해주세요.');
			} else if (errorMessage.includes('요청 시간이 초과되었습니다')) {
				showToast('error', '요청 시간이 초과되었습니다. 다시 시도해주세요.');
			} else {
				showToast('error', `작업 폴더 초기화 중 오류가 발생했습니다: ${errorMessage}`);
			}
		} finally {
			// 처리 중 상태 해제
			isProcessing = false;
		}
	}

	// 취소
	function cancelBackupReset() {
		WindowService.closeModal();
	}
</script>

<div class="space-y-4">
	<div class="text-center">
		<div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
			<i class="ri-folder-close-line text-2xl text-orange-600"></i>
		</div>
		<h3 class="mb-2 text-lg font-medium text-gray-900">작업 폴더 초기화 확인</h3>
		<p class="text-sm text-gray-500">정말로 모든 작업 폴더 데이터를 초기화하시겠습니까?</p>
		<p class="mt-2 text-xs text-orange-500">이 작업은 되돌릴 수 없습니다.</p>

		<div class="mt-4 rounded-md bg-yellow-50 p-3">
			<div class="flex">
				<div class="flex-shrink-0">
					<i class="ri-alert-line text-yellow-400"></i>
				</div>
				<div class="ml-3 text-left">
					<h3 class="text-sm font-medium text-yellow-800">주의사항</h3>
					<div class="mt-2 text-sm text-yellow-700">
						<ul class="list-disc space-y-1 pl-5">
							<li>작업 폴더 내 파일들이 전체 삭제되는 작업입니다.</li>
							<li>진행 중인 작업이 중단될 수 있습니다.</li>
							<li>작업 폴더 내 파일들이 제거됩니다.</li>
						</ul>
					</div>
				</div>
			</div>
		</div>

		<!-- 비밀번호 입력 섹션 -->
		<div class="mt-6 space-y-4">
			<div class="text-left">
				<label for="password" class="mb-2 block text-sm font-medium text-gray-700">
					<i class="ri-lock-line mr-1"></i>
					확인을 위해 사용자의 비밀번호를 입력해주세요
				</label>
				<input
					type="password"
					id="password"
					bind:value={password}
					oninput={validatePassword}
					onkeydown={(e) => {
						if (e.key === 'Enter' && isPasswordValid && password && !isProcessing) {
							confirmBackupReset();
						}
					}}
					placeholder="현재 비밀번호 입력"
					disabled={isProcessing}
					class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
					class:border-red-500={passwordError}
					class:focus:border-red-500={passwordError}
					class:focus:ring-red-500={passwordError}
					class:bg-gray-100={isProcessing}
					class:cursor-not-allowed={isProcessing}
				/>
				{#if passwordError}
					<p class="mt-1 text-xs text-red-600">
						<i class="ri-error-warning-line mr-1"></i>
						{passwordError}
					</p>
				{/if}
			</div>
		</div>
	</div>

	<div
		class="flex items-center justify-end space-x-3 rounded-b border-t border-gray-200 p-4 dark:border-gray-600 md:p-5 rtl:space-x-reverse"
	>
		<button
			class="rounded-md bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300"
			class:cursor-not-allowed={isProcessing}
			disabled={isProcessing}
			onclick={cancelBackupReset}
		>
			취소
		</button>
		<button
			class="rounded-md px-4 py-2 text-white transition-colors"
			class:bg-orange-500={isPasswordValid && password && !isProcessing}
			class:hover:bg-orange-600={isPasswordValid && password && !isProcessing}
			class:bg-gray-400={!isPasswordValid || !password || isProcessing}
			class:cursor-not-allowed={!isPasswordValid || !password || isProcessing}
			disabled={!isPasswordValid || !password || isProcessing}
			onclick={confirmBackupReset}
		>
			{#if isProcessing}
				<i class="ri-loader-4-line mr-1 animate-spin"></i>
				처리 중...
			{:else}
				초기화 실행
			{/if}
		</button>
	</div>
</div>
