import type { TreeviewConfig } from '$lib/types/treeview';
import type { AiUprnChatbotEndpoints, UprnDownloadEndpoints } from '$lib/types/uprn';

export type AppsUprnConfig = {
	uprnDownloadServiceEndpoints: UprnDownloadEndpoints;
	aiUprnChatbotServiceEndpoints: AiUprnChatbotEndpoints;
	mainSidebarSizes?: SizeConfig[];
	maps: PortalItemConfig[];
};

export type PortalItemConfig = {
	_name?: string;
	title: string;
	portalUrl?: string | null;
	portalItemId: string;
	proxy?: Proxy | null;
	areaTreeview?: TreeviewConfig;
	dataTreeview?: TreeviewConfig;
	selectableLayers?: { _name: string; id: string; nameField: string; codeField: string }[];
};

export type Proxy = {
	urlPrefix: string;
	proxyUrl: string;
};

export type SizeConfig = {
	breakpoint: number;
	originalSize: string;
	minSize: string;
};
