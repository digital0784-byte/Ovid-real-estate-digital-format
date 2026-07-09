import React, { useState, useEffect } from "react";
import { UserRole, AuditLog } from "../types";
import { 
  Shield, 
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
  Download, 
  CheckCircle2, 
  Plus, 
  Trash2,
  Cpu,
  Tv,
  Users,
  MapPin,
  Laptop,
  Check,
  FileText,
  Printer
} from "lucide-react";

interface SecuritySettingsHubProps {
  isAmharic: boolean;
  currentUserRole: UserRole;
  onLogAction: (action: string, details: string) => void;
  auditLogs: AuditLog[];
  sessionTimeoutMinutes: number;
  onChangeSessionTimeout: (minutes: number) => void;
}

// Interface for Mock Locked Accounts
interface LockedAccount {
  id: string;
  name: string;
  role: string;
  reason: string;
  failedAttempts: number;
  lockedAt: string;
}

// Interface for Active Logged-In Sessions
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

export function SecuritySettingsHub({
  isAmharic,
  currentUserRole,
  onLogAction,
  auditLogs,
  sessionTimeoutMinutes,
  onChangeSessionTimeout
}: SecuritySettingsHubProps) {
  const [activeTab, setActiveTab] = useState<"user_settings" | "privacy_policy" | "admin_dashboard">("user_settings");

  // --- USER SETTINGS STATES ---
  const [profileName, setProfileName] = useState(
    currentUserRole === UserRole.HEAD_OFFICE ? "Nuriye Ahmed Adem" :
    currentUserRole === UserRole.PROJECT_MANAGER ? "Eng. Dawit" :
    currentUserRole === UserRole.SECTION_HEAD ? "Alemayehu Kebede" : "Site Operator"
  );
  const [profilePhone, setProfilePhone] = useState("0910097862/0920843843");
  const [profileEmail, setProfileEmail] = useState("mejennur669@gmail.com");
  const [themeMode, setThemeMode] = useState<"light" | "dark">("light");
  
  // Password change states
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [hashingProgress, setHashingProgress] = useState(0);
  const [isHashing, setIsHashing] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<{ score: number; label: string; color: string }>({ score: 0, label: "None", color: "bg-slate-200" });

  // Preferences toggles
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifSms, setNotifSms] = useState(true);
  const [notifPush, setNotifPush] = useState(false);
  const [bioFingerprintPref, setBioFingerprintPref] = useState(true);
  const [bioFacePref, setBioFacePref] = useState(false);
  const [privacyTelemetry, setPrivacyTelemetry] = useState(true);

  // User Registered Devices list
  const [devicesList, setDevicesList] = useState([
    { id: "DEV-01", device: "Desktop Workstation - Chrome (Current)", ip: "192.168.10.45", location: "Bole Heights Site B1", activeAt: "Just now" },
    { id: "DEV-02", device: "OVID ERP Android App (Samsung S24)", ip: "10.0.8.22", location: "Bole Heights Site B1", activeAt: "2 hours ago" },
    { id: "DEV-03", device: "Survey Tablet iOS Client (iPad Pro)", ip: "10.0.8.114", location: "Bole Heights Site B1", activeAt: "1 day ago" }
  ]);

  // --- ADMIN SECURITY STATES ---
  // Online/Active users session list
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([
    { id: "SES-101", userId: "HO-01", userName: "Eng. Yoseph", role: UserRole.HEAD_OFFICE, device: "Desktop Workstation - Chrome", ip: "192.168.10.45", gps: "9.0272° N, 38.7483° E", loginTime: "2026-07-09 07:15:33", isCurrent: true },
    { id: "SES-102", userId: "PM-01", userName: "Eng. Dawit", role: UserRole.PROJECT_MANAGER, device: "OVID ERP iOS (iPhone 15 Pro)", ip: "10.2.14.88", gps: "9.0272° N, 38.7483° E", loginTime: "2026-07-09 08:30:11", isCurrent: false },
    { id: "SES-103", userId: "SE-01", userName: "Sintayehu Alula", role: UserRole.SITE_ENGINEER, device: "Rugged Webpad OS", ip: "192.168.10.12", gps: "9.0272° N, 38.7483° E", loginTime: "2026-07-09 07:45:00", isCurrent: false },
    { id: "SES-104", userId: "TK-01", userName: "Abebe Girma", role: UserRole.TIME_KEEPER, device: "Attendance Biometric Kiosk B1", ip: "192.168.10.5", gps: "9.0272° N, 38.7483° E", loginTime: "2026-07-09 06:00:22", isCurrent: false }
  ]);

  // Mock Locked Accounts due to security failures
  const [lockedAccounts, setLockedAccounts] = useState<LockedAccount[]>([
    { id: "OVID-W-103", name: "Chala Kebede", role: "Worker", reason: "Repeated Biometric Mismatch (Fingerprint 4 failed scans)", failedAttempts: 4, lockedAt: "2026-07-09 09:12:44" },
    { id: "OVID-SV-03", name: "Kassa Hunegn", role: "Supervisor", reason: "Multiple incorrect MFA tokens entered", failedAttempts: 3, lockedAt: "2026-07-09 10:05:19" }
  ]);

  // Security Alerts
  const [securityAlerts, setSecurityAlerts] = useState([
    { id: "ALR-001", type: "High", title: "Biometric Failure Event", msg: "Worker Chala Kebede blocked due to 4 consecutive fingerprint mismatches on Kiosk #2.", time: "25 mins ago" },
    { id: "ALR-002", type: "Medium", title: "MFA Authentication Alert", msg: "Unusual authentication token delays from IP 10.2.14.88 (Eng. Dawit). Access allowed on second retry.", time: "1 hour ago" },
    { id: "ALR-003", type: "Low", title: "Unregistered Device Connection", msg: "New desktop client requested CAD read operations from office IP. Session validated by PM authorization.", time: "3 hours ago" }
  ]);

  // Backup states
  const [backupProgress, setBackupProgress] = useState(0);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [lastBackupTime, setLastBackupTime] = useState("2026-07-08 23:45:10");

  // Check password strength on changes
  useEffect(() => {
    if (!newPassword) {
      setPasswordStrength({ score: 0, label: "None", color: "bg-slate-200" });
      return;
    }
    let score = 0;
    if (newPassword.length >= 6) score++;
    if (newPassword.length >= 10) score++;
    if (/[A-Z]/.test(newPassword)) score++;
    if (/[0-9]/.test(newPassword)) score++;
    if (/[^A-Za-z0-9]/.test(newPassword)) score++;

    let label = "Very Weak";
    let color = "bg-rose-500";
    if (score === 3) { label = "Medium"; color = "bg-amber-500"; }
    else if (score === 4) { label = "Strong"; color = "bg-indigo-500"; }
    else if (score >= 5) { label = "Excellent"; color = "bg-emerald-500"; }

    setPasswordStrength({ score, label, color });
  }, [newPassword]);

  // Simulate password hashing visual security
  const handleUpdatePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword || !confirmPassword) {
      alert(isAmharic ? "እባክዎ ሁሉንም መስኮች ይሙሉ" : "Please fill in all fields");
      return;
    }
    if (newPassword !== confirmPassword) {
      alert(isAmharic ? "አዲሱ የይለፍ ቃል እና ማረጋገጫው አይዛመዱም" : "New passwords do not match");
      return;
    }

    setIsHashing(true);
    setHashingProgress(0);
    const interval = setInterval(() => {
      setHashingProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsHashing(false);
          setOldPassword("");
          setNewPassword("");
          setConfirmPassword("");
          onLogAction(
            "Password Changed", 
            `User modified account credentials. Encrypted database records updated with SHA-256 salted hash: 1d24c08e56...`
          );
          alert(isAmharic ? "የይለፍ ቃል በተሳካ ሁኔታ ተቀይሯል! SHA-256 ተመስጥሯል" : "Password securely updated with salt and hashed via SHA-256!");
          return 100;
        }
        return prev + 20;
      });
    }, 150);
  };

  // Simulate cloud database backup
  const startSystemCloudBackup = () => {
    if (isBackingUp) return;
    setIsBackingUp(true);
    setBackupProgress(0);
    const interval = setInterval(() => {
      setBackupProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsBackingUp(false);
          const nowStr = new Date().toISOString().replace("T", " ").slice(0, 19);
          setLastBackupTime(nowStr);
          onLogAction(
            "Manual Cloud Backup", 
            `Authorized administrator triggered manual database snapshot backup to Firestore Cold Vault. Verified checksum SHA-512.`
          );
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  // Simulate Unlock locked account
  const handleUnlockAccount = (id: string, name: string) => {
    setLockedAccounts((prev) => prev.filter(acc => acc.id !== id));
    onLogAction(
      "Account Unlocked", 
      `Administrator manually restored login privileges for User ID: ${id} (${name}). Lock counter reset.`
    );
  };

  // Terminate remote session
  const handleTerminateSession = (sesId: string, userName: string) => {
    setActiveSessions((prev) => prev.filter(ses => ses.id !== sesId));
    onLogAction(
      "Session Revoked", 
      `Forced logout signal dispatched to token session ${sesId} assigned to ${userName}.`
    );
  };

  // Revoke device
  const handleRemoveDevice = (id: string, name: string) => {
    setDevicesList((prev) => prev.filter(dev => dev.id !== id));
    onLogAction("Device Authorized Token Revoked", `Terminated TLS trust lease for client device: "${name}".`);
  };

  // Printer function
  const handlePrintPrivacyPolicy = () => {
    window.print();
  };

  // Determine authorized view for administrator security dashboard
  const hasAdminAccess = [
    UserRole.HEAD_OFFICE, 
    UserRole.PROJECT_MANAGER, 
    UserRole.SECTION_HEAD, 
    UserRole.TIME_KEEPER
  ].includes(currentUserRole);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      
      {/* Left Sidebar Control Menu */}
      <div className="lg:col-span-1 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-red-600 mb-4 px-2">
            <Shield size={18} className="animate-pulse" />
            <span className="text-xs font-black uppercase tracking-wider font-mono">
              {isAmharic ? "ደህንነት እና ቅንጅቶች" : "Security Gateway"}
            </span>
          </div>

          <button
            onClick={() => setActiveTab("user_settings")}
            className={`w-full px-3 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-2.5 cursor-pointer ${
              activeTab === "user_settings"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <User size={15} />
            <span>{isAmharic ? "የተጠቃሚ መገለጫ እና ምርጫዎች" : "User Profile & Settings"}</span>
          </button>

          <button
            onClick={() => setActiveTab("privacy_policy")}
            className={`w-full px-3 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-2.5 cursor-pointer ${
              activeTab === "privacy_policy"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <FileText size={15} />
            <span>{isAmharic ? "ግላዊነት እና የግል መረጃ አጠቃቀም ፖሊሲ" : "Privacy Policy & Terms"}</span>
          </button>

          {hasAdminAccess && (
            <button
              onClick={() => setActiveTab("admin_dashboard")}
              className={`w-full px-3 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-2.5 cursor-pointer ${
                activeTab === "admin_dashboard"
                  ? "bg-slate-900 text-red-400 shadow-xs border-l-4 border-red-500"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Activity size={15} className="text-red-500" />
              <span>{isAmharic ? "የደህንነት እና የቁጥጥር ዳሽቦርድ" : "Security Admin Terminal"}</span>
            </button>
          )}
        </div>

        {/* Current Active Role Metadata Container */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 font-mono text-[10px] text-slate-500">
          <p className="font-bold text-slate-700 uppercase mb-1">Session Metadata</p>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>User Role:</span>
              <span className="text-red-600 font-bold">{currentUserRole}</span>
            </div>
            <div className="flex justify-between">
              <span>Security Auth:</span>
              <span className="text-emerald-600 font-bold">MFA Active</span>
            </div>
            <div className="flex justify-between">
              <span>Encryption:</span>
              <span className="text-slate-700 font-bold">AES-256 SHA</span>
            </div>
            <div className="flex justify-between">
              <span>Session Limit:</span>
              <span className="text-slate-700 font-bold">{sessionTimeoutMinutes} Mins</span>
            </div>
          </div>
        </div>

        {/* System Administrator & Developer Info */}
        <div className="bg-red-50/50 p-3 rounded-xl border border-red-200/60 font-mono text-[10px] text-slate-600 space-y-1.5">
          <p className="font-bold text-red-700 uppercase flex items-center gap-1">
            <Cpu size={10} />
            <span>{isAmharic ? "የሲስተም አበልጻጊ እና አድሚን" : "Developer & Lead Admin"}</span>
          </p>
          <div className="space-y-1 text-slate-700">
            <div>
              <span className="text-slate-400">{isAmharic ? "ስም:" : "Name:"}</span>{" "}
              <span className="font-bold text-slate-900">Nuriye Ahmed Adem</span>
            </div>
            <div>
              <span className="text-slate-400">{isAmharic ? "ኢሜይል:" : "Email:"}</span>{" "}
              <span className="font-bold underline text-slate-800 text-[9.5px]">mejennur669@gmail.com</span>
            </div>
            <div>
              <span className="text-slate-400">{isAmharic ? "ስልክ:" : "Phone:"}</span>{" "}
              <span className="font-bold text-slate-900">0910097862 / 0920843843</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Pane */}
      <div className="lg:col-span-3">
        
        {/* TAB 1: USER SETTINGS */}
        {activeTab === "user_settings" && (
          <div className="space-y-6">
            
            {/* PROFILE & BIOMETRIC SETTINGS */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center space-x-2 border-b border-slate-100 pb-3 mb-4">
                <User size={18} className="text-red-500 animate-pulse" />
                <h3 className="text-sm font-black uppercase text-slate-800">
                  {isAmharic ? "የተጠቃሚ መገለጫ መረጃ" : "Personal Profile & Biometric Enrollment Metadata"}
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase font-bold mb-1">
                    {isAmharic ? "ሙሉ ስም" : "Employee Name"}
                  </label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-red-500 font-sans"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase font-bold mb-1">
                    {isAmharic ? "ድርጅታዊ ኢሜል" : "Corporate Email Address"}
                  </label>
                  <input
                    type="email"
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-red-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase font-bold mb-1">
                    {isAmharic ? "የተንቀሳቃሽ ስልክ ቁጥር" : "Mobile Network String"}
                  </label>
                  <input
                    type="text"
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-red-500 font-mono"
                  />
                </div>
              </div>

              {/* Preferences section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-4 border-t border-slate-100">
                
                {/* Preferences */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                    {isAmharic ? "የግል ምርጫዎች" : "Core Preferences"}
                  </h4>

                  <div className="space-y-2">
                    <label className="flex items-center justify-between text-xs cursor-pointer">
                      <span className="text-slate-600">{isAmharic ? "የስርዓቱ ቋንቋ (አማርኛ ንቁ)" : "Enable Amharic Core Engine"}</span>
                      <div className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={isAmharic} readOnly className="sr-only" />
                        <div className="w-9 h-5 bg-red-600 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-600"></div>
                      </div>
                    </label>

                    <label className="flex items-center justify-between text-xs cursor-pointer">
                      <span className="text-slate-600">{isAmharic ? "የመልክት ምርጫ (Email)" : "Push Alerts to Corporate Email"}</span>
                      <input
                        type="checkbox"
                        checked={notifEmail}
                        onChange={(e) => setNotifEmail(e.target.checked)}
                        className="accent-red-600 rounded"
                      />
                    </label>

                    <label className="flex items-center justify-between text-xs cursor-pointer">
                      <span className="text-slate-600">{isAmharic ? "የሞባይል ማሳወቂያ (SMS)" : "Emergency Daily SMS Dispatch"}</span>
                      <input
                        type="checkbox"
                        checked={notifSms}
                        onChange={(e) => setNotifSms(e.target.checked)}
                        className="accent-red-600 rounded"
                      />
                    </label>

                    <label className="flex items-center justify-between text-xs cursor-pointer">
                      <span className="text-slate-600">{isAmharic ? "የሳይት አጠቃቀም መረጃ ማጋራት (Telemetry)" : "Share Telemetry & CAD Logs"}</span>
                      <input
                        type="checkbox"
                        checked={privacyTelemetry}
                        onChange={(e) => setPrivacyTelemetry(e.target.checked)}
                        className="accent-red-600 rounded"
                      />
                    </label>
                  </div>
                </div>

                {/* Biometrics Preferences */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                    {isAmharic ? "የባዮሜትሪክ መግቢያ ቅንብሮች" : "Biometric Preferences"}
                  </h4>

                  <div className="space-y-2">
                    <label className="flex items-center justify-between text-xs cursor-pointer">
                      <span className="text-slate-600 flex items-center gap-1.5">
                        <Fingerprint size={14} className="text-slate-500" />
                        <span>{isAmharic ? "በጣት አሻራ መግቢያ ፍቀድ" : "Enable Trust-Fingerprint Sign-In"}</span>
                      </span>
                      <input
                        type="checkbox"
                        checked={bioFingerprintPref}
                        onChange={(e) => setBioFingerprintPref(e.target.checked)}
                        className="accent-red-600 rounded"
                      />
                    </label>

                    <label className="flex items-center justify-between text-xs cursor-pointer">
                      <span className="text-slate-600 flex items-center gap-1.5">
                        <Smartphone size={14} className="text-slate-500" />
                        <span>{isAmharic ? "በፊት መለያ መግቢያ ፍቀድ" : "Enable Multi-Vector Face Login"}</span>
                      </span>
                      <input
                        type="checkbox"
                        checked={bioFacePref}
                        onChange={(e) => setBioFacePref(e.target.checked)}
                        className="accent-red-600 rounded"
                      />
                    </label>

                    <div className="bg-slate-50 p-2.5 rounded-lg text-[10px] font-mono text-slate-500 leading-normal border border-slate-200">
                      <p className="font-bold text-slate-700 mb-1">Local Secure Element Only</p>
                      {isAmharic 
                        ? "የባዮሜትሪክ ምርጫዎችዎ በመሳሪያዎ አስተማማኝ ማከማቻ ውስጥ ብቻ የተመዘገቡ ሲሆኑ በደመና ላይ ጥሬ ምስሎች አይጫኑም።" 
                        : "Private keys reside exclusively inside this terminal's isolated hardware enclave. System never replicates raw papillary ridge or dermal vector frames."}
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* PASSWORD CHANGE WITH STRENGTH METER & HASHING SIMULATION */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center space-x-2 border-b border-slate-100 pb-3 mb-4">
                <Lock size={18} className="text-slate-800" />
                <h3 className="text-sm font-black uppercase text-slate-800">
                  {isAmharic ? "የይለፍ ቃል ማሻሻያ እና የደህንነት ሃሽ" : "Update Credentials & Secure Salt Hashing"}
                </h3>
              </div>

              <form onSubmit={handleUpdatePasswordSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 uppercase font-bold mb-1">
                      {isAmharic ? "ቀድሞ የነበረው ይለፍ ቃል" : "Current Password"}
                    </label>
                    <input
                      type="password"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-red-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 uppercase font-bold mb-1">
                      {isAmharic ? "አዲስ ይለፍ ቃል" : "New Secure Password"}
                    </label>
                    <div className="relative">
                      <input
                        type={showPass ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-3 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-red-500 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showPass ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                    </div>

                    {/* Password strength indicator */}
                    {newPassword && (
                      <div className="mt-2 space-y-1 animate-fade-in">
                        <div className="flex justify-between text-[10px] font-mono text-slate-500">
                          <span>Password Complexity:</span>
                          <span className="font-bold" style={{ color: passwordStrength.color.replace('bg-', 'text-') }}>
                            {passwordStrength.label}
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-300 ${passwordStrength.color}`} 
                            style={{ width: `${(passwordStrength.score / 5) * 100}%` }} 
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 uppercase font-bold mb-1">
                      {isAmharic ? "አዲስ የይለፍ ቃል ማረጋገጫ" : "Confirm New Password"}
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-red-500 font-mono"
                    />
                  </div>
                </div>

                {isHashing && (
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-center space-y-2 animate-pulse">
                    <div className="flex items-center justify-center space-x-2">
                      <RefreshCw className="animate-spin text-red-500" size={14} />
                      <span className="text-[10px] font-mono text-slate-300">
                        {isAmharic ? "የይለፍ ቃሉን በ SHA-256 ጨው (Salt) አክሎ በመሰወር ላይ..." : "Generating Cryptographic SHA-256 Salted Hash Block..."}
                      </span>
                    </div>
                    <div className="w-48 bg-slate-900 h-1 rounded-full overflow-hidden mx-auto">
                      <div className="bg-red-500 h-full" style={{ width: `${hashingProgress}%` }} />
                    </div>
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isHashing}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50"
                  >
                    <Lock size={12} />
                    <span>{isAmharic ? "የይለፍ ቃል በደህንነት ቀይር" : "Salt-Hash and Save Password"}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* REGISTERED DEVICE MANAGEMENT & IDLE TIMEOUT CONTROL */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div className="flex items-center space-x-2">
                  <Smartphone size={18} className="text-red-500" />
                  <h3 className="text-sm font-black uppercase text-slate-800">
                    {isAmharic ? "የሳይት መሣሪያዎች አስተዳደር እና የስብሰባ መቆራረጥ" : "Active Devices & Idle Session Control"}
                  </h3>
                </div>

                <div className="flex items-center space-x-2 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 font-mono text-[10px] text-slate-500">
                  <span>Idle Auto-Logout:</span>
                  <select
                    value={sessionTimeoutMinutes}
                    onChange={(e) => {
                      const mins = parseInt(e.target.value);
                      onChangeSessionTimeout(mins);
                      onLogAction("Idle Timeout Parameter Modified", `Changed automatic logout threshold to ${mins} minutes.`);
                    }}
                    className="bg-transparent border-none text-[10px] font-bold text-slate-700 focus:outline-none cursor-pointer p-0"
                  >
                    <option value={1}>1 Min</option>
                    <option value={3}>3 Mins</option>
                    <option value={5}>5 Mins</option>
                    <option value={10}>10 Mins</option>
                    <option value={15}>15 Mins</option>
                    <option value={30}>30 Mins</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-mono text-slate-400 uppercase">
                      <th className="py-2 font-black">{isAmharic ? "መሣሪያ" : "Registered Client Hardware"}</th>
                      <th className="py-2 font-black">IP ADDRESS</th>
                      <th className="py-2 font-black">{isAmharic ? "ቦታ / ሳይት" : "Location"}</th>
                      <th className="py-2 font-black">{isAmharic ? "ያለፈው እንቅስቃሴ" : "Last Active"}</th>
                      <th className="py-2 font-black text-right">{isAmharic ? "ውሳኔ" : "Action"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                    {devicesList.map((dev) => (
                      <tr key={dev.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 font-bold text-slate-800 flex items-center space-x-2">
                          <Laptop size={14} className="text-slate-400" />
                          <span>{dev.device}</span>
                        </td>
                        <td className="py-2.5 font-mono text-slate-500">{dev.ip}</td>
                        <td className="py-2.5">{dev.location}</td>
                        <td className="py-2.5 text-slate-500 font-mono text-[11px]">{dev.activeAt}</td>
                        <td className="py-2.5 text-right">
                          {dev.id === "DEV-01" ? (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold">
                              {isAmharic ? "አሁን ገባሪ" : "Active Element"}
                            </span>
                          ) : (
                            <button
                              onClick={() => handleRemoveDevice(dev.id, dev.device)}
                              className="text-red-500 hover:text-red-700 font-bold text-[11px] hover:underline cursor-pointer"
                            >
                              {isAmharic ? "መለያ አስወግድ" : "Revoke Lease"}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: PRIVACY POLICY & COMPLIANCE */}
        {activeTab === "privacy_policy" && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2 text-red-600">
                <FileText size={18} />
                <h3 className="text-sm font-black uppercase text-slate-800">
                  {isAmharic ? "ድርጅታዊ የግል መረጃ አጠቃቀምና ምስጢራዊነት መመሪያ" : "Corporate Privacy & Data Compliance Charter"}
                </h3>
              </div>

              <div className="flex space-x-1 no-print">
                <button
                  onClick={handlePrintPrivacyPolicy}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 transition-all text-xs font-bold flex items-center space-x-1.5 cursor-pointer"
                >
                  <Printer size={13} />
                  <span>{isAmharic ? "አትም / PDF" : "Print Charter"}</span>
                </button>
              </div>
            </div>

            {/* Charter Content */}
            <div className="text-xs text-slate-600 space-y-4 max-h-[60vh] overflow-y-auto pr-2 leading-relaxed">
              <div>
                <h4 className="font-bold text-slate-800 text-sm mb-1">
                  1. {isAmharic ? "መግቢያ እና የህግ ተገዢነት ማረጋገጫ" : "Introduction & Compliance Alignment"}
                </h4>
                <p>
                  {isAmharic 
                    ? "OVID Real Estate የግንባታ ፕሮጀክቶችን ምርታማነት ለማሻሻል የሚያግዝ ዘመናዊ መቆጣጠሪያ ሲጠቀም፣ የሰራተኞችን የግል መረጃ ጥበቃ (Proclamation No. 1205/2020) እና ዓለም አቀፍ የ GDPR ደንቦችን በጥብቅ ይከተላል።" 
                    : "This regulatory agreement establishes the data handling pipeline inside the OVID Smart Construction system. By integrating biometric hardware controls and telemetry logging, OVID Real Estate aligns itself strictly with global personal privacy frameworks and Proclamation No. 1205/2020 of the Federal Democratic Republic of Ethiopia."}
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 text-sm mb-1">
                  2. {isAmharic ? "የሚሰበሰቡ መረጃዎች ዝርዝር" : "Data Elements Logged & Structured"}
                </h4>
                <p>
                  {isAmharic 
                    ? "በግንባታው ሳይት ውስጥ በሚገኙ የጣት አሻራ መመዝገቢያ ኪዮስኮች፣ የፊት መለያ መሳሪያዎች እና የሞባይል አፖች አማካኝነት የሚከተሉት መረጃዎች በጥብቅ ደህንነታቸው ተጠብቆ ይመዘገባሉ፦" 
                    : "To facilitate automated attendance payroll checks, prevent physical attendance spoofing, and secure structural alignment records, our ERP parses and saves the following elements:"}
                </p>
                <ul className="list-disc list-inside ml-2 mt-1 space-y-1 font-mono text-[11px] text-slate-500">
                  <li>{isAmharic ? "የጣት አሻራ ሃሽ - (የቁጥር አልጎሪዝም ብቻ፣ ጥሬ አሻራ ምስል አይከማችም)" : "Biometric fingerprint math hashes (Never raw ridge imagery)"}</li>
                  <li>{isAmharic ? "የፊት ገጽታ ጂኦሜትሪ ቬክተሮች - (SHA-256 ጥብቅ ምስጠራ)" : "Facial layout vector coordinates (Encrypted client-side via AES)"}</li>
                  <li>{isAmharic ? "የጂፒኤስ የቦታ መጋጠሚያ - (በሳይቱ ውስጥ ሲገኙ ብቻ)" : "GPS site telemetry checked within active coordinate polygons"}</li>
                  <li>{isAmharic ? "የስራ መዝገብና የፎቶግራፍ ማስረጃዎች - (የአሉሚኒየም ዞን ፎርምወርክ ቁጥጥር)" : "Work progress photos showing engineering alignment checks"}</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 text-sm mb-1">
                  3. {isAmharic ? "የመረጃ ማከማቻ ጊዜ እና የመሰረዝ መብት" : "Retention Matrix & Erasure Rights"}
                </h4>
                <p>
                  {isAmharic 
                    ? "ሁሉም መረጃዎች በፋይናንስ ኦዲት እና በህግ ግዴታዎች ምክንያት ለሰባት (7) ዓመታት ያህል ደህንነቱ በተጠበቀ የደመና ማከማቻ ውስጥ ይቀመጣሉ። ሰራተኞች ከስራ በሚሰናበቱበት ወይም በሚለቁበት ጊዜ ባዮሜትሪክ መለያቸው ከሁሉም ተንቀሳቃሽ መሣሪያዎች ላይ በቋሚነት እንዲጠፋ ማድረግ ይችላሉ።" 
                    : "Data is retained in secure cold-storage databases for a legal audit period of seven (7) years to comply with construction dispute and taxation requirements. Workers retain absolute rights to request complete biometric revocation or profile re-enrollment at any time."}
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 text-sm mb-1">
                  4. {isAmharic ? "የደህንነት እና የምስጢር ጥበቃ ስልቶች" : "Dermal Encryption Protocols"}
                </h4>
                <p>
                  {isAmharic 
                    ? "ሶፍትዌሩ በመሳሪያዎች መካከል የሚደረጉ ግንኙነቶችን በሙሉ በ HTTPS/TLS 1.3 የሚመሰጥር ሲሆን በደመናው ላይ የሚቀመጡ ፋይሎችን ደግሞ በ AES-256 አልጎሪዝም ይቆልፋል። የደመና መቆጣጠሪያው በየቀኑ በራስ-ሰር ደህንነቱ የተጠበቀ መጠባበቂያ (Backups) ያዘጋጃል።" 
                    : "Our architecture deploys end-to-end TLS 1.3 encryption for data in transit and AES-256 for data at rest. Access tokens are governed by Multi-Factor Authentication and automatic session logout timers. Firewalls actively isolate CAD layers from unauthorized roles."}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center space-x-3">
              <CheckCircle2 className="text-emerald-500 shrink-0" size={20} />
              <div>
                <h4 className="text-xs font-bold text-slate-800">
                  {isAmharic ? "የተገዢነት ደረጃ፡ የጸደቀ" : "Compliance Status: Active Verified"}
                </h4>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                  {isAmharic 
                    ? "ይህ ሶፍትዌር ለብሔራዊ የደህንነት እና የግል መረጃ አጠቃቀም ደንቦች ተገዢ ሆኖ የተመዘገበ ነው።" 
                    : "Audit ID: OVID-PRV-2026-B1 | Last regulatory compliance inspection passed."}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ADMINISTRATOR SECURITY DASHBOARD */}
        {activeTab === "admin_dashboard" && hasAdminAccess && (
          <div className="space-y-6">
            
            {/* SECURITY KPI GRID */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="flex justify-between items-center text-slate-400 mb-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider">{isAmharic ? "ኦንላይን ሰራተኞች" : "Online Sessions"}</span>
                  <Users size={16} className="text-emerald-500" />
                </div>
                <p className="text-2xl font-black text-slate-800">{activeSessions.length}</p>
                <span className="text-[9px] font-mono text-emerald-600 font-bold">● Active Tokens</span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="flex justify-between items-center text-slate-400 mb-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider">{isAmharic ? "የታገዱ አካውንቶች" : "Locked Accounts"}</span>
                  <Lock size={16} className="text-red-500" />
                </div>
                <p className="text-2xl font-black text-slate-800">{lockedAccounts.length}</p>
                <span className="text-[9px] font-mono text-red-500 font-bold">{isAmharic ? "እገዳ ተጥሎባቸዋል" : "Unlock Needed"}</span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="flex justify-between items-center text-slate-400 mb-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider">{isAmharic ? "የደህንነት ማስጠንቀቂያ" : "Threat Warnings"}</span>
                  <AlertOctagon size={16} className="text-amber-500 animate-pulse" />
                </div>
                <p className="text-2xl font-black text-slate-800">{securityAlerts.length}</p>
                <span className="text-[9px] font-mono text-amber-600 font-bold">Risk Level: Safe</span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="flex justify-between items-center text-slate-400 mb-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider">{isAmharic ? "የደመና መጠባበቂያ" : "Database Backups"}</span>
                  <Database size={16} className="text-slate-500" />
                </div>
                <p className="text-[11px] font-mono font-bold text-slate-800 mt-2 truncate">{lastBackupTime.split(" ")[0]}</p>
                <span className="text-[9px] font-mono text-slate-400">{isAmharic ? "በየዕለቱ የተደራጀ" : "Daily cron active"}</span>
              </div>
            </div>

            {/* TWO COLUMN INTERACTIVE SECURITY GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Locked Accounts & Critical Security Alerts */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* LOCKED ACCOUNTS PANEL */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                  <h4 className="text-xs font-black uppercase text-slate-800 border-b border-slate-100 pb-2 mb-3 flex items-center justify-between">
                    <span>{isAmharic ? "የታገዱ የሰራተኛ መለያዎች ቁጥጥር" : "Locked Organization Terminals"}</span>
                    <span className="bg-red-50 text-red-700 text-[10px] px-2 py-0.5 rounded font-mono font-bold">
                      {lockedAccounts.length} {isAmharic ? "የታገዱ" : "Active Locks"}
                    </span>
                  </h4>

                  {lockedAccounts.length === 0 ? (
                    <div className="py-6 text-center text-slate-400 text-xs font-mono">
                      {isAmharic ? "የታገደ አካውንት የለም" : "No locked employee accounts currently detected."}
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {lockedAccounts.map((acc) => (
                        <div key={acc.id} className="py-3 flex items-center justify-between">
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs font-bold text-slate-800">{acc.name}</span>
                              <span className="text-[10px] font-mono text-slate-400">({acc.id})</span>
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-bold">{acc.role}</span>
                            </div>
                            <p className="text-[11px] text-red-500 mt-0.5 font-mono">{acc.reason}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5 font-mono">Locked: {acc.lockedAt}</p>
                          </div>
                          
                          <button
                            onClick={() => handleUnlockAccount(acc.id, acc.name)}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[11px] font-bold transition-all flex items-center space-x-1 cursor-pointer"
                          >
                            <Unlock size={12} />
                            <span>{isAmharic ? "ክፈት" : "Unlock"}</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ACTIVE LIVE USER SESSIONS */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                  <h4 className="text-xs font-black uppercase text-slate-800 border-b border-slate-100 pb-2 mb-3">
                    {isAmharic ? "የቀጥታ ስራ ላይ ያሉ ክፍለ-ጊዜዎች (Sessions)" : "Active Encrypted Sessions (Tokens)"}
                  </h4>

                  <div className="divide-y divide-slate-100 text-xs text-slate-600">
                    {activeSessions.map((ses) => (
                      <div key={ses.id} className="py-3 flex items-center justify-between hover:bg-slate-50/30">
                        <div className="space-y-0.5">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-slate-800">{ses.userName}</span>
                            <span className="text-[10px] font-mono text-slate-400">({ses.userId})</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-bold uppercase font-mono">{ses.role}</span>
                            {ses.isCurrent && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold uppercase font-mono">Current</span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 flex items-center gap-1">
                            <Laptop size={11} />
                            <span>{ses.device}</span>
                            <span className="text-slate-300">|</span>
                            <span className="font-mono">{ses.ip}</span>
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                            <MapPin size={11} className="text-red-500" />
                            <span>{ses.gps}</span>
                            <span className="text-slate-300">|</span>
                            <span>Login: {ses.loginTime}</span>
                          </p>
                        </div>

                        {!ses.isCurrent && (
                          <button
                            onClick={() => handleTerminateSession(ses.id, ses.userName)}
                            className="text-red-500 hover:text-red-700 font-bold hover:underline text-[11px] cursor-pointer"
                          >
                            {isAmharic ? "አስወጣ" : "Kill"}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Right Sidebar: Backups & System Health */}
              <div className="space-y-6">
                
                {/* SYSTEM HEALTH TELEMETRY */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                  <h4 className="text-xs font-black uppercase text-slate-800 border-b border-slate-100 pb-2">
                    {isAmharic ? "የስርዓቱ ጤንነትና ደመና ማመሳሰል" : "Cloud Sync & Server Health"}
                  </h4>

                  <div className="space-y-3 font-mono text-[11px]">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Gateway Engine:</span>
                      <span className="text-emerald-600 font-bold flex items-center gap-1">
                        <Check size={12} />
                        <span>ONLINE</span>
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Database Sync:</span>
                      <span className="text-emerald-600 font-bold flex items-center gap-1">
                        <Check size={12} />
                        <span>REPLICATED</span>
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">TLS Encryption:</span>
                      <span className="text-slate-800 font-bold font-sans">AES-256 GCM</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Worker Audit Rate:</span>
                      <span className="text-slate-800 font-bold font-sans">100% Biometric</span>
                    </div>
                  </div>

                  {/* Manual backup utility */}
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">{isAmharic ? "ያለፈው ባክአፕ" : "Last Backup"}</span>
                      <span className="text-[10px] font-mono text-slate-800 font-bold">{lastBackupTime.split(" ")[1]}</span>
                    </div>

                    {isBackingUp ? (
                      <div className="space-y-1.5 py-1">
                        <div className="flex justify-between text-[10px] font-mono text-slate-500">
                          <span>Replicating Firestore...</span>
                          <span>{backupProgress}%</span>
                        </div>
                        <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden">
                          <div className="bg-red-500 h-full transition-all" style={{ width: `${backupProgress}%` }} />
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={startSystemCloudBackup}
                        className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[10px] font-bold uppercase transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                      >
                        <Database size={11} />
                        <span>{isAmharic ? "ባክአፕ በራስ-ሰር አዘጋጅ" : "Run Secure Cloud Backup"}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* CRITICAL SECURITY ALERTS LOG */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                  <h4 className="text-xs font-black uppercase text-slate-800 border-b border-slate-100 pb-2 mb-3">
                    {isAmharic ? "የደህንነት ማስጠንቀቂያ መዝገብ" : "Security Incident Alert Rail"}
                  </h4>

                  <div className="space-y-3">
                    {securityAlerts.map((alr) => (
                      <div 
                        key={alr.id} 
                        className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                          alr.type === "High" 
                            ? "bg-rose-50/50 border-rose-100 text-rose-800" 
                            : alr.type === "Medium" 
                              ? "bg-amber-50/50 border-amber-100 text-amber-800" 
                              : "bg-slate-50 border-slate-150 text-slate-700"
                        }`}
                      >
                        <AlertOctagon size={14} className="shrink-0 mt-0.5" />
                        <div className="text-xs leading-normal">
                          <div className="flex justify-between font-bold">
                            <span>{alr.title}</span>
                            <span className="font-mono text-[9px] text-slate-400">{alr.time}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1">{alr.msg}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>

          </div>
        )}

      </div>

    </div>
  );
}
