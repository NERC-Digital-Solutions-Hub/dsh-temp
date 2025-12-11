/**
 * Configuration for a visibility group that controls how many layers can be visible simultaneously.
 * Visibility groups are used to enforce mutual exclusivity or limit the number of visible layers
 * within a specific group to improve performance and user experience.
 */
export interface VisibilityGroupConfig {
	/** Unique identifier for the visibility group */
	id: string;
	/** Maximum number of layers that can be visible at the same time within this group */
	maxVisibleLayers: number;
}

/*
 * Configuration for an inheritance group that defines properties inherited by child nodes.
 */
export interface InheritanceGroupConfig {
	/** Unique identifier for the inheritance group */
	id: string;
	/** List of properties that child nodes will inherit from this group */
	inheritedProperties: string[];
}

/**
 * Main configuration object for the treeview component.
 * Contains all the configuration data needed to set up treeview items and their visibility rules.
 */
export interface TreeviewConfig {
	/** Array of treeview item configurations. Optional - defaults to empty array if not provided */
	items?: TreeviewNodeConfig[];
	/** Array of visibility group configurations. Optional - defaults to empty array if not provided */
	visibilityGroups?: VisibilityGroupConfig[];

	/** Array of inheritance group configurations. Optional - defaults to empty array if not provided */
	inheritanceGroups?: InheritanceGroupConfig[];

	/** List of field names to hide from display in the treeview. Optional - defaults to no hidden fields if not provided */
	fieldsToHide?: string[];
}

/**
 * Configuration for an individual node in the treeview.
 * Defines the properties and behavior of a single treeview node, including visibility rules,
 * download capabilities, and dependencies on other node.
 */
export interface TreeviewNodeConfig {
	/** Optional name for configuration management */
	_name?: string;
	/** Unique identifier for the treeview node */
	id: string;
	/** Type of the treeview node, e.g., 'group-layer' */
	type: TreeviewNodeType;
	/** Whether this node can be downloaded by the user. Optional - defaults to false if not specified */
	isDownloadable?: boolean;
	/** Whether this node is visible on initialisation. Optional - defaults to false if not specified */
	isVisibleOnInit?: boolean;

	/** Whether this node should be hidden from the user interface AND have its layer visibility set to false. Optional - defaults to false if not specified */
	isHidden?: boolean;

	/** Whether this node can have its layer visibility changed. Optional - defaults to false if not specified */
	disableVisibilityToggle?: boolean;

	/** Whether this node is expanded/open on initialisation. Optional - defaults to false if not specified */
	isOpenOnInit?: boolean;

	/** Whether fields under this node should be shown in the user interface. Optional - defaults to false if not specified */
	showFields?: boolean;
	/** Array of node IDs that this node depends on for visibility. Optional - no dependencies if not specified */
	visibilityDependencyIds?: string[];
	/** ID of the visibility group this node belongs to. Optional - node not part of any group if not specified */
	visibilityGroupId?: string;
	/** ID of the inheritance group this node belongs to. Optional - node not part of any group if not specified */
	inheritanceGroupId?: string;
	/** Optional ID of a custom converter to use for this node, if applicable */
	customConverterId?: string;
}

export enum TreeviewNodeType {
	None = 'none',
	GroupLayer = 'group-layer',
	FeatureLayer = 'feature-layer',
	TileLayer = 'tile-layer',
	MapImageLayer = 'map-image-layer',
	Field = 'field'
}
