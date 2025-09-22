import React, { useMemo } from 'react';
import type { CampusData, Point, Polygon, Unit } from '../types';
import { MAP_WIDTH, MAP_HEIGHT, UNIT_TYPE_BORDERS, UNIT_TYPE_COLORS } from '../constants';
import { UnitType } from '../types';
import { NavigatorIcon } from './icons';


// --- Geometry Helpers ---

/**
 * Checks if a point `p` lies on the line segment defined by `a` and `b`.
 * @param p The point to check.
 * @param a The start point of the line segment.
 * @param b The end point of the line segment.
 * @returns `true` if the point is on the segment, otherwise `false`.
 */
const isPointOnSegment = (p: Point, a: Point, b: Point): boolean => {
    // Check for collinearity using cross-product. Epsilon for float comparisons.
    const crossProduct = (p.y - a.y) * (b.x - a.x) - (p.x - a.x) * (b.y - a.y);
    if (Math.abs(crossProduct) > 1e-9) return false;

    // Check if the point is within the bounding box of the segment.
    const dotProduct = (p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y);
    if (dotProduct < 0) return false;

    const squaredLength = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
    if (dotProduct > squaredLength) return false;

    return true;
};

/**
 * Finds the midpoint of the shared edge between two units.
 * This function iterates through the edges of both polygons to find an overlapping
 * collinear segment, which represents the shared "doorway" or boundary.
 * @param unitA The first unit.
 * @param unitB The second unit.
 * @returns The midpoint of the shared edge, or `null` if none is found.
 */
const findMidpointOfSharedEdge = (unitA: Unit, unitB: Unit): Point | null => {
    const polyA = unitA.polygon;
    const polyB = unitB.polygon;

    for (let i = 0; i < polyA.length; i++) {
        const a1 = polyA[i];
        const a2 = polyA[(i + 1) % polyA.length];

        for (let j = 0; j < polyB.length; j++) {
            const b1 = polyB[j];
            const b2 = polyB[(j + 1) % polyB.length];

            // Check if the edges are collinear (either vertical or horizontal).
            const isVertical = Math.abs(a1.x - a2.x) < 1e-9 && Math.abs(b1.x - b2.x) < 1e-9 && Math.abs(a1.x - b1.x) < 1e-9;
            const isHorizontal = Math.abs(a1.y - a2.y) < 1e-9 && Math.abs(b1.y - b2.y) < 1e-9 && Math.abs(a1.y - b1.y) < 1e-9;

            if (isVertical || isHorizontal) {
                // Collect all points that form the overlapping segment.
                const overlapPoints: Point[] = [];
                if (isPointOnSegment(a1, b1, b2)) overlapPoints.push(a1);
                if (isPointOnSegment(a2, b1, b2)) overlapPoints.push(a2);
                if (isPointOnSegment(b1, a1, a2)) overlapPoints.push(b1);
                if (isPointOnSegment(b2, a1, a2)) overlapPoints.push(b2);

                // Deduplicate points.
                const uniqueKeys = new Set<string>();
                const uniquePoints = overlapPoints.filter(p => {
                    const key = `${p.x},${p.y}`;
                    if (uniqueKeys.has(key)) return false;
                    uniqueKeys.add(key);
                    return true;
                });

                // If we have at least two points, we have an overlapping line segment.
                if (uniquePoints.length >= 2) {
                    // The two furthest points in the overlap set define the shared segment.
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

                    if (pStart && pEnd) {
                        // Return the midpoint of this shared segment.
                        return { x: (pStart.x + pEnd.x) / 2, y: (pStart.y + pEnd.y) / 2 };
                    }
                }
            }
        }
    }
    return null; // No shared edge found.
};

const getCorridorInfo = (unit: Unit) => {
    const { polygon } = unit;
    const xs = polygon.map(p => p.x);
    const ys = polygon.map(p => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const width = maxX - minX;
    const height = maxY - minY;

    const orientation = width > height ? 'horizontal' : 'vertical';
    const centerline = orientation === 'horizontal' ? minY + height / 2 : minX + width / 2;

    return { orientation, centerline };
};

interface MapViewerProps {
  data: CampusData;
  path: string[] | null;
  startUnitId: string | null;
  endUnitId: string | null;
  selectedLevelId: string;
}

const UnitPolygon: React.FC<{
    unit: Unit;
    isStart: boolean;
    isEnd: boolean;
}> = React.memo(({ unit, isStart, isEnd }) => {
    const points = unit.polygon.map(p => `${p.x},${p.y}`).join(' ');
    const center = getPolygonCenter(unit.polygon);

    let fillColorClass: string;
    if (isStart || isEnd) {
        fillColorClass = 'fill-yellow-400/80';
    } else {
        fillColorClass = `${UNIT_TYPE_COLORS[unit.type]}/60`;
    }

    return (
        <g className="transition-all duration-300">
            <polygon
                points={points}
                className={`${UNIT_TYPE_BORDERS[unit.type]} ${fillColorClass} stroke-1 transition-all duration-300`}
            />
            <text x={center.x} y={center.y} className="text-xs fill-white font-mono pointer-events-none" textAnchor="middle" alignmentBaseline="middle">
                {unit.name}
            </text>
        </g>
    );
});

const getPolygonCenter = (polygon: Polygon): Point => {
    if (!polygon || polygon.length === 0) return { x: 0, y: 0 };
    const center = polygon.reduce(
        (acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }),
        { x: 0, y: 0 }
    );
    center.x /= polygon.length;
    center.y /= polygon.length;
    return center;
};


const MapViewer: React.FC<MapViewerProps> = ({ data, path, startUnitId, endUnitId, selectedLevelId }) => {
  
  const visibleLevel = useMemo(() => data.levels.find(l => l.id === selectedLevelId), [data.levels, selectedLevelId]);
  const visibleUnits = useMemo(() => data.units.filter(u => u.levelId === selectedLevelId), [data.units, selectedLevelId]);

  const viewBox = useMemo(() => {
    if (!visibleLevel || visibleLevel.polygon.length === 0) {
        return `0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`;
    }
    const padding = 50;
    const allPoints = visibleLevel.polygon;
    const minX = Math.min(...allPoints.map(p => p.x));
    const minY = Math.min(...allPoints.map(p => p.y));
    const maxX = Math.max(...allPoints.map(p => p.x));
    const maxY = Math.max(...allPoints.map(p => p.y));
    const width = maxX - minX;
    const height = maxY - minY;

    return `${minX - padding} ${minY - padding} ${width + padding * 2} ${height + padding * 2}`;
  }, [visibleLevel]);

  const pathData = useMemo(() => {
    if (!path || path.length < 2) return null;

    const unitsOnPath = path.map(id => data.units.find(u => u.id === id)).filter(Boolean) as Unit[];
    if (unitsOnPath.length < 2) return null;

    const pathPoints: (Point | null)[] = [];
    const communalTypes = [UnitType.CORRIDOR, UnitType.STAIRS, UnitType.ELEVATOR];

    // Build a full list of high-resolution path points, including transitions
    for (let i = 0; i < unitsOnPath.length; i++) {
        const currentUnit = unitsOnPath[i];
        if (i === 0) {
            pathPoints.push(getPolygonCenter(currentUnit.polygon));
            continue;
        }
        
        const prevUnit = unitsOnPath[i - 1];
        if (currentUnit.levelId !== prevUnit.levelId) {
             pathPoints.push(getPolygonCenter(prevUnit.polygon));
             pathPoints.push(null); // Represents a level change
             pathPoints.push(getPolygonCenter(currentUnit.polygon));
             continue;
        }

        const doorway = findMidpointOfSharedEdge(prevUnit, currentUnit);
        if(!doorway) {
            pathPoints.push(getPolygonCenter(currentUnit.polygon));
            continue;
        }

        const isPrevCommunal = communalTypes.includes(prevUnit.type);
        const isCurrentCommunal = communalTypes.includes(currentUnit.type);
        const lastPoint = pathPoints[pathPoints.length - 1] as Point;

        if (!isPrevCommunal && isCurrentCommunal) { // Room -> Corridor
            pathPoints.push(doorway);
            const corridorInfo = getCorridorInfo(currentUnit);
            if (corridorInfo.orientation === 'horizontal') pathPoints.push({ x: doorway.x, y: corridorInfo.centerline });
            else pathPoints.push({ x: corridorInfo.centerline, y: doorway.y });
        } else if (isPrevCommunal && isCurrentCommunal) { // Corridor -> Corridor
            const corridorAInfo = getCorridorInfo(prevUnit);
            if (corridorAInfo.orientation === 'horizontal') pathPoints.push({ x: doorway.x, y: lastPoint.y });
            else pathPoints.push({ x: lastPoint.x, y: doorway.y });
            
            pathPoints.push(doorway);

            const corridorBInfo = getCorridorInfo(currentUnit);
            if (corridorBInfo.orientation === 'horizontal') pathPoints.push({ x: doorway.x, y: corridorBInfo.centerline });
            else pathPoints.push({ x: corridorBInfo.centerline, y: doorway.y });
        } else if (isPrevCommunal && !isCurrentCommunal) { // Corridor -> Room
            const corridorInfo = getCorridorInfo(prevUnit);
            if (corridorInfo.orientation === 'horizontal') pathPoints.push({ x: doorway.x, y: lastPoint.y });
            else pathPoints.push({ x: lastPoint.x, y: doorway.y });
            pathPoints.push(doorway);
            pathPoints.push(getPolygonCenter(currentUnit.polygon));
        } else {
             pathPoints.push(getPolygonCenter(currentUnit.polygon));
        }
    }

    let totalLength = 0;
    const pathDParts: string[] = [];
    let currentSegment: Point[] = [];

    // Filter points by selected level and create SVG path `d` attributes
    for (let i = 0; i < unitsOnPath.length - 1; i++) {
        const unitA = unitsOnPath[i];
        const unitB = unitsOnPath[i + 1];

        if (unitA.levelId === selectedLevelId) {
            if (currentSegment.length === 0) {
                 // Start of a new segment on this floor
                 // FIX: Pass unit.polygon to getPolygonCenter instead of the whole unit object.
                 const startPoint = (i === 0) ? getPolygonCenter(unitA.polygon) : findMidpointOfSharedEdge(unitsOnPath[i-1], unitA) || getPolygonCenter(unitA.polygon);
                 currentSegment.push(startPoint);
            }
            
            // FIX: Pass unit.polygon to getPolygonCenter instead of the whole unit object.
            const transitionPoint = (unitA.levelId !== unitB.levelId) 
                ? getPolygonCenter(unitA.polygon) 
                : findMidpointOfSharedEdge(unitA, unitB) || getPolygonCenter(unitB.polygon);

            currentSegment.push(transitionPoint);
        }

        if (unitA.levelId !== unitB.levelId || i === unitsOnPath.length - 2) {
             if (currentSegment.length > 1) {
                // End of a segment, add it to the path parts
                if (i === unitsOnPath.length - 2 && unitB.levelId === selectedLevelId) {
                    // FIX: Pass unit.polygon to getPolygonCenter instead of the whole unit object.
                    currentSegment.push(getPolygonCenter(unitB.polygon));
                }
                pathDParts.push("M " + currentSegment.map(p => `${p.x},${p.y}`).join(" L "));
                for (let k = 0; k < currentSegment.length - 1; k++) {
                    totalLength += Math.hypot(currentSegment[k+1].x - currentSegment[k].x, currentSegment[k+1].y - currentSegment[k].y);
                }
             }
             currentSegment = [];
        }
    }
    const animationPathD = pathDParts.join(' ');
    const startUnit = data.units.find(u=>u.id === startUnitId);
    const endUnit = data.units.find(u=>u.id === endUnitId);
    const startPoint = startUnit ? getPolygonCenter(startUnit.polygon) : null;
    const endPoint = endUnit ? getPolygonCenter(endUnit.polygon) : null;
    
    return { d: animationPathD, length: totalLength, startPoint, endPoint, isStartVisible: startUnit?.levelId === selectedLevelId, isEndVisible: endUnit?.levelId === selectedLevelId };
  }, [path, data.units, selectedLevelId, startUnitId, endUnitId]);

  return (
    <div className="flex-1 p-4 bg-gray-800/50 rounded-l-2xl">
      <svg viewBox={viewBox} className="w-full h-full">
        <defs>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3.5" result="coloredBlur"/>
                <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                </feMerge>
            </filter>
        </defs>
      
        {/* Render Level */}
        {visibleLevel && (
            <g key={visibleLevel.id}>
                 <polygon points={visibleLevel.polygon.map(p => `${p.x},${p.y}`).join(' ')} className="fill-gray-800 stroke-gray-600 stroke-1"/>
                 <text x={visibleLevel.polygon[0].x + 20} y={visibleLevel.polygon[0].y + 30} className="fill-gray-500 text-2xl font-bold">{visibleLevel.name}</text>
            </g>
        )}

        {/* Render Units */}
        {visibleUnits.map(unit => (
          <UnitPolygon
            key={unit.id}
            unit={unit}
            isStart={unit.id === startUnitId}
            isEnd={unit.id === endUnitId}
          />
        ))}

        {/* Render animated path line and navigator icon */}
        {pathData && pathData.d && (
          <g>
            <path
              key={path?.join('-') + selectedLevelId} 
              id="navigation-path"
              d={pathData.d}
              className="path-line-animated stroke-blue-500 stroke-[4] fill-none drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={pathData.length}
              strokeDashoffset={pathData.length}
              style={{ filter: 'url(#glow)' }}
            />
            {/* Start and End dots */}
            {pathData.isStartVisible && pathData.startPoint && <circle cx={pathData.startPoint.x} cy={pathData.startPoint.y} r="8" className="fill-green-500 stroke-white stroke-2" style={{ filter: 'url(#glow)' }} />}
            {pathData.isEndVisible && pathData.endPoint && <circle cx={pathData.endPoint.x} cy={pathData.endPoint.y} r="8" className="fill-red-500 stroke-white stroke-2" style={{ filter: 'url(#glow)' }} />}

            {/* Animated Navigator Icon */}
            <g style={{ filter: 'url(#glow)' }}>
                <NavigatorIcon
                    className="stroke-blue-400 fill-blue-500/70"
                    width="24"
                    height="24"
                    transform="translate(-12, -12)" 
                >
                    <animateMotion
                        dur="2s"
                        fill="freeze"
                        repeatCount="1"
                        rotate="auto"
                    >
                        <mpath href="#navigation-path" />
                    </animateMotion>
                </NavigatorIcon>
            </g>
          </g>
        )}
      </svg>
    </div>
  );
};

export default MapViewer;
