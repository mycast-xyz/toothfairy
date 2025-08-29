<script lang="ts">
	import { WindowService } from '../../service/WindowService';

	// 폼 데이터
	let formData = $state({
		prkey: '',
		type: '',
		koName: '',
		price: ''
	});

	// 폼 제출 처리
	async function handleSubmit() {
		if (!formData.prkey || !formData.type || !formData.koName || !formData.price) {
			alert('모든 필드를 입력해주세요.');
			return;
		}

		try {
			console.log('새 가격 등록:', formData);
			// 여기에 실제 등록 로직 추가

			// 성공 시 모달 닫기
			WindowService.closeModal();
		} catch (error) {
			console.error('가격 등록 오류:', error);
			alert('가격 등록 중 오류가 발생했습니다.');
		}
	}

	// 취소
	function cancelSubmit() {
		WindowService.closeModal();
	}
</script>

<div class="space-y-4">
	<div>
		<!-- 폼 필드들 -->
		<div class="space-y-4">
			<div>
				<label for="prkey" class="mb-2 block text-sm font-medium text-gray-700"
					>임의 지정 고유번호 *</label
				>
				<input
					id="prkey"
					type="text"
					bind:value={formData.prkey}
					class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
					placeholder="예: CAP001"
					required
				/>
			</div>

			<div>
				<label for="type" class="mb-2 block text-sm font-medium text-gray-700">대분류 *</label>
				<select
					id="type"
					bind:value={formData.type}
					class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
					required
				>
					<option value="">선택하세요</option>
					<option value="캡">캡</option>
					<option value="파샬">파샬</option>
					<option value="커스텀">커스텀</option>
					<option value="올온포">올온포</option>
				</select>
			</div>

			<div>
				<label for="koName" class="mb-2 block text-sm font-medium text-gray-700">한글이름 *</label>
				<input
					id="koName"
					type="text"
					bind:value={formData.koName}
					class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
					placeholder="예: 캡 리메이크"
					required
				/>
			</div>

			<div>
				<label for="price" class="mb-2 block text-sm font-medium text-gray-700">금액 *</label>
				<input
					id="price"
					type="number"
					bind:value={formData.price}
					class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
					placeholder="0"
					min="0"
					step="1000"
					required
				/>
			</div>
		</div>
	</div>

	<div
		class="flex items-center justify-end space-x-3 rounded-b border-t border-gray-200 p-4 dark:border-gray-600 md:p-5 rtl:space-x-reverse"
	>
		<button
			class="rounded-md bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300"
			onclick={cancelSubmit}
		>
			취소
		</button>
		<button
			type="submit"
			class="rounded bg-violet-500 px-4 py-2 text-sm font-medium text-white hover:bg-violet-600"
		>
			등록
		</button>
	</div>
</div>
