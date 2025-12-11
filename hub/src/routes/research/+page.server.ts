import { researchPageLoad } from '@dsh/research-page';
import { browser } from '$app/environment';
import { base } from '$app/paths';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch, setHeaders }) => {
	if (!browser) {
		return;
	}

	return await researchPageLoad(base, { fetch, setHeaders });
};
