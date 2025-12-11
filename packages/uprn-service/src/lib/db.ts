import type { AreaSelectionStoreSnapshot } from '$lib/stores/area-selection-store.svelte';
import type { DataSelectionSnapshot } from '$lib/stores/data-selection-store.svelte';
import {
	DownloadStatus,
	type AreaSelectionInfo,
	type DataSelectionInfo,
	type DownloadEntry
} from '$lib/types/uprn';
import Dexie, { type Table } from 'dexie';

export interface DbUprnSelection {
	id: string;
	areas: DbUprnAreaSelectionInfo | null;
	data: DbUprnDataSelectionInfo[];
}

export interface DbUprnAreaSelectionInfo extends AreaSelectionStoreSnapshot {
	id?: number;
}

export interface DbUprnDataSelectionInfo extends DataSelectionSnapshot {
	id?: number;
}

export interface DbUserDownload extends DownloadEntry {
	id?: number;
	createdAt: number;
}

//export const UPRN_SELECTION_ID = 'current';

class AppDB extends Dexie {
	uprnSelections!: Table<DbUprnSelection, string>;
	areaSelections!: Table<DbUprnAreaSelectionInfo, number>;
	dataSelections!: Table<DbUprnDataSelectionInfo, number>;
	userDownloads!: Table<DbUserDownload, number>;

	constructor() {
		super('app-db2');

		// Version 3 schema
		this.version(3).stores({
			uprnSelections: '&id',
			areaSelections: '++id, layerId, *areaIds',
			dataSelections: '++id, layerId, *fields',
			userDownloads: '++id, &localId, createdAt'
		});

		// this.on('populate', async (tx) => {
		// 	console.log('[db] Populating database with initial data');
		// 	if (await tx.table<DbUprnSelection>('uprnSelections').get(UPRN_SELECTION_ID)) {
		// 		console.log('[db] Initial UPRN selection already exists');
		// 		return; // already exists
		// 	}

		// 	await tx.table<DbUprnSelection>('uprnSelections').add({
		// 		id: 'current',
		// 		areas: null,
		// 		data: []
		// 	});

		// 	console.log('[db] Initial UPRN selection created');
		// });
	}
}

export const db = new AppDB();

export const getSelection = async (portalItemId: string): Promise<DbUprnSelection> => {
	let selection = await db.uprnSelections.get(portalItemId);

	if (!selection) {
		selection = {
			id: portalItemId,
			areas: null,
			data: []
		};
		await db.uprnSelections.add(selection);
	}

	return selection;
};

export const updateSelection = async (
	portalItemId: string,
	patch: Partial<DbUprnSelection>
) => {
	let current = await db.uprnSelections.get(portalItemId);

	if (!current) {
		current = { id: portalItemId, areas: null, data: [] };
		await db.uprnSelections.add(current);
	}

	console.log(
		'[db] Updating UPRN selection with patch:',
		patch,
		'for portalItemId:',
		portalItemId,
		'current:',
		current
	);

	await db.uprnSelections.update(portalItemId, patch);
};

export const clearSelections = async (portalItemId: string) => {
	await db.uprnSelections.put({
		id: portalItemId,
		areas: null,
		data: []
	});
};

export const addUserDownload = async (
	localId: string,
	areaSelection: AreaSelectionInfo,
	dataSelections: DataSelectionInfo[]
) =>
	await db.userDownloads.add({
		localId,
		areaSelection,
		dataSelections,
		status: DownloadStatus.Pending,
		createdAt: Date.now()
	});

export const updateUserDownload = async (
	localId: string,
	externalId?: string,
	areaSelection?: AreaSelectionInfo,
	dataSelections?: DataSelectionInfo[]
) => {
	const update: Record<string, any> = {};
	if (externalId !== undefined) update.externalId = externalId;
	if (areaSelection !== undefined) update.areaSelection = areaSelection;
	if (dataSelections !== undefined) update.dataSelections = dataSelections;

	if (Object.keys(update).length === 0) {
		return;
	}

	await db.userDownloads.where('localId').equals(localId).modify(update);
};
export const getUserDownloads = async () =>
	await db.userDownloads.orderBy('createdAt').reverse().toArray();

export const deleteUserDownload = async (downloadId: string) =>
	await db.userDownloads.where('localId').equals(downloadId).delete();

export const clearUserDownloads = async () => await db.userDownloads.clear();

export const clearDatabase = async () => {
	await db.uprnSelections.clear();
	await db.userDownloads.clear();
};
