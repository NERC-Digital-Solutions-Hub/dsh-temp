import type { MapCommand, MapCommandRuntime } from '$lib/types/maps';
import SelectOrganisation from '$lib/components/select-organisation.svelte';
import { defineCommand } from '$lib/services/command-search/command-registry';
import type { Component } from 'svelte';

export const selectOrganisationCommand: MapCommand = {
	id: 'select-organisation',
	name: 'Select organisation',
	description: 'Select an organisation to filter items by.',
	group: 'Maps',
	shortcut: ['Ctrl', 'O'],
	inputPlaceholder: 'Search organisations...',
	component: SelectOrganisation as Component,
	execute: async () => {},
	props: (_runtime: MapCommandRuntime) => ({
		commandSearchContext: _runtime.getContext(),
		inputPlaceholder: 'Search organisations...'
	})
};

defineCommand('select-organisation', selectOrganisationCommand);
