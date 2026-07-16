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
  Layers, 
  Info, 
  FileSpreadsheet, 
  Sliders, 
  History,
  CheckCircle,
  FileDown,
  Activity,
  ShieldCheck,
  Building2,
  Trash2,
  ThumbsUp,
  FileCheck,
  Check,
  HelpCircle
} from "lucide-react";
import { Worker, Team, AttendanceRecord, UserRole } from "../types";
import { CadViewer } from "./CadViewer";
import { CadComparisonSlider } from "./CadComparisonSlider";

interface CadDrawingModuleProps {
  workers: Worker[];
  teams: Team[];
  attendance: AttendanceRecord[];
  isAmharic: boolean;
  currentUserRole: UserRole;
  onLogAction?: (action: string, details: string) => void;
}

interface CadDrawing {
  id: string;
  filename: string;
  fileType: "DWG" | "DXF" | "PDF" | "PNG" | "JPG";
  project: string;
  building: string;
  floor: number;
  zone: string;
  revision: number;
  version: string;
  uploadDate: string;
  uploadedBy: string;
  status: "Draft" | "Reviewed" | "Approved" | "Archived";
  fileSize: string;
  remarks: string;
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
  photoUrl: string;
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
  // --- SELECTION STATES ---
  const [selectedProject, setSelectedProject] = useState<string>("OVID Bole Heights");
  const [selectedBuilding, setSelectedBuilding] = useState<string>("Block A");
  const [selectedFloor, setSelectedFloor] = useState<number>(4);
  const [selectedZone, setSelectedZone] = useState<string>("Zone A");

  // --- DATABASE STATES ---
  const [drawings, setDrawings] = useState<CadDrawing[]>([
    {
      id: "CAD-BH-F04-Z01-V3",
      filename: "OVID_BH_FL04_ZONE_A_STRUCTURAL.dwg",
      fileType: "DWG",
      project: "OVID Bole Heights",
      building: "Block A",
      floor: 4,
      zone: "Zone A",
      revision: 3,
      version: "v3.0",
      uploadDate: "2026-07-14",
      uploadedBy: "Site Eng. Sintayehu Alula",
      status: "Draft", // New revision uploaded by Site Engineer (Pending Supervisor review)
      fileSize: "8.4 MB",
      remarks: "Slab expansion profiles and corner tolerances updated as per Head Office instruction."
    },
    {
      id: "CAD-BH-F04-Z01-V2",
      filename: "OVID_BH_FL04_ZONE_A_STRUCTURAL.dwg",
      fileType: "DWG",
      project: "OVID Bole Heights",
      building: "Block A",
      floor: 4,
      zone: "Zone A",
      revision: 2,
      version: "v2.0",
      uploadDate: "2026-06-28",
      uploadedBy: "Site Eng. Sintayehu Alula",
      status: "Approved", // Currently active approved template
      fileSize: "8.2 MB",
      remarks: "Approved model for aluminum slab shoring grids."
    },
    {
      id: "CAD-BH-F04-Z01-V1",
      filename: "OVID_BH_FL04_ZONE_A_STRUCTURAL.dwg",
      fileType: "DWG",
      project: "OVID Bole Heights",
      building: "Block A",
      floor: 4,
      zone: "Zone A",
      revision: 1,
      version: "v1.0",
      uploadDate: "2026-06-12",
      uploadedBy: "Site Eng. Sintayehu Alula",
      status: "Archived",
      fileSize: "7.9 MB",
      remarks: "Initial core plan drawing."
    },
    {
      id: "CAD-BH-F04-Z02-V2",
      filename: "OVID_BH_FL04_ZONE_B_BEAMS.pdf",
      fileType: "PDF",
      project: "OVID Bole Heights",
      building: "Block A",
      floor: 4,
      zone: "Zone B",
      revision: 2,
      version: "v2.0",
      uploadDate: "2026-07-13",
      uploadedBy: "Site Eng. Sintayehu Alula",
      status: "Reviewed", // Reviewed by Supervisor, ready for Head Office approval
      fileSize: "4.5 MB",
      remarks: "Beam panel arrangement reviewed and recommended by Supervisor Martha Hagos."
    },
    {
      id: "CAD-AY-F02-Z01-V1",
      filename: "OVID_AYAT_FL02_ZONE_A_SLAB.dxf",
      fileType: "DXF",
      project: "OVID Ayat Project",
      building: "Block B",
      floor: 2,
      zone: "Zone A",
      revision: 1,
      version: "v1.0",
      uploadDate: "2026-07-02",
      uploadedBy: "Site Eng. Sintayehu Alula",
      status: "Approved",
      fileSize: "12.4 MB",
      remarks: "Initial slab formwork plan approved."
    }
  ]);

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
      photoUrl: "https://images.unsplash.com/photo-1590069261209-f8e9b8642343?w=800&auto=format&fit=crop&q=60"
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
    }
  ]);

  const [aiAnalyses, setAiAnalyses] = useState<AiAnalysisResult[]>([
    {
      drawingId: "CAD-BH-F04-Z01-V2",
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
    }
  ]);

  // --- TAB NAVIGATION STATE ---
  const [activeTab, setActiveTab] = useState<"viewer" | "comparison" | "workflow" | "photos" | "autoPlan">("viewer");

  // --- SELECTED WORKSPACE DRAWING ---
  const [activeDrawingId, setActiveDrawingId] = useState<string>("CAD-BH-F04-Z01-V2");

  // --- WORKFLOW FORM STATES ---
  const [supervisorNotes, setSupervisorNotes] = useState<string>("");
  const [headOfficePin, setHeadOfficePin] = useState<string>("");
  const [headOfficePinError, setHeadOfficePinError] = useState<string | null>(null);

  // --- CAD FILE UPLOAD FORM STATES ---
  const [cadFile, setCadFile] = useState<File | null>(null);
  const [cadFileType, setCadFileType] = useState<"DWG" | "DXF" | "PDF" | "PNG" | "JPG">("DWG");
  const [cadFilenameInput, setCadFilenameInput] = useState<string>("");
  const [cadRemarksInput, setCadRemarksInput] = useState<string>("");
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // --- DAILY PHOTO UPLOAD FORM STATES ---
  const [sitePhoto, setSitePhoto] = useState<File | null>(null);
  const [photoStage, setPhotoStage] = useState<"Formwork Assembly" | "Shoring & Levelling" | "Reinforcement Lock" | "Pre-pour Quality" | "Stripping Cycle">("Formwork Assembly");
  const [photoRemarks, setPhotoRemarks] = useState<string>("");
  const [isPhotoUploading, setIsPhotoUploading] = useState<boolean>(false);

  // --- COMPARISON MODE STATES ---
  const [comparisonMode, setComparisonMode] = useState<"drawing_v_drawing" | "cad_v_photo">("drawing_v_drawing");
  const [comparisonRevA, setComparisonRevA] = useState<string>("CAD-BH-F04-Z01-V1");
  const [comparisonRevB, setComparisonRevB] = useState<string>("CAD-BH-F04-Z01-V2");

  // --- REPORT MODAL STATES ---
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [selectedReportType, setSelectedReportType] = useState<string>("Daily Progress Report");
  const [exportAnimation, setExportAnimation] = useState<"none" | "pdf" | "excel">("none");

  // --- AI INTEGRATION STATES ---
  const [isAiRunning, setIsAiRunning] = useState<boolean>(false);
  const [activeImageIdForAi, setActiveImageIdForAi] = useState<string>("IMG-BH-F04-ZA-01");
  const [cadAnalysisResult, setCadAnalysisResult] = useState<any | null>(null);
  const [isAnalyzingCad, setIsAnalyzingCad] = useState<boolean>(false);
  const [cadAnalysisError, setCadAnalysisError] = useState<string | null>(null);
  const [cadPlanningStep, setCadPlanningStep] = useState<number>(0);

  const cadPlanningStepsEng = [
    "Reading CAD Vector Groups...",
    "Identifying Shear Walls & Slab Area...",
    "Generating 6-Day Formwork Cycles...",
    "Compiling Material BOM & Crew Lists...",
    "Finalizing Work Plan & Daily Reviews..."
  ];

  const cadPlanningStepsAmh = [
    "የCAD ቬክተር ምስሎችን ማንበብ...",
    "የግድግዳና የፎቅ ስፋቶችን መለየት...",
    "የ6 ቀን ፎርምወርክ ዑደት እቅድ ማውጣት...",
    "የሚያስፈልጉ ቁሶችንና የሰራተኞች ቡድንን መምረጥ...",
    "የስራ እቅድ እና ዕለታዊ ግምገማዎችን ማጠናቀቅ..."
  ];

  // --- SYNC STATUS INDICATOR ---
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<string>("System online. Cloud synchronizer active.");

  const triggerRealTimeSync = (type: string) => {
    setIsSyncing(true);
    setSyncMessage(isAmharic ? "መረጃዎች በቅጽበት ወደ ደመና እየተላኩ ነው..." : "Syncing details with OVID Enterprise Database...");
    setTimeout(() => {
      setIsSyncing(false);
      setSyncMessage(isAmharic ? "ሁሉም መረጃዎች ከደመናው ጋር ተመሳስለዋል።" : "Real-time sync successful. Cloud storage active.");
    }, 1200);
  };

  // --- DERIVED / MEMOIZED STATE ---
  const filteredDrawings = useMemo(() => {
    return drawings.filter(d => 
      d.project === selectedProject && 
      d.building === selectedBuilding && 
      d.floor === selectedFloor && 
      d.zone === selectedZone
    );
  }, [drawings, selectedProject, selectedBuilding, selectedFloor, selectedZone]);

  const activeDrawing = useMemo(() => {
    return drawings.find(d => d.id === activeDrawingId) || filteredDrawings[0] || drawings[0];
  }, [drawings, activeDrawingId, filteredDrawings]);

  const latestApprovedDrawing = useMemo(() => {
    return filteredDrawings.find(d => d.status === "Approved") || 
           drawings.find(d => d.project === selectedProject && d.status === "Approved");
  }, [filteredDrawings, drawings, selectedProject]);

  const filteredDailyImages = useMemo(() => {
    return dailyImages.filter(img => 
      img.project === selectedProject && 
      img.building === selectedBuilding && 
      img.floor === selectedFloor && 
      img.zone === selectedZone
    );
  }, [dailyImages, selectedProject, selectedBuilding, selectedFloor, selectedZone]);

  const selectedDailyImage = useMemo(() => {
    return dailyImages.find(img => img.id === activeImageIdForAi) || dailyImages[0];
  }, [dailyImages, activeImageIdForAi]);

  const activeAiAnalysis = useMemo(() => {
    if (!selectedDailyImage) return null;
    return aiAnalyses.find(ai => ai.imageId === selectedDailyImage.id);
  }, [aiAnalyses, selectedDailyImage]);

  // --- ROLE PERMISSIONS ---
  const canUploadDrawing = currentUserRole === UserRole.SITE_ENGINEER || currentUserRole === UserRole.PROJECT_MANAGER || currentUserRole === UserRole.HEAD_OFFICE;
  const canReviewDrawing = currentUserRole === UserRole.SUPERVISOR || currentUserRole === UserRole.PROJECT_MANAGER || currentUserRole === UserRole.HEAD_OFFICE;
  const canApproveDrawing = currentUserRole === UserRole.HEAD_OFFICE;

  // --- AUTO RE-ROUTE DRAWING AFTER FILTERS CHANGE ---
  useEffect(() => {
    if (filteredDrawings.length > 0) {
      // Prefer approved drawing
      const approved = filteredDrawings.find(d => d.status === "Approved");
      if (approved) {
        setActiveDrawingId(approved.id);
      } else {
        setActiveDrawingId(filteredDrawings[0].id);
      }
    }
  }, [selectedProject, selectedBuilding, selectedFloor, selectedZone, drawings]);

  // --- FUNCTION HANDLERS ---

  // 1. Site Engineer CAD Upload
  const handleCadUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canUploadDrawing) return;

    setIsUploading(true);
    
    setTimeout(() => {
      const nextRev = filteredDrawings.length > 0 
        ? Math.max(...filteredDrawings.map(d => d.revision)) + 1 
        : 1;
        
      const newFname = cadFilenameInput.trim() || `OVID_FL0${selectedFloor}_${selectedZone.replace(/\s+/g, "_")}_STRUCTURAL_REV${nextRev}.${cadFileType.toLowerCase()}`;
      
      const newDrawing: CadDrawing = {
        id: `CAD-UPLOAD-${Date.now()}`,
        filename: newFname,
        fileType: cadFileType,
        project: selectedProject,
        building: selectedBuilding,
        floor: selectedFloor,
        zone: selectedZone,
        revision: nextRev,
        version: `v${nextRev}.0`,
        uploadDate: new Date().toISOString().split("T")[0],
        uploadedBy: currentUserRole === UserRole.SITE_ENGINEER ? "Site Eng. Sintayehu Alula" : "Lead PM Eng. Dawit",
        status: "Draft", // Default initial status is Draft as requested
        fileSize: "6.2 MB",
        remarks: cadRemarksInput.trim() || "Uploaded floor plan revision for structural review."
      };

      setDrawings(prev => [newDrawing, ...prev]);
      setActiveDrawingId(newDrawing.id);
      setIsUploading(false);
      setCadFilenameInput("");
      setCadRemarksInput("");
      
      if (onLogAction) {
        onLogAction("CAD Upload", `Uploaded revision ${nextRev} of ${newFname} as Draft`);
      }
      
      triggerRealTimeSync("drawing");
      setActiveTab("viewer");
    }, 1000);
  };

  // 2. Supervisor CAD Review
  const handleSupervisorReviewSubmit = (drawingId: string, action: "recommend" | "reject") => {
    if (!canReviewDrawing) return;

    setDrawings(prev => prev.map(d => {
      if (d.id === drawingId) {
        return {
          ...d,
          status: action === "recommend" ? "Reviewed" : "Draft",
          remarks: `${d.remarks} | Supervisor Notes: ${supervisorNotes.trim() || "Approved panel tolerances and dimension check recommended."}`
        };
      }
      return d;
    }));

    setSupervisorNotes("");
    
    if (onLogAction) {
      onLogAction("CAD Review", `Supervisor submitted review for ${drawingId}: ${action}`);
    }

    triggerRealTimeSync("review");
  };

  // 3. Head Office Final Approval & Publish
  const handleHeadOfficeApproval = (drawingId: string) => {
    if (!canApproveDrawing) return;

    // Security Check
    if (headOfficePin !== "8899") {
      setHeadOfficePinError(isAmharic ? "የተሳሳተ የደህንነት ኮድ! እባክዎ እንደገና ይሞክሩ።" : "Invalid security pin! Access Denied.");
      return;
    }

    setHeadOfficePinError(null);
    setHeadOfficePin("");

    // Find the drawing to approve
    const drawingToApprove = drawings.find(d => d.id === drawingId);
    if (!drawingToApprove) return;

    // Archive all previous APPROVED drawings in this exact Project/Floor/Zone
    setDrawings(prev => prev.map(d => {
      if (
        d.project === drawingToApprove.project &&
        d.building === drawingToApprove.building &&
        d.floor === drawingToApprove.floor &&
        d.zone === drawingToApprove.zone
      ) {
        if (d.id === drawingId) {
          return { ...d, status: "Approved" as const };
        } else if (d.status === "Approved") {
          return { ...d, status: "Archived" as const };
        }
      }
      return d;
    }));

    if (onLogAction) {
      onLogAction("CAD Approval", `Head Office Admin Nuriye approved ${drawingToApprove.filename} as published template.`);
    }

    triggerRealTimeSync("approval");
  };

  // 4. Daily Progress Photo Upload
  const handleDailyImageUpload = (e: React.FormEvent) => {
    e.preventDefault();
    setIsPhotoUploading(true);

    setTimeout(() => {
      const mockPhotos = [
        "https://images.unsplash.com/photo-1590069261209-f8e9b8642343?w=800&auto=format&fit=crop&q=60",
        "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&auto=format&fit=crop&q=60",
        "https://images.unsplash.com/photo-1517646287270-a5a9ca602e5c?w=800&auto=format&fit=crop&q=60"
      ];
      const randomUrl = mockPhotos[Math.floor(Math.random() * mockPhotos.length)];

      const newImg: DailyImage = {
        id: `IMG-UPLOAD-${Date.now()}`,
        filename: `IMG_${Date.now()}_F0${selectedFloor}_${selectedZone}.jpg`,
        project: selectedProject,
        building: selectedBuilding,
        floor: selectedFloor,
        zone: selectedZone,
        workStage: photoStage,
        date: new Date().toISOString().split("T")[0],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        gps: "9.0118° N, 38.7954° E",
        photographer: currentUserRole.replace("_", " "),
        remarks: photoRemarks.trim() || "Formwork cycle captured by on-site crew. Structural grid match is high.",
        photoUrl: randomUrl
      };

      setDailyImages(prev => [newImg, ...prev]);
      setActiveImageIdForAi(newImg.id);
      setIsPhotoUploading(false);
      setPhotoRemarks("");
      
      if (onLogAction) {
        onLogAction("Daily Image Upload", `Site progress image captured for stage: ${photoStage}`);
      }

      triggerRealTimeSync("image");
      setActiveTab("viewer");
    }, 1000);
  };

  // 5. Run AI Drawing Alignment Inspection (CAD vs Progress Photo)
  const handleRunAiAnalysis = () => {
    if (!selectedDailyImage) return;
    setIsAiRunning(true);

    setTimeout(() => {
      const matchScore = Math.floor(Math.random() * 15) + 80; // 80% to 95%
      const panelCoverage = Math.floor(Math.random() * 10) + 85;

      const newAnalysis: AiAnalysisResult = {
        drawingId: activeDrawingId,
        imageId: selectedDailyImage.id,
        estimatedProgress: matchScore,
        panelCoverage: panelCoverage,
        missingAreas: "Axis-D perimeter beam connection (approx 2 panels show unlatched safety lockpins).",
        inconsistencies: "Minor vertical column tilt deviation (approx 1.8mm plumbness offset on Axis C).",
        completionPercentage: matchScore,
        delayRisk: matchScore > 88 ? "Low" : "Medium",
        suggestedTarget: "Lock Axis-D horizontal deck latch keys and inspect vertical plumb alignment on Column C-2.",
        analyzedAt: `${new Date().toISOString().split("T")[0]} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        reviewStatus: "Draft"
      };

      setAiAnalyses(prev => [newAnalysis, ...prev]);
      setIsAiRunning(false);

      if (onLogAction) {
        onLogAction("AI Alignment Computed", `Visual compliance score of ${matchScore}% detected for image ${selectedDailyImage.filename}`);
      }
    }, 2000);
  };

  // 6. Run AI Auto Plan & Scheduler (using backend API)
  const runCadAutomaticPlanning = async (filename: string) => {
    setIsAnalyzingCad(true);
    setCadAnalysisError(null);
    setCadPlanningStep(0);
    
    const timer = setInterval(() => {
      setCadPlanningStep(prev => (prev < 4 ? prev + 1 : prev));
    }, 1000);

    try {
      const response = await fetch("/api/ai/analyze-cad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: filename,
          project: selectedProject,
          block: selectedBuilding,
          floor: selectedFloor,
          zone: selectedZone
        })
      });

      const resJson = await response.json();
      clearInterval(timer);

      if (resJson.success) {
        setCadAnalysisResult(resJson.data);
        setActiveTab("autoPlan");
        if (onLogAction) {
          onLogAction("CAD Auto-Planner", `Generated scheduling cycles and materials Bill of Materials (BOM) for ${filename}`);
        }
      } else {
        setCadAnalysisError(resJson.error || "CAD inspection compile failed");
      }
    } catch (err: any) {
      clearInterval(timer);
      setCadAnalysisError(err?.message || "Failed to connect to the cloud service.");
    } finally {
      setIsAnalyzingCad(false);
    }
  };

  // 7. Executive Report Center PDF/Excel Compilation
  const triggerReportExport = (format: "pdf" | "excel") => {
    setExportAnimation(format);
    setTimeout(() => {
      setExportAnimation("none");
      setIsReportModalOpen(false);
      alert(isAmharic 
        ? `ሪፖርቱ በ${format === "pdf" ? "PDF" : "Excel"} ፎርማት በተሳካ ሁኔታ ተዘጋጅቷል!` 
        : `${selectedReportType} compiled successfully into ${format.toUpperCase()} format!`
      );
    }, 1800);
  };

  return (
    <div className="space-y-5 p-1 sm:p-4 max-w-7xl mx-auto" id="cad_module_workspace">
      
      {/* HEADER SECTION WITH FILTERS */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Building2 className="text-red-600" size={20} />
              <h2 className="text-lg font-black tracking-tight text-slate-800 uppercase">
                {isAmharic ? "OVID የካድ ስዕሎች እና የለውጥ መቆጣጠሪያ" : "CAD & Revision Workspace"}
              </h2>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              {isAmharic 
                ? "የአልሙኒየም ፎርምወርክ ስራዎችን በካድ ስዕሎች መሰረት መከታተያ፣ ማነጻጸሪያ እና ማጽደቂያ ሞጁል።" 
                : "Manage technical blueprint drawing drafts, approval lifecycles, versions, and reality alignment audits."}
            </p>
          </div>

          {/* Sync & Report Status indicator */}
          <div className="flex items-center space-x-2.5">
            <span className={`px-2.5 py-1 rounded-full text-[9px] font-mono font-bold flex items-center space-x-1.5 border ${
              isSyncing 
                ? "bg-indigo-50 text-indigo-700 border-indigo-200 animate-pulse" 
                : "bg-slate-50 text-slate-600 border-slate-200"
            }`}>
              <RefreshCw size={9} className={isSyncing ? "animate-spin text-indigo-600" : ""} />
              <span>{syncMessage}</span>
            </span>

            <button
              onClick={() => setIsReportModalOpen(true)}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black flex items-center space-x-1 cursor-pointer transition-colors"
            >
              <FileSpreadsheet size={13} className="text-red-500" />
              <span>{isAmharic ? "ሪፖርቶች" : "Reports"}</span>
            </button>
          </div>
        </div>

        {/* METADATA DROPDOWNS FILTERS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200/60">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Project</label>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg text-xs p-1.5 font-bold focus:ring-0 cursor-pointer"
            >
              <option value="OVID Bole Heights">OVID Bole Heights</option>
              <option value="OVID Ayat Project">OVID Ayat Project</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Tower/Block</label>
            <select
              value={selectedBuilding}
              onChange={(e) => setSelectedBuilding(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg text-xs p-1.5 font-bold focus:ring-0 cursor-pointer"
            >
              <option value="Block A">Tower Block A</option>
              <option value="Block B">Tower Block B</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Floor</label>
            <select
              value={selectedFloor}
              onChange={(e) => setSelectedFloor(Number(e.target.value))}
              className="w-full bg-white border border-slate-200 rounded-lg text-xs p-1.5 font-bold focus:ring-0 cursor-pointer"
            >
              <option value={2}>Floor Level 2</option>
              <option value={4}>Floor Level 4</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Sector Zone</label>
            <select
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg text-xs p-1.5 font-bold focus:ring-0 cursor-pointer"
            >
              <option value="Zone A">Zone Sector A</option>
              <option value="Zone B">Zone Sector B</option>
            </select>
          </div>
        </div>

        {/* ACTIVE ROLE BANNER */}
        <div className="bg-amber-50/50 border border-amber-200 p-2.5 rounded-xl flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="text-amber-600 shrink-0" size={16} />
            <span className="text-slate-700 font-medium">
              {isAmharic 
                ? `ገባሪ የደህንነት ሚና፡ ` 
                : `Active ERP Role: `}
              <strong className="text-amber-800 uppercase font-mono font-black">{currentUserRole.replace("_", " ")}</strong>
            </span>
          </div>
          <span className="text-[10px] text-amber-700/80 font-mono italic">
            {currentUserRole === UserRole.SITE_ENGINEER && (isAmharic ? "መብትዎ፡ የካድ ስዕሎችን እዚህ ማስገባት ይችላሉ።" : "Authorized: Upload new CAD drafts.")}
            {currentUserRole === UserRole.SUPERVISOR && (isAmharic ? "መብትዎ፡ ስዕሎችን መገምገም እና አስተያየት መጻፍ ይችላሉ።" : "Authorized: Review engineering drafts.")}
            {currentUserRole === UserRole.HEAD_OFFICE && (isAmharic ? "መብትዎ፡ የመጨረሻ ፍቃድ መስጠት እና ማጽደቅ ይችላሉ።" : "Authorized: Full blueprint sign-off & release.")}
          </span>
        </div>
      </div>

      {/* CORE WORKSPACE SPLIT LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* LEFT COLUMN: INTERACTIVE VISUAL CANVAS & WORKSPACE (7 COLS) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* TAB SWITCHER */}
          <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-2xl w-fit">
            {[
              { id: "viewer", label: isAmharic ? "የካድ ተመልካች" : "Interactive CAD" },
              { id: "comparison", label: isAmharic ? "ስዕሎች ማነጻጸሪያ" : "Revision Slider" },
              { id: "photos", label: isAmharic ? "የሳይት ፎቶዎች" : "Field Progress Photos" },
              { id: "autoPlan", label: isAmharic ? "አውቶማቲክ እቅድ (AI)" : "Auto Work Plan" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 text-xs font-black rounded-xl cursor-pointer transition-all ${
                  activeTab === tab.id 
                    ? "bg-slate-900 text-white shadow-sm" 
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* TAB WORKSPACE MODULE */}
          <div className="min-h-[420px] transition-all">
            {activeTab === "viewer" && (
              <div className="h-full space-y-3">
                <div className="h-[380px]">
                  <CadViewer
                    filename={activeDrawing.filename}
                    fileType={activeDrawing.fileType}
                    isAmharic={isAmharic}
                    onLogAction={onLogAction}
                  />
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>{isAmharic ? "የተመረጠው ስዕል ዝርዝር" : "Selected Blueprint Details:"}</span>
                    <span className="font-mono">{activeDrawing.fileSize} | Rev {activeDrawing.revision}</span>
                  </div>
                  <h4 className="font-black text-xs text-slate-800">{activeDrawing.filename}</h4>
                  <p className="text-[11px] text-slate-500 italic">"{activeDrawing.remarks}"</p>
                </div>
              </div>
            )}

            {activeTab === "comparison" && (
              <CadComparisonSlider
                isAmharic={isAmharic}
                revAFilename="OVID_BH_FL04_ZONE_A_STRUCTURAL_REV1.dwg"
                revBFilename="OVID_BH_FL04_ZONE_A_STRUCTURAL_REV2.dwg"
                revADate="2026-06-12"
                revBDate="2026-06-28"
                revAUploader="Site Eng. Sintayehu Alula"
                revBUploader="Site Eng. Sintayehu Alula"
                mode={comparisonMode}
                photoUrl={selectedDailyImage?.photoUrl}
              />
            )}

            {activeTab === "photos" && (
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
                  <ImageIcon size={18} className="text-red-600" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    {isAmharic ? "የሳይት እድገት ፎቶዎች ጋለሪ" : "Site Daily Progress Photographs"}
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredDailyImages.map((img) => (
                    <div 
                      key={img.id} 
                      onClick={() => {
                        setActiveImageIdForAi(img.id);
                        setActiveTab("viewer");
                      }}
                      className={`p-2.5 rounded-xl border cursor-pointer transition-all hover:border-red-500/50 ${
                        activeImageIdForAi === img.id ? "bg-red-50/20 border-red-300 shadow-sm" : "bg-slate-50 border-slate-200"
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

                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                          <span>{img.date} {img.time}</span>
                          <span className="text-red-600 font-bold">Select in Viewer</span>
                        </div>
                        <p className="font-bold text-slate-800 truncate">{img.filename}</p>
                        <p className="text-[10px] text-slate-500 line-clamp-2 leading-tight">
                          {img.remarks}
                        </p>
                      </div>
                    </div>
                  ))}
                  {filteredDailyImages.length === 0 && (
                    <div className="col-span-2 text-center py-10 text-slate-400 italic text-xs">
                      No progressive photographs uploaded for Floor {selectedFloor} Zone {selectedZone} yet.
                    </div>
                  )}
                </div>

                {/* Captured photo upload block */}
                {currentUserRole !== UserRole.WORKER && (
                  <form onSubmit={handleDailyImageUpload} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3.5">
                    <span className="text-[10px] font-black text-slate-400 uppercase block tracking-wider">📸 Upload Daily Construction Reality photo</span>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-500 uppercase block">Construction Work Stage</label>
                        <select
                          value={photoStage}
                          onChange={(e: any) => setPhotoStage(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg text-xs p-2 font-bold cursor-pointer focus:ring-0"
                        >
                          <option value="Formwork Assembly">Formwork Assembly (ፎርምወርክ መግጠም)</option>
                          <option value="Shoring & Levelling">Shoring & Levelling (ድጋፎች ማስተካከል)</option>
                          <option value="Reinforcement Lock">Reinforcement Lock (የአርማታ ብረቶች መቆለፍ)</option>
                          <option value="Pre-pour Quality">Pre-pour Quality (ከኮንክሪት በፊት ፍተሻ)</option>
                          <option value="Stripping Cycle">Stripping Cycle (ፎርምወርክ ማውለቅ)</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-500 uppercase block">Short Remarks</label>
                        <input
                          type="text"
                          value={photoRemarks}
                          onChange={(e) => setPhotoRemarks(e.target.value)}
                          placeholder="e.g., Plumb lines verified. Slab deck layout 100% complete."
                          className="w-full bg-white border border-slate-200 rounded-lg text-xs p-2 focus:ring-0"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={isPhotoUploading}
                        className="bg-slate-900 hover:bg-slate-800 text-white font-black px-4 py-2 rounded-xl text-xs flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {isPhotoUploading ? (
                          <>
                            <RefreshCw size={13} className="animate-spin" />
                            <span>Uploading photo...</span>
                          </>
                        ) : (
                          <>
                            <Upload size={13} className="text-red-500" />
                            <span>Capture & Sync Photo</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {activeTab === "autoPlan" && (
              <div className="space-y-4">
                {isAnalyzingCad ? (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200/80 space-y-4">
                    <RefreshCw className="animate-spin text-indigo-600 mx-auto" size={32} />
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-slate-800">
                        {isAmharic ? "አውቶማቲክ የስራ እቅድ በማመንጨት ላይ..." : "Compiling Auto Work Plan..."}
                      </h4>
                      <p className="text-xs text-indigo-600 font-medium animate-pulse">
                        {isAmharic ? cadPlanningStepsAmh[cadPlanningStep] : cadPlanningStepsEng[cadPlanningStep]}
                      </p>
                    </div>
                  </div>
                ) : cadAnalysisError ? (
                  <div className="p-6 text-center bg-red-50 rounded-xl border border-red-200 text-red-600 space-y-3">
                    <AlertTriangle className="mx-auto" size={28} />
                    <p className="text-xs font-bold">{cadAnalysisError}</p>
                    <button
                      onClick={() => runCadAutomaticPlanning(activeDrawing.filename)}
                      className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors"
                    >
                      {isAmharic ? "በድጋሚ ይሞክሩ" : "Retry Analysis"}
                    </button>
                  </div>
                ) : !cadAnalysisResult ? (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-4">
                    <Sparkles className="text-red-500 mx-auto animate-bounce" size={32} />
                    <div className="space-y-1 max-w-md mx-auto">
                      <h4 className="text-sm font-black text-slate-800">
                        {isAmharic ? "አውቶማቲክ የስራ እቅድ እና ዕለታዊ ግምገማዎች" : "Automatic Work Scheduling & Daily Review"}
                      </h4>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        {isAmharic 
                          ? "የካድ ስዕሎችን (.dwg/.pdf) ወደ ሲስተሙ በማስገባት ሲስተሙ automatically የእያንዳንዱን ዞን የስራ እቅድ ማውጣት እና ዕለታዊ ግምገማዎች መስራት ይችላል።" 
                          : "Extract vector layouts directly from CAD drawings to generate automatic 6-day cycle work plans and compare daily camera frames against master templates."}
                      </p>
                    </div>
                    <div className="flex justify-center">
                      <button
                        onClick={() => runCadAutomaticPlanning(activeDrawing.filename)}
                        className="bg-slate-900 hover:bg-slate-800 text-white font-black px-4 py-2 rounded-xl text-xs flex items-center space-x-1.5 cursor-pointer transition-all shadow-xs"
                      >
                        <Sparkles size={14} className="text-red-500" />
                        <span>
                          {isAmharic ? "የአሁኑን የካድ ስዕል ተንትን" : "Analyze Active CAD Model"}
                        </span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 text-white space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-2.5">
                      <span className="text-[10px] text-red-400 font-bold font-mono">✓ AI PLAN COMPILED</span>
                      <span className="text-[10px] text-slate-400 font-mono">Crew Recommendation: {cadAnalysisResult.workPlan.recommendedCrewSize} workers</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1.5">
                        <span className="text-[9px] text-slate-400 font-bold block uppercase">Materials Bill of Materials (BOM)</span>
                        <div className="grid grid-cols-3 gap-1.5 text-[10px] font-mono text-slate-300">
                          <div>Walls: <strong className="text-white font-bold">{cadAnalysisResult.workPlan.bom.wallPanels || 120}</strong></div>
                          <div>Beams: <strong className="text-white font-bold">{cadAnalysisResult.workPlan.bom.beamPanels || 45}</strong></div>
                          <div>Slabs: <strong className="text-white font-bold">{cadAnalysisResult.workPlan.bom.slabPanels || 180}</strong></div>
                          <div>Props: <strong className="text-white font-bold">{cadAnalysisResult.workPlan.bom.propSupports || 85}</strong></div>
                          <div>Pins: <strong className="text-white font-bold">{cadAnalysisResult.workPlan.bom.accessories || 800}</strong></div>
                        </div>
                      </div>

                      <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1.5">
                        <span className="text-[9px] text-slate-400 font-bold block uppercase">Plumbness Compliance</span>
                        <p className="text-xs text-slate-200">{cadAnalysisResult.dailyAssessment.plumbnessCheck || "Within acceptable 3mm structural deviation"}</p>
                        <div className="flex items-center space-x-1 text-[9px] font-mono text-emerald-400 font-bold">
                          <Check size={11} />
                          <span>Slab Pour Ready status: Approved</span>
                        </div>
                      </div>
                    </div>

                    {/* Planning stages list */}
                    <div className="space-y-2">
                      <span className="text-[9px] text-slate-400 font-bold block uppercase">6-Day Cycle Sequence Plan</span>
                      <div className="space-y-1.5 text-[10px] font-mono">
                        {(cadAnalysisResult.workPlan.sequence || []).map((seq: any, i: number) => (
                          <div key={i} className="flex items-center justify-between p-2 bg-slate-900 border border-slate-800 rounded-lg">
                            <div>
                              <span className="text-red-400 font-bold">{seq.phase}</span>
                              <p className="text-slate-400 text-[9px]">{seq.tasks ? seq.tasks[0] : "Sequence task details"}</p>
                            </div>
                            <span className="bg-slate-800 px-2 py-0.5 rounded text-white font-bold">{seq.durationDays} Days</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => setCadAnalysisResult(null)}
                      className="w-full py-1.5 border border-slate-800 hover:border-slate-700 rounded-xl text-[10px] font-bold text-slate-400 cursor-pointer"
                    >
                      Clear AI analysis
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* DRAG AND OVERLAY COMPARE CONTROL TOOLBAR */}
          {activeTab === "comparison" && (
            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Comparison controls</span>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setComparisonMode("drawing_v_drawing")}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-black cursor-pointer transition-all ${
                    comparisonMode === "drawing_v_drawing"
                      ? "bg-slate-900 border-slate-800 text-white shadow-sm"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Compare Rev A vs Rev B
                </button>

                <button
                  onClick={() => setComparisonMode("cad_v_photo")}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-black cursor-pointer transition-all ${
                    comparisonMode === "cad_v_photo"
                      ? "bg-slate-900 border-slate-800 text-white shadow-sm"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Compare CAD Blueprint vs Daily Photo
                </button>
              </div>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: REVISION TIMELINE, FILE UPLOAD & APPROVAL FLOW ENGINE (5 COLS) */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* APPROVAL WORKFLOW TRACKER ENGINE */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center space-x-1.5">
                <ShieldCheck className="text-red-600" size={16} />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  {isAmharic ? "የምህንድስና ማጽደቅ የስራ ሂደት" : "Engineering Approval Flow"}
                </h3>
              </div>
              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                activeDrawing.status === "Approved" ? "bg-emerald-100 text-emerald-800" :
                activeDrawing.status === "Reviewed" ? "bg-indigo-100 text-indigo-800" :
                activeDrawing.status === "Draft" ? "bg-amber-100 text-amber-800" :
                "bg-slate-100 text-slate-600"
              }`}>
                {activeDrawing.status}
              </span>
            </div>

            {/* Stepper visual progress bar */}
            <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold">
              <div className={`p-1.5 rounded-lg border ${
                activeDrawing.status === "Draft" || activeDrawing.status === "Reviewed" || activeDrawing.status === "Approved"
                  ? "bg-amber-50 border-amber-300 text-amber-800" 
                  : "bg-slate-50 border-slate-200 text-slate-400"
              }`}>
                <span>1. Draft (Engineer)</span>
              </div>
              <div className={`p-1.5 rounded-lg border ${
                activeDrawing.status === "Reviewed" || activeDrawing.status === "Approved"
                  ? "bg-indigo-50 border-indigo-300 text-indigo-800" 
                  : "bg-slate-50 border-slate-200 text-slate-400"
              }`}>
                <span>2. Reviewed (Supervisor)</span>
              </div>
              <div className={`p-1.5 rounded-lg border ${
                activeDrawing.status === "Approved"
                  ? "bg-emerald-50 border-emerald-300 text-emerald-800" 
                  : "bg-slate-50 border-slate-200 text-slate-400"
              }`}>
                <span>3. Approved (Head Office)</span>
              </div>
            </div>

            {/* Workflow active controls tailored to user's role */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Workflow Actions for Active Role</span>

              {/* 1. If Site Engineer */}
              {currentUserRole === UserRole.SITE_ENGINEER && (
                <div className="space-y-2 text-xs">
                  <p className="text-slate-500">
                    As a **Site Engineer**, you are authorized to upload new drawings. Your submissions enter the workflow as **Drafts**, awaiting Supervisor review.
                  </p>
                  <button
                    onClick={() => {
                      setActiveTab("viewer");
                      const formElement = document.getElementById("cad_upload_form");
                      if (formElement) formElement.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-lg text-xs flex items-center justify-center space-x-1 cursor-pointer"
                  >
                    <Upload size={12} className="text-red-500" />
                    <span>Upload New Drawing Revision</span>
                  </button>
                </div>
              )}

              {/* 2. If Supervisor */}
              {currentUserRole === UserRole.SUPERVISOR && (
                <div className="space-y-3 text-xs">
                  <p className="text-slate-500">
                    Review structural properties and dimensions in the viewer, then recommend or request corrections.
                  </p>
                  
                  {activeDrawing.status === "Draft" ? (
                    <div className="space-y-2.5">
                      <textarea
                        value={supervisorNotes}
                        onChange={(e) => setSupervisorNotes(e.target.value)}
                        placeholder="Enter Supervisor review notes/remarks..."
                        className="w-full bg-white border border-slate-200 rounded-lg text-xs p-2 focus:ring-0 resize-none h-16"
                      />

                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleSupervisorReviewSubmit(activeDrawing.id, "recommend")}
                          className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-lg text-xs flex items-center justify-center space-x-1 cursor-pointer"
                        >
                          <ThumbsUp size={12} />
                          <span>Recommend Approval</span>
                        </button>
                        
                        <button
                          onClick={() => handleSupervisorReviewSubmit(activeDrawing.id, "reject")}
                          className="py-1.5 border border-red-200 hover:bg-red-50 text-red-600 px-3 font-bold rounded-lg text-xs cursor-pointer"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 bg-slate-200/50 rounded-lg text-slate-500 italic text-[11px] text-center">
                      Active drawing is not in 'Draft' phase. No supervisor review required.
                    </div>
                  )}
                </div>
              )}

              {/* 3. If Head Office */}
              {currentUserRole === UserRole.HEAD_OFFICE && (
                <div className="space-y-3 text-xs">
                  <p className="text-slate-500">
                    Provide legal digital sign-off. Approving publishes the revision as the active floor plan template.
                  </p>

                  {activeDrawing.status === "Reviewed" ? (
                    <div className="space-y-2.5">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 block uppercase font-mono">Secure Admin Pin (Type '8899')</label>
                        <input
                          type="password"
                          value={headOfficePin}
                          onChange={(e) => setHeadOfficePin(e.target.value)}
                          placeholder="••••"
                          className="bg-white border border-slate-200 rounded-lg text-xs p-2 focus:ring-0 w-24 tracking-widest text-center block"
                        />
                        {headOfficePinError && <span className="text-red-500 text-[10px] block mt-0.5">{headOfficePinError}</span>}
                      </div>

                      <button
                        onClick={() => handleHeadOfficeApproval(activeDrawing.id)}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-lg text-xs flex items-center justify-center space-x-1.5 cursor-pointer"
                      >
                        <ShieldCheck size={13} />
                        <span>Sign-off & Publish Blueprint</span>
                      </button>
                    </div>
                  ) : (
                    <div className="p-2.5 bg-slate-200/50 rounded-lg text-slate-500 italic text-[11px] text-center">
                      Only drawings marked 'Reviewed' by supervisors can be final approved.
                    </div>
                  )}
                </div>
              )}

              {/* Default fallback info */}
              {currentUserRole !== UserRole.SITE_ENGINEER && currentUserRole !== UserRole.SUPERVISOR && currentUserRole !== UserRole.HEAD_OFFICE && (
                <div className="p-2 text-center text-[10px] text-slate-400 italic">
                  Your active role ({currentUserRole.replace("_", " ")}) has view-only access to this workflow.
                </div>
              )}
            </div>
          </div>

          {/* REVISION HISTORY WORKSPACE TIMELINE */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
              <History size={16} className="text-red-600" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                {isAmharic ? "የስዕሉ ክለሳዎች እና የለውጥ ዝርዝር" : "Drawing Revision History Tracker"}
              </h3>
            </div>

            <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
              {filteredDrawings.map((draw, i) => (
                <div 
                  key={draw.id}
                  onClick={() => setActiveDrawingId(draw.id)}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition-all relative overflow-hidden flex flex-col justify-between ${
                    draw.id === activeDrawingId 
                      ? "bg-slate-900 border-slate-800 text-slate-300" 
                      : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                      draw.status === "Approved" ? "bg-emerald-500 text-white" :
                      draw.status === "Reviewed" ? "bg-indigo-500 text-white" :
                      draw.status === "Draft" ? "bg-amber-500 text-white" :
                      "bg-slate-300 text-slate-700"
                    }`}>
                      {draw.status}
                    </span>
                    <span className="font-mono text-[9px] font-bold">REV {draw.revision}</span>
                  </div>

                  <p className="font-bold text-xs truncate mt-2 leading-tight">{draw.filename}</p>
                  
                  <div className="mt-1.5 flex justify-between items-center text-[9px] text-slate-400 font-mono">
                    <span>By: {draw.uploadedBy}</span>
                    <span>{draw.uploadDate}</span>
                  </div>
                </div>
              ))}
              {filteredDrawings.length === 0 && (
                <div className="text-center py-6 text-slate-400 italic text-xs">
                  No revisions found for this specific sector zone.
                </div>
              )}
            </div>
          </div>

          {/* SITE ENGINEER DRAWING UPLOAD FORM */}
          {canUploadDrawing && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4" id="cad_upload_form">
              <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
                <Upload size={16} className="text-red-600" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  {isAmharic ? "አዲስ የካድ ስዕል ማግኛ" : "Upload New Engineering Draft"}
                </h3>
              </div>

              <form onSubmit={handleCadUpload} className="space-y-3.5 text-xs">
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Engine File Format</label>
                    <select
                      value={cadFileType}
                      onChange={(e: any) => setCadFileType(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs p-2 font-bold cursor-pointer focus:ring-0"
                    >
                      <option value="DWG">DWG (AutoCAD Vector)</option>
                      <option value="DXF">DXF (Drawing Exchange)</option>
                      <option value="PDF">PDF (Engineering Print)</option>
                      <option value="PNG">PNG / JPG (Visual Blueprint)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Custom Filename</label>
                    <input
                      type="text"
                      value={cadFilenameInput}
                      onChange={(e) => setCadFilenameInput(e.target.value)}
                      placeholder="e.g., OVID_CORE_PLAN.dwg"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs p-2 focus:ring-0"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Revision comments / notes</label>
                  <textarea
                    value={cadRemarksInput}
                    onChange={(e) => setCadRemarksInput(e.target.value)}
                    placeholder="Enter change details (e.g., Added shoring props supporting beam level)."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs p-2 focus:ring-0 resize-none h-14"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isUploading}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-black px-4 py-2 rounded-xl text-xs flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isUploading ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" />
                        <span>Processing Vector...</span>
                      </>
                    ) : (
                      <>
                        <Upload size={13} className="text-red-500" />
                        <span>Upload Draft</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>

      </div>

      {/* REPORT CONFIGURATION DIALOG MODAL */}
      <AnimatePresence>
        {isReportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="bg-slate-950 text-white p-4 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FileSpreadsheet className="text-red-500" size={18} />
                  <div>
                    <h3 className="font-black text-xs tracking-tight uppercase">Executive Report Generator</h3>
                    <p className="text-[9px] text-slate-400 font-mono">OVID Construction ERP - Compliance center</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsReportModalOpen(false)}
                  className="text-slate-400 hover:text-white font-bold text-xs"
                >
                  ✕
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Report Template</label>
                  <div className="grid grid-cols-2 gap-2 font-bold text-slate-700">
                    {[
                      "Daily Progress Report",
                      "Zone Completion Report",
                      "Drawing Revision History",
                      "Photo Inspection Report"
                    ].map((rep) => (
                      <button
                        key={rep}
                        onClick={() => setSelectedReportType(rep)}
                        className={`text-left p-2.5 rounded-xl border text-xs font-bold transition-all ${
                          selectedReportType === rep 
                            ? "bg-red-50 border-red-400 text-slate-800" 
                            : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                        }`}
                      >
                        {rep}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-red-50 rounded-xl border border-red-100 text-[10px] text-red-800 leading-relaxed">
                  <strong>Secure Cloud Sign-off:</strong> Exported documents contain validated cryptographic SHA256 signatures tying the report to supervisor review.
                </div>
              </div>

              {/* Footer */}
              <div className="bg-slate-50 p-4 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  onClick={() => triggerReportExport("pdf")}
                  disabled={exportAnimation !== "none"}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-black px-3.5 py-1.5 rounded-lg text-xs flex items-center space-x-1 cursor-pointer disabled:opacity-50"
                >
                  {exportAnimation === "pdf" ? "Exporting..." : "Download PDF"}
                </button>
                <button
                  onClick={() => triggerReportExport("excel")}
                  disabled={exportAnimation !== "none"}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-3.5 py-1.5 rounded-lg text-xs flex items-center space-x-1 cursor-pointer disabled:opacity-50"
                >
                  {exportAnimation === "excel" ? "Exporting..." : "Export Excel"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
