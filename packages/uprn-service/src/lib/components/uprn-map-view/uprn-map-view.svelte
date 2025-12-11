<!-- MapView component -->
<script lang="ts">
	import { browser } from '$app/environment';
	import { LayerViewProvider } from '$lib/services/layer-view-provider';
	import type { AreaSelectionInteractionStore } from '$lib/stores/area-selection-interaction-store.svelte';
	import { MapInteractionStore } from '$lib/stores/map-interaction-store.svelte';
	import type FeatureLayer from '@arcgis/core/layers/FeatureLayer';
	import type Map from '@arcgis/core/Map';
	import type MapView from '@arcgis/core/views/MapView';
	import type WebMap from '@arcgis/core/WebMap';
	import { onDestroy, onMount } from 'svelte';

	/**
	 * Component props interface
	 */
	type Props = {
		/** The WebMap instance to display. If null, a fallback map will be created */
		webMap: __esri.WebMap;

		mapView: MapView;

		areaSelectionInteractionStore: AreaSelectionInteractionStore;

		interactableLayers: Set<string>;
	};

	const { webMap, mapView, areaSelectionInteractionStore, interactableLayers }: Props = $props();

	let mapInteractionStore: MapInteractionStore | null = $state(null);
	let mapContainer: HTMLDivElement | null = null;

	const fallbackBasemap = 'streets-vector';
	let MapContructor: typeof Map;
	let MapViewContructor: typeof MapView;
	let WebMapContructor: typeof WebMap;
	let FeatureLayerContructor: typeof FeatureLayer;

	export function getLayerViewProvider(): LayerViewProvider {
		if (!mapView) {
			throw new Error('MapView is not initialized');
		}

		return new LayerViewProvider(mapView);
	}

	onMount(async () => {
		await loadEsriAsync();
		await loadMapViewAsync();
	});

	// === Map Loading Functions ===

	/**
	 * Asynchronously loads the required ArcGIS modules for map functionality.
	 * Only loads modules once and only in browser environment.
	 * @returns Promise that resolves when modules are loaded
	 */
	async function loadEsriAsync() {
		if (!browser) {
			return;
		}

		if (!MapViewContructor) {
			const [
				{ default: Map },
				{ default: MapView },
				{ default: WebMap },
				{ default: FeatureLayer }
			] = await Promise.all([
				import('@arcgis/core/Map'),
				import('@arcgis/core/views/MapView'),
				import('@arcgis/core/WebMap'),
				import('@arcgis/core/layers/FeatureLayer')
			]);

			MapContructor = Map;
			MapViewContructor = MapView;
			WebMapContructor = WebMap;
			FeatureLayerContructor = FeatureLayer;
		}
	}

	/**
	 * Creates a fallback map with basic basemap when the main webmap fails to load.
	 * @returns Promise that resolves to a basic Map instance
	 */
	async function createFallbackMap(): Promise<__esri.Map> {
		return new MapContructor({
			basemap: fallbackBasemap
		});
	}

	/**
	 * Updates the map view with a new webMap when the webMap prop changes.
	 * Handles loading and error scenarios gracefully.
	 */
	async function updateMapWithWebMap() {
		if (!webMap) {
			return;
		}

		try {
			await loadEsriAsync();
			await loadMapViewAsync();
			if (!mapView) {
				console.error('MapView is not initialized');
				return;
			}

			mapView.container = mapContainer;
			mapView.popupEnabled = false;
			mapView.map = webMap;
			console.log('[uprn-map-view] MapView updated with new webMap');

			await areaSelectionInteractionStore.refreshLayerView();
			await areaSelectionInteractionStore.refreshAreas();
		} catch (error) {
			console.error('Error updating MapView with new webMap:', error);
		}
	}

	/**
	 * Initializes the map view with either the provided webMap or a fallback map.
	 * Handles loading, error recovery, and UI setup.
	 * @returns Promise that resolves when map view is loaded and configured
	 */
	async function loadMapViewAsync() {
		if (!browser) {
			return; // Ensure this runs only in the browser
		}

		if (!mapContainer) {
			console.error('Map container element was not found');
			return;
		}

		try {
			// Try to load the main map (webMap or undefined)
			mapView.container = mapContainer;
			mapView.popupEnabled = false;
			mapView.map = webMap ?? undefined;

			mapView.ui.move('zoom', 'top-right');
			await mapView.when();

			console.log('[uprn-map-view] Map loaded successfully');
		} catch (error) {
			console.error('Error loading map:', error);
			await loadFallbackMap();
		}
	}

	/**
	 * Loads a fallback map when the primary map fails to load.
	 * Creates a basic map with default basemap and handles any additional errors.
	 */
	async function loadFallbackMap() {
		try {
			const fallbackMap = await createFallbackMap();
			mapView.container = mapContainer;
			mapView.popupEnabled = false;
			mapView.map = fallbackMap;
			await mapView.when();

			console.log('[uprn-map-view] Fallback map loaded');
		} catch (fallbackError) {
			console.error('Error loading fallback map:', fallbackError);
		}
	}

	// === Effects ===

	// Effect to handle webMap changes
	$effect(() => {
		if (!webMap) {
			return;
		}
		updateMapWithWebMap();
	});

	// Effect to update interactable layers when they change
	$effect(() => {
		if (!mapView) {
			return;
		}

		if (mapInteractionStore) {
			mapInteractionStore.updateInteractableLayers(interactableLayers);
		} else {
			mapInteractionStore = new MapInteractionStore(
				mapView,
				areaSelectionInteractionStore,
				interactableLayers
			);
		}
	});

	/**
	 * Cleans up map resources and interaction stores when the component is destroyed.
	 * Destroys the map view and cleans up any associated event listeners.
	 */
	function cleanup() {
		if (mapInteractionStore) {
			mapInteractionStore.cleanup();
		}
		if (mapView) {
			mapView.destroy();
		}
	}

	// Cleanup when component is destroyed
	onDestroy(() => {
		cleanup();
	});
</script>

<div class="map-view" bind:this={mapContainer}></div>

<style>
	.map-view {
		flex: 1 1 auto;
		min-height: 0;
		width: 100%;
		z-index: 1;
	}
</style>
