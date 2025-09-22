
import { useMemo } from 'react';
import type { CampusData, Unit, Graph, GraphNode, GraphEdge, Polygon, Point } from '../types';
import { UnitType, AccessibilityFilter } from '../types';

// Helper to check if two polygons are adjacent (share an edge of non-zero length)
const arePolygonsAdjacent = (poly1: Polygon, poly2: Polygon): boolean => {
  for (let i = 0; i < poly1.length; i++) {
    const p1 = poly1[i];
    const p2 = poly1[(i + 1) % poly1.length];

    for (let j = 0; j < poly2.length; j++) {
      const q1 = poly2[j];
      const q2 = poly2[(j + 1) % poly2.length];

      // Check for collinearity and overlap, ignoring single point touches.
      const isVertical = Math.abs(p1.x - p2.x) < 1e-9 && Math.abs(q1.x - q2.x) < 1e-9 && Math.abs(p1.x - q1.x) < 1e-9;
      const isHorizontal = Math.abs(p1.y - p2.y) < 1e-9 && Math.abs(q1.y - q2.y) < 1e-9 && Math.abs(p1.y - q1.y) < 1e-9;

      if (isVertical) {
        const p_min_y = Math.min(p1.y, p2.y);
        const p_max_y = Math.max(p1.y, p2.y);
        const q_min_y = Math.min(q1.y, q2.y);
        const q_max_y = Math.max(q1.y, q2.y);

        const overlap_start = Math.max(p_min_y, q_min_y);
        const overlap_end = Math.min(p_max_y, q_max_y);
        
        // If overlap length is greater than a tiny epsilon, they are adjacent.
        if (overlap_end > overlap_start) {
          return true;
        }
      }

      if (isHorizontal) {
        const p_min_x = Math.min(p1.x, p2.x);
        const p_max_x = Math.max(p1.x, p2.x);
        const q_min_x = Math.min(q1.x, q2.x);
        const q_max_x = Math.max(q1.x, q2.x);

        const overlap_start = Math.max(p_min_x, q_min_x);
        const overlap_end = Math.min(p_max_x, q_max_x);
        
        if (overlap_end > overlap_start) {
          return true;
        }
      }
    }
  }
  return false;
};

const getPolygonCenter = (polygon: Polygon): Point => {
    const center = polygon.reduce(
        (acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }),
        { x: 0, y: 0 }
    );
    center.x /= polygon.length;
    center.y /= polygon.length;
    return center;
};


const buildGraph = (data: CampusData): Graph => {
  const graph: Graph = {
    nodes: new Map(),
    edges: new Map(),
  };

  const traversableUnits = data.units.filter(u => u.type !== UnitType.RESTRICTED);

  traversableUnits.forEach(unit => {
    graph.nodes.set(unit.id, { id: unit.id, unit });
    graph.edges.set(unit.id, []);
  });
  
  const addEdge = (from: Unit, to: Unit, type: 'horizontal' | 'vertical') => {
      const existingEdge = graph.edges.get(from.id)?.find(e => e.to === to.id);
      if (existingEdge) return; // Avoid duplicate edges

      const center1 = getPolygonCenter(from.polygon);
      const center2 = getPolygonCenter(to.polygon);
      const weight = Math.hypot(center2.x-center1.x, center2.y-center1.y) + (type === 'vertical' ? 1000 : 0); // Add extra weight for vertical travel
      
      graph.edges.get(from.id)?.push({ from: from.id, to: to.id, weight, type });
      graph.edges.get(to.id)?.push({ from: to.id, to: from.id, weight, type });
  };

  const isTransitional = (type: UnitType) => [
      UnitType.CORRIDOR,
      UnitType.STAIRS,
      UnitType.ELEVATOR,
      UnitType.ENTRANCE
  ].includes(type);

  // Horizontal connections (adjacency)
  for (let i = 0; i < traversableUnits.length; i++) {
    for (let j = i + 1; j < traversableUnits.length; j++) {
      const unitA = traversableUnits[i];
      const unitB = traversableUnits[j];

      if (unitA.levelId === unitB.levelId && arePolygonsAdjacent(unitA.polygon, unitB.polygon)) {
          // Connect units if one of them is a transitional space (corridor, stairs, etc.)
          // This allows rooms to connect to corridors, but not to other rooms directly.
        if (isTransitional(unitA.type) || isTransitional(unitB.type)) {
          addEdge(unitA, unitB, 'horizontal');
        }
      }
    }
  }

  // Vertical connections (stairs/elevators)
  const verticalConnectors = new Map<string, Unit[]>();
  traversableUnits.forEach(unit => {
    if (unit.verticalConnectorId) {
      if (!verticalConnectors.has(unit.verticalConnectorId)) {
        verticalConnectors.set(unit.verticalConnectorId, []);
      }
      verticalConnectors.get(unit.verticalConnectorId)?.push(unit);
    }
  });

  verticalConnectors.forEach(units => {
    for (let i = 0; i < units.length; i++) {
      for (let j = i + 1; j < units.length; j++) {
        addEdge(units[i], units[j], 'vertical');
      }
    }
  });

  return graph;
};

const findShortestPath = (graph: Graph, startId: string, endId: string, filter: AccessibilityFilter): string[] | null => {
  const distances: Record<string, number> = {};
  const previous: Record<string, string | null> = {};
  const queue: Set<string> = new Set();
  
  graph.nodes.forEach(node => {
    distances[node.id] = Infinity;
    previous[node.id] = null;
    queue.add(node.id);
  });

  distances[startId] = 0;

  while (queue.size > 0) {
    let u: string | null = null;
    queue.forEach(id => {
      if (u === null || distances[id] < distances[u!]) {
        u = id;
      }
    });

    if (u === null || u === endId) break;
    queue.delete(u);
    
    const uNode = graph.nodes.get(u);
    if(!uNode) continue;

    const neighbors = graph.edges.get(u) || [];
    for (const edge of neighbors) {
      const v = edge.to;
      const vNode = graph.nodes.get(v);
      if(!vNode) continue;

      // Apply filters
      if (filter === AccessibilityFilter.NO_STAIRS && (uNode.unit.type === UnitType.STAIRS || vNode.unit.type === UnitType.STAIRS) && edge.type === 'vertical') {
        continue;
      }
      if (filter === AccessibilityFilter.ELEVATOR_ONLY && edge.type === 'vertical' && uNode.unit.type !== UnitType.ELEVATOR) {
        continue;
      }

      const alt = distances[u] + edge.weight;
      if (alt < distances[v]) {
        distances[v] = alt;
        previous[v] = u;
      }
    }
  }

  const path: string[] = [];
  let current: string | null = endId;
  while (current !== null) {
    path.unshift(current);
    if(distances[current] === Infinity) return null; // No path found
    current = previous[current];
  }

  return path[0] === startId ? path : null;
};


export const useGraph = (data: CampusData) => {
  const graph = useMemo(() => buildGraph(data), [data]);

  const getPath = (startId: string, endId: string, filter: AccessibilityFilter) => {
    if (!startId || !endId) return null;
    return findShortestPath(graph, startId, endId, filter);
  };

  return { graph, getPath, getPolygonCenter };
};
