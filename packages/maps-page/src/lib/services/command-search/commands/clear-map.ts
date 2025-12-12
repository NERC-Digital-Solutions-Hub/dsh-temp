import type { MapCommand, MapCommandRuntime } from '$lib/types/maps';
import { defineCommand } from '$lib/services/command-search/command-registry';
import { MapViewService } from '$lib/services/command-search/map-view-service';

export const clearMapCommand: MapCommand = {
	id: 'clear-map',
	name: 'Clear map',
	description: 'Clear all layers and reset the map view.',
	shortcut: ['Ctrl', 'C'],
	execute: async (_runtime: MapCommandRuntime) => {
		const mapView = _runtime.getContext().get(MapViewService).mapView;
		if (mapView && mapView.map) {
			mapView.map.layers.removeAll();
			mapView.map.basemap = 'gray';
			await mapView.map.basemap?.loadAll();
		}

		_runtime.deactivate();
	}
};

defineCommand('clear-map', clearMapCommand);
