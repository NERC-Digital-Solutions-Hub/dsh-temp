import type { AiWhereToBuildConfig } from '$lib/types/ai-where-to-build';

import type {
	LayerAnalysisSettings,
	LayerBufferZone,
	FieldValue
} from '$lib/models/layer-analysis-settings';

import {
	EnumFieldLayerAnalysisSettings,
	NumericFieldLayerAnalysisSettings,
	WeightedLayerAnalysisSettings
} from '$lib/models/layer-analysis-settings';
import { base } from '$app/paths';

type RawEnumSettings = {
	__name: string;
	id: string;
	fieldName: string;
	fieldValues: FieldValue[];
};

type RawWeightedSettings = {
	__name: string;
	id: string;
	weight: number;
	buffers: LayerBufferZone[];
};

type RawNumericSettings = {
	__name: string;
	id: string;
	fieldName: string;
	weight: number;
};

type RawLayerSettings = RawEnumSettings | RawWeightedSettings | RawNumericSettings;

let data: AiWhereToBuildConfig | null = null;

export async function getAiWhereToBuildConfig(): Promise<AiWhereToBuildConfig> {
	if (data) {
		return data;
	}

	const response = await fetch(`${base}/config/config.json`);
	const config = await response.json();

	const layers: LayerAnalysisSettings[] = config.analysisSettings.map((raw: RawLayerSettings) =>
		fromRawLayerSettings(raw)
	);
	data = { analysisSettings: layers };
	return data;
}

function fromRawLayerSettings(raw: RawLayerSettings): LayerAnalysisSettings {
	// ENUM → has fieldValues
	if ('fieldValues' in raw) {
		const settings = new EnumFieldLayerAnalysisSettings(raw.id, raw.fieldName, raw.fieldValues);
		return settings;
	}

	// NUMERIC → has fieldName + weight but no fieldValues
	if ('fieldName' in raw && !('fieldValues' in raw)) {
		const weight = raw.weight ?? 1;
		const settings = new NumericFieldLayerAnalysisSettings(raw.id, raw.fieldName, weight);
		return settings;
	}

	const weighted = raw as RawWeightedSettings;
	const weight = weighted.weight ?? 1;
	const buffers = weighted.buffers ?? [];

	const settings = new WeightedLayerAnalysisSettings(weighted.id, weight, buffers);
	return settings;
}
