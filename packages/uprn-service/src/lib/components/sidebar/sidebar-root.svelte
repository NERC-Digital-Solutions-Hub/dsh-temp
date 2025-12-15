<script lang="ts">
	/**
	 * Sidebar root Component
	 *
	 * A root wrapper that manages the sidebar and main content positioning.
	 * Automatically adjusts flex direction based on sidebar position.
	 *
	 * Props:
	 * - isOpen: boolean - Controls whether the sidebar is open or closed
	 * - onToggle: () => void - Callback when the toggle button is clicked
	 * - position: SidebarPosition value - Position of the sidebar (default: SidebarPosition.LEFT)
	 * - originalSize: string - Initial/default size of the sidebar
	 * - minSize: string - Minimum size of the sidebar when resizing
	 * - sidebarContent: Snippet - Content to render inside the sidebar
	 * - mainContent: Snippet - Content to render in the main area
	 */
	import type { Snippet } from 'svelte';
	import Sidebar from './sidebar.svelte';
	import { SidebarPosition } from './sidebar-position';
	import type { Menu } from '@lucide/svelte';

	type SidebarPositionType = (typeof SidebarPosition)[keyof typeof SidebarPosition];

	type Props = {
		isOpen: boolean;
		onToggle?: () => void;
		position?: SidebarPositionType;
		originalSize?: string;
		minSize?: string;
		openIcon?: typeof Menu;
		sidebarContent?: Snippet;
		mainContent?: Snippet;
		hideToggleButton?: boolean;
	};

	const {
		isOpen,
		onToggle = () => {},
		position = SidebarPosition.LEFT,
		originalSize,
		minSize,
		openIcon,
		sidebarContent,
		mainContent,
		hideToggleButton = false
	}: Props = $props();

	// Determine if we need column layout (for top/bottom positions)
	const isVertical = $derived(
		position === SidebarPosition.TOP || position === SidebarPosition.BOTTOM
	);
</script>

<div class="sidebar-layout" class:vertical={isVertical}>
	<div class="z-10">
		<Sidebar {isOpen} {onToggle} {position} {originalSize} {minSize} {openIcon} {hideToggleButton}>
			{#if sidebarContent}
				{@render sidebarContent()}
			{/if}
		</Sidebar>
	</div>

	<div class="main-content">
		{#if mainContent}
			{@render mainContent()}
		{/if}
	</div>
</div>

<style>
	.sidebar-layout {
		display: flex;
		flex-direction: row;
		height: 100%;
		width: 100%;
		overflow: hidden;
	}

	.sidebar-layout.vertical {
		flex-direction: column;
	}

	.main-content {
		flex: 1 1 auto;
		min-height: 0;
		min-width: 0;
		display: flex;
		overflow: hidden;
	}
</style>
