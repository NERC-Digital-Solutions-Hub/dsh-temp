<script lang="ts">
	import * as Command from '$lib/components/shadcn/command/index.js';
	import { onDestroy, onMount } from 'svelte';
	import type { MapCommandRuntime, MapsOrganisationConfig } from '$lib/types/maps';
	import { browser } from '$app/environment';
	import type { CommandSearchContext } from '$lib/services/command-search/command-search-context';
	import { MapsConfig } from '$lib/models/maps-config';
	import { OrganisationCommandService } from '$lib/services/command-search/organisation-command-service';

	type Props = {
		commandSearchContext: CommandSearchContext;
		inputPlaceholder?: string;
		runtime?: MapCommandRuntime | null;
	};

	const { commandSearchContext, inputPlaceholder, runtime = null }: Props = $props();

	let organisations: MapsOrganisationConfig[] = $state([]);
	let query = $state('');

	onMount(async () => {
		if (!browser) {
			return;
		}

		const contextOrganisations: MapsOrganisationConfig[] | null =
			commandSearchContext.get(MapsConfig)?.organisations;
		if (!contextOrganisations) {
			console.warn('No organisation configuration found in MapsConfig');
			return;
		}

		organisations = contextOrganisations;
	});

	let detachRuntimeInput: (() => void) | null = null;
	let attachedRuntime: MapCommandRuntime | null = null;
	let attachedPlaceholder = inputPlaceholder ?? 'Search...';

	$effect(() => {
		const currentRuntime = runtime;
		const placeholderText = inputPlaceholder ?? 'Search...';

		if (!currentRuntime) {
			detachRuntimeInput?.();
			detachRuntimeInput = null;
			attachedRuntime = null;
			attachedPlaceholder = placeholderText;
			query = '';
			return;
		}

		if (currentRuntime === attachedRuntime) {
			if (placeholderText !== attachedPlaceholder) {
				currentRuntime.setPlaceholder(placeholderText);
				attachedPlaceholder = placeholderText;
			}
			return;
		}

		detachRuntimeInput?.();
		detachRuntimeInput = null;
		attachedPlaceholder = placeholderText;

		detachRuntimeInput = currentRuntime.attachInputBinding({
			placeholder: placeholderText,
			onInput: (value) => {
				query = value;
			}
		});

		attachedRuntime = currentRuntime;
	});

	onDestroy(() => {
		detachRuntimeInput?.();
		detachRuntimeInput = null;
		attachedRuntime = null;
	});

	function onOrganisationSelect(organisationId: string) {
		const organisationSelection: OrganisationCommandService = commandSearchContext.get(
			OrganisationCommandService
		);

		organisationSelection.setActiveOrganisation(organisationId);

		if (runtime) {
			runtime.deactivate();
		}
	}
</script>

<div class="item-container">
	<Command.List>
		{#if organisations.length === 0}
			<Command.Empty>No organisations match your search.</Command.Empty>
		{:else}
			{#each organisations as organisation (organisation.name)}
				<Command.Item onclick={() => onOrganisationSelect(organisation.id)}>
					<div class="flex w-full min-w-0 flex-col gap-0.5">
						<span class="title-text font-medium text-foreground">
							{organisation.name ?? 'Untitled organisation'}
						</span>
					</div>
				</Command.Item>
			{/each}
		{/if}
	</Command.List>
</div>

<style>
	.item-container {
		max-width: 40vw;
		max-height: 500px;
		margin-left: 0.75rem;
		margin-right: 0.75rem;
	}

	.title-text {
		display: block;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		width: 100%;
	}
</style>
