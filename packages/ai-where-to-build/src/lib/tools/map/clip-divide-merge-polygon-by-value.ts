import * as intersectionOperator from '@arcgis/core/geometry/operators/intersectionOperator.js';
import Graphic from '@arcgis/core/Graphic.js';
import type FeatureLayer from '@arcgis/core/layers/FeatureLayer.js';
import type GraphicsLayer from '@arcgis/core/layers/GraphicsLayer.js';
import type MapView from '@arcgis/core/views/MapView.js';
import type Polygon from '@arcgis/core/geometry/Polygon.js';
import type { GeometryUnion } from '@arcgis/core/unionTypes.js';

import { mergeClippedPolygonsByLayerAndValue } from './merge-clipped-polygons-by-layer-value.js';

interface ClipLayerConfig {
	/** Layer to clip against (usually FeatureLayer) */
	layer: FeatureLayer | GraphicsLayer;
	/** Field in that layer that contains the value you care about */
	valueField: string;
}

interface ClipDivideMergeOptions {
	view: MapView;
	inputLayer: FeatureLayer | GraphicsLayer;
	polygonId: number | string;
	idField?: string;
	clipLayers: ClipLayerConfig[];
	targetLayer: GraphicsLayer;
}

/**
 * 1. Clip the input polygon against all clipLayers (keeping value per feature)
 * 2. Overlay/split all clipped pieces by layer+value combinations
 * 3. Merge pieces that share the same set of (layer, value)
 *
 * Returns the final merged graphics added to targetLayer.
 */
export async function clipDivideMergeByValue(options: ClipDivideMergeOptions): Promise<Graphic[]> {
	const { view, inputLayer, polygonId, idField, clipLayers, targetLayer } = options;

	// Start from a clean target layer
	targetLayer.removeAll();

	// 1. Get the base input polygon (parcel etc.)
	const basePolygon = await getPolygonGeometryById(inputLayer, polygonId, idField, view);
	if (!basePolygon) {
		console.warn('clipDivideMergeByValue: base polygon not found.');
		return [];
	}

	// 2. Clip each clipLayer by the base polygon, creating one candidate per
	//    (layer feature, value) combination.
	const candidates: Graphic[] = [];

	for (const cfg of clipLayers) {
		const { layer, valueField } = cfg;

		if (layer.type === 'feature') {
			const fl = layer as FeatureLayer;

			const q = fl.createQuery();
			q.geometry = basePolygon;
			q.spatialRelationship = 'intersects';
			q.returnGeometry = true;
			q.outFields = [valueField, fl.objectIdField || 'OBJECTID'];
			if (view.spatialReference) {
				q.outSpatialReference = view.spatialReference;
			}

			const result = await fl.queryFeatures(q);
			for (const feat of result.features) {
				const geom = feat.geometry as GeometryUnion | null;
				if (!geom || geom.type !== 'polygon') continue;

				const inter = intersectionOperator.execute(geom, basePolygon) as Polygon | null | undefined;
				if (!inter || inter.type !== 'polygon') continue;

				const val = feat.attributes[valueField];

				const g = new Graphic({
					geometry: inter as Polygon,
					attributes: {
						sourceId: polygonId,
						layerId: fl.id,
						layerTitle: fl.title,
						valueField,
						value: val
					}
				});

				candidates.push(g);
			}
		} else if (layer.type === 'graphics') {
			const gl = layer as GraphicsLayer;
			gl.graphics.forEach((g) => {
				if (!g.geometry || g.geometry.type !== 'polygon') return;

				const inter = intersectionOperator.execute(g.geometry as Polygon, basePolygon) as
					| Polygon
					| null
					| undefined;
				if (!inter || inter.type !== 'polygon') return;

				const attrs = g.attributes ?? {};
				const val = attrs[valueField];

				const clipped = new Graphic({
					geometry: inter as Polygon,
					attributes: {
						sourceId: polygonId,
						layerId: gl.id,
						layerTitle: gl.title,
						valueField,
						value: val
					}
				});

				candidates.push(clipped);
			});
		} else {
			console.warn('clipDivideMergeByValue: skipping unsupported layer type:', layer);
		}
	}

	if (!candidates.length) {
		console.info('clipDivideMergeByValue: no clipped candidates created.');
		return [];
	}

	// Add raw candidates (optional, mainly for debugging)
	targetLayer.addMany(candidates);

	// 3. Overlay/split & merge by layer+value combos
	const merged = mergeClippedPolygonsByLayerAndValue(targetLayer, {
		sourceId: polygonId
	});

	return merged;
}

/* -------------------------------------------------------------------------- */
/*                               Helper methods                               */
/* -------------------------------------------------------------------------- */

async function getPolygonGeometryById(
	layer: FeatureLayer | GraphicsLayer,
	polygonId: number | string,
	explicitIdField: string | undefined,
	view?: MapView
): Promise<Polygon | null> {
	if (layer.type === 'feature') {
		const fl = layer as FeatureLayer;
		const fieldName = explicitIdField || fl.objectIdField || 'OBJECTID';

		const q = fl.createQuery();
		q.where =
			typeof polygonId === 'number'
				? `${fieldName} = ${polygonId}`
				: `${fieldName} = '${String(polygonId).replace(/'/g, "''")}'`;
		q.returnGeometry = true;
		q.outFields = ['*'];
		q.num = 1;

		if (view?.spatialReference) {
			q.outSpatialReference = view.spatialReference;
		}

		const result = await fl.queryFeatures(q);
		const feature = result.features[0];
		const geom = feature?.geometry;
		return geom && geom.type === 'polygon' ? (geom as Polygon) : null;
	}

	if (layer.type === 'graphics') {
		const gl = layer as GraphicsLayer;
		const fieldName = explicitIdField || 'id';

		const graphic = gl.graphics.find((g) => {
			const attrs = g.attributes || {};
			const v = attrs[fieldName];
			return v === polygonId || String(v) === String(polygonId);
		});

		const geom = graphic?.geometry;
		return geom && geom.type === 'polygon' ? (geom as Polygon) : null;
	}

	console.warn('getPolygonGeometryById: unsupported layer type:', (layer as any).type);
	return null;
}
