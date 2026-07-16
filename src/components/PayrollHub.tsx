import React, { useState, useMemo } from "react";
import { 
  Building2, 
  Users, 
  DollarSign, 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  FileSpreadsheet, 
  FileText, 
  Download, 
  Printer, 
  Lock, 
  Eye, 
  EyeOff, 
  ShieldAlert, 
  Search, 
  Filter, 
  Plus, 
  RefreshCw, 
  ChevronRight, 
  UserCheck, 
  Bell, 
  Database, 
  Calendar,
  Layers,
  ArrowUpRight,
  Sparkles,
  Award
} from "lucide-react";
import { Worker, UserRole, AttendanceRecord, AttendanceMethod } from "../types";

interface PayrollHubProps {
  workers: Worker[];
  attendance: AttendanceRecord[];
  isAmharic: boolean;
  currentUserRole: UserRole;
}

// Internal Interfaces for Extended Payroll State
export interface PayrollRecord {
  id: string;
  workerId: string;
  workerName: string;
  position: string;
  department: string;
  team: string;
  project: string;
  employmentType: "Daily Labourer" | "Contract" | "Permanent";
  basicSalary: number; // monthly or daily rate
  attendanceDays: number;
  totalWorkingHours: number;
  overtimeHours: number;
  overtimePayment: number;
  undertimeHours: number;
  undertimeDeduction: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  status: "Draft" | "Pending Review" | "Pending Approval" | "Approved" | "Paid";
  grade: "Grade A" | "Grade B" | "Grade C" | "Grade D";
}

export interface DetailedCheckStamp {
  workerId: string;
  workerName: string;
  date: string;
  morningCheckIn: string; // 08:00
  lunchCheckOut: string; // 12:00
  lunchCheckIn: string; // 13:00
  eveningCheckOut: string; // 17:00
  totalHours: number;
  breakDuration: number;
  netWorkingHours: number;
  overtimeHours: number;
  undertimeHours: number;
  attendancePercentage: number;
  overtimeApproved: boolean;
  undertimeReason: string;
  undertimeApproved: boolean;
}

export interface PayrollNotification {
  id: string;
  type: "payslip" | "overtime_request" | "undertime_alert" | "payroll_ready" | "approved";
  recipient: string; // Role or specific Name
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export interface PayrollAuditLog {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  details: string;
  ip: string;
}

export const PayrollHub: React.FC<PayrollHubProps> = ({
  workers,
  attendance,
  isAmharic,
  currentUserRole
}) => {
  // Navigation
  const [activeTab, setActiveTab] = useState<"dashboard" | "records" | "stamps" | "reports" | "notifications" | "security">("dashboard");
  const [searchTerm, setSearchTerm] = useState("");
  const [deptFilter, setDeptFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  // Stakeholder report dispatching states
  const [reportType, setReportType] = useState<"attendance" | "overtime" | "payroll">("attendance");
  const [sendToTeamLeader, setSendToTeamLeader] = useState(true);
  const [sendToTimeKeeper, setSendToTimeKeeper] = useState(true);
  const [sendToHeadOffice, setSendToHeadOffice] = useState(true);
  const [reportNotes, setReportNotes] = useState("");
  const [isSendingReport, setIsSendingReport] = useState(false);
  const [reportSentSuccess, setReportSentSuccess] = useState(false);
  
  // Security Toggles
  const [encryptData, setEncryptData] = useState(false);
  const [backupSuccess, setBackupSuccess] = useState<string | null>(null);
  
  // Audit Logs State
  const [auditTrail, setAuditTrail] = useState<PayrollAuditLog[]>([
    {
      id: "P-AUD-1001",
      timestamp: new Date(Date.now() - 50000).toISOString().slice(0, 19).replace("T", " "),
      actorName: "Eng. Yoseph (Head Office)",
      actorRole: UserRole.HEAD_OFFICE,
      action: "Payroll Calculation Initiated",
      details: "Calculated baseline monthly payroll for July 2026.",
      ip: "192.168.12.84"
    },
    {
      id: "P-AUD-1002",
      timestamp: new Date(Date.now() - 360000).toISOString().slice(0, 19).replace("T", " "),
      actorName: "Abebe Girma (Time Keeper)",
      actorRole: UserRole.TIME_KEEPER,
      action: "Overtime Desk Sync",
      details: "Synchronized approved supervisor logs into master payroll ledger.",
      ip: "192.168.12.91"
    }
  ]);

  const addAuditLog = (action: string, details: string) => {
    const newLog: PayrollAuditLog = {
      id: `P-AUD-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
      actorName: currentUserRole === UserRole.HEAD_OFFICE ? "Eng. Yoseph (Head Office)" : "Authorized Personnel",
      actorRole: currentUserRole,
      action,
      details,
      ip: "192.168.12.1"
    };
    setAuditTrail(prev => [newLog, ...prev]);
  };

  // Prepopulate standard worker payroll profiles
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>(() => {
    return workers.map((w, index) => {
      // Automatic calculations based on realistic baseline attributes
      const employmentType = (w.employmentType?.includes("Labourer") || w.trade === "Carpenter" || w.trade === "Welder") 
        ? "Daily Labourer" 
        : (index % 3 === 0 ? "Permanent" : "Contract");

      const basicSalary = employmentType === "Daily Labourer" 
        ? 650 // daily wage
        : (w.trade === "Steel Fixer" ? 18000 : 22000); // monthly base salary
      
      const attendanceDays = attendance.filter(a => a.workerId === w.id && a.status === "Present").length || (18 + (index % 6));
      
      const normalWorkingHours = attendanceDays * 8;
      const overtimeHours = index % 4 === 0 ? 12 : (index % 5 === 1 ? 8 : 0);
      const overtimeRate = employmentType === "Daily Labourer" ? (650 / 8) * 1.5 : (basicSalary / 200) * 1.5;
      const overtimePayment = Math.round(overtimeHours * overtimeRate);
      
      const undertimeHours = index % 7 === 2 ? 6.5 : 0;
      const undertimeRate = employmentType === "Daily Labourer" ? (650 / 8) : (basicSalary / 200);
      const undertimeDeduction = Math.round(undertimeHours * undertimeRate);

      const allowances = index % 5 === 0 ? 1500 : 0; // housing/transport allowances
      const deductions = index % 8 === 0 ? 800 : 0; // tax, advances, safety gear losses

      const basePayment = employmentType === "Daily Labourer" ? basicSalary * attendanceDays : basicSalary;
      const netSalary = Math.round(basePayment + overtimePayment - undertimeDeduction + allowances - deductions);

      const grade = index % 4 === 0 ? "Grade A" : (index % 4 === 1 ? "Grade B" : (index % 4 === 2 ? "Grade C" : "Grade D"));

      return {
        id: `PAY-${w.id}`,
        workerId: w.id,
        workerName: w.name,
        position: w.position || w.trade,
        department: w.department,
        team: w.teamLeader || "Bole Heights Alpha",
        project: w.assignedProject || "Bole Heights Site B1",
        employmentType: employmentType as "Daily Labourer" | "Contract" | "Permanent",
        basicSalary,
        attendanceDays,
        totalWorkingHours: normalWorkingHours + overtimeHours,
        overtimeHours,
        overtimePayment,
        undertimeHours,
        undertimeDeduction,
        allowances,
        deductions,
        netSalary,
        status: index % 6 === 0 ? "Draft" : (index % 6 === 1 ? "Pending Review" : "Approved"),
        grade
      };
    });
  });

  // Comprehensive 4-Point check stamps simulator
  const [checkStamps, setCheckStamps] = useState<DetailedCheckStamp[]>(() => {
    return workers.slice(0, 15).map((w, index) => {
      const isIrregular = index % 3 === 0;
      const isLate = index % 5 === 1;

      // 4 timestamps: morningCheckIn, lunchCheckOut, lunchCheckIn, eveningCheckOut
      const morningCheckIn = isLate ? "08:45 AM" : "07:54 AM";
      const lunchCheckOut = isIrregular ? "12:15 PM" : "12:02 PM";
      const lunchCheckIn = "01:05 PM";
      const eveningCheckOut = isIrregular ? "05:45 PM" : "05:00 PM";

      // Calculate time differences
      const checkInMinutes = isLate ? 8 * 60 + 45 : 7 * 60 + 54;
      const lunchOutMinutes = isIrregular ? 12 * 60 + 15 : 12 * 60 + 2;
      const lunchInMinutes = 13 * 60 + 5;
      const eveningOutMinutes = isIrregular ? 17 * 60 + 45 : 17 * 60;

      const morningShiftMinutes = lunchOutMinutes - checkInMinutes;
      const afternoonShiftMinutes = eveningOutMinutes - lunchInMinutes;
      const breakMinutes = lunchInMinutes - lunchOutMinutes;

      const totalWorkingMinutes = morningShiftMinutes + afternoonShiftMinutes;
      const netWorkingHours = parseFloat((totalWorkingMinutes / 60).toFixed(2));
      const breakDuration = parseFloat((breakMinutes / 60).toFixed(2));
      const totalHours = parseFloat(((eveningOutMinutes - checkInMinutes) / 60).toFixed(2));

      // Overtime (> 8 Net hours)
      const overtimeHours = netWorkingHours > 8 ? parseFloat((netWorkingHours - 8).toFixed(2)) : 0;
      // Undertime (< 8 Net hours)
      const undertimeHours = netWorkingHours < 8 ? parseFloat((8 - netWorkingHours).toFixed(2)) : 0;
      const attendancePercentage = Math.min(Math.round((netWorkingHours / 8) * 100), 100);

      return {
        workerId: w.id,
        workerName: w.name,
        date: "2026-07-09",
        morningCheckIn,
        lunchCheckOut,
        lunchCheckIn,
        eveningCheckOut,
        totalHours,
        breakDuration,
        netWorkingHours,
        overtimeHours,
        undertimeHours,
        attendancePercentage,
        overtimeApproved: overtimeHours > 0 && index % 2 === 0,
        undertimeReason: undertimeHours > 0 ? (index % 2 === 0 ? "Permission granted for medical reasons" : "Late arrival without explanation") : "",
        undertimeApproved: undertimeHours > 0 && index % 2 === 0
      };
    });
  });

  // Automated System Notifications State
  const [notifications, setNotifications] = useState<PayrollNotification[]>([
    {
      id: "N-PAY-001",
      type: "payroll_ready",
      recipient: "Head Office",
      title: "July 2026 Payroll Calculation Ready",
      message: "The auto-calculation for OVID site B1 roster is compiled. Review needed.",
      timestamp: "2026-07-09 08:30 AM",
      read: false
    },
    {
      id: "N-PAY-002",
      type: "overtime_request",
      recipient: "Project Manager",
      title: "Overtime Approval Desk",
      message: "6 workers have logged overtime excess of 10+ hours this week. Authorized sign-off requested.",
      timestamp: "2026-07-09 09:12 AM",
      read: false
    },
    {
      id: "N-PAY-003",
      type: "undertime_alert",
      recipient: "Supervisor",
      title: "Undertime Violation Recorded",
      message: "Abebe Girma logged only 6.2 net working hours yesterday. Reason: Late arrival.",
      timestamp: "2026-07-09 10:05 AM",
      read: true
    },
    {
      id: "N-PAY-004",
      type: "payslip",
      recipient: "Employee",
      title: "Payslip Available",
      message: "Payslip for July 2026 is published on the local kiosk and OVID employee hub.",
      timestamp: "2026-07-09 11:00 AM",
      read: false
    }
  ]);

  // Aggregate stats derived from dynamic state
  const dashboardStats = useMemo(() => {
    const totalEmployees = payrollRecords.length;
    
    const totalSalary = payrollRecords.reduce((sum, r) => {
      const base = r.employmentType === "Daily Labourer" ? r.basicSalary * r.attendanceDays : r.basicSalary;
      return sum + base;
    }, 0);

    const totalOvertimePayment = payrollRecords.reduce((sum, r) => sum + r.overtimePayment, 0);
    const totalUndertimeDeduction = payrollRecords.reduce((sum, r) => sum + r.undertimeDeduction, 0);
    
    const totalPaid = payrollRecords.reduce((sum, r) => sum + r.netSalary, 0);
    
    // Average attendance rate of workers
    const avgAttendanceDays = payrollRecords.reduce((sum, r) => sum + r.attendanceDays, 0) / (totalEmployees || 1);
    const attendanceRate = Math.min(Math.round((avgAttendanceDays / 26) * 100), 100);

    const pendingReviewCount = payrollRecords.filter(r => r.status === "Pending Review").length;
    const pendingApprovalCount = payrollRecords.filter(r => r.status === "Draft").length;
    const approvedCount = payrollRecords.filter(r => r.status === "Approved").length;

    return {
      totalEmployees,
      totalSalary,
      totalOvertimePayment,
      totalUndertimeDeduction,
      totalPaid,
      attendanceRate,
      pendingReviewCount,
      pendingApprovalCount,
      approvedCount
    };
  }, [payrollRecords]);

  // Actions
  const handleApproveOvertime = (workerId: string) => {
    setCheckStamps(prev => 
      prev.map(c => {
        if (c.workerId === workerId) {
          addAuditLog("Overtime Approved", `Approved overtime hours for worker ID ${workerId}`);
          return { ...c, overtimeApproved: true };
        }
        return c;
      })
    );
  };

  const handleApproveUndertime = (workerId: string) => {
    setCheckStamps(prev => 
      prev.map(c => {
        if (c.workerId === workerId) {
          addAuditLog("Undertime Waived/Approved", `Approved/excused undertime for worker ID ${workerId}`);
          return { ...c, undertimeApproved: true };
        }
        return c;
      })
    );
  };

  const handleUpdateRecordStatus = (recordId: string, newStatus: PayrollRecord["status"]) => {
    setPayrollRecords(prev => 
      prev.map(r => {
        if (r.id === recordId) {
          addAuditLog("Record Status Changed", `Changed payroll status for ${r.workerName} to ${newStatus}`);
          return { ...r, status: newStatus };
        }
        return r;
      })
    );
  };

  const handleApproveAllPayroll = () => {
    if (currentUserRole !== UserRole.HEAD_OFFICE && currentUserRole !== UserRole.SUPERVISOR) {
      alert("Access Denied: Only Head Office or Project Manager can approve the global payroll ledger.");
      return;
    }
    setPayrollRecords(prev => 
      prev.map(r => ({ ...r, status: "Approved" }))
    );
    addAuditLog("Global Payroll Approved", "Approved all compiled draft and pending records.");
    
    // Add dynamic notification
    const newNotif: PayrollNotification = {
      id: `N-PAY-${Math.floor(100 + Math.random() * 900)}`,
      type: "approved",
      recipient: "All",
      title: "July 2026 Salary Ledgers Approved",
      message: "Global payroll calculation was officially signed-off by Head Office.",
      timestamp: new Date().toISOString().slice(0, 16).replace("T", " "),
      read: false
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  const handleDisburseAllPayroll = () => {
    setPayrollRecords(prev => 
      prev.map(r => ({ ...r, status: "Paid" }))
    );
    addAuditLog("Global Disbursement Triggered", "Marked all payroll records as Paid/Disbursed via bank-link API.");
  };

  // Helper to encrypt/mask financial figures for security demonstration
  const maskValue = (val: number | string) => {
    if (!encryptData) return val;
    if (typeof val === "number") {
      return "•••• ETB";
    }
    return "••••••";
  };

  const handleLocalBackup = () => {
    setBackupSuccess("Backup completed successfully! Encrypted package sent to main cloud storage with MD5 Checksum: " + Math.random().toString(16).slice(2, 10).toUpperCase());
    addAuditLog("Backup Triggered", "Automatic snapshot and SHA-256 backup executed.");
    setTimeout(() => {
      setBackupSuccess(null);
    }, 4500);
  };

  // Filters
  const filteredRecords = useMemo(() => {
    return payrollRecords.filter(r => {
      const matchSearch = r.workerName.toLowerCase().includes(searchTerm.toLowerCase()) || r.workerId.toLowerCase().includes(searchTerm.toLowerCase());
      const matchDept = deptFilter === "All" || r.department === deptFilter;
      const matchStatus = statusFilter === "All" || r.status === statusFilter;
      return matchSearch && matchDept && matchStatus;
    });
  }, [payrollRecords, searchTerm, deptFilter, statusFilter]);

  const uniqueDepartments = useMemo(() => {
    return ["All", ...Array.from(new Set(payrollRecords.map(r => r.department)))];
  }, [payrollRecords]);

  return (
    <div className="space-y-6 animate-fade-in no-print">
      
      {/* HEADER SECTION */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 relative overflow-hidden shadow-md border border-slate-800">
        <div className="absolute right-0 top-0 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-72 h-72 bg-emerald-600/5 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                {isAmharic ? "ኦቪድ ግሩፕ" : "OVID Corporate Smart Pay"}
              </span>
              <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                <Database size={8} /> {isAmharic ? "ከመገኘት ጋር የተገናኘ" : "Linked to Biometric Terminal"}
              </span>
            </div>
            <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <DollarSign className="text-red-500 shrink-0" />
              {isAmharic ? "ስማርት የደመወዝ፣ የትርፍ ሰዓት እና የቅጣት መቆጣጠሪያ" : "Smart Payroll & Overtime Engine"}
            </h2>
            <p className="text-xs text-slate-400 max-w-2xl">
              {isAmharic 
                ? "በእውነተኛ ጊዜ ከባዮሜትሪክ መሣሪያዎች በሚመጣ የመግቢያ እና መውጫ መረጃ መሠረት ሰዓቶችን፣ እረፍቶችን፣ የትርፍ ሰዓቶችን እና ያልተሟሉ የሥራ ሰዓቶችን አውቶማቲክ ስሌት።" 
                : "Real-time automated salary compiler aggregating 4-point biometric stamps (Morning In, Lunch Out, Lunch In, Evening Out) with automatic Overtime allowances and Undertime shortage penalty logs."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => setEncryptData(!encryptData)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer border ${
                encryptData 
                  ? "bg-emerald-950 text-emerald-400 border-emerald-800/80 shadow-xs" 
                  : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750"
              }`}
              title={isAmharic ? "ደህንነቱ የተጠበቀ የውሂብ መደበቂያ" : "Toggle secure encrypted preview masking"}
            >
              {encryptData ? <EyeOff size={13} /> : <Eye size={13} />}
              <span>{encryptData ? (isAmharic ? "ሚስጥራዊነት የበራ" : "Data Masking On") : (isAmharic ? "የፋይናንስ ደህንነት" : "Mask Financial Data")}</span>
            </button>

            <button
              onClick={handleLocalBackup}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <Database size={13} className="text-red-500" />
              <span>{isAmharic ? "መረጃውን አስቀምጥ (Backup)" : "Secure Backup"}</span>
            </button>

            <button
              onClick={handleApproveAllPayroll}
              className="bg-red-600 hover:bg-red-700 text-white shadow-md px-4 py-1.5 rounded-lg text-xs font-black transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <CheckCircle2 size={13} />
              <span>{isAmharic ? "ሁሉንም አፅድቅ" : "Approve Master Ledger"}</span>
            </button>
          </div>
        </div>

        {/* COMPONENT NAVIGATION TABS */}
        <div className="flex items-center space-x-2 mt-6 overflow-x-auto scrollbar-none border-t border-slate-800/80 pt-4">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeTab === "dashboard" ? "bg-red-600 text-white shadow-xs" : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <TrendingUp size={13} />
            <span>{isAmharic ? "የደመወዝ ዳሽቦርድ" : "Payroll Dashboard"}</span>
          </button>

          <button
            onClick={() => setActiveTab("records")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeTab === "records" ? "bg-red-600 text-white shadow-xs" : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <Users size={13} />
            <span>{isAmharic ? "የግል ደመወዝ መዝገብ" : "Employee Payroll Roster"}</span>
          </button>

          <button
            onClick={() => setActiveTab("stamps")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeTab === "stamps" ? "bg-red-600 text-white shadow-xs" : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <Clock size={13} />
            <span>{isAmharic ? "የ4-ነጥብ መገኘት ሰዓታት" : "4-Point Check Hours"}</span>
          </button>

          <button
            onClick={() => setActiveTab("reports")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeTab === "reports" ? "bg-red-600 text-white shadow-xs" : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <FileSpreadsheet size={13} />
            <span>{isAmharic ? "ሪፖርቶች መፍጠሪያ" : "Auto-Generated Reports"}</span>
          </button>

          <button
            onClick={() => setActiveTab("notifications")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 relative ${
              activeTab === "notifications" ? "bg-red-600 text-white shadow-xs" : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <Bell size={13} />
            <span>{isAmharic ? "ማሳወቂያዎች" : "Alert Center"}</span>
            {notifications.filter(n => !n.read).length > 0 && (
              <span className="absolute -top-1 -right-1 bg-emerald-500 text-slate-950 text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-bounce">
                {notifications.filter(n => !n.read).length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("security")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeTab === "security" ? "bg-red-600 text-white shadow-xs" : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <Lock size={13} />
            <span>{isAmharic ? "ደህንነት እና ኦዲት" : "Security & Audit Trail"}</span>
          </button>
        </div>
      </div>

      {backupSuccess && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl p-4 text-xs font-bold flex items-center space-x-3 shadow-xs animate-pulse">
          <Database size={16} className="text-emerald-400 shrink-0 animate-spin" />
          <span>{backupSuccess}</span>
        </div>
      )}

      {/* --- TAB 1: PAYROLL DASHBOARD --- */}
      {activeTab === "dashboard" && (
        <div className="space-y-6">
          {/* STATS TILES */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-5 border border-slate-200/60 shadow-xs relative overflow-hidden">
              <div className="absolute right-3 top-3 p-1.5 bg-slate-50 rounded-lg text-slate-400">
                <Users size={18} />
              </div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                {isAmharic ? "ጠቅላላ ሰራተኞች" : "Tracked Employees"}
              </p>
              <h3 className="text-2xl font-black text-slate-800 mt-1 leading-none">
                {dashboardStats.totalEmployees}
              </h3>
              <div className="flex items-center space-x-1 text-emerald-600 text-[10px] font-bold mt-2">
                <TrendingUp size={10} />
                <span>100% {isAmharic ? "ከባዮሜትሪክ ጋር የተገናኘ" : "Biometric Match"}</span>
              </div>
            </div>

            <div className="bg-white rounded-xl p-5 border border-slate-200/60 shadow-xs relative overflow-hidden">
              <div className="absolute right-3 top-3 p-1.5 bg-slate-50 rounded-lg text-slate-400">
                <DollarSign size={18} className="text-red-500" />
              </div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                {isAmharic ? "የወሩ ጠቅላላ ደመወዝ" : "Estimated Base Salary"}
              </p>
              <h3 className="text-2xl font-black text-slate-800 mt-1 leading-none">
                {maskValue(dashboardStats.totalSalary)} <span className="text-[10px] font-bold text-slate-400">ETB</span>
              </h3>
              <p className="text-slate-400 text-[9px] mt-2">
                {isAmharic ? "ከእለት እና ከወር ደመወዝ የተሰላ" : "Aggregated from contracts"}
              </p>
            </div>

            <div className="bg-white rounded-xl p-5 border border-slate-200/60 shadow-xs relative overflow-hidden">
              <div className="absolute right-3 top-3 p-1.5 bg-emerald-50 rounded-lg text-emerald-500">
                <TrendingUp size={18} />
              </div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                {isAmharic ? "የጸደቀ ትርፍ ሰዓት" : "Approved Overtime"}
              </p>
              <h3 className="text-2xl font-black text-slate-800 mt-1 leading-none">
                {maskValue(dashboardStats.totalOvertimePayment)} <span className="text-[10px] font-bold text-slate-400">ETB</span>
              </h3>
              <div className="flex items-center space-x-1 text-red-600 text-[10px] font-bold mt-2">
                <Clock size={10} />
                <span>{isAmharic ? "በሳይት ማናጀር የተረጋገጠ" : "Verified by PM"}</span>
              </div>
            </div>

            <div className="bg-white rounded-xl p-5 border border-slate-200/60 shadow-xs relative overflow-hidden">
              <div className="absolute right-3 top-3 p-1.5 bg-amber-50 rounded-lg text-amber-600">
                <TrendingDown size={18} />
              </div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                {isAmharic ? "የሰዓት ጉድለት ቅጣት" : "Undertime Shortage"}
              </p>
              <h3 className="text-2xl font-black text-slate-800 mt-1 leading-none">
                {maskValue(dashboardStats.totalUndertimeDeduction)} <span className="text-[10px] font-bold text-slate-400">ETB</span>
              </h3>
              <div className="flex items-center space-x-1 text-amber-600 text-[10px] font-bold mt-2">
                <AlertCircle size={10} />
                <span>{isAmharic ? "ያልተፈቀደ የስራ መቅረት" : "Deductions Applied"}</span>
              </div>
            </div>
          </div>

          {/* NET DISBURSEMENT CARD & STATUS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-2xl p-6 border border-slate-800 shadow-sm flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-black text-red-500 tracking-widest">{isAmharic ? "የመጨረሻ ክፍያ ስራ" : "Net Salary Disbursement"}</span>
                  <Award size={18} className="text-amber-400 animate-pulse" />
                </div>
                <div>
                  <p className="text-[11px] text-slate-400">{isAmharic ? "ከአበል እና ከቅጣት በኋላ ለሰራተኞች የሚከፈል" : "Total Net Salary payable after all adjustments"}</p>
                  <h4 className="text-3xl font-black text-white mt-1">
                    {maskValue(dashboardStats.totalPaid)} <span className="text-xs font-bold text-slate-400">ETB</span>
                  </h4>
                </div>

                <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex justify-between text-xs text-slate-300">
                    <span>{isAmharic ? "የመገኘት መቶኛ" : "Overall Attendance Rate"}</span>
                    <span className="font-bold">{dashboardStats.attendanceRate}%</span>
                  </div>
                  <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-full rounded-full transition-all duration-1000"
                      style={{ width: `${dashboardStats.attendanceRate}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-2">
                <button
                  onClick={handleDisburseAllPayroll}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center space-x-1 cursor-pointer"
                >
                  <CheckCircle2 size={14} />
                  <span>{isAmharic ? "ባንክ ማስተላለፊያ ትዕዛዝ ላክ" : "Disburse via Bank Link API"}</span>
                </button>
                <p className="text-[9px] text-slate-500 text-center">
                  {isAmharic ? "የኦቪድ ባንክ ኤፒአይ (Telebirr/CBE) ዝግጁ ነው" : "Secured with end-to-end 256-bit encryption and audit-logged"}
                </p>
              </div>
            </div>

            {/* WORKFLOW PIPELINE & SUMMARY */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-xs flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 border-b border-slate-150 pb-2 flex items-center space-x-2">
                  <Layers size={15} className="text-red-500" />
                  <span>{isAmharic ? "የክፍያ ማረጋገጫ የሂደት ደረጃ" : "Payroll Approval Workflow Pipeline"}</span>
                </h3>

                <div className="mt-4 space-y-3.5">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50/50 border border-slate-100">
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                      <span className="text-xs font-bold text-slate-700">{isAmharic ? "ረቂቅ ደረጃ (Draft)" : "Draft Calculations"}</span>
                    </div>
                    <span className="text-xs font-bold text-slate-500">{dashboardStats.pendingApprovalCount} {isAmharic ? "ሰራተኞች" : "employees"}</span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50/50 border border-slate-100">
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      <span className="text-xs font-bold text-slate-700">{isAmharic ? "በግምገማ ላይ (In Review)" : "Pending Review"}</span>
                    </div>
                    <span className="text-xs font-bold text-amber-600">{dashboardStats.pendingReviewCount} {isAmharic ? "ሰራተኞች" : "employees"}</span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50/50 border border-emerald-100">
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <span className="text-xs font-bold text-emerald-800">{isAmharic ? "የጸደቀ ክፍያ (Approved)" : "Approved Ledgers"}</span>
                    </div>
                    <span className="text-xs font-bold text-emerald-600">{dashboardStats.approvedCount} {isAmharic ? "ሰራተኞች" : "employees"}</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/50 text-[10px] text-slate-500 leading-snug mt-4">
                <span className="font-bold text-slate-700 block mb-1">
                  {isAmharic ? "የፍቃድ ደንቦች መግለጫ" : "Required Roles to Finalize"}
                </span>
                {isAmharic 
                  ? "የደመወዝ ክፍያን ለማጠናቀቅ በዋና መስሪያ ቤት ሃላፊ (Head Office) ወይም በሳይት ሱፐርቫይዘር መፈረም ይኖርበታል።"
                  : "Final organizational disbursement requires verified electronic sign-off from Head Office or authorized Payroll Officer profiles."}
              </div>
            </div>

            {/* QUICK ALERTS QUEUE */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-xs flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 border-b border-slate-150 pb-2 flex items-center justify-between">
                  <span className="flex items-center space-x-2">
                    <Bell size={15} className="text-red-500" />
                    <span>{isAmharic ? "ቀጥታ የደመወዝ ማንቂያዎች" : "Live Payroll Alerts Queue"}</span>
                  </span>
                  <span className="bg-red-50 text-red-600 text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                    {notifications.filter(n => !n.read).length} Active
                  </span>
                </h3>

                <div className="mt-4 space-y-3 max-h-56 overflow-y-auto scrollbar-thin">
                  {notifications.slice(0, 3).map((notif) => (
                    <div key={notif.id} className="flex items-start space-x-2 text-xs border-b border-slate-100 pb-2 last:border-b-0">
                      <div className="mt-0.5">
                        {notif.type === "undertime_alert" && <TrendingDown size={14} className="text-amber-500" />}
                        {notif.type === "overtime_request" && <TrendingUp size={14} className="text-red-500 animate-pulse" />}
                        {notif.type === "payroll_ready" && <FileText size={14} className="text-emerald-500" />}
                        {notif.type === "payslip" && <Bell size={14} className="text-slate-400" />}
                        {notif.type === "approved" && <CheckCircle2 size={14} className="text-emerald-600" />}
                      </div>
                      <div className="space-y-0.5">
                        <span className="font-bold text-slate-800 block text-[11px] leading-tight">{notif.title}</span>
                        <span className="text-slate-500 text-[10px] leading-snug">{notif.message}</span>
                        <span className="text-[9px] text-slate-400 block">{notif.timestamp}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setActiveTab("notifications")}
                className="w-full bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-xs py-2 rounded-lg transition-all text-center border border-slate-200 mt-4 cursor-pointer"
              >
                {isAmharic ? "ሁሉንም ማንቂያዎች ተመልከት" : "View All Pending Alerts"}
              </button>
            </div>

          </div>

          {/* ATTENDANCE TO SALARY VISUALIZER (SVG GRAPHS) */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-150 pb-3 flex items-center justify-between">
              <span>{isAmharic ? "ደመወዝ እና የመገኘት ስርጭት ግራፍ" : "Payment Distribution by Grade & Trade Group"}</span>
              <span className="text-xs text-slate-400 font-mono">Bole Heights Project Site B1</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
              
              {/* GRADE SUMMARY */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">{isAmharic ? "ደረጃ የተከፋፈለ የደመወዝ መጠን" : "Average Salary Distribution by Grade"}</h4>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold text-slate-700">Grade A (Managers, Tech Specialists)</span>
                      <span className="font-mono text-slate-600">22,000 ETB</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-red-500 h-full rounded-full" style={{ width: "90%" }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold text-slate-700">Grade B (Senior Welders, Carpenters)</span>
                      <span className="font-mono text-slate-600">18,000 ETB</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-red-400 h-full rounded-full" style={{ width: "75%" }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold text-slate-700">Grade C (Standard Site Laborers)</span>
                      <span className="font-mono text-slate-600">16,900 ETB (Based on days worked)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-amber-400 h-full rounded-full" style={{ width: "68%" }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold text-slate-700">Grade D (Junior Trainees)</span>
                      <span className="font-mono text-slate-600">11,700 ETB</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-slate-400 h-full rounded-full" style={{ width: "45%" }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* PROJECT COMPLIANCE AND HOURS DISTRIBUTION */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">{isAmharic ? "የትርፍ ሰዓት እና የቅጣት ጥምርታ" : "Overtime vs Undertime Impact Ratio"}</h4>
                <div className="flex items-center justify-around h-36">
                  
                  {/* Circular Pie Indicator */}
                  <div className="relative w-28 h-28 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="56" cy="56" r="45" stroke="#f1f5f9" strokeWidth="8" fill="transparent" />
                      <circle cx="56" cy="56" r="45" stroke="#ef4444" strokeWidth="8" strokeDasharray="282" strokeDashoffset="56" fill="transparent" strokeLinecap="round" />
                      <circle cx="56" cy="56" r="45" stroke="#10b981" strokeWidth="8" strokeDasharray="282" strokeDashoffset="180" fill="transparent" strokeLinecap="round" />
                    </svg>
                    <div className="absolute text-center">
                      <span className="text-xs font-black text-slate-800 block">82%</span>
                      <span className="text-[8px] text-slate-400 block uppercase font-bold tracking-wide">{isAmharic ? "ውጤታማነት" : "Efficiency"}</span>
                    </div>
                  </div>

                  {/* Legend details */}
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="w-3 h-3 bg-emerald-500 rounded-xs" />
                      <span className="text-slate-600">Approved Productive Hours (82%)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="w-3 h-3 bg-red-500 rounded-xs" />
                      <span className="text-slate-600">Approved Overtime Hours (12%)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="w-3 h-3 bg-amber-400 rounded-xs" />
                      <span className="text-slate-600">Undertime Shortage (6%)</span>
                    </div>
                  </div>

                </div>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* --- TAB 2: EMPLOYEE PAYROLL ROSTER --- */}
      {activeTab === "records" && (
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">{isAmharic ? "ኦፊሴላዊ የደመወዝ መዝገብ" : "Official Employee Payroll Ledger"}</h3>
              <p className="text-xs text-slate-500">
                {isAmharic 
                  ? "የእያንዳንዱን ሰራተኛ መሰረታዊ ደመወዝ፣ አበል፣ ትርፍ ሰዓት እና የቅጣት እርምጃዎች ይቆጣጠሩ።"
                  : "Review fully calculated salaries, adjust custom allowances, manage tax deductions, and approve individual slips."}
              </p>
            </div>
          </div>

          {/* FILTERS TOOLBAR */}
          <div className="flex flex-col md:flex-row gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/40">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
              <input
                type="text"
                placeholder={isAmharic ? "በስም ወይም መለያ ይፈልጉ..." : "Search worker name or ID..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs font-medium focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <div className="flex items-center space-x-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold">
                <Filter size={13} className="text-slate-400" />
                <span className="text-slate-500">{isAmharic ? "ዘርፍ:" : "Department:"}</span>
                <select
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  className="bg-transparent border-none text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                >
                  {uniqueDepartments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold">
                <Filter size={13} className="text-slate-400" />
                <span className="text-slate-500">{isAmharic ? "ሁኔታ:" : "Status:"}</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-transparent border-none text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value="All">{isAmharic ? "ሁሉም" : "All"}</option>
                  <option value="Draft">Draft</option>
                  <option value="Pending Review">Pending Review</option>
                  <option value="Approved">Approved</option>
                  <option value="Paid">Paid</option>
                </select>
              </div>
            </div>
          </div>

          {/* RECORDS TABLE */}
          <div className="overflow-x-auto border border-slate-100 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-100 font-bold">
                  <th className="p-3.5">{isAmharic ? "የሰራተኛ መለያ" : "Employee ID"}</th>
                  <th className="p-3.5">{isAmharic ? "ሙሉ ስም" : "Full Name"}</th>
                  <th className="p-3.5">{isAmharic ? "ማዕረግ / ክፍል" : "Trade / Position"}</th>
                  <th className="p-3.5">{isAmharic ? "የክፍያ ሁኔታ" : "Salary Type"}</th>
                  <th className="p-3.5 text-center">{isAmharic ? "የስራ ቀናት" : "Days worked"}</th>
                  <th className="p-3.5 text-right">{isAmharic ? "መሰረታዊ ደመወዝ" : "Basic Wage"}</th>
                  <th className="p-3.5 text-right">{isAmharic ? "ትርፍ ሰዓት" : "Overtime Pay"}</th>
                  <th className="p-3.5 text-right text-amber-600">{isAmharic ? "የሰዓት ጉድለት" : "Undertime Deduction"}</th>
                  <th className="p-3.5 text-right text-emerald-600">{isAmharic ? "አበል" : "Allowances"}</th>
                  <th className="p-3.5 text-right text-slate-700">{isAmharic ? "የተጣራ ክፍያ" : "Net Salary"}</th>
                  <th className="p-3.5 text-center">{isAmharic ? "ሁኔታ" : "Status"}</th>
                  <th className="p-3.5 text-center">{isAmharic ? "እርምጃዎች" : "Action"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="p-8 text-center text-slate-400">
                      {isAmharic ? "ምንም የደመወዝ መዝገብ አልተገኘም" : "No payroll records match the criteria."}
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-3.5 font-mono font-bold text-slate-900">{r.workerId}</td>
                      <td className="p-3.5">
                        <span className="font-bold text-slate-900 block">{r.workerName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{r.project} | {r.team}</span>
                      </td>
                      <td className="p-3.5">
                        <span className="block font-semibold text-slate-700">{r.position}</span>
                        <span className="text-[9px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-bold uppercase">{r.grade}</span>
                      </td>
                      <td className="p-3.5 font-mono">
                        {r.employmentType === "Daily Labourer" ? (
                          <span className="text-red-600 font-bold">{isAmharic ? "ዕለታዊ ክፍያ" : "Daily Labourer"}</span>
                        ) : (
                          <span className="text-slate-600">{r.employmentType}</span>
                        )}
                      </td>
                      <td className="p-3.5 text-center font-bold font-mono">{r.attendanceDays} {isAmharic ? "ቀን" : "days"}</td>
                      <td className="p-3.5 text-right font-bold font-mono text-slate-900">
                        {maskValue(r.basicSalary)}
                        <span className="text-[9px] text-slate-400 block font-normal">
                          {r.employmentType === "Daily Labourer" ? "/day" : "/month"}
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-bold font-mono text-slate-800">
                        {maskValue(r.overtimePayment)}
                        <span className="text-[9px] text-emerald-600 block font-normal">{r.overtimeHours} hrs</span>
                      </td>
                      <td className="p-3.5 text-right font-bold font-mono text-amber-600">
                        -{maskValue(r.undertimeDeduction)}
                        <span className="text-[9px] text-amber-500 block font-normal">{r.undertimeHours} hrs</span>
                      </td>
                      <td className="p-3.5 text-right font-bold font-mono text-emerald-600">
                        +{maskValue(r.allowances)}
                      </td>
                      <td className="p-3.5 text-right font-extrabold font-mono text-slate-900 bg-red-50/10">
                        {maskValue(r.netSalary)} <span className="text-[9px] text-slate-400 font-normal">ETB</span>
                      </td>
                      <td className="p-3.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          r.status === "Paid" ? "bg-emerald-100 text-emerald-800" :
                          r.status === "Approved" ? "bg-emerald-50 text-emerald-600" :
                          r.status === "Pending Review" ? "bg-amber-100 text-amber-800 animate-pulse" : "bg-slate-100 text-slate-600"
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          {r.status !== "Approved" && r.status !== "Paid" ? (
                            <button
                              onClick={() => handleUpdateRecordStatus(r.id, "Approved")}
                              className="p-1 bg-red-50 hover:bg-red-600 hover:text-white text-red-600 rounded transition-all cursor-pointer"
                              title="Approve this ledger record"
                            >
                              <UserCheck size={12} />
                            </button>
                          ) : (
                            <span className="text-emerald-600 font-bold text-[10px] flex items-center gap-0.5">
                              <CheckCircle2 size={11} /> Ready
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB 3: 4-POINT DETAILED CHECK HOURS --- */}
      {activeTab === "stamps" && (
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs p-6 space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {isAmharic ? "የ4-ነጥብ ባዮሜትሪክ መግቢያ እና መውጫ ሰዓት ቁጥጥር" : "4-Point Biometric Shift Attendance Stamps"}
            </h3>
            <p className="text-xs text-slate-500">
              {isAmharic 
                ? "በእያንዳንዱ ሰራተኛ የተመዘገቡትን 4 ነጥቦች መቆጣጠር: ጠዋት መግቢያ፣ ምሳ መውጫ፣ ምሳ መግቢያ፣ እና ማታ መውጫ።"
                : "Real-time audit of daily shift timestamps showing calculated breaks, net productive hours, approved overtime, and undertime explanations."}
            </p>
          </div>

          <div className="overflow-x-auto border border-slate-100 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-100 font-bold">
                  <th className="p-3.5">{isAmharic ? "የሰራተኛ መለያ" : "Worker ID"}</th>
                  <th className="p-3.5">{isAmharic ? "ሙሉ ስም" : "Worker Name"}</th>
                  <th className="p-3.5 text-center">{isAmharic ? "ጠዋት መግቢያ" : "Morning Check-In"}</th>
                  <th className="p-3.5 text-center">{isAmharic ? "ምሳ መውጫ" : "Lunch Check-Out"}</th>
                  <th className="p-3.5 text-center">{isAmharic ? "ምሳ መግቢያ" : "Lunch Check-In"}</th>
                  <th className="p-3.5 text-center">{isAmharic ? "ማታ መውጫ" : "Evening Check-Out"}</th>
                  <th className="p-3.5 text-center">{isAmharic ? "ምሳ እረፍት" : "Break Duration"}</th>
                  <th className="p-3.5 text-center">{isAmharic ? "የተጣራ ሰዓት" : "Net Working Hours"}</th>
                  <th className="p-3.5 text-center">{isAmharic ? "የትርፍ ሰዓት" : "Overtime Hours"}</th>
                  <th className="p-3.5 text-center">{isAmharic ? "የሰዓት ጉድለት" : "Undertime Hours"}</th>
                  <th className="p-3.5">{isAmharic ? "የጉድለት ምክንያት እና ሁኔታ" : "Exceptions & Clearances"}</th>
                  <th className="p-3.5 text-center">{isAmharic ? "እርምጃዎች" : "Action Desk"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {checkStamps.map((stamp) => (
                  <tr key={stamp.workerId} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-slate-900">{stamp.workerId}</td>
                    <td className="p-3.5 font-bold text-slate-900">{stamp.workerName}</td>
                    <td className="p-3.5 text-center font-semibold text-emerald-600 font-mono">{stamp.morningCheckIn}</td>
                    <td className="p-3.5 text-center text-slate-600 font-mono">{stamp.lunchCheckOut}</td>
                    <td className="p-3.5 text-center text-slate-600 font-mono">{stamp.lunchCheckIn}</td>
                    <td className="p-3.5 text-center font-semibold text-red-600 font-mono">{stamp.eveningCheckOut}</td>
                    <td className="p-3.5 text-center font-mono text-slate-500">{stamp.breakDuration} hr</td>
                    <td className="p-3.5 text-center">
                      <span className={`px-2 py-0.5 rounded-full font-mono font-bold text-[11px] ${
                        stamp.netWorkingHours >= 8 ? "bg-slate-900 text-white" : "bg-amber-100 text-amber-800"
                      }`}>
                        {stamp.netWorkingHours} hrs
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      {stamp.overtimeHours > 0 ? (
                        <span className={`px-2 py-0.5 rounded-full font-mono font-bold text-emerald-600 ${
                          stamp.overtimeApproved ? "bg-emerald-50" : "bg-red-50 text-red-600"
                        }`}>
                          +{stamp.overtimeHours} hrs
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="p-3.5 text-center">
                      {stamp.undertimeHours > 0 ? (
                        <span className={`px-2 py-0.5 rounded-full font-mono font-bold text-amber-600 ${
                          stamp.undertimeApproved ? "bg-emerald-50 text-emerald-700" : "bg-amber-100"
                        }`}>
                          {stamp.undertimeHours} hrs
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="p-3.5 max-w-[150px]">
                      {stamp.undertimeHours > 0 ? (
                        <div className="space-y-1">
                          <span className="text-[10px] text-slate-500 block leading-tight">{stamp.undertimeReason}</span>
                          <span className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded ${
                            stamp.undertimeApproved ? "bg-emerald-100 text-emerald-800" : "bg-red-50 text-red-600"
                          }`}>
                            {stamp.undertimeApproved ? "Excused" : "Deduction Pending"}
                          </span>
                        </div>
                      ) : ( stamp.overtimeHours > 0 ? (
                        <span className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded ${
                          stamp.overtimeApproved ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-700"
                        }`}>
                          {stamp.overtimeApproved ? "Approved by PM" : "Needs Supervisor Approval"}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[10px]">Standard Shift Compliance</span>
                      ))}
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        {stamp.overtimeHours > 0 && !stamp.overtimeApproved && (
                          <button
                            onClick={() => handleApproveOvertime(stamp.workerId)}
                            className="px-2 py-1 bg-red-600 text-white rounded text-[10px] font-bold hover:bg-red-700 transition-all cursor-pointer"
                          >
                            Approve OT
                          </button>
                        )}
                        {stamp.undertimeHours > 0 && !stamp.undertimeApproved && (
                          <button
                            onClick={() => handleApproveUndertime(stamp.workerId)}
                            className="px-2 py-1 bg-slate-800 text-white rounded text-[10px] font-bold hover:bg-slate-900 transition-all cursor-pointer"
                          >
                            Waive Shortage
                          </button>
                        )}
                        {(!stamp.overtimeHours || stamp.overtimeApproved) && (!stamp.undertimeHours || stamp.undertimeApproved) && (
                          <span className="text-emerald-600 font-bold text-[10px] flex items-center gap-0.5">
                            <CheckCircle2 size={11} /> Verified
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB 4: AUTO-GENERATED REPORTS DESK --- */}
      {activeTab === "reports" && (
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">{isAmharic ? "አውቶማቲክ የሪፖርቶች መፍጠሪያ ማዕከል" : "Automatic Payroll Reports Console"}</h3>
              <p className="text-xs text-slate-500">
                {isAmharic 
                  ? "ዕለታዊ፣ ሳምንታዊ፣ ወርሃዊ የመገኘት፣ የትርፍ ሰዓት፣ እና የደመወዝ ክፍያዎችን ወደ ፒዲኤፍ (PDF) ወይም ኤክሴል (Excel) ይላኩ።"
                  : "Compile dynamic corporate attendance audits, overtime summaries, undertime logs, or department sheets instantly. Ready for print or email."}
              </p>
            </div>
            
            <div className="flex gap-2 mt-4 sm:mt-0">
              <button
                onClick={() => window.print()}
                className="bg-slate-900 hover:bg-slate-850 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                <Printer size={13} />
                <span>{isAmharic ? "ወደ ፒዲኤፍ ላክ (PDF)" : "Export to PDF"}</span>
              </button>

              <button
                onClick={() => {
                  alert("Excel sheets successfully exported to device local folder (OVID-Payroll-Export.xlsx)");
                  addAuditLog("Excel Report Exported", "Downloaded master payroll sheets.");
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                <FileSpreadsheet size={13} />
                <span>{isAmharic ? "ወደ ኤክሴል ላክ (Excel)" : "Export to Excel"}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className="border border-slate-200/60 rounded-xl p-4 space-y-3 bg-slate-50/50">
              <div className="flex items-center space-x-2 text-slate-900 font-bold">
                <Calendar size={16} className="text-red-500" />
                <span className="text-xs uppercase tracking-wider">{isAmharic ? "የመገኘት ሪፖርቶች" : "Attendance Audits"}</span>
              </div>
              <p className="text-[11px] text-slate-500">{isAmharic ? "ዕለታዊ፣ ሳምንታዊ እና ወርሃዊ የሰራተኞች መገኘት መቶኛ" : "Compile percentage matrices, late arrivals, missing cards, and excused leaves."}</p>
              
              <div className="space-y-1.5 pt-2">
                <button className="w-full text-left p-2 rounded bg-white border border-slate-100 hover:border-red-400 text-xs font-semibold flex justify-between items-center transition-all cursor-pointer">
                  <span>{isAmharic ? "የዕለት መገኘት ማጠቃለያ" : "Daily Attendance Report"}</span>
                  <ChevronRight size={12} className="text-slate-400" />
                </button>
                <button className="w-full text-left p-2 rounded bg-white border border-slate-100 hover:border-red-400 text-xs font-semibold flex justify-between items-center transition-all cursor-pointer">
                  <span>{isAmharic ? "የሳምንት መገኘት ማጠቃለያ" : "Weekly Attendance Audit"}</span>
                  <ChevronRight size={12} className="text-slate-400" />
                </button>
                <button className="w-full text-left p-2 rounded bg-white border border-slate-100 hover:border-red-400 text-xs font-semibold flex justify-between items-center transition-all cursor-pointer">
                  <span>{isAmharic ? "የወር መገኘት ማጠቃለያ" : "Monthly Attendance Summary"}</span>
                  <ChevronRight size={12} className="text-slate-400" />
                </button>
              </div>
            </div>

            <div className="border border-slate-200/60 rounded-xl p-4 space-y-3 bg-slate-50/50">
              <div className="flex items-center space-x-2 text-slate-900 font-bold">
                <Clock size={16} className="text-emerald-500" />
                <span className="text-xs uppercase tracking-wider">{isAmharic ? "የትርፍ እና የጉድለት ሰዓት" : "Overtime & Undertime"}</span>
              </div>
              <p className="text-[11px] text-slate-500">{isAmharic ? "በሳይት ሃላፊዎች የጸደቁ የትርፍ ሰዓቶች እና ያልተሟሉ ሰዓቶች ዝርዝር" : "Filter by PM approvals, waive actions, excess limits, and site safety audits."}</p>
              
              <div className="space-y-1.5 pt-2">
                <button className="w-full text-left p-2 rounded bg-white border border-slate-100 hover:border-red-400 text-xs font-semibold flex justify-between items-center transition-all cursor-pointer">
                  <span>{isAmharic ? "የትርፍ ሰዓት መቆጣጠሪያ" : "Approved Overtime Report"}</span>
                  <ChevronRight size={12} className="text-slate-400" />
                </button>
                <button className="w-full text-left p-2 rounded bg-white border border-slate-100 hover:border-red-400 text-xs font-semibold flex justify-between items-center transition-all cursor-pointer">
                  <span>{isAmharic ? "የሰዓት ጉድለት ሪፖርት" : "Undertime Penalties Report"}</span>
                  <ChevronRight size={12} className="text-slate-400" />
                </button>
              </div>
            </div>

            <div className="border border-slate-200/60 rounded-xl p-4 space-y-3 bg-slate-50/50">
              <div className="flex items-center space-x-2 text-slate-900 font-bold">
                <DollarSign size={16} className="text-red-500" />
                <span className="text-xs uppercase tracking-wider">{isAmharic ? "የደመወዝ ክፍያ ሪፖርቶች" : "Financial Statements"}</span>
              </div>
              <p className="text-[11px] text-slate-500">{isAmharic ? "የሰራተኛ ደመወዝ፣ የፕሮጀክት እና የክፍል አጠቃላይ ወጪዎች" : "Evaluate total site expenditures, average cost per trade group, and tax allocations."}</p>
              
              <div className="space-y-1.5 pt-2">
                <button className="w-full text-left p-2 rounded bg-white border border-slate-100 hover:border-red-400 text-xs font-semibold flex justify-between items-center transition-all cursor-pointer">
                  <span>{isAmharic ? "የደመወዝ ክፍያ መግለጫ" : "General Salary Ledger Report"}</span>
                  <ChevronRight size={12} className="text-slate-400" />
                </button>
                <button className="w-full text-left p-2 rounded bg-white border border-slate-100 hover:border-red-400 text-xs font-semibold flex justify-between items-center transition-all cursor-pointer">
                  <span>{isAmharic ? "የዘርፍ / ክፍል ወጪዎች" : "Departmental Payroll Report"}</span>
                  <ChevronRight size={12} className="text-slate-400" />
                </button>
                <button className="w-full text-left p-2 rounded bg-white border border-slate-100 hover:border-red-400 text-xs font-semibold flex justify-between items-center transition-all cursor-pointer">
                  <span>{isAmharic ? "የፕሮጀክት ክፍያ ወጪዎች" : "Project Cost Breakdown"}</span>
                  <ChevronRight size={12} className="text-slate-400" />
                </button>
              </div>
            </div>

          </div>

          {/* Dynamic Stakeholder Dispatch Desk */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 space-y-4 no-print">
            <div className="flex items-center space-x-2 text-slate-900 font-bold border-b border-slate-200 pb-3">
              <Sparkles size={18} className="text-red-500 animate-pulse" />
              <h4 className="text-sm font-extrabold">{isAmharic ? "ስማርት ሪፖርት መላኪያ ማዕከል" : "Stakeholder Report Dispatch Desk"}</h4>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Form */}
              <div className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">{isAmharic ? "የሪፖርት ዓይነት ይምረጡ" : "1. Select Report Focus Area"}</label>
                  <select
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value as any)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 focus:border-red-500 font-medium outline-none"
                  >
                    <option value="attendance">
                      {isAmharic ? "የዕለት መገኘትና የመግቢያ/መውጫ ሪፖርት (Attendance Percentage Audit)" : "Employee Attendance Percentage & 4-Point Audit"}
                    </option>
                    <option value="overtime">
                      {isAmharic ? "የትርፍ ሰዓትና የተጣራ የስራ ሰዓት ሪፖርት (Overtime Allowances Sheet)" : "Overtime Hours & Wage Payments Statement"}
                    </option>
                    <option value="payroll">
                      {isAmharic ? "የደመወዝ ክፍያና የቅጣት እርምጃዎች ሪፖርት (Financial Smart Payroll Ledger)" : "Master Smart Payroll & Shortage Deductions Ledger"}
                    </option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="font-bold text-slate-700 block">{isAmharic ? "ተቀባይ አካላትን ይምረጡ" : "2. Select Authorized Recipients"}</label>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Team Leader */}
                    <label className={`p-3 rounded-xl border flex items-center space-x-3 cursor-pointer transition-all ${sendToTeamLeader ? 'bg-white border-red-500 shadow-xs' : 'bg-slate-100/50 border-slate-200 text-slate-400'}`}>
                      <input
                        type="checkbox"
                        checked={sendToTeamLeader}
                        onChange={(e) => setSendToTeamLeader(e.target.checked)}
                        className="sr-only"
                      />
                      <div className={`w-4 h-4 rounded flex items-center justify-center border ${sendToTeamLeader ? 'bg-red-500 border-red-500 text-white' : 'border-slate-300 bg-white'}`}>
                        {sendToTeamLeader && <CheckCircle2 size={10} className="text-white bg-red-500 rounded-full" />}
                      </div>
                      <div>
                        <span className="font-bold block text-slate-800">{isAmharic ? "የቡድን መሪ" : "Team Leader"}</span>
                        <span className="text-[10px] text-slate-400 block font-mono">Yohannes Bekele</span>
                      </div>
                    </label>

                    {/* Time Keeper */}
                    <label className={`p-3 rounded-xl border flex items-center space-x-3 cursor-pointer transition-all ${sendToTimeKeeper ? 'bg-white border-red-500 shadow-xs' : 'bg-slate-100/50 border-slate-200 text-slate-400'}`}>
                      <input
                        type="checkbox"
                        checked={sendToTimeKeeper}
                        onChange={(e) => setSendToTimeKeeper(e.target.checked)}
                        className="sr-only"
                      />
                      <div className={`w-4 h-4 rounded flex items-center justify-center border ${sendToTimeKeeper ? 'bg-red-500 border-red-500 text-white' : 'border-slate-300 bg-white'}`}>
                        {sendToTimeKeeper && <CheckCircle2 size={10} className="text-white bg-red-500 rounded-full" />}
                      </div>
                      <div>
                        <span className="font-bold block text-slate-800">{isAmharic ? "ሰዓት ቆጣሪ" : "Time Keeper"}</span>
                        <span className="text-[10px] text-slate-400 block font-mono">Abebe Girma</span>
                      </div>
                    </label>

                    {/* Head Office */}
                    <label className={`p-3 rounded-xl border flex items-center space-x-3 cursor-pointer transition-all ${sendToHeadOffice ? 'bg-white border-red-500 shadow-xs' : 'bg-slate-100/50 border-slate-200 text-slate-400'}`}>
                      <input
                        type="checkbox"
                        checked={sendToHeadOffice}
                        onChange={(e) => setSendToHeadOffice(e.target.checked)}
                        className="sr-only"
                      />
                      <div className={`w-4 h-4 rounded flex items-center justify-center border ${sendToHeadOffice ? 'bg-red-500 border-red-500 text-white' : 'border-slate-300 bg-white'}`}>
                        {sendToHeadOffice && <CheckCircle2 size={10} className="text-white bg-red-500 rounded-full" />}
                      </div>
                      <div>
                        <span className="font-bold block text-slate-800">{isAmharic ? "ዋና መስሪያ ቤት" : "Head Office"}</span>
                        <span className="text-[10px] text-slate-400 block font-mono">Eng. Yoseph</span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Right Notes & Send Button */}
              <div className="space-y-4 text-xs flex flex-col justify-between">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">{isAmharic ? "ለተቀባዮች መልዕክት ወይም ማሳሰቢያ ይጻፉ" : "3. Custom Instructions / Notes"}</label>
                  <textarea
                    value={reportNotes}
                    onChange={(e) => setReportNotes(e.target.value)}
                    placeholder={isAmharic ? "የሪፖርት ማብራሪያ ወይም ተጨማሪ ማስታወሻዎች..." : "Write optional instructions or specific warnings regarding late clock-ins or overtime adjustments..."}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 min-h-[90px] focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <button
                    onClick={() => {
                      if (!sendToTeamLeader && !sendToTimeKeeper && !sendToHeadOffice) {
                        alert(isAmharic ? "እባክዎን ቢያንስ አንድ ተቀባይ ይምረጡ!" : "Please select at least one recipient!");
                        return;
                      }
                      setIsSendingReport(true);
                      setReportSentSuccess(false);

                      setTimeout(() => {
                        setIsSendingReport(false);
                        setReportSentSuccess(true);
                        
                        // Formulate recipients string
                        const recipientsList: string[] = [];
                        if (sendToTeamLeader) recipientsList.push("Team Leader (Yohannes Bekele)");
                        if (sendToTimeKeeper) recipientsList.push("Time Keeper (Abebe Girma)");
                        if (sendToHeadOffice) recipientsList.push("Head Office (Eng. Yoseph)");
                        const recStr = recipientsList.join(", ");

                        // Add dynamic notification
                        const focusTitle = reportType === "attendance" ? "Attendance Percentage Audit" 
                          : reportType === "overtime" ? "Overtime Payments Statement" 
                          : "Smart Payroll Ledger";

                        const notifMessage = `Compiled ${focusTitle} successfully transmitted to: ${recStr}. ${reportNotes ? 'Notes: ' + reportNotes : ''}`;
                        
                        const newNotif: PayrollNotification = {
                          id: `N-PAY-${Math.floor(100 + Math.random() * 900)}`,
                          type: "payroll_ready",
                          recipient: sendToHeadOffice ? "Head Office" : "Authorized Personnel",
                          title: `Auto-Report Dispatched: ${focusTitle}`,
                          message: notifMessage,
                          timestamp: new Date().toISOString().slice(0, 16).replace("T", " "),
                          read: false
                        };
                        setNotifications(prev => [newNotif, ...prev]);

                        // Add audit log
                        addAuditLog(
                          "Report Dispatched", 
                          `Automated ${focusTitle} sent to ${recStr}.`
                        );

                        setReportNotes("");
                        
                        // Auto clear success msg after 5s
                        setTimeout(() => {
                          setReportSentSuccess(false);
                        }, 5000);

                      }, 1500);
                    }}
                    disabled={isSendingReport}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-black text-xs py-3 rounded-xl transition-all shadow-md flex items-center justify-center space-x-2 cursor-pointer disabled:bg-slate-400 disabled:cursor-not-allowed text-center uppercase"
                  >
                    {isSendingReport ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>{isAmharic ? "በመላክ ላይ ነው..." : "Compiling & Transmitting Report..."}</span>
                      </>
                    ) : (
                      <>
                        <FileText size={14} />
                        <span>{isAmharic ? "ሪፖርት ላክ" : "Compile & Dispatch Report to Stakeholders"}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Success Animation Notification */}
            {reportSentSuccess && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl p-4 text-xs font-bold flex items-center space-x-3 shadow-xs animate-fadeIn">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0 animate-bounce" />
                <div className="space-y-0.5">
                  <p>{isAmharic ? "ሪፖርት በተሳካ ሁኔታ ተልኳል!" : "Transmission Complete!"}</p>
                  <p className="text-[10px] text-slate-400 font-normal">
                    {isAmharic 
                      ? "የመገኘት፣ የትርፍ ሰዓትና የደመወዝ መረጃዎች ለቡድን መሪው፣ ሰዓት ቆጣሪውና ለዋናው መስሪያ ቤት በደህንነት ተልከዋል።" 
                      : `The compiled ${reportType} logs have been securely dispatched to the selected stakeholders. Audit trail updated.`}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* MASTER SUMMARY PREVIEW FOR PRINTING */}
          <div className="border border-slate-200 rounded-xl p-6 space-y-6 bg-white no-print">
            <div className="text-center space-y-1">
              <Building2 size={24} className="mx-auto text-red-600" />
              <h4 className="text-sm font-extrabold text-slate-950 uppercase tracking-widest">OVID GROUP REAL ESTATE</h4>
              <h5 className="text-xs font-bold text-slate-600">Bole Heights Aluminum Formwork Site B1</h5>
              <p className="text-[10px] text-slate-400">Payroll Calculation Summary Ledger | July 2026</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200/40">
              <div>
                <span className="text-slate-400 block uppercase font-bold text-[9px] tracking-wider">Report Date</span>
                <span className="font-bold text-slate-800">July 9, 2026</span>
              </div>
              <div>
                <span className="text-slate-400 block uppercase font-bold text-[9px] tracking-wider"> Roster Size</span>
                <span className="font-bold text-slate-800">{workers.length} Tracked Staff</span>
              </div>
              <div>
                <span className="text-slate-400 block uppercase font-bold text-[9px] tracking-wider">Payroll Period</span>
                <span className="font-bold text-slate-800">Monthly Billing</span>
              </div>
              <div>
                <span className="text-slate-400 block uppercase font-bold text-[9px] tracking-wider">Compiled By</span>
                <span className="font-bold text-slate-800">OVID AI Smart Engine</span>
              </div>
            </div>

            {/* QUICK PREVIEW TABLE */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold">
                    <th className="pb-2">Department</th>
                    <th className="pb-2 text-center">FTE Count</th>
                    <th className="pb-2 text-right">Base Total</th>
                    <th className="pb-2 text-right">Overtime Pay</th>
                    <th className="pb-2 text-right text-amber-600">Shortage Ded.</th>
                    <th className="pb-2 text-right text-slate-800">Net Payable</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  <tr>
                    <td className="py-2.5 font-semibold">Formwork Installation</td>
                    <td className="py-2.5 text-center font-mono">12</td>
                    <td className="py-2.5 text-right font-mono">{maskValue(186000)}</td>
                    <td className="py-2.5 text-right font-mono text-emerald-600">+{maskValue(14800)}</td>
                    <td className="py-2.5 text-right font-mono text-amber-600">-{maskValue(2400)}</td>
                    <td className="py-2.5 text-right font-bold font-mono text-slate-900">{maskValue(198400)}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-semibold">Quality & Supervision</td>
                    <td className="py-2.5 text-center font-mono">5</td>
                    <td className="py-2.5 text-right font-mono">{maskValue(110000)}</td>
                    <td className="py-2.5 text-right font-mono text-emerald-600">+{maskValue(4200)}</td>
                    <td className="py-2.5 text-right font-mono text-amber-600">-{maskValue(0)}</td>
                    <td className="py-2.5 text-right font-bold font-mono text-slate-900">{maskValue(114200)}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-semibold">Safety Control</td>
                    <td className="py-2.5 text-center font-mono">3</td>
                    <td className="py-2.5 text-right font-mono">{maskValue(54000)}</td>
                    <td className="py-2.5 text-right font-mono text-emerald-600">+{maskValue(1200)}</td>
                    <td className="py-2.5 text-right font-mono text-amber-600">-{maskValue(600)}</td>
                    <td className="py-2.5 text-right font-bold font-mono text-slate-900">{maskValue(54600)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 5: AUTOMATED SYSTEM NOTIFICATIONS --- */}
      {activeTab === "notifications" && (
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs p-6 space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">{isAmharic ? "ስማርት ማሳወቂያዎች ማዕከል" : "Payroll Alert & Notification Dispatch Desk"}</h3>
            <p className="text-xs text-slate-500">
              {isAmharic 
                ? "ለትርፍ ሰዓት ፍቃድ ጥያቄዎች፣ ላልተሟሉ የስራ ሰዓቶች፣ ለደመወዝ ክፍያ ዝግጅቶች እና ለሰራተኛ ክፍያ ወረቀት መድረስ የደረሱ ማሳወቂያዎች።"
                : "Automatic dispatches alerting Site Supervisor, PM, and Head Office regarding overtime peaks, undertime deductions, slip generation, and missing terminal syncs."}
            </p>
          </div>

          <div className="space-y-3">
            {notifications.map((n) => (
              <div 
                key={n.id} 
                className={`p-4 rounded-xl border transition-all flex items-start gap-3 ${
                  n.read ? "bg-slate-50/50 border-slate-100" : "bg-red-50/20 border-red-100"
                }`}
              >
                <div className="p-2 bg-white rounded-lg border border-slate-100 text-red-500 shrink-0">
                  {n.type === "payroll_ready" && <FileText size={16} />}
                  {n.type === "overtime_request" && <TrendingUp size={16} className="text-emerald-500" />}
                  {n.type === "undertime_alert" && <TrendingDown size={16} className="text-amber-500" />}
                  {n.type === "payslip" && <Bell size={16} className="text-slate-400" />}
                  {n.type === "approved" && <CheckCircle2 size={16} className="text-emerald-600" />}
                </div>

                <div className="flex-grow space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-900 text-xs">{n.title}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{n.timestamp}</span>
                  </div>
                  <p className="text-xs text-slate-600">{n.message}</p>
                  
                  <div className="flex items-center gap-2 pt-1.5">
                    <span className="text-[9px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                      To: {n.recipient}
                    </span>
                    {!n.read && (
                      <button 
                        onClick={() => {
                          setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, read: true } : item));
                        }}
                        className="text-[10px] text-red-600 font-bold hover:underline cursor-pointer"
                      >
                        {isAmharic ? "እንደተነበበ ምልክት አድርግ" : "Mark as read"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- TAB 6: SECURITY & AUDIT TRAIL --- */}
      {activeTab === "security" && (
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs p-6 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-bold text-slate-900">{isAmharic ? "ደህንነት፣ የተጠቃሚ ፍቃድ ቁጥጥር እና የኦዲት መዝገብ" : "Security, RBAC Controls & Live Audit Ledger"}</h3>
            <p className="text-xs text-slate-500">
              {isAmharic 
                ? "የደመወዝ ውሂብን ሚስጥራዊነት ለማረጋገጥ የተጠቃሚዎች መብት፣ ምስጠራዎች እና ሙሉ የእንቅስቃሴዎች ማህደር መቆጣጠሪያ።"
                : "Role-Based Access Control matrix, simulated payroll data encryption keys, automated system diagnostics, and a cryptographic tamper-evident audit record."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* ACCESS RIGHT PANEL */}
            <div className="border border-slate-150 rounded-xl p-4 space-y-4">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-1.5">
                <Lock size={14} className="text-red-500" />
                <span>{isAmharic ? "ሚናን መሠረት ያደረገ የመብት ማረጋገጫ (RBAC)" : "Role-Based Access Permission (RBAC)"}</span>
              </h4>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center p-2 rounded bg-slate-50">
                  <span className="font-bold text-slate-800">Head Office</span>
                  <span className="text-emerald-600 font-black text-[10px] uppercase">Full Control, Approval & Disbursement</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded bg-slate-50">
                  <span className="font-bold text-slate-800">Payroll Officer</span>
                  <span className="text-emerald-600 font-black text-[10px] uppercase">Read, Compile, Adjust Allowances</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded bg-slate-50">
                  <span className="font-bold text-slate-800">Project Manager / Supervisor</span>
                  <span className="text-amber-600 font-black text-[10px] uppercase">Verify Overtime & Attendance Only</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded bg-slate-50">
                  <span className="font-bold text-slate-800">Time Keeper</span>
                  <span className="text-slate-500 font-black text-[10px] uppercase">Read Only, No Financial Adjustments</span>
                </div>
              </div>

              <div className="p-3 bg-red-50 text-red-800 rounded-xl border border-red-100 text-[11px] leading-relaxed flex items-start gap-2">
                <ShieldAlert size={14} className="text-red-500 shrink-0 mt-0.5" />
                <span>
                  {isAmharic 
                    ? "ደህንነት ማስጠንቀቂያ: የአሁኑ ሚናዎ '" + currentUserRole + "' ነው። መብትዎ ከላይ በተጠቀሱት ህጎች መሰረት ቁጥጥር ይደረግበታል።"
                    : "Security Notice: Your current active session is '" + currentUserRole + "'. Visual elements and approval triggers adapt organically."}
                </span>
              </div>
            </div>

            {/* ENCRYPTION & DATA SANITY */}
            <div className="border border-slate-150 rounded-xl p-4 space-y-4 bg-slate-50/40">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-1.5">
                <Database size={14} className="text-emerald-500 animate-pulse" />
                <span>{isAmharic ? "ምስጠራ እና የስርዓት ደህንነት ሁኔታ" : "Data Integrity & Encryption Keys"}</span>
              </h4>

              <div className="space-y-3.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Database Encryption Status</span>
                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                    <CheckCircle2 size={12} /> AES-256 Enabled
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">SHA-256 Roster Integrity Check</span>
                  <span className="font-mono text-slate-600">VERIFIED (OK)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Automatic Backup Schedule</span>
                  <span className="text-slate-600 font-bold">Every 12 Hours (Local Sync)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">API Bank Connection (Telebirr/CBE)</span>
                  <span className="text-emerald-600 font-bold">Online & Active</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200">
                <button
                  onClick={() => alert("Manual encryption handshake completed successfully. Cryptographic key rotated.")}
                  className="w-full bg-slate-900 text-white font-bold text-xs py-2 rounded-lg hover:bg-slate-800 transition-all cursor-pointer text-center block"
                >
                  Rotate Cryptographic Keys
                </button>
              </div>
            </div>

          </div>

          {/* DYNAMIC AUDIT TRAIL */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-1.5">
              <Layers size={14} className="text-red-500" />
              <span>{isAmharic ? "ቀጥታ የክፍያ ስራ የኦዲት መዝገብ" : "Tamper-Evident Payroll Audit Log"}</span>
            </h4>

            <div className="border border-slate-150 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-150">
                    <th className="p-3">Log ID</th>
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">User & Role</th>
                    <th className="p-3">Action</th>
                    <th className="p-3">Details</th>
                    <th className="p-3 text-right">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                  {auditTrail.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/40">
                      <td className="p-3 font-mono font-bold text-slate-900">{log.id}</td>
                      <td className="p-3 font-mono text-slate-500">{log.timestamp}</td>
                      <td className="p-3">
                        <span className="font-bold text-slate-800 block">{log.actorName}</span>
                        <span className="text-[9px] text-slate-400 font-bold uppercase">{log.actorRole}</span>
                      </td>
                      <td className="p-3 text-red-600 font-bold">{log.action}</td>
                      <td className="p-3 text-slate-500 max-w-[200px] truncate">{log.details}</td>
                      <td className="p-3 text-right font-mono text-slate-400">{log.ip}</td>
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
