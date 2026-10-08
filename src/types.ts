export enum UserRole {
  SUPER_ADMIN = "Super Admin",
  HEAD_OFFICE = "Head Office",
  FINANCE_MANAGER = "Finance Manager",
  WAREHOUSE_MANAGER = "Warehouse Manager",
  STORE_OWNER = "Store Owner",
  PROJECT_MANAGER = "Project Manager",
  SECTION_HEAD = "Section Head",
  SUPERVISOR = "Supervisor",
  SITE_ENGINEER = "Site Engineer",
  SURVEYOR = "Surveyor",
  HSE_OFFICER = "HSE Officer",
  TEAM_LEADER = "Team Leader",
  GANG_CHIEF = "Gang Chief",
  TIME_KEEPER = "Time Keeper",
  ASSEMBLER = "Assembler",
  DRIVER = "Driver",
  AUDITOR = "Auditor",
  // Distinct role strings to prevent duplicate keys in Object.values(UserRole)
  STORE_MANAGER = "Store Manager",
  HR_MANAGER = "HR Manager",
  WORKER = "Worker"
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  role?: UserRole | string;
  userRole?: string;
  action: string;
  details: string;
  severity?: "INFO" | "WARNING" | "CRITICAL" | string;
  category?: string;
  gps?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    status: "acquired" | "failed" | "locating" | "denied" | "unavailable";
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
  basicMonthlySalary?: number; // Base monthly salary in ETB captured at enrollment
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
  hourlyRate?: number; // Base rate in ETB/hr
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
  attendancePin?: string;
  status: "Active" | "Inactive";
  teamId: string;
  skills?: string; // e.g. "Formwork Assembly, Blueprint Reading"
  bankName?: string; // e.g. Commercial Bank of Ethiopia (CBE), Dashen Bank, Awash Bank
  bankAccountNumber?: string; // e.g. 1000123456789
  mobileMoneyType?: "Telebirr" | "CBE Birr" | "M-PESA" | "Amole" | "Awash Birr" | "Kacha" | "Other" | string;
  mobileMoneyNumber?: string; // e.g. +251 911-234567
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

export interface Expense {
  id: string;
  category: "Material" | "Labor" | "Equipment" | "Overhead" | "Subcontractor";
  amount: number;
  date: string;
  vendor: string;
  description: string;
  project: string;
  costCenter: string;
  approvedBy: string;
  unitCost?: number;
  quantity?: number;
  unit?: string;
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
  lunchOut?: string | null; // HH:mm:ss
  lunchIn?: string | null; // HH:mm:ss
  method: AttendanceMethod | null;
  workingHours: number;
  overtime: number;
  underTime?: number; // hours of undertime
  lateArrivalMinutes?: number;
  earlyDepartureMinutes?: number;
  status: "Present" | "Absent" | "Late" | "Leave" | "Holiday";
  absenceStatus?: string; // e.g. "Unexcused", "Sick Leave", "Planned Vacation"
  leaveStatus?: string; // e.g. "Approved", "Pending", "Casual Leave"
  gpsCoordinates?: { lat: number; lng: number };
  deviceUsed?: string;
  verifiedBy?: string;
  gpsLocationString?: string;
  biometricStatus?: string; // e.g. "Fingerprint Verified (99.1%)", "Face Match Pass"
  photoUrl?: string; // Attendance photo proof URL
  team?: string;
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
  loggedBy: string; // e.g. "<Full Name> (<Role>)"
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
  type: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  readBy?: string[];
  category?: NotificationCategory | string;
  priority?: NotificationPriority | string;
  status?: NotificationStatus | string;
  projectName?: string;
  siteName?: string;
  sender?: string;
  senderRole?: string;
  receiver?: string;
  targetRoles?: (UserRole | string)[];
  actionTab?: string;
  titleAm?: string;
  descriptionAm?: string;
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
  AGED = "Aged / Old Panel",
  ACTIVE = "Active",
  IN_USE = "Installed / In Use",
  DISMANTLED = "Dismantled",
  WAITING_CLEANING = "Waiting Cleaning",
  CLEANED = "Cleaned",
  UNDER_INSPECTION = "Under Inspection",
  DAMAGED = "Damaged",
  UNDER_REPAIR = "Under Repair",
  REPAIRED = "Repaired",
  RESERVED = "Reserved",
  IN_TRANSIT = "In Transit",
  MISSING = "Missing",
  SCRAPPED = "Scrapped"
}

export interface FormworkAccessoryRecord {
  id: string; // e.g., ACC-1001
  code: string; // e.g., PW-1650
  name: string; // e.g., Standard Pin & Wedge Set 16x50mm
  category: string; // e.g., Fasteners & Connectors
  description: string;
  material: string; // e.g., Forged Carbon Steel 45#
  size: string; // e.g., 16mm x 50mm
  unit: string; // e.g., Pcs, Box (250 pcs), Set
  weightKg: number;
  compatiblePanelTypes: string[]; // e.g. ["Internal Wall Panels", "External Wall Panels", "Slab Panels"]
  minStock: number;
  maxStock: number;
  currentStock: number;
  issuedStock: number;
  inMaintenanceStock: number;
  warehouseLocation: string; // e.g., Central Yard - Bin A-12
  supplier: string;
  manufacturer: string;
  purchasePrice: number; // in USD or ETB
  rentalPrice: number; // daily rate
  barcode: string;
  qrCode: string;
  serialNumber: string;
  status: "Available" | "Low Stock" | "Out of Stock" | "In Inspection" | "In Maintenance" | "Deactivated";
  photoUrl?: string;
  isCustom?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AccessoryMovementLog {
  id: string; // ACC-MV-1001
  accessoryId: string;
  accessoryCode: string;
  accessoryName: string;
  transactionType: "Issue to Site" | "Return from Site" | "Warehouse Transfer" | "Stock Adjustment" | "Procurement Receipt" | "Scrapped";
  quantity: number;
  goodConditionQty?: number;
  damagedQty?: number;
  missingQty?: number;
  fromLocation: string;
  toLocation: string;
  projectName?: string;
  building?: string;
  floor?: number;
  zone?: string;
  handledBy: string;
  driverName?: string;
  truckPlate?: string;
  notes?: string;
  timestamp: string;
}

export interface AccessoryMaintenanceRecord {
  id: string; // ACC-MNT-1001
  accessoryId: string;
  accessoryCode: string;
  accessoryName: string;
  maintenanceType: "Inspection & Audit" | "Cleaning & Oiling" | "Thread Retapping" | "Straightening" | "Welding & Repair" | "Scrapped / Retired";
  conditionRating: "100% Excellent" | "80% Good" | "60% Fair / Minor Wear" | "30% Needs Servicing" | "0% Scrapped";
  technician: string;
  cost: number;
  details: string;
  maintenanceDate: string;
  nextScheduledDate?: string;
}

export interface AluminumFormworkPanel {
  id: string;
  serialNumber: string;
  bundleNumber: string;
  size: string;
  dimensions?: string;
  type: PanelType;
  quantity: number;
  location: string;
  allocatedSite?: string;
  zone: string;
  status: PanelStatus;
  usageCount: number;
  createdAt: string;
  weight?: number; // in kg
  unitPriceEtb?: number;
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

export interface RegisteredSite {
  id: string;
  projectName: string;
  clientName: string;
  contractorName: string;
  region: string;
  cityWoreda: string;
  gpsLocation: string;
  googleMapsCoords: string;
  startDate: string;
  plannedCompletionDate: string;
  buildingsCount: number;
  floorsCount: number;
  zonesPerFloor: number;
  siteManager: string;
  supervisor: string;
  teamLeaders: string[];
  gangChiefs: string[];
  timeKeepers: string[];
  status: "Planning" | "Active" | "Completed" | "Closed";
  documents: {
    id: string;
    name: string;
    type: "CAD Drawing" | "Structural Drawing" | "Formwork Drawing" | "Method Statement" | "Safety Document" | "Progress Photo" | "Other";
    uploadDate: string;
    uploadedBy: string;
    fileSize: string;
  }[];
}

export type PanelConditionType = "New" | "Good" | "Used" | "Damaged" | "Under Repair" | "Unusable";

export type PanelInventoryStatus =
  | "Available"
  | "Reserved"
  | "Issued"
  | "Installed"
  | "In Transit"
  | "Returned"
  | "Damaged"
  | "Under Repair"
  | "Missing"
  | "Unusable";

export interface PanelStorageLocation {
  warehouse?: string;
  section: string; // e.g. "Section B"
  row?: string;    // e.g. "Row 01"
  rack?: string;   // e.g. "Rack 03"
  bay?: string;    // e.g. "Bay 02"
  stack?: string;  // e.g. "Stack 01"
  bin?: string;    // e.g. "Bin B1"
  formattedLocation: string; // e.g. "Section B → Rack 03 → Bay 02 → Stack 01"
}

export interface WarehousePanelTypeEntry {
  id: string;
  warehouseId: string;
  warehouseName: string;
  panelTypeName: string; // e.g. "Internal Wall Panel", "External Wall Panel", "Extend Panel", "Soffit Panel", "Beam Panel", "CA Panel", "IC Panel", "SC Panel", "SCR Panel", "Slab Panel", "Door End Panel", "Wall End Panel", "Corner Panel", "Internal Corner", "External Corner", "Column Panel", "Stair Panel", "Beam Soffit", "Beam Side", "Filler Panel", "Kicker Panel", "Stop End Panel", "Platform/Working Panel"
  panelName?: string;    // e.g. "Internal Wall Standard Panel", "Corridor Partition Panel"
  panelCode: string;     // e.g. "IWP-1200-600", "WP-600-2400"
  panelCategory: "Wall" | "Internal Wall" | "External Wall" | "Slab" | "Corner" | "Column" | "Beam" | "Deck" | "Stair" | "Soffit" | "Filler" | "Kicker" | "Accessory" | "Special" | string;
  manufacturer?: string;
  formworkSystem?: string;
  catalogId?: string;
  description?: string;
  dimension: {
    length: number;
    width: number;
    heightThickness?: number;
    height?: number;
    unit: "mm" | "m" | string;
    formatted: string; // e.g. "1200 × 600 × 65 mm" or "600 × 2400 mm"
  };
  stairConfig?: {
    stairPanelType?: string;
    stairWidth?: number;
    tread?: number;
    riser?: number;
    slopeAngle?: number;
    numberOfSteps?: number;
  };
  project?: string;
  site?: string;
  building?: string;
  floor?: number;
  zone?: string;
  stair?: string;
  condition: PanelConditionType;
  serialMode: "Range" | "Individual";
  serialPrefix?: string;
  serialRangeStart?: string;
  serialRangeEnd?: string;
  serialRangeFormatted?: string; // e.g. "WP-001–WP-050"
  individualSerialNumbers: string[]; // e.g. ["WP-0001", "WP-0002", ...]
  quantity: number;
  location: PanelStorageLocation;
  status: PanelInventoryStatus;
  unitCostEtb?: number;
  qrCodePayload?: string;
  barcode?: string;
  accessories?: PanelAccessoryEntry[];
  createdAt?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface RegisteredWarehouse {
  id: string;
  code: string;
  name: string;
  nameAmharic?: string;
  type: "Main Warehouse" | "Central Warehouse" | "Site Warehouse" | "Temporary Warehouse" | "Sub-Warehouse" | "Site Store" | "Equipment Yard" | "Central Depot";
  isMainWarehouse: boolean;
  locationRegion: string;
  citySite: string;
  address?: string;
  gpsCoordinates: string;
  warehouseManager: string;
  managerPhone: string;
  securityGuardName?: string;
  securityGuardPhone?: string;
  securityGuardOnDuty?: string; // e.g. "Alemayehu Bekele (+251 911 234567)"
  totalCapacitySqM: number;
  currentCapacityUtilized: number; // percentage 0-100
  activePanelsCount: number;
  materialItemsCount: number;
  status: "Active" | "Full" | "Maintenance" | "Under Expansion" | "Temporary";
  linkedSitesCount: number;
  registrationDate: string;
  notes?: string;
  photoUrl?: string;
  documents?: {
    id: string;
    name: string;
    type: string;
    uploadDate: string;
    fileSize?: string;
    url?: string;
  }[];
  panelTypes?: WarehousePanelTypeEntry[];
}

export type CustomInputCategory = 
  | "Attendance"
  | "Employees"
  | "Work Sector"
  | "Projects"
  | "Building Name"
  | "Block Name"
  | "Floor Name"
  | "Zone Name"
  | "Aluminum Panels"
  | "Material Name"
  | "Material Type"
  | "Material Dimension"
  | "Supplier Name"
  | "Manufacturer"
  | "Customer Name"
  | "Contractor Name"
  | "Warehouse"
  | "Site Store"
  | "Finance"
  | "Procurement"
  | "Payroll"
  | "Equipment Name"
  | "Vehicle Name"
  | "QA/QC"
  | "Defect Type"
  | "HSE"
  | "NCR"
  | "Hazard Type"
  | "Near Miss"
  | "Toolbox Meeting"
  | "Assets"
  | "Maintenance"
  | "Documents"
  | "Notifications"
  | "Reports"
  | "AI Modules"
  | "Panel Status"
  | "Remarks"
  | "Comments"
  | string;

export interface CustomMasterEntry {
  id: string;
  category: CustomInputCategory;
  value: string;
  code?: string;
  labelAm?: string;
  description?: string;
  remarks?: string;
  reason?: string;
  project?: string;
  site?: string;
  createdTime?: string;
  isPredefined: boolean;
  status: "Approved" | "Pending" | "Rejected";
  createdBy: string;
  createdByRole: string;
  createdDate: string;
  approvedBy?: string;
  approvedByRole?: string;
  approvedDate?: string;
  approvedTime?: string;
  previousValue?: string;
  mergedIntoValue?: string;
  usageCount: number;
  isFavorite?: boolean;
  tags?: string[];
}

export interface CustomInputAuditItem {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  requestedBy?: string;
  approvedBy?: string;
  approvedByRole?: string;
  role: string;
  category: CustomInputCategory;
  action: "Created" | "Updated" | "Approved" | "Rejected" | "Merged" | "Deleted" | "FavoriteToggled";
  entryValue: string;
  previousValue?: string;
  newValue?: string;
  approvalStatus?: string;
  date?: string;
  time?: string;
  details: string;
}

export type NotificationCategory =
  | "Attendance Notifications"
  | "Warehouse Notifications"
  | "Site Store Notifications"
  | "Inventory & Material Dispatch"
  | "Material Request Notifications"
  | "Material Approval Notifications"
  | "Material Transfer Notifications"
  | "Material Return Notifications"
  | "Material Requisition Notifications"
  | "Aluminum Formwork Panel Tracking Notifications"
  | "Procurement Notifications"
  | "Purchase Order Notifications"
  | "Delivery Notifications"
  | "Finance Notifications"
  | "Payroll Notifications"
  | "Budget Notifications"
  | "Project Progress Notifications"
  | "Daily Report Notifications"
  | "QA/QC Notifications"
  | "NCR Notifications"
  | "HSE Notifications"
  | "Toolbox Meeting Notifications"
  | "PPE Inspection Notifications"
  | "Hazard Notifications"
  | "Near Miss Notifications"
  | "Equipment Notifications"
  | "Vehicle Notifications"
  | "Asset Notifications"
  | "AI Alerts"
  | "Maintenance Notifications"
  | "Document Approval Notifications"
  | "User Approval Notifications"
  | "System Update Notifications";

export type NotificationPriority = "Low" | "Medium" | "High" | "Critical";

export type NotificationStatus = "Unread" | "Read" | "Acknowledged" | "Completed";

export interface EnterpriseNotification {
  id: string;
  title: string;
  titleAm?: string;
  description: string;
  descriptionAm?: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  status: NotificationStatus;
  projectName?: string;
  siteName?: string;
  building?: string;
  floor?: string;
  zone?: string;
  sender?: string;
  senderRole?: string;
  receiver?: string;
  targetRoles: (UserRole | string)[];
  date: string;
  time: string;
  timestamp: number;
  isAiGenerated?: boolean;
  aiConfidence?: number;
  isArchived?: boolean;
  isSnoozed?: boolean;
  snoozedUntil?: string;
  deliveryChannels?: {
    inApp: boolean;
    push: boolean;
    email: boolean;
    sms: boolean;
  };
  actionTab?: string;
  actionPayload?: Record<string, any>;
  tags?: string[];
  readBy?: string[];
  read?: boolean;
  isRead?: boolean;
  moduleSource?: string;
  type?: string;
  targetRole?: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

export interface NotificationFilterState {
  searchQuery: string;
  category: NotificationCategory | "ALL";
  priority: NotificationPriority | "ALL";
  status: NotificationStatus | "ALL" | "Archived";
  projectName: string;
  onlyAiAlerts: boolean;
  dateRange: "all" | "today" | "week" | "month";
}

export interface RoleChangeRequestDoc {
  id: string;
  fileName: string;
  fileSize: string;
  fileType: string;
  uploadedAt: string;
  dataUrl?: string;
}

export interface RoleChangeRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail?: string;
  phoneNumber?: string;
  currentRole: UserRole | string;
  requestedRole: UserRole | string;
  assignedRole?: UserRole | string;
  reason: string;
  supportingDocuments?: RoleChangeRequestDoc[];
  status: "Pending Approval" | "Approved" | "Rejected" | "Cancelled";
  requestedBy: string;
  requestedByRole: string;
  requestedDate: string;
  requestedTime: string;
  approvedBy?: string;
  approvedByRole?: string;
  approvedDate?: string;
  approvedTime?: string;
  rejectionReason?: string;
  deviceInfo?: {
    ip: string;
    deviceType: string;
    browserOs: string;
    locationGps?: string;
  };
}

export interface PayrollRecord {
  id: string;
  workerId: string;
  employeeId?: string;
  workerName: string;
  position: string;
  department: string;
  team: string;
  project: string;
  employmentType: "Daily Labourer" | "Contract" | "Permanent";
  basicSalary: number;
  attendanceDays: number;
  totalWorkingHours: number;
  overtimeHours: number;
  overtimePayment: number;
  undertimeHours: number;
  undertimeDeduction: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  status: "Draft" | "Pending Review" | "Pending Approval" | "Approved" | "Paid";
  grade: "Grade A" | "Grade B" | "Grade C" | "Grade D";
  bankName?: string;
  bankAccountNumber?: string;
  mobileMoneyType?: string;
  mobileMoneyNumber?: string;
  period?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface RoleChangeAuditLog {
  id: string;
  timestamp: string;
  date: string;
  time: string;
  userId: string;
  userName: string;
  previousRole: string;
  newRole: string;
  requestedBy: string;
  approvedBy: string;
  approverRole: string;
  status: "Approved" | "Rejected" | "Cancelled";
  reason: string;
  rejectionReason?: string;
  deviceInfo: {
    ip: string;
    deviceType: string;
    browserOs: string;
    locationGps?: string;
  };
}

export interface WorkSector {
  id: string;
  nameEn: string;
  nameAm: string;
}

export const WORK_SECTORS_CATALOG: WorkSector[] = [
  { id: "carpenter", nameEn: "Formwork Carpenter", nameAm: "ካርፔንተር (የፎርምወርክ አገጣጣሚ)" },
  { id: "stripper", nameEn: "Formwork Stripper & Dismantler", nameAm: "የፎርምወርክ አላቃቂና ከፋች" },
  { id: "steelfixer", nameEn: "Steel Fixer & Rebar Craftsman", nameAm: "የብረት አሰሪ / ሪባር ሠራተኛ" },
  { id: "concrete", nameEn: "Concrete Cast & Finisher", nameAm: "የኮንክሪት አፍሳሽና አጫራሽ" },
  { id: "mason", nameEn: "Mason & Block Layer", nameAm: "ግንበኛ እና የብሎኬት ሠራተኛ" },
  { id: "heavy_equip", nameEn: "Heavy Equipment & Excavator Operator", nameAm: "የከባድ ማሽነሪ / ኤክስካቫተር ኦፕሬተር" },
  { id: "crane_rigger", nameEn: "Tower Crane & Rigging Specialist", nameAm: "የታወር ክሬን እና ሪጊንግ ባለሙያ" },
  { id: "surveyor", nameEn: "Surveyor & Geodetic Technician", nameAm: "ሱርቬየር እና የልኬታ ባለሙያ" },
  { id: "site_eng", nameEn: "Site Engineer & Civil Inspector", nameAm: "የሳይት መሐንዲስና ሲቪል ተቆጣጣሪ" },
  { id: "qaqc", nameEn: "QA/QC Inspector & Quality Controller", nameAm: "የጥራት ቁጥጥር ኢንፔክተር" },
  { id: "hse", nameEn: "HSE Officer & Safety Inspector", nameAm: "የደህንነትና አካባቢ ጥበቃ ኃላፊ" },
  { id: "electrician", nameEn: "Electrician & Power Specialist", nameAm: "የኤሌክትሪክ ሠራተኛ" },
  { id: "plumber", nameEn: "Plumber & Sanitary Fitter", nameAm: "የቧንቧ እና ሳኒተሪ ፊተር" },
  { id: "scaffolder", nameEn: "Scaffolder & High-Elevation Rigger", nameAm: "የእስካፎልደር ባለሙያ" },
  { id: "welder", nameEn: "Welder & Structural Fabricator", nameAm: "የብረት ዌልደርና ገጣሚ" },
  { id: "painter", nameEn: "Painter, Plasterer & Finisher", nameAm: "ቀለም ቅቢ፣ መሃን እና ፊኒሺንግ" },
  { id: "warehouse", nameEn: "Warehouse Manager & Store Keeper", nameAm: "የመጋዘንና የስቶር አቃቤ" },
  { id: "driver", nameEn: "Driver & Transport Operator", nameAm: "የተሽከርካሪ አሽከርካሪ" },
  { id: "timekeeper", nameEn: "Time Keeper & Attendance Log Officer", nameAm: "የሰዓት ተቆጣጣሪ (ታይም ኪፐር)" },
  { id: "gang_chief", nameEn: "Gang Chief & Crew Foreman", nameAm: "የጋንግ ቺፍና ፎርማን" },
  { id: "team_leader", nameEn: "Team Leader & Section Supervisor", nameAm: "የቡድን መሪና ተቆጣጣሪ" },
  { id: "mechanic", nameEn: "Mechanic & Equipment Maintenance Tech", nameAm: "የማሽነሪ መካኒክ" },
  { id: "laborer", nameEn: "General Site Helper / Daily Laborer", nameAm: "መደበኛ የሳይት ሠራተኛ/ረዳት" }
];

export const DEPARTMENTS_CATALOG = [
  { id: "formwork_assembly", nameEn: "Formwork & Structural Assembly", nameAm: "የፎርምወርክና መዋቅር ገጠማ" },
  { id: "formwork_stripping", nameEn: "Formwork Stripping & Demolition", nameAm: "የፎርምወርክ ማላቀቅና ማፅዳት" },
  { id: "steel_fixing", nameEn: "Steel Rebar & Metal Fabrication", nameAm: "የብረትና ሪባር ሥራ" },
  { id: "concrete_casting", nameEn: "Concrete Casting & Pumping", nameAm: "ኮንክሪት ማፍሰስና ፓምፕ" },
  { id: "masonry_finishing", nameEn: "Masonry, Plastering & Finishing", nameAm: "ግንባታ፣ ምርጋና ፊኒሺንግ" },
  { id: "engineering_pm", nameEn: "Site Engineering & Project Controls", nameAm: "የሳይት ኢንጂነሪንግና ፕሮጀክት" },
  { id: "warehouse_store", nameEn: "Warehouse, Store & Material Logistics", nameAm: "መጋዘን፣ ስቶርና ላጅስቲክስ" },
  { id: "qaqc_dept", nameEn: "QA/QC Testing & Quality Assurance", nameAm: "ጥራት ቁጥጥርና ላቦራቶሪ" },
  { id: "hse_dept", nameEn: "HSE Occupational Health & Safety", nameAm: "ደህንነትና አካባቢ ጥበቃ" },
  { id: "surveying_cad", nameEn: "Surveying, GIS & CAD Topography", nameAm: "ሱርቬይንግና CAD" },
  { id: "heavy_fleet", nameEn: "Heavy Machinery & Fleet Equipment", nameAm: "ከባድ ማሽነሪና ተሽከርካሪ" },
  { id: "mep_dept", nameEn: "MEP Electrical, Plumbing & HVAC", nameAm: "ኤሌክትሪክ፣ ቧንቧና ኤችቪኤሲ" },
  { id: "finance_procurement", nameEn: "Finance, Procurement & Cost Control", nameAm: "ፋይናንስ፣ ግዥና ኮስት" },
  { id: "hr_admin", nameEn: "HR, Timekeeping & Administration", nameAm: "ሰው ኃይልና አስተዳደር" }
];

// === CENTRALIZED MASTER DATA SYSTEM TYPES ===

export type PanelCategoryType =
  | "Internal Wall"
  | "External Wall"
  | "Wall Panel"
  | "Slab Panel"
  | "Column Panel"
  | "Beam Panel"
  | "Corner Panel"
  | "Internal Corner"
  | "External Corner"
  | "CA Panel"
  | "IC Panel"
  | "SC Panel"
  | "SCR Panel"
  | "Soffit Panel"
  | "Deck Panel"
  | "Door End Panel"
  | "Wall End Panel"
  | "Stair Panel"
  | "Beam Soffit"
  | "Beam Side"
  | "Filler Panel"
  | "Kicker Panel"
  | "Extend Panel"
  | "Stop End Panel"
  | "Platform/Accessory Panel"
  | "Special Panel";

export interface StairPanelConfig {
  stairPanelType?: "Flight Panel" | "Landing Panel" | "Tread-Riser Unit" | "Stringer Panel" | string;
  stairWidth?: number; // mm (e.g. 1000, 1200)
  tread?: number; // mm (e.g. 280, 300)
  riser?: number; // mm (e.g. 150, 175)
  slopeAngle?: number; // degrees (e.g. 28.5, 30.5)
  numberOfSteps?: number; // (e.g. 8, 9, 10)
  riserHeightMm?: number;
  treadDepthMm?: number;
  totalSteps?: number;
  stairWidthMm?: number;
  flightAngleDeg?: number;
  stringerType?: string;
  landingLengthMm?: number;
}

export interface PanelMasterCatalogItem {
  id: string;
  manufacturer: string;
  formworkSystem?: string; // e.g. "Mivan 65mm Standard System", "Aluma EasySet", "Kumkang 65mm System"
  panelType: string;       // e.g. "Internal Wall Panel", "External Wall Panel", "Extend Panel", "Soffit Panel", "Beam Panel", "CA Panel", "IC Panel", "SC Panel", "SCR Panel", "Slab Panel", "Door End Panel", "Wall End Panel", "Corner Panel", "Internal Corner", "External Corner", "Column Panel", "Stair Panel", "Beam Soffit", "Beam Side", "Filler Panel", "Kicker Panel", "Stop End Panel", "Platform/Working Panel"
  panelName?: string;      // e.g. "Internal Wall Standard Panel", "Corridor Partition Panel"
  panelCategory: PanelCategoryType | string;
  panelCode: string;       // e.g. "IWP-1200-600", "EWP-1200-900", "CA-100-2400"
  manufacturerCode?: string; // Original manufacturer code
  internalErpCode?: string;  // Internal ERP code
  standardDimension: string; // e.g. "1200 × 600 × 65 mm" or "600 × 2400 mm"
  length: number;
  width: number;
  thickness: number;
  height?: number; // where applicable
  unit: "mm" | "m" | "inch" | string;
  weightKg?: number;
  description: string;
  manufacturerRef?: string;
  barcode?: string;
  qrCodePayload?: string;
  serialTrackingRequired?: boolean;
  compatibleAccessories?: string[]; // accessory codes, e.g. ["TR-15", "WN-15", "PC-22", "WEDGE-01", "PIN-1650"]
  stairConfig?: StairPanelConfig;
  isVerifiedStandard: boolean; // Must not claim unverified dimensions are official international standards
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface MasterManufacturerRecord {
  id: string;
  name: string;
  formworkSystems: string[];
  country: string;
  description?: string;
  contactInfo?: string;
  isActive: boolean;
  createdAt?: string;
}

export interface MasterPanelTypeRecord {
  id: string;
  name: string;
  category: PanelCategoryType | string;
  description?: string;
  isActive: boolean;
  createdAt?: string;
}

export interface MasterPanelDimensionRecord {
  id: string;
  panelType: string;
  manufacturer: string;
  formworkSystem?: string;
  length: number;
  width: number;
  thickness: number;
  height?: number;
  unit: string;
  formatted: string; // "1200 × 600 × 65 mm"
  weightKg?: number;
  isActive: boolean;
}

export interface StockTransactionRecord {
  id: string;
  panelId: string;
  panelCode: string;
  panelName?: string;
  panelType: string;
  manufacturer?: string;
  dimension: string;
  transactionType: "REGISTER" | "ISSUE" | "TRANSFER" | "RETURN" | "INSTALL" | "DAMAGE" | "REPAIR" | "AUDIT_ADJUST";
  quantity: number;
  fromLocation: string;
  toLocation: string;
  warehouseId: string;
  warehouseName: string;
  projectId?: string;
  projectName?: string;
  siteId?: string;
  siteName?: string;
  building?: string;
  floor?: number;
  zone?: string;
  stair?: string;
  condition?: PanelConditionType;
  status?: PanelInventoryStatus;
  serialNumbers?: string[];
  performedBy: string;
  performedByRole?: string;
  notes?: string;
  timestamp: string;
}

export interface MasterProjectRecord {
  id: string;
  code: string;
  name: string;
  nameAmharic?: string;
  clientName: string;
  contractorName: string;
  location: string;
  status: "Active" | "Planning" | "Completed";
  description?: string;
}

export interface MasterSiteStoreRecord {
  id: string;
  code: string;
  name: string;
  nameAmharic?: string;
  projectId: string;
  projectName: string;
  siteId: string;
  siteName: string;
  storeKeeperName: string;
  storeKeeperPhone: string;
  securityGuardName?: string;
  securityGuardPhone?: string;
  capacitySqM: number;
  status: "Active" | "Under Maintenance" | "Temporary" | "Closed";
  registrationDate: string;
  notes?: string;
}

export interface MasterStorageLocationRecord {
  id: string;
  warehouseId?: string;
  warehouseName?: string;
  siteStoreId?: string;
  siteStoreName?: string;
  section: string;
  row?: string;
  rack?: string;
  bay?: string;
  stack?: string;
  bin?: string;
  formattedLocation: string;
  notes?: string;
  isActive: boolean;
  createdAt?: string;
}

// === CENTRALIZED ACCESSORIES MASTER CATALOG SYSTEM TYPES ===

export type AccessoryCategoryType =
  | "Tie System"
  | "Fasteners & Pins"
  | "Alignment & Wedges"
  | "Spacers & Cones"
  | "Support & Props"
  | "Brackets & Clamps"
  | "Wallers & Stiffeners"
  | "Corner Accessories"
  | "Platform Accessories"
  | "Safety Accessories"
  | "Special Accessories";

export interface AccessoryMasterCatalogItem {
  id: string;
  accessoryName: string; // e.g. "Tie Rod", "Wing Nut", "PVC Cone", "Spacer", "Waller", "Pin", "Wedge Pin", "Alignment Pin", "Alignment Wedge", "Push Pull Prop", "Tie", "Clamp", "Bracket"
  accessoryType: string; // e.g. "Formwork Tie", "Fastener", "Spacer", "Alignment Tool", "Support Prop"
  accessoryCategory: AccessoryCategoryType | string;
  accessoryCode: string; // e.g. "TR-15", "WN-15", "PC-22", "WP-PIN-01", "WEDGE-01", "PPP-2500"
  standardDimension: string; // e.g. "15 mm", "16 mm", "22 mm", "120 mm", "2500 - 3800 mm"
  unit: "mm" | "cm" | "m" | "inch" | "kg" | "pcs" | "set" | string;
  manufacturer: string;
  compatiblePanelTypes: string[]; // e.g. ["Wall Panel", "Standard Wall Panel", "Column Panel"], or ["ALL"]
  compatiblePanelCodes?: string[]; // e.g. ["WP-600-2400", "WP-600-2700"], or ["ALL"]
  defaultQtyRatioPerPanel?: number; // e.g. 4 pins per panel, 2 tie rods per m2
  description?: string;
  weightKg?: number;
  isVerifiedStandard: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface PanelAccessoryEntry {
  id: string;
  accessoryCatalogId?: string;
  accessoryName: string;
  accessoryType: string;
  accessoryCode: string;
  dimension: string;
  unit: string;
  manufacturer: string;
  compatiblePanelType: string;
  compatiblePanelCode: string;
  quantity: number;
  condition: PanelConditionType;
  serialNumber?: string;
  storageLocation: string;
  status: PanelInventoryStatus;
  unitCostEtb?: number;
  notes?: string;
}

// === SITE STORE MATERIAL REQUEST & ISSUE MANAGEMENT TYPES ===

export type MaterialRequestLifecycleStatus =
  | "DRAFT"
  | "REQUESTED"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "PARTIALLY_APPROVED"
  | "REJECTED"
  | "READY_FOR_ISSUE"
  | "ISSUED"
  | "RECEIVED"
  | "CONSUMED"
  | "PARTIALLY_RETURNED"
  | "RETURNED"
  | "CLOSED";

export type MaterialItemCondition =
  | "Good"
  | "Used"
  | "Damaged"
  | "Under Repair"
  | "Missing"
  | "Unusable";

export interface RequestAttachedAccessory {
  id: string;
  accessoryName: string;
  accessoryCode: string;
  dimension: string;
  unit: string;
  quantity: number;
  availableStock?: number;
}

export interface MaterialRequestAuditEntry {
  action: string;
  performedBy: string;
  performedByUid: string;
  role: string;
  timestamp: string;
  details: string;
  previousStatus?: string;
  newStatus?: string;
}

export interface EnhancedMaterialRequest {
  id: string;
  requestNumber: string;
  date: string;
  time: string;
  timestamp: number;
  requesterUid: string;
  requesterName: string;
  requesterRole: string; // "Team Leader" | "Gang Chief" | "Section Head" | string
  project: string;
  projectId: string;
  site: string;
  siteId: string;
  building: string;
  floor: string | number;
  zone: string;
  teamGangSection: string;
  siteStoreId: string;
  siteStoreName: string;
  materialCategory: string; // "Aluminum Formwork Panels" | "Stair Panels" | "Panel Accessories" | "Construction Materials" | "Tools" | "Equipment" | "Consumables"
  materialName: string;
  materialCode: string;
  panelType?: string;
  panelDimension?: string;
  serialNumbers?: string[];
  manufacturer?: string;
  formworkSystem?: string;
  requestedQuantity: number;
  approvedQuantity: number;
  issuedQuantity: number;
  returnedQuantity: number;
  unit: string;
  requiredDate: string;
  priority: "Normal" | "Urgent" | "Critical";
  reason: string;
  workActivity: string;
  notes?: string;
  photoUrl?: string;
  cadRef?: string;
  status: MaterialRequestLifecycleStatus;
  reviewedBy?: string;
  reviewedByRole?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  issuedBy?: string;
  issuedAt?: string;
  receivedBy?: string;
  receivedAt?: string;
  receiverConfirmation?: boolean;
  attachedAccessories?: RequestAttachedAccessory[];
  history: MaterialRequestAuditEntry[];
}

export interface EnhancedMaterialIssue {
  id: string;
  requestId: string;
  date: string;
  time: string;
  timestamp: number;
  project: string;
  projectId: string;
  site: string;
  siteId: string;
  building: string;
  floor: string | number;
  zone: string;
  teamGangSection: string;
  siteStoreId: string;
  siteStoreName: string;
  materialCategory: string;
  materialName: string;
  materialCode: string;
  panelType?: string;
  panelDimension?: string;
  serialNumbers?: string[];
  requestedQuantity: number;
  approvedQuantity: number;
  issuedQuantity: number;
  unit: string;
  condition: MaterialItemCondition;
  storageLocation: string;
  issuedBy: string;
  issuedByUid: string;
  receivedBy: string;
  receivedByUid: string;
  receivedByRole: string;
  isReceivedConfirmed: boolean;
  receivedAt?: string;
  workActivity: string;
  reason: string;
  status: "ISSUED" | "RECEIVED" | "PARTIALLY_RETURNED" | "RETURNED";
  note?: string;
}

export interface EnhancedMaterialReturn {
  id: string;
  originalIssueId: string;
  requestId?: string;
  date: string;
  time: string;
  timestamp: number;
  userUid: string;
  userName: string;
  userRole: string;
  project: string;
  projectId: string;
  site: string;
  siteId: string;
  building: string;
  floor: string | number;
  zone: string;
  teamGangSection: string;
  siteStoreId: string;
  siteStoreName: string;
  materialCategory: string;
  materialName: string;
  materialCode: string;
  panelType?: string;
  panelDimension?: string;
  serialNumbers?: string[];
  originallyIssuedQuantity: number;
  usedQuantity: number;
  returnedQuantity: number;
  condition: MaterialItemCondition;
  returnReason: string;
  receivedByStoreOwner: string;
  receivedByStoreOwnerUid: string;
  returnConfirmation: boolean;
  photoUrl?: string;
  notes?: string;
}

// === DAILY SITE STORE MATERIAL MOVEMENT REPORT & AUTOMATIC NOTIFICATION TYPES ===

export interface DailyReportIssuedItem {
  no: number;
  time: string;
  user: string;
  userUid: string;
  role: string;
  project: string;
  site: string;
  location: string; // Building - Floor - Zone
  material: string;
  code: string;
  qty: number;
  unit: string;
  condition: string;
  issueId: string;
}

export interface DailyReportReturnedItem {
  no: number;
  time: string;
  user: string;
  userUid: string;
  role: string;
  project: string;
  site: string;
  location: string;
  material: string;
  code: string;
  issuedQty: number;
  usedQty: number;
  returnedQty: number;
  condition: string;
  returnId: string;
}

export interface DailyReportPanelMovement {
  panelType: string;
  panelCode: string;
  dimension: string;
  serialNumber: string;
  issued: number;
  returned: number;
  installed: number;
  damaged: number;
  missing: number;
  currentStatus: string;
}

export interface DailyReportUserBreakdown {
  userName: string;
  userRole: string;
  teamGangSection: string;
  issued: number;
  returned: number;
  net: number;
}

export interface DailyReportSiteStoreSummary {
  siteStoreId: string;
  siteStoreName: string;
  siteName: string;
  projectName: string;
  issued: number;
  returned: number;
  net: number;
  damaged: number;
  missing: number;
}

export interface DailySiteStoreMaterialReport {
  id: string; // idempotent: DMR-{reportDate}-{siteStoreId}
  reportDate: string; // YYYY-MM-DD
  generatedAt: string;
  timezone: string; // "Africa/Addis_Ababa"
  siteStoreId: string; // or "ALL"
  siteStoreName: string;
  projectId?: string;
  projectName?: string;
  siteId?: string;
  siteName?: string;
  summary: {
    totalTransactions: number;
    totalItemsIssued: number;
    totalItemsReturned: number;
    netMovement: number; // Issued - Returned
    damagedReturns: number;
    missingItems: number;
    unusableItems: number;
  };
  siteStoreBreakdown: DailyReportSiteStoreSummary[];
  issuedMaterials: DailyReportIssuedItem[];
  returnedMaterials: DailyReportReturnedItem[];
  panelMovements: DailyReportPanelMovement[];
  userBreakdown: DailyReportUserBreakdown[];
  reconciliation: {
    openingStock: number;
    received: number;
    returned: number;
    transferIn: number;
    issued: number;
    transferOut: number;
    damaged: number;
    missing: number;
    adjustments: number;
    calculatedClosingStock: number;
    systemRecordedStock: number;
    isBalanced: boolean;
    discrepancyCount: number;
    status: "BALANCED" | "DISCREPANCY_DETECTED" | "RESOLVED";
  };
  notificationStatus: {
    notifiedRoles: string[]; // ["Warehouse Manager", "Head Office Manager", "Super Admin"]
    sentAt: string;
    deliveryChannels: {
      inApp: boolean;
      push: boolean;
      email: boolean;
    };
    readBy: string[];
  };
  reportStatus: "FINAL" | "DRAFT" | "AUTO_GENERATED";
  generatedBy: string;
  generatedAutomatically: boolean;
}

export interface InventoryDiscrepancy {
  id: string;
  reportDate: string;
  siteStoreId: string;
  siteStoreName: string;
  materialName: string;
  materialCode: string;
  discrepancyType:
    | "NEGATIVE_STOCK"
    | "MISSING_SERIAL"
    | "DUPLICATE_SERIAL"
    | "ISSUED_GREATER_THAN_APPROVED"
    | "RETURNED_GREATER_THAN_ISSUED"
    | "INVENTORY_MISMATCH"
    | "UNCONFIRMED_RECEIPT"
    | "UNRESOLVED_DAMAGED"
    | "UNRESOLVED_MISSING";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  details: string;
  detectedAt: string;
  status: "OPEN" | "INVESTIGATING" | "RESOLVED" | "OVERRULED";
  assignedTo: string[];
  resolvedBy?: string;
  resolvedAt?: string;
  resolutionNotes?: string;
}

export interface DailyReportScheduleConfig {
  id: string;
  reportTime: string; // e.g. "18:00"
  timezone: string; // "Africa/Addis_Ababa"
  workingDays: string[]; // ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
  includeWeekends: boolean;
  includeHolidays: boolean;
  recipients: string[]; // ["Warehouse Manager", "Head Office Manager", "Super Admin"]
  autoSyncToHQ: boolean;
}

// ============================================================================
// PANEL TRACEABILITY MODULE TYPES (DIGITAL CONSTRUCTION ERP SYSTEM)
// ============================================================================

export type PanelTraceabilityStatus =
  | "AVAILABLE"
  | "RESERVED"
  | "REQUESTED"
  | "APPROVED"
  | "ISSUED"
  | "IN_TRANSIT"
  | "AT_SITE_STORE"
  | "ASSIGNED"
  | "INSTALLED"
  | "IN_USE"
  | "DISASSEMBLED"
  | "RETURNED"
  | "DAMAGED"
  | "UNDER_REPAIR"
  | "MISSING"
  | "LOST"
  | "RETIRED";

export type PanelPhysicalCondition =
  | "NEW"
  | "GOOD"
  | "USED_GOOD"
  | "MINOR_DAMAGE"
  | "DAMAGED"
  | "CRITICAL_DAMAGE"
  | "UNDER_REPAIR"
  | "UNUSABLE";

export type StandardPanelCategory =
  | "Internal Wall Panel"
  | "External Wall Panel"
  | "Extend Panel"
  | "Soffit Panel"
  | "Beam Panel"
  | "CA"
  | "IC"
  | "SC"
  | "SCR"
  | "Slab Panel"
  | "Door End"
  | "Wall End"
  | "Stair Panel"
  | "Corner Panel"
  | "Filler Panel"
  | "Special Panel"
  | "Other";

export type PanelInstallationStatus =
  | "NOT_INSTALLED"
  | "IN_PROGRESS"
  | "INSTALLED"
  | "IN_USE"
  | "DISASSEMBLED";

export interface PanelAssociatedAccessory {
  accessoryId: string;
  accessoryCode: string;
  serialNumber?: string;
  accessoryType: "Pin" | "Wedge" | "Tie" | "Corner accessory" | "Support accessory" | string;
  dimensions: string;
  quantity: number;
  condition: PanelPhysicalCondition;
  currentLocation: string;
  movementHistory?: string[];
  addedAt?: string;
}

export interface TraceablePanel {
  panelId: string;
  panelCode: string;
  serialNumber: string;
  QRCode: string;
  barcode: string;
  panelType: string;
  panelCategory: StandardPanelCategory | string;
  dimensions: string;
  length: number;
  width: number;
  thickness: number;
  weight?: number;
  manufacturer?: string;
  purchaseDate?: string;
  condition: PanelPhysicalCondition;
  status: PanelTraceabilityStatus;
  currentLocation: string;
  currentWarehouseId?: string;
  currentSiteStoreId?: string;
  currentProjectId?: string;
  currentSiteId?: string;
  currentBuildingId?: string;
  currentFloorId?: string;
  currentZoneId?: string;
  assignedTeamLeaderId?: string;
  assignedGangChiefId?: string;
  assignedSectionHeadId?: string;
  installationStatus: PanelInstallationStatus;
  createdAt: string;
  updatedAt: string;

  // Extended properties for full ERP integration
  associatedAccessories?: PanelAssociatedAccessory[];
  stairConfig?: StairPanelConfig;
  lastMovementId?: string;
  lastMovementAction?: string;
  lastMovementDate?: string;
  lastUserId?: string;
  lastUserName?: string;
  lastScannedDate?: string;
  lastScannedBy?: string;
  photoUrl?: string;
  expectedReturnDate?: string;
  notes?: string;
  qrReplacementCount?: number;
  lastQrReprintDate?: string;
}

export type PanelTraceabilityAction =
  | "RECEIVE"
  | "TRANSFER"
  | "REQUEST"
  | "APPROVE"
  | "ISSUE"
  | "ASSIGN"
  | "INSTALL"
  | "USE"
  | "DISASSEMBLE"
  | "RETURN"
  | "DAMAGE_REPORT"
  | "REPAIR_START"
  | "REPAIR_COMPLETE"
  | "MISSING_REPORT"
  | "FOUND"
  | "RETIRE"
  | "AUDIT_RECONCILE"
  | "ACCESSORY_ATTACH"
  | "ACCESSORY_DETACH"
  | "QR_LABEL_REPRINT";

export interface PanelTraceabilityMovement {
  movementId: string;
  panelId: string;
  serialNumber: string;
  panelCode: string;
  action: PanelTraceabilityAction;
  fromLocation: string;
  toLocation: string;
  projectId?: string;
  projectName?: string;
  siteId?: string;
  siteName?: string;
  buildingId?: string;
  floorId?: string;
  zoneId?: string;
  assignedTeamLeaderId?: string;
  assignedGangChiefId?: string;
  userId: string;
  userName: string;
  userRole: string;
  timestamp: string;
  reason: string;
  conditionBefore: PanelPhysicalCondition;
  conditionAfter: PanelPhysicalCondition;
  notes?: string;
  attachmentPhoto?: string;
  statusBefore?: PanelTraceabilityStatus;
  statusAfter?: PanelTraceabilityStatus;
}

export interface PanelDamageInspection {
  inspectionId: string;
  panelId: string;
  serialNumber: string;
  panelCode: string;
  damageType: "Bent / Deformed" | "Cracked Weld" | "Face Dent" | "Corner Damaged" | "Pin Hole Enlarged" | "Coating Stripped" | "Missing Profile" | "Other";
  damageDescription: string;
  severity: "MINOR" | "MODERATE" | "CRITICAL" | "SCRAP";
  damagePhoto?: string;
  reportedBy: string;
  reportedByRole: string;
  dateTime: string;
  currentLocation: string;
  repairDecision: "REPAIR_ON_SITE" | "TRANSFER_TO_CENTRAL_WORKSHOP" | "RETIRE_AND_SCRAP" | "MONITOR_IN_SERVICE";
  repairStatus: "PENDING_ASSESSMENT" | "UNDER_REPAIR" | "REPAIRED_APPROVED" | "SCRAPPED";
  estimatedRepairCostEtb?: number;
  repairedDate?: string;
  repairedBy?: string;
}

export interface PanelIssueTransaction {
  issueId: string;
  panelSerial: string;
  panelCode: string;
  panelId: string;
  requesterId: string;
  requesterName: string;
  requesterRole: string;
  teamLeaderId?: string;
  teamLeaderName?: string;
  gangChiefId?: string;
  gangChiefName?: string;
  sectionHeadId?: string;
  project: string;
  projectId: string;
  site: string;
  siteId: string;
  building: string;
  floor: string;
  zone: string;
  issueDateTime: string;
  expectedReturnDate: string;
  condition: PanelPhysicalCondition;
  issuedBy: string;
  issuedByRole: string;
  accessoriesIssued?: { type: string; qty: number }[];
  notes?: string;
}

export interface PanelReturnTransaction {
  returnId: string;
  panelSerial: string;
  panelCode: string;
  panelId: string;
  returnDateTime: string;
  returnedBy: string;
  returnedByRole: string;
  condition: PanelPhysicalCondition;
  damageStatus: "NO_DAMAGE" | "MINOR_DAMAGE" | "CRITICAL_DAMAGE" | "UNUSABLE";
  missingAccessories: string[];
  photosIfDamaged?: string[];
  inspectionResult: "ACCEPTED_BACK_TO_STOCK" | "ACCEPTED_NEEDS_CLEANING" | "QUARANTINED_FOR_REPAIR" | "REJECTED_HEAVY_DAMAGE";
  inspectorName: string;
  inspectorRole: string;
  destinationStoreOrWarehouse: string;
  notes?: string;
}

export interface PanelInventoryReconciliationRecord {
  reconciliationId: string;
  auditDate: string;
  facilityType: "WAREHOUSE" | "SITE_STORE" | "PROJECT_SITE";
  facilityId: string;
  facilityName: string;
  panelCode: string;
  panelType: string;
  dimension: string;
  systemStock: number;
  physicalStock: number;
  issuedPanels: number;
  returnedPanels: number;
  installedPanels: number;
  damagedPanels: number;
  missingPanels: number;
  discrepancyCount: number;
  discrepancyType: "MATCH" | "SURPLUS" | "SHORTAGE" | "LOCATION_MISMATCH";
  auditedBy: string;
  auditedByRole: string;
  status: "CONFIRMED_MATCH" | "DISCREPANCY_FLAGGED" | "INVESTIGATING" | "RECONCILED";
  actionTaken?: string;
  notes?: string;
}

export interface DailyPanelMovementReportData {
  reportId: string;
  reportDate: string;
  scopeType: "ALL" | "WAREHOUSE" | "SITE_STORE" | "PROJECT" | "SITE";
  scopeId: string;
  scopeName: string;
  openingPanels: number;
  received: number;
  transferredIn: number;
  transferredOut: number;
  issued: number;
  returned: number;
  installed: number;
  disassembled: number;
  damaged: number;
  missing: number;
  lost: number;
  closingPanels: number;
  breakdownByWarehouse: { name: string; count: number }[];
  breakdownBySiteStore: { name: string; count: number }[];
  breakdownByProject: { name: string; count: number }[];
  breakdownByTeam: { name: string; count: number }[];
  breakdownByGang: { name: string; count: number }[];
  movementRecordsCount: number;
  generatedAt: string;
  generatedBy: string;
  notificationsSentTo: string[];
}

export interface PanelTraceabilityAuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  panelId: string;
  serialNumber: string;
  panelCode: string;
  previousLocation: string;
  newLocation: string;
  previousStatus: string;
  newStatus: string;
  previousCondition: string;
  newCondition: string;
  timestamp: string;
  ipDeviceMetadata: string;
  notes: string;
  oldQrStatus?: string;
  replacementReason?: string;
}

