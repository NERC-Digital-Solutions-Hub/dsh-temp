<script lang="ts">
	import type { AreaSelectionInteractionStore } from '$lib/stores/area-selection-interaction-store.svelte';
	import { toast } from 'svelte-sonner';

	type Props = {
		areaSelectionInteractionStore: AreaSelectionInteractionStore;
	};

	const { areaSelectionInteractionStore }: Props = $props();

	/**
	 * Displays a toast notification for area selection changes.
	 * @param areaId - The ID of the area that was added or removed.
	 * @param action - The action performed ('added' or 'removed').
	 */
	async function showAreaChangeToast(areaId: number, action: 'added' | 'removed') {
		const names = await areaSelectionInteractionStore.getAreaNamesById([areaId]);

		if (!names || names.length === 0 || !names[0]) {
			return;
		}

		const message = `Area ${action}: ${names[0]}`;
		toast.success(message);
	}

	// Effect to show toast when an area is added
	$effect(() => {
		if (!areaSelectionInteractionStore.lastAddedArea) {
			return;
		}

		showAreaChangeToast(areaSelectionInteractionStore.lastAddedArea.id, 'added');
	});

	// Effect to show toast when an area is removed
	$effect(() => {
		if (!areaSelectionInteractionStore.lastRemovedArea) {
			return;
		}

		showAreaChangeToast(areaSelectionInteractionStore.lastRemovedArea.id, 'removed');
	});
</script>

<style>
</style>
