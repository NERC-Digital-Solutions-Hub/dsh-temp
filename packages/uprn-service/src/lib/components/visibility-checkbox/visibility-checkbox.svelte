<script lang="ts">
	import { Eye, EyeOff, Scale } from '@lucide/svelte';
	import { cn } from '$lib/utils.js';

	let {
		checked = $bindable(false),
		indeterminate = $bindable(false),
		class: className,
		onCheckedChange,
		disabled = false,
		...restProps
	}: {
		checked?: boolean;
		indeterminate?: boolean;
		class?: string;
		onCheckedChange?: (checked: boolean) => void;
		disabled?: boolean;
	} = $props();

	function handleClick() {
		if (disabled) return;
		checked = !checked;
		onCheckedChange?.(checked);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (disabled) return;
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			e.stopPropagation();
			handleClick();
		}
	}
</script>

<button
	type="button"
	class="visibility-btn"
	class:visible={checked}
	class:indeterminate
	onclick={(e) => {
		e.stopPropagation();
		handleClick();
	}}
	onkeydown={handleKeydown}
	{disabled}
	aria-pressed={checked}
	role="switch"
	aria-label={checked ? 'Hide layer' : 'Show layer'}
	title={checked && !indeterminate
		? 'Visible'
		: indeterminate
			? 'Zoom in/out to view layer'
			: 'Not visible'}
	{...restProps}
>
	{#if checked}
		<Eye class="size-4" />
	{:else if indeterminate}
		<Eye class="size-4" />
	{:else}
		<EyeOff class="size-4" />
	{/if}
</button>

<style>
	.visibility-btn {
		/* Layout */
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1rem;
		height: 1rem;
		padding: 0;

		/* Appearance */
		background: transparent;
		border: none;
		border-radius: 0.125rem;
		cursor: pointer;

		/* Transitions */
		transition: background-color 0.1s ease-out;

		/* Focus */
		outline: none;
	}

	/* Default state - gray/muted color */
	.visibility-btn :global(svg) {
		width: 1rem;
		height: 1rem;
		display: block;
		color: #d1d5db;
		transition: color 0.1s ease-out;
	}

	/* Interactive states for non-visible button */
	.visibility-btn:not(.visible):hover {
		background-color: hsl(var(--muted));
	}

	.visibility-btn:not(.visible):hover :global(svg) {
		color: #9ca3af;
	}

	.visibility-btn:not(.visible):focus {
		background-color: hsl(var(--muted));
	}

	/* Visible state - dark/primary color */
	.visibility-btn.visible :global(svg) {
		color: hsl(var(--foreground));
	}

	/* Indeterminate state - semi-transparent */
	.visibility-btn.indeterminate :global(svg) {
		color: #9ca3af;
	}

	/* Focus ring */
	.visibility-btn:focus-visible {
		outline: 2px solid hsl(var(--ring));
		outline-offset: 2px;
	}
</style>
