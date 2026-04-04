<script lang="ts">
	import { page } from '$app/stores';

	let { children } = $props();

	const navGroups = [
		{
			title: 'Getting Started',
			items: [
				{ label: 'Introduction', href: '/introduction' },
				{ label: 'ECS Primer', href: '/ecs-primer' },
				{ label: 'Quick Start', href: '/quick-start' },
			]
		},
		{
			title: 'Guides',
			items: [{ label: 'Tutorial', href: '/tutorial' }]
		},
		{
			title: 'Core Concepts',
			items: [
				{ label: 'Core Concepts', href: '/core-concept' },
				{ label: 'Components', href: '/components' },
				{ label: 'Events', href: '/events' },
				{ label: 'Resources', href: '/resources' },
				{ label: 'Plugins', href: '/plugins' },
				{ label: 'Networking', href: '/networking' }
			]
		},
		{
			title: 'Reference',
			items: [
				{ label: 'Examples', href: '/examples' },
				{ label: 'API Reference', href: '/api-reference' },
				{ label: 'Changelog', href: '/changelog' },
				{ label: 'Contributing', href: '/contributing' }
			]
		}
	];

	let currentPath = $derived($page.url.pathname);
</script>

<div class="mx-auto flex max-w-7xl gap-0">
	<!-- Sidebar -->
	<aside
		class="sticky top-[57px] hidden h-[calc(100vh-57px)] w-60 shrink-0 overflow-y-auto border-r border-[#1e3a5f] px-3 py-8 lg:block"
	>
		{#each navGroups as group (group)}
			<div class="mb-5">
				<p class="mb-1.5 px-3 text-xs font-bold uppercase tracking-widest text-[#5f7e97]">
					{group.title}
				</p>
				<ul>
					{#each group.items as item (item)}
						{@const isActive = currentPath === item.href}
						<li>
							<a
								href={item.href}
								class="flex items-center rounded px-3 py-1.5 text-sm transition-colors {isActive
									? 'bg-[#0a1f35] font-semibold text-[#82aaff]'
									: 'text-[#8baabe] hover:bg-[#0a1f35] hover:text-[#d6deeb]'}"
							>
								{#if isActive}
									<span class="mr-1.5 text-xs text-[#21c7a8]">▸</span>
								{/if}
								{item.label}
							</a>
						</li>
					{/each}
				</ul>
			</div>
		{/each}
	</aside>

	<!-- Content -->
	<div class="min-w-0 flex-1 px-8 py-12 lg:px-16">
		<div class="doc-prose mx-auto max-w-3xl">
			{@render children()}
		</div>
	</div>
</div>
