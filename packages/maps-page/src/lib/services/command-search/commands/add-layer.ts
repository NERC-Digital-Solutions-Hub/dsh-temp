import type { MapCommand, MapCommandRuntime } from '$lib/types/maps';
import AddLayer from '$lib/components/add-layer.svelte';
import { defineCommand } from '$lib/services/command-search/command-registry';
import type { Component } from 'svelte';

export const addLayerCommand: MapCommand = {
	id: 'add-layer',
	name: 'Add layers',
	description: 'Fetch and display layers.',
	group: 'Maps',
	shortcut: ['Ctrl', 'L'],
	execute: async () => {},
	component: AddLayer as Component,
	props: (_runtime: MapCommandRuntime) => ({
		commandSearchContext: _runtime.getContext(),
		inputPlaceholder: addLayerCommand.inputPlaceholder
	})
};

defineCommand('add-layer', addLayerCommand);
