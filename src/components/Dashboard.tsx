import React, { useMemo } from "react";
import { 
  Users, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  Calendar, 
  ShieldAlert, 
  Award, 
  ChevronRight, 
  Layers,
  Clock,
  ThumbsUp,
  Activity,
  Star,
  MapPin,
  TrendingDown
} from "lucide-react";
import { Worker, Team, ProjectZone, AttendanceRecord, UserRole, PerformanceEvaluation } from "../types";
import { BiometricHeatmap } from "./BiometricHeatmap";

interface DashboardProps {
  workers: Worker[];
  teams: Team[];
  zones: ProjectZone[];
  attendance: AttendanceRecord[];
  isAmharic: boolean;
  t: (key: string) => string;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUserRole: UserRole;
  evaluations: PerformanceEvaluation[];
  onAddAttendance?: (record: AttendanceRecord) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  workers,
  teams,
  zones,
  attendance,
  isAmharic,
  t,
  setActiveTab,
  currentUserRole,
  evaluations,
  onAddAttendance
}) => {
  // Compute Stats
  const totalWorkers = workers.length;
  const presentCount = attendance.filter(a => a.status === "Present" || a.status === "Late").length;
  const absentCount = attendance.filter(a => a.status === "Absent").length;
  const lateCount = attendance.filter(a => a.status === "Late").length;
  const leaveCount = attendance.filter(a => a.status === "Leave").length;

  const activeZonesCount = zones.filter(z => z.status === "In Progress").length;
  const delayedZonesCount = zones.filter(z => z.status === "Delayed" || (z.status === "In Progress" && z.completionPercentage < 60)).length;
  const completedZonesCount = zones.filter(z => z.status === "Completed").length;

  // Dynamic role-specific calculations for the employee management module
  const roleWorkers = useMemo(() => {
    switch (currentUserRole) {
      case UserRole.GANG_CHIEF:
        return workers.filter(w => w.zone === "Zone B" || w.gangChief === "Fikru Tolossa");
      case UserRole.TEAM_LEADER:
        return workers.filter(w => w.zone === "Zone A" || w.teamLeader === "Yohannes Bekele");
      case UserRole.SUPERVISOR:
        return workers.filter(w => w.floor === 4 || w.supervisor === "Kassa Hunegn");
      default:
        return workers; // Head Office & Time Keeper see all
    }
  }, [currentUserRole, workers]);

  const roleWorkersCount = roleWorkers.length;

  const roleAttendance = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const workerIds = roleWorkers.map(w => w.id);
    return attendance.filter(a => workerIds.includes(a.workerId) && a.date === today);
  }, [roleWorkers, attendance]);

  const rolePresent = roleAttendance.filter(a => a.status === "Present" || a.status === "Late").length;
  const roleLate = roleAttendance.filter(a => a.status === "Late").length;
  const roleAbsent = Math.max(0, roleWorkersCount - rolePresent);

  const roleAvgPerf = useMemo(() => {
    const workerIds = roleWorkers.map(w => w.id);
    const workerEvals = evaluations.filter(ev => workerIds.includes(ev.workerId));
    if (workerEvals.length === 0) return 82;
    return Math.round(workerEvals.reduce((acc, ev) => acc + ev.totalScore, 0) / workerEvals.length);
  }, [roleWorkers, evaluations]);

  const sortedPerformers = useMemo(() => {
    return [...roleWorkers].map(w => {
      const evs = evaluations.filter(e => e.workerId === w.id);
      const avgScore = evs.length > 0 ? Math.round(evs.reduce((sum, e) => sum + e.totalScore, 0) / evs.length) : 82;
      return { ...w, score: avgScore };
    }).sort((a, b) => b.score - a.score);
  }, [roleWorkers, evaluations]);

  const topPerformer = sortedPerformers[0];
  const lowPerformer = sortedPerformers[sortedPerformers.length - 1];

  // Zone distribution
  const zoneDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    roleWorkers.forEach(w => {
      const z = w.zone || "Zone A";
      counts[z] = (counts[z] || 0) + 1;
    });
    return Object.entries(counts).map(([zone, count]) => ({ zone, count }));
  }, [roleWorkers]);

  // Average safety score from teams
  const avgSafetyScore = Math.round(teams.reduce((acc, t) => acc + t.safetyScore, 0) / teams.length) || 92;
  const avgQualityScore = Math.round(teams.reduce((acc, t) => acc + t.qualityScore, 0) / teams.length) || 88;

  // Calculate Overall project progress (completion % of all zones)
  const totalPercentage = zones.reduce((acc, z) => acc + z.completionPercentage, 0);
  const overallProgress = Math.round(totalPercentage / zones.length) || 0;

  // Formwork output data for interactive SVG chart (panel installation trend over last 5 days)
  const panelOutputTrend = [
    { day: "Mon", panels: 45 },
    { day: "Tue", panels: 60 },
    { day: "Wed", panels: 55 },
    { day: "Thu", panels: 72 },
    { day: "Fri", panels: 80 }
  ];

  const maxPanels = 100;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 text-white overflow-hidden shadow-xl border border-slate-700">
        <div className="absolute right-0 top-0 opacity-10">
          <Layers size={250} />
        </div>
        <div className="relative z-10 space-y-2">
          <div className="flex items-center space-x-2">
            <span className="bg-red-600 text-xs uppercase tracking-widest font-semibold px-2.5 py-1 rounded-full">
              Digital Construction ERP System
            </span>
            <span className="flex items-center space-x-1 text-slate-400 text-xs bg-slate-800 px-2 py-1 rounded">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>{isAmharic ? "ኦንላይን" : "Online/Synced"}</span>
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white font-sans">
            {isAmharic ? "አሉሚኒየም ፎርምወርክ ቁጥጥር" : "Aluminum Formwork Attendance & Productivity"}
          </h1>
          <p className="text-slate-300 text-sm max-w-2xl font-sans">
            {isAmharic 
              ? "የዲጂታል ኮንስትራክሽን ERP ሲስተም መገኘት፣ ምርታማነት፣ ደህንነት እና ጥራት ቁጥጥር በቴክኖሎጂ የተደገፈ ትንበያ ሲስተም።"
              : "Digital Construction ERP's digital command center monitoring real-time cycle times, daily safety audits, spatial workforce allocations, and AI-driven completion predictions."}
          </p>
        </div>
      </div>

      {/* ROLE-BASED COCKPIT PANEL & AUDIT HEURISTIC */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-red-100 text-red-700 border border-red-200">
              {isAmharic ? "ወቅታዊ የተግባር መለያ" : "Active Role Cockpit"}
            </span>
            <h3 className="text-lg font-bold text-slate-800 flex items-center space-x-2">
              <span>{isAmharic ? "የሥራ ድርሻ እና የተጠቃሚ መግለጫ" : "Authorized Session Console"}</span>
              <span className="text-slate-400 font-normal">|</span>
              <span className="text-red-600 text-sm font-mono">{currentUserRole}</span>
            </h3>
          </div>
          
          <div className="text-xs text-slate-500 font-semibold bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            {isAmharic ? "ደረጃ እና ኃላፊነት:" : "Authority Matrix:"} <span className="text-red-600 font-mono">
              {currentUserRole === UserRole.HEAD_OFFICE ? "Tier-1 (Executive)" :
               currentUserRole === UserRole.TIME_KEEPER ? "Tier-2 (Roster Controller)" :
               currentUserRole === UserRole.TEAM_LEADER ? "Tier-3 (Scheduling & Operations)" :
               currentUserRole === UserRole.GANG_CHIEF ? "Tier-4 (Crew Foreman)" : "Tier-5 (Field Specialist)"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Profile Info */}
          <div className="space-y-3 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-black flex items-center justify-center text-sm shadow-xs">
                {currentUserRole === UserRole.HEAD_OFFICE ? "EY" :
                 currentUserRole === UserRole.TIME_KEEPER ? "AG" :
                 currentUserRole === UserRole.TEAM_LEADER ? "YB" :
                 currentUserRole === UserRole.GANG_CHIEF ? "FT" : "BT"}
              </div>
              <div>
                <span className="font-bold text-slate-800 block text-sm">
                  {currentUserRole === UserRole.HEAD_OFFICE ? "Eng. Yoseph" :
                   currentUserRole === UserRole.TIME_KEEPER ? "Abebe Girma" :
                   currentUserRole === UserRole.TEAM_LEADER ? "Yohannes Bekele" :
                   currentUserRole === UserRole.GANG_CHIEF ? "Fikru Tolossa" : "Bekele Tesfaye"}
                </span>
                <span className="text-[11px] text-slate-500 font-mono block">
                  ID: {currentUserRole === UserRole.HEAD_OFFICE ? "Digital Construction ERP-HO-01" :
                       currentUserRole === UserRole.TIME_KEEPER ? "Digital Construction ERP-TK-01" :
                       currentUserRole === UserRole.TEAM_LEADER ? "Digital Construction ERP-TL-01" :
                       currentUserRole === UserRole.GANG_CHIEF ? "Digital Construction ERP-GC-01" : "ERP-W-101"}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-sans">
              {currentUserRole === UserRole.HEAD_OFFICE && (
                isAmharic 
                  ? "የዋና መስሪያ ቤት ኃላፊ ሙሉ ቁጥጥር ያለው ሲሆን የግንባታ ፎቆችን ማቀድ፣ ሰራተኞችን ማስተዳደር፣ ደመወዝ ማጽደቅ እና አጠቃላይ ምርታማነትን መከታተል ይችላል።"
                  : "Head Office has absolute command. Authorized to allocate construction blocks, manage rosters, authorize structural schedules, sign off payroll, and monitor project margins."
              )}
              {currentUserRole === UserRole.TIME_KEEPER && (
                isAmharic 
                  ? "የመገኘት ተቆጣጣሪው የቡድን መሪዎችን፣ ጋንግ ቺፎችን እና ሳይት ሰራተኞችን የመገኘት ቁጥጥር ይቆጣጠራል። የመለያ ስህተቶችን ማስተካከል እና ሪፖርት ማውጣት ይችላል።"
                  : "Time Keepers manage physical roster entries, biometrics audits, check-in corrections, GPS geofencing exceptions, and overall manpower ratios."
              )}
              {currentUserRole === UserRole.TEAM_LEADER && (
                isAmharic 
                  ? "የስራ ቡድን መሪው የአሉሚኒየም ፎርምወርክ ጊዜ ሰሌዳዎችን ያቅዳል፣ የፓነል ገጠማ ምርታማነትን ይቆጣጠራል፣ እና የእለት ምዝግብ ሪፖርት ለተቆጣጣሪ ያቀርባል።"
                  : "Team Leaders are responsible for physical aluminum formwork schedules, locking pin material logs, panel assembly pace, and scaffolding safety compliance."
              )}
              {currentUserRole === UserRole.GANG_CHIEF && (
                isAmharic 
                  ? "ጋንግ ቺፉ (ፎርማን) የእለት ከእለት የአሉሚኒየም ፓነል ስራዎችን ያስመዘግባል፣ የጥራት ጉድለቶችን (snags) ይለያል፣ እና የደህንነት ስልጠናዎችን (toolbox talks) ይመራል።"
                  : "Gang Chiefs (Foremen) command crews, log actual counts of panels locked/stripped, report alignment defects, and hold site toolbox safety brief talks."
              )}
              {currentUserRole === UserRole.WORKER && (
                isAmharic 
                  ? "የሳይት ሰራተኛው የግል መገኘት ሰዓቱን ያያል፣ በየእለቱ በሚሰራው ስራ ላይ የተሰጠውን የምርታማነት ውጤት ደረጃ እና የስራ ውጤት መከታተል ይችላል።"
                  : "Workers have personal portal access. View daily biometric clock-ins, assigned scaffolding zone coordinates, and personal performance tier rating."
              )}
            </p>
          </div>

          {/* Graphical Reporting Hierarchy Map */}
          <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 flex flex-col justify-center space-y-3">
            <span className="text-[10px] block uppercase text-slate-400 font-extrabold tracking-widest text-center font-sans">
              {isAmharic ? "ሪፖርት የማቅረብ ተዋረድ" : "Reporting Hierarchy Tree"}
            </span>
            <div className="flex flex-col space-y-1.5 max-w-xs mx-auto w-full font-sans">
              {[
                { role: UserRole.HEAD_OFFICE, name: isAmharic ? "ዋና መስሪያ ቤት (Director)" : "Head Office (Tier 1)" },
                { role: UserRole.TIME_KEEPER, name: isAmharic ? "መገኘት ተቆጣጣሪ (Time Keeper)" : "Time Keeper (Tier 2)" },
                { role: UserRole.TEAM_LEADER, name: isAmharic ? "ቡድን መሪ (Team Leader)" : "Team Leader (Tier 3)" },
                { role: UserRole.GANG_CHIEF, name: isAmharic ? "ጋንግ ቺፍ (Gang Chief)" : "Gang Chief (Tier 4)" },
                { role: UserRole.WORKER, name: isAmharic ? "ሳይት ሰራተኛ (Worker)" : "Worker (Tier 5)" }
              ].map((node, index) => {
                const isActive = currentUserRole === node.role;
                return (
                  <div key={index} className="flex items-center">
                    <div className={`w-2 h-2 rounded-full mr-2 shrink-0 ${isActive ? "bg-red-600 ring-4 ring-red-100 animate-pulse" : "bg-slate-300"}`}></div>
                    <div className={`text-[11px] py-1 px-2.5 rounded-md border w-full text-left transition-all ${
                      isActive 
                        ? "bg-slate-950 border-slate-800 text-white font-bold" 
                        : "bg-white border-slate-100 text-slate-500 font-medium"
                    }`}>
                      {node.name}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Role-Based Quick Workflows */}
          <div className="space-y-3 bg-slate-50/50 p-4 rounded-xl border border-slate-100 flex flex-col justify-between">
            <div>
              <span className="text-[10px] block uppercase text-slate-400 font-extrabold tracking-widest font-sans">
                {isAmharic ? "የተፈቀዱ መግቢያዎች" : "Authorized Workflows"}
              </span>
              <p className="text-[11px] text-slate-500 mt-1 mb-3 font-sans">
                {isAmharic ? "በአሁኑ የሥራ ሚናዎ የተፈቀዱትን ክፍሎች በፍጥነት ለመክፈት ከታች ይጫኑ:" : "Quick launch panels permitted under your current credential level:"}
              </p>
            </div>

            <div className="space-y-1.5 font-sans">
              {currentUserRole === UserRole.HEAD_OFFICE && (
                <>
                  <button onClick={() => setActiveTab("admin")} className="w-full text-left px-3 py-2 bg-white hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-700 border border-slate-200 flex items-center justify-between cursor-pointer">
                    <span>👥 {isAmharic ? "የሰራተኞች አስተዳደር" : "Roster & Employee Hub"}</span>
                    <ChevronRight size={12} className="text-slate-400" />
                  </button>
                  <button onClick={() => setActiveTab("predictions")} className="w-full text-left px-3 py-2 bg-white hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-700 border border-slate-200 flex items-center justify-between cursor-pointer">
                    <span>🔮 {isAmharic ? "አይአይ ትንበያ ቁጥጥር" : "AI Forecast & Productivity Engine"}</span>
                    <ChevronRight size={12} className="text-slate-400" />
                  </button>
                  <button onClick={() => setActiveTab("auditLog")} className="w-full text-left px-3 py-2 bg-white hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-700 border border-slate-200 flex items-center justify-between cursor-pointer">
                    <span>🛡️ {isAmharic ? "የደህንነት ኦዲት መዝገብ" : "System Audit Trail"}</span>
                    <ChevronRight size={12} className="text-slate-400" />
                  </button>
                </>
              )}
              {currentUserRole === UserRole.TIME_KEEPER && (
                <>
                  <button onClick={() => setActiveTab("attendance")} className="w-full text-left px-3 py-2 bg-white hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-700 border border-slate-200 flex items-center justify-between cursor-pointer">
                    <span>⏰ {isAmharic ? "የዕለት ሰራተኞች መገኘት" : "Worker Attendance Registers"}</span>
                    <ChevronRight size={12} className="text-slate-400" />
                  </button>
                  <button onClick={() => setActiveTab("performance")} className="w-full text-left px-3 py-2 bg-white hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-700 border border-slate-200 flex items-center justify-between cursor-pointer">
                    <span>🏆 {isAmharic ? "የስራ ውጤት ግምገማ" : "Worker Performance Metrics"}</span>
                    <ChevronRight size={12} className="text-slate-400" />
                  </button>
                  <button onClick={() => setActiveTab("auditLog")} className="w-full text-left px-3 py-2 bg-white hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-700 border border-slate-200 flex items-center justify-between cursor-pointer">
                    <span>🛡️ {isAmharic ? "የደህንነት ኦዲት መዝገብ" : "System Audit Trail"}</span>
                    <ChevronRight size={12} className="text-slate-400" />
                  </button>
                </>
              )}
              {currentUserRole === UserRole.TEAM_LEADER && (
                <>
                  <button onClick={() => setActiveTab("planning")} className="w-full text-left px-3 py-2 bg-white hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-700 border border-slate-200 flex items-center justify-between cursor-pointer">
                    <span>📅 {isAmharic ? "የግንባታ የጊዜ ሰሌዳ" : "Formwork Gantt Planning"}</span>
                    <ChevronRight size={12} className="text-slate-400" />
                  </button>
                  <button onClick={() => setActiveTab("progress")} className="w-full text-left px-3 py-2 bg-white hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-700 border border-slate-200 flex items-center justify-between cursor-pointer">
                    <span>🏗️ {isAmharic ? "የእለት ፓነል ስራ ምዝገባ" : "Log Daily Panel Progress"}</span>
                    <ChevronRight size={12} className="text-slate-400" />
                  </button>
                  <button onClick={() => setActiveTab("safetyQuality")} className="w-full text-left px-3 py-2 bg-white hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-700 border border-slate-200 flex items-center justify-between cursor-pointer">
                    <span>⚠️ {isAmharic ? "ደህንነት እና ጥራት ቁጥጥር" : "Formwork Defects & Snags"}</span>
                    <ChevronRight size={12} className="text-slate-400" />
                  </button>
                </>
              )}
              {currentUserRole === UserRole.GANG_CHIEF && (
                <>
                  <button onClick={() => setActiveTab("progress")} className="w-full text-left px-3 py-2 bg-white hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-700 border border-slate-200 flex items-center justify-between cursor-pointer">
                    <span>🏗️ {isAmharic ? "የእለት ፓነል ገጠማ ቁጥር" : "Log Daily Panel Output"}</span>
                    <ChevronRight size={12} className="text-slate-400" />
                  </button>
                  <button onClick={() => setActiveTab("safetyQuality")} className="w-full text-left px-3 py-2 bg-white hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-700 border border-slate-200 flex items-center justify-between cursor-pointer">
                    <span>⚠️ {isAmharic ? "የጥራት ጉድለቶችን መመዝገብ" : "Log Site Defect Snags"}</span>
                    <ChevronRight size={12} className="text-slate-400" />
                  </button>
                </>
              )}
              {currentUserRole === UserRole.WORKER && (
                <>
                  <button onClick={() => setActiveTab("attendance")} className="w-full text-left px-3 py-2 bg-white hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-700 border border-slate-200 flex items-center justify-between cursor-pointer">
                    <span>⏰ {isAmharic ? "የእኔ መገኘት ሰሌዳ" : "My Clock-In Logs"}</span>
                    <ChevronRight size={12} className="text-slate-400" />
                  </button>
                  <button onClick={() => setActiveTab("progress")} className="w-full text-left px-3 py-2 bg-white hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-700 border border-slate-200 flex items-center justify-between cursor-pointer">
                    <span>🏗️ {isAmharic ? "የተመደብኩበት ዞን ማሳያ" : "My Scaffolding Zone Assignment"}</span>
                    <ChevronRight size={12} className="text-slate-400" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 📊 ROLE-SPECIFIC FIELD METRICS COCKPIT */}
      <div className="bg-slate-900 text-white rounded-2xl border border-slate-800 p-6 space-y-6 shadow-lg">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <span className="bg-red-600 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full tracking-wider">
              {isAmharic ? "የሥራ ድርሻ ጥልቅ መረጃዎች" : "Role KPI Analyzer"}
            </span>
            <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
              <Star className="text-yellow-500 fill-yellow-500" size={16} />
              <span>{isAmharic ? "በእርስዎ የሥራ ኃላፊነት ስር ያሉ ሰራተኞች እና ምርታማነት መረጃ" : `Field Metrics Cockpit for Acting ${currentUserRole}`}</span>
            </h3>
          </div>
          <div className="text-xs bg-slate-800 text-slate-300 px-3 py-1.5 rounded-lg font-mono border border-slate-700">
            Active Sync Location: <span className="text-red-500 font-bold">
              {currentUserRole === UserRole.HEAD_OFFICE || currentUserRole === UserRole.TIME_KEEPER ? "All Site Sectors" : "FL 4 Block B"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Stat 1: Total Assigned */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/60 space-y-2">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Assigned Roster</span>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-3xl font-black font-sans text-white">{roleWorkersCount}</span>
              <span className="text-xs text-slate-400">workers</span>
            </div>
            <p className="text-[10px] text-slate-500">Synchronized and active in your dashboard view.</p>
          </div>

          {/* Stat 2: Present Today */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/60 space-y-2">
            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">Present Today</span>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-3xl font-black font-sans text-emerald-400">{rolePresent}</span>
              <span className="text-xs text-slate-400">of {roleWorkersCount}</span>
            </div>
            <p className="text-[10px] text-slate-500">{roleLate} late arrival alerts clocked today.</p>
          </div>

          {/* Stat 3: Absent Today */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/60 space-y-2">
            <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider block">Absent Today</span>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-3xl font-black font-sans text-red-400">{roleAbsent}</span>
              <span className="text-xs text-slate-400">unreported</span>
            </div>
            <p className="text-[10px] text-slate-500">Requires attendance sheet verification.</p>
          </div>

          {/* Stat 4: Average Score */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/60 space-y-2">
            <span className="text-[10px] text-yellow-500 font-bold uppercase tracking-wider block">Average Performance</span>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-3xl font-black font-sans text-yellow-500">{roleAvgPerf}%</span>
              <span className="text-xs text-slate-400">grade</span>
            </div>
            <p className="text-[10px] text-slate-500">
              Grade: <span className="font-bold text-slate-300">{roleAvgPerf >= 85 ? "Very Good" : "Good"}</span>
            </p>
          </div>

          {/* Stat 5: Performer Alerts */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/60 text-[10px] text-slate-300 flex flex-col justify-between min-h-[100px]">
            <div>
              <span className="font-bold text-slate-400 uppercase tracking-wider block mb-1">Performer Highlights</span>
              {topPerformer && (
                <div className="flex justify-between items-center bg-slate-900 p-1.5 rounded">
                  <span className="text-emerald-400 font-bold">Top: {topPerformer.name.split(" ")[0]}</span>
                  <span className="font-mono text-white font-bold">{topPerformer.score}%</span>
                </div>
              )}
            </div>
            {lowPerformer && topPerformer !== lowPerformer ? (
              <div className="flex justify-between items-center bg-slate-900 p-1.5 rounded mt-1">
                <span className="text-amber-400 font-bold">Low: {lowPerformer.name.split(" ")[0]}</span>
                <span className="font-mono text-white font-bold">{lowPerformer.score}%</span>
              </div>
            ) : (
              <span className="text-slate-500 italic">No low deviation alerts.</span>
            )}
          </div>
        </div>

        {/* Zone Distribution breakdown list */}
        <div className="bg-slate-950/85 p-4 rounded-xl border border-slate-800 space-y-3">
          <span className="text-xs font-bold text-slate-300 block uppercase tracking-wider">👷 Zone-wise Employee Distribution (Active Sync Grouping)</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            {zoneDistribution.map(({ zone, count }) => (
              <div key={zone} className="flex items-center justify-between bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <span className="font-medium text-slate-400">{zone}</span>
                <span className="font-black bg-red-600/20 text-red-400 px-2 py-0.5 rounded font-sans">{count} workers</span>
              </div>
            ))}
            {zoneDistribution.length === 0 && (
              <span className="text-slate-500 italic">No workers assigned to active sectors.</span>
            )}
          </div>
        </div>
      </div>

      {/* Grid of Key Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Present Card */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Users size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">{t("Workers Present")}</p>
            <h3 className="text-2xl font-bold text-slate-900">{presentCount}</h3>
            <p className="text-xs text-emerald-600 font-semibold flex items-center mt-0.5">
              <span>{Math.round((presentCount / totalWorkers) * 100)}% {isAmharic ? "መገኘት" : "Rate"}</span>
            </p>
          </div>
        </div>

        {/* Absent / Late Card */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">{t("Late")} / {t("Absent")}</p>
            <h3 className="text-2xl font-bold text-slate-900">{lateCount} / {absentCount}</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {leaveCount} {t("Leave")}
            </p>
          </div>
        </div>

        {/* Active Zones */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Layers size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">{t("Active Zones")}</p>
            <h3 className="text-2xl font-bold text-slate-900">{activeZonesCount}</h3>
            <p className="text-xs text-blue-600 font-semibold mt-0.5">
              {completedZonesCount} {isAmharic ? "የተጠናቀቁ" : "Completed"}
            </p>
          </div>
        </div>

        {/* Delayed Zones */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-red-50 text-red-600 rounded-xl">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">{t("Delayed Zones")}</p>
            <h3 className="text-2xl font-bold text-slate-900">{delayedZonesCount}</h3>
            <p className="text-xs text-red-600 font-semibold mt-0.5">
              {isAmharic ? "ፈጣን ድጋፍ የሚሹ" : "Needs Intervention"}
            </p>
          </div>
        </div>
      </div>

      {/* BIOMETRIC REAL-TIME HEATMAP MODULE */}
      <BiometricHeatmap 
        workers={workers} 
        attendance={attendance} 
        isAmharic={isAmharic}
        onAddAttendance={onAddAttendance}
      />

      {/* Main Row: Progress Chart & Scores */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Progress and Chart - 2 columns on desktop */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">{isAmharic ? "ዕለታዊ የፓነል ገጠማ ምርታማነት" : "Daily Aluminum Panel Assembly Trend"}</h2>
              <p className="text-xs text-slate-500">{isAmharic ? "ባለፉት 5 ቀናት የተገጠሙ የፓነል ብዛት ማሳያ" : "Number of panels locked per day (sq.m equivalent)"}</p>
            </div>
            <span className="p-2 bg-slate-50 rounded-lg text-slate-600">
              <TrendingUp size={18} />
            </span>
          </div>

          {/* SVG Custom Chart */}
          <div className="relative h-48 w-full flex items-end justify-between px-2 pt-4 border-b border-slate-100">
            {/* Guide gridlines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-[10px] text-slate-300">
              <div className="border-b border-dashed border-slate-100 w-full pt-1">100 Panels</div>
              <div className="border-b border-dashed border-slate-100 w-full">50 Panels</div>
              <div>0</div>
            </div>

            {/* Render Bars */}
            {panelOutputTrend.map((item, index) => {
              const barHeight = `${(item.panels / maxPanels) * 100}%`;
              return (
                <div key={index} className="relative flex flex-col items-center flex-1 group z-10">
                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full mb-2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    {item.panels} Panels
                  </div>
                  {/* Visual Bar */}
                  <div 
                    className="w-10 bg-slate-800 group-hover:bg-red-600 rounded-t-lg transition-colors cursor-pointer"
                    style={{ height: barHeight }}
                  ></div>
                  <span className="text-[11px] font-medium text-slate-500 mt-2 font-mono">{item.day}</span>
                </div>
              );
            })}
          </div>

          {/* Project Completion Bar */}
          <div className="bg-slate-50 p-4 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-800 flex items-center space-x-1.5">
                <Layers size={16} className="text-slate-600" />
                <span>{isAmharic ? "አጠቃላይ የፎርምወርክ ፕሮጀክት ሂደት" : "Overall Aluminum Formwork Progress"}</span>
              </span>
              <span className="font-bold text-slate-900">{overallProgress}%</span>
            </div>
            <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden">
              <div 
                className="bg-red-600 h-full rounded-full transition-all duration-1000"
                style={{ width: `${overallProgress}%` }}
              ></div>
            </div>
            <p className="text-[11px] text-slate-500">
              {isAmharic 
                ? "* በ 20 ፎቆች ውስጥ ካሉት ዞኖች ማጠናቀቂያ አንፃር የተሰላ" 
                : "* Calculated across all planned building blocks, towers, and structural zones."}
            </p>
          </div>
        </div>

        {/* Quality, Safety Index & Mini KPI Indicators */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-6">
          <h2 className="text-lg font-bold text-slate-900">{isAmharic ? "የደህንነት እና ጥራት ደረጃ" : "Safety & Quality Audit Index"}</h2>
          
          {/* Circular Gauges */}
          <div className="grid grid-cols-2 gap-4">
            
            {/* Safety Score Circular Widget */}
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="relative w-24 h-24 flex items-center justify-center">
                {/* SVG Radial circle */}
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="48" cy="48" r="40" stroke="#f1f5f9" strokeWidth="8" fill="transparent" />
                  <circle cx="48" cy="48" r="40" stroke="#059669" strokeWidth="8" fill="transparent" 
                    strokeDasharray={251.2}
                    strokeDashoffset={251.2 - (251.2 * avgSafetyScore) / 100}
                  />
                </svg>
                <div className="absolute text-center">
                  <span className="text-lg font-extrabold text-slate-900">{avgSafetyScore}%</span>
                  <p className="text-[9px] text-emerald-600 font-bold uppercase tracking-wider">Safe</p>
                </div>
              </div>
              <span className="text-xs font-semibold text-slate-700">{t("Safety Score")}</span>
            </div>

            {/* Quality Score Circular Widget */}
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="relative w-24 h-24 flex items-center justify-center">
                {/* SVG Radial circle */}
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="48" cy="48" r="40" stroke="#f1f5f9" strokeWidth="8" fill="transparent" />
                  <circle cx="48" cy="48" r="40" stroke="#2563eb" strokeWidth="8" fill="transparent" 
                    strokeDasharray={251.2}
                    strokeDashoffset={251.2 - (251.2 * avgQualityScore) / 100}
                  />
                </svg>
                <div className="absolute text-center">
                  <span className="text-lg font-extrabold text-slate-900">{avgQualityScore}%</span>
                  <p className="text-[9px] text-blue-600 font-bold uppercase tracking-wider">Quality</p>
                </div>
              </div>
              <span className="text-xs font-semibold text-slate-700">{t("Quality Score")}</span>
            </div>

          </div>

          <div className="border-t border-slate-100 pt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between text-slate-600">
              <span className="flex items-center space-x-1.5">
                <ShieldAlert size={16} className="text-emerald-500" />
                <span>{isAmharic ? "ዕለታዊ ቶልቦክስ ስብሰባ" : "Daily Toolbox Meetings"}</span>
              </span>
              <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded font-semibold">
                {isAmharic ? "ተካሂዷል" : "Completed"}
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-600">
              <span className="flex items-center space-x-1.5">
                <AlertTriangle size={16} className="text-amber-500" />
                <span>{isAmharic ? "ያልተፈቱ የአሰላለፍ ጉድለቶች" : "Open Snags"}</span>
              </span>
              <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded font-semibold">
                2 {isAmharic ? "ጉድለቶች" : "Active"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Rankings: Top Workers & Top Teams */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Top Workers List */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
              <Award className="text-yellow-500" size={20} />
              <span>{t("Top Performing Workers")}</span>
            </h2>
            <button 
              onClick={() => setActiveTab("performance")}
              className="text-xs text-red-600 hover:text-red-700 font-semibold flex items-center space-x-1"
            >
              <span>{isAmharic ? "ሁሉንም አሳይ" : "View All"}</span>
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {workers.slice(0, 3).map((w, index) => {
              // Mock rank score
              const scores = [96, 94, 87];
              return (
                <div key={w.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center space-x-3">
                    <span className="w-6 h-6 flex items-center justify-center bg-slate-100 rounded-full text-xs font-bold text-slate-600 font-mono">
                      {index + 1}
                    </span>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-800">{w.name}</h4>
                      <p className="text-[11px] text-slate-500 font-mono">{w.id} | {w.trade}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full">
                      {scores[index] || 85} Score
                    </span>
                    <p className="text-[10px] text-slate-400 mt-0.5">{isAmharic ? "እጅግ በጣም ጥሩ" : "Excellent"}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Teams List */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
              <Activity className="text-blue-500" size={20} />
              <span>{t("Top Performing Teams")}</span>
            </h2>
            <button 
              onClick={() => setActiveTab("performance")}
              className="text-xs text-red-600 hover:text-red-700 font-semibold flex items-center space-x-1"
            >
              <span>{isAmharic ? "ሁሉንም አሳይ" : "View All"}</span>
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {teams.slice(0, 3).map((team, index) => {
              return (
                <div key={team.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center space-x-3">
                    <span className="w-6 h-6 flex items-center justify-center bg-slate-100 rounded-full text-xs font-bold text-slate-600 font-mono">
                      {index + 1}
                    </span>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-800">{team.name}</h4>
                      <p className="text-[11px] text-slate-500">{team.department}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-full">
                      {team.averageProductivity}% Prod
                    </span>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {team.safetyScore}% Safety | {team.qualityScore}% Quality
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Ethiopian Site Location Banner */}
      <div className="bg-slate-50 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between border border-slate-100">
        <div className="flex items-center space-x-3 text-sm text-slate-600 mb-3 sm:mb-0">
          <Calendar size={18} className="text-red-600" />
          <span>
            {isAmharic 
              ? "የቦሌ ሃይትስ ሳይት - ግንባታ ሂደት ሪፖርት ማሳያ" 
              : "Bole Heights Construction Site Command Center – Sync active."}
          </span>
        </div>
        <span className="text-xs font-mono text-slate-400 bg-white px-3 py-1 rounded-full shadow-xs border border-slate-200">
          UTC: 2026-07-02
        </span>
      </div>
    </div>
  );
};
