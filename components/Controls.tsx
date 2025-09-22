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
  viewMode: '2D' | '3D';
  selectedLevelId: string;
  setSelectedLevelId: (id: string) => void;
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
  viewMode,
  selectedLevelId,
  setSelectedLevelId,
}) => {
  const selectableUnits = units.filter(u => {
      const selectableTypes = [
          UnitType.CLASSROOM,
          UnitType.OFFICE,
          UnitType.ENTRANCE,
      ];
      return selectableTypes.includes(u.type);
    }).sort((a,b) => a.name.localeCompare(b.name));

  return (
    <div className="w-96 flex-shrink-0 bg-gray-900/80 backdrop-blur-sm p-6 space-y-6 overflow-y-auto h-full shadow-2xl rounded-r-2xl border-l border-gray-700">
      <div>
        <h1 className="text-3xl font-bold text-white">Indoor Navigator</h1>
        <p className="text-gray-400 mt-1">Find the best path indoors.</p>
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
              <option key={unit.id} value={unit.id}>{unit.name} (L{unit.levelId.slice(-1)})</option>
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
              <option key={unit.id} value={unit.id}>{unit.name} (L{unit.levelId.slice(-1)})</option>
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
            <label key={f} className="flex items-center space-x-2 text-gray-300">
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
          disabled={!startUnit || !endUnit}
          className="flex-1 bg-indigo-600 text-white font-bold py-2 px-4 rounded-md hover:bg-indigo-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
        >
          Find Path
        </button>
        <button
          onClick={onClearPath}
          className="flex-1 bg-gray-600 text-white font-bold py-2 px-4 rounded-md hover:bg-gray-700 transition-colors"
        >
          Clear
        </button>
      </div>

      {path && pathInstructions && (
        <div className="p-4 bg-gray-800 rounded-lg">
          <h3 className="font-bold text-lg mb-2 text-gray-200">Navigation Steps</h3>
          <p className="text-gray-300 whitespace-pre-wrap text-sm">{pathInstructions}</p>
        </div>
      )}

      <div className="pt-4 border-t border-gray-700">
        <Legend />
      </div>
    </div>
  );
};

export default Controls;