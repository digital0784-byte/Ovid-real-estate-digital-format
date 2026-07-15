import { 
  Worker, 
  Team, 
  AttendanceRecord, 
  PerformanceEvaluation, 
  ProjectZone, 
  DailyProgressLog, 
  SafetyLog, 
  QualitySnag, 
  QualityLog, 
  SystemNotification,
  AttendanceMethod,
  UserRole,
  AuditLog
} from "./types";

// Seed Workers
export const initialWorkers: Worker[] = [
  { 
    id: "OVID-W-101", 
    name: "Bekele Tesfaye", 
    department: "Formwork Assembly", 
    trade: "Carpenter", 
    company: "OVID Construction", 
    teamId: "T-01", 
    status: "Active", 
    joinedDate: "2025-01-10",
    photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop",
    phoneNumber: "+251 911-234567",
    emergencyContact: "Tirunesh Tesfaye - Sister (+251 911-765432)",
    skills: "Aluminium Formwork Systems, Blueprint Reading, Scaffolding Safety"
  },
  { 
    id: "OVID-W-102", 
    name: "Aster Gudeta", 
    department: "Formwork Assembly", 
    trade: "Carpenter", 
    company: "OVID Construction", 
    teamId: "T-01", 
    status: "Active", 
    joinedDate: "2025-01-15",
    photo: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop",
    phoneNumber: "+251 922-345678",
    emergencyContact: "Gudeta Gemechu - Father (+251 922-876543)",
    skills: "Precision Formwork Alignment, Level Measuring, Joint Gasketing"
  },
  { 
    id: "OVID-W-103", 
    name: "Chala Kebede", 
    department: "Formwork Stripping", 
    trade: "Stripper", 
    company: "OVID Construction", 
    teamId: "T-02", 
    status: "Active", 
    joinedDate: "2025-02-01",
    photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop",
    phoneNumber: "+251 933-456789",
    emergencyContact: "Aster Kebede - Sister (+251 933-987654)",
    skills: "Safe Formwork Stripping, Panel Maintenance, Prop Release Execution"
  },
  { 
    id: "OVID-W-104", 
    name: "Almaz Demissie", 
    department: "Steel Fixing", 
    trade: "Steel Fixer", 
    company: "OVID Construction", 
    teamId: "T-03", 
    status: "Active", 
    joinedDate: "2025-01-20",
    photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop",
    phoneNumber: "+251 944-567890",
    emergencyContact: "Demissie Wolde - Father (+251 944-098765)",
    skills: "Rebar Tying, Steel Reinforcement, Shear Wall Assembly, Bar Bending"
  },
  { 
    id: "OVID-W-105", 
    name: "Selamawit Alemu", 
    department: "Formwork Assembly", 
    trade: "Carpenter", 
    company: "Subcontractor Alpha", 
    teamId: "T-01", 
    status: "Active", 
    joinedDate: "2025-03-05",
    photo: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop",
    phoneNumber: "+251 955-678901",
    emergencyContact: "Alemu Ayele - Husband (+251 955-109876)",
    skills: "Slab Formwork Rigging, Heavy Lift Signaling, Quick-Release Setup"
  },
  { 
    id: "OVID-W-106", 
    name: "Tariku Mengistu", 
    department: "Concrete Casting", 
    trade: "Concrete Worker", 
    company: "OVID Construction", 
    teamId: "T-04", 
    status: "Active", 
    joinedDate: "2025-01-12",
    photo: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&h=200&fit=crop",
    phoneNumber: "+251 966-789012",
    emergencyContact: "Mengistu Hailu - Father (+251 966-210987)",
    skills: "Concrete Pouring, Vibrator Compaction, Slab Finishing, Level Control"
  },
  { 
    id: "OVID-W-107", 
    name: "Yosef Assefa", 
    department: "Formwork Stripping", 
    trade: "Stripper", 
    company: "Subcontractor Beta", 
    teamId: "T-02", 
    status: "Active", 
    joinedDate: "2025-02-18",
    photo: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop",
    phoneNumber: "+251 977-890123",
    emergencyContact: "Tigist Assefa - Wife (+251 977-321098)",
    skills: "Formwork Stripping, Panel Degreasing, Crane Hook Hooking"
  },
  { 
    id: "OVID-W-108", 
    name: "Mekonnen Haile", 
    department: "Concrete Casting", 
    trade: "Concrete Worker", 
    company: "OVID Construction", 
    teamId: "T-04", 
    status: "Active", 
    joinedDate: "2025-02-22",
    photo: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop",
    phoneNumber: "+251 988-901234",
    emergencyContact: "Haile Weldu - Brother (+251 988-432109)",
    skills: "Slurry Grout Mixing, Surface Grinding, Concrete Pump Guiding"
  },
  { 
    id: "OVID-W-109", 
    name: "Hiwot Girma", 
    department: "Steel Fixing", 
    trade: "Steel Fixer", 
    company: "Subcontractor Alpha", 
    teamId: "T-03", 
    status: "Active", 
    joinedDate: "2025-03-01",
    photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop",
    phoneNumber: "+251 999-012345",
    emergencyContact: "Girma Tadesse - Father (+251 999-543210)",
    skills: "Bending Machine Operation, Rebar Spacer Setup, Beam Cage Assembly"
  },
  { 
    id: "OVID-W-110", 
    name: "Fikru Tolossa", 
    department: "Safety & Rigging", 
    trade: "Rigger", 
    company: "OVID Construction", 
    teamId: "T-05", 
    status: "Active", 
    joinedDate: "2025-01-05",
    photo: "https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?w=200&h=200&fit=crop",
    phoneNumber: "+251 912-345678",
    emergencyContact: "Wubit Tolossa - Sister (+251 912-876543)",
    skills: "Toolbox Lead, PPE Verification, Rigging Safety, Crane Sling Hooks"
  }
];

// Seed Teams
export const initialTeams: Team[] = [
  { id: "T-01", name: "Assembly Team Alpha", leaderId: "OVID-W-101", department: "Formwork Assembly", memberIds: ["OVID-W-101", "OVID-W-102", "OVID-W-105"], safetyScore: 94, qualityScore: 88, averageProductivity: 92 },
  { id: "T-02", name: "Stripping Team Beta", leaderId: "OVID-W-103", department: "Formwork Stripping", memberIds: ["OVID-W-103", "OVID-W-107"], safetyScore: 85, qualityScore: 90, averageProductivity: 85 },
  { id: "T-03", name: "Steel Fixing Team Gamma", leaderId: "OVID-W-104", department: "Steel Fixing", memberIds: ["OVID-W-104", "OVID-W-109"], safetyScore: 92, qualityScore: 95, averageProductivity: 90 },
  { id: "T-04", name: "Concreting Team Delta", leaderId: "OVID-W-106", department: "Concrete Casting", memberIds: ["OVID-W-106", "OVID-W-108"], safetyScore: 88, qualityScore: 85, averageProductivity: 87 },
  { id: "T-05", name: "Support Team Epsilon", leaderId: "OVID-W-110", department: "Safety & Support", memberIds: ["OVID-W-110"], safetyScore: 98, qualityScore: 92, averageProductivity: 80 }
];

// Seed Attendance Records for today (say, 2026-07-01 and earlier)
export const initialAttendance: AttendanceRecord[] = [
  { id: "ATT-1001", workerId: "OVID-W-101", workerName: "Bekele Tesfaye", department: "Formwork Assembly", trade: "Carpenter", company: "OVID Construction", building: "OVID Tower 1", floor: 4, zone: "Zone A", date: "2026-07-01", checkIn: "07:45:00", checkOut: "17:15:00", method: AttendanceMethod.FINGERPRINT, workingHours: 8.5, overtime: 0.5, status: "Present" },
  { id: "ATT-1002", workerId: "OVID-W-102", workerName: "Aster Gudeta", department: "Formwork Assembly", trade: "Carpenter", company: "OVID Construction", building: "OVID Tower 1", floor: 4, zone: "Zone A", date: "2026-07-01", checkIn: "07:50:00", checkOut: "17:00:00", method: AttendanceMethod.FACE_RECOGNITION, workingHours: 8.0, overtime: 0, status: "Present" },
  { id: "ATT-1003", workerId: "OVID-W-103", workerName: "Chala Kebede", department: "Formwork Stripping", trade: "Stripper", company: "OVID Construction", building: "OVID Tower 1", floor: 3, zone: "Zone B", date: "2026-07-01", checkIn: "08:15:00", checkOut: "17:30:00", method: AttendanceMethod.QR_CODE, workingHours: 8.0, overtime: 0.25, status: "Late" },
  { id: "ATT-1004", workerId: "OVID-W-104", workerName: "Almaz Demissie", department: "Steel Fixing", trade: "Steel Fixer", company: "OVID Construction", building: "OVID Tower 1", floor: 4, zone: "Zone A", date: "2026-07-01", checkIn: "07:30:00", checkOut: "17:00:00", method: AttendanceMethod.GPS_GEOFENCE, workingHours: 8.5, overtime: 0, status: "Present" },
  { id: "ATT-1005", workerId: "OVID-W-105", workerName: "Selamawit Alemu", department: "Formwork Assembly", trade: "Carpenter", company: "Subcontractor Alpha", building: "OVID Tower 1", floor: 4, zone: "Zone A", date: "2026-07-01", checkIn: "07:42:00", checkOut: "17:00:00", method: AttendanceMethod.NFC, workingHours: 8.3, overtime: 0, status: "Present" },
  { id: "ATT-1006", workerId: "OVID-W-106", workerName: "Tariku Mengistu", department: "Concrete Casting", trade: "Concrete Worker", company: "OVID Construction", building: "OVID Tower 1", floor: 4, zone: "Zone B", date: "2026-07-01", checkIn: "07:55:00", checkOut: "17:15:00", method: AttendanceMethod.FINGERPRINT, workingHours: 8.2, overtime: 0.2, status: "Present" },
  { id: "ATT-1007", workerId: "OVID-W-107", workerName: "Yosef Assefa", department: "Formwork Stripping", trade: "Stripper", company: "Subcontractor Beta", building: "OVID Tower 1", floor: 3, zone: "Zone B", date: "2026-07-01", checkIn: null, checkOut: null, method: null, workingHours: 0, overtime: 0, status: "Absent" },
  { id: "ATT-1008", workerId: "OVID-W-108", workerName: "Mekonnen Haile", department: "Concrete Casting", trade: "Concrete Worker", company: "OVID Construction", building: "OVID Tower 1", floor: 4, zone: "Zone B", date: "2026-07-01", checkIn: "07:40:00", checkOut: "17:00:00", method: AttendanceMethod.FACE_RECOGNITION, workingHours: 8.3, overtime: 0, status: "Present" },
  { id: "ATT-1009", workerId: "OVID-W-109", workerName: "Hiwot Girma", department: "Steel Fixing", trade: "Steel Fixer", company: "Subcontractor Alpha", building: "OVID Tower 1", floor: 4, zone: "Zone A", date: "2026-07-01", checkIn: null, checkOut: null, method: null, workingHours: 0, overtime: 0, status: "Leave" }
];

// Seed Performance Evaluations for yesterday
export const initialEvaluations: PerformanceEvaluation[] = [
  { id: "EVAL-001", workerId: "OVID-W-101", workerName: "Bekele Tesfaye", date: "2026-07-01", discipline: 19, quality: 19, productivity: 19, safetyCompliance: 14, equipmentHandling: 10, teamwork: 10, attendance: 5, totalScore: 96, level: "Excellent", comment: "Excellent speed, precision, and tool care in Zone A wall setup.", evaluatedBy: "Eng. Yoseph" },
  { id: "EVAL-002", workerId: "OVID-W-102", workerName: "Aster Gudeta", date: "2026-07-01", discipline: 18, quality: 19, productivity: 18, safetyCompliance: 14, equipmentHandling: 10, teamwork: 10, attendance: 5, totalScore: 94, level: "Very Good", comment: "Outstanding alignment precision and careful material handling on beams.", evaluatedBy: "Eng. Yoseph" },
  { id: "EVAL-003", workerId: "OVID-W-103", workerName: "Chala Kebede", date: "2026-07-01", discipline: 14, quality: 15, productivity: 15, safetyCompliance: 11, equipmentHandling: 8, teamwork: 8, attendance: 4, totalScore: 75, level: "Good", comment: "Good output and decent tool storage but was late today.", evaluatedBy: "Eng. Yoseph" },
  { id: "EVAL-004", workerId: "OVID-W-104", workerName: "Almaz Demissie", date: "2026-07-01", discipline: 20, quality: 19, productivity: 18, safetyCompliance: 14, equipmentHandling: 10, teamwork: 10, attendance: 5, totalScore: 96, level: "Excellent", comment: "Highly reliable steel reinforcement fixes. Clean equipment workspace and safe habits.", evaluatedBy: "Eng. Yoseph" },
  { id: "EVAL-005", workerId: "OVID-W-105", workerName: "Selamawit Alemu", date: "2026-07-01", discipline: 17, quality: 17, productivity: 17, safetyCompliance: 12, equipmentHandling: 9, teamwork: 10, attendance: 5, totalScore: 87, level: "Very Good", comment: "Cooperative subcontractor team player, solid work, proper tool management.", evaluatedBy: "Eng. Yoseph" },
  { id: "EVAL-006", workerId: "OVID-W-106", workerName: "Tariku Mengistu", date: "2026-07-01", discipline: 17, quality: 17, productivity: 17, safetyCompliance: 12, equipmentHandling: 9, teamwork: 10, attendance: 5, totalScore: 87, level: "Very Good", comment: "Good concrete compaction, no issues noted with mechanical poker handling.", evaluatedBy: "Eng. Yoseph" },
  { id: "EVAL-008", workerId: "OVID-W-108", workerName: "Mekonnen Haile", date: "2026-07-01", discipline: 13, quality: 13, productivity: 12, safetyCompliance: 10, equipmentHandling: 6, teamwork: 7, attendance: 5, totalScore: 66, level: "Average", comment: "Slow panel cleaning and layout placement. Need to handle form panels with more care.", evaluatedBy: "Eng. Yoseph" }
];

// Seed Project Zones (Aluminum Formwork Planning)
export const initialZones: ProjectZone[] = [
  { 
    id: "B1-F04-ZA", 
    building: "OVID Bole Heights", 
    block: "Block A", 
    tower: "Tower 1", 
    floor: 4, 
    zone: "Zone A", 
    wallStatus: 100, 
    columnStatus: 100, 
    beamStatus: 90, 
    slabStatus: 85, 
    stairStatus: 100, 
    liftCoreStatus: 100, 
    startDate: "2026-06-25", 
    targetDays: 6, 
    completionPercentage: 95, 
    status: "In Progress",
    dailyPanelLogs: [
      { id: "LOG-P-001", loggedBy: "Fikru Tolossa", role: "Gang Chief", date: "2026-07-12", panelType: "Wall Panel W1", length: 2.7, width: 0.6, quantity: 45, calculatedArea: 72.9, notes: "West wall alignment complete" },
      { id: "LOG-P-002", loggedBy: "Tariku Mengistu", role: "Supervisor", date: "2026-07-12", panelType: "Slab Deck S2", length: 1.2, width: 0.9, quantity: 30, calculatedArea: 32.4, notes: "Section 1 slab deck panels placed" }
    ]
  },
  { 
    id: "B1-F04-ZB", 
    building: "OVID Bole Heights", 
    block: "Block A", 
    tower: "Tower 1", 
    floor: 4, 
    zone: "Zone B", 
    wallStatus: 70, 
    columnStatus: 80, 
    beamStatus: 40, 
    slabStatus: 20, 
    stairStatus: 0, 
    liftCoreStatus: 60, 
    startDate: "2026-06-28", 
    targetDays: 6, 
    completionPercentage: 55, 
    status: "In Progress",
    dailyPanelLogs: [
      { id: "LOG-P-003", loggedBy: "Fikru Tolossa", role: "Gang Chief", date: "2026-07-13", panelType: "Wall Panel W2", length: 2.7, width: 0.45, quantity: 20, calculatedArea: 24.3, notes: "Inner partition columns aligned" }
    ]
  },
  { id: "B1-F04-ZC", building: "OVID Bole Heights", block: "Block A", tower: "Tower 1", floor: 4, zone: "Zone C", wallStatus: 0, columnStatus: 0, beamStatus: 0, slabStatus: 0, stairStatus: 0, liftCoreStatus: 0, startDate: "2026-07-05", targetDays: 5, completionPercentage: 0, status: "Not Started" },
  { id: "B1-F03-ZA", building: "OVID Bole Heights", block: "Block A", tower: "Tower 1", floor: 3, zone: "Zone A", wallStatus: 100, columnStatus: 100, beamStatus: 100, slabStatus: 100, stairStatus: 100, liftCoreStatus: 100, startDate: "2026-06-18", targetDays: 6, actualDays: 6, completionPercentage: 100, status: "Completed" },
  { id: "B1-F03-ZB", building: "OVID Bole Heights", block: "Block A", tower: "Tower 1", floor: 3, zone: "Zone B", wallStatus: 100, columnStatus: 100, beamStatus: 100, slabStatus: 100, stairStatus: 100, liftCoreStatus: 100, startDate: "2026-06-20", targetDays: 6, actualDays: 8, completionPercentage: 100, status: "Completed" },
  { id: "B1-F03-ZC", building: "OVID Bole Heights", block: "Block A", tower: "Tower 1", floor: 3, zone: "Zone C", wallStatus: 100, columnStatus: 100, beamStatus: 100, slabStatus: 100, stairStatus: 100, liftCoreStatus: 100, startDate: "2026-06-22", targetDays: 5, actualDays: 5, completionPercentage: 100, status: "Completed" },
  { id: "B1-F02-ZA", building: "OVID Bole Heights", block: "Block A", tower: "Tower 1", floor: 2, zone: "Zone A", wallStatus: 100, columnStatus: 100, beamStatus: 100, slabStatus: 100, stairStatus: 100, liftCoreStatus: 100, startDate: "2026-06-10", targetDays: 6, actualDays: 6, completionPercentage: 100, status: "Completed" }
];

// Seed Daily Progress Logs
export const initialProgressLogs: DailyProgressLog[] = [
  { id: "LOG-001", date: "2026-07-01", engineerId: "PM-001", engineerName: "Yoseph Hailu", building: "OVID Bole Heights", floor: 4, zone: "Zone A", installedPanels: 42, removedPanels: 10, remainingPanels: 8, concreteReady: true, inspectionStatus: "Approved", comments: "Walls and columns fully installed. Reinforcement approved. Ready for concrete pour tomorrow.", photoUrl: "" },
  { id: "LOG-002", date: "2026-07-01", engineerId: "PM-001", engineerName: "Yoseph Hailu", building: "OVID Bole Heights", floor: 4, zone: "Zone B", installedPanels: 18, removedPanels: 35, remainingPanels: 24, concreteReady: false, inspectionStatus: "Pending", comments: "Formwork stripping on Floor 3 completed. Stripped panels moved to Floor 4. Beam assembly started.", photoUrl: "" }
];

// Seed Safety Logs
export const initialSafetyLogs: SafetyLog[] = [
  {
    id: "SAF-001",
    date: "2026-07-01",
    toolboxMeetingLogged: true,
    toolboxTopic: "Working safely with aluminum formwork prop releases & heavy wind precautions",
    toolboxAttendeesCount: 15,
    ppeInspectionPassed: true,
    ppeDefectsCount: 1, // one damaged helmet, replaced
    nearMissesCount: 0,
    incidentsCount: 0,
    unsafeActs: ["One worker failed to lock his harness hook on scaffolding (immediately corrected)"],
    unsafeConditions: ["Debris piling up near Zone B staircase (cleared during shift)"],
    safetyScore: 95,
    loggedBy: "Safety Officer Fikru"
  },
  {
    id: "SAF-002",
    date: "2026-06-30",
    toolboxMeetingLogged: true,
    toolboxTopic: "Manual handling of heavy aluminum deck panels and back strain prevention",
    toolboxAttendeesCount: 16,
    ppeInspectionPassed: true,
    ppeDefectsCount: 0,
    nearMissesCount: 1, // small panel fell from prop height, no injury
    incidentsCount: 0,
    unsafeActs: [],
    unsafeConditions: ["Wet slippery slab surface after night rain (spread saw dust)"],
    safetyScore: 90,
    loggedBy: "Safety Officer Fikru"
  }
];

// Seed Quality Snags
export const initialQualitySnags: QualitySnag[] = [
  { id: "SNAG-001", zoneId: "B1-F04-ZA", description: "Formwork wall panel alignment has 3mm variance (limit 2mm)", defectType: "Formwork Alignment", status: "Resolved", reportedDate: "2026-06-29", resolvedDate: "2026-06-30", reportedBy: "Yoseph Hailu", assignedTo: "T-01" },
  { id: "SNAG-002", zoneId: "B1-F04-ZB", description: "Slab formwork gap visible near the lift core connection, requires tape sealing", defectType: "Panel Gap", status: "Open", reportedDate: "2026-07-01", reportedBy: "Yoseph Hailu", assignedTo: "T-01" },
  { id: "SNAG-003", zoneId: "B1-F04-ZB", description: "Minor slurry leak gap on column C4 base plate connection", defectType: "Slurry Leak", status: "In Progress", reportedDate: "2026-07-01", reportedBy: "Yoseph Hailu", assignedTo: "T-02" }
];

// Seed Quality Logs
export const initialQualityLogs: QualityLog[] = [
  { id: "QLOG-001", date: "2026-07-01", zoneId: "B1-F04-ZA", inspectionPassed: true, snagsCount: 0, repairTrackingStatus: "All alignment snags resolved prior to final lock", qualityScore: 98, engineerApprovalSignature: "Eng_Yoseph_Approved" },
  { id: "QLOG-002", date: "2026-07-01", zoneId: "B1-F04-ZB", inspectionPassed: false, snagsCount: 2, repairTrackingStatus: "Sealing of panel gaps and column bases assigned to Assembly Team", qualityScore: 75, engineerApprovalSignature: "Pending_Snag_Resolve" }
];

// Seed Notifications
export const initialNotifications: SystemNotification[] = [
  { id: "NOT-001", type: "Late Worker", title: "Punctuality Alert", message: "Chala Kebede checked in 45 minutes late at 08:15:00.", timestamp: "2026-07-01 08:20:00", read: false },
  { id: "NOT-002", type: "Absent Worker", title: "Absenteeism Notification", message: "Yosef Assefa has failed to check in today (No leave registered).", timestamp: "2026-07-01 09:00:00", read: false },
  { id: "NOT-003", type: "Zone Delay", title: "Delay Alert on Zone B", message: "OVID Bole Heights Floor 4 Zone B is currently behind target by 2 days.", timestamp: "2026-07-01 17:00:00", read: false },
  { id: "NOT-004", type: "Concrete Due", title: "Concrete Pouring Reminder", message: "Concrete delivery scheduled for Floor 4 Zone A at 10:00 AM tomorrow.", timestamp: "2026-07-01 18:00:00", read: false },
  { id: "NOT-005", type: "Safety Alert", title: "Unsafe Condition Reported", message: "Slopes and scaffolding hooks warning issued. Wind speeds projected above 30km/h.", timestamp: "2026-07-01 10:30:00", read: true }
];

// Seed Audit Logs for RBAC Actions
export const initialAuditLogs: AuditLog[] = [
  { id: "AUD-001", timestamp: "2026-07-01 08:05:00", userId: "HO-01", userName: "Eng. Yoseph", role: UserRole.HEAD_OFFICE, action: "Approved Payroll", details: "Approved June 2026 payroll for Formwork Team Alpha & Beta" },
  { id: "AUD-002", timestamp: "2026-07-01 08:30:00", userId: "TK-01", userName: "Abebe Girma", role: UserRole.TIME_KEEPER, action: "Approved Attendance Correction", details: "Approved clock-in correction for Chala Kebede (W-103) with GPS verification." },
  { id: "AUD-003", timestamp: "2026-07-01 09:15:00", userId: "TL-01", userName: "Yohannes Bekele", role: UserRole.TEAM_LEADER, action: "Assigned Structural Zone", details: "Assigned Assembly Team Alpha to OVID Bole Heights B1-F04-ZB" },
  { id: "AUD-004", timestamp: "2026-07-01 11:00:00", userId: "GC-01", userName: "Fikru Tolossa", role: UserRole.GANG_CHIEF, action: "Logged Material Usage", details: "Recorded 14kg of locking pins and 3 replacement corner prop brackets used in Zone B." },
  { id: "AUD-005", timestamp: "2026-07-01 17:15:00", userId: "W-101", userName: "Bekele Tesfaye", role: UserRole.WORKER, action: "Clocked Out", details: "Successfully checked out via Biometric Fingerprint Scan." }
];

// Complete Amharic Translation dictionary
export const dictionaryAmharic: Record<string, string> = {
  // Navigation / Tabs
  "Dashboard": "ዳሽቦርድ",
  "Attendance": "የመገኘት መዝገብ",
  "Performance": "የሰራተኛ ግምገማ",
  "Planning": "እቅድና መርሃ ግብር",
  "Progress": "የቀን ስራ ሪፖርት",
  "Safety": "ደህንነት",
  "Quality": "ጥራት ቁጥጥር",
  "Admin": "አስተዳደር ፓነል",
  "AI Predictions": "አይአይ ትንበያ",

  // Dashboard Stats
  "OVID REAL ESTATE": "ኦቪድ ሪል እስቴት",
  "Formwork Management": "አሉሚኒየም ፎርምወርክ ቁጥጥር",
  "Workers Present": "የመጡ ሰራተኞች",
  "Absent": "ያልመጡ",
  "Late": "የዘገዩ",
  "Leave": "ፈቃድ ላይ",
  "Active Zones": "ንቁ ዞኖች",
  "Delayed Zones": "የዘገዩ ዞኖች",
  "Overall Progress": "አጠቃላይ ሂደት",
  "Today's Completed": "ዛሬ ያለቁ ዞኖች",
  "Safety Score": "የደህንነት ውጤት",
  "Quality Score": "የጥራት ውጤት",
  "Top Performing Workers": "ከፍተኛ አፈጻጸም ሰራተኞች",
  "Top Performing Teams": "ከፍተኛ አፈጻጸም ቡድኖች",

  // Attendance Panel
  "Worker ID": "የሰራተኛ መለያ",
  "Worker Name": "የሰራተኛ ስም",
  "Department": "የስራ ክፍል",
  "Trade": "ሙያ",
  "Company": "ኩባንያ",
  "Check In": "መግቢያ",
  "Check Out": "መውጫ",
  "Working Hours": "የስራ ሰዓታት",
  "Overtime": "ትርፍ ሰዓት",
  "Status": "ሁኔታ",
  "Method": "የመመዝገቢያ መንገድ",
  "Simulate Attendance Tap": "ምናባዊ መገኘት መመዝገቢያ",
  "Select Worker": "ሰራተኛ ይምረጡ",
  "Select Attendance Method": "የመመዝገቢያ መንገድ ይምረጡ",
  "Simulate Scan": "ፍተሻውን አስመስል",
  "Camera Frame (Face/QR)": "የካሜራ እይታ (ፊት/ኪውአር)",
  "Scan successful!": "ፍተሻው ተሳክቷል!",
  "Register Attendance": "መገኘትን ይመዝግቡ",

  // Planning Scheduler
  "Project Planner & Scheduler": "የፕሮጀክት እቅድና መርሃ ግብር",
  "Enter Parameters": "መለኪያዎችን ያስገቡ",
  "Project Start Date": "ፕሮጀክት የሚጀምርበት ቀን",
  "Number of Floors": "የፎቆች ብዛት",
  "Zones per Floor": "በአንድ ፎቅ ያሉ ዞኖች",
  "Target Days per Zone": "ለአንድ ዞን የሚፈቀድ ቀን",
  "Generate Construction Schedule": "የግንባታ መርሃ ግብር አውጣ",
  "Expected Finish Date": "የሚጠናቀቅበት ቀን",
  "Delayed Days": "የዘገዩ ቀናት",
  "Remaining Days": "የቀሩ ቀናት",
  "Zone Schedule Table": "የዞን መርሃ ግብር ሰንጠረዥ",

  // Daily Progress
  "Engineer Progress Log": "የኢንጅነር የቀን ስራ ሪፖርት",
  "Record Daily Formwork Progress": "የቀን የአሉሚኒየም ፎርምወርክ ስራ ይመዝግቡ",
  "Building & Block": "ህንፃ እና ብሎክ",
  "Floor & Zone": "ፎቅ እና ዞን",
  "Installed Panels": "የተገጠሙ ፓነሎች",
  "Removed Panels": "የተነሱ ፓነሎች",
  "Remaining Panels": "የቀሩ ፓነሎች",
  "Concrete Ready for Pouring": "ኮንክሪት ለመቅዳት ዝግጁ ነው",
  "Inspection Status": "የፍተሻ ሁኔታ",
  "Comments": "አስተያየቶች",
  "Log Daily Progress": "የቀን ስራውን መዝግብ",

  // Safety & Quality
  "Toolbox Meeting Logs": "የቶልቦክስ ስብሰባ መዝገብ",
  "PPE Defect Count": "የደህንነት እቃዎች ጉድለት",
  "Near Misses": "ለጥቂት የተረፉ አደጋዎች",
  "Unsafe Acts": "አደገኛ ድርጊቶች",
  "Unsafe Conditions": "አደገኛ ሁኔታዎች",
  "Quality Snag List": "የጥራት ጉድለቶች ዝርዝር",
  "Add Quality Snag": "አዲስ የጥራት ጉድለት ጨምር",
  "Defect Type": "የጉድለት አይነት",
  "Repair Status": "የጥገና ሁኔታ",

  // AI predictions
  "Predictive Intelligence Analytics": "አይአይ ትንበያ እና ትንተና",
  "Run AI Predictive Engine": "የአይአይ ትንበያ ፕሮግራም አስጀምር",
  "Predict Completion": "የማጠናቀቂያ ቀን ትንበያ",
  "Suggest Manpower Allocation": "የሰራተኞች ድልድል አስተያየት",
  "Overtime & Overload Risk": "የትርፍ ሰዓትና ጫና ስጋት",
  "Generate Management Report": "የአስተዳደር ሪፖርት አውጣ",
  "Loading AI Analysis...": "የአይአይ ትንበያ በመጫን ላይ...",

  // Language & Role Selector
  "Select Role": "የስራ ሚና ይምረጡ",
  "Select Language": "ቋንቋ ይምረጡ",
  "English": "እንግሊዘኛ",
  "Amharic": "አማርኛ",
  "Save": "አስቀምጥ",
  "Close": "ዝጋ"
};
