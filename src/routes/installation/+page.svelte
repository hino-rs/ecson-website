<script lang="ts">
	import DocLayout from '$lib/components/DocLayout.svelte';
	import { resolve } from '$app/paths';

	interface FeatureFlag {
		flag: string;
		desc: string;
		enabled: string;
	}

	const featureFlags: FeatureFlag[] = [
		{ flag: 'websocket', desc: 'WebSocketサポート', enabled: '✓ 有効' },
		{ flag: 'tls', desc: 'TLS/SSL暗号化', enabled: '無効' },
		{ flag: 'tracing', desc: 'tracing crateとの統合', enabled: '無効' },
		{ flag: 'full', desc: '全機能を有効化', enabled: '無効' }
	];
</script>

<DocLayout
	title="インストール"
	description="Ecsonをプロジェクトに追加する方法を説明します。"
>
	<h2>前提条件</h2>
	<ul>
		<li>Rust 1.94 以降（<code>rustup</code> 経由でインストール推奨）</li>
		<li>Cargo（Rustに同梱）</li>
	</ul>

	<h2>インストール手順</h2>

	<div class="step-block">
		<div class="flex-1">
			<h3>cargo add で追加</h3>
			<p>Cargoを使ってEcsonを追加するのが最も簡単な方法です。</p>
			<pre><code>$ cargo add ecson</code></pre>
			<p>または <code>Cargo.toml</code> に直接記述することもできます。</p>
			<pre><code>[dependencies]
ecson = "0.1"</code></pre>
		</div>
	</div>

	<h2>Feature Flags</h2>
	<p>Ecsonはいくつかのオプション機能をfeature flagsで提供しています。</p>

	<div class="overflow-x-auto rounded-lg border border-[#1e3a5f]">
		<table class="w-full text-sm">
			<thead>
				<tr class="border-b border-[#1e3a5f] bg-[#0a1f35]">
					<th class="px-4 py-3 text-left font-bold text-[#d6deeb]">Flag</th>
					<th class="px-4 py-3 text-left font-bold text-[#d6deeb]">説明</th>
					<th class="px-4 py-3 text-left font-bold text-[#d6deeb]">デフォルト</th>
				</tr>
			</thead>
			<tbody>
				{#each featureFlags as row (row) }
					<tr class="border-b border-[#1e3a5f] last:border-0">
						<td class="px-4 py-3 font-mono text-[#82aaff]">{row.flag}</td>
						<td class="px-4 py-3 text-[#8baabe]">{row.desc}</td>
						<td class="px-4 py-3 text-[#5f7e97]">{row.enabled}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<h2>次のステップ</h2>
	<ul>
		<li><a href={resolve("/tutorial")}>チュートリアルを始める</a> — 実際にサーバーを構築してみましょう</li>
		<li>
			<a href="https://docs.rs/ecson" target="_blank" rel="noopener">API ドキュメント</a> — 詳細なAPIリファレンス
		</li>
	</ul>
</DocLayout>
