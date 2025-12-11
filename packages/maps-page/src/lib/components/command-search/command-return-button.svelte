<script lang="ts">
	import Button from '$lib/components/shadcn/button/button.svelte';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';

	type Props = {
		class?: string;
		onPress?: () => void;
		disabled?: boolean;
	};

	const { class: className, onPress, disabled = false }: Props = $props();
</script>

<Button
	class="m-0 flex size-7 shrink-0 items-center justify-center rounded-md border-none bg-transparent p-0 text-muted-foreground opacity-50 shadow-none transition hover:bg-transparent hover:text-accent-foreground focus:outline-none focus-visible:border-transparent focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none active:ring-0 active:outline-none disabled:pointer-events-none disabled:opacity-50 has-[>svg]:px-0"
	onclick={() => {
		if (disabled) {
			return;
		}
		onPress?.();
	}}
	aria-label="Return to command search"
	{disabled}
>
	<ArrowLeftIcon class={`size-4 ${className}`.trim()} />
</Button>
