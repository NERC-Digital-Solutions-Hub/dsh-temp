import { researchPageLoad } from '@dsh/research-page';
import type { PageServerLoad } from './$types';

export const prerender = false;
export const load: PageServerLoad = researchPageLoad;
