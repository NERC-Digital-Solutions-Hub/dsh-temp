<script lang="ts">
	import type { TreeNode } from './types.js';
	import { type Snippet } from 'svelte';
	import { slide } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';

	/**
	 * Props for the NodeAnimation component.
	 */
	type Props = {
		/** Whether the node is currently open (expanded). */
		isOpen?: boolean;
		/** The child nodes to render when expanded. */
		childNodes?: TreeNode[] | null;
		/** The content snippet to render for the node. */
		content?: Snippet;
		/** The snippet to render for each child node. */
		childNode?: Snippet<[TreeNode]>;
		/** Optional animation duration in milliseconds. */
		duration?: number;
	};

	/** Destructured props with defaults. */
	const { isOpen = false, childNodes = null, content, childNode, duration = 300 }: Props = $props();
</script>

<div class="w-full">
	<!-- Render the main node content (label, toggle, etc.) -->
	{@render content?.()}

	<!-- Children -->
	{#if isOpen && childNodes}
		<div class="relative ml-4 w-full">
			<div class="tree-guide-line"></div>

			<div class="tree-children" in:slide={{ duration, easing: cubicOut }} out:slide={{ duration }}>
				{#each childNodes ?? [] as child (child.id)}
					{@render childNode?.(child)}
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.tree-guide-line {
		position: absolute;
		left: -0.5rem;
		top: 0;
		bottom: 5px;
		width: 2px;
		background-color: var(--secondary-foreground);
		opacity: 0.5;
		z-index: 0;
	}

	.tree-children {
		position: relative;
		z-index: 1;
	}

	@keyframes lineGrow {
		from {
			transform: scaleY(0);
		}
		to {
			transform: scaleY(1);
		}
	}

	@keyframes containerFadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes nodeSlideIn {
		from {
			opacity: 0;
			transform: translateX(-10px) scale(0.96);
		}
		to {
			opacity: 1;
			transform: translateX(0) scale(1);
		}
	}
</style>
