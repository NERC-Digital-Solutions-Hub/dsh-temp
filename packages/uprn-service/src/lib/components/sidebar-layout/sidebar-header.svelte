<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		children?: Snippet;
	};

	const { children }: Props = $props();
</script>

<!-- Fixed header section -->
<div class="w-full flex-shrink-0">
	{#if children}
		{@render children()}
	{/if}
</div>
