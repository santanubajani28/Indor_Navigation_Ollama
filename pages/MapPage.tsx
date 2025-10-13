
import React, { useState, useEffect, useCallback } from 'react';
import Controls from '../components/Controls';
import MapViewer from '../components/MapViewer';
import MapViewer3D from '../components/MapViewer3D';
import { useGraph } from '../hooks/useGraph';
import { AccessibilityFilter } from '../types';
import type { CampusData, Waypoint } from '../types';
import { View2DIcon, View3DIcon } from '../components/icons';
import { navigationService } from '../services/navigationService';

interface MapPageProps {
  campusData: CampusData;
  mapOrigin: { lat: number; lon: number } | null;
  activeDatasetName: string;
}

const MapPage: React.FC<MapPageProps> = ({ campusData, mapOrigin, activeDatasetName }) => {
  const [startUnit, setStartUnit] = useState<string | null>(null);
  const [endUnit, setEndUnit] = useState<string | null>(null);
  const [filter, setFilter] = useState<AccessibilityFilter>(AccessibilityFilter.NONE);
  const [path, setPath] = useState<string[] | null>(null);
  const [pathInstructions, setPathInstructions] = useState<string>('');
  const [isGeneratingInstructions, setIsGeneratingInstructions] = useState(false);
  const [viewMode, setViewMode] = useState<'2D' | '3D'>('2D');
  const [showProject, setShowProject] = useState<boolean>(true);
  const [selectedLevelId, setSelectedLevelId] = useState<string>('');
  const [pathDistance, setPathDistance] = useState<number | null>(null);
  const [waypoints, setWaypoints] = useState<Waypoint[] | null>(null);
  
  const { getPath, getPathWaypoints, calculatePathDistance } = useGraph(campusData);

  const handleFindPath = async () => {
    if (startUnit && endUnit) {
      const newPath = getPath(startUnit, endUnit, filter);
      setPath(newPath);
      setIsGeneratingInstructions(false);

      if (newPath) {
        setPathInstructions('');
        const newWaypoints = getPathWaypoints(newPath);
        setWaypoints(newWaypoints);
        
        const distance = calculatePathDistance(newWaypoints);
        setPathDistance(distance);

        // Generate text instructions
        setIsGeneratingInstructions(true);
        try {
          const instructions = await navigationService.generateInstructions(newPath, campusData);
          setPathInstructions(instructions);
        } catch (error) {
          console.error(error);
          setPathInstructions('Failed to generate instructions.');
        } finally {
          setIsGeneratingInstructions(false);
        }
      } else {
        setPath(null);
        setWaypoints(null);
        setPathDistance(null);
        setPathInstructions('No navigable path could be found. Try changing accessibility options or selecting different locations.');
      }
    }
  };

  const handleClearPath = useCallback(() => {
    setStartUnit(null);
    setEndUnit(null);
    setPath(null);
    setWaypoints(null);
    setPathInstructions('');
    setPathDistance(null);
  }, []);

  // When campusData changes, clear the old path and selections, and reset the selected level
  useEffect(() => {
    handleClearPath();
    if (campusData.levels && campusData.levels.length > 0) {
      const groundFloor = campusData.levels.find(l => l.zIndex === 0) || campusData.levels.sort((a,b) => a.zIndex - b.zIndex)[0];
      setSelectedLevelId(groundFloor.id);
    } else {
      setSelectedLevelId('');
    }
  }, [campusData, handleClearPath]);
  
  // Automatically switch the visible floor when the start or end unit changes.
  useEffect(() => {
    // Prioritize showing the end unit's level, as that's the user's destination.
    const unitIdToShow = endUnit || startUnit;
    if (unitIdToShow) {
        const unit = campusData.units.find(u => u.id === unitIdToShow);
        if (unit) {
            setSelectedLevelId(unit.levelId);
        }
    }
  }, [startUnit, endUnit, campusData.units]);


  return (
    <div className="flex h-full w-full">
      <Controls
        units={campusData.units}
        levels={campusData.levels}
        startUnit={startUnit}
        setStartUnit={setStartUnit}
        endUnit={endUnit}
        setEndUnit={setEndUnit}
        filter={filter}
        setFilter={setFilter}
        onFindPath={handleFindPath}
        onClearPath={handleClearPath}
        path={path}
        pathInstructions={pathInstructions}
        isGeneratingInstructions={isGeneratingInstructions}
        viewMode={viewMode}
        selectedLevelId={selectedLevelId}
        setSelectedLevelId={setSelectedLevelId}
        pathDistance={pathDistance}
        activeDatasetName={activeDatasetName}
      />
      <div className="flex-1 relative">
        {viewMode === '2D' ? (
            <MapViewer 
                data={campusData} 
                waypoints={waypoints}
                startUnitId={startUnit}
                endUnitId={endUnit}
                selectedLevelId={selectedLevelId}
                showProject={showProject}
                mapOrigin={mapOrigin}
            />
        ) : (
            <MapViewer3D
                data={campusData} 
                path={path} 
                waypoints={waypoints}
                startUnitId={startUnit}
                endUnitId={endUnit}
                basemapType={'satellite'}
                showProject={showProject}
                mapOrigin={mapOrigin}
            />
        )}
        <div className="absolute top-4 right-4 z-10 flex items-center space-x-2">
            <div className="bg-gray-800/80 backdrop-blur-sm p-2 rounded-full text-white flex items-center space-x-2 text-sm">
                <span className="font-medium px-1">Project</span>
                <button
                    onClick={() => setShowProject(!showProject)}
                    className={`w-12 h-6 rounded-full flex items-center transition-colors ${showProject ? 'bg-indigo-600' : 'bg-gray-600'}`}
                    aria-pressed={showProject}
                    aria-label="Toggle project visibility"
                >
                    <span className={`inline-block w-5 h-5 bg-white rounded-full transform transition-transform ${showProject ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
            </div>
            <button
                onClick={() => setViewMode(prev => prev === '2D' ? '3D' : '2D')}
                className="bg-gray-800/80 backdrop-blur-sm p-2 rounded-full text-white hover:bg-indigo-600 transition-colors"
                aria-label={`Switch to ${viewMode === '2D' ? '3D' : '2D'} view`}
            >
                {viewMode === '2D' ? <View3DIcon className="w-6 h-6" /> : <View2DIcon className="w-6 h-6" />}
            </button>
        </div>
      </div>
    </div>
  );
};

export default MapPage;
