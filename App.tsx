import React, { useState, useEffect, useCallback } from 'react';
import Controls from './components/Controls';
import MapViewer from './components/MapViewer';
import { useGraph } from './hooks/useGraph';
import { campusData } from './data/campusData';
import { AccessibilityFilter, UnitType } from './types';

const App: React.FC = () => {
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

  const handleClearPath = () => {
    setStartUnit(null);
    setEndUnit(null);
    setPath(null);
    setPathInstructions('');
  };
  
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
        
        // Add more context
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
  }, []);

  useEffect(() => {
    generateInstructions(path);
  }, [path, generateInstructions]);

  return (
    <main className="flex h-screen w-screen bg-gray-900 overflow-hidden">
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
    </main>
  );
};

export default App;