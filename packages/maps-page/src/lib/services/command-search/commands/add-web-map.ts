import type { MapCommand, MapCommandRuntime } from '$lib/types/maps';
import AddWebMap from '$lib/components/add-web-map.svelte';
import { defineCommand } from '$lib/services/command-search/command-registry';
import type { Component } from 'svelte';

const addWebMapCommand: MapCommand = {
	id: 'add-web-map',
	name: 'Add web map',
	description: 'Fetch and display web maps.',
	group: 'Maps',
	shortcut: ['Ctrl', 'M'],
	inputPlaceholder: 'Search web maps...',
	execute: async () => {},
	component: AddWebMap as Component,
	props: (_runtime: MapCommandRuntime) => ({
		commandSearchContext: _runtime.getContext(),
		inputPlaceholder: addWebMapCommand.inputPlaceholder
	})
};

defineCommand('add-web-map', addWebMapCommand);
