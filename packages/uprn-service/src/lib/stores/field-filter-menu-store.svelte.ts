/**
 * Store for managing the field filter menu state.
 */
export default class FieldFilterMenuStore {
	public ActiveLayer: __esri.Layer | null = $state<__esri.Layer | null>(null);
}
