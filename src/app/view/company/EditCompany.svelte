<script lang="ts">
	import { WindowService, currentUrl } from '../../service/WindowService';
	import axios from 'axios';
	import { CenterCompany } from '../../model/company/CenterCompany';
	import { toastStore } from '../../service/ToastService';

	// 토스트 메시지 표시 함수
	const showToast = (type: 'success' | 'error' | 'info' | 'warning', message: string) => {
		toastStore[type](message);
	};
	// CenterCompany에서 데이터 가져오기
	let newCompany: any = $state({
		name: '',
		companyName: '',
		businessNumber: '',
		representative: '',
		address: '',
		cellnumber: '',
		item: [],
		prices: {
			cap: { normal: 0, remake: 0 },
			partial: { normal: 0, remake: 0 },
			allonfour: { normal: 0, remake: 0 },
			custom: { normal: 0, remake: 0 }
		},
		deliveryFee: 0,
		id: 0
	});

	CenterCompany.company.subscribe((company) => {
		console.log(company);
		if (company) {
			newCompany = {
				...newCompany,
				...company,
				prices: {
					cap: { ...(company.prices?.cap || { normal: 0, remake: 0 }) },
					partial: { ...(company.prices?.partial || { normal: 0, remake: 0 }) },
					allonfour: { ...(company.prices?.allonfour || { normal: 0, remake: 0 }) },
					custom: { ...(company.prices?.custom || { normal: 0, remake: 0 }) }
				}
			};
		}
	});

	console.log($currentUrl);

	// 태스크 저장
	async function saveCompany() {
		const response = await axios
			.post(`${$currentUrl}/api/v0/corp/add`, newCompany)
			.then((res) => {
				console.log(res.data);
				if (res.data.resultCode === 200) {
					showToast('success', '처리가 완료되었습니다.');
					WindowService.closeModal();
				} else {
					console.error('서버 연결 중 오류가 발생했습니다.');
					showToast('error', res.data.response.data.resultMsg || '처리 중 오류가 발생했습니다.');
				}
			})
			.catch((err) => {
				console.log(err);
				showToast('error', err.response.data.resultMsg || '처리 중 오류가 발생했습니다.');
			});
	}
</script>

<div class="space-y-4">
	<div>
		<label class="block text-sm font-medium text-gray-700" for="title">폴더명</label>
		<input type="text" bind:value={newCompany.name} class="mt-1 w-full rounded-md border p-2" />
	</div>
	<div>
		<label class="block text-sm font-medium text-gray-700" for="title">회사명</label>
		<input
			type="text"
			bind:value={newCompany.companyName}
			class="mt-1 w-full rounded-md border p-2"
		/>
	</div>
	<div>
		<label class="block text-sm font-medium text-gray-700" for="description">사업자번호</label>
		<input
			type="text"
			bind:value={newCompany.businessNumber}
			class="mt-1 w-full rounded-md border p-2"
		/>
	</div>
	<div>
		<label class="block text-sm font-medium text-gray-700" for="title">대표자</label>
		<input
			type="text"
			bind:value={newCompany.representative}
			class="mt-1 w-full rounded-md border p-2"
		/>
	</div>
	<div>
		<label class="block text-sm font-medium text-gray-700" for="description">주소</label>
		<input type="text" bind:value={newCompany.address} class="mt-1 w-full rounded-md border p-2" />
	</div>
	<div>
		<label class="block text-sm font-medium text-gray-700" for="description">전화번호</label>
		<input
			type="text"
			bind:value={newCompany.cellnumber}
			class="mt-1 w-full rounded-md border p-2"
		/>
	</div>
	<div>
		<label class="block text-sm font-medium text-gray-700" for="description">출력물 종류</label>
		<div class="mt-2 space-x-4">
			<label class="inline-flex items-center">
				<input
					type="checkbox"
					bind:group={newCompany.item}
					value="cap"
					class="rounded border-gray-300"
				/>
				<span class="ml-2">캡</span>
			</label>
			<label class="inline-flex items-center">
				<input
					type="checkbox"
					bind:group={newCompany.item}
					value="partial"
					class="rounded border-gray-300"
				/>
				<span class="ml-2">파샬</span>
			</label>
			<label class="inline-flex items-center">
				<input
					type="checkbox"
					bind:group={newCompany.item}
					value="allonfour"
					class="rounded border-gray-300"
				/>
				<span class="ml-2">올온포</span>
			</label>
			<label class="inline-flex items-center">
				<input
					type="checkbox"
					bind:group={newCompany.item}
					value="custom"
					class="rounded border-gray-300"
				/>
				<span class="ml-2">커스텀</span>
			</label>
		</div>
	</div>
	<div class="mt-4">
		<label class="block text-sm font-medium text-gray-700">가격 설정</label>
		{#each newCompany.item as item}
			<div class="mt-2 grid grid-cols-2 gap-4">
				<div>
					<label class="block text-sm text-gray-600"
						>{item === 'cap'
							? '캡'
							: item === 'partial'
								? '파샬'
								: item === 'allonfour'
									? '올온포'
									: '커스텀'} 정상가</label
					>
					<input
						type="number"
						bind:value={newCompany.prices[item].normal}
						class="mt-1 w-full rounded-md border p-2"
						placeholder="정상가 입력"
					/>
				</div>
				<div>
					<label class="block text-sm text-gray-600"
						>{item === 'cap'
							? '캡'
							: item === 'partial'
								? '파샬'
								: item === 'allonfour'
									? '올온포'
									: '커스텀'} 리메이크가</label
					>
					<input
						type="number"
						bind:value={newCompany.prices[item].remake}
						class="mt-1 w-full rounded-md border p-2"
						placeholder="리메이크가 입력"
					/>
				</div>
			</div>
		{/each}
	</div>
	<div class="mt-4">
		<label for="deliveryFee" class="block text-sm font-medium text-gray-700">배송 비용</label>
		<div class="mt-2">
			<input
				type="number"
				bind:value={newCompany.deliveryFee}
				class="w-full rounded-md border p-2"
				placeholder="배송 비용 입력"
			/>
		</div>
	</div>
	<div
		class="flex items-center space-x-3 rounded-b border-t border-gray-200 p-4 dark:border-gray-600 md:p-5 rtl:space-x-reverse"
	>
		<button class="rounded-md bg-gray-200 px-4 py-2" onclick={() => WindowService.closeModal()}>
			취소
		</button>
		<button class="rounded-md bg-pink-500 px-4 py-2 text-white" onclick={saveCompany}>
			저장
		</button>
	</div>
</div>
