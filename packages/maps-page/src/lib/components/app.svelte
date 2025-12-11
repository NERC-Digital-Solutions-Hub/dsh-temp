<script lang="ts">
	import { onMount } from 'svelte';
	import CommandSearch from '$lib/components/command-search/command-search.svelte';
	import type { MapCommand } from '$lib/types/maps';
	import { asset } from '$app/paths';
	import { browser } from '$app/environment';
	import { CommandSearchContext } from '$lib/services/command-search/command-search-context';
	import { MapsConfig } from '$lib/models/maps-config';
	import { OrganisationCommandService } from '$lib/services/command-search/organisation-command-service';
	import * as Sidebar from '$lib/components/sidebar/index.js';
	import { ScrollArea } from '$lib/components/shadcn/scroll-area';
	import { MapViewService } from '$lib/services/command-search/map-view-service';
	import { getCommand } from '$lib/services/command-search/command-registry';

	// import commands
	import '$lib/services/command-search/commands/add-web-map';
	import '$lib/services/command-search/commands/add-layer';
	import '$lib/services/command-search/commands/add-organisation';
	import '$lib/services/command-search/commands/clear-map';

	const commandSearchContext = new CommandSearchContext();

	let mapView: __esri.MapView | null = $state(null);
	let commandSearchElement: HTMLElement | null = $state(null);

	let arcgisMapComponent: HTMLArcgisMapElement | null = $state(null);
	let arcgisLayerListComponent: HTMLArcgisLayerListElement | null = $state(null);

	let isOpen: boolean = $state(true);

	let commands: MapCommand[] = $state([]);

	onMount(async () => {
		if (!browser) {
			return;
		}

		const mapsConfig = await getMapsConfig();
		const organisationService = new OrganisationCommandService(mapsConfig.organisations);

		commandSearchContext.add(MapsConfig, mapsConfig);
		commandSearchContext.add(OrganisationCommandService, organisationService);

		await mountArcGisComponents();

		commands = [
			getCommand('add-web-map')!,
			getCommand('add-layer')!,
			getCommand('add-organisation')!,
			getCommand('clear-map')!
		];
	});

	async function getMapsConfig(): Promise<MapsConfig> {
		const response = await fetch(asset('/config/maps/config.json'));
		if (!response.ok) {
			throw new Error(`Failed to load maps config: ${response.status} ${response.statusText}`);
		}

		const config: any = await response.json();

		const instance = new MapsConfig(config.organisations);
		return instance;
	}

	async function handleViewReady() {
		if (!arcgisMapComponent) {
			return;
		}

		mapView = arcgisMapComponent.view as __esri.MapView;
		commandSearchContext.add(MapViewService, new MapViewService(mapView));

		const backgroundColour = '#cfd3d4' as unknown as __esri.Color;
		arcgisMapComponent.background = { color: backgroundColour };

		if (arcgisLayerListComponent) {
			arcgisLayerListComponent.view = mapView;
			arcgisLayerListComponent.listItemCreatedFunction = (event: any) => {
				const { item } = event;

				// Exclude group layers, otherwise the legend will be displayed twice
				if (item.layer.type != 'group') {
					item.panel = {
						content: 'legend',
						open: true
					};
				}
			};
		}
	}

	async function mountArcGisComponents() {
		if (!browser) {
			return;
		}

		await import('@arcgis/map-components/components/arcgis-layer-list');
		await import('@arcgis/map-components/components/arcgis-legend');
		await import('@arcgis/map-components/components/arcgis-map');
	}
</script>

<Sidebar.Root {isOpen} onToggle={() => (isOpen = !isOpen)}>
	{#snippet sidebarContent()}
		<ScrollArea class="h-full">
			<arcgis-layer-list bind:this={arcgisLayerListComponent} class="mx-2 min-h-20">
			</arcgis-layer-list>
		</ScrollArea>
	{/snippet}

	{#snippet mainContent()}
		<arcgis-map
			bind:this={arcgisMapComponent}
			class="relative h-full w-full"
			basemap="gray"
			center="-2.231774828836059,53.46531847221502"
			zoom="15"
			onarcgisViewReadyChange={handleViewReady}
		>
			{#if commands.length > 0}
				<div id="search-slot" class="absolute top-3 left-1/2 z-10 -translate-x-1/2">
					<CommandSearch
						bind:ref={commandSearchElement}
						class="w-full max-w-md"
						{commandSearchContext}
						{commands}
					/>
				</div>
			{/if}
		</arcgis-map>
	{/snippet}
</Sidebar.Root>
