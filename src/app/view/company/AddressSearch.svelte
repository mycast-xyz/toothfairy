<script lang="ts">
	import { onMount } from 'svelte';

	// props 정의
	let {
		address = $bindable(),
		onAddressChange,
		hasError = false,
		hasWarning = false
	} = $props<{
		address: string;
		onAddressChange: (address: string) => void;
		hasError?: boolean;
		hasWarning?: boolean;
	}>();

	// 우편번호 서비스 스크립트 로드
	onMount(() => {
		// Daum 우편번호 서비스 스크립트가 이미 로드되어 있는지 확인
		if (typeof window !== 'undefined' && !window.daum) {
			const script = document.createElement('script');
			script.src = '//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
			script.async = true;
			document.head.appendChild(script);
		}
	});

	// 우편번호 검색 팝업 열기
	function openPostcode() {
		if (typeof window !== 'undefined' && window.daum) {
			new window.daum.Postcode({
				oncomplete: function (data: any) {
					// 도로명 주소와 지번 주소 모두 표시
					let fullAddress = '';

					if (data.userSelectedType === 'R') {
						// 도로명 주소
						fullAddress = data.roadAddress;
					} else {
						// 지번 주소
						fullAddress = data.jibunAddress;
					}

					// 상세주소가 있으면 추가
					if (data.bname !== '' && /[동|로|가]$/g.test(data.bname)) {
						fullAddress += ' ' + data.bname;
					}
					if (data.buildingName !== '' && data.apartment === 'Y') {
						fullAddress += ' ' + data.buildingName;
					}

					// 주소 정보를 부모 컴포넌트로 전달
					onAddressChange(fullAddress);
				},
				width: 500,
				height: 600,
				theme: {
					bgColor: '#ffffff',
					searchBgColor: '#6366f1', // violet-500
					contentBgColor: '#f8fafc',
					pageBgColor: '#ffffff',
					textColor: '#1e293b',
					queryTextColor: '#ffffff',
					postcodeTextColor: '#6366f1',
					emphTextColor: '#6366f1',
					borderColor: '#e2e8f0'
				}
			}).open({
				left: window.screen.width / 2 - 250,
				top: window.screen.height / 2 - 300,
				popupTitle: '우편번호 검색',
				popupKey: 'addressSearch'
			});
		} else {
			// 스크립트가 로드되지 않은 경우
			alert('우편번호 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
		}
	}
</script>

<div class="address-search-container">
	<div class="flex items-center space-x-2">
		<div class="relative flex-1">
			<input
				type="text"
				bind:value={address}
				class="w-full rounded border px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 {hasError
					? 'border-red-500'
					: hasWarning
						? 'border-yellow-500'
						: 'border-gray-300'} {address ? 'pr-10' : ''}"
				placeholder="주소를 검색하세요"
				readonly
			/>
			{#if address}
				<button
					type="button"
					onclick={() => {
						address = '';
						onAddressChange('');
					}}
					class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors duration-200 hover:text-red-500"
					title="주소 초기화"
				>
					<i class="ri-close-circle-line text-lg"></i>
				</button>
			{/if}
		</div>
		<button
			type="button"
			onclick={openPostcode}
			class="inline-flex items-center justify-center rounded-lg bg-violet-500 px-4 py-3 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-violet-600 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-violet-300"
		>
			<i class="ri-search-line mr-2 text-base"></i>
			주소 검색
		</button>
	</div>

	{#if address}
		<div class="mt-2 flex items-center rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
			<i class="ri-map-pin-line mr-2 text-sm text-violet-500"></i>
			<span class="font-medium">선택된 주소:</span>
			<span class="ml-1 text-gray-700">{address}</span>
		</div>
	{/if}

	{#if !address}
		<div class="mt-2 flex items-center text-xs text-gray-500">
			<i class="ri-information-line mr-1 text-blue-500"></i>
			<span>주소 검색 버튼을 클릭하여 정확한 주소를 입력하세요</span>
		</div>
	{/if}
</div>

<style>
	.address-search-container {
		width: 100%;
	}
</style>
