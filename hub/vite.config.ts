import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import './scripts/sync-configs.ts';

export default defineConfig({
	cacheDir: '.vite',
	plugins: [tailwindcss(), sveltekit()],
	define: {
		__dirname: 'import.meta.dirname'
	},
	ssr: {
		external: ['rehype-mermaid', 'playwright-core', 'mermaid-isomorphic'],
		noExternal: ['svelte-sonner']
	}
});
