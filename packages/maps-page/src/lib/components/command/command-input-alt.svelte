<script lang="ts">
	import { Command as CommandPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils.js';
	import { CommandIcon } from '@lucide/svelte';
	import type { Component } from 'svelte';
	import CommandVariableContainer from '$lib/components/command/command-variable-container.svelte';

	type Props = {
		icon?: Component;
		iconProps?: Record<string, unknown>;
		commandId?: string;
		onCommandClose?: (() => void) | null;
	} & CommandPrimitive.InputProps;

	let {
		ref = $bindable(null),
		class: className,
		value = $bindable(''),
		icon,
		iconProps = {},
		commandId,
		onCommandClose = null,
		...restProps
	}: Props = $props();

	$effect(() => {
		if (!value) {
			return;
		}
		console.log('Command Input Value Changed:', value);
	});
</script>

<div class="flex h-9 items-center gap-2 pl-2" data-slot="command-input-wrapper">
	<span
		class="flex h-full min-w-[1.25rem] shrink-0 items-center justify-center text-muted-foreground"
	>
		{#if icon}
			{@const IconComponent = icon}
			<IconComponent {...iconProps} />
		{:else}
			<CommandIcon class="size-4 opacity-50" />
		{/if}
	</span>

	{#if commandId}
		<CommandVariableContainer value={commandId} title={commandId} onClose={onCommandClose} />
		<span aria-hidden="true" class="h-5 w-px bg-border"></span>
	{/if}

	<CommandPrimitive.Input
		data-slot="command-input"
		class={cn(
			'flex h-10 flex-1 rounded-md bg-transparent py-3 text-sm outline-hidden placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
			className
		)}
		bind:ref
		{...restProps}
		bind:value
	/>
</div>
