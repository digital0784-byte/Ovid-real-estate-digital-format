export enum UserRole {
  SUPER_ADMIN = "Super Admin",
  SYSTEM_OPERATOR = "System Operator",
  HEAD_OFFICE = "Head Office",
  PROJECT_MANAGER = "Project Manager",
  SECTION_HEAD = "Section Head",
  TEAM_LEADER = "Team Leader",
  GANG_CHIEF = "Gang Chief",
  ASSEMBLER = "Assembler",
  STORE_MANAGER = "Store Manager",
  STORE_OWNER = "Store Owner",
  FINANCE_MANAGER = "Finance Manager",
  ACCOUNTANT = "Accountant",
  AUDITOR = "Auditor",
  SUPERVISOR = "Supervisor",
  SITE_ENGINEER = "Site Engineer",
  HSE_OFFICER = "HSE Officer",
  SURVEYOR = "Surveyor",
  TIME_KEEPER = "Time Keeper",
  WAREHOUSE_MANAGER = "Warehouse Manager",
  HR = "HR",
  HR_MANAGER = "HR Manager",
  OFFICE_MANAGER = "Office Manager",
  OPERATION_MANAGER = "Operation Manager",
  DIRECTOR = "Director",
  DIRECTORY = "Directory",
  OFFICE_AND_TECHNICAL_ENGINEERING = "Office & Technical Engineering",
  EMPLOYEE = "Employee",
  DRIVER = "Driver",
  WORKER = "Worker",
  MATERIAL_HANDLING = "Material Handling",
  GATE_SECURITY_OFFICER = "Gate Security Officer"
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
  GPS_GEOFENCE = "GPS Geofence",
  MANUAL_ENTRY = "Manual Entry"
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
  // Extended Enterprise HRM fields (backward-compatible)
  employeeId?: string; // Auto-generated e.g. OVID-EMP-2026-0001
  faydaId?: string; // Ethiopian National Digital ID (Fayda)
  qualifications?: string;
  experienceYears?: number;
  experienceSummary?: string;
  biometricRegistered?: boolean;
  biometricEnrollmentStatus?: BiometricEnrollmentStatus;
  biometricWorkflowStage?: BiometricWorkflowStage;
  biometricDeviceId?: string;
  biometricDeviceName?: string;
  biometricDeviceModel?: string;
  biometricDeviceSerialNumber?: string;
  biometricDeviceUserId?: string;
  biometricEnrollmentDate?: string;
  biometricMappingStatus?: "Unmapped" | "Pending" | "Active" | "Inactive";
  biometricMappingId?: string;
  biometricAttendanceActivated?: boolean;
  biometricAttendanceActivatedAt?: string;
  biometricEnrolledBy?: string;
  biometricEnrolledByUid?: string;
  photoStoragePath?: string;
  documents?: {
    id: string;
    name: string;
    category: "Contract" | "ID / Fayda" | "Certificate" | "Medical" | "Clearance" | "Other";
    url: string;
    storagePath?: string;
    uploadedAt: string;
  }[];
  salaryStructureId?: string;
  housingAllowance?: number;
  transportAllowance?: number;
  positionAllowance?: number;
  medicalAllowance?: number;
  leaveBalances?: {
    annual: number;
    sick: number;
    maternityPaternity: number;
    unpaidUsed: number;
  };
  currentSite?: string;
  workLocationType?: "Head Office" | "Construction Site";
  defaultScheduleId?: string;
  recruitmentRequestId?: string;
  excessApprovalRequestId?: string;
  jobResponsibilities?: string;
  certifications?: string;
  salaryGrade?: string;
  userId?: string; // Linked Firebase Auth UID for employee self-service access
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
  payableId?: string; // Auto-generated AP-YYYYMMDD-XXXX
  referenceNo?: string;
  billNumber?: string;
  purchaseOrderNumber?: string;
  contractNumber?: string;
  category: "Material" | "Labor" | "Equipment" | "Overhead" | "Subcontractor" | "Logistics" | "Utilities" | "Administrative" | string;
  payableCategory?: PayableCategory | string;
  subtotalAmount?: number; // Invoice amount before tax
  taxAmount?: number;
  amount: number; // Total Payable Amount
  paidAmount?: number;
  date: string;
  invoiceDate?: string;
  dueDate?: string;
  paymentTerms?: string;
  vendor: string;
  supplier?: string;
  description: string;
  project: string;
  projectId?: string;
  department?: string;
  costCenter: string;
  responsibleOfficer?: string;
  approvedBy: string;
  approvedAt?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  docsVerifiedBy?: string;
  docsVerifiedAt?: string;
  workflowStage?: PayableWorkflowStage;
  isDisputed?: boolean;
  disputeReason?: string;
  supportingDocuments?: SupportingDocMeta[];
  authorizedAdjustmentAmount?: number;
  authorizedAdjustmentReason?: string;
  auditHistory?: ArApAuditEntry[];
  status?: FinancialTransactionStatus | string;
  unitCost?: number;
  quantity?: number;
  unit?: string;
  paymentMethod?: string;
  createdBy?: string;
  createdById?: string;
  createdAt?: string;
  updatedAt?: string;
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
  recordedByUid?: string;
  scheduleId?: string;
  biometricDeviceId?: string;
  biometricDeviceName?: string;
  biometricUserId?: string;
  biometricMappingId?: string;
  biometricSourceProtocol?: string;
  workLocationType?: "Head Office" | "Construction Site";
  punchCompleteness?: "Complete" | "Missing Check-Out" | "Missing Check-In";
  missingPunchType?: "Missing Check-Out" | "Missing Check-In" | "None";
  overtimeCandidateHours?: number;
  hrReviewStatus?: "Not Required" | "Pending HR Review" | "Approved" | "Rejected";
  hrReviewedBy?: string;
  hrReviewedAt?: string;
  hrReviewNotes?: string;
  exceptionReason?: string;
  // Part 2: Strict HR Manager Final Approval, Manual Corrections, Reconciliation & Audit Trail
  finalApprovalStatus?: AttendanceApprovalStatus;
  reviewedBy?: string;
  reviewedByUid?: string;
  reviewedByRole?: string;
  reviewedAt?: string;
  finalApprovedBy?: string;
  finalApprovedByUid?: string;
  finalApprovedAt?: string;
  approvalComments?: string;
  originalBiometricSnapshot?: OriginalBiometricEventSnapshot;
  discrepancyFlag?: {
    reportedBy: string;
    reportedByUid: string;
    reportedByRole: string;
    reportedAt: string;
    notes: string;
    status: "Open" | "Resolved";
  };
  approvalAuditHistory?: AttendanceApprovalAuditEntry[];
  payrollFinalized?: boolean;
  payrollFinalizedAt?: string;
  payrollRunId?: string;
  reconciledDayCategory?: AttendanceReconciledDayStatus;
  timezone?: "Africa/Addis_Ababa";
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
  { id: "hr_admin", nameEn: "HR, Timekeeping & Administration", nameAm: "ሰው ኃይልና አስተዳደር" },
  { id: "office_technical_eng", nameEn: "Office & Technical Engineering", nameAm: "ኦፊስ እና ቴክኒካል ኢንጂነሪንግ" },
  { id: "directory", nameEn: "Directory", nameAm: "ዳይሬክቶሬት (Directory)" }
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
  id?: string;
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
  id?: string;
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
  id?: string;
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
  id?: string;
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
  id?: string;
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
  id?: string;
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

// ============================================================================
// TASK MANAGEMENT & ENTERPRISE EXECUTION TYPES (DIGITAL CONSTRUCTION ERP)
// ============================================================================

export type TaskStatus =
  | "Pending"
  | "In Progress"
  | "Completed"
  | "Rejected"
  | "Cancelled"
  | "Overdue";

export type TaskPriority = "Low" | "Medium" | "High" | "Critical";

export interface ErpTaskEvidence {
  id: string;
  name: string;
  url?: string;
  type?: "Document" | "Photo" | "Drawing" | "CAD" | "Report";
  uploadedAt: string;
  uploadedBy: string;
}

export interface ErpTask {
  id: string; // e.g. TSK-2026-101
  taskId: string;
  taskName: string;
  description: string;
  projectId: string;
  projectName: string;
  siteId?: string;
  siteName: string;
  building?: string;
  floor?: number | string;
  zone?: string;
  assignedToId?: string;
  assignedToUserIds?: string[];
  assignedToName: string; // Assigned person
  assignedToRole?: string;
  assignedTeamLeader?: string;
  assignedGangChief?: string;
  createdById: string;
  createdByName: string; // Created by
  createdByRole?: string;
  createdAt: string; // ISO string
  dueDate: string; // YYYY-MM-DD
  status: TaskStatus;
  priority: TaskPriority;
  updatedAt: string; // Last updated
  updatedById?: string;
  updatedByName?: string;
  completionDate?: string; // Completion date
  category?: "Formwork Assembly" | "Concrete Cast" | "Quality Inspection" | "Safety Rectification" | "Panel Movement" | "General Civil" | string;
  relatedEvidence?: ErpTaskEvidence[];
  relatedPanelSerials?: string[];
  relatedZoneId?: string;
  relatedRecruitmentId?: string;
  relatedRecruitmentNo?: string;
  completionPercentage?: number;
  notes?: string;
}

export interface TaskFilterPreferences {
  searchTerm: string;
  projectId: string;
  siteName: string;
  building: string;
  floor: string;
  zone: string;
  assignedPerson: string;
  createdByName: string;
  status: string;
  priority: string;
  category: string;
  dateFilterType: "all" | "today" | "yesterday" | "last7" | "last30" | "thisMonth" | "custom";
  customStartDate?: string;
  customEndDate?: string;
  sortField: "createdAt" | "taskName" | "dueDate" | "updatedAt" | "priority" | "status" | "completionDate";
  sortDirection: "asc" | "desc";
}

// ============================================================================
// FINANCIAL MANAGEMENT SYSTEM (PART 1 FOUNDATION & EXECUTIVE DASHBOARD)
// ============================================================================

export type FinancialMenuModuleId =
  | "financial-dashboard"
  | "revenue-management"
  | "expense-management"
  | "cash-collection"
  | "cash-payment"
  | "accounts-receivable"
  | "accounts-payable"
  | "aging-receivables"
  | "aging-payables"
  | "budget-management"
  | "general-ledger"
  | "profit-and-loss"
  | "cash-flow"
  | "cash-and-bank"
  | "liquidity-management"
  | "financial-reports"
  | "financial-notifications"
  | "financial-settings"
  // Preserved Extended Construction ERP Finance Tools
  | "project-mgmt"
  | "payroll-mgmt"
  | "formwork-assets"
  | "warehouse-cost"
  | "procurement-cost"
  | "equipment-cost"
  | "ai-analytics"
  | "integrations";

export type FinancialPeriodPreset =
  | "daily"
  | "weekly"
  | "monthly"
  | "bimonthly"
  | "quarterly"
  | "semiannual"
  | "annual"
  | "custom";

export type FinancialTransactionStatus =
  | "Draft"
  | "Pending"
  | "Approved"
  | "Sent"
  | "Partially Paid"
  | "Paid"
  | "Overdue"
  | "Rejected"
  | "Cancelled";

export type CashPlanApprovalStatus =
  | "Draft"
  | "Pending Approval"
  | "Approved"
  | "Rejected";

export type CollectionPlanScope =
  | "Company"
  | "Project"
  | "Customer"
  | "Department";

export type PaymentPlanningCategory =
  | "Supplier Payments"
  | "Material Suppliers"
  | "Vehicle Rental"
  | "Equipment Rental"
  | "Restaurant and Food"
  | "Labor Payments"
  | "Salary Payments"
  | "Transportation"
  | "Tax Payments"
  | "Administration"
  | "Other Payments";

export type CashCollectionTxStatus =
  | "Pending Verification"
  | "Verified & Confirmed"
  | "Posted"
  | "Rejected"
  | "Reversed";

export type CashPaymentTxStatus =
  | "Pending Approval"
  | "Director Approval Required"
  | "Confirmed & Paid"
  | "Posted"
  | "Rejected"
  | "Reversed";

export interface CashTransactionApprovalEntry {
  timestamp: string;
  action: "Submitted" | "Verified" | "Approved" | "Director Approved" | "Rejected" | "Reversed" | "Posted";
  actorName: string;
  actorRole: string;
  notes?: string;
}

export interface MonthlyCollectionPlan {
  id: string;
  planNumber: string;
  financialYear: string;
  month: string; // YYYY-MM
  targetScope: CollectionPlanScope;
  project: string;
  customer: string;
  department: string;
  contractNumber: string;
  invoiceNumber: string;
  plannedAmount: number;
  expectedDate: string; // YYYY-MM-DD
  responsiblePerson: string;
  notes?: string;
  approvalStatus: CashPlanApprovalStatus;
  approvedBy?: string;
  approvedAt?: string;
  rejectedReason?: string;
  createdBy: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface MonthlyPaymentPlan {
  id: string;
  planNumber: string;
  financialYear: string;
  month: string; // YYYY-MM
  project: string;
  department: string;
  supplierOrPayee: string;
  expenseCategory: PaymentPlanningCategory | string;
  invoiceNumber: string;
  plannedAmount: number;
  expectedDate: string; // YYYY-MM-DD
  responsiblePerson: string;
  approvalStatus: CashPlanApprovalStatus;
  notes?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedReason?: string;
  createdBy: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export type ReceivableCategory =
  | "Client Contract Receivables"
  | "Certified Payment Receivables"
  | "Retention Money Receivables"
  | "Advance Payment Receivables"
  | "Variation Order Receivables"
  | "Other Receivables";

export type ReceivableLifecycleStatus =
  | "Not Yet Due"
  | "Due Today"
  | "Overdue"
  | "Partially Collected"
  | "Fully Collected"
  | "Disputed";

export type ReceivableWorkflowStage =
  | "Registered"
  | "Finance Review"
  | "Verified"
  | "Completed";

export type PayableCategory =
  | "Material Supplier Payables"
  | "Subcontractor Payables"
  | "Consultant Payables"
  | "Equipment Rental Payables"
  | "Employee Payables"
  | "Operational Expenses"
  | "Tax Payables"
  | "Other Payables";

export type PayableLifecycleStatus =
  | "Not Yet Due"
  | "Due Today"
  | "Overdue"
  | "Partially Paid"
  | "Fully Paid"
  | "Disputed";

export type PayableWorkflowStage =
  | "Registered"
  | "Finance Review"
  | "Supporting Docs Verified"
  | "Approved"
  | "Paid";

export interface SupportingDocMeta {
  id: string;
  name: string;
  fileType?: string;
  sizeBytes?: number;
  uploadedAt: string;
  uploadedBy: string;
  dataUrl?: string; // Compact preview/attachment within Firestore limits
}

export interface ArApAuditEntry {
  timestamp: string;
  action: string;
  actorName: string;
  actorRole: string;
  stage?: string;
  notes?: string;
}

export interface FinancialInvoiceRecord {
  id: string;
  receivableId?: string; // Auto-generated AR-YYYYMMDD-XXXX
  referenceNo?: string;
  invoiceNumber: string;
  contractNumber?: string;
  project: string;
  projectId?: string;
  department?: string;
  category?: string;
  receivableCategory?: ReceivableCategory | string;
  client: string;
  clientName?: string;
  description?: string;
  subtotalAmount?: number; // Invoice Amount before tax
  taxAmount?: number;
  amount: number; // Total Invoice Amount
  paidAmount?: number;
  currency?: string;
  paymentTerms?: string;
  responsibleOfficer?: string;
  supportingDocuments?: SupportingDocMeta[];
  workflowStage?: ReceivableWorkflowStage;
  reviewedBy?: string;
  reviewedAt?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  isDisputed?: boolean;
  disputeReason?: string;
  authorizedAdjustmentAmount?: number;
  authorizedAdjustmentReason?: string;
  auditHistory?: ArApAuditEntry[];
  status: FinancialTransactionStatus | string;
  date: string;
  dueDate: string;
  createdBy?: string;
  createdById?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface FinancialPaymentRecord {
  id: string;
  referenceNo?: string;
  reference?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  expenseId?: string;
  type?: "Collection" | "Payment";
  amount: number;
  date: string;
  method?: string;
  accountId?: string;
  project: string;
  department?: string;
  counterparty?: string;
  status?: string;
  createdBy?: string;
  createdAt?: string;
}

export type BankAccountSubtype =
  | "Checking"
  | "Savings"
  | "Project Escrow"
  | "Payroll"
  | "Overdraft"
  | "Cash Vault";

export interface FinancialAccount {
  id: string;
  accountCode: string;
  accountName: string;
  accountType: "Cash" | "Bank";
  bankAccountSubtype?: BankAccountSubtype | string;
  bankName?: string;
  accountNumber?: string;
  branch?: string;
  swiftOrIban?: string;
  currency: string;
  openingBalance: number;
  currentBalance: number;
  minimumThreshold: number;
  project?: string;
  department?: string;
  lastReconciledDate?: string;
  lastReconciledBalance?: number;
  status: "Active" | "Inactive" | "Frozen" | "Closed";
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CashTransactionRecord {
  id: string;
  referenceNo: string;
  type: "Collection" | "Payment" | "Transfer";
  date: string;
  amount: number;
  currency?: string;
  accountId: string;
  accountName: string;
  toAccountId?: string;
  toAccountName?: string;
  project: string;
  department: string;
  category: string;
  counterparty: string; // Customer for Collection, Supplier/Payee for Payment
  contractNumber?: string;
  invoiceNumber?: string;
  bankReferenceNumber?: string;
  receiptNumber?: string;
  paymentVoucherNumber?: string;
  linkedDocumentType?: "Invoice" | "Expense" | "Payroll" | "Direct";
  linkedDocumentId?: string;
  linkedReferenceNo?: string;
  paymentMethod: "Cash" | "Bank Transfer" | "Mobile Banking" | "Cheque" | "Telebirr" | "CBE Birr" | "CPO" | string;
  status: CashCollectionTxStatus | CashPaymentTxStatus | "Pending" | "Cancelled" | string;
  description?: string;
  notes?: string;
  supportingDocName?: string;
  supportingDocUrl?: string;
  supportingDocuments?: SupportingDocMeta[];
  expectedAmount?: number;
  previouslyPaidAmount?: number;
  remainingBalanceAfter?: number;
  isAuthorizedAdjustment?: boolean;
  adjustmentReason?: string;
  recordedBy?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedReason?: string;
  reversedBy?: string;
  reversedAt?: string;
  reversalReason?: string;
  requiresDirectorApproval?: boolean;
  approvalHistory?: CashTransactionApprovalEntry[];
  createdBy: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface FinancialBudgetRecord {
  id: string;
  project: string;
  projectId?: string;
  department: string;
  category: string;
  period?: string; // e.g., "2026-07" or "2026" or "Annual"
  fiscalYear?: string;
  allocated: number;
  committed: number;
  actual: number;
  description: string;
  descriptionAm?: string;
  status?: "Active" | "Locked" | "Exceeded";
  updatedBy?: string;
  updatedAt?: string;
}

export interface MonthlyFinancialTarget {
  id: string;
  period: string; // YYYY-MM
  project: string;
  department: string;
  category: string;
  plannedRevenue: number;
  plannedExpense: number;
  plannedCollection: number;
  plannedPayment: number;
  notes?: string;
  updatedBy?: string;
  updatedAt: string;
}

export interface FinancialSettingsConfig {
  id: string;
  defaultCurrency: string; // "ETB"
  fiscalYearStartMonth: number; // 1 = Jan, 7 = Hamle (July)
  defaultPaymentTermsDays: number;
  lowCashAlertThresholdEtb: number;
  budgetOverrunAlertPct: number;
  overdueAlertGraceDays: number;
  requireDirectorApprovalAboveEtb: number;
  enableCriticalAlerts: boolean;
  updatedBy?: string;
  updatedAt?: string;
}

export interface FinancialFilterState {
  periodPreset: FinancialPeriodPreset;
  startDate: string;
  endDate: string;
  project: string;
  department: string;
  customer: string;
  supplier: string;
  category: string;
  status: string;
  searchTerm?: string;
}

export type AgingCategoryLabel =
  | "Not Yet Due"
  | "1–30 Days Overdue"
  | "31–60 Days Overdue"
  | "61–90 Days Overdue"
  | "Above 90 Days Overdue";

export interface AgingBucketRow {
  label: AgingCategoryLabel;
  count: number;
  amount: number;
}

export type AgingPerformanceColor = "Green" | "Yellow" | "Red";

export type AgingPerformanceTier =
  | "Above +20%"
  | "+15% to +20%"
  | "0% to +15%"
  | "0% to -20%"
  | "Below -20%";

export interface AgingPerformanceIndicator {
  domain: "AR" | "AP";
  percentageChange: number;
  color: AgingPerformanceColor;
  tier: AgingPerformanceTier;
  statusLabel: string;
  statusLabelAm: string;
  currentOverdueAmount: number;
  previousOverdueAmount: number;
  currentOutstandingAmount: number;
  previousOutstandingAmount: number;
  currentOverdueRatioPct: number;
  previousOverdueRatioPct: number;
  liquidityWarning: boolean;
  narrative: string;
  narrativeAm: string;
}

export interface FinancialAlertItem {
  id: string;
  title: string;
  titleAm: string;
  description: string;
  descriptionAm: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  moduleTarget: FinancialMenuModuleId;
  project?: string;
  amountEtb?: number;
  timestamp: string;
}

export interface FinancialDashboardMetrics {
  // 1. Revenue
  plannedRevenue: number;
  actualRevenue: number;
  revenueDifference: number;
  // 2. Expenses
  plannedExpenses: number;
  actualExpenses: number;
  expenseDifference: number;
  // 3. Cash Collection
  plannedCashCollection: number;
  actualCashCollection: number;
  collectionDifference: number;
  collectionAchievementPct: number;
  outstandingCollectionTarget: number;
  // 4. Cash Payment
  plannedCashPayment: number;
  actualCashPayment: number;
  paymentDifference: number;
  paymentAchievementPct: number;
  outstandingPlannedPayments: number;
  // 5. Accounts Receivable (Part 1 + Part 3)
  totalReceivables: number;
  totalCollectedReceivables: number;
  outstandingReceivables: number;
  overdueReceivables: number;
  receivablesDueThisMonth: number;
  collectionRatePct: number;
  // 6. Accounts Payable (Part 1 + Part 3)
  totalPayables: number;
  totalPaidPayables: number;
  outstandingPayables: number;
  overduePayables: number;
  payablesDueThisMonth: number;
  paymentRatePct: number;
  totalOverdueAmount: number;
  netReceivablePosition: number;
  arAgingPerformance: AgingPerformanceIndicator;
  apAgingPerformance: AgingPerformanceIndicator;
  // 7. Profit and Loss
  plannedProfit: number;
  actualProfitOrLoss: number;
  profitMarginPct: number;
  // 8. Cash and Liquidity
  availableCashBalance: number;
  totalBankBalance: number;
  netCashFlow: number;
  currentLiquidityPosition: number;
  netWorkingLiquidity: number;
  liquidityRatio: number | null;
  // 9. Budgets
  totalBudgetAllocated: number;
  budgetUtilizationPct: number;
}

export type CashReportTypeId =
  | "daily-cash-collection"
  | "weekly-cash-collection"
  | "monthly-cash-collection"
  | "daily-cash-payment"
  | "weekly-cash-payment"
  | "monthly-cash-payment"
  | "project-wise-collection"
  | "project-wise-payment"
  | "customer-wise-collection"
  | "supplier-wise-payment"
  | "collection-variance"
  | "payment-variance"
  | "outstanding-collection"
  | "upcoming-payment";

export type ArApReportTypeId =
  | "accounts-receivable-report"
  | "accounts-payable-report"
  | "client-outstanding-balance-report"
  | "supplier-outstanding-balance-report"
  | "project-receivable-report"
  | "project-payable-report"
  | "aging-receivable-report"
  | "aging-payable-report"
  | "monthly-collection-report"
  | "monthly-payment-report"
  | "overdue-receivable-report"
  | "overdue-payable-report";

// ============================================================================
// PART 4: BUDGET MANAGEMENT & COST CONTROL SYSTEM TYPES
// ============================================================================

export type Part4BudgetCategory =
  | "Material Costs"
  | "Labor Costs"
  | "Equipment Costs"
  | "Subcontractor Costs"
  | "Consultant Costs"
  | "Transportation Costs"
  | "Administrative Costs"
  | "Site Overhead Costs"
  | "Utilities Costs"
  | "Tax and Duties"
  | "Contingency"
  | "Other Project Costs";

export type ProjectBudgetStatus =
  | "Draft"
  | "Submitted"
  | "Under Review"
  | "Approved"
  | "Rejected"
  | "Revised"
  | "Closed";

export type ProjectBudgetWorkflowStage =
  | "Budget Preparation"
  | "Finance Review"
  | "Project Manager Review"
  | "Management Approval"
  | "Budget Activation";

export type BudgetAllocationStatus =
  | "Draft"
  | "Pending Verification"
  | "Finance Verified"
  | "Approved"
  | "Rejected";

export type BudgetRevisionStatus =
  | "Requested"
  | "Finance Review"
  | "PM Review"
  | "Approved"
  | "Rejected";

export type ActualCostVerificationStatus =
  | "Registered"
  | "Source Verified"
  | "Budget Classified"
  | "Validated"
  | "Rejected";

export type ActualCostSourceModule =
  | "Procurement"
  | "Material Management"
  | "Inventory"
  | "Payroll"
  | "Equipment Management"
  | "Subcontractor Management"
  | "Accounts Payable"
  | "Petty Cash"
  | "Direct Entry";

export type BudgetUtilizationColor = "Green" | "Yellow" | "Orange" | "Red";

export interface BudgetAuditEntry {
  timestamp: string;
  action: string;
  actorName: string;
  actorRole: string;
  stage?: string;
  notes?: string;
}

export interface ProjectBudgetItem {
  id: string;
  budgetItemId: string;
  projectName: string;
  budgetCategory: Part4BudgetCategory;
  subcategory: string;
  itemDescription: string;
  unitOfMeasurement: string;
  plannedQuantity: number;
  unitPrice: number;
  totalPlannedCost: number;
  remarks?: string;
}

export interface ProjectBudgetPlan {
  id: string;
  budgetId: string;
  projectName: string;
  projectId?: string;
  projectCode: string;
  contractNumber: string;
  clientName: string;
  projectManager: string;
  department?: string;
  budgetPreparationDate: string;
  budgetPeriod: string;
  budgetYear: string;
  projectStartDate: string;
  projectCompletionDate: string;
  originalContractAmount: number;
  originalApprovedBudget: number;
  approvedProjectBudget: number;
  contingencyBudget: number;
  currency: string;
  lineItems: ProjectBudgetItem[];
  budgetPreparedBy: string;
  reviewedBy?: string;
  reviewedAt?: string;
  pmReviewedBy?: string;
  pmReviewedAt?: string;
  approvedBy?: string;
  approvalDate?: string;
  rejectionReason?: string;
  supportingDocuments?: SupportingDocMeta[];
  budgetStatus: ProjectBudgetStatus;
  workflowStage: ProjectBudgetWorkflowStage;
  auditHistory?: BudgetAuditEntry[];
  createdBy: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetAllocationRecord {
  id: string;
  allocationId: string;
  projectBudgetPlanId: string;
  projectName: string;
  projectCode?: string;
  budgetYear: string;
  budgetMonth: string; // YYYY-MM
  budgetCategory: Part4BudgetCategory;
  budgetItem?: string;
  budgetItemId?: string;
  allocatedAmount: number;
  previouslyAllocatedAmount: number;
  remainingUnallocatedBudget: number;
  preparedBy: string;
  reviewedBy?: string;
  reviewedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  approvalStatus: BudgetAllocationStatus;
  notes?: string;
  auditHistory?: BudgetAuditEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface BudgetRevisionRecord {
  id: string;
  revisionId: string;
  projectBudgetPlanId: string;
  projectName: string;
  projectCode?: string;
  affectedCategory?: Part4BudgetCategory | "All Categories";
  originalApprovedBudget: number;
  previousRevisedBudget: number;
  proposedRevisedBudget: number;
  budgetChangeAmount: number; // + increase, - decrease
  revisionReason: string;
  supportingDocuments?: SupportingDocMeta[];
  requestedBy: string;
  requestedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  pmReviewedBy?: string;
  pmReviewedAt?: string;
  approvedBy?: string;
  approvalDate?: string;
  rejectionReason?: string;
  revisionStatus: BudgetRevisionStatus;
  auditHistory?: BudgetAuditEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface ActualCostEntry {
  id: string;
  costTransactionId: string;
  projectName: string;
  projectCode?: string;
  transactionDate: string;
  budgetCategory: Part4BudgetCategory;
  budgetItem?: string;
  budgetItemId?: string;
  costDescription: string;
  quantity: number;
  unitPrice: number;
  totalCost: number;
  paidAmount?: number;
  supplierOrPayee: string;
  invoiceNumber?: string;
  paymentVoucherNumber?: string;
  sourceModule: ActualCostSourceModule;
  sourceRecordId?: string;
  supportingDocuments?: SupportingDocMeta[];
  recordedBy: string;
  verifiedBy?: string;
  verifiedAt?: string;
  validatedBy?: string;
  validatedAt?: string;
  rejectionReason?: string;
  verificationStatus: ActualCostVerificationStatus;
  auditHistory?: BudgetAuditEntry[];
  createdAt: string;
  updatedAt: string;
}

export type BudgetReportTypeId =
  | "project-budget-report"
  | "monthly-budget-allocation-report"
  | "actual-cost-report"
  | "budget-vs-actual-cost-report"
  | "budget-utilization-report"
  | "cost-variance-report"
  | "project-cost-breakdown-report"
  | "budget-revision-history-report"
  | "monthly-expenditure-report"
  | "quarterly-expenditure-report"
  | "annual-project-cost-report"
  | "projects-over-budget-report"
  | "remaining-budget-report"
  | "project-financial-performance-report";

export interface BudgetPerformanceIndicatorInfo {
  utilizationPct: number;
  color: BudgetUtilizationColor;
  tierLabel: string;
  tierLabelAm: string;
  varianceAmount: number;
  varianceStatus: "Under Budget" | "On Budget" | "Over Budget";
  overrunAmount: number;
}

// ============================================================================
// PART 5: CASH FLOW MANAGEMENT, FINANCIAL FORECASTING & BANK RECONCILIATION
// ============================================================================

export type CashInflowCategory =
  | "Client Payments"
  | "Advance Payments"
  | "Certified Payments"
  | "Other Project Income";

export type CashOutflowCategory =
  | "Material Payments"
  | "Salary and Wages"
  | "Subcontractor Payments"
  | "Equipment Costs"
  | "Operational Expenses"
  | "Tax Payments"
  | "Other Expenses";

export type CashFlowForecastGranularity =
  | "Daily"
  | "Monthly"
  | "Quarterly"
  | "Annual";

export type CashFlowForecastStatus =
  | "Draft"
  | "Submitted"
  | "Approved"
  | "Rejected";

export type CashFlowForecastSource =
  | "Manual Forecast"
  | "Expected Client Collection"
  | "Outstanding Receivable"
  | "Scheduled Supplier Payment"
  | "Payroll Obligation"
  | "Approved Project Budget"
  | "Planned Project Expenditure";

export interface CashFlowAuditEntry {
  timestamp: string;
  action: string;
  actorName: string;
  actorRole: string;
  notes?: string;
}

export interface CashFlowForecastItem {
  id: string;
  forecastRef: string;
  direction: "Inflow" | "Outflow";
  category: CashInflowCategory | CashOutflowCategory;
  project: string;
  projectId?: string;
  accountId?: string;
  accountName?: string;
  expectedDate: string; // YYYY-MM-DD
  financialYear: string;
  amount: number;
  currency: string;
  counterparty: string;
  sourceType: CashFlowForecastSource;
  linkedDocumentId?: string;
  linkedReferenceNo?: string;
  probabilityPct?: number; // 0-100 confidence
  isRecurring?: boolean;
  recurrenceInterval?: "Monthly" | "Quarterly";
  approvalStatus: CashFlowForecastStatus;
  notes?: string;
  preparedBy: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedReason?: string;
  auditHistory?: CashFlowAuditEntry[];
  createdBy: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export type BankStatementMatchStatus =
  | "Matched"
  | "Unmatched"
  | "Missing in ERP"
  | "Duplicate"
  | "Outstanding Deposit"
  | "Unpresented Cheque"
  | "Bank Charge Not Recorded";

export interface BankStatementLineItem {
  id: string;
  lineNumber?: number;
  statementDate: string; // YYYY-MM-DD
  valueDate?: string;
  bankReferenceNo: string;
  chequeNumber?: string;
  description: string;
  direction: "Credit" | "Debit"; // Credit = Deposit/Inflow, Debit = Withdrawal/Outflow
  amount: number;
  depositAmount?: number;
  withdrawalAmount?: number;
  runningBalance?: number;
  matchedCashTxId?: string;
  matchedCashTxRef?: string;
  matchedBankTxId?: string;
  matchedBankTxRef?: string;
  matchType?: "Auto" | "Manual";
  matchStatus: BankStatementMatchStatus | "Matched" | "Unmatched";
  classificationNote?: string;
  correctedBy?: string;
  correctedAt?: string;
}

export type BankReconciliationStatus =
  | "Draft"
  | "Submitted"
  | "Finance Review"
  | "Reconciled"
  | "Disputed";

export type BankReconciliationWorkflowStage =
  | "Statement Upload"
  | "Transaction Matching"
  | "Difference Identification"
  | "Finance Review"
  | "Reconciliation Approval"
  | "Final Report";

export interface BankReconciliationRecord {
  id: string;
  reconciliationNo: string;
  accountId: string;
  accountName: string;
  accountCode?: string;
  bankName?: string;
  accountNumber?: string;
  statementId?: string;
  statementNo?: string;
  periodStart: string; // YYYY-MM-DD
  periodEnd: string; // YYYY-MM-DD
  statementOpeningBalance: number;
  statementClosingBalance: number;
  bookOpeningBalance: number;
  bookClosingBalance: number;
  reconciledInflowsTotal: number;
  reconciledOutflowsTotal: number;
  unreconciledBookCount: number;
  unreconciledBookNet: number;
  unmatchedStatementNet: number;
  discrepancyAmount: number;
  outstandingDepositsTotal?: number;
  unpresentedChequesTotal?: number;
  bankChargesNotRecordedTotal?: number;
  duplicateCount?: number;
  missingInErpCount?: number;
  matchedCount?: number;
  unmatchedCount?: number;
  reconciledTxIds: string[];
  statementLines: BankStatementLineItem[];
  workflowStage?: BankReconciliationWorkflowStage;
  approvalStatus: BankReconciliationStatus;
  preparedBy: string;
  reviewedBy?: string;
  reviewedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  notes?: string;
  auditHistory?: CashFlowAuditEntry[];
  createdAt: string;
  updatedAt: string;
}

export type CashFlowReportTypeId =
  | "daily-cash-flow"
  | "monthly-cash-flow-statement"
  | "quarterly-cash-flow"
  | "annual-cash-flow"
  | "cash-forecast-report"
  | "bank-reconciliation-report"
  | "cash-shortage-report";

// ============================================================================
// PART 6: BANK MANAGEMENT & BANK RECONCILIATION SYSTEM TYPES
// ============================================================================

export type BankTransactionType =
  | "Deposits"
  | "Withdrawals"
  | "Client Payments"
  | "Supplier Payments"
  | "Salary Payments"
  | "Bank Transfers"
  | "Bank Charges"
  | "Interest Income"
  | "Other Transactions";

export type BankTransactionApprovalStatus =
  | "Pending Verification"
  | "Pending Approval"
  | "Approved"
  | "Rejected"
  | "Reversed";

export interface BankTransactionRecord {
  id: string;
  transactionNo: string;
  accountId: string;
  accountName: string;
  bankName?: string;
  accountNumber?: string;
  toAccountId?: string;
  toAccountName?: string;
  transactionType: BankTransactionType;
  direction: "Credit" | "Debit"; // Credit = Inflow/Deposit, Debit = Outflow/Withdrawal
  transactionDate: string; // YYYY-MM-DD
  valueDate?: string;
  amount: number;
  currency: string;
  referenceNo: string;
  chequeNumber?: string;
  project: string;
  department?: string;
  counterparty: string;
  description: string;
  paymentMethod?: string;
  linkedDocumentType?: "Invoice" | "Expense" | "Payroll" | "CashTransaction" | "Direct";
  linkedDocumentId?: string;
  linkedReferenceNo?: string;
  linkedCashTxId?: string;
  sourceChannel: "Manual" | "Statement Import" | "Cash Module" | "AR" | "AP" | "Payroll";
  importedStatementId?: string;
  importedStatementLineId?: string;
  approvalStatus: BankTransactionApprovalStatus;
  reconciliationStatus?: "Unreconciled" | "Matched" | "Reconciled";
  reconciliationId?: string;
  isDuplicateFlag?: boolean;
  recordedBy: string;
  verifiedBy?: string;
  verifiedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedReason?: string;
  reversedBy?: string;
  reversedAt?: string;
  reversalReason?: string;
  auditHistory?: CashFlowAuditEntry[];
  createdBy: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface ImmutableBankStatementLine {
  id: string;
  lineNumber: number;
  transactionDate: string;
  description: string;
  referenceNo: string;
  chequeNumber?: string;
  depositAmount: number;
  withdrawalAmount: number;
  runningBalance?: number;
  direction: "Credit" | "Debit";
  amount: number;
  wasManuallyCorrected?: boolean;
  originalRawText?: string;
}

export interface ImmutableBankStatementRecord {
  id: string;
  statementNo: string;
  accountId: string;
  accountName: string;
  bankName: string;
  accountNumber: string;
  currency: string;
  fileName: string;
  fileFormat: "Excel" | "CSV" | "PDF";
  fileSizeBytes: number;
  fileChecksum: string;
  periodStart: string;
  periodEnd: string;
  openingBalance: number;
  closingBalance: number;
  totalDeposits: number;
  totalWithdrawals: number;
  lineCount: number;
  isImmutable: true; // Original uploaded statement snapshot, never overwritten
  originalLines: ImmutableBankStatementLine[];
  uploadedBy: string;
  uploadedById: string;
  uploadedByRole: string;
  uploadedAt: string;
  notes?: string;
}

export type Part6BankReportTypeId =
  | "bank-account-report"
  | "bank-transaction-report"
  | "monthly-bank-statement"
  | "bank-reconciliation-report"
  | "unmatched-transaction-report"
  | "bank-charges-report"
  | "cash-and-bank-position-report";

// ============================================================================
// PART 7: FINANCIAL STATEMENTS, DOUBLE-ENTRY LEDGER & PERIOD CLOSING TYPES
// ============================================================================

export type ChartAccountType =
  | "Asset"
  | "Liability"
  | "Equity"
  | "Revenue"
  | "Cost of Construction"
  | "Operating Expense"
  | "Administrative Expense";

export type ChartAccountSubType =
  | "Current Asset"
  | "Non-Current Asset"
  | "Current Liability"
  | "Non-Current Liability"
  | "Owner Capital"
  | "Retained Earnings"
  | "Dividends / Drawings"
  | "Project Revenue"
  | "Other Income"
  | "Direct Construction Cost"
  | "Operating Expense"
  | "Administrative Expense";

export interface ChartAccountRecord {
  id: string;
  accountCode: string;
  accountName: string;
  accountNameAm?: string;
  accountType: ChartAccountType;
  subType: ChartAccountSubType;
  parentAccountCode?: string;
  parentAccountName?: string;
  level?: number;
  normalBalance: "Debit" | "Credit";
  cashFlowSection: "Operating" | "Investing" | "Financing" | "Non-Cash";
  isSystemAccount: boolean;
  isActive: boolean;
  status?: "Active" | "Inactive" | "Archived";
  openingBalance: number;
  currency: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface JournalEntryLine {
  lineNo: number;
  accountCode: string;
  accountName: string;
  accountType: ChartAccountType;
  subType?: ChartAccountSubType;
  debit: number;
  credit: number;
  memo?: string;
  project?: string;
  department?: string;
}

export type JournalEntryStatus =
  | "Draft"
  | "Submitted"
  | "Posted"
  | "Rejected"
  | "Reversed";

export type JournalEntryType =
  | "Standard"
  | "Opening Balance"
  | "Adjusting"
  | "Closing"
  | "Reversing"
  | "Auto-Sync";

export interface JournalEntryAuditItem {
  timestamp: string;
  action: string;
  actorName: string;
  actorRole: string;
  notes?: string;
}

export interface JournalEntryRecord {
  id: string;
  journalNo: string;
  entryDate: string; // YYYY-MM-DD
  fiscalYear: string;
  periodMonth: string; // YYYY-MM
  project: string;
  department: string;
  referenceNo: string;
  description: string;
  entryType: JournalEntryType;
  sourceModule:
    | "Accounts Receivable"
    | "Accounts Payable"
    | "Cash Management"
    | "Bank Management"
    | "Payroll"
    | "HRM Payroll"
    | "Procurement"
    | "Project Cost Control"
    | "Equipment & Assets"
    | "Inventory"
    | "Manual Journal"
    | "Period Closing";
  sourceRecordId?: string;
  sourceKey?: string;
  uniqueTransactionKey?: string;
  reversesEntryId?: string;
  reversedByEntryId?: string;
  reversalReason?: string;
  isImmutable?: boolean;
  lines: JournalEntryLine[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  status: JournalEntryStatus;
  preparedBy: string;
  preparedById: string;
  reviewedBy?: string;
  reviewedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedReason?: string;
  periodId?: string;
  auditHistory?: JournalEntryAuditItem[];
  createdAt: string;
  updatedAt: string;
}

export type FinancialPeriodCloseStatus =
  | "Open"
  | "Under Review"
  | "Closed"
  | "Reopened";

export interface FinancialPeriodCloseRecord {
  id: string;
  periodKey: string; // e.g., "2026-07", "2026-Q3", "FY2026"
  periodLabel: string;
  periodType: "Daily" | "Monthly" | "Quarterly" | "Annual";
  financialYear: string;
  startDate: string;
  endDate: string;
  status: FinancialPeriodCloseStatus;
  totalRevenueSnapshot: number;
  totalExpensesSnapshot: number;
  netProfitSnapshot: number;
  totalAssetsSnapshot: number;
  totalLiabilitiesSnapshot: number;
  totalEquitySnapshot: number;
  isTrialBalanceBalanced: boolean;
  isBalanceSheetBalanced: boolean;
  closingJournalEntryId?: string;
  preparedBy: string;
  preparedAt?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  reopenedBy?: string;
  reopenedAt?: string;
  reopenedReason?: string;
  notes?: string;
  auditHistory?: JournalEntryAuditItem[];
  createdAt: string;
  updatedAt: string;
}

export interface FinancialYearRecord {
  id: string;
  yearCode: string; // e.g., "FY2026"
  yearLabel: string;
  startDate: string;
  endDate: string;
  status: "Open" | "Closed" | "Reopened";
  closedBy?: string;
  closedAt?: string;
  reopenedBy?: string;
  reopenedAt?: string;
  reopenedReason?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type Part7StatementTypeId =
  | "income-statement"
  | "balance-sheet"
  | "cash-flow-statement"
  | "changes-in-equity"
  | "trial-balance"
  | "general-ledger"
  | "accounts-receivable-report"
  | "accounts-payable-report";

export type Part8LedgerReportTypeId =
  | "general-ledger-report"
  | "account-ledger-report"
  | "trial-balance"
  | "journal-register"
  | "account-balance-summary"
  | "project-ledger"
  | "department-ledger";

// ============================================================================
// HUMAN RESOURCE MANAGEMENT (HRM) ENTERPRISE MODULE
// ============================================================================

export type HrmApprovalDecision = "Pending" | "Approved" | "Rejected";

export interface HrmWorkflowStepLog {
  stage: string;
  actorName: string;
  actorRole: string;
  actorUid?: string;
  decision: HrmApprovalDecision | "Submitted" | "Paid" | "Returned" | "Resubmitted";
  timestamp: string;
  notes?: string;
}

export interface ManpowerPlanRecord {
  id: string;
  planCode: string;
  fiscalYear: string;
  project: string;
  department: string;
  jobPosition: string;
  approvedManpower: number;
  budgetedMonthlySalaryPerHead: number;
  currency: string;
  status: "Draft" | "Approved" | "Locked";
  approvedBy?: string;
  approvedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type RecruitmentWorkflowStage =
  | "Pending HR Manager"
  | "Pending Office Manager"
  | "Pending Finance Manager"
  | "Pending Operation Department"
  | "Pending Director Final Approval"
  | "Pending Director Excess Approval"
  | "Returned for Correction"
  | "Approved"
  | "Rejected"
  | "Fulfilled";

export interface RecruitmentSupportingDocument {
  id: string;
  name: string;
  url: string;
  storagePath?: string;
  uploadedAt: string;
  uploadedBy?: string;
  category?: string;
}

export interface RecruitmentRequestRecord {
  id: string;
  requestNo: string;
  project: string;
  department: string;
  jobPosition: string;
  requestedCount: number;
  hiredCount: number;
  employmentType: "Permanent" | "Contract" | "Daily Labourer";
  urgency: "Normal" | "High" | "Critical";
  requiredByDate: string;
  proposedMonthlySalary: number;
  jobResponsibilities?: string;
  experienceRequired?: string;
  qualificationsRequired: string;
  justification: string;
  supportingDocuments?: RecruitmentSupportingDocument[];
  requestedBy: string;
  requestedById: string;
  requestedByRole: string;
  workflowStage: RecruitmentWorkflowStage;
  status: "Pending" | "Approved" | "Rejected" | "Fulfilled";
  exceedsManpowerLimit: boolean;
  approvedManpowerSnapshot: number;
  actualHiredSnapshot: number;
  remainingVacanciesSnapshot: number;
  excessCount: number;
  excessApprovalStatus: "Not Required" | "Pending Director" | "Approved" | "Rejected";
  hrRegistrationAuthorized?: boolean;
  hrOnboardingTaskId?: string;
  hrOnboardingTaskCreatedAt?: string;
  currentStageTaskId?: string;
  currentStageAssigneeIds?: string[];
  currentStageAssigneeNames?: string[];
  stageSummary?: string;
  rejectionReason?: string;
  rejectedBy?: string;
  rejectedByRole?: string;
  rejectedAt?: string;
  rejectedAtStage?: RecruitmentWorkflowStage;
  correctionNotes?: string;
  returnedBy?: string;
  returnedByRole?: string;
  returnedAt?: string;
  returnedAtStage?: RecruitmentWorkflowStage;
  resubmittedAt?: string;
  resubmittedCount?: number;
  officeManagerApproval?: HrmWorkflowStepLog;
  hrManagerApproval?: HrmWorkflowStepLog;
  financeManagerApproval?: HrmWorkflowStepLog;
  operationApproval?: HrmWorkflowStepLog;
  directorFinalApproval?: HrmWorkflowStepLog;
  directorExcessApproval?: HrmWorkflowStepLog;
  approvalHistory: HrmWorkflowStepLog[];
  approvedRequestedCount?: number;
  excessApprovedAdded?: number;
  recruitmentFillStatus?: "Open" | "Partially Filled" | "Filled";
  hiredWorkerIds?: string[];
  hiredEmployeeIds?: string[];
  idempotencyKey?: string;
  directorNotifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExcessRecruitmentRequestRecord {
  id: string;
  requestNo: string; // e.g. ERR-2026-0001
  recruitmentRequestId: string;
  recruitmentRequestNo: string;
  project: string;
  department: string;
  jobPosition: string;
  approvedQuantitySnapshot: number;
  registeredCountSnapshot: number;
  excessCount: number;
  justification: string;
  requestedBy: string;
  requestedById: string;
  requestedByRole: string;
  status: "Pending Director" | "Approved" | "Rejected";
  directorDecisionBy?: string;
  directorDecisionById?: string;
  directorDecisionRole?: string;
  directorDecisionAt?: string;
  directorNotes?: string;
  directorTaskId?: string;
  auditHistory: HrmWorkflowStepLog[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkScheduleConfig {
  id: string;
  scheduleName: string;
  scopeType?: "Company" | "Project" | "Department" | "Employee";
  workLocationType?: "ALL" | "Head Office" | "Construction Site";
  project: string; // "ALL" or specific project
  department: string; // "ALL" or specific department
  workerId?: string; // Specific employee doc ID when scopeType === "Employee"
  employeeId?: string; // Specific employee ID e.g. OVID-EMP-2026-0001
  employeeName?: string;
  schedulePeriodType?: "Weekly" | "Monthly" | "Fixed";
  effectiveFrom?: string; // YYYY-MM-DD
  effectiveTo?: string; // YYYY-MM-DD
  shiftStartTime: string; // e.g. "08:00"
  shiftEndTime: string; // e.g. "17:00"
  isNightShift?: boolean; // Explicitly shifts crossing midnight (or shiftEnd <= shiftStart)
  breakMinutes: number;
  standardDailyHours: number; // e.g. 8
  graceMinutesLate: number; // e.g. 15
  restDays: string[]; // e.g. ["Sunday"]
  holidays: { date: string; name: string }[];
  overtimeMultiplierWeekday: number; // e.g. 1.5
  overtimeMultiplierRestDay: number; // e.g. 2.0
  overtimeMultiplierHoliday: number; // e.g. 2.5
  isActive: boolean;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveRequestRecord {
  id: string;
  requestNo: string;
  employeeId: string;
  workerId: string;
  workerName: string;
  project: string;
  department: string;
  leaveType: "Annual Leave" | "Sick Leave" | "Maternity/Paternity Leave" | "Unpaid Leave" | "Emergency Leave";
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: "Pending Section Head" | "Pending HR Manager" | "Approved" | "Rejected";
  sectionHeadApproval?: HrmWorkflowStepLog;
  hrManagerApproval?: HrmWorkflowStepLog;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface OvertimeRequestRecord {
  id: string;
  requestNo: string;
  employeeId: string;
  workerId: string;
  workerName: string;
  project: string;
  department: string;
  workDate: string;
  hoursRequested: number;
  dayType: "Weekday" | "Rest Day" | "Holiday";
  multiplier: number;
  reason: string;
  status: "Pending Section Head" | "Pending HR Manager" | "Approved" | "Rejected";
  sectionHeadApproval?: HrmWorkflowStepLog;
  hrManagerApproval?: HrmWorkflowStepLog;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeTransferRecord {
  id: string;
  transferNo: string;
  employeeId: string;
  workerId: string;
  workerName: string;
  fromWorkLocationType?: "Head Office" | "Construction Site";
  toWorkLocationType?: "Head Office" | "Construction Site";
  fromProject: string;
  toProject: string;
  fromDepartment: string;
  toDepartment: string;
  fromPosition: string;
  toPosition: string;
  effectiveDate: string;
  reason: string;
  approvedBy: string;
  approvedRole: string;
  status: "Pending" | "Completed" | "Cancelled";
  createdAt: string;
  updatedAt: string;
}

export interface SalaryStructureRecord {
  id: string;
  structureCode: string;
  structureName: string;
  jobGrade: string;
  department: string;
  basicSalary: number;
  housingAllowance: number;
  transportAllowance: number;
  positionAllowance: number;
  medicalAllowance: number;
  overtimeEligible: boolean;
  pensionEligible: boolean;
  currency: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EthiopianTaxBracket {
  minAmount: number;
  maxAmount: number | null; // null = infinity
  ratePercent: number;
  deductionAmount: number;
}

export interface EthiopianTaxPensionConfig {
  id: string;
  configName: string;
  effectiveFrom: string;
  employeePensionPercent: number; // Default 7%
  employerPensionPercent: number; // Default 11%
  taxBrackets: EthiopianTaxBracket[];
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface SalaryAdvanceLoanRecord {
  id: string;
  referenceNo: string;
  employeeId: string;
  workerId: string;
  workerName: string;
  project: string;
  department: string;
  type: "Salary Advance" | "Employee Loan";
  principalAmount: number;
  installmentMonths: number;
  monthlyInstallment: number;
  remainingBalance: number;
  totalRecovered: number;
  reason: string;
  requestedDate: string;
  status: "Pending HR" | "Pending Finance" | "Approved" | "Active Recovery" | "Settled" | "Rejected";
  hrApproval?: HrmWorkflowStepLog;
  financeApproval?: HrmWorkflowStepLog;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface HrmPayrollLineItem {
  workerId: string;
  employeeId: string;
  workerName: string;
  project: string;
  department: string;
  position: string;
  bankName: string;
  bankAccountNumber: string;
  daysWorked: number;
  absentDays: number;
  lateCount: number;
  regularHours: number;
  approvedOvertimeHours: number;
  basicSalary: number;
  allowances: number;
  overtimePay: number;
  bonuses: number;
  grossEarnings: number;
  taxableIncome: number;
  incomeTax: number;
  employeePension: number;
  employerPension: number;
  advanceLoanDeduction: number;
  otherDeductions: number;
  totalDeductions: number;
  netPay: number;
  uniquePayKey: string; // `${payPeriod}::${workerId}` prevents duplicate salary payments
  approvedWorkingDays?: number;
  approvedLeaveDays?: number;
  unpaidAbsenceDays?: number;
  unpaidLeaveDays?: number;
  policyAttendanceDeductions?: number;
  attendanceApprovalGatePassed?: boolean;
}

export type HrmPayrollRunStage =
  | "Draft"
  | "Pending HR Manager"
  | "Pending Finance Manager"
  | "Pending Operation Manager"
  | "Pending Director"
  | "Approved for Payment"
  | "Paid"
  | "Rejected";

export interface HrmPayrollRunRecord {
  id: string;
  runNo: string;
  payPeriod: string; // YYYY-MM
  projectScope: string; // "ALL" or project name
  totalEmployees: number;
  totalGrossPay: number;
  totalOvertimePay: number;
  totalIncomeTax: number;
  totalEmployeePension: number;
  totalEmployerPension: number;
  totalLoanRecovery: number;
  totalNetPay: number;
  currency: string;
  items: HrmPayrollLineItem[];
  workflowStage: HrmPayrollRunStage;
  hrManagerApproval?: HrmWorkflowStepLog;
  financeManagerApproval?: HrmWorkflowStepLog;
  operationManagerApproval?: HrmWorkflowStepLog;
  directorApproval?: HrmWorkflowStepLog;
  bankAccountId?: string;
  bankAccountName?: string;
  paymentReferenceNo?: string;
  paymentDate?: string;
  paidBy?: string;
  glJournalId?: string;
  glSyncedAt?: string;
  approvalHistory: HrmWorkflowStepLog[];
  preparedBy: string;
  preparedById: string;
  createdAt: string;
  updatedAt: string;
  attendanceAuditSummary?: {
    approvedRecordsUsed: number;
    unapprovedRecordsExcluded: number;
    approvedDeductionPolicyApplied: boolean;
    policyName?: string;
  };
}

export interface HrmPrivateProfileRecord {
  id: string; // matches workerId
  workerId: string;
  employeeId: string;
  userId?: string;
  faydaIdEncrypted: string;
  nationalIdEncrypted?: string;
  bankName: string;
  bankAccountEncrypted: string;
  mobileMoneyType?: string;
  mobileMoneyNumberEncrypted?: string;
  emergencyContactEncrypted?: string;
  biometricTemplateEncrypted?: string;
  faydaIdHash?: string;
  nationalIdHash?: string;
  phoneNormalizedHash?: string;
  encryptionAlgorithm: "AES-GCM-256";
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface HrmPayslipRecord {
  id: string; // `${runId}_${workerId}`
  runId: string;
  runNo: string;
  payPeriod: string;
  workerId: string;
  employeeId: string;
  workerUserId?: string;
  workerName: string;
  project: string;
  department: string;
  position: string;
  bankName: string;
  bankAccountMasked: string;
  workflowStage: HrmPayrollRunStage;
  paymentReferenceNo?: string;
  paymentDate?: string;
  glJournalId?: string;
  item: HrmPayrollLineItem;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// EMPLOYEE BIOMETRIC MAPPING MODULE TYPES
// ============================================================================

export type BiometricDeviceWorkLocationType = "Head Office" | "Construction Site";
export type BiometricMappingStatus = "Active" | "Inactive";

export type BiometricDeviceProtocolType =
  | "ADMS_PUSH_HTTP"
  | "TCP_4370_SITE_BRIDGE"
  | "MANUAL_IMPORT";

export interface BiometricDeviceRecord {
  id: string;
  deviceCode: string;
  deviceName: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  workLocationType: BiometricDeviceWorkLocationType;
  projectId?: string;
  projectName?: string;
  deviceLocation: string;
  protocolType?: BiometricDeviceProtocolType;
  networkTopology?: string;
  admsPath?: string;
  supportedCapabilities?: string[];
  lastHandshakeAt?: string;
  lastEventAt?: string;
  connectionVerified?: boolean;
  status: "Active" | "Inactive";
  notes?: string;
  createdBy: string;
  createdByUid?: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt: string;
}

export interface BiometricDeviceMapping {
  id: string;
  employeeId: string;
  workerRecordId: string;
  employeeNameSnapshot: string;
  departmentSnapshot: string;
  positionSnapshot: string;
  employmentStatusSnapshot: string;
  biometricUserId: string;
  deviceId: string;
  deviceNameSnapshot: string;
  deviceModelSnapshot: string;
  deviceSerialNumberSnapshot: string;
  workLocationId: string;
  workLocationType: BiometricDeviceWorkLocationType;
  projectId: string;
  projectNameSnapshot: string;
  effectiveDate: string;
  status: BiometricMappingStatus;
  notes?: string;
  createdBy: string;
  createdByUid: string;
  createdAt: string;
  updatedBy?: string;
  updatedByUid?: string;
  updatedAt?: string;
  deactivatedBy?: string;
  deactivatedByUid?: string;
  deactivatedAt?: string;
  deactivationReason?: string;
}

export type BiometricEnrollmentStatus =
  | "Not Registered"
  | "Registered on Device"
  | "Mapping Pending"
  | "Mapping Completed"
  | "Active"
  | "Suspended";

export type BiometricWorkflowStage =
  | "Employee Registration"
  | "Biometric Enrollment"
  | "Employee Biometric Mapping"
  | "Attendance Activation";

export type BiometricMappingAuditAction =
  | "Mapping Created"
  | "Mapping Edited"
  | "Biometric User ID Changed"
  | "Device Changed"
  | "Mapping Activated"
  | "Mapping Deactivated"
  | "Unmapped Event Resolved"
  | "Device Registration Recorded"
  | "Enrollment Status Changed"
  | "Attendance Activated"
  | "Enrollment Suspended";

export interface BiometricMappingAuditLog {
  id: string;
  mappingId: string;
  employeeId: string;
  employeeName: string;
  deviceId: string;
  deviceName: string;
  biometricUserId: string;
  action: BiometricMappingAuditAction;
  previousValue?: Record<string, any>;
  newValue?: Record<string, any>;
  reason?: string;
  actorName: string;
  actorUid: string;
  actorRole: string;
  timestamp: string;
}

export interface UnmappedBiometricEvent {
  id: string;
  deviceId: string;
  deviceName?: string;
  biometricUserId: string;
  eventTime: string;
  punchType: "Check-In" | "Check-Out" | "Lunch-Out" | "Lunch-In" | "Unknown";
  workLocationType?: BiometricDeviceWorkLocationType;
  projectName?: string;
  status: "Unmapped" | "Resolved" | "Ignored";
  exceptionCategory?:
    | "Unmatched Biometric ID"
    | "Unauthorized Device"
    | "Inactive Device"
    | "Inactive Employee";
  resolvedMappingId?: string;
  resolvedEmployeeId?: string;
  resolvedAttendanceId?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  rawEventMeta?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// ATTENDANCE WORKFLOW IMPLEMENTATION — PART 2 TYPES
// ============================================================================

export type AttendanceApprovalStatus =
  | "Pending"
  | "Under Review"
  | "Approved"
  | "Rejected"
  | "Returned for Correction";

export type AttendanceReconciledDayStatus =
  | "Present"
  | "Absent"
  | "Approved Leave"
  | "Unpaid Leave"
  | "Holiday"
  | "Missing Attendance"
  | "Pending Review";

export interface OriginalBiometricEventSnapshot {
  checkIn: string | null;
  checkOut: string | null;
  lunchOut?: string | null;
  lunchIn?: string | null;
  status: AttendanceRecord["status"];
  workingHours: number;
  overtime: number;
  method: AttendanceMethod | null;
  biometricDeviceId?: string;
  biometricDeviceName?: string;
  biometricUserId?: string;
  biometricMappingId?: string;
  capturedAt: string;
  timezone: "Africa/Addis_Ababa";
}

export interface AttendanceApprovalAuditEntry {
  id: string;
  timestamp: string;
  timezone: "Africa/Addis_Ababa";
  actorName: string;
  actorUid: string;
  actorRole: string;
  action:
    | "Submitted"
    | "Prepared / Marked Under Review"
    | "Discrepancy Reported"
    | "Manual Correction Requested"
    | "Returned for Correction"
    | "Final Approved"
    | "Rejected"
    | "Correction Approved"
    | "Correction Rejected"
    | "Finalized for Payroll";
  previousStatus?: string;
  newStatus?: string;
  comments: string;
}

export type AttendanceCorrectionType =
  | "Missing Check-In"
  | "Missing Check-Out"
  | "Incorrect Attendance Record"
  | "Device Synchronization Failure";

export interface AttendanceCorrectionRequest {
  id: string;
  requestNo: string;
  attendanceId: string;
  workerId: string;
  employeeId: string;
  workerName: string;
  project: string;
  department: string;
  workLocationType: "Head Office" | "Construction Site";
  date: string;
  correctionType: AttendanceCorrectionType;
  originalSnapshot: OriginalBiometricEventSnapshot;
  proposedCheckIn: string | null;
  proposedCheckOut: string | null;
  proposedStatus: AttendanceRecord["status"];
  reason: string;
  supportingEvidenceUrl?: string;
  supportingEvidenceName?: string;
  supportingEvidenceNote?: string;
  submittedBy: string;
  submittedByUid: string;
  submittedByRole: string;
  status: AttendanceApprovalStatus;
  hrOfficerReviewedBy?: string;
  hrOfficerReviewedByUid?: string;
  hrOfficerReviewedAt?: string;
  hrOfficerNotes?: string;
  hrManagerDecisionBy?: string;
  hrManagerDecisionByUid?: string;
  hrManagerDecisionAt?: string;
  hrManagerComments?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceDeductionPolicy {
  id: string;
  policyName: string;
  isApproved: boolean;
  approvedBy?: string;
  approvedByRole?: string;
  approvedAt?: string;
  deductUnpaidLeave: boolean;
  deductUnexcusedAbsence: boolean;
  lateDeductionEnabled: boolean;
  graceMinutesBeforeDeduction: number;
  lateDeductionHourlyFactor: number;
  absenceDailyMultiplier: number;
  standardWorkingDaysPerMonth: number;
  notes?: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceAuditLog {
  id: string;
  attendanceId?: string;
  correctionId?: string;
  workerId?: string;
  employeeId?: string;
  workerName?: string;
  date?: string;
  action: string;
  previousStatus?: string;
  newStatus?: string;
  comments: string;
  actorName: string;
  actorUid: string;
  actorRole: string;
  timestamp: string;
  timezone: "Africa/Addis_Ababa";
}

// ============================================================================
// WAREHOUSE & SITE STORE MANAGEMENT MODULE — ENTERPRISE TYPES (22 COLLECTIONS)
// ============================================================================

export type InventoryType = "Consumable" | "Fixed Asset";

export type CostValuationMethod = "FIFO" | "Weighted Moving Average";

export type ItemConditionStatus =
  | "Good"
  | "Damaged"
  | "Defective"
  | "Under Inspection"
  | "Not Reusable";

export type MaterialPlanStatus = "Draft" | "Submitted" | "Approved" | "Superseded";

export type EngineeringMaterialRequestStatus =
  | "Draft"
  | "Submitted"
  | "Warehouse Reviewing"
  | "Returned by Warehouse Manager"
  | "Verified Pending Director"
  | "Director Approved"
  | "Director Disapproved"
  | "Partially Dispatched"
  | "Fully Dispatched"
  | "Closed";

export type TransportationStatus =
  | "Pending Preparation"
  | "Approved for Dispatch"
  | "Ready for Dispatch"
  | "Dispatched"
  | "In Transit"
  | "Arrived"
  | "Receiving Verification"
  | "Partially Received"
  | "Completed"
  | "Discrepancy Reported"
  | "Cancelled";

export type GatePassStatus =
  | "Issued"
  | "Exit Verified"
  | "Entry Verified"
  | "Tamper Blocked"
  | "Revoked";

export interface InventoryCategoryRecord {
  id: string;
  code: string;
  name: string;
  nameAm?: string;
  inventoryType: InventoryType;
  description?: string;
  isActive: boolean;
  createdByUid?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryItemRecord {
  id: string;
  itemCode: string;
  itemName: string;
  itemNameAm?: string;
  specification: string;
  description?: string;
  categoryId: string;
  categoryName: string;
  inventoryType: InventoryType;
  unit: string;
  minStockLevel: number;
  reorderPoint: number;
  maxStockLevel?: number;
  standardUnitCost?: number;
  batchTrackingEnabled?: boolean;
  expiryTrackingEnabled?: boolean;
  linkedMaterialId?: string;
  isActive: boolean;
  createdByUid?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WarehouseRecord {
  id: string;
  code: string;
  name: string;
  location: string;
  projectId?: string;
  projectName?: string;
  managerUid?: string;
  managerName?: string;
  capacityNote?: string;
  status: "Active" | "Inactive";
  createdAt: string;
  updatedAt: string;
}

export interface ProjectStoreRecord {
  id: string;
  storeCode: string;
  storeName: string;
  projectId: string;
  projectName: string;
  siteId?: string;
  siteName?: string;
  location: string;
  storeOwnerUid?: string;
  storeOwnerName?: string;
  status: "Active" | "Inactive";
  createdAt: string;
  updatedAt: string;
}

export interface FifoCostLayer {
  layerId: string;
  grvId: string;
  grvNumber: string;
  receivedDate: string;
  batchNumber?: string;
  expiryDate?: string;
  originalQty: number;
  remainingQty: number;
  unitCost: number;
}

export interface StockBalanceRecord {
  id: string;
  locationType: "Warehouse" | "ProjectStore";
  locationId: string;
  locationName: string;
  projectId?: string;
  projectName?: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  categoryName: string;
  inventoryType: InventoryType;
  unit: string;
  openingQty: number;
  receivedQty: number;
  returnedQty: number;
  issuedQty: number;
  transferOutQty: number;
  transferInQty: number;
  availableQty: number;
  reservedQty: number;
  quarantineQty: number;
  damagedQty: number;
  defectiveQty: number;
  underInspectionQty: number;
  valuationMethod: CostValuationMethod;
  averageUnitCost: number;
  totalValuation: number;
  fifoLayers: FifoCostLayer[];
  batchNumber?: string;
  expiryDate?: string;
  reorderPoint: number;
  minStockLevel: number;
  lastMovementAt: string;
  updatedAt: string;
}

export type StockLedgerVoucherType =
  | "GRV"
  | "GIV"
  | "MRV"
  | "FATOV"
  | "FATIV"
  | "QUARANTINE_IN"
  | "QUARANTINE_RELEASE"
  | "OPENING_BALANCE";

export interface StockLedgerEntry {
  id: string;
  voucherType: StockLedgerVoucherType;
  voucherId: string;
  voucherNo: string;
  originalGrvNumber?: string;
  referenceRequestId?: string;
  locationType: "Warehouse" | "ProjectStore";
  locationId: string;
  locationName: string;
  projectId?: string;
  projectName?: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  inventoryType: InventoryType;
  unit: string;
  direction: "IN" | "OUT" | "QUARANTINE" | "RELEASE";
  quantity: number;
  quantityDelta: number;
  quarantineDelta: number;
  unitCost: number;
  totalCost: number;
  valuationMethodUsed: CostValuationMethod;
  openingBefore: number;
  balanceAfter: number;
  quarantineAfter: number;
  batchNumber?: string;
  expiryDate?: string;
  condition?: ItemConditionStatus;
  notes?: string;
  createdByUid: string;
  createdByName: string;
  createdByRole: string;
  createdAt: string;
}

export interface MaterialPlanItem {
  itemId: string;
  itemCode: string;
  itemName: string;
  specification: string;
  inventoryType: InventoryType;
  unit: string;
  plannedQty: number;
  consumedOrRequestedQty?: number;
  notes?: string;
}

export interface MaterialPlanRecord {
  id: string;
  planNumber: string;
  title: string;
  projectId: string;
  projectName: string;
  department?: string;
  revisionNumber: number;
  status: MaterialPlanStatus;
  items: MaterialPlanItem[];
  createdByUid: string;
  createdByName: string;
  createdByRole: string;
  submittedAt?: string;
  approvedAt?: string;
  approvedByUid?: string;
  approvedByName?: string;
  revisionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MaterialPlanRevisionRecord {
  id: string;
  planId: string;
  planNumber: string;
  projectId: string;
  projectName: string;
  revisionNumber: number;
  previousItemsSnapshot: MaterialPlanItem[];
  newItemsSnapshot: MaterialPlanItem[];
  changeSummary: string;
  reason: string;
  revisedByUid: string;
  revisedByName: string;
  revisedByRole: string;
  revisedAt: string;
}

export type PlanComparisonStatus =
  | "Matched"
  | "Item Not in Plan"
  | "Spec/Unit Mismatch"
  | "Exceeds Remaining Plan"
  | "Insufficient Stock";

export interface MaterialRequestItem {
  id: string;
  requestId: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  specification: string;
  inventoryType: InventoryType;
  unit: string;
  plannedQty: number;
  previouslyApprovedOrIssuedQty: number;
  remainingPlanQty: number;
  requestedQty: number;
  approvedQty: number;
  dispatchedQty: number;
  remainingDispatchQty: number;
  warehouseAvailableQty: number;
  comparisonStatus: PlanComparisonStatus;
  mismatchReason?: string;
}

export interface EngineeringMaterialRequest {
  id: string;
  requestNumber: string;
  planId: string;
  planNumber: string;
  planRevisionNumber: number;
  projectId: string;
  projectName: string;
  projectStoreId: string;
  projectStoreName: string;
  warehouseId: string;
  warehouseName: string;
  requestedDate: string;
  requiredByDate?: string;
  purpose: string;
  status: EngineeringMaterialRequestStatus;
  hasPlanMismatch: boolean;
  mismatchSummary?: string;
  items: MaterialRequestItem[];
  requestedByUid: string;
  requestedByName: string;
  requestedByRole: string;
  warehouseVerifiedByUid?: string;
  warehouseVerifiedByName?: string;
  warehouseVerifiedAt?: string;
  warehouseRemarks?: string;
  returnedReason?: string;
  directorDecisionByUid?: string;
  directorDecisionByName?: string;
  directorDecisionByRole?: string;
  directorDecisionAt?: string;
  directorDecisionPermanent?: boolean;
  directorComments?: string;
  disapprovalReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MaterialApprovalRecord {
  id: string;
  requestId: string;
  requestNumber: string;
  planId: string;
  stage: "Warehouse Manager Verification" | "Director Final Decision";
  decision:
    | "Verified Pending Director"
    | "Returned by Warehouse Manager"
    | "Director Approved"
    | "Director Disapproved";
  decisionByUid: string;
  decisionByName: string;
  decisionByRole: string;
  comments: string;
  mismatchDetails?: string;
  isPermanent: boolean;
  decidedAt: string;
}

export interface CommercialInvoiceReplacementEntry {
  id: string;
  previousInvoiceNumber: string;
  previousFileName: string;
  previousFileUrl: string;
  newInvoiceNumber: string;
  newFileName: string;
  newFileUrl: string;
  reason: string;
  replacedByUid: string;
  replacedByName: string;
  replacedByRole: string;
  replacedAt: string;
}

export interface CommercialInvoiceRecord {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  supplierId: string;
  supplierName: string;
  poNumber?: string;
  grvId?: string;
  grvNumber?: string;
  fileUrl: string;
  fileName: string;
  mimeType: "application/pdf" | "image/jpeg" | "image/png" | "image/jpg" | string;
  fileSizeBytes: number;
  totalAmount: number;
  currency: "ETB" | "USD" | "EUR" | string;
  replacementHistory: CommercialInvoiceReplacementEntry[];
  uploadedByUid: string;
  uploadedByName: string;
  uploadedByRole: string;
  createdAt: string;
  updatedAt: string;
}

export interface GrvLineItem {
  itemId: string;
  itemCode: string;
  itemName: string;
  inventoryType: InventoryType;
  unit: string;
  quantityReceived: number;
  unitCost: number;
  totalCost: number;
  batchNumber?: string;
  expiryDate?: string;
  serialNumbers?: string[];
  condition: ItemConditionStatus;
}

export interface GoodsReceivingVoucher {
  id: string;
  grvNumber: string;
  poNumber?: string;
  procurementId?: string;
  supplierId: string;
  supplierName: string;
  warehouseId: string;
  warehouseName: string;
  receivedDate: string;
  commercialInvoiceId: string;
  commercialInvoiceNo: string;
  commercialInvoiceDate: string;
  commercialInvoiceUrl: string;
  commercialInvoiceFileName: string;
  commercialInvoiceMimeType: string;
  status: "Draft" | "Pending Invoice" | "Completed" | "Verified";
  items: GrvLineItem[];
  totalAmount: number;
  remarks?: string;
  receivedByUid: string;
  receivedByName: string;
  receivedByRole: string;
  createdAt: string;
  updatedAt: string;
}

export interface GivLineItem {
  itemId: string;
  itemCode: string;
  itemName: string;
  unit: string;
  approvedQty: number;
  previouslyDispatchedQty: number;
  dispatchedQty: number;
  remainingPendingQty: number;
  unitCost: number;
  totalCost: number;
  batchNumber?: string;
  originalGrvNumber?: string;
}

export interface GoodsIssueVoucher {
  id: string;
  givNumber: string;
  requestId: string;
  requestNumber: string;
  directorApprovalId: string;
  warehouseId: string;
  warehouseName: string;
  projectId: string;
  projectName: string;
  projectStoreId: string;
  projectStoreName: string;
  vehicleNumber: string;
  driverName: string;
  driverPhone?: string;
  status: "Prepared" | "Dispatched" | "Partially Received" | "Delivered" | "Cancelled";
  items: GivLineItem[];
  totalCost: number;
  gatePassId?: string;
  gatePassNumber?: string;
  transportId?: string;
  transportNumber?: string;
  issuedByUid: string;
  issuedByName: string;
  dispatchedAt?: string;
  receivedByUid?: string;
  receivedByName?: string;
  receivedAt?: string;
  discrepancyNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MrvLineItem {
  itemId: string;
  itemCode: string;
  itemName: string;
  inventoryType: InventoryType;
  unit: string;
  quantityReturned: number;
  quantityAcceptedGood: number;
  quantityQuarantined: number;
  condition: ItemConditionStatus;
  originalGivNumber?: string;
  originalGrvNumber?: string;
  assetId?: string;
  unitCost: number;
  reason?: string;
}

export interface MaterialReturnVoucher {
  id: string;
  mrvNumber: string;
  direction: "ProjectToWarehouse" | "WarehouseToProject";
  sourceLocationType: "Warehouse" | "ProjectStore";
  sourceLocationId: string;
  sourceLocationName: string;
  destinationLocationType: "Warehouse" | "ProjectStore";
  destinationLocationId: string;
  destinationLocationName: string;
  projectId?: string;
  projectName?: string;
  originalGivId?: string;
  originalGivNumber?: string;
  originalGrvId?: string;
  originalGrvNumber?: string;
  inventoryType: InventoryType;
  vehicleNumber?: string;
  driverName?: string;
  status: "Submitted" | "In Transit" | "Confirmed Receipt" | "Quarantined" | "Rejected";
  items: MrvLineItem[];
  gatePassId?: string;
  gatePassNumber?: string;
  transportId?: string;
  transportNumber?: string;
  submittedByUid: string;
  submittedByName: string;
  submittedByRole: string;
  confirmedByUid?: string;
  confirmedByName?: string;
  confirmedAt?: string;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FixedAssetTransferHistoryEntry {
  id: string;
  date: string;
  voucherType: "GRV" | "FATOV" | "FATIV" | "MRV";
  voucherNumber: string;
  fromLocation: string;
  toLocation: string;
  projectName?: string;
  issuerName: string;
  receiverName: string;
  condition: ItemConditionStatus;
  notes?: string;
}

export interface FixedAssetRecord {
  id: string;
  assetId: string; // Permanent Asset ID e.g. OVID-FA-0001 (never changes on transfer)
  itemId: string;
  itemCode: string;
  assetName: string;
  description: string;
  categoryName: string;
  serialNumber: string;
  originalGrvId: string;
  originalGrvNumber: string;
  commercialInvoiceId: string;
  commercialInvoiceNo: string;
  purchaseDate: string;
  purchaseCost: number;
  currentLocationType: "Warehouse" | "ProjectStore";
  currentLocationId: string;
  currentLocationName: string;
  currentProjectId?: string;
  currentProjectName?: string;
  previousLocationName?: string;
  issuerName?: string;
  receiverName?: string;
  condition: ItemConditionStatus;
  status:
    | "In Warehouse"
    | "In Transit"
    | "Assigned to Project"
    | "Under Maintenance"
    | "Quarantined"
    | "Retired";
  transferHistory: FixedAssetTransferHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface FixedAssetTransferOut {
  id: string;
  fatovNumber: string;
  assetDocId: string;
  assetId: string;
  assetName: string;
  itemCode: string;
  serialNumber: string;
  originalGrvId: string;
  originalGrvNumber: string;
  requestId?: string;
  requestNumber?: string;
  fromLocationType: "Warehouse" | "ProjectStore";
  fromLocationId: string;
  fromLocationName: string;
  toLocationType: "Warehouse" | "ProjectStore";
  toLocationId: string;
  toLocationName: string;
  projectId?: string;
  projectName?: string;
  quantitySent: number;
  conditionSent: ItemConditionStatus;
  vehicleNumber: string;
  driverName: string;
  status:
    | "Prepared"
    | "Dispatched"
    | "In Transit"
    | "Arrived"
    | "Partially Received"
    | "Completed"
    | "Discrepancy Reported"
    | "Cancelled";
  fativId?: string;
  fativNumber?: string;
  gatePassId?: string;
  gatePassNumber?: string;
  transportId?: string;
  transportNumber?: string;
  issuedByUid: string;
  issuedByName: string;
  dispatchedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FixedAssetTransferIn {
  id: string;
  fativNumber: string;
  fatovId: string;
  fatovNumber: string;
  assetDocId: string;
  assetId: string;
  assetName: string;
  itemCode: string;
  serialNumber: string;
  originalGrvId: string;
  originalGrvNumber: string;
  fromLocationName: string;
  receivingLocationType: "Warehouse" | "ProjectStore";
  receivingLocationId: string;
  receivingLocationName: string;
  projectId?: string;
  projectName?: string;
  quantitySent: number;
  quantityReceived: number;
  discrepancyQty: number;
  discrepancyReason?: string;
  conditionReceived: ItemConditionStatus;
  status: "Confirmed" | "Partially Received" | "Discrepancy Reported";
  receivedByUid: string;
  receivedByName: string;
  confirmedAt: string;
  createdAt: string;
}

export interface TransportStatusEvent {
  status: TransportationStatus;
  timestamp: string;
  actorUid: string;
  actorName: string;
  actorRole: string;
  notes?: string;
}

export interface TransportationRecord {
  id: string;
  transportNumber: string;
  direction: "WarehouseToProject" | "ProjectToWarehouse" | "WarehouseToWarehouse";
  referenceType: "GIV" | "FATOV" | "MRV";
  referenceId: string;
  referenceNumber: string;
  originalGrvNumber?: string;
  originLocationId: string;
  originLocationName: string;
  destinationLocationId: string;
  destinationLocationName: string;
  projectId?: string;
  projectName?: string;
  vehicleId?: string;
  vehicleNumber: string;
  driverName: string;
  driverPhone?: string;
  handlerUid?: string;
  handlerName?: string;
  itemsSummary: string;
  status: TransportationStatus;
  statusHistory: TransportStatusEvent[];
  dispatchedAt?: string;
  arrivedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GatePassRecord {
  id: string;
  gatePassNumber: string;
  voucherType: "GIV" | "FATOV" | "MRV";
  voucherId: string;
  voucherNumber: string;
  originalGrvNumber?: string;
  originLocationId: string;
  originLocationName: string;
  destinationLocationId: string;
  destinationLocationName: string;
  projectId?: string;
  projectName?: string;
  vehicleNumber: string;
  driverName: string;
  itemsSummary: string;
  totalQuantity: number;
  qrVerificationCode: string;
  verificationHash: string;
  status: GatePassStatus;
  issuedByUid: string;
  issuedByName: string;
  issuedByRole: string;
  issuedAt: string;
  exitVerifiedByUid?: string;
  exitVerifiedByName?: string;
  exitVerifiedAt?: string;
  entryVerifiedByUid?: string;
  entryVerifiedByName?: string;
  entryVerifiedAt?: string;
  securityRemarks?: string;
  lockedForEdit: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryNotificationRecord {
  id: string;
  eventType:
    | "MATERIAL_PLAN_SUBMITTED"
    | "MATERIAL_PLAN_REVISED"
    | "MATERIAL_REQUEST_SUBMITTED"
    | "MATERIAL_REQUEST_RETURNED"
    | "MATERIAL_REQUEST_VERIFIED"
    | "MATERIAL_REQUEST_DIRECTOR_APPROVED"
    | "MATERIAL_REQUEST_DIRECTOR_DISAPPROVED"
    | "PARTIAL_DISPATCH_PERFORMED"
    | "FULL_DISPATCH_PERFORMED"
    | "GATE_PASS_GENERATED"
    | "GATE_PASS_EXIT_VERIFIED"
    | "GATE_PASS_ENTRY_VERIFIED"
    | "TRANSPORT_STATUS_CHANGED"
    | "DELIVERY_RECEIVED"
    | "TRANSFER_DISCREPANCY"
    | "GRV_COMPLETED"
    | "COMMERCIAL_INVOICE_REPLACED"
    | "RETURN_SUBMITTED"
    | "DAMAGED_QUARANTINED"
    | "LOW_STOCK_ALERT";
  title: string;
  message: string;
  severity: "info" | "warning" | "critical" | "success";
  targetRoles: string[];
  projectId?: string;
  locationId?: string;
  referenceId?: string;
  referenceNumber?: string;
  readByUids: string[];
  createdAt: string;
}

export interface InventoryAuditLogRecord {
  id: string;
  action: string;
  module:
    | "MasterData"
    | "MaterialPlan"
    | "MaterialRequest"
    | "GRV"
    | "CommercialInvoice"
    | "GIVDispatch"
    | "FixedAsset"
    | "FATOV"
    | "FATIV"
    | "Transport"
    | "GatePass"
    | "ReturnMRV"
    | "Quarantine"
    | "ValuationSettings"
    | "Security";
  entityType: string;
  entityId: string;
  entityNumber?: string;
  previousState?: Record<string, any> | null;
  newState?: Record<string, any> | null;
  details: string;
  projectId?: string;
  locationId?: string;
  actorUid: string;
  actorName: string;
  actorRole: string;
  timestamp: string;
}

export interface InventoryValuationSettingsRecord {
  id: string; // e.g., "default"
  valuationMethod: CostValuationMethod;
  enforceCommercialInvoiceOnGrv: boolean;
  enforcePlanComparisonOnRequest: boolean;
  quarantineDamagedReturnsAutomatically: boolean;
  updatedByUid: string;
  updatedByName: string;
  updatedByRole: string;
  updatedAt: string;
  history: {
    previousMethod: CostValuationMethod;
    newMethod: CostValuationMethod;
    changedByUid: string;
    changedByName: string;
    changedAt: string;
    reason?: string;
  }[];
}

export interface WarehouseDashboardFilters {
  dateFrom: string;
  dateTo: string;
  projectId: string;
  locationId: string;
  categoryId: string;
  inventoryType: "ALL" | InventoryType;
}

export type WarehouseReportType =
  | "WAREHOUSE_STOCK_BALANCE"
  | "PROJECT_SITE_STORE_BALANCE"
  | "STOCK_MOVEMENT_LEDGER"
  | "GRV_REGISTER"
  | "COMMERCIAL_INVOICE_REGISTER"
  | "MATERIAL_PLAN_VS_REQUEST_VS_ISSUED"
  | "PENDING_DIRECTOR_APPROVALS"
  | "GIV_DISPATCH_REGISTER"
  | "PARTIAL_DISPATCH_BALANCE"
  | "FIXED_ASSETS_BIG_BALANCE"
  | "PROJECT_FIXED_ASSET_REGISTER"
  | "FATOV_FATIV_ASSET_TRANSFER"
  | "ASSET_LOCATION_HISTORY"
  | "TRANSPORTATION_TRACKING"
  | "GATE_PASS_SECURITY_LOG"
  | "TWO_WAY_RETURN_MRV"
  | "DAMAGED_DEFECTIVE_QUARANTINE"
  | "LOW_STOCK_REORDER"
  | "INVENTORY_VALUATION"
  | "FAST_SLOW_MOVING"
  | "DISCREPANCY_SHORTAGE"
  | "AUDIT_TRAIL_APPROVAL_HISTORY";



