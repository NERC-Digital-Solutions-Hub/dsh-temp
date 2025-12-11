// TODO: move to ./models/tree-node.ts, ./models/tree-layer-node.ts, ./models/tree-field-node.ts

/**
 * Base class representing a node in the tree view.
 * Provides common properties and structure for all tree nodes.
 */
export class TreeNode {
	/** Unique identifier for the node. */
	id: string;
	/** Display name of the node. */
	name: string;
	/** Child nodes under this node. */
	children: TreeNode[];
	/** Parent node, if any. */
	parent: TreeNode | null;

	/**
	 * Creates a new TreeNode.
	 * @param id - Unique identifier.
	 * @param name - Display name.
	 * @param children - Initial child nodes.
	 * @param parent - Parent node.
	 */
	constructor(id: string, name: string, children: TreeNode[] = [], parent: TreeNode | null = null) {
		this.id = id;
		this.name = name;
		this.children = children;
		this.parent = parent;
	}
}

/**
 * Tree node that represents an ESRI layer or sublayer.
 * Extends TreeNode with layer-specific properties.
 */
export class TreeLayerNode extends TreeNode {
	/** The associated ESRI layer or sublayer. */
	layer: __esri.Layer | __esri.Sublayer;

	/**
	 * Creates a new TreeLayerNode.
	 * @param id - Unique identifier.
	 * @param name - Display name.
	 * @param layer - The ESRI layer.
	 * @param children - Initial child nodes.
	 * @param parent - Parent node.
	 */
	constructor(
		id: string,
		name: string,
		layer: __esri.Layer | __esri.Sublayer,
		children: TreeNode[] = [],
		parent: TreeNode | null = null
	) {
		super(id, name, children, parent);
		this.layer = layer;
	}
}

/**
 * Tree node that represents a field within a feature layer.
 * Extends TreeLayerNode with field-specific properties.
 */
export class TreeFieldNode extends TreeLayerNode {
	/** The associated feature layer. */
	featureLayer: __esri.FeatureLayer;
	/** The associated field. */
	field: __esri.Field;

	/**
	 * Creates a new TreeFieldNode.
	 * @param id - Unique identifier.
	 * @param name - Display name.
	 * @param layer - The ESRI feature layer.
	 * @param field - The field.
	 * @param children - Initial child nodes.
	 * @param parent - Parent node.
	 */
	constructor(
		id: string,
		name: string,
		layer: __esri.FeatureLayer,
		field: __esri.Field,
		children: TreeNode[] = [],
		parent: TreeNode | null = null
	) {
		super(id, name, layer, children, parent);
		this.field = field;
		this.featureLayer = layer;
	}
}

/**
 * Enumeration of possible selection states for a node.
 */
export enum SelectionState {
	/** Node is not selected for download. */
	Inactive = 'inactive',
	/** Node is partially selected (some children selected). */
	Indeterminate = 'indeterminate',
	/** Node is fully selected for download. */
	Active = 'active'
}

/**
 * Enumeration of possible draw states for a layer.
 * Used to represent if a layer is currently visible on the map.
 */
export enum LayerDrawState {
	/** Layer is not visible on the map. */
	Hidden = 'hidden',

	/** Layer is ABLE TO be visible on the map but not yet visible. E.g. if LOD is not met, the layer has suspended visibility. */
	Suspended = 'suspended',

	/** Layer is currently visible on the map. */
	Visible = 'visible'
}
