import * as bufferOperator from '@arcgis/core/geometry/operators/bufferOperator.js';

import Graphic from '@arcgis/core/Graphic.js';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer.js';
import type GraphicsLayer from '@arcgis/core/layers/GraphicsLayer.js';
import type MapView from '@arcgis/core/views/MapView.js';
import type Polygon from '@arcgis/core/geometry/Polygon.js';
import type { GeometryUnion } from '@arcgis/core/unionTypes.js';

import {
	addGraphicToLayer,
	computeUnionOfIntersections,
	createClippedGraphic,
	getClipFeatures,
	getClipGeometries,
	validateSpatialReferences,
	type ClipLayer,
	type ClipValue,
	type GroupedClipGeometry
} from '$lib/tools/map/utils';

interface ClipPointsOptions {
	view?: MapView;

	/** Polygon geometry or graphic to clip (typically a pre-unioned polygon) */
	input: Polygon | Graphic;

	clipLayer: ClipLayer;
	clipLayerValueField?: string;

	/** Distance to buffer the point / multipoint clip features */
	bufferDistance: number;

	/** Optional units for the buffer distance (defaults to SR units if omitted) */
	bufferUnit?: __esri.LengthUnit;

	targetLayer: GraphicsLayer;
	symbol?: __esri.SimpleFillSymbolProperties;

	/** Optional IDs of the source features that were unioned to create `input` */
	sourceIds?: Array<number | string>;
}

/**
 * Similar to clipPolygon, but uses a point/multipoint clip layer.
 * Each point/multipoint is buffered by bufferDistance to create polygons,
 * then the buffer polygons are intersected with the input polygon.
 *
 * Behaviour with clipLayerValueField mirrors clipPolygon:
 * - If clipLayerValueField is provided: one result polygon per unique value
 * - Otherwise: single unioned result
 */
export async function clipPoints(options: ClipPointsOptions): Promise<Graphic[] | null> {
	const {
		view,
		input,
		clipLayer,
		targetLayer,
		symbol,
		clipLayerValueField,
		bufferDistance,
		bufferUnit,
		sourceIds
	} = options;

	if (bufferDistance <= 0) {
		console.warn('clipPoints: bufferDistance must be greater than zero.');
		return null;
	}

	// Normalise to a Polygon geometry
	const rawGeom = input instanceof Graphic ? input.geometry : input;

	if (!rawGeom) {
		console.warn('clipPoints: no input geometry provided.');
		return null;
	}

	if (rawGeom.type !== 'polygon') {
		console.warn('clipPoints: input geometry is not a polygon.');
		return null;
	}

	const inputPolygon = rawGeom as Polygon;

	// Enforce that the clip layer is point/multipoint (for FeatureLayer case)
	if (clipLayer instanceof FeatureLayer) {
		const gt = clipLayer.geometryType;
		if (gt !== 'point' && gt !== 'multipoint') {
			console.error('clipPoints: clipLayer must be point or multipoint.');
			return null;
		}
	}

	const results: Graphic[] = [];
	const clipLayerTitle = (clipLayer as any).title || (clipLayer as any).id || 'clip-layer';

	// -----------------------------------------------------------------------
	// Per-value behaviour: one result polygon per unique value in clipLayerValueField
	// -----------------------------------------------------------------------
	if (clipLayerValueField) {
		const groupedClipGeometries = await getGroupedBufferedClipGeometriesFromLayer(
			clipLayer,
			inputPolygon,
			clipLayerValueField,
			bufferDistance,
			bufferUnit,
			view
		);

		if (!groupedClipGeometries.length) {
			console.info(
				'clipPoints: no buffered geometries in clipLayer intersect the polygon for any value.'
			);
			return null;
		}

		for (const { geometry, value } of groupedClipGeometries) {
			if (!validateSpatialReferences(inputPolygon, geometry)) {
				console.error('clipPoints: spatial reference mismatch for clip value:', value);
				continue;
			}

			const attrs = {
				clippedByPoints: true,
				sourceIds,
				layerTitle: clipLayerTitle,
				valueField: clipLayerValueField,
				value,
				bufferDistance,
				bufferUnit
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
	// Single-union behaviour (no value field):
	// union of all buffered clip geometries applied to the input polygon
	// -----------------------------------------------------------------------
	const unionClipGeometry = await getUnionBufferedClipGeometryFromLayer(
		clipLayer,
		inputPolygon,
		bufferDistance,
		bufferUnit,
		view
	);

	if (!unionClipGeometry) {
		console.info('clipPoints: no buffered geometries in clipLayer intersect the polygon.');
		return null;
	}

	if (!validateSpatialReferences(inputPolygon, unionClipGeometry)) {
		return null;
	}

	const g = createClippedGraphic(
		unionClipGeometry,
		{
			clippedByPoints: true,
			sourceIds,
			bufferDistance,
			bufferUnit
		},
		symbol
	);

	addGraphicToLayer(targetLayer, g, view);

	if (view) {
		view.goTo(unionClipGeometry).catch((err) => console.warn('goTo failed:', err));
	}

	results.push(g);
	return results;
}

/**
 * Returns a single polygon geometry representing the union of all intersection
 * results between polygon and every buffered geometry in layer.
 *
 * This is the point-layer analogue of getUnionClipGeometryFromLayer:
 * - fetch point/multipoint geometries
 * - buffer them
 * - intersect buffers with the polygon
 * - union intersections
 */
async function getUnionBufferedClipGeometryFromLayer(
	layer: ClipLayer,
	polygon: Polygon,
	bufferDistance: number,
	bufferUnit?: __esri.LengthUnit,
	view?: MapView
): Promise<Polygon | null> {
	const clipGeometries = await getClipGeometries(layer, polygon, view);

	if (!clipGeometries.length) {
		return null;
	}

	// Buffer all geometries by the same distance
	let buffered: (Polygon | null | undefined)[];
	try {
		buffered = bufferOperator.executeMany(
			clipGeometries,
			[bufferDistance],
			bufferUnit ? { unit: bufferUnit } : undefined
		) as (Polygon | null | undefined)[];
	} catch (e) {
		console.error('getUnionBufferedClipGeometryFromLayer: buffer failed', e);
		return null;
	}

	const bufferPolygons = buffered.filter((g): g is Polygon => !!g && g.type === 'polygon');

	if (!bufferPolygons.length) {
		return null;
	}

	return computeUnionOfIntersections(polygon, bufferPolygons);
}

/**
 * Like getGroupedClipGeometriesFromLayer, but for point/multipoint layers:
 * - groups by valueField
 * - buffers each geometry in the group
 * - intersects buffers with the input polygon
 * - unions intersections per value
 */
async function getGroupedBufferedClipGeometriesFromLayer(
	layer: ClipLayer,
	polygon: Polygon,
	valueField: string,
	bufferDistance: number,
	bufferUnit?: __esri.LengthUnit,
	view?: MapView
): Promise<GroupedClipGeometry[]> {
	const clipFeatures = await getClipFeatures(layer, polygon, valueField, view);

	if (!clipFeatures.length) {
		return [];
	}

	// Group ClipFeature by attribute value
	const groups = new Map<string, { value: ClipValue; geometries: GeometryUnion[] }>();

	for (const f of clipFeatures) {
		const key = f.value == null ? '__NULL__' : String(f.value);
		let group = groups.get(key);
		if (!group) {
			group = { value: f.value, geometries: [] };
			groups.set(key, group);
		}
		group.geometries.push(f.geometry);
	}

	const results: GroupedClipGeometry[] = [];
	const distances = [bufferDistance];

	for (const group of groups.values()) {
		let buffered: (Polygon | null | undefined)[];
		try {
			buffered = bufferOperator.executeMany(
				group.geometries,
				distances,
				bufferUnit ? { unit: bufferUnit } : undefined
			) as (Polygon | null | undefined)[];
		} catch (e) {
			console.error(
				'getGroupedBufferedClipGeometriesFromLayer: buffer failed for value:',
				group.value,
				e
			);
			continue;
		}

		const bufferPolygons = buffered.filter((g): g is Polygon => !!g && g.type === 'polygon');

		if (!bufferPolygons.length) {
			continue;
		}

		const unionGeom = computeUnionOfIntersections(polygon, bufferPolygons);
		if (unionGeom) {
			results.push({
				geometry: unionGeom,
				value: group.value
			});
		}
	}

	return results;
}
