<script lang="ts">
	// 필요한 모듈 import
	import { writable } from 'svelte/store';
	import { onMount } from 'svelte';
	import MultiSTLViewer from '../../../../app/view/stlviewer/PrintOutPutViewer.svelte';

	// props에서 데이터 가져오기
	const { data } = $props<{ data: any }>();

	// 출력물 종류에 따른 한글 이름 매핑
	const infoNameMap: Record<string, string> = {
		cap: '캡',
		partial: '파샬',
		custom: '커스텀',
		allonfour: '올온포'
	};

	// 출력물 종류 한글 이름 반환
	const getInfoName = (info: string) => infoNameMap[info] || '';

	// STL 파일 관련 데이터 초기화
	let stlFiles: string[] = [];
	let stlData: Array<{ url: string; name: string }> = [];

	// 디렉토리에서 STL 파일 정보 추출
	if (data.info.directory?.files) {
		stlFiles = data.info.directory.files.map(
			(file: string) =>
				`${data.url}/api/v0/file/show?filename=${data.info.id}@${data.info.directory.files.indexOf(file)}`
		);

		stlData = data.info.directory.files.map((file: string, index: number) => ({
			url: stlFiles[index],
			name: file
		}));
	}

	// 리메이크 파일 정보 처리를 위한 인터페이스
	interface RemakeFile {
		name: string;
		url: string;
	}

	// 리메이크 파일 상태 저장
	let remakeInfo = {
		ok: [] as RemakeFile[],
		re: [] as RemakeFile[]
	};

	// 리메이크 파일 매칭 처리
	if (data.info.directory?.remakeFiles) {
		// OK 파일 매칭 함수
		const matchFiles = (remakeFiles: string[]) => {
			return remakeFiles
				.map((remakeFile: string) => {
					const fileIndex = data.info.directory.files.findIndex(
						(file: string) => file.split('@')[1] === remakeFile
					);
					return fileIndex >= 0
						? {
								name: data.info.directory.files[fileIndex],
								url: stlFiles[fileIndex]
							}
						: null;
				})
				.filter((item: RemakeFile | null): item is RemakeFile => item !== null);
		};

		// OK/RE 파일 매칭 실행
		if (data.info.directory.remakeFiles.ok) {
			remakeInfo.ok = matchFiles(data.info.directory.remakeFiles.ok);
		}
		if (data.info.directory.remakeFiles.re) {
			remakeInfo.re = matchFiles(data.info.directory.remakeFiles.re);
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
			boxWidth.set(viewerBox.clientWidth - 25);
			boxHeight.set(viewerBox.clientHeight - 50);
		}
	}

	// 컴포넌트 마운트 시 초기화
	onMount(() => {
		updateDimensions();
		window.addEventListener('resize', updateDimensions);
		return () => window.removeEventListener('resize', updateDimensions);
	});

	// 선택된 파일 관리
	let selectedFiles = writable<string[]>(remakeInfo.ok.map((file) => file.url));

	// 파일 선택 이벤트 핸들러
	const handleCheckboxChange = (file: string, checked: boolean) => {
		selectedFiles.update((files) => (checked ? [...files, file] : files.filter((f) => f !== file)));
	};

	const handleFileSelect = (files: Array<{ url: string }>) => {
		selectedFiles.set(files.map((f) => f.url));
	};
</script>

<main class="ml-64 h-svh flex-1 bg-gray-100 p-8 pt-20">
	<article class=" flex h-full w-full flex-col lg:flex-row">
		<div class="mr-4 w-full rounded-sm border border-gray-200 bg-white text-lg shadow-lg lg:w-1/3">
			<div class="print-list inline-block w-full border-r border-gray-200">
				<div
					class="box-title m-0 mb-2 flex flex-row items-center border-b border-gray-200 py-3 pl-2.5"
				>
					<button
						class="mr-2 rounded-full p-2 text-gray-400 hover:text-gray-800"
						onclick={() => history.back()}
						aria-label="뒤로가기"
					>
						<i class="ri-arrow-left-line"></i>
					</button>
					<h3 class="my-auto text-xl font-bold text-pink-500">출력물 관리 정보</h3>
				</div>
				<div class="patient-name inline-block w-full tracking-tight">
					<h3 class="pl-2 text-4xl font-bold text-gray-900">{data.info.corpName} 치과 기공소</h3>
				</div>
				<div class="patient-content w-full">
					<div class="privacy mt-3 flex flex-row border-b border-gray-400 pb-3 pl-2">
						<div class="birth-date w-1/2">
							<p class=" text-gray-600">일시 : {data.info.printDate}</p>
						</div>
						<div class="gender w-1/2">
							<p class=" text-gray-600">
								파일 : {data.info.normalFileNum + data.info.remakeFileNum}개
							</p>
						</div>
					</div>
					<div class="date mt-3 flex flex-row border-b border-gray-400 pb-3 pl-2">
						<div class="ml-auto mr-5 inline-block h-20 w-1/2 p-3 pl-0 tracking-tight text-gray-500">
							<p class=" text-sm">종류</p>
							<h3 class="text-4xl font-bold">{getInfoName(data.info.info)}</h3>
						</div>
						<div
							class="ml-auto mr-5 inline-block h-20 w-1/2 bg-pink-500 p-3 tracking-tight text-white"
						>
							<p class=" text-sm">유닛 갯수</p>
							<h3 class="text-4xl font-bold">추가 필요</h3>
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
								type="text"
								class=" h-18 w-3/4 border-none bg-gray-100 text-2xl font-bold"
								placeholder="추가 필요"
							/>
						</div>

						<button
							class="h-18 ml-auto inline-block w-1/5 bg-pink-500 p-3 tracking-tight text-white"
						>
							<h3 class="text-2xl font-bold">수정</h3>
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
								type="text"
								class=" h-18 w-3/4 border-none bg-gray-100 text-2xl font-bold"
								placeholder="추가 필요"
							/>
						</div>

						<button
							class="h-18 ml-auto inline-block w-1/5 bg-pink-500 p-3 tracking-tight text-white"
						>
							<h3 class="text-2xl font-bold">수정</h3>
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
							<h3 class="my-auto text-xl font-bold text-pink-500">정상 파일 정보</h3>
							<button
								class="ml-auto border-l border-gray-200 text-sm text-gray-500"
								onclick={() => handleFileSelect(remakeInfo.ok)}
							>
								전체 정상 파일 선택
							</button>
						</summary>
						<div class="patient-content max-h-[calc(100vh-660px)] w-full overflow-y-auto">
							{#each remakeInfo.ok as file}
								<div class="flex w-full items-center border-b border-gray-200 p-2 pl-2.5">
									<input
										type="checkbox"
										class="mr-2 h-4 w-4 rounded border-gray-300 text-pink-500"
										value={file}
										onchange={(e) => {
											const target = e.target as HTMLInputElement;
											handleCheckboxChange(file, target.checked);
										}}
										checked={$selectedFiles.includes(file.url)}
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
							<h3 class="my-auto text-xl font-bold text-pink-500">리메이크 파일 정보</h3>
							<button
								class="ml-auto mr-2 border-l border-gray-200 text-sm text-gray-500"
								onclick={() => handleFileSelect(remakeInfo.re)}
							>
								전체 리메이크 파일 선택
							</button>
						</summary>
						<div class="patient-content max-h-[calc(100vh-664px)] w-full overflow-y-auto">
							{#each remakeInfo.re as file}
								<div class="flex w-full items-center border-b border-gray-200 p-2 pl-2.5">
									<input
										type="checkbox"
										class="mr-2 h-4 w-4 rounded border-gray-300 text-pink-500"
										value={file.url}
										onchange={(e) => {
											const target = e.target as HTMLInputElement;
											handleCheckboxChange(file.url, target.checked);
										}}
										checked={$selectedFiles.includes(file.url)}
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
			<div class="h-full w-full overflow-x-auto rounded-lg p-3">
				{#if $boxWidth}
					<MultiSTLViewer
						stlUrls={$selectedFiles}
						unitScale={scale}
						width={`${$boxWidth}px`}
						height={`${$boxHeight}px`}
					/>
				{:else}
					<div class="flex h-full w-full items-center justify-center">
						<p class="text-gray-500">STL 파일을 선택해주세요.</p>
					</div>
				{/if}
			</div>
		</div>
	</article>
</main>

<style lang="scss">
</style>
