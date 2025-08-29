<script lang="ts">
	// props 정의
	let { formData, onUpdateFormData } = $props<{
		formData: any;
		onUpdateFormData: (updates: any) => void;
	}>();

	// 출력물 종류 선택/해제 핸들러
	function togglePrintType(type: string, checked: boolean) {
		if (checked) {
			// 새로운 출력물 종류 추가
			const newPrintType = [
				...formData.printType,
				{
					type: type,
					normalPrice: 0,
					remakePrice: 0
				}
			];
			onUpdateFormData({ printType: newPrintType });
		} else {
			// 출력물 종류 제거
			const newPrintType = formData.printType.filter((item: any) => item.type !== type);
			onUpdateFormData({ printType: newPrintType });
		}
	}

	// 가격 입력 핸들러
	function updatePrice(type: string, priceType: string, value: string) {
		const updatedPrintType = formData.printType.map((item: any) => {
			if (item.type === type) {
				const updatedItem = { ...item };
				if (priceType === 'Normal') {
					updatedItem.normalPrice = parseInt(value) || 0;
				} else if (priceType === 'Remake') {
					updatedItem.remakePrice = parseInt(value) || 0;
				}
				return updatedItem;
			}
			return item;
		});
		onUpdateFormData({ printType: updatedPrintType });
	}
</script>

<div class="space-y-6">
	<!-- 출력물 종류 선택 -->
	<div class="mb-2 flex items-center space-x-3">
		<label class="w-32 text-sm font-medium text-gray-700">출력물 종류</label>
		<div class="flex flex-1 space-x-4">
			<label
				for="printType-cap"
				class="inline-flex flex-1 cursor-pointer items-center justify-center rounded-lg border-2 p-2 transition-colors hover:border-violet-300 hover:text-violet-900 {formData.printType.some(
					(item: any) => item.type === 'cap'
				)
					? 'border-violet-500 bg-violet-100 text-violet-900'
					: 'border-neutral-200/70 bg-white text-neutral-600'}"
			>
				<input
					type="checkbox"
					name="printType"
					id="printType-cap"
					class="hidden"
					checked={formData.printType.some((item: any) => item.type === 'cap')}
					onchange={(e) => togglePrintType('cap', (e.target as HTMLInputElement).checked)}
				/>
				<i class="ri-tooth-line mr-3 h-8 w-8 text-2xl"></i>
				<span class="text-base font-medium">캡</span>
			</label>
			<label
				for="printType-partial"
				class="inline-flex flex-1 cursor-pointer items-center justify-center rounded-lg border-2 p-2 transition-colors hover:border-violet-300 hover:text-violet-900 {formData.printType.some(
					(item: any) => item.type === 'partial'
				)
					? 'border-violet-500 bg-violet-100 text-violet-900'
					: 'border-neutral-200/70 bg-white text-neutral-600'}"
			>
				<input
					type="checkbox"
					name="printType"
					id="printType-partial"
					class="hidden"
					checked={formData.printType.some((item: any) => item.type === 'partial')}
					onchange={(e) => togglePrintType('partial', (e.target as HTMLInputElement).checked)}
				/>
				<i class="ri-qr-scan-fill mr-3 h-8 w-8 text-2xl"></i>
				<span class="text-base font-medium">파샬</span>
			</label>
			<label
				for="printType-allonfour"
				class="inline-flex flex-1 cursor-pointer items-center justify-center rounded-lg border-2 p-2 transition-colors hover:border-violet-300 hover:text-violet-900 {formData.printType.some(
					(item: any) => item.type === 'allonfour'
				)
					? 'border-violet-500 bg-violet-100 text-violet-900'
					: 'border-neutral-200/70 bg-white text-neutral-600'}"
			>
				<input
					type="checkbox"
					name="printType"
					id="printType-allonfour"
					class="hidden"
					checked={formData.printType.some((item: any) => item.type === 'allonfour')}
					onchange={(e) => togglePrintType('allonfour', (e.target as HTMLInputElement).checked)}
				/>
				<i class="ri-ram-2-line mr-3 h-8 w-8 text-2xl"></i>
				<span class="text-base font-medium">올온포</span>
			</label>
			<label
				for="printType-custom"
				class="inline-flex flex-1 cursor-pointer items-center justify-center rounded-lg border-2 p-2 transition-colors hover:border-violet-300 hover:text-violet-900 {formData.printType.some(
					(item: any) => item.type === 'custom'
				)
					? 'border-violet-500 bg-violet-100 text-violet-900'
					: 'border-neutral-200/70 bg-white text-neutral-600'}"
			>
				<input
					type="checkbox"
					name="printType"
					id="printType-custom"
					class="hidden"
					checked={formData.printType.some((item: any) => item.type === 'custom')}
					onchange={(e) => togglePrintType('custom', (e.target as HTMLInputElement).checked)}
				/>
				<i class="ri-test-tube-line mr-3 h-8 w-8 text-2xl"></i>
				<span class="text-base font-medium">커스텀</span>
			</label>
		</div>
	</div>

	<!-- 출력물 종류별 가격 입력 섹션 -->
	{#if formData.printType && formData.printType.length > 0}
		<div class="mb-6 border-t border-gray-200 pt-6">
			<div class="mb-4 flex items-center space-x-3">
				<label class="w-32 text-sm font-semibold text-gray-800">출력물 가격 설정</label>
			</div>

			<div class="space-y-4">
				{#each formData.printType as printType, index}
					<div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
						<div class="mb-3 flex items-center space-x-3">
							<span
								class="flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 text-xs font-semibold text-violet-700"
							>
								{index + 1}
							</span>
							<label class="text-sm font-semibold capitalize text-gray-800">
								{printType.type} 가격 정보
							</label>
						</div>

						<div class="grid grid-cols-2 gap-6">
							<!-- 정상 가격 -->
							<div class="space-y-2">
								<label class="flex items-center space-x-2 text-sm font-medium text-gray-700">
									<i class="ri-check-line text-green-500"></i>
									<span>정상 가격</span>
								</label>
								<div class="relative">
									<input
										type="number"
										value={printType.normalPrice || ''}
										oninput={(e) =>
											updatePrice(printType.type, 'Normal', (e.target as HTMLInputElement).value)}
										class="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm transition-colors focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
										placeholder="0"
										min="0"
									/>
									<span class="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500"
										>원</span
									>
								</div>
							</div>

							<!-- 리메이크 가격 -->
							<div class="space-y-2">
								<label class="flex items-center space-x-2 text-sm font-medium text-gray-700">
									<i class="ri-refresh-line text-orange-500"></i>
									<span>리메이크 가격</span>
								</label>
								<div class="relative">
									<input
										type="number"
										value={printType.remakePrice || ''}
										oninput={(e) =>
											updatePrice(printType.type, 'Remake', (e.target as HTMLInputElement).value)}
										class="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm transition-colors focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
										placeholder="0"
										min="0"
									/>
									<span class="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500"
										>원</span
									>
								</div>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>
