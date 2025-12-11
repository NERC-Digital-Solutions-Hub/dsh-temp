<!-- Node.svelte -->
<script lang="ts">
	import type { TreeviewConfigStore } from '$lib/stores/treeview-config-store';
	import { getNodeIcon } from '../get-node-icon';
	import NodeAnimation from '../node-animation.svelte';
	import { TreeLayerNode, type TreeNode } from '../types.js';
	import NodeContent from './node-content.svelte';
	import Node from './node.svelte';

	/**
	 * Props for the Node component.
	 */
	type Props = {
		/** Configuration store for tree view settings. */
		treeviewConfigStore: TreeviewConfigStore;
		/** The tree node to render. */
		node: TreeNode;
		/** Callback when node is clicked. */
		onNodeClick?: (node: TreeNode) => void;
		/** Callback when node visibility changes. */
		onNodeVisibilityChange?: (node: TreeNode, visible: boolean) => void;
		/** Function to get current node visibility. */
		getNodeVisibility?: (nodeId: string) => boolean | undefined;
		/** Depth level in the tree. */
		depth?: number;
		/** Whether to use layer type specific icons. */
		useLayerTypeIcon?: boolean;
	};

	/** Destructured props with defaults. */
	const {
		treeviewConfigStore,
		node,
		onNodeClick,
		onNodeVisibilityChange,
		getNodeVisibility,
		depth = 0,
		useLayerTypeIcon = false
	}: Props = $props();

	/** Whether this node represents a folder (has children). */
	const isFolder = !!(node.children && node.children.length);

	/** Whether this node has visibility controls (leaf nodes). */
	const hasVisibility = !isFolder;

	/** Reactive state for whether the folder is open. */
	let isOpen = $state(false);

	/** Reactive state for whether the node is pressed/selected. */
	let isPressed = $state<boolean>(false);

	/** Reactive state for the node's icon. */
	let icon = $state<string>('');

	/**
	 * Checks if any child nodes are visible.
	 * Used to determine folder pressed state.
	 * @returns True if any child is visible.
	 */
	function hasVisibleChildren(): boolean {
		if (!node.children || !getNodeVisibility) {
			return false;
		}

		return node.children.some((child) => {
			const childVisibility = getNodeVisibility(child.id);
			return childVisibility !== undefined
				? childVisibility
				: child instanceof TreeLayerNode
					? child.layer.visible
					: false;
		});
	}

	// Update pressed state and icon based on node properties
	$effect(() => {
		if (!node || !(node instanceof TreeLayerNode)) {
			return;
		}

		if (isFolder) {
			// For folders, pressed state depends on children visibility
			isPressed = hasVisibleChildren();
		} else {
			// For leaf nodes, use their own visibility
			const isVisible = getNodeVisibility ? getNodeVisibility(node.id) : undefined;
			isPressed = isVisible !== undefined ? isVisible : node.layer.visible;
		}

		icon = getNodeIcon(node.layer, useLayerTypeIcon, isFolder, isOpen);
	});

	/**
	 * Toggles the visibility of the node.
	 * Only applicable for leaf nodes.
	 */
	function toggleVisible() {
		// Only allow toggling for leaf nodes (non-folders)
		if (!hasVisibility || !onNodeVisibilityChange || isFolder) {
			return;
		}

		isPressed = !isPressed;
		onNodeVisibilityChange(node, isPressed);
	}

	/**
	 * Handles click events on the node.
	 * For leaf nodes, toggles visibility; for folders, handled separately.
	 */
	function handleClick() {
		// Only toggle visibility for leaf nodes
		if (!isFolder) {
			toggleVisible();
		}
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
	{#if !treeviewConfigStore.getItemConfig(node.id)?.isHidden}
		{#if isFolder}
			<NodeContent
				isTogglable={false}
				pressed={isPressed}
				{icon}
				name={node.name}
				{depth}
				onclick={handleFolderClick}
				{isOpen}
			/>
		{:else}
			<NodeContent
				isTogglable={true}
				pressed={isPressed}
				{icon}
				name={node.name}
				{depth}
				onclick={handleClick}
				{isOpen}
			/>
		{/if}
	{/if}
{/snippet}

{#snippet childNode(node: TreeNode)}
	{#if isFolder && isOpen && !treeviewConfigStore.getItemConfig(node.id)?.isHidden}
		<Node
			{treeviewConfigStore}
			{node}
			{onNodeClick}
			{onNodeVisibilityChange}
			{getNodeVisibility}
			depth={depth + 1}
			{useLayerTypeIcon}
		/>
	{/if}
{/snippet}

<NodeAnimation {isOpen} {content} childNodes={isFolder ? node.children : null} {childNode} />
