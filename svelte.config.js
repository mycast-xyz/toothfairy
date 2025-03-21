import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess({ typescript: true, scss: true }),
	kit: {
		adapter: adapter({
			fallback: 'index.html', // CSR 모드에서는 index.html을 fallback으로 설정
		}),
		paths: {
			base: process.env.BASE_PATH || '', // GitHub Pages 경로 설정
		},
		prerender: {
			entries: []
		}
	}
};

export default config;
