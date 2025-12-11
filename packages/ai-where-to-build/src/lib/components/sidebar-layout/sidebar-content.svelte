<script lang="ts">
	import { ScrollArea } from '$lib/components/shadcn/scroll-area';
	import type { Snippet } from 'svelte';

	type Props = {
		children?: Snippet;
	};

	const { children }: Props = $props();
</script>

<!-- Scrollable content section -->
<div class="w-full flex-1 overflow-hidden pr-1.5 pl-1.5">
	<ScrollArea class="h-full w-full">
		<div class="min-w-0 space-y-2 overflow-hidden">
			{#if children}
				{@render children()}
			{/if}
		</div>
	</ScrollArea>
</div>
