import React, { useState, useMemo } from "react";
import { 
  ShieldCheck, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  Users, 
  Send, 
  RefreshCw, 
  Download, 
  FileSpreadsheet, 
  Fingerprint, 
  Camera, 
  Info, 
  Search, 
  FileText, 
  Check, 
  ChevronRight, 
  Bell, 
  Lock, 
  MapPin, 
  Printer, 
  Layers 
} from "lucide-react";
import { Worker, UserRole, AttendanceRecord, AttendanceMethod } from "../types";

interface BreakExceptionsHubProps {
  workers: Worker[];
  attendance: AttendanceRecord[];
  onAddAttendance: (record: AttendanceRecord) => void;
  isAmharic: boolean;
  currentUserRole: UserRole;
}

// Exception Types
export type ExceptionReason = 
  | "Transportation Delay" 
  | "Heavy Rain" 
  | "Medical / Illness" 
  | "Official Company Assignment" 
  | "Equipment Breakdown" 
  | "Safety Incident" 
  | "Personal Emergency" 
  | "Traffic Congestion" 
  | "Other";

export interface ExceptionLog {
  id: string;
  workerId: string;
  workerName: string;
  trade: string;
  type: "LATE_ARRIVAL" | "EARLY_DEPARTURE" | "LATE_LUNCH_RETURN" | "OVERTIME_STAY" | "MISSED_PUNCH";
  punchTime: string;
  expectedTime: string;
  reason: ExceptionReason;
  comment: string;
  submittedBy: string;
  submittedAt: string;
  approvalStatus: "Pending" | "Approved" | "Rejected" | "Info Requested";
  reviewerComments?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface MultiPunchDay {
  workerId: string;
  workerName: string;
  trade: string;
  team: string;
  date: string;
  morningIn: string | null;       // 08:00
  lunchOut: string | null;        // 12:00
  lunchIn: string | null;         // 13:00
  eveningOut: string | null;      // 17:00
  morningInMethod: "Fingerprint" | "Face Recognition" | null;
  lunchOutMethod: "Fingerprint" | "Face Recognition" | null;
  lunchInMethod: "Fingerprint" | "Face Recognition" | null;
  eveningOutMethod: "Fingerprint" | "Face Recognition" | null;
  isSynced: boolean;
}

export const BreakExceptionsHub: React.FC<BreakExceptionsHubProps> = ({
  workers,
  attendance,
  onAddAttendance,
  isAmharic,
  currentUserRole
}) => {
  // Active inner subtab: dashboard, simulator, approvals, synchronization, reports, security
  const [activeTab, setActiveTab] = useState<"dashboard" | "simulator" | "approvals" | "sync" | "reports" | "security">("dashboard");

  // Initial Multi-Punch Mock Data for Today (YYYY-MM-DD)
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  const [multiPunches, setMultiPunches] = useState<MultiPunchDay[]>([
    {
      workerId: "OVID-W-101",
      workerName: "Bekele Tesfaye",
      trade: "Carpenter",
      team: "T-01",
      date: todayStr,
      morningIn: "07:52",
      lunchOut: "12:02",
      lunchIn: "12:58",
      eveningOut: null,
      morningInMethod: "Fingerprint",
      lunchOutMethod: "Fingerprint",
      lunchInMethod: "Fingerprint",
      eveningOutMethod: null,
      isSynced: true
    },
    {
      workerId: "OVID-W-102",
      workerName: "Chala Kebede",
      trade: "Welder",
      team: "T-01",
      date: todayStr,
      morningIn: "08:35", // Late
      lunchOut: null,
      lunchIn: null,
      eveningOut: null,
      morningInMethod: "Face Recognition",
      lunchOutMethod: null,
      lunchInMethod: null,
      eveningOutMethod: null,
      isSynced: true
    },
    {
      workerId: "OVID-W-103",
      workerName: "Yosef Assefa",
      trade: "Steel Fixer",
      team: "T-02",
      date: todayStr,
      morningIn: "07:58",
      lunchOut: "12:05",
      lunchIn: "13:25", // Late lunch return
      eveningOut: null,
      morningInMethod: "Fingerprint",
      lunchOutMethod: "Fingerprint",
      lunchInMethod: "Face Recognition",
      eveningOutMethod: null,
      isSynced: true
    },
    {
      workerId: "OVID-W-104",
      workerName: "Alemayehu Tekle",
      trade: "Concrete Worker",
      team: "T-02",
      date: todayStr,
      morningIn: "07:45",
      lunchOut: "12:01",
      lunchIn: "12:55",
      eveningOut: "16:15", // Early Departure
      morningInMethod: "Face Recognition",
      lunchOutMethod: "Face Recognition",
      lunchInMethod: "Face Recognition",
      eveningOutMethod: "Face Recognition",
      isSynced: true
    },
    {
      workerId: "OVID-W-105",
      workerName: "Mulugeta Alene",
      trade: "Mason",
      team: "T-03",
      date: todayStr,
      morningIn: "07:50",
      lunchOut: "12:00",
      lunchIn: "12:50",
      eveningOut: "19:10", // Overtime Stay
      morningInMethod: "Fingerprint",
      lunchOutMethod: "Fingerprint",
      lunchInMethod: "Fingerprint",
      eveningOutMethod: "Fingerprint",
      isSynced: true
    }
  ]);

  // Initial Exception Logs Data
  const [exceptions, setExceptions] = useState<ExceptionLog[]>([
    {
      id: "EXC-201",
      workerId: "OVID-W-102",
      workerName: "Chala Kebede",
      trade: "Welder",
      type: "LATE_ARRIVAL",
      punchTime: "08:35",
      expectedTime: "08:00 (08:15 with Grace)",
      reason: "Transportation Delay",
      comment: "LRT light rail was stuck near Stadium station for 25 minutes.",
      submittedBy: "Abebe Girma (Time Keeper)",
      submittedAt: todayStr + " 08:40",
      approvalStatus: "Pending"
    },
    {
      id: "EXC-202",
      workerId: "OVID-W-103",
      workerName: "Yosef Assefa",
      trade: "Steel Fixer",
      type: "LATE_LUNCH_RETURN",
      punchTime: "13:25",
      expectedTime: "13:00",
      reason: "Medical / Illness",
      comment: "Had severe stomach pain, went to site clinic for oral rehydration salt.",
      submittedBy: "Yohannes Bekele (Team Leader)",
      submittedAt: todayStr + " 13:30",
      approvalStatus: "Pending"
    },
    {
      id: "EXC-203",
      workerId: "OVID-W-104",
      workerName: "Alemayehu Tekle",
      trade: "Concrete Worker",
      type: "EARLY_DEPARTURE",
      punchTime: "16:15",
      expectedTime: "17:00",
      reason: "Personal Emergency",
      comment: "Left early to attend son's school emergency. Authorized by TL.",
      submittedBy: "Fikru Tolossa (Gang Chief)",
      submittedAt: todayStr + " 16:20",
      approvalStatus: "Pending"
    }
  ]);

  // Notifications State
  const [notifications, setNotifications] = useState<any[]>([
    {
      id: "NOT-901",
      type: "Late Arrival",
      title: "Roster Violation: Late Check-In",
      message: "Chala Kebede (OVID-W-102) logged morning in at 08:35 (Deviation: +35 mins). Exception submitted.",
      time: "08:35 AM",
      role: "Time Keeper",
      status: "Unread"
    },
    {
      id: "NOT-902",
      type: "Lunch Exception",
      title: "Roster Alert: Late Lunch Return",
      message: "Yosef Assefa (OVID-W-103) clocked back at 13:25 (Lunch break exceeded by 25 mins).",
      time: "01:25 PM",
      role: "Team Leader",
      status: "Unread"
    }
  ]);

  // Security and Cryptographic Biometrics Audit Trail Logs
  const [auditTrail, setAuditTrail] = useState<any[]>([
    {
      timestamp: todayStr + " 07:52:11",
      workerName: "Bekele Tesfaye",
      action: "Fingerprint Template Verified",
      verificationMethod: "OS Biometric API (Secure Hello)",
      matchedScore: "99.2%",
      hash: "SHA256:d8a2...3f1c",
      operator: "Abebe Girma (Time Keeper)"
    },
    {
      timestamp: todayStr + " 08:35:05",
      workerName: "Chala Kebede",
      action: "Face Recognition Vector Checked",
      verificationMethod: "OS Biometric API (AI Node Core)",
      matchedScore: "96.5%",
      hash: "SHA256:4a3d...ef89",
      operator: "Abebe Girma (Time Keeper)"
    },
    {
      timestamp: todayStr + " 12:02:44",
      workerName: "Bekele Tesfaye",
      action: "Fingerprint Template Verified",
      verificationMethod: "OS Biometric API (Secure Hello)",
      matchedScore: "98.9%",
      hash: "SHA256:f12e...b901",
      operator: "Abebe Girma (Time Keeper)"
    }
  ]);

  // Sync System Status
  const syncApps = [
    { name: "Team Leader App", desc: "For Yohannes Bekele (Roster Filter)", status: "Synced", lastUpdate: "Real-time stream active" },
    { name: "Gang Chief App", desc: "For Fikru Tolossa (Gang Assignment)", status: "Synced", lastUpdate: "Real-time stream active" },
    { name: "Supervisor App", desc: "For Kassa Hunegn (Quality & Forms)", status: "Synced", lastUpdate: "Real-time stream active" },
    { name: "Project Manager App", desc: "For Eng. Brook (Overall Progress)", status: "Synced", lastUpdate: "Real-time stream active" },
    { name: "Head Office App", desc: "For HO Dashboard (Global Billing)", status: "Synced", lastUpdate: "Real-time stream active" }
  ];

  // Simulator Modal / Flow States
  const [selectedWorkerId, setSelectedWorkerId] = useState("");
  const [punchType, setPunchType] = useState<"morningIn" | "lunchOut" | "lunchIn" | "eveningOut">("morningIn");
  const [punchTime, setPunchTime] = useState("08:00");
  const [biometricMethod, setBiometricMethod] = useState<"Fingerprint" | "Face Recognition">("Fingerprint");
  const [simBiometricStatus, setSimBiometricStatus] = useState<"IDLE" | "SCANNING" | "VERIFIED" | "FAILED">("IDLE");
  const [biometricScore, setBiometricScore] = useState<number | null>(null);
  
  // Exception Modal inputs
  const [showExceptionForm, setShowExceptionForm] = useState(false);
  const [currentExceptionInfo, setCurrentExceptionInfo] = useState<{
    workerId: string;
    workerName: string;
    trade: string;
    type: "LATE_ARRIVAL" | "EARLY_DEPARTURE" | "LATE_LUNCH_RETURN" | "OVERTIME_STAY" | "MISSED_PUNCH";
    time: string;
    expected: string;
  } | null>(null);
  const [exceptionReason, setExceptionReason] = useState<ExceptionReason>("Transportation Delay");
  const [exceptionComments, setExceptionComments] = useState("");

  // Review state
  const [selectedReviewerRole, setSelectedReviewerRole] = useState<"Supervisor" | "Project Manager" | "Head Office">("Supervisor");
  const [activeExceptionLogId, setActiveExceptionLogId] = useState<string | null>(null);
  const [reviewerCommentInput, setReviewerCommentInput] = useState("");

  // Report Generator settings
  const [activeReportTab, setActiveReportTab] = useState<"daily" | "lunch" | "late" | "early" | "exception" | "overtime" | "history">("daily");
  const [selectedWorkerHistoryId, setSelectedWorkerHistoryId] = useState("OVID-W-101");
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState("");

  // Add Worker Form state
  const [syncFormName, setSyncFormName] = useState("");
  const [syncFormTrade, setSyncFormTrade] = useState("Welder");
  const [syncFormTeam, setSyncFormTeam] = useState("T-01");
  const [syncFormFloor, setSyncFormFloor] = useState(4);
  const [syncFormZone, setSyncFormZone] = useState("Zone A");
  const [syncSuccessMsg, setSyncSuccessMsg] = useState("");

  // Dashboard Live Stats (Calculated on the fly from multiPunches and exceptions)
  const stats = useMemo(() => {
    let present = 0;
    let onLunch = 0;
    let returnedLunch = 0;
    let currentlyWorking = 0;
    let checkedOut = 0;
    let lateCount = 0;
    let totalOvertime = 0;

    multiPunches.forEach(p => {
      if (p.morningIn) {
        present++;
        
        // Late calculation
        const [h, m] = p.morningIn.split(":").map(Number);
        if (h > 8 || (h === 8 && m > 15)) {
          lateCount++;
        }
      }

      if (p.lunchOut && !p.lunchIn) {
        onLunch++;
      } else if (p.lunchOut && p.lunchIn) {
        returnedLunch++;
      }

      if (p.morningIn && !p.eveningOut && !onLunch) {
        currentlyWorking++;
      }

      if (p.eveningOut) {
        checkedOut++;
        // Overtime check: standard out is 17:00. Anything after is OT
        const [outH, outM] = p.eveningOut.split(":").map(Number);
        const totalMinutesOut = outH * 60 + outM;
        const totalStandardOutMinutes = 17 * 60; // 5 PM
        if (totalMinutesOut > totalStandardOutMinutes) {
          const otDiff = (totalMinutesOut - totalStandardOutMinutes) / 60;
          totalOvertime += otDiff;
        }
      }
    });

    const pendingExceptions = exceptions.filter(e => e.approvalStatus === "Pending").length;

    return {
      present,
      onLunch,
      returnedLunch,
      currentlyWorking,
      checkedOut,
      lateCount,
      exceptionsCount: exceptions.length,
      pendingExceptions,
      totalOvertime: parseFloat(totalOvertime.toFixed(1))
    };
  }, [multiPunches, exceptions]);

  // Handler to register punch simulator
  const handleSimulateBiometric = () => {
    if (!selectedWorkerId) return;
    const worker = workers.find(w => w.id === selectedWorkerId) || { name: "External Worker", trade: "Carpenter", teamId: "T-01" };
    
    setSimBiometricStatus("SCANNING");
    setBiometricScore(null);

    // Simulate cryptographic processing of biometric templates
    setTimeout(() => {
      const score = Math.floor(92 + Math.random() * 8); // Satisfies safe 85%+ threshold
      setBiometricScore(score);
      setSimBiometricStatus("VERIFIED");

      // After verification, check for Exception trigger conditions
      setTimeout(() => {
        let exceptionType: "LATE_ARRIVAL" | "EARLY_DEPARTURE" | "LATE_LUNCH_RETURN" | "OVERTIME_STAY" | "MISSED_PUNCH" | null = null;
        let expectedTimeStr = "";
        const [pH, pM] = punchTime.split(":").map(Number);
        const totalPunchMin = pH * 60 + pM;

        if (punchType === "morningIn") {
          // Late arrival (> 08:15)
          if (totalPunchMin > 8 * 60 + 15) {
            exceptionType = "LATE_ARRIVAL";
            expectedTimeStr = "08:00 (08:15 grace)";
          }
        } else if (punchType === "lunchIn") {
          // Late return from lunch (Lunch is 12:00 to 13:00. Return after 13:00 is late)
          if (totalPunchMin > 13 * 60) {
            exceptionType = "LATE_LUNCH_RETURN";
            expectedTimeStr = "13:00 (Strict Roster)";
          }
        } else if (punchType === "eveningOut") {
          // Early departure (< 17:00)
          if (totalPunchMin < 17 * 60) {
            exceptionType = "EARLY_DEPARTURE";
            expectedTimeStr = "17:00";
          }
          // Overtime stay (> 18:30)
          else if (totalPunchMin > 18 * 60 + 30) {
            exceptionType = "OVERTIME_STAY";
            expectedTimeStr = "17:00 (Shift End)";
          }
        }

        // Integrity Check: Missed Punch
        const existing = multiPunches.find(p => p.workerId === selectedWorkerId);
        if (punchType === "lunchOut" && existing && !existing.morningIn) {
          exceptionType = "MISSED_PUNCH";
          expectedTimeStr = "Morning Check-In required first";
        } else if (punchType === "lunchIn" && existing && !existing.lunchOut) {
          exceptionType = "MISSED_PUNCH";
          expectedTimeStr = "Lunch Check-Out required first";
        } else if (punchType === "eveningOut" && existing && (!existing.morningIn || (existing.lunchOut && !existing.lunchIn))) {
          exceptionType = "MISSED_PUNCH";
          expectedTimeStr = "Completed preceding punches first";
        }

        if (exceptionType) {
          // Trigger Exception Reporting Prompt
          setCurrentExceptionInfo({
            workerId: selectedWorkerId,
            workerName: worker.name,
            trade: worker.trade || "Carpenter",
            type: exceptionType,
            time: punchTime,
            expected: expectedTimeStr
          });
          setShowExceptionForm(true);
        } else {
          // Save standard Punch directly
          finalizePunch(selectedWorkerId, punchType, punchTime, biometricMethod, null, "");
        }
      }, 1000);
    }, 1500);
  };

  // Finalize punch (with or without exception reason)
  const finalizePunch = (
    workerId: string, 
    type: "morningIn" | "lunchOut" | "lunchIn" | "eveningOut", 
    time: string, 
    method: "Fingerprint" | "Face Recognition",
    exReason: ExceptionReason | null,
    exComment: string
  ) => {
    const worker = workers.find(w => w.id === workerId) || { name: "Manual Sync Worker", trade: "Carpenter", teamId: "T-01" };
    
    // Update Multi-punch logs state
    setMultiPunches(prev => {
      const exists = prev.some(p => p.workerId === workerId);
      if (exists) {
        return prev.map(p => {
          if (p.workerId === workerId) {
            return {
              ...p,
              [type]: time,
              [`${type}Method`]: method
            };
          }
          return p;
        });
      } else {
        return [
          ...prev,
          {
            workerId,
            workerName: worker.name,
            trade: worker.trade || "Carpenter",
            team: worker.teamId || "T-01",
            date: todayStr,
            morningIn: type === "morningIn" ? time : null,
            lunchOut: type === "lunchOut" ? time : null,
            lunchIn: type === "lunchIn" ? time : null,
            eveningOut: type === "eveningOut" ? time : null,
            morningInMethod: type === "morningIn" ? method : null,
            lunchOutMethod: type === "lunchOut" ? method : null,
            lunchInMethod: type === "lunchIn" ? method : null,
            eveningOutMethod: type === "eveningOut" ? method : null,
            isSynced: true
          }
        ];
      }
    });

    // Create a matching AttendanceRecord for the central App component state (if morningIn or eveningOut)
    if (type === "morningIn" || type === "eveningOut") {
      const centralRec: AttendanceRecord = {
        id: `ATT-SYN-${Date.now()}`,
        workerId: workerId,
        workerName: worker.name,
        department: worker.department || "Formwork",
        trade: worker.trade || "Carpenter",
        company: worker.company || "OVID Real Estate",
        building: worker.building || "Tower A",
        floor: worker.floor || 4,
        zone: worker.zone || "Zone A",
        date: todayStr,
        checkIn: type === "morningIn" ? `${time}:00` : "08:00:00",
        checkOut: type === "eveningOut" ? `${time}:00` : null,
        method: method === "Fingerprint" ? AttendanceMethod.FINGERPRINT : AttendanceMethod.FACE_RECOGNITION,
        workingHours: type === "eveningOut" ? 8.0 : 0,
        overtime: type === "eveningOut" ? Math.max(0, parseFloat(( (parseInt(time.split(":")[0]) * 60 + parseInt(time.split(":")[1]) - 17 * 60 ) / 60).toFixed(1))) : 0,
        status: type === "morningIn" && (parseInt(time.split(":")[0]) > 8 || (parseInt(time.split(":")[0]) === 8 && parseInt(time.split(":")[1]) > 15)) ? "Late" : "Present"
      };
      onAddAttendance(centralRec);
    }

    // Save exception log if there is one
    let exId = "";
    if (exReason) {
      exId = `EXC-${Date.now().toString().slice(-3)}`;
      const newEx: ExceptionLog = {
        id: exId,
        workerId,
        workerName: worker.name,
        trade: worker.trade || "Carpenter",
        type: currentExceptionInfo?.type || "LATE_ARRIVAL",
        punchTime: time,
        expectedTime: currentExceptionInfo?.expected || "08:00",
        reason: exReason,
        comment: exComment,
        submittedBy: `${currentUserRole === UserRole.TIME_KEEPER ? "Abebe Girma" : "Yohannes Bekele"} (${currentUserRole})`,
        submittedAt: todayStr + " " + new Date().toTimeString().slice(0, 5),
        approvalStatus: "Pending"
      };
      setExceptions(prev => [newEx, ...prev]);

      // Add dynamic real-time broadcast notification
      const newNotif = {
        id: `NOT-${Date.now()}`,
        type: "Exception Submitted",
        title: "Attendance Exception Received",
        message: `Exception [${exReason}] submitted for ${worker.name} (${workerId}) regarding ${currentExceptionInfo?.type}.`,
        time: new Date().toTimeString().slice(0, 5),
        role: currentUserRole,
        status: "Unread"
      };
      setNotifications(prev => [newNotif, ...prev]);
    }

    // Secure cryptographic hash audit log trail entry
    const hexChars = "0123456789abcdef";
    let mockHash = "SHA256:";
    for (let i = 0; i < 8; i++) mockHash += hexChars[Math.floor(Math.random() * 16)];
    mockHash += "...";
    for (let i = 0; i < 4; i++) mockHash += hexChars[Math.floor(Math.random() * 16)];

    const newAudit = {
      timestamp: todayStr + " " + new Date().toTimeString().slice(0, 8),
      workerName: worker.name,
      action: `${method} Template Verified`,
      verificationMethod: `OS Biometric API (${method === "Fingerprint" ? "Secure Hello" : "AI Node Face Recognition"})`,
      matchedScore: `${(95 + Math.random() * 5).toFixed(1)}%`,
      hash: mockHash,
      operator: `${currentUserRole === UserRole.TIME_KEEPER ? "Abebe Girma" : "Yohannes Bekele"} (${currentUserRole})`
    };
    setAuditTrail(prev => [newAudit, ...prev]);

    // Cleanup simulation modal states
    setSimBiometricStatus("IDLE");
    setSelectedWorkerId("");
    setShowExceptionForm(false);
    setCurrentExceptionInfo(null);
    setExceptionComments("");
  };

  // Submit Exception Form
  const handleSubmitExceptionForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentExceptionInfo) return;
    finalizePunch(
      currentExceptionInfo.workerId,
      punchType,
      currentExceptionInfo.time,
      biometricMethod,
      exceptionReason,
      exceptionComments
    );
  };

  // Handle Approvals workflow
  const handleReviewDecision = (id: string, decision: "Approved" | "Rejected" | "Info Requested") => {
    setExceptions(prev => prev.map(ex => {
      if (ex.id === id) {
        return {
          ...ex,
          approvalStatus: decision,
          reviewedBy: `${selectedReviewerRole} Reviewer`,
          reviewerComments: reviewerCommentInput,
          reviewedAt: todayStr + " " + new Date().toTimeString().slice(0, 5)
        };
      }
      return ex;
    }));

    const targetEx = exceptions.find(ex => ex.id === id);
    const workerName = targetEx ? targetEx.workerName : "Worker";

    // Trigger Notification
    const newNotif = {
      id: `NOT-${Date.now()}`,
      type: `Exception ${decision}`,
      title: `Exception Audit Decision`,
      message: `Supervisor/PM finalized exception for ${workerName} as [${decision}]. Review: "${reviewerCommentInput}"`,
      time: new Date().toTimeString().slice(0, 5),
      role: selectedReviewerRole,
      status: "Unread"
    };
    setNotifications(prev => [newNotif, ...prev]);

    setReviewerCommentInput("");
    setActiveExceptionLogId(null);
  };

  // Simulated Report Exporter
  const handleExport = (reportName: string) => {
    setIsExporting(true);
    setExportMessage(isAmharic ? "ማውጫውን በማዘጋጀት ላይ ነው..." : "Compiling metrics and preparing encrypted file...");
    setTimeout(() => {
      setIsExporting(false);
      setExportMessage(isAmharic 
        ? `ሪፖርቱ በተሳካ ሁኔታ ተዘጋጅቷል! የወረደው ፋይል ስም፡ OVID_${reportName}_${todayStr}.xlsx` 
        : `Success! Synchronized report "${reportName}" exported to Head Office and downloaded locally as OVID_${reportName}_${todayStr}.xlsx`);
      setTimeout(() => setExportMessage(""), 4000);
    }, 2000);
  };

  // Handle employee registration synchronization
  const handleSyncEmployeeRegistration = (e: React.FormEvent) => {
    e.preventDefault();
    if (!syncFormName.trim()) return;

    const randomNum = Math.floor(100 + Math.random() * 900);
    const newId = `OVID-W-${randomNum}`;

    setSyncSuccessMsg(isAmharic ? "የሰራተኛ ፕሮፋይል በመገናኘት ላይ ነው..." : "Broadcasting employee registration to 5 ERP Node channels...");
    
    setTimeout(() => {
      // Add worker to localized state immediately
      const mockNewPunch: MultiPunchDay = {
        workerId: newId,
        workerName: syncFormName,
        trade: syncFormTrade,
        team: syncFormTeam,
        date: todayStr,
        morningIn: null,
        lunchOut: null,
        lunchIn: null,
        eveningOut: null,
        morningInMethod: null,
        lunchOutMethod: null,
        lunchInMethod: null,
        eveningOutMethod: null,
        isSynced: true
      };
      setMultiPunches(prev => [mockNewPunch, ...prev]);

      setSyncSuccessMsg(isAmharic 
        ? `ሰራተኛ ${syncFormName} (${newId}) በተሳካ ሁኔታ ተመዝግቦ ከሁሉም አፕሊኬሽኖች ጋር ተመሳስሏል!` 
        : `Roster Broadcaster Success: ${syncFormName} (${newId}) synchronized with Team Leader, Gang Chief, Supervisor, Project Manager, and Head Office apps instantly!`);
      
      // Reset Form
      setSyncFormName("");
      setTimeout(() => setSyncSuccessMsg(""), 4000);
    }, 2000);
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER HERO BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-2xl -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-slate-500/10 rounded-full blur-2xl -ml-20 -mb-20"></div>
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="bg-emerald-500 text-slate-950 font-bold text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center space-x-1">
                <ShieldCheck size={12} className="inline mr-1 animate-pulse" />
                <span>Secure OS Biometrics</span>
              </span>
              <span className="bg-slate-700/60 text-slate-200 font-mono text-[10px] px-2 py-0.5 rounded-lg border border-slate-600">
                Ethio-Data Privacy Guarded
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black tracking-tight flex items-center gap-2">
              <span>{isAmharic ? "ስማርት መገኘት እና የልዩነት መቆጣጠሪያ" : "Smart Attendance & Exception System"}</span>
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl">
              {isAmharic 
                ? "ባዮሜትሪክ የጣት አሻራ እና የፊት ገጽታ መለያዎችን ተጠቅሞ የዕለት መገኘት፣ የምሳ ሰዓት ቆይታ፣ እና የፈቃድ ልዩነቶች አያያዝን የሚያስተናግድ"
                : "Real-time 4-point biometric attendance logging (Morning In, Lunch Out, Lunch In, Evening Out) with secure OS-hardware verification, automatic synchronization, and exceptions workflow."}
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-800/80 p-3 rounded-2xl border border-slate-700">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400 font-bold text-sm">
              <Fingerprint size={20} />
            </div>
            <div>
              <p className="text-[10px] uppercase text-slate-400 font-bold">Biometric Engine</p>
              <p className="text-xs font-mono font-bold text-emerald-400">STATUS: ENCRYPTED</p>
            </div>
          </div>
        </div>

        {/* METRICS DASHBOARD TILES */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-6 pt-6 border-t border-slate-700/60">
          <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/40">
            <span className="text-[10px] uppercase text-slate-400 font-bold block">{isAmharic ? "የመጡ ሰራተኞች" : "Present Workers"}</span>
            <span className="text-xl font-black text-white mt-1 block">{stats.present} / {workers.length}</span>
          </div>
          <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/40">
            <span className="text-[10px] uppercase text-slate-400 font-bold block">{isAmharic ? "ምሳ ላይ ያሉ" : "On Lunch Break"}</span>
            <span className="text-xl font-black text-amber-400 mt-1 block">{stats.onLunch}</span>
          </div>
          <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/40">
            <span className="text-[10px] uppercase text-slate-400 font-bold block">{isAmharic ? "ከምሳ የተመለሱ" : "Returned Lunch"}</span>
            <span className="text-xl font-black text-emerald-400 mt-1 block">{stats.returnedLunch}</span>
          </div>
          <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/40">
            <span className="text-[10px] uppercase text-slate-400 font-bold block">{isAmharic ? "ያልተፈቱ ልዩነቶች" : "Pending Approvals"}</span>
            <span className="text-xl font-black text-red-400 mt-1 block">{stats.pendingExceptions}</span>
          </div>
          <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/40 col-span-2 md:col-span-1">
            <span className="text-[10px] uppercase text-slate-400 font-bold block">{isAmharic ? "አጠቃላይ የትርፍ ሰዓት" : "Total Overtime"}</span>
            <span className="text-xl font-black text-sky-400 mt-1 block">{stats.totalOvertime} hrs</span>
          </div>
        </div>
      </div>

      {/* HUB SUB-TABS NAVIGATION */}
      <div className="flex overflow-x-auto space-x-1 border-b border-slate-200 pb-1 no-print">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center space-x-1.5 shrink-0 cursor-pointer ${
            activeTab === "dashboard" ? "bg-slate-950 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Layers size={14} />
          <span>{isAmharic ? "ላይቭ ሰሌዳ" : "Live Dashboard"}</span>
        </button>

        <button
          onClick={() => setActiveTab("simulator")}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center space-x-1.5 shrink-0 cursor-pointer ${
            activeTab === "simulator" ? "bg-slate-950 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Fingerprint size={14} className="text-red-500" />
          <span>{isAmharic ? "መለያ ማስመሰያ" : "OS Punch Simulator"}</span>
        </button>

        <button
          onClick={() => setActiveTab("approvals")}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center space-x-1.5 shrink-0 cursor-pointer relative ${
            activeTab === "approvals" ? "bg-slate-950 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <ShieldCheck size={14} className="text-emerald-500" />
          <span>{isAmharic ? "የልዩነቶች ማጽደቂያ ዴስክ" : "Exceptions Workflow Desk"}</span>
          {stats.pendingExceptions > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center animate-bounce">
              {stats.pendingExceptions}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("sync")}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center space-x-1.5 shrink-0 cursor-pointer ${
            activeTab === "sync" ? "bg-slate-950 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <RefreshCw size={14} className="text-sky-500 animate-spin" style={{ animationDuration: '6s' }} />
          <span>{isAmharic ? "አውቶማቲክ ማመሳሰያ" : "ERP Sync Hub"}</span>
        </button>

        <button
          onClick={() => setActiveTab("reports")}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center space-x-1.5 shrink-0 cursor-pointer ${
            activeTab === "reports" ? "bg-slate-950 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <FileText size={14} />
          <span>{isAmharic ? "ሪፖርቶችና ማውጫ" : "Report Desk"}</span>
        </button>

        <button
          onClick={() => setActiveTab("security")}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center space-x-1.5 shrink-0 cursor-pointer ${
            activeTab === "security" ? "bg-slate-950 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Lock size={14} className="text-amber-500" />
          <span>{isAmharic ? "የደህንነት ኦዲት መዝገብ" : "Security & Biometric Audit"}</span>
        </button>
      </div>

      {/* --- TAB 1: LIVE DASHBOARD --- */}
      {activeTab === "dashboard" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main 4-Point Attendance Punch Matrix Table */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-6 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-900">{isAmharic ? "የዛሬው 4-ነጥብ ባዮሜትሪክ መገኘት መዝገብ" : "Today's 4-Point Biometric Matrix Registry"}</h3>
                <p className="text-[11px] text-slate-500">Includes secure, verified morning start, lunch break departure, return check, and evening sign-off.</p>
              </div>
              <span className="bg-slate-100 text-slate-700 px-3 py-1 text-[10px] font-mono font-bold rounded-lg border border-slate-200">
                DATE: {todayStr}
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                    <th className="p-3">Worker / Specialty</th>
                    <th className="p-3 text-center">1. Morning In</th>
                    <th className="p-3 text-center">2. Lunch Out</th>
                    <th className="p-3 text-center">3. Lunch In</th>
                    <th className="p-3 text-center">4. Evening Out</th>
                    <th className="p-3 text-right">Integrity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {multiPunches.map(p => {
                    // Calculate quick labels or violations for display
                    const isMorningLate = p.morningIn && (parseInt(p.morningIn.split(":")[0]) > 8 || (parseInt(p.morningIn.split(":")[0]) === 8 && parseInt(p.morningIn.split(":")[1]) > 15));
                    const isLunchLate = p.lunchIn && (parseInt(p.lunchIn.split(":")[0]) > 13);
                    const isEarlyOut = p.eveningOut && (parseInt(p.eveningOut.split(":")[0]) < 17);

                    return (
                      <tr key={p.workerId} className="hover:bg-slate-50/50 transition-all">
                        <td className="p-3">
                          <div className="font-bold text-slate-900">{p.workerName}</div>
                          <div className="text-[10px] text-slate-500 font-mono font-medium">{p.workerId} • {p.trade}</div>
                        </td>
                        
                        {/* MORNING CHECK IN */}
                        <td className="p-3 text-center">
                          {p.morningIn ? (
                            <div className="space-y-1">
                              <span className={`px-2 py-1 font-mono rounded text-[11px] font-bold ${isMorningLate ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                                {p.morningIn}
                              </span>
                              <div className="text-[9px] text-slate-400 font-mono flex items-center justify-center gap-0.5 mt-1">
                                <Fingerprint size={10} /> {p.morningInMethod}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px] italic font-medium">Not Clocked</span>
                          )}
                        </td>

                        {/* LUNCH CHECK OUT */}
                        <td className="p-3 text-center">
                          {p.lunchOut ? (
                            <div className="space-y-1">
                              <span className="px-2 py-1 font-mono rounded text-[11px] bg-slate-100 text-slate-700 border border-slate-200 font-bold">
                                {p.lunchOut}
                              </span>
                              <div className="text-[9px] text-slate-400 font-mono flex items-center justify-center gap-0.5 mt-1">
                                <Fingerprint size={10} /> {p.lunchOutMethod}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px] italic font-medium">Not Clocked</span>
                          )}
                        </td>

                        {/* LUNCH CHECK IN */}
                        <td className="p-3 text-center">
                          {p.lunchIn ? (
                            <div className="space-y-1">
                              <span className={`px-2 py-1 font-mono rounded text-[11px] font-bold ${isLunchLate ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                                {p.lunchIn}
                              </span>
                              <div className="text-[9px] text-slate-400 font-mono flex items-center justify-center gap-0.5 mt-1">
                                <Fingerprint size={10} /> {p.lunchInMethod}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px] italic font-medium">Not Clocked</span>
                          )}
                        </td>

                        {/* EVENING CHECK OUT */}
                        <td className="p-3 text-center">
                          {p.eveningOut ? (
                            <div className="space-y-1">
                              <span className={`px-2 py-1 font-mono rounded text-[11px] font-bold ${isEarlyOut ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                                {p.eveningOut}
                              </span>
                              <div className="text-[9px] text-slate-400 font-mono flex items-center justify-center gap-0.5 mt-1">
                                <Fingerprint size={10} /> {p.eveningOutMethod}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px] italic font-medium">Not Clocked</span>
                          )}
                        </td>

                        {/* INTEGRITY STATUS BAR */}
                        <td className="p-3 text-right">
                          {(() => {
                            const completedCount = [p.morningIn, p.lunchOut, p.lunchIn, p.eveningOut].filter(Boolean).length;
                            let color = "text-red-500 bg-red-50 border-red-200";
                            if (completedCount === 4) color = "text-emerald-700 bg-emerald-50 border-emerald-200 font-bold";
                            else if (completedCount >= 2) color = "text-amber-700 bg-amber-50 border-amber-200";

                            return (
                              <span className={`px-2 py-1 rounded border text-[10px] ${color}`}>
                                {completedCount}/4 Completed
                              </span>
                            );
                          })()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* QUICK LEGEND EXPLAINER */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-2 text-[10px] text-slate-500">
              <div className="flex items-center space-x-1.5">
                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></div>
                <span>Morning Check-In shift limit: 08:00 (Grace to 08:15)</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <div className="w-2.5 h-2.5 bg-amber-500 rounded-full"></div>
                <span>Lunch Break duration: 12:00 to 13:00 (Exceeding triggers alert)</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <div className="w-2.5 h-2.5 bg-red-500 rounded-full"></div>
                <span>Evening check-out: 17:00 (Early clock-outs flag warnings)</span>
              </div>
            </div>
          </div>

          {/* Sidebar Notifications Feed & Policy Panel */}
          <div className="space-y-6">
            
            {/* Live Real-time Broadcast Alerts Panel */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Bell className="text-red-500 animate-bounce" size={16} />
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">{isAmharic ? "ላይቭ የደወል ማስታወቂያዎች" : "Real-time Broadcast Alerts"}</h3>
                </div>
                <span className="bg-red-500 text-white font-black text-[9px] px-2 py-0.5 rounded-full">
                  {notifications.filter(n => n.status === "Unread").length} NEW
                </span>
              </div>

              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {notifications.map(notif => (
                  <div key={notif.id} className="p-3 bg-slate-50 border border-slate-150 rounded-xl space-y-1 relative group hover:border-slate-300 transition-all text-xs">
                    <div className="flex justify-between items-start">
                      <span className="font-extrabold text-slate-800 text-[11px]">{notif.title}</span>
                      <span className="text-[9px] font-mono font-medium text-slate-400">{notif.time}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 font-medium leading-relaxed">{notif.message}</p>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 mt-1">
                      <span className="text-[9px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-mono font-bold">
                        Role: {notif.role}
                      </span>
                      <button 
                        onClick={() => {
                          setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, status: "Read" } : n));
                        }}
                        className="text-[9px] text-emerald-600 font-bold hover:underline"
                      >
                        {notif.status === "Unread" ? "Mark read" : "✓ Read"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Enterprise Clocking Policies Explainer */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-3">
              <h4 className="text-[11px] font-black uppercase text-slate-700 tracking-wider flex items-center space-x-1">
                <ShieldCheck size={14} className="text-emerald-500" />
                <span>OVID Construction Compliance Rules</span>
              </h4>
              <ul className="text-[11px] text-slate-600 space-y-2 leading-relaxed">
                <li className="flex items-start space-x-1.5">
                  <span className="text-emerald-500 shrink-0 font-bold">✔</span>
                  <span><strong>Biometric Enrollment Requirement</strong>: No attendance allowed until templates are registered in OS Hardware vault.</span>
                </li>
                <li className="flex items-start space-x-1.5">
                  <span className="text-emerald-500 shrink-0 font-bold">✔</span>
                  <span><strong>Mandatory Double Lunch Punch</strong>: Out at 12:00, in at 13:00. Prevents safety leaks.</span>
                </li>
                <li className="flex items-start space-x-1.5">
                  <span className="text-emerald-500 shrink-0 font-bold">✔</span>
                  <span><strong>Exception Blockage</strong>: Leaving before 17:00 or arriving past 08:15 freezes timesheets until supervisor validation.</span>
                </li>
              </ul>
            </div>

          </div>
        </div>
      )}

      {/* --- TAB 2: OS BIOMETRIC PUNCH SIMULATOR --- */}
      {activeTab === "simulator" && (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-6 shadow-sm">
          
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-sm font-black text-slate-900">{isAmharic ? "የስራ ቦታ ባዮሜትሪክ መሣሪያ ማስመሰያ" : "Secure Workplace Biometric Terminal (HW Simulator)"}</h3>
            <p className="text-xs text-slate-500 mt-1">
              Select an employee and clocking time. The terminal emulates direct OS-level biometric template validation (SHA256 matching indices), instantly broadcasting exceptions and synchronizing with all administrative app branches.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Punch Input Panel */}
            <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
              <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider">Terminal Parameters</h4>
              
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">1. Select Employee to Clock</label>
                  <select
                    value={selectedWorkerId}
                    onChange={(e) => setSelectedWorkerId(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 outline-none font-medium"
                  >
                    <option value="">-- Choose registered worker --</option>
                    {workers.map(w => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.id}) - {w.trade} [Status: {w.status}]
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">2. Attendance Event</label>
                    <select
                      value={punchType}
                      onChange={(e) => {
                        const type = e.target.value as any;
                        setPunchType(type);
                        // Auto-adjust mock times for easier simulation
                        if (type === "morningIn") setPunchTime("08:00");
                        else if (type === "lunchOut") setPunchTime("12:00");
                        else if (type === "lunchIn") setPunchTime("13:00");
                        else if (type === "eveningOut") setPunchTime("17:00");
                      }}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 outline-none font-medium"
                    >
                      <option value="morningIn">1. Morning Clock-In (IN)</option>
                      <option value="lunchOut">2. Lunch Check-Out (OUT)</option>
                      <option value="lunchIn">3. Lunch Check-In (IN)</option>
                      <option value="eveningOut">4. Evening Clock-Out (OUT)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">3. Input Actual Time (HH:MM)</label>
                    <input
                      type="text"
                      value={punchTime}
                      onChange={(e) => setPunchTime(e.target.value)}
                      placeholder="e.g. 08:05"
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 outline-none text-center font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Preset Simulation Times:</span>
                  <div className="flex flex-wrap gap-2">
                    <button 
                      type="button" 
                      onClick={() => setPunchTime(punchType === "morningIn" ? "07:55" : punchType === "lunchIn" ? "12:55" : punchType === "lunchOut" ? "12:00" : "17:05")} 
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded text-[10px] font-bold text-slate-700 cursor-pointer"
                    >
                      On-Time (Present)
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setPunchTime(punchType === "morningIn" ? "08:35" : punchType === "lunchIn" ? "13:25" : punchType === "lunchOut" ? "12:45" : "16:20")} 
                      className="px-2.5 py-1 bg-red-50 hover:bg-red-100 rounded text-[10px] font-bold text-red-700 cursor-pointer"
                    >
                      Deviation Alert (Late/Early)
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setPunchTime("19:30")} 
                      className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 rounded text-[10px] font-bold text-purple-700 cursor-pointer"
                    >
                      Overtime Stay (19:30)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">4. Secure Verification Tool</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setBiometricMethod("Fingerprint")}
                      className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                        biometricMethod === "Fingerprint" 
                          ? "bg-slate-900 text-white border-slate-900 shadow-sm" 
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <Fingerprint size={20} />
                      <span className="text-[10px] font-bold">OS Fingerprint</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setBiometricMethod("Face Recognition")}
                      className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                        biometricMethod === "Face Recognition" 
                          ? "bg-slate-900 text-white border-slate-900 shadow-sm" 
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <Camera size={20} />
                      <span className="text-[10px] font-bold">OS Face ID</span>
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSimulateBiometric}
                  disabled={!selectedWorkerId || simBiometricStatus === "SCANNING"}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-3 rounded-xl flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-md disabled:bg-slate-300 disabled:cursor-not-allowed text-xs"
                >
                  <ShieldCheck size={16} />
                  <span>INITIALIZE BIOMETRIC PUNCH</span>
                </button>
              </div>
            </div>

            {/* Simulated Live Scan Screen Overlay */}
            <div className="flex flex-col justify-center items-center bg-slate-900 text-white rounded-2xl p-6 relative overflow-hidden border border-slate-800 shadow-inner">
              <div className="absolute top-2 left-3 text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                SYS_BIOMETRIC_VAULT_FEED
              </div>

              {simBiometricStatus === "IDLE" && (
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 animate-pulse mx-auto">
                    <Fingerprint className="text-slate-400" size={32} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-300">Terminal Standby</p>
                    <p className="text-[10px] text-slate-500">Awaiting personnel registration card or select worker.</p>
                  </div>
                </div>
              )}

              {simBiometricStatus === "SCANNING" && (
                <div className="text-center space-y-4 w-full">
                  <div className="relative mx-auto w-24 h-24">
                    <div className="absolute inset-0 rounded-full border-4 border-emerald-500/30 animate-ping"></div>
                    <div className="absolute inset-2 rounded-full border-2 border-emerald-500 border-dashed animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      {biometricMethod === "Fingerprint" ? (
                        <Fingerprint className="text-emerald-400 animate-pulse" size={40} />
                      ) : (
                        <Camera className="text-emerald-400 animate-pulse" size={40} />
                      )}
                    </div>
                  </div>
                  <div className="space-y-1 font-mono">
                    <p className="text-xs font-bold text-emerald-400 animate-pulse">VERIFYING HARDWARE TEMPLATE...</p>
                    <p className="text-[9px] text-slate-400">Comparing cryptographic matching indices against secure OS database...</p>
                  </div>
                </div>
              )}

              {simBiometricStatus === "VERIFIED" && (
                <div className="text-center space-y-4 w-full">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500 mx-auto">
                    <CheckCircle2 className="text-emerald-400" size={36} />
                  </div>
                  <div className="space-y-2 font-mono text-xs">
                    <p className="text-sm font-black text-emerald-400">ACCESS GRANTED</p>
                    <p className="text-[10px] text-slate-300">Match score: <span className="font-bold text-white">{biometricScore}%</span> (Min: 85%)</p>
                    <div className="bg-slate-800 p-2.5 rounded-xl text-left border border-slate-700 max-w-xs mx-auto space-y-1 text-[9px]">
                      <span className="text-slate-400 block uppercase font-bold text-[8px]">Device Audit Stamp:</span>
                      <p className="text-white"><strong className="text-slate-400">User:</strong> {workers.find(w => w.id === selectedWorkerId)?.name}</p>
                      <p className="text-white"><strong className="text-slate-400">Time:</strong> {punchTime} (Today)</p>
                      <p className="text-emerald-400 font-bold"><strong className="text-slate-400">Sign:</strong> SHA256-Matched</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* --- SUB-MODAL / DROPDOWN: ATTENDANCE EXCEPTION SUBMISSION FORM --- */}
          {showExceptionForm && currentExceptionInfo && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 w-full max-w-md shadow-xl space-y-4 relative">
                
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-2 text-red-600">
                    <AlertCircle size={20} />
                    <h4 className="font-black text-sm uppercase tracking-wide">Exception Report Required</h4>
                  </div>
                  <button 
                    onClick={() => {
                      setShowExceptionForm(false);
                      setSimBiometricStatus("IDLE");
                    }}
                    className="text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <XCircle size={18} />
                  </button>
                </div>

                <div className="bg-red-50/50 p-4 rounded-xl border border-red-100 text-xs text-slate-700 space-y-1 font-mono">
                  <p><strong>Worker:</strong> {currentExceptionInfo.workerName} ({currentExceptionInfo.workerId})</p>
                  <p><strong>Trade:</strong> {currentExceptionInfo.trade}</p>
                  <p><strong>Violation:</strong> <span className="text-red-600 font-bold">{currentExceptionInfo.type.replace("_", " ")}</span></p>
                  <p><strong>Punch Value:</strong> <span className="text-red-600 font-bold">{currentExceptionInfo.time}</span> (Target: {currentExceptionInfo.expected})</p>
                </div>

                <form onSubmit={handleSubmitExceptionForm} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Selectable Reason *</label>
                    <select
                      value={exceptionReason}
                      onChange={(e) => setExceptionReason(e.target.value as ExceptionReason)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 outline-none font-medium text-xs"
                      required
                    >
                      <option value="Transportation Delay">Transportation Delay</option>
                      <option value="Heavy Rain">Heavy Rain</option>
                      <option value="Medical / Illness">Medical / Illness</option>
                      <option value="Official Company Assignment">Official Company Assignment</option>
                      <option value="Equipment Breakdown">Equipment Breakdown</option>
                      <option value="Safety Incident">Safety Incident</option>
                      <option value="Personal Emergency">Personal Emergency</option>
                      <option value="Traffic Congestion">Traffic Congestion</option>
                      <option value="Other">Other (Requires Custom Comments)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Supporting Notes & Comments *</label>
                    <textarea
                      value={exceptionComments}
                      onChange={(e) => setExceptionComments(e.target.value)}
                      placeholder="Add detailed explanation of delay/exception for reviewer..."
                      rows={3}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 outline-none font-medium text-xs"
                      required={exceptionReason === "Other"}
                    />
                    {exceptionReason === "Other" && (
                      <p className="text-[9px] text-red-500 mt-1 font-bold">Comments are strictly required for 'Other' reason.</p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowExceptionForm(false);
                        setSimBiometricStatus("IDLE");
                      }}
                      className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all cursor-pointer text-center text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black transition-all cursor-pointer text-center text-xs shadow"
                    >
                      Finalize & Broadcast
                    </button>
                  </div>
                </form>

              </div>
            </div>
          )}

        </div>
      )}

      {/* --- TAB 3: EXCEPTIONS REVIEW & APPROVAL WORKFLOW --- */}
      {activeTab === "approvals" && (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-6 shadow-sm">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-sm font-black text-slate-900">{isAmharic ? "ልዩነቶች መገምገሚያ እና ማጽደቂያ" : "ERP Exceptions Governance Desk"}</h3>
              <p className="text-xs text-slate-500">Authorize, reject, or request information on flagged biometric exceptions. Decision updates timesheets and payroll logs in real-time.</p>
            </div>
            
            {/* Reviewer Role Switcher */}
            <div className="flex items-center space-x-2 text-xs bg-slate-50 p-1.5 rounded-xl border border-slate-200 shrink-0">
              <span className="font-bold text-slate-500 px-2 shrink-0">Active Reviewer Role:</span>
              <select
                value={selectedReviewerRole}
                onChange={(e) => setSelectedReviewerRole(e.target.value as any)}
                className="bg-white border border-slate-200 rounded-lg py-1 px-2 outline-none font-bold text-slate-800"
              >
                <option value="Supervisor">Supervisor (Kassa Hunegn)</option>
                <option value="Project Manager">Project Manager (Eng. Brook)</option>
                <option value="Head Office">Head Office (HO Admin)</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                  <th className="p-3">ID</th>
                  <th className="p-3">Personnel</th>
                  <th className="p-3">Violation Details</th>
                  <th className="p-3">Reason / Comments</th>
                  <th className="p-3">Submitted By</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Review Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {exceptions.map(ex => {
                  let statusColor = "bg-amber-50 text-amber-700 border-amber-200";
                  if (ex.approvalStatus === "Approved") statusColor = "bg-emerald-50 text-emerald-700 border-emerald-200";
                  else if (ex.approvalStatus === "Rejected") statusColor = "bg-red-50 text-red-700 border-red-200";
                  else if (ex.approvalStatus === "Info Requested") statusColor = "bg-sky-50 text-sky-700 border-sky-200";

                  return (
                    <tr key={ex.id} className="hover:bg-slate-50/50 transition-all font-sans">
                      <td className="p-3 font-mono font-bold text-slate-500">{ex.id}</td>
                      <td className="p-3">
                        <div className="font-extrabold text-slate-800">{ex.workerName}</div>
                        <div className="text-[10px] text-slate-500 font-mono font-medium">{ex.workerId} • {ex.trade}</div>
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-red-600 text-[11px]">{ex.type.replace("_", " ")}</div>
                        <div className="text-[10px] text-slate-500">Time: <span className="font-mono font-bold text-slate-800">{ex.punchTime}</span> (vs {ex.expectedTime})</div>
                      </td>
                      <td className="p-3">
                        <div className="font-extrabold text-slate-800 text-[11px]">{ex.reason}</div>
                        <div className="text-[10px] text-slate-500 italic max-w-xs">{ex.comment}</div>
                        {ex.reviewerComments && (
                          <div className="mt-1 bg-slate-100 p-2 rounded-lg text-[9px] text-slate-600">
                            <strong>{ex.reviewedBy || "Reviewer"} Comment:</strong> "{ex.reviewerComments}" ({ex.reviewedAt})
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="font-medium text-slate-700 text-[11px]">{ex.submittedBy}</div>
                        <div className="text-[9px] text-slate-400 font-mono font-medium">{ex.submittedAt}</div>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded border text-[10px] font-bold ${statusColor}`}>
                          {ex.approvalStatus}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {ex.approvalStatus === "Pending" ? (
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setActiveExceptionLogId(ex.id);
                                handleReviewDecision(ex.id, "Approved");
                              }}
                              className="px-2 py-1 bg-emerald-600 text-white rounded font-bold hover:bg-emerald-700 text-[10px] cursor-pointer"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                setActiveExceptionLogId(ex.id);
                                handleReviewDecision(ex.id, "Rejected");
                              }}
                              className="px-2 py-1 bg-red-600 text-white rounded font-bold hover:bg-red-700 text-[10px] cursor-pointer"
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => {
                                setActiveExceptionLogId(ex.id);
                                const comment = prompt("Enter info request query:") || "";
                                if (comment) {
                                  setExceptions(prev => prev.map(e => e.id === ex.id ? { ...e, approvalStatus: "Info Requested", reviewerComments: comment, reviewedBy: `${selectedReviewerRole} Reviewer`, reviewedAt: todayStr + " " + new Date().toTimeString().slice(0, 5) } : e));
                                }
                              }}
                              className="px-2 py-1 bg-sky-600 text-white rounded font-bold hover:bg-sky-700 text-[10px] cursor-pointer"
                            >
                              Info
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-mono font-bold">Closed Decision</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* --- TAB 4: ENTERPRISE AUTOMATIC SYNCHRONIZATION HUB --- */}
      {activeTab === "sync" && (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-6 shadow-sm">
          
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-sm font-black text-slate-900">{isAmharic ? "ኢንተርፕራይዝ የሰራተኞች ምዝገባ ማመሳሰያ" : "Enterprise Automatic Synchronization Engine"}</h3>
            <p className="text-xs text-slate-500 mt-1">
              When a new employee profile is registered, the OVID sync core automatically propagates the biometric status and trade specialization matrix across all respective on-site supervisor and head office platforms. No manual sharing required.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* New Sync Registration Form */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 lg:col-span-1 space-y-4">
              <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider">Register Sync Worker</h4>
              
              {syncSuccessMsg && (
                <div className="bg-emerald-50 text-emerald-800 p-3 rounded-xl border border-emerald-200 text-[11px] font-bold flex items-center space-x-1.5 shadow-sm animate-pulse">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <span>{syncSuccessMsg}</span>
                </div>
              )}

              <form onSubmit={handleSyncEmployeeRegistration} className="space-y-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={syncFormName}
                    onChange={(e) => setSyncFormName(e.target.value)}
                    placeholder="Enter employee's official full name..."
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 outline-none font-medium text-xs"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Specialty Trade</label>
                    <select
                      value={syncFormTrade}
                      onChange={(e) => setSyncFormTrade(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 outline-none text-xs"
                    >
                      <option value="Welder">Welder</option>
                      <option value="Carpenter">Carpenter</option>
                      <option value="Steel Fixer">Steel Fixer</option>
                      <option value="Concrete Worker">Concrete Worker</option>
                      <option value="Mason">Mason</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Assigned Team</label>
                    <select
                      value={syncFormTeam}
                      onChange={(e) => setSyncFormTeam(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 outline-none text-xs"
                    >
                      <option value="T-01">T-01 (Formwork East)</option>
                      <option value="T-02">T-02 (Slab Casting)</option>
                      <option value="T-03">T-03 (Scaffolding)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Floor</label>
                    <input
                      type="number"
                      value={syncFormFloor}
                      onChange={(e) => setSyncFormFloor(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 outline-none text-xs text-center font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Zone Area</label>
                    <select
                      value={syncFormZone}
                      onChange={(e) => setSyncFormZone(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 outline-none text-xs"
                    >
                      <option value="Zone A">Zone A - West Wing</option>
                      <option value="Zone B">Zone B - Core Shaft</option>
                      <option value="Zone C">Zone C - East Girders</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-2.5 rounded-xl flex items-center justify-center space-x-1.5 transition-all cursor-pointer text-xs"
                >
                  <Send size={14} />
                  <span>REGISTER & AUTO-SYNC</span>
                </button>
              </form>
            </div>

            {/* Sync Visual Channels Matrix */}
            <div className="lg:col-span-2 space-y-4">
              <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider">Active Synchronized Application Layers</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {syncApps.map((app, idx) => (
                  <div key={idx} className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex items-start space-x-3 hover:border-slate-300 transition-all">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-extrabold shrink-0">
                      ✓
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <strong className="text-slate-900">{app.name}</strong>
                        <span className="bg-emerald-500 text-slate-950 text-[8px] font-black px-1.5 py-0.2 rounded-full uppercase">
                          {app.status}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500">{app.desc}</p>
                      <p className="text-[9px] text-slate-400 font-mono mt-1">{app.lastUpdate}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* --- TAB 5: REPORTS GENERATION DESK --- */}
      {activeTab === "reports" && (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-6 shadow-sm">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-sm font-black text-slate-900">{isAmharic ? "ስማርት የመገኘት ቁጥጥር ሪፖርቶች" : "Automatic Attendance & Break Reporting"}</h3>
              <p className="text-xs text-slate-500">Generate instantly formatted sheets with complete security signatures, exportable directly to Head Office systems.</p>
            </div>
            
            {/* Export buttons */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleExport(activeReportTab.toUpperCase() + "_REPORT")}
                disabled={isExporting}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold flex items-center space-x-1.5 shadow cursor-pointer disabled:bg-slate-300"
              >
                <Download size={14} />
                <span>{isAmharic ? "ወደ Excel ቀይር" : "Export Excel"}</span>
              </button>
              <button
                onClick={() => window.print()}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center space-x-1.5 border border-slate-200 cursor-pointer"
              >
                <Printer size={14} />
                <span>{isAmharic ? "ሪፖርት አትም" : "Print PDF"}</span>
              </button>
            </div>
          </div>

          {exportMessage && (
            <div className="bg-emerald-50 text-emerald-800 p-3 rounded-xl border border-emerald-200 text-xs font-bold flex items-center space-x-2 animate-pulse">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <span>{exportMessage}</span>
            </div>
          )}

          {/* Internal report category switch */}
          <div className="flex overflow-x-auto space-x-1 bg-slate-100 p-1 rounded-xl text-xs">
            <button 
              onClick={() => setActiveReportTab("daily")} 
              className={`flex-1 py-1.5 px-3 rounded-lg text-center font-bold cursor-pointer shrink-0 transition-all ${activeReportTab === "daily" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}
            >
              Daily Attendance
            </button>
            <button 
              onClick={() => setActiveReportTab("lunch")} 
              className={`flex-1 py-1.5 px-3 rounded-lg text-center font-bold cursor-pointer shrink-0 transition-all ${activeReportTab === "lunch" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}
            >
              Lunch Breaks
            </button>
            <button 
              onClick={() => setActiveReportTab("late")} 
              className={`flex-1 py-1.5 px-3 rounded-lg text-center font-bold cursor-pointer shrink-0 transition-all ${activeReportTab === "late" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}
            >
              Late Arrivals
            </button>
            <button 
              onClick={() => setActiveReportTab("early")} 
              className={`flex-1 py-1.5 px-3 rounded-lg text-center font-bold cursor-pointer shrink-0 transition-all ${activeReportTab === "early" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}
            >
              Early Departures
            </button>
            <button 
              onClick={() => setActiveReportTab("exception")} 
              className={`flex-1 py-1.5 px-3 rounded-lg text-center font-bold cursor-pointer shrink-0 transition-all ${activeReportTab === "exception" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}
            >
              Exception Logs
            </button>
            <button 
              onClick={() => setActiveReportTab("overtime")} 
              className={`flex-1 py-1.5 px-3 rounded-lg text-center font-bold cursor-pointer shrink-0 transition-all ${activeReportTab === "overtime" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}
            >
              Overtime Book
            </button>
            <button 
              onClick={() => setActiveReportTab("history")} 
              className={`flex-1 py-1.5 px-3 rounded-lg text-center font-bold cursor-pointer shrink-0 transition-all ${activeReportTab === "history" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}
            >
              Worker Ledger
            </button>
          </div>

          {/* REPORT PREVIEW RENDER VIEWER */}
          <div className="border border-slate-200 rounded-2xl p-6 bg-slate-50/50 space-y-4">
            
            {/* Header of Report Document */}
            <div className="flex justify-between items-start border-b border-slate-300 pb-4 text-xs font-sans">
              <div className="space-y-1">
                <h4 className="text-sm font-black uppercase text-slate-900 tracking-wide">OVID Real Estate & Infrastructure</h4>
                <p className="text-[10px] text-slate-500">Bole Heights Project Site B1 • Aluminum Formwork Hub</p>
                <p className="text-[10px] font-mono font-bold text-slate-800">REPORT_ID: OVID_RE_ATT_{activeReportTab.toUpperCase()}_092</p>
              </div>
              <div className="text-right space-y-1 text-[10px]">
                <p><strong>Generated:</strong> {todayStr} 02:58 AM</p>
                <p><strong>Sync Level:</strong> Head Office Consolidated</p>
                <p><strong>Roster:</strong> 5 Registered Active Apps</p>
              </div>
            </div>

            {/* Render 1: Daily Attendance Report */}
            {activeReportTab === "daily" && (
              <div className="overflow-x-auto bg-white rounded-xl border border-slate-200">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-slate-50 font-bold text-slate-600 border-b border-slate-200">
                      <th className="p-3">Worker ID</th>
                      <th className="p-3">Name</th>
                      <th className="p-3">Trade</th>
                      <th className="p-3 text-center">Morning In</th>
                      <th className="p-3 text-center">Lunch Out</th>
                      <th className="p-3 text-center">Lunch In</th>
                      <th className="p-3 text-center">Evening Out</th>
                      <th className="p-3 text-right">Duty Hours</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {multiPunches.map(p => {
                      const completedCount = [p.morningIn, p.lunchOut, p.lunchIn, p.eveningOut].filter(Boolean).length;
                      return (
                        <tr key={p.workerId} className="hover:bg-slate-50">
                          <td className="p-3 font-mono font-bold text-slate-500">{p.workerId}</td>
                          <td className="p-3 font-bold text-slate-900">{p.workerName}</td>
                          <td className="p-3 text-slate-600">{p.trade}</td>
                          <td className="p-3 text-center font-mono font-medium">{p.morningIn || "--"}</td>
                          <td className="p-3 text-center font-mono font-medium">{p.lunchOut || "--"}</td>
                          <td className="p-3 text-center font-mono font-medium">{p.lunchIn || "--"}</td>
                          <td className="p-3 text-center font-mono font-medium">{p.eveningOut || "--"}</td>
                          <td className="p-3 text-right font-mono font-bold">{completedCount * 2} hrs</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Render 2: Lunch Break Report */}
            {activeReportTab === "lunch" && (
              <div className="overflow-x-auto bg-white rounded-xl border border-slate-200">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-slate-50 font-bold text-slate-600 border-b border-slate-200">
                      <th className="p-3">Worker ID</th>
                      <th className="p-3">Name</th>
                      <th className="p-3 text-center">Lunch Out Time</th>
                      <th className="p-3 text-center">Lunch In Time</th>
                      <th className="p-3 text-center">Break Duration</th>
                      <th className="p-3 text-right">Roster Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {multiPunches.filter(p => p.lunchOut).map(p => {
                      let duration = "0.0 h";
                      let isViolation = false;
                      if (p.lunchOut && p.lunchIn) {
                        const [oH, oM] = p.lunchOut.split(":").map(Number);
                        const [iH, iM] = p.lunchIn.split(":").map(Number);
                        const diffMin = (iH * 60 + iM) - (oH * 60 + oM);
                        duration = `${(diffMin / 60).toFixed(2)} hrs`;
                        if (diffMin > 60) isViolation = true;
                      }

                      return (
                        <tr key={p.workerId} className="hover:bg-slate-50">
                          <td className="p-3 font-mono font-bold text-slate-500">{p.workerId}</td>
                          <td className="p-3 font-bold text-slate-900">{p.workerName}</td>
                          <td className="p-3 text-center font-mono">{p.lunchOut}</td>
                          <td className="p-3 text-center font-mono">{p.lunchIn || "In Break"}</td>
                          <td className="p-3 text-center font-mono font-bold">{duration}</td>
                          <td className="p-3 text-right">
                            <span className={`px-2 py-0.5 rounded border text-[9px] font-bold uppercase ${isViolation ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                              {isViolation ? "Exceeded Limit" : "Standard 1.0 hr OK"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Render 3: Late Arrival Report */}
            {activeReportTab === "late" && (
              <div className="overflow-x-auto bg-white rounded-xl border border-slate-200">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-slate-50 font-bold text-slate-600 border-b border-slate-200">
                      <th className="p-3">Worker ID</th>
                      <th className="p-3">Name</th>
                      <th className="p-3 text-center">Policy In Time</th>
                      <th className="p-3 text-center">Actual In Time</th>
                      <th className="p-3 text-center">Deviation Minute</th>
                      <th className="p-3 text-right">Mitigation Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {multiPunches.map(p => {
                      if (!p.morningIn) return null;
                      const [h, m] = p.morningIn.split(":").map(Number);
                      const totalMin = h * 60 + m;
                      const limitMin = 8 * 60 + 15; // 08:15 grace limit
                      if (totalMin <= limitMin) return null;

                      const diff = totalMin - 8 * 60;
                      const exLog = exceptions.find(ex => ex.workerId === p.workerId && ex.type === "LATE_ARRIVAL");

                      return (
                        <tr key={p.workerId} className="hover:bg-slate-50 font-sans text-[11px]">
                          <td className="p-3 font-mono font-bold text-slate-500">{p.workerId}</td>
                          <td className="p-3 font-bold text-slate-900">{p.workerName}</td>
                          <td className="p-3 text-center font-mono">08:00 (08:15 grace)</td>
                          <td className="p-3 text-center font-mono text-red-600 font-bold">{p.morningIn}</td>
                          <td className="p-3 text-center font-mono text-red-600 font-bold">+{diff} mins</td>
                          <td className="p-3 text-right text-slate-600 font-bold">
                            {exLog ? `${exLog.reason} (${exLog.approvalStatus})` : "Awaiting Exception Reason"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Render 4: Early Departure Report */}
            {activeReportTab === "early" && (
              <div className="overflow-x-auto bg-white rounded-xl border border-slate-200">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-slate-50 font-bold text-slate-600 border-b border-slate-200">
                      <th className="p-3">Worker ID</th>
                      <th className="p-3">Name</th>
                      <th className="p-3 text-center">Policy End Time</th>
                      <th className="p-3 text-center">Actual Out Time</th>
                      <th className="p-3 text-center">Departure Deviation</th>
                      <th className="p-3 text-right">Exception Validation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {multiPunches.map(p => {
                      if (!p.eveningOut) return null;
                      const [h, m] = p.eveningOut.split(":").map(Number);
                      const totalMin = h * 60 + m;
                      const limitMin = 17 * 60; // 5:00 PM standard
                      if (totalMin >= limitMin) return null;

                      const diff = limitMin - totalMin;
                      const exLog = exceptions.find(ex => ex.workerId === p.workerId && ex.type === "EARLY_DEPARTURE");

                      return (
                        <tr key={p.workerId} className="hover:bg-slate-50 font-sans text-[11px]">
                          <td className="p-3 font-mono font-bold text-slate-500">{p.workerId}</td>
                          <td className="p-3 font-bold text-slate-900">{p.workerName}</td>
                          <td className="p-3 text-center font-mono">17:00</td>
                          <td className="p-3 text-center font-mono text-red-600 font-bold">{p.eveningOut}</td>
                          <td className="p-3 text-center font-mono text-red-600 font-bold">-{diff} mins</td>
                          <td className="p-3 text-right text-slate-600 font-bold">
                            {exLog ? `${exLog.reason} (${exLog.approvalStatus})` : "Pending Exception Reason"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Render 5: Attendance Exception Report */}
            {activeReportTab === "exception" && (
              <div className="overflow-x-auto bg-white rounded-xl border border-slate-200">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-slate-50 font-bold text-slate-600 border-b border-slate-200">
                      <th className="p-3">Log ID</th>
                      <th className="p-3">Worker ID</th>
                      <th className="p-3">Name</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Reason Category</th>
                      <th className="p-3">Comments</th>
                      <th className="p-3">Submitted At</th>
                      <th className="p-3 text-right">Governance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {exceptions.map(ex => (
                      <tr key={ex.id} className="hover:bg-slate-50">
                        <td className="p-3 font-mono font-bold text-slate-500">{ex.id}</td>
                        <td className="p-3 font-mono text-slate-600">{ex.workerId}</td>
                        <td className="p-3 font-bold text-slate-900">{ex.workerName}</td>
                        <td className="p-3 font-bold text-red-600">{ex.type.replace("_", " ")}</td>
                        <td className="p-3 font-semibold text-slate-800">{ex.reason}</td>
                        <td className="p-3 text-slate-500 max-w-xs truncate">{ex.comment}</td>
                        <td className="p-3 font-mono">{ex.submittedAt}</td>
                        <td className="p-3 text-right font-bold text-emerald-600">{ex.approvalStatus}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Render 6: Overtime Report */}
            {activeReportTab === "overtime" && (
              <div className="overflow-x-auto bg-white rounded-xl border border-slate-200">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-slate-50 font-bold text-slate-600 border-b border-slate-200">
                      <th className="p-3">Worker ID</th>
                      <th className="p-3">Name</th>
                      <th className="p-3 text-center">Shift Out Time</th>
                      <th className="p-3 text-center">Overtime Registered</th>
                      <th className="p-3 text-center">Overtime Multiplier</th>
                      <th className="p-3 text-right">Verification Stamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {multiPunches.map(p => {
                      if (!p.eveningOut) return null;
                      const [h, m] = p.eveningOut.split(":").map(Number);
                      const totalMin = h * 60 + m;
                      const stdMin = 17 * 60; // 5:00 PM standard limit
                      if (totalMin <= stdMin) return null;

                      const otHours = parseFloat(((totalMin - stdMin) / 60).toFixed(1));

                      return (
                        <tr key={p.workerId} className="hover:bg-slate-50 font-sans text-[11px]">
                          <td className="p-3 font-mono font-bold text-slate-500">{p.workerId}</td>
                          <td className="p-3 font-bold text-slate-900">{p.workerName}</td>
                          <td className="p-3 text-center font-mono">{p.eveningOut}</td>
                          <td className="p-3 text-center font-mono text-purple-700 font-extrabold">+{otHours} hrs</td>
                          <td className="p-3 text-center font-mono">1.5x Hourly Rate</td>
                          <td className="p-3 text-right text-emerald-600 font-bold">✓ Secure Biometric match</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Render 7: Employee Attendance History Ledger */}
            {activeReportTab === "history" && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2 text-xs bg-slate-100 p-2.5 rounded-xl border border-slate-200">
                  <span className="font-bold text-slate-600">Select Employee History Ledger:</span>
                  <select
                    value={selectedWorkerHistoryId}
                    onChange={(e) => setSelectedWorkerHistoryId(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg py-1 px-2 outline-none font-bold text-slate-800"
                  >
                    {workers.map(w => (
                      <option key={w.id} value={w.id}>{w.name} ({w.id})</option>
                    ))}
                  </select>
                </div>

                <div className="overflow-x-auto bg-white rounded-xl border border-slate-200">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-slate-50 font-bold text-slate-600 border-b border-slate-200">
                        <th className="p-3">Shift Date</th>
                        <th className="p-3 text-center">Morning Clock-In</th>
                        <th className="p-3 text-center">Lunch Check-Out</th>
                        <th className="p-3 text-center">Lunch Check-In</th>
                        <th className="p-3 text-center">Evening Clock-Out</th>
                        <th className="p-3 text-center">Total Working Hours</th>
                        <th className="p-3 text-right">Exception Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {/* Standard multi punches filter */}
                      {multiPunches.filter(p => p.workerId === selectedWorkerHistoryId).map(p => (
                        <tr key={p.date} className="hover:bg-slate-50">
                          <td className="p-3 font-mono font-bold text-slate-800">{p.date} (Today)</td>
                          <td className="p-3 text-center font-mono">{p.morningIn || "--"}</td>
                          <td className="p-3 text-center font-mono">{p.lunchOut || "--"}</td>
                          <td className="p-3 text-center font-mono">{p.lunchIn || "--"}</td>
                          <td className="p-3 text-center font-mono">{p.eveningOut || "--"}</td>
                          <td className="p-3 text-center font-mono font-bold text-slate-800">
                            {[p.morningIn, p.lunchOut, p.lunchIn, p.eveningOut].filter(Boolean).length * 2} hrs
                          </td>
                          <td className="p-3 text-right text-emerald-600 font-bold">
                            {exceptions.some(ex => ex.workerId === p.workerId) ? "Exceptions Filed" : "Clear Standard Shift"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Official Stamps / Signatures block for PDF printing */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-10 text-[10px] text-slate-500 font-sans border-t border-dashed border-slate-300">
              <div className="text-center space-y-1">
                <p className="font-bold text-slate-800">Prepared By:</p>
                <div className="h-10 border-b border-slate-300 w-32 mx-auto mt-2"></div>
                <p>Abebe Girma (Time Keeper)</p>
                <p className="text-[9px] text-slate-400 font-mono">ID: TK-01 • Secure Signed</p>
              </div>
              <div className="text-center space-y-1">
                <p className="font-bold text-slate-800">Verified By On-Site:</p>
                <div className="h-10 border-b border-slate-300 w-32 mx-auto mt-2"></div>
                <p>Kassa Hunegn (Supervisor)</p>
                <p className="text-[9px] text-slate-400 font-mono">ID: SV-04 • Biometric Certified</p>
              </div>
              <div className="text-center space-y-1">
                <p className="font-bold text-slate-800">Concurred By Head Office:</p>
                <div className="h-10 border-b border-slate-300 w-32 mx-auto mt-2"></div>
                <p>Eng. Yoseph (ERP Admin)</p>
                <p className="text-[9px] text-slate-400 font-mono">ID: HO-01 • Cloud Sync Complete</p>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* --- TAB 6: SECURITY & CRYPTOGRAPHIC BIOMETRICS AUDIT TRAIL --- */}
      {activeTab === "security" && (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-6 shadow-sm">
          
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-sm font-black text-slate-900">{isAmharic ? "ስማርት ባዮሜትሪክ እና የሳይት ደህንነት ቁጥጥር መዝገብ" : "Workplace Biometric Hardware & Security Cryptographic Audit"}</h3>
            <p className="text-xs text-slate-500 mt-1">
              To satisfy Ethio-Data Privacy directives and secure personnel safety requirements, raw biometric fingerprints or face images are never stored in the database. Instead, direct hardware sensors produce 256-bit cryptographically secured templates (SHA256 vector matches) which are audited below.
            </p>
          </div>

          <div className="bg-slate-950 text-emerald-400 font-mono rounded-2xl p-5 text-xs shadow-inner space-y-3 border border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-slate-400 text-[10px]">
              <span>SECURE_HARDWARE_INTEGRITY_LEDGER</span>
              <span className="text-emerald-500 animate-pulse font-bold">● ONLINE DIRECT LINK ACTIVE</span>
            </div>

            <div className="space-y-4 text-[11px] leading-relaxed">
              {auditTrail.map((log, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex flex-col sm:flex-row sm:justify-between text-slate-400">
                    <span>[TIMESTAMP: {log.timestamp}]</span>
                    <span className="text-amber-400">Verified Personnel: {log.workerName}</span>
                  </div>
                  <p className="text-white">&gt; ACTION: <span className="text-emerald-400 font-bold">{log.action}</span> via {log.verificationMethod}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px] text-slate-500">
                    <span>MATCH_CONFIDENCE: {log.matchedScore}</span>
                    <span className="text-sky-400">HASH: {log.hash}</span>
                    <span className="text-slate-400 text-right">OPERATOR: {log.operator}</span>
                  </div>
                  <div className="border-b border-slate-900 pt-2"></div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
