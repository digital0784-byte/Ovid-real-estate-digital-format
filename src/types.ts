export enum UserRole {
  SUPER_ADMIN = "Admin",
  HEAD_OFFICE = "Head Office",
  FINANCE_MANAGER = "Finance Manager",
  WAREHOUSE_MANAGER = "Warehouse Manager",
  STORE_OWNER = "Store Owner",
  PROCUREMENT_MANAGER = "Procurement Manager",
  PROJECT_MANAGER = "Project Manager",
  SECTION_HEAD = "Section Head",
  SUPERVISOR = "Supervisor",
  SITE_ENGINEER = "Site Engineer",
  SURVEYOR = "Surveyor",
  QAQC_ENGINEER = "QA/QC Engineer",
  HSE_OFFICER = "HSE Officer",
  TEAM_LEADER = "Team Leader",
  GANG_CHIEF = "Gang Chief",
  TIME_KEEPER = "Time Keeper",
  ASSEMBLER = "Assembler",
  DRIVER = "Driver",
  CLIENT_CONSULTANT = "Client / Consultant",
  AUDITOR = "Auditor",
  VISITOR = "Visitor",
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
  | "Material Request Notifications"
  | "Material Approval Notifications"
  | "Material Transfer Notifications"
  | "Material Return Notifications"
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
  projectName: string;
  siteName?: string;
  building?: string;
  floor?: string;
  zone?: string;
  sender: string;
  senderRole?: string;
  receiver: string;
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
  deviceInfo: {
    ip: string;
    deviceType: string;
    browserOs: string;
    locationGps?: string;
  };
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




