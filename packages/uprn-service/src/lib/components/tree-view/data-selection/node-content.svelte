<script lang="ts">
	import type { Snippet } from 'svelte';
	import OpenIndicator from '$lib/components/open-indicator/open-indicator.svelte';
	import { getNodeStyles } from '../node-content-styles.js';

	/**
	 * Props for the NodeContent component.
	 */
	type Props = {
		/** The icon HTML/SVG to display. */
		icon: string;
		/** The display name of the node. */
		name: string;
		/** The depth level for indentation. */
		depth: number;
		/** Click handler function. */
		onclick: () => void;
		/** Additional children to render. */
		children?: Snippet;
		/** Whether this is a folder node. */
		isFolder?: boolean;
		/** Whether the folder is open. */
		isOpen?: boolean;
	};

	/** Destructured props with defaults. */
	const {
		icon,
		name,
		depth,
		onclick,
		children,
		isFolder = false,
		isOpen = false
	}: Props = $props();

	/** Calculate width to account for indentation. */
	const widthCalc = `calc(100% - ${depth * 1}rem)`;
</script>

<button
	class={getNodeStyles({ enhancedHover: true, includeFont: true })}
	style="width: {widthCalc};"
	{onclick}
>
	<div class="flex w-full items-center justify-between gap-2">
		<div class="pointer-events-none flex min-w-0 flex-1 items-center gap-1">
			{#if isFolder}
				<OpenIndicator {isOpen} />
			{/if}
			<span class="inline-block size-4" aria-hidden="true">
				{@html icon}
			</span>
			<span class="block w-full text-left break-words">{name}</span>
		</div>
		{@render children?.()}
	</div>
</button>
