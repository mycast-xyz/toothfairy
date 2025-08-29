<script lang="ts">
	import { WindowService } from '../../service/WindowService';

	let {
		body,
		title,
		size
	}: {
		body: any;
		title: string;
		size: string;
	} = $props();
</script>

<!-- Modal -->
<div id="modal" tabindex="-1" class="fixed inset-0 z-40 flex items-center justify-center p-4">
	<div class="absolute inset-0 bg-black/50"></div>
	<div class="relative max-h-[90vh] w-full">
		<!-- Modal content -->
		<div
			class="mx-auto rounded-lg bg-white shadow-sm dark:bg-gray-700"
			class:max-w-md={size === 'small'}
			class:max-w-lg={size === 'default'}
			class:max-w-4xl={size === 'large'}
			class:max-w-7xl={size === 'extralarge'}
		>
			<!-- Modal header -->
			<div
				class="flex items-center justify-between rounded-t border-b border-gray-200 p-4 dark:border-gray-600 md:p-5"
			>
				<h3 class="text-xl font-medium text-gray-900 dark:text-white">
					{title}
				</h3>
				<button
					type="button"
					class="ms-auto inline-flex h-8 w-8 items-center justify-center rounded-lg bg-transparent text-sm text-gray-400 hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-600 dark:hover:text-white"
					data-modal-hide="modal"
					onclick={(_) => WindowService.closeModal()}
				>
					<i class="ri-close-large-line"></i>
					<span class="sr-only">Close modal</span>
				</button>
			</div>
			<!-- Modal body -->
			<div class="max-h-[calc(90vh-120px)] overflow-y-auto p-4 md:p-5">
				{@render body()}
			</div>
			<!-- Modal footer -->
		</div>
	</div>
</div>
