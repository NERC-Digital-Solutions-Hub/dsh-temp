<script lang="ts">
	import { ArticlePage } from '@dsh/research-page';
	export let data: { html: string; frontmatter: any };
</script>

<ArticlePage {data} />
