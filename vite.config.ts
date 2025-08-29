import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [sveltekit()],

	optimizeDeps: {
		include: ['dropzone']
	},

	ssr: {
		noExternal: ['dropzone']
	},

	test: {
		include: ['src/**/*.{test,spec}.{js,ts}']
	}
});
