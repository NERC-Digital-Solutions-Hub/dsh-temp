import { defineMapTool } from './registry';
import type { MapToolContext } from './types';

export interface ZoomMapInput {
	lat: number;
	lon: number;
	zoom: number;
}

async function zoom({ mapView }: MapToolContext, { lat, lon, zoom }: ZoomMapInput) {
	await mapView.goTo({ center: [lon, lat], zoom });
}

defineMapTool('zoomMap', zoom);
