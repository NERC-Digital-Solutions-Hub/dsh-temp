// clip-and-merge.ts

import * as intersectionOperator from '@arcgis/core/geometry/operators/intersectionOperator.js';
import * as differenceOperator from '@arcgis/core/geometry/operators/differenceOperator.js';
import * as unionOperator from '@arcgis/core/geometry/operators/unionOperator.js';
import Graphic from '@arcgis/core/Graphic.js';

import type FeatureLayer from '@arcgis/core/layers/FeatureLayer.js';
import type GraphicsLayer from '@arcgis/core/layers/GraphicsLayer.js';
import type MapView from '@arcgis/core/views/MapView.js';
import type Polygon from '@arcgis/core/geometry/Polygon.js';
import type Extent from '@arcgis/core/geometry/Extent.js';
import type { GeometryUnion } from '@arcgis/core/unionTypes.js';

type InputLayer = FeatureLayer | GraphicsLayer;
type ClipLayer = FeatureLayer | GraphicsLayer;

interface ClipAndMergeOptions {
	view?: MapView;
	inputLayer: InputLayer;
	polygonId: number | string;
	idField?: string;
	clipLayers: ClipLayer[];
	targetLayer: GraphicsLayer;
	/** Optional symbol factory based on combo of layers */
	symbolForCombo?: (
		comboKey: string,
		layerIds: string[],
		layerTitles: string[]
	) => __esri.SimpleFillSymbolProperties;
}

interface Piece {
	geometry: Polygon;
	/** “Member” graphics are just in-memory, not on a layer */
	members: Graphic[];
}

/**
 * One-pass tool that clips and merges polygons:
 * 1. Gets the input polygon (parcel)
 * 2. For each clip layer, gets features intersecting the parcel and clips them
 * 3. Overlays/splits all clipped pieces so overlaps become separate regions
 * 4. Groups by layer combination, unions within each group, and adds to target layer
 *
 * @param options - Configuration options for clipping and merging
 * @param options.view - Optional MapView for spatial reference and adding target layer
 * @param options.inputLayer - Layer containing the polygon to be clipped
 * @param options.polygonId - ID of the polygon inside inputLayer
 * @param options.idField - Field name holding polygonId (defaults to objectIdField or "id")
 * @param options.clipLayers - Array of layers providing clip geometries
 * @param options.targetLayer - GraphicsLayer where merged polygons will be added
 * @param options.symbolForCombo - Optional symbol factory based on layer combination
 * @returns The final graphics that were added to the target layer
 */
export async function clipAndMergePolygons(options: ClipAndMergeOptions): Promise<Graphic[]> {
	const { view, inputLayer, polygonId, idField, clipLayers, targetLayer, symbolForCombo } = options;

	const polygon = await getPolygonGeometryById(inputLayer, polygonId, idField, view);
	if (!polygon) {
		console.warn('clipAndMergePolygon: polygon not found for id:', polygonId);
		return [];
	}
	if (polygon.type !== 'polygon') {
		console.warn('clipAndMergePolygon: input geometry is not a polygon.');
		return [];
	}

	const sr = getSpatialReference(view, polygon);

	intersectionOperator.accelerateGeometry(polygon);

	const initialCandidates = await collectAllClippedPieces(clipLayers, polygon, sr, polygonId);

	if (!initialCandidates.length) {
		console.info('clipAndMergePolygon: no clip geometries intersect the polygon.');
		return [];
	}

	const finalGraphics = overlayAndGroupCandidates(initialCandidates, symbolForCombo);

	addGraphicsToLayer(targetLayer, finalGraphics, view);

	return finalGraphics;
}

/* -------------------------------------------------------------------------- */
/*                               Helper methods                               */
/* -------------------------------------------------------------------------- */

import type { default as FeatureLayerType } from '@arcgis/core/layers/FeatureLayer.js';

/**
 * Get spatial reference from view or fallback to polygon's spatial reference.
 *
 * @param view - Optional MapView
 * @param polygon - The polygon to get spatial reference from
 * @returns The spatial reference to use
 */
function getSpatialReference(view: MapView | undefined, polygon: Polygon): __esri.SpatialReference {
	const sr = view?.spatialReference ?? polygon.spatialReference;
	if (view && polygon.spatialReference && sr && polygon.spatialReference.wkid !== sr.wkid) {
		console.warn(
			'clipAndMergePolygon: input polygon SR does not match view SR; ' +
				'ensure queries use outSpatialReference = view.spatialReference.'
		);
	}
	return sr;
}

/**
 * Collect all clipped pieces from all clip layers in parallel.
 *
 * @param clipLayers - Array of layers to clip from
 * @param polygon - The polygon to clip with
 * @param sr - Spatial reference to use
 * @param polygonId - ID of the source polygon
 * @returns Flattened array of all clipped graphics
 */
async function collectAllClippedPieces(
	clipLayers: ClipLayer[],
	polygon: Polygon,
	sr: __esri.SpatialReference,
	polygonId: number | string
): Promise<Graphic[]> {
	const piecesPerLayer = await Promise.all(
		clipLayers.map((layer) => collectClippedPiecesForLayer(layer, polygon, sr, polygonId))
	);
	return piecesPerLayer.flat();
}

/**
 * Add graphics to target layer and ensure the layer is on the map.
 *
 * @param targetLayer - The layer to add graphics to
 * @param graphics - The graphics to add
 * @param view - Optional MapView to add the layer to if not present
 */
function addGraphicsToLayer(targetLayer: GraphicsLayer, graphics: Graphic[], view?: MapView): void {
	if (view?.map && !view.map.layers.includes(targetLayer)) {
		view.map.add(targetLayer);
	}
	targetLayer.addMany(graphics);
}

/**
 * Get polygon geometry by ID from a FeatureLayer or GraphicsLayer.
 *
 * @param layer - The input layer to query
 * @param polygonId - ID of the polygon to retrieve
 * @param explicitIdField - Optional field name for the ID
 * @param view - Optional MapView for spatial reference
 * @returns The polygon geometry or null if not found
 */
async function getPolygonGeometryById(
	layer: InputLayer,
	polygonId: number | string,
	explicitIdField: string | undefined,
	view?: MapView
): Promise<Polygon | null> {
	if (layer.type === 'feature') {
		return getPolygonFromFeatureLayer(layer as FeatureLayerType, polygonId, explicitIdField, view);
	}

	if (layer.type === 'graphics') {
		return getPolygonFromGraphicsLayer(layer as GraphicsLayer, polygonId, explicitIdField);
	}

	console.warn(
		'getPolygonGeometryById: unsupported layer type:',
		(layer as unknown as { type: string }).type
	);
	return null;
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
async function getPolygonFromFeatureLayer(
	layer: FeatureLayerType,
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
function getPolygonFromGraphicsLayer(
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
function buildWhereClause(fieldName: string, polygonId: number | string): string {
	return typeof polygonId === 'number'
		? `${fieldName} = ${polygonId}`
		: `${fieldName} = '${String(polygonId).replace(/'/g, "''")}'`;
}

/**
 * For a given clip layer, return clipped pieces (Graphics) already intersected
 * with the input polygon. These are NOT added to any layer; they’re just
 * in-memory candidates for the overlay step.
 */
/**
 * For a given clip layer, return clipped pieces (Graphics) already intersected
 * with the input polygon. These are in-memory candidates for the overlay step.
 *
 * @param layer - The clip layer to process
 * @param polygon - The polygon to clip with
 * @param sr - Spatial reference to use
 * @param sourceId - ID of the source polygon
 * @returns Array of clipped graphics
 */
async function collectClippedPiecesForLayer(
	layer: ClipLayer,
	polygon: Polygon,
	sr: __esri.SpatialReference,
	sourceId: number | string
): Promise<Graphic[]> {
	if (layer.type === 'feature') {
		return collectClippedPiecesFromFeatureLayer(layer as FeatureLayer, polygon, sr, sourceId);
	}

	if (layer.type === 'graphics') {
		return collectClippedPiecesFromGraphicsLayer(layer as GraphicsLayer, polygon, sourceId);
	}

	console.warn(
		'collectClippedPiecesForLayer: unsupported layer type:',
		(layer as unknown as { type: string }).type
	);
	return [];
}

/**
 * Collect clipped pieces from a FeatureLayer using spatial query.
 *
 * @param layer - The FeatureLayer to query
 * @param polygon - The polygon to clip with
 * @param sr - Spatial reference to use
 * @param sourceId - ID of the source polygon
 * @returns Array of clipped graphics
 */
async function collectClippedPiecesFromFeatureLayer(
	layer: FeatureLayer,
	polygon: Polygon,
	sr: __esri.SpatialReference,
	sourceId: number | string
): Promise<Graphic[]> {
	const q = layer.createQuery();
	q.geometry = polygon;
	q.spatialRelationship = 'intersects';
	q.returnGeometry = true;
	q.outFields = [];
	q.num = 2000;

	if (sr) {
		q.outSpatialReference = sr;
	}

	const result = await layer.queryFeatures(q);
	const clipGeoms: GeometryUnion[] = result.features
		.map((f) => f.geometry as GeometryUnion | null)
		.filter((g): g is GeometryUnion => !!g);

	if (!clipGeoms.length) return [];

	const intersections = intersectionOperator.executeMany(clipGeoms, polygon) as GeometryUnion[];

	return createGraphicsFromIntersections(intersections, layer, sourceId);
}

/**
 * Collect clipped pieces from a GraphicsLayer using client-side filtering.
 *
 * @param layer - The GraphicsLayer to filter
 * @param polygon - The polygon to clip with
 * @param sourceId - ID of the source polygon
 * @returns Array of clipped graphics
 */
function collectClippedPiecesFromGraphicsLayer(
	layer: GraphicsLayer,
	polygon: Polygon,
	sourceId: number | string
): Graphic[] {
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

	if (!candidates.length) return [];

	const intersections = intersectionOperator.executeMany(candidates, polygon) as GeometryUnion[];

	return createGraphicsFromIntersections(intersections, layer, sourceId);
}

/**
 * Create graphics from intersection geometries with layer attributes.
 *
 * @param intersections - Array of intersection geometries
 * @param layer - The source layer
 * @param sourceId - ID of the source polygon
 * @returns Array of graphics with attributes
 */
function createGraphicsFromIntersections(
	intersections: GeometryUnion[],
	layer: ClipLayer,
	sourceId: number | string
): Graphic[] {
	const pieces: Graphic[] = [];

	intersections.forEach((g) => {
		if (!g || g.type !== 'polygon') return;
		pieces.push(
			new Graphic({
				geometry: g as Polygon,
				attributes: {
					sourceId,
					clipped: true,
					layerId: layer.id,
					layerTitle: layer.title
				}
			})
		);
	});

	return pieces;
}

/**
 * Overlay and group candidates logic that operates on in-memory Graphics
 * and returns final Graphics without touching layers.
 *
 * @param candidates - Array of candidate graphics to overlay
 * @param symbolForCombo - Optional symbol factory based on layer combination
 * @returns Array of final merged graphics
 */
function overlayAndGroupCandidates(
	candidates: Graphic[],
	symbolForCombo?: (
		comboKey: string,
		layerIds: string[],
		layerTitles: string[]
	) => __esri.SimpleFillSymbolProperties
): Graphic[] {
	if (candidates.length <= 1) return candidates;

	const pieces = overlayPolygonsIntoPieces(candidates);

	if (!pieces.length) return [];

	const groups = groupPiecesByLayerSet(pieces);

	return buildMergedGraphicsFromGroups(groups, symbolForCombo);
}

/**
 * Overlay all candidate polygons into non-overlapping pieces.
 *
 * @param candidates - Array of graphics to overlay
 * @returns Array of non-overlapping pieces
 */
function overlayPolygonsIntoPieces(candidates: Graphic[]): Piece[] {
	let pieces: Piece[] = [];

	for (const candidate of candidates) {
		pieces = processCandidate(candidate, pieces);
	}

	return pieces;
}

/**
 * Process a single candidate polygon against existing pieces.
 *
 * @param candidate - The graphic to process
 * @param pieces - Existing pieces to check against
 * @returns Updated array of pieces
 */
function processCandidate(candidate: Graphic, pieces: Piece[]): Piece[] {
	const geomNew = candidate.geometry as Polygon;
	let remaining: Polygon | null = geomNew;

	if (!remaining) return pieces;

	intersectionOperator.accelerateGeometry(remaining);

	const nextPieces: Piece[] = [];

	for (const piece of pieces) {
		const result = processPieceIntersection(piece, remaining, candidate);
		nextPieces.push(...result.pieces);
		remaining = result.remaining;

		if (remaining) {
			intersectionOperator.accelerateGeometry(remaining);
		}
	}

	if (remaining) {
		nextPieces.push({
			geometry: remaining,
			members: [candidate]
		});
	}

	return nextPieces;
}

/**
 * Process the intersection between an existing piece and a new polygon.
 *
 * @param piece - The existing piece
 * @param remaining - The remaining geometry of the new polygon
 * @param candidate - The candidate graphic being processed
 * @returns Object containing updated pieces and remaining geometry
 */
function processPieceIntersection(
	piece: Piece,
	remaining: Polygon | null,
	candidate: Graphic
): { pieces: Piece[]; remaining: Polygon | null } {
	const geomOld = piece.geometry;

	if (!remaining) {
		return { pieces: [piece], remaining: null };
	}

	const extentOld = geomOld.extent as Extent;
	const extentNew = remaining.extent as Extent;

	if (!extentsIntersect(extentOld, extentNew)) {
		return { pieces: [piece], remaining };
	}

	const inter = intersectionOperator.execute(geomOld, remaining) as Polygon | null | undefined;

	if (!inter || inter.type !== 'polygon') {
		return { pieces: [piece], remaining };
	}

	const oldOnly = differenceOperator.execute(geomOld, remaining) as Polygon | null | undefined;
	const newOnly = differenceOperator.execute(remaining, geomOld) as Polygon | null | undefined;

	const resultPieces: Piece[] = [];

	if (oldOnly && oldOnly.type === 'polygon') {
		resultPieces.push({
			geometry: oldOnly as Polygon,
			members: piece.members.slice()
		});
	}

	resultPieces.push({
		geometry: inter as Polygon,
		members: [...piece.members, candidate]
	});

	const newRemaining = newOnly && newOnly.type === 'polygon' ? (newOnly as Polygon) : null;

	return { pieces: resultPieces, remaining: newRemaining };
}

type Group = {
	geometries: Polygon[];
	members: Graphic[];
	comboKey: string;
	ids: string[];
	titles: string[];
};

/**
 * Group pieces by their layer set.
 *
 * @param pieces - Array of pieces to group
 * @returns Map of layer key to group
 */
function groupPiecesByLayerSet(pieces: Piece[]): Map<string, Group> {
	const groups = new Map<string, Group>();

	for (const piece of pieces) {
		const { key, ids, titles } = getLayerKeyFromMembers(piece.members);
		if (ids.length === 0) continue;

		let group = groups.get(key);
		if (!group) {
			group = {
				geometries: [],
				members: piece.members,
				comboKey: key,
				ids,
				titles
			};
			groups.set(key, group);
		}

		group.geometries.push(piece.geometry);
	}

	return groups;
}

/**
 * Build final merged graphics from groups.
 *
 * @param groups - Map of layer key to group
 * @param symbolForCombo - Optional symbol factory
 * @returns Array of merged graphics
 */
function buildMergedGraphicsFromGroups(
	groups: Map<string, Group>,
	symbolForCombo?: (
		comboKey: string,
		layerIds: string[],
		layerTitles: string[]
	) => __esri.SimpleFillSymbolProperties
): Graphic[] {
	const mergedGraphics: Graphic[] = [];

	for (const [key, group] of groups.entries()) {
		if (!group.geometries.length) continue;

		const unionGeom = unionOperator.executeMany(group.geometries) as Polygon | null | undefined;

		if (!unionGeom || unionGeom.type !== 'polygon') continue;

		const attrs = buildMergedAttributes(group.members);
		const symbol = getSymbolForGroup(key, group, symbolForCombo);

		const merged = new Graphic({
			geometry: unionGeom as Polygon,
			attributes: attrs,
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			symbol: symbol as any
		});

		mergedGraphics.push(merged);
	}

	return mergedGraphics;
}

/**
 * Get symbol for a group, using custom factory or default.
 *
 * @param key - The combo key
 * @param group - The group data
 * @param symbolForCombo - Optional symbol factory
 * @returns Symbol properties for the group
 */
function getSymbolForGroup(
	key: string,
	group: Group,
	symbolForCombo?: (
		comboKey: string,
		layerIds: string[],
		layerTitles: string[]
	) => __esri.SimpleFillSymbolProperties
): __esri.SimpleFillSymbolProperties | Record<string, unknown> {
	if (symbolForCombo) {
		return symbolForCombo(key, group.ids, group.titles);
	}
	return {
		type: 'simple-fill',
		color: colorFromId(key, 0.3),
		outline: {
			color: [0, 0, 0, 1],
			width: 1
		}
	};
}

/**
 * Build a stable key from all layerIds contributing to a piece.
 *
 * @param members - Array of graphics contributing to a piece
 * @returns Object containing the key, layer IDs, and titles
 */
function getLayerKeyFromMembers(members: Graphic[]): {
	key: string;
	ids: string[];
	titles: string[];
} {
	const idSet = new Set<string>();
	const titleSet = new Set<string>();

	for (const g of members) {
		const attrs = g.attributes ?? {};
		const id = attrs.layerId as string | undefined;
		const idArr = attrs.layerIds as string[] | undefined;
		const lt = attrs.layerTitle as string | undefined;
		const ltArr = attrs.layerTitles as string[] | undefined;

		if (id) idSet.add(id);
		if (Array.isArray(idArr)) {
			idArr.forEach((v) => v && idSet.add(v));
		}

		if (lt) titleSet.add(lt);
		if (Array.isArray(ltArr)) {
			ltArr.forEach((t) => t && titleSet.add(t));
		}
	}

	const ids = Array.from(idSet).sort();
	const titles = Array.from(titleSet).sort();
	const key = ids.join('|');

	return { key, ids, titles };
}

/**
 * Build attributes for a merged polygon representing the union
 * of all regions that share the same layer set.
 *
 * @param members - Array of graphics that contribute to the merged polygon
 * @returns Attributes object with merged layer information
 */
function buildMergedAttributes(members: Graphic[]): Record<string, unknown> {
	const result: Record<string, unknown> = {};
	if (!members.length) return result;

	const sampleAttrs = members[0].attributes ?? {};

	Object.assign(result, sampleAttrs);

	if ('sourceId' in sampleAttrs) {
		result.sourceId = sampleAttrs.sourceId;
	}
	if ('clipped' in sampleAttrs) {
		result.clipped = sampleAttrs.clipped;
	}

	const idSet = new Set<string>();
	const titleSet = new Set<string>();

	for (const g of members) {
		const attrs = g.attributes ?? {};
		const id = attrs.layerId as string | undefined;
		const idArr = attrs.layerIds as string[] | undefined;
		const lt = attrs.layerTitle as string | undefined;
		const ltArr = attrs.layerTitles as string[] | undefined;

		if (id) idSet.add(id);
		if (Array.isArray(idArr)) {
			idArr.forEach((v) => v && idSet.add(v));
		}

		if (lt) titleSet.add(lt);
		if (Array.isArray(ltArr)) {
			ltArr.forEach((t) => t && titleSet.add(t));
		}
	}

	const ids = Array.from(idSet).sort();
	const titles = Array.from(titleSet).sort();

	result.layerIds = ids;
	result.layerTitles = titles;
	result.layerTitlesCsv = titles.join(', ');

	return result;
}

/**
 * Check if two extents intersect using simple numeric comparison.
 *
 * @param a - First extent to check
 * @param b - Second extent to check
 * @returns True if extents intersect, false otherwise
 */
function extentsIntersect(a: Extent, b: Extent): boolean {
	return !(a.xmax < b.xmin || a.xmin > b.xmax || a.ymax < b.ymin || a.ymin > b.ymax);
}

/**
 * Generate stable RGBA color from a string ID.
 *
 * @param id - String ID to generate color from
 * @param alpha - Alpha transparency value (default 0.3)
 * @returns RGBA color array
 */
function colorFromId(id: string, alpha = 0.3): [number, number, number, number] {
	let hash = 0;
	for (let i = 0; i < id.length; i++) {
		hash = id.charCodeAt(i) + ((hash << 5) - hash);
	}
	const r = (hash >> 0) & 0xff;
	const g = (hash >> 8) & 0xff;
	const b = (hash >> 16) & 0xff;
	return [r, g, b, alpha];
}
