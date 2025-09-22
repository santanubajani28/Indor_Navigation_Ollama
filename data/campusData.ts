import type { CampusData } from '../types';
import { UnitType } from '../types';

export const campusData: CampusData = {
  facilities: [
    { id: 'F1', name: 'Engineering Building', polygon: [{x:0,y:0},{x:550,y:0},{x:550,y:800},{x:0,y:800}] },
  ],
  levels: [
    { id: 'L1', name: 'Ground Floor', facilityId: 'F1', zIndex: 0, polygon: [{x:10,y:10},{x:540,y:10},{x:540,y:790},{x:10,y:790}] },
    { id: 'L2', name: 'First Floor', facilityId: 'F1', zIndex: 1, polygon: [{x:610,y:10},{x:1140,y:10},{x:1140,y:790},{x:610,y:790}] },
  ],
  units: [
    // Level 1 Units
    { id: 'U100', name: 'Main Entrance', type: UnitType.ENTRANCE, levelId: 'L1', polygon: [{x:20,y:350},{x:100,y:350},{x:100,y:450},{x:20,y:450}] },
    // Adjusted Corridor 1A to connect to Stairs A
    { id: 'U101', name: 'Corridor 1A', type: UnitType.CORRIDOR, levelId: 'L1', polygon: [{x:100,y:200},{x:450,y:200},{x:450,y:250},{x:100,y:250}] },
    // Adjusted Corridor 1B to connect to Elevator A
    { id: 'U102', name: 'Corridor 1B', type: UnitType.CORRIDOR, levelId: 'L1', polygon: [{x:100,y:550},{x:450,y:550},{x:450,y:600},{x:100,y:600}] },
    { id: 'U103', name: 'Main Corridor 1', type: UnitType.CORRIDOR, levelId: 'L1', polygon: [{x:100,y:250},{x:150,y:250},{x:150,y:550},{x:100,y:550}] },
    { id: 'U104', name: 'Classroom 101', type: UnitType.CLASSROOM, levelId: 'L1', polygon: [{x:150,y:250},{x:300,y:250},{x:300,y:400},{x:150,y:400}] },
    { id: 'U105', name: 'Office 102', type: UnitType.OFFICE, levelId: 'L1', polygon: [{x:300,y:250},{x:450,y:250},{x:450,y:400},{x:300,y:400}] },
    { id: 'U106', name: 'Classroom 103', type: UnitType.CLASSROOM, levelId: 'L1', polygon: [{x:150,y:400},{x:300,y:400},{x:300,y:550},{x:150,y:550}] },
    { id: 'U107', name: 'Restricted Pump Room', type: UnitType.RESTRICTED, levelId: 'L1', polygon: [{x:300,y:400},{x:450,y:400},{x:450,y:550},{x:300,y:550}] },
    // Moved Stairs A to the end of Corridor 1A
    { id: 'U108', name: 'Stairs A', type: UnitType.STAIRS, levelId: 'L1', verticalConnectorId: 'V1', polygon: [{x:450,y:200},{x:520,y:200},{x:520,y:250},{x:450,y:250}] },
    // Moved Elevator A to the end of Corridor 1B
    { id: 'U109', name: 'Elevator A', type: UnitType.ELEVATOR, levelId: 'L1', verticalConnectorId: 'V2', polygon: [{x:450,y:550},{x:520,y:550},{x:520,y:600},{x:450,y:600}] },
    
    // Level 2 Units
    // Adjusted Corridor 2A to connect to Stairs A
    { id: 'U201', name: 'Corridor 2A', type: UnitType.CORRIDOR, levelId: 'L2', polygon: [{x:700,y:200},{x:1050,y:200},{x:1050,y:250},{x:700,y:250}] },
    // Adjusted Corridor 2B to connect to Elevator A
    { id: 'U202', name: 'Corridor 2B', type: UnitType.CORRIDOR, levelId: 'L2', polygon: [{x:700,y:550},{x:1050,y:550},{x:1050,y:600},{x:700,y:600}] },
    { id: 'U203', name: 'Main Corridor 2', type: UnitType.CORRIDOR, levelId: 'L2', polygon: [{x:700,y:250},{x:750,y:250},{x:750,y:550},{x:700,y:550}] },
    { id: 'U204', name: 'Classroom 201', type: UnitType.CLASSROOM, levelId: 'L2', polygon: [{x:750,y:250},{x:900,y:250},{x:900,y:400},{x:750,y:400}] },
    { id: 'U205', name: 'Office 202', type: UnitType.OFFICE, levelId: 'L2', polygon: [{x:900,y:250},{x:1050,y:250},{x:1050,y:400},{x:900,y:400}] },
    { id: 'U206', name: 'Classroom 203', type: UnitType.CLASSROOM, levelId: 'L2', polygon: [{x:750,y:400},{x:900,y:400},{x:900,y:550},{x:750,y:550}] },
    { id: 'U207', name: 'Office 204', type: UnitType.OFFICE, levelId: 'L2', polygon: [{x:900,y:400},{x:1050,y:400},{x:1050,y:550},{x:900,y:550}] },
    // Moved Stairs A to the end of Corridor 2A
    { id: 'U208', name: 'Stairs A', type: UnitType.STAIRS, levelId: 'L2', verticalConnectorId: 'V1', polygon: [{x:1050,y:200},{x:1120,y:200},{x:1120,y:250},{x:1050,y:250}] },
    // Moved Elevator A to the end of Corridor 2B
    { id: 'U209', name: 'Elevator A', type: UnitType.ELEVATOR, levelId: 'L2', verticalConnectorId: 'V2', polygon: [{x:1050,y:550},{x:1120,y:550},{x:1120,y:600},{x:1050,y:600}] },
  ],
};
