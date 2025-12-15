<script lang="ts">
	import Button from '$lib/components/shadcn/button/button.svelte';
	import { downloadsStore } from '$lib/stores/downloads-store.svelte';
	import { toast } from 'svelte-sonner';
	import {
		DownloadStatus,
		type AreaFieldInfo,
		type AreaSelectionInfo,
		type DataSelectionInfo
	} from '$lib/types/uprn';
	import ClearSelectionsButton from '$lib/components/clear-selections-button/cl/clear-selections-button.svelte';
	import type { AreaSelectionInteractionStore } from '$lib/stores/area-selection-interaction-store.svelte';
	import { DataSelectionStore } from '$lib/stores/data-selection-store.svelte';
	import { onDestroy } from 'svelte';
	import Spinner from '$lib/components/shadcn/spinner/spinner.svelte';

	type Props = {
		onExportSuccess?: () => void;
		clearSelections: () => void;
		areaSelectionInteractionStore: AreaSelectionInteractionStore;
		dataSelectionStore: DataSelectionStore;
	};

	const {
		onExportSuccess,
		clearSelections,
		areaSelectionInteractionStore,
		dataSelectionStore
	}: Props = $props();

	const areRequirementsMet = $derived.by(() => {
		return (
			areaSelectionInteractionStore.selectionViewState?.areaHandles.size > 0 &&
			dataSelectionStore.getAllSelections().length > 0
		);
	});

	let coolingDown: boolean = $state(false);
	let cooldownTimer: ReturnType<typeof setTimeout> | null = null;

	const cooldownDuration = 1000; // 1 second cooldown

	onDestroy(() => {
		if (cooldownTimer) {
			clearTimeout(cooldownTimer);
		}
	});

	// TODO: Add onExport function prop to handle export completion externally

	/**
	 * Handles the export button click event.
	 * Validates that areas and data are selected, then initiates the export process.
	 */
	function handleExportClick() {
		if (areaSelectionInteractionStore.selectionViewState?.areaHandles.size <= 0) {
			toast.error('Please select at least one area to export.');
			return;
		}

		if (dataSelectionStore.getAllSelections().length <= 0) {
			toast.error('Please select at least one data layer to export.');
			return;
		}

		coolingDown = true;
		cooldownTimer = setTimeout(() => (coolingDown = false), cooldownDuration);

		console.log('Starting export...');

		const addDownload = async () => {
			const areaFieldCodes: string[] = await areaSelectionInteractionStore.getAreaCodesById(
				areaSelectionInteractionStore.selectionViewState.areaHandles.keys().toArray()
			);

			const areaFieldInfos: AreaFieldInfo[] =
				areaSelectionInteractionStore.selectionViewState.areaHandles
					.entries()
					.map(([area, _], index) => {
						return {
							id: area,
							code: areaFieldCodes[index]
						};
					})
					.toArray();

			const areaSelection: AreaSelectionInfo = {
				layerId: areaSelectionInteractionStore.selectionViewState.layerView?.layer.id || '',
				areaFieldInfos: areaFieldInfos
			};

			const dataSelections: DataSelectionInfo[] = dataSelectionStore
				.getAllSelections()
				.map((selection) => {
					return {
						layerId: selection.layerId,
						fields: Array.from(selection.selectedFieldIds)
					};
				});

			const localId = crypto.randomUUID();
			downloadsStore.addDownload({
				localId: localId,
				status: DownloadStatus.Pending,
				areaSelection,
				dataSelections
			});

			onExportSuccess?.();
		};

		addDownload();
	}
</script>

<div class="export-footer">
	<div class="export-footer__left">
		<p class="text-sm text-muted-foreground">Click "Export" to begin the download.</p>
	</div>

	<div class="export-footer__right">
		<ClearSelectionsButton class="mr-4" clear={clearSelections} />
		<Button
			variant={areRequirementsMet ? 'default' : 'outline'}
			disabled={coolingDown}
			onclick={handleExportClick}
			title="Export"
		>
			{#if coolingDown}
				<Spinner />
			{:else}
				Export
			{/if}
		</Button>
	</div>
</div>

<style>
	.export-footer {
		border-top: 1px solid rgba(0, 0, 0, 0.2);
		background: var(--background);
		display: grid;
		grid-template-columns: 1fr 1fr; /* two equal columns */
		padding-right: 1rem;
		gap: 0.5rem;
		align-items: center; /* vertically center content in each column */
		width: 100%;
	}

	.export-footer__left,
	.export-footer__right {
		display: flex;
		align-items: center; /* vertical center */
		min-height: 48px; /* ensure a reasonable hit area */
	}

	/* Left column: horizontally center its content within the left half */
	.export-footer__left {
		text-align: left;
		margin-left: 1rem;
	}

	/* Right column: keep the button at the right edge and vertically centered */
	.export-footer__right {
		justify-content: flex-end;
	}

	/* Reset paragraph default margins so centering is exact */
	.export-footer__left p {
		margin: 0;
	}

	/* Responsive: stack columns on small screens and center both */
	@media (max-width: 480px) {
		.export-footer {
			grid-template-columns: 1fr;
			gap: 0.25rem;
		}

		.export-footer__right {
			justify-content: center;
		}
	}
</style>
