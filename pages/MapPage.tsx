import React, { useState, useEffect, useCallback } from 'react';
import Controls from '../components/Controls';
import MapViewer from '../components/MapViewer';
import MapViewer3D from '../components/MapViewer3D';
import { useGraph } from '../hooks/useGraph';
import { AccessibilityFilter, UnitType } from '../types';
import type { CampusData } from '../types';
import { View2DIcon, View3DIcon } from '../components/icons';

interface MapPageProps {
  campusData: CampusData;
}

const MapPage: React.FC<MapPageProps> = ({ campusData }) => {
  const [startUnit, setStartUnit] = useState<string | null>(null);
  const [endUnit, setEndUnit] = useState<string | null>(null);
  const [filter, setFilter] = useState<AccessibilityFilter>(AccessibilityFilter.NONE);
  const [path, setPath] = useState<string[] | null>(null);
  const [pathInstructions, setPathInstructions] = useState<string>('');
  const [viewMode, setViewMode] = useState<'2D' | '3D'>('2D');
  const [selectedLevelId, setSelectedLevelId] = useState<string>(
    campusData.levels.find(l => l.zIndex === 0)?.id || campusData.levels[0]?.id || ''
  );
  
  const { getPath } = useGraph(campusData);

  const handleFindPath = () => {
    if (startUnit && endUnit) {
      const newPath = getPath(startUnit, endUnit, filter);
      setPath(newPath);
    }
  };

  const handleClearPath = useCallback(() => {
    setStartUnit(null);
    setEndUnit(null);
    setPath(null);
    setPathInstructions('');
  }, []);
  
  const generateInstructions = useCallback((currentPath: string[] | null) => {
    if (!currentPath || currentPath.length === 0) {
        setPathInstructions('');
        return;
    }
    const instructions = currentPath.map((unitId, index) => {
        const unit = campusData.units.find(u => u.id === unitId);
        if (!unit) return '';

        let action = `Go to ${unit.name}`;
        if(index === 0) action = `Start at ${unit.name}`;
        else if (index === currentPath.length-1) action = `You have arrived at ${unit.name}`;
        
        const nextUnit = index < currentPath.length-1 ? campusData.units.find(u => u.id === currentPath[index+1]) : null;
        if(nextUnit && unit.levelId !== nextUnit.levelId) {
            if(nextUnit.type === UnitType.STAIRS || unit.type === UnitType.STAIRS) {
                action += ` and take the stairs to ${campusData.levels.find(l=>l.id===nextUnit.levelId)?.name}`;
            } else if (nextUnit.type === UnitType.ELEVATOR || unit.type === UnitType.ELEVATOR) {
                 action += ` and take the elevator to ${campusData.levels.find(l=>l.id===nextUnit.levelId)?.name}`;
            }
        }

        return `${index + 1}. ${action}`;
    }).join('\n');
    setPathInstructions(instructions);
  }, [campusData]);

  useEffect(() => {
    generateInstructions(path);
  }, [path, generateInstructions]);

  // When campusData changes, clear the old path and selections
  useEffect(() => {
    handleClearPath();
    const groundFloor = campusData.levels.find(l => l.zIndex === 0) || campusData.levels[0];
    if (groundFloor) {
        setSelectedLevelId(groundFloor.id);
    }
  }, [campusData, handleClearPath]);

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
        viewMode={viewMode}
        selectedLevelId={selectedLevelId}
        setSelectedLevelId={setSelectedLevelId}
      />
      <div className="flex-1 relative">
        {viewMode === '2D' ? (
            <MapViewer 
                data={campusData} 
                path={path} 
                startUnitId={startUnit}
                endUnitId={endUnit}
                selectedLevelId={selectedLevelId}
            />
        ) : (
            <MapViewer3D
                data={campusData} 
                path={path} 
                startUnitId={startUnit}
                endUnitId={endUnit}
            />
        )}
        <div className="absolute top-4 right-4 z-10">
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