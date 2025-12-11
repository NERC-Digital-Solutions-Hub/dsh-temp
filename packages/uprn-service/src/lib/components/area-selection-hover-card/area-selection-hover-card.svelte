<script lang="ts">
	import * as Card from '$lib/components/shadcn/card/index.js';
	import type { AreaSelectionInteractionStore } from '$lib/stores/area-selection-interaction-store.svelte';

	type Props = {
		areaSelectionInteractionStore: AreaSelectionInteractionStore;
	};

	const { areaSelectionInteractionStore }: Props = $props();

	/**
	 * The name of the currently hovered area, displayed in the hover card.
	 */
	let currentHoveredAreaName = $state<string | null>(null);

	/**
	 * The current mouse position, used to position the hover card.
	 */
	let mousePosition = $state<{ x: number; y: number }>({ x: 0, y: 0 });

	/**
	 * Counter to track hover requests and prevent race conditions when fetching area names.
	 */
	let hoverRequestCounter = 0;

	/**
	 * Handles mouse movement events to update the mouse position state.
	 * @param event - The mouse move event containing client coordinates.
	 */
	const handleMouseMove = (event: MouseEvent) => {
		mousePosition = {
			x: event.clientX,
			y: event.clientY
		};
	};

	// Add mouse move listener when component mounts and remove on unmount
	$effect(() => {
		document.addEventListener('mousemove', handleMouseMove);

		return () => {
			document.removeEventListener('mousemove', handleMouseMove);
		};
	});

	// Effect to fetch and display area name when hovering over an area
	$effect(() => {
		const areaId = areaSelectionInteractionStore.currentHoveredArea?.id;
		const myVersion = ++hoverRequestCounter;

		if (!areaId) {
			currentHoveredAreaName = null;
			return;
		}

		(async () => {
			const names = await areaSelectionInteractionStore.getAreaNamesById([areaId]);
			if (myVersion !== hoverRequestCounter) return;

			if (areaSelectionInteractionStore.currentHoveredArea?.id !== areaId) {
				return;
			}

			currentHoveredAreaName = names[0] ?? null;
		})();
	});
</script>

{#if currentHoveredAreaName}
	<div
		class="pointer-events-none fixed z-50 transition-opacity duration-200"
		style="left: {mousePosition.x + 10}px; top: {mousePosition.y - 10}px;"
	>
		<Card.Root class="max-w-xs border !py-2 shadow-lg">
			<Card.Content class="!px-3 !py-0">
				<p class="text-sm font-medium">{currentHoveredAreaName}</p>
			</Card.Content>
		</Card.Root>
	</div>
{/if}

<style>
</style>
