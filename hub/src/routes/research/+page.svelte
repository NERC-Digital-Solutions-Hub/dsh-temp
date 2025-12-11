<script lang="ts">
	import { ResearchPage } from '@dsh/research-page';
	import type { ArticleMetadata } from '@dsh/research-page';
	export let data: { html: string; frontmatter: any; articleMetadata: ArticleMetadata[] };
</script>

<ResearchPage {data} />
