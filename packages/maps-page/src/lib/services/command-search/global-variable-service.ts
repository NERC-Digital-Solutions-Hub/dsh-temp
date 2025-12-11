/**
 * Represents a global variable that can be used in commands. Services that implement this will
 *
 */
export abstract class GlobalVariableService {
	/**
	 * The display name of the global variable.
	 */
	public abstract displayName: string;

	/**
	 * The background colour associated with the global variable.
	 */
	public colour: string | null = null;

	/**
	 * The current ID of the global variable.
	 */
	protected id: string | null = null;

	/**
	 * Gets the current ID of the global variable.
	 * @returns The current ID.
	 */
	public getId(): string | null {
		return this.id;
	}

	protected setId(value: string | null) {
		this.id = value;
	}

	public clear(): void {
		this.setId(null);
	}
}
