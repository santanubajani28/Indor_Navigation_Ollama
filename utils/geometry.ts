
import type { Point, Polygon } from '../types';

// --- GEOMETRY HELPERS ---
// EPSILON for geometric comparisons.
// 1e-6 degrees ≈ 0.1m on the ground — appropriate for real-world GIS shapefile data
// which often has floating-point differences at shared vertices between adjacent polygons.
const EPSILON = 1e-6;

/**
 * Calculates the distance between two lat/lon points in meters using the Haversine formula.
 */
export const getHaversineDistance = (p1: Point, p2: Point): number => {
    if (Math.hypot(p1.x - p2.x, p1.y - p2.y) < EPSILON) return 0;
    const R = 6371e3; // metres
    const φ1 = p1.y * Math.PI / 180; // φ, λ in radians
    const φ2 = p2.y * Math.PI / 180;
    const Δφ = (p2.y - p1.y) * Math.PI / 180;
    const Δλ = (p2.x - p1.x) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // in metres
};

/**
 * Calculates the Euclidean distance between two points. Assumes a cartesian coordinate system.
 */
export const getEuclideanDistance = (p1: Point, p2: Point): number => {
    return Math.hypot(p2.x - p1.x, p2.y - p1.y);
};


/** Checks if a point `p` lies on the line segment defined by `a` and `b`. */
const isPointOnSegment = (p: Point, a: Point, b: Point): boolean => {
    const crossProduct = (p.y - a.y) * (b.x - a.x) - (p.x - a.x) * (b.y - a.y);
    if (Math.abs(crossProduct) > EPSILON) return false;

    const dotProduct = (p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y);
    if (dotProduct < 0) return false;

    const squaredLength = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
    if (dotProduct > squaredLength) return false;

    return true;
};

/** Checks if three points are collinear. */
const areCollinear = (p1: Point, p2: Point, p3: Point): boolean => {
    const crossProduct = (p2.y - p1.y) * (p3.x - p2.x) - (p2.x - p1.x) * (p3.y - p2.y);
    // Use a scaled epsilon to handle floating point issues with varying coordinate scales
    const dist1 = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const dist2 = Math.hypot(p3.x - p2.x, p3.y - p2.y);
    return Math.abs(crossProduct) < EPSILON * (dist1 + dist2);
};


/** Finds the exact shared line segment (edge) between two polygons. */
export const findSharedEdge = (poly1: Polygon, poly2: Polygon): [Point, Point] | null => {
    for (let i = 0; i < poly1.length; i++) {
        const p1 = poly1[i];
        const p2 = poly1[(i + 1) % poly1.length];

        for (let j = 0; j < poly2.length; j++) {
            const q1 = poly2[j];
            const q2 = poly2[(j + 1) % poly2.length];

            // A common case for shared edges in GIS data is that they are traversed in opposite directions.
            // Check for this fast-path case first.
            const p1_eq_q2 = Math.hypot(p1.x - q2.x, p1.y - q2.y) < EPSILON;
            const p2_eq_q1 = Math.hypot(p2.x - q1.x, p2.y - q1.y) < EPSILON;

            if (p1_eq_q2 && p2_eq_q1) {
                // The edges are identical but reversed, this is a perfect shared edge.
                return [p1, p2];
            }

            // If not a perfect reversed match, check for partial overlap on the same line.
            if (areCollinear(p1, p2, q1) && areCollinear(p1, p2, q2)) {
                const overlapPoints: Point[] = [];
                if (isPointOnSegment(p1, q1, q2)) overlapPoints.push(p1);
                if (isPointOnSegment(p2, q1, q2)) overlapPoints.push(p2);
                if (isPointOnSegment(q1, p1, p2)) overlapPoints.push(q1);
                if (isPointOnSegment(q2, p1, p2)) overlapPoints.push(q2);

                // Remove duplicate points that might result from vertices matching
                const uniqueKeys = new Set<string>();
                const uniquePoints = overlapPoints.filter(p => {
                    const key = `${p.x.toFixed(6)},${p.y.toFixed(6)}`;
                    if (uniqueKeys.has(key)) return false;
                    uniqueKeys.add(key);
                    return true;
                });

                if (uniquePoints.length >= 2) {
                    // Find the two points that are farthest apart, they define the shared segment.
                    let maxDist = -1;
                    let pStart: Point | null = null;
                    let pEnd: Point | null = null;

                    for (let k = 0; k < uniquePoints.length; k++) {
                        for (let l = k + 1; l < uniquePoints.length; l++) {
                            const dist = Math.hypot(uniquePoints[k].x - uniquePoints[l].x, uniquePoints[k].y - uniquePoints[l].y);
                            if (dist > maxDist) {
                                maxDist = dist;
                                pStart = uniquePoints[k];
                                pEnd = uniquePoints[l];
                            }
                        }
                    }
                    if (pStart && pEnd && maxDist > EPSILON) {
                        return [pStart, pEnd];
                    }
                }
            }
        }
    }
    return null;
};


export const getPolygonCenter = (polygon: Polygon): Point => {
    if (polygon.length === 0) return { x: 0, y: 0 };
    const center = polygon.reduce(
        (acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }),
        { x: 0, y: 0 }
    );
    center.x /= polygon.length;
    center.y /= polygon.length;
    return center;
};
