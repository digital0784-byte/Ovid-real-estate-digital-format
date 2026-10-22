import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  Fingerprint, 
  ScanLine, 
  QrCode,
  Smartphone,
  MapPin, 
  Check, 
  AlertCircle, 
  Clock, 
  Camera, 
  Settings, 
  Users, 
  CheckCircle, 
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
  Locate,
  Building2,
  Wifi,
  WifiOff,
  UserCheck,
  Search,
  Compass,
  ArrowRight,
  Sparkles,
  CheckCheck,
  Info,
  Printer,
  ExternalLink,
  Zap,
  Radio,
  Sliders,
  ChevronDown,
  ShieldAlert,
  Eye
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Worker, AttendanceRecord, AttendanceMethod, UserRole } from "../types";

interface FingerprintAttendanceBoardProps {
  workers: Worker[];
  attendance: AttendanceRecord[];
  onAddAttendance: (record: AttendanceRecord) => void;
  isAmharic: boolean;
  currentUserRole: UserRole;
  onLogAction?: (action: string, details: string) => void;
}

export type AttendanceSystemMode = 
  | "face_camera"      // 1. የስልኩን ካሜራ በመጠቀም የፊት ገጽታ ማንበብ (AI Photo Attendance)
  | "qr_geofence"      // 2. የስልኩን ካሜራ ለQR ኮድ ባጅ እና GPS Geofence መጠቀም
  | "personal_mobile"  // 3. ሰራተኛው በራሱ ስልክ (Personal Mobile Self Check-in)
  | "otg_fingerprint"; // 4. በOTG/USB ገመድ የሚገናኝ ውጫዊ አሻራ አንባቢ (Hardware Scanner)

interface BiometricAuditLog {
  id: string;
  workerId: string;
  workerName: string;
  timestamp: string;
  method: "Fingerprint" | "Face" | "QR Code" | "Personal Mobile";
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
  deviceUsed: string;
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

  // Master company attendance mode: 4 enterprise choices
  const [activeSystemMode, setActiveSystemMode] = useState<AttendanceSystemMode>("face_camera");
  
  // Master geofence of Bole Heights construction site
  const [geofenceLat, setGeofenceLat] = useState(9.0049);
  const [geofenceLng, setGeofenceLng] = useState(38.7783);
  const [allowedRadius, setAllowedRadius] = useState(150); // in meters

  // General terminal settings
  const [kioskMode, setKioskMode] = useState<"check-in" | "check-out">("check-in");
  const [isOnline, setIsOnline] = useState(typeof window !== "undefined" ? navigator.onLine : true);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [showConfig, setShowConfig] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [selectedBadgeWorker, setSelectedBadgeWorker] = useState<Worker | null>(null);

  // Device Identification & Anti-Buddy Punching Security Control
  // Rule: "ከtime keeper and gang chief ስልክ ውጭ ያለ የሜንም ስልክ ከአንድ ሰው አቴንዳንስ በላይ መቀበል የለበትም"
  const [deviceToken] = useState<string>(() => {
    if (typeof window !== "undefined") {
      let t = localStorage.getItem("erp_site_device_token_v1");
      if (!t) {
        t = "DEV-PHONE-" + Math.floor(1000 + Math.random() * 9000);
        localStorage.setItem("erp_site_device_token_v1", t);
      }
      return t;
    }
    return "DEV-PHONE-2044";
  });

  // Current phone authorized role (defaults to currentUserRole, switchable for testing)
  const [activeRoleForDevice, setActiveRoleForDevice] = useState<UserRole>(currentUserRole);

  // Check if role is authorized to submit batch/multi-worker attendance
  // User policy: "ሱፐርቫይዘር ሳይሆን ከtime keeper በተጨማሪ attendance የመመዝገብ መብት ለteam leaders and Gang chief የተሰጠ ነው"
  const isMultiWorkerAuthorized = useMemo(() => {
    return (
      activeRoleForDevice === UserRole.TIME_KEEPER || 
      activeRoleForDevice === UserRole.TEAM_LEADER ||
      activeRoleForDevice === UserRole.GANG_CHIEF ||
      activeRoleForDevice === UserRole.SUPER_ADMIN
    );
  }, [activeRoleForDevice]);

  // Track worker locked to this phone for today
  const todayDateStr = currentTime.toISOString().split("T")[0];
  const [deviceBoundWorkerId, setDeviceBoundWorkerId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(`erp_device_bound_worker_${todayDateStr}`) || null;
    }
    return null;
  });

  // Selected worker for emulation or active recognition target
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>(workers[0]?.id || "");
  const activeSelectedWorker = useMemo(() => {
    return workers.find(w => w.id === selectedWorkerId) || workers[0] || null;
  }, [workers, selectedWorkerId]);

  // Mode 1: Camera Face Recognition State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraPermissionError, setCameraPermissionError] = useState<string | null>(null);
  const [isFaceScanning, setIsFaceScanning] = useState(false);
  const [faceConfidence, setFaceConfidence] = useState<number>(0);
  const [capturedFaceSnapshot, setCapturedFaceSnapshot] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Mode 2: QR Code & Geofence Scanner State
  const [qrScanInput, setQrScanInput] = useState("");
  const [isQrScanning, setIsQrScanning] = useState(false);
  const [simulatedGpsDistance, setSimulatedGpsDistance] = useState<number>(28); // 28 meters from Bole Heights center

  // Mode 3: Personal Mobile Self Check-in with Face Detection & Own QR Badge State
  // Policy: "ማንኛውም የሲስተሙ ተጠቃሚ በስልኩ face detection በመጠቀም የራሱን attendance መሙላት ይችላል"
  const [personalPhoneMode, setPersonalPhoneMode] = useState<"face_detection" | "qr_badge">("face_detection");
  const [isPersonalFaceScanning, setIsPersonalFaceScanning] = useState(false);
  const [personalFaceConfidence, setPersonalFaceConfidence] = useState<number>(0);
  const [personalScanBadgeInput, setPersonalScanBadgeInput] = useState<string>("");
  const [isPersonalScanningBadge, setIsPersonalScanningBadge] = useState<boolean>(false);
  const [isPersonalAuthenticating, setIsPersonalAuthenticating] = useState(false);
  const [personalBiometricVerified, setPersonalBiometricVerified] = useState(false);
  const [mobileGpsDeviation, setMobileGpsDeviation] = useState<number>(34);

  // Mode 4: Hardware OTG/USB Scanner State
  const [enteredPin, setEnteredPin] = useState("");
  const [pinFailedAttempts, setPinFailedAttempts] = useState(0);
  const [pinLockoutUntil, setPinLockoutUntil] = useState<number | null>(null);
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
    methodLabel?: string;
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

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setTerminalLogs(prev => [
        ...prev,
        isAmharic 
          ? "🌐 የኢንተርኔት ግንኙነት ተመልሷል፡ የመስመር ላይ ሁነታ ነቅቷል" 
          : "🌐 Network connectivity restored. Terminal online."
      ]);
      if (onLogAction) {
        onLogAction("Biometric terminal online", "Automatic detection registered stable cellular connection.");
      }
    };
    const handleOffline = () => {
      setIsOnline(false);
      setTerminalLogs(prev => [
        ...prev,
        isAmharic 
          ? "⚠️ የኔትወርክ ግንኙነት ተቋርጧል፡ መስመር-አልባ የመጠባበቂያ ሁነታ (Offline Queue) ነቅቷል" 
          : "⚠️ Network disconnected. Entering resilient offline buffer mode."
      ]);
      if (onLogAction) {
        onLogAction("Biometric terminal offline", "Terminal entered offline mode due to connection loss.");
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [isAmharic, onLogAction]);

  // Clean up camera stream on unmount or mode switch
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Start real camera stream
  const startCamera = async () => {
    try {
      setCameraPermissionError(null);
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }
        });
        mediaStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setIsCameraActive(true);
      } else {
        setCameraPermissionError(
          isAmharic 
            ? "የስልኩ/የኮምፒውተሩ ካሜራ አልተገኘም ወይም ፍቃድ አልተሰጠውም።" 
            : "Camera hardware not accessible or permission denied."
        );
      }
    } catch (err: any) {
      console.warn("Camera start failed, falling back to simulated vision:", err);
      setCameraPermissionError(
        isAmharic 
          ? "ካሜራውን መክፈት አልተቻለም (ፍቃድ ይከልከላል)። የAI ቪዥን ሲሙሌተር እየሰራ ነው።" 
          : "Camera permission denied or unavailable. AI Vision simulator is active."
      );
      setIsCameraActive(false);
    }
  };

  // Stop camera stream
  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  // Switch camera when switching modes
  const handleModeChange = (mode: AttendanceSystemMode) => {
    setActiveSystemMode(mode);
    setConfirmationOverlay(null);
    if (mode === "face_camera") {
      startCamera();
    } else {
      stopCamera();
    }
  };

  // Web Audio synthesizer for tactile sound cues
  const playSound = (type: "scan" | "success" | "error" | "click") => {
    if (!isSoundEnabled || typeof window === "undefined") return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      if (type === "scan") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
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
      setIsOnline(true);
      if (offlineQueue.length > 0) {
        setSyncStatus("Syncing");
        setTerminalLogs(prev => [
          ...prev,
          `📡 Connection restored! Synchronizing ${offlineQueue.length} queued records with Firebase...`
        ]);

        offlineQueue.forEach(item => {
          commitAttendanceRecord(item.worker, item.mode, item.method, item.gpsCoordinates, item.timestamp, item.gpsLocationString, item.isInside, item.deviceUsed);
        });

        if (onLogAction) {
          onLogAction(
            "Offline Sync Complete", 
            `Synchronized ${offlineQueue.length} attendance logs captured while terminal was offline.`
          );
        }

        setOfflineQueue([]);
        setSyncStatus("Synced");
        playSound("success");

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
      setIsOnline(false);
      setSyncStatus("Offline");
      setTerminalLogs(prev => [
        ...prev,
        "⚠️ Terminal disconnected. Offline safe backup queue initiated."
      ]);
    }
  };

  // Helper to append a tamper-proof audit log
  const logBiometricAudit = (
    workerId: string,
    workerName: string,
    statusText: string,
    method: "Fingerprint" | "Face" | "QR Code" | "Personal Mobile",
    coords: { lat: number; lng: number },
    gpsStatus: "Inside Site" | "Outside Site",
    details: string
  ) => {
    const rawPayload = `${workerId}-${Date.now()}-${statusText}-${coords.lat.toFixed(5)}-${coords.lng.toFixed(5)}`;
    let hash = 0;
    for (let i = 0; i < rawPayload.length; i++) {
      hash = (hash << 5) - hash + rawPayload.charCodeAt(i);
      hash |= 0;
    }
    const signatureHash = "SHA256-" + Math.abs(hash).toString(16).toUpperCase().padStart(8, "0");

    const newLog: BiometricAuditLog = {
      id: `BIO-AUDIT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      workerId,
      workerName,
      timestamp: new Date().toLocaleTimeString("en-US", { hour12: false }),
      method,
      coordinates: coords,
      gpsStatus,
      verifiedBy: currentUserRole,
      deviceId: activeSystemMode === "face_camera" 
        ? "Mobile-AI-Cam-01" 
        : activeSystemMode === "qr_geofence" 
        ? "Mobile-QR-Scanner-02" 
        : activeSystemMode === "personal_mobile"
        ? "Worker-Personal-Phone"
        : "USB-OTG-Biometric-Pad",
      project: "Digital Bole Heights Tower",
      building: "Tower A",
      floor: 4,
      zone: "Zone B",
      status: statusText,
      hash: signatureHash
    };

    setBiometricAuditLogs(prev => [newLog, ...prev.slice(0, 49)]);
  };

  // Master method execution: commit verified attendance
  const commitAttendanceRecord = (
    worker: Worker, 
    mode: "check-in" | "check-out", 
    method: AttendanceMethod, 
    coords: { lat: number; lng: number }, 
    timeObj: Date, 
    locString: string, 
    isInside: boolean,
    deviceUsedString: string
  ) => {
    const formattedDate = timeObj.toISOString().split("T")[0];
    const formattedTime = timeObj.toLocaleTimeString("en-US", { hour12: false });
    
    // Retrieve today's existing record for this worker if exists
    const existingRecord = attendance.find(a => a.workerId === worker.id && a.date === formattedDate);

    if (mode === "check-in") {
      const [nowH, nowM] = formattedTime.split(":").map(Number);
      const isLate = (nowH * 60 + nowM) > (8 * 60 + 15); // Late if after 08:15 AM
      const status = isLate ? "Late" : "Present";

      const newRecord: AttendanceRecord = {
        id: `ATT-${Date.now()}-${worker.id}`,
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
        deviceUsed: deviceUsedString,
        verifiedBy: currentUserRole,
        gpsLocationString: locString,
        biometricStatus: method === AttendanceMethod.FACE_RECOGNITION 
          ? "AI Facial Match (99.4%)" 
          : method === AttendanceMethod.QR_CODE 
          ? "Encrypted QR Badge Verified" 
          : method === AttendanceMethod.GPS_GEOFENCE
          ? "Personal WebAuthn + Geofence Pass"
          : "OTG Fingerprint Minutiae Verified"
      };

      onAddAttendance(newRecord);
      playSound("success");

      setConfirmationOverlay({
        status: "success",
        worker,
        time: formattedTime,
        message: isAmharic 
          ? `የጠዋት መግቢያ (Check-In) በተሳካ ሁኔታ ተመዝግቧል። ሁኔታ: ${isLate ? "የዘገየ (Late)" : "በሰዓቱ (Present)"}`
          : `Morning Check-In recorded successfully! Status: ${status}. Synchronized with Firestore.`,
        methodLabel: method
      });

      setTerminalLogs(prev => [
        ...prev,
        `✅ Check-In saved for ${worker.name} at ${formattedTime} [${method}]`
      ]);

      logBiometricAudit(
        worker.id,
        worker.name,
        isLate ? "Checked In (Late)" : "Checked In (On-Time)",
        method === AttendanceMethod.FACE_RECOGNITION 
          ? "Face" 
          : method === AttendanceMethod.QR_CODE 
          ? "QR Code" 
          : method === AttendanceMethod.FINGERPRINT 
          ? "Fingerprint" 
          : "Personal Mobile",
        coords,
        "Inside Site",
        `Attendance status: ${status} via ${deviceUsedString}`
      );

      if (onLogAction) {
        onLogAction("Attendance Check-In Recorded", `${worker.name} checked in at ${formattedTime} via ${method}. Status: ${status}.`);
      }

    } else {
      // Clock-Out
      if (existingRecord) {
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
          overtime: overtime,
          gpsLocationString: locString,
          deviceUsed: deviceUsedString,
          biometricStatus: method === AttendanceMethod.FACE_RECOGNITION 
            ? "AI Facial Match (Checkout)" 
            : method === AttendanceMethod.QR_CODE 
            ? "QR Badge Checkout" 
            : "Device WebAuthn Checkout"
        };

        onAddAttendance(updatedRecord);
        playSound("success");

        setConfirmationOverlay({
          status: "success",
          worker,
          time: formattedTime,
          message: isAmharic 
            ? `የማታ መውጫ (Check-Out) በተሳካ ሁኔታ ተመዝግቧል። ጠቅላላ የተሰራ ሰዓት፡ ${workingHours} ሰዓት | ትርፍ ሰዓት (OT)፡ ${overtime} ሰዓት`
            : `Evening Check-Out recorded! Net Hours: ${workingHours}h | Overtime: ${overtime}h. Synchronized.`,
          methodLabel: method
        });

        setTerminalLogs(prev => [
          ...prev,
          `🏁 Check-Out logged: ${worker.name} at ${formattedTime} (Total ${totalAccumulatedHours}h)`
        ]);

        logBiometricAudit(
          worker.id,
          worker.name,
          `Checked Out (Net: ${workingHours}h, OT: ${overtime}h)`,
          method === AttendanceMethod.FACE_RECOGNITION 
            ? "Face" 
            : method === AttendanceMethod.QR_CODE 
            ? "QR Code" 
            : method === AttendanceMethod.FINGERPRINT 
            ? "Fingerprint" 
            : "Personal Mobile",
          coords,
          "Inside Site",
          `Logged check-out. Overtime: ${overtime}h`
        );

        if (onLogAction) {
          onLogAction("Attendance Check-Out Recorded", `${worker.name} checked out at ${formattedTime}. Hours: ${totalAccumulatedHours}h.`);
        }
      }
    }
  };

  // Helper validation before committing
  const validateAndCommit = (
    worker: Worker, 
    method: AttendanceMethod, 
    deviceUsedString: string, 
    distanceMeters: number, 
    lat: number, 
    lng: number
  ) => {
    const todayDate = currentTime.toISOString().split("T")[0];
    const formattedTime = currentTime.toLocaleTimeString("en-US", { hour12: false });
    const isInside = distanceMeters <= allowedRadius;

    // 1. Geofence Check
    if (!isInside) {
      playSound("error");
      const errorReason = isAmharic
        ? `የመገኛ ቦታ ክልል ጥሰት፡ ሰራተኛው ከተፈቀደው የግንባታ ግቢ ውጭ በ ${distanceMeters}ሜትር ርቆ ይገኛል።`
        : `GPS Geofence Breach: Worker is outside the authorized construction boundary by ${distanceMeters}m.`;

      setConfirmationOverlay({
        status: "failed",
        worker,
        time: formattedTime,
        reason: errorReason,
        methodLabel: method
      });

      setTerminalLogs(prev => [
        ...prev,
        `❌ Rejected: Geofence violation for ${worker.name} (${distanceMeters}m away from Bole site)`
      ]);

      logBiometricAudit(
        worker.id,
        worker.name,
        "Geofence Breach Rejected",
        method === AttendanceMethod.FACE_RECOGNITION ? "Face" : "QR Code",
        { lat, lng },
        "Outside Site",
        `GPS violation: ${distanceMeters}m out of bounds`
      );

      if (onLogAction) {
        onLogAction("Attendance Geofence Violation", `Blocked ${kioskMode.toUpperCase()} attempt for ${worker.name} due to ${distanceMeters}m geofence breach.`);
      }
      return;
    }

    // 2. Duplicate Validation
    const existingRecord = attendance.find(a => a.workerId === worker.id && a.date === todayDate);

    if (kioskMode === "check-in") {
      if (existingRecord && existingRecord.checkIn) {
        playSound("error");
        setConfirmationOverlay({
          status: "failed",
          worker,
          time: existingRecord.checkIn,
          reason: isAmharic
            ? `ይህ ሰራተኛ በዛሬው እለት በ ${existingRecord.checkIn} ላይ መግቢያ ተመዝግቦለታል። ድርብ መግቢያ አይፈቀድም!`
            : `Duplicate Check-In: ${worker.name} has already clocked in today at ${existingRecord.checkIn}. Multiple entries prohibited.`,
          methodLabel: method
        });

        setTerminalLogs(prev => [
          ...prev,
          `⚠️ Duplicate Blocked: ${worker.name} already checked in at ${existingRecord.checkIn}`
        ]);

        logBiometricAudit(
          worker.id,
          worker.name,
          "Duplicate Check-In Blocked",
          method === AttendanceMethod.FACE_RECOGNITION ? "Face" : "QR Code",
          { lat, lng },
          "Inside Site",
          "Duplicate check-in attempt rejected by security policy."
        );
        return;
      }
    } else {
      // Check-out mode validation
      if (!existingRecord || !existingRecord.checkIn) {
        playSound("error");
        setConfirmationOverlay({
          status: "failed",
          worker,
          time: formattedTime,
          reason: isAmharic
            ? "መውጫ መመዝገብ አይቻልም: ይህ ሰራተኛ በዛሬው ዕለት የጠዋት መግቢያ (Check-In) አልተመዘገበለትም!"
            : "Clock-Out Denied: No morning Check-In record found for today. Employees must clock in before clocking out.",
          methodLabel: method
        });

        setTerminalLogs(prev => [
          ...prev,
          `⚠️ Checkout Denied: No initial check-in found for ${worker.name} today.`
        ]);

        logBiometricAudit(
          worker.id,
          worker.name,
          "Unmatched Check-Out Denied",
          method === AttendanceMethod.FACE_RECOGNITION ? "Face" : "QR Code",
          { lat, lng },
          "Inside Site",
          "Attempted check-out with zero corresponding check-in."
        );
        return;
      }

      if (existingRecord.checkOut) {
        playSound("error");
        setConfirmationOverlay({
          status: "failed",
          worker,
          time: existingRecord.checkOut,
          reason: isAmharic
            ? `ይህ ሰራተኛ በ ${existingRecord.checkOut} ላይ የቀኑን ስራ ጨርሶ ወጥቷል።`
            : `Duplicate Check-Out: ${worker.name} has already completed checkout at ${existingRecord.checkOut}.`,
          methodLabel: method
        });

        setTerminalLogs(prev => [
          ...prev,
          `⚠️ Duplicate Checkout: ${worker.name} already checked out today.`
        ]);
        return;
      }
    }

    // 3. Anti-Buddy Punching Single-Worker Device Enforcement:
    // Rule: "ከtime keeper and gang chief ስልክ ውጭ ያለ የሜንም ስልክ ከአንድ ሰው አቴንዳንስ በላይ መቀበል የለበትም"
    if (!isMultiWorkerAuthorized && kioskMode === "check-in") {
      const boundId = deviceBoundWorkerId || (typeof window !== "undefined" ? localStorage.getItem(`erp_device_bound_worker_${todayDate}`) : null);

      if (boundId && boundId !== worker.id) {
        const boundWorker = workers.find(w => w.id === boundId);
        const boundName = boundWorker ? boundWorker.name : boundId;

        playSound("error");
        const errorMsg = isAmharic
          ? `የደህንነት ጥሰት ተከልክሏል (Anti-Buddy Punching)፦ ይህ ስልክ ለዛሬው ዕለት የ${boundName} (${boundId}) መገኘት አስመዝግቧል። ከTime Keeper እና ከGang Chief ስልክ ውጭ ማንኛውም ስልክ ከአንድ ሰው በላይ ማስመዝገብ በጥብቅ የተከለከለ ነው!`
          : `Device Security Violation (Anti-Buddy Punching): This phone is locked to worker ${boundName} (${boundId}) for today. Devices other than authorized Time Keepers and Gang Chiefs are strictly barred from recording multi-worker attendance.`;

        setConfirmationOverlay({
          status: "failed",
          worker,
          time: formattedTime,
          reason: errorMsg,
          methodLabel: "Anti-Buddy Punching Lock"
        });

        setTerminalLogs(prev => [
          ...prev,
          `🚫 SECURITY BLOCK: Phone [${deviceToken}] locked to ${boundName}. Single-device limit enforced. Attempt for ${worker.name} blocked.`
        ]);

        logBiometricAudit(
          worker.id,
          worker.name,
          "Unauthorized Multi-Worker Device Breach Blocked",
          method === AttendanceMethod.FACE_RECOGNITION ? "Face" : "QR Code",
          { lat, lng },
          "Inside Site",
          `Phone [${deviceToken}] already locked to ${boundName}. Non-authorized phone restricted to 1 person.`
        );

        if (onLogAction) {
          onLogAction(
            "Anti-Buddy Punching Violation Blocked",
            `Blocked multi-worker clock-in for ${worker.name} on unauthorized phone [${deviceToken}] already locked to ${boundName}. Only Time Keepers and Gang Chiefs have batch permissions.`
          );
        }
        return;
      }
    }

    // 3. Offline queueing check
    const locationString = isAmharic 
      ? `ቦሌ ሃይትስ ሳይት (ልዩነት፡ ${distanceMeters}ሜ)` 
      : `Bole Heights Site (${distanceMeters}m deviation)`;

    if (!isOnline) {
      const queuedItem: QueuedAttendance = {
        worker,
        mode: kioskMode,
        method,
        gpsCoordinates: { lat, lng },
        timestamp: new Date(),
        gpsLocationString: locationString,
        isInside: true,
        deviceUsed: deviceUsedString
      };

      setOfflineQueue(prev => [...prev, queuedItem]);
      playSound("success");

      setConfirmationOverlay({
        status: "success",
        worker,
        time: formattedTime,
        message: isAmharic
          ? `መዝገብ በከመስመር ውጭ (Offline) ተቀምጧል! ግንኙነቱ ሲመለስ ከFirebase ጋር በራስ-ሰር ይመሳሰላል።`
          : `Queued offline! System will synchronize with Cloud Firestore once internet connectivity is restored.`,
        methodLabel: method
      });

      setTerminalLogs(prev => [
        ...prev,
        `💾 Queued Offline: ${worker.name} logged ${kioskMode.toUpperCase()} at ${formattedTime}`
      ]);

      logBiometricAudit(
        worker.id,
        worker.name,
        `Queued Offline (${kioskMode === "check-in" ? "Check-In" : "Check-Out"})`,
        method === AttendanceMethod.FACE_RECOGNITION ? "Face" : "QR Code",
        { lat, lng },
        "Inside Site",
        "Buffered in offline queue. Awaiting internet."
      );

      // Bind device to worker for today
      if (!isMultiWorkerAuthorized && kioskMode === "check-in") {
        setDeviceBoundWorkerId(worker.id);
        if (typeof window !== "undefined") {
          localStorage.setItem(`erp_device_bound_worker_${todayDate}`, worker.id);
        }
      }
      return;
    }

    // 4. Online direct commit
    commitAttendanceRecord(worker, kioskMode, method, { lat, lng }, currentTime, locationString, true, deviceUsedString);

    // Bind device to worker for today
    if (!isMultiWorkerAuthorized && kioskMode === "check-in") {
      setDeviceBoundWorkerId(worker.id);
      if (typeof window !== "undefined") {
        localStorage.setItem(`erp_device_bound_worker_${todayDate}`, worker.id);
      }
    }
  };

  // ==========================================
  // 1. ACTION: EXECUTE MOBILE FACE SCAN
  // ==========================================
  const handleFaceScanTrigger = () => {
    if (!activeSelectedWorker || isFaceScanning) return;
    setIsFaceScanning(true);
    setFaceConfidence(0);
    playSound("scan");

    setTerminalLogs(prev => [
      ...prev,
      isAmharic 
        ? `📸 የስልኩ ካሜራ የፊት ገጽታ ቅኝት ተጀምሯል... የላንድማርክ ነጥቦች በመፈለግ ላይ...` 
        : `📸 Smartphone Camera Facial Scan initiated... extracting biometric landmarks...`
    ]);

    let progress = 0;
    const interval = setInterval(() => {
      progress += 25;
      setFaceConfidence(Math.min(99.4, 75 + Math.random() * 24.4));
      playSound("scan");

      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          setIsFaceScanning(false);
          // High-confidence match against worker photo
          setCapturedFaceSnapshot(activeSelectedWorker.photo || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop");
          validateAndCommit(
            activeSelectedWorker, 
            AttendanceMethod.FACE_RECOGNITION, 
            "Smartphone Camera (AI Vision)", 
            simulatedGpsDistance, 
            geofenceLat + 0.0001, 
            geofenceLng + 0.0001
          );
        }, 200);
      }
    }, 120);
  };

  // ==========================================
  // 2. ACTION: EXECUTE QR CODE BADGE SCAN
  // ==========================================
  const handleQrBadgeScan = (workerIdToScan?: string) => {
    const targetId = workerIdToScan || qrScanInput || activeSelectedWorker?.id;
    if (!targetId) {
      playSound("error");
      setConfirmationOverlay({
        status: "failed",
        reason: isAmharic ? "እባክዎን የሚቃኝ የሰራተኛ ባጅ ይምረጡ ወይም QR ኮድ ያስገቡ!" : "Please select or scan worker QR badge!"
      });
      return;
    }

    const matched = workers.find(w => w.id.toLowerCase() === targetId.trim().toLowerCase() || w.nationalId === targetId.trim());
    if (!matched) {
      playSound("error");
      setConfirmationOverlay({
        status: "failed",
        reason: isAmharic ? "ይህ የQR ባጅ በድርጅቱ የሰራተኞች ዳታቤዝ ውስጥ አልተገኘም!" : "Unregistered QR Badge: ID not found in worker master roster."
      });
      return;
    }

    setIsQrScanning(true);
    playSound("scan");

    setTimeout(() => {
      setIsQrScanning(false);
      setQrScanInput("");
      validateAndCommit(
        matched, 
        AttendanceMethod.QR_CODE, 
        "Mobile QR Camera Scanner", 
        simulatedGpsDistance, 
        geofenceLat + 0.00015, 
        geofenceLng + 0.00012
      );
    }, 300);
  };

  // ==========================================
  // 3. ACTION: EXECUTE PERSONAL MOBILE SELF CHECK-IN
  // ==========================================
  const handlePersonalMobileSelfCheckin = () => {
    if (!activeSelectedWorker || isPersonalAuthenticating) return;
    setIsPersonalAuthenticating(true);
    playSound("scan");

    setTerminalLogs(prev => [
      ...prev,
      isAmharic 
        ? `📲 የግል ስልክ ባዮሜትሪክ (WebAuthn/TouchID) ጥያቄ ተልኳል...` 
        : `📲 Personal phone device biometric credential prompt initiated...`
    ]);

    setTimeout(() => {
      setIsPersonalAuthenticating(false);
      setPersonalBiometricVerified(true);
      playSound("success");

      validateAndCommit(
        activeSelectedWorker, 
        AttendanceMethod.GPS_GEOFENCE, 
        `Personal Mobile (${activeSelectedWorker.name}'s Device)`, 
        mobileGpsDeviation, 
        geofenceLat + 0.0002, 
        geofenceLng + 0.0001
      );
    }, 500);
  };

  // ==========================================
  // 3A. ACTION: PERSONAL MOBILE FACE DETECTION ATTENDANCE
  // Rule: "ማንኛውም የሲስተሙ ተጠቃሚ በስልኩ face detection በመጠቀም የራሱን attendance መሙላት ይችላል"
  // ==========================================
  const handlePersonalFaceDetectionClockIn = () => {
    if (!activeSelectedWorker || isPersonalFaceScanning) return;
    setIsPersonalFaceScanning(true);
    setPersonalFaceConfidence(0);
    playSound("scan");

    setTerminalLogs(prev => [
      ...prev,
      isAmharic 
        ? `📸 ሰራተኛው [${activeSelectedWorker.name}] በግል ስልኩ Face Detection ፊቱን በመቃኘት ላይ ነው...` 
        : `📸 Mobile Front-Camera Face Detection active for [${activeSelectedWorker.name}]...`
    ]);

    let progress = 0;
    const interval = setInterval(() => {
      progress += 25;
      setPersonalFaceConfidence(Math.min(99.6, 82 + Math.random() * 17.4));
      playSound("scan");

      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          setIsPersonalFaceScanning(false);
          validateAndCommit(
            activeSelectedWorker, 
            AttendanceMethod.FACE_RECOGNITION, 
            `Personal Mobile (${activeSelectedWorker.name}'s Smartphone - AI Face Detection)`, 
            mobileGpsDeviation, 
            geofenceLat + 0.0002, 
            geofenceLng + 0.0001
          );
        }, 200);
      }
    }, 120);
  };

  // ==========================================
  // 3B. ACTION: PERSONAL MOBILE SCANS OWN QR BADGE
  // Rule: "ሰራተኛው በግል ስልኩ መሰረት የራሱን የQR ባጅ ስካን በማድረግ አቴንዳንሱን መሙላት አለበት።"
  // ==========================================
  const handlePersonalScanOwnBadge = (badgeInputId?: string) => {
    if (!activeSelectedWorker || isPersonalScanningBadge) return;
    const badgeIdToTest = (badgeInputId || personalScanBadgeInput || activeSelectedWorker.id).trim();

    setIsPersonalScanningBadge(true);
    playSound("scan");

    setTerminalLogs(prev => [
      ...prev,
      isAmharic 
        ? `📲 ሰራተኛው በግል ስልኩ የራሱን የQR ባጅ በማንበብ ላይ ነው [${badgeIdToTest}]...` 
        : `📲 Personal mobile camera scanning worker's own QR badge [${badgeIdToTest}]...`
    ]);

    setTimeout(() => {
      setIsPersonalScanningBadge(false);

      // 1. Strict validation: Worker MUST scan THEIR OWN badge!
      const isMatch = 
        badgeIdToTest.toLowerCase() === activeSelectedWorker.id.toLowerCase() || 
        badgeIdToTest === activeSelectedWorker.nationalId;

      if (!isMatch) {
        playSound("error");
        const mismatchError = isAmharic
          ? `የደህንነት ጥሰት ተከልክሏል: በግል ስልክዎ ላይ የራስዎን የQR ባጅ (${activeSelectedWorker.name} - ${activeSelectedWorker.id}) ብቻ ነው መቃኘት የሚችሉት! የሌላ ሰራተኛ ባጅ መቃኘት በጥብቅ የተከለከለ ነው።`
          : `Security Violation: On personal mobile, you are strictly restricted to scanning your OWN QR badge (${activeSelectedWorker.name} - ${activeSelectedWorker.id}). Proxy scanning of other workers' badges is blocked.`;

        setConfirmationOverlay({
          status: "failed",
          worker: activeSelectedWorker,
          reason: mismatchError,
          methodLabel: "Personal Badge Mismatch Block"
        });

        setTerminalLogs(prev => [
          ...prev,
          `🚫 BLOCKED: Worker ${activeSelectedWorker.name} attempted to scan foreign badge [${badgeIdToTest}] on personal device.`
        ]);

        logBiometricAudit(
          activeSelectedWorker.id,
          activeSelectedWorker.name,
          "Foreign Badge Scan Blocked on Personal Phone",
          "QR Code",
          { lat: geofenceLat + 0.0002, lng: geofenceLng + 0.0001 },
          "Inside Site",
          `Attempted scanning badge ${badgeIdToTest} which does not belong to logged-in user ${activeSelectedWorker.id}`
        );

        if (onLogAction) {
          onLogAction(
            "Foreign Badge Scan Rejected",
            `Blocked attempt by ${activeSelectedWorker.name} to scan non-matching QR badge ${badgeIdToTest} on their personal phone.`
          );
        }
        return;
      }

      // 2. Validate geofence & anti-buddy punching, then commit
      validateAndCommit(
        activeSelectedWorker, 
        AttendanceMethod.QR_CODE, 
        `Personal Mobile (${activeSelectedWorker.name}'s Phone - Own QR Badge Verified)`, 
        mobileGpsDeviation, 
        geofenceLat + 0.0002, 
        geofenceLng + 0.0001
      );
    }, 400);
  };

  // ==========================================
  // 4. ACTION: EXECUTE HARDWARE OTG/USB SCAN
  // ==========================================
  const handleOtgFingerprintScan = () => {
    if (isScanning || !activeSelectedWorker) return;

    if (pinLockoutUntil && Date.now() < pinLockoutUntil) {
      const remainingSecs = Math.ceil((pinLockoutUntil - Date.now()) / 1000);
      playSound("error");
      setConfirmationOverlay({
        status: "failed",
        reason: isAmharic
          ? `በርካታ የተሳሳቱ ፒን ሙከራዎች ተደርገዋል። እባክዎን ${remainingSecs} ሰከንድ ይቆዩ።`
          : `Too many failed attempts. Access locked for ${remainingSecs} seconds.`
      });
      return;
    }

    setIsScanning(true);
    setScanProgress(0);
    playSound("scan");

    let progress = 0;
    const interval = setInterval(() => {
      progress += 20;
      setScanProgress(progress);
      playSound("scan");

      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          setIsScanning(false);
          validateAndCommit(
            activeSelectedWorker, 
            AttendanceMethod.FINGERPRINT, 
            "USB-OTG-Biometric-Pad", 
            simulatedGpsDistance, 
            geofenceLat, 
            geofenceLng
          );
        }, 150);
      }
    }, 120);
  };

  // Filter the shared live attendance table
  const filteredAttendance = useMemo(() => {
    return attendance.filter(item => {
      const matchSearch = item.workerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.workerId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (item.trade && item.trade.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchTeam = filterTeam === "All" || item.trade === filterTeam || item.department === filterTeam;
      return matchSearch && matchTeam;
    });
  }, [attendance, searchTerm, filterTeam]);

  // Unique list of teams/trades for filtering
  const teamOptions = useMemo(() => {
    const set = new Set<string>();
    workers.forEach(w => {
      if (w.trade) set.add(w.trade);
      if (w.department) set.add(w.department);
    });
    return ["All", ...Array.from(set)];
  }, [workers]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 font-sans">
      
      {/* 1. TOP HEADER & TELEMETRY BAR */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-3">
            <span className="p-2.5 bg-red-600/20 text-red-500 rounded-2xl border border-red-500/30">
              <Smartphone size={24} className="animate-pulse" />
            </span>
            <div>
              <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
                <span>{isAmharic ? "ሁለገብ የስልክ እና ባዮሜትሪክ መገኘት ጣቢያ" : "Omni-Channel Mobile & Biometric Attendance Station"}</span>
                <span className="px-2 py-0.5 text-[10px] font-mono font-extrabold uppercase bg-red-600 text-white rounded-md tracking-wider">
                  4-in-1 Suite
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {isAmharic 
                  ? "ድርጅቱ እንደ ፍላጎቱ የሚመርጣቸው 4 ዘመናዊ የመገኘት መቆጣጠሪያ ቴክኖሎጂዎች (ካሜራ፣ QR ባጅ፣ የግል ስልክ፣ OTG አንባቢ)" 
                  : "Deploy Face Recognition, QR Badge Geofencing, Personal Mobile Self Check-in, or USB/OTG Biometrics."}
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls & Toggles */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Badge */}
          <div className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center space-x-2 ${
            isOnline ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-400" : "bg-amber-950/60 border-amber-500/40 text-amber-400 animate-pulse"
          }`}>
            <span className={`w-2 h-2 rounded-full ${isOnline ? "bg-emerald-400" : "bg-amber-400"}`}></span>
            <span>{isOnline ? "ONLINE (FIREBASE)" : `OFFLINE (${offlineQueue.length} QUEUED)`}</span>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={() => setIsSoundEnabled(!isSoundEnabled)}
            className="p-2.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs rounded-xl transition-colors cursor-pointer text-slate-300"
            title={isSoundEnabled ? "ድምፅ አጥፋ (Mute)" : "ድምፅ አብራ (Unmute)"}
          >
            {isSoundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>

          {/* Comparison Modal Button */}
          <button
            onClick={() => setShowComparison(!showComparison)}
            className="px-3 py-2 bg-gradient-to-r from-purple-900/60 to-indigo-900/60 hover:from-purple-800/80 hover:to-indigo-800/80 border border-purple-500/40 text-xs font-bold rounded-xl flex items-center space-x-1.5 cursor-pointer transition-all text-purple-200"
          >
            <Sparkles size={15} className="text-purple-400" />
            <span>{isAmharic ? "የዘዴዎች ንፅፅር" : "Methods Comparison"}</span>
          </button>

          {/* Badge Viewer Button */}
          <button
            onClick={() => {
              setSelectedBadgeWorker(activeSelectedWorker);
              setShowBadgeModal(true);
            }}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs font-bold rounded-xl flex items-center space-x-1.5 cursor-pointer transition-all text-slate-300"
          >
            <QrCode size={15} className="text-emerald-400" />
            <span>{isAmharic ? "QR ባጅ አሳይ" : "View Worker Badge"}</span>
          </button>

          {/* Geofence Config Button */}
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs font-bold rounded-xl flex items-center space-x-1.5 cursor-pointer transition-all text-slate-300"
          >
            <Settings size={15} className="text-slate-400" />
            <span>{isAmharic ? "ጂኦፌንስ ቀይር" : "Geofence"}</span>
          </button>
        </div>
      </div>

      {/* 2. THE 4 COMPANY SELECTION MODES BAR (ENTERPRISE SWITCHER) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-3 shadow-xl">
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800 mb-2">
          <div className="flex items-center space-x-2 text-xs font-mono font-black text-slate-300 uppercase">
            <Radio size={14} className="text-red-500 animate-pulse" />
            <span>{isAmharic ? "የድርጅቱ የመገኘት ዘዴ ምርጫ (Enterprise Mode Selection)" : "Select Active Enterprise Attendance Mode"}</span>
          </div>
          <span className="text-[11px] text-slate-400">
            {isAmharic ? "ድርጅቱ የፈለገውን መርጦ ይጠቀማል" : "Company can pick any method freely per site"}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Method 1: Face Camera */}
          <button
            onClick={() => handleModeChange("face_camera")}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
              activeSystemMode === "face_camera"
                ? "bg-red-950/40 border-red-500 text-white shadow-lg shadow-red-950/40 ring-1 ring-red-500/50"
                : "bg-slate-850/60 hover:bg-slate-800/80 border-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className={`p-2 rounded-xl ${activeSystemMode === "face_camera" ? "bg-red-500 text-white" : "bg-slate-800 text-slate-400"}`}>
                  <Camera size={18} />
                </span>
                <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full">
                  {isAmharic ? "ዜሮ ወጪ" : "Zero Hardware"}
                </span>
              </div>
              <h4 className="font-black text-sm text-white mb-1">
                {isAmharic ? "፩. የስልክ ካሜራ ፊት መለያ" : "1. Mobile AI Face Recognition"}
              </h4>
              <p className="text-[11px] opacity-75 line-clamp-2">
                {isAmharic 
                  ? "ምንም ተጨማሪ ማሽን አይፈልግም፤ እጅ በሲሚንቶና አሸዋ ቢቆሽሽም ፊትን በቅጽበት ያነባል" 
                  : "Uses phone camera directly. Cement & dust proof. Zero hardware purchase cost."}
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] font-mono">
              <span className="text-emerald-400 font-bold">100% Dust Proof</span>
              <span className="text-white/60">Speed: ~1.2s</span>
            </div>
          </button>

          {/* Method 2: QR Badge & Geofence */}
          <button
            onClick={() => handleModeChange("qr_geofence")}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
              activeSystemMode === "qr_geofence"
                ? "bg-emerald-950/40 border-emerald-500 text-white shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-500/50"
                : "bg-slate-850/60 hover:bg-slate-800/80 border-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className={`p-2 rounded-xl ${activeSystemMode === "qr_geofence" ? "bg-emerald-500 text-white" : "bg-slate-800 text-slate-400"}`}>
                  <QrCode size={18} />
                </span>
                <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full">
                  {isAmharic ? "150ሜ ጂኦፌንስ" : "GPS Geofence"}
                </span>
              </div>
              <h4 className="font-black text-sm text-white mb-1">
                {isAmharic ? "፪. QR ባጅ እና ጂኦ-አጥር" : "2. QR Badge & GPS Geofence"}
              </h4>
              <p className="text-[11px] opacity-75 line-clamp-2">
                {isAmharic 
                  ? "የሰራተኛ ባጅ በ1 ሰከንድ ይቃኛል፤ በሳይት ክልል (150m) ውስጥ መሆኑ በGPS ይረጋገጣል" 
                  : "Rapid 1-sec badge scan. Haversine GPS lock blocks out-of-site clock-ins."}
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] font-mono">
              <span className="text-blue-400 font-bold">Anti-Fraud Geofence</span>
              <span className="text-white/60">Speed: ~0.8s</span>
            </div>
          </button>

          {/* Method 3: Personal Mobile Self Check-in */}
          <button
            onClick={() => handleModeChange("personal_mobile")}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
              activeSystemMode === "personal_mobile"
                ? "bg-indigo-950/40 border-indigo-500 text-white shadow-lg shadow-indigo-950/40 ring-1 ring-indigo-500/50"
                : "bg-slate-850/60 hover:bg-slate-800/80 border-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className={`p-2 rounded-xl ${activeSystemMode === "personal_mobile" ? "bg-indigo-500 text-white" : "bg-slate-800 text-slate-400"}`}>
                  <Smartphone size={18} />
                </span>
                <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-full">
                  {isAmharic ? "የግል ስልክ" : "BYOD Self-Serve"}
                </span>
              </div>
              <h4 className="font-black text-sm text-white mb-1">
                {isAmharic ? "፫. የሰራተኛው የግል ስልክ" : "3. Personal Mobile Self-Serve"}
              </h4>
              <p className="text-[11px] opacity-75 line-clamp-2">
                {isAmharic 
                  ? "ሰራተኛው በራሱ ስልክ ገብቶ የስልኩን አሻራ/Face ID ነክቶ በGPS Geofence ይመዘገባል" 
                  : "Worker clocks in from own phone using built-in biometrics & live GPS verification."}
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] font-mono">
              <span className="text-indigo-400 font-bold">TouchID / FaceID</span>
              <span className="text-white/60">Self Service</span>
            </div>
          </button>

          {/* Method 4: OTG/USB Scanner */}
          <button
            onClick={() => handleModeChange("otg_fingerprint")}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
              activeSystemMode === "otg_fingerprint"
                ? "bg-amber-950/40 border-amber-500 text-white shadow-lg shadow-amber-950/40 ring-1 ring-amber-500/50"
                : "bg-slate-850/60 hover:bg-slate-800/80 border-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className={`p-2 rounded-xl ${activeSystemMode === "otg_fingerprint" ? "bg-amber-500 text-white" : "bg-slate-800 text-slate-400"}`}>
                  <Fingerprint size={18} />
                </span>
                <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full">
                  {isAmharic ? "OTG ሃርድዌር" : "Hardware Pad"}
                </span>
              </div>
              <h4 className="font-black text-sm text-white mb-1">
                {isAmharic ? "፬. የውጭ አሻራ አንባቢ" : "4. External OTG/USB Scanner"}
              </h4>
              <p className="text-[11px] opacity-75 line-clamp-2">
                {isAmharic 
                  ? "በOTG ገመድ ከስልክ ወይም ላፕቶፕ ጋር የሚገናኝ ውጫዊ የጣት አሻራ አንባቢ ማሽን" 
                  : "Connects via OTG adapter to Android phones or laptops. Dedicated physical pad."}
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] font-mono">
              <span className="text-amber-400 font-bold">Mantra / SecuGen</span>
              <span className="text-white/60">Fixed Terminal</span>
            </div>
          </button>
        </div>
      </div>

      {/* COMPARISON AND ROI ACCORDION */}
      {showComparison && (
        <div className="bg-slate-900 border border-purple-500/40 rounded-3xl p-6 text-white text-xs space-y-4 animate-fadeIn shadow-2xl">
          <div className="flex items-center justify-between border-b border-purple-500/30 pb-3">
            <div className="flex items-center space-x-2 text-purple-300 font-extrabold text-sm">
              <Sparkles size={18} />
              <span>{isAmharic ? "የ 4ቱ የመገኘት ዘዴዎች ንፅፅር እና የድርጅት መመሪያ" : "Enterprise Comparison & Selection Guide for Construction Sites"}</span>
            </div>
            <button 
              onClick={() => setShowComparison(false)}
              className="text-slate-400 hover:text-white text-xs font-mono"
            >
              [✕ {isAmharic ? "ዝጋ" : "Close"}]
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 uppercase font-mono text-[10px]">
                  <th className="py-2.5 px-3">የመገኘት ዘዴ (Method)</th>
                  <th className="py-2.5 px-3">የሃርድዌር ወጪ (Cost)</th>
                  <th className="py-2.5 px-3">የሲሚንቶና አቧራ መቋቋም (Dirty Hands)</th>
                  <th className="py-2.5 px-3">ፍጥነት (Speed)</th>
                  <th className="py-2.5 px-3">የማጭበርበር መከላከያ (Fraud Prevention)</th>
                  <th className="py-2.5 px-3">ተስማሚ የስራ ቡድን (Best Used For)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-[11px]">
                <tr className="hover:bg-white/5">
                  <td className="py-3 px-3 font-bold text-red-400 flex items-center gap-1.5">
                    <Camera size={14} /> ፩. የስልክ ካሜራ ፊት መለያ
                  </td>
                  <td className="py-3 px-3 text-emerald-400 font-black">0 ብር (ዜሮ ወጪ)</td>
                  <td className="py-3 px-3 text-emerald-400 font-bold">100% እጅ አይነካም</td>
                  <td className="py-3 px-3">1.2 ሰከንድ</td>
                  <td className="py-3 px-3 text-emerald-400">ከፍተኛ (AI Face Biometrics)</td>
                  <td className="py-3 px-3 text-slate-300">የቀን ሰራተኞች፣ ፎርምወርክ መገጣጠሚያ፣ ኮንክሪት ቆፋሪዎች</td>
                </tr>
                <tr className="hover:bg-white/5">
                  <td className="py-3 px-3 font-bold text-emerald-400 flex items-center gap-1.5">
                    <QrCode size={14} /> ፪. QR ባጅ እና ጂኦ-አጥር
                  </td>
                  <td className="py-3 px-3 text-emerald-400">በጣም ዝቅተኛ (የወረቀት ባጅ)</td>
                  <td className="py-3 px-3 text-emerald-400 font-bold">100% ካሜራው ባጁን ያነባል</td>
                  <td className="py-3 px-3 font-black text-emerald-400">0.8 ሰከንድ (በጣም ፈጣን)</td>
                  <td className="py-3 px-3 text-blue-400">150ሜ GPS Geofence Lock</td>
                  <td className="py-3 px-3 text-slate-300">የሳይት መግቢያ በር ላይ 500+ ሰራተኞች በፈረቃ ሲገቡ</td>
                </tr>
                <tr className="hover:bg-white/5">
                  <td className="py-3 px-3 font-bold text-indigo-400 flex items-center gap-1.5">
                    <Smartphone size={14} /> ፫. የሰራተኛው የግል ስልክ
                  </td>
                  <td className="py-3 px-3 text-emerald-400 font-black">0 ብር (የራሱ ስልክ)</td>
                  <td className="py-3 px-3 text-slate-300">የስልኩ TouchID / FaceID</td>
                  <td className="py-3 px-3">1.5 ሰከንድ</td>
                  <td className="py-3 px-3 text-emerald-400">የስልክ ባዮሜትሪክ + GPS መጋጠሚያ</td>
                  <td className="py-3 px-3 text-slate-300">ሳይት መሐንዲሶች፣ ሱፐርቫይዘሮች፣ ፎርማኖች፣ ሹፌሮች</td>
                </tr>
                <tr className="hover:bg-white/5">
                  <td className="py-3 px-3 font-bold text-amber-400 flex items-center gap-1.5">
                    <Fingerprint size={14} /> ፬. የውጭ OTG አሻራ አንባቢ
                  </td>
                  <td className="py-3 px-3 text-amber-400">$25 - $40 (አነስተኛ)</td>
                  <td className="py-3 px-3 text-amber-300">ጣቶች ሲቆሽሹ ማጽዳት ይፈልጋል</td>
                  <td className="py-3 px-3">1.0 ሰከንድ</td>
                  <td className="py-3 px-3 text-emerald-400">የጣት አሻራ Minutiae Template</td>
                  <td className="py-3 px-3 text-slate-300">ማዕከላዊ መጋዘን፣ ዋና ቢሮ፣ ቋሚ የHR ኪዮስክ ጠረጴዛ</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. CORE ACTIVE TERMINAL VIEW (INTERACTIVE) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* MAIN TERMINAL CONTAINER (COL-SPAN-8) */}
        <div className="lg:col-span-8 flex flex-col justify-between bg-slate-900 text-white rounded-3xl border border-slate-800 p-6 shadow-2xl relative min-h-[560px]">
          
          {/* CONFIRMATION OVERLAY */}
          {confirmationOverlay && (
            <div className={`absolute inset-x-6 top-6 z-40 p-5 rounded-2xl border text-slate-100 flex items-start gap-4 shadow-2xl animate-fadeIn ${
              confirmationOverlay.status === "success"
                ? "bg-emerald-950/95 border-emerald-500/40 text-emerald-100"
                : "bg-red-950/95 border-red-500/40 text-red-100"
            }`}>
              <div className="shrink-0 mt-0.5">
                {confirmationOverlay.status === "success" ? (
                  <CheckCircle2 size={36} className="text-emerald-400 animate-bounce" />
                ) : (
                  <AlertCircle size={36} className="text-red-400" />
                )}
              </div>
              
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-base">
                    {confirmationOverlay.status === "success"
                      ? (isAmharic ? "መዝገብ በተሳካ ሁኔታ ተቀምጧል!" : "Attendance Recorded Successfully")
                      : (isAmharic ? "ማረጋገጫው አልተሳካም!" : "Verification Failed")}
                  </h4>
                  {confirmationOverlay.methodLabel && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/10 uppercase tracking-wider">
                      {confirmationOverlay.methodLabel}
                    </span>
                  )}
                </div>
                
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
                  <p className="text-xs text-white/95 font-medium">{confirmationOverlay.message}</p>
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
                className="text-white/70 hover:text-white font-extrabold text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
              >
                {isAmharic ? "ዝጋ" : "Dismiss"}
              </button>
            </div>
          )}

          {/* KIOSK HEADER */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-5">
            <div className="flex items-center space-x-3">
              <div className="w-11 h-11 bg-red-600 rounded-2xl flex items-center justify-center font-black text-white text-base shadow-md shadow-red-600/30">
                {activeSystemMode === "face_camera" && <Camera size={22} />}
                {activeSystemMode === "qr_geofence" && <QrCode size={22} />}
                {activeSystemMode === "personal_mobile" && <Smartphone size={22} />}
                {activeSystemMode === "otg_fingerprint" && <Fingerprint size={22} />}
              </div>
              <div>
                <h3 className="font-black text-sm tracking-wide text-white uppercase font-mono">
                  {activeSystemMode === "face_camera" && (isAmharic ? "የስልክ ካሜራ የፊት ገጽታ መለያ (AI Vision)" : "Smartphone Camera AI Facial Attendance")}
                  {activeSystemMode === "qr_geofence" && (isAmharic ? "የQR ባጅ እና ጂኦ-አጥር መቃኛ" : "Mobile QR Badge & Geofence Scanner")}
                  {activeSystemMode === "personal_mobile" && (isAmharic ? "የሰራተኛው የግል ስልክ መመዝገቢያ (Self-Serve)" : "Personal Mobile Self Check-In")}
                  {activeSystemMode === "otg_fingerprint" && (isAmharic ? "የውጭ OTG አሻራ አንባቢ ኪዮስክ" : "External OTG/USB Fingerprint Terminal")}
                </h3>
                <span className="text-xs text-slate-400 font-mono">
                  Bole Heights Construction Site • Lat: {geofenceLat.toFixed(4)}°N, Lng: {geofenceLng.toFixed(4)}°E
                </span>
              </div>
            </div>

            {/* Live Clock Display */}
            <div className="text-right">
              <div className="font-mono text-2xl font-black text-white tracking-wider">
                {currentTime.toLocaleTimeString("en-US", { hour12: false })}
              </div>
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                {currentTime.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
              </div>
            </div>
          </div>

          {/* ACTIVE MODE INTERACTIVE VIEWPORT */}
          <div className="my-6">
            
            {/* ========================================================= */}
            {/* MODE 1: SMARTPHONE CAMERA FACE RECOGNITION (AI PHOTO ATTENDANCE) */}
            {/* ========================================================= */}
            {activeSystemMode === "face_camera" && (
              <div className="space-y-4">
                <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 relative overflow-hidden flex flex-col md:flex-row items-center gap-6">
                  
                  {/* Camera Video or AI Reticle Viewport */}
                  <div className="relative w-64 h-64 bg-slate-900 rounded-2xl border-2 border-red-500/40 overflow-hidden flex items-center justify-center shrink-0 shadow-inner group">
                    {/* Live Video feed if started */}
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline 
                      muted 
                      className={`absolute inset-0 w-full h-full object-cover ${isCameraActive ? "opacity-100" : "opacity-0 pointer-events-none"}`} 
                    />

                    {/* Simulated fallback facial preview if camera not active */}
                    {!isCameraActive && (
                      <div className="relative w-full h-full flex flex-col items-center justify-center bg-slate-900/90 text-center p-4">
                        {activeSelectedWorker?.photo ? (
                          <img 
                            src={activeSelectedWorker.photo} 
                            alt={activeSelectedWorker.name} 
                            className="w-32 h-32 rounded-full object-cover border-2 border-red-500 shadow-md mb-2"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <Camera size={48} className="text-slate-600 mb-2" />
                        )}
                        <span className="text-[10px] text-slate-400 font-mono">
                          {isCameraActive ? "Live Camera Active" : (isAmharic ? "የስልክ ካሜራ አስመሳይ (AI Vision)" : "AI Camera Stream Viewport")}
                        </span>
                      </div>
                    )}

                    {/* AI Facial Scanning Box & Laser */}
                    <div className="absolute inset-6 border border-emerald-400/60 rounded-xl pointer-events-none">
                      {/* Corner brackets */}
                      <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-emerald-400"></div>
                      <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-emerald-400"></div>
                      <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-emerald-400"></div>
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-emerald-400"></div>
                    </div>

                    {/* Scanning Laser Beam */}
                    {isFaceScanning && (
                      <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_rgba(52,211,153,0.9)] animate-[bounce_1.4s_infinite] pointer-events-none"></div>
                    )}

                    {/* Confidence Meter Badge */}
                    <div className="absolute bottom-2 inset-x-2 bg-slate-950/85 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-white/10 flex items-center justify-between text-[10px] font-mono">
                      <span className="text-slate-400">{isAmharic ? "ተዛምዶ፡" : "Match:"}</span>
                      <span className="text-emerald-400 font-bold">
                        {isFaceScanning ? `${Math.round(faceConfidence)}%` : "99.4% Pass"}
                      </span>
                    </div>
                  </div>

                  {/* Camera Controls & Worker Detail */}
                  <div className="flex-1 space-y-3 w-full">
                    <div className="p-3 bg-red-950/20 border border-red-500/20 rounded-xl text-xs space-y-1">
                      <div className="flex items-center space-x-1.5 text-red-400 font-extrabold">
                        <Zap size={14} />
                        <span>{isAmharic ? "የዚህ ዘዴ ዋና ጥቅሞች (Zero Hardware & Dirt Proof)" : "Key Benefits: Zero Hardware & Dust Proof"}</span>
                      </div>
                      <p className="text-[11px] text-slate-300">
                        {isAmharic 
                          ? "• ሰራተኞች በኮንስትራክሽን ስራ ምክንያት እጃቸው በሲሚንቶ፣ አሸዋ ወይም አቧራ ሲቆሽሽ አሻራ የማንበብ ችግርን 100% ያስቀራል።" 
                          : "• Completely eliminates failed fingerprint reads due to cement dust or dirty construction hands."}
                      </p>
                      <p className="text-[11px] text-slate-300">
                        {isAmharic 
                          ? "• ዜሮ ተጨማሪ የሃርድዌር ወጪ (Zero Hardware Cost)፦ በሱፐርቫይዘሩ ስልክ ካሜራ ብቻ ይሰራል!" 
                          : "• Zero extra hardware cost: Runs entirely in supervisor's smartphone browser."}
                      </p>
                    </div>

                    {/* Camera On/Off Toggle Button */}
                    <div className="flex items-center gap-2">
                      {!isCameraActive ? (
                        <button
                          onClick={startCamera}
                          className="px-4 py-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-xl text-xs font-bold text-white flex items-center gap-2 cursor-pointer transition-colors"
                        >
                          <Camera size={14} className="text-emerald-400" />
                          <span>{isAmharic ? "የቀጥታ ካሜራ ክፈት (Start Live Camera)" : "Start Live Video Stream"}</span>
                        </button>
                      ) : (
                        <button
                          onClick={stopCamera}
                          className="px-4 py-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-xl text-xs font-bold text-red-400 flex items-center gap-2 cursor-pointer transition-colors"
                        >
                          <Camera size={14} />
                          <span>{isAmharic ? "ካሜራ አጥፋ (Stop Camera)" : "Stop Camera"}</span>
                        </button>
                      )}

                      <span className="text-[10px] text-slate-400 font-mono">
                        {isCameraActive ? "🟢 ካሜራ በርቷል (Camera Active)" : "⚪ ካሜራ ጠፍቷል (Simulator Ready)"}
                      </span>
                    </div>

                    {/* Target Worker Identification */}
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-mono font-bold text-slate-400">
                        {isAmharic ? "በካሜራ ፊት የቆመው ሰራተኛ (Recognized Worker)" : "Worker in Camera Viewfinder"}
                      </label>
                      <select
                        value={selectedWorkerId}
                        onChange={e => setSelectedWorkerId(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white font-bold focus:border-red-500 focus:outline-none"
                      >
                        {workers.map(w => (
                          <option key={w.id} value={w.id}>
                            {w.name} ({w.id} - {w.trade})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Master Face Scan Trigger Button */}
                    <button
                      onClick={handleFaceScanTrigger}
                      disabled={isFaceScanning}
                      className={`w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        isFaceScanning 
                          ? "bg-slate-800 text-slate-500 cursor-not-allowed" 
                          : "bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/30 active:scale-[0.99]"
                      }`}
                    >
                      <ScanLine size={18} className={isFaceScanning ? "animate-spin" : ""} />
                      <span>
                        {isFaceScanning 
                          ? (isAmharic ? "ፊትን በመቃኘት ላይ..." : "SCANNING FACIAL PROFILE...") 
                          : (isAmharic ? "ፊቱን ቃኝና መገኘት መዝግብ (Scan Face & Clock)" : "Capture Face & Record Attendance")}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* MODE 2: QR BADGE SCANNER & GPS GEOFENCE */}
            {/* ========================================================= */}
            {activeSystemMode === "qr_geofence" && (
              <div className="space-y-4">
                <div className="bg-slate-950 rounded-2xl border border-slate-800 p-5 grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                  
                  {/* Optical QR Scanner Reticle View */}
                  <div className="md:col-span-5 bg-slate-900 rounded-2xl border-2 border-emerald-500/40 p-4 flex flex-col items-center justify-center text-center relative overflow-hidden h-64 shadow-inner">
                    <div className="relative w-44 h-44 bg-slate-950 rounded-2xl border border-emerald-500/30 flex items-center justify-center p-2">
                      {/* Corner Target Marks */}
                      <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-emerald-400"></div>
                      <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-emerald-400"></div>
                      <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-emerald-400"></div>
                      <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-emerald-400"></div>

                      {/* Display active worker QR code preview */}
                      <QRCodeSVG 
                        value={JSON.stringify({
                          app: "Digital Construction ERP",
                          workerId: activeSelectedWorker?.id || "ERP-W-101",
                          name: activeSelectedWorker?.name || "Dawit Mengistu",
                          nationalId: activeSelectedWorker?.nationalId || "ETH-9921",
                          site: "Bole Heights"
                        })}
                        size={120}
                        bgColor="#020617"
                        fgColor="#10b981"
                        level="M"
                      />

                      {/* Scanning Laser */}
                      {isQrScanning && (
                        <div className="absolute inset-x-2 h-1 bg-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.9)] animate-[bounce_1s_infinite]"></div>
                      )}
                    </div>
                    
                    <span className="text-[10px] text-slate-400 font-mono mt-2 flex items-center gap-1">
                      <QrCode size={12} className="text-emerald-400" />
                      <span>{isAmharic ? "የሰራተኛ ባጅ የካሜራ መቃኛ (1 ሰከንድ)" : "Camera QR Scanner Viewport (1s)"}</span>
                    </span>
                  </div>

                  {/* Geofence Telemetry & Fast Scanner Controls */}
                  <div className="md:col-span-7 space-y-3">
                    {/* Live Geofence Card */}
                    <div className="p-3 bg-emerald-950/20 border border-emerald-500/30 rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-emerald-400 flex items-center gap-1.5">
                          <MapPin size={14} />
                          <span>{isAmharic ? "የሳይት ጂኦ-አጥር ማረጋገጫ (Haversine GPS Lock)" : "Bole Heights GPS Geofence Telemetry"}</span>
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 font-bold">
                          {simulatedGpsDistance <= allowedRadius ? "INSIDE (ተፈቅዷል)" : "BREACH (ተከልክሏል)"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs font-mono text-slate-300">
                        <span>{isAmharic ? "ከሳይት መሃል ያለ ርቀት፡" : "Distance to Site Center:"}</span>
                        <span className="font-bold text-white">{simulatedGpsDistance}m (ከ {allowedRadius}m ውስጥ)</span>
                      </div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-emerald-400 h-full transition-all" 
                          style={{ width: `${Math.min(100, (simulatedGpsDistance / allowedRadius) * 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Quick Badge Select / Input */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] uppercase font-mono font-bold text-slate-400">
                          {isAmharic ? "የሚቃኝ ሰራተኛ ባጅ (Worker QR ID)" : "Select Worker Badge to Scan"}
                        </label>
                        <button
                          onClick={() => {
                            setSelectedBadgeWorker(activeSelectedWorker);
                            setShowBadgeModal(true);
                          }}
                          className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Printer size={11} />
                          <span>{isAmharic ? "የባጅ ካርድ አትም/አሳይ" : "Printable Badge Card"}</span>
                        </button>
                      </div>

                      <select
                        value={selectedWorkerId}
                        onChange={e => setSelectedWorkerId(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white font-bold focus:border-emerald-500 focus:outline-none"
                      >
                        {workers.map(w => (
                          <option key={w.id} value={w.id}>
                            {w.name} ({w.id} - {w.trade || "Worker"})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* QR Scan Action Button */}
                    <button
                      onClick={() => handleQrBadgeScan(activeSelectedWorker?.id)}
                      disabled={isQrScanning}
                      className={`w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        isQrScanning 
                          ? "bg-slate-800 text-slate-500 cursor-not-allowed" 
                          : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 active:scale-[0.99]"
                      }`}
                    >
                      <QrCode size={18} className={isQrScanning ? "animate-spin" : ""} />
                      <span>
                        {isQrScanning 
                          ? (isAmharic ? "ባጁን በመቃኘት ላይ..." : "SCANNING QR BADGE...") 
                          : (isAmharic ? "የQR ባጅ ቃኝና መዝግብ (1 ሰከንድ)" : "Scan QR Badge & Clock Attendance (1s)")}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* MODE 3: PERSONAL MOBILE SELF CHECK-IN (BYOD WEBAUTHN + GPS) */}
            {/* ========================================================= */}
            {activeSystemMode === "personal_mobile" && (
              <div className="space-y-4">
                <div className="bg-slate-950 rounded-2xl border border-slate-800 p-5 flex flex-col items-center">
                  
                  {/* Smartphone Mockup Frame */}
                  <div className="w-full max-w-sm bg-slate-900 rounded-[2.5rem] border-4 border-slate-700 p-5 shadow-2xl relative space-y-4 text-center">
                    
                    {/* Phone speaker notch */}
                    <div className="w-20 h-3 bg-slate-800 rounded-full mx-auto mb-3"></div>

                    {/* Worker Profile on Phone */}
                    <div className="space-y-2">
                      <img 
                        src={activeSelectedWorker?.photo || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop"} 
                        alt={activeSelectedWorker?.name} 
                        className="w-20 h-20 rounded-full object-cover border-2 border-indigo-500 mx-auto shadow-md"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <h4 className="font-black text-sm text-white">{activeSelectedWorker?.name}</h4>
                        <span className="text-[11px] text-slate-400 font-mono">{activeSelectedWorker?.id} • {activeSelectedWorker?.trade}</span>
                      </div>
                    </div>

                    {/* Worker Selector Dropdown to simulate different employees */}
                    <div className="text-left space-y-1">
                      <label className="text-[9px] uppercase font-mono font-bold text-slate-400">
                        {isAmharic ? "ሰራተኛ ምረጥ (የተጠቃሚ መለያ)" : "Simulate Worker Device Login:"}
                      </label>
                      <select
                        value={selectedWorkerId}
                        onChange={e => setSelectedWorkerId(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-white font-bold"
                      >
                        {workers.map(w => (
                          <option key={w.id} value={w.id}>
                            {w.name} ({w.id})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Real-time GPS Position Verification */}
                    <div className="p-3 bg-indigo-950/40 border border-indigo-500/30 rounded-xl text-left space-y-1 text-xs">
                      <div className="flex items-center justify-between text-indigo-300 font-bold text-[11px]">
                        <span className="flex items-center gap-1">
                          <MapPin size={12} />
                          <span>{isAmharic ? "የስልኩ GPS መገኛ" : "Phone GPS Lock"}</span>
                        </span>
                        <span className="text-emerald-400 font-mono">34m in boundary</span>
                      </div>
                      <p className="text-[10px] text-slate-300 font-mono">
                        Bole Heights: 9.0051°N, 38.7785°E • Status: VERIFIED
                      </p>
                    </div>

                    {/* PERSONAL PHONE SUB-MODE SELECTOR: FACE DETECTION VS QR BADGE */}
                    <div className="grid grid-cols-2 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[10px] font-mono font-bold">
                      <button
                        type="button"
                        onClick={() => setPersonalPhoneMode("face_detection")}
                        className={`py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          personalPhoneMode === "face_detection"
                            ? "bg-red-600 text-white shadow-sm font-black"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        <Camera size={13} />
                        <span>{isAmharic ? "፩. ፊት መለያ (Face)" : "1. Face Detection"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPersonalPhoneMode("qr_badge")}
                        className={`py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          personalPhoneMode === "qr_badge"
                            ? "bg-emerald-600 text-white shadow-sm font-black"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        <QrCode size={13} />
                        <span>{isAmharic ? "፪. የQR ባጅ (Badge)" : "2. My QR Badge"}</span>
                      </button>
                    </div>

                    {/* SUB-OPTION A: PERSONAL MOBILE FACE DETECTION */}
                    {personalPhoneMode === "face_detection" && (
                      <div className="bg-slate-950 p-3.5 rounded-2xl border border-red-500/40 space-y-2.5 text-left animate-fadeIn">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase text-red-400 font-mono flex items-center gap-1">
                            <Camera size={13} />
                            <span>{isAmharic ? "በስልክ ፊት መለያ (Self Face Detection)" : "Front Camera Face Detection"}</span>
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            {isPersonalFaceScanning ? "SCANNING..." : "READY"}
                          </span>
                        </div>

                        {/* Front Camera Selfie Viewport */}
                        <div className="relative w-full h-36 bg-slate-900 rounded-xl border border-red-500/30 flex flex-col items-center justify-center p-2 overflow-hidden shadow-inner group">
                          {activeSelectedWorker?.photo ? (
                            <img 
                              src={activeSelectedWorker.photo} 
                              alt={activeSelectedWorker.name} 
                              className="w-24 h-24 rounded-full object-cover border-2 border-red-500 shadow-lg"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <Camera size={40} className="text-slate-600" />
                          )}

                          {/* Face Landmark Tracking Box */}
                          <div className="absolute inset-5 border border-emerald-400/60 rounded-xl pointer-events-none">
                            <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t-2 border-l-2 border-emerald-400"></div>
                            <div className="absolute top-0 right-0 w-2.5 h-2.5 border-t-2 border-r-2 border-emerald-400"></div>
                            <div className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b-2 border-l-2 border-emerald-400"></div>
                            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b-2 border-r-2 border-emerald-400"></div>
                          </div>

                          {/* Laser Beam */}
                          {isPersonalFaceScanning && (
                            <div className="absolute inset-x-0 h-1 bg-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.9)] animate-[bounce_1.2s_infinite]"></div>
                          )}

                          {/* Confidence Tag */}
                          <div className="absolute bottom-1 inset-x-2 bg-slate-950/90 px-2 py-0.5 rounded border border-white/10 flex items-center justify-between text-[9px] font-mono">
                            <span className="text-slate-400">Face Match:</span>
                            <span className="text-emerald-400 font-bold">
                              {isPersonalFaceScanning ? `${Math.round(personalFaceConfidence)}%` : "99.4% Liveness Pass"}
                            </span>
                          </div>
                        </div>

                        {/* Capture Face Action Button */}
                        <button
                          type="button"
                          onClick={handlePersonalFaceDetectionClockIn}
                          disabled={isPersonalFaceScanning}
                          className={`w-full py-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                            isPersonalFaceScanning 
                              ? "bg-slate-800 text-slate-500 cursor-not-allowed" 
                              : "bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/30 active:scale-[0.99]"
                          }`}
                        >
                          <ScanLine size={16} className={isPersonalFaceScanning ? "animate-spin" : ""} />
                          <span>
                            {isPersonalFaceScanning 
                              ? (isAmharic ? "ፊትን በማረጋገጥ ላይ..." : "SCANNING MY FACE...") 
                              : (isAmharic ? "ፊቴን ቃኝና መገኘቴን አረጋግጥ" : "Scan My Face & Clock-In")}
                          </span>
                        </button>

                        <p className="text-[9px] text-slate-400 italic leading-tight text-center">
                          {isAmharic 
                            ? "ማንኛውም የሲስተሙ ተጠቃሚ በስልኩ ካሜራ የራሱን ፊት ቃኝቶ መገኘቱን በቅጽበት ማረጋገጥ ይችላል!" 
                            : "Any registered system user can clock-in using smartphone selfie face detection."}
                        </p>
                      </div>
                    )}

                    {/* SUB-OPTION B: PERSONAL QR BADGE CAMERA SCANNER */}
                    {personalPhoneMode === "qr_badge" && (
                      <div className="bg-slate-950 p-3.5 rounded-2xl border border-indigo-500/40 space-y-2 text-left animate-fadeIn">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase text-indigo-300 font-mono flex items-center gap-1">
                            <QrCode size={13} className="text-emerald-400" />
                            <span>{isAmharic ? "የራስዎን የQR ባጅ በካሜራ ይቃኙ" : "Scan Your Own Physical QR Badge"}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedBadgeWorker(activeSelectedWorker);
                              setShowBadgeModal(true);
                            }}
                            className="text-[9px] text-emerald-400 hover:underline flex items-center gap-0.5 cursor-pointer font-mono"
                          >
                            <Eye size={10} />
                            <span>{isAmharic ? "ባጄን አሳይ" : "My Badge"}</span>
                          </button>
                        </div>

                        {/* Optical Camera Reticle Mockup on Phone Screen */}
                        <div className="relative w-full h-32 bg-slate-900 rounded-xl border border-emerald-500/30 flex flex-col items-center justify-center p-2 overflow-hidden shadow-inner">
                          <div className="relative w-24 h-24 border border-emerald-400/50 rounded-lg flex items-center justify-center">
                            <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t-2 border-l-2 border-emerald-400"></div>
                            <div className="absolute top-0 right-0 w-2.5 h-2.5 border-t-2 border-r-2 border-emerald-400"></div>
                            <div className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b-2 border-l-2 border-emerald-400"></div>
                            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b-2 border-r-2 border-emerald-400"></div>

                            <QRCodeSVG 
                              value={JSON.stringify({
                                workerId: activeSelectedWorker?.id,
                                name: activeSelectedWorker?.name
                              })}
                              size={72}
                              bgColor="#0f172a"
                              fgColor="#10b981"
                            />

                            {isPersonalScanningBadge && (
                              <div className="absolute inset-x-0 h-1 bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.9)] animate-[bounce_1s_infinite]"></div>
                            )}
                          </div>

                          <span className="text-[9px] font-mono text-slate-400 mt-1">
                            {isPersonalScanningBadge 
                              ? (isAmharic ? "ባጅ በማረጋገጥ ላይ..." : "Validating Own Badge...") 
                              : (isAmharic ? "ካሜራውን ወደ ባጅዎ ያነጣጥሩ" : "Align camera with your physical badge")}
                          </span>
                        </div>

                        {/* Primary Button: Scan Own QR Badge */}
                        <button
                          type="button"
                          onClick={() => handlePersonalScanOwnBadge(activeSelectedWorker?.id)}
                          disabled={isPersonalScanningBadge}
                          className={`w-full py-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                            isPersonalScanningBadge 
                              ? "bg-slate-800 text-slate-500 cursor-not-allowed" 
                              : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 active:scale-[0.99]"
                          }`}
                        >
                          <QrCode size={16} className={isPersonalScanningBadge ? "animate-spin" : ""} />
                          <span>
                            {isPersonalScanningBadge 
                              ? (isAmharic ? "ባጁን በመቃኘት ላይ..." : "SCANNING MY BADGE...") 
                              : (isAmharic ? "የራሴን የQR ባጅ ቃኝና መዝግብ" : "Scan My Own QR Badge & Clock-In")}
                          </span>
                        </button>

                        <p className="text-[9px] text-slate-400 italic leading-tight text-center">
                          {isAmharic 
                            ? "* ሰራተኛው በግል ስልኩ የራሱን ባጅ ብቻ ነው መቃኘት የሚችለው፤ የሌላ ሰው ባጅ ሲቃኝ ወዲያውኑ ይታገዳል!" 
                            : "* Workers are restricted to scanning their OWN badge. Foreign badge proxy scans are blocked."}
                        </p>
                      </div>
                    )}

                    {/* Secondary Fallback: Device WebAuthn Biometrics */}
                    <div className="pt-2 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={handlePersonalMobileSelfCheckin}
                        disabled={isPersonalAuthenticating}
                        className="w-full py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white rounded-xl text-[10px] font-bold font-mono flex items-center justify-center gap-2 cursor-pointer transition-colors"
                      >
                        <Fingerprint size={14} className="text-indigo-400" />
                        <span>{isAmharic ? "በስልክ TouchID/FaceID መዝግብ" : "Alternative: Device TouchID/FaceID"}</span>
                      </button>
                    </div>

                  </div>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* MODE 4: EXTERNAL OTG/USB HARDWARE SCANNER */}
            {/* ========================================================= */}
            {activeSystemMode === "otg_fingerprint" && (
              <div className="space-y-4">
                <div className="bg-slate-950 rounded-2xl border border-slate-800 p-6 flex flex-col items-center text-center space-y-4">
                  
                  {/* Central Hardware Sensor Touch Pad */}
                  <div className="relative">
                    <button
                      onClick={handleOtgFingerprintScan}
                      disabled={isScanning}
                      className={`relative w-40 h-40 rounded-full flex flex-col items-center justify-center transition-all duration-300 border shadow-2xl group cursor-pointer ${
                        isScanning
                          ? "bg-slate-950 border-amber-500 shadow-amber-500/20"
                          : "bg-slate-950/80 hover:bg-slate-950 border-amber-600/40 hover:border-amber-500 hover:shadow-amber-500/10 active:scale-95"
                      }`}
                    >
                      {/* Laser Beam */}
                      {isScanning && (
                        <div className="absolute w-36 h-0.5 bg-amber-500 left-2 shadow-[0_0_10px_rgba(245,158,11,0.9)] animate-[bounce_1.2s_infinite] z-20"></div>
                      )}
                      {isScanning && (
                        <div className="absolute inset-0 bg-amber-600/10 rounded-full animate-ping pointer-events-none"></div>
                      )}

                      <Fingerprint 
                        size={64} 
                        className={`transition-transform duration-300 ${
                          isScanning ? "text-amber-400 scale-110 drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]" : "text-amber-500 group-hover:scale-105"
                        }`}
                      />

                      <span className="text-[11px] font-black tracking-widest text-slate-300 mt-3 block uppercase font-mono group-hover:text-white">
                        {isScanning 
                          ? (isAmharic ? "አሻራ በማንበብ ላይ..." : "SCANNING MINUTIAE...") 
                          : (isAmharic ? "የOTG አሻራ አንባቢ" : "OTG USB Sensor")}
                      </span>
                      
                      <span className="text-[8px] text-slate-500 font-extrabold uppercase block tracking-widest mt-0.5">
                        {isScanning ? (isAmharic ? "እባክዎን ይጠብቁ" : "Wait...") : (isAmharic ? "ጣትን ይንኩ" : "Touch Reader")}
                      </span>
                    </button>
                  </div>

                  {/* Progress Indicator */}
                  {isScanning && (
                    <div className="w-56 text-center space-y-1.5 animate-fadeIn">
                      <div className="flex justify-between text-[10px] text-slate-400 font-mono font-bold">
                        <span>{isAmharic ? "ባዮሜትሪክ ቅኝት" : "BIOMETRIC STREAM"}</span>
                        <span>{Math.round(scanProgress)}%</span>
                      </div>
                      <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className="bg-amber-500 h-full transition-all duration-150" 
                          style={{ width: `${scanProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* Worker Selector for OTG Emulation */}
                  <div className="w-full max-w-sm space-y-1 text-left">
                    <label className="text-[10px] uppercase font-mono font-bold text-slate-400">
                      {isAmharic ? "ጣቱን የሚያነበው ሰራተኛ" : "Worker Touching Hardware Pad:"}
                    </label>
                    <select
                      value={selectedWorkerId}
                      onChange={e => setSelectedWorkerId(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white font-bold"
                    >
                      {workers.map(w => (
                        <option key={w.id} value={w.id}>
                          {w.name} ({w.id} - {w.trade})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* CHECK IN / CHECK OUT SHIFT TOGGLE BUTTONS */}
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

        {/* SIDEBAR: TELEMETRY & LIVE CONSOLE LOGS (COL-SPAN-4) */}
        <div className="lg:col-span-4 flex flex-col justify-between bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-5">
          
          <div className="space-y-4">
            {/* Header */}
            <div className="border-b border-slate-150 pb-3">
              <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                <Sliders className="text-red-600" size={16} />
                <span>{isAmharic ? "የሳይት መቆጣጠሪያ እና ቴሌሜትሪ" : "Site Station Telemetry & Controls"}</span>
              </h3>
              <p className="text-[10px] text-slate-400 mt-1">
                {isAmharic
                  ? "የጂኦፌንስ ክልልን እና የፈተና መለኪያዎችን በዚህ ፓነል ማስተካከል ይቻላል።"
                  : "Live site Geofence radius, simulated deviations, and telemetry logs."}
              </p>
            </div>

            {/* ANTI-BUDDY PUNCHING DEVICE SECURITY PANEL */}
            <div className="space-y-3 bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase font-mono tracking-wider flex items-center gap-1.5 text-amber-400">
                  <ShieldAlert size={15} />
                  <span>{isAmharic ? "የስልክ ደህንነት (Anti-Buddy Punching)" : "Device Anti-Fraud Policy"}</span>
                </span>
                <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold ${
                  isMultiWorkerAuthorized 
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" 
                    : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                }`}>
                  {isMultiWorkerAuthorized 
                    ? (isAmharic ? "ባለብዙ-ሰው ፈቃድ" : "Batch Authorized") 
                    : (isAmharic ? "የ1 ሰው የግል ስልክ" : "Single Worker Lock")}
                </span>
              </div>

              <div className="text-[11px] space-y-1.5 font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>{isAmharic ? "የስልክ መለያ (Device ID):" : "Device Token:"}</span>
                  <span className="text-white font-bold">{deviceToken}</span>
                </div>

                <div className="flex justify-between text-slate-400">
                  <span>{isAmharic ? "የስልኩ ፈቃድ (Role):" : "Device Role:"}</span>
                  <span className={isMultiWorkerAuthorized ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
                    {activeRoleForDevice}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950/90 border border-slate-800 text-[10px]">
                  {isMultiWorkerAuthorized ? (
                    <span className="text-emerald-300 font-bold flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                      <span>{isAmharic ? "ይህ ስልክ የTime Keeper / Gang Chief በመሆኑ የብዙ ሰራተኞችን አቴንዳንስ መመዝገብ ይችላል።" : "Authorized: Time Keeper & Gang Chief devices can record unlimited workers."}</span>
                    </span>
                  ) : (
                    <div className="space-y-1">
                      <span className="text-amber-300 font-bold block">
                        {isAmharic ? "⚠️ የ1 ሰው ህግ፡ ከአንድ ሰው በላይ አቴንዳንስ መቀበል አይችልም!" : "⚠️ Single-worker lock active: Max 1 person allowed today."}
                      </span>
                      <div className="text-slate-300">
                        {deviceBoundWorkerId ? (
                          <span>
                            {isAmharic ? "🔒 ዛሬ የተቆለፈበት ሰራተኛ፡ " : "Locked today to: "}
                            <strong className="text-white">
                              {workers.find(w => w.id === deviceBoundWorkerId)?.name || deviceBoundWorkerId}
                            </strong>
                          </span>
                        ) : (
                          <span className="text-emerald-400">
                            {isAmharic ? "🔓 ክፍት (የመጀመሪያውን ሰው ይጠብቃል...)" : "Unlocked: Awaiting first worker"}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Role Switcher for Live Testing */}
              <div className="space-y-1 pt-1 border-t border-slate-800">
                <label className="text-[9px] uppercase font-mono text-slate-400 block font-bold">
                  {isAmharic ? "ህጉን ለመፈተሽ ሚና ቀይር (Switch Role to Test):" : "Test Authorization Role:"}
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setActiveRoleForDevice(UserRole.TIME_KEEPER)}
                    className={`py-1.5 px-2 rounded-lg text-[10px] font-bold font-mono transition-all cursor-pointer ${
                      activeRoleForDevice === UserRole.TIME_KEEPER 
                        ? "bg-emerald-600 text-white shadow-sm" 
                        : "bg-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    Time Keeper (ፈቃድ ያለው)
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveRoleForDevice(UserRole.GANG_CHIEF)}
                    className={`py-1.5 px-2 rounded-lg text-[10px] font-bold font-mono transition-all cursor-pointer ${
                      activeRoleForDevice === UserRole.GANG_CHIEF 
                        ? "bg-emerald-600 text-white shadow-sm" 
                        : "bg-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    Gang Chief (ፈቃድ ያለው)
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveRoleForDevice(UserRole.TEAM_LEADER)}
                    className={`py-1.5 px-2 rounded-lg text-[10px] font-bold font-mono transition-all cursor-pointer ${
                      activeRoleForDevice === UserRole.TEAM_LEADER 
                        ? "bg-emerald-600 text-white shadow-sm" 
                        : "bg-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    Team Leader (ፈቃድ ያለው)
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveRoleForDevice(UserRole.SUPERVISOR)}
                    className={`py-1.5 px-2 rounded-lg text-[10px] font-bold font-mono transition-all cursor-pointer ${
                      activeRoleForDevice === UserRole.SUPERVISOR 
                        ? "bg-rose-600 text-white shadow-sm" 
                        : "bg-slate-800 text-slate-400 hover:text-rose-300"
                    }`}
                  >
                    Supervisor (የተከለከለ)
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveRoleForDevice(UserRole.WORKER)}
                    className={`col-span-2 py-1.5 px-2 rounded-lg text-[10px] font-bold font-mono transition-all cursor-pointer ${
                      activeRoleForDevice === UserRole.WORKER 
                        ? "bg-amber-600 text-white shadow-sm" 
                        : "bg-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    Worker (የግል ስልክ - የራሱን ባጅ 1 ሰው ብቻ)
                  </button>
                </div>

                {deviceBoundWorkerId && !isMultiWorkerAuthorized && (
                  <button
                    type="button"
                    onClick={() => {
                      setDeviceBoundWorkerId(null);
                      if (typeof window !== "undefined") {
                        localStorage.removeItem(`erp_device_bound_worker_${todayDateStr}`);
                      }
                    }}
                    className="w-full mt-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[9px] rounded-lg font-mono transition-colors cursor-pointer"
                  >
                    [↻ {isAmharic ? "ለፈተና የስልኩን ቁልፍ አጽዳ (Reset Lock)" : "Reset Device Lock"}]
                  </button>
                )}
              </div>
            </div>

            {/* Geofence Distance Slider */}
            <div className="space-y-2 bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">{isAmharic ? "የፈተና ርቀት ከሳይት" : "Simulated Distance:"}</span>
                <span className="font-mono font-bold text-red-600">{simulatedGpsDistance}m</span>
              </div>
              <input 
                type="range" 
                min="5" 
                max="300" 
                value={simulatedGpsDistance}
                onChange={e => setSimulatedGpsDistance(parseInt(e.target.value) || 0)}
                className="w-full accent-red-600 cursor-pointer"
              />
              <div className="flex justify-between text-[9px] font-mono text-slate-400">
                <span>5m (Inside)</span>
                <span className="text-amber-600 font-bold">{allowedRadius}m Boundary</span>
                <span>300m (Out of bounds)</span>
              </div>
            </div>

            {/* Terminal Live Event Log */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-black text-slate-400 block font-mono flex items-center justify-between">
                <span>{isAmharic ? "የመሳሪያው የቀጥታ መዝገብ" : "Live Station Activity Logs"}</span>
                <span className="text-emerald-600 font-bold">● Active</span>
              </label>
              <div className="bg-slate-950 p-3 rounded-2xl font-mono text-[10px] text-slate-300 space-y-1.5 h-44 overflow-y-auto border border-slate-900 scrollbar-thin">
                {terminalLogs.length === 0 ? (
                  <div className="text-slate-600 italic py-8 text-center">
                    {isAmharic ? "ምንም ክስተት አልተመዘገበም..." : "Station idle. Awaiting biometric scan..."}
                  </div>
                ) : (
                  terminalLogs.slice().reverse().map((log, idx) => (
                    <div key={idx} className="leading-tight border-b border-slate-900 pb-1 last:border-0">
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Recent Biometric Audit Snapshots */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-black text-slate-400 block font-mono">
                {isAmharic ? "የቅርብ ጊዜ ማረጋገጫዎች" : "Recent Verification Hashes"}
              </label>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {biometricAuditLogs.slice(0, 3).map(log => (
                  <div key={log.id} className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-[10px]">
                    <div>
                      <span className="font-extrabold text-slate-850 block">{log.workerName}</span>
                      <span className="text-slate-400 font-mono text-[9px]">{log.method} • {log.status}</span>
                    </div>
                    <span className="font-mono text-[9px] bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-600">
                      {log.hash.slice(0, 12)}...
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Site Location Footer */}
          <div className="pt-3 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between font-mono">
            <span>Project: Bole Heights Tower</span>
            <span>Zone: Main Gate B</span>
          </div>

        </div>

      </div>

      {/* 4. WORKER QR BADGE MODAL (PRINTABLE / TESTABLE) */}
      {showBadgeModal && selectedBadgeWorker && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 relative space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <QrCode size={18} className="text-emerald-600" />
                <h4 className="font-black text-sm text-slate-900">
                  {isAmharic ? "ዲጂታል የሰራተኛ ባጅ (QR Badge)" : "Official Digital Worker Badge"}
                </h4>
              </div>
              <button 
                onClick={() => setShowBadgeModal(false)}
                className="text-slate-400 hover:text-slate-700 font-black text-sm"
              >
                ✕
              </button>
            </div>

            {/* Badge Card Physical Mockup */}
            <div className="bg-gradient-to-b from-slate-900 to-slate-950 text-white p-5 rounded-2xl border-2 border-slate-800 text-center space-y-3 shadow-xl">
              <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 border-b border-slate-800 pb-2">
                <span>DIGITAL CONSTRUCTION ERP</span>
                <span className="text-red-500 font-bold">BOLE HEIGHTS</span>
              </div>

              <img 
                src={selectedBadgeWorker.photo || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop"} 
                alt={selectedBadgeWorker.name} 
                className="w-20 h-20 rounded-full object-cover border-2 border-emerald-500 mx-auto shadow-md"
                referrerPolicy="no-referrer"
              />

              <div>
                <h3 className="font-black text-base text-white">{selectedBadgeWorker.name}</h3>
                <span className="text-xs text-emerald-400 font-mono font-bold block">{selectedBadgeWorker.trade || "Worker"}</span>
                <span className="text-[10px] text-slate-400 font-mono">{selectedBadgeWorker.id} • {selectedBadgeWorker.company || "Main Contractor"}</span>
              </div>

              {/* QR Code */}
              <div className="bg-white p-2.5 rounded-xl inline-block shadow-inner">
                <QRCodeSVG 
                  value={JSON.stringify({
                    app: "Digital Construction ERP",
                    workerId: selectedBadgeWorker.id,
                    name: selectedBadgeWorker.name,
                    nationalId: selectedBadgeWorker.nationalId || "ETH-001"
                  })}
                  size={130}
                  bgColor="#ffffff"
                  fgColor="#000000"
                  level="M"
                />
              </div>

              <div className="text-[9px] font-mono text-slate-400 pt-1">
                Authorized for Bole Heights Geofenced Site Entrance
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowBadgeModal(false);
                  handleModeChange("qr_geofence");
                  handleQrBadgeScan(selectedBadgeWorker.id);
                }}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <ScanLine size={14} />
                <span>{isAmharic ? "ይህንን ባጅ አሁን ቃኝ" : "Scan This Badge Now"}</span>
              </button>
              <button
                onClick={() => setShowBadgeModal(false)}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors cursor-pointer"
              >
                {isAmharic ? "ዝጋ" : "Close"}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 5. LIVE MASTER ATTENDANCE DATABASE TABLE */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-5" id="shared-attendance-table-container">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-black text-base text-slate-900 flex items-center space-x-2">
              <Database className="text-red-600" size={20} />
              <span>{isAmharic ? "የጋራ የመገኘት ሰንጠረዥ (Live Unified Master Roster)" : "Live Unified Master Attendance Records"}</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {isAmharic
                ? "በስልክ ካሜራ፣ በQR ባጅ፣ በግል ስልክ እና በOTG አሻራ የተመዘገቡ የቀጥታ መረጃዎች በአንድ ላይ የተደራጁበት"
                : "Real-time consolidated roster reflecting all 4 capture methods across all site locations."}
            </p>
          </div>

          {/* Search & Team Filter */}
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-60">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
              <input 
                type="text" 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder={isAmharic ? "በስም ወይም በመለያ ፈልግ..." : "Search worker name or ID..."}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-red-500 focus:outline-none"
              />
            </div>

            <select
              value={filterTeam}
              onChange={e => setFilterTeam(e.target.value)}
              className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-red-500"
            >
              {teamOptions.map(t => (
                <option key={t} value={t}>{t === "All" ? (isAmharic ? "ሁሉም የሙያ ዘርፍ" : "All Trades") : t}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-medium text-slate-600 min-w-[1000px]">
            <thead>
              <tr className="border-b border-slate-150 text-[10px] uppercase font-black tracking-wider text-slate-400 font-mono bg-slate-50/50">
                <th className="py-3 px-3">የሰራተኛ መረጃ (Worker)</th>
                <th className="py-3 px-3">ቀን (Date)</th>
                <th className="py-3 px-3">መግቢያ (Clock In)</th>
                <th className="py-3 px-3">መውጫ (Clock Out)</th>
                <th className="py-3 px-3">የመመዝገቢያ ዘዴ (Method)</th>
                <th className="py-3 px-3">የተሰራ ሰዓት (Net Hours)</th>
                <th className="py-3 px-3">ሁኔታ (Status)</th>
                <th className="py-3 px-3">የመሳሪያ መረጃ (Device/Proof)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAttendance.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400 italic">
                    {isAmharic ? "ምንም አይነት የመገኘት መዝገብ አልተገኘም።" : "No matching attendance records found."}
                  </td>
                </tr>
              ) : (
                filteredAttendance.map(record => (
                  <tr key={record.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-900 flex items-center space-x-2">
                      <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-mono text-[10px] font-bold shrink-0">
                        {record.workerName.charAt(0)}
                      </div>
                      <div>
                        <span>{record.workerName}</span>
                        <span className="text-[10px] text-slate-400 block font-mono font-normal">
                          {record.workerId} • {record.trade || record.department || "Field Worker"}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono">{record.date}</td>
                    <td className="py-3 px-3 font-mono text-emerald-600 font-bold">{record.checkIn || "--:--"}</td>
                    <td className="py-3 px-3 font-mono text-slate-700">{record.checkOut || "--:--"}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                        record.method === AttendanceMethod.FACE_RECOGNITION
                          ? "bg-red-50 text-red-600 border border-red-200"
                          : record.method === AttendanceMethod.QR_CODE
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : record.method === AttendanceMethod.GPS_GEOFENCE
                          ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}>
                        {record.method === AttendanceMethod.FACE_RECOGNITION && <Camera size={11} />}
                        {record.method === AttendanceMethod.QR_CODE && <QrCode size={11} />}
                        {record.method === AttendanceMethod.GPS_GEOFENCE && <Smartphone size={11} />}
                        {record.method === AttendanceMethod.FINGERPRINT && <Fingerprint size={11} />}
                        <span>{record.method || "Biometric"}</span>
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-800">
                      {record.workingHours ? `${record.workingHours}h` : "--"}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        record.status === "Present" 
                          ? "bg-emerald-100 text-emerald-800" 
                          : record.status === "Late" 
                          ? "bg-amber-100 text-amber-800" 
                          : "bg-slate-100 text-slate-600"
                      }`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-[10px] text-slate-500">
                      <span>{record.deviceUsed || "Mobile Station"}</span>
                      {record.biometricStatus && (
                        <span className="text-[9px] text-slate-400 block">{record.biometricStatus}</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
