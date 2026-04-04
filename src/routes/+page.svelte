<script lang="ts">
  import { resolve } from '$app/paths';
	const features = [
		{
			icon: '⚡',
			title: 'ハイパフォーマンス',
			desc: 'ECSアーキテクチャにより、並列処理と効率的なデータアクセスを実現。スレッドを最大限に活用します。',
			accent: '#82aaff'
		},
		{
			icon: '🔌',
			title: 'リアルタイム通信',
			desc: 'WebSocketを活用した双方向通信を、シンプルなAPIで構築できます。低レイテンシが求められる場面で真価を発揮。',
			accent: '#21c7a8'
		},
		{
			icon: '🦀',
			title: 'Rustネイティブ',
			desc: 'Rustの型安全性と所有権システムを活かした安全なサーバー開発。メモリ安全性はコンパイル時に保証されます。',
			accent: '#ffbc42'
		}
	];
</script>

<!-- Hero -->
<section class="dot-bg relative flex min-h-[85vh] items-center justify-center overflow-hidden">
	<!-- Radial glow -->
	<div
		class="pointer-events-none absolute left-1/2 top-1/2 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#82aaff]/5 blur-3xl"
	></div>
	<!-- Top/bottom fade -->
	<div
		class="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#011627] via-transparent to-[#011627]"
	></div>

	<div class="relative z-10 mx-auto max-w-4xl px-6 text-center">
		<!-- Badge -->
		<div
			class="mb-6 inline-flex items-center gap-2 rounded-full border border-[#1e3a5f] bg-[#0a1f35] px-4 py-1.5 text-xs text-[#21c7a8]"
		>
			<span class="h-2 w-2 animate-pulse rounded-full bg-[#21c7a8]"></span>
			Rust &nbsp;·&nbsp; ECS &nbsp;·&nbsp; WebSocket
		</div>

		<h1 class="mb-4 text-7xl font-bold tracking-tight text-[#82aaff]">Ecson</h1>

		<p class="mb-3 text-xl leading-relaxed text-[#d6deeb]">
			ハイパフォーマンスなリアルタイムサーバーを構築しましょう。
		</p>
		<p class="mx-auto mb-10 max-w-2xl text-base leading-relaxed text-[#5f7e97]">
			EcsonはRust向けのフレームワークで、簡単にECS駆動な双方向通信サーバーを構築することができます。
		</p>

		<!-- CTAs -->
		<div class="flex flex-wrap justify-center gap-4">
			<a
				href={resolve("/introduction")}
				class="rounded bg-[#82aaff] px-6 py-3 text-sm font-bold text-[#011627] transition-colors hover:bg-[#9bb9ff]"
			>
				Get Started →
			</a>
			<a
				href={resolve("/tutorial")}
				class="rounded border border-[#1e3a5f] px-6 py-3 text-sm text-[#d6deeb] transition-colors hover:border-[#82aaff] hover:text-[#82aaff]"
			>
				Browse Tutorials
			</a>
			<a
				href="https://docs.rs/ecson"
				target="_blank"
				rel="noopener"
				class="px-6 py-3 text-sm text-[#5f7e97] transition-colors hover:text-[#d6deeb]"
			>
				API Docs ↗
			</a>
		</div>

		<!-- Code snippet -->
<div class="mx-auto mt-16 max-w-2xl rounded-lg border border-[#1e3a5f] bg-[#010e1a] text-left">
  <div class="flex items-center gap-2 border-b border-[#1e3a5f] px-4 py-3">
    <span class="h-3 w-3 rounded-full bg-[#ef5350]"></span>
    <span class="h-3 w-3 rounded-full bg-[#ffbc42]"></span>
    <span class="h-3 w-3 rounded-full bg-[#22da6e]"></span>
    <span class="ml-2 text-xs text-[#5f7e97]">src/main.rs</span>
  </div>

  <pre class="overflow-x-auto px-6 py-5 text-sm leading-6"><code><span class="text-[#57a4ea]">use</span><span class="text-[#50ccb8]"> ecson</span>::<span class="text-[#50ccb8]">prelude</span><span class="text-[#d6deeb]">::*;</span>

<span class="text-[#57a4ea]">fn</span> <span class="text-[#efd085]">echo_system</span><span class="text-[#fd71b8]">(</span>
    <span class="text-[#57a4ea]">mut</span> <span class="text-[#9cdcfe]">messages</span>: <span class="text-[#50ccb8]">MessageReader</span><span class="text-[#d6deeb]">&lt;</span><span class="text-[#50ccb8]">MessageReceived</span><span class="text-[#d6deeb]">&gt;,</span>
    <span class="text-[#57a4ea]">mut</span> <span class="text-[#9cdcfe]">outbound</span>: <span class="text-[#50ccb8]">MessageWriter</span><span class="text-[#d6deeb]">&lt;</span><span class="text-[#50ccb8]">SendMessage</span><span class="text-[#d6deeb]">&gt;,</span>
<span class="text-[#fd71b8]">)</span> <span class="text-[#fd71b8]">&#123;</span>
    <span class="text-[#fd71b8]">for</span> <span class="text-[#d6deeb]">message</span> <span class="text-[#fd71b8]">in</span> <span class="text-[#d6deeb]">messages.</span><span class="text-[#efd085]">read</span><span class="text-[#15b9ff]">(</span><span class="text-[#15b9ff]">)</span> <span class="text-[#fd71b8]">&#123;</span>
        <span class="text-[#9cdcfe]">outbound.</span><span class="text-[#efd085]">write</span><span class="text-[#15b9ff]">(</span><span class="text-[#50ccb8]">SendMessage</span> <span class="text-[#fd71b8]">&#123;</span>
            <span class="text-[#9cdcfe]">target<span class="text-[#d6deeb]">: </span>message<span class="text-[#d6deeb]">.</span>entity<span class="text-[#d6deeb]">,</span></span>
            <span class="text-[#9cdcfe]">payload<span class="text-[#d6deeb]">: </span>message<span class="text-[#d6deeb]">.</span>payload<span class="text-[#d6deeb]">.</span></span><span class="text-[#efd085]">clone</span><span class="text-[#15b9ff]">(</span><span class="text-[#15b9ff]">)</span><span class="text-[#d6deeb]">,</span>
        <span class="text-[#fd71b8]">&#125;</span><span class="text-[#15b9ff]">)</span><span class="text-[#d6deeb]">;</span>
    <span class="text-[#fd71b8]">&#125;</span>
<span class="text-[#fd71b8]">&#125;</span>

<span class="text-[#57a4ea]">fn</span> <span class="text-[#efd085]">main</span><span class="text-[#fd71b8]">() &#123;</span>
    <span class="text-[#50ccb8]">EcsonApp</span><span class="text-[#FFFFFF]">::</span><span class="text-[#efd085]">new</span><span class="text-[#fd71b8]">()</span>
        <span class="text-[#d6deeb]">.</span><span class="text-[#efd085]">add_plugin</span><span class="text-[#d6deeb]"><span class="text-[#fd71b8]">(</span><span class="text-[#50ccb8]">EcsonWebSocketPlugin</span>::<span class="text-[#efd085]">new</span><span class="text-[#15b9ff]">(</span><span class="text-[#e29945]">"127.0.0.1:8080"</span><span class="text-[#15b9ff]">)</span><span class="text-[#fd71b8]">)</span></span>
        <span class="text-[#d6deeb]">.</span><span class="text-[#efd085]">add_system</span><span class="text-[#d6deeb]"><span class="text-[#fd71b8]">(</span><span class="text-[#50ccb8]">Update</span>, <span class="text-[#efd085]">echo_system</span><span class="text-[#fd71b8]">)</span></span>
        <span class="text-[#d6deeb]">.</span><span class="text-[#efd085]">run</span><span class="text-[#fd71b8]">()</span>;
<span class="text-[#d6deeb]">&#125;</span></code></pre>
</div>
</section>

<!-- Features -->
<section class="mx-auto max-w-6xl px-6 py-24">
	<h2 class="mb-2 text-center text-xs font-bold uppercase tracking-widest text-[#21c7a8]">
		Features
	</h2>
	<p class="mb-12 text-center text-2xl font-bold text-[#d6deeb]">なぜ Ecson？</p>

	<div class="grid grid-cols-1 gap-6 md:grid-cols-3">
		{#each features as feature (feature)}
			<div
				class="group rounded-lg border border-[#1e3a5f] bg-[#0a1f35] p-6 transition-colors hover:border-[#82aaff]/50"
			>
				<div class="mb-4 text-3xl">{feature.icon}</div>
				<h3 class="mb-2 font-bold" style="color: {feature.accent}">{feature.title}</h3>
				<p class="text-sm leading-relaxed text-[#5f7e97]">{feature.desc}</p>
			</div>
		{/each}
	</div>
</section>

<!-- Quick start CTA -->
<section class="border-t border-[#1e3a5f] py-20 text-center">
	<p class="mb-2 text-sm text-[#5f7e97]">さっそく始めましょう</p>
	<div
		class="mx-auto mb-6 max-w-sm rounded-lg border border-[#1e3a5f] bg-[#010e1a] px-6 py-3 font-mono text-sm text-[#22da6e]"
	>
		$ cargo add ecson
	</div>
	<a
		href={resolve("/quick-start")}
		class="text-sm text-[#82aaff] underline underline-offset-4 hover:text-[#9bb9ff]"
	>
		クイックスタートを見る →
	</a>
</section>
