<script lang="ts">
	import * as Button from '$lib/components/shadcn/button/index.js';
	import { MapIcon } from '@lucide/svelte';
	import { onDestroy, onMount } from 'svelte';

	type Props = {
		mapView: __esri.MapView;
	};

	type SidebarButton = {
		id: string;
		label: string;
	};

	type WidgetLoader = () => Promise<__esri.Widget>;

	const { mapView }: Props = $props();

	const sidebarButtons: SidebarButton[] = [
		{ id: 'basemap', label: 'Basemap Gallery' },
		{ id: 'layers', label: 'Layers' },
		{ id: 'bookmarks', label: 'Bookmarks' },
		{ id: 'analysis', label: 'Analysis' },
		{ id: 'settings', label: 'Map Settings' }
	];

	let activeButton = $state('');
	let activeWidget: __esri.Widget | null = null;
	let activationToken: symbol | null = null;

	const widgetCache = new Map<SidebarButton['id'], __esri.Widget>();

	const widgetLoaders: Partial<Record<SidebarButton['id'], WidgetLoader>> = {
		basemap: async () => {
			const cached = widgetCache.get('basemap');
			if (cached) return cached;

			const [{ default: BasemapGallery }] = await Promise.all([
				import('@arcgis/core/widgets/BasemapGallery')
			]);
			const widget = new BasemapGallery({ view: mapView });
			widgetCache.set('basemap', widget);
			return widget;
		}
	};

	const widgetPositions: Partial<Record<SidebarButton['id'], __esri.UIAddPosition>> = {
		basemap: { position: 'top-left' }
	};

	onMount(() => {
		mapView.ui.move('zoom', 'top-right');
	});

	const handleButtonClick = async (buttonId: SidebarButton['id']) => {
		const requestToken = Symbol('widget-activation');
		activationToken = requestToken;

		if (activeWidget) {
			mapView.ui.remove(activeWidget);
			activeWidget = null;
		}

		if (activeButton === buttonId) {
			activeButton = '';
			activationToken = null;
			return;
		}

		const loader = widgetLoaders[buttonId];
		if (!loader) {
			activeButton = buttonId;
			activationToken = null;
			return;
		}

		try {
			const widget = await loader();
			if (activationToken !== requestToken) {
				return;
			}

			const position = widgetPositions[buttonId] ?? { position: 'top-left' };
			mapView.ui.add(widget, position);
			activeWidget = widget;
			activeButton = buttonId;
		} catch (error) {
			console.error(`Failed to load widget for ${buttonId}`, error);
			activeButton = '';
		} finally {
			if (activationToken === requestToken) {
				activationToken = null;
			}
		}
	};

	onDestroy(() => {
		if (activeWidget) {
			mapView.ui.remove(activeWidget);
		}
		widgetCache.forEach((widget) => {
			mapView.ui.remove(widget);
		});
		widgetCache.clear();
	});
</script>

<div class="map-sidebar" role="navigation" aria-label="Map tools">
	{#each sidebarButtons as button}
		<Button.Root
			class={`sidebar-button ${button.id === activeButton ? 'active' : ''}`}
			variant="ghost"
			size="icon"
			aria-label={button.label}
			aria-pressed={button.id === activeButton}
			title={button.label}
			onclick={() => void handleButtonClick(button.id)}
		>
			<MapIcon aria-hidden="true" class="sidebar-icon" />
		</Button.Root>
	{/each}
</div>

<style>
	.map-sidebar {
		width: 100%;
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		background: linear-gradient(90deg, #2c2c2c 0%, #1f1f1f 100%);
		border-bottom: 1px solid #3c3c3c;
		box-shadow: 0 1px 6px rgba(0, 0, 0, 0.35);
		z-index: 20;
		flex-shrink: 0;
	}

	:global(.sidebar-button) {
		width: 2.5rem;
		height: 2.5rem;
		color: #c5c5c5;
		background-color: transparent;
		border-radius: 0.6rem;
		transition:
			background-color 0.15s ease,
			color 0.15s ease,
			box-shadow 0.15s ease,
			transform 0.15s ease;
		box-shadow: inset 0 0 0 0 transparent;
	}

	:global(.sidebar-button:hover),
	:global(.sidebar-button:focus-visible) {
		color: #ffffff;
		background-color: #333538;
		transform: translateY(-1px);
	}

	:global(.sidebar-button.active) {
		color: #ffffff;
		background-color: var(--primary);
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
	}

	:global(.sidebar-icon) {
		width: 1.5rem;
		height: 1.5rem;
	}

	@media (max-width: 720px) {
		.map-sidebar {
			flex-wrap: wrap;
			gap: 0.4rem;
			justify-content: center;
		}
	}
</style>
