<script lang="ts">
	import * as TreeView from '$lib/components/shadcn/tree-view/index.js';
	import type { TreeviewConfigStore } from '$lib/stores/treeview-config-store';
	import { TreeviewStore } from '$lib/stores/treeview-store.svelte';
	import { onDestroy } from 'svelte';
	import Node from './node.svelte';
	import { TreeLayerNode } from '$lib/components/tree-view/types';
	import FeatureLayer from '@arcgis/core/layers/FeatureLayer';
	import FeatureLayerView from '@arcgis/core/views/layers/FeatureLayerView';
	import type { AreaSelectionStore } from '$lib/stores/area-selection-store.svelte';

	/**
	 * Props for the TreeView component.
	 */
	type Props = {
		/** The ESRI WebMap containing layers to display. */
		webMap: __esri.WebMap;

		/** Store for tree view config settings. */
		treeviewConfigStore: TreeviewConfigStore;

		/** Store for area selection management. */
		areaSelectionStore: AreaSelectionStore;
	};

	const { webMap, treeviewConfigStore, areaSelectionStore }: Props = $props();

	const treeviewStore = new TreeviewStore();
	let lastLoadedWebMapId: string | null = $state(null);

	export function clearSelections() {
		treeviewStore.clearSelections();
	}

	// Initialize the tree view when webMap changes
	$effect(() => {
		if (!webMap || webMap.portalItem?.id === lastLoadedWebMapId) {
			return;
		}

		treeviewStore.clearSelections();
		treeviewStore.initialize(webMap.layers.toArray(), treeviewConfigStore, null);
		lastLoadedWebMapId = webMap.portalItem?.id || null;
	});

	$effect(() => {
		if (!lastLoadedWebMapId) {
			return;
		}

		if (!treeviewStore.getVisibleNodes().length && areaSelectionStore.layerId) {
			treeviewStore.setVisibilityState(areaSelectionStore.layerId, true);
		}
	});

	$effect(() => {
		if (!lastLoadedWebMapId) {
			return;
		}

		if (!treeviewStore.getVisibleNodes().length) {
			//areaSelectionStore.setLayerId(null);
			return;
		}

		const node = treeviewStore
			.getVisibleNodes()
			.find((n) => n instanceof TreeLayerNode && n.layer instanceof FeatureLayer) as
			| TreeLayerNode
			| undefined;

		if (!node || !(node instanceof TreeLayerNode)) {
			console.warn('Visible node is not a FeatureLayer');
			return;
		}

		if (!node.layer || !(node.layer instanceof FeatureLayer)) {
			console.warn('Visible node layer is not a FeatureLayer', node.layer.type);
			return;
		}

		areaSelectionStore.setLayerId(node.id);
	});
</script>

{#if treeviewStore.initialized}
	<TreeView.Root>
		{#each treeviewStore.getNodes() as node (node.id)}
			<Node
				{treeviewConfigStore}
				{node}
				onNodeClick={() => {}}
				onNodeVisibilityChange={(node, visible) =>
					treeviewStore.setVisibilityState(node.id, visible)}
				getNodeVisibility={(nodeId) => treeviewStore.getVisibilityState(nodeId)}
				depth={0}
				useLayerTypeIcon={true}
			/>
		{/each}
	</TreeView.Root>
{/if}
