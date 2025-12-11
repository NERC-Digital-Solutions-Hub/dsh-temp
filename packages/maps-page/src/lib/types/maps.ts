import type { CommandSearchContext } from '$lib/services/command-search/command-search-context';
import type { Component } from 'svelte';

export type MapsConfig = {
	organisations: MapsOrganisationConfig[];
};

export type MapsOrganisationConfig = {
	id: string;
	name: string;
	portalUrl: string;
	endpoint: string;
	queryParams: OrganisationQueryParams;
};

export type OrganisationQueryParams = {
	orgid: string;
};

export type WebMapMetadata = {
	id: string;
	title: string;
	description?: string;
	owner?: string;
	tags?: string[];
};
export type MapCommandSurfaceProps =
	| Record<string, unknown>
	| ((runtime: MapCommandRuntime) => Record<string, unknown>);

export type MapCommandSurface = {
	component: Component<Record<string, unknown>>;
	props?: MapCommandSurfaceProps;
};

export type MapCommandSession = {
	input?: MapCommandSurface | null;
	content?: MapCommandSurface | null;
	dispose?: () => void;
};

export type MapCommandRuntimeInputBindingOptions = {
	onInput: (value: string) => void;
	placeholder?: string;
	resetValueOnAttach?: boolean;
	resetValueOnDetach?: boolean;
	replayInitialValue?: boolean;
	onDetach?: () => void;
};

export interface MapCommandRuntime {
	getContext: () => CommandSearchContext;
	deactivate: () => void;
	isActive: (commandId?: string) => boolean;
	setInputSurface: (surface: MapCommandSurface | null) => void;
	setContentSurface: (surface: MapCommandSurface | null) => void;
	setIsOpen: (open: boolean, options?: { preserveActive?: boolean }) => void;
	getInputValue: () => string;
	setInputValue: (value: string) => void;
	setInputHandler: (handler: ((nextValue: string) => void) | null) => void;
	setPlaceholder: (value: string) => void;
	resetPlaceholder: () => void;
	attachInputBinding: (options: MapCommandRuntimeInputBindingOptions) => () => void;
}

export interface MapCommand {
	id: string;
	name: string;
	description?: string;
	group?: string;
	shortcut?: string[];
	inputPlaceholder?: string;
	execute(runtime: MapCommandRuntime): Promise<void> | void;
	component?: Component<Record<string, unknown>> | null;
	props?(runtime: MapCommandRuntime): Record<string, unknown>;
	createSession?(runtime: MapCommandRuntime): MapCommandSession | null | undefined;
}
