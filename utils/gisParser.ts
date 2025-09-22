import type { CampusData, Facility, Level, Point, Polygon, Unit } from '../types';
import { UnitType } from '../types';

// --- Type Declarations for External Libraries ---
declare const shp: {
  parseZip: (buffer: ArrayBuffer) => Promise<GeoJsonFeatureCollection>;
};
declare const geopackage: {
  open: (buffer: ArrayBuffer) => Promise<any>;
};

// --- GeoJSON Interfaces (Simplified) ---
type GeoJsonProperties = { [key: string]: any };
interface GeoJsonFeature {
  type: 'Feature';
  geometry: {
    type: 'Polygon';
    coordinates: number[][][]; // [[[x, y], [x, y], ...]]
  };
  properties: GeoJsonProperties;
}
interface GeoJsonFeatureCollection {
    type: 'FeatureCollection';
    features: GeoJsonFeature[];
}


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
  return ring.map(([x, y]) => ({ x, y }));
};

/**
 * Creates a rectangular polygon that represents the bounding box of a set of polygons.
 * @param polygons - An array of polygons to enclose.
 * @returns A new polygon representing the bounding box.
 */
const getBoundingBox = (polygons: Polygon[]): Polygon => {
    if (polygons.length === 0) return [];
    const allPoints = polygons.flat();
    if (allPoints.length === 0) return [];

    const minX = Math.min(...allPoints.map(p => p.x));
    const minY = Math.min(...allPoints.map(p => p.y));
    const maxX = Math.max(...allPoints.map(p => p.x));
    const maxY = Math.max(...allPoints.map(p => p.y));

    return [
        { x: minX - 10, y: minY - 10 },
        { x: maxX + 10, y: minY - 10 },
        { x: maxX + 10, y: maxY + 10 },
        { x: minX - 10, y: maxY + 10 },
    ];
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
    throw new Error(`Invalid UnitType value found in data: "${typeStr}"`);
};


// --- Public Parser Functions ---

/**
 * Parses a Shapefile (.zip buffer) containing a 'units' layer.
 * Generates facilities and levels based on unit attributes.
 */
export const parseShapefile = async (buffer: ArrayBuffer): Promise<CampusData> => {
    const geojson = await shp.parseZip(buffer);
    if (!geojson || !Array.isArray(geojson.features)) {
        throw new Error('Could not parse Shapefile. Ensure it contains a valid polygon layer.');
    }

    // FIX: Use a temporary type to hold facilityId from the shapefile, as it's needed
    // for processing but is not part of the final Unit model. This resolves type errors
    // when trying to access facilityId on unit objects.
    type UnitWithFacilityId = Unit & { facilityId: string };

    const unitsWithFacility: UnitWithFacilityId[] = geojson.features.map((feature: GeoJsonFeature, index: number) => {
        const p = feature.properties;
        if (!p.id && !p.ID) p.id = `unit-${index}`;
        if (!p.levelId || !p.facilityId) {
            throw new Error('Shapefile attributes must include "levelId" and "facilityId" for each unit.');
        }
        return {
            id: String(p.id || p.ID),
            name: String(p.name || p.NAME || `Unit ${p.id}`),
            type: validateUnitType(p.type || p.TYPE),
            levelId: String(p.levelId),
            polygon: geoJsonPolygonToAppPolygon(feature.geometry.coordinates),
            verticalConnectorId: p.v_conn_id ? String(p.v_conn_id) : undefined,
            facilityId: String(p.facilityId),
        };
    });

    const units: Unit[] = unitsWithFacility;

    const levelsMap = new Map<string, Level>();
    const facilitiesMap = new Map<string, Facility>();

    for (const unit of unitsWithFacility) {
        if (!levelsMap.has(unit.levelId)) {
            const levelUnits = unitsWithFacility.filter(u => u.levelId === unit.levelId);
            levelsMap.set(unit.levelId, {
                id: unit.levelId,
                name: `Level ${unit.levelId}`,
                facilityId: String(levelUnits[0].facilityId),
                zIndex: parseInt(unit.levelId.replace(/\D/g, ''), 10) || 0,
                polygon: getBoundingBox(levelUnits.map(u => u.polygon)),
            });
        }
        // FIX: Directly use the facilityId from the enriched unit object, which is more efficient and correct.
        const facilityId = unit.facilityId;
         if (facilityId && !facilitiesMap.has(facilityId)) {
            // FIX: Filter the enriched units list to correctly build facilities.
            const facilityUnits = unitsWithFacility.filter(u => String(u.facilityId) === facilityId);
            facilitiesMap.set(facilityId, {
                id: facilityId,
                name: `Facility ${facilityId}`,
                polygon: getBoundingBox(facilityUnits.map(u => u.polygon)),
            });
        }
    }

    return {
        units,
        levels: Array.from(levelsMap.values()),
        facilities: Array.from(facilitiesMap.values()),
    };
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
        const p = feature.properties;
        facilities.push({
            id: String(p.id || p.ID),
            name: String(p.name || p.NAME),
            polygon: geoJsonPolygonToAppPolygon(feature.geometry.coordinates),
        });
    }

    const levels: Level[] = [];
    for (const feature of gpkg.iterateGeoJSONFeatures('levels')) {
        const p = feature.properties;
        levels.push({
            id: String(p.id || p.ID),
            name: String(p.name || p.NAME),
            facilityId: String(p.facilityId),
            zIndex: Number(p.zIndex || 0),
            polygon: geoJsonPolygonToAppPolygon(feature.geometry.coordinates),
        });
    }

    const units: Unit[] = [];
    for (const feature of gpkg.iterateGeoJSONFeatures('units')) {
        const p = feature.properties;
        units.push({
            id: String(p.id || p.ID),
            name: String(p.name || p.NAME),
            type: validateUnitType(p.type || p.TYPE),
            levelId: String(p.levelId),
            polygon: geoJsonPolygonToAppPolygon(feature.geometry.coordinates),
            verticalConnectorId: p.v_conn_id ? String(p.v_conn_id) : undefined,
        });
    }

    return { facilities, levels, units };
};
