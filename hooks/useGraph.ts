
import { useMemo } from 'react';
import type { CampusData, NavGraphNode, Waypoint } from '../types';
import { AccessibilityFilter, UnitType } from '../types';
import { generateNavigationGraph } from '../services/graphGenerator';
import { getHaversineDistance } from '../utils/geometry';

export const useGraph = (data: CampusData) => {
    const navGraph = useMemo(() => generateNavigationGraph(data), [data]);

    // Create a Map for O(1) node access
    const nodeMap = useMemo(() => {
        const map = new Map<string, NavGraphNode>();
        navGraph.nodes.forEach(node => map.set(node.id, node));
        return map;
    }, [navGraph]);

    const getPath = (startId: string, endId: string, filter: AccessibilityFilter): string[] | null => {
        if (!startId || !endId) return null;
        if (!nodeMap.has(startId) || !nodeMap.has(endId)) return null;

        const distances = new Map<string, number>();
        const previous = new Map<string, string | null>();
        const queue = new Set<string>();

        navGraph.nodes.forEach(node => {
            distances.set(node.id, Infinity);
            previous.set(node.id, null);
            queue.add(node.id);
        });

        distances.set(startId, 0);

        while (queue.size > 0) {
            let u: string | null = null;
            let minDist = Infinity;

            // Simple priority queue implementation
            for (const id of queue) {
                const d = distances.get(id)!;
                if (d < minDist) {
                    minDist = d;
                    u = id;
                }
            }

            if (u === null || u === endId) break;
            if (minDist === Infinity) break; // Remaining nodes are unreachable

            queue.delete(u);

            const neighbors = navGraph.edges[u] || [];
            for (const edge of neighbors) {
                if (!queue.has(edge.to)) continue;

                // Filter logic
                if (filter === AccessibilityFilter.ELEVATOR_ONLY && edge.type === 'vertical') {
                    // Check if the connection involves Stairs
                    // Since vertical edges connect two centers, we check the node type.
                    // If using elevator only, we skip STAIRS.
                    const uNode = nodeMap.get(edge.from);
                    const vNode = nodeMap.get(edge.to);
                    
                    if (uNode?.unitType === UnitType.STAIRS || vNode?.unitType === UnitType.STAIRS) {
                        continue;
                    }
                }

                const alt = distances.get(u)! + edge.weight;
                if (alt < distances.get(edge.to)!) {
                    distances.set(edge.to, alt);
                    previous.set(edge.to, u);
                }
            }
        }

        // Reconstruct path
        const path: string[] = [];
        let current: string | null = endId;
        
        // If destination is unreachable
        if (distances.get(endId) === Infinity) return null;

        while (current) {
            path.unshift(current);
            current = previous.get(current) || null;
        }

        return path.length > 0 ? path : null;
    };

    const getPathWaypoints = (path: string[]): Waypoint[] => {
        if (!path) return [];
        return path.map(id => {
            const node = nodeMap.get(id);
            if (!node) return null;
            return { point: node.point, levelId: node.levelId };
        }).filter((wp): wp is Waypoint => !!wp);
    };

    const calculatePathDistance = (waypoints: Waypoint[]): number => {
        let distance = 0;
        for (let i = 0; i < waypoints.length - 1; i++) {
            // Only calculate geographic distance for points on the same level
            // Vertical distance is schematic in this calculation usually, 
            // but haversine will return 0 for same lat/lon.
            if (waypoints[i].levelId === waypoints[i+1].levelId) {
                distance += getHaversineDistance(waypoints[i].point, waypoints[i+1].point);
            }
        }
        return distance;
    };

    return { graph: navGraph, getPath, getPathWaypoints, calculatePathDistance };
};
