<script lang="ts">
	import './layout.css';

	let { children } = $props();
</script>

<main class="main-content">
	{@render children?.()}
</main>

<style>
	.main-content {
		height: 100dvh;
		display: flex;
		flex-direction: column;
	}
</style>
