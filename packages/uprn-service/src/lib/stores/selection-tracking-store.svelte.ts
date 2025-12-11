import type { AreaSelectionStore } from '$lib/stores/area-selection-store.svelte';
import type {
	DataSelectionSnapshot,
	DataSelectionStore
} from '$lib/stores/data-selection-store.svelte';
import { getSelection, updateSelection } from '$lib/db';
import { SvelteMap } from 'svelte/reactivity';

/**
 * Store for tracking UPRN selection changes and persisting them to the database.
 */
export class SelectionTrackingStore {
	/**
	 * The portal item ID associated with the current selection.
	 */
	public portalItemId: string | null = $state(null);

	#areaSelectionStore: AreaSelectionStore;
	#dataSelectionStore: DataSelectionStore;

	#initialLoadComplete = $state(false);

	#areaLayerSnapshot = $derived.by(() => this.#areaSelectionStore.exportSnapshot());
	#dataSelectionSnapshots = $derived.by(() => {
		// Create a deep snapshot to track changes to nested SvelteSet objects
		const snapshots = new SvelteMap<string, DataSelectionSnapshot>();
		for (const [layerId, snapshot] of this.#dataSelectionStore.dataSelections) {
			snapshots.set(layerId, {
				layerId: snapshot.layerId,
				// Access the SvelteSet to create a reactive dependency
				selectedFieldIds: snapshot.selectedFieldIds
			});
		}
		return snapshots;
	});

	/**
	 * Initializes the SelectionTrackingStore instance.
	 * @param areaSelectionStore The area selection store containing selected areas.
	 * @param dataSelectionStore The data selection store containing selected data layers and their fields.
	 */
	constructor(areaSelectionStore: AreaSelectionStore, dataSelectionStore: DataSelectionStore) {
		this.#areaSelectionStore = areaSelectionStore;
		this.#dataSelectionStore = dataSelectionStore;

		$effect.root(() => {
			/**
			 * Effect 1: react to portalItemId changes
			 * Whenever the map changes to a different portal item, reload its selections.
			 */
			$effect(() => {
				const portalItemId = this.portalItemId;
				console.log('[selection-tracking-store] portalItemId changed:', portalItemId);

				const async = async () => {
					if (!portalItemId) {
						this.#initialLoadComplete = false;
						return;
					}

					this.#initialLoadComplete = false;
					await this.loadSelections(portalItemId);
				};

				async();
			});

			/**
			 * Effect 2: area selection changes for the current portal item
			 */
			$effect(() => {
				const portalItemId = this.portalItemId;
				console.log('[selection-tracking-store] Detected area selection change');

				const async = async () => {
					if (!this.#initialLoadComplete) {
						console.log(
							'[selection-tracking-store] Initial load not complete, skipping area selection effect'
						);
						return;
					}

					if (!portalItemId) {
						console.log(
							'[selection-tracking-store] No portalItemId, skipping area selection persistence'
						);
						return;
					}

					if (!this.#areaLayerSnapshot) {
						return;
					}

					if (!this.#areaLayerSnapshot.layerId) {
						await updateSelection(portalItemId, { areas: null });
						return;
					}

					if (!this.#areaLayerSnapshot.selectedAreaIds.size) {
						await updateSelection(portalItemId, { areas: null });
						return;
					}

					await updateSelection(portalItemId, { areas: this.#areaLayerSnapshot });

					console.log(
						'[selection-tracking-store] Area selection updated:',
						$state.snapshot(this.#areaLayerSnapshot),
						'for portalItemId:',
						portalItemId
					);
				};

				async();
			});

			/**
			 * Effect 3: data selection changes for the current portal item
			 */
			$effect(() => {
				const portalItemId = this.portalItemId;
				console.log('[selection-tracking-store] Detected data selection change');

				const async = async () => {
					if (!this.#initialLoadComplete) {
						console.log(
							'[selection-tracking-store] Initial load not complete, skipping data selection effect'
						);
						return;
					}

					if (!portalItemId) {
						console.log(
							'[selection-tracking-store] No portalItemId, skipping data selection persistence'
						);
						return;
					}

					if (!this.#dataSelectionSnapshots || this.#dataSelectionSnapshots.size === 0) {
						console.log(
							'[selection-tracking-store] No data selections, clearing in database for',
							portalItemId
						);
						await updateSelection(portalItemId, { data: [] });
						return;
					}

					await updateSelection(portalItemId, {
						data: this.#dataSelectionSnapshots.values().toArray()
					});

					console.log(
						'[selection-tracking-store] Data selection updated:',
						$state.snapshot(this.#dataSelectionSnapshots),
						'for portalItemId:',
						portalItemId
					);
				};

				async();
			});
		});
	}

	/**
	 * Loads existing selections for a given portal item from the database into the stores.
	 */
	async loadSelections(portalItemId: string) {
		if (!portalItemId) {
			this.#initialLoadComplete = true;
			return;
		}

		const selection = await getSelection(portalItemId);

		if (!selection) {
			console.log(
				'[selection-tracking-store] No existing selection found in database for',
				portalItemId
			);
			this.#initialLoadComplete = true;
			return;
		}

		console.log(
			'[selection-tracking-store] Loaded selection from database for',
			portalItemId,
			':',
			selection
		);

		if (selection.areas) {
			this.#areaSelectionStore.setLayerId(selection.areas.layerId);

			console.log(
				'[selection-tracking-store] (loadSelections) Restoring selected area IDs:',
				Array.from(selection.areas.selectedAreaIds),
				'layer ID:',
				this.#areaSelectionStore.layerId
			);

			this.#areaSelectionStore.addSelectedAreas(Array.from(selection.areas.selectedAreaIds));
		}

		selection.data.forEach((dataSelection) => {
			this.#dataSelectionStore.addSelection(dataSelection);
		});

		this.#initialLoadComplete = true;
	}
}
