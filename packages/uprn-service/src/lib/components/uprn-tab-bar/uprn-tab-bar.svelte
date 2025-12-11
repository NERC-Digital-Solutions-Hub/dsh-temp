<script lang="ts">
	import * as Tabs from '$lib/components/shadcn/tabs/index.js';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import type { Snippet } from 'svelte';

	/**
	 * Definition for a tab trigger.
	 */
	type TriggerDefinition = {
		/** The value of the tab trigger. */
		value: string;
		/** The label to display for the tab trigger. */
		label: string;
	};

	/**
	 * Props for the UPRNTabBar component.
	 */
	type Props = {
		/** The currently selected tab value. */
		value?: string;
		/** Array of trigger definitions for the tabs. */
		triggers?: TriggerDefinition[];
		/** Callback function when the tab value changes. */
		onValueChange?: (value: string) => void;
		/** Optional children snippet for the tab content. */
		children?: Snippet;
	};

	const { value, triggers = [], onValueChange, children }: Props = $props();
</script>

<Tabs.Root {value} {onValueChange} class="flex h-full w-full flex-col">
	<div class="tab-list-wrapper flex-shrink-0">
		<Tabs.List class="tab-list">
			{#each triggers as { value, label }}
				<Tabs.Trigger {value} class="tab-trigger">{label}</Tabs.Trigger>
				{#if value !== triggers[triggers.length - 1]?.value}
					<ChevronRightIcon class="separator" />
				{/if}
			{/each}
		</Tabs.List>
	</div>
	{@render children?.()}
</Tabs.Root>

<style>
	.tab-list-wrapper {
		display: flex;
		justify-content: center;
		width: 100%;
		padding: 0.75rem 0;
	}

	:global(.tab-list) {
		background: white;
		border: 1px solid #e5e7eb;
		display: flex;
		align-items: center;
		gap: 0.25rem;
		height: 2.5rem;
	}

	:global(.tab-trigger) {
		background: transparent;
		border: none;
		border-radius: 0.375rem;
		padding: 0.5rem 0.75rem;
		color: #6b7280;
		font-weight: 500;
		transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
		cursor: pointer;
		height: 2rem;
		min-width: fit-content;
		display: flex;
		align-items: center;
	}

	:global(.tab-trigger:hover),
	:global(.tab-trigger[data-state='active']) {
		color: #111827;
	}

	:global(.tab-trigger:hover) {
		background: #f9fafb;
	}

	:global(.tab-trigger[data-state='active']) {
		background: #f3f4f6;
		box-shadow: none !important;
	}

	:global(.separator) {
		color: #6b7280;
		width: 0.875rem;
		height: 0.875rem;
		flex-shrink: 0;
	}
</style>
