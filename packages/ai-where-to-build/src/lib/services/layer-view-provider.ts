/**
 * Service to provide layer views for given layers in a map view. This enables the ability to fetch views without having to
 * expose the map view throughout the application.
 */
export class LayerViewProvider {
	#mapView: __esri.MapView;

	/**
	 * Initializes the LayerViewProvider with the given map view.
	 * @param mapView The map view instance.
	 */
	constructor(mapView: __esri.MapView) {
		this.#mapView = mapView;
	}

	/**
	 *
	 * @param layer The layer to get the layer view of.
	 * @returns The layer view of the provided layer.
	 */
	public async getLayerView(layer: __esri.Layer): Promise<__esri.LayerView | undefined> {
		return this.#mapView.whenLayerView(layer);
	}


	/**	 *
	 * @param layerId The ID of the layer to get the layer view of.
	 * @returns The layer view of the layer with the provided ID.
	 */
	public async getLayerViewById(layerId: string): Promise<__esri.LayerView | undefined> {
		const layer = this.#mapView.map?.findLayerById(layerId);
		if (!layer) {
			return undefined;
		}

		return this.getLayerView(layer);
	}
}
