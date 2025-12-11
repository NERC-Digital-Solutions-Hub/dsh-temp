
import * as intersectionOperator from '@arcgis/core/geometry/operators/intersectionOperator.js';
import * as unionOperator from '@arcgis/core/geometry/operators/unionOperator.js';
import Graphic from '@arcgis/core/Graphic.js';

import FeatureLayer from '@arcgis/core/layers/FeatureLayer.js';
import type GraphicsLayer from '@arcgis/core/layers/GraphicsLayer.js';
import type MapView from '@arcgis/core/views/MapView.js';
import type Extent from '@arcgis/core/geometry/Extent.js';
import type Polygon from '@arcgis/core/geometry/Polygon.js';
import type { GeometryUnion } from '@arcgis/core/unionTypes.js';

export type InputLayer = FeatureLayer | GraphicsLayer;
export type ClipLayer = FeatureLayer | GraphicsLayer;
export type ClipValue = string | number | null | undefined;

export interface ClipFeature {
    geometry: GeometryUnion;
    value: ClipValue;
}

export interface GroupedClipGeometry {
    geometry: Polygon;
    value: ClipValue;
}

/**
 * Get a union of polygon geometries by ID from a FeatureLayer or GraphicsLayer.
 *
 * @param layer - The input layer to query
 * @param polygonIds - IDs of the polygons to retrieve
 * @param explicitIdField - Optional field name for the ID
 * @param view - Optional MapView for spatial reference
 * @returns The polygon geometry or null if not found
 */
export async function getUnionPolygonGeometryByIds(
	layer: InputLayer,
	polygonIds: Array<number | string>,
	explicitIdField: string | undefined,
	view?: MapView
): Promise<Polygon | null> {
	if (!polygonIds.length) {
		return null;
	}

	if (layer.type === 'feature') {
		return getUnionPolygonFromFeatureLayer(
			layer as FeatureLayer,
			polygonIds,
			explicitIdField,
			view
		);
	}

	if (layer.type === 'graphics') {
		return getUnionPolygonFromGraphicsLayer(layer as GraphicsLayer, polygonIds, explicitIdField);
	}

	console.warn(
		'getUnionPolygonGeometryByIds: unsupported layer type:',
		(layer as unknown as { type: string }).type
	);
	return null;
}

export async function getUnionPolygonFromFeatureLayer(
	layer: FeatureLayer,
	polygonIds: Array<number | string>,
	explicitIdField: string | undefined,
	view?: MapView
): Promise<Polygon | null> {
	const fieldName = explicitIdField || layer.objectIdField || 'OBJECTID';

	const q = layer.createQuery();

	// reuse your existing buildWhereClause to build an OR expression
	const whereParts = polygonIds.map((id) => buildWhereClause(fieldName, id));
	q.where = whereParts.join(' OR ');

	q.returnGeometry = true;
	q.outFields = [];
	// allow more than one feature
	q.num = polygonIds.length || 1000;

	if (view?.spatialReference) {
		q.outSpatialReference = view.spatialReference;
	}

	const result = await layer.queryFeatures(q);
	const polygons = result.features
		.map((f) => f.geometry)
		.filter((g): g is Polygon => !!g && g.type === 'polygon');

	if (!polygons.length) {
		return null;
	}
	if (polygons.length === 1) {
		return polygons[0];
	}

	const unionResult = unionOperator.executeMany(polygons) as GeometryUnion | null | undefined;
	if (!unionResult || unionResult.type !== 'polygon') {
		return null;
	}

	return unionResult as Polygon;
}

export function getUnionPolygonFromGraphicsLayer(
	layer: GraphicsLayer,
	polygonIds: Array<number | string>,
	explicitIdField: string | undefined
): Polygon | null {
	const fieldName = explicitIdField || 'id';
	const idSet = new Set(polygonIds.map((id) => String(id)));

	const polygons: Polygon[] = [];

	layer.graphics.forEach((g) => {
		const attrs = g.attributes || {};
		const val = attrs[fieldName];

		if (val === undefined || val === null) {
			return;
		}

		if (!idSet.has(String(val))) {
			return;
		}

		const geom = g.geometry;
		if (geom && geom.type === 'polygon') {
			polygons.push(geom as Polygon);
		}
	});

	if (!polygons.length) {
		return null;
	}
	if (polygons.length === 1) {
		return polygons[0];
	}

	const unionResult = unionOperator.executeMany(polygons) as GeometryUnion | null | undefined;
	if (!unionResult || unionResult.type !== 'polygon') {
		return null;
	}

	return unionResult as Polygon;
}

export async function getGroupedClipGeometriesFromLayer(
	layer: ClipLayer,
	polygon: Polygon,
	valueField: string,
	view?: MapView
): Promise<GroupedClipGeometry[]> {
	const clipFeatures = await getClipFeatures(layer, polygon, valueField, view);

	if (!clipFeatures.length) {
		return [];
	}

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

	groups.forEach((group) => {
		const unionGeom = computeUnionOfIntersections(polygon, group.geometries);
		if (unionGeom) {
			results.push({
				geometry: unionGeom,
				value: group.value
			});
		}
	});

	return results;
}

export async function getClipFeatures(
	layer: ClipLayer,
	polygon: Polygon,
	valueField: string,
	view?: MapView
): Promise<ClipFeature[]> {
	if (layer.type === 'feature') {
		return getClipFeaturesFromFeatureLayer(layer as FeatureLayer, polygon, valueField, view);
	}

	if (layer.type === 'graphics') {
		return getClipFeaturesFromGraphicsLayer(layer as GraphicsLayer, polygon, valueField);
	}

	console.warn(
		'getClipFeatures: unsupported layer type:',
		(layer as unknown as { type: string }).type
	);
	return [];
}

export async function getClipFeaturesFromFeatureLayer(
	layer: FeatureLayer,
	polygon: Polygon,
	valueField: string,
	view?: MapView
): Promise<ClipFeature[]> {
	const q = layer.createQuery();
	q.geometry = polygon;
	q.spatialRelationship = 'intersects';
	q.returnGeometry = true;
	q.outFields = [valueField];
	q.num = 1000;

	if (view?.spatialReference) {
		q.outSpatialReference = view.spatialReference;
	}

	const result = await layer.queryFeatures(q);
	return result.features
		.filter((f) => !!f.geometry)
		.map((f) => ({
			geometry: f.geometry as GeometryUnion,
			value: f.attributes?.[valueField] as ClipValue
		}));
}

export function getClipFeaturesFromGraphicsLayer(
	layer: GraphicsLayer,
	polygon: Polygon,
	valueField: string
): ClipFeature[] {
	const polyExtent = polygon.extent as Extent | null;
	const out: ClipFeature[] = [];

	layer.graphics.forEach((g) => {
		if (!g.geometry) return;

		const geom = g.geometry as GeometryUnion;
		const gExtent = 'extent' in geom ? (geom.extent as Extent | null) : null;

		if (!polyExtent || !gExtent || extentsIntersect(polyExtent, gExtent)) {
			const attrs = g.attributes || {};
			out.push({
				geometry: geom,
				value: attrs[valueField] as ClipValue
			});
		}
	});

	return out;
}

/**
 * Validate that two geometries have matching spatial references.
 *
 * @param polygon - First polygon to check
 * @param unionClipGeometry - Second polygon to check
 * @returns True if spatial references match, false otherwise
 */
export function validateSpatialReferences(polygon: Polygon, unionClipGeometry: Polygon): boolean {
	if (
		polygon.spatialReference?.wkid !== unionClipGeometry.spatialReference?.wkid &&
		polygon.spatialReference?.wkt !== unionClipGeometry.spatialReference?.wkt
	) {
		console.error(
			'clipPolygon: polygon and union clip geometry must be in the same spatial reference.'
		);
		console.log('polygon SR', polygon.spatialReference?.toJSON());
		console.log('unionClipGeometry SR', unionClipGeometry.spatialReference?.toJSON());
		return false;
	}
	return true;
}

/**
 * Create a graphic for the clipped polygon with attributes and symbol.
 *
 * @param geometry - The clipped polygon geometry
 * @param sourceIds - The source polygon IDs
 * @param symbol - Optional custom symbol
 * @returns New Graphic representing the clipped polygon
 */
export function createClippedGraphic(
	geometry: Polygon,
	attributes: Record<string, unknown>,
	symbol?: __esri.SimpleFillSymbolProperties
): Graphic {
	return new Graphic({
		geometry,
		attributes: {
			clipped: true,
			...attributes
		},
		symbol: (symbol || {
			type: 'simple-fill',
			color: [0, 0, 0, 0.2],
			outline: {
				color: [255, 0, 0, 1],
				width: 1.5
			}
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		}) as any
	});
}

/**
 * Add a graphic to the target layer and ensure the layer is on the map.
 *
 * @param targetLayer - The layer to add the graphic to
 * @param graphic - The graphic to add
 * @param view - Optional MapView to add the layer to if not present
 */
export function addGraphicToLayer(targetLayer: GraphicsLayer, graphic: Graphic, view?: MapView): void {
	if (view?.map && !view.map.layers.includes(targetLayer)) {
		view.map.add(targetLayer);
	}
	targetLayer.add(graphic);
}

/**
 * Get polygon geometry from a FeatureLayer by ID.
 *
 * @param layer - The FeatureLayer to query
 * @param polygonId - ID of the polygon to retrieve
 * @param explicitIdField - Optional field name for the ID
 * @param view - Optional MapView for spatial reference
 * @returns The polygon geometry or null if not found
 */
export async function getPolygonFromFeatureLayer(
	layer: FeatureLayer,
	polygonId: number | string,
	explicitIdField: string | undefined,
	view?: MapView
): Promise<Polygon | null> {
	const fieldName = explicitIdField || layer.objectIdField || 'OBJECTID';

	const q = layer.createQuery();
	q.where = buildWhereClause(fieldName, polygonId);
	q.returnGeometry = true;
	q.outFields = ['*'];
	q.num = 1;

	if (view?.spatialReference) {
		q.outSpatialReference = view.spatialReference;
	}

	const result = await layer.queryFeatures(q);
	const feature = result.features[0];
	const geom = feature?.geometry;
	return geom && geom.type === 'polygon' ? (geom as Polygon) : null;
}

/**
 * Get polygon geometry from a GraphicsLayer by ID.
 *
 * @param layer - The GraphicsLayer to search
 * @param polygonId - ID of the polygon to retrieve
 * @param explicitIdField - Optional field name for the ID
 * @returns The polygon geometry or null if not found
 */
export function getPolygonFromGraphicsLayer(
	layer: GraphicsLayer,
	polygonId: number | string,
	explicitIdField: string | undefined
): Polygon | null {
	const fieldName = explicitIdField || 'id';

	const graphic = layer.graphics.find((g) => {
		const attrs = g.attributes || {};
		const val = attrs[fieldName];
		return val === polygonId || String(val) === String(polygonId);
	});

	const geom = graphic?.geometry;
	return geom && geom.type === 'polygon' ? (geom as Polygon) : null;
}

/**
 * Build a WHERE clause for querying by ID.
 *
 * @param fieldName - The field name to query
 * @param polygonId - The ID value to match
 * @returns SQL WHERE clause string
 */
export function buildWhereClause(fieldName: string, polygonId: number | string): string {
	return typeof polygonId === 'number'
		? `${fieldName} = ${polygonId}`
		: `${fieldName} = '${String(polygonId).replace(/'/g, "''")}'`;
}

/**
 * Returns a single polygon geometry representing the union of all intersection
 * results between polygon and every intersecting geometry in layer.
 *
 * @param layer - The clip layer (FeatureLayer or GraphicsLayer)
 * @param polygon - The polygon to intersect with
 * @param view - Optional MapView for spatial reference
 * @returns Union of all intersections or null if no intersections found
 */
export async function getUnionClipGeometryFromLayer(
	layer: ClipLayer,
	polygon: Polygon,
	view?: MapView
): Promise<Polygon | null> {
	const clipGeometries = await getClipGeometries(layer, polygon, view);

	if (!clipGeometries.length) {
		return null;
	}

	return computeUnionOfIntersections(polygon, clipGeometries);
}

/**
 * Get all clip geometries from the layer that intersect with the polygon.
 *
 * @param layer - The clip layer to query
 * @param polygon - The polygon to check intersection against
 * @param view - Optional MapView for spatial reference
 * @returns Array of geometries that intersect the polygon
 */
export async function getClipGeometries(
	layer: ClipLayer,
	polygon: Polygon,
	view?: MapView
): Promise<GeometryUnion[]> {
	if (layer.type === 'feature') {
		return getClipGeometriesFromFeatureLayer(layer as FeatureLayer, polygon, view);
	}

	if (layer.type === 'graphics') {
		return getClipGeometriesFromGraphicsLayer(layer as GraphicsLayer, polygon);
	}

	console.warn(
		'getClipGeometries: unsupported layer type:',
		(layer as unknown as { type: string }).type
	);
	return [];
}

/**
 * Get clip geometries from a FeatureLayer using spatial query.
 *
 * @param layer - The FeatureLayer to query
 * @param polygon - The polygon to intersect with
 * @param view - Optional MapView for spatial reference
 * @returns Array of geometries from query results
 */
export async function getClipGeometriesFromFeatureLayer(
	layer: FeatureLayer,
	polygon: Polygon,
	view?: MapView
): Promise<GeometryUnion[]> {
	const q = layer.createQuery();
	q.geometry = polygon;
	q.spatialRelationship = 'intersects';
	q.returnGeometry = true;
	q.outFields = [];
	q.num = 1000;

	if (view?.spatialReference) {
		q.outSpatialReference = view.spatialReference;
	}

	const result = await layer.queryFeatures(q);
	return result.features
		.map((f) => f.geometry as GeometryUnion | null)
		.filter((g): g is GeometryUnion => !!g);
}

/**
 * Get clip geometries from a GraphicsLayer using client-side filtering.
 *
 * @param layer - The GraphicsLayer to filter
 * @param polygon - The polygon to check intersection against
 * @returns Array of geometries that potentially intersect
 */
export function getClipGeometriesFromGraphicsLayer(
	layer: GraphicsLayer,
	polygon: Polygon
): GeometryUnion[] {
	const polyExtent = polygon.extent as Extent | null;
	const candidates: GeometryUnion[] = [];

	layer.graphics.forEach((g) => {
		if (!g.geometry) return;
		const geom = g.geometry as GeometryUnion;
		const gExtent = 'extent' in geom ? (geom.extent as Extent | null) : null;
		if (!polyExtent || !gExtent || extentsIntersect(polyExtent, gExtent)) {
			candidates.push(geom);
		}
	});

	return candidates;
}

/**
 * Compute the union of all intersections between polygon and clip geometries.
 *
 * @param polygon - The polygon to intersect with
 * @param clipGeometries - Array of geometries to intersect
 * @returns Union of all polygon intersections or null if none found
 */
export function computeUnionOfIntersections(
	polygon: Polygon,
	clipGeometries: GeometryUnion[]
): Polygon | null {
	intersectionOperator.accelerateGeometry(polygon);

	const intersections = intersectionOperator.executeMany(
		clipGeometries,
		polygon
	) as GeometryUnion[];

	if (!intersections.length) {
		return null;
	}

	const polygonIntersections = intersections.filter(
		(g): g is Polygon => !!g && g.type === 'polygon'
	);

	if (!polygonIntersections.length) {
		return null;
	}

	const unionResult = unionOperator.executeMany(polygonIntersections) as
		| GeometryUnion
		| null
		| undefined;

	if (!unionResult || unionResult.type !== 'polygon') {
		return null;
	}

	return unionResult as Polygon;
}

/**
 * Check if two extents intersect using simple numeric comparison.
 *
 * @param a - First extent to check
 * @param b - Second extent to check
 * @returns True if extents intersect, false otherwise
 */
export function extentsIntersect(a: Extent, b: Extent): boolean {
	return !(a.xmax < b.xmin || a.xmin > b.xmax || a.ymax < b.ymin || a.ymin > b.ymax);
}
