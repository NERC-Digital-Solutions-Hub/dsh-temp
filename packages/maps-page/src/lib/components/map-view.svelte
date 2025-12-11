<script lang="ts">
	import { onMount } from 'svelte';

	type Props = {
		mapView: __esri.MapView;
	};

	const { mapView }: Props = $props();

	let mapContainer: HTMLDivElement | null = $state(null);

	onMount(() => {
		mapView.container = mapContainer;
	});
</script>

<div class="view" bind:this={mapContainer}></div>

<style>
	.view {
		min-width: 800px;
		width: 100%;
		height: 100%;
	}
</style>
