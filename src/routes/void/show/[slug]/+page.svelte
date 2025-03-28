<script lang="ts">
	// 캘린더 처리용 DatePicker
	import { writable } from 'svelte/store';
	import { onMount } from 'svelte';

	import MultiSTLViewer from '../../../../app/view/stlviewer/PrintOutPutViewer.svelte';

	const { data } = $props<{ data: any }>();

	// 출력물 종류 처리
	function getInfoName(info: any) {
		let name = '';

		if (info === 'cap') {
			name = '캡';
		} else if (info === 'partial') {
			name = '파샬';
		} else if (info === 'custom') {
			name = '커스텀';
		} else if (info === 'allonfour') {
			name = '올온포';
		}

		return name;
	}

	// stl 파일 목록
	let stlFiles: string[] = [];
	if (data.info.directory && data.info.directory.files) {
		stlFiles = data.info.directory.files.map((file: string) => {
			return data.url + '/api/v0/file/show?filename=' + data.info.id + '@' + file;
		});
	}
	console.log(stlFiles);

	/*const stlFiles = [
		data.url+'/test/print/1.stl',
		data.url+'/test/print/4.stl',
		data.url+'/test/print/3.stl',
		data.url+'/test/print/6.stl',
		data.url+'/test/print/2.stl',
		data.url+'/test/print/5.stl',
		data.url+'/test/print/7.stl',
		'/test/print/8.stl'
	];*/
	const scale = 0.1; // 크기 단위 스케일 (예: 1mm = 0.1)

	let boxWidth: number = 0;
	let boxHeight: number = 0;

	onMount(() => {
		const box = document.querySelector('.h-full.w-full.overflow-x-auto.rounded-lg.p-3');
		boxWidth = box ? box.clientWidth : 0;
		console.log('박스 너비:', boxWidth);
		const viewerBox = document.getElementById('viewerBox');
		if (viewerBox) {
			boxWidth = viewerBox.clientWidth - 25;
			boxHeight = viewerBox.clientHeight - 50;
			console.log('ViewerBox 너비:', boxWidth);
			console.log('ViewerBox 높이:', boxHeight);
		}
	});

	let selectedFiles: string[] = stlFiles;

	function handleCheckboxChange(file: string, checked: boolean) {
		if (checked) {
			selectedFiles = [...selectedFiles, file];
		} else {
			selectedFiles = selectedFiles.filter((f) => f !== file);
		}
		console.log('선택된 파일들:', selectedFiles);
	}
</script>

<main class="ml-64 h-svh flex-1 bg-gray-100 p-8 pt-20">
	<article class=" flex h-full w-full flex-col lg:flex-row">
		<div class="mr-4 w-full rounded-sm border border-gray-200 bg-white text-lg shadow-lg lg:w-1/3">
			<div class="print-list inline-block w-full border-r border-gray-200">
				<div class="box-title m-0 mb-2 flex flex-row items-center py-3 pl-2.5">
					<h3 class="my-auto text-xl font-bold text-pink-500">출력물 관리 정보</h3>
				</div>
				<div class="patient-name inline-block w-full tracking-tight">
					<h3 class="pl-2 text-4xl font-bold text-gray-900">{data.info.corpName} 치과 기공소</h3>
				</div>
				<div class="patient-content w-full">
					<div class="privacy mt-3 flex flex-row border-b border-gray-200 pb-3 pl-2">
						<div class="birth-date w-1/2">
							<p class=" text-gray-600">일시 : {data.info.printDate}</p>
						</div>
						<div class="gender w-1/2">
							<p class=" text-gray-600">
								파일 : {data.info.normalFileNum + data.info.remakeFileNum}개
							</p>
						</div>
					</div>
					<div class="date mt-3 flex flex-row border-b pb-3 pl-2">
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
						class="date flex h-20 flex-row border-b border-gray-200 bg-gray-100 pl-2 text-gray-500"
					>
						<div
							class="ml-auto inline-block w-4/5 w-full bg-gray-100 p-2 pl-0 tracking-tight text-gray-500"
						>
							<p class=" ml-2 text-sm">유닛 갯수 수정</p>
							<input
								type="text"
								class=" h-10 w-full border-none bg-gray-100 text-2xl font-bold"
								placeholder="추가 필요"
							/>
						</div>

						<button
							class="ml-auto inline-block h-20 w-1/5 bg-pink-500 p-3 tracking-tight text-white"
						>
							<h3 class="text-2xl font-bold">수정</h3>
						</button>
					</div>
				</div>
				<div class="box-title m-0 mb-2 mt-4 flex flex-row items-center pl-2.5">
					<h3 class="my-auto text-xl font-bold text-pink-500">파일 정보</h3>
				</div>
				<div class="patient-content max-h-[calc(100vh-600px)] w-full overflow-y-auto">
					{#each stlFiles as file}
						<div class="flex w-full items-center border-b border-gray-200 p-2 pl-2.5">
							<input
								type="checkbox"
								class="mr-2 h-4 w-4 rounded border-gray-300 text-pink-500"
								value={file}
								on:change={(event) => handleCheckboxChange(file, event.target.checked)}
								checked={selectedFiles.includes(file)}
							/>
							<p class="pb-1 text-lg font-normal text-gray-700">{file.split('/').pop()}</p>
						</div>
					{/each}
				</div>
			</div>
		</div>
		<div
			id="viewerBox"
			class="w-full rounded-sm border border-gray-200 bg-white text-lg shadow-lg lg:w-2/3"
		>
			<div class="h-full w-full overflow-x-auto rounded-lg p-3">
				<script>
				</script>
				{#if boxWidth}
					<MultiSTLViewer
						stlUrls={selectedFiles}
						unitScale={scale}
						width={`${boxWidth}px`}
						height={`${boxHeight}px`}
					/>
				{/if}
			</div>
		</div>
	</article>
</main>

<style lang="scss">
</style>
