<script lang="ts">
	import { patientInfoStore } from '../../../model/lab/request/Request';
	// props로 부모 컴포넌트의 nextStep 함수를 받음
	let { nextStep } = $props<{ nextStep: () => void }>();

	let testlog;

	patientInfoStore.patientInfo.subscribe((data) => {
		testlog = data;
	});
</script>

<div class="treatment-info-input-group border-b border-gray-200">
	<div class="p-2">
		<div
			class="box-title m-0 mb-2 inline-block flex flex-row items-center border-b border-gray-100 pb-2"
		>
			<h3 class="my-auto text-xl font-bold text-violet-900">2. 환자정보 확인</h3>
		</div>

		{#if testlog}
			<div class="info-display-group mb-6 mt-2 w-full">
				<div class="p-2">
					<label class="mb-2 block text-sm font-medium text-gray-600">환자이름</label>
					<div
						class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-800"
					>
						{testlog.name || '입력되지 않음'}
					</div>
				</div>
				<div class="p-2">
					<label class="mb-2 block text-sm font-medium text-gray-600">납품 요구일</label>
					<div
						class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-800"
					>
						{testlog.endDate || '입력되지 않음'}
					</div>
				</div>
				<div class="p-2">
					<label class="mb-2 block text-sm font-medium text-gray-600">의뢰 병원</label>
					<div
						class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-800"
					>
						{testlog.sendCompany || '입력되지 않음'}
					</div>
				</div>
				<div class="p-2">
					<label class="mb-2 block text-sm font-medium text-gray-600">UUID</label>
					<div
						class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-800"
					>
						{testlog.uuid || '생성되지 않음'}
					</div>
				</div>
				<div class="p-2">
					<label class="mb-2 block text-sm font-medium text-gray-600">의뢰서 파일</label>
					<div
						class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-800"
					>
						{testlog.photoFile
							? (() => {
									// base64 문자열에서 이미지 타입 추출
									const match = testlog.photoFile.match(/^data:([^;]+);base64,/);
									if (match) {
										const mimeType = match[1];
										// MIME 타입에서 확장자 추출
										const extension = mimeType.split('/')[1]?.toUpperCase() || 'UNKNOWN';
										return `파일이 선택됨 (${extension})`;
									}
									return '파일이 선택됨';
								})()
							: '파일이 선택되지 않음'}
					</div>
					<div class="p-2">
						<img src={testlog.photoFile} alt="의뢰서 파일" />
					</div>
				</div>
			</div>
		{:else}
			<div class="p-2">
				<div
					class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-800"
				>
					환자 정보가 없습니다.
				</div>
			</div>
		{/if}
	</div>
</div>
