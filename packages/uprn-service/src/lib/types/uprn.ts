import type { SvelteSet } from 'svelte/reactivity';

export interface UprnConfiguration {
	uprnDownloadApiConfig: ConfigurationItemInfo;
	aiUprnChatbotApiConfig: ConfigurationItemInfo;
	mapsConfig: ConfigurationItemInfo[];
	mainSidebarSizes?: SidebarSize[];
}

export interface SidebarSize {
	breakpoint: number;
	originalSize: string;
	minSize: string;
}

export interface ConfigurationItemInfo {
	itemType: 'url' | 'file';
	path: string;
}

/**
 * A selection of data fields from a specific layer.
 */
export interface DataSelection {
	/** The ID of the layer this selection belongs to */
	layerId: string;
	layer: __esri.Layer | __esri.Sublayer;
	/** A set of field names selected from the layer */
	fields: SvelteSet<string>;
}

export interface AreaSelectionInfo {
	layerId: string;
	areaFieldInfos: AreaFieldInfo[];
}

export interface AreaFieldInfo {
	id: number;
	code: string;
}

export interface DataSelectionInfo {
	layerId: string;
	fields: string[];
}

/**
 * Enumeration of possible download statuses.
 * Used to track the status of data downloads.
 */
export const DownloadStatus = Object.freeze({
	Pending: 'pending',
	InProgress: 'in-progress',
	Completed: 'completed',
	Failed: 'failed'
});

/** Type representing the possible download statuses. */
export type DownloadStatus = (typeof DownloadStatus)[keyof typeof DownloadStatus];

export const JobStatusType = Object.freeze({
	Submitted: 'SUBMITTED',
	Queued: 'QUEUED',
	Processing: 'IN_PROGRESS',
	Completed: 'COMPLETED',
	Error: 'ERROR'
});

export type JobStatusType = (typeof JobStatusType)[keyof typeof JobStatusType];

/**
 * An entry representing a download task.
 * Includes the unique ID and current status of the download.
 * Used in the DownloadsStore to manage user downloads.
 */
export type DownloadEntry = {
	localId: string;
	externalId?: string;
	status: DownloadStatus;
	errorMessage?: string;
	areaSelection: AreaSelectionInfo;
	dataSelections: DataSelectionInfo[];
};

export type UprnDownloadEndpoints = {
	__name?: string;
	baseUrl: string;
	healthRoute: string;
	requestJobRoute: string;
	requestJobStatusesRoute: string;
	getAreaSelectionLimitsRoute: string;
	fetchDownloadRoute: string;
};

export type UprnDownloadHealthResponse = {
	status: EndpointHealthStatus;
	uptime: number;
};

export const EndpointHealthStatus = Object.freeze({
	ok: 'ok'
});

export type EndpointHealthStatus = (typeof EndpointHealthStatus)[keyof typeof EndpointHealthStatus];

export type UrpnDownloadAreaSelectionLimitResponse = {
	layerName: string;
	index: number;
	areaLimit: number;
};

export type UprnDownloadJobRequest = {
	exports: UprnDownloadJobRequestExport;
};

export type UprnDownloadJobRequestExport = {
	areaSelectionLayer: UprnDownloadJobRequestAreaSelectionLayer;
	dataSelectionLayers: UprnDownloadJobRequestDataSelectionLayer[];
};

export type UprnDownloadJobRequestAreaSelectionLayer = {
	remoteId: string;
	areas: string[];
};

export type UprnDownloadJobRequestDataSelectionLayer = {
	remoteId: string;
	fields: string[];
};

export type UprnDownloadJobRequestResponse = {
	type: JobRequestResponseType;
	guid: string;
	message?: string;
};

export const JobRequestResponseType = Object.freeze({
	Success: 'success',
	Error: 'error'
});

export type JobRequestResponseType =
	(typeof JobRequestResponseType)[keyof typeof JobRequestResponseType];

export type UprnDownloadGetJobStatusesRequest = {
	jobs: string[];
};

export type UprnDownloadQueueStatus = {
	current: number;
	total: number;
};

export type UprnDownloadJobStatus = {
	type: JobStatusType;
	fileSize: number | undefined;
	message: string | undefined;
	index: number | undefined;
};

export type UprnDownloadJobStatusItem = {
	guid: string; // UUID
	status: UprnDownloadJobStatus;
};

export type UprnDownloadGetJobStatusesResponse = {
	queue: UprnDownloadQueueStatus;
	jobs: UprnDownloadJobStatusItem[];
};

export type UprnDownloadErrorResponse = {
	error: string;
};

export type UprnDownloadGetJobStatusesResult =
	| UprnDownloadGetJobStatusesResponse
	| UprnDownloadErrorResponse;

export type AiUprnChatbotEndpoints = {
	__name?: string;
	baseUrl: string;
	healthRoute: string;
	chatRoute: string;
	chatStreamRoute: string;
};

export type AiUprnChatbotHealthResponse = {
	status: EndpointHealthStatus;
	uptime: number;
};

export type AiUprnChatbotRequest = {
	query: string;
};

export type AiUprnChatbotResponse = {
	response: string;
};
