export { default as ResearchPage } from '$lib/components/research-page.svelte';
export { default as ArticlePage } from '$lib/components/article-page.svelte';
export { load as researchPageLoad } from '$lib/services/research-page-server';
export { load as articlePageLoad } from '$lib/services/article-page-server';
export type { ArticleMetadata } from '$lib/types/article';
export type { ContentConfig } from '$lib/types/config';
