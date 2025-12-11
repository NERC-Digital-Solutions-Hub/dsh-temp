import { TreeviewNodeType } from '$lib/types/treeview';

export function getLayerTreeviewItemType(layer: __esri.Layer | __esri.Sublayer): TreeviewNodeType {
	switch (layer.type) {
		case 'group':
			return TreeviewNodeType.GroupLayer;
		case 'feature':
			return TreeviewNodeType.FeatureLayer;
		case 'tile':
			return TreeviewNodeType.TileLayer;
		case 'map-image':
			return TreeviewNodeType.MapImageLayer;
		case 'sublayer':
			return TreeviewNodeType.TileLayer;
		default:
			throw new Error(`Unsupported layer type: ${layer.type}`);
	}
}
