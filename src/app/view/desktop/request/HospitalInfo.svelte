<script lang="ts">
	import { onMount, onDestroy, tick } from 'svelte';
	import { browser } from '$app/environment';
	import PageHeaderBar from '../../components/PageHeaderBar.svelte';
	import SearchableDropdown from '../../components/SearchableDropdown.svelte';
	import {
		requestStore,
		requestInfo,
		dentalClinicList,
		isLoadingDentalList
	} from '../../../service/request/RequestStore';
	import { toastStore } from '../../../service/ToastService';

	// 웹캠 관련 변수
	let videoElement = $state<HTMLVideoElement>();
	let stream = $state<MediaStream | null>(null);
	let errorMessage = $state('');
	let showVideo = $state(true); // 웹캠 비디오 표시 여부

	// 폼 데이터를 스토어와 바인딩 (InvoiceView 방식)
	let patientName = $derived($requestInfo.patientName);
	let dentalClinic = $derived($requestInfo.dentalClinic);
	let screenshotFile = $derived($requestInfo.screenshotFile);
	let requestDetails = $derived($requestInfo.requestDetails);
	let deliveryDate = $derived($requestInfo.deliveryDate);
	let screenshotDataUrl = $derived($requestInfo.screenshotDataUrl);

	// 치과 옵션 데이터 변환 (반응형)
	let dentalClinicOptions = $derived(
		$dentalClinicList.map((clinic) => ({
			id: clinic.id.toString(),
			name: `${clinic.corp_name} (${clinic.region})`,
			originalData: clinic
		}))
	);

	$effect(() => {
		console.log('RequestInfo - dentalClinicOptions:', dentalClinicOptions);
		console.log('RequestInfo - dentalClinicList length:', $dentalClinicList.length);
	});

	// 탭 상태
	let activeTab = 'basic'; // 'basic' 또는 'additional'

	// 플랫폼 감지
	const isMac =
		browser &&
		typeof navigator !== 'undefined' &&
		navigator.platform.toUpperCase().indexOf('MAC') >= 0;
	const modifierKey = isMac ? 'Cmd' : 'Ctrl';

	onMount(async () => {
		// 기본 납품 요구일 설정
		if (!$requestInfo.deliveryDate) {
			requestStore.setDeliveryDate(requestStore.getDefaultDeliveryDate());
		}

		// UUID가 없으면 자동 생성
		if (!$requestInfo.userUuid) {
			generateUUID();
		}

		// 치과 리스트 로드
		await requestStore.loadDentalClinicList('치과');

		await startWebcam();

		// 키보드 이벤트 리스너 추가
		if (browser) {
			window.addEventListener('keydown', handleKeydown);
		}
	});

	// 키보드 단축키 핸들러
	function handleKeydown(event: KeyboardEvent) {
		console.log('키보드 이벤트 감지:', {
			key: event.key,
			ctrlKey: event.ctrlKey,
			metaKey: event.metaKey,
			altKey: event.altKey,
			shiftKey: event.shiftKey
		});

		// Cmd + Shift + S (맥) 또는 Ctrl + Shift + S (윈도우/리눅스): 스크린샷 찍기
		if ((event.metaKey || event.ctrlKey) && event.altKey && event.key === 'S') {
			console.log('스크린샷 단축키 감지');
			event.preventDefault();
			if (stream && !screenshotDataUrl) {
				console.log('스크린샷 실행');
				takeScreenshot();
			} else {
				console.log('스크린샷 조건 불만족:', {
					stream: !!stream,
					screenshotDataUrl: !!screenshotDataUrl
				});
			}
		}

		// Cmd + Shift + R (맥) 또는 Ctrl + Shift + R (윈도우/리눅스): 다시 찍기
		if ((event.metaKey || event.ctrlKey) && event.altKey && event.key === 'R') {
			console.log('다시 찍기 단축키 감지');
			event.preventDefault();
			if (screenshotDataUrl && !showVideo) {
				console.log('다시 찍기 실행');
				retakePhoto();
			} else {
				console.log('다시 찍기 조건 불만족:', {
					screenshotDataUrl: !!screenshotDataUrl,
					showVideo
				});
			}
		}

		// 테스트용: F1 키로 스크린샷
		if (event.key === 'F1') {
			console.log('F1 키 감지 - 스크린샷 테스트');
			event.preventDefault();
			if (stream && !screenshotDataUrl) {
				console.log('F1 스크린샷 실행');
				takeScreenshot();
			}
		}

		// 테스트용: F2 키로 다시 찍기
		if (event.key === 'F2') {
			console.log('F2 키 감지 - 다시 찍기 테스트');
			event.preventDefault();
			if (screenshotDataUrl && !showVideo) {
				console.log('F2 다시 찍기 실행');
				retakePhoto();
			}
		}
	}

	onDestroy(() => {
		if (stream) {
			stream.getTracks().forEach((track) => track.stop());
		}

		// 키보드 이벤트 리스너 제거
		if (browser) {
			window.removeEventListener('keydown', handleKeydown);
		}
	});

	// 웹캠 스트림을 시작하는 함수
	async function startWebcam() {
		if (!browser) return;

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
			if (videoElement) {
				videoElement.srcObject = stream;

				// 비디오 로드 완료 후 해상도 확인
				videoElement.onloadedmetadata = () => {
					if (videoElement) {
						console.log('웹캠 해상도:', videoElement.videoWidth, 'x', videoElement.videoHeight);
						errorMessage = '';
					}
				};
			}
		} catch (err) {
			const error = err as Error;
			errorMessage = '웹캠을 시작할 수 없습니다: ' + error.message;
			console.error('웹캠 에러:', err);
		}
	}

	// 스크린샷 찍기
	// 다시 찍기 버튼 클릭 시 웹캠 재시작
	async function retakePhoto() {
		console.log('다시 찍기 클릭 - 현재 상태:', {
			showVideo,
			screenshotDataUrl: !!screenshotDataUrl
		});

		// 기존 스트림 정리
		if (stream) {
			stream.getTracks().forEach((track) => track.stop());
			stream = null;
		}

		// 상태 초기화
		requestStore.clearScreenshot();
		showVideo = true;
		errorMessage = '';

		// DOM 업데이트를 기다림
		await tick();

		// 웹캠 재시작
		await startWebcam();

		console.log('다시 찍기 후 상태:', { showVideo, screenshotDataUrl: !!screenshotDataUrl });
		console.log('비디오 엘리먼트:', videoElement);
		console.log('스트림:', stream);
	}

	async function takeScreenshot() {
		if (!browser || !videoElement || !stream) {
			errorMessage = '웹캠이 준비되지 않았습니다.';
			return;
		}

		try {
			// A4 비율 영역만 고화질 캔버스 생성
			const canvas = document.createElement('canvas');
			const context = canvas.getContext('2d');

			if (!context) {
				errorMessage = '캔버스 컨텍스트를 생성할 수 없습니다.';
				return;
			}

			// A4 비율 계산 (9.9:7)
			const videoWidth = videoElement.videoWidth;
			const videoHeight = videoElement.videoHeight;
			const videoAspectRatio = videoWidth / videoHeight;
			const a4AspectRatio = 9.9 / 7;

			let cropX, cropY, cropWidth, cropHeight;

			if (videoAspectRatio > a4AspectRatio) {
				// 비디오가 더 넓음 - 좌우를 잘라냄
				cropHeight = videoHeight;
				cropWidth = videoHeight * a4AspectRatio;
				cropX = (videoWidth - cropWidth) / 2;
				cropY = 0;
			} else {
				// 비디오가 더 높음 - 상하를 잘라냄
				cropWidth = videoWidth;
				cropHeight = videoWidth / a4AspectRatio;
				cropX = 0;
				cropY = (videoHeight - cropHeight) / 2;
			}

			// 90도 회전을 위해 캔버스 크기를 바꿔서 설정
			canvas.width = cropHeight;
			canvas.height = cropWidth;

			// 이미지 스무딩 비활성화로 선명도 향상
			context.imageSmoothingEnabled = false;
			context.imageSmoothingQuality = 'high';

			// 90도 회전을 위해 캔버스 중심으로 이동
			context.translate(canvas.width / 2, canvas.height / 2);
			context.rotate(Math.PI / 2); // 90도 회전 (시계방향)

			// A4 비율 영역만 캡처 (회전된 상태로 그리기)
			context.drawImage(
				videoElement,
				cropX,
				cropY,
				cropWidth,
				cropHeight, // 소스 영역
				-cropWidth / 2,
				-cropHeight / 2,
				cropWidth,
				cropHeight // 대상 영역 (중심 기준)
			);

			// 고품질 PNG로 저장 (압축률 최소화)
			const dataUrl = canvas.toDataURL('image/png', 1.0);

			// 스크린샷 파일명 업데이트 (A4 비율 + 90도 회전 포함)
			const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
			const resolution = `${canvas.width}x${canvas.height}`;
			const fileName = `screenshot-a4-rotated90-${resolution}-${timestamp}.png`;

			// 스토어에 스크린샷 데이터 저장
			requestStore.setScreenshot(dataUrl, fileName);

			// 웹캠 비디오 숨기고 캡처된 이미지 표시
			showVideo = false;
			errorMessage = '';
			console.log(`A4 비율 스크린샷이 90도 회전되어 성공적으로 찍혔습니다! (${resolution})`);
		} catch (error) {
			const err = error as Error;
			errorMessage = '스크린샷 찍기 실패: ' + err.message;
			console.error('스크린샷 에러:', error);
		}
	}

	// props로 부모 컴포넌트의 nextStep 함수를 받음
	let { nextStep } = $props<{ nextStep: () => void }>();

	// UUID 생성 함수 (백그라운드에서 자동 생성)
	function generateUUID() {
		const uuid = crypto.randomUUID();
		requestStore.setUserUuid(uuid);
	}

	// 메시지 전송 (다음 단계로 이동)
	function sendMessage() {
		// 데이터 검증
		const validation = requestStore.validateRequestInfo();
		if (!validation.isValid) {
			// 첫 번째 오류 메시지를 토스트로 표시
			toastStore.error(validation.errors[0]);
			return;
		}

		// 현재까지의 데이터 디버깅 출력
		console.log('='.repeat(60));
		console.log('📝 의뢰서 기본 정보 입력 완료');
		console.log('='.repeat(60));

		const currentData = requestStore.getRequestData();
		console.log('기본 의뢰서 데이터:', JSON.stringify(currentData, null, 2));

		console.log('='.repeat(60));

		// 성공 토스트 표시
		toastStore.success('의뢰서 정보가 성공적으로 저장되었습니다.');

		// 다음 단계로 이동
		nextStep();
	}
</script>

<main class="ml-64 mt-8 min-h-screen flex-1 bg-gray-100 p-8">
	<PageHeaderBar title="의뢰 목록" description="치과 기공물 관리 페이지 입니다."></PageHeaderBar>
	<div class="flex grid h-full grid-cols-3 gap-8">
		<!-- 왼쪽 패널: 의뢰서 등록 폼 -->
		<div class="flex flex-1 flex-col content-between justify-between rounded-lg bg-white shadow-md">
			<!-- 폼 필드들 -->
			<div class="grow basis-full space-y-4 p-6">
				<div>
					<label for="patientName" class="mb-1 block text-sm font-medium text-gray-700">
						환자 이름
					</label>
					<input
						type="text"
						id="patientName"
						bind:value={patientName}
						oninput={(e) => requestStore.setPatientName((e.target as HTMLInputElement).value)}
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
						oninput={(e) => requestStore.setDeliveryDate((e.target as HTMLInputElement).value)}
						class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-500"
					/>
				</div>

				<div>
					<label
						for="dentalClinic"
						class="mb-1 mb-auto block basis-full text-sm font-medium text-gray-700"
					>
						의뢰 치과
					</label>
					<SearchableDropdown
						options={dentalClinicOptions}
						value={$requestInfo.dentalClinicId}
						placeholder="치과를 선택하세요"
						emptyMessage="검색 결과가 없습니다"
						disabled={$isLoadingDentalList}
						loading={$isLoadingDentalList}
						enableChoseongSearch={true}
						on:change={(e) => {
							const selectedOption = dentalClinicOptions.find(
								(option: any) => option.id === e.detail.id
							);
							if (selectedOption) {
								requestStore.setDentalClinicWithId(
									selectedOption.id,
									selectedOption.originalData.corp_name
								);
							}
						}}
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
						oninput={(e) => requestStore.setRequestDetails((e.target as HTMLTextAreaElement).value)}
						rows="4"
						class="w-full resize-none rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-500"
						placeholder="의뢰 사항을 입력하세요..."
					></textarea>
				</div>
			</div>

			<!-- 전송 버튼 -->
			<div class="mt-6">
				<button
					onclick={sendMessage}
					class="w-full rounded-b-md bg-purple-600 px-6 py-4 font-medium text-white transition-colors duration-200 hover:bg-purple-700"
				>
					다음 단계
				</button>
			</div>
		</div>

		<!-- 오른쪽 패널: 웹캠 화면 -->
		<div class=" col-span-2 flex-1 rounded-lg bg-white shadow-md">
			<!-- 스크린샷 버튼 -->
			<button
				onclick={screenshotDataUrl && !showVideo ? retakePhoto : takeScreenshot}
				disabled={!stream}
				class="w-full rounded-t-md bg-purple-600 px-6 py-4 font-medium text-white transition-colors duration-200 hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
				title="키보드 단축키: {modifierKey}+Shift+S (스크린샷) / {modifierKey}+Shift+R (다시 찍기)"
			>
				{#if screenshotDataUrl && !showVideo}
					다시 찍기
					<span class="ml-2 text-xs opacity-75">({modifierKey}+Shift+R)</span>
				{:else}
					스크린샷 찍기
					<span class="ml-2 text-xs opacity-75">({modifierKey}+Shift+S)</span>
				{/if}
			</button>

			<!-- 웹캠 영역 -->
			<div
				class="relative mb-4 overflow-hidden rounded-b-lg bg-gray-200"
				style="aspect-ratio: 16/9;"
			>
				<!-- 디버그 정보 -->
				<div
					class="absolute left-2 top-2 z-50 rounded bg-black bg-opacity-50 px-2 py-1 text-xs text-white"
				>
					showVideo: {showVideo}, hasScreenshot: {!!screenshotDataUrl}
				</div>
				{#if errorMessage}
					<div class="absolute inset-0 flex items-center justify-center">
						<p class="font-medium text-red-600">{errorMessage}</p>
					</div>
				{:else if !showVideo && screenshotDataUrl}
					<!-- 캡처된 이미지 표시 -->
					<div class="relative h-full w-full">
						<img
							src={screenshotDataUrl}
							alt="캡처된 스크린샷"
							class="h-full w-full object-contain"
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
						class="h-full w-full object-contain"
						style="image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges;"
					>
						<track kind="captions" />
					</video>
				{/if}
			</div>

			<!-- 헤더 -->
			<div class="mb-4">
				<h2 class="text-lg font-semibold text-gray-900">웹캠 화면</h2>
				<p class="text-sm text-gray-600">: 웹캠 소스 명</p>
			</div>
		</div>
	</div>
</main>
