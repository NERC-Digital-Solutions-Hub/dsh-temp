/**
 * Represents a buffer zone configuration for layer analysis.
 */
export type LayerBufferZone = {
	/** The distance of the buffer zone. */
	distance: number;
	/** The unit of measurement for the buffer distance. */
	unit?: __esri.LengthUnit;
	/** The weight assigned to features within this buffer zone. */
	weight: number;
};

/**
 * Represents a field value with its associated weight and optional buffer zones.
 */
export type FieldValue = {
	/** The field value (can be a string or number). */
	value: string | number;
	/** An optional label for displaying the field value. */
	label?: string;
	/** The weight assigned to this field value. */
	weight: number;
	/** Optional buffer zones to apply to features with this field value. */
	buffers?: LayerBufferZone[];
};

/**
 * Base class for layer analysis settings.
 */
export abstract class LayerAnalysisSettings {
	/** The layer ID. */
	public readonly id: string;

	/**
	 * Initializes a new instance of the LayerAnalysisSettings class.
	 * @param id The layer ID.
	 */
	constructor(id: string) {
		this.id = id;
	}
}

/**
 * Layer analysis settings for a layer where each feature has the same weight.
 */
export class WeightedLayerAnalysisSettings extends LayerAnalysisSettings {
	/** The weight assigned to all features in this layer. */
	public readonly weight: number;
	/** The buffer zones to apply to features in this layer. */
	public readonly buffers: LayerBufferZone[];
	/**
	 * Initializes a new instance of the WeightedLayerAnalysisSettings class.
	 * @param id The layer ID.
	 * @param weight The weight assigned to all features in this layer.
	 * @param buffers The buffer zones to apply to features in this layer.
	 */
	constructor(id: string, weight: number, buffers: LayerBufferZone[]) {
		super(id);
		this.weight = weight;
		this.buffers = buffers;
	}
}

/**
 * Layer analysis settings for a layer where features have different weights based on a field.
 */
export abstract class FieldLayerAnalysisSettings extends LayerAnalysisSettings {
	/** The name of the field used to determine feature weights. */
	public readonly fieldName: string;

	/**
	 * Initializes a new instance of the FieldLayerAnalysisSettings class.
	 * @param id The layer ID.
	 * @param fieldName The name of the field used to determine feature weights.
	 */
	constructor(id: string, fieldName: string) {
		super(id);
		this.fieldName = fieldName;
	}
}

/**
 * Layer analysis settings for a layer where features have different weights based on enumerated field values.
 */
export class EnumFieldLayerAnalysisSettings extends FieldLayerAnalysisSettings {
	/** The field values with their associated weights and buffer zones. */
	public readonly fieldValues: FieldValue[];

	/**
	 * Initializes a new instance of the EnumFieldLayerAnalysisSettings class.
	 * @param id The layer ID.
	 * @param fieldName The name of the field used to determine feature weights.
	 * @param fieldValues The field values with their associated weights and buffer zones.
	 */
	constructor(id: string, fieldName: string, fieldValues: FieldValue[]) {
		super(id, fieldName);
		this.fieldValues = fieldValues;
	}
}

/**
 * Layer analysis settings for a layer where features have numeric field values that are weighted.
 */
export class NumericFieldLayerAnalysisSettings extends FieldLayerAnalysisSettings {
	/** The weight multiplier applied to numeric field values. */
	public readonly weight: number;

	/**
	 * Initializes a new instance of the NumericFieldLayerAnalysisSettings class.
	 * @param id The layer ID.
	 * @param fieldName The name of the numeric field used to determine feature weights.
	 * @param weight The weight multiplier applied to numeric field values.
	 */
	constructor(id: string, fieldName: string, weight: number) {
		super(id, fieldName);
		this.weight = weight;
	}
}
