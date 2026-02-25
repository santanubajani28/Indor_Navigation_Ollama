import type { CampusData, Detail, Facility, Level, Point, Polygon, Unit, Site } from '../types';
import { UnitType, DetailType } from '../types';

// --- Type Declarations for External Libraries ---
declare const shp: {
    parseZip: (buffer: ArrayBuffer) => Promise<GeoJsonFeatureCollection | GeoJsonFeatureCollection[]>;
};
declare const geopackage: {
    open: (buffer: ArrayBuffer) => Promise<any>;
};
declare const JSZip: any;
declare const proj4: any;


// --- GeoJSON Interfaces (Simplified) ---
type GeoJsonProperties = { [key: string]: any };
interface GeoJsonFeature {
    type: 'Feature';
    geometry: {
        type: 'Polygon' | 'LineString';
        coordinates: number[][][] | number[][];
    } | null; // Allow geometry to be null
    properties: GeoJsonProperties;
}
interface GeoJsonFeatureCollection {
    type: 'FeatureCollection';
    features: GeoJsonFeature[];
}

// --- Case-Insensitive Property Helpers ---

/**
 * Gets a property from a GeoJSON properties object, ignoring case.
 * @param properties - The properties object.
 * @param key - The desired key (e.g., 'Unit_Id').
 * @returns The value of the property, or undefined if not found.
 */
const getPropertyCI = (properties: GeoJsonProperties, key: string): any => {
    if (!properties) return undefined;
    const lowerKey = key.toLowerCase();
    for (const propKey in properties) {
        if (propKey.toLowerCase() === lowerKey) {
            return properties[propKey];
        }
    }
    return undefined;
};

/**
 * Checks if a property exists in a GeoJSON properties object, ignoring case.
 * @param properties - The properties object.
 * @param key - The desired key.
 * @returns `true` if the property exists, otherwise `false`.
 */
const hasPropertyCI = (properties: GeoJsonProperties, key: string): boolean => {
    return getPropertyCI(properties, key) !== undefined;
};


// --- Core Transformation Logic ---

/**
 * Converts GeoJSON polygon coordinates to the app's internal Polygon format.
 * @param coordinates - The coordinate array from a GeoJSON geometry.
 * @returns A Polygon array of {x, y} points.
 */
const geoJsonPolygonToAppPolygon = (coordinates: number[][][]): Polygon => {
    if (!coordinates || !coordinates[0] || coordinates[0].length < 3) return [];
    // Use the exterior ring, ignore interior holes for simplicity.
    const ring = coordinates[0];
    // Remove the last point if it's identical to the first (GeoJSON standard).
    if (ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]) {
        ring.pop();
    }
    // Our app uses x for longitude, y for latitude
    return ring.map(([x, y]) => ({ x, y }));
};

/**
 * Converts GeoJSON line coordinates to the app's internal Point array format.
 * @param coordinates - The coordinate array from a GeoJSON LineString geometry.
 * @returns A Point array.
 */
const geoJsonLineToAppLine = (coordinates: number[][]): Point[] => {
    if (!coordinates || coordinates.length < 2) return [];
    // Our app uses x for longitude, y for latitude
    return coordinates.map(([x, y]) => ({ x, y }));
};


/**
 * Validates that a given value is a valid UnitType.
 * @param typeStr - The string to validate.
 * @returns The validated UnitType or throws an error.
 */
const validateUnitType = (typeStr: any): UnitType => {
    const upperType = String(typeStr).toUpperCase();
    if (Object.values(UnitType).includes(upperType as UnitType)) {
        return upperType as UnitType;
    }
    // Fallback for unknown types to be 'OFFICE' to avoid crashing.
    console.warn(`Invalid UnitType value found in data: "${typeStr}". Defaulting to OFFICE.`);
    return UnitType.OFFICE;
};

/**
 * Validates that a given value is a valid DetailType.
 * @param useType - The use type string from the data (e.g., 'Door-A', 'Wall-i').
 * @returns The mapped DetailType.
 */
const mapDetailType = (useType: string): DetailType => {
    const upperUseType = String(useType || '').toUpperCase();
    if (upperUseType.startsWith('DOOR')) {
        return DetailType.DOOR;
    }
    if (upperUseType.startsWith('WALL')) {
        return DetailType.WALL;
    }
    // Default fallback
    return DetailType.WALL;
}


// --- Public Parser Functions ---

/**
 * Parses a Shapefile (.zip buffer) containing multiple layers.
 * Builds a hierarchical campus model from Site, Facility, Level, Unit, and Details layers.
 * It also reprojects the data to WGS84 and determines the map's center.
 */
export const parseShapefile = async (buffer: ArrayBuffer): Promise<{ campusData: CampusData; mapOrigin: { lat: number; lon: number } }> => {
    // 1. Unzip and find .prj file for projection info
    const zip = await JSZip.loadAsync(buffer);
    const prjFile = Object.values(zip.files).find((f: any) => f.name.toLowerCase().endsWith('.prj'));
    let reproject: ((coords: number[]) => number[]) | null = null;

    if (prjFile) {
        // FIX: The type of `prjFile` is `unknown` because `Object.values` on an `any` type returns `unknown[]`. Cast to `any` to access the `async` method.
        const prjText = await (prjFile as any).async('string');
        const epsgMatch = prjText.match(/AUTHORITY\["EPSG","(\d+)"\]/);
        if (epsgMatch && epsgMatch[1]) {
            const epsgCode = epsgMatch[1];
            if (epsgCode !== '4326') {
                const sourceProj = `EPSG:${epsgCode}`;
                const destProj = 'EPSG:4326'; // WGS84
                try {
                    // proj4(from, to)
                    reproject = proj4(sourceProj, destProj).forward;
                    console.log(`Reprojecting from ${sourceProj} to ${destProj}`);
                } catch (e) {
                    console.warn(`Could not create projection from ${sourceProj}. May need proj definitions. Falling back to no reprojection. Error:`, e);
                }
            }
        } else {
            console.warn("Could not find EPSG code in .prj file. Assuming WGS84 coordinates.");
        }
    } else {
        console.warn("No .prj file found in zip archive. Assuming WGS84 coordinates.");
    }

    // 2. Parse the shapefile zip into GeoJSON features
    const geojsonResults = await shp.parseZip(buffer);
    if (!geojsonResults) {
        throw new Error('Could not parse Shapefile zip. Ensure it is a valid zip file.');
    }

    const featureCollections = Array.isArray(geojsonResults) ? geojsonResults : [geojsonResults];
    const allFeatures = featureCollections.flatMap(fc => fc.features).filter(f => f && f.geometry);

    // 3. Reproject coordinates if necessary
    if (reproject) {
        allFeatures.forEach(feature => {
            if (feature.geometry) {
                if (feature.geometry.type === 'Polygon') {
                    feature.geometry.coordinates = feature.geometry.coordinates.map(ring =>
                        ring.map(point => reproject!(point))
                    );
                } else if (feature.geometry.type === 'LineString') {
                    feature.geometry.coordinates = feature.geometry.coordinates.map(point => reproject!(point));
                }
            }
        });
    }

    // 4. Process reprojected features into the application's data structure
    const sites: Site[] = [];
    const facilities: Facility[] = [];
    const levels: Level[] = [];
    const units: Unit[] = [];
    const details: Detail[] = [];

    const seenSiteIds = new Set<string>();
    const seenFacilityIds = new Set<string>();
    const seenLevelIds = new Set<string>();
    const seenUnitIds = new Set<string>();
    const seenDetailIds = new Set<string>();

    let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;

    for (const feature of allFeatures) {
        const p = feature.properties;

        if (hasPropertyCI(p, 'Details_Id')) {
            const detailsId = String(getPropertyCI(p, 'Details_Id'));
            if (seenDetailIds.has(detailsId)) continue;
            seenDetailIds.add(detailsId);
            const useType = String(getPropertyCI(p, 'Use_Type'));
            details.push({
                id: detailsId,
                levelId: String(getPropertyCI(p, 'Level_Id')),
                type: mapDetailType(useType),
                useType: useType,
                height: Number(getPropertyCI(p, 'Height_Rel')) || undefined,
                line: geoJsonLineToAppLine(feature.geometry!.coordinates as number[][]),
                datasetId: 0,
            });

        } else if (hasPropertyCI(p, 'Unit_Id')) {
            const unitId = String(getPropertyCI(p, 'Unit_Id'));
            if (seenUnitIds.has(unitId)) continue;
            seenUnitIds.add(unitId);
            const accessibility = getPropertyCI(p, 'Access');
            units.push({
                id: unitId,
                name: String(getPropertyCI(p, 'Disp_Name') || `Unit ${unitId}`),
                type: validateUnitType(getPropertyCI(p, 'Unit_Type')),
                levelId: String(getPropertyCI(p, 'Level_Id')),
                polygon: geoJsonPolygonToAppPolygon(feature.geometry!.coordinates as number[][][]),
                // Default to accessible when Access field is missing.
                // Only mark as not accessible when explicitly set to 0 or '0'.
                accessible: accessibility === undefined || accessibility === null
                    ? true
                    : (accessibility === 1 || String(accessibility) === '1'),
                verticalConnectorId: getPropertyCI(p, 'v_conn_id') ? String(getPropertyCI(p, 'v_conn_id')) : undefined,
                datasetId: 0,
            });

        } else if (hasPropertyCI(p, 'Level_Id')) {
            const levelId = String(getPropertyCI(p, 'Level_Id'));
            if (seenLevelIds.has(levelId)) continue;
            seenLevelIds.add(levelId);
            levels.push({
                id: levelId,
                name: String(getPropertyCI(p, 'Level_Name') || `Level ${levelId}`),
                facilityId: String(getPropertyCI(p, 'Faci_Id')),
                zIndex: Number(getPropertyCI(p, 'Z_Index') || 0),
                polygon: geoJsonPolygonToAppPolygon(feature.geometry!.coordinates as number[][][]),
                datasetId: 0,
            });

        } else if (hasPropertyCI(p, 'Faci_Id')) {
            const faciId = String(getPropertyCI(p, 'Faci_Id'));
            if (seenFacilityIds.has(faciId)) continue;
            seenFacilityIds.add(faciId);
            facilities.push({
                id: faciId,
                name: String(getPropertyCI(p, 'Faci_Name') || `Facility ${faciId}`),
                siteId: String(getPropertyCI(p, 'Site_Id')),
                polygon: geoJsonPolygonToAppPolygon(feature.geometry!.coordinates as number[][][]),
                datasetId: 0,
            });

        } else if (hasPropertyCI(p, 'Site_Id')) {
            const siteId = String(getPropertyCI(p, 'Site_Id'));
            if (seenSiteIds.has(siteId)) continue;
            seenSiteIds.add(siteId);
            const polygon = geoJsonPolygonToAppPolygon(feature.geometry!.coordinates as number[][][]);
            sites.push({
                id: siteId,
                name: String(getPropertyCI(p, 'Site_Name') || `Site ${siteId}`),
                polygon,
                datasetId: 0,
            });
            // Update geographic bounds from site polygons
            polygon.forEach(point => {
                minLon = Math.min(minLon, point.x);
                maxLon = Math.max(maxLon, point.x);
                minLat = Math.min(minLat, point.y);
                maxLat = Math.max(maxLat, point.y);
            });
        }
    }

    if (units.length === 0) {
        throw new Error('Could not find any features with the "Unit_Id" attribute. Please ensure your Unit shapefile is present and has the correct attributes.');
    }
    if (levels.length === 0) {
        throw new Error('Could not find any features with the "Level_Id" attribute that were not also Units or Details. Please ensure your Level shapefile is present and has the correct attributes.');
    }

    // 5. Calculate map origin
    let mapOrigin: { lat: number, lon: number };
    if (isFinite(minLon) && isFinite(minLat)) {
        mapOrigin = {
            lon: minLon + (maxLon - minLon) / 2,
            lat: minLat + (maxLat - minLat) / 2,
        };
    } else {
        // Fallback if no sites or valid coordinates were found
        mapOrigin = { lat: 40.7128, lon: -74.0060 };
        console.warn("Could not determine map origin from Site layer. Defaulting to NYC.");
    }

    const campusData = { sites, facilities, levels, units, details };
    return { campusData, mapOrigin };
};

/**
 * Parses a GeoPackage buffer, expecting 'facilities', 'levels', and 'units' tables.
 */
export const parseGeoPackage = async (buffer: ArrayBuffer): Promise<CampusData> => {
    const gpkg = await geopackage.open(buffer);

    const requiredTables = ['facilities', 'levels', 'units'];
    const tables = gpkg.getFeatureTables();
    if (!requiredTables.every(t => tables.includes(t))) {
        throw new Error(`GeoPackage must contain feature tables named: ${requiredTables.join(', ')}.`);
    }

    const facilities: Facility[] = [];
    for (const feature of gpkg.iterateGeoJSONFeatures('facilities')) {
        if (!feature || !feature.geometry) continue; // Skip features with null geometry
        const p = feature.properties;
        facilities.push({
            id: String(p.id || p.ID),
            name: String(p.name || p.NAME),
            polygon: geoJsonPolygonToAppPolygon(feature.geometry.coordinates as number[][][]),
            datasetId: 0,
        });
    }

    const levels: Level[] = [];
    for (const feature of gpkg.iterateGeoJSONFeatures('levels')) {
        if (!feature || !feature.geometry) continue; // Skip features with null geometry
        const p = feature.properties;
        levels.push({
            id: String(p.id || p.ID),
            name: String(p.name || p.NAME),
            facilityId: String(p.facilityId),
            zIndex: Number(p.zIndex || 0),
            polygon: geoJsonPolygonToAppPolygon(feature.geometry.coordinates as number[][][]),
            datasetId: 0,
        });
    }

    const units: Unit[] = [];
    for (const feature of gpkg.iterateGeoJSONFeatures('units')) {
        if (!feature || !feature.geometry) continue; // Skip features with null geometry
        const p = feature.properties;
        units.push({
            id: String(p.id || p.ID),
            name: String(p.name || p.NAME),
            type: validateUnitType(p.type || p.TYPE),
            levelId: String(p.levelId),
            polygon: geoJsonPolygonToAppPolygon(feature.geometry.coordinates as number[][][]),
            accessible: true, // Assume accessible if not specified in GPKG
            verticalConnectorId: p.v_conn_id ? String(p.v_conn_id) : undefined,
            datasetId: 0,
        });
    }

    // GeoPackage details are optional and would need to be handled similarly if present
    const details: Detail[] = [];
    if (tables.includes('details')) {
        for (const feature of gpkg.iterateGeoJSONFeatures('details')) {
            if (!feature || !feature.geometry) continue; // Skip features with null geometry
            const p = feature.properties;
            const useType = String(p.Use_Type || p.use_type);
            details.push({
                id: String(p.id || p.ID),
                levelId: String(p.levelId),
                type: mapDetailType(useType),
                useType: useType,
                height: Number(p.Height_Rel || p.height_rel) || undefined,
                line: geoJsonLineToAppLine(feature.geometry.coordinates as number[][]),
                datasetId: 0,
            });
        }
    }
    // Note: Reprojection and origin calculation for GeoPackage is not implemented in this version.
    return { sites: [], facilities, levels, units, details };
};

/**
 * Exports the application's campus data to a GeoJSON FeatureCollection object.
 * @param data The CampusData to export.
 * @returns A GeoJSON-compliant object.
 */
export const exportToGeoJson = (data: CampusData): object => {
    const features: GeoJsonFeature[] = [];

    const createPolygonFeature = (item: Site | Facility | Level | Unit, layerName: string) => {
        const { polygon, ...props } = item;
        const coords = polygon.map(p => [p.x, p.y]);
        if (coords.length > 2) {
            coords.push(coords[0]); // Close the polygon ring for valid GeoJSON
        }
        return {
            type: 'Feature' as const,
            geometry: {
                type: 'Polygon' as const,
                coordinates: [coords] // GeoJSON polygons are nested in an array
            },
            properties: { ...props, layer: layerName }
        };
    };

    const createLineStringFeature = (item: Detail, layerName: string) => {
        const { line, ...props } = item;
        const coords = line.map(p => [p.x, p.y]);
        return {
            type: 'Feature' as const,
            geometry: {
                type: 'LineString' as const,
                coordinates: coords
            },
            properties: { ...props, layer: layerName }
        };
    };

    data.sites.forEach(item => features.push(createPolygonFeature(item, 'sites')));
    data.facilities.forEach(item => features.push(createPolygonFeature(item, 'facilities')));
    data.levels.forEach(item => features.push(createPolygonFeature(item, 'levels')));
    data.units.forEach(item => features.push(createPolygonFeature(item, 'units')));
    data.details.forEach(item => features.push(createLineStringFeature(item, 'details')));

    return {
        type: 'FeatureCollection',
        features: features
    };
};