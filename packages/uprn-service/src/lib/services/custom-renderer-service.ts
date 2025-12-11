import { browser } from '$app/environment';
import type {
	CustomRendererClassBreak,
	CustomRenderers,
	CustomRenderersSymbolAppearance,
	CustomRendererSymbol,
	LODSize
} from '$lib/types/custom-renderers';
import type FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import Renderer from '@arcgis/core/renderers/Renderer';
import ClassBreaksRenderer from '@arcgis/core/renderers/ClassBreaksRenderer';
import SimpleRenderer from '@arcgis/core/renderers/SimpleRenderer';
import { ImageTileLevelOfDetails } from '$lib/services/image-tile-lods';
import SimpleFillSymbol from '@arcgis/core/symbols/SimpleFillSymbol';
import SimpleLineSymbol from '@arcgis/core/symbols/SimpleLineSymbol';
import Color from '@arcgis/core/Color';

type CustomRendererSymbolWithAppearances = CustomRendererSymbol & {
	Appearances: CustomRenderersSymbolAppearance[];
};

export class CustomRendererService {
	#data: CustomRenderers = null!;
	#isInitialised: boolean = false;

	async init(path: string) {
		if (!browser) {
			console.warn(
				'[custom-renderer-service] init called in non-browser environment. Skipping initialization.'
			);
			return;
		}

		if (this.#isInitialised) {
			return;
		}

		await this.#loadJsonData(path);
		this.#isInitialised = true;
	}

	async #loadJsonData(path: string) {
		const res = await fetch(path);
		const data = await res.json();
		this.#data = data as CustomRenderers;
	}

	doesFieldHaveCustomRenderer(featureLayer: FeatureLayer, fieldName: string): boolean {
		this.#ensureInitialised();

		// Find the feature layer by name
		const featureLayerRecord = this.#data.FeatureLayers.find(
			(fl) => fl.Name === featureLayer.title
		);

		if (!featureLayerRecord) {
			return false;
		}

		// Find the field by name and feature layer ID
		const fieldRecord = this.#data.Fields.find(
			(f) => f.FeatureLayerId === featureLayerRecord.Id && f.Name === fieldName
		);

		if (!fieldRecord) {
			return false;
		}

		// Check if there's a custom renderer for this field
		const customRendererField = this.#data.CustomRenderers_Fields.find(
			(crf) => crf.FieldId === fieldRecord.Id
		);

		return !!customRendererField;
	}

	getAllFieldsWithCustomRenderers(featureLayer: FeatureLayer): string[] {
		this.#ensureInitialised();

		// Find the feature layer by name
		const featureLayerRecord = this.#data.FeatureLayers.find(
			(fl) => fl.Name === featureLayer.title
		);

		if (!featureLayerRecord) {
			return [];
		}

		// Find all fields for this feature layer
		const fieldsForLayer = this.#data.Fields.filter(
			(f) => f.FeatureLayerId === featureLayerRecord.Id
		);

		// Find fields that have custom renderers
		const fieldNames: string[] = [];
		for (const field of fieldsForLayer) {
			const hasCustomRenderer = this.#data.CustomRenderers_Fields.some(
				(crf) => crf.FieldId === field.Id
			);
			if (hasCustomRenderer) {
				fieldNames.push(field.Name);
			}
		}

		return fieldNames;
	}

	async applyCustomRenderer(featureLayer: FeatureLayer, fieldName: string) {
		this.#ensureInitialised();

		// Find the feature layer by name
		const featureLayerRecord = this.#data.FeatureLayers.find(
			(fl) => fl.Name === featureLayer.title
		);

		if (!featureLayerRecord) {
			return;
		}

		// Find the field by name and feature layer ID
		const fieldRecord = this.#data.Fields.find(
			(f) => f.FeatureLayerId === featureLayerRecord.Id && f.Name === fieldName
		);

		if (!fieldRecord) {
			console.warn(
				`[custom-renderer-service] could not find the field ${fieldName} for feature layer id ${featureLayerRecord.Id}`
			);
			return;
		}

		// Find the custom renderer field mapping
		const customRendererField = this.#data.CustomRenderers_Fields.find(
			(crf) => crf.FieldId === fieldRecord.Id
		);

		if (!customRendererField) {
			console.warn(
				`[custom-renderer-service] could not find a custom renderer field for field ${fieldName} in feature layer id ${featureLayerRecord.Id}`
			);
			return;
		}

		// Find the custom renderer
		const customRenderer = this.#data.CustomRenderers.find(
			(cr) => cr.Id === customRendererField.CustomRendererId
		);

		if (!customRenderer) {
			throw new Error(
				`Could not find a custom renderer with the id ${customRendererField.CustomRendererId}`
			);
		}

		const customClassBreaks = await this.getRendererClassBreaks(
			customRenderer.ClassBreaksGroupId.toString()
		);
		const customSymbols = await this.getRendererSymbols(customRenderer.SymbolsId.toString());

		const renderer: Renderer = this.#createRenderer(
			customRenderer.CustomRendererType,
			customSymbols,
			customClassBreaks,
			[],
			fieldName
		);

		featureLayer.renderer = renderer;
		this.setCustomOutlines(featureLayer, customRenderer.LodsGroupId);
	}

	async setCustomOutlines(featureLayer: FeatureLayer, lodsGroupId: number) {
		// Find all LODs for the given group ID, sorted by Lod
		const lodsResult = this.#data.CustomRenderers_Lods.filter(
			(lod) => lod.GroupId === lodsGroupId
		).sort((a, b) => a.Lod - b.Lod);

		if (lodsResult.length === 0) {
			console.warn(`No LODs found for LODs group id ${lodsGroupId}`);
			return;
		}

		const lodSizes: LODSize[] = [];
		const levelsOfDetail = Object.values(ImageTileLevelOfDetails);

		lodsResult.forEach((lodRecord) => {
			const outlineWidth: number = lodRecord.OutlineWidth;
			const lod: number = lodRecord.Lod;
			const lodIndex: number = this.#getLODIndex(levelsOfDetail, lod) - 1;
			lodSizes.push({ size: outlineWidth, value: levelsOfDetail[lodIndex].scale });
		});

		if (
			featureLayer.renderer instanceof ClassBreaksRenderer ||
			featureLayer.renderer instanceof SimpleRenderer
		) {
			this.#setVisualVariables(featureLayer.renderer, lodSizes);
		}
	}

	async getRendererClassBreaks(classBreakGroupId: string): Promise<CustomRendererClassBreak[]> {
		const groupId = parseInt(classBreakGroupId, 10);

		// Find all class breaks for the given group ID, sorted by Order
		const result = this.#data.CustomRenderers_ClassBreaks.filter(
			(cb) => cb.GroupId === groupId
		).sort((a, b) => a.Order - b.Order);

		if (result.length === 0) {
			throw new Error(`Could not find a group with the id ${classBreakGroupId}`);
		}

		return result;
	}

	async getRendererSymbols(symbolsId: string): Promise<CustomRendererSymbolWithAppearances> {
		const id = parseInt(symbolsId, 10);

		// Find the symbol by ID
		const symbolsResult = this.#data.CustomRenderers_Symbols.find((s) => s.Id === id);

		if (!symbolsResult) {
			throw new Error(`Could not find a symbol with the id ${symbolsId}`);
		}

		// Find all appearances for this symbol, sorted by Order
		const appearancesResult = this.#data.CustomRenderers_Symbols_Appearances.filter(
			(a) => a.SymbolsId === id
		).sort((a, b) => a.Order - b.Order);

		const result: CustomRendererSymbolWithAppearances = {
			...symbolsResult,
			Appearances: appearancesResult
		};

		return result;
	}

	#getLODIndex(levelsOfDetail: { lod: number; scale: number }[], lod: number): number {
		// in ClimateJust, the LODs scale downwards (e.g. LOD 2 size goes upto LOD 1 size; if between 1 and 2, 1 is used).
		// in Esri, the LODs scale upwards (e.g. LOD 1 size goes upto LOD 2 size; if between 2 and 1, 2 is used).
		// to ensure that the intended configuration is used, the LODs are incremented by 1.
		const lodIndex = levelsOfDetail.findIndex((ls) => ls.lod === lod);
		if (lodIndex === -1) {
			return 0;
		}

		return lodIndex < 23 ? lodIndex + 1 : lodIndex;
	}

	#createRenderer(
		rendererTypeId: number,
		customSymbols: CustomRendererSymbolWithAppearances,
		customClassBreaks: CustomRendererClassBreak[],
		lodSizes: LODSize[],
		fieldId: string
	): Renderer {
		switch (rendererTypeId) {
			case 1:
				return this.#createSimpleRenderer(customSymbols, lodSizes);
			case 2:
				return this.#createClassBreaksRenderer(fieldId, customSymbols, customClassBreaks, lodSizes);
			default:
				throw new Error(`Unknown renderer type: ${rendererTypeId}`);
		}
	}

	#createClassBreaksRenderer(
		fieldId: string,
		customSymbols: CustomRendererSymbolWithAppearances,
		customClassBreaks: CustomRendererClassBreak[],
		lodSizes: LODSize[]
	): ClassBreaksRenderer {
		const classMinValueField = 'ClassMinValue';
		const classMaxValueField = 'ClassMaxValue';
		const symbolColorField = 'SymbolColor';
		const outlineColorField = 'OutlineColor';
		const outlineWidthField = 'OutlineWidth';
		const totalClasses = customSymbols.Appearances.length;

		const renderer = new ClassBreaksRenderer({
			field: fieldId
		});

		for (let i = 0; i < totalClasses; i++) {
			const minValue = customClassBreaks[i][classMinValueField];
			const maxValue = customClassBreaks[i][classMaxValueField];
			const symbolColor = customSymbols.Appearances[i][symbolColorField];
			const outlineColor = customSymbols.Appearances[i][outlineColorField];
			const outlineWidth = customSymbols.Appearances[i][outlineWidthField];
			renderer.addClassBreakInfo({
				minValue: minValue,
				maxValue: maxValue,
				symbol: new SimpleFillSymbol({
					color: Color.fromHex(symbolColor)!,
					outline: new SimpleLineSymbol({
						color: Color.fromHex(outlineColor)!,
						width: outlineWidth
					})
				})
			});
		}

		this.#setVisualVariables(renderer, lodSizes);

		return renderer;
	}

	#createSimpleRenderer(
		customSymbols: CustomRendererSymbolWithAppearances,
		lodSizes: LODSize[]
	): SimpleRenderer {
		const symbolColorField = 'SymbolColor';
		const outlineColorField = 'OutlineColor';
		const outlineWidthField = 'OutlineWidth';

		const symbolColor = customSymbols.Appearances[0][symbolColorField];
		const outlineColor = customSymbols.Appearances[0][outlineColorField];
		const outlineWidth = customSymbols.Appearances[0][outlineWidthField];

		const renderer = new SimpleRenderer({
			symbol: new SimpleFillSymbol({
				color: Color.fromHex(symbolColor)!,
				outline: new SimpleLineSymbol({
					color: Color.fromHex(outlineColor),
					width: outlineWidth
				})
			})
		});

		this.#setVisualVariables(renderer, lodSizes);

		return renderer;
	}

	#setVisualVariables(renderer: ClassBreaksRenderer | SimpleRenderer, lodSizes: LODSize[]): void {
		renderer.visualVariables = [
			{
				type: 'size',
				target: 'outline', // this is right, Ersi's type declaration for the VisualVariable is incorrect.
				valueExpression: '$view.scale',
				stops: lodSizes
			} as __esri.VisualVariableProperties
		];
	}

	#ensureInitialised() {
		if (!this.#isInitialised) {
			throw new Error('CustomRendererService is not initialized');
		}

		if (!this.#data) {
			throw new Error('Data is not loaded');
		}
	}
}
