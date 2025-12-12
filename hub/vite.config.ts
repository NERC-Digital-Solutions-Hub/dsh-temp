import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	define: {
		__dirname: 'import.meta.dirname'
	},
	ssr: {
		external: ['rehype-mermaid', 'playwright-core', 'mermaid-isomorphic']
	}
});
