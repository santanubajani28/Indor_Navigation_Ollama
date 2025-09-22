import React, { useState, useEffect, useCallback } from 'react';
import Controls from '../components/Controls';
import MapViewer from '../components/MapViewer';
import { useGraph } from '../hooks/useGraph';
import { AccessibilityFilter, UnitType } from '../types';
import type { CampusData } from '../types';

interface MapPageProps {
  campusData: CampusData;
}

const MapPage: React.FC<MapPageProps> = ({ campusData }) => {
  const [startUnit, setStartUnit] = useState<string | null>(null);
  const [endUnit, setEndUnit] = useState<string | null>(null);
  const [filter, setFilter] = useState<AccessibilityFilter>(AccessibilityFilter.NONE);
  const [path, setPath] = useState<string[] | null>(null);
  const [pathInstructions, setPathInstructions] = useState<string>('');
  
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
  }, [campusData, handleClearPath]);

  return (
    <div className="flex h-full w-full">
      <Controls
        units={campusData.units}
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
      />
      <MapViewer 
        data={campusData} 
        path={path} 
        startUnitId={startUnit}
        endUnitId={endUnit}
      />
    </div>
  );
};

export default MapPage;
