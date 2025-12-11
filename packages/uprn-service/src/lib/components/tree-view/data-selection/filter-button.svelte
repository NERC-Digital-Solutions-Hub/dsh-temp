<!-- FilterButton.svelte -->
<script lang="ts">
	import { Funnel as FilterEnabledIcon } from '@lucide/svelte';
	import { FunnelX as FilterDisabledIcon } from '@lucide/svelte';

	/**
	 * Props for the FilterButton component.
	 */
	type Props = {
		/** The ID of the layer this button controls. */
		layerId: string;
		/** Callback when filter button is clicked. */
		onFilterClicked?: (layerId: string) => void;
		/** Function to check if filters are applied. */
		hasFiltersApplied?: (layerId: string) => boolean;
	};

	/** Destructured props. */
	const { layerId, onFilterClicked, hasFiltersApplied }: Props = $props();

	/** Reactive state for whether filters are active. */
	let isActive = $state(hasFiltersApplied?.(layerId) ?? false);

	// Update active state when filters change
	$effect(() => {
		isActive = hasFiltersApplied?.(layerId) ?? false;
	});

	/** Derived icon markup based on active state. */
	const iconMarkup = $derived(isActive ? FilterEnabledIcon : FilterDisabledIcon);

	/**
	 * Handles click events on the filter button.
	 * Stops event propagation and calls the callback.
	 * @param event - The mouse event.
	 */
	function handleClick(event: MouseEvent) {
		event.stopPropagation();
		onFilterClicked?.(layerId);
	}
</script>

<button
	class="filter-btn"
	class:active={isActive}
	onclick={handleClick}
	aria-pressed={isActive}
	title="Filter"
>
	{@html iconMarkup}
</button>

<style>
	.filter-btn {
		/* Layout */
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.5rem;
		height: 1.5rem;
		padding: 0.25rem;
		margin-right: -0.5rem;

		/* Appearance */
		background: transparent;
		border: none;
		border-radius: 0rem;
		cursor: pointer;

		/* Transitions */
		transition: background-color 0.1s ease-out;

		/* Focus */
		outline: none;
	}

	/* SVG styling */
	/* SVG styling */
	.filter-btn :global(svg) {
		width: 1rem;
		height: 1rem;
		display: block;
	}

	.filter-btn :global(svg path) {
		stroke: #d1d5db; /* Also set stroke for stroke-based icons */
		transition:
			fill 0.1s ease-out,
			opacity 0.1s ease-out;
	}

	/* Interactive states for inactive button */
	.filter-btn:not(.active):hover {
		background-color: hsl(var(--muted));
	}

	.filter-btn:not(.active):hover :global(svg path) {
		stroke: #9ca3af; /* Medium gray on hover */
	}

	.filter-btn:not(.active):focus {
		background-color: hsl(var(--muted));
	}

	/* Active state */
	.filter-btn.active :global(svg path),
	.filter-btn:active :global(svg path) {
		stroke: hsl(var(--primary));
		opacity: 1; /* Full opacity when active */
	}
</style>
