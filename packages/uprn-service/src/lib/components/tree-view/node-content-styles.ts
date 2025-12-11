/**
 * Shared styling utilities for node content components.
 */

/**
 * Base node styling that all node components share.
 * Provides basic layout and border styling.
 */
export const baseNodeStyles = 'mb-1 cursor-pointer rounded-md border border-border p-2 text-left';

/**
 * Enhanced hover effects with smooth transitions.
 * Adds transform and shadow effects on hover.
 */
export const enhancedHoverStyles =
	'transition-all duration-150 hover:border-border/50 hover:bg-gray-100 hover:shadow-sm';

/**
 * Simple hover effect that only changes background color.
 */
export const simpleHoverStyles = 'transition-colors hover:bg-blue-500';

/**
 * Font styling for text content.
 * Sets font size and weight.
 */
export const fontStyles = 'text-sm font-normal';

/**
 * Default background styling.
 */
export const defaultBgStyles = 'bg-card';

/**
 * Accent background styling for pressed/selected states.
 */
export const accentBgStyles = 'bg-accent text-accent-foreground';

/**
 * Toggle-specific styles for area-selection components.
 * Overrides default toggle behavior to match node styling.
 */
export const toggleSpecificStyles =
	'!h-auto !min-h-9 !whitespace-normal data-[state=on]:!bg-accent data-[state=on]:!text-accent-foreground data-[state=on]:hover:!bg-accent data-[state=on]:hover:!text-accent-foreground';

/**
 * Configuration options for node styling.
 */
export interface NodeStyleOptions {
	/** Whether to use enhanced hover effects. */
	enhancedHover?: boolean;
	/** Whether to include font styling. */
	includeFont?: boolean;
	/** Whether the node is in a pressed/selected state. */
	pressed?: boolean;
}

/**
 * Generates complete node styles based on configuration options.
 * Combines base styles with hover effects, font styles, and background states.
 * @param options - Configuration options for styling.
 * @returns A string of CSS classes for the node.
 */
export function getNodeStyles(options: NodeStyleOptions = {}): string {
	const { enhancedHover = false, includeFont = false, pressed = false } = options;

	let styles = baseNodeStyles;

	// Add hover effects
	if (enhancedHover) {
		styles += ' ' + enhancedHoverStyles;
	} else {
		styles += ' ' + simpleHoverStyles;
	}

	// Add font styling if requested
	if (includeFont) {
		styles += ' ' + fontStyles;
	}

	// Add background state
	if (pressed) {
		styles += ' ' + accentBgStyles;
	} else {
		styles += ' ' + defaultBgStyles;
	}

	return styles;
}
