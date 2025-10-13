
import { useMemo } from 'react';
import type { CampusData, Graph, GraphEdge, GraphNode, Point, Polygon, Unit, Waypoint } from '../types';
import { AccessibilityFilter, UnitType } from '../types';

// --- GEOMETRY HELPERS ---
const EPSILON = 1e-9;

const getHaversineDistance = (p1: Point, p2: Point): number => {
    if (Math.hypot(p1.x - p2.x, p1.y - p2.y) < EPSILON) return 0;
    const R = 6371e3; // metres
    const φ1 = p1.y * Math.PI/180;
    const φ2 = p2.y * Math.PI/180;
    const Δφ = (p2.y-p1.y) * Math.PI/180;
    const Δλ = (p2.x-p1.x) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
};

const getEuclideanDistance = (p1: Point, p2: Point): number => {
    return Math.hypot(p2.x - p1.x, p2.y - p1.y);
};

const getPolygonCenter = (polygon: Polygon): Point => {
    if (polygon.length === 0) return { x: 0, y: 0 };
    const center = polygon.reduce(
        (acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }),
        { x: 0, y: 0 }
    );
    center.x /= polygon.length;
    center.y /= polygon.length;
    return center;
};

const isPointOnSegment = (p: Point, a: Point, b: Point): boolean => {
    const crossProduct = (p.y - a.y) * (b.x - a.x) - (p.x - a.x) * (b.y - a.y);
    if (Math.abs(crossProduct) > EPSILON) return false;
    const dotProduct = (p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y);
    if (dotProduct < 0) return false;
    const squaredLength = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
    if (dotProduct > squaredLength) return false;
    return true;
};

const areCollinear = (p1: Point, p2: Point, p3: Point): boolean => {
    const crossProduct = (p2.y - p1.y) * (p3.x - p2.x) - (p2.x - p1.x) * (p3.y - p2.y);
    const dist1 = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const dist2 = Math.hypot(p3.x - p2.x, p3.y - p2.y);
    return Math.abs(crossProduct) < EPSILON * (dist1 + dist2);
};

const findSharedEdge = (poly1: Polygon, poly2: Polygon): [Point, Point] | null => {
    for (let i = 0; i < poly1.length; i++) {
        const p1 = poly1[i];
        const p2 = poly1[(i + 1) % poly1.length];
        for (let j = 0; j < poly2.length; j++) {
            const q1 = poly2[j];
            const q2 = poly2[(j + 1) % poly2.length];
            const p1_eq_q2 = Math.hypot(p1.x - q2.x, p1.y - q2.y) < EPSILON;
            const p2_eq_q1 = Math.hypot(p2.x - q1.x, p2.y - q1.y) < EPSILON;
            if (p1_eq_q2 && p2_eq_q1) return [p1, p2];
            if (areCollinear(p1, p2, q1) && areCollinear(p1, p2, q2)) {
                const overlapPoints: Point[] = [];
                if (isPointOnSegment(p1, q1, q2)) overlapPoints.push(p1);
                if (isPointOnSegment(p2, q1, q2)) overlapPoints.push(p2);
                if (isPointOnSegment(q1, p1, p2)) overlapPoints.push(q1);
                if (isPointOnSegment(q2, p1, p2)) overlapPoints.push(q2);
                const uniqueKeys = new Set<string>();
                const uniquePoints = overlapPoints.filter(p => {
                    const key = `${p.x.toFixed(6)},${p.y.toFixed(6)}`;
                    if (uniqueKeys.has(key)) return false;
                    uniqueKeys.add(key);
                    return true;
                });
                if (uniquePoints.length >= 2) {
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
                    if (pStart && pEnd && maxDist > EPSILON) return [pStart, pEnd];
                }
            }
        }
    }
    return null;
};

const buildGraph = (data: CampusData): Graph => {
    const nodes = new Map<string, GraphNode>();
    const edges = new Map<string, GraphEdge[]>();

    const addEdge = (from: string, to: string, weight: number, type: 'horizontal' | 'vertical') => {
        if (!edges.has(from)) edges.set(from, []);
        edges.get(from)!.push({ from, to, weight, type });
    };

    data.units.forEach(unit => {
        if (unit.accessible) {
            nodes.set(unit.id, { id: unit.id, unit });
        }
    });

    const unitsByLevel = new Map<string, Unit[]>();
    data.units.forEach(u => {
        if (!u.accessible) return;
        if (!unitsByLevel.has(u.levelId)) unitsByLevel.set(u.levelId, []);
        unitsByLevel.get(u.levelId)!.push(u);
    });

    const transitionalTypes = [UnitType.CORRIDOR, UnitType.STAIRS, UnitType.ELEVATOR, UnitType.ENTRANCE];
    unitsByLevel.forEach(unitsOnLevel => {
        for (let i = 0; i < unitsOnLevel.length; i++) {
            for (let j = i + 1; j < unitsOnLevel.length; j++) {
                const unitA = unitsOnLevel[i];
                const unitB = unitsOnLevel[j];
                const isTransitionalLink = transitionalTypes.includes(unitA.type) || transitionalTypes.includes(unitB.type);
                if (!isTransitionalLink) continue;

                if (findSharedEdge(unitA.polygon, unitB.polygon)) {
                    const centerA = getPolygonCenter(unitA.polygon);
                    const centerB = getPolygonCenter(unitB.polygon);
                    const weight = getEuclideanDistance(centerA, centerB);
                    addEdge(unitA.id, unitB.id, weight, 'horizontal');
                    addEdge(unitB.id, unitA.id, weight, 'horizontal');
                }
            }
        }
    });

    const verticalConnectors = new Map<string, Unit[]>();
    data.units.forEach(unit => {
        if (unit.accessible && unit.verticalConnectorId && (unit.type === UnitType.STAIRS || unit.type === UnitType.ELEVATOR)) {
            if (!verticalConnectors.has(unit.verticalConnectorId)) verticalConnectors.set(unit.verticalConnectorId, []);
            verticalConnectors.get(unit.verticalConnectorId)!.push(unit);
        }
    });

    verticalConnectors.forEach(units => {
        units.sort((a, b) => (data.levels.find(l => l.id === a.levelId)?.zIndex ?? 0) - (data.levels.find(l => l.id === b.levelId)?.zIndex ?? 0));
        for (let i = 0; i < units.length - 1; i++) {
            const unitA = units[i];
            const unitB = units[i + 1];
            const weight = 1000;
            addEdge(unitA.id, unitB.id, weight, 'vertical');
            addEdge(unitB.id, unitA.id, weight, 'vertical');
        }
    });

    return { nodes, edges };
};

const findShortestPath = (graph: Graph, startId: string, endId: string, filter: AccessibilityFilter): string[] | null => {
    const distances: Record<string, number> = {};
    const previous: Record<string, string | null> = {};
    const queue = new Set<string>();

    graph.nodes.forEach(node => {
        distances[node.id] = Infinity;
        previous[node.id] = null;
        queue.add(node.id);
    });
    distances[startId] = 0;

    while (queue.size > 0) {
        let u: string | null = null;
        for (const id of queue) {
            if (u === null || distances[id] < distances[u!]) u = id;
        }
        if (u === null || u === endId) break;
        queue.delete(u!);
        
        const uNode = graph.nodes.get(u!);
        if (!uNode) continue;

        (graph.edges.get(u!) || []).forEach(edge => {
            const vNode = graph.nodes.get(edge.to);
            if (!vNode) return;
            
            if (filter === AccessibilityFilter.ELEVATOR_ONLY && edge.type === 'vertical') {
                if (uNode.unit.type !== UnitType.ELEVATOR || vNode.unit.type !== UnitType.ELEVATOR) {
                    return;
                }
            }
            const alt = distances[u!] + edge.weight;
            if (alt < distances[edge.to]) {
                distances[edge.to] = alt;
                previous[edge.to] = u;
            }
        });
    }

    const path: string[] = [];
    let current: string | null = endId;
    while (current) {
        path.unshift(current);
        if (distances[current] === Infinity) return null;
        current = previous[current];
    }
    return path[0] === startId ? path : null;
};

export const useGraph = (data: CampusData) => {
    const graph = useMemo(() => buildGraph(data), [data]);

    const getPath = (startId: string, endId: string, filter: AccessibilityFilter): string[] | null => {
        if (!startId || !endId || !graph.nodes.has(startId) || !graph.nodes.has(endId)) return null;
        return findShortestPath(graph, startId, endId, filter);
    };

    const getPathWaypoints = (path: string[]): Waypoint[] => {
        if (!path) return [];
        return path.map(unitId => {
            const unit = graph.nodes.get(unitId)?.unit;
            if (!unit) return null;
            return { point: getPolygonCenter(unit.polygon), levelId: unit.levelId };
        }).filter((wp): wp is Waypoint => !!wp);
    };

    const calculatePathDistance = (waypoints: Waypoint[]): number => {
        let distance = 0;
        for (let i = 0; i < waypoints.length - 1; i++) {
            if (waypoints[i].levelId === waypoints[i+1].levelId) {
                distance += getHaversineDistance(waypoints[i].point, waypoints[i+1].point);
            }
        }
        return distance;
    };

    return { graph, getPath, getPathWaypoints, calculatePathDistance };
};
