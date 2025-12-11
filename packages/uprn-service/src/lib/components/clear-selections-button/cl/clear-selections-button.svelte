<script lang="ts">
	import { Button } from '$lib/components/shadcn/button';
	import { Trash } from '@lucide/svelte';
	import { cn } from '$lib/utils.js';

	type Props = {
		clear: () => void;
		class?: string;
	};

	const { clear, class: buttonClass }: Props = $props();
</script>

<Button
	onclick={() => clear()}
	variant="ghost"
	class={cn('size-7 border-1 border-destructive', buttonClass)}
	title="Clear all selections"
>
	<Trash class="text-destructive" />
</Button>
