<script lang="ts">
	import Button from '$lib/components/shadcn/button/button.svelte';
	import { Spinner } from '$lib/components/shadcn/spinner/index.js';
	import { downloadsStore } from '$lib/stores/downloads-store.svelte';
	import CheckCircleIcon from '@lucide/svelte/icons/check-circle';
	import ClipboardIcon from '@lucide/svelte/icons/clipboard';
	import ClipboardCheckIcon from '@lucide/svelte/icons/clipboard-check';
	import LoaderIcon from '@lucide/svelte/icons/loader';
	import XCircleIcon from '@lucide/svelte/icons/x-circle';
	import { toast } from 'svelte-sonner';
	import { page } from '$app/stores';
	import type { UprnDownloadService } from '$lib/services/uprn-download-service';
	import type { WebMapStore } from '$lib/stores/web-map-store.svelte';
	import {
		DownloadStatus,
		JobRequestResponseType,
		JobStatusType,
		type UprnDownloadGetJobStatusesRequest,
		type UprnDownloadGetJobStatusesResponse,
		type UprnDownloadJobRequest,
		type UprnDownloadJobRequestResponse
	} from '$lib/types/uprn';
	import Download from '@lucide/svelte/icons/download';
	import { onMount } from 'svelte';
	import SelectionEntryCard from '$lib/components/selection-entry-card/selection-entry-card.svelte';

	type Props = {
		webMapStore: WebMapStore;
		uprnDownloadService: UprnDownloadService;
		fieldsToHide?: Set<string>;
	};

	const { webMapStore, uprnDownloadService, fieldsToHide }: Props = $props();

	let copiedUrls = $state<Set<string>>(new Set()); // track which URLs have been recently copied
	const downloads = $derived.by(() => downloadsStore.getDownloads());

	/**
	 * Status configuration for downloads, mapping status to colors, text, and icons.
	 */
	const statusConfig = {
		completed: { color: '#059669', text: 'Completed', icon: CheckCircleIcon },
		'in-progress': { color: '#2563eb', text: 'In Progress', icon: LoaderIcon },
		failed: { color: '#dc2626', text: 'Failed', icon: XCircleIcon },
		pending: { color: '#6b7280', text: 'Pending', icon: Spinner }
	} as const; // TODO: move into config file.

	onMount(() => {
		const interval = setInterval(() => {
			checkJobStatuses();
		}, 5000); // Check every 5 seconds

		return () => {
			clearInterval(interval);
		};
	});

	$effect(() => {
		if (!downloads) {
			return;
		}

		// if downloads has changed, then submit a request to the uprn download service.;
		if (downloads.length <= 0 || !uprnDownloadService) {
			return;
		}

		const submitRequests = async () => {
			for (const download of downloads) {
				if (download.externalId || download.status !== DownloadStatus.Pending) {
					continue;
				}

				download.status = DownloadStatus.InProgress;
				downloadsStore.updateDownloadStatus(download);

				const request: UprnDownloadJobRequest = {
					exports: {
						areaSelectionLayer: {
							remoteId: download.areaSelection.layerId,
							areas: download.areaSelection.areaFieldInfos.map((area) => area.code)
						},
						dataSelectionLayers: download.dataSelections.map((selection) => {
							return {
								remoteId: selection.layerId,
								fields: selection.fields.filter(
									(field) => !fieldsToHide || !fieldsToHide.has(field)
								)
							};
						})
					}
				};

				console.log('[downloads-menu] Submitting download request:', request);

				try {
					const response = await uprnDownloadService.requestJob(request);

					if (!response || response.type === JobRequestResponseType.Error) {
						download.status = DownloadStatus.Failed;
						downloadsStore.updateDownloadStatus(download);
						continue;
					}

					download.externalId = response.guid;
					downloadsStore.updateDownloadStatus(download);
				} catch (e) {
					download.status = DownloadStatus.Failed;
					downloadsStore.updateDownloadStatus(download);
				}
			}
		};

		submitRequests();
	});

	async function checkJobStatuses() {
		if (downloads.length <= 0 || !uprnDownloadService) {
			return;
		}

		const request: UprnDownloadGetJobStatusesRequest = {
			jobs: downloads
				.filter(
					(download) =>
						download.externalId &&
						download.status !== DownloadStatus.Completed &&
						download.status !== DownloadStatus.Failed
				)
				.map((download) => download.externalId!)
		};

		if (request.jobs.length === 0) {
			return;
		}

		console.log('[downloads-menu] Checking job statuses for downloads:', request);
		const response: UprnDownloadGetJobStatusesResponse | undefined =
			(await uprnDownloadService.requestJobStatuses(request)) as
				| UprnDownloadGetJobStatusesResponse
				| undefined;

		if (!response) {
			console.error('[downloads-menu] Failed to get job statuses.', response);
			return;
		}

		for (const job of response.jobs) {
			const download = downloads.find((download) => download.externalId === job.guid);
			if (!download) {
				console.warn('[downloads-menu] Received job status for unknown download:', job.guid);
				continue;
			}

			switch (job.status.type) {
				case JobStatusType.Submitted:
				case JobStatusType.Processing:
					download.status = DownloadStatus.InProgress;
					break;
				case JobStatusType.Completed:
					download.status = DownloadStatus.Completed;
					break;
				case JobStatusType.Error:
					download.status = DownloadStatus.Failed;
					break;
				default:
					console.warn('[downloads-menu] Unknown job status type:', job.status.type);
					break;
			}

			downloadsStore.updateDownloadStatus(download);
		}
	}

	/**
	 * Removes a download from the queue by its local ID.
	 * @param localId - The local ID of the download to remove.
	 */
	function removeDownload(localId: string) {
		downloadsStore.removeDownload(localId);
	}

	/**
	 * Copies the given URL to the clipboard and shows a toast notification.
	 * Temporarily marks the URL as copied for UI feedback.
	 * @param url - The URL to copy.
	 */
	async function copyUrlToClipboard(url: string) {
		try {
			await navigator.clipboard.writeText(url);
			copiedUrls = new Set(copiedUrls).add(url); // Create new Set to trigger reactivity
			toast.success('URL copied to clipboard');

			// Reset the icon after 2 seconds
			setTimeout(() => {
				const newCopiedUrls = new Set(copiedUrls);
				newCopiedUrls.delete(url);
				copiedUrls = newCopiedUrls; // Assign new Set to trigger reactivity
			}, 2000);
		} catch (err) {
			console.error('Failed to copy URL:', err);
			toast.error('Failed to copy URL to clipboard');
		}
	}

	/**
	 * Gets the color associated with a download status.
	 * @param status - The download status.
	 * @returns The color string.
	 */
	function getStatusColor(status: string) {
		return statusConfig[status as keyof typeof statusConfig]?.color ?? statusConfig.pending.color;
	}

	/**
	 * Gets the display text for a download status.
	 * @param status - The download status.
	 * @returns The status text.
	 */
	function getStatusText(status: string) {
		return statusConfig[status as keyof typeof statusConfig]?.text ?? statusConfig.pending.text;
	}

	/**
	 * Gets the icon component for a download status.
	 * @param status - The download status.
	 * @returns The icon component.
	 */
	function getStatusIcon(status: string) {
		return statusConfig[status as keyof typeof statusConfig]?.icon ?? statusConfig.pending.icon;
	}

	function getDownloadUrl(externalId: string): string {
		return uprnDownloadService.getDownloadUrl(externalId);
	}
</script>

<div class="section">
	<h4>Download Queue</h4>
	{#if downloads.length > 0}
		<ul class="selected-list">
			{#each downloads as download}
				<SelectionEntryCard title={
				download.externalId 
					? download.externalId 
					: download.status !== DownloadStatus.Failed 
						? 'Pending...'
						: 'Failed to start download'
				}>
					<Button
						variant="ghost"
						size="sm"
						class="download-status-btn"
						style="color: {getStatusColor(download.status)}"
						title={getStatusText(download.status)}
						disabled
					>
						{@const StatusIcon = getStatusIcon(download.status)}
							<StatusIcon size={14} class={download.status === 'in-progress' ? 'spinning' : ''} />
					</Button>
					{#if download.externalId}
						<Button
							variant="ghost"
							size="sm"
							class="download-clipboard-btn"
							onclick={() => copyUrlToClipboard(getDownloadUrl(download.externalId!))}
							title="Copy URL to clipboard"
						>
							{#if copiedUrls.has(getDownloadUrl(download.externalId))}
								<ClipboardCheckIcon size={14} />
							{:else}
								<ClipboardIcon size={14} />
							{/if}
						</Button>
					{/if}
					{#if download.externalId && download.status === 'completed'}
						<Button
							variant="ghost"
							size="sm"
							class="download-action-btn"
							onclick={() => window.open(getDownloadUrl(download.externalId!), '_blank')}
							title="Open download"
						>
							<Download />
						</Button>
					{/if}
					<Button
						variant="ghost"
						size="sm"
						class="download-remove-btn"
						onclick={() => removeDownload(download.localId)}
						title="Remove from queue"
					>
						×
					</Button>
				</SelectionEntryCard>
			{/each}
		</ul>
		<p class="count">{downloads.length} download(s) in queue</p>
	{:else}
		<p class="no-selection">No downloads in queue</p>
	{/if}
</div>

<style>
	.section {
		margin-bottom: 1.5rem;
	}

	.section:last-child {
		margin-bottom: 0;
	}

	h4 {
		margin: 0 0 0.5rem 0;
		font-size: 1rem;
		font-weight: 500;
		color: #374151;
	}

	.selected-list {
		list-style: none;
		padding: 0;
	}

	:global(.download-status-btn .spinning) {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	:global(.download-action-btn),
	:global(.download-clipboard-btn),
	:global(.download-status-btn),
	:global(.download-remove-btn) {
		height: 1.5rem;
		width: 1.5rem;
		padding: 0;
		font-size: 1rem;
		line-height: 1;
		color: #6b7280;
		transition: color 0.15s ease-in-out;
	}

	:global(.download-status-btn) {
		cursor: default;
		opacity: 1;
	}

	:global(.download-status-btn:disabled) {
		opacity: 1;
		pointer-events: none;
	}

	:global(.download-action-btn:hover) {
		color: #059669;
	}

	:global(.download-clipboard-btn:hover) {
		color: #2563eb;
	}

	:global(.download-clipboard-btn:has(svg)) {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	:global(.download-remove-btn:hover) {
		color: #ef4444;
	}

	.count {
		margin: 0;
		font-size: 0.75rem;
		font-weight: 500;
		color: #6b7280;
	}

	.no-selection {
		margin: 0;
		font-size: 0.875rem;
		color: #9ca3af;
		font-style: italic;
	}
</style>
