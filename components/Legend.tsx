
import React, { useMemo } from 'react';
import type { Unit, UnitType } from '../types';
import { UNIT_TYPE_COLORS } from '../constants';

interface LegendProps {
  units: Unit[];
}

const Legend: React.FC<LegendProps> = ({ units }) => {
  const availableUnitTypes = useMemo(() => {
    const types = new Set<UnitType>();
    units.forEach(unit => types.add(unit.type));
    // Sort to ensure a consistent order every time
    return Array.from(types).sort((a, b) => a.localeCompare(b));
  }, [units]);

  return (
    <div className="p-4 bg-gray-800 rounded-lg shadow-lg">
      <h3 className="text-lg font-bold mb-3 text-gray-200">Legend</h3>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {availableUnitTypes.map(type => (
          <div key={type} className="flex items-center space-x-2">
            <div className={`w-4 h-4 rounded-sm ${UNIT_TYPE_COLORS[type]}`}></div>
            <span className="text-sm capitalize text-gray-300">{type.toLowerCase().replace('_', ' ')}</span>
          </div>
        ))}
        <div className="flex items-center space-x-2">
            <div className={`w-4 h-4 rounded-sm bg-red-500`}></div>
            <span className="text-sm capitalize text-gray-300">Path</span>
        </div>
        <div className="flex items-center space-x-2">
            <div className={`w-4 h-4 rounded-full bg-green-500`}></div>
            <span className="text-sm capitalize text-gray-300">Start Point</span>
        </div>
        <div className="flex items-center space-x-2">
            <div className={`w-4 h-4 rounded-full bg-red-500`}></div>
            <span className="text-sm capitalize text-gray-300">End Point</span>
        </div>
         <div className="flex items-center space-x-2">
            <div className={`w-4 h-4 rounded-sm bg-yellow-400`}></div>
            <span className="text-sm capitalize text-gray-300">Selected Units</span>
        </div>
      </div>
    </div>
  );
};

export default Legend;
