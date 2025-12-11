/**
 * Represents a service that provides access to the ArcGIS MapView.
 */
export class MapViewService {
	private _mapView: __esri.MapView;

	/**
	 * Initializes the service with the given MapView instance.
	 * @param mapView The mapview instance.
	 */
	constructor(mapView: __esri.MapView) {
		this._mapView = mapView;
	}

	/**
	 * Gets the ArcGIS MapView instance.
	 */
	public get mapView(): __esri.MapView {
		return this._mapView;
	}
}
