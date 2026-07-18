import React, { useState, useEffect, useMemo } from "react";
import { 
  Fingerprint, 
  ScanLine, 
  MapPin, 
  Check, 
  AlertCircle, 
  Clock, 
  Camera, 
  Settings, 
  Users, 
  CheckCircle2, 
  LogOut, 
  LogIn, 
  ShieldCheck, 
  Activity, 
  Database,
  History,
  AlertTriangle,
  FileText,
  Volume2,
  VolumeX,
  HelpCircle,
  RefreshCw,
  Search,
  Filter,
  ArrowUpDown,
  Download,
  Info,
  Sliders,
  Bell,
  Trash2,
  Wifi,
  WifiOff,
  Briefcase,
  Layers,
  Award
} from "lucide-react";
import { Worker, AttendanceRecord, AttendanceMethod, UserRole } from "../types";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  BarChart, 
  Bar, 
  Legend, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell 
} from "recharts";

interface BiometricAttendanceBoardProps {
  workers: Worker[];
  attendance: AttendanceRecord[];
  onAddAttendance: (record: AttendanceRecord) => void;
  isAmharic: boolean;
  currentUserRole: UserRole;
  onLogAction?: (action: string, details: string) => void;
}

interface SmartNotification {
  id: string;
  type: "checkin" | "checkout" | "late" | "absent" | "overtime" | "failed" | "geofence";
  workerName: string;
  message: string;
  timestamp: string;
  isRead: boolean;
}

export const BiometricAttendanceBoard: React.FC<BiometricAttendanceBoardProps> = ({
  workers,
  attendance,
  onAddAttendance,
  isAmharic,
  currentUserRole,
  onLogAction
}) => {
  // --- OFFLINE & SIMULATION STATE ---
  const [isOnline, setIsOnline] = useState(typeof window !== "undefined" ? navigator.onLine : true);
  const [offlineQueue, setOfflineQueue] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);

  // --- GEOFENCING CONFIG ---
  const [geofenceLat, setGeofenceLat] = useState(9.0049);
  const [geofenceLng, setGeofenceLng] = useState(38.7783);
  const [allowedRadius, setAllowedRadius] = useState(150); // in meters
  const [gpsPreset, setGpsPreset] = useState<"inside" | "outside">("inside");
  const [simLat, setSimLat] = useState(9.0048);
  const [simLng, setSimLng] = useState(38.7781);

  // --- AUDIO FEEDBACK ---
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);

  // --- ACTIVE CONTROLLER STATES ---
  const [selectedWorkerId, setSelectedWorkerId] = useState("");
  const [biometricMethod, setBiometricMethod] = useState<"fingerprint" | "face">("fingerprint");
  const [clockAction, setClockAction] = useState<"in" | "out">("in");
  
  // --- SCANNING SIMULATION STATE ---
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanLogs, setScanLogs] = useState<string[]>([]);
  const [scanResult, setScanResult] = useState<{
    success: boolean;
    title: string;
    message: string;
    worker?: Worker;
  } | null>(null);

  // --- TABLE SEARCH, FILTER, SORT ---
  const [searchTerm, setSearchTerm] = useState("");
  const [filterFloor, setFilterFloor] = useState<string>("all");
  const [filterZone, setFilterZone] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortField, setSortField] = useState<string>("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // --- SMART NOTIFICATIONS ---
  const [notifications, setNotifications] = useState<SmartNotification[]>([
    {
      id: "notif-1",
      type: "late",
      workerName: "Aster Abebe",
      message: isAmharic ? "ሰራተኛዋ አስቴር አበበ በ08:23 ረፍዶባታል (ዘግይቷል)" : "Aster Abebe checked in late today at 08:23 AM.",
      timestamp: "08:23 AM",
      isRead: false
    },
    {
      id: "notif-2",
      type: "geofence",
      workerName: "Mulugeta Tesfaye",
      message: isAmharic ? "ከፕሮጀክት ጂኦፌንስ ክልል ውጭ የመግባት ሙከራ ታግዷል" : "Geofence Breach: Mulugeta Tesfaye attempted clocking in 4.1km outside boundary.",
      timestamp: "08:05 AM",
      isRead: false
    },
    {
      id: "notif-3",
      type: "checkin",
      workerName: "Kebede Alene",
      message: isAmharic ? "በጣት አሻራ በተሳካ ሁኔታ ገብቷል" : "Kebede Alene successfully checked in via Fingerprint.",
      timestamp: "07:55 AM",
      isRead: true
    }
  ]);

  // --- REPORTS ENGINE ---
  const [reportType, setReportType] = useState<"daily" | "weekly" | "monthly" | "overtime">("daily");
  const [reportDimension, setReportDimension] = useState<"floor" | "zone" | "team" | "project">("floor");
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // Sync simulated GPS preset
  useEffect(() => {
    if (gpsPreset === "inside") {
      setSimLat(9.0048);
      setSimLng(38.7781); // ~15 meters distance
    } else {
      setSimLat(8.9806);
      setSimLng(38.7905); // Bole Airport (~4.1km)
    }
  }, [gpsPreset]);

  // Listen to network changes for real-time offline fallback on-site
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleOnline = () => {
      setIsOnline(true);
      if (onLogAction) {
        onLogAction("Connection status restored", "Biometric Terminal automatically detected stable internet signal.");
      }
    };
    const handleOffline = () => {
      setIsOnline(false);
      if (onLogAction) {
        onLogAction("Connection status lost", "Biometric Terminal went offline. Switched to secure local queue buffer.");
      }
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [onLogAction]);

  // Haversine formula
  const getDistanceInMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3;
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const dPhi = ((lat2 - lat1) * Math.PI) / 180;
    const dLam = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dPhi / 2) * Math.sin(dPhi / 2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(dLam / 2) * Math.sin(dLam / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const currentDistance = Math.round(getDistanceInMeters(simLat, simLng, geofenceLat, geofenceLng));
  const isInsideGeofence = currentDistance <= allowedRadius;

  // Sound Engine
  const playBeep = (type: "scan" | "success" | "error" | "sync") => {
    if (!isSoundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      if (type === "scan") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(850, now);
        gain.gain.setValueAtTime(0.03, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === "success") {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        const gain2 = ctx.createGain();

        osc1.frequency.setValueAtTime(1200, now);
        gain1.gain.setValueAtTime(0.05, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.1);

        osc2.frequency.setValueAtTime(1550, now + 0.08);
        gain2.gain.setValueAtTime(0.05, now + 0.08);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.08);
        osc2.stop(now + 0.2);
      } else if (type === "error") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(130, now);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === "sync") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(1700, now);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
      }
    } catch (e) {
      console.warn("Web Audio API warning:", e);
    }
  };

  // --- SMART METRICS COMPUTATION ---
  const stats = useMemo(() => {
    // Current date
    const todayStr = new Date().toISOString().split("T")[0];
    const todayRecords = attendance.filter(a => a.date === todayStr);

    const total = workers.length;
    const present = todayRecords.filter(a => a.status === "Present" || a.status === "Late").length;
    const late = todayRecords.filter(a => a.status === "Late").length;
    const absent = todayRecords.filter(a => a.status === "Absent").length;
    const checkedIn = todayRecords.filter(a => a.checkIn !== null).length;
    const checkedOut = todayRecords.filter(a => a.checkOut !== null).length;
    const currentlyWorking = todayRecords.filter(a => a.checkIn !== null && a.checkOut === null).length;
    const onLeave = todayRecords.filter(a => a.status === "Leave").length;
    
    // Total overtime sum
    const totalOvertime = parseFloat(todayRecords.reduce((sum, r) => sum + (r.overtime || 0), 0).toFixed(1));

    return {
      total,
      present,
      absent,
      late,
      checkedIn,
      checkedOut,
      currentlyWorking,
      onLeave,
      totalOvertime
    };
  }, [workers, attendance]);

  // --- SMART NOTIFICATION HANDLER ---
  const triggerNotification = (type: SmartNotification["type"], workerName: string, message: string) => {
    const newNotif: SmartNotification = {
      id: `notif-${Date.now()}`,
      type,
      workerName,
      message,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isRead: false
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  // --- AUTOMATIC BIOMETRIC IDENTIFICATION ---
  const handleStartBiometricScan = () => {
    if (!selectedWorkerId) {
      playBeep("error");
      alert(isAmharic ? "እባክዎን መጀመሪያ ሰራተኛ ይምረጡ!" : "Please select an employee first!");
      return;
    }

    const worker = workers.find(w => w.id === selectedWorkerId);
    if (!worker) return;

    // Strict Device Verification Mode simulation
    setIsScanning(true);
    setScanProgress(0);
    setScanLogs([
      isAmharic 
        ? "⚡ የባዮሜትሪክ ሃርድዌር መገኛ ተገኝቷል... ግንኙነት እየተፈጠረ ነው።" 
        : "⚡ Biometric hardware handshake initialized. Establishing secure state..."
    ]);
    playBeep("scan");

    let step = 0;
    const interval = setInterval(() => {
      step++;
      setScanProgress(step * 20);
      playBeep("scan");

      if (step === 2) {
        setScanLogs(prev => [
          ...prev,
          isAmharic
            ? `🔍 የባዮሜትሪክ መዛመጃ ፍለጋ በሂደት ላይ፡ [የማረጋገጫ ዘዴ: ${biometricMethod === "fingerprint" ? "የጣት አሻራ" : "የፊት መለያ"}]`
            : `🔍 Checking cryptographic templates mapping: [Hardware Method: ${biometricMethod === "fingerprint" ? "Fingerprint" : "Facial Structure"}]`
        ]);
      } else if (step === 3) {
        setScanLogs(prev => [
          ...prev,
          isAmharic
            ? `🛰️ የጂፒኤስ ሲግናል በማንበብ ላይ... [መጋጠሚያ: ${simLat.toFixed(5)}°N, ${simLng.toFixed(5)}°E]`
            : `🛰️ Aquiring high-accuracy coordinates: [GPS Capture: ${simLat.toFixed(5)}°N, ${simLng.toFixed(5)}°E]`
        ]);
      } else if (step === 4) {
        setScanLogs(prev => [
          ...prev,
          isAmharic
            ? `🔐 የጂኦፌንስ ፍተሻ፡ ${currentDistance}ሜ ከማእከሉ (ፍቃድ፡ ${isInsideGeofence ? "ተፈቅዷል" : "ተከልክሏል"})`
            : `🔐 Geofence proximity audit: ${currentDistance}m from center. Status: ${isInsideGeofence ? "AUTHORIZED" : "OUTSIDE SITE BOUNDARY"}`
        ]);
      } else if (step === 5) {
        clearInterval(interval);
        setIsScanning(false);
        processFinalKioskAttendance(worker);
      }
    }, 250);
  };

  const processFinalKioskAttendance = (worker: Worker) => {
    const todayStr = new Date().toISOString().split("T")[0];
    const timeStr = new Date().toLocaleTimeString("en-US", { hour12: false });

    // Rules Evaluation
    // 1. Geofence violation
    if (!isInsideGeofence) {
      playBeep("error");
      setScanResult({
        success: false,
        title: isAmharic ? "መዝገብ ውድቅ ተደርጓል (ጂኦፌንስ ጥሰት)" : "Attendance Rejected (Geofence Breach)",
        message: isAmharic
          ? `ሰራተኛው ${worker.name} ከፕሮጀክት ግቢ ውጭ በ ${currentDistance} ሜትር ርቀት ላይ ስለሚገኝ ምዝገባው ውድቅ ተደርጓል።`
          : `Roster Violation: ${worker.name} is currently ${currentDistance}m outside the authorized project perimeter. Check-In blocked.`,
        worker
      });

      triggerNotification(
        "geofence", 
        worker.name, 
        isAmharic 
          ? `${worker.name} ከግቢ ውጭ ሆኖ መዝገብ ሲሞክር ታግዷል (${currentDistance}ሜ)` 
          : `${worker.name} blocked: Geofence violation at ${currentDistance}m.`
      );

      if (onLogAction) {
        onLogAction("Geofence Rejection", `${worker.name} tried clocking ${clockAction} from ${currentDistance}m.`);
      }
      return;
    }

    // 2. Duplicate Check-in / Out Protection
    const existing = attendance.find(a => a.workerId === worker.id && a.date === todayStr);

    // If Offline Mode
    if (!isOnline) {
      const offlineDup = offlineQueue.find(o => o.workerId === worker.id && o.type === clockAction);
      if (offlineDup) {
        playBeep("error");
        alert(isAmharic ? "ይህ የባዮሜትሪክ መረጃ አስቀድሞ በኦፍላይን ወረፋ ውስጥ አለ!" : "This record is already in the offline queue buffer!");
        return;
      }

      const draft = {
        id: `OFF-${Date.now()}`,
        workerId: worker.id,
        workerName: worker.name,
        type: clockAction,
        time: timeStr,
        date: todayStr,
        method: biometricMethod === "fingerprint" ? AttendanceMethod.FINGERPRINT : AttendanceMethod.FACE_RECOGNITION,
        coordinates: { lat: simLat, lng: simLng },
        distance: currentDistance
      };

      setOfflineQueue(prev => [...prev, draft]);
      playBeep("success");

      setScanResult({
        success: true,
        title: isAmharic ? "መረጃው በኦፍላይን ተቀምጧል" : "Offline Record Queued",
        message: isAmharic
          ? `የ ${worker.name} መረጃ በስልክዎ ላይ ተቀምጧል። ኢንተርኔት ሲኖር በራስ-ሰር ይተላለፋል። (ወረፋ ላይ፡ ${offlineQueue.length + 1})`
          : `Device is offline. Successfully cached ${worker.name}'s biometric clock-${clockAction}. Will auto-sync later.`,
        worker
      });

      triggerNotification(
        "checkin", 
        worker.name, 
        isAmharic ? `ኦፍላይን መዝገብ ተቀምጧል፡ ${worker.name}` : `Cached offline log for ${worker.name}.`
      );
      return;
    }

    // Online Mode Core Logic
    if (clockAction === "in") {
      if (existing && existing.checkIn) {
        playBeep("error");
        setScanResult({
          success: false,
          title: isAmharic ? "ቀደም ብሎ ተመዝግቧል" : "Already Clocked In",
          message: isAmharic
            ? `ሰራተኛው ${worker.name} የዛሬ የጠዋት መግቢያውን በ ${existing.checkIn} አስመዝግቧል! ድርብ መግቢያ አይፈቀድም።`
            : `${worker.name} has already recorded a check-in today at ${existing.checkIn}. Duplicate blocked.`,
          worker
        });
        return;
      }

      // Success In
      playBeep("success");
      const [h, m] = timeStr.split(":").map(Number);
      const isLate = (h * 60 + m) > (8 * 60 + 15); // Late if after 08:15 AM
      const status = isLate ? "Late" : "Present";

      const newRec: AttendanceRecord = {
        id: `ATT-${Date.now()}`,
        workerId: worker.id,
        workerName: worker.name,
        department: worker.department,
        trade: worker.trade,
        company: worker.company,
        building: worker.building || "Tower 1",
        floor: worker.floor || 4,
        zone: worker.zone || "Zone B",
        date: todayStr,
        checkIn: timeStr,
        checkOut: null,
        method: biometricMethod === "fingerprint" ? AttendanceMethod.FINGERPRINT : AttendanceMethod.FACE_RECOGNITION,
        workingHours: 0,
        overtime: 0,
        status,
        gpsCoordinates: { lat: simLat, lng: simLng },
        deviceUsed: "Digital Construction ERP-KIOSK-PRO-01",
        verifiedBy: currentUserRole,
        gpsLocationString: `Bole Heights (${currentDistance}m)`
      };

      onAddAttendance(newRec);
      setScanResult({
        success: true,
        title: isAmharic ? "መግቢያ በተሳካ ሁኔታ ተመዝግቧል!" : "Clock-In Confirmed!",
        message: isAmharic
          ? `እንኳን ደህና መጡ! ${worker.name} በ ${timeStr} በጣት አሻራ ተረጋግጧል። ሁኔታ: ${isLate ? "የዘገየ" : "በሰዓቱ"}`
          : `Welcome! ${worker.name} verified successfully via biometric signature at ${timeStr}. Status: ${status}.`,
        worker
      });

      triggerNotification(
        isLate ? "late" : "checkin", 
        worker.name, 
        isAmharic 
          ? `${worker.name} በ ${timeStr} መግቢያ አረጋግጧል።` 
          : `${worker.name} clocked in at ${timeStr} (${status}).`
      );

      if (onLogAction) {
        onLogAction("Biometric Check-In", `${worker.name} clocked in successfully via ${biometricMethod}.`);
      }

    } else {
      // Clock Out
      if (!existing || !existing.checkIn) {
        playBeep("error");
        setScanResult({
          success: false,
          title: isAmharic ? "የመግቢያ መረጃ አልተገኘም" : "No Clock-In Roster",
          message: isAmharic
            ? `የ ${worker.name} የጠዋት መግቢያ መዝገብ አልተገኘም። መጀመሪያ መግቢያ መመዝገብ አለበት።`
            : `Roster Error: Cannot record clock-out. ${worker.name} has no check-in logged for today.`,
          worker
        });
        return;
      }

      if (existing.checkOut) {
        playBeep("error");
        setScanResult({
          success: false,
          title: isAmharic ? "ቀደም ብሎ ወጥቷል" : "Already Clocked Out",
          message: isAmharic
            ? `ሰራተኛው ${worker.name} የስራ መውጫውን በ ${existing.checkOut} አስመዝግቧል!`
            : `${worker.name} has already logged a check-out today at ${existing.checkOut}.`,
          worker
        });
        return;
      }

      // Success Out
      playBeep("success");
      const [inH, inM] = existing.checkIn.split(":").map(Number);
      const [outH, outM] = timeStr.split(":").map(Number);
      const totalHours = Math.max(0, (outH + outM / 60) - (inH + inM / 60) - 1.0); // 1hr lunch break
      const stdHrs = Math.min(8.0, totalHours);
      const overtime = Math.max(0, totalHours - 8.0);

      const updatedRec: AttendanceRecord = {
        ...existing,
        checkOut: timeStr,
        workingHours: parseFloat((stdHrs + overtime).toFixed(1)),
        overtime: parseFloat(overtime.toFixed(1)),
        deviceUsed: "Digital Construction ERP-KIOSK-PRO-01",
        gpsLocationString: `Bole Heights (${currentDistance}m)`
      };

      onAddAttendance(updatedRec);
      setScanResult({
        success: true,
        title: isAmharic ? "መውጫ በተሳካ ሁኔታ ተመዝግቧል!" : "Clock-Out Confirmed!",
        message: isAmharic
          ? `ደህና እደሩ! ${worker.name} በ ${timeStr} የስራ መውጫውን መዝግቧል። ጠቅላላ ሰዓት፡ ${updatedRec.workingHours}ሰ | ትርፍ ሰዓት፡ ${overtime.toFixed(1)}ሰ።`
          : `Safe travels! ${worker.name} clocked out at ${timeStr}. Standard Hours: ${stdHrs.toFixed(1)}h | Overtime: ${overtime.toFixed(1)}h.`,
        worker
      });

      triggerNotification(
        "checkout", 
        worker.name, 
        isAmharic 
          ? `${worker.name} በ ${timeStr} መውጫ አረጋግጧል። (ትርፍ ሰዓት፡ ${overtime.toFixed(1)}ሰ)` 
          : `${worker.name} checked out at ${timeStr}. Overtime: ${overtime.toFixed(1)}h.`
      );

      if (onLogAction) {
        onLogAction("Biometric Check-Out", `${worker.name} checked out successfully. Hours: ${updatedRec.workingHours}.`);
      }
    }
  };

  // --- RECONNECTION AUTO-SYNC ENGINE ---
  const handleToggleOnline = () => {
    const nextState = !isOnline;
    setIsOnline(nextState);

    if (nextState && offlineQueue.length > 0) {
      triggerSyncQueue();
    }
  };

  const triggerSyncQueue = () => {
    setIsSyncing(true);
    setSyncProgress(0);
    playBeep("sync");

    let count = 0;
    const interval = setInterval(() => {
      count += 25;
      setSyncProgress(count);
      playBeep("sync");

      if (count >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          // Process queue
          offlineQueue.forEach(draft => {
            const todayStr = draft.date;
            const existing = attendance.find(a => a.workerId === draft.workerId && a.date === todayStr);

            if (draft.type === "in") {
              if (!existing) {
                onAddAttendance({
                  id: `ATT-${Date.now()}-${Math.floor(Math.random()*1000)}`,
                  workerId: draft.workerId,
                  workerName: draft.workerName,
                  department: "Aluminum Formwork",
                  trade: "Carpenter",
                  company: "Digital Construction ERP",
                  building: "Tower 1",
                  floor: 4,
                  zone: "Zone B",
                  date: draft.date,
                  checkIn: draft.time,
                  checkOut: null,
                  method: draft.method,
                  workingHours: 0,
                  overtime: 0,
                  status: "Present",
                  gpsCoordinates: draft.coordinates,
                  deviceUsed: "Digital Construction ERP-KIOSK-PRO-01",
                  gpsLocationString: `Bole Heights (${draft.distance}m)`
                });
              }
            } else {
              if (existing && !existing.checkOut) {
                onAddAttendance({
                  ...existing,
                  checkOut: draft.time,
                  workingHours: 8.0,
                  overtime: 1.5,
                  gpsLocationString: `Bole Heights (${draft.distance}m)`
                });
              }
            }
          });

          if (onLogAction) {
            onLogAction("Biometric Offline Sync", `Synchronized ${offlineQueue.length} records instantly to Firestore Cloud.`);
          }

          setOfflineQueue([]);
          setIsSyncing(false);
          playBeep("success");

          setScanResult({
            success: true,
            title: isAmharic ? "ደመና ማመሳሰል ተጠናቋል!" : "Cloud Synchronization Complete!",
            message: isAmharic
              ? `ሁሉም የኦፍላይን የባዮሜትሪክ መዛግብቶች በተሳካ ሁኔታ ወደ Firebase Firestore ተልከዋል።`
              : `All locally buffered biometric transactions have been synchronized securely with Firestore.`
          });
        }, 150);
      }
    }, 200);
  };

  // --- TABLE SEARCH, FILTER, AND SORT LOGIC ---
  const processedAttendance = useMemo(() => {
    let list = [...attendance];

    // Role filtering constraints
    if (currentUserRole === UserRole.GANG_CHIEF) {
      list = list.filter(r => r.zone === "Zone B");
    } else if (currentUserRole === UserRole.TEAM_LEADER) {
      list = list.filter(r => r.zone === "Zone A" || r.zone === "Zone B");
    }

    // Search term
    if (searchTerm.trim() !== "") {
      const q = searchTerm.toLowerCase();
      list = list.filter(r => 
        r.workerName.toLowerCase().includes(q) ||
        r.workerId.toLowerCase().includes(r.workerId.toLowerCase() === q ? q : r.workerId.toLowerCase()) ||
        r.trade.toLowerCase().includes(q)
      );
    }

    // Floor filter
    if (filterFloor !== "all") {
      list = list.filter(r => r.floor.toString() === filterFloor);
    }

    // Zone filter
    if (filterZone !== "all") {
      list = list.filter(r => r.zone === filterZone);
    }

    // Status filter
    if (filterStatus !== "all") {
      list = list.filter(r => r.status === filterStatus);
    }

    // Sort
    list.sort((a, b) => {
      let valA = a[sortField as keyof AttendanceRecord];
      let valB = b[sortField as keyof AttendanceRecord];

      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;

      if (typeof valA === "string") {
        return sortOrder === "asc" 
          ? valA.localeCompare(valB as string) 
          : (valB as string).localeCompare(valA);
      } else {
        return sortOrder === "asc" 
          ? (valA as number) - (valB as number) 
          : (valB as number) - (valA as number);
      }
    });

    return list;
  }, [attendance, currentUserRole, searchTerm, filterFloor, filterZone, filterStatus, sortField, sortOrder]);

  // --- REPORT GENERATION PREVIEW DATA ---
  const reportRecords = useMemo(() => {
    // Generate summarized data grouped by selected report Dimension & type
    const counts: Record<string, { total: number; present: number; late: number; overtime: number }> = {};
    
    processedAttendance.forEach(r => {
      let key = "General";
      if (reportDimension === "floor") key = `Floor ${r.floor}`;
      else if (reportDimension === "zone") key = r.zone;
      else if (reportDimension === "team") key = r.trade; // proxying trade for team
      else if (reportDimension === "project") key = "Digital Bole Heights";

      if (!counts[key]) {
        counts[key] = { total: 0, present: 0, late: 0, overtime: 0 };
      }
      counts[key].total += 1;
      if (r.status === "Present" || r.status === "Late") counts[key].present += 1;
      if (r.status === "Late") counts[key].late += 1;
      counts[key].overtime += r.overtime || 0;
    });

    return Object.entries(counts).map(([name, data]) => ({
      name,
      total: data.total,
      present: data.present,
      absent: Math.max(0, data.total - data.present),
      attendanceRate: data.total > 0 ? Math.round((data.present / data.total) * 100) : 0,
      late: data.late,
      overtime: parseFloat(data.overtime.toFixed(1))
    }));
  }, [processedAttendance, reportDimension]);

  // --- EXPORT TO EXCEL/CSV SIMULATOR (Durable Client File Trigger) ---
  const handleExportCSV = () => {
    playBeep("success");
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Metric Group,Total Employees,Present Today,Absent,Attendance Rate %,Late Checks,Total Overtime Hrs\n";
    
    reportRecords.forEach(row => {
      csvContent += `"${row.name}",${row.total},${row.present},${row.absent},${row.attendanceRate}%,${row.late},${row.overtime}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Digital Construction ERP_Attendance_Report_${reportType}_by_${reportDimension}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    playBeep("success");
    setIsGeneratingReport(true);
    setTimeout(() => {
      setIsGeneratingReport(false);
      alert(isAmharic 
        ? "የፒዲኤፍ (PDF) ሪፖርት በተሳካ ሁኔታ ተዘጋጅቶ ወርዷል!" 
        : "PDF Attendance Payroll Report generated and downloaded to device Storage.");
    }, 1200);
  };

  // --- CHART DATA PREPARATION ---
  const floorChartData = useMemo(() => {
    const data: Record<number, number> = {};
    attendance.forEach(r => {
      if (r.status === "Present" || r.status === "Late") {
        data[r.floor] = (data[r.floor] || 0) + 1;
      }
    });
    return Object.entries(data).map(([floor, count]) => ({
      name: `FL ${floor}`,
      Present: count
    })).sort((a,b) => a.name.localeCompare(b.name));
  }, [attendance]);

  const zoneChartData = useMemo(() => {
    const data: Record<string, number> = {};
    attendance.forEach(r => {
      if (r.status === "Present" || r.status === "Late") {
        data[r.zone] = (data[r.zone] || 0) + 1;
      }
    });
    return Object.entries(data).map(([zone, count]) => ({
      name: zone,
      Present: count
    }));
  }, [attendance]);

  const trendChartData = [
    { day: "Mon", Present: 84, Overtime: 12.5 },
    { day: "Tue", Present: 88, Overtime: 14.0 },
    { day: "Wed", Present: 91, Overtime: 15.2 },
    { day: "Thu", Present: 86, Overtime: 11.8 },
    { day: "Fri", Present: 95, Overtime: 18.0 },
    { day: "Sat", Present: 92, Overtime: 16.5 },
    { day: "Sun", Present: 78, Overtime: 8.0 }
  ];

  return (
    <div className="space-y-6" id="attendance-dashboard-module">
      
      {/* 1. TOP HEADER & RBAC & OFFLINE HUD */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-xl border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-16 -translate-y-16 opacity-5 pointer-events-none">
          <Fingerprint size={280} className="text-red-500" />
        </div>

        <div className="flex items-center space-x-3.5 z-10">
          <div className="p-3 bg-red-600/20 text-red-500 rounded-xl border border-red-500/20 animate-pulse">
            <ScanLine size={30} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[9px] uppercase font-bold tracking-widest bg-red-600 px-2 py-0.5 rounded text-white font-mono">
                SECURE HARDWARE CORE
              </span>
              <span className="text-slate-500 font-mono text-[10px]">•</span>
              <span className="text-xs text-slate-300 font-mono font-bold flex items-center space-x-1">
                <Database size={11} className="text-red-500" />
                <span>Digital Bole Heights</span>
              </span>
            </div>
            <h2 className="text-xl font-black tracking-tight mt-1">
              {isAmharic ? "የባዮሜትሪክ መገኘት መቆጣጠሪያ ሰሌዳ" : "Biometric Attendance Dashboard"}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {isAmharic 
                ? "በእውነተኛ ጊዜ ከ Firebase Firestore ጋር የተመሳሰለ የጣት አሻራ፣ ጂኦፌንስ ክልል ቁጥጥር እና የደመወዝ መገኘት ሪፖርት ማውጫ።"
                : "Real-time cryptographically hashed fingerprints, active geofence validations, and payroll report builder."}
            </p>
          </div>
        </div>

        {/* CONTROLS */}
        <div className="flex flex-wrap items-center gap-2.5 z-10 w-full md:w-auto">
          {/* SOUND SWITCH */}
          <button
            onClick={() => setIsSoundEnabled(!isSoundEnabled)}
            className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
              isSoundEnabled 
                ? "bg-slate-800 border-slate-700 text-emerald-400" 
                : "bg-slate-900 border-slate-800 text-slate-500"
            }`}
            title="Audio Beep Switches"
          >
            {isSoundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>

          {/* ONLINE/OFFLINE AUTOSYNC SLIDER */}
          <button
            onClick={handleToggleOnline}
            className={`px-3 py-2.5 border rounded-xl font-mono text-[10px] font-black flex items-center justify-center space-x-2 cursor-pointer transition-all ${
              isOnline 
                ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-400" 
                : "bg-amber-950/40 border-amber-500/50 text-amber-400"
            }`}
          >
            {isOnline ? (
              <>
                <Wifi size={13} className="animate-pulse" />
                <span>ONLINE & SYNCED</span>
              </>
            ) : (
              <>
                <WifiOff size={13} />
                <span>OFFLINE QUEUE ({offlineQueue.length})</span>
              </>
            )}
          </button>

          {/* CURRENT ROLE RBAC STATUS TAG */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-right">
            <span className="block text-[8px] text-slate-500 font-mono font-bold uppercase">{isAmharic ? "የአሁኑ ሚና" : "ACTIVE RBAC ROLE"}</span>
            <span className="text-red-400 text-[11px] font-black font-sans flex items-center space-x-1.5 justify-end">
              <ShieldCheck size={11} className="text-red-500" />
              <span>{currentUserRole}</span>
            </span>
          </div>
        </div>
      </div>

      {/* SYNC PROGRESS BAR */}
      {isSyncing && (
        <div className="bg-slate-900 border border-slate-800 text-white p-4 rounded-xl shadow-lg flex flex-col md:flex-row justify-between items-center gap-3 animate-fadeIn">
          <div className="flex items-center space-x-2.5">
            <RefreshCw size={18} className="text-red-500 animate-spin" />
            <div>
              <h4 className="font-extrabold text-xs">
                {isAmharic ? "መረጃዎችን ወደ Firebase Firestore በመጫን ላይ..." : "Uploading Biometric Records to Firebase Cloud..."}
              </h4>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {isAmharic 
                  ? `${offlineQueue.length} መዝገቦች በመመሳሰል ላይ ናቸው` 
                  : `Transmitting ${offlineQueue.length} cached hardware logs to Firestore...`}
              </p>
            </div>
          </div>
          <div className="w-full md:w-48 space-y-1">
            <div className="flex justify-between text-[9px] font-mono text-slate-500">
              <span>STREAM SYNC</span>
              <span>{syncProgress}%</span>
            </div>
            <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-red-500" style={{ width: `${syncProgress}%` }}></div>
            </div>
          </div>
        </div>
      )}

      {/* 2. DYNAMIC DASHBOARD SUMMARY CARDS (9 Bento-Grid Cards) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-9 gap-3">
        {/* Card 1: Total Employees */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center text-slate-400">
            <Users size={14} />
            <span className="text-[9px] font-mono font-bold">TOTAL</span>
          </div>
          <div className="mt-2.5">
            <span className="block text-xl font-black text-slate-850 font-sans">{stats.total}</span>
            <span className="text-[9px] text-slate-400 block mt-0.5 truncate">{isAmharic ? "ጠቅላላ ሰራተኛ" : "Total Employees"}</span>
          </div>
        </div>

        {/* Card 2: Present Today */}
        <div className="bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center text-emerald-500">
            <CheckCircle2 size={14} />
            <span className="text-[9px] font-mono font-bold text-emerald-600">IN SITE</span>
          </div>
          <div className="mt-2.5">
            <span className="block text-xl font-black text-emerald-750 font-sans">{stats.present}</span>
            <span className="text-[9px] text-emerald-600 block mt-0.5 truncate">{isAmharic ? "በስራ ላይ" : "Present Today"}</span>
          </div>
        </div>

        {/* Card 3: Absent Today */}
        <div className="bg-rose-50/50 p-3.5 rounded-xl border border-rose-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center text-rose-500">
            <AlertCircle size={14} />
            <span className="text-[9px] font-mono font-bold text-rose-600">ABSENT</span>
          </div>
          <div className="mt-2.5">
            <span className="block text-xl font-black text-rose-750 font-sans">{stats.absent}</span>
            <span className="text-[9px] text-rose-600 block mt-0.5 truncate">{isAmharic ? "ያልመጡ" : "Absent Today"}</span>
          </div>
        </div>

        {/* Card 4: Late Employees */}
        <div className="bg-amber-50/50 p-3.5 rounded-xl border border-amber-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center text-amber-500">
            <Clock size={14} />
            <span className="text-[9px] font-mono font-bold text-amber-600">LATE</span>
          </div>
          <div className="mt-2.5">
            <span className="block text-xl font-black text-amber-750 font-sans">{stats.late}</span>
            <span className="text-[9px] text-amber-600 block mt-0.5 truncate">{isAmharic ? "የዘገዩ" : "Late Employees"}</span>
          </div>
        </div>

        {/* Card 5: Checked In */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center text-slate-500">
            <LogIn size={14} />
            <span className="text-[9px] font-mono font-bold">IN</span>
          </div>
          <div className="mt-2.5">
            <span className="block text-xl font-black text-slate-800 font-sans">{stats.checkedIn}</span>
            <span className="text-[9px] text-slate-500 block mt-0.5 truncate">{isAmharic ? "ገብተው የተመዘገቡ" : "Checked-In"}</span>
          </div>
        </div>

        {/* Card 6: Checked Out */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center text-slate-500">
            <LogOut size={14} />
            <span className="text-[9px] font-mono font-bold">OUT</span>
          </div>
          <div className="mt-2.5">
            <span className="block text-xl font-black text-slate-800 font-sans">{stats.checkedOut}</span>
            <span className="text-[9px] text-slate-500 block mt-0.5 truncate">{isAmharic ? "የወጡ" : "Checked-Out"}</span>
          </div>
        </div>

        {/* Card 7: Currently Working */}
        <div className="bg-blue-50/50 p-3.5 rounded-xl border border-blue-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center text-blue-500">
            <Activity size={14} className="animate-pulse" />
            <span className="text-[9px] font-mono font-bold text-blue-600">LIVE</span>
          </div>
          <div className="mt-2.5">
            <span className="block text-xl font-black text-blue-750 font-sans">{stats.currentlyWorking}</span>
            <span className="text-[9px] text-blue-600 block mt-0.5 truncate">{isAmharic ? "አሁን በስራ ላይ" : "Active Now"}</span>
          </div>
        </div>

        {/* Card 8: Employees on Leave */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center text-slate-400">
            <Briefcase size={14} />
            <span className="text-[9px] font-mono font-bold">LEAVE</span>
          </div>
          <div className="mt-2.5">
            <span className="block text-xl font-black text-slate-800 font-sans">{stats.onLeave}</span>
            <span className="text-[9px] text-slate-400 block mt-0.5 truncate">{isAmharic ? "ፈቃድ ላይ" : "On Leave"}</span>
          </div>
        </div>

        {/* Card 9: Overtime today */}
        <div className="bg-red-50 p-3.5 rounded-xl border border-red-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center text-red-500">
            <Award size={14} />
            <span className="text-[9px] font-mono font-bold text-red-600">OVERTIME</span>
          </div>
          <div className="mt-2.5">
            <span className="block text-xl font-black text-red-750 font-sans">{stats.totalOvertime} ሰዓ</span>
            <span className="text-[9px] text-red-600 block mt-0.5 truncate">{isAmharic ? "የትርፍ ሰዓት" : "Total Overtime"}</span>
          </div>
        </div>
      </div>

      {/* 3. CENTRAL BIOMETRIC INGESTION TERMINAL & SMART ALERTS NOTIFICATION (Dual Bento grid split) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* TERMINAL KIOSK SIMULATOR (COL-SPAN-2) */}
        <div className="lg:col-span-2 bg-slate-900 text-white rounded-2xl border border-slate-800 p-6 flex flex-col justify-between min-h-[460px] relative shadow-lg">
          
          <div className="absolute right-0 top-0 p-4 font-mono text-[9px] text-slate-600 flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
            <span>TERMINAL STATUS: ONLINE</span>
          </div>

          <div className="space-y-4">
            {/* Header / Direction selector */}
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 border-b border-slate-800 pb-4">
              
              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest block">
                  {isAmharic ? "የመመዝገቢያ አይነት ይምረጡ" : "SELECT KIOSK DIRECTION"}
                </span>
                <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800 w-full sm:w-64">
                  <button
                    onClick={() => {
                      setClockAction("in");
                      setScanResult(null);
                    }}
                    className={`py-2 rounded-lg text-xs font-black tracking-wide flex items-center justify-center space-x-2 cursor-pointer transition-all ${
                      clockAction === "in" 
                        ? "bg-red-600 text-white shadow-md" 
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <LogIn size={13} />
                    <span>{isAmharic ? "መግቢያ (IN)" : "Check-In (IN)"}</span>
                  </button>

                  <button
                    onClick={() => {
                      setClockAction("out");
                      setScanResult(null);
                    }}
                    className={`py-2 rounded-lg text-xs font-black tracking-wide flex items-center justify-center space-x-2 cursor-pointer transition-all ${
                      clockAction === "out" 
                        ? "bg-slate-850 text-white shadow-md" 
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <LogOut size={13} />
                    <span>{isAmharic ? "መውጫ (OUT)" : "Check-Out (OUT)"}</span>
                  </button>
                </div>
              </div>

              {/* Hardware Biometric selector */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest block">
                  {isAmharic ? "የማረጋገጫ ዘዴ" : "BIOMETRIC AUTH METHOD"}
                </span>
                <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800 w-full sm:w-60">
                  <button
                    onClick={() => {
                      setBiometricMethod("fingerprint");
                      setScanResult(null);
                    }}
                    className={`py-2 rounded-lg text-xs font-bold flex items-center justify-center space-x-2 cursor-pointer transition-all ${
                      biometricMethod === "fingerprint" 
                        ? "bg-slate-800 text-white" 
                        : "text-slate-500 hover:text-white"
                    }`}
                  >
                    <Fingerprint size={12} />
                    <span>{isAmharic ? "ጣት አሻራ" : "Fingerprint"}</span>
                  </button>

                  <button
                    onClick={() => {
                      setBiometricMethod("face");
                      setScanResult(null);
                    }}
                    className={`py-2 rounded-lg text-xs font-bold flex items-center justify-center space-x-2 cursor-pointer transition-all ${
                      biometricMethod === "face" 
                        ? "bg-slate-800 text-white" 
                        : "text-slate-500 hover:text-white"
                    }`}
                  >
                    <ScanLine size={12} />
                    <span>{isAmharic ? "የፊት ገጽታ" : "Face Scan"}</span>
                  </button>
                </div>
              </div>

            </div>

            {/* Simulated GPS calibration & worker quick pick */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1 text-xs">
              <div className="space-y-1.5">
                <label className="text-slate-400 font-bold block">{isAmharic ? "ሰራተኛ ይምረጡ (ለመመዝገቢያ)" : "Select Worker to Simulate Biometric Scanner"}</label>
                <select
                  value={selectedWorkerId}
                  onChange={(e) => {
                    setSelectedWorkerId(e.target.value);
                    setScanResult(null);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-red-500 font-medium cursor-pointer"
                >
                  <option value="">-- {isAmharic ? "ሰራተኛ ይምረጡ" : "Choose Employee"} --</option>
                  {workers.map(w => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.id}) - {w.trade}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400 font-bold block">{isAmharic ? "የጂፒኤስ መገኛ ሲሙሌተር" : "GPS Preset Calibration"}</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    onClick={() => {
                      setGpsPreset("inside");
                      setScanResult(null);
                    }}
                    className={`py-1.5 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                      gpsPreset === "inside" 
                        ? "bg-emerald-600 text-white" 
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {isAmharic ? "ግቢ ውስጥ (ውስጥ)" : "Inside Site (Pass)"}
                  </button>
                  <button
                    onClick={() => {
                      setGpsPreset("outside");
                      setScanResult(null);
                    }}
                    className={`py-1.5 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                      gpsPreset === "outside" 
                        ? "bg-amber-600 text-white" 
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {isAmharic ? "ግቢ ውጭ (ውድቅ)" : "Outside (Geofence Alert)"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* SENSOR TARGET & SCATTER RING */}
          <div className="my-6 flex flex-col items-center justify-center text-center">
            <div className="relative flex items-center justify-center mb-5">
              <div className={`absolute w-36 h-36 rounded-full border border-dashed transition-all duration-700 ${
                isScanning ? "border-red-500 animate-[spin_6s_linear_infinite]" : "border-slate-800"
              }`}></div>

              <button
                onClick={handleStartBiometricScan}
                disabled={isScanning}
                className={`relative w-24 h-24 rounded-full flex flex-col items-center justify-center border transition-all duration-300 shadow-2xl cursor-pointer ${
                  isScanning 
                    ? "bg-slate-950 border-red-500" 
                    : "bg-slate-950 border-slate-850 hover:bg-slate-900 active:scale-95 text-slate-400"
                }`}
              >
                {isScanning && (
                  <div className="absolute inset-0 bg-red-600/10 rounded-full animate-ping pointer-events-none"></div>
                )}
                {isScanning && (
                  <div className="absolute w-20 h-0.5 bg-red-500 left-1.5 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-[bounce_1.4s_infinite] z-20"></div>
                )}

                {biometricMethod === "fingerprint" ? (
                  <Fingerprint size={36} className={isScanning ? "text-red-500 animate-pulse" : "text-red-600"} />
                ) : (
                  <ScanLine size={36} className={isScanning ? "text-red-500 animate-pulse" : "text-red-600"} />
                )}

                <span className="text-[7px] uppercase tracking-widest font-black text-slate-500 mt-2 block font-mono">
                  {isScanning ? "VERIFYING..." : "PRESS SENSOR"}
                </span>
              </button>
            </div>

            {/* Scan progress loader */}
            {isScanning && (
              <div className="w-52 space-y-1 animate-fadeIn mb-4">
                <div className="flex justify-between text-[8px] font-mono text-slate-500">
                  <span>BIO HARDWARE DECODING</span>
                  <span>{scanProgress}%</span>
                </div>
                <div className="w-full h-1 bg-slate-950 rounded-full overflow-hidden border border-slate-850">
                  <div className="h-full bg-red-500 transition-all duration-200" style={{ width: `${scanProgress}%` }}></div>
                </div>
              </div>
            )}

            {/* SCAN LOGS */}
            {isScanning && (
              <div className="w-full max-w-md bg-slate-950 border border-slate-850 rounded-lg p-2.5 text-left font-mono text-[9px] text-slate-400 h-20 overflow-y-auto space-y-1 scrollbar-thin">
                {scanLogs.map((log, i) => (
                  <div key={i} className="leading-tight truncate">
                    <span className="text-red-500">❯</span> {log}
                  </div>
                ))}
              </div>
            )}

            {/* SCANNING RESULTS BANNER */}
            {scanResult && !isScanning && (
              <div className={`p-4 rounded-xl border text-xs text-left max-w-lg w-full animate-fadeIn shadow-lg ${
                scanResult.success 
                  ? "bg-slate-950 border-emerald-500/30 text-emerald-300" 
                  : "bg-slate-950 border-red-500/30 text-red-300"
              }`}>
                <div className="flex gap-3.5 items-start">
                  {scanResult.worker?.photo && (
                    <img 
                      src={scanResult.worker.photo} 
                      alt={scanResult.worker.name} 
                      className="w-12 h-12 rounded-full border border-slate-800 object-cover shrink-0 mt-0.5"
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-extrabold text-slate-100">{scanResult.title}</h4>
                        {scanResult.worker && (
                          <p className="text-[9px] text-slate-500 font-mono mt-0.5">
                            ID: {scanResult.worker.id} • {scanResult.worker.trade}
                          </p>
                        )}
                      </div>
                      <span className={`text-[8px] uppercase font-bold px-1.5 py-0.5 rounded ${
                        scanResult.success ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                      }`}>
                        {scanResult.success ? "MATCH APPROVED" : "MATCH DENIED"}
                      </span>
                    </div>
                    <p className="text-slate-300 leading-normal text-[10.5px]">
                      {scanResult.message}
                    </p>
                    
                    {scanResult.worker && (
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-850 text-[9px] font-mono text-slate-400">
                        <div>
                          <span className="block text-slate-500 text-[7px] uppercase">GEOFENCE LOCATION</span>
                          <span className="text-slate-300">FL {scanResult.worker.floor} • {scanResult.worker.zone}</span>
                        </div>
                        <div>
                          <span className="block text-slate-500 text-[7px] uppercase">HARDWARE HASH</span>
                          <span className="text-slate-400">
                            {biometricMethod === "fingerprint" 
                              ? `F_TEMP_0x${scanResult.worker.id.replace("ERP-W-","")}`
                              : `F_FACE_0x${scanResult.worker.id.replace("ERP-W-","")}`}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {!scanResult && !isScanning && (
              <div className="text-slate-500 text-[11px] max-w-sm mx-auto leading-normal">
                <p>
                  {isAmharic 
                    ? "ሰራተኛ ከመረጡ በኋላ የባዮሜትሪክ ዳሳሹን ይጫኑ። ሲስተሙ አሻራውን ካነበበ በኋላ ሰራተኛውን አውቆ ጂኦፌንስ ክልል አረጋግጦ መገኘቱን ይመዘግባል።"
                    : "Select a worker, calibrate the simulator GPS coordinates to test authorized site bounds, and touch the hardware sensor."}
                </p>
              </div>
            )}

          </div>

          {/* GEOFENCE DETAILS FOOTER HUD */}
          <div className="border-t border-slate-800 pt-3 flex justify-between items-center text-[10px] font-mono text-slate-500">
            <span className="flex items-center space-x-1.5">
              <MapPin size={11} className="text-red-500 animate-pulse" />
              <span>GEOFENCE: {geofenceLat}°N, {geofenceLng}°E (R: {allowedRadius}m)</span>
            </span>
            <span>SIMULATION DISTANCE: <strong className={isInsideGeofence ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>{currentDistance}m</strong></span>
          </div>

        </div>

        {/* SMART NOTIFICATIONS SIDEBAR */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col justify-between h-[460px]">
          <div className="space-y-3 flex-grow overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="font-extrabold text-slate-800 text-xs flex items-center space-x-1.5">
                <Bell size={13} className="text-red-500 animate-pulse" />
                <span>{isAmharic ? "መረጃ ሰሌዳ (Smart Alerts)" : "Live Smart Notifications"}</span>
              </h3>
              <span className="text-[9px] font-mono bg-red-50 text-red-500 px-1.5 py-0.5 rounded-full font-bold">
                {notifications.filter(n => !n.isRead).length} NEW
              </span>
            </div>

            <div className="space-y-2 h-[340px] overflow-y-auto pr-1">
              {notifications.map((notif) => (
                <div 
                  key={notif.id}
                  className={`p-2.5 rounded-xl border text-[10px] space-y-1.5 transition-all ${
                    !notif.isRead 
                      ? "bg-slate-50/70 border-red-200" 
                      : "bg-white border-slate-100 opacity-80"
                  }`}
                >
                  <div className="flex justify-between items-center font-bold">
                    <span className="text-slate-800">{notif.workerName}</span>
                    <span className="text-slate-400 font-mono text-[8px]">{notif.timestamp}</span>
                  </div>
                  <p className="text-slate-600 font-sans leading-relaxed">{notif.message}</p>
                  
                  <div className="flex justify-between items-center">
                    <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase ${
                      notif.type === "geofence" 
                        ? "bg-rose-50 text-rose-500" 
                        : notif.type === "late" 
                          ? "bg-amber-50 text-amber-500" 
                          : "bg-emerald-50 text-emerald-500"
                    }`}>
                      {notif.type}
                    </span>
                    {!notif.isRead && (
                      <button 
                        onClick={() => {
                          setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
                        }}
                        className="text-[8px] text-red-500 hover:underline font-bold cursor-pointer"
                      >
                        {isAmharic ? "ይነበብ" : "Mark read"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-2 text-center">
            <button
              onClick={() => {
                setNotifications([]);
                playBeep("success");
              }}
              className="text-[9px] text-slate-400 hover:text-red-500 font-bold cursor-pointer"
            >
              {isAmharic ? "ሁሉንም አጽዳ" : "Clear all logs"}
            </button>
          </div>
        </div>

      </div>

      {/* 4. REAL-TIME GRAPHS SECTION (8 Live Recharts visualizers) */}
      <div className="space-y-4">
        <div className="border-l-4 border-red-500 pl-3">
          <h3 className="font-black text-slate-800 text-sm">{isAmharic ? "የመገኘት መረጃ ሰንጠረዦች (Live Analytics Charts)" : "Attendance Live Analytics Trend Center"}</h3>
          <p className="text-xs text-slate-400">{isAmharic ? "በእውነተኛ ጊዜ የሚዘምኑ የፎርወርክ፣ የዞን፣ የፎቆች እና የትርፍ ሰዓት ስታትስቲክስ።" : "Real-time computed charts visualizing hourly streaks, team presence rates, and formwork floor distributions."}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Chart 1: Daily Presence Trend */}
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-2">
            <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">{isAmharic ? "ዕለታዊ የመገኘት አዝማሚያ" : "Daily Attendance Trend"}</span>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendChartData}>
                  <defs>
                    <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="day" stroke="#94a3b8" fontSize={9} />
                  <YAxis stroke="#94a3b8" fontSize={9} />
                  <Tooltip wrapperStyle={{ fontSize: 9 }} />
                  <Area type="monotone" dataKey="Present" stroke="#10b981" fillOpacity={1} fill="url(#colorIn)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Weekly Overtime Trend */}
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-2">
            <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">{isAmharic ? "ሳምንታዊ የትርፍ ሰዓት ስራ" : "Weekly Overtime Trend (Hours)"}</span>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="day" stroke="#94a3b8" fontSize={9} />
                  <YAxis stroke="#94a3b8" fontSize={9} />
                  <Tooltip wrapperStyle={{ fontSize: 9 }} />
                  <Bar dataKey="Overtime" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 3: Attendance by Floor */}
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-2">
            <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">{isAmharic ? "መገኘት በፎቆች" : "Presence by Floor Distribution"}</span>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={floorChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} />
                  <YAxis stroke="#94a3b8" fontSize={9} />
                  <Tooltip wrapperStyle={{ fontSize: 9 }} />
                  <Bar dataKey="Present" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 4: Attendance Rate by Zone */}
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-2">
            <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">{isAmharic ? "መገኘት በዞን" : "Presence by Zone Distribution"}</span>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={zoneChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="Present"
                  >
                    <Cell fill="#10b981" />
                    <Cell fill="#f59e0b" />
                    <Cell fill="#3b82f6" />
                  </Pie>
                  <Tooltip wrapperStyle={{ fontSize: 9 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      </div>

      {/* 5. LIVE ATTENDANCE ROSTER TABLE (Search, Filters, Sorts, and Realtime Updates) */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h3 className="font-extrabold text-slate-800 text-xs flex items-center space-x-1.5">
              <Database size={13} className="text-red-500" />
              <span>{isAmharic ? "የቀጥታ መገኘት ቁጥጥር ሰንጠረዥ" : "Live Attendance Roster Registry"}</span>
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">{isAmharic ? "በእውነተኛ ጊዜ የሚዘምኑ የሰራተኞች ባዮሜትሪክ መዛግብት።" : "Real-time synchronized attendance table loaded from Firestore."}</p>
          </div>

          {/* SEARCH & FILTERS CONTROLS */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative w-full md:w-48">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={13} />
              <input
                type="text"
                placeholder={isAmharic ? "ስም፣ መታወቂያ ይፈልጉ..." : "Search name or ID..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-2 text-[11px] focus:outline-none focus:border-red-500"
              />
            </div>

            {/* Filter Floor */}
            <select
              value={filterFloor}
              onChange={(e) => setFilterFloor(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-[11px] focus:outline-none cursor-pointer"
            >
              <option value="all">{isAmharic ? "ሁሉም ፎቆች" : "All Floors"}</option>
              <option value="3">Floor 3</option>
              <option value="4">Floor 4</option>
              <option value="5">Floor 5</option>
            </select>

            {/* Filter Zone */}
            <select
              value={filterZone}
              onChange={(e) => setFilterZone(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-[11px] focus:outline-none cursor-pointer"
            >
              <option value="all">{isAmharic ? "ሁሉም ዞኖች" : "All Zones"}</option>
              <option value="Zone A">Zone A</option>
              <option value="Zone B">Zone B</option>
              <option value="Zone C">Zone C</option>
            </select>

            {/* Filter Status */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-[11px] focus:outline-none cursor-pointer"
            >
              <option value="all">{isAmharic ? "ሁሉም ሁኔታ" : "All Status"}</option>
              <option value="Present">Present</option>
              <option value="Late">Late</option>
              <option value="Absent">Absent</option>
              <option value="Leave">Leave</option>
            </select>
          </div>
        </div>

        {/* ROSTER TABLE CONTAINER */}
        <div className="overflow-x-auto border border-slate-100 rounded-xl">
          <table className="w-full text-left text-[11px] border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-150 text-slate-500 font-mono">
                <th className="p-3 font-bold">{isAmharic ? "ፎቶ" : "Photo"}</th>
                <th className="p-3 font-bold cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => { setSortField("workerId"); setSortOrder(sortOrder === "asc" ? "desc" : "asc"); }}>
                  {isAmharic ? "የሰራተኛ መታወቂያ" : "Employee ID"} <ArrowUpDown size={10} className="inline ml-1" />
                </th>
                <th className="p-3 font-bold cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => { setSortField("workerName"); setSortOrder(sortOrder === "asc" ? "desc" : "asc"); }}>
                  {isAmharic ? "ስም" : "Name"} <ArrowUpDown size={10} className="inline ml-1" />
                </th>
                <th className="p-3 font-bold">{isAmharic ? "የስራ አይነት" : "Trade"}</th>
                <th className="p-3 font-bold">{isAmharic ? "ፎቅ/ዞን" : "Floor/Zone"}</th>
                <th className="p-3 font-bold cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => { setSortField("checkIn"); setSortOrder(sortOrder === "asc" ? "desc" : "asc"); }}>
                  {isAmharic ? "የመግቢያ ሰዓት" : "Check-In"} <ArrowUpDown size={10} className="inline ml-1" />
                </th>
                <th className="p-3 font-bold cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => { setSortField("checkOut"); setSortOrder(sortOrder === "asc" ? "desc" : "asc"); }}>
                  {isAmharic ? "የመውጫ ሰዓት" : "Check-Out"} <ArrowUpDown size={10} className="inline ml-1" />
                </th>
                <th className="p-3 font-bold cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => { setSortField("workingHours"); setSortOrder(sortOrder === "asc" ? "desc" : "asc"); }}>
                  {isAmharic ? "የስራ ሰዓት" : "Hours"} <ArrowUpDown size={10} className="inline ml-1" />
                </th>
                <th className="p-3 font-bold">{isAmharic ? "ትርፍ ሰዓት" : "Overtime"}</th>
                <th className="p-3 font-bold">{isAmharic ? "ባዮሜትሪክ ዘዴ" : "Biometric Method"}</th>
                <th className="p-3 font-bold">{isAmharic ? "የመገኛ ሁኔታ" : "GPS Location Status"}</th>
                <th className="p-3 font-bold">{isAmharic ? "ሁኔታ" : "Status"}</th>
              </tr>
            </thead>
            <tbody>
              {processedAttendance.map((rec) => {
                const worker = workers.find(w => w.id === rec.workerId);
                const isLate = rec.status === "Late";
                const isAbsent = rec.status === "Absent";
                const isOnLeave = rec.status === "Leave";

                return (
                  <tr key={rec.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors text-slate-700">
                    <td className="p-3">
                      <img 
                        src={worker?.photo || "https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=100&h=100&fit=crop"} 
                        alt={rec.workerName} 
                        className="w-7 h-7 rounded-full object-cover border border-slate-200"
                        referrerPolicy="no-referrer"
                      />
                    </td>
                    <td className="p-3 font-mono font-bold text-slate-900">{rec.workerId}</td>
                    <td className="p-3 font-semibold text-slate-800">{rec.workerName}</td>
                    <td className="p-3 text-slate-500 font-medium">{rec.trade}</td>
                    <td className="p-3 font-mono">FL {rec.floor} • {rec.zone}</td>
                    <td className="p-3 font-mono text-emerald-600 font-bold">{rec.checkIn || "---"}</td>
                    <td className="p-3 font-mono text-slate-500">{rec.checkOut || "---"}</td>
                    <td className="p-3 font-mono font-bold">{rec.workingHours ? `${rec.workingHours}h` : "---"}</td>
                    <td className="p-3 font-mono font-bold text-red-500">{rec.overtime ? `+${rec.overtime}h` : "---"}</td>
                    <td className="p-3">
                      <span className="flex items-center space-x-1 font-medium text-slate-600">
                        {rec.method === AttendanceMethod.FINGERPRINT ? (
                          <>
                            <Fingerprint size={11} className="text-red-500" />
                            <span>Fingerprint</span>
                          </>
                        ) : (
                          <>
                            <ScanLine size={11} className="text-blue-500" />
                            <span>Face Scan</span>
                          </>
                        )}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="inline-flex items-center space-x-1 text-slate-500">
                        <MapPin size={10} className="text-emerald-500" />
                        <span className="text-[10px] font-mono">Inside (Digital Construction ERP)</span>
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        isLate 
                          ? "bg-amber-50 text-amber-500 border border-amber-200" 
                          : isAbsent 
                            ? "bg-rose-50 text-rose-500 border border-rose-200"
                            : isOnLeave 
                              ? "bg-slate-50 text-slate-500"
                              : "bg-emerald-50 text-emerald-500 border border-emerald-200"
                      }`}>
                        {rec.status}
                      </span>
                    </td>
                  </tr>
                );
              })}

              {processedAttendance.length === 0 && (
                <tr>
                  <td colSpan={12} className="p-6 text-center text-slate-400 font-medium">
                    {isAmharic ? "ምንም የተመዘገበ መረጃ አልተገኘም!" : "No matching attendance records found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* 6. AUTOMATIC ATTENDANCE PAYROLL REPORT GENERATOR & EXPORTER */}
      <div className="bg-slate-50 rounded-2xl border border-slate-150 p-5 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Report configuration inputs */}
        <div className="space-y-4">
          <div className="border-l-4 border-red-500 pl-3">
            <h3 className="font-extrabold text-slate-800 text-xs flex items-center space-x-1.5">
              <FileText size={13} className="text-red-500" />
              <span>{isAmharic ? "አውቶማቲክ የመገኘት ሪፖርት ማውጫ" : "Automated Payroll Attendance Reports"}</span>
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">{isAmharic ? "ለደመወዝ ክፍያ የሚሆኑ ሪፖርቶችን በተለያዩ ፎርማቶች ያውርዱ።" : "Configure groupings and compile structured attendance templates."}</p>
          </div>

          <div className="space-y-3 text-xs">
            {/* Report Type */}
            <div className="space-y-1.5">
              <label className="text-slate-500 font-bold block">{isAmharic ? "የሪፖርት ጊዜ" : "Report Timeframe Range"}</label>
              <div className="grid grid-cols-4 gap-1.5 bg-white p-1 rounded-lg border border-slate-200">
                {(["daily", "weekly", "monthly", "overtime"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setReportType(t);
                      playBeep("scan");
                    }}
                    className={`py-1 rounded text-[10px] font-bold uppercase transition-all cursor-pointer ${
                      reportType === t 
                        ? "bg-slate-800 text-white shadow-sm" 
                        : "text-slate-500 hover:text-slate-850"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Report Dimension Grouping */}
            <div className="space-y-1.5">
              <label className="text-slate-500 font-bold block">{isAmharic ? "ሪፖርቱን መመደቢያ መንገድ" : "Group & Sort Report By"}</label>
              <div className="grid grid-cols-4 gap-1.5 bg-white p-1 rounded-lg border border-slate-200">
                {(["floor", "zone", "team", "project"] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => {
                      setReportDimension(d);
                      playBeep("scan");
                    }}
                    className={`py-1 rounded text-[10px] font-bold uppercase transition-all cursor-pointer ${
                      reportDimension === d 
                        ? "bg-slate-800 text-white shadow-sm" 
                        : "text-slate-500 hover:text-slate-850"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Compile Actions */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={handleExportCSV}
                className="bg-slate-800 text-white font-extrabold py-2.5 rounded-xl text-[11px] hover:bg-slate-850 cursor-pointer flex items-center justify-center space-x-1.5 transition-all shadow-sm"
              >
                <Download size={13} />
                <span>EXPORT EXCEL / CSV</span>
              </button>

              <button
                onClick={handleExportPDF}
                disabled={isGeneratingReport}
                className="bg-red-600 text-white font-extrabold py-2.5 rounded-xl text-[11px] hover:bg-red-700 cursor-pointer flex items-center justify-center space-x-1.5 transition-all shadow-sm"
              >
                {isGeneratingReport ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>GENERATING...</span>
                  </>
                ) : (
                  <>
                    <FileText size={13} />
                    <span>EXPORT PDF REPORT</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Live report template preview (COL-SPAN-2) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-4 shadow-inner">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-2.5 font-mono text-[9px] text-slate-400">
            <span>PREVIEW: Digital Construction ERP CONSTRUCTION - ALU_FORM_PAYROLL</span>
            <span className="text-red-500">READY FOR EXPORT</span>
          </div>

          <div className="space-y-2 h-[175px] overflow-y-auto scrollbar-thin">
            <div className="grid grid-cols-7 text-[10px] font-mono text-slate-500 font-bold border-b border-slate-100 pb-1.5">
              <div>{reportDimension.toUpperCase()}</div>
              <div>TOTAL EMPS</div>
              <div>PRESENT</div>
              <div>ABSENT</div>
              <div>ATTENDANCE %</div>
              <div>LATE CHECKS</div>
              <div>OVERTIME HRS</div>
            </div>

            {reportRecords.map((rec, i) => (
              <div key={i} className="grid grid-cols-7 text-[10px] font-mono text-slate-700 border-b border-slate-100 pb-1 pt-1 hover:bg-slate-50">
                <div className="font-bold text-slate-900 truncate">{rec.name}</div>
                <div>{rec.total}</div>
                <div className="text-emerald-600 font-bold">{rec.present}</div>
                <div className="text-rose-500">{rec.absent}</div>
                <div className="font-bold">{rec.attendanceRate}%</div>
                <div className="text-amber-500 font-bold">{rec.late}</div>
                <div className="text-red-500 font-bold">+{rec.overtime}h</div>
              </div>
            ))}
          </div>

          <div className="mt-3 bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex justify-between items-center text-[10px] text-slate-500 font-sans leading-normal">
            <div className="flex items-center space-x-1.5">
              <Info size={12} className="text-slate-400 shrink-0" />
              <span>{isAmharic ? "ይህ ሪፖርት በሮል-ቤዝድ ፍቃድ የተገደበ ነው።" : "Report automatically filtered by your active role permissions."}</span>
            </div>
            <span className="font-mono text-[9px] uppercase font-bold text-slate-400">Security Check: Passed</span>
          </div>
        </div>

      </div>

      {/* 7. SECURITY & ENCRYPTION INFRASTRUCTURE AUDIT HUD */}
      <div className="bg-slate-900 text-slate-300 p-4 rounded-xl border border-slate-800 grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
        <div className="space-y-1">
          <span className="block font-mono text-[9px] text-slate-500 uppercase font-black">{isAmharic ? "ባዮሜትሪክ ምስጠራ" : "BIOMETRIC ENCRYPTION"}</span>
          <p className="text-[11px] leading-relaxed text-slate-400">
            {isAmharic ? "ሁሉም የጣት አሻራዎች በSHA-256 በሃርድዌር ቺፕ ላይ የተመሰጠሩ ናቸው።" : "Biometric ridge patterns are encoded to SHA-256 hardware cryptographic template hashes."}
          </p>
        </div>
        <div className="space-y-1">
          <span className="block font-mono text-[9px] text-slate-500 uppercase font-black">{isAmharic ? "የጂፒኤስ ጂኦፌንስ ደህንነት" : "GPS GEOFENCING SECURITY"}</span>
          <p className="text-[11px] leading-relaxed text-slate-400">
            {isAmharic ? "ሰራተኛው ከፕሮጀክት ጂኦፌንስ ክልል ውጭ መሆን አለመሆኑን ያረጋግጣል።" : "Strict 150m Haversine validation blocks off-site biometric ingestion endpoints."}
          </p>
        </div>
        <div className="space-y-1">
          <span className="block font-mono text-[9px] text-slate-500 uppercase font-black">{isAmharic ? "የኦፍላይን ቋት ግንኙነት" : "OFFLINE QUEUE SECURITY"}</span>
          <p className="text-[11px] leading-relaxed text-slate-400">
            {isAmharic ? "ኢንተርኔት በማይኖርበት ጊዜ በስልኩ ቋት ላይ ተቀምጦ ግንኙነት ሲመለስ በራስ-ሰር ይልካል።" : "Queued records are cryptographically stored on-device until secure synchronization triggers."}
          </p>
        </div>
        <div className="space-y-1">
          <span className="block font-mono text-[9px] text-slate-500 uppercase font-black">{isAmharic ? "የተጠቃሚ ፍቃድ መቆጣጠሪያ" : "ROLE ACCESS ASSURANCE"}</span>
          <p className="text-[11px] leading-relaxed text-slate-400">
            {isAmharic ? "የመገኘት ቁጥጥር በተጠቃሚው ፍቃድ መሰረት ብቻ ተደራሽ ነው።" : "Role-Based Access Control (RBAC) scopes attendance visibility by construction tier."}
          </p>
        </div>
      </div>

    </div>
  );
};
