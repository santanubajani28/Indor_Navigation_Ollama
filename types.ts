import { campusData } from "./data/campusData";

export enum UnitType {
  CLASSROOM = 'CLASSROOM',
  CORRIDOR = 'CORRIDOR',
  ELEVATOR = 'ELEVATOR',
  STAIRS = 'STAIRS',
  OFFICE = 'OFFICE',
  RESTRICTED = 'RESTRICTED',
  ENTRANCE = 'ENTRANCE',
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
}

export interface Unit {
  id: string;
  name: string;
  type: UnitType;
  levelId: string;
  polygon: Polygon;
  datasetId: number;
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
}

export interface CampusData {
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
  ELEVATOR_ONLY = 'ELEVATOR_ONLY',
}

export type Page = 'map' | 'admin';

export type Role = 'admin' | 'viewer';

export interface User {
  name: string;
  role: Role;
}