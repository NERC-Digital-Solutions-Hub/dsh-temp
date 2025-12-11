<script lang="ts">
	import ResearchPage from '$lib/components/research-page.svelte';
	import type { ArticleMetadata } from '$lib/types/article';
	export let data: { html: string; frontmatter: any; articleMetadata: ArticleMetadata[] };
</script>

<ResearchPage {data} />
