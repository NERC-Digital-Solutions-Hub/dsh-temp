<!-- src/routes/articles/[slug]/+page.svelte -->
<script lang="ts">
	import mermaid from 'mermaid';
	import { onMount } from 'svelte';

	export let data: { html: string; frontmatter: any };

	onMount(() => {
		mermaid.initialize({ startOnLoad: true });
		mermaid.run();
	});
</script>

<svelte:head>
	<title>{data?.frontmatter?.title ?? 'Article'}</title>
	{#if data?.frontmatter?.description}
		<meta name="description" content={data?.frontmatter?.description} />
	{/if}
</svelte:head>

<div>
	<div class="article-container">
		<div class="article-wrapper">
			<article class="prose prose-lg max-w-none">
				{@html data.html}
			</article>
		</div>
	</div>
</div>

<style>
	.article-container {
		width: 100%;
		height: 100%;
		display: flex;
		justify-content: center;
		padding: 1rem 1rem;
	}

	.article-wrapper {
		width: 100%;
		max-width: 48rem; /* 768px */
		display: flex;
		justify-content: center;
	}

	.article-wrapper article {
		width: 100%;
	}

	@media (min-width: 1024px) {
		.article-wrapper {
			max-width: 56rem; /* 896px - wider on desktop */
		}
	}
</style>
