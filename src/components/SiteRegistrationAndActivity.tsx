import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Building2, 
  MapPin, 
  Layers, 
  Plus, 
  Compass, 
  Search, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Activity, 
  User, 
  Calendar, 
  Upload, 
  Trash2, 
  Sparkles, 
  ArrowRight, 
  ShieldCheck, 
  FileText, 
  TrendingUp, 
  ChevronRight, 
  Eye, 
  Database,
  RefreshCw,
  PlusCircle,
  FileCode,
  FileDown,
  Camera,
  Users,
  Wrench,
  HelpCircle,
  Send,
  CheckCircle2,
  ThumbsUp,
  Map,
  X,
  Play,
  ClipboardList
} from "lucide-react";
import { Worker, Team, AttendanceRecord, UserRole } from "../types";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";

// Interfaces according to specification
export interface RegisteredSite {
  id: string; // e.g. Digital Construction ERP-SITE-2026-001
  projectName: string;
  clientName: string;
  contractorName: string;
  region: string;
  cityWoreda: string;
  gpsLocation: string; // "9.0118° N, 38.7954° E"
  googleMapsCoords: string; // "9.0118,38.7954"
  startDate: string;
  plannedCompletionDate: string;
  buildingsCount: number;
  floorsCount: number;
  zonesPerFloor: number;
  siteManager: string;
  supervisor: string;
  teamLeaders: string[];
  gangChiefs: string[];
  timeKeepers: string[];
  status: "Planning" | "Active" | "Completed" | "Closed";
  documents: {
    id: string;
    name: string;
    type: "CAD Drawing" | "Structural Drawing" | "Formwork Drawing" | "Method Statement" | "Safety Document" | "Progress Photo" | "Other";
    uploadDate: string;
    uploadedBy: string;
    fileSize: string;
  }[];
}

export interface DailyActivity {
  id: string;
  siteId: string;
  buildingName: string;
  floorNumber: number;
  zoneName: string;
  date: string;
  completedPanelsQty: number; // e.g. 45 panels
  manpowerCount: number;
  equipmentUsed: string[];
  delaysAndIssues: string;
  photos: string[]; // Mock URLs
  photographer: string;
  productivityPerWorker: number; // calculated completedPanelsQty / manpowerCount
  supervisorComments: string;
}

export interface TomorrowPlan {
  id: string;
  dailyActivityId: string;
  floorAndZone: string; // e.g. "Block A - Floor 4 - Zone B"
  remainingPanelsQty: number;
  additionalPanelsRequired: number;
  requiredManpower: number;
  requiredOvertime: boolean;
  expectedCompletionPercentage: number;
  targetStartTime: string;
  targetFinishTime: string;
  riskWarnings: string;
  status: "Draft" | "Approved";
  approvedBy?: string;
}

interface SiteRegistrationAndActivityProps {
  workers: Worker[];
  teams: Team[];
  attendance: AttendanceRecord[];
  isAmharic: boolean;
  currentUserRole: UserRole;
  onLogAction?: (action: string, details: string) => void;
}

export const SiteRegistrationAndActivity: React.FC<SiteRegistrationAndActivityProps> = ({
  workers,
  teams,
  attendance,
  isAmharic,
  currentUserRole,
  onLogAction
}) => {
  // --- SUB TAB CONTROL ---
  const [activeSubTab, setActiveSubTab] = useState<"register" | "dailyActivity" | "report">("register");

  // --- DATABASE STATE (Simulated Firestore with real-time replication effect) ---
  const [sites, setSites] = useState<RegisteredSite[]>([
    {
      id: "Digital Construction ERP-SITE-2026-001",
      projectName: "Digital Bole Heights",
      clientName: "Federal Housing Corporation",
      contractorName: "Digital Construction ERP Plc",
      region: "Addis Ababa",
      cityWoreda: "Bole Sub-City, Woreda 03",
      gpsLocation: "9.0118° N, 38.7954° E",
      googleMapsCoords: "9.0118,38.7954",
      startDate: "2025-02-15",
      plannedCompletionDate: "2026-12-30",
      buildingsCount: 3,
      floorsCount: 15,
      zonesPerFloor: 3,
      siteManager: "Eng. Yoseph Hailu",
      supervisor: "Martha Hagos",
      teamLeaders: ["Yohannes Bekele", "Hiwot Girma"],
      gangChiefs: ["Fikru Tolossa", "Chala Kebede"],
      timeKeepers: ["Abebe Girma"],
      status: "Active",
      documents: [
        { id: "S-DOC-001", name: "Approved_BoleHeights_FormworkLayout_Fl04_Z-A.dwg", type: "CAD Drawing", uploadDate: "2026-06-28", uploadedBy: "Eng. Yoseph Hailu", fileSize: "14.5 MB" },
        { id: "S-DOC-002", name: "Structural_CoreShaft_Axis-C.pdf", type: "Structural Drawing", uploadDate: "2026-07-02", uploadedBy: "Martha Hagos", fileSize: "8.2 MB" },
        { id: "S-DOC-003", name: "SOP_Aluminum_Assembly_Guide.pdf", type: "Method Statement", uploadDate: "2026-05-10", uploadedBy: "Martha Hagos", fileSize: "2.1 MB" },
        { id: "S-DOC-004", name: "SafetyCompliance_HighAltitudeFormwork.pdf", type: "Safety Document", uploadDate: "2026-05-15", uploadedBy: "Kassa Hunegn", fileSize: "1.7 MB" }
      ]
    },
    {
      id: "Digital Construction ERP-SITE-2026-002",
      projectName: "Digital Construction ERP Ayat East Block T2",
      clientName: "Digital Construction ERP System",
      contractorName: "Digital Construction ERP Plc",
      region: "Addis Ababa",
      cityWoreda: "Yeka Sub-City, Woreda 11",
      gpsLocation: "9.0254° N, 38.8612° E",
      googleMapsCoords: "9.0254,38.8612",
      startDate: "2025-06-01",
      plannedCompletionDate: "2027-04-15",
      buildingsCount: 2,
      floorsCount: 10,
      zonesPerFloor: 4,
      siteManager: "Eng. Samuel Alene",
      supervisor: "Kassa Hunegn",
      teamLeaders: ["Bekele Tesfaye"],
      gangChiefs: ["Yosef Assefa"],
      timeKeepers: ["Tsion Demeke"],
      status: "Active",
      documents: [
        { id: "S-DOC-005", name: "Composite_Formwork_BlockT2_Rev2.pdf", type: "Formwork Drawing", uploadDate: "2026-07-04", uploadedBy: "Kassa Hunegn", fileSize: "11.4 MB" }
      ]
    },
    {
      id: "Digital Construction ERP-SITE-2026-003",
      projectName: "Lideta Smart Apartments",
      clientName: "Ministry of Urban Development",
      contractorName: "Digital Construction ERP Plc",
      region: "Addis Ababa",
      cityWoreda: "Lideta Sub-City, Woreda 04",
      gpsLocation: "9.0042° N, 38.7412° E",
      googleMapsCoords: "9.0042,38.7412",
      startDate: "2026-01-10",
      plannedCompletionDate: "2027-08-01",
      buildingsCount: 4,
      floorsCount: 18,
      zonesPerFloor: 3,
      siteManager: "Eng. Daniel Girma",
      supervisor: "Solomon Kassa",
      teamLeaders: ["Abeba Kebede"],
      gangChiefs: ["Tadesse Melaku"],
      timeKeepers: ["Ruth Hailu"],
      status: "Planning",
      documents: []
    }
  ]);

  const [dailyActivities, setDailyActivities] = useState<DailyActivity[]>([
    {
      id: "ACT-001",
      siteId: "Digital Construction ERP-SITE-2026-001",
      buildingName: "Tower Block A",
      floorNumber: 4,
      zoneName: "Zone A",
      date: "2026-07-08",
      completedPanelsQty: 48,
      manpowerCount: 12,
      equipmentUsed: ["Hydraulic Aligners", "Pneumatic Clamps", "Form Oil Sprayer"],
      delaysAndIssues: "None. Weather was ideal for fast formwork assembly.",
      photos: ["https://images.unsplash.com/photo-1590069261209-f8e9b8642343?w=800&auto=format&fit=crop&q=60"],
      photographer: "TL Yohannes Bekele",
      productivityPerWorker: 4.0,
      supervisorComments: "Checked level pins. Absolute precision of alignment meets the +/- 2mm specification."
    },
    {
      id: "ACT-002",
      siteId: "Digital Construction ERP-SITE-2026-001",
      buildingName: "Tower Block A",
      floorNumber: 4,
      zoneName: "Zone B",
      date: "2026-07-07",
      completedPanelsQty: 35,
      manpowerCount: 10,
      equipmentUsed: ["Hand Tools", "Shoring Jacks", "Level Laser"],
      delaysAndIssues: "Minor shoring leveling offset delayed layout by 45 minutes.",
      photos: ["https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&auto=format&fit=crop&q=60"],
      photographer: "TL Hiwot Girma",
      productivityPerWorker: 3.5,
      supervisorComments: "Shoring prop adjustment required. Re-leveling completed before next day start."
    }
  ]);

  const [tomorrowPlans, setTomorrowPlans] = useState<TomorrowPlan[]>([
    {
      id: "PLAN-001",
      dailyActivityId: "ACT-001",
      floorAndZone: "Tower Block A - Floor 4 - Zone A",
      remainingPanelsQty: 12,
      additionalPanelsRequired: 0,
      requiredManpower: 8,
      requiredOvertime: false,
      expectedCompletionPercentage: 100,
      targetStartTime: "07:30 AM",
      targetFinishTime: "04:30 PM",
      riskWarnings: "High elevation winds predicted. Ensure safety harness double hooks are utilized.",
      status: "Approved",
      approvedBy: "Supervisor Martha Hagos"
    }
  ]);

  // --- REAL-TIME SYNC STATE ---
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncMsg, setSyncMsg] = useState<string>("Connected to Google Cloud Run container & Firebase Firestore.");

  const triggerFirebaseSync = () => {
    setIsSyncing(true);
    setSyncMsg(isAmharic ? "ከFirebase Cloud Firestore ጋር በቅጽበት እየተመሳሰለ ነው..." : "Broadcasting change stream via Firestore & cloud backups...");
    setTimeout(() => {
      setIsSyncing(false);
      setSyncMsg(isAmharic ? "ሁሉም መረጃዎች በደመና ላይ ተቀምጠዋል!" : "Cloud synchronization accomplished in real time.");
    }, 1200);
  };

  // --- SELECTION STATES ---
  const [selectedSiteId, setSelectedSiteId] = useState<string>("Digital Construction ERP-SITE-2026-001");
  const selectedSite = useMemo(() => {
    return sites.find(s => s.id === selectedSiteId) || sites[0];
  }, [sites, selectedSiteId]);

  // CAD interactive helper state inside Daily Activity
  const [selectedBld, setSelectedBld] = useState<string>("Tower Block A");
  const [selectedFlr, setSelectedFlr] = useState<number>(4);
  const [selectedZone, setSelectedZone] = useState<string>("Zone A");

  // Mock auto GPS tracking simulation
  const [gpsLoading, setGpsLoading] = useState<boolean>(false);
  const [deviceGps, setDeviceGps] = useState<string>("9.0118° N, 38.7954° E");
  const [deviceMapCoords, setDeviceMapCoords] = useState<string>("9.0118,38.7954");

  const simulateGpsCapture = () => {
    setGpsLoading(true);
    setTimeout(() => {
      // Simulate real coordinate variance around Addis Ababa
      const lat = (9.0100 + Math.random() * 0.02).toFixed(4);
      const lng = (38.7900 + Math.random() * 0.02).toFixed(4);
      setDeviceGps(`${lat}° N, ${lng}° E`);
      setDeviceMapCoords(`${lat},${lng}`);
      setGpsLoading(false);
      if (onLogAction) {
        onLogAction("Captured Device GPS", `Automatically captured current precise coordinates: ${lat}, ${lng}`);
      }
    }, 800);
  };

  // Run automatically once on mount
  useEffect(() => {
    simulateGpsCapture();
  }, []);

  // --- SITE REGISTRATION FORM STATES ---
  const [formProjName, setFormProjName] = useState("");
  const [formClient, setFormClient] = useState("");
  const [formContractor, setFormContractor] = useState("Digital Construction ERP Plc");
  const [formRegion, setFormRegion] = useState("Addis Ababa");
  const [formCityWoreda, setFormCityWoreda] = useState("");
  const [formStart, setFormStart] = useState("");
  const [formEnd, setFormEnd] = useState("");
  const [formBldCount, setFormBldCount] = useState<number>(3);
  const [formFlrCount, setFormFlrCount] = useState<number>(12);
  const [formZoneCount, setFormZoneCount] = useState<number>(3);
  const [formManager, setFormManager] = useState("");
  const [formSupervisor, setFormSupervisor] = useState("");

  // Site Document Form State
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [docTypeSelector, setDocTypeSelector] = useState<any>("CAD Drawing");
  const [customFileName, setCustomFileName] = useState("");

  // --- DAILY ACTIVITY INPUT STATES ---
  const [actCompletedQty, setActCompletedQty] = useState<number>(40);
  const [actManpower, setActManpower] = useState<number>(10);
  const [actEquipment, setActEquipment] = useState<string[]>(["Pneumatic Clamps", "Laser Alignment Tool"]);
  const [actDelays, setActDelays] = useState<string>("");
  const [actComments, setActComments] = useState<string>("");
  const [uploadedPhotoName, setUploadedPhotoName] = useState<string>("");

  // --- TOMORROW PLAN AUTO GENERATOR INFLUENCERS ---
  const [tomorrowPlanDraft, setTomorrowPlanDraft] = useState<TomorrowPlan | null>(null);
  const [isTomorrowPlanEdited, setIsTomorrowPlanEdited] = useState(false);

  // Auto compile tomorrow's plan when today's activity inputs change
  useEffect(() => {
    const plannedTarget = 60; // Standard layout planned per day per zone
    const remaining = Math.max(0, plannedTarget - actCompletedQty);
    
    // Auto-calculate suggested manpower & risk warnings
    const suggestedManpower = Math.max(4, Math.ceil(remaining / 3));
    const isOvertimeNeeded = remaining > 15;
    const computedExpectedPct = Math.round(((actCompletedQty + 15) / plannedTarget) * 100);

    const generatedDraft: TomorrowPlan = {
      id: `PLAN-DRAFT-${Date.now()}`,
      dailyActivityId: "PENDING-SAVE",
      floorAndZone: `${selectedBld} - Floor ${selectedFlr} - ${selectedZone}`,
      remainingPanelsQty: remaining,
      additionalPanelsRequired: remaining > 20 ? 8 : 0,
      requiredManpower: suggestedManpower,
      requiredOvertime: isOvertimeNeeded,
      expectedCompletionPercentage: Math.min(100, computedExpectedPct),
      targetStartTime: "07:30 AM",
      targetFinishTime: isOvertimeNeeded ? "06:30 PM" : "04:30 PM",
      riskWarnings: remaining > 25 
        ? "Warning: Cumulative daily formwork lag detected. Fast cycle recovery recommended tomorrow."
        : "Low delay risk. Align target with the scheduled concrete pour window.",
      status: "Draft"
    };

    setTomorrowPlanDraft(generatedDraft);
    setIsTomorrowPlanEdited(false);
  }, [actCompletedQty, actManpower, selectedBld, selectedFlr, selectedZone]);

  // --- ROLE CHECKS ---
  const canRegisterSite = currentUserRole === UserRole.HEAD_OFFICE || currentUserRole === UserRole.SUPERVISOR;
  const canPerformDailyActivity = currentUserRole === UserRole.TEAM_LEADER || currentUserRole === UserRole.SUPERVISOR;
  const canApproveTomorrowPlan = currentUserRole === UserRole.SUPERVISOR || currentUserRole === UserRole.HEAD_OFFICE;

  // --- HANDLERS ---
  const handleRegisterSite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canRegisterSite) return;

    const generatedSiteId = `Digital Construction ERP-SITE-2026-00${sites.length + 1}`;
    
    // Initial standard documents pack for new site
    const initialDocs = [
      { id: `S-DOC-${Date.now()}-1`, name: `${formProjName.replace(/\s+/g, "_")}_FormworkMethodStatement.pdf`, type: "Method Statement" as const, uploadDate: new Date().toISOString().split("T")[0], uploadedBy: currentUserRole, fileSize: "1.4 MB" },
      { id: `S-DOC-${Date.now()}-2`, name: `${formProjName.replace(/\s+/g, "_")}_SafetyProtocol.pdf`, type: "Safety Document" as const, uploadDate: new Date().toISOString().split("T")[0], uploadedBy: currentUserRole, fileSize: "1.1 MB" }
    ];

    const newSite: RegisteredSite = {
      id: generatedSiteId,
      projectName: formProjName || "Digital Construction ERP New Site Project",
      clientName: formClient || "Internal Digital Construction ERP Development",
      contractorName: formContractor,
      region: formRegion,
      cityWoreda: formCityWoreda || "Addis Ababa Woreda 04",
      gpsLocation: deviceGps,
      googleMapsCoords: deviceMapCoords,
      startDate: formStart || new Date().toISOString().split("T")[0],
      plannedCompletionDate: formEnd || "2027-12-31",
      buildingsCount: Number(formBldCount),
      floorsCount: Number(formFlrCount),
      zonesPerFloor: Number(formZoneCount),
      siteManager: formManager || "Eng. Samuel Alene",
      supervisor: formSupervisor || "Kassa Hunegn",
      teamLeaders: ["Yohannes Bekele", "Bekele Tesfaye"],
      gangChiefs: ["Fikru Tolossa", "Yosef Assefa"],
      timeKeepers: ["Tsion Demeke"],
      status: "Active",
      documents: initialDocs
    };

    setSites(prev => [newSite, ...prev]);
    setSelectedSiteId(generatedSiteId);

    // Reset Form
    setFormProjName("");
    setFormClient("");
    setFormCityWoreda("");
    setFormStart("");
    setFormEnd("");

    if (onLogAction) {
      onLogAction("Registered New Site", `Created site record ${generatedSiteId} for ${newSite.projectName}. Cloud Storage partitions allocated.`);
    }

    triggerFirebaseSync();
  };

  // Upload Site Documents Handler
  const handleUploadDocument = (e: React.FormEvent) => {
    e.preventDefault();
    const fileName = customFileName.trim() || `Site_Doc_${Date.now()}.pdf`;

    setSites(prev => prev.map(s => {
      if (s.id === selectedSiteId) {
        return {
          ...s,
          documents: [
            ...s.documents,
            {
              id: `S-DOC-${Date.now()}`,
              name: fileName,
              type: docTypeSelector,
              uploadDate: new Date().toISOString().split("T")[0],
              uploadedBy: `${currentUserRole.replace("_", " ")}`,
              fileSize: "4.8 MB"
            }
          ]
        };
      }
      return s;
    }));

    setCustomFileName("");
    if (onLogAction) {
      onLogAction("Site Document Uploaded", `Uploaded ${fileName} of type ${docTypeSelector} to Storage`);
    }

    triggerFirebaseSync();
  };

  // Submit Daily Activity & Tomorrow Plan
  const handleSubmitDailyActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canPerformDailyActivity) return;

    const generatedActId = `ACT-UPLOAD-${Date.now()}`;
    const productivityVal = Number((actCompletedQty / actManpower).toFixed(1));

    const newActivity: DailyActivity = {
      id: generatedActId,
      siteId: selectedSiteId,
      buildingName: selectedBld,
      floorNumber: selectedFlr,
      zoneName: selectedZone,
      date: new Date().toISOString().split("T")[0],
      completedPanelsQty: Number(actCompletedQty),
      manpowerCount: Number(actManpower),
      equipmentUsed: actEquipment,
      delaysAndIssues: actDelays.trim() || "No dynamic delays occurred during formwork leveling.",
      photos: [
        "https://images.unsplash.com/photo-1590069261209-f8e9b8642343?w=800&auto=format&fit=crop&q=60"
      ],
      photographer: `${currentUserRole} - Digital Construction ERP site team`,
      productivityPerWorker: productivityVal,
      supervisorComments: actComments.trim() || "Standard daily shift inspect. Formwork checklist verified green."
    };

    setDailyActivities(prev => [newActivity, ...prev]);

    // Save corresponding Tomorrow Plan
    if (tomorrowPlanDraft) {
      const finalPlan: TomorrowPlan = {
        ...tomorrowPlanDraft,
        id: `PLAN-UPLOAD-${Date.now()}`,
        dailyActivityId: generatedActId,
        status: "Draft"
      };
      setTomorrowPlans(prev => [finalPlan, ...prev]);
    }

    // Reset layout input
    setActDelays("");
    setActComments("");
    setUploadedPhotoName("");

    if (onLogAction) {
      onLogAction("Logged Daily Activity", `Completed ${actCompletedQty} panels in ${selectedBld} Fl ${selectedFlr} ${selectedZone}. Generated tomorrow plan.`);
    }

    triggerFirebaseSync();
  };

  const handleApprovePlan = (planId: string) => {
    setTomorrowPlans(prev => prev.map(p => {
      if (p.id === planId) {
        return {
          ...p,
          status: "Approved",
          approvedBy: `${currentUserRole} Approved Signoff`
        };
      }
      return p;
    }));

    if (onLogAction) {
      onLogAction("Tomorrow Plan Approved", `Approved next day formwork sequence plan ID: ${planId}`);
    }
    triggerFirebaseSync();
  };

  return (
    <div className="space-y-6">
      
      {/* CLOUD FIRESTORE SMART TICKER */}
      <div className="bg-slate-900 border-b border-slate-800 text-white rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
        <div className="flex items-center space-x-3">
          <div className="relative flex h-3 w-3">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isSyncing ? "bg-red-500" : "bg-emerald-400"}`}></span>
            <span className={`relative inline-flex rounded-full h-3 w-3 ${isSyncing ? "bg-red-600" : "bg-emerald-500"}`}></span>
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Database size={13} className="text-red-500" />
              {isAmharic ? "Digital Construction ERP የደመና ዳታቤዝ ማመሳሰያ ሰሌዳ" : "Digital Construction ERP REAL-TIME FIRESTORE GATEWAY"}
            </p>
            <p className="text-[11px] text-slate-400 font-mono">
              {syncMsg}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-[10px] bg-slate-800 border border-slate-700 px-3 py-1 rounded-full text-slate-300 font-bold uppercase tracking-wider">
            {isAmharic ? "የአሁኑ ሚና: " : "Role: "} <span className="text-red-500 font-mono">{currentUserRole.replace("_", " ")}</span>
          </span>
          <button 
            onClick={triggerFirebaseSync}
            disabled={isSyncing}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 hover:text-white transition-all cursor-pointer"
            title="Force Firestore Replication Sync"
          >
            <RefreshCw size={13} className={isSyncing ? "animate-spin text-red-500" : ""} />
          </button>
        </div>
      </div>

      {/* CORE HORIZONTAL SUB TABS */}
      <div className="bg-white p-2 rounded-xl border border-slate-200/80 shadow-xs flex flex-wrap gap-1">
        <button
          onClick={() => setActiveSubTab("register")}
          className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 ${
            activeSubTab === "register" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Building2 size={14} className="text-red-500" />
          <span>{isAmharic ? "አዲስ ሳይት መመዝገቢያ ገፅ" : "Site Registration & Docs"}</span>
        </button>

        <button
          onClick={() => setActiveSubTab("dailyActivity")}
          className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 ${
            activeSubTab === "dailyActivity" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <ClipboardList size={14} className="text-emerald-500" />
          <span>{isAmharic ? "የዕለት ተግባርና የነገ ዕቅድ ማውጫ" : "CAD Daily Activity & Tomorrow Plan"}</span>
        </button>

        <button
          onClick={() => setActiveSubTab("report")}
          className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 ${
            activeSubTab === "report" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <TrendingUp size={14} className="text-indigo-500" />
          <span>{isAmharic ? "የዕለት ተግባራት ሪፖርት" : "Daily Work Reports"}</span>
        </button>
      </div>

      {/* SUB TAB VIEWS */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSubTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.15 }}
          className="space-y-6"
        >
          
          {/* ============================================== */}
          {/* SUB TAB 1: SITE REGISTRATION & DOCUMENTS UPLOAD */}
          {/* ============================================== */}
          {activeSubTab === "register" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Form Column */}
              <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-6">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                      🏢 {isAmharic ? "አዲስ ሳይት መመዝገቢያ ፎርም" : "Register New Construction Site"}
                    </h3>
                    <p className="text-[10px] text-slate-400">Available to Head Office & Supervisors</p>
                  </div>

                  <span className="text-[10px] bg-slate-100 px-2.5 py-1 rounded text-slate-600 font-bold uppercase">
                    {canRegisterSite ? "Authorized" : "Read-Only view"}
                  </span>
                </div>

                {canRegisterSite ? (
                  <form onSubmit={handleRegisterSite} className="space-y-5">
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Project Name *</label>
                        <input 
                          type="text" 
                          required
                          value={formProjName}
                          onChange={(e) => setFormProjName(e.target.value)}
                          placeholder="e.g. Digital Bole Heights Block C"
                          className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:border-red-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Client Name *</label>
                        <input 
                          type="text" 
                          required
                          value={formClient}
                          onChange={(e) => setFormClient(e.target.value)}
                          placeholder="e.g. Federal Housing Corporation"
                          className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:border-red-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Contractor Name</label>
                        <input 
                          type="text" 
                          value={formContractor}
                          onChange={(e) => setFormContractor(e.target.value)}
                          className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:border-red-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <div>
                        <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Region</label>
                        <input 
                          type="text" 
                          value={formRegion}
                          onChange={(e) => setFormRegion(e.target.value)}
                          className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg p-2.5 focus:border-red-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">City / Woreda *</label>
                        <input 
                          type="text" 
                          required
                          value={formCityWoreda}
                          onChange={(e) => setFormCityWoreda(e.target.value)}
                          placeholder="Bole, Woreda 03"
                          className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg p-2.5 focus:border-red-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Exact Device GPS Location</label>
                        <div className="flex space-x-1">
                          <input 
                            type="text" 
                            disabled
                            value={deviceGps}
                            className="w-full text-[11px] font-mono font-bold text-slate-700 bg-slate-100 border border-slate-200 rounded-lg p-2 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={simulateGpsCapture}
                            disabled={gpsLoading}
                            className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 shrink-0 cursor-pointer"
                            title="Auto Capturing Device GPS Coordinates"
                          >
                            <RefreshCw size={14} className={gpsLoading ? "animate-spin" : ""} />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      <div>
                        <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Start Date</label>
                        <input 
                          type="date" 
                          value={formStart}
                          onChange={(e) => setFormStart(e.target.value)}
                          className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:border-red-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Planned Completion</label>
                        <input 
                          type="date" 
                          value={formEnd}
                          onChange={(e) => setFormEnd(e.target.value)}
                          className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:border-red-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">No. Buildings</label>
                        <input 
                          type="number" 
                          min="1"
                          value={formBldCount}
                          onChange={(e) => setFormBldCount(Number(e.target.value))}
                          className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:border-red-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Floors / Bld</label>
                        <input 
                          type="number" 
                          min="1"
                          value={formFlrCount}
                          onChange={(e) => setFormFlrCount(Number(e.target.value))}
                          className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:border-red-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Zones / Floor</label>
                        <input 
                          type="number" 
                          min="1"
                          value={formZoneCount}
                          onChange={(e) => setFormZoneCount(Number(e.target.value))}
                          className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:border-red-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Site Manager Assignment</label>
                        <input 
                          type="text" 
                          value={formManager}
                          onChange={(e) => setFormManager(e.target.value)}
                          placeholder="e.g. Eng. Yoseph Hailu"
                          className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:border-red-500"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Supervisor Assignment</label>
                        <input 
                          type="text" 
                          value={formSupervisor}
                          onChange={(e) => setFormSupervisor(e.target.value)}
                          placeholder="e.g. Martha Hagos"
                          className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:border-red-500"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl py-3 text-xs font-black tracking-wider uppercase transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-sm"
                    >
                      <PlusCircle size={15} className="text-red-500 animate-pulse" />
                      <span>{isAmharic ? "አዲስ ፕሮጀክት ሳይት መዝግብ" : "Deploy Registered Site & Allocate Firestore"}</span>
                    </button>
                  </form>
                ) : (
                  <div className="bg-slate-50 p-8 rounded-xl text-center space-y-3">
                    <ShieldCheck size={32} className="text-slate-400 mx-auto" />
                    <p className="text-xs font-black text-slate-700">READ-ONLY SITE PERMISSION</p>
                    <p className="text-[11px] text-slate-400 max-w-sm mx-auto leading-relaxed">
                      Only the Head Office App and Site Supervisors can formalize new project records, GPS coordinates, and initial blueprint partitions.
                    </p>
                  </div>
                )}
              </div>

              {/* Right Documents Management Column */}
              <div className="lg:col-span-4 space-y-6">
                
                {/* Site selector dropdown first */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
                  <label className="text-[9px] text-slate-400 font-black block uppercase tracking-wider">Select Construction Site</label>
                  <select
                    value={selectedSiteId}
                    onChange={(e) => setSelectedSiteId(e.target.value)}
                    className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2 focus:border-red-500 focus:outline-none"
                  >
                    {sites.map(s => (
                      <option key={s.id} value={s.id}>{s.projectName} ({s.id})</option>
                    ))}
                  </select>
                </div>

                {/* Cloud Site Documents Upload Box */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <FileCode size={14} className="text-indigo-500" />
                      {isAmharic ? "የሳይት ሰነዶች ማህደር" : "Cloud Storage Vault"}
                    </h3>
                    <span className="text-[9px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-black font-mono">Linked</span>
                  </div>

                  {/* Documents list */}
                  <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                    {selectedSite.documents && selectedSite.documents.length > 0 ? (
                      selectedSite.documents.map(doc => (
                        <div key={doc.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/60 flex items-center justify-between text-xs hover:border-indigo-500/40 transition-colors">
                          <div className="space-y-0.5 truncate pr-2">
                            <p className="font-bold text-slate-800 truncate" title={doc.name}>{doc.name}</p>
                            <p className="text-[9px] text-slate-400 font-mono flex items-center gap-1.5">
                              <span className="bg-slate-200 px-1 rounded text-slate-600 font-bold uppercase">{doc.type}</span>
                              <span>{doc.fileSize}</span>
                            </p>
                          </div>

                          <a 
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              alert(`Simulating File Secure Download: ${doc.name}`);
                            }}
                            className="p-1 bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-950 border border-slate-200 rounded transition-colors shrink-0"
                            title="Secure Download"
                          >
                            <FileDown size={12} />
                          </a>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6 text-slate-400 text-xs">
                        No documents filed under this site. Use the form below to upload.
                      </div>
                    )}
                  </div>

                  {/* Doc Upload Form */}
                  <form onSubmit={handleUploadDocument} className="border-t border-slate-100 pt-3 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] text-slate-400 uppercase font-black">Document Type</label>
                        <select
                          value={docTypeSelector}
                          onChange={(e) => setDocTypeSelector(e.target.value)}
                          className="w-full text-[11px] font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded p-1.5 focus:outline-none"
                        >
                          <option value="CAD Drawing">CAD Drawing (DWG)</option>
                          <option value="Structural Drawing">Structural Drawing</option>
                          <option value="Formwork Drawing">Formwork Drawing</option>
                          <option value="Method Statement">Method Statement</option>
                          <option value="Safety Document">Safety Document</option>
                          <option value="Progress Photo">Progress Photo</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[9px] text-slate-400 uppercase font-black">File Name</label>
                        <input 
                          type="text"
                          required
                          value={customFileName}
                          onChange={(e) => setCustomFileName(e.target.value)}
                          placeholder="FormworkLayout_v2.dwg"
                          className="w-full text-[11px] font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded p-1.5 focus:outline-none"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-lg py-2 text-[10px] font-black uppercase transition-all flex items-center justify-center space-x-1 cursor-pointer"
                    >
                      <Upload size={11} className="text-red-500" />
                      <span>Upload to Firebase Storage</span>
                    </button>
                  </form>

                </div>

              </div>
            </div>
          )}

          {/* ============================================== */}
          {/* SUB TAB 2: CAD-ASSISTED DAILY ACTIVITY WORKBENCH */}
          {/* ============================================== */}
          {activeSubTab === "dailyActivity" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Side: Interlocking interactive CAD sheet & AI boundaries */}
              <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-5">
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
                  <div className="flex items-center space-x-2">
                    <FileCode size={16} className="text-indigo-600 animate-pulse" />
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                        {isAmharic ? "ስማርት CAD ስዕልና የዞን ወሰኖች" : "CAD Assisted Site Layout Map"}
                      </h3>
                      <p className="text-[10px] text-slate-400">Approved Blueprint with vector highlighting</p>
                    </div>
                  </div>

                  <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-bold font-mono">
                    CAD Layer Active
                  </span>
                </div>

                {/* Selection filter line inside CAD panel */}
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <label className="text-[9px] text-slate-400 uppercase font-black block mb-0.5">Building</label>
                    <select
                      value={selectedBld}
                      onChange={(e) => setSelectedBld(e.target.value)}
                      className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded p-1.5 focus:outline-none"
                    >
                      <option value="Tower Block A">Tower Block A</option>
                      <option value="Tower Block B">Tower Block B</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[9px] text-slate-400 uppercase font-black block mb-0.5">Floor</label>
                    <select
                      value={selectedFlr}
                      onChange={(e) => setSelectedFlr(Number(e.target.value))}
                      className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded p-1.5 focus:outline-none"
                    >
                      {[1, 2, 3, 4, 5, 6].map(f => (
                        <option key={f} value={f}>Floor {f}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[9px] text-slate-400 uppercase font-black block mb-0.5">Zone Sector</label>
                    <select
                      value={selectedZone}
                      onChange={(e) => setSelectedZone(e.target.value)}
                      className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded p-1.5 focus:outline-none"
                    >
                      <option value="Zone A">Zone A (Core Wing)</option>
                      <option value="Zone B">Zone B (South Deck)</option>
                      <option value="Zone C">Zone C (North Deck)</option>
                    </select>
                  </div>
                </div>

                {/* INTERACTIVE CAD BLUEPRINT GRID STAGE */}
                <div className="relative rounded-xl border-2 border-slate-200 bg-slate-950 h-[300px] overflow-hidden flex items-center justify-center">
                  
                  {/* Cyber grid blueprint overlay */}
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#111827_1px,transparent_1px),linear-gradient(to_bottom,#111827_1px,transparent_1px)] bg-[size:15px_15px] opacity-40"></div>
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#ef4444_0.4px,transparent_1px)] bg-[size:24px_24px] opacity-10"></div>
                  
                  {/* Outer CAD Blueprint Blueprint Visual Mockup */}
                  <img 
                    src="https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&auto=format&fit=crop&q=60"
                    alt="Active CAD background mockup"
                    className="w-full h-full object-cover opacity-25"
                    referrerPolicy="no-referrer"
                  />

                  {/* HIGH-CONTRAST DYNAMIC HIGHLIGHT LAYERS */}
                  <div className="absolute inset-0 p-6 flex flex-col justify-between pointer-events-none">
                    
                    {/* Top Layer Info */}
                    <div className="flex justify-between items-start">
                      <span className="bg-red-600/95 text-white font-mono text-[9px] font-black px-2 py-0.5 rounded tracking-widest uppercase">
                        ACTIVE BOUNDARY: {selectedBld} - FL0{selectedFlr} - {selectedZone}
                      </span>
                      <span className="bg-slate-900 border border-slate-800 text-slate-300 font-mono text-[9px] px-2 py-0.5 rounded">
                        SOP-CAD-LAYER-V4.2
                      </span>
                    </div>

                    {/* INTERACTIVE SHAPES IN BLUEPRINT representing Aluminum Panels layout */}
                    <div className="w-full h-[140px] relative">
                      
                      {/* Highlight Area A: Completed panels */}
                      <div className="absolute left-[10%] top-[15%] w-[45%] h-[70%] border-2 border-emerald-500 bg-emerald-500/20 rounded flex items-center justify-center animate-pulse">
                        <div className="text-center">
                          <p className="text-[10px] text-white font-black uppercase tracking-wider">Completed Area</p>
                          <p className="text-[12px] text-emerald-400 font-mono font-black">{actCompletedQty} Panels Locked</p>
                        </div>
                      </div>

                      {/* Highlight Area B: Tomorrow target / Remaining */}
                      <div className="absolute right-[10%] top-[15%] w-[30%] h-[70%] border-2 border-dashed border-yellow-500 bg-yellow-500/10 rounded flex items-center justify-center">
                        <div className="text-center">
                          <p className="text-[9px] text-white font-bold uppercase">Work Tomorrow</p>
                          <p className="text-[11px] text-yellow-400 font-mono font-bold">
                            {Math.max(0, 60 - actCompletedQty)} panels
                          </p>
                        </div>
                      </div>

                    </div>

                    {/* Bottom layout stats overlay */}
                    <div className="bg-slate-900/95 border border-slate-800 p-2.5 rounded-lg grid grid-cols-3 gap-2 text-[9px] font-mono text-slate-300 pointer-events-auto">
                      <div>
                        <span className="text-slate-500 block">CAD BOUNDARIES:</span>
                        <strong className="text-emerald-400">100% Locked</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block">PLANNED CYCLE QUANTITY:</span>
                        <strong className="text-white">60 panels</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block">REMAINING WORK:</span>
                        <strong className="text-yellow-400">{Math.max(0, 60 - actCompletedQty)} panels</strong>
                      </div>
                    </div>

                  </div>

                </div>

                {/* AI DRAWING ASSISTANT REPORT CARD */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-white space-y-3">
                  <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
                    <Sparkles size={14} className="text-red-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">
                      AI Drawing Assistance Calculations
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div className="bg-slate-900 p-2 rounded border border-slate-800">
                      <span className="text-[8px] text-slate-400 uppercase block font-bold">Planned Qty</span>
                      <span className="text-sm font-black text-white font-mono">60 Panels</span>
                    </div>

                    <div className="bg-slate-900 p-2 rounded border border-slate-800">
                      <span className="text-[8px] text-slate-400 uppercase block font-bold">Completed Today</span>
                      <span className="text-sm font-black text-emerald-400 font-mono">{actCompletedQty} Panels</span>
                    </div>

                    <div className="bg-slate-900 p-2 rounded border border-slate-800">
                      <span className="text-[8px] text-slate-400 uppercase block font-bold">Completion Pct</span>
                      <span className="text-sm font-black text-red-500 font-mono">
                        {Math.round((actCompletedQty / 60) * 100)}%
                      </span>
                    </div>

                    <div className="bg-slate-900 p-2 rounded border border-slate-800">
                      <span className="text-[8px] text-slate-400 uppercase block font-bold">Req. Manpower</span>
                      <span className="text-sm font-black text-indigo-400 font-mono">8 Workers</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Right Side Column: Daily inputs, and TOMORROW PLAN auto-generation */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* 1. Daily Site Activity Logging */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                  
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                      📝 {isAmharic ? "የዕለት ተግባራት መዝገብ" : "Submit Daily Activity"}
                    </h3>
                    <span className="text-[9px] bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-bold uppercase">
                      {canPerformDailyActivity ? "Authorized" : "Read-Only"}
                    </span>
                  </div>

                  {canPerformDailyActivity ? (
                    <form onSubmit={handleSubmitDailyActivity} className="space-y-3.5 text-xs">
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] text-slate-400 uppercase font-black block mb-0.5">Completed Panels Today</label>
                          <input 
                            type="number"
                            min="0"
                            max="60"
                            value={actCompletedQty}
                            onChange={(e) => setActCompletedQty(Number(e.target.value))}
                            className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded p-1.5 focus:outline-none focus:border-red-500"
                          />
                        </div>

                        <div>
                          <label className="text-[9px] text-slate-400 uppercase font-black block mb-0.5">Manpower Used (Workers)</label>
                          <input 
                            type="number"
                            min="1"
                            value={actManpower}
                            onChange={(e) => setActManpower(Number(e.target.value))}
                            className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded p-1.5 focus:outline-none focus:border-red-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[9px] text-slate-400 uppercase font-black block mb-0.5">Record Equipment Utilized</label>
                        <div className="flex flex-wrap gap-1.5">
                          {["Laser Levels", "Form oil Sprayers", "Hydraulic Jacks", "Hand tools"].map(eq => {
                            const active = actEquipment.includes(eq);
                            return (
                              <button
                                type="button"
                                key={eq}
                                onClick={() => {
                                  if (active) {
                                    setActEquipment(prev => prev.filter(e => e !== eq));
                                  } else {
                                    setActEquipment(prev => [...prev, eq]);
                                  }
                                }}
                                className={`px-2 py-1 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                                  active 
                                    ? "bg-slate-900 border-slate-900 text-white" 
                                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                                }`}
                              >
                                {eq}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <label className="text-[9px] text-slate-400 uppercase font-black block mb-0.5">Delays or Incidents today (if any)</label>
                        <input 
                          type="text"
                          value={actDelays}
                          onChange={(e) => setActDelays(e.target.value)}
                          placeholder="e.g. None. Layout was locked in on time"
                          className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded p-1.5 focus:outline-none focus:border-red-500"
                        />
                      </div>

                      <div>
                        <label className="text-[9px] text-slate-400 uppercase font-black block mb-0.5">Upload Panel installation Photo</label>
                        <div className="border border-dashed border-slate-200 rounded p-3 text-center cursor-pointer hover:border-emerald-500 transition-colors">
                          <input 
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                setUploadedPhotoName(e.target.files[0].name);
                              }
                            }}
                            className="hidden"
                            id="photo-upload"
                          />
                          <label htmlFor="photo-upload" className="cursor-pointer space-y-1 block">
                            <Camera size={18} className="text-slate-400 mx-auto" />
                            <span className="text-[10px] text-slate-500 block">
                              {uploadedPhotoName ? uploadedPhotoName : "Click to select today's installation photo"}
                            </span>
                          </label>
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl py-2.5 text-xs font-black uppercase transition-all flex items-center justify-center space-x-1 cursor-pointer"
                      >
                        <Send size={12} className="text-emerald-500 animate-pulse" />
                        <span>Save Today&apos;s Site Activity Logs</span>
                      </button>
                    </form>
                  ) : (
                    <div className="bg-red-50/50 p-4 rounded-xl border border-red-100 text-center text-xs text-red-800">
                      {isAmharic ? "መግለጫ፦ መረጃ ለማስገባት የአስተዳዳሪ ፍቃድ ያስፈልጋል።" : "Only Team Leaders & Supervisors can publish activity records."}
                    </div>
                  )}

                </div>

                {/* 2. Tomorrow Plan Generator (AI-Driven) */}
                {tomorrowPlanDraft && (
                  <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 text-white space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div className="flex items-center space-x-2">
                        <Sparkles size={15} className="text-yellow-400 animate-pulse" />
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-200">
                          AI Tomorrow Plan Generator
                        </h4>
                      </div>
                      <span className="text-[8px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded font-black uppercase">
                        Real-time Draft
                      </span>
                    </div>

                    <div className="space-y-3 text-xs font-mono">
                      <div className="p-2.5 bg-slate-900 rounded border border-slate-800 space-y-1">
                        <span className="text-[8px] text-slate-400 block uppercase">Continuous Target:</span>
                        <p className="text-white font-sans font-bold">{tomorrowPlanDraft.floorAndZone}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-2 bg-slate-900 rounded border border-slate-800">
                          <span className="text-[8px] text-slate-400 block uppercase">Remaining Panel Qty:</span>
                          <span className="text-xs font-bold text-yellow-400">{tomorrowPlanDraft.remainingPanelsQty} panels</span>
                        </div>

                        <div className="p-2 bg-slate-900 rounded border border-slate-800">
                          <span className="text-[8px] text-slate-400 block uppercase">Req. Manpower:</span>
                          <span className="text-xs font-bold text-white">{tomorrowPlanDraft.requiredManpower} workers</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div>
                          <span className="text-slate-400 block text-[8px]">Overtime required:</span>
                          <span className={`font-bold ${tomorrowPlanDraft.requiredOvertime ? "text-red-400" : "text-emerald-400"}`}>
                            {tomorrowPlanDraft.requiredOvertime ? "Yes (2 hours)" : "No overtime"}
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-400 block text-[8px]">Target Window:</span>
                          <span className="text-slate-200">{tomorrowPlanDraft.targetStartTime} - {tomorrowPlanDraft.targetFinishTime}</span>
                        </div>
                      </div>

                      <div className="p-2.5 bg-slate-900 rounded border border-slate-800/80 text-[10px]">
                        <span className="text-[8px] text-red-400 block uppercase">Risk & Delay Warnings:</span>
                        <p className="text-slate-300 font-sans mt-0.5">{tomorrowPlanDraft.riskWarnings}</p>
                      </div>
                    </div>

                    {canApproveTomorrowPlan ? (
                      <button
                        onClick={() => {
                          // Approve direct draft simulation
                          alert("Tomorrow's Plan successfully Approved and synchronized with Head Office Dashboard.");
                          if (onLogAction) {
                            onLogAction("Approved Tomorrow Plan", `Approved next shift plan for ${selectedBld} Fl ${selectedFlr} ${selectedZone}`);
                          }
                          triggerFirebaseSync();
                        }}
                        className="w-full bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-black text-xs py-2 rounded-xl transition-all uppercase cursor-pointer"
                      >
                        Approve & Broadcast Tomorrow&apos;s Plan
                      </button>
                    ) : (
                      <div className="bg-slate-900 p-2 text-center text-[10px] text-slate-400 rounded">
                        Requires Site Supervisor or Head Office review for tomorrow shift approval.
                      </div>
                    )}

                  </div>
                )}

              </div>
            </div>
          )}

          {/* ============================================== */}
          {/* SUB TAB 3: DAILY PORTFOLIO REPORTS */}
          {/* ============================================== */}
          {activeSubTab === "report" && (
            <div className="space-y-6">
              
              {/* Report selection bar & export */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    📊 {isAmharic ? "የሳይት ተግባራት ዘገባዎች ማከማቻ" : "Daily Site Productivity & Delay Analysis"}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-sans">Compiled automatically based on saved formwork shift checklists</p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      alert("Exporting Daily Progress Report to PDF format. Download will start instantly.");
                      if (onLogAction) onLogAction("Exported Report", "Exported Daily site progress as PDF");
                    }}
                    className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center space-x-1 cursor-pointer"
                  >
                    <FileDown size={13} className="text-red-500" />
                    <span>Export PDF</span>
                  </button>

                  <button
                    onClick={() => {
                      alert("Exporting Site Completion Portfolio to Microsoft Excel sheet.");
                      if (onLogAction) onLogAction("Exported Report", "Exported Daily site progress as Excel");
                    }}
                    className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center space-x-1 cursor-pointer"
                  >
                    <FileDown size={13} className="text-emerald-500" />
                    <span>Export Excel</span>
                  </button>
                </div>
              </div>

              {/* Data visualizations of daily output */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">Completed Panels vs Target Workload</h4>
                  
                  <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          { name: "Zone A", completed: 48, planned: 60 },
                          { name: "Zone B", completed: 35, planned: 60 },
                          { name: "Zone C", completed: 0, planned: 60 }
                        ]}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                        <YAxis stroke="#94a3b8" fontSize={11} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="completed" name="Completed Today" fill="#ef4444" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="planned" name="Planned Target" fill="#475569" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">Gang / Worker Productivity Index (Panels/Hour)</h4>
                  
                  <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={[
                          { shift: "Monday", productivity: 3.4 },
                          { shift: "Tuesday", productivity: 3.8 },
                          { shift: "Wednesday", productivity: 4.0 },
                          { shift: "Thursday", productivity: 4.2 }
                        ]}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="shift" stroke="#94a3b8" fontSize={11} />
                        <YAxis stroke="#94a3b8" fontSize={11} />
                        <Tooltip />
                        <Area type="monotone" dataKey="productivity" name="Productivity Index" stroke="#ef4444" fill="#fecaca" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>

              {/* LIST OF HISTORICAL DAILY SHIFT ACTIVITIES */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">Historical Shift Activities Log</h4>

                <div className="space-y-3">
                  {dailyActivities.map((act) => (
                    <div key={act.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                      <div className="space-y-1">
                        <span className="text-[9px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-black uppercase font-mono">
                          {act.id}
                        </span>
                        <p className="font-bold text-slate-800">{act.buildingName}</p>
                        <p className="text-slate-400 text-[10px] font-mono">Floor {act.floorNumber} | {act.zoneName}</p>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-400 font-bold block uppercase">Output Data</span>
                        <p className="font-bold font-mono text-slate-800">{act.completedPanelsQty} panels completed</p>
                        <p className="text-[10px] text-slate-500 font-mono">Manpower: {act.manpowerCount} workers</p>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-400 font-bold block uppercase">Delay / Incident Notes</span>
                        <p className="text-slate-600 italic leading-relaxed">{act.delaysAndIssues}</p>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-400 font-bold block uppercase">Supervisor Verdict</span>
                        <p className="text-slate-700 font-medium">{act.supervisorComments}</p>
                        <p className="text-[9px] text-slate-400 font-mono">By: {act.photographer}</p>
                      </div>
                    </div>
                  ))}
                </div>

              </div>

            </div>
          )}

        </motion.div>
      </AnimatePresence>

    </div>
  );
};
