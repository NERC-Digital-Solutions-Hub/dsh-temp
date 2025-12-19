import { browser } from '$app/environment';
import { SvelteMap } from 'svelte/reactivity';
import WebMap from '@arcgis/core/WebMap';
import PortalItem from '@arcgis/core/portal/PortalItem';
import esriConfig from '@arcgis/core/config.js';
import * as urlUtils from '@arcgis/core/core/urlUtils.js';
import { getSublayerId } from '$lib/utils/treeview';
export type WebMapStoreParams = {
	portalUrl?: string | null;
	itemId: string;
	proxy?: Proxy | null;
};

export type Proxy = {
	urlPrefix: string;
	proxyUrl: string;
};

/**
 * Store for managing the webmap.
 */
export class WebMapStore {
	public isLoaded: boolean = $state(false);
	public data: __esri.WebMap | null = $state<__esri.WebMap | null>(null);
	public dataLookup: SvelteMap<string, __esri.Layer | __esri.Sublayer> = $derived.by(() => {
		const map = new SvelteMap<string, __esri.Layer | __esri.Sublayer>();
		function addLayerRecursively(layer: __esri.Layer | __esri.Sublayer) {
			const layerId =
				layer.type === 'sublayer' ? getSublayerId(layer, layer.parent as __esri.Layer) : layer.id;

			map.set(layerId, layer);
			if (layer.type === 'group') {
				const groupLayer = layer as __esri.GroupLayer;
				groupLayer.layers.forEach((lyr) => {
					addLayerRecursively(lyr);
				});
			}

			if (layer.type === 'map-image') {
				const mapImageLayer = layer as __esri.MapImageLayer;
				mapImageLayer.sublayers?.forEach((sublayer) => {
					addLayerRecursively(sublayer);
				});
			}
		}
		if (this.data) {
			this.data.layers.forEach((layer) => {
				addLayerRecursively(layer);
			});
		}
		return map;
	});
	public loading: boolean = $state<boolean>(false);
	public error: string | null = $state<string | null>(null);

	private initialPortalUrl: string | null = null;

	/**
	 * Initializes the webmap from a portal URL and item ID.
	 * @param params - The parameters for initializing the webmap.
	 */
	async initializeAsync(params: WebMapStoreParams): Promise<void> {
		if (this.data) {
			return;
		}

		if (!browser) {
			return;
		}

		this.loading = true;
		this.error = null;

		try {
			const { portalUrl, itemId, proxy } = params;
			await this.configurePortalAsync(portalUrl, proxy);
			await this.loadwebmapAsync(itemId);
		} catch (error) {
			console.error('Error initializing webmap:', error);
			this.error = (error as Error).message;
		} finally {
			this.loading = false;
		}
	}

	/**
	 * Configure the portal settings
	 * @param portalUrl - The URL of the portal
	 * @param proxy - The proxy settings
	 */
	async configurePortalAsync(portalUrl?: string | null, proxy?: Proxy | null): Promise<void> {
		if (!portalUrl) {
			if (this.initialPortalUrl) {
				esriConfig.portalUrl = this.initialPortalUrl;
			}
			return;
		}

		if (!this.initialPortalUrl) {
			this.initialPortalUrl = esriConfig.portalUrl;
		}

		esriConfig.portalUrl = portalUrl as string;
		console.log(esriConfig);

		if (!proxy) {
			return;
		}

		const { addProxyRule } = urlUtils;
		console.log('Adding proxy rule for portal traffic');
		addProxyRule({
			urlPrefix: proxy?.urlPrefix as string,
			proxyUrl: proxy?.proxyUrl as string
		});
	}

	async loadwebmapAsync(itemId: string): Promise<void> {
		if (this.data) {
			return;
		}

		const portalItem = new PortalItem({
			portal: {
				url: esriConfig.portalUrl
			},
			id: itemId
		});

		const webmap = new WebMap({
			portalItem: portalItem
		});

		this.data = webmap;

		await this.data.loadAll();
		if (this.data.loaded) {
			this.isLoaded = true;
		}
	}

	/**
	 * Clear the current webmap data
	 */
	clear(): void {
		this.data = null;
		this.loading = false;
		this.error = null;
	}

	/**
	 * Reset the error state
	 */
	clearError(): void {
		this.error = null;
	}

	/**
	 * Get the current webmap instance
	 */
	getWebmap(): __esri.WebMap | null {
		return this.data;
	}
}
