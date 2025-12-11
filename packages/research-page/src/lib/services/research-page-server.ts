import type { PageServerLoad } from './$types';
import { markdownToHtml } from '$lib/utils/markdown-to-html';
import type { ContentConfig } from '$lib/types/config';
import { base } from '$app/paths';
import { researchArticleIndexer } from '$lib/services/research-article-indexer';

let contentConfig: ContentConfig | null = null;

export const load: PageServerLoad = async ({ fetch, setHeaders }) => {
	const contentConfig = await getContentConfig(fetch);

	const mdUrl = `https://github.com/${contentConfig.content.organisation}/${contentConfig.content.repo}/raw/refs/heads/dev/${contentConfig.content.relativePath}/${contentConfig.content.research.dir}/${contentConfig.content.research.main}`;
	const baseUrl = `https://github.com/${contentConfig.content.organisation}/${contentConfig.content.repo}/raw/refs/heads/dev/${contentConfig.content.relativePath}/${contentConfig.content.research.dir}/${contentConfig.content.research.articles.dir}`;
	const indexUrl = `https://github.com/${contentConfig.content.organisation}/${contentConfig.content.repo}/raw/refs/heads/dev/${contentConfig.content.relativePath}/${contentConfig.content.research.dir}/${contentConfig.content.research.articles.dir}/${contentConfig.content.research.articles.index}`;
	await researchArticleIndexer.initialize(baseUrl, indexUrl);
	const articleMetadata = researchArticleIndexer.getAllMetadata();

	return {
		...(await markdownToHtml(mdUrl, fetch, setHeaders)),
		articleMetadata
	};
};

async function getContentConfig(fetch: any): Promise<ContentConfig> {
	if (contentConfig) {
		return contentConfig;
	}

	const res = await fetch(`${base}/config/content.json`);
	if (!res.ok) {
		throw new Error(`Failed to fetch content config: ${res.status} ${res.statusText}`);
	}

	contentConfig = (await res.json()) as ContentConfig;
	return contentConfig;
}
