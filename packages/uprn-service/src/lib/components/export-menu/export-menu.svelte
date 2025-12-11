<script lang="ts">
	import Button from '$lib/components/shadcn/button/button.svelte';
	import FilterFieldMenuStore from '$lib/stores/field-filter-menu-store.svelte';
	import { WebMapStore } from '$lib/stores/web-map-store.svelte';
	import FilterButton from '../tree-view/data-selection/filter-button.svelte';
	import SelectionEntryCard from '$lib/components/selection-entry-card/selection-entry-card.svelte';
	import type { TreeviewConfigStore } from '$lib/stores/treeview-config-store';
	import type {
		AreaFieldHandleInfo,
		AreaSelectionInteractionStore
	} from '$lib/stores/area-selection-interaction-store.svelte';
	import type { DataSelectionStore } from '$lib/stores/data-selection-store.svelte';

	export type Props = {
		webMapStore: WebMapStore;
		areaSelectionInteractionStore: AreaSelectionInteractionStore;
		dataSelectionStore: DataSelectionStore;
		dataSelectionTreeviewConfig: TreeviewConfigStore;
		fieldFilterMenuStore: FilterFieldMenuStore;
	};

	const {
		webMapStore,
		areaSelectionInteractionStore,
		dataSelectionStore,
		dataSelectionTreeviewConfig,
		fieldFilterMenuStore
	}: Props = $props();

	type AreaInfo = {
		name: string;
		HighlightAreaInfo: AreaFieldHandleInfo;
	};

	let areaInfos: AreaInfo[] = $state<AreaInfo[]>([]);

	$effect(() => {
		if (!areaSelectionInteractionStore) {
			areaInfos = [];
			return;
		}

		if (!areaSelectionInteractionStore.selectionViewState?.areaHandles.size) {
			areaInfos = [];
			return;
		}

		const getAreaInfos = async () => {
			const areaNames = await areaSelectionInteractionStore.getAreaNamesById(
				areaSelectionInteractionStore.selectionViewState.areaHandles.keys().toArray()
			);

			const fieldHandleInfos: AreaFieldHandleInfo[] =
				areaSelectionInteractionStore.selectionViewState.areaHandles
					.entries()
					.toArray()
					.map(([id, handle]) => ({ id, handle }));

			const newAreaInfos: AreaInfo[] = [];
			for (let i = 0; i < areaNames.length; i++) {
				newAreaInfos.push({
					name: areaNames[i] || 'Unknown Area',
					HighlightAreaInfo: fieldHandleInfos[i]
				});
			}
			areaInfos = newAreaInfos;
		};

		getAreaInfos();
	});

	/**
	 * Removes an area from the selection by its name.
	 * @param areaName - The name of the area to remove.
	 */
	function removeArea(areaName: string) {
		const areaIndex = areaInfos.findIndex((area) => area.name === areaName);
		if (areaIndex !== -1) {
			areaSelectionInteractionStore.removeSelectedArea(areaInfos[areaIndex]?.HighlightAreaInfo.id);
		}
	}

	/**
	 * Removes a data selection from the store by layer ID.
	 * @param layerId - The ID of the layer to remove from data selections.
	 */
	function removeDataSelection(layerId: string) {
		// Remove the data selection from the store
		console.log('[export-menu] Removing data selection for layerId:', layerId);
		dataSelectionStore.removeSelection(layerId);
		console.log(
			'[export-menu] Current SelectedData:',
			$state.snapshot(dataSelectionStore.getAllSelections())
		);
	}

	/**
	 * Handles the filter button click for a layer.
	 * Toggles the active layer in the field filter menu store.
	 * @param layerId - The ID of the layer to filter.
	 */
	function handleFilterClicked(layerId: string) {
		if (fieldFilterMenuStore.ActiveLayer?.id === layerId) {
			fieldFilterMenuStore.ActiveLayer = null;
			return;
		}

		const layer: __esri.Layer | undefined = webMapStore.dataLookup.get(layerId);
		if (!layer) {
			console.warn(`[export-menu] Layer with ID ${layerId} not found in web map store.`);
			return;
		}

		fieldFilterMenuStore.ActiveLayer = layer;
	}

	/**
	 * Checks if any filters have been applied to a layer's fields.
	 * @param layerId - The ID of the layer to check.
	 * @returns True if filters are applied, false otherwise.
	 */
	function hasFiltersApplied(layerId: string): boolean {
		const dataSelection = dataSelectionStore.getSelection(layerId);
		if (
			!dataSelection ||
			!dataSelection.selectedFieldIds ||
			dataSelection.selectedFieldIds.size === 0 ||
			dataSelection.selectedFieldIds.size ===
				(webMapStore.dataLookup.get(layerId) as __esri.FeatureLayer)?.fields?.length
		) {
			return false;
		}

		return true;
	}
</script>

<h2>Export Options</h2>

<div class="section">
	<h3>
		{areaSelectionInteractionStore.selectionViewState?.layerView?.layer
			? areaSelectionInteractionStore.selectionViewState?.layerView?.layer.title
			: 'No Area Layer Selected'}
	</h3>
	<h4>Selected Areas</h4>
	{#if areaInfos.length > 0}
		<ul class="selected-list">
			{#each areaInfos as area}
				<SelectionEntryCard title={area.name}>
					<Button
						variant="ghost"
						size="sm"
						class="area-remove-btn"
						title="Remove area"
						onclick={() => removeArea(area.name)}
					>
						×
					</Button>
				</SelectionEntryCard>
			{/each}
		</ul>
		<p class="count">
			{areaInfos.length} area(s) selected
		</p>
	{:else}
		<p class="no-selection">No areas selected</p>
	{/if}
</div>

<div class="section">
	<h4>Selected Data</h4>
	{#if dataSelectionStore.getAllSelections().length > 0}
		<ul>
			{#each dataSelectionStore.getAllSelections() as data}
				<SelectionEntryCard title={webMapStore.dataLookup.get(data.layerId)?.title ?? ''}>
					{#if dataSelectionTreeviewConfig?.getItemConfig(data.layerId)?.showFields}
						<FilterButton
							layerId={data.layerId}
							onFilterClicked={handleFilterClicked}
							{hasFiltersApplied}
						/>
					{/if}
					<Button
						variant="ghost"
						size="sm"
						class="data-remove-btn"
						title="Remove data selection"
						onclick={() => removeDataSelection(data.layerId)}
					>
						×
					</Button>
				</SelectionEntryCard>
			{/each}
		</ul>
		<p class="count">{dataSelectionStore.getAllSelections().length} data layer(s) selected</p>
	{:else}
		<p class="no-selection">No data selected</p>
	{/if}
</div>

<style>
	h2 {
		margin: 0 0 1rem 0;
		font-size: 1.125rem;
		font-weight: 600;
		color: #111827;
	}

	h3 {
		margin: 0 0 0.75rem 0;
		font-size: 1.0625rem;
		font-weight: 600;
		color: #1f2937;
		border-bottom: 2px solid #e5e7eb;
		padding-bottom: 0.375rem;
	}

	.section {
		margin-bottom: 1.5rem;
	}

	.section:last-child {
		margin-bottom: 0;
	}

	h4 {
		margin: 0 0 0.5rem 0;
		font-size: 1rem;
		font-weight: 500;
		color: #374151;
	}

	:global(.area-remove-btn),
	:global(.data-remove-btn) {
		height: 1.5rem;
		width: 1.5rem;
		padding: 0;
		font-size: 1rem;
		line-height: 1;
		color: #6b7280;
		transition: color 0.15s ease-in-out;
	}

	:global(.area-remove-btn:hover),
	:global(.data-remove-btn:hover) {
		color: #ef4444;
	}

	.count {
		margin: 0;
		font-size: 0.75rem;
		font-weight: 500;
		color: #6b7280;
	}

	.no-selection {
		margin: 0;
		font-size: 0.875rem;
		color: #9ca3af;
		font-style: italic;
	}
</style>
