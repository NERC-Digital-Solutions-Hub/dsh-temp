<script lang="ts">
	import * as Card from '$lib/components/shadcn/card/index.js';
	import { cn } from '$lib/utils.ts';

	type Props = {
		title: string;
		description: string;
		date: string;
		link: string;
		class?: string;
	};

	const { title, description, date, link, class: className }: Props = $props();
</script>

<a href={link}>
	<Card.Root
		class={cn(
			'bg-gray-100 transition-all duration-200 hover:bg-background hover:shadow-sm',
			className
		)}
	>
		<Card.Header>
			<Card.Title>{title}</Card.Title>
			<p class="text-sm text-gray-500">{date}</p>
		</Card.Header>
		<Card.Content>
			<p>{description}</p>
		</Card.Content>
	</Card.Root>
</a>
