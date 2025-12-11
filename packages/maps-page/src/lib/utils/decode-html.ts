export function decodeHtmlEntities(s: string): string {
	return s
		.replace(/&deg;/gi, '°')
		.replace(/&nbsp;/gi, ' ')
		.replace(/&amp;/gi, '&')
		.replace(/&lt;/gi, '<')
		.replace(/&gt;/gi, '>');
}

export function cleanHtmlText(value?: string | null): string | undefined {
	if (!value) {
		return undefined;
	}

	const decoded = decodeHtmlEntities(value);
	const withoutTags = decoded.replace(/<[^>]*>/g, ' ');
	const normalized = withoutTags.replace(/\s+/g, ' ').trim();

	return normalized || undefined;
}
