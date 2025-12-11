import { visit } from 'unist-util-visit';

/**
 * Configuration options for the rehype links-to-image plugin.
 */
interface RehypeLinksToImageOptions {
	/**
	 * Base URL used to resolve relative image paths.
	 * If not provided, relative paths will remain unchanged.
	 */
	baseUrl?: string;

	/**
	 * Enable debug logging for image processing.
	 * @default false
	 */
	debug?: boolean;
}

/**
 * AST element node type for rehype.
 */
interface ElementNode {
	type: string;
	tagName: string;
	properties?: Record<string, any>;
	children?: any[];
}

/**
 * Supported image file extensions.
 */
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif'] as const;

/**
 * CSS classes for image styling.
 */
const IMAGE_CLASSES = {
	img: ['w-full'],
	figure: ['my-2', 'space-y-2'],
	figcaption: ['text-sm', 'text-muted-foreground']
} as const;

/**
 * Resolves a potentially relative URL to an absolute URL using a base URL.
 * Returns the original URL if it's already absolute, a data URI, or if no base URL is provided.
 *
 * @param url - The URL to resolve (can be relative or absolute)
 * @param baseUrl - The base URL to resolve against
 * @returns The resolved absolute URL, or the original URL if resolution fails
 */
function resolveUrl(url: string, baseUrl?: string): string {
	if (!baseUrl || isAbsoluteUrl(url)) {
		return url;
	}

	try {
		return new URL(url, new URL(baseUrl)).href;
	} catch {
		return url;
	}
}

/**
 * Checks if a URL is absolute (http/https) or a data URI.
 *
 * @param url - The URL to check
 * @returns True if the URL is absolute or a data URI
 */
function isAbsoluteUrl(url: string): boolean {
	return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:');
}

/**
 * Checks if a URL points to an image file based on its extension.
 *
 * @param url - The URL to check
 * @returns True if the URL has a supported image extension
 */
function isImageUrl(url: string): boolean {
	const pattern = new RegExp(`\\.(${IMAGE_EXTENSIONS.join('|')})(\\?.*)?$`, 'i');
	return pattern.test(url);
}

/**
 * Checks if an element is standalone (only child in a paragraph).
 *
 * @param parent - The parent element node
 * @returns True if the element is the only child in a paragraph
 */
function isStandaloneInParagraph(parent: ElementNode): boolean {
	return parent.tagName === 'p' && parent.children?.length === 1;
}

/**
 * Extracts text content from a node's children.
 *
 * @param node - The element node
 * @returns The text content, or empty string if no text found
 */
function extractTextContent(node: ElementNode): string {
	const firstChild = node.children?.[0];
	return firstChild?.type === 'text' ? firstChild.value : '';
}

/**
 * Creates an image element node.
 *
 * @param src - The image source URL
 * @param alt - The alt text for the image
 * @param additionalClasses - Additional CSS classes to apply
 * @returns An image element node
 */
function createImageElement(
	src: string,
	alt: string,
	additionalClasses: string[] = []
): ElementNode {
	return {
		type: 'element',
		tagName: 'img',
		properties: {
			src,
			alt,
			className: [...IMAGE_CLASSES.img, ...additionalClasses],
			loading: 'lazy'
		},
		children: []
	};
}

/**
 * Creates a figcaption element node.
 *
 * @param caption - The caption text
 * @returns A figcaption element node
 */
function createFigcaptionElement(caption: string): ElementNode {
	return {
		type: 'element',
		tagName: 'figcaption',
		properties: {
			className: [...IMAGE_CLASSES.figcaption]
		},
		children: [{ type: 'text', value: caption }]
	};
}

/**
 * Creates a figure element node containing an image and optional caption.
 *
 * @param imgElement - The image element to wrap
 * @param caption - Optional caption text
 * @returns A figure element node
 */
function createFigureElement(imgElement: ElementNode, caption?: string): ElementNode {
	const children: ElementNode[] = [imgElement];

	if (caption) {
		children.push(createFigcaptionElement(caption));
	}

	return {
		type: 'element',
		tagName: 'figure',
		properties: { className: [...IMAGE_CLASSES.figure] },
		children
	};
}

/**
 * Processes anchor links that point to images and converts them to img or figure elements.
 *
 * @param node - The anchor element node
 * @param index - The index of the node in its parent's children
 * @param parent - The parent element node
 * @param baseUrl - Optional base URL for resolving relative paths
 * @param debug - Whether to log debug information
 */
function processImageLink(
	node: ElementNode,
	index: number,
	parent: ElementNode,
	baseUrl?: string,
	debug = false
): void {
	const href = node.properties?.href as string | undefined;

	if (!href || !isImageUrl(href)) {
		return;
	}

	const resolvedHref = resolveUrl(href, baseUrl);
	const caption = extractTextContent(node);
	const isStandalone = isStandaloneInParagraph(parent);

	if (debug) {
		console.log('[rehypeLinksToImage] Link to image:', href, '→', resolvedHref);
	}

	const imgElement = createImageElement(resolvedHref, caption);

	if (isStandalone) {
		const figureElement = createFigureElement(imgElement, caption);
		parent.tagName = figureElement.tagName;
		parent.properties = figureElement.properties;
		parent.children = figureElement.children;
	} else {
		parent.children![index] = imgElement;
	}
}

/**
 * Processes existing img elements in HTML, resolving relative URLs and optionally wrapping in figures.
 *
 * @param node - The img element node
 * @param index - The index of the node in its parent's children
 * @param parent - The parent element node
 * @param baseUrl - Optional base URL for resolving relative paths
 * @param debug - Whether to log debug information
 */
function processImageElement(
	node: ElementNode,
	index: number,
	parent: ElementNode,
	baseUrl?: string,
	debug = false
): void {
	const src = node.properties?.src as string | undefined;

	if (!src) {
		return;
	}

	const resolvedSrc = resolveUrl(src, baseUrl);
	node.properties!.src = resolvedSrc;

	if (debug) {
		console.log('[rehypeLinksToImage] Image element:', src, '→', resolvedSrc);
	}

	if (parent.tagName === 'figure') {
		return;
	}

	const isStandalone = isStandaloneInParagraph(parent);

	if (!isStandalone) {
		if (!node.properties!.loading) {
			node.properties!.loading = 'lazy';
		}
		return;
	}

	const existingClasses = node.properties?.className || [];
	const enhancedImgElement: ElementNode = {
		...node,
		properties: {
			...node.properties,
			src: resolvedSrc,
			className: [...existingClasses, ...IMAGE_CLASSES.img],
			loading: node.properties?.loading || 'lazy'
		}
	};

	const alt = node.properties?.alt as string | undefined;
	const figureElement = createFigureElement(enhancedImgElement, alt);

	parent.tagName = figureElement.tagName;
	parent.properties = figureElement.properties;
	parent.children = figureElement.children;
}

/**
 * Rehype plugin that transforms image links and resolves relative image URLs.
 *
 * This plugin performs two main transformations:
 * 1. Converts anchor links pointing to images into img or figure elements
 * 2. Resolves relative URLs in img elements to absolute URLs using the provided base URL
 *
 * Standalone images (only child in a paragraph) are wrapped in figure elements with optional captions.
 *
 * @param options - Configuration options
 * @returns A rehype transformer function
 *
 * @example
 * ```typescript
 * unified()
 *   .use(rehypeLinksToImage, {
 *     baseUrl: 'https://example.com/articles/my-article/'
 *   })
 * ```
 */
export function rehypeLinksToImage(options: RehypeLinksToImageOptions = {}) {
	const { baseUrl, debug = false } = options;

	return (tree: any) => {
		visit(tree, 'element', (node: any, index: number | undefined, parent: any) => {
			if (!parent || typeof index !== 'number') {
				return;
			}

			if (node.tagName === 'a') {
				processImageLink(node, index, parent, baseUrl, debug);
			} else if (node.tagName === 'img') {
				processImageElement(node, index, parent, baseUrl, debug);
			}
		});
	};
}
