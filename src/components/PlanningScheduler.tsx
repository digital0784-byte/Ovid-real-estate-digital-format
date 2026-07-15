import React, { useState, useMemo } from "react";
import { 
  Calendar, 
  Layers, 
  Clock, 
  TrendingUp, 
  Sliders, 
  CheckCircle, 
  AlertTriangle, 
  Sparkles,
  Info,
  Upload,
  Plus,
  Trash2,
  UserCheck,
  CheckSquare,
  Camera,
  FileText,
  Layout,
  FileCode,
  Percent,
  Users,
  TrendingDown,
  Settings,
  ShieldCheck,
  Eye,
  ChevronRight,
  ChevronDown,
  Award,
  Check,
  Building2,
  FileImage,
  UserRound,
  FileCheck2,
  HelpCircle
} from "lucide-react";
import { ProjectZone, ConstructionScheduleItem, UserRole, DrawingItem } from "../types";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  LineChart, 
  Line, 
  CartesianGrid, 
  PieChart, 
  Pie, 
  Cell 
} from "recharts";

interface PlanningSchedulerProps {
  zones: ProjectZone[];
  onUpdateZone: (zone: ProjectZone) => void;
  onAddZone: (zone: ProjectZone) => void;
  isAmharic: boolean;
  t: (key: string) => string;
  currentUserRole: UserRole;
}

export const PlanningScheduler: React.FC<PlanningSchedulerProps> = ({
  zones,
  onUpdateZone,
  onAddZone,
  isAmharic,
  t,
  currentUserRole
}) => {
  // Sub-tabs
  const [activeSubTab, setActiveSubTab] = useState<"dashboard" | "teamLeader" | "gangChief">("dashboard");

  // Local state for Drawing Management
  const [drawings, setDrawings] = useState<DrawingItem[]>([
    { id: "DWG-001", name: "OVID_Heights_B1_FL04_Formwork.dwg", type: "DWG", project: "OVID Bole Heights", building: "OVID Bole Heights", block: "Block A", floor: 4, zone: "Zone A", uploadedAt: "2026-06-24 10:15", uploadedBy: "Eng. Yoseph", fileSize: "14.2 MB" },
    { id: "DWG-002", name: "OVID_Heights_B1_FL04_ZoneB_Slab.pdf", type: "PDF", project: "OVID Bole Heights", building: "OVID Bole Heights", block: "Block A", floor: 4, zone: "Zone B", uploadedAt: "2026-06-25 14:30", uploadedBy: "Eng. Yoseph", fileSize: "4.8 MB" },
    { id: "DWG-003", name: "OVID_Heights_Structural_BIM.ifc", type: "IFC", project: "OVID Bole Heights", building: "OVID Bole Heights", block: "Block A", floor: 3, zone: "Zone A", uploadedAt: "2026-06-15 09:00", uploadedBy: "Eng. Yoseph", fileSize: "112.5 MB" }
  ]);

  // Drawing Form Inputs
  const [newDrawName, setNewDrawName] = useState("");
  const [newDrawType, setNewDrawType] = useState<"DWG" | "PDF" | "IFC" | "PNG" | "JPG">("DWG");
  const [newDrawBldg, setNewDrawBldg] = useState("OVID Bole Heights");
  const [newDrawBlock, setNewDrawBlock] = useState("Block A");
  const [newDrawFloor, setNewDrawFloor] = useState(4);
  const [newDrawZone, setNewDrawZone] = useState("Zone A");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // New Zone Planning Inputs
  const [zoneIdInput, setZoneIdInput] = useState("");
  const [zoneBldgInput, setZoneBldgInput] = useState("OVID Bole Heights");
  const [zoneFloorInput, setZoneFloorInput] = useState(4);
  const [zoneNameInput, setZoneNameInput] = useState("Zone B");
  const [zoneAreaInput, setZoneAreaInput] = useState(150);
  const [targetDaysInput, setTargetDaysInput] = useState(6);
  const [assignedChiefInput, setAssignedChiefInput] = useState("GC-01");

  // Panel bills of materials inputs
  const [wallQty, setWallQty] = useState(120);
  const [colQty, setColQty] = useState(60);
  const [beamQty, setBeamQty] = useState(40);
  const [slabQty, setSlabQty] = useState(160);
  const [cornerQty, setCornerQty] = useState(24);
  const [extQty, setExtQty] = useState(36);
  const [intQty, setIntQty] = useState(72);
  const [accQty, setAccQty] = useState(350);
  const [linkedDrawId, setLinkedDrawId] = useState("DWG-001");

  // Selected Zone for planning review or edit
  const [selectedZoneId, setSelectedZoneId] = useState<string>(zones[0]?.id || "");

  // Gang Chief inputs for site updates
  const [gcInstalledUpdate, setGcInstalledUpdate] = useState(0);
  const [gcRemovedUpdate, setGcRemovedUpdate] = useState(0);
  const [gcManpowerUpdate, setGcManpowerUpdate] = useState(8);
  const [gcDailyNotes, setGcDailyNotes] = useState("");
  const [gcPhotos, setGcPhotos] = useState<string[]>([]);
  const [mockPhotoName, setMockPhotoName] = useState("formwork_joint_verification.jpg");

  // Daily Panel Dimension Log Inputs
  const [pLogType, setPLogType] = useState("Wall Panel");
  const [pLogLength, setPLogLength] = useState<number>(2.7);
  const [pLogWidth, setPLogWidth] = useState<number>(0.6);
  const [pLogQty, setPLogQty] = useState<number>(10);
  const [pLogNotes, setPLogNotes] = useState("");
  const [tempPanelLogs, setTempPanelLogs] = useState<{
    panelType: string;
    length: number;
    width: number;
    quantity: number;
    calculatedArea: number;
    notes: string;
  }[]>([]);

  // Auto-schedule Generator Inputs
  const [startDateInput, setStartDateInput] = useState("2026-07-05");
  const [schedFloorsInput, setSchedFloorsInput] = useState(15);
  const [schedZonesInput, setSchedZonesInput] = useState(3);
  const [schedTargetDays, setSchedTargetDays] = useState(4);
  const [generatedTimeline, setGeneratedTimeline] = useState<ConstructionScheduleItem[]>([]);

  // Extends a ProjectZone with drawing-based quantities & fields
  const extendedZones = useMemo(() => {
    return zones.map(z => {
      const isA = z.zone.toLowerCase().includes("a");
      const isB = z.zone.toLowerCase().includes("b");
      
      const area = z.area || (isA ? 180 : isB ? 150 : 120);
      const wallPanels = z.wallPanels || (isA ? 140 : isB ? 110 : 90);
      const columnPanels = z.columnPanels || (isA ? 60 : isB ? 50 : 40);
      const beamPanels = z.beamPanels || (isA ? 45 : isB ? 35 : 30);
      const slabPanels = z.slabPanels || (isA ? 180 : isB ? 140 : 110);
      const cornerPanels = z.cornerPanels || (isA ? 32 : isB ? 26 : 22);
      const externalPanels = z.externalPanels || (isA ? 48 : isB ? 38 : 32);
      const internalPanels = z.internalPanels || (isA ? 84 : isB ? 68 : 56);
      const accessories = z.accessories || (isA ? 450 : isB ? 380 : 300);

      const totalRequired = wallPanels + columnPanels + beamPanels + slabPanels + cornerPanels + externalPanels + internalPanels;
      
      const installedPanels = z.installedPanels !== undefined 
        ? z.installedPanels 
        : Math.round(totalRequired * (z.completionPercentage / 100));

      const removedPanels = z.removedPanels !== undefined 
        ? z.removedPanels 
        : (z.status === "Completed" ? totalRequired : 0);

      const manpowerUsed = z.manpowerUsed || (z.status === "In Progress" ? 8 : z.status === "Completed" ? 10 : 0);
      const assignedGangChiefId = z.assignedGangChiefId || "GC-01";
      const assignedGangChiefName = z.assignedGangChiefName || "Fikru Tolossa";
      const progressPhotos = z.progressPhotos || (z.status === "Completed" ? ["slab_ready_concrete.jpg", "joint_secure.jpg"] : z.status === "In Progress" ? ["scaffold_alignment_check.jpg"] : []);
      
      const dailyReportSubmitted = z.dailyReportSubmitted || (z.status === "Completed");
      const dailyReportNotes = z.dailyReportNotes || (z.status === "Completed" ? "Formwork panels aligned and secured with locking pins. Handover approved." : "");
      const approvedByTeamLeader = z.approvedByTeamLeader || (z.status === "Completed");
      const approvedDate = z.approvedDate || (z.status === "Completed" ? "2026-06-30" : undefined);
      const drawingId = z.drawingId || "DWG-001";
      const drawingName = z.drawingName || "OVID_Heights_B1_FL04_Formwork.dwg";

      return {
        ...z,
        area,
        wallPanels,
        columnPanels,
        beamPanels,
        slabPanels,
        cornerPanels,
        externalPanels,
        internalPanels,
        accessories,
        assignedGangChiefId,
        assignedGangChiefName,
        installedPanels,
        removedPanels,
        progressPhotos,
        manpowerUsed,
        dailyReportSubmitted,
        dailyReportNotes,
        approvedByTeamLeader,
        approvedDate,
        drawingId,
        drawingName,
        dailyPanelLogs: z.dailyPanelLogs || []
      };
    });
  }, [zones]);

  const selectedZone = useMemo(() => {
    return extendedZones.find(z => z.id === selectedZoneId) || extendedZones[0];
  }, [extendedZones, selectedZoneId]);

  // Handle Drawing Upload Simulation
  const handleUploadDrawing = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDrawName) return;

    setUploadProgress(10);
    const interval = setInterval(() => {
      setUploadProgress((p) => {
        if (p === null) return null;
        if (p >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            const newDrawing: DrawingItem = {
              id: `DWG-${Date.now().toString().slice(-3)}`,
              name: newDrawName,
              type: newDrawType,
              project: "OVID Bole Heights",
              building: newDrawBldg,
              block: newDrawBlock,
              floor: newDrawFloor,
              zone: newDrawZone,
              uploadedAt: new Date().toISOString().replace("T", " ").slice(0, 16),
              uploadedBy: "Eng. Yoseph",
              fileSize: `${(Math.random() * 15 + 2).toFixed(1)} MB`
            };
            setDrawings(prev => [newDrawing, ...prev]);
            setUploadProgress(null);
            setNewDrawName("");
            
            // Add audit log trigger inside the parent App if logAction is in standard pipeline
            // We can prompt a notification/toast in UI
          }, 300);
          return 100;
        }
        return p + 30;
      });
    }, 150);
  };

  // Handle Planning New Zone
  const handleCreateZone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!zoneIdInput) return;

    const newZone: ProjectZone = {
      id: zoneIdInput,
      building: zoneBldgInput,
      block: "Block A",
      tower: "Tower 1",
      floor: Number(zoneFloorInput),
      zone: zoneNameInput,
      wallStatus: 0,
      columnStatus: 0,
      beamStatus: 0,
      slabStatus: 0,
      stairStatus: 0,
      liftCoreStatus: 0,
      startDate: new Date().toISOString().split("T")[0],
      targetDays: Number(targetDaysInput),
      completionPercentage: 0,
      status: "Not Started",

      // Advanced Drawing-Based Fields
      area: Number(zoneAreaInput),
      wallPanels: Number(wallQty),
      columnPanels: Number(colQty),
      beamPanels: Number(beamQty),
      slabPanels: Number(slabQty),
      cornerPanels: Number(cornerQty),
      externalPanels: Number(extQty),
      internalPanels: Number(intQty),
      accessories: Number(accQty),
      assignedGangChiefId: assignedChiefInput,
      assignedGangChiefName: assignedChiefInput === "GC-01" ? "Fikru Tolossa" : "Mulugeta Tesfaye",
      installedPanels: 0,
      removedPanels: 0,
      progressPhotos: [],
      manpowerUsed: 0,
      dailyReportSubmitted: false,
      approvedByTeamLeader: false,
      drawingId: linkedDrawId,
      drawingName: drawings.find(d => d.id === linkedDrawId)?.name || "Default Drawing"
    };

    onAddZone(newZone);
    setSelectedZoneId(newZone.id);
    
    // Clear inputs
    setZoneIdInput("");
  };

  // Gang Chief Site Update handler
  const handleGangChiefSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedZone) return;

    // Convert temp panel logs into formal logs
    const newLogsFromTemp = tempPanelLogs.map((log, idx) => ({
      id: `LOG-P-${Date.now()}-${idx}`,
      loggedBy: selectedZone.assignedGangChiefName || "Fikru Tolossa",
      role: "Gang Chief",
      date: new Date().toISOString().split("T")[0],
      panelType: log.panelType,
      length: log.length,
      width: log.width,
      quantity: log.quantity,
      calculatedArea: log.calculatedArea,
      notes: log.notes
    }));

    const mergedLogs = [...(selectedZone.dailyPanelLogs || []), ...newLogsFromTemp];

    // Compute total installed panels count based on manual input or sum of logs
    const sumQty = tempPanelLogs.reduce((sum, item) => sum + item.quantity, 0);
    const finalInstalledCount = gcInstalledUpdate > 0 ? gcInstalledUpdate : ((selectedZone.installedPanels || 0) + sumQty);

    const totalRequired = selectedZone.wallPanels + selectedZone.columnPanels + selectedZone.beamPanels + selectedZone.slabPanels + selectedZone.cornerPanels + selectedZone.externalPanels + selectedZone.internalPanels;
    
    // Calculate new completion percentage based on installed panels out of total required
    const calculatedPercentage = totalRequired > 0 
      ? Math.round((finalInstalledCount / totalRequired) * 100) 
      : 0;

    let newStatus: "Not Started" | "In Progress" | "Completed" | "Delayed" = "In Progress";
    if (calculatedPercentage >= 100) {
      newStatus = "Completed";
    } else if (calculatedPercentage > 0) {
      newStatus = selectedZone.status === "Delayed" ? "Delayed" : "In Progress";
    } else {
      newStatus = "Not Started";
    }

    const updatedZone: ProjectZone = {
      ...selectedZone,
      installedPanels: finalInstalledCount,
      removedPanels: gcRemovedUpdate,
      manpowerUsed: gcManpowerUpdate,
      dailyReportNotes: gcDailyNotes,
      progressPhotos: [...selectedZone.progressPhotos, ...gcPhotos],
      completionPercentage: calculatedPercentage,
      status: newStatus,
      dailyReportSubmitted: true,
      wallStatus: calculatedPercentage,
      columnStatus: calculatedPercentage,
      beamStatus: calculatedPercentage,
      slabStatus: calculatedPercentage,
      stairStatus: calculatedPercentage,
      liftCoreStatus: calculatedPercentage,
      dailyPanelLogs: mergedLogs
    };

    onUpdateZone(updatedZone);
    alert(isAmharic 
      ? `የእለት ግንባታ ሪፖርት በተሳካ ሁኔታ ቀርቧል! ${newLogsFromTemp.length} የፓነል ዝርዝሮች ተመዝግበዋል።` 
      : `Daily site progress report submitted successfully! ${newLogsFromTemp.length} panel dimension log(s) recorded.`
    );
    setGcDailyNotes("");
    setGcPhotos([]);
    setTempPanelLogs([]);
  };

  // Team Leader Approve Zone
  const handleApproveZone = (zoneId: string) => {
    const targetZ = extendedZones.find(z => z.id === zoneId);
    if (!targetZ) return;

    const updated: ProjectZone = {
      ...targetZ,
      approvedByTeamLeader: true,
      approvedDate: new Date().toISOString().split("T")[0],
      status: "Completed",
      completionPercentage: 100
    };

    onUpdateZone(updated);
  };

  // Generate Construction Timeline
  const handleTimelineGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    const items: ConstructionScheduleItem[] = [];
    let currentStartDate = new Date(startDateInput);
    let sequence = 1;

    for (let f = 1; f <= schedFloorsInput; f++) {
      for (let z = 0; z < schedZonesInput; z++) {
        const zoneLetter = String.fromCharCode(65 + z);
        const zoneId = `B1-F${String(f).padStart(2, "0")}-Z${zoneLetter}`;
        
        const targetDays = Number(schedTargetDays);
        const expectedFinish = new Date(currentStartDate);
        expectedFinish.setDate(expectedFinish.getDate() + targetDays);

        items.push({
          zoneId,
          building: "OVID Bole Heights",
          floor: f,
          zoneName: `Zone ${zoneLetter}`,
          sequenceOrder: sequence++,
          startDate: currentStartDate.toISOString().split("T")[0],
          targetDays,
          expectedFinishDate: expectedFinish.toISOString().split("T")[0],
          remainingDays: targetDays,
          delayedDays: 0,
          status: "Not Started"
        });

        currentStartDate = new Date(expectedFinish);
      }
    }
    setGeneratedTimeline(items);
  };

  // Dashboard Stats Calculations
  const dashboardStats = useMemo(() => {
    const totalZonesCount = extendedZones.length;
    const completedZonesCount = extendedZones.filter(z => z.status === "Completed").length;
    const activeZonesCount = extendedZones.filter(z => z.status === "In Progress").length;
    const delayedZonesCount = extendedZones.filter(z => z.status === "Delayed" || (z.status === "In Progress" && z.actualDays && z.actualDays > z.targetDays)).length;
    
    // Unique Floors
    const uniqueFloors = Array.from(new Set(extendedZones.map(z => z.floor))).length;

    // Total Panel counts
    let totalRequiredPanels = 0;
    let totalInstalledPanels = 0;
    let totalRemovedPanels = 0;
    let totalDailyAreaInstalled = 0;

    extendedZones.forEach(z => {
      const req = z.wallPanels + z.columnPanels + z.beamPanels + z.slabPanels + z.cornerPanels + z.externalPanels + z.internalPanels;
      totalRequiredPanels += req;
      totalInstalledPanels += z.installedPanels;
      totalRemovedPanels += z.removedPanels;
      if (z.dailyPanelLogs) {
        z.dailyPanelLogs.forEach(log => {
          totalDailyAreaInstalled += log.calculatedArea;
        });
      }
    });

    const remainingPanelsCount = Math.max(0, totalRequiredPanels - totalInstalledPanels);

    return {
      totalFloors: uniqueFloors || 4,
      totalZones: totalZonesCount,
      completedZones: completedZonesCount,
      activeZones: activeZonesCount,
      delayedZones: delayedZonesCount,
      totalRequiredPanels,
      totalInstalledPanels,
      totalRemovedPanels,
      remainingPanels: remainingPanelsCount,
      totalDailyAreaInstalled
    };
  }, [extendedZones]);

  // Chart Data: Ratios across zones
  const chartZoneProgressData = useMemo(() => {
    return extendedZones.slice(0, 7).map(z => {
      const req = z.wallPanels + z.columnPanels + z.beamPanels + z.slabPanels + z.cornerPanels + z.externalPanels + z.internalPanels;
      return {
        name: `${z.zone} (FL${z.floor})`,
        [isAmharic ? "አስፈላጊ" : "Required"]: req,
        [isAmharic ? "የተገጠመ" : "Installed"]: z.installedPanels,
        [isAmharic ? "የተነሳ" : "Stripped"]: z.removedPanels
      };
    });
  }, [extendedZones, isAmharic]);

  // Pie chart for Panel Types inside Selected Zone
  const selectedZonePanelDistribution = useMemo(() => {
    if (!selectedZone) return [];
    return [
      { name: isAmharic ? "ግድግዳ" : "Wall Panels", value: selectedZone.wallPanels, color: "#1e293b" },
      { name: isAmharic ? "ምሰሶ" : "Column Panels", value: selectedZone.columnPanels, color: "#ef4444" },
      { name: isAmharic ? "ማገር" : "Beam Panels", value: selectedZone.beamPanels, color: "#3b82f6" },
      { name: isAmharic ? "ወለል" : "Slab Panels", value: selectedZone.slabPanels, color: "#10b981" },
      { name: isAmharic ? "ማዕዘን" : "Corner Panels", value: selectedZone.cornerPanels, color: "#8b5cf6" },
      { name: isAmharic ? "ውጫዊ" : "External Panels", value: selectedZone.externalPanels, color: "#f59e0b" },
      { name: isAmharic ? "ውስጣዊ" : "Internal Panels", value: selectedZone.internalPanels, color: "#ec4899" }
    ];
  }, [selectedZone, isAmharic]);

  // Smart Heuristic Predictions
  const smartPlanningForecasts = useMemo(() => {
    if (!selectedZone) return null;
    const req = selectedZone.wallPanels + selectedZone.columnPanels + selectedZone.beamPanels + selectedZone.slabPanels + selectedZone.cornerPanels + selectedZone.externalPanels + selectedZone.internalPanels;
    
    // Required manpower per zone (1 worker per 15 m² area or approx 1 worker per 25 panels)
    const requiredManpower = Math.max(4, Math.ceil(selectedZone.area / 18));
    
    // Estimated completion time based on current crew size or estimated crew (if manpower = 0, default to requiredManpower)
    const activeCrewSize = selectedZone.manpowerUsed || requiredManpower;
    const installRatePerWorkerDay = 15; // standard production speed
    const estimatedDays = Math.ceil(req / (activeCrewSize * installRatePerWorkerDay));

    // Gang productivity
    const gangProductivity = selectedZone.installedPanels > 0 && activeCrewSize > 0
      ? ((selectedZone.installedPanels * 0.45) / (selectedZone.actualDays || selectedZone.targetDays || 1)).toFixed(1)
      : "18.5"; // average default gang sq.m/day

    const workerProductivity = activeCrewSize > 0 
      ? (parseFloat(gangProductivity) / activeCrewSize).toFixed(2)
      : "2.3"; // m²/worker-day

    // Projected project completion date (Total remaining zones * target cycle duration / average active crews)
    const activeCrewsCount = 2; 
    const remainingZonesCount = extendedZones.filter(z => z.status !== "Completed").length;
    const daysToFinishAll = Math.ceil((remainingZonesCount * 4) / activeCrewsCount);
    const today = new Date();
    today.setDate(today.getDate() + daysToFinishAll);
    const expectedProjectFinish = today.toISOString().split("T")[0];

    // Delay risk alert trigger
    const delayRisk = selectedZone.status === "Delayed" || (selectedZone.status === "In Progress" && selectedZone.completionPercentage < 50)
      ? "HIGH" 
      : selectedZone.status === "In Progress" && selectedZone.completionPercentage < 80 
        ? "MEDIUM" 
        : "LOW";

    return {
      requiredManpower,
      estimatedDays,
      gangProductivity, // sq.m per day
      workerProductivity, // sq.m per worker-day
      expectedProjectFinish,
      delayRisk
    };
  }, [selectedZone, extendedZones]);

  return (
    <div className="space-y-6 font-sans">
      
      {/* Upper Module Navigation & Session Info */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center space-x-2">
            <span className="p-1 bg-red-600 rounded text-xs font-black uppercase tracking-wider text-white">
              {isAmharic ? "አሉሚኒየም ፎርምወርቅ" : "ALU-FORMWORK"}
            </span>
            <span className="text-xs text-red-500 font-extrabold tracking-widest uppercase">
              {isAmharic ? "የፕላንና የሥራ መከታተያ ሞጁል" : "Drawing-Based Planning Module"}
            </span>
          </div>
          <h2 className="text-2xl font-black tracking-tight">
            {isAmharic ? "የንድፍ-መሰረት ግንባታ ማቀጃ" : "Formwork & Drawing Management"}
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl">
            {isAmharic 
              ? "የግንባታ ንድፎችን (Drawings) ይጫኑ፣ የተመደበውን ዞን ይምረጡ፣ የምርት ፎርምወርቅ ፓነል ዝርዝር ያቀዱ እና በእለት ተእለት የግንባታ ጉዞ ላይ የሚታዩ ስጋቶችን ይተንትኑ።"
              : "Upload engineering schematics, define granular panel bills of materials per zone, assign Crews, log physical actuals, and access AI delay risk mitigation forecasts."}
          </p>
        </div>
        
        {/* Quick Tabs switcher */}
        <div className="flex flex-wrap gap-2 shrink-0 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
          <button 
            onClick={() => setActiveSubTab("dashboard")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeSubTab === "dashboard" ? "bg-red-600 text-white shadow-xs" : "text-slate-300 hover:text-white"
            }`}
          >
            <TrendingUp size={14} />
            <span>{isAmharic ? "ማጠቃለያ" : "Dashboard"}</span>
          </button>
          
          <button 
            onClick={() => setActiveSubTab("teamLeader")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeSubTab === "teamLeader" ? "bg-red-600 text-white shadow-xs" : "text-slate-300 hover:text-white"
            }`}
          >
            <Award size={14} />
            <span>{isAmharic ? "የቡድን መሪ" : "Team Leader Workspace"}</span>
          </button>

          <button 
            onClick={() => setActiveSubTab("gangChief")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeSubTab === "gangChief" ? "bg-red-600 text-white shadow-xs" : "text-slate-300 hover:text-white"
            }`}
          >
            <Users size={14} />
            <span>{isAmharic ? "ጋንግ ቺፍ" : "Gang Chief Workbench"}</span>
          </button>
        </div>
      </div>

      {/* DASHBOARD TAB */}
      {activeSubTab === "dashboard" && (
        <div className="space-y-6">
          
          {/* Quick Bento Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-100 flex items-center space-x-3.5 shadow-xs">
              <span className="p-3 bg-slate-50 text-slate-800 rounded-lg shrink-0">
                <Building2 size={20} />
              </span>
              <div>
                <span className="text-[10px] block uppercase text-slate-400 font-extrabold tracking-wider">{isAmharic ? "ጠቅላላ ፎቆች" : "Total Floors"}</span>
                <span className="text-xl font-black text-slate-800">{dashboardStats.totalFloors}</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-100 flex items-center space-x-3.5 shadow-xs">
              <span className="p-3 bg-red-50 text-red-600 rounded-lg shrink-0">
                <Layers size={20} />
              </span>
              <div>
                <span className="text-[10px] block uppercase text-slate-400 font-extrabold tracking-wider">{isAmharic ? "ጠቅላላ ዞኖች" : "Planned Zones"}</span>
                <span className="text-xl font-black text-slate-800">{dashboardStats.totalZones}</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-100 flex items-center space-x-3.5 shadow-xs">
              <span className="p-3 bg-emerald-50 text-emerald-600 rounded-lg shrink-0">
                <CheckCircle size={20} />
              </span>
              <div>
                <span className="text-[10px] block uppercase text-slate-400 font-extrabold tracking-wider">{isAmharic ? "ያለቁ ዞኖች" : "Completed"}</span>
                <span className="text-xl font-black text-slate-800">{dashboardStats.completedZones}</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-100 flex items-center space-x-3.5 shadow-xs">
              <span className="p-3 bg-blue-50 text-blue-600 rounded-lg shrink-0">
                <Clock size={20} />
              </span>
              <div>
                <span className="text-[10px] block uppercase text-slate-400 font-extrabold tracking-wider">{isAmharic ? "በሂደት ላይ" : "Active Zones"}</span>
                <span className="text-xl font-black text-slate-800">{dashboardStats.activeZones}</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-100 flex items-center space-x-3.5 shadow-xs col-span-2 lg:col-span-1">
              <span className="p-3 bg-amber-50 text-amber-600 rounded-lg shrink-0">
                <AlertTriangle size={20} />
              </span>
              <div>
                <span className="text-[10px] block uppercase text-slate-400 font-extrabold tracking-wider">{isAmharic ? "የዘገዩ ዞኖች" : "Delayed Zones"}</span>
                <span className="text-xl font-black text-red-600">{dashboardStats.delayedZones}</span>
              </div>
            </div>
          </div>

          {/* Formwork Material Status Bento */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
              <div>
                <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider block mb-1">
                  {isAmharic ? "ጠቅላላ የፓነል ፍላጎት ቁጥጥር" : "Aluminum Panel Bill of Quantities"}
                </span>
                <h3 className="text-xl font-bold">{isAmharic ? "የአሉሚኒየም ፓነል ማጠቃለያ" : "Total Active Inventory"}</h3>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  {isAmharic 
                    ? "ከግንባታ ንድፍ የተገኙ ጠቅላላ የአሉሚኒየም ፎርምወርክ ፓነሎች እና ማያያዣዎች ቁጥር ማጠቃለያ።"
                    : "Live aggregate of aluminum deck, wall, and column panels pulled directly from engineering CAD files."}
                </p>
              </div>

              <div className="space-y-3 pt-6 border-t border-slate-800 mt-6 font-mono text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-sans">{isAmharic ? "የሚፈለግ ጠቅላላ ፓነል:" : "Total Required Panels:"}</span>
                  <span className="font-extrabold text-white text-sm">{dashboardStats.totalRequiredPanels}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-sans">{isAmharic ? "የተገጠመ ጠቅላላ ፓነል:" : "Total Installed Panels:"}</span>
                  <span className="font-extrabold text-emerald-400 text-sm">{dashboardStats.totalInstalledPanels}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-sans">{isAmharic ? "የተነሳ/የተstripped ፓነል:" : "Total Stripped (Removed):"}</span>
                  <span className="font-extrabold text-blue-400 text-sm">{dashboardStats.totalRemovedPanels}</span>
                </div>
                <div className="flex justify-between items-center border-t border-slate-800/80 pt-2.5">
                  <span className="text-slate-400 font-sans">{isAmharic ? "የቀረው ፓነል ገጠማ:" : "Remaining to Install:"}</span>
                  <span className="font-extrabold text-rose-400 text-sm">{dashboardStats.remainingPanels}</span>
                </div>
                <div className="flex justify-between items-center border-t border-slate-800/80 pt-2.5">
                  <span className="text-slate-400 font-sans">{isAmharic ? "ዛሬ የተገጠመ ጠቅላላ ስፋት:" : "Total Daily Installed Area:"}</span>
                  <span className="font-extrabold text-emerald-400 text-sm">{dashboardStats.totalDailyAreaInstalled.toFixed(2)} m²</span>
                </div>
              </div>

              <div className="mt-4 bg-slate-800/60 p-2.5 rounded-xl border border-slate-800/50 text-[10px] space-y-1.5 font-sans">
                <div className="flex items-center justify-between font-semibold text-slate-300">
                  <span>{isAmharic ? "ለሴክሽን ኃላፊ ሪፖርት:" : "Report to Section Head:"}</span>
                  <span className="text-emerald-400 flex items-center space-x-1 font-bold">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></span>
                    <span>{isAmharic ? "በቀጥታ ተልኳል" : "Auto-Sent"}</span>
                  </span>
                </div>
                <div className="flex items-center justify-between font-semibold text-slate-300">
                  <span>{isAmharic ? "ለዋና ጽ/ቤት ሪፖርት:" : "Report to Head Office:"}</span>
                  <span className="text-blue-400 flex items-center space-x-1 font-bold">
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-ping"></span>
                    <span>{isAmharic ? "በቀጥታ ተልኳል" : "Auto-Sent"}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Recharts Bar Chart representing panels ratios across lower zones */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 md:col-span-2 shadow-xs">
              <h3 className="text-sm font-extrabold text-slate-800 mb-4 uppercase tracking-wider">
                {isAmharic ? "የፓነል ዝርዝር በየዞኑ (እቅድ vs ተገጠመ)" : "Formwork Ratios per Zone (Required vs Installed)"}
              </h3>
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartZoneProgressData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Bar dataKey={isAmharic ? "አስፈላጊ" : "Required"} fill="#1e293b" radius={[4, 4, 0, 0]} />
                    <Bar dataKey={isAmharic ? "የተገጠመ" : "Installed"} fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey={isAmharic ? "የተነሳ" : "Stripped"} fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Smart Planning Engine & delay risk alerts */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div>
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-widest flex items-center space-x-2">
                  <Sparkles className="text-red-500" size={16} />
                  <span>{isAmharic ? "አይአይ ስማርት ግንባታ ማቀጃ ሞተር" : "AI Smart Production Planning Engine"}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {isAmharic ? "የሰው ኃይል ክፍፍልን ለማመቻቸትና መዘግየቶችን ለመተንበይ በየእለቱ የሚሰላ ስማርት ማጠቃለያ።" : "Predictive scheduler utilizing real-time stripping speeds, scaffolding loads, and structural cycle actuals."}
                </p>
              </div>
              <span className="text-[10px] font-mono bg-slate-900 text-emerald-400 px-2 py-1 rounded font-bold uppercase">
                ENGINE ACTIVE
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              
              {/* Delay risk alert board */}
              <div className="space-y-3">
                <span className="text-[10px] block uppercase text-slate-400 font-extrabold tracking-wider">
                  {isAmharic ? "የመዘግየት ስጋት ማስጠንቀቂያ" : "Delay Risk Alerts & Warnings"}
                </span>

                {extendedZones.some(z => z.status === "Delayed") ? (
                  <div className="bg-red-50 border border-red-100 p-4 rounded-xl space-y-2.5">
                    <div className="flex items-center space-x-2 text-red-700">
                      <AlertTriangle size={18} className="shrink-0" />
                      <span className="text-xs font-bold uppercase tracking-wider">{isAmharic ? "ከፍተኛ ስጋት ተገኝቷል" : "High Delay Risk Identified"}</span>
                    </div>
                    <p className="text-xs text-red-600 leading-relaxed font-medium">
                      {isAmharic 
                        ? "ዞን B1-F04-ZB የአሉሚኒየም ፎርምወርቅ ማሰሪያ እጥረት ስላለበት ከተቀመጠው እቅድ በ2 ቀናት ዘግይቷል። 4 የሳይት ሰራተኞችን ከፎቅ 3 እንዲያግዙ ይመከራል።"
                        : "Zone B1-F04-ZB has exceeded its 6-day cycle window due to corner prop alignment adjustments. Projecting a 2-day sequence lag."}
                    </p>
                    <div className="text-[10px] font-mono text-red-500 font-bold bg-white p-2 rounded border border-red-100">
                      Recommendation: Shift 3 Carpenters from Completed Floor 3 immediately.
                    </div>
                  </div>
                ) : (
                  <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-center space-x-3 text-emerald-800">
                    <CheckCircle size={20} className="text-emerald-500 shrink-0" />
                    <div>
                      <span className="text-xs font-bold block">{isAmharic ? "ሁሉም ዞኖች በጥሩ ሁኔታ ላይ ናቸው" : "All Sequences On Track"}</span>
                      <p className="text-[11px] text-emerald-600 mt-0.5">{isAmharic ? "ምንም ዓይነት መዘግየት አልተመዘገበም።" : "No active cycle delays detected."}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Calculations cards */}
              <div className="space-y-4 bg-slate-50/50 p-4 rounded-xl border border-slate-100 md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase text-slate-400 font-extrabold tracking-wider block">{isAmharic ? "የታቀደ አጠቃላይ የፕሮጀክት ማጠናቀቂያ ቀን" : "Projected Structural Completion"}</span>
                  <span className="text-base font-black text-slate-800 flex items-center space-x-1.5 font-mono">
                    <Calendar size={15} className="text-red-500" />
                    <span>{smartPlanningForecasts?.expectedProjectFinish || "2026-07-28"}</span>
                  </span>
                  <p className="text-[10px] text-slate-500">{isAmharic ? "በአሁኑ የግንባታ ፍጥነት መሰረት የተሰላ" : "Based on active 3-day assembly cycle pace."}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] uppercase text-slate-400 font-extrabold tracking-wider block">{isAmharic ? "አጠቃላይ የፎርማን ቡድን ምርታማነት" : "Foreman Crew Productivity"}</span>
                  <span className="text-base font-black text-slate-800 flex items-center space-x-1.5 font-mono">
                    <TrendingUp size={15} className="text-emerald-500" />
                    <span>18.5 m²/day</span>
                  </span>
                  <p className="text-[10px] text-slate-500">{isAmharic ? "በእያንዳንዱ ቡድን በቀን የሚገጠም የቦርድ ስፋት" : "Average square meters laid per shifting crew daily."}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] uppercase text-slate-400 font-extrabold tracking-wider block">{isAmharic ? "የአንድ ሰራተኛ እለታዊ ምርታማነት" : "Individual Worker Productivity"}</span>
                  <span className="text-base font-black text-slate-800 flex items-center space-x-1.5 font-mono">
                    <UserRound size={15} className="text-blue-500" />
                    <span>2.31 m²/worker-day</span>
                  </span>
                  <p className="text-[10px] text-slate-500">{isAmharic ? "የአንድ ሰራተኛ አማካይ እለታዊ ስራ" : "Per individual shift hour productivity index."}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] uppercase text-slate-400 font-extrabold tracking-wider block">{isAmharic ? "ለቀጣይ ዞን የሚመከር የሰው ኃይል" : "Allocated Crew Recommendation"}</span>
                  <span className="text-base font-black text-slate-800 flex items-center space-x-1.5 font-mono">
                    <Users size={15} className="text-indigo-500" />
                    <span>{smartPlanningForecasts?.requiredManpower || 10} Workers</span>
                  </span>
                  <p className="text-[10px] text-slate-500">{isAmharic ? "በዞኑ ስፋትና ፓነል ብዛት ተሰልቶ የቀረበ" : "Optimized for Zone Area size."}</p>
                </div>
              </div>

            </div>
          </div>

          {/* Active zone list grid */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-4">
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-widest">
              {isAmharic ? "የግንባታ ዞኖች እቅድ እና የጊዜ ሰሌዳ መከታተያ" : "Active Roster Zone Construction Cycles"}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {extendedZones.map(z => {
                const totalReq = z.wallPanels + z.columnPanels + z.beamPanels + z.slabPanels + z.cornerPanels + z.externalPanels + z.internalPanels;
                const isDelayed = z.status === "Delayed" || (z.status === "In Progress" && z.actualDays && z.actualDays > z.targetDays);
                return (
                  <div 
                    key={z.id}
                    onClick={() => setSelectedZoneId(z.id)}
                    className={`p-4 rounded-xl border text-xs transition-all cursor-pointer space-y-3 ${
                      selectedZoneId === z.id 
                        ? "border-slate-900 bg-slate-900 text-white" 
                        : "border-slate-100 bg-slate-50 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className={`font-mono text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                          selectedZoneId === z.id ? "bg-slate-800 text-slate-300" : "bg-slate-200 text-slate-600"
                        }`}>
                          {z.id}
                        </span>
                        <h4 className="font-bold text-sm mt-1">{z.building}</h4>
                        <span className="text-[10px] opacity-75">Floor {z.floor} – {z.zone}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                        z.status === "Completed" ? "bg-emerald-500 text-white" :
                        isDelayed ? "bg-red-500 text-white animate-pulse" :
                        z.status === "In Progress" ? "bg-blue-500 text-white" : "bg-slate-400 text-white"
                      }`}>
                        {isDelayed ? "Delayed" : z.status}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] opacity-80">
                        <span>{isAmharic ? "የፓነል ገጠማ ማጠናቀቂያ ደረጃ:" : "Formwork Progress:"}</span>
                        <span className="font-bold">{z.completionPercentage}%</span>
                      </div>
                      <div className="w-full bg-slate-200/50 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-red-500 h-1.5 rounded-full transition-all duration-300" 
                          style={{ width: `${z.completionPercentage}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[10px] border-t border-slate-200/20 pt-2 font-mono">
                      <span>{isAmharic ? "አስፈላጊ ፓነሎች:" : "Req Panels:"} <strong className="text-xs">{totalReq}</strong></span>
                      <span>{isAmharic ? "የተመደበው:" : "Chief:"} <strong className="font-sans font-semibold">{z.assignedGangChiefName}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Granular Panel breakdown & 3D Drawing view for the Selected Zone */}
          {selectedZone && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Detailed panel counts view */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs lg:col-span-2 space-y-4">
                <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-800">
                      {isAmharic ? `የዞን ${selectedZone.zone} የፓነል ዝርዝር` : `Zone Bill of Materials: ${selectedZone.id}`}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {isAmharic ? `የተመደበው ንድፍ፡ ${selectedZone.drawingName}` : `Associated CAD plan: ${selectedZone.drawingName}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-black text-slate-800 font-mono">{selectedZone.area} m²</span>
                    <span className="text-[10px] uppercase text-slate-400 font-extrabold block">{isAmharic ? "የዞኑ ስፋት" : "Zone Area"}</span>
                  </div>
                </div>

                {/* Requirements Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">{isAmharic ? "ግድግዳ ፓነል" : "Wall Panels"}</span>
                    <span className="text-base font-extrabold text-slate-800 font-mono">{selectedZone.wallPanels}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">{isAmharic ? "ምሰሶ ፓነል" : "Column Panels"}</span>
                    <span className="text-base font-extrabold text-slate-800 font-mono">{selectedZone.columnPanels}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">{isAmharic ? "ማገር ፓነል" : "Beam Panels"}</span>
                    <span className="text-base font-extrabold text-slate-800 font-mono">{selectedZone.beamPanels}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">{isAmharic ? "ወለል ፓነል" : "Slab Panels"}</span>
                    <span className="text-base font-extrabold text-slate-800 font-mono">{selectedZone.slabPanels}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">{isAmharic ? "ማዕዘን ፓነል" : "Corner Panels"}</span>
                    <span className="text-base font-extrabold text-slate-800 font-mono">{selectedZone.cornerPanels}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">{isAmharic ? "ውጫዊ ፓነል" : "External Panels"}</span>
                    <span className="text-base font-extrabold text-slate-800 font-mono">{selectedZone.externalPanels}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">{isAmharic ? "ውስጣዊ ፓነል" : "Internal Panels"}</span>
                    <span className="text-base font-extrabold text-slate-800 font-mono">{selectedZone.internalPanels}</span>
                  </div>
                  <div className="bg-red-50 p-3 rounded-lg border border-red-100">
                    <span className="text-[10px] text-red-500 block font-bold uppercase">{isAmharic ? "ፒንና ማሰሪያዎች" : "Accessories"}</span>
                    <span className="text-base font-extrabold text-red-800 font-mono">{selectedZone.accessories} pcs</span>
                  </div>
                </div>

                {/* Smart Planning Prediction values */}
                <div className="bg-slate-900 rounded-xl p-4 text-white">
                  <div className="flex items-center space-x-2 text-xs font-bold text-red-500 uppercase tracking-wider mb-2">
                    <Sparkles size={14} />
                    <span>{isAmharic ? "የዚህ ዞን ግንባታ ትንበያ" : "Smart Zone Calculations & Planning Insights"}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
                    <div className="p-2 border border-slate-800 rounded">
                      <span className="text-slate-400 block text-[9px] font-sans uppercase">{isAmharic ? "ተስማሚ የሳይት ሰራተኛ ቁጥር" : "Recommended Crew Size"}</span>
                      <strong className="text-sm font-bold text-white">{smartPlanningForecasts?.requiredManpower} Workers</strong>
                    </div>
                    <div className="p-2 border border-slate-800 rounded">
                      <span className="text-slate-400 block text-[9px] font-sans uppercase">{isAmharic ? "ለመጨረስ የሚፈጅበት እቅድ" : "Estimated Duration"}</span>
                      <strong className="text-sm font-bold text-white">{smartPlanningForecasts?.estimatedDays} Days</strong>
                    </div>
                    <div className="p-2 border border-slate-800 rounded">
                      <span className="text-slate-400 block text-[9px] font-sans uppercase">{isAmharic ? "የመዘግየት ስጋት ደረጃ" : "Delay Risk Rating"}</span>
                      <strong className={`text-sm font-bold uppercase ${
                        smartPlanningForecasts?.delayRisk === "HIGH" ? "text-red-500" : smartPlanningForecasts?.delayRisk === "MEDIUM" ? "text-amber-500" : "text-emerald-500"
                      }`}>{smartPlanningForecasts?.delayRisk} RISK</strong>
                    </div>
                  </div>
                </div>

                {/* Daily Panel Dimensions Report (Automatically Calculated Area & Reported to Section Head + Head Office) */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-2 border-b border-slate-200">
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-xs flex items-center space-x-1.5 uppercase">
                        <FileCheck2 size={15} className="text-red-600" />
                        <span>{isAmharic ? "የእለት ገጠማ ፓነል ስፋት ሪፖርት" : "Daily Installed Panel Dimensions Report"}</span>
                      </h4>
                      <p className="text-[10px] text-slate-500">
                        {isAmharic 
                          ? "በጋንግ ቺፍ እና በቡድን መሪ የገቡ ፓነሎች ስፋት አውቶማቲክ ስሌት።" 
                          : "Auto-calculated area from daily dimensional logs."}
                      </p>
                    </div>

                    {/* Section Head & Head Office auto-sharing status indicators */}
                    <div className="flex flex-wrap gap-1.5">
                      <span className="inline-flex items-center space-x-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-extrabold px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                        <span>{isAmharic ? "ለሴክሽን ኃላፊ: ተልኳል" : "Section Head: Sent"}</span>
                      </span>
                      <span className="inline-flex items-center space-x-1 bg-blue-50 text-blue-700 border border-blue-200 text-[9px] font-extrabold px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping"></span>
                        <span>{isAmharic ? "ለዋና ጽ/ቤት: ተልኳል" : "Head Office: Sent"}</span>
                      </span>
                    </div>
                  </div>

                  {selectedZone.dailyPanelLogs && selectedZone.dailyPanelLogs.length > 0 ? (
                    <div className="space-y-3">
                      {/* Interactive summary panel */}
                      <div className="grid grid-cols-2 gap-4 bg-white p-3 rounded-lg border border-slate-200/60 text-xs">
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase font-bold">{isAmharic ? "የተገጠሙ ፓነሎች ጠቅላላ ብዛት" : "Total Logged Panels"}</span>
                          <strong className="text-slate-800 font-mono text-sm">
                            {selectedZone.dailyPanelLogs.reduce((sum, log) => sum + log.quantity, 0)} {isAmharic ? "ፍሬ" : "pcs"}
                          </strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase font-bold">{isAmharic ? "በሲስተሙ አውቶማቲክ የተሰላ ስፋት" : "Auto-Calculated Total Area"}</span>
                          <strong className="text-emerald-600 font-mono text-sm font-extrabold">
                            {selectedZone.dailyPanelLogs.reduce((sum, log) => sum + log.calculatedArea, 0).toFixed(2)} m²
                          </strong>
                        </div>
                      </div>

                      {/* Logs Table */}
                      <div className="overflow-x-auto rounded-lg border border-slate-200/60 bg-white">
                        <table className="w-full text-left border-collapse text-[11px]">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[9px]">
                              <th className="p-2">{isAmharic ? "ቀን" : "Date"}</th>
                              <th className="p-2">{isAmharic ? "የፓነል አይነት" : "Panel Type"}</th>
                              <th className="p-2">{isAmharic ? "ልኬት (m)" : "Dimensions (m)"}</th>
                              <th className="p-2 text-center">{isAmharic ? "ብዛት" : "Qty"}</th>
                              <th className="p-2 text-right">{isAmharic ? "ስፋት" : "Area"}</th>
                              <th className="p-2">{isAmharic ? "አስገቢ / ማስታወሻ" : "Logged By / Note"}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium">
                            {selectedZone.dailyPanelLogs.map((log) => (
                              <tr key={log.id} className="hover:bg-slate-50/50">
                                <td className="p-2 text-slate-500 font-mono">{log.date}</td>
                                <td className="p-2 text-slate-800 font-bold">{log.panelType}</td>
                                <td className="p-2 text-slate-600 font-mono">{log.length}m × {log.width}m</td>
                                <td className="p-2 text-center text-slate-800 font-bold font-mono">{log.quantity}</td>
                                <td className="p-2 text-right text-emerald-600 font-extrabold font-mono">{log.calculatedArea.toFixed(2)} m²</td>
                                <td className="p-2 text-slate-500 text-[10px]">
                                  <span className="font-bold text-slate-700 block">{log.loggedBy} ({isAmharic ? "ጋንግ ቺፍ" : log.role})</span>
                                  {log.notes && <span className="italic block text-slate-400 mt-0.5">{log.notes}</span>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white border border-slate-200/50 rounded-lg p-4 text-center text-slate-400 text-xs">
                      {isAmharic 
                        ? "ለዚህ ዞን እስካሁን ምንም የፓነል ገጠማ በስፋትና ብዛት አልተመዘገበም።" 
                        : "No dimensional panel logs recorded for this zone yet. Use the Gang Chief workbench to log."}
                    </div>
                  )}
                </div>

                {/* Progress details */}
                <div className="border-t border-slate-100 pt-4 flex flex-col sm:flex-row justify-between gap-4 text-xs text-slate-600">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-bold">
                      {selectedZone.assignedGangChiefName.charAt(0)}
                    </div>
                    <div>
                      <span className="block font-medium text-slate-400">{isAmharic ? "ኃላፊነት የተሰጠው ጋንግ ቺፍ" : "Assigned Site Gang Chief"}</span>
                      <span className="font-bold text-slate-800">{selectedZone.assignedGangChiefName}</span>
                    </div>
                  </div>

                  <div>
                    <span className="block font-medium text-slate-400">{isAmharic ? "የጀምር ቀን" : "Start Date"}</span>
                    <span className="font-bold text-slate-800 font-mono">{selectedZone.startDate}</span>
                  </div>

                  <div>
                    <span className="block font-medium text-slate-400">{isAmharic ? "የታለመ ግንባታ ቀን" : "Target Days"}</span>
                    <span className="font-bold text-slate-800">{selectedZone.targetDays} {isAmharic ? "ቀናት" : "Days"}</span>
                  </div>

                  <div>
                    <span className="block font-medium text-slate-400">{isAmharic ? "የማጽደቂያ ሁኔታ" : "Approval State"}</span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      selectedZone.approvedByTeamLeader 
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}>
                      {selectedZone.approvedByTeamLeader 
                        ? (isAmharic ? "ጸድቋል" : "Approved by Eng. Yoseph") 
                        : (isAmharic ? "ማረጋገጫ ይጠብቃል" : "Pending Supervisor Sign-Off")
                      }
                    </span>
                  </div>
                </div>
              </div>

              {/* 3D Blueprint Simulator View */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-4">
                <span className="text-[10px] block uppercase text-slate-400 font-extrabold tracking-widest text-center">
                  {isAmharic ? "የአሉሚኒየም ንድፍ መመልከቻ" : "Formwork Drawing Schematic Viewer"}
                </span>

                <div className="relative border-4 border-slate-900 bg-slate-950 rounded-xl aspect-square overflow-hidden flex flex-col justify-between p-4 text-white">
                  
                  {/* Schematic mock grid lines */}
                  <div className="absolute inset-0 opacity-15" style={{
                    backgroundImage: "radial-gradient(circle, #3b82f6 1px, transparent 1px)",
                    backgroundSize: "16px 16px"
                  }}></div>

                  <div className="absolute inset-0 opacity-10" style={{
                    backgroundImage: "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
                    backgroundSize: "40px 40px"
                  }}></div>

                  <div className="relative z-10 flex justify-between items-center text-[10px] font-mono text-slate-400">
                    <span>CAD-VIEWER v4.0</span>
                    <span className="text-emerald-400 flex items-center space-x-1 animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      <span>ONLINE</span>
                    </span>
                  </div>

                  {/* Mock Drawing graphics representing aluminum layout */}
                  <div className="relative z-10 flex flex-col items-center justify-center space-y-2 py-4">
                    <div className="w-32 h-32 border border-red-500 relative rounded flex items-center justify-center bg-slate-900/80">
                      {/* Grid representation */}
                      <div className="absolute inset-2 border border-slate-700 border-dashed rounded"></div>
                      <div className="absolute inset-6 border border-slate-600 rounded flex items-center justify-center text-[10px] font-mono text-slate-500">
                        {selectedZone.id}
                      </div>
                      
                      {/* Interactive mockup panel markers */}
                      <div className="absolute top-0 left-0 w-3 h-3 bg-red-600 rounded-full animate-ping"></div>
                      <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                      <div className="absolute bottom-0 left-0 w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                      <div className="absolute bottom-0 right-0 w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">{selectedZone.drawingName}</span>
                  </div>

                  <div className="relative z-10 bg-slate-900/90 border border-slate-800 p-2.5 rounded text-[10px] font-mono space-y-1">
                    <div className="text-slate-400">File Integrity: Verified</div>
                    <div className="text-slate-400">Coordinates: 9.03N, 38.74E</div>
                    <div className="text-emerald-400 font-semibold uppercase">{isAmharic ? "አሉሚኒየም ተለይቶ ተቀምጧል" : "BIM Model Loaded"}</div>
                  </div>
                </div>

                <div className="text-center">
                  <a 
                    href="#" 
                    onClick={(e) => { e.preventDefault(); alert("DWG File Download is simulated. File payload verified.") }}
                    className="inline-flex items-center space-x-1.5 text-xs font-bold text-red-600 hover:text-red-700"
                  >
                    <FileCode size={14} />
                    <span>{isAmharic ? "ኦሪጅናል CAD ፋይል አውርድ" : "Download Original CAD File (DWG)"}</span>
                  </a>
                </div>
              </div>

            </div>
          )}
        </div>
      )}

      {/* TEAM LEADER WORKSPACE */}
      {activeSubTab === "teamLeader" && (
        <div className="space-y-6">
          
          {/* Main action panels */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left side inputs: Upload Drawings & Create Zone */}
            <div className="space-y-6 lg:col-span-1">
              
              {/* Drawing upload component */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-4">
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-widest flex items-center space-x-2">
                  <Upload size={16} className="text-red-600" />
                  <span>{isAmharic ? "ንድፍ ግንባታ መጫኛ" : "Engineering Drawing Roster"}</span>
                </h3>
                <p className="text-xs text-slate-500">
                  {isAmharic ? "DWG, PDF, ወይም IFC ንድፎችን ለግንባታ ዞኖች ያገናኙ።" : "Link engineering designs to physical block levels and zones."}
                </p>

                <form onSubmit={handleUploadDrawing} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">{isAmharic ? "የንድፍ ፋይል ስም" : "Drawing Filename"}</label>
                    <input 
                      type="text" 
                      placeholder="e.g. OVID_TowerA_Slab_F05.dwg"
                      value={newDrawName}
                      onChange={(e) => setNewDrawName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800 focus:bg-white outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">{isAmharic ? "የፋይል አይነት" : "File Extension"}</label>
                      <select 
                        value={newDrawType}
                        onChange={(e) => setNewDrawType(e.target.value as any)}
                        className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-slate-800 outline-none"
                      >
                        <option value="DWG">AutoCAD (.dwg)</option>
                        <option value="PDF">PDF Drawing (.pdf)</option>
                        <option value="IFC">IFC BIM Model (.ifc)</option>
                        <option value="PNG">Image (.png)</option>
                        <option value="JPG">Image (.jpg)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">{isAmharic ? "ፎቅ ቁጥር" : "Floor Number"}</label>
                      <input 
                        type="number" min="1" max="40"
                        value={newDrawFloor}
                        onChange={(e) => setNewDrawFloor(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-slate-800 outline-none"
                      />
                    </div>
                  </div>

                  {/* Drag and Drop Zone */}
                  <div className="border border-dashed border-slate-300 rounded-xl p-5 text-center bg-slate-50/50 hover:bg-slate-50 transition-colors">
                    <Upload size={22} className="mx-auto text-slate-400 mb-1.5" />
                    <span className="text-[10px] text-slate-500 font-semibold block">
                      {isAmharic ? "ፋይል እዚህ ይጎትቱ ወይም ይምረጡ" : "Drag & Drop CAD file here or browse"}
                    </span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">Maximum size: 250MB</span>
                  </div>

                  {uploadProgress !== null && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-bold">
                        <span>{isAmharic ? "በመጫን ላይ..." : "Uploading blueprint..."}</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                        <div className="bg-red-600 h-1 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
                      </div>
                    </div>
                  )}

                  <button 
                    type="submit"
                    disabled={!newDrawName || uploadProgress !== null}
                    className="w-full py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold rounded cursor-pointer transition-colors"
                  >
                    {isAmharic ? "ንድፉን መዝግብ" : "Register Schematic Blueprint"}
                  </button>
                </form>
              </div>

              {/* Create and Edit Zone Form */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-4">
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-widest flex items-center space-x-2">
                  <Plus size={16} className="text-red-600" />
                  <span>{isAmharic ? "አዲስ የግንባታ ዞን ማቀጃ" : "Plan New Structural Zone"}</span>
                </h3>

                <form onSubmit={handleCreateZone} className="space-y-3.5 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">{isAmharic ? "የዞን መለያ (Zone ID)" : "Unique Zone ID"}</label>
                      <input 
                        type="text" 
                        placeholder="B1-F04-ZD"
                        value={zoneIdInput}
                        onChange={(e) => setZoneIdInput(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-slate-800 outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">{isAmharic ? "የዞኑ ስም" : "Zone Name"}</label>
                      <input 
                        type="text" 
                        placeholder="Zone D"
                        value={zoneNameInput}
                        onChange={(e) => setZoneNameInput(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-slate-800 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">{isAmharic ? "ፎቅ" : "Floor"}</label>
                      <input 
                        type="number" min="1" max="40"
                        value={zoneFloorInput}
                        onChange={(e) => setZoneFloorInput(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-slate-800 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">{isAmharic ? "ስፋት (m²)" : "Area (m²)"}</label>
                      <input 
                        type="number" min="10" max="1000"
                        value={zoneAreaInput}
                        onChange={(e) => setZoneAreaInput(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-slate-800 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">{isAmharic ? "ዒላማ ቀን" : "Cycle Days"}</label>
                      <input 
                        type="number" min="1" max="30"
                        value={targetDaysInput}
                        onChange={(e) => setTargetDaysInput(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-slate-800 outline-none"
                      />
                    </div>
                  </div>

                  {/* Panel Bill of quantities toggles */}
                  <div className="border-t border-slate-100 pt-3 space-y-2">
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">
                      {isAmharic ? "የፓነል ቁሳቁስ እቅድ (Bill of Panels)" : "Aluminum Panel Bill of Materials"}
                    </span>
                    <div className="grid grid-cols-3 gap-2 text-[11px]">
                      <div>
                        <span>{isAmharic ? "ግድግዳ" : "Wall Qty"}</span>
                        <input type="number" value={wallQty} onChange={e => setWallQty(Number(e.target.value))} className="w-full bg-slate-50 p-1 border rounded text-slate-800 font-mono" />
                      </div>
                      <div>
                        <span>{isAmharic ? "ምሰሶ" : "Column Qty"}</span>
                        <input type="number" value={colQty} onChange={e => setColQty(Number(e.target.value))} className="w-full bg-slate-50 p-1 border rounded text-slate-800 font-mono" />
                      </div>
                      <div>
                        <span>{isAmharic ? "ማገር" : "Beam Qty"}</span>
                        <input type="number" value={beamQty} onChange={e => setBeamQty(Number(e.target.value))} className="w-full bg-slate-50 p-1 border rounded text-slate-800 font-mono" />
                      </div>
                      <div>
                        <span>{isAmharic ? "ወለል" : "Slab Qty"}</span>
                        <input type="number" value={slabQty} onChange={e => setSlabQty(Number(e.target.value))} className="w-full bg-slate-50 p-1 border rounded text-slate-800 font-mono" />
                      </div>
                      <div>
                        <span>{isAmharic ? "ማዕዘን" : "Corner Qty"}</span>
                        <input type="number" value={cornerQty} onChange={e => setCornerQty(Number(e.target.value))} className="w-full bg-slate-50 p-1 border rounded text-slate-800 font-mono" />
                      </div>
                      <div>
                        <span>{isAmharic ? "ውጫዊ" : "External"}</span>
                        <input type="number" value={extQty} onChange={e => setExtQty(Number(e.target.value))} className="w-full bg-slate-50 p-1 border rounded text-slate-800 font-mono" />
                      </div>
                      <div>
                        <span>{isAmharic ? "ውስጣዊ" : "Internal"}</span>
                        <input type="number" value={intQty} onChange={e => setIntQty(Number(e.target.value))} className="w-full bg-slate-50 p-1 border rounded text-slate-800 font-mono" />
                      </div>
                      <div className="col-span-2">
                        <span>{isAmharic ? "ፒን/Accessories" : "Accessories"}</span>
                        <input type="number" value={accQty} onChange={e => setAccQty(Number(e.target.value))} className="w-full bg-slate-50 p-1 border rounded text-slate-800 font-mono" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">{isAmharic ? "ጋንግ ቺፍ ይምረጡ" : "Assign Gang Chief"}</label>
                      <select 
                        value={assignedChiefInput}
                        onChange={(e) => setAssignedChiefInput(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-slate-800 outline-none"
                      >
                        <option value="GC-01">Fikru Tolossa</option>
                        <option value="GC-02">Mulugeta Tesfaye</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">{isAmharic ? "ንድፍ ግንባታ አገናኝ" : "Link CAD Drawing"}</label>
                      <select 
                        value={linkedDrawId}
                        onChange={(e) => setLinkedDrawId(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-slate-800 outline-none hover:bg-slate-100"
                      >
                        {drawings.map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          const area = zoneAreaInput || 150;
                          setWallQty(Math.round(area * 1.3));
                          setColQty(Math.round(area * 0.5));
                          setBeamQty(Math.round(area * 0.35));
                          setSlabQty(Math.round(area * 1.15));
                          setCornerQty(Math.round(area * 0.2));
                          setExtQty(Math.round(area * 0.25));
                          setIntQty(Math.round(area * 0.45));
                          setAccQty(Math.round(area * 2.8));
                        }}
                        className="mt-1 text-[10px] text-red-600 font-extrabold hover:text-red-700 flex items-center space-x-1 uppercase cursor-pointer"
                      >
                        <Sparkles size={11} />
                        <span>{isAmharic ? "ከ CAD ንድፍ ፓነል ቁጥሮችን አስላ" : "Calculate Panels from CAD"}</span>
                      </button>
                    </div>
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded cursor-pointer shadow-xs transition-colors"
                  >
                    {isAmharic ? "አዲስ የግንባታ ዞን ፍጠር" : "Allocate Planned Zone"}
                  </button>
                </form>
              </div>

            </div>

            {/* Middle: Plan vs Actual progress matrix & approval interface */}
            <div className="space-y-6 lg:col-span-2">
              
              {/* Drawings list catalog */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-4">
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-widest">
                  {isAmharic ? "በሲስተሙ የተጫኑ ኢንጂነሪንግ ንድፎች" : "Active Engineering Drawing Registry"}
                </h3>
                <div className="overflow-x-auto rounded-xl border border-slate-100">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100">
                        <th className="p-3">{isAmharic ? "ንድፍ መለያ" : "Drawing ID"}</th>
                        <th className="p-3">{isAmharic ? "የፋይል ስም" : "Filename"}</th>
                        <th className="p-3">{isAmharic ? "አይነት" : "Format"}</th>
                        <th className="p-3">{isAmharic ? "ተያያዥ ዞን" : "Associated Level"}</th>
                        <th className="p-3">{isAmharic ? "ቀን" : "Uploaded At"}</th>
                        <th className="p-3">{isAmharic ? "ፋይል መጠን" : "Size"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-slate-600">
                      {drawings.map(d => (
                        <tr key={d.id} className="hover:bg-slate-50/50">
                          <td className="p-3 font-bold text-slate-800">{d.id}</td>
                          <td className="p-3 font-sans text-slate-700 flex items-center space-x-1.5">
                            {d.type === "DWG" ? <FileCode className="text-blue-500" size={14} /> :
                             d.type === "PDF" ? <FileText className="text-red-500" size={14} /> :
                             d.type === "IFC" ? <Layout className="text-purple-500" size={14} /> : <FileImage className="text-amber-500" size={14} />}
                            <span className="font-semibold">{d.name}</span>
                          </td>
                          <td className="p-3"><span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[9px] font-bold">{d.type}</span></td>
                          <td className="p-3 font-sans">FL {d.floor} – {d.zone}</td>
                          <td className="p-3 text-[10px] whitespace-nowrap">{d.uploadedAt}</td>
                          <td className="p-3 text-[10px] text-slate-400">{d.fileSize}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Compare Planned vs Actual timeline, & Approve workflow */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-4">
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-widest">
                  {isAmharic ? "የቡድን መሪ ማረጋገጫና ማጽደቂያ ሰሌዳ" : "Supervisor Sign-off & Quality Approvals"}
                </h3>
                <p className="text-xs text-slate-500">
                  {isAmharic 
                    ? "ፎርማን ሪፖርት ያቀረቡባቸውን፣ ማጠናቀቂያ ደረጃቸው 100% የደረሱ ዞኖችን በማረጋገጥ ለኮንክሪት ስራ ያጽድቁ።" 
                    : "Review completed formwork logs, cross-examine stripping checklists, and sign-off handover approvals."}
                </p>

                <div className="space-y-3">
                  {extendedZones.filter(z => z.completionPercentage >= 100 && !z.approvedByTeamLeader).length === 0 ? (
                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center text-xs text-slate-400">
                      {isAmharic ? "ማጽደቂያ የሚጠብቅ ምንም የግንባታ ዞን የለም።" : "No pending completions awaiting supervisor approval."}
                    </div>
                  ) : (
                    extendedZones.filter(z => z.completionPercentage >= 100 && !z.approvedByTeamLeader).map(z => {
                      const totalBoM = z.wallPanels + z.columnPanels + z.beamPanels + z.slabPanels + z.cornerPanels + z.externalPanels + z.internalPanels;
                      return (
                        <div key={z.id} className="bg-amber-50/50 border border-amber-200/60 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                          <div className="space-y-1">
                            <span className="text-[9px] font-bold bg-amber-200 text-amber-800 px-2 py-0.5 rounded uppercase">{isAmharic ? "ማረጋገጫ ይጠብቃል" : "Ready for Sign-Off"}</span>
                            <h4 className="text-sm font-bold text-slate-800 mt-1">{z.building} – FL {z.floor} ({z.zone})</h4>
                            <p className="text-[11px] text-slate-500">
                              Logged by Gang Chief {z.assignedGangChiefName} with {z.manpowerUsed} crew. Active panels: {z.installedPanels} / {totalBoM}.
                            </p>
                            {z.dailyReportNotes && (
                              <div className="text-[10px] bg-white p-2 rounded border border-slate-100 font-sans italic text-slate-600">
                                "{z.dailyReportNotes}"
                              </div>
                            )}
                          </div>
                          <button 
                            onClick={() => handleApproveZone(z.id)}
                            className="bg-red-600 hover:bg-red-700 text-white font-bold py-1.5 px-4 rounded text-xs flex items-center space-x-1 cursor-pointer shrink-0"
                          >
                            <FileCheck2 size={14} />
                            <span>{isAmharic ? "ለኮንክሪት ግንባታ አጽድቅ" : "Approve & Sign-Off"}</span>
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Approved Log catalog */}
                <div className="pt-2">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">{isAmharic ? "ያለቁና የጸደቁ ዞኖች" : "Previously Signed-off Completions"}</h4>
                  <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                    {extendedZones.filter(z => z.approvedByTeamLeader).map(z => (
                      <div key={z.id} className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex justify-between items-center text-xs">
                        <div>
                          <span className="font-bold text-slate-800">{z.id}</span>
                          <span className="text-slate-500 block text-[10px]">{z.building} - Floor {z.floor}</span>
                        </div>
                        <div className="text-right text-[10px]">
                          <span className="text-emerald-600 font-bold flex items-center justify-end space-x-0.5">
                            <Check size={12} />
                            <span>{isAmharic ? "የጸደቀ" : "Approved"}</span>
                          </span>
                          <span className="text-slate-400 font-mono">{z.approvedDate || "2026-07-01"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>

          </div>

          {/* Construction Schedule Auto generator card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-4">
            <div>
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-widest flex items-center space-x-2">
                <Calendar size={16} className="text-red-600" />
                <span>{isAmharic ? "የቀጣይ ግንባታ ዑደት ፕላነር" : "Structural Cycle Sequence Generator"}</span>
              </h3>
              <p className="text-xs text-slate-500">
                {isAmharic ? "ቀን፣ ፎቆች እና ዞኖች ያስገቡ፤ ሲስተሙ በራስ-ሰር የአሉሚኒየም ፎርምወርቅ ጊዜ ሰሌዳ ያዘጋጃል።" : "Auto-sequence formwork cycle schedules based on assembly speeds."}
              </p>
            </div>

            <form onSubmit={handleTimelineGenerate} className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">{isAmharic ? "ፕሮጀክት መጀመሪያ ቀን" : "Start Date"}</label>
                <input type="date" value={startDateInput} onChange={e => setStartDateInput(e.target.value)} className="w-full bg-white border border-slate-200 rounded p-1.5 text-slate-800 outline-none" />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">{isAmharic ? "የፎቆች ብዛት" : "Floors"}</label>
                <input type="number" min="1" max="40" value={schedFloorsInput} onChange={e => setSchedFloorsInput(Number(e.target.value))} className="w-full bg-white border border-slate-200 rounded p-1.5 text-slate-800 outline-none" />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">{isAmharic ? "ዞኖች በየፎቁ" : "Zones / Floor"}</label>
                <input type="number" min="1" max="6" value={schedZonesInput} onChange={e => setSchedZonesInput(Number(e.target.value))} className="w-full bg-white border border-slate-200 rounded p-1.5 text-slate-800 outline-none" />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">{isAmharic ? "ዒላማ ቀናት" : "Cycle Days"}</label>
                <input type="number" min="1" max="15" value={schedTargetDays} onChange={e => setSchedTargetDays(Number(e.target.value))} className="w-full bg-white border border-slate-200 rounded p-1.5 text-slate-800 outline-none" />
              </div>
              <button type="submit" className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded cursor-pointer transition-colors">
                {isAmharic ? "ዑደት ጊዜ ሰሌዳ አስላ" : "Generate Cycles"}
              </button>
            </form>

            {generatedTimeline.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">{isAmharic ? "የግንባታ መርሃ ግብር ሰንጠረዥ" : "Calculated Construction Cycle Phases"}</h4>
                <div className="overflow-x-auto rounded-xl border border-slate-100">
                  <table className="w-full text-left border-collapse text-xs font-mono">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100">
                        <th className="p-2.5">Seq</th>
                        <th className="p-2.5">Zone ID</th>
                        <th className="p-2.5">Level</th>
                        <th className="p-2.5">Start Date</th>
                        <th className="p-2.5">Target Days</th>
                        <th className="p-2.5">Estimated Finish Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-600">
                      {generatedTimeline.slice(0, 10).map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2.5 font-bold text-slate-400">Seq #{item.sequenceOrder}</td>
                          <td className="p-2.5 font-bold text-slate-800">{item.zoneId}</td>
                          <td className="p-2.5 font-sans">Floor {item.floor} - {item.zoneName}</td>
                          <td className="p-2.5">{item.startDate}</td>
                          <td className="p-2.5 font-sans">{item.targetDays} Days</td>
                          <td className="p-2.5 text-red-600 font-bold">{item.expectedFinishDate}</td>
                        </tr>
                      ))}
                      {generatedTimeline.length > 10 && (
                        <tr className="bg-slate-50">
                          <td colSpan={6} className="p-2.5 text-center text-slate-500 font-sans text-[11px]">
                            Truncated {generatedTimeline.length - 10} future phases.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

        </div>
      )}

      {/* GANG CHIEF WORKSPACE */}
      {activeSubTab === "gangChief" && (
        <div className="space-y-6">
          
          <div className="bg-red-50/50 border border-red-100 rounded-2xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-black tracking-widest text-red-600 block">
                {isAmharic ? "ሳይት ግንባታ ተረኛ ፎርማን" : "On-Site Crew Foreman Portal"}
              </span>
              <h3 className="text-lg font-black text-slate-800">
                {isAmharic ? "የጋንግ ቺፍ ግንባታ መቆጣጠሪያ (Fikru Tolossa)" : "Gang Chief Workspace: Fikru Tolossa"}
              </h3>
              <p className="text-xs text-slate-600">
                {isAmharic 
                  ? "የተመደቡበትን ፎቅና ዞን የአሉሚኒየም ፓነል ቁጥር ይመልከቱ፣ የእለት ግንባታ ሂደትን ያስመዝግቡ።" 
                  : "View assigned block dimensions, log installed panels count, and submit photos to engineering supervisors."}
              </p>
            </div>

            <div className="flex items-center space-x-2 bg-white px-3.5 py-1.5 rounded-xl border border-slate-200">
              <UserCheck size={16} className="text-red-600 shrink-0" />
              <div className="text-left leading-none">
                <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wider">{isAmharic ? "ንቁ የሳይት ሚና" : "Acting Role"}</span>
                <span className="text-xs font-extrabold text-slate-700">{isAmharic ? "ጋንግ ቺፍ / ፎርማን" : "Gang Chief"}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left side checklist: assigned zone and requested panel BoM */}
            <div className="space-y-6 lg:col-span-1">
              
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-4">
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-widest">
                  {isAmharic ? "የተመደቡ ዞኖች ዝርዝር" : "Assigned Construction Zones"}
                </h3>
                <div className="space-y-2">
                  {extendedZones.filter(z => z.assignedGangChiefId === "GC-01" || z.assignedGangChiefId === "GC-02").map(z => {
                    const isSelected = selectedZoneId === z.id;
                    return (
                      <div 
                        key={z.id}
                        onClick={() => {
                          setSelectedZoneId(z.id);
                          setGcInstalledUpdate(z.installedPanels);
                          setGcRemovedUpdate(z.removedPanels);
                          setGcManpowerUpdate(z.manpowerUsed || 8);
                        }}
                        className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                          isSelected 
                            ? "border-slate-900 bg-slate-900 text-white" 
                            : "border-slate-100 bg-slate-50 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <div className="flex justify-between font-bold">
                          <span>{z.id}</span>
                          <span className={`text-[9px] px-1.5 rounded ${
                            z.status === "Completed" ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
                          }`}>{z.status}</span>
                        </div>
                        <div className="text-[10px] opacity-75 mt-1">{z.building} - Floor {z.floor}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bill of Quantities breakdown card */}
              {selectedZone && (
                <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 space-y-4">
                  <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider block">
                    {isAmharic ? "ለገጠማ አስፈላጊ የፓነል ዝርዝር" : "Required Bill of Panels"}
                  </span>
                  <div className="text-xs font-semibold text-slate-300">
                    {isAmharic ? "ዞን መለያ:" : "Target Zone ID:"} <span className="text-white font-mono">{selectedZone.id}</span>
                  </div>

                  <div className="space-y-2.5 pt-2 border-t border-slate-800 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">{isAmharic ? "ግድግዳ ፓነል:" : "Wall Panels:"}</span>
                      <span className="font-mono font-bold">{selectedZone.wallPanels}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">{isAmharic ? "ምሰሶ ፓነል:" : "Column Panels:"}</span>
                      <span className="font-mono font-bold">{selectedZone.columnPanels}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">{isAmharic ? "ማገር ፓነል:" : "Beam Panels:"}</span>
                      <span className="font-mono font-bold">{selectedZone.beamPanels}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">{isAmharic ? "ወለል ፓነል:" : "Slab Panels:"}</span>
                      <span className="font-mono font-bold">{selectedZone.slabPanels}</span>
                    </div>
                    <div className="flex justify-between items-center border-t border-slate-800/80 pt-2 text-red-400">
                      <span>{isAmharic ? "ፒን/Accessories:" : "Required Accessories:"}</span>
                      <span className="font-mono font-bold">{selectedZone.accessories} pcs</span>
                    </div>
                  </div>

                  <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 space-y-1.5">
                    <span className="text-[9px] uppercase font-black text-slate-400 tracking-widest block">
                      {isAmharic ? "የእለት ግንባታ ዒላማ" : "Today's Target"}
                    </span>
                    <p className="text-[11px] text-slate-200 leading-relaxed">
                      {isAmharic 
                        ? `በዚህ ዞን ${selectedZone.wallPanels} የቁም ፓነሎች በመገጠም ፒኖችን ሙሉ በሙሉ በመቆለፍ ለኮንክሪት ዝግጁ ያድርጉ።`
                        : `Assemble wall panels and secure wedge pins in Zone ${selectedZone.zone}. Prepare scaffolding floor for casting.`}
                    </p>
                  </div>
                </div>
              )}

            </div>

            {/* Right side form: update actual parameters, upload photo, and submit */}
            {selectedZone ? (
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs lg:col-span-2 space-y-4">
                <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                  <div>
                    <h3 className="text-base font-bold text-slate-800">
                      {isAmharic ? `${selectedZone.id} የግንባታ ሂደት መመዝገቢያ` : `Update Site Progress: ${selectedZone.id}`}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {isAmharic ? "የተጫኑና የተቀየሩ ፓነሎችን እዚህ ያስመዝግቡ።" : "Log physical actuals from the site."}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-mono font-extrabold text-slate-800">{selectedZone.completionPercentage}%</span>
                    <span className="text-[10px] uppercase text-slate-400 block">{isAmharic ? "ያለፈው ደረጃ" : "Previous Stage"}</span>
                  </div>
                </div>

                <form onSubmit={handleGangChiefSubmit} className="space-y-4 text-xs">
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">
                        {isAmharic ? "የተገጠሙ ፓነሎች ቁጥር (Installed)" : "Panels Installed Count"}
                      </label>
                      <input 
                        type="number" min="0" max="800"
                        value={gcInstalledUpdate}
                        onChange={(e) => setGcInstalledUpdate(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800 font-mono focus:bg-white outline-none"
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        Required: {selectedZone.wallPanels + selectedZone.columnPanels + selectedZone.beamPanels + selectedZone.slabPanels + selectedZone.cornerPanels + selectedZone.externalPanels + selectedZone.internalPanels}
                      </span>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">
                        {isAmharic ? "የተነሱ/የተstripped ፓነሎች (Stripped)" : "Panels Stripped (Removed) Count"}
                      </label>
                      <input 
                        type="number" min="0" max="800"
                        value={gcRemovedUpdate}
                        onChange={(e) => setGcRemovedUpdate(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800 font-mono focus:bg-white outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">
                        {isAmharic ? "የተሳተፉ ሰራተኞች ብዛት (Manpower)" : "Manpower Used (Workers)"}
                      </label>
                      <input 
                        type="number" min="1" max="50"
                        value={gcManpowerUpdate}
                        onChange={(e) => setGcManpowerUpdate(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800 font-mono focus:bg-white outline-none"
                      />
                    </div>
                  </div>

                  {/* Daily Panel Dimension Input Block (Automatically Calculates Area) */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-3">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200/40">
                      <h4 className="font-bold text-slate-800 text-xs flex items-center space-x-1.5">
                        <Sliders size={14} className="text-red-600" />
                        <span>{isAmharic ? "የእለት ፓነል ገጠማ በስፋትና ብዛት (Auto Area Calculator)" : "Daily Panel Dimensions & Auto Area Log"}</span>
                      </h4>
                      <span className="text-[10px] bg-red-100 text-red-800 font-extrabold px-2 py-0.5 rounded uppercase">
                        {isAmharic ? "አውቶማቲክ ስሌት" : "Live Math"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                      <div className="col-span-2 sm:col-span-1">
                        <label className="block text-[10px] text-slate-500 font-bold mb-1">{isAmharic ? "የፓነል አይነት" : "Panel Type"}</label>
                        <select 
                          value={pLogType} 
                          onChange={(e) => setPLogType(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded p-1.5 text-xs text-slate-800 font-medium"
                        >
                          <option value="Wall Panel">{isAmharic ? "ግድግዳ ፓነል (Wall)" : "Wall Panel"}</option>
                          <option value="Slab Deck">{isAmharic ? "ወለል ማገር (Slab Deck)" : "Slab Deck"}</option>
                          <option value="Column Corner">{isAmharic ? "ምሰሶ ማዕዘን (Column)" : "Column Corner"}</option>
                          <option value="Beam Panel">{isAmharic ? "ማገር ፓነል (Beam)" : "Beam Panel"}</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-500 font-bold mb-1">{isAmharic ? "ርዝመት (ሜትር)" : "Length (m)"}</label>
                        <input 
                          type="number" step="0.01" min="0.1" max="10"
                          value={pLogLength}
                          onChange={(e) => setPLogLength(Number(e.target.value))}
                          className="w-full bg-white border border-slate-200 rounded p-1.5 text-xs text-slate-800 font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-500 font-bold mb-1">{isAmharic ? "ወርድ (ሜትር)" : "Width (m)"}</label>
                        <input 
                          type="number" step="0.01" min="0.1" max="5"
                          value={pLogWidth}
                          onChange={(e) => setPLogWidth(Number(e.target.value))}
                          className="w-full bg-white border border-slate-200 rounded p-1.5 text-xs text-slate-800 font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-500 font-bold mb-1">{isAmharic ? "ብዛት (ቁጥር)" : "Quantity (pcs)"}</label>
                        <input 
                          type="number" min="1" max="500"
                          value={pLogQty}
                          onChange={(e) => setPLogQty(Number(e.target.value))}
                          className="w-full bg-white border border-slate-200 rounded p-1.5 text-xs text-slate-800 font-mono"
                        />
                      </div>

                      <div className="col-span-2 sm:col-span-1 flex flex-col justify-end">
                        <span className="text-[9px] text-slate-400 block text-right font-semibold mb-1">
                          {isAmharic ? "የዛሬ ስፋት:" : "This Item Area:"}
                        </span>
                        <span className="font-mono font-extrabold text-slate-800 text-right">
                          {(pLogLength * pLogWidth * pLogQty).toFixed(2)} m²
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center">
                      <div className="sm:col-span-3">
                        <input 
                          type="text"
                          placeholder={isAmharic ? "ለይቶ ማወቂያ / ማስታወሻ (ምሳሌ፡ ምዕራብ ግድግዳ)" : "Location note (e.g. West Wall Section)"}
                          value={pLogNotes}
                          onChange={(e) => setPLogNotes(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded p-1.5 text-xs text-slate-700 placeholder-slate-400"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const calculatedArea = Number((pLogLength * pLogWidth * pLogQty).toFixed(2));
                          setTempPanelLogs(prev => [...prev, {
                            panelType: pLogType,
                            length: pLogLength,
                            width: pLogWidth,
                            quantity: pLogQty,
                            calculatedArea,
                            notes: pLogNotes
                          }]);
                          setPLogNotes("");
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold p-1.5 rounded flex items-center justify-center space-x-1 cursor-pointer transition-colors"
                      >
                        <Plus size={14} />
                        <span>{isAmharic ? "አክል (Add)" : "Add to Batch"}</span>
                      </button>
                    </div>

                    {/* List of temporary panel logs added */}
                    {tempPanelLogs.length > 0 && (
                      <div className="bg-white border border-slate-200 rounded-lg p-2.5 space-y-2">
                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase">
                          <span>{isAmharic ? "ለማስገባት የተዘጋጁ የፓነል ዝርዝሮች:" : "Batched Panels for Submission:"}</span>
                          <span className="text-emerald-600 font-mono">
                            {isAmharic ? "ጠቅላላ ስፋት (Total Area):" : "Total Area:"} {tempPanelLogs.reduce((sum, item) => sum + item.calculatedArea, 0).toFixed(2)} m²
                          </span>
                        </div>
                        <div className="max-h-36 overflow-y-auto divide-y divide-slate-100 text-[11px]">
                          {tempPanelLogs.map((item, idx) => (
                            <div key={idx} className="py-1.5 flex justify-between items-center">
                              <div className="font-medium text-slate-700">
                                <span className="text-slate-900 font-bold">{item.panelType}</span>
                                <span className="mx-1 text-slate-400">({item.length}m × {item.width}m)</span>
                                <span className="text-slate-500 font-semibold">× {item.quantity} {isAmharic ? "ፍሬ" : "pcs"}</span>
                                {item.notes && <span className="text-[10px] text-slate-400 block italic">{item.notes}</span>}
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="font-mono font-extrabold text-slate-800">{item.calculatedArea} m²</span>
                                <button 
                                  type="button" 
                                  onClick={() => setTempPanelLogs(prev => prev.filter((_, i) => i !== idx))}
                                  className="text-red-500 hover:text-red-700 font-bold cursor-pointer text-sm"
                                >
                                  ×
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Photo logs upload simulation */}
                  <div className="space-y-2">
                    <label className="block text-slate-700 font-semibold">
                      {isAmharic ? "የእለት ግንባታ ፎቶ መዝገብ" : "Progress Photos & Quality Verification"}
                    </label>
                    <div className="flex flex-wrap gap-2 items-center">
                      <select 
                        value={mockPhotoName}
                        onChange={(e) => setMockPhotoName(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded p-1.5 text-xs text-slate-800 outline-none"
                      >
                        <option value="wall_alignment_done.jpg">wall_alignment_done.jpg</option>
                        <option value="slab_prop_reinforcements.jpg">slab_prop_reinforcements.jpg</option>
                        <option value="wedge_locks_secured.jpg">wedge_locks_secured.jpg</option>
                      </select>
                      
                      <button 
                        type="button"
                        onClick={() => {
                          if (gcPhotos.includes(mockPhotoName)) return;
                          setGcPhotos(prev => [...prev, mockPhotoName]);
                        }}
                        className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-3 py-1.5 rounded flex items-center space-x-1 cursor-pointer"
                      >
                        <Camera size={14} />
                        <span>{isAmharic ? "ፎቶ አክል" : "Attach Site Photo"}</span>
                      </button>
                    </div>

                    {/* Photos list preview */}
                    {selectedZone.progressPhotos.length > 0 || gcPhotos.length > 0 ? (
                      <div className="flex flex-wrap gap-2 pt-2">
                        {selectedZone.progressPhotos.map((p, idx) => (
                          <div key={idx} className="bg-slate-50 border border-slate-200 rounded-lg p-2 flex items-center space-x-1.5 text-[10px] text-slate-600 font-semibold font-mono">
                            <FileImage size={12} className="text-emerald-500" />
                            <span>{p}</span>
                            <span className="text-[8px] bg-emerald-100 text-emerald-800 px-1 rounded uppercase">Saved</span>
                          </div>
                        ))}
                        {gcPhotos.map((p, idx) => (
                          <div key={idx} className="bg-red-50 border border-red-200 rounded-lg p-2 flex items-center space-x-1.5 text-[10px] text-red-600 font-semibold font-mono">
                            <FileImage size={12} className="text-red-500 animate-pulse" />
                            <span>{p}</span>
                            <button 
                              type="button" 
                              onClick={() => setGcPhotos(prev => prev.filter(photo => photo !== p))}
                              className="text-red-500 hover:text-red-700 font-bold ml-1 cursor-pointer"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-400 block">{isAmharic ? "ምንም ፎቶ አልተያያዘም።" : "No active shift photos attached yet."}</span>
                    )}
                  </div>

                  {/* Daily Progress Reports commentary */}
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      {isAmharic ? "እለታዊ መግለጫ / ተጨማሪ ማስታወሻ" : "Daily Progress Notes & Comments"}
                    </label>
                    <textarea 
                      rows={3}
                      value={gcDailyNotes}
                      onChange={(e) => setGcDailyNotes(e.target.value)}
                      placeholder={isAmharic ? "ለምሳሌ፡ ሁሉንም ፓነሎች አሰልፈናል፣ የጥራት ማረጋገጫ አልፏል።" : "Enter notes regarding physical snags, alignment variations, or materials shortages..."}
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800 outline-none focus:bg-white"
                    ></textarea>
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded cursor-pointer shadow-xs transition-colors text-xs uppercase tracking-wider"
                  >
                    {isAmharic ? "የእለት ግንባታ ሪፖርት አቅርብ" : "Submit Daily Site Report"}
                  </button>
                </form>
              </div>
            ) : (
              <div className="bg-white p-6 rounded-2xl border border-slate-100 text-center text-slate-400 lg:col-span-2">
                {isAmharic ? "እባክዎን ከግራ በኩል ዞን ይምረጡ።" : "Please select a construction zone from the left catalog."}
              </div>
            )}

          </div>

        </div>
      )}

    </div>
  );
};
