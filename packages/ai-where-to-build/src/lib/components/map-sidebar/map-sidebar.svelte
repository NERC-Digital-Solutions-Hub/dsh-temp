<script lang="ts">
	import * as Button from '$lib/components/shadcn/button/index.js';
	import { MapIcon } from '@lucide/svelte';
	import type { Component } from 'svelte';

	type Props = {
		options: SidebarButton[];
		onToggleItem?: (id: string, isActive: boolean) => void;
	};
	type SidebarButton = {
		id: string;
		label: string;
		icon: Component;
	};

	const { options, onToggleItem }: Props = $props();

	let activeButton = $state('');

	const handleButtonClick = async (buttonId: SidebarButton['id']) => {
		if (activeButton === buttonId) {
			activeButton = '';
			onToggleItem?.(buttonId, false);
		} else {
			activeButton = buttonId;
			onToggleItem?.(buttonId, true);
		}
	};
</script>

<div class="map-sidebar" role="navigation" aria-label="Map tools">
	{#each options as option}
		<Button.Root
			class={`sidebar-button ${option.id === activeButton ? 'active' : ''}`}
			variant="ghost"
			size="icon"
			aria-label={option.label}
			aria-pressed={option.id === activeButton}
			title={option.label}
			onclick={() => void handleButtonClick(option.id)}
		>
			{@const Icon = option.icon}
			<Icon aria-hidden="true" class="sidebar-icon" />
		</Button.Root>
	{/each}
</div>

<style>
	.map-sidebar {
		width: 3.5rem;
		min-width: 3.5rem;
		height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-start;
		gap: 0.65rem;
		padding: 1.25rem 0.5rem;
		background-color: var(--sidebar);
		border-right: 1px solid var(--sidebar-border);
		box-shadow: 2px 0 8px oklch(0 0 0 / 10%);
		z-index: 20;
	}

	:global(.sidebar-button) {
		width: 2.5rem;
		height: 2.5rem;
		color: var(--sidebar-foreground);
		background-color: transparent;
		border: 1px solid var(--sidebar-border);
		border-radius: 0.6rem;
		transition:
			background-color 0.15s ease,
			color 0.15s ease,
			box-shadow 0.15s ease,
			transform 0.15s ease;
		box-shadow: inset 0 0 0 0 transparent;
	}

	:global(.sidebar-button:hover),
	:global(.sidebar-button:focus-visible) {
		color: var(--sidebar-accent-foreground);
		background-color: var(--sidebar-accent);
		transform: translateY(-1px);
	}

	:global(.sidebar-button.active) {
		color: var(--sidebar-primary-foreground);
		background-color: var(--sidebar-primary);
		box-shadow: 0 2px 6px oklch(0 0 0 / 15%);
	}

	:global(.sidebar-icon) {
		width: 1.5rem;
		height: 1.5rem;
	}

	@media (max-width: 720px) {
		.map-sidebar {
			width: 100%;
			min-width: unset;
			height: auto;
			flex-direction: row;
			flex-wrap: wrap;
			gap: 0.4rem;
			padding: 0.5rem 0.75rem;
			justify-content: center;
			border-right: none;
			box-shadow: 0 1px 6px oklch(0 0 0 / 15%);
			border-bottom: 1px solid var(--sidebar-border);
		}
	}
</style>
