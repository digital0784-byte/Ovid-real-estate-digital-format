import React, { useState, useMemo, useEffect } from "react";
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
  ChevronRight,
  ShieldAlert,
  Camera,
  Eye,
  Settings,
  Database,
  Coins,
  HardHat,
  Maximize2,
  Activity,
  Grid,
  RefreshCw,
  Play,
  Sliders,
  XCircle,
  CheckCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from "recharts";
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

// Preset photo assets for Progress and Safety Detection
interface PhotoAsset {
  id: string;
  name: string;
  nameAm: string;
  url: string;
  workActivity: string;
  workActivityAm: string;
  targetComparison: "Ahead" | "On Schedule" | "Behind";
  completionPercent: number;
  plannedPercent: number;
  productivityScore: number;
  delayWarning: string;
  delayWarningAm: string;
  cadFile: string;
  safetyHazards: Array<{
    id: string;
    type: "helmet" | "activity" | "area";
    label: string;
    labelAm: string;
    x: number; // percentage width
    y: number; // percentage height
    width: number;
    height: number;
    status: "safe" | "critical" | "warning";
    description: string;
    descriptionAm: string;
  }>;
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
  // Navigation Tabs
  const [activeSubTab, setActiveSubTab] = useState<"overview" | "progress" | "safety" | "forecast">("overview");
  
  // Forecast Engine Controls
  const [loading, setLoading] = useState(false);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [predictionData, setPredictionData] = useState<AIPredictionsResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  // Target values adjustable by the user for recalculating forecasts
  const [targetCycleDays, setTargetCycleDays] = useState(6);
  const [customCrewSize, setCustomCrewSize] = useState(12);
  const [aluminumLossAllowance, setAluminumLossAllowance] = useState(1.5); // % loss

  // Progress Detection Specific States
  const [selectedPhotoIdx, setSelectedPhotoIdx] = useState<number>(0);
  const [progressAnalyzing, setProgressAnalyzing] = useState(false);
  const [progressAnalyzed, setProgressAnalyzed] = useState(true);
  const [showCADOverlay, setShowCADOverlay] = useState(false);

  // Safety AI Specific States
  const [safetyScanning, setSafetyScanning] = useState(false);
  const [safetyScanned, setSafetyScanned] = useState(true);
  const [hoveredHazardId, setHoveredHazardId] = useState<string | null>(null);

  const loadingMessages = [
    isAmharic ? "የአሉሚኒየም ፎርምወርክ መገጣጠሚያ ፍጥነትን በመተንተን ላይ..." : "Analyzing aluminum panel assembly cycle speeds...",
    isAmharic ? "ቦሌ ሄይትስ ላይ ያሉ ሰራተኞች የመገኘት ኢንዴክስን በማስላት ላይ..." : "Computing spatial worker attendance indices at Bole Heights...",
    isAmharic ? "የኮንክሪት ሙሌት አደጋዎችን እና የደረቅነት ጊዜን በመገምገም ላይ..." : "Assessing concrete pouring approval risks and cure logs...",
    isAmharic ? "አሁን ያሉ የደህንነት ደንብ ጥሰቶችን ከፎርምወርክ ጋር በማዛመድ ላይ..." : "Mapping active safety compliance violations against formwork props...",
    isAmharic ? "የማኔጅመንት ሪፖርቶችን ለማጠናቀር ጂሚኒ ኤአይ (Gemini AI) በመጠየቅ ላይ..." : "Consulting Google Gemini cognitive forecasting patterns..."
  ];

  // Construction Photos database loaded with AI bounding box annotations for safety & progress
  const presetPhotos: PhotoAsset[] = useMemo(() => [
    {
      id: "PHOTO-AI-101",
      name: "Floor 4 Zone A Column & Slab Layout",
      nameAm: "ፎቅ 4 ዞን ሀ የአምድ እና ሰሌዳ ፎርምወርቅ",
      url: "https://images.unsplash.com/photo-1590069261209-f8e9b8642343?w=1000&auto=format&fit=crop",
      workActivity: "Wall Panel and Slab Decking Assembly",
      workActivityAm: "የግድግዳ ፓነል እና የፎቅ ሰሌዳ መገጣጠም ስራ",
      targetComparison: "Ahead",
      completionPercent: 92,
      plannedPercent: 88,
      productivityScore: 96,
      delayWarning: "None. Assembly is highly efficient. Ready for immediate laser calibration inspection.",
      delayWarningAm: "የለም። ስራው እጅግ ቀልጣፋ ነው። ለቀጥተኝነት ሌዘር ፍተሻ ዝግጁ ነው።",
      cadFile: "OVID-BH-FL04-ZA-STR.dwg",
      safetyHazards: [
        {
          id: "HZ-1",
          type: "helmet",
          label: "Worker 1: Helmet Verified",
          labelAm: "ሰራተኛ 1፦ የራስ ቁር ተረጋግጧል",
          x: 25,
          y: 42,
          width: 8,
          height: 12,
          status: "safe",
          description: "Compliant hardhat in clear yellow color detected. Correct strap lock.",
          descriptionAm: "ቢጫ ቀለም ያለው የራስ ቁር በስርዓቱ መታሰሩ ተረጋግጧል።"
        },
        {
          id: "HZ-2",
          type: "helmet",
          label: "Worker 2: Helmet Verified",
          labelAm: "ሰራተኛ 2፦ የራስ ቁር ተረጋግጧል",
          x: 48,
          y: 45,
          width: 7,
          height: 11,
          status: "safe",
          description: "Compliant hardhat in white color. Fully locked suspension.",
          descriptionAm: "ነጭ ቀለም ያለው የራስ ቁር በስርዓቱ መታሰሩ ተረጋግጧል።"
        },
        {
          id: "HZ-3",
          type: "area",
          label: "Slab Perimeter Protection Guardrail",
          labelAm: "የፎቅ ጠርዝ ጥበቃ ካስማ እና ገመድ",
          x: 70,
          y: 10,
          width: 25,
          height: 35,
          status: "warning",
          description: "Temporary wire-mesh perimeter guardrail is installed, but requires tension adjustment.",
          descriptionAm: "ጊዜያዊ የጠርዝ መከላከያ አጥር ተጭኗል፡ ነገር ግን የገመዱ ጥብቅነት ማስተካከያ ይፈልጋል።"
        }
      ]
    },
    {
      id: "PHOTO-AI-102",
      name: "Floor 4 Zone B Elevator Shaft Core Layout",
      nameAm: "ፎቅ 4 ዞን ለ የሊፍት ማዕከል ፎርምወርቅ",
      url: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1000&auto=format&fit=crop",
      workActivity: "Core Wall Shutters & Heavy Bracket Assembly",
      workActivityAm: "የሊፍት ግድግዳ ፓነሎች እና ከባድ ቅንፎች ስራ",
      targetComparison: "Behind",
      completionPercent: 55,
      plannedPercent: 72,
      productivityScore: 68,
      delayWarning: "Warning: Joint offset detected at primary slab-shaft transition. Assembly delayed by 1.8 days due to slow panel carriage.",
      delayWarningAm: "ማስጠንቀቂያ፦ በሊፍት መተላለፊያ መጋጠሚያ ላይ መዛባት ታይቷል። የፓነል ማጓጓዝ በመዘግየቱ 1.8 ቀናት ጠፍተዋል።",
      cadFile: "OVID-BH-FL04-CORE-ZB.dwg",
      safetyHazards: [
        {
          id: "HZ-4",
          type: "helmet",
          label: "Worker 3: CRITICAL - MISSING HELMET!",
          labelAm: "ሰራተኛ 3፦ ወሳኝ አደጋ - የራስ ቁር አልለበሰም!",
          x: 40,
          y: 35,
          width: 10,
          height: 16,
          status: "critical",
          description: "Worker identified carrying heavy wedge-pins without standard hardhat or safety gloves.",
          descriptionAm: "ሰራተኛው ከባድ ፓነል በሚሸከምበት ወቅት የራስ ቁር እና የእጅ ጓንት ባለመልበሱ ተለይቷል።"
        },
        {
          id: "HZ-5",
          type: "activity",
          label: "Unsafe Working Height Maneuver",
          labelAm: "ያልተጠበቀ ከፍታ ላይ ያለ ስራ",
          x: 18,
          y: 20,
          width: 14,
          height: 22,
          status: "critical",
          description: "Rigger stepping on top cantilever brackets without anchoring safety harness double lanyard.",
          descriptionAm: "ሪገሩ የደህንነት ገመዱን ሳይቆልፍ በከፍታ ቅንፍ ላይ ቆሞ ፓነል ሲያቀብል ተገኝቷል።"
        },
        {
          id: "HZ-6",
          type: "area",
          label: "Restricted Lift Core Shaft Hole",
          labelAm: "የተከለከለ ክፍት የሊፍት ጉድጓድ ቀጠና",
          x: 55,
          y: 50,
          width: 38,
          height: 45,
          status: "critical",
          description: "Open elevator shaft void. No kicker protection board or closed safety netting. High falling risk.",
          descriptionAm: "ክፍት የሊፍት ጉድጓድ። የደህንነት መከላከያ መረብ ወይም የእግር ሰሌዳ የለውም። ከፍተኛ የመውደቅ አደጋ አለ።"
        }
      ]
    },
    {
      id: "PHOTO-AI-103",
      name: "Floor 4 Zone C Outer Slab Shoring Supports",
      nameAm: "ፎቅ 4 ዞን ሐ የውጪ ፎቅ ድጋፍ ምሰሶዎች",
      url: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=1000&auto=format&fit=crop",
      workActivity: "Telescopic Prop Layout & Outer Bracing",
      workActivityAm: "የቴሌስኮፒክ ድጋፍ ምሰሶዎች እና ውጫዊ ማሰሪያዎች",
      targetComparison: "Behind",
      completionPercent: 35,
      plannedPercent: 40,
      productivityScore: 82,
      delayWarning: "Potential Delay: Prop spacing exceeds 1200mm limit on Axis D grid. Requires reinforcement before concrete weight load.",
      delayWarningAm: "ሊከሰት የሚችል መዘግየት፦ በዘንግ D ላይ የምሰሶዎች ልዩነት ከ1200ሚሜ አልፏል። ኮንክሪት ከመሞላቱ በፊት መጠናከር አለበት።",
      cadFile: "OVID-BH-FL04-ZC-SHORE.dwg",
      safetyHazards: [
        {
          id: "HZ-7",
          type: "activity",
          label: "Missing Support Locking Pins",
          labelAm: "የምሰሶ መቆለፊያ ፒኖች አለመኖር",
          x: 32,
          y: 60,
          width: 12,
          height: 18,
          status: "warning",
          description: "Shoring prop extended without standard safety locking pin. Utilizing rebar wire substitute.",
          descriptionAm: "ጊዜያዊ የብረት ሽቦ በመጠቀም የቆመ ድጋፍ ምሰሶ ታይቷል። ትክክለኛው የብረት ፒን መገጠም አለበት።"
        },
        {
          id: "HZ-8",
          type: "area",
          label: "Slab Floor Clutter & Debris",
          labelAm: "በፎቅ ወለል ላይ የተከማቸ ፍርስራሽ",
          x: 5,
          y: 75,
          width: 35,
          height: 22,
          status: "warning",
          description: "Discarded timber studs, foam strips, and panel debris blocking active gangway. Tripping hazard.",
          descriptionAm: "የተቆራረጡ እንጨቶችና ፍርስራሾች መንገዱን ዘግተውታል። የመሰናከል አደጋ ያስከትላል።"
        }
      ]
    }
  ], [isAmharic]);

  const activePhoto = presetPhotos[selectedPhotoIdx];

  // Load predictions on load
  useEffect(() => {
    runPredictionHeuristic();
  }, []);

  const runPredictionHeuristic = async () => {
    setLoading(true);
    setErrorMsg("");
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
          qualitySnags,
          targetCycleDays,
          customCrewSize
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
      // Construct a localized premium simulation fallback if backend fails or offline
      setPredictionData({
        predictedCompletionDate: "2026-11-20",
        predictedDelayedZones: [
          {
            zoneId: "B1-F04-ZB",
            reason: isAmharic 
              ? "ዞን ለ የሊፍት ግድግዳ ፓነል መገጣጠም በ1.8 ቀናት ዘግይቷል፡ ዋናው ምክንያት የፓነሎች እጥረት ነው።" 
              : "Zone B panel assembly is 1.8 days delayed. Slow vertical logistics of aluminum boards from Floor 3 is the bottleneck.",
            riskLevel: "High"
          },
          {
            zoneId: "B1-F04-ZC",
            reason: isAmharic
              ? "የውጪ ሰሌዳ ድጋፍ ምሰሶዎች አቀማመጥ በቂ ያልሆነ የምሰሶ ብዛት ስጋት አለበት።"
              : "Zone C external deck shoring is lagging. Target cycle window at risk due to extended prop configuration times.",
            riskLevel: "Medium"
          }
        ],
        manpowerAllocationRecommendation: [
          {
            teamId: "T-03",
            name: "Steel Fixing Team Gamma (የብረት ስራ ቡድን)",
            currentZone: "Zone A (Floor 4)",
            recommendMoveToZone: "Zone B (Floor 4)",
            reason: isAmharic
              ? "የዞን ሀ የብረት ስራ ሙሉ በሙሉ ተጠናቋል። ቡድኑን ወደ ዞን ለ በማዛወር የፎርምወርክ መቆለፍ ስራውን ማፋጠን ይቻላል።"
              : "Zone A rebar works are 100% complete. Reallocating Team Gamma to Zone B immediately unlocks critical path column casting."
          },
          {
            teamId: "T-05",
            name: "Shoring Support Team Epsilon (የድጋፍ ቡድን)",
            currentZone: "Material Yard (ጊቢ)",
            recommendMoveToZone: "Zone C (Floor 4)",
            reason: isAmharic
              ? "የዞን ሐ የምሰሶዎች አሰላለፍ ጥብቅ ቁጥጥር ስለሚያስፈልገው ተጨማሪ 3 ረዳቶችን ማሰማራት ይመከራል።"
              : "Deploying 3 auxiliary riggers to help carry heavy props in Zone C will prevent missing Friday's casting approval."
          }
        ],
        overtimeRequirements: [
          {
            trade: "Carpenter (አናፂ)",
            recommendedHours: 2.5,
            reason: isAmharic
              ? "በዞን ለ ላይ ያሉ የሊፍት ፓነሎችን በአግባቡ ለመቆለፍ እና ከሰዓት ኮንክሪት ለመሙላት ተጨማሪ ሰዓት ያስፈልጋል።"
              : "Required for Carpenter crew in Zone B to lock structural column profiles and secure concrete pour windows."
          },
          {
            trade: "Stripper (ፓነል ፈቺ)",
            recommendedHours: 1.5,
            reason: isAmharic
              ? "ከተጠናቀቀው ፎቅ 3 ላይ የድጋፍ ፓነሎችን በፍጥነት በመፍታት ለፎቅ 4 ግብዓት እንዲሆኑ ለማድረግ።"
              : "To accelerate stripping of cured Floor 3 components, freeing up panels needed urgently on active Floor 4 grids."
          }
        ],
        lowPerformingWorkers: [
          {
            workerId: "OVID-W-108",
            name: "Mekonnen Haile",
            score: 66,
            suggestions: isAmharic
              ? "በፓነል አያያዝ እና ፍጥነት ላይ ዝቅተኛ ውጤት አሳይቷል። ለ3 ቀናት ከዮሴፍ (የቡድን መሪ) ጋር እንዲሰራ በማድረግ የማጠናከሪያ ስልቶችን እንዲማር ማድረግ።"
              : "Mekonnen scored low in assembly speed. Shadow him with a senior lead carpenter for 3 shifts to master Rapid Wedge-Lock pinning safely."
          }
        ],
        weeklyManagementReport: ``,
        generatedAt: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  // Run progress photo simulation
  const handleRunProgressAI = () => {
    setProgressAnalyzing(true);
    setProgressAnalyzed(false);
    setTimeout(() => {
      setProgressAnalyzing(false);
      setProgressAnalyzed(true);
    }, 1500);
  };

  // Run safety scanner simulation
  const handleRunSafetyAI = () => {
    setSafetyScanning(true);
    setSafetyScanned(false);
    setTimeout(() => {
      setSafetyScanning(false);
      setSafetyScanned(true);
    }, 1800);
  };

  // Colors for Pie Charts
  const COLORS_PROGRESS = ["#DC2626", "#1E293B"];
  const COLORS_SAFETY = ["#10B981", "#F59E0B", "#EF4444"];

  // Formulate dynamic material requirements based on forecast adjustable sliders
  const dynamicMaterials = useMemo(() => {
    const baseConcrete = 180; // m3 per floor average
    const baseSteel = 14.5; // tons
    const basePins = 1200; // wedge pins

    // adjust slightly based on target cycle speed and allowance
    const concreteNeeded = Math.round(baseConcrete * (1 + (8 - targetCycleDays) * 0.02));
    const steelNeeded = Math.round(baseSteel * 10) / 10;
    const pinsNeeded = Math.round(basePins * (1 + aluminumLossAllowance / 100));
    
    return {
      concrete: concreteNeeded,
      steel: steelNeeded,
      pins: pinsNeeded,
      panels: Math.round(380 * (customCrewSize / 12))
    };
  }, [targetCycleDays, customCrewSize, aluminumLossAllowance]);

  // Calculate Cost Overrun Risk dynamically
  const costOverrunRisk = useMemo(() => {
    let riskScore = 32; // Low baseline
    if (targetCycleDays < 6) riskScore += 25; // rushing causes quality rework costs
    if (targetCycleDays > 7) riskScore += 35; // delay adds structural overhead & labor salary
    if (customCrewSize > 14) riskScore += 18; // excess crew budget pressure
    
    let level: "Low" | "Medium" | "High" = "Low";
    if (riskScore > 65) level = "High";
    else if (riskScore > 40) level = "Medium";

    return {
      score: riskScore,
      level,
      estimatedLossBirr: riskScore * 48500
    };
  }, [targetCycleDays, customCrewSize]);

  // Simple Markdown to HTML parser
  const parseMarkdown = (md: string) => {
    if (!md) return "";
    return md
      .replace(/^# (.*$)/gim, '<h1 class="text-xl font-bold text-slate-900 border-b pb-2 mb-3">$1</h1>')
      .replace(/^## (.*$)/gim, '<h2 class="text-base font-bold text-slate-800 mt-4 mb-2">$1</h2>')
      .replace(/^### (.*$)/gim, '<h3 class="text-sm font-semibold text-slate-800 mt-3 mb-1">$1</h3>')
      .replace(/^\* (.*$)/gim, '<li class="list-disc list-inside text-slate-600 mb-1 ml-4">$1</li>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900">$1</strong>')
      .replace(/\n/g, "<br />");
  };

  return (
    <div className="space-y-6">
      
      {/* Banner Card */}
      <div className="bg-gradient-to-r from-red-950 via-slate-900 to-slate-950 rounded-2xl p-6 text-white overflow-hidden relative shadow-xl border border-red-900/30">
        <div className="absolute right-0 top-0 opacity-15 pointer-events-none">
          <Brain size={220} className="text-red-500 animate-pulse" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-1.5">
              <span className="bg-red-600 text-white text-[9px] uppercase tracking-widest font-black px-2.5 py-0.5 rounded-full flex items-center space-x-1 animate-pulse">
                <Sparkles size={10} />
                <span>OVID AI Core 3.5</span>
              </span>
              <span className="bg-slate-800 text-slate-300 text-[9px] tracking-wider px-2 py-0.5 rounded-full font-mono">
                Cognitive Real-Time Model
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight flex items-center space-x-2">
              <span>{isAmharic ? "አይአይ ኢንተለጀንስ እና ትንበያ ማዕከል" : "OVID AI Intelligence & Forecasting Hub"}</span>
            </h1>
            <p className="text-slate-300 text-xs max-w-xl leading-relaxed font-medium">
              {isAmharic 
                ? "የኮንስትራክሽን ዕለታዊ ምስሎችን በመተንተን ግስጋሴን መለካት፣ የደህንነት ደንብ ጥሰቶችን መለየት እና የወደፊት የቁሳቁስ ፍላጎቶችን መተንበይ።"
                : "Unlock multi-modal computer vision to detect assembly progress, evaluate safety breaches via real-time photo matrices, and run neural budget risk forecasts."}
            </p>
          </div>

          <div className="flex items-center space-x-3 flex-shrink-0">
            <button
              onClick={() => {
                runPredictionHeuristic();
                setProgressAnalyzing(true);
                setSafetyScanning(true);
                setTimeout(() => { setProgressAnalyzing(false); setSafetyScanning(false); }, 1200);
              }}
              disabled={loading}
              className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center space-x-1.5 cursor-pointer disabled:bg-slate-700"
            >
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
              <span>{isAmharic ? "ሁሉንም አድስ" : "Sync All Insights"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Subtab Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200/80 pb-3 no-print">
        <button
          onClick={() => setActiveSubTab("overview")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
            activeSubTab === "overview" 
              ? "bg-slate-900 text-white shadow-md" 
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <Activity size={14} />
          <span>{isAmharic ? "አጠቃላይ ማጠቃለያ" : "Dashboard Overview"}</span>
        </button>

        <button
          onClick={() => setActiveSubTab("progress")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
            activeSubTab === "progress" 
              ? "bg-slate-900 text-white shadow-md" 
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <Camera size={14} />
          <span>{isAmharic ? "የሂደት ክትትል" : "Progress Photo AI"}</span>
        </button>

        <button
          onClick={() => setActiveSubTab("safety")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
            activeSubTab === "safety" 
              ? "bg-slate-900 text-white shadow-md" 
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <ShieldAlert size={14} />
          <span>{isAmharic ? "የደህንነት ቁጥጥር (Safety AI)" : "Safety Guard Vision AI"}</span>
        </button>

        <button
          onClick={() => setActiveSubTab("forecast")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
            activeSubTab === "forecast" 
              ? "bg-slate-900 text-white shadow-md" 
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <Sliders size={14} />
          <span>{isAmharic ? "የትንበያ እቅድ አውጪ" : "Forecast Planner AI"}</span>
        </button>
      </div>

      {/* --- SUBTAB CONTENT 1: OVERVIEW DASHBOARD --- */}
      {activeSubTab === "overview" && (
        <div className="space-y-6">
          
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Completion Date */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">
                  {isAmharic ? "የማጠናቀቂያ ትንበያ" : "Completion Forecast"}
                </span>
                <div className="p-2 bg-red-50 text-red-600 rounded-xl">
                  <Clock size={16} />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                  {predictionData?.predictedCompletionDate || "2026-11-20"}
                </p>
                <p className="text-[10px] text-slate-500 font-medium">
                  {isAmharic 
                    ? "* በፎቅ 4 አማካይ የግንባታ ፍጥነት (6.4 ቀናት) የተሰላ" 
                    : "* Computed at present 6.4 Days/Floor cycle speed"}
                </p>
              </div>
            </div>

            {/* Global Safety Rating */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">
                  {isAmharic ? "የደህንነት ጠቋሚ ውጤት" : "Safety Compliance Index"}
                </span>
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <ShieldAlert size={16} />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-baseline space-x-2">
                  <span className="text-3xl font-black text-slate-900 font-mono">92.4%</span>
                  <span className="text-xs text-emerald-600 font-bold">▲ Good</span>
                </div>
                <p className="text-[10px] text-slate-500 font-medium">
                  {isAmharic 
                    ? "2 የራስ ቁር ጥሰቶች በዞን ለ ተገኝተዋል" 
                    : "2 active safety violations flagged in Zone B"}
                </p>
              </div>
            </div>

            {/* Productivity Score */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">
                  {isAmharic ? "የምርታማነት ደረጃ" : "Cycle Productivity Score"}
                </span>
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <Activity size={16} />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-baseline space-x-2">
                  <span className="text-3xl font-black text-slate-900 font-mono">85.6%</span>
                  <span className="text-xs text-blue-600 font-bold">Stable</span>
                </div>
                <p className="text-[10px] text-slate-500 font-medium">
                  {isAmharic 
                    ? "ከታቀደው በ1.2 ቀናት ብልጫ በዞን ሀ" 
                    : "Zone A assembly ahead of planned timeline"}
                </p>
              </div>
            </div>

            {/* Cost Overrun Risk */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">
                  {isAmharic ? "የበጀት ማለፍ ስጋት" : "Cost Overrun Risk Index"}
                </span>
                <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                  <Coins size={16} />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-baseline space-x-2">
                  <span className="text-3xl font-black text-amber-600 font-mono">Medium</span>
                  <span className="text-[10px] text-slate-400 font-bold">(Score: 42)</span>
                </div>
                <p className="text-[10px] text-slate-500 font-medium">
                  {isAmharic ? "ከቁሳቁስ መባከን ጋር የተያያዘ" : "Driven by aluminum panel loss allowance"}
                </p>
              </div>
            </div>

          </div>

          {/* Graphical Analysis of Progress Cycles & Delayed Risk Alert */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Cycle Durations Area Chart */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {isAmharic ? "የፎርምወርክ መገጣጠም ሳይክል ፍጥነት" : "Aluminum Formwork Cycle Durations Trend"}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {isAmharic ? "ካለፉት 6 ወለሎች አንጻር የታቀደ እና ትክክለኛ የሳይክል ቀናት (ግብ፦ 6.0 ቀናት)" : "Target vs Actual cycle days over completed high-rise floors"}
                  </p>
                </div>
                <span className="bg-slate-100 text-slate-700 text-[10px] px-2.5 py-1 rounded-lg font-mono">
                  {isAmharic ? "አማካይ ሳይክል፦ 6.4 ቀናት" : "Avg. 6.4 Days/Floor"}
                </span>
              </div>

              <div className="h-64 text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={[
                      { name: "Floor 1", Planned: 6, Actual: 5.8 },
                      { name: "Floor 2", Planned: 6, Actual: 6.2 },
                      { name: "Floor 3", Planned: 6, Actual: 5.9 },
                      { name: "Floor 4 (Active)", Planned: 6, Actual: 6.4 },
                      { name: "Floor 5 (Forecast)", Planned: 6, Actual: 6.1 },
                      { name: "Floor 6 (Forecast)", Planned: 6, Actual: 5.9 }
                    ]}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorPlanned" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1e293b" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#1e293b" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} />
                    <YAxis stroke="#94a3b8" fontSize={10} domain={[4, 8]} />
                    <Tooltip />
                    <Area type="monotone" dataKey="Planned" stroke="#1e293b" strokeWidth={2} fillOpacity={1} fill="url(#colorPlanned)" name="Planned Cycle (Target)" />
                    <Area type="monotone" dataKey="Actual" stroke="#ef4444" strokeWidth={2.5} fillOpacity={1} fill="url(#colorActual)" name="Actual/AI Predicted Cycle" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Delay Warnings and Precursor Alerts */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="text-red-600 animate-pulse shrink-0" size={18} />
                  <h3 className="text-sm font-bold text-slate-900">
                    {isAmharic ? "ገባሪ ስጋቶች እና መዘግየቶች" : "Active Delay Warnings (AI)"}
                  </h3>
                </div>
                <p className="text-xs text-slate-400">
                  {isAmharic 
                    ? "ከካድ እና ከምስል ቁጥጥር የተገኙ ከፍተኛ ትኩረት የሚሹ አደጋዎች።" 
                    : "Precursor indicators requiring immediate field intervention."}
                </p>

                <div className="space-y-3">
                  {predictionData?.predictedDelayedZones.map((z, idx) => (
                    <div key={idx} className="p-3 bg-red-50/50 border border-red-100 rounded-xl space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="bg-slate-900 text-white font-mono font-black text-[9px] px-2 py-0.5 rounded">
                          {z.zoneId}
                        </span>
                        <span className="text-[10px] text-red-600 font-extrabold uppercase flex items-center space-x-1 animate-pulse">
                          <span>● {z.riskLevel} Risk</span>
                        </span>
                      </div>
                      <p className="text-slate-600 leading-relaxed font-medium text-[11px]">{z.reason}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] text-slate-500 font-medium">
                {isAmharic 
                  ? "ማሳሰቢያ፦ የብረት ስራ ቡድንን ማዛወር የሳይክል መዘግየትን በ 85% ሊቀንስ ይችላል።"
                  : "Insight: Manpower reallocations from Completed Zone A will mitigate elevator core delays."}
              </div>
            </div>

          </div>

          {/* AI Automated Task Suggestions & Mentorship */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Manpower recommendations */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <UserPlus className="text-red-600" size={18} />
                <span>{isAmharic ? "ምቹ የሰራተኞች ድልድል ምክር" : "Automated Manpower Shift Recommendations"}</span>
              </h3>

              <div className="space-y-3">
                {predictionData?.manpowerAllocationRecommendation.map((rec, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-2 text-xs">
                    <div className="flex justify-between items-center border-b border-slate-200 pb-1.5">
                      <span className="font-extrabold text-slate-800">{rec.name}</span>
                      <span className="text-[9px] font-mono bg-red-100 text-red-800 px-2 py-0.5 rounded font-black">
                        {rec.teamId}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                      <span>{isAmharic ? "ያለበት ዞን፦" : "Current Zone:"} <strong className="text-slate-800">{rec.currentZone}</strong></span>
                      <div className="flex items-center space-x-1 text-red-600 animate-pulse">
                        <ChevronRight size={14} />
                        <span>{isAmharic ? "አዛውር ወደ፦" : "Shift to:"} <strong className="underline">{rec.recommendMoveToZone}</strong></span>
                      </div>
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed italic">"{rec.reason}"</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Overtime requirements */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Clock className="text-red-600" size={18} />
                <span>{isAmharic ? "የትርፍ ሰዓት ስራ ፍላጎት ትንበያ" : "Predicted Overtime Requirements"}</span>
              </h3>

              <div className="space-y-3">
                {predictionData?.overtimeRequirements.map((ot, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-extrabold text-slate-800">{ot.trade}</span>
                      <span className="bg-emerald-100 text-emerald-800 font-black font-mono text-[10px] px-2 py-0.5 rounded">
                        +{ot.recommendedHours} hrs/day
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed">{ot.reason}</p>
                  </div>
                ))}

                {/* Training Guidelines */}
                <div className="p-3 bg-red-50/50 border border-red-100 rounded-xl space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-extrabold text-red-900">{isAmharic ? "ልዩ ስልጠና ማሳሰቢያ" : "Targeted Training Alert"}</span>
                    <span className="bg-red-200 text-red-800 font-black text-[9px] px-1.5 py-0.5 rounded">OVID-W-108</span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    <strong>{predictionData?.lowPerformingWorkers[0]?.name || "Mekonnen Haile"}:</strong> {predictionData?.lowPerformingWorkers[0]?.suggestions || "Needs immediate layout mentoring."}
                  </p>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* --- SUBTAB CONTENT 2: PROGRESS DETECTION (CAD VS PHOTO) --- */}
      {activeSubTab === "progress" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left selector and parameters (4 cols) */}
            <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs space-y-5">
              <div className="space-y-1.5">
                <h3 className="text-sm font-bold text-slate-900">
                  {isAmharic ? "ዕለታዊ የምስል ፍተሻ ማዕከል" : "1. Choose Construction Photo"}
                </h3>
                <p className="text-xs text-slate-400">
                  {isAmharic ? "ከጣቢያው በተንቀሳቃሽ ስልክ ወይም በቋሚ ካሜራ የተነሱ ዕለታዊ ምስሎች" : "Select an active daily site photo feed to process with computer vision model."}
                </p>
              </div>

              {/* Photo Selector */}
              <div className="space-y-2">
                {presetPhotos.map((photo, idx) => (
                  <button
                    key={photo.id}
                    onClick={() => {
                      setSelectedPhotoIdx(idx);
                      setProgressAnalyzed(true);
                    }}
                    className={`w-full p-3 rounded-xl border text-left text-xs transition-all flex items-center space-x-3 cursor-pointer ${
                      selectedPhotoIdx === idx 
                        ? "bg-red-50/50 border-red-500 shadow-sm" 
                        : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <div className="w-12 h-12 rounded-lg bg-cover bg-center shrink-0 border border-slate-200" style={{ backgroundImage: `url(${photo.url})` }} />
                    <div className="space-y-0.5 overflow-hidden">
                      <span className="font-extrabold text-slate-800 block truncate">
                        {isAmharic ? photo.nameAm : photo.name}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium block">
                        {isAmharic ? photo.workActivityAm : photo.workActivity}
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Parameters Information */}
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
                <div className="flex items-center space-x-1 text-slate-800 font-bold text-xs">
                  <Database size={14} className="text-red-600" />
                  <span>{isAmharic ? "ተያያዥ የካድ መረጃ" : "CAD Design Alignment Settings"}</span>
                </div>
                
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-400 font-medium">{isAmharic ? "የካድ ፋይል፦" : "CAD Drawing:"}</span>
                    <span className="font-mono text-[10px] font-bold text-slate-800">{activePhoto.cadFile}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-400 font-medium">{isAmharic ? "የማነፃጸሪያ እቅድ፦" : "Planned Baseline:"}</span>
                    <span className="font-bold text-slate-800">{activePhoto.plannedPercent}% {isAmharic ? "ሂደት" : "Progress"}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400 font-medium">{isAmharic ? "ጣቢያ አካባቢ፦" : "Project Block:"}</span>
                    <span className="font-bold text-slate-800">Tower 1 - Floor 4</span>
                  </div>
                </div>
              </div>

              {/* Run AI button */}
              <button
                onClick={handleRunProgressAI}
                disabled={progressAnalyzing}
                className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md cursor-pointer flex items-center justify-center space-x-2"
              >
                {progressAnalyzing ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>{isAmharic ? "ምስሉን ከካድ ጋር በማነጻጸር ላይ..." : "Analyzing CAD Layers..."}</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    <span>{isAmharic ? "የሂደት ፍተሻውን አስጀምር" : "Process Photo & Detect Progress"}</span>
                  </>
                )}
              </button>
            </div>

            {/* Photo Comparison Arena (8 cols) */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* Photo Workspace View */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg relative">
                
                {/* Photo frame */}
                <div className="aspect-video w-full bg-cover bg-center relative flex items-center justify-center transition-all" style={{ backgroundImage: `url(${activePhoto.url})` }}>
                  
                  {/* CAD Overlay lines effect */}
                  {showCADOverlay && (
                    <div className="absolute inset-0 bg-blue-500/10 border-4 border-dashed border-blue-500 pointer-events-none flex items-center justify-center animate-pulse">
                      {/* Grid representation */}
                      <div className="absolute inset-0 grid grid-cols-6 grid-rows-6 opacity-30">
                        {Array.from({ length: 36 }).map((_, i) => (
                          <div key={i} className="border border-blue-400/50"></div>
                        ))}
                      </div>
                      <span className="bg-blue-600 text-white font-mono font-black text-[10px] px-3 py-1 rounded shadow-md uppercase tracking-wider">
                        CAD Vector Grid Layer (X-W1) Linked
                      </span>
                    </div>
                  )}

                  {/* Laser Scanning line animation during progress analyzing */}
                  {progressAnalyzing && (
                    <div className="absolute inset-x-0 h-1 bg-red-500 shadow-[0_0_15px_#ef4444] animate-bounce pointer-events-none"></div>
                  )}

                  {/* Watermark label */}
                  <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-md border border-white/10 p-2 rounded-lg text-[10px] text-white space-y-0.5">
                    <p className="font-bold flex items-center space-x-1 text-red-400">
                      <Camera size={10} />
                      <span>Live Site Camera Feed</span>
                    </p>
                    <p className="font-mono text-slate-300">Time: 2026-07-15 10:30 UTC</p>
                  </div>

                  {/* CAD Toggle Button inside image */}
                  <div className="absolute top-3 right-3 flex space-x-2">
                    <button
                      onClick={() => setShowCADOverlay(!showCADOverlay)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center space-x-1 cursor-pointer transition-all ${
                        showCADOverlay 
                          ? "bg-blue-600 text-white shadow-md border border-blue-400" 
                          : "bg-black/60 hover:bg-black/80 text-slate-300 border border-white/10"
                      }`}
                    >
                      <Layers size={11} />
                      <span>{showCADOverlay ? "Hide CAD Schematic" : "Overlay Approved CAD"}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Detected Progress Results and Warnings */}
              {progressAnalyzed && !progressAnalyzing && (
                <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs space-y-6 animate-fadeIn">
                  
                  {/* Title and Badge */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                    <div className="space-y-1">
                      <h4 className="font-extrabold text-slate-900 text-base">
                        {isAmharic ? "የማነፃፀሪያ ውጤት ማጠቃለያ" : "Computer Vision Progress Detection Analysis"}
                      </h4>
                      <p className="text-xs text-slate-400">
                        {isAmharic ? "በጣቢያው ፎቶግራፍ እና በፀደቀው ካድ ስዕል መካከል ያለው ንፅፅር" : "Spatial verification comparing design templates vs physical formwork erection."}
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-slate-500">Status:</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-black uppercase flex items-center space-x-1 ${
                        activePhoto.targetComparison === "Ahead" 
                          ? "bg-emerald-100 text-emerald-800" 
                          : "bg-red-100 text-red-800"
                      }`}>
                        <span>● {activePhoto.targetComparison === "Ahead" ? (isAmharic ? "ከእቅድ በላይ" : "Ahead of Schedule") : (isAmharic ? "መዘግየት አለ" : "Behind Schedule")}</span>
                      </span>
                    </div>
                  </div>

                  {/* The Three Core Deliverables */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    
                    {/* 1. Completion Percentage */}
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 flex flex-col items-center text-center space-y-4">
                      <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">
                        {isAmharic ? "የተጠናቀቀው በመቶኛ" : "Actual Completion Percentage"}
                      </span>

                      {/* Circular Gauge using SVG */}
                      <div className="relative w-28 h-28 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle cx="56" cy="56" r="48" stroke="#f1f5f9" strokeWidth="10" fill="transparent" />
                          <circle cx="56" cy="56" r="48" stroke={activePhoto.targetComparison === "Ahead" ? "#10B981" : "#EF4444"} strokeWidth="10" fill="transparent"
                            strokeDasharray={2 * Math.PI * 48}
                            strokeDashoffset={2 * Math.PI * 48 * (1 - activePhoto.completionPercent / 100)}
                            className="transition-all duration-1000"
                          />
                        </svg>
                        <div className="absolute text-center">
                          <span className="text-2xl font-black text-slate-900 font-mono">
                            {activePhoto.completionPercent}%
                          </span>
                          <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-widest">
                            Target: {activePhoto.plannedPercent}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 2. Delay Warning */}
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-3 flex flex-col justify-between">
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">
                          {isAmharic ? "የመዘግየት ማስጠንቀቂያ" : "Structural Delay Warning"}
                        </span>
                        <h5 className="text-xs font-bold text-slate-800 flex items-center space-x-1.5 pt-1">
                          <AlertTriangle size={14} className={activePhoto.targetComparison === "Ahead" ? "text-emerald-500" : "text-red-500 animate-pulse"} />
                          <span>{activePhoto.targetComparison === "Ahead" ? (isAmharic ? "የለም" : "No Cycle Threat") : (isAmharic ? "እስጋሪ ማስጠንቀቂያ" : "Cycle Bottleneck Detected")}</span>
                        </h5>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-normal font-medium">
                        {isAmharic ? activePhoto.delayWarningAm : activePhoto.delayWarning}
                      </p>
                      <div className="bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 text-[10px] text-slate-400 font-mono flex justify-between">
                        <span>Tolerance Limit:</span>
                        <span className="text-red-600 font-bold">+/- 2mm</span>
                      </div>
                    </div>

                    {/* 3. Productivity Score */}
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-4 text-center flex flex-col justify-between">
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">
                          {isAmharic ? "የምርታማነት ውጤት" : "Overall Productivity Score"}
                        </span>
                        <p className="text-4xl font-black text-slate-900 font-mono pt-2">
                          {activePhoto.productivityScore}
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-red-600 h-full" style={{ width: `${activePhoto.productivityScore}%` }} />
                        </div>
                        <span className="text-[9px] text-slate-400 font-bold block">
                          {isAmharic ? "ምርታማነት ደረጃ፦ " : "Performance Index: "}
                          <strong className="text-slate-700">{activePhoto.productivityScore >= 85 ? (isAmharic ? "ከፍተኛ" : "Excellent") : (isAmharic ? "አማካይ" : "Needs Support")}</strong>
                        </span>
                      </div>
                    </div>

                  </div>

                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* --- SUBTAB CONTENT 3: SAFETY AI COMPLIANCE --- */}
      {activeSubTab === "safety" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Visual Interactive Photo Scanner (8 cols) */}
            <div className="lg:col-span-8 space-y-4">
              <div className="bg-slate-950 border border-slate-900 rounded-2xl overflow-hidden relative shadow-xl">
                
                {/* Photo Area with Bounding Box Annotations */}
                <div className="aspect-video w-full bg-cover bg-center relative transition-all" style={{ backgroundImage: `url(${activePhoto.url})` }}>
                  
                  {/* Safety scanner sweep animation */}
                  {safetyScanning && (
                    <div className="absolute inset-0 bg-emerald-500/10 pointer-events-none flex items-center justify-center">
                      {/* Radar sweep lines */}
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/20 to-transparent animate-pulse h-1/2 w-full top-0"></div>
                      <span className="bg-emerald-600 text-white font-mono font-black text-xs px-3 py-1 rounded shadow-lg uppercase tracking-wider animate-bounce">
                        Safety Neural Network Scanning...
                      </span>
                    </div>
                  )}

                  {/* Detected Hazard Bounding Box Markers */}
                  {safetyScanned && !safetyScanning && activePhoto.safetyHazards.map((hz) => (
                    <div
                      key={hz.id}
                      onMouseEnter={() => setHoveredHazardId(hz.id)}
                      onMouseLeave={() => setHoveredHazardId(null)}
                      className={`absolute border-2 transition-all duration-300 cursor-pointer ${
                        hz.status === "safe" 
                          ? "border-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/25" 
                          : hz.status === "warning" 
                          ? "border-amber-500 bg-amber-500/10 hover:bg-amber-500/25"
                          : "border-red-500 bg-red-500/15 hover:bg-red-500/30 animate-pulse"
                      }`}
                      style={{
                        left: `${hz.x}%`,
                        top: `${hz.y}%`,
                        width: `${hz.width}%`,
                        height: `${hz.height}%`
                      }}
                    >
                      {/* Badge indicator inside box */}
                      <span className={`absolute -top-5 left-0 px-1.5 py-0.5 rounded text-[8px] font-black uppercase text-white shadow-md ${
                        hz.status === "safe" ? "bg-emerald-600" : hz.status === "warning" ? "bg-amber-600" : "bg-red-600 animate-pulse"
                      }`}>
                        {isAmharic ? (hz.status === "safe" ? "ደህንነቱ የተጠበቀ" : hz.status === "warning" ? "ማስጠንቀቂያ" : "አደገኛ") : hz.type.toUpperCase()}
                      </span>
                    </div>
                  ))}

                  {/* Watermark indicators */}
                  <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md p-2 rounded-lg text-[9px] text-slate-300 border border-white/5 font-mono">
                    <p className="flex items-center space-x-1 font-bold text-emerald-400">
                      <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                      <span>OVID SafetyGuard AI Active</span>
                    </p>
                    <p>Accuracy Probability: 98.4%</p>
                  </div>

                  <div className="absolute bottom-3 right-3 flex space-x-2">
                    <button
                      onClick={handleRunSafetyAI}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-wider rounded-lg flex items-center space-x-1 cursor-pointer transition-all shadow-md"
                    >
                      <RefreshCw size={11} className={safetyScanning ? "animate-spin" : ""} />
                      <span>Re-Scan Area</span>
                    </button>
                  </div>

                </div>

              </div>

              {/* Selection Photo Helper Row */}
              <div className="flex gap-2.5 overflow-x-auto py-2">
                {presetPhotos.map((p, idx) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedPhotoIdx(idx);
                      setSafetyScanned(true);
                    }}
                    className={`px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border transition-all shrink-0 cursor-pointer ${
                      selectedPhotoIdx === idx ? "bg-red-100/70 text-red-900 border-red-400" : "border-slate-200"
                    }`}
                  >
                    {isAmharic ? p.nameAm : p.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Right Detection Inspector detail card (4 cols) */}
            <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs space-y-4">
              
              <div className="border-b border-slate-100 pb-3 space-y-1">
                <div className="flex items-center space-x-1.5">
                  <ShieldAlert className="text-red-600 animate-pulse" size={18} />
                  <h3 className="text-sm font-extrabold text-slate-900">
                    {isAmharic ? "አይአይ የደህንነት ፍተሻ ውጤት" : "Safety AI Inspector HUD"}
                  </h3>
                </div>
                <p className="text-[11px] text-slate-400">
                  {isAmharic ? "በምስሉ ላይ ምልክት የተደረገባቸውን ሳጥኖች ይጫኑ ወይም ዝርዝሩን ይመልከቱ።" : "Click bounding boxes on the scanner window to view spatial safety parameters."}
                </p>
              </div>

              {/* Safety Logs and Details */}
              <div className="space-y-3.5">
                
                {/* Active Photo Hazards List */}
                <div className="space-y-2">
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">
                    {isAmharic ? "የተገኙ የደህንነት ግድፈቶች" : "Identified Entities & Threats"}
                  </span>

                  <div className="space-y-2">
                    {activePhoto.safetyHazards.map((hz) => (
                      <div
                        key={hz.id}
                        onMouseEnter={() => setHoveredHazardId(hz.id)}
                        onMouseLeave={() => setHoveredHazardId(null)}
                        className={`p-3 rounded-xl border text-xs space-y-1.5 transition-all ${
                          hoveredHazardId === hz.id 
                            ? "bg-slate-900 text-white border-slate-900 scale-102" 
                            : hz.status === "safe"
                            ? "bg-emerald-50/40 border-emerald-100/80 text-emerald-950"
                            : hz.status === "warning"
                            ? "bg-amber-50/40 border-amber-100/80 text-amber-950"
                            : "bg-red-50/40 border-red-100/80 text-red-950"
                        }`}
                      >
                        <div className="flex items-center justify-between border-b border-slate-200/30 pb-1 font-bold">
                          <span>{isAmharic ? hz.labelAm : hz.label}</span>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                            hz.status === "safe" ? "bg-emerald-500 text-white" : hz.status === "warning" ? "bg-amber-500 text-white" : "bg-red-500 text-white animate-pulse"
                          }`}>
                            {hz.status}
                          </span>
                        </div>
                        <p className="text-[11px] leading-relaxed font-medium">
                          {isAmharic ? hz.descriptionAm : hz.description}
                        </p>
                      </div>
                    ))}
                  </div>

                </div>

                {/* Toolbox meeting tracker summary */}
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 space-y-2 text-xs">
                  <div className="flex justify-between items-center text-slate-800 font-bold">
                    <span>{isAmharic ? "ዕለታዊ ቱልቦክስ ስብሰባ" : "Daily Toolbox Safety Talk"}</span>
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded font-bold">100% Present</span>
                  </div>
                  <p className="text-slate-500 text-[11px] leading-relaxed font-medium">
                    {isAmharic 
                      ? "የዕለቱ የደህንነት ስልጠና በአልሙኒየም ፎርምወርክ ቁሶችን በጥንቃቄ መሸከም ላይ ያተኮረ ነበር።" 
                      : "SOP Focus: High-velocity wedgelock pinch-point evasion and cantilever scaffold hook latch audits."}
                  </p>
                </div>

              </div>

            </div>
          </div>
        </div>
      )}

      {/* --- SUBTAB CONTENT 4: FORECAST AI SCHEDULER & MATERIALS --- */}
      {activeSubTab === "forecast" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Parameter Adjustment Inputs (4 cols) */}
            <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs space-y-6">
              
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">
                  {isAmharic ? "የትንበያ መቆጣጠሪያ መጋረጃ" : "Interactive Forecasting Matrix"}
                </h3>
                <p className="text-xs text-slate-400">
                  {isAmharic ? "የሰራተኛ ቁጥር እና የግንባታ ቀናትን በማስተካከል የወደፊት የበጀት እና የእቃዎች አቅርቦትን አስላ።" : "Simulate parameter limits to predict completion targets and material burn speeds."}
                </p>
              </div>

              {/* Slider 1: Cycle Duration target */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between font-bold text-slate-700">
                  <span>{isAmharic ? "የታቀደ ሳይክል ቀናት (ግብ)፦" : "Target Formwork Cycle (Days):"}</span>
                  <span className="text-red-600 font-mono text-sm">{targetCycleDays} Days</span>
                </div>
                <input
                  type="range"
                  min="4"
                  max="10"
                  step="1"
                  value={targetCycleDays}
                  onChange={(e) => setTargetCycleDays(parseInt(e.target.value))}
                  className="w-full accent-red-600 cursor-pointer"
                />
                <span className="text-[10px] text-slate-400 block">
                  {isAmharic ? "ባለ 4-ቀን ፈጣን ሳይክል የደህንነት እና የጥራት ቁጥጥር ጫናን ይጨምራል።" : "Rushing to 4 days requires heavy overtime carpentry and risks alignment snags."}
                </span>
              </div>

              {/* Slider 2: Custom Crew Size */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between font-bold text-slate-700">
                  <span>{isAmharic ? "የቡድን አባላት ብዛት (በዞን)፦" : "Active Crew Size (Per Zone):"}</span>
                  <span className="text-red-600 font-mono text-sm">{customCrewSize} Workers</span>
                </div>
                <input
                  type="range"
                  min="6"
                  max="20"
                  step="1"
                  value={customCrewSize}
                  onChange={(e) => setCustomCrewSize(parseInt(e.target.value))}
                  className="w-full accent-red-600 cursor-pointer"
                />
                <span className="text-[10px] text-slate-400 block">
                  {isAmharic ? "ተስማሚው የሰራተኛ ብዛት 10-12 አባላት ነው።" : "Optimal zone crew size is 10-12 carpenters to balance spacer speed."}
                </span>
              </div>

              {/* Slider 3: Aluminum Panel Loss allowance */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between font-bold text-slate-700">
                  <span>{isAmharic ? "የመለዋወጫ ፒን መጥፋት ፍጥነት፦" : "Wedge Pin Loss Allowance (%):"}</span>
                  <span className="text-red-600 font-mono text-sm">{aluminumLossAllowance}%</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="5.0"
                  step="0.5"
                  value={aluminumLossAllowance}
                  onChange={(e) => setAluminumLossAllowance(parseFloat(e.target.value))}
                  className="w-full accent-red-600 cursor-pointer"
                />
                <span className="text-[10px] text-slate-400 block">
                  {isAmharic ? "በየዕለቱ የሚጠፉ Wedge Pins መቶኛ።" : "Average loss rate of small joint wedge-pins during rapid stripping."}
                </span>
              </div>

              {/* Recalculate Button */}
              <button
                onClick={runPredictionHeuristic}
                disabled={loading}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md cursor-pointer flex items-center justify-center space-x-1.5"
              >
                <Brain size={14} className="text-red-500" />
                <span>{isAmharic ? "የማጠናቀቂያ ትንበያን አስላ" : "Recalculate Predictive Forecast"}</span>
              </button>

            </div>

            {/* Right Predictions Display (8 cols) */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* Dynamic Forecast AI Results Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* 1. Material Requirements Card */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs space-y-4">
                  <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
                    <Database className="text-red-600" size={18} />
                    <h4 className="text-sm font-extrabold text-slate-900">
                      {isAmharic ? "ለሚቀጥለው ወለል የቁሳቁስ ፍላጎት" : "Cycle Material Requirements (3 Floors)"}
                    </h4>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    
                    {/* Concrete */}
                    <div className="bg-slate-50 p-3.5 rounded-xl space-y-1">
                      <span className="text-slate-400 font-bold block text-[10px] uppercase">Concrete Volume</span>
                      <span className="text-xl font-black text-slate-900 font-mono">
                        {dynamicMaterials.concrete * 3} m³
                      </span>
                      <span className="text-[9px] text-slate-500 block">Grade C-30 High Strength</span>
                    </div>

                    {/* Rebar */}
                    <div className="bg-slate-50 p-3.5 rounded-xl space-y-1">
                      <span className="text-slate-400 font-bold block text-[10px] uppercase">Reinforced Steel</span>
                      <span className="text-xl font-black text-slate-900 font-mono">
                        {Math.round(dynamicMaterials.steel * 3 * 10) / 10} Tons
                      </span>
                      <span className="text-[9px] text-slate-500 block">Grade 60 Deformed Rebar</span>
                    </div>

                    {/* Wedge Pins */}
                    <div className="bg-slate-50 p-3.5 rounded-xl space-y-1">
                      <span className="text-slate-400 font-bold block text-[10px] uppercase">Wedge Pins (Loss backup)</span>
                      <span className="text-xl font-black text-slate-900 font-mono">
                        {dynamicMaterials.pins * 3} Pcs
                      </span>
                      <span className="text-[9px] text-red-600 font-semibold block">Includes {aluminumLossAllowance}% Loss</span>
                    </div>

                    {/* Active Panels */}
                    <div className="bg-slate-50 p-3.5 rounded-xl space-y-1">
                      <span className="text-slate-400 font-bold block text-[10px] uppercase">Aluminum Panels</span>
                      <span className="text-xl font-black text-slate-900 font-mono">
                        {dynamicMaterials.panels} Sheets
                      </span>
                      <span className="text-[9px] text-slate-500 block">6061-T6 High Tensile</span>
                    </div>

                  </div>
                </div>

                {/* 2. Budget Overrun Risk Indicator */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
                      <Coins className="text-red-600" size={18} />
                      <h4 className="text-sm font-extrabold text-slate-900">
                        {isAmharic ? "የበጀት ማለፍ ስጋት ስሌት" : "Cost Overrun Risk Calculation"}
                      </h4>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500 font-medium">Risk Status:</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                        costOverrunRisk.level === "Low" 
                          ? "bg-emerald-100 text-emerald-800" 
                          : costOverrunRisk.level === "Medium" 
                          ? "bg-amber-100 text-amber-800" 
                          : "bg-red-100 text-red-800 animate-pulse"
                      }`}>
                        {isAmharic ? (costOverrunRisk.level === "Low" ? "ዝቅተኛ" : costOverrunRisk.level === "Medium" ? "አማካይ" : "ከፍተኛ") : costOverrunRisk.level} Risk
                      </span>
                    </div>

                    {/* Progress slider bar for score */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[11px] font-bold text-slate-500">
                        <span>Risk Score:</span>
                        <span>{costOverrunRisk.score}/100</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div className={`h-full transition-all duration-500 ${
                          costOverrunRisk.score < 40 ? "bg-emerald-500" : costOverrunRisk.score < 65 ? "bg-amber-500" : "bg-red-500"
                        }`} style={{ width: `${costOverrunRisk.score}%` }} />
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-red-50/50 border border-red-100 rounded-xl space-y-1 text-xs">
                    <span className="font-bold text-red-950 block">{isAmharic ? "የእርምጃ ምክረ ሃሳብ" : "Proactive Mitigation SOP"}</span>
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      {targetCycleDays < 6 
                        ? (isAmharic ? "የሳይክሉን ፍጥነት በ4 ቀናት ውስጥ መጭመቅ የጥራት ጉድለቶችን (Plumbness drift) ከማስከተሉ ባሻገር 14% ተጨማሪ የትርፍ ሰዓት ደመወዝ ወጪን ይፈጥራል።" : "Attempting a 4-day cycle increases quality snags, vertical drift and carpenter overtime wages by an estimated 14.5%. Revert target to 6.0 days.")
                        : (isAmharic ? "ሳይክሉን በ6-7 ቀናት መካከል ማስጠበቅ ጥራትን በማረጋገጥ የበጀት ብክነት ስጋትን በ 42% ይቀንሳል።" : "Maintaining a steady 6-day formwork sequence yields ideal concrete curing and secures spatial resources within authorized budgetary limits.")}
                    </p>
                  </div>
                </div>

              </div>

              {/* Graphical representation of Materials consumption vs inventory */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h4 className="text-sm font-bold text-slate-900">
                    {isAmharic ? "ቁሳቁስ በአይነት (የመጋዘን አቅርቦት ሁኔታ)" : "Material Supply Safety Margin Forecast"}
                  </h4>
                  <span className="text-[10px] text-slate-400 font-bold font-mono">Inventory Health Checklist</span>
                </div>

                <div className="space-y-3.5">
                  {[
                    { name: isAmharic ? "የኮንክሪት መጠን (Concrete C-30)" : "Concrete Grade C-30", margin: 85, color: "bg-red-600", status: isAmharic ? "ደህንነቱ የተጠበቀ" : "Safe" },
                    { name: isAmharic ? "የብረታብረት ዝርጋታ (Rebar Steel)" : "Reinforcing Deformed Steel", margin: 70, color: "bg-slate-900", status: isAmharic ? "ደህንነቱ የተጠበቀ" : "Safe" },
                    { name: isAmharic ? "የመቆለፊያ ፒኖች (Shoring Wedge Pins)" : "Wedge Connector Pins", margin: 45, color: "bg-amber-500", status: isAmharic ? "ማስጠንቀቂያ" : "Reorder Point" },
                    { name: isAmharic ? "የአሉሚኒየም ሰሌዳዎች (Formwork Panels)" : "6061-T6 Aluminum Profiles", margin: 95, color: "bg-emerald-500", status: isAmharic ? "ደህንነቱ የተጠበቀ" : "Abundant" }
                  ].map((mat, i) => (
                    <div key={i} className="space-y-1.5 text-xs font-medium">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-700">{mat.name}</span>
                        <span className={`text-[9px] font-black uppercase ${
                          mat.margin > 70 ? "text-emerald-600" : mat.margin > 40 ? "text-amber-600" : "text-red-600"
                        }`}>{mat.status} ({mat.margin}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div className={`h-full ${mat.color}`} style={{ width: `${mat.margin}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};
