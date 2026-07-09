import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  FileText, 
  Upload, 
  Image as ImageIcon, 
  Eye, 
  Sparkles, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  User, 
  Calendar, 
  Clock, 
  MapPin, 
  Layers, 
  Info, 
  FileSpreadsheet, 
  Maximize2, 
  Sliders, 
  Flame, 
  ChevronRight, 
  TrendingUp, 
  History,
  CheckCircle,
  FileDown,
  Activity,
  ShieldCheck,
  Building2,
  Trash2,
  ThumbsUp
} from "lucide-react";
import { Worker, Team, AttendanceRecord, UserRole } from "../types";

interface CadDrawingModuleProps {
  workers: Worker[];
  teams: Team[];
  attendance: AttendanceRecord[];
  isAmharic: boolean;
  currentUserRole: UserRole;
  onLogAction?: (action: string, details: string) => void;
}

// Interfaces for CAD Drawing & Site Image structures
interface CadDrawing {
  id: string;
  filename: string;
  fileType: "DWG" | "PDF" | "IFC" | "PNG" | "JPG";
  project: string;
  building: string;
  floor: number;
  zone: string;
  revision: number;
  version: string;
  uploadDate: string;
  uploadedBy: string;
  status: "Approved" | "Pending" | "Archived";
  cadPreviewUrl: string; // fallback SVG representation / mockup path
}

interface DailyImage {
  id: string;
  filename: string;
  project: string;
  building: string;
  floor: number;
  zone: string;
  workStage: "Formwork Assembly" | "Shoring & Levelling" | "Reinforcement Lock" | "Pre-pour Quality" | "Stripping Cycle";
  date: string;
  time: string;
  gps: string;
  photographer: string;
  remarks: string;
  photoUrl: string; // Mockup visual asset
}

interface AiAnalysisResult {
  drawingId: string;
  imageId: string;
  estimatedProgress: number;
  panelCoverage: number;
  missingAreas: string;
  inconsistencies: string;
  completionPercentage: number;
  delayRisk: "Low" | "Medium" | "High";
  suggestedTarget: string;
  analyzedAt: string;
  reviewedBy?: string;
  reviewStatus: "Draft" | "Reviewed" | "Engineering Approved";
}

export const CadDrawingModule: React.FC<CadDrawingModuleProps> = ({
  workers,
  teams,
  attendance,
  isAmharic,
  currentUserRole,
  onLogAction
}) => {
  // --- STATE ---
  const [selectedProject, setSelectedProject] = useState<string>("OVID Bole Heights");
  const [selectedBuilding, setSelectedBuilding] = useState<string>("Block A");
  const [selectedFloor, setSelectedFloor] = useState<number>(4);
  const [selectedZone, setSelectedZone] = useState<string>("Zone A");

  // Mock initial CAD Drawings database
  const [drawings, setDrawings] = useState<CadDrawing[]>([
    {
      id: "CAD-BH-F04-Z01",
      filename: "OVID_BH_FL04_ZONE_A_REV3.dwg",
      fileType: "DWG",
      project: "OVID Bole Heights",
      building: "Block A",
      floor: 4,
      zone: "Zone A",
      revision: 3,
      version: "v3.2",
      uploadDate: "2026-06-28",
      uploadedBy: "Senior Eng. Daniel Girma",
      status: "Approved",
      cadPreviewUrl: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&auto=format&fit=crop&q=60" // visual blueprint fallback
    },
    {
      id: "CAD-BH-F04-Z02",
      filename: "OVID_BH_FL04_ZONE_B_REV2.pdf",
      fileType: "PDF",
      project: "OVID Bole Heights",
      building: "Block A",
      floor: 4,
      zone: "Zone B",
      revision: 2,
      version: "v2.1",
      uploadDate: "2026-06-25",
      uploadedBy: "Eng. Hana Tekle",
      status: "Approved",
      cadPreviewUrl: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800&auto=format&fit=crop&q=60"
    },
    {
      id: "CAD-BH-F04-Z01-OLD",
      filename: "OVID_BH_FL04_ZONE_A_REV2.dwg",
      fileType: "DWG",
      project: "OVID Bole Heights",
      building: "Block A",
      floor: 4,
      zone: "Zone A",
      revision: 2,
      version: "v2.0",
      uploadDate: "2026-06-15",
      uploadedBy: "Eng. Daniel Girma",
      status: "Archived",
      cadPreviewUrl: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&auto=format&fit=crop&q=60"
    },
    {
      id: "CAD-AY-F02-Z01",
      filename: "OVID_AYAT_FL02_ZONE_A_REV1.ifc",
      fileType: "IFC",
      project: "OVID Ayat Project",
      building: "Block B",
      floor: 2,
      zone: "Zone A",
      revision: 1,
      version: "v1.0",
      uploadDate: "2026-07-02",
      uploadedBy: "Lead Architect Samuel Alene",
      status: "Approved",
      cadPreviewUrl: "https://images.unsplash.com/photo-1581094288338-2314dddb7ecc?w=800&auto=format&fit=crop&q=60"
    }
  ]);

  // Mock initial Daily Site Photos database
  const [dailyImages, setDailyImages] = useState<DailyImage[]>([
    {
      id: "IMG-BH-F04-ZA-01",
      filename: "IMG_20260708_1042_BH_F4_ZA.jpg",
      project: "OVID Bole Heights",
      building: "Block A",
      floor: 4,
      zone: "Zone A",
      workStage: "Formwork Assembly",
      date: "2026-07-08",
      time: "10:42 AM",
      gps: "9.0118° N, 38.7954° E",
      photographer: "TL Bekele Tesfaye",
      remarks: "Wall panels fully aligned. Slabs deck placement starting in northern sector.",
      photoUrl: "https://images.unsplash.com/photo-1590069261209-f8e9b8642343?w=800&auto=format&fit=crop&q=60" // premium construction image
    },
    {
      id: "IMG-BH-F04-ZA-02",
      filename: "IMG_20260707_1615_BH_F4_ZA.jpg",
      project: "OVID Bole Heights",
      building: "Block A",
      floor: 4,
      zone: "Zone A",
      workStage: "Shoring & Levelling",
      date: "2026-07-07",
      time: "04:15 PM",
      gps: "9.0118° N, 38.7955° E",
      photographer: "Supervisor Martha Hagos",
      remarks: "Shoring jacks configured. Level test completed for outer perimeter.",
      photoUrl: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&auto=format&fit=crop&q=60"
    },
    {
      id: "IMG-BH-F04-ZB-01",
      filename: "IMG_20260708_0910_BH_F4_ZB.jpg",
      project: "OVID Bole Heights",
      building: "Block A",
      floor: 4,
      zone: "Zone B",
      workStage: "Reinforcement Lock",
      date: "2026-07-08",
      time: "09:10 AM",
      gps: "9.0120° N, 38.7951° E",
      photographer: "GC Chala Kebede",
      remarks: "Slab reinforcement mesh integration starting. Checking formwork corners for leaks.",
      photoUrl: "https://images.unsplash.com/photo-1517646287270-a5a9ca602e5c?w=800&auto=format&fit=crop&q=60"
    }
  ]);

  // Mock initial AI Analyses database
  const [aiAnalyses, setAiAnalyses] = useState<AiAnalysisResult[]>([
    {
      drawingId: "CAD-BH-F04-Z01",
      imageId: "IMG-BH-F04-ZA-01",
      estimatedProgress: 82,
      panelCoverage: 88,
      missingAreas: "Slab deck north corner, Axis-C shear wall section (approx 3 panels missing).",
      inconsistencies: "Outer aluminum panel vertical alignment deviation detected (approx 2.4mm). Recommended correction prior to tie-rod locking.",
      completionPercentage: 82,
      delayRisk: "Low",
      suggestedTarget: "Lock Axis-C wall panels, apply form-release oil on Zone A slab decking.",
      analyzedAt: "2026-07-08 10:45 AM",
      reviewStatus: "Reviewed",
      reviewedBy: "Supervisor Martha Hagos"
    },
    {
      drawingId: "CAD-BH-F04-Z01",
      imageId: "IMG-BH-F04-ZA-02",
      estimatedProgress: 55,
      panelCoverage: 62,
      missingAreas: "Slab decking incomplete in inner elevator core zone. Shoring props require additional leveling.",
      inconsistencies: "Elevator core joint panels show minor gaps (approx 3mm).",
      completionPercentage: 55,
      delayRisk: "Medium",
      suggestedTarget: "Finish elevator core framing and execute leveling audit on all supporting jacks.",
      analyzedAt: "2026-07-07 04:22 PM",
      reviewStatus: "Engineering Approved",
      reviewedBy: "Senior Eng. Daniel Girma"
    }
  ]);

  // Upload UI interactive states
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<string>("All databases in real-time sync with cloud");

  // CAD upload form states
  const [cadFile, setCadFile] = useState<File | null>(null);
  const [cadFileType, setCadFileType] = useState<"DWG" | "PDF" | "IFC" | "PNG" | "JPG">("DWG");
  const [cadRevision, setCadRevision] = useState<number>(1);
  const [cadVersion, setCadVersion] = useState<string>("v1.0");
  const [cadFilenameInput, setCadFilenameInput] = useState<string>("");
  
  // Daily site photo form states
  const [sitePhoto, setSitePhoto] = useState<File | null>(null);
  const [photoStage, setPhotoStage] = useState<"Formwork Assembly" | "Shoring & Levelling" | "Reinforcement Lock" | "Pre-pour Quality" | "Stripping Cycle">("Formwork Assembly");
  const [photoRemarks, setPhotoRemarks] = useState<string>("");
  const [photoFilenameInput, setPhotoFilenameInput] = useState<string>("");

  // AI workspace selection
  const [activeImageIdForAi, setActiveImageIdForAi] = useState<string>("IMG-BH-F04-ZA-01");
  const [isAiRunning, setIsAiRunning] = useState<boolean>(false);

  // Gallery tabs
  const [activeGalleryTab, setActiveGalleryTab] = useState<"drawings" | "photos" | "timeline" | "comparison" | "aiResults">("drawings");

  // Report center states
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [selectedReportType, setSelectedReportType] = useState<string>("Daily Progress Report");
  const [exportAnimation, setExportAnimation] = useState<"none" | "pdf" | "excel">("none");

  // --- DERIVED / COMPUTED STATE ---
  
  // Filtered lists based on current selected sector (Project, Building, Floor, Zone)
  const currentDrawings = useMemo(() => {
    return drawings.filter(d => 
      d.project === selectedProject && 
      d.building === selectedBuilding && 
      d.floor === selectedFloor && 
      d.zone === selectedZone
    );
  }, [drawings, selectedProject, selectedBuilding, selectedFloor, selectedZone]);

  const latestApprovedDrawing = useMemo(() => {
    return currentDrawings.find(d => d.status === "Approved") || 
           drawings.find(d => d.project === selectedProject && d.status === "Approved");
  }, [currentDrawings, drawings, selectedProject]);

  const currentDailyImages = useMemo(() => {
    return dailyImages.filter(img => 
      img.project === selectedProject && 
      img.building === selectedBuilding && 
      img.floor === selectedFloor && 
      img.zone === selectedZone
    );
  }, [dailyImages, selectedProject, selectedBuilding, selectedFloor, selectedZone]);

  // Selected Daily site photo for details & AI workbench
  const selectedDailyImage = useMemo(() => {
    return dailyImages.find(img => img.id === activeImageIdForAi) || dailyImages[0];
  }, [dailyImages, activeImageIdForAi]);

  // AI results matching selected image
  const activeAiAnalysis = useMemo(() => {
    if (!selectedDailyImage) return null;
    return aiAnalyses.find(ai => ai.imageId === selectedDailyImage.id);
  }, [aiAnalyses, selectedDailyImage]);

  // --- USER PERMISSION CHECKS ---
  const canUploadDrawing = currentUserRole === UserRole.HEAD_OFFICE || currentUserRole === UserRole.SUPERVISOR;
  const canApproveDrawing = currentUserRole === UserRole.HEAD_OFFICE;
  const canUploadDailyImage = currentUserRole !== UserRole.WORKER; // Head Office, Supervisor, Team Leader, Gang Chief can upload photos
  const canReviewAi = currentUserRole === UserRole.HEAD_OFFICE || currentUserRole === UserRole.SUPERVISOR || currentUserRole === UserRole.TEAM_LEADER;
  const canGenerateReport = currentUserRole === UserRole.HEAD_OFFICE || currentUserRole === UserRole.SUPERVISOR;

  // --- FUNCTIONS ---

  // Simulate cloud synchronization on any record creation
  const triggerRealTimeSync = (type: "drawing" | "image" | "analysis") => {
    setIsSyncing(true);
    setSyncMessage(isAmharic ? "መረጃዎች በቅጽበት ወደ ደመና እየተላኩ ነው..." : "Uploading metadata & files to Cloud Storage...");
    
    setTimeout(() => {
      setIsSyncing(false);
      setSyncMessage(isAmharic 
        ? "ማመሳሰል ተጠናቋል። ሁሉም መሪዎች እና አስተዳዳሪዎች ማየት ይችላሉ።" 
        : "Real-time sync successful. All endpoints updated successfully."
      );
    }, 1500);
  };

  // Upload CAD Drawing Action
  const handleCadUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canUploadDrawing) return;

    const fname = cadFilenameInput.trim() || `CAD_${selectedProject.replace(/\s+/g, "_")}_FL0${selectedFloor}_${selectedZone.replace(/\s+/g, "_")}_REV${cadRevision}.${cadFileType.toLowerCase()}`;

    // Mark previous drawings in this sector as Archived to enforce "latest approved only"
    setDrawings(prev => {
      const archivedPrev = prev.map(d => {
        if (d.project === selectedProject && d.building === selectedBuilding && d.floor === selectedFloor && d.zone === selectedZone && d.status === "Approved") {
          return { ...d, status: "Archived" as const };
        }
        return d;
      });

      const newDrawing: CadDrawing = {
        id: `CAD-UPLOAD-${Date.now()}`,
        filename: fname,
        fileType: cadFileType,
        project: selectedProject,
        building: selectedBuilding,
        floor: selectedFloor,
        zone: selectedZone,
        revision: cadRevision,
        version: cadVersion,
        uploadDate: new Date().toISOString().split("T")[0],
        uploadedBy: currentUserRole === UserRole.HEAD_OFFICE ? "Senior Eng. Daniel Girma (HO)" : "Supervisor Martha Hagos",
        status: "Approved",
        cadPreviewUrl: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&auto=format&fit=crop&q=60"
      };

      return [newDrawing, ...archivedPrev];
    });

    if (onLogAction) {
      onLogAction("CAD Drawing Uploaded", `Uploaded ${fname} for ${selectedProject} ${selectedBuilding} Fl ${selectedFloor} ${selectedZone}`);
    }

    // Reset Form
    setCadFilenameInput("");
    setCadFile(null);
    triggerRealTimeSync("drawing");
  };

  // Upload Daily Work Photo Action
  const handleDailyImageUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canUploadDailyImage) return;

    const fname = photoFilenameInput.trim() || `IMG_${Date.now()}_${selectedZone.replace(/\s+/g, "_")}.jpg`;
    
    // Simple high quality placeholders depending on stage
    const mockupUrls = [
      "https://images.unsplash.com/photo-1590069261209-f8e9b8642343?w=800&auto=format&fit=crop&q=60",
      "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&auto=format&fit=crop&q=60",
      "https://images.unsplash.com/photo-1517646287270-a5a9ca602e5c?w=800&auto=format&fit=crop&q=60"
    ];
    const chosenUrl = mockupUrls[Math.floor(Math.random() * mockupUrls.length)];

    const newImg: DailyImage = {
      id: `IMG-UPLOAD-${Date.now()}`,
      filename: fname,
      project: selectedProject,
      building: selectedBuilding,
      floor: selectedFloor,
      zone: selectedZone,
      workStage: photoStage,
      date: new Date().toISOString().split("T")[0],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      gps: "9.0118° N, 38.7954° E",
      photographer: `${currentUserRole.replace("_", " ")} - mejennur669@gmail.com`,
      remarks: photoRemarks.trim() || "Regular formwork verification photograph. General layout alignment looks steady.",
      photoUrl: chosenUrl
    };

    setDailyImages(prev => [newImg, ...prev]);
    setActiveImageIdForAi(newImg.id);

    if (onLogAction) {
      onLogAction("Daily Site Photo Uploaded", `Uploaded image ${fname} for stage ${photoStage} at ${selectedZone}`);
    }

    // Reset Form
    setPhotoRemarks("");
    setPhotoFilenameInput("");
    setSitePhoto(null);
    triggerRealTimeSync("image");
  };

  // Run AI Drawing Comparison Simulation
  const handleRunAiAnalysis = () => {
    if (!selectedDailyImage) return;
    setIsAiRunning(true);

    setTimeout(() => {
      setIsAiRunning(false);

      // Generate a dynamic realistic analysis
      const coverageVal = Math.floor(Math.random() * 25) + 70; // 70 to 95
      const progressVal = Math.floor(coverageVal * 0.95);
      const randomRisk = progressVal > 85 ? "Low" : progressVal > 75 ? "Medium" : "High";

      const newAnalysis: AiAnalysisResult = {
        drawingId: latestApprovedDrawing?.id || "CAD-BH-F04-Z01",
        imageId: selectedDailyImage.id,
        estimatedProgress: progressVal,
        panelCoverage: coverageVal,
        missingAreas: progressVal > 90 
          ? "No significant missing areas detected. Minor gap at top right edge." 
          : "Slab deck outer profile north-west corner (approx 4-5 structural panels). Minor gap on perimeter walls.",
        inconsistencies: progressVal > 85
          ? "Aluminum formwork within spec (+/- 2mm). No critical alignment issues found."
          : "Diagonal shore strut support shows 4 degrees slope. Suggest alignment verification before locking shear-pins.",
        completionPercentage: progressVal,
        delayRisk: randomRisk as "Low" | "Medium" | "High",
        suggestedTarget: progressVal > 90
          ? "Final panel safety check, apply form oil, prepare concrete-pouring bucket line."
          : "Execute shoring leveling adjustment, finalize North-West corner deck coverage, lock perimeter.",
        analyzedAt: new Date().toISOString().replace("T", " ").substring(0, 16),
        reviewStatus: "Draft"
      };

      setAiAnalyses(prev => {
        // Remove old drafts for the same image
        const filtered = prev.filter(ai => ai.imageId !== selectedDailyImage.id);
        return [newAnalysis, ...filtered];
      });

      if (onLogAction) {
        onLogAction("AI Drawing Comparison Executed", `Ran AI comparison on image ${selectedDailyImage.filename}`);
      }

      triggerRealTimeSync("analysis");
    }, 2000);
  };

  // Approve AI report reviews
  const handleApproveAiReview = (imageId: string) => {
    setAiAnalyses(prev => prev.map(ai => {
      if (ai.imageId === imageId) {
        return {
          ...ai,
          reviewStatus: currentUserRole === UserRole.HEAD_OFFICE ? "Engineering Approved" : "Reviewed",
          reviewedBy: `${currentUserRole.replace("_", " ")} (${currentUserRole === UserRole.HEAD_OFFICE ? "Daniel Girma" : "Martha Hagos"})`
        };
      }
      return ai;
    }));

    if (onLogAction) {
      onLogAction("AI Report Approved", `Approved AI progress review for image ID: ${imageId}`);
    }
  };

  // Export report simulated download
  const triggerReportExport = (format: "pdf" | "excel") => {
    setExportAnimation(format);
    
    setTimeout(() => {
      setExportAnimation("none");
      
      // Simulate physical download
      const element = document.createElement("a");
      const file = new Blob([`OVID AL-FORMWORK SYSTEM REPORT: ${selectedReportType}\nExport Date: 2026-07-08\nProject: ${selectedProject}\nStatus: Synchronized\nThis is a mock report file export compiled by the AI Studio platform.`], {type: 'text/plain'});
      element.href = URL.createObjectURL(file);
      element.download = `${selectedReportType.replace(/\s+/g, "_")}_Export.${format === "pdf" ? "pdf" : "xlsx"}`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);

      if (onLogAction) {
        onLogAction("Report Exported", `Exported ${selectedReportType} as ${format.toUpperCase()}`);
      }
    }, 1200);
  };

  return (
    <div className="space-y-6">
      
      {/* REAL-TIME CLOUD SYNC HEADER TICKER */}
      <div className="bg-slate-900 border-b border-slate-800 text-white rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
        <div className="flex items-center space-x-3">
          <div className="relative flex h-3 w-3">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isSyncing ? "bg-red-500" : "bg-emerald-400"}`}></span>
            <span className={`relative inline-flex rounded-full h-3 w-3 ${isSyncing ? "bg-red-600" : "bg-emerald-500"}`}></span>
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-slate-300">
              {isAmharic ? "የደመና ግንኙነትና ማመሳሰያ ሰሌዳ" : "CAD/IMAGE REAL-TIME CLOUD GATEWAY"}
            </p>
            <p className="text-[11px] text-slate-400 font-mono">
              {syncMessage}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-[10px] bg-slate-800 border border-slate-700 px-3 py-1 rounded-full text-slate-300 font-bold uppercase tracking-wider">
            {isAmharic ? "የአሁኑ ሚና: " : "Role: "} <span className="text-red-500">{currentUserRole.replace("_", " ")}</span>
          </span>
          <button 
            onClick={() => {
              triggerRealTimeSync("drawing");
            }}
            disabled={isSyncing}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 hover:text-white transition-all cursor-pointer"
            title="Force Manual Cloud Sync Refresh"
          >
            <RefreshCw size={13} className={isSyncing ? "animate-spin text-red-500" : ""} />
          </button>
        </div>
      </div>

      {/* COMPACT PROJECT SECTOR SELECTOR BAR */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block mb-1">
            {isAmharic ? "ፕሮጀክት" : "Project"}
          </label>
          <select 
            value={selectedProject} 
            onChange={(e) => setSelectedProject(e.target.value)}
            className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:border-red-500 focus:outline-none"
          >
            <option value="OVID Bole Heights">OVID Bole Heights</option>
            <option value="OVID Ayat Project">OVID Ayat Project</option>
          </select>
        </div>

        <div>
          <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block mb-1">
            {isAmharic ? "ህንጻ ብሎክ" : "Building Block"}
          </label>
          <select 
            value={selectedBuilding} 
            onChange={(e) => setSelectedBuilding(e.target.value)}
            className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:border-red-500 focus:outline-none"
          >
            <option value="Block A">Block A (Tower 1)</option>
            <option value="Block B">Block B (Tower 2)</option>
            <option value="Block C">Block C (Elevator Core)</option>
          </select>
        </div>

        <div>
          <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block mb-1">
            {isAmharic ? "ፎቅ ደረጃ" : "Floor Level"}
          </label>
          <select 
            value={selectedFloor} 
            onChange={(e) => setSelectedFloor(parseInt(e.target.value))}
            className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:border-red-500 focus:outline-none"
          >
            {[1, 2, 3, 4, 5].map(f => (
              <option key={f} value={f}>Floor {f}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block mb-1">
            {isAmharic ? "ንቁ ዞን" : "Active Zone Sector"}
          </label>
          <select 
            value={selectedZone} 
            onChange={(e) => setSelectedZone(e.target.value)}
            className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:border-red-500 focus:outline-none"
          >
            <option value="Zone A">Zone A (Core Slab)</option>
            <option value="Zone B">Zone B (South Outer)</option>
            <option value="Zone C">Zone C (North Deck)</option>
          </select>
        </div>
      </div>

      {/* CORE TWO-COLUMN ACTION WORKBENCH */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: uploaders (restricted by permissions) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* 1. CAD DRAWING UPLOADER */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <FileText size={16} className="text-red-600" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  {isAmharic ? "1. የCAD ስዕል መጫኛ" : "1. CAD Drawing Vault"}
                </h3>
              </div>
              <span className="text-[9px] bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-bold uppercase">
                {canUploadDrawing ? "Authorized" : "Read-Only"}
              </span>
            </div>

            {canUploadDrawing ? (
              <form onSubmit={handleCadUpload} className="space-y-3.5">
                <div className="border-2 border-dashed border-slate-200 hover:border-red-500/50 rounded-xl p-4 text-center cursor-pointer transition-colors relative">
                  <input 
                    type="file" 
                    accept=".dwg,.pdf,.ifc,.png,.jpg"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setCadFile(e.target.files[0]);
                        setCadFilenameInput(e.target.files[0].name);
                        // Auto detect type
                        const ext = e.target.files[0].name.split('.').pop()?.toUpperCase();
                        if (["DWG", "PDF", "IFC", "PNG", "JPG"].includes(ext || "")) {
                          setCadFileType(ext as any);
                        }
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <Upload size={24} className="text-slate-400 mx-auto mb-2" />
                  <span className="text-xs font-bold text-slate-700 block">
                    {cadFile ? cadFile.name : (isAmharic ? "DWG, PDF, IFC ወይም ምስል ይምረጡ" : "Drop CAD File or Click")}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-1">Supports AutoCAD DWG, PDF, IFC</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase block mb-0.5">Format</label>
                    <select
                      value={cadFileType}
                      onChange={(e) => setCadFileType(e.target.value as any)}
                      className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2 focus:border-red-500"
                    >
                      <option value="DWG">DWG (AutoCAD)</option>
                      <option value="PDF">PDF Sheet</option>
                      <option value="IFC">IFC Building</option>
                      <option value="PNG">PNG Image</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase block mb-0.5">Revision No</label>
                    <input
                      type="number"
                      min="1"
                      value={cadRevision}
                      onChange={(e) => setCadRevision(parseInt(e.target.value))}
                      className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2 focus:border-red-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase block mb-0.5">Drawing Version Tag</label>
                  <input
                    type="text"
                    value={cadVersion}
                    onChange={(e) => setCadVersion(e.target.value)}
                    placeholder="e.g. v3.2-A"
                    className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2 focus:border-red-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-slate-900 hover:bg-slate-850 text-white rounded-xl py-2.5 text-xs font-black transition-all shadow-sm hover:shadow-md cursor-pointer flex items-center justify-center space-x-1.5"
                >
                  <FileText size={14} className="text-red-500" />
                  <span>{isAmharic ? "አዲስ የCAD ስዕል መዝግብ" : "Publish Approved CAD Sheet"}</span>
                </button>
              </form>
            ) : (
              <div className="bg-slate-50 p-4 rounded-xl text-center space-y-2">
                <ShieldCheck size={22} className="text-slate-400 mx-auto" />
                <p className="text-xs font-bold text-slate-600">
                  {isAmharic ? "ማስጠንቀቂያ፦ ስዕል ለመጫን የአስተዳዳሪ ፍቃድ ያስፈልጋል።" : "Viewing Drawings under Read-Only Permission"}
                </p>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Only Head Office and Site Supervisors can upload and replace formal CAD sheets.
                </p>
              </div>
            )}
          </div>

          {/* 2. DAILY PANEL IMAGE UPLOADER */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <ImageIcon size={16} className="text-emerald-600" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  {isAmharic ? "2. የዕለት የፓነል ምስል መጫኛ" : "2. Daily Site Photo Deck"}
                </h3>
              </div>
              <span className="text-[9px] bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-bold uppercase">
                {canUploadDailyImage ? "Authorized" : "Forbidden"}
              </span>
            </div>

            {canUploadDailyImage ? (
              <form onSubmit={handleDailyImageUpload} className="space-y-3.5">
                <div className="border-2 border-dashed border-slate-200 hover:border-emerald-500/50 rounded-xl p-4 text-center cursor-pointer transition-colors relative">
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setSitePhoto(e.target.files[0]);
                        setPhotoFilenameInput(e.target.files[0].name);
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <ImageIcon size={24} className="text-slate-400 mx-auto mb-2" />
                  <span className="text-xs font-bold text-slate-700 block">
                    {sitePhoto ? sitePhoto.name : (isAmharic ? "የፓነል መጫን ፎቶ ይምረጡ" : "Select Daily Site Photo")}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-1">Allows uploading multiple images per zone</span>
                </div>

                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase block mb-0.5">Work Cycle Stage</label>
                  <select
                    value={photoStage}
                    onChange={(e) => setPhotoStage(e.target.value as any)}
                    className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="Formwork Assembly">Formwork Assembly</option>
                    <option value="Shoring & Levelling">Shoring & Levelling</option>
                    <option value="Reinforcement Lock">Reinforcement Lock</option>
                    <option value="Pre-pour Quality">Pre-pour Quality (Formwork Lock)</option>
                    <option value="Stripping Cycle">Stripping Cycle</option>
                  </select>
                </div>

                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase block mb-0.5">Remarks & Notes</label>
                  <textarea
                    value={photoRemarks}
                    onChange={(e) => setPhotoRemarks(e.target.value)}
                    placeholder="Enter visual discrepancies or panel count remarks..."
                    rows={2}
                    className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                  <span className="flex items-center space-x-1">
                    <MapPin size={11} className="text-red-500" />
                    <span>GPS Auto-Locked</span>
                  </span>
                  <span>9.0118° N, 38.7954° E</span>
                </div>

                <button
                  type="submit"
                  className="w-full bg-slate-900 hover:bg-slate-850 text-white rounded-xl py-2.5 text-xs font-black transition-all shadow-sm hover:shadow-md cursor-pointer flex items-center justify-center space-x-1.5"
                >
                  <ImageIcon size={14} className="text-emerald-500" />
                  <span>{isAmharic ? "የዕለት ፎቶ ወደ ደመና ስቅል" : "Upload Site Progress Photo"}</span>
                </button>
              </form>
            ) : (
              <div className="bg-red-50/50 p-4 rounded-xl border border-red-100 text-center text-xs text-red-800">
                {isAmharic ? "መግለጫ፦ ፎቶዎችን ለመጫን የተመዘገበ ሚና መሆን ያስፈልጋል።" : "Workers are not authorized to upload site photos."}
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: AI comparison workspace, Project Gallery, and Reports */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* AI DRAWING COMPARISON WORKBENCH */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
              <div className="flex items-center space-x-2">
                <Sparkles size={18} className="text-red-600 animate-pulse" />
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    {isAmharic ? "አርቴፊሻል ኢንተለጀንስ የንጽጽር ሞዱል" : "AI Drawing vs. Site Photo Inspection Workbench"}
                  </h3>
                  <p className="text-[10px] text-slate-400">Decision-Support System: Always review outputs prior to concrete pour authorization</p>
                </div>
              </div>

              {selectedDailyImage && (
                <button
                  onClick={handleRunAiAnalysis}
                  disabled={isAiRunning}
                  className="bg-red-600 hover:bg-red-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-black shadow-sm transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles size={13} className={isAiRunning ? "animate-spin" : ""} />
                  <span>{isAiRunning ? "Running AI..." : (isAmharic ? "የቪዥዋል AI ትንተና አሂድ" : "Compute AI Visual Alignment")}</span>
                </button>
              )}
            </div>

            {/* SIDE BY SIDE RENDERING OF APPROVED DRAWING VS SITE PHOTO */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Approved CAD Drawing Box */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase">
                  <span>🗺️ {isAmharic ? "የጸደቀው የCAD ስዕል" : "Approved CAD Template Reference"}</span>
                  <span className="text-red-500 font-mono">Latest Approved</span>
                </div>

                {latestApprovedDrawing ? (
                  <div className="relative rounded-xl border border-slate-200 overflow-hidden bg-slate-950 aspect-video flex items-center justify-center">
                    <img 
                      src={latestApprovedDrawing.cadPreviewUrl} 
                      alt="CAD preview" 
                      className="w-full h-full object-cover opacity-60"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:16px_16px] opacity-25"></div>
                    
                    <div className="absolute bottom-2 left-2 right-2 bg-slate-900/95 border border-slate-700 p-2 rounded-lg text-[9px] text-white space-y-0.5">
                      <p className="font-bold truncate">{latestApprovedDrawing.filename}</p>
                      <p className="text-slate-400 font-mono">Rev {latestApprovedDrawing.revision} | Uploaded by: {latestApprovedDrawing.uploadedBy}</p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border-2 border-dashed border-slate-200 p-8 text-center text-xs text-slate-400 aspect-video flex flex-col items-center justify-center">
                    <FileText size={28} className="text-slate-300 mb-1" />
                    <span>No CAD drawings approved for this floor zone sector.</span>
                  </div>
                )}
              </div>

              {/* Site Daily Photo Box */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase">
                  <span>📸 {isAmharic ? "የዕለት የሳይት ፎቶ" : "Uploaded Site Progress Photo"}</span>
                  <span className="text-emerald-500 font-mono">Captured Daily</span>
                </div>

                {selectedDailyImage ? (
                  <div className="relative rounded-xl border border-slate-200 overflow-hidden bg-slate-100 aspect-video">
                    <img 
                      src={selectedDailyImage.photoUrl} 
                      alt="Site photo" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    
                    <div className="absolute bottom-2 left-2 right-2 bg-slate-900/95 border border-slate-700 p-2 rounded-lg text-[9px] text-white space-y-0.5">
                      <div className="flex justify-between items-center">
                        <p className="font-bold truncate">{selectedDailyImage.filename}</p>
                        <span className="bg-emerald-600 px-1.5 py-0.5 rounded text-[8px] font-black">{selectedDailyImage.workStage}</span>
                      </div>
                      <p className="text-slate-400 font-mono">{selectedDailyImage.date} {selectedDailyImage.time} | Photog: {selectedDailyImage.photographer}</p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border-2 border-dashed border-slate-200 p-8 text-center text-xs text-slate-400 aspect-video flex flex-col items-center justify-center">
                    <ImageIcon size={28} className="text-slate-300 mb-1" />
                    <span>No site progress photographs uploaded for this floor zone sector.</span>
                  </div>
                )}
              </div>

            </div>

            {/* AI DECISION SUPPORT REPORT WINDOW */}
            <AnimatePresence mode="wait">
              {isAiRunning ? (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-slate-950 p-6 rounded-xl border border-slate-800 text-center space-y-4"
                >
                  <RefreshCw className="text-red-500 animate-spin mx-auto" size={32} />
                  <div className="space-y-1.5">
                    <p className="text-sm font-bold text-white font-mono">COMPUTING VISUAL ALIGNMENT MATRICES</p>
                    <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                      AI is compiling CAD coordinate overrides, checking aluminum panel lockpins, and calculating volumetric panel coverage relative to the target engineering template...
                    </p>
                  </div>
                </motion.div>
              ) : activeAiAnalysis ? (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-slate-950 p-5 rounded-xl border border-slate-800 text-white space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 gap-2">
                    <div className="flex items-center space-x-2">
                      <Sparkles size={16} className="text-red-500" />
                      <span className="text-xs font-black uppercase tracking-wider text-slate-200">
                        {isAmharic ? "አርቴፊሻል ኢንተለጀንስ የትንተና ውጤት" : "AI Inspection Recommendations"}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1.5 text-[10px] text-slate-400">
                      <span>Status:</span>
                      <span className={`px-2 py-0.5 rounded font-bold ${
                        activeAiAnalysis.reviewStatus === "Engineering Approved" ? "bg-emerald-500/20 text-emerald-400" :
                        activeAiAnalysis.reviewStatus === "Reviewed" ? "bg-indigo-500/20 text-indigo-400" :
                        "bg-amber-500/20 text-amber-400"
                      }`}>
                        {activeAiAnalysis.reviewStatus}
                      </span>

                      {activeAiAnalysis.reviewStatus === "Draft" && canReviewAi && (
                        <button
                          onClick={() => handleApproveAiReview(activeAiAnalysis.imageId)}
                          className="bg-red-600 hover:bg-red-700 text-white px-2 py-0.5 rounded text-[9px] font-black ml-1.5 cursor-pointer transition-colors"
                        >
                          Approve Review
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 text-center space-y-0.5">
                      <span className="text-[9px] text-slate-400 block uppercase font-bold">Estimated Progress</span>
                      <span className="text-2xl font-black text-red-500 font-mono">{activeAiAnalysis.estimatedProgress}%</span>
                    </div>

                    <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 text-center space-y-0.5">
                      <span className="text-[9px] text-slate-400 block uppercase font-bold">Panel Coverage</span>
                      <span className="text-2xl font-black text-indigo-400 font-mono">{activeAiAnalysis.panelCoverage}%</span>
                    </div>

                    <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 text-center space-y-0.5">
                      <span className="text-[9px] text-slate-400 block uppercase font-bold">Delay Risk Index</span>
                      <span className={`text-xl font-black font-sans uppercase block ${
                        activeAiAnalysis.delayRisk === "High" ? "text-red-500" :
                        activeAiAnalysis.delayRisk === "Medium" ? "text-amber-500" : "text-emerald-500"
                      }`}>{activeAiAnalysis.delayRisk}</span>
                    </div>

                    <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 text-center space-y-0.5">
                      <span className="text-[9px] text-slate-400 block uppercase font-bold">Generated Timestamp</span>
                      <span className="text-[10px] font-mono text-white block truncate">{activeAiAnalysis.analyzedAt}</span>
                    </div>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800/80">
                      <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wide">🔍 MISSING PANEL AREAS:</span>
                      <p className="text-slate-300 font-mono mt-0.5">{activeAiAnalysis.missingAreas}</p>
                    </div>

                    <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800/80">
                      <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wide">⚠️ DETECTED INCONSISTENCIES:</span>
                      <p className="text-slate-300 font-mono mt-0.5">{activeAiAnalysis.inconsistencies}</p>
                    </div>

                    <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800/80">
                      <span className="text-[9px] text-red-400 font-bold block uppercase tracking-wide">🎯 SUGGESTED NEXT-DAY TARGET:</span>
                      <p className="text-slate-200 mt-0.5 font-bold">{activeAiAnalysis.suggestedTarget}</p>
                    </div>
                  </div>

                  {activeAiAnalysis.reviewedBy && (
                    <div className="text-[10px] text-slate-400 flex items-center justify-between border-t border-slate-800/50 pt-2.5">
                      <span>Reviewed By: <strong className="text-white">{activeAiAnalysis.reviewedBy}</strong></span>
                      <span>Decision-Support recommendation only. General contractor holds legal safety signoff.</span>
                    </div>
                  )}
                </motion.div>
              ) : (
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 text-center space-y-1.5">
                  <Sparkles className="text-slate-400 mx-auto" size={24} />
                  <p className="text-xs font-bold text-slate-700">Ready for AI Drawing Alignment Comparison</p>
                  <p className="text-[10px] text-slate-400 max-w-sm mx-auto">
                    Select a Daily Site Photo on the right and click &quot;Compute AI Visual Alignment&quot; to inspect current aluminum panel cover ratios.
                  </p>
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* PROJECT GALLERY WITH TABS */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
              <div className="flex items-center space-x-2">
                <History size={16} className="text-indigo-600" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  {isAmharic ? "የፕሮጀክት ጋለሪ እና የለውጥ መዝገብ" : "Project Gallery & Revision Workspace"}
                </h3>
              </div>

              {/* TABS */}
              <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl">
                {[
                  { id: "drawings", label: isAmharic ? "ስዕሎች" : "CADs" },
                  { id: "photos", label: isAmharic ? "ፎቶዎች" : "Daily Photos" },
                  { id: "timeline", label: isAmharic ? "የጊዜ ሰሌዳ" : "Timeline" },
                  { id: "comparison", label: "Side-by-Side" }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveGalleryTab(tab.id as any)}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-lg cursor-pointer transition-all ${
                      activeGalleryTab === tab.id 
                        ? "bg-slate-900 text-white shadow-xs" 
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* TAB CONTENT: DRAWINGS */}
            {activeGalleryTab === "drawings" && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {currentDrawings.map((draw) => (
                    <div 
                      key={draw.id} 
                      className={`p-3.5 rounded-xl border transition-all relative overflow-hidden ${
                        draw.status === "Approved" ? "bg-emerald-50/40 border-emerald-200" : "bg-slate-50 border-slate-200 text-slate-500"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                          draw.status === "Approved" ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"
                        }`}>
                          {draw.status}
                        </span>
                        <span className="font-mono text-[9px] text-slate-400">REV {draw.revision}</span>
                      </div>

                      <div className="mt-2 space-y-1">
                        <p className="font-bold text-xs text-slate-800 truncate" title={draw.filename}>
                          {draw.filename}
                        </p>
                        <p className="text-[10px] font-mono text-slate-500">
                          Format: <strong className="text-slate-700">{draw.fileType}</strong> | Version: <strong className="text-slate-700">{draw.version}</strong>
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          Uploaded: {draw.uploadDate} by {draw.uploadedBy}
                        </p>
                      </div>

                      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5">
                        <span className="text-[10px] text-slate-400 italic">OVID Aluminum Slab System</span>
                        <a 
                          href={draw.cadPreviewUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-[10px] text-red-600 hover:text-red-700 font-bold flex items-center space-x-1"
                        >
                          <Eye size={12} />
                          <span>View Sheet</span>
                        </a>
                      </div>
                    </div>
                  ))}
                  {currentDrawings.length === 0 && (
                    <div className="col-span-2 text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 italic text-xs">
                      No CAD drawing revisions uploaded for sector {selectedZone} on Floor {selectedFloor}.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT: DAILY PHOTOS */}
            {activeGalleryTab === "photos" && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {currentDailyImages.map((img) => (
                    <div 
                      key={img.id} 
                      onClick={() => setActiveImageIdForAi(img.id)}
                      className={`p-2.5 rounded-xl border cursor-pointer transition-all hover:border-red-500/50 ${
                        activeImageIdForAi === img.id ? "bg-red-50/20 border-red-300 shadow-sm" : "bg-slate-50/50 border-slate-200"
                      }`}
                    >
                      <div className="relative rounded-lg overflow-hidden aspect-video mb-2">
                        <img 
                          src={img.photoUrl} 
                          alt={img.filename} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <span className="absolute top-1.5 left-1.5 bg-slate-900/95 text-white text-[8px] font-black px-1.5 py-0.5 rounded">
                          {img.workStage}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                          <span>{img.date} {img.time}</span>
                          <span className="text-indigo-600 font-bold">Select for AI</span>
                        </div>
                        <p className="text-[11px] font-bold text-slate-800 truncate">{img.filename}</p>
                        <p className="text-[10px] text-slate-500 line-clamp-2 leading-tight">
                          {img.remarks}
                        </p>
                      </div>
                    </div>
                  ))}
                  {currentDailyImages.length === 0 && (
                    <div className="col-span-3 text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 italic text-xs">
                      No daily site progress photos uploaded for sector {selectedZone} on Floor {selectedFloor}.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT: ZONE TIMELINE PROGRESS */}
            {activeGalleryTab === "timeline" && (
              <div className="space-y-4">
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Interactive track record of aluminum formwork installation cycles. Staggered timeline details verified by the visual AI inspector:
                </p>

                <div className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                  {aiAnalyses.map((ai, index) => {
                    const matchedImg = dailyImages.find(img => img.id === ai.imageId);
                    if (!matchedImg) return null;

                    return (
                      <div key={index} className="flex items-start space-x-3.5 relative pl-2">
                        <div className="w-6 h-6 rounded-full bg-red-500 border-4 border-white shadow-xs shrink-0 flex items-center justify-center relative z-10 text-[9px] font-bold text-white font-mono">
                          {aiAnalyses.length - index}
                        </div>

                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 w-full grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="space-y-0.5">
                            <span className="text-[9px] text-slate-400 font-mono block">{ai.analyzedAt}</span>
                            <span className="font-bold text-xs text-slate-800">{matchedImg.workStage}</span>
                            <span className="text-[10px] text-slate-500 block truncate font-mono">{matchedImg.filename}</span>
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] text-slate-500">
                              <span>Estimated Progress:</span>
                              <strong className="text-red-600 font-mono">{ai.estimatedProgress}%</strong>
                            </div>
                            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-red-500 h-full rounded-full" style={{ width: `${ai.estimatedProgress}%` }}></div>
                            </div>
                          </div>

                          <div className="text-xs text-slate-600 italic">
                            &quot;{ai.suggestedTarget}&quot;
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB CONTENT: SIDE-BY-SIDE DRAGGABLE/SLIDER COMPARISON */}
            {activeGalleryTab === "comparison" && (
              <div className="space-y-3 text-center">
                <p className="text-[11px] text-slate-400">
                  Side-by-side diagnostic visualization panel of CAD master-mesh vs. reality camera frame. Align your coordinate viewport to evaluate shoring props.
                </p>

                <div className="grid grid-cols-2 gap-4 bg-slate-900 p-4 rounded-xl border border-slate-800">
                  <div className="space-y-2">
                    <span className="text-[10px] text-slate-400 font-mono block">BLUEPRINT TEMPLATE LAYOUT</span>
                    <div className="rounded-lg overflow-hidden border border-slate-700 relative aspect-video">
                      {latestApprovedDrawing ? (
                        <img 
                          src={latestApprovedDrawing.cadPreviewUrl} 
                          alt="CAD layer" 
                          className="w-full h-full object-cover grayscale opacity-50"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="bg-slate-800 h-full flex items-center justify-center text-slate-500 text-xs">No Approved CAD</div>
                      )}
                      <div className="absolute inset-0 bg-red-500/10 pointer-events-none mix-blend-overlay"></div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] text-slate-400 font-mono block">LIVE CAMERA FRAME OVERLAY</span>
                    <div className="rounded-lg overflow-hidden border border-slate-700 relative aspect-video">
                      {selectedDailyImage ? (
                        <img 
                          src={selectedDailyImage.photoUrl} 
                          alt="Photo layer" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="bg-slate-800 h-full flex items-center justify-center text-slate-500 text-xs">No Site Photo</div>
                      )}
                      <div className="absolute inset-0 bg-indigo-500/15 pointer-events-none mix-blend-overlay animate-pulse"></div>
                    </div>
                  </div>
                </div>

                <div className="text-center">
                  <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-[10px] font-bold">
                    Overlay mismatch ratio: <strong className="text-red-500">12% offset detected on Axis-D wall segment</strong>
                  </span>
                </div>
              </div>
            )}

          </div>

          {/* REPORT GENERATION CENTER */}
          <div className="bg-slate-950 text-white p-5 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden">
            <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none">
              <FileSpreadsheet size={150} className="text-white" />
            </div>

            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-1">
                <span className="text-red-500 text-[9px] font-black uppercase tracking-wider block">
                  📈 COMPLIANCE & PROGRESS REPORT VAULT
                </span>
                <h3 className="text-base font-black tracking-tight text-white font-sans flex items-center space-x-1.5">
                  <span>{isAmharic ? "አውቶማቲክ የሪፖርት ማመንጫ እና ማውረጃ" : "Automated Reports & Export Vault"}</span>
                </h3>
                <p className="text-[11px] text-slate-300 max-w-xl">
                  Generate instant executive quality files, daily physical logs, and AI progress forecasts instantly synced with the cloud and downloadable to Excel/PDF.
                </p>
              </div>

              <button
                onClick={() => setIsReportModalOpen(true)}
                className="bg-white hover:bg-slate-100 text-slate-900 font-black px-4 py-2.5 rounded-xl text-xs flex items-center space-x-1.5 transition-all shrink-0 cursor-pointer shadow-sm"
              >
                <FileText size={14} className="text-red-600" />
                <span>{isAmharic ? "ሪፖርት አውርድ" : "Launch Report Center"}</span>
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* DETAILED EXPORT REPORT DIALOG MODAL */}
      <AnimatePresence>
        {isReportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="bg-slate-950 text-white p-5 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FileSpreadsheet className="text-red-500" size={20} />
                  <div>
                    <h3 className="font-black text-sm tracking-tight uppercase">Executive Report Generator</h3>
                    <p className="text-[10px] text-slate-400">OVID Aluminum Formwork Systems - Real-Time Compilation</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsReportModalOpen(false)}
                  className="text-slate-400 hover:text-white font-bold text-xs p-1 rounded-lg hover:bg-slate-900"
                >
                  ✕
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-5 flex-1">
                
                {/* Select report template */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Select Report Template</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      "Daily Progress Report",
                      "Zone Completion Report",
                      "Drawing Revision History",
                      "Photo Inspection Report",
                      "AI Progress Analysis Report",
                      "Project Completion Forecast"
                    ].map((rep) => (
                      <button
                        key={rep}
                        onClick={() => setSelectedReportType(rep)}
                        className={`text-left p-3 rounded-xl border text-xs font-bold transition-all flex items-start space-x-2.5 cursor-pointer ${
                          selectedReportType === rep 
                            ? "bg-red-50/50 border-red-500 text-slate-800" 
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <FileText size={15} className={selectedReportType === rep ? "text-red-600 mt-0.5" : "text-slate-400 mt-0.5"} />
                        <div>
                          <span className="block leading-tight">{rep}</span>
                          <span className="text-[9px] text-slate-400 font-normal">Ready for PDF/Excel</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preview Table of Data */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Tabular Data Preview</label>
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 overflow-x-auto max-h-48">
                    <table className="w-full text-[10px] font-mono text-slate-600">
                      <thead>
                        <tr className="border-b border-slate-200 text-left text-slate-400">
                          <th className="pb-1.5 pr-2">Sector ID</th>
                          <th className="pb-1.5 pr-2">Date</th>
                          <th className="pb-1.5 pr-2">Stage</th>
                          <th className="pb-1.5 pr-2">Progress</th>
                          <th className="pb-1.5">Risk Factor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr>
                          <td className="py-1.5 pr-2 font-bold text-slate-800">Zone A - Fl 4</td>
                          <td className="py-1.5 pr-2">2026-07-08</td>
                          <td className="py-1.5 pr-2">Formwork Assembly</td>
                          <td className="py-1.5 pr-2 text-red-600 font-bold">82%</td>
                          <td className="py-1.5 text-emerald-600 font-bold">LOW</td>
                        </tr>
                        <tr>
                          <td className="py-1.5 pr-2 font-bold text-slate-800">Zone B - Fl 4</td>
                          <td className="py-1.5 pr-2">2026-07-08</td>
                          <td className="py-1.5 pr-2">Reinforcement Lock</td>
                          <td className="py-1.5 pr-2 text-red-600 font-bold">40%</td>
                          <td className="py-1.5 text-amber-600 font-bold">MEDIUM</td>
                        </tr>
                        <tr>
                          <td className="py-1.5 pr-2 font-bold text-slate-800">Zone C - Fl 4</td>
                          <td className="py-1.5 pr-2">2026-07-07</td>
                          <td className="py-1.5 pr-2">Shoring Set</td>
                          <td className="py-1.5 pr-2 text-red-600 font-bold">12%</td>
                          <td className="py-1.5 text-red-600 font-bold">HIGH</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Cloud security disclaimer */}
                <div className="bg-red-50 p-3 rounded-xl border border-red-100 text-[10px] text-red-800/90 leading-relaxed flex items-start space-x-1.5">
                  <Info size={14} className="text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <strong>Secure Cloud Backups Enabled:</strong>
                    <p>
                      All exported logs and Excel files are backed up automatically to the secure OVID Group enterprise bucket using real-time SSL checksum locks.
                    </p>
                  </div>
                </div>

              </div>

              {/* Modal Footer with Actions */}
              <div className="bg-slate-50 border-t border-slate-100 p-5 flex items-center justify-between">
                <span className="text-[10px] text-slate-400">mejennur669@gmail.com</span>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => triggerReportExport("pdf")}
                    disabled={exportAnimation !== "none"}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-black px-3.5 py-2 rounded-xl text-xs flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {exportAnimation === "pdf" ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" />
                        <span>Compiling PDF...</span>
                      </>
                    ) : (
                      <>
                        <FileDown size={13} className="text-red-500" />
                        <span>Download PDF</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => triggerReportExport("excel")}
                    disabled={exportAnimation !== "none"}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-3.5 py-2 rounded-xl text-xs flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {exportAnimation === "excel" ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" />
                        <span>Compiling XLS...</span>
                      </>
                    ) : (
                      <>
                        <FileSpreadsheet size={13} />
                        <span>Export Excel</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
