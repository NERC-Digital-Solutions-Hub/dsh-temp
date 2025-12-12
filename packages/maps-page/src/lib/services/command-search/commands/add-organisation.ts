import type { MapCommand, MapCommandRuntime } from '$lib/types/maps';
import AddOrganisation from '$lib/components/add-organisation.svelte';
import { defineCommand } from '$lib/services/command-search/command-registry';
import type { Component } from 'svelte';

export const addOrganisationCommand: MapCommand = {
	id: 'add-organisation',
	name: 'Add organisation',
	description: 'Find and add an organisation to filter items by.',
	group: 'Maps',
	shortcut: ['Ctrl', 'O'],
	inputPlaceholder: 'Search organisations...',
	component: AddOrganisation as Component,
	execute: async () => {},
	props: (_runtime: MapCommandRuntime) => ({
		commandSearchContext: _runtime.getContext(),
		inputPlaceholder: 'Search organisations...'
	})
};

defineCommand('add-organisation', addOrganisationCommand);
