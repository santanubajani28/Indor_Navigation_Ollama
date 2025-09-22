import type { CampusData } from '../types';
import { UnitType, DetailType } from '../types';

export const campusData: CampusData = {
  facilities: [
    // FIX: Add datasetId to satisfy Facility type
    { id: 'F1', name: 'Engineering Building', polygon: [{x:0,y:0},{x:550,y:0},{x:5550,y:800},{x:0,y:800}], datasetId: 1 },
  ],
  levels: [
    // FIX: Add datasetId to satisfy Level type
    { id: 'L1', name: 'Ground Floor', facilityId: 'F1', zIndex: 0, polygon: [{x:10,y:10},{x:540,y:10},{x:540,y:790},{x:10,y:790}], datasetId: 1 },
    // FIX: Add datasetId to satisfy Level type
    { id: 'L2', name: 'First Floor', facilityId: 'F1', zIndex: 1, polygon: [{x:610,y:10},{x:1140,y:10},{x:1140,y:790},{x:610,y:790}], datasetId: 1 },
  ],
  units: [
    // Level 1 Units
    // FIX: Add datasetId to satisfy Unit type
    { id: 'U100', name: 'Main Entrance', type: UnitType.ENTRANCE, levelId: 'L1', polygon: [{x:20,y:350},{x:100,y:350},{x:100,y:450},{x:20,y:450}], datasetId: 1 },
    { id: 'U101', name: 'Corridor 1A', type: UnitType.CORRIDOR, levelId: 'L1', polygon: [{x:100,y:200},{x:450,y:200},{x:450,y:250},{x:100,y:250}], datasetId: 1 },
    { id: 'U102', name: 'Corridor 1B', type: UnitType.CORRIDOR, levelId: 'L1', polygon: [{x:100,y:550},{x:450,y:550},{x:450,y:600},{x:100,y:600}], datasetId: 1 },
    { id: 'U103', name: 'Main Corridor 1', type: UnitType.CORRIDOR, levelId: 'L1', polygon: [{x:100,y:250},{x:150,y:250},{x:150,y:550},{x:100,y:550}], datasetId: 1 },
    { id: 'U104', name: 'Classroom 101', type: UnitType.CLASSROOM, levelId: 'L1', polygon: [{x:150,y:250},{x:300,y:250},{x:300,y:400},{x:150,y:400}], datasetId: 1 },
    { id: 'U105', name: 'Office 102', type: UnitType.OFFICE, levelId: 'L1', polygon: [{x:300,y:250},{x:450,y:250},{x:450,y:400},{x:300,y:400}], datasetId: 1 },
    { id: 'U106', name: 'Classroom 103', type: UnitType.CLASSROOM, levelId: 'L1', polygon: [{x:150,y:400},{x:300,y:400},{x:300,y:550},{x:150,y:550}], datasetId: 1 },
    { id: 'U107', name: 'Restricted Pump Room', type: UnitType.RESTRICTED, levelId: 'L1', polygon: [{x:300,y:400},{x:450,y:400},{x:450,y:550},{x:300,y:550}], datasetId: 1 },
    { id: 'U108', name: 'Stairs A', type: UnitType.STAIRS, levelId: 'L1', verticalConnectorId: 'V1', polygon: [{x:450,y:200},{x:520,y:200},{x:520,y:250},{x:450,y:250}], datasetId: 1 },
    { id: 'U109', name: 'Elevator A', type: UnitType.ELEVATOR, levelId: 'L1', verticalConnectorId: 'V2', polygon: [{x:450,y:550},{x:520,y:550},{x:520,y:600},{x:450,y:600}], datasetId: 1 },
    
    // Level 2 Units
    { id: 'U201', name: 'Corridor 2A', type: UnitType.CORRIDOR, levelId: 'L2', polygon: [{x:700,y:200},{x:1050,y:200},{x:1050,y:250},{x:700,y:250}], datasetId: 1 },
    { id: 'U202', name: 'Corridor 2B', type: UnitType.CORRIDOR, levelId: 'L2', polygon: [{x:700,y:550},{x:1050,y:550},{x:1050,y:600},{x:700,y:600}], datasetId: 1 },
    { id: 'U203', name: 'Main Corridor 2', type: UnitType.CORRIDOR, levelId: 'L2', polygon: [{x:700,y:250},{x:750,y:250},{x:750,y:550},{x:700,y:550}], datasetId: 1 },
    { id: 'U204', name: 'Classroom 201', type: UnitType.CLASSROOM, levelId: 'L2', polygon: [{x:750,y:250},{x:900,y:250},{x:900,y:400},{x:750,y:400}], datasetId: 1 },
    { id: 'U205', name: 'Office 202', type: UnitType.OFFICE, levelId: 'L2', polygon: [{x:900,y:250},{x:1050,y:250},{x:1050,y:400},{x:900,y:400}], datasetId: 1 },
    { id: 'U206', name: 'Classroom 203', type: UnitType.CLASSROOM, levelId: 'L2', polygon: [{x:750,y:400},{x:900,y:400},{x:900,y:550},{x:750,y:550}], datasetId: 1 },
    { id: 'U207', name: 'Office 204', type: UnitType.OFFICE, levelId: 'L2', polygon: [{x:900,y:400},{x:1050,y:400},{x:1050,y:550},{x:900,y:550}], datasetId: 1 },
    { id: 'U208', name: 'Stairs A', type: UnitType.STAIRS, levelId: 'L2', verticalConnectorId: 'V1', polygon: [{x:1050,y:200},{x:1120,y:200},{x:1120,y:250},{x:1050,y:250}], datasetId: 1 },
    { id: 'U209', name: 'Elevator A', type: UnitType.ELEVATOR, levelId: 'L2', verticalConnectorId: 'V2', polygon: [{x:1050,y:550},{x:1120,y:550},{x:1120,y:600},{x:1050,y:600}], datasetId: 1 },
  ],
  details: [
    // LEVEL 1 - EXTERIOR WALLS
    // FIX: Add datasetId to satisfy Detail type
    { id: 'D1_EXT_1', type: DetailType.WALL, levelId: 'L1', line: [{x:20,y:350},{x:20,y:450}], datasetId: 1 },
    { id: 'D1_EXT_2', type: DetailType.WALL, levelId: 'L1', line: [{x:20,y:450},{x:100,y:450}], datasetId: 1 },
    { id: 'D1_EXT_3', type: DetailType.WALL, levelId: 'L1', line: [{x:100,y:600},{x:450,y:600}], datasetId: 1 },
    { id: 'D1_EXT_4', type: DetailType.WALL, levelId: 'L1', line: [{x:520,y:600},{x:520,y:550}], datasetId: 1 },
    { id: 'D1_EXT_5', type: DetailType.WALL, levelId: 'L1', line: [{x:520,y:250},{x:520,y:200}], datasetId: 1 },
    { id: 'D1_EXT_6', type: DetailType.WALL, levelId: 'L1', line: [{x:520,y:200},{x:100,y:200}], datasetId: 1 },
    { id: 'D1_EXT_7', type: DetailType.WALL, levelId: 'L1', line: [{x:100,y:200},{x:100,y:250}], datasetId: 1 },
    { id: 'D1_EXT_8', type: DetailType.WALL, levelId: 'L1', line: [{x:100,y:550},{x:100,y:600}], datasetId: 1 },
    
    // LEVEL 1 - INTERIOR WALLS
    // Entrance U100 walls
    { id: 'D1_INT_1', type: DetailType.WALL, levelId: 'L1', line: [{x:100,y:350},{x:100,y:450}], datasetId: 1 },
    { id: 'D1_DOOR_ENTRANCE', type: DetailType.DOOR, levelId: 'L1', line: [{x:20,y:380},{x:20,y:420}], datasetId: 1 }, // Entrance door
    
    // Main Corridor U103
    { id: 'D1_INT_2', type: DetailType.WALL, levelId: 'L1', line: [{x:100,y:250},{x:100,y:350}], datasetId: 1 }, // Connects to entrance
    { id: 'D1_INT_3', type: DetailType.WALL, levelId: 'L1', line: [{x:100,y:450},{x:100,y:550}], datasetId: 1 }, // Connects to entrance
    
    // Classroom 101 (U104)
    { id: 'D1_INT_U104_1', type: DetailType.WALL, levelId: 'L1', line: [{x:150,y:250},{x:300,y:250}], datasetId: 1 },
    { id: 'D1_INT_U104_2', type: DetailType.WALL, levelId: 'L1', line: [{x:300,y:250},{x:300,y:400}], datasetId: 1 },
    { id: 'D1_INT_U104_3', type: DetailType.WALL, levelId: 'L1', line: [{x:150,y:400},{x:300,y:400}], datasetId: 1 },
    { id: 'D1_DOOR_U104', type: DetailType.DOOR, levelId: 'L1', line: [{x:150,y:310},{x:150,y:330}], datasetId: 1 },
    { id: 'D1_WALL_U104_A', type: DetailType.WALL, levelId: 'L1', line: [{x:150,y:250},{x:150,y:310}], datasetId: 1 },
    { id: 'D1_WALL_U104_B', type: DetailType.WALL, levelId: 'L1', line: [{x:150,y:330},{x:150,y:400}], datasetId: 1 },
    
    // Office 102 (U105)
    { id: 'D1_INT_U105_1', type: DetailType.WALL, levelId: 'L1', line: [{x:300,y:250},{x:450,y:250}], datasetId: 1 },
    { id: 'D1_INT_U105_2', type: DetailType.WALL, levelId: 'L1', line: [{x:450,y:250},{x:450,y:400}], datasetId: 1 },
    { id: 'D1_INT_U105_3', type: DetailType.WALL, levelId: 'L1', line: [{x:300,y:400},{x:450,y:400}], datasetId: 1 },
    { id: 'D1_DOOR_U105', type: DetailType.DOOR, levelId: 'L1', line: [{x:310,y:250},{x:330,y:250}], datasetId: 1 },
    
    // Classroom 103 (U106)
    { id: 'D1_INT_U106_1', type: DetailType.WALL, levelId: 'L1', line: [{x:150,y:550},{x:300,y:550}], datasetId: 1 },
    { id: 'D1_INT_U106_2', type: DetailType.WALL, levelId: 'L1', line: [{x:300,y:400},{x:300,y:550}], datasetId: 1 },
    { id: 'D1_DOOR_U106', type: DetailType.DOOR, levelId: 'L1', line: [{x:150,y:470},{x:150,y:490}], datasetId: 1 },
    { id: 'D1_WALL_U106_A', type: DetailType.WALL, levelId: 'L1', line: [{x:150,y:400},{x:150,y:470}], datasetId: 1 },
    { id: 'D1_WALL_U106_B', type: DetailType.WALL, levelId: 'L1', line: [{x:150,y:490},{x:150,y:550}], datasetId: 1 },

    // Restricted Room (U107) - no door from corridor
    { id: 'D1_INT_U107_1', type: DetailType.WALL, levelId: 'L1', line: [{x:300,y:550},{x:450,y:550}], datasetId: 1 },
    { id: 'D1_INT_U107_2', type: DetailType.WALL, levelId: 'L1', line: [{x:450,y:400},{x:450,y:550}], datasetId: 1 },
    
    // Connections to Stairs/Elevator
    { id: 'D1_INT_S_E_1', type: DetailType.WALL, levelId: 'L1', line: [{x:450,y:200},{x:450,y:250}], datasetId: 1 },
    { id: 'D1_INT_S_E_2', type: DetailType.WALL, levelId: 'L1', line: [{x:450,y:550},{x:450,y:600}], datasetId: 1 },

    // LEVEL 2 - EXTERIOR WALLS
    { id: 'D2_EXT_1', type: DetailType.WALL, levelId: 'L2', line: [{x:700,y:200},{x:700,y:550}], datasetId: 1 },
    { id: 'D2_EXT_2', type: DetailType.WALL, levelId: 'L2', line: [{x:700,y:200},{x:1050,y:200}], datasetId: 1 },
    { id: 'D2_EXT_3', type: DetailType.WALL, levelId: 'L2', line: [{x:1120,y:200},{x:1120,y:250}], datasetId: 1 },
    { id: 'D2_EXT_4', type: DetailType.WALL, levelId: 'L2', line: [{x:1050,y:250},{x:1120,y:250}], datasetId: 1 },
    { id: 'D2_EXT_5', type: DetailType.WALL, levelId: 'L2', line: [{x:1050,y:600},{x:700,y:600}], datasetId: 1 },
    { id: 'D2_EXT_6', type: DetailType.WALL, levelId: 'L2', line: [{x:1120,y:600},{x:1120,y:550}], datasetId: 1 },
    { id: 'D2_EXT_7', type: DetailType.WALL, levelId: 'L2', line: [{x:1050,y:550},{x:1120,y:550}], datasetId: 1 },
    { id: 'D2_EXT_8', type: DetailType.WALL, levelId: 'L2', line: [{x:700,y:550},{x:700,y:600}], datasetId: 1 },

    // LEVEL 2 - INTERIOR WALLS
    // Main Corridor U203
    { id: 'D2_INT_1', type: DetailType.WALL, levelId: 'L2', line: [{x:750,y:250},{x:750,y:550}], datasetId: 1 },

    // Classroom 201 (U204)
    { id: 'D2_INT_U204_1', type: DetailType.WALL, levelId: 'L2', line: [{x:750,y:250},{x:900,y:250}], datasetId: 1 },
    { id: 'D2_INT_U204_2', type: DetailType.WALL, levelId: 'L2', line: [{x:900,y:250},{x:900,y:400}], datasetId: 1 },
    { id: 'D2_INT_U204_3', type: DetailType.WALL, levelId: 'L2', line: [{x:750,y:400},{x:900,y:400}], datasetId: 1 },
    { id: 'D2_DOOR_U204', type: DetailType.DOOR, levelId: 'L2', line: [{x:750,y:310},{x:750,y:330}], datasetId: 1 },
    
    // Office 202 (U205)
    { id: 'D2_INT_U205_1', type: DetailType.WALL, levelId: 'L2', line: [{x:900,y:250},{x:1050,y:250}], datasetId: 1 },
    { id: 'D2_INT_U205_2', type: DetailType.WALL, levelId: 'L2', line: [{x:1050,y:250},{x:1050,y:400}], datasetId: 1 },
    { id: 'D2_INT_U205_3', type: DetailType.WALL, levelId: 'L2', line: [{x:900,y:400},{x:1050,y:400}], datasetId: 1 },
    { id: 'D2_DOOR_U205', type: DetailType.DOOR, levelId: 'L2', line: [{x:1050,y:310},{x:1050,y:330}], datasetId: 1 },

    // Classroom 203 (U206)
    { id: 'D2_INT_U206_1', type: DetailType.WALL, levelId: 'L2', line: [{x:750,y:550},{x:900,y:550}], datasetId: 1 },
    { id: 'D2_INT_U206_2', type: DetailType.WALL, levelId: 'L2', line: [{x:900,y:400},{x:900,y:550}], datasetId: 1 },
    { id: 'D2_DOOR_U206', type: DetailType.DOOR, levelId: 'L2', line: [{x:750,y:470},{x:750,y:490}], datasetId: 1 },
    
    // Office 204 (U207)
    { id: 'D2_INT_U207_1', type: DetailType.WALL, levelId: 'L2', line: [{x:900,y:550},{x:1050,y:550}], datasetId: 1 },
    { id: 'D2_INT_U207_2', type: DetailType.WALL, levelId: 'L2', line: [{x:1050,y:400},{x:1050,y:550}], datasetId: 1 },
    { id: 'D2_DOOR_U207', type: DetailType.DOOR, levelId: 'L2', line: [{x:1050,y:470},{x:1050,y:490}], datasetId: 1 },
    
    // Connections to Stairs/Elevator on L2
    { id: 'D2_INT_S_E_1', type: DetailType.WALL, levelId: 'L2', line: [{x:1050,y:200},{x:1050,y:250}], datasetId: 1 },
    { id: 'D2_INT_S_E_2', type: DetailType.WALL, levelId: 'L2', line: [{x:1050,y:550},{x:1050,y:600}], datasetId: 1 },
  ]
};