
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


const MapViewer: React.FC<MapViewerProps> = ({ data, path, startUnitId, endUnitId }) => {
  
  const pathData = useMemo(() => {
    if (!path || path.length < 2) return null;

    const unitsOnPath = path.map(id => data.units.find(u => u.id === id)).filter(Boolean) as Unit[];
    if (unitsOnPath.length < 2) return null;

    const mainPathDParts: string[] = [];
    const transitionLines: { from: Point; to: Point }[] = [];
    let totalLength = 0;
    
    const startPoint = getPolygonCenter(unitsOnPath[0].polygon);
    const endPoint = getPolygonCenter(unitsOnPath[unitsOnPath.length - 1].polygon);

    let currentSegmentPoints: Point[] = [startPoint];
    const communalTypes = [UnitType.CORRIDOR, UnitType.STAIRS, UnitType.ELEVATOR];

    const processSegment = (points: Point[]) => {
        if (points.length < 2) return;
        
        const finalPoints = points.filter((p, i) => {
            if (i === 0) return true;
            const prev = points[i-1];
            return Math.hypot(p.x - prev.x, p.y - prev.y) > 0.1;
        });

        if (finalPoints.length < 2) return;

        mainPathDParts.push("M " + finalPoints.map(p => `${p.x},${p.y}`).join(" L "));
        
        for (let i = 0; i < finalPoints.length - 1; i++) {
          totalLength += Math.hypot(finalPoints[i+1].x - finalPoints[i].x, finalPoints[i+1].y - finalPoints[i].y);
        }
    };

    for (let i = 0; i < unitsOnPath.length - 1; i++) {
        const unitA = unitsOnPath[i];
        const unitB = unitsOnPath[i + 1];

        if (unitA.levelId !== unitB.levelId) {
            // End the current segment at the center of the vertical transport unit
            currentSegmentPoints.push(getPolygonCenter(unitA.polygon));
            processSegment(currentSegmentPoints);

            // Record the transition for separate rendering
            transitionLines.push({
                from: getPolygonCenter(unitA.polygon),
                to: getPolygonCenter(unitB.polygon)
            });

            // Start a new segment on the next level
            currentSegmentPoints = [getPolygonCenter(unitB.polygon)];
        } else {
            // Same-level pathing logic
            const doorwayAB = findMidpointOfSharedEdge(unitA, unitB);
            if (!doorwayAB) {
                console.warn(`No shared edge found between ${unitA.name} and ${unitB.name}, using centers as fallback.`);
                currentSegmentPoints.push(getPolygonCenter(unitB.polygon));
                continue;
            }
            
            const isACommunal = communalTypes.includes(unitA.type);
            const isBCommunal = communalTypes.includes(unitB.type);

            if (!isACommunal && isBCommunal) { // Room -> Corridor
                currentSegmentPoints.push(doorwayAB);
                const corridorInfo = getCorridorInfo(unitB);
                if (corridorInfo.orientation === 'horizontal') {
                    currentSegmentPoints.push({ x: doorwayAB.x, y: corridorInfo.centerline });
                } else {
                    currentSegmentPoints.push({ x: corridorInfo.centerline, y: doorwayAB.y });
                }
            } else if (isACommunal && isBCommunal) { // Corridor -> Corridor
                const corridorAInfo = getCorridorInfo(unitA);
                const prevPoint = currentSegmentPoints[currentSegmentPoints.length - 1];
                
                if (corridorAInfo.orientation === 'horizontal') {
                    currentSegmentPoints.push({ x: doorwayAB.x, y: prevPoint.y });
                } else {
                    currentSegmentPoints.push({ x: prevPoint.x, y: doorwayAB.y });
                }
                
                currentSegmentPoints.push(doorwayAB);

                const corridorBInfo = getCorridorInfo(unitB);
                if (corridorBInfo.orientation === 'horizontal') {
                    currentSegmentPoints.push({ x: doorwayAB.x, y: corridorBInfo.centerline });
                } else {
                    currentSegmentPoints.push({ x: corridorBInfo.centerline, y: doorwayAB.y });
                }
            } else if (isACommunal && !isBCommunal) { // Corridor -> Room
                const corridorInfo = getCorridorInfo(unitA);
                const prevPoint = currentSegmentPoints[currentSegmentPoints.length - 1];

                if (corridorInfo.orientation === 'horizontal') {
                    currentSegmentPoints.push({ x: doorwayAB.x, y: prevPoint.y });
                } else {
                    currentSegmentPoints.push({ x: prevPoint.x, y: doorwayAB.y });
                }
                currentSegmentPoints.push(doorwayAB);
            } else { 
                currentSegmentPoints.push(doorwayAB);
            }
        }
    }

    // Process the final segment
    currentSegmentPoints.push(endPoint);
    processSegment(currentSegmentPoints);

    // The animation path is all parts joined together. The "M" commands will cause jumps.
    const animationPathD = mainPathDParts.join(' ');

    return { d: animationPathD, length: totalLength, transitionLines, startPoint, endPoint };
  }, [path, data.units]);

  return (
    <div className="flex-1 p-4 bg-gray-800/50 rounded-l-2xl">
      <svg viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} className="w-full h-full">
        <defs>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3.5" result="coloredBlur"/>
                <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                </feMerge>
            </filter>
        </defs>
      
        {/* Render Levels */}
        {data.levels.map(level => (
            <g key={level.id}>
                 <polygon points={level.polygon.map(p => `${p.x},${p.y}`).join(' ')} className="fill-gray-800 stroke-gray-600 stroke-1"/>
                 <text x={level.polygon[0].x + 20} y={level.polygon[0].y + 30} className="fill-gray-500 text-2xl font-bold">{level.name}</text>
            </g>
        ))}

        {/* Render Units */}
        {data.units.map(unit => (
          <UnitPolygon
            key={unit.id}
            unit={unit}
            isStart={unit.id === startUnitId}
            isEnd={unit.id === endUnitId}
          />
        ))}

        {/* Render animated path line and navigator icon */}
        {pathData && (
          <g>
            {/* Draw dashed lines for level transitions */}
            {pathData.transitionLines.map((line, index) => (
                <line
                    key={`transition-${index}`}
                    x1={line.from.x}
                    y1={line.from.y}
                    x2={line.to.x}
                    y2={line.to.y}
                    className="stroke-blue-500/80 stroke-[3] fill-none"
                    strokeDasharray="8 8"
                    style={{ filter: 'url(#glow)' }}
                />
            ))}
            {/* Draw the main path segments on each floor */}
            <path
              key={path?.join('-')} 
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
            <circle cx={pathData.startPoint.x} cy={pathData.startPoint.y} r="8" className="fill-green-500 stroke-white stroke-2" style={{ filter: 'url(#glow)' }} />
            <circle cx={pathData.endPoint.x} cy={pathData.endPoint.y} r="8" className="fill-red-500 stroke-white stroke-2" style={{ filter: 'url(#glow)' }} />

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