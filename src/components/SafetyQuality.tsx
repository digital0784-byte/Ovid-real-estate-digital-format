import React, { useState } from "react";
import { 
  ShieldAlert, 
  CheckCircle, 
  AlertTriangle, 
  Plus, 
  Check, 
  Activity, 
  Flame, 
  HelpCircle, 
  Wrench,
  ThumbsUp,
  Sliders,
  UserCheck,
  Sparkles,
  RefreshCw,
  TrendingDown,
  Info,
  Calendar,
  AlertCircle,
  FileText,
  User,
  ShieldCheck,
  FileCheck,
  Download,
  AlertOctagon,
  ChevronRight,
  TrendingUp,
  Clock
} from "lucide-react";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid
} from "recharts";
import { SafetyLog, QualitySnag, QualityLog } from "../types";

interface SafetyQualityProps {
  safetyLogs: SafetyLog[];
  qualitySnags: QualitySnag[];
  qualityLogs: QualityLog[];
  onAddSafetyLog: (log: SafetyLog) => void;
  onAddSnag: (snag: QualitySnag) => void;
  onResolveSnag: (snagId: string) => void;
  isAmharic: boolean;
  t: (key: string) => string;
}

export const SafetyQuality: React.FC<SafetyQualityProps> = ({
  safetyLogs,
  qualitySnags,
  qualityLogs,
  onAddSafetyLog,
  onAddSnag,
  onResolveSnag,
  isAmharic,
  t
}) => {
  // Sub-tabs
  const [subTab, setSubTab] = useState<"audits" | "predictive">("audits");

  // Safety Form State
  const [toolboxTopic, setToolboxTopic] = useState("");
  const [attendees, setAttendees] = useState(15);
  const [ppePassed, setPpePassed] = useState(true);
  const [ppeDefects, setPpeDefects] = useState(0);
  const [nearMisses, setNearMisses] = useState(0);
  const [incidents, setIncidents] = useState(0);
  const [unsafeActInput, setUnsafeActInput] = useState("");
  const [unsafeConditionInput, setUnsafeConditionInput] = useState("");

  // Quality Form State
  const [selectedZoneId, setSelectedZoneId] = useState("B1-F04-ZB");
  const [snagDescription, setSnagDescription] = useState("");
  const [defectType, setDefectType] = useState<QualitySnag["defectType"]>("Formwork Alignment");

  // AI Safety State
  const [safetyPrediction, setSafetyPrediction] = useState<any>(null);
  const [loadingSafety, setLoadingSafety] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [safetyError, setSafetyError] = useState("");
  const [exportingReport, setExportingReport] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const safetyLoadingMessages = [
    "Analyzing historical near-miss reports & crew fatigue trends...",
    "Correlating open panel gaps and slurry leaks with structural shift loads...",
    "Evaluating compliance rates and unsafe height conditions...",
    "Mapping weather precipitation indices against concrete curing speeds...",
    "Synthesizing hazard warnings and custom toolbox outlines using Gemini..."
  ];

  // Handle Safety Form Submission
  const handleSafetySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!toolboxTopic.trim()) return;

    // Compute basic safety score (starts at 100, subtracts penalty for defects/incidents/unsafe acts)
    let score = 100;
    score -= (ppeDefects * 2);
    score -= (nearMisses * 5);
    score -= (incidents * 20);
    if (unsafeActInput.trim()) score -= 5;
    if (unsafeConditionInput.trim()) score -= 5;
    score = Math.max(0, score);

    const newLog: SafetyLog = {
      id: `SAF-${Date.now()}`,
      date: new Date().toISOString().split("T")[0],
      toolboxMeetingLogged: true,
      toolboxTopic,
      toolboxAttendeesCount: Number(attendees),
      ppeInspectionPassed: ppePassed,
      ppeDefectsCount: Number(ppeDefects),
      nearMissesCount: Number(nearMisses),
      incidentsCount: Number(incidents),
      unsafeActs: unsafeActInput.trim() ? [unsafeActInput.trim()] : [],
      unsafeConditions: unsafeConditionInput.trim() ? [unsafeConditionInput.trim()] : [],
      safetyScore: score,
      loggedBy: "Safety Officer Fikru"
    };

    onAddSafetyLog(newLog);

    // Reset Form
    setToolboxTopic("");
    setUnsafeActInput("");
    setUnsafeConditionInput("");
    setIncidents(0);
    setNearMisses(0);
    setPpeDefects(0);
  };

  // Handle Quality Snag addition
  const handleSnagSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!snagDescription.trim()) return;

    const newSnag: QualitySnag = {
      id: `SNAG-${Date.now()}`,
      zoneId: selectedZoneId,
      description: snagDescription,
      defectType,
      status: "Open",
      reportedDate: new Date().toISOString().split("T")[0],
      reportedBy: "Eng. Yoseph Hailu",
      assignedTo: "T-01" // Assembly Team Alpha
    };

    onAddSnag(newSnag);

    // Reset Form
    setSnagDescription("");
  };

  // Run AI Predictive Hazard Analysis
  const runSafetyPrediction = async () => {
    setLoadingSafety(true);
    setSafetyError("");
    setSafetyPrediction(null);
    setLoadingMsg(safetyLoadingMessages[0]);

    let msgIdx = 0;
    const interval = setInterval(() => {
      msgIdx = (msgIdx + 1) % safetyLoadingMessages.length;
      setLoadingMsg(safetyLoadingMessages[msgIdx]);
    }, 2500);

    try {
      const response = await fetch("/api/ai/predict-safety", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ safetyLogs, qualitySnags })
      });
      const data = await response.json();
      if (data.success) {
        setSafetyPrediction(data.data);
      } else {
        throw new Error(data.error || "Failed to retrieve safety hazards forecast.");
      }
    } catch (err) {
      console.error(err);
      setSafetyError(err instanceof Error ? err.message : "Safety intelligence temporarily offline.");
    } finally {
      clearInterval(interval);
      setLoadingSafety(false);
    }
  };

  // Simulate Report Export
  const handleExport = () => {
    setExportingReport(true);
    setExportSuccess(false);
    setTimeout(() => {
      setExportingReport(false);
      setExportSuccess(true);
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const audioCtx = new AudioCtx();
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.type = "sine";
          osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
          osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.15); // E5
          gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.4);
        }
      } catch (e) {
        console.error("Audio error", e);
      }
      setTimeout(() => setExportSuccess(false), 3000);
    }, 2000);
  };

  // Parse safety report markdown
  const parseMarkdown = (md: string) => {
    if (!md) return "";
    return md
      .replace(/^# (.*$)/gim, '<h1 class="text-lg font-bold text-slate-900 border-b pb-2 mb-3 mt-1">$1</h1>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xs font-bold text-slate-800 mt-4 mb-2 uppercase tracking-wider">$1</h2>')
      .replace(/^### (.*$)/gim, '<h3 class="text-xs font-semibold text-slate-800 mt-3 mb-1">$1</h3>')
      .replace(/^\* (.*$)/gim, '<li class="list-disc list-inside text-slate-600 mb-1 ml-2">$1</li>')
      .replace(/^- (.*$)/gim, '<li class="list-disc list-inside text-slate-600 mb-1 ml-2">$1</li>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900">$1</strong>')
      .replace(/\n/g, "<br />");
  };

  // Recharts Data preparation
  const chartData = [
    { name: "Week 24", nearMisses: 2, unsafeActs: 5, safetyScore: 88 },
    { name: "Week 25", nearMisses: 4, unsafeActs: 8, safetyScore: 82 },
    { name: "Week 26", nearMisses: 3, unsafeActs: 4, safetyScore: 92 },
    { name: "Week 27", nearMisses: 1, unsafeActs: 2, safetyScore: 95 },
    { 
      name: "Week 28 (Current)", 
      nearMisses: safetyLogs.reduce((acc, log) => acc + (log.nearMissesCount || 0), 0), 
      unsafeActs: safetyLogs.reduce((acc, log) => acc + (log.unsafeActs?.length || 0), 0),
      safetyScore: safetyLogs.length > 0 
        ? Math.round(safetyLogs.reduce((acc, log) => acc + log.safetyScore, 0) / safetyLogs.length) 
        : 100
    }
  ];

  return (
    <div className="space-y-6">
      
      {/* Header and Sub-Tab Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            {isAmharic ? "ደህንነት እና ጥራት ቁጥጥር ሞዱል" : "Digital Construction ERP Safety & Quality Control Center"}
          </h1>
          <p className="text-xs text-slate-500">
            {isAmharic 
              ? "የዕለታዊ ደህንነት ኦዲቶች፣ የመሳሪያ ስብሰባዎች፣ የስጋት ቅነሳ እና የአይአይ የደህንነት ትንበያዎችን ይቆጣጠሩ።"
              : "Track toolbox talk audits, equipment defects, active snags, and execute AI Predictive Hazard Forecasts."}
          </p>
        </div>

        {/* Sub-Tabs Selector */}
        <div className="flex bg-slate-100 p-1 rounded-xl self-start sm:self-center border border-slate-200">
          <button
            onClick={() => setSubTab("audits")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center space-x-1.5 ${
              subTab === "audits"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <ShieldAlert size={14} className={subTab === "audits" ? "text-emerald-600" : ""} />
            <span>{isAmharic ? "ኦዲቶች እና ሪፖርቶች" : "Daily Audits & Snags"}</span>
          </button>
          
          <button
            onClick={() => setSubTab("predictive")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center space-x-1.5 ${
              subTab === "predictive"
                ? "bg-slate-950 text-white shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Activity size={14} className="text-red-500 animate-pulse" />
            <span>{isAmharic ? "የአይአይ ደህንነት ትንበያ" : "Predictive Safety Risk AI"}</span>
          </button>
        </div>
      </div>

      {/* RENDER ACTIVE SUBTAB CONTENT */}
      {subTab === "audits" ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* LEFT COLUMN: SAFETY MANAGEMENT */}
          <div className="space-y-6">
            
            {/* Safety Module Input Card */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4 text-xs">
              <h2 className="text-base font-bold text-slate-950 flex items-center space-x-2">
                <ShieldAlert className="text-emerald-600" size={18} />
                <span>{isAmharic ? "ዕለታዊ የደህንነት መዝገብ ማስገቢያ" : "Daily Toolbox & Safety Audit"}</span>
              </h2>
              <p className="text-slate-500 text-[11px]">
                Record safety meetings, PPE inspections, near misses, incidents, and calculate compliance scores.
              </p>

              <form onSubmit={handleSafetySubmit} className="space-y-3 pt-1">
                {/* Toolbox topic */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Toolbox Meeting Topic</label>
                  <input 
                    type="text" 
                    value={toolboxTopic} 
                    onChange={e => setToolboxTopic(e.target.value)}
                    placeholder="e.g., Secure locking of wall formwork tie-rods"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800 outline-none focus:border-emerald-500" 
                  />
                </div>

                {/* Attendance and PPE counts */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Toolbox Attendees</label>
                    <input 
                      type="number" min="0" value={attendees} 
                      onChange={e => setAttendees(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800 outline-none" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Damaged PPE Noted</label>
                    <input 
                      type="number" min="0" value={ppeDefects} 
                      onChange={e => setPpeDefects(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800 outline-none" 
                    />
                  </div>
                </div>

                {/* Incidents & Near Misses */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-red-600">Near Misses Count</label>
                    <input 
                      type="number" min="0" value={nearMisses} 
                      onChange={e => setNearMisses(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800 outline-none" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-red-600">Actual Incidents Count</label>
                    <input 
                      type="number" min="0" value={incidents} 
                      onChange={e => setIncidents(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800 outline-none" 
                    />
                  </div>
                </div>

                {/* Unsafe acts / conditions inputs */}
                <div className="space-y-3 pt-1">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Unsafe Act Noted (Optional)</label>
                    <input 
                      type="text" 
                      value={unsafeActInput} 
                      onChange={e => setUnsafeActInput(e.target.value)}
                      placeholder="e.g., One worker failed to lock safety harness hook on scaffolding"
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800 outline-none focus:border-red-400" 
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Unsafe Condition Noted (Optional)</label>
                    <input 
                      type="text" 
                      value={unsafeConditionInput} 
                      onChange={e => setUnsafeConditionInput(e.target.value)}
                      placeholder="e.g., Debris block on Floor 4 Zone B stairs"
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800 outline-none focus:border-red-400" 
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Log Safety Checklist
                </button>
              </form>
            </div>

            {/* Safety History / Toolbox logs */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">{isAmharic ? "ያለፉ የደህንነት መዝገቦች" : "Safety Logs History"}</h3>
              <div className="space-y-3">
                {safetyLogs.map(log => (
                  <div key={log.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-800 font-mono">{log.date}</span>
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                        Safety Score: {log.safetyScore}%
                      </span>
                    </div>
                    <p className="font-medium text-slate-600">Topic: "{log.toolboxTopic}"</p>
                    
                    {log.unsafeActs && log.unsafeActs.length > 0 && (
                      <div className="text-red-700 flex items-start space-x-1.5 font-semibold">
                        <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" />
                        <span>Act: {log.unsafeActs[0]}</span>
                      </div>
                    )}

                    {log.unsafeConditions && log.unsafeConditions.length > 0 && (
                      <div className="text-amber-700 flex items-start space-x-1.5 font-semibold">
                        <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" />
                        <span>Condition: {log.unsafeConditions[0]}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: QUALITY AUDIT & SNAG LIST */}
          <div className="space-y-6">
            
            {/* Quality Snag Logger */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4 text-xs">
              <h2 className="text-base font-bold text-slate-950 flex items-center space-x-2">
                <CheckCircle className="text-blue-600" size={18} />
                <span>{t("Add Quality Snag")}</span>
              </h2>
              <p className="text-slate-500 text-[11px]">
                Log formwork defects (Honeycombing, Panel Alignment limits, Slurry leaks) and assign correction.
              </p>

              <form onSubmit={handleSnagSubmit} className="space-y-3 pt-1">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Target Zone ID</label>
                    <select 
                      value={selectedZoneId}
                      onChange={e => setSelectedZoneId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800 outline-none focus:border-blue-500"
                    >
                      <option value="B1-F04-ZA">Floor 4 - Zone A</option>
                      <option value="B1-F04-ZB">Floor 4 - Zone B</option>
                      <option value="B1-F03-ZA">Floor 3 - Zone A</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">{t("Defect Type")}</label>
                    <select 
                      value={defectType}
                      onChange={e => setDefectType(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800 outline-none focus:border-blue-500"
                    >
                      <option value="Formwork Alignment">Formwork Alignment</option>
                      <option value="Honeycombing">Honeycombing</option>
                      <option value="Panel Gap">Panel Gap</option>
                      <option value="Slurry Leak">Slurry Leak</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Defect Description</label>
                  <textarea 
                    rows={2} 
                    value={snagDescription}
                    onChange={e => setSnagDescription(e.target.value)}
                    placeholder="e.g., Slurry gap near the corner prop requires polytape locking."
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800 outline-none focus:border-blue-500" 
                  />
                </div>

                <button 
                  type="submit" 
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors cursor-pointer"
                >
                  File Snag Report
                </button>
              </form>
            </div>

            {/* Active Defects Snag List & Repair Tracking */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
              <h3 className="text-xs font-bold text-slate-900 flex items-center justify-between uppercase tracking-wider">
                <span>{isAmharic ? "የጥራት ጉድለቶች መዝገብ" : "Active Snags & Repair Status"}</span>
                <span className="bg-blue-50 text-blue-700 text-[10px] px-2.5 py-0.5 rounded-full font-bold">
                  {qualitySnags.filter(s => s.status !== "Resolved").length} Open Snags
                </span>
              </h3>

              <div className="space-y-3">
                {qualitySnags.map(snag => (
                  <div key={snag.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-2 text-xs">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="bg-slate-900 text-white text-[9px] font-bold px-1.5 py-0.5 rounded font-mono">
                          {snag.zoneId}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider ml-2">
                          {snag.defectType}
                        </span>
                      </div>

                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                        snag.status === "Resolved" ? "bg-emerald-100 text-emerald-800" :
                        snag.status === "In Progress" ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"
                      }`}>
                        {snag.status}
                      </span>
                    </div>

                    <p className="text-slate-700 font-medium font-sans">"{snag.description}"</p>

                    <div className="flex justify-between items-center border-t border-slate-100 pt-2 text-[10px] text-slate-500">
                      <span>Reported: {snag.reportedDate}</span>
                      {snag.status !== "Resolved" ? (
                        <button 
                          onClick={() => onResolveSnag(snag.id)}
                          className="px-2 py-1 bg-emerald-600 text-white rounded font-bold hover:bg-emerald-700 flex items-center space-x-1 transition-colors cursor-pointer"
                        >
                          <Check size={10} />
                          <span>Resolve Snag</span>
                        </button>
                      ) : (
                        <span className="text-emerald-600 font-bold flex items-center space-x-0.5">
                          <CheckCircle size={12} />
                          <span>Resolved</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      ) : (
        /* RENDER PREDICTIVE SAFETY AI MODULE */
        <div className="space-y-6">
          
          {/* Welcome Dashboard Block when no analysis is active */}
          {!safetyPrediction && !loadingSafety && (
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-red-950 rounded-2xl p-8 text-white relative overflow-hidden border border-red-900 shadow-xl">
              <div className="absolute right-0 top-0 opacity-5 transform translate-x-10 translate-y-[-10px]">
                <ShieldAlert size={350} />
              </div>

              <div className="relative z-10 max-w-2xl space-y-4">
                <div className="inline-flex items-center space-x-1.5 bg-red-600/30 text-red-300 border border-red-500/20 px-3 py-1 rounded-full text-[10px] font-extrabold tracking-widest uppercase">
                  <Activity size={12} className="animate-pulse" />
                  <span>PRECURSOR PATTERN MATCHING MODULE</span>
                </div>

                <h1 className="text-2xl font-black tracking-tight leading-none md:text-3xl">
                  {isAmharic ? "አይአይ ደህንነት ስጋት እና አደጋ ትንበያ" : "Digital Construction ERP AI Precursor-Based Safety Risk Forecaster"}
                </h1>
                
                <p className="text-slate-300 text-xs leading-relaxed">
                  {isAmharic 
                    ? "ይህ የደህንነት ትንበያ ሞጁል ያለፉ የደህንነት መዝገቦችን፣ ጥቃቅን አደጋዎችን፣ ያልተጠበቁ ድርጊቶችን እና የጥራት ጉድለቶችን በመገምገም የወደፊት አደጋዎችን ይተነብያል።"
                    : "This state-of-the-art diagnostic scanner correlates historical safety logs, Near-Miss events, reported Unsafe Acts, Unsafe Conditions, and active Quality Snags. By modeling incident precursor sequences, it isolates critical safety risks before they materialize on the floor plate."}
                </p>

                <div className="grid grid-cols-2 gap-4 text-xs pt-2">
                  <div className="flex items-start space-x-2">
                    <CheckCircle className="text-emerald-500 mt-0.5 flex-shrink-0" size={14} />
                    <div>
                      <span className="font-bold block">Incident Correlation</span>
                      <span className="text-[11px] text-slate-400">Traces causal paths of previous scaffold and alignment slips.</span>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <CheckCircle className="text-emerald-500 mt-0.5 flex-shrink-0" size={14} />
                    <div>
                      <span className="font-bold block">Proactive Recommendations</span>
                      <span className="text-[11px] text-slate-400">Specific safety instructions mapped by role (Engineer vs. Marshal).</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    onClick={runSafetyPrediction}
                    className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded-xl shadow-lg transition-all flex items-center space-x-2 uppercase tracking-wider cursor-pointer"
                  >
                    <Sparkles size={14} className="animate-pulse" />
                    <span>{isAmharic ? "የደህንነት ስጋት ትንበያን አስጀምር" : "Launch Safety Hazard Forecast"}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* LOADING STATE */}
          {loadingSafety && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center space-y-6">
              <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
                {/* Immersive pulsing radar rings */}
                <div className="absolute inset-0 rounded-full border-4 border-dashed border-red-600 animate-spin"></div>
                <div className="absolute w-20 h-20 rounded-full bg-red-50 border border-red-200 animate-ping opacity-75"></div>
                <ShieldAlert size={40} className="text-red-600 animate-pulse relative z-10" />
              </div>

              <div className="space-y-2 max-w-sm mx-auto">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest animate-pulse">Scanning Precursors</h3>
                <p className="text-xs text-slate-500 font-mono italic">
                  {loadingMsg}
                </p>
              </div>
            </div>
          )}

          {/* ERROR STATE */}
          {safetyError && (
            <div className="bg-red-50 text-red-800 p-4 rounded-xl border border-red-200 text-xs flex items-start space-x-3 max-w-xl mx-auto">
              <AlertOctagon className="text-red-600 mt-0.5 flex-shrink-0" size={16} />
              <div>
                <h4 className="font-bold">Forecast Execution Failed</h4>
                <p className="mt-1 text-slate-600">{safetyError}</p>
                <button 
                  onClick={runSafetyPrediction}
                  className="mt-2.5 px-3 py-1 bg-red-600 text-white rounded font-bold hover:bg-red-700 transition-colors"
                >
                  Retry Analysis
                </button>
              </div>
            </div>
          )}

          {/* PREDICTIVE AI RESULTS DASHBOARD */}
          {safetyPrediction && !loadingSafety && (
            <div className="space-y-6">
              
              {/* TOP ACTIONS AND SIMULATED Core Alert */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900 text-white p-4 rounded-2xl border border-slate-800">
                <div className="flex items-center space-x-2.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse"></span>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">AI Predictive Safety Core</span>
                    <span className="text-xs font-bold font-sans">Active Risk Warning & Mitigation Suite Loaded</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={runSafetyPrediction}
                    className="p-2 bg-slate-800 text-slate-300 hover:text-white rounded-lg hover:bg-slate-700 text-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
                    title="Recalculate safety logs correlation matrix"
                  >
                    <RefreshCw size={13} />
                    <span>Re-Analyze</span>
                  </button>

                  <button
                    onClick={handleExport}
                    disabled={exportingReport}
                    className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-xs flex items-center space-x-1.5 font-bold transition-colors cursor-pointer"
                  >
                    <Download size={13} />
                    <span>{exportingReport ? "Generating Report..." : "Export Safety Report"}</span>
                  </button>
                </div>
              </div>

              {/* EXPORT SUCCESS BANNER */}
              {exportSuccess && (
                <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 p-3.5 rounded-xl text-xs flex items-center justify-between">
                  <span className="flex items-center space-x-2 font-semibold">
                    <CheckCircle className="text-emerald-600" size={16} />
                    <span>Success: Predictive Safety Report successfully compiled as **Digital Construction ERP-SHIELD-REPORT.pdf**. Saved to downloads!</span>
                  </span>
                  <span className="text-[9px] bg-emerald-100 text-emerald-900 font-mono px-2 py-0.5 rounded font-bold">PDF / Excel</span>
                </div>
              )}

              {/* CORE METRICS AND ANALYSIS GRAPHS */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* SAFETY RISK INDEX DIAL */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between space-y-4">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Risk Severity Index</span>
                    <h3 className="text-base font-extrabold text-slate-900 flex items-center space-x-1.5">
                      <AlertTriangle className={safetyPrediction.overallRiskLevel === "High" ? "text-red-500" : "text-amber-500"} size={16} />
                      <span>Overall Safety Risk Score</span>
                    </h3>
                  </div>

                  <div className="py-2 flex items-baseline space-x-2">
                    <span className={`text-5xl font-black font-mono tracking-tight ${
                      safetyPrediction.overallRiskLevel === "High" ? "text-red-600" : "text-amber-600"
                    }`}>
                      {safetyPrediction.overallRiskScore}%
                    </span>
                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                      safetyPrediction.overallRiskLevel === "High" ? "bg-red-50 text-red-700 border border-red-100" : "bg-amber-50 text-amber-700 border border-amber-100"
                    }`}>
                      {safetyPrediction.overallRiskLevel} Risk
                    </span>
                  </div>

                  <p className="text-slate-500 text-[11px] leading-relaxed">
                    * Calculated by parsing active Near-Misses, un-cleared floor stairs, Scaffolding edge bypasses, and unreconciled panel structural gaps on Floor 4.
                  </p>
                </div>

                {/* HISTORICAL SAFETY TRENDS (RECHARTS) */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 md:col-span-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Log Correlation Matrix</span>
                      <h3 className="text-xs font-bold text-slate-900">Near Misses & Unsafe Acts Trends</h3>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">Augmented Weekly Aggregates</span>
                  </div>

                  <div className="h-32 pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#64748b" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 9, fill: "#64748b" }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ fontSize: 10, borderRadius: 8 }} />
                        <Legend iconSize={10} wrapperStyle={{ fontSize: 9 }} />
                        <Bar name="Near Misses" dataKey="nearMisses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                        <Bar name="Unsafe Acts logged" dataKey="unsafeActs" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>

              {/* WARNING ZONE HAZARDS DETAIL ROW */}
              <div className="space-y-3">
                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-widest flex items-center space-x-1.5">
                  <AlertCircle size={15} className="text-red-500" />
                  <span>Predicted Risk Ratings & Core Hazards by Zone</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {safetyPrediction.predictedRisksByZone.map((zone: any, idx: number) => (
                    <div key={idx} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="bg-slate-900 text-white font-mono font-black text-[10px] px-2 py-0.5 rounded">
                          {zone.zoneId}
                        </span>
                        
                        <div className="flex items-center space-x-1.5">
                          <span className="text-xs text-slate-400 font-mono font-bold">Score: {zone.riskScore}%</span>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                            zone.riskLevel === "High" ? "bg-red-50 text-red-700 border border-red-100" :
                            zone.riskLevel === "Medium" ? "bg-amber-50 text-amber-700 border border-amber-100" : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                          }`}>
                            {zone.riskLevel} Risk
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-xs">
                        <h4 className="font-bold text-slate-900 flex items-start space-x-1.5">
                          <Flame size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                          <span>Primary Hazard: {zone.primaryHazard}</span>
                        </h4>

                        <div className="pl-5 space-y-1 text-slate-500 text-[11px]">
                          <span className="font-bold block text-slate-400 uppercase tracking-wider text-[9px]">Precursor Contributing Factors:</span>
                          {zone.contributingFactors.map((cf: string, cfIdx: number) => (
                            <div key={cfIdx} className="flex items-start space-x-1">
                              <span className="text-red-500 mt-0.5">•</span>
                              <span>{cf}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* IDENTIFIED PATTERNS AND PRECURSORS ROW */}
              <div className="space-y-3">
                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-widest flex items-center space-x-1.5">
                  <Sliders size={15} className="text-amber-500" />
                  <span>Identified Precursor Chains & Incident Correlations</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {safetyPrediction.identifiedPatterns.map((pattern: any, idx: number) => (
                    <div key={idx} className="bg-amber-50/40 border border-amber-200/50 p-5 rounded-2xl space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <h4 className="font-black text-amber-900 flex items-center space-x-1.5">
                          <AlertTriangle size={14} className="text-amber-600" />
                          <span>{pattern.title}</span>
                        </h4>
                        <span className="bg-red-100 text-red-900 font-extrabold text-[9px] px-2 py-0.5 rounded">
                          {pattern.severityPotential}
                        </span>
                      </div>

                      <div className="space-y-1.5 text-slate-700 leading-relaxed text-[11px]">
                        <p><strong>Observed Precursor Sequence:</strong> {pattern.precursor}</p>
                        <p className="text-red-800"><strong>Predicted Incident Correlation:</strong> {pattern.incidentCorrelation}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* PROACTIVE RECOMMENDATIONS BY ROLE */}
              <div className="space-y-3">
                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-widest flex items-center space-x-1.5">
                  <UserCheck size={15} className="text-blue-500" />
                  <span>Proactive Role-Based Directives</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* SITE ENGINEERS PANEL */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
                    <div className="flex items-center space-x-2 border-b border-slate-50 pb-3">
                      <div className="h-7 w-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                        <Wrench size={16} />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-900">Directives for Site Engineers</h4>
                        <span className="text-[10px] text-slate-400">Technical, hardware & engineering controls</span>
                      </div>
                    </div>

                    <div className="space-y-3.5">
                      {safetyPrediction.proactiveRecommendations
                        .filter((r: any) => r.targetAudience === "Site Engineers")
                        .map((rec: any, idx: number) => (
                          <div key={idx} className="p-3 bg-blue-50/30 border border-blue-100 rounded-xl space-y-2 text-xs">
                            <div className="flex justify-between items-center">
                              <span className="bg-slate-900 text-white text-[9px] font-bold px-1.5 py-0.5 rounded font-mono">
                                {rec.zoneOrActivity}
                              </span>
                              <span className="text-red-600 font-extrabold text-[9px] bg-red-50 border border-red-100 px-1.5 py-0.2 rounded">
                                {rec.priority}
                              </span>
                            </div>
                            <p className="text-slate-700 font-medium font-sans">{rec.actionItem}</p>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* SUPERVISORS & FIELD MARSHALS */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
                    <div className="flex items-center space-x-2 border-b border-slate-50 pb-3">
                      <div className="h-7 w-7 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                        <UserCheck size={16} />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-900">Directives for Supervisors & Marshals</h4>
                        <span className="text-[10px] text-slate-400">Compliance audits, checks & shift directives</span>
                      </div>
                    </div>

                    <div className="space-y-3.5">
                      {safetyPrediction.proactiveRecommendations
                        .filter((r: any) => r.targetAudience === "Supervisors")
                        .map((rec: any, idx: number) => (
                          <div key={idx} className="p-3 bg-amber-50/20 border border-amber-200/50 rounded-xl space-y-2 text-xs">
                            <div className="flex justify-between items-center">
                              <span className="bg-slate-900 text-white text-[9px] font-bold px-1.5 py-0.5 rounded font-mono">
                                {rec.zoneOrActivity}
                              </span>
                              <span className="text-red-600 font-extrabold text-[9px] bg-red-50 border border-red-100 px-1.5 py-0.2 rounded">
                                {rec.priority}
                              </span>
                            </div>
                            <p className="text-slate-700 font-medium font-sans">{rec.actionItem}</p>
                          </div>
                        ))}
                    </div>
                  </div>

                </div>
              </div>

              {/* TOOLBOX TALKS EXECUTIVE BRIEFING BLOCK */}
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 space-y-4">
                <div className="flex items-center space-x-2.5 border-b border-slate-100 pb-4">
                  <div className="h-10 w-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-700">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">Weekly Safety Toolbox Briefing Guide</h3>
                    <p className="text-[11px] text-slate-500">AI-synthesized, highly specific site briefing guide targeting precursor risks.</p>
                  </div>
                </div>

                {/* Parsed Markdown briefing */}
                <div 
                  className="prose prose-sm max-w-none text-xs leading-relaxed space-y-2 text-slate-700 font-sans"
                  dangerouslySetInnerHTML={{ __html: parseMarkdown(safetyPrediction.weeklySafetyBriefingMarkdown) }}
                ></div>
              </div>

            </div>
          )}

        </div>
      )}

    </div>
  );
};
