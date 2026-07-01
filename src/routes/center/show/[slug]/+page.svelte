<script lang="ts">
	// 필요한 모듈 import
	import { writable } from 'svelte/store';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { toastStore } from '../../../../app/service/ToastService';
	import { configService } from '../../../../app/service/ConfigService';
	import MultiSTLViewer from '../../../../app/view/stlviewer/PrintOutPutViewer.svelte';
	import Toast from '../../../../app/view/toast/Toast.svelte';

	// 토스트 메시지 표시 함수
	const showToast = (type: 'success' | 'error' | 'info' | 'warning', message: string) => {
		toastStore[type](message);
	};

	// 쿠키 관련 유틸리티 함수들
	function getCookie(name: string): string | null {
		if (typeof document === 'undefined') return null;
		const nameEQ = name + '=';
		const ca = document.cookie.split(';');
		for (let i = 0; i < ca.length; i++) {
			let c = ca[i];
			while (c.charAt(0) === ' ') c = c.substring(1, c.length);
			if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
		}
		return null;
	}

	// 뒤로가기 함수
	const goBack = async () => {
		debugLog('뒤로가기 버튼 클릭');
		try {
			// 쿠키에서 저장된 검색 조건들을 가져오기
			const savedDate = getCookie('selectedDate');
			const savedCorpName = getCookie('selectedCorpName');
			const savedTabType = getCookie('selectedTabType');
			const savedCompletionFilter = getCookie('completionFilter');

			debugLog('쿠키에서 가져온 검색 조건들', {
				savedDate,
				savedCorpName,
				savedTabType,
				savedCompletionFilter
			});

			// URL 파라미터 구성
			const params = new URLSearchParams();

			// 쿠키에서 가져온 값들을 URL 파라미터로 설정
			if (savedDate) {
				params.append('date', savedDate);
			}
			if (savedCorpName) {
				params.append('corpName', savedCorpName);
			}
			if (savedTabType) {
				params.append('type', savedTabType);
			}
			if (savedCompletionFilter) {
				params.append('completionFilter', savedCompletionFilter);
			}

			// center/print 페이지로 이동하면서 쿠키에서 가져온 검색 조건들 적용
			const targetUrl = `/center/print${params.toString() ? '?' + params.toString() : ''}`;

			debugLog('쿠키 기반 뒤로가기 URL', { targetUrl, params: params.toString() });

			// SvelteKit의 goto를 사용하여 페이지 이동
			await goto(targetUrl, { replaceState: true });
		} catch (error) {
			debugLog('뒤로가기 중 오류 발생', error);
			// 오류 발생 시 기본 center/print 페이지로 이동
			window.location.href = '/center/print';
		}
	};

	// props에서 데이터 가져오기
	const { data } = $props<{ data: any }>();

	// 디버깅을 위한 로그 함수
	const debugLog = (message: string, data?: any) => {
		console.log(`[STL Debug] ${message}`, data);
	};

	// 데이터 유효성 검사
	const validateData = () => {
		debugLog('데이터 유효성 검사 시작', {
			hasData: !!data,
			hasInfo: !!data?.info,
			hasDirectory: !!data?.info?.directory,
			hasFiles: !!data?.info?.directory?.files,
			fileCount: data?.info?.directory?.files?.length || 0,
			hasEndpoints: !!data?.endpoints,
			hasUrl: !!data?.url
		});

		if (!data) {
			debugLog('데이터가 없습니다');
			return false;
		}

		if (!data.info) {
			debugLog('info 데이터가 없습니다');
			return false;
		}

		if (!data.info.directory) {
			debugLog('directory 데이터가 없습니다');
			return false;
		}

		if (!data.info.directory.files || data.info.directory.files.length === 0) {
			debugLog('파일 목록이 없습니다');
			return false;
		}

		if (!data.endpoints) {
			debugLog('endpoints가 없습니다');
			return false;
		}

		if (!data.url) {
			debugLog('backend URL이 없습니다');
			return false;
		}

		debugLog('데이터 유효성 검사 통과');
		return true;
	};

	// 출력물 종류에 따른 한글 이름 매핑
	const infoNameMap: Record<string, string> = {
		cap: '캡',
		partial: '파샬',
		custom: '커스텀',
		allonfour: '올온포'
	};

	// 출력물 종류 한글 이름 반환
	const getInfoName = (info: string) => infoNameMap[info] || '';

	// STL 파일 관련 데이터 반응형으로 초기화
	let stlFiles = $state<string[]>([]);
	let stlData = $state<Array<{ url: string; name: string }>>([]);

	// 현재 활성화된 뷰 타입 (노멀 또는 리메이크)
	let activeViewType = $state<'normal' | 'remake' | null>(null);

	// 데이터 초기화 함수
	function initializeSTLData() {
		debugLog('initializeSTLData 시작', { data: data.info });

		// 데이터 유효성 검사
		if (!validateData()) {
			debugLog('데이터 유효성 검사 실패로 STL 초기화 중단');
			return;
		}

		if (data.info?.directory?.files) {
			debugLog('파일 목록 발견', data.info.directory.files);

			stlFiles = data.info.directory.files.map((file: string, index: number) => {
				const url = `${data.url}${data.endpoints.fileShow}?filename=${data.info.id}@${index}`;
				debugLog(`STL 파일 URL 생성 [${index}]:`, { file, url });
				return url;
			});

			stlData = data.info.directory.files.map((file: string, index: number) => ({
				url: stlFiles[index],
				name: file
			}));

			debugLog('STL 데이터 초기화 완료', { stlFiles, stlData });
		} else {
			debugLog('파일 목록이 없습니다', data.info);
		}
	}

	// 리메이크 파일 정보 처리를 위한 인터페이스
	interface RemakeFile {
		name: string;
		url: string;
	}

	// 리메이크 파일 상태 반응형으로 저장
	let fileInfo = $state({
		ok: [] as RemakeFile[],
		re: [] as RemakeFile[]
	});

	let normalUnitNum = $state(data.info?.normalUnitNum ?? 0);
	let remakeUnitNum = $state(data.info?.remakeUnitNum ?? 0);

	// 저장(수정) 처리 중 중복 클릭 방지 플래그
	let savingType = $state<'normal' | 'remake' | null>(null);

	// 상단 "유닛 갯수" 박스에 표시할 실제 유닛 합계 (정상 + 리메이크)
	let totalUnitNum = $derived((Number(normalUnitNum) || 0) + (Number(remakeUnitNum) || 0));

	// 유닛 입력값 검증: 빈값/비정수/음수 거부
	const validateUnitValue = (value: unknown): number | null => {
		if (value === '' || value === null || value === undefined) return null;
		const num = Number(value);
		if (!Number.isInteger(num) || num < 0) return null;
		return num;
	};

	// 리메이크 파일 매칭 처리 함수
	function initializeRemakeFiles() {
		debugLog('initializeRemakeFiles 시작', {
			remakeFiles: data.info?.directory?.remakeFiles,
			stlFilesLength: stlFiles.length,
			allFiles: data.info?.directory?.files
		});

		if (data.info?.directory?.remakeFiles && stlFiles.length > 0) {
			// 파일명으로 직접 매칭하는 함수
			const matchFilesByName = (remakeFiles: string[]) => {
				debugLog('파일명으로 직접 매칭 시작', {
					remakeFiles,
					totalFiles: data.info.directory.files,
					stlFiles
				});

				return remakeFiles
					.map((remakeFileName: string) => {
						debugLog(`파일명 매칭 시도:`, {
							remakeFileName,
							remakeFileNameType: typeof remakeFileName,
							remakeFileNameLength: remakeFileName?.length
						});

						// files 배열에서 정확한 파일명으로 인덱스 찾기
						const fileIndex = data.info.directory.files.findIndex(
							(fileName: string) => fileName === remakeFileName
						);

						debugLog(`파일명 매칭 결과:`, {
							remakeFileName,
							fileIndex,
							found: fileIndex >= 0,
							matchedFileName: fileIndex >= 0 ? data.info.directory.files[fileIndex] : null
						});

						if (fileIndex === -1) {
							debugLog(`파일명을 찾을 수 없음:`, {
								remakeFileName,
								availableFiles: data.info.directory.files
							});
							return null;
						}

						const matchedFile = {
							name: data.info.directory.files[fileIndex],
							url: stlFiles[fileIndex]
						};

						debugLog(`파일 매칭 성공:`, {
							remakeFileName,
							fileIndex,
							matchedFile,
							url: stlFiles[fileIndex]
						});

						return matchedFile;
					})
					.filter((item: RemakeFile | null): item is RemakeFile => item !== null);
			};

			// OK/RE 파일 매칭 실행
			if (data.info.directory.remakeFiles.ok) {
				debugLog('OK 파일 매칭 시작', { okFiles: data.info.directory.remakeFiles.ok });
				fileInfo.ok = matchFilesByName(data.info.directory.remakeFiles.ok);
				debugLog('OK 파일 매칭 완료', {
					original: data.info.directory.remakeFiles.ok,
					result: fileInfo.ok
				});
			}
			if (data.info.directory.remakeFiles.re) {
				debugLog('RE 파일 매칭 시작', { reFiles: data.info.directory.remakeFiles.re });
				fileInfo.re = matchFilesByName(data.info.directory.remakeFiles.re);
				debugLog('RE 파일 매칭 완료', {
					original: data.info.directory.remakeFiles.re,
					result: fileInfo.re
				});
			}
		} else {
			debugLog('리메이크 파일 초기화 조건 불충족', {
				hasRemakeFiles: !!data.info?.directory?.remakeFiles,
				stlFilesLength: stlFiles.length,
				remakeFilesData: data.info?.directory?.remakeFiles
			});

			// 리메이크 파일이 없어도 기본 파일들은 사용 가능
			if (stlFiles.length > 0) {
				debugLog('리메이크 파일이 없지만 기본 STL 파일들을 노멀 파일로 설정');

				// 기본 STL 파일들을 노멀 파일(fileInfo.ok)로 설정
				fileInfo.ok = stlData.map((file) => ({
					name: file.name,
					url: file.url
				}));

				// 리메이크 파일은 빈 배열로 유지
				fileInfo.re = [];

				debugLog('노멀 파일 설정 완료', {
					normalFiles: fileInfo.ok,
					remakeFiles: fileInfo.re
				});
			}
		}
	}

	// 뷰어 크기 관련 설정
	const scale = 0.1; // mm 단위 스케일
	let boxWidth = writable<number>(0);
	let boxHeight = writable<number>(0);

	// 뷰어 크기 업데이트 함수
	function updateDimensions() {
		const viewerBox = document.getElementById('viewerBox');
		if (viewerBox) {
			const width = viewerBox.clientWidth - 25;
			const height = viewerBox.clientHeight - 50;
			boxWidth.set(width);
			boxHeight.set(height);
			debugLog('뷰어 크기 업데이트', { width, height });
		}
	}

	// 컴포넌트 마운트 시 초기화
	onMount(() => {
		debugLog('컴포넌트 마운트 시작');

		// 데이터 상태 확인
		debugLog('마운트 시 데이터 상태:', {
			data: data,
			info: data?.info,
			directory: data?.info?.directory,
			files: data?.info?.directory?.files,
			endpoints: data?.endpoints,
			url: data?.url
		});

		// 데이터 초기화 순서가 중요함
		initializeSTLData();

		// setTimeout을 사용하여 비동기 초기화 순서 보장
		setTimeout(() => {
			debugLog('비동기 초기화 시작');
			initializeRemakeFiles();

			// stlFiles가 준비된 후 선택 파일 초기화
			if (stlFiles.length > 0) {
				initializeSelectedFiles();
			} else {
				debugLog('stlFiles가 아직 준비되지 않음, 추가 대기');
				// 추가 대기 후 재시도
				setTimeout(() => {
					if (stlFiles.length > 0) {
						debugLog('지연된 선택 파일 초기화');
						initializeSelectedFiles();
					}
				}, 200);
			}
		}, 100);

		// 뷰어 크기 초기화
		updateDimensions();
		window.addEventListener('resize', updateDimensions);

		debugLog('onMount 완료');

		return () => window.removeEventListener('resize', updateDimensions);
	});

	// 선택된 파일 관리 - 노멀과 리메이크를 분리
	let selectedNormalFiles = writable<string[]>([]);
	let selectedRemakeFiles = writable<string[]>([]);

	// 현재 뷰어에 표시할 파일 (단일 파일)
	let currentViewFile = writable<string>('');

	// 선택된 파일 초기화 함수
	function initializeSelectedFiles() {
		debugLog('선택된 파일 초기화 시작', {
			normalFiles: fileInfo.ok,
			remakeFiles: fileInfo.re,
			stlFiles: stlFiles,
			hasRemakeFiles: data.info?.directory?.remakeFiles
		});

		// 노멀 파일(정상 파일)을 우선적으로 선택
		if (fileInfo.ok.length > 0) {
			const normalFiles = fileInfo.ok.map((file) => file.url);
			selectedNormalFiles.set(normalFiles);
			// 첫 번째 노멀 파일을 현재 뷰어 파일로 설정
			currentViewFile.set(normalFiles[0]);
			debugLog('노멀 파일을 초기 선택으로 설정', normalFiles);
		} else if (stlFiles.length > 0) {
			// 노멀 파일이 없으면 기본 STL 파일들을 선택
			selectedNormalFiles.set(stlFiles);
			// 첫 번째 STL 파일을 현재 뷰어 파일로 설정
			currentViewFile.set(stlFiles[0]);
			debugLog('기본 STL 파일들을 초기 선택으로 설정', stlFiles);
		} else {
			debugLog('선택할 노멀 파일이 없습니다');
		}

		// 리메이크 파일은 빈 배열로 초기화
		selectedRemakeFiles.set([]);
		debugLog('리메이크 파일 초기화 완료', []);
	}

	// 파일 선택 이벤트 핸들러 - 노멀과 리메이크 분리
	const handleNormalCheckboxChange = (file: string, checked: boolean) => {
		debugLog('노멀 파일 체크박스 변경', { file, checked });
		selectedNormalFiles.update((files) =>
			checked ? [...files, file] : files.filter((f) => f !== file)
		);

		// 노멀 파일이 선택되면 노멀 뷰 활성화
		if (checked) {
			activeViewType = 'normal';
			// 리메이크 파일 선택 해제
			selectedRemakeFiles.set([]);
		}
	};

	const handleRemakeCheckboxChange = (file: string, checked: boolean) => {
		debugLog('리메이크 파일 체크박스 변경', { file, checked });
		selectedRemakeFiles.update((files) =>
			checked ? [...files, file] : files.filter((f) => f !== file)
		);

		// 리메이크 파일이 선택되면 리메이크 뷰 활성화
		if (checked) {
			activeViewType = 'remake';
			// 노멀 파일 선택 해제
			selectedNormalFiles.set([]);
		}
	};

	const handleNormalFileSelect = (files: Array<{ url: string }>) => {
		debugLog('전체 노멀 파일 선택', { files });
		const fileUrls = files.map((f) => f.url);
		selectedNormalFiles.set(fileUrls);
		// 노멀 뷰 활성화
		activeViewType = 'normal';
		// 리메이크 파일 선택 해제
		selectedRemakeFiles.set([]);
	};

	const handleRemakeFileSelect = (files: Array<{ url: string }>) => {
		debugLog('전체 리메이크 파일 선택', { files });
		const fileUrls = files.map((f) => f.url);
		selectedRemakeFiles.set(fileUrls);
		// 리메이크 뷰 활성화
		activeViewType = 'remake';
		// 노멀 파일 선택 해제
		selectedNormalFiles.set([]);
	};

	// 파일 클릭 시 뷰어에 표시
	const handleFileClick = (fileUrl: string) => {
		debugLog('파일 클릭', { fileUrl });
		currentViewFile.set(fileUrl);
	};

	// API 응답 처리 함수
	const handleApiResponse = async (response: any) => {
		debugLog('API 응답 처리 시작', { response, backendUrl: data.url });

		const backendUrl = data.url;

		// 중복 클릭(저장 처리 중) 방지
		if (savingType) {
			debugLog('저장 처리 중이므로 중복 요청 무시', { savingType });
			return;
		}

		if (response === 'normal') {
			const validated = validateUnitValue(normalUnitNum);
			if (validated === null) {
				showToast('error', '정상 유닛 수는 0 이상의 정수로 입력해주세요.');
				return;
			}
			normalUnitNum = validated;

			savingType = 'normal';
			try {
				const apiUrl = `${backendUrl}${data.endpoints.dataCreateOk}`;
				debugLog('정상 유닛 API 호출', { apiUrl, normalUnitNum, centerIdx: data.info.id });

				const response = await fetch(apiUrl, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						okData: normalUnitNum,
						centerIdx: data.info.id
					})
				});

				if (!response.ok) {
					const responseData = await response.json();
					debugLog('API 오류 응답', responseData);
					showToast('error', responseData.resultMsg || '처리 중 오류가 발생했습니다.');
				} else {
					debugLog('정상 유닛 처리 성공');
					showToast('success', '처리가 완료되었습니다.');
				}
			} catch (error) {
				debugLog('API 호출 중 오류', error);
				console.error('서버 연결 중 오류가 발생했습니다.', error);
				showToast('error', '처리 중 오류가 발생했습니다.');
			} finally {
				savingType = null;
			}
		} else if (response === 'remake') {
			const validated = validateUnitValue(remakeUnitNum);
			if (validated === null) {
				showToast('error', '리메이크 유닛 수는 0 이상의 정수로 입력해주세요.');
				return;
			}
			remakeUnitNum = validated;

			savingType = 'remake';
			try {
				const apiUrl = `${backendUrl}${data.endpoints.dataCreateRe}`;
				debugLog('리메이크 유닛 API 호출', { apiUrl, remakeUnitNum, centerIdx: data.info.id });

				const response = await fetch(apiUrl, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						reData: remakeUnitNum,
						centerIdx: data.info.id
					})
				});

				if (!response.ok) {
					const responseData = await response.json();
					debugLog('API 오류 응답', responseData);
					showToast('error', responseData.resultMsg || '처리 중 오류가 발생했습니다.');
				} else {
					debugLog('리메이크 유닛 처리 성공');
					showToast('success', '처리가 완료되었습니다.');
				}
			} catch (error) {
				debugLog('API 호출 중 오류', error);
				console.error('서버 연결 중 오류가 발생했습니다.', error);
				showToast('error', '처리 중 오류가 발생했습니다.');
			} finally {
				savingType = null;
			}
		}
	};

	// 선택된 파일 변경 감지 - 노멀과 리메이크 분리
	$effect(() => {
		debugLog('선택된 노멀 파일 변경됨', $selectedNormalFiles);
	});

	$effect(() => {
		debugLog('선택된 리메이크 파일 변경됨', $selectedRemakeFiles);
	});

	// 데이터 상태 실시간 모니터링
	$effect(() => {
		debugLog('데이터 상태 변경 감지', {
			stlFilesLength: stlFiles.length,
			stlDataLength: stlData.length,
			fileInfoOkLength: fileInfo.ok.length,
			fileInfoReLength: fileInfo.re.length,
			selectedNormalFilesLength: $selectedNormalFiles.length,
			selectedRemakeFilesLength: $selectedRemakeFiles.length,
			boxWidth: $boxWidth,
			boxHeight: $boxHeight
		});
	});

	// STL 뷰어에 전달될 최종 데이터 확인 - 노멀과 리메이크 분리
	$effect(() => {
		debugLog('STL 뷰어 데이터 상태', {
			selectedNormalFiles: $selectedNormalFiles,
			selectedRemakeFiles: $selectedRemakeFiles,
			scale: scale,
			width: $boxWidth,
			height: $boxHeight,
			willRenderNormal: $boxWidth > 0 && $selectedNormalFiles.length > 0,
			willRenderRemake: $boxWidth > 0 && $selectedRemakeFiles.length > 0
		});
	});
</script>

<Toast />

{#if data.loadError}
	<main class="ml-64 flex h-svh flex-1 items-center justify-center bg-gray-100 p-8 pt-20">
		<div class="flex flex-col items-center rounded-sm border border-gray-200 bg-white p-10 shadow-lg">
			<i class="ri-error-warning-line mb-4 text-6xl text-gray-400"></i>
			<h3 class="mb-2 text-2xl font-bold text-gray-800">출력물을 불러오지 못했습니다</h3>
			<p class="mb-6 text-gray-500">잘못된 주소이거나 일시적인 오류일 수 있습니다.</p>
			<div class="flex flex-row gap-3">
				<button
					class="rounded-lg border border-gray-300 px-5 py-2 text-gray-700 hover:bg-gray-100"
					onclick={goBack}
				>
					뒤로가기
				</button>
				<button
					class="rounded-lg bg-violet-500 px-5 py-2 text-white hover:bg-violet-600"
					onclick={() => location.reload()}
				>
					재시도
				</button>
			</div>
		</div>
	</main>
{:else}
<main class="ml-64 h-svh flex-1 bg-gray-100 p-8 pt-20">
	<article class=" flex h-full w-full flex-col lg:flex-row">
		<div class="mr-4 w-full rounded-sm border border-gray-200 bg-white text-lg shadow-lg lg:w-1/3">
			<div class="print-list inline-block w-full border-r border-gray-200">
				<div
					class="box-title m-0 mb-2 flex flex-row items-center border-b border-gray-200 py-3 pl-2.5"
				>
					<button
						class="mr-2 rounded-full p-2 text-gray-400 hover:text-gray-800"
						onclick={goBack}
						aria-label="뒤로가기"
					>
						<i class="ri-arrow-left-line"></i>
					</button>
					<h3 class="my-auto text-xl font-bold text-violet-500">출력물 관리 정보</h3>
				</div>
				<div class="patient-name inline-block w-full tracking-tight">
					<h3 class="pl-2 text-4xl font-bold text-gray-900">{data.info.corpName || '-'} 치과 기공소</h3>
				</div>
				<div class="patient-content w-full">
					<div class="privacy mt-3 flex flex-row border-b border-gray-400 pb-3 pl-2">
						<div class="birth-date w-1/2">
							<p class=" text-gray-600">일시 : {data.info.printDate}</p>
						</div>
						<div class="gender w-1/2">
							<p class=" text-gray-600">
								파일 : {(data.info.normalFileNum || 0) + (data.info.remakeFileNum || 0)}개
							</p>
						</div>
					</div>
					<div class="date mt-3 flex flex-row border-b border-gray-400 pb-3 pl-2">
						<div class="ml-auto mr-5 inline-block h-20 w-1/2 p-3 pl-0 tracking-tight text-gray-500">
							<p class=" text-sm">종류</p>
							<h3 class="text-4xl font-bold">{getInfoName(data.info.info)}</h3>
						</div>
						<div
							class="ml-auto mr-5 inline-block h-20 w-1/2 bg-violet-500 p-3 tracking-tight text-white"
						>
							<p class=" text-sm">유닛 갯수</p>
							<h3 class="text-4xl font-bold">{totalUnitNum}</h3>
						</div>
					</div>
					<div
						class="date flex h-auto flex-row border-b border-gray-400 bg-gray-100 pl-2 text-gray-500"
					>
						<div
							class="ml-auto inline-block flex h-20 w-4/5 w-full flex-row bg-gray-100 p-2 pl-0 tracking-tight text-gray-500"
						>
							<p
								class="h-18 flex w-1/4 items-center justify-center border-r border-gray-400 text-center text-lg"
							>
								정상 유닛
							</p>
							<input
								type="number"
								inputmode="numeric"
								min="0"
								step="1"
								bind:value={normalUnitNum}
								class="h-18 mx-2 my-auto w-3/4 rounded-md border border-gray-300 bg-white px-3 text-2xl font-bold text-gray-800 focus:border-violet-500 focus:outline-none"
								placeholder="0"
							/>
						</div>

						<button
							onclick={() => {
								handleApiResponse('normal');
							}}
							disabled={savingType === 'normal'}
							class="h-18 ml-auto inline-block w-1/5 bg-violet-500 p-3 tracking-tight text-white disabled:cursor-not-allowed disabled:opacity-60"
						>
							<h3 class="text-2xl font-bold">{savingType === 'normal' ? '저장중' : '수정'}</h3>
						</button>
					</div>
					<div
						class="date flex h-auto flex-row border-b border-gray-400 bg-gray-100 pl-2 text-gray-500"
					>
						<div
							class="ml-auto inline-block flex h-20 w-4/5 w-full flex-row bg-gray-100 p-2 pl-0 tracking-tight text-gray-500"
						>
							<p
								class="h-18 flex w-1/4 items-center justify-center border-r border-gray-400 text-center text-lg"
							>
								리메이크 유닛
							</p>
							<input
								type="number"
								inputmode="numeric"
								min="0"
								step="1"
								bind:value={remakeUnitNum}
								class="h-18 mx-2 my-auto w-3/4 rounded-md border border-gray-300 bg-white px-3 text-2xl font-bold text-gray-800 focus:border-violet-500 focus:outline-none"
								placeholder="0"
							/>
						</div>

						<button
							onclick={() => {
								handleApiResponse('remake');
							}}
							disabled={savingType === 'remake'}
							class="h-18 ml-auto inline-block w-1/5 bg-violet-500 p-3 tracking-tight text-white disabled:cursor-not-allowed disabled:opacity-60"
						>
							<h3 class="text-2xl font-bold">{savingType === 'remake' ? '저장중' : '수정'}</h3>
						</button>
					</div>
				</div>
				<div class="accordion">
					<details
						ontoggle={(e) => {
							if ((e.target as HTMLDetailsElement).open) {
								// 현재 details 요소를 제외한 모든 details 요소를 닫음
								document.querySelectorAll('.accordion details').forEach((detail) => {
									if (detail !== e.target) {
										(detail as HTMLDetailsElement).open = false;
									}
								});
							}
						}}
					>
						<summary
							class="box-title flex h-14 cursor-pointer flex-row items-center border-b border-gray-400 p-2.5"
						>
							<h3 class="my-auto text-xl font-bold text-violet-500">
								노멀 파일 정보 | {fileInfo.ok.length}개
							</h3>
							<div class="ml-auto flex items-center space-x-2">
								<span class="border-l border-gray-200 pl-2 text-sm text-gray-500">
									선택됨: {$selectedNormalFiles.length}개
								</span>
								<button
									class="border-l border-gray-200 pl-2 text-sm text-gray-500"
									onclick={() => handleNormalFileSelect(fileInfo.ok)}
								>
									전체 노멀 파일 선택
								</button>
							</div>
						</summary>
						<div class="patient-content max-h-[calc(100vh-660px)] w-full overflow-y-auto">
							{#each fileInfo.ok as file}
								<div
									class="flex w-full cursor-pointer items-center border-b border-gray-200 p-2 pl-2.5 hover:bg-gray-50"
									onclick={() => handleFileClick(file.url)}
								>
									<input
										type="checkbox"
										class="mr-2 h-4 w-4 rounded border-gray-300 text-violet-500"
										value={file.url}
										onchange={(e) => {
											e.stopPropagation();
											const target = e.target as HTMLInputElement;
											handleNormalCheckboxChange(file.url, target.checked);
										}}
										checked={$selectedNormalFiles.includes(file.url)}
									/>
									<p class="pb-1 text-lg font-normal text-gray-700">{file.name}</p>
								</div>
							{/each}
						</div>
					</details>
					<details
						ontoggle={(e) => {
							if ((e.target as HTMLDetailsElement).open) {
								// 현재 details 요소를 제외한 모든 details 요소를 닫음
								document.querySelectorAll('.accordion details').forEach((detail) => {
									if (detail !== e.target) {
										(detail as HTMLDetailsElement).open = false;
									}
								});
							}
						}}
					>
						<summary
							class="box-title flex h-14 cursor-pointer flex-row items-center border-b border-gray-400 pl-2.5"
						>
							<h3 class="my-auto text-xl font-bold text-orange-500">
								리메이크 파일 정보 | {fileInfo.re.length}개
							</h3>
							<div class="ml-auto flex items-center space-x-2">
								<span class="border-l border-gray-200 pl-2 text-sm text-gray-500">
									선택됨: {$selectedRemakeFiles.length}개
								</span>
								<button
									class="border-l border-gray-200 pl-2 text-sm text-gray-500"
									onclick={() => handleRemakeFileSelect(fileInfo.re)}
								>
									전체 리메이크 파일 선택
								</button>
							</div>
						</summary>
						<div class="patient-content max-h-[calc(100vh-664px)] w-full overflow-y-auto">
							{#each fileInfo.re as file}
								<div
									class="flex w-full cursor-pointer items-center border-b border-gray-200 p-2 pl-2.5 hover:bg-gray-50"
									onclick={() => handleFileClick(file.url)}
								>
									<input
										type="checkbox"
										class="mr-2 h-4 w-4 rounded border-gray-300 text-orange-500"
										value={file.url}
										onchange={(e) => {
											e.stopPropagation();
											const target = e.target as HTMLInputElement;
											handleRemakeCheckboxChange(file.url, target.checked);
										}}
										checked={$selectedRemakeFiles.includes(file.url)}
									/>
									<p class="pb-1 text-lg font-normal text-gray-700">{file.name}</p>
								</div>
							{/each}
						</div>
					</details>
				</div>
			</div>
		</div>
		<div
			id="viewerBox"
			class="w-full rounded-sm border border-gray-200 bg-white text-lg shadow-lg lg:w-2/3"
		>
			<div class="h-full w-full overflow-y-auto rounded-lg p-2">
				<!-- 디버깅 정보 표시 
				<div class="mb-4 rounded bg-gray-100 p-3 text-sm">
					<h4 class="font-bold text-gray-700">디버깅 정보:</h4>
					<div class="grid grid-cols-2 gap-2 text-xs">
						<div>박스 크기: {$boxWidth} x {$boxHeight}</div>
						<div>선택된 노멀 파일: {$selectedNormalFiles.length}개</div>
						<div>선택된 리메이크 파일: {$selectedRemakeFiles.length}개</div>
						<div>STL 파일: {stlFiles.length}개</div>
						<div>OK 파일: {fileInfo.ok.length}개</div>
						<div>RE 파일: {fileInfo.re.length}개</div>
						<div>스케일: {scale}</div>
					</div>
					<div class="mt-2 text-xs">
						<strong>선택된 노멀 파일 URL:</strong>
						{#each $selectedNormalFiles as url, index}
							<div class="truncate text-gray-600">[{index + 1}] {url}</div>
						{/each}
						<strong>선택된 리메이크 파일 URL:</strong>
						{#each $selectedRemakeFiles as url, index}
							<div class="truncate text-gray-600">[{index + 1}] {url}</div>
						{/each}
					</div>
				</div> -->

				{#if !$boxWidth}
					<div class="flex h-full w-full items-center justify-center">
						<p class="text-gray-500">뷰어 크기를 계산 중입니다...</p>
					</div>
				{:else}
					<!-- 선택된 파일들 뷰어 -->
					{#if $selectedNormalFiles.length > 0 || $selectedRemakeFiles.length > 0}
						<div class="min-h-full space-y-4 pb-4">
							<!-- 노멀 파일 뷰어 - 노멀 뷰가 활성화되었거나 노멀 파일만 선택된 경우에만 표시 -->
							{#if $selectedNormalFiles.length > 0 && (activeViewType === 'normal' || activeViewType === null)}
								<div class="w-full">
									<h3
										class="mb-2 border-b border-violet-200 pb-1 text-lg font-bold text-violet-600"
									>
										노멀 파일 뷰어 ({$selectedNormalFiles.length}개)
									</h3>
									<div class="w-full rounded-lg border border-gray-200 p-1">
										<MultiSTLViewer
											stlUrls={$selectedNormalFiles}
											unitScale={scale}
											width={`${$boxWidth - 20}px`}
											height={`${$boxHeight - 80}px`}
										/>
									</div>
								</div>
							{/if}

							<!-- 리메이크 파일 뷰어 - 리메이크 뷰가 활성화되었거나 리메이크 파일만 선택된 경우에만 표시 -->
							{#if $selectedRemakeFiles.length > 0 && (activeViewType === 'remake' || activeViewType === null)}
								<div class="w-full">
									<h3
										class="mb-2 border-b border-orange-200 pb-1 text-lg font-bold text-orange-600"
									>
										리메이크 파일 뷰어 ({$selectedRemakeFiles.length}개)
									</h3>
									<div class="w-full rounded-lg border border-gray-200 p-1">
										<MultiSTLViewer
											stlUrls={$selectedRemakeFiles}
											unitScale={scale}
											width={`${$boxWidth - 20}px`}
											height={`${$boxHeight - 80}px`}
										/>
									</div>
								</div>
							{/if}
						</div>
					{:else}
						<!-- 파일이 선택되지 않은 경우 -->
						<div class="flex h-full w-full items-center justify-center">
							<div class="text-center">
								<p class="mb-2 text-gray-500">STL 파일을 선택해주세요.</p>
								<p class="text-sm text-gray-400">
									노멀 파일과 리메이크 파일을 각각 선택하여 뷰어에서 확인할 수 있습니다.
								</p>
							</div>
						</div>
					{/if}
				{/if}
			</div>
		</div>
	</article>
</main>
{/if}

<style lang="scss">
</style>
