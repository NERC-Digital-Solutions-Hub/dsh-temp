import type { ArticleMetadata } from '$lib/types/article';

/**
 * Service to index and retrieve research article metadata.
 */
class ResearchArticleIndexer {
	#isInitialized: boolean = false;
	#articleIndex: string[] = [];
	#articleMetadata: ArticleMetadata[] = [];

	#slugToMetadata: Map<string, ArticleMetadata> = new Map();

	/**
	 * Initializes the indexer by fetching the article index and loading metadata.
	 * @param baseUrl The base URL where the article index.txt is located.
	 * @param indexUrl The URL to the index.txt
	 * @returns void
	 */
	public async initialize(baseUrl: string, indexUrl: string): Promise<void> {
		if (this.#isInitialized) {
			return;
		}

		this.#articleIndex = await this.#fetchArticleIndex(indexUrl);
		this.#articleMetadata = await this.#loadArticleMetadata(baseUrl, this.#articleIndex);

		this.#isInitialized = true;
	}

	/**
	 * Gets the metadata for a given article slug.
	 * @param slug The slug of the article.
	 * @returns The metadata for the slug.
	 */
	getMetadataBySlug(slug: string): ArticleMetadata | undefined {
		return this.#slugToMetadata.get(slug);
	}

	/**
	 * Gets all article metadata instances.
	 * @returns The article metadata instances.
	 */
	getAllMetadata(): ArticleMetadata[] {
		return this.#articleMetadata;
	}

	async #fetchArticleIndex(indexUrl: string): Promise<string[]> {
		const res = await fetch(indexUrl);
		if (!res.ok) {
			throw new Error(`Failed to fetch article index: ${res.status} ${res.statusText}`);
		}

		const text: string = await res.text();
		console.log('Fetched article index text:', text);
		return text
			.split('\n')
			.map((line) => line.trim())
			.filter((line) => line.length > 0);
	}

	async #loadArticleMetadata(indexUrl: string, articleIndex: string[]): Promise<ArticleMetadata[]> {
		return await Promise.all(
			articleIndex.map(async (path) => {
				const response = await fetch(`${indexUrl}/${path}`);
				if (!response.ok) {
					throw new Error(`Download failed for ${path}`);
				}

				const metadata = await response.json();
				metadata.path = path.split('/')[0]; // slug is directory name.

				console.log('Fetched article metadata:', metadata);
				this.#slugToMetadata.set(metadata.path, metadata);

				return metadata;
			})
		);
	}
}

export const researchArticleIndexer = new ResearchArticleIndexer();
