import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkFrontmatter from 'remark-frontmatter';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import rehypeExternalLinks from 'rehype-external-links';
import rehypeStringify from 'rehype-stringify';
import rehypeMermaid from 'rehype-mermaid';
import matter from 'gray-matter';
import { rehypeLinksToVideo } from '$lib/utils/rehype-plugins/links-to-video';
import { rehypeLinksToImage } from '$lib/utils/rehype-plugins/links-to-image';

type Fetch = {
	(input: URL | RequestInfo, init?: RequestInit): Promise<Response>;
	(input: string | URL | Request, init?: RequestInit): Promise<Response>;
};

export async function markdownToHtml(url: string, fetch: Fetch, setHeaders: any): Promise<any> {
	const { status, text, etag } = await fetchMarkdown(url, fetch);
	if (status === 304) {
		return { html: '', frontmatter: {}, notModified: true };
	}

	// Parse frontmatter & content
	const { content, data: frontmatter } = matter(text!);

	// Extract base URL for resolving relative paths
	const baseUrl = url.substring(0, url.lastIndexOf('/') + 1);
	console.log('[markdown-to-html] Base URL for image resolution:', baseUrl);

	// Build HTML with a unified pipeline
	const file = await unified()
		.use(remarkParse)
		.use(remarkGfm)
		.use(remarkFrontmatter, ['yaml'])
		.use(remarkRehype, { allowDangerousHtml: true })
		.use(rehypeRaw) // Parse raw HTML nodes into proper HTML elements
		.use(rehypeMermaid, { strategy: 'pre-mermaid' })
		.use(rehypeSlug)
		.use(rehypeLinksToImage, { baseUrl })
		.use(rehypeLinksToVideo)
		.use(rehypeExternalLinks, { target: '_blank', rel: ['noopener', 'noreferrer'] })
		.use(rehypeStringify, { allowDangerousHtml: true })
		.process(content);

	const html = String(file);
	console.log('[markdown-to-html] Processed HTML length:', html.length);

	// Log a snippet of the HTML to see img tags
	const imgMatches = html.match(/<img[^>]*>/g);
	if (imgMatches) {
		console.log('[markdown-to-html] Found img tags:', imgMatches.length);
		imgMatches.forEach((img, i) => console.log(`  [${i}]:`, img));
	}

	if (etag) {
		setHeaders({ 'Cache-Control': 's-maxage=300, stale-while-revalidate=600' });
	}

	return { html, frontmatter };
}

async function fetchMarkdown(url: string, fetch: Fetch, etag?: string) {
	const response = await fetch(url, {
		headers: {
			...(etag ? { 'If-None-Match': etag } : {})
		}
	});
	if (response.status === 304) {
		return { status: 304 as const };
	}

	if (!response.ok) {
		throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
	}

	console.log('[markdown-to-html] Fetched markdown successfully:', url);
	return {
		status: 200 as const,
		text: await response.text(),
		etag: response.headers.get('etag') ?? undefined
	};
}
