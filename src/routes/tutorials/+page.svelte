<script lang="ts">
	import DocLayout from '$lib/components/DocLayout.svelte';
  import { resolve } from '$app/paths';

	const tutorials = [
		{
			level: 'Beginner',
			levelColor: '#22da6e',
			title: 'Hello, Ecson!',
			desc: '最小構成のEcsonサーバーを構築し、WebSocketクライアントからメッセージを送受信してみましょう。',
			time: '15 min',
			href: '/tutorials/hello-ecson'
		},
		{
			level: 'Beginner',
			levelColor: '#22da6e',
			title: 'ECSの基本を理解する',
			desc: 'Entity・Component・Systemのコンセプトを実際のコードで確認しながら学びます。',
			time: '20 min',
			href: '/tutorials/ecs-basics'
		},
		{
			level: 'Intermediate',
			levelColor: '#82aaff',
			title: 'チャットサーバーを作る',
			desc: '複数クライアント間でリアルタイムにメッセージを配信するチャットサーバーを実装します。',
			time: '30 min',
			href: '/tutorials/chat-server'
		},
		{
			level: 'Intermediate',
			levelColor: '#82aaff',
			title: 'Pluginシステムを活用する',
			desc: 'カスタムPluginを作成し、コードを再利用可能なモジュールとして管理する方法を学びます。',
			time: '25 min',
			href: '/tutorials/plugins'
		},
		{
			level: 'Advanced',
			levelColor: '#ffbc42',
			title: 'マルチルームゲームサーバー',
			desc: 'ルーム管理、状態同期、スペクテーター機能を備えたゲームサーバーを構築します。',
			time: '60 min',
			href: '/tutorials/game-server'
		}
	];
</script>

<DocLayout title="Tutorials" description="ステップバイステップでEcsonを学びましょう。">
	<p>
		各チュートリアルは独立して読み進められます。初めての方は
		<strong style="color:#d6deeb">Hello, Ecson!</strong> から始めることをお勧めします。
	</p>

	<div class="not-prose mt-8 flex flex-col gap-4">
		{#each tutorials as tutorial (tutorial) }
			<a
				href={resolve(`${tutorial.href}`)}
				class="group block rounded-lg border border-[#1e3a5f] bg-[#0a1f35] p-5 transition-colors hover:border-[#82aaff]/60"
			>
				<div class="mb-2 flex items-center justify-between">
					<span
						class="rounded-full border px-2 py-0.5 text-xs font-bold"
						style="color: {tutorial.levelColor}; border-color: {tutorial.levelColor}40; background: {tutorial.levelColor}10"
					>
						{tutorial.level}
					</span>
					<span class="text-xs text-[#5f7e97]">{tutorial.time}</span>
				</div>
				<h3
					class="mb-1 font-bold text-[#d6deeb] transition-colors group-hover:text-[#82aaff]"
				>
					{tutorial.title}
				</h3>
				<p class="text-sm leading-relaxed text-[#5f7e97]">{tutorial.desc}</p>
			</a>
		{/each}
	</div>

	<h2>サンプルコード</h2>
	<p>
		より実践的なサンプルプロジェクトは
		<a href="https://github.com/ecson-rs/ecson/tree/main/examples">GitHub の examples ディレクトリ</a>
		にあります。
	</p>
</DocLayout>
