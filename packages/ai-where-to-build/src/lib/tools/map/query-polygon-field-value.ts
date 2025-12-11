
/**
 * 
 * @param layer 
 * @param polygon 
 * @param fieldName 
 * @returns 
 */
export async function queryPolygonFieldValue(
	layer: __esri.FeatureLayer,
	polygon: __esri.Graphic,
	fieldName: string
): Promise<any> {
	let valueList: string[] = [];
	const query = layer.createQuery();
	query.geometry = polygon.geometry;
	query.spatialRelationship = 'intersects';
	query.returnGeometry = false;
	query.outFields = [fieldName];
	query.num = 10; // or whatever max you expect

	const res = await layer.queryFeatures(query);
	valueList = res.features
		.map((f) => f.attributes?.[fieldName])
		.filter((v) => v != null)
		.map((v) => String(v));

	if (valueList.length === 0) {
		return null;
	}

	// return unique values only
	valueList = Array.from(new Set(valueList));

	return valueList;
}
