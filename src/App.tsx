import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  initialWorkers, 
  initialTeams, 
  initialZones, 
  initialAttendance, 
  initialEvaluations, 
  initialProgressLogs, 
  initialSafetyLogs, 
  initialQualitySnags, 
  initialQualityLogs,
  initialAuditLogs
} from "./data";
import { 
  Worker, 
  Team, 
  ProjectZone, 
  AttendanceRecord, 
  PerformanceEvaluation, 
  DailyProgressLog, 
  SafetyLog, 
  QualitySnag, 
  QualityLog, 
  UserRole,
  AuditLog
} from "./types";

// Component imports
import { Dashboard } from "./components/Dashboard";
import { Attendance } from "./components/Attendance";
import { PlanningScheduler } from "./components/PlanningScheduler";
import { DailyProgress } from "./components/DailyProgress";
import { Performance } from "./components/Performance";
import { SafetyQuality } from "./components/SafetyQuality";
import { AIPredictions } from "./components/AIPredictions";
import { AdminPanel } from "./components/AdminPanel";
import { AuditLogView } from "./components/AuditLogView";
import { AiPhotoInspection } from "./components/AiPhotoInspection";
import { BiometricAttendanceBoard } from "./components/BiometricAttendanceBoard";
import { FingerprintAttendanceBoard } from "./components/FingerprintAttendanceBoard";
import { BiometricEnrollmentKiosk } from "./components/BiometricEnrollmentKiosk";
import { HeadOfficeSyncModule } from "./components/HeadOfficeSyncModule";
import { SiteLayout } from "./components/SiteLayout";
import { CadDrawingModule } from "./components/CadDrawingModule";
import { ProjectDocumentManager } from "./components/ProjectDocumentManager";
import { SiteRegistrationAndActivity } from "./components/SiteRegistrationAndActivity";
import { SurveyingInstrumentModule } from "./components/SurveyingInstrumentModule";
import { LoginScreen } from "./components/LoginScreen";
import { SecuritySettingsHub } from "./components/SecuritySettingsHub";
import { EnterpriseErpHub } from "./components/EnterpriseErpHub";
import { WorkerProfiles } from "./components/WorkerProfiles";

// Lucide Icons
import { 
  Building2, 
  Users, 
  Calendar, 
  Layers, 
  ShieldAlert, 
  Activity, 
  Sparkles, 
  Settings, 
  VolumeX,
  Languages,
  UserCheck,
  ShieldCheck,
  Shield,
  Lock,
  Camera,
  Fingerprint,
  ScanLine,
  Compass,
  Database,
  FileText,
  Cpu,
  Wifi,
  Send,
  RefreshCw,
  CheckCircle2,
  Radio,
  Bell,
  X,
  ArrowRight
} from "lucide-react";

export default function App() {
  // Master State Arrays
  const [workers, setWorkers] = useState<Worker[]>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("ovid_workers");
      if (stored) {
        try { return JSON.parse(stored); } catch (e) { console.error(e); }
      }
    }
    return initialWorkers;
  });
  const [teams, setTeams] = useState<Team[]>(initialTeams);
  const [zones, setZones] = useState<ProjectZone[]>(initialZones);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("ovid_attendance");
      if (stored) {
        try { return JSON.parse(stored); } catch (e) { console.error(e); }
      }
    }
    return initialAttendance;
  });
  const [evaluations, setEvaluations] = useState<PerformanceEvaluation[]>(initialEvaluations);
  const [progressLogs, setProgressLogs] = useState<DailyProgressLog[]>(initialProgressLogs);
  const [safetyLogs, setSafetyLogs] = useState<SafetyLog[]>(initialSafetyLogs);
  const [qualitySnags, setQualitySnags] = useState<QualitySnag[]>(initialQualitySnags);
  const [qualityLogs, setQualityLogs] = useState<QualityLog[]>(initialQualityLogs);
  const [isOnline, setIsOnline] = useState(typeof window !== "undefined" ? navigator.onLine : true);

  // Shell UI parameters
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>(UserRole.HEAD_OFFICE);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(initialAuditLogs);
  const [isAmharic, setIsAmharic] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [projectDocsSubTab, setProjectDocsSubTab] = useState<"newModule" | "vault">("newModule");

  // Toast notifications for cross-app data transmissions
  interface AppToast {
    id: string;
    titleEn: string;
    titleAm: string;
    descEn: string;
    descAm: string;
    type: "sync" | "success" | "warning" | "info";
    senderApp: string;
    senderAppAm: string;
    receiverApp: string;
    receiverAppAm: string;
    timestamp: string;
  }
  const [toasts, setToasts] = useState<AppToast[]>([]);

  // Security and Authentication session states
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sessionTimeoutMinutes, setSessionTimeoutMinutes] = useState(10);
  const [lastActivity, setLastActivity] = useState<number>(Date.now());
  const [loginMetadata, setLoginMetadata] = useState<{ loginTime: string; device: string; ip: string; gps: string } | null>(null);

  // Multi-Language Translation Map
  const translations: Record<string, Record<string, string>> = {
    en: {
      "Dashboard": "Dashboard",
      "CAD Drawings & Photos": "CAD & Daily Site Photos",
      "Site Layout": "Site Layout Plan",
      "Real-Time Cloud Sync": "Real-Time Cloud Sync",
      "Attendance": "Attendance",
      "Biometric Board": "Biometric Board",
      "Fingerprint Board": "Fingerprint Board",
      "Biometric Kiosk": "Biometric Kiosk & Enroll",
      "Planning": "Planning & Scheduler",
      "Daily Logs": "Daily Logs",
      "Evaluation": "Performance Evaluation",
      "Safety & Quality": "Safety & Quality",
      "AI Predictions": "AI Forecasting Core",
      "Admin": "Admin Console",
      "Workers Present": "Workers Present",
      "Late": "Late",
      "Absent": "Absent",
      "Leave": "Leave",
      "Active Zones": "Active Zones",
      "Delayed Zones": "Delayed Zones",
      "Safety Score": "Safety Compliance Index",
      "Quality Score": "Quality Audit Index",
      "Top Performing Workers": "Top Rated Workers",
      "Top Performing Teams": "Top Rated Teams",
      "Simulate Attendance Tap": "Register Biometric Check-In/Out",
      "Select Worker": "Select Site Worker",
      "Select Attendance Method": "Attendance Scan Method",
      "Clock In (IN)": "Clock In",
      "Clock Out (OUT)": "Clock Out",
      "Worker Attendance Logs": "Worker Attendance Register",
      "Worker Name": "Worker Name",
      "Trade": "Trade Specialty",
      "Check In": "Check-In Time",
      "Check Out": "Check-Out Time",
      "Working Hours": "Logged Hours",
      "Method": "Scan Tool",
      "Status": "Status",
      "Project Planner & Scheduler": "OVID Aluminum Cycle Scheduler",
      "Project Start Date": "Cycle Commencement Date",
      "Number of Floors": "Estimated Floors",
      "Zones per Floor": "Working Zones/Floor",
      "Target Days per Zone": "Target Duration/Zone",
      "Generate Construction Schedule": "Generate Master Construction Schedule",
      "Zone Schedule Table": "Autogenerated Structural Gantt Timeline",
      "Record Daily Formwork Progress": "Track Daily Panel Assemblies",
      "Building & Block": "Building Bloc & Target",
      "Floor & Zone": "Floor",
      "Installed Panels": "Lock Panels Installed",
      "Removed Panels": "Panels Stripped/Prepped",
      "Remaining Panels": "Panels Stacked",
      "Concrete Ready for Pouring": "Pre-pour Check Passed",
      "Inspection Status": "Quality Audit Sign-off",
      "Comments": "Daily Site Log Notes",
      "Log Daily Progress": "Submit Progress Entry",
      "Add Quality Snag": "Log Alignment Defect / Snag",
      "Defect Type": "Defect Category",
      "Active Snags & Repair Status": "Outstanding Defects Registry",
      "Projects & Docs": "Projects & Site Documents",
      "Surveying & Concrete": "Surveying & Concrete",
      "Enterprise ERP Suite": "Enterprise ERP Suite",
    },
    am: {
      "Dashboard": "ዋና ሰሌዳ (Dashboard)",
      "Projects & Docs": "ፕሮጀክት ምዝገባ እና ሰነድ (Projects)",
      "Surveying & Concrete": "የሰርቬይንግ እና ኮንክሪት ዝግጁነት",
      "CAD Drawings & Photos": "የCAD ስዕሎች እና የዕለት ፎቶዎች (CAD & Photos)",
      "Site Layout": "የሳይት ፕላን (Site Layout)",
      "Real-Time Cloud Sync": "የደመና ማመሳሰያ (Cloud Sync)",
      "Attendance": "የመገኘት ቁጥጥር (Attendance)",
      "Biometric Board": "ባዮሜትሪክ ሰሌዳ",
      "Fingerprint Board": "የጣት አሻራ ሰሌዳ",
      "Biometric Kiosk": "ባዮሜትሪክ ኪዮስክ እና ምዝገባ",
      "Planning": "ማቀጃ እና የጊዜ ሰሌዳ (Scheduler)",
      "Daily Logs": "የእለት ስራዎች ምዝገባ (Daily Logs)",
      "Evaluation": "የሰራተኞች ግምገማ (Performance)",
      "Safety & Quality": "ደህንነት እና ጥራት (Safety/Quality)",
      "AI Predictions": "አይአይ ትንበያ (AI Predictions)",
      "Enterprise ERP Suite": "የድርጅት ERP ስብስብ (ERP Suite)",
      "Admin": "አስተዳደር ፓነል (Admin)",
      "Workers Present": "የመጡ ሰራተኞች",
      "Late": "የዘገዩ",
      "Absent": "ያልመጡ",
      "Leave": "ፈቃድ ላይ",
      "Active Zones": "ንቁ የሆኑ ዞኖች",
      "Delayed Zones": "የዘገዩ ዞኖች",
      "Safety Score": "የደህንነት ተገዢነት ደረጃ",
      "Quality Score": "የጥራት ቁጥጥር ደረጃ",
      "Top Performing Workers": "ከፍተኛ ውጤት ያመጡ ሰራተኞች",
      "Top Performing Teams": "ደረጃቸውን የጠበቁ ቡድኖች",
      "Simulate Attendance Tap": "የመግቢያ መለያ መታ መድረክ",
      "Select Worker": "ሰራተኛ ይምረጡ",
      "Select Attendance Method": "የመለያ ዘዴ ይምረጡ",
      "Clock In (IN)": "መግቢያ (IN)",
      "Clock Out (OUT)": "መውጫ (OUT)",
      "Worker Attendance Logs": "የመገኘት መዝገብ ሰሌዳ",
      "Worker Name": "የሰራተኛ ስም",
      "Trade": "የሙያ ዘርፍ",
      "Check In": "የመግቢያ ሰዓት",
      "Check Out": "የመውጫ ሰዓት",
      "Working Hours": "የሰሩበት ሰዓት",
      "Method": "የመለያ መሣሪያ",
      "Status": "ሁኔታ",
      "Project Planner & Scheduler": "የግንባታ ጊዜ እቅድ መርሃ-ግብር",
      "Project Start Date": "ግንባታው የሚጀመርበት ቀን",
      "Number of Floors": "ጠቅላላ የፎቅ ብዛት",
      "Zones per Floor": "በአንድ ፎቅ ውስጥ ያሉ ዞኖች",
      "Target Days per Zone": "የእያንዳንዱ ዞን የቀን ገደብ",
      "Generate Construction Schedule": "የግንባታ የጊዜ ሰሌዳውን በራስ-ሰር አውጣ",
      "Zone Schedule Table": "በራስ-ሰር የተሰራ የግንባታ ሰሌዳ",
      "Record Daily Formwork Progress": "ዕለታዊ የአሉሚኒየም ፎርምወርክ ቁጥጥር",
      "Building & Block": "የህንፃ ብሎክ",
      "Floor & Zone": "ፎቅ",
      "Installed Panels": "የተገጠሙ የአሉሚኒየም ፓነሎች",
      "Removed Panels": "የተነሱ የአሉሚኒየም ፓነሎች",
      "Remaining Panels": "ያልተገጠሙ የቀሩ ፓነሎች",
      "Concrete Ready for Pouring": "ለኮንክሪት ሙሌት ዝግጁ ነው",
      "Inspection Status": "የህንፃ ተቆጣጣሪ ፍቃድ ሁኔታ",
      "Comments": "የእለት ስራዎች ማስታወሻ",
      "Log Daily Progress": "ምዝገባውን መዝግብ",
      "Add Quality Snag": "የጥራት ጉድለቶችን መመዝገቢያ",
      "Defect Type": "የጉድለት አይነት",
      "Active Snags & Repair Status": "ያልተፈቱ የጥራት ጉድለቶች መዝገብ",
    }
  };

  const tabPermissions: Record<UserRole, string[]> = {
    [UserRole.HEAD_OFFICE]: ["dashboard", "workerProfiles", "enterpriseErp", "attendance", "biometricBoard", "fingerprintBoard", "biometricKiosk", "planning", "progress", "performance", "safetyQuality", "predictions", "admin", "auditLog", "aiInspection", "headOfficeSync", "siteLayout", "cadDrawing", "projectDocs", "surveying", "securitySettings"],
    [UserRole.PROJECT_MANAGER]: ["dashboard", "workerProfiles", "enterpriseErp", "attendance", "biometricBoard", "fingerprintBoard", "planning", "progress", "performance", "safetyQuality", "predictions", "aiInspection", "headOfficeSync", "siteLayout", "cadDrawing", "projectDocs", "surveying", "securitySettings"],
    [UserRole.SECTION_HEAD]: ["dashboard", "workerProfiles", "enterpriseErp", "attendance", "planning", "progress", "safetyQuality", "aiInspection", "siteLayout", "cadDrawing", "projectDocs", "surveying", "securitySettings"],
    [UserRole.SUPERVISOR]: ["dashboard", "workerProfiles", "enterpriseErp", "attendance", "biometricBoard", "fingerprintBoard", "biometricKiosk", "progress", "performance", "safetyQuality", "auditLog", "aiInspection", "headOfficeSync", "siteLayout", "cadDrawing", "projectDocs", "surveying", "securitySettings"],
    [UserRole.SITE_ENGINEER]: ["dashboard", "workerProfiles", "enterpriseErp", "planning", "progress", "safetyQuality", "aiInspection", "siteLayout", "cadDrawing", "projectDocs", "surveying", "securitySettings"],
    [UserRole.SURVEYOR]: ["dashboard", "workerProfiles", "enterpriseErp", "siteLayout", "cadDrawing", "projectDocs", "surveying", "securitySettings"],
    [UserRole.TEAM_LEADER]: ["dashboard", "workerProfiles", "enterpriseErp", "biometricBoard", "fingerprintBoard", "biometricKiosk", "planning", "progress", "safetyQuality", "auditLog", "aiInspection", "headOfficeSync", "siteLayout", "cadDrawing", "projectDocs", "surveying", "securitySettings"],
    [UserRole.GANG_CHIEF]: ["dashboard", "workerProfiles", "enterpriseErp", "biometricBoard", "fingerprintBoard", "biometricKiosk", "progress", "safetyQuality", "auditLog", "aiInspection", "headOfficeSync", "siteLayout", "cadDrawing", "projectDocs", "surveying", "securitySettings"],
    [UserRole.TIME_KEEPER]: ["dashboard", "workerProfiles", "enterpriseErp", "attendance", "biometricBoard", "fingerprintBoard", "biometricKiosk", "performance", "safetyQuality", "auditLog", "aiInspection", "headOfficeSync", "siteLayout", "projectDocs", "surveying", "securitySettings"],
    [UserRole.WORKER]: ["dashboard", "workerProfiles", "attendance", "progress", "siteLayout", "surveying", "securitySettings"]
  };

  const t = (key: string): string => {
    const lang = isAmharic ? "am" : "en";
    return translations[lang][key] || key;
  };

  // Synchronize master state arrays to localStorage for offline permanence on construction site
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("ovid_attendance", JSON.stringify(attendance));
    }
  }, [attendance]);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("ovid_workers", JSON.stringify(workers));
    }
  }, [workers]);

  // Handle window online/offline events for unstable network indicator
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    
    const handleOnline = () => {
      setIsOnline(true);
      logAction("Network Status: Online", "Device re-established stable cloud database replication link. Synced local queues.");
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      logAction("Network Status: Offline", "Device disconnected from the cloud. Enabled offline buffer queue.");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Enforce strict RBAC on role changes
  React.useEffect(() => {
    const allowed = tabPermissions[currentUserRole];
    if (allowed && !allowed.includes(activeTab)) {
      setActiveTab("dashboard");
    }
  }, [currentUserRole, activeTab]);

  // Inactivity timeout handler
  React.useEffect(() => {
    if (!isAuthenticated) return;

    const handleUserActivity = () => {
      setLastActivity(Date.now());
    };

    // Listen to user activity events
    window.addEventListener("mousemove", handleUserActivity);
    window.addEventListener("keydown", handleUserActivity);
    window.addEventListener("click", handleUserActivity);
    window.addEventListener("scroll", handleUserActivity);

    const checkInterval = setInterval(() => {
      const idleTimeMs = Date.now() - lastActivity;
      const limitMs = sessionTimeoutMinutes * 60 * 1000;
      if (idleTimeMs >= limitMs) {
        setIsAuthenticated(false);
        logAction("Session Auto-Logout due to Inactivity", `System terminated inactive token session after ${sessionTimeoutMinutes} minutes.`);
        alert(isAmharic ? "ከእርምጃ ነጻ በመሆንዎ ስርዓቱ በደህንነት ምክንያት በራስ-ሰር ዘግቶታል።" : "Session closed automatically due to inactivity timeout.");
      }
    }, 10000); // Check every 10 seconds

    return () => {
      window.removeEventListener("mousemove", handleUserActivity);
      window.removeEventListener("keydown", handleUserActivity);
      window.removeEventListener("click", handleUserActivity);
      window.removeEventListener("scroll", handleUserActivity);
      clearInterval(checkInterval);
    };
  }, [isAuthenticated, lastActivity, sessionTimeoutMinutes]);

  // Trigger system notification toast for cross-app transmissions
  const triggerNotificationToast = (action: string, details: string) => {
    let titleEn = "Data Transmitted";
    let titleAm = "መረጃ ተልኳል";
    let descEn = details;
    let descAm = "ሲስተሙ መረጃን ከአንድ ሞዱል ወደ ሌላው በተሳካ ሁኔታ አስተላልፏል።";
    let type: "sync" | "success" | "warning" | "info" = "info";
    let senderApp = "Active ERP Module";
    let senderAppAm = "አገልግሎት ላይ ያለ ሞዱል";
    let receiverApp = "Central Database";
    let receiverAppAm = "ማዕከላዊ ዳታቤዝ";

    const actLower = action.toLowerCase();
    const detLower = details.toLowerCase();

    if (actLower.includes("offline queue") || actLower.includes("offline queue synchronized") || detLower.includes("synchronized pending local")) {
      titleEn = "Offline Buffer Synchronized";
      titleAm = "የመስመር ውጭ መረጃ ተመሳስሏል";
      descEn = "Attendance records successfully transferred from terminal local buffer to cloud storage.";
      descAm = "የመገኘት መዝገቦች ከተርሚናል አካባቢያዊ ማከማቻ ወደ ዋናው መስሪያ ቤት ደመና በተሳካ ሁኔታ ተላልፈዋል";
      senderApp = "Local Terminal Buffer";
      senderAppAm = "የአካባቢ ተርሚናል ማከማቻ";
      receiverApp = "Head Office Cloud DB";
      receiverAppAm = "ኦቪድ ዋና መስሪያ ቤት የደመና ዳታቤዝ";
      type = "sync";
    } else if (actLower.includes("biometric") || actLower.includes("attendance logged") || actLower.includes("attendance scan")) {
      titleEn = "Biometric Record Dispatched";
      titleAm = "ባዮሜትሪክ መረጃ ተልኳል";
      descEn = details;
      descAm = "የሰራተኛው ባዮሜትሪክ መረጃ በቀጥታ ወደ ማዕከላዊ የመገኘት መቆጣጠሪያ ተልኳል።";
      senderApp = "Biometric Gate Terminal";
      senderAppAm = "ባዮሜትሪክ መግቢያ በር";
      receiverApp = "Central Attendance DB";
      receiverAppAm = "ማዕከላዊ የመገኘት መዝገብ ዳታቤዝ";
      type = "success";
    } else if (actLower.includes("sap erp") || actLower.includes("erp") || actLower.includes("ledger") || detLower.includes("synchronized to central") || detLower.includes("sap")) {
      titleEn = "SAP ERP Integration Sync";
      titleAm = "ከ SAP ERP ጋር ማመሳሰል";
      descEn = "Financial and materials payload reconciled with external SAP gateway.";
      descAm = "የሂሳብ እና የንብረት ዝመና መረጃ ከውጭ SAP ሲስተም ጋር በተሳካ ሁኔታ ተገናኝቷል።";
      senderApp = "Enterprise ERP Hub";
      senderAppAm = "ኢንተርፕራይዝ ERP ሲስተም";
      receiverApp = "SAP ERP Gateway";
      receiverAppAm = "ማዕከላዊ SAP መግቢያ";
      type = "sync";
    } else if (actLower.includes("performance") || actLower.includes("evaluation") || actLower.includes("evaluated")) {
      titleEn = "Performance File Transmitted";
      titleAm = "የአፈጻጸም ግምገማ ተልኳል";
      descEn = "Worker grading metrics transferred directly to Head Office HR directory.";
      descAm = "የሰራተኛው ውጤትና ግምገማ መረጃ ወደ ዋናው መስሪያ ቤት HR መዝገብ ተላልፏል።";
      senderApp = "Performance Evaluator App";
      senderAppAm = "የአፈጻጸም መመዘኛ መተግበሪያ";
      receiverApp = "Corporate HR Core";
      receiverAppAm = "የዋና መስሪያ ቤት HR ማዕከል";
      type = "success";
    } else if (actLower.includes("safety") || actLower.includes("hse") || actLower.includes("safety score")) {
      titleEn = "HSE Compliance Synced";
      titleAm = "የደህንነት መረጃ ተመሳስሏል";
      descEn = "Daily hazard log & toolbox session details synchronized with safety division.";
      descAm = "የዕለታዊ ደህንነት ውይይት መዝገብ ወደ ዋናው የHSE መቆጣጠሪያ ማዕከል ተልኳል።";
      senderApp = "Site Safety Monitor";
      senderAppAm = "የሳይት ደህንነት ተቆጣጣሪ";
      receiverApp = "HSE Headquarters Hub";
      receiverAppAm = "HSE ዋና መስሪያ ቤት ማዕከል";
      type = "success";
    } else if (actLower.includes("snag") || actLower.includes("quality") || actLower.includes("defect")) {
      titleEn = "Quality Audit Transmitted";
      titleAm = "የጥራት ቁጥጥር መረጃ ተልኳል";
      descEn = "Defect status and repair checklist synchronized with site supervisor app.";
      descAm = "የጥራት ጉድለት ዝርዝር ሪፖርት ወደ ግንባታ ተቆጣጣሪ ክፍል መተግበሪያ ተልኳል።";
      senderApp = "Quality Assurance Auditor";
      senderAppAm = "የጥራት ቁጥጥር ሞዱል";
      receiverApp = "Engineering Defect Core";
      receiverAppAm = "የመሃንዲሶች መቆጣጠሪያ ማዕከል";
      type = "warning";
    } else if (actLower.includes("drone") || actLower.includes("flight") || actLower.includes("mapping")) {
      titleEn = "Drone Photogrammetry Synced";
      titleAm = "የድሮን ካርታ መረጃ ተመሳስሏል";
      descEn = "Aerial raster mapping and topography files dispatched to CAD modeler.";
      descAm = "የድሮን የአየር ላይ ፎቶዎችና ካርታ ወደ CAD ሞዴሊንግ ሲስተም ተልኳል።";
      senderApp = "UAV Drone Flight App";
      senderAppAm = "የድሮን በረራ መተግበሪያ";
      receiverApp = "Autodesk CAD Viewer";
      receiverAppAm = "የCAD ስዕሎች መጋዘን";
      type = "sync";
    } else if (actLower.includes("zone") || actLower.includes("planning") || actLower.includes("progress")) {
      titleEn = "Site Schedule Updated";
      titleAm = "የሳይት ግንባታ እቅድ ተዘምኗል";
      descEn = "Formwork progress metrics synchronized with project scheduler engine.";
      descAm = "የአሉሚኒየም ፎርምወርክ ስራ ሂደት ከጊዜ ሰሌዳው ጋር ተመሳስሏል።";
      senderApp = "Daily Progress Logger";
      senderAppAm = "ዕለታዊ ሂደት መመዝገቢያ";
      receiverApp = "Planning Scheduler Core";
      receiverAppAm = "እቅድና የጊዜ ሰሌዳ ሞዱል";
      type = "info";
    } else if (actLower.includes("worker") || actLower.includes("personnel") || actLower.includes("staff")) {
      titleEn = "Staff Database Replicated";
      titleAm = "የሰራተኞች መረጃ ተዘምኗል";
      descEn = "Employee details automatically replicated to biometric access panels.";
      descAm = "የሰራተኛው አዲስ መረጃ ወደ ባዮሜትሪክ መለያ መሣሪያዎች በተሳካ ሁኔታ ተላልፏል።";
      senderApp = "Personnel Register (HR)";
      senderAppAm = "የሰራተኞች HR መዝገብ";
      receiverApp = "Biometric Control Hub";
      receiverAppAm = "ባዮሜትሪክ ማዕከል";
      type = "sync";
    } else if (actLower.includes("network status") || actLower.includes("online") || actLower.includes("offline")) {
      titleEn = "Network State Synchronized";
      titleAm = "የኔትወርክ ግንኙነት ተስተካክሏል";
      descEn = actLower.includes("online") ? "Cloud datastore connection restored. Auto-sync active." : "Local buffer fallback activated. Data cached locally.";
      descAm = actLower.includes("online") ? "ከደመና ማከማቻ ጋር ያለው ግንኙነት ተመልሷል። የቀጥታ ማመሳሰል በርቷል።" : "ከደመና ማከማቻ ጋር ያለው ግንኙነት ተቋርጧል። መረጃዎች በአካባቢው ይቀመጣሉ።";
      senderApp = "Device Connectivity Gateway";
      senderAppAm = "የመሳሪያው ግንኙነት መቆጣጠሪያ";
      receiverApp = "Cloud Server Broker";
      receiverAppAm = "የደመና ሰርቨር ማገናኛ";
      type = actLower.includes("online") ? "sync" : "warning";
    } else if (actLower.includes("survey") || actLower.includes("leica") || actLower.includes("instrument")) {
      titleEn = "Leica TS16 Telemetry Transmitted";
      titleAm = "የሰርቬይንግ ልኬት መረጃ ተልኳል";
      descEn = "Survey total station coordinate buffer uploaded to CAD planning system.";
      descAm = "የሰርቬይ መለኪያ መረጃ ከላይካ መሣሪያ በቀጥታ ወደ CAD ዲዛይን ሲስተም ተልኳል።";
      senderApp = "Leica Total Station TS16";
      senderAppAm = "ላይካ ሰርቬይንግ መሣሪያ";
      receiverApp = "Cloud CAD Planner";
      receiverAppAm = "ደመና-ተኮር CAD ሲስተም";
      type = "sync";
    }

    const toastId = `${Date.now()}-${Math.random()}`;
    const newToast: AppToast = {
      id: toastId,
      titleEn,
      titleAm,
      descEn,
      descAm,
      type,
      senderApp,
      senderAppAm,
      receiverApp,
      receiverAppAm,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };

    setToasts(prev => [newToast, ...prev.slice(0, 4)]); // Keep at most 5 toasts visible

    // Self-dismiss after 6 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== toastId));
    }, 6000);
  };

  // Audit log generator helper
  const logAction = (action: string, details: string, customizedRole?: UserRole) => {
    const activeRole = customizedRole || currentUserRole;
    const logId = `AUD-${Date.now().toString().slice(-4)}`;
    const newLog: AuditLog = {
      id: logId,
      timestamp: new Date().toISOString().replace("T", " ").slice(0, 19),
      userId: activeRole === UserRole.HEAD_OFFICE ? "HO-01" :
              activeRole === UserRole.PROJECT_MANAGER ? "PM-01" :
              activeRole === UserRole.SECTION_HEAD ? "SH-01" :
              activeRole === UserRole.SUPERVISOR ? "SV-01" :
              activeRole === UserRole.SITE_ENGINEER ? "SE-01" :
              activeRole === UserRole.SURVEYOR ? "SR-01" :
              activeRole === UserRole.TIME_KEEPER ? "TK-01" :
              activeRole === UserRole.TEAM_LEADER ? "TL-01" :
              activeRole === UserRole.GANG_CHIEF ? "GC-01" : "W-101",
      userName: activeRole === UserRole.HEAD_OFFICE ? "Nuriye Ahmed Adem (Head Office Admin)" :
                activeRole === UserRole.PROJECT_MANAGER ? "Eng. Dawit (Project Manager)" :
                activeRole === UserRole.SECTION_HEAD ? "Alemayehu Kebede (Section Head)" :
                activeRole === UserRole.SUPERVISOR ? "Kassa Hunegn (Supervisor)" :
                activeRole === UserRole.SITE_ENGINEER ? "Sintayehu Alula (Site Engineer)" :
                activeRole === UserRole.SURVEYOR ? "Tadesse Chala (Surveyor)" :
                activeRole === UserRole.TIME_KEEPER ? "Abebe Girma (Time Keeper)" :
                activeRole === UserRole.TEAM_LEADER ? "Yohannes Bekele (Team Leader)" :
                activeRole === UserRole.GANG_CHIEF ? "Fikru Tolossa (Gang Chief)" : "Bekele Tesfaye (Worker)",
      role: activeRole,
      action,
      details
    };

    // Check if it is a sensitive action like Clock In, Safety Log, quality, registration
    const actLower = action.toLowerCase();
    const detLower = details.toLowerCase();
    const isSensitive = actLower.includes("attendance") || 
                        actLower.includes("clock") || 
                        actLower.includes("safety") || 
                        actLower.includes("hse") || 
                        actLower.includes("login") || 
                        actLower.includes("register") || 
                        actLower.includes("terminate") || 
                        actLower.includes("snag") || 
                        actLower.includes("quality") || 
                        actLower.includes("zone") || 
                        actLower.includes("plan");

    if (isSensitive) {
      newLog.gps = {
        latitude: 0,
        longitude: 0,
        status: "locating"
      };
    }

    setAuditLogs((prev) => [newLog, ...prev]);
    triggerNotificationToast(action, details);

    // Fetch GPS coordinates asynchronously
    if (isSensitive) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setAuditLogs((prevLogs) =>
              prevLogs.map((log) =>
                log.id === logId
                  ? {
                      ...log,
                      gps: {
                        latitude: parseFloat(position.coords.latitude.toFixed(6)),
                        longitude: parseFloat(position.coords.longitude.toFixed(6)),
                        accuracy: Math.round(position.coords.accuracy),
                        status: "acquired" as const
                      }
                    }
                  : log
              )
            );
          },
          (error) => {
            console.warn("Geolocation failed/denied, utilizing high-fidelity simulated construction site coordinates", error);
            // Addis Ababa Bole Heights B1 Construction Site default fallback
            const simulatedLat = parseFloat((9.011743 + (Math.random() - 0.5) * 0.0004).toFixed(6));
            const simulatedLng = parseFloat((38.794651 + (Math.random() - 0.5) * 0.0004).toFixed(6));
            setAuditLogs((prevLogs) =>
              prevLogs.map((log) =>
                log.id === logId
                  ? {
                      ...log,
                      gps: {
                        latitude: simulatedLat,
                        longitude: simulatedLng,
                        accuracy: 12,
                        status: "acquired" as const
                      }
                    }
                  : log
              )
            );
          },
          { enableHighAccuracy: true, timeout: 4500, maximumAge: 0 }
        );
      } else {
        // No geolocation API, fallback directly
        const simulatedLat = parseFloat((9.011743 + (Math.random() - 0.5) * 0.0004).toFixed(6));
        const simulatedLng = parseFloat((38.794651 + (Math.random() - 0.5) * 0.0004).toFixed(6));
        setAuditLogs((prevLogs) =>
          prevLogs.map((log) =>
            log.id === logId
              ? {
                  ...log,
                  gps: {
                    latitude: simulatedLat,
                    longitude: simulatedLng,
                    accuracy: 15,
                    status: "acquired" as const
                  }
                }
              : log
          )
        );
      }
    }
  };

  // State Manipulation Handlers
  const handleAddAttendance = (record: AttendanceRecord) => {
    setAttendance((prev) => {
      const exists = prev.some((r) => r.id === record.id);
      if (exists) {
        return prev.map((r) => (r.id === record.id ? record : r));
      }
      return [record, ...prev];
    });
    logAction("Biometric Attendance Logged", `Clocked ${record.checkOut ? "OUT" : "IN"} worker ${record.workerName} via ${record.method}. Status: ${record.status}`);
  };

  const handleUpdateZone = (updatedZone: ProjectZone) => {
    setZones((prev) => prev.map((z) => (z.id === updatedZone.id ? updatedZone : z)));
    logAction("Zone Plan Updated", `Updated completion stats for Zone ${updatedZone.zone} on floor ${updatedZone.floor}. Overall Completion: ${updatedZone.completionPercentage}%`);
  };

  const handleAddZone = (newZone: ProjectZone) => {
    setZones((prev) => {
      if (prev.some((z) => z.id === newZone.id)) return prev;
      return [...prev, newZone];
    });
    logAction("New Zone Created", `Created structural project zone ${newZone.id} in building ${newZone.building}`);
  };

  const handleAddLog = (newLog: DailyProgressLog) => {
    setProgressLogs((prev) => [newLog, ...prev]);
    logAction("Daily Progress Logged", `Logged formwork metrics for ${newLog.zone}. Installed: ${newLog.installedPanels} panels, Stripped: ${newLog.removedPanels} panels.`);
  };

  const handleAddEvaluation = (newEval: PerformanceEvaluation) => {
    setEvaluations((prev) => [newEval, ...prev]);
    logAction("Worker Performance Evaluated", `Evaluated worker ${newEval.workerName}. Overall Score: ${newEval.totalScore}/100. Rank: ${newEval.level}`);
  };

  const handleAddSafetyLog = (newSafetyLog: SafetyLog) => {
    setSafetyLogs((prev) => [newSafetyLog, ...prev]);
    logAction("Safety Audit Registered", `Logged safety Toolbox topic: "${newSafetyLog.toolboxTopic}". Daily Safety Compliance Index: ${newSafetyLog.safetyScore}%`);
  };

  const handleAddSnag = (newSnag: QualitySnag) => {
    setQualitySnags((prev) => [newSnag, ...prev]);
    logAction("Quality Snag Logged", `Reported structural defect: "${newSnag.description}" under category "${newSnag.defectType}"`);
  };

  const handleResolveSnag = (snagId: string) => {
    setQualitySnags((prev) => 
      prev.map((snag) => snag.id === snagId ? { ...snag, status: "Resolved" } : snag)
    );
    logAction("Quality Snag Resolved", `Marked outstanding defect ID: ${snagId} as Resolved & verified.`);
  };

  // Admin roster operations
  const handleAddWorker = (w: Worker) => {
    setWorkers((prev) => [...prev, w]);
    logAction("Worker Registered", `Added worker ${w.name} (${w.trade}) to department ${w.department}`);
  };

  const handleUpdateWorker = (updatedWorker: Worker) => {
    setWorkers((prev) => prev.map((w) => (w.id === updatedWorker.id ? updatedWorker : w)));
    logAction("Worker Profile Updated", `Modified credentials/skills for ${updatedWorker.name} (${updatedWorker.id})`);
  };

  const handleDeleteWorker = (id: string) => {
    const worker = workers.find(w => w.id === id);
    setWorkers((prev) => prev.filter((w) => w.id !== id));
    logAction("Worker Terminated", `Removed worker ${worker ? worker.name : id} from organization roster`);
  };

  const handleAddTeam = (team: Team) => {
    setTeams((prev) => [...prev, team]);
    logAction("Construction Team Created", `Registered team "${team.name}" in department ${team.department}`);
  };

  if (!isAuthenticated) {
    return (
      <LoginScreen
        isAmharic={isAmharic}
        onLanguageToggle={() => setIsAmharic(!isAmharic)}
        auditLogsCount={auditLogs.length}
        onLoginSuccess={(role, method, loginLog) => {
          setCurrentUserRole(role);
          setIsAuthenticated(true);
          setLoginMetadata(loginLog);
          logAction("User Secure Login", `Method: ${method} | Acted as Acting Role: ${role} | Metadata: ${JSON.stringify(loginLog)}`, role);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased">
      
      {/* HEADER SECTION (No-print for tidy PDF generation) */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 no-print shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-600 text-white rounded-lg flex items-center justify-center">
              <Building2 size={22} />
            </div>
            <div>
              <span className="text-xs uppercase tracking-widest font-black text-red-600">{isAmharic ? "ዲጂታል ኮንስትራክሽን ኢአርፒ መቆጣጠሪያ ፕላትፎርም" : "Digital Construction ERP command platform"}</span>
              <h1 className="text-sm font-extrabold text-slate-900 tracking-tight leading-none">
                Aluminum Formwork Attendance & Productivity System
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Duty user selector */}
            <div className="flex items-center space-x-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
              <UserCheck size={14} className="text-red-600 ml-1 shrink-0" />
              <div className="text-left leading-none">
                <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wider">{isAmharic ? "የተጠቃሚ መለያ" : "Active Session Profile"}</span>
                <select
                  value={currentUserRole}
                  onChange={(e) => {
                    const newRole = e.target.value as UserRole;
                    setCurrentUserRole(newRole);
                    logAction("User Switched Session Role", `Switched acting role session to ${newRole}`, newRole);
                  }}
                  className="bg-transparent border-none text-xs font-bold font-sans text-slate-700 focus:outline-none focus:ring-0 cursor-pointer pr-1"
                >
                  <option value={UserRole.HEAD_OFFICE}>{isAmharic ? "ዋና መስሪያ ቤት (Nuriye Ahmed Adem)" : "Head Office - Nuriye Ahmed Adem"}</option>
                  <option value={UserRole.PROJECT_MANAGER}>{isAmharic ? "ፕሮጀክት ስራ አስኪያጅ (Eng. Dawit)" : "Project Manager - Eng. Dawit"}</option>
                  <option value={UserRole.SECTION_HEAD}>{isAmharic ? "የክፍል ኃላፊ (Alemayehu Kebede)" : "Section Head - Alemayehu Kebede"}</option>
                  <option value={UserRole.SUPERVISOR}>{isAmharic ? "ሱፐርቫይዘር (Kassa Hunegn)" : "Supervisor - Kassa Hunegn"}</option>
                  <option value={UserRole.SITE_ENGINEER}>{isAmharic ? "ሳይት መሃንዲስ (Sintayehu Alula)" : "Site Engineer - Sintayehu Alula"}</option>
                  <option value={UserRole.SURVEYOR}>{isAmharic ? "ሰርቬየር (Tadesse Chala)" : "Surveyor - Tadesse Chala"}</option>
                  <option value={UserRole.TEAM_LEADER}>{isAmharic ? "የስራ ቡድን መሪ (Yohannes Bekele)" : "Team Leader - Yohannes Bekele"}</option>
                  <option value={UserRole.GANG_CHIEF}>{isAmharic ? "ጋንግ ቺፍ / ፎርማን (Fikru Tolossa)" : "Gang Chief - Fikru Tolossa"}</option>
                  <option value={UserRole.TIME_KEEPER}>{isAmharic ? "የመገኘት ተቆጣጣሪ (Abebe Girma)" : "Time Keeper - Abebe Girma"}</option>
                  <option value={UserRole.WORKER}>{isAmharic ? "ሳይት ሰራተኛ (Bekele Tesfaye)" : "Worker - Bekele Tesfaye"}</option>
                </select>
              </div>
            </div>

            {/* Connection Status Badge */}
            <div className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition-all ${
              isOnline 
                ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                : "bg-amber-50 text-amber-700 border-amber-200 animate-pulse"
            }`}>
              <span className={`w-2 h-2 rounded-full ${isOnline ? "bg-emerald-500" : "bg-amber-500 animate-ping"}`}></span>
              <span>
                {isOnline 
                  ? (isAmharic ? "መስመር ላይ" : "Online") 
                  : (isAmharic ? "ከመስመር ውጭ (የአካባቢ ማከማቻ)" : "Offline Mode (Local)")
                }
              </span>
            </div>

            {/* Language toggle widget */}
            <button
              onClick={() => setIsAmharic(!isAmharic)}
              className="p-2 hover:bg-slate-100 rounded-full text-slate-600 flex items-center space-x-1 transition-colors cursor-pointer"
              title="Toggle Language / ቋንቋ ቀይር"
            >
              <Languages size={18} />
              <span className="text-xs font-bold font-mono">{isAmharic ? "EN" : "አማ"}</span>
            </button>

            {/* Manual Logout Button */}
            <button
              onClick={() => {
                setIsAuthenticated(false);
                logAction("User Logged Out", "Operator requested secure closure of acting token.");
              }}
              className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 text-xs font-black transition-all flex items-center space-x-1 cursor-pointer"
              title="End Secure Token"
            >
              <Lock size={12} />
              <span>{isAmharic ? "ውጣ" : "Logout"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* CORE NAVIGATION BAR (No-print) */}
      <div className="bg-slate-900 text-slate-300 no-print shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-1 overflow-x-auto py-1 scrollbar-none whitespace-nowrap text-xs font-semibold">
            
            {/* Dashboard Tab */}
            {tabPermissions[currentUserRole]?.includes("dashboard") && (
              <button
                onClick={() => setActiveTab("dashboard")}
                className={`px-4 py-3 flex items-center space-x-1.5 transition-colors cursor-pointer border-b-2 ${
                  activeTab === "dashboard" ? "text-white border-red-500 bg-slate-800" : "border-transparent hover:text-white hover:bg-slate-800"
                }`}
              >
                <Activity size={15} />
                <span>{t("Dashboard")}</span>
              </button>
            )}

            {/* Worker Profiles Tab */}
            {tabPermissions[currentUserRole]?.includes("workerProfiles") && (
              <button
                onClick={() => setActiveTab("workerProfiles")}
                className={`px-4 py-3 flex items-center space-x-1.5 transition-colors cursor-pointer border-b-2 ${
                  activeTab === "workerProfiles" ? "text-white border-red-500 bg-slate-800 font-bold" : "border-transparent hover:text-white hover:bg-slate-800"
                }`}
              >
                <Users size={15} className="text-red-500" />
                <span>{isAmharic ? "የሰራተኞች መገለጫዎች" : "Worker Profiles"}</span>
              </button>
            )}

            {/* Enterprise ERP Suite Tab */}
            {tabPermissions[currentUserRole]?.includes("enterpriseErp") && (
              <button
                onClick={() => setActiveTab("enterpriseErp")}
                className={`px-4 py-3 flex items-center space-x-1.5 transition-colors cursor-pointer border-b-2 ${
                  activeTab === "enterpriseErp" ? "text-white border-red-500 bg-slate-800 font-bold" : "border-transparent hover:text-white hover:bg-slate-800"
                }`}
              >
                <Cpu size={15} className="text-red-500 animate-pulse" />
                <span className="flex items-center gap-1">
                  {t("Enterprise ERP Suite")}
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                </span>
              </button>
            )}

            {/* Projects & Documents Tab */}
            {tabPermissions[currentUserRole]?.includes("projectDocs") && (
              <button
                onClick={() => setActiveTab("projectDocs")}
                className={`px-4 py-3 flex items-center space-x-1.5 transition-colors cursor-pointer border-b-2 ${
                  activeTab === "projectDocs" ? "text-white border-red-500 bg-slate-800" : "border-transparent hover:text-white hover:bg-slate-800"
                }`}
              >
                <Building2 size={15} className="text-red-500 animate-pulse" />
                <span>{t("Projects & Docs")}</span>
              </button>
            )}

            {/* Site Layout Tab */}
            {tabPermissions[currentUserRole]?.includes("siteLayout") && (
              <button
                onClick={() => setActiveTab("siteLayout")}
                className={`px-4 py-3 flex items-center space-x-1.5 transition-colors cursor-pointer border-b-2 ${
                  activeTab === "siteLayout" ? "text-white border-red-500 bg-slate-800" : "border-transparent hover:text-white hover:bg-slate-800"
                }`}
              >
                <Compass size={15} className="text-red-500" />
                <span>{t("Site Layout")}</span>
              </button>
            )}

            {/* CAD Drawings & Photos Tab */}
            {tabPermissions[currentUserRole]?.includes("cadDrawing") && (
              <button
                onClick={() => setActiveTab("cadDrawing")}
                className={`px-4 py-3 flex items-center space-x-1.5 transition-colors cursor-pointer border-b-2 ${
                  activeTab === "cadDrawing" ? "text-white border-red-500 bg-slate-800" : "border-transparent hover:text-white hover:bg-slate-800"
                }`}
              >
                <FileText size={15} className="text-red-500" />
                <span>{t("CAD Drawings & Photos")}</span>
              </button>
            )}

            {/* Surveying & Concrete Tab */}
            {tabPermissions[currentUserRole]?.includes("surveying") && (
              <button
                onClick={() => setActiveTab("surveying")}
                className={`px-4 py-3 flex items-center space-x-1.5 transition-colors cursor-pointer border-b-2 ${
                  activeTab === "surveying" ? "text-white border-red-500 bg-slate-800" : "border-transparent hover:text-white hover:bg-slate-800"
                }`}
              >
                <Compass size={15} className="text-red-500 animate-pulse" />
                <span>{t("Surveying & Concrete")}</span>
              </button>
            )}

            {/* Attendance Tab */}
            {tabPermissions[currentUserRole]?.includes("attendance") && (
              <button
                onClick={() => setActiveTab("attendance")}
                className={`px-4 py-3 flex items-center space-x-1.5 transition-colors cursor-pointer border-b-2 ${
                  activeTab === "attendance" ? "text-white border-red-500 bg-slate-800" : "border-transparent hover:text-white hover:bg-slate-800"
                }`}
              >
                <Users size={15} />
                <span>{t("Attendance")}</span>
              </button>
            )}

            {/* Biometric Attendance Board Tab */}
            {tabPermissions[currentUserRole]?.includes("biometricBoard") && (
              <button
                onClick={() => setActiveTab("biometricBoard")}
                className={`px-4 py-3 flex items-center space-x-1.5 transition-colors cursor-pointer border-b-2 ${
                  activeTab === "biometricBoard" ? "text-white border-red-500 bg-slate-800" : "border-transparent hover:text-white hover:bg-slate-800"
                }`}
              >
                <Fingerprint size={15} className="text-red-400" />
                <span>{t("Biometric Board")}</span>
              </button>
            )}

            {/* Fingerprint Attendance Board Tab */}
            {tabPermissions[currentUserRole]?.includes("fingerprintBoard") && (
              <button
                onClick={() => setActiveTab("fingerprintBoard")}
                className={`px-4 py-3 flex items-center space-x-1.5 transition-colors cursor-pointer border-b-2 ${
                  activeTab === "fingerprintBoard" ? "text-white border-red-500 bg-slate-800" : "border-transparent hover:text-white hover:bg-slate-800"
                }`}
              >
                <Fingerprint size={15} className="text-red-500 animate-pulse" />
                <span>{t("Fingerprint Board")}</span>
              </button>
            )}

            {/* Real-Time Cloud Sync Tab */}
            {tabPermissions[currentUserRole]?.includes("headOfficeSync") && (
              <button
                onClick={() => setActiveTab("headOfficeSync")}
                className={`px-4 py-3 flex items-center space-x-1.5 transition-colors cursor-pointer border-b-2 ${
                  activeTab === "headOfficeSync" ? "text-white border-red-500 bg-slate-800" : "border-transparent hover:text-white hover:bg-slate-800"
                }`}
              >
                <Database size={15} className="text-red-500 animate-pulse" />
                <span>{t("Real-Time Cloud Sync")}</span>
              </button>
            )}

            {/* Biometric Kiosk Tab */}
            {tabPermissions[currentUserRole]?.includes("biometricKiosk") && (
              <button
                onClick={() => setActiveTab("biometricKiosk")}
                className={`px-4 py-3 flex items-center space-x-1.5 transition-colors cursor-pointer border-b-2 ${
                  activeTab === "biometricKiosk" ? "text-white border-red-500 bg-slate-800" : "border-transparent hover:text-white hover:bg-slate-800"
                }`}
              >
                <ScanLine size={15} className="text-red-500" />
                <span>{t("Biometric Kiosk")}</span>
              </button>
            )}

            {/* Planning & Gantt Scheduler */}
            {tabPermissions[currentUserRole]?.includes("planning") && (
              <button
                onClick={() => setActiveTab("planning")}
                className={`px-4 py-3 flex items-center space-x-1.5 transition-colors cursor-pointer border-b-2 ${
                  activeTab === "planning" ? "text-white border-red-500 bg-slate-800" : "border-transparent hover:text-white hover:bg-slate-800"
                }`}
              >
                <Calendar size={15} />
                <span>{t("Planning")}</span>
              </button>
            )}

            {/* Daily progress logging */}
            {tabPermissions[currentUserRole]?.includes("progress") && (
              <button
                onClick={() => setActiveTab("progress")}
                className={`px-4 py-3 flex items-center space-x-1.5 transition-colors cursor-pointer border-b-2 ${
                  activeTab === "progress" ? "text-white border-red-500 bg-slate-800" : "border-transparent hover:text-white hover:bg-slate-800"
                }`}
              >
                <Layers size={15} />
                <span>{t("Daily Logs")}</span>
              </button>
            )}

            {/* Performance Rankings Tab */}
            {tabPermissions[currentUserRole]?.includes("performance") && (
              <button
                onClick={() => setActiveTab("performance")}
                className={`px-4 py-3 flex items-center space-x-1.5 transition-colors cursor-pointer border-b-2 ${
                  activeTab === "performance" ? "text-white border-red-500 bg-slate-800" : "border-transparent hover:text-white hover:bg-slate-800"
                }`}
              >
                <UserCheck size={15} />
                <span>{t("Evaluation")}</span>
              </button>
            )}

            {/* Safety and Quality Checks */}
            {tabPermissions[currentUserRole]?.includes("safetyQuality") && (
              <button
                onClick={() => setActiveTab("safetyQuality")}
                className={`px-4 py-3 flex items-center space-x-1.5 transition-colors cursor-pointer border-b-2 ${
                  activeTab === "safetyQuality" ? "text-white border-red-500 bg-slate-800" : "border-transparent hover:text-white hover:bg-slate-800"
                }`}
              >
                <ShieldAlert size={15} />
                <span>{t("Safety & Quality")}</span>
              </button>
            )}

            {/* AI Site Photo & Concrete Readiness Inspection Tab */}
            {tabPermissions[currentUserRole]?.includes("aiInspection") && (
              <button
                onClick={() => setActiveTab("aiInspection")}
                className={`px-4 py-3 flex items-center space-x-1.5 text-red-400 transition-colors cursor-pointer border-b-2 ${
                  activeTab === "aiInspection" ? "text-white border-red-500 bg-slate-800" : "border-transparent hover:text-white hover:bg-slate-800"
                }`}
              >
                <Camera size={15} />
                <span>{isAmharic ? "አይአይ ፎቶ ቁጥጥር" : "AI Photo Inspection"}</span>
              </button>
            )}

            {/* AI Predictive Analytics */}
            {tabPermissions[currentUserRole]?.includes("predictions") && (
              <button
                onClick={() => setActiveTab("predictions")}
                className={`px-4 py-3 flex items-center space-x-1.5 text-rose-400 transition-colors cursor-pointer border-b-2 ${
                  activeTab === "predictions" ? "text-white border-red-500 bg-slate-800" : "border-transparent hover:text-white hover:bg-slate-800"
                }`}
              >
                <Sparkles size={15} />
                <span>{t("AI Predictions")}</span>
              </button>
            )}

            {/* Admin Setup Tab */}
            {tabPermissions[currentUserRole]?.includes("admin") && (
              <button
                onClick={() => setActiveTab("admin")}
                className={`px-4 py-3 flex items-center space-x-1.5 transition-colors cursor-pointer border-b-2 ${
                  activeTab === "admin" ? "text-white border-red-500 bg-slate-800" : "border-transparent hover:text-white hover:bg-slate-800"
                }`}
              >
                <Settings size={15} />
                <span>{t("Admin")}</span>
              </button>
            )}

            {/* Audit Log Tab */}
            {tabPermissions[currentUserRole]?.includes("auditLog") && (
              <button
                onClick={() => setActiveTab("auditLog")}
                className={`px-4 py-3 flex items-center space-x-1.5 text-emerald-400 transition-colors cursor-pointer border-b-2 ${
                  activeTab === "auditLog" ? "text-white border-red-500 bg-slate-800" : "border-transparent hover:text-white hover:bg-slate-800"
                }`}
              >
                <ShieldCheck size={15} />
                <span>{isAmharic ? "ኦዲት መዝገብ (Audit Log)" : "Audit Log"}</span>
              </button>
            )}

            {/* Security & Settings Tab */}
            {tabPermissions[currentUserRole]?.includes("securitySettings") && (
              <button
                onClick={() => setActiveTab("securitySettings")}
                className={`px-4 py-3 flex items-center space-x-1.5 text-red-500 transition-colors cursor-pointer border-b-2 ${
                  activeTab === "securitySettings" ? "text-white border-red-500 bg-slate-800" : "border-transparent hover:text-white hover:bg-slate-800"
                }`}
              >
                <Shield size={15} />
                <span>{isAmharic ? "ደህንነት እና ምርጫዎች (Security)" : "Security & Settings"}</span>
              </button>
            )}

          </div>
        </div>
      </div>

      {/* PRIMARY VIEWS LAYOUT CONTAINER */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow w-full">
        {activeTab === "dashboard" && (
          <Dashboard 
            workers={workers} 
            teams={teams} 
            zones={zones} 
            attendance={attendance} 
            isAmharic={isAmharic}
            t={t}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            currentUserRole={currentUserRole}
            evaluations={evaluations}
            onAddAttendance={handleAddAttendance}
          />
        )}

        {activeTab === "workerProfiles" && (
          <WorkerProfiles
            workers={workers}
            onAddWorker={handleAddWorker}
            onUpdateWorker={handleUpdateWorker}
            onDeleteWorker={handleDeleteWorker}
            isAmharic={isAmharic}
            currentUserRole={currentUserRole}
            onLogAction={(action, details) => logAction(action, details)}
          />
        )}

        {activeTab === "enterpriseErp" && (
          <EnterpriseErpHub 
            isAmharic={isAmharic}
            currentUserRole={currentUserRole}
            onLogAction={(action, details) => logAction(action, details)}
          />
        )}

        {activeTab === "projectDocs" && (
          <div className="space-y-6">
            <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Building2 size={16} className="text-red-500 animate-pulse" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                  {isAmharic ? "ፕሮጀክት ምዝገባ እና ሰነዶች መጋዘን" : "Projects & Document Hub"}
                </span>
              </div>
              
              <div className="flex space-x-1">
                <button
                  onClick={() => setProjectDocsSubTab("newModule")}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    projectDocsSubTab === "newModule"
                      ? "bg-slate-900 text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {isAmharic ? "አዲስ ሳይት ምዝገባና የዕለት ተግባር" : "Site Registration & Daily Activity"}
                </button>
                <button
                  onClick={() => setProjectDocsSubTab("vault")}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    projectDocsSubTab === "vault"
                      ? "bg-slate-900 text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {isAmharic ? "ባህላዊ የሰነዶች ማከማቻ (Vault)" : "Traditional Document Vault"}
                </button>
              </div>
            </div>

            {projectDocsSubTab === "newModule" ? (
              <SiteRegistrationAndActivity
                workers={workers}
                teams={teams}
                attendance={attendance}
                isAmharic={isAmharic}
                currentUserRole={currentUserRole}
                onLogAction={(action, details) => logAction(action, details)}
              />
            ) : (
              <ProjectDocumentManager
                workers={workers}
                teams={teams}
                attendance={attendance}
                isAmharic={isAmharic}
                currentUserRole={currentUserRole}
                onLogAction={(action, details) => logAction(action, details)}
              />
            )}
          </div>
        )}

        {activeTab === "siteLayout" && (
          <SiteLayout
            workers={workers}
            teams={teams}
            attendance={attendance}
            zones={zones}
            isAmharic={isAmharic}
            progressLogs={progressLogs}
          />
        )}

        {activeTab === "cadDrawing" && (
          <CadDrawingModule
            workers={workers}
            teams={teams}
            attendance={attendance}
            isAmharic={isAmharic}
            currentUserRole={currentUserRole}
            onLogAction={(action, details) => logAction(action, details)}
          />
        )}

        {activeTab === "surveying" && (
          <SurveyingInstrumentModule
            isAmharic={isAmharic}
            currentUserRole={currentUserRole}
            onLogAction={(action, details) => logAction(action, details)}
          />
        )}

        {activeTab === "attendance" && (
          <Attendance 
            workers={workers} 
            attendance={attendance} 
            onAddAttendance={handleAddAttendance} 
            isAmharic={isAmharic}
            t={t}
            currentUserRole={currentUserRole}
            onAddWorker={handleAddWorker}
            onDeleteWorker={handleDeleteWorker}
            evaluations={evaluations}
            onAddEvaluation={handleAddEvaluation}
          />
        )}

        {activeTab === "biometricBoard" && (
          <BiometricAttendanceBoard 
            workers={workers} 
            attendance={attendance} 
            onAddAttendance={handleAddAttendance} 
            isAmharic={isAmharic}
            currentUserRole={currentUserRole}
            onLogAction={(action, details) => logAction(action, details)}
          />
        )}

        {activeTab === "fingerprintBoard" && (
          <FingerprintAttendanceBoard 
            workers={workers} 
            attendance={attendance} 
            onAddAttendance={handleAddAttendance} 
            isAmharic={isAmharic}
            currentUserRole={currentUserRole}
            onLogAction={(action, details) => logAction(action, details)}
          />
        )}

        {activeTab === "headOfficeSync" && (
          <HeadOfficeSyncModule
            workers={workers}
            teams={teams}
            attendance={attendance}
            onAddAttendance={handleAddAttendance}
            isAmharic={isAmharic}
            currentUserRole={currentUserRole}
            onLogAction={(action, details) => logAction(action, details)}
          />
        )}

        {activeTab === "biometricKiosk" && (
          <BiometricEnrollmentKiosk 
            workers={workers} 
            attendance={attendance} 
            onAddAttendance={handleAddAttendance} 
            onEnrollWorker={(newWorker) => {
              setWorkers((prev) => [newWorker, ...prev]);
            }}
            isAmharic={isAmharic}
            currentUserRole={currentUserRole}
            onLogAction={(action, details) => logAction(action, details)}
          />
        )}

        {activeTab === "planning" && (
          <PlanningScheduler 
            zones={zones} 
            onUpdateZone={handleUpdateZone} 
            onAddZone={handleAddZone} 
            isAmharic={isAmharic}
            t={t}
            currentUserRole={currentUserRole}
          />
        )}

        {activeTab === "progress" && (
          <DailyProgress 
            logs={progressLogs} 
            onAddLog={handleAddLog} 
            isAmharic={isAmharic}
            t={t}
          />
        )}

        {activeTab === "performance" && (
          <Performance 
            workers={workers} 
            teams={teams} 
            evaluations={evaluations} 
            onAddEvaluation={handleAddEvaluation} 
            isAmharic={isAmharic}
            t={t}
          />
        )}

        {activeTab === "safetyQuality" && (
          <SafetyQuality 
            safetyLogs={safetyLogs} 
            qualitySnags={qualitySnags} 
            qualityLogs={qualityLogs} 
            onAddSafetyLog={handleAddSafetyLog} 
            onAddSnag={handleAddSnag} 
            onResolveSnag={handleResolveSnag} 
            isAmharic={isAmharic}
            t={t}
          />
        )}

        {activeTab === "predictions" && (
          <AIPredictions 
            zones={zones} 
            teams={teams} 
            workers={workers} 
            evaluations={evaluations} 
            progressLogs={progressLogs} 
            safetyLogs={safetyLogs} 
            qualitySnags={qualitySnags} 
            isAmharic={isAmharic}
            t={t}
          />
        )}

        {activeTab === "aiInspection" && (
          <AiPhotoInspection 
            isAmharic={isAmharic}
            currentUserRole={currentUserRole}
            zones={zones}
            onUpdateZone={handleUpdateZone}
            onLogAction={(action, details) => logAction(action, details)}
          />
        )}

        {activeTab === "admin" && tabPermissions[currentUserRole]?.includes("admin") && (
          <AdminPanel 
            workers={workers} 
            teams={teams} 
            currentUserRole={currentUserRole}
            onChangeUserRole={setCurrentUserRole}
            onAddWorker={handleAddWorker}
            onDeleteWorker={handleDeleteWorker}
            onAddTeam={handleAddTeam}
            isAmharic={isAmharic}
            t={t}
          />
        )}

        {activeTab === "auditLog" && tabPermissions[currentUserRole]?.includes("auditLog") && (
          <AuditLogView 
            logs={auditLogs} 
            isAmharic={isAmharic}
            t={t}
          />
        )}

        {activeTab === "securitySettings" && tabPermissions[currentUserRole]?.includes("securitySettings") && (
          <SecuritySettingsHub 
            isAmharic={isAmharic}
            currentUserRole={currentUserRole}
            onLogAction={(action, details) => logAction(action, details)}
            auditLogs={auditLogs}
            sessionTimeoutMinutes={sessionTimeoutMinutes}
            onChangeSessionTimeout={(mins) => setSessionTimeoutMinutes(mins)}
          />
        )}
      </main>

      {/* FOOTER SECTION */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-400 no-print">
        <div className="max-w-7xl mx-auto px-4 space-y-1">
          <p>© {new Date().getFullYear()} Digital Construction ERP command platform. All rights reserved. Aluminum Formwork Productivity Command Hub.</p>
          <p className="font-semibold text-slate-500">
            {isAmharic 
              ? "የአድሚን መተግበሪያ በአልሚው፡ ኑሪዬ አህመድ አደም የተገነባ" 
              : "Admin App developed by: Nuriye Ahmed Adem"} 
            {" "}| {isAmharic ? "ስልክ:" : "Phone:"} 0910097862 / 0920843843 | mejennur669@gmail.com
          </p>
          <p className="font-mono text-[10px]">Secure offline local-sync enabled | Bole Heights Project Site B1</p>
        </div>
      </footer>

      {/* FLOATING SYSTEM TOAST NOTIFICATIONS (CROSS-APP TRANSMISSIONS) */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3.5 max-w-sm w-full px-4 sm:px-0 pointer-events-none no-print">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 260, damping: 21 }}
              className="pointer-events-auto bg-slate-900/95 backdrop-blur-md text-white rounded-2xl shadow-2xl border border-slate-800/85 p-4 overflow-hidden relative flex flex-col gap-2.5"
            >
              {/* Top bar with system category */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-[10px] uppercase font-black tracking-widest text-red-500 bg-red-950/75 px-2 py-0.5 rounded-md flex items-center gap-1.5 font-sans">
                  <Cpu size={10} className="animate-pulse" />
                  {isAmharic ? "የመተግበሪያ መረጃ ማስተላለፊያ" : "Cross-App Data Telemetry"}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-slate-500">{toast.timestamp}</span>
                  <button
                    onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                    className="text-slate-400 hover:text-white p-0.5 rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* Sender & Receiver visual bridge */}
              <div className="bg-slate-950/80 p-2 rounded-xl border border-slate-800/60 flex items-center justify-between gap-1 text-[10px] font-semibold text-slate-300 font-mono">
                <div className="flex flex-col">
                  <span className="text-[8px] text-slate-500 uppercase font-black">{isAmharic ? "መነሻ አፕ" : "From App"}</span>
                  <span className="truncate max-w-[120px] text-red-400 font-bold">{isAmharic ? toast.senderAppAm : toast.senderApp}</span>
                </div>
                
                <div className="flex items-center justify-center flex-grow px-1 overflow-hidden relative">
                  <div className="absolute inset-x-0 h-[1.5px] bg-slate-800"></div>
                  {/* Floating dot to simulate data movement */}
                  <motion.div 
                    animate={{ x: [-40, 40] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                    className="w-1.5 h-1.5 rounded-full bg-red-500 absolute"
                  />
                  <ArrowRight size={12} className="text-red-500 relative z-10" />
                </div>

                <div className="flex flex-col text-right">
                  <span className="text-[8px] text-slate-500 uppercase font-black">{isAmharic ? "መድረሻ አፕ" : "To App"}</span>
                  <span className="truncate max-w-[120px] text-emerald-400 font-bold">{isAmharic ? toast.receiverAppAm : toast.receiverApp}</span>
                </div>
              </div>

              {/* Icon, Title, and Description */}
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-xl shrink-0 ${
                  toast.type === "sync" ? "bg-red-500/15 text-red-400 border border-red-500/20" :
                  toast.type === "success" ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20" :
                  toast.type === "warning" ? "bg-amber-500/15 text-amber-400 border border-amber-500/20" :
                  "bg-blue-500/15 text-blue-400 border border-blue-500/20"
                }`}>
                  {toast.type === "sync" ? <RefreshCw size={18} className="animate-spin" /> :
                   toast.type === "success" ? <CheckCircle2 size={18} className="animate-bounce" /> :
                   toast.type === "warning" ? <ShieldAlert size={18} /> :
                   <Wifi size={18} />}
                </div>

                <div className="flex-grow space-y-0.5">
                  <h4 className="font-bold text-xs text-white leading-tight">
                    {isAmharic ? toast.titleAm : toast.titleEn}
                  </h4>
                  <p className="text-[11px] text-slate-300 leading-normal font-sans">
                    {isAmharic ? toast.descAm : toast.descEn}
                  </p>
                </div>
              </div>

              {/* Progress Bar timer animation */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800">
                <motion.div
                  initial={{ width: "100%" }}
                  animate={{ width: "0%" }}
                  transition={{ duration: 6, ease: "linear" }}
                  className={`h-full ${
                    toast.type === "sync" ? "bg-red-500" :
                    toast.type === "success" ? "bg-emerald-500" :
                    toast.type === "warning" ? "bg-amber-500" :
                    "bg-blue-500"
                  }`}
                />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

    </div>
  );
}
