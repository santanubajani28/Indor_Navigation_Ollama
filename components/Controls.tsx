import React from 'react';
import type { Level, Unit } from '../types';
import { AccessibilityFilter, UnitType } from '../types';
import Legend from './Legend';

interface ControlsProps {
  units: Unit[];
  levels: Level[];
  startUnit: string | null;
  setStartUnit: (id: string) => void;
  endUnit: string | null;
  setEndUnit: (id: string) => void;
  filter: AccessibilityFilter;
  setFilter: (filter: AccessibilityFilter) => void;
  onFindPath: () => void;
  onClearPath: () => void;
  path: string[] | null;
  pathInstructions: string;
  isGeneratingInstructions: boolean;
  viewMode: '2D' | '3D';
  selectedLevelId: string;
  setSelectedLevelId: (id: string) => void;
  pathDistance: number | null;
  activeDatasetName: string;
}

const Controls: React.FC<ControlsProps> = ({
  units,
  levels,
  startUnit,
  setStartUnit,
  endUnit,
  setEndUnit,
  filter,
  setFilter,
  onFindPath,
  onClearPath,
  path,
  pathInstructions,
  isGeneratingInstructions,
  viewMode,
  selectedLevelId,
  setSelectedLevelId,
  pathDistance,
  activeDatasetName,
}) => {
  const selectableUnits = units.filter(u => {
      const selectableTypes = [
          UnitType.CLASSROOM,
          UnitType.OFFICE,
          UnitType.ENTRANCE,
          UnitType.RESTAURANT,
      ];
      return selectableTypes.includes(u.type);
    }).sort((a,b) => a.name.localeCompare(b.name));

  return (
    <div className="w-96 flex-shrink-0 bg-gray-900/80 backdrop-blur-sm p-6 space-y-6 overflow-y-auto h-full shadow-2xl rounded-r-2xl border-l border-gray-700">
      <div>
        <h1 className="text-3xl font-bold text-white">Indoor Navigator</h1>
        <p className="text-gray-400 mt-1">
          Active Dataset: <span className="font-semibold text-indigo-300">{activeDatasetName}</span>
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="start-unit" className="block text-sm font-medium text-gray-300 mb-1">Start Location</label>
          <select
            id="start-unit"
            value={startUnit || ''}
            onChange={(e) => setStartUnit(e.target.value)}
            className="w-full bg-gray-800 border-gray-600 rounded-md shadow-sm text-white focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="" disabled>Select a starting point</option>
            {selectableUnits.map(unit => (
              <option key={unit.id} value={unit.id}>{unit.name} (L{levels.find(l => l.id === unit.levelId)?.name})</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="end-unit" className="block text-sm font-medium text-gray-300 mb-1">End Location</label>
          <select
            id="end-unit"
            value={endUnit || ''}
            onChange={(e) => setEndUnit(e.target.value)}
            className="w-full bg-gray-800 border-gray-600 rounded-md shadow-sm text-white focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="" disabled>Select a destination</option>
            {selectableUnits.map(unit => (
              <option key={unit.id} value={unit.id}>{unit.name} (L{levels.find(l => l.id === unit.levelId)?.name})</option>
            ))}
          </select>
        </div>
      </div>
      
      {viewMode === '2D' && (
         <div>
          <label htmlFor="level-select" className="block text-sm font-medium text-gray-300 mb-1">Floor Selection</label>
          <select
            id="level-select"
            value={selectedLevelId}
            onChange={(e) => setSelectedLevelId(e.target.value)}
            className="w-full bg-gray-800 border-gray-600 rounded-md shadow-sm text-white focus:ring-indigo-500 focus:border-indigo-500"
          >
            {levels.sort((a,b) => a.zIndex - b.zIndex).map(level => (
              <option key={level.id} value={level.id}>{level.name}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <h3 className="text-sm font-medium text-gray-300 mb-2">Accessibility Options</h3>
        <div className="space-y-2">
          {Object.values(AccessibilityFilter).map(f => (
            <label key={f} className="flex items-center space-x-2 text-gray-300 capitalize">
              <input
                type="radio"
                name="filter"
                value={f}
                checked={filter === f}
                onChange={() => setFilter(f)}
                className="text-indigo-500 bg-gray-700 border-gray-600 focus:ring-indigo-500"
              />
              <span>{f.replace('_', ' ').toLowerCase()}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex space-x-2">
        <button
          onClick={onFindPath}
          disabled={!startUnit || !endUnit || isGeneratingInstructions}
          className="flex-1 bg-indigo-600 text-white font-bold py-2 px-4 rounded-md hover:bg-indigo-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
        >
          {isGeneratingInstructions ? 'Generating...' : 'Find Path'}
        </button>
        <button
          onClick={onClearPath}
          className="flex-1 bg-gray-600 text-white font-bold py-2 px-4 rounded-md hover:bg-gray-700 transition-colors"
        >
          Clear
        </button>
      </div>

      {(path || isGeneratingInstructions) && (
        <div className="p-4 bg-gray-800 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-lg text-gray-200 flex items-center">
              Navigation Steps
              {isGeneratingInstructions && (
                <svg className="animate-spin ml-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
            </h3>
            {pathDistance !== null && (
              <span className="text-sm text-gray-400 font-medium">
                {Math.round(pathDistance)}m
              </span>
            )}
          </div>
          {pathInstructions && (
            <p className="text-gray-300 whitespace-pre-wrap text-sm">{pathInstructions}</p>
          )}
        </div>
      )}


      <div className="pt-4 border-t border-gray-700">
        <Legend units={units} />
      </div>
    </div>
  );
};

export default Controls;