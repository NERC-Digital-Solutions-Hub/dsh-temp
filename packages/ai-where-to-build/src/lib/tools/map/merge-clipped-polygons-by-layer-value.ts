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

interface MembershipItem {
	layerId: string;
	layerTitle: string;
	value: string;
}

interface MembershipSummary {
	key: string; // e.g. "layer1=0.45|layer2=COLD"
	items: MembershipItem[];
}

/**
 * Overlay/split clipped polygons in a GraphicsLayer so that:
 * - Overlaps are split into separate regions.
 * - Each final polygon has layerIds/layerTitles/values for all layers covering it.
 * - Polygons that share the same (layer,value) set are unioned together.
 *
 * Optionally filter by sourceId so you only process polygons for a given parcel.
 *
 * Returns the final graphics added to the layer.
 */
export function mergeClippedPolygonsByLayerAndValue(
	layer: GraphicsLayer,
	options?: { sourceId?: number | string }
): Graphic[] {
	console.log('[merge-clipped-polygons] merging in layer:', layer.id, 'opts:', options);

	const allGraphics = layer.graphics.toArray();

	const candidates = allGraphics.filter((g) => {
		if (!g.geometry || g.geometry.type !== 'polygon') return false;
		if (!options?.sourceId) return true;
		return g.attributes?.sourceId === options.sourceId;
	});

	const n = candidates.length;
	if (n <= 1) return candidates;

	console.log('[merge-clipped-polygons] candidate polygons:', n);

	// --- Step 1: overlay all candidates into non-overlapping Pieces ---

	let pieces: Piece[] = [];

	for (const candidate of candidates) {
		const geomNew = candidate.geometry as Polygon;
		let remaining: Polygon | null = geomNew;

		if (!remaining) continue;

		intersectionOperator.accelerateGeometry(remaining);

		const nextPieces: Piece[] = [];

		for (const piece of pieces) {
			const geomOld = piece.geometry;

			if (!remaining) {
				// new polygon completely consumed; just carry over existing piece
				nextPieces.push(piece);
				continue;
			}

			const extentOld = geomOld.extent as Extent;
			const extentNew = remaining.extent as Extent;

			// quick reject by extent
			if (!extentsIntersect(extentOld, extentNew)) {
				nextPieces.push(piece);
				continue;
			}

			// precise intersection: old ∩ remaining
			const inter = intersectionOperator.execute(geomOld, remaining) as Polygon | null | undefined;

			if (!inter || inter.type !== 'polygon') {
				// no area overlap; keep old piece as-is
				nextPieces.push(piece);
				continue;
			}

			// There is overlap. Split both geometries:
			// oldOnly = geomOld \ remaining
			// newOnly = remaining \ geomOld
			const oldOnly = differenceOperator.execute(geomOld, remaining) as Polygon | null | undefined;

			const newOnly = differenceOperator.execute(remaining, geomOld) as Polygon | null | undefined;

			if (oldOnly && oldOnly.type === 'polygon') {
				nextPieces.push({
					geometry: oldOnly as Polygon,
					members: piece.members.slice()
				});
			}

			// overlapping region with combined membership
			nextPieces.push({
				geometry: inter as Polygon,
				members: [...piece.members, candidate]
			});

			// leftover part of new geometry to test against other pieces
			remaining = newOnly && newOnly.type === 'polygon' ? (newOnly as Polygon) : null;
			if (remaining) {
				intersectionOperator.accelerateGeometry(remaining);
			}
		}

		// Any leftover part of the new polygon that didn't overlap others
		if (remaining) {
			nextPieces.push({
				geometry: remaining,
				members: [candidate]
			});
		}

		pieces = nextPieces;
	}

	console.log('[merge-clipped-polygons] overlay pieces count:', pieces.length);

	if (!pieces.length) return [];

	// --- Step 2: group pieces by (layer,value) set ---

	type Group = {
		geometries: Polygon[];
		summary: MembershipSummary;
		sample: Graphic; // for sourceId etc.
	};

	const groups = new Map<string, Group>();

	for (const piece of pieces) {
		const summary = summarizeMembership(piece.members);
		if (!summary.items.length) continue;

		let group = groups.get(summary.key);
		if (!group) {
			group = {
				geometries: [],
				summary,
				sample: piece.members[0]
			};
			groups.set(summary.key, group);
		}

		group.geometries.push(piece.geometry);
	}

	console.log('[merge-clipped-polygons] groups by layer+value set:', groups.size);

	// --- Step 3: union geometries within each group & build final graphics ---

	const mergedGraphics: Graphic[] = [];

	for (const group of groups.values()) {
		if (!group.geometries.length) continue;

		const unionGeom = unionOperator.executeMany(group.geometries) as Polygon | null | undefined;

		if (!unionGeom || unionGeom.type !== 'polygon') continue;

		const attrs = buildMergedAttributesFromSummary(group.summary, group.sample);
		const color = colorFromId(group.summary.key, 0.3);

		const merged = new Graphic({
			geometry: unionGeom as Polygon,
			attributes: attrs,
			symbol: {
				type: 'simple-fill',
				color,
				outline: {
					type: 'simple-line',
					color: [0, 0, 0, 1],
					width: 1
				}
			} as any
		});

		mergedGraphics.push(merged);
	}

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

function summarizeMembership(members: Graphic[]): MembershipSummary {
	const map = new Map<string, MembershipItem>();

	for (const g of members) {
		const attrs = g.attributes ?? {};
		const layerId = String(attrs.layerId ?? '');
		if (!layerId) continue;

		const layerTitle = String(attrs.layerTitle ?? layerId);
		const value = attrs.value != null ? String(attrs.value) : '';
		const comboKey = `${layerId}=${value}`;

		if (!map.has(comboKey)) {
			map.set(comboKey, { layerId, layerTitle, value });
		}
	}

	const items = Array.from(map.values()).sort((a, b) => a.layerId.localeCompare(b.layerId));
	const key = items.map((i) => `${i.layerId}=${i.value}`).join('|');

	return { key, items };
}

function buildMergedAttributesFromSummary(summary: MembershipSummary, sample: Graphic): any {
	const result: any = {};
	const sampleAttrs = sample.attributes ?? {};

	// Copy base attrs from sample (e.g., sourceId, clipped, etc.)
	Object.assign(result, sampleAttrs);

	if ('sourceId' in sampleAttrs) result.sourceId = sampleAttrs.sourceId;
	if ('clipped' in sampleAttrs) result.clipped = sampleAttrs.clipped;

	const layerIds = summary.items.map((i) => i.layerId);
	const layerTitles = summary.items.map((i) => i.layerTitle);
	const values = summary.items.map((i) => i.value);

	result.layerIds = layerIds;
	result.layerTitles = layerTitles;
	result.layerValues = values;

	// E.g., "Layer 1 Title: 0.45"
	const pairs = summary.items.map((i) => `${i.layerTitle}: ${i.value}`);
	result.layerSummaryCsv = pairs.join(', ');

	// Simple HTML table for popup
	const rows = summary.items
		.map((i) => `<tr><td>${escapeHtml(i.layerTitle)}</td><td>${escapeHtml(i.value)}</td></tr>`)
		.join('');
	result.layerSummaryHtml = `<table class="esri-widget__table"><tbody>${rows}</tbody></table>`;

	return result;
}

function extentsIntersect(a: Extent, b: Extent): boolean {
	return !(a.xmax < b.xmin || a.xmin > b.xmax || a.ymax < b.ymin || a.ymin > b.ymax);
}

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

function escapeHtml(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}
