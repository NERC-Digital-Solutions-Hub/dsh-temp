<script lang="ts">
	import { CircleAlert as InformationIcon } from '@lucide/svelte';
	import Checkbox from '$lib/components/shadcn/checkbox/checkbox.svelte';
	import * as Command from '$lib/components/shadcn/command/index.js';
	import * as Dialog from '$lib/components/shadcn/dialog/index.js';
	import type { DataSelectionStore } from '$lib/stores/data-selection-store.svelte';
	import FieldFilterMenuStore from '$lib/stores/field-filter-menu-store.svelte';
	import { SvelteSet } from 'svelte/reactivity';

	export type Props = {
		dataSelectionStore: DataSelectionStore;
		fieldFilterMenuStore: FieldFilterMenuStore;
		fieldsToHide: Set<string>;
	};

	const { dataSelectionStore, fieldFilterMenuStore, fieldsToHide }: Props = $props();

	let activeFeatureLayer: __esri.FeatureLayer | null = $state<__esri.FeatureLayer | null>(null);
	let localSelectedFields: SvelteSet<string> = $state(new SvelteSet<string>());

	// Derived state for dialog open/closed
	let isOpen = $derived(fieldFilterMenuStore.ActiveLayer !== null);

	// Computed state for master checkbox based on local selection
	let masterCheckboxState = $derived.by(() => {
		if (!activeFeatureLayer || !activeFeatureLayer.fields) {
			return { checked: false, indeterminate: false };
		}

		const totalFields = activeFeatureLayer.fields.length;
		const selectedCount = localSelectedFields?.size || 0;

		if (selectedCount === 0) {
			return { checked: false, indeterminate: false };
		} else if (selectedCount === totalFields) {
			return { checked: true, indeterminate: false };
		} else {
			return { checked: false, indeterminate: true };
		}
	});

	$effect(() => {
		const activeLayer = fieldFilterMenuStore.ActiveLayer as __esri.FeatureLayer;
		if (!activeLayer) {
			activeFeatureLayer = null;
			localSelectedFields = new SvelteSet<string>();
			return;
		}

		activeFeatureLayer = activeLayer;
		const existingDataSelection = dataSelectionStore.getSelection(activeLayer.id);
		if (existingDataSelection?.selectedFieldIds) {
			// Copy existing selection
			localSelectedFields = new SvelteSet([...existingDataSelection.selectedFieldIds]);
		} else {
			// Start with empty selection
			localSelectedFields = new SvelteSet<string>();
		}
	});

	/**
	 * Handles dialog close - applies changes to data store.
	 * @param open - The new open state of the dialog.
	 */
	function onOpenChange(open: boolean) {
		if (!open) {
			// Dialog is closing, apply changes
			applyChangesToDataSelectionStore();
			fieldFilterMenuStore.ActiveLayer = null;
		}
	}

	/**
	 * Applies the local field selections to the global data store.
	 */
	function applyChangesToDataSelectionStore() {
		if (!activeFeatureLayer) {
			return;
		}

		let targetDataSelection = dataSelectionStore.getSelection(activeFeatureLayer.id);
		if (!targetDataSelection) {
			return;
		}

		// Initialize fields if null
		if (
			targetDataSelection.selectedFieldIds === undefined ||
			targetDataSelection.selectedFieldIds === null
		) {
			targetDataSelection.selectedFieldIds = new SvelteSet<string>();
		}

		if (localSelectedFields.size === 0) {
			dataSelectionStore.removeSelection(activeFeatureLayer.id);
			return;
		}

		// Clear existing selection and add all local selections
		targetDataSelection.selectedFieldIds.clear();
		localSelectedFields.forEach((fieldName) => {
			targetDataSelection.selectedFieldIds?.add(fieldName);
		});
	}

	/**
	 * Toggles the selection state of a field.
	 * @param fieldName - The name of the field to toggle.
	 */
	function toggleFieldSelection(fieldName: string) {
		if (!activeFeatureLayer) {
			return;
		}

		// Work with local state instead of directly modifying data store
		if (localSelectedFields.has(fieldName)) {
			localSelectedFields.delete(fieldName);
		} else {
			localSelectedFields.add(fieldName);
		}
	}

	/**
	 * Handles the master checkbox click to select/deselect all fields.
	 */
	function handleMasterCheckboxClick() {
		if (!activeFeatureLayer?.fields) {
			return;
		}

		const selectedCount = localSelectedFields?.size || 0;

		if (selectedCount === 0) {
			// None checked -> check all
			activeFeatureLayer.fields.forEach((field) => {
				localSelectedFields.add(field.name);
			});
		} else {
			// Some checked or all checked -> uncheck all
			localSelectedFields.clear();
		}
	}

	/**
	 * Gets the list of fields to display in the menu.
	 * @returns Array of field objects.
	 */
	function getFieldNamesToShow(): __esri.Field[] {
		if (!activeFeatureLayer?.fields) {
			return [];
		}

		const filteredFields = activeFeatureLayer.fields.filter(
			(field) => !fieldsToHide.has(field.name.toLowerCase())
		);

		console.log(
			'Filtered fields to show:',
			filteredFields,
			fieldsToHide,
			activeFeatureLayer.fields
		);
		return filteredFields;
	}
</script>

<Dialog.Root open={isOpen} {onOpenChange}>
	<Dialog.Content class="flex max-h-[80vh] flex-col sm:max-w-[700px]">
		<Dialog.Header>
			<Dialog.Title>Select Fields</Dialog.Title>
			<Dialog.Description>Choose fields to include in your data selection.</Dialog.Description>
		</Dialog.Header>
		<div class="card-content min-h-0 flex-1">
			<Command.Root>
				<Command.Input placeholder="Search for fields..." />
				<Command.List>
					<Command.Empty>No results found.</Command.Empty>
					<Command.Group heading="Fields">
						<div class="master-checkbox-container">
							<Checkbox
								checked={masterCheckboxState.checked}
								indeterminate={masterCheckboxState.indeterminate}
								onCheckedChange={handleMasterCheckboxClick}
							/>
							<span class="master-checkbox-label">Select All Fields</span>
						</div>
						<Command.Separator />
						{#each getFieldNamesToShow() as field}
							<Command.Item class="field-item" onselect={() => toggleFieldSelection(field.name)}>
								<div class="field-content-wrapper">
									<Checkbox
										class="field-checkbox"
										checked={localSelectedFields?.has(field.name) ?? false}
										onCheckedChange={() => toggleFieldSelection(field.name)}
									/>
									<button
										class="field-content"
										onclick={() => toggleFieldSelection(field.name)}
										tabindex="0"
									>
										<div class="field-name-container">
											<span class="field-name">{field.alias || field.name}</span>
											{#if field.description}
												<div class="info-icon-container" title={field.description}>
													{@html InformationIcon}
												</div>
											{/if}
										</div>
									</button>
								</div>
							</Command.Item>
						{/each}
					</Command.Group>
				</Command.List>
			</Command.Root>
		</div>
	</Dialog.Content>
</Dialog.Root>

<style>
	.card-content {
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.card-content :global([cmdk-root]) {
		display: flex;
		flex-direction: column;
		height: 100%;
	}

	.card-content :global([cmdk-list]) {
		flex: 1;
		overflow-y: auto;
	}

	.card-content :global(.field-item) {
		padding: 0;
	}

	.field-content-wrapper {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		width: 100%;
	}

	.field-content {
		display: flex;
		align-items: center;
		flex: 1;
		cursor: pointer;
		border: none;
		background: none;
		text-align: left;
		padding: 0;
		transition: background-color 0.2s ease;
	}

	:global(.field-item):hover .field-content-wrapper {
		background-color: hsl(var(--accent) / 0.5);
		border-radius: 0.25rem;
	}

	/* Override Command.Item SVG color inheritance for checkboxes */
	:global(.field-item .field-checkbox [data-slot='checkbox-indicator'] svg) {
		color: currentColor !important;
	}

	/* Ensure checkbox maintains its proper styling */
	:global(.field-checkbox[data-slot='checkbox']) {
		flex-shrink: 0;
	}

	.field-name-container {
		flex: 1;
		display: flex;
		align-items: center;
	}

	.field-name {
		font-size: 0.875rem;
	}

	.master-checkbox-container {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem;
		border-bottom: 1px solid hsl(var(--border));
		margin-bottom: 0.5rem;
	}

	.master-checkbox-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: hsl(var(--foreground));
	}

	.info-icon-container {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 16px;
		height: 16px;
		margin-left: 0.25rem;
		cursor: help;
		opacity: 0.6;
		transition: opacity 0.2s ease;
		flex-shrink: 0;
	}

	.info-icon-container:hover {
		opacity: 1;
	}

	.info-icon-container :global(svg) {
		width: 14px;
		height: 14px;
		color: hsl(var(--muted-foreground));
	}
</style>
