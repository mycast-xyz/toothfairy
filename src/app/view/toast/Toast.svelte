<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { toastStore } from '../../service/ToastService';

	const icons = {
		success: 'ri-checkbox-circle-line',
		error: 'ri-error-warning-line',
		info: 'ri-information-line',
		warning: 'ri-alert-line'
	};

	const colors = {
		success: 'bg-green-500',
		error: 'bg-red-500',
		info: 'bg-blue-500',
		warning: 'bg-yellow-500'
	};
</script>

<div class="fixed right-0 top-0 z-50 m-4 flex flex-col items-end space-y-2">
	{#each $toastStore as toast (toast.id)}
		{#if toast.visible}
			<div
				class="flex min-w-[300px] items-center rounded-lg p-4 text-white shadow-lg {colors[
					toast.type
				]}"
				transition:fly={{ x: 100, duration: 300 }}
			>
				<i class={icons[toast.type] + ' mr-2 text-xl'} />
				<span class="flex-1">{toast.message}</span>
				<button
					type="button"
					class="ml-4 transition-opacity hover:opacity-75"
					onclick={(e) => {
						e.stopPropagation();
						toastStore.dismiss(toast.id);
					}}
					onkeydown={(e) => e.key === 'Enter' && toastStore.dismiss(toast.id)}
				>
					<i class="ri-close-line" />
				</button>
			</div>
		{/if}
	{/each}
</div>
