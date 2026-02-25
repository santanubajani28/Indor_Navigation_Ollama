
import type { CampusData, NavigationGraph, NavGraphNode, NavGraphEdge, Unit } from '../types';
import { UnitType, DetailType } from '../types';
import { getPolygonCenter, findSharedEdge, getEuclideanDistance } from '../utils/geometry';
import type { Point } from '../types';

/**
 * Generates a navigation graph using the correct indoor routing logic:
 *
 *  Unit centroid  →  door/opening node (shared edge midpoint)  →  corridor centroid
 *  →  (more corridors / stair / elevator nodes)  →  door/opening node  →  Unit centroid
 *
 * Key design decisions:
 * - All non-RESTRICTED units are traversable (accessible defaults to true in parser).
 * - Rooms (CLASSROOM, OFFICE, etc.) connect to corridors/entrances via a "door node"
 *   placed at the midpoint of the shared polygon edge between them.
 * - Navigable transit spaces (CORRIDOR, ENTRANCE) connect directly centroid-to-centroid.
 * - STAIRS and ELEVATORS provide vertical connections between floors via verticalConnectorId.
 */
export const generateNavigationGraph = (data: CampusData): NavigationGraph => {
  const nodes: NavGraphNode[] = [];
  const edges: Record<string, NavGraphEdge[]> = {};

  const addEdge = (nodeAId: string, nodeBId: string, weight: number, type: 'horizontal' | 'vertical') => {
    if (!edges[nodeAId]) edges[nodeAId] = [];
    if (!edges[nodeBId]) edges[nodeBId] = [];
    edges[nodeAId].push({ from: nodeAId, to: nodeBId, weight, type });
    edges[nodeBId].push({ from: nodeBId, to: nodeAId, weight, type });
  };

  // Include ALL non-RESTRICTED units. We do NOT rely on the `accessible` flag because:
  // 1. The flag defaults to false when the Access shapefile field is absent
  // 2. Existing DB data has accessible=0 for all units uploaded before the parser fix
  // Transit spaces (CORRIDOR, ENTRANCE, STAIRS, ELEVATOR) are always traversable.
  // Destination rooms (CLASSROOM, OFFICE, etc.) are also traversable — they're the endpoints.
  // Only RESTRICTED spaces are excluded.
  const traversableUnits = data.units.filter(u => u.type !== UnitType.RESTRICTED);

  // ── STEP 2: Create a centroid node for every traversable unit ──────────────
  for (const unit of traversableUnits) {
    nodes.push({
      id: unit.id,
      type: 'center',
      point: getPolygonCenter(unit.polygon),
      levelId: unit.levelId,
      originalUnitId: unit.id,
      unitType: unit.type,
    });
  }

  // ── STEP 3: Same-level connections ────────────────────────────────────────
  // For each pair of adjacent units on the same level, create edges.
  // If both are transit spaces → direct centroid-to-centroid.
  // If at least one is a room → route via a "door node" on the shared edge.
  const transitTypes = new Set([
    UnitType.CORRIDOR,
    UnitType.STAIRS,
    UnitType.ELEVATOR,
    UnitType.ENTRANCE,
  ]);
  for (let i = 0; i < traversableUnits.length; i++) {
    for (let j = i + 1; j < traversableUnits.length; j++) {
      const unitA = traversableUnits[i];
      const unitB = traversableUnits[j];

      if (unitA.levelId !== unitB.levelId) continue;

      const sharedEdge = findSharedEdge(unitA.polygon, unitB.polygon);
      if (!sharedEdge) continue;

      const centerA = getPolygonCenter(unitA.polygon);
      const centerB = getPolygonCenter(unitB.polygon);

      const isATransit = transitTypes.has(unitA.type);
      const isBTransit = transitTypes.has(unitB.type);

      if (isATransit && isBTransit) {
        // Both are transit spaces: direct centroid connection
        addEdge(unitA.id, unitB.id, getEuclideanDistance(centerA, centerB), 'horizontal');
      } else {
        // At least one is a destination room: route via a door node
        // The door node sits at the midpoint of the shared polygon edge,
        // representing the doorway opening between the two spaces.
        const doorMidpoint: Point = {
          x: (sharedEdge[0].x + sharedEdge[1].x) / 2,
          y: (sharedEdge[0].y + sharedEdge[1].y) / 2,
        };

        // Use a stable, deterministic ID so we don't create duplicate door nodes
        const doorNodeId = `door-${[unitA.id, unitB.id].sort().join('--')}`;

        if (!nodes.find(n => n.id === doorNodeId)) {
          nodes.push({
            id: doorNodeId,
            type: 'waypoint',
            point: doorMidpoint,
            levelId: unitA.levelId,
            originalUnitId: isATransit ? unitB.id : unitA.id,
            unitType: undefined,
          });
        }

        // Unit A centroid → door node
        addEdge(unitA.id, doorNodeId, getEuclideanDistance(centerA, doorMidpoint), 'horizontal');
        // Door node → Unit B centroid
        addEdge(doorNodeId, unitB.id, getEuclideanDistance(doorMidpoint, centerB), 'horizontal');
      }
    }
  }

  // ── STEP 4: Vertical connections (Stairs / Elevators) ─────────────────────
  // Group stair/elevator units by their verticalConnectorId and link them
  // sequentially floor by floor.
  const verticalConnectors = new Map<string, Unit[]>();
  traversableUnits.forEach(unit => {
    if ((unit.type === UnitType.STAIRS || unit.type === UnitType.ELEVATOR) && unit.verticalConnectorId) {
      if (!verticalConnectors.has(unit.verticalConnectorId)) {
        verticalConnectors.set(unit.verticalConnectorId, []);
      }
      verticalConnectors.get(unit.verticalConnectorId)?.push(unit);
    }
  });

  verticalConnectors.forEach(units => {
    const sortedUnits = units.sort((a, b) => {
      const levelA = data.levels.find(l => l.id === a.levelId)?.zIndex ?? 0;
      const levelB = data.levels.find(l => l.id === b.levelId)?.zIndex ?? 0;
      return levelA - levelB;
    });

    for (let i = 0; i < sortedUnits.length - 1; i++) {
      const unitA = sortedUnits[i];
      const unitB = sortedUnits[i + 1];
      const centerA = getPolygonCenter(unitA.polygon);
      const centerB = getPolygonCenter(unitB.polygon);
      // Add a fixed penalty to vertical travel to prefer horizontal routes when possible
      const weight = getEuclideanDistance(centerA, centerB) + 0.002; // ~220m equivalent penalty
      addEdge(unitA.id, unitB.id, weight, 'vertical');
    }
  });

  // ── STEP 5: Fallback proximity connections ─────────────────────────────────
  // If a traversable unit has NO edges after the shared-edge pass (completely
  // disconnected), try connecting it to the nearest unit on the same level.
  // This handles cases where GIS data has gaps/mismatches between adjacent polygons.
  const unitIds = new Set(traversableUnits.map(u => u.id));
  const isolatedUnits = traversableUnits.filter(u => {
    const unitEdges = edges[u.id] || [];
    return unitEdges.length === 0;
  });

  for (const isolated of isolatedUnits) {
    const isolatedCenter = getPolygonCenter(isolated.polygon);
    let nearestDist = Infinity;
    let nearestUnit: Unit | null = null;

    for (const candidate of traversableUnits) {
      if (candidate.id === isolated.id) continue;
      if (candidate.levelId !== isolated.levelId) continue;
      const dist = getEuclideanDistance(isolatedCenter, getPolygonCenter(candidate.polygon));
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestUnit = candidate;
      }
    }

    if (nearestUnit) {
      // Only connect if within a reasonable proximity (0.005 degrees ≈ 500m)
      if (nearestDist < 0.005) {
        addEdge(isolated.id, nearestUnit.id, nearestDist, 'horizontal');
      }
    }
  }

  return { nodes, edges };
};
