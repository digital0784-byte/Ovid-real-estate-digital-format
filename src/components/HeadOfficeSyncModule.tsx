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
  HelpCircle
} from "lucide-react";
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
  const [activeTab, setActiveTab] = useState<"dashboard" | "database" | "notifications" | "security">("dashboard");
  const [searchTerm, setSearchTerm] = useState("");

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
      messageEn: "Worker Bekele Tesfaye attempted Check-In 120m outside the authorized OVID Heights Site. Blocked.",
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
      messageEn: "Multiple fingerprint recognition failures (3 times) on Scanner OVID-PAD-03.",
      messageAm: "በመለያ ቁጥር OVID-PAD-03 ላይ የጣት አሻራ መለያ 3 ጊዜ በተደጋጋሚ አልተሳካም።",
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
  const projectList = ["All Projects", "OVID Bole Heights", "OVID Ayat Project", "OVID CMC Sector", "OVID Lebu site"];
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
      deviceUsed: "OVID-BIO-PAD-03",
      verifiedBy: currentUserRole,
      gpsLocationString: isAmharic ? "ቦሌ ሃይትስ ግንባታ ቦታ" : "OVID Bole Heights Site"
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
      ? `${worker.name} logged CHECK-IN at ${formattedTime}. Checked and verified by OVID Central Database.`
      : `${worker.name} logged CHECK-OUT at ${formattedTime}. Hours: ${workingHours + overtime}h (Overtime: ${overtime}h). Verified.`;

    const msgAm = mode === "check-in"
      ? `ሰራተኛ ${worker.name} በ${formattedTime} መግባቱን አስመዝግቧል። በኦቪድ ማዕከላዊ የደመና ዳታቤዝ ተረጋግጧል።`
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
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
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
  const filteredAttendance = useMemo(() => {
    return attendance.filter(a => {
      const worker = workers.find(w => w.id === a.workerId);
      if (!worker) return true;

      const projectMatch = selectedProject === "All Projects" || (worker.assignedProject && worker.assignedProject === selectedProject) || (selectedProject === "OVID Bole Heights" && (!worker.assignedProject || worker.assignedProject === "OVID Bole Heights"));
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
      const projectMatch = selectedProject === "All Projects" || w.assignedProject === selectedProject || (selectedProject === "OVID Bole Heights" && !w.assignedProject);
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
                ? "በኦቪድ ሪል እስቴት ግንባታ ሳይቶች መካከል የሚደረግ የባዮሜትሪክ የጣት አሻራ መገኘት፣ የጂፒኤስ ማረጋገጫ፣ የትርፍ ሰዓት ስሌት እና የቀጥታ ዳታቤዝ ማመሳሰያ የቁጥጥር ሰሌዳ።"
                : "Real-time synchronization bridge coupling high-performance biometrics with OVID head office reporting. Aggregates multi-project workforce distribution, handles decentralized geofenced client buffers, and executes instant hours compilation."}
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
                        { name: "OVID Bole Heights", rate: attendancePercentage, count: presentTodayCount },
                        { name: "OVID Ayat Project", rate: 88, count: 12 },
                        { name: "OVID CMC Sector", rate: 75, count: 8 },
                        { name: "OVID Lebu site", rate: 92, count: 11 }
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
              <p className="text-slate-300">// Verified active synchronization across all mobile endpoints (OVID_B1_PAD_03, HEAD_OFFICE, TIME_KEEPER_TAB)</p>
              <div className="grid grid-cols-3 gap-4 text-[11px]">
                <div>&gt; COLLECTION: <span className="text-white">"ovid_biometric_attendance"</span></div>
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
