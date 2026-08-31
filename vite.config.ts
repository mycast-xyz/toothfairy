import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [sveltekit()],

	server: {
		host: true, // 0.0.0.0 바인딩 — LAN 등 외부에서 접속 가능
		port: 5173,
		strictPort: true
	},

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
