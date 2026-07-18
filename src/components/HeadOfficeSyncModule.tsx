import React, { useState, useMemo, useEffect } from "react";
import { 
  Database, 
  Layers, 
  Wifi, 
  WifiOff, 
  Bell, 
  ShieldCheck, 
  AlertTriangle, 
  MapPin, 
  Clock, 
  Users, 
  RefreshCw, 
  CheckCircle2, 
  Activity, 
  Check, 
  FileText, 
  Lock, 
  Filter, 
  Smartphone,
  Shield,
  Search,
  CheckCircle,
  HelpCircle,
  History,
  GitMerge,
  Cpu,
  Zap,
  Server,
  TrendingUp
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import { Worker, AttendanceRecord, UserRole, AttendanceMethod, Team } from "../types";

interface HeadOfficeSyncModuleProps {
  workers: Worker[];
  teams: Team[];
  attendance: AttendanceRecord[];
  onAddAttendance: (record: AttendanceRecord) => void;
  isAmharic: boolean;
  currentUserRole: UserRole;
  onLogAction?: (action: string, details: string) => void;
}

interface SimulatedDevice {
  id: string;
  name: string;
  role: string;
  lastActive: string;
  pendingSyncCount: number;
  status: "online" | "offline";
}

interface SmartNotification {
  id: string;
  type: "checkin" | "checkout" | "absent" | "late" | "overtime_limit" | "verification_fail" | "outside_geofence";
  titleEn: string;
  titleAm: string;
  messageEn: string;
  messageAm: string;
  timestamp: string;
  isRead: boolean;
}

interface SyncTransaction {
  id: string;
  timestamp: string;
  workerName: string;
  type: string;
  device: string;
  status: "Synced" | "Failed" | "Pending";
  hash: string;
}

interface SyncHistoryEvent {
  id: string;
  timestamp: string;
  device: string;
  recordsCount: number;
  durationMs: number;
  status: "Success" | "Warning" | "Failed";
  integrityHash: string;
  detailsEn: string;
  detailsAm: string;
  conflictsResolved: number;
  bytesMerged: string;
  connectionType: string;
  steps: string[];
}

export const HeadOfficeSyncModule: React.FC<HeadOfficeSyncModuleProps> = ({
  workers,
  teams,
  attendance,
  onAddAttendance,
  isAmharic,
  currentUserRole,
  onLogAction
}) => {
  // Connection and Live Sync States
  const [isCloudOnline, setIsCloudOnline] = useState<boolean>(true);
  const [activeDevice, setActiveDevice] = useState<string>("all");
  const [selectedProject, setSelectedProject] = useState<string>("All Projects");
  const [selectedBuilding, setSelectedBuilding] = useState<string>("All Buildings");
  const [selectedFloor, setSelectedFloor] = useState<string>("All Floors");
  const [selectedZone, setSelectedZone] = useState<string>("All Zones");
  const [selectedTeam, setSelectedTeam] = useState<string>("All Teams");

  // Simulated live data buffers
  const [localOfflineQueue, setLocalOfflineQueue] = useState<AttendanceRecord[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"dashboard" | "syncHistory" | "database" | "notifications" | "security">("dashboard");
  const [searchTerm, setSearchTerm] = useState("");

  // Sync History states
  const [selectedSimDevice, setSelectedSimDevice] = useState<string>("DEV-TK-03");
  const [simRecordsCount, setSimRecordsCount] = useState<number>(10);
  const [isSimulatingMerge, setIsSimulatingMerge] = useState<boolean>(false);
  const [simMergeProgress, setSimMergeProgress] = useState<number>(0);
  const [simMergeStep, setSimMergeStep] = useState<string>("");
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>("SYNC-20260717-0402");

  const [syncHistory, setSyncHistory] = useState<SyncHistoryEvent[]>([
    {
      id: "SYNC-20260717-0402",
      timestamp: "2026-07-17 08:32:11",
      device: "DEV-TK-03 (Time Keeper Field Tablet)",
      recordsCount: 14,
      durationMs: 820,
      status: "Success",
      integrityHash: "SHA256:7B8F2A...3C1",
      detailsEn: "Successfully merged 14 attendance records from Tower A scaffolding crew.",
      detailsAm: "የህንጻ ብሎክ A 14 የመገኘት መዝገቦችን በስኬት አዋህዷል።",
      conflictsResolved: 0,
      bytesMerged: "3.5 KB",
      connectionType: "Cellular (4G)",
      steps: [
        "Network bridge established over cellular network.",
        "Device queue payload extracted: 14 entries.",
        "Verification hash SHA256 matches device footprint.",
        "Initiating duplicate detection sequence.",
        "Zero scheduling or ID conflicts detected.",
        "Bulk merge transaction finalized on Cloud ledger.",
        "Device buffer purge confirmation sent and acknowledged."
      ]
    },
    {
      id: "SYNC-20260717-0315",
      timestamp: "2026-07-17 07:15:00",
      device: "DEV-SUP-04 (Site Supervisor Mobile Pad)",
      recordsCount: 8,
      durationMs: 1450,
      status: "Warning",
      integrityHash: "SHA256:49A88C...D8A",
      detailsEn: "Merged 8 records. Resolved 1 scheduling conflict (duplicate clock-in bypassed).",
      detailsAm: "8 መዝገቦችን አዋህዷል። 1 ድርብ መግቢያን በማስቀረት የግጭት መፍታት ተከናውኗል።",
      conflictsResolved: 1,
      bytesMerged: "2.1 KB",
      connectionType: "Satellite (Starlink)",
      steps: [
        "Established Starlink telemetry handshake.",
        "Buffer contains 8 active attendance logs.",
        "Scanning for redundancy against central DB records.",
        "Conflict discovered: Worker already had an active Clock-In session.",
        "Resolution protocol: Retained earlier Cloud record, bypassed duplicate entry safely.",
        "Completed transaction block write for 7 new entries.",
        "Purged local device database buffer."
      ]
    },
    {
      id: "SYNC-20260716-1845",
      timestamp: "2026-07-16 18:45:30",
      device: "DEV-GC-08 (Gang Chief Biometric Scanner)",
      recordsCount: 22,
      durationMs: 650,
      status: "Success",
      integrityHash: "SHA256:A4B29E...E92",
      detailsEn: "Bulk check-out merge for concrete shifting evening shift crew.",
      detailsAm: "ለኮንክሪት ማፍሰስ ማታ ፈረቃ ሰራተኞች በጅምላ መውጫ ማዋሃድ ተጠናቋል።",
      conflictsResolved: 0,
      bytesMerged: "5.5 KB",
      connectionType: "Wifi",
      steps: [
        "High-bandwidth site Wifi connection initialized.",
        "Extracting bulk buffer: 22 records.",
        "Integrity hashing passed validation.",
        "Duplicate check completed: 0 conflicts.",
        "Bulk transaction committed to cloud ledger.",
        "Purged local buffer on DEV-GC-08."
      ]
    },
    {
      id: "SYNC-20260716-1210",
      timestamp: "2026-07-16 12:10:05",
      device: "DEV-TL-12 (Team Leader Cycle App)",
      recordsCount: 5,
      durationMs: 980,
      status: "Success",
      integrityHash: "SHA256:FF288A...881",
      detailsEn: "Mid-day check-in sync for slab assembly team members.",
      detailsAm: "የፎቅ ሰሌዳ ገጣሚ ቡድን አባላት የእኩለ ቀን መግቢያ ማመሳሰል።",
      conflictsResolved: 0,
      bytesMerged: "1.2 KB",
      connectionType: "Cellular (4G)",
      steps: [
        "Established secure TLS session over cellular link.",
        "Buffer received: 5 entries.",
        "Payload verification: OK.",
        "Duplicate check: No redundancy found.",
        "Committed 5 entries to Master ledger.",
        "Purged queue safely."
      ]
    },
    {
      id: "SYNC-20260715-0912",
      timestamp: "2026-07-15 09:12:44",
      device: "DEV-TK-03 (Time Keeper Field Tablet)",
      recordsCount: 19,
      durationMs: 1100,
      status: "Success",
      integrityHash: "SHA256:33D92A...11B",
      detailsEn: "Morning roster synchronization complete. No issues.",
      detailsAm: "የጠዋት የሰራተኞች መዝገብ ማመሳሰል ተጠናቋል። ምንም ችግር የለም።",
      conflictsResolved: 0,
      bytesMerged: "4.8 KB",
      connectionType: "Cellular (4G)",
      steps: [
        "Established handshake with Field Tablet.",
        "Roster load: 19 biometric scans verified.",
        "Duplicate checking sequence run.",
        "No duplicate records or timestamps found.",
        "Saved 19 entries to main database collection.",
        "Purged tablet local cache."
      ]
    }
  ]);

  // Simulated Live Devices
  const [devices, setDevices] = useState<SimulatedDevice[]>([
    { id: "DEV-HO-01", name: "Head Office Central Console", role: "Head Office", lastActive: "Just now", pendingSyncCount: 0, status: "online" },
    { id: "DEV-TK-03", name: "Time Keeper Field Tablet", role: "Time Keeper", lastActive: "2 min ago", pendingSyncCount: 0, status: "online" },
    { id: "DEV-SUP-04", name: "Site Supervisor Mobile Pad", role: "Supervisor", lastActive: "5 min ago", pendingSyncCount: 0, status: "online" },
    { id: "DEV-TL-12", name: "Team Leader Cycle App", role: "Team Leader", lastActive: "15 min ago", pendingSyncCount: 0, status: "online" },
    { id: "DEV-GC-08", name: "Gang Chief Biometric Scanner", role: "Gang Chief", lastActive: "30 min ago", pendingSyncCount: 0, status: "online" }
  ]);

  // Smart Live Notifications state initialized with seed alerts
  const [notifications, setNotifications] = useState<SmartNotification[]>([
    {
      id: "NOT-001",
      type: "outside_geofence",
      titleEn: "Geofence Violation Attempt",
      titleAm: "የአጥር ክልል ጥሰት ሙከራ",
      messageEn: "Worker Bekele Tesfaye attempted Check-In 120m outside the authorized Digital Construction ERP Heights Site. Blocked.",
      messageAm: "ሰራተኛ በቀለ ተስፋዬ ከተፈቀደው የቦሌ ሃይትስ ጊቢ ውጭ ሆኖ 120ሜ ርቀት ላይ ለመግባት ሙከራ አድርጓል። ታግዷል።",
      timestamp: "10:45 AM",
      isRead: false
    },
    {
      id: "NOT-002",
      type: "late",
      titleEn: "Late Check-In Registered",
      titleAm: "የዘገየ መግቢያ ተመዝግቧል",
      messageEn: "Worker Aster Gudeta clocked in late at 08:32 AM (Threshold is 08:15 AM).",
      messageAm: "ሰራተኛ አስቴር ጉደታ በ08:32 ላይ ዘግይቶ ገብቷል (መግቢያው 08:15 ነበረ)።",
      timestamp: "08:32 AM",
      isRead: false
    },
    {
      id: "NOT-003",
      type: "overtime_limit",
      titleEn: "Overtime Limit Exceeded Warning",
      titleAm: "የትርፍ ሰዓት ገደብ ማስጠንቀቂያ",
      messageEn: "Worker Yohannes Bekele has exceeded company overtime limit (>2 hours). Cumulative today: 2.5 hours.",
      messageAm: "ሰራተኛ ዮሐንስ በቀለ የድርጅቱን የትርፍ ሰዓት ገደብ (>2 ሰዓት) አልፏል። ዛሬ የሰራው: 2.5 ሰዓት።",
      timestamp: "Yesterday",
      isRead: true
    },
    {
      id: "NOT-004",
      type: "verification_fail",
      titleEn: "Biometric Verification Failure",
      titleAm: "የባዮሜትሪክ መለያ ስህተት",
      messageEn: "Multiple fingerprint recognition failures (3 times) on Scanner Digital Construction ERP-PAD-03.",
      messageAm: "በመለያ ቁጥር Digital Construction ERP-PAD-03 ላይ የጣት አሻራ መለያ 3 ጊዜ በተደጋጋሚ አልተሳካም።",
      timestamp: "Yesterday",
      isRead: true
    }
  ]);

  // Live Audit Transaction list
  const [syncLogs, setSyncLogs] = useState<SyncTransaction[]>([
    { id: "TX-901", timestamp: "2026-07-08 10:42:15", workerName: "Chala Kebede", type: "Check-In", device: "Time Keeper Tablet", status: "Synced", hash: "SHA256:E9A28B...C21" },
    { id: "TX-902", timestamp: "2026-07-08 10:15:30", workerName: "Almaz Demissie", type: "Check-Out", device: "Gang Chief Scanner", status: "Synced", hash: "SHA256:4C83AA...F09" },
    { id: "TX-903", timestamp: "2026-07-08 09:55:00", workerName: "Selamawit Alemu", type: "Check-In", device: "Supervisor Mobile", status: "Synced", hash: "SHA256:F2901B...78A" }
  ]);

  // Static list of Projects
  const projectList = ["All Projects", "Digital Bole Heights", "Digital Construction ERP Ayat Project", "Digital Construction ERP CMC Sector", "Digital Construction ERP Lebu site"];
  const buildingList = ["All Buildings", "Tower A", "Tower B", "Block C"];
  const floorList = ["All Floors", "Floor 1", "Floor 2", "Floor 3", "Floor 4", "Floor 5"];
  const zoneList = ["All Zones", "Zone A", "Zone B", "Zone C"];
  const teamList = ["All Teams", "Assembly Team Alpha", "Stripping Team Beta", "Steel Fixing Team Gamma", "Concreting Team Delta", "Support Team Epsilon"];

  // Handle simulated offline toggling
  const handleToggleOnline = () => {
    const newState = !isCloudOnline;
    setIsCloudOnline(newState);
    if (onLogAction) {
      onLogAction(
        newState ? "Cloud Sync Restored" : "Cloud Sync Offline Enabled",
        newState 
          ? "System reconnected to Firebase central cloud server. Auto-synchronizing offline records."
          : "System running in secure local-offline mode. Attendance records will be buffered."
      );
    }

    if (newState && localOfflineQueue.length > 0) {
      triggerAutomaticSync();
    }
  };

  // Trigger automatic synchronization of offline queued elements
  const triggerAutomaticSync = () => {
    setIsSyncing(true);
    // Simulate network delay for synchronization
    setTimeout(() => {
      localOfflineQueue.forEach(record => {
        // Prevent duplicate attendance records during sync
        const exists = attendance.some(a => a.id === record.id || (a.workerId === record.workerId && a.date === record.date && a.checkIn === record.checkIn));
        if (!exists) {
          onAddAttendance({
            ...record,
            id: record.id.startsWith("OFF-") ? `ATT-SYNC-${Date.now()}-${record.workerId}` : record.id,
            gpsLocationString: record.gpsLocationString + " (Cloud Synced)"
          });
        }
      });

      // Update simulated devices last sync state
      setDevices(prev => prev.map(d => ({ ...d, pendingSyncCount: 0, lastActive: "Just now" })));
      
      // Update sync transaction records
      const newTXs: SyncTransaction[] = localOfflineQueue.map(r => ({
        id: `TX-${Math.floor(100 + Math.random() * 900)}`,
        timestamp: new Date().toISOString().replace("T", " ").slice(0, 19),
        workerName: r.workerName,
        type: r.checkOut ? "Check-Out" : "Check-In",
        device: "Offline Queue Sync",
        status: "Synced" as const,
        hash: `SHA256:${Math.random().toString(16).substring(2, 10).toUpperCase()}...B2C`
      }));

      setSyncLogs(prev => [...newTXs, ...prev]);

      // Create a new Sync History Session
      const newHistorySession: SyncHistoryEvent = {
        id: `SYNC-${new Date().toISOString().replace(/[-T:]/g, "").slice(0, 14)}`,
        timestamp: new Date().toISOString().replace("T", " ").slice(0, 19),
        device: "Various Buffers (Automated Reconnect)",
        recordsCount: localOfflineQueue.length,
        durationMs: Math.floor(600 + Math.random() * 600),
        status: "Success",
        integrityHash: `SHA256:${Math.random().toString(16).substring(2, 10).toUpperCase()}...F33`,
        detailsEn: `Merged ${localOfflineQueue.length} buffered records from automatic reconnection.`,
        detailsAm: `ካለማቋረጥ ግንኙነት በተገኘው መሠረት ${localOfflineQueue.length} ከመስመር ውጭ የቆዩ መዝገቦች ተዋህደዋል።`,
        conflictsResolved: Math.floor(Math.random() * 2),
        bytesMerged: `${(localOfflineQueue.length * 0.25).toFixed(2)} KB`,
        connectionType: "Cellular (4G)",
        steps: [
          "Auto-reconnection handshake initiated.",
          `Discovered ${localOfflineQueue.length} unsynced device buffers.`,
          "Validating cryptographic hashes of payloads.",
          "Performing duplicate record scans against Cloud ledger.",
          `Successfully merged ${localOfflineQueue.length} records into main database.`,
          "Device local database buffers successfully purged and acknowledged."
        ]
      };
      setSyncHistory(prev => [newHistorySession, ...prev]);

      setLocalOfflineQueue([]);
      setIsSyncing(false);

      if (onLogAction) {
        onLogAction("Offline Queue Synchronized", "Successfully synchronized pending local attendance records to Firebase database without any duplicates.");
      }
    }, 2000);
  };

  // Helper function to simulate scanning/registering biometric attendance
  const simulateBiometricScan = (
    workerId: string, 
    mode: "check-in" | "check-out", 
    method: "fingerprint" | "face",
    outOfGeofence: boolean = false,
    verificationFail: boolean = false
  ) => {
    const worker = workers.find(w => w.id === workerId);
    if (!worker) return;

    if (verificationFail) {
      const newNotif: SmartNotification = {
        id: `NOT-${Date.now()}`,
        type: "verification_fail",
        titleEn: "Biometric Match Failure Alert",
        titleAm: "ባዮሜትሪክ ማስተካከያ አለመስማማት ማስጠንቀቂያ",
        messageEn: `Failed biometric fingerprint mapping match for worker ${worker.name}.`,
        messageAm: `ለሰራተኛው ${worker.name} የባዮሜትሪክ የጣት አሻራ መለያ አለመዛመድ ስህተት ተፈጥሯል።`,
        timestamp: "Just now",
        isRead: false
      };
      setNotifications(prev => [newNotif, ...prev]);
      playSound("error");
      return;
    }

    if (outOfGeofence) {
      const newNotif: SmartNotification = {
        id: `NOT-${Date.now()}`,
        type: "outside_geofence",
        titleEn: "Unauthorized Location Alert",
        titleAm: "ከተፈቀደው የግንባታ ቦታ ውጭ መግባት ሙከራ",
        messageEn: `Worker ${worker.name} attempted Check-In 450m outside authorized zone. Denied.`,
        messageAm: `ሰራተኛው ${worker.name} ከተፈቀደው የግንባታ ዞን 450ሜ ውጭ ሆኖ ለመግባት በመሞከሩ ታግዷል።`,
        timestamp: "Just now",
        isRead: false
      };
      setNotifications(prev => [newNotif, ...prev]);
      playSound("error");
      return;
    }

    const todayDate = new Date().toISOString().split("T")[0];
    const formattedTime = new Date().toLocaleTimeString("en-US", { hour12: false });
    
    // Check if worker already checked in/out today
    const alreadyExists = attendance.find(a => a.workerId === worker.id && a.date === todayDate);
    if (mode === "check-in" && alreadyExists) {
      alert(isAmharic ? "ይህ ሰራተኛ ዛሬ ቀድሞውኑ ገብቷል!" : "Worker already checked in for today!");
      return;
    }

    // Calculations for working hours & overtime
    let workingHours = 0;
    let overtime = 0;
    let checkInTime = formattedTime;
    let checkOutTime: string | null = null;
    let status: "Present" | "Late" | "Absent" = "Present";

    // Standard Shift commencement: 08:15 AM
    const [nowH, nowM] = formattedTime.split(":").map(Number);
    if (mode === "check-in" && (nowH * 60 + nowM) > (8 * 60 + 15)) {
      status = "Late";
    }

    if (mode === "check-out") {
      checkInTime = alreadyExists?.checkIn || "08:00:00";
      checkOutTime = formattedTime;
      const [inH, inM] = checkInTime.split(":").map(Number);
      const [outH, outM] = checkOutTime.split(":").map(Number);
      const rawHrs = Math.max(0, (outH + outM / 60) - (inH + inM / 60));
      const netWorkingHours = Math.max(0, rawHrs - 1.0); // 1-hour lunch
      workingHours = parseFloat(Math.min(8.0, netWorkingHours).toFixed(2));
      overtime = parseFloat(Math.max(0, netWorkingHours - 8.0).toFixed(2));
    }

    const newRec: AttendanceRecord = {
      id: `ATT-MOCK-${Date.now()}-${worker.id}`,
      workerId: worker.id,
      workerName: worker.name,
      department: worker.department,
      trade: worker.trade,
      company: worker.company,
      building: worker.building || "Tower A",
      floor: worker.floor || 4,
      zone: worker.zone || "Zone B",
      date: todayDate,
      checkIn: mode === "check-in" ? checkInTime : (alreadyExists?.checkIn || "08:00:00"),
      checkOut: mode === "check-out" ? checkOutTime : null,
      method: method === "fingerprint" ? AttendanceMethod.FINGERPRINT : AttendanceMethod.FACE_RECOGNITION,
      workingHours: mode === "check-out" ? workingHours : 0,
      overtime: mode === "check-out" ? overtime : 0,
      status: alreadyExists?.status === "Late" ? "Late" : status,
      gpsCoordinates: { lat: 9.0125 + (Math.random() - 0.5) * 0.001, lng: 38.7834 + (Math.random() - 0.5) * 0.001 },
      deviceUsed: "Digital Construction ERP-BIO-PAD-03",
      verifiedBy: currentUserRole,
      gpsLocationString: isAmharic ? "ቦሌ ሃይትስ ግንባታ ቦታ" : "Digital Bole Heights Site"
    };

    if (!isCloudOnline) {
      // Buffer in offline queue
      setLocalOfflineQueue(prev => [...prev, newRec]);
      // Update pending count for acting device
      setDevices(prev => prev.map(d => d.role === currentUserRole ? { ...d, pendingSyncCount: d.pendingSyncCount + 1 } : d));
      
      const newNotif: SmartNotification = {
        id: `NOT-${Date.now()}`,
        type: mode === "check-in" ? "checkin" : "checkout",
        titleEn: `Offline Queue Buffer: ${mode.toUpperCase()}`,
        titleAm: `ከመስመር ውጭ የተመዘገበ: ${mode === "check-in" ? "መግቢያ" : "መውጫ"}`,
        messageEn: `Connection offline. Worker ${worker.name} attendance queued in device local storage safely.`,
        messageAm: `የበይነመረብ ግንኙነት ስለሌለ የሰራተኛው ${worker.name} መገኘት በመሳሪያው ማህደረትውስታ ተቀምጧል።`,
        timestamp: "Just now",
        isRead: false
      };
      setNotifications(prev => [newNotif, ...prev]);
      playSound("success");
      return;
    }

    // Direct online sync
    onAddAttendance(newRec);

    // Live sync transaction hash
    const fakeHash = `SHA256:${Math.random().toString(16).substring(2, 10).toUpperCase()}${worker.id}`;
    const newTX: SyncTransaction = {
      id: `TX-${Math.floor(100 + Math.random() * 900)}`,
      timestamp: `${todayDate} ${formattedTime}`,
      workerName: worker.name,
      type: mode === "check-in" ? "Check-In" : "Check-Out",
      device: currentUserRole + " Terminal",
      status: "Synced",
      hash: fakeHash
    };
    setSyncLogs(prev => [newTX, ...prev]);

    // Push smart notification immediately
    let notifType: "checkin" | "checkout" | "late" | "overtime_limit" = mode === "check-in" ? "checkin" : "checkout";
    if (status === "Late" && mode === "check-in") notifType = "late";
    if (overtime > 2.0) notifType = "overtime_limit";

    const titleEn = mode === "check-in" 
      ? (status === "Late" ? "Late Worker Clock-In" : "Worker Clocked In") 
      : (overtime > 2.0 ? "Heavy Overtime Warning" : "Worker Clocked Out");
    
    const titleAm = mode === "check-in" 
      ? (status === "Late" ? "ዘግይቶ የገባ ሰራተኛ" : "ሰራተኛ በሰዓቱ ገብቷል") 
      : (overtime > 2.0 ? "የትርፍ ሰዓት ገደብ ማስጠንቀቂያ" : "ሰራተኛ ወጥቷል");

    const msgEn = mode === "check-in"
      ? `${worker.name} logged CHECK-IN at ${formattedTime}. Checked and verified by Digital Construction ERP Central Database.`
      : `${worker.name} logged CHECK-OUT at ${formattedTime}. Hours: ${workingHours + overtime}h (Overtime: ${overtime}h). Verified.`;

    const msgAm = mode === "check-in"
      ? `ሰራተኛ ${worker.name} በ${formattedTime} መግባቱን አስመዝግቧል። በዲጂታል ኮንስትራክሽን ERP ማዕከላዊ የደመና ዳታቤዝ ተረጋግጧል።`
      : `ሰራተኛ ${worker.name} በ${formattedTime} መውጣቱን አስመዝግቧል። የሰራው ሰዓት፡ ${workingHours + overtime}ሰ (ትርፍ ሰዓት፡ ${overtime}ሰ)።`;

    const newNotif: SmartNotification = {
      id: `NOT-${Date.now()}`,
      type: notifType,
      titleEn,
      titleAm,
      messageEn: msgEn,
      messageAm: msgAm,
      timestamp: "Just now",
      isRead: false
    };

    setNotifications(prev => [newNotif, ...prev]);
    playSound("success");

    if (onLogAction) {
      onLogAction(
        `Biometric Live-Sync: ${mode.toUpperCase()}`, 
        `Real-time auto verification completed for ${worker.name}. Calculated hours: ${workingHours}h, overtime: ${overtime}h. Record broadcasted instantly.`
      );
    }
  };

  const playSound = (type: "success" | "error") => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const audioCtx = new AudioCtx();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === "success") {
        osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        osc.frequency.setValueAtTime(800, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.25);
      } else {
        osc.frequency.setValueAtTime(300, audioCtx.currentTime);
        osc.frequency.setValueAtTime(150, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      }
    } catch (e) {
      // Ignored if blocked by browser autoplay rules
    }
  };

  // Helper values for project-level reporting & live metrics
  const chartData = useMemo(() => {
    return [...syncHistory].reverse().map(item => ({
      name: item.timestamp.split(" ")[1] || item.timestamp,
      records: item.recordsCount,
      latency: item.durationMs,
      conflicts: item.conflictsResolved
    }));
  }, [syncHistory]);

  const handleSimulateSyncMerge = () => {
    if (isSimulatingMerge) return;
    
    setIsSimulatingMerge(true);
    setSimMergeProgress(0);
    setSimMergeStep(isAmharic ? "ደህንነቱ የተጠበቀ ግንኙነት በመጀመር ላይ..." : "Initializing secure connection...");

    const simulationSteps = [
      { progress: 15, textEn: "Initializing secure TLS 1.3 cryptographic handshake...", textAm: "ደህንነቱ የተጠበቀ TLS 1.3 ክሪፕቶግራፊክ ግንኙነት በመጀመር ላይ..." },
      { progress: 40, textEn: "Transmitting offline biometric database payloads...", textAm: "ከመስመር ውጭ የባዮሜትሪክ ዳታቤዝ መረጃዎችን በማስተላለፍ ላይ..." },
      { progress: 65, textEn: "Verifying payload integrity via SHA-256 signatures...", textAm: "በSHA-256 ፊርማዎች አማካኝነት የመረጃውን ትክክለኛነት በማረጋገጥ ላይ..." },
      { progress: 85, textEn: "Running multi-site conflict resolution & duplicate scans...", textAm: "ባለብዙ-ሳይት የግጭት መፍታት እና የተባዙ መዝገቦችን ፍለጋ በማካሄድ ላይ..." },
      { progress: 100, textEn: "Merge completed successfully. Central database updated.", textAm: "ውህደት በስኬት ተጠናቋል። ማዕከላዊ ዳታቤዝ ተዘምኗል።" }
    ];

    let stepIdx = 0;
    const interval = setInterval(() => {
      if (stepIdx < simulationSteps.length) {
        setSimMergeProgress(simulationSteps[stepIdx].progress);
        setSimMergeStep(isAmharic ? simulationSteps[stepIdx].textAm : simulationSteps[stepIdx].textEn);
        stepIdx++;
      } else {
        clearInterval(interval);
        
        const deviceObj = devices.find(d => d.id === selectedSimDevice) || devices[0];
        const newSessionId = `SYNC-20260717-${Math.floor(1000 + Math.random() * 9000)}`;
        const timestampStr = new Date().toISOString().replace("T", " ").slice(0, 19);
        const randHash = `SHA256:${Math.random().toString(16).substring(2, 10).toUpperCase()}...${Math.random().toString(16).substring(2, 5).toUpperCase()}`;
        
        const newSession: SyncHistoryEvent = {
          id: newSessionId,
          timestamp: timestampStr,
          device: `${deviceObj.id} (${deviceObj.name})`,
          recordsCount: simRecordsCount,
          durationMs: Math.floor(400 + Math.random() * 600),
          status: Math.random() > 0.85 ? "Warning" : "Success",
          integrityHash: randHash,
          detailsEn: `Merged ${simRecordsCount} buffered records from ${deviceObj.name} site terminal.`,
          detailsAm: `ከ${deviceObj.name} የመስክ ተርሚናል ${simRecordsCount} መዝገቦችን በስኬት አዋህዷል።`,
          conflictsResolved: Math.random() > 0.8 ? 1 : 0,
          bytesMerged: `${(simRecordsCount * 0.25).toFixed(2)} KB`,
          connectionType: ["Cellular (4G)", "Wifi", "Satellite (Starlink)"][Math.floor(Math.random() * 3)],
          steps: [
            "Secure terminal bridge handshake completed.",
            `Payload containing ${simRecordsCount} attendance scans parsed successfully.`,
            `SHA-256 signature verified against signature ${randHash.split("...")[0]}.`,
            "Conflict resolution engine checked 100% of rows.",
            "0 structural integrity warnings detected during transaction check.",
            "Committed transaction blocks safely to main cloud collection.",
            "purge_local_cache() command issued to terminal device successfully."
          ]
        };

        setSyncHistory(prev => [newSession, ...prev]);

        // Dynamically add a few attendance records into the active roster
        const availableWorkers = workers.filter(w => !attendance.some(a => a.workerId === w.id));
        const todayDate = new Date().toISOString().split("T")[0];
        
        availableWorkers.slice(0, Math.min(availableWorkers.length, simRecordsCount)).forEach((w, i) => {
          const mockRec: AttendanceRecord = {
            id: `ATT-SYNC-${Date.now()}-${w.id}-${i}`,
            workerId: w.id,
            workerName: w.name,
            department: w.department,
            trade: w.trade,
            company: w.company,
            building: w.building || "Tower A",
            floor: w.floor || 3,
            zone: w.zone || "Zone B",
            date: todayDate,
            checkIn: "08:10:00",
            checkOut: null,
            method: AttendanceMethod.FINGERPRINT,
            workingHours: 0,
            overtime: 0,
            status: "Present",
            gpsCoordinates: { lat: 9.0125 + (Math.random() - 0.5) * 0.001, lng: 38.7834 + (Math.random() - 0.5) * 0.001 },
            deviceUsed: deviceObj.name,
            verifiedBy: "Time Keeper",
            gpsLocationString: "Bole Heights Site (Cloud Merged)"
          };
          onAddAttendance(mockRec);
        });

        playSound("success");
        setIsSimulatingMerge(false);
        setSelectedHistoryId(newSessionId);

        if (onLogAction) {
          onLogAction(
            "Offline Buffer Merged",
            `Manual simulation of secure merging complete. Synced ${simRecordsCount} logs from ${deviceObj.name}. All signatures verified.`
          );
        }
      }
    }, 600);
  };

  const filteredAttendance = useMemo(() => {
    return attendance.filter(a => {
      const worker = workers.find(w => w.id === a.workerId);
      if (!worker) return true;

      const projectMatch = selectedProject === "All Projects" || (worker.assignedProject && worker.assignedProject === selectedProject) || (selectedProject === "Digital Bole Heights" && (!worker.assignedProject || worker.assignedProject === "Digital Bole Heights"));
      const buildingMatch = selectedBuilding === "All Buildings" || a.building === selectedBuilding;
      const floorMatch = selectedFloor === "All Floors" || `Floor ${a.floor}` === selectedFloor;
      const zoneMatch = selectedZone === "All Zones" || a.zone === selectedZone;
      
      let teamMatch = true;
      if (selectedTeam !== "All Teams") {
        const team = teams.find(t => t.name === selectedTeam);
        teamMatch = team ? team.memberIds.includes(a.workerId) : false;
      }

      const matchesSearch = worker.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            a.workerId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            a.trade.toLowerCase().includes(searchTerm.toLowerCase());

      return projectMatch && buildingMatch && floorMatch && zoneMatch && teamMatch && matchesSearch;
    });
  }, [attendance, workers, selectedProject, selectedBuilding, selectedFloor, selectedZone, selectedTeam, searchTerm, teams]);

  // Aggregate Reporting Indicators
  const totalEmployees = useMemo(() => {
    return workers.filter(w => {
      const projectMatch = selectedProject === "All Projects" || w.assignedProject === selectedProject || (selectedProject === "Digital Bole Heights" && !w.assignedProject);
      const buildingMatch = selectedBuilding === "All Buildings" || w.building === selectedBuilding;
      const floorMatch = selectedFloor === "All Floors" || (w.floor && `Floor ${w.floor}` === selectedFloor);
      const zoneMatch = selectedZone === "All Zones" || w.zone === selectedZone;
      return projectMatch && buildingMatch && floorMatch && zoneMatch;
    }).length || workers.length;
  }, [workers, selectedProject, selectedBuilding, selectedFloor, selectedZone]);

  const presentTodayCount = filteredAttendance.filter(a => a.status === "Present" || a.status === "Late").length;
  const absentTodayCount = Math.max(0, totalEmployees - presentTodayCount);
  const lateTodayCount = filteredAttendance.filter(a => a.status === "Late").length;
  
  const activeWorkersCount = filteredAttendance.filter(a => a.checkIn && !a.checkOut).length;
  const checkedOutCount = filteredAttendance.filter(a => a.checkIn && a.checkOut).length;
  
  const totalDailyOvertime = useMemo(() => {
    return parseFloat(filteredAttendance.reduce((acc, a) => acc + (a.overtime || 0), 0).toFixed(1));
  }, [filteredAttendance]);

  const attendancePercentage = totalEmployees > 0 ? Math.round((presentTodayCount / totalEmployees) * 100) : 0;

  // Unread notification count
  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="space-y-6">
      {/* SECTION BANNER AND ONLINE INDICATORS */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 pointer-events-none">
          <Database size={240} className="text-red-500 animate-pulse" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2.5">
              <span className="bg-red-600 text-[10px] tracking-widest font-extrabold uppercase px-3 py-1 rounded-full">
                {isAmharic ? "ማዕከላዊ ግንኙነት እና ሪፖርት" : "Enterprise Real-Time Cloud Sync"}
              </span>
              
              <div className={`flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold font-mono transition-all ${
                isCloudOnline 
                  ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800" 
                  : "bg-amber-950/80 text-amber-500 border border-amber-800 animate-pulse"
              }`}>
                <span className={`w-2.5 h-2.5 rounded-full ${isCloudOnline ? "bg-emerald-400" : "bg-amber-500 animate-ping"}`}></span>
                <span>{isCloudOnline ? (isAmharic ? "ደመና ኦንላይን" : "Cloud Online") : (isAmharic ? "ከመስመር ውጭ (Offline)" : "Disconnected / Offline")}</span>
              </div>
            </div>
            <h1 className="text-2xl font-black tracking-tight font-sans text-white">
              {isAmharic ? "የዋና መስሪያ ቤት ማዕከላዊ የደመና ሪፖርት ሲስተም" : "Real-Time Cloud Synchronization & Reporting Module"}
            </h1>
            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
              {isAmharic 
                ? "በዲጂታል ኮንስትራክሽን ERP ሲስተም ግንባታ ሳይቶች መካከል የሚደረግ የባዮሜትሪክ የጣት አሻራ መገኘት፣ የጂፒኤስ ማረጋገጫ፣ የትርፍ ሰዓት ስሌት እና የቀጥታ ዳታቤዝ ማመሳሰያ የቁጥጥር ሰሌዳ።"
                : "Real-time synchronization bridge coupling high-performance biometrics with Digital Construction ERP head office reporting. Aggregates multi-project workforce distribution, handles decentralized geofenced client buffers, and executes instant hours compilation."}
            </p>
          </div>

          <div className="shrink-0">
            <button
              onClick={handleToggleOnline}
              className={`w-full md:w-auto px-5 py-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-2.5 border transition-all cursor-pointer shadow-md ${
                isCloudOnline 
                  ? "bg-slate-950 text-amber-500 border-amber-500 hover:bg-slate-800" 
                  : "bg-red-600 text-white border-transparent hover:bg-red-500"
              }`}
            >
              {isCloudOnline ? (
                <>
                  <WifiOff size={16} />
                  <span>{isAmharic ? "ግንኙነት አቋርጥ (Go Offline)" : "Disconnect Server (Go Offline)"}</span>
                </>
              ) : (
                <>
                  <Wifi size={16} className="animate-bounce" />
                  <span>{isAmharic ? "ደመና አገናኝ (Go Online)" : "Reconnect Server (Go Online)"}</span>
                </>
              )}
            </button>
            {localOfflineQueue.length > 0 && (
              <div className="mt-2 text-right">
                <span className="inline-block bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-mono px-2 py-0.5 rounded font-black">
                  {localOfflineQueue.length} {isAmharic ? "ያልተመሳሰሉ መዝገቦች አሉ" : "pending offline records buffered"}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex border-b border-slate-200 bg-white px-4 pt-1 rounded-t-xl">
        {[
          { id: "dashboard", labelEn: "Head Office Report Dashboard", labelAm: "የዋና መስሪያ ቤት ሪፖርት ሰሌዳ", icon: Activity },
          { id: "syncHistory", labelEn: "Data Sync History", labelAm: "የመረጃ ማመሳሰል ታሪክ", icon: History },
          { id: "database", labelEn: "Central Synced Database", labelAm: "የደመና ዳታቤዝ መዝገብ", icon: Database },
          { id: "notifications", labelEn: `Smart Notifications (${unreadCount})`, labelAm: `ብልህ ማሳወቂያዎች (${unreadCount})`, icon: Bell },
          { id: "security", labelEn: "Security & RBAC Audits", labelAm: "የደህንነት እና ኦዲት መዝገብ", icon: ShieldCheck }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-5 py-3.5 border-b-2 text-xs font-bold transition-all cursor-pointer ${
                isActive 
                  ? "border-red-600 text-red-600" 
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
              }`}
            >
              <Icon size={14} className={isActive ? "text-red-600" : "text-slate-400"} />
              <span>{isAmharic ? tab.labelAm : tab.labelEn}</span>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT: 1. DASHBOARD */}
      {activeTab === "dashboard" && (
        <div className="space-y-6">
          {/* MULTI-PROJECT HIERARCHY FILTERS PANEL */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center space-x-2 text-slate-700 font-bold text-xs border-b border-slate-100 pb-3">
              <Filter size={14} className="text-red-500" />
              <span>{isAmharic ? "የቀጥታ ስርጭት ሪፖርት ማጣሪያዎች (ባለብዙ ግንባታ ፕሮጄክት ተዋረድ)" : "Central Multi-Project Reporting Filter Hierarchy"}</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
              {/* Project Filter */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-black uppercase tracking-wider">{isAmharic ? "ግንባታ ፕሮጀክት" : "Project Site"}</label>
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-red-500"
                >
                  {projectList.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              {/* Building Filter */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-black uppercase tracking-wider">{isAmharic ? "ሕንፃ / ብሎክ" : "Building / Block"}</label>
                <select
                  value={selectedBuilding}
                  onChange={(e) => setSelectedBuilding(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none"
                >
                  {buildingList.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>

              {/* Floor Filter */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-black uppercase tracking-wider">{isAmharic ? "ፎቅ" : "Floor"}</label>
                <select
                  value={selectedFloor}
                  onChange={(e) => setSelectedFloor(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none"
                >
                  {floorList.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>

              {/* Zone Filter */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-black uppercase tracking-wider">{isAmharic ? "የስራ ዞን" : "Slab Zone"}</label>
                <select
                  value={selectedZone}
                  onChange={(e) => setSelectedZone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none"
                >
                  {zoneList.map(z => <option key={z} value={z}>{z}</option>)}
                </select>
              </div>

              {/* Team Filter */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-black uppercase tracking-wider">{isAmharic ? "ስራ ቡድን" : "Formwork Team"}</label>
                <select
                  value={selectedTeam}
                  onChange={(e) => setSelectedTeam(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none"
                >
                  {teamList.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* DYNAMIC KPI COUNTERS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center space-x-4">
              <div className="p-3.5 bg-red-50 text-red-600 rounded-xl shrink-0">
                <Users size={24} />
              </div>
              <div className="space-y-0.5 leading-none">
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">
                  {isAmharic ? "ጠቅላላ ሰራተኞች" : "Total Roster Scope"}
                </span>
                <h3 className="text-2xl font-black text-slate-900 font-sans">{totalEmployees}</h3>
                <span className="text-[9px] text-slate-500 font-medium">In selected hierarchy</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center space-x-4">
              <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
                <CheckCircle2 size={24} />
              </div>
              <div className="space-y-0.5 leading-none">
                <span className="text-[10px] text-emerald-600 font-black uppercase tracking-wider block">
                  {isAmharic ? "የመጡ (ዛሬ)" : "Present Today"}
                </span>
                <h3 className="text-2xl font-black text-emerald-600 font-sans">{presentTodayCount}</h3>
                <span className="text-[9px] text-slate-500 font-medium">
                  {attendancePercentage}% {isAmharic ? "አጠቃላይ መገኘት" : "attendance rate"}
                </span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center space-x-4">
              <div className="p-3.5 bg-amber-50 text-amber-600 rounded-xl shrink-0">
                <Clock size={24} />
              </div>
              <div className="space-y-0.5 leading-none">
                <span className="text-[10px] text-amber-600 font-black uppercase tracking-wider block">
                  {isAmharic ? "የዘገዩ ሰራተኞች" : "Late Arrivals"}
                </span>
                <h3 className="text-2xl font-black text-amber-600 font-sans">{lateTodayCount}</h3>
                <span className="text-[9px] text-slate-500 font-medium">
                  Requires site compliance talk
                </span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center space-x-4">
              <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
                <Activity size={24} />
              </div>
              <div className="space-y-0.5 leading-none">
                <span className="text-[10px] text-indigo-600 font-black uppercase tracking-wider block">
                  {isAmharic ? "በትርፍ ሰዓት የሰሩ" : "Total Overtime"}
                </span>
                <h3 className="text-2xl font-black text-indigo-600 font-sans">{totalDailyOvertime}h</h3>
                <span className="text-[9px] text-slate-500 font-medium">Accumulated today</span>
              </div>
            </div>
          </div>

          {/* TWO COLUMN INTERACTIVE SIMULATORS & FLOW PANELS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* COLUMN 1 & 2: LIVE METRICS DRILL-DOWN */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* BREAKDOWN SECTIONS (BY PROJECT, BUILDING, FLOOR, ZONE, TEAM, GANG) */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-3 flex items-center justify-between">
                  <span>📊 {isAmharic ? "የመገኘት ሪፖርት ዝርዝር ስብጥር" : "Head Office Aggregate Attendance Breakdowns"}</span>
                  <span className="bg-slate-100 text-[10px] text-slate-600 px-2 py-0.5 rounded font-mono font-bold">LIVE METRIC FEED</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                  {/* Attendance by Project */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
                    <span className="font-bold text-slate-700 block text-[11px]">{isAmharic ? "መገኘት በግንባታ ፕሮጄክት (By Project)" : "Attendance by Project Site"}</span>
                    <div className="space-y-2">
                      {[
                        { name: "Digital Bole Heights", rate: attendancePercentage, count: presentTodayCount },
                        { name: "Digital Construction ERP Ayat Project", rate: 88, count: 12 },
                        { name: "Digital Construction ERP CMC Sector", rate: 75, count: 8 },
                        { name: "Digital Construction ERP Lebu site", rate: 92, count: 11 }
                      ].map((item, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                            <span>{item.name}</span>
                            <span className="font-mono">{item.count} present ({item.rate}%)</span>
                          </div>
                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-red-600 h-full rounded-full" style={{ width: `${item.rate}%` }}></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Attendance by Building & Floor */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
                    <span className="font-bold text-slate-700 block text-[11px]">{isAmharic ? "መገኘት በፎቆች እና ህንፃዎች (By Building/Floor)" : "Attendance by Building & Floor"}</span>
                    <div className="space-y-2">
                      {[
                        { name: "Tower A - Floor 4", rate: 94 },
                        { name: "Tower A - Floor 3", rate: 100 },
                        { name: "Tower B - Floor 2", rate: 82 },
                        { name: "Block C - Floor 1", rate: 68 }
                      ].map((item, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                            <span>{item.name}</span>
                            <span className="font-mono">{item.rate}%</span>
                          </div>
                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-slate-800 h-full rounded-full" style={{ width: `${item.rate}%` }}></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Attendance by Zone */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
                    <span className="font-bold text-slate-700 block text-[11px]">{isAmharic ? "መገኘት በስራ ዞኖች (By Zone)" : "Attendance by Spatial Zone"}</span>
                    <div className="space-y-2">
                      {[
                        { name: "Zone A (Assembly Core)", rate: 95 },
                        { name: "Zone B (Slab Prep)", rate: 80 },
                        { name: "Zone C (Lift Core)", rate: 45 }
                      ].map((item, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                            <span>{item.name}</span>
                            <span className="font-mono">{item.rate}%</span>
                          </div>
                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${item.rate}%` }}></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Attendance by Team & Gang */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
                    <span className="font-bold text-slate-700 block text-[11px]">{isAmharic ? "መገኘት በስራ ቡድን እና ጋንግ (By Team/Gang)" : "Attendance by Team & Crew"}</span>
                    <div className="space-y-2">
                      {[
                        { name: "Assembly Team Alpha (Bekele)", rate: 100 },
                        { name: "Stripping Team Beta (Chala)", rate: 85 },
                        { name: "Steel Fixing Team Gamma (Almaz)", rate: 90 },
                        { name: "Support Team Epsilon (Fikru)", rate: 100 }
                      ].map((item, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                            <span>{item.name}</span>
                            <span className="font-mono">{item.rate}%</span>
                          </div>
                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${item.rate}%` }}></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </div>

              {/* REAL-TIME WORKER STATUS TABLE */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
                  <div className="space-y-1">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                      👥 {isAmharic ? "የቀጥታ ሰራተኞች ወቅታዊ ሁኔታ" : "Central Real-Time Attendance Roster"}
                    </h3>
                    <p className="text-[10px] text-slate-500">{isAmharic ? "በተመረጠው ማጣሪያ መሰረት የሰራተኞች የቀጥታ መግቢያ/መውጫ ዝርዝር።" : "Real-time updates directly piped from local client scanner terminals."}</p>
                  </div>
                  
                  {/* Search Roster */}
                  <div className="relative w-full sm:w-60">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={13} />
                    <input
                      type="text"
                      placeholder={isAmharic ? "በስም ወይም በሙያ ፈልግ..." : "Search name/trade..."}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-black uppercase text-[10px] tracking-wider bg-slate-50">
                        <th className="p-3">{isAmharic ? "የሰራተኛ ስም" : "Worker Name"}</th>
                        <th className="p-3">{isAmharic ? "ሙያ / ቦታ" : "Trade / Zone"}</th>
                        <th className="p-3">{isAmharic ? "መግቢያ (IN)" : "Clock IN"}</th>
                        <th className="p-3">{isAmharic ? "መውጫ (OUT)" : "Clock OUT"}</th>
                        <th className="p-3">{isAmharic ? "የሰሩበት ሰዓት" : "Logged Hrs"}</th>
                        <th className="p-3">{isAmharic ? "ሁኔታ" : "Status"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredAttendance.map((rec) => {
                        const worker = workers.find(w => w.id === rec.workerId);
                        return (
                          <tr key={rec.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-3 font-semibold text-slate-800">
                              <div className="flex flex-col">
                                <span>{rec.workerName}</span>
                                <span className="text-[10px] font-mono text-slate-400">{rec.workerId}</span>
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="flex flex-col">
                                <span className="font-medium text-slate-600">{rec.trade}</span>
                                <span className="text-[10px] text-slate-400 font-mono">{rec.building} | Fl {rec.floor} | {rec.zone}</span>
                              </div>
                            </td>
                            <td className="p-3 font-mono text-slate-600">{rec.checkIn || "—"}</td>
                            <td className="p-3 font-mono text-slate-600">{rec.checkOut || "—"}</td>
                            <td className="p-3">
                              {rec.checkOut ? (
                                <span className="font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-[10px]">
                                  {rec.workingHours}h (OT: {rec.overtime}h)
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">Working</span>
                              )}
                            </td>
                            <td className="p-3">
                              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                rec.status === "Present" ? "bg-emerald-100 text-emerald-800 border border-emerald-200" :
                                rec.status === "Late" ? "bg-amber-100 text-amber-800 border border-amber-200" :
                                rec.status === "Leave" ? "bg-indigo-100 text-indigo-800 border border-indigo-200" :
                                "bg-red-100 text-red-800 border border-red-200"
                              }`}>
                                {isAmharic 
                                  ? (rec.status === "Present" ? "በሰዓቱ" : rec.status === "Late" ? "የዘገየ" : rec.status === "Leave" ? "ፈቃድ" : "ያልመጣ")
                                  : rec.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredAttendance.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center p-8 text-slate-400 italic">
                            {isAmharic ? "ምንም የተመዘገበ ሰራተኛ አልተገኘም" : "No records match search parameters."}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* COLUMN 3: INTERACTIVE CLOUD SCAN SIMULATOR */}
            <div className="space-y-6">
              
              {/* CONNECTED DEVICES STATUS */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-3 flex items-center justify-between">
                  <span>📱 {isAmharic ? "የተገናኙ የሳይት መሳሪያዎች" : "Authorized Sync Devices"}</span>
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></span>
                </h3>

                <div className="space-y-3">
                  {devices.map(dev => (
                    <div key={dev.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                      <div className="flex items-center space-x-2.5">
                        <Smartphone size={16} className={isCloudOnline ? "text-slate-700" : "text-slate-400"} />
                        <div>
                          <span className="font-bold text-slate-800 block text-[11px]">{dev.name}</span>
                          <span className="text-[10px] text-slate-500 font-mono">Role: {dev.role} | {dev.id}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        {dev.pendingSyncCount > 0 ? (
                          <span className="bg-amber-100 text-amber-800 border border-amber-200 text-[9px] font-black px-2 py-0.5 rounded font-mono">
                            {dev.pendingSyncCount} pending
                          </span>
                        ) : (
                          <span className="text-[10px] text-emerald-600 font-bold flex items-center space-x-1 justify-end">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            <span>Synced</span>
                          </span>
                        )}
                        <span className="text-[9px] text-slate-400 block font-mono">Active {dev.lastActive}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* NETWORK USAGE SUMMARY (OFFLINE BUFFER TELEMETRY) */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Database className="text-red-500 animate-pulse" size={16} />
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                      {isAmharic ? "የመስመር ውጭ መረጃ አጠቃቀም" : "Network Usage Summary"}
                    </h3>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-mono font-black uppercase ${
                    localOfflineQueue.length > 0 
                      ? "bg-amber-100 text-amber-800 animate-pulse" 
                      : "bg-slate-100 text-slate-500"
                  }`}>
                    {localOfflineQueue.length > 0 
                      ? (isAmharic ? "ማከማቻው ገባሪ ነው" : "Buffer Active") 
                      : (isAmharic ? "ማከማቻ ባዶ ነው" : "Buffered Clean")}
                  </span>
                </div>

                {/* Main size displays */}
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                      {isAmharic ? "የተከማቸ ፋይል መጠን" : "Cached Buffer Size"}
                    </span>
                    <div className="flex items-baseline space-x-1">
                      <span className="text-2xl font-black text-slate-900 font-mono">
                        {(localOfflineQueue.length * 0.18).toFixed(2)}
                      </span>
                      <span className="text-xs font-bold text-slate-500 font-mono">MB</span>
                    </div>
                  </div>
                  <div className="space-y-1 text-right">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                      {isAmharic ? "ያልተላኩ መዝገቦች" : "Buffered Records"}
                    </span>
                    <div className="flex items-baseline justify-end space-x-1">
                      <span className="text-2xl font-black text-slate-900 font-mono">
                        {localOfflineQueue.length}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500">
                        {isAmharic ? "መዝገብ" : "tx"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Progress bar depicting storage limits */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-bold text-slate-500">
                    <span>{isAmharic ? "የአካባቢ ማከማቻ አጠቃቀም (ከ 16MB ገደብ)" : "Local Storage Limit (Max 16MB Allocation)"}</span>
                    <span className="font-mono">
                      {((localOfflineQueue.length * 0.18 / 16) * 100).toFixed(2)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/50">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        localOfflineQueue.length > 50 ? "bg-red-500" : localOfflineQueue.length > 20 ? "bg-amber-500" : "bg-red-600"
                      }`} 
                      style={{ width: `${Math.min(100, (localOfflineQueue.length * 0.18 / 16) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Telemetry Payload Allocation Breakdown */}
                <div className="space-y-2 text-[10px] text-slate-600 font-mono">
                  <span className="font-bold text-slate-500 text-[11px] block tracking-wide uppercase">
                    {isAmharic ? "የመረጃ ስርጭት ስብጥር" : "Encrypted Payload Allocation Breakdown"}
                  </span>
                  
                  <div className="space-y-1.5 bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-1.5 text-slate-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                        {isAmharic ? "የጣት አሻራ እና ባዮሜትሪክስ" : "Biometric Match Template"}
                      </span>
                      <span className="font-bold text-slate-800">
                        {localOfflineQueue.length > 0 ? `${(localOfflineQueue.length * 0.14).toFixed(2)} MB` : "0.00 MB"} (78%)
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-1.5 text-slate-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                        {isAmharic ? "የጂፒኤስ የቦታ መረጃ" : "GPS Geolocation Coordinates"}
                      </span>
                      <span className="font-bold text-slate-800">
                        {localOfflineQueue.length > 0 ? `${(localOfflineQueue.length * 0.025).toFixed(2)} MB` : "0.00 MB"} (14%)
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-1.5 text-slate-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                        {isAmharic ? "የሰራተኛ ዝርዝርና ሜታዳታ" : "Metadata & Access Logs"}
                      </span>
                      <span className="font-bold text-slate-800">
                        {localOfflineQueue.length > 0 ? `${(localOfflineQueue.length * 0.015).toFixed(2)} MB` : "0.00 MB"} (8%)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Estimated Uplink Bandwidth Requirements */}
                {localOfflineQueue.length > 0 && (
                  <div className="bg-amber-500/10 border border-amber-500/20 text-amber-800 rounded-xl p-3 text-[11px] leading-relaxed space-y-1">
                    <span className="font-black block uppercase tracking-wider text-[10px] text-amber-900">
                      {isAmharic ? "🛰️ የደመና ግንኙነት ዝግጁነት" : "🛰️ Offline Buffer Queue Status"}
                    </span>
                    <p>
                      {isAmharic 
                        ? `ሲስተሙ ሲገናኝ ${(localOfflineQueue.length * 0.18).toFixed(2)} MB ለማመሳሰል በ 3G ግንኙነት ${(localOfflineQueue.length * 0.4).toFixed(1)} ሰከንድ፣ በ VSAT ሳተላይት ግንኙነት ${(localOfflineQueue.length * 1.5).toFixed(1)} ሰከንድ ይፈጅበታል።`
                        : `System detects offline buffer. Reconnecting will transfer ${(localOfflineQueue.length * 0.18).toFixed(2)} MB of telemetry data. Est. duration: ~${(localOfflineQueue.length * 0.4).toFixed(1)}s on HSDPA+ 3G and ~${(localOfflineQueue.length * 1.5).toFixed(1)}s over local VSAT satellite uplink.`
                      }
                    </p>
                  </div>
                )}

                {/* Quick actions to simulate Offline Storage actions */}
                <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
                  <button
                    onClick={() => {
                      // Bulk inject simulated offline biometric records to demonstrate local caching capacity
                      const todayDate = new Date().toISOString().split("T")[0];
                      const newRecords: AttendanceRecord[] = Array.from({ length: 10 }).map((_, i) => {
                        const randomWorker = workers[Math.floor(Math.random() * workers.length)];
                        return {
                          id: `OFF-BULK-${Date.now()}-${randomWorker.id}-${i}`,
                          workerId: randomWorker.id,
                          workerName: randomWorker.name,
                          department: randomWorker.department,
                          trade: randomWorker.trade,
                          company: randomWorker.company,
                          building: randomWorker.building || "Tower B",
                          floor: randomWorker.floor || 2,
                          zone: randomWorker.zone || "Zone A",
                          date: todayDate,
                          checkIn: "08:12:45",
                          checkOut: null,
                          method: AttendanceMethod.FINGERPRINT,
                          workingHours: 0,
                          overtime: 0,
                          status: "Present",
                          gpsCoordinates: { lat: 9.011743, lng: 38.794651 },
                          deviceUsed: "Digital Construction ERP-BIO-PAD-03",
                          verifiedBy: currentUserRole,
                          gpsLocationString: isAmharic ? "ቦሌ ሃይትስ ግንባታ ቦታ" : "Digital Bole Heights Site"
                        };
                      });
                      setLocalOfflineQueue(prev => [...prev, ...newRecords]);
                      if (onLogAction) {
                        onLogAction("Bulk Offline Buffer Loading", `Simulated bulk generation of 10 biometric attendance records offline. Added 1.80 MB to local client cache.`);
                      }
                    }}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2 px-1 rounded-xl transition-all cursor-pointer text-center text-[10px]"
                  >
                    ➕ {isAmharic ? "10 ሪኮርድ ጨምር" : "Simulate +10 Tx"}
                  </button>

                  <button
                    onClick={() => {
                      if (localOfflineQueue.length === 0) return;
                      setLocalOfflineQueue([]);
                      if (onLogAction) {
                        onLogAction("Local Buffer Cleared", "Manually purged offline queued records and reclaimed local storage cache.");
                      }
                    }}
                    disabled={localOfflineQueue.length === 0}
                    className={`font-bold py-2 px-1 rounded-xl transition-all cursor-pointer text-center text-[10px] ${
                      localOfflineQueue.length === 0 
                        ? "bg-slate-50 text-slate-300 cursor-not-allowed border border-slate-100" 
                        : "bg-red-50 hover:bg-red-100 text-red-600 border border-red-200"
                    }`}
                  >
                    🗑️ {isAmharic ? "ማከማቻ አጽዳ" : "Purge Cache"}
                  </button>
                </div>
              </div>

              {/* DEMO SCAN TRIGGER MODULE */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    🧬 {isAmharic ? "የቀጥታ አሻራ መግቢያ ማሳያ" : "Real-time Scanner Simulator"}
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">{isAmharic ? "በሳይት መሳሪያዎች ላይ የሚደረጉ አሻራ ስካኖችን እዚህ ጋር በመምረጥ መምሰል ይችላሉ።" : "Simulate instant biometric scan transmissions over secure cloud pipeline."}</p>
                </div>

                <div className="space-y-4 text-xs font-sans">
                  {/* Select Worker */}
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-600 block">{isAmharic ? "ሰራተኛ ይምረጡ" : "Choose Site Worker"}</label>
                    <select
                      id="sim-worker-select"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none"
                    >
                      {workers.map(w => (
                        <option key={w.id} value={w.id}>{w.name} ({w.trade})</option>
                      ))}
                    </select>
                  </div>

                  {/* Mode Select */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        const selectEl = document.getElementById("sim-worker-select") as HTMLSelectElement;
                        if (selectEl) simulateBiometricScan(selectEl.value, "check-in", "fingerprint");
                      }}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl transition-all cursor-pointer text-center text-xs shadow-xs"
                    >
                      📥 {isAmharic ? "በሰዓቱ ግባ (Clock IN)" : "Clock IN"}
                    </button>
                    <button
                      onClick={() => {
                        const selectEl = document.getElementById("sim-worker-select") as HTMLSelectElement;
                        if (selectEl) simulateBiometricScan(selectEl.value, "check-out", "fingerprint");
                      }}
                      className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl transition-all cursor-pointer text-center text-xs shadow-xs"
                    >
                      📤 {isAmharic ? "ውጣ (Clock OUT)" : "Clock OUT"}
                    </button>
                  </div>

                  {/* Exception Simulations */}
                  <div className="border-t border-slate-100 pt-3 space-y-2">
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">{isAmharic ? "የደህንነት እና ቦታ ችግር ማስመሰያ" : "Simulate Out of Bounds / Verification Exceptions"}</span>
                    
                    <button
                      onClick={() => {
                        const selectEl = document.getElementById("sim-worker-select") as HTMLSelectElement;
                        if (selectEl) simulateBiometricScan(selectEl.value, "check-in", "fingerprint", true);
                      }}
                      className="w-full text-left bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl px-3 py-2 flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <span>📍 {isAmharic ? "ከአጥር ውጭ መግባት ሙከራ (GPS Breach)" : "GPS Geofence Breach"}</span>
                      <AlertTriangle size={13} className="text-amber-600" />
                    </button>

                    <button
                      onClick={() => {
                        const selectEl = document.getElementById("sim-worker-select") as HTMLSelectElement;
                        if (selectEl) simulateBiometricScan(selectEl.value, "check-in", "fingerprint", false, true);
                      }}
                      className="w-full text-left bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 rounded-xl px-3 py-2 flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <span>🧬 {isAmharic ? "የጣት አሻራ መለያ አለመሳካት (Match Fail)" : "Biometric Verification Fail"}</span>
                      <Lock size={13} className="text-red-600" />
                    </button>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* TAB CONTENT: DATA SYNCHRONIZATION HISTORY */}
      {activeTab === "syncHistory" && (
        <div className="space-y-6 animate-fade-in">
          {/* HEADER SECTION */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 flex items-center space-x-2">
                  <History className="text-red-600" size={16} />
                  <span>{isAmharic ? "ከመስመር ውጭ የመረጃ ማመሳሰል ታሪክ ሰሌዳ" : "Offline Data Synchronization History & Ledger"}</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-1">
                  {isAmharic 
                    ? "ከኢንተርኔት ግንኙነት ውጭ የቆዩ የመስክ ዳታ በፎርምዎርክ ተርሚናሎች የተዋሃዱበት እና ፊርማቸው የተረጋገጠበት የጊዜ መስመር ኦዲት።" 
                    : "Cryptographic audit trail mapping the chronological timeline of offline terminal buffers merging with central databases."}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-3 py-1.5 rounded-xl flex items-center space-x-1 font-mono">
                  <ShieldCheck size={11} className="text-emerald-500" />
                  <span>AES-GCM VALID</span>
                </span>
              </div>
            </div>
          </div>

          {/* KPI METRICS OVERVIEW */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-4">
              <div className="p-3.5 bg-slate-50 text-slate-700 rounded-xl shrink-0 border border-slate-100">
                <Layers size={20} />
              </div>
              <div className="space-y-0.5 leading-none">
                <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block">{isAmharic ? "ጠቅላላ ውህደቶች" : "Total Sync Blocks"}</span>
                <h4 className="text-xl font-black text-slate-900 font-sans">{syncHistory.length}</h4>
                <span className="text-[9px] text-slate-500 font-semibold">Buffered sessions</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-4">
              <div className="p-3.5 bg-red-50 text-red-600 rounded-xl shrink-0">
                <Database size={20} />
              </div>
              <div className="space-y-0.5 leading-none">
                <span className="text-[9px] text-red-600 font-black uppercase tracking-wider block">{isAmharic ? "የተዋሃዱ መዝገቦች" : "Total Merged Rows"}</span>
                <h4 className="text-xl font-black text-red-600 font-sans">
                  {syncHistory.reduce((acc, curr) => acc + curr.recordsCount, 0)}
                </h4>
                <span className="text-[9px] text-slate-500 font-semibold">Attendance records</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-4">
              <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
                <Clock size={20} />
              </div>
              <div className="space-y-0.5 leading-none">
                <span className="text-[9px] text-indigo-600 font-black uppercase tracking-wider block">{isAmharic ? "አማካኝ ውህደት ፍጥነት" : "Avg Merge Speed"}</span>
                <h4 className="text-xl font-black text-indigo-600 font-sans">
                  {syncHistory.length > 0 
                    ? Math.round(syncHistory.reduce((acc, curr) => acc + curr.durationMs, 0) / syncHistory.length) 
                    : 0} ms
                </h4>
                <span className="text-[9px] text-slate-500 font-semibold">Network round-trip</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-4">
              <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
                <ShieldCheck size={20} />
              </div>
              <div className="space-y-0.5 leading-none">
                <span className="text-[9px] text-emerald-600 font-black uppercase tracking-wider block">{isAmharic ? "የታማኝነት ማረጋገጫ" : "Integrity Rate"}</span>
                <h4 className="text-xl font-black text-emerald-600 font-sans">100.0%</h4>
                <span className="text-[9px] text-slate-500 font-semibold">Cryptographic matches</span>
              </div>
            </div>
          </div>

          {/* TWO COLUMN CONTENT PANEL */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* LEFT COLUMN: TIMELINE & CHARTS (span-2) */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* CHARTS PANEL */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <span className="font-black text-xs text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                    <TrendingUp size={13} className="text-red-500" />
                    <span>{isAmharic ? "የመረጃ ውህደት እና ፍጥነት ትንተና" : "Merge Volume & Network Latency Timeline Trends"}</span>
                  </span>
                  <span className="bg-slate-100 text-slate-600 font-mono text-[9px] font-bold px-2 py-0.5 rounded">REAL-TIME DATA COMPLIANCE</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Records Merged Area Chart */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-slate-500 block">{isAmharic ? "የተመሳሰሉ መዝገቦች ብዛት በየጊዜው" : "Volume of Attendance Records Merged"}</span>
                    <div className="h-44 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorRecords" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} />
                          <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} />
                          <Tooltip contentStyle={{ fontSize: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#ffffff' }} />
                          <Area type="monotone" dataKey="records" name="Records" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorRecords)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Merge Duration Line Chart */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-slate-500 block">{isAmharic ? "የውህደት ፍጥነት (በሚሊሰከንድ)" : "Database Merge Round-Trip Duration (ms)"}</span>
                    <div className="h-44 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} />
                          <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} />
                          <Tooltip contentStyle={{ fontSize: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#ffffff' }} />
                          <Bar dataKey="latency" name="Latency (ms)" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>

              {/* TIMELINE LEDGER */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center space-x-1.5">
                  <GitMerge size={14} className="text-indigo-600" />
                  <span>{isAmharic ? "የቀጥታ የመረጃ ውህደት የጊዜ መስመር" : "Chronological Sync Merging Timeline Ledger"}</span>
                </h4>

                <div className="relative border-l-2 border-slate-100 pl-6 ml-3 space-y-6">
                  {syncHistory.map((item) => {
                    const isExpanded = selectedHistoryId === item.id;
                    return (
                      <div key={item.id} className="relative group">
                        {/* Timeline Bullet */}
                        <span className={`absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center transition-all ${
                          item.status === "Success" ? "bg-emerald-500 shadow-emerald-500/30 shadow-md" : "bg-amber-500 shadow-amber-500/30 shadow-md animate-pulse"
                        }`}>
                          <span className="w-1 h-1 bg-white rounded-full"></span>
                        </span>

                        <div className={`p-4 rounded-xl border transition-all ${
                          isExpanded 
                            ? "bg-slate-50/80 border-slate-300 shadow-sm" 
                            : "bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50/40"
                        }`}>
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                            <div className="space-y-0.5">
                              <div className="flex items-center space-x-2">
                                <span className="font-mono text-[10px] font-black text-slate-400 uppercase tracking-wider">{item.id}</span>
                                <span className="text-[10px] font-semibold text-slate-400">• {item.timestamp}</span>
                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                  item.status === "Success" 
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                                    : "bg-amber-50 text-amber-700 border border-amber-100"
                                }`}>
                                  {isAmharic ? (item.status === "Success" ? "ስኬታማ" : "ማስጠንቀቂያ") : item.status}
                                </span>
                              </div>
                              <h5 className="font-bold text-slate-800 text-xs flex items-center space-x-1.5 pt-0.5">
                                <Smartphone size={12} className="text-slate-400" />
                                <span>{item.device}</span>
                              </h5>
                            </div>

                            {/* Network / Byte stats */}
                            <div className="flex items-center space-x-2 text-[10px] font-mono shrink-0">
                              <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded font-semibold flex items-center space-x-1">
                                <Wifi size={10} className="text-slate-500 mr-1" />
                                {item.connectionType}
                              </span>
                              <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded font-bold">
                                {item.bytesMerged}
                              </span>
                            </div>
                          </div>

                          <p className="text-[11px] leading-relaxed text-slate-600 mt-2">
                            {isAmharic ? item.detailsAm : item.detailsEn}
                          </p>

                          {/* Quick details counts */}
                          <div className="flex flex-wrap gap-3 items-center text-[10px] text-slate-500 font-semibold mt-3 pt-2 border-t border-slate-100">
                            <div className="flex items-center space-x-1">
                              <Database size={11} className="text-slate-400" />
                              <span>{isAmharic ? "የተዋሃዱ መዝገቦች:" : "Records Merged:"} <strong className="text-slate-800">{item.recordsCount}</strong></span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock size={11} className="text-slate-400" />
                              <span>{isAmharic ? "ቆይታ:" : "Latency:"} <strong className="text-indigo-600">{item.durationMs} ms</strong></span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <AlertTriangle size={11} className="text-slate-400" />
                              <span>{isAmharic ? "የግጭት አፈታት:" : "Conflicts Resolved:"} <strong className={item.conflictsResolved > 0 ? "text-amber-600 font-bold" : "text-slate-600"}>{item.conflictsResolved}</strong></span>
                            </div>
                            <button
                              onClick={() => setSelectedHistoryId(isExpanded ? null : item.id)}
                              className="ml-auto text-indigo-600 font-bold hover:underline cursor-pointer flex items-center space-x-1 text-[10px]"
                            >
                              <span>{isExpanded ? (isAmharic ? "ዝርዝር ደብቅ" : "Hide Cryptographic Audit") : (isAmharic ? "ዝርዝር አሳይ" : "View Cryptographic Audit")}</span>
                              <CheckCircle size={10} className={isExpanded ? "rotate-180 transition-transform" : ""} />
                            </button>
                          </div>

                          {/* EXPANDABLE STEPS DRILL-DOWN */}
                          {isExpanded && (
                            <div className="mt-4 p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2 text-[11px] font-mono text-emerald-400 animate-slide-down">
                              <div className="flex justify-between border-b border-slate-800 pb-2 text-[10px] text-slate-500 font-bold">
                                <span>[CRYPTOGRAPHIC VERIFICATION LEDGER]</span>
                                <span className="text-emerald-500">SIGNATURE VALID</span>
                              </div>
                              <div className="space-y-1.5 leading-relaxed pt-1">
                                <p className="text-slate-400">&gt; Payload Integrity Hash: <strong className="text-white font-black">{item.integrityHash}</strong></p>
                                <p className="text-slate-400">&gt; Execution Steps Timeline:</p>
                                {item.steps.map((step, idx) => (
                                  <div key={idx} className="flex items-start space-x-2 pl-4">
                                    <span className="text-slate-500 shrink-0">[{idx + 1}]</span>
                                    <span className="text-slate-300">{step}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: INTERACTIVE MERGER SIMULATOR (span-1) */}
            <div className="space-y-6">
              
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
                <div className="border-b border-slate-100 pb-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center space-x-1.5">
                    <Cpu size={14} className="text-red-600" />
                    <span>{isAmharic ? "የመረጃ ውህደት ማስመሰያ" : "Secure Buffer Merger Simulator"}</span>
                  </h4>
                  <p className="text-[10px] text-slate-500 mt-1">
                    {isAmharic 
                      ? "የመስክ ተርሚናል ይምረጡ፣ ከመስመር ውጭ የቆዩ መዝገቦችን ያጠራቅሙ እና ውህደት በሚያደርጉበት ጊዜ የሚከናወኑ የኦዲት ደረጃዎችን ይመልከቱ።" 
                      : "Choose a target device and trigger an interactive database merge pipeline to see timeline logs dynamically compile."}
                  </p>
                </div>

                <div className="space-y-4 text-xs font-sans">
                  {/* Select Device */}
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-600 block">{isAmharic ? "ተርሚናል መሳሪያ ይምረጡ" : "Select Terminal Device"}</label>
                    <select
                      value={selectedSimDevice}
                      onChange={(e) => setSelectedSimDevice(e.target.value)}
                      disabled={isSimulatingMerge}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-red-500 disabled:opacity-50"
                    >
                      {devices.map(d => (
                        <option key={d.id} value={d.id}>{d.id} - {d.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Slider of records count */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between font-bold text-slate-600">
                      <span>{isAmharic ? "ከመስመር ውጭ የተጠራቀሙ መዝገቦች" : "Buffered Records Count"}</span>
                      <span className="font-mono text-red-600 font-extrabold text-sm">{simRecordsCount} logs</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="30"
                      value={simRecordsCount}
                      onChange={(e) => setSimRecordsCount(Number(e.target.value))}
                      disabled={isSimulatingMerge}
                      className="w-full accent-red-600 cursor-pointer disabled:opacity-50 h-2 bg-slate-100 rounded-lg appearance-none"
                    />
                    <div className="flex justify-between text-[9px] text-slate-400 font-bold font-mono">
                      <span>1 LOG</span>
                      <span>30 LOGS</span>
                    </div>
                  </div>

                  {/* Simulator action box */}
                  <div className="border-t border-slate-100 pt-4 space-y-4">
                    {isSimulatingMerge ? (
                      /* SIMULATOR PROGRESS SCREEN */
                      <div className="p-4 bg-slate-900 text-white rounded-xl space-y-3 font-mono text-[11px] border border-slate-800">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 animate-pulse">{isAmharic ? "የውህደት ሂደት ላይ..." : "Merging Buffers..."}</span>
                          <span className="text-emerald-400 font-extrabold">{simMergeProgress}%</span>
                        </div>
                        {/* Progress Bar */}
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div className="bg-emerald-500 h-full rounded-full transition-all duration-300" style={{ width: `${simMergeProgress}%` }}></div>
                        </div>
                        <div className="text-slate-300 text-[10px] leading-relaxed pt-1 flex items-start space-x-1.5">
                          <span className="text-emerald-500 font-black animate-ping shrink-0">•</span>
                          <span>{simMergeStep}</span>
                        </div>
                      </div>
                    ) : (
                      /* READY STATE */
                      <button
                        onClick={handleSimulateSyncMerge}
                        className="w-full bg-gradient-to-r from-red-600 to-indigo-600 hover:from-red-500 hover:to-indigo-500 text-white font-extrabold py-3.5 px-4 rounded-xl flex items-center justify-center space-x-2 shadow-md hover:shadow-lg transition-all cursor-pointer text-xs"
                      >
                        <Zap size={14} className="animate-pulse" />
                        <span>{isAmharic ? "ደህንነቱ የተጠበቀ ውህደት ጀምር" : "Initialize Secure Merge Protocol"}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* AUDIT POLICY STATS */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3 text-xs">
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block flex items-center space-x-1">
                  <ShieldCheck size={12} className="text-emerald-500" />
                  <span>Central Cloud Merging Rules</span>
                </span>
                <div className="space-y-2.5 text-slate-600">
                  <div className="flex items-start space-x-2">
                    <Check size={13} className="text-emerald-600 mt-0.5 shrink-0" />
                    <p className="leading-tight"><strong>Redundancy Guard</strong>: Bypasses duplicates automatically if transaction records match existing hashes.</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <Check size={13} className="text-emerald-600 mt-0.5 shrink-0" />
                    <p className="leading-tight"><strong>Dynamic Overtime</strong>: Clock-outs recalculate exact net working durations instantly upon database saves.</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <Check size={13} className="text-emerald-600 mt-0.5 shrink-0" />
                    <p className="leading-tight"><strong>Device Purging</strong>: Buffers are only deleted from mobile cache after strict SHA-256 cloud save match.</p>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* TAB CONTENT: 2. CENTRAL CLOUD DATABASE */}
      {activeTab === "database" && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="space-y-1">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 flex items-center space-x-2">
                <Database className="text-red-600" size={16} />
                <span>{isAmharic ? "በደመና ላይ የተመሳሰለ የደመወዝ እና የመገኘት ሰሌዳ" : "Cloud Synchronized Master Attendance Database"}</span>
              </h3>
              <p className="text-[11px] text-slate-500">{isAmharic ? "ሁሉም የመገኘት መዝገቦች ያለ ምንም ልዩነት በቀጥታ ወደዚህ ማዕከላዊ ማከማቻ ይላካሉ።" : "Live Firestore synchronization ledger representing authorized biometric transaction blocks."}</p>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  setIsSyncing(true);
                  setTimeout(() => setIsSyncing(false), 1200);
                }}
                className="bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 flex items-center space-x-1.5 cursor-pointer"
              >
                <RefreshCw size={12} className={isSyncing ? "animate-spin" : ""} />
                <span>{isAmharic ? "ዳታቤዝ አድስ" : "Refresh DB"}</span>
              </button>
            </div>
          </div>

          {/* CLOUD LEDGER BLOCK */}
          <div className="space-y-4">
            <div className="bg-slate-900 text-emerald-400 p-4 rounded-xl font-mono text-xs overflow-x-auto border border-slate-800 space-y-2">
              <div className="flex justify-between border-b border-slate-800 pb-1.5 text-slate-500">
                <span>[CENTRAL FIRESTORE ENDPOINT]</span>
                <span className="text-emerald-500 font-bold">CONNECTED - SSL ACTIVE</span>
              </div>
              <p className="text-slate-300">// Verified active synchronization across all mobile endpoints (Digital Construction ERP_B1_PAD_03, HEAD_OFFICE, TIME_KEEPER_TAB)</p>
              <div className="grid grid-cols-3 gap-4 text-[11px]">
                <div>&gt; COLLECTION: <span className="text-white">"digital_construction_erp_biometric_attendance"</span></div>
                <div>&gt; SCHEMAS: <span className="text-white">Strict Blueprint Match</span></div>
                <div>&gt; RECORD COUNT: <span className="text-white">{attendance.length} Synchronized rows</span></div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                    <th className="p-3">Transaction ID</th>
                    <th className="p-3">Worker / Specialty</th>
                    <th className="p-3">GPS Location Captured</th>
                    <th className="p-3">Calculated Hours</th>
                    <th className="p-3">Overtime</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {attendance.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-3 font-mono text-slate-500 font-bold">{rec.id}</td>
                      <td className="p-3">
                        <div className="font-semibold text-slate-800">{rec.workerName}</div>
                        <div className="text-[10px] text-slate-400">{rec.trade} | {rec.workerId}</div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center space-x-1.5">
                          <MapPin size={11} className="text-red-500 shrink-0" />
                          <span className="font-medium text-slate-700">{rec.gpsLocationString || "Bole Heights Site"}</span>
                        </div>
                        {rec.gpsCoordinates && (
                          <span className="text-[10px] text-slate-400 font-mono block ml-4">Lat: {rec.gpsCoordinates.lat.toFixed(5)}, Lng: {rec.gpsCoordinates.lng.toFixed(5)}</span>
                        )}
                      </td>
                      <td className="p-3 font-semibold font-mono text-slate-700">{rec.workingHours ? `${rec.workingHours} hrs` : "—"}</td>
                      <td className="p-3">
                        {rec.overtime > 0 ? (
                          <span className="bg-red-50 text-red-700 font-bold font-mono px-2 py-0.5 rounded text-[10px]">
                            +{rec.overtime} hrs
                          </span>
                        ) : (
                          <span className="text-slate-400">None</span>
                        )}
                      </td>
                      <td className="p-3">
                        <span className="inline-flex items-center space-x-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2.5 py-0.5 text-[10px] font-bold">
                          <CheckCircle size={10} className="text-emerald-500" />
                          <span>{isAmharic ? "የተመሳሰለ" : "Synced"}</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: 3. SMART NOTIFICATIONS */}
      {activeTab === "notifications" && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="space-y-1">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 flex items-center space-x-2">
                <Bell className="text-red-600 animate-swing" size={16} />
                <span>{isAmharic ? "ብልህ እና ፈጣን የደህንነት ማሳወቂያዎች" : "Smart Immediate System Notifications"}</span>
              </h3>
              <p className="text-[11px] text-slate-500">{isAmharic ? "በሳይት ግንባታ ላይ የሚደረጉ ልዩ መገኘቶች፣ የጂፒኤስ ስህተቶች እና የጣት አሻራ መለያ ሙከራዎች ለዋና መስሪያ ቤት እዚህ ጋር ይነገራሉ።" : "Real-time alerts broadcasted immediately to Head Office for compliance audit validation."}</p>
            </div>
            
            <button
              onClick={() => {
                setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
              }}
              className="bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
            >
              {isAmharic ? "ሁሉንም እንደተነበበ አድርግ" : "Mark all read"}
            </button>
          </div>

          <div className="space-y-3">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-4 rounded-xl border flex items-start space-x-3.5 transition-colors relative ${
                  notif.isRead 
                    ? "bg-slate-50/50 border-slate-100 text-slate-600" 
                    : "bg-red-50/30 border-red-100 text-slate-900 font-medium"
                }`}
              >
                {/* Alert Indicator circle */}
                {!notif.isRead && (
                  <span className="absolute left-1.5 top-1.5 w-2 h-2 rounded-full bg-red-600"></span>
                )}

                <div className={`p-2 rounded-lg shrink-0 ${
                  notif.type === "outside_geofence" ? "bg-amber-100 text-amber-700" :
                  notif.type === "verification_fail" ? "bg-red-100 text-red-700" :
                  notif.type === "late" ? "bg-amber-100 text-amber-700" :
                  notif.type === "overtime_limit" ? "bg-indigo-100 text-indigo-700" :
                  "bg-emerald-100 text-emerald-700"
                }`}>
                  {notif.type === "outside_geofence" || notif.type === "verification_fail" ? (
                    <AlertTriangle size={16} />
                  ) : (
                    <Bell size={16} />
                  )}
                </div>

                <div className="space-y-1 flex-grow">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs">{isAmharic ? notif.titleAm : notif.titleEn}</h4>
                    <span className="text-[10px] font-mono text-slate-400">{notif.timestamp}</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-600">
                    {isAmharic ? notif.messageAm : notif.messageEn}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: 4. SECURITY & RBAC AUDITS */}
      {activeTab === "security" && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="space-y-1">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 flex items-center space-x-2">
                <ShieldCheck className="text-emerald-600" size={16} />
                <span>{isAmharic ? "የደህንነት ኦዲት እና የባዮሜትሪክ መለያ መዝገብ" : "Security Auditing & Biometric Encryption Trails"}</span>
              </h3>
              <p className="text-[11px] text-slate-500">{isAmharic ? "እያንዳንዱ የመገኘት ተግባር የተጠቃሚውን አድራሻ፣ የስራ ሚና (RBAC) እና የተመሰጠረ መለያ ቁልፍ ይይዛል።" : "End-to-end cryptographic verification trail mapping user role authorization levels."}</p>
            </div>
            <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-3 py-1 rounded-lg flex items-center space-x-1">
              <Lock size={12} className="text-emerald-600" />
              <span>TLS 1.3 AES-256 Enabled</span>
            </div>
          </div>

          {/* RBAC ROLES PERMISSION GUIDE */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
            {[
              { role: "Head Office", level: "Tier 1", permissionsEn: "Full system control, salary approval, scheduling overview.", permissionsAm: "ሙሉ ቁጥጥር፣ የደመወዝ ማጽደቅ፣ የእቅድ ቁጥጥር" },
              { role: "Time Keeper", level: "Tier 2", permissionsEn: "Daily roster edits, verification bypass check-offs.", permissionsAm: "የዕለት መዝገብ ማስተካከል፣ የመገኘት ስህተት ማረም" },
              { role: "Supervisor", level: "Tier 3", permissionsEn: "Daily progress log visual approvals, defect reports.", permissionsAm: "የእለት ፓነል ቁጥጥር ፍቃድ፣ የጉድለት ማረጋገጫ" },
              { role: "Team Leader", level: "Tier 4", permissionsEn: "Gantt scheduler access, scaffolding crew logs.", permissionsAm: "የግንባታ ጊዜ እቅድ መርሃ-ግብር ማመንጨት" },
              { role: "Gang Chief", level: "Tier 5", permissionsEn: "Daily crew output, defect logger, toolbox talks.", permissionsAm: "የቡድን ፓነል ቁጥር ገጠማ መመዝገብ፣ ጉድለቶች ምዝገባ" }
            ].map((node, idx) => (
              <div key={idx} className="bg-white p-3 rounded-lg border border-slate-200/60 shadow-2xs space-y-1">
                <span className="font-bold text-slate-800 block text-[11px]">{node.role}</span>
                <span className="text-[9px] font-mono font-black text-red-600 uppercase tracking-wider">{node.level}</span>
                <p className="text-[10px] text-slate-500 leading-relaxed pt-1">
                  {isAmharic ? node.permissionsAm : node.permissionsEn}
                </p>
              </div>
            ))}
          </div>

          {/* CRYPTOGRAPHIC TRANSACTION LOGS */}
          <div className="space-y-4">
            <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider">🔒 Cryptographic Audit Transactions (SHA-256 verification hashes)</h4>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                    <th className="p-3">Log ID</th>
                    <th className="p-3">Execution Time</th>
                    <th className="p-3">Worker Name</th>
                    <th className="p-3">Acting User Device</th>
                    <th className="p-3">Action Completed</th>
                    <th className="p-3">Encrypted verification hash</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {syncLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-3 font-bold text-slate-600">{log.id}</td>
                      <td className="p-3 text-slate-500 text-[11px]">{log.timestamp}</td>
                      <td className="p-3 font-sans font-semibold text-slate-800">{log.workerName}</td>
                      <td className="p-3 font-sans text-slate-600">{log.device}</td>
                      <td className="p-3 font-sans">
                        <span className="bg-slate-100 text-slate-800 font-bold px-2.5 py-0.5 rounded text-[10px]">
                          {log.type}
                        </span>
                      </td>
                      <td className="p-3 text-emerald-600 font-bold text-[11px]">{log.hash}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
