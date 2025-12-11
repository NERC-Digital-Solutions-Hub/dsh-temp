import type { TreeviewConfigStore } from '$lib/stores/treeview-config-store.js';
import {
	TreeNode,
	TreeLayerNode,
	TreeFieldNode,
	LayerDrawState
} from '$lib/components/tree-view/types.js';
import { type TreeviewNodeConfig, type VisibilityGroupConfig } from '$lib/types/treeview.js';
import { SvelteMap } from 'svelte/reactivity';
import type { CustomNodeConverter } from '$lib/components/tree-view/services/custom-node-converter';
import type { CustomRendererService } from '$lib/services/custom-renderer-service';
import type { LayerViewProvider } from '$lib/services/layer-view-provider';
import Layer from '@arcgis/core/layers/Layer';
import LayerView from '@arcgis/core/views/layers/LayerView';
import * as reactiveUtils from '@arcgis/core/core/reactiveUtils';

export class TreeviewStore {
	public initialized: boolean = $state<boolean>(false);

	#configStore: TreeviewConfigStore | null = null;

	#layerViewProvider: LayerViewProvider | null = null;

	/** The hierarchical tree structure of map layers */
	#treeNodes: TreeNode[] = $state<TreeNode[]>([]);

	/**
	 * Lookup map for quick access to any tree node by its ID.
	 * Automatically rebuilds when layerTree changes.
	 */
	#treeNodesLookup: SvelteMap<string, TreeNode> = $derived.by(() => {
		const map = new SvelteMap<string, TreeNode>();
		this.#addNodesToLookupMap(this.#treeNodes, map);
		return map;
	});

	/**
	 * Map of visibility groups to a map of node IDs and their visibility state.
	 * This enables managing visibility state per group.
	 */
	#visibilityStates: SvelteMap<string, boolean> = $state(new SvelteMap());

	/**
	 * Tracks the draw state of each node by its ID.
	 */
	#drawStates: SvelteMap<string, LayerDrawState> = $state(new SvelteMap());

	/**
	 * Map of draw state handles for each node. The key is the node ID.
	 */
	#drawStateHandles = $state<Map<string, IHandle>>(new SvelteMap());

	/**
	 * Tracks the active node in each visibility group to enforce single active visibility per group.
	 */
	#activeInVisibilityGroup: SvelteMap<string, string[]> = $state(new SvelteMap());

	/** Custom converters for nodes */
	#customConverters: SvelteMap<string, CustomNodeConverter> = $state(new SvelteMap());

	/** Service for custom renderers */
	#customRendererService: CustomRendererService | null = null;

	initialize(
		layers: __esri.Layer[],
		configStore: TreeviewConfigStore,
		layerViewProvider: LayerViewProvider | null,
		customConverters?: CustomNodeConverter[],
		customRendererService?: CustomRendererService
	): void {
		if (this.initialized) {
			throw new Error('TreeviewStore is already initialized.');
		}

		this.initialized = true;

		if (!configStore) {
			throw new Error('TreeviewStore requires a valid TreeviewConfigStore to initialize.');
		}

		this.#configStore = configStore;

		if (customConverters) {
			for (const converter of customConverters) {
				this.#customConverters.set(converter.id, converter);
			}
		}

		if (customRendererService) {
			this.#customRendererService = customRendererService;
		}

		if (!layers) {
			throw new Error('TreeviewStore requires a valid array of layers to initialize.');
		}

		this.#layerViewProvider = layerViewProvider;

		this.#initializeConfigurations(layers);
		this.#treeNodes = this.#buildTreeFromLayers(layers);
	}

	getNodeById(id: string): TreeNode | undefined {
		this.#checkInitialized();
		return this.#treeNodesLookup.get(id);
	}

	getNodes(): TreeNode[] {
		this.#checkInitialized();
		return this.#treeNodes;
	}

	getVisibleNodes(): TreeNode[] {
		this.#checkInitialized();
		const visibleNodes: TreeNode[] = [];
		for (const [nodeId, isVisible] of this.#visibilityStates) {
			if (!isVisible) {
				continue;
			}

			const node = this.#treeNodesLookup.get(nodeId);
			if (node) {
				visibleNodes.push(node);
			}
		}

		return visibleNodes;
	}

	getNonHiddenNodes(): TreeNode[] {
		this.#checkInitialized();
		return this.#getNonHiddenNodes(this.#treeNodes);
	}

	clearSelections(): void {
		for (const nodeId of this.#visibilityStates.keys()) {
			this.#visibilityStates.set(nodeId, false);
			const node = this.#treeNodesLookup.get(nodeId);
			if (node && node instanceof TreeLayerNode) {
				node.layer.visible = false;
			}
		}

		this.#activeInVisibilityGroup.clear();
	}

	#getNonHiddenNodes(nodes: TreeNode[]): TreeNode[] {
		this.#checkInitialized();
		const nonHiddenNodes: TreeNode[] = [];
		for (const node of nodes) {
			const nodeConfig = this.#findTreeviewItemConfig(node.id);
			if (nodeConfig && nodeConfig.isHidden) {
				continue;
			}

			nonHiddenNodes.push(node);

			if (node.children?.length) {
				const childNonHidden = this.#getNonHiddenNodes(node.children);
				nonHiddenNodes.push(...childNonHidden);
			}
		}

		return nonHiddenNodes;
	}

	/**
	 * Gets the visibility state of a node by its ID.
	 * @param nodeId - The ID of the node to check visibility for
	 * @returns True if the node is visible, otherwise false
	 */
	getVisibilityState(nodeId: string): boolean {
		this.#checkInitialized();
		return this.#visibilityStates.get(nodeId) ?? false;
	}

	setVisibilityState(nodeId: string, isVisible: boolean): void {
		this.#checkInitialized();
		const node = this.#treeNodesLookup.get(nodeId);
		if (!node) {
			throw new Error(`Tree node not found for ID: ${nodeId}`);
		}

		if (!(node instanceof TreeLayerNode)) {
			throw new Error(`Tree node is not a layer node: ${nodeId}`);
		}

		const config = this.#findTreeviewItemConfig(nodeId);
		if (config?.disableVisibilityToggle) {
			return; // do nothing if visibility toggle is prevented
		}

		this.#visibilityStates.set(nodeId, isVisible);
		node.layer.visible = isVisible;
		this.updateDrawState(node, isVisible);

		if (node instanceof TreeFieldNode) {
			node.featureLayer.displayField = isVisible ? node.field.name : '';

			if (isVisible && this.#customRendererService) {
				console.log('[TreeviewStore] Applying custom renderer for field:', node.field.name);
				this.#customRendererService.applyCustomRenderer(node.featureLayer, node.field.name);
			}
		}

		this.#updateParentVisibility(node, isVisible);

		if (!isVisible && node.children?.length) {
			for (const child of node.children) {
				if (this.getVisibilityState(child.id)) {
					this.setVisibilityState(child.id, false);
				}
			}
		}

		if (!config || config.isHidden) {
			return;
		}

		// handle visibility groups
		if (config.visibilityDependencyIds?.length) {
			this.#updateDependencyVisibility(node, isVisible);
		}

		if (!config.visibilityGroupId) {
			return;
		}

		const groupId: string = config.visibilityGroupId;
		let activeNodes: string[] | undefined = this.#activeInVisibilityGroup.get(groupId);
		if (!activeNodes) {
			activeNodes = [];
			this.#activeInVisibilityGroup.set(groupId, activeNodes);
		}

		const visibilityGroupConfig: VisibilityGroupConfig | undefined =
			this.#findVisibilityGroupConfig(groupId);
		if (!visibilityGroupConfig) {
			throw new Error(`Visibility group config not found for group ID: ${groupId}`);
		}

		if (!isVisible) {
			const index = activeNodes.indexOf(nodeId);
			activeNodes.splice(index, 1);
			return;
		}

		const hideId = (id: string) => {
			this.#visibilityStates.set(id, false);
			const node = this.#treeNodesLookup.get(id);
			if (node && node instanceof TreeLayerNode) {
				node.layer.visible = false;
				this.updateDrawState(node, false);
				this.#updateParentVisibility(node, false);

				const config = this.#findTreeviewItemConfig(id);
				if (config && config.visibilityDependencyIds?.length) {
					this.#updateDependencyVisibility(node, false);
				}
			}
			const index = activeNodes.indexOf(id);
			if (index >= 0) {
				activeNodes.splice(index, 1);
			}
		};

		while (activeNodes.length >= visibilityGroupConfig.maxVisibleLayers) {
			const oldestId = activeNodes[0]; // oldest is at the front
			hideId(oldestId);
		}

		activeNodes.push(nodeId);
		this.#updateParentVisibility(node, isVisible);

		if (config.visibilityDependencyIds?.length) {
			this.#updateDependencyVisibility(node, isVisible);
		}
	}

	async updateDrawState(node: TreeNode, visible: boolean): Promise<void> {
		if (!this.#layerViewProvider) {
			return;
		}

		if (!visible) {
			this.#drawStates.delete(node.id);
			this.#drawStateHandles.get(node.id)?.remove();
			this.#drawStateHandles.delete(node.id);
			return; // don't subscribe if not visible
		}

		if (!(node instanceof TreeLayerNode) || !(node.layer instanceof Layer)) {
			return;
		}

		const layerView: LayerView | undefined = await this.#layerViewProvider.getLayerView(node.layer);
		if (!layerView) {
			return;
		}

		this.setInitialDrawState(node, layerView);

		const handle: IHandle = reactiveUtils.watch(
			() => layerView.suspended,
			(isSuspended, wasSuspended) => {
				if (wasSuspended && !isSuspended) {
					// entered scale range or otherwise unsuspended

					this.#drawStates.set(node.id, LayerDrawState.Visible);
				} else if (!wasSuspended && isSuspended) {
					// exited scale range or otherwise suspended

					this.#drawStates.set(node.id, LayerDrawState.Suspended);
				}
			}
		);

		this.#drawStateHandles.set(node.id, handle);
	}

	getNodeDrawState(nodeId: string): LayerDrawState {
		this.#checkInitialized();
		return this.#drawStates.get(nodeId) ?? LayerDrawState.Hidden;
	}

	setInitialDrawState(node: TreeNode, layerView: LayerView): void {
		if (!(node instanceof TreeLayerNode) || !(node.layer instanceof Layer)) {
			return;
		}

		if (!layerView) {
			return;
		}

		if (layerView.suspended) {
			this.#drawStates.set(node.id, LayerDrawState.Suspended);
		} else {
			this.#drawStates.set(node.id, LayerDrawState.Visible);
		}
	}

	clearDrawStateHandles(): void {
		for (const handle of this.#drawStateHandles.values()) {
			handle.remove();
		}

		this.#drawStateHandles.clear();
	}

	cleanup(): void {
		this.initialized = false;
		this.#visibilityStates.clear();
		this.#activeInVisibilityGroup.clear();
		this.#customConverters.clear();
		this.#treeNodes = [];
		this.#treeNodesLookup.clear();
		this.#drawStates.clear();
		this.clearDrawStateHandles();
	}

	#updateParentVisibility(node: TreeNode, isVisible: boolean): void {
		const parentNode = node.parent;
		if (!parentNode) {
			return;
		}

		if (!(parentNode instanceof TreeLayerNode)) {
			this.#updateParentVisibility(parentNode, isVisible);
			return;
		}

		this.#visibilityStates.set(parentNode.id, isVisible);
		parentNode.layer.visible = isVisible;
		this.#updateParentVisibility(parentNode, isVisible);
	}

	#updateDependencyVisibility(node: TreeNode, isVisible: boolean): void {
		const config = this.#findTreeviewItemConfig(node.id);
		if (!config) {
			return;
		}

		if (!config.visibilityDependencyIds?.length) {
			return;
		}

		for (const depId of config.visibilityDependencyIds) {
			const depNode = this.#treeNodesLookup.get(depId);
			if (depNode && depNode instanceof TreeLayerNode) {
				this.#visibilityStates.set(depId, isVisible);
				depNode.layer.visible = isVisible;
				this.#updateParentVisibility(depNode, isVisible);
			}
		}
	}

	#findVisibilityGroupConfig(id: string): VisibilityGroupConfig | undefined {
		if (!id) {
			return undefined;
		}

		if (!this.#configStore) {
			return undefined;
		}

		return this.#configStore.getVisibilityGroupConfig(id);
	}

	#initializeConfigurations(layers: __esri.Layer[]): void {
		if (!this.#configStore) {
			return;
		}

		this.#configStore.resolveInheritance(layers);
	}

	/**
	 * Builds a tree structure from the map layers.
	 * Applies configuration filters and reverses layer order to match expected display order.
	 * @param layers - The layers to build the tree from
	 * @returns An array of the root tree nodes
	 */
	#buildTreeFromLayers(layers: __esri.Layer[]): TreeNode[] {
		const rootNodes = layers.map((layer) => {
			return this.#layerToNode(layer, undefined);
		});

		return this.#reverseTreeOrder([...rootNodes]); // reverse the order to match expected display (map layers are typically reverse ordered)
	}

	/**
	 * Finds the configuration for a treeview item by its ID.
	 * @param id - The ID of the item to find config for
	 * @returns The item configuration or undefined if not found
	 */
	#findTreeviewItemConfig(id: string): TreeviewNodeConfig | undefined {
		if (!id) {
			return undefined;
		}

		if (!this.#configStore) {
			return undefined;
		}

		return this.#configStore.getItemConfig(id);
	}

	/**
	 * Recursively reverses the order of nodes and their children.
	 * This is needed because map layers are typically in reverse display order.
	 * @param nodes - The nodes to reverse
	 * @returns The nodes in reversed order
	 */
	#reverseTreeOrder(nodes: TreeNode[]): TreeNode[] {
		nodes.reverse();
		for (const node of nodes) {
			if (node.children?.length) {
				this.#reverseTreeOrder(node.children);
			}
		}
		return nodes;
	}

	/**
	 * Converts a map layer to a tree node, handling different layer types.
	 * Recursively processes group layers and sublayers.
	 * @param layer - The layer to convert
	 * @param parent - The parent node, if any
	 * @returns The created tree node
	 */
	#layerToNode(layer: __esri.Layer, parent?: TreeNode): TreeLayerNode {
		const nodeConfig: TreeviewNodeConfig | undefined = this.#findTreeviewItemConfig(layer.id);
		if (nodeConfig && nodeConfig.customConverterId) {
			if (!this.#customConverters.has(nodeConfig.customConverterId)) {
				throw new Error(`Custom converter not found: ${nodeConfig.customConverterId}`);
			}

			const converter = this.#customConverters.get(nodeConfig.customConverterId);
			if (!converter) {
				throw new Error(`Custom converter not found: ${nodeConfig.customConverterId}`);
			}

			return converter.layerToNode(layer, parent ?? null) as TreeLayerNode;
		}

		const node = new TreeLayerNode(layer.id, layer.title as string, layer, [], parent);
		layer.visible = nodeConfig?.disableVisibilityToggle
			? layer.visible // if disabled, keep layer visibility as is
			: nodeConfig?.isHidden
				? false
				: (nodeConfig?.isVisibleOnInit ?? false);

		this.#visibilityStates.set(layer.id, layer.visible);
		this.updateDrawState(node, layer.visible);

		if (this.#isFeatureLayer(layer) && nodeConfig?.showFields) {
			const featureLayer = layer as __esri.FeatureLayer;
			if (!featureLayer.loaded) {
				console.warn(`Layer not loaded: ${layer.id}`);
			}

			for (const field of featureLayer.fields ?? []) {
				const fieldNode = this.#fieldToNode(field, node);
				node.children.push(fieldNode);
			}
		}

		if (this.#isGroupLayer(layer)) {
			const groupLayer = layer as __esri.GroupLayer;
			node.children = groupLayer.layers.toArray().map((childLayer) => {
				return this.#layerToNode(childLayer, node);
			});
			return node;
		}

		if (this.#hasSubLayers(layer)) {
			const layerWithSublayers = layer as __esri.MapImageLayer | __esri.WMSLayer;
			if (layerWithSublayers.sublayers && layerWithSublayers.sublayers.length > 0) {
				const sublayerCollection =
					layerWithSublayers.sublayers as __esri.Collection<__esri.Sublayer>;
				node.children = sublayerCollection
					.toArray()
					.map((sublayer) => this.#sublayerToNode(sublayer, node));
			}
		}

		return node;
	}

	#fieldToNode(field: __esri.Field, parentLayerNode: TreeLayerNode): TreeFieldNode {
		const fieldNodeId: string = this.#getFieldNodeId(parentLayerNode.id, field.name);
		const fieldNode = new TreeFieldNode(
			fieldNodeId,
			field.alias || field.name,
			parentLayerNode.layer as __esri.FeatureLayer,
			field,
			[],
			parentLayerNode
		);

		const fieldItemConfig: TreeviewNodeConfig | undefined =
			this.#findTreeviewItemConfig(fieldNodeId);
		this.#visibilityStates.set(fieldNodeId, fieldItemConfig?.isVisibleOnInit ?? false);
		return fieldNode;
	}

	/**
	 * Checks if a layer has sublayers (MapImageLayer or WMSLayer).
	 * @param layer - The layer to check
	 * @returns True if the layer has sublayers
	 */
	#hasSubLayers(layer: __esri.Layer): boolean {
		return layer.type === 'map-image' || layer.type === 'wms';
	}

	/**
	 * Converts a single sublayer to a tree node.
	 * Recursively processes nested sublayers.
	 * @param subLayer - The sublayer to convert
	 * @returns The created tree node
	 */
	#sublayerToNode(subLayer: __esri.Sublayer, parent?: TreeLayerNode): TreeLayerNode {
		const layerId = subLayer.uid;

		const node = new TreeLayerNode(layerId, subLayer.title as string, subLayer, [], parent);
		if (subLayer.sublayers?.length) {
			node.children = subLayer.sublayers
				.toArray()
				.map((sublayer) => this.#sublayerToNode(sublayer, node));
		}

		const nodeConfig: TreeviewNodeConfig | undefined = this.#findTreeviewItemConfig(layerId);
		subLayer.visible = nodeConfig?.disableVisibilityToggle
			? subLayer.visible // if disabled, keep layer visibility as is
			: nodeConfig?.isHidden
				? false
				: (nodeConfig?.isVisibleOnInit ?? false);
		this.#visibilityStates.set(layerId, subLayer.visible);
		this.updateDrawState(node, subLayer.visible);
		return node;
	}

	/**
	 * Recursively adds all nodes from a tree structure to a lookup map for fast access.
	 * @param nodes - Array of tree nodes to process
	 * @param map - Map to populate with node ID -> node mappings
	 */
	#addNodesToLookupMap(nodes: TreeNode[], map: Map<string, TreeNode>): void {
		for (const node of nodes) {
			map.set(node.id, node);
			if (node.children?.length) {
				this.#addNodesToLookupMap(node.children, map);
			}
		}
	}

	#getFieldNodeId(layerId: string, fieldName: string): string {
		return `${layerId}-${fieldName}`;
	}

	/**
	 * Determines if a layer is a group layer that can contain other layers.
	 * @param layer - The layer to check
	 * @returns True if the layer is a group layer
	 */
	#isGroupLayer(layer: __esri.Layer | __esri.Sublayer): boolean {
		return layer.type === 'group';
	}

	/**
	 * Determines if a layer is a feature layer that can contain fields.
	 * @param layer - The layer to check
	 * @returns True if the layer is a feature layer
	 */
	#isFeatureLayer(layer: __esri.Layer | __esri.Sublayer): boolean {
		return layer.type === 'feature';
	}

	#checkInitialized(): void {
		if (!this.initialized) {
			throw new Error('TreeviewStore is not initialized. Call initialize() first.');
		}
	}
}
