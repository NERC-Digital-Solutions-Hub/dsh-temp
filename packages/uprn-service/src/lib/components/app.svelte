<script lang="ts">
	import AreaSelectionHoverCard from '$lib/components/area-selection-hover-card/area-selection-hover-card.svelte';
	import AreaSelectionToast from '$lib/components/area-selection-toast/area-selection-toast.svelte';
	import UprnChat from '$lib/components/chat/chat.svelte';
	import DownloadsMenu from '$lib/components/downloads-menu/downloads-menu.svelte';
	import ExportMenuFooter from '$lib/components/export-menu/export-menu-footer.svelte';
	import ExportMenu from '$lib/components/export-menu/export-menu.svelte';
	import FieldSelectionMenu from '$lib/components/field-selection-menu/field-selection-menu.svelte';
	import AreaSelectionTreeview2 from '$lib/components/tree-view/area-selection/tree-view.svelte';
	import DataSelectionTreeview from '$lib/components/tree-view/data-selection/tree-view.svelte';
	import UprnMapView from '$lib/components/uprn-map-view/uprn-map-view.svelte';
	import UprnTabBarContent from '$lib/components/uprn-tab-bar/uprn-tab-bar-content.svelte';
	import UprnTabBar from '$lib/components/uprn-tab-bar/uprn-tab-bar.svelte';
	import * as Sidebar from '$lib/components/sidebar/index.js';
	import * as SidebarLayout from '$lib/components/sidebar-layout/index.js';
	import { SidebarPosition } from '$lib/components/sidebar/sidebar-position.js';
	import { Toaster } from '$lib/components/shadcn/sonner';
	import { AreaSelectionStore } from '$lib/stores/area-selection-store.svelte';
	import { AreaSelectionInteractionStore } from '$lib/stores/area-selection-interaction-store.svelte';
	import FieldFilterMenuStore from '$lib/stores/field-filter-menu-store.svelte';
	import { TreeviewConfigStore } from '$lib/stores/treeview-config-store';
	import { WebMapStore } from '$lib/stores/web-map-store.svelte';
	import type { PortalItemConfig, SizeConfig } from '$lib/types/config';
	import type { TreeviewConfig } from '$lib/types/treeview.js';
	import { onDestroy, onMount } from 'svelte';
	import { DataSelectionStore } from '$lib/stores/data-selection-store.svelte';
	import { UprnDownloadService } from '$lib/services/uprn-download-service';
	import { AiUprnChatbotService } from '$lib/services/ai-uprn-chatbot-service';
	import { CustomRendererService } from '$lib/services/custom-renderer-service';
	import CollapsibleWindow from '$lib/components/collapsible-window/collapsible-window.svelte';
	import { asset, base } from '$app/paths';
	import { LayerViewProvider } from '$lib/services/layer-view-provider';
	import { SelectionTrackingStore } from '$lib/stores/selection-tracking-store.svelte';
	import OptionsDialog from '$lib/components/options-dialog/options-dialog.svelte';
	import { uprnConfigStore } from '$lib/stores/uprn-store.svelte';

	const tabBarTriggers = [
		{
			value: 'define-areas',
			label: 'Define Areas'
		},
		{
			value: 'select-data',
			label: 'Select Data'
		},
		{
			value: 'export',
			label: 'Export'
		},
		{
			value: 'downloads',
			label: 'Download'
		}
	];

	let areaSelectionTreeview: DataSelectionTreeview | undefined = undefined;
	let dataSelectionTreeview: DataSelectionTreeview | undefined = undefined;
	let uprnMapView: UprnMapView | undefined = undefined;

	const webMapStore: WebMapStore = $state(new WebMapStore());
	const fieldFilterMenuStore: FieldFilterMenuStore = $state(new FieldFilterMenuStore());

	// Maps state management
	let maps = $derived(
		uprnConfigStore.instance?.mapsConfig
			.map((m) => m.value)
			.filter((v): v is PortalItemConfig => v !== undefined) ?? []
	);
	let currentMapIndex: number = $state(0);
	let currentMap = $derived(maps[currentMapIndex]);

	let currentTab: string = $state('define-areas');
	let dataSelectionStore: DataSelectionStore = $state(new DataSelectionStore());
	let areaSelectionStore: AreaSelectionStore = $state(new AreaSelectionStore());
	let areaSelectionInteractionStore: AreaSelectionInteractionStore | null = $state(null);
	let selectionTrackingStore: SelectionTrackingStore = $state(
		new SelectionTrackingStore(areaSelectionStore, dataSelectionStore)
	);

	let mapView: __esri.MapView | null = $state(null);
	let dataSelectionTreeviewConfig: TreeviewConfigStore | undefined = $state();
	let areaSelectionTreeviewConfig: TreeviewConfigStore | undefined = $state();
	let customRendererService = new CustomRendererService();
	let customRendererServiceReady = $state(false);

	let uprnDownloadApi = $derived(
		uprnConfigStore.instance?.uprnDownloadApiConfig.value
			? new UprnDownloadService(uprnConfigStore.instance.uprnDownloadApiConfig.value)
			: undefined
	);

	let aiUprnChatbotApi = $derived(
		uprnConfigStore.instance?.uprnChatbotApiConfig.value
			? new AiUprnChatbotService(uprnConfigStore.instance.uprnChatbotApiConfig.value)
			: undefined
	);

	let isUprnDownloadServiceAvailable: boolean = $state(false);
	let isAiUprnChatbotServiceAvailable: boolean = $state(false);
	let fieldsToHide: Set<string> = $state(new Set());
	let selectionLayers: Set<string> = $state(new Set());

	// === Sidebar State ===
	let mainSidebarOpen = $state(true);
	let mainSidebarPosition = $state<Sidebar.PositionType>(SidebarPosition.LEFT);
	let chatSidebarOpen = $state(true);
	let chatSidebarPosition = $state<Sidebar.PositionType>(SidebarPosition.BOTTOM);
	let mainSidebarSizes: SizeConfig[] = $derived(uprnConfigStore.instance?.mainSidebarSizes ?? []);
	let windowWidth = $state(typeof window !== 'undefined' ? window.innerWidth : 1280);

	// === Derived State for Responsive Sidebar Sizing ===

	/**
	 * Derives the original size (initial size) based on window width and breakpoints.
	 */
	let mainSidebarOriginalSize = $derived.by(
		() => getMatchingSize(mainSidebarSizes, (config) => config.originalSize) ?? '300px'
	);

	/**
	 * Derives the minimum size (for resizing) based on window width and breakpoints.
	 */
	let mainSidebarMinSize = $derived.by(
		() => getMatchingSize(mainSidebarSizes, (config) => config.minSize) ?? '200px'
	);

	/**
	 * Gets the matching size configuration based on window width breakpoints.
	 * @param sizes - Array of size configurations with breakpoints
	 * @param expr - Function to extract the desired size property from a config
	 * @returns The matching size string or '0' if no match found
	 */
	function getMatchingSize(sizes: SizeConfig[], expr: (config: SizeConfig) => string) {
		if (!sizes || sizes.length === 0) {
			return undefined;
		}

		const sortedSizes = [...sizes].sort((a, b) => b.breakpoint - a.breakpoint);
		const matchingSize = sortedSizes.find((config) => windowWidth >= config.breakpoint);
		return matchingSize ? expr(matchingSize) : '0';
	}

	/**
	 * Toggles the main sidebar open/closed state.
	 */
	function toggleMainSidebar() {
		mainSidebarOpen = !mainSidebarOpen;
	}

	/**
	 * Toggles the chat sidebar open/closed state.
	 */
	function toggleChatSidebar() {
		chatSidebarOpen = !chatSidebarOpen;
	}

	/**
	 * Handles tab value changes and updates the current tab state.
	 * @param value - The new tab value to switch to
	 */
	function onTabValueChange(value: string) {
		currentTab = value;
	}

	/**
	 * Switches to the downloads tab, typically called after a successful export.
	 */
	function switchToDownloadsTab() {
		currentTab = 'downloads';
	}

	function setMapIndex(index: number) {
		if (index < 0 || index >= maps.length) {
			console.warn(`[uprn/page] Invalid map index: ${index}`);
			return;
		}

		clearAllSelections();

		currentTab = 'define-areas';

		// Reset webmap store to force reload
		webMapStore.data = null;
		webMapStore.isLoaded = false;

		currentMapIndex = index;
	}

	function clearAllSelections() {
		console.log('[uprn/page] Clearing all selections');
		areaSelectionStore.setLayerId(null);
		areaSelectionStore.clearSelectedAreas();
		dataSelectionStore.clearSelections();
		areaSelectionTreeview?.clearSelections();
		dataSelectionTreeview?.clearSelections();
	}

	/**
	 * Initializes the application by loading configuration and setting up stores.
	 */
	onMount(async () => {
		//await clearDatabase();

		try {
			await uprnConfigStore.load(`${base}/config/apps/uprn/config.json`);
		} catch (error) {
			console.error('[uprn/page] Failed to load UPRN config', error);
		}

		const { default: MapView } = await import('@arcgis/core/views/MapView');
		mapView = new MapView();

		areaSelectionInteractionStore = new AreaSelectionInteractionStore(
			areaSelectionStore,
			new LayerViewProvider(mapView)
		);
	});

	$effect(() => {
		if (uprnDownloadApi) {
			uprnDownloadApi.getHealth().then((available) => {
				isUprnDownloadServiceAvailable = available;
				if (available) console.log('[uprn/page] UPRN Download Service is available');
				else console.warn('[uprn/page] UPRN Download Service is NOT available');
			});
		} else {
			isUprnDownloadServiceAvailable = false;
		}
	});

	$effect(() => {
		if (aiUprnChatbotApi) {
			aiUprnChatbotApi.getHealth().then((available) => {
				isAiUprnChatbotServiceAvailable = available;
				if (available) console.log('[uprn/page] AI UPRN Chatbot Service is available');
				else console.warn('[uprn/page] AI UPRN Chatbot Service is NOT available');
			});
		} else {
			isAiUprnChatbotServiceAvailable = false;
		}
	});

	/**
	 * Effect to reinitialize map-dependent components when currentMapIndex changes.
	 * This allows for easy switching between different map configurations.
	 */
	$effect(() => {
		if (!currentMap || !mapView || !areaSelectionInteractionStore) {
			return;
		}

		console.log(`[uprn/page] Loading map ${currentMapIndex + 1} of ${maps.length}`);

		if (currentMap.customRenderers) {
			customRendererServiceReady = false;
			const customRendererPath = asset(currentMap.customRenderers);
			customRendererService
				.init(customRendererPath)
				.then(() => (customRendererServiceReady = true))
				.catch((e) => console.error('[uprn/page] Failed to load custom renderers', e));
		}

		selectionTrackingStore.portalItemId = currentMap.portalItemId || null;

		// Update selection layers and field infos
		selectionLayers = new Set((currentMap.selectableLayers || []).map((s) => s.id));
		areaSelectionInteractionStore.setFieldInfos(currentMap.selectableLayers || []);

		// Update treeview configurations
		dataSelectionTreeviewConfig = new TreeviewConfigStore(
			currentMap.dataTreeview as TreeviewConfig
		);
		areaSelectionTreeviewConfig = new TreeviewConfigStore(
			currentMap.areaTreeview as TreeviewConfig
		);

		// Update fields to hide
		fieldsToHide = new Set(currentMap.dataTreeview?.fieldsToHide || []);

		// Initialize the web map with new configuration
		webMapStore.initializeAsync({
			portalUrl: currentMap.portalUrl,
			itemId: currentMap.portalItemId || '',
			proxy: currentMap.proxy
		});
	});

	/**
	 * Sets up window resize listener for reactive sidebar sizing.
	 */
	onMount(() => {
		const handleResize = () => {
			windowWidth = window.innerWidth;
		};

		window.addEventListener('resize', handleResize);

		return () => {
			window.removeEventListener('resize', handleResize);
		};
	});

	onDestroy(() => {
		dataSelectionStore.cleanup();
	});
</script>

<Toaster />
<FieldSelectionMenu {dataSelectionStore} {fieldFilterMenuStore} {fieldsToHide} />
{#if areaSelectionInteractionStore}
	<AreaSelectionHoverCard {areaSelectionInteractionStore} />
	<AreaSelectionToast {areaSelectionInteractionStore} />
{/if}

<Sidebar.Root
	isOpen={mainSidebarOpen}
	onToggle={toggleMainSidebar}
	position={mainSidebarPosition}
	originalSize={mainSidebarOriginalSize}
	minSize={mainSidebarMinSize}
>
	{#snippet sidebarContent()}
		<div class="relative flex h-full w-full min-w-0 flex-col overflow-visible">
			<OptionsDialog
				{maps}
				{currentMapIndex}
				onSelectMap={setMapIndex}
				buttonClass="absolute top-0 left-0 z-10 shadow-none p-0 w-8 h-8 hover:bg-transparent focus:outline-none focus:ring-0 ml-1 mt-1"
			/>

			<SidebarLayout.Header>
				<UprnTabBar value={currentTab} triggers={tabBarTriggers} onValueChange={onTabValueChange} />
			</SidebarLayout.Header>

			<SidebarLayout.Content>
				<div hidden={currentTab !== 'define-areas'}>
					<UprnTabBarContent>
						{#if webMapStore.isLoaded}
							<AreaSelectionTreeview2
								bind:this={areaSelectionTreeview}
								webMap={webMapStore.data!}
								treeviewConfigStore={areaSelectionTreeviewConfig!}
								{areaSelectionStore}
							/>
						{/if}
					</UprnTabBarContent>
				</div>

				<div hidden={currentTab !== 'select-data'}>
					<UprnTabBarContent>
						{#if webMapStore.isLoaded && customRendererServiceReady}
							<DataSelectionTreeview
								bind:this={dataSelectionTreeview}
								webMap={webMapStore.data!}
								{dataSelectionStore}
								layerViewProvider={uprnMapView?.getLayerViewProvider()!}
								treeviewConfigStore={dataSelectionTreeviewConfig!}
								{customRendererService}
								{fieldFilterMenuStore}
							/>
						{/if}
					</UprnTabBarContent>
				</div>

				<div hidden={currentTab !== 'export'}>
					<UprnTabBarContent>
						{#if areaSelectionInteractionStore && webMapStore.isLoaded}
							<ExportMenu
								{webMapStore}
								{areaSelectionInteractionStore}
								{dataSelectionStore}
								dataSelectionTreeviewConfig={dataSelectionTreeviewConfig!}
								{fieldFilterMenuStore}
							/>
						{/if}
					</UprnTabBarContent>
				</div>

				<div hidden={currentTab !== 'downloads'}>
					<UprnTabBarContent>
						{#if !uprnDownloadApi || !isUprnDownloadServiceAvailable}
							<p class="p-4 text-center text-sm text-gray-500">
								Download service is not available.
							</p>
						{:else}
							<DownloadsMenu {webMapStore} uprnDownloadService={uprnDownloadApi} {fieldsToHide} />
						{/if}
					</UprnTabBarContent>
				</div>
			</SidebarLayout.Content>
			<SidebarLayout.Footer>
				<div hidden={currentTab !== 'export'}>
					{#if areaSelectionInteractionStore}
						<ExportMenuFooter
							onExportSuccess={switchToDownloadsTab}
							clearSelections={clearAllSelections}
							{areaSelectionInteractionStore}
							{dataSelectionStore}
						/>
					{/if}
				</div>
			</SidebarLayout.Footer>

			<CollapsibleWindow isOpenedOnInit={true}>
				{#if !aiUprnChatbotApi || !isAiUprnChatbotServiceAvailable}
					<p class="p-4 text-center text-sm text-gray-500">
						AI UPRN Chatbot service is not available.
					</p>
				{:else}
					<UprnChat aiUprnChatbotService={aiUprnChatbotApi} />
				{/if}
			</CollapsibleWindow>
		</div>
	{/snippet}

	{#snippet mainContent()}
		{#if areaSelectionInteractionStore}
			<UprnMapView
				bind:this={uprnMapView}
				webMap={webMapStore.data!}
				mapView={mapView!}
				{areaSelectionInteractionStore}
				interactableLayers={selectionLayers}
			/>
		{/if}
	{/snippet}
</Sidebar.Root>

<style>
	:global(.card-content) {
		font-size: 0.875rem;
		line-height: 1.25rem;
		transition-property: all;
		transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
		transition-duration: 150ms;
	}
</style>
