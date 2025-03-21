<script lang="ts">
	import { WindowService } from '../../service/WindowService';
	let { onresetclick, title } = $props<{
		onresetclick: () => void;
		title: string;
	}>();
</script>

<div class="modal-container h-[calc(100% - 64px)] fixed inset-0 z-30 mt-16 bg-white">
	<header class="flex w-full justify-between p-4">
		<button class="text-gray-400" onclick={(_) => onresetclick()}>리셋</button>
		<h2 class="font-medium">{title}</h2>
		<button class="text-gray-400" onclick={(_) => WindowService.closeModal()}>취소</button>
	</header>

	<!-- 필터 기능 -->
	<slot name="body" />
</div>
