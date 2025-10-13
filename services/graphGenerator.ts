
import type { CampusData, NavigationGraph, NavGraphNode, Unit } from '../types';
import { UnitType } from '../types';
import { getPolygonCenter, findSharedEdge, getEuclideanDistance } from '../utils/geometry';

export const generateNavigationGraph = (data: CampusData): NavigationGraph => {
  const nodes: NavGraphNode[] = [];
  const edges: Record<string, { from: string; to: string; weight: number }[]> = {};
  
  const addEdge = (nodeAId: string, nodeBId: string, weight: number) => {
    if (!edges[nodeAId]) edges[nodeAId] = [];
    if (!edges[nodeBId]) edges[nodeBId] = [];
    edges[nodeAId].push({ from: nodeAId, to: nodeBId, weight });
    edges[nodeBId].push({ from: nodeBId, to: nodeAId, weight });
  };

  const traversableUnits = data.units.filter(u => u.accessible);

  // 1. Create a "center" node for every single traversable unit
  for (const unit of traversableUnits) {
    nodes.push({
      id: unit.id,
      type: 'center',
      point: getPolygonCenter(unit.polygon),
      levelId: unit.levelId,
      originalUnitId: unit.id,
    });
  }

  const navigableTypes = [UnitType.CORRIDOR, UnitType.STAIRS, UnitType.ELEVATOR, UnitType.ENTRANCE];
  const destinationTypes = [UnitType.CLASSROOM, UnitType.OFFICE, UnitType.RESTAURANT, UnitType.ENTRANCE];

  // 2. Create waypoint nodes and connect units to the navigable network
  for (const unitA of traversableUnits) {
    for (const unitB of traversableUnits) {
      if (unitA.id >= unitB.id) continue; // Avoid duplicate checks
      if (unitA.levelId !== unitB.levelId) continue;

      const isANavigable = navigableTypes.includes(unitA.type);
      const isBNavigable = navigableTypes.includes(unitB.type);
      const isADestination = destinationTypes.includes(unitA.type);
      const isBDestination = destinationTypes.includes(unitB.type);

      const sharedEdge = findSharedEdge(unitA.polygon, unitB.polygon);
      if (!sharedEdge) continue;

      // Case 1: Two navigable units are adjacent (e.g., corridor to corridor)
      if (isANavigable && isBNavigable) {
        const centerA = getPolygonCenter(unitA.polygon);
        const centerB = getPolygonCenter(unitB.polygon);
        const weight = getEuclideanDistance(centerA, centerB);
        addEdge(unitA.id, unitB.id, weight);
      }
      // Case 2: A destination unit is adjacent to a navigable unit (e.g., office to corridor)
      else if ((isADestination && isBNavigable) || (isBDestination && isANavigable)) {
        const destUnit = isADestination ? unitA : unitB;
        const navUnit = isANavigable ? unitA : unitB;

        const waypointId = `waypoint-${destUnit.id}-${navUnit.id}`;
        const midpoint = {
          x: (sharedEdge[0].x + sharedEdge[1].x) / 2,
          y: (sharedEdge[0].y + sharedEdge[1].y) / 2
        };
        
        // Add the waypoint node
        nodes.push({
          id: waypointId,
          type: 'waypoint',
          point: midpoint,
          levelId: destUnit.levelId,
          originalUnitId: destUnit.id,
        });

        // Connect destination center to its waypoint
        const destCenter = getPolygonCenter(destUnit.polygon);
        const weightToWaypoint = getEuclideanDistance(destCenter, midpoint);
        addEdge(destUnit.id, waypointId, weightToWaypoint);
        
        // Connect waypoint to the navigable unit's center
        const navCenter = getPolygonCenter(navUnit.polygon);
        const weightToNav = getEuclideanDistance(midpoint, navCenter);
        addEdge(waypointId, navUnit.id, weightToNav);
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
        // Vertical travel is heavily weighted to be less preferable than horizontal
        const weight = getEuclideanDistance(centerA, centerB) + 1000;
        addEdge(unitA.id, unitB.id, weight);
    }
  });


  return { nodes, edges };
};
