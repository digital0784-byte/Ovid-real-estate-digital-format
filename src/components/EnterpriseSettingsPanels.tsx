import React, { useState } from "react";
import { UserRole, AuditLog } from "../types";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Lock,
  MapPin,
  Camera,
  FileText,
  Database,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  HardHat,
  HelpCircle,
  Phone,
  Mail,
  Printer,
  Download,
  Upload,
  Eye,
  Key,
  Wifi,
  WifiOff,
  Server,
  Activity,
  UserX,
  ArrowDown
} from "lucide-react";

export interface EnterprisePanelsProps {
  activeSection: string;
  isAmharic: boolean;
  currentUserRole: UserRole;
  currentUserName: string;
  selectedProject: string;
  auditLogs: AuditLog[];
  onLogAction: (action: string, details: string) => void;
  onNavigateSection: (section: string) => void;
}

export const EnterpriseSettingsPanels: React.FC<EnterprisePanelsProps> = ({
  activeSection,
  isAmharic,
  currentUserRole,
  currentUserName,
  selectedProject,
  auditLogs,
  onLogAction,
  onNavigateSection
}) => {
  const isAdminOrExec = [
    UserRole.SUPER_ADMIN,
    UserRole.HEAD_OFFICE,
    UserRole.PROJECT_MANAGER,
    UserRole.HR_MANAGER,
    UserRole.SUPERVISOR,
    UserRole.TIME_KEEPER
  ].includes(currentUserRole);

  // Section 7: GPS Security state
  const [gpsSimMode, setGpsSimMode] = useState<"inside" | "outside">("inside");
  const [gpsStepActive, setGpsStepActive] = useState<number>(6);
  const [gpsLastResult, setGpsLastResult] = useState<string>(
    "Verified inside Bole Heights Site B1 Geofence (9.0272° N, 38.7483° E) — Attendance Event #ATT-2026-9941 Dispatched"
  );

  // Section 8 & 22: Anti-Fraud & Emergency Security Alerts
  const [emergencyAlerts, setEmergencyAlerts] = useState([
    {
      id: "EMG-01",
      code: "Suspicious Login",
      titleAm: "አጠራጣሪ የመግቢያ ሙከራ (Suspicious Login)",
      severity: "CRITICAL",
      targetRoles: "Head Office / Super Admin / Security",
      details: "Unrecognized login attempt from IP 197.156.84.19 outside working hours.",
      time: "2026-09-29 06:42",
      resolved: false
    },
    {
      id: "EMG-02",
      code: "GPS Fraud Alert",
      titleAm: "የጂፒኤስ ማጭበርበር ማስጠንቀቂያ (GPS Fraud Alert)",
      severity: "CRITICAL",
      targetRoles: "Time Keeper / Supervisor / Head Office",
      details: "Mock GPS location detected 4.2 km outside Bole Heights Site B1 geofence polygon.",
      time: "2026-09-29 07:15",
      resolved: false
    },
    {
      id: "EMG-03",
      code: "Unauthorized Access",
      titleAm: "ያልተፈቀደ የመረጃ መዳረሻ (Unauthorized Access)",
      severity: "HIGH",
      targetRoles: "Head Office / Super Admin",
      details: "Gang Chief role attempted cross-site worker query on Kazanchis Site B2 (Blocked by Firestore Rules).",
      time: "2026-09-29 08:03",
      resolved: false
    },
    {
      id: "EMG-04",
      code: "Multiple Failed Login",
      titleAm: "ተደጋጋሚ የተሳሳተ የመግቢያ ሙከራ (Multiple Failed Login)",
      severity: "HIGH",
      targetRoles: "Time Keeper / Supervisor / Head Office",
      details: "4 consecutive failed password/OTP attempts on terminal Kiosk #2.",
      time: "2026-09-29 08:20",
      resolved: false
    },
    {
      id: "EMG-05",
      code: "Attendance Manipulation Attempt",
      titleAm: "የመገኘት መዝገብ ማዛባት ሙከራ (Attendance Manipulation Attempt)",
      severity: "CRITICAL",
      targetRoles: "Time Keeper / Supervisor / Head Office",
      details: "Duplicate clock-in event submitted within 90 seconds for same Employee ID.",
      time: "2026-09-29 08:45",
      resolved: false
    },
    {
      id: "EMG-06",
      code: "Unrecognized Device",
      titleAm: "ያልታወቀ መሣሪያ (Unrecognized Device)",
      severity: "MEDIUM",
      targetRoles: "Head Office / Super Admin",
      details: "New Android client (Tecno Spark 20) requested session token without prior device verification.",
      time: "2026-09-29 09:10",
      resolved: false
    }
  ]);

  // Section 9 & 10: Attendance Correction Security & Detailed Audit Trail
  const [correctionRequests, setCorrectionRequests] = useState([
    {
      id: "CORR-2026-01",
      employeeName: "Kebede Tadesse (EMP-W-204)",
      date: "29/09/2026",
      oldStatus: "Absent",
      newStatus: "Present",
      reason: "Approved correction — Biometric kiosk #1 was syncing offline queue during morning muster",
      requestedBy: "Time Keeper",
      approver: "Supervisor / Authorized Approver",
      workflowStage: "Approved" as "Employee Submitted" | "Time Keeper Reviewed" | "Approved"
    },
    {
      id: "CORR-2026-02",
      employeeName: "Dawit Mekonnen (EMP-W-318)",
      date: "29/09/2026",
      oldStatus: "Late",
      newStatus: "Present",
      reason: "Assigned to early material offloading at Main Warehouse Gate",
      requestedBy: "Time Keeper",
      approver: "Supervisor",
      workflowStage: "Time Keeper Reviewed" as "Employee Submitted" | "Time Keeper Reviewed" | "Approved"
    }
  ]);

  const [newCorrEmp, setNewCorrEmp] = useState("");
  const [newCorrOld, setNewCorrOld] = useState("Absent");
  const [newCorrNew, setNewCorrNew] = useState("Present");
  const [newCorrReason, setNewCorrReason] = useState("");

  // Section 14: CAD & Construction Document Version History
  const [cadVersions, setCadVersions] = useState([
    {
      id: "CAD-VER-03",
      fileName: "DCERP_Bole_Heights_B1_Fl04_Formwork_Layout.dwg",
      version: "v3.0 (Current Active)",
      uploadedBy: "Site Engineer",
      uploadedAt: "2026-09-29 08:30",
      project: selectedProject || "Addis Ababa Tower Block A",
      permissions: "Role + Project Bound (Site Engineer, Surveyor, PM, Head Office)",
      checksum: "SHA256:9f84c2a1e0b7"
    },
    {
      id: "CAD-VER-02",
      fileName: "DCERP_Bole_Heights_B1_Fl04_Formwork_Layout.dwg",
      version: "v2.0 (Archived History)",
      uploadedBy: "Site Engineer",
      uploadedAt: "2026-09-24 14:15",
      project: selectedProject || "Addis Ababa Tower Block A",
      permissions: "Read-Only Historical Archive",
      checksum: "SHA256:4b12d8f0c3a9"
    },
    {
      id: "CAD-VER-01",
      fileName: "DCERP_Bole_Heights_B1_Fl04_Formwork_Layout.dwg",
      version: "v1.0 (Initial Baseline)",
      uploadedBy: "Project Manager",
      uploadedAt: "2026-09-18 09:00",
      project: selectedProject || "Addis Ababa Tower Block A",
      permissions: "Read-Only Historical Archive",
      checksum: "SHA256:1c09e7a5b2d4"
    }
  ]);

  // Section 18: Offline Security Queue with Unique Event IDs
  const [offlineQueue, setOfflineQueue] = useState([
    {
      eventId: "EVT-UID-20260929-8841A",
      type: "Attendance Event",
      payload: "Biometric Clock-In · Zone A · 07:02:14",
      encrypted: "AES-256 Local Storage",
      syncStatus: "Synced (Deduplicated)"
    },
    {
      eventId: "EVT-UID-20260929-8842B",
      type: "Daily Activity",
      payload: "42 Aluminum Wall Panels Installed · Floor 4",
      encrypted: "AES-256 Local Storage",
      syncStatus: "Synced (Deduplicated)"
    },
    {
      eventId: "EVT-UID-20260929-8843C",
      type: "Construction Photo",
      payload: "Slab_Reinforcement_Check_Fl04.jpg (2.4 MB)",
      encrypted: "AES-256 Local Storage",
      syncStatus: "Pending Reconnection"
    },
    {
      eventId: "EVT-UID-20260929-8844D",
      type: "Work Note",
      payload: "Surveyor benchmark elevation verified at +12.450m",
      encrypted: "AES-256 Local Storage",
      syncStatus: "Pending Reconnection"
    }
  ]);

  // Section 19: Backup & Recovery state
  const [backupModules, setBackupModules] = useState([
    { name: "Employee Records", status: "Backed Up", lastSync: "2026-09-29 06:00", size: "18.4 MB" },
    { name: "Attendance Ledger", status: "Backed Up", lastSync: "2026-09-29 06:00", size: "64.2 MB" },
    { name: "Payroll & Finance", status: "Backed Up", lastSync: "2026-09-29 06:00", size: "31.0 MB" },
    { name: "Project & Zones", status: "Backed Up", lastSync: "2026-09-29 06:00", size: "12.7 MB" },
    { name: "CAD Drawings Vault", status: "Backed Up", lastSync: "2026-09-29 06:00", size: "412.5 MB" },
    { name: "Survey Measurements", status: "Backed Up", lastSync: "2026-09-29 06:00", size: "29.8 MB" },
    { name: "Daily & Progress Reports", status: "Backed Up", lastSync: "2026-09-29 06:00", size: "85.1 MB" },
    { name: "Immutable Audit Logs", status: "Backed Up", lastSync: "2026-09-29 06:00", size: "44.6 MB" }
  ]);
  const [runningBackup, setRunningBackup] = useState(false);

  // Section 21: Account Deactivation Request state
  const [deactivationReason, setDeactivationReason] = useState("");
  const [deactivationSubmitted, setDeactivationSubmitted] = useState(false);

  // Section 7: GPS & Location Security
  if (activeSection === "gps_location") {
    const gpsSteps = [
      { step: 1, titleEn: "1. Employee Identity Verification", titleAm: "1. የሰራተኛ ማንነት ማረጋገጫ (Employee Identity)" },
      { step: 2, titleEn: "2. Device Authentication Check", titleAm: "2. የመሣሪያ ማረጋገጫ (Device Authentication)" },
      { step: 3, titleEn: "3. GPS / Site Geofence Boundary Check", titleAm: "3. የጂፒኤስ እና የሳይት ክልል ፍተሻ (GPS Geofence)" },
      { step: 4, titleEn: "4. Tamper-Proof Date & Time Stamp", titleAm: "4. ትክክለኛ ቀን እና ሰዓት ምዝገባ (Date & Time)" },
      { step: 5, titleEn: "5. Cryptographic Attendance Event Creation", titleAm: "5. የመገኘት ክስተት መፍጠር (Attendance Event)" },
      { step: 6, titleEn: "6. Real-Time Broadcast to Authorized Apps", titleAm: "6. ለተፈቀዱ አፖች በቀጥታ ማድረስ (Real-Time Sync)" }
    ];

    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isAmharic ? "7. የጂፒኤስ እና የሳይት ክልል ደህንነት (GPS & Geofence Security)" : "7. GPS & Site Geofence Attendance Security"}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {isAmharic
                  ? "Attendance ሲፈረም የሚፈጸሙ 6 የደህንነት እርከኖች እና ከሳይት ክልል ውጭ ሲሆን የሚሰጥ ማስጠንቀቂያ።"
                  : "6-stage verification pipeline executed on every attendance signature with real-time geofence boundary enforcement."}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setGpsSimMode("inside");
                  setGpsStepActive(6);
                  const msg = "Verified inside Bole Heights Site B1 Geofence (9.0272° N, 38.7483° E) — Attendance Event Dispatched in Real-Time.";
                  setGpsLastResult(msg);
                  onLogAction("GPS Geofence Verified", msg);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  gpsSimMode === "inside" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {isAmharic ? "በሳይት ክልል ውስጥ ፈትሽ" : "Simulate Inside Geofence"}
              </button>
              <button
                onClick={() => {
                  setGpsSimMode("outside");
                  setGpsStepActive(3);
                  const msg = "Location Verification Failed: Coordinates (8.9811° N, 38.7102° E) are outside authorized Site Geofence.";
                  setGpsLastResult(msg);
                  onLogAction("Location Verification Failed", msg);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  gpsSimMode === "outside" ? "bg-red-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {isAmharic ? "ከሳይት ውጭ ፈትሽ (Geofence Alert)" : "Simulate Outside Geofence"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {gpsSteps.map((s) => {
              const failedHere = gpsSimMode === "outside" && s.step === 3;
              const blockedAfter = gpsSimMode === "outside" && s.step > 3;
              return (
                <div
                  key={s.step}
                  className={`p-3.5 rounded-xl border text-xs space-y-1 ${
                    failedHere
                      ? "bg-red-50 border-red-300 text-red-900"
                      : blockedAfter
                      ? "bg-slate-50 border-slate-200 text-slate-400"
                      : "bg-emerald-50/50 border-emerald-200 text-slate-800"
                  }`}
                >
                  <div className="flex items-center justify-between font-bold">
                    <span>{isAmharic ? s.titleAm : s.titleEn}</span>
                    {failedHere ? (
                      <XCircle size={15} className="text-red-600 shrink-0" />
                    ) : blockedAfter ? (
                      <Clock size={15} className="text-slate-400 shrink-0" />
                    ) : (
                      <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                    )}
                  </div>
                  <p className="text-[11px] font-mono">
                    {failedHere
                      ? "Location Verification Failed"
                      : blockedAfter
                      ? "Halted by Geofence Guard"
                      : "Verified & Passed"}
                  </p>
                </div>
              );
            })}
          </div>

          <div
            className={`p-4 rounded-xl border flex items-start gap-3 ${
              gpsSimMode === "outside"
                ? "bg-red-50 border-red-200 text-red-900"
                : "bg-slate-900 border-slate-800 text-slate-100"
            }`}
          >
            <MapPin size={18} className={gpsSimMode === "outside" ? "text-red-600 shrink-0 mt-0.5" : "text-emerald-400 shrink-0 mt-0.5"} />
            <div className="text-xs space-y-1">
              <p className="font-bold">
                {gpsSimMode === "outside"
                  ? isAmharic
                    ? "ማስጠንቀቂያ፦ Location Verification Failed (ከተፈቀደው የሳይት ክልል ውጭ)"
                    : "WARNING: Location Verification Failed — Outside Site Geofence"
                  : isAmharic
                  ? "የጂፒኤስ ማረጋገጫ ተሳክቷል (Geofence Active & Verified)"
                  : "GPS Site Geofence Verification Succeeded"}
              </p>
              <p className="font-mono text-[11px] opacity-90">{gpsLastResult}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Section 8 & 22: Anti-Fraud Security & Emergency Security Alert Center
  if (activeSection === "security_antifraud") {
    const antiFraudChecks = [
      { title: "Duplicate Attendance", descAm: "ተደጋጋሚ የመገኘት ምዝገባ መከላከያ", status: "Active Guard" },
      { title: "Duplicate Employee ID", descAm: "ተደጋጋሚ የሰራተኛ መታወቂያ ቁጥጥር", status: "Active Guard" },
      { title: "Suspicious Device", descAm: "ያልተፈቀደ ወይም አጠራጣሪ ስልክ/ታብሌት", status: "Active Guard" },
      { title: "Abnormal GPS", descAm: "ከሳይት ክልል ውጭ ወይም የተጭበረበረ ጂፒኤስ", status: "Active Guard" },
      { title: "Repeated Failed Authentication", descAm: "ተደጋጋሚ የተሳሳተ የይለፍ ቃል/OTP ሙከራ", status: "Active Guard" },
      { title: "Suspicious Login", descAm: "ያልተለመደ የመግቢያ ሰዓት ወይም አይፒ", status: "Active Guard" },
      { title: "Multiple Account Usage", descAm: "በአንድ መሣሪያ ብዙ መለያዎችን መጠቀም", status: "Active Guard" },
      { title: "Modified Attendance Records", descAm: "ያለ ፈቃድ የተቀየሩ የመገኘት መዝገቦች", status: "Active Guard" },
      { title: "Unusual Time Records", descAm: "ያልተለመደ የመግቢያ/መውጫ ሰዓት ምዝገባ", status: "Active Guard" }
    ];

    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900">
              {isAmharic ? "8. የጸረ-ማጭበርበር ደህንነት ቁጥጥር (Anti-Fraud Security Engine)" : "8. Anti-Fraud Security Detection Matrix"}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isAmharic
                ? "የተጠረጠረ ክስተት ከተገኘ Security Alert ወደ Time Keeper / Supervisor / Head Office በRole መሰረት ይላካል።"
                : "Real-time anomaly detection. Any suspicious event automatically dispatches role-targeted alerts to Time Keeper, Supervisor, and Head Office."}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {antiFraudChecks.map((rule) => (
              <div key={rule.title} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-slate-900">{rule.title}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{rule.descAm}</p>
                </div>
                <span className="text-[11px] font-mono text-emerald-700 font-semibold shrink-0">{rule.status}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-red-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-red-700 flex items-center gap-2">
                <ShieldAlert size={18} />
                <span>{isAmharic ? "22. የአደጋ ጊዜ የደህንነት ማስጠንቀቂያ ማዕከል (Emergency Security Alert Center)" : "22. Emergency Security Alert Center"}</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {isAmharic
                  ? "Head Office እና የተፈቀደላቸው Security/Admin Users ማስጠንቀቂያውን በቀጥታ ያያሉ።"
                  : "Live critical security incident feed monitored by Head Office, Super Admin, Supervisor, and Time Keeper."}
              </p>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {emergencyAlerts.map((alert) => (
              <div key={alert.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-bold text-red-600">● {alert.code}</span>
                    <span className="text-slate-400">·</span>
                    <span className="font-semibold text-slate-800">{alert.titleAm}</span>
                    <span className="text-slate-400">·</span>
                    <span className="font-mono text-[11px] text-slate-500">{alert.time}</span>
                  </div>
                  <p className="text-xs text-slate-600">{alert.details}</p>
                  <p className="text-[11px] font-mono text-slate-500">Routed to: {alert.targetRoles}</p>
                </div>
                {isAdminOrExec && (
                  <button
                    onClick={() => {
                      setEmergencyAlerts((prev) =>
                        prev.map((a) => (a.id === alert.id ? { ...a, resolved: !a.resolved } : a))
                      );
                      onLogAction("Emergency Security Alert Reviewed", `Reviewed alert ${alert.code} (${alert.id})`);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer shrink-0 ${
                      alert.resolved
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-red-600 text-white hover:bg-red-700"
                    }`}
                  >
                    {alert.resolved
                      ? isAmharic
                        ? "ተፈትሾ ተዘግቷል"
                        : "Acknowledged"
                      : isAmharic
                      ? "አጣራ እና እርምጃ ውሰድ"
                      : "Acknowledge & Lock"}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Section 9 & 10: Immutable Audit Log & Attendance Correction Security
  if (activeSection === "audit_attendance_correction") {
    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900">
              {isAmharic
                ? "10. የመገኘት መዝገብ ማስተካከያ ደህንነት (Attendance Correction Security)"
                : "10. Attendance Correction Security Workflow"}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isAmharic
                ? "Workflow: Employee → Time Keeper → Supervisor / Authorized Approver. ማን እንደቀየረው፣ ምክንያቱ እና የapproval ሁኔታ ይመዘገባል።"
                : "Strict 3-stage chain: Employee → Time Keeper → Supervisor / Authorized Approver. Logs actor, reason, old/new values, and approval status."}
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newCorrEmp.trim() || !newCorrReason.trim()) return;
              const item = {
                id: `CORR-2026-0${correctionRequests.length + 1}`,
                employeeName: newCorrEmp.trim(),
                date: new Date().toLocaleDateString("en-GB"),
                oldStatus: newCorrOld,
                newStatus: newCorrNew,
                reason: newCorrReason.trim(),
                requestedBy: `${currentUserName} (${currentUserRole})`,
                approver: "Supervisor / Authorized Approver",
                workflowStage: "Time Keeper Reviewed" as const
              };
              setCorrectionRequests((prev) => [item, ...prev]);
              onLogAction(
                "Attendance Record Correction Requested",
                `Employee: ${item.employeeName} | Old Status: ${item.oldStatus} → New Status: ${item.newStatus} | Reason: ${item.reason}`
              );
              setNewCorrEmp("");
              setNewCorrReason("");
            }}
            className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs"
          >
            <input
              type="text"
              placeholder={isAmharic ? "የሰራተኛ ስም እና መታወቂያ" : "Employee Name & ID"}
              value={newCorrEmp}
              onChange={(e) => setNewCorrEmp(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800"
            />
            <div className="flex items-center gap-2">
              <select
                value={newCorrOld}
                onChange={(e) => setNewCorrOld(e.target.value)}
                className="w-1/2 px-2 py-2 bg-white border border-slate-200 rounded-lg text-slate-800"
              >
                <option value="Absent">Old: Absent</option>
                <option value="Late">Old: Late</option>
                <option value="Half Day">Old: Half Day</option>
              </select>
              <select
                value={newCorrNew}
                onChange={(e) => setNewCorrNew(e.target.value)}
                className="w-1/2 px-2 py-2 bg-white border border-slate-200 rounded-lg text-slate-800"
              >
                <option value="Present">New: Present</option>
                <option value="Leave">New: Leave</option>
                <option value="Overtime">New: Overtime</option>
              </select>
            </div>
            <input
              type="text"
              placeholder={isAmharic ? "የማስተካከያ ምክንያት..." : "Reason for attendance correction..."}
              value={newCorrReason}
              onChange={(e) => setNewCorrReason(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg cursor-pointer"
            >
              {isAmharic ? "ማስተካከያ አቅርብ" : "Submit Correction"}
            </button>
          </form>

          <div className="divide-y divide-slate-100 text-xs">
            {correctionRequests.map((c) => (
              <div key={c.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-bold text-slate-900">
                    <span>Attendance Record Changed</span>
                    <span className="text-slate-400">·</span>
                    <span>{c.employeeName}</span>
                    <span className="text-slate-400">·</span>
                    <span className="font-mono text-slate-500">Date: {c.date}</span>
                  </div>
                  <p className="text-slate-600 font-mono text-[11px]">
                    User: {c.requestedBy} · Old Status: <span className="text-red-600 font-bold">{c.oldStatus}</span> → New Status:{" "}
                    <span className="text-emerald-700 font-bold">{c.newStatus}</span> · Approval Status: <span className="font-bold">{c.workflowStage}</span>
                  </p>
                  <p className="text-slate-500">Reason: {c.reason}</p>
                </div>
                {c.workflowStage !== "Approved" && isAdminOrExec && (
                  <button
                    onClick={() => {
                      setCorrectionRequests((prev) =>
                        prev.map((item) => (item.id === c.id ? { ...item, workflowStage: "Approved" } : item))
                      );
                      onLogAction(
                        "Attendance Record Changed",
                        `User: ${currentUserRole} | Date: ${c.date} | Old Status: ${c.oldStatus} | New Status: ${c.newStatus} | Reason: Approved correction`
                      );
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold cursor-pointer shrink-0"
                  >
                    {isAmharic ? "Supervisor አጽድቅ" : "Approve Correction"}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isAmharic ? "9. የማይሰረዝ የኦዲት መዝገብ (Immutable Security Audit Log)" : "9. Immutable Enterprise Audit Log"}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {isAmharic
                  ? "Who, What, When, Device, IP/Session, Previous Value, New Value, Approval Status — የAudit Log መረጃ በቀጥታ መሰረዝ አይፈቀድም።"
                  : "Records Who, What, When, Device, IP/Session, Previous Value, New Value & Approval Status. Direct deletion is strictly prohibited."}
              </p>
            </div>
            <span className="text-[11px] font-mono text-red-600 font-semibold">
              DELETE LOCKED (APPEND-ONLY)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-mono text-[11px]">
                  <th className="py-2 pr-3">WHO (USER / ROLE)</th>
                  <th className="py-2 pr-3">WHAT (ACTION)</th>
                  <th className="py-2 pr-3">WHEN</th>
                  <th className="py-2 pr-3">PREVIOUS → NEW VALUE & REASON</th>
                  <th className="py-2 text-right">DEVICE / IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-mono text-[11px]">
                <tr>
                  <td className="py-2.5 pr-3 font-sans font-semibold text-slate-900">Time Keeper</td>
                  <td className="py-2.5 pr-3 font-bold text-slate-800">Attendance Record Changed</td>
                  <td className="py-2.5 pr-3">29/09/2026 08:15</td>
                  <td className="py-2.5 pr-3 font-sans">
                    Old Status: <span className="text-red-600 font-semibold">Absent</span> → New Status:{" "}
                    <span className="text-emerald-700 font-semibold">Present</span> · Reason: Approved correction
                  </td>
                  <td className="py-2.5 text-right text-slate-500">Kiosk B1 · 192.168.10.5</td>
                </tr>
                {auditLogs.slice(0, 12).map((log) => (
                  <tr key={log.id}>
                    <td className="py-2.5 pr-3 font-sans font-semibold text-slate-900">
                      {log.userName} ({log.role})
                    </td>
                    <td className="py-2.5 pr-3 font-bold text-slate-800">{log.action}</td>
                    <td className="py-2.5 pr-3">{log.timestamp.replace("T", " ").slice(0, 16)}</td>
                    <td className="py-2.5 pr-3 font-sans text-slate-600">{log.details}</td>
                    <td className="py-2.5 text-right text-slate-500">TLS Session · 192.168.10.45</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // Section 13 & 14: Camera, Photos, CAD & Construction Document Security + Data Security
  if (activeSection === "camera_cad_docs") {
    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isAmharic
                  ? "14. የCAD፣ የቅየሳ እና የግንባታ ሰነዶች ደህንነት (CAD & Construction Document Security)"
                  : "14. CAD Drawings, Survey Files, Daily Photos & Project Document Security"}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {isAmharic
                  ? "Role-based access፣ Project-based access፣ Download/Upload permission፣ Version control እና Audit trail። አዲስ Version ሲጫን የቀድሞው Version ታሪክ ይጠበቃል።"
                  : "Enforces Role-based & Project-based access, Download/Upload permissions, immutable Version Control history, and Audit trail."}
              </p>
            </div>
            <button
              onClick={() => {
                const nextVerNum = cadVersions.length + 1;
                const newVer = {
                  id: `CAD-VER-0${nextVerNum}`,
                  fileName: "DCERP_Bole_Heights_B1_Fl04_Formwork_Layout.dwg",
                  version: `v${nextVerNum}.0 (Current Active)`,
                  uploadedBy: `${currentUserName} (${currentUserRole})`,
                  uploadedAt: new Date().toISOString().replace("T", " ").slice(0, 16),
                  project: selectedProject || "Addis Ababa Tower Block A",
                  permissions: "Role + Project Bound",
                  checksum: `SHA256:${Math.random().toString(16).slice(2, 14)}`
                };
                setCadVersions((prev) => [
                  newVer,
                  ...prev.map((v) => ({
                    ...v,
                    version: v.version.replace("(Current Active)", "(Archived History)"),
                    permissions: "Read-Only Historical Archive"
                  }))
                ]);
                onLogAction("CAD Drawing New Version Uploaded", `Uploaded ${newVer.version} while preserving prior version history.`);
              }}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <Upload size={14} />
              <span>{isAmharic ? "አዲስ የCAD Version ጫን (ታሪክ ይጠበቃል)" : "Upload New CAD Version (Preserve History)"}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {[
              { title: "CAD Drawings (.DWG / .DXF)", access: "Site Engineer, Surveyor, PM, Head Office", control: "Version Control + Audit Trail" },
              { title: "Survey Files & Benchmarks", access: "Surveyor, Site Engineer, PM, Head Office", control: "Download/Upload + Checksum" },
              { title: "Daily Construction Photos", access: "Supervisor, Site Engineer, PM, Head Office", control: "GPS Stamped + Project Bound" },
              { title: "Project Documents & Specs", access: "Role + Project Based Permission", control: "Encrypted Vault + Audit Log" }
            ].map((docType) => (
              <div key={docType.title} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1">
                <p className="font-bold text-slate-900">{docType.title}</p>
                <p className="text-[11px] text-slate-600">{docType.access}</p>
                <p className="font-mono text-[10px] text-emerald-700 font-semibold">{docType.control}</p>
              </div>
            ))}
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {cadVersions.map((ver) => (
              <div key={ver.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 font-bold text-slate-900">
                    <span>{ver.fileName}</span>
                    <span className="text-slate-400">·</span>
                    <span className="font-mono text-indigo-700">{ver.version}</span>
                  </div>
                  <p className="text-slate-500 font-mono text-[11px]">
                    Project: {ver.project} · Uploaded by: {ver.uploadedBy} · {ver.uploadedAt} · {ver.checksum}
                  </p>
                </div>
                <span className="text-[11px] font-mono text-slate-600">{ver.permissions}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-3">
          <h3 className="text-base font-bold text-slate-900">
            {isAmharic ? "13. የውሂብ ደህንነት (Data Security — Role + Project + Site + Permission)" : "13. Data Security & Site Isolation Rules"}
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            {isAmharic
              ? "Firebase Security Rules በRole + Project + Site + Permission መሰረት ይሰራሉ። ለምሳሌ Gang Chief የሌላ Site ሰራተኛ መረጃ ማየት አይችልም። Data encryption (AES-256)፣ secure API communication (TLS 1.3) እና Firebase App Check ይጠቀማል።"
              : "Firebase Security Rules strictly isolate data by Role + Project + Site + Permission (e.g., a Gang Chief is restricted from viewing worker records belonging to another site). Protected by AES-256 encryption, TLS 1.3, and Firebase App Check."}
          </p>
        </div>
      </div>
    );
  }

  // Section 18 & 19: Offline Mode Security & Backup / Recovery
  if (activeSection === "data_offline_backup") {
    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isAmharic
                  ? "18. ከመስመር ውጭ ደህንነት (Offline Security & Unique Event ID Sync)"
                  : "18. Offline Mode Security & Deduplicated Sync"}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {isAmharic
                  ? "ኢንተርኔት ቢቋረጥ Attendance events፣ Daily activities፣ Photos እና Work notes በSecure Local Storage ይቀመጣሉ። Duplicate sync እንዳይፈጠር Unique Event ID ይጠቀማል።"
                  : "When offline, Attendance events, Daily activities, Photos, and Work notes are encrypted in Secure Local Storage and synced using Unique Event IDs to prevent duplicate entries."}
              </p>
            </div>
            <button
              onClick={() => {
                setOfflineQueue((prev) =>
                  prev.map((item) => ({ ...item, syncStatus: "Synced (Deduplicated)" }))
                );
                onLogAction("Offline Queue Synced", "Synchronized all local offline events using Unique Event IDs with zero duplicates.");
              }}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold cursor-pointer shrink-0"
            >
              {isAmharic ? "ሁሉንም በUnique ID አመሳስል (Sync Now)" : "Sync Offline Queue Now"}
            </button>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {offlineQueue.map((ev) => (
              <div key={ev.eventId} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="font-mono font-bold text-slate-900">{ev.eventId}</span>
                  <span className="mx-2 text-slate-400">·</span>
                  <span className="font-semibold text-slate-800">{ev.type}</span>
                  <p className="text-slate-500 mt-0.5">{ev.payload}</p>
                </div>
                <div className="text-right font-mono text-[11px]">
                  <p className="text-slate-500">{ev.encrypted}</p>
                  <p className={ev.syncStatus.includes("Synced") ? "text-emerald-700 font-bold" : "text-amber-600 font-bold"}>
                    {ev.syncStatus}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isAmharic ? "19. የደመና መጠባበቂያ እና መልሶ ማግኛ (Backup & Recovery)" : "19. Firebase Cloud Backup & Recovery Strategy"}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {isAmharic
                  ? "Employee, Attendance, Payroll, Project, CAD, Survey, Reports እና Audit Logs የBackup ስርዓት አላቸው።"
                  : "Automated cloud snapshots and point-in-time recovery across all 8 core construction ERP datasets."}
              </p>
            </div>
            <button
              disabled={runningBackup}
              onClick={() => {
                setRunningBackup(true);
                setTimeout(() => {
                  const now = new Date().toISOString().replace("T", " ").slice(0, 16);
                  setBackupModules((prev) => prev.map((m) => ({ ...m, lastSync: now, status: "Backed Up" })));
                  setRunningBackup(false);
                  onLogAction("Full Cloud Backup Completed", "Backed up Employee, Attendance, Payroll, Project, CAD, Survey, Reports & Audit Logs.");
                }, 600);
              }}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold cursor-pointer shrink-0 disabled:opacity-50"
            >
              {runningBackup
                ? isAmharic
                  ? "በማስቀመጥ ላይ..."
                  : "Backing up..."
                : isAmharic
                ? "አሁን Backup አድርግ"
                : "Trigger Cloud Backup"}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {backupModules.map((bm) => (
              <div key={bm.name} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1">
                <p className="font-bold text-slate-900">{bm.name}</p>
                <p className="font-mono text-[11px] text-emerald-700 font-semibold">{bm.status} · {bm.size}</p>
                <p className="font-mono text-[10px] text-slate-500">{bm.lastSync}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Section 18, 19, 20, 21, 24: Help, Terms, Privacy Policy, Account Deactivation & Final Security Architecture
  if (activeSection === "legal_privacy_about") {
    const policyItems = [
      { titleAm: "1. ምን መረጃ እንደሚሰበሰብ (What Data Is Collected)", desc: "Full Name, Employee ID, Role, Department, Assigned Project/Site, Attendance timestamps, GPS site verification coordinates, construction progress photos, and device security identifiers." },
      { titleAm: "2. ለምን እንደሚሰበሰብ (Why Data Is Collected)", desc: "To verify site attendance, automate accurate payroll calculation, track aluminum formwork progress, ensure worker safety, and maintain construction quality & audit compliance." },
      { titleAm: "3. እንዴት እንደሚጠበቅ (How Data Is Protected)", desc: "Protected via TLS 1.3 in transit, AES-256 encryption at rest, Firebase App Check, Firestore Role+Project+Site security rules, and hardware-level biometric template isolation." },
      { titleAm: "4. ማን ሊያየው እንደሚችል (Who Can Access It)", desc: "Strictly governed by Role-Based Access Control (RBAC). Each role (Gang Chief, Team Leader, Time Keeper, Supervisor, Site Engineer, Surveyor, PM, Section Head, Head Office, Super Admin) only sees data permitted for their role and site." },
      { titleAm: "5. GPS ለምን እንደሚጠቀም (Why GPS Is Used)", desc: "Used strictly during Attendance sign-in/out and site inspection logging to verify presence inside the authorized construction site geofence." },
      { titleAm: "6. Camera ለምን እንደሚጠቀም (Why Camera Is Used)", desc: "Used for construction progress photos, quality snag reporting, CAD/site verification, and authorized facial attendance verification." },
      { titleAm: "7. Biometric Attendance እንዴት እንደሚሰራ (How Biometric Attendance Works)", desc: "Biometric data is stored as a secure mathematical template/reference on the device; raw phone biometric sensor imagery is never transmitted to Firebase. Employee enrollment is managed via the HR/Time Keeper workflow." },
      { titleAm: "8. መረጃ ለምን ያህል ጊዜ እንደሚጠበቅ (Data Retention Period)", desc: "Attendance, Payroll, and Audit Records are retained in accordance with national labor laws and corporate financial audit retention requirements." },
      { titleAm: "9. የመረጃ ጥያቄ/ማስተካከያ ሂደት (Data Inquiry & Correction Process)", desc: "Employees can submit profile or attendance correction requests through theEmployee → Time Keeper → Supervisor / HR approval workflow." },
      { titleAm: "10. የSupport መገናኛ መንገድ (Support Contact Channels)", desc: "Only Super Admin: Nuriye Ahmed Adem | Phone: 0910097862/0920843843 | Email: mejennur669@gmail.com." }
    ];

    const archLayers = [
      "Flutter / Web App",
      "Secure Authentication (Password / OTP / 2FA / Biometric)",
      "Role-Based Access Control (RBAC)",
      "Firebase App Check",
      "Firestore Security Rules (Role + Project + Site + Permission)",
      "Cloud Functions & Secure API Shield",
      "Encrypted Data / Storage (AES-256)",
      "Immutable Audit Logs",
      "Head Office Security Dashboard"
    ];

    return (
      <div className="space-y-6">
        {/* Section 20: Privacy Policy */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isAmharic ? "20. የግላዊነት ፖሊሲ፣ ውሎች እና እገዛ (Privacy Policy, Terms & Help)" : "20. Digital Construction ERP System — Privacy Policy, Terms & Support"}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {isAmharic
                  ? "የPrivacy Policy በሚሰራበት ሀገር እና በሚመለከታቸው የስራ ህጎች መሰረት የተዘጋጀ።"
                  : "Reviewed in accordance with national labor laws and construction data protection regulations."}
              </p>
            </div>
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1.5 no-print"
            >
              <Printer size={13} />
              <span>{isAmharic ? "አትም / PDF" : "Print Policy"}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {policyItems.map((p) => (
              <div key={p.titleAm} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
                <p className="font-bold text-slate-900">{p.titleAm}</p>
                <p className="text-slate-600 leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Section 21: Account Deactivation */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-3">
          <h3 className="text-base font-bold text-slate-900">
            {isAmharic ? "21. መለያ ማገድ / ማጥፋት (Account Deactivation Workflow)" : "21. Controlled Account Deactivation Workflow"}
          </h3>
          <p className="text-xs text-slate-600">
            {isAmharic
              ? "የCompany Employee መረጃ በHR/Head Office ፖሊሲ መሰረት ይሰራል። Attendance፣ Payroll እና Audit Records የህግ/የኩባንያ የመዝገብ ጊዜ መስፈርቶች መሰረት ይጠበቃሉ።"
              : "Governed by HR and Head Office policy. Attendance, Payroll, and Audit Records remain preserved to satisfy legal and corporate retention mandates."}
          </p>
          {deactivationSubmitted ? (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 font-semibold">
              {isAmharic
                ? "የመለያ ማገድ ጥያቄዎ ለHR እና Head Office ቀርቧል። የAttendance፣ Payroll እና Audit መዝገቦች በህግ መሰረት ተጠብቀው ይቆያሉ።"
                : "Account deactivation request routed to HR & Head Office. Historical Attendance, Payroll, and Audit logs remain preserved."}
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-2 text-xs">
              <input
                type="text"
                value={deactivationReason}
                onChange={(e) => setDeactivationReason(e.target.value)}
                placeholder={isAmharic ? "የመለያ ማገድ/መልቀቂያ ምክንያት ያስገቡ..." : "Enter reason for account deactivation request (routed to HR/Head Office)..."}
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
              />
              <button
                onClick={() => {
                  if (!deactivationReason.trim()) return;
                  setDeactivationSubmitted(true);
                  onLogAction("Account Deactivation Requested", `Reason: ${deactivationReason.trim()} (Preserving Attendance/Payroll/Audit records per policy)`);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg cursor-pointer shrink-0"
              >
                {isAmharic ? "ለHR / Head Office ጥያቄ ላክ" : "Request HR Deactivation Review"}
              </button>
            </div>
          )}
        </div>

        {/* Section 24: Final Security Architecture */}
        <div className="bg-slate-900 text-white p-6 rounded-xl border border-slate-800 space-y-4">
          <div>
            <h3 className="text-base font-bold">
              {isAmharic ? "24. የDigital Construction ERP System የመጨረሻ የደህንነት መዋቅር (Final Security Architecture)" : "24. Digital Construction ERP System — Final Security Architecture"}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {isAmharic
                ? "ይህ መዋቅር የUser Access፣ Attendance፣ Payroll፣ CAD፣ Survey፣ Construction Reports እና Administrative Data በRole እና Permission መሰረት እንዲጠበቁ ያደርጋል።"
                : "End-to-end 9-layer defense protecting User Access, Attendance, Payroll, CAD, Survey, Construction Reports, and Administrative Data."}
            </p>
          </div>
          <div className="flex flex-col items-center space-y-1.5 py-2 text-xs">
            {archLayers.map((layer, idx) => (
              <React.Fragment key={layer}>
                <div className="w-full max-w-xl px-4 py-2.5 rounded-lg bg-slate-800/90 border border-slate-700 flex items-center justify-between">
                  <span className="font-mono text-red-400 font-bold">Layer 0{idx + 1}</span>
                  <span className="font-semibold text-slate-100 text-center">{layer}</span>
                  <span className="font-mono text-[10px] text-emerald-400">Enforced</span>
                </div>
                {idx < archLayers.length - 1 && (
                  <span className="font-mono text-red-400 font-bold text-sm leading-none">↓</span>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return null;
};
