import React, { useState } from "react";
import { 
  Plus, 
  Award, 
  TrendingUp, 
  Users, 
  Activity, 
  AlertTriangle, 
  Check, 
  Star,
  ShieldCheck,
  Zap,
  Clock
} from "lucide-react";
import { Worker, Team, PerformanceEvaluation } from "../types";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";

interface PerformanceProps {
  workers: Worker[];
  teams: Team[];
  evaluations: PerformanceEvaluation[];
  onAddEvaluation: (evaluation: PerformanceEvaluation) => void;
  isAmharic: boolean;
  t: (key: string) => string;
}

export const Performance: React.FC<PerformanceProps> = ({
  workers,
  teams,
  evaluations,
  onAddEvaluation,
  isAmharic,
  t
}) => {
  // Evaluation Form State
  const [selectedWorkerId, setSelectedWorkerId] = useState("");
  const [selectedMetric, setSelectedMetric] = useState<"productivity" | "quality" | "safety">("productivity");
  const [discipline, setDiscipline] = useState(18);
  const [quality, setQuality] = useState(18);
  const [productivity, setProductivity] = useState(18);
  const [safety, setSafety] = useState(14);
  const [equipmentHandling, setEquipmentHandling] = useState(9);
  const [teamwork, setTeamwork] = useState(9);
  const [attendance, setAttendance] = useState(5);
  const [comment, setComment] = useState("");

  const handleEvaluationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkerId) return;

    const worker = workers.find(w => w.id === selectedWorkerId);
    if (!worker) return;

    const total = discipline + quality + productivity + safety + equipmentHandling + teamwork + attendance;
    
    let level: PerformanceEvaluation["level"] = "Poor";
    if (total >= 95) level = "Excellent";
    else if (total >= 85) level = "Very Good";
    else if (total >= 70) level = "Good";
    else if (total >= 50) level = "Average";

    const newEvaluation: PerformanceEvaluation = {
      id: `EVAL-${Date.now()}`,
      workerId: worker.id,
      workerName: worker.name,
      date: new Date().toISOString().split("T")[0],
      discipline,
      quality,
      productivity,
      safetyCompliance: safety,
      equipmentHandling,
      teamwork,
      attendance,
      totalScore: total,
      level,
      comment,
      evaluatedBy: "Eng. Yoseph Hailu"
    };

    onAddEvaluation(newEvaluation);

    // Reset
    setSelectedWorkerId("");
    setComment("");
  };

  // Automatic Worker Ranking: calculate average performance score per worker
  const workerAverages = workers.map(w => {
    const workerEvals = evaluations.filter(ev => ev.workerId === w.id);
    const avgScore = workerEvals.length > 0 
      ? Math.round(workerEvals.reduce((acc, e) => acc + e.totalScore, 0) / workerEvals.length)
      : 80; // default baseline score if not evaluated recently
    
    let level = "Good";
    if (avgScore >= 95) level = "Excellent";
    else if (avgScore >= 85) level = "Very Good";
    else if (avgScore >= 70) level = "Good";
    else if (avgScore >= 50) level = "Average";
    else level = "Poor";

    return {
      worker: w,
      avgScore,
      level,
      evalsCount: workerEvals.length
    };
  }).sort((a, b) => b.avgScore - a.avgScore);

  // Automatic Team Ranking from metrics
  const sortedTeams = [...teams].sort((a, b) => {
    // Rank by composite score: average of safety, quality, and productivity
    const aComposite = (a.safetyScore + a.qualityScore + a.averageProductivity) / 3;
    const bComposite = (b.safetyScore + b.qualityScore + b.averageProductivity) / 3;
    return bComposite - aComposite;
  });

  return (
    <div className="space-y-6">
      
      {/* Performance Summary Banner */}
      <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <Award className="text-yellow-500" size={22} />
            <span>{isAmharic ? "ዕለታዊ የሰራተኞችና ቡድን ግምገማ" : "Formwork Performance & Leaderboard"}</span>
          </h2>
          <p className="text-xs text-slate-500">
            {isAmharic 
              ? "የግንባታ ሰራተኞች እና ቡድኖች በዲስፕሊን፣ ጥራት፣ ደህንነት እና መገኘት መለኪያዎች ላይ የተመሰረተ ደረጃ"
              : "Comprehensive system automatically ranking formwork carpenters and concrete fixers based on daily logs."}
          </p>
        </div>
        <div className="flex bg-white p-1 rounded-lg border border-slate-200 text-xs font-semibold shadow-xs">
          <span className="px-3 py-1 bg-slate-900 text-white rounded">Live Leaderboard</span>
        </div>
      </div>

      {/* Main Grid: Input Form & Rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Daily Worker Evaluation Form */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4 text-xs">
          <div className="flex items-center space-x-1.5 text-slate-900">
            <Plus className="text-red-600" size={18} />
            <h3 className="text-base font-bold">New Daily Worker Evaluation</h3>
          </div>
          <p className="text-slate-500 text-[11px]">
            Input weighted performance metrics. Scoring out of 100 maximum.
          </p>

          <form onSubmit={handleEvaluationSubmit} className="space-y-3 pt-1">
            
            <div className="space-y-1">
              <label className="font-semibold text-slate-600">Select Worker to Evaluate</label>
              <select 
                value={selectedWorkerId}
                required
                onChange={e => setSelectedWorkerId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800 outline-none"
              >
                <option value="">-- Choose Worker --</option>
                {workers.map(w => (
                  <option key={w.id} value={w.id}>{w.name} ({w.id})</option>
                ))}
              </select>
            </div>

            {/* Form Sliders / Number fields for metrics */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              
              <div className="space-y-1">
                <label className="font-semibold text-slate-600 flex justify-between">
                  <span>{isAmharic ? "ዲስፕሊን (20%)" : "Discipline (20%)"}</span>
                  <span className="text-red-600 font-bold font-mono">{discipline}/20</span>
                </label>
                <input 
                  type="number" min="0" max="20" value={discipline}
                  onChange={e => setDiscipline(Number(e.target.value))}
                  className="w-full bg-slate-50 border rounded p-1.5 font-bold" 
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-600 flex justify-between">
                  <span>{isAmharic ? "የስራ ጥራት (20%)" : "Work Quality (20%)"}</span>
                  <span className="text-red-600 font-bold font-mono">{quality}/20</span>
                </label>
                <input 
                  type="number" min="0" max="20" value={quality}
                  onChange={e => setQuality(Number(e.target.value))}
                  className="w-full bg-slate-50 border rounded p-1.5 font-bold" 
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-600 flex justify-between">
                  <span>{isAmharic ? "ምርታማነት (20%)" : "Productivity (20%)"}</span>
                  <span className="text-red-600 font-bold font-mono">{productivity}/20</span>
                </label>
                <input 
                  type="number" min="0" max="20" value={productivity}
                  onChange={e => setProductivity(Number(e.target.value))}
                  className="w-full bg-slate-50 border rounded p-1.5 font-bold" 
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-600 flex justify-between">
                  <span>{isAmharic ? "ደህንነት (15%)" : "Safety (15%)"}</span>
                  <span className="text-red-600 font-bold font-mono">{safety}/15</span>
                </label>
                <input 
                  type="number" min="0" max="15" value={safety}
                  onChange={e => setSafety(Number(e.target.value))}
                  className="w-full bg-slate-50 border rounded p-1.5 font-bold" 
                />
              </div>

              <div className="space-y-1 col-span-2">
                <label className="font-semibold text-slate-600 flex justify-between">
                  <span>{isAmharic ? "የእቃ አያያዝ እና አጠቃቀም (10%)" : "Equipment & Material Handling (10%)"}</span>
                  <span className="text-red-600 font-bold font-mono">{equipmentHandling}/10</span>
                </label>
                <input 
                  type="number" min="0" max="10" value={equipmentHandling}
                  onChange={e => setEquipmentHandling(Number(e.target.value))}
                  className="w-full bg-slate-50 border rounded p-1.5 font-bold" 
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-600 flex justify-between">
                  <span>{isAmharic ? "የቡድን ስራ (10%)" : "Teamwork (10%)"}</span>
                  <span className="text-red-600 font-bold font-mono">{teamwork}/10</span>
                </label>
                <input 
                  type="number" min="0" max="10" value={teamwork}
                  onChange={e => setTeamwork(Number(e.target.value))}
                  className="w-full bg-slate-50 border rounded p-1.5 font-bold" 
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-600 flex justify-between">
                  <span>{isAmharic ? "መገኘት (5%)" : "Attendance (5%)"}</span>
                  <span className="text-red-600 font-bold font-mono">{attendance}/5</span>
                </label>
                <input 
                  type="number" min="0" max="5" value={attendance}
                  onChange={e => setAttendance(Number(e.target.value))}
                  className="w-full bg-slate-50 border rounded p-1.5 font-bold" 
                />
              </div>

            </div>

            {/* Comment */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-600">{isAmharic ? "የአስተያየት ማስታወሻዎች" : "Performance Notes / Comments"}</label>
              <textarea 
                rows={2} value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder={isAmharic ? "ስለ ሰራተኛው አጠቃላይ አፈጻጸም እዚህ ይጻፉ..." : "Exceptional wall layout placement today..."}
                className="w-full bg-slate-50 border rounded p-2 text-slate-800 outline-none" 
              />
            </div>

            <div className="bg-slate-50 p-2.5 rounded-lg border text-center font-bold text-slate-800">
              {isAmharic ? "የተሰላ ውጤት:" : "Computed Score:"} <span className="text-red-600 font-black text-sm">{discipline + quality + productivity + safety + equipmentHandling + teamwork + attendance}/100</span>
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors"
            >
              {isAmharic ? "ውጤቱን መዝግብ" : "Log Evaluation"}
            </button>
          </form>
        </div>

        {/* Worker Leaderboard (Autocalculated Ranking) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 flex items-center space-x-1.5">
              <Star className="text-yellow-500 fill-yellow-500" size={18} />
              <span>Worker Rankings</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">Based on Daily logs</span>
          </div>

          <div className="space-y-2 overflow-y-auto max-h-[400px] pr-1">
            {workerAverages.map((wa, index) => (
              <div 
                key={wa.worker.id}
                className="p-3 bg-slate-50 border border-slate-100 hover:border-slate-200 rounded-xl flex items-center justify-between transition-all"
              >
                <div className="flex items-center space-x-3">
                  <span className={`w-6 h-6 rounded-full font-mono text-xs font-black flex items-center justify-center ${
                    index === 0 ? "bg-yellow-100 text-yellow-800" :
                    index === 1 ? "bg-slate-200 text-slate-800" :
                    index === 2 ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-500"
                  }`}>
                    {index + 1}
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{wa.worker.name}</h4>
                    <p className="text-[10px] text-slate-400 font-mono">{wa.worker.id} | {wa.worker.trade}</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    wa.avgScore >= 95 ? "bg-emerald-100 text-emerald-800" :
                    wa.avgScore >= 85 ? "bg-blue-100 text-blue-800" :
                    wa.avgScore >= 70 ? "bg-slate-100 text-slate-700" : "bg-red-50 text-red-700"
                  }`}>
                    {wa.avgScore}% {wa.level}
                  </span>
                  <p className="text-[9px] text-slate-400 mt-1">{wa.evalsCount} Daily logs</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Team Leaderboard (Autocalculated Team Metrics) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 flex items-center space-x-1.5">
              <Zap className="text-blue-500" size={18} />
              <span>Team Rankings</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">Safety & Quality index</span>
          </div>

          <div className="space-y-3">
            {sortedTeams.map((team, index) => {
              const score = Math.round((team.safetyScore + team.qualityScore + team.averageProductivity) / 3);
              return (
                <div key={team.id} className="p-3 border border-slate-100 rounded-xl bg-slate-50 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-black text-slate-500 font-mono">#{index + 1}</span>
                      <h4 className="text-xs font-bold text-slate-900">{team.name}</h4>
                    </div>
                    <span className="bg-blue-50 text-blue-700 font-bold text-xs px-2 py-0.5 rounded">
                      {score}% Rating
                    </span>
                  </div>

                  {/* Horizontal progress bar for productivity visual */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>Completed cycle productivity</span>
                      <span className="font-bold">{team.averageProductivity}%</span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-blue-600 h-full rounded-full" style={{ width: `${team.averageProductivity}%` }}></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 font-semibold border-t border-slate-100 pt-1.5">
                    <span>Safety Score: <strong className="text-slate-800">{team.safetyScore}%</strong></span>
                    <span>Quality Index: <strong className="text-slate-800">{team.qualityScore}%</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Team Progress Trends Section */}
      <div id="team-progress-trends-section" className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <TrendingUp className="text-red-600 animate-pulse" size={20} />
              <span>
                {isAmharic ? "የግንባታ ቡድን አፈጻጸም አዝማሚያዎች" : "Construction Team Performance Trends"}
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              {isAmharic
                ? "ባለፉት 7 ቀናት ውስጥ የስራ ቡድኖችን ምርታማነት፣ ጥራት ደረጃ እና የደህንነት አፈጻጸም መከታተያ የጊዜ ሰሌዳ።"
                : "Historical progress trends showing day-over-day changes in key construction benchmarks."}
            </p>
          </div>

          {/* Metric Buttons */}
          <div className="flex flex-wrap gap-1 p-1 bg-slate-50 rounded-xl border border-slate-100 text-xs font-semibold">
            <button
              id="metric-btn-productivity"
              type="button"
              onClick={() => setSelectedMetric("productivity")}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                selectedMetric === "productivity"
                  ? "bg-red-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              {isAmharic ? "ምርታማነት" : "Productivity"}
            </button>
            <button
              id="metric-btn-quality"
              type="button"
              onClick={() => setSelectedMetric("quality")}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                selectedMetric === "quality"
                  ? "bg-red-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              {isAmharic ? "ጥራት ደረጃ" : "Quality Index"}
            </button>
            <button
              id="metric-btn-safety"
              type="button"
              onClick={() => setSelectedMetric("safety")}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                selectedMetric === "safety"
                  ? "bg-red-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              {isAmharic ? "ደህንነት" : "Safety Compliance"}
            </button>
          </div>
        </div>

        {/* Chart Visualization */}
        <div className="pt-2 h-[350px] w-full font-sans text-xs">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={(() => {
                const alphaVal = teams.find(t => t.id === "T-01") || { averageProductivity: 92, qualityScore: 88, safetyScore: 94 };
                const betaVal = teams.find(t => t.id === "T-02") || { averageProductivity: 85, qualityScore: 90, safetyScore: 85 };
                const gammaVal = teams.find(t => t.id === "T-03") || { averageProductivity: 90, qualityScore: 95, safetyScore: 92 };
                const deltaVal = teams.find(t => t.id === "T-04") || { averageProductivity: 87, qualityScore: 85, safetyScore: 88 };
                const epsilonVal = teams.find(t => t.id === "T-05") || { averageProductivity: 80, qualityScore: 92, safetyScore: 98 };

                return [
                  {
                    date: "06-25",
                    "Assembly Team Alpha": selectedMetric === "productivity" ? 80 : selectedMetric === "quality" ? 82 : 90,
                    "Stripping Team Beta": selectedMetric === "productivity" ? 72 : selectedMetric === "quality" ? 85 : 80,
                    "Steel Fixing Team Gamma": selectedMetric === "productivity" ? 85 : selectedMetric === "quality" ? 90 : 88,
                    "Concreting Team Delta": selectedMetric === "productivity" ? 78 : selectedMetric === "quality" ? 80 : 82,
                    "Support Team Epsilon": selectedMetric === "productivity" ? 75 : selectedMetric === "quality" ? 88 : 95,
                  },
                  {
                    date: "06-26",
                    "Assembly Team Alpha": selectedMetric === "productivity" ? 83 : selectedMetric === "quality" ? 84 : 92,
                    "Stripping Team Beta": selectedMetric === "productivity" ? 75 : selectedMetric === "quality" ? 87 : 82,
                    "Steel Fixing Team Gamma": selectedMetric === "productivity" ? 87 : selectedMetric === "quality" ? 91 : 89,
                    "Concreting Team Delta": selectedMetric === "productivity" ? 80 : selectedMetric === "quality" ? 82 : 84,
                    "Support Team Epsilon": selectedMetric === "productivity" ? 76 : selectedMetric === "quality" ? 89 : 96,
                  },
                  {
                    date: "06-27",
                    "Assembly Team Alpha": selectedMetric === "productivity" ? 85 : selectedMetric === "quality" ? 85 : 91,
                    "Stripping Team Beta": selectedMetric === "productivity" ? 78 : selectedMetric === "quality" ? 88 : 83,
                    "Steel Fixing Team Gamma": selectedMetric === "productivity" ? 88 : selectedMetric === "quality" ? 93 : 90,
                    "Concreting Team Delta": selectedMetric === "productivity" ? 81 : selectedMetric === "quality" ? 83 : 85,
                    "Support Team Epsilon": selectedMetric === "productivity" ? 78 : selectedMetric === "quality" ? 90 : 97,
                  },
                  {
                    date: "06-28",
                    "Assembly Team Alpha": selectedMetric === "productivity" ? 88 : selectedMetric === "quality" ? 86 : 93,
                    "Stripping Team Beta": selectedMetric === "productivity" ? 80 : selectedMetric === "quality" ? 89 : 84,
                    "Steel Fixing Team Gamma": selectedMetric === "productivity" ? 90 : selectedMetric === "quality" ? 92 : 91,
                    "Concreting Team Delta": selectedMetric === "productivity" ? 83 : selectedMetric === "quality" ? 84 : 86,
                    "Support Team Epsilon": selectedMetric === "productivity" ? 80 : selectedMetric === "quality" ? 91 : 98,
                  },
                  {
                    date: "06-29",
                    "Assembly Team Alpha": selectedMetric === "productivity" ? 90 : selectedMetric === "quality" ? 87 : 94,
                    "Stripping Team Beta": selectedMetric === "productivity" ? 82 : selectedMetric === "quality" ? 91 : 85,
                    "Steel Fixing Team Gamma": selectedMetric === "productivity" ? 92 : selectedMetric === "quality" ? 94 : 93,
                    "Concreting Team Delta": selectedMetric === "productivity" ? 85 : selectedMetric === "quality" ? 85 : 87,
                    "Support Team Epsilon": selectedMetric === "productivity" ? 79 : selectedMetric === "quality" ? 92 : 98,
                  },
                  {
                    date: "06-30",
                    "Assembly Team Alpha": selectedMetric === "productivity" ? 91 : selectedMetric === "quality" ? 89 : 95,
                    "Stripping Team Beta": selectedMetric === "productivity" ? 84 : selectedMetric === "quality" ? 90 : 86,
                    "Steel Fixing Team Gamma": selectedMetric === "productivity" ? 91 : selectedMetric === "quality" ? 93 : 92,
                    "Concreting Team Delta": selectedMetric === "productivity" ? 86 : selectedMetric === "quality" ? 86 : 88,
                    "Support Team Epsilon": selectedMetric === "productivity" ? 82 : selectedMetric === "quality" ? 93 : 99,
                  },
                  {
                    date: "07-01",
                    "Assembly Team Alpha": selectedMetric === "productivity" ? alphaVal.averageProductivity : selectedMetric === "quality" ? alphaVal.qualityScore : alphaVal.safetyScore,
                    "Stripping Team Beta": selectedMetric === "productivity" ? betaVal.averageProductivity : selectedMetric === "quality" ? betaVal.qualityScore : betaVal.safetyScore,
                    "Steel Fixing Team Gamma": selectedMetric === "productivity" ? gammaVal.averageProductivity : selectedMetric === "quality" ? gammaVal.qualityScore : gammaVal.safetyScore,
                    "Concreting Team Delta": selectedMetric === "productivity" ? deltaVal.averageProductivity : selectedMetric === "quality" ? deltaVal.qualityScore : deltaVal.safetyScore,
                    "Support Team Epsilon": selectedMetric === "productivity" ? epsilonVal.averageProductivity : selectedMetric === "quality" ? epsilonVal.qualityScore : epsilonVal.safetyScore,
                  }
                ];
              })()}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="date" 
                stroke="#94a3b8" 
                fontSize={11}
                tickLine={false} 
                axisLine={false}
                dy={10}
              />
              <YAxis 
                stroke="#94a3b8" 
                fontSize={11}
                tickLine={false} 
                axisLine={false}
                domain={[50, 100]}
                tickFormatter={(val) => `${val}%`}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: "#ffffff",
                  borderColor: "#e2e8f0",
                  borderRadius: "12px",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  fontSize: "12px",
                  color: "#0f172a"
                }}
              />
              <Legend 
                verticalAlign="bottom" 
                height={36} 
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ paddingTop: "20px", fontSize: "11px", fontWeight: 600 }}
              />
              <Line
                name={isAmharic ? "አሰምብሊ ቡድን አልፋ" : "Assembly Team Alpha"}
                type="monotone"
                dataKey="Assembly Team Alpha"
                stroke="#10b981"
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 1 }}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
              <Line
                name={isAmharic ? "ስትሪፒንግ ቡድን ቤታ" : "Stripping Team Beta"}
                type="monotone"
                dataKey="Stripping Team Beta"
                stroke="#f97316"
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 1 }}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
              <Line
                name={isAmharic ? "ስቲል ፊክሲንግ ጋማ" : "Steel Fixing Team Gamma"}
                type="monotone"
                dataKey="Steel Fixing Team Gamma"
                stroke="#8b5cf6"
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 1 }}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
              <Line
                name={isAmharic ? "ኮንክሪቲንግ ቡድን ዴልታ" : "Concreting Team Delta"}
                type="monotone"
                dataKey="Concreting Team Delta"
                stroke="#f43f5e"
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 1 }}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
              <Line
                name={isAmharic ? "ሰፖርት ቡድን ኤፕሲሎን" : "Support Team Epsilon"}
                type="monotone"
                dataKey="Support Team Epsilon"
                stroke="#eab308"
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 1 }}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Legend Explanations */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span>{isAmharic ? "አልፋ፡ ፎርምወርክ መግጠም" : "Alpha: Formwork Assembly"}</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
            <span>{isAmharic ? "ቤታ፡ ፎርምወርክ መፍታት" : "Beta: Formwork Stripping"}</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-violet-500"></span>
            <span>{isAmharic ? "ጋማ፡ ብረት ማሰር" : "Gamma: Steel Reinforcing"}</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
            <span>{isAmharic ? "ዴልታ፡ ኮንክሪት ማፍሰስ" : "Delta: Concrete Casting"}</span>
          </div>
          <div className="flex items-center space-x-1.5 col-span-2 md:col-span-1">
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
            <span>{isAmharic ? "ኤፕሲሎን፡ የደህንነት ድጋፍ" : "Epsilon: Rigging & Safety"}</span>
          </div>
        </div>
      </div>

    </div>
  );
};
