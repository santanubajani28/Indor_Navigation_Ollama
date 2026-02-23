
export enum UnitType {
  CLASSROOM = 'CLASSROOM',
  CORRIDOR = 'CORRIDOR',
  ELEVATOR = 'ELEVATOR',
  STAIRS = 'STAIRS',
  OFFICE = 'OFFICE',
  RESTRICTED = 'RESTRICTED',
  ENTRANCE = 'ENTRANCE',
  RESTAURANT = 'RESTAURANT',
}

export enum DetailType {
  WALL = 'WALL',
  DOOR = 'DOOR',
  WINDOW = 'WINDOW',
}

export type Point = {
  x: number;
  y: number;
};

export type Polygon = Point[];

export interface Detail {
  id: string;
  type: DetailType;
  levelId: string;
  line: Point[];
  datasetId: number;
  useType?: string; // e.g., 'Door-A', 'Wall-i', 'Dorr-R'
  height?: number; // From Height_Rel
}

export interface Unit {
  id: string;
  name: string; // From Display_Name
  type: UnitType;
  levelId: string;
  polygon: Polygon;
  datasetId: number;
  accessible?: boolean; // From Accessibility = 1
  // Used to link stairs/elevators across levels
  verticalConnectorId?: string;
}

export interface Level {
  id:string;
  name: string;
  facilityId: string;
  polygon: Polygon;
  zIndex: number;
  datasetId: number;
}

export interface Facility {
  id: string;
  name: string;
  polygon: Polygon;
  datasetId: number;
  siteId?: string;
}

export interface Site {
    id: string;
    name: string;
    polygon: Polygon;
    datasetId: number;
}

export interface CampusData {
  sites: Site[];
  facilities: Facility[];
  levels: Level[];
  units: Unit[];
  details: Detail[];
}

export interface Dataset {
    id: number;
    name: string;
    createdAt: string;
    isActive: boolean;
    originLat?: number;
    originLon?: number;
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

// FIX: Add missing types for the alternative graph generation logic.
// These types are used in `services/graphGenerator.ts`.
export interface NavGraphNode {
  id: string;
  type: 'center' | 'waypoint';
  point: Point;
  levelId: string;
  originalUnitId: string;
  unitType?: UnitType;
}

export interface NavGraphEdge {
    from: string;
    to: string;
    weight: number;
    type: 'horizontal' | 'vertical';
}

export interface NavigationGraph {
  nodes: NavGraphNode[];
  edges: Record<string, NavGraphEdge[]>;
}

export enum AccessibilityFilter {
  NONE = 'NONE',
  ELEVATOR_ONLY = 'ELEVATOR_ONLY',
}

export type Page = 'map' | 'admin';

export type Role = 'admin' | 'viewer';

export interface User {
  name: string;
  role: Role;
}

export interface Waypoint {
  point: Point;
  levelId: string;
}
