<!-- Node.svelte -->
<script lang="ts">
	import NodeAnimation from '$lib/components/tree-view/node-animation.svelte';
	import VisibilityCheckbox from '$lib/components/visibility-checkbox/visibility-checkbox.svelte';
	import type { TreeviewConfigStore } from '$lib/stores/treeview-config-store';
	import { getNodeIcon } from '../get-node-icon';
	import { LayerDrawState, SelectionState, TreeLayerNode, type TreeNode } from '../types.js';
	import DownloadButton from './download-button.svelte';
	import NodeContent from './node-content.svelte';
	import Node from './node.svelte';
	/**
	 * Props for the Node component.
	 */
	type Props = {
		/** Configuration store for tree view settings. */
		treeviewConfigStore?: TreeviewConfigStore | null;
		/** The tree node to render. */
		node: TreeNode;
		/** Whether the node is downloadable. */
		isDownloadable?: boolean;
		/** Callback when node is clicked. */
		onNodeClick?: (node: TreeNode) => void;
		/** Callback when node visibility changes. */
		onNodeVisibilityChange?: (node: TreeNode, visible: boolean) => void;
		/** Callback when download state changes. */
		onDownloadStateChanged?: (node: TreeNode, downloadState: SelectionState) => void;
		/** Function to get current download state. */
		getDownloadState?: (node: TreeNode) => SelectionState;
		/** Callback when filter is clicked. */
		onFilterClicked?: (layerId: string) => void;
		/** Function to check if filters are applied. */
		hasFiltersApplied?: (layerId: string) => boolean;
		/** Function to get current node visibility. */
		getNodeVisibility?: (nodeId: string) => boolean | undefined;
		/** Function to get current node draw state. */
		getNodeDrawState?: (nodeId: string) => LayerDrawState;
		/** Depth level in the tree. */
		depth?: number;
		/** Whether to use layer type specific icons. */
		useLayerTypeIcon?: boolean;
	};

	/** Destructured props with defaults. */
	const {
		treeviewConfigStore = null,
		node,
		isDownloadable,
		onNodeClick,
		onNodeVisibilityChange,
		onDownloadStateChanged,
		getDownloadState,
		onFilterClicked,
		hasFiltersApplied,
		getNodeVisibility,
		getNodeDrawState,
		depth = 0,
		useLayerTypeIcon = false
	}: Props = $props();

	/** Whether this node represents a folder (has children). */
	const isFolder = !!(node.children && node.children.length);

	let isInitialised = false;

	/** Reactive state for whether the folder is open. */
	let isOpen = $state<boolean>(false);

	/** Reactive state for whether the node is checked/visible. */
	let isChecked = $state<boolean>(false);

	/** Whether this node has visibility controls. */
	const hasVisibility = $derived(!isFolder || isChecked);

	/** Reactive state for the node's icon. */
	let icon = $state<string>('');

	/** Reactive state for whether filter button should be shown. */
	let showFilter = $state(false);

	/** Reactive state for filter animation. */
	let isAnimatingOut = $state(false);

	/** Reactive state for visibility icon. */
	let showVisibility = $state(false);
	let isVisibilityAnimatingOut = $state(false);

	$effect(() => {
		if (!isFolder) {
			showVisibility = true;
			return;
		}

		if (isChecked && !showVisibility) {
			showVisibility = true;
			isVisibilityAnimatingOut = true;
			setTimeout(() => {
				isVisibilityAnimatingOut = false;
			}, 50);
		} else if (!isChecked && showVisibility) {
			isVisibilityAnimatingOut = true;
			setTimeout(() => {
				showVisibility = false;
				isVisibilityAnimatingOut = false;
			}, 200);
		}
	});

	$effect(() => {
		if (isInitialised) {
			return;
		}

		isOpen = treeviewConfigStore?.getItemConfig(node.id)?.isOpenOnInit ?? false;
		isInitialised = true;
	});

	// Update checked state and icon based on node properties
	$effect(() => {
		if (!node) {
			return;
		}

		const isVisible = getNodeVisibility ? getNodeVisibility(node.id) : false;
		isChecked = isVisible ?? false;
		if (!(node instanceof TreeLayerNode)) {
			return;
		}
		icon = getNodeIcon(node.layer, useLayerTypeIcon, isFolder, isOpen);
	});

	// Handle filter visibility changes with animation
	$effect(() => {
		if (!(node instanceof TreeLayerNode)) {
			return;
		}

		const shouldShow =
			(getDownloadState?.(node) === SelectionState.Active && node.layer.type === 'feature') ??
			false;

		if (shouldShow && !showFilter) {
			// Show immediately
			showFilter = true;
			isAnimatingOut = false;
		} else if (!shouldShow && showFilter) {
			// Start fade out animation
			isAnimatingOut = true;
			// Remove after animation completes
			setTimeout(() => {
				showFilter = false;
				isAnimatingOut = false;
			}, 180);
		}
	});

	/**
	 * Toggles the visibility of the node.
	 * Only applicable for leaf nodes with visibility controls.
	 */
	function toggleVisible() {
		if (!hasVisibility || !onNodeVisibilityChange) {
			return;
		}

		isChecked = !isChecked;
		onNodeVisibilityChange(node, isChecked);
	}

	/**
	 * Handles click events on the node.
	 * Calls the node click callback.
	 */
	function handleClick() {
		onNodeClick?.(node);
	}

	/**
	 * Handles click events specifically for folder nodes.
	 * Toggles the open/closed state.
	 */
	function handleFolderClick() {
		isOpen = !isOpen;
		onNodeClick?.(node);
	}
</script>

{#snippet content()}
	{#if !treeviewConfigStore?.getItemConfig(node.id)?.isHidden}
		{#if isFolder}
			<NodeContent {icon} name={node.name} {depth} onclick={handleFolderClick} {isFolder} {isOpen}>
				{#snippet children()}
					<div class="flex items-center">
						{#if isDownloadable}
							<!-- {#if showFilter}
								<div
									class="filter-transition-wrapper"
									class:fade-in={!isAnimatingOut}
									class:fade-out={isAnimatingOut}
								>
									<FilterButton layerId={node.id} {onFilterClicked} {hasFiltersApplied} />
								</div>
							{/if} -->
							<div class="mr-2">
								<DownloadButton {node} {onDownloadStateChanged} {getDownloadState} />
							</div>
						{/if}
						{#if showVisibility}
							<div class="visibility-wrapper" class:visible={!isVisibilityAnimatingOut}>
								<div class="visibility-inner">
									<VisibilityCheckbox
										checked={isChecked}
										indeterminate={getNodeDrawState?.(node.id) === LayerDrawState.Suspended}
										onCheckedChange={toggleVisible}
									/>
								</div>
							</div>
						{/if}
					</div>
				{/snippet}
			</NodeContent>
		{:else}
			<NodeContent {icon} name={node.name} {depth} onclick={handleClick} {isFolder}>
				{#snippet children()}
					<div class="flex items-center">
						{#if isDownloadable}
							<!-- {#if showFilter}
								<div
									class="filter-transition-wrapper"
									class:fade-in={!isAnimatingOut}
									class:fade-out={isAnimatingOut}
								>
									<FilterButton layerId={node.id} {onFilterClicked} {hasFiltersApplied} />
								</div>
							{/if} -->
							<div class="mr-2">
								<DownloadButton {node} {onDownloadStateChanged} {getDownloadState} />
							</div>
						{/if}
						{#if hasVisibility}
							<VisibilityCheckbox
								checked={isChecked}
								indeterminate={getNodeDrawState?.(node.id) === LayerDrawState.Suspended}
								onCheckedChange={toggleVisible}
							/>
						{/if}
					</div>
				{/snippet}
			</NodeContent>
		{/if}
	{/if}
{/snippet}

{#snippet childNode(node: TreeNode)}
	{#if isFolder && isOpen && !treeviewConfigStore?.getItemConfig(node.id)?.isHidden}
		<Node
			{treeviewConfigStore}
			{node}
			isDownloadable={treeviewConfigStore?.getItemConfig(node.id)?.isDownloadable ?? true}
			{onNodeClick}
			{onNodeVisibilityChange}
			{onDownloadStateChanged}
			{getDownloadState}
			{onFilterClicked}
			{hasFiltersApplied}
			{getNodeVisibility}
			{getNodeDrawState}
			depth={depth + 1}
			{useLayerTypeIcon}
		/>
	{/if}
{/snippet}

<NodeAnimation {isOpen} {content} childNodes={isFolder ? node.children : null} {childNode} />

<style>
	.filter-transition-wrapper {
		transition:
			opacity 0.18s ease-in-out,
			transform 0.18s ease-in-out;
	}

	.fade-in {
		opacity: 1;
		transform: scale(1);
	}

	.fade-out {
		opacity: 0;
		transform: scale(0.95);
	}

	.visibility-wrapper {
		display: grid;
		grid-template-columns: 0fr;
		transition: grid-template-columns 0.2s ease-out;
	}

	.visibility-wrapper.visible {
		grid-template-columns: 1fr;
	}

	.visibility-inner {
		overflow: hidden;
		display: flex;
		opacity: 0;
		transform: translateX(10px);
		transition:
			opacity 0.4s ease-out,
			transform 0.2s ease-out;
	}

	.visibility-wrapper.visible .visibility-inner {
		opacity: 1;
		transform: translateX(0);
	}
</style>
