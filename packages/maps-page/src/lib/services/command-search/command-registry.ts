import type { MapCommand } from "$lib/types/maps";

const registry = new Map<string, MapCommand>();

export function registerCommand(name: string, command: MapCommand) {
	if (registry.has(name)) {
		console.warn(`[registerCommand] Command "${name}" already registered, overriding.`);
	}

	registry.set(name, command);
}

export function getCommand(name: string): MapCommand | undefined {
	return registry.get(name);
}

/**
 * Function that registers a command.
 */
export function defineCommand(
	name: string,
	command: MapCommand
): MapCommand {
	registerCommand(name, command as MapCommand);
	return command;
}
