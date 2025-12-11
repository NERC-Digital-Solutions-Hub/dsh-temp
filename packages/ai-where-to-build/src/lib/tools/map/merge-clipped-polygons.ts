import * as intersectionOperator from '@arcgis/core/geometry/operators/intersectionOperator.js';
import * as differenceOperator from '@arcgis/core/geometry/operators/differenceOperator.js';
import * as unionOperator from '@arcgis/core/geometry/operators/unionOperator.js';
import Graphic from '@arcgis/core/Graphic.js';

import type GraphicsLayer from '@arcgis/core/layers/GraphicsLayer.js';
import type Polygon from '@arcgis/core/geometry/Polygon.js';
import type Extent from '@arcgis/core/geometry/Extent.js';

interface Piece {
	geometry: Polygon;
	members: Graphic[]; // original clipped polygons that contribute to this region
}

/**
 * Merge/split clipped polygons so that:
 * - Overlaps are split out as separate polygons.
 * - Each final polygon has layerIds/layerTitles listing all layers that cover it.
 * - Polygons that share the same set of layers are unioned together.
 *
 * @param layer - The graphics layer containing polygons to merge
 * @param options - Optional configuration
 * @param options.sourceId - If provided, only process polygons with this sourceId
 * @returns The final graphics that were added to the layer
 */
export function mergeClippedPolygons(
	layer: GraphicsLayer,
	options?: { sourceId?: number | string }
): Graphic[] {
	console.log('[merge-clipped-polygons] merging in layer:', layer.id, 'opts:', options);

	const candidates = filterCandidatePolygons(layer, options?.sourceId);

	if (candidates.length <= 1) return candidates;

	console.log('[merge-clipped-polygons] candidate polygons:', candidates.length);

	const pieces = overlayPolygonsIntoPieces(candidates);

	console.log('[merge-clipped-polygons] overlay pieces count:', pieces.length);

	if (!pieces.length) return [];

	const groups = groupPiecesByLayerSet(pieces);

	console.log('[merge-clipped-polygons] groups by layer set:', groups.size);

	const mergedGraphics = buildMergedGraphics(groups);

	console.log(
		'[merge-clipped-polygons] replacing',
		candidates.length,
		'originals with',
		mergedGraphics.length,
		'final polygons.'
	);

	layer.graphics.removeMany(candidates);
	layer.graphics.addMany(mergedGraphics);

	return mergedGraphics;
}

/* -------------------------------------------------------------------------- */
/*                               Helper methods                               */
/* -------------------------------------------------------------------------- */

type Group = {
	geometries: Polygon[];
	members: Graphic[];
	comboKey: string;
};

/**
 * Filter graphics to find valid polygon candidates for merging.
 *
 * @param layer - The graphics layer to filter
 * @param sourceId - Optional sourceId to filter by
 * @returns Array of candidate graphics
 */
function filterCandidatePolygons(layer: GraphicsLayer, sourceId?: number | string): Graphic[] {
	const allGraphics = layer.graphics.toArray();

	return allGraphics.filter((g) => {
		if (!g.geometry || g.geometry.type !== 'polygon') return false;
		if (!sourceId) return true;
		return g.attributes?.sourceId === sourceId;
	});
}

/**
 * Overlay all candidate polygons into non-overlapping pieces.
 * Each piece represents a region with its contributing members.
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

/**
 * Group pieces by their layer set (which layers cover that region).
 *
 * @param pieces - Array of pieces to group
 * @returns Map of layer key to group
 */
function groupPiecesByLayerSet(pieces: Piece[]): Map<string, Group> {
	const groups = new Map<string, Group>();

	for (const piece of pieces) {
		const { key, ids } = getLayerKeyFromMembers(piece.members);
		if (ids.length === 0) continue;

		let group = groups.get(key);
		if (!group) {
			group = {
				geometries: [],
				members: piece.members,
				comboKey: key
			};
			groups.set(key, group);
		}

		group.geometries.push(piece.geometry);
	}

	return groups;
}

/**
 * Build final merged graphics from groups.
 * Unions geometries within each group and creates graphics with merged attributes.
 *
 * @param groups - Map of layer key to group
 * @returns Array of merged graphics
 */
function buildMergedGraphics(groups: Map<string, Group>): Graphic[] {
	const mergedGraphics: Graphic[] = [];

	for (const [, group] of groups.entries()) {
		if (!group.geometries.length) continue;

		const unionGeom = unionOperator.executeMany(group.geometries) as Polygon | null | undefined;

		if (!unionGeom || unionGeom.type !== 'polygon') continue;

		const attrs = buildMergedAttributes(group.members);
		const merged = new Graphic({
			geometry: unionGeom as Polygon,
			attributes: attrs,
			symbol: {
				type: 'simple-fill',
				color: [0, 0, 0, 0.3],
				outline: {
					color: [0, 0, 0, 1],
					width: 1
				}
			}
		});

		mergedGraphics.push(merged);
	}

	return mergedGraphics;
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
	const comboTokens = new Set<string>();

	for (const graphic of members) {
		const attrs = graphic.attributes ?? {};
		const id = attrs.layerId as string | undefined;
		const title = attrs.layerTitle as string | undefined;
		const idArr = attrs.layerIds as string[] | undefined;
		const titleArr = attrs.layerTitles as string[] | undefined;
		const singleVal = attrs.value != null ? String(attrs.value) : undefined;
		const valArr = attrs.layerValues as string[] | undefined;
		const bufferDistance = attrs.bufferDistance as number | undefined;
		const bufferUnit = attrs.bufferUnit as string | undefined;
		const bufferSuffix =
			bufferDistance != null && !Number.isNaN(bufferDistance)
				? `|buffer:${bufferDistance}:${bufferUnit ?? 'sr'}`
				: '';

		const addToken = (layerId: string, value: string) => {
			comboTokens.add(`${layerId}:${value}${bufferSuffix}`);
		};

		if (id) {
			idSet.add(id);
			if (title) titleSet.add(title);

			const valuesForThisLayer: string[] =
				Array.isArray(valArr) && valArr.length ? valArr : singleVal ? [singleVal] : ['__NOVALUE__'];

			for (const v of valuesForThisLayer) {
				addToken(id, v);
			}
		}

		if (Array.isArray(idArr)) {
			for (let i = 0; i < idArr.length; i++) {
				const lid = idArr[i];
				if (!lid) continue;

				idSet.add(lid);

				const ltitle = titleArr?.[i];
				if (ltitle) titleSet.add(ltitle);

				const v = valArr?.[i] ?? singleVal ?? '__NOVALUE__';
				addToken(lid, v);
			}
		}
	}

	const ids = Array.from(idSet).sort();
	const titles = Array.from(titleSet).sort();
	const key = Array.from(comboTokens).sort().join('|');

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

	// Copy base attributes from first member
	Object.assign(result, sampleAttrs);

	if ('sourceId' in sampleAttrs) {
		result.sourceId = sampleAttrs.sourceId;
	}
	if ('clipped' in sampleAttrs) {
		result.clipped = sampleAttrs.clipped;
	}

	// ---------- RAW PER-MEMBER TITLES + WEIGHTS ----------
	const memberLayerTitles: string[] = [];
	const memberLayerWeights: number[] = [];

	// ---- buffer aggregation (unchanged) ----
	type BufferInfo = {
		distance?: number;
		unit?: string;
		weight?: number;
	};

	const bufferMap = new Map<string, BufferInfo>();

	const addBufferInfo = (attrs: Record<string, unknown>) => {
		const distance = attrs.bufferDistance as number | undefined;
		const unit = attrs.bufferUnit as string | undefined;
		const weight = attrs.weight as number | undefined;

		if (distance == null && unit == null && weight == null) return;

		const key = `${distance ?? ''}|${unit ?? ''}|${weight ?? ''}`;
		if (!bufferMap.has(key)) {
			bufferMap.set(key, { distance, unit, weight });
		}
	};

	// ---- Map layerId -> { titles, values, weights[] } (grouped view) ----
	const byLayerId = new Map<
		string,
		{ titles: Set<string>; values: Set<string>; weights: number[] }
	>();

	const addLayerData = (
		layerId: string,
		title?: string,
		values?: string[],
		weight?: number
	) => {
		if (!layerId) return;
		let entry = byLayerId.get(layerId);
		if (!entry) {
			entry = {
				titles: new Set<string>(),
				values: new Set<string>(),
				weights: []
			};
			byLayerId.set(layerId, entry);
		}
		if (title) entry.titles.add(title);
		if (Array.isArray(values)) {
			values.forEach((v) => {
				if (v != null) entry.values.add(String(v));
			});
		}
		if (typeof weight === 'number' && !Number.isNaN(weight)) {
			entry.weights.push(weight);
		}
	};

	for (const g of members) {
		const attrs = g.attributes ?? {};

		// per-graphic weight
		const memberWeight =
			typeof attrs.weight === 'number' ? (attrs.weight as number) : undefined;
		const memberTitle = attrs.layerTitle as string | undefined;

		// ---------- RAW ARRAY: one entry per original graphic ----------
		if (memberTitle && typeof memberWeight === 'number' && !Number.isNaN(memberWeight)) {
			memberLayerTitles.push(memberTitle);
			memberLayerWeights.push(memberWeight);
		}

		// collect buffer info
		addBufferInfo(attrs);

		// single-layer info
		const id = attrs.layerId as string | undefined;
		const title = attrs.layerTitle as string | undefined;
		const valArr = attrs.layerValues as string[] | undefined;
		const singleVal = attrs.value != null ? String(attrs.value) : undefined;

		// multi-layer info (if already aggregated)
		const idArr = attrs.layerIds as string[] | undefined;
		const titleArr = attrs.layerTitles as string[] | undefined;

		const valuesForThisGraphic: string[] | undefined =
			Array.isArray(valArr) && valArr.length ? valArr : singleVal ? [singleVal] : undefined;

		// 1) simple case: one layer per graphic
		if (id) {
			addLayerData(id, title, valuesForThisGraphic, memberWeight);
		}

		// 2) aggregated case: many layerIds / titles attached to this graphic
		if (Array.isArray(idArr)) {
			for (let i = 0; i < idArr.length; i++) {
				const lid = idArr[i];
				const ltitle = Array.isArray(titleArr) ? titleArr[i] : undefined;
				addLayerData(lid, ltitle, valuesForThisGraphic, memberWeight);
			}
		}
	}

	// ---------- Build grouped layer view (unchanged idea) ----------
	const layerIds: string[] = [];
	const layerTitles: string[] = [];
	const layerValues: string[] = [];
	const layerWeightsGrouped: number[] = []; // e.g. sums or mins per layer

	const sortedLayerIds = Array.from(byLayerId.keys()).sort();

	for (const layerId of sortedLayerIds) {
		const entry = byLayerId.get(layerId)!;
		const titles = Array.from(entry.titles).sort();
		const values = Array.from(entry.values);

		layerIds.push(layerId);
		layerTitles.push(titles.join(' / '));
		layerValues.push(values.join(', '));

		// choose how you want to aggregate per layer; here: min
		const w =
			entry.weights.length > 0 ? Math.min(...entry.weights) : 0;
		layerWeightsGrouped.push(w);
	}

	// grouped, per-layer view
	result.layerIds = layerIds;
	result.layerTitles = layerTitles;
	result.layerValues = layerValues;
	result.layerWeights = layerWeightsGrouped;
	result.layerTitlesCsv = layerTitles.join(', ');

	// raw, per-member view (what you asked for)
	result.memberLayerTitles = memberLayerTitles;
	result.memberLayerWeights = memberLayerWeights;

	// aggregated buffer info
	if (bufferMap.size) {
		const bufferInfos = Array.from(bufferMap.values());
		result.bufferInfos = bufferInfos;
		result.hasBuffer = true;

		if (bufferInfos.length === 1) {
			const info = bufferInfos[0];
			if (info.distance != null) result.bufferDistance = info.distance;
			if (info.unit != null) result.bufferUnit = info.unit;
			if (info.weight != null) result.weight = info.weight;
		}
	} else {
		delete result.bufferDistance;
		delete result.bufferUnit;
		delete result.weight;
		delete result.bufferInfos;
		delete result.hasBuffer;
	}

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
