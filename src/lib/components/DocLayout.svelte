<script lang="ts">
	import type { Snippet } from 'svelte';

	interface NavItem {
		label: string;
		href: string;
	}

	interface NavGroup {
		title: string;
		items: NavItem[];
	}

	interface Props {
		title: string;
		description?: string;
		children: Snippet;
	}

	let { title, description, children }: Props = $props();

	const navGroups: NavGroup[] = [
		{
			title: 'Getting Started',
			items: [
				{ label: 'インストール', href: '/installation' },
				{ label: 'Tutorials', href: '/tutorials' }
			]
		},
		{
			title: 'Core Concepts',
			items: [
				{ label: 'ECS の基本', href: '/docs/ecs' },
				{ label: 'Plugin システム', href: '/docs/plugins' },
				{ label: 'System スケジューリング', href: '/docs/systems' }
			]
		},
		{
			title: 'Networking',
			items: [
				{ label: 'WebSocket', href: '/docs/websocket' },
				{ label: 'イベント送受信', href: '/docs/events' },
				{ label: 'コネクション管理', href: '/docs/connections' }
			]
		}
	];
</script>

<div class="mx-auto flex max-w-7xl gap-0">
	<!-- Sidebar -->
	<aside
		class="sticky top-[57px] hidden h-[calc(100vh-57px)] w-64 shrink-0 overflow-y-auto border-r border-[#1e3a5f] px-4 py-8 lg:block"
	>
		{#each navGroups as group}
			<div class="mb-6">
				<p class="mb-2 px-3 text-xs font-bold uppercase tracking-widest text-[#5f7e97]">
					{group.title}
				</p>
				<ul>
					{#each group.items as item}
						<li>
							<a
								href={item.href}
								class="block rounded px-3 py-1.5 text-sm text-[#8baabe] transition-colors hover:bg-[#0a1f35] hover:text-[#d6deeb]"
							>
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
		<div class="mx-auto max-w-3xl">
			<!-- Page header -->
			<div class="mb-10 border-b border-[#1e3a5f] pb-8">
				<h1 class="text-3xl font-bold text-[#d6deeb]">{title}</h1>
				{#if description}
					<p class="mt-3 text-[#8baabe]">{description}</p>
				{/if}
			</div>

			<!-- Page content -->
			<div class="doc-prose">
				{@render children()}
			</div>
		</div>
	</div>
</div>
