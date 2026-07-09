export enum UserRole {
  HEAD_OFFICE = "Head Office",
  PROJECT_MANAGER = "Project Manager",
  SECTION_HEAD = "Section Head",
  SUPERVISOR = "Supervisor",
  SITE_ENGINEER = "Site Engineer",
  SURVEYOR = "Surveyor",
  TEAM_LEADER = "Team Leader",
  GANG_CHIEF = "Gang Chief",
  TIME_KEEPER = "Time Keeper",
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
}

export enum AttendanceMethod {
  QR_CODE = "QR Code",
  NFC = "NFC",
  FINGERPRINT = "Fingerprint",
  FACE_RECOGNITION = "Face Recognition",
  GPS_GEOFENCE = "GPS Geofence"
}

export interface Worker {
  id: string; // ID for worker (e.g., OVID-W-101)
  name: string;
  photo?: string;
  phoneNumber?: string;
  nationalId?: string;
  gender?: "Male" | "Female" | "Other";
  dateOfBirth?: string;
  address?: string;
  emergencyContact?: string;
  company: string; // e.g., OVID Construction, subcontractor name
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
  discipline: number; // Max 25
  quality: number; // Max 25
  productivity: number; // Max 20
  safetyCompliance: number; // Max 15
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
  type: "Late Worker" | "Absent Worker" | "Zone Delay" | "Inspection Due" | "Concrete Due" | "Target Missed" | "Safety Alert";
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
