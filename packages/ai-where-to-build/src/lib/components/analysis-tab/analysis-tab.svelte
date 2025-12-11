<script lang="ts">
	import Button from '$lib/components/shadcn/button/button.svelte';
	import { addGraphicLayer } from '$lib/services/add-graphic-layer';
	import { LayerViewProvider } from '$lib/services/layer-view-provider';
	import { AreaSelectionInteractionStore } from '$lib/stores/area-selection-interaction-store.svelte';
	import { AreaSelectionStore } from '$lib/stores/area-selection-store.svelte';
	import { MapInteractionStore } from '$lib/stores/map-interaction-store.svelte';
	import { clipPoints } from '$lib/tools/map/clip-points';
	import { clipPolygon } from '$lib/tools/map/clip-polygon';
	import { createPolygonBuffer } from '$lib/tools/map/create-polygon-buffer';
	import { mergeClippedPolygons } from '$lib/tools/map/merge-clipped-polygons';
	import { queryPolygonFieldValue } from '$lib/tools/map/query-polygon-field-value';
	import { getUnionPolygonGeometryByIds } from '$lib/tools/map/utils';
	import FeatureLayer from '@arcgis/core/layers/FeatureLayer';
	import GroupLayer from '@arcgis/core/layers/GroupLayer';
	import Graphic from '@arcgis/core/Graphic';
	import { onMount } from 'svelte';
	import type { AiWhereToBuildConfig } from '$lib/types/ai-where-to-build';
	import { getAiWhereToBuildConfig } from '$lib/services/ai-where-to-build-config-provider';
	import {
		EnumFieldLayerAnalysisSettings,
		FieldLayerAnalysisSettings,
		NumericFieldLayerAnalysisSettings,
		WeightedLayerAnalysisSettings,
		type LayerAnalysisSettings,
		type LayerBufferZone
	} from '$lib/models/layer-analysis-settings';

	type Props = {
		mapView: __esri.MapView;
	};

	const { mapView }: Props = $props();

	let areaSelectionStore: AreaSelectionStore | null = $state(null);
	let areaSelectionInteractionStore: AreaSelectionInteractionStore | null = $state(null);
	let mapInteractionStore: MapInteractionStore | null = $state(null);
	let graphicLayer: __esri.GraphicsLayer | null = $state(null);
	let lastAnalyzedPolygonsKey: string | null = $state(null);

	const DEFAULT_WARD_LAYER_TITLE = 'UK Wards (Boundary Fully Clipped) (2022)';

	onMount(async () => {
		graphicLayer = addGraphicLayer(mapView, 'Analysis Results Layer');
		await initializeStores();
		setDefaultAreaLayer();
	});

	/**
	 * Initializes all required stores for area selection and map interaction.
	 * Creates and configures AreaSelectionStore, AreaSelectionInteractionStore, and MapInteractionStore.
	 *
	 * @throws {Error} If MapView is not initialized
	 */
	async function initializeStores() {
		if (!mapView) {
			throw new Error('[analysis-tab] MapView is not initialized');
		}

		areaSelectionStore = new AreaSelectionStore();
		areaSelectionInteractionStore = new AreaSelectionInteractionStore(
			areaSelectionStore,
			new LayerViewProvider(mapView)
		);

		mapInteractionStore = new MapInteractionStore(
			mapView,
			areaSelectionInteractionStore,
			new Set([DEFAULT_WARD_LAYER_TITLE]) // TODO: Move to config
		);

		console.log('[analysis-tab] Initialized stores', areaSelectionStore.layerId);

		await areaSelectionInteractionStore.refreshLayerView();
		await areaSelectionInteractionStore.refreshAreas();
	}

	/**
	 * Sets the default area layer for analysis to the UK Wards layer.
	 * Searches for the layer in the map and updates the area selection store with its ID.
	 */
	function setDefaultAreaLayer() {
		if (!areaSelectionStore) {
			console.warn('[analysis-tab] AreaSelectionStore not initialized yet');
			return;
		}

		const layer = mapView.map?.allLayers.find((layer) => layer.title === DEFAULT_WARD_LAYER_TITLE);

		if (layer) {
			areaSelectionStore.setLayerId(layer.uid);
			console.log(`[analysis-tab] Set default area layer to ID: ${layer.uid}`);
		} else {
			console.warn('[analysis-tab] Default area layer not found on the map');
		}
	}

	/**
	 * Recursively flattens a collection of map layers, extracting all feature layers
	 * from group layers and individual feature layers.
	 *
	 * @param layers - Array of map layers to flatten
	 * @returns Array of flattened feature layers
	 */
	function flattenLayers(layers: __esri.Layer[]): __esri.Layer[] {
		const result: __esri.Layer[] = [];
		for (const layer of layers) {
			if (layer instanceof GroupLayer) {
				result.push(...flattenLayers((layer as __esri.GroupLayer).layers.toArray()));
			} else if (layer instanceof FeatureLayer) {
				result.push(layer);
			}
		}
		return result;
	}

	/**
	 * Generates a consistent color based on a string ID using hash-based color generation.
	 *
	 * @param id - String identifier to generate color from
	 * @param alpha - Opacity value (0-1), defaults to 0.3
	 * @returns RGBA color array [r, g, b, alpha]
	 */
	function generateColorFromId(id: string, alpha = 0.3): number[] {
		// Simple string hash
		let hash = 0;
		for (let i = 0; i < id.length; i++) {
			hash = id.charCodeAt(i) + ((hash << 5) - hash);
		}

		// Use hash bits to build RGB values
		const r = (hash >> 0) & 0xff;
		const g = (hash >> 8) & 0xff;
		const b = (hash >> 16) & 0xff;

		return [r, g, b, alpha];
	}

	/**
	 * Creates a simple fill symbol with color and outline for a polygon graphic.
	 *
	 * @param colorId - String identifier used to generate the fill color
	 * @param alpha - Opacity for the fill color
	 * @param outlineColor - RGBA array for the outline color
	 * @param outlineWidth - Width of the outline in pixels
	 * @returns Object containing symbol properties for ArcGIS SimpleFillSymbol
	 */
	function createFillSymbol(
		colorId: string,
		alpha: number = 0.3,
		outlineColor: number[] = [255, 0, 0, 1],
		outlineWidth: number = 2
	) {
		return {
			type: 'simple-fill' as const,
			color: generateColorFromId(colorId, alpha),
			outline: {
				color: outlineColor,
				width: outlineWidth
			}
		};
	}

	/**
	 * Creates a popup template for displaying clipped polygon information in a table format.
	 *
	 * @returns Object containing popup template properties for ArcGIS PopupTemplate
	 */
	function createPopupTemplate() {
		return {
			title: 'Clipped region',
			content: [
				{
					type: 'custom',
					creator: (event: __esri.PopupTemplateCreatorEvent) => {
						const graphic = event.graphic;
						const titles: string[] = graphic.attributes.layerTitles ?? [];
						const values: string[] = graphic.attributes.layerValues ?? [];

						const table = document.createElement('table');
						table.className = 'esri-widget__table';

						const tbody = document.createElement('tbody');

						// Header row
						const headerRow = document.createElement('tr');
						const thLayer = document.createElement('th');
						const thValue = document.createElement('th');
						thLayer.textContent = 'Layer';
						thValue.textContent = 'Value';
						headerRow.appendChild(thLayer);
						headerRow.appendChild(thValue);
						tbody.appendChild(headerRow);

						// Data rows
						titles.forEach((title, idx) => {
							const tr = document.createElement('tr');

							const tdTitle = document.createElement('td');
							tdTitle.textContent = title;

							const tdValue = document.createElement('td');
							tdValue.textContent = values[idx] ?? '';

							tr.appendChild(tdTitle);
							tr.appendChild(tdValue);
							tbody.appendChild(tr);
						});

						table.appendChild(tbody);
						return table;
					}
				}
			]
		};
	}

	/**
	 * Validates that all required components are initialized before analysis.
	 *
	 * @returns True if all components are ready, false otherwise
	 */
	function validateComponentsReady(): boolean {
		if (!mapView || !mapView.map) {
			console.warn('[analysis-tab] MapView not initialized yet');
			return false;
		}

		if (!areaSelectionStore || !areaSelectionInteractionStore || !mapInteractionStore) {
			console.warn('[analysis-tab] Stores not initialized yet');
			return false;
		}

		if (!graphicLayer) {
			console.warn('[analysis-tab] Graphic layer not initialized yet');
			return false;
		}

		return true;
	}

	/**
	 * Retrieves the parcels layer from the map.
	 *
	 * @returns The parcels feature layer or null if not found
	 */
	function getParcelsLayer(): __esri.FeatureLayer | null {
		const parcelsLayer = mapView.map!.findLayerById('19a9760b651-layer-105') as __esri.FeatureLayer;
		if (parcelsLayer) {
			console.log('Parcels Layer:', parcelsLayer.title);
		}
		return parcelsLayer;
	}

	/**
	 * Processes and clips a single feature layer against the parcels layer.
	 *
	 * @param layer - The feature layer to clip
	 * @param parcelsLayer - The parcels layer to clip against
	 * @param selectedObjectId - The object ID of the selected parcel
	 */
	async function processFeatureLayer(
		layer: __esri.FeatureLayer,
		inputPolygon: __esri.Polygon,
		selectedObjectId: number
	): Promise<void> {
		const polygons = await clipPolygon({
			view: mapView,
			input: inputPolygon,
			clipLayer: layer,
			targetLayer: graphicLayer!
		});

		if (!polygons) {
			console.log(`No polygon clipped for layer: ${layer.title}`);
			return;
		}

		for (const polygon of polygons) {
			polygon.attributes ??= {};
			polygon.attributes.layerTitle = layer.title;
			polygon.attributes.layerId = layer.id;

			if (layer.displayField) {
				polygon.attributes.value = await queryPolygonFieldValue(layer, polygon, layer.displayField);
			}

			polygon.attributes.layerTitles = [layer.title];
			polygon.symbol = createFillSymbol(layer.id, 0.3, [255, 0, 0, 1], 2);

			console.log('Clipped Polygon:', polygons);
		}
	}

	/**
	 * Applies styling and popup templates to merged polygon graphics.
	 *
	 * @param mergedPolygons - Array of merged polygon graphics
	 */
	function styleMergedPolygons(mergedPolygons: __esri.Graphic[]): void {
		for (const graphic of mergedPolygons) {
			const key = graphic.attributes.layerTitles.join('; ');
			graphic.symbol = createFillSymbol(key, 0.3, [0, 0, 0, 1], 1);
			graphic.popupTemplate = createPopupTemplate();
		}
	}

	/**
	 * Main analysis handler. Clips all feature layers against the selected parcel area
	 * and displays the results on the map.
	 */
	async function onAnalyze() {
		if (!validateComponentsReady()) {
			return;
		}

		const selectedObjectIds = getSelectionObjectIds();
		if (selectedObjectIds.length === 0) {
			console.warn('[analysis-tab] No area selected for analysis');
			return;
		}

		if (lastAnalyzedPolygonsKey === `analyzed-${selectedObjectIds.join('-')}`) {
			console.log('[analysis-tab] Analysis already performed for the selected area(s)');
			return;
		}

		const parcelsLayer = getParcelsLayer();
		if (!parcelsLayer) {
			console.warn('[analysis-tab] Parcels layer not found');
			return;
		}

		const parcelPolygon: __esri.Polygon | null = await getUnionPolygonGeometryByIds(
			parcelsLayer,
			selectedObjectIds,
			'OBJECTID',
			mapView
		);

		if (!parcelPolygon) {
			console.warn('[analysis-tab] Unable to retrieve polygon for selected parcel IDs');
			return;
		}

		const allLayers = flattenLayers(mapView.map!.layers.toArray());

		for (const layer of allLayers) {
			if (!(layer instanceof FeatureLayer)) {
				console.log(`Skipping non-feature layer: ${layer.title}, type: ${layer.type}`);
				continue;
			}

			if (layer.id === parcelsLayer.id) {
				console.log(`Skipping parcels layer itself: ${layer.title}`);
				continue;
			}

			try {
				await processFeatureLayer(
					layer as __esri.FeatureLayer,
					parcelPolygon,
					selectedObjectIds[0]
				);
			} catch (error) {
				console.error(`Error processing layer ${layer.title}:`, error);
				continue;
			}
		}

		console.log('Merging clipped polygons in layer:', graphicLayer!.id);
		const mergedPolygons = mergeClippedPolygons(graphicLayer!);
		styleMergedPolygons(mergedPolygons);

		areaSelectionStore?.clearSelectedAreas();
		await areaSelectionInteractionStore?.refreshAreas();
		areaSelectionInteractionStore?.clearSelections();

		lastAnalyzedPolygonsKey = `analyzed-${selectedObjectIds.join('-')}`;
	}

	/**
	 * Processes and clips a single polygon feature layer against the input polygon.
	 *
	 * @param inputPolygon - The input polygon to clip against
	 * @param clipLayer - The feature layer to clip
	 * @param clipLayerSettings - The settings for the clip layer
	 */
	async function processPolygonFeatureLayer(
		inputPolygon: __esri.Polygon,
		clipLayer: __esri.FeatureLayer,
		clipLayerSettings: LayerAnalysisSettings
	): Promise<void> {
		const polygons = await clipPolygon({
			view: mapView,
			input: inputPolygon,
			clipLayer: clipLayer,
			clipLayerValueField:
				clipLayerSettings instanceof FieldLayerAnalysisSettings
					? clipLayerSettings.fieldName
					: undefined,
			targetLayer: graphicLayer!
		});

		if (!polygons || polygons.length === 0) {
			console.log(`No polygon clipped for layer: ${clipLayer.title}`);
			return;
		}

		console.log(`Clipped ${polygons.length} polygons from layer: ${clipLayer.title}`);

		const layerWeight: number | undefined =
			clipLayerSettings instanceof WeightedLayerAnalysisSettings ||
			clipLayerSettings instanceof NumericFieldLayerAnalysisSettings
				? clipLayerSettings.weight
				: undefined;

		for (const polygon of polygons) {
			polygon.attributes.layerTitle = clipLayer.title;
			polygon.attributes.layerId = clipLayer.id;
			polygon.attributes.weight = layerWeight;

			polygon.attributes.layerTitles = [clipLayer.title];
			polygon.symbol = createFillSymbol(clipLayer.id, 0.3, [255, 0, 0, 1], 2);

			const value = polygon.attributes.value;
			polygon.attributes.weight = !layerWeight
				? getFieldValueWeight(value, clipLayerSettings)
				: layerWeight;

			const bufferZones =
				clipLayerSettings instanceof WeightedLayerAnalysisSettings
					? clipLayerSettings.buffers
					: getFieldValueBufferZones(value, clipLayerSettings);

			for (const bufferZone of bufferZones) {
				if (bufferZone.distance > 0) {
					const bufferPolygon = await createPolygonBuffer({
						view: mapView,
						input: polygon,
						targetLayer: graphicLayer!,
						bufferDistance: bufferZone.distance,
						bufferUnit: bufferZone.unit
					});

					if (bufferPolygon) {
						bufferPolygon.attributes = {
							...polygon.attributes,
							polygonBuffer: true,
							bufferDistance: bufferZone.distance,
							bufferUnit: bufferZone.unit,
							weight: bufferZone.weight
						};

						bufferPolygon.symbol = createFillSymbol(
							`${clipLayer.id}-buffer-${bufferZone.distance}-${bufferZone.unit}`,
							0.2,
							[0, 0, 255, 1],
							1
						);
					}
				}
			}
		}
	}

	function getFieldValueWeight(
		value: string,
		layerSettings: LayerAnalysisSettings
	): number | undefined {
		if (!(layerSettings instanceof EnumFieldLayerAnalysisSettings)) {
			return undefined;
		}

		const fieldValueSetting = layerSettings.fieldValues.find((fv) => fv.value === value);
		if (!fieldValueSetting) {
			return undefined;
		}

		return fieldValueSetting.weight;
	}

	function getFieldValueBufferZones(
		value: string,
		layerSettings: LayerAnalysisSettings
	): LayerBufferZone[] {
		if (!(layerSettings instanceof EnumFieldLayerAnalysisSettings)) {
			return [];
		}

		const fieldValueSetting = layerSettings.fieldValues.find((fv) => fv.value === value);
		if (!fieldValueSetting) {
			return [];
		}

		return fieldValueSetting.buffers || [];
	}

	function getDefaultPointLayerBufferZone(
		layerSettings: LayerAnalysisSettings
	): LayerBufferZone | null {
		if (layerSettings instanceof WeightedLayerAnalysisSettings) {
			return layerSettings.buffers?.[0] ?? null;
		}

		if (layerSettings instanceof EnumFieldLayerAnalysisSettings) {
			const withBuffer = layerSettings.fieldValues.find((fv) => fv.buffers && fv.buffers.length);
			return withBuffer?.buffers?.[0] ?? null;
		}

		return null;
	}

	/**
	 * Processes and clips a single point/multipoint feature layer against the parcels layer.
	 *
	 * @param inputPolygon - The input polygon to clip against
	 * @param clipLayer - The feature layer to clip
	 * @param bufferZoneDistance - The buffer distance around the clipped polygon
	 */
	async function processPointFeatureLayer(
		inputPolygon: __esri.Polygon,
		clipLayer: __esri.FeatureLayer,
		layerSettings: LayerAnalysisSettings
	): Promise<void> {
		console.log(`Processing point layer: ${clipLayer.title}`);
		const valueField =
			layerSettings instanceof FieldLayerAnalysisSettings ? layerSettings.fieldName : undefined;
		const baseBufferZone = getDefaultPointLayerBufferZone(layerSettings);
		const bufferDistance = baseBufferZone?.distance ?? 1;
		const bufferUnit = baseBufferZone?.unit;

		const polygons = await clipPoints({
			view: mapView,
			input: inputPolygon,
			clipLayer,
			clipLayerValueField: valueField,
			bufferDistance,
			bufferUnit,
			targetLayer: graphicLayer!
		});

		if (!polygons || polygons.length === 0) {
			console.log(`No polygon clipped for layer: ${clipLayer.title}`);
			return;
		}

		console.log(`Clipped ${polygons.length} polygons from layer: ${clipLayer.title}`);

		for (const polygon of polygons) {
			polygon.attributes ??= {};
			const value = polygon.attributes.value;
			polygon.attributes.layerTitle = clipLayer.title;
			polygon.attributes.layerId = clipLayer.id;
			polygon.attributes.layerTitles = [clipLayer.title];
			polygon.attributes.layerValues =
				value != null ? [String(value)] : (polygon.attributes.layerValues ?? []);
			polygon.attributes.weight =
				layerSettings instanceof WeightedLayerAnalysisSettings
					? layerSettings.weight
					: getFieldValueWeight(value, layerSettings);
			polygon.symbol = createFillSymbol(clipLayer.id, 0.3, [255, 0, 0, 1], 2);

			const bufferZones =
				layerSettings instanceof WeightedLayerAnalysisSettings
					? layerSettings.buffers
					: getFieldValueBufferZones(value, layerSettings);

			for (const bufferZone of bufferZones) {
				const { distance, unit } = bufferZone;
				if (!distance || distance <= 0) {
					continue;
				}
				if (
					baseBufferZone &&
					baseBufferZone.distance === distance &&
					baseBufferZone.unit === unit
				) {
					// clipPoints already buffered to this distance
					continue;
				}

				const bufferPolygon = await createPolygonBuffer({
					view: mapView,
					input: polygon,
					targetLayer: graphicLayer!,
					bufferDistance: distance,
					bufferUnit: unit
				});

				if (bufferPolygon) {
					bufferPolygon.attributes = {
						...polygon.attributes,
						polygonBuffer: true,
						bufferDistance: distance,
						bufferUnit: unit,
						weight: bufferZone.weight
					};

					bufferPolygon.symbol = createFillSymbol(
						`${clipLayer.id}-buffer-${distance}-${unit ?? 'sr'}`,
						0.2,
						[0, 0, 255, 1],
						1
					);
				}
			}

			console.log('Clipped Polygon:', polygons);
		}
	}

	function addBaseWeightPolygon(polygon: __esri.Polygon, graphicLayer: __esri.GraphicsLayer) {
		const baseWeightPolygon = new Graphic({
			geometry: polygon.clone(),
			attributes: {
				layerTitle: 'Base Weight',
				layerId: 'base-weight-layer',
				layerTitles: ['Base Weight'],
				layerValues: ['base'],
				value: 'base',
				weight: 0,
				clipped: false,
				baseWeight: true
			},
			symbol: {
				type: 'simple-fill' as const,
				color: [128, 128, 128, 0.1],
				outline: {
					color: [128, 128, 128, 0.5],
					width: 1
				}
			}
		});
		graphicLayer.add(baseWeightPolygon);
	}

	function calculateTotalWeight(polygons: __esri.Graphic[]) {
		for (const polygon of polygons) {
			const titles: string[] = polygon.attributes.memberLayerTitles ?? [];
			const weights: number[] = polygon.attributes.memberLayerWeights ?? [];

			const weightMap = new Map<string, number>();

			for (let i = 0; i < titles.length; i++) {
				const title = titles[i];
				const weight = weights[i];

				if (weight == null || isNaN(weight as number)) continue;

				const current = weightMap.get(title) ?? Number.POSITIVE_INFINITY;
				if (weight < current) {
					weightMap.set(title, weight);
				}
			}

			const totalWeight = Array.from(weightMap.values()).reduce((sum, w) => sum + w, 0);
			if (weightMap.values().find((value) => value <= -1)) {
				polygon.attributes.totalWeight = -1;
				continue;
			}

			polygon.attributes.totalWeight = totalWeight;
		}
	}

	/**
	 * Applies styling and popup templates to merged polygon graphics.
	 * Color is based on total weight: black at -1, black to red from -1 to 0, red to green from 0 to 1.
	 *
	 * @param mergedPolygons - Array of merged polygon graphics
	 */
	function styleMergedPolygonsWithWeights(mergedPolygons: __esri.Graphic[]): void {
		for (const graphic of mergedPolygons) {
			const totalWeight =
				typeof graphic.attributes.totalWeight === 'number' ? graphic.attributes.totalWeight : 0;

			// Clamp weight between -1 and 1
			const clampedWeight = Math.max(-1, Math.min(1, totalWeight));

			// Calculate color based on weight
			let fillColor: number[];
			if (clampedWeight <= 0) {
				// From black (0, 0, 0) at -1 to red (255, 0, 0) at 0
				const t = clampedWeight + 1; // 0 at -1, 1 at 0
				fillColor = [Math.round(255 * t), 0, 0, 0.5];
			} else {
				// From red (255, 0, 0) at 0 to green (0, 255, 0) at 1
				const t = clampedWeight; // 0 at 0, 1 at 1
				fillColor = [Math.round(255 * (1 - t)), Math.round(255 * t), 0, 0.5];
			}

			graphic.symbol = {
				type: 'simple-fill' as const,
				color: fillColor,
				outline: {
					color: [0, 0, 0, 1],
					width: 1
				}
			};
			graphic.popupTemplate = createPopupTemplate();
		}
	}

	/**
	 * Profile handler. Performs weighted analysis on the selected area with config-based settings.
	 */
	async function onProfile() {
		if (!validateComponentsReady()) {
			return;
		}

		const selectedObjectIds = getSelectionObjectIds();
		if (selectedObjectIds.length === 0) {
			console.warn('[analysis-tab] No area selected for profile');
			return;
		}

		if (lastAnalyzedPolygonsKey === `profiled-${selectedObjectIds.join('-')}`) {
			console.log('[analysis-tab] Profile already performed for the selected area(s)');
			return;
		}

		const parcelsLayer = getParcelsLayer();
		if (!parcelsLayer) {
			console.warn('[analysis-tab] Parcels layer not found');
			return;
		}

		const parcelPolygon: __esri.Polygon | null = await getUnionPolygonGeometryByIds(
			parcelsLayer,
			selectedObjectIds,
			'OBJECTID',
			mapView
		);

		if (!parcelPolygon) {
			console.warn('[analysis-tab] Unable to retrieve polygon for selected parcel IDs');
			return;
		}

		const config: AiWhereToBuildConfig = await getAiWhereToBuildConfig();
		console.log('AI Where to Build Config:', config);

		const allLayers = flattenLayers(mapView.map!.layers.toArray());
		for (const layerSetting of config.analysisSettings as LayerAnalysisSettings[]) {
			const layer = allLayers.find(
				(layer) => layer instanceof FeatureLayer && layer.portalItem?.id === layerSetting.id
			) as __esri.FeatureLayer | undefined;

			if (!layer) {
				console.log(`Layer for setting ID ${layerSetting.id} not found on the map`);
				continue;
			}

			if (layer.id === parcelsLayer.id) {
				console.log(`Skipping parcels layer itself: ${layer.title}`);
				continue;
			}

			try {
				if (layer.geometryType === 'polygon') {
					await processPolygonFeatureLayer(
						parcelPolygon,
						layer as __esri.FeatureLayer,
						layerSetting
					);
				} else if (layer.geometryType === 'point' || layer.geometryType === 'multipoint') {
					await processPointFeatureLayer(parcelPolygon, layer as __esri.FeatureLayer, layerSetting);
				}
			} catch (error) {
				console.error(`Error processing layer ${layer.title}:`, error);
				continue;
			}
		}

		console.log('Merging clipped polygons in layer:', graphicLayer!.id);
		addBaseWeightPolygon(parcelPolygon, graphicLayer!);
		const mergedPolygons = mergeClippedPolygons(graphicLayer!);
		calculateTotalWeight(mergedPolygons);
		styleMergedPolygonsWithWeights(mergedPolygons);

		areaSelectionStore?.clearSelectedAreas();
		await areaSelectionInteractionStore?.refreshAreas();
		areaSelectionInteractionStore?.clearSelections();

		lastAnalyzedPolygonsKey = `profiled-${selectedObjectIds.join('-')}`;
	}

	/**
	 * Retrieves the currently selected area object IDs from the area selection store.
	 *
	 * @returns Array of selected object IDs, or empty array if stores not initialized
	 */
	function getSelectionObjectIds(): number[] {
		if (!areaSelectionInteractionStore || !areaSelectionStore) {
			return [];
		}

		return Array.from(areaSelectionStore.selectedAreaIds);
	}
</script>

<div class="analysis-container">
	<div class="header-section">
		<p class="description">
			This is the Analysis tab. This is where the user can initiate analysis for a polygon or area
			(e.g. Ward).
		</p>
	</div>

	<div class="button-group">
		<Button onclick={onProfile}>Analyze</Button>
		<Button onclick={onAnalyze}>Profile</Button>
	</div>
</div>

<style>
	.analysis-container {
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		height: 100%;
		min-height: 0;
	}

	.header-section {
		padding: 1rem;
		background-color: #f9fafb;
		border-radius: 0.5rem;
		border: 1px solid #e5e7eb;
	}

	.description {
		margin: 0;
		color: #374151;
		font-size: 0.9375rem;
		line-height: 1.5;
	}

	.button-group {
		display: flex;
		flex-direction: row;
		gap: 0.75rem;
		flex-wrap: wrap;
		justify-content: center;
		margin-top: auto;
		padding-top: 1.5rem;
	}
</style>
