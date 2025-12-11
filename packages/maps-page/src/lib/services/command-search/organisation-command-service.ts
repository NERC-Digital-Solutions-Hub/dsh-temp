import { GlobalVariableService } from '$lib/services/command-search/global-variable-service.ts';
import type { MapsOrganisationConfig } from '$lib/types/maps';

/**
 * Represents the organisations available for map commands and manages the selected organisation.
 */
export class OrganisationCommandService extends GlobalVariableService {
	/**
	 * The display name of the global variable.
	 */
	public override displayName = 'org';

	private organisations: Map<string, MapsOrganisationConfig>;

	/**
	 * Initializes the service with the given organisation configurations.
	 * @param organisations The organisation configs.
	 */
	constructor(organisations: MapsOrganisationConfig[]) {
		super();
		this.organisations = new Map(organisations.map((org) => [org.id, org]));
		if (organisations.length > 0) {
			this.setId(organisations[0].id);
		}
	}

	/**
	 * Sets the active organisation by its ID.
	 * @param id The ID of the active organisation.
	 */
	public setActiveOrganisation(id: string) {
		this.setId(id);
	}

	/**
	 * Gets the active organisation ID.
	 * @returns The active organisation ID.
	 */
	public getActiveOrganisationId(): string | null {
		return this.id;
	}

	/**
	 * Gets the active organisation Portal URL.
	 * @returns The active organisation Portal URL.
	 */
	public getActiveOrganisationPortalUrl(): string {
		const org = this.organisations.get(this.getActiveOrganisationIdInternal());
		if (!org) {
			throw new Error('No organisation is currently selected.');
		}

		return org.portalUrl;
	}

	/**
	 * Gets the active organisation endpoint.
	 * @returns The active organisation endpoint.
	 */
	public getActiveOrganisationEndpoint(): string {
		const org = this.organisations.get(this.getActiveOrganisationIdInternal());
		if (!org) {
			throw new Error('No organisation is currently selected.');
		}

		return org.endpoint;
	}

	/**
	 * Gets the active organisation query parameters.
	 * @returns A record the query parameter name and value.
	 */
	public getActiveOrganisationQueryParams(): Record<string, string> {
		const org = this.organisations.get(this.getActiveOrganisationIdInternal());
		if (!org) {
			throw new Error('No organisation is currently selected.');
		}

		return org.queryParams || {};
	}

	/**
	 * Gets the active organisation ID, throwing an error if none is selected.
	 * @returns The active organisation ID.
	 */
	private getActiveOrganisationIdInternal(): string {
		if (!this.id) {
			throw new Error('No organisation is currently selected.');
		}

		return this.id;
	}
}
