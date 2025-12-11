import { GlobalVariableService } from '$lib/services/command-search/global-variable-service.ts';

type ClassType<T> = abstract new (...args: any[]) => T;

/**
 * The context for command search services. This is passed into commands so a commands can access
 * shared services.
 */
export class CommandSearchContext {
	private services = new Map<ClassType<any>, any>();
	private globalVariables = new Map<ClassType<any>, any>();

	add<T>(token: ClassType<T>, instance: T): void {
		this.services.set(token, instance);

		if (instance instanceof GlobalVariableService) {
			this.globalVariables.set(token, instance);
		}
	}

	get<T>(token: ClassType<T>): T {
		const service = this.services.get(token);
		if (!service) {
			throw new Error(`Service not found for token: ${token.name}`);
		}
		return service as T;
	}

	has<T>(token: ClassType<T>): boolean {
		return this.services.has(token);
	}

	getGlobalVariables(): GlobalVariableService[] {
		return Array.from(this.globalVariables.values());
	}
}
