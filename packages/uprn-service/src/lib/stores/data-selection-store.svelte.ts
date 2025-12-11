import { SvelteMap, SvelteSet } from 'svelte/reactivity';

/**
 * Snapshot type for data selections.
 */
export type DataSelectionSnapshot = {
	/**
	 * The ID of the data layer.
	 */
	layerId: string;

	/**
	 * Set of selected field IDs.
	 */
	selectedFieldIds: SvelteSet<string>;
};

/**
 * Store for managing the data selected for download.
 */
export class DataSelectionStore {
	public dataSelections = $state<SvelteMap<string, DataSelectionSnapshot>>(new SvelteMap());

	/**
	 * Add a DataSelection to the store.
	 *
	 * Stores the provided DataSelection keyed by its layerId and shows a
	 * success toast to indicate the selection has been added.
	 *
	 * @param dataSelection - The DataSelection object to add.
	 */
	public addSelection(dataSelection: DataSelectionSnapshot) {
		this.dataSelections.set(dataSelection.layerId, dataSelection);
	}

	/**
	 * Update an existing DataSelection in the store.
	 * @param layerId - The id of the layer whose selection should be updated.
	 * @param selectedFieldIds - The new array of selected field IDs.
	 */
	public updateSelection(layerId: string, selectedFieldIds: string[]) {
		const existing = this.dataSelections.get(layerId);
		if (!existing) {
			console.warn(`[data-selection-store] no existing selection for layerId ${layerId}`);
			return;
		}

		existing.selectedFieldIds = new SvelteSet(selectedFieldIds);
		this.dataSelections.set(layerId, { ...existing });
	}

	public addOrUpdateSelection(layerId: string, selectedFieldIds: string[]) {
		const existing = this.dataSelections.get(layerId);
		if (existing) {
			existing.selectedFieldIds = new SvelteSet(selectedFieldIds);
			this.dataSelections.set(layerId, { ...existing });
		} else {
			const newSelection: DataSelectionSnapshot = {
				layerId,
				selectedFieldIds: new SvelteSet(selectedFieldIds)
			};
			this.dataSelections.set(layerId, newSelection);
		}
	}

	/**
	 * Remove a DataSelection from the store by layer id.
	 *
	 * If a selection existed for the provided id it will be deleted and a
	 * success toast will be shown with the removed selection's name. If no
	 * selection existed, the method is a no-op.
	 *
	 * @param layerId - The id of the layer whose selection should be removed.
	 */
	public removeSelection(layerId: string) {
		console.log(`[data-selection-store] Removing selection for layerId: ${layerId}`);
		this.dataSelections.delete(layerId);
	}

	/**
	 * Get the DataSelection for a given layer id.
	 *
	 * @param layerId - The id of the layer to retrieve the selection for.
	 * @returns The DataSelection if it exists, otherwise undefined.
	 */
	public getSelection(layerId: string): DataSelectionSnapshot | undefined {
		return this.dataSelections.get(layerId);
	}

	/**
	 * Get all DataSelections in the store.
	 *
	 * @returns An array of all DataSelection objects currently stored.
	 */
	public getAllSelections(): DataSelectionSnapshot[] {
		return Array.from(this.dataSelections.values());
	}

	/**
	 * Clear all DataSelections from the store.
	 */
	public clearSelections(): void {
		console.log('[data-selection-store] Clearing all selections');
		this.dataSelections.clear();
		console.log('[data-selection-store] selections cleared.');
	}

	/**
	 * Clear all DataSelections from the store.
	 */
	public cleanup(): void {
		this.dataSelections.clear();
	}
}
