import type { MapsOrganisationConfig } from '$lib/types/maps';

/**
 * Represents the configuration for the maps page.
 */
export class MapsConfig {
	#organisations: MapsOrganisationConfig[] = [];

	/**
	 * Initializes a new instance of the MapsConfig class.
	 * @param organisations The organisations configurations.
	 */
	constructor(organisations: MapsOrganisationConfig[]) {
		this.#organisations = organisations;
	}

	/**
	 * Gets the list of organisation configurations.
	 */
	get organisations(): MapsOrganisationConfig[] {
		return this.#organisations;
	}
}
