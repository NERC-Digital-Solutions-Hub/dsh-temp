import type { MapToolContext, MapToolFn } from './types';

const registry = new Map<string, MapToolFn>();

export function registerMapTool(name: string, fn: MapToolFn) {
	if (registry.has(name)) {
		console.warn(`[registerMapTool] Tool "${name}" already registered, overriding.`);
	}

	registry.set(name, fn);
}

export function getMapTool(name: string): MapToolFn | undefined {
	return registry.get(name);
}

/**
 * Function that registers a tool.
 */
export function defineMapTool<Input>(
	name: string,
	fn: (context: MapToolContext, input: Input) => Promise<void> | void
): MapToolFn<Input> {
	registerMapTool(name, fn as MapToolFn);
	return fn;
}
