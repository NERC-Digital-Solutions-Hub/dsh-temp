import { UprnConfigurationStore } from './uprn-configuration-store.svelte';
import type { UprnConfiguration } from '$lib/types/uprn';

let storeInstance = $state<UprnConfigurationStore>();

export const uprnConfigStore = {
	get instance() {
		return storeInstance;
	},
	async load(url: string) {
		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(`Failed to load UPRN config from ${url}`);
		}
		const config = (await response.json()) as UprnConfiguration;
		storeInstance = new UprnConfigurationStore(config);
		return storeInstance;
	}
};
