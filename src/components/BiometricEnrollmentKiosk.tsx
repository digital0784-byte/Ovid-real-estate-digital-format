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
  UserPlus,
  Wifi,
  WifiOff,
  UserCheck,
  Building2,
  Layers,
  Award
} from "lucide-react";
import { Worker, AttendanceRecord, AttendanceMethod, UserRole } from "../types";

interface BiometricEnrollmentKioskProps {
  workers: Worker[];
  attendance: AttendanceRecord[];
  onAddAttendance: (record: AttendanceRecord) => void;
  onEnrollWorker: (worker: Worker) => void;
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
  isAmharic,
  currentUserRole,
  onLogAction
}) => {
  // Screen views: "kiosk" (Self-Attendance) vs "enroll" (Initial Enrollment)
  const [activeMode, setActiveMode] = useState<"kiosk" | "enroll">("kiosk");
  
  // Offline & Synchronization states
  const [isOnline, setIsOnline] = useState(true);
  const [offlineQueue, setOfflineQueue] = useState<OfflineDraftRecord[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);

  // Configurable Geofence (OVID Bole Heights)
  const [geofenceLat, setGeofenceLat] = useState(9.0049);
  const [geofenceLng, setGeofenceLng] = useState(38.7783);
  const [allowedRadius, setAllowedRadius] = useState(150); // in meters
  const [gpsSimulationMode, setGpsSimulationMode] = useState<"inside" | "outside">("inside");
  const [simLat, setSimLat] = useState(9.0048);
  const [simLng, setSimLng] = useState(38.7781);

  // Audio system state
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);

  // Help guides
  const [showPolicies, setShowPolicies] = useState(false);

  // ----------------------------------------------------
  // ENROLLMENT FORM STATE
  // ----------------------------------------------------
  const [enrollId, setEnrollId] = useState("");
  const [enrollName, setEnrollName] = useState("");
  const [enrollCompany, setEnrollCompany] = useState("OVID Construction");
  const [enrollDepartment, setEnrollDepartment] = useState("Formwork Assembly");
  const [enrollTrade, setEnrollTrade] = useState("Carpenter");
  const [enrollBuilding, setEnrollBuilding] = useState("OVID Tower 1");
  const [enrollFloor, setEnrollFloor] = useState(4);
  const [enrollZone, setEnrollZone] = useState("Zone B");
  const [enrollLeader, setEnrollLeader] = useState("Yohannes Bekele");
  const [enrollChief, setEnrollChief] = useState("Fikru Tolossa");
  const [enrollSupervisor, setEnrollSupervisor] = useState("Eng. Yoseph");
  const [enrollPhoto, setEnrollPhoto] = useState("https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=150&h=150&fit=crop");
  
  // Biometric registration simulations
  const [registeringBiometric, setRegisteringBiometric] = useState<"none" | "fingerprint" | "face">("none");
  const [registrationProgress, setRegistrationProgress] = useState(0);
  const [enrolledFingerprintHash, setEnrolledFingerprintHash] = useState("");
  const [enrolledFaceHash, setEnrolledFaceHash] = useState("");

  // Auto-generate fresh ID on load
  useEffect(() => {
    if (!enrollId) {
      const nextIdNum = 100 + workers.length + 1;
      setEnrollId(`OVID-W-${nextIdNum}`);
    }
  }, [workers, enrollId]);

  // ----------------------------------------------------
  // KIOSK SCREEN STATE
  // ----------------------------------------------------
  const [kioskAction, setKioskAction] = useState<"in" | "out">("in");
  const [kioskMethod, setKioskMethod] = useState<"fingerprint" | "face">("fingerprint");
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [kioskLogs, setKioskLogs] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | "info";
    title: string;
    message: string;
    worker?: Worker;
  } | null>(null);

  // Update simulation coordinates based on GPS preset
  useEffect(() => {
    if (gpsSimulationMode === "inside") {
      setSimLat(9.0048);
      setSimLng(38.7781); // within ~20 meters
    } else {
      setSimLat(8.9806);
      setSimLng(38.7905); // Bole Airport - outside
    }
  }, [gpsSimulationMode]);

  // Calculate distance
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
  const isInside = currentDistance <= allowedRadius;

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

  // ----------------------------------------------------
  // SIMULATE BIOMETRIC HARWARE REGISTRATION
  // ----------------------------------------------------
  const handleRegisterBiometric = (method: "fingerprint" | "face") => {
    if (registeringBiometric !== "none") return;
    setRegisteringBiometric(method);
    setRegistrationProgress(0);
    playBeep("scan");

    let prog = 0;
    const interval = setInterval(() => {
      prog += 20;
      setRegistrationProgress(prog);
      playBeep("scan");
      if (prog >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          const generatedHash = `0x${Math.random().toString(16).substring(2, 10).toUpperCase()}`;
          if (method === "fingerprint") {
            setEnrolledFingerprintHash(generatedHash);
          } else {
            setEnrolledFaceHash(generatedHash);
          }
          setRegisteringBiometric("none");
          playBeep("success");
        }, 150);
      }
    }, 300);
  };

  // ----------------------------------------------------
  // ENROLL SUBMIT
  // ----------------------------------------------------
  const handleEnrollSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!enrollName.trim()) {
      playBeep("error");
      alert(isAmharic ? "እባክዎን የሰራተኛውን ሙሉ ስም ያስገቡ!" : "Please enter the employee's full name!");
      return;
    }

    if (!enrolledFingerprintHash && !enrolledFaceHash) {
      playBeep("error");
      alert(isAmharic 
        ? "እባክዎን መጀመሪያ ቢያንስ አንድ የባዮሜትሪክ መረጃ (የጣት አሻራ ወይም የፊት መለያ) ያስመዝግቡ!" 
        : "Please enroll at least one biometric record (fingerprint or face) first!");
      return;
    }

    const newWorker: Worker = {
      id: enrollId,
      name: enrollName,
      photo: enrollPhoto,
      company: enrollCompany,
      department: enrollDepartment,
      trade: enrollTrade,
      joinedDate: new Date().toISOString().split("T")[0],
      assignedProject: "OVID Bole Heights",
      building: enrollBuilding,
      floor: enrollFloor,
      zone: enrollZone,
      teamLeader: enrollLeader,
      gangChief: enrollChief,
      supervisor: enrollSupervisor,
      fingerprint: enrolledFingerprintHash || undefined,
      faceRecognitionData: enrolledFaceHash || undefined,
      status: "Active",
      teamId: "T-01"
    };

    onEnrollWorker(newWorker);
    
    // Log to audit log
    if (onLogAction) {
      onLogAction(
        "Biometric Profile Enrolled", 
        `Enrolled worker ${newWorker.name} (${newWorker.id}) with fingerprint ${enrolledFingerprintHash || "N/A"} and face ${enrolledFaceHash || "N/A"}.`
      );
    }

    playBeep("success");

    // Success feedback
    setFeedback({
      type: "success",
      title: isAmharic ? "ምዝገባው በተሳካ ሁኔታ ተጠናቋል!" : "Enrollment Successful!",
      message: isAmharic 
        ? `ሰራተኛው ${enrollName} [${enrollId}] በባዮሜትሪክ መዝገብ ውስጥ ተካቷል። አሁን የመገኘት መቆጣጠሪያ ኪዮስክን መጠቀም ይችላል።`
        : `Employee ${enrollName} [${enrollId}] is registered with secure biometric credentials. Ready for self-attendance.`
    });

    // Reset Form
    setEnrollName("");
    setEnrolledFingerprintHash("");
    setEnrolledFaceHash("");
    setEnrollId(""); // Will regenerate on next cycle
    setActiveMode("kiosk"); // Switch to kiosk to test immediately
  };

  // ----------------------------------------------------
  // AUTOMATIC EMPLOYEE IDENTIFICATION & CLOCKING
  // ----------------------------------------------------
  const triggerKioskScan = (simulatedWorkerId?: string) => {
    if (isScanning) return;
    setFeedback(null);

    // Identify which worker is scanning
    let identifiedWorker: Worker | undefined;
    if (simulatedWorkerId) {
      identifiedWorker = workers.find(w => w.id === simulatedWorkerId);
    } else {
      // In a real kiosk, placing a finger on the sensor matches the fingerprint.
      // For simulator simplicity, we choose a random worker from enrolled ones if none provided,
      // but to let users interact, we display quick-tap employee badges on the side.
      const enrolledWorkers = workers.filter(w => w.fingerprint || w.faceRecognitionData);
      if (enrolledWorkers.length === 0) {
        playBeep("error");
        setFeedback({
          type: "error",
          title: isAmharic ? "የተመዘገቡ ባዮሜትሪክስ የሉም" : "No Enrolled Biometrics Found",
          message: isAmharic 
            ? "መጀመሪያ በ 'አዲስ ሰራተኛ ምዝገባ' ገጽ ላይ ሄደው አዲስ ሰራተኛ ይመዝግቡ።"
            : "Please enroll employees in the 'Enroll' tab before attempting to use the self-attendance kiosk."
        });
        return;
      }
      // Pick random
      identifiedWorker = enrolledWorkers[Math.floor(Math.random() * enrolledWorkers.length)];
    }

    if (!identifiedWorker) return;

    // Check if the selected worker actually has the chosen biometric enrolled
    if (kioskMethod === "fingerprint" && !identifiedWorker.fingerprint) {
      playBeep("error");
      setFeedback({
        type: "error",
        title: isAmharic ? "የጣት አሻራ አልተመዘገበም" : "No Fingerprint Enrolled",
        message: isAmharic 
          ? `${identifiedWorker.name} የጣት አሻራ መረጃ አልተመዘገበለትም! እባክዎን በፊቱ መለያ ይሞክሩ።`
          : `${identifiedWorker.name} does not have a fingerprint profile registered yet.`
      });
      return;
    }

    if (kioskMethod === "face" && !identifiedWorker.faceRecognitionData) {
      playBeep("error");
      setFeedback({
        type: "error",
        title: isAmharic ? "የፊት ገጽታ አልተመዘገበም" : "No Face Profile Enrolled",
        message: isAmharic 
          ? `${identifiedWorker.name} የፊት ገጽታ መረጃ አልተመዘገበለትም! እባክዎን በጣት አሻራ ይሞክሩ።`
          : `${identifiedWorker.name} does not have face recognition data registered.`
      });
      return;
    }

    // Start scanner simulation
    setIsScanning(true);
    setScanProgress(0);
    setKioskLogs([
      isAmharic ? "⚡ ባዮሜትሪክ ዳሳሽ ነቅቷል..." : "⚡ Biometric sensor contact initiated...",
    ]);
    playBeep("scan");

    let step = 0;
    const interval = setInterval(() => {
      step++;
      setScanProgress(step * 20);
      playBeep("scan");

      if (step === 2) {
        setKioskLogs(prev => [
          ...prev,
          isAmharic 
            ? `🔍 ባዮሜትሪክስ እየተነበበ ነው... [ዘዴ: ${kioskMethod === "fingerprint" ? "የጣት አሻራ" : "የፊት መለያ"}]`
            : `🔍 Reading biometric array ridges... [Mode: ${kioskMethod === "fingerprint" ? "Fingerprint" : "Facial Map"}]`
        ]);
      } else if (step === 3) {
        setKioskLogs(prev => [
          ...prev,
          isAmharic 
            ? "🛰️ የጂፒኤስ መገኛ ፍተሻ በሂደት ላይ ነው..."
            : `🛰️ Aquiring high-accuracy geofence coordinates: [${simLat.toFixed(5)}°N, ${simLng.toFixed(5)}°E]`
        ]);
      } else if (step === 4) {
        setKioskLogs(prev => [
          ...prev,
          isAmharic
            ? `🖥️ የባዮሜትሪክ ዳታቤዝ ፍለጋ... ሰራተኛ ተገኝቷል፡ ${identifiedWorker?.name}`
            : `🖥️ Database query matching hash: Success! Identified Employee: ${identifiedWorker?.name}`
        ]);
      } else if (step === 5) {
        clearInterval(interval);
        setIsScanning(false);
        setTimeout(() => {
          finalizeKioskAttendance(identifiedWorker!);
        }, 150);
      }
    }, 200);
  };

  const finalizeKioskAttendance = (worker: Worker) => {
    const now = new Date();
    const formattedDate = now.toISOString().split("T")[0];
    const formattedTime = now.toLocaleTimeString("en-US", { hour12: false });

    // GPS evaluation
    const deviation = Math.round(getDistanceInMeters(simLat, simLng, geofenceLat, geofenceLng));
    const isInsideBoundary = deviation <= allowedRadius;

    // Check duplicate check-ins or check-outs
    const existing = attendance.find(a => a.workerId === worker.id && a.date === formattedDate);

    // Draft logs for Offline Mode
    if (!isOnline) {
      // Offline implementation
      // Duplicate protection offline
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
        method: kioskMethod === "fingerprint" ? AttendanceMethod.FINGERPRINT : AttendanceMethod.FACE_RECOGNITION,
        gpsCoordinates: { lat: simLat, lng: simLng },
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
            : `Geofence Violation: ${worker.name} is ${deviation}m outside OVID site boundary. Attendance rejected.`
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
        method: kioskMethod === "fingerprint" ? AttendanceMethod.FINGERPRINT : AttendanceMethod.FACE_RECOGNITION,
        workingHours: 0,
        overtime: 0,
        status: status,
        gpsCoordinates: { lat: simLat, lng: simLng },
        deviceUsed: "OVID-KIOSK-01",
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
        deviceUsed: "OVID-KIOSK-01",
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
                  company: "OVID Construction",
                  building: "OVID Tower 1",
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
                  deviceUsed: "OVID-KIOSK-01",
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
                <span className="font-mono font-bold">OVID Aluminum Formwork</span>
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

      {/* CONFIG & GEOLOCATION PRESETS PANEL */}
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

        {/* Sim GPS coordinates selector */}
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <span className="font-bold text-slate-500 shrink-0">{isAmharic ? "መገኛ ሲሙሌተር" : "GPS Preset"}:</span>
          <div className="grid grid-cols-2 gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-100 w-full md:w-auto">
            <button
              onClick={() => setGpsSimulationMode("inside")}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center space-x-1.5 cursor-pointer transition-all ${
                gpsSimulationMode === "inside" 
                  ? "bg-emerald-600 text-white shadow-sm" 
                  : "text-slate-600 hover:bg-slate-200"
              }`}
            >
              <Check size={12} />
              <span>{isAmharic ? "ግቢ ውስጥ (14ሜ)" : "Inside (14m)"}</span>
            </button>
            <button
              onClick={() => setGpsSimulationMode("outside")}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center space-x-1.5 cursor-pointer transition-all ${
                gpsSimulationMode === "outside" 
                  ? "bg-amber-600 text-white shadow-sm" 
                  : "text-slate-600 hover:bg-slate-200"
              }`}
            >
              <AlertTriangle size={12} />
              <span>{isAmharic ? "ውጭ (4.1ኪሜ)" : "Outside (4.1km)"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* VIEW A: KI_OSK SCREEN (AUTOMATIC TOUCH) */}
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

                {/* Biometric Scan Device Toggle */}
                <div className="space-y-1.5">
                  <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest block">
                    {isAmharic ? "የማረጋገጫ ዘዴ" : "BIOMETRIC AUTH HARDWARE"}
                  </span>
                  <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-2xl border border-slate-800 w-full sm:w-60">
                    <button
                      onClick={() => {
                        setKioskMethod("fingerprint");
                        setFeedback(null);
                      }}
                      className={`py-2.5 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 cursor-pointer transition-all ${
                        kioskMethod === "fingerprint" 
                          ? "bg-slate-800 text-white" 
                          : "text-slate-500 hover:text-white"
                      }`}
                    >
                      <Fingerprint size={13} />
                      <span>{isAmharic ? "ጣት አሻራ" : "Fingerprint"}</span>
                    </button>

                    <button
                      onClick={() => {
                        setKioskMethod("face");
                        setFeedback(null);
                      }}
                      className={`py-2.5 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 cursor-pointer transition-all ${
                        kioskMethod === "face" 
                          ? "bg-slate-800 text-white" 
                          : "text-slate-500 hover:text-white"
                      }`}
                    >
                      <ScanLine size={13} />
                      <span>{isAmharic ? "የፊት ገጽታ" : "Face Scan"}</span>
                    </button>
                  </div>
                </div>

              </div>
            </div>

            {/* CORE SCANNER ZONE */}
            <div className="my-8 flex flex-col items-center justify-center text-center">
              
              {/* Scan Aura Ring */}
              <div className="relative flex items-center justify-center mb-6">
                <div className={`absolute w-40 h-40 rounded-full border-2 border-dashed transition-all duration-700 ${
                  isScanning ? "border-red-500 animate-[spin_5s_linear_infinite]" : "border-slate-850"
                }`}></div>
                
                <button
                  onClick={() => triggerKioskScan()}
                  disabled={isScanning}
                  className={`relative w-28 h-28 rounded-full flex flex-col items-center justify-center border-2 transition-all duration-300 shadow-xl group cursor-pointer ${
                    isScanning 
                      ? "bg-slate-950 border-red-500 shadow-red-900/10" 
                      : "bg-slate-950 hover:bg-slate-900 border-slate-800 active:scale-95 text-slate-400"
                  }`}
                >
                  {isScanning && (
                    <div className="absolute inset-0 bg-red-600/10 rounded-full animate-ping pointer-events-none"></div>
                  )}

                  {isScanning && (
                    <div className="absolute w-24 h-0.5 bg-red-500 left-1.5 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-[bounce_1.5s_infinite] z-20"></div>
                  )}

                  {kioskMethod === "fingerprint" ? (
                    <Fingerprint size={42} className={isScanning ? "text-red-500 animate-pulse" : "text-red-600 group-hover:scale-105 transition-all"} />
                  ) : (
                    <ScanLine size={42} className={isScanning ? "text-red-500 animate-pulse" : "text-red-600 group-hover:scale-105 transition-all"} />
                  )}

                  <span className="text-[8px] uppercase tracking-widest font-black text-slate-500 mt-2 block font-mono">
                    {isScanning ? "IDENTIFYING..." : "TOUCH SENSOR"}
                  </span>
                </button>
              </div>

              {/* Progress bar */}
              {isScanning && (
                <div className="w-56 space-y-1.5 animate-fadeIn mb-4">
                  <div className="flex justify-between text-[9px] font-mono text-slate-500">
                    <span>QUERYING SYSTEM</span>
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
                          Verified
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
                              {isInside ? "Inside (GPS PASS)" : "Breach (GPS REJECT)"}
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
                      ? "የመመዝገቢያ አቅጣጫ መርጠው የጣት አሻራ ዳሳሹን ይንኩ። ሲስተሙ አሻራውን ካነበበ በኋላ ሰራተኛውን በራስ-ሰር አውቆ መገኘቱን ይመዘግባል።"
                      : "Open Kiosk, select Check-In/Out and touch the sensor to register attendance instantly. Real-time cryptographic matching engine."}
                  </p>
                </div>
              )}

            </div>

            {/* REAL-TIME MINI KIOSK STATUS TRAIL */}
            <div className="border-t border-slate-850 pt-3 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 text-[10px] font-mono text-slate-400">
              <div className="flex items-center space-x-2">
                <Locate size={12} className="text-red-400" />
                <span>GPS: [9.0048°N, 38.7781°E] ({currentDistance}m deviation from center)</span>
              </div>
              <div className="flex items-center space-x-3 justify-end">
                <span>BUFFER SIZE: {offlineQueue.length}</span>
                <span>OS INTERFACE: ONLINE</span>
              </div>
            </div>

          </div>

          {/* SIMULATOR QUICK TAP KEYRING BADGES */}
          <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm space-y-4">
            <div>
              <h3 className="font-black text-sm text-slate-800 flex items-center justify-between">
                <span>{isAmharic ? "ለሙከራ ማሰሪያ (Roster Keyring)" : "Biometric simulation keyring"}</span>
                <span className="text-[10px] bg-red-50 text-red-600 px-2.5 py-0.5 rounded font-black font-mono">
                  {enrolledWorkersList.length} Enrolled
                </span>
              </h3>
              <p className="text-slate-400 text-[11px] leading-snug mt-1">
                {isAmharic
                  ? "ሰራተኞች በኪዮስኩ ላይ አሻራቸውን ሲያስነብቡ ለማስመሰል ከታች የሚገኙትን የሰራተኛ ካርዶች ይንኩ። ስም መፈለግ አያስፈልግም!"
                  : "Touch an employee token badge below to simulate placing their registered finger or face on the scanner. Touch-and-Identify demonstration."}
              </p>
            </div>

            {enrolledWorkersList.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 italic border border-dashed border-slate-200 rounded-2xl bg-slate-50 space-y-3">
                <Users size={24} className="mx-auto text-slate-300" />
                <p>
                  {isAmharic 
                    ? "የተመዘገበ ባዮሜትሪክ መረጃ ያለው ሰራተኛ የለም።" 
                    : "No workers are registered with biometric fingerprints yet."}
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
                  // check if they are clocked in today
                  const today = new Date().toISOString().split("T")[0];
                  const rec = attendance.find(a => a.workerId === worker.id && a.date === today);
                  return (
                    <button
                      key={worker.id}
                      onClick={() => triggerKioskScan(worker.id)}
                      className={`w-full p-2.5 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer hover:border-red-500 hover:bg-red-50/10 group ${
                        rec?.checkIn ? "border-emerald-100 bg-emerald-50/20" : "border-slate-100 bg-slate-50/50"
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <img 
                          src={worker.photo || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop"} 
                          alt={worker.name} 
                          className="w-10 h-10 rounded-full border border-slate-200 object-cover shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0">
                          <h4 className="font-extrabold text-xs text-slate-800 truncate group-hover:text-red-600">{worker.name}</h4>
                          <span className="text-[9px] font-mono text-slate-400 block">{worker.id} • {worker.trade}</span>
                          <div className="flex gap-1.5 mt-0.5">
                            {worker.fingerprint && <Fingerprint size={10} className="text-red-500" />}
                            {worker.faceRecognitionData && <ScanLine size={10} className="text-red-500" />}
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
                  ? "ማንኛውም አዲስ ሰራተኛ በመጀመሪያ 'አዲስ ሰራተኛ ምዝገባ' ገጽ ላይ ገብቶ ባዮሜትሪክ መዝገብ መፍጠር አለበት። ከዚያ በኋላ ይህን ኪዮስክ በመንካት ብቻ መጠቀም ይችላል።"
                  : "Every employee must complete first-time registration under the 'Enroll' tab before using the kiosk sensor."}
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
                : "Register employee data and record fingerprint ridges or facial maps for secure matching templates."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* COLUMN 1: PHOTO & BIOMETRIC CAPTURE ACTIONS */}
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 flex flex-col items-center justify-center space-y-4">
              
              <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">
                {isAmharic ? "የሰራተኛው የፊት ፎቶ" : "Employee Profile Portrait"}
              </span>

              {/* Simulated Portrait Photo */}
              <div className="relative">
                <img 
                  src={enrollPhoto} 
                  alt="Enrollment placeholder" 
                  className="w-32 h-32 rounded-full border-4 border-white shadow-md object-cover"
                  referrerPolicy="no-referrer"
                />
                
                {/* Simulated photo change */}
                <button
                  type="button"
                  onClick={() => {
                    const samplePics = [
                      "https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=150&h=150&fit=crop",
                      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop",
                      "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&h=150&fit=crop",
                      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop"
                    ];
                    const nextIndex = (samplePics.indexOf(enrollPhoto) + 1) % samplePics.length;
                    setEnrollPhoto(samplePics[nextIndex]);
                  }}
                  className="absolute bottom-1 right-1 p-2 bg-slate-900 text-white rounded-full hover:bg-slate-800 transition-all shadow cursor-pointer border border-white"
                  title="Change avatar photo"
                >
                  <Camera size={14} />
                </button>
              </div>

              {/* HARDWARE REGISTRATORS */}
              <div className="w-full space-y-2.5 pt-3 border-t border-slate-200">
                <span className="text-[10px] uppercase font-black text-slate-400 text-center block tracking-wider">
                  {isAmharic ? "ባዮሜትሪክ መረጃዎችን መቅረጫ" : "Biometric Device Capture"}
                </span>

                {/* Fingerprint Capture Trigger */}
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => handleRegisterBiometric("fingerprint")}
                    disabled={registeringBiometric !== "none"}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 border cursor-pointer transition-all ${
                      enrolledFingerprintHash 
                        ? "bg-emerald-50 border-emerald-200 text-emerald-700" 
                        : "bg-white hover:bg-slate-100 border-slate-200 text-slate-700"
                    }`}
                  >
                    <Fingerprint size={14} className={registeringBiometric === "fingerprint" ? "animate-pulse text-red-500" : ""} />
                    <span>
                      {registeringBiometric === "fingerprint" 
                        ? (isAmharic ? "ጣት በመቅረጽ ላይ..." : "Capturing ridgelines...")
                        : enrolledFingerprintHash 
                          ? (isAmharic ? "✓ አሻራ ተቀርጿል" : "✓ Fingerprint Enrolled") 
                          : (isAmharic ? "የጣት አሻራ ቅረጽ" : "Enroll Fingerprint")}
                    </span>
                  </button>
                  {enrolledFingerprintHash && (
                    <span className="block text-[9px] font-mono text-center text-slate-400">
                      Hash ID: {enrolledFingerprintHash}
                    </span>
                  )}
                </div>

                {/* Face Capture Trigger */}
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => handleRegisterBiometric("face")}
                    disabled={registeringBiometric !== "none"}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 border cursor-pointer transition-all ${
                      enrolledFaceHash 
                        ? "bg-emerald-50 border-emerald-200 text-emerald-700" 
                        : "bg-white hover:bg-slate-100 border-slate-200 text-slate-700"
                    }`}
                  >
                    <ScanLine size={14} className={registeringBiometric === "face" ? "animate-pulse text-red-500" : ""} />
                    <span>
                      {registeringBiometric === "face" 
                        ? (isAmharic ? "ፊት በመቅረጽ ላይ..." : "Scanning face maps...")
                        : enrolledFaceHash 
                          ? (isAmharic ? "✓ የፊት መለያ ተቀርጿል" : "✓ Facial Map Enrolled") 
                          : (isAmharic ? "የፊት ገጽታ ቅረጽ" : "Enroll Facial Recognition")}
                    </span>
                  </button>
                  {enrolledFaceHash && (
                    <span className="block text-[9px] font-mono text-center text-slate-400">
                      Hash ID: {enrolledFaceHash}
                    </span>
                  )}
                </div>

                {/* Progress bar */}
                {registeringBiometric !== "none" && (
                  <div className="space-y-1 pt-1.5">
                    <div className="flex justify-between text-[9px] font-mono text-slate-400">
                      <span>HARDWARE CAPTURE</span>
                      <span>{registrationProgress}%</span>
                    </div>
                    <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-red-600 transition-all duration-200" style={{ width: `${registrationProgress}%` }}></div>
                    </div>
                  </div>
                )}

              </div>

            </div>

            {/* COLUMN 2 & 3: FORM FLIEDS */}
            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Employee ID */}
              <div className="space-y-1">
                <label className="font-extrabold text-xs text-slate-700 block">{isAmharic ? "የሰራተኛ መለያ ቁጥር (ID)" : "Employee ID"}</label>
                <input 
                  type="text" 
                  value={enrollId}
                  onChange={e => setEnrollId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-mono font-bold text-slate-800 focus:bg-white focus:border-red-500 focus:outline-none"
                  placeholder="OVID-W-101"
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
                  <option value="OVID Construction">OVID Construction</option>
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

              {/* Assigned Project */}
              <div className="space-y-1">
                <label className="font-extrabold text-xs text-slate-700 block">{isAmharic ? "የተመደበበት ፐሮጀክት" : "Assigned Project"}</label>
                <input 
                  type="text" 
                  value="OVID Bole Heights"
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
                    <option value="OVID Tower 1">Tower 1</option>
                    <option value="OVID Tower 2">Tower 2</option>
                    <option value="OVID Tower 3">Tower 3</option>
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
                <label className="font-extrabold text-xs text-slate-700 block">{isAmharic ? "የቡድን መሪ (Team Leader)" : "Team Leader"}</label>
                <input 
                  type="text" 
                  value={enrollLeader}
                  onChange={e => setEnrollLeader(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-extrabold text-xs text-slate-700 block">{isAmharic ? "ጋንግ ቺፍ" : "Gang Chief"}</label>
                <input 
                  type="text" 
                  value={enrollChief}
                  onChange={e => setEnrollChief(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none"
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
