<script lang="ts">
	import { ChevronRight } from '@lucide/svelte';

	type Props = {
		isOpen: boolean;
	};

	const { isOpen }: Props = $props();
</script>

<ChevronRight
	class="h-4 w-4 text-muted-foreground transition-transform duration-200 ease-in-out {isOpen
		? 'rotate-90'
		: 'rotate-0'}"
/>
