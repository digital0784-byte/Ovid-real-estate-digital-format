import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { DbService } from "./services/db";
import { auth, db, isFirebaseReady, handleFirestoreError, OperationType } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, onSnapshot, getDoc, setDoc } from "firebase/firestore";
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
  AuditLog,
  SystemNotification,
  AluminumFormworkPanel,
  PanelMovementLog
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
import { FinanceErpHub } from "./components/FinanceErpHub";
import { WorkerProfiles } from "./components/WorkerProfiles";
import { FormworkManagement } from "./components/FormworkManagement";
import { MobileAppsHub } from "./components/MobileAppsHub";
import { LaunchReadinessHub } from "./components/LaunchReadinessHub";
import { SubcontractorPortal } from "./components/SubcontractorPortal";
import { StoreOwnerApp } from "./components/StoreOwnerApp";
import { CustomInputGovernanceHub } from "./components/CustomInputGovernanceHub";
import { NotificationBellDropdown } from "./components/NotificationBellDropdown";
import { EnterpriseNotificationCenter } from "./components/EnterpriseNotificationCenter";
import { NotificationService } from "./services/notificationService";
import { RoleChangeApprovalService } from "./services/roleChangeApprovalService";

// Lucide Icons
import { 
  Building2, 
  BookOpen,
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
  Clock,
  Radio,
  Bell,
  X,
  ArrowRight,
  Grid,
  DollarSign,
  Smartphone,
  Rocket,
  Briefcase,
  Store,
  MapPin,
  MapPinOff,
  PlusCircle
} from "lucide-react";

export interface UserProfile {
  uid: string;
  displayName: string;
  role: UserRole | string;
  requestedRole?: UserRole | string;
  status: string;
  email: string;
  phoneNumber?: string;
  createdAt?: string;
}

export default function App() {
  // Master State Arrays loaded dynamically from DbService
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [zones, setZones] = useState<ProjectZone[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [evaluations, setEvaluations] = useState<PerformanceEvaluation[]>([]);
  const [progressLogs, setProgressLogs] = useState<DailyProgressLog[]>([]);
  const [safetyLogs, setSafetyLogs] = useState<SafetyLog[]>([]);
  const [qualitySnags, setQualitySnags] = useState<QualitySnag[]>([]);
  const [qualityLogs, setQualityLogs] = useState<QualityLog[]>([]);
  const [formworkPanels, setFormworkPanels] = useState<AluminumFormworkPanel[]>([]);
  const [panelMovementLogs, setPanelMovementLogs] = useState<PanelMovementLog[]>([]);
  const [isOnline, setIsOnline] = useState(typeof window !== "undefined" ? navigator.onLine : true);
  const [isLoading, setIsLoading] = useState(true);

  // Shell UI parameters
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("erp_current_user_role");
      if (saved) return saved as UserRole;
    }
    return UserRole.HEAD_OFFICE;
  });
  const [selectedProject, setSelectedProject] = useState<string>("Addis Ababa Tower Block A");
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isAmharic, setIsAmharic] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showModulesMenu, setShowModulesMenu] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
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
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);

  // Security and Authentication session states
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("erp_is_authenticated") === "true";
    }
    return false;
  });
  const [sessionTimeoutMinutes, setSessionTimeoutMinutes] = useState(10);
  const [lastActivity, setLastActivity] = useState<number>(Date.now());
  const [loginMetadata, setLoginMetadata] = useState<{ loginTime: string; device: string; ip: string; gps: string } | null>(null);

  // App-wide Location permission gate states & tracking
  const [isCheckingLocation, setIsCheckingLocation] = useState<boolean>(false);
  const [locationGranted, setLocationGranted] = useState<boolean | null>(true);
  const [locationCoords, setLocationCoords] = useState<{ lat: number; lng: number; timestamp: string } | null>(null);

  const requestLocationPermission = React.useCallback(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      return;
    }

    setIsCheckingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          timestamp: new Date().toISOString()
        });
        setLocationGranted(true);
        setIsCheckingLocation(false);
      },
      (error) => {
        console.warn("Location permission denied or error:", error);
        setIsCheckingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  }, []);

  // Firebase Auth listener and real-time Firestore user profile synchronization (/users/{uid})
  useEffect(() => {
    if (!isFirebaseReady || !auth) {
      setIsAuthLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setIsAuthenticated(true);
        setIsAuthLoading(true);

        if (db) {
          const userDocRef = doc(db, "users", firebaseUser.uid);
          const unsubProfile = onSnapshot(
            userDocRef,
            (docSnap) => {
              if (docSnap.exists()) {
                const data = docSnap.data();

                let effectiveRole = (data.role as UserRole) || UserRole.WORKER;
                let effectiveStatus = data.status || "Pending";

                // Enforce Super Admin only for owner email
                const userEmailLower = (data.email || firebaseUser.email || "").toLowerCase();
                if (userEmailLower === "mejennur669@gmail.com") {
                  effectiveRole = UserRole.SUPER_ADMIN;
                  effectiveStatus = "Active";
                } else if (effectiveRole === UserRole.SUPER_ADMIN) {
                  effectiveRole = UserRole.HEAD_OFFICE;
                }

                if (effectiveStatus === "Active" && (effectiveRole === ("Pending" as any) || !effectiveRole) && data.requestedRole) {
                  effectiveRole = data.requestedRole as UserRole;
                }

                // Check RoleChangeApprovalService in case it was approved in app memory or Firestore
                if (effectiveRole === ("Pending" as any) && userEmailLower !== "mejennur669@gmail.com") {
                  try {
                    const reqs = RoleChangeApprovalService.getRequests();
                    const appReq = reqs.find(r => 
                      (r.userId === firebaseUser.uid || (data.email && r.userEmail?.toLowerCase() === data.email.toLowerCase())) &&
                      r.status === "Approved"
                    );
                    if (appReq) {
                      const approvedRole = (appReq.assignedRole || appReq.requestedRole) as UserRole;
                      if (approvedRole && approvedRole !== ("Pending" as any)) {
                        effectiveRole = approvedRole === UserRole.SUPER_ADMIN ? UserRole.HEAD_OFFICE : approvedRole;
                        effectiveStatus = "Active";
                        setDoc(userDocRef, { role: effectiveRole, status: "Active" }, { merge: true }).catch(err => console.error("Syncing approved role to Firestore failed:", err));
                      }
                    }
                  } catch (e) {
                    console.warn("Error checking RoleChangeApprovalService in onSnapshot:", e);
                  }
                }

                const profile: UserProfile = {
                  uid: firebaseUser.uid,
                  displayName: data.displayName || firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "Authenticated User",
                  role: effectiveRole,
                  requestedRole: data.requestedRole || "",
                  status: effectiveStatus,
                  email: data.email || firebaseUser.email || "",
                  phoneNumber: data.phoneNumber || firebaseUser.phoneNumber || "",
                  createdAt: data.createdAt
                };
                setCurrentUserProfile(profile);
                if (effectiveRole && effectiveRole !== ("Pending" as any)) {
                  setCurrentUserRole(effectiveRole);
                  if (typeof window !== "undefined") {
                    localStorage.setItem("erp_current_user_role", effectiveRole);
                  }
                }
              } else {
                const userEmailLower = (firebaseUser.email || "").toLowerCase();
                const isOwner = userEmailLower === "mejennur669@gmail.com";
                
                let initialRole: UserRole = isOwner ? UserRole.SUPER_ADMIN : ("Pending" as any);
                let initialStatus = isOwner ? "Active" : "Pending";

                const newUserProfileData = {
                  displayName: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "Registered User",
                  email: firebaseUser.email || "",
                  phoneNumber: firebaseUser.phoneNumber || "",
                  role: initialRole,
                  requestedRole: isOwner ? UserRole.SUPER_ADMIN : "Worker",
                  status: initialStatus,
                  createdAt: new Date().toISOString()
                };
                setDoc(userDocRef, newUserProfileData).catch((err) => {
                  console.error("Auto-creating user profile in Firestore failed:", err);
                });

                const profile: UserProfile = {
                  uid: firebaseUser.uid,
                  displayName: newUserProfileData.displayName,
                  role: initialRole,
                  requestedRole: newUserProfileData.requestedRole,
                  status: initialStatus,
                  email: newUserProfileData.email,
                  phoneNumber: newUserProfileData.phoneNumber,
                  createdAt: newUserProfileData.createdAt
                };
                setCurrentUserProfile(profile);
                if (initialRole && initialRole !== ("Pending" as any)) {
                  setCurrentUserRole(initialRole);
                }
              }
              setIsAuthLoading(false);
            },
            (error) => {
              handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
              // Fallback to local profile if Firestore profile read has error
              const profile: UserProfile = {
                uid: firebaseUser.uid,
                displayName: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "Authenticated User",
                role: "Pending" as UserRole,
                status: "Pending",
                email: firebaseUser.email || "",
                phoneNumber: firebaseUser.phoneNumber || "",
                createdAt: new Date().toISOString()
              };
              setCurrentUserProfile((prev) => prev || profile);
              setIsAuthLoading(false);
            }
          );
          return () => unsubProfile();
        } else {
          setIsAuthLoading(false);
        }
      } else {
        setIsAuthenticated(false);
        setCurrentUserProfile(null);
        setIsAuthLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    if (auth && auth.currentUser) {
      try {
        await signOut(auth);
      } catch (err) {
        console.error("Error signing out from Firebase Auth:", err);
      }
    }
    setIsAuthenticated(false);
    setCurrentUserProfile(null);
    setLocationGranted(null);
    setIsCheckingLocation(false);
    setLocationCoords(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("erp_is_authenticated");
      localStorage.removeItem("erp_current_user_role");
    }
    logAction("User Logged Out", "Operator requested secure closure of acting session.");
  };

  const handleRefreshProfile = async () => {
    if (auth?.currentUser && db) {
      setIsAuthLoading(true);
      try {
        const snap = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (snap.exists()) {
          const data = snap.data();
          const profile: UserProfile = {
            uid: auth.currentUser.uid,
            displayName: data.displayName || auth.currentUser.displayName || auth.currentUser.email?.split("@")[0] || "Authenticated User",
            role: (data.role as UserRole) || UserRole.WORKER,
            requestedRole: data.requestedRole || "",
            status: data.status || "Pending",
            email: data.email || auth.currentUser.email || "",
            phoneNumber: data.phoneNumber || auth.currentUser.phoneNumber || "",
            createdAt: data.createdAt
          };
          setCurrentUserProfile(profile);
          if (data.role && data.role !== "Pending") {
            setCurrentUserRole(data.role as UserRole);
          }
        }
      } catch (err) {
        console.error("Error refreshing user profile:", err);
      } finally {
        setIsAuthLoading(false);
      }
    }
  };

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
      "Project Planner & Scheduler": "Digital Construction ERP Aluminum Cycle Scheduler",
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
      "Finance ERP Hub": "Finance ERP Hub",
      "Mobile Apps": "Mobile Apps Hub",
      "Launch Readiness": "Commercial Launch Center",
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
      "Finance ERP Hub": "የፋይናንስ ኢአርፒ ማዕከል (Finance ERP)",
      "Mobile Apps": "የሞባይል መተግበሪያዎች (Mobile Apps Hub)",
      "Launch Readiness": "የንግድ ስራ ማስጀመሪያ (Launch Readiness)",
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
      "Trade": "የስራ ድርሻ",
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

  const allTabs = ["dashboard", "notificationCenter", "customInputHub", "workerProfiles", "enterpriseErp", "financeErp", "attendance", "biometricBoard", "fingerprintBoard", "biometricKiosk", "planning", "progress", "performance", "safetyQuality", "predictions", "admin", "auditLog", "aiInspection", "headOfficeSync", "siteLayout", "cadDrawing", "projectDocs", "surveying", "formworkManagement", "securitySettings", "mobileApps", "launchReadiness", "subcontractorPortal", "warehouseManagerApp", "storeOwnerApp"];

  const formworkAllowedRoles: UserRole[] = [
    UserRole.SUPER_ADMIN,
    UserRole.HEAD_OFFICE,
    UserRole.WAREHOUSE_MANAGER,
    UserRole.FINANCE_MANAGER
  ];

  const tabPermissions: Record<UserRole, string[]> = {
    [UserRole.SUPER_ADMIN]: allTabs,
    [UserRole.HEAD_OFFICE]: allTabs,
    [UserRole.PROJECT_MANAGER]: allTabs.filter(t => t !== "formworkManagement"),
    [UserRole.SITE_ENGINEER]: ["dashboard", "notificationCenter", "customInputHub", "planning", "progress", "safetyQuality", "aiInspection", "predictions", "siteLayout", "cadDrawing", "projectDocs", "surveying", "subcontractorPortal", "mobileApps"],
    [UserRole.SUPERVISOR]: ["dashboard", "notificationCenter", "customInputHub", "workerProfiles", "attendance", "biometricBoard", "biometricKiosk", "planning", "progress", "performance", "safetyQuality", "aiInspection", "siteLayout", "cadDrawing", "projectDocs", "surveying", "subcontractorPortal", "mobileApps"],
    [UserRole.TIME_KEEPER]: ["dashboard", "notificationCenter", "customInputHub", "workerProfiles", "attendance", "biometricBoard", "fingerprintBoard", "biometricKiosk", "performance", "progress", "mobileApps"],
    [UserRole.TEAM_LEADER]: ["dashboard", "notificationCenter", "customInputHub", "workerProfiles", "attendance", "progress", "safetyQuality", "siteLayout", "mobileApps"],
    [UserRole.GANG_CHIEF]: ["dashboard", "notificationCenter", "customInputHub", "attendance", "progress", "safetyQuality", "siteLayout", "mobileApps"],
    [UserRole.ASSEMBLER]: ["dashboard", "notificationCenter", "customInputHub", "attendance", "progress", "siteLayout", "mobileApps"],
    [UserRole.WAREHOUSE_MANAGER]: ["dashboard", "notificationCenter", "customInputHub", "warehouseManagerApp", "storeOwnerApp", "formworkManagement", "enterpriseErp", "projectDocs", "mobileApps", "launchReadiness"],
    [UserRole.STORE_OWNER]: ["dashboard", "notificationCenter", "customInputHub", "storeOwnerApp", "warehouseManagerApp", "projectDocs", "mobileApps"],
    [UserRole.STORE_MANAGER]: ["dashboard", "notificationCenter", "customInputHub", "storeOwnerApp", "warehouseManagerApp", "projectDocs", "mobileApps"],
    [UserRole.WORKER]: ["dashboard", "notificationCenter", "customInputHub", "workerProfiles", "attendance", "progress", "siteLayout", "mobileApps"],
    [UserRole.HR_MANAGER]: ["dashboard", "notificationCenter", "customInputHub", "workerProfiles", "attendance", "performance", "financeErp", "admin", "auditLog", "securitySettings", "mobileApps", "launchReadiness"],
    [UserRole.FINANCE_MANAGER]: ["dashboard", "notificationCenter", "customInputHub", "financeErp", "enterpriseErp", "workerProfiles", "attendance", "auditLog", "subcontractorPortal", "headOfficeSync", "formworkManagement", "mobileApps"],
    [UserRole.SECTION_HEAD]: ["dashboard", "notificationCenter", "customInputHub", "workerProfiles", "attendance", "planning", "progress", "performance", "safetyQuality", "siteLayout", "projectDocs", "subcontractorPortal", "mobileApps"],
    [UserRole.SURVEYOR]: ["dashboard", "notificationCenter", "customInputHub", "siteLayout", "cadDrawing", "projectDocs", "surveying", "mobileApps"],
    [UserRole.HSE_OFFICER]: ["dashboard", "notificationCenter", "customInputHub", "safetyQuality", "aiInspection", "workerProfiles", "attendance", "projectDocs", "securitySettings", "mobileApps"],
    [UserRole.DRIVER]: ["dashboard", "notificationCenter", "customInputHub", "attendance", "mobileApps"],
    [UserRole.AUDITOR]: ["dashboard", "notificationCenter", "customInputHub", "financeErp", "enterpriseErp", "auditLog", "workerProfiles", "attendance", "projectDocs", "mobileApps"]
  };

  const hasAccess = (tab: string): boolean => {
    if (tab === "formworkManagement") {
      return formworkAllowedRoles.includes(currentUserRole);
    }
    const permissions = tabPermissions[currentUserRole];
    if (permissions) {
      return permissions.includes(tab);
    }
    return true;
  };

  const t = (key: string): string => {
    const lang = isAmharic ? "am" : "en";
    return translations[lang][key] || key;
  };

  const isPendingUser = isAuthenticated && (
    currentUserProfile?.status === "Pending" || 
    currentUserProfile?.role === ("Pending" as any) || 
    currentUserRole === ("Pending" as any)
  ) && currentUserProfile?.email?.toLowerCase() !== "mejennur669@gmail.com";

  // Load master datasets from the real database service ONLY when user is authenticated & authorized
  React.useEffect(() => {
    if (!isAuthenticated || isPendingUser) {
      setIsLoading(false);
      return;
    }

    let active = true;
    async function loadAllData() {
      try {
        setIsLoading(true);
        const [
          fetchedWorkers,
          fetchedTeams,
          fetchedZones,
          fetchedAttendance,
          fetchedEvaluations,
          fetchedProgress,
          fetchedSafety,
          fetchedSnags,
          fetchedQuality,
          fetchedAudit,
          fetchedNotifications,
          fetchedFormworkPanels,
          fetchedPanelMovementLogs
        ] = await Promise.all([
          DbService.getWorkers(),
          DbService.getTeams(),
          DbService.getZones(),
          DbService.getAttendance(),
          DbService.getEvaluations(),
          DbService.getProgressLogs(),
          DbService.getSafetyLogs(),
          DbService.getQualitySnags(),
          DbService.getQualityLogs(),
          DbService.getAuditLogs(),
          DbService.getNotifications(),
          DbService.getFormworkPanels(),
          DbService.getPanelMovementLogs()
        ]);
        if (active) {
          setWorkers(fetchedWorkers);
          setTeams(fetchedTeams);
          setZones(fetchedZones);
          setAttendance(fetchedAttendance);
          setEvaluations(fetchedEvaluations);
          setProgressLogs(fetchedProgress);
          setSafetyLogs(fetchedSafety);
          setQualitySnags(fetchedSnags);
          setQualityLogs(fetchedQuality);
          setAuditLogs(fetchedAudit);
          setNotifications(fetchedNotifications);
          setFormworkPanels(fetchedFormworkPanels);
          setPanelMovementLogs(fetchedPanelMovementLogs);
        }
      } catch (e) {
        console.error("Error loading master datasets:", e);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }
    loadAllData();
    return () => {
      active = false;
    };
  }, [isAuthenticated, isPendingUser]);

  // Attach real-time onSnapshot listeners for formworkPanels and panelMovementLogs collections
  React.useEffect(() => {
    if (typeof window === "undefined" || !isAuthenticated || isPendingUser) return;

    console.log("[App.tsx] Subscribing to real-time formworkPanels and panelMovementLogs from DbService...");

    const unsubPanels = DbService.subscribeFormworkPanels((panels) => {
      console.log(`[App.tsx] Real-time listener updated formworkPanels state with ${panels.length} items. Passed to Dashboard.`);
      setFormworkPanels(panels);
    });

    const unsubLogs = DbService.subscribePanelMovementLogs((logs) => {
      console.log(`[App.tsx] Real-time listener updated panelMovementLogs state with ${logs.length} items. Passed to Dashboard.`);
      setPanelMovementLogs(logs);
    });

    return () => {
      console.log("[App.tsx] Cleaning up formworkPanels and panelMovementLogs listeners.");
      unsubPanels();
      unsubLogs();
    };
  }, [isAuthenticated, isPendingUser]);

  // Handle real-time workers list update from DbService or cross-component registrations
  React.useEffect(() => {
    if (typeof window === "undefined" || !isAuthenticated || isPendingUser) return;

    const syncWorkersList = async () => {
      try {
        const fresh = await DbService.getWorkers();
        if (fresh && fresh.length > 0) {
          setWorkers(fresh);
        }
      } catch (err) {
        console.error("Failed to sync workers in App.tsx:", err);
      }
    };

    window.addEventListener("workers_updated", syncWorkersList);
    window.addEventListener("storage", syncWorkersList);

    return () => {
      window.removeEventListener("workers_updated", syncWorkersList);
      window.removeEventListener("storage", syncWorkersList);
    };
  }, [isAuthenticated, isPendingUser]);

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

  // Poll notifications in the background for all authenticated users to receive real-time updates
  React.useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(async () => {
      try {
        const fetched = await DbService.getNotifications();
        setNotifications((prev) => {
          // Identify any notifications not currently in the state list
          const prevIds = new Set(prev.map(n => n.id));
          const newNotifs = fetched.filter(n => !prevIds.has(n.id));
          
          if (newNotifs.length > 0) {
            newNotifs.forEach(notif => {
              if (notif.type === "New Registrant") {
                triggerNotificationToast(
                  "New Registrant",
                  notif.message
                );
              }
            });
          }
          return fetched;
        });
      } catch (err) {
        console.error("Error polling notifications:", err);
      }
    }, 8000); // Check every 8 seconds

    return () => clearInterval(interval);
  }, [isAuthenticated, currentUserRole]);

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
      receiverAppAm = "ዲጂታል ኮንስትራክሽን ERP ዋና መስሪያ ቤት የደመና ዳታቤዝ";
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
    } else if (actLower.includes("registrant") || actLower.includes("new user") || actLower.includes("register")) {
      titleEn = "New Registrant Registered";
      titleAm = "አዲስ ተመዝጋቢ በሲስተሙ ላይ ገብቷል";
      descEn = details;
      descAm = details;
      senderApp = "Self-Registration Portal";
      senderAppAm = "የምዝገባ ማዕከል";
      receiverApp = "Admin & HQ Consoles";
      receiverAppAm = "የአስተዳደር እና የዋና መ/ቤት ሰሌዳ";
      type = "success";
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
    const logId = `AUD-${Date.now().toString().slice(-4)}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newLog: AuditLog = {
      id: logId,
      timestamp: new Date().toISOString().replace("T", " ").slice(0, 19),
      userId: currentUserProfile?.uid || (
        activeRole === UserRole.HEAD_OFFICE ? "HO-01" :
        activeRole === UserRole.PROJECT_MANAGER ? "PM-01" :
        activeRole === UserRole.SECTION_HEAD ? "SH-01" :
        activeRole === UserRole.SUPERVISOR ? "SV-01" :
        activeRole === UserRole.SITE_ENGINEER ? "SE-01" :
        activeRole === UserRole.SURVEYOR ? "SR-01" :
        activeRole === UserRole.TIME_KEEPER ? "TK-01" :
        activeRole === UserRole.TEAM_LEADER ? "TL-01" :
        activeRole === UserRole.GANG_CHIEF ? "GC-01" :
        activeRole === UserRole.WAREHOUSE_MANAGER ? "WM-01" :
        activeRole === UserRole.STORE_MANAGER ? "SM-01" : "W-101"
      ),
      userName: currentUserProfile?.displayName ? `${currentUserProfile.displayName} (${currentUserProfile.role})` : `${activeRole} User`,
      role: activeRole,
      action,
      details
    };

    // Restrict location capture strictly to attendance-related actions by field-level roles
    const actLower = action.toLowerCase();
    const isAttendanceAction = actLower.includes("attendance") || actLower.includes("clock");
    
    // Field-level attendance roles
    const fieldAttendanceRoles: (UserRole | string)[] = [
      UserRole.TEAM_LEADER,
      UserRole.GANG_CHIEF,
      UserRole.ASSEMBLER,
      UserRole.TIME_KEEPER,
      UserRole.WORKER
    ];

    const isFieldRole = fieldAttendanceRoles.includes(activeRole) ||
                        ["team leader", "gang chief", "assembler", "time keeper", "worker"].includes(String(activeRole).toLowerCase());

    const isSensitive = isAttendanceAction && isFieldRole;

    if (isSensitive) {
      newLog.gps = {
        latitude: 0,
        longitude: 0,
        status: "locating"
      };
    }

    setAuditLogs((prev) => [newLog, ...prev]);
    triggerNotificationToast(action, details);
    DbService.addAuditLog(newLog).catch(e => console.error("Error writing audit log:", e));

    // Fetch GPS coordinates asynchronously
    if (isSensitive) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const gps = {
              latitude: parseFloat(position.coords.latitude.toFixed(6)),
              longitude: parseFloat(position.coords.longitude.toFixed(6)),
              accuracy: Math.round(position.coords.accuracy),
              status: "acquired" as const
            };
            setAuditLogs((prevLogs) =>
              prevLogs.map((log) => (log.id === logId ? { ...log, gps } : log))
            );
            DbService.addAuditLog({ ...newLog, gps }).catch(e => console.error(e));
          },
          (error) => {
            console.warn("Geolocation failed or denied:", error);
            const statusVal = error.code === error.PERMISSION_DENIED ? ("denied" as const) : ("unavailable" as const);
            const gps = {
              latitude: 0,
              longitude: 0,
              status: statusVal
            };
            setAuditLogs((prevLogs) =>
              prevLogs.map((log) => (log.id === logId ? { ...log, gps } : log))
            );
            DbService.addAuditLog({ ...newLog, gps }).catch(e => console.error(e));
          },
          { enableHighAccuracy: true, timeout: 4500, maximumAge: 0 }
        );
      } else {
        // No geolocation API available on device
        const gps = {
          latitude: 0,
          longitude: 0,
          status: "unavailable" as const
        };
        setAuditLogs((prevLogs) =>
          prevLogs.map((log) => (log.id === logId ? { ...log, gps } : log))
        );
        DbService.addAuditLog({ ...newLog, gps }).catch(e => console.error(e));
      }
    }
  };

  // State Manipulation Handlers
  const handleAddAttendance = async (record: AttendanceRecord) => {
    setAttendance((prev) => {
      const exists = prev.some((r) => r.id === record.id);
      if (exists) {
        return prev.map((r) => (r.id === record.id ? record : r));
      }
      return [record, ...prev];
    });
    await DbService.addAttendanceRecord(record);
    logAction("Biometric Attendance Logged", `Clocked ${record.checkOut ? "OUT" : "IN"} worker ${record.workerName} via ${record.method}. Status: ${record.status}`);
  };

  const handleUpdateZone = async (updatedZone: ProjectZone) => {
    setZones((prev) => prev.map((z) => (z.id === updatedZone.id ? updatedZone : z)));
    await DbService.updateZone(updatedZone);
    logAction("Zone Plan Updated", `Updated completion stats for Zone ${updatedZone.zone} on floor ${updatedZone.floor}. Overall Completion: ${updatedZone.completionPercentage}%`);
  };

  const handleAddZone = async (newZone: ProjectZone) => {
    setZones((prev) => {
      if (prev.some((z) => z.id === newZone.id)) return prev;
      return [...prev, newZone];
    });
    await DbService.updateZone(newZone);
    logAction("New Zone Created", `Created structural project zone ${newZone.id} in building ${newZone.building}`);
  };

  const handleAddLog = async (newLog: DailyProgressLog) => {
    setProgressLogs((prev) => [newLog, ...prev]);
    await DbService.addProgressLog(newLog);
    logAction("Daily Progress Logged", `Logged formwork metrics for ${newLog.zone}. Installed: ${newLog.installedPanels} panels, Stripped: ${newLog.removedPanels} panels.`);
  };

  const handleAddEvaluation = async (newEval: PerformanceEvaluation) => {
    setEvaluations((prev) => [newEval, ...prev]);
    await DbService.addEvaluation(newEval);
    logAction("Worker Performance Evaluated", `Evaluated worker ${newEval.workerName}. Overall Score: ${newEval.totalScore}/100. Rank: ${newEval.level}`);
  };

  const handleAddSafetyLog = async (newSafetyLog: SafetyLog) => {
    setSafetyLogs((prev) => [newSafetyLog, ...prev]);
    await DbService.addSafetyLog(newSafetyLog);
    logAction("Safety Audit Registered", `Logged safety Toolbox topic: "${newSafetyLog.toolboxTopic}". Daily Safety Compliance Index: ${newSafetyLog.safetyScore}%`);
  };

  const handleAddSnag = async (newSnag: QualitySnag) => {
    setQualitySnags((prev) => [newSnag, ...prev]);
    await DbService.addQualitySnag(newSnag);
    logAction("Quality Snag Logged", `Reported structural defect: "${newSnag.description}" under category "${newSnag.defectType}"`);
  };

  const handleResolveSnag = async (snagId: string) => {
    setQualitySnags((prev) => 
      prev.map((snag) => snag.id === snagId ? { ...snag, status: "Resolved" } : snag)
    );
    const target = qualitySnags.find(s => s.id === snagId);
    if (target) {
      await DbService.updateQualitySnag({ ...target, status: "Resolved" });
    }
    logAction("Quality Snag Resolved", `Marked outstanding defect ID: ${snagId} as Resolved & verified.`);
  };

  // Admin roster operations
  const handleAddWorker = async (w: Worker) => {
    setWorkers((prev) => [w, ...prev.filter(existing => existing.id !== w.id)]);
    await DbService.addWorker(w);
    logAction("Worker Registered", `Added/Updated worker ${w.name} (${w.trade}) to department ${w.department}`);

    // Create a system notification so Admin and Head Office can see the new registrant
    const newNotif: SystemNotification = {
      id: `NOTIF-REG-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      type: "New Registrant",
      title: isAmharic ? `አዲስ ተመዝጋቢ: ${w.name}` : `New Registrant: ${w.name}`,
      message: isAmharic 
        ? `አዲስ ሰራተኛ ${w.name} (${w.trade || w.department}) በሲስተሙ ላይ ተመዝግቧል። መለያ ቁጥር: ${w.id}`
        : `New staff member ${w.name} (${w.trade || w.department}) has registered on the system. ID: ${w.id}`,
      timestamp: new Date().toISOString(),
      read: false
    };

    try {
      await DbService.addNotification(newNotif);
      setNotifications((prev) => [newNotif, ...prev]);

      // Create Enterprise Notification for Admin, Head Office, and HR
      NotificationService.createNotification({
        title: `New Registrant: ${w.name}`,
        titleAm: `አዲስ ተመዝጋቢ: ${w.name}`,
        description: `New staff member ${w.name} (${w.position || w.trade || w.department || "Staff"}) has registered on the ERP system. ID: ${w.id}`,
        descriptionAm: `አዲስ ሰራተኛ/ተመዝጋቢ ${w.name} (${w.position || w.trade || w.department || "ሰራተኛ"}) በሲስተሙ ላይ ተመዝግቧል። መለያ ቁጥር: ${w.id}`,
        category: "User Approval Notifications",
        priority: "High",
        status: "Unread",
        projectName: selectedProject || "Global System",
        siteName: "Worker Enrollment Kiosk",
        sender: w.name,
        senderRole: String(w.position || w.trade || "Registered Worker"),
        receiver: "Admin, Head Office & HR",
        targetRoles: [
          UserRole.SUPER_ADMIN,
          UserRole.HEAD_OFFICE,
          UserRole.HR_MANAGER,
          "Admin",
          "Head Office",
          "HR Manager",
          "HR"
        ],
        deliveryChannels: { inApp: true, push: true, email: true, sms: false },
        actionTab: "admin"
      });
      
      // Also trigger a toast instantly for current user if they are admin, head office, or HR
      if (
        currentUserRole === UserRole.SUPER_ADMIN || 
        currentUserRole === UserRole.HEAD_OFFICE ||
        currentUserRole === UserRole.HR_MANAGER
      ) {
        triggerNotificationToast("New Registrant", newNotif.message);
      }
    } catch (e) {
      console.error("Error writing system notification for registrant:", e);
    }
  };

  const handleCreateNotification = React.useCallback(async (notifData: any) => {
    try {
      if (NotificationService && NotificationService.createNotification) {
        NotificationService.createNotification(notifData);
      }
      const sysNotif: SystemNotification = {
        id: `n-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
        type: "Inspection Due",
        title: notifData.title || "Material Event",
        message: notifData.description || notifData.title || "",
        timestamp: new Date().toISOString(),
        read: false
      };
      await DbService.addNotification(sysNotif);
      setNotifications((prev) => [sysNotif, ...prev]);
    } catch (err) {
      console.error("Error creating notification in App.tsx:", err);
    }
  }, []);

  const handleMarkAsReadNotification = React.useCallback(async (id: string) => {
    setNotifications((prev) => {
      const updated = prev.map((n) => {
        if (n.id === id) {
          const currentReadBy = Array.isArray(n.readBy) ? n.readBy : [];
          const newReadBy = currentReadBy.includes(currentUserRole)
            ? currentReadBy
            : [...currentReadBy, currentUserRole];
          return {
            ...n,
            read: true,
            status: "Read",
            readBy: newReadBy
          };
        }
        return n;
      });

      const target = updated.find((n) => n.id === id);
      if (target) {
        DbService.updateNotification(target).catch((e) =>
          console.error("Error updating notification in Firestore:", e)
        );
      }
      return updated;
    });
  }, [currentUserRole]);

  const handleMarkAllAsReadNotifications = React.useCallback(async () => {
    setNotifications((prev) => {
      const updated = prev.map((n) => {
        const currentReadBy = Array.isArray(n.readBy) ? n.readBy : [];
        const newReadBy = currentReadBy.includes(currentUserRole)
          ? currentReadBy
          : [...currentReadBy, currentUserRole];
        return {
          ...n,
          read: true,
          status: "Read",
          readBy: newReadBy
        };
      });

      updated.forEach((n) => {
        DbService.updateNotification(n).catch((e) =>
          console.error("Error updating notification in Firestore:", e)
        );
      });
      return updated;
    });
  }, [currentUserRole]);

  const handleUpdateWorker = async (updatedWorker: Worker) => {
    setWorkers((prev) => prev.map((w) => (w.id === updatedWorker.id ? updatedWorker : w)));
    await DbService.updateWorker(updatedWorker);
    logAction("Worker Profile Updated", `Modified credentials/skills for ${updatedWorker.name} (${updatedWorker.id})`);
  };

  const handleDeleteWorker = async (id: string) => {
    const worker = workers.find(w => w.id === id);
    setWorkers((prev) => prev.filter((w) => w.id !== id));
    await DbService.deleteWorker(id);
    logAction("Worker Terminated", `Removed worker ${worker ? worker.name : id} from organization roster`);
  };

  const handleAddTeam = async (team: Team) => {
    setTeams((prev) => [...prev, team]);
    await DbService.addTeam(team);
    logAction("Construction Team Created", `Registered team "${team.name}" in department ${team.department}`);
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100 font-sans relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30" />
        <div className="relative z-10 flex flex-col items-center space-y-6 max-w-md px-6 text-center">
          <div className="p-4 bg-red-600/10 border border-red-500/30 text-red-500 rounded-2xl shadow-xl shadow-red-600/10 animate-pulse">
            <RefreshCw size={40} className="animate-spin text-red-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white leading-tight">
              {isAmharic ? "የተጠቃሚ መለያ በማረጋገጥ ላይ..." : "Authenticating User Profile..."}
            </h2>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed font-mono">
              {isAmharic 
                ? "እባክዎ የደመና መለያዎ እና የፍቃድ ደረጃዎ እስኪረጋገጥ ድረስ ይጠብቁ..." 
                : "Synchronizing auth session & user profile snapshot from Firestore..."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <LoginScreen
        isAmharic={isAmharic}
        onLanguageToggle={() => setIsAmharic(!isAmharic)}
        auditLogsCount={auditLogs.length}
        onLoginSuccess={(role, method, loginLog) => {
          // Unlock ERP session - prioritize active non-pending profile role
          let activeRole = role;
          if (currentUserProfile?.role && currentUserProfile.role !== ("Pending" as any) && currentUserProfile.status === "Active") {
            activeRole = currentUserProfile.role;
          } else if (role === ("Pending" as any) && currentUserRole && currentUserRole !== ("Pending" as any)) {
            activeRole = currentUserRole;
          }

          setCurrentUserRole(activeRole);
          setIsAuthenticated(true);
          setLoginMetadata(loginLog);
          setLocationGranted(null);
          setIsCheckingLocation(false);

          if (!auth?.currentUser && !currentUserProfile) {
            setCurrentUserProfile({
              uid: "demo-" + activeRole,
              displayName: `${activeRole} User`,
              role: activeRole,
              status: "Active",
              email: `${activeRole.toLowerCase()}@ovid.et`
            });
          }

          if (typeof window !== "undefined") {
            localStorage.setItem("erp_is_authenticated", "true");
            localStorage.setItem("erp_current_user_role", activeRole);
          }
          logAction("User Secure Login", `Method: ${method} | Acted as Acting Role: ${activeRole} | Metadata: ${JSON.stringify(loginLog)}`, activeRole);

          // Fetch fresh data in the background
          Promise.all([
            DbService.getWorkers(),
            DbService.getAuditLogs(),
            DbService.getNotifications()
          ]).then(([fetchedWorkers, fetchedAudit, fetchedNotifications]) => {
            setWorkers(fetchedWorkers);
            setAuditLogs(fetchedAudit);
            setNotifications(fetchedNotifications);
          }).catch((err) => {
            console.error("Error refreshing data on login success in background:", err);
          });
        }}
      />
    );
  }

  // App-wide Location Permission Gate disabled for general navigation

  if (isPendingUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100 font-sans relative overflow-hidden p-6">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30" />
        
        <div className="relative z-10 max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6 text-center">
          <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 text-amber-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-amber-500/10">
            <ShieldAlert size={32} />
          </div>

          <div className="space-y-2">
            <span className="text-[10px] uppercase font-black tracking-widest text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
              {isAmharic ? "መለያ በማጽደቅ ሂደት ላይ" : "Account Pending Approval"}
            </span>
            <h2 className="text-xl font-extrabold text-white tracking-tight">
              {isAmharic ? "እንኳን ደህና መጡ!" : "Welcome to Digital Construction ERP"}
            </h2>
            <p className="text-sm font-semibold text-slate-300">
              {currentUserProfile?.displayName || auth?.currentUser?.email || "User"}
            </p>
          </div>

          <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800/80 text-left space-y-2 text-xs font-sans">
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-500">{isAmharic ? "ኢሜል:" : "Email:"}</span>
              <span className="font-mono text-slate-300">{currentUserProfile?.email || auth?.currentUser?.email || "N/A"}</span>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-500">{isAmharic ? "ስልክ:" : "Phone:"}</span>
              <span className="font-mono text-slate-300">{currentUserProfile?.phoneNumber || "N/A"}</span>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-500">{isAmharic ? "የተጠየቀው የስራ ድርሻ:" : "Requested Role:"}</span>
              <span className="font-bold text-amber-400 font-mono">{currentUserProfile?.requestedRole || "Super Admin"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{isAmharic ? "የስርዓት ሁኔታ:" : "System Status:"}</span>
              <span className="font-bold text-amber-400 font-mono">Pending Approval</span>
            </div>
          </div>

          {/* Account Approval Status Panel */}
          {currentUserProfile?.email?.toLowerCase() === "mejennur669@gmail.com" ? (
            <div className="bg-slate-800/80 p-4 rounded-xl border border-amber-500/30 text-left space-y-3">
              <div className="flex items-center space-x-2 text-amber-400 font-bold text-xs">
                <ShieldCheck size={16} />
                <span>{isAmharic ? "የስርዓት ባለቤት ማፅደቂያ (Owner Self-Activation)" : "Owner Self-Activation"}</span>
              </div>
              <div className="grid grid-cols-1 gap-2 pt-1">
                <button
                  onClick={() => {
                    setCurrentUserRole(UserRole.SUPER_ADMIN);
                    if (currentUserProfile) {
                      setCurrentUserProfile({
                        ...currentUserProfile,
                        status: "Active",
                        role: UserRole.SUPER_ADMIN
                      });
                    }
                    if (typeof window !== "undefined") {
                      localStorage.setItem("erp_current_user_role", UserRole.SUPER_ADMIN);
                    }
                    if (db && auth?.currentUser?.uid) {
                      setDoc(doc(db, "users", auth.currentUser.uid), {
                        status: "Active",
                        role: UserRole.SUPER_ADMIN
                      }, { merge: true }).catch(err => console.error("Error updating owner status in Firestore:", err));
                    }
                  }}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-lg shadow-emerald-600/20"
                >
                  <CheckCircle2 size={16} />
                  <span>{isAmharic ? "መለያዬን አግብር (Super Admin)" : "Activate Account as Super Admin"}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-amber-950/40 p-4 rounded-xl border border-amber-500/30 text-left space-y-2">
              <div className="flex items-center space-x-2 text-amber-400 font-bold text-xs">
                <Clock size={16} />
                <span>{isAmharic ? "የማጽደቅ ሂደት በማካሄድ ላይ (Awaiting Approval)" : "Awaiting Manager Approval"}</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                {isAmharic
                  ? "መለያዎ በአድሚን (Super Admin)፣ በዋና መሥሪያ ቤት ሥራ አስኪያጅ (Head Office Manager) ወይም በሰው ኃይል ኃላፊ (HR Manager) እስከሚፀድቅ ድረስ 'Pending' ደረጃ ላይ ይቆያል።"
                  : "Your account will remain in 'Pending' state until it is approved by a Super Admin, Head Office Manager, or HR Manager."}
              </p>
            </div>
          )}

          <p className="text-xs text-slate-400 leading-relaxed font-sans">
            {isAmharic 
              ? "የመለያ ጥያቄዎ በተሳካ ሁኔታ ተመዝግቧል። የዋና መስሪያ ቤት አስተዳዳሪ ወይም የሰው ኃይል ኃላፊ የስራ ድርሻዎን ሲያፀድቁ የመተግበሪያው አገልግሎት ወዲያውኑ ይከፈታል።" 
              : "Your registration was successful. An Administrator or HR Manager must assign your system role before access to the ERP dashboard is granted."}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={handleRefreshProfile}
              className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-lg shadow-red-600/20"
            >
              <RefreshCw size={14} />
              <span>{isAmharic ? "ሁኔታውን አድስ" : "Check Status"}</span>
            </button>
            <button
              onClick={handleLogout}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 px-4 rounded-xl text-xs transition-all flex items-center justify-center space-x-2 cursor-pointer border border-slate-700"
            >
              <Lock size={14} />
              <span>{isAmharic ? "ውጣ" : "Sign Out"}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100 font-sans relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30" />
        <div className="relative z-10 flex flex-col items-center space-y-6 max-w-md px-6 text-center">
          <div className="p-4 bg-red-600/10 border border-red-500/30 text-red-500 rounded-2xl shadow-xl shadow-red-600/10 animate-pulse">
            <RefreshCw size={40} className="animate-spin text-red-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white leading-tight">
              {isAmharic ? "መረጃ በመጫን ላይ..." : "Loading ERP Core Database..."}
            </h2>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed font-mono">
              {isAmharic 
                ? "እባክዎ የደመና መረጃ ቋት እና የደህንነት መቆጣጠሪያ እስኪመሳሰሉ ድረስ ይጠብቁ።" 
                : "Synchronizing state registries with secure Digital Construction ERP construction telemetry database..."}
            </p>
          </div>
        </div>
      </div>
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
              <span className="text-xs uppercase tracking-widest font-black text-red-600">{isAmharic ? "ዲጂታል ኮንስትራክሽን ERP ሲስተም" : "Digital Construction ERP System"}</span>
              <h1 className="text-sm font-extrabold text-slate-900 tracking-tight leading-none">
                Aluminum Formwork Attendance & Productivity System
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Locked Duty Profile Badge */}
            <div className="flex items-center space-x-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
              <div className="relative">
                <UserCheck size={14} className="text-red-600 ml-1 shrink-0" />
                <div className="absolute -bottom-1 -right-1 bg-red-600 text-white rounded-full p-[2px] border border-white">
                  <Lock size={6} />
                </div>
              </div>
              <div className="text-left leading-none pr-2">
                <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wider flex items-center gap-1">
                  {isAmharic ? "የተጠቃሚ መለያ" : "Active Profile"}
                </span>
                <div className="text-xs font-bold font-sans text-slate-700 mt-0.5">
                  {currentUserProfile?.displayName || (
                    <>
                      {currentUserRole === UserRole.HEAD_OFFICE && (isAmharic ? "ዋና መስሪያ ቤት" : "Head Office Admin")}
                      {currentUserRole === UserRole.PROJECT_MANAGER && (isAmharic ? "የፕሮጀክት ሥራ አስኪያጅ" : "Project Manager")}
                      {currentUserRole === UserRole.SECTION_HEAD && (isAmharic ? "የክፍል ኃላፊ" : "Section Head")}
                      {currentUserRole === UserRole.SUPERVISOR && (isAmharic ? "ሱፐርቫይዘር" : "Supervisor")}
                      {currentUserRole === UserRole.SITE_ENGINEER && (isAmharic ? "ሳይት መሃንዲስ" : "Site Engineer")}
                      {currentUserRole === UserRole.SURVEYOR && (isAmharic ? "ሰርቬየር" : "Surveyor")}
                      {currentUserRole === UserRole.TEAM_LEADER && (isAmharic ? "የስራ ቡድን መሪ" : "Team Leader")}
                      {currentUserRole === UserRole.GANG_CHIEF && (isAmharic ? "ጋንግ ቺፍ / ፎርማን" : "Gang Chief")}
                      {currentUserRole === UserRole.TIME_KEEPER && (isAmharic ? "የመገኘት ተቆጣጣሪ" : "Time Keeper")}
                      {currentUserRole === UserRole.WORKER && (isAmharic ? "ሳይት ሰራተኛ" : "Worker")}
                      {currentUserRole === UserRole.SUPER_ADMIN && (isAmharic ? "ሱፐር አድሚን" : "Super Admin")}
                      {currentUserRole === UserRole.WAREHOUSE_MANAGER && (isAmharic ? "የመጋዘን ሥራ አስኪያጅ" : "Warehouse Manager")}
                      {currentUserRole === UserRole.STORE_MANAGER && (isAmharic ? "የሳይት ስቶር አቃቤ" : "Store Manager")}
                      {currentUserRole === UserRole.HR_MANAGER && (isAmharic ? "የሰው ኃይል ኃላፊ" : "HR Manager")}
                      {currentUserRole === UserRole.FINANCE_MANAGER && (isAmharic ? "የፋይናንስ ኃላፊ" : "Finance Manager")}
                    </>
                  )}
                  {currentUserProfile?.role && (
                    <span className="text-[10px] text-slate-500 font-normal ml-1">
                      ({currentUserProfile.role})
                    </span>
                  )}
                </div>
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

            {/* Enterprise Notification Bell Dropdown */}
            <NotificationBellDropdown
              currentUserRole={currentUserRole}
              selectedProject={selectedProject || "ALL"}
              onNavigateToHub={() => setActiveTab("notificationCenter")}
              onNavigateToTab={(tabName) => setActiveTab(tabName)}
              systemNotifications={notifications}
              onMarkAsRead={handleMarkAsReadNotification}
              onMarkAllAsRead={handleMarkAllAsReadNotifications}
            />

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
              onClick={handleLogout}
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
            
            {/* Left Sidebar Toggle Button */}
            <button
              onClick={() => setIsSidebarOpen(prev => !prev)}
              className={`px-3 py-2 rounded-lg flex items-center space-x-1.5 transition-all cursor-pointer font-extrabold shrink-0 my-1 border ${
                isSidebarOpen 
                  ? "bg-slate-800 text-red-400 border-slate-700 hover:bg-slate-750" 
                  : "bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700"
              }`}
              title={isAmharic ? "የግራ ሳይድባር ማውጫ ክፈት/ዝጋ" : "Toggle Left Navigation Sidebar"}
            >
              <Grid size={15} className="text-red-400" />
              <span>{isAmharic ? (isSidebarOpen ? "ሳይድባር ደብቅ" : "የግራ ማውጫ (1-30)") : (isSidebarOpen ? "Hide Sidebar" : "Left Menu (1-30)")}</span>
            </button>

            {/* Quick Modules Menu Modal Launcher */}
            <button
              onClick={() => setShowModulesMenu(true)}
              className="px-3 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg flex items-center space-x-1.5 transition-all cursor-pointer font-black shrink-0 my-1 shadow-md shadow-red-600/30 border border-red-400/40"
            >
              <Grid size={16} className="animate-pulse" />
              <span>{isAmharic ? "ሁሉንም ክፍሎች ክፈት (All Modules)" : "All Modules Menu"}</span>
            </button>

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

            {/* Enterprise Notification Center Tab */}
            {tabPermissions[currentUserRole]?.includes("notificationCenter") && (
              <button
                id="tab-btn-notification-center"
                onClick={() => setActiveTab("notificationCenter")}
                className={`px-4 py-3 flex items-center space-x-1.5 transition-colors cursor-pointer border-b-2 ${
                  activeTab === "notificationCenter" ? "text-white border-amber-500 bg-slate-800 font-bold" : "border-transparent hover:text-white hover:bg-slate-800"
                }`}
              >
                <Bell size={15} className="text-amber-400" />
                <span className="flex items-center gap-1.5">
                  <span>{isAmharic ? "ማስታወቂያዎች Center" : "Notifications Center"}</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 font-black text-[10px]">
                    {NotificationService.getUnreadCount(currentUserRole, selectedProject)}
                  </span>
                </span>
              </button>
            )}

            {/* Custom Data Input Hub Tab */}
            {tabPermissions[currentUserRole]?.includes("customInputHub") && (
              <button
                onClick={() => setActiveTab("customInputHub")}
                className={`px-4 py-3 flex items-center space-x-1.5 transition-colors cursor-pointer border-b-2 ${
                  activeTab === "customInputHub" ? "text-white border-emerald-500 bg-slate-800 font-bold" : "border-transparent hover:text-white hover:bg-slate-800"
                }`}
              >
                <PlusCircle size={15} className="text-emerald-400" />
                <span>{isAmharic ? "የመረጃ ግብአት ማዕከል" : "Data Input Hub"}</span>
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

            {/* Finance ERP Hub Tab */}
            {tabPermissions[currentUserRole]?.includes("financeErp") && (
              <button
                onClick={() => setActiveTab("financeErp")}
                className={`px-4 py-3 flex items-center space-x-1.5 transition-colors cursor-pointer border-b-2 ${
                  activeTab === "financeErp" ? "text-white border-red-500 bg-slate-800 font-bold" : "border-transparent hover:text-white hover:bg-slate-800"
                }`}
              >
                <DollarSign size={15} className="text-red-500 animate-pulse" />
                <span className="flex items-center gap-1">
                  {t("Finance ERP Hub")}
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

            {/* Aluminum Formwork Management Tab */}
            {tabPermissions[currentUserRole]?.includes("formworkManagement") && (
              <button
                onClick={() => setActiveTab("formworkManagement")}
                className={`px-4 py-3 flex items-center space-x-1.5 transition-colors cursor-pointer border-b-2 ${
                  activeTab === "formworkManagement" ? "text-white border-red-500 bg-slate-800 font-bold" : "border-transparent hover:text-white hover:bg-slate-800"
                }`}
              >
                <Grid size={15} className="text-red-500 animate-pulse" />
                <span>{isAmharic ? "አሉሚኒየም ፎርምወርክ" : "Formwork Assets"}</span>
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

            {/* Mobile Apps Tab */}
            {tabPermissions[currentUserRole]?.includes("mobileApps") && (
              <button
                onClick={() => setActiveTab("mobileApps")}
                className={`px-4 py-3 flex items-center space-x-1.5 text-indigo-400 transition-colors cursor-pointer border-b-2 ${
                  activeTab === "mobileApps" ? "text-white border-red-500 bg-slate-800" : "border-transparent hover:text-white hover:bg-slate-800"
                }`}
              >
                <Smartphone size={15} />
                <span>{t("Mobile Apps")}</span>
              </button>
            )}

            {/* Launch Readiness Tab */}
            {tabPermissions[currentUserRole]?.includes("launchReadiness") && (
              <button
                onClick={() => setActiveTab("launchReadiness")}
                className={`px-4 py-3 flex items-center space-x-1.5 text-orange-400 transition-colors cursor-pointer border-b-2 ${
                  activeTab === "launchReadiness" ? "text-white border-red-500 bg-slate-800" : "border-transparent hover:text-white hover:bg-slate-800"
                }`}
              >
                <Rocket size={15} />
                <span>{t("Launch Readiness")}</span>
              </button>
            )}

            {/* Subcontractor Portal Tab */}
            {tabPermissions[currentUserRole]?.includes("subcontractorPortal") && (
              <button
                onClick={() => setActiveTab("subcontractorPortal")}
                className={`px-4 py-3 flex items-center space-x-1.5 text-amber-500 transition-colors cursor-pointer border-b-2 ${
                  activeTab === "subcontractorPortal" ? "text-white border-red-500 bg-slate-800 font-bold" : "border-transparent hover:text-white hover:bg-slate-800"
                }`}
              >
                <Briefcase size={15} className="text-red-500 animate-pulse" />
                <span>{isAmharic ? "ንዑስ ተቋራጭ ፖርታል" : "Subcontractor Portal"}</span>
              </button>
            )}

            {/* Warehouse Manager App Tab */}
            {tabPermissions[currentUserRole]?.includes("warehouseManagerApp") && (
              <button
                onClick={() => setActiveTab("warehouseManagerApp")}
                className={`px-4 py-3 flex items-center space-x-1.5 text-amber-400 transition-colors cursor-pointer border-b-2 ${
                  activeTab === "warehouseManagerApp" ? "text-white border-amber-500 bg-slate-800 font-bold" : "border-transparent hover:text-white hover:bg-slate-800"
                }`}
              >
                <Building2 size={15} className="text-amber-400 animate-pulse" />
                <span>{isAmharic ? "የመጋዘን አስተዳዳሪ መተግበሪያ" : "Warehouse Manager App"}</span>
              </button>
            )}

            {/* Store Owner App Tab */}
            {tabPermissions[currentUserRole]?.includes("storeOwnerApp") && (
              <button
                onClick={() => setActiveTab("storeOwnerApp")}
                className={`px-4 py-3 flex items-center space-x-1.5 text-amber-500 transition-colors cursor-pointer border-b-2 ${
                  activeTab === "storeOwnerApp" ? "text-white border-amber-500 bg-slate-800 font-bold" : "border-transparent hover:text-white hover:bg-slate-800"
                }`}
              >
                <Store size={15} className="text-amber-500" />
                <span>{isAmharic ? "የሳይት ስቶር አቃቤ መተግበሪያ" : "Site Store Owner App"}</span>
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

      {/* PRIMARY VIEWS LAYOUT CONTAINER WITH LEFT NAVIGATION SIDEBAR */}
      <div className="flex flex-grow w-full max-w-[1700px] mx-auto relative">
        
        {/* LEFT NAVIGATION SIDEBAR (Lists all 30 Modules clearly in Amharic & English) */}
        {isSidebarOpen && (
          <aside className="w-72 bg-slate-900 border-r border-slate-800 text-slate-200 shrink-0 flex flex-col no-print shadow-xl sticky top-0 max-h-screen overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
            {/* Sidebar Header */}
            <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80 sticky top-0 z-10 backdrop-blur-md">
              <div className="flex items-center space-x-2">
                <Grid size={18} className="text-red-500 animate-pulse" />
                <span className="font-extrabold text-xs text-white uppercase tracking-wider">
                  {isAmharic ? "የሲስተም ክፍሎች (30 ERP Modules)" : "ERP Modules (1-30)"}
                </span>
              </div>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer text-xs border border-slate-700"
                title={isAmharic ? "ሳይድባሩን ደብቅ" : "Collapse Sidebar"}
              >
                <X size={14} />
              </button>
            </div>

            {/* Sidebar Content: 5 Sections containing all 30 Modules */}
            <div className="p-3 space-y-5 text-xs">
              
              {/* Section 1: Core Administration & HR (1-6) */}
              <div>
                <h4 className="text-[11px] font-black uppercase tracking-wider text-red-400 mb-2 flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                  <ShieldCheck size={13} />
                  <span>{isAmharic ? "1. ዋና አስተዳደር፣ የሰው ኃይል እና ደህንነት (ክፍል 1-6)" : "Core Admin & HR (1-6)"}</span>
                </h4>
                <div className="space-y-1">
                  {[
                    { id: "dashboard", num: 1, nameEn: "Dashboard", nameAm: "1. ዳሽቦርድ (Dashboard)", icon: Activity },
                    { id: "workerProfiles", num: 2, nameEn: "Worker Profiles", nameAm: "2. የሰራተኞች መገለጫዎች (Worker Profiles)", icon: Users },
                    { id: "customInputHub", num: 3, nameEn: "Data Input Hub", nameAm: "3. የመረጃ ግብአት ማዕከል (Data Input Hub)", icon: PlusCircle },
                    { id: "notificationCenter", num: 4, nameEn: "Notifications Center", nameAm: "4. የማስታወቂያዎች ማዕከል (Notifications Center)", icon: Bell },
                    { id: "admin", num: 5, nameEn: "Admin Role Approval", nameAm: "5. የአድሚን ማፅደቂያ ቦርድ (Admin Role Approval)", icon: Settings },
                    { id: "securitySettings", num: 6, nameEn: "Security & Settings", nameAm: "6. ደህንነት እና ምርጫዎች (Security & Settings)", icon: Shield },
                  ].map(item => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full text-left px-2.5 py-2 rounded-xl transition-all flex items-center space-x-2 cursor-pointer font-bold ${
                          isActive 
                            ? "bg-red-600 text-white shadow-md shadow-red-950/50" 
                            : "hover:bg-slate-800/80 text-slate-300 hover:text-white"
                        }`}
                      >
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono shrink-0 ${
                          isActive ? "bg-red-700 text-white" : "bg-slate-800 text-slate-400"
                        }`}>
                          #{item.num}
                        </span>
                        <Icon size={14} className={isActive ? "text-white" : "text-red-400"} />
                        <span className="truncate text-xs">{isAmharic ? item.nameAm : `${item.num}. ${item.nameEn}`}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Section 2: Warehouse, Store & Enterprise ERP (7-12) */}
              <div>
                <h4 className="text-[11px] font-black uppercase tracking-wider text-amber-400 mb-2 flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                  <Store size={13} />
                  <span>{isAmharic ? "2. መጋዘን፣ ስቶር እና የኢንተርፕራይዝ ERP (ክፍል 7-12)" : "Warehouse & ERP (7-12)"}</span>
                </h4>
                <div className="space-y-1">
                  {[
                    { id: "warehouseManagerApp", num: 7, nameEn: "Warehouse Manager App", nameAm: "7. የመጋዘን አስተዳዳሪ (Warehouse Manager App)", icon: Building2 },
                    { id: "storeOwnerApp", num: 8, nameEn: "Store Owner App", nameAm: "8. የሳይት ስቶር አቃቤ (Store Owner App)", icon: Store },
                    { id: "enterpriseErp", num: 9, nameEn: "Enterprise ERP Suite", nameAm: "9. ኢንተርፕራይዝ ERP Suite (Enterprise ERP Suite)", icon: Cpu },
                    { id: "financeErp", num: 10, nameEn: "Finance ERP Hub", nameAm: "10. የፋይናንስ ERP Hub (Finance ERP Hub)", icon: DollarSign },
                    { id: "headOfficeSync", num: 11, nameEn: "Real-Time Cloud Sync", nameAm: "11. የደመና መረጃ ሲንክ (Real-Time Cloud Sync)", icon: Database },
                    { id: "auditLog", num: 12, nameEn: "Audit Log", nameAm: "12. ኦዲት መዝገብ (Audit Log)", icon: ShieldCheck },
                  ].map(item => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full text-left px-2.5 py-2 rounded-xl transition-all flex items-center space-x-2 cursor-pointer font-bold ${
                          isActive 
                            ? "bg-amber-600 text-white shadow-md shadow-amber-950/50" 
                            : "hover:bg-slate-800/80 text-slate-300 hover:text-white"
                        }`}
                      >
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono shrink-0 ${
                          isActive ? "bg-amber-700 text-white" : "bg-slate-800 text-slate-400"
                        }`}>
                          #{item.num}
                        </span>
                        <Icon size={14} className={isActive ? "text-white" : "text-amber-400"} />
                        <span className="truncate text-xs">{isAmharic ? item.nameAm : `${item.num}. ${item.nameEn}`}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Section 3: Site Operations & Engineering (13-18) */}
              <div>
                <h4 className="text-[11px] font-black uppercase tracking-wider text-blue-400 mb-2 flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                  <Building2 size={13} />
                  <span>{isAmharic ? "3. የግንባታ፣ ፎርምወርክ እና ንድፎች (ክፍል 13-18)" : "Engineering & Site (13-18)"}</span>
                </h4>
                <div className="space-y-1">
                  {[
                    { id: "formworkManagement", num: 13, nameEn: "Formwork Management", nameAm: "13. አሉሚኒየም ፎርምወርክ (Formwork Management)", icon: Grid },
                    { id: "projectDocs", num: 14, nameEn: "Project Docs & CAD", nameAm: "14. የፕሮጀክት ሰነዶች & CAD (Project Docs & CAD)", icon: FileText },
                    { id: "cadDrawing", num: 15, nameEn: "CAD Drawings & Photos", nameAm: "15. የካድ ንድፎች እና ፎቶዎች (CAD Drawings & Photos)", icon: FileText },
                    { id: "siteLayout", num: 16, nameEn: "Site Layout", nameAm: "16. የሳይት ሌይአውት (Site Layout)", icon: Compass },
                    { id: "surveying", num: 17, nameEn: "Surveying & Concrete", nameAm: "17. ሰርቬይንግ እና ኮንክሪት (Surveying & Concrete)", icon: Compass },
                    { id: "subcontractorPortal", num: 18, nameEn: "Subcontractor Portal", nameAm: "18. ንዑስ ተቋራጭ ፖርታል (Subcontractor Portal)", icon: Briefcase },
                  ].filter(item => hasAccess(item.id)).map(item => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full text-left px-2.5 py-2 rounded-xl transition-all flex items-center space-x-2 cursor-pointer font-bold ${
                          isActive 
                            ? "bg-blue-600 text-white shadow-md shadow-blue-950/50" 
                            : "hover:bg-slate-800/80 text-slate-300 hover:text-white"
                        }`}
                      >
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono shrink-0 ${
                          isActive ? "bg-blue-700 text-white" : "bg-slate-800 text-slate-400"
                        }`}>
                          #{item.num}
                        </span>
                        <Icon size={14} className={isActive ? "text-white" : "text-blue-400"} />
                        <span className="truncate text-xs">{isAmharic ? item.nameAm : `${item.num}. ${item.nameEn}`}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Section 4: Field Operations & Attendance (19-24) */}
              <div>
                <h4 className="text-[11px] font-black uppercase tracking-wider text-purple-400 mb-2 flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                  <Fingerprint size={13} />
                  <span>{isAmharic ? "4. የመገኘት፣ ባዮሜትሪክስ እና እቅድ (ክፍል 19-24)" : "Attendance & Field (19-24)"}</span>
                </h4>
                <div className="space-y-1">
                  {[
                    { id: "attendance", num: 19, nameEn: "Attendance & Clock-In", nameAm: "19. የመገኘት መዝገብ (Attendance & Clock-In)", icon: Fingerprint },
                    { id: "biometricKiosk", num: 20, nameEn: "Biometric Kiosk Scanner", nameAm: "20. ባዮሜትሪክ ኪዮስክ (Biometric Kiosk Scanner)", icon: ScanLine },
                    { id: "fingerprintBoard", num: 21, nameEn: "Fingerprint Board", nameAm: "21. የጣት አሻራ ቦርድ (Fingerprint Board)", icon: Fingerprint },
                    { id: "biometricBoard", num: 22, nameEn: "Biometric Board", nameAm: "22. ባዮሜትሪክ ቦርድ (Biometric Board)", icon: Fingerprint },
                    { id: "planning", num: 23, nameEn: "Planning & Gantt", nameAm: "23. የግንባታ እቅድ & Gantt (Planning & Gantt)", icon: Calendar },
                    { id: "progress", num: 24, nameEn: "Daily Progress Logs", nameAm: "24. ዕለታዊ የዕድገት መዝገብ (Daily Progress Logs)", icon: Layers },
                  ].map(item => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full text-left px-2.5 py-2 rounded-xl transition-all flex items-center space-x-2 cursor-pointer font-bold ${
                          isActive 
                            ? "bg-purple-600 text-white shadow-md shadow-purple-950/50" 
                            : "hover:bg-slate-800/80 text-slate-300 hover:text-white"
                        }`}
                      >
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono shrink-0 ${
                          isActive ? "bg-purple-700 text-white" : "bg-slate-800 text-slate-400"
                        }`}>
                          #{item.num}
                        </span>
                        <Icon size={14} className={isActive ? "text-white" : "text-purple-400"} />
                        <span className="truncate text-xs">{isAmharic ? item.nameAm : `${item.num}. ${item.nameEn}`}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Section 5: AI Inspection, Analytics & Mobile Apps (25-30) */}
              <div>
                <h4 className="text-[11px] font-black uppercase tracking-wider text-rose-400 mb-2 flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                  <Sparkles size={13} />
                  <span>{isAmharic ? "5. አይአይ ቁጥጥር፣ ትንበያ እና ሞባይል (ክፍል 25-30)" : "AI & Mobile Apps (25-30)"}</span>
                </h4>
                <div className="space-y-1">
                  {[
                    { id: "aiInspection", num: 25, nameEn: "AI Photo Inspection", nameAm: "25. አይአይ ፎቶ ቁጥጥር (AI Photo Inspection)", icon: Camera },
                    { id: "predictions", num: 26, nameEn: "AI Predictive Analytics", nameAm: "26. አይአይ ትንበያዎች (AI Predictive Analytics)", icon: Sparkles },
                    { id: "performance", num: 27, nameEn: "Performance Evaluation", nameAm: "27. የሰራተኞች ግምገማ (Performance Evaluation)", icon: UserCheck },
                    { id: "safetyQuality", num: 28, nameEn: "Safety & Quality", nameAm: "28. ደህንነት እና ጥራት (Safety & Quality)", icon: ShieldAlert },
                    { id: "mobileApps", num: 29, nameEn: "Mobile Apps Suite", nameAm: "29. የሞባይል መተግበሪያዎች (Mobile Apps Suite)", icon: Smartphone },
                    { id: "launchReadiness", num: 30, nameEn: "Launch Readiness", nameAm: "30. ማስጀመሪያ ዝግጁነት (Launch Readiness)", icon: Rocket },
                  ].map(item => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full text-left px-2.5 py-2 rounded-xl transition-all flex items-center space-x-2 cursor-pointer font-bold ${
                          isActive 
                            ? "bg-rose-600 text-white shadow-md shadow-rose-950/50" 
                            : "hover:bg-slate-800/80 text-slate-300 hover:text-white"
                        }`}
                      >
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono shrink-0 ${
                          isActive ? "bg-rose-700 text-white" : "bg-slate-800 text-slate-400"
                        }`}>
                          #{item.num}
                        </span>
                        <Icon size={14} className={isActive ? "text-white" : "text-rose-400"} />
                        <span className="truncate text-xs">{isAmharic ? item.nameAm : `${item.num}. ${item.nameEn}`}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>
          </aside>
        )}

        {/* MAIN VIEW CONTENT CONTAINER */}
        <main className="px-4 sm:px-6 lg:px-8 py-8 flex-grow w-full overflow-x-hidden">
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
            formworkPanels={formworkPanels}
            panelMovementLogs={panelMovementLogs}
            onAddAttendance={handleAddAttendance}
          />
        )}

        {activeTab === "workerProfiles" && (
          <WorkerProfiles
            workers={workers}
            zones={zones}
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
            currentUserProfile={currentUserProfile}
            onLogAction={(action, details) => logAction(action, details)}
          />
        )}

        {activeTab === "financeErp" && (
          <FinanceErpHub 
            isAmharic={isAmharic}
            currentUserRole={currentUserRole}
            workers={workers}
            attendance={attendance}
            teams={teams}
            zones={zones}
            onLogAction={(action, details) => logAction(action, details)}
            onSwitchRole={(newRole) => setCurrentUserRole(newRole)}
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
            formworkPanels={formworkPanels}
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
            auditLogs={auditLogs}
            onLogAction={(action, details) => logAction(action, details)}
            teams={teams}
            onSwitchRole={(newRole) => setCurrentUserRole(newRole)}
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
            systemNotifications={notifications}
          />
        )}

        {activeTab === "biometricKiosk" && (
          <BiometricEnrollmentKiosk 
            workers={workers} 
            attendance={attendance} 
            onAddAttendance={handleAddAttendance} 
            onEnrollWorker={handleAddWorker}
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
            workers={workers}
            progressLogs={progressLogs}
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

        {activeTab === "formworkManagement" && (
          <FormworkManagement
            isAmharic={isAmharic}
            currentUserRole={currentUserRole}
            currentUserName={currentUserProfile?.displayName || `${currentUserRole} User`}
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
            workers={workers}
            progressLogs={progressLogs}
          />
        )}

        {activeTab === "customInputHub" && (
          <CustomInputGovernanceHub 
            isAmharic={isAmharic}
            currentUserRole={currentUserRole}
            onLogAction={(action, details) => logAction(action, details)}
          />
        )}

        {activeTab === "admin" && (
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

        {activeTab === "auditLog" && (
          <AuditLogView 
            logs={auditLogs} 
            isAmharic={isAmharic}
            t={t}
          />
        )}

        {activeTab === "mobileApps" && (
          <MobileAppsHub 
            isAmharic={isAmharic}
            currentUserRole={currentUserRole}
            onLogAction={(action, details) => logAction(action, details)}
            workers={workers}
            teams={teams}
            onAddSnag={(newSnag) => setQualitySnags(prev => [newSnag, ...prev])}
            onNavigateToTab={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === "launchReadiness" && (
          <LaunchReadinessHub 
            isAmharic={isAmharic}
            currentUserRole={currentUserRole}
            onLogAction={(action, details) => logAction(action, details)}
          />
        )}

        {activeTab === "subcontractorPortal" && (
          <SubcontractorPortal 
            workers={workers}
            zones={zones}
            attendance={attendance}
            qualitySnags={qualitySnags}
            progressLogs={progressLogs}
            isAmharic={isAmharic}
            currentUserRole={currentUserRole}
            onAddLog={handleAddLog}
            onAddSnag={handleAddSnag}
            onUpdateZone={handleUpdateZone}
            onLogAction={(action, details) => logAction(action, details)}
          />
        )}

        {activeTab === "notificationCenter" && (
          <EnterpriseNotificationCenter
            currentUserRole={currentUserRole}
            selectedProject={selectedProject || "ALL"}
            onNavigateToTab={(tabName) => setActiveTab(tabName)}
            onLogAudit={(action, details) => logAction(action, details)}
            systemNotifications={notifications}
            onMarkAsRead={handleMarkAsReadNotification}
            onMarkAllAsRead={handleMarkAllAsReadNotifications}
          />
        )}

        {activeTab === "securitySettings" && (
          <SecuritySettingsHub 
            isAmharic={isAmharic}
            currentUserRole={currentUserRole}
            onLogAction={(action, details) => logAction(action, details)}
            auditLogs={auditLogs}
            sessionTimeoutMinutes={sessionTimeoutMinutes}
            onChangeSessionTimeout={(mins) => setSessionTimeoutMinutes(mins)}
          />
        )}

        {activeTab === "warehouseManagerApp" && (
          <StoreOwnerApp
            isAmharic={isAmharic}
            currentUserRole={currentUserRole}
            workers={workers}
            initialMode="warehouse_manager"
            onLogAction={(action, details) => logAction(action, details)}
            onCreateNotification={handleCreateNotification}
          />
        )}

        {activeTab === "storeOwnerApp" && (
          <StoreOwnerApp
            isAmharic={isAmharic}
            currentUserRole={currentUserRole}
            workers={workers}
            initialMode="store_owner"
            onLogAction={(action, details) => logAction(action, details)}
            onCreateNotification={handleCreateNotification}
          />
        )}
      </main>
      </div>

      {/* FOOTER SECTION */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-400 no-print">
        <div className="max-w-7xl mx-auto px-4 space-y-1">
          <p>© {new Date().getFullYear()} Digital Construction ERP System. All rights reserved. Aluminum Formwork Productivity Command Hub.</p>
          <p className="font-semibold text-slate-500">
            {isAmharic 
              ? `የአድሚን መተግበሪያ በ${currentUserProfile?.displayName || "ዲጂታል ኮንስትራክሽን ኢአርፒ"} የተገነባ` 
              : `Admin App developed by: ${currentUserProfile?.displayName || "Digital Construction ERP Engineering"}`} 
            {" "}| {isAmharic ? "ስልክ:" : "Phone:"} 0910097862 / 0920843843
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

      {/* SYSTEM MODULES GRID NAVIGATION MODAL / DRAWER */}
      <AnimatePresence>
        {showModulesMenu && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 sticky top-0 z-10">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-red-600/20 border border-red-500/30 text-red-500 rounded-xl">
                    <Grid size={22} />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-white tracking-tight">
                      {isAmharic ? "የሲስተሙ ክፍሎች እና መተግበሪያዎች ማውጫ" : "Digital Construction ERP System Modules"}
                    </h3>
                    <p className="text-xs text-slate-400 font-sans">
                      {isAmharic 
                        ? "ለመግባት የሚፈልጉትን የሲስተም ክፍል ይምረጡ (የአሁኑ የስራ ድርሻ: " + currentUserRole + ")" 
                        : "Select any system module to access immediately (Active Role: " + currentUserRole + ")"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowModulesMenu(false)}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-colors cursor-pointer border border-slate-700"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modules Grid Container */}
              <div className="p-6 overflow-y-auto space-y-6 scrollbar-thin scrollbar-thumb-slate-700">
                
                {/* Section 1: Core Administration, HR & Security (1-6) */}
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-red-500 mb-3 flex items-center gap-1.5 border-b border-slate-800 pb-2">
                    <ShieldCheck size={14} />
                    <span>{isAmharic ? "1. ዋና አስተዳደር፣ የሰው ኃይል እና ደህንነት (ክፍል 1-6)" : "Core Administration & HR (1-6)"}</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    
                    {hasAccess("dashboard") && (
                      <button
                        onClick={() => { setActiveTab("dashboard"); setShowModulesMenu(false); }}
                        className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between group ${
                          activeTab === "dashboard" ? "bg-red-950/40 border-red-500 shadow-md shadow-red-900/20" : "bg-slate-850/60 hover:bg-slate-800 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="p-2 bg-red-500/10 text-red-400 rounded-lg group-hover:scale-110 transition-transform">
                            <Activity size={18} />
                          </div>
                          <span className="font-extrabold text-sm text-white">{isAmharic ? "1. ዳሽቦርድ" : "1. Dashboard"}</span>
                        </div>
                        <p className="text-xs text-slate-400 leading-normal">
                          {isAmharic ? "የአሉሚኒየም ፎርምወርክ እና አጠቃላይ የሳይት ሁኔታ ማጠቃለያ" : "Formwork status, attendance, and site KPIs"}
                        </p>
                      </button>
                    )}

                    {hasAccess("workerProfiles") && (
                      <button
                        onClick={() => { setActiveTab("workerProfiles"); setShowModulesMenu(false); }}
                        className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between group ${
                          activeTab === "workerProfiles" ? "bg-red-950/40 border-red-500 shadow-md shadow-red-900/20" : "bg-slate-850/60 hover:bg-slate-800 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="p-2 bg-red-500/10 text-red-400 rounded-lg group-hover:scale-110 transition-transform">
                            <Users size={18} />
                          </div>
                          <span className="font-extrabold text-sm text-white">{isAmharic ? "2. የሰራተኞች መገለጫዎች" : "2. Worker Profiles"}</span>
                        </div>
                        <p className="text-xs text-slate-400 leading-normal">
                          {isAmharic ? "የሰራተኞች መረጃ፣ ምዝገባ እና የሰው ኃይል (HR) ማኔጅመንት" : "Staff Directory, IDs, trades, and HR operations"}
                        </p>
                      </button>
                    )}

                    {hasAccess("customInputHub") && (
                      <button
                        onClick={() => { setActiveTab("customInputHub"); setShowModulesMenu(false); }}
                        className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between group ${
                          activeTab === "customInputHub" ? "bg-emerald-950/40 border-emerald-500 shadow-md shadow-emerald-900/20" : "bg-slate-850/60 hover:bg-slate-800 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg group-hover:scale-110 transition-transform">
                            <PlusCircle size={18} />
                          </div>
                          <span className="font-extrabold text-sm text-white">{isAmharic ? "3. የመረጃ ግብአት ማዕከል" : "3. Data Input Hub"}</span>
                        </div>
                        <p className="text-xs text-slate-400 leading-normal">
                          {isAmharic ? "አዳዲስ መረጃዎችን፣ ዕቃዎችንና ሪፖርቶችን ማስገቢያ" : "Custom input forms for quick data entry"}
                        </p>
                      </button>
                    )}

                    {hasAccess("notificationCenter") && (
                      <button
                        onClick={() => { setActiveTab("notificationCenter"); setShowModulesMenu(false); }}
                        className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between group ${
                          activeTab === "notificationCenter" ? "bg-amber-950/40 border-amber-500 shadow-md shadow-amber-900/20" : "bg-slate-850/60 hover:bg-slate-800 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg group-hover:scale-110 transition-transform">
                            <Bell size={18} />
                          </div>
                          <span className="font-extrabold text-sm text-white">{isAmharic ? "4. ማስታወቂያዎች ማዕከል" : "4. Notifications Center"}</span>
                        </div>
                        <p className="text-xs text-slate-400 leading-normal">
                          {isAmharic ? "የሲስተም መልእክቶች፣ ጥያቄዎችና ማስጠንቀቂያዎች" : "System notifications, alerts & task messages"}
                        </p>
                      </button>
                    )}

                    {hasAccess("admin") && (
                      <button
                        onClick={() => { setActiveTab("admin"); setShowModulesMenu(false); }}
                        className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between group ${
                          activeTab === "admin" ? "bg-red-950/40 border-red-500 shadow-md shadow-red-900/20" : "bg-slate-850/60 hover:bg-slate-800 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg group-hover:scale-110 transition-transform">
                            <Settings size={18} />
                          </div>
                          <span className="font-extrabold text-sm text-white">{isAmharic ? "5. የአድሚን ማፅደቂያ ቦርድ" : "5. Admin Role Approval"}</span>
                        </div>
                        <p className="text-xs text-slate-400 leading-normal">
                          {isAmharic ? "የአዲስ ተመዝጋቢዎች ድርሻ ማፅደቅ እና የደህንነት ቅንብሮች" : "User role approvals, permissions & security hub"}
                        </p>
                      </button>
                    )}

                    {hasAccess("securitySettings") && (
                      <button
                        onClick={() => { setActiveTab("securitySettings"); setShowModulesMenu(false); }}
                        className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between group ${
                          activeTab === "securitySettings" ? "bg-red-950/40 border-red-500 shadow-md shadow-red-900/20" : "bg-slate-850/60 hover:bg-slate-800 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="p-2 bg-red-500/10 text-red-400 rounded-lg group-hover:scale-110 transition-transform">
                            <Shield size={18} />
                          </div>
                          <span className="font-extrabold text-sm text-white">{isAmharic ? "6. ደህንነት እና ምርጫዎች" : "6. Security & Settings"}</span>
                        </div>
                        <p className="text-xs text-slate-400 leading-normal">
                          {isAmharic ? "የሲስተም ደህንነት፣ ፓስወርድና ፍቃዶች" : "Security policies, PIN codes & app preferences"}
                        </p>
                      </button>
                    )}

                  </div>
                </div>

                {/* Section 2: Store, Inventory & Enterprise ERP (7-12) */}
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-amber-400 mb-3 flex items-center gap-1.5 border-b border-slate-800 pb-2">
                    <Store size={14} />
                    <span>{isAmharic ? "2. መጋዘን፣ ስቶር እና የኢንተርፕራይዝ ERP (ክፍል 7-12)" : "Warehouse, Store & Enterprise ERP (7-12)"}</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    
                    {hasAccess("warehouseManagerApp") && (
                      <button
                        onClick={() => { setActiveTab("warehouseManagerApp"); setShowModulesMenu(false); }}
                        className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between group ${
                          activeTab === "warehouseManagerApp" ? "bg-amber-950/40 border-amber-500 shadow-md shadow-amber-900/20" : "bg-slate-850/60 hover:bg-slate-800 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg group-hover:scale-110 transition-transform">
                            <Building2 size={18} />
                          </div>
                          <span className="font-extrabold text-sm text-white">{isAmharic ? "7. የመጋዘን አስተዳዳሪ" : "7. Warehouse Manager App"}</span>
                        </div>
                        <p className="text-xs text-slate-400 leading-normal">
                          {isAmharic ? "የአሉሚኒየም ፎርምወርክ ፓነሎች፣ መለዋወጫዎችና መጋዘን" : "Warehouse stock, panel transfers and inventory"}
                        </p>
                      </button>
                    )}

                    {hasAccess("storeOwnerApp") && (
                      <button
                        onClick={() => { setActiveTab("storeOwnerApp"); setShowModulesMenu(false); }}
                        className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between group ${
                          activeTab === "storeOwnerApp" ? "bg-amber-950/40 border-amber-500 shadow-md shadow-amber-900/20" : "bg-slate-850/60 hover:bg-slate-800 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg group-hover:scale-110 transition-transform">
                            <Store size={18} />
                          </div>
                          <span className="font-extrabold text-sm text-white">{isAmharic ? "8. የሳይት ስቶር አቃቤ" : "8. Store Owner App"}</span>
                        </div>
                        <p className="text-xs text-slate-400 leading-normal">
                          {isAmharic ? "የሳይት ስቶር መሳሪያዎች፣ የዕቃዎች ጥያቄና ወጪ" : "Site store issuance, tool checkouts & stock"}
                        </p>
                      </button>
                    )}

                    {hasAccess("enterpriseErp") && (
                      <button
                        onClick={() => { setActiveTab("enterpriseErp"); setShowModulesMenu(false); }}
                        className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between group ${
                          activeTab === "enterpriseErp" ? "bg-red-950/40 border-red-500 shadow-md shadow-red-900/20" : "bg-slate-850/60 hover:bg-slate-800 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="p-2 bg-red-500/10 text-red-400 rounded-lg group-hover:scale-110 transition-transform">
                            <Cpu size={18} />
                          </div>
                          <span className="font-extrabold text-sm text-white">{isAmharic ? "9. ኢንተርፕራይዝ ERP Suite" : "9. Enterprise ERP Suite"}</span>
                        </div>
                        <p className="text-xs text-slate-400 leading-normal">
                          {isAmharic ? "የዋና መስሪያ ቤት አጠቃላይ የኢንተርፕራይዝ ሲስተም" : "Centralized corporate executive suite"}
                        </p>
                      </button>
                    )}

                    {hasAccess("financeErp") && (
                      <button
                        onClick={() => { setActiveTab("financeErp"); setShowModulesMenu(false); }}
                        className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between group ${
                          activeTab === "financeErp" ? "bg-emerald-950/40 border-emerald-500 shadow-md shadow-emerald-900/20" : "bg-slate-850/60 hover:bg-slate-800 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg group-hover:scale-110 transition-transform">
                            <DollarSign size={18} />
                          </div>
                          <span className="font-extrabold text-sm text-white">{isAmharic ? "10. የፋይናንስ ERP Hub" : "10. Finance ERP Hub"}</span>
                        </div>
                        <p className="text-xs text-slate-400 leading-normal">
                          {isAmharic ? "የደመወዝ ክፍያ (Payroll)፣ በጀትና የገንዘብ ወጪዎች" : "Payroll processing, budgets & expense management"}
                        </p>
                      </button>
                    )}

                    {hasAccess("headOfficeSync") && (
                      <button
                        onClick={() => { setActiveTab("headOfficeSync"); setShowModulesMenu(false); }}
                        className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between group ${
                          activeTab === "headOfficeSync" ? "bg-cyan-950/40 border-cyan-500 shadow-md shadow-cyan-900/20" : "bg-slate-850/60 hover:bg-slate-800 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-lg group-hover:scale-110 transition-transform">
                            <Database size={18} />
                          </div>
                          <span className="font-extrabold text-sm text-white">{isAmharic ? "11. የደመና መረጃ ሲንክ" : "11. Real-Time Cloud Sync"}</span>
                        </div>
                        <p className="text-xs text-slate-400 leading-normal">
                          {isAmharic ? "የዋና መስሪያ ቤትና የሳይቶች አውቶማቲክ መረጃ ማመሳሰያ" : "Real-time cross-site cloud synchronization"}
                        </p>
                      </button>
                    )}

                    {hasAccess("auditLog") && (
                      <button
                        onClick={() => { setActiveTab("auditLog"); setShowModulesMenu(false); }}
                        className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between group ${
                          activeTab === "auditLog" ? "bg-emerald-950/40 border-emerald-500 shadow-md shadow-emerald-900/20" : "bg-slate-850/60 hover:bg-slate-800 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg group-hover:scale-110 transition-transform">
                            <ShieldCheck size={18} />
                          </div>
                          <span className="font-extrabold text-sm text-white">{isAmharic ? "12. ኦዲት መዝገብ (Audit Log)" : "12. Audit Log"}</span>
                        </div>
                        <p className="text-xs text-slate-400 leading-normal">
                          {isAmharic ? "የተከናወኑ ስራዎች፣ ለውጦችና የደህንነት ኦዲት መዝገብ" : "System changes, security logs & action history"}
                        </p>
                      </button>
                    )}

                  </div>
                </div>

                {/* Section 3: Site Construction, Formwork & Engineering (13-18) */}
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-blue-400 mb-3 flex items-center gap-1.5 border-b border-slate-800 pb-2">
                    <Building2 size={14} />
                    <span>{isAmharic ? "3. የግንባታ፣ ፎርምወርክ እና ንድፎች (ክፍል 13-18)" : "Site Operations & Engineering (13-18)"}</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    
                    {hasAccess("formworkManagement") && (
                      <button
                        onClick={() => { setActiveTab("formworkManagement"); setShowModulesMenu(false); }}
                        className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between group ${
                          activeTab === "formworkManagement" ? "bg-blue-950/40 border-blue-500 shadow-md shadow-blue-900/20" : "bg-slate-850/60 hover:bg-slate-800 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg group-hover:scale-110 transition-transform">
                            <Grid size={18} />
                          </div>
                          <span className="font-extrabold text-sm text-white">{isAmharic ? "13. አሉሚኒየም ፎርምወርክ" : "13. Formwork Management"}</span>
                        </div>
                        <p className="text-xs text-slate-400 leading-normal">
                          {isAmharic ? "የፓነሎች ገጠማ፣ ማንሳት (Stripping) እና የቦታዎች ቁጥጥር" : "Panel tracking, erection, stripping & maintenance"}
                        </p>
                      </button>
                    )}

                    {hasAccess("projectDocs") && (
                      <button
                        onClick={() => { setActiveTab("projectDocs"); setShowModulesMenu(false); }}
                        className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between group ${
                          activeTab === "projectDocs" ? "bg-blue-950/40 border-blue-500 shadow-md shadow-blue-900/20" : "bg-slate-850/60 hover:bg-slate-800 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg group-hover:scale-110 transition-transform">
                            <FileText size={18} />
                          </div>
                          <span className="font-extrabold text-sm text-white">{isAmharic ? "14. የፕሮጀክት ሰነዶች & CAD" : "14. Project Docs & CAD"}</span>
                        </div>
                        <p className="text-xs text-slate-400 leading-normal">
                          {isAmharic ? "የህንፃ ንድፎች (Blueprints)፣ ሰነዶችና ኮንትራቶች" : "CAD drawings, architectural files & contract vault"}
                        </p>
                      </button>
                    )}

                    {hasAccess("cadDrawing") && (
                      <button
                        onClick={() => { setActiveTab("cadDrawing"); setShowModulesMenu(false); }}
                        className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between group ${
                          activeTab === "cadDrawing" ? "bg-indigo-950/40 border-indigo-500 shadow-md shadow-indigo-900/20" : "bg-slate-850/60 hover:bg-slate-800 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg group-hover:scale-110 transition-transform">
                            <FileText size={18} />
                          </div>
                          <span className="font-extrabold text-sm text-white">{isAmharic ? "15. የካድ ንድፎች እና ፎቶዎች" : "15. CAD Drawings & Photos"}</span>
                        </div>
                        <p className="text-xs text-slate-400 leading-normal">
                          {isAmharic ? "የካድ ንድፎች፣ ዲዛይኖችና የሳይት ፎቶዎች" : "Architectural CAD plans & daily site photos"}
                        </p>
                      </button>
                    )}

                    {hasAccess("siteLayout") && (
                      <button
                        onClick={() => { setActiveTab("siteLayout"); setShowModulesMenu(false); }}
                        className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between group ${
                          activeTab === "siteLayout" ? "bg-blue-950/40 border-blue-500 shadow-md shadow-blue-900/20" : "bg-slate-850/60 hover:bg-slate-800 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg group-hover:scale-110 transition-transform">
                            <Compass size={18} />
                          </div>
                          <span className="font-extrabold text-sm text-white">{isAmharic ? "16. የሳይት ሌይአውት (Site Layout)" : "16. Site Layout"}</span>
                        </div>
                        <p className="text-xs text-slate-400 leading-normal">
                          {isAmharic ? "የህንፃዎች፣ ብሎኮችና ዞኖች አቀማመጥ ንድፍ" : "Interactive building 3D/2D zone layout map"}
                        </p>
                      </button>
                    )}

                    {hasAccess("surveying") && (
                      <button
                        onClick={() => { setActiveTab("surveying"); setShowModulesMenu(false); }}
                        className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between group ${
                          activeTab === "surveying" ? "bg-cyan-950/40 border-cyan-500 shadow-md shadow-cyan-900/20" : "bg-slate-850/60 hover:bg-slate-800 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-lg group-hover:scale-110 transition-transform">
                            <Compass size={18} />
                          </div>
                          <span className="font-extrabold text-sm text-white">{isAmharic ? "17. ሰርቬይንግ እና ኮንክሪት" : "17. Surveying & Concrete"}</span>
                        </div>
                        <p className="text-xs text-slate-400 leading-normal">
                          {isAmharic ? "የሰርቬይንግ ልኬቶችና የኮንክሪት ሙሌት ዝግጁነት" : "Surveying coordinates, levels & concrete pouring checks"}
                        </p>
                      </button>
                    )}

                    {hasAccess("subcontractorPortal") && (
                      <button
                        onClick={() => { setActiveTab("subcontractorPortal"); setShowModulesMenu(false); }}
                        className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between group ${
                          activeTab === "subcontractorPortal" ? "bg-indigo-950/40 border-indigo-500 shadow-md shadow-indigo-900/20" : "bg-slate-850/60 hover:bg-slate-800 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg group-hover:scale-110 transition-transform">
                            <Briefcase size={18} />
                          </div>
                          <span className="font-extrabold text-sm text-white">{isAmharic ? "18. ንዑስ ተቋራጭ ፖርታል" : "18. Subcontractor Portal"}</span>
                        </div>
                        <p className="text-xs text-slate-400 leading-normal">
                          {isAmharic ? "የንዑስ ተቋራጮች ስራዎች፣ ክፍያዎችና ውሎች" : "Subcontractor task tracking & progress claims"}
                        </p>
                      </button>
                    )}

                  </div>
                </div>

                {/* Section 4: Field Operations, Attendance & Planning (19-24) */}
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-purple-400 mb-3 flex items-center gap-1.5 border-b border-slate-800 pb-2">
                    <Fingerprint size={14} />
                    <span>{isAmharic ? "4. የመገኘት፣ ባዮሜትሪክስ እና እቅድ (ክፍል 19-24)" : "Field Operations & Attendance (19-24)"}</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    
                    {hasAccess("attendance") && (
                      <button
                        onClick={() => { setActiveTab("attendance"); setShowModulesMenu(false); }}
                        className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between group ${
                          activeTab === "attendance" ? "bg-purple-950/40 border-purple-500 shadow-md shadow-purple-900/20" : "bg-slate-850/60 hover:bg-slate-800 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg group-hover:scale-110 transition-transform">
                            <Fingerprint size={18} />
                          </div>
                          <span className="font-extrabold text-sm text-white">{isAmharic ? "19. የመገኘት መዝገብ" : "19. Attendance & Clock-In"}</span>
                        </div>
                        <p className="text-xs text-slate-400 leading-normal">
                          {isAmharic ? "የሰራተኞች እለታዊ የመግቢያና መውጫ ሰዓት መቆጣጠሪያ" : "Clock in/out logs, biometric scans & timesheets"}
                        </p>
                      </button>
                    )}

                    {hasAccess("biometricKiosk") && (
                      <button
                        onClick={() => { setActiveTab("biometricKiosk"); setShowModulesMenu(false); }}
                        className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between group ${
                          activeTab === "biometricKiosk" ? "bg-purple-950/40 border-purple-500 shadow-md shadow-purple-900/20" : "bg-slate-850/60 hover:bg-slate-800 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg group-hover:scale-110 transition-transform">
                            <ScanLine size={18} />
                          </div>
                          <span className="font-extrabold text-sm text-white">{isAmharic ? "20. ባዮሜትሪክ ኪዮስክ" : "20. Biometric Kiosk Scanner"}</span>
                        </div>
                        <p className="text-xs text-slate-400 leading-normal">
                          {isAmharic ? "ለሳይት በር ፈጣን የሰራተኞች ባዮሜትሪክ መመዝገቢያ" : "High-speed site entrance biometric terminal"}
                        </p>
                      </button>
                    )}

                    {hasAccess("fingerprintBoard") && (
                      <button
                        onClick={() => { setActiveTab("fingerprintBoard"); setShowModulesMenu(false); }}
                        className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between group ${
                          activeTab === "fingerprintBoard" ? "bg-purple-950/40 border-purple-500 shadow-md shadow-purple-900/20" : "bg-slate-850/60 hover:bg-slate-800 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg group-hover:scale-110 transition-transform">
                            <Fingerprint size={18} />
                          </div>
                          <span className="font-extrabold text-sm text-white">{isAmharic ? "21. የጣት አሻራ ቦርድ" : "21. Fingerprint Attendance Board"}</span>
                        </div>
                        <p className="text-xs text-slate-400 leading-normal">
                          {isAmharic ? "የአካባቢና የሃርድዌር የጣት አሻራ መሳሪያዎች ማገናኛ" : "Hardware scanner integration & live fingerprint board"}
                        </p>
                      </button>
                    )}

                    {hasAccess("biometricBoard") && (
                      <button
                        onClick={() => { setActiveTab("biometricBoard"); setShowModulesMenu(false); }}
                        className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between group ${
                          activeTab === "biometricBoard" ? "bg-purple-950/40 border-purple-500 shadow-md shadow-purple-900/20" : "bg-slate-850/60 hover:bg-slate-800 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg group-hover:scale-110 transition-transform">
                            <Fingerprint size={18} />
                          </div>
                          <span className="font-extrabold text-sm text-white">{isAmharic ? "22. ባዮሜትሪክ ቦርድ" : "22. Biometric Board"}</span>
                        </div>
                        <p className="text-xs text-slate-400 leading-normal">
                          {isAmharic ? "የፊትና የጣት አሻራ መረጃዎች ማእከላዊ መከታተያ" : "Biometric profile logs & attendance verification"}
                        </p>
                      </button>
                    )}

                    {hasAccess("planning") && (
                      <button
                        onClick={() => { setActiveTab("planning"); setShowModulesMenu(false); }}
                        className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between group ${
                          activeTab === "planning" ? "bg-blue-950/40 border-blue-500 shadow-md shadow-blue-900/20" : "bg-slate-850/60 hover:bg-slate-800 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg group-hover:scale-110 transition-transform">
                            <Calendar size={18} />
                          </div>
                          <span className="font-extrabold text-sm text-white">{isAmharic ? "23. የግንባታ እቅድ & Gantt" : "23. Planning & Gantt Scheduler"}</span>
                        </div>
                        <p className="text-xs text-slate-400 leading-normal">
                          {isAmharic ? "የግንባታ ጊዜ ሰሌዳ፣ ፕሮጀክት እቅድና ጋንት ቻርት" : "Construction milestone scheduling & Gantt charts"}
                        </p>
                      </button>
                    )}

                    {hasAccess("progress") && (
                      <button
                        onClick={() => { setActiveTab("progress"); setShowModulesMenu(false); }}
                        className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between group ${
                          activeTab === "progress" ? "bg-blue-950/40 border-blue-500 shadow-md shadow-blue-900/20" : "bg-slate-850/60 hover:bg-slate-800 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg group-hover:scale-110 transition-transform">
                            <Layers size={18} />
                          </div>
                          <span className="font-extrabold text-sm text-white">{isAmharic ? "24. ዕለታዊ የዕድገት መዝገብ" : "24. Daily Progress Logs"}</span>
                        </div>
                        <p className="text-xs text-slate-400 leading-normal">
                          {isAmharic ? "ዕለታዊ የተከናወኑ የፎርምወርክና የህንፃ ስራዎች" : "Daily site activity reporting & progress metrics"}
                        </p>
                      </button>
                    )}

                  </div>
                </div>

                {/* Section 5: AI Inspection, Analytics & Mobile Apps (25-30) */}
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-rose-400 mb-3 flex items-center gap-1.5 border-b border-slate-800 pb-2">
                    <Sparkles size={14} />
                    <span>{isAmharic ? "5. አይአይ ቁጥጥር፣ ትንበያ እና ሞባይል (ክፍል 25-30)" : "AI Inspection, Analytics & Mobile Apps (25-30)"}</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    
                    {hasAccess("aiInspection") && (
                      <button
                        onClick={() => { setActiveTab("aiInspection"); setShowModulesMenu(false); }}
                        className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between group ${
                          activeTab === "aiInspection" ? "bg-rose-950/40 border-rose-500 shadow-md shadow-rose-900/20" : "bg-slate-850/60 hover:bg-slate-800 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="p-2 bg-rose-500/10 text-rose-400 rounded-lg group-hover:scale-110 transition-transform">
                            <Camera size={18} />
                          </div>
                          <span className="font-extrabold text-sm text-white">{isAmharic ? "25. አይአይ ፎቶ ቁጥጥር" : "25. AI Photo Inspection"}</span>
                        </div>
                        <p className="text-xs text-slate-400 leading-normal">
                          {isAmharic ? "በፎቶግራፍ የፎርምወርክ ጥራትና የኮንክሪት ሙሌት በምስል ማረጋገጫ" : "AI site image analysis & automated quality audits"}
                        </p>
                      </button>
                    )}

                    {hasAccess("predictions") && (
                      <button
                        onClick={() => { setActiveTab("predictions"); setShowModulesMenu(false); }}
                        className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between group ${
                          activeTab === "predictions" ? "bg-rose-950/40 border-rose-500 shadow-md shadow-rose-900/20" : "bg-slate-850/60 hover:bg-slate-800 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="p-2 bg-rose-500/10 text-rose-400 rounded-lg group-hover:scale-110 transition-transform">
                            <Sparkles size={18} />
                          </div>
                          <span className="font-extrabold text-sm text-white">{isAmharic ? "26. አይአይ ትንበያዎች" : "26. AI Predictive Analytics"}</span>
                        </div>
                        <p className="text-xs text-slate-400 leading-normal">
                          {isAmharic ? "የግንባታ ጊዜና የወጪ አይአይ ትንበያዎች" : "AI risk forecasts, delay predictions & productivity models"}
                        </p>
                      </button>
                    )}

                    {hasAccess("performance") && (
                      <button
                        onClick={() => { setActiveTab("performance"); setShowModulesMenu(false); }}
                        className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between group ${
                          activeTab === "performance" ? "bg-emerald-950/40 border-emerald-500 shadow-md shadow-emerald-900/20" : "bg-slate-850/60 hover:bg-slate-800 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg group-hover:scale-110 transition-transform">
                            <UserCheck size={18} />
                          </div>
                          <span className="font-extrabold text-sm text-white">{isAmharic ? "27. የሰራተኞች ግምገማ" : "27. Performance Evaluation"}</span>
                        </div>
                        <p className="text-xs text-slate-400 leading-normal">
                          {isAmharic ? "የሰራተኞችና የቡድኖች ውጤታማነት ደረጃ" : "Worker KPIs, productivity leaderboards & evaluations"}
                        </p>
                      </button>
                    )}

                    {hasAccess("safetyQuality") && (
                      <button
                        onClick={() => { setActiveTab("safetyQuality"); setShowModulesMenu(false); }}
                        className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between group ${
                          activeTab === "safetyQuality" ? "bg-amber-950/40 border-amber-500 shadow-md shadow-amber-900/20" : "bg-slate-850/60 hover:bg-slate-800 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg group-hover:scale-110 transition-transform">
                            <ShieldAlert size={18} />
                          </div>
                          <span className="font-extrabold text-sm text-white">{isAmharic ? "28. ደህንነት እና ጥራት" : "28. Safety & Quality"}</span>
                        </div>
                        <p className="text-xs text-slate-400 leading-normal">
                          {isAmharic ? "የደህንነት አደጋዎችና የጥራት ጉድለቶች መዝገብ" : "Safety incidents, snag lists & HSE compliance"}
                        </p>
                      </button>
                    )}

                    {hasAccess("mobileApps") && (
                      <button
                        onClick={() => { setActiveTab("mobileApps"); setShowModulesMenu(false); }}
                        className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between group ${
                          activeTab === "mobileApps" ? "bg-indigo-950/40 border-indigo-500 shadow-md shadow-indigo-900/20" : "bg-slate-850/60 hover:bg-slate-800 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg group-hover:scale-110 transition-transform">
                            <Smartphone size={18} />
                          </div>
                          <span className="font-extrabold text-sm text-white">{isAmharic ? "29. የሞባይል መተግበሪያዎች" : "29. Mobile Apps Suite"}</span>
                        </div>
                        <p className="text-xs text-slate-400 leading-normal">
                          {isAmharic ? "የስልክ መተግበሪያዎች ለሳይት ሰራተኞችና ማናጀሮች" : "Field apps, QR scanners & mobile access hubs"}
                        </p>
                      </button>
                    )}

                    {hasAccess("launchReadiness") && (
                      <button
                        onClick={() => { setActiveTab("launchReadiness"); setShowModulesMenu(false); }}
                        className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between group ${
                          activeTab === "launchReadiness" ? "bg-orange-950/40 border-orange-500 shadow-md shadow-orange-900/20" : "bg-slate-850/60 hover:bg-slate-800 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="p-2 bg-orange-500/10 text-orange-400 rounded-lg group-hover:scale-110 transition-transform">
                            <Rocket size={18} />
                          </div>
                          <span className="font-extrabold text-sm text-white">{isAmharic ? "30. ማስጀመሪያ ዝግጁነት" : "30. Launch Readiness"}</span>
                        </div>
                        <p className="text-xs text-slate-400 leading-normal">
                          {isAmharic ? "የሲስተም ዝግጁነትና የቀጥታ ስራ ማስጀመሪያ መፈተሻ" : "Deployment checks, production readiness & system diagnostics"}
                        </p>
                      </button>
                    )}

                  </div>
                </div>

              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-between items-center text-xs text-slate-400">
                <span>Digital Construction ERP v4.0 - All Modules Enabled</span>
                <button
                  onClick={() => setShowModulesMenu(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-colors cursor-pointer"
                >
                  {isAmharic ? "ዝጋ" : "Close"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
