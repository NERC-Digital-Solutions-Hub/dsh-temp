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
	import { asset } from '$app/paths';
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

	// We keep the view/basemap stable (typically Web Mercator) and do NOT switch SR.
	const DESIRED_BASEMAP_ID = 'gray-vector'; // or 'dark-gray-vector'

	const filteredLayers = $derived.by(() => {
		const results = layers;
		const normalizedQuery = query.trim().toLowerCase();
		if (!normalizedQuery) return results;

		return results.filter((item) => {
			const title = item?.title?.toLowerCase() ?? '';
			const description = item?.description?.toLowerCase() ?? '';
			return title.includes(normalizedQuery) || description.includes(normalizedQuery);
		});
	});

	onMount(async () => {
		if (!browser) return;

		mapView = commandSearchContext.get(MapViewService).mapView;

		// Force the basemap to gray and keep it stable.
		try {
			const { default: Basemap } = await import('@arcgis/core/Basemap');
			if (mapView?.map) {
				mapView.map.basemap = await Basemap.fromId(DESIRED_BASEMAP_ID);
			}
		} catch (e) {
			console.warn(`Failed to set basemap "${DESIRED_BASEMAP_ID}"`, e);
		}

		const organisationService = commandSearchContext.get(OrganisationCommandService);
		const activeOrgId = organisationService.getActiveOrganisationId();
		if (!activeOrgId) {
			console.warn('No active organisation selected in OrganisationCommandService');
			return;
		}

		isLoading = true;
		try {
			const LAYER_TYPES = ['Feature Layer', 'Feature Service', 'Map Service', 'Image Service'];
			const response = await fetch(asset(`/api/maps/${activeOrgId}.json`));
			if (!response.ok) {
				throw new Error(`Failed to fetch maps: ${response.status} ${response.statusText}`);
			}

			const data = await response.json();

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
		if (addedLayers.has(itemId)) {
			removeLayerFromMap(itemId);
		} else {
			await addLayerToMap(itemId);
		}
	}

	function removeLayerFromMap(itemId: string) {
		const layer = addedLayers.get(itemId);
		if (!layer || !mapView?.map) return;

		mapView.map.remove(layer);
		addedLayers.delete(itemId);
		addedLayers = addedLayers;
		console.log(`Layer removed from the map: ${itemId}`);
	}

	function isLayerAdded(itemId: string): boolean {
		for (const lyr of mapView?.map?.allLayers ?? []) {
			if (lyr.portalItem?.id === itemId) return true;
		}
		return false;
	}

	// ----------------------------
	// Layer compatibility helpers
	// ----------------------------

	type SupportedLayer =
		| __esri.FeatureLayer
		| __esri.MapImageLayer
		| __esri.TileLayer
		| __esri.VectorTileLayer;

	function isTiled(layer: __esri.Layer): layer is __esri.TileLayer | __esri.VectorTileLayer {
		return layer.type === 'tile' || layer.type === 'vector-tile';
	}

	function wkidOf(sr?: __esri.SpatialReference | null): number | undefined {
		return sr?.wkid ?? sr?.latestWkid ?? undefined;
	}

	async function getTiledLayerWkid(
		layer: __esri.TileLayer | __esri.VectorTileLayer
	): Promise<number | undefined> {
		await layer.load();
		const ti = (layer as any).tileInfo as __esri.TileInfo | undefined;
		return wkidOf(ti?.spatialReference ?? layer.spatialReference ?? null);
	}

	/**
	 * We keep the basemap (gray) stable.
	 * Therefore, we do NOT switch the MapView spatialReference.
	 *
	 * - FeatureLayer / MapImageLayer: OK to add (server-side reprojection usually works).
	 * - TileLayer / VectorTileLayer: ONLY add if its tile scheme WKID matches the view WKID;
	 *   otherwise it will be invisible (suspended) just like your basemap was.
	 */
	async function ensureLayerCompatibleWithStableView(layer: SupportedLayer) {
		if (!mapView) return;

		const viewWkid = wkidOf(mapView.spatialReference ?? null);

		if (!isTiled(layer)) return;

		const layerWkid = await getTiledLayerWkid(layer);
		if (!viewWkid || !layerWkid) {
			// If we can't determine, allow it but warn (could still end up invisible).
			console.warn('Unable to determine WKID for tiled layer or view; layer may not display.');
			return;
		}

		if (layerWkid !== viewWkid) {
			throw new Error(
				`This is a tiled layer (tile scheme WKID ${layerWkid}) but the map view is WKID ${viewWkid}. ` +
					`Tiled/VectorTile layers cannot be reprojected, so it would not display.`
			);
		}
	}

	async function addLayerToMap(itemId: string) {
		if (!browser) return;

		if (!mapView?.map) {
			layerIdError.set(itemId, new Error('Map is not ready. Please wait and try again.'));
			return;
		}

		loadingLayerId = itemId;
		layerIdError.delete(itemId);

		try {
			// Keep basemap pinned to gray (in case anything else changed it)
			try {
				const { default: Basemap } = await import('@arcgis/core/Basemap');
				mapView.map.basemap = await Basemap.fromId(DESIRED_BASEMAP_ID);
			} catch {}

			const organisationService = commandSearchContext.get(OrganisationCommandService);
			const portalUrl: string = organisationService.getActiveOrganisationPortalUrl();

			const [
				{ default: Layer },
				{ default: Portal },
				{ default: FeatureLayer },
				{ default: MapImageLayer },
				{ default: TileLayer },
				{ default: VectorTileLayer }
			] = await Promise.all([
				import('@arcgis/core/layers/Layer'),
				import('@arcgis/core/portal/Portal'),
				import('@arcgis/core/layers/FeatureLayer'),
				import('@arcgis/core/layers/MapImageLayer'),
				import('@arcgis/core/layers/TileLayer'),
				import('@arcgis/core/layers/VectorTileLayer')
			]);

			const portal = new Portal({ url: portalUrl });

			const layer = (await Layer.fromPortalItem({
				portalItem: { id: itemId, portal }
			})) as __esri.Layer;

			if (
				!(layer instanceof FeatureLayer) &&
				!(layer instanceof MapImageLayer) &&
				!(layer instanceof TileLayer) &&
				!(layer instanceof VectorTileLayer)
			) {
				throw new Error(`Unsupported layer type "${layer.type}" for item ID ${itemId}`);
			}

			console.log(`Adding layer to the map: ${itemId}`);

			const supported = layer as SupportedLayer;
			await supported.load();

			// No SR switching. Just reject incompatible tiled layers.
			await ensureLayerCompatibleWithStableView(supported);

			mapView.map.add(supported);
			addedLayers.set(itemId, supported);
			addedLayers = addedLayers;

			console.log(`Layer added to the map: ${itemId}`, 'basemap:', mapView.map.basemap);

			try {
				await mapView.whenLayerView(supported);
				if ((supported as any).fullExtent) {
					await mapView.goTo((supported as any).fullExtent);
				}
			} catch (viewError) {
				console.warn('Layer view not ready for navigation', viewError);
			}
		} catch (error) {
			console.error('Error loading layer:', error);
			layerIdError.set(itemId, error as Error);
		} finally {
			loadingLayerId = null;
		}
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
