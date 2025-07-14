<script lang="ts">
	export let label: string;
	export let options: { value: string; label: string }[];
	export let selected: string;
	export let onSelect: (value: string) => void;
	export let bgColor: string;
	export let textColor: string;
	export let hoverBgColor: string;
	export let hoverTextColor: string;
</script>

<div class="group relative inline-block">
	<button
		type="button"
		class="inline-flex w-full items-center justify-center rounded px-2 py-1 text-xs font-medium {bgColor} {textColor} hover:{hoverBgColor} focus:{hoverBgColor} focus:outline-none"
	>
		{label}
		<svg
			class="-mr-1 ml-1 h-4 w-4"
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 20 20"
			fill="currentColor"
		>
			<path fill-rule="evenodd" d="M10 12l-5-5h10l-5 5z" />
		</svg>
	</button>
	<div
		class="invisible absolute left-0 z-10 mt-0 w-32 origin-top-left divide-y divide-gray-100 rounded-md bg-white opacity-0 shadow-lg transition duration-300 group-hover:visible group-hover:opacity-100"
	>
		<div class="py-1">
			{#each options as opt}
				<a
					href="#"
					class="block px-4 py-2 text-xs text-gray-700 hover:bg-gray-100 {selected === opt.value
						? 'font-bold text-violet-600'
						: ''}"
					on:click|preventDefault={() => onSelect(opt.value)}
				>
					{opt.label}
				</a>
			{/each}
		</div>
	</div>
</div>
