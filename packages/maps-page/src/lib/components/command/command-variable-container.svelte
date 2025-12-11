<script lang="ts">
	import { X } from '@lucide/svelte';
	import { cn } from '$lib/utils.js';

	type Props = {
		value: string;
		title?: string;
		onClose?: (() => void) | null;
		class?: string;
	};

	let { value, title, onClose = null, class: className }: Props = $props();

	const tooltip = title ?? value;

	function handleClose(event: MouseEvent) {
		event.stopPropagation();
		onClose?.();
	}
</script>

<div
	class={cn(
		'group inline-flex max-w-[10rem] items-center overflow-hidden rounded border border-border px-1 py-0.5 text-xs font-medium text-muted-foreground transition-all',
		className
	)}
	title={tooltip}
>
	<span class="truncate">{value}</span>
	{#if onClose}
		<button
			type="button"
			class="pointer-events-none flex h-4 w-0 items-center justify-center rounded text-muted-foreground opacity-0 transition-[width,margin-left,opacity] group-hover:pointer-events-auto group-hover:ml-1 group-hover:w-4 group-hover:opacity-100"
			onclick={handleClose}
			aria-label={`Clear ${value}`}
		>
			<X class="size-3" />
		</button>
	{/if}
</div>
