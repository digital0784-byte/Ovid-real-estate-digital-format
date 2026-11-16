import React, { useState, useEffect, useMemo, useRef } from "react";
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
  UserPlus,
  Wifi,
  WifiOff,
  UserCheck,
  Building2,
  Layers,
  Award,
  KeyRound,
  Video,
  VideoOff,
  Scan
} from "lucide-react";
import { Worker, AttendanceRecord, AttendanceMethod, UserRole } from "../types";
import {
  captureAndVerifyLiveFace,
  enrollWorkerFingerprint,
  verifyWorkerFingerprint,
  getStoredCredentialId,
  getCurrentGpsPosition,
  calculateDistanceMeters,
  getBiometricCapabilities
} from "../services/biometricService";

interface BiometricEnrollmentKioskProps {
  workers: Worker[];
  attendance: AttendanceRecord[];
  onAddAttendance: (record: AttendanceRecord) => void;
  onEnrollWorker: (worker: Worker) => void;
  onUpdateWorker?: (worker: Worker) => void | Promise<void>;
  isAmharic: boolean;
  currentUserRole: UserRole;
  onLogAction?: (action: string, details: string) => void;
}

interface OfflineDraftRecord {
  id: string;
  workerId: string;
  workerName: string;
  type: "in" | "out";
  time: string;
  date: string;
  method: AttendanceMethod;
  gpsCoordinates: { lat: number; lng: number };
  deviation: number;
  gpsStatus: string;
}

export const BiometricEnrollmentKiosk: React.FC<BiometricEnrollmentKioskProps> = ({
  workers,
  attendance,
  onAddAttendance,
  onEnrollWorker,
  onUpdateWorker,
  isAmharic,
  currentUserRole,
  onLogAction
}) => {
  // Screen views: "kiosk" (Self-Attendance) vs "enroll" (Initial Enrollment)
  const [activeMode, setActiveMode] = useState<"kiosk" | "enroll">("kiosk");
  
  // Offline & Synchronization states
  const [isOnline, setIsOnline] = useState(typeof window !== "undefined" ? navigator.onLine : true);
  const [offlineQueue, setOfflineQueue] = useState<OfflineDraftRecord[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);

  // Configurable Geofence (Digital Bole Heights)
  const [geofenceLat, setGeofenceLat] = useState(9.0049);
  const [geofenceLng, setGeofenceLng] = useState(38.7783);
  const [allowedRadius, setAllowedRadius] = useState(150); // in meters
  const [liveGps, setLiveGps] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<"idle" | "acquiring" | "ready" | "error">("idle");
  const [gpsError, setGpsError] = useState<string>("");

  // Audio system state
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);

  // Help guides
  const [showPolicies, setShowPolicies] = useState(false);

  // ----------------------------------------------------
  // ENROLLMENT FORM STATE
  // ----------------------------------------------------
  const [enrollId, setEnrollId] = useState("");
  const [enrollName, setEnrollName] = useState("");
  const [enrollCompany, setEnrollCompany] = useState("Digital Construction ERP");
  const [enrollDepartment, setEnrollDepartment] = useState("Formwork Assembly");
  const [enrollTrade, setEnrollTrade] = useState("Carpenter");
  const [enrollBasicMonthlySalary, setEnrollBasicMonthlySalary] = useState<number>(18000);
  const [enrollBuilding, setEnrollBuilding] = useState("Digital Tower 1");
  const [enrollFloor, setEnrollFloor] = useState(4);
  const [enrollZone, setEnrollZone] = useState("Zone B");
  const [enrollLeader, setEnrollLeader] = useState("");
  const [enrollChief, setEnrollChief] = useState("");
  const [enrollSupervisor, setEnrollSupervisor] = useState("");
  const [enrollPhoto, setEnrollPhoto] = useState("");
  const [enrollFaceData, setEnrollFaceData] = useState("");
  const [enrollFingerprintData, setEnrollFingerprintData] = useState("");
  const [enrollBioBusy, setEnrollBioBusy] = useState(false);
  const [enrollBioMsg, setEnrollBioMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [isEnrollCameraOn, setIsEnrollCameraOn] = useState(false);
  const enrollVideoRef = useRef<HTMLVideoElement | null>(null);
  const enrollStreamRef = useRef<MediaStream | null>(null);
  
  // Bank Account & Payment details
  const [enrollBankName, setEnrollBankName] = useState("Commercial Bank of Ethiopia (CBE)");
  const [enrollBankAccountNumber, setEnrollBankAccountNumber] = useState("");
  const [enrollMobileMoneyType, setEnrollMobileMoneyType] = useState("Telebirr");
  const [enrollMobileMoneyNumber, setEnrollMobileMoneyNumber] = useState("");
  
  // Kiosk PIN & Scan state
  const [enrollPin, setEnrollPin] = useState("");
  const [enteredPin, setEnteredPin] = useState("");
  const [pinFailedAttempts, setPinFailedAttempts] = useState(0);
  const [pinLockoutUntil, setPinLockoutUntil] = useState<number | null>(null);

  // KIOSK SCREEN STATE
  const [kioskAction, setKioskAction] = useState<"in" | "out">("in");
  const [kioskVerifyMethod, setKioskVerifyMethod] = useState<"fingerprint" | "face" | "pin">("fingerprint");
  const [selectedKioskWorkerId, setSelectedKioskWorkerId] = useState<string>("");
  const [isKioskCameraOn, setIsKioskCameraOn] = useState(false);
  const [kioskCameraError, setKioskCameraError] = useState<string>("");
  const kioskVideoRef = useRef<HTMLVideoElement | null>(null);
  const kioskStreamRef = useRef<MediaStream | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [kioskLogs, setKioskLogs] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | "info";
    title: string;
    message: string;
    worker?: Worker;
  } | null>(null);

  const capabilities = useMemo(() => getBiometricCapabilities(), []);

  const refreshLiveGps = async (): Promise<{ lat: number; lng: number; accuracy: number; dist: number; isInside: boolean } | null> => {
    setGpsStatus("acquiring");
    setGpsError("");
    try {
      const pos = await getCurrentGpsPosition(10000);
      setLiveGps(pos);
      setGpsStatus("ready");
      const dist = Math.round(calculateDistanceMeters(pos.lat, pos.lng, geofenceLat, geofenceLng));
      return { ...pos, dist, isInside: dist <= allowedRadius };
    } catch (err: any) {
      setGpsStatus("error");
      const msg = isAmharic
        ? "የጂፒኤስ መገኛ ቦታ ማግኘት አልተቻለም። እባክዎ የመገኛ ቦታ (Location) ፍቃድ ይስጡ።"
        : (err?.message || "Unable to acquire GPS location. Please enable location permission.");
      setGpsError(msg);
      return null;
    }
  };

  useEffect(() => {
    void refreshLiveGps();
    return () => {
      if (kioskStreamRef.current) {
        kioskStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (enrollStreamRef.current) {
        enrollStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const currentDistance = liveGps
    ? Math.round(calculateDistanceMeters(liveGps.lat, liveGps.lng, geofenceLat, geofenceLng))
    : null;
  const isInside = currentDistance !== null ? currentDistance <= allowedRadius : false;

  const stopKioskCamera = () => {
    if (kioskStreamRef.current) {
      kioskStreamRef.current.getTracks().forEach((t) => t.stop());
      kioskStreamRef.current = null;
    }
    if (kioskVideoRef.current) {
      kioskVideoRef.current.srcObject = null;
    }
    setIsKioskCameraOn(false);
  };

  const startKioskCamera = async (): Promise<boolean> => {
    setKioskCameraError("");
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setKioskCameraError(isAmharic ? "ካሜራ በዚህ አሳሽ አይደገፍም።" : "Camera API is not supported in this browser.");
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      kioskStreamRef.current = stream;
      setIsKioskCameraOn(true);
      setTimeout(() => {
        if (kioskVideoRef.current) {
          kioskVideoRef.current.srcObject = stream;
          void kioskVideoRef.current.play().catch(() => {});
        }
      }, 60);
      return true;
    } catch (err: any) {
      setKioskCameraError(
        isAmharic
          ? "የካሜራ ፍቃድ ተከልክሏል ወይም ካሜራ አልተገኘም።"
          : (err?.message || "Camera permission denied or camera unavailable.")
      );
      setIsKioskCameraOn(false);
      return false;
    }
  };

  const stopEnrollCamera = () => {
    if (enrollStreamRef.current) {
      enrollStreamRef.current.getTracks().forEach((t) => t.stop());
      enrollStreamRef.current = null;
    }
    if (enrollVideoRef.current) {
      enrollVideoRef.current.srcObject = null;
    }
    setIsEnrollCameraOn(false);
  };

  const startEnrollCamera = async () => {
    setEnrollBioMsg(null);
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setEnrollBioMsg({
        ok: false,
        text: isAmharic ? "ካሜራ በዚህ አሳሽ አይደገፍም።" : "Camera API is not supported in this browser.",
      });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      enrollStreamRef.current = stream;
      setIsEnrollCameraOn(true);
      setTimeout(() => {
        if (enrollVideoRef.current) {
          enrollVideoRef.current.srcObject = stream;
          void enrollVideoRef.current.play().catch(() => {});
        }
      }, 60);
    } catch (err: any) {
      setEnrollBioMsg({
        ok: false,
        text: isAmharic
          ? "የካሜራ ፍቃድ ተከልክሏል ወይም ካሜራ አልተገኘም።"
          : (err?.message || "Camera access denied."),
      });
    }
  };

  // Synthesizer beep
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
        osc.frequency.setValueAtTime(950, now);
        gain.gain.setValueAtTime(0.04, now);
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

        osc1.frequency.setValueAtTime(1300, now);
        gain1.gain.setValueAtTime(0.06, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.12);

        osc2.frequency.setValueAtTime(1650, now + 0.1);
        gain2.gain.setValueAtTime(0.06, now + 0.1);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.1);
        osc2.stop(now + 0.22);
      } else if (type === "error") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(140, now);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.4);
      } else if (type === "sync") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(1800, now);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
      }
    } catch (e) {
      console.warn("Audio Context failed: ", e);
    }
  };

  const handleEnrollCaptureFace = async () => {
    if (!enrollVideoRef.current) {
      setEnrollBioMsg({
        ok: false,
        text: isAmharic ? "መጀመሪያ ካሜራውን ያብሩ።" : "Please start the camera first.",
      });
      return;
    }
    setEnrollBioBusy(true);
    setEnrollBioMsg(null);
    const res = await captureAndVerifyLiveFace(enrollVideoRef.current);
    setEnrollBioBusy(false);
    if (!res.detected || !res.descriptor) {
      playBeep("error");
      setEnrollBioMsg({
        ok: false,
        text: isAmharic ? (res.reasonAm || "ፊት አልተለየም።") : (res.reasonEn || "No face detected."),
      });
      return;
    }
    playBeep("success");
    setEnrollFaceData(res.descriptor);
    if (res.snapshotDataUrl) setEnrollPhoto(res.snapshotDataUrl);
    stopEnrollCamera();
    setEnrollBioMsg({
      ok: true,
      text: isAmharic
        ? `የፊት መለያ በስኬት ተመዝግቧል (${res.confidence}% ጥራት)`
        : `Face biometric captured (${res.confidence}% confidence).`,
    });
  };

  const handleEnrollFingerprintHardware = async () => {
    const tempId = enrollId.trim() || `ERP-W-${100 + workers.length + 1}`;
    const displayName = enrollName.trim() || tempId;
    if (!enrollId.trim()) setEnrollId(tempId);
    setEnrollBioBusy(true);
    setEnrollBioMsg(null);
    const res = await enrollWorkerFingerprint({ id: tempId, name: displayName });
    setEnrollBioBusy(false);
    if (!res.success || !res.templateString) {
      playBeep("error");
      setEnrollBioMsg({
        ok: false,
        text: isAmharic ? res.messageAm : res.message,
      });
      return;
    }
    playBeep("success");
    setEnrollFingerprintData(res.templateString);
    setEnrollBioMsg({
      ok: true,
      text: isAmharic ? res.messageAm : res.message,
    });
  };

  // ----------------------------------------------------
  // ENROLL SUBMIT
  // ----------------------------------------------------
  const handleEnrollSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!enrollName.trim() || !enrollLeader.trim() || !enrollChief.trim()) {
      playBeep("error");
      alert(isAmharic ? "እባክዎን የሰራተኛውን ሙሉ ስም፣ የቡድን መሪ እና ጋንግ ቺፍ ይምረጡ!" : "Please enter the employee's full name and select a real Team Leader and Gang Chief!");
      return;
    }

    let assignedPin = enrollPin.trim();
    if (!assignedPin) {
      const existingPins = new Set(workers.map(w => w.attendancePin).filter(Boolean));
      do {
        assignedPin = Math.floor(1000 + Math.random() * 9000).toString();
      } while (existingPins.has(assignedPin));
    }

    const assignedId = enrollId.trim() || `ERP-W-${100 + workers.length + 1}`;
    const newWorker: Worker = {
      id: assignedId,
      name: enrollName.trim(),
      basicMonthlySalary: Number(enrollBasicMonthlySalary) || 18000,
      photo: enrollPhoto || undefined,
      faceRecognitionData: enrollFaceData || undefined,
      fingerprint: enrollFingerprintData || undefined,
      qrCode: `ERP-QR-${assignedId}`,
      company: enrollCompany,
      department: enrollDepartment,
      trade: enrollTrade,
      joinedDate: new Date().toISOString().split("T")[0],
      assignedProject: "Digital Bole Heights",
      building: enrollBuilding,
      floor: enrollFloor,
      zone: enrollZone,
      teamLeader: enrollLeader.trim(),
      gangChief: enrollChief.trim(),
      supervisor: enrollSupervisor.trim() || "Unassigned",
      attendancePin: assignedPin,
      status: "Active",
      teamId: "T-01",
      bankName: enrollBankName,
      bankAccountNumber: enrollBankAccountNumber,
      mobileMoneyType: enrollMobileMoneyType,
      mobileMoneyNumber: enrollMobileMoneyNumber
    };

    onEnrollWorker(newWorker);
    stopEnrollCamera();
    
    // Log to audit log
    if (onLogAction) {
      onLogAction(
        "Worker Enrolled with Biometrics & PIN", 
        `Enrolled worker ${newWorker.name} (${newWorker.id}) [Face: ${enrollFaceData ? "Yes" : "No"}, Fingerprint: ${enrollFingerprintData ? "Yes" : "No"}] and PIN [${assignedPin}].`
      );
    }

    playBeep("success");

    // Success feedback
    setFeedback({
      type: "success",
      title: isAmharic ? "ምዝገባው በተሳካ ሁኔታ ተጠናቋል!" : "Enrollment Successful!",
      message: isAmharic 
        ? `ሰራተኛው ${enrollName} [${newWorker.id}] በባንክ ሂሳብ [${enrollBankName}: ${enrollBankAccountNumber || "ያልተሞላ"}] እና ፒን [${assignedPin}] ተመዝግቧል።`
        : `Employee ${enrollName} [${newWorker.id}] enrolled with Bank [${enrollBankName}: ${enrollBankAccountNumber || "N/A"}] and PIN [${assignedPin}].`
    });

    // Reset Form
    setEnrollName("");
    setEnrollLeader("");
    setEnrollChief("");
    setEnrollSupervisor("");
    setEnrollPin("");
    setEnrollPhoto("");
    setEnrollFaceData("");
    setEnrollFingerprintData("");
    setEnrollBioMsg(null);
    setEnrollBankAccountNumber("");
    setEnrollMobileMoneyNumber("");
    setEnrollId(""); // Will regenerate on next cycle
    setSelectedKioskWorkerId(newWorker.id);
    setActiveMode("kiosk"); // Switch to kiosk to verify immediately
  };

  // ----------------------------------------------------
  // REAL BIOMETRIC (FINGERPRINT / FACE) & PIN VERIFICATION
  // ----------------------------------------------------
  const triggerKioskFingerprintScan = async () => {
    if (isScanning) return;
    setFeedback(null);

    const targetWorker = workers.find((w) => w.id === selectedKioskWorkerId);
    if (!targetWorker) {
      playBeep("error");
      setFeedback({
        type: "error",
        title: isAmharic ? "ሰራተኛ አልተመረጠም" : "Select Employee",
        message: isAmharic
          ? "እባክዎ መጀመሪያ ከቀኝ በኩል ካለው ዝርዝር ወይም መምረጫ ሰራተኛ ይምረጡ።"
          : "Please select an employee from the directory or dropdown first.",
      });
      return;
    }

    setIsScanning(true);
    setScanProgress(25);
    setKioskLogs([
      isAmharic
        ? `🔐 የ ${targetWorker.name} የጣት አሻራ ዳሳሽ እየተጠየቀ ነው...`
        : `🔐 Requesting hardware fingerprint verification for ${targetWorker.name}...`,
    ]);
    playBeep("scan");

    const credId = getStoredCredentialId(targetWorker);
    const bioRes = credId
      ? await verifyWorkerFingerprint(targetWorker)
      : await enrollWorkerFingerprint(targetWorker);

    if (!bioRes.success) {
      setIsScanning(false);
      playBeep("error");
      setFeedback({
        type: "error",
        title: isAmharic ? "የጣት አሻራ ማረጋገጫ አልተሳካም" : "Fingerprint Verification Failed",
        message: isAmharic ? bioRes.messageAm : bioRes.message,
        worker: targetWorker,
      });
      return;
    }

    let updatedWorker = targetWorker;
    if (!credId && bioRes.templateString && onUpdateWorker) {
      updatedWorker = { ...targetWorker, fingerprint: bioRes.templateString };
      await onUpdateWorker(updatedWorker);
    }

    setScanProgress(65);
    setKioskLogs((prev) => [
      ...prev,
      isAmharic
        ? `✅ አሻራ ተረጋግጧል። የጂፒኤስ መገኛ ቦታ በመፍተሽ ላይ...`
        : `✅ Fingerprint credential verified. Acquiring real GPS location...`,
    ]);

    const gps = await refreshLiveGps();
    setIsScanning(false);
    setScanProgress(100);
    if (!gps) {
      playBeep("error");
      setFeedback({
        type: "error",
        title: isAmharic ? "ጂፒኤስ አልተገኘም" : "Location Required",
        message: isAmharic
          ? "ለስራ መግቢያ የመገኛ ቦታ (GPS) ፍቃድ ያስፈልጋል - እባክዎ ጂፒኤስ ይፍቀዱ!"
          : "Location required for attendance — please enable GPS permission.",
        worker: updatedWorker,
      });
      return;
    }

    processAttendanceResult(updatedWorker, gps.lat, gps.lng, gps.dist, gps.isInside, AttendanceMethod.FINGERPRINT);
  };

  const triggerKioskFaceScan = async () => {
    if (isScanning) return;
    setFeedback(null);

    const targetWorker = workers.find((w) => w.id === selectedKioskWorkerId);
    if (!targetWorker) {
      playBeep("error");
      setFeedback({
        type: "error",
        title: isAmharic ? "ሰራተኛ አልተመረጠም" : "Select Employee",
        message: isAmharic
          ? "እባክዎ መጀመሪያ የፊት ፍተሻ የሚደረግለትን ሰራተኛ ይምረጡ።"
          : "Please select the employee first for live face detection.",
      });
      return;
    }

    if (!isKioskCameraOn || !kioskVideoRef.current) {
      const started = await startKioskCamera();
      if (!started) {
        playBeep("error");
        setFeedback({
          type: "error",
          title: isAmharic ? "ካሜራ አልተገኘም" : "Camera Required",
          message: isAmharic
            ? "የፊት መለያ ለመጠቀም እባክዎ የካሜራ ፍቃድ ይስጡ።"
            : "Please grant camera permission to run live face detection.",
          worker: targetWorker,
        });
        return;
      }
      setFeedback({
        type: "info",
        title: isAmharic ? "ካሜራ ተከፍቷል" : "Camera Ready",
        message: isAmharic
          ? "እባክዎ ፊትዎን በካሜራው መሃል አድርገው 'ፊት ፈትሽ እና መዝግብ' የሚለውን ይጫኑ።"
          : "Center your face in the camera frame and press Capture & Verify Face.",
        worker: targetWorker,
      });
      return;
    }

    setIsScanning(true);
    setScanProgress(35);
    setKioskLogs([
      isAmharic
        ? `📷 ለ ${targetWorker.name} የቀጥታ የፊት መለያ ፍተሻ በመካሄድ ላይ...`
        : `📷 Running live facial detection & liveness check for ${targetWorker.name}...`,
    ]);
    playBeep("scan");

    const faceRes = await captureAndVerifyLiveFace(kioskVideoRef.current, targetWorker.faceRecognitionData);
    if (!faceRes.detected || !faceRes.descriptor) {
      setIsScanning(false);
      playBeep("error");
      setFeedback({
        type: "error",
        title: isAmharic ? "የፊት መለያ አልተሳካም" : "Face Detection Failed",
        message: isAmharic
          ? (faceRes.reasonAm || "በካሜራው ውስጥ ፊት አልተለየም።")
          : (faceRes.reasonEn || "Face verification failed."),
        worker: targetWorker,
      });
      return;
    }

    let updatedWorker = targetWorker;
    if (!targetWorker.faceRecognitionData?.startsWith("face-v1:") && onUpdateWorker) {
      updatedWorker = {
        ...targetWorker,
        faceRecognitionData: faceRes.descriptor,
        photo: faceRes.snapshotDataUrl || targetWorker.photo,
      };
      await onUpdateWorker(updatedWorker);
    }

    setScanProgress(70);
    setKioskLogs((prev) => [
      ...prev,
      isAmharic
        ? `✅ ፊት ተረጋግጧል (${faceRes.similarityScore ?? faceRes.confidence}%). ጂፒኤስ በመፍተሽ ላይ...`
        : `✅ Face verified (${faceRes.similarityScore ?? faceRes.confidence}%). Checking GPS...`,
    ]);

    const gps = await refreshLiveGps();
    setIsScanning(false);
    setScanProgress(100);
    if (!gps) {
      playBeep("error");
      setFeedback({
        type: "error",
        title: isAmharic ? "ጂፒኤስ አልተገኘም" : "Location Required",
        message: isAmharic
          ? "ለስራ መግቢያ የመገኛ ቦታ (GPS) ፍቃድ ያስፈልጋል - እባክዎ ጂፒኤስ ይፍቀዱ!"
          : "Location required for attendance — please enable GPS permission.",
        worker: updatedWorker,
      });
      return;
    }

    processAttendanceResult(updatedWorker, gps.lat, gps.lng, gps.dist, gps.isInside, AttendanceMethod.FACE_RECOGNITION);
  };

  const triggerKioskScan = async () => {
    if (isScanning) return;
    setFeedback(null);

    // 1. Lockout Check (5 failed attempts within 2 minutes)
    if (pinLockoutUntil && Date.now() < pinLockoutUntil) {
      const remainingSecs = Math.ceil((pinLockoutUntil - Date.now()) / 1000);
      playBeep("error");
      setFeedback({
        type: "error",
        title: isAmharic ? "መግባት ተከልክሏል (መቆለፊያ)" : "Access Locked Out",
        message: isAmharic 
          ? `በርካታ የተሳሳቱ ፒን ሙከራዎች ተደርገዋል። እባክዎን ${remainingSecs} ሰከንድ ይቆዩ።`
          : `Too many failed PIN attempts. Access locked for ${remainingSecs} seconds.`
      });
      return;
    }

    // 2. Require PIN entry
    if (!enteredPin.trim()) {
      playBeep("error");
      setFeedback({
        type: "error",
        title: isAmharic ? "ፒን አልገባም" : "PIN Required",
        message: isAmharic ? "እባክዎን የሰራተኛ ፒን ቁጥር ያስገቡ!" : "Please enter worker 4-6 digit PIN!"
      });
      return;
    }

    // 3. Match worker by PIN
    const identifiedWorker = workers.find(w => w.attendancePin === enteredPin.trim());
    if (!identifiedWorker) {
      playBeep("error");
      const nextFail = pinFailedAttempts + 1;
      setPinFailedAttempts(nextFail);
      if (nextFail >= 5) {
        setPinLockoutUntil(Date.now() + 120000);
        setPinFailedAttempts(0);
        setFeedback({
          type: "error",
          title: isAmharic ? "መግባት ተከልክሏል (5 የተሳሳቱ ሙከራዎች)" : "PIN Lockout Initiated",
          message: isAmharic 
            ? "5 ጊዜ የተሳሳተ ፒን ተገብቷል። ለ 2 ደቂቃዎች ታግደዋል።" 
            : "5 consecutive invalid PIN attempts. Access locked out for 2 minutes."
        });
      } else {
        setFeedback({
          type: "error",
          title: isAmharic ? "የተሳሳተ ፒን" : "Invalid PIN",
          message: isAmharic 
            ? `የተሳሳተ የፒን ቁጥር። እባክዎን እንደገና ይሞክሩ (ቀሪ ሙከራ፡ ${5 - nextFail})`
            : `Invalid PIN. Please try again (${5 - nextFail} attempts remaining before lockout).`
        });
      }
      return;
    }

    setPinFailedAttempts(0);
    setPinLockoutUntil(null);

    setIsScanning(true);
    setScanProgress(40);
    setKioskLogs([
      isAmharic ? "⚡ ፒን ተረጋግጧል... የጂፒኤስ ፍተሻ በሂደት ላይ..." : "⚡ PIN verified. Acquiring real device location...",
    ]);
    playBeep("scan");

    const gps = await refreshLiveGps();
    setIsScanning(false);
    setScanProgress(100);
    if (!gps) {
      playBeep("error");
      setFeedback({
        type: "error",
        title: isAmharic ? "ጂፒኤስ ተከልክሏል" : "Location Denied",
        message: isAmharic
          ? "ለስራ መግቢያ የመገኛ ቦታ (GPS) ፍቃድ ያስፈልጋል - እባክዎን ጂፒኤስ ይፍቀዱ!"
          : "Location required for attendance - please enable GPS permission",
        worker: identifiedWorker
      });
      return;
    }

    setKioskLogs(prev => [
      ...prev,
      isAmharic
        ? `🛰️ የጂፒኤስ መጋጠሚያ፡ [${gps.lat.toFixed(5)}°N, ${gps.lng.toFixed(5)}°E] (${gps.dist}ሜ)`
        : `🛰️ Acquired GPS coordinates: [${gps.lat.toFixed(5)}°N, ${gps.lng.toFixed(5)}°E] (${gps.dist}m)`
    ]);
    processAttendanceResult(identifiedWorker, gps.lat, gps.lng, gps.dist, gps.isInside, AttendanceMethod.MANUAL_ENTRY);
  };

  const processAttendanceResult = (
    worker: Worker,
    realLat: number,
    realLng: number,
    deviation: number,
    isInsideBoundary: boolean,
    usedMethod: AttendanceMethod = AttendanceMethod.FINGERPRINT
  ) => {
    const now = new Date();
    const formattedDate = now.toISOString().split("T")[0];
    const formattedTime = now.toLocaleTimeString("en-US", { hour12: false });

    // Check duplicate check-ins or check-outs
    const existing = attendance.find(a => a.workerId === worker.id && a.date === formattedDate);

    // Draft logs for Offline Mode
    if (!isOnline) {
      const offlineDup = offlineQueue.find(q => q.workerId === worker.id && q.date === formattedDate && q.type === kioskAction);
      if (offlineDup) {
        playBeep("error");
        setFeedback({
          type: "error",
          title: isAmharic ? "ድግግሞሽ ተከልክሏል (ኦፍላይን)" : "Offline Duplicate Blocked",
          message: isAmharic
            ? `ለ ${worker.name} የዛሬው '${kioskAction === "in" ? "መግቢያ" : "መውጫ"}' አስቀድሞ በኦፍላይን ወረፋ ላይ ተቀምጧል።`
            : `Roster Block: A '${kioskAction === "in" ? "Check-In" : "Check-Out"}' log for ${worker.name} is already stored in the offline sync buffer.`
        });
        return;
      }

      const newOfflineRecord: OfflineDraftRecord = {
        id: `OFF-${Date.now()}`,
        workerId: worker.id,
        workerName: worker.name,
        type: kioskAction,
        time: formattedTime,
        date: formattedDate,
        method: usedMethod,
        gpsCoordinates: { lat: realLat, lng: realLng },
        deviation,
        gpsStatus: isInsideBoundary ? "Inside Site" : "Outside Site"
      };

      setOfflineQueue(prev => [...prev, newOfflineRecord]);
      playBeep("success");

      setFeedback({
        type: "info",
        title: isAmharic ? "ኦፍላይን ምዝገባ ተቀምጧል" : "Offline Record Queued",
        message: isAmharic
          ? `የ ${worker.name} መረጃ በስልክዎ ላይ ተቀምጧል። የኢንተርኔት ግንኙነት ሲኖር በራስ-ሰር ይተላለፋል። (ወረፋ ላይ ያሉ፡ ${offlineQueue.length + 1})`
          : `Device is Offline. Successfully cached ${worker.name}'s biometric check-${kioskAction}. Will auto-sync when network returns.`
      });

      setKioskLogs(prev => [
        ...prev,
        isAmharic 
          ? `💾 መረጃው በኦፍላይን ተቀምጧል፡ ${worker.name} (${formattedTime})`
          : `💾 Queued locally: ${worker.name} clock-${kioskAction} saved offline.`
      ]);
      return;
    }

    // ONLINE MODE - STRICT DUPLICATE AND GEOFENCE RULES
    if (kioskAction === "in") {
      // Clocking in
      if (existing && existing.checkIn) {
        playBeep("error");
        setFeedback({
          type: "error",
          title: isAmharic ? "ቀደም ብሎ ተመዝግቧል" : "Already Clocked In",
          message: isAmharic
            ? `ሰራተኛው ${worker.name} ዛሬ መግቢያውን በ ${existing.checkIn} አስመዝግቧል! ድርብ መግቢያ አይፈቀድም።`
            : `${worker.name} has already logged a check-in for today at ${existing.checkIn}.`
        });
        return;
      }

      if (!isInsideBoundary) {
        playBeep("error");
        setFeedback({
          type: "error",
          title: isAmharic ? "የመግቢያ መዛባት (ከግቢ ውጭ)" : "Check-In Blocked (Outside Geofence)",
          message: isAmharic
            ? `የ ${worker.name} የጠዋት መግቢያ ውድቅ ተደርጓል። ሰራተኛው ከፕሮጀክት ወሰን ውጭ በ ${deviation} ሜትር ርቀት ላይ ይገኛል።`
            : `Geofence Violation: ${worker.name} is ${deviation}m outside Digital Construction ERP site boundary. Attendance rejected.`
        });
        if (onLogAction) {
          onLogAction("Kiosk Geofence Rejection", `Worker ${worker.name} attempted outside site check-in (${deviation}m).`);
        }
        return;
      }

      // Success
      playBeep("success");
      const [nowH, nowM] = formattedTime.split(":").map(Number);
      const isLate = (nowH * 60 + nowM) > (8 * 60 + 15); // after 8:15 AM
      const status = isLate ? "Late" : "Present";

      const newRecord: AttendanceRecord = {
        id: `ATT-${Date.now()}`,
        workerId: worker.id,
        workerName: worker.name,
        department: worker.department,
        trade: worker.trade,
        company: worker.company,
        building: worker.building || "Tower 1",
        floor: worker.floor || 4,
        zone: worker.zone || "Zone B",
        date: formattedDate,
        checkIn: formattedTime,
        checkOut: null,
        method: usedMethod,
        workingHours: 0,
        overtime: 0,
        status: status,
        gpsCoordinates: { lat: realLat, lng: realLng },
        deviceUsed: usedMethod === AttendanceMethod.FACE_RECOGNITION ? "LIVE-CAMERA-FACE-01" : "WEBAUTHN-KIOSK-01",
        verifiedBy: currentUserRole,
        gpsLocationString: `Bole Heights (${deviation}m)`
      };

      onAddAttendance(newRecord);
      setFeedback({
        type: "success",
        title: isAmharic ? "መግቢያ በተሳካ ሁኔታ ተመዝግቧል!" : "Clock-In Successful!",
        message: isAmharic
          ? `እንኳን ደህና መጡ! ${worker.name} በ ${formattedTime} መግቢያቸው በራስ-ሰር ተመዝግቧል። ሁኔታ: ${isLate ? "የዘገየ (Late)" : "በሰዓቱ (Present)"}።`
          : `Welcome! ${worker.name} has clocked in at ${formattedTime}. Attendance status: ${status}.`,
        worker
      });

      setKioskLogs(prev => [
        ...prev,
        isAmharic ? `✅ ተመዝግቧል፡ ${worker.name} መግቢያ በ ${formattedTime}` : `✅ Success: ${worker.name} clocked in at ${formattedTime}.`
      ]);

    } else {
      // Clocking out
      if (!existing || !existing.checkIn) {
        playBeep("error");
        setFeedback({
          type: "error",
          title: isAmharic ? "የጠዋት መግቢያ አልተገኘም" : "No Clock-In Record",
          message: isAmharic
            ? `የ ${worker.name} የዛሬ የጠዋት መግቢያ አልተገኘም! መጀመሪያ መግቢያ መመዝገብ አለበት።`
            : `Cannot check-out. ${worker.name} has no valid clock-in record for today.`
        });
        return;
      }

      if (existing.checkOut) {
        playBeep("error");
        setFeedback({
          type: "error",
          title: isAmharic ? "ቀደም ብሎ ወጥቷል" : "Already Clocked Out",
          message: isAmharic
            ? `ሰራተኛው ${worker.name} የዛሬ የስራ መውጫውን በ ${existing.checkOut} አስመዝግቧል!`
            : `${worker.name} has already checked out for today at ${existing.checkOut}.`
        });
        return;
      }

      if (!isInsideBoundary) {
        playBeep("error");
        setFeedback({
          type: "error",
          title: isAmharic ? "የመውጫ መዛባት (ከግቢ ውጭ)" : "Check-Out Blocked (Outside Geofence)",
          message: isAmharic
            ? `የ ${worker.name} የስራ መውጫ ውድቅ ተደርጓል። ሰራተኛው ከግቢ ውጭ በ ${deviation} ሜትር ርቀት ላይ ይገኛል።`
            : `Geofence Violation: ${worker.name} tried checking out from ${deviation}m outside the site boundary.`
        });
        return;
      }

      // Success out
      playBeep("success");
      const [inH, inM] = existing.checkIn.split(":").map(Number);
      const [outH, outM] = formattedTime.split(":").map(Number);
      const netWorkingHours = Math.max(0, (outH + outM/60) - (inH + inM/60) - 1.0); // 1hr break
      const workingHours = parseFloat(Math.min(8.0, netWorkingHours).toFixed(2));
      const overtime = parseFloat(Math.max(0, netWorkingHours - 8.0).toFixed(2));

      const updatedRecord: AttendanceRecord = {
        ...existing,
        checkOut: formattedTime,
        workingHours: parseFloat((workingHours + overtime).toFixed(2)),
        overtime,
        deviceUsed: "Digital Construction ERP-KIOSK-01",
        gpsLocationString: `Bole Heights (${deviation}m)`
      };

      onAddAttendance(updatedRecord);
      setFeedback({
        type: "success",
        title: isAmharic ? "መውጫ በተሳካ ሁኔታ ተመዝግቧል!" : "Clock-Out Successful!",
        message: isAmharic
          ? `ደህና እደሩ! ${worker.name} በ ${formattedTime} ወጥተዋል። ጠቅላላ ሰዓት፡ ${updatedRecord.workingHours}ሰ | ትርፍ ሰዓት፡ ${overtime}ሰ።`
          : `Good evening! ${worker.name} clocked out at ${formattedTime}. Standard hours: ${workingHours}h, Overtime: ${overtime}h.`,
        worker
      });

      setKioskLogs(prev => [
        ...prev,
        isAmharic ? `✅ ተመዝግቧል፡ ${worker.name} መውጫ በ ${formattedTime}` : `✅ Success: ${worker.name} clocked out at ${formattedTime}.`
      ]);
    }
  };

  // ----------------------------------------------------
  // ONLINE MODE AUTO-SYNC IMPLEMENTATION
  // ----------------------------------------------------
  const handleToggleOnline = () => {
    const nextState = !isOnline;
    setIsOnline(nextState);

    if (nextState && offlineQueue.length > 0) {
      // Reconnected and has records -> Trigger auto synchronization
      triggerAutoSync();
    }
  };

  const triggerAutoSync = () => {
    setIsSyncing(true);
    setSyncProgress(0);
    playBeep("sync");

    let count = 0;
    const interval = setInterval(() => {
      count += 20;
      setSyncProgress(count);
      playBeep("sync");

      if (count >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          // Process all offline drafts into the master attendance
          offlineQueue.forEach(q => {
            const now = new Date();
            const existing = attendance.find(a => a.workerId === q.workerId && a.date === q.date);

            if (q.type === "in") {
              if (!existing) {
                onAddAttendance({
                  id: `ATT-${Date.now()}-${Math.random().toString().slice(-3)}`,
                  workerId: q.workerId,
                  workerName: q.workerName,
                  department: "Formwork Assembly",
                  trade: "Carpenter",
                  company: "Digital Construction ERP",
                  building: "Digital Tower 1",
                  floor: 4,
                  zone: "Zone B",
                  date: q.date,
                  checkIn: q.time,
                  checkOut: null,
                  method: q.method,
                  workingHours: 0,
                  overtime: 0,
                  status: "Present",
                  gpsCoordinates: q.gpsCoordinates,
                  deviceUsed: "Digital Construction ERP-KIOSK-01",
                  gpsLocationString: `Bole Heights (${q.deviation}m)`
                });
              }
            } else {
              // Out
              if (existing && !existing.checkOut) {
                onAddAttendance({
                  ...existing,
                  checkOut: q.time,
                  workingHours: 8.0,
                  overtime: 1.5,
                  gpsLocationString: `Bole Heights (${q.deviation}m)`
                });
              }
            }
          });

          // Clear queue
          if (onLogAction) {
            onLogAction("Offline Queue Synced", `Successfully uploaded ${offlineQueue.length} biometric attendance records to Firebase Firestore.`);
          }

          setOfflineQueue([]);
          setIsSyncing(false);
          playBeep("success");

          setFeedback({
            type: "success",
            title: isAmharic ? "ሁሉም መረጃዎች ተመሳስለዋል!" : "Cloud Auto-Sync Complete!",
            message: isAmharic
              ? `በኦፍላይን የተመዘገቡ የባዮሜትሪክ መረጃዎች በተሳካ ሁኔታ ወደ Firebase ደመና (Cloud Firestore) ተልከዋል።`
              : `All cached offline records have been securely uploaded and integrated with Firebase Cloud Firestore.`
          });
        }, 200);
      }
    }, 250);
  };

  // List of workers with biometrics enrolled (for touch simulation list)
  const enrolledWorkersList = useMemo(() => {
    return workers.filter(w => w.fingerprint || w.faceRecognitionData);
  }, [workers]);

  return (
    <div className="space-y-6" id="biometric-kiosk-board-container">
      
      {/* HEADER WITH ONLINE STATE TOGGLE */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-lg border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 opacity-5 pointer-events-none">
          <Fingerprint size={280} className="text-red-500" />
        </div>

        <div className="flex items-center space-x-4 z-10">
          <div className="p-3.5 bg-red-600/20 text-red-500 rounded-xl border border-red-500/30">
            <ScanLine size={32} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] uppercase font-bold tracking-wider bg-red-600 px-2 py-0.5 rounded text-white font-mono">
                KIOSK KERNEL V2.1
              </span>
              <span className="text-xs text-slate-400 font-bold">•</span>
              <div className="flex items-center space-x-1.5 text-xs text-slate-300">
                <Database size={12} className="text-red-400" />
                <span className="font-mono font-bold">Digital Construction ERP Aluminum Formwork</span>
              </div>
            </div>
            <h2 className="text-xl font-black tracking-tight mt-1 flex items-center gap-2">
              <span>{isAmharic ? "የባዮሜትሪክ መመዝገቢያና የራስ-አገልግሎት ኪዮስክ" : "Biometric Enrollment & Self-Attendance Kiosk"}</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 max-w-xl">
              {isAmharic
                ? "ሰራተኞችን ለመጀመሪያ ጊዜ መመዝገብ፣ ባዮሜትሪክስ ማገናኘት እና ሰራተኞች ስማቸውን ሳይመርጡ በጣት አሻራ ወይም በፊት መለያ በቀጥታ የሚገቡበት መድረክ።"
                : "Register employee biometric markers and allow workers to tap-in without manual roster lookups. Auto-matched fingerprint ridges and geofenced coordinates."}
            </p>
          </div>
        </div>

        {/* RECONNECTION AND NETWORK SIMULATION HUDS */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5 z-10 shrink-0 w-full md:w-auto">
          
          {/* SOUND SWITCH */}
          <button
            onClick={() => setIsSoundEnabled(!isSoundEnabled)}
            className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
              isSoundEnabled 
                ? "bg-slate-800 border-slate-700 text-emerald-400" 
                : "bg-slate-900 border-slate-800 text-slate-500"
            }`}
          >
            {isSoundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>

          {/* ONLINE/OFFLINE TOGGLE */}
          <button
            onClick={handleToggleOnline}
            className={`px-3.5 py-2.5 border rounded-xl font-mono text-xs font-bold flex items-center justify-center space-x-2 cursor-pointer transition-all ${
              isOnline 
                ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-400" 
                : "bg-amber-950/40 border-amber-500/50 text-amber-400"
            }`}
          >
            {isOnline ? (
              <>
                <Wifi size={14} className="animate-pulse" />
                <span>ONLINE (Cloud Auto-Sync)</span>
              </>
            ) : (
              <>
                <WifiOff size={14} />
                <span>OFFLINE (Local Queue)</span>
              </>
            )}
          </button>

          {/* MODE TOGGLER */}
          <div className="grid grid-cols-2 gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
            <button
              onClick={() => {
                setActiveMode("kiosk");
                setFeedback(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                activeMode === "kiosk" 
                  ? "bg-red-600 text-white shadow-md" 
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {isAmharic ? "መቆጣጠሪያ ኪዮስክ" : "Kiosk UI"}
            </button>
            <button
              onClick={() => {
                setActiveMode("enroll");
                setFeedback(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                activeMode === "enroll" 
                  ? "bg-red-600 text-white shadow-md" 
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {isAmharic ? "አዲስ ሰራተኛ ምዝገባ" : "Enroll"}
            </button>
          </div>

        </div>
      </div>

      {/* CLOUD SYNCING PROGRESS BAR OVERLAY */}
      {isSyncing && (
        <div className="bg-slate-900 border border-slate-800 text-white p-4 rounded-2xl shadow-md animate-fadeIn flex flex-col md:flex-row justify-between items-center gap-3">
          <div className="flex items-center space-x-3">
            <RefreshCw size={18} className="text-red-500 animate-spin" />
            <div>
              <h4 className="font-extrabold text-xs">
                {isAmharic ? "መረጃዎችን ወደ Firebase ደመና በመላክ ላይ..." : "Uploading Biometric Records to Firebase Cloud..."}
              </h4>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {isAmharic 
                  ? `${offlineQueue.length} የኦፍላይን መዝገቦች በመመሳሰል ላይ ናቸው` 
                  : `Transmitting ${offlineQueue.length} cached hardware logs to Firestore...`}
              </p>
            </div>
          </div>
          <div className="w-full md:w-48 space-y-1">
            <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <span>SYNC STREAM</span>
              <span>{syncProgress}%</span>
            </div>
            <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-red-500" style={{ width: `${syncProgress}%` }}></div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIG & LIVE GEOLOCATION PANEL */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs">
        <div className="flex items-center space-x-2">
          <MapPin size={16} className="text-red-500" />
          <div>
            <span className="font-extrabold text-slate-700 block">
              {isAmharic ? "የፕሮጀክት ጂኦፌንስ ክልል መቆጣጠሪያ" : "Project Geofence Validation Point"}
            </span>
            <span className="text-slate-400 font-mono text-[10px]">
              {geofenceLat.toFixed(4)}°N, {geofenceLng.toFixed(4)}°E (Radius: {allowedRadius}m)
            </span>
          </div>
        </div>

        {/* Live GPS status & refresh */}
        <div className="flex items-center flex-wrap gap-2.5 w-full md:w-auto justify-end">
          <span className={`px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center space-x-1.5 ${
            gpsStatus === "ready"
              ? isInside
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-amber-50 text-amber-700 border border-amber-200"
              : gpsStatus === "error"
                ? "bg-red-50 text-red-700 border border-red-200"
                : "bg-slate-100 text-slate-600"
          }`}>
            <Locate size={12} />
            <span>
              {gpsStatus === "acquiring"
                ? (isAmharic ? "ጂፒኤስ በመፈለግ ላይ..." : "Acquiring GPS...")
                : gpsStatus === "ready" && liveGps
                  ? (isAmharic
                      ? `ርቀት፡ ${currentDistance}ሜ (${isInside ? "በክልሉ ውስጥ" : "ከክልሉ ውጭ"})`
                      : `Distance: ${currentDistance}m (${isInside ? "Inside Site" : "Outside Boundary"})`)
                  : (isAmharic ? "ጂፒኤስ አልበራም" : "GPS Unavailable")}
            </span>
          </span>
          <button
            type="button"
            onClick={() => void refreshLiveGps()}
            className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-slate-900 text-white hover:bg-slate-800 flex items-center space-x-1.5 cursor-pointer"
          >
            <RefreshCw size={12} className={gpsStatus === "acquiring" ? "animate-spin" : ""} />
            <span>{isAmharic ? "ጂፒኤስ አድስ" : "Refresh GPS"}</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* VIEW A: KIOSK SCREEN (FINGERPRINT, FACE DETECTION & PIN) */}
      {/* ------------------------------------------------------------------- */}
      {activeMode === "kiosk" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
          
          {/* CENTRAL TERMINAL (COL-SPAN-2) */}
          <div className="lg:col-span-2 bg-slate-900 text-white rounded-3xl border border-slate-800 p-6 flex flex-col justify-between min-h-[460px] relative">
            
            <div className="absolute right-0 top-0 p-4 font-mono text-[9px] text-slate-600 flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
              <span>TERMINAL STATUS: ACTIVE</span>
            </div>

            {/* UPPER HUD - TOGGLES ACTION & METHOD */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 border-b border-slate-800 pb-4">
                
                {/* Check In vs Out Selectors */}
                <div className="space-y-1.5">
                  <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest block">
                    {isAmharic ? "የመመዝገቢያ አይነት ይምረጡ" : "SELECT KIOSK DIRECTION"}
                  </span>
                  <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-2xl border border-slate-800 w-full sm:w-64">
                    <button
                      onClick={() => {
                        setKioskAction("in");
                        setFeedback(null);
                      }}
                      className={`py-2.5 rounded-xl text-xs font-black tracking-wide flex items-center justify-center space-x-2 cursor-pointer transition-all ${
                        kioskAction === "in" 
                          ? "bg-red-600 text-white shadow-md" 
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <LogIn size={14} />
                      <span>{isAmharic ? "መግቢያ (Check-In)" : "Check-In (IN)"}</span>
                    </button>

                    <button
                      onClick={() => {
                        setKioskAction("out");
                        setFeedback(null);
                      }}
                      className={`py-2.5 rounded-xl text-xs font-black tracking-wide flex items-center justify-center space-x-2 cursor-pointer transition-all ${
                        kioskAction === "out" 
                          ? "bg-slate-800 text-white shadow-md" 
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <LogOut size={14} />
                      <span>{isAmharic ? "መውጫ (Check-Out)" : "Check-Out (OUT)"}</span>
                    </button>
                  </div>
                </div>

                {/* Method Switcher: Fingerprint / Face Detection / PIN */}
                <div className="space-y-1.5">
                  <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest block">
                    {isAmharic ? "የማረጋገጫ ዘዴ" : "VERIFICATION SYSTEM"}
                  </span>
                  <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-2xl border border-slate-800 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => {
                        setKioskVerifyMethod("fingerprint");
                        stopKioskCamera();
                        setFeedback(null);
                      }}
                      className={`px-2.5 py-2 rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-all ${
                        kioskVerifyMethod === "fingerprint" ? "bg-red-600 text-white" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <Fingerprint size={13} />
                      <span>{isAmharic ? "አሻራ" : "Finger"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setKioskVerifyMethod("face");
                        setFeedback(null);
                      }}
                      className={`px-2.5 py-2 rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-all ${
                        kioskVerifyMethod === "face" ? "bg-red-600 text-white" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <ScanLine size={13} />
                      <span>{isAmharic ? "ፊት" : "Face"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setKioskVerifyMethod("pin");
                        stopKioskCamera();
                        setFeedback(null);
                      }}
                      className={`px-2.5 py-2 rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-all ${
                        kioskVerifyMethod === "pin" ? "bg-red-600 text-white" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <KeyRound size={13} />
                      <span>{isAmharic ? "ፒን" : "PIN"}</span>
                    </button>
                  </div>
                </div>

              </div>
            </div>

            {/* CORE SCANNER ZONE */}
            <div className="my-6 flex flex-col items-center justify-center text-center space-y-4">
              {kioskVerifyMethod === "fingerprint" && (
                <div className="w-full max-w-md space-y-4">
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] uppercase font-mono tracking-widest text-slate-400 block font-bold">
                      {isAmharic ? "ሰራተኛ ይምረጡ (ለጣት አሻራ)" : "SELECT WORKER FOR FINGERPRINT SCAN"}
                    </label>
                    <select
                      value={selectedKioskWorkerId}
                      onChange={(e) => { setSelectedKioskWorkerId(e.target.value); setFeedback(null); }}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-red-500"
                    >
                      <option value="">{isAmharic ? "-- ሰራተኛ ይምረጡ --" : "-- Select Employee --"}</option>
                      {workers.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name} ({w.id}) {getStoredCredentialId(w) ? "✓ Finger Enrolled" : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => void triggerKioskFingerprintScan()}
                    disabled={isScanning}
                    className={`w-full py-4 px-6 rounded-2xl flex items-center justify-center gap-3 border font-extrabold text-sm transition-all cursor-pointer shadow-xl ${
                      isScanning
                        ? "bg-slate-950 border-red-500 text-red-400 opacity-80"
                        : "bg-red-600 hover:bg-red-500 border-red-500 text-white active:scale-95"
                    }`}
                  >
                    <Fingerprint size={24} className={isScanning ? "animate-pulse" : ""} />
                    <span>
                      {isScanning
                        ? (isAmharic ? "በመቃኘት ላይ..." : "VERIFYING FINGERPRINT...")
                        : (isAmharic ? "የጣት አሻራ ፈትሽ እና መዝግብ" : "SCAN FINGERPRINT & CLOCK ATTENDANCE")}
                    </span>
                  </button>

                  {!capabilities.isSecureContext && (
                    <p className="text-[10px] text-amber-400 font-mono">
                      {isAmharic ? "ማሳሰቢያ፡ WebAuthn አሻራ HTTPS ወይም localhost ይፈልጋል።" : "Note: WebAuthn fingerprint requires HTTPS or localhost."}
                    </p>
                  )}
                </div>
              )}

              {kioskVerifyMethod === "face" && (
                <div className="w-full max-w-md space-y-3">
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] uppercase font-mono tracking-widest text-slate-400 block font-bold">
                      {isAmharic ? "ሰራተኛ ይምረጡ (ለፊት መለያ)" : "SELECT WORKER FOR FACE DETECTION"}
                    </label>
                    <select
                      value={selectedKioskWorkerId}
                      onChange={(e) => { setSelectedKioskWorkerId(e.target.value); setFeedback(null); }}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-red-500"
                    >
                      <option value="">{isAmharic ? "-- ሰራተኛ ይምረጡ --" : "-- Select Employee --"}</option>
                      {workers.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name} ({w.id}) {w.faceRecognitionData?.startsWith("face-v1:") ? "✓ Face Enrolled" : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="relative bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden aspect-video flex items-center justify-center">
                    {isKioskCameraOn ? (
                      <>
                        <video
                          ref={kioskVideoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-6 border-2 border-dashed border-emerald-400/70 rounded-xl pointer-events-none" />
                      </>
                    ) : (
                      <div className="p-6 text-center space-y-2">
                        <Camera size={32} className="mx-auto text-slate-500" />
                        <p className="text-[11px] text-slate-400">
                          {isAmharic ? "የቀጥታ ፊት መለያ ካሜራ ለመጀመር ከታች ያለውን ቁልፍ ይጫኑ" : "Start live camera feed to run facial recognition"}
                        </p>
                      </div>
                    )}
                  </div>

                  {kioskCameraError && (
                    <p className="text-[11px] text-red-400 font-semibold">{kioskCameraError}</p>
                  )}

                  <div className="flex gap-2">
                    {!isKioskCameraOn ? (
                      <button
                        type="button"
                        onClick={() => void startKioskCamera()}
                        className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Video size={16} />
                        <span>{isAmharic ? "ካሜራ ክፈት" : "Start Camera"}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={stopKioskCamera}
                        className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <VideoOff size={15} />
                        <span>{isAmharic ? "ዝጋ" : "Stop"}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => void triggerKioskFaceScan()}
                      disabled={isScanning}
                      className="flex-1 py-3 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Scan size={16} />
                      <span>
                        {isScanning
                          ? (isAmharic ? "በመፈተሽ ላይ..." : "DETECTING FACE...")
                          : (isAmharic ? "ፊት ፈትሽ እና መዝግብ" : "VERIFY FACE & CLOCK")}
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {kioskVerifyMethod === "pin" && (
                <>
                  {/* PIN Keypad Display inside Kiosk */}
                  <div className="w-full max-w-xs space-y-3 mb-2">
                    <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400 block font-bold">
                      {isAmharic ? "የሰራተኛ ፒን ቁጥር ያስገቡ" : "ENTER WORKER ATTENDANCE PIN"}
                    </span>

                    <div className="flex items-center space-x-2">
                      <input
                        type="password"
                        maxLength={6}
                        value={enteredPin}
                        onChange={(e) => setEnteredPin(e.target.value)}
                        placeholder="••••"
                        className="bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3 text-center tracking-[0.4em] font-mono text-xl font-black text-white w-full focus:outline-none focus:border-red-500 shadow-inner"
                      />
                      {enteredPin && (
                        <button
                          type="button"
                          onClick={() => setEnteredPin("")}
                          className="px-3.5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl text-xs font-bold shrink-0 cursor-pointer"
                        >
                          {isAmharic ? "አጽዳ" : "Clear"}
                        </button>
                      )}
                    </div>

                    {/* 3x4 Keypad */}
                    <div className="grid grid-cols-3 gap-1.5 pt-1">
                      {["1","2","3","4","5","6","7","8","9","C","0","⌫"].map((btn) => (
                        <button
                          key={btn}
                          type="button"
                          onClick={() => {
                            if (btn === "C") {
                              setEnteredPin("");
                            } else if (btn === "⌫") {
                              setEnteredPin(prev => prev.slice(0, -1));
                            } else {
                              if (enteredPin.length < 6) {
                                setEnteredPin(prev => prev + btn);
                              }
                            }
                          }}
                          className="py-2 bg-slate-800/80 hover:bg-slate-750 border border-slate-700 text-white rounded-xl font-mono text-sm font-bold active:scale-95 transition-all cursor-pointer"
                        >
                          {btn}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Verify & Clock Button */}
                  <button
                    onClick={() => void triggerKioskScan()}
                    disabled={isScanning}
                    className={`relative px-8 py-3.5 rounded-2xl flex items-center justify-center gap-2 border font-extrabold text-sm transition-all duration-300 shadow-xl cursor-pointer ${
                      isScanning 
                        ? "bg-slate-950 border-red-500 text-red-400 opacity-80" 
                        : "bg-red-600 hover:bg-red-500 border-red-500 text-white active:scale-95 shadow-red-900/30"
                    }`}
                  >
                    {isScanning ? (
                      <>
                        <RefreshCw size={18} className="animate-spin" />
                        <span>{isAmharic ? "በማረጋገጥ ላይ..." : "VERIFYING GPS & PIN..."}</span>
                      </>
                    ) : (
                      <>
                        <KeyRound size={18} />
                        <span>{isAmharic ? "ፒን አረጋግጥ እና መዝግብ" : "VERIFY PIN & CLOCK ATTENDANCE"}</span>
                      </>
                    )}
                  </button>
                </>
              )}

              {/* Progress bar */}
              {isScanning && (
                <div className="w-56 space-y-1.5 animate-fadeIn mt-4 mb-4">
                  <div className="flex justify-between text-[9px] font-mono text-slate-500">
                    <span>VERIFYING ATTENDANCE</span>
                    <span>{scanProgress}%</span>
                  </div>
                  <div className="w-full h-1 bg-slate-950 rounded-full overflow-hidden border border-slate-850">
                    <div className="h-full bg-red-500 transition-all duration-200" style={{ width: `${scanProgress}%` }}></div>
                  </div>
                </div>
              )}

              {/* Feedback Alert HUD (Holographic Verified Profile) */}
              {feedback && (
                <div className={`p-4 rounded-2xl border text-xs text-left max-w-lg w-full animate-fadeIn shadow-lg ${
                  feedback.type === "success" 
                    ? "bg-slate-950 border-emerald-500/30 text-emerald-300" 
                    : feedback.type === "error" 
                      ? "bg-slate-950 border-red-500/30 text-red-300" 
                      : "bg-slate-950 border-sky-500/30 text-sky-300"
                }`}>
                  <div className="flex gap-4 items-start">
                    {feedback.worker?.photo && (
                      <img 
                        src={feedback.worker.photo} 
                        alt={feedback.worker.name} 
                        className="w-14 h-14 rounded-full border-2 border-slate-800 object-cover shrink-0 mt-0.5"
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-extrabold text-slate-100 text-sm">{feedback.title}</h4>
                          {feedback.worker && (
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5 uppercase tracking-wider">
                              ID: {feedback.worker.id} • {feedback.worker.trade}
                            </p>
                          )}
                        </div>
                        <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded ${
                          feedback.type === "success" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                        }`}>
                          {feedback.type === "success" ? "Verified" : feedback.type === "error" ? "Rejected" : "Info"}
                        </span>
                      </div>
                      <p className="text-slate-300 leading-relaxed text-[11px] font-sans">
                        {feedback.message}
                      </p>
                      
                      {feedback.worker && (
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-850 text-[10px] font-mono text-slate-400">
                          <div>
                            <span className="block text-slate-500 text-[8px] uppercase">PROJECT LOCATION</span>
                            <span className="text-slate-300">{feedback.worker.building} • FL {feedback.worker.floor}</span>
                          </div>
                          <div>
                            <span className="block text-slate-500 text-[8px] uppercase">GEOFENCE MATCH</span>
                            <span className={isInside ? "text-emerald-400 font-bold" : "text-amber-400"}>
                              {currentDistance === null
                                ? "GPS Pending"
                                : isInside
                                  ? `Inside (${currentDistance}m PASS)`
                                  : `Breach (${currentDistance}m REJECT)`}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {!feedback && !isScanning && (
                <div className="text-slate-500 text-xs max-w-md mx-auto leading-relaxed font-sans">
                  <p>
                    {isAmharic 
                      ? "የመግቢያ ወይም የመውጫ አቅጣጫ መርጠው በጣት አሻራ፣ በቀጥታ ካሜራ የፊት መለያ ወይም በፒን ቁጥር ሰዓትዎን ያስመዝግቡ።"
                      : "Select Check-In or Check-Out and authenticate using hardware Fingerprint, live Camera Face Detection, or Worker PIN."}
                  </p>
                </div>
              )}

            </div>

            {/* REAL-TIME MINI KIOSK STATUS TRAIL */}
            <div className="border-t border-slate-850 pt-3 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 text-[10px] font-mono text-slate-400">
              <div className="flex items-center space-x-2">
                <Locate size={12} className="text-red-400" />
                <span>
                  {liveGps
                    ? `GPS: [${liveGps.lat.toFixed(4)}°N, ${liveGps.lng.toFixed(4)}°E] (${currentDistance}m deviation)`
                    : "GPS: Waiting for device location permission"}
                </span>
              </div>
              <div className="flex items-center space-x-3 justify-end">
                <span>BUFFER SIZE: {offlineQueue.length}</span>
                <span>OS INTERFACE: {isOnline ? "ONLINE" : "OFFLINE"}</span>
              </div>
            </div>

          </div>

          {/* REGISTERED WORKERS QUICK SELECT LIST */}
          <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm space-y-4">
            <div>
              <h3 className="font-black text-sm text-slate-800 flex items-center justify-between">
                <span>{isAmharic ? "ባዮሜትሪክ የተመዘገቡ ሰራተኞች" : "Biometric Enrolled Workers"}</span>
                <span className="text-[10px] bg-red-50 text-red-600 px-2.5 py-0.5 rounded font-black font-mono">
                  {enrolledWorkersList.length} Enrolled
                </span>
              </h3>
              <p className="text-slate-400 text-[11px] leading-snug mt-1">
                {isAmharic
                  ? "ከዚህ ዝርዝር ውስጥ ሰራተኛ በመንካት በቀጥታ የጣት አሻራ ወይም የፊት መለያ ማረጋገጫ ይጀምሩ።"
                  : "Click any worker below to select them for live Fingerprint (WebAuthn) or Camera Face Detection verification."}
              </p>
            </div>

            {enrolledWorkersList.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 italic border border-dashed border-slate-200 rounded-2xl bg-slate-50 space-y-3">
                <Users size={24} className="mx-auto text-slate-300" />
                <p>
                  {isAmharic 
                    ? "የተመዘገበ ባዮሜትሪክ መረጃ ያለው ሰራተኛ የለም።" 
                    : "No workers are registered with biometric fingerprints or face templates yet."}
                </p>
                <button
                  onClick={() => setActiveMode("enroll")}
                  className="px-3 py-1.5 bg-slate-900 text-white rounded-lg font-bold text-[10px] hover:bg-slate-800 cursor-pointer"
                >
                  {isAmharic ? "አዲስ ሰራተኛ አስመዝግብ" : "Go to Enroll Form"}
                </button>
              </div>
            ) : (
              <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                {enrolledWorkersList.map(worker => {
                  const today = new Date().toISOString().split("T")[0];
                  const rec = attendance.find(a => a.workerId === worker.id && a.date === today);
                  const isSelected = selectedKioskWorkerId === worker.id;
                  return (
                    <button
                      key={worker.id}
                      type="button"
                      onClick={() => {
                        setSelectedKioskWorkerId(worker.id);
                        setFeedback(null);
                      }}
                      className={`w-full p-2.5 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer group ${
                        isSelected
                          ? "border-red-500 bg-red-50/40 ring-1 ring-red-400"
                          : rec?.checkIn
                            ? "border-emerald-100 bg-emerald-50/20 hover:border-red-400"
                            : "border-slate-100 bg-slate-50/50 hover:border-red-400"
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        {worker.photo ? (
                          <img 
                            src={worker.photo} 
                            alt={worker.name} 
                            className="w-10 h-10 rounded-full border border-slate-200 object-cover shrink-0"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full border border-slate-200 bg-slate-100 flex items-center justify-center text-slate-500 font-black text-xs shrink-0">
                            {String(worker.name ?? "?").charAt(0)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="font-extrabold text-xs text-slate-800 truncate group-hover:text-red-600">{worker.name}</h4>
                          <span className="text-[9px] font-mono text-slate-400 block">{worker.id} • {worker.trade}</span>
                          <div className="flex gap-1.5 mt-0.5">
                            {worker.fingerprint && <Fingerprint size={10} className="text-red-500" />}
                            {worker.faceRecognitionData && <ScanLine size={10} className="text-emerald-600" />}
                            <span className="text-[9px] text-slate-400">FL {worker.floor} • {worker.zone}</span>
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        {rec?.checkIn ? (
                          <div className="space-y-0.5">
                            <span className="text-[8px] uppercase bg-emerald-500 text-white font-mono px-1.5 py-0.5 rounded font-bold">
                              Clocked In
                            </span>
                            <span className="text-[9px] font-mono text-emerald-600 block">{rec.checkIn}</span>
                          </div>
                        ) : (
                          <span className="text-[9px] text-slate-400 italic">
                            {isAmharic ? "ያልመጣ" : "Logged Out"}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* QUICK ENROLL PROMOTION CARD */}
            <div className="bg-red-50/40 p-4 rounded-2xl border border-red-100/50 space-y-2">
              <span className="text-[9px] bg-red-600 text-white px-2 py-0.5 rounded font-mono font-bold uppercase inline-block">
                Kiosk Enrollment Instruction
              </span>
              <p className="text-[11px] text-slate-600 leading-relaxed leading-normal">
                {isAmharic
                  ? "ማንኛውም አዲስ ሰራተኛ በመጀመሪያ 'አዲስ ሰራተኛ ምዝገባ' ገጽ ላይ ገብቶ የፊት ፎቶ እና የጣት አሻራ መመዝገብ አለበት።"
                  : "Complete first-time registration under the 'Enroll' tab to capture each worker's real Face ID and hardware Fingerprint."}
              </p>
            </div>

          </div>

        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* VIEW B: ENROLLMENT REGISTER FORM */}
      {/* ------------------------------------------------------------------- */}
      {activeMode === "enroll" && (
        <form onSubmit={handleEnrollSubmit} className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-6 animate-fadeIn">
          
          <div className="border-b border-slate-100 pb-4">
            <h3 className="font-black text-base text-slate-800 flex items-center space-x-2">
              <UserPlus size={18} className="text-red-500" />
              <span>{isAmharic ? "የመጀመሪያ ጊዜ የባዮሜትሪክ ምዝገባ" : "First-Time Employee Biometric Enrollment"}</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {isAmharic
                ? "አዲስ ሰራተኛ ወደ ሲስተሙ ለማስገባት እና የባዮሜትሪክ መለያዎቻቸውን (የጣት አሻራ/የፊት መለያ) ለማገናኘት ቅጹን ይሙሉ"
                : "Register employee data and capture real hardware fingerprint credentials and live facial templates."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* COLUMN 1: LIVE CAMERA FACE CAPTURE & WEBAUTHN FINGERPRINT ENROLLMENT */}
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 flex flex-col items-center justify-center space-y-3">
              
              <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">
                {isAmharic ? "የሰራተኛው የፊት መለያ እና አሻራ" : "Live Face Capture & Fingerprint"}
              </span>

              {isEnrollCameraOn ? (
                <div className="w-full space-y-2">
                  <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-video border border-slate-300">
                    <video ref={enrollVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                    <div className="absolute inset-4 border-2 border-dashed border-emerald-400/70 rounded-xl pointer-events-none" />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={enrollBioBusy}
                      onClick={() => void handleEnrollCaptureFace()}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Camera size={13} />
                      <span>{enrollBioBusy ? "..." : (isAmharic ? "ፊት አንሳ" : "Capture Face")}</span>
                    </button>
                    <button
                      type="button"
                      onClick={stopEnrollCamera}
                      className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      {isAmharic ? "ዝጋ" : "Close"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative flex flex-col items-center space-y-2">
                  {enrollPhoto ? (
                    <img
                      src={enrollPhoto}
                      alt="Captured face"
                      className="w-28 h-28 rounded-full border-4 border-emerald-400 shadow-md object-cover"
                    />
                  ) : (
                    <div className="w-28 h-28 rounded-full border-2 border-dashed border-slate-300 bg-white flex flex-col items-center justify-center text-slate-400">
                      <Camera size={28} />
                      <span className="text-[9px] font-bold mt-1">{isAmharic ? "ፎቶ የለም" : "No Photo"}</span>
                    </div>
                  )}

                  <div className="flex gap-2 w-full">
                    <button
                      type="button"
                      onClick={() => void startEnrollCamera()}
                      className="flex-1 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Camera size={13} />
                      <span>{enrollFaceData ? (isAmharic ? "ፊት ቀይር" : "Retake Face") : (isAmharic ? "ፊት መዝግብ" : "Enroll Face")}</span>
                    </button>
                    <button
                      type="button"
                      disabled={enrollBioBusy}
                      onClick={() => void handleEnrollFingerprintHardware()}
                      className={`flex-1 px-3 py-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                        enrollFingerprintData
                          ? "bg-emerald-600 text-white"
                          : "bg-red-600 hover:bg-red-700 text-white"
                      }`}
                    >
                      <Fingerprint size={13} />
                      <span>{enrollFingerprintData ? (isAmharic ? "አሻራ ተመዝግቧል" : "Finger Enrolled ✓") : (isAmharic ? "አሻራ መዝግብ" : "Enroll Finger")}</span>
                    </button>
                  </div>
                </div>
              )}

              {enrollBioMsg && (
                <p className={`text-[11px] font-semibold text-center px-2 ${enrollBioMsg.ok ? "text-emerald-700" : "text-red-600"}`}>
                  {enrollBioMsg.text}
                </p>
              )}

              {/* WORKER PIN ASSIGNMENT */}
              <div className="w-full space-y-2 pt-3 border-t border-slate-200">
                <span className="text-[10px] uppercase font-black text-slate-500 text-center block tracking-wider font-mono">
                  {isAmharic ? "የመገኘት ፒን ቁጥር (4-6 አሃዝ)" : "Attendance Security PIN"}
                </span>

                <input
                  type="text"
                  maxLength={6}
                  value={enrollPin}
                  onChange={(e) => setEnrollPin(e.target.value)}
                  placeholder={isAmharic ? "ለምሳሌ፡ 4821 (ባዶ ከሆነ በራስ-ሰር ይፈጠራል)" : "e.g. 4821 (auto-generated if empty)"}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-center font-mono font-extrabold text-sm text-slate-800 focus:outline-none focus:border-red-500"
                />

                <p className="text-[10px] text-slate-400 text-center leading-tight">
                  {isAmharic 
                    ? "ሰራተኛው በኪዮስክ መቆጣጠሪያ ላይ ለመግባት የሚጠቀምበት ምስጢራዊ ፒን ቁጥር።" 
                    : "Unique 4-6 digit PIN used as backup verification for kiosk attendance."}
                </p>
              </div>

            </div>

            {/* COLUMN 2 & 3: FORM FIELDS */}
            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Employee ID */}
              <div className="space-y-1">
                <label className="font-extrabold text-xs text-slate-700 block">{isAmharic ? "የሰራተኛ መለያ ቁጥር (ID)" : "Employee ID"}</label>
                <input 
                  type="text" 
                  value={enrollId}
                  onChange={e => setEnrollId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-mono font-bold text-slate-800 focus:bg-white focus:border-red-500 focus:outline-none"
                  placeholder="ERP-W-101"
                />
              </div>

              {/* Full Name */}
              <div className="space-y-1">
                <label className="font-extrabold text-xs text-slate-700 block">{isAmharic ? "ሙሉ ስም" : "Full Name"}</label>
                <input 
                  type="text" 
                  value={enrollName}
                  onChange={e => setEnrollName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 focus:bg-white focus:border-red-500 focus:outline-none"
                  placeholder="e.g. Bekele Tesfaye"
                />
              </div>

              {/* Company */}
              <div className="space-y-1">
                <label className="font-extrabold text-xs text-slate-700 block">{isAmharic ? "ድርጅት" : "Company"}</label>
                <select
                  value={enrollCompany}
                  onChange={e => setEnrollCompany(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 focus:bg-white focus:border-red-500"
                >
                  <option value="Digital Construction ERP">Digital Construction ERP</option>
                  <option value="Subcontractor Alpha">Subcontractor Alpha</option>
                  <option value="Subcontractor Beta">Subcontractor Beta</option>
                </select>
              </div>

              {/* Department */}
              <div className="space-y-1">
                <label className="font-extrabold text-xs text-slate-700 block">{isAmharic ? "የስራ ክፍል" : "Department"}</label>
                <input 
                  type="text" 
                  value={enrollDepartment}
                  onChange={e => setEnrollDepartment(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 focus:bg-white focus:border-red-500 focus:outline-none"
                />
              </div>

              {/* Trade specialty */}
              <div className="space-y-1">
                <label className="font-extrabold text-xs text-slate-700 block">{isAmharic ? "የስራ መስክ (Trade)" : "Trade Specialty"}</label>
                <input 
                  type="text" 
                  value={enrollTrade}
                  onChange={e => setEnrollTrade(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 focus:bg-white focus:border-red-500 focus:outline-none"
                />
              </div>

              {/* Basic Monthly Salary */}
              <div className="space-y-1">
                <label className="font-extrabold text-xs text-slate-700 flex justify-between items-center">
                  <span>{isAmharic ? "መሰረታዊ ወርሃዊ ደመወዝ (በብር)" : "Basic Monthly Salary (ETB)"}</span>
                  <span className="text-[10px] text-red-500 font-bold">*Required</span>
                </label>
                <input 
                  type="number" 
                  required
                  min={1000}
                  step={100}
                  value={enrollBasicMonthlySalary}
                  onChange={e => setEnrollBasicMonthlySalary(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-mono font-bold text-slate-800 focus:bg-white focus:border-red-500 focus:outline-none"
                  placeholder="e.g. 18000"
                />
              </div>

              {/* Assigned Project */}
              <div className="space-y-1">
                <label className="font-extrabold text-xs text-slate-700 block">{isAmharic ? "የተመደበበት ፐሮጀክት" : "Assigned Project"}</label>
                <input 
                  type="text" 
                  value="Digital Bole Heights"
                  disabled
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-500"
                />
              </div>

              {/* Building & Floor */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-extrabold text-xs text-slate-700 block">{isAmharic ? "ብሎክ" : "Building"}</label>
                  <select
                    value={enrollBuilding}
                    onChange={e => setEnrollBuilding(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 focus:bg-white"
                  >
                    <option value="Digital Tower 1">Tower 1</option>
                    <option value="Digital Construction ERP Tower 2">Tower 2</option>
                    <option value="Digital Construction ERP Tower 3">Tower 3</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-extrabold text-xs text-slate-700 block">{isAmharic ? "ፎቅ" : "Floor"}</label>
                  <input 
                    type="number" 
                    value={enrollFloor}
                    onChange={e => setEnrollFloor(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 focus:bg-white focus:border-red-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Zone */}
              <div className="space-y-1">
                <label className="font-extrabold text-xs text-slate-700 block">{isAmharic ? "ዞን" : "Zone"}</label>
                <select
                  value={enrollZone}
                  onChange={e => setEnrollZone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 focus:bg-white"
                >
                  <option value="Zone A">Zone A</option>
                  <option value="Zone B">Zone B</option>
                  <option value="Zone C">Zone C</option>
                </select>
              </div>

              {/* Management details */}
              <div className="space-y-1">
                <label className="font-extrabold text-xs text-slate-700 block">{isAmharic ? "የቡድን መሪ (Team Leader) *" : "Team Leader *"}</label>
                {workers.length > 0 ? (
                  <select
                    required
                    value={enrollLeader}
                    onChange={e => setEnrollLeader(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none"
                  >
                    <option value="">{isAmharic ? "-- የቡድን መሪ ይምረጡ --" : "-- Select Team Leader --"}</option>
                    {Array.from(new Set([
                      ...workers.filter(w => w.role === UserRole.TEAM_LEADER || String(w.trade ?? "").toLowerCase().includes("leader")).map(w => w.name),
                      ...workers.map(w => w.teamLeader).filter((n): n is string => Boolean(n && n !== "Unassigned")),
                      ...workers.map(w => w.name)
                    ])).map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                ) : (
                  <input 
                    type="text" 
                    required
                    value={enrollLeader}
                    onChange={e => setEnrollLeader(e.target.value)}
                    placeholder={isAmharic ? "የቡድን መሪ ስም ያስገቡ" : "Enter Team Leader name"}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none"
                  />
                )}
              </div>

              <div className="space-y-1">
                <label className="font-extrabold text-xs text-slate-700 block">{isAmharic ? "ጋንግ ቺፍ (Gang Chief) *" : "Gang Chief *"}</label>
                {workers.length > 0 ? (
                  <select
                    required
                    value={enrollChief}
                    onChange={e => setEnrollChief(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none"
                  >
                    <option value="">{isAmharic ? "-- ጋንግ ቺፍ ይምረጡ --" : "-- Select Gang Chief --"}</option>
                    {Array.from(new Set([
                      ...workers.filter(w => w.role === UserRole.GANG_CHIEF || String(w.trade ?? "").toLowerCase().includes("chief")).map(w => w.name),
                      ...workers.map(w => w.gangChief).filter((n): n is string => Boolean(n && n !== "Unassigned")),
                      ...workers.map(w => w.name)
                    ])).map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                ) : (
                  <input 
                    type="text" 
                    required
                    value={enrollChief}
                    onChange={e => setEnrollChief(e.target.value)}
                    placeholder={isAmharic ? "የጋንግ ቺፍ ስም ያስገቡ" : "Enter Gang Chief name"}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none"
                  />
                )}
              </div>

            </div>

          </div>

          {/* SECTION: BANK & MOBILE MONEY ACCOUNT DETAILS */}
          <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-5 space-y-4">
            <div className="flex items-center space-x-2 border-b border-emerald-200/60 pb-2">
              <KeyRound size={16} className="text-emerald-600" />
              <h4 className="font-extrabold text-xs text-emerald-950 uppercase tracking-wider">
                {isAmharic ? "የባንክ እና ሞባይል ገንዘብ መረጃዎች (Bank & Mobile Payment Accounts)" : "Bank & Mobile Payment Details"}
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              
              {/* Bank Name */}
              <div className="space-y-1">
                <label className="font-extrabold text-xs text-slate-700 block">{isAmharic ? "የባንክ ስም" : "Bank Name"}</label>
                <select
                  value={enrollBankName}
                  onChange={e => setEnrollBankName(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="Commercial Bank of Ethiopia (CBE)">የኢትዮጵያ ንግድ ባንክ (CBE)</option>
                  <option value="Dashen Bank">ዳሽን ባንክ (Dashen)</option>
                  <option value="Awash Bank">አዋሽ ባንክ (Awash)</option>
                  <option value="Bank of Abyssinia">አቢሲንያ ባንክ (Abyssinia)</option>
                  <option value="Nib International Bank">ኒብ ኢንተርናሽናል ባንክ (Nib)</option>
                  <option value="Wegagen Bank">ወጋገን ባንክ (Wegagen)</option>
                  <option value="Cooperative Bank of Oromia">የኦሮሚያ ህብረት ስራ ባንክ (Coop)</option>
                  <option value="Hibret Bank">ኅብረት ባንክ (Hibret)</option>
                  <option value="Oromia Bank">ኦሮሚያ ባንክ (Oromia Bank)</option>
                  <option value="Hijra Bank">ሂጅራ ባንክ (Hijra)</option>
                  <option value="ZamZam Bank">ዘምዘም ባንክ (ZamZam)</option>
                  <option value="Lion International Bank">አንበሳ ኢንተርናሽናል ባንክ (Lion)</option>
                  <option value="Zemen Bank">ዘመን ባንክ (Zemen)</option>
                  <option value="Other Bank">ሌላ ባንክ (Other)</option>
                </select>
              </div>

              {/* Bank Account Number */}
              <div className="space-y-1">
                <label className="font-extrabold text-xs text-slate-700 block">{isAmharic ? "የባንክ ሂሳብ ቁጥር" : "Bank Account Number"}</label>
                <input 
                  type="text"
                  value={enrollBankAccountNumber}
                  onChange={e => setEnrollBankAccountNumber(e.target.value)}
                  placeholder={isAmharic ? "ለምሳሌ፡ 1000123456789" : "e.g. 1000123456789"}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs font-mono font-bold text-slate-800 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* Mobile Money Type */}
              <div className="space-y-1">
                <label className="font-extrabold text-xs text-slate-700 block">{isAmharic ? "የሞባይል ብር / ዋሌት ዓይነት" : "Mobile Wallet Provider"}</label>
                <select
                  value={enrollMobileMoneyType}
                  onChange={e => setEnrollMobileMoneyType(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="Telebirr">ቴሌብር (Telebirr)</option>
                  <option value="CBE Birr">ሲቢኢ ብር (CBE Birr)</option>
                  <option value="M-PESA">ኤም-ፔሳ (M-PESA Safaricom)</option>
                  <option value="Amole">አሞሌ (Amole Dashen)</option>
                  <option value="Awash Birr">አዋሽ ብር (Awash Birr)</option>
                  <option value="Kacha">ካቻ (Kacha Digital)</option>
                  <option value="Other Wallet">ሌላ ዋሌት (Other)</option>
                </select>
              </div>

              {/* Mobile Money Account / Phone Number */}
              <div className="space-y-1">
                <label className="font-extrabold text-xs text-slate-700 block">{isAmharic ? "የሞባይል ብር ቁጥር / ስልክ" : "Mobile Wallet Phone Number"}</label>
                <input 
                  type="text"
                  value={enrollMobileMoneyNumber}
                  onChange={e => setEnrollMobileMoneyNumber(e.target.value)}
                  placeholder={isAmharic ? "ለምሳሌ፡ 0911234567" : "e.g. 0911234567"}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs font-mono font-bold text-slate-800 focus:border-emerald-500 focus:outline-none"
                />
              </div>

            </div>
          </div>

          <div className="border-t border-slate-100 pt-5 flex justify-end space-x-3.5">
            <button
              type="button"
              onClick={() => setActiveMode("kiosk")}
              className="px-5 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-50 cursor-pointer"
            >
              {isAmharic ? "ሰርዝ" : "Cancel"}
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-red-600 hover:bg-red-750 text-white rounded-xl font-extrabold text-xs cursor-pointer shadow-md transition-all flex items-center space-x-1.5"
            >
              <UserCheck size={14} />
              <span>{isAmharic ? "ባዮሜትሪክስ አስመዝግብ" : "Enroll Employee Profile"}</span>
            </button>
          </div>

        </form>
      )}

    </div>
  );
};
