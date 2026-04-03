import adapter from '@sveltejs/adapter-netlify';
import { relative, sep } from 'node:path';
import { mdsvex } from 'mdsvex';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	extensions: ['.svelte', '.md'],
	preprocess: [mdsvex({ extensions: ['.md'] })],
	compilerOptions: {
		// defaults to rune mode for the project, except for `node_modules` and `.md` files.
		runes: ({ filename }) => {
			const relativePath = relative(import.meta.dirname, filename);
			const pathSegments = relativePath.toLowerCase().split(sep);
			const isExternalLibrary = pathSegments.includes('node_modules');
			const isMarkdown = filename.endsWith('.md');

			if (isExternalLibrary || isMarkdown) return undefined;
			return true;
		}
	},
	kit: { adapter: adapter() }
};

export default config;
