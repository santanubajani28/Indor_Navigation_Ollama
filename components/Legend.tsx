
import React from 'react';
import { UnitType } from '../types';
import { UNIT_TYPE_COLORS } from '../constants';

const Legend: React.FC = () => {
  return (
    <div className="p-4 bg-gray-800 rounded-lg shadow-lg">
      <h3 className="text-lg font-bold mb-3 text-gray-200">Legend</h3>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {Object.entries(UNIT_TYPE_COLORS).map(([type, colorClass]) => (
          <div key={type} className="flex items-center space-x-2">
            <div className={`w-4 h-4 rounded-sm ${colorClass}`}></div>
            <span className="text-sm capitalize text-gray-300">{type.toLowerCase().replace('_', ' ')}</span>
          </div>
        ))}
        <div className="flex items-center space-x-2">
            <div className={`w-4 h-4 rounded-sm bg-blue-500`}></div>
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