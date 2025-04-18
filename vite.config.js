import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	// Ensure we can use env variables in client-side code
	define: {
		'process.env.GROQ_API_KEY': JSON.stringify(process.env.GROQ_API_KEY)
	},
	build: {
		// Generate source maps for better debugging
		sourcemap: true,
		// Add a separate build configuration for the background service worker
		rollupOptions: {
			input: {
				'background': path.resolve(__dirname, 'src/background-worker.js'),
				'content': path.resolve(__dirname, 'src/content.js')
			},
			output: {
				entryFileNames: chunk => {
					return chunk.name === 'background' || chunk.name === 'content'
						? '[name].js' // Keep the name as is for these specific entry points
						: 'assets/[name]-[hash].js'; // Default naming for other chunks
				}
			}
		}
	},
	// Optimize Vite's dev server for Chrome extension development
	server: {
		port: 5173,
		strictPort: true,
		hmr: {
			port: 5173
		}
	}
});
