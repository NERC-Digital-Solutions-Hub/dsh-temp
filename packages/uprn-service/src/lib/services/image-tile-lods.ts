/**
 * @typedef {Object} LevelOfDetail
 * @property {number} lod - The LOD level.
 * @property {number} scale - The scale for images at this LOD level.
 */

/**
 * @module ImageTileLevelOfDetails
 * @description Provides an enumeration of the map image tile Level of Details (LODs) and their respective scales.
 * @enum {LevelOfDetail}
 *
 * @see {@link https://developers.arcgis.com/documentation/glossary/zoom-level/|Zoom Level}
 * @see {@link https://developers.arcgis.com/documentation/mapping-apis-and-services/reference/zoom-levels-and-scale/|Zoom Levels and Scale}
 * @see {@link https://developers.arcgis.com/documentation/glossary/level-of-detail/|Level of Detail}
 * @see {@link https://developers.arcgis.com/javascript/latest/api-reference/esri-layers-support-LOD.html|LOD}
 */
export const ImageTileLevelOfDetails = Object.freeze({
	/**
	 * Represents the Level of Detail (LOD) for the world at level (0).
	 *
	 * @property {LevelOfDetail} lod00World - The LOD level for the world at level (0).
	 * @property {number} lod00World.lod - The LOD level. Here, 0 indicates the most general level (world view).
	 * @property {number} lod00World.scale - The scale for images at this LOD.
	 *  The value corresponds to the scale at which one screen pixel is equal to imageScale map units.
	 */
	lod00World: { lod: 0, scale: 591657527.591555 },

	/**
	 * Represents the Level of Detail (LOD) for the world at level (1).
	 * This level provides a more detailed view compared to lod00World, allowing for finer representations
	 * of geographical features.
	 *
	 * @property {LevelOfDetail} lod01World - The LOD level for the world at level (1).
	 * @property {number} lod01World.lod - The LOD level. Here, 1 indicates a more detailed level than lod00World.
	 * @property {number} lod01World.scale - The scale for images at this LOD.
	 *  The value indicates the scale at which one screen pixel is equal to imageScale map units.
	 *  It provides a more detailed view than lod00World.
	 */
	lod01World: { lod: 1, scale: 295828763.795777 },

	/**
	 * Represents the Level of Detail (LOD) for the world at level (2).
	 * This level provides a more detailed view compared to lod01World, allowing for finer representations
	 * of geographical features.
	 *
	 * @property {LevelOfDetail} lod02World - The LOD level for the world at level (2).
	 * @property {number} lod02World.lod - The LOD level, specified here as 2, indicating a more detailed
	 *  representation than levels 0 and 1.
	 * @property {number} lod02World.scale - The scale for images at this LOD level.
	 *  The value signifies the map scale at which one screen pixel corresponds to imageScale map units.
	 *  A smaller scale number means a more detailed image view.
	 */
	lod02World: { lod: 2, scale: 147914381.897889 },

	/**
	 * Represents the Level of Detail (LOD) at the continent level (3).
	 * This level provides a detailed view suitable for continent-scale maps, offering a balance
	 * between detail and scope that is more focused than world levels but less detailed than
	 * regional or local levels.
	 *
	 * @property {LevelOfDetail} lod03Continent - The LOD level for the world at level (3).
	 * @property {number} lod03Continent.lod - The LOD level, here set to 3, indicating a level of detail
	 *  appropriate for continent-scale representations.
	 * @property {number} lod03Continent.scale - The scale for images at this LOD level.
	 *  The value indicates the scale at which one screen pixel is equal to imageScale map units,
	 *  providing an appropriate level of image detail for continent-scale views.
	 */
	lod03Continent: { lod: 3, scale: 73957190.948944 },

	/**
	 * Represents the Level of Detail (LOD) at the continent level, specifically level (4).
	 * This level offers a finer granularity than lod03Continent, making it suitable for more
	 * detailed continent-scale maps. It allows for closer views and more detailed representations
	 * of geographical features at a continent scale.
	 *
	 * @property {LevelOfDetail} lod04Continent - The LOD level for the world at level (4).
	 * @property {number} lod04Continent.lod - The LOD level, set to 4, which provides a more detailed view
	 *  compared to lower continent-level LODs.
	 * @property {number} lod04Continent.scale - The scale for images at this LOD level.
	 *  The value defines the map scale at which one screen pixel equates to imageScale map units,
	 *  offering a more detailed image view for continent-level maps.
	 */
	lod04Continent: { lod: 4, scale: 36978595.474472 },

	/**
	 * Represents the Level of Detail (LOD) for countries at level (5).
	 * This level of detail is suitable for maps focusing on individual countries, providing a
	 * balance between detail and scope to effectively represent national-scale geographical features.
	 *
	 * @property {LevelOfDetail} lod05Countries - The LOD level for the world at level (5).
	 * @property {number} lod05Countries.lod - The LOD level, here set to 5, indicating a detailed
	 *  representation that is appropriate for visualizing countries.
	 * @property {number} lod05Countries.scale - The scale for images at this LOD level.
	 *  The value signifies the scale at which one screen pixel corresponds to imageScale map units,
	 *  allowing for detailed image representation at the country level.
	 */
	lod05Countries: { lod: 5, scale: 18489297.737236 },

	/**
	 * Represents the Level of Detail (LOD) for a single country at level (6).
	 * This LOD provides an even more detailed view than lod05Countries, making it suitable for
	 * in-depth country-level mapping. It allows for detailed views of smaller regions or significant
	 * urban areas within a country.
	 *
	 * @property {LevelOfDetail} lod06Country - The LOD level for the world at level (6).
	 * @property {int} lod06Country.lod - The LOD level, set to 6, which offers a higher degree of detail
	 *  for country-level mapping compared to lower LODs.
	 * @property {number} lod06Country.scale - The scale for images at this LOD level.
	 *  This value determines the scale at which one screen pixel equates to imageScale map units,
	 *  allowing for more detailed and finer image representations at the country level.
	 */
	lod06Country: { lod: 6, scale: 9244648.868618 },

	/**
	 * Represents the Level of Detail (LOD) for states or provinces at level (7).
	 * This LOD is tailored for detailed mapping of larger sub-national regions, such as states or provinces,
	 * providing a suitable level of detail for regional planning, navigation, and geographical analysis.
	 *
	 * @property {LevelOfDetail} lod07StatesProvinces - The LOD level for the world at level (7).
	 * @property {number} lod07StatesProvinces.lod - The LOD level, set to 7, which is optimized for the
	 *  detailed representation of states or provinces, offering a closer view than country-level LODs.
	 * @property {number} lod07StatesProvinces.scale - The scale for images at this LOD level.
	 *  This value defines the map scale at which one screen pixel corresponds to imageScale map units,
	 *  enabling detailed visualization of regional features and layouts.
	 */
	lod07StatesProvinces: { lod: 7, scale: 4622324.434309 },

	/**
	 * Represents the Level of Detail (LOD) for counties at level (8).
	 * This LOD is specifically designed for mapping at the county level, offering detailed views
	 * suitable for analyzing and displaying geographical and administrative features within counties.
	 *
	 * @property {LevelOfDetail} lod08Counties - The LOD level for the world at level (8).
	 * @property {number} lod08Counties.lod - The LOD level, set to 8, which provides a high level of details
	 *  ideal for county-scale mapping. It enables detailed visualization of smaller administrative areas
	 *  within a region.
	 * @property {number} lod08Counties.scale - The scale for images at this LOD level.
	 *  This value signifies the map scale at which one screen pixel corresponds to imageScale map units,
	 *  allowing for precise and detailed image representations at the county level.
	 */
	lod08Counties: { lod: 8, scale: 2311162.217155 },

	/**
	 * Represents the Level of Detail (LOD) for counties at level (9).
	 * This LOD offers an even greater level of detail than lod08Counties, making it highly suitable
	 * for detailed and focused mapping within county boundaries. It is ideal for applications requiring
	 * fine-grained detail of county-level features, such as local planning, detailed navigation, and
	 * precise geographical analysis.
	 *
	 * @property {LevelOfDetail} lod09Counties - The LOD level for the world at level (9).
	 * @property {number} lod09Counties.lod - The LOD level, set to 9, which provides a more detailed view
	 *  for county-scale mapping compared to lower LODs. This level is beneficial for close-up views of counties,
	 *  capturing intricate details.
	 * @property {number} lod09Counties.scale - The scale for images at this LOD level.
	 *  The value defines the map scale at which one screen pixel is equivalent to imageScale map units,
	 *  allowing for highly detailed image representations within counties.
	 */
	lod09Counties: { lod: 9, scale: 1155581.108577 },

	/**
	 * Represents the Level of Detail (LOD) at the county level, specifically level (10).
	 * This LOD provides a highly detailed view suitable for in-depth analysis and mapping within
	 * individual counties. It allows for the visualization of finer features and elements at a
	 * local scale, which is crucial for precise mapping and geographical assessments within county boundaries.
	 *
	 * @property {LevelOfDetail} lod10Country - The LOD level for the world at level (10).
	 * @property {number} lod10Country.lod - The LOD level, set to 10, which is designed to offer a detailed
	 *  perspective for county-level mapping, capturing more specific and localized features compared to broader
	 *  regional levels.
	 * @property {number} lod10Country.scale - The scale for images at this LOD level.
	 *  This value indicates the scale at which one screen pixel equates to imageScale map units,
	 *  enabling highly detailed and focused imagery for county-level mapping.
	 */
	lod10Country: { lod: 10, scale: 577790.554289 },

	/**
	 * Represents the Level of Detail (LOD) for metropolitan areas at level (11).
	 * This LOD is optimized for mapping at the scale of large urban areas or metropolitan regions,
	 * providing an appropriate level of detail for urban planning, infrastructure development, and
	 * detailed geographical analysis within metropolitan contexts.
	 *
	 * @property {LevelOfDetail} lod11MetropolitanArea - The LOD level for the world at level (11).
	 * @property {number} lod11MetropolitanArea.lod - The LOD level, set to 11, which is specifically
	 *  designed to cater to the mapping needs of metropolitan areas. It allows for detailed visualization
	 *  of urban layouts and infrastructural elements.
	 * @property {number} lod11MetropolitanArea.scale - The scale for images at this LOD level.
	 *  The value specifies the map scale at which one screen pixel corresponds to imageScale
	 *  map units, enabling detailed and clear imagery suitable for the dense and complex features
	 *  typical of metropolitan areas.
	 */
	lod11MetropolitanArea: { lod: 11, scale: 288895.277144 },

	/**
	 * Represents the Level of Detail (LOD) for cities at level (12).
	 * This LOD is specifically designed for city-scale mapping, offering a high level of detail
	 * appropriate for urban planning, navigation, and detailed geographical analysis within city limits.
	 * It is ideal for applications requiring detailed views of city features such as streets,
	 * buildings, and public spaces.
	 *
	 * @property {LevelOfDetail} lod12Cities - The LOD level for the world at level (12).
	 * @property {number} lod12Cities.lod - The LOD level, set to 12, which provides a detailed perspective
	 *  suitable for city-scale mapping. This level allows for the visualization of fine urban details and
	 *  is more focused than broader metropolitan or regional levels.
	 * @property {number} lod12Cities.scale - The scale for images at this LOD level.
	 *  This value determines the map scale at which one screen pixel equates to imageScale
	 *  map units, enabling detailed and precise imagery for cityscapes.
	 */
	lod12Cities: { lod: 12, scale: 144447.638572 },

	/**
	 * Represents the Level of Detail (LOD) at the city level, specifically level (13).
	 * This LOD provides an even more detailed view than lod12Cities, making it suitable for
	 * in-depth urban mapping within city boundaries. It enables the visualization of very fine
	 * features and elements within a city, which is crucial for detailed urban planning,
	 * infrastructure development, and localized geographical analysis.
	 *
	 * @property {LevelOfDetail} lod13City - The LOD level for the world at level (13).
	 * @property {number} lod13City.lod - The LOD level, set to 13, which offers a higher degree of detail
	 *  for city-scale mapping compared to lower LODs. This level is beneficial for close-up views of
	 *  urban areas, capturing intricate details of city layouts and structures.
	 * @property {number} lod13City.scale - The scale for images at this LOD level.
	 *  The value defines the map scale at which one screen pixel is equivalent to imageScale
	 *  map units, allowing for highly detailed and focused imagery within city areas.
	 */
	lod13City: { lod: 13, scale: 72223.819286 },

	/**
	 * Represents the Level of Detail (LOD) for towns at level (14).
	 * This LOD is specifically tailored for detailed mapping of towns, offering a high level of detail
	 * that is suitable for capturing the intricacies of smaller urban and suburban areas. It is ideal
	 * for applications requiring precise visualization of town features such as local road networks,
	 * small-scale land use patterns, and detailed layouts of town infrastructure.
	 *
	 * @property {LevelOfDetail} lod14Town - The LOD level for the world at level (14).
	 * @property {number} lod - The LOD level, set to 14, which provides a detailed perspective
	 *  ideal for town-scale mapping. This level allows for the visualization of fine details
	 *  within towns, more focused than city-level LODs.
	 * @property {number} scale - The scale for images at this LOD level.
	 *  This value indicates the map scale at which one screen pixel corresponds to imageScale
	 *  map units, enabling detailed and clear imagery suitable for town-scale mapping.
	 */
	lod14Town: { lod: 14, scale: 36111.909643 },

	/**
	 * Represents the Level of Detail (LOD) for neighborhoods at level (15).
	 * This LOD is designed for mapping at the neighborhood scale, providing a highly detailed view
	 * that is particularly useful for local planning, detailed navigation, and in-depth analysis
	 * of small urban areas. It allows for the visualization of individual buildings, small roads,
	 * and other local features that are important for neighborhood-level mapping.
	 *
	 * @property {LevelOfDetail} lod15Neighborhood - The LOD level for the world at level (15).
	 * @property {number} lod15Neighborhood.lod - The LOD level, set to 15, which provides
	 *  a fine-grained perspective ideal for detailed neighborhood-scale mapping.
	 *  This level captures the nuances and intricate details of small-scale urban environments.
	 * @property {number} lod15Neighborhood.scale - The scale for images at this LOD level.
	 *  This value indicates the map scale at which one screen pixel equates to imageScale
	 *  map units, enabling highly detailed imagery for neighborhood areas.
	 */
	lod15Neighborhood: { lod: 15, scale: 18055.954822 },

	/**
	 * Represents the Level of Detail (LOD) for streets at level (16).
	 * This LOD is specifically designed for street-level mapping, offering an extremely high level of detail
	 * suitable for precise street navigation, detailed urban planning, and granular analysis of urban spaces.
	 * It is particularly useful for applications requiring a close-up view of street layouts, individual
	 * structures, and fine urban features.
	 *
	 * @property {LevelOfDetail} lod16Streets - The LOD level for the world at level (16).
	 * @property {number} lod16Streets.lod - The LOD level, set to 16, which provides an intricate level of detail
	 *  ideal for mapping streets. This level allows for the visualization of very fine details within urban
	 *  environments, such as individual road lanes, pedestrian paths, and small urban elements.
	 * @property {number} lod16Streets.scale - The scale for images at this LOD level.
	 *  This value specifies the map scale at which one screen pixel corresponds to imageScale
	 *  map units, enabling highly precise and detailed imagery for street views.
	 */
	lod16Streets: { lod: 16, scale: 9027.977411 },

	/**
	 * Represents the Level of Detail (LOD) for city blocks at level (17).
	 * This LOD is tailored for mapping at the city block level, offering a high-resolution view
	 * that captures the intricacies of individual city blocks. It is particularly useful for applications
	 * that require detailed visualization of small urban areas, such as property development, local planning,
	 * and detailed urban analysis. This level allows for the examination of features like building footprints,
	 * small park spaces, and intricate street patterns within a city block.
	 *
	 * @property {LevelOfDetail} lod17CityBlock - The LOD level for the world at level (17).
	 * @property {number} lod17CityBlock.lod - The LOD level, set to 17, which provides a detailed perspective
	 *  for city block-scale mapping. This level is suitable for examining the nuances and detailed features
	 *  within individual city blocks.
	 * @property {number} lod17CityBlock.scale - The scale for images at this LOD level.
	 *  This value specifies the map scale at which one screen pixel corresponds to imageScale
	 *  map units, enabling highly detailed imagery that is ideal for city block-level visualization.
	 */
	lod17CityBlock: { lod: 17, scale: 4513.988705 },

	/**
	 * Represents the Level of Detail (LOD) for individual buildings at level (18).
	 * This LOD is specifically designed for high-resolution mapping of buildings, providing an
	 * extremely detailed view suitable for architectural planning, detailed property analysis, and
	 * urban design. It enables the visualization of specific building features and fine structural
	 * elements, which is crucial for applications requiring a close-up examination of individual
	 * buildings or small groups of structures.
	 *
	 * @property {LevelOfDetail} lod18Buildings - The LOD level for the world at level (18).
	 * @property {number} lod18Buildings.lod - The LOD level, set to 18, which offers an intricate
	 *  level of detail ideal for building-scale mapping. This level allows for the visualization
	 *  of individual buildings in high detail, capturing architectural nuances and small structural features.
	 * @property {number} lod18Buildings.scale - The scale for images at this LOD level.
	 *  This value indicates the map scale at which one screen pixel equates to imageScale
	 *  map units, allowing for highly detailed and focused imagery of building exteriors and surrounding areas.
	 */
	lod18Buildings: { lod: 18, scale: 2256.994353 },

	/**
	 * Represents the Level of Detail (LOD) for a singular building at level (19).
	 * This LOD offers an ultra-high-resolution view ideal for detailed analysis and visualization
	 * of individual buildings. It is particularly suited for applications that require an in-depth
	 * examination of architectural details, internal layouts, and specific structural elements of a building.
	 *
	 * @property {LevelOfDetail} lod19Building - The LOD level for the world at level (19).
	 * @property {number} lod19Building.lod - The LOD level, set to 19, which provides the highest
	 *  level of detail for mapping individual buildings. This level is tailored for capturing
	 *  fine architectural details and intricate features of a single building or small architectural elements.
	 * @property {number} lod19Building.scale - The scale for images at this LOD level.
	 *  This value specifies the map scale at which one screen pixel is equivalent to imageScale
	 *  map units, enabling extremely detailed imagery for precise architectural visualization and analysis.
	 */
	lod19Building: { lod: 19, scale: 1128.497176 },

	/**
	 * Represents the Level of Detail (LOD) for houses at level (20).
	 * This LOD is tailored for extremely detailed mapping of individual houses or small residential units.
	 * It is ideal for applications that require precise visualization and analysis of house structures,
	 * including details like external features, landscaping, and smaller architectural elements.
	 * This level of detail is particularly useful in detailed property assessments, architectural design,
	 * and localized urban planning.
	 *
	 * @property {LevelOfDetail} lod20Houses - The LOD level for the world at level (20).
	 * @property {number} lod20Houses.lod - The LOD level, set to 20, which provides an exceptionally
	 *  high resolution for mapping individual houses. This level enables the visualization of minute
	 *  details and fine features of residential structures.
	 * @property {number} lod20Houses.scale - The scale for images at this LOD level.
	 *  This value determines the map scale at which one screen pixel corresponds to imageScale map units,
	 *  allowing for ultra-detailed imagery suitable for individual houses and small residential structures.
	 */
	lod20Houses: { lod: 20, scale: 564.248588 },

	/**
	 * Represents the Level of Detail (LOD) for houses at level (21).
	 * This LOD level extends the detail of lod20Houses, providing an even more refined view for mapping
	 * individual houses or small residential units. It is specifically suited for ultra-precise
	 * architectural analysis, detailed property assessments, and close-up examination of residential structures,
	 * including minute architectural features and small-scale landscaping details.
	 *
	 * @property {LevelOfDetail} lod21Houses - The LOD level for the world at level (21).
	 * @property {number} lod21Houses.lod - The LOD level, set to 21, which offers the highest possible resolution
	 * for mapping houses. This level is particularly effective for capturing extremely fine details of residential
	 *  structures that are not visible at lower LOD levels.
	 * @property {number} lod21Houses.scale - The scale for images at this LOD level.
	 *  This value specifies the map scale at which one screen pixel equates to imageScale map units, enabling the
	 *  most detailed and precise imagery achievable for individual houses and their immediate surroundings.
	 */
	lod21Houses: { lod: 21, scale: 282.124294 },

	/**
	 * Represents the Level of Detail (LOD) for houses at level (22).
	 * This LOD provides an unprecedented level of detail for mapping individual houses, surpassing the
	 * resolution of lod21Houses. It is especially useful for ultra-fine architectural detailing, landscaping
	 * analysis, and close-up examination of specific features of residential structures. This level of detail
	 * is crucial for applications that demand the most precise and intricate visualization of houses, such as
	 * detailed architectural design, property evaluation, and micro-level urban planning.
	 *
	 * @property {LevelOfDetail} lod22Houses - The LOD level for the world at level (22).
	 * @property {number} lod22Houses.lod - The LOD level, set to 22, representing the most granular
	 *  level of detail available for mapping individual houses. It is designed to capture even the
	 *  smallest architectural and environmental features of residential properties.
	 * @property {number} lod22Houses.scale - The scale for images at this LOD level.
	 *  This value indicates the map scale at which one screen pixel corresponds to imageScale
	 *  map units, enabling the highest level of imagery detail feasible for residential structures and
	 *  their immediate environments.
	 */
	lod22Houses: { lod: 22, scale: 141.062147 },

	/**
	 * Represents the Level of Detail (LOD) for an individual house and its property at level (23).
	 * This LOD offers the most detailed view currently available for mapping specific properties,
	 * focusing on single residential units. It is particularly beneficial for applications that demand
	 * extremely precise visualization and analysis of individual house structures, including detailed
	 * architectural features, landscaping, and the surrounding property. This level is crucial for
	 * high-resolution property surveys, detailed architectural modeling, and precise landscape design.
	 *
	 * @property {LevelOfDetail} lod23HouseProperty - The LOD level for the world at level (23).
	 * @property {number} lod23HouseProperty.lod - The LOD level, set to 23, which provides the
	 *  highest level of detail possible for individual house properties. This level enables the
	 *  visualization of extremely fine and minute details that are critical for in-depth analysis and
	 *  planning at the individual property level.
	 * @property {number} lod23HouseProperty.scale - The scale for images at this LOD level.
	 *  This value defines the map scale at which one screen pixel equates to imageScale
	 *  map units, enabling the most detailed and precise imagery achievable for a house and
	 *  its immediate surroundings.
	 */
	lod23HouseProperty: { lod: 23, scale: 70.5310735 },
});
