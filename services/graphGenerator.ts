
import type { CampusData, NavigationGraph, NavGraphNode, NavGraphEdge, Unit } from '../types';
import { UnitType } from '../types';
import { getPolygonCenter, findSharedEdge, getEuclideanDistance } from '../utils/geometry';

export const generateNavigationGraph = (data: CampusData): NavigationGraph => {
  const nodes: NavGraphNode[] = [];
  const edges: Record<string, NavGraphEdge[]> = {};
  
  const addEdge = (nodeAId: string, nodeBId: string, weight: number, type: 'horizontal' | 'vertical') => {
    if (!edges[nodeAId]) edges[nodeAId] = [];
    if (!edges[nodeBId]) edges[nodeBId] = [];
    edges[nodeAId].push({ from: nodeAId, to: nodeBId, weight, type });
    edges[nodeBId].push({ from: nodeBId, to: nodeAId, weight, type });
  };

  // Only include units that are marked as accessible (physically walkable)
  const traversableUnits = data.units.filter(u => u.accessible);

  // 1. Create a "center" node for every single traversable unit
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

  // Define types that are primarily for transit.
  // Note: We allow connections between ANY adjacent accessible units, 
  // but the connection style (direct vs waypoint) depends on type.
  const navigableTypes = new Set([
    UnitType.CORRIDOR, 
    UnitType.STAIRS, 
    UnitType.ELEVATOR, 
    UnitType.ENTRANCE
  ]);

  // 2. Connect units on the same level based on adjacency
  for (let i = 0; i < traversableUnits.length; i++) {
    for (let j = i + 1; j < traversableUnits.length; j++) {
      const unitA = traversableUnits[i];
      const unitB = traversableUnits[j];
      
      if (unitA.levelId !== unitB.levelId) continue;

      const sharedEdge = findSharedEdge(unitA.polygon, unitB.polygon);
      if (!sharedEdge) continue;

      const isANavigable = navigableTypes.has(unitA.type);
      const isBNavigable = navigableTypes.has(unitB.type);

      // If both are purely navigable spaces (e.g. Corridor to Corridor),
      // connect centers directly for a simpler graph and smoother path.
      if (isANavigable && isBNavigable) {
        const centerA = getPolygonCenter(unitA.polygon);
        const centerB = getPolygonCenter(unitB.polygon);
        const weight = getEuclideanDistance(centerA, centerB);
        addEdge(unitA.id, unitB.id, weight, 'horizontal');
      } else {
        // If one or both are rooms/destinations (e.g. Corridor to Classroom, or Classroom to Office),
        // connect them via a waypoint on the shared edge.
        // This ensures the path enters/exits through the "door" (shared edge) rather than clipping walls.
        const waypointId = `waypoint-${unitA.id}-${unitB.id}`;
        
        // Check if waypoint node already exists to avoid duplicates
        let waypointNode = nodes.find(n => n.id === waypointId);
        
        if (!waypointNode) {
            const midpoint = {
              x: (sharedEdge[0].x + sharedEdge[1].x) / 2,
              y: (sharedEdge[0].y + sharedEdge[1].y) / 2
            };

            waypointNode = {
                id: waypointId,
                type: 'waypoint',
                point: midpoint,
                levelId: unitA.levelId,
                originalUnitId: unitA.id, // Associates loosely with one of the units
                unitType: undefined 
            };
            nodes.push(waypointNode);
        }

        // Connect Unit A -> Waypoint
        const centerA = getPolygonCenter(unitA.polygon);
        const weightA = getEuclideanDistance(centerA, waypointNode.point);
        addEdge(unitA.id, waypointId, weightA, 'horizontal');
        
        // Connect Waypoint -> Unit B
        const centerB = getPolygonCenter(unitB.polygon);
        const weightB = getEuclideanDistance(waypointNode.point, centerB);
        addEdge(waypointId, unitB.id, weightB, 'horizontal');
      }
    }
  }

  // 3. Vertical connections (stairs/elevators)
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
    // Sort units by their level's zIndex to connect them sequentially
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
        // Vertical travel is weighted to be less preferable than short horizontal walks, 
        // but we don't want to discourage it too much if it's the only way.
        const weight = getEuclideanDistance(centerA, centerB) + 20; 
        addEdge(unitA.id, unitB.id, weight, 'vertical');
    }
  });


  return { nodes, edges };
};
