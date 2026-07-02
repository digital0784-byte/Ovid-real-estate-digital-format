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
  UserCheck
} from "lucide-react";
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

  return (
    <div className="space-y-6">
      
      {/* Tab Panels Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* LEFT COLUMN: SAFETY MANAGEMENT */}
        <div className="space-y-6">
          
          {/* Safety Module Input Card */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4 text-xs">
            <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
              <ShieldAlert className="text-emerald-600" size={20} />
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
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800 outline-none" 
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
                    placeholder="e.g., Scaffolding work without safety harness locked"
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800 outline-none" 
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Unsafe Condition Noted (Optional)</label>
                  <input 
                    type="text" 
                    value={unsafeConditionInput} 
                    onChange={e => setUnsafeConditionInput(e.target.value)}
                    placeholder="e.g., Debris block on Floor 4 Zone B stairs"
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800 outline-none" 
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors"
              >
                Log Safety Checklist
              </button>
            </form>
          </div>

          {/* Safety History / Toolbox logs */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Safety logs history</h3>
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
                  
                  {log.unsafeActs.length > 0 && (
                    <div className="text-amber-700 flex items-start space-x-1 font-semibold">
                      <AlertTriangle size={12} className="mt-0.5" />
                      <span>Act: {log.unsafeActs[0]}</span>
                    </div>
                  )}

                  {log.unsafeConditions.length > 0 && (
                    <div className="text-amber-700 flex items-start space-x-1 font-semibold">
                      <AlertTriangle size={12} className="mt-0.5" />
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
            <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
              <CheckCircle className="text-blue-600" size={20} />
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
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800 outline-none"
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
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800 outline-none"
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
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800 outline-none" 
                />
              </div>

              <button 
                type="submit" 
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors"
              >
                File Snag Report
              </button>
            </form>
          </div>

          {/* Active Defects Snag List & Repair Tracking */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center justify-between">
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
                        className="px-2 py-1 bg-emerald-600 text-white rounded font-bold hover:bg-emerald-700 flex items-center space-x-1 transition-colors"
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

    </div>
  );
};
