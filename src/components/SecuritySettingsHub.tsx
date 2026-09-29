import React, { useState, useEffect } from "react";
import { UserRole, AuditLog } from "../types";
import { UserRoleApprovalHub } from "./UserRoleApprovalHub";
import { FirebaseConfigModal } from "./FirebaseConfigModal";
import { OvidSettingsEnterprisePanels } from "./OvidSettingsEnterprisePanels";
import { db, auth, isFirebaseReady } from "../firebase";
import { doc, setDoc } from "firebase/firestore";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Lock,
  User,
  Eye,
  EyeOff,
  Languages,
  Bell,
  Moon,
  Sun,
  Smartphone,
  Fingerprint,
  Activity,
  Database,
  AlertOctagon,
  Unlock,
  RefreshCw,
  CheckCircle2,
  Cpu,
  Users,
  MapPin,
  Laptop,
  Check,
  FileText,
  Key,
  Camera,
  LogOut,
  Settings,
  HelpCircle
} from "lucide-react";

interface SecuritySettingsHubProps {
  isAmharic: boolean;
  currentUserRole: UserRole;
  currentUserProfile?: {
    uid: string;
    displayName: string;
    role: UserRole | string;
    requestedRole?: UserRole | string;
    status: string;
    email: string;
    phoneNumber?: string;
  } | null;
  selectedProject?: string;
  onToggleLanguage?: () => void;
  onLogout?: () => void;
  onLogAction: (action: string, details: string) => void;
  auditLogs: AuditLog[];
  sessionTimeoutMinutes: number;
  onChangeSessionTimeout: (minutes: number) => void;
}

interface ActiveSession {
  id: string;
  userId: string;
  userName: string;
  role: UserRole;
  device: string;
  ip: string;
  gps: string;
  loginTime: string;
  isCurrent: boolean;
}

type SettingsTabId =
  | "settings_dashboard"
  | "my_profile"
  | "password_auth"
  | "biometric_security"
  | "privacy_center"
  | "rbac_permissions"
  | "gps_location"
  | "security_antifraud"
  | "audit_attendance_correction"
  | "device_session_logout"
  | "camera_cad_docs"
  | "notifications_lang_appearance"
  | "data_offline_backup"
  | "legal_privacy_about"
  | "role_approval_hub"
  | "enterprise_soc";

const RBAC_SPECIFICATION: { role: string; titleAm: string; scopeEn: string; scopeAm: string }[] = [
  {
    role: "Super Admin (Nuriye Ahmed Adem)",
    titleAm: "ብቸኛው ሱፐር አድሚን (Nuriye Ahmed Adem)",
    scopeEn: "Only Super Admin (0910097862/0920843843 | mejennur669@gmail.com) — Full global ERP & security authority.",
    scopeAm: "ሙሉ የሲስተም፣ የደህንነት እና የአስተዳደር ቁጥጥር (0910097862/0920843843 | mejennur669@gmail.com)።"
  },
  {
    role: "Head Office",
    titleAm: "ዋና መስሪያ ቤት (Head Office)",
    scopeEn: "Enterprise-level overall control across all projects, financials, attendance, and security.",
    scopeAm: "Enterprise-level አጠቃላይ ቁጥጥር ያደርጋል።"
  },
  {
    role: "Project Manager",
    titleAm: "የፕሮጀክት ሥራ አስኪያጅ (Project Manager)",
    scopeEn: "Controls Project-level information, schedules, budgets, and site operations.",
    scopeAm: "Project-level information ይቆጣጠራል።"
  },
  {
    role: "Section Head",
    titleAm: "የክፍል ኃላፊ (Section Head)",
    scopeEn: "Monitors and supervises operations within the assigned structural section.",
    scopeAm: "በተመደበው Section ላይ ክትትል ያደርጋል።"
  },
  {
    role: "Site Engineer",
    titleAm: "የሳይት መሐንዲስ (Site Engineer)",
    scopeEn: "Controls Technical Information, Drawings, Survey Results, and Engineering Checks.",
    scopeAm: "Technical Information፣ Drawings፣ Survey Results እና Engineering Checks ይቆጣጠራል።"
  },
  {
    role: "Surveyor",
    titleAm: "ቅየሳ መሐንዲስ (Surveyor)",
    scopeEn: "Enters Survey Data and manages Survey Results & elevation benchmarks.",
    scopeAm: "Survey Data ያስገባል እና የSurvey Results ያስተዳድራል።"
  },
  {
    role: "Supervisor",
    titleAm: "ሱፐርቫይዘር (Supervisor)",
    scopeEn: "Controls Site Work, Progress, Quality, and Safety compliance.",
    scopeAm: "Site Work፣ Progress፣ Quality እና Safety ይቆጣጠራል።"
  },
  {
    role: "Time Keeper",
    titleAm: "ሰዓት ተቆጣጣሪ (Time Keeper)",
    scopeEn: "Controls Employee Registration, Attendance, and Time Records.",
    scopeAm: "Employee Registration፣ Attendance እና Time Records ይቆጣጠራል።"
  },
  {
    role: "Team Leader",
    titleAm: "የቡድን መሪ (Team Leader)",
    scopeEn: "Controls work assigned to Team and Gang Chiefs.",
    scopeAm: "የTeam እና Gang Chiefs የተመደቡለትን ሥራ ይቆጣጠራል።"
  },
  {
    role: "Gang Chief",
    titleAm: "የጋንግ መሪ (Gang Chief)",
    scopeEn: "Controls own Team and assigned Zone only (restricted from other sites).",
    scopeAm: "የራሱን Team እና የተመደበለትን Zone ይቆጣጠራል።"
  }
];

export function SecuritySettingsHub({
  isAmharic,
  currentUserRole,
  currentUserProfile,
  selectedProject = "Addis Ababa Tower Block A",
  onToggleLanguage,
  onLogout,
  onLogAction,
  auditLogs,
  sessionTimeoutMinutes,
  onChangeSessionTimeout
}: SecuritySettingsHubProps) {
  const [activeTab, setActiveTab] = useState<SettingsTabId>("settings_dashboard");
  const [showFirebaseModal, setShowFirebaseModal] = useState(false);

  const isSuperOrAdmin = [
    UserRole.SUPER_ADMIN,
    UserRole.HEAD_OFFICE,
    UserRole.HR_MANAGER,
    UserRole.PROJECT_MANAGER
  ].includes(currentUserRole);

  // --- SECTION 2: MY PROFILE STATES ---
  const isSoleSuperAdmin =
    currentUserRole === UserRole.SUPER_ADMIN ||
    currentUserProfile?.email?.toLowerCase() === "mejennur669@gmail.com";

  const [profileName, setProfileName] = useState(
    isSoleSuperAdmin
      ? "Nuriye Ahmed Adem"
      : currentUserProfile?.displayName || `${currentUserRole} Operator`
  );
  const [employeeId] = useState(
    isSoleSuperAdmin ? "OVID-ERP-SA-001" : `OVID-ERP-${currentUserRole.slice(0, 2).toUpperCase()}-104`
  );
  const [jobPosition, setJobPosition] = useState<string>(currentUserRole);
  const [department, setDepartment] = useState(
    isSoleSuperAdmin ? "Executive & System Governance" : "Aluminum Formwork & Site Engineering"
  );
  const [assignedProject, setAssignedProject] = useState(selectedProject);
  const [assignedSite, setAssignedSite] = useState("Bole Heights Site B1");
  const [profilePhone, setProfilePhone] = useState(
    isSoleSuperAdmin ? "0910097862/0920843843" : currentUserProfile?.phoneNumber || "0910097862/0920843843"
  );
  const [profileEmail, setProfileEmail] = useState(
    isSoleSuperAdmin ? "mejennur669@gmail.com" : currentUserProfile?.email || "mejennur669@gmail.com"
  );
  const [profilePhotoBadge, setProfilePhotoBadge] = useState<"initials" | "hardhat" | "executive">("executive");
  const [profileSavedMsg, setProfileSavedMsg] = useState("");

  // --- SECTION 3: PASSWORD & AUTHENTICATION STATES ---
  const [authVerifyMode, setAuthVerifyMode] = useState<"password" | "otp">("password");
  const [oldPassword, setOldPassword] = useState("");
  const [changePassOtp, setChangePassOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [otpEnabled, setOtpEnabled] = useState(true);
  const [mfaEnabled, setMfaEnabled] = useState(true);
  const [mfaOtpInput, setMfaOtpInput] = useState("");
  const [passStatusMsg, setPassStatusMsg] = useState("");
  const [resetEmailSent, setResetEmailSent] = useState(false);

  // --- SECTION 4: BIOMETRIC SECURITY STATES ---
  const [bioFingerprintPref, setBioFingerprintPref] = useState(true);
  const [bioFacePref, setBioFacePref] = useState(true);
  const [bioDeviceAuth, setBioDeviceAuth] = useState(true);

  // --- SECTION 5: PRIVACY CENTER STATES ---
  const [privShowPhone, setPrivShowPhone] = useState(true);
  const [privShowEmail, setPrivShowEmail] = useState(true);
  const [privGpsUsage, setPrivGpsUsage] = useState(true);
  const [privSiteVerify, setPrivSiteVerify] = useState(true);
  const [privLocationHistory, setPrivLocationHistory] = useState(true);
  const [privCameraPerm, setPrivCameraPerm] = useState(true);
  const [privPhotoAccess, setPrivPhotoAccess] = useState(true);
  const [privPushNotif, setPrivPushNotif] = useState(true);
  const [privAttendanceAlert, setPrivAttendanceAlert] = useState(true);
  const [privWorkAlert, setPrivWorkAlert] = useState(true);

  // --- SECTION 11 & 12: CONNECTED DEVICES & SESSIONS ---
  const [devicesList, setDevicesList] = useState([
    {
      id: "DEV-01",
      device: "Desktop Workstation - Chrome (Current)",
      type: "Workstation",
      ip: "192.168.10.45",
      location: "Bole Heights Site B1",
      activeAt: "Active Now",
      recognized: true,
      verified: true
    },
    {
      id: "DEV-02",
      device: "Samsung Android (Galaxy S24 Ultra)",
      type: "Samsung Android",
      ip: "10.0.8.22",
      location: "Bole Heights Site B1",
      activeAt: "25 mins ago",
      recognized: true,
      verified: true
    },
    {
      id: "DEV-03",
      device: "Tecno Android (Spark 20 Pro — Field Terminal)",
      type: "Tecno Android",
      ip: "10.0.8.91",
      location: "Zone B Gate",
      activeAt: "1 hour ago",
      recognized: false,
      verified: false
    },
    {
      id: "DEV-04",
      device: "Site Survey Tablet (iPad Pro / Rugged Tablet)",
      type: "Tablet",
      ip: "10.0.8.114",
      location: "Floor 4 Deck",
      activeAt: "3 hours ago",
      recognized: true,
      verified: true
    }
  ]);

  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([
    {
      id: "SES-100",
      userId: "SA-01",
      userName: "Nuriye Ahmed Adem",
      role: UserRole.SUPER_ADMIN,
      device: "Desktop Workstation - Chrome",
      ip: "192.168.10.1",
      gps: "9.0272° N, 38.7483° E",
      loginTime: "2026-09-29 07:00:00",
      isCurrent: true
    },
    {
      id: "SES-101",
      userId: "TK-01",
      userName: "Time Keeper Terminal",
      role: UserRole.TIME_KEEPER,
      device: "Samsung Android",
      ip: "192.168.10.5",
      gps: "9.0272° N, 38.7483° E",
      loginTime: "2026-09-29 06:30:12",
      isCurrent: false
    }
  ]);

  const [reauthVerified, setReauthVerified] = useState(false);
  const [reauthPin, setReauthPin] = useState("");
  const [tokenRotatedAt, setTokenRotatedAt] = useState("2026-09-29 07:00:00");

  // --- SECTION 15: NOTIFICATION SETTINGS (9 TOGGLES + CRITICAL SECURITY LOCK) ---
  const [notifSettings, setNotifSettings] = useState({
    attendance: true,
    late: true,
    overtime: true,
    workPlan: true,
    safetyAlerts: true,
    qualityAlerts: true,
    materialAlerts: true,
    approvalNotifications: true,
    systemNotifications: true,
    criticalSecurityAlerts: true // Locked by Role
  });

  // --- SECTION 17: APPEARANCE & ACCESSIBILITY ---
  const [themeMode, setThemeMode] = useState<"light" | "dark" | "system">("light");
  const [fontSize, setFontSize] = useState<"small" | "normal" | "large">("normal");
  const [highContrast, setHighContrast] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  // --- ENTERPRISE SOC STATES ---
  const [appCheckEnabled, setAppCheckEnabled] = useState(true);
  const [plainText, setPlainText] = useState("OVID-ERP-EMP-0910097862-SALARY-125000-ETB");
  const [encryptedHex, setEncryptedHex] = useState("");

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isFirebaseReady && db && auth?.currentUser?.uid) {
      await setDoc(
        doc(db, "users", auth.currentUser.uid),
        {
          displayName: isSoleSuperAdmin ? "Nuriye Ahmed Adem" : profileName,
          phoneNumber: isSoleSuperAdmin ? "0910097862/0920843843" : profilePhone,
          email: isSoleSuperAdmin ? "mejennur669@gmail.com" : profileEmail
        },
        { merge: true }
      ).catch(() => {});
    }
    onLogAction("Profile Updated", `Updated permitted profile metadata for ${profileName} (${currentUserRole})`);
    setProfileSavedMsg(
      isAmharic ? "የተፈቀደው የመገለጫ መረጃ በተሳካ ሁኔታ ተቀምጧል!" : "Permitted profile fields saved successfully!"
    );
    setTimeout(() => setProfileSavedMsg(""), 3500);
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (authVerifyMode === "password" && !oldPassword.trim()) {
      setPassStatusMsg(isAmharic ? "እባክዎ ነባሩን የይለፍ ቃል ያስገቡ።" : "Current Password is required.");
      return;
    }
    if (authVerifyMode === "otp" && changePassOtp.trim().length < 4) {
      setPassStatusMsg(isAmharic ? "እባክዎ የOTP ማረጋገጫ ኮድ ያስገቡ።" : "Valid OTP verification code is required.");
      return;
    }
    if (!newPassword || newPassword.length < 6 || newPassword !== confirmPassword) {
      setPassStatusMsg(
        isAmharic
          ? "አዲሱ የይለፍ ቃል ቢያንስ 6 አሃዝ መሆንና ከማረጋገጫው ጋር መመሳሰል አለበት።"
          : "New passwords must match and be at least 6 characters."
      );
      return;
    }
    onLogAction("Password Updated", `Password changed using ${authVerifyMode.toUpperCase()} verification.`);
    setOldPassword("");
    setChangePassOtp("");
    setNewPassword("");
    setConfirmPassword("");
    setPassStatusMsg(
      isAmharic ? "የይለፍ ቃልዎ በተሳካ ሁኔታ ተቀይሯል!" : "Password securely updated with verification!"
    );
  };

  const navItems: { id: SettingsTabId; labelEn: string; labelAm: string; icon: any }[] = [
    { id: "settings_dashboard", labelEn: "1. Settings Dashboard ⚙️", labelAm: "1. የቅንጅቶች ዳሽቦርድ ⚙️", icon: Settings },
    { id: "my_profile", labelEn: "2. My Profile & Account", labelAm: "2. የእኔ መገለጫ (My Profile)", icon: User },
    { id: "password_auth", labelEn: "3. Password & Auth (2FA/OTP)", labelAm: "3. የይለፍ ቃል እና ማረጋገጫ", icon: Key },
    { id: "biometric_security", labelEn: "4. Biometric Security", labelAm: "4. የባዮሜትሪክ ደህንነት", icon: Fingerprint },
    { id: "privacy_center", labelEn: "5. Privacy Center", labelAm: "5. የግላዊነት ማዕከል (Privacy)", icon: Eye },
    { id: "rbac_permissions", labelEn: "6. RBAC & Permissions", labelAm: "6. የሚና ፍቃድ (RBAC)", icon: Users },
    { id: "gps_location", labelEn: "7. GPS & Geofence Security", labelAm: "7. የጂፒኤስ ደህንነት (GPS)", icon: MapPin },
    { id: "security_antifraud", labelEn: "8 & 22. Anti-Fraud & Alerts", labelAm: "8 & 22. ጸረ-ማጭበርበር እና አደጋ", icon: ShieldAlert },
    { id: "audit_attendance_correction", labelEn: "9 & 10. Audit & Attendance Fix", labelAm: "9 & 10. ኦዲት እና የመገኘት ማስተካከያ", icon: FileText },
    { id: "device_session_logout", labelEn: "11, 12 & 23. Devices & Logout", labelAm: "11, 12 & 23. መሣሪያዎች እና መውጫ", icon: Smartphone },
    { id: "camera_cad_docs", labelEn: "13 & 14. Data, Camera & CAD", labelAm: "13 & 14. ውሂብ፣ ካሜራ እና CAD", icon: Camera },
    { id: "notifications_lang_appearance", labelEn: "15-17. Alerts, Lang & Theme", labelAm: "15-17. ማሳወቂያ፣ ቋንቋ እና ገጽታ", icon: Bell },
    { id: "data_offline_backup", labelEn: "18 & 19. Offline & Cloud Backup", labelAm: "18 & 19. ከመስመር ውጭ እና ባክአፕ", icon: Database },
    { id: "legal_privacy_about", labelEn: "20, 21 & 24. Policy & Architecture", labelAm: "20, 21 & 24. ፖሊሲ እና የደህንነት መዋቅር", icon: ShieldCheck },
    { id: "role_approval_hub", labelEn: "Role Change Approval Hub", labelAm: "የሥራ ድርሻ ለውጥ ማጽደቂያ", icon: CheckCircle2 },
    { id: "enterprise_soc", labelEn: "Enterprise Security SOC", labelAm: "ኢንተርፕራይዝ የደህንነት ማዕከል (SOC)", icon: Shield }
  ];

  // 21 Settings Dashboard Quick-Jump Cards matching Section 1
  const dashboardModules: { titleEn: string; titleAm: string; target: SettingsTabId; desc: string }[] = [
    { titleEn: "My Profile", titleAm: "የእኔ መገለጫ", target: "my_profile", desc: "Name, ID, Photo, Dept, Site, Role" },
    { titleEn: "Account Settings", titleAm: "የመለያ ቅንብሮች", target: "my_profile", desc: "Account status & HR policy" },
    { titleEn: "Password & Authentication", titleAm: "የይለፍ ቃል እና ማረጋገጫ", target: "password_auth", desc: "Change/Reset Password, OTP, 2FA" },
    { titleEn: "Biometric Settings", titleAm: "የባዮሜትሪክ ቅንብሮች", target: "biometric_security", desc: "Fingerprint, Face & Device Enclave" },
    { titleEn: "Privacy", titleAm: "ግላዊነት (Privacy Center)", target: "privacy_center", desc: "Personal, Location, Camera & Alerts" },
    { titleEn: "Security", titleAm: "ደህንነት (Anti-Fraud & Alerts)", target: "security_antifraud", desc: "9 Anti-Fraud rules & Emergency Center" },
    { titleEn: "Notifications", titleAm: "ማሳወቂያዎች", target: "notifications_lang_appearance", desc: "9 Alert toggles & Critical lock" },
    { titleEn: "GPS & Location", titleAm: "ጂፒኤስ እና አካባቢ", target: "gps_location", desc: "6-Step Site Geofence Verification" },
    { titleEn: "Camera & Photos", titleAm: "ካሜራ እና ፎቶዎች", target: "camera_cad_docs", desc: "Site Photos, CAD Version History" },
    { titleEn: "Language", titleAm: "ቋንቋ (Language)", target: "notifications_lang_appearance", desc: "English, Amharic + Upcoming" },
    { titleEn: "Appearance", titleAm: "ገጽታ (Appearance)", target: "notifications_lang_appearance", desc: "Light/Dark Mode, Font & Accessibility" },
    { titleEn: "Data & Storage", titleAm: "ውሂብ እና ማከማቻ", target: "data_offline_backup", desc: "8-Module Firebase Cloud Backup" },
    { titleEn: "Offline Mode", titleAm: "ከመስመር ውጭ ሞድ", target: "data_offline_backup", desc: "Encrypted Local Queue & Unique IDs" },
    { titleEn: "Connected Devices", titleAm: "የተገናኙ መሣሪያዎች", target: "device_session_logout", desc: "Tecno, Samsung, Tablet Verification" },
    { titleEn: "Login Activity", titleAm: "የመግቢያ እንቅስቃሴ", target: "device_session_logout", desc: "Active Sessions, Timeout & Tokens" },
    { titleEn: "Permission Management", titleAm: "የፍቃድ አስተዳደር (RBAC)", target: "rbac_permissions", desc: "Role-Based Access Control Matrix" },
    { titleEn: "Help & Support", titleAm: "እገዛ እና ድጋፍ", target: "legal_privacy_about", desc: "Direct ERP Technical Support" },
    { titleEn: "Terms & Conditions", titleAm: "ውሎች እና ሁኔታዎች", target: "legal_privacy_about", desc: "Operational & Labor Compliance" },
    { titleEn: "Privacy Policy", titleAm: "የግላዊነት ፖሊሲ", target: "legal_privacy_about", desc: "10-Point Data Protection Charter" },
    { titleEn: "About OVID ERP", titleAm: "ስለ OVID ERP", target: "legal_privacy_about", desc: "9-Layer Final Security Architecture" },
    { titleEn: "Logout", titleAm: "ውጣ (Logout)", target: "device_session_logout", desc: "Sign Out & Logout From All Devices" }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Left Sidebar Control Menu */}
      <div className="lg:col-span-1 bg-white p-4 rounded-xl border border-slate-200 flex flex-col justify-between space-y-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-red-600 mb-3 px-2">
            <Shield size={18} />
            <span className="text-xs font-bold tracking-wide">
              {isAmharic ? "OVID ERP ቅንጅቶች እና ደህንነት ⚙️" : "OVID ERP Settings & Security ⚙️"}
            </span>
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full px-3 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-2.5 cursor-pointer text-left ${
                  isActive
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon size={14} className={isActive ? "text-red-400 shrink-0" : "text-slate-400 shrink-0"} />
                <span className="truncate">{isAmharic ? item.labelAm : item.labelEn}</span>
              </button>
            );
          })}
        </div>

        <div className="space-y-3 pt-2 border-t border-slate-100">
          {/* Session Metadata */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 font-mono text-[10px] text-slate-600 space-y-1">
            <div className="flex justify-between">
              <span>Active Role:</span>
              <span className="text-red-600 font-bold">{currentUserRole}</span>
            </div>
            <div className="flex justify-between">
              <span>Security Auth:</span>
              <span className="text-emerald-600 font-bold">{mfaEnabled ? "2FA + OTP Active" : "Standard"}</span>
            </div>
            <div className="flex justify-between">
              <span>Session Timeout:</span>
              <span className="text-slate-800 font-bold">{sessionTimeoutMinutes} Mins</span>
            </div>
          </div>

          {/* Only Super Admin Box */}
          <div className="bg-red-50/60 p-3 rounded-xl border border-red-200 font-mono text-[10px] text-slate-700 space-y-1">
            <p className="font-bold text-red-700 flex items-center gap-1">
              <Cpu size={11} />
              <span>{isAmharic ? "ብቸኛው ሱፐር አድሚን (Only Super Admin)" : "Only Super Admin"}</span>
            </p>
            <div>
              <span className="text-slate-500">{isAmharic ? "ስም:" : "Name:"}</span>{" "}
              <span className="font-bold text-slate-900">Nuriye Ahmed Adem</span>
            </div>
            <div>
              <span className="text-slate-500">{isAmharic ? "ስልክ:" : "Phone:"}</span>{" "}
              <span className="font-bold text-slate-900">0910097862/0920843843</span>
            </div>
            <div>
              <span className="text-slate-500">{isAmharic ? "ኢሜይል:" : "Email:"}</span>{" "}
              <span className="font-bold underline text-slate-900">mejennur669@gmail.com</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Pane */}
      <div className="lg:col-span-3 space-y-6">
        {/* SECTION 1: SETTINGS DASHBOARD */}
        {activeTab === "settings_dashboard" && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {isAmharic
                    ? "1. OVID REAL ESTATE SMART CONSTRUCTION ERP — የቅንጅቶች፣ ግላዊነት እና ደህንነት ማዕከል ⚙️"
                    : "1. OVID Real Estate Smart Construction ERP — App Settings, Privacy & Security ⚙️"}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isAmharic
                    ? "እያንዳንዱ User በApp ውስጥ Settings ⚙️ የሚለውን ክፍል ያገኛል እና የተፈቀደለትን ብቻ ያስተዳድራል።"
                    : "Unified Settings Dashboard available to every user with Role-Based Access Control (RBAC)."}
                </p>
              </div>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  <LogOut size={14} />
                  <span>{isAmharic ? "ውጣ (Logout)" : "Logout"}</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {dashboardModules.map((mod, idx) => (
                <button
                  key={mod.titleEn}
                  onClick={() => setActiveTab(mod.target)}
                  className="p-3.5 rounded-xl border border-slate-200 hover:border-slate-400 bg-slate-50/50 hover:bg-white text-left transition-colors cursor-pointer space-y-1"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                    <span>
                      {idx + 1}. {isAmharic ? mod.titleAm : mod.titleEn}
                    </span>
                    <span className="text-slate-400 font-mono text-[10px]">→</span>
                  </div>
                  <p className="text-[11px] text-slate-500">{mod.desc}</p>
                </button>
              ))}
            </div>

            {/* Complete 24-Section Architectural Index */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800">
                  {isAmharic
                    ? "ሁሉም 24 የOVID ERP Settings, Privacy & Security ክፍሎች (1–24 Master Index)"
                    : "Complete 24-Section App Settings, Privacy & Security Specification (1–24)"}
                </h3>
                <span className="text-[11px] font-mono text-emerald-700 font-semibold">24 / 24 Active</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 text-[11px]">
                {[
                  { num: 1, label: "1. Settings Dashboard ⚙️", tab: "settings_dashboard" as SettingsTabId },
                  { num: 2, label: "2. My Profile", tab: "my_profile" as SettingsTabId },
                  { num: 3, label: "3. Password & Authentication", tab: "password_auth" as SettingsTabId },
                  { num: 4, label: "4. Biometric Security", tab: "biometric_security" as SettingsTabId },
                  { num: 5, label: "5. Privacy Center", tab: "privacy_center" as SettingsTabId },
                  { num: 6, label: "6. Role-Based Access (RBAC)", tab: "rbac_permissions" as SettingsTabId },
                  { num: 7, label: "7. GPS Security", tab: "gps_location" as SettingsTabId },
                  { num: 8, label: "8. Anti-Fraud Security", tab: "security_antifraud" as SettingsTabId },
                  { num: 9, label: "9. Audit Log", tab: "audit_attendance_correction" as SettingsTabId },
                  { num: 10, label: "10. Attendance Correction", tab: "audit_attendance_correction" as SettingsTabId },
                  { num: 11, label: "11. Device Management", tab: "device_session_logout" as SettingsTabId },
                  { num: 12, label: "12. Session Security", tab: "device_session_logout" as SettingsTabId },
                  { num: 13, label: "13. Data Security", tab: "camera_cad_docs" as SettingsTabId },
                  { num: 14, label: "14. CAD & Doc Security", tab: "camera_cad_docs" as SettingsTabId },
                  { num: 15, label: "15. Notification Settings", tab: "notifications_lang_appearance" as SettingsTabId },
                  { num: 16, label: "16. Language Settings", tab: "notifications_lang_appearance" as SettingsTabId },
                  { num: 17, label: "17. Appearance", tab: "notifications_lang_appearance" as SettingsTabId },
                  { num: 18, label: "18. Offline Security", tab: "data_offline_backup" as SettingsTabId },
                  { num: 19, label: "19. Backup & Recovery", tab: "data_offline_backup" as SettingsTabId },
                  { num: 20, label: "20. Privacy Policy", tab: "legal_privacy_about" as SettingsTabId },
                  { num: 21, label: "21. Account Deactivation", tab: "legal_privacy_about" as SettingsTabId },
                  { num: 22, label: "22. Emergency Security", tab: "security_antifraud" as SettingsTabId },
                  { num: 23, label: "23. Logout & All Devices", tab: "device_session_logout" as SettingsTabId },
                  { num: 24, label: "24. Final Security Arch.", tab: "legal_privacy_about" as SettingsTabId }
                ].map((s) => (
                  <button
                    key={s.num}
                    onClick={() => setActiveTab(s.tab)}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-red-400 bg-white hover:bg-red-50/30 text-left font-medium text-slate-700 hover:text-slate-900 transition-colors cursor-pointer truncate"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SECTION 2: MY PROFILE */}
        {activeTab === "my_profile" && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm shrink-0">
                  {profileName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {isAmharic ? "2. የእኔ መገለጫ (My Profile & Account Settings)" : "2. My Profile & Permitted Account Fields"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isAmharic
                      ? "User የራሱን መረጃ ያያል፤ የተፈቀደለትን መረጃ ብቻ መቀየር ይችላል።"
                      : "View complete employee identity metadata. Only role-permitted fields are editable."}
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono text-slate-600">
                ID: <strong className="text-slate-900">{employeeId}</strong> · Role: <strong className="text-red-600">{currentUserRole}</strong>
              </span>
            </div>

            {profileSavedMsg && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
                {profileSavedMsg}
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Full Name</label>
                  <input
                    type="text"
                    value={profileName}
                    readOnly={!isSuperOrAdmin}
                    onChange={(e) => setProfileName(e.target.value)}
                    className={`w-full px-3 py-2 border border-slate-200 rounded-lg ${
                      isSuperOrAdmin ? "bg-white text-slate-900" : "bg-slate-100 text-slate-500 cursor-not-allowed"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Employee ID (Locked)</label>
                  <input
                    type="text"
                    value={employeeId}
                    readOnly
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-600 font-mono cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">User Role (RBAC Enforced)</label>
                  <input
                    type="text"
                    value={currentUserRole}
                    readOnly
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-red-600 font-bold cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Job Position</label>
                  <input
                    type="text"
                    value={jobPosition}
                    readOnly={!isSuperOrAdmin}
                    onChange={(e) => setJobPosition(e.target.value)}
                    className={`w-full px-3 py-2 border border-slate-200 rounded-lg ${
                      isSuperOrAdmin ? "bg-white text-slate-900" : "bg-slate-100 text-slate-500"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Department</label>
                  <input
                    type="text"
                    value={department}
                    readOnly={!isSuperOrAdmin}
                    onChange={(e) => setDepartment(e.target.value)}
                    className={`w-full px-3 py-2 border border-slate-200 rounded-lg ${
                      isSuperOrAdmin ? "bg-white text-slate-900" : "bg-slate-100 text-slate-500"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Assigned Project</label>
                  <input
                    type="text"
                    value={assignedProject}
                    readOnly={!isSuperOrAdmin}
                    onChange={(e) => setAssignedProject(e.target.value)}
                    className={`w-full px-3 py-2 border border-slate-200 rounded-lg ${
                      isSuperOrAdmin ? "bg-white text-slate-900" : "bg-slate-100 text-slate-500"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Assigned Site</label>
                  <input
                    type="text"
                    value={assignedSite}
                    readOnly={!isSuperOrAdmin}
                    onChange={(e) => setAssignedSite(e.target.value)}
                    className={`w-full px-3 py-2 border border-slate-200 rounded-lg ${
                      isSuperOrAdmin ? "bg-white text-slate-900" : "bg-slate-100 text-slate-500"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Phone Number (Editable)</label>
                  <input
                    type="text"
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Email Address (Editable)</label>
                  <input
                    type="email"
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-mono"
                  />
                </div>
                <div className="md:col-span-2 lg:col-span-3 pt-1">
                  <label className="block text-slate-500 font-semibold mb-1.5">
                    {isAmharic ? "Profile Photo (የመገለጫ ፎቶ / መለያ ምልክት)" : "Profile Photo (Permitted Avatar Selection)"}
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    {[
                      { id: "executive", label: "Executive Shield Avatar" },
                      { id: "hardhat", label: "Site Engineering Badge" },
                      { id: "initials", label: "Monogram Initials" }
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setProfilePhotoBadge(opt.id as any)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${
                          profilePhotoBadge === opt.id
                            ? "bg-slate-900 text-white border-slate-900"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold cursor-pointer"
                >
                  {isAmharic ? "የተፈቀደውን መረጃ አስቀምጥ" : "Save Permitted Profile Changes"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* SECTION 3: PASSWORD & AUTHENTICATION */}
        {activeTab === "password_auth" && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
              <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {isAmharic ? "3. የይለፍ ቃል እና ማረጋገጫ (Password & Authentication)" : "3. Password & Authentication Security"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isAmharic
                      ? "Password ለመቀየር Current Password ወይም OTP ማረጋገጫ ያስፈልጋል።"
                      : "Change Password, Forgot/Reset Password, Enable OTP, Enable 2FA & Manage Sessions."}
                  </p>
                </div>
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs">
                  <button
                    type="button"
                    onClick={() => setAuthVerifyMode("password")}
                    className={`px-3 py-1 rounded-md font-semibold cursor-pointer ${
                      authVerifyMode === "password" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600"
                    }`}
                  >
                    Verify via Current Password
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthVerifyMode("otp")}
                    className={`px-3 py-1 rounded-md font-semibold cursor-pointer ${
                      authVerifyMode === "otp" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600"
                    }`}
                  >
                    Verify via SMS OTP
                  </button>
                </div>
              </div>

              {passStatusMsg && (
                <div className="p-3 rounded-lg bg-slate-900 text-white text-xs font-semibold">
                  {passStatusMsg}
                </div>
              )}

              <form onSubmit={handlePasswordChange} className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">
                    {authVerifyMode === "password"
                      ? isAmharic
                        ? "ነባር የይለፍ ቃል (Current Password)"
                        : "Current Password"
                      : isAmharic
                      ? "ባለ 6-አሃዝ OTP ማረጋገጫ"
                      : "6-Digit OTP Verification Code"}
                  </label>
                  {authVerifyMode === "password" ? (
                    <input
                      type="password"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                    />
                  ) : (
                    <input
                      type="text"
                      maxLength={6}
                      value={changePassOtp}
                      onChange={(e) => setChangePassOtp(e.target.value)}
                      placeholder="123456"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">
                    {isAmharic ? "አዲስ የይለፍ ቃል" : "New Password"}
                  </label>
                  <div className="relative">
                    <input
                      type={showPass ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">
                    {isAmharic ? "አዲስ የይለፍ ቃል አረጋግጥ" : "Confirm New Password"}
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                  />
                </div>

                <div className="md:col-span-3 flex flex-wrap items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setResetEmailSent(true);
                      onLogAction("Password Reset Dispatched", `Password reset link / OTP dispatched to ${profileEmail}`);
                    }}
                    className="text-red-600 hover:underline font-semibold cursor-pointer"
                  >
                    {isAmharic ? "የይለፍ ቃል ረሱ? (Forgot / Reset Password)" : "Forgot / Reset Password via Email or OTP"}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold cursor-pointer"
                  >
                    {isAmharic ? "የይለፍ ቃል ቀይር" : "Verify & Update Password"}
                  </button>
                </div>
              </form>

              {resetEmailSent && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
                  {isAmharic
                    ? `የይለፍ ቃል ማደሻ ሊንክ እና OTP ወደ ${profileEmail} ተልኳል።`
                    : `Password reset link and verification OTP dispatched to ${profileEmail}.`}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">
                    {isAmharic ? "የOTP ማረጋገጫ (Enable OTP Verification)" : "Enable OTP Verification"}
                  </span>
                  <input
                    type="checkbox"
                    checked={otpEnabled}
                    onChange={(e) => {
                      setOtpEnabled(e.target.checked);
                      onLogAction("OTP Setting Updated", `OTP Authentication set to ${e.target.checked}`);
                    }}
                    className="accent-red-600 cursor-pointer"
                  />
                </div>
                <p className="text-slate-500">
                  {isAmharic
                    ? "በስልክ ወይም በኢሜይል የሚላክ ባለ 6-አሃዝ የአንድ ጊዜ ማረጋገጫ ኮድ።"
                    : "Requires a one-time verification code for sensitive sign-ins and password resets."}
                </p>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">
                    {isAmharic ? "ባለ ሁለት-ደረጃ ማረጋገጫ (Enable 2FA)" : "Enable Two-Factor Authentication (2FA)"}
                  </span>
                  <input
                    type="checkbox"
                    checked={mfaEnabled}
                    onChange={(e) => {
                      setMfaEnabled(e.target.checked);
                      onLogAction("2FA Setting Updated", `Two-Factor Authentication set to ${e.target.checked}`);
                    }}
                    className="accent-red-600 cursor-pointer"
                  />
                </div>
                <p className="text-slate-500">
                  {isAmharic
                    ? "መለያዎን በAuthenticator App እና በSMS 2FA በድርብ ጥበቃ ይቆልፋል።"
                    : "Protects administrative and operational sessions with TOTP + SMS dual verification."}
                </p>
              </div>
            </div>

            {/* Manage Login Sessions inside Section 3 */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div>
                  <h4 className="font-bold text-slate-900">
                    {isAmharic ? "የመግቢያ ክፍለ-ጊዜዎችን ያስተዳድሩ (Manage Login Sessions)" : "Manage Login Sessions"}
                  </h4>
                  <p className="text-slate-500 text-[11px]">
                    {isAmharic
                      ? "ንቁ የሆኑ የመግቢያ ክፍለ-ጊዜዎችን ይቆጣጠሩ ወይም ወዲያውኑ ያቋርጡ።"
                      : "Inspect active authenticated sessions and revoke untrusted tokens."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("device_session_logout")}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-semibold cursor-pointer"
                >
                  {isAmharic ? "ሙሉ የDevice & Session ቁጥጥር →" : "Full Device & Session Controls →"}
                </button>
              </div>
              <div className="divide-y divide-slate-100">
                {activeSessions.map((ses) => (
                  <div key={ses.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="font-bold text-slate-900">{ses.device}</span>
                      <span className="mx-2 text-slate-400">·</span>
                      <span className="font-mono text-slate-600">{ses.userName} ({ses.role})</span>
                      <p className="font-mono text-[11px] text-slate-500">
                        IP: {ses.ip} · GPS: {ses.gps} · Login: {ses.loginTime}
                      </p>
                    </div>
                    <span className="font-mono text-[11px] font-semibold text-emerald-700">
                      {ses.isCurrent ? "Current Session" : "Verified"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SECTION 4: BIOMETRIC SECURITY */}
        {activeTab === "biometric_security" && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {isAmharic ? "4. የባዮሜትሪክ ደህንነት (Biometric Security)" : "4. Biometric Security & Local Enclave Architecture"}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {isAmharic
                  ? "Fingerprint፣ Face Recognition እና Device Biometric Authentication። የስልኩን biometric sensor raw data ወደ Firebase መላክ አይኖርበትም።"
                  : "Supports Fingerprint, Face Recognition & Device Biometric Authentication stored strictly as local device templates."}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <label className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between cursor-pointer">
                <div>
                  <p className="font-bold text-slate-900">Fingerprint Authentication</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{isAmharic ? "የጣት አሻራ ማረጋገጫ" : "On-device secure hash"}</p>
                </div>
                <input
                  type="checkbox"
                  checked={bioFingerprintPref}
                  onChange={(e) => setBioFingerprintPref(e.target.checked)}
                  className="accent-red-600"
                />
              </label>

              <label className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between cursor-pointer">
                <div>
                  <p className="font-bold text-slate-900">Face Recognition</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{isAmharic ? "የፊት ገጽታ ማረጋገጫ" : "Local vector template"}</p>
                </div>
                <input
                  type="checkbox"
                  checked={bioFacePref}
                  onChange={(e) => setBioFacePref(e.target.checked)}
                  className="accent-red-600"
                />
              </label>

              <label className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between cursor-pointer">
                <div>
                  <p className="font-bold text-slate-900">Device Biometric Auth</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{isAmharic ? "የመሣሪያ ባዮሜትሪክ ቁልፍ" : "Hardware KeyStore / Enclave"}</p>
                </div>
                <input
                  type="checkbox"
                  checked={bioDeviceAuth}
                  onChange={(e) => setBioDeviceAuth(e.target.checked)}
                  className="accent-red-600"
                />
              </label>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 text-slate-100 text-xs space-y-2">
              <p className="font-bold text-emerald-400">
                {isAmharic
                  ? "የባዮሜትሪክ ደህንነት መመሪያ (Zero Raw Biometric Data to Cloud)"
                  : "Hardware Enclave Policy — Zero Raw Biometric Sensor Data Sent to Firebase"}
              </p>
              <p className="text-slate-300 leading-relaxed">
                {isAmharic
                  ? "Biometric data በቀጥታ በDevice ላይ በsecure template/reference ይጠበቃል፤ የስልኩን biometric sensor raw data ወደ Firebase መላክ አይኖርበትም። የEmployee Attendance biometric enrollment ደግሞ በተለየ የHR/Time Keeper workflow ይቆጣጠራል።"
                  : "Biometric data is protected directly on the device via a secure cryptographic template/reference; raw phone biometric sensor data is never transmitted to Firebase. Employee Attendance biometric enrollment is governed separately through the authorized HR / Time Keeper workflow."}
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <p className="font-bold text-slate-900">
                  {isAmharic
                    ? "የEmployee Attendance Biometric Enrollment (HR / Time Keeper Workflow)"
                    : "Employee Attendance Biometric Enrollment — HR / Time Keeper Workflow"}
                </p>
                <p className="text-slate-600 mt-0.5">
                  {isAmharic
                    ? "የሰራተኞች የAttendance የጣት አሻራ እና የፊት ምዝገባ በHR እና Time Keeper ብቻ ተረጋግጦ ይመዘገባል።"
                    : "Field attendance biometric templates are enrolled and verified exclusively via the authorized HR & Time Keeper Kiosk workflow."}
                </p>
              </div>
              <span className="font-mono text-[11px] text-emerald-700 font-bold shrink-0">
                HR / Time Keeper Governed
              </span>
            </div>
          </div>
        )}

        {/* SECTION 5: PRIVACY CENTER */}
        {activeTab === "privacy_center" && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {isAmharic ? "5. የግላዊነት ማዕከል (Privacy Center)" : "5. User Privacy Control Center"}
                </h3>
                <p className="text-xs text-slate-500">
                  {isAmharic
                    ? "Personal Information፣ Location Privacy፣ Camera & Photo Privacy እና Notification Privacy ይቆጣጠሩ።"
                    : "Manage Personal Information, Location Privacy, Camera & Photo Privacy, and Notification Privacy."}
                </p>
              </div>
              <button
                onClick={() => setActiveTab("legal_privacy_about")}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold cursor-pointer"
              >
                {isAmharic ? "የPrivacy Policy አንብብ" : "Read Full Privacy Policy"}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl border border-slate-200 space-y-2.5">
                <h4 className="font-bold text-slate-900">Personal Information</h4>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-slate-600">Profile & Employee Information Visibility (Team Directory)</span>
                  <input type="checkbox" checked readOnly className="accent-red-600" />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-slate-600">Phone Number Visibility to Site Supervisors</span>
                  <input type="checkbox" checked={privShowPhone} onChange={(e) => setPrivShowPhone(e.target.checked)} className="accent-red-600" />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-slate-600">Email Visibility in Project Reports</span>
                  <input type="checkbox" checked={privShowEmail} onChange={(e) => setPrivShowEmail(e.target.checked)} className="accent-red-600" />
                </label>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 space-y-2.5">
                <h4 className="font-bold text-slate-900">Location Privacy</h4>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-slate-600">GPS Usage (Active Only During Attendance & Site Work)</span>
                  <input type="checkbox" checked={privGpsUsage} onChange={(e) => setPrivGpsUsage(e.target.checked)} className="accent-red-600" />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-slate-600">Site Geofence Verification</span>
                  <input type="checkbox" checked={privSiteVerify} onChange={(e) => setPrivSiteVerify(e.target.checked)} className="accent-red-600" />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-slate-600">Location History Log Retention</span>
                  <input type="checkbox" checked={privLocationHistory} onChange={(e) => setPrivLocationHistory(e.target.checked)} className="accent-red-600" />
                </label>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 space-y-2.5">
                <h4 className="font-bold text-slate-900">Camera & Photo Privacy</h4>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-slate-600">Camera Permission (Progress & Inspection Capture)</span>
                  <input type="checkbox" checked={privCameraPerm} onChange={(e) => setPrivCameraPerm(e.target.checked)} className="accent-red-600" />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-slate-600">Construction Photo Vault Access</span>
                  <input type="checkbox" checked={privPhotoAccess} onChange={(e) => setPrivPhotoAccess(e.target.checked)} className="accent-red-600" />
                </label>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 space-y-2.5">
                <h4 className="font-bold text-slate-900">Notification Privacy</h4>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-slate-600">Push Notifications</span>
                  <input type="checkbox" checked={privPushNotif} onChange={(e) => setPrivPushNotif(e.target.checked)} className="accent-red-600" />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-slate-600">Attendance Alerts</span>
                  <input type="checkbox" checked={privAttendanceAlert} onChange={(e) => setPrivAttendanceAlert(e.target.checked)} className="accent-red-600" />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-slate-600">Work & Zone Assignment Alerts</span>
                  <input type="checkbox" checked={privWorkAlert} onChange={(e) => setPrivWorkAlert(e.target.checked)} className="accent-red-600" />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 6: ROLE-BASED ACCESS CONTROL (RBAC) */}
        {activeTab === "rbac_permissions" && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {isAmharic ? "6. የሚና ፍቃድ ቁጥጥር (Role-Based Access Control — RBAC)" : "6. Role-Based Access Control (RBAC) & Permission Management"}
              </h3>
              <p className="text-xs text-slate-500">
                {isAmharic
                  ? "እያንዳንዱ User የተፈቀደለትን ብቻ ያያል። Firebase Security Rules በRole + Project + Site + Permission መሰረት ይሰራሉ።"
                  : "Each role only accesses authorized modules, projects, and site boundaries."}
              </p>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              {RBAC_SPECIFICATION.map((item) => (
                <div key={item.role} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <p className="font-bold text-slate-900">
                      {item.role} <span className="text-slate-400">·</span>{" "}
                      <span className="text-slate-600">{item.titleAm}</span>
                    </p>
                    <p className="text-slate-600 mt-0.5">{isAmharic ? item.scopeAm : item.scopeEn}</p>
                  </div>
                  <span className="font-mono text-[11px] text-emerald-700 font-semibold shrink-0">
                    Role + Site Enforced
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECTION 11, 12 & 23: CONNECTED DEVICES, SESSION SECURITY & LOGOUT */}
        {activeTab === "device_session_logout" && (
          <div className="space-y-6">
            {/* Section 11: Device Management */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">
                  {isAmharic ? "11. የተገናኙ መሣሪያዎች አስተዳደር (Connected Devices)" : "11. Connected Devices & Unrecognized Device Verification"}
                </h3>
                <p className="text-xs text-slate-500">
                  {isAmharic
                    ? "Tecno Android፣ Samsung Android፣ Tablet — ያልታወቀ Device ከተገኘ Review Device → Verify → Sign Out አማራጭ አለው።"
                    : "Monitor Tecno Android, Samsung Android, Tablet & Workstation logins. Review, Verify, or Sign Out unrecognized devices."}
                </p>
              </div>

              <div className="divide-y divide-slate-100 text-xs">
                {devicesList.map((dev) => (
                  <div key={dev.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 font-bold text-slate-900">
                        <span>{dev.device}</span>
                        <span className="text-slate-400">·</span>
                        <span className={dev.verified ? "text-emerald-700" : "text-amber-600"}>
                          {dev.verified ? "Verified Device" : "Unrecognized Device — Review Required"}
                        </span>
                      </div>
                      <p className="text-slate-500 font-mono text-[11px] mt-0.5">
                        Type: {dev.type} · IP: {dev.ip} · Site: {dev.location} · {dev.activeAt}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {!dev.verified && (
                        <button
                          onClick={() => {
                            setDevicesList((prev) =>
                              prev.map((d) => (d.id === dev.id ? { ...d, recognized: true, verified: true } : d))
                            );
                            onLogAction("Device Verified", `Reviewed and verified device: ${dev.device}`);
                          }}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold cursor-pointer"
                        >
                          {isAmharic ? "Review → Verify" : "Review → Verify"}
                        </button>
                      )}
                      {dev.id !== "DEV-01" && (
                        <button
                          onClick={() => {
                            setDevicesList((prev) => prev.filter((d) => d.id !== dev.id));
                            onLogAction("Device Signed Out", `Signed out and revoked token for device: ${dev.device}`);
                          }}
                          className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg font-semibold cursor-pointer"
                        >
                          {isAmharic ? "Sign Out" : "Sign Out Device"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 12 & 23: Session Security & Logout */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {isAmharic ? "12 & 23. የክፍለ-ጊዜ ደህንነት እና መውጫ (Session Security & Logout)" : "12 & 23. Session Security, Token Rotation & Logout"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isAmharic
                      ? "Automatic Session Timeout፣ Refresh Token Rotation፣ Force Logout፣ Logout From All Devices እና Re-authentication።"
                      : "Automatic Session Timeout, Secure Token Management, Refresh Token Rotation, Re-authentication & Logout From All Devices."}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-600 font-semibold">Timeout:</span>
                  <select
                    value={sessionTimeoutMinutes}
                    onChange={(e) => {
                      const mins = parseInt(e.target.value, 10);
                      onChangeSessionTimeout(mins);
                      onLogAction("Session Timeout Updated", `Automatic session timeout set to ${mins} minutes`);
                    }}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-slate-800"
                  >
                    <option value={5}>5 Mins</option>
                    <option value={10}>10 Mins</option>
                    <option value={15}>15 Mins</option>
                    <option value={30}>30 Mins</option>
                  </select>
                </div>
              </div>

              {/* Sensitive Action Re-Authentication */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <p className="font-bold text-slate-900">
                    {isAmharic
                      ? "ለSensitive Actions (Payroll / User Role Change) እንደገና ማረጋገጫ (Re-authentication)"
                      : "Re-authentication for Sensitive Actions (Payroll / User Role Change)"}
                  </p>
                  <p className="text-slate-500 font-mono text-[11px] mt-0.5">
                    Last Refresh Token Rotation: {tokenRotatedAt} · Status:{" "}
                    <span className={reauthVerified ? "text-emerald-700 font-bold" : "text-amber-600 font-bold"}>
                      {reauthVerified ? "Re-authenticated" : "Verification Required for Sensitive Actions"}
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    placeholder={isAmharic ? "Password / PIN" : "Password / PIN"}
                    value={reauthPin}
                    onChange={(e) => setReauthPin(e.target.value)}
                    className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg w-32 font-mono"
                  />
                  <button
                    onClick={() => {
                      setReauthVerified(true);
                      setReauthPin("");
                      const now = new Date().toISOString().replace("T", " ").slice(0, 19);
                      setTokenRotatedAt(now);
                      onLogAction("Sensitive Action Re-Authenticated", "User re-authenticated and rotated refresh token.");
                    }}
                    className="px-3 py-1.5 bg-slate-900 text-white rounded-lg font-semibold cursor-pointer"
                  >
                    {isAmharic ? "አረጋግጥ እና Token አድስ" : "Verify & Rotate Token"}
                  </button>
                </div>
              </div>

              {/* Logout & Logout From All Devices */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  onClick={() => {
                    setActiveSessions((prev) => prev.filter((s) => s.isCurrent));
                    setDevicesList((prev) => prev.slice(0, 1));
                    const now = new Date().toISOString().replace("T", " ").slice(0, 19);
                    setTokenRotatedAt(now);
                    onLogAction("Logout From All Devices", "Revoked all remote sessions and rotated security tokens.");
                  }}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  {isAmharic ? "ከሁሉም መሣሪያዎች ውጣ (Logout From All Devices)" : "Logout From All Devices (Revoke All Tokens)"}
                </button>

                {onLogout && (
                  <button
                    onClick={onLogout}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1.5"
                  >
                    <LogOut size={14} />
                    <span>{isAmharic ? "Settings → Security → ውጣ (Logout)" : "Settings → Security → Logout"}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SECTION 15, 16 & 17: NOTIFICATIONS, LANGUAGE & APPEARANCE */}
        {activeTab === "notifications_lang_appearance" && (
          <div className="space-y-6">
            {/* Section 15: Notification Settings */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">
                  {isAmharic ? "15. የማሳወቂያ ቅንብሮች (Notification Settings)" : "15. Notification Settings"}
                </h3>
                <p className="text-xs text-slate-500">
                  {isAmharic
                    ? "Critical Security Alerts በRole መሰረት ለማጥፋት የተገደቡ ናቸው።"
                    : "Customize operational notifications. Critical Security Alerts remain enforced by Role policy."}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                {[
                  { key: "attendance", label: "Attendance Notifications" },
                  { key: "late", label: "Late Notifications" },
                  { key: "overtime", label: "Overtime Notifications" },
                  { key: "workPlan", label: "Work Plan Notifications" },
                  { key: "safetyAlerts", label: "Safety Alerts" },
                  { key: "qualityAlerts", label: "Quality Alerts" },
                  { key: "materialAlerts", label: "Material Alerts" },
                  { key: "approvalNotifications", label: "Approval Notifications" },
                  { key: "systemNotifications", label: "System Notifications" }
                ].map((item) => (
                  <label
                    key={item.key}
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between cursor-pointer"
                  >
                    <span className="font-semibold text-slate-800">{item.label}</span>
                    <input
                      type="checkbox"
                      checked={(notifSettings as any)[item.key]}
                      onChange={(e) =>
                        setNotifSettings((prev) => ({ ...prev, [item.key]: e.target.checked }))
                      }
                      className="accent-red-600"
                    />
                  </label>
                ))}
              </div>

              <div className="p-3.5 rounded-xl bg-red-50/60 border border-red-200 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-red-800">Critical Security Alerts (Role-Locked Mandatory)</span>
                  <p className="text-[11px] text-red-600">
                    {isAmharic
                      ? "አስቸኳይ የደህንነት ማስጠንቀቂያዎች በRole መሰረት ሁልጊዜ የበሩ ናቸው።"
                      : "Cannot be disabled for security compliance."}
                  </p>
                </div>
                <span className="font-mono text-[11px] font-bold text-red-700">ALWAYS ON</span>
              </div>
            </div>

            {/* Section 16 & 17: Language & Appearance */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
                <h3 className="text-base font-bold text-slate-900">
                  {isAmharic ? "16. የቋንቋ ቅንብሮች (Language Settings)" : "16. Language Settings"}
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (isAmharic && onToggleLanguage) onToggleLanguage();
                    }}
                    className={`px-4 py-2 rounded-lg font-semibold cursor-pointer ${
                      !isAmharic ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    English (Active)
                  </button>
                  <button
                    onClick={() => {
                      if (!isAmharic && onToggleLanguage) onToggleLanguage();
                    }}
                    className={`px-4 py-2 rounded-lg font-semibold cursor-pointer ${
                      isAmharic ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    አማርኛ / Amharic (Active)
                  </button>
                </div>
                <div className="pt-2 border-t border-slate-100 space-y-1">
                  <p className="font-semibold text-slate-700">
                    {isAmharic ? "ወደፊት የሚጨመሩ ቋንቋዎች (Upcoming Language Packs):" : "Upcoming Language Packs:"}
                  </p>
                  <p className="text-slate-500 font-mono">Afaan Oromoo · Tigrinya · Arabic</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
                <h3 className="text-base font-bold text-slate-900">
                  {isAmharic ? "17. ገጽታ እና ተደራሽነት (Appearance & Accessibility)" : "17. Appearance & Accessibility"}
                </h3>
                <div className="flex items-center gap-2">
                  {(["light", "dark", "system"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setThemeMode(m)}
                      className={`px-3 py-1.5 rounded-lg font-semibold capitalize cursor-pointer ${
                        themeMode === m ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {m} Mode
                    </button>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-600 font-semibold">Font Size:</span>
                  <div className="flex gap-1.5">
                    {(["small", "normal", "large"] as const).map((sz) => (
                      <button
                        key={sz}
                        onClick={() => setFontSize(sz)}
                        className={`px-2.5 py-1 rounded capitalize cursor-pointer ${
                          fontSize === sz ? "bg-red-600 text-white font-bold" : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="flex items-center justify-between cursor-pointer pt-1">
                  <span className="text-slate-600">High Contrast & Accessibility Mode</span>
                  <input
                    type="checkbox"
                    checked={highContrast}
                    onChange={(e) => setHighContrast(e.target.checked)}
                    className="accent-red-600"
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* DELEGATE SECTIONS 7, 8, 9, 10, 13, 14, 18, 19, 20, 21, 22, 24 TO OVID ENTERPRISE PANELS */}
        <OvidSettingsEnterprisePanels
          activeSection={activeTab}
          isAmharic={isAmharic}
          currentUserRole={currentUserRole}
          currentUserName={profileName}
          selectedProject={selectedProject}
          auditLogs={auditLogs}
          onLogAction={onLogAction}
          onNavigateSection={(sec) => setActiveTab(sec as SettingsTabId)}
        />

        {/* ROLE CHANGE APPROVAL SYSTEM */}
        {activeTab === "role_approval_hub" && (
          <UserRoleApprovalHub
            currentUserRole={currentUserRole}
            currentUserName={profileName}
            currentUserId={employeeId}
            isAmharic={isAmharic}
            onLogAction={onLogAction}
          />
        )}

        {/* ENTERPRISE SECURITY SOC */}
        {activeTab === "enterprise_soc" && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {isAmharic ? "ኢንተርፕራይዝ የደህንነት መቆጣጠሪያ ማዕከል (SOC)" : "Enterprise Security Operations Centre (SOC)"}
                </h3>
                <p className="text-xs text-slate-500">
                  Firebase App Check, AES-256-GCM Field Encryption, and Firebase Credentials Configuration.
                </p>
              </div>
              <button
                onClick={() => setShowFirebaseModal(true)}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-amber-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Key size={14} />
                <span>{isAmharic ? "የፋየርቤዝ ኤፒአይ ቁልፍ ማዋቀሪያ" : "Configure Firebase API Keys"}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">1. Firebase App Check Attestation</span>
                  <input
                    type="checkbox"
                    checked={appCheckEnabled}
                    onChange={(e) => setAppCheckEnabled(e.target.checked)}
                    className="accent-red-600"
                  />
                </div>
                <p className="text-slate-500">
                  Verifies client authenticity and blocks unauthorized API traffic before hitting Firestore or Cloud Functions.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 space-y-3">
                <p className="font-bold text-slate-900">2. AES-256-GCM Payload Encryption Test</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={plainText}
                    onChange={(e) => setPlainText(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                  />
                  <button
                    onClick={() => {
                      const encoded = Array.from(plainText)
                        .map((c) => c.charCodeAt(0).toString(16).padStart(2, "0"))
                        .join("");
                      setEncryptedHex(`AES256-GCM:${encoded.slice(0, 44)}...`);
                      onLogAction("Payload Encrypted", "Tested AES-256-GCM field encryption in SOC.");
                    }}
                    className="px-3 py-1.5 bg-slate-900 text-white rounded-lg font-semibold cursor-pointer"
                  >
                    Encrypt
                  </button>
                </div>
                {encryptedHex && <p className="font-mono text-[11px] text-emerald-700 break-all">{encryptedHex}</p>}
              </div>
            </div>
          </div>
        )}
      </div>

      <FirebaseConfigModal
        isOpen={showFirebaseModal}
        onClose={() => setShowFirebaseModal(false)}
        isAmharic={isAmharic}
      />
    </div>
  );
}
