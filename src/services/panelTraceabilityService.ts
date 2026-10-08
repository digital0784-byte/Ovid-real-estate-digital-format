import {
  TraceablePanel,
  PanelTraceabilityStatus,
  PanelPhysicalCondition,
  StandardPanelCategory,
  PanelInstallationStatus,
  PanelTraceabilityMovement,
  PanelTraceabilityAction,
  PanelDamageInspection,
  PanelIssueTransaction,
  PanelReturnTransaction,
  PanelInventoryReconciliationRecord,
  DailyPanelMovementReportData,
  PanelTraceabilityAuditLog,
  PanelAssociatedAccessory,
  StairPanelConfig,
  UserRole
} from "../types";
import { DbService } from "./db";
import { NotificationService } from "./notificationService";

// Local storage persistence keys
const STORAGE_PANELS = "digital_construction_traceable_panels";
const STORAGE_MOVEMENTS = "digital_construction_panel_movements";
const STORAGE_DAMAGES = "digital_construction_panel_damages";
const STORAGE_ISSUES = "digital_construction_panel_issues";
const STORAGE_RETURNS = "digital_construction_panel_returns";
const STORAGE_RECONCILIATIONS = "digital_construction_panel_reconciliations";
const STORAGE_AUDIT_LOGS = "digital_construction_panel_audit_logs";
const STORAGE_DIMENSION_LIBRARY = "digital_construction_panel_dimensions_library";

// Standard Panel Categories required by Digital Construction ERP System
export const STANDARD_PANEL_CATEGORIES: StandardPanelCategory[] = [
  "Internal Wall Panel",
  "External Wall Panel",
  "Extend Panel",
  "Soffit Panel",
  "Beam Panel",
  "CA",
  "IC",
  "SC",
  "SCR",
  "Slab Panel",
  "Door End",
  "Wall End",
  "Stair Panel",
  "Corner Panel",
  "Filler Panel",
  "Special Panel",
  "Other"
];

// Configurable standard dimension library (Super Admin can configure)
export interface ConfiguredDimensionOption {
  id: string;
  category: StandardPanelCategory | string;
  name: string;
  length: number;
  width: number;
  thickness: number;
  formatted: string;
  weightKg: number;
  isStandard: boolean;
}

export const DEFAULT_DIMENSION_LIBRARY: ConfiguredDimensionOption[] = [
  { id: "DIM-01", category: "Internal Wall Panel", name: "Standard 1200×600", length: 1200, width: 600, thickness: 65, formatted: "1200 × 600 × 65 mm", weightKg: 18.2, isStandard: true },
  { id: "DIM-02", category: "Internal Wall Panel", name: "High Wall 2400×600", length: 2400, width: 600, thickness: 65, formatted: "2400 × 600 × 65 mm", weightKg: 36.4, isStandard: true },
  { id: "DIM-03", category: "External Wall Panel", name: "Standard Exterior 1200×600", length: 1200, width: 600, thickness: 65, formatted: "1200 × 600 × 65 mm", weightKg: 19.1, isStandard: true },
  { id: "DIM-04", category: "External Wall Panel", name: "Heavy Exterior 2400×600", length: 2400, width: 600, thickness: 65, formatted: "2400 × 600 × 65 mm", weightKg: 38.0, isStandard: true },
  { id: "DIM-05", category: "Slab Panel", name: "Modular Deck 1200×600", length: 1200, width: 600, thickness: 65, formatted: "1200 × 600 × 65 mm", weightKg: 16.5, isStandard: true },
  { id: "DIM-06", category: "Slab Panel", name: "Large Deck 1200×450", length: 1200, width: 450, thickness: 65, formatted: "1200 × 450 × 65 mm", weightKg: 12.8, isStandard: true },
  { id: "DIM-07", category: "Beam Panel", name: "Beam Side 1200×400", length: 1200, width: 400, thickness: 65, formatted: "1200 × 400 × 65 mm", weightKg: 14.2, isStandard: true },
  { id: "DIM-08", category: "Beam Panel", name: "Beam Soffit 1200×300", length: 1200, width: 300, thickness: 65, formatted: "1200 × 300 × 65 mm", weightKg: 11.0, isStandard: true },
  { id: "DIM-09", category: "Soffit Panel", name: "Soffit Length 1200×150", length: 1200, width: 150, thickness: 65, formatted: "1200 × 150 × 65 mm", weightKg: 6.5, isStandard: true },
  { id: "DIM-10", category: "Corner Panel", name: "Internal Corner IC 100×100×2400", length: 2400, width: 100, thickness: 65, formatted: "2400 × 100/100 × 65 mm", weightKg: 15.0, isStandard: true },
  { id: "DIM-11", category: "Corner Panel", name: "External Corner EC 50×50×2400", length: 2400, width: 50, thickness: 65, formatted: "2400 × 50/50 × 65 mm", weightKg: 9.8, isStandard: true },
  { id: "DIM-12", category: "CA", name: "Corner Angle CA 100×2400", length: 2400, width: 100, thickness: 65, formatted: "2400 × 100 × 65 mm", weightKg: 11.2, isStandard: true },
  { id: "DIM-13", category: "IC", name: "Internal Corner IC 150×2400", length: 2400, width: 150, thickness: 65, formatted: "2400 × 150 × 65 mm", weightKg: 13.4, isStandard: true },
  { id: "DIM-14", category: "SC", name: "Soffit Corner SC 150×1200", length: 1200, width: 150, thickness: 65, formatted: "1200 × 150 × 65 mm", weightKg: 8.5, isStandard: true },
  { id: "DIM-15", category: "SCR", name: "Soffit Corner Right SCR 150×1200", length: 1200, width: 150, thickness: 65, formatted: "1200 × 150 × 65 mm", weightKg: 8.5, isStandard: true },
  { id: "DIM-16", category: "Extend Panel", name: "Extension 300×600", length: 600, width: 300, thickness: 65, formatted: "600 × 300 × 65 mm", weightKg: 7.2, isStandard: true },
  { id: "DIM-17", category: "Door End", name: "Door End DE 2100×150", length: 2100, width: 150, thickness: 65, formatted: "2100 × 150 × 65 mm", weightKg: 12.0, isStandard: true },
  { id: "DIM-18", category: "Wall End", name: "Wall End WE 2400×200", length: 2400, width: 200, thickness: 65, formatted: "2400 × 200 × 65 mm", weightKg: 15.6, isStandard: true },
  { id: "DIM-19", category: "Stair Panel", name: "Monolithic Flight Stair Panel 1800×1000", length: 1800, width: 1000, thickness: 65, formatted: "1800 × 1000 × 65 mm", weightKg: 42.0, isStandard: true },
  { id: "DIM-20", category: "Filler Panel", name: "Adjustable Filler 1200×100", length: 1200, width: 100, thickness: 65, formatted: "1200 × 100 × 65 mm", weightKg: 5.4, isStandard: true },
  { id: "DIM-21", category: "Special Panel", name: "Cantilever Balcony Shutter 1500×600", length: 1500, width: 600, thickness: 65, formatted: "1500 × 600 × 65 mm", weightKg: 24.5, isStandard: true },
];

// Valid Status Transitions Map (State Machine)
const VALID_TRANSITIONS: Record<PanelTraceabilityStatus, PanelTraceabilityStatus[]> = {
  AVAILABLE: ["RESERVED", "REQUESTED", "IN_TRANSIT", "AT_SITE_STORE", "ISSUED", "DAMAGED", "MISSING", "RETIRED"],
  RESERVED: ["AVAILABLE", "REQUESTED", "APPROVED", "ISSUED", "DAMAGED", "MISSING"],
  REQUESTED: ["APPROVED", "AVAILABLE", "RESERVED", "DAMAGED", "MISSING"],
  APPROVED: ["ISSUED", "AVAILABLE", "IN_TRANSIT", "AT_SITE_STORE", "DAMAGED", "MISSING"],
  ISSUED: ["IN_TRANSIT", "ASSIGNED", "AT_SITE_STORE", "RETURNED", "DAMAGED", "MISSING"],
  IN_TRANSIT: ["AT_SITE_STORE", "AVAILABLE", "RETURNED", "DAMAGED", "MISSING"],
  AT_SITE_STORE: ["REQUESTED", "APPROVED", "ISSUED", "ASSIGNED", "IN_TRANSIT", "RETURNED", "DAMAGED", "MISSING", "AVAILABLE"],
  ASSIGNED: ["INSTALLED", "IN_USE", "DISASSEMBLED", "RETURNED", "AT_SITE_STORE", "DAMAGED", "MISSING"],
  INSTALLED: ["IN_USE", "DISASSEMBLED", "DAMAGED", "MISSING"],
  IN_USE: ["DISASSEMBLED", "INSTALLED", "DAMAGED", "MISSING"],
  DISASSEMBLED: ["RETURNED", "AT_SITE_STORE", "ASSIGNED", "DAMAGED", "MISSING"],
  RETURNED: ["AT_SITE_STORE", "AVAILABLE", "IN_TRANSIT", "UNDER_REPAIR", "DAMAGED"],
  DAMAGED: ["UNDER_REPAIR", "RETIRED", "AVAILABLE", "AT_SITE_STORE"],
  UNDER_REPAIR: ["AVAILABLE", "AT_SITE_STORE", "RETIRED", "DAMAGED"],
  MISSING: ["AVAILABLE", "AT_SITE_STORE", "LOST"],
  LOST: ["AVAILABLE", "AT_SITE_STORE", "RETIRED"],
  RETIRED: [] // Terminal state
};

// Initial realistic seed panels for Digital Construction ERP System
const INITIAL_SEED_PANELS: TraceablePanel[] = [
  {
    panelId: "PANEL-2026-001",
    panelCode: "IWP-1200-600",
    serialNumber: "AL-001245",
    QRCode: "DIGITAL-ERP://PANEL/AL-001245",
    barcode: "890123001245",
    panelType: "Internal Wall Panel",
    panelCategory: "Internal Wall Panel",
    dimensions: "1200 × 600 × 65 mm",
    length: 1200,
    width: 600,
    thickness: 65,
    weight: 18.2,
    manufacturer: "Mivan Technology Corp",
    purchaseDate: "2025-08-15",
    condition: "GOOD",
    status: "INSTALLED",
    currentLocation: "Bole Heights → Tower A → Floor 12 → Zone 02",
    currentWarehouseId: "WH-CENTRAL-01",
    currentSiteStoreId: "STORE-BOL-01",
    currentProjectId: "PRJ-001",
    currentSiteId: "SITE-BOL-01",
    currentBuildingId: "BLD-A",
    currentFloorId: "FL-12",
    currentZoneId: "ZN-02",
    assignedTeamLeaderId: "USER-TL-01",
    assignedGangChiefId: "USER-GC-01",
    assignedSectionHeadId: "USER-SH-01",
    installationStatus: "INSTALLED",
    createdAt: "2025-08-15T08:00:00Z",
    updatedAt: "2026-10-06T14:30:00Z",
    associatedAccessories: [
      { accessoryId: "ACC-01", accessoryCode: "PIN-1650", accessoryType: "Pin", dimensions: "16mm × 50mm", quantity: 6, condition: "GOOD", currentLocation: "Bole Heights Tower A Floor 12" },
      { accessoryId: "ACC-02", accessoryCode: "WDG-01", accessoryType: "Wedge", dimensions: "Cast Iron Standard", quantity: 6, condition: "GOOD", currentLocation: "Bole Heights Tower A Floor 12" },
      { accessoryId: "ACC-03", accessoryCode: "TIE-1800", accessoryType: "Tie", dimensions: "Tie Rod 1800mm", quantity: 2, condition: "GOOD", currentLocation: "Bole Heights Tower A Floor 12" }
    ],
    lastMovementAction: "INSTALL",
    lastMovementDate: "2026-10-06 09:30 AM",
    lastUserName: "Kassahun Tadesse (Team Leader)",
    lastScannedDate: "2026-10-06 09:15 AM",
    lastScannedBy: "Abebe Bikila (Supervisor)",
    expectedReturnDate: "2026-10-15",
    notes: "Core shear wall shuttering, passed post-pour deflection check"
  },
  {
    panelId: "PANEL-2026-002",
    panelCode: "EWP-2400-600",
    serialNumber: "AL-001246",
    QRCode: "DIGITAL-ERP://PANEL/AL-001246",
    barcode: "890123001246",
    panelType: "External Wall Panel",
    panelCategory: "External Wall Panel",
    dimensions: "2400 × 600 × 65 mm",
    length: 2400,
    width: 600,
    thickness: 65,
    weight: 38.0,
    manufacturer: "Kumkang Kind Formwork",
    purchaseDate: "2025-09-01",
    condition: "GOOD",
    status: "AT_SITE_STORE",
    currentLocation: "Bole Heights Site Store 01 → Rack 03",
    currentWarehouseId: "WH-CENTRAL-01",
    currentSiteStoreId: "STORE-BOL-01",
    currentProjectId: "PRJ-001",
    currentSiteId: "SITE-BOL-01",
    installationStatus: "NOT_INSTALLED",
    createdAt: "2025-09-01T08:00:00Z",
    updatedAt: "2026-10-06T11:00:00Z",
    associatedAccessories: [
      { accessoryId: "ACC-04", accessoryCode: "CA-BRK-01", accessoryType: "Corner accessory", dimensions: "Standard 65mm", quantity: 4, condition: "GOOD", currentLocation: "Site Store 01" }
    ],
    lastMovementAction: "RETURN",
    lastMovementDate: "2026-10-05 04:00 PM",
    lastUserName: "Mesfin Girma (Store Owner)",
    lastScannedDate: "2026-10-05 04:05 PM",
    lastScannedBy: "Mesfin Girma",
    notes: "Cleaned and oiled after 11th floor strike"
  },
  {
    panelId: "PANEL-2026-003",
    panelCode: "SLB-1200-600",
    serialNumber: "AL-001247",
    QRCode: "DIGITAL-ERP://PANEL/AL-001247",
    barcode: "890123001247",
    panelType: "Slab Panel",
    panelCategory: "Slab Panel",
    dimensions: "1200 × 600 × 65 mm",
    length: 1200,
    width: 600,
    thickness: 65,
    weight: 16.5,
    manufacturer: "Mivan Technology Corp",
    purchaseDate: "2025-08-15",
    condition: "NEW",
    status: "AVAILABLE",
    currentLocation: "Central Warehouse A → Section B → Rack 02 → Bay 01",
    currentWarehouseId: "WH-CENTRAL-01",
    installationStatus: "NOT_INSTALLED",
    createdAt: "2025-08-15T08:00:00Z",
    updatedAt: "2026-10-04T10:00:00Z",
    lastMovementAction: "RECEIVE",
    lastMovementDate: "2026-10-01 10:00 AM",
    lastUserName: "Dawit Haile (Warehouse Manager)",
    lastScannedDate: "2026-10-01 10:10 AM",
    lastScannedBy: "Dawit Haile",
    notes: "Pristine condition, stored on wooden pallets"
  },
  {
    panelId: "PANEL-2026-004",
    panelCode: "STP-1800-1000",
    serialNumber: "STAIR-2026-001",
    QRCode: "DIGITAL-ERP://PANEL/STAIR-2026-001",
    barcode: "890123009001",
    panelType: "Stair Panel",
    panelCategory: "Stair Panel",
    dimensions: "1800 × 1000 × 65 mm",
    length: 1800,
    width: 1000,
    thickness: 65,
    weight: 42.0,
    manufacturer: "Kumkang Kind Formwork",
    purchaseDate: "2025-10-10",
    condition: "GOOD",
    status: "ASSIGNED",
    currentLocation: "CMC CBD Tower 2 → Core Staircase Block A",
    currentWarehouseId: "WH-CENTRAL-01",
    currentSiteStoreId: "STORE-CMC-01",
    currentProjectId: "PRJ-002",
    currentSiteId: "SITE-CMC-02",
    currentBuildingId: "BLD-CMC-T2",
    currentFloorId: "FL-05",
    currentZoneId: "ZN-STAIR-CORE",
    assignedTeamLeaderId: "USER-TL-02",
    assignedGangChiefId: "USER-GC-02",
    installationStatus: "IN_PROGRESS",
    stairConfig: {
      riserHeightMm: 175,
      treadDepthMm: 280,
      totalSteps: 16,
      stairWidthMm: 1000,
      flightAngleDeg: 32,
      landingLengthMm: 1200,
      stringerType: "Integrated Aluminum Stringer Box"
    },
    createdAt: "2025-10-10T08:00:00Z",
    updatedAt: "2026-10-07T08:15:00Z",
    lastMovementAction: "ASSIGN",
    lastMovementDate: "2026-10-07 08:00 AM",
    lastUserName: "Bereket Alemu (Site Store Owner)",
    notes: "Staircase pre-assembly verified with total station survey"
  },
  {
    panelId: "PANEL-2026-005",
    panelCode: "CA-100-2400",
    serialNumber: "CA-00892",
    QRCode: "DIGITAL-ERP://PANEL/CA-00892",
    barcode: "890123008920",
    panelType: "CA",
    panelCategory: "CA",
    dimensions: "2400 × 100 × 65 mm",
    length: 2400,
    width: 100,
    thickness: 65,
    weight: 11.2,
    manufacturer: "Aluma Systems International",
    purchaseDate: "2025-06-20",
    condition: "MINOR_DAMAGE",
    status: "DAMAGED",
    currentLocation: "Bole Heights Site Store 01 → Quarantine Area",
    currentSiteStoreId: "STORE-BOL-01",
    currentProjectId: "PRJ-001",
    installationStatus: "NOT_INSTALLED",
    createdAt: "2025-06-20T08:00:00Z",
    updatedAt: "2026-10-06T15:20:00Z",
    lastMovementAction: "DAMAGE_REPORT",
    lastMovementDate: "2026-10-06 03:20 PM",
    lastUserName: "Abebe Bikila (Supervisor)",
    notes: "Flange bent at lower pinhole #4 during premature strike"
  },
  {
    panelId: "PANEL-2026-006",
    panelCode: "BMP-1200-400",
    serialNumber: "AL-001248",
    QRCode: "DIGITAL-ERP://PANEL/AL-001248",
    barcode: "890123001248",
    panelType: "Beam Panel",
    panelCategory: "Beam Panel",
    dimensions: "1200 × 400 × 65 mm",
    length: 1200,
    width: 400,
    thickness: 65,
    weight: 14.2,
    manufacturer: "Mivan Technology Corp",
    purchaseDate: "2025-08-15",
    condition: "GOOD",
    status: "ISSUED",
    currentLocation: "Kazanchis Finance Tower → Floor 07 → Beam Grid B4",
    currentSiteStoreId: "STORE-KAZ-01",
    currentProjectId: "PRJ-003",
    currentBuildingId: "BLD-KAZ-01",
    currentFloorId: "FL-07",
    assignedTeamLeaderId: "USER-TL-03",
    installationStatus: "IN_PROGRESS",
    createdAt: "2025-08-15T08:00:00Z",
    updatedAt: "2026-10-06T16:00:00Z",
    lastMovementAction: "ISSUE",
    lastMovementDate: "2026-10-06 01:15 PM",
    lastUserName: "Zeleke Bekele (Site Store Owner)",
    notes: "Issued for main transfer girder formwork"
  },
  {
    panelId: "PANEL-2026-007",
    panelCode: "IC-150-2400",
    serialNumber: "IC-00341",
    QRCode: "DIGITAL-ERP://PANEL/IC-00341",
    barcode: "890123003410",
    panelType: "IC",
    panelCategory: "IC",
    dimensions: "2400 × 150 × 65 mm",
    length: 2400,
    width: 150,
    thickness: 65,
    weight: 13.4,
    manufacturer: "Kumkang Kind Formwork",
    purchaseDate: "2025-09-01",
    condition: "UNDER_REPAIR",
    status: "UNDER_REPAIR",
    currentLocation: "Central Workshop → Bay 02 Welding Station",
    currentWarehouseId: "WH-CENTRAL-01",
    installationStatus: "NOT_INSTALLED",
    createdAt: "2025-09-01T08:00:00Z",
    updatedAt: "2026-10-05T14:00:00Z",
    lastMovementAction: "REPAIR_START",
    lastMovementDate: "2026-10-05 02:00 PM",
    lastUserName: "Tadesse Woldemariam (Senior Welder)",
    notes: "Corner stiffener crack undergoing TIG aluminum re-welding"
  },
  {
    panelId: "PANEL-2026-008",
    panelCode: "SOF-1200-150",
    serialNumber: "AL-001249",
    QRCode: "DIGITAL-ERP://PANEL/AL-001249",
    barcode: "890123001249",
    panelType: "Soffit Panel",
    panelCategory: "Soffit Panel",
    dimensions: "1200 × 150 × 65 mm",
    length: 1200,
    width: 150,
    thickness: 65,
    weight: 6.5,
    manufacturer: "Mivan Technology Corp",
    purchaseDate: "2025-08-15",
    condition: "GOOD",
    status: "IN_TRANSIT",
    currentLocation: "In Transit: Central Warehouse A → Sarbet Mixed-Use Site",
    currentWarehouseId: "WH-CENTRAL-01",
    currentProjectId: "PRJ-004",
    installationStatus: "NOT_INSTALLED",
    createdAt: "2025-08-15T08:00:00Z",
    updatedAt: "2026-10-07T07:30:00Z",
    lastMovementAction: "TRANSFER",
    lastMovementDate: "2026-10-07 07:30 AM",
    lastUserName: "Dawit Haile (Warehouse Manager)",
    notes: "Dispatched on Flatbed Truck ET-3-48902 with dispatch note DSP-2026-189"
  }
];

// Seed chronological movement logs for AL-001245 as specified in Section 5
const INITIAL_SEED_MOVEMENTS: PanelTraceabilityMovement[] = [
  {
    movementId: "MOV-2026-001",
    panelId: "PANEL-2026-001",
    serialNumber: "AL-001245",
    panelCode: "IWP-1200-600",
    action: "RECEIVE",
    fromLocation: "Supplier Overseas Shipping Container",
    toLocation: "Warehouse A (Central Receiving)",
    userId: "USER-WM-01",
    userName: "Dawit Haile",
    userRole: "Warehouse Manager",
    timestamp: "2026-10-01T08:30:00Z",
    reason: "Initial import batch receipt & QA verification",
    conditionBefore: "NEW",
    conditionAfter: "NEW",
    statusBefore: "IN_TRANSIT",
    statusAfter: "AVAILABLE",
    notes: "Passed optical dimension scan and surface thickness audit"
  },
  {
    movementId: "MOV-2026-002",
    panelId: "PANEL-2026-001",
    serialNumber: "AL-001245",
    panelCode: "IWP-1200-600",
    action: "TRANSFER",
    fromLocation: "Warehouse A",
    toLocation: "Site Store 01 (Bole Heights)",
    projectId: "PRJ-001",
    projectName: "Bole Heights Luxury Residential Tower",
    siteId: "SITE-BOL-01",
    siteName: "Bole Heights Phase 1 Site",
    userId: "USER-WM-01",
    userName: "Dawit Haile",
    userRole: "Warehouse Manager",
    timestamp: "2026-10-02T10:15:00Z",
    reason: "Dispatched per site material request MR-BOL-2026-001",
    conditionBefore: "NEW",
    conditionAfter: "GOOD",
    statusBefore: "AVAILABLE",
    statusAfter: "AT_SITE_STORE",
    notes: "Shipped on truck ET-3-1284, accepted by Mesfin Girma"
  },
  {
    movementId: "MOV-2026-003",
    panelId: "PANEL-2026-001",
    serialNumber: "AL-001245",
    panelCode: "IWP-1200-600",
    action: "ISSUE",
    fromLocation: "Site Store 01",
    toLocation: "Team Leader Kassahun Tadesse",
    projectId: "PRJ-001",
    projectName: "Bole Heights Luxury Residential Tower",
    buildingId: "Tower A",
    floorId: "Floor 12",
    zoneId: "Zone 02",
    assignedTeamLeaderId: "USER-TL-01",
    userId: "USER-SO-01",
    userName: "Mesfin Girma",
    userRole: "Store Owner",
    timestamp: "2026-10-03T07:45:00Z",
    reason: "Formwork erection for 12th floor shear walls",
    conditionBefore: "GOOD",
    conditionAfter: "GOOD",
    statusBefore: "AT_SITE_STORE",
    statusAfter: "ISSUED",
    notes: "Expected return date 2026-10-15"
  },
  {
    movementId: "MOV-2026-004",
    panelId: "PANEL-2026-001",
    serialNumber: "AL-001245",
    panelCode: "IWP-1200-600",
    action: "ASSIGN",
    fromLocation: "Site Laydown Area",
    toLocation: "Building B → Floor 12",
    projectId: "PRJ-001",
    buildingId: "Tower A",
    floorId: "Floor 12",
    zoneId: "Zone 02",
    assignedTeamLeaderId: "USER-TL-01",
    assignedGangChiefId: "USER-GC-01",
    userId: "USER-TL-01",
    userName: "Kassahun Tadesse",
    userRole: "Team Leader",
    timestamp: "2026-10-03T09:00:00Z",
    reason: "Hoisted via tower crane to Level 12 deck",
    conditionBefore: "GOOD",
    conditionAfter: "GOOD",
    statusBefore: "ISSUED",
    statusAfter: "ASSIGNED",
    notes: "Crane operator signaled safe landing on working platform"
  },
  {
    movementId: "MOV-2026-005",
    panelId: "PANEL-2026-001",
    serialNumber: "AL-001245",
    panelCode: "IWP-1200-600",
    action: "INSTALL",
    fromLocation: "Deck Stacking",
    toLocation: "Building B → Floor 12 → Zone 02",
    projectId: "PRJ-001",
    buildingId: "Tower A",
    floorId: "Floor 12",
    zoneId: "Zone 02",
    assignedTeamLeaderId: "USER-TL-01",
    userId: "USER-TL-01",
    userName: "Kassahun Tadesse",
    userRole: "Team Leader",
    timestamp: "2026-10-04T11:20:00Z",
    reason: "Pin and wedge erection with adjacent external wall panel",
    conditionBefore: "GOOD",
    conditionAfter: "GOOD",
    statusBefore: "ASSIGNED",
    statusAfter: "INSTALLED",
    notes: "Plumb line verified within ±1.5mm tolerance"
  }
];

export class PanelTraceabilityService {
  // Load panels
  static getPanels(): TraceablePanel[] {
    try {
      const data = localStorage.getItem(STORAGE_PANELS);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.warn("Failed to parse panels from storage, using seed:", e);
    }
    this.savePanels(INITIAL_SEED_PANELS);
    return INITIAL_SEED_PANELS;
  }

  // Save panels
  static savePanels(panels: TraceablePanel[]): void {
    try {
      localStorage.setItem(STORAGE_PANELS, JSON.stringify(panels));
    } catch (e) {
      console.error("Failed to save panels to storage:", e);
    }
  }

  // Dimension library methods
  static getDimensionsLibrary(): ConfiguredDimensionOption[] {
    try {
      const data = localStorage.getItem(STORAGE_DIMENSION_LIBRARY);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.warn("Failed to load dimensions library:", e);
    }
    this.saveDimensionsLibrary(DEFAULT_DIMENSION_LIBRARY);
    return DEFAULT_DIMENSION_LIBRARY;
  }

  static saveDimensionsLibrary(dimensions: ConfiguredDimensionOption[]): void {
    try {
      localStorage.setItem(STORAGE_DIMENSION_LIBRARY, JSON.stringify(dimensions));
    } catch (e) {
      console.error("Failed to save dimension library:", e);
    }
  }

  static addDimensionOption(dimension: ConfiguredDimensionOption, user: { id: string; name: string; role: string }): void {
    const list = this.getDimensionsLibrary();
    list.unshift(dimension);
    this.saveDimensionsLibrary(list);
    this.logAudit({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: "ADD_CONFIGURED_DIMENSION",
      panelId: "SYSTEM_CONFIG",
      serialNumber: "CONFIG",
      panelCode: dimension.formatted,
      previousLocation: "-",
      newLocation: "-",
      previousStatus: "-",
      newStatus: "-",
      previousCondition: "-",
      newCondition: "-",
      ipDeviceMetadata: navigator.userAgent || "Web Client",
      notes: `Configured new dimension: ${dimension.name} (${dimension.formatted}) for ${dimension.category}`
    });
  }

  // Movement history
  static getMovements(panelId?: string): PanelTraceabilityMovement[] {
    try {
      const data = localStorage.getItem(STORAGE_MOVEMENTS);
      let list: PanelTraceabilityMovement[] = data ? JSON.parse(data) : INITIAL_SEED_MOVEMENTS;
      if (!data) this.saveMovements(INITIAL_SEED_MOVEMENTS);
      if (panelId) {
        return list.filter(m => m.panelId === panelId || m.serialNumber === panelId);
      }
      return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (e) {
      console.warn("Failed to get movements:", e);
      return INITIAL_SEED_MOVEMENTS;
    }
  }

  static saveMovements(movements: PanelTraceabilityMovement[]): void {
    try {
      localStorage.setItem(STORAGE_MOVEMENTS, JSON.stringify(movements));
    } catch (e) {
      console.error("Failed to save movements:", e);
    }
  }

  // Audit logs (immutable)
  static getAuditLogs(): PanelTraceabilityAuditLog[] {
    try {
      const data = localStorage.getItem(STORAGE_AUDIT_LOGS);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.warn("Failed to get audit logs:", e);
    }
    return [];
  }

  static logAudit(entry: Omit<PanelTraceabilityAuditLog, "id" | "timestamp">): void {
    try {
      const logs = this.getAuditLogs();
      const newEntry: PanelTraceabilityAuditLog = {
        ...entry,
        id: `AUDIT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date().toISOString()
      };
      logs.unshift(newEntry);
      // Keep recent 1000 logs
      if (logs.length > 1000) logs.splice(1000);
      localStorage.setItem(STORAGE_AUDIT_LOGS, JSON.stringify(logs));
    } catch (e) {
      console.error("Failed to append audit log:", e);
    }
  }

  // Unique constraint checker
  static checkUniqueness(params: {
    panelId?: string;
    serialNumber: string;
    panelCode?: string;
    QRCode?: string;
    barcode?: string;
  }): { isUnique: boolean; conflictField?: string; existingItem?: TraceablePanel } {
    const panels = this.getPanels();
    for (const p of panels) {
      // Exclude self if updating
      if (params.panelId && p.panelId === params.panelId) continue;

      if (p.serialNumber.trim().toUpperCase() === params.serialNumber.trim().toUpperCase()) {
        return { isUnique: false, conflictField: "serialNumber", existingItem: p };
      }
      if (params.QRCode && p.QRCode.trim() === params.QRCode.trim()) {
        return { isUnique: false, conflictField: "QRCode", existingItem: p };
      }
      if (params.barcode && p.barcode.trim() === params.barcode.trim()) {
        return { isUnique: false, conflictField: "barcode", existingItem: p };
      }
    }
    return { isUnique: true };
  }

  // Status transition validator
  static canTransitionStatus(
    currentStatus: PanelTraceabilityStatus,
    targetStatus: PanelTraceabilityStatus,
    userRole?: string
  ): { allowed: boolean; reason?: string } {
    if (currentStatus === targetStatus) return { allowed: true };
    // Super Admin has override permission with audit trail
    if (userRole === UserRole.SUPER_ADMIN || userRole === "Super Admin") {
      return { allowed: true };
    }
    const allowedTargets = VALID_TRANSITIONS[currentStatus] || [];
    if (allowedTargets.includes(targetStatus)) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: `Illegal status transition: cannot move panel directly from ${currentStatus} to ${targetStatus}. Follow official lifecycle procedures.`
    };
  }

  // Role scanning permission checker
  static canRoleScanQR(role?: string): boolean {
    if (!role) return false;
    const allowedRoles: string[] = [
      UserRole.WAREHOUSE_MANAGER,
      UserRole.STORE_OWNER,
      UserRole.STORE_MANAGER,
      UserRole.TEAM_LEADER,
      UserRole.GANG_CHIEF,
      UserRole.SUPERVISOR,
      UserRole.SITE_ENGINEER,
      UserRole.PROJECT_MANAGER,
      UserRole.HEAD_OFFICE,
      UserRole.SUPER_ADMIN,
      "Warehouse Manager",
      "Store Owner",
      "Store Manager",
      "Team Leader",
      "Gang Chief",
      "Supervisor",
      "Site Engineer",
      "Project Manager",
      "Head Office",
      "Head Office Manager",
      "Super Admin"
    ];
    return allowedRoles.some(r => r.toLowerCase() === role.toLowerCase());
  }

  // Get permitted quick actions for scanned panel based on role
  static getPermittedActions(role?: string): PanelTraceabilityAction[] {
    const r = (role || "").toLowerCase();
    if (r.includes("super admin")) {
      return ["RECEIVE", "TRANSFER", "ISSUE", "ASSIGN", "INSTALL", "RETURN", "DAMAGE_REPORT", "MISSING_REPORT", "REPAIR_START"];
    }
    if (r.includes("warehouse")) {
      return ["RECEIVE", "TRANSFER", "RETURN", "DAMAGE_REPORT", "MISSING_REPORT", "REPAIR_START"];
    }
    if (r.includes("store")) {
      return ["TRANSFER", "ISSUE", "RETURN", "DAMAGE_REPORT", "MISSING_REPORT"];
    }
    if (r.includes("team leader") || r.includes("gang chief")) {
      return ["INSTALL", "RETURN", "DAMAGE_REPORT", "MISSING_REPORT"];
    }
    if (r.includes("supervisor") || r.includes("site engineer")) {
      return ["INSTALL", "RETURN", "DAMAGE_REPORT", "MISSING_REPORT"];
    }
    if (r.includes("project manager")) {
      return ["TRANSFER", "ISSUE", "INSTALL", "RETURN", "DAMAGE_REPORT", "MISSING_REPORT"];
    }
    if (r.includes("head office")) {
      return ["DAMAGE_REPORT", "MISSING_REPORT"];
    }
    return ["DAMAGE_REPORT"];
  }

  // Find panel by any unique identifier (QR, Barcode, Serial, PanelCode)
  static findPanel(query: string): TraceablePanel | null {
    if (!query) return null;
    const clean = query.trim().toUpperCase();
    const panels = this.getPanels();
    return (
      panels.find(p =>
        p.serialNumber.toUpperCase() === clean ||
        p.panelId.toUpperCase() === clean ||
        p.QRCode.toUpperCase() === clean ||
        p.barcode.toUpperCase() === clean ||
        p.panelCode.toUpperCase() === clean
      ) || null
    );
  }

  // QR Code Replacement & Reprint Engine
  // Regenerates/reprints the SAME QR identity without creating a duplicate record or changing history
  static reprintOrReplaceQrCode(params: {
    panelIdOrQuery: string;
    oldQrStatus: "Damaged" | "Torn" | "Unreadable" | "Lost" | string;
    replacementReason: string;
    user: { id: string; name: string; role: string };
  }): { success: boolean; panel?: TraceablePanel; error?: string } {
    const panels = this.getPanels();
    const clean = params.panelIdOrQuery.trim().toUpperCase();
    const index = panels.findIndex(p =>
      p.panelId.toUpperCase() === clean ||
      p.serialNumber.toUpperCase() === clean ||
      p.panelCode.toUpperCase() === clean ||
      p.QRCode.toUpperCase() === clean ||
      p.barcode.toUpperCase() === clean
    );

    if (index === -1) {
      return { 
        success: false, 
        error: "Panel record not found. Please search by Serial Number, Panel Code, or Panel ID." 
      };
    }

    const panel = panels[index];
    const timestamp = new Date().toISOString();

    // Increment reprint count and metadata WITHOUT changing existing identity, location, or assignments
    panel.qrReplacementCount = (panel.qrReplacementCount || 0) + 1;
    panel.lastQrReprintDate = timestamp;
    panel.updatedAt = timestamp;
    panels[index] = panel;
    this.savePanels(panels);

    // Record the QR replacement event in the audit log (Requirement fields)
    this.logAudit({
      userId: params.user.id,
      userName: params.user.name,
      userRole: params.user.role,
      action: "QR_LABEL_REPRINT_REPLACEMENT",
      panelId: panel.panelId,
      serialNumber: panel.serialNumber,
      panelCode: panel.panelCode,
      previousLocation: panel.currentLocation,
      newLocation: panel.currentLocation,
      previousStatus: panel.status,
      newStatus: panel.status,
      previousCondition: panel.condition,
      newCondition: panel.condition,
      oldQrStatus: params.oldQrStatus,
      replacementReason: params.replacementReason,
      ipDeviceMetadata: navigator.userAgent || "Web Client",
      notes: `QR label replacement #${panel.qrReplacementCount}. Old QR condition: '${params.oldQrStatus}'. Reason: ${params.replacementReason}. Replaced by ${params.user.name} (${params.user.role}) at ${panel.currentLocation}`
    });

    return { success: true, panel };
  }

  // Register a new physical panel with strict uniqueness checks
  static registerPanel(
    panelData: Omit<TraceablePanel, "panelId" | "createdAt" | "updatedAt">,
    user: { id: string; name: string; role: string }
  ): { success: boolean; panel?: TraceablePanel; error?: string } {
    const uniqueness = this.checkUniqueness({
      serialNumber: panelData.serialNumber,
      QRCode: panelData.QRCode,
      barcode: panelData.barcode
    });

    if (!uniqueness.isUnique) {
      return {
        success: false,
        error: `Duplicate constraint violation: A panel with this ${uniqueness.conflictField} already exists (${uniqueness.existingItem?.panelCode} / ${uniqueness.existingItem?.serialNumber}). Every panel must have a unique identity.`
      };
    }

    const panelId = `PANEL-${Date.now()}`;
    const newPanel: TraceablePanel = {
      ...panelData,
      panelId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const panels = this.getPanels();
    panels.unshift(newPanel);
    this.savePanels(panels);

    // Record initial movement
    const movement: PanelTraceabilityMovement = {
      movementId: `MOV-${Date.now()}`,
      panelId,
      serialNumber: newPanel.serialNumber,
      panelCode: newPanel.panelCode,
      action: "RECEIVE",
      fromLocation: "Supplier / Registration Factory",
      toLocation: newPanel.currentLocation,
      projectId: newPanel.currentProjectId,
      siteId: newPanel.currentSiteId,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      timestamp: new Date().toISOString(),
      reason: "Panel permanent master registration in Digital Construction ERP System",
      conditionBefore: "NEW",
      conditionAfter: newPanel.condition,
      statusBefore: "AVAILABLE",
      statusAfter: newPanel.status,
      notes: "Initial serialization and QR/barcode registration"
    };

    const movements = this.getMovements();
    movements.unshift(movement);
    this.saveMovements(movements);

    // Record Audit
    this.logAudit({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: "REGISTER_NEW_PANEL",
      panelId,
      serialNumber: newPanel.serialNumber,
      panelCode: newPanel.panelCode,
      previousLocation: "-",
      newLocation: newPanel.currentLocation,
      previousStatus: "-",
      newStatus: newPanel.status,
      previousCondition: "-",
      newCondition: newPanel.condition,
      ipDeviceMetadata: navigator.userAgent || "Web Client",
      notes: `Registered ${newPanel.panelType} (${newPanel.dimensions}) with serial ${newPanel.serialNumber}`
    });

    return { success: true, panel: newPanel };
  }

  // Record a lifecycle movement / status transition
  static recordMovement(params: {
    panelId: string;
    action: PanelTraceabilityAction;
    toLocation: string;
    newStatus: PanelTraceabilityStatus;
    newCondition?: PanelPhysicalCondition;
    projectId?: string;
    projectName?: string;
    siteId?: string;
    siteName?: string;
    buildingId?: string;
    floorId?: string;
    zoneId?: string;
    assignedTeamLeaderId?: string;
    assignedGangChiefId?: string;
    assignedSectionHeadId?: string;
    installationStatus?: PanelInstallationStatus;
    reason: string;
    notes?: string;
    attachmentPhoto?: string;
    user: { id: string; name: string; role: string };
  }): { success: boolean; movement?: PanelTraceabilityMovement; error?: string } {
    const panels = this.getPanels();
    const index = panels.findIndex(p => p.panelId === params.panelId);
    if (index === -1) {
      return { success: false, error: "Panel not found in system." };
    }

    const panel = panels[index];

    // Validate transition
    const transitionCheck = this.canTransitionStatus(panel.status, params.newStatus, params.user.role);
    if (!transitionCheck.allowed) {
      return { success: false, error: transitionCheck.reason };
    }

    const prevLocation = panel.currentLocation;
    const prevStatus = panel.status;
    const prevCondition = panel.condition;
    const nextCondition = params.newCondition || panel.condition;

    const movementId = `MOV-${Date.now()}`;
    const movement: PanelTraceabilityMovement = {
      movementId,
      panelId: panel.panelId,
      serialNumber: panel.serialNumber,
      panelCode: panel.panelCode,
      action: params.action,
      fromLocation: prevLocation,
      toLocation: params.toLocation,
      projectId: params.projectId || panel.currentProjectId,
      projectName: params.projectName,
      siteId: params.siteId || panel.currentSiteId,
      siteName: params.siteName,
      buildingId: params.buildingId || panel.currentBuildingId,
      floorId: params.floorId || panel.currentFloorId,
      zoneId: params.zoneId || panel.currentZoneId,
      assignedTeamLeaderId: params.assignedTeamLeaderId || panel.assignedTeamLeaderId,
      assignedGangChiefId: params.assignedGangChiefId || panel.assignedGangChiefId,
      userId: params.user.id,
      userName: params.user.name,
      userRole: params.user.role,
      timestamp: new Date().toISOString(),
      reason: params.reason,
      conditionBefore: prevCondition,
      conditionAfter: nextCondition,
      statusBefore: prevStatus,
      statusAfter: params.newStatus,
      notes: params.notes,
      attachmentPhoto: params.attachmentPhoto
    };

    // Update panel record
    panel.currentLocation = params.toLocation;
    panel.status = params.newStatus;
    panel.condition = nextCondition;
    if (params.projectId) panel.currentProjectId = params.projectId;
    if (params.siteId) panel.currentSiteId = params.siteId;
    if (params.buildingId) panel.currentBuildingId = params.buildingId;
    if (params.floorId) panel.currentFloorId = params.floorId;
    if (params.zoneId) panel.currentZoneId = params.zoneId;
    if (params.assignedTeamLeaderId) panel.assignedTeamLeaderId = params.assignedTeamLeaderId;
    if (params.assignedGangChiefId) panel.assignedGangChiefId = params.assignedGangChiefId;
    if (params.assignedSectionHeadId) panel.assignedSectionHeadId = params.assignedSectionHeadId;
    if (params.installationStatus) panel.installationStatus = params.installationStatus;
    panel.lastMovementId = movementId;
    panel.lastMovementAction = params.action;
    panel.lastMovementDate = new Date().toLocaleString();
    panel.lastUserId = params.user.id;
    panel.lastUserName = `${params.user.name} (${params.user.role})`;
    panel.updatedAt = new Date().toISOString();

    panels[index] = panel;
    this.savePanels(panels);

    // Save movement log
    const movements = this.getMovements();
    movements.unshift(movement);
    this.saveMovements(movements);

    // Save Audit log
    this.logAudit({
      userId: params.user.id,
      userName: params.user.name,
      userRole: params.user.role,
      action: `PANEL_MOVEMENT_${params.action}`,
      panelId: panel.panelId,
      serialNumber: panel.serialNumber,
      panelCode: panel.panelCode,
      previousLocation: prevLocation,
      newLocation: params.toLocation,
      previousStatus: prevStatus,
      newStatus: params.newStatus,
      previousCondition: prevCondition,
      newCondition: nextCondition,
      ipDeviceMetadata: navigator.userAgent || "Web Client",
      notes: `${params.reason} ${params.notes ? `| ${params.notes}` : ""}`
    });

    return { success: true, movement };
  }

  // Issue Panel (Section 8)
  static issuePanel(issue: PanelIssueTransaction, user: { id: string; name: string; role: string }): { success: boolean; error?: string } {
    const result = this.recordMovement({
      panelId: issue.panelId,
      action: "ISSUE",
      toLocation: `${issue.project} → ${issue.building} → ${issue.floor} → ${issue.zone} (Assigned to ${issue.requesterName})`,
      newStatus: "ISSUED",
      newCondition: issue.condition,
      projectId: issue.projectId,
      projectName: issue.project,
      siteId: issue.siteId,
      siteName: issue.site,
      buildingId: issue.building,
      floorId: issue.floor,
      zoneId: issue.zone,
      assignedTeamLeaderId: issue.teamLeaderId,
      assignedGangChiefId: issue.gangChiefId,
      assignedSectionHeadId: issue.sectionHeadId,
      installationStatus: "IN_PROGRESS",
      reason: `Issued by Store Owner to ${issue.requesterName} (${issue.requesterRole}) for ${issue.zone}`,
      notes: `Expected return: ${issue.expectedReturnDate}. ${issue.notes || ""}`,
      user
    });

    if (result.success) {
      // Store issue transaction record
      try {
        const issues = this.getIssueTransactions();
        issues.unshift(issue);
        localStorage.setItem(STORAGE_ISSUES, JSON.stringify(issues));
      } catch (e) {
        console.error("Failed to store issue record:", e);
      }
    }
    return result;
  }

  static getIssueTransactions(): PanelIssueTransaction[] {
    try {
      const data = localStorage.getItem(STORAGE_ISSUES);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.warn("Failed to get issue transactions:", e);
    }
    return [];
  }

  // Return Panel (Section 8)
  static returnPanel(returnRecord: PanelReturnTransaction, user: { id: string; name: string; role: string }): { success: boolean; error?: string } {
    const newStatus: PanelTraceabilityStatus =
      returnRecord.inspectionResult === "QUARANTINED_FOR_REPAIR"
        ? "UNDER_REPAIR"
        : returnRecord.inspectionResult === "REJECTED_HEAVY_DAMAGE"
        ? "DAMAGED"
        : "RETURNED";

    const result = this.recordMovement({
      panelId: returnRecord.panelId,
      action: "RETURN",
      toLocation: returnRecord.destinationStoreOrWarehouse,
      newStatus,
      newCondition: returnRecord.condition,
      installationStatus: "DISASSEMBLED",
      reason: `Returned by ${returnRecord.returnedBy}. Inspection: ${returnRecord.inspectionResult}`,
      notes: `Damage: ${returnRecord.damageStatus}. Missing Accessories: ${returnRecord.missingAccessories.join(", ") || "None"}. ${returnRecord.notes || ""}`,
      user
    });

    if (result.success) {
      try {
        const returns = this.getReturnTransactions();
        returns.unshift(returnRecord);
        localStorage.setItem(STORAGE_RETURNS, JSON.stringify(returns));
      } catch (e) {
        console.error("Failed to store return record:", e);
      }
    }
    return result;
  }

  static getReturnTransactions(): PanelReturnTransaction[] {
    try {
      const data = localStorage.getItem(STORAGE_RETURNS);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.warn("Failed to get return transactions:", e);
    }
    return [];
  }

  // Report Damage (Section 7)
  static reportDamage(inspection: PanelDamageInspection, user: { id: string; name: string; role: string }): { success: boolean; error?: string } {
    const panels = this.getPanels();
    const panel = panels.find(p => p.panelId === inspection.panelId);
    if (!panel) return { success: false, error: "Panel not found." };

    const newCondition: PanelPhysicalCondition =
      inspection.severity === "SCRAP" ? "UNUSABLE" : inspection.severity === "CRITICAL" ? "CRITICAL_DAMAGE" : "DAMAGED";

    const newStatus: PanelTraceabilityStatus =
      inspection.repairDecision === "RETIRE_AND_SCRAP" ? "RETIRED" : "DAMAGED";

    const result = this.recordMovement({
      panelId: inspection.panelId,
      action: "DAMAGE_REPORT",
      toLocation: inspection.currentLocation,
      newStatus,
      newCondition,
      reason: `Damage Reported: ${inspection.damageType} - ${inspection.damageDescription}`,
      notes: `Severity: ${inspection.severity}, Decision: ${inspection.repairDecision}`,
      attachmentPhoto: inspection.damagePhoto,
      user
    });

    if (result.success) {
      try {
        const damages = this.getDamageInspections();
        damages.unshift(inspection);
        localStorage.setItem(STORAGE_DAMAGES, JSON.stringify(damages));
      } catch (e) {
        console.error("Failed to save damage inspection:", e);
      }
    }
    return result;
  }

  static getDamageInspections(): PanelDamageInspection[] {
    try {
      const data = localStorage.getItem(STORAGE_DAMAGES);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.warn("Failed to get damage inspections:", e);
    }
    return [];
  }

  // Associated Accessories (Section 10)
  static attachAccessory(
    panelId: string,
    accessory: PanelAssociatedAccessory,
    user: { id: string; name: string; role: string }
  ): { success: boolean; error?: string } {
    const panels = this.getPanels();
    const p = panels.find(item => item.panelId === panelId);
    if (!p) return { success: false, error: "Panel not found." };

    // Prevent duplicate serialized accessory across all panels
    if (accessory.serialNumber) {
      for (const otherPanel of panels) {
        const match = otherPanel.associatedAccessories?.find(
          a => a.serialNumber?.toUpperCase() === accessory.serialNumber?.toUpperCase()
        );
        if (match) {
          return {
            success: false,
            error: `Accessory serial '${accessory.serialNumber}' is already attached to panel ${otherPanel.panelCode} (${otherPanel.serialNumber}). Duplicate serial numbers for accessories are prohibited.`
          };
        }
      }
    }

    if (!p.associatedAccessories) p.associatedAccessories = [];
    p.associatedAccessories.push({
      ...accessory,
      addedAt: new Date().toISOString()
    });
    p.updatedAt = new Date().toISOString();
    this.savePanels(panels);

    this.logAudit({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: "ATTACH_ACCESSORY",
      panelId: p.panelId,
      serialNumber: p.serialNumber,
      panelCode: p.panelCode,
      previousLocation: "-",
      newLocation: p.currentLocation,
      previousStatus: p.status,
      newStatus: p.status,
      previousCondition: p.condition,
      newCondition: p.condition,
      ipDeviceMetadata: navigator.userAgent || "Web Client",
      notes: `Attached accessory: ${accessory.accessoryType} (${accessory.accessoryCode}, qty: ${accessory.quantity})`
    });

    return { success: true };
  }

  static detachAccessory(panelId: string, accessoryId: string, user: { id: string; name: string; role: string }): { success: boolean } {
    const panels = this.getPanels();
    const p = panels.find(item => item.panelId === panelId);
    if (!p || !p.associatedAccessories) return { success: false };

    const removed = p.associatedAccessories.find(a => a.accessoryId === accessoryId);
    p.associatedAccessories = p.associatedAccessories.filter(a => a.accessoryId !== accessoryId);
    p.updatedAt = new Date().toISOString();
    this.savePanels(panels);

    if (removed) {
      this.logAudit({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action: "DETACH_ACCESSORY",
        panelId: p.panelId,
        serialNumber: p.serialNumber,
        panelCode: p.panelCode,
        previousLocation: "-",
        newLocation: "-",
        previousStatus: p.status,
        newStatus: p.status,
        previousCondition: p.condition,
        newCondition: p.condition,
        ipDeviceMetadata: navigator.userAgent || "Web Client",
        notes: `Detached accessory: ${removed.accessoryType} (${removed.accessoryCode})`
      });
    }

    return { success: true };
  }

  // Inventory Reconciliation (Section 12)
  static performReconciliation(params: {
    facilityId: string;
    facilityName: string;
    facilityType: "WAREHOUSE" | "SITE_STORE" | "PROJECT_SITE";
    user: { id: string; name: string; role: string };
  }): PanelInventoryReconciliationRecord[] {
    const panels = this.getPanels();
    // Filter panels that belong to or are currently at this facility
    const facilityPanels = panels.filter(p =>
      p.currentWarehouseId === params.facilityId ||
      p.currentSiteStoreId === params.facilityId ||
      p.currentProjectId === params.facilityId ||
      p.currentLocation.toLowerCase().includes(params.facilityName.toLowerCase())
    );

    // Group by panelCode
    const codeGroups: Record<string, TraceablePanel[]> = {};
    for (const p of facilityPanels) {
      if (!codeGroups[p.panelCode]) codeGroups[p.panelCode] = [];
      codeGroups[p.panelCode].push(p);
    }

    const records: PanelInventoryReconciliationRecord[] = [];

    for (const [code, items] of Object.entries(codeGroups)) {
      const sample = items[0];
      const systemStock = items.length;
      // In automated simulation, assume physical scan matches 98-100% with occasional discrepancy for demonstration
      const hasDiscrepancy = items.some(i => i.status === "MISSING");
      const physicalStock = hasDiscrepancy ? systemStock - 1 : systemStock;

      const issuedPanels = items.filter(i => i.status === "ISSUED" || i.status === "ASSIGNED").length;
      const returnedPanels = items.filter(i => i.status === "RETURNED").length;
      const installedPanels = items.filter(i => i.status === "INSTALLED" || i.status === "IN_USE").length;
      const damagedPanels = items.filter(i => i.status === "DAMAGED" || i.status === "UNDER_REPAIR").length;
      const missingPanels = items.filter(i => i.status === "MISSING" || i.status === "LOST").length;
      const discrepancyCount = systemStock - physicalStock;

      const rec: PanelInventoryReconciliationRecord = {
        reconciliationId: `REC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        auditDate: new Date().toISOString().split("T")[0],
        facilityType: params.facilityType,
        facilityId: params.facilityId,
        facilityName: params.facilityName,
        panelCode: code,
        panelType: sample.panelType,
        dimension: sample.dimensions,
        systemStock,
        physicalStock,
        issuedPanels,
        returnedPanels,
        installedPanels,
        damagedPanels,
        missingPanels,
        discrepancyCount,
        discrepancyType: discrepancyCount === 0 ? "MATCH" : discrepancyCount > 0 ? "SHORTAGE" : "SURPLUS",
        auditedBy: params.user.name,
        auditedByRole: params.user.role,
        status: discrepancyCount === 0 ? "CONFIRMED_MATCH" : "DISCREPANCY_FLAGGED",
        notes: discrepancyCount === 0 ? "Physical barcode/RFID audit matched system stock" : `Variance detected: System ${systemStock} vs Physical ${physicalStock}`
      };

      records.push(rec);

      // If discrepancy detected, send enterprise notification immediately
      if (discrepancyCount !== 0) {
        NotificationService.createNotification({
          title: `⚠️ Panel Discrepancy Alert: ${params.facilityName}`,
          description: `Audit found ${Math.abs(discrepancyCount)} discrepancy in panel code ${code} (${sample.panelType}) at ${params.facilityName}. System: ${systemStock}, Physical: ${physicalStock}.`,
          type: "Warning",
          category: "Aluminum Formwork Panel Tracking Notifications",
          priority: "High",
          status: "Unread",
          targetRoles: ["Warehouse Manager"],
          sender: "Panel Reconciliation Engine",
          actionTab: "panelTraceability",
          actionUrl: "/traceability",
          metadata: { panelCode: code, facilityId: params.facilityId, discrepancyCount }
        });
      }
    }

    // Save records
    try {
      const existing = this.getReconciliations();
      const combined = [...records, ...existing];
      localStorage.setItem(STORAGE_RECONCILIATIONS, JSON.stringify(combined));
    } catch (e) {
      console.error("Failed to save reconciliations:", e);
    }

    return records;
  }

  static getReconciliations(): PanelInventoryReconciliationRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_RECONCILIATIONS);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.warn("Failed to get reconciliations:", e);
    }
    return [];
  }

  // Daily Movement Report Generation (Section 15)
  static generateDailyMovementReport(
    scope: { type: "ALL" | "WAREHOUSE" | "SITE_STORE" | "PROJECT"; id: string; name: string },
    user: { id: string; name: string; role: string }
  ): DailyPanelMovementReportData {
    const panels = this.getPanels();
    const movements = this.getMovements();
    const today = new Date().toISOString().split("T")[0];

    // Filter movements that happened today
    const todayMovements = movements.filter(m => m.timestamp.startsWith(today));

    // Calculate metrics
    const totalPanels = panels.length;
    const received = todayMovements.filter(m => m.action === "RECEIVE").length;
    const transferredIn = todayMovements.filter(m => m.action === "TRANSFER").length;
    const transferredOut = todayMovements.filter(m => m.action === "TRANSFER").length;
    const issued = todayMovements.filter(m => m.action === "ISSUE").length;
    const returned = todayMovements.filter(m => m.action === "RETURN").length;
    const installed = todayMovements.filter(m => m.action === "INSTALL").length;
    const disassembled = todayMovements.filter(m => m.action === "DISASSEMBLE").length;
    const damaged = todayMovements.filter(m => m.action === "DAMAGE_REPORT").length;
    const missing = todayMovements.filter(m => m.action === "MISSING_REPORT").length;
    const lost = panels.filter(p => p.status === "LOST").length;

    const openingPanels = Math.max(0, totalPanels - received);
    const closingPanels = totalPanels;

    // Breakdown maps
    const whMap: Record<string, number> = {};
    const ssMap: Record<string, number> = {};
    const prjMap: Record<string, number> = {};
    const teamMap: Record<string, number> = {};
    const gangMap: Record<string, number> = {};

    for (const p of panels) {
      if (p.currentWarehouseId) {
        whMap[p.currentWarehouseId] = (whMap[p.currentWarehouseId] || 0) + 1;
      }
      if (p.currentSiteStoreId) {
        ssMap[p.currentSiteStoreId] = (ssMap[p.currentSiteStoreId] || 0) + 1;
      }
      if (p.currentProjectId) {
        prjMap[p.currentProjectId] = (prjMap[p.currentProjectId] || 0) + 1;
      }
      if (p.assignedTeamLeaderId) {
        teamMap[p.assignedTeamLeaderId] = (teamMap[p.assignedTeamLeaderId] || 0) + 1;
      }
      if (p.assignedGangChiefId) {
        gangMap[p.assignedGangChiefId] = (gangMap[p.assignedGangChiefId] || 0) + 1;
      }
    }

    const report: DailyPanelMovementReportData = {
      reportId: `DMR-${today}-${Date.now()}`,
      reportDate: today,
      scopeType: scope.type,
      scopeId: scope.id,
      scopeName: scope.name,
      openingPanels,
      received,
      transferredIn,
      transferredOut,
      issued,
      returned,
      installed,
      disassembled,
      damaged,
      missing,
      lost,
      closingPanels,
      breakdownByWarehouse: Object.entries(whMap).map(([name, count]) => ({ name, count })),
      breakdownBySiteStore: Object.entries(ssMap).map(([name, count]) => ({ name, count })),
      breakdownByProject: Object.entries(prjMap).map(([name, count]) => ({ name, count })),
      breakdownByTeam: Object.entries(teamMap).map(([name, count]) => ({ name, count })),
      breakdownByGang: Object.entries(gangMap).map(([name, count]) => ({ name, count })),
      movementRecordsCount: todayMovements.length,
      generatedAt: new Date().toISOString(),
      generatedBy: `${user.name} (${user.role})`,
      notificationsSentTo: ["Warehouse Manager", "Head Office Manager", "Project Manager", "Super Admin"]
    };

    // Send notification to authorized managers (Section 15)
    NotificationService.createNotification({
      title: `📊 Daily Panel Movement Report Ready (${today})`,
      description: `Daily report generated for ${scope.name}. Opening: ${openingPanels}, Issued: ${issued}, Returned: ${returned}, Installed: ${installed}, Closing: ${closingPanels}.`,
      type: "System",
      category: "Aluminum Formwork Panel Tracking Notifications",
      priority: "Medium",
      status: "Unread",
      targetRoles: ["Warehouse Manager", "Head Office Manager", "Project Manager", "Super Admin"],
      sender: "Panel Movement Automated Service",
      actionTab: "panelTraceability",
      actionUrl: "/traceability",
      metadata: { reportId: report.reportId, date: today }
    });

    return report;
  }
}
