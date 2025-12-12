<script lang="ts">
	import type { Snippet } from 'svelte';
	import * as Card from '$lib/components/shadcn/card/index.js';
	import Button from '$lib/components/shadcn/button/button.svelte';
	import { scale } from 'svelte/transition';
	import { ChevronDown, ChevronUp, Maximize, Minimize } from '@lucide/svelte';

	type Props = {
		/** Whether the window is opened on initialisation. */
		isOpenedOnInit?: boolean;
		children?: Snippet;
	};

	const { isOpenedOnInit: isOpenedOnInit = false, children }: Props = $props();

	let isInitialised = $state<boolean>(false);
	let isOpened = $state<boolean>(false);
	let isMaximised = $state<boolean>(false);

	let cardElement = $state<HTMLElement | undefined>();
	let lastExpandedWindowHeight: string = '300px';
	let collapsedWindowHeight: string = '45px';

	$effect(() => {
		if (isInitialised || !cardElement) {
			return;
		}

		if (isOpenedOnInit) {
			isOpened = true;
			cardElement.style.height = lastExpandedWindowHeight;
		}

		isInitialised = true;
	});

	function onToggleCollapse() {
		if (!cardElement) {
			return;
		}

		isOpened = !isOpened;
		isMaximised = false;
		if (isOpened) {
			// Restore to last normal height when expanding
			collapsedWindowHeight = cardElement.style.height;
			cardElement.style.height = lastExpandedWindowHeight;
		} else {
			cardElement.style.height = collapsedWindowHeight;
		}
	}

	function onToggleMaximise() {
		if (!cardElement) {
			return;
		}

		isMaximised = !isMaximised;
		if (isMaximised) {
			lastExpandedWindowHeight = cardElement.style.height;
			cardElement.style.height = '100%';
		} else {
			cardElement.style.height = lastExpandedWindowHeight;
		}
	}
</script>

<div bind:this={cardElement}>
	<Card.Root class="h-full w-full gap-0 rounded-none py-0 pt-0 pb-0">
		<Card.Header class="pt-2">
			<div class="flex w-full items-center justify-between">
				<div class="font-medium">Chat</div>
				<div class="flex gap-1">
					{#if isOpened}
						<Button
							class="size-6 border-1 bg-background hover:bg-accent focus-visible:border-ring"
							onclick={onToggleMaximise}
						>
							{#if isMaximised}
								<Minimize class="text-primary" />
							{:else}
								<Maximize class="text-primary" />
							{/if}
						</Button>
					{/if}
					<Button
						class="size-6 border-1 bg-background hover:bg-accent focus-visible:border-ring"
						onclick={onToggleCollapse}
					>
						{#if !isOpened}
							<ChevronUp class="text-primary" />
						{:else}
							<ChevronDown class="text-primary" />
						{/if}
					</Button>
				</div>
			</div>
		</Card.Header>
		<Card.Content class="h-full min-h-[10px] w-full p-0" hidden={!isOpened}>
			{@render children?.()}
		</Card.Content>
	</Card.Root>
</div>
