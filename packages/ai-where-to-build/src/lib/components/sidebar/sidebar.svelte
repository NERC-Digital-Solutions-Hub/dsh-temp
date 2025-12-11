<script lang="ts">
	/**
	 * Sidebar Component
	 *
	 * A resizable sidebar that can be positioned on any side of the screen.
	 *
	 * Props:
	 * - isOpen: boolean - Controls whether the sidebar is open or closed
	 * - onToggle: () => void - Callback when the toggle button is clicked
	 * - position: SidebarPosition value - Position of the sidebar (default: SidebarPosition.LEFT)
	 * - minSize: string - Minimum size of the sidebar (default: '500px' for left/right, '300px' for top/bottom)
	 * - openIcon: Icon component - Custom icon to display when sidebar is closed (default: Menu)
	 * - children: Snippet - Content to render inside the sidebar
	 */
	import { Button } from '$lib/components/shadcn/button';
	import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Menu } from '@lucide/svelte';
	import type { Snippet } from 'svelte';
	import { onMount } from 'svelte';
	import { SidebarPosition } from './sidebar-position';

	type SidebarPositionType = (typeof SidebarPosition)[keyof typeof SidebarPosition];

	type Props = {
		isOpen: boolean;
		onToggle: () => void;
		children?: Snippet;
		minSize?: string;
		originalSize?: string;
		position?: SidebarPositionType;
		hideToggleButton?: boolean;
		openIcon?: typeof Menu;
	};

	const {
		isOpen,
		onToggle,
		children,
		minSize,
		originalSize,
		position = SidebarPosition.LEFT,
		hideToggleButton = false,
		openIcon = Menu
	}: Props = $props();

	// Constants
	const RESIZE_HANDLE_SIZE = 6;
	const DEFAULT_SIZE = '500px';
	const HEADER_OFFSET = 'var(--header-height, 64px)';

	// State
	let sidebarElement: HTMLElement;
	let sidebarSize = $state(0);
	let currentSize = $state(originalSize ?? DEFAULT_SIZE);
	let isResizing = $state(false);
	let hasManuallyResized = $state(false);

	// Derived values
	const isHorizontal = $derived(
		position === SidebarPosition.LEFT || position === SidebarPosition.RIGHT
	);
	const isStartPosition = $derived(
		position === SidebarPosition.LEFT || position === SidebarPosition.TOP
	);
	const defaultMinSize = $derived(isHorizontal ? '500px' : '100px');
	const finalMinSize = $derived(minSize ?? defaultMinSize);
	const minSizePx = $derived(parseFloat(finalMinSize));
	const sizeProperty = $derived(isHorizontal ? 'width' : 'height');
	const resizeCursor = $derived(isHorizontal ? 'ew-resize' : 'ns-resize');

	// Update current size when minSize or originalSize changes (only if user hasn't manually resized)
	$effect(() => {
		if (!hasManuallyResized) {
			currentSize = originalSize ?? finalMinSize;
			console.log(
				'Sidebar size updated due to minSize/originalSize change:',
				currentSize,
				originalSize
			);
		}
	});

	// Track sidebar size with ResizeObserver
	onMount(() => {
		if (!sidebarElement) return;

		const resizeObserver = new ResizeObserver((entries) => {
			for (const entry of entries) {
				sidebarSize = isHorizontal ? entry.contentRect.width : entry.contentRect.height;
			}
		});

		resizeObserver.observe(sidebarElement);
		return () => resizeObserver.disconnect();
	});

	// Handle resize dragging
	function startResize(e: MouseEvent) {
		if (!isOpen) return;

		isResizing = true;
		e.preventDefault();

		const startPos = isHorizontal ? e.clientX : e.clientY;
		const startSize = parseFloat(currentSize);

		function onMouseMove(e: MouseEvent) {
			const currentPos = isHorizontal ? e.clientX : e.clientY;
			const delta = isStartPosition ? currentPos - startPos : startPos - currentPos;
			const newSize = Math.max(minSizePx, startSize + delta);
			currentSize = `${newSize}px`;
			hasManuallyResized = true;
		}

		function onMouseUp() {
			isResizing = false;
			document.removeEventListener('mousemove', onMouseMove);
			document.removeEventListener('mouseup', onMouseUp);
			document.body.style.cursor = '';
			document.body.style.userSelect = '';
		}

		document.addEventListener('mousemove', onMouseMove);
		document.addEventListener('mouseup', onMouseUp);
		document.body.style.cursor = resizeCursor;
		document.body.style.userSelect = 'none';
	}

	// UI configuration helpers
	const buttonPosition = $derived(() => {
		const offset = isOpen ? currentSize : '0px';
		const positionMap = {
			[SidebarPosition.LEFT]: { top: HEADER_OFFSET, left: offset },
			[SidebarPosition.RIGHT]: { top: HEADER_OFFSET, right: offset },
			[SidebarPosition.TOP]: { top: offset },
			[SidebarPosition.BOTTOM]: { bottom: offset }
		};
		return positionMap[position];
	});

	const closeIcon = $derived(() => {
		const iconMap = {
			[SidebarPosition.LEFT]: ChevronLeft,
			[SidebarPosition.RIGHT]: ChevronRight,
			[SidebarPosition.TOP]: ChevronUp,
			[SidebarPosition.BOTTOM]: ChevronDown
		};
		return iconMap[position];
	});

	const handleStyles = $derived(() => {
		const size = `${RESIZE_HANDLE_SIZE}px`;
		return isHorizontal ? { width: size, height: '100%' } : { height: size, width: '100%' };
	});

	// Helper to convert object to inline styles
	function toInlineStyles(styles: Record<string, string>): string {
		return Object.entries(styles)
			.map(([key, value]) => `${key}: ${value}`)
			.join('; ');
	}

	// Compute sidebar order (0 for start positions, 1 for end positions)
	const sidebarOrder = $derived(isStartPosition ? 0 : 1);

	// Calculate transform for sliding animation
	const sidebarTransform = $derived(() => {
		if (isOpen) return 'translate(0, 0)';
		const handleSize = `${RESIZE_HANDLE_SIZE}px`;
		const offset = `calc(${currentSize} + ${handleSize})`;
		const transformMap = {
			[SidebarPosition.LEFT]: `translate(-${offset}, 0)`,
			[SidebarPosition.RIGHT]: `translate(${offset}, 0)`,
			[SidebarPosition.TOP]: `translate(0, -${offset})`,
			[SidebarPosition.BOTTOM]: `translate(0, ${offset})`
		};
		return transformMap[position];
	});

	const wrapperStyles = $derived(() => {
		const expandedSize = `${currentSize}`;
		const sizeValue = isOpen ? expandedSize : '0px';
		return {
			[sizeProperty]: sizeValue,
			order: `${sidebarOrder}`,
			transform: sidebarTransform()
		};
	});
</script>

<!-- Toggle button that moves with sidebar -->
{#if !hideToggleButton}
	<Button
		onclick={onToggle}
		variant="default"
		size="icon"
		class="fixed z-2 -ml-1 inline-flex size-7 
	shrink-0 items-center justify-center gap-2 overflow-hidden rounded-md bg-background text-sm
	font-medium whitespace-nowrap shadow-none outline-hidden transition-all select-none hover:bg-accent focus-visible:border-ring 
	focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 {!isResizing
			? 'transition-all duration-300'
			: ''}"
		style="{toInlineStyles(buttonPosition())}; pointer-events: auto; {isResizing
			? 'transition: none !important;'
			: ''}"
		aria-label={isOpen ? 'Close sidebar' : 'Open sidebar'}
		aria-expanded={isOpen}
	>
		<!--aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive 
	focus-visible:border-ring focus-visible:ring-ring/50 relative inline-flex shrink-0 items-center 
	justify-center gap-2 overflow-hidden rounded-md text-sm font-medium whitespace-nowrap outline-hidden 
	transition-all select-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 
	[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 hover:bg-accent 
	hover:text-accent-foreground dark:hover:bg-accent/50 size-7 -ml-1 -->
		{#if isOpen}
			{@const Icon = closeIcon()}
			<Icon class="h-6 w-6 text-primary" />
		{:else}
			{@const OpenIcon = openIcon}
			<OpenIcon class="h-6 w-6 text-primary" />
		{/if}
	</Button>
{/if}

<!-- Sidebar wrapper for clipping -->
<div
	class="relative z-3 h-full w-full overflow-hidden transition-all duration-300"
	class:h-full={isHorizontal}
	class:w-full={!isHorizontal}
	class:transition-all={!isResizing}
	class:duration-300={!isResizing}
	style={toInlineStyles(wrapperStyles())}
>
	<div class="flex h-full w-full" class:flex-row={isHorizontal} class:flex-col={!isHorizontal}>
		<!-- Sidebar -->
		<aside
			bind:this={sidebarElement}
			class="border-r-bg-sidebar-border relative flex shrink-0 border-r-1 bg-sidebar text-sidebar-foreground shadow-lg"
			class:flex-col={isHorizontal}
			class:flex-row={!isHorizontal}
			class:h-full={isHorizontal}
			class:w-full={!isHorizontal}
			class:border-r={position === SidebarPosition.LEFT}
			class:border-l={position === SidebarPosition.RIGHT}
			class:border-b={position === SidebarPosition.TOP}
			class:border-t={position === SidebarPosition.BOTTOM}
			class:border-sidebar-border={true}
			class:transition-transform={!isResizing}
			class:duration-300={!isResizing}
			style="{sizeProperty}: {currentSize};"
		>
			<div
				class="flex overflow-hidden"
				class:flex-col={isHorizontal}
				class:flex-row={!isHorizontal}
				class:h-full={isHorizontal}
				class:w-full={!isHorizontal}
			>
				<!-- Content -->
				<div
					class="flex overflow-hidden"
					class:flex-col={isHorizontal}
					class:flex-row={!isHorizontal}
					class:h-full={isHorizontal}
					class:w-full={!isHorizontal}
				>
					{#if children}
						{@render children()}
					{/if}
				</div>
			</div>
		</aside>

		<!-- Resize handle -->
		{#if isOpen}
			<Button
				class="z-40 flex shrink-0 items-center justify-center border-0 bg-transparent p-0 shadow-none ring-0 outline-none hover:!bg-primary/50 focus-visible:ring-0 {isHorizontal
					? '-ml-[6px] cursor-ew-resize'
					: '-mt-[6px] cursor-ns-resize'} {!isResizing ? 'transition-all duration-300' : ''}"
				onmousedown={startResize}
				aria-label="Resize sidebar by dragging"
				style="{toInlineStyles(
					handleStyles()
				)}; outline: none !important; box-shadow: none !important; border: none !important;"
			/>
		{/if}
	</div>
</div>
