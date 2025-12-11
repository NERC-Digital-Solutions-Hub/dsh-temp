<script lang="ts">
	import ArticlePage from '$lib/components/article-page.svelte';
	export let data: { html: string; frontmatter: any };
</script>

<ArticlePage {data} />
