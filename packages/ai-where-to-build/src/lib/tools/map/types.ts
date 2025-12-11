export interface MapToolContext {
	mapView: __esri.MapView;
}

export type MapToolFn<Input = unknown> = (
	context: MapToolContext,
	input: Input
) => Promise<void> | void;
