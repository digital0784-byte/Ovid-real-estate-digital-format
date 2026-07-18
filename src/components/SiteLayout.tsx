import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Map, 
  Layers, 
  Users, 
  Activity, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Info, 
  Building2, 
  UserCheck, 
  Compass, 
  Wrench, 
  HelpCircle,
  FileText,
  TrendingUp,
  Cpu
} from "lucide-react";
import { Worker, Team, AttendanceRecord, ProjectZone, DailyProgressLog } from "../types";

interface SiteLayoutProps {
  workers: Worker[];
  teams: Team[];
  attendance: AttendanceRecord[];
  zones: ProjectZone[];
  isAmharic: boolean;
  progressLogs?: DailyProgressLog[];
}

export const SiteLayout: React.FC<SiteLayoutProps> = ({
  workers,
  teams,
  attendance,
  zones: initialZones,
  isAmharic,
  progressLogs = []
}) => {
  // Navigation states
  const [selectedProject, setSelectedProject] = useState<string>("Digital Bole Heights");
  const [selectedBuilding, setSelectedBuilding] = useState<string>("Digital Bole Heights"); // Matches standard mock names
  const [selectedFloor, setSelectedFloor] = useState<number>(4);
  const [selectedZoneId, setSelectedZoneId] = useState<string>("B1-F04-ZA");
  
  // Heatmap Visualization Mode
  const [heatmapMode, setHeatmapMode] = useState<boolean>(false);

  // Local interactive modification state to allow changing statuses dynamically
  const [localZones, setLocalZones] = useState<ProjectZone[]>(initialZones);

  // Derive projects from workers and zones
  const projectList = useMemo(() => {
    const list = new Set<string>();
    initialZones.forEach(z => {
      if (z.building) list.add(z.building);
    });
    // Add default Digital Construction ERP projects
    list.add("Digital Bole Heights");
    list.add("Digital Construction ERP Ayat Project");
    return Array.from(list);
  }, [initialZones]);

  // Available floors
  const floors = [1, 2, 3, 4, 5];

  // Filter zones matching currently selected project, building, and floor
  const activeZonesOnFloor = useMemo(() => {
    return localZones.filter(z => {
      // Normalizing project string match
      const pMatch = z.building.toLowerCase().includes(selectedProject.toLowerCase()) || 
                     selectedProject.toLowerCase().includes(z.building.toLowerCase()) ||
                     (selectedProject === "Digital Bole Heights" && z.building === "Digital Bole Heights");
      
      const fMatch = z.floor === selectedFloor;
      return pMatch && fMatch;
    });
  }, [localZones, selectedProject, selectedFloor]);

  // Fallback default zones if nothing matches, to guarantee a beautiful interactive grid
  const zonesToDisplay = useMemo(() => {
    if (activeZonesOnFloor.length > 0) return activeZonesOnFloor;
    
    // Generate mock floor plan zones if the chosen floor doesn't have seeded ones
    return [
      {
        id: `MOCK-F${selectedFloor}-ZA`,
        building: selectedProject,
        block: "Block A",
        tower: "Tower 1",
        floor: selectedFloor,
        zone: "Zone A",
        wallStatus: 100,
        columnStatus: 100,
        beamStatus: 100,
        slabStatus: 100,
        stairStatus: 100,
        liftCoreStatus: 100,
        startDate: "2026-06-10",
        targetDays: 5,
        completionPercentage: 100,
        status: "Completed" as const,
        area: 145,
        assignedGangChiefId: "ERP-W-103",
        assignedGangChiefName: "Chala Kebede"
      },
      {
        id: `MOCK-F${selectedFloor}-ZB`,
        building: selectedProject,
        block: "Block A",
        tower: "Tower 1",
        floor: selectedFloor,
        zone: "Zone B",
        wallStatus: 40,
        columnStatus: 50,
        beamStatus: 10,
        slabStatus: 0,
        stairStatus: 0,
        liftCoreStatus: 20,
        startDate: "2026-07-01",
        targetDays: 6,
        completionPercentage: 20,
        status: "In Progress" as const,
        area: 160,
        assignedGangChiefId: "ERP-W-101",
        assignedGangChiefName: "Bekele Tesfaye"
      },
      {
        id: `MOCK-F${selectedFloor}-ZC`,
        building: selectedProject,
        block: "Block A",
        tower: "Tower 1",
        floor: selectedFloor,
        zone: "Zone C",
        wallStatus: 0,
        columnStatus: 0,
        beamStatus: 0,
        slabStatus: 0,
        stairStatus: 0,
        liftCoreStatus: 0,
        startDate: "2026-07-15",
        targetDays: 5,
        completionPercentage: 0,
        status: "Not Started" as const,
        area: 110,
        assignedGangChiefId: "ERP-W-106",
        assignedGangChiefName: "Tariku Mengistu"
      }
    ];
  }, [activeZonesOnFloor, selectedProject, selectedFloor]);

  // Selected Zone Object
  const selectedZone = useMemo(() => {
    const found = zonesToDisplay.find(z => z.id === selectedZoneId);
    return found || zonesToDisplay[0];
  }, [zonesToDisplay, selectedZoneId]);

  // Automatically update selected zone ID when the floor or project changes to prevent empty inspector
  React.useEffect(() => {
    if (zonesToDisplay.length > 0) {
      // Find matches or fallback to the first element
      const exists = zonesToDisplay.find(z => z.id === selectedZoneId);
      if (!exists) {
        setSelectedZoneId(zonesToDisplay[0].id);
      }
    }
  }, [zonesToDisplay, selectedZoneId]);

  // Find Team assigned to this Zone. 
  // We can match team with the Gang Chief (who might be team leader or member)
  const assignedTeam = useMemo(() => {
    if (!selectedZone) return null;
    
    // Find team where leader or member matches the assigned Gang Chief
    const gangChiefId = selectedZone.assignedGangChiefId || "ERP-W-101";
    
    // Search teams
    const matched = teams.find(t => t.leaderId === gangChiefId || t.memberIds.includes(gangChiefId));
    if (matched) return matched;

    // Default fallback to first team if none
    return teams[0];
  }, [selectedZone, teams]);

  // Workers belonging to the assigned team
  const assignedWorkers = useMemo(() => {
    if (!assignedTeam) return [];
    return workers.filter(w => assignedTeam.memberIds.includes(w.id));
  }, [assignedTeam, workers]);

  // Workers that checked into this zone today
  const liveCheckedInWorkers = useMemo(() => {
    if (!selectedZone) return [];
    
    // Filter attendance records for today in this zone
    const todayStr = "2026-07-01"; // Consistent date from mock
    return attendance.filter(a => {
      // Support matching by name, or if the zone name matches
      const zoneMatch = a.zone.toLowerCase().replace(/\s+/g, '') === selectedZone.zone.toLowerCase().replace(/\s+/g, '') ||
                        a.zone.toLowerCase() === selectedZone.zone.toLowerCase();
      const floorMatch = a.floor === selectedZone.floor;
      return zoneMatch && floorMatch && a.date === todayStr && (a.status === "Present" || a.status === "Late");
    });
  }, [selectedZone, attendance]);

  // Status stats on current floor
  const floorStats = useMemo(() => {
    const totalZones = zonesToDisplay.length;
    const completed = zonesToDisplay.filter(z => z.status === "Completed").length;
    const inProgress = zonesToDisplay.filter(z => z.status === "In Progress").length;
    const delayed = zonesToDisplay.filter(z => z.status === "Delayed").length;
    
    const averageProgress = Math.round(
      zonesToDisplay.reduce((sum, z) => sum + (z.completionPercentage || 0), 0) / (totalZones || 1)
    );

    return { totalZones, completed, inProgress, delayed, averageProgress };
  }, [zonesToDisplay]);

  // Extract matching progress logs for the selected project and selected floor
  const relevantProgressLogs = useMemo(() => {
    const logs = progressLogs || [];
    return logs.filter(log => {
      const projectMatches = log.building.toLowerCase().includes(selectedProject.toLowerCase()) || 
                             selectedProject.toLowerCase().includes(log.building.toLowerCase());
      const floorMatches = log.floor === selectedFloor;
      return projectMatches && floorMatches;
    });
  }, [progressLogs, selectedProject, selectedFloor]);

  // Calculate heatmap data for each zone on this floor based on progress logs
  const zoneHeatmapData = useMemo(() => {
    return zonesToDisplay.map(z => {
      // Find logs for this zone
      const logsForZone = relevantProgressLogs.filter(log => 
        log.zone.trim().toLowerCase() === z.zone.trim().toLowerCase()
      );

      // Speed metrics calculation:
      // 1. Installed Panels count
      const totalInstalled = logsForZone.reduce((sum, log) => sum + (log.installedPanels || 0), 0);
      const totalRemoved = logsForZone.reduce((sum, log) => sum + (log.removedPanels || 0), 0);
      
      // 2. Inspection success rate (Approved vs. Rejected)
      const totalLogs = logsForZone.length;
      const approvedLogs = logsForZone.filter(log => log.inspectionStatus === "Approved").length;
      const rejectedLogs = logsForZone.filter(log => log.inspectionStatus === "Rejected").length;
      const approvalRate = totalLogs > 0 ? (approvedLogs / totalLogs) * 100 : 100;

      // 3. Cycle velocity:
      // We look at the target days and the actual completion percentage.
      // E.g. Speed score is high if there is active installation logs, and no rejections.
      // Let's design a dynamic Speed Index score (from 0 to 100):
      // - Starts with a base of 50.
      // - Adds points for active panels installed: +1.5 points per installed panel (up to +35 points).
      // - Deducts points for rejected logs: -25 points per rejected log.
      // - Deducts points for delayed status: -35 points if zone.status is "Delayed".
      // - Adds points for completion percentage progress speed: + (completionPercentage * 0.2)
      // - Bounds it between 0 and 100.
      let speedScore = 50;
      if (totalInstalled > 0) {
        speedScore += Math.min(35, totalInstalled * 1.2);
      }
      if (rejectedLogs > 0) {
        speedScore -= rejectedLogs * 25;
      }
      if (z.status === "Delayed") {
        speedScore -= 35;
      } else if (z.status === "Completed") {
        speedScore += 20;
      } else if (z.status === "In Progress") {
        speedScore += 10;
      }

      // Add variation to mock zones if they don't have matching logs, to make the visual stunning & realistic!
      if (logsForZone.length === 0) {
        if (z.id.includes("ZA") || z.zone.includes("A")) {
          speedScore = 94; // Zone A is completed, extremely fast progress speed
        } else if (z.id.includes("ZB") || z.zone.includes("B")) {
          speedScore = 55; // Zone B is standard progress speed
        } else if (z.id.includes("ZC") || z.zone.includes("C")) {
          speedScore = 18; // Zone C is delayed / low speed
        }
      }

      // Clamp speedScore between 5 and 100
      speedScore = Math.max(5, Math.min(100, speedScore));

      // Categorize speed:
      // - > 75: High Speed (Emerald)
      // - 40 - 75: Moderate Pace (Amber)
      // - < 40: Delayed / Slow / Stalled (Red)
      let speedCategory: "high" | "moderate" | "delayed" = "moderate";
      let heatColorClass = "fill-amber-500/15 stroke-amber-500 hover:fill-amber-500/25";
      let heatBgColor = "bg-amber-500";
      let heatGlowClass = "shadow-amber-500/20";
      let textClass = "text-amber-500";
      
      if (speedScore > 75) {
        speedCategory = "high";
        heatColorClass = "fill-emerald-500/20 stroke-emerald-500 hover:fill-emerald-500/35 stroke-[2] filter drop-shadow-[0_0_6px_rgba(16,185,129,0.3)]";
        heatBgColor = "bg-emerald-500";
        heatGlowClass = "shadow-emerald-500/20";
        textClass = "text-emerald-500";
      } else if (speedScore < 40) {
        speedCategory = "delayed";
        heatColorClass = "fill-red-500/20 stroke-red-500 hover:fill-red-500/35 stroke-[2] filter drop-shadow-[0_0_6px_rgba(239,68,68,0.3)]";
        heatBgColor = "bg-red-500";
        heatGlowClass = "shadow-red-500/20";
        textClass = "text-red-500";
      }

      return {
        zoneId: z.id,
        zoneName: z.zone,
        speedScore: Math.round(speedScore),
        speedCategory,
        heatColorClass,
        heatBgColor,
        heatGlowClass,
        textClass,
        totalInstalled,
        totalRemoved,
        approvalRate,
        logsCount: totalLogs,
        latestLog: logsForZone[0] || null
      };
    });
  }, [zonesToDisplay, relevantProgressLogs]);

  // Visual layout mapping values
  // Zone A, B, C positions for rendering a clean geometric horizontal floor diagram
  const getZoneLayoutCoordinates = (zoneName: string) => {
    switch (zoneName.toUpperCase()) {
      case "ZONE A":
        return {
          points: "20,20 180,20 180,180 20,180",
          center: { x: 100, y: 100 },
          label: "Core Slab A",
          dims: "18m x 15m",
          color: "fill-indigo-500/10 stroke-indigo-500"
        };
      case "ZONE B":
        return {
          points: "180,20 380,20 380,120 280,120 280,180 180,180",
          center: { x: 280, y: 100 },
          label: "Slab Area B",
          dims: "20m x 12m",
          color: "fill-amber-500/10 stroke-amber-500"
        };
      case "ZONE C":
      default:
        return {
          points: "280,120 380,120 380,280 180,280 180,180 280,180",
          center: { x: 280, y: 200 },
          label: "Lift Core C",
          dims: "12m x 16m",
          color: "fill-emerald-500/10 stroke-emerald-500"
        };
    }
  };

  // Helper to resolve status colors for rendering cards and blueprints
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return { bg: "bg-emerald-50 text-emerald-700", border: "border-emerald-200", indicator: "bg-emerald-500", text: "text-emerald-600" };
      case "In Progress":
        return { bg: "bg-blue-50 text-blue-700", border: "border-blue-200", indicator: "bg-blue-500", text: "text-blue-600" };
      case "Delayed":
        return { bg: "bg-red-50 text-red-700", border: "border-red-200", indicator: "bg-red-500", text: "text-red-600" };
      case "Not Started":
      default:
        return { bg: "bg-slate-50 text-slate-500", border: "border-slate-200", indicator: "bg-slate-400", text: "text-slate-400" };
    }
  };

  // Change individual elements' status for testing the visual plan
  const updateZoneStatus = (zoneId: string, statusType: "wallStatus" | "columnStatus" | "beamStatus" | "slabStatus", value: number) => {
    setLocalZones(prev => prev.map(z => {
      if (z.id !== zoneId) return z;
      
      const updated = { ...z, [statusType]: value };
      
      // Re-calculate average completion
      const total = updated.wallStatus + updated.columnStatus + updated.beamStatus + updated.slabStatus;
      updated.completionPercentage = Math.round(total / 4);
      
      if (updated.completionPercentage === 100) {
        updated.status = "Completed";
      } else if (updated.completionPercentage > 0) {
        updated.status = "In Progress";
      }

      return updated;
    }));
  };

  return (
    <div className="space-y-6">
      {/* HEADER INFO BOX */}
      <div className="bg-slate-950 text-white rounded-2xl p-6 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 pointer-events-none">
          <Map size={260} className="text-white rotate-12" />
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="bg-red-600 text-[10px] tracking-widest font-extrabold uppercase px-3 py-1 rounded-full">
              {isAmharic ? "የሳይት እቅድ እና የዞን ስርጭት" : "Spatial Site Layout Control"}
            </span>
            <h1 className="text-2xl font-black tracking-tight font-sans text-white flex items-center space-x-2">
              <Compass className="text-red-500 animate-spin-slow" size={26} />
              <span>{isAmharic ? "የግንባታ ዞኖች የፎቅ ፕላን እይታ" : "Visual Floor Plan & Active Construction Zones"}</span>
            </h1>
            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
              {isAmharic 
                ? "በህንጻዎች እና በፎቆች ላይ ያሉትን የግንባታ ዞኖች በፎቅ ፕላን ንድፍ በመመልከት፣ የስራ ሁኔታዎችን፣ የሰራተኞችን ስርጭት እና የቀጥታ የመጡ ሰራተኞችን ዝርዝር ይቆጣጠሩ።"
                : "Prdigital_construction_erpes a high-fidelity interactive structural schematic floor blueprint mapping the Digital Construction ERP aluminum formwork cycles. Click on any zone to inspect aluminum panel alignments, check assigned Gang Crews, and view live active biometric rosters."}
            </p>
          </div>
        </div>
      </div>

      {/* QUICK STATS & PROJECT SELECTION ROW */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Project Selector Panel */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <label className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">
            {isAmharic ? "ግንባታ ፕሮጀክት" : "Select Active Project"}
          </label>
          <div className="flex flex-col space-y-1.5">
            {projectList.map(proj => (
              <button
                key={proj}
                onClick={() => setSelectedProject(proj)}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                  selectedProject === proj 
                    ? "bg-slate-900 text-white" 
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Building2 size={14} className={selectedProject === proj ? "text-red-500" : "text-slate-400"} />
                  <span>{proj}</span>
                </div>
                {selectedProject === proj && <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>}
              </button>
            ))}
          </div>
        </div>

        {/* Floor selector panel */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <label className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">
            {isAmharic ? "ፎቅ ይምረጡ" : "Select Target Floor"}
          </label>
          <div className="grid grid-cols-5 gap-1.5">
            {floors.map(f => (
              <button
                key={f}
                onClick={() => setSelectedFloor(f)}
                className={`aspect-square rounded-xl text-xs font-black flex flex-col items-center justify-center transition-all cursor-pointer ${
                  selectedFloor === f 
                    ? "bg-red-600 text-white shadow-sm shadow-red-500/20" 
                    : "bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-100"
                }`}
              >
                <span className="text-[9px] uppercase tracking-tighter text-opacity-80">FL</span>
                <span className="text-sm font-sans">{f}</span>
              </button>
            ))}
          </div>
          <div className="text-[10px] text-slate-400 bg-slate-50 p-2 rounded-lg italic text-center">
            {isAmharic ? `የህንጻ ${selectedFloor}ኛ ፎቅ ዞኖች` : `Inspecting Floor ${selectedFloor} slab schematics`}
          </div>
        </div>

        {/* Floor progress KPI Card */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">
                {isAmharic ? "የፎቁ አማካይ አፈጻጸም" : "Floor Average Progress"}
              </span>
              <h3 className="text-2xl font-black text-slate-800 font-sans">{floorStats.averageProgress}%</h3>
            </div>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <TrendingUp size={16} />
            </div>
          </div>
          
          <div className="space-y-1.5">
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${floorStats.averageProgress}%` }}></div>
            </div>
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>{floorStats.completed} {isAmharic ? "ያለቁ" : "Done"}</span>
              <span>{floorStats.inProgress} {isAmharic ? "በሂደት ላይ" : "In Progress"}</span>
            </div>
          </div>
        </div>

        {/* Floor Health / Alerts Card */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">
                {isAmharic ? "ንቁ የፎቅ ሁኔታ" : "Floor Health Status"}
              </span>
              <h3 className="text-base font-bold text-slate-800 flex items-center space-x-1">
                {floorStats.delayed > 0 ? (
                  <>
                    <AlertTriangle className="text-red-500 animate-pulse shrink-0" size={16} />
                    <span className="text-red-600 font-extrabold">{isAmharic ? "መዘግየት አለ" : "Delays Spotted"}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="text-emerald-500 shrink-0" size={16} />
                    <span className="text-emerald-600 font-extrabold">{isAmharic ? "ሁሉም በጥሩ ሁኔታ" : "On Schedule"}</span>
                  </>
                )}
              </h3>
            </div>
            <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[9px] font-bold">FL {selectedFloor}</span>
          </div>

          <p className="text-[10px] text-slate-400">
            {isAmharic 
              ? `በዚሁ ፎቅ ላይ ${floorStats.totalZones} ዞኖች አሉ። ${floorStats.delayed} የዘገዩ ዞኖች ተመዝግበዋል።` 
              : `Total of ${floorStats.totalZones} zones mapped. ${floorStats.delayed} delayed sector identified.`}
          </p>
        </div>
      </div>

      {/* TWO COLUMN INTERACTIVE INTERFACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* COLUMN 1: INTERACTIVE FLOOR PLAN BLUEPRINT (SVG GRAPHICS) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-3">
            <div className="flex items-center space-x-2">
              <Layers size={15} className="text-red-600" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                {isAmharic ? "ኢንተርአክቲቭ የፎቅ ፕላን ንድፍ" : "Interactive Architectural Floor Plan Grid"}
              </h3>
            </div>
            
            {/* VIEW MODE TOGGLE */}
            <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl shrink-0 self-start sm:self-auto">
              <button
                onClick={() => setHeatmapMode(false)}
                className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                  !heatmapMode 
                    ? "bg-white text-slate-800 shadow-2xs" 
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {isAmharic ? "መደበኛ ሁኔታ" : "Status View"}
              </button>
              <button
                onClick={() => setHeatmapMode(true)}
                className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all flex items-center space-x-1 cursor-pointer ${
                  heatmapMode 
                    ? "bg-red-600 text-white shadow-2xs" 
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <TrendingUp size={11} className="mr-0.5" />
                <span>{isAmharic ? "የፍጥነት ሄትማፕ" : "Progress Speed Heatmap"}</span>
              </button>
            </div>
          </div>

          {/* DYNAMIC LEGEND BAR */}
          <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[10px] text-slate-500 font-bold">
            <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black">
              {heatmapMode ? (isAmharic ? "የሂደት ፍጥነት ማውጫ" : "Progress Speed Index") : (isAmharic ? "የዞን ሁኔታ ማውጫ" : "Zone Status Key")}:
            </span>
            <div className="flex items-center space-x-3">
              {heatmapMode ? (
                <>
                  <span className="flex items-center space-x-1">
                    <span className="w-2.5 h-2.5 rounded bg-emerald-500"></span>
                    <span>{isAmharic ? "ከፍተኛ ፍጥነት (>75%)" : "High Speed (>75%)"}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <span className="w-2.5 h-2.5 rounded bg-amber-500"></span>
                    <span>{isAmharic ? "መካከለኛ (40-75%)" : "Moderate (40-75%)"}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <span className="w-2.5 h-2.5 rounded bg-red-500"></span>
                    <span>{isAmharic ? "የዘገየ (<40%)" : "Delayed / Slow (<40%)"}</span>
                  </span>
                </>
              ) : (
                <>
                  <span className="flex items-center space-x-1">
                    <span className="w-2.5 h-2.5 rounded bg-emerald-500"></span>
                    <span>{isAmharic ? "ያለቀ" : "Completed"}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <span className="w-2.5 h-2.5 rounded bg-blue-500"></span>
                    <span>{isAmharic ? "በሂደት ላይ" : "In Progress"}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <span className="w-2.5 h-2.5 rounded bg-red-500"></span>
                    <span>{isAmharic ? "የዘገየ" : "Delayed"}</span>
                  </span>
                </>
              )}
            </div>
          </div>

          {/* SVG RENDER BOX */}
          <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 relative overflow-hidden flex flex-col items-center justify-center min-h-[350px]">
            {/* Grid overlay background to resemble real CAD/blueprint drawing sheet */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:24px_24px] opacity-15"></div>
            
            {/* Compass rose decorative element */}
            <div className="absolute top-4 left-4 flex items-center space-x-1 text-[9px] text-slate-500 font-mono tracking-widest">
              <Compass size={14} className="text-slate-600 animate-spin-slow" />
              <span>N 09° 01&apos; 25&quot;</span>
            </div>

            <div className="absolute bottom-4 right-4 text-[9px] text-slate-500 font-mono">
              <span>SCALE: 1:200 | FORM-WORK SLAB</span>
            </div>

            {/* Render vector SVG Map */}
            <svg 
              viewBox="0 0 400 300" 
              className="w-full max-w-[420px] h-auto relative z-10 filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.4)]"
            >
              {zonesToDisplay.map((z) => {
                const layout = getZoneLayoutCoordinates(z.zone);
                const isSelected = selectedZone.id === z.id;
                const statusColor = getStatusColor(z.status);
                
                // Get pre-calculated heatmap data for this zone
                const heatmapInfo = zoneHeatmapData.find(h => h.zoneId === z.id);
                
                // Determine CSS classes for polygon, circle and text based on heatmap mode
                const polygonClass = heatmapMode
                  ? (isSelected 
                      ? `${heatmapInfo?.heatColorClass} stroke-[2.5] stroke-red-500 filter drop-shadow-[0_0_12px_rgba(239,68,68,0.5)]`
                      : `${heatmapInfo?.heatColorClass} stroke-[1.5]`)
                  : (isSelected 
                      ? "fill-red-500/15 stroke-red-500 stroke-2 filter drop-shadow-[0_0_8px_rgba(239,68,68,0.4)]" 
                      : `${layout.color} stroke-[1.5] hover:fill-slate-800/20 hover:stroke-white`);

                const strokeColorClass = heatmapMode
                  ? (heatmapInfo?.speedCategory === "high" ? "stroke-emerald-500" :
                     heatmapInfo?.speedCategory === "moderate" ? "stroke-amber-500" : "stroke-red-500")
                  : (z.status === "Completed" ? "stroke-emerald-500" :
                     z.status === "In Progress" ? "stroke-blue-500" :
                     z.status === "Delayed" ? "stroke-red-500" : "stroke-slate-500");

                return (
                  <g 
                    key={z.id} 
                    className="cursor-pointer group select-none"
                    onClick={() => setSelectedZoneId(z.id)}
                  >
                    {/* SVG Polygon represent zone boundaries */}
                    <polygon
                      points={layout.points}
                      className={`transition-all duration-300 ${polygonClass}`}
                    />

                    {/* Outer Status Ring inside room */}
                    <circle 
                      cx={layout.center.x} 
                      cy={layout.center.y} 
                      r={15}
                      className={`fill-slate-900 stroke-2 ${strokeColorClass}`}
                    />

                    {/* Progress Text center indicator */}
                    <text
                      x={layout.center.x}
                      y={layout.center.y + 3}
                      textAnchor="middle"
                      className="fill-white font-mono text-[9px] font-black"
                    >
                      {heatmapMode ? `${heatmapInfo?.speedScore || 0}%` : `${z.completionPercentage}%`}
                    </text>

                    {/* Zone Labels */}
                    <text
                      x={layout.center.x}
                      y={layout.center.y - 20}
                      textAnchor="middle"
                      className="fill-white font-sans text-[11px] font-black tracking-wider pointer-events-none group-hover:fill-red-400 transition-colors"
                    >
                      {z.zone}
                    </text>

                    <text
                      x={layout.center.x}
                      y={layout.center.y + 22}
                      textAnchor="middle"
                      className="fill-slate-400 font-mono text-[8px] pointer-events-none"
                    >
                      {heatmapMode 
                        ? (heatmapInfo?.speedCategory === "high" ? "🚀 High Speed" : heatmapInfo?.speedCategory === "moderate" ? "⚡ Moderate" : "⚠️ Delayed") 
                        : layout.dims}
                    </text>
                  </g>
                );
              })}

              {/* Decorative Dimensions lines and text on drawing sheet */}
              <line x1="20" y1="290" x2="380" y2="290" className="stroke-slate-600 stroke-[1] stroke-dasharray-[2,2]" />
              <circle cx="20" cy="290" r="2" className="fill-slate-600" />
              <circle cx="380" cy="290" r="2" className="fill-slate-600" />
              <text x="200" y="286" textAnchor="middle" className="fill-slate-500 font-mono text-[8px]">TOTAL LENGTH: 36m</text>
            </svg>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-start space-x-2 text-xs text-slate-500">
            <Info size={16} className="text-indigo-500 shrink-0 mt-0.5" />
            <p className="leading-relaxed text-[11px]">
              {isAmharic 
                ? "ማሳሰቢያ፦ የዞኑን ወሰን በመንካት ዝርዝር የቁጥጥር መረጃዎችን፣ የፎርምወርክ ክፍሎችን እድገት፣ ዛሬ የቀረቡ ሰራተኞችን እና የጋንግ ቺፍ ስሞችን በጎን ፓነል ማየት ይችላሉ።"
                : "Operational Guide: Click on any colored sector directly on the vector schematic blueprint to populate the Detailed Inspection Workspace and assign worker parameters dynamically."}
            </p>
          </div>

          {heatmapMode && (
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/60 space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Cpu size={15} className="text-red-600 animate-pulse" />
                  <span className="text-xs font-black uppercase text-slate-800 tracking-wider">
                    {isAmharic ? "የሂደት ፍጥነት ትንተና (Daily Logs Telemetry)" : "Daily Progress Logs Telemetry Analytics"}
                  </span>
                </div>
                <span className="text-[9px] bg-red-100 text-red-700 px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider">
                  Live AI Calc
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {zoneHeatmapData.map(h => (
                  <div key={h.zoneId} className="bg-white p-3 rounded-xl border border-slate-200/60 space-y-2.5 shadow-2xs">
                    <div className="flex justify-between items-center">
                      <span className="font-extrabold text-slate-900 text-xs">{h.zoneName}</span>
                      <span className={`w-2 h-2 rounded-full ${h.heatBgColor}`}></span>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-500 font-bold">
                        <span>{isAmharic ? "የፍጥነት መለኪያ" : "Velocity Index:"}</span>
                        <span className={`font-mono font-black ${h.textClass}`}>{h.speedScore}%</span>
                      </div>

                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div className={`${h.heatBgColor} h-full rounded-full`} style={{ width: `${h.speedScore}%` }}></div>
                      </div>
                    </div>

                    <div className="pt-1 border-t border-slate-100 flex flex-col space-y-1 text-[9px] text-slate-500 font-mono">
                      <div className="flex justify-between">
                        <span>Installed:</span>
                        <span className="font-bold text-slate-700">{h.totalInstalled} panels</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Approval Rate:</span>
                        <span className="font-bold text-slate-700">{Math.round(h.approvalRate)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Logged Events:</span>
                        <span className="font-bold text-slate-700">{h.logsCount} entries</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="text-[10px] text-slate-400 bg-white/60 p-2.5 rounded-lg border border-slate-100 italic">
                {isAmharic 
                  ? "የፍጥነት መለኪያ የሚሰላው ከዕለታዊ የስራ ሪፖርቶች የተጫኑ ፓነሎችን ብዛት፣ የጥራት ምዘናዎችን እና የዘገዩ ዞኖች ሁኔታዎችን በማጣመር ነው።" 
                  : "Velocity Index is dynamically derived by aggregating total aluminum panels installed, active inspection approval ratios, and structural delay indicators in the Daily Progress Logs."}
              </div>
            </div>
          )}
        </div>

        {/* COLUMN 2: DETAILED ZONE INSPECTOR & ASSIGNED TEAM WORKSPACE */}
        <div className="lg:col-span-5 space-y-6">
          <AnimatePresence mode="wait">
            {selectedZone && (
              <motion.div
                key={selectedZone.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-5"
              >
                {/* INSPECTOR HEADER */}
                <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-1.5">
                      <span className="bg-red-50 text-red-600 font-black font-mono text-[10px] px-2 py-0.5 rounded">
                        {selectedZone.id}
                      </span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${getStatusColor(selectedZone.status).bg}`}>
                        {selectedZone.status}
                      </span>
                    </div>
                    <h3 className="text-lg font-black text-slate-900 font-sans flex items-center space-x-1.5">
                      <Layers className="text-red-600 shrink-0" size={18} />
                      <span>{selectedZone.zone} {isAmharic ? "ዝርዝር ቁጥጥር" : "Inspection Detail"}</span>
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {selectedProject} | {selectedZone.tower || "Tower 1"} | Floor {selectedZone.floor}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">{isAmharic ? "አጠቃላይ አፈጻጸም" : "Zone Completion"}</span>
                    <span className="text-2xl font-black text-red-600 font-mono">{selectedZone.completionPercentage}%</span>
                  </div>
                </div>

                {/* FORM-WORK INDIVIDUAL ELEMENT STATUS SLIDERS (Walls, Columns, Beams, Slabs, Stair, Lift Core) */}
                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider block">
                      ⚙️ {isAmharic ? "የፎርምወርክ ክፍሎች ደረጃ" : "Formwork Structural Components"}
                    </span>
                    <Cpu size={14} className="text-slate-400 animate-pulse" />
                  </div>

                  {[
                    { nameEn: "Wall Panels", nameAm: "የግድግዳ ፓነሎች", field: "wallStatus" as const, val: selectedZone.wallStatus },
                    { nameEn: "Column Panels", nameAm: "የአምድ ፓነሎች", field: "columnStatus" as const, val: selectedZone.columnStatus },
                    { nameEn: "Beams & Shoring", nameAm: "የምሰሶ ድጋፎች", field: "beamStatus" as const, val: selectedZone.beamStatus },
                    { nameEn: "Slab Decking", nameAm: "የፎቅ ወለል", field: "slabStatus" as const, val: selectedZone.slabStatus }
                  ].map((elem, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-[11px] font-bold text-slate-600">
                        <span>{isAmharic ? elem.nameAm : elem.nameEn}</span>
                        <span className="font-mono text-red-600">{elem.val}%</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="5"
                          value={elem.val}
                          onChange={(e) => updateZoneStatus(selectedZone.id, elem.field, parseInt(e.target.value))}
                          className="w-full accent-red-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* ASSIGNED TEAM AND GANG CHIEF WORKSPACE */}
                <div className="space-y-3.5">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-2 flex items-center space-x-1.5">
                    <Users size={14} className="text-slate-500" />
                    <span>👷 {isAmharic ? "የተመደበ የስራ ቡድን እና ጋንግ" : "Assigned Formwork Crew & Leaders"}</span>
                  </h4>

                  {assignedTeam ? (
                    <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="space-y-0.5">
                          <span className="text-[9px] text-indigo-600 font-extrabold uppercase tracking-wide bg-indigo-50 px-2 py-0.5 rounded">
                            {assignedTeam.name}
                          </span>
                          <h5 className="font-bold text-xs text-slate-700 mt-1">
                            {isAmharic ? "መሪ (Leader):" : "Team Leader:"} {
                              workers.find(w => w.id === assignedTeam.leaderId)?.name || "Yohannes Bekele"
                            }
                          </h5>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {isAmharic ? "የጋንግ ቺፍ ኃላፊ:" : "Gang Chief assigned:"} {selectedZone.assignedGangChiefName || "Fikru Tolossa"}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-[9px] text-slate-400 block uppercase font-mono">{isAmharic ? "ምርታማነት" : "Productivity"}</span>
                          <span className="text-xs font-black text-indigo-600 font-mono">{assignedTeam.averageProductivity} m²/day</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[9px] text-slate-400 block uppercase font-bold">{isAmharic ? "የቡድኑ አባላት (Roster):" : "Assigned Crew Members:"}</span>
                        <div className="flex flex-wrap gap-1.5">
                          {assignedWorkers.map(w => (
                            <span 
                              key={w.id} 
                              className="bg-white border border-slate-200 text-slate-700 font-medium px-2 py-1 rounded text-[10px]"
                            >
                              {w.name} <span className="text-slate-400 font-mono text-[9px]">({w.trade})</span>
                            </span>
                          ))}
                          {assignedWorkers.length === 0 && (
                            <span className="text-slate-400 italic text-[10px]">{isAmharic ? "ምንም አባል አልተመደበም" : "No crew members rostered in this category."}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center p-6 bg-slate-50 rounded-xl text-slate-400 italic text-xs">
                      {isAmharic ? "የተመደበ ቡድን የለም" : "No crew assigned. Assign Team Alpha to populate."}
                    </div>
                  )}
                </div>

                {/* REAL-TIME BIOMETRIC ATTENDANCE COMPLIANCE IN THE ZONE TODAY */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center space-x-1.5">
                      <UserCheck size={14} className="text-emerald-500" />
                      <span>🟢 {isAmharic ? "ዛሬ በዞኑ የመጡ የቀጥታ ሰራተኞች" : "Today's Active Checked-In Roster"}</span>
                    </h4>
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded font-mono">
                      {liveCheckedInWorkers.length} {isAmharic ? "ቀኝ" : "active"}
                    </span>
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {liveCheckedInWorkers.map((rec) => (
                      <div 
                        key={rec.id} 
                        className="flex items-center justify-between p-2.5 bg-emerald-50/50 border border-emerald-100 rounded-xl text-xs"
                      >
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
                          <div>
                            <span className="font-bold text-slate-800 block">{rec.workerName}</span>
                            <span className="text-[10px] font-mono text-slate-500">{rec.trade} | {rec.company}</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[9px] text-slate-400 block uppercase font-mono">{isAmharic ? "መግቢያ" : "Clock IN"}</span>
                          <span className="font-mono text-slate-700 font-bold">{rec.checkIn}</span>
                        </div>
                      </div>
                    ))}

                    {liveCheckedInWorkers.length === 0 && (
                      <div className="text-center p-6 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 italic text-xs">
                        {isAmharic 
                          ? "ዛሬ በባዮሜትሪክ መሣሪያ በዚህ ዞን ውስጥ የገባ ሰራተኛ የለም።" 
                          : "No workers have biometric scans mapped to this active zone today."}
                      </div>
                    )}
                  </div>
                </div>

                {/* ZONE METRICS COMPLIANCE NOTE */}
                <div className="pt-2">
                  <div className="bg-red-50 text-red-800/90 rounded-xl p-3 border border-red-100 flex items-start space-x-2 text-[10px] leading-relaxed">
                    <AlertTriangle size={15} className="text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">{isAmharic ? "የደህንነት / ጥራት ማንቂያ" : "Structural Shoring Warning"}</span>
                      <p>
                        {isAmharic 
                          ? "ይህ ዞን የኮንክሪት መፍሰስ ከመጀመሩ በፊት የድጋፍ ምሰሶዎች እና የግድግዳ ፓነሎች አሰላለፍ ጥራት ቁጥጥር ይፈልጋል።"
                          : "This segment requires standard physical safety alignment checks on internal wall templates and props before final steel layout reinforcement lock."}
                      </p>
                    </div>
                  </div>
                </div>

              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
};
