<script lang="ts">
	import { Toggle } from '$lib/components/shadcn/toggle/index.js';
	import OpenIndicator from '$lib/components/open-indicator/open-indicator.svelte';
	import {
		accentBgStyles,
		baseNodeStyles,
		defaultBgStyles,
		enhancedHoverStyles,
		fontStyles,
		toggleSpecificStyles
	} from '../node-content-styles.js';

	/**
	 * Props for the NodeContent component.
	 */
	type Props = {
		/** Whether the node can be toggled (for visibility). */
		isTogglable: boolean;
		/** Whether the node is currently pressed/selected. */
		pressed: boolean;
		/** The icon HTML/SVG to display. */
		icon: string;
		/** The display name of the node. */
		name: string;
		/** The depth level for indentation. */
		depth: number;
		/** Click handler function. */
		onclick: () => void;
		/** Additional children to render (e.g., checkboxes). */
		children?: any;
		/** Whether the node is open (for folders). */
		isOpen: boolean;
	};

	/** Destructured props. */
	const { isTogglable, pressed, icon, name, depth, onclick, children, isOpen }: Props = $props();

	/** Calculate width to account for indentation. */
	const widthCalc = `calc(100% - ${depth * 1}rem)`;

	/** Combined styles for toggle elements. */
	const toggleStyles = `${baseNodeStyles} ${enhancedHoverStyles} ${toggleSpecificStyles} ${defaultBgStyles} ${fontStyles}`;

	/** Combined styles for button elements. */
	const buttonStyles = `${baseNodeStyles} ${enhancedHoverStyles} ${fontStyles}`;
</script>

{#if isTogglable}
	<!-- Render as a toggle for selectable nodes -->
	<Toggle
		{pressed}
		class={toggleStyles}
		variant="outline"
		style="width: {widthCalc};"
		onPressedChange={onclick}
	>
		<div class="flex w-full !items-center !justify-between gap-2">
			<div class="pointer-events-none !flex min-w-0 flex-1 !items-center gap-1">
				<span class="inline-block size-4" aria-hidden="true">
					{@html icon}
				</span>
				<span class="block w-full text-left break-words">{name}</span>
			</div>
			{@render children?.()}
		</div>
	</Toggle>
{:else}
	<!-- Render as a button for folder nodes -->
	<button
		class="{buttonStyles} {pressed ? accentBgStyles : defaultBgStyles}"
		style="width: {widthCalc};"
		{onclick}
	>
		<div class="flex w-full items-center justify-between gap-2">
			<div class="pointer-events-none flex min-w-0 flex-1 items-center gap-1">
				<OpenIndicator {isOpen} />
				<span class="inline-block size-4" aria-hidden="true">
					{@html icon}
				</span>
				<span class="block w-full text-left break-words">{name}</span>
			</div>
			{@render children?.()}
		</div>
	</button>
{/if}
