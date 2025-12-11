<!-- src/routes/articles/[slug]/+page.svelte -->
<script lang="ts">
	import { base } from '$app/paths';
	import ArticlePreviewCard from '$lib/components/article-preview-card/article-preview-card.svelte';
	import type { ArticleMetadata } from '$lib/types/article';
	export let data: { html: string; frontmatter: any; articleMetadata: ArticleMetadata[] };

	function getLink(metadata: ArticleMetadata) {
		return `${base}/research/articles/${metadata.path}`;
	}
</script>

<div>
	<div class="article-container">
		<div class="article-wrapper">
			<article class="prose prose-lg max-w-none">
				{@html data.html}
			</article>
		</div>
	</div>
</div>

<div class="cards-container">
	<div class="cards-grid">
		{#each data.articleMetadata.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) as metadata}
			{#if !metadata.hidden}
				<ArticlePreviewCard
					title={metadata.title}
					description={metadata.description}
					date={metadata.date}
					link={getLink(metadata)}
				/>
			{/if}
		{/each}
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

	.cards-container {
		width: 100%;
		padding: 1rem 1rem 2rem;
	}

	.cards-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1.5rem;
		max-width: 1400px;
		margin: 0 auto;
	}

	/* Responsive adjustments */
	@media (min-width: 640px) {
		.cards-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (min-width: 1024px) {
		.article-wrapper {
			max-width: 56rem; /* 896px - wider on desktop */
		}

		.cards-container {
			padding: 1.5rem 2rem 3rem;
		}

		.cards-grid {
			grid-template-columns: repeat(3, 1fr);
			gap: 2rem;
		}
	}
</style>
