import { visit } from 'unist-util-visit';

export function rehypeLinksToVideo() {
	return (tree: any) => {
		visit(tree, 'element', (node: any, index: number | undefined, parent: any) => {
			if (!parent || typeof index !== 'number' || node.tagName !== 'a') return;

			const href = node.properties?.href as string | undefined;
			if (!href) return;

			const isVideo = /\.(mp4|webm|ogv?|ogg)(\?.*)?$/i.test(href);
			if (!isVideo) return;

			// Only transform if the link stands alone in a paragraph (common in Markdown)
			const isStandalone = parent.tagName === 'p' && parent.children?.length === 1;

			const caption = node.children?.[0]?.type === 'text' ? node.children[0].value : '';

			const videoEl = {
				type: 'element',
				tagName: 'video',
				properties: {
					controls: true,
					preload: 'metadata',
					playsinline: true,
					className: ['w-full', 'rounded-lg', 'border', 'bg-black'],
					src: href
				},
				children: [
					{
						type: 'text',
						value: `Sorry, your browser doesn’t support embedded videos. (Download: ${href})`
					}
				]
			};

			const figureEl = {
				type: 'element',
				tagName: 'figure',
				properties: { className: ['my-6', 'space-y-2'] },
				children: [
					videoEl,
					...(caption
						? [
								{
									type: 'element',
									tagName: 'figcaption',
									properties: {
										className: ['text-sm', 'text-muted-foreground']
									},
									children: [{ type: 'text', value: caption }]
								}
							]
						: [])
				]
			};

			if (isStandalone) {
				parent.tagName = 'figure';
				parent.properties = figureEl.properties;
				parent.children = figureEl.children;
			} else {
				parent.children[index] = videoEl;
			}
		});
	};
}
