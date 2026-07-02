import React, { useState, useEffect } from "react";
import { 
  Fingerprint, 
  ScanLine, 
  MapPin, 
  Check, 
  AlertCircle, 
  Clock, 
  Camera, 
  Settings, 
  TrendingUp, 
  Users, 
  CheckCircle, 
  LogOut, 
  LogIn, 
  Map, 
  FileText,
  HelpCircle,
  Activity,
  UserCheck
} from "lucide-react";
import { Worker, AttendanceRecord, AttendanceMethod, UserRole } from "../types";

interface BiometricAttendanceBoardProps {
  workers: Worker[];
  attendance: AttendanceRecord[];
  onAddAttendance: (record: AttendanceRecord) => void;
  isAmharic: boolean;
  currentUserRole: UserRole;
  onLogAction?: (action: string, details: string) => void;
}

// Haversine formula to compute distance in meters between two coordinates
function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // Earth radius in meters
  const phi1 = lat1 * Math.PI / 180;
  const phi2 = lat2 * Math.PI / 180;
  const deltaPhi = (lat2 - lat1) * Math.PI / 180;
  const deltaLambda = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export const BiometricAttendanceBoard: React.FC<BiometricAttendanceBoardProps> = ({
  workers,
  attendance,
  onAddAttendance,
  isAmharic,
  currentUserRole,
  onLogAction
}) => {
  // Geofence configuration (OVID Bole Heights construction site default)
  const [geofenceLat, setGeofenceLat] = useState(9.0049);
  const [geofenceLng, setGeofenceLng] = useState(38.7783);
  const [allowedRadius, setAllowedRadius] = useState(150); // meters
  const [showConfig, setShowConfig] = useState(false);

  // User coordinate simulation states
  const [simLat, setSimLat] = useState(9.0048); // On-site by default
  const [simLng, setSimLng] = useState(38.7781);
  const [gpsPreset, setGpsPreset] = useState<"on-site" | "bole-airport" | "saris" | "custom">("on-site");

  // Selected worker for clock-in/out trigger
  const [selectedWorkerId, setSelectedWorkerId] = useState("");
  const [verificationMethod, setVerificationMethod] = useState<"fingerprint" | "face">("fingerprint");
  const [clockType, setClockType] = useState<"In" | "Out">("In");

  // Authentication UI state simulation
  const [authStatus, setAuthStatus] = useState<"idle" | "scanning" | "success" | "failed">("idle");
  const [authMessage, setAuthMessage] = useState("");
  const [authDetailLogs, setAuthDetailLogs] = useState<string[]>([]);
  const [latestAttendanceRecords, setLatestAttendanceRecords] = useState<AttendanceRecord[]>([]);

  // Policy Rules Config
  const [shiftStart, setShiftStart] = useState("08:00");
  const [shiftEnd, setShiftEnd] = useState("17:00");
  const [gracePeriod, setGracePeriod] = useState(15); // minutes
  const [breakDuration, setBreakDuration] = useState(1.0); // 1 hour break

  // Real-time notification log of breaches or rejections
  const [liveAlertLogs, setLiveAlertLogs] = useState<{
    id: string;
    workerId: string;
    workerName: string;
    type: "Geofence Breach" | "Biometric Failed" | "Late Check-In" | "Early Checkout";
    message: string;
    timestamp: string;
    deviation?: number;
  }[]>([]);

  // Filter workers based on logged in role
  const sharedWorkers = React.useMemo(() => {
    return workers.filter(w => {
      if (currentUserRole === UserRole.GANG_CHIEF) {
        // Gang Chiefs see workers assigned to their specific chief name
        return !w.gangChief || w.gangChief === "Fikru Tolossa" || w.teamId === "T-01";
      }
      if (currentUserRole === UserRole.TEAM_LEADER) {
        // Team Leaders see their team
        return !w.teamLeader || w.teamLeader === "Yohannes Bekele" || w.teamId === "T-01";
      }
      // Time Keepers, Supervisors & Head Office see everyone
      return true;
    });
  }, [workers, currentUserRole]);

  // Update SIM GPS based on presets
  useEffect(() => {
    if (gpsPreset === "on-site") {
      setSimLat(9.0049);
      setSimLng(38.7782);
    } else if (gpsPreset === "bole-airport") {
      setSimLat(8.9806);
      setSimLng(38.7905); // 4km away
    } else if (gpsPreset === "saris") {
      setSimLat(8.9622);
      setSimLng(38.7511); // 6.5km away
    }
  }, [gpsPreset]);

  // Calculate current deviation from center
  const currentDeviation = Math.round(getDistanceInMeters(simLat, simLng, geofenceLat, geofenceLng));
  const isInsideGeofence = currentDeviation <= allowedRadius;

  // Local helper to log live alert notifications
  const triggerAlertNotification = (
    workerId: string, 
    workerName: string, 
    type: "Geofence Breach" | "Biometric Failed" | "Late Check-In" | "Early Checkout", 
    message: string,
    deviation?: number
  ) => {
    const newAlert = {
      id: `alert-${Date.now()}`,
      workerId,
      workerName,
      type,
      message,
      timestamp: new Date().toLocaleTimeString(),
      deviation
    };
    setLiveAlertLogs(prev => [newAlert, ...prev]);
    if (onLogAction) {
      onLogAction(`Attendance Alert: ${type}`, `${workerName} (${workerId}) - ${message}`);
    }
  };

  // Run automatic attendance calculations when checking-in / out
  const handleVerifyAttendance = () => {
    if (!selectedWorkerId) {
      setAuthStatus("failed");
      setAuthMessage(isAmharic ? "እባክዎን መጀመሪያ ሰራተኛ ይምረጡ!" : "Please select an employee first!");
      return;
    }

    const worker = sharedWorkers.find(w => w.id === selectedWorkerId);
    if (!worker) {
      setAuthStatus("failed");
      setAuthMessage(isAmharic ? "ሰራተኛው አልተገኘም!" : "Employee record not found!");
      return;
    }

    setAuthStatus("scanning");
    setAuthDetailLogs([]);
    
    // Simulate biometric analysis timeline
    const steps = isAmharic ? [
      "የመሳሪያ ባዮሜትሪክ ዳሳሽ በማጣራት ላይ...",
      `የ${verificationMethod === "fingerprint" ? "ጣት አሻራ" : "የፊት ገጽታ"} ቅኝት በመካሄድ ላይ ነው...`,
      "የባዮሜትሪክ ማመሳከሪያ ነጥቦችን ከደመና ዳታቤዝ ጋር በማነጻጸር ላይ...",
      "የጂፒኤስ መጋጠሚያዎችን በማንበብ ላይ...",
      "የጂኦፌንስ ክልል ደህንነትን በመተንተን ላይ..."
    ] : [
      "Initializing secure device biometric sensor...",
      `Scanning worker ${verificationMethod === "fingerprint" ? "ridge-flow fingerprint" : "68-point facial nodes"}...`,
      "Comparing biometric template matching coefficient against master database...",
      "Acquiring high-accuracy device GPS coordinates...",
      "Checking authorized construction project geofence boundary..."
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        setAuthDetailLogs(prev => [...prev, steps[currentStep]]);
        currentStep++;
      } else {
        clearInterval(interval);
        finalizeVerification(worker);
      }
    }, 450);
  };

  const finalizeVerification = (worker: Worker) => {
    // 1. Biometric verification success simulation
    // Let's assume biometric matches perfectly since the device scanner triggers.
    
    // 2. GPS Verification
    const deviation = Math.round(getDistanceInMeters(simLat, simLng, geofenceLat, geofenceLng));
    const isInside = deviation <= allowedRadius;
    const now = new Date();
    const formattedTime = now.toLocaleTimeString("en-US", { hour12: false });
    const formattedDate = now.toISOString().split("T")[0];

    if (!isInside) {
      // Outside site violation
      setAuthStatus("failed");
      const errMsgEn = `GPS Verification Blocked: Registered outside authorized OVID site boundary. Current Deviation: ${deviation}m (Authorized radius: ${allowedRadius}m).`;
      const errMsgAm = `የጂፒኤስ ማረጋገጫ ተከልክሏል፡ ከተፈቀደው የሳይት ክልል ውጭ ሙከራ ተደርጓል። የአሁኑ ልዩነት: ${deviation}ሜ (የተፈቀደው ራዲየስ: ${allowedRadius}ሜ)።`;
      
      setAuthMessage(isAmharic ? errMsgAm : errMsgEn);
      triggerAlertNotification(
        worker.id, 
        worker.name, 
        "Geofence Breach", 
        isAmharic 
          ? `የጂኦፌንስ ደህንነት ጥሰት፡ ከሳይት ውጭ በ${deviation}ሜ ርቀት ላይ ለመመዝገብ ተሞክሯል`
          : `Attempted clock-${clockType.toLowerCase()} from outside site boundary by ${deviation}m deviation`,
        deviation
      );
      return;
    }

    // Inside Authorised Site! Accept attendance
    setAuthStatus("success");
    const methodUsed = verificationMethod === "fingerprint" ? AttendanceMethod.FINGERPRINT : AttendanceMethod.FACE_RECOGNITION;

    // Check if there is an active check-in record for today
    const existingRec = attendance.find(a => a.workerId === worker.id && a.date === formattedDate);

    if (clockType === "In") {
      if (existingRec && existingRec.checkIn) {
        setAuthStatus("failed");
        setAuthMessage(isAmharic 
          ? `የደህንነት ማስጠንቀቂያ፡ የጠዋት መግቢያ ለ ${worker.name} አስቀድሞ ተመዝግቧል (${existingRec.checkIn})`
          : ` Roster Integrity: Morning Check-In already saved for ${worker.name} at ${existingRec.checkIn}.`);
        return;
      }

      // Late Arrival calculations
      const [nowH, nowM] = formattedTime.split(":").map(Number);
      const [shiftH, shiftM] = shiftStart.split(":").map(Number);
      const checkInMinutes = nowH * 60 + nowM;
      const shiftStartMinutes = shiftH * 60 + shiftM;
      const isLate = checkInMinutes > (shiftStartMinutes + gracePeriod);
      const status = isLate ? "Late" : "Present";

      if (isLate) {
        triggerAlertNotification(
          worker.id,
          worker.name,
          "Late Check-In",
          isAmharic 
            ? `ዘግይቶ መግባት፡ በ ${formattedTime} ላይ ገብቷል (የፈረቃ መጀመሪያ ${shiftStart} + ${gracePeriod}ደቂቃ የትዕግስት ጊዜ አልፏል)`
            : `Late arrival at ${formattedTime} (Policy: Shift starts at ${shiftStart} with ${gracePeriod}m grace period)`
        );
      }

      const newRecord: AttendanceRecord = {
        id: `ATT-${Date.now()}`,
        workerId: worker.id,
        workerName: worker.name,
        department: worker.department,
        trade: worker.trade,
        company: worker.company,
        building: worker.building || "Tower 1",
        floor: worker.floor || 4,
        zone: worker.zone || "Zone A",
        date: formattedDate,
        checkIn: formattedTime,
        checkOut: null,
        method: methodUsed,
        workingHours: 0,
        overtime: 0,
        status: status,
        gpsCoordinates: { lat: simLat, lng: simLng },
        deviceUsed: "OVID-BIO-PAD-03",
        verifiedBy: currentUserRole,
        gpsLocationString: isAmharic 
          ? `ቦሌ ሃይትስ ታወር 1 (ልዩነት፡ ${deviation}ሜ)` 
          : `Bole Heights Tower 1 (${deviation}m deviation)`
      };

      onAddAttendance(newRecord);
      setAuthMessage(isAmharic 
        ? `የጠዋት መግቢያ ለ ${worker.name} በ${formattedTime} በተሳካ ሁኔታ ተመዝግቧል! ሁኔታ: ${status === "Late" ? "የዘገየ" : "የተገኘ"}`
        : `Morning Check-In accepted for ${worker.name} at ${formattedTime}! Status: ${status}.`);
      
    } else {
      // CLOCK OUT
      const currentActive = attendance.find(a => a.workerId === worker.id && a.date === formattedDate && a.checkIn && !a.checkOut);
      
      if (!currentActive) {
        setAuthStatus("failed");
        setAuthMessage(isAmharic 
          ? `የመግቢያ መዝገብ አልተገኘም፡ ሰራተኛው ${worker.name} ዛሬ ጠዋት አልገባም!`
          : `Clock-out failed: No active morning Check-In record found for ${worker.name} today.`);
        return;
      }

      // Calculations
      const checkInStr = currentActive.checkIn!;
      const [inH, inM] = checkInStr.split(":").map(Number);
      const [outH, outM] = formattedTime.split(":").map(Number);
      
      const rawHours = Math.max(0, (outH + outM / 60) - (inH + inM / 60));
      const netWorkingHours = Math.max(0, rawHours - breakDuration);
      
      // Standard shift cap is 8.0 hours. The rest is Overtime.
      const workingHours = parseFloat(Math.min(8.0, netWorkingHours).toFixed(2));
      const overtime = parseFloat(Math.max(0, netWorkingHours - 8.0).toFixed(2));

      // Early Departure alert
      const [shiftEndH, shiftEndM] = shiftEnd.split(":").map(Number);
      const shiftEndMinutes = shiftEndH * 60 + shiftEndM;
      const checkoutMinutes = outH * 60 + outM;
      const isEarly = checkoutMinutes < shiftEndMinutes;

      if (isEarly) {
        triggerAlertNotification(
          worker.id,
          worker.name,
          "Early Checkout",
          isAmharic 
            ? `ቀድሞ መውጣት፡ በ ${formattedTime} ወጥቷል (የፈረቃ ማብቂያ ${shiftEnd} ሳይደርስ)`
            : `Early checkout at ${formattedTime} (Before official shift end ${shiftEnd})`
        );
      }

      const updatedRecord: AttendanceRecord = {
        ...currentActive,
        checkOut: formattedTime,
        workingHours: parseFloat((workingHours + overtime).toFixed(2)),
        overtime,
        deviceUsed: "OVID-BIO-PAD-03",
        verifiedBy: currentUserRole,
        gpsLocationString: isAmharic 
          ? `ቦሌ ሃይትስ ታወር 1 (ልዩነት፡ ${deviation}ሜ)` 
          : `Bole Heights Tower 1 (${deviation}m deviation)`
      };

      onAddAttendance(updatedRecord);
      setAuthMessage(isAmharic 
        ? `የማታ መውጫ ለ ${worker.name} በ${formattedTime} ተመዝግቧል። የስራ ሰዓት፡ ${workingHours}ሰ | ትርፍ ሰዓት፡ ${overtime}ሰ`
        : `Evening Check-Out completed for ${worker.name} at ${formattedTime}. Hours Worked: ${workingHours}h, Overtime: ${overtime}h.`);
    }

    // Reset fields after successful clocking
    setTimeout(() => {
      setSelectedWorkerId("");
      setAuthStatus("idle");
    }, 4500);
  };

  // Automated Metrics & Calculations for Live Dashboard
  const metrics = React.useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const todayRecords = attendance.filter(a => a.date === today);
    
    const total = sharedWorkers.length;
    const presentRecs = todayRecords.filter(r => r.status === "Present" || r.status === "Late");
    const present = presentRecs.length;
    const late = todayRecords.filter(r => r.status === "Late").length;
    const absent = Math.max(0, total - present);
    
    const checkedIn = todayRecords.filter(r => r.checkIn !== null).length;
    const checkedOut = todayRecords.filter(r => r.checkIn !== null && r.checkOut !== null).length;
    const currentlyWorking = todayRecords.filter(r => r.checkIn !== null && r.checkOut === null).length;
    
    // Sum overtime today
    const totalOvertime = todayRecords.reduce((sum, r) => sum + (r.overtime || 0), 0);
    
    // Geofence breach count today
    const geofenceBreaches = liveAlertLogs.filter(a => a.type === "Geofence Breach").length;

    return {
      total,
      present,
      absent,
      late,
      checkedIn,
      checkedOut,
      currentlyWorking,
      geofenceBreaches,
      totalOvertime: parseFloat(totalOvertime.toFixed(1))
    };
  }, [sharedWorkers, attendance, liveAlertLogs]);

  // Translate status text for layout
  const translateStatus = (status: string) => {
    if (!isAmharic) return status;
    switch (status) {
      case "Present": return "የተገኘ";
      case "Late": return "የዘገየ";
      case "Absent": return "የቀረ";
      case "Leave": return "ፈቃድ ላይ";
      case "Holiday": return "በዓል";
      default: return status;
    }
  };

  return (
    <div className="space-y-6" id="biometric-attendance-board">
      
      {/* Title & Introduction Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 bg-red-50 text-red-600 rounded-xl">
            <Fingerprint size={26} className="animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              {isAmharic ? "በጂፒኤስ የታገዘ የባዮሜትሪክ መገኘት መቆጣጠሪያ ሰሌዳ" : "GPS-Based Biometric Attendance Board"}
            </h2>
            <p className="text-xs text-slate-500 max-w-2xl leading-relaxed mt-0.5">
              {isAmharic 
                ? "አውቶማቲክ የጣት አሻራ፣ የፊት ገጽታ መለያ እና የጂፒኤስ ጂኦፌንሲንግ መፈተሻ ሞጁል። የሰራተኛ መግቢያና መውጫ መረጃዎችን በአካል በመመርመር በቅጽበት ከማህደሩ ጋር ያመሳስላል።"
                : "Automatic fingerprint, facial recognition authentication, and high-precision GPS geofencing. Automatically syncs field coordinates and computes working hours in real-time."}
            </p>
          </div>
        </div>

        {/* Current Role Access Badge */}
        <div className="flex items-center space-x-2 shrink-0">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
            {isAmharic ? "የደህንነት ፈቃድ ክፍል" : "Security Scope"}
          </span>
          <div className="px-3.5 py-1.5 bg-slate-900 text-white font-extrabold text-xs rounded-xl flex items-center space-x-1">
            <UserCheck size={13} className="text-red-400" />
            <span>{currentUserRole}</span>
          </div>
        </div>
      </div>

      {/* --- LIVE STATS DASHBOARD --- */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start text-slate-400">
            <span className="text-xs font-bold text-slate-500">{isAmharic ? "ጠቅላላ ሰራተኞች" : "Total Employees"}</span>
            <Users size={18} className="text-slate-400" />
          </div>
          <div className="mt-2.5">
            <span className="text-2xl font-black text-slate-800">{metrics.total}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">{isAmharic ? "ከስራ መደብ ዝርዝር ውስጥ" : "Active shared roster"}</span>
          </div>
        </div>

        <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start text-emerald-600">
            <span className="text-xs font-bold text-emerald-700">{isAmharic ? "የተገኙ" : "Present / On-Time"}</span>
            <CheckCircle size={18} className="text-emerald-600" />
          </div>
          <div className="mt-2.5">
            <span className="text-2xl font-black text-emerald-800">{metrics.present}</span>
            <span className="text-[10px] text-emerald-500 block mt-0.5">
              {metrics.late > 0 
                ? (isAmharic ? `+${metrics.late} የዘገዩ ተካትተዋል` : `Includes ${metrics.late} late workers`) 
                : (isAmharic ? "ሁሉም በሰዓቱ ገብተዋል" : "All arrived within grace period")}
            </span>
          </div>
        </div>

        <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start text-amber-600">
            <span className="text-xs font-bold text-amber-700">{isAmharic ? "እየሰሩ ያሉ" : "Currently Working"}</span>
            <Activity size={18} className="text-amber-500 animate-pulse" />
          </div>
          <div className="mt-2.5">
            <span className="text-2xl font-black text-amber-800">{metrics.currentlyWorking}</span>
            <span className="text-[10px] text-amber-500 block mt-0.5">
              {isAmharic ? "መውጫ ያልመዘገቡ" : "Checked-In, not checked-out"}
            </span>
          </div>
        </div>

        <div className="bg-red-50/40 p-4 rounded-2xl border border-red-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start text-red-600">
            <span className="text-xs font-bold text-red-700">{isAmharic ? "ከሳይት ውጭ የተከለከሉ" : "Outside Authorized Area"}</span>
            <AlertCircle size={18} className="text-red-500 animate-bounce" />
          </div>
          <div className="mt-2.5">
            <span className="text-2xl font-black text-red-800">{metrics.geofenceBreaches}</span>
            <span className="text-[10px] text-red-400 block mt-0.5">
              {isAmharic ? "የጂኦፌንስ ጥሰት ዛሬ" : "Rejected GPS clock attempts"}
            </span>
          </div>
        </div>

        <div className="bg-slate-900 text-slate-100 p-4 rounded-2xl border border-slate-800 shadow-sm flex flex-col justify-between col-span-2 md:col-span-1">
          <div className="flex justify-between items-start text-slate-400">
            <span className="text-xs font-bold text-slate-300">{isAmharic ? "ጠቅላላ ትርፍ ሰዓት" : "Daily Overtime"}</span>
            <TrendingUp size={18} className="text-red-400" />
          </div>
          <div className="mt-2.5">
            <span className="text-2xl font-black text-white">+{metrics.totalOvertime} <span className="text-xs font-medium">hrs</span></span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {isAmharic ? "ዛሬ የተሰላ ጠቅላላ ሰዓት" : "Accumulated overtime logs"}
            </span>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT TWO-THIRDS: BOARD & CONTROLS */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* INTERACTIVE BIOMETRIC CONSOLE & SENSORS */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
            
            {/* Header with quick config toggle */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Settings size={18} className="text-red-500" />
                <h3 className="font-extrabold text-sm text-slate-900">
                  {isAmharic ? "የማረጋገጫ እና ጂፒኤስ ሲሙሌተር ዴስክ" : "Live Device Authentication & GPS Terminal"}
                </h3>
              </div>
              
              <button
                onClick={() => setShowConfig(!showConfig)}
                className="text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-lg transition-all cursor-pointer"
              >
                {showConfig 
                  ? (isAmharic ? "የጂፒኤስ ክልል ደብቅ" : "Hide Geofence Setup") 
                  : (isAmharic ? "የጂፒኤስ ክልል አሳይ" : "Setup Geofence Boundaries")}
              </button>
            </div>

            {/* Geofence Configuration Board (Collapsible) */}
            {showConfig && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs animate-fadeIn">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">{isAmharic ? "የሳይት መካከለኛ ላቲቲዩድ" : "Geofence Latitude"}</label>
                  <input 
                    type="number" 
                    step="0.0001"
                    value={geofenceLat}
                    onChange={e => setGeofenceLat(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">{isAmharic ? "የሳይት መካከለኛ ሎንጊቲዩድ" : "Geofence Longitude"}</label>
                  <input 
                    type="number" 
                    step="0.0001"
                    value={geofenceLng}
                    onChange={e => setGeofenceLng(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">{isAmharic ? "የተፈቀደ ራዲየስ (በሜትር)" : "Allowed Radius (meters)"}</label>
                  <input 
                    type="number" 
                    value={allowedRadius}
                    onChange={e => setAllowedRadius(parseInt(e.target.value) || 0)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 font-mono"
                  />
                </div>
                
                <div className="md:col-span-3 pt-2 border-t border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Shift Starts</label>
                    <input type="text" value={shiftStart} onChange={e => setShiftStart(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg p-1.5 font-mono" />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Shift Ends</label>
                    <input type="text" value={shiftEnd} onChange={e => setShiftEnd(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg p-1.5 font-mono" />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Grace (min)</label>
                    <input type="number" value={gracePeriod} onChange={e => setGracePeriod(parseInt(e.target.value) || 0)} className="w-full bg-white border border-slate-200 rounded-lg p-1.5 font-mono" />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Break (hours)</label>
                    <input type="number" step="0.5" value={breakDuration} onChange={e => setBreakDuration(parseFloat(e.target.value) || 0)} className="w-full bg-white border border-slate-200 rounded-lg p-1.5 font-mono" />
                  </div>
                </div>
              </div>
            )}

            {/* Simulated Live GPS Location Input & Presets */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs bg-slate-50/50 p-4 rounded-xl border border-slate-100">
              
              <div className="space-y-1">
                <label className="font-bold text-slate-700 flex justify-between">
                  <span>{isAmharic ? "የጂፒኤስ ሙከራ መገኛ" : "Simulated Location Preset"}</span>
                  <Map size={14} className="text-slate-400" />
                </label>
                <select
                  value={gpsPreset}
                  onChange={e => setGpsPreset(e.target.value as any)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 font-semibold outline-none focus:border-red-500"
                >
                  <option value="on-site">{isAmharic ? "በሳይቱ ግቢ ውስጥ (0ሜ ልዩነት)" : "Inside Construction Site (0m deviation)"}</option>
                  <option value="bole-airport">{isAmharic ? "ቦሌ አውሮፕላን ማረፊያ (4.1ኪሜ - ውድቅ)" : "Bole Airport (4.1km away - REJECT)"}</option>
                  <option value="saris">{isAmharic ? "ሳሪስ ብሎክ ዲ (6.5ኪሜ - ውድቅ)" : "Saris Block D (6.5km away - REJECT)"}</option>
                  <option value="custom">{isAmharic ? "እራስዎ ያመቻቹት መጋጠሚያ" : "Custom Simulated Coordinates"}</option>
                </select>
              </div>

              {gpsPreset === "custom" ? (
                <>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Simulated Lat</label>
                    <input 
                      type="number" 
                      step="0.0001"
                      value={simLat} 
                      onChange={e => setSimLat(parseFloat(e.target.value) || 0)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Simulated Lng</label>
                    <input 
                      type="number" 
                      step="0.0001"
                      value={simLng} 
                      onChange={e => setSimLng(parseFloat(e.target.value) || 0)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 font-mono"
                    />
                  </div>
                </>
              ) : (
                <div className="md:col-span-2 flex items-center bg-white p-3 rounded-lg border border-slate-100">
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-500 text-[10px] uppercase tracking-wider block">
                      {isAmharic ? "አውቶማቲክ የተሰላ የጂፒኤስ ልዩነት" : "Calculated GPS Geofence Check"}
                    </span>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-block w-2.5 h-2.5 rounded-full ${isInsideGeofence ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`}></span>
                      <span className="font-mono text-xs font-bold text-slate-800">
                        {simLat.toFixed(5)}°N, {simLng.toFixed(5)}°E
                      </span>
                      <span className="text-slate-400">|</span>
                      <span className={`font-extrabold ${isInsideGeofence ? "text-emerald-600" : "text-red-600"}`}>
                        {isInsideGeofence 
                          ? (isAmharic ? `በሳይት ክልል ውስጥ (ርቀት፡ ${currentDeviation}ሜ)` : `Inside Site Area (Deviation: ${currentDeviation}m)`)
                          : (isAmharic ? `ከሳይት ክልል ውጭ (ልዩነት፡ ${currentDeviation}ሜ)` : `Outside Authorized Boundary (Deviation: ${currentDeviation}m)`)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Employee Selection and Clock Action */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">
                  {isAmharic ? "1. ሰራተኛ ይምረጡ" : "Step 1: Choose Employee for Board Check"}
                </label>
                <select
                  value={selectedWorkerId}
                  onChange={e => {
                    setSelectedWorkerId(e.target.value);
                    setAuthStatus("idle");
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 font-semibold text-slate-800 focus:border-red-500 focus:bg-white outline-none"
                >
                  <option value="">-- {isAmharic ? "ለፍተሻ ሰራተኛ ይምረጡ" : "Select Worker for Clocking"} --</option>
                  {sharedWorkers.map(w => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.id} - {w.trade})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">
                  {isAmharic ? "2. የባዮሜትሪክ ዘዴ እና የፈረቃ ሁኔታ" : "Step 2: Biometric verification Mode"}
                </label>
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                  <button
                    onClick={() => setVerificationMethod("fingerprint")}
                    className={`py-2 rounded-lg font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                      verificationMethod === "fingerprint" 
                        ? "bg-slate-900 text-white shadow" 
                        : "text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    <Fingerprint size={14} />
                    <span>{isAmharic ? "ጣት አሻራ" : "Fingerprint"}</span>
                  </button>

                  <button
                    onClick={() => setVerificationMethod("face")}
                    className={`py-2 rounded-lg font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                      verificationMethod === "face" 
                        ? "bg-slate-900 text-white shadow" 
                        : "text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    <ScanLine size={14} />
                    <span>{isAmharic ? "የፊት ገጽታ" : "Face Scan"}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* SCANNING & RESULTS DISPLAY CARD */}
            {selectedWorkerId && (
              <div className="bg-slate-950 text-slate-100 rounded-xl p-5 border border-slate-800 space-y-4 animate-fadeIn">
                
                {authStatus === "idle" && (
                  <div className="flex flex-col items-center justify-center py-6 text-center space-y-3">
                    <div className="w-14 h-14 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center text-red-500 animate-pulse">
                      {verificationMethod === "fingerprint" ? <Fingerprint size={28} /> : <ScanLine size={28} />}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-200">
                        {isAmharic ? "የባዮሜትሪክ እና የጂፒኤስ ማረጋገጫ ተዘጋጅቷል" : "Biometric Verification Device Initialized"}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {isAmharic 
                          ? `${verificationMethod === "fingerprint" ? "ጣት አሻራ" : "የፊት መለያ"} ዳሳሽ ዝግጁ ነው። ለመጀመር 'ግባ' ወይም 'ውጣ' ይምረጡ`
                          : `The simulated physical terminal is ready. Trigger attendance below for the selected worker.`}
                      </p>
                    </div>

                    <div className="flex items-center space-x-3 pt-2">
                      <button
                        onClick={() => { setClockType("In"); setTimeout(handleVerifyAttendance, 100); }}
                        className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-lg flex items-center space-x-1.5 cursor-pointer uppercase tracking-wider shadow"
                      >
                        <LogIn size={14} />
                        <span>{isAmharic ? "የጠዋት መግቢያ (Check-In)" : "Morning Check-In"}</span>
                      </button>

                      <button
                        onClick={() => { setClockType("Out"); setTimeout(handleVerifyAttendance, 100); }}
                        className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-lg flex items-center space-x-1.5 cursor-pointer uppercase tracking-wider shadow"
                      >
                        <LogOut size={14} />
                        <span>{isAmharic ? "የማታ መውጫ (Check-Out)" : "Evening Check-Out"}</span>
                      </button>
                    </div>
                  </div>
                )}

                {authStatus === "scanning" && (
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="text-xs font-mono tracking-widest text-red-400 font-bold animate-pulse">
                        [ {clockType === "In" ? "CHECK-IN SCAN ACTIVE" : "CHECK-OUT SCAN ACTIVE"} ]
                      </span>
                      <div className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping"></div>
                    </div>

                    <div className="relative h-1 bg-slate-800 overflow-hidden rounded-full">
                      <div className="absolute top-0 bottom-0 left-0 bg-red-600 animate-[loading_2.5s_infinite] w-1/3"></div>
                    </div>

                    <div className="font-mono text-[10px] text-slate-300 space-y-1.5 max-h-[110px] overflow-y-auto bg-black/40 p-3 rounded border border-slate-900 leading-relaxed">
                      {authDetailLogs.map((log, i) => (
                        <div key={i} className="flex items-center space-x-1.5">
                          <span className="text-red-500">▶</span>
                          <span>{log}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {authStatus === "failed" && (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="flex items-start space-x-3 bg-red-950/40 border border-red-900/60 p-4 rounded-xl">
                      <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={20} />
                      <div className="space-y-1">
                        <h4 className="font-extrabold text-sm text-red-400 uppercase tracking-wide">
                          {isAmharic ? "ማረጋገጫው ውድቅ ተደርጓል!" : "AUTHENTICATION ATTEMPT REJECTED"}
                        </h4>
                        <p className="text-xs text-slate-200 font-medium leading-relaxed">
                          {authMessage}
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={() => setAuthStatus("idle")}
                        className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg cursor-pointer"
                      >
                        {isAmharic ? "ዳግም ሞክር" : "Retry Verification"}
                      </button>
                    </div>
                  </div>
                )}

                {authStatus === "success" && (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="flex items-start space-x-3 bg-emerald-950/40 border border-emerald-900/60 p-4 rounded-xl">
                      <CheckCircle className="text-emerald-400 shrink-0 mt-0.5" size={20} />
                      <div className="space-y-1">
                        <h4 className="font-extrabold text-sm text-emerald-400 uppercase tracking-wide">
                          {isAmharic ? "ማረጋገጫው በተሳካ ሁኔታ ተጠናቋል!" : "SECURITY CLEARANCE PASSED"}
                        </h4>
                        <p className="text-xs text-slate-200 font-medium leading-relaxed">
                          {authMessage}
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={() => setAuthStatus("idle")}
                        className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg cursor-pointer"
                      >
                        {isAmharic ? "አጠናቅ" : "Complete"}
                      </button>
                    </div>
                  </div>
                )}

              </div>
            )}

          </div>

          {/* DEDICATED BIOMETRIC ATTENDANCE BOARD */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">
                  {isAmharic ? "የሰራተኞች ባዮሜትሪክ መገኘት ሰሌዳ" : "Employee Biometric Attendance Board"}
                </h3>
                <p className="text-xs text-slate-500">
                  {isAmharic 
                    ? `በድርጅት መዋቅር ውስጥ የሚገኙ የፈቃድ ክልል ሰራተኞች ዝርዝር።`
                    : `Real-time physical checklist with responsive verification controls.`}
                </p>
              </div>

              {/* Floor / Zone indicator for chiefs */}
              {(currentUserRole === UserRole.GANG_CHIEF || currentUserRole === UserRole.TEAM_LEADER) && (
                <span className="bg-red-50 text-red-700 px-3 py-1 rounded-full text-xs font-bold shrink-0">
                  {isAmharic ? "ቡድንህ የተመደበበት ዞን፡ Floor 4" : "Your Assigned Zone: FL 4"}
                </span>
              )}
            </div>

            {/* Attendance Board Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sharedWorkers.map(w => {
                // Check attendance status today
                const today = new Date().toISOString().split("T")[0];
                const rec = attendance.find(a => a.workerId === w.id && a.date === today);
                
                const isCheckedIn = rec?.checkIn !== null && rec?.checkIn !== undefined;
                const isCheckedOut = rec?.checkOut !== null && rec?.checkOut !== undefined;

                return (
                  <div 
                    key={w.id} 
                    className={`p-4 rounded-xl border transition-all flex flex-col justify-between space-y-3.5 relative ${
                      isCheckedOut 
                        ? "bg-slate-50/50 border-slate-200" 
                        : isCheckedIn 
                          ? "bg-red-50/10 border-red-100 shadow-sm" 
                          : "bg-white border-slate-100 hover:border-slate-300"
                    }`}
                  >
                    
                    {/* Top part: Personal biodata */}
                    <div className="flex items-start space-x-3">
                      <img
                        src={w.photo || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop"}
                        alt={w.name}
                        className="w-12 h-12 rounded-full border border-slate-200 object-cover shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0">
                        <div className="font-extrabold text-xs text-slate-400 font-mono tracking-wider flex items-center space-x-1">
                          <span>{w.id}</span>
                          <span className="text-[10px] font-normal">•</span>
                          <span>{w.company}</span>
                        </div>
                        <h4 className="font-extrabold text-sm text-slate-800 leading-tight truncate">{w.name}</h4>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5">
                          <span className="font-medium text-slate-700">{w.trade}</span>
                          <span className="text-slate-300">|</span>
                          <span>FL {w.floor || 4} - {w.zone || "Zone A"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Middle part: Attendance timeline & Status badge */}
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex items-center justify-between text-xs font-medium">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-1 text-slate-500">
                          <LogIn size={12} className="text-emerald-500" />
                          <span>{isAmharic ? "መግቢያ" : "In"}: <span className="font-mono font-bold text-slate-700">{rec?.checkIn || "--:--"}</span></span>
                        </div>
                        <div className="flex items-center space-x-1 text-slate-500">
                          <LogOut size={12} className="text-amber-500" />
                          <span>{isAmharic ? "መውጫ" : "Out"}: <span className="font-mono font-bold text-slate-700">{rec?.checkOut || "--:--"}</span></span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">{isAmharic ? "ሁኔታ" : "Status"}</span>
                        <span className={`inline-block mt-1.5 px-2.5 py-0.5 rounded-full font-extrabold text-[11px] ${
                          rec?.status === "Present" 
                            ? "bg-emerald-100 text-emerald-800" 
                            : rec?.status === "Late" 
                              ? "bg-amber-100 text-amber-800" 
                              : "bg-red-50 text-red-700"
                        }`}>
                          {rec ? translateStatus(rec.status) : (isAmharic ? "ያልተመዘገበ" : "Not Clocked")}
                        </span>
                      </div>
                    </div>

                    {/* Bottom part: Context actions */}
                    <div className="flex items-center justify-between gap-2 pt-1">
                      
                      <button
                        onClick={() => {
                          setSelectedWorkerId(w.id);
                          setClockType("In");
                          window.scrollTo({ top: 300, behavior: 'smooth' });
                        }}
                        disabled={isCheckedIn}
                        className="flex-1 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold rounded-lg text-[11px] transition-all flex items-center justify-center space-x-1 cursor-pointer"
                      >
                        <LogIn size={12} />
                        <span>{isAmharic ? "መግቢያ" : "Clock In"}</span>
                      </button>

                      <button
                        onClick={() => {
                          setSelectedWorkerId(w.id);
                          setClockType("Out");
                          window.scrollTo({ top: 300, behavior: 'smooth' });
                        }}
                        disabled={!isCheckedIn || isCheckedOut}
                        className="flex-1 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold rounded-lg text-[11px] transition-all flex items-center justify-center space-x-1 cursor-pointer"
                      >
                        <LogOut size={12} />
                        <span>{isAmharic ? "መውጫ" : "Clock Out"}</span>
                      </button>

                    </div>

                  </div>
                );
              })}
            </div>

          </div>

        </div>

        {/* RIGHT ONE-THIRD: REAL-TIME NOTIFICATION STREAM */}
        <div className="space-y-6">
          
          {/* SECURE GEOLOCATION & SHIFT DETAILS */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4 text-xs">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
              <MapPin className="text-red-500" size={18} />
              <h3 className="font-extrabold text-sm text-slate-800">
                {isAmharic ? "የኮንስትራክሽን ፕሮጀክት ጂኦፌንስ ደንብ" : "Geofencing Specifications"}
              </h3>
            </div>

            <div className="space-y-3">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1.5 leading-relaxed">
                <span className="font-bold text-slate-400 uppercase text-[9px] tracking-wider block">OVID Bole Heights Core Geofence</span>
                <div className="flex justify-between"><span className="text-slate-500">Center Lat:</span> <span className="font-mono font-extrabold text-slate-700">{geofenceLat}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Center Lng:</span> <span className="font-mono font-extrabold text-slate-700">{geofenceLng}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Secure Radius:</span> <span className="font-mono font-extrabold text-red-600">{allowedRadius} meters</span></div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1.5">
                <span className="font-bold text-slate-400 uppercase text-[9px] tracking-wider block">Automatic Calculations Policy</span>
                <div className="flex justify-between"><span className="text-slate-500">Normal hours cap:</span> <span className="font-bold text-slate-700">8.0 hours max</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Unpaid break:</span> <span className="font-bold text-slate-700">{breakDuration} hour</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Grace allowance:</span> <span className="font-bold text-slate-700">{gracePeriod} minutes</span></div>
              </div>
            </div>
          </div>

          {/* BREACH LOGS & SECURITY STATUS LIST */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4 flex flex-col justify-between min-h-[400px]">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping"></span>
                  <h3 className="font-extrabold text-sm text-slate-800">
                    {isAmharic ? "የደህንነት ማስጠንቀቂያዎችና ማንቂያዎች" : "Site Security Alerts Log"}
                  </h3>
                </div>
                <span className="bg-red-100 text-red-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                  {liveAlertLogs.length}
                </span>
              </div>

              {/* Alerts Log Stream */}
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {liveAlertLogs.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 font-medium">
                    <CheckCircle className="mx-auto mb-2 text-slate-200" size={32} />
                    <span>{isAmharic ? "ምንም አይነት የደህንነት ጥሰት አልተመዘገበም" : "No geofence or shift policy breaches recorded today."}</span>
                  </div>
                ) : (
                  liveAlertLogs.map(alert => (
                    <div 
                      key={alert.id} 
                      className={`p-3 rounded-xl border flex gap-2.5 items-start text-xs leading-relaxed transition-all ${
                        alert.type === "Geofence Breach" 
                          ? "bg-red-50 border-red-100 text-red-900" 
                          : alert.type === "Biometric Failed" 
                            ? "bg-slate-50 border-slate-200 text-slate-800" 
                            : "bg-amber-50 border-amber-100 text-amber-900"
                      }`}
                    >
                      <div className="shrink-0 mt-0.5">
                        {alert.type === "Geofence Breach" ? (
                          <MapPin size={15} className="text-red-600 animate-bounce" />
                        ) : (
                          <AlertCircle size={15} className="text-amber-600" />
                        )}
                      </div>
                      <div className="space-y-0.5">
                        <div className="font-extrabold flex items-center justify-between">
                          <span>{alert.type}</span>
                          <span className="font-mono text-[9px] text-slate-400 font-normal">{alert.timestamp}</span>
                        </div>
                        <p className="text-slate-700 font-medium">{alert.message}</p>
                        <span className="text-[10px] font-mono text-slate-400 block">{alert.workerName} ({alert.workerId})</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <button
              onClick={() => setLiveAlertLogs([])}
              className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 text-[10px] font-bold rounded-lg border border-slate-200 uppercase tracking-wider cursor-pointer"
            >
              {isAmharic ? "የማንቂያዎች ዝርዝር አጽዳ" : "Clear Notification Stream"}
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};
