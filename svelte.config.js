import adapter from '@sveltejs/adapter-auto';
import {vitePreprocess} from "@sveltejs/vite-plugin-svelte";


const config = {
	preprocess: [vitePreprocess()], // And this

	kit: {
		adapter: adapter({
			runtime: 'nodejs18'
		}),
	},
};

export default config;