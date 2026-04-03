import adapter from '@sveltejs/adapter-netlify';
import { relative, sep } from 'node:path';
import { mdsvex } from 'mdsvex';
import { createHighlighter } from 'shiki';

const highlighter = await createHighlighter({
	themes: ['night-owl'],
	langs: ['rust', 'bash', 'toml', 'javascript', 'typescript', 'json', 'text']
});

/** @type {import('@sveltejs/kit').Config} */
const config = {
	extensions: ['.svelte', '.md'],
	preprocess: [
		mdsvex({
			extensions: ['.md'],
			highlight: {
				highlighter: (code, lang) => {
					const loaded = highlighter.getLoadedLanguages();
					const resolved = loaded.includes(lang?.toLowerCase()) ? lang.toLowerCase() : 'text';
					const html = highlighter.codeToHtml(code, { lang: resolved, theme: 'night-owl' });
					// Escape { and } so Svelte doesn't treat them as template expressions
					return html.replace(/\{/g, '&#123;').replace(/\}/g, '&#125;');
				}
			}
		})
	],
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
