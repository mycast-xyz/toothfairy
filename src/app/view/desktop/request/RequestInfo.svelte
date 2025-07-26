<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	// 웹캠 관련 변수
	let videoElement: HTMLVideoElement;
	let stream: MediaStream | null = null;
	let errorMessage = '';
	let screenshotDataUrl = '';
	let showVideo = true; // 웹캠 비디오 표시 여부

	// 폼 데이터
	let patientName = '';
	let deliveryDate = '2025-08-03';
	let dentalClinic = 'test';
	let screenshotFile = 'test.jpg';
	let requestDetails = '';

	// 탭 상태
	let activeTab = 'basic'; // 'basic' 또는 'additional'

	onMount(async () => {
		await startWebcam();
	});

	onDestroy(() => {
		if (stream) {
			stream.getTracks().forEach((track) => track.stop());
		}
	});

	// 웹캠 스트림을 시작하는 함수
	async function startWebcam() {
		try {
			// 로지텍 C920 최적화 설정
			const constraints = {
				video: {
					width: { ideal: 1920, min: 1280 },
					height: { ideal: 1080, min: 720 },
					frameRate: { ideal: 30, min: 15 },
					aspectRatio: { ideal: 16 / 9 },
					// C920 특화 설정
					deviceId: undefined, // 기본 카메라 사용
					// 고화질 설정
					resizeMode: 'none', // 브라우저 리사이징 방지
					// 추가 품질 향상 옵션
					whiteBalanceMode: 'continuous',
					exposureMode: 'continuous',
					focusMode: 'continuous'
				},
				audio: false
			};

			stream = await navigator.mediaDevices.getUserMedia(constraints);
			videoElement.srcObject = stream;

			// 비디오 로드 완료 후 해상도 확인
			videoElement.onloadedmetadata = () => {
				console.log('웹캠 해상도:', videoElement.videoWidth, 'x', videoElement.videoHeight);
				errorMessage = '';
			};
		} catch (err) {
			const error = err as Error;
			errorMessage = '웹캠을 시작할 수 없습니다: ' + error.message;
			console.error('웹캠 에러:', err);
		}
	}

	// 스크린샷 찍기
	async function takeScreenshot() {
		if (!videoElement || !stream) {
			errorMessage = '웹캠이 준비되지 않았습니다.';
			return;
		}

		try {
			// 고화질 캔버스 생성
			const canvas = document.createElement('canvas');
			canvas.width = videoElement.videoWidth;
			canvas.height = videoElement.videoHeight;
			const context = canvas.getContext('2d');

			if (!context) {
				errorMessage = '캔버스 컨텍스트를 생성할 수 없습니다.';
				return;
			}

			// 이미지 스무딩 비활성화로 선명도 향상
			context.imageSmoothingEnabled = false;
			context.imageSmoothingQuality = 'high';

			// 고화질로 이미지 캡처
			context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

			// 고품질 PNG로 저장 (압축률 최소화)
			screenshotDataUrl = canvas.toDataURL('image/png', 1.0);

			// 스크린샷 파일명 업데이트 (해상도 포함)
			const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
			const resolution = `${canvas.width}x${canvas.height}`;
			screenshotFile = `screenshot-${resolution}-${timestamp}.png`;

			// 웹캠 비디오 숨기고 캡처된 이미지 표시
			showVideo = false;
			errorMessage = '';
			console.log(`고화질 스크린샷이 성공적으로 찍혔습니다! (${resolution})`);
		} catch (error) {
			const err = error as Error;
			errorMessage = '스크린샷 찍기 실패: ' + err.message;
			console.error('스크린샷 에러:', error);
		}
	}

	// 메시지 전송
	function sendMessage() {
		// 여기에 실제 전송 로직을 구현할 수 있습니다
		console.log('의뢰서 데이터:', {
			patientName,
			deliveryDate,
			dentalClinic,
			screenshotFile,
			requestDetails
		});
		alert('의뢰서가 성공적으로 전송되었습니다!');
	}
</script>

<main class="ml-64 mt-8 min-h-screen flex-1 bg-gray-100 p-8">
	<div class="flex h-full gap-8">
		<!-- 왼쪽 패널: 의뢰서 등록 폼 -->
		<div class="flex-1 rounded-lg bg-white p-6 shadow-md">
			<!-- 헤더 -->
			<div class="mb-6">
				<h1 class="text-2xl font-bold text-gray-900">의뢰서 등록</h1>
				<p class="text-gray-600">치과 의뢰서 등록</p>
			</div>

			<!-- 탭 -->
			<div class="mb-6 flex border-b border-gray-200">
				<button
					class="px-4 py-2 text-sm font-medium {activeTab === 'basic'
						? 'border-b-2 border-purple-600 text-purple-600'
						: 'text-gray-500 hover:text-gray-700'}"
					on:click={() => (activeTab = 'basic')}
				>
					기본
				</button>
				<button
					class="px-4 py-2 text-sm font-medium {activeTab === 'additional'
						? 'border-b-2 border-purple-600 text-purple-600'
						: 'text-gray-500 hover:text-gray-700'}"
					on:click={() => (activeTab = 'additional')}
				>
					추가
				</button>
			</div>

			<!-- 폼 필드들 -->
			<div class="space-y-4">
				<div>
					<label for="patientName" class="mb-1 block text-sm font-medium text-gray-700">
						환자 이름
					</label>
					<input
						type="text"
						id="patientName"
						bind:value={patientName}
						placeholder="환자이름"
						class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-500"
					/>
				</div>

				<div>
					<label for="deliveryDate" class="mb-1 block text-sm font-medium text-gray-700">
						납품 요구일
					</label>
					<input
						type="date"
						id="deliveryDate"
						bind:value={deliveryDate}
						class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-500"
					/>
				</div>

				<div>
					<label for="dentalClinic" class="mb-1 block text-sm font-medium text-gray-700">
						의뢰 치과
					</label>
					<input
						type="text"
						id="dentalClinic"
						bind:value={dentalClinic}
						class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-500"
					/>
				</div>

				<div>
					<label for="screenshotFile" class="mb-1 block text-sm font-medium text-gray-700">
						스크린샷 저장
					</label>
					<input
						type="text"
						id="screenshotFile"
						bind:value={screenshotFile}
						class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-500"
					/>
				</div>

				<div>
					<label for="requestDetails" class="mb-1 block text-sm font-medium text-gray-700">
						의뢰 사항
					</label>
					<textarea
						id="requestDetails"
						bind:value={requestDetails}
						rows="4"
						class="w-full resize-none rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-500"
						placeholder="의뢰 사항을 입력하세요..."
					></textarea>
				</div>
			</div>

			<!-- 전송 버튼 -->
			<div class="mt-6">
				<button
					on:click={sendMessage}
					class="w-full rounded-md bg-purple-600 px-6 py-3 font-medium text-white transition-colors duration-200 hover:bg-purple-700"
				>
					Send message
				</button>
			</div>
		</div>

		<!-- 오른쪽 패널: 웹캠 화면 -->
		<div class="flex-1 rounded-lg bg-white p-6 shadow-md">
			<!-- 헤더 -->
			<div class="mb-4">
				<h2 class="text-lg font-semibold text-gray-900">웹캠 화면</h2>
				<p class="text-sm text-gray-600">: 웹캠 소스 명</p>
			</div>

			<!-- 웹캠 영역 -->
			<div class="relative mb-4 overflow-hidden rounded-lg bg-gray-200" style="aspect-ratio: 4/3;">
				{#if errorMessage}
					<div class="absolute inset-0 flex items-center justify-center">
						<p class="font-medium text-red-600">{errorMessage}</p>
					</div>
				{:else if screenshotDataUrl && !showVideo}
					<!-- 캡처된 이미지 표시 -->
					<div class="relative h-full w-full">
						<img
							src={screenshotDataUrl}
							alt="캡처된 스크린샷"
							class="h-full w-full object-cover"
							style="image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges;"
						/>
						<div
							class="absolute right-2 top-2 rounded-full bg-green-500 px-2 py-1 text-xs text-white"
						>
							✓ 캡처됨
						</div>
					</div>
				{:else}
					<!-- 웹캠 비디오 표시 -->
					<video
						bind:this={videoElement}
						autoplay
						playsinline
						class="h-full w-full object-cover"
						style="image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges;"
					></video>
				{/if}
			</div>

			<!-- 스크린샷 버튼 -->
			<button
				on:click={takeScreenshot}
				disabled={!stream}
				class="w-full rounded-md bg-purple-600 px-6 py-3 font-medium text-white transition-colors duration-200 hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
			>
				{#if screenshotDataUrl && !showVideo}
					다시 찍기
				{:else}
					스크린샷 찍기
				{/if}
			</button>

			<!-- 스크린샷 미리보기 -->
			{#if screenshotDataUrl}
				<div class="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
					<div class="mb-3 flex items-center justify-between">
						<h3 class="text-sm font-semibold text-gray-800">캡처된 이미지</h3>
						<span class="text-xs text-gray-500">{screenshotFile}</span>
					</div>
					<div class="relative">
						<img
							src={screenshotDataUrl}
							alt="캡처된 스크린샷"
							class="w-full rounded-md border border-gray-300 shadow-sm"
						/>
						<div
							class="absolute right-2 top-2 rounded-full bg-green-500 px-2 py-1 text-xs text-white"
						>
							✓ 캡처됨
						</div>
					</div>
					<div class="mt-2 flex gap-2">
						<button
							on:click={() => {
								const link = document.createElement('a');
								link.href = screenshotDataUrl;
								link.download = screenshotFile;
								link.click();
							}}
							class="rounded bg-blue-500 px-3 py-1 text-xs text-white transition-colors hover:bg-blue-600"
						>
							다운로드
						</button>
						<button
							on:click={() => {
								screenshotDataUrl = '';
								screenshotFile = 'test.jpg';
								showVideo = true; // 웹캠 비디오 다시 표시
							}}
							class="rounded bg-red-500 px-3 py-1 text-xs text-white transition-colors hover:bg-red-600"
						>
							삭제
						</button>
					</div>
				</div>
			{/if}
		</div>
	</div>
</main>
