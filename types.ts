
export enum UnitType {
  CLASSROOM = 'CLASSROOM',
  CORRIDOR = 'CORRIDOR',
  ELEVATOR = 'ELEVATOR',
  STAIRS = 'STAIRS',
  OFFICE = 'OFFICE',
  RESTRICTED = 'RESTRICTED',
  ENTRANCE = 'ENTRANCE',
}

export type Point = {
  x: number;
  y: number;
};

export type Polygon = Point[];

export interface Unit {
  id: string;
  name: string;
  type: UnitType;
  levelId: string;
  polygon: Polygon;
  // Used to link stairs/elevators across levels
  verticalConnectorId?: string;
}

export interface Level {
  id:string;
  name: string;
  facilityId: string;
  polygon: Polygon;
  zIndex: number;
}

export interface Facility {
  id: string;
  name: string;
  polygon: Polygon;
}

export interface CampusData {
  facilities: Facility[];
  levels: Level[];
  units: Unit[];
}

export interface GraphNode {
  id: string; // unit id
  unit: Unit;
}

export interface GraphEdge {
  from: string;
  to: string;
  weight: number;
  type: 'horizontal' | 'vertical';
}

export interface Graph {
  nodes: Map<string, GraphNode>;
  edges: Map<string, GraphEdge[]>;
}

export enum AccessibilityFilter {
  NONE = 'NONE',
  NO_STAIRS = 'NO_STAIRS',
  ELEVATOR_ONLY = 'ELEVATOR_ONLY',
}
