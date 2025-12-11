<script lang="ts">
	import { Checkbox as CheckboxPrimitive } from 'bits-ui';
	import DownloadIcon from '@lucide/svelte/icons/arrow-down-to-line';
	import MinusIcon from '@lucide/svelte/icons/minus';
	import { cn, type WithoutChildrenOrChild } from '$lib/utils.js';

	let {
		ref = $bindable(null),
		checked = $bindable(false),
		indeterminate = $bindable(false),
		class: className,
		...restProps
	}: WithoutChildrenOrChild<CheckboxPrimitive.RootProps> = $props();

	let internalChecked = $state(checked);
	let internalIndeterminate = $state(indeterminate);

	$effect(() => {
		internalChecked = checked;
	});

	$effect(() => {
		internalIndeterminate = indeterminate;
	});
</script>

<CheckboxPrimitive.Root
	bind:ref
	data-slot="checkbox"
	class={cn(
		'peer flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-input shadow-xs transition-shadow outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground dark:bg-input/30 dark:aria-invalid:ring-destructive/40 dark:data-[state=checked]:bg-primary',
		className
	)}
	bind:checked={internalChecked}
	bind:indeterminate={internalIndeterminate}
	{...restProps}
>
	{#snippet children({ checked, indeterminate })}
		<div data-slot="checkbox-indicator" class="text-current transition-none">
			{#if checked}
				<DownloadIcon class="size-3.5" />
			{:else if indeterminate}
				<MinusIcon class="size-3.5" />
			{/if}
		</div>
	{/snippet}
</CheckboxPrimitive.Root>
