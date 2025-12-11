import { SvelteMap } from 'svelte/reactivity';
import {
	addUserDownload,
	deleteUserDownload,
	getUserDownloads,
	updateUserDownload
} from '$lib/db';
import { browser } from '$app/environment';
import { type DownloadEntry, DownloadStatus } from '$lib/types/uprn';

/**
 * Store for managing the current downloads.
 */
class DownloadsStore {
	#downloads: SvelteMap<string, DownloadEntry> = $state(new SvelteMap<string, DownloadEntry>());

	constructor() {
		if (!browser) {
			return;
		}
		// Load existing downloads from the database
		this.#loadDownloads();
	}

	addDownload(entry: DownloadEntry) {
		console.log('[downloads-store] Adding download:', entry);
		this.#downloads.set(entry.localId, entry);
		addUserDownload(entry.localId, entry.areaSelection, entry.dataSelections);
	}

	updateDownloadStatus(entry: DownloadEntry) {
		console.log('[downloads-store] Updating download status:', entry);
		this.#downloads.set(entry.localId, { ...entry });
		updateUserDownload(entry.localId, entry.externalId, entry.areaSelection, entry.dataSelections);
	}

	removeDownload(localId: string) {
		this.#downloads.delete(localId);
		deleteUserDownload(localId);
	}

	getDownloads(): DownloadEntry[] {
		return Array.from(this.#downloads.values());
	}

	async #loadDownloads() {
		const storedDownloads = await getUserDownloads();
		if (!storedDownloads || storedDownloads.length === 0) {
			return;
		}

		console.log('Loaded downloads from DB:', storedDownloads);
		storedDownloads.forEach((download) => {
			this.#downloads.set(download.localId, {
				localId: download.localId,
				status: DownloadStatus.Pending,
				areaSelection: download.areaSelection,
				dataSelections: download.dataSelections
			});
		});
	}
}

export const downloadsStore = new DownloadsStore();
