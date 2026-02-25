
// Declare Leaflet's global 'L' object to satisfy TypeScript.
declare const L: any;

import React, { useRef, useEffect, useMemo } from 'react';
import type { CampusData, Point, Waypoint } from '../types';
import { UNIT_TYPE_COLORS_3D } from '../constants';

interface MapViewerProps {
  data: CampusData;
  waypoints: Waypoint[] | null;
  startUnitId: string | null;
  endUnitId: string | null;
  selectedLevelId: string;
  showProject: boolean;
  mapOrigin: { lat: number; lon: number } | null;
}

const MapViewer: React.FC<MapViewerProps> = ({ data, waypoints, startUnitId, endUnitId, selectedLevelId, showProject, mapOrigin }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  // Use a ref (not state) to avoid triggering re-renders and double-init issues
  const mapInstanceRef = useRef<any>(null);
  const drawnObjectsRef = useRef<any>(null);

  const dataBounds = useMemo(() => {
    const allPoints = [
      ...data.sites.flatMap(s => s.polygon),
      ...data.facilities.flatMap(f => f.polygon),
      ...data.levels.flatMap(l => l.polygon),
      ...data.units.flatMap(u => u.polygon)
    ];

    if (allPoints.length === 0) {
      return null;
    }
    const latLngs = allPoints.map(p => [p.y, p.x]);
    return L.latLngBounds(latLngs);
  }, [data]);

  // Initialize map once — with proper cleanup to fix "container already initialized" error
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Guard against Leaflet already owning this DOM element (React StrictMode double-invoke)
    if ((mapRef.current as any)._leaflet_id) return;

    const center = mapOrigin
      ? [mapOrigin.lat, mapOrigin.lon]
      : [40.7128, -74.0060];

    const newMap = L.map(mapRef.current, {
      center: center,
      zoom: 18,
      zoomControl: false,
    });

    // Add a custom pane for the navigation path to ensure it's drawn on top
    newMap.createPane('pathPane');
    newMap.getPane('pathPane').style.zIndex = 620;
    newMap.getPane('pathPane').style.pointerEvents = 'none';

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    }).addTo(newMap);

    drawnObjectsRef.current = L.featureGroup().addTo(newMap);
    mapInstanceRef.current = newMap;

    // Critical: invalidate size AFTER the map is in the DOM so Leaflet
    // correctly measures the container (fixes height: 0 rendering issue)
    requestAnimationFrame(() => {
      newMap.invalidateSize();
    });

    // Also invalidate on container resize (e.g. window resize, panel toggle)
    const ro = new ResizeObserver(() => {
      newMap.invalidateSize();
    });
    if (mapRef.current) ro.observe(mapRef.current);

    // Return cleanup to properly destroy the map when the component unmounts
    return () => {
      ro.disconnect();
      newMap.remove();
      mapInstanceRef.current = null;
      drawnObjectsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  // When mapOrigin changes, update map center
  useEffect(() => {
    if (mapInstanceRef.current && mapOrigin) {
      mapInstanceRef.current.setView([mapOrigin.lat, mapOrigin.lon], 18);
    }
  }, [mapOrigin]);

  // Zoom to fit data bounds when data changes
  useEffect(() => {
    if (mapInstanceRef.current && dataBounds && dataBounds.isValid()) {
      mapInstanceRef.current.fitBounds(dataBounds, { padding: [50, 50] });
    }
  }, [dataBounds]);

  // Draw and update map objects (units, path, markers)
  useEffect(() => {
    if (!mapInstanceRef.current || !drawnObjectsRef.current) return;

    const drawnObjects = drawnObjectsRef.current;
    drawnObjects.clearLayers();

    if (!showProject) return;

    // Draw visible units for the selected level
    const visibleUnits = data.units.filter(u => u.levelId === selectedLevelId);
    visibleUnits.forEach(unit => {
      const isStart = unit.id === startUnitId;
      const isEnd = unit.id === endUnitId;

      // Fallback to neutral grey for any unit type not in the color map
      const fillColorNumber = isStart || isEnd ? 0xFFFF00 : (UNIT_TYPE_COLORS_3D[unit.type] ?? 0x888888);
      const fillColor = `#${fillColorNumber.toString(16).padStart(6, '0')}`;

      L.polygon(
        unit.polygon.map(p => [p.y, p.x]),
        {
          color: '#FFFFFF',
          weight: 1,
          opacity: 0.6,
          fillColor: fillColor,
          fillOpacity: isStart || isEnd ? 0.8 : 0.5,
        }
      ).addTo(drawnObjects);
    });

    // Draw path
    if (waypoints && waypoints.length > 0) {
      const toLatLng = (p: Point) => [p.y, p.x];

      const pathSegments: any[][] = [];
      let currentSegment: any[] = [];

      for (const waypoint of waypoints) {
        const waypointLatLng = toLatLng(waypoint.point);
        if (waypoint.levelId === selectedLevelId) {
          currentSegment.push(waypointLatLng);
        } else {
          if (currentSegment.length > 1) {
            pathSegments.push(currentSegment);
          }
          currentSegment = [];
        }
      }
      if (currentSegment.length > 1) pathSegments.push(currentSegment);

      pathSegments.forEach(segment => {
        L.polyline(segment, {
          color: '#3388ff',
          weight: 5,
          opacity: 0.75,
          pane: 'pathPane'
        }).addTo(drawnObjects);
      });

      const startUnit = data.units.find(u => u.id === startUnitId);
      const endUnit = data.units.find(u => u.id === endUnitId);

      if (startUnit && startUnit.levelId === selectedLevelId) {
        L.circleMarker(toLatLng(waypoints[0].point), {
          radius: 8, color: 'white', weight: 2, fillColor: '#34A853', fillOpacity: 1,
          pane: 'pathPane'
        }).addTo(drawnObjects).bindTooltip('Start');
      }
      if (endUnit && endUnit.levelId === selectedLevelId) {
        L.circleMarker(toLatLng(waypoints[waypoints.length - 1].point), {
          radius: 8, color: 'white', weight: 2, fillColor: '#EA4335', fillOpacity: 1,
          pane: 'pathPane'
        }).addTo(drawnObjects).bindTooltip('End');
      }
    }
  }, [data, waypoints, startUnitId, endUnitId, selectedLevelId, showProject]);

  const buttonClasses = "bg-gray-800/80 backdrop-blur-sm p-2 rounded-full text-white hover:bg-indigo-600 transition-colors w-10 h-10 flex items-center justify-center font-bold text-lg";

  return (
    <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, overflow: 'hidden' }} className="bg-gray-800/50 rounded-l-2xl">
      <div ref={mapRef} className="w-full h-full" />
      <div className="absolute bottom-4 right-4 flex flex-col space-y-2 z-10">
        <button onClick={() => mapInstanceRef.current?.zoomIn()} className={buttonClasses} aria-label="Zoom in">+</button>
        <button onClick={() => mapInstanceRef.current?.zoomOut()} className={buttonClasses} aria-label="Zoom out">-</button>
        <button onClick={() => dataBounds && dataBounds.isValid() && mapInstanceRef.current?.fitBounds(dataBounds, { padding: [50, 50] })} className={buttonClasses} aria-label="Zoom to project">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 01-1 1h-2a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V4zm3 4a1 1 0 011-1h2a1 1 0 110 2H8a1 1 0 01-1-1zm0 4a1 1 0 011-1h2a1 1 0 110 2H8a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default MapViewer;
