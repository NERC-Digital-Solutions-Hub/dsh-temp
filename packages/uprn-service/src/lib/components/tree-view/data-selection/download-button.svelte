<!-- DownloadButton.svelte -->
<script lang="ts">
	import DownloadCheckbox from '$lib/components/download-checkbox/download-checkbox.svelte';
	import { SelectionState, type TreeNode } from '../types.js';

	/**
	 * Props for the DownloadButton component.
	 */
	type Props = {
		/** The tree node this button controls. */
		node: TreeNode;
		/** Callback when download state changes. */
		onDownloadStateChanged?: (node: TreeNode, downloadState: SelectionState) => void;
		/** Function to get current download state. */
		getDownloadState?: (node: TreeNode) => SelectionState;
	};

	/** Destructured props. */
	const { node, onDownloadStateChanged, getDownloadState }: Props = $props();

	/** Derived state for whether the checkbox is checked. */
	let externalState = $derived(getDownloadState?.(node) ?? SelectionState.Inactive);
	let isChecked = $derived(externalState === SelectionState.Active);
	let isIndeterminate = $derived(externalState === SelectionState.Indeterminate);

	/**
	 * Handles click events on the download button.
	 * Toggles between active and inactive states.
	 * @param event - The mouse event.
	 */
	function handleClick(event: MouseEvent) {
		event.stopPropagation();
		const newState =
			externalState === SelectionState.Active ? SelectionState.Inactive : SelectionState.Active;

		onDownloadStateChanged?.(node, newState);
	}
</script>

<div>
	<DownloadCheckbox
		checked={isChecked}
		indeterminate={isIndeterminate}
		onclick={handleClick}
		title="Download"
	/>
</div>
