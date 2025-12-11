<script lang="ts">
	import '../app.css';
	import NavBar from '$lib/components/nav-bar/nav-bar.svelte';

	let { children } = $props();
</script>

<main class="main-content">
	<NavBar />
	{@render children?.()}
</main>

<style>
	.main-content {
		height: 100dvh;
		display: flex;
		flex-direction: column;
	}
</style>
