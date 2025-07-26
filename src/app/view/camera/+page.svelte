<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	let videoElement: HTMLVideoElement;
	let canvasElement: HTMLCanvasElement;
	let context: CanvasRenderingContext2D | null;
	let stream: MediaStream | null = null;
	let errorMessage = '';
	let screenshotDataUrl = '';
	let isCapturing = false;

	// 드래그 관련 변수
	let isDrawing = false;
	let startX: number, startY: number, currentX: number, currentY: number;
	let selectionRect = { x: 0, y: 0, width: 0, height: 0 };

	// 새롭게 추가된 변수
	let videoDevices: MediaDeviceInfo[] = []; // 사용 가능한 비디오 장치 목록
	let selectedDeviceId = ''; // 현재 선택된 비디오 장치의 ID

	onMount(async () => {
		await getConnectedDevices();
		if (videoDevices.length > 0) {
			selectedDeviceId = videoDevices[0].deviceId; // 첫 번째 장치를 기본값으로 선택
			await startWebcam(selectedDeviceId);
		} else {
			errorMessage = '사용 가능한 웹캠이 없습니다.';
		}
	});

	onDestroy(() => {
		if (stream) {
			stream.getTracks().forEach((track) => track.stop());
		}
	});

	// 연결된 미디어 장치 목록을 가져오는 함수
	async function getConnectedDevices() {
		try {
			// 권한을 먼저 요청하여 장치 레이블을 얻기 위함
			// 스트림을 시작하고 바로 중지하여 사용자에게 권한을 얻습니다.
			const tempStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
			tempStream.getTracks().forEach((track) => track.stop());

			const devices = await navigator.mediaDevices.enumerateDevices();
			videoDevices = devices.filter((device) => device.kind === 'videoinput');

			if (videoDevices.length === 0) {
				errorMessage = '사용 가능한 비디오 입력 장치가 없습니다.';
			} else {
				errorMessage = '';
			}
		} catch (err) {
			const error = err as Error;
			errorMessage = '장치 목록을 가져오는 데 실패했습니다: ' + error.message;
			console.error('enumerateDevices 에러:', err);
		}
	}

	// 웹캠 스트림을 시작하는 함수
	async function startWebcam(deviceId: string) {
		if (stream) {
			// 기존 스트림이 있으면 중지
			stream.getTracks().forEach((track) => track.stop());
		}
		try {
			const constraints = {
				video: { deviceId: deviceId ? { exact: deviceId } : undefined }
			};
			stream = await navigator.mediaDevices.getUserMedia(constraints);
			videoElement.srcObject = stream;
			videoElement.onloadedmetadata = () => {
				canvasElement.width = videoElement.videoWidth;
				canvasElement.height = videoElement.videoHeight;
				context = canvasElement.getContext('2d');
			};
			errorMessage = ''; // 성공 시 에러 메시지 초기화
		} catch (err) {
			const error = err as Error;
			errorMessage = '웹캠 스트림을 시작하는 데 실패했습니다: ' + error.message;
			console.error('getUserMedia 에러:', err);
			stream = null; // 스트림 실패 시 null로 설정
		}
	}

	// 장치 선택 변경 핸들러
	async function handleDeviceChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		selectedDeviceId = target.value;
		await startWebcam(selectedDeviceId);
	}

	function startCapture() {
		isCapturing = true;
		errorMessage = '';
		screenshotDataUrl = '';

		if (context) {
			context.clearRect(0, 0, canvasElement.width, canvasElement.height);
			context.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
		}

		selectionRect = { x: 0, y: 0, width: 0, height: 0 };
	}

	function handleMouseDown(event: MouseEvent) {
		if (!isCapturing) return;

		isDrawing = true;
		startX = event.offsetX;
		startY = event.offsetY;
	}

	function handleMouseMove(event: MouseEvent) {
		if (!isDrawing || !isCapturing || !context) return;

		currentX = event.offsetX;
		currentY = event.offsetY;

		context.clearRect(0, 0, canvasElement.width, canvasElement.height);
		context.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);

		const x = Math.min(startX, currentX);
		const y = Math.min(startY, currentY);
		const width = Math.abs(startX - currentX);
		const height = Math.abs(startY - currentY);

		selectionRect = { x, y, width, height };

		context.strokeStyle = 'red';
		context.lineWidth = 2;
		context.strokeRect(x, y, width, height);
	}

	function handleMouseUp() {
		if (!isDrawing || !isCapturing) return;
		isDrawing = false;
	}

	async function takeScreenshot() {
		if (!context || !videoElement || !isCapturing) {
			errorMessage = '스크린샷을 찍을 준비가 되지 않았습니다.';
			return;
		}

		if (selectionRect.width === 0 || selectionRect.height === 0) {
			errorMessage = '스크린샷 영역을 먼저 선택해주세요.';
			return;
		}

		const tempCanvas = document.createElement('canvas');
		tempCanvas.width = selectionRect.width;
		tempCanvas.height = selectionRect.height;
		const tempContext = tempCanvas.getContext('2d');

		if (!tempContext) {
			errorMessage = '캔버스 컨텍스트를 생성할 수 없습니다.';
			return;
		}

		tempContext.drawImage(
			videoElement,
			selectionRect.x,
			selectionRect.y,
			selectionRect.width,
			selectionRect.height,
			0,
			0,
			selectionRect.width,
			selectionRect.height
		);

		screenshotDataUrl = tempCanvas.toDataURL('image/png');

		try {
			const response = await fetch('http://localhost:3000/upload-screenshot', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ imageData: screenshotDataUrl })
			});

			if (response.ok) {
				const result = await response.json();
				console.log('스크린샷 저장 성공:', result);
				alert('스크린샷이 성공적으로 저장되었습니다: ' + result.filename);
				isCapturing = false;
			} else {
				const errorResult = await response.json();
				errorMessage = '스크린샷 저장 실패: ' + errorResult.message;
				console.error('스크린샷 저장 실패:', errorResult);
			}
		} catch (error) {
			const err = error as Error;
			errorMessage = '서버 통신 중 오류 발생: ' + err.message;
			console.error('서버 통신 오류:', error);
		}
	}

	function cancelCapture() {
		isCapturing = false;
		errorMessage = '';
		screenshotDataUrl = '';
		if (context) {
			context.clearRect(0, 0, canvasElement.width, canvasElement.height);
			context.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
		}
		selectionRect = { x: 0, y: 0, width: 0, height: 0 };
	}
</script>

<div class="flex min-h-screen flex-col items-center space-y-5 bg-gray-50 p-4">
	<h1 class="mb-4 text-3xl font-bold text-gray-800">웹캠 스크린샷 도구</h1>

	{#if errorMessage}
		<p class="font-semibold text-red-600">{errorMessage}</p>
	{/if}

	<div class="mb-4 flex items-center space-x-2">
		<label for="video-source" class="font-medium text-gray-700">웹캠 선택:</label>
		<select
			id="video-source"
			bind:value={selectedDeviceId}
			on:change={handleDeviceChange}
			class="rounded-md border border-gray-300 p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
			disabled={videoDevices.length === 0}
		>
			{#each videoDevices as device}
				<option value={device.deviceId}
					>{device.label || `카메라 ${device.deviceId.substring(0, 4)}...`}</option
				>
			{/each}
		</select>
	</div>

	<div
		class="relative h-[480px] w-[640px] overflow-hidden rounded-lg border border-gray-400 bg-gray-200 shadow-md"
	>
		<video bind:this={videoElement} autoplay playsinline class="h-full w-full object-cover"></video>
		{#if isCapturing}
			<canvas
				bind:this={canvasElement}
				on:mousedown={handleMouseDown}
				on:mousemove={handleMouseMove}
				on:mouseup={handleMouseUp}
				width={videoElement?.videoWidth || 640}
				height={videoElement?.videoHeight || 480}
				class="absolute left-0 top-0 cursor-crosshair"
			></canvas>
		{/if}
	</div>

	<div class="flex space-x-4">
		{#if !isCapturing}
			<button
				on:click={startCapture}
				disabled={!stream || videoDevices.length === 0}
				class="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white shadow-md transition duration-300 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
			>
				스크린샷 찍기 시작
			</button>
		{:else}
			<button
				on:click={takeScreenshot}
				disabled={!stream || selectionRect.width === 0 || selectionRect.height === 0}
				class="rounded-lg bg-green-600 px-6 py-3 font-semibold text-white shadow-md transition duration-300 hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
			>
				스크린샷 저장
			</button>
			<button
				on:click={cancelCapture}
				class="rounded-lg bg-red-500 px-6 py-3 font-semibold text-white shadow-md transition duration-300 hover:bg-red-600"
			>
				취소
			</button>
		{/if}
	</div>

	{#if screenshotDataUrl}
		<h2 class="mt-6 text-2xl font-semibold text-gray-700">캡처된 이미지 미리보기:</h2>
		<img
			src={screenshotDataUrl}
			alt="Captured Screenshot"
			class="h-auto max-w-full rounded-lg border border-gray-300 shadow-sm"
		/>
	{/if}
</div>
