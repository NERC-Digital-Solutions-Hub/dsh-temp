import type {
	DataSelectionSnapshot,
	DataSelectionStore
} from '$lib/stores/data-selection-store.svelte';
import {
	SelectionState,
	TreeNode,
	TreeFieldNode,
	TreeLayerNode
} from '$lib/components/tree-view/types';
import { SvelteSet } from 'svelte/reactivity';
import type { TreeviewConfigStore } from '$lib/stores/treeview-config-store';

/**
 * Controller for managing treeview selection state.
 *
 * This class provides methods to update and retrieve the selection state
 */
export class TreeviewSelectionController {
	#dataSelectionStore: DataSelectionStore;
	#treeviewConfigStore: TreeviewConfigStore;

	/**
	 * Creates an instance of TreeviewSelectionController.
	 *
	 * @param dataSelectionStore - The DataSelectionStore instance to manage selections.
	 * @param treeviewConfigStore - The TreeviewConfigStore instance for configuration data.
	 */
	constructor(dataSelectionStore: DataSelectionStore, treeviewConfigStore: TreeviewConfigStore) {
		this.#dataSelectionStore = dataSelectionStore;
		this.#treeviewConfigStore = treeviewConfigStore;
	}

	/**
	 * Update the selection state for a node in the tree.
	 *
	 * This method routes the update to the appropriate handler depending on
	 * whether the node is a layer node, a field node or a generic node with
	 * children. For non-layer nodes, the children are updated recursively.
	 *
	 * @param node - The TreeNode to update.
	 * @param state - The desired DownloadState for the node.
	 */
	public updateSelection(node: TreeNode, state: SelectionState) {
		const nodeConfig = this.#treeviewConfigStore.getItemConfig(node.id);
		if (nodeConfig?.isHidden) {
			return; // hidden nodes should not be selectable
		}

		if (!(node instanceof TreeLayerNode)) {
			// in this case, either all its children are selected or none are.
			this.updateChildrenSelection(node, state);
			return;
		}

		if (node instanceof TreeFieldNode) {
			this.updateFieldSelection(node, state);
			return;
		}

		this.updateLayerSelection(node, state);
	}

	/**
	 * Get the DownloadState for a node.
	 *
	 * For non-layer nodes or group layers the state is derived from their
	 * children's states. For field nodes the state is Active when the field
	 * is present in the corresponding DataSelection.fields set. For regular
	 * layer nodes without visible fields, the presence of a DataSelection
	 * entry indicates Active, otherwise Inactive.
	 *
	 * @param node - The TreeNode to inspect.
	 * @returns The computed DownloadState for the node.
	 */
	public getSelectionState(node: TreeNode): SelectionState {
		if (!(node instanceof TreeLayerNode)) {
			return this.determineSelectionStateFromChildren(node);
		}

		if (this.isGroupLayer(node) || this.hasSublayers(node)) {
			return this.determineSelectionStateFromChildren(node);
		}

		let selection;
		if (node instanceof TreeFieldNode) {
			selection = this.#dataSelectionStore.getSelection(node.featureLayer.id);
			if (!selection) {
				return SelectionState.Inactive;
			}

			return selection.selectedFieldIds.has(node.field.name)
				? SelectionState.Active
				: SelectionState.Inactive;
		}

		selection = this.#dataSelectionStore.getSelection(node.id);
		if (!selection) {
			return SelectionState.Inactive;
		}

		// if the layer has fields shown, check if all fields are selected...
		if (this.isFeatureLayer(node) && node.children && node.children.length > 0) {
			return this.determineSelectionStateFromChildren(node);
		}

		return SelectionState.Active;
	}

	/**
	 * Update selection for a layer node.
	 *
	 * - When activating: ensures a DataSelection exists for non-group
	 *   layers and propagates the Active state to children.
	 * - When deactivating: removes the DataSelection for non-group layers
	 *   and propagates Inactive to children (useful for group layers).
	 *
	 * @param node - The TreeLayerNode to update.
	 * @param state - The desired DownloadState for the layer.
	 */
	private updateLayerSelection(node: TreeLayerNode, state: SelectionState) {
		let selection = this.#dataSelectionStore.getSelection(node.id);

		switch (state) {
			case SelectionState.Active:
				if (!selection && !this.isGroupLayer(node) && !this.hasSublayers(node)) {
					selection = this.createAndAddDataSelection(node.id);
				}

				for (const child of node.children || []) {
					this.updateSelection(child, state);
				}
				break;
			case SelectionState.Inactive:
				if (selection && !this.isGroupLayer(node) && !this.hasSublayers(node)) {
					this.#dataSelectionStore.removeSelection(node.id);
				}

				this.updateChildrenSelection(node, state); // if group layer, unselect all children
				break;
		}
	}

	/**
	 * Update selection when toggling an individual field.
	 *
	 * Activating will ensure a DataSelection exists for the feature layer
	 * and will add the field name to the selection.fields set. Deactivating
	 * will remove the field from the set and remove the overall selection if
	 * no fields remain selected.
	 *
	 * @param node - The TreeFieldNode representing the field.
	 * @param state - The desired DownloadState for the field.
	 */
	private updateFieldSelection(node: TreeFieldNode, state: SelectionState) {
		let selection = this.#dataSelectionStore.getSelection(node.featureLayer.id);

		switch (state) {
			case SelectionState.Active:
				if (!selection) {
					selection = this.createAndAddDataSelection(node.featureLayer.id);
				}

				this.#dataSelectionStore.addOrUpdateSelection(node.featureLayer.id, [
					...selection.selectedFieldIds,
					node.field.name
				]);
				break;
			case SelectionState.Inactive: {
				if (!selection) {
					break;
				}

				const updatedFieldIds = new SvelteSet<string>(selection.selectedFieldIds);
				updatedFieldIds.delete(node.field.name);
				this.#dataSelectionStore.addOrUpdateSelection(node.featureLayer.id, [...updatedFieldIds]);

				// selection.selectedFieldIds.delete(node.field.name);
				if (updatedFieldIds.size === 0) {
					this.#dataSelectionStore.removeSelection(selection.layerId);
				}
				break;
			}
		}
	}

	/**
	 * Recursively update the selection state for all children of the node.
	 *
	 * This helper iterates over the node's children (if any) and applies the
	 * provided state to each child using updateSelection.
	 *
	 * @param node - The TreeNode whose children should be updated.
	 * @param state - The DownloadState to apply to each child.
	 */
	private updateChildrenSelection(node: TreeNode, state: SelectionState) {
		for (const child of node.children || []) {
			this.updateSelection(child, state);
		}
	}

	/**
	 * Determine a node's DownloadState based on its children's states.
	 *
	 * Counts Active (and partially-active feature layers) children. If any
	 * child is Indeterminate, the result is Indeterminate. If none are
	 * selected the result is Inactive. If all are selected the result is
	 * Active. Otherwise the result is Indeterminate.
	 *
	 * @param node - The parent node to evaluate.
	 * @returns The aggregated DownloadState derived from the children.
	 */
	private determineSelectionStateFromChildren(node: TreeNode): SelectionState {
		let selectedCount = 0;
		let totalCount = 0;

		for (const child of node.children || []) {
			const nodeConfig = this.#treeviewConfigStore.getItemConfig(child.id);
			if (nodeConfig?.isHidden) {
				continue; // skip hidden nodes
			}

			totalCount++;
			const childState = this.getSelectionState(child);
			if (
				childState === SelectionState.Active ||
				(this.isFeatureLayer(child) && childState !== SelectionState.Inactive) // NOTE: This condition ensures that feature layers with some fields selected are counted as active
			) {
				selectedCount++;
			} else if (childState === SelectionState.Indeterminate) {
				return SelectionState.Indeterminate;
			}
		}

		if (selectedCount === 0) {
			return SelectionState.Inactive;
		}

		if (selectedCount === totalCount) {
			return SelectionState.Active;
		}

		return SelectionState.Indeterminate;
	}

	/**
	 * Create a new DataSelection object and add it to the store.
	 *
	 * The created DataSelection will have an empty SvelteSet for fields.
	 * The selection is added to DataSelections via addSelection and the
	 * created object is returned for immediate use.
	 *
	 * @param id - The layer id to use for the DataSelection.layerId.
	 * @returns The newly created DataSelection.
	 */
	private createAndAddDataSelection(id: string): DataSelectionSnapshot {
		const selection: DataSelectionSnapshot = {
			layerId: id,
			selectedFieldIds: new SvelteSet<string>()
		};

		this.#dataSelectionStore.addSelection(selection);
		return selection;
	}

	/**
	 * Predicate that returns true when the provided node is a group layer.
	 *
	 * @param node - The TreeNode to test.
	 * @returns True if the node is a TreeLayerNode with type 'group'.
	 */
	private isGroupLayer(node: TreeNode): boolean {
		return node instanceof TreeLayerNode && node.layer.type === 'group';
	}

	/**
	 * Predicate that returns true when the provided node has sublayers.
	 *
	 * @param node - The TreeNode to test.
	 * @returns True if the node is a TreeLayerNode with sublayers.
	 */
	private hasSublayers(node: TreeNode): boolean {
		if (!(node instanceof TreeLayerNode)) return false;

		// Check for MapImageLayer or WMSLayer
		if (node.layer.type === 'map-image' || node.layer.type === 'wms') {
			return true;
		}

		// Check for Sublayer with sublayers
		const layer = node.layer as any;
		return !!(layer.sublayers && layer.sublayers.length > 0);
	}

	/**
	 * Predicate that returns true when the provided node is a feature layer.
	 *
	 * @param node - The TreeNode to test.
	 * @returns True if the node is a TreeLayerNode with type 'feature'.
	 */
	private isFeatureLayer(node: TreeNode): boolean {
		return node instanceof TreeLayerNode && node.layer.type === 'feature';
	}
}
