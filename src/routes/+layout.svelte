<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { resolve } from '$app/paths';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Ecson — ECS-driven realtime server framework for Rust</title>
</svelte:head>

<div class="flex min-h-screen flex-col">
	<header
		class="sticky top-0 z-50 border-b border-[#1e3a5f] bg-[#011627]/90 backdrop-blur-sm"
	>
		<nav class="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
			<a href={resolve("/")} class="flex items-center gap-2 text-lg font-bold tracking-wide">
				<span class="font-mono text-[#21c7a8]">▶</span>
				<span class="text-[#d6deeb]">ecson</span>
			</a>

			<div class="flex items-center gap-1 text-sm">
				<a
					href={resolve("/introduction")}
					class="rounded px-3 py-1.5 text-[#8baabe] transition-colors hover:bg-[#0a1f35] hover:text-[#d6deeb]"
				>
					Get Started
				</a>
				<a
					href={resolve("/tutorial")}
					class="rounded px-3 py-1.5 text-[#8baabe] transition-colors hover:bg-[#0a1f35] hover:text-[#d6deeb]"
				>
					Tutorials
				</a>
				<a
					href="https://docs.rs/ecson"
					target="_blank"
					rel="noopener"
					class="rounded px-3 py-1.5 text-[#8baabe] transition-colors hover:bg-[#0a1f35] hover:text-[#d6deeb]"
				>
					API Docs ↗
				</a>
				<a
					href="https://github.com/ecson-rs/ecson"
					target="_blank"
					rel="noopener"
					class="ml-2 rounded border border-[#1e3a5f] px-3 py-1.5 text-[#8baabe] transition-colors hover:border-[#82aaff] hover:text-[#82aaff]"
				>
					GitHub
				</a>
			</div>
		</nav>
	</header>

	<main class="flex-1">
		{@render children()}
	</main>

	<footer class="border-t border-[#1e3a5f] px-6 py-8 text-center text-xs text-[#5f7e97]">
		<p>Built with ❤ in Rust · MIT License · &copy; 2024 Ecson Contributors</p>
	</footer>
</div>
