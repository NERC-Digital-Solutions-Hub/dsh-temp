import Graphic from '@arcgis/core/Graphic.js';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer.js';
import type GraphicsLayer from '@arcgis/core/layers/GraphicsLayer.js';
import type MapView from '@arcgis/core/views/MapView.js';
import type Polygon from '@arcgis/core/geometry/Polygon.js';
import {
	addGraphicToLayer,
	createClippedGraphic,
	getGroupedClipGeometriesFromLayer,
	getUnionClipGeometryFromLayer,
	validateSpatialReferences,
	type ClipLayer
} from '$lib/tools/map/utils';

interface ClipPolygonOptions {
	view?: MapView;

	/** The polygon geometry or graphic to clip (typically a pre-unioned polygon) */
	input: Polygon | Graphic;

	clipLayer: ClipLayer;
	clipLayerValueField?: string;
	targetLayer: GraphicsLayer;
	symbol?: __esri.SimpleFillSymbolProperties;

	/** Optional IDs of the source features that were unioned to create `input` */
	sourceIds?: Array<number | string>;
}

/**
 * Intersects a polygon geometry/graphic with all intersecting clip geometries
 * from clipLayer, unions the intersection pieces, and adds the final clipped
 * polygon(s) to targetLayer.
 *
 * Behaviour:
 * - If clipLayerValueField is provided: one result polygon per unique value in that field
 * - Otherwise: a single union of all clip geometries intersecting the input polygon
 *
 * @param options.view - MapView for auto-adding target layer and zooming to result
 * @param options.input - Polygon geometry or Graphic to be clipped (usually already unioned)
 * @param options.clipLayer - Layer providing clip geometries
 * @param options.clipLayerValueField - Optional field name in clipLayer used to split results
 * @param options.targetLayer - GraphicsLayer where clipped polygon(s) will be added
 * @param options.symbol - Optional symbol override for the clipped polygon(s)
 * @param options.sourceIds - Optional IDs of original polygons that were unioned into `input`
 */
export async function clipPolygon(options: ClipPolygonOptions): Promise<Graphic[] | null> {
	const { view, input, clipLayer, targetLayer, symbol, clipLayerValueField, sourceIds } = options;

	// Normalise to a Polygon geometry
	const rawGeom = input instanceof Graphic ? input.geometry : input;

	if (!rawGeom) {
		console.warn('clipPolygon: no input geometry provided.');
		return null;
	}

	if (rawGeom.type !== 'polygon') {
		console.warn('clipPolygon: input geometry is not a polygon.');
		return null;
	}

	const inputPolygon = rawGeom as Polygon;

	if (clipLayer instanceof FeatureLayer && clipLayer.geometryType !== 'polygon') {
		console.error('clipPolygon: clipLayer is not of polygon geometry type.');
		return null;
	}

	const results: Graphic[] = [];

	// -----------------------------------------------------------------------
	// Per-value behaviour (one result polygon per unique value)
	// -----------------------------------------------------------------------
	if (clipLayerValueField) {
		const groupedClipGeometries = await getGroupedClipGeometriesFromLayer(
			clipLayer,
			inputPolygon,
			clipLayerValueField,
			view
		);

		if (!groupedClipGeometries.length) {
			console.info('clipPolygon: no geometries in clipLayer intersect the polygon for any value.');
			return null;
		}

		const clipLayerTitle = (clipLayer as any).title || (clipLayer as any).id || 'clip-layer';

		for (const { geometry, value } of groupedClipGeometries) {
			if (!validateSpatialReferences(inputPolygon, geometry)) {
				console.error('clipPolygon: spatial reference mismatch for clip value:', value);
				continue;
			}

			const attrs = {
				sourceIds,
				layerTitle: clipLayerTitle,
				valueField: clipLayerValueField,
				value
			};

			const g = createClippedGraphic(geometry, attrs, symbol);
			addGraphicToLayer(targetLayer, g, view);
			results.push(g);
		}

		if (!results.length) {
			return null;
		}

		if (view) {
			view.goTo(results.map((g) => g.geometry)).catch((err) => console.warn('goTo failed:', err));
		}

		return results;
	}

	// -----------------------------------------------------------------------
	// Single-union behaviour (no value field)
	// -----------------------------------------------------------------------
	const unionClipGeometry = await getUnionClipGeometryFromLayer(clipLayer, inputPolygon, view);
	if (!unionClipGeometry) {
		console.info('clipPolygon: no geometries in clipLayer intersect the polygon.');
		return null;
	}

	if (!validateSpatialReferences(inputPolygon, unionClipGeometry)) {
		return null;
	}

	const g = createClippedGraphic(unionClipGeometry, { sourceIds }, symbol);
	addGraphicToLayer(targetLayer, g, view);

	if (view) {
		view.goTo(unionClipGeometry).catch((err) => console.warn('goTo failed:', err));
	}

	results.push(g);
	return results;
}
