import { SvelteSet } from 'svelte/reactivity';

/**
 * Snapshot type for AreaSelectionStore.
 */
export type AreaSelectionStoreSnapshot = {
	/**
	 * The ID of the layer from which areas are selected.
	 */
	layerId: string | null;

	/**
	 * Set of selected area IDs. This is the field ID of the area in the feature layer.
	 */
	selectedAreaIds: SvelteSet<number>;
};

/**
 * Store for managing the selected areas.
 */
export class AreaSelectionStore {
	/**
	 * The ID of the layer from which areas are selected.
	 */
	public layerId: string | null = $state(null);

	/**
	 * Set of selected area IDs. This is the field ID of the area in the feature layer.
	 */
	public selectedAreaIds: SvelteSet<number> = $state(new SvelteSet());

	/**
	 * Set the layer ID for area selection.
	 * @param layerId - The ID of the layer
	 */
	setLayerId(layerId: string | null): void {
		if (this.layerId === layerId) {
			return;
		}

		this.layerId = layerId;
		this.selectedAreaIds.clear();
	}

	/**
	 * Add an area ID to the selected areas.
	 * @param areaId - The area ID to add
	 */
	addSelectedArea(areaId: number): void {
		this.selectedAreaIds.add(areaId);
	}

	/**
	 * Add multiple area IDs to the selected areas.
	 * @param areaIds - Array of area IDs to add
	 */
	addSelectedAreas(areaIds: number[]): void {
		areaIds.forEach((id) => this.selectedAreaIds.add(id));
	}

	/**
	 * Remove an area ID from the selected areas.
	 * @param areaId - The area ID to remove
	 */
	removeSelectedArea(areaId: number): void {
		this.selectedAreaIds.delete(areaId);
	}

	/**
	 * Clear all selected areas.
	 */
	clearSelectedAreas(): void {
		this.selectedAreaIds.clear();
	}

	/**
	 * Export a snapshot of the state of the AreaSelectionStore.
	 * @returns The exported snapshot
	 */
	exportSnapshot(): AreaSelectionStoreSnapshot {
		return {
			layerId: this.layerId,
			selectedAreaIds: new SvelteSet(this.selectedAreaIds)
		};
	}
}
