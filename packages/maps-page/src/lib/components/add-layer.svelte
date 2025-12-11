<script lang="ts">
	import * as Command from '$lib/components/shadcn/command/index.js';
	import { onDestroy, onMount } from 'svelte';
	import Spinner from '$lib/components/shadcn/spinner/spinner.svelte';
	import type { MapCommandRuntime } from '$lib/types/maps';
	import { browser } from '$app/environment';
	import type { CommandSearchContext } from '$lib/services/command-search/command-search-context';
	import UseEsriRequest from '$lib/hooks/use-esri-request.svelte';
	import { OrganisationCommandService } from '$lib/services/command-search/organisation-command-service';
	import { cleanHtmlText } from '$lib/utils/decode-html';
	import { Check, CircleX } from '@lucide/svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import { asset, base } from '$app/paths';
	import { MapViewService } from '$lib/services/command-search/map-view-service';

	type Props = {
		commandSearchContext: CommandSearchContext;
		inputPlaceholder?: string;
		runtime?: MapCommandRuntime | null;
	};

	const { commandSearchContext, inputPlaceholder, runtime = null }: Props = $props();
	const useEsriRequest = new UseEsriRequest();

	let mapView: __esri.MapView | null = $state(null);

	let isLoading = $state(false);
	let loadingLayerId = $state<string | null>(null);
	let layerIdError = $state<SvelteMap<string, Error | null>>(new SvelteMap());
	let query = $state('');
	let addedLayers = $state<SvelteMap<string, __esri.Layer>>(new SvelteMap());

	type PortalLayerSummary = {
		id: string;
		title?: string;
		description?: string;
		owner?: string;
		type?: string;
		spatialReferenceWkid?: number;
	};

	let layers: PortalLayerSummary[] = $state([]);
	const layerSummariesById = new Map<string, PortalLayerSummary>();

	const SPATIAL_REFERENCE_BASEMAP_OVERRIDES: Record<number, string> = {
		27700: 'OS_Open_Background'
	};

	const filteredLayers = $derived.by(() => {
		const results = layers;
		const normalizedQuery = query.trim().toLowerCase();

		if (!normalizedQuery) {
			return results;
		}

		return results.filter((item) => {
			const title = item?.title?.toLowerCase() ?? '';
			const description = item?.description?.toLowerCase() ?? '';
			return title.includes(normalizedQuery) || description.includes(normalizedQuery);
		});
	});

	onMount(async () => {
		if (!browser) {
			return;
		}

		mapView = commandSearchContext.get(MapViewService).mapView;

		const organisationService = commandSearchContext.get(OrganisationCommandService);
		const activeOrgId = organisationService.getActiveOrganisationId();
		if (!activeOrgId) {
			console.warn('No active organisation selected in OrganisationCommandService');
			return;
		}

		const portalUrl: string = organisationService.getActiveOrganisationPortalUrl();
		const endpoint: string = organisationService.getActiveOrganisationEndpoint();

		isLoading = true;
		try {
			const LAYER_TYPES = ['Feature Layer', 'Feature Service', 'Map Service', 'Image Service'];
			const response = await fetch(asset(`/api/maps/${activeOrgId}.json`));
			if (!response.ok) {
				throw new Error(`Failed to fetch maps: ${response.status} ${response.statusText}`);
			}

			const data = await response.json();

			// Filter for Web Maps and map to metadata
			layers = (data.results ?? [])
				.filter((item: any) => LAYER_TYPES.includes(item.type))
				.map((item: any) => ({
					id: item.id,
					title: item.title,
					description: cleanHtmlText(item.description),
					owner: item.owner,
					tags: item.tags
				}));
		} finally {
			isLoading = false;
		}
		// const layerQuery = `type:(${LAYER_TYPES.map((type) => `"${type}"`).join(' OR ')})`;
		// const queryParams = organisationService.getActiveOrganisationQueryParams();

		// const formattedQueryParams = Object.entries(queryParams)
		// 	.map(([key, value]) => `${key}:"${value}"`)
		// 	.join(' AND ');

		// await useEsriRequest.load(portalUrl + endpoint, {
		// 	query: {
		// 		q: `${layerQuery}` + (formattedQueryParams ? ` AND ${formattedQueryParams}` : ''),
		// 		num: 100,
		// 		f: 'json'
		// 	}
		// });

		// layers = (useEsriRequest.data?.results ?? []).map((item: any) => ({
		// 	id: item.id,
		// 	title: item.title,
		// 	description: cleanHtmlText(item.description),
		// 	owner: item.owner,
		// 	type: item.type,
		// 	spatialReferenceWkid: item.spatialReference?.wkid ?? item.spatialReference?.latestWkid
		// }));

		layerSummariesById.clear();
		for (const layerSummary of layers) {
			layerSummariesById.set(layerSummary.id, layerSummary);
		}
	});

	let detachRuntimeInput: (() => void) | null = null;
	let attachedRuntime: MapCommandRuntime | null = null;
	let attachedPlaceholder = inputPlaceholder ?? 'Search...';

	$effect(() => {
		const currentRuntime = runtime;
		const placeholderText = inputPlaceholder ?? 'Search...';

		if (!currentRuntime) {
			detachRuntimeInput?.();
			detachRuntimeInput = null;
			attachedRuntime = null;
			attachedPlaceholder = placeholderText;
			query = '';
			return;
		}

		if (currentRuntime === attachedRuntime) {
			if (placeholderText !== attachedPlaceholder) {
				currentRuntime.setPlaceholder(placeholderText);
				attachedPlaceholder = placeholderText;
			}
			return;
		}

		detachRuntimeInput?.();
		detachRuntimeInput = null;
		attachedPlaceholder = placeholderText;

		detachRuntimeInput = currentRuntime.attachInputBinding({
			placeholder: placeholderText,
			onInput: (value) => {
				query = value;
			}
		});

		attachedRuntime = currentRuntime;
	});

	onDestroy(() => {
		detachRuntimeInput?.();
		detachRuntimeInput = null;
		attachedRuntime = null;
	});

	async function toggleLayer(itemId: string) {
		// Check if layer is already added
		if (addedLayers.has(itemId)) {
			removeLayerFromMap(itemId);
		} else {
			await addLayerToMap(itemId);
		}
	}

	function removeLayerFromMap(itemId: string) {
		const layer = addedLayers.get(itemId);
		if (!layer || !mapView || !mapView.map) {
			return;
		}

		mapView.map.remove(layer);
		addedLayers.delete(itemId);
		addedLayers = addedLayers; // Trigger reactivity
		console.log(`Layer removed from the map: ${itemId}`);
	}

	function isLayerAdded(itemId: string): boolean {
		for (const layer of mapView?.map?.allLayers ?? []) {
			if (layer.portalItem?.id === itemId) {
				return true;
				console.log(`Layer found on the map: ${itemId}`);
			}
		}

		return false;
	}

	async function addLayerToMap(itemId: string) {
		if (!browser) {
			return;
		}

		if (!mapView || !mapView.map) {
			console.error('Map or MapView is not initialized');
			layerIdError.set(itemId, new Error('Map is not ready. Please wait and try again.'));
			return;
		}

		loadingLayerId = itemId;
		layerIdError.delete(itemId);

		try {
			console.log(`Loading layer with portal item ID: ${itemId}`);

			// const portalUrl = `https://nercdsh.dev.azure.manchester.ac.uk/portal`;
			// esriConfig.portalUrl = portalUrl as string;
			// console.log('Portal URL configured:', esriConfig.portalUrl);

			// const { addProxyRule } = urlUtils;
			// console.log('Adding proxy rule for portal traffic');
			// addProxyRule({
			// 	urlPrefix: 'https://nercdsh.dev.azure.manchester.ac.uk',
			// 	proxyUrl: `${base}/proxy/Java/proxy.jsp`
			// });

			const organisationService = commandSearchContext.get(OrganisationCommandService);
			const activeOrgId = organisationService.getActiveOrganisationId();
			if (!activeOrgId) {
				console.warn('No active organisation selected in OrganisationCommandService');
				return;
			}

			const portalUrl: string = organisationService.getActiveOrganisationPortalUrl();

			const [{ default: Layer }, { default: Portal }] = await Promise.all([
				import('@arcgis/core/layers/Layer'),
				import('@arcgis/core/portal/Portal')
			]);
			const portal = new Portal({ url: portalUrl });
			const layer = await Layer.fromPortalItem({
				portalItem: {
					id: itemId,
					portal
				}
			});
			await layer.load();

			const targetSpatialReference = await resolveTargetSpatialReference(layer, itemId);
			await ensureViewSpatialReference(targetSpatialReference);
			mapView.map.add(layer);
			addedLayers.set(itemId, layer);
			addedLayers = addedLayers; // Trigger reactivity
			console.log('Layer added to the map');

			try {
				await mapView.whenLayerView(layer);
				if (layer.fullExtent) {
					await mapView.goTo(layer.fullExtent);
				}
			} catch (viewError) {
				console.warn('Layer view not ready for navigation', viewError);
			}
		} catch (error) {
			console.error('Error loading layer:', error);
			layerIdError.set(itemId, error as Error);
			loadingLayerId = null;
		} finally {
			loadingLayerId = null;
		}
	}

	async function resolveTargetSpatialReference(layer: __esri.Layer, layerId: string) {
		const directSpatialReference = getLayerSpatialReference(layer);
		if (directSpatialReference) {
			return directSpatialReference;
		}

		const summary = layerSummariesById.get(layerId);
		if (summary?.spatialReferenceWkid) {
			const { default: SpatialReference } = await import('@arcgis/core/geometry/SpatialReference');
			return new SpatialReference({ wkid: summary.spatialReferenceWkid });
		}

		const portalItemSpatialReference = (layer.portalItem as any)?.spatialReference;
		if (portalItemSpatialReference) {
			return portalItemSpatialReference as __esri.SpatialReference;
		}

		return null;
	}

	function getLayerSpatialReference(layer: __esri.Layer): __esri.SpatialReference | null {
		const candidate = (layer as any)?.spatialReference;
		return candidate ?? null;
	}

	function getWkid(spatialReference?: __esri.SpatialReference | null): number | undefined {
		if (!spatialReference) {
			return undefined;
		}

		const srAny = spatialReference as any;
		return spatialReference.wkid ?? srAny?.latestWkid ?? undefined;
	}

	async function loadCompatibleBasemap(wkid?: number) {
		if (!mapView || !mapView.map) {
			console.warn('MapView or Map is not available for basemap loading');
			return null;
		}

		if (!wkid) {
			return mapView.map.basemap;
		}

		const basemapId = SPATIAL_REFERENCE_BASEMAP_OVERRIDES[wkid];
		if (!basemapId) {
			return mapView.map.basemap;
		}

		const { default: Basemap } = await import('@arcgis/core/Basemap');
		try {
			return await Basemap.fromId(basemapId);
		} catch (error) {
			console.warn(`Failed to load basemap ${basemapId}`, error);
			return mapView.map.basemap;
		}
	}

	async function ensureViewSpatialReference(target?: __esri.SpatialReference | null) {
		if (!mapView || !mapView.map || !target) {
			console.log(
				'MapView or target spatial reference is not available',
				'mapView:',
				mapView,
				'target:',
				target
			);
			return;
		}

		const targetWkid = getWkid(target);
		const currentWkid = getWkid(mapView.spatialReference ?? undefined);
		console.log(
			`Ensuring map view spatial reference compatibility: target WKID=${targetWkid}, current WKID=${currentWkid}`
		);
		if (!targetWkid || targetWkid === currentWkid) {
			return;
		}

		const [{ default: Map }] = await Promise.all([import('@arcgis/core/Map')]);
		const compatibleBasemap = await loadCompatibleBasemap(targetWkid);
		const existingLayers = mapView.map.layers.toArray();
		const ground = mapView.map.ground;
		mapView.map.removeAll();

		const newMap = new Map({
			basemap: compatibleBasemap ?? undefined,
			ground
		} as __esri.MapProperties);
		newMap.spatialReference = target;
		newMap.layers.addMany(existingLayers);
		mapView.map = newMap;

		await mapView.when();
	}
</script>

<div class="item-container">
	{#if useEsriRequest.error}
		<div class="error-message">
			<p class="text-sm text-red-600">
				{useEsriRequest.error.message}. {useEsriRequest.error?.details?.httpStatus === 0
					? 'Reason: CORS Error. See console for more information.'
					: ''}
			</p>
		</div>
	{:else if isLoading}
		<div class="flex items-center justify-center p-4">
			<Spinner class="size-5" />
		</div>
	{:else}
		<Command.List>
			{#if filteredLayers.length === 0}
				<Command.Empty>No layers match your search.</Command.Empty>
			{:else}
				{#each filteredLayers as layer (layer.id)}
					<Command.Item
						value={layer.title}
						onclick={() => toggleLayer(layer.id)}
						class={addedLayers.has(layer.id) ? 'layer-selected' : ''}
					>
						{@const error = layerIdError.get(layer.id)}
						{#if loadingLayerId === layer.id}
							<div class="flex items-center gap-2">
								<Spinner class="size-4" />
								<span class="title-text w-full font-medium text-foreground">
									Loading {layer.title ?? 'Untitled layer'}...
								</span>
							</div>
						{:else}
							{#if addedLayers.has(layer.id)}
								<div class="flex items-center gap-2">
									<Check />
								</div>
							{/if}
							<div class="flex w-full min-w-0 flex-col gap-0.5">
								<span class="title-text font-medium text-foreground" title={layer.title}>
									{layer.title ?? 'Untitled layer'}
								</span>
								{#if layer.description}
									<span class="description-text text-xs text-gray-500" title={layer.description}>
										{layer.description}
									</span>
								{/if}
								{#if layer.type}
									<span class="text-[11px] text-muted-foreground">
										{layer.type ?? ''}
									</span>
								{/if}
								{#if layer.spatialReferenceWkid}
									<span class="text-[11px] text-muted-foreground">
										WKID {layer.spatialReferenceWkid}
										{#if SPATIAL_REFERENCE_BASEMAP_OVERRIDES[layer.spatialReferenceWkid]}
											{' '}(auto aligns view)
										{/if}
									</span>
								{/if}
								{#if error}
									{@const errorMessage = `${error.message}. ${
										(error as any).details?.error?.details?.httpStatus === 0
											? 'Reason: CORS Error. See console for more information.'
											: ''
									}`}
									<div class="error-message" title={errorMessage}>
										<CircleX size={16} />
										<p class="text-sm text-red-600">{errorMessage}</p>
									</div>
								{/if}
							</div>
						{/if}
					</Command.Item>
				{/each}
			{/if}
		</Command.List>
	{/if}
</div>

<style>
	.item-container {
		max-width: 40vw;
		max-height: 500px;
		margin-left: 0.75rem;
		margin-right: 0.75rem;
	}

	.error-message {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.25rem;
		background-color: #fee;
		border-radius: 0.375rem;
		border: 1px solid #fcc;
		width: 100%;
	}

	.error-message :global(svg) {
		flex-shrink: 0;
		color: #dc2626;
	}

	.error-message p {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		width: 100%;
		flex: 1;
		min-width: 0;
	}

	:global(.map-button) {
		align-items: stretch;
		text-align: left;
		min-height: 2.5rem;
	}

	:global(.map-button:disabled) {
		opacity: 0.6;
		cursor: not-allowed;
	}

	:global(.map-button-with-description) {
		min-height: 3.25rem;
	}

	.title-text {
		display: block;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		width: 100%;
	}

	.description-text {
		display: block;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		width: 100%;
		line-height: 1.2;
	}
</style>
