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
  CheckCircle, 
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
  Locate,
  Building2,
  Wifi,
  WifiOff,
  UserCheck,
  Search,
  Compass,
  ArrowRight
} from "lucide-react";
import { Worker, AttendanceRecord, AttendanceMethod, UserRole } from "../types";

interface FingerprintAttendanceBoardProps {
  workers: Worker[];
  attendance: AttendanceRecord[];
  onAddAttendance: (record: AttendanceRecord) => void;
  isAmharic: boolean;
  currentUserRole: UserRole;
  onLogAction?: (action: string, details: string) => void;
}

interface BiometricAuditLog {
  id: string;
  workerId: string;
  workerName: string;
  timestamp: string;
  method: "Fingerprint" | "Face";
  coordinates: { lat: number; lng: number };
  gpsStatus: "Inside Site" | "Outside Site";
  verifiedBy: string;
  deviceId: string;
  project: string;
  building: string;
  floor: number;
  zone: string;
  status: string;
  hash: string;
}

interface QueuedAttendance {
  worker: Worker;
  mode: "check-in" | "check-out";
  method: AttendanceMethod;
  gpsCoordinates: { lat: number; lng: number };
  timestamp: Date;
  gpsLocationString: string;
  isInside: boolean;
}

// Haversine formula to compute distance in meters between two coordinates
function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export const FingerprintAttendanceBoard: React.FC<FingerprintAttendanceBoardProps> = ({
  workers,
  attendance,
  onAddAttendance,
  isAmharic,
  currentUserRole,
  onLogAction
}) => {
  // Live clock state
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Master geofence of Digital Bole Heights construction site
  const [geofenceLat, setGeofenceLat] = useState(9.0049);
  const [geofenceLng, setGeofenceLng] = useState(38.7783);
  const [allowedRadius, setAllowedRadius] = useState(150); // in meters

  // Kiosk settings
  const [kioskMode, setKioskMode] = useState<"check-in" | "check-out">("check-in");
  const [isOnline, setIsOnline] = useState(typeof window !== "undefined" ? navigator.onLine : true);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [showConfig, setShowConfig] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  
  // Simulation / Emulator controls state
  const [simulatedWorkerId, setSimulatedWorkerId] = useState(workers[0]?.id || "");
  const [verificationMethod, setVerificationMethod] = useState<"fingerprint" | "face">("fingerprint");
  const [gpsPreset, setGpsPreset] = useState<"inside" | "outside">("inside");
  const [simLat, setSimLat] = useState(9.0048);
  const [simLng, setSimLng] = useState(38.7781);
  const [forceFail, setForceFail] = useState(false);
  const [failReasonPreset, setFailReasonPreset] = useState<"corrupted" | "unregistered">("corrupted");

  // Offline queue state
  const [offlineQueue, setOfflineQueue] = useState<QueuedAttendance[]>([]);

  // Active scanning/processing states
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [syncStatus, setSyncStatus] = useState<"Idle" | "Syncing" | "Synced" | "Offline">("Synced");

  // Confirmation feedback overlay
  const [confirmationOverlay, setConfirmationOverlay] = useState<{
    status: "success" | "failed";
    worker?: Worker;
    time?: string;
    message?: string;
    reason?: string;
  } | null>(null);

  // Dedicated Biometric Audit Logs for local session
  const [biometricAuditLogs, setBiometricAuditLogs] = useState<BiometricAuditLog[]>([]);

  // Search & Filter state for the shared attendance table
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTeam, setFilterTeam] = useState("All");

  // Update real-time clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Update simulated GPS coordinates based on preset selection
  useEffect(() => {
    if (gpsPreset === "inside") {
      setSimLat(9.0048);
      setSimLng(38.7781); // Within 150m of (9.0049, 38.7783)
    } else {
      setSimLat(8.9806);
      setSimLng(38.7905); // Bole Airport - ~4.1km away
    }
  }, [gpsPreset]);

  // Listen to network changes for real-time offline fallback on-site
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleOnline = () => {
      setIsOnline(true);
      if (onLogAction) {
        onLogAction("Fingerprint terminal online", "Automatic detection registered stable cellular connection.");
      }
    };
    const handleOffline = () => {
      setIsOnline(false);
      if (onLogAction) {
        onLogAction("Fingerprint terminal offline", "Terminal entered offline mode due to connection loss.");
      }
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [onLogAction]);

  // Compute live distance
  const currentDistance = Math.round(getDistanceInMeters(simLat, simLng, geofenceLat, geofenceLng));
  const isInsideGeofence = currentDistance <= allowedRadius;

  // Sound generator
  const playSound = (type: "scan" | "success" | "error") => {
    if (!isSoundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      if (type === "scan") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else if (type === "success") {
        const now = ctx.currentTime;
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        const gain2 = ctx.createGain();

        osc1.frequency.setValueAtTime(1000, now);
        gain1.gain.setValueAtTime(0.06, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.12);

        osc2.frequency.setValueAtTime(1300, now + 0.12);
        gain2.gain.setValueAtTime(0.06, now + 0.12);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.12);
        osc2.stop(now + 0.25);
      } else if (type === "error") {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(130, now);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.4);
      }
    } catch (e) {
      console.warn("Audio Context blocked: ", e);
    }
  };

  // Synchronize queued offline records when online mode is restored
  const handleToggleOnline = () => {
    if (!isOnline) {
      // Transitioning to ONLINE - flush queue
      setIsOnline(true);
      if (offlineQueue.length > 0) {
        setSyncStatus("Syncing");
        setTerminalLogs(prev => [
          ...prev,
          `📡 Connection restored! Synchronizing ${offlineQueue.length} queued biometric logs with Firebase...`
        ]);

        // Process each queued record
        offlineQueue.forEach(item => {
          commitAttendanceRecord(item.worker, item.mode, item.method, item.gpsCoordinates, item.timestamp, item.gpsLocationString, item.isInside);
        });

        // Trigger parent log
        if (onLogAction) {
          onLogAction(
            "Offline Sync Complete", 
            `Synchronized ${offlineQueue.length} attendance logs captured while terminal was offline.`
          );
        }

        setOfflineQueue([]);
        setSyncStatus("Synced");
        playSound("success");

        // Temporary overlay to alert sync success
        setConfirmationOverlay({
          status: "success",
          message: isAmharic 
            ? "የከመስመር ውጭ የተጠራቀሙ መዝገቦች በተሳካ ሁኔታ ከFirebase Cloud Firestore ጋር ተመሳስለዋል!"
            : "Offline queue synchronized successfully with Firebase Cloud Firestore!"
        });
      } else {
        setSyncStatus("Synced");
      }
    } else {
      // Transitioning to OFFLINE
      setIsOnline(false);
      setSyncStatus("Offline");
      setTerminalLogs(prev => [
        ...prev,
        "⚠️ Terminal disconnected. Offline safe backup queue initiated."
      ]);
    }
  };

  // Master click trigger for the central biometric button
  const handleBiometricTrigger = () => {
    if (isScanning) return;

    setIsScanning(true);
    setScanProgress(0);
    setConfirmationOverlay(null);
    setTerminalLogs(prev => [
      ...prev,
      isAmharic 
        ? "⚙️ የባዮሜትሪክ ሞጁል በመዘጋጀት ላይ ነው..." 
        : "⚙️ Initializing secure OS biometric pipeline..."
    ]);

    playSound("scan");

    // Scan progress simulation ticks
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setScanProgress(progress);
      playSound("scan");

      if (progress === 30) {
        setTerminalLogs(prev => [
          ...prev,
          isAmharic
            ? `🔍 የጣት አሻራ / የፊት መለያ በክፍል ተርሚናል ላይ በመፈለግ ላይ... (${verificationMethod === "fingerprint" ? "የጣት አሻራ" : "የፊት ገጽታ"})`
            : `🔍 Matching biometric template using local 1:N secure memory search (${verificationMethod === "fingerprint" ? "Fingerprint Ridge Reader" : "Face Recognition Geometry"})`
        ]);
      } else if (progress === 60) {
        setTerminalLogs(prev => [
          ...prev,
          isAmharic
            ? `🛰️ የጂፒኤስ መገኛ መጋጠሚያዎች ተገኝተዋል፡ [${simLat.toFixed(5)}°N, ${simLng.toFixed(5)}°E]`
            : `🛰️ Capturing hardware GPS geofence coordinates: [${simLat.toFixed(5)}°N, ${simLng.toFixed(5)}°E]`
        ]);
      } else if (progress === 80) {
        setTerminalLogs(prev => [
          ...prev,
          isAmharic
            ? `📐 ከፕሮጀክቱ መካከለኛ ነጥብ የተሰላ ልዩነት፡ ${currentDistance}ሜ`
            : `📐 Boundary calculations completed. Deviation from site center: ${currentDistance}m`
        ]);
      } else if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          setIsScanning(false);
          processAuthentication();
        }, 150);
      }
    }, 200);
  };

  // High fidelity business logic processing
  const processAuthentication = () => {
    // 1. Check for Force Fail emulation
    if (forceFail) {
      playSound("error");
      const errorMsg = failReasonPreset === "corrupted" 
        ? (isAmharic ? "ማረጋገጫው አልተሳካም: የተበላሸ ወይም የማይነበብ የባዮሜትሪክ አብነት" : "Biometric Verification Failed: Corrupted or unreadable biometric template.")
        : (isAmharic ? "ማረጋገጫው አልተሳካም: ይህ አሻራ በሲስተሙ ውስጥ አልተመዘገበም" : "Biometric Verification Failed: Biometric template not found in master database.");

      setConfirmationOverlay({
        status: "failed",
        reason: errorMsg
      });

      setTerminalLogs(prev => [
        ...prev,
        `❌ Verification Failed: ${failReasonPreset === "corrupted" ? "Corrupted biometric data template" : "Unenrolled biometric template"}`
      ]);

      // Write failed attempt to biometric audit logs
      logBiometricAudit(
        "Unknown", 
        "Unknown Person", 
        "Failed Authentication", 
        verificationMethod === "fingerprint" ? "Fingerprint" : "Face", 
        { lat: simLat, lng: simLng }, 
        isInsideGeofence ? "Inside Site" : "Outside Site", 
        failReasonPreset === "corrupted" ? "Corrupted biometric format" : "Unenrolled biometric template"
      );
      return;
    }

    // 2. Identify the employee from the simulated worker selection
    const worker = workers.find(w => w.id === simulatedWorkerId);
    if (!worker) {
      playSound("error");
      setConfirmationOverlay({
        status: "failed",
        reason: isAmharic ? "ማረጋገጫው አልተሳካም: ሰራተኛው አልተገኘም" : "Verification Failed: Simulated employee profile not found."
      });
      return;
    }

    const todayDate = currentTime.toISOString().split("T")[0];
    const formattedTime = currentTime.toLocaleTimeString("en-US", { hour12: false });

    // 3. Geofence Check
    if (!isInsideGeofence) {
      playSound("error");
      const errorReason = isAmharic
        ? `የመገኛ ቦታ ክልል ጥሰት፡ ሰራተኛው ከተፈቀደው የግንባታ ግቢ ውጭ በ ${currentDistance}ሜትር ርቆ ይገኛል።`
        : `GPS Geofence Breach: Worker is outside the authorized Digital Construction ERP construction boundary by ${currentDistance}m.`;

      setConfirmationOverlay({
        status: "failed",
        worker,
        time: formattedTime,
        reason: errorReason
      });

      setTerminalLogs(prev => [
        ...prev,
        `❌ Rejected: Geofence violation for ${worker.name} (${currentDistance}m away)`
      ]);

      logBiometricAudit(
        worker.id,
        worker.name,
        "Geofence Breach Rejected",
        verificationMethod === "fingerprint" ? "Fingerprint" : "Face",
        { lat: simLat, lng: simLng },
        "Outside Site",
        `GPS violation: ${currentDistance}m out of bounds`
      );

      if (onLogAction) {
        onLogAction("Biometric Geofence Violation", `Blocked ${kioskMode.toUpperCase()} attempt for ${worker.name} due to ${currentDistance}m geofence breach.`);
      }
      return;
    }

    // 4. Duplicate Validation & Roster Integrity
    const existingRecord = attendance.find(a => a.workerId === worker.id && a.date === todayDate);

    if (kioskMode === "check-in") {
      if (existingRecord && existingRecord.checkIn) {
        // Prevent duplicate check-in
        playSound("error");
        setConfirmationOverlay({
          status: "failed",
          worker,
          time: formattedTime,
          reason: isAmharic
            ? "ድግግሞሽ ተከልክሏል፡ ይህ ሰራተኛ ለዛሬው ፈረቃ አስቀድሞ መግቢያ መዝግቧል!"
            : "Duplicate Check-In Prevented: This employee has already clocked in for today's shift."
        });

        setTerminalLogs(prev => [
          ...prev,
          `❌ Rejected: Duplicate check-in blocked for ${worker.name}.`
        ]);

        logBiometricAudit(
          worker.id,
          worker.name,
          "Duplicate Check-In Blocked",
          verificationMethod === "fingerprint" ? "Fingerprint" : "Face",
          { lat: simLat, lng: simLng },
          "Inside Site",
          "Duplicate check-in attempt rejected."
        );
        return;
      }
    } else {
      // Check-out mode validation
      if (!existingRecord || !existingRecord.checkIn) {
        // Prevent check-out without check-in
        playSound("error");
        setConfirmationOverlay({
          status: "failed",
          worker,
          time: formattedTime,
          reason: isAmharic
            ? "መውጫ ውድቅ ተደርጓል፡ ለዚህ ሰራተኛ የጠዋት መግቢያ መዝገብ አልተገኘም!"
            : "Missing Check-In: No active check-in record found for today's shift. Clock-in is required first."
        });

        setTerminalLogs(prev => [
          ...prev,
          `❌ Rejected: Missing check-in clock-out block for ${worker.name}.`
        ]);

        logBiometricAudit(
          worker.id,
          worker.name,
          "Missing Check-In Blocked",
          verificationMethod === "fingerprint" ? "Fingerprint" : "Face",
          { lat: simLat, lng: simLng },
          "Inside Site",
          "Attempted check-out with no matching morning check-in."
        );
        return;
      }

      if (existingRecord.checkOut) {
        // Prevent duplicate check-out
        playSound("error");
        setConfirmationOverlay({
          status: "failed",
          worker,
          time: formattedTime,
          reason: isAmharic
            ? "ድግግሞሽ ተከልክሏል፡ ይህ ሰራተኛ አስቀድሞ መውጫ መዝግቦ ስራውን አጠናቋል!"
            : "Duplicate Check-Out Prevented: This employee has already clocked out and finished their shift today."
        });

        setTerminalLogs(prev => [
          ...prev,
          `❌ Rejected: Duplicate check-out blocked for ${worker.name}.`
        ]);

        logBiometricAudit(
          worker.id,
          worker.name,
          "Duplicate Check-Out Blocked",
          verificationMethod === "fingerprint" ? "Fingerprint" : "Face",
          { lat: simLat, lng: simLng },
          "Inside Site",
          "Duplicate check-out attempt rejected."
        );
        return;
      }
    }

    // 5. Offline Queueing check
    if (!isOnline) {
      const queuedItem: QueuedAttendance = {
        worker,
        mode: kioskMode,
        method: verificationMethod === "fingerprint" ? AttendanceMethod.FINGERPRINT : AttendanceMethod.FACE_RECOGNITION,
        gpsCoordinates: { lat: simLat, lng: simLng },
        timestamp: new Date(),
        gpsLocationString: isAmharic ? `ቦሌ ሃይትስ (ልዩነት፡ ${currentDistance}ሜ)` : `Digital Construction ERP Heights (${currentDistance}m deviation)`,
        isInside: true
      };

      setOfflineQueue(prev => [...prev, queuedItem]);
      playSound("success");

      setConfirmationOverlay({
        status: "success",
        worker,
        time: formattedTime,
        message: isAmharic
          ? `መዝገብ በከመስመር ውጭ ተቀምጧል! የበይነመረብ ግንኙነቱ ሲመለስ በራስ-ሰር ከFirebase ጋር ይመሳሰላል።`
          : `Roster queued offline securely! System will synchronize with Cloud Firestore once internet connectivity is restored.`
      });

      setTerminalLogs(prev => [
        ...prev,
        `💾 Queued Offline: ${worker.name} logged ${kioskMode.toUpperCase()} at ${formattedTime}`
      ]);

      logBiometricAudit(
        worker.id,
        worker.name,
        `Queued Offline (${kioskMode === "check-in" ? "Check-In" : "Check-Out"})`,
        verificationMethod === "fingerprint" ? "Fingerprint" : "Face",
        { lat: simLat, lng: simLng },
        "Inside Site",
        "Buffered in offline queue. Awaiting internet."
      );
      return;
    }

    // 6. Committing successful attendance directly online (Sync active)
    commitAttendanceRecord(worker, kioskMode, verificationMethod === "fingerprint" ? AttendanceMethod.FINGERPRINT : AttendanceMethod.FACE_RECOGNITION, { lat: simLat, lng: simLng }, currentTime, isAmharic ? `ቦሌ ሃይትስ (ልዩነት፡ ${currentDistance}ሜ)` : `Digital Construction ERP Heights (${currentDistance}m deviation)`, true);
  };

  // Helper to construct, write and log a valid attendance record
  const commitAttendanceRecord = (
    worker: Worker, 
    mode: "check-in" | "check-out", 
    method: AttendanceMethod, 
    coords: { lat: number; lng: number }, 
    timeObj: Date, 
    locString: string, 
    isInside: boolean
  ) => {
    const formattedDate = timeObj.toISOString().split("T")[0];
    const formattedTime = timeObj.toLocaleTimeString("en-US", { hour12: false });
    
    // Retrieve today's existing record for this worker if exists
    const existingRecord = attendance.find(a => a.workerId === worker.id && a.date === formattedDate);

    if (mode === "check-in") {
      // Create new Clock-In record
      const [nowH, nowM] = formattedTime.split(":").map(Number);
      const isLate = (nowH * 60 + nowM) > (8 * 60 + 15); // Late if after 08:15 AM
      const status = isLate ? "Late" : "Present";

      const newRecord: AttendanceRecord = {
        id: `ATT-BIO-${Date.now()}-${worker.id}`,
        workerId: worker.id,
        workerName: worker.name,
        department: worker.department,
        trade: worker.trade,
        company: worker.company,
        building: worker.building || "Tower A",
        floor: worker.floor || 4,
        zone: worker.zone || "Zone B",
        date: formattedDate,
        checkIn: formattedTime,
        checkOut: null,
        method: method,
        workingHours: 0,
        overtime: 0,
        status: status,
        gpsCoordinates: coords,
        deviceUsed: "Digital Construction ERP-BIO-PAD-03",
        verifiedBy: currentUserRole,
        gpsLocationString: locString
      };

      onAddAttendance(newRecord);
      playSound("success");

      setConfirmationOverlay({
        status: "success",
        worker,
        time: formattedTime,
        message: isAmharic 
          ? `የጠዋት መግቢያ (Check-In) በተሳካ ሁኔታ ተመዝግቧል። ሁኔታ: ${isLate ? "የዘገየ (Late)" : "በሰዓቱ (Present)"}`
          : `Morning Check-In recorded successfully! Roster status: ${status}. Synchronized with Firebase.`
      });

      setTerminalLogs(prev => [
        ...prev,
        `✅ Approved: Check-In saved for ${worker.name} at ${formattedTime}`
      ]);

      logBiometricAudit(
        worker.id,
        worker.name,
        isLate ? "Checked In (Late)" : "Checked In (On-Time)",
        method === AttendanceMethod.FINGERPRINT ? "Fingerprint" : "Face",
        coords,
        "Inside Site",
        `Attendance status: ${status}`
      );

      if (onLogAction) {
        onLogAction("Biometric Check-In Recorded", `${worker.name} checked in at ${formattedTime}. Status: ${status}.`);
      }

    } else {
      // Update existing record for Clock-Out
      if (existingRecord) {
        // Calculate working hours and overtime
        const [inH, inM] = existingRecord.checkIn!.split(":").map(Number);
        const [outH, outM] = formattedTime.split(":").map(Number);
        const rawHrs = Math.max(0, (outH + outM / 60) - (inH + inM / 60));
        const netWorkingHours = Math.max(0, rawHrs - 1.0); // 1.0 hour lunch break
        const workingHours = parseFloat(Math.min(8.0, netWorkingHours).toFixed(2));
        const overtime = parseFloat(Math.max(0, netWorkingHours - 8.0).toFixed(2));
        const totalAccumulatedHours = parseFloat((workingHours + overtime).toFixed(2));

        const updatedRecord: AttendanceRecord = {
          ...existingRecord,
          checkOut: formattedTime,
          workingHours: totalAccumulatedHours,
          overtime,
          status: existingRecord.status === "Late" ? "Late" : "Present",
          deviceUsed: "Digital Construction ERP-BIO-PAD-03",
          verifiedBy: currentUserRole,
          gpsLocationString: locString
        };

        onAddAttendance(updatedRecord);
        playSound("success");

        setConfirmationOverlay({
          status: "success",
          worker,
          time: formattedTime,
          message: isAmharic
            ? `የማታ መውጫ (Check-Out) በተሳካ ሁኔታ ተመዝግቧል። የሰሩት ሰዓት፡ ${workingHours}ሰ | ትርፍ ሰዓት፡ ${overtime}ሰ`
            : `Evening Check-Out recorded successfully! Hours worked: ${workingHours}h, Overtime: ${overtime}h.`
        });

        setTerminalLogs(prev => [
          ...prev,
          `✅ Approved: Check-Out saved for ${worker.name} at ${formattedTime}. Hours: ${totalAccumulatedHours}h`
        ]);

        logBiometricAudit(
          worker.id,
          worker.name,
          "Checked Out",
          method === AttendanceMethod.FINGERPRINT ? "Fingerprint" : "Face",
          coords,
          "Inside Site",
          `Logged hours: ${totalAccumulatedHours}h (OT: ${overtime}h)`
        );

        if (onLogAction) {
          onLogAction("Biometric Check-Out Recorded", `${worker.name} checked out at ${formattedTime}. Worked hours: ${totalAccumulatedHours}h.`);
        }
      }
    }

    // Auto dismiss modal after 5 seconds
    setTimeout(() => {
      setConfirmationOverlay(prev => {
        if (prev?.worker?.id === worker.id || !prev?.worker) {
          return null;
        }
        return prev;
      });
    }, 5000);
  };

  // Helper to log audit transactions locally with random hash simulation
  const logBiometricAudit = (
    workerId: string,
    workerName: string,
    actionStatus: string,
    method: "Fingerprint" | "Face",
    coords: { lat: number; lng: number },
    gpsStatus: "Inside Site" | "Outside Site",
    extraDetails: string
  ) => {
    const todayDate = currentTime.toISOString().split("T")[0];
    const formattedTime = currentTime.toLocaleTimeString("en-US", { hour12: false });
    const fakeHash = `0x${Math.random().toString(16).substring(2, 10).toUpperCase()}${workerId || "FAILED"}`;

    const newAudit: BiometricAuditLog = {
      id: `AUD-BIO-${Date.now()}`,
      workerId,
      workerName,
      timestamp: `${todayDate} ${formattedTime}`,
      method,
      coordinates: coords,
      gpsStatus,
      verifiedBy: currentUserRole,
      deviceId: "Digital Construction ERP-BIO-PAD-03",
      project: "Digital Bole Heights",
      building: "Tower A",
      floor: 4,
      zone: "Zone B",
      status: `${actionStatus} - ${extraDetails}`,
      hash: fakeHash
    };

    setBiometricAuditLogs(prev => [newAudit, ...prev]);
  };

  // Pre-configured list of construction teams for sorting
  const teamNames = useMemo(() => {
    return ["All", "Assembly Team Alpha", "Stripping Team Beta", "Steel Fixing Team Gamma", "Concreting Team Delta", "Support Team Epsilon"];
  }, []);

  // Filter the shared live attendance table
  const filteredRecords = useMemo(() => {
    return attendance.filter(record => {
      const matchesSearch = record.workerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            record.workerId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            record.trade.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Determine worker's team mapping
      let matchesTeam = true;
      if (filterTeam !== "All") {
        const workerObj = workers.find(w => w.id === record.workerId);
        const teamIdMap: Record<string, string> = {
          "Assembly Team Alpha": "T-01",
          "Stripping Team Beta": "T-02",
          "Steel Fixing Team Gamma": "T-03",
          "Concreting Team Delta": "T-04",
          "Support Team Epsilon": "T-05"
        };
        matchesTeam = workerObj?.teamId === teamIdMap[filterTeam];
      }

      return matchesSearch && matchesTeam;
    });
  }, [attendance, workers, searchTerm, filterTeam]);

  // Helper to fetch details of a worker to display team, leaders, chiefs, etc.
  const getWorkerMetaData = (workerId: string) => {
    const worker = workers.find(w => w.id === workerId);
    if (!worker) return { team: "Unassigned", gangChief: "Fikru Tolossa", teamLeader: "Yohannes Bekele", supervisor: "Eng. Yoseph" };

    // Explicit lookups representing structural site hierarchy
    const meta: Record<string, { team: string; gangChief: string; teamLeader: string; supervisor: string }> = {
      "T-01": { team: "Assembly Team Alpha", gangChief: "Fikru Tolossa", teamLeader: "Yohannes Bekele", supervisor: "Eng. Yoseph" },
      "T-02": { team: "Stripping Team Beta", gangChief: "Fikru Tolossa", teamLeader: "Yohannes Bekele", supervisor: "Eng. Yoseph" },
      "T-03": { team: "Steel Fixing Team Gamma", gangChief: "Fikru Tolossa", teamLeader: "Yohannes Bekele", supervisor: "Eng. Yoseph" },
      "T-04": { team: "Concreting Team Delta", gangChief: "Fikru Tolossa", teamLeader: "Yohannes Bekele", supervisor: "Eng. Yoseph" },
      "T-05": { team: "Support Team Epsilon", gangChief: "Fikru Tolossa", teamLeader: "Yohannes Bekele", supervisor: "Eng. Yoseph" }
    };

    return meta[worker.teamId] || { team: "Custom Gang", gangChief: "Fikru Tolossa", teamLeader: "Yohannes Bekele", supervisor: "Eng. Yoseph" };
  };

  return (
    <div className="space-y-6" id="shared-fingerprint-attendance-board">
      
      {/* 1. MASTER HEADER CONTROL BAR */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl border border-slate-800 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 opacity-5 pointer-events-none">
          <Fingerprint size={280} className="text-red-500 animate-pulse" />
        </div>

        <div className="flex items-center space-x-4 z-10">
          <div className="p-3.5 bg-red-600/20 text-red-500 rounded-2xl border border-red-500/30">
            <Fingerprint size={36} className="animate-pulse" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[9px] uppercase font-black tracking-widest bg-red-600 px-2.5 py-0.5 rounded text-white font-mono">
                {isAmharic ? "መገኘት ቁጥጥር ኪዮስክ" : "ATTENDANCE KIOSK TERMINAL"}
              </span>
              <span className="text-xs text-slate-500 font-bold">•</span>
              
              {/* Online / Offline Sync Indicator */}
              <button 
                onClick={handleToggleOnline}
                className={`flex items-center space-x-1.5 text-xs font-mono font-bold cursor-pointer transition-colors px-2.5 py-0.5 rounded-full ${
                  isOnline 
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                    : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                }`}
                title="Click to toggle Online/Offline simulation"
              >
                {isOnline ? (
                  <>
                    <Wifi size={12} className="animate-pulse" />
                    <span>{isAmharic ? "በመስመር ላይ (Firestore)" : "Online (Firestore Connected)"}</span>
                  </>
                ) : (
                  <>
                    <WifiOff size={12} />
                    <span>{isAmharic ? "ከመስመር ውጭ (Queued)" : "Offline Mode (Queued)"}</span>
                  </>
                )}
              </button>
            </div>
            
            <h2 className="text-2xl font-black tracking-tight mt-1">
              {isAmharic ? "የጋራ ባዮሜትሪክ መገኘት መቆጣጠሪያ ሰሌዳ" : "Shared Attendance Kiosk (Fingerprint Board)"}
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              {isAmharic
                ? "ለሁሉም የቡድን መሪዎች፣ ሱፐርቫይዘሮች እና ታይም ኪፐሮች ተመሳሳይ የሆነና በቅጽበት ወደ Firebase የሚላክ የጣት አሻራ እና ፊት መለያ መመዝገቢያ።"
                : "Role-synchronized attendance capture utilizing simulated secure biometric signatures and real-time geofence tracking. Identical deployment across all sub-applications."}
            </p>
          </div>
        </div>

        {/* Master Controls */}
        <div className="flex items-center space-x-2 z-10 shrink-0">
          <button
            onClick={() => setIsSoundEnabled(!isSoundEnabled)}
            className={`p-3 rounded-xl border transition-all cursor-pointer ${
              isSoundEnabled 
                ? "bg-slate-800 border-slate-700 text-emerald-400 hover:bg-slate-750" 
                : "bg-slate-900 border-slate-800 text-slate-500"
            }`}
            title="Toggle Audio Feedback"
          >
            {isSoundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>

          <button
            onClick={() => setShowHelp(!showHelp)}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs font-bold rounded-xl flex items-center space-x-1.5 cursor-pointer transition-all text-slate-300"
          >
            <HelpCircle size={15} className="text-red-400" />
            <span>{isAmharic ? "መመሪያ" : "Kiosk Policy"}</span>
          </button>

          <button
            onClick={() => setShowConfig(!showConfig)}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs font-bold rounded-xl flex items-center space-x-1.5 cursor-pointer transition-all text-slate-300"
          >
            <Settings size={15} className="text-slate-400" />
            <span>{isAmharic ? "ራዲየስ ቀይር" : "Config"}</span>
          </button>
        </div>
      </div>

      {/* ONLINE/OFFLINE FLOATING WARNING BANNER */}
      {!isOnline && (
        <div className="bg-amber-600 text-white font-extrabold px-5 py-3 rounded-2xl flex items-center justify-between shadow-md text-xs animate-pulse border border-amber-500">
          <div className="flex items-center space-x-2">
            <WifiOff size={16} />
            <span>
              {isAmharic 
                ? `ከመስመር ውጭ ሁነታ፡ የባዮሜትሪክ መዛግብት በአካባቢያዊ ቋት ውስጥ ይቀመጣሉ። (${offlineQueue.length} መዝገቦች ተሰብስበዋል)`
                : `TERMINAL OFFLINE: Biometric scans are being queued securely inside internal local storage. (${offlineQueue.length} records buffered)`}
            </span>
          </div>
          <button 
            onClick={handleToggleOnline}
            className="bg-white text-amber-900 hover:bg-amber-50 px-3 py-1 rounded-lg font-black transition-colors cursor-pointer text-[10px]"
          >
            {isAmharic ? "ወደ መስመር መልስ" : "CONNECT ONLINE"}
          </button>
        </div>
      )}

      {/* GEOFENCE AND CONFIGURATION DRAWER */}
      {showConfig && (
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-5 text-xs animate-fadeIn">
          <div className="space-y-1">
            <label className="font-extrabold text-slate-700 block">{isAmharic ? "የሳይቱ መካከለኛ ላቲቲዩድ" : "Geofence Center Lat"}</label>
            <input 
              type="number" 
              step="0.0001"
              value={geofenceLat}
              onChange={e => setGeofenceLat(parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono text-slate-850 focus:bg-white focus:border-red-500 focus:outline-none font-bold"
            />
          </div>
          <div className="space-y-1">
            <label className="font-extrabold text-slate-700 block">{isAmharic ? "የሳይቱ መካከለኛ ሎንጊቲዩድ" : "Geofence Center Lng"}</label>
            <input 
              type="number" 
              step="0.0001"
              value={geofenceLng}
              onChange={e => setGeofenceLng(parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono text-slate-850 focus:bg-white focus:border-red-500 focus:outline-none font-bold"
            />
          </div>
          <div className="space-y-1">
            <label className="font-extrabold text-slate-700 block">{isAmharic ? "የተፈቀደ የጂኦፌንስ ክልል (ሜትር)" : "Allowed Boundary Radius (m)"}</label>
            <input 
              type="number" 
              value={allowedRadius}
              onChange={e => setAllowedRadius(parseInt(e.target.value) || 0)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono text-slate-850 focus:bg-white focus:border-red-500 focus:outline-none font-bold"
            />
          </div>
          <div className="space-y-1 flex flex-col justify-end">
            <button
              onClick={() => {
                setGeofenceLat(9.0049);
                setGeofenceLng(38.7783);
                setAllowedRadius(150);
                setShowConfig(false);
              }}
              className="w-full bg-slate-900 text-white font-extrabold py-3 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {isAmharic ? "ወደ ቀድሞው መልስ" : "Reset Default Digital Construction ERP Geofence"}
            </button>
          </div>
        </div>
      )}

      {/* POLICY RULES DRAWER */}
      {showHelp && (
        <div className="bg-red-50/50 border border-red-100 rounded-3xl p-6 text-slate-800 text-xs space-y-4 leading-relaxed animate-fadeIn">
          <div className="flex items-center space-x-2 text-red-700 font-extrabold">
            <ShieldCheck size={18} />
            <span>{isAmharic ? "የባዮሜትሪክ መገኘት እና ፖሊሲ ደንቦች" : "Biometric Integrity & Kiosk Policies"}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1.5 bg-white p-4 rounded-2xl border border-red-150">
              <span className="font-black text-red-900 block">{isAmharic ? "፩. አውቶማቲክ ሰራተኛ መለያ" : "1. Zero Name Searching Policy"}</span>
              <p className="text-slate-600">
                {isAmharic 
                  ? "ሰራተኞች በማያ ገጹ ላይ ስማቸውን መፈለግ ወይም መምረጥ አያስፈልጋቸውም። መግቢያ ወይም መውጫ መርጠው ጣታቸውን መቃኘት ብቻ በቂ ነው።"
                  : "Employees do not search or select their names. The physical reader identifies them dynamically against pre-stored biometric templates (1:N verification match)."}
              </p>
            </div>
            <div className="space-y-1.5 bg-white p-4 rounded-2xl border border-red-150">
              <span className="font-black text-red-900 block">{isAmharic ? "፪. የጂኦፌንስ ደህንነት ማረጋገጫ" : "2. Hardware Geofence Lock"}</span>
              <p className="text-slate-600">
                {isAmharic
                  ? "አሻራ በሚነበብበት ቅጽበት የጂፒኤስ መጋጠሚያ ይወሰዳል። ከተፈቀደው የግንባታ ክልል ውጭ ከሆነ ምዝገባው ውድቅ ይደረጋል።"
                  : "Device telemetry checks GPS location at the millisecond of scan. If coordinates reside outside the authorized project perimeter, authorization is denied."}
              </p>
            </div>
            <div className="space-y-1.5 bg-white p-4 rounded-2xl border border-red-150">
              <span className="font-black text-red-900 block">{isAmharic ? "፫. ድርብ መግቢያ/መውጫ መከላከል" : "3. Duplicate Prevention Engine"}</span>
              <p className="text-slate-600">
                {isAmharic
                  ? "አንድ ሰራተኛ በቀን ውስጥ ከአንድ ጊዜ በላይ መግባት ወይም መውጣት አይችልም። መውጫ ለመመዝገብ ደግሞ የግድ የጠዋት መግቢያ መኖር አለበት።"
                  : "System prevents duplicate check-ins and check-outs on the same shift date. Checkout is dynamically rejected unless a matching morning check-in is logged."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. CORE LAYOUT: KIOSK CONTAINER AND EMULATOR CONTROLS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* KIOSK MAIN PANEL (COL-SPAN-8) */}
        <div className="lg:col-span-8 flex flex-col justify-between bg-slate-900 text-white rounded-3xl border border-slate-800 p-6 shadow-2xl relative min-h-[500px]">
          
          {/* Confirmation Alert HUD on Top */}
          {confirmationOverlay && (
            <div className={`absolute inset-x-6 top-6 z-30 p-5 rounded-2xl border text-slate-100 flex items-start gap-4 shadow-xl animate-fadeIn ${
              confirmationOverlay.status === "success"
                ? "bg-emerald-950/95 border-emerald-500/30 text-emerald-100"
                : "bg-red-950/95 border-red-500/30 text-red-100"
            }`}>
              <div className="shrink-0 mt-0.5">
                {confirmationOverlay.status === "success" ? (
                  <CheckCircle size={32} className="text-emerald-400" />
                ) : (
                  <AlertCircle size={32} className="text-red-400" />
                )}
              </div>
              
              <div className="flex-1 space-y-1">
                <h4 className="font-black text-base">
                  {confirmationOverlay.status === "success"
                    ? (isAmharic ? "መዝገብ በተሳካ ሁኔታ ተቀምጧል!" : "Attendance Recorded Successfully")
                    : (isAmharic ? "ማረጋገጫው አልተሳካም!" : "Verification Failed")}
                </h4>
                
                {confirmationOverlay.worker && (
                  <div className="flex items-center gap-3 py-1.5 my-1.5 border-t border-b border-white/10">
                    <img 
                      src={confirmationOverlay.worker.photo || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop"} 
                      alt={confirmationOverlay.worker.name} 
                      className="w-10 h-10 rounded-full object-cover border border-white/20"
                      referrerPolicy="no-referrer"
                    />
                    <div className="text-xs">
                      <span className="font-extrabold block">{confirmationOverlay.worker.name}</span>
                      <span className="text-white/60 text-[10px] block">{confirmationOverlay.worker.id} • {confirmationOverlay.worker.trade}</span>
                    </div>
                  </div>
                )}

                {confirmationOverlay.message && (
                  <p className="text-xs text-white/90">{confirmationOverlay.message}</p>
                )}

                {confirmationOverlay.reason && (
                  <p className="text-xs text-red-300 font-extrabold flex items-center gap-1.5">
                    <AlertTriangle size={14} />
                    <span>{confirmationOverlay.reason}</span>
                  </p>
                )}

                {confirmationOverlay.time && (
                  <span className="text-[10px] font-mono text-white/50 block pt-1">
                    {isAmharic ? "የተመዘገበበት ሰዓት፡ " : "Timestamp: "} {confirmationOverlay.time}
                  </span>
                )}
              </div>

              <button 
                onClick={() => setConfirmationOverlay(null)}
                className="text-white/60 hover:text-white font-extrabold text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
              >
                {isAmharic ? "ዝጋ" : "Dismiss"}
              </button>
            </div>
          )}

          {/* KIOSK SCREEN HEADER */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-5">
            {/* Logo and Project metadata */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center font-black text-white tracking-tighter text-sm shadow-md shadow-red-600/30">
                Digital Construction ERP
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 block leading-none">
                  Digital Construction ERP CONSTRUCTION GROUP
                </span>
                <h3 className="text-lg font-black tracking-tight mt-1">
                  {isAmharic ? "ዲጂታል ኮንስትራክሽን ERP ቦሌ ሃይትስ ግንባታ" : "Digital Bole Heights Project"}
                </h3>
              </div>
            </div>

            {/* Current Site Location HUD */}
            <div className="bg-slate-950/80 px-4 py-2 rounded-2xl border border-slate-800 text-xs font-mono text-slate-400 space-y-0.5">
              <div className="flex items-center gap-1.5">
                <Building2 size={13} className="text-red-500" />
                <span className="text-white font-bold">{isAmharic ? "ግንባታ፡ ታወር ኤ (Tower A)" : "Building: Tower A"}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px]">
                <Compass size={12} className="text-slate-500" />
                <span>{isAmharic ? "ፎቅ፡ ፬ኛ ፎቅ | ዞን፡ ዞን ቢ" : "Floor: 4th Floor | Zone: Zone B"}</span>
              </div>
            </div>
          </div>

          {/* CENTRAL TERMINAL DISPLAY WITH HARDWARE TOUCH BUTTON */}
          <div className="flex flex-col items-center justify-center py-8 space-y-6">
            
            {/* Real Time ticking Clock Display */}
            <div className="text-center space-y-1">
              <div className="text-3xl sm:text-5xl font-black font-mono tracking-tight text-white flex items-center justify-center gap-2">
                <Clock className="text-red-500 shrink-0" size={28} />
                <span>{currentTime.toLocaleTimeString("en-US", { hour12: true })}</span>
              </div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest pt-1">
                {currentTime.toLocaleDateString("en-US", { 
                  weekday: "long", 
                  year: "numeric", 
                  month: "long", 
                  day: "numeric" 
                })}
              </p>
              
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-[10px] font-bold uppercase tracking-wider mt-2 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                <span>{isAmharic ? "የሳይት ሁኔታ፡ ንቁ (በሰዓቱ)" : "Project Status: Active & On Schedule"}</span>
              </div>
            </div>

            {/* Large Biometric Scanning Circle Button */}
            <div className="relative flex items-center justify-center py-4">
              {/* Spinning scanning waves */}
              <div className={`absolute w-56 h-56 rounded-full border-2 border-dashed transition-all duration-700 ${
                isScanning ? "border-red-500 animate-[spin_5s_linear_infinite]" : "border-slate-800"
              }`}></div>
              <div className={`absolute w-52 h-52 rounded-full border border-double transition-all duration-1000 ${
                isScanning ? "border-red-400/30 animate-[spin_10s_linear_infinite_reverse]" : "border-slate-850"
              }`}></div>

              <button
                onClick={handleBiometricTrigger}
                disabled={isScanning}
                className={`relative w-40 h-40 rounded-full flex flex-col items-center justify-center transition-all duration-300 border shadow-2xl group cursor-pointer ${
                  isScanning
                    ? "bg-slate-950 border-red-500 shadow-red-500/10"
                    : "bg-slate-950/80 hover:bg-slate-950 border-red-600/30 hover:border-red-500 hover:shadow-red-500/5 active:scale-95"
                }`}
              >
                {/* Simulated scanner horizontal laser beam */}
                {isScanning && (
                  <div className="absolute w-36 h-0.5 bg-red-500 left-2 shadow-[0_0_10px_rgba(239,68,68,0.9)] animate-[bounce_1.2s_infinite] z-20"></div>
                )}
                {isScanning && (
                  <div className="absolute inset-0 bg-red-600/5 rounded-full animate-ping pointer-events-none"></div>
                )}

                {verificationMethod === "fingerprint" ? (
                  <Fingerprint 
                    size={64} 
                    className={`transition-transform duration-300 ${
                      isScanning ? "text-red-500 scale-110 drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]" : "text-red-600 group-hover:scale-105"
                    }`}
                  />
                ) : (
                  <ScanLine 
                    size={64} 
                    className={`transition-transform duration-300 ${
                      isScanning ? "text-red-500 scale-110 drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]" : "text-red-600 group-hover:scale-105"
                    }`}
                  />
                )}

                <span className="text-[11px] font-black tracking-widest text-slate-300 mt-3 block uppercase font-mono group-hover:text-white">
                  {isScanning 
                    ? (isAmharic ? "በመፈለግ ላይ..." : "AUTHENTICATING...") 
                    : (isAmharic ? "አሻራ / ፊት መለያ" : "Fingerprint / Face")}
                </span>
                
                <span className="text-[8px] text-slate-500 font-extrabold uppercase block tracking-widest mt-0.5">
                  {isScanning ? (isAmharic ? "እባክዎን ይጠብቁ" : "Wait...") : (isAmharic ? "ለመመዝገብ ይንኩ" : "Tap to Scan")}
                </span>
              </button>
            </div>

            {/* LIVE HARDWARE SCANNING PROGRESS */}
            {isScanning && (
              <div className="w-56 text-center space-y-1.5 animate-fadeIn">
                <div className="flex justify-between text-[10px] text-slate-400 font-mono font-bold">
                  <span>{isAmharic ? "ባዮሜትሪክ ቅኝት" : "BIOMETRIC STREAM"}</span>
                  <span>{Math.round(scanProgress)}%</span>
                </div>
                <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="bg-red-500 h-full transition-all duration-150" 
                    style={{ width: `${scanProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

          </div>

          {/* BELOW THE BUTTON: CHECK IN / CHECK OUT MODE SELECTORS */}
          <div className="grid grid-cols-2 gap-4 border-t border-slate-800 pt-5 mt-4">
            
            <button
              onClick={() => {
                setKioskMode("check-in");
                playSound("scan");
              }}
              className={`py-4 rounded-2xl flex flex-col items-center justify-center gap-1 border transition-all cursor-pointer ${
                kioskMode === "check-in"
                  ? "bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-900/10"
                  : "bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white"
              }`}
            >
              <LogIn size={20} className={kioskMode === "check-in" ? "text-white" : "text-slate-500"} />
              <span className="font-extrabold text-sm">{isAmharic ? "መግቢያ (Check In)" : "Check In"}</span>
              <span className="text-[9px] opacity-60 font-medium font-mono uppercase tracking-wider">
                {isAmharic ? "የጠዋት ፈረቃ መግቢያ" : "Morning Shift Clock In"}
              </span>
            </button>

            <button
              onClick={() => {
                setKioskMode("check-out");
                playSound("scan");
              }}
              className={`py-4 rounded-2xl flex flex-col items-center justify-center gap-1 border transition-all cursor-pointer ${
                kioskMode === "check-out"
                  ? "bg-red-600 border-red-500 text-white shadow-lg shadow-red-900/10"
                  : "bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white"
              }`}
            >
              <LogOut size={20} className={kioskMode === "check-out" ? "text-white" : "text-slate-500"} />
              <span className="font-extrabold text-sm">{isAmharic ? "መውጫ (Check Out)" : "Check Out"}</span>
              <span className="text-[9px] opacity-60 font-medium font-mono uppercase tracking-wider">
                {isAmharic ? "የማታ ፈረቃ መውጫ" : "Evening Shift Clock Out"}
              </span>
            </button>

          </div>

        </div>

        {/* HARWARE BIOMETRIC EMULATOR PANEL (COL-SPAN-4) */}
        <div className="lg:col-span-4 flex flex-col justify-between bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-5">
          
          <div className="space-y-4">
            <div className="border-b border-slate-150 pb-3">
              <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                <Settings className="text-red-600 animate-spin-slow" size={16} />
                <span>{isAmharic ? "የመሳሪያ አሻራ አስመሳይ (Emulator)" : "Biometric Hardware Emulator"}</span>
              </h3>
              <p className="text-[10px] text-slate-400 mt-1">
                {isAmharic
                  ? "የጣት አሻራ መሣሪያውን አሠራር ለመፈተሽና ለመምሰል ይህንን የቁጥጥር ፓነል ይጠቀሙ።"
                  : "Simulate actual hardware biometric reader touches, geofence positions, or database template mismatches."}
              </p>
            </div>

            {/* 1. Simulated Worker finger Selection */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-black text-slate-400 block font-mono">
                {isAmharic ? "፩. በፓዱ ላይ የሚቀመጠው አሻራ (ሰራተኛ)" : "1. Sim Finger / Face Template"}
              </label>
              <select
                value={simulatedWorkerId}
                onChange={e => setSimulatedWorkerId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-slate-800 text-xs focus:bg-white focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              >
                {workers.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.id})
                  </option>
                ))}
              </select>

              {/* Mini Selected Worker Preview */}
              {(() => {
                const selectedW = workers.find(w => w.id === simulatedWorkerId);
                if (!selectedW) return null;
                const hierarchy = getWorkerMetaData(selectedW.id);
                return (
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center gap-3 mt-1.5 animate-fadeIn">
                    <img 
                      src={selectedW.photo || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop"} 
                      alt={selectedW.name} 
                      className="w-9 h-9 rounded-full object-cover border border-slate-200"
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0 text-[10px]">
                      <span className="font-extrabold text-slate-850 block truncate leading-tight">{selectedW.name}</span>
                      <span className="text-slate-400 block font-mono mt-0.5">{selectedW.trade} • {hierarchy.team}</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* 2. Verification Method */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-black text-slate-400 block font-mono">
                {isAmharic ? "፪. የባዮሜትሪክ መለያ ዘዴ" : "2. Biometric Scan Mode"}
              </label>
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1 rounded-xl border border-slate-100">
                <button
                  type="button"
                  onClick={() => setVerificationMethod("fingerprint")}
                  className={`py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                    verificationMethod === "fingerprint"
                      ? "bg-slate-900 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-150"
                  }`}
                >
                  <Fingerprint size={13} />
                  <span>{isAmharic ? "የጣት አሻራ" : "Fingerprint"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setVerificationMethod("face")}
                  className={`py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                    verificationMethod === "face"
                      ? "bg-slate-900 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-150"
                  }`}
                >
                  <ScanLine size={13} />
                  <span>{isAmharic ? "የፊት ገጽታ" : "Facial Scan"}</span>
                </button>
              </div>
            </div>

            {/* 3. GPS Geolocation Presets */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-black text-slate-400 block font-mono">
                {isAmharic ? "፫. የሰራተኛው የጂፒኤስ መገኛ" : "3. GPS Telemetry Position"}
              </label>
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1 rounded-xl border border-slate-100">
                <button
                  type="button"
                  onClick={() => setGpsPreset("inside")}
                  className={`py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer ${
                    gpsPreset === "inside"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-white text-slate-600 border border-slate-200/60"
                  }`}
                >
                  <MapPin size={12} />
                  <span>{isAmharic ? "ሳይት ውስጥ" : "Inside Site"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setGpsPreset("outside")}
                  className={`py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer ${
                    gpsPreset === "outside"
                      ? "bg-red-600 text-white shadow-sm"
                      : "bg-white text-slate-600 border border-slate-200/60"
                  }`}
                >
                  <AlertCircle size={12} />
                  <span>{isAmharic ? "ከሳይት ውጭ" : "Outside Site"}</span>
                </button>
              </div>
              <div className="text-[10px] text-slate-400 font-mono text-center">
                {gpsPreset === "inside"
                  ? (isAmharic ? "✓ ከፕሮጀክቱ ማዕከል ርቀት፡ 22ሜ" : "✓ Safe distance: 22m from Tower A")
                  : (isAmharic ? "✗ ከፕሮጀክቱ ማዕከል ርቀት፡ 4.1ኪሜ" : "✗ Violation: 4.1km away (Bole Airport)")}
              </div>
            </div>

            {/* 4. Emulate Custom Failures */}
            <div className="space-y-2 bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-black text-slate-500 font-mono">
                  {isAmharic ? "የማረጋገጫ ስህተት ፍጠር (Force Fail)" : "Emulate Verification Failures"}
                </span>
                <input 
                  type="checkbox" 
                  checked={forceFail}
                  onChange={e => setForceFail(e.target.checked)}
                  className="w-4 h-4 text-red-600 accent-red-600 rounded cursor-pointer"
                />
              </div>

              {forceFail && (
                <div className="space-y-1.5 animate-fadeIn pt-1.5 border-t border-slate-200 text-[10px]">
                  <label className="text-slate-500 block font-bold">{isAmharic ? "የስህተቱ አይነት፡" : "Select Failure Type:"}</label>
                  <div className="flex gap-2">
                    <label className="flex items-center gap-1.5 cursor-pointer flex-1 bg-white p-1.5 rounded-lg border border-slate-200 font-semibold">
                      <input 
                        type="radio" 
                        name="failReason" 
                        checked={failReasonPreset === "corrupted"}
                        onChange={() => setFailReasonPreset("corrupted")}
                        className="accent-red-600"
                      />
                      <span>{isAmharic ? "አብነት የተበላሸ" : "Corrupted Template"}</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer flex-1 bg-white p-1.5 rounded-lg border border-slate-200 font-semibold">
                      <input 
                        type="radio" 
                        name="failReason" 
                        checked={failReasonPreset === "unregistered"}
                        onChange={() => setFailReasonPreset("unregistered")}
                        className="accent-red-600"
                      />
                      <span>{isAmharic ? "ያልተመዘገበ ሰራተኛ" : "Unenrolled / Unknown"}</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* REAL TIME TERMINAL DEEP CONSOLE LOGS */}
          <div className="bg-slate-950 text-slate-200 rounded-2xl p-4 border border-slate-850 flex flex-col justify-between h-[180px]">
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center space-x-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
                  <span className="font-mono text-[9px] font-black tracking-widest text-slate-400 uppercase">
                    {isAmharic ? "የቀጥታ ፍተሻ ኮንሶል" : "Live Kiosk Stream Console"}
                  </span>
                </div>
                <Locate size={12} className="text-slate-500" />
              </div>

              <div className="font-mono text-[9px] space-y-1.5 max-h-[100px] overflow-y-auto pr-1 leading-normal text-slate-300">
                {terminalLogs.length === 0 ? (
                  <span className="text-slate-600 italic block py-4 text-center">
                    {isAmharic ? "ተርሚናሉ ዝግጁ ነው..." : "[Terminal initialized. Standing by for scan...]"}
                  </span>
                ) : (
                  terminalLogs.map((log, index) => (
                    <div key={index} className="flex items-start gap-1">
                      <span className="text-red-500 shrink-0">▶</span>
                      <span>{log}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <button
              onClick={() => setTerminalLogs([])}
              className="w-full py-1.5 bg-slate-900 hover:bg-slate-850 text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest rounded-lg cursor-pointer transition-colors"
            >
              {isAmharic ? "ኮንሶሉን አጽዳ" : "Clear Stream Console"}
            </button>
          </div>

        </div>

      </div>

      {/* 3. SHARED LIVE ATTENDANCE TABLE WITH ALL REQUIRED COLUMNS */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-5" id="shared-attendance-table-container">
        
        {/* Table header & filters */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 border-b border-slate-150 pb-5">
          <div className="space-y-1">
            <h3 className="font-black text-lg text-slate-900 flex items-center gap-2">
              <Database className="text-red-600" size={20} />
              <span>{isAmharic ? "የጋራ ባዮሜትሪክ መገኘት ሰንጠረዥ" : "Live Shared Attendance Database Table"}</span>
            </h3>
            <p className="text-xs text-slate-500">
              {isAmharic
                ? "በእያንዳንዱ ተርሚናል በኩል በጣት አሻራ ወይም በፊታቸው የተመዘገቡ የሁሉም ሰራተኞች የቀጥታ መገኘት መዝገብ።"
                : "Real-time attendance roster instantly synchronized across Time Keeper, Supervisor, Team Leader, and Gang Chief modules."}
            </p>
          </div>

          {/* Filters Controls */}
          <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto text-xs">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder={isAmharic ? "በስም ፣ መለያ ወይም ሙያ ይፈልጉ..." : "Search by name, ID or trade..."}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs focus:bg-white focus:border-red-500 focus:outline-none"
              />
            </div>

            {/* Team Filter */}
            <div className="sm:w-56">
              <select
                value={filterTeam}
                onChange={e => setFilterTeam(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold text-slate-700 focus:bg-white focus:border-red-500 focus:outline-none"
              >
                {teamNames.map(name => (
                  <option key={name} value={name}>
                    {isAmharic 
                      ? (name === "All" ? "ሁሉም ቡድኖች" : name) 
                      : (name === "All" ? "All Construction Teams" : name)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* High Density Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-medium text-slate-600 min-w-[1500px]">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-extrabold uppercase tracking-wider text-[10px] bg-slate-50/50">
                <th className="py-3 px-4 shrink-0">{isAmharic ? "ሰራተኛ" : "Employee"}</th>
                <th className="py-3 px-4">{isAmharic ? "የሙያ ዘርፍ" : "Trade Specialty"}</th>
                <th className="py-3 px-4">{isAmharic ? "የስራ ቡድን" : "Construction Team"}</th>
                <th className="py-3 px-4">{isAmharic ? "ጋንግ ቺፍ" : "Gang Chief"}</th>
                <th className="py-3 px-4">{isAmharic ? "ቡድን መሪ" : "Team Leader"}</th>
                <th className="py-3 px-4">{isAmharic ? "ሱፐርቫይዘር" : "Supervisor"}</th>
                <th className="py-3 px-4">{isAmharic ? "ግንባታ / ፎቅ / ዞን" : "Building / FL / Zone"}</th>
                <th className="py-3 px-4 font-mono">{isAmharic ? "መግቢያ" : "Check-In"}</th>
                <th className="py-3 px-4 font-mono">{isAmharic ? "መውጫ" : "Check-Out"}</th>
                <th className="py-3 px-4 text-center">{isAmharic ? "የሰሩት ሰዓት" : "Worked Hours"}</th>
                <th className="py-3 px-4 text-center">{isAmharic ? "ትርፍ ሰዓት" : "Overtime"}</th>
                <th className="py-3 px-4 text-center">{isAmharic ? "ሁኔታ" : "Attendance Status"}</th>
                <th className="py-3 px-4">{isAmharic ? "የጂፒኤስ ሁኔታ" : "GPS Geofence Status"}</th>
                <th className="py-3 px-4">{isAmharic ? "መለያ ዘዴ" : "Verification Method"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-12 text-center text-slate-400 font-bold italic">
                    {isAmharic ? "ምንም አይነት የተጣጣመ የባዮሜትሪክ መገኘት መዝገብ አልተገኘም።" : "No matching biometric records found today."}
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => {
                  const workerObj = workers.find(w => w.id === record.workerId);
                  const hierarchy = getWorkerMetaData(record.workerId);
                  
                  return (
                    <tr key={record.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Employee Photo, Name, ID */}
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          <img 
                            src={workerObj?.photo || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop"} 
                            alt={record.workerName} 
                            className="w-9 h-9 rounded-full border border-slate-200 object-cover shrink-0"
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <span className="font-black text-slate-900 block text-xs leading-none">{record.workerName}</span>
                            <span className="text-[10px] text-slate-400 block font-mono mt-1">{record.workerId}</span>
                          </div>
                        </div>
                      </td>

                      {/* Trade specialty */}
                      <td className="py-3 px-4 font-bold text-slate-700">{record.trade}</td>

                      {/* Team Name */}
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-1 bg-red-50 text-red-750 rounded-lg text-[10px] font-black uppercase">
                          {hierarchy.team}
                        </span>
                      </td>

                      {/* Gang Chief */}
                      <td className="py-3 px-4 text-slate-600 font-semibold">{hierarchy.gangChief}</td>

                      {/* Team Leader */}
                      <td className="py-3 px-4 text-slate-600 font-semibold">{hierarchy.teamLeader}</td>

                      {/* Supervisor */}
                      <td className="py-3 px-4 text-slate-600 font-semibold">{hierarchy.supervisor}</td>

                      {/* Building, floor, zone */}
                      <td className="py-3 px-4 font-bold text-slate-800">
                        <div>
                          <span>Tower A</span>
                          <span className="text-[9px] text-slate-400 block font-normal mt-0.5">
                            Floor {record.floor || 4} • {record.zone || "Zone B"}
                          </span>
                        </div>
                      </td>

                      {/* Check-In time */}
                      <td className="py-3 px-4 font-mono font-black text-slate-800">
                        {record.checkIn ? (
                          <span className="flex items-center gap-1 text-emerald-600">
                            <LogIn size={12} />
                            <span>{record.checkIn}</span>
                          </span>
                        ) : (
                          <span className="text-slate-300">--:--</span>
                        )}
                      </td>

                      {/* Check-Out time */}
                      <td className="py-3 px-4 font-mono font-black text-slate-800">
                        {record.checkOut ? (
                          <span className="flex items-center gap-1 text-red-600">
                            <LogOut size={12} />
                            <span>{record.checkOut}</span>
                          </span>
                        ) : (
                          <span className="text-slate-300">--:--</span>
                        )}
                      </td>

                      {/* Working hours */}
                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-800">
                        {record.workingHours && record.workingHours > 0 ? `${record.workingHours} hrs` : "-"}
                      </td>

                      {/* Overtime */}
                      <td className="py-3 px-4 text-center font-mono font-black text-red-600">
                        {record.overtime && record.overtime > 0 ? `+${record.overtime} hrs` : "-"}
                      </td>

                      {/* Attendance Status Badge */}
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-3 py-1 rounded-full font-black text-[10px] uppercase ${
                          record.status === "Present" 
                            ? "bg-emerald-150 text-emerald-800 border border-emerald-200" 
                            : record.status === "Late" 
                              ? "bg-amber-150 text-amber-800 border border-amber-200" 
                              : "bg-red-50 text-red-700 border border-red-100"
                        }`}>
                          {isAmharic 
                            ? (record.status === "Present" ? "የተገኘ" : record.status === "Late" ? "የዘገየ" : "የቀረ") 
                            : record.status}
                        </span>
                      </td>

                      {/* GPS Geofence status */}
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-1.5 font-bold text-slate-800">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                          <div className="text-[10px]">
                            <span className="text-emerald-700 uppercase tracking-wide block">
                              {isAmharic ? "ክልል ውስጥ (Inside)" : "Inside Geofence"}
                            </span>
                            <span className="text-[9px] text-slate-400 font-mono block font-normal">
                              9.0048°N, 38.7781°E
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Verification method */}
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-[10px] font-bold">
                          {record.method === AttendanceMethod.FINGERPRINT ? (
                            <>
                              <Fingerprint size={12} className="text-red-500" />
                              <span>{isAmharic ? "የጣት አሻራ" : "Fingerprint"}</span>
                            </>
                          ) : record.method === AttendanceMethod.FACE_RECOGNITION ? (
                            <>
                              <ScanLine size={12} className="text-red-500" />
                              <span>{isAmharic ? "የፊት መለያ" : "Face Recognition"}</span>
                            </>
                          ) : (
                            <>
                              <Activity size={12} className="text-slate-400" />
                              <span>{record.method || "System Sync"}</span>
                            </>
                          )}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* 4. FIREBASE CLOUD FIRESTORE AUDIT TRAIL LOGS */}
      <div className="bg-slate-900 text-slate-200 rounded-3xl p-6 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-2.5">
            <History className="text-red-500" size={20} />
            <div>
              <h3 className="font-black text-base text-white">
                {isAmharic ? "ደህንነቱ የተጠበቀ የባዮሜትሪክ ኦዲት መዝገብ" : "Secure Firebase Firestore Biometric Audit Logs"}
              </h3>
              <p className="text-[10px] text-slate-400">
                {isAmharic 
                  ? "በ SHA-256 ኢንክሪፕት የተደረጉና ከማንኛውም ማጭበርበር ነጻ የሆኑ የሁሉም የመገኘት እንቅስቃሴዎች መዛግብት።"
                  : "Immutable cryptographic transactions streamed directly into Cloud Firestore for regulatory audits and payroll validation."}
              </p>
            </div>
          </div>
          <span className="text-[9px] uppercase font-mono font-black bg-slate-800 px-3 py-1 rounded-xl text-red-400 border border-slate-700">
            {isAmharic ? "ኢንክሪፕት የተደረገ (SHA-256)" : "SHA-256 Cloud Ledger Active"}
          </span>
        </div>

        <div className="space-y-2.5 max-h-[250px] overflow-y-auto pr-1">
          {biometricAuditLogs.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs italic font-mono">
              {isAmharic 
                ? "[ምንም የባዮሜትሪክ ኦዲት መዝገብ እስካሁን አልተፈጠረም። ለመፈተሽ በላይኛው አስመሳይ (Emulator) በኩል አሻራ ያስነብቡ።]" 
                : "[No transactions generated yet. Trigger physical biometric scans above to populate secure Firestore logs.]"}
            </div>
          ) : (
            biometricAuditLogs.map((log) => (
              <div 
                key={log.id} 
                className="bg-slate-950 p-4 rounded-2xl border border-slate-800 font-mono text-[10px] leading-relaxed flex flex-col md:flex-row md:items-center justify-between gap-3 animate-fadeIn hover:border-slate-700/80 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2 flex-wrap">
                    <span className="text-red-400 font-black uppercase bg-red-950 px-2 py-0.5 rounded border border-red-900/30">
                      [ {log.status.toUpperCase()} ]
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-100 font-black text-xs">{log.workerName}</span>
                    <span className="text-slate-500">({log.workerId})</span>
                  </div>
                  <div className="text-slate-500 text-[9px] flex flex-wrap gap-x-2 gap-y-1 pt-1">
                    <span>Time: <strong className="text-slate-300">{log.timestamp}</strong></span>
                    <span>|</span>
                    <span>Method: <strong className="text-slate-300">{log.method}</strong></span>
                    <span>|</span>
                    <span>Telemetry: <strong className="text-slate-300">{log.coordinates.lat.toFixed(5)}, {log.coordinates.lng.toFixed(5)} ({log.gpsStatus})</strong></span>
                  </div>
                  <div className="text-slate-500 text-[9px] flex flex-wrap gap-x-2">
                    <span>Project: <strong className="text-slate-300">{log.project}</strong></span>
                    <span>|</span>
                    <span>Tower: <strong className="text-slate-300">{log.building}</strong></span>
                    <span>|</span>
                    <span>FL: <strong className="text-slate-300">{log.floor}</strong></span>
                    <span>|</span>
                    <span>Zone: <strong className="text-slate-300">{log.zone}</strong></span>
                  </div>
                </div>

                <div className="text-left md:text-right shrink-0 bg-slate-900/50 p-2 rounded-xl border border-slate-850 md:min-w-[180px]">
                  <span className="text-[8px] text-slate-500 block uppercase font-black">Transaction Sign (SHA-255)</span>
                  <span className="text-emerald-400 font-black block mt-0.5 font-mono text-[9px]">{log.hash}</span>
                  <span className="text-[8px] text-slate-500 block mt-1">Operator: {log.verifiedBy}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
};
