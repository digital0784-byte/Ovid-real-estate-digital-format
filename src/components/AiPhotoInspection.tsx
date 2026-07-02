import React, { useState, useMemo } from "react";
import { 
  Camera, 
  Sparkles, 
  Cpu, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  FileText, 
  TrendingUp, 
  Users, 
  MapPin, 
  Calendar, 
  Clock, 
  HardHat, 
  ClipboardCheck, 
  RefreshCw, 
  Layers, 
  ShieldCheck,
  ChevronRight,
  Eye,
  Settings,
  Sliders,
  HelpCircle
} from "lucide-react";
import { UserRole, ProjectZone } from "../types";

interface AiPhotoInspectionProps {
  isAmharic: boolean;
  currentUserRole: UserRole;
  zones: ProjectZone[];
  onUpdateZone?: (zone: ProjectZone) => void;
  onLogAction?: (action: string, details: string) => void;
}

// Interfaces for our AI Photo Module
interface SitePhoto {
  id: string;
  project: string;
  building: string;
  floor: number;
  zone: string;
  date: string;
  time: string;
  gpsLocation: { lat: number; lng: number; alt: number };
  photographer: string;
  photographerRole: string;
  workActivity: string;
  imageUrl: string;
  
  // AI Progress Analysis results
  progressAnalysis: {
    workCompletedPercent: number;
    remainingPercent: number;
    panelCoveragePercent: number;
    targetComparison: "Ahead" | "On Schedule" | "Behind";
    scheduleVarianceDays: number; // e.g. -1 (ahead), 0, 2 (delayed)
  };

  // AI Panel Verification
  panelVerification: {
    layoutMatchesApprovedCAD: boolean;
    expectedPanelTypesInstalled: boolean;
    missingPanelsDetected: boolean;
    missingCount: number;
    inconsistenciesDetected: boolean;
    inspectorAlertMessage: string;
  };

  // AI Alignment Assessment
  alignmentAssessment: {
    alignmentStatus: "Pass" | "Review Required";
    verticalDeviationMm: number;
    horizontalDeviationMm: number;
    gapsDetected: boolean;
    visibleDefects: string[];
    confidenceScore: number; // e.g. 96
    annotations: Array<{ x: number; y: number; label: string; type: "pass" | "warn" | "fail" }>;
  };

  // Concrete Readiness Checklist Status (Zone-specific checklist)
  readinessChecklist: {
    requiredPanelsInstalled: boolean;
    requiredAccessoriesInstalled: boolean;
    alignmentInspectionCompleted: boolean;
    bracingInspectionCompleted: boolean;
    safetyInspectionCompleted: boolean;
    qualityInspectionCompleted: boolean;
    supervisorApproval: boolean;
    engineerApproval: boolean;
  };
}

export const AiPhotoInspection: React.FC<AiPhotoInspectionProps> = ({
  isAmharic,
  currentUserRole,
  zones,
  onUpdateZone,
  onLogAction
}) => {
  // Preset demo construction photos to make uploading super fun & instant
  const presetPhotos = [
    {
      name: "Slab & Core Panel Layout (Standard)",
      url: "https://images.unsplash.com/photo-1590069261209-f8e9b8642343?w=800&auto=format&fit=crop",
      workActivity: "Formwork Assembly",
      quality: "perfect"
    },
    {
      name: "Column Framing Alignment (Review Needed)",
      url: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&auto=format&fit=crop",
      workActivity: "Alignment Calibration",
      quality: "misaligned"
    },
    {
      name: "Slab Deck Shoring Props (Missing Accessories)",
      url: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800&auto=format&fit=crop",
      workActivity: "Support Bracing",
      quality: "missing_parts"
    }
  ];

  // Seed Data: Historic Site Photos and AI Audits
  const [photos, setPhotos] = useState<SitePhoto[]>([
    {
      id: "PHOTO-001",
      project: "Bole Heights Phase 1",
      building: "Tower 1",
      floor: 4,
      zone: "Zone A",
      date: "2026-07-01",
      time: "10:30 AM",
      gpsLocation: { lat: 9.0049, lng: 38.7783, alt: 2320 },
      photographer: "Yohannes Bekele",
      photographerRole: "Team Leader",
      workActivity: "Formwork Assembly",
      imageUrl: "https://images.unsplash.com/photo-1590069261209-f8e9b8642343?w=800&auto=format&fit=crop",
      progressAnalysis: {
        workCompletedPercent: 95,
        remainingPercent: 5,
        panelCoveragePercent: 98,
        targetComparison: "Ahead",
        scheduleVarianceDays: -1
      },
      panelVerification: {
        layoutMatchesApprovedCAD: true,
        expectedPanelTypesInstalled: true,
        missingPanelsDetected: false,
        missingCount: 0,
        inconsistenciesDetected: false,
        inspectorAlertMessage: isAmharic 
          ? "ሁሉም የአሉሚኒየም ፎርምወርክ ፓነሎች ከፀደቀው የCAD ዲዛይን ጋር በትክክል ይጣጣማሉ።"
          : "All primary panels strictly align with approved CAD schematics."
      },
      alignmentAssessment: {
        alignmentStatus: "Pass",
        verticalDeviationMm: 1.2,
        horizontalDeviationMm: 0.8,
        gapsDetected: false,
        visibleDefects: [],
        confidenceScore: 98,
        annotations: [
          { x: 30, y: 40, label: "Joint Tightness: 100%", type: "pass" },
          { x: 70, y: 35, label: "Vertical plumb: OK", type: "pass" }
        ]
      },
      readinessChecklist: {
        requiredPanelsInstalled: true,
        requiredAccessoriesInstalled: true,
        alignmentInspectionCompleted: true,
        bracingInspectionCompleted: true,
        safetyInspectionCompleted: true,
        qualityInspectionCompleted: true,
        supervisorApproval: true,
        engineerApproval: true
      }
    },
    {
      id: "PHOTO-002",
      project: "Bole Heights Phase 1",
      building: "Tower 1",
      floor: 4,
      zone: "Zone B",
      date: "2026-07-02",
      time: "08:15 AM",
      gpsLocation: { lat: 9.0051, lng: 38.7781, alt: 2321 },
      photographer: "Fikru Tolossa",
      photographerRole: "Gang Chief",
      workActivity: "Alignment Calibration",
      imageUrl: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&auto=format&fit=crop",
      progressAnalysis: {
        workCompletedPercent: 78,
        remainingPercent: 22,
        panelCoveragePercent: 82,
        targetComparison: "Behind",
        scheduleVarianceDays: 2
      },
      panelVerification: {
        layoutMatchesApprovedCAD: false,
        expectedPanelTypesInstalled: true,
        missingPanelsDetected: true,
        missingCount: 3,
        inconsistenciesDetected: true,
        inspectorAlertMessage: isAmharic 
          ? "ትኩረት፡ በምስራቅ በኩል ባለው ምሰሶ አጠገብ 3 የአሉሚኒየም ግድግዳ ፓነሎች አልተገጠሙም!"
          : "Warning: 3 wall panel segments near the eastern elevator core are missing installation hooks!"
      },
      alignmentAssessment: {
        alignmentStatus: "Review Required",
        verticalDeviationMm: 6.4,
        horizontalDeviationMm: 4.1,
        gapsDetected: true,
        visibleDefects: ["Slight leaning at wall joint B3", "Unsecured pin accessories"],
        confidenceScore: 92,
        annotations: [
          { x: 45, y: 60, label: "Missing Pin Wedges", type: "fail" },
          { x: 80, y: 50, label: "Vertical deviation 6.4mm", type: "warn" }
        ]
      },
      readinessChecklist: {
        requiredPanelsInstalled: false,
        requiredAccessoriesInstalled: true,
        alignmentInspectionCompleted: false,
        bracingInspectionCompleted: true,
        safetyInspectionCompleted: true,
        qualityInspectionCompleted: false,
        supervisorApproval: false,
        engineerApproval: false
      }
    }
  ]);

  // Selected photo for analysis workspace
  const [selectedPhotoId, setSelectedPhotoId] = useState<string>("PHOTO-002");

  // Form State for uploading new photo
  const [uploadProject, setUploadProject] = useState("Bole Heights Phase 1");
  const [uploadBuilding, setUploadBuilding] = useState("Tower 1");
  const [uploadFloor, setUploadFloor] = useState<number>(4);
  const [uploadZone, setUploadZone] = useState("Zone B");
  const [uploadActivity, setUploadActivity] = useState("Formwork Assembly");
  const [customPhotoUrl, setCustomPhotoUrl] = useState("");
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number>(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Active Photo record loaded in Workspace
  const activePhoto = useMemo(() => {
    return photos.find(p => p.id === selectedPhotoId) || photos[0];
  }, [photos, selectedPhotoId]);

  // Handle preset selector click (fills image and activity)
  const handlePresetSelect = (idx: number) => {
    setSelectedPresetIndex(idx);
    setUploadActivity(presetPhotos[idx].workActivity);
    setCustomPhotoUrl("");
  };

  // Upload/Analysis simulation logic
  const handlePhotoUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Who is the current photographer?
    let photographerName = "Kassa Hunegn";
    let photographerRoleStr = "Supervisor";
    if (currentUserRole === UserRole.TEAM_LEADER) {
      photographerName = "Yohannes Bekele";
      photographerRoleStr = "Team Leader";
    } else if (currentUserRole === UserRole.GANG_CHIEF) {
      photographerName = "Fikru Tolossa";
      photographerRoleStr = "Gang Chief";
    } else if (currentUserRole === UserRole.HEAD_OFFICE) {
      photographerName = "Eng. Yoseph";
      photographerRoleStr = "Project Engineer";
    }

    setIsAnalyzing(true);

    // Simulate AI Vision calculation time
    setTimeout(() => {
      const finalImgUrl = customPhotoUrl || presetPhotos[selectedPresetIndex].url;
      const type = customPhotoUrl ? "custom" : presetPhotos[selectedPresetIndex].quality;

      // Dynamic AI progress metrics based on selection
      let workCompleted = 85;
      let coverage = 90;
      let matchesCAD = true;
      let alignment: "Pass" | "Review Required" = "Pass";
      let confidence = 95;
      let missingPanels = false;
      let missingNum = 0;
      let deviationV = 1.1;
      let deviationH = 0.9;
      let defects: string[] = [];
      let annotations: any[] = [];
      let alertMsg = isAmharic 
        ? "ፓነሎች በፀደቀው እቅድ መሠረት በትክክል ተሰልፈዋል።"
        : "Visual panel matrix complies with site blueprint plans.";

      if (type === "misaligned") {
        workCompleted = 75;
        coverage = 88;
        matchesCAD = false;
        alignment = "Review Required";
        confidence = 91;
        deviationV = 5.8;
        deviationH = 3.5;
        defects = ["Joint offset detected at slab connector", "Deflected scaffolding brace"];
        annotations = [
          { x: 35, y: 48, label: "Offset: 5.8mm", type: "fail" },
          { x: 65, y: 72, label: "Incomplete pin tightening", type: "warn" }
        ];
        alertMsg = isAmharic
          ? "ማስጠንቀቂያ፡ በፓነል መጋጠሚያዎች ላይ የ5.8mm የመስመር መዛባት ታይቷል፡ ድጋሚ እንዲስተካከል ይመከራል።"
          : "Warning: 5.8mm misalignment detected at secondary slab joint corners.";
      } else if (type === "missing_parts") {
        workCompleted = 65;
        coverage = 70;
        matchesCAD = false;
        alignment = "Review Required";
        confidence = 89;
        missingPanels = true;
        missingNum = 4;
        deviationV = 2.4;
        deviationH = 1.9;
        defects = ["4 Deck panels are absent", "Insufficient support scaffolding pins"];
        annotations = [
          { x: 20, y: 55, label: "4 Panels missing", type: "fail" },
          { x: 50, y: 30, label: "No bracing pins detected", type: "warn" }
        ];
        alertMsg = isAmharic
          ? "ትኩረት፡ 4 ዋና ዋና የአሉሚኒየም ፎርምወርክ ፓነሎች በዞኑ ላይ አልተገጠሙም!"
          : "Critical alert: 4 structural formwork panels are completely absent in this zone grid!";
      } else {
        // perfect/custom standard
        annotations = [
          { x: 25, y: 45, label: "Slab flatness verified", type: "pass" },
          { x: 75, y: 55, label: "Accessories 100% locked", type: "pass" }
        ];
      }

      const newPhotoId = `PHOTO-${Date.now().toString().slice(-4)}`;
      const newPhoto: SitePhoto = {
        id: newPhotoId,
        project: uploadProject,
        building: uploadBuilding,
        floor: uploadFloor,
        zone: uploadZone,
        date: new Date().toISOString().split("T")[0],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        gpsLocation: { 
          lat: 9.0045 + (Math.random() - 0.5) * 0.002, 
          lng: 38.7780 + (Math.random() - 0.5) * 0.002, 
          alt: 2320 
        },
        photographer: photographerName,
        photographerRole: photographerRoleStr,
        workActivity: uploadActivity,
        imageUrl: finalImgUrl,
        progressAnalysis: {
          workCompletedPercent: workCompleted,
          remainingPercent: 100 - workCompleted,
          panelCoveragePercent: coverage,
          targetComparison: workCompleted >= 85 ? "Ahead" : "Behind",
          scheduleVarianceDays: workCompleted >= 85 ? -1 : 1
        },
        panelVerification: {
          layoutMatchesApprovedCAD: matchesCAD,
          expectedPanelTypesInstalled: true,
          missingPanelsDetected: missingPanels,
          missingCount: missingNum,
          inconsistenciesDetected: !matchesCAD,
          inspectorAlertMessage: alertMsg
        },
        alignmentAssessment: {
          alignmentStatus: alignment,
          verticalDeviationMm: deviationV,
          horizontalDeviationMm: deviationH,
          gapsDetected: missingPanels || type === "misaligned",
          visibleDefects: defects,
          confidenceScore: confidence,
          annotations: annotations
        },
        readinessChecklist: {
          requiredPanelsInstalled: !missingPanels,
          requiredAccessoriesInstalled: type !== "missing_parts",
          alignmentInspectionCompleted: alignment === "Pass",
          bracingInspectionCompleted: type !== "missing_parts",
          safetyInspectionCompleted: true,
          qualityInspectionCompleted: alignment === "Pass",
          supervisorApproval: false,
          engineerApproval: false
        }
      };

      setPhotos(prev => [newPhoto, ...prev]);
      setSelectedPhotoId(newPhotoId);
      setIsAnalyzing(false);

      if (onLogAction) {
        onLogAction(
          "AI Inspection Photo Uploaded", 
          `Uploaded site photo for ${uploadBuilding} FL ${uploadFloor} ${uploadZone}. Photographer: ${photographerName}. AI estimated progress: ${workCompleted}%`
        );
      }
    }, 2000);
  };

  // Toggle checklist states interactively in Workspace
  const handleChecklistToggle = (item: keyof SitePhoto["readinessChecklist"]) => {
    setPhotos(prev => prev.map(p => {
      if (p.id === selectedPhotoId) {
        const updatedChecklist = {
          ...p.readinessChecklist,
          [item]: !p.readinessChecklist[item]
        };
        return {
          ...p,
          readinessChecklist: updatedChecklist
        };
      }
      return p;
    }));

    if (onLogAction) {
      onLogAction(
        "Concrete Checklist Updated", 
        `Toggled pre-pour check "${item}" in ${activePhoto.building} FL ${activePhoto.floor} ${activePhoto.zone}`
      );
    }
  };

  // Check if Zone is "Ready for Concrete"
  const concreteReadinessStatus = useMemo(() => {
    const list = activePhoto.readinessChecklist;
    const allChecked = Object.values(list).every(val => val === true);
    
    if (allChecked) {
      return "Ready";
    } else if (list.requiredPanelsInstalled && list.alignmentInspectionCompleted && list.supervisorApproval) {
      return "Review";
    } else {
      return "Not Ready";
    }
  }, [activePhoto]);

  // Update master zone state on concrete readiness status changes or approvals
  const handleAuthorizeConcretePour = () => {
    // Attempt to locate matching zone in the master project state
    const targetZoneId = `B1-F0${activePhoto.floor}-Z${activePhoto.zone.split(" ")[1]}`;
    const matchedZone = zones.find(z => z.id === targetZoneId);

    if (matchedZone && onUpdateZone) {
      const updatedZone = {
        ...matchedZone,
        status: "Completed" as any, // Cast to any or appropriate type if needed
        completionPercentage: 100,
        remarks: `Concrete authorized by ${currentUserRole} via AI pre-pour checklist.`
      };
      onUpdateZone(updatedZone);
      alert(isAmharic 
        ? `የኮንክሪት ሙሌት በተሳካ ሁኔታ ተፈቅዷል! ዞን ${activePhoto.zone} በሲስተሙ ላይ አልቋል (Completed) ተብሎ ተዘግቧል።`
        : `Pouring authorized successfully! ${activePhoto.zone} status has been updated to 'Completed' in the master scheduler.`);
    } else {
      alert(isAmharic
        ? `ተፈቅዷል! የኮንክሪት ዝግጅት ማረጋገጫ በ${activePhoto.building} ፎቅ ${activePhoto.floor} ዞን ${activePhoto.zone} ላይ ፀድቋል።`
        : ` Pouring Authorized! Pre-pour sign-off registered for ${activePhoto.building} FL ${activePhoto.floor} ${activePhoto.zone}.`);
    }

    if (onLogAction) {
      onLogAction(
        "Concrete Pour Authorized", 
        `Officially signed off concrete pouring for ${activePhoto.building} FL ${activePhoto.floor} ${activePhoto.zone} by ${currentUserRole}`
      );
    }
  };

  // Check upload permissions based on UserRole
  const hasUploadPermission = useMemo(() => {
    const allowedRoles = [UserRole.TEAM_LEADER, UserRole.GANG_CHIEF, UserRole.SUPERVISOR, UserRole.HEAD_OFFICE];
    return allowedRoles.includes(currentUserRole);
  }, [currentUserRole]);

  // Compute Daily Progress Report stats from the active photo analysis & active zones
  const reportStats = useMemo(() => {
    const planned = 82; // Static planned target for Bole Heights today
    const estimatedActual = activePhoto.progressAnalysis.workCompletedPercent;
    const remaining = 100 - estimatedActual;
    const workersRequirement = estimatedActual < planned ? 16 : 12;
    const variance = estimatedActual - planned;

    return {
      planned,
      actual: estimatedActual,
      remaining,
      manpower: workersRequirement,
      estCompletionDate: variance < 0 ? "2026-07-06 (Delayed 1 Day)" : "2026-07-05 (On Schedule)",
      delayAnalysis: variance < 0 
        ? (isAmharic ? "ከእቅዱ በ13% ወደኋላ መቅረት ታይቷል። ተጨማሪ ሰራተኛ ማሰማራት ይጠይቃል።" : "13% deficit against planned target due to missing core elements.")
        : (isAmharic ? "እቅዱ በጥሩ ሁኔታ ላይ ይገኛል። የቀሪ ስራዎች ፍጥነት ተገቢ ነው።" : "Excellent structural cycle consistency. Ahead of targeted pour curve."),
      targetNextDay: variance < 0
        ? (isAmharic ? "የቀሩትን 4 ፓነሎች መግጠም፣ የውጪውን ስካፎልዲንግ ማሰር" : "Complete remaining 4 panel assemblies and lock primary outer shoring struts.")
        : (isAmharic ? "ኮንክሪት ማፍሰስ መጀመር እና ፎቅ 5 ላይ ምልክት ማድረግ" : "Initiate concrete pouring cycle and mark slab layout for Floor 5.")
    };
  }, [activePhoto, isAmharic]);

  return (
    <div className="space-y-6">
      
      {/* Top Banner Alert / Information Bar */}
      <div className="bg-slate-900 rounded-2xl p-6 text-white border border-slate-800 shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-36 h-36 bg-red-600/10 rounded-full blur-3xl"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="bg-red-600 text-[9px] font-black tracking-widest uppercase text-white px-2 py-0.5 rounded-md flex items-center space-x-1 animate-pulse">
                <Sparkles size={10} />
                <span>AI COMPUTER VISION</span>
              </span>
              <span className="text-slate-400 font-mono text-[10px]">OVID INSPECT CORE v2.1</span>
            </div>
            <h2 className="text-xl font-extrabold tracking-tight">
              {isAmharic ? "አይአይ ሳይት ፎቶ ቁጥጥር እና የኮንክሪት ዝግጁነት መድረክ" : "AI Photo Progress Inspection & Concrete Readiness Suite"}
            </h2>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              {isAmharic
                ? "የስራ ቡድን መሪዎችና ሱፐርቫይዘሮች የሚያስገቧቸውን ዕለታዊ የፎርምወርክ ፎቶዎች በኮምፒውተር እይታ (AI) በመተንተን፣ የመገጣጠም ልኬቶችን፣ የፓነል አቀማመጥን እና የኮንክሪት መፍሰስ ዝግጁነትን በራስ-ሰር ያረጋግጣል።"
                : "Real-time structural computer vision module. Scan field panel uploads, automatically assess structural joint alignment plumb lines, cross-match with CAD schematics, and run mandatory checklist sign-offs."}
            </p>
          </div>
          <div className="flex items-center space-x-3 self-start md:self-center shrink-0">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center shadow-inner min-w-[100px]">
              <span className="text-[9px] text-slate-500 block uppercase font-mono font-bold">{isAmharic ? "ወቅታዊ ተጠቃሚ" : "Role Status"}</span>
              <span className="text-xs font-black text-red-500">{currentUserRole.replace("_", " ")}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Container Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: Upload Module & Historic Logs */}
        <div className="xl:col-span-1 space-y-6">
          
          {/* 1. Daily Site Photo Upload Form */}
          <div id="photo-upload-card" className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center space-x-2">
                <Camera className="text-red-600" size={18} />
                <span>{isAmharic ? "ዕለታዊ የሳይት ፎቶ ማስገቢያ" : "Daily Site Photo Upload"}</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {isAmharic 
                  ? "የቡድን መሪዎች፣ ጋንግ ቺፎች እና ሱፐርቫይዘሮች ዕለታዊ የምስል ፍተሻ ማካሄድ ይችላሉ"
                  : "Authorized roles can append high-resolution field photos for immediate AI structural analysis."}
              </p>
            </div>

            {hasUploadPermission ? (
              <form onSubmit={handlePhotoUploadSubmit} className="space-y-4 text-xs">
                
                {/* 2x2 Selection Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      {isAmharic ? "ህንፃ / ብሎክ" : "Building/Block"}
                    </label>
                    <select
                      value={uploadBuilding}
                      onChange={(e) => setUploadBuilding(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-bold focus:outline-none focus:border-red-500 cursor-pointer text-xs"
                    >
                      <option value="Tower 1">{isAmharic ? "ህንፃ 1" : "Tower 1"}</option>
                      <option value="Tower 2">{isAmharic ? "ህንፃ 2" : "Tower 2"}</option>
                      <option value="Block B">{isAmharic ? "ብሎክ B" : "Block B"}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      {isAmharic ? "ፎቅ (Floor)" : "Floor Slab"}
                    </label>
                    <select
                      value={uploadFloor}
                      onChange={(e) => setUploadFloor(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-bold focus:outline-none focus:border-red-500 cursor-pointer text-xs"
                    >
                      {[1, 2, 3, 4, 5].map(f => (
                        <option key={f} value={f}>{isAmharic ? `ፎቅ ${f}` : `Floor ${f}`}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      {isAmharic ? "ዞን (Zone)" : "Zone Grid"}
                    </label>
                    <select
                      value={uploadZone}
                      onChange={(e) => setUploadZone(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-bold focus:outline-none focus:border-red-500 cursor-pointer text-xs"
                    >
                      <option value="Zone A">{isAmharic ? "ዞን A" : "Zone A"}</option>
                      <option value="Zone B">{isAmharic ? "ዞን B" : "Zone B"}</option>
                      <option value="Zone C">{isAmharic ? "ዞን C" : "Zone C"}</option>
                      <option value="Zone D">{isAmharic ? "ዞን D" : "Zone D"}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      {isAmharic ? "የስራ ሂደት አይነት" : "Work Activity"}
                    </label>
                    <select
                      value={uploadActivity}
                      onChange={(e) => setUploadActivity(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-bold focus:outline-none focus:border-red-500 cursor-pointer text-xs"
                    >
                      <option value="Formwork Assembly">{isAmharic ? "የፎርምወርክ መገጣጠም" : "Formwork Assembly"}</option>
                      <option value="Alignment Calibration">{isAmharic ? "የመስመር ልኬት ማስተካከል" : "Alignment Calibration"}</option>
                      <option value="Support Bracing">{isAmharic ? "የማጠናከሪያ ድጋፍ ማሰር" : "Support Bracing"}</option>
                      <option value="Steel Fixing">{isAmharic ? "የብረት ፌሮ መረብ ማሰር" : "Steel Fixing"}</option>
                    </select>
                  </div>
                </div>

                {/* Preset Scenarios selector */}
                <div className="space-y-1.5 pt-1">
                  <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    {isAmharic ? "አይአይ ለመፈተሽ የሚፈልጉትን ሁኔታ ይምረጡ" : "Choose Preset Case Scenario for AI"}
                  </span>
                  <div className="grid grid-cols-1 gap-1.5">
                    {presetPhotos.map((preset, idx) => (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => handlePresetSelect(idx)}
                        className={`p-2 rounded-lg border text-left flex items-center justify-between transition-all cursor-pointer ${
                          selectedPresetIndex === idx && !customPhotoUrl
                            ? "border-red-600 bg-red-50/50 text-slate-900"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-extrabold text-[10px] truncate">{preset.name}</p>
                          <p className="text-[9px] text-slate-400 font-medium truncate">{preset.workActivity}</p>
                        </div>
                        <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full uppercase shrink-0 ${
                          preset.quality === "perfect" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                        }`}>
                          {preset.quality === "perfect" ? (isAmharic ? "ፍጹም" : "Perfect") : (isAmharic ? "ጉድለት" : "Defect")}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Optional Custom Image URL input */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    {isAmharic ? "የራስዎን የፎቶ ሊንክ (URL) ያስገቡ (አማራጭ)" : "Or input custom Image URL (Optional)"}
                  </label>
                  <input
                    type="url"
                    placeholder="https://example.com/site-photo.jpg"
                    value={customPhotoUrl}
                    onChange={(e) => {
                      setCustomPhotoUrl(e.target.value);
                      setSelectedPresetIndex(-1);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono text-[10px] focus:outline-none focus:border-red-500"
                  />
                </div>

                {/* Submit Action Button with Loader */}
                <button
                  type="submit"
                  disabled={isAnalyzing}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-lg uppercase tracking-wider flex items-center justify-center space-x-2 cursor-pointer shadow-xs transition-all disabled:opacity-50"
                >
                  {isAnalyzing ? (
                    <>
                      <RefreshCw size={14} className="animate-spin text-red-500" />
                      <span>{isAmharic ? "አይአይ በኮምፒውተር እይታ እያጠና ነው..." : "AI Computer Vision Analyzing..."}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} className="text-red-500" />
                      <span>{isAmharic ? "ፎቶ ስቀል እና በ AI ፍተሻ ጀምር" : "Upload & Analyze with AI"}</span>
                    </>
                  )}
                </button>

              </form>
            ) : (
              // Locked notice for non-authorized roles
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center space-y-2">
                <AlertTriangle className="text-amber-600 mx-auto" size={24} />
                <h4 className="text-xs font-bold text-slate-800">{isAmharic ? "ፎቶ ለመስቀል ፍቃድ የለዎትም" : "Upload Access Blocked"}</h4>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  {isAmharic 
                    ? "የእለት ምስሎችን መጫን የሚችሉት የስራ ቡድን መሪዎች፣ ጋንግ ቺፎች እና ሳይት ሱፐርቫይዘሮች ብቻ ናቸው። እባክዎን ወደ ተገቢው ተጠቃሚ ይቀይሩ።"
                    : "Only Team Leaders, Gang Chiefs, and Site Supervisors are authorized to upload primary progress images. Please switch role at the top right."}
                </p>
              </div>
            )}
          </div>

          {/* 2. Historic Photo Log Feed */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
            <div className="border-b border-slate-100 pb-2 flex justify-between items-center">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                {isAmharic ? "የፎቶ ምርመራዎች መዝገብ" : "Photo Audit Archives"}
              </h3>
              <span className="bg-slate-100 text-[10px] font-bold text-slate-600 px-2 py-0.5 rounded-full font-mono">
                {photos.length} {isAmharic ? "ምስሎች" : "Total"}
              </span>
            </div>

            <div className="space-y-2 max-h-[290px] overflow-y-auto pr-1">
              {photos.map(p => {
                const isSelected = p.id === selectedPhotoId;
                const statusColor = p.alignmentAssessment.alignmentStatus === "Pass" 
                  ? "border-emerald-500 text-emerald-700 bg-emerald-50" 
                  : "border-amber-500 text-amber-700 bg-amber-50";

                return (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => setSelectedPhotoId(p.id)}
                    className={`w-full p-2.5 rounded-xl border-2 text-left flex items-center space-x-3 transition-all cursor-pointer ${
                      isSelected ? "border-slate-900 bg-slate-50 shadow-xs" : "border-slate-100 hover:bg-slate-50"
                    }`}
                  >
                    {/* Thumbnail Image */}
                    <img 
                      src={p.imageUrl} 
                      alt={p.zone} 
                      className="w-12 h-12 rounded-lg object-cover shrink-0 border border-slate-200"
                      referrerPolicy="no-referrer"
                    />
                    
                    {/* Text Details */}
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-mono text-slate-400 font-extrabold">{p.id}</span>
                        <span className="text-[9px] text-slate-500">{p.date}</span>
                      </div>
                      <p className="text-xs font-black text-slate-800 leading-tight">
                        {p.building} - {isAmharic ? p.zone.replace("Zone", "ዞን") : p.zone}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium truncate">{p.workActivity}</p>
                      
                      {/* Flex status tags */}
                      <div className="flex items-center space-x-2 pt-1">
                        <span className="text-[9px] font-mono text-slate-500 bg-slate-100 px-1 rounded font-extrabold">
                          FL {p.floor}
                        </span>
                        <span className={`text-[9px] px-1 rounded-sm border font-extrabold ${statusColor}`}>
                          {p.alignmentAssessment.alignmentStatus === "Pass" ? (isAmharic ? "አለፈ" : "PASS") : (isAmharic ? "በድጋሚ እይ" : "REVIEW")}
                        </span>
                        <span className="text-[9px] font-bold text-red-600 font-mono">
                          {p.progressAnalysis.workCompletedPercent}% {isAmharic ? "ያለቀ" : "Done"}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* MIDDLE COLUMN: Active Analysis Workspace */}
        <div className="xl:col-span-2 space-y-6">
          
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
            
            {/* Active Header details */}
            <div className="border-b border-slate-100 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="bg-red-600 text-[10px] font-black text-white px-2 py-0.5 rounded uppercase font-mono tracking-wider">
                    {activePhoto.id}
                  </span>
                  <span className="text-slate-400 text-xs font-semibold">
                    {isAmharic ? "በአሁኑ ሰዓት የተመረጠ" : "Active Audit Canvas"}
                  </span>
                </div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
                  <MapPin className="text-red-600" size={18} />
                  <span>
                    {activePhoto.building} - {isAmharic ? `ፎቅ ${activePhoto.floor}፣ ዞን ${activePhoto.zone.replace("Zone ", "")}` : `Floor ${activePhoto.floor}, ${activePhoto.zone}`}
                  </span>
                </h3>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-1">
                  <span className="flex items-center space-x-1">
                    <Calendar size={13} />
                    <span>{activePhoto.date}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Clock size={13} />
                    <span>{activePhoto.time}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <HardHat size={13} />
                    <span>{isAmharic ? "ፎቶ አንሺ:" : "Photographer:"} <strong>{activePhoto.photographer} ({activePhoto.photographerRole})</strong></span>
                  </span>
                </div>
              </div>

              {/* Status Banner */}
              <div className="flex flex-col items-end">
                <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider font-mono">
                  {isAmharic ? "የኮንክሪት ዝግጁነት" : "Pre-Pour Readiness"}
                </span>
                <span className={`mt-1 text-sm font-black px-3.5 py-1.5 rounded-full uppercase border shadow-2xs ${
                  concreteReadinessStatus === "Ready"
                    ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                    : concreteReadinessStatus === "Review"
                    ? "bg-amber-100 text-amber-800 border-amber-300"
                    : "bg-red-100 text-red-800 border-red-300 animate-pulse"
                }`}>
                  {concreteReadinessStatus === "Ready" 
                    ? (isAmharic ? "ኮንክሪት ማፍሰስ ይቻላል (READY)" : "Ready for Concrete")
                    : concreteReadinessStatus === "Review"
                    ? (isAmharic ? "በድጋሚ ፍተሻ (REVIEW)" : "Review Required")
                    : (isAmharic ? "ኮንክሪት አይቻልም (NOT READY)" : "Not Ready for Concrete")}
                </span>
              </div>
            </div>

            {/* Interactive Image Annotations Panel */}
            <div className="space-y-2">
              <span className="block text-xs font-black text-slate-700 uppercase tracking-wider flex items-center space-x-2">
                <Eye size={15} className="text-red-600" />
                <span>{isAmharic ? "አይአይ ኮምፒውተር እይታ ማርከሮች (AI Plumb Line Annotations)" : "AI Vision Blueprint Plumb Placements"}</span>
              </span>
              
              <div className="relative bg-slate-950 rounded-2xl overflow-hidden shadow-inner border border-slate-800 aspect-video md:max-h-[380px] flex items-center justify-center">
                
                {/* Site Photo Image Background */}
                <img 
                  src={activePhoto.imageUrl} 
                  alt="Audit site analysis" 
                  className="w-full h-full object-cover opacity-85"
                  referrerPolicy="no-referrer"
                />

                {/* Simulated Laser grid overlay */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,0,0,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,0,0,0.05)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none"></div>

                {/* Scanline Sweep animation */}
                <div className="absolute inset-x-0 top-0 h-0.5 bg-red-500 shadow-[0_0_10px_#ef4444] animate-scan-y pointer-events-none"></div>

                {/* Annotations Dots & Tooltips */}
                {activePhoto.alignmentAssessment.annotations.map((annot, idx) => {
                  const colorClass = annot.type === "pass" 
                    ? "bg-emerald-500 shadow-emerald-500/50" 
                    : annot.type === "warn" 
                    ? "bg-amber-500 shadow-amber-500/50" 
                    : "bg-red-500 shadow-red-500/50";

                  return (
                    <div 
                      key={idx} 
                      className="absolute group"
                      style={{ left: `${annot.x}%`, top: `${annot.y}%` }}
                    >
                      <span className={`flex h-4.5 w-4.5 rounded-full border border-white cursor-pointer relative items-center justify-center shadow-lg transition-all transform hover:scale-125 ${colorClass}`}>
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-inherit"></span>
                      </span>

                      {/* Tooltip on Hover */}
                      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-slate-900 border border-slate-700 text-white text-[10px] p-2 rounded-lg whitespace-nowrap shadow-xl z-20 opacity-90 group-hover:opacity-100 transition-opacity flex flex-col space-y-0.5 font-sans pointer-events-none">
                        <span className="font-extrabold uppercase text-[8px] text-slate-400">Computer Vision Log</span>
                        <span className="font-bold">{annot.label}</span>
                      </div>
                    </div>
                  );
                })}

                {/* Technical Coordinates overlay */}
                <div className="absolute bottom-4 left-4 bg-slate-900/90 border border-slate-700/80 p-2.5 rounded-lg text-white font-mono text-[9px] leading-relaxed space-y-0.5">
                  <p className="text-red-500 font-extrabold flex items-center space-x-1">
                    <Cpu size={10} className="animate-spin-slow" />
                    <span>LIDAR COUPLING ACTIVE</span>
                  </p>
                  <p>GPS: {activePhoto.gpsLocation.lat.toFixed(5)}°N, {activePhoto.gpsLocation.lng.toFixed(5)}°E</p>
                  <p>ELEVATION: {activePhoto.gpsLocation.alt}m ASL</p>
                </div>
              </div>
            </div>

            {/* AI Vision Metrics Row: Progress Analysis, Panel Verification, Alignment */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              
              {/* Box 1: AI Progress Analysis */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4.5 space-y-3.5">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                  <TrendingUp className="text-red-600" size={15} />
                  <span>{isAmharic ? "አይአይ የእድገት ትንተና" : "AI Progress Analysis"}</span>
                </h4>
                
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">{isAmharic ? "ስራ የተጠናቀቀው (%):" : "Work Completed (%):"}</span>
                    <strong className="text-slate-900 text-base font-mono font-black">{activePhoto.progressAnalysis.workCompletedPercent}%</strong>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-red-600 h-full transition-all duration-1000" 
                      style={{ width: `${activePhoto.progressAnalysis.workCompletedPercent}%` }}
                    ></div>
                  </div>

                  <div className="flex justify-between items-center text-[11px] pt-1 border-t border-slate-200">
                    <span className="text-slate-500">{isAmharic ? "ያልተገጠሙ ፓነሎች (%):" : "Remaining Work (%):"}</span>
                    <strong className="text-slate-700 font-mono">{activePhoto.progressAnalysis.remainingPercent}%</strong>
                  </div>

                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">{isAmharic ? "የፓነል ሽፋን መጠን:" : "Installed Panel Coverage:"}</span>
                    <strong className="text-slate-700 font-mono">{activePhoto.progressAnalysis.panelCoveragePercent}%</strong>
                  </div>

                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">{isAmharic ? "ከተያዘው እቅድ አንጻር:" : "Target Comparison:"}</span>
                    <span className={`font-black uppercase text-[10px] px-1.5 py-0.5 rounded ${
                      activePhoto.progressAnalysis.targetComparison === "Ahead" 
                        ? "bg-emerald-100 text-emerald-800" 
                        : "bg-red-100 text-red-800"
                    }`}>
                      {activePhoto.progressAnalysis.targetComparison === "Ahead" ? (isAmharic ? "ቀድሟል" : "Ahead") : (isAmharic ? "ወደኋላ ቀርቷል" : "Behind")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Box 2: Panel Verification */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4.5 space-y-3">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                  <ClipboardCheck className="text-red-600" size={15} />
                  <span>{isAmharic ? "የፓነል ትክክለኛነት ማረጋገጫ" : "Panel Verification"}</span>
                </h4>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">{isAmharic ? "ከ CAD ጋር ይጣጣማል?" : "CAD Blueprint Match?"}</span>
                    {activePhoto.panelVerification.layoutMatchesApprovedCAD ? (
                      <span className="text-emerald-600 font-bold flex items-center space-x-1">
                        <CheckCircle size={12} />
                        <span>{isAmharic ? "አዎ" : "Yes"}</span>
                      </span>
                    ) : (
                      <span className="text-amber-600 font-bold flex items-center space-x-1">
                        <AlertTriangle size={12} />
                        <span>{isAmharic ? "ተዛብቷል" : "Mismatched"}</span>
                      </span>
                    )}
                  </div>

                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">{isAmharic ? "ትክክለኛ የፓነል አይነቶች?" : "Correct Panel Types?"}</span>
                    <span className="text-slate-800 font-bold">{activePhoto.panelVerification.expectedPanelTypesInstalled ? (isAmharic ? "ትክክል ናቸው" : "Passed") : "Review"}</span>
                  </div>

                  <div className="flex justify-between items-center text-[11px] border-t border-slate-200 pt-1.5">
                    <span className="text-slate-500">{isAmharic ? "የጎደሉ ፓነሎች አሉ?" : "Missing Panels?"}</span>
                    {activePhoto.panelVerification.missingPanelsDetected ? (
                      <span className="text-red-600 font-extrabold">
                        {activePhoto.panelVerification.missingCount} {isAmharic ? "ጎድሏል" : "Missing"}
                      </span>
                    ) : (
                      <span className="text-emerald-600 font-bold">{isAmharic ? "አልጎደለም" : "None detected"}</span>
                    )}
                  </div>

                  <div className="text-[10px] bg-slate-100 p-2 rounded text-slate-500 italic mt-2 border border-slate-200 leading-normal">
                    {activePhoto.panelVerification.inspectorAlertMessage}
                  </div>
                </div>
              </div>

              {/* Box 3: Alignment Assessment */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4.5 space-y-3">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                  <Sliders className="text-red-600" size={15} />
                  <span>{isAmharic ? "የመስመር ልኬት ግምገማ" : "Alignment Assessment"}</span>
                </h4>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">{isAmharic ? "ልኬት ሁኔታ (Alignment):" : "Alignment Plumb Plumb:"}</span>
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                      activePhoto.alignmentAssessment.alignmentStatus === "Pass" 
                        ? "bg-emerald-100 text-emerald-800" 
                        : "bg-amber-100 text-amber-800"
                    }`}>
                      {activePhoto.alignmentAssessment.alignmentStatus === "Pass" ? (isAmharic ? "አልፏል" : "PASS") : (isAmharic ? "መስተካከል አለበት" : "REVIEW REQUIRED")}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">{isAmharic ? "የቁመት መዛባት (Vertical):" : "Vertical Deviation:"}</span>
                    <strong className={`font-mono ${activePhoto.alignmentAssessment.verticalDeviationMm > 3 ? "text-red-600" : "text-slate-700"}`}>
                      {activePhoto.alignmentAssessment.verticalDeviationMm} mm
                    </strong>
                  </div>

                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">{isAmharic ? "የጎንዮሽ መዛባት (Horiz):" : "Horizontal Deviation:"}</span>
                    <strong className="text-slate-700 font-mono">{activePhoto.alignmentAssessment.horizontalDeviationMm} mm</strong>
                  </div>

                  <div className="flex justify-between items-center text-[11px] border-t border-slate-200 pt-1.5">
                    <span className="text-slate-500">{isAmharic ? "አይአይ የእምነት መጠን:" : "Confidence Score:"}</span>
                    <span className="font-extrabold text-slate-800 font-mono">{activePhoto.alignmentAssessment.confidenceScore}%</span>
                  </div>

                  {activePhoto.alignmentAssessment.visibleDefects.length > 0 && (
                    <div className="text-[9px] bg-amber-50 border border-amber-200 p-2 rounded text-amber-800 space-y-0.5">
                      <span className="font-bold">{isAmharic ? "የተለዩ ጉድለቶች:" : "Identified Defects:"}</span>
                      <ul className="list-disc list-inside space-y-0.5 font-medium">
                        {activePhoto.alignmentAssessment.visibleDefects.map((def, i) => (
                          <li key={i}>{def}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Bottom Panel containing: 1. Pre-Pour Checklist, 2. Daily Progress Report, 3. AI recommendations */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2 border-t border-slate-100">
              
              {/* LEFT SUB-GRID: Pre-Pour Checklist & Verification */}
              <div className="space-y-4">
                <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800 space-y-3.5">
                  <div className="border-b border-slate-800 pb-2">
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center space-x-1.5">
                      <ShieldCheck className="text-red-600" size={15} />
                      <span>{isAmharic ? "የኮንክሪት መፍሰስ ቅድመ-ፍተሻ" : "CONCRETE POUR PRE-CHECKLIST"}</span>
                    </h4>
                    <p className="text-[10px] text-slate-400 leading-normal mt-0.5">
                      {isAmharic 
                        ? "ኮንክሪት ከመፍሰሱ በፊት ሁሉም የደህንነት፣ ጥራትና መገጣጠም ፍተሻዎች መጽደቃቸውን ያረጋግጡ።"
                        : "All critical panels, bracing and approvals must be locked before pour authorization is unlocked."}
                    </p>
                  </div>

                  {/* Checklist Elements */}
                  <div className="space-y-2 text-xs">
                    
                    {/* Panel checklist */}
                    <label className="flex items-center space-x-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={activePhoto.readinessChecklist.requiredPanelsInstalled}
                        onChange={() => handleChecklistToggle("requiredPanelsInstalled")}
                        className="rounded border-slate-700 bg-slate-950 text-red-600 focus:ring-0 cursor-pointer h-4 w-4"
                      />
                      <span className={activePhoto.readinessChecklist.requiredPanelsInstalled ? "text-slate-300 font-semibold" : "text-slate-500 font-medium"}>
                        {isAmharic ? "አስፈላጊ የአሉሚኒየም ፓነሎች ተገጥመዋል" : "Required Panels Installed"}
                      </span>
                    </label>

                    {/* Accessories checklist */}
                    <label className="flex items-center space-x-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={activePhoto.readinessChecklist.requiredAccessoriesInstalled}
                        onChange={() => handleChecklistToggle("requiredAccessoriesInstalled")}
                        className="rounded border-slate-700 bg-slate-950 text-red-600 focus:ring-0 cursor-pointer h-4 w-4"
                      />
                      <span className={activePhoto.readinessChecklist.requiredAccessoriesInstalled ? "text-slate-300 font-semibold" : "text-slate-500 font-medium"}>
                        {isAmharic ? "አስፈላጊ መቆለፊያዎች/ፒኖች ተገጥመዋል" : "Required Accessories Installed"}
                      </span>
                    </label>

                    {/* Alignment completed */}
                    <label className="flex items-center space-x-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={activePhoto.readinessChecklist.alignmentInspectionCompleted}
                        onChange={() => handleChecklistToggle("alignmentInspectionCompleted")}
                        className="rounded border-slate-700 bg-slate-950 text-red-600 focus:ring-0 cursor-pointer h-4 w-4"
                      />
                      <span className={activePhoto.readinessChecklist.alignmentInspectionCompleted ? "text-slate-300 font-semibold" : "text-slate-500 font-medium"}>
                        {isAmharic ? "የመስመር ልኬትና ቁመት ፍተሻ አልፏል" : "Alignment Inspection Plumb Verified"}
                      </span>
                    </label>

                    {/* Bracing completed */}
                    <label className="flex items-center space-x-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={activePhoto.readinessChecklist.bracingInspectionCompleted}
                        onChange={() => handleChecklistToggle("bracingInspectionCompleted")}
                        className="rounded border-slate-700 bg-slate-950 text-red-600 focus:ring-0 cursor-pointer h-4 w-4"
                      />
                      <span className={activePhoto.readinessChecklist.bracingInspectionCompleted ? "text-slate-300 font-semibold" : "text-slate-500 font-medium"}>
                        {isAmharic ? "የማጠናከሪያ ድጋፍና ስካፎልዲንግ ተፈትሿል" : "Shoring & Bracing Inspected"}
                      </span>
                    </label>

                    {/* Safety check completed */}
                    <label className="flex items-center space-x-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={activePhoto.readinessChecklist.safetyInspectionCompleted}
                        onChange={() => handleChecklistToggle("safetyInspectionCompleted")}
                        className="rounded border-slate-700 bg-slate-950 text-red-600 focus:ring-0 cursor-pointer h-4 w-4"
                      />
                      <span className={activePhoto.readinessChecklist.safetyInspectionCompleted ? "text-slate-300 font-semibold" : "text-slate-500 font-medium"}>
                        {isAmharic ? "የሳይት ደህንነት (Safety) ተፈትሿል" : "Safety Compliance Inspected"}
                      </span>
                    </label>

                    {/* Quality check completed */}
                    <label className="flex items-center space-x-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={activePhoto.readinessChecklist.qualityInspectionCompleted}
                        onChange={() => handleChecklistToggle("qualityInspectionCompleted")}
                        className="rounded border-slate-700 bg-slate-950 text-red-600 focus:ring-0 cursor-pointer h-4 w-4"
                      />
                      <span className={activePhoto.readinessChecklist.qualityInspectionCompleted ? "text-slate-300 font-semibold" : "text-slate-500 font-medium"}>
                        {isAmharic ? "የመገጣጠም ጥራት ደረጃ ተረጋግጧል" : "Quality Inspection Checklist Met"}
                      </span>
                    </label>

                    {/* Supervisor approval */}
                    <label className="flex items-center space-x-2.5 cursor-pointer border-t border-slate-800 pt-2.5">
                      <input
                        type="checkbox"
                        checked={activePhoto.readinessChecklist.supervisorApproval}
                        onChange={() => handleChecklistToggle("supervisorApproval")}
                        className="rounded border-slate-700 bg-slate-950 text-red-600 focus:ring-0 cursor-pointer h-4 w-4"
                      />
                      <span className={activePhoto.readinessChecklist.supervisorApproval ? "text-slate-200 font-bold" : "text-slate-500 font-medium"}>
                        {isAmharic ? "የሳይት ሱፐርቫይዘር ይሁንታ (Eng. Kassa)" : "Supervisor Official Approval (Eng. Kassa)"}
                      </span>
                    </label>

                    {/* Engineer approval */}
                    <label className="flex items-center space-x-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={activePhoto.readinessChecklist.engineerApproval}
                        onChange={() => handleChecklistToggle("engineerApproval")}
                        className="rounded border-slate-700 bg-slate-950 text-red-600 focus:ring-0 cursor-pointer h-4 w-4"
                      />
                      <span className={activePhoto.readinessChecklist.engineerApproval ? "text-slate-200 font-bold" : "text-slate-500 font-medium"}>
                        {isAmharic ? "የሳይት መሃንዲስ ይሁንታ (Eng. Yoseph)" : "Project Engineer Official Sign-off (Eng. Yoseph)"}
                      </span>
                    </label>

                  </div>

                  {/* Pouring execution trigger */}
                  <div className="pt-3">
                    <button
                      type="button"
                      disabled={concreteReadinessStatus !== "Ready"}
                      onClick={handleAuthorizeConcretePour}
                      className={`w-full py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center space-x-1.5 cursor-pointer shadow-sm ${
                        concreteReadinessStatus === "Ready"
                          ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                          : "bg-slate-800 text-slate-500 cursor-not-allowed"
                      }`}
                    >
                      <CheckCircle size={14} />
                      <span>{isAmharic ? "የኮንክሪት ሙሌት ፍቀድ" : "AUTHORIZE CONCRETE POUR"}</span>
                    </button>
                    {concreteReadinessStatus !== "Ready" && (
                      <p className="text-[9px] text-slate-500 font-mono text-center mt-1.5 italic">
                        * {isAmharic ? "እባክዎን ሁሉንም የፍተሻ መስፈርቶች እና ይሁንታዎች ያጠናቅቁ።" : "Complete all mandatory fields & structural sign-offs to unlock pour access."}
                      </p>
                    )}
                  </div>

                </div>
              </div>

              {/* RIGHT SUB-GRID: Daily Progress Report & AI Recommendations */}
              <div className="space-y-4">
                
                {/* A. Daily Progress Report Card */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3.5">
                  <div className="border-b border-slate-200 pb-2 flex justify-between items-center">
                    <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center space-x-1.5">
                      <FileText className="text-red-600" size={15} />
                      <span>{isAmharic ? "ዕለታዊ የግንባታ ሪፖርት" : "Daily Progress Report"}</span>
                    </h4>
                    <span className="text-[9px] font-mono font-extrabold text-slate-400">AUTOMATICALLY COMPILED</span>
                  </div>

                  <div className="space-y-3 text-xs leading-normal">
                    {/* Planned vs Estimated Actual */}
                    <div className="grid grid-cols-2 gap-3 text-center">
                      <div className="bg-white p-2.5 rounded border border-slate-200 shadow-2xs">
                        <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wider">{isAmharic ? "የታቀደ እድገት" : "Planned Target"}</span>
                        <span className="font-extrabold text-slate-800 font-mono text-base">{reportStats.planned}%</span>
                      </div>
                      <div className="bg-white p-2.5 rounded border border-slate-200 shadow-2xs">
                        <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wider">{isAmharic ? "ወቅታዊ እድገት" : "Est. Actual Progress"}</span>
                        <span className="font-extrabold text-red-600 font-mono text-base">{reportStats.actual}%</span>
                      </div>
                    </div>

                    {/* Stats List */}
                    <div className="space-y-1.5 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-slate-500">{isAmharic ? "ቀሪ ስራዎች (%) :" : "Remaining Work:"}</span>
                        <strong className="text-slate-700 font-mono">{reportStats.remaining}%</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">{isAmharic ? "የሰው ኃይል መስፈርት (ገምጋሚ):" : "Est. Manpower Requirement:"}</span>
                        <strong className="text-slate-700 font-mono">{reportStats.manpower} {isAmharic ? "ሰራተኞች" : "Workers"}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">{isAmharic ? "ሊጠናቀቅ የሚችልበት ቀን :" : "Estimated Completion Date:"}</span>
                        <strong className="text-red-600 font-sans">{reportStats.estCompletionDate}</strong>
                      </div>
                      <div className="flex justify-between items-start border-t border-slate-200 pt-1.5 mt-1.5">
                        <span className="text-slate-500 shrink-0">{isAmharic ? "መዘግየት ትንተና:" : "Variance Analysis:"}</span>
                        <span className="text-slate-700 text-right pl-2 font-medium">{reportStats.delayAnalysis}</span>
                      </div>
                      <div className="flex justify-between items-start">
                        <span className="text-slate-500 shrink-0">{isAmharic ? "የነገው የቅድሚያ ስራ:" : "Suggested Work Target:"}</span>
                        <span className="text-slate-800 font-black text-right pl-2">{reportStats.targetNextDay}</span>
                      </div>
                    </div>

                  </div>
                </div>

                {/* B. AI Recommendations Card */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3.5">
                  <div className="border-b border-slate-200 pb-2">
                    <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center space-x-1.5">
                      <Cpu className="text-red-600" size={15} />
                      <span>{isAmharic ? "የ AI ድልድል ምክረ ሃሳቦች" : "AI Optimizer Decisions"}</span>
                    </h4>
                  </div>

                  <div className="space-y-2.5 text-xs font-medium leading-relaxed">
                    
                    {/* Suggestion item 1 */}
                    <div className="flex items-start space-x-2">
                      <span className="p-1 bg-red-100 rounded text-red-700 shrink-0 mt-0.5 font-bold font-mono text-[9px]">A1</span>
                      <div className="min-w-0">
                        <strong className="text-slate-800 block">{isAmharic ? "የሰው ሃይል ማጠናከር" : "Manpower Rerouting Recommended"}</strong>
                        <span className="text-slate-500 text-[11px]">
                          {isAmharic 
                            ? "በዞን B ላይ ያለውን መዘግየት ለመቅረፍ 3 የውጪ ሰራተኞችን (Steel Fixers) ከዞን A ወደ ዞን B ይዘዋውሩ።"
                            : "Deploy 3 steel fixers from completed Zone A scaffold team to support Zone B panel locking immediately."}
                        </span>
                      </div>
                    </div>

                    {/* Suggestion item 2 */}
                    <div className="flex items-start space-x-2">
                      <span className="p-1 bg-red-100 rounded text-red-700 shrink-0 mt-0.5 font-bold font-mono text-[9px]">A2</span>
                      <div className="min-w-0">
                        <strong className="text-slate-800 block">{isAmharic ? "ትርፍ ሰዓት (Overtime) ድልድል" : "Targeted Overtime Assignment"}</strong>
                        <span className="text-slate-500 text-[11px]">
                          {isAmharic 
                            ? "የነገውን የኮንክሪት ሙሌት ሰዓት ለመጠበቅ ዛሬ ማታ ለፓነል ገጣጣሚዎች 1.5 ሰዓት ትርፍ ሰዓት ይፍቀዱ።"
                            : "Suggested 1.5 hours of supervisor-led Carpenter overtime tonight to close primary slab core framing gaps."}
                        </span>
                      </div>
                    </div>

                    {/* Suggestion item 3 */}
                    <div className="flex items-start space-x-2">
                      <span className="p-1 bg-red-100 rounded text-red-700 shrink-0 mt-0.5 font-bold font-mono text-[9px]">A3</span>
                      <div className="min-w-0">
                        <strong className="text-slate-800 block">{isAmharic ? "አስፈላጊ መከላከያ እርምጃዎች" : "Proactive Risk Mitigations"}</strong>
                        <span className="text-slate-500 text-[11px]">
                          {isAmharic 
                            ? "በእርጥበት የተነሳ የፓነል ዝገት እንዳይከሰት ፎቅ 3 ላይ ያሉትን ፓነሎች በዘይት ይቀቡ።"
                            : "Apply joint seal oil coat to salvaged Floor 3 deck panels before transporting them to the active Floor 4 zone."}
                        </span>
                      </div>
                    </div>

                    {/* Professional warning text */}
                    <p className="text-[9px] text-slate-400 italic leading-normal border-t border-slate-200 pt-2 font-mono">
                      * DISCLAIMER: RECOMMENDED ACTIONS GENERATED BY COMPUTER VISION CORE. FINAL DISCRETION RESTS ENTIRELY WITH THE ENGINEER OF RECORD.
                    </p>

                  </div>
                </div>

              </div>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
