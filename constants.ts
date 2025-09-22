import { DetailType, UnitType } from './types';

export const UNIT_TYPE_COLORS: Record<UnitType, string> = {
  [UnitType.CLASSROOM]: 'bg-sky-800',
  [UnitType.CORRIDOR]: 'bg-gray-600',
  [UnitType.ELEVATOR]: 'bg-purple-600',
  [UnitType.STAIRS]: 'bg-orange-600',
  [UnitType.OFFICE]: 'bg-teal-800',
  [UnitType.RESTRICTED]: 'bg-red-900',
  [UnitType.ENTRANCE]: 'bg-green-600',
};

export const UNIT_TYPE_BORDERS: Record<UnitType, string> = {
    [UnitType.CLASSROOM]: 'stroke-sky-500',
    [UnitType.CORRIDOR]: 'stroke-gray-400',
    [UnitType.ELEVATOR]: 'stroke-purple-400',
    [UnitType.STAIRS]: 'stroke-orange-400',
    [UnitType.OFFICE]: 'stroke-teal-500',
    [UnitType.RESTRICTED]: 'stroke-red-600',
    [UnitType.ENTRANCE]: 'stroke-green-400',
};

// New constants for the 3D viewer
export const UNIT_TYPE_COLORS_3D: Record<UnitType, number> = {
  [UnitType.CLASSROOM]: 0x075985,
  [UnitType.CORRIDOR]: 0x4B5563,
  [UnitType.ELEVATOR]: 0x9333EA,
  [UnitType.STAIRS]: 0xEA580C,
  [UnitType.OFFICE]: 0x115E59,
  [UnitType.RESTRICTED]: 0x7F1D1D,
  [UnitType.ENTRANCE]: 0x16A34A,
};

export const DETAIL_TYPE_COLORS_3D: Record<DetailType, number> = {
  [DetailType.WALL]: 0xcccccc, // light grey
  [DetailType.DOOR]: 0x85533c, // brown
  [DetailType.WINDOW]: 0x87ceeb, // sky blue
};
export const WALL_THICKNESS = 2;
export const DOOR_HEIGHT_REDUCTION = 0.5; // Doors are 0.5m shorter than walls

export const MAP_WIDTH = 1200;
export const MAP_HEIGHT = 800;

export const UNIT_HEIGHT = 3; // 3 meters
export const LEVEL_SEPARATION = 5; // 5 meters of space between floors