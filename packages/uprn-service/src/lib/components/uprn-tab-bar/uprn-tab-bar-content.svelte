<script lang="ts">
	import * as Card from '$lib/components/shadcn/card/index.js';
	import type { Snippet } from 'svelte';

	/**
	 * Props for the UPRNTabBarContent component.
	 */
	type Props = {
		/** Optional children snippet for the tab content. */
		children?: Snippet;
	};

	const { children }: Props = $props();
</script>

<div class="flex min-h-0 flex-1 flex-col">
	<Card.Content class="card-content flex min-h-0 flex-1 flex-col overflow-hidden p-0">
		<div class="min-w-0 space-y-2 overflow-hidden p-4">
			{@render children?.()}
		</div>
	</Card.Content>
</div>
