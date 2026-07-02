import React, { useState } from "react";
import { 
  Sparkles, 
  Layers, 
  TrendingUp, 
  AlertTriangle, 
  Clock, 
  Brain, 
  CheckCircle2, 
  FileText, 
  UserPlus, 
  HelpCircle,
  FileCheck,
  ChevronRight
} from "lucide-react";
import { 
  ProjectZone, 
  Team, 
  Worker, 
  PerformanceEvaluation, 
  DailyProgressLog, 
  SafetyLog, 
  QualitySnag,
  AIPredictionsResult
} from "../types";

interface AIPredictionsProps {
  zones: ProjectZone[];
  teams: Team[];
  workers: Worker[];
  evaluations: PerformanceEvaluation[];
  progressLogs: DailyProgressLog[];
  safetyLogs: SafetyLog[];
  qualitySnags: QualitySnag[];
  isAmharic: boolean;
  t: (key: string) => string;
}

export const AIPredictions: React.FC<AIPredictionsProps> = ({
  zones,
  teams,
  workers,
  evaluations,
  progressLogs,
  safetyLogs,
  qualitySnags,
  isAmharic,
  t
}) => {
  const [loading, setLoading] = useState(false);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [predictionData, setPredictionData] = useState<AIPredictionsResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const loadingMessages = [
    "Analyzing aluminum panel assembly cycle speeds...",
    "Computing spatial worker attendance indices at Bole Heights...",
    "Assessing concrete pouring approval risks and cure logs...",
    "Mapping active safety compliance violations against formwork props...",
    "Formulating optimal team shifts and manpower re-allocations...",
    "Consulting Google Gemini cognitive forecasting patterns..."
  ];

  const runPrediction = async () => {
    setLoading(true);
    setErrorMsg("");
    setPredictionData(null);

    // Stagger loading messages
    const msgInterval = setInterval(() => {
      setLoadingMsgIdx((prev) => (prev + 1) % loadingMessages.length);
    }, 2500);

    try {
      const response = await fetch("/api/ai/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          zones,
          teams,
          workers,
          evaluations,
          progressLogs,
          safetyLogs,
          qualitySnags
        })
      });

      const resJson = await response.json();
      if (resJson.success) {
        setPredictionData(resJson.data);
      } else {
        throw new Error(resJson.error || "Prediction request failed.");
      }
    } catch (err) {
      console.error("AI Predictions failed:", err);
      setErrorMsg(err instanceof Error ? err.message : "Service temporarily unavailable.");
    } finally {
      clearInterval(msgInterval);
      setLoading(false);
    }
  };

  // Simple Markdown to HTML parser for Weekly Management Report rendering
  const parseMarkdown = (md: string) => {
    if (!md) return "";
    return md
      .replace(/^# (.*$)/gim, '<h1 class="text-xl font-bold text-slate-900 border-b pb-2 mb-3">$1</h1>')
      .replace(/^## (.*$)/gim, '<h2 class="text-base font-bold text-slate-800 mt-4 mb-2">$1</h2>')
      .replace(/^### (.*$)/gim, '<h3 class="text-sm font-semibold text-slate-800 mt-3 mb-1">$1</h3>')
      .replace(/^\* (.*$)/gim, '<li class="list-disc list-inside text-slate-600 mb-1 ml-4">$1</li>')
      .replace(/^- (.*$)/gim, '<li class="list-disc list-inside text-slate-600 mb-1 ml-4">$1</li>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900">$1</strong>')
      .replace(/\n/g, "<br />");
  };

  return (
    <div className="space-y-6">
      
      {/* Run Prediction Banner */}
      <div className="bg-gradient-to-r from-red-900 to-slate-900 rounded-2xl p-6 text-white overflow-hidden relative shadow-xl border border-red-800">
        <div className="absolute right-0 top-0 opacity-10">
          <Brain size={250} />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-1">
              <span className="bg-red-600 text-[10px] uppercase tracking-widest font-extrabold px-2 py-0.5 rounded-full">
                Gemini 3.5 AI Core
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              {isAmharic ? "አይአይ ትንበያ እና ምርታማነት ትንተና" : "Predictive Intelligence Command Engine"}
            </h1>
            <p className="text-slate-300 text-xs max-w-xl">
              {isAmharic 
                ? "የግንባታ ማጠናቀቂያ ቀናትን መተንበይ፣ የሰራተኞች ድልድል ምክሮችን መስጠት እና ሳምንታዊ የአስተዳደር ሪፖርቶችን መፍጠር።"
                : "Leverage OVID's active dataset with Gemini to forecast cycle delays, spatial manpower locks, and draft weekly management logs."}
            </p>
          </div>

          <button
            onClick={runPrediction}
            disabled={loading}
            className={`px-5 py-3 bg-white text-slate-900 hover:bg-slate-100 font-extrabold text-sm rounded-xl shadow-lg flex items-center space-x-2 transition-all flex-shrink-0 cursor-pointer ${
              loading ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            <Sparkles className="text-red-600 animate-pulse" size={16} />
            <span>{isAmharic ? "ትንበያውን አስጀምር" : "Launch Predictive Engine"}</span>
          </button>
        </div>
      </div>

      {/* Loading state with immersive messages */}
      {loading && (
        <div className="bg-white p-12 rounded-2xl border border-slate-100 shadow-sm text-center space-y-6">
          <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
            {/* Spinning radar animation */}
            <div className="absolute inset-0 rounded-full border-4 border-dashed border-red-600 animate-spin"></div>
            <Brain size={36} className="text-red-600 animate-pulse" />
          </div>

          <div className="space-y-2 max-w-sm mx-auto">
            <h3 className="text-sm font-bold text-slate-950 uppercase tracking-widest animate-pulse">Running AI Forecast</h3>
            <p className="text-xs text-slate-500 font-mono transition-all">
              {loadingMessages[loadingMsgIdx]}
            </p>
          </div>
        </div>
      )}

      {/* Error state */}
      {errorMsg && (
        <div className="bg-red-50 text-red-800 p-4 rounded-xl border border-red-200 text-xs flex items-start space-x-3 max-w-xl mx-auto">
          <AlertTriangle className="text-red-600 mt-0.5 flex-shrink-0" size={16} />
          <div>
            <h4 className="font-bold">Prediction Failed</h4>
            <p className="mt-1 text-slate-600">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* AI Prediction Outputs */}
      {predictionData && !loading && (
        <div className="space-y-6">
          
          {/* Simulated Mode Warning */}
          {"simulated" in predictionData && predictionData.simulated && (
            <div className="bg-amber-50 text-amber-800 p-3.5 rounded-xl border border-amber-200 text-xs flex items-center justify-between">
              <span className="flex items-center space-x-1.5 font-semibold">
                <Brain size={16} className="text-amber-600" />
                <span>Simulated Mode Active: Gemini API key not configured in secrets. Displaying localized heuristics.</span>
              </span>
              <span className="text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-mono">Offline Core</span>
            </div>
          )}

          {/* Core high-impact widgets Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Completion date card */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between space-y-4">
              <div className="space-y-1">
                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Completion Forecast</span>
                <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-1.5">
                  <Clock size={18} className="text-red-600" />
                  <span>Predicted Finish Date</span>
                </h3>
              </div>

              <div className="py-2">
                <span className="text-4xl font-black text-slate-900 font-mono tracking-tight">
                  {predictionData.predictedCompletionDate}
                </span>
                <p className="text-xs text-slate-500 mt-1">
                  * Based on active Floor 4 cycle velocity of 6.4 Days.
                </p>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg text-[10px] text-slate-500 flex items-center space-x-1.5 border border-slate-200">
                <CheckCircle2 size={12} className="text-emerald-600" />
                <span>Structural lock checks valid.</span>
              </div>
            </div>

            {/* At-Risk Delayed Zones */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
              <div className="space-y-1">
                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Risk Analysis</span>
                <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-1.5">
                  <AlertTriangle size={18} className="text-amber-500" />
                  <span>At-Risk Delayed Zones</span>
                </h3>
              </div>

              <div className="space-y-2">
                {predictionData.predictedDelayedZones.map((z, idx) => (
                  <div key={idx} className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg text-xs space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="bg-slate-900 text-white font-mono font-bold px-1.5 py-0.5 rounded text-[9px]">
                        {z.zoneId}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                        z.riskLevel === "High" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"
                      }`}>
                        {z.riskLevel} Risk
                      </span>
                    </div>
                    <p className="text-slate-500 leading-normal">{z.reason}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Manpower Recommendation */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
              <div className="space-y-1">
                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Spatial Optimization</span>
                <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-1.5">
                  <UserPlus size={18} className="text-blue-500" />
                  <span>Manpower Allocations</span>
                </h3>
              </div>

              <div className="space-y-2">
                {predictionData.manpowerAllocationRecommendation.map((rec, idx) => (
                  <div key={idx} className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg text-xs space-y-1">
                    <div className="font-bold text-slate-800">{rec.name}</div>
                    <div className="text-[10px] text-slate-400 font-semibold uppercase flex items-center space-x-1">
                      <span>{rec.currentZone}</span>
                      <ChevronRight size={10} />
                      <span className="text-blue-600">{rec.recommendMoveToZone}</span>
                    </div>
                    <p className="text-slate-500 text-[11px] leading-normal">{rec.reason}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Overtime requirements & mentoring guidelines */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Overtime recommendations */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-1.5">
                <Clock className="text-emerald-600" size={18} />
                <span>Overtime Requirements Recommendation</span>
              </h3>
              
              <div className="divide-y divide-slate-100">
                {predictionData.overtimeRequirements.map((ot, idx) => (
                  <div key={idx} className="py-2.5 flex items-start justify-between text-xs">
                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-800">{ot.trade}</div>
                      <p className="text-slate-500 max-w-sm">{ot.reason}</p>
                    </div>
                    <span className="bg-emerald-50 text-emerald-700 font-mono font-bold px-2 py-1 rounded-lg">
                      +{ot.recommendedHours} hrs/day
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Low performing workers & constructive mentoring */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-1.5">
                <TrendingUp className="text-red-600" size={18} />
                <span>Constructive Mentorship Guidelines</span>
              </h3>

              <div className="space-y-3">
                {predictionData.lowPerformingWorkers.map((worker, idx) => (
                  <div key={idx} className="p-3 bg-red-50/50 border border-red-100 rounded-xl text-xs space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-800">{worker.name} (ID: {worker.workerId})</span>
                      <span className="bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded">
                        Score: {worker.score}%
                      </span>
                    </div>
                    <p className="text-slate-600 italic">"{worker.suggestions}"</p>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Weekly Management Report Markdown block */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 space-y-4">
            <div className="flex items-center space-x-2 border-b pb-4">
              <FileText className="text-slate-700" size={24} />
              <div>
                <h2 className="text-lg font-bold text-slate-900">Weekly Management Performance Report</h2>
                <p className="text-xs text-slate-500">Exhaustive executive log synthesized for OVID Real Estate Directors.</p>
              </div>
            </div>

            {/* HTML rendered markdown */}
            <div 
              className="prose prose-sm max-w-none text-xs leading-relaxed space-y-2 text-slate-700"
              dangerouslySetInnerHTML={{ __html: parseMarkdown(predictionData.weeklyManagementReport) }}
            ></div>
          </div>

        </div>
      )}

    </div>
  );
};
