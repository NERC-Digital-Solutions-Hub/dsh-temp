<script lang="ts">
	import * as NavigationMenu from '$lib/components/shadcn/navigation-menu/index.js';
	import { navigationMenuTriggerStyle } from '$lib/components/shadcn/navigation-menu/navigation-menu-trigger.svelte';
	import { base } from '$app/paths';
</script>

<nav>
	<a href="{base}/" class="brand">
		<img
			src={`${base}/dsh-logo.png`}
			alt="NERC Digital Solutions Hub"
			class="logo"
			decoding="async"
		/>
	</a>
	<NavigationMenu.Root viewport={false} class="menu-item-container z-20">
		<NavigationMenu.List>
			<NavigationMenu.Item></NavigationMenu.Item>
			<NavigationMenu.Item>
				<NavigationMenu.Trigger>Catalogues</NavigationMenu.Trigger>
				<NavigationMenu.Content>
					<ul class="grid w-[300px] gap-4 p-2">
						<li>
							<NavigationMenu.Link href="#">
								<a href={`${base}/catalogues/full-text-search`}>
									<div class="font-medium">Full-Text Search</div>
									<div class="text-muted-foreground">
										Explore our data using a traditional approach to search.
									</div>
								</a>
							</NavigationMenu.Link>
							<NavigationMenu.Link href="#">
								<a href={`${base}/catalogues/ai`}>
									<div class="font-medium">AI</div>
									<div class="text-muted-foreground">
										Explore our data using AI-powered search and discovery tools.
									</div>
								</a>
							</NavigationMenu.Link>
						</li>
					</ul>
				</NavigationMenu.Content>
			</NavigationMenu.Item>
			<NavigationMenu.Item>
				<NavigationMenu.Trigger>Apps</NavigationMenu.Trigger>
				<NavigationMenu.Content>
					<ul class="grid w-[300px] gap-4 p-2">
						<li>
							<NavigationMenu.Link href="#">
								<a href={`${base}/apps/uprn`}>
									<div class="font-medium">UPRN</div>
									<div class="text-muted-foreground">
										Explore Unique Property Reference Numbers (UPRNs) on an interactive map.
									</div>
								</a>
							</NavigationMenu.Link>
							<NavigationMenu.Link href="#">
								<a href={`${base}/apps/climate-just`}>
									<div class="font-medium">ClimateJust</div>
									<div class="text-muted-foreground">
										Discover who is vulnerable to climate change and fuel-poverty and why.
									</div>
								</a>
							</NavigationMenu.Link>
							<NavigationMenu.Link href="#">
								<a href={`${base}/apps/health-and-environment`}>
									<div class="font-medium">Health and Environment</div>
									<div class="text-muted-foreground">
										Explore the spatial relationships between a broad set of environmental and
										health data along with the ability to add your own data for your own use.
									</div>
								</a>
							</NavigationMenu.Link>
							<NavigationMenu.Link href="#">
								<a href={`${base}/apps/where-to-build`}>
									<div class="font-medium">Where to Build</div>
									<div class="text-muted-foreground">
										Identify potential sites for housing and undertake a site analysis based on your
										choices.
									</div>
								</a>
							</NavigationMenu.Link>
							<NavigationMenu.Link href="#">
								<a href={`${base}/apps/ai-where-to-build`}>
									<div class="font-medium">Where to Build (AI)</div>
									<div class="text-muted-foreground">
										Identify potential sites for housing and undertake a site analysis based on your
										choices - AI powered.
									</div>
								</a>
							</NavigationMenu.Link>
							<NavigationMenu.Link href="#">
								<a href={`${base}/apps`}>
									<div class="font-medium">View All...</div>
								</a>
							</NavigationMenu.Link>
						</li>
					</ul>
				</NavigationMenu.Content>
			</NavigationMenu.Item>
			<NavigationMenu.Item>
				<NavigationMenu.Trigger>Realtime</NavigationMenu.Trigger>
				<NavigationMenu.Content>
					<ul class="grid w-[300px] gap-4 p-2">
						<li>
							<NavigationMenu.Link href="#">
								<a href={`${base}/realtime/urban-observatory`}>
									<div class="font-medium">NERC Urban Observatory</div>
									<div class="text-muted-foreground"></div>
								</a>
							</NavigationMenu.Link>
						</li>
					</ul>
				</NavigationMenu.Content>
			</NavigationMenu.Item>
			<NavigationMenu.Item>
				<NavigationMenu.Link>
					{#snippet child()}
						<a href={`${base}/maps`} class={navigationMenuTriggerStyle()}>Maps</a>
					{/snippet}
				</NavigationMenu.Link>
			</NavigationMenu.Item>
			<NavigationMenu.Item>
				<NavigationMenu.Link>
					{#snippet child()}
						<a href={`${base}/research`} class={navigationMenuTriggerStyle()}>Research</a>
					{/snippet}
				</NavigationMenu.Link>
			</NavigationMenu.Item>
		</NavigationMenu.List>
	</NavigationMenu.Root>
</nav>

<style>
	nav {
		flex: 0 0 auto;
		display: flex;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		background: #fff;
		border-bottom: 1px solid #e5e7eb;
		z-index: 100;
		position: relative;
		height: var(--header-height, 64px);
	}

	.brand {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		text-decoration: none;
		color: inherit;
		flex: 0 0 auto;
	}

	.logo {
		height: 32px;
		width: auto;
	}

	.menu-item-container {
		align-items: center;
	}
</style>
