import { load as serverLoad } from '$lib/services/research-page-server';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = serverLoad;
