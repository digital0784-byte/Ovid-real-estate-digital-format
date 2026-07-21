export enum UserRole {
  SUPER_ADMIN = "Super Admin",
  HEAD_OFFICE = "Head Office",
  PROJECT_MANAGER = "Project Manager",
  SITE_ENGINEER = "Site Engineer",
  SUPERVISOR = "Supervisor",
  TIME_KEEPER = "Time Keeper",
  TEAM_LEADER = "Team Leader",
  GANG_CHIEF = "Gang Chief",
  WORKER = "Worker",
  STORE_MANAGER = "Store Manager",
  HR_MANAGER = "HR Manager",
  FINANCE_MANAGER = "Finance Manager",
  SECTION_HEAD = "Section Head",
  SURVEYOR = "Surveyor"
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  role: UserRole;
  action: string;
  details: string;
  gps?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    status: "acquired" | "failed" | "locating";
  };
}

export enum AttendanceMethod {
  QR_CODE = "QR Code",
  NFC = "NFC",
  FINGERPRINT = "Fingerprint",
  FACE_RECOGNITION = "Face Recognition",
  GPS_GEOFENCE = "GPS Geofence"
}

export interface Worker {
  id: string; // ID for worker (e.g., ERP-W-101)
  name: string;
  photo?: string;
  phoneNumber?: string;
  nationalId?: string;
  gender?: "Male" | "Female" | "Other";
  dateOfBirth?: string;
  address?: string;
  emergencyContact?: string;
  company: string; // e.g., Digital Construction ERP, subcontractor name
  department: string;
  trade: string; // e.g., Welder, Carpenter, Steel Fixer, Concrete Worker
  position?: string;
  employmentType?: "Daily Labourer" | "Contract" | "Permanent" | string;
  joinedDate: string;
  assignedProject?: string;
  building?: string;
  floor?: number;
  zone?: string;
  teamLeader?: string;
  gangChief?: string;
  supervisor?: string;
  qrCode?: string;
  faceRecognitionData?: string;
  fingerprint?: string;
  status: "Active" | "Inactive";
  teamId: string;
  skills?: string; // e.g. "Formwork Assembly, Blueprint Reading"
}

export interface Team {
  id: string;
  name: string;
  leaderId: string;
  department: string;
  memberIds: string[];
  safetyScore: number; // 0 to 100
  qualityScore: number; // 0 to 100
  averageProductivity: number; // sq.m or panels per day
}

export interface AttendanceRecord {
  id: string;
  workerId: string;
  workerName: string;
  department: string;
  trade: string;
  company: string;
  building: string;
  floor: number;
  zone: string;
  date: string; // YYYY-MM-DD
  checkIn: string | null; // HH:mm:ss
  checkOut: string | null; // HH:mm:ss
  method: AttendanceMethod | null;
  workingHours: number;
  overtime: number;
  status: "Present" | "Absent" | "Late" | "Leave" | "Holiday";
  gpsCoordinates?: { lat: number; lng: number };
  deviceUsed?: string;
  verifiedBy?: string;
  gpsLocationString?: string;
}

export interface PerformanceEvaluation {
  id: string;
  workerId: string;
  workerName: string;
  date: string; // YYYY-MM-DD
  discipline: number; // Max 20
  quality: number; // Max 20
  productivity: number; // Max 20
  safetyCompliance: number; // Max 15
  equipmentHandling: number; // Max 10 (የእቃ አያያዝ)
  teamwork: number; // Max 10
  attendance: number; // Max 5
  totalScore: number; // Sum of above, max 100
  level: "Excellent" | "Very Good" | "Good" | "Average" | "Poor";
  comment: string;
  evaluatedBy: string; // User Name / ID
}

export interface ProjectZone {
  id: string; // e.g. B1-F04-ZA
  building: string;
  block: string;
  tower: string;
  floor: number;
  zone: string; // e.g., Zone A, Zone B
  wallStatus: number; // 0 to 100% completion
  columnStatus: number; // 0 to 100% completion
  beamStatus: number; // 0 to 100% completion
  slabStatus: number; // 0 to 100% completion
  stairStatus: number; // 0 to 100% completion
  liftCoreStatus: number; // 0 to 100% completion
  startDate: string; // YYYY-MM-DD
  targetDays: number;
  actualDays?: number;
  completionPercentage: number; // overall calculated average or specific
  status: "Not Started" | "In Progress" | "Completed" | "Delayed";

  // New Drawing-Based Fields
  area?: number; // m²
  wallPanels?: number;
  columnPanels?: number;
  beamPanels?: number;
  slabPanels?: number;
  cornerPanels?: number;
  externalPanels?: number;
  internalPanels?: number;
  accessories?: number;
  
  // Assignment
  assignedGangChiefId?: string;
  assignedGangChiefName?: string;
  
  // Progress states
  installedPanels?: number;
  removedPanels?: number;
  progressPhotos?: string[]; 
  manpowerUsed?: number;
  dailyReportSubmitted?: boolean;
  dailyReportNotes?: string;
  
  // Approvals
  approvedByTeamLeader?: boolean;
  approvedDate?: string;
  
  // Drawing Link
  drawingId?: string;
  drawingName?: string;
  dailyPanelLogs?: DailyPanelLog[];
}

export interface DailyPanelLog {
  id: string;
  loggedBy: string; // e.g. "Fikru Tolossa (Gang Chief)"
  role: string; // Gang Chief, Team Leader, Supervisor
  date: string;
  panelType: string;
  length: number; // in meters
  width: number; // in meters
  quantity: number;
  calculatedArea: number; // length * width * quantity
  notes?: string;
}

export interface DrawingItem {
  id: string;
  name: string;
  type: "DWG" | "PDF" | "IFC" | "PNG" | "JPG";
  project: string;
  building: string;
  block: string;
  floor: number;
  zone: string;
  uploadedAt: string;
  uploadedBy: string;
  fileSize: string;
}

export interface ConstructionScheduleItem {
  zoneId: string;
  building: string;
  floor: number;
  zoneName: string;
  sequenceOrder: number;
  startDate: string;
  targetDays: number;
  expectedFinishDate: string;
  actualFinishDate?: string;
  remainingDays: number;
  delayedDays: number;
  status: "Not Started" | "In Progress" | "Completed" | "Delayed";
}

export interface DailyProgressLog {
  id: string;
  date: string;
  engineerId: string;
  engineerName: string;
  building: string;
  floor: number;
  zone: string;
  installedPanels: number;
  removedPanels: number;
  remainingPanels: number;
  concreteReady: boolean;
  inspectionStatus: "Pending" | "Approved" | "Rejected";
  comments: string;
  photoUrl?: string; // base64 or placeholder
}

export interface SafetyLog {
  id: string;
  date: string;
  toolboxMeetingLogged: boolean;
  toolboxTopic: string;
  toolboxAttendeesCount: number;
  ppeInspectionPassed: boolean;
  ppeDefectsCount: number;
  nearMissesCount: number;
  incidentsCount: number;
  unsafeActs: string[];
  unsafeConditions: string[];
  safetyScore: number; // Max 100 for the day
  loggedBy: string;
}

export interface QualitySnag {
  id: string;
  zoneId: string;
  description: string;
  defectType: "Formwork Alignment" | "Honeycombing" | "Panel Gap" | "Slurry Leak" | "Other";
  status: "Open" | "In Progress" | "Resolved";
  reportedDate: string;
  resolvedDate?: string;
  reportedBy: string;
  assignedTo: string; // Team ID or Worker ID
}

export interface QualityLog {
  id: string;
  date: string;
  zoneId: string;
  inspectionPassed: boolean;
  snagsCount: number;
  repairTrackingStatus: string;
  qualityScore: number; // Max 100 for the day
  engineerApprovalSignature: string;
}

export interface SystemNotification {
  id: string;
  type: "Late Worker" | "Absent Worker" | "Zone Delay" | "Inspection Due" | "Concrete Due" | "Target Missed" | "Safety Alert" | "New Registrant";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export interface AIPredictionsResult {
  predictedCompletionDate: string;
  predictedDelayedZones: { zoneId: string; reason: string; riskLevel: "High" | "Medium" | "Low" }[];
  manpowerAllocationRecommendation: { teamId: string; name: string; currentZone: string; recommendMoveToZone: string; reason: string }[];
  overtimeRequirements: { trade: string; recommendedHours: number; reason: string }[];
  lowPerformingWorkers: { workerId: string; name: string; score: number; suggestions: string }[];
  weeklyManagementReport: string; // Markdown formatted report
  generatedAt: string;
}

export enum PanelType {
  WALL = "Wall Panel",
  BEAM = "Beam Panel",
  SLAB = "Slab Panel",
  COLUMN = "Column Panel",
  CORNER = "Corner Panel",
  SPECIAL = "Special Panel",
  SOFFIT = "Soffit Panel",
  DECK = "Deck Panel",
  PROP = "Prop Inventory",
  WALER = "Waler Inventory",
  ACCESSORY = "Accessories Inventory"
}

export enum PanelStatus {
  NEW = "New Panel",
  ACTIVE = "Active",
  IN_USE = "Installed / In Use",
  DISMANTLED = "Dismantled",
  WAITING_CLEANING = "Waiting Cleaning",
  CLEANED = "Cleaned",
  UNDER_INSPECTION = "Under Inspection",
  DAMAGED = "Damaged",
  UNDER_REPAIR = "Under Repair",
  RESERVED = "Reserved",
  IN_TRANSIT = "In Transit",
  MISSING = "Missing",
  SCRAPPED = "Scrapped"
}

export interface AluminumFormworkPanel {
  id: string;
  serialNumber: string;
  bundleNumber: string;
  size: string;
  type: PanelType;
  quantity: number;
  location: string;
  zone: string;
  status: PanelStatus;
  usageCount: number;
  createdAt: string;
  weight?: number; // in kg
  surfaceArea?: number; // in m2
  floor?: number;
  building?: string;
  photo?: string;
  
  // Manufacturer & Purchase Metadata
  manufacturerName?: string;
  countryOfOrigin?: string;
  factoryAddress?: string;
  manufacturingBatch?: string;
  mfgDate?: string;
  certificateNumber?: string;
  warrantyInfo?: string;
  purchaseDate?: string;
  supplier?: string;
  rfidTag?: string;
  barcode?: string;
  qrCode?: string;
  
  // Warehouse Storage Location
  warehouseLocation?: string; // Block A - Rack 04 - Shelf B
  warehouseName?: string;
  
  // Service Life Tracking
  firstUseDate?: string;
  projectsUsedCount?: number;
  castingCyclesCount?: number;
  totalServiceDays?: number;
  totalWorkingHours?: number;
  remainingUsefulLifePercent?: number; // 0-100%
  maintenanceCount?: number;
  totalRepairCost?: number;
  
  // Site Assignment & Supervisor
  responsibleSupervisor?: string;
  responsibleTeam?: string;
  gpsCoordinates?: { lat: number; lng: number };
}

export interface PanelMovementLog {
  id: string;
  panelId: string;
  dispatchNumber?: string;
  transferNumber?: string;
  fromLocation: string;
  fromZone: string;
  toLocation: string;
  toZone: string;
  timestamp: string;
  movedBy: string;
  driverName?: string;
  truckPlate?: string;
  digitalSignature?: string;
  gpsLocation?: string;
  notes?: string;
}

export interface PanelDamageReport {
  id: string;
  panelId: string;
  severity: "Low" | "Medium" | "High";
  description: string;
  reportedBy: string;
  reportedDate: string;
  status: "Reported" | "In Repair" | "Repaired" | "Scrapped";
  photoUrl?: string;
  building?: string;
  floor?: number;
  zone?: string;
}

export interface PanelRepairRecord {
  id: string;
  panelId: string;
  damageReportId: string;
  technician: string;
  repairDetails: string;
  cost: number;
  repairDate: string;
  approvedBy?: string;
}

export interface OverseasShipment {
  id: string;
  manufacturerName?: string;
  countryOfOrigin?: string;
  factoryName?: string;
  manufacturingBatch?: string;
  shippingCompany: string;
  vesselName: string;
  containerNumber: string;
  billOfLading: string;
  portOfLoading: string;
  destinationPort?: string;
  portOfEntry?: string;
  expectedArrivalDate: string;
  status: "At Factory" | "At Port" | "On Vessel" | "Customs" | "In Transit" | "Arrived Warehouse";
  liveGpsLocation?: string;
  totalPanels?: number;
  panelsQuantity?: number;
  totalWeightTons?: number;
}

export interface CustomsRecord {
  id: string;
  shipmentId?: string;
  arrivalDate?: string;
  clearanceDate?: string;
  portOfEntry: string;
  customsClearanceDate?: string;
  customsRefNumber?: string;
  customsReference?: string;
  importPermitNumber: string;
  taxesAndDutiesEtb?: number;
  declaredValueEtb?: number;
  dutiesPaidEtb?: number;
  clearedByOfficer?: string;
  releaseDate?: string;
  status: "Pending" | "Cleared" | "Released";
}

export interface DispatchTransfer {
  id: string;
  dispatchNumber: string;
  transferNumber: string;
  fromWarehouse: string;
  destinationSite: string;
  destinationBuilding: string;
  destinationZone: string;
  dispatchDate: string;
  truckPlate: string;
  driverName: string;
  driverPhone: string;
  dispatcherName: string;
  panelCount: number;
  totalWeightKg: number;
  qrCode: string;
  barcode: string;
  status: "Dispatched" | "In Transit" | "Received" | "Delayed";
  driverSignature?: string;
  gpsLocation?: string;
  estimatedArrival?: string;
}

export interface SiteReceivingReport {
  id: string;
  transferId: string;
  dispatchNumber: string;
  receivingSite: string;
  building: string;
  floor: number;
  zone: string;
  receivedBy: string;
  receivedRole: string; // e.g. Section Head, Supervisor, Team Leader
  receivingDate: string;
  verifiedPanelsCount: number;
  discrepanciesCount: number;
  notes?: string;
  receivingPhotoUrl?: string;
  digitalSignatureUrl?: string;
  gpsCoordinates?: { lat: number; lng: number };
}

export interface InventoryAuditRecord {
  id: string;
  auditDate: string;
  warehouseOrSite?: string;
  location?: string;
  auditorName: string;
  auditorRole: string;
  systemCount: number;
  physicalCount: number;
  discrepancyCount?: number;
  discrepancyQty?: number;
  varianceQty?: number;
  variancePercentage: number;
  notes: string;
  status: "Reconciled" | "Discrepancy Flagged" | "Pending Review" | "Approved";
}

