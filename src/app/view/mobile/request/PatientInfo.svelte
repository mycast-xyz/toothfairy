<script lang="ts">
	import { v6 as uuidv6 } from 'uuid';

	// 치과데이터
	import TestDentistry from '../../../model/company/TestDentistry.json';

	// 캘린더 처리용 DatePicker
	import { format } from 'date-fns';
	import { patientInfoStore } from '../../../model/lab/request/Request';

	// props로 부모 컴포넌트의 nextStep 함수를 받음
	let { nextStep } = $props<{ nextStep: () => void }>();

	const options = {
		clockseq: 0x1234,
		msecs: new Date().getTime(),
		nsecs: 5678
	};

	// 환자 정보
	let patientInfo = {
		name: '',
		startDate: getToday(),
		endDate: '',
		sendCompany: '',
		totalPrice: 0,
		option: [],
		uuid: uuidv6(options),
		photoFile: null // [변경] 초기값 설정
	};

	// 오늘날짜
	function getToday() {
		var date = new Date();
		var year = date.getFullYear();
		var month = ('0' + (1 + date.getMonth())).slice(-2);
		var day = ('0' + date.getDate()).slice(-2);

		return year + '-' + month + '-' + day;
	}

	// 캘린더용 처리
	const MILLISECONDS_IN_DAY = 24 * 60 * 60 * 1000;
	const getDateFromToday = (days: number) => {
		return Date.now() + days * MILLISECONDS_IN_DAY;
	};

	// 생년월이 처리용 - 환자 정보 입력
	let dateFormat = 'yyyy-MM-dd';
	const formatDate = (dateString: string | Date) => {
		return (dateString && format(new Date(dateString), dateFormat)) || '';
	};
	let deliveryDate = $state(formatDate(new Date(getDateFromToday(7))));

	// 의뢰서 파일 처리
	let photoFile = $state<string | null>(null);
	const handlePhotoFile = (event: Event) => {
		const file = (event.target as HTMLInputElement).files?.[0];
		if (file) {
			const reader = new FileReader();

			// 파일 읽기가 완료되면 실행될 콜백 함수
			reader.onload = (e) => {
				if (e.target && e.target.result) {
					photoFile = e.target.result as string; // 결과를 변수에 저장
				}
			};

			// 파일을 Base64 데이터 URL로 읽기 시작
			reader.readAsDataURL(file);
		}
	};

	// 저장
	function sendPatientInfo() {
		patientInfo.endDate = formatDate(deliveryDate);
		patientInfo.photoFile = photoFile;
		patientInfoStore.setPatientInfo(patientInfo);
		let testlog;
		patientInfoStore.patientInfo.subscribe((data) => {
			testlog = data;
		});
		console.log('환자 정보:', testlog);

		// 다음 단계로 이동
		nextStep();
	}
</script>

<article
	class="request-content mt-4 block h-auto w-full rounded-lg border border-gray-200 bg-white px-4 py-3 shadow dark:border-gray-700 dark:bg-gray-800"
>
	<div class="patient-info-input-group border-b border-gray-200">
		<div
			class="box-title m-0 mb-2 inline-block flex flex-row items-center border-b border-gray-100 pb-2"
		>
			<h3 class="my-auto text-xl font-bold text-violet-900">환자정보</h3>
		</div>
		<div class="info-input-group mb-6 mt-2 w-full">
			<div class="p-2">
				<label for="first_name" class="mb-2 block text-sm font-medium text-gray-600"
					>환자이름
				</label>
				<input
					type="text"
					id="first_name"
					bind:value={patientInfo.name}
					class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-800 focus:border-violet-500 focus:ring-violet-500"
					placeholder="홍길동"
					required
				/>
			</div>
			<div class="p-2">
				<label for="first_name" class="mb-2 block text-sm font-medium text-gray-600"
					>납품 요구일
				</label>
				<input
					type="date"
					class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-800 focus:border-violet-500 focus:ring-violet-500"
					placeholder="Select date"
					bind:value={deliveryDate}
				/>
			</div>
			<div class="p-2">
				<label for="first_name" class="mb-2 block text-sm font-medium text-gray-600"
					>의뢰 병원
				</label>
				<select
					id="request-comp-name"
					bind:value={patientInfo.sendCompany}
					placeholder="치과선택"
					class="mb-6 block w-full cursor-not-allowed rounded-lg border border-gray-300 bg-gray-100 p-2.5 text-sm text-gray-900 focus:border-violet-500 focus:ring-violet-500"
				>
					{#each TestDentistry as item}
						<option value={item.name}>{item.name}</option>
					{/each}
				</select>
			</div>
			<div class="p-2">
				<label for="first_name" class="mb-2 block text-sm font-medium text-gray-600"
					>의뢰서 파일
				</label>
				<input
					type="file"
					class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-800 focus:border-violet-500 focus:ring-violet-500"
					placeholder="Select date"
					accept="image/*"
					onchange={handlePhotoFile}
				/>
			</div>
		</div>
		<div class="btn-group flex flex-row p-2 pt-4">
			<button
				type="button"
				class=" ml-auto mr-4 rounded-full border border-gray-400 bg-white px-5 py-3 text-center text-base font-medium text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-4 focus:ring-gray-200"
			>
				작성 취소
			</button>
			<button
				onclick={sendPatientInfo}
				class="rounded-full bg-violet-700 px-5 py-3 text-center text-base font-bold text-white hover:bg-violet-800 focus:outline-none focus:ring-4 focus:ring-violet-300"
			>
				의뢰 제출
			</button>
		</div>
	</div>
</article>
