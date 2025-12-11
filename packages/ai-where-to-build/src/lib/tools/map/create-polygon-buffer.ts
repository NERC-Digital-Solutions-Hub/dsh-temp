import * as bufferOperator from '@arcgis/core/geometry/operators/bufferOperator.js';
import * as differenceOperator from '@arcgis/core/geometry/operators/differenceOperator.js';

import Graphic from '@arcgis/core/Graphic.js';
import type GraphicsLayer from '@arcgis/core/layers/GraphicsLayer.js';
import type MapView from '@arcgis/core/views/MapView.js';
import type Polygon from '@arcgis/core/geometry/Polygon.js';

import { addGraphicToLayer } from '$lib/tools/map/utils';

interface CreatePolygonBufferOptions {
	view?: MapView;

	/** Polygon geometry or graphic to buffer (typically a pre-unioned polygon) */
	input: Polygon | Graphic;

	/** Distance of the buffer outside the polygon */
	bufferDistance: number;

	/** Optional units for the buffer distance (defaults to SR units if omitted) */
	bufferUnit?: __esri.LengthUnit;

	/** Layer where the buffer ring will be added */
	targetLayer: GraphicsLayer;

	/** Optional custom symbol for the buffer polygon */
	symbol?: __esri.SimpleFillSymbolProperties;

	/** Optional IDs of the source features that were unioned to create `input` */
	sourceIds?: Array<number | string>;
}

/**
 * Creates a buffer *ring* polygon around the given polygon:
 * - Uses the provided polygon (no unioning done here)
 * - Buffers the polygon by bufferDistance
 * - Subtracts the original polygon from the buffer to create a ring (donut)
 * - Adds the ring polygon to targetLayer
 *
 * If the input polygon is a circle, the result is a circular ring.
 */
export async function createPolygonBuffer(
	options: CreatePolygonBufferOptions
): Promise<Graphic | null> {
	const { view, input, targetLayer, bufferDistance, bufferUnit, symbol, sourceIds } = options;

	if (bufferDistance <= 0) {
		console.warn('createPolygonBuffer: bufferDistance must be greater than zero.');
		return null;
	}

	// Normalise to a Polygon geometry
	const rawGeom = input instanceof Graphic ? input.geometry : input;

	if (!rawGeom) {
		console.warn('createPolygonBuffer: no input geometry provided.');
		return null;
	}

	if (rawGeom.type !== 'polygon') {
		console.warn('createPolygonBuffer: input geometry is not a polygon.');
		return null;
	}

	const basePolygon = rawGeom as Polygon;

	// Outer buffer around the base polygon
	const outerBuffer = bufferOperator.execute(
		basePolygon,
		bufferDistance,
		bufferUnit ? { unit: bufferUnit } : undefined
	) as Polygon | null | undefined;

	if (!outerBuffer || outerBuffer.type !== 'polygon') {
		console.warn('createPolygonBuffer: buffer operation returned no polygon.');
		return null;
	}

	// Subtract the original polygon from the buffer to get a ring
	const diff = differenceOperator.execute(outerBuffer, basePolygon) as
		| __esri.Geometry
		| null
		| undefined;

	let ringPolygon: Polygon;

	if (diff && diff.type === 'polygon') {
		ringPolygon = diff as Polygon;
	} else {
		// Fallback: if difference fails, just use the outer buffer
		console.warn(
			'createPolygonBuffer: difference operation returned no polygon; using outer buffer instead.'
		);
		ringPolygon = outerBuffer;
	}

	const bufferGraphic = new Graphic({
		geometry: ringPolygon,
		attributes: {
			polygonBuffer: true,
			sourceIds,
			bufferDistance,
			bufferUnit
		},
		symbol: (symbol || {
			type: 'simple-fill',
			color: [0, 255, 255, 0.1],
			outline: {
				color: [0, 255, 255, 1],
				width: 2
			}
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		}) as any
	});

	addGraphicToLayer(targetLayer, bufferGraphic, view);

	if (view) {
		view.goTo(ringPolygon).catch((err) => console.warn('goTo failed:', err));
	}

	return bufferGraphic;
}
