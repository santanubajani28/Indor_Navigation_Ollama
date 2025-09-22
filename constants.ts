
import { UnitType } from './types';

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

export const MAP_WIDTH = 1200;
export const MAP_HEIGHT = 800;
