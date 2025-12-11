import GroupLayerIcon from '$lib/assets/layers-16.svg?raw';
import FeatureLayerIcon from '$lib/assets/feature-layer-16.svg?raw';
import TileLayerIcon from '$lib/assets/tile-layer-16.svg?raw';

/**
 * SVG path for an open folder icon.
 */
const OPEN_FOLDER_ICON = `<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>`;

/**
 * SVG path for a closed folder icon.
 */
const CLOSED_FOLDER_ICON = `<path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>`;

/**
 * SVG path for a file icon.
 */
const FILE_ICON = `<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14,2 14,8 20,8"/>`;

/**
 * Determines the appropriate icon for a tree node based on layer type and state.
 * @param layer - The ESRI layer or sublayer to get an icon for.
 * @param useLayerTypeIcon - Whether to use layer-specific icons instead of generic folder/file icons.
 * @param isFolder - Whether the node represents a folder (has children).
 * @param isOpen - Whether the folder is open (only relevant for folders).
 * @returns The SVG icon as a string.
 */
export const getNodeIcon = (
	layer: __esri.Layer | __esri.Sublayer,
	useLayerTypeIcon: boolean,
	isFolder: boolean,
	isOpen: boolean
): string => {
	if (useLayerTypeIcon) {
		return getLayerIcon(layer, isFolder);
	}

	// Use default icons based on node type
	if (isFolder) {
		return isOpen ? OPEN_FOLDER_ICON : CLOSED_FOLDER_ICON;
	}

	return FILE_ICON;
};

/**
 * Gets the layer-specific icon based on the layer type.
 * @param layer - The ESRI layer or sublayer.
 * @param isFolder - Whether the node is a folder (fallback if type unknown).
 * @returns The SVG icon as a string.
 */
export const getLayerIcon = (layer: __esri.Layer | __esri.Sublayer, isFolder: boolean): string => {
	const layerType = layer.type;

	switch (layerType) {
		case 'group':
			return GroupLayerIcon;
		case 'feature':
			return FeatureLayerIcon;
		case 'tile':
			return TileLayerIcon;
		default:
			// Fallback to generic icons
			return isFolder ? GroupLayerIcon : FeatureLayerIcon;
	}
};
