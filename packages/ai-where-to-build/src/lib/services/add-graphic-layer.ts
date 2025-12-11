import Graphic from '@arcgis/core/Graphic';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';

/**
 * Add a graphic layer to the map view with click interaction for highlighting and popups.
 * @param mapView The map view.
 * @param layerTitle The graphic layer title.
 */
export function addGraphicLayer(mapView: __esri.MapView, layerTitle: string): __esri.GraphicsLayer {
	if (!mapView || !mapView.map) {
		throw new Error('MapView is not initialized');
	}

	const graphicLayer = new GraphicsLayer({
		title: layerTitle,
		listMode: 'show'
	});

	const highlightLayer = new GraphicsLayer({ listMode: 'hide' });
	mapView.map.add(highlightLayer);

	mapView.on('click', async (event) => {
		if (!mapView) {
			return;
		}

		const hit = await mapView.hitTest(event);

		// Only care about polygons from your clippedLayer
		const result = hit.results.find((r) => r.layer === graphicLayer);
		if (!result) {
			highlightLayer.removeAll();
			return;
		}

		const graphic = (result as __esri.GraphicHit).graphic;

		// 3. Update highlight
		highlightLayer.removeAll();
		highlightLayer.add(
			new Graphic({
				geometry: graphic.geometry,
				symbol: {
					type: 'simple-fill',
					color: [0, 0, 0, 0], // transparent fill
					outline: {
						type: 'simple-line',
						color: [255, 255, 0, 1], // yellow outline
						width: 3
					}
				}
			})
		);

		// 4. Open popup with the clicked graphic
		mapView.popup?.open({
			features: [graphic],
			location: event.mapPoint
		});
	});

	mapView.map.add(graphicLayer);
	return graphicLayer;
}
