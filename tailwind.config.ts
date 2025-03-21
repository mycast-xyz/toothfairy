import containerQueries from '@tailwindcss/container-queries';
import forms from '@tailwindcss/forms';
import typography from '@tailwindcss/typography';
import type { Config } from 'tailwindcss';

export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],

	darkMode: 'class',
	theme: {
		color: {
			hotpink: '#ff69b4'
		},
		extend: {}
	},

	plugins: [typography, forms, containerQueries]
} satisfies Config;
