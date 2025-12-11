import {
	TreeviewNodeType,
	type InheritanceGroupConfig,
	type TreeviewConfig,
	type TreeviewNodeConfig,
	type VisibilityGroupConfig
} from '$lib/types/treeview';
import { getLayerTreeviewItemType } from '$lib/utils/treeview';
import Sublayer from '@arcgis/core/layers/support/Sublayer';

/**
 * Store class that manages treeview configuration data and provides efficient access to items and visibility groups.
 * Uses Map-based lookups for O(1) access time to configuration objects by their IDs.
 *
 * This class encapsulates the configuration data and provides a clean API for accessing
 * treeview items and visibility groups without exposing the internal data structures.
 */
export class TreeviewConfigStore {
	/** Private array storing all treeview node configurations */
	#configs: TreeviewNodeConfig[] = [];
	/** Private Map for fast O(1) lookup of treeview node configurations by their ID */
	#configLookup: Map<string, TreeviewNodeConfig> = new Map();

	/** Private array storing all visibility group configurations */
	#visibilityGroups: VisibilityGroupConfig[] = [];
	/** Private Map for fast O(1) lookup of visibility groups by their ID */
	#visibilityGroupsLookup: Map<string, VisibilityGroupConfig> = new Map();

	/** Private array storing all inheritance group configurations */
	#inheritanceGroups: InheritanceGroupConfig[] = [];
	/** Private Map for fast O(1) lookup of inheritance groups by their ID */
	#inheritanceGroupsLookup: Map<string, InheritanceGroupConfig> = new Map();

	/** Set of field names to hide from display in the treeview */
	#fieldsToHide: Set<string> = new Set<string>();

	/**
	 * Creates a new TreeviewConfigStore instance with the provided configuration.
	 *
	 * @param config - The treeview configuration object containing items and visibility groups
	 */
	constructor(config: TreeviewConfig) {
		if (!config) {
			throw new Error('TreeviewConfigStore requires a valid configuration object.');
		}

		this.#configs = config.items ?? [];
		this.#configLookup = new Map(this.#configs.map((item) => [item.id, item]));

		this.#visibilityGroups = config.visibilityGroups ?? [];
		this.#visibilityGroupsLookup = new Map(
			this.#visibilityGroups.map((group) => [group.id, group])
		);

		this.#inheritanceGroups = config.inheritanceGroups ?? [];
		this.#inheritanceGroupsLookup = new Map(
			this.#inheritanceGroups.map((group) => [group.id, group])
		);

		if (config.fieldsToHide) {
			this.#fieldsToHide = new Set(config.fieldsToHide.map((field) => field.trim().toLowerCase()));
		}
	}

	/**
	 * Retrieves the configuration for a specific treeview item by its ID.
	 *
	 * @param id - The unique identifier of the treeview item to retrieve
	 * @returns The treeview item configuration if found, undefined otherwise
	 */
	getItemConfig(id: string): TreeviewNodeConfig | undefined {
		return this.#configLookup.get(id);
	}

	/**
	 * Retrieves the configuration for a specific visibility group by its ID.
	 *
	 * @param id - The unique identifier of the visibility group to retrieve
	 * @returns The visibility group configuration if found, undefined otherwise
	 */
	getVisibilityGroupConfig(id: string): VisibilityGroupConfig | undefined {
		return this.#visibilityGroupsLookup.get(id);
	}

	/**
	 * Retrieves the configuration for a specific inheritance group by its ID.
	 *
	 * @param id - The unique identifier of the inheritance group to retrieve
	 * @returns The inheritance group configuration if found, undefined otherwise
	 */
	getInheritanceGroupConfig(id: string): InheritanceGroupConfig | undefined {
		return this.#inheritanceGroupsLookup.get(id);
	}

	resolveInheritance(layers: __esri.Layer[]): void {
		if (layers.length === 0 || !this.#configs || this.#configs.length === 0) {
			return;
		}

		// resolve inheritance groups
		for (const layer of layers) {
			const config = this.getItemConfig(layer.id);
			this.#resolveLayerInheritance(layer, config);
		}
	}

	#resolveLayerInheritance(
		layer: __esri.Layer | __esri.Sublayer,
		parentNodeConfig?: TreeviewNodeConfig
	): void {
		const nodeConfig: TreeviewNodeConfig = this.#getOrCreateLayerNodeConfig(
			layer,
			parentNodeConfig
		);

		// If the layer is a feature layer and has fields to show, create field nodes
		if (this.#isFeatureLayer(layer) && nodeConfig.showFields) {
			const featureLayer = layer as __esri.FeatureLayer;
			if (!featureLayer.loaded) {
				console.warn(`Layer not loaded: ${layer.id}`);
			}

			for (const field of featureLayer.fields ?? []) {
				this.#getOrCreateFieldNodeConfig(
					this.#getFieldNodeId(featureLayer.id, field.name),
					field.alias || field.name,
					nodeConfig
				);
			}
		}

		// If the layer is a group layer, recursively resolve inheritance for its sublayers
		if (this.#isGroupLayer(layer)) {
			const groupLayer = layer as __esri.GroupLayer;
			for (const sublayer of groupLayer.layers.toArray()) {
				this.#resolveLayerInheritance(sublayer, nodeConfig);
			}
		}

		//map image layers can also have sublayers
		if (layer.type === 'map-image') {
			const mapImageLayer = layer as __esri.MapImageLayer;
			for (const sublayer of mapImageLayer.sublayers?.toArray() ?? []) {
				this.#resolveLayerInheritance(sublayer, nodeConfig);
			}
		}
	}

	#getOrCreateLayerNodeConfig(
		layer: __esri.Layer | __esri.Sublayer,
		parentNodeConfig?: TreeviewNodeConfig
	): TreeviewNodeConfig {
		const layerId = layer instanceof Sublayer ? layer.uid : layer.id;

		const nodeConfig: TreeviewNodeConfig = this.#getOrCreateNodeConfig(layerId, parentNodeConfig);

		if (nodeConfig.type === TreeviewNodeType.None) {
			nodeConfig.type = getLayerTreeviewItemType(layer);
		}

		return nodeConfig;
	}

	#getOrCreateFieldNodeConfig(
		nodeId: string,
		fieldName: string,
		parentNodeConfig: TreeviewNodeConfig
	): TreeviewNodeConfig {
		const nodeConfig: TreeviewNodeConfig = this.#getOrCreateNodeConfig(nodeId, parentNodeConfig);

		if (nodeConfig.type === TreeviewNodeType.None) {
			nodeConfig.type = TreeviewNodeType.Field;
		}

		if (this.#fieldsToHide.has(fieldName.trim().toLowerCase())) {
			nodeConfig.isHidden = true;
		}

		return nodeConfig;
	}

	/**
	 * gets or creates the node config for a node, falling back to parent config if not defined for certain properties
	 * @param nodeId the node identifier
	 * @param parentNodeConfig the parent node config to fall back to
	 * @returns the node config or undefined if not found
	 */
	#getOrCreateNodeConfig(
		nodeId: string,
		parentNodeConfig?: TreeviewNodeConfig
	): TreeviewNodeConfig {
		let nodeConfig: TreeviewNodeConfig | undefined = this.getItemConfig(nodeId);
		const inheritanceGroup: InheritanceGroupConfig | undefined = nodeConfig?.inheritanceGroupId
			? this.getInheritanceGroupConfig(nodeConfig.inheritanceGroupId)
			: this.getInheritanceGroupConfig(parentNodeConfig?.inheritanceGroupId ?? '');

		nodeConfig = {
			id: nodeId,
			type: TreeviewNodeType.None,
			isDownloadable: this.#getConfigValue(
				inheritanceGroup,
				'isDownloadable',
				nodeConfig,
				parentNodeConfig,
				true
			),
			isVisibleOnInit: this.#getConfigValue(
				inheritanceGroup,
				'isVisibleOnInit',
				nodeConfig,
				parentNodeConfig,
				false
			),
			isHidden: this.#getConfigValue(
				inheritanceGroup,
				'isHidden',
				nodeConfig,
				parentNodeConfig,
				false
			),
			disableVisibilityToggle: this.#getConfigValue(
				inheritanceGroup,
				'disableVisibilityToggle',
				nodeConfig,
				parentNodeConfig,
				false
			),
			isOpenOnInit: this.#getConfigValue(
				inheritanceGroup,
				'isOpenOnInit',
				nodeConfig,
				parentNodeConfig,
				false
			),
			showFields: this.#getConfigValue(
				inheritanceGroup,
				'showFields',
				nodeConfig,
				parentNodeConfig,
				false
			),
			visibilityDependencyIds: this.#getConfigValue(
				inheritanceGroup,
				'visibilityDependencyIds',
				nodeConfig,
				parentNodeConfig,
				[]
			),
			visibilityGroupId: this.#getConfigValue(
				inheritanceGroup,
				'visibilityGroupId',
				nodeConfig,
				parentNodeConfig,
				undefined
			),
			customConverterId: this.#getConfigValue(
				inheritanceGroup,
				'customConverterId',
				nodeConfig,
				parentNodeConfig,
				undefined
			),
			inheritanceGroupId: this.#getConfigValue(
				inheritanceGroup,
				'inheritanceGroupId',
				nodeConfig,
				parentNodeConfig,
				undefined
			)
		};

		this.#removeItemConfig(nodeConfig); // remove existing config if present
		this.#addItemConfig(nodeConfig);

		return nodeConfig;
	}

	/* eslint-disable @typescript-eslint/no-explicit-any */
	#getConfigValue(
		inheritanceGroup: InheritanceGroupConfig | undefined,
		propertyName: keyof TreeviewNodeConfig,
		nodeConfig: TreeviewNodeConfig | undefined,
		parentNodeConfig: TreeviewNodeConfig | undefined,
		defaultValue: any
	): any {
		/* eslint-enable @typescript-eslint/no-explicit-any */
		const value = nodeConfig?.[propertyName];
		if (value !== undefined) {
			return value;
		}

		if (inheritanceGroup?.inheritedProperties.includes(propertyName)) {
			return parentNodeConfig ? (parentNodeConfig[propertyName] ?? defaultValue) : defaultValue;
		}

		return defaultValue;
	}

	#addItemConfig(item: TreeviewNodeConfig): void {
		if (this.#configLookup.has(item.id)) {
			throw new Error(`Item with id ${item.id} already exists.`);
		}

		this.#configs.push(item);
		this.#configLookup.set(item.id, item);
	}

	#removeItemConfig(item: TreeviewNodeConfig): void {
		if (!this.#configLookup.has(item.id)) {
			return;
		}

		this.#configs = this.#configs.filter((config) => config.id !== item.id);
		this.#configLookup.delete(item.id);
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
}
