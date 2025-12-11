import type { LayerAnalysisSettings } from '$lib/models/layer-analysis-settings';

/**
 * Configuration for the AI Where To Build service.
 */
export type AiWhereToBuildConfig = {
	/**
	 * Layer analysis settings for the service.
	 */
	analysisSettings: LayerAnalysisSettings[];
};
