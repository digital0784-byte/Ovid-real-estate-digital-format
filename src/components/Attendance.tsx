import React, { useState, useRef, useMemo } from "react";
import { 
  Fingerprint, 
  ScanLine, 
  QrCode, 
  Wifi, 
  WifiOff,
  MapPin, 
  Check, 
  FileText, 
  Download, 
  Printer, 
  Search, 
  Filter, 
  Clock, 
  AlertCircle, 
  Camera, 
  UserPlus, 
  Folder, 
  Calendar, 
  ShieldCheck, 
  Trash2, 
  User, 
  Edit, 
  X, 
  FileSpreadsheet, 
  Star, 
  CheckCircle2, 
  Plus, 
  RefreshCw,
  Users,
  Database
} from "lucide-react";
import { Worker, AttendanceRecord, AttendanceMethod, UserRole, PerformanceEvaluation, AuditLog, Team } from "../types";
import { BreakExceptionsHub } from "./BreakExceptionsHub";
import { PayrollHub } from "./PayrollHub";
import { DailyAttendanceReportsHub } from "./DailyAttendanceReportsHub";
import { AttendanceSecurityRbacHub } from "./AttendanceSecurityRbacHub";
import { Lock, ShieldAlert, Key } from "lucide-react";

interface AttendanceProps {
  workers: Worker[];
  attendance: AttendanceRecord[];
  onAddAttendance: (record: AttendanceRecord) => void;
  isAmharic: boolean;
  t: (key: string) => string;
  currentUserRole: UserRole;
  onAddWorker: (worker: Worker) => void;
  onDeleteWorker: (id: string) => void;
  evaluations: PerformanceEvaluation[];
  onAddEvaluation: (evaluation: PerformanceEvaluation) => void;
  auditLogs?: AuditLog[];
  onLogAction?: (action: string, details: string) => void;
  teams?: Team[];
  onSwitchRole?: (newRole: UserRole) => void;
}

export const Attendance: React.FC<AttendanceProps> = ({
  workers,
  attendance,
  onAddAttendance,
  isAmharic,
  t,
  currentUserRole,
  onAddWorker,
  onDeleteWorker,
  evaluations,
  onAddEvaluation,
  auditLogs = [],
  onLogAction,
  teams = [],
  onSwitchRole
}) => {
  // Navigation tabs inside Employee Management Hub
  const [activeSubTab, setActiveSubTab] = useState<"directory" | "register" | "attendance_table" | "performance_table" | "clock_in" | "overtime_reports" | "biometric_enrollment" | "break_exceptions" | "smart_payroll" | "daily_reports" | "security_rbac">("daily_reports");

  // Master Prompt RBAC Access Control Permissions State
  const [authorizedRoles, setAuthorizedRoles] = useState<UserRole[]>([
    UserRole.TIME_KEEPER,
    UserRole.GANG_CHIEF,
    UserRole.TEAM_LEADER,
    UserRole.SECTION_HEAD,
    UserRole.SUPERVISOR,
    UserRole.PROJECT_MANAGER,
    UserRole.HEAD_OFFICE,
    UserRole.SUPER_ADMIN
  ]);
  const [adminOverrideActive, setAdminOverrideActive] = useState(false);

  // Check if current user role is authorized to view employee attendance
  const isUserAuthorizedForAttendance = authorizedRoles.includes(currentUserRole) || adminOverrideActive;

  const handleToggleRolePermission = (roleToToggle: UserRole) => {
    if (authorizedRoles.includes(roleToToggle)) {
      setAuthorizedRoles(authorizedRoles.filter(r => r !== roleToToggle));
    } else {
      setAuthorizedRoles([...authorizedRoles, roleToToggle]);
    }
  };

  // New States for Biometric Enrollment & Offline Sync
  const [selectedEnrollWorkerId, setSelectedEnrollWorkerId] = useState("");
  const [enrollFaceTemplate, setEnrollFaceTemplate] = useState("");
  const [enrollFingerprintTemplate, setEnrollFingerprintTemplate] = useState("");
  const [enrollIsScanningFace, setEnrollIsScanningFace] = useState(false);
  const [enrollIsScanningFingerprint, setEnrollIsScanningFingerprint] = useState(false);
  const [enrollPhoto, setEnrollPhoto] = useState("");
  
  // Offline Simulation State
  const [isOffline, setIsOffline] = useState(false);
  const [offlineQueue, setOfflineQueue] = useState<any[]>([]);
  const [isSyncingOffline, setIsSyncingOffline] = useState(false);

  // Role-Based Custom Notifications State
  const [notifications, setNotifications] = useState<any[]>([
    { id: "not-01", type: "Late Arrival", title: "Roster Delay Warning", message: "Chala Kebede arrived late on Floor 4 Zone B at 08:15:00.", timestamp: "2026-07-01 08:20", read: false, roles: [UserRole.HEAD_OFFICE, UserRole.TIME_KEEPER, UserRole.SUPERVISOR] },
    { id: "not-02", type: "Biometric Failure", title: "Security Alert: Verification Mismatch", message: "Biometric similarity score was 32.1% (below 85% requirement) for ERP-W-103.", timestamp: "2026-07-01 08:35", read: false, roles: [UserRole.HEAD_OFFICE, UserRole.TIME_KEEPER] },
    { id: "not-03", type: "Location Violation", title: "GPS Geofence Breach Rejected", message: "Check-in request blocked: GPS coordinate mismatch. Deviation: 4.1km (Airport).", timestamp: "2026-07-01 08:42", read: false, roles: [UserRole.HEAD_OFFICE, UserRole.TIME_KEEPER, UserRole.SUPERVISOR] },
    { id: "not-04", type: "Duplicate Attempt", title: "Roster Integrity: Duplicate Check-In Blocked", message: "Duplicate morning clock-in attempt detected for Bekele Tesfaye (ERP-W-101). Record secure.", timestamp: "2026-07-01 07:58", read: false, roles: [UserRole.HEAD_OFFICE, UserRole.TIME_KEEPER] }
  ]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Roster Synchronization / Assigned Area
  // We simulate what the logged-in role represents in terms of assigned area
  const assignedArea = useMemo(() => {
    switch (currentUserRole) {
      case UserRole.TEAM_LEADER:
        return { project: "Digital Bole Heights", building: "Tower 1", floor: 4, zone: "Zone A" };
      case UserRole.GANG_CHIEF:
        return { project: "Digital Bole Heights", building: "Tower 1", floor: 4, zone: "Zone B" };
      case UserRole.SUPERVISOR:
        return { project: "Digital Bole Heights", building: "Tower 1", floor: 4, zone: "" }; // See all zones on floor 4
      default:
        return null; // Time Keeper & Head Office can see all records
    }
  }, [currentUserRole]);

  // Is area-based sync filter currently active?
  const [isSyncFilterActive, setIsSyncFilterActive] = useState(true);

  // Filter and synchronize employees visible for the current user role
  const sharedWorkers = useMemo(() => {
    if (!isSyncFilterActive || !assignedArea) return workers;
    
    return workers.filter(w => {
      // Check building/project matching
      const matchesBldg = !assignedArea.building || w.building === assignedArea.building;
      // Check floor matching
      const matchesFloor = assignedArea.floor === undefined || w.floor === assignedArea.floor;
      // Check zone matching
      const matchesZone = !assignedArea.zone || w.zone === assignedArea.zone;
      
      return matchesBldg && matchesFloor && matchesZone;
    });
  }, [workers, assignedArea, isSyncFilterActive]);

  // Filters & Search for Employee Directory
  const [directorySearch, setDirectorySearch] = useState("");
  const [dirFilterTrade, setDirFilterTrade] = useState("All");
  const [dirFilterStatus, setDirFilterStatus] = useState("All");
  const [dirSortKey, setDirSortKey] = useState<"name" | "id" | "joinedDate" | "performance">("name");

  // Filtered Roster
  const filteredDirectoryWorkers = useMemo(() => {
    return sharedWorkers.filter(w => {
      const matchesSearch = w.name.toLowerCase().includes(directorySearch.toLowerCase()) || 
                            w.id.toLowerCase().includes(directorySearch.toLowerCase()) ||
                            (w.position && w.position.toLowerCase().includes(directorySearch.toLowerCase())) ||
                            w.trade.toLowerCase().includes(directorySearch.toLowerCase());
      const matchesTrade = dirFilterTrade === "All" || w.trade === dirFilterTrade;
      const matchesStatus = dirFilterStatus === "All" || w.status === dirFilterStatus;
      return matchesSearch && matchesTrade && matchesStatus;
    }).sort((a, b) => {
      if (dirSortKey === "id") return a.id.localeCompare(b.id);
      if (dirSortKey === "joinedDate") return a.joinedDate.localeCompare(b.joinedDate);
      if (dirSortKey === "performance") {
        const scoreA = getWorkerAverageScore(a.id);
        const scoreB = getWorkerAverageScore(b.id);
        return scoreB - scoreA;
      }
      return a.name.localeCompare(b.name);
    });
  }, [sharedWorkers, directorySearch, dirFilterTrade, dirFilterStatus, dirSortKey]);

  // Helper to get average performance score of a worker
  function getWorkerAverageScore(workerId: string): number {
    const workerEvals = evaluations.filter(ev => ev.workerId === workerId);
    if (workerEvals.length === 0) return 80; // Baseline
    return Math.round(workerEvals.reduce((sum, ev) => sum + ev.totalScore, 0) / workerEvals.length);
  }

  // Helper to check worker's attendance status today
  function getWorkerTodayStatus(workerId: string): { status: string; checkIn: string | null; checkOut: string | null } {
    const today = new Date().toISOString().split("T")[0];
    const rec = attendance.find(a => a.workerId === workerId && a.date === today);
    if (!rec) return { status: "Absent", checkIn: null, checkOut: null };
    return { status: rec.status, checkIn: rec.checkIn, checkOut: rec.checkOut };
  }

  // --- REGISTRATION FORM STATE ---
  const [regName, setRegName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regNationalId, setRegNationalId] = useState("");
  const [regGender, setRegGender] = useState<"Male" | "Female">("Male");
  const [regDob, setRegDob] = useState("1998-05-15");
  const [regAddress, setRegAddress] = useState("Addis Ababa, Ethiopia");
  const [regEmergency, setRegEmergency] = useState("");
  const [regCompany, setRegCompany] = useState("Digital Construction ERP");
  const [regDept, setRegDept] = useState("Formwork Assembly");
  const [regTrade, setRegTrade] = useState("Carpenter");
  const [regPosition, setRegPosition] = useState("Skilled Laborer");
  const [regEmploymentType, setRegEmploymentType] = useState("Daily Labourer");
  const [regJoinDate, setRegJoinDate] = useState(new Date().toISOString().split("T")[0]);
  const [regProject, setRegProject] = useState("Digital Bole Heights");
  const [regBuilding, setRegBuilding] = useState("Tower 1");
  const [regFloor, setRegFloor] = useState(4);
  const [regZone, setRegZone] = useState("Zone A");
  const [regTeamLeader, setRegTeamLeader] = useState("Yohannes Bekele");
  const [regGangChief, setRegGangChief] = useState("Fikru Tolossa");
  const [regSupervisor, setRegSupervisor] = useState("Kassa Hunegn");
  const [regPhotoPlaceholder, setRegPhotoPlaceholder] = useState("https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=faces");
  const [fingerprintEnrolled, setFingerprintEnrolled] = useState(true);
  const [regSuccessMsg, setRegSuccessMsg] = useState("");

  const placeholderPhotos = [
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=faces",
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=faces",
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=faces",
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=faces",
    "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&h=150&fit=crop&crop=faces"
  ];

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim()) return;

    // Generate numeric employee ID
    const randomId = Math.floor(100 + Math.random() * 900);
    const newEmpId = `Digital Construction ERP-EMP-${randomId}`;

    const newWorker: Worker = {
      id: newEmpId,
      name: regName,
      photo: regPhotoPlaceholder,
      phoneNumber: regPhone,
      nationalId: regNationalId,
      gender: regGender,
      dateOfBirth: regDob,
      address: regAddress,
      emergencyContact: regEmergency,
      company: regCompany,
      department: regDept,
      trade: regTrade,
      position: regPosition,
      employmentType: regEmploymentType,
      joinedDate: regJoinDate,
      assignedProject: regProject,
      building: regBuilding,
      floor: Number(regFloor),
      zone: regZone,
      teamLeader: regTeamLeader,
      gangChief: regGangChief,
      supervisor: regSupervisor,
      qrCode: `QR-${newEmpId}`,
      faceRecognitionData: "", // Clear face recognition so they must enroll first!
      fingerprint: "", // Clear fingerprint so they must enroll first!
      status: "Active", // Registered worker is Active immediately
      teamId: "T-01" // Default team assignment
    };

    onAddWorker(newWorker);
    setSelectedEnrollWorkerId(newEmpId); // Pre-select for enrollment!

    setRegSuccessMsg(isAmharic 
      ? `ሰራተኛ ${regName} (${newEmpId}) በተሳካ ሁኔታ ተመዝግቧል! ሰራተኛው በቋሚ ዝርዝር ላይ ነቅቷል።` 
      : `Employee ${regName} (${newEmpId}) registered successfully and activated on roster!`);
    
    // Clear inputs
    setRegName("");
    setRegPhone("");
    setRegNationalId("");
    setRegEmergency("");

    // Scroll to success
    window.scrollTo({ top: 0, behavior: 'smooth' });

    setTimeout(() => {
      setRegSuccessMsg("");
      setActiveSubTab("biometric_enrollment"); // Direct redirect to enrollment!
    }, 3000);
  };

  // --- ATTENDANCE TAB STATE ---
  const [attSearchQuery, setAttSearchQuery] = useState("");
  const [attFilterStatus, setAttFilterStatus] = useState("All");
  const [attFilterZone, setAttFilterZone] = useState("All");
  const [attFilterProject, setAttFilterProject] = useState("All");
  const [attFilterFloor, setAttFilterFloor] = useState("All");
  const [attFilterTeam, setAttFilterTeam] = useState("All");
  const [attFilterTrade, setAttFilterTrade] = useState("All");
  const [attSortKey, setAttSortKey] = useState("none");

  // Attendance Records Edit / Approve State
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editCheckIn, setEditCheckIn] = useState("");
  const [editCheckOut, setEditCheckOut] = useState("");
  const [editStatus, setEditStatus] = useState<"Present" | "Late" | "Absent" | "Leave">("Present");
  const [editRemarks, setEditRemarks] = useState("");

  const sharedAttendance = useMemo(() => {
    // Sharing rules for Attendance records
    if (!isSyncFilterActive || !assignedArea) return attendance;

    return attendance.filter(a => {
      const matchesBldg = !assignedArea.building || a.building === assignedArea.building;
      const matchesFloor = assignedArea.floor === undefined || a.floor === assignedArea.floor;
      const matchesZone = !assignedArea.zone || a.zone === assignedArea.zone;
      return matchesBldg && matchesFloor && matchesZone;
    });
  }, [attendance, assignedArea, isSyncFilterActive]);

  const filteredAttendance = useMemo(() => {
    let result = sharedAttendance.filter(a => {
      const w = workers.find(work => work.id === a.workerId);
      const workerProject = w?.assignedProject || "Digital Bole Heights";
      const workerTrade = w?.trade || a.trade;
      const workerTeam = w?.teamId || "T-01";
      const workerFloor = w?.floor || a.floor;
      const workerZone = w?.zone || a.zone;

      const matchesSearch = a.workerName.toLowerCase().includes(attSearchQuery.toLowerCase()) || 
                            a.workerId.toLowerCase().includes(attSearchQuery.toLowerCase());
      const matchesStatus = attFilterStatus === "All" || a.status === attFilterStatus;
      const matchesZone = attFilterZone === "All" || a.zone === attFilterZone || workerZone === attFilterZone;
      const matchesProject = attFilterProject === "All" || workerProject === attFilterProject;
      const matchesFloor = attFilterFloor === "All" || String(workerFloor) === attFilterFloor || String(a.floor) === attFilterFloor;
      const matchesTeam = attFilterTeam === "All" || workerTeam === attFilterTeam;
      const matchesTrade = attFilterTrade === "All" || workerTrade === attFilterTrade;

      return matchesSearch && matchesStatus && matchesZone && matchesProject && matchesFloor && matchesTeam && matchesTrade;
    });

    if (attSortKey === "attendance") {
      const statusRank: Record<string, number> = { "Present": 1, "Late": 2, "Leave": 3, "Absent": 4 };
      result = [...result].sort((a, b) => (statusRank[a.status] || 99) - (statusRank[b.status] || 99));
    } else if (attSortKey === "performance") {
      result = [...result].sort((a, b) => {
        const scoreA = getWorkerAverageScore(a.workerId);
        const scoreB = getWorkerAverageScore(b.workerId);
        return scoreB - scoreA;
      });
    } else if (attSortKey === "overtime") {
      result = [...result].sort((a, b) => b.overtime - a.overtime);
    }

    return result;
  }, [sharedAttendance, attSearchQuery, attFilterStatus, attFilterZone, attFilterProject, attFilterFloor, attFilterTeam, attFilterTrade, attSortKey, workers, evaluations]);

  const handleEditRecordStart = (rec: AttendanceRecord) => {
    setEditingRecordId(rec.id);
    setEditCheckIn(rec.checkIn || "");
    setEditCheckOut(rec.checkOut || "");
    setEditStatus(rec.status as any);
    setEditRemarks("");
  };

  const handleEditRecordSave = () => {
    if (!editingRecordId) return;
    const existingRec = attendance.find(a => a.id === editingRecordId);
    if (!existingRec) return;

    // Recalculate working hours if checkout changed
    let workingHours = existingRec.workingHours;
    let overtime = existingRec.overtime;
    if (editCheckIn && editCheckOut) {
      const [inH, inM] = editCheckIn.split(":").map(Number);
      const [outH, outM] = editCheckOut.split(":").map(Number);
      const diff = Math.max(0, (outH + outM/60) - (inH + inM/60));
      workingHours = parseFloat(Math.min(8.0, diff).toFixed(2));
      overtime = parseFloat(Math.max(0, diff - 8.0).toFixed(2));
    } else if (!editCheckIn) {
      workingHours = 0;
      overtime = 0;
    }

    const updated: AttendanceRecord = {
      ...existingRec,
      checkIn: editCheckIn || null,
      checkOut: editCheckOut || null,
      status: editStatus as any,
      workingHours,
      overtime
    };

    onAddAttendance(updated); // App.tsx handler will replace the record
    setEditingRecordId(null);
  };

  // --- PERFORMANCE TAB STATE ---
  const [perfSearchQuery, setPerfSearchQuery] = useState("");
  const [perfFilterGrade, setPerfFilterGrade] = useState("All");

  // New Performance Evaluation Sheet values
  const [evalWorkerId, setEvalWorkerId] = useState("");
  const [pDiscipline, setPDiscipline] = useState(20);
  const [pQuality, setPQuality] = useState(20);
  const [pProductivity, setPProductivity] = useState(20);
  const [pSafety, setPSafety] = useState(15);
  const [pEquipmentHandling, setPEquipmentHandling] = useState(10);
  const [pTeamwork, setPTeamwork] = useState(10);
  const [pAttendance, setPAttendance] = useState(5);
  const [evalComment, setEvalComment] = useState("");
  const [evalSuccessMsg, setEvalSuccessMsg] = useState("");

  const sharedEvaluations = useMemo(() => {
    // Sharing rules for Performance reports
    if (!isSyncFilterActive || !assignedArea) return evaluations;

    return evaluations.filter(e => {
      // Find worker's location to check sharing permissions
      const w = workers.find(work => work.id === e.workerId);
      if (!w) return true; // Keep if not found

      const matchesBldg = !assignedArea.building || w.building === assignedArea.building;
      const matchesFloor = assignedArea.floor === undefined || w.floor === assignedArea.floor;
      const matchesZone = !assignedArea.zone || w.zone === assignedArea.zone;
      return matchesBldg && matchesFloor && matchesZone;
    });
  }, [evaluations, workers, assignedArea, isSyncFilterActive]);

  const filteredEvaluations = useMemo(() => {
    return sharedEvaluations.filter(e => {
      const matchesSearch = e.workerName.toLowerCase().includes(perfSearchQuery.toLowerCase()) || 
                            e.workerId.toLowerCase().includes(perfSearchQuery.toLowerCase());
      const matchesGrade = perfFilterGrade === "All" || e.level === perfFilterGrade;
      return matchesSearch && matchesGrade;
    });
  }, [sharedEvaluations, perfSearchQuery, perfFilterGrade]);

  const handlePerformanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!evalWorkerId) return;

    const worker = workers.find(w => w.id === evalWorkerId);
    if (!worker) return;

    const total = pDiscipline + pQuality + pProductivity + pSafety + pEquipmentHandling + pTeamwork + pAttendance;
    
    // Performance Grades rules:
    // 95-100: Excellent, 85-94: Very Good, 70-84: Good, 50-69: Average, <50: Poor
    let level: "Excellent" | "Very Good" | "Good" | "Average" | "Poor" = "Poor";
    if (total >= 95) level = "Excellent";
    else if (total >= 85) level = "Very Good";
    else if (total >= 70) level = "Good";
    else if (total >= 50) level = "Average";

    const newEval: PerformanceEvaluation = {
      id: `EVAL-${Date.now()}`,
      workerId: evalWorkerId,
      workerName: worker.name,
      date: new Date().toISOString().split("T")[0],
      discipline: pDiscipline,
      quality: pQuality,
      productivity: pProductivity,
      safetyCompliance: pSafety,
      equipmentHandling: pEquipmentHandling,
      teamwork: pTeamwork,
      attendance: pAttendance,
      totalScore: total,
      level,
      comment: evalComment,
      evaluatedBy: currentUserRole === UserRole.HEAD_OFFICE ? "Eng. Yoseph" : "TK Abebe Girma / Team Lead"
    };

    onAddEvaluation(newEval);

    setEvalSuccessMsg(isAmharic 
      ? `የስራ ግምገማው በተሳካ ሁኔታ ተመዝግቧል! አጠቃላይ ውጤት: ${total}/100 (${level})`
      : `Evaluation saved successfully! Total score: ${total}/100 (${level})`);
    
    setEvalWorkerId("");
    setEvalComment("");
    
    setTimeout(() => {
      setEvalSuccessMsg("");
    }, 3500);
  };

  // --- CLOCK-IN SCANNER CONTROLS ---
  const [selectedWorkerId, setSelectedWorkerId] = useState("");
  const [selectedMethod, setSelectedMethod] = useState<AttendanceMethod>(AttendanceMethod.FINGERPRINT);
  const [scanStatus, setScanStatus] = useState<"idle" | "scanning" | "success" | "failed">("idle");
  const [selectedBuilding, setSelectedBuilding] = useState("Digital Bole Heights");
  const [selectedFloor, setSelectedFloor] = useState(4);
  const [selectedZone, setSelectedZone] = useState("Zone A");
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // --- POLICY & POLICY CONFIGURATION STATES ---
  const [shiftStart, setShiftStart] = useState("08:00");
  const [shiftEnd, setShiftEnd] = useState("17:00");
  const [breakDuration, setBreakDuration] = useState(1.0); // 1.0 hour break
  const [geofenceLat, setGeofenceLat] = useState(9.0112);
  const [geofenceLng, setGeofenceLng] = useState(38.7573);
  const [allowedRadius, setAllowedRadius] = useState(100); // meters
  const [gracePeriod, setGracePeriod] = useState(15); // minutes
  const [overtimeThreshold, setOvertimeThreshold] = useState(3.0); // Excessive Overtime Alert (hrs)
  const [showConfigPanel, setShowConfigPanel] = useState(false);

  // --- SIMULATION PARAMETERS ---
  const [simLocation, setSimLocation] = useState<"on-site" | "airport" | "saris">("on-site");
  const [simBiometric, setSimBiometric] = useState<"success" | "mismatch" | "sensor_error">("success");
  const [simTimeMode, setSimTimeMode] = useState<"ontime" | "late" | "overtime">("ontime");
  const [simDeviceId, setSimDeviceId] = useState("Device-Digital Construction ERP-TK01");

  // --- REJECTION / VERIFICATION ERROR ---
  const [verificationError, setVerificationError] = useState<string | null>(null);

  // --- REAL-TIME ALERTS / NOTIFICATIONS STATE ---
  const [alerts, setAlerts] = useState<any[]>([
    { id: "A-1", type: "Late Check-In", message: "Chala Kebede checked in late (08:15:00) on Floor 3 Zone B.", timestamp: "2026-07-01 08:16", read: false },
    { id: "A-2", type: "GPS Outside Authorized Area", message: "Yosef Assefa attempted clock-in from 12.4km deviation outside geofence.", timestamp: "2026-07-01 07:45", read: false },
    { id: "A-3", type: "Face or Fingerprint Verification Failure", message: "Biometric validation mismatch reported on Device-Digital Construction ERP-TK01.", timestamp: "2026-07-01 07:35", read: false }
  ]);

  const handleStartCamera = async () => {
    setIsCameraActive(true);
    setScanStatus("scanning");
    setVerificationError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.warn("Camera access unverified or simulation overlay only.", err);
    }
    
    setTimeout(() => {
      handleStopCamera();
      
      // RUN RIGOROUS VERIFICATION CHECKS
      if (!selectedWorkerId) {
        setScanStatus("failed");
        setVerificationError("No worker selected.");
        return;
      }
      const worker = workers.find(w => w.id === selectedWorkerId);
      if (!worker) {
        setScanStatus("failed");
        setVerificationError("Employee registration record not found.");
        return;
      }

      // Check Profile Activation State (Mandatory Biometric Enrollment)
      if (worker.status !== "Active") {
        setScanStatus("failed");
        const errMsg = isAmharic 
          ? `የባዮሜትሪክ መዝገብ አልተገኘም፡ ሰራተኛ ${worker.name} (${worker.id}) ባዮሜትሪክ መረጃ አልተመዘገበም። እባክዎን መጀመሪያ ባዮሜትሪክስ መመዝገቢያSuite ላይ ያስመዝግቡት!`
          : `Security Lockout: Employee ${worker.name} (${worker.id}) has not completed mandatory biometric enrollment. Profile is Inactive. Verification blocked.`;
        setVerificationError(errMsg);
        return;
      }

      // Check 1: Biometric Matching
      if (simBiometric === "mismatch") {
        setScanStatus("failed");
        const errMsg = `Biometric Template Mismatch: Sensor similarity score 32% below the required 85% threshold for worker ${worker.name}. Entry denied.`;
        setVerificationError(errMsg);
        
        // Log to Alerts
        const newAlert = {
          id: `A-${Date.now()}`,
          type: "Face or Fingerprint Verification Failure",
          message: `Worker ${worker.name} (${worker.id}) failed biometric match on ${simDeviceId}.`,
          timestamp: new Date().toISOString().replace("T", " ").slice(0, 16),
          read: false
        };
        setAlerts(prev => [newAlert, ...prev]);
        return;
      }

      if (simBiometric === "sensor_error") {
        setScanStatus("failed");
        setVerificationError("Hardware Interface Error: Biometric sensor failed to return a valid template stream. Please clean lens and retry.");
        return;
      }

      // Check 2: GPS Geofencing
      if (simLocation !== "on-site") {
        setScanStatus("failed");
        const deviation = simLocation === "airport" ? "4.1km" : "12.4km";
        const errMsg = `GPS Location Violation: Current tracking indicates a ${deviation} deviation from authorized Digital Construction ERP site center (Lat: ${geofenceLat}, Lng: ${geofenceLng}). Clock attempt rejected.`;
        setVerificationError(errMsg);

        // Log to Alerts
        const newAlert = {
          id: `A-${Date.now()}`,
          type: "GPS Outside Authorized Area",
          message: `Worker ${worker.name} (${worker.id}) rejected: GPS coordinates outside authorized geofence.`,
          timestamp: new Date().toISOString().replace("T", " ").slice(0, 16),
          read: false
        };
        setAlerts(prev => [newAlert, ...prev]);
        return;
      }

      // Check 3: Check-In is within allowed shift window (simulated clock checks)
      setScanStatus("success");
    }, 1800);
  };

  const handleStopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setIsCameraActive(false);
  };

  const handleRegisterAttendance = (type: "In" | "Out") => {
    if (!selectedWorkerId) return;
    const worker = workers.find(w => w.id === selectedWorkerId);
    if (!worker) return;

    const todayDate = new Date().toISOString().split("T")[0];
    
    // Set simulated clock times based on selected test mode
    let simulatedTime = "07:45:00";
    if (type === "In") {
      if (simTimeMode === "ontime") simulatedTime = "07:45:00";
      else if (simTimeMode === "late") simulatedTime = "08:35:00";
      else simulatedTime = "07:30:00";
    } else {
      if (simTimeMode === "ontime") simulatedTime = "17:05:00";
      else if (simTimeMode === "overtime") simulatedTime = "20:30:00";
      else simulatedTime = "17:00:00";
    }

    const existingIndex = attendance.findIndex(a => a.workerId === worker.id && a.date === todayDate);

    if (type === "In") {
      if (existingIndex !== -1) {
        alert(isAmharic ? "ይህ ሰራተኛ ዛሬ ቀድሞውኑ ገብቷል!" : "Worker has already checked in for today!");
        return;
      }

      // Late arrival calculation based on shift policies
      const [simH, simM] = simulatedTime.split(":").map(Number);
      const [shiftH, shiftM] = shiftStart.split(":").map(Number);
      
      const simMinutes = simH * 60 + simM;
      const shiftMinutes = shiftH * 60 + shiftM;
      
      const isLate = simMinutes > (shiftMinutes + gracePeriod);
      const status = isLate ? "Late" : "Present";

      if (isLate) {
        const newAlert = {
          id: `A-${Date.now()}`,
          type: "Late Check-In",
          message: `Worker ${worker.name} (${worker.id}) checked in late at ${simulatedTime} (Policy: ${shiftStart} + ${gracePeriod}m grace).`,
          timestamp: new Date().toISOString().replace("T", " ").slice(0, 16),
          read: false
        };
        setAlerts(prev => [newAlert, ...prev]);
      }

      const newRecord: AttendanceRecord = {
        id: `ATT-${Date.now()}`,
        workerId: worker.id,
        workerName: worker.name,
        department: worker.department,
        trade: worker.trade,
        company: worker.company,
        building: selectedBuilding,
        floor: selectedFloor,
        zone: selectedZone,
        date: todayDate,
        checkIn: simulatedTime,
        checkOut: null,
        method: selectedMethod,
        workingHours: 0,
        overtime: 0,
        status: status,
        gpsCoordinates: { lat: geofenceLat, lng: geofenceLng },
        deviceUsed: simDeviceId,
        verifiedBy: currentUserRole === UserRole.TIME_KEEPER ? "Time Keeper Abebe" : "Foreman Fikru",
        gpsLocationString: `Bole Heights Tower 1 FL ${selectedFloor} (${simLocation === "on-site" ? "On-Site" : "Off-Site"})`
      };

      // Add custom system fields for billing/reports
      (newRecord as any).deviceId = simDeviceId;
      (newRecord as any).breakTime = breakDuration;
      (newRecord as any).netWorkingHours = 0;
      (newRecord as any).remarks = `Secure ${selectedMethod} authentication. Verified by ${currentUserRole}.`;

      // Handle Offline Caching
      if (isOffline) {
        setOfflineQueue(prev => [...prev, { type: "In", record: newRecord }]);
        alert(isAmharic 
          ? `ግንኙነት የለም! የ ${worker.name} መግቢያ መዝገብ በተሳካ ሁኔታ ከመስመር ውጭ (Local cache) ተቀምጧል።`
          : `No network connection detected! Check-In record for ${worker.name} has been cached locally in SQLite/IndexedDB queue.`);
      } else {
        onAddAttendance(newRecord);
      }

      setScanStatus("idle");
      setSelectedWorkerId("");
    } else {
      // Find active check-in record for today (either in local cached queue or global attendance)
      let latestRecord = [...attendance]
        .reverse()
        .find(a => a.workerId === worker.id && a.checkOut === null);

      // Also check if there's a cached check-in in the offline queue
      if (!latestRecord && isOffline) {
        const cachedIn = offlineQueue.find(q => q.type === "In" && q.record.workerId === worker.id);
        if (cachedIn) {
          latestRecord = cachedIn.record;
        }
      }

      if (!latestRecord) {
        alert(isAmharic ? "ይህ ሰራተኛ የገባበት ሰዓት አልተመዘገበም!" : "No active check-in session found for this worker!");
        return;
      }

      const checkInStr = latestRecord.checkIn || "08:00:00";
      const [inH, inM] = checkInStr.split(":").map(Number);
      const [outH, outM] = simulatedTime.split(":").map(Number);
      
      const totalHours = Math.max(0, (outH + outM / 60) - (inH + inM / 60));
      const netWorkingHours = Math.max(0, totalHours - breakDuration);
      
      // Standard shift cap of 8.0 hours for regular labor, remainder is Overtime
      const workingHoursCap = parseFloat(Math.min(8.0, netWorkingHours).toFixed(2));
      const overtime = parseFloat(Math.max(0, netWorkingHours - 8.0).toFixed(2));

      if (overtime >= overtimeThreshold) {
        const newAlert = {
          id: `A-${Date.now()}`,
          type: "Excessive Overtime",
          message: `Worker ${worker.name} (${worker.id}) recorded excessive overtime of +${overtime} hours.`,
          timestamp: new Date().toISOString().replace("T", " ").slice(0, 16),
          read: false
        };
        setAlerts(prev => [newAlert, ...prev]);
      }

      const updatedRecord: AttendanceRecord = {
        ...latestRecord,
        checkOut: simulatedTime,
        workingHours: parseFloat((workingHoursCap + overtime).toFixed(2)), // Net Working Hours
        overtime,
        deviceUsed: simDeviceId,
        verifiedBy: currentUserRole === UserRole.TIME_KEEPER ? "Time Keeper Abebe" : "Foreman Fikru",
        gpsLocationString: `Bole Heights Tower 1 FL ${selectedFloor} (${simLocation === "on-site" ? "On-Site" : "Off-Site"})`
      };

      (updatedRecord as any).breakTime = breakDuration;
      (updatedRecord as any).netWorkingHours = parseFloat(netWorkingHours.toFixed(2));
      (updatedRecord as any).remarks = `Clock-out secure match. Net: ${netWorkingHours.toFixed(2)} hrs. Verified by ${currentUserRole}.`;

      // Handle Offline Caching
      if (isOffline) {
        // If there was an un-checkout record locally, replace or append
        setOfflineQueue(prev => [...prev, { type: "Out", record: updatedRecord }]);
        alert(isAmharic 
          ? `ግንኙነት የለም! የ ${worker.name} መውጫ መዝገብ በተሳካ ሁኔታ ከመስመር ውጭ (Local cache) ተቀምጧል።`
          : `No network connection detected! Check-Out record for ${worker.name} has been cached locally in SQLite/IndexedDB queue.`);
      } else {
        onAddAttendance(updatedRecord);
      }

      setScanStatus("idle");
      setSelectedWorkerId("");
    }
  };

  const handleExportCSV = () => {
    let headers = "Record ID,Worker ID,Name,Trade,Department,Building,Floor,Zone,Date,Check-In,Check-Out,Hours,Overtime,Status,Method\n";
    const rows = attendance.map(a => 
      `"${a.id}","${a.workerId}","${a.workerName}","${a.trade}","${a.department}","${a.building}",${a.floor},"${a.zone}","${a.date}","${a.checkIn || '-'}","${a.checkOut || '-'}",${a.workingHours},${a.overtime},"${a.status}","${a.method || '-'}"`
    ).join("\n");
    
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Digital Construction ERP_Roster_Attendance_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportExcel = () => {
    let headers = ["Record ID", "Worker ID", "Name", "Trade", "Department", "Building", "Floor", "Zone", "Date", "Check-In", "Check-Out", "Hours", "Overtime", "Status", "Performance Score", "Task Status", "Remarks"];
    const rows = filteredAttendance.map(a => {
      const w = workers.find(work => work.id === a.workerId);
      const perf = getWorkerAverageScore(a.workerId) + "%";
      const task = w?.trade === "Carpenter" ? "Formwork Assembly - Completed" : "Stripping - In Progress";
      return [
        a.id,
        a.workerId,
        a.workerName,
        a.trade,
        a.department,
        a.building,
        a.floor,
        a.zone,
        a.date,
        a.checkIn || "-",
        a.checkOut || "-",
        a.workingHours,
        a.overtime,
        a.status,
        perf,
        task,
        (a as any).remarks || "Synced biometric validation"
      ];
    });

    const csvContent = [headers.join("\t"), ...rows.map(r => r.join("\t"))].join("\n");
    const blob = new Blob([csvContent], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Digital Construction ERP_Roster_Attendance_Sheet_${new Date().toISOString().split('T')[0]}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const uniqueTrades = Array.from(new Set(workers.map(w => w.trade)));

  // Master Prompt Access Guard: Restrict viewing to authorized roles
  if (!isUserAuthorizedForAttendance) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center max-w-3xl mx-auto space-y-6 my-8 font-sans">
        <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto border-2 border-red-200 shadow-sm animate-pulse">
          <ShieldAlert size={36} />
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-black text-slate-900 tracking-tight">
            {isAmharic ? "መዳረሻ ተከልክሏል፡ የመገኘት መረጃ ደህንነት መመሪያ" : "Access Denied: Attendance Access Control Policy Enforced"}
          </h3>
          <p className="text-xs text-slate-600 max-w-xl mx-auto leading-relaxed">
            {isAmharic
              ? "የሰራተኞች የመገኘት፣ የባዮሜትሪክስ መረጃዎች እና ዕለታዊ ሪፖርቶች ለተፈቀደላቸው የስራ ሃላፊዎች ብቻ የተገደቡ ናቸው።"
              : "Employee attendance information, biometric logs, GPS locations, and daily reports are strictly restricted to authorized roles according to the BuildSync ERP Security Specification."}
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-left space-y-3 text-xs">
          <div className="font-extrabold text-slate-800 uppercase tracking-wider text-[11px] flex items-center space-x-2">
            <Lock size={14} className="text-red-600" />
            <span>{isAmharic ? "የተፈቀደላቸው የስራ መደቦች (Authorized Roles Only):" : "Authorized Attendance Viewing Roles:"}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
            {["Time Keeper", "Gang Chief", "Team Leader", "Section Head", "Supervisor", "Head Supervisor", "Admin"].map(r => (
              <div key={r} className="bg-white p-2 rounded-lg border border-slate-200 font-bold text-slate-700 flex items-center space-x-1.5">
                <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
                <span>{r}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => {
              setAdminOverrideActive(true);
              if (onLogAction) {
                onLogAction("Admin Security Override Triggered", `Temporary session access granted for role ${currentUserRole}`);
              }
            }}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center space-x-2 cursor-pointer"
          >
            <Key size={14} />
            <span>{isAmharic ? "የአስተዳዳሪ ፍቃድ ውክልና (Admin Override)" : "Request Admin Access Override"}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Upper Unified Tab Navigation */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-red-100 text-red-700 rounded-xl">
              <Users size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                {isAmharic ? "የሰራተኞች ምዝገባና መገኘት ቁጥጥር" : "Employee Registration & Roster System"}
              </h2>
              <p className="text-xs text-slate-500">
                {isAmharic 
                  ? "የተቀናጀ የሰራተኞች ዝርዝር፣ የቅጥር መመዝገቢያ ፎርም፣ የዕለት መገኘት እና የውጤት መገምገሚያ ሠንጠረዥ"
                  : "Integrated worker registration, synchronized shared roster, attendance logs, and performance metrics."}
              </p>
            </div>
          </div>

          {/* Location Sync Warning for Team Roles */}
          {assignedArea && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 px-3 py-1.5 rounded-xl text-xs flex items-center space-x-2">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></div>
              <span>
                {isAmharic 
                  ? `አውቶማቲክ ማመሳሰል በርቷል፡ ዞን FL ${assignedArea.floor} - ${assignedArea.zone || "ሁሉንም ዞኖች"} ሰራተኞችን ብቻ እያዩ ነው።`
                  : `Role Roster Active: Visible to you in FL ${assignedArea.floor} - ${assignedArea.zone || "All Zones"}.`}
              </span>
              <button 
                onClick={() => setIsSyncFilterActive(!isSyncFilterActive)} 
                className="ml-2 font-bold hover:underline text-[10px] uppercase"
              >
                {isSyncFilterActive ? (isAmharic ? "ሁሉንም አሳይ" : "Show All") : (isAmharic ? "ያጣሩ" : "Filter")}
              </button>
            </div>
          )}
        </div>

        {/* Sub Navigation Bar inside Attendance Tab */}
        <div className="flex items-center overflow-x-auto gap-2 border-t border-slate-100 mt-4 pt-4 scrollbar-none">
          <button
            onClick={() => setActiveSubTab("daily_reports")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center space-x-2 shrink-0 cursor-pointer ${
              activeSubTab === "daily_reports" ? "bg-slate-900 text-white shadow-sm" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
            }`}
          >
            <FileText size={14} className="text-blue-500" />
            <span>{isAmharic ? "ዕለታዊ የመገኘት ሪፖርቶች" : "Daily Attendance Reports Hub"}</span>
            <span className="bg-blue-600 text-white text-[9px] px-1.5 py-0.5 rounded-full font-mono">8 Reports</span>
          </button>

          <button
            onClick={() => setActiveSubTab("security_rbac")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center space-x-2 shrink-0 cursor-pointer ${
              activeSubTab === "security_rbac" ? "bg-slate-900 text-white shadow-sm" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
            }`}
          >
            <ShieldCheck size={14} className="text-red-500" />
            <span>{isAmharic ? "ደህንነትና የመዳረሻ ፍቃዶች" : "Access Control & Security"}</span>
          </button>

          <button
            onClick={() => setActiveSubTab("directory")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center space-x-2 shrink-0 cursor-pointer ${
              activeSubTab === "directory" ? "bg-slate-900 text-white shadow-sm" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Folder size={14} />
            <span>{isAmharic ? "የሰራተኞች ዝርዝር ማህደር" : "Employee Directory"}</span>
            <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full">{filteredDirectoryWorkers.length}</span>
          </button>

          {(currentUserRole === UserRole.TIME_KEEPER || currentUserRole === UserRole.HEAD_OFFICE) && (
            <button
              onClick={() => setActiveSubTab("register")}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center space-x-2 shrink-0 cursor-pointer ${
                activeSubTab === "register" ? "bg-slate-900 text-white shadow-sm" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <UserPlus size={14} />
              <span>{isAmharic ? "አዲስ ሰራተኛ መመዝገቢያ" : "Time Keeper Recruitment"}</span>
            </button>
          )}

          {(currentUserRole === UserRole.TIME_KEEPER || currentUserRole === UserRole.HEAD_OFFICE) && (
            <button
              onClick={() => setActiveSubTab("biometric_enrollment")}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center space-x-2 shrink-0 cursor-pointer ${
                activeSubTab === "biometric_enrollment" ? "bg-slate-900 text-white shadow-sm" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Fingerprint size={14} className="text-red-500" />
              <span>{isAmharic ? "የባዮሜትሪክ ምዝገባ ዴስክ" : "Biometric Enrollment Desk"}</span>
              {workers.filter(w => w.status === "Inactive").length > 0 && (
                <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full animate-bounce shrink-0">
                  {workers.filter(w => w.status === "Inactive").length}
                </span>
              )}
            </button>
          )}

          <button
            onClick={() => setActiveSubTab("attendance_table")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center space-x-2 shrink-0 cursor-pointer ${
              activeSubTab === "attendance_table" ? "bg-slate-900 text-white shadow-sm" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Clock size={14} />
            <span>{isAmharic ? "የእለት መገኘት ቁጥጥር" : "Daily Attendance Sheets"}</span>
          </button>

          <button
            onClick={() => setActiveSubTab("performance_table")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center space-x-2 shrink-0 cursor-pointer ${
              activeSubTab === "performance_table" ? "bg-slate-900 text-white shadow-sm" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Star size={14} />
            <span>{isAmharic ? "የእለት የውጤት ግምገማ" : "Daily Performance Ledger"}</span>
          </button>

          <button
            onClick={() => setActiveSubTab("clock_in")}
            className={`px-4 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-all flex items-center space-x-2 shrink-0 cursor-pointer border border-red-100 ${
              activeSubTab === "clock_in" ? "bg-red-600 text-white border-red-600" : ""
            }`}
          >
            <Fingerprint size={14} />
            <span>{isAmharic ? "ባዮሜትሪክ መግቢያ/መውጫ" : "Biometric Clock In/Out"}</span>
          </button>

          <button
            onClick={() => setActiveSubTab("overtime_reports")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center space-x-2 shrink-0 cursor-pointer ${
              activeSubTab === "overtime_reports" ? "bg-slate-900 text-white shadow-sm" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
            }`}
          >
            <FileSpreadsheet size={14} />
            <span>{isAmharic ? "የትርፍ ሰዓት ሪፖርቶች" : "Overtime Reports Desk"}</span>
          </button>

          <button
            onClick={() => setActiveSubTab("break_exceptions")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center space-x-2 shrink-0 cursor-pointer ${
              activeSubTab === "break_exceptions" ? "bg-slate-900 text-white shadow-sm" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
            }`}
          >
            <ShieldCheck size={14} className="text-emerald-500" />
            <span>{isAmharic ? "ስማርት መገኘት እና የልዩነት ሪፖርት ቁጥጥር" : "Smart Attendance & Exceptions"}</span>
          </button>

          <button
            onClick={() => setActiveSubTab("smart_payroll")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center space-x-2 shrink-0 cursor-pointer ${
              activeSubTab === "smart_payroll" ? "bg-slate-900 text-white shadow-sm" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Database size={14} className="text-red-500 animate-pulse" />
            <span>{isAmharic ? "ስማርት የደመወዝ፣ ትርፍ ሰዓትና ቅጣት ቁጥጥር" : "Smart Payroll & Overtime"}</span>
          </button>
        </div>
      </div>

      {regSuccessMsg && (
        <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl border border-emerald-200 text-xs font-bold flex items-center space-x-2 shadow-sm animate-pulse">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <span>{regSuccessMsg}</span>
        </div>
      )}

      {/* --- SUB TAB 1: EMPLOYEE DIRECTORY --- */}
      {activeSubTab === "directory" && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">{isAmharic ? "ኦፊሴላዊ የሰራተኞች ዝርዝር ማህደር" : "Official Organization Roster"}</h3>
              <p className="text-xs text-slate-500">
                {isAmharic 
                  ? "የተመዘገቡ የሳይት ሰራተኞች ዝርዝር ፎቶ፣ መለያ፣ የስራ ድርሻ፣ እና ወቅታዊ የመገኘት ሁኔታ መረጃዎችን ያካተተ"
                  : "Comprehensive registered list tracking photos, assignments, performance scores, and daily clock-ins."}
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button 
                onClick={handleExportCSV}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                <Download size={14} />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Directory Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400">
                <Search size={14} />
              </span>
              <input 
                type="text" 
                placeholder={isAmharic ? "በስም፣ መለያ ወይም በሙያ ይፈልጉ..." : "Search name, ID, position..."}
                value={directorySearch}
                onChange={(e) => setDirectorySearch(e.target.value)}
                className="w-full bg-white text-xs border border-slate-200 rounded-lg pl-8 pr-3 py-2 outline-none focus:border-red-600"
              />
            </div>

            <div className="flex items-center space-x-1">
              <span className="text-slate-500 font-medium shrink-0">Trade:</span>
              <select 
                value={dirFilterTrade}
                onChange={(e) => setDirFilterTrade(e.target.value)}
                className="w-full bg-white text-xs border border-slate-200 rounded-lg p-2 outline-none"
              >
                <option value="All">{isAmharic ? "ሁሉም ሙያዎች" : "All Trades"}</option>
                {uniqueTrades.map(tr => (
                  <option key={tr} value={tr}>{tr}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-1">
              <span className="text-slate-500 font-medium shrink-0">Status:</span>
              <select 
                value={dirFilterStatus}
                onChange={(e) => setDirFilterStatus(e.target.value)}
                className="w-full bg-white text-xs border border-slate-200 rounded-lg p-2 outline-none"
              >
                <option value="All">{isAmharic ? "ሁሉም ሁኔታ" : "All Status"}</option>
                <option value="Active">{isAmharic ? "ንቁ (Active)" : "Active Only"}</option>
                <option value="Inactive">{isAmharic ? "ያልነቁ (Inactive)" : "Inactive Only"}</option>
              </select>
            </div>

            <div className="flex items-center space-x-1">
              <span className="text-slate-500 font-medium shrink-0">Sort By:</span>
              <select 
                value={dirSortKey}
                onChange={(e) => setDirSortKey(e.target.value as any)}
                className="w-full bg-white text-xs border border-slate-200 rounded-lg p-2 outline-none"
              >
                <option value="name">{isAmharic ? "በስም (ሀ-ፐ)" : "Name (A-Z)"}</option>
                <option value="id">{isAmharic ? "በመለያ ቁጥር" : "Employee ID"}</option>
                <option value="joinedDate">{isAmharic ? "በቅጥር ቀን" : "Hire Date"}</option>
                <option value="performance">{isAmharic ? "በውጤት ደረጃ" : "Performance Score"}</option>
              </select>
            </div>
          </div>

          {/* Directory Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-100">
                  <th className="p-3">{isAmharic ? "ፎቶ" : "Photo"}</th>
                  <th className="p-3">{isAmharic ? "የሰራተኛው ስም / መለያ" : "Worker ID & Name"}</th>
                  <th className="p-3">{isAmharic ? "ሙያ / የስራ ደረጃ" : "Trade & Position"}</th>
                  <th className="p-3">{isAmharic ? "ኩባንያ / ክፍል" : "Company & Dept"}</th>
                  <th className="p-3">{isAmharic ? "አካባቢ ድልድል" : "Assigned Zone"}</th>
                  <th className="p-3">{isAmharic ? "ዕለታዊ ስራ ሁኔታ" : "Today attendance"}</th>
                  <th className="p-3">{isAmharic ? "የባዮሜትሪክ ሁኔታ" : "Biometric Status"}</th>
                  <th className="p-3">{isAmharic ? "የአፈጻጸም ውጤት" : "Performance Grade"}</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredDirectoryWorkers.length > 0 ? (
                  filteredDirectoryWorkers.map(w => {
                    const attToday = getWorkerTodayStatus(w.id);
                    const avgPerf = getWorkerAverageScore(w.id);
                    
                    let gradeLevel = "Good";
                    let gradeColor = "text-yellow-600 bg-yellow-50 border-yellow-200";
                    if (avgPerf >= 95) {
                      gradeLevel = "Excellent";
                      gradeColor = "text-emerald-700 bg-emerald-50 border-emerald-200";
                    } else if (avgPerf >= 85) {
                      gradeLevel = "Very Good";
                      gradeColor = "text-sky-700 bg-sky-50 border-sky-200";
                    } else if (avgPerf >= 50) {
                      gradeLevel = "Average";
                      gradeColor = "text-slate-600 bg-slate-50 border-slate-200";
                    } else {
                      gradeLevel = "Poor";
                      gradeColor = "text-red-700 bg-red-50 border-red-200";
                    }

                    return (
                      <tr key={w.id} className="hover:bg-slate-50/50 transition-colors">
                        {/* Photo */}
                        <td className="p-3">
                          <img 
                            src={w.photo || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop"} 
                            alt={w.name}
                            referrerPolicy="no-referrer"
                            className="w-10 h-10 rounded-full border border-slate-200 object-cover" 
                          />
                        </td>

                        {/* ID and Name */}
                        <td className="p-3 font-semibold text-slate-800">
                          <div className="text-sm font-bold text-slate-900">{w.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono tracking-wider">{w.id}</div>
                        </td>

                        {/* Trade & Position */}
                        <td className="p-3">
                          <div className="font-semibold text-slate-700">{w.trade}</div>
                          <div className="text-[10px] text-slate-500">{w.position || "Field Specialist"}</div>
                        </td>

                        {/* Company & Department */}
                        <td className="p-3 text-slate-600">
                          <div>{w.company}</div>
                          <div className="text-[10px] text-slate-400">{w.department}</div>
                        </td>

                        {/* Assigned Location */}
                        <td className="p-3 text-slate-600">
                          <div className="font-semibold">{w.assignedProject || "Digital Bole Heights"}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            FL {w.floor || 4} - {w.zone || "Zone A"}
                          </div>
                        </td>

                        {/* Daily Attendance Status */}
                        <td className="p-3">
                          <div className="flex flex-col space-y-1">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold text-center w-24 border ${
                              attToday.status === "Present" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                              attToday.status === "Late" ? "bg-amber-50 text-amber-700 border-amber-200" :
                              attToday.status === "Absent" ? "bg-red-50 text-red-700 border-red-200" :
                              "bg-slate-100 text-slate-600 border-slate-200"
                            }`}>
                              {attToday.status}
                            </span>
                            {attToday.checkIn && (
                              <span className="text-[9px] text-slate-400 font-mono text-center">
                                {attToday.checkIn} - {attToday.checkOut || "Active"}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Biometric Status Column */}
                        <td className="p-3">
                          <div className="flex flex-col space-y-1 items-center">
                            {w.status === "Active" ? (
                              <span className="px-2 py-1 rounded-full text-[10px] font-bold text-center bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center space-x-1">
                                <ShieldCheck size={11} className="text-emerald-600 shrink-0" />
                                <span>{isAmharic ? "የተመዘገበ" : "Verified"}</span>
                              </span>
                            ) : (
                              <div className="flex flex-col items-center space-y-1">
                                <span className="px-2 py-1 rounded-full text-[10px] font-bold text-center bg-red-50 text-red-600 border border-red-200 animate-pulse flex items-center space-x-1">
                                  <AlertCircle size={11} className="text-red-500 shrink-0" />
                                  <span>{isAmharic ? "ያልተመዘገበ" : "Unenrolled"}</span>
                                </span>
                                {(currentUserRole === UserRole.TIME_KEEPER || currentUserRole === UserRole.HEAD_OFFICE) && (
                                  <button
                                    onClick={() => {
                                      setSelectedEnrollWorkerId(w.id);
                                      setActiveSubTab("biometric_enrollment");
                                    }}
                                    className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded text-[9px] font-bold shadow-xs hover:shadow-md cursor-pointer transition-all shrink-0"
                                  >
                                    {isAmharic ? "አሁን መዝግብ" : "Enroll Now"}
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Performance Score */}
                        <td className="p-3">
                          <div className="flex flex-col items-center">
                            <span className="font-mono text-xs font-bold text-slate-800">{avgPerf}%</span>
                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-black border uppercase mt-1 ${gradeColor}`}>
                              {gradeLevel}
                            </span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end space-x-1">
                            {/* QR code view mockup */}
                            <button 
                              title="View Employee QR Card"
                              onClick={() => {
                                alert(`Digital Construction ERP System Employee QR Identity Code:\n-------------------------------------\nID: ${w.id}\nName: ${w.name}\nTrade: ${w.trade}\nVerify Hash: ${w.qrCode || `QR-${w.id}`}`);
                              }}
                              className="p-1.5 bg-slate-100 text-slate-600 rounded hover:bg-slate-200"
                            >
                              <QrCode size={14} />
                            </button>

                            {(currentUserRole === UserRole.TIME_KEEPER || currentUserRole === UserRole.HEAD_OFFICE) && (
                              <button 
                                onClick={() => {
                                  if (confirm(isAmharic ? `ሰራተኛ ${w.name}ን መሰረዝ ይፈልጋሉ?` : `Are you sure you want to remove ${w.name} from the roster?`)) {
                                    onDeleteWorker(w.id);
                                  }
                                }}
                                className="p-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100"
                                title="Terminate Employee"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400 font-medium">
                      <AlertCircle className="mx-auto mb-2 text-slate-300" size={32} />
                      {isAmharic ? "ምንም ሰራተኛ አልተገኘም" : "No registered employees match selected filter criteria."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- SUB TAB 2: TIME KEEPER RECRUITMENT / REGISTRATION FORM --- */}
      {activeSubTab === "register" && (currentUserRole === UserRole.TIME_KEEPER || currentUserRole === UserRole.HEAD_OFFICE) && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <UserPlus className="text-red-600" size={18} />
              <span>{isAmharic ? "አዲስ የግንባታ ሰራተኛ ምዝገባ ፎርም" : "New Site Employee Registration Portal"}</span>
            </h3>
            <p className="text-xs text-slate-500">
              {isAmharic 
                ? "ብቻ የመገኘት ተቆጣጣሪው (Time Keeper) ሰራተኛ መመዝገብ ይችላል። ሁሉንም መስኮች በጥንቃቄ ይሙሉ"
                : "Recruitment form restricted to authorized Time Keepers only. System automatically secures biometrics & generates IDs."}
            </p>
          </div>

          <form onSubmit={handleRegisterSubmit} className="space-y-6 text-xs">
            
            {/* Visual Photo Selection Grid */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <span className="font-semibold text-slate-700 block">Select Profile Avatar Photo Placeholder</span>
              <div className="flex items-center space-x-4">
                <img 
                  src={regPhotoPlaceholder} 
                  alt="Selection preview"
                  referrerPolicy="no-referrer"
                  className="w-16 h-16 rounded-full border-2 border-slate-900 object-cover" 
                />
                <div className="grid grid-cols-5 gap-2">
                  {placeholderPhotos.map((ph, idx) => (
                    <button 
                      type="button" 
                      key={idx}
                      onClick={() => setRegPhotoPlaceholder(ph)}
                      className={`relative rounded-full border overflow-hidden ${regPhotoPlaceholder === ph ? 'ring-2 ring-red-600' : 'opacity-70'}`}
                    >
                      <img src={ph} alt="placeholder avatar" className="w-10 h-10 object-cover" referrerPolicy="no-referrer" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* General Information Section */}
            <div className="space-y-4">
              <h4 className="font-bold text-slate-800 border-b pb-1 text-[13px]">{isAmharic ? "1. የግል እና ማህበራዊ መረጃዎች" : "1. Personal Profile Details"}</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600">Full Name *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Enter full name"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-red-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-600">Phone Number *</label>
                  <input 
                    type="tel" 
                    required
                    placeholder="+251 9XX XX XX XX"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-red-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-600">National ID / Passport *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="NID-XXXX-XXXX"
                    value={regNationalId}
                    onChange={(e) => setRegNationalId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-red-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600">Gender *</label>
                  <select 
                    value={regGender}
                    onChange={(e) => setRegGender(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-600">Date of Birth *</label>
                  <input 
                    type="date" 
                    required
                    value={regDob}
                    onChange={(e) => setRegDob(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-600">Address *</label>
                  <input 
                    type="text" 
                    required
                    value={regAddress}
                    onChange={(e) => setRegAddress(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-600">Emergency Contact (Name/Phone) *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Father/Spouse: +251 9XX..."
                    value={regEmergency}
                    onChange={(e) => setRegEmergency(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Employment Details Section */}
            <div className="space-y-4">
              <h4 className="font-bold text-slate-800 border-b pb-1 text-[13px]">{isAmharic ? "2. የቅጥር እና የስራ ምደባ መረጃዎች" : "2. Deployment & Assignment Settings"}</h4>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600">Company *</label>
                  <select 
                    value={regCompany}
                    onChange={(e) => setRegCompany(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none"
                  >
                    <option value="Digital Construction ERP">Digital Construction ERP System Construction</option>
                    <option value="Subcontractor Alpha">Subcontractor Alpha</option>
                    <option value="Subcontractor Beta">Subcontractor Beta</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-600">Department *</label>
                  <select 
                    value={regDept}
                    onChange={(e) => setRegDept(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none"
                  >
                    <option value="Formwork Assembly">Formwork Assembly (T-01)</option>
                    <option value="Formwork Stripping">Formwork Stripping (T-02)</option>
                    <option value="Steel Fixing">Steel Fixing (T-03)</option>
                    <option value="Concrete Casting">Concrete Casting (T-04)</option>
                    <option value="Safety & Support">Safety & Rigging (T-05)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-600">Trade / Specialty *</label>
                  <select 
                    value={regTrade}
                    onChange={(e) => setRegTrade(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none"
                  >
                    <option value="Carpenter">Carpenter (Formwork)</option>
                    <option value="Stripper">Stripper (Demolition)</option>
                    <option value="Steel Fixer">Steel Fixer</option>
                    <option value="Concrete Worker">Concrete Placer</option>
                    <option value="Rigger">Scaffolding Rigger</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-600">Position Level *</label>
                  <select 
                    value={regPosition}
                    onChange={(e) => setRegPosition(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none"
                  >
                    <option value="Skilled Laborer">Skilled Laborer</option>
                    <option value="Lead Carpenter">Lead Carpenter</option>
                    <option value="Helper">Helper / Assistant</option>
                    <option value="Foreman">Crew Foreman</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600">Employment Type *</label>
                  <select 
                    value={regEmploymentType}
                    onChange={(e) => setRegEmploymentType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none"
                  >
                    <option value="Daily Labourer">Daily Labourer (ቆጠራ ሂሳብ)</option>
                    <option value="Contract">Fixed Term Contract</option>
                    <option value="Permanent">Digital Construction ERP Permanent Staff</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-600">Employment Join Date *</label>
                  <input 
                    type="date" 
                    value={regJoinDate}
                    onChange={(e) => setRegJoinDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-600">Assigned Construction Project *</label>
                  <select 
                    value={regProject}
                    onChange={(e) => setRegProject(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none"
                  >
                    <option value="Digital Bole Heights">Digital Bole Heights Project</option>
                    <option value="Digital Saris Block B">Digital Saris Block B Project</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Spatial & Reporting Hierarchy Mapping */}
            <div className="space-y-4">
              <h4 className="font-bold text-slate-800 border-b pb-1 text-[13px]">{isAmharic ? "3. የሳይት ዞን እና የስራ ተዋረድ" : "3. Spatial Roster & Reporting Hierarchy"}</h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600">Building Block / Tower *</label>
                  <select 
                    value={regBuilding}
                    onChange={(e) => setRegBuilding(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none"
                  >
                    <option value="Tower 1">Bole heights Tower 1</option>
                    <option value="Tower 2">Bole heights Tower 2</option>
                    <option value="Block A">Saris Block A</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-600">Floor Assignment *</label>
                  <input 
                    type="number" 
                    min={1} 
                    max={20}
                    value={regFloor}
                    onChange={(e) => setRegFloor(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-600">Zone Assignment *</label>
                  <select 
                    value={regZone}
                    onChange={(e) => setRegZone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none"
                  >
                    <option value="Zone A">Zone A (Wall casting area)</option>
                    <option value="Zone B">Zone B (Support beams area)</option>
                    <option value="Zone C">Zone C (Slabs panel area)</option>
                  </select>
                </div>
              </div>

              {/* Reporting Hierarchy Locks */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-500">Assigned Team Leader (Supervising)</label>
                  <input 
                    type="text" 
                    readOnly
                    value={regTeamLeader}
                    className="w-full bg-slate-100 border border-slate-200 rounded-lg p-2 font-bold text-slate-700" 
                  />
                  <span className="text-[10px] text-slate-400 block">Reports directly to Time Keeper / PM</span>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-500">Assigned Gang Chief (Crew Foreman)</label>
                  <input 
                    type="text" 
                    readOnly
                    value={regGangChief}
                    className="w-full bg-slate-100 border border-slate-200 rounded-lg p-2 font-bold text-slate-700" 
                  />
                  <span className="text-[10px] text-slate-400 block">Reports to Team Leader</span>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-500">Assigned Supervisor (Auditor)</label>
                  <input 
                    type="text" 
                    readOnly
                    value={regSupervisor}
                    className="w-full bg-slate-100 border border-slate-200 rounded-lg p-2 font-bold text-slate-700" 
                  />
                  <span className="text-[10px] text-slate-400 block">Authorized quality & safety certifier</span>
                </div>
              </div>
            </div>

            {/* Simulated Biometric Enrollment status */}
            <div className="bg-red-50/50 p-4 rounded-xl border border-red-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="font-bold text-red-800 text-[11px] block uppercase">🔒 Biometric Security Initialization Locks</span>
                <p className="text-[10px] text-slate-600">
                  By submitting, the system generates secure QR Codes, encrypted biometric Face templates, and records active status.
                </p>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <label className="font-semibold text-slate-600">Simulate Fingerprint Scan Enrolled:</label>
                <input 
                  type="checkbox" 
                  checked={fingerprintEnrolled}
                  onChange={(e) => setFingerprintEnrolled(e.target.checked)}
                  className="w-4 h-4 text-red-600" 
                />
              </div>
            </div>

            {/* Submission Buttons */}
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setActiveSubTab("directory")}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs"
              >
                Cancel / Return
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs shadow-md transition-colors"
              >
                {isAmharic ? "አስቀምጥና አውቶማቲክ አጋራ" : "Save & Synchronize Employee"}
              </button>
            </div>

          </form>
        </div>
      )}

      {/* --- SUB TAB 3: DAILY ATTENDANCE TABLE WITH EDIT/APPROVE --- */}
      {activeSubTab === "attendance_table" && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-black text-slate-900 tracking-tight">{isAmharic ? "የሰራተኞች እለታዊ የመገኘት መቆጣጠሪያ ሰንጠረዥ" : "Digital Construction ERP Enterprise Daily Attendance Ledger"}</h3>
              <p className="text-xs text-slate-500">
                {isAmharic 
                  ? "የመገኘት ተቆጣጣሪው (Time Keeper) የሰራተኞችን ሰዓት፣ የተግባር ደረጃ እና የስራ ውጤት ማረጋገጥ ይችላል።"
                  : "Track check-in/out times, logged hours, overtime, performance scores, and daily panel tasks across all active roles."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button 
                onClick={handleExportCSV}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-all flex items-center space-x-1 cursor-pointer"
              >
                <Download size={13} className="text-slate-500" />
                <span>CSV</span>
              </button>
              <button 
                onClick={handleExportExcel}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-lg transition-all flex items-center space-x-1 cursor-pointer border border-emerald-200"
              >
                <FileSpreadsheet size={13} className="text-emerald-600" />
                <span>Excel Spreadsheet</span>
              </button>
              <button 
                onClick={() => setShowPrintPreview(true)}
                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-lg transition-all flex items-center space-x-1 cursor-pointer border border-red-200"
              >
                <Printer size={13} className="text-red-600" />
                <span>PDF Report / Print</span>
              </button>
            </div>
          </div>

          {/* Expanded Table Filters */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs font-semibold">
            {/* Search */}
            <div className="relative col-span-2">
              <span className="absolute left-2.5 top-2.5 text-slate-400">
                <Search size={13} />
              </span>
              <input 
                type="text" 
                placeholder={isAmharic ? "በስም ወይም በመለያ ይፈልጉ..." : "Search name, ID..."}
                value={attSearchQuery}
                onChange={(e) => setAttSearchQuery(e.target.value)}
                className="w-full bg-white text-[11px] font-normal border border-slate-200 rounded-lg pl-8 pr-2 py-1.5 outline-none focus:border-red-600"
              />
            </div>

            {/* Status */}
            <div>
              <span className="text-[9px] text-slate-400 block uppercase mb-0.5">{isAmharic ? "ሁኔታ" : "Status"}</span>
              <select 
                value={attFilterStatus}
                onChange={(e) => setAttFilterStatus(e.target.value)}
                className="w-full bg-white text-[11px] border border-slate-200 rounded-lg p-1 outline-none"
              >
                <option value="All">All Statuses</option>
                <option value="Present">Present</option>
                <option value="Late">Late</option>
                <option value="Absent">Absent</option>
                <option value="Leave">Leave</option>
              </select>
            </div>

            {/* Zone */}
            <div>
              <span className="text-[9px] text-slate-400 block uppercase mb-0.5">{isAmharic ? "ዞን" : "Zone"}</span>
              <select 
                value={attFilterZone}
                onChange={(e) => setAttFilterZone(e.target.value)}
                className="w-full bg-white text-[11px] border border-slate-200 rounded-lg p-1 outline-none"
              >
                <option value="All">All Zones</option>
                <option value="Zone A">Zone A</option>
                <option value="Zone B">Zone B</option>
                <option value="Zone C">Zone C</option>
              </select>
            </div>

            {/* Project */}
            <div>
              <span className="text-[9px] text-slate-400 block uppercase mb-0.5">{isAmharic ? "ፕሮጀክት" : "Project"}</span>
              <select 
                value={attFilterProject}
                onChange={(e) => setAttFilterProject(e.target.value)}
                className="w-full bg-white text-[11px] border border-slate-200 rounded-lg p-1 outline-none"
              >
                <option value="All">All Projects</option>
                <option value="Digital Bole Heights">Bole Heights</option>
                <option value="Digital Saris Block B">Saris Block B</option>
              </select>
            </div>

            {/* Floor */}
            <div>
              <span className="text-[9px] text-slate-400 block uppercase mb-0.5">{isAmharic ? "ፎቅ" : "Floor"}</span>
              <select 
                value={attFilterFloor}
                onChange={(e) => setAttFilterFloor(e.target.value)}
                className="w-full bg-white text-[11px] border border-slate-200 rounded-lg p-1 outline-none"
              >
                <option value="All">All Floors</option>
                <option value="1">Floor 1</option>
                <option value="2">Floor 2</option>
                <option value="3">Floor 3</option>
                <option value="4">Floor 4</option>
                <option value="5">Floor 5</option>
              </select>
            </div>

            {/* Team */}
            <div>
              <span className="text-[9px] text-slate-400 block uppercase mb-0.5">{isAmharic ? "ቡድን" : "Team"}</span>
              <select 
                value={attFilterTeam}
                onChange={(e) => setAttFilterTeam(e.target.value)}
                className="w-full bg-white text-[11px] border border-slate-200 rounded-lg p-1 outline-none"
              >
                <option value="All">All Teams</option>
                <option value="T-01">Team Alpha</option>
                <option value="T-02">Team Beta</option>
                <option value="T-03">Team Gamma</option>
              </select>
            </div>

            {/* Trade */}
            <div>
              <span className="text-[9px] text-slate-400 block uppercase mb-0.5">{isAmharic ? "ሙያ" : "Trade"}</span>
              <select 
                value={attFilterTrade}
                onChange={(e) => setAttFilterTrade(e.target.value)}
                className="w-full bg-white text-[11px] border border-slate-200 rounded-lg p-1 outline-none"
              >
                <option value="All">All Trades</option>
                <option value="Carpenter">Carpenter</option>
                <option value="Stripper">Stripper</option>
                <option value="Steel Fixer">Steel Fixer</option>
                <option value="Concrete Worker">Concrete Worker</option>
                <option value="Rigger">Rigger</option>
              </select>
            </div>

            {/* Sorting Key */}
            <div>
              <span className="text-[9px] text-red-500 font-extrabold block uppercase mb-0.5">{isAmharic ? "ቅደም ተከተል" : "Sort By"}</span>
              <select 
                value={attSortKey}
                onChange={(e) => setAttSortKey(e.target.value)}
                className="w-full bg-slate-900 text-white font-bold text-[11px] border border-slate-700 rounded-lg p-1 outline-none"
              >
                <option value="none">Default (None)</option>
                <option value="attendance">Sort: Attendance</option>
                <option value="performance">Sort: Performance</option>
                <option value="overtime">Sort: Overtime</option>
              </select>
            </div>
          </div>

          {/* Inline Edit Panel if Active */}
          {editingRecordId && (
            <div className="bg-slate-900 text-white p-4 rounded-xl space-y-3 text-xs border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="font-bold text-red-500 uppercase tracking-wider">✏️ Edit Attendance Record (Time Keeper Panel)</span>
                <button onClick={() => setEditingRecordId(null)} className="text-slate-400 hover:text-white">
                  <X size={16} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-slate-800">
                <div className="space-y-1">
                  <label className="text-white">Check-In Time *</label>
                  <input type="text" value={editCheckIn} onChange={e => setEditCheckIn(e.target.value)} placeholder="08:00:00" className="w-full bg-white p-2 rounded" />
                </div>
                <div className="space-y-1">
                  <label className="text-white">Check-Out Time</label>
                  <input type="text" value={editCheckOut} onChange={e => setEditCheckOut(e.target.value)} placeholder="17:00:00" className="w-full bg-white p-2 rounded" />
                </div>
                <div className="space-y-1">
                  <label className="text-white">Attendance Status *</label>
                  <select value={editStatus} onChange={e => setEditStatus(e.target.value as any)} className="w-full bg-white p-2 rounded">
                    <option value="Present">Present</option>
                    <option value="Late">Late</option>
                    <option value="Absent">Absent</option>
                    <option value="Leave">Leave</option>
                  </select>
                </div>
                <div className="space-y-1 flex items-end">
                  <button onClick={handleEditRecordSave} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold p-2 rounded">
                    Save Modifications
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Attendance Logs Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 text-[10px] font-bold uppercase tracking-wider border-b border-slate-100 whitespace-nowrap">
                  <th className="p-3">Photo</th>
                  <th className="p-3">Employee ID</th>
                  <th className="p-3">Name</th>
                  <th className="p-3">Trade</th>
                  <th className="p-3">Team</th>
                  <th className="p-3">Gang / Foreman</th>
                  <th className="p-3">Level / Zone</th>
                  <th className="p-3">Check-In</th>
                  <th className="p-3">Check-Out</th>
                  <th className="p-3">Working Hours</th>
                  <th className="p-3">Overtime</th>
                  <th className="p-3">Attendance Status</th>
                  <th className="p-3">Performance Score</th>
                  <th className="p-3">Daily Task Status</th>
                  <th className="p-3">Remarks</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredAttendance.length > 0 ? (
                  filteredAttendance.map(a => {
                    const w = workers.find(work => work.id === a.workerId);
                    const avgScore = getWorkerAverageScore(a.workerId);
                    
                    // Task status simulation based on trade
                    let dailyTask = "Formwork Checklist - Pending";
                    let taskBadgeColor = "bg-slate-100 text-slate-700 border-slate-200";
                    
                    if (a.status === "Present" || a.status === "Late") {
                      if (a.trade === "Carpenter") {
                        dailyTask = "Formwork Assembly - Completed";
                        taskBadgeColor = "bg-emerald-50 text-emerald-800 border-emerald-100";
                      } else if (a.trade === "Stripper") {
                        dailyTask = "Panel Stripping - In Progress";
                        taskBadgeColor = "bg-blue-50 text-blue-800 border-blue-100";
                      } else if (a.trade === "Steel Fixer") {
                        dailyTask = "Rebar Alignment - Approved";
                        taskBadgeColor = "bg-purple-50 text-purple-800 border-purple-100";
                      } else {
                        dailyTask = "Concrete Pouring - Completed";
                        taskBadgeColor = "bg-teal-50 text-teal-800 border-teal-100";
                      }
                    } else if (a.status === "Leave") {
                      dailyTask = "Assigned Off-duty (On Leave)";
                      taskBadgeColor = "bg-amber-50 text-amber-800 border-amber-100";
                    } else {
                      dailyTask = "No Task - Absent";
                      taskBadgeColor = "bg-red-50 text-red-800 border-red-100";
                    }

                    return (
                      <tr key={a.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3 shrink-0">
                          <img 
                            src={w?.photo || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&auto=format&fit=crop&q=60"} 
                            alt={a.workerName} 
                            referrerPolicy="no-referrer"
                            className="w-8 h-8 rounded-full border border-slate-200 object-cover"
                          />
                        </td>
                        <td className="p-3 font-mono text-slate-500 font-bold">{a.workerId}</td>
                        <td className="p-3 font-bold text-slate-900">{a.workerName}</td>
                        <td className="p-3 text-slate-600 font-medium">
                          <span className="px-2 py-0.5 bg-slate-100 rounded-sm text-[10px]">
                            {w?.trade || a.trade}
                          </span>
                        </td>
                        <td className="p-3 text-slate-500 font-semibold">{w?.teamId || "Team Alpha"}</td>
                        <td className="p-3 text-slate-500 font-medium">{w?.gangChief || "Fikru Tolossa"}</td>
                        <td className="p-3 text-slate-700 font-semibold">FL {a.floor} - {a.zone}</td>
                        <td className="p-3 font-mono text-slate-700">{a.checkIn || "–"}</td>
                        <td className="p-3 font-mono text-slate-700">{a.checkOut || "–"}</td>
                        <td className="p-3 font-black text-slate-800">{a.workingHours > 0 ? `${a.workingHours} hrs` : "–"}</td>
                        <td className="p-3">
                          {a.overtime > 0 ? (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded text-[10px] font-bold">
                              +{a.overtime} hrs
                            </span>
                          ) : "–"}
                        </td>
                        <td className="p-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                            a.status === "Present" ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                            a.status === "Late" ? "bg-amber-50 text-amber-700 border-amber-100 animate-pulse" :
                            a.status === "Absent" ? "bg-red-50 text-red-700 border-red-100" :
                            "bg-slate-100 text-slate-600 border-slate-200"
                          }`}>
                            {a.status}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center space-x-1">
                            <span className={`text-xs font-bold font-mono px-1.5 py-0.5 rounded ${
                              avgScore >= 90 ? "bg-emerald-50 text-emerald-700 font-black" :
                              avgScore >= 80 ? "bg-blue-50 text-blue-700 font-extrabold" :
                              "bg-slate-50 text-slate-700"
                            }`}>
                              {avgScore}%
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {avgScore >= 95 ? "Excellent" : avgScore >= 85 ? "Very Good" : avgScore >= 70 ? "Good" : "Average"}
                            </span>
                          </div>
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${taskBadgeColor}`}>
                            {dailyTask}
                          </span>
                        </td>
                        <td className="p-3 font-sans italic text-slate-500 max-w-xs truncate" title={(a as any).remarks || "Logged via mobile sync"}>
                          {(a as any).remarks || "Secure mobile verification"}
                        </td>
                        <td className="p-3 text-right">
                          {(currentUserRole === UserRole.TIME_KEEPER || currentUserRole === UserRole.HEAD_OFFICE) && (
                            <button 
                              onClick={() => handleEditRecordStart(a)}
                              className="p-1 text-red-600 hover:text-red-800 flex items-center space-x-0.5 ml-auto cursor-pointer font-bold border border-red-200 rounded px-1.5 bg-red-50/50"
                            >
                              <Edit size={11} />
                              <span className="text-[10px]">Edit</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={16} className="p-12 text-center text-slate-400 font-medium">
                      <AlertCircle className="mx-auto mb-2 text-slate-300 animate-bounce" size={40} />
                      {isAmharic ? "ምንም ዓይነት የመገኘት መዝገብ በፍለጋው አልተገኘም።" : "No employee logs match the active parameters."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Interactive PDF Print Preview Overlay Modal */}
          {showPrintPreview && (
            <div className="fixed inset-0 bg-slate-900/85 flex items-center justify-center p-4 z-50 overflow-y-auto no-print">
              <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-5xl w-full p-8 space-y-6 relative flex flex-col max-h-[90vh]">
                
                {/* Modal Header */}
                <div className="flex justify-between items-center border-b border-slate-200 pb-4">
                  <div className="flex items-center space-x-2">
                    <Printer size={20} className="text-red-600 animate-pulse" />
                    <div>
                      <h4 className="font-black text-slate-900 text-lg">Digital Construction ERP Production PDF Report Generator</h4>
                      <p className="text-xs text-slate-500">Fully structured official summary page optimized for physical printer or local digital PDF export.</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowPrintPreview(false)}
                    className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-950 cursor-pointer"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Printable Document Area */}
                <div id="digital_construction_erp-printable-ledger" className="bg-white p-6 border border-slate-300 rounded-xl overflow-y-auto flex-grow text-slate-800 font-sans">
                  
                  {/* Digital Construction ERP Official Header */}
                  <div className="text-center space-y-1 pb-4 border-b-2 border-slate-800">
                    <h2 className="text-xl font-black uppercase tracking-widest text-slate-900">DIGITAL CONSTRUCTION ERP SYSTEM</h2>
                    <p className="text-xs font-bold tracking-wider text-slate-600">Bole Heights Aluminum Formwork Production Command Center</p>
                    <p className="text-[10px] font-mono text-slate-400">Date: {new Date().toLocaleDateString()} | Local Sync Node: Bole Heights B1</p>
                  </div>

                  <div className="flex justify-between items-center my-4">
                    <div>
                      <span className="text-[9px] uppercase tracking-wider block font-bold text-slate-400">Report Type</span>
                      <span className="text-xs font-black text-slate-800 uppercase">Daily Active Labor Attendance Sheets</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] uppercase tracking-wider block font-bold text-slate-400">Generated By</span>
                      <span className="text-xs font-black text-slate-800 uppercase">Time Keeper / Head Office Node</span>
                    </div>
                  </div>

                  {/* PDF Document Table */}
                  <table className="w-full text-left border-collapse text-[10px]">
                    <thead>
                      <tr className="bg-slate-100 border-b-2 border-slate-800 font-bold text-slate-700 uppercase">
                        <th className="p-2">ID</th>
                        <th className="p-2">Name</th>
                        <th className="p-2">Trade</th>
                        <th className="p-2">Team</th>
                        <th className="p-2">Level/Zone</th>
                        <th className="p-2">In</th>
                        <th className="p-2">Out</th>
                        <th className="p-2">Hours</th>
                        <th className="p-2">OT</th>
                        <th className="p-2">Status</th>
                        <th className="p-2">Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredAttendance.map(a => {
                        const w = workers.find(work => work.id === a.workerId);
                        const avgScore = getWorkerAverageScore(a.workerId);
                        return (
                          <tr key={a.id} className="hover:bg-slate-50">
                            <td className="p-2 font-mono font-bold">{a.workerId}</td>
                            <td className="p-2 font-semibold">{a.workerName}</td>
                            <td className="p-2">{w?.trade || a.trade}</td>
                            <td className="p-2">{w?.teamId || "Team Alpha"}</td>
                            <td className="p-2">FL {a.floor} - {a.zone}</td>
                            <td className="p-2 font-mono">{a.checkIn || "–"}</td>
                            <td className="p-2 font-mono">{a.checkOut || "–"}</td>
                            <td className="p-2 font-bold">{a.workingHours}</td>
                            <td className="p-2 font-semibold">{a.overtime}</td>
                            <td className="p-2 font-bold">{a.status}</td>
                            <td className="p-2 font-mono font-bold">{avgScore}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* Signatures Panel */}
                  <div className="grid grid-cols-3 gap-6 pt-12 mt-12 border-t-2 border-slate-800 text-[10px]">
                    <div className="text-center space-y-4">
                      <div className="border-b border-slate-400 h-8"></div>
                      <span className="font-bold text-slate-500 uppercase block">Time Keeper Signature</span>
                    </div>
                    <div className="text-center space-y-4">
                      <div className="border-b border-slate-400 h-8"></div>
                      <span className="font-bold text-slate-500 uppercase block">Gang Chief / Foreman Seal</span>
                    </div>
                    <div className="text-center space-y-4">
                      <div className="border-b border-slate-400 h-8"></div>
                      <span className="font-bold text-slate-500 uppercase block">Project Engineer Approval</span>
                    </div>
                  </div>

                </div>

                {/* Print Control Buttons */}
                <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-200">
                  <button 
                    onClick={() => setShowPrintPreview(false)}
                    className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
                  >
                    Close Preview
                  </button>
                  <button 
                    onClick={() => {
                      window.print();
                    }}
                    className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-xl text-xs flex items-center space-x-1 cursor-pointer"
                  >
                    <Printer size={13} />
                    <span>Print PDF Document</span>
                  </button>
                </div>

              </div>
            </div>
          )}

        </div>
      )}

      {/* --- SUB TAB 4: DAILY PERFORMANCE EVALUATION TABLE --- */}
      {activeSubTab === "performance_table" && (
        <div className="space-y-6">
          
          {/* New Evaluation input card (For Leaders/Foremen/HO) */}
          {(currentUserRole !== UserRole.WORKER) && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center space-x-1.5">
                  <Star className="text-yellow-500" size={18} />
                  <span>Submit Daily Worker Performance Scorecard</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Select a worker from your active synchronized roster, input weighted indicators, and save.
                </p>
              </div>

              {evalSuccessMsg && (
                <div className="bg-emerald-50 text-emerald-800 p-3 rounded-xl border border-emerald-200 text-xs font-bold flex items-center space-x-2">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <span>{evalSuccessMsg}</span>
                </div>
              )}

              <form onSubmit={handlePerformanceSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs pt-2">
                {/* Select worker */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600">Select Worker *</label>
                  <select 
                    value={evalWorkerId} 
                    onChange={e => setEvalWorkerId(e.target.value)}
                    required
                    className="w-full bg-slate-50 border p-2 rounded"
                  >
                    <option value="">-- Choose Worker --</option>
                    {sharedWorkers.map(w => (
                      <option key={w.id} value={w.id}>{w.name} ({w.id})</option>
                    ))}
                  </select>
                </div>

                {/* Score Indicators */}
                <div className="space-y-2 col-span-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="font-bold text-slate-700 block mb-1">
                    {isAmharic ? "አፈጻጸም መመዘኛ አመልካቾች (ድምር 100%)" : "Indicators (Max 100% total)"}
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-500">{isAmharic ? "ዲስፕሊን" : "Discipline"} (20%)</label>
                      <input type="number" min={0} max={20} value={pDiscipline} onChange={e => setPDiscipline(Number(e.target.value))} className="w-full bg-white p-1 rounded border font-mono" />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500">{isAmharic ? "ጥራት" : "Quality"} (20%)</label>
                      <input type="number" min={0} max={20} value={pQuality} onChange={e => setPQuality(Number(e.target.value))} className="w-full bg-white p-1 rounded border font-mono" />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500">{isAmharic ? "ምርታማነት" : "Productivity"} (20%)</label>
                      <input type="number" min={0} max={20} value={pProductivity} onChange={e => setPProductivity(Number(e.target.value))} className="w-full bg-white p-1 rounded border font-mono" />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500">{isAmharic ? "ደህንነት" : "Safety"} (15%)</label>
                      <input type="number" min={0} max={15} value={pSafety} onChange={e => setPSafety(Number(e.target.value))} className="w-full bg-white p-1 rounded border font-mono" />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500">{isAmharic ? "የእቃ አያያዝ" : "Tool/Material Handling"} (10%)</label>
                      <input type="number" min={0} max={10} value={pEquipmentHandling} onChange={e => setPEquipmentHandling(Number(e.target.value))} className="w-full bg-white p-1 rounded border font-mono" />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500">{isAmharic ? "የቡድን ስራ" : "Teamwork"} (10%)</label>
                      <input type="number" min={0} max={10} value={pTeamwork} onChange={e => setPTeamwork(Number(e.target.value))} className="w-full bg-white p-1 rounded border font-mono" />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500">{isAmharic ? "መገኘት" : "Attendance"} (5%)</label>
                      <input type="number" min={0} max={5} value={pAttendance} onChange={e => setPAttendance(Number(e.target.value))} className="w-full bg-white p-1 rounded border font-mono" />
                    </div>
                  </div>
                  <div className="text-right text-[10px] font-bold text-red-600 mt-2">
                    {isAmharic ? "የተሰላ አጠቃላይ ውጤት:" : "Total Calculated:"} {pDiscipline + pQuality + pProductivity + pSafety + pEquipmentHandling + pTeamwork + pAttendance} / 100
                  </div>
                </div>

                {/* Comment & Submit */}
                <div className="space-y-2 flex flex-col justify-between">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-600">Review Comments</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Excellent lock speed" 
                      value={evalComment} 
                      onChange={e => setEvalComment(e.target.value)}
                      className="w-full bg-slate-50 border p-2 rounded" 
                    />
                  </div>
                  <button type="submit" className="w-full py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded shadow-sm">
                    Submit Scorecard
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Evaluations ledger list */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">{isAmharic ? "የሰራተኞች የውጤት መግለጫ መዝገብ" : "Daily Active Performance Evaluations"}</h3>
                <p className="text-xs text-slate-500">
                  {isAmharic 
                    ? "የአሉሚኒየም ፎርምወርክ ስራዎችን እና ሰራተኞችን የመገምገሚያ ሰሌዳ"
                    : "Grades list: Excellent (95-100), Very Good (85-94), Good (70-84), Average (50-69), Poor (<50)."}
                </p>
              </div>

              {/* Performance Table Filters */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <input 
                  type="text" 
                  placeholder="Search name, ID..."
                  value={perfSearchQuery}
                  onChange={(e) => setPerfSearchQuery(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 outline-none"
                />
                <select 
                  value={perfFilterGrade} 
                  onChange={e => setPerfFilterGrade(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded p-1.5 outline-none"
                >
                  <option value="All">All Grades</option>
                  <option value="Excellent">Excellent</option>
                  <option value="Very Good">Very Good</option>
                  <option value="Good">Good</option>
                  <option value="Average">Average</option>
                  <option value="Poor">Poor</option>
                </select>
              </div>
            </div>

            {/* Evaluations Ledger Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-100 text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-100">
                    <th className="p-3">Worker ID</th>
                    <th className="p-3">Name</th>
                    <th className="p-3">Date</th>
                    <th className="p-3 text-center">Disc (20)</th>
                    <th className="p-3 text-center">Qual (20)</th>
                    <th className="p-3 text-center">Prod (20)</th>
                    <th className="p-3 text-center">Safe (15)</th>
                    <th className="p-3 text-center">Tool/Handling (10)</th>
                    <th className="p-3 text-center">Team (10)</th>
                    <th className="p-3 text-center">Att (5)</th>
                    <th className="p-3 text-center">Total (100)</th>
                    <th className="p-3 text-center">Grade</th>
                    <th className="p-3">Evaluator Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEvaluations.length > 0 ? (
                    filteredEvaluations.map(e => {
                      let gradeStyle = "bg-amber-50 text-amber-700 border-amber-200";
                      if (e.level === "Excellent") gradeStyle = "bg-emerald-50 text-emerald-700 border-emerald-200";
                      else if (e.level === "Very Good") gradeStyle = "bg-sky-50 text-sky-700 border-sky-200";
                      else if (e.level === "Poor") gradeStyle = "bg-red-50 text-red-700 border-red-200";

                      return (
                        <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-mono text-slate-500 font-bold">{e.workerId}</td>
                          <td className="p-3 font-bold text-slate-900">{e.workerName}</td>
                          <td className="p-3 text-slate-400 font-mono text-[10px]">{e.date}</td>
                          <td className="p-3 text-center font-mono text-slate-600">{e.discipline}</td>
                          <td className="p-3 text-center font-mono text-slate-600">{e.quality}</td>
                          <td className="p-3 text-center font-mono text-slate-600">{e.productivity}</td>
                          <td className="p-3 text-center font-mono text-slate-600">{e.safetyCompliance}</td>
                          <td className="p-3 text-center font-mono text-slate-600">{e.equipmentHandling || 10}</td>
                          <td className="p-3 text-center font-mono text-slate-600">{e.teamwork}</td>
                          <td className="p-3 text-center font-mono text-slate-600">{e.attendance}</td>
                          <td className="p-3 text-center font-mono font-black text-slate-800 text-sm">{e.totalScore}</td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase ${gradeStyle}`}>
                              {e.level}
                            </span>
                          </td>
                          <td className="p-3 text-slate-600">
                            <div className="font-medium italic">"{e.comment || 'Performance approved.'}"</div>
                            <span className="text-[9px] text-slate-400 block font-mono">By: {e.evaluatedBy}</span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={12} className="p-8 text-center text-slate-400 font-medium">
                        <AlertCircle className="mx-auto mb-2 text-slate-300" size={32} />
                        No daily evaluations matching filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* --- SUB TAB 5: BIOMETRIC TAP SIMULATOR (Active Cameras / Scanners) --- */}
      {activeSubTab === "clock_in" && (
        <div className="space-y-6">
          
          {/* Policy Overview Panel & Toggle */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-slate-900 text-white rounded-lg">
                <Clock size={16} />
              </div>
              <div>
                <h4 className="font-bold text-slate-800">
                  {isAmharic ? "ወቅታዊ የመገኘት እና የጂፒኤስ ፖሊሲ ደንቦች" : "Current Shift & Geofence Verification Policies"}
                </h4>
                <p className="text-[11px] text-slate-500">
                  {isAmharic 
                    ? `መደበኛ ፈረቃ፡ ${shiftStart} - ${shiftEnd} | የትርፍ ሰዓት መነሻ፡ >${overtimeThreshold} ሰዓታት | ራዲየስ፡ ${allowedRadius}ሜ` 
                    : `Shift: ${shiftStart}-${shiftEnd} | Grace: ${gracePeriod}m | Break: ${breakDuration}h | Radius: ${allowedRadius}m | OT Threshold: ${overtimeThreshold}h`}
                </p>
              </div>
            </div>
            
            <button
              onClick={() => setShowConfigPanel(!showConfigPanel)}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold rounded-lg transition-all flex items-center space-x-1 cursor-pointer"
            >
              <Filter size={12} />
              <span>{showConfigPanel ? (isAmharic ? "ፖሊሲ ዝጋ" : "Close Policy Desk") : (isAmharic ? "የፖሊሲ ማስተካከያ" : "Configure Shift Policies")}</span>
            </button>
          </div>

          {/* Config Policy Panel Slide-Down */}
          {showConfigPanel && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4 animate-fadeIn text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Shift Starts (HH:MM)</label>
                <input 
                  type="text" 
                  value={shiftStart} 
                  onChange={e => setShiftStart(e.target.value)} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono" 
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Shift Ends (HH:MM)</label>
                <input 
                  type="text" 
                  value={shiftEnd} 
                  onChange={e => setShiftEnd(e.target.value)} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono" 
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Unpaid Break (Hours)</label>
                <input 
                  type="number" 
                  step="0.5"
                  value={breakDuration} 
                  onChange={e => setBreakDuration(parseFloat(e.target.value) || 0)} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono" 
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Grace Period (Minutes)</label>
                <input 
                  type="number" 
                  value={gracePeriod} 
                  onChange={e => setGracePeriod(parseInt(e.target.value) || 0)} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono" 
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Geofence Lat (Bole Heights)</label>
                <input 
                  type="number" 
                  step="0.0001"
                  value={geofenceLat} 
                  onChange={e => setGeofenceLat(parseFloat(e.target.value) || 0)} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono" 
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Geofence Lng (Bole Heights)</label>
                <input 
                  type="number" 
                  step="0.0001"
                  value={geofenceLng} 
                  onChange={e => setGeofenceLng(parseFloat(e.target.value) || 0)} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono" 
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Allowed Radius (Meters)</label>
                <input 
                  type="number" 
                  value={allowedRadius} 
                  onChange={e => setAllowedRadius(parseInt(e.target.value) || 0)} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono" 
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-700">OT Alert Threshold (Hours)</label>
                <input 
                  type="number" 
                  step="0.5"
                  value={overtimeThreshold} 
                  onChange={e => setOvertimeThreshold(parseFloat(e.target.value) || 0)} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono" 
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column: Controls & Matrix Settings */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4 text-xs">
              <div className="flex items-center space-x-2 text-slate-900 border-b border-slate-100 pb-3">
                <Fingerprint className="text-red-600 font-bold animate-pulse" size={20} />
                <h3 className="font-extrabold text-sm">{isAmharic ? "የባዮሜትሪክ መግቢያ/መውጫ መቆጣጠሪያ" : "Biometric Verification Hub"}</h3>
              </div>

              {/* Step 1: Worker Select */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 flex justify-between">
                  <span>1. {isAmharic ? "ሰራተኛ ይምረጡ" : "Choose Employee"}</span>
                  <span className="text-[10px] text-red-600 font-bold">* Required</span>
                </label>
                <select 
                  value={selectedWorkerId}
                  onChange={(e) => {
                    setSelectedWorkerId(e.target.value);
                    setScanStatus("idle");
                    setVerificationError(null);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:border-red-500 font-medium outline-none"
                >
                  <option value="">-- {isAmharic ? "የነቃ ሰራተኛ ይምረጡ" : "Select Registered Worker"} --</option>
                  {sharedWorkers.map(w => (
                    <option key={w.id} value={w.id}>{w.name} ({w.id} - {w.trade})</option>
                  ))}
                </select>
              </div>

              {/* Step 2: Method Select */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">2. {isAmharic ? "የማረጋገጫ ዘዴ" : "Biometric Sensor Mode"}</label>
                <div className="grid grid-cols-5 gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
                  <button 
                    type="button"
                    title="Fingerprint Scanner"
                    onClick={() => { setSelectedMethod(AttendanceMethod.FINGERPRINT); setScanStatus("idle"); }}
                    className={`py-2 rounded flex justify-center cursor-pointer transition-all ${selectedMethod === AttendanceMethod.FINGERPRINT ? 'bg-slate-900 text-white font-bold shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}
                  >
                    <Fingerprint size={16} />
                  </button>
                  <button 
                    type="button"
                    title="Face Camera Scanner"
                    onClick={() => { setSelectedMethod(AttendanceMethod.FACE_RECOGNITION); setScanStatus("idle"); }}
                    className={`py-2 rounded flex justify-center cursor-pointer transition-all ${selectedMethod === AttendanceMethod.FACE_RECOGNITION ? 'bg-slate-900 text-white font-bold shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}
                  >
                    <ScanLine size={16} />
                  </button>
                  <button 
                    type="button"
                    title="QR Code Scanner"
                    onClick={() => { setSelectedMethod(AttendanceMethod.QR_CODE); setScanStatus("idle"); }}
                    className={`py-2 rounded flex justify-center cursor-pointer transition-all ${selectedMethod === AttendanceMethod.QR_CODE ? 'bg-slate-900 text-white font-bold shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}
                  >
                    <QrCode size={16} />
                  </button>
                  <button 
                    type="button"
                    title="NFC Smartcard Reader"
                    onClick={() => { setSelectedMethod(AttendanceMethod.NFC); setScanStatus("idle"); }}
                    className={`py-2 rounded flex justify-center cursor-pointer transition-all ${selectedMethod === AttendanceMethod.NFC ? 'bg-slate-900 text-white font-bold shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}
                  >
                    <Wifi size={16} />
                  </button>
                  <button 
                    type="button"
                    title="GPS Geofence Auditor"
                    onClick={() => { setSelectedMethod(AttendanceMethod.GPS_GEOFENCE); setScanStatus("idle"); }}
                    className={`py-2 rounded flex justify-center cursor-pointer transition-all ${selectedMethod === AttendanceMethod.GPS_GEOFENCE ? 'bg-slate-900 text-white font-bold shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}
                  >
                    <MapPin size={16} />
                  </button>
                </div>
              </div>

              {/* Testing / Simulator Matrix Card */}
              <div className="bg-red-50/50 border border-red-100 p-3.5 rounded-xl space-y-2">
                <h4 className="font-extrabold text-red-900 flex items-center space-x-1">
                  <RefreshCw size={13} className="animate-spin text-red-700" />
                  <span>{isAmharic ? "የሙከራ ማስመሰያ ማትሪክስ" : "SIMULATOR TESTING MATRIX"}</span>
                </h4>
                
                {/* Simulated Geofence Location */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase">Simulated GPS Coordinates</label>
                  <select 
                    value={simLocation} 
                    onChange={e => setSimLocation(e.target.value as any)}
                    className="w-full bg-white border border-slate-200 rounded p-1 text-[11px]"
                  >
                    <option value="on-site">On-Site (0m deviation - inside geofence)</option>
                    <option value="airport">Bole Airport (4.1km deviation - REJECT)</option>
                    <option value="saris">Saris Block D (12.4km deviation - REJECT)</option>
                  </select>
                </div>

                {/* Simulated Biometric Similarity */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase">Simulated Biometric Match</label>
                  <select 
                    value={simBiometric} 
                    onChange={e => setSimBiometric(e.target.value as any)}
                    className="w-full bg-white border border-slate-200 rounded p-1 text-[11px]"
                  >
                    <option value="success">Template Perfect Match (similarity score 98.4%)</option>
                    <option value="mismatch">Template Mismatch (similarity 32.1% - REJECT)</option>
                    <option value="sensor_error">Sensor Hardware Connection Error (REJECT)</option>
                  </select>
                </div>

                {/* Simulated Shift Times */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase">Simulated Shift clock</label>
                  <select 
                    value={simTimeMode} 
                    onChange={e => setSimTimeMode(e.target.value as any)}
                    className="w-full bg-white border border-slate-200 rounded p-1 text-[11px]"
                  >
                    <option value="ontime">Standard On-Time (Check-In: 07:45 / Check-Out: 17:05)</option>
                    <option value="late">Late Arrival Clock (Check-In: 08:35 / Late Alert!)</option>
                    <option value="overtime">Extended Shift / Overtime (Check-Out: 20:30 / +3.5h Overtime)</option>
                  </select>
                </div>

                {/* Simulated Device Code */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase">Registered Scanner ID</label>
                  <input 
                    type="text" 
                    value={simDeviceId} 
                    onChange={e => setSimDeviceId(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded p-1 text-[11px] font-mono" 
                  />
                </div>
              </div>

              {/* Initialize Button */}
              {selectedWorkerId && scanStatus === "idle" && (
                <button
                  onClick={handleStartCamera}
                  className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-sm transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <Camera size={14} />
                  <span>{isAmharic ? "ፍተሻ አስጀምር (Start Scan)" : "Initialize Biometric Scanner"}</span>
                </button>
              )}

              {/* Offline Cache Simulation Controller */}
              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-3 pt-3">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-800 uppercase tracking-wider block text-[10px]">{isAmharic ? "ከመስመር ውጭ ድጋፍ" : "OFFLINE STORAGE DESK"}</span>
                  <div className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={isOffline} 
                      onChange={(e) => {
                        setIsOffline(e.target.checked);
                        if (!e.target.checked && offlineQueue.length > 0) {
                          alert(isAmharic ? "መረብ ተመልሷል! ከመስመር ውጭ የተቀመጡ መዝገቦችን ወደ ደመና ለመጫን 'አሁን አመሳስል' የሚለውን ይጫኑ።" : "Network restored! Click 'Sync Cache Now' to synchronize cached rosters with Cloud Run database.");
                        }
                      }} 
                      className="sr-only peer" 
                      id="offline-toggle-checkbox"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-600"></div>
                  </div>
                </div>

                <p className="text-[10px] text-slate-500 leading-normal">
                  {isAmharic 
                    ? "መረብ ሲቋረጥ የጣት አሻራ እና የፊት ገፅታ መረጃዎች በአካባቢው ቋት ላይ ተቀምጠው መረብ ሲመለስ ይጫናሉ" 
                    : "Simulates remote field construction sites with spotty network. Attendance records will cache locally inside SQLite and auto-sync on recovery."}
                </p>

                {offlineQueue.length > 0 && (
                  <div className="space-y-2 pt-1 border-t border-slate-200">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="font-bold text-amber-700 animate-pulse flex items-center space-x-1">
                        <Database size={11} />
                        <span>{offlineQueue.length} {isAmharic ? "ያልተጫኑ ፋይሎች" : "Pending Records"}</span>
                      </span>
                      <button
                        onClick={() => {
                          setIsSyncingOffline(true);
                          setTimeout(() => {
                            // Copy cached records to master state
                            offlineQueue.forEach(q => {
                              onAddAttendance(q.record);
                            });
                            setOfflineQueue([]);
                            setIsSyncingOffline(false);
                            alert(isAmharic 
                              ? "የባዮሜትሪክ መዛግብት በተሳካ ሁኔታ ከደመናው Digital Construction ERP Firestore/PostgreSQL ዳታቤዝ ጋር ተመሳስለዋል!" 
                              : "Roster cache fully synchronized with Digital Construction ERP Cloud database! Local SQLite store cleared.");
                          }, 2000);
                        }}
                        disabled={isSyncingOffline || isOffline}
                        className="px-2 py-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-extrabold rounded text-[9px] uppercase cursor-pointer transition-all"
                      >
                        {isSyncingOffline ? (isAmharic ? "በማመሳሰል ላይ..." : "Syncing...") : (isAmharic ? "አሁን አመሳስል" : "Sync Cache Now")}
                      </button>
                    </div>

                    <div className="max-h-24 overflow-y-auto space-y-1 pr-1 bg-white p-1.5 rounded border border-slate-200 font-mono text-[9px]">
                      {offlineQueue.map((q, idx) => (
                        <div key={idx} className="flex justify-between text-slate-600">
                          <span>{q.record.workerName.split(" ")[0]} ({q.type})</span>
                          <span className="text-[8px] text-slate-400">{q.record.checkIn || q.record.checkOut}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Middle Column: Scanning View & Active Frame */}
            <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 flex flex-col relative min-h-[360px] text-slate-100 overflow-hidden">
              
              {/* Outer Header */}
              <div className="absolute top-4 left-4 bg-black/60 px-3 py-1 rounded-full text-[9px] font-mono tracking-widest uppercase z-10 flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span>
                <span>{selectedMethod} ACTIVE SECURE FEED</span>
              </div>

              {/* Render Active Stream Camera or Screen Overlay */}
              {isCameraActive ? (
                <video 
                  ref={videoRef} 
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 w-full h-full object-cover rounded-2xl animate-[pulse_3s_infinite]"
                ></video>
              ) : (
                <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center space-y-4 rounded-2xl p-6 text-center">
                  
                  {/* Mode Graphic Indicators */}
                  {scanStatus === "idle" && (
                    <div className="space-y-3">
                      <div className="mx-auto w-16 h-16 rounded-full bg-slate-900 border-2 border-dashed border-slate-700 flex items-center justify-center text-slate-500 animate-pulse">
                        {selectedMethod === AttendanceMethod.FINGERPRINT && <Fingerprint size={32} />}
                        {selectedMethod === AttendanceMethod.FACE_RECOGNITION && <ScanLine size={32} />}
                        {selectedMethod === AttendanceMethod.QR_CODE && <QrCode size={32} />}
                        {selectedMethod === AttendanceMethod.NFC && <Wifi size={32} />}
                        {selectedMethod === AttendanceMethod.GPS_GEOFENCE && <MapPin size={32} />}
                      </div>
                      <p className="text-xs text-slate-400 font-mono">
                        {isAmharic ? "ማረጋገጫ ለመጀመር የሰራተኛ ስም ይምረጡና 'ፍተሻ አስጀምር' ይጫኑ" : "Select an employee and trigger the biometric tool."}
                      </p>
                    </div>
                  )}

                  {/* Verification Failure Frame */}
                  {scanStatus === "failed" && (
                    <div className="space-y-3 max-w-sm animate-fadeIn">
                      <div className="mx-auto w-14 h-14 rounded-full bg-red-950/80 border border-red-500 flex items-center justify-center text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]">
                        <AlertCircle size={30} />
                      </div>
                      <h4 className="text-xs font-black text-red-400 uppercase tracking-wider">SECURE ENTRY ATTEMPT REJECTED</h4>
                      <p className="text-[11px] text-slate-300 font-medium bg-red-950/40 border border-red-900/50 p-3 rounded-lg leading-relaxed">
                        {verificationError}
                      </p>
                      <button
                        onClick={() => setScanStatus("idle")}
                        className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-[10px] font-bold uppercase cursor-pointer"
                      >
                        Reset Terminal
                      </button>
                    </div>
                  )}

                  {/* Verification Success Frame */}
                  {scanStatus === "success" && (
                    <div className="space-y-3 max-w-sm animate-fadeIn">
                      <div className="mx-auto w-14 h-14 rounded-full bg-emerald-950/80 border border-emerald-500 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)] animate-bounce">
                        <Check size={30} />
                      </div>
                      <h4 className="text-xs font-black text-emerald-400 uppercase tracking-wider">SECURITY CLEARANCE PASSED</h4>
                      
                      <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg space-y-1.5 text-left text-[11px]">
                        <div className="flex justify-between"><span className="text-slate-400">Worker:</span> <span className="font-bold text-white">{workers.find(w => w.id === selectedWorkerId)?.name}</span></div>
                        <div className="flex justify-between"><span className="text-slate-400">Position:</span> <span className="font-bold text-white font-mono">{workers.find(w => w.id === selectedWorkerId)?.trade}</span></div>
                        <div className="flex justify-between"><span className="text-slate-400">GPS Status:</span> <span className="font-bold text-emerald-400">Within Geofence (0m deviation)</span></div>
                        <div className="flex justify-between"><span className="text-slate-400">Biometric Score:</span> <span className="font-bold text-emerald-400">98.4% Match Verified</span></div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          onClick={() => handleRegisterAttendance("In")}
                          className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg text-xs shadow cursor-pointer uppercase transition-all"
                        >
                          Confirm Clock-In (IN)
                        </button>
                        <button
                          onClick={() => handleRegisterAttendance("Out")}
                          className="py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-lg text-xs shadow cursor-pointer uppercase transition-all"
                        >
                          Confirm Clock-Out (OUT)
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* Scanning Active Laser overlay */}
              {scanStatus === "scanning" && (
                <div className="absolute left-0 right-0 h-0.5 bg-red-600 shadow-[0_0_8px_#ef4444] animate-bounce z-20"></div>
              )}
            </div>

            {/* Right Column: Live Notifications / Alerts continuous log */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between min-h-[360px] text-xs space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping"></span>
                    <h3 className="font-extrabold text-sm text-slate-800">{isAmharic ? "ያልተፈቀዱ ሙከራዎችና ማንቂያዎች" : "Continuous Security Desk"}</h3>
                  </div>
                  <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {alerts.length}
                  </span>
                </div>

                {/* Alerts log container */}
                <div className="space-y-2.5 max-h-[250px] overflow-y-auto pr-1">
                  {alerts.map(al => {
                    let alertIcon = <AlertCircle size={14} className="text-red-600" />;
                    let alertBg = "bg-red-50 border-red-100 text-red-900";
                    if (al.type === "Late Check-In") {
                      alertBg = "bg-amber-50 border-amber-100 text-amber-900";
                      alertIcon = <Clock size={14} className="text-amber-600" />;
                    } else if (al.type === "Excessive Overtime") {
                      alertBg = "bg-purple-50 border-purple-100 text-purple-900";
                      alertIcon = <FileSpreadsheet size={14} className="text-purple-600" />;
                    }

                    return (
                      <div key={al.id} className={`p-2.5 rounded-xl border flex gap-2 items-start text-[11px] font-medium leading-relaxed shadow-sm transition-all ${alertBg}`}>
                        <div className="shrink-0 mt-0.5">{alertIcon}</div>
                        <div className="space-y-0.5">
                          <div className="font-extrabold flex items-center justify-between">
                            <span>{al.type}</span>
                            <span className="font-mono text-[9px] text-slate-400 font-normal">{al.timestamp}</span>
                          </div>
                          <p className="text-slate-700 font-medium leading-normal">{al.message}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Clear Log Actions */}
              <button
                onClick={() => setAlerts([])}
                className="w-full py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 text-[10px] font-bold rounded-lg border border-slate-200 uppercase tracking-wider cursor-pointer"
              >
                Clear Alert Matrix Log
              </button>
            </div>

          </div>

        </div>
      )}

      {/* --- SUB TAB: BIOMETRIC ENROLLMENT DESK --- */}
      {activeSubTab === "biometric_enrollment" && (currentUserRole === UserRole.TIME_KEEPER || currentUserRole === UserRole.HEAD_OFFICE) && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-6 animate-fadeIn">
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-4 gap-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
                <Fingerprint className="text-red-600 animate-pulse" size={20} />
                <span>{isAmharic ? "ስማርት ባዮሜትሪክ ሰራተኛ መመዝገቢያ ማዕከል" : "Biometric Employee Enrollment Suite"}</span>
              </h3>
              <p className="text-xs text-slate-500">
                {isAmharic 
                  ? "አዳዲስ ሰራተኞችን ፎቶ፣ የፊት ገጽታ መለያ (Face ID) እና የጣት አሻራ (Fingerprint) በመመዝገብ መገለጫቸውን ያግብሩ"
                  : "Time Keeper secure workstation to capture photo biometric facial features, ridge detail thumbprints, and active organizational profiles."}
              </p>
            </div>

            {/* Offline indicator */}
            <div className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold flex items-center space-x-2 ${
              isOffline ? "bg-amber-50 text-amber-700 border-amber-200 animate-pulse" : "bg-emerald-50 text-emerald-700 border-emerald-200"
            }`}>
              {isOffline ? (
                <>
                  <WifiOff size={14} className="text-amber-500" />
                  <span>{isAmharic ? "ከመስመር ውጭ (Local Cached)" : "Offline Operations Engaged"}</span>
                </>
              ) : (
                <>
                  <Wifi size={14} className="text-emerald-500" />
                  <span>{isAmharic ? "ከደመና ጋር የተገናኘ" : "Connected to Digital Construction ERP Cloud"}</span>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Column 1: Selector and Personal Bio */}
            <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-200 text-xs">
              <h4 className="font-extrabold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-2">
                {isAmharic ? "1. ሰራተኛ ይምረጡ" : "Step 1: Choose Employee"}
              </h4>
              
              <div className="space-y-2">
                <label className="font-bold text-slate-700 block">{isAmharic ? "ያልተመዘገቡ ሰራተኞች" : "Select Pending Employee"}</label>
                <select
                  value={selectedEnrollWorkerId}
                  onChange={(e) => {
                    setSelectedEnrollWorkerId(e.target.value);
                    setEnrollFaceTemplate("");
                    setEnrollFingerprintTemplate("");
                    setEnrollPhoto("");
                  }}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 font-bold outline-none focus:border-red-600"
                >
                  <option value="">-- {isAmharic ? "ሰራተኛ ይምረጡ" : "Select Employee to Enroll"} --</option>
                  {workers.filter(w => w.status === "Inactive").map(w => (
                    <option key={w.id} value={w.id}>{w.name} ({w.id})</option>
                  ))}
                </select>
              </div>

              {selectedEnrollWorkerId ? (
                (() => {
                  const worker = workers.find(w => w.id === selectedEnrollWorkerId);
                  if (!worker) return null;
                  return (
                    <div className="space-y-3.5 pt-2 animate-fadeIn">
                      <div className="flex items-center space-x-3 bg-white p-3 rounded-xl border border-slate-200">
                        <img 
                          src={worker.photo || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop"} 
                          alt="Avatar" 
                          className="w-12 h-12 rounded-full border border-slate-300 object-cover" 
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <div className="font-extrabold text-sm text-slate-900">{worker.name}</div>
                          <div className="text-[10px] font-mono text-slate-400">{worker.id}</div>
                          <span className="inline-block mt-1 bg-amber-100 text-amber-800 text-[9px] font-black px-1.5 py-0.5 rounded uppercase">
                            {isAmharic ? "ያልነቃ ፕሮፋይል" : "Inactive Profile"}
                          </span>
                        </div>
                      </div>

                      <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2 text-[11px]">
                        <span className="font-bold text-slate-500 uppercase text-[9px] tracking-wider block">Deployment Metadata</span>
                        <div className="grid grid-cols-2 gap-2">
                          <div><span className="text-slate-400">Trade:</span> <span className="font-bold text-slate-700">{worker.trade}</span></div>
                          <div><span className="text-slate-400">Department:</span> <span className="font-bold text-slate-700">{worker.department}</span></div>
                          <div><span className="text-slate-400">Floor:</span> <span className="font-bold text-slate-700 font-mono">FL {worker.floor}</span></div>
                          <div><span className="text-slate-400">Zone:</span> <span className="font-bold text-slate-700">{worker.zone}</span></div>
                          <div><span className="text-slate-400">Team Leader:</span> <span className="font-bold text-slate-700">{worker.teamLeader}</span></div>
                          <div><span className="text-slate-400">Gang Chief:</span> <span className="font-bold text-slate-700">{worker.gangChief}</span></div>
                          <div><span className="text-slate-400">Supervisor:</span> <span className="font-bold text-slate-700">{worker.supervisor}</span></div>
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="text-center p-6 bg-white rounded-xl border border-dashed border-slate-200 text-slate-400">
                  <User size={30} className="mx-auto mb-2 text-slate-300" />
                  <span>{isAmharic ? "የሰራተኛ ባዮዳታ ለማየት መጀመሪያ ሰራተኛ ይምረጡ" : "Select a worker above to load deployment and spatial details."}</span>
                </div>
              )}
            </div>

            {/* Column 2: Biometric Inputs (Face ID & Thumbprint) */}
            <div className="space-y-4 text-xs">
              
              {/* Step 2: Face Enrollment */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
                <h4 className="font-extrabold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2 flex justify-between items-center">
                  <span>{isAmharic ? "2. የፊት ገጽታ መለያ መመዝገቢያ" : "Step 2: Facial Recognition Registry"}</span>
                  {enrollFaceTemplate && (
                    <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center space-x-0.5">
                      <Check size={10} /> <span>{isAmharic ? "ተመዝግቧል" : "Captured"}</span>
                    </span>
                  )}
                </h4>

                {enrollIsScanningFace ? (
                  <div className="bg-slate-950 rounded-xl relative overflow-hidden aspect-video flex flex-col items-center justify-center text-slate-200 border border-slate-800 p-4">
                    {/* Pulsing Face Frame Scanning Overlay */}
                    <div className="absolute inset-4 border-2 border-dashed border-red-500 rounded-lg animate-pulse pointer-events-none flex items-center justify-center">
                      <div className="w-24 h-24 border-2 border-red-500 rounded-full animate-ping"></div>
                    </div>
                    <div className="absolute top-2 left-2 bg-red-600/80 px-2 py-0.5 rounded text-[8px] font-mono tracking-widest animate-pulse">LIVENESS CAM ON</div>
                    <ScanLine size={36} className="text-red-500 animate-bounce" />
                    <span className="mt-2 text-[10px] font-mono tracking-wider animate-pulse text-red-400">ANALYZING FACIAL POINTS (68 NODES)...</span>
                  </div>
                ) : enrollFaceTemplate ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center space-x-3">
                    <div className="relative">
                      <img 
                        src={enrollPhoto || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=faces"} 
                        alt="Face ID Preview" 
                        className="w-12 h-12 rounded-xl object-cover border border-slate-300"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute -bottom-1 -right-1 p-0.5 bg-emerald-600 rounded-full text-white">
                        <Check size={10} />
                      </div>
                    </div>
                    <div className="flex-grow min-w-0">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Facial Verification Token</span>
                      <span className="font-mono text-[10px] text-slate-600 block truncate font-semibold">{enrollFaceTemplate}</span>
                    </div>
                    <button 
                      onClick={() => { setEnrollFaceTemplate(""); setEnrollPhoto(""); }}
                      className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
                    <Camera size={26} className="mx-auto text-slate-400 mb-2" />
                    <p className="text-[11px] text-slate-500 leading-normal mb-3">
                      {isAmharic 
                        ? "በመግብያው ካሜራ አማካኝነት የሰራተኛውን ሙሉ የፊት ገፅታ እና የዓይን ብሌን መለያ ይመዝግቡ" 
                        : "Initialize high-fidelity optical camera scanner to catalog liveness checks and facial landmarks."}
                    </p>
                    <button
                      type="button"
                      disabled={!selectedEnrollWorkerId}
                      onClick={() => {
                        setEnrollIsScanningFace(true);
                        setTimeout(() => {
                          setEnrollIsScanningFace(false);
                          const randomFaceHash = `sha256-face-983b${Math.floor(1000 + Math.random() * 9000)}`;
                          setEnrollFaceTemplate(randomFaceHash);
                          const worker = workers.find(w => w.id === selectedEnrollWorkerId);
                          setEnrollPhoto(worker?.photo || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=faces");
                        }, 2500);
                      }}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg cursor-pointer transition-all uppercase tracking-wider text-[10px]"
                    >
                      {isAmharic ? "ካሜራ አስጀምር (Face Scan)" : "Initialize Camera & Capture"}
                    </button>
                  </div>
                )}
              </div>

              {/* Step 3: Fingerprint Enrollment */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
                <h4 className="font-extrabold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2 flex justify-between items-center">
                  <span>{isAmharic ? "3. የጣት አሻራ መመዝገቢያ" : "Step 3: Thumbprint Scanner"}</span>
                  {enrollFingerprintTemplate && (
                    <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center space-x-0.5">
                      <Check size={10} /> <span>{isAmharic ? "ተመዝግቧል" : "Enrolled"}</span>
                    </span>
                  )}
                </h4>

                {enrollIsScanningFingerprint ? (
                  <div className="bg-slate-950 rounded-xl relative overflow-hidden aspect-video flex flex-col items-center justify-center text-slate-200 border border-slate-800 p-4">
                    <Fingerprint size={36} className="text-red-500 animate-[pulse_1s_infinite]" />
                    <div className="absolute inset-x-0 bottom-4 h-1.5 bg-slate-900 overflow-hidden mx-8 rounded-full">
                      <div className="h-full bg-red-600 animate-[loading_2.5s_infinite] w-1/2"></div>
                    </div>
                    <span className="mt-2 text-[10px] font-mono tracking-wider animate-pulse text-red-400 uppercase">Scanning ridge flow & minutiae points...</span>
                  </div>
                ) : enrollFingerprintTemplate ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center space-x-3">
                    <div className="p-2 bg-emerald-50 rounded-full text-emerald-600 border border-emerald-200">
                      <Fingerprint size={20} />
                    </div>
                    <div className="flex-grow min-w-0">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Fingerprint Hash Template</span>
                      <span className="font-mono text-[10px] text-slate-600 block truncate font-semibold">{enrollFingerprintTemplate}</span>
                    </div>
                    <button 
                      onClick={() => setEnrollFingerprintTemplate("")}
                      className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
                    <Fingerprint size={26} className="mx-auto text-slate-400 mb-2" />
                    <p className="text-[11px] text-slate-500 leading-normal mb-3">
                      {isAmharic 
                        ? "ጣት ወደ ዩኤስቢ ባዮሜትሪክ ሴንሰሩ እንዲጠጋ በማድረግ የጣት አሻራ ዝርዝር ይመዝግቡ" 
                        : "Connect and initialize external USB biometric scanner to secure high-contrast ridge templates."}
                    </p>
                    <button
                      type="button"
                      disabled={!selectedEnrollWorkerId}
                      onClick={() => {
                        setEnrollIsScanningFingerprint(true);
                        setTimeout(() => {
                          setEnrollIsScanningFingerprint(false);
                          const randomFingerprintHash = `sha256-finger-290a${Math.floor(1000 + Math.random() * 9000)}`;
                          setEnrollFingerprintTemplate(randomFingerprintHash);
                        }, 2500);
                      }}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg cursor-pointer transition-all uppercase tracking-wider text-[10px]"
                    >
                      {isAmharic ? "አሻራ አንባቢ አስጀምር (Finger Scan)" : "Initialize Hardware Sensor"}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Column 3: Verification QR Code & Final Profile Activation */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4 text-xs">
              <h4 className="font-extrabold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-2">
                {isAmharic ? "4. ማግበርና መለያ QR ኮድ" : "Step 4: Activation & QR Identity Code"}
              </h4>

              {selectedEnrollWorkerId && enrollFaceTemplate && enrollFingerprintTemplate ? (
                (() => {
                  const worker = workers.find(w => w.id === selectedEnrollWorkerId);
                  if (!worker) return null;
                  return (
                    <div className="space-y-4 text-center animate-fadeIn">
                      
                      {/* Generated QR Code Card */}
                      <div className="bg-white p-4 rounded-xl border border-slate-300/80 shadow-xs flex flex-col items-center space-y-2 max-w-xs mx-auto">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block">Digital Construction ERP GROUP SECURE ID</span>
                        
                        <div className="bg-slate-100 p-3 rounded-lg border border-slate-200">
                          {/* High fidelity HTML mock QR code with real hashes */}
                          <div className="relative w-28 h-28 border border-slate-300 bg-white p-1.5 flex items-center justify-center">
                            <div className="absolute inset-1.5 grid grid-cols-4 gap-1 opacity-70">
                              <div className="bg-slate-900 rounded-xs"></div><div className="bg-slate-900 rounded-xs"></div><div className="bg-slate-100"></div><div className="bg-slate-900 rounded-xs"></div>
                              <div className="bg-slate-100"></div><div className="bg-slate-900 rounded-xs"></div><div className="bg-slate-900 rounded-xs"></div><div className="bg-slate-100"></div>
                              <div className="bg-slate-900 rounded-xs"></div><div className="bg-slate-100"></div><div className="bg-slate-900 rounded-xs"></div><div className="bg-slate-900 rounded-xs"></div>
                              <div className="bg-slate-900 rounded-xs"></div><div className="bg-slate-900 rounded-xs"></div><div className="bg-slate-100"></div><div className="bg-slate-900 rounded-xs"></div>
                            </div>
                            <div className="w-10 h-10 bg-white border-2 border-red-600 rounded-md shadow-sm z-10 flex items-center justify-center font-black text-red-600 text-[10px] font-mono">
                              Digital Construction ERP
                            </div>
                          </div>
                        </div>

                        <div className="text-center font-mono text-[9px] text-slate-500 leading-tight">
                          <span className="font-bold block text-slate-700">{worker.name}</span>
                          <span className="block">{worker.id}</span>
                          <span className="block text-red-600 font-extrabold">VERIFY-ID-{worker.id}</span>
                        </div>
                        
                        <button 
                          type="button" 
                          onClick={() => alert(`Downloading high-fidelity print card PDF package for ${worker.name}...`)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold text-[9px] flex items-center space-x-1 uppercase transition-all"
                        >
                          <Download size={11} /> <span>{isAmharic ? "QR ካርድ አውርድ" : "Print ID Card"}</span>
                        </button>
                      </div>

                      {/* Active Toggle Switch Block */}
                      <div className="bg-emerald-50/50 border border-emerald-200/80 p-4 rounded-xl text-left space-y-2.5">
                        <div className="flex items-center space-x-2">
                          <ShieldCheck size={18} className="text-emerald-600 shrink-0" />
                          <span className="font-extrabold text-emerald-900 text-xs">{isAmharic ? "ባዮሜትሪክስ ተረጋግጧል" : "Biometrics Secured!"}</span>
                        </div>
                        <p className="text-[11px] text-emerald-800 leading-relaxed font-medium">
                          {isAmharic 
                            ? "ካሜራ እና የጣት አሻራ መረጃ በተሳካ ሁኔታ ተመስጥሯል። ሰራተኛውን አሁን በይፋ ማግበርና ወደ ስራ ማሰማራት ይችላሉ።" 
                            : "Both high-fidelity biometric keys matched successfully. Proceed to officially activate this worker profile."}
                        </p>
                      </div>

                      {/* Activate Action Button */}
                      <button
                        type="button"
                        onClick={() => {
                          const worker = workers.find(w => w.id === selectedEnrollWorkerId);
                          if (!worker) return;

                          const updatedWorker: Worker = {
                            ...worker,
                            faceRecognitionData: enrollFaceTemplate,
                            fingerprint: enrollFingerprintTemplate,
                            status: "Active" // Activate!
                          };

                          onAddWorker(updatedWorker); // Replace worker state in Parent App.tsx

                          setRegSuccessMsg(isAmharic 
                            ? `ሰራተኛ ${worker.name} በተሳካ ሁኔታ የባዮሜትሪክ ምዝገባውን አጠናቆ ስራው ገቢር ሆኗል!` 
                            : `Employee ${worker.name} (${worker.id}) biometrics verified & profile activated successfully!`);
                          
                          // Reset enrollment states
                          setSelectedEnrollWorkerId("");
                          setEnrollFaceTemplate("");
                          setEnrollFingerprintTemplate("");
                          setEnrollPhoto("");

                          window.scrollTo({ top: 0, behavior: 'smooth' });

                          setTimeout(() => {
                            setRegSuccessMsg("");
                            setActiveSubTab("directory"); // Return to directory!
                          }, 3000);
                        }}
                        className="w-full py-3 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-1.5 cursor-pointer uppercase tracking-wider"
                      >
                        <ShieldCheck size={16} />
                        <span>{isAmharic ? "ባዮሜትሪክስ አስቀምጥና ፕሮፋይሉን አግብር" : "Activate Profile & Save Biometrics"}</span>
                      </button>

                    </div>
                  );
                })()
              ) : (
                <div className="text-center p-8 bg-white rounded-xl border border-dashed border-slate-200 text-slate-400 py-12">
                  <QrCode size={40} className="mx-auto text-slate-300 mb-2" />
                  <p className="leading-relaxed text-[11px] px-4">
                    {isAmharic 
                      ? "የአግብር ቁልፍና መለያ QR ኮድ ለመፍጠር የፊት ገጽታና የጣት አሻራ ፍተሻዎችን ቀድመው ያጠናቅቁ" 
                      : "Complete face scanning (Step 2) and thumbprint capture (Step 3) to generate unique identity card & activate employee."}
                  </p>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* --- SUB TAB 6: OVERTIME & ROSTER REPORTS DESK --- */}
      {activeSubTab === "overtime_reports" && (
        <div className="space-y-6">
          
          {/* Controls Bar */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4 font-sans">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">{isAmharic ? "የትርፍ ሰዓትና የመገኘት መግለጫ ማዕከል" : "Authorized Overtime & Attendance Ledger"}</h3>
                <p className="text-xs text-slate-500">
                  {isAmharic 
                    ? "ለክፍያ እና ለሂሳብ ስሌት የሚሆን የተጣራ የስራ ሰዓት፣ የትርፍ ሰዓት ስራዎች እና የጉርሻ መመዝገቢያ ሠንጠረዥ"
                    : "Generate official weekly, monthly and daily overtime logs with compliant structural analysis."}
                </p>
              </div>

              <div className="flex items-center space-x-2 text-xs">
                <button
                  onClick={() => handleExportCSV()}
                  className="px-3.5 py-1.5 bg-slate-950 hover:bg-slate-900 text-white font-bold rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer shadow-sm border border-slate-800"
                >
                  <Download size={13} />
                  <span>Download Excel Ledger</span>
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold rounded-lg border border-slate-200 transition-all flex items-center space-x-1.5 cursor-pointer"
                >
                  <Printer size={13} />
                  <span>PDF Ledger (Print)</span>
                </button>
              </div>
            </div>

            {/* Selection Grid */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 pt-2 text-xs font-semibold font-sans">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex flex-col items-center justify-center text-center space-y-1">
                <span className="text-slate-400 text-[10px] uppercase tracking-wider font-extrabold">Roster workers</span>
                <span className="font-extrabold text-slate-800 text-base font-mono">{sharedWorkers.length}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex flex-col items-center justify-center text-center space-y-1">
                <span className="text-slate-400 text-[10px] uppercase tracking-wider font-extrabold">Active Logs Today</span>
                <span className="font-extrabold text-slate-800 text-base font-mono">
                  {attendance.filter(a => a.date === new Date().toISOString().split("T")[0]).length}
                </span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex flex-col items-center justify-center text-center space-y-1">
                <span className="text-slate-400 text-[10px] uppercase tracking-wider font-extrabold">Total Overtime (Hrs)</span>
                <span className="font-extrabold text-red-600 text-base font-mono">
                  {attendance.reduce((sum, a) => sum + (a.overtime || 0), 0).toFixed(1)}
                </span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex flex-col items-center justify-center text-center space-y-1">
                <span className="text-slate-400 text-[10px] uppercase tracking-wider font-extrabold">Estimated OT Cost</span>
                <span className="font-extrabold text-slate-800 text-base font-mono font-bold">
                  {(attendance.reduce((sum, a) => sum + (a.overtime || 0), 0) * 150).toLocaleString()} ETB
                </span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex flex-col items-center justify-center text-center space-y-1">
                <span className="text-slate-400 text-[10px] uppercase tracking-wider font-extrabold">Late Logs Reported</span>
                <span className="font-extrabold text-amber-600 text-base font-mono">{attendance.filter(a => a.status === "Late").length}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex flex-col items-center justify-center text-center space-y-1">
                <span className="text-slate-400 text-[10px] uppercase tracking-wider font-extrabold">Unpaid Break (Hrs)</span>
                <span className="font-extrabold text-slate-800 text-base font-mono">
                  {(attendance.filter(a => a.checkOut !== null).length * breakDuration).toFixed(1)}
                </span>
              </div>
            </div>
          </div>

          {/* Graphical Proportional Bars */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            
            {/* Overtime Distribution by Department */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4 font-sans">
              <h4 className="font-extrabold text-slate-800 text-sm">{isAmharic ? "የትርፍ ሰዓት ስራ በክፍል" : "Overtime Hours by Organization Department"}</h4>
              <div className="space-y-3.5">
                {Array.from(new Set(workers.map(w => w.department))).map(dept => {
                  const deptWorkers = workers.filter(w => w.department === dept).map(w => w.id);
                  const deptHours = attendance
                    .filter(a => deptWorkers.includes(a.workerId))
                    .reduce((sum, r) => sum + (r.overtime || 0), 0);
                  
                  const maxPercent = Math.min(100, Math.max(5, (deptHours / 25) * 100));

                  return (
                    <div key={dept} className="space-y-1">
                      <div className="flex justify-between font-bold text-slate-700 text-[11px]">
                        <span>{dept}</span>
                        <span className="font-mono text-slate-900 font-extrabold">{deptHours.toFixed(1)} hrs</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-slate-900 h-full rounded-full transition-all" 
                          style={{ width: `${maxPercent}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Overtime Analysis by Worker */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4 font-sans">
              <h4 className="font-extrabold text-slate-800 text-sm">{isAmharic ? "ከፍተኛ የትርፍ ሰዓት የሰሩ ሰራተኞች" : "Top Workers Cumulative Overtime (Hrs)"}</h4>
              <div className="space-y-3.5">
                {sharedWorkers.slice(0, 5).map(w => {
                  const workerHours = attendance
                    .filter(a => a.workerId === w.id)
                    .reduce((sum, r) => sum + (r.overtime || 0), 0);
                  
                  const maxPercent = Math.min(100, Math.max(5, (workerHours / 15) * 100));

                  return (
                    <div key={w.id} className="space-y-1">
                      <div className="flex justify-between font-bold text-slate-700 text-[11px]">
                        <span>{w.name} ({w.id})</span>
                        <span className="font-mono text-red-600 font-black">{workerHours.toFixed(1)} hrs</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-red-600 h-full rounded-full transition-all" 
                          style={{ width: `${maxPercent}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Interactive Report Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4 text-xs font-sans">
            <h3 className="font-extrabold text-slate-900 text-sm">{isAmharic ? "የትርፍ ሰዓትና የተጣራ የስራ ሰዓት ዝርዝር መዝገብ" : "Detailed Cumulative Roster Period Ledger"}</h3>
            
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-100 text-[10px]">
                    <th className="p-3">Worker ID</th>
                    <th className="p-3">Name</th>
                    <th className="p-3">Trade / Role</th>
                    <th className="p-3">Building/Floor/Zone</th>
                    <th className="p-3">Shift Date</th>
                    <th className="p-3 text-center">Unpaid Break</th>
                    <th className="p-3 text-center">Standard Hours</th>
                    <th className="p-3 text-center text-red-600">Overtime Hours</th>
                    <th className="p-3 text-center font-bold">Net Total Work</th>
                    <th className="p-3 text-center">OT Status</th>
                    <th className="p-3">Verified By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {attendance.length > 0 ? (
                    attendance.map(rec => {
                      const otVal = rec.overtime || 0;
                      const wrkVal = rec.workingHours || 0;
                      const stdHours = Math.max(0, wrkVal - otVal);
                      const breakTimeVal = (rec as any).breakTime !== undefined ? (rec as any).breakTime : breakDuration;

                      let statusBadge = "bg-slate-50 text-slate-600 border-slate-200";
                      if (otVal >= overtimeThreshold) {
                        statusBadge = "bg-purple-100 text-purple-700 border-purple-200 font-black";
                      } else if (otVal > 0) {
                        statusBadge = "bg-red-100 text-red-700 border-red-200";
                      }

                      return (
                        <tr key={rec.id} className="hover:bg-slate-50 transition-all">
                          <td className="p-3 font-mono font-extrabold text-slate-500">{rec.workerId}</td>
                          <td className="p-3 font-bold text-slate-900">{rec.workerName}</td>
                          <td className="p-3 font-semibold text-slate-600">{rec.trade}</td>
                          <td className="p-3 font-medium text-slate-500 font-mono text-[11px]">
                            {rec.building} - FL {rec.floor} - {rec.zone}
                          </td>
                          <td className="p-3 font-mono text-[10px] text-slate-500">{rec.date}</td>
                          <td className="p-3 text-center font-mono text-slate-600">{breakTimeVal.toFixed(1)}h</td>
                          <td className="p-3 text-center font-mono text-slate-700 font-bold">{stdHours.toFixed(2)}h</td>
                          <td className="p-3 text-center font-mono text-red-600 font-black">{otVal.toFixed(2)}h</td>
                          <td className="p-3 text-center font-mono text-slate-900 font-black text-sm">{(stdHours + otVal).toFixed(2)}h</td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded border text-[9px] uppercase font-bold tracking-wider ${statusBadge}`}>
                              {otVal >= overtimeThreshold ? "Excessive" : otVal > 0 ? "Elevated" : "Normal"}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-[10px] text-slate-400">
                            {(rec as any).verifiedBy || "Time Keeper Abebe"}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={11} className="p-8 text-center text-slate-400 font-semibold">
                        <AlertCircle className="mx-auto mb-2 text-slate-300" size={32} />
                        No overtime or working hours records available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {activeSubTab === "daily_reports" && (
        <DailyAttendanceReportsHub
          workers={workers}
          attendance={attendance}
          teams={teams}
          isAmharic={isAmharic}
          currentUserRole={currentUserRole}
          onLogAction={onLogAction}
        />
      )}

      {activeSubTab === "security_rbac" && (
        <AttendanceSecurityRbacHub
          currentUserRole={currentUserRole}
          isAmharic={isAmharic}
          authorizedRoles={authorizedRoles}
          onToggleRolePermission={handleToggleRolePermission}
          auditLogs={auditLogs}
          onLogAction={onLogAction}
          onSwitchRole={onSwitchRole}
        />
      )}

      {activeSubTab === "break_exceptions" && (
        <BreakExceptionsHub
          workers={workers}
          attendance={attendance}
          onAddAttendance={onAddAttendance}
          isAmharic={isAmharic}
          currentUserRole={currentUserRole}
        />
      )}

      {activeSubTab === "smart_payroll" && (
        <PayrollHub
          workers={workers}
          attendance={attendance}
          isAmharic={isAmharic}
          currentUserRole={currentUserRole}
        />
      )}

    </div>
  );
};
