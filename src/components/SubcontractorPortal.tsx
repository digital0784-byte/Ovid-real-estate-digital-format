import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Worker, 
  ProjectZone, 
  AttendanceRecord, 
  QualitySnag, 
  DailyProgressLog,
  UserRole
} from "../types";
import { 
  Building2, 
  Lock, 
  Unlock, 
  Filter, 
  Layers, 
  CheckCircle2, 
  AlertTriangle, 
  Users, 
  Clock, 
  Send, 
  Plus, 
  Grid, 
  Sparkles, 
  ChevronRight, 
  ChevronDown,
  Check, 
  ArrowRight,
  TrendingUp,
  FileText,
  Briefcase
} from "lucide-react";

interface SubcontractorPortalProps {
  workers: Worker[];
  zones: ProjectZone[];
  attendance: AttendanceRecord[];
  qualitySnags: QualitySnag[];
  progressLogs: DailyProgressLog[];
  isAmharic: boolean;
  currentUserRole: UserRole;
  onAddLog: (log: DailyProgressLog) => Promise<void>;
  onAddSnag: (snag: QualitySnag) => Promise<void>;
  onUpdateZone: (zone: ProjectZone) => Promise<void>;
  onLogAction: (action: string, details: string) => void;
}

interface WorkPackage {
  id: string;
  titleEn: string;
  titleAm: string;
  descriptionEn: string;
  descriptionAm: string;
  subcontractorId: string;
  zoneId: string;
  allocatedZone: string;
  targetDays: number;
  startDate: string;
  completionPercentage: number;
  status: "Not Started" | "In Progress" | "Completed" | "Delayed";
  scopeEn: string;
  scopeAm: string;
  panelsRequired: number;
  safetyCheckPassed: boolean;
}

export function SubcontractorPortal({
  workers,
  zones,
  attendance,
  qualitySnags,
  progressLogs,
  isAmharic,
  currentUserRole,
  onAddLog,
  onAddSnag,
  onUpdateZone,
  onLogAction
}: SubcontractorPortalProps) {

  // List of Subcontractor Companies
  const subcontractors = useMemo(() => [
    { 
      id: "sub-1", 
      nameEn: "Bole Formwork Specialists", 
      nameAm: "የቦሌ ፎርምወርክ ባለሙያዎች", 
      lead: "Alula Kebede", 
      passcode: "1234", 
      zones: ["Zone A"],
      primaryTrade: "Carpenter"
    },
    { 
      id: "sub-2", 
      nameEn: "Saris Concrete Pourers", 
      nameAm: "የሳሪስ ኮንክሪት አፍሳሾች", 
      lead: "Selamawit Tekle", 
      passcode: "2345", 
      zones: ["Zone B"],
      primaryTrade: "Concrete Worker"
    },
    { 
      id: "sub-3", 
      nameEn: "Mercato Steel Erectors", 
      nameAm: "የመርካቶ ብረት ገጣሚዎች", 
      lead: "Yonas Alemu", 
      passcode: "3456", 
      zones: ["Zone C"],
      primaryTrade: "Steel Fixer"
    }
  ], []);

  // Work Packages Seed Data
  const [workPackages, setWorkPackages] = useState<WorkPackage[]>([
    {
      id: "WP-101",
      titleEn: "Aluminum Wall Panel Erection",
      titleAm: "የአሉሚኒየም ግድግዳ ፓነል መግጠም",
      descriptionEn: "Rigging and assembling 120sq.m of wall formwork panels for floor 4.",
      descriptionAm: "ለፎቅ 4 120 ካሬ ሜትር የግድግዳ ፎርምወርክ ፓነሎችን መገጣጠም እና ማሰር።",
      subcontractorId: "sub-1",
      zoneId: "B1-F04-ZA",
      allocatedZone: "Zone A",
      targetDays: 6,
      startDate: "2026-06-25",
      completionPercentage: 90,
      status: "In Progress",
      scopeEn: "Aesthetic vertical leveling, pin wedge tightening, joint seal verification",
      scopeAm: "የአሰላለፍ ደረጃን ማስተካከል፣ መቆለፊያዎችን ማጥበቅ፣ እና የመጋጠሚያዎችን ዝግጁነት ማረጋገጥ",
      panelsRequired: 145,
      safetyCheckPassed: true
    },
    {
      id: "WP-102",
      titleEn: "Slab Deck Prop Rigging",
      titleAm: "የሰሌዳ ድጋፍ መዝጊያ ዝግጅት (Deck Propping)",
      descriptionEn: "Deploying quick-release prop beams and deck panels in Floor 4 Zone A.",
      descriptionAm: "በፎቅ 4 ዞን ሀ ላይ ፈጣን መፍቻ ያላቸውን የድጋፍ ምሶሶዎችና ፓነሎች ማቆም።",
      subcontractorId: "sub-1",
      zoneId: "B1-F04-ZA",
      allocatedZone: "Zone A",
      targetDays: 4,
      startDate: "2026-06-28",
      completionPercentage: 75,
      status: "In Progress",
      scopeEn: "Erect scaffolding, lock support pins, align standard joints",
      scopeAm: "የማቆሚያዎች መዘርጋት፣ የድጋፍ መቆለፊያዎችን ማጥበቅ፣ መጋጠሚያዎችን ማስተካከል",
      panelsRequired: 80,
      safetyCheckPassed: true
    },
    {
      id: "WP-201",
      titleEn: "Shear Wall Concrete Pouring",
      titleAm: "የሸርዎል (Shear Wall) ኮንክሪት ሙሌት",
      descriptionEn: "Pouring high-flow concrete with manual vibrating compaction in Floor 4 Zone B.",
      descriptionAm: "በፎቅ 4 ዞን ለ ላይ የኮንክሪት ሙሌት ማፍሰስና በቫይብሬተር ማደቅደቅ።",
      subcontractorId: "sub-2",
      zoneId: "B1-F04-ZB",
      allocatedZone: "Zone B",
      targetDays: 3,
      startDate: "2026-07-02",
      completionPercentage: 40,
      status: "In Progress",
      scopeEn: "Slurry level control, expansion pressure monitoring, formwork joint check",
      scopeAm: "የደለል መጠን መቆጣጠር፣ የግፊት መጠን መከታተል፣ የፎርምወርክ መጋጠሚያዎች ቁጥጥር",
      panelsRequired: 65,
      safetyCheckPassed: true
    },
    {
      id: "WP-301",
      titleEn: "Slab & Column Reinforcement Rebar",
      titleAm: "የሰሌዳና አምድ የብረት ማጠናከሪያ ዝርጋታ (Rebar)",
      descriptionEn: "Bending and tying heavy rebar meshes to prepare for aluminum column lock panels.",
      descriptionAm: "ለአሉሚኒየም አምድ መቆለፊያ ፓነሎች ዝግጁ ለማድረግ የብረት ዝርግዎችን ማጠፍና ማሰር።",
      subcontractorId: "sub-3",
      zoneId: "B1-F04-ZC",
      allocatedZone: "Zone C",
      targetDays: 5,
      startDate: "2026-07-05",
      completionPercentage: 10,
      status: "Not Started",
      scopeEn: "Bar bending list compliance, spacer blocks placement, column cage tie checks",
      scopeAm: "የብረት ማጠፍ ዝርዝርን መከተል፣ የስፔሰር ድንጋዮች መደርደር፣ የአምድ ብረት ማሰሪያዎችን መፈተሽ",
      panelsRequired: 110,
      safetyCheckPassed: false
    }
  ]);

  // Auth/Restricted Portal Access States
  const [isAuthenticatedSub, setIsAuthenticatedSub] = useState(false);
  const [selectedSubId, setSelectedSubId] = useState("sub-1");
  const [passcode, setPasscode] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);

  // Portal View Filters
  const currentSub = useMemo(() => subcontractors.find(s => s.id === selectedSubId), [selectedSubId, subcontractors]);
  const [selectedZoneIds, setSelectedZoneIds] = useState<string[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Daily Logging form inside portal
  const [logProgressOpen, setLogProgressOpen] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState("");
  const [installedCount, setInstalledCount] = useState<number>(10);
  const [removedCount, setRemovedCount] = useState<number>(0);
  const [formworkComment, setFormworkComment] = useState("");
  const [concreteReadyChecked, setConcreteReadyChecked] = useState(false);
  const [isLoggingInProcess, setIsLoggingInProcess] = useState(false);

  // Request for Inspection (RFI) States
  const [rfiStatus, setRfiStatus] = useState<Record<string, "Idle" | "Submitted" | "Approved">>({});

  // Safety Hazard Log States
  const [snagReportOpen, setSnagReportOpen] = useState(false);
  const [snagDescription, setSnagDescription] = useState("");
  const [snagType, setSnagType] = useState<"Formwork Alignment" | "Honeycombing" | "Panel Gap" | "Slurry Leak" | "Other">("Formwork Alignment");
  const [isSnagSubmitting, setIsSnagSubmitting] = useState(false);

  // Filter subcontractor zones
  const subZones = useMemo(() => {
    return currentSub ? currentSub.zones : [];
  }, [currentSub]);

  // Filter zones assigned to subcontractor from the system zones database
  const filteredZones = useMemo(() => {
    if (!isAuthenticatedSub || !currentSub) return [];
    return zones.filter(z => currentSub.zones.includes(z.zone));
  }, [zones, currentSub, isAuthenticatedSub]);

  // Helper selectors and mutators for multi-select
  const selectedDbZones = useMemo(() => {
    return zones.filter(z => selectedZoneIds.includes(z.id));
  }, [zones, selectedZoneIds]);

  const toggleZoneSelect = (id: string) => {
    setSelectedZoneIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectAllZones = () => {
    setSelectedZoneIds(filteredZones.map(z => z.id));
  };

  const clearAllZones = () => {
    setSelectedZoneIds([]);
  };

  // Auth Handler
  const handlePortalLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentSub && passcode === currentSub.passcode) {
      setIsAuthenticatedSub(true);
      setAuthError(null);
      setSelectedZoneIds([]); // Default to all zones
      onLogAction(
        "Subcontractor Portal Authenticated", 
        `Subcontractor '${currentSub.nameEn}' successfully logged in using secure PIN.`
      );
    } else {
      setAuthError(isAmharic ? "ትክክለኛ ያልሆነ የይለፍ ቃል! እባክዎ እንደገና ይሞክሩ።" : "Invalid passcode! Please try again.");
    }
  };

  const handleLogout = () => {
    setIsAuthenticatedSub(false);
    setPasscode("");
    setAuthError(null);
    setSelectedZoneIds([]);
  };

  // Filter workers assigned to the subcontractor's zones/trades
  const filteredWorkers = useMemo(() => {
    if (!isAuthenticatedSub || !currentSub) return [];
    
    // Get workers belonging to subcontractor
    const subWorkers = workers.filter(w => {
      const belongsToSub = w.company.toLowerCase().includes("subcontractor") || 
                           w.company.toLowerCase().includes(currentSub.nameEn.split(" ")[0].toLowerCase()) ||
                           w.trade === currentSub.primaryTrade;
      return belongsToSub;
    });

    // If specific zones selected from system database, filter by those zones
    if (selectedZoneIds.length > 0) {
      return subWorkers.filter(w => {
        return selectedDbZones.some(z => 
          w.zone === z.zone && 
          w.floor === z.floor && 
          w.building === z.building
        );
      });
    }

    // Default: filter by all of subcontractor's overall zones
    return subWorkers.filter(w => {
      const inAllocatedZone = currentSub.zones.includes(w.zone || "") || 
                              w.zone === "" || 
                              w.zone === undefined;
      return inAllocatedZone;
    });
  }, [workers, currentSub, isAuthenticatedSub, selectedZoneIds, selectedDbZones]);

  // Filter attendance records
  const filteredAttendance = useMemo(() => {
    if (!isAuthenticatedSub || !currentSub) return [];
    const workerIds = new Set(filteredWorkers.map(w => w.id));
    let records = attendance.filter(a => workerIds.has(a.workerId));

    if (selectedZoneIds.length > 0) {
      records = records.filter(a => {
        return selectedDbZones.some(z => 
          a.zone === z.zone && 
          a.floor === z.floor && 
          a.building === z.building
        );
      });
    }
    return records;
  }, [attendance, filteredWorkers, isAuthenticatedSub, currentSub, selectedZoneIds, selectedDbZones]);

  // Filter quality snags relevant to subcontractor's zones
  const filteredSnags = useMemo(() => {
    if (!isAuthenticatedSub || !currentSub) return [];
    
    const subSnags = qualitySnags.filter(s => {
      const zone = zones.find(z => z.id === s.zoneId);
      return zone && currentSub.zones.includes(zone.zone);
    });

    if (selectedZoneIds.length > 0) {
      return subSnags.filter(s => selectedZoneIds.includes(s.zoneId));
    }
    return subSnags;
  }, [qualitySnags, zones, currentSub, isAuthenticatedSub, selectedZoneIds]);

  // Filter progress logs
  const filteredProgressLogs = useMemo(() => {
    if (!isAuthenticatedSub || !currentSub) return [];
    
    const subLogs = progressLogs.filter(p => currentSub.zones.includes(p.zone));

    if (selectedZoneIds.length > 0) {
      return subLogs.filter(p => {
        return selectedDbZones.some(z => 
          p.zone === z.zone && 
          p.floor === z.floor && 
          p.building === z.building
        );
      });
    }
    return subLogs;
  }, [progressLogs, currentSub, isAuthenticatedSub, selectedZoneIds, selectedDbZones]);

  // Filter Work Packages based on current subcontractor & active zone filter
  const currentWorkPackages = useMemo(() => {
    if (!isAuthenticatedSub || !currentSub) return [];
    return workPackages.filter(wp => {
      const isSub = wp.subcontractorId === currentSub.id;
      if (selectedZoneIds.length > 0) {
        return isSub && selectedZoneIds.includes(wp.zoneId);
      }
      return isSub;
    });
  }, [workPackages, currentSub, selectedZoneIds, isAuthenticatedSub]);

  // Submit Daily Log Progress Handlers
  const handleOpenLogProgress = (pkg: WorkPackage) => {
    setSelectedPackageId(pkg.id);
    setInstalledCount(10);
    setRemovedCount(0);
    setConcreteReadyChecked(false);
    setFormworkComment("");
    setLogProgressOpen(true);
  };

  const handleProgressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPackageId || !currentSub) return;
    
    setIsLoggingInProcess(true);
    try {
      const pkg = workPackages.find(wp => wp.id === selectedPackageId);
      if (!pkg) return;

      const zoneObj = zones.find(z => z.id === pkg.zoneId);
      
      const newLog: DailyProgressLog = {
        id: `DPL-SUB-${Date.now().toString().slice(-4)}`,
        date: new Date().toISOString().split("T")[0],
        engineerId: `SUB-${currentSub.id.toUpperCase()}`,
        engineerName: `${currentSub.lead} (Subcontractor Lead)`,
        building: zoneObj?.building || "Digital Bole Heights",
        floor: zoneObj?.floor || 4,
        zone: pkg.allocatedZone,
        installedPanels: installedCount,
        removedPanels: removedCount,
        remainingPanels: Math.max(0, pkg.panelsRequired - installedCount),
        concreteReady: concreteReadyChecked,
        inspectionStatus: "Pending",
        comments: formworkComment || `Subcontractor ${currentSub.nameEn} daily formwork log.`
      };

      // Submit up through callback
      await onAddLog(newLog);

      // Increment progress of local work package representation
      setWorkPackages(prev => prev.map(wp => {
        if (wp.id === selectedPackageId) {
          const currentProgress = wp.completionPercentage;
          const newProgress = Math.min(100, currentProgress + 10);
          return {
            ...wp,
            completionPercentage: newProgress,
            status: newProgress === 100 ? "Completed" : "In Progress"
          };
        }
        return wp;
      }));

      // Update zone panel stats if zone matches
      if (zoneObj) {
        const updatedZoneObj: ProjectZone = {
          ...zoneObj,
          installedPanels: (zoneObj.installedPanels || 0) + installedCount,
          removedPanels: (zoneObj.removedPanels || 0) + removedCount,
          completionPercentage: Math.min(100, (zoneObj.completionPercentage || 0) + 5)
        };
        await onUpdateZone(updatedZoneObj);
      }

      setLogProgressOpen(false);
      onLogAction(
        "Subcontractor Daily Log Submitted", 
        `Logged formwork assembly for ${pkg.allocatedZone}. Installed: ${installedCount} panels. Concrete Ready: ${concreteReadyChecked ? "YES" : "NO"}`
      );
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoggingInProcess(false);
    }
  };

  // RFI Submit Handler
  const handleRequestRFI = (pkg: WorkPackage) => {
    setRfiStatus(prev => ({
      ...prev,
      [pkg.id]: "Submitted"
    }));
    
    onLogAction(
      "RFI Submitted by Subcontractor", 
      `Request for Inspection (RFI) launched for Concrete Pouring in ${pkg.allocatedZone} under ${pkg.titleEn}`
    );
  };

  // Submit Snag Handler
  const handleSnagSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSub || !snagDescription) return;
    
    setIsSnagSubmitting(true);
    try {
      // Find a matching zone id
      const targetZoneId = filteredZones[0]?.id || "B1-F04-ZA";
      
      const newSnag: QualitySnag = {
        id: `SNAG-SUB-${Date.now().toString().slice(-4)}`,
        zoneId: targetZoneId,
        description: snagDescription,
        defectType: snagType,
        status: "Open",
        reportedDate: new Date().toISOString().split("T")[0],
        reportedBy: `${currentSub.lead} (${currentSub.nameEn})`,
        assignedTo: "T-01" // Defaults back to main formwork assembly crew
      };

      await onAddSnag(newSnag);
      setSnagReportOpen(false);
      setSnagDescription("");
      onLogAction(
        "Subcontractor Logged Defect Snag", 
        `Self-reported ${snagType} defect: "${snagDescription}" in assigned zone.`
      );
    } catch (err) {
      console.error(err);
    } finally {
      setIsSnagSubmitting(false);
    }
  };

  return (
    <div id="subcontractor-portal-root" className="space-y-6">
      
      {/* HEADER HERO WIDGET */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 relative overflow-hidden shadow-xl border border-slate-800">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:3rem_3rem] opacity-20" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-black tracking-widest text-red-500 bg-red-950/75 px-2.5 py-0.5 rounded-md flex items-center gap-1.5 font-mono">
                <Grid size={10} className="animate-spin text-red-500" />
                {isAmharic ? "ንዑስ ተቋራጭ መግቢያ" : "Subcontractor Operations Hub"}
              </span>
              {isAuthenticatedSub && (
                <span className="text-[10px] uppercase font-black tracking-widest text-emerald-500 bg-emerald-950/75 px-2.5 py-0.5 rounded-md flex items-center gap-1">
                  <Unlock size={10} />
                  {isAmharic ? "የተፈቀደለት" : "Restricted Access Mode"}
                </span>
              )}
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white leading-tight">
              {isAmharic ? "የንዑስ ተቋራጭ መቆጣጠሪያ ፖርታል" : "Subcontractor Collaboration Portal"}
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              {isAmharic 
                ? "የአሉሚኒየም ፎርምወርክ መቆለፊያዎች፣ የኮንክሪት ዝግጁነት ጥራቶች እና የተመደቡ የስራ ፓኬጆችን ለመከታተል የሚረዳ ራሱን የቻለ የተገደበ የንዑስ ተቋራጮች ሰሌዳ።"
                : "Dedicated dashboard for specialized subcontractors to view assigned aluminum formwork packages, manage allocated zones, track crew attendance, and submit pre-pour inspection approvals."}
            </p>
          </div>
          
          {isAuthenticatedSub && (
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 self-start md:self-center cursor-pointer shadow-md shadow-red-900/30"
            >
              <Lock size={12} />
              <span>{isAmharic ? "ውጣ" : "Logout Portal"}</span>
            </button>
          )}
        </div>
      </div>

      {/* LOGIN PANEL IF NOT AUTHENTICATED */}
      {!isAuthenticatedSub ? (
        <div className="max-w-md mx-auto bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden p-6 mt-8">
          <div className="text-center space-y-2 mb-6">
            <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto border border-red-100 shadow-sm">
              <Lock size={22} />
            </div>
            <h3 className="text-lg font-black text-slate-900">
              {isAmharic ? "የንዑስ ተቋራጭ መግቢያ ማረጋገጫ" : "Restricted Partner Verification"}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {isAmharic 
                ? "እባክዎ የተሰጠዎትን ልዩ የንዑስ ተቋራጭ መለያ ይምረጡና ባለ 4 አሃዝ ሚስጥራዊ የይለፍ ቃልዎን ያስገቡ።" 
                : "Select your sub-contractor firm and enter your designated 4-digit site passcode to synchronize zone telemetry."}
            </p>
          </div>

          <form onSubmit={handlePortalLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase text-slate-500 block">
                {isAmharic ? "ንዑስ ተቋራጭ ድርጅት" : "Subcontractor Firm"}
              </label>
              <select
                value={selectedSubId}
                onChange={(e) => {
                  setSelectedSubId(e.target.value);
                  setAuthError(null);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500/20"
              >
                {subcontractors.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {isAmharic ? sub.nameAm : sub.nameEn} ({sub.lead})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase text-slate-500 block">
                {isAmharic ? "ልዩ መለያ ፒን ቁጥር" : "Secure Pin (Passcode)"}
              </label>
              <div className="relative">
                <input
                  type="password"
                  placeholder="••••"
                  maxLength={4}
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-center text-lg tracking-widest font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                />
                <Lock size={15} className="absolute left-3.5 top-3 text-slate-400" />
              </div>
              <p className="text-[10px] text-slate-400 leading-normal block font-mono text-center">
                Hint: Bole: <span className="font-bold">1234</span> | Saris: <span className="font-bold">2345</span> | Mercato: <span className="font-bold">3456</span>
              </p>
            </div>

            {authError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-bold flex items-center gap-2">
                <AlertTriangle size={14} className="shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black tracking-wide uppercase transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <Unlock size={14} />
              <span>{isAmharic ? "ፍቃድ አግኝ" : "Access Subcontractor Dashboard"}</span>
            </button>
          </form>
        </div>
      ) : (
        /* PORTAL ACTIVE VIEWS */
        <div className="space-y-8 animate-fadeIn">
          
          {/* INFO & QUICK FILTER STRIP */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center border border-red-100 shadow-xs">
                <Building2 size={18} />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">
                  {isAmharic ? "ገባሪ ንዑስ ተቋራጭ" : "Synchronized Vendor Profile"}
                </span>
                <span className="text-sm font-black text-slate-800 font-sans block">
                  {isAmharic ? currentSub?.nameAm : currentSub?.nameEn}
                </span>
                <span className="text-[11px] text-slate-500 block font-mono">
                  Lead: {currentSub?.lead} | Primary Trade: {currentSub?.primaryTrade}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              {/* Custom Multi-Select Dropdown */}
              <div className="relative w-full md:w-auto animate-scaleIn">
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center justify-between gap-2.5 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 transition-all w-full md:w-auto cursor-pointer shadow-2xs"
                >
                  <div className="flex items-center gap-2">
                    <Filter size={13} className="text-slate-400 shrink-0" />
                    <span>
                      {selectedZoneIds.length === 0
                        ? (isAmharic ? "ሁሉም የተመደቡ ዞኖች" : "All Allocated Zones")
                        : (isAmharic 
                            ? `${selectedZoneIds.length} ዞኖች ተመርጠዋል` 
                            : `${selectedZoneIds.length} Zone${selectedZoneIds.length > 1 ? 's' : ''} Selected`
                          )
                      }
                    </span>
                  </div>
                  <ChevronDown size={14} className={`text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {dropdownOpen && (
                    <>
                      {/* Invisible backdrop to close the dropdown */}
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setDropdownOpen(false)} 
                      />
                      
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-72 bg-white rounded-xl border border-slate-200 shadow-lg z-50 p-3 space-y-2 max-h-80 overflow-y-auto"
                      >
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <span className="text-[10px] uppercase font-black tracking-wider text-slate-400">
                            {isAmharic ? "በዞን አጣራ" : "Filter by Work Zone"}
                          </span>
                          <div className="flex items-center gap-2 font-mono">
                            <button
                              type="button"
                              onClick={selectAllZones}
                              className="text-[10px] font-bold text-red-600 hover:text-red-700 transition-colors cursor-pointer"
                            >
                              {isAmharic ? "ሁሉንም" : "All"}
                            </button>
                            <span className="text-[10px] text-slate-300">|</span>
                            <button
                              type="button"
                              onClick={clearAllZones}
                              className="text-[10px] font-bold text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                            >
                              {isAmharic ? "አጽዳ" : "Clear"}
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1 pt-1">
                          {filteredZones.map((zoneObj) => {
                            const isSelected = selectedZoneIds.includes(zoneObj.id);
                            return (
                              <label
                                key={zoneObj.id}
                                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                                  isSelected 
                                    ? 'bg-red-50/50 text-red-900' 
                                    : 'hover:bg-slate-50 text-slate-700'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleZoneSelect(zoneObj.id)}
                                    className="rounded border-slate-300 text-red-600 focus:ring-red-500/20 w-3.5 h-3.5 cursor-pointer"
                                  />
                                  <div className="flex flex-col">
                                    <span className="font-bold font-mono text-xs text-slate-800">{zoneObj.id}</span>
                                    <span className="text-[10px] text-slate-400 font-medium leading-none mt-0.5">
                                      {zoneObj.building} • {isAmharic ? `ፎቅ ${zoneObj.floor}` : `Floor ${zoneObj.floor}`}
                                    </span>
                                  </div>
                                </div>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase font-mono ${
                                  zoneObj.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                  zoneObj.status === 'In Progress' ? 'bg-amber-50 text-amber-600 border border-amber-100 animate-pulse' :
                                  'bg-slate-50 text-slate-500 border border-slate-100'
                                }`}>
                                  {zoneObj.status}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              <button
                onClick={() => setSnagReportOpen(true)}
                className="px-3.5 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
              >
                <AlertTriangle size={13} />
                <span>{isAmharic ? "አዲስ ጉድለት ሪፖርት አድርግ" : "Self-Report Snag"}</span>
              </button>
            </div>
          </div>

          {/* ACTIVE FILTER TAGS */}
          {selectedZoneIds.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/50 -mt-5 animate-fadeIn">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 font-sans pl-1.5">
                {isAmharic ? "የተመረጡ ዞኖች:" : "Filtered Zones:"}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {selectedDbZones.map((z) => (
                  <span
                    key={z.id}
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold bg-white text-slate-800 border border-slate-200 px-2.5 py-1 rounded-lg font-mono shadow-3xs animate-scaleIn"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                    <span>{z.id} ({isAmharic ? `ፎቅ ${z.floor}` : `F${z.floor}`})</span>
                    <button
                      type="button"
                      onClick={() => toggleZoneSelect(z.id)}
                      className="hover:bg-slate-100 rounded-full p-0.5 transition-colors cursor-pointer text-slate-400 hover:text-slate-600"
                    >
                      <span className="block text-[10px] leading-none">×</span>
                    </button>
                  </span>
                ))}
                <button
                  type="button"
                  onClick={clearAllZones}
                  className="text-[11px] font-extrabold text-red-600 hover:text-red-700 transition-colors ml-1 cursor-pointer self-center"
                >
                  {isAmharic ? "ሁሉንም አጽዳ" : "Clear All"}
                </button>
              </div>
            </div>
          )}

          {/* TWO COLUMN GRID: Left column = Work packages, right column = Roster & Quality summary */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* WORK PACKAGES (COLUMNS 1 & 2) */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Briefcase size={16} className="text-red-500" />
                  <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">
                    {isAmharic ? "የተመደቡ የስራ ፓኬጆች" : "Assigned Work Packages"}
                  </h3>
                </div>
                <span className="text-xs font-mono font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
                  {currentWorkPackages.length} {isAmharic ? "ስራዎች ተገኝተዋል" : "Packages Available"}
                </span>
              </div>

              {currentWorkPackages.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-3">
                  <Layers size={36} className="text-slate-300 mx-auto" />
                  <p className="text-xs text-slate-500 font-bold">
                    {isAmharic ? "በዚህ ዞን የተመደበ የስራ ጥቅል የለም።" : "No active work packages found matching selected filters."}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {currentWorkPackages.map((pkg) => {
                    const rfiState = rfiStatus[pkg.id] || "Idle";
                    
                    return (
                      <div 
                        key={pkg.id} 
                        className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all p-5 flex flex-col gap-4 relative overflow-hidden"
                      >
                        {/* Package Ribbon Accent */}
                        <div className={`absolute top-0 left-0 w-1.5 h-full ${
                          pkg.status === "Completed" ? "bg-emerald-500" :
                          pkg.status === "Delayed" ? "bg-red-500 animate-pulse" : "bg-red-500"
                        }`} />

                        {/* Top Meta info */}
                        <div className="flex items-start justify-between">
                          <div className="space-y-0.5 pl-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[9px] uppercase font-mono font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-md">
                                {pkg.id}
                              </span>
                              <span className="text-[9px] uppercase font-mono font-black text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                                <Building2 size={8} />
                                {pkg.allocatedZone}
                              </span>
                            </div>
                            <h4 className="text-sm font-extrabold text-slate-900 leading-tight">
                              {isAmharic ? pkg.titleAm : pkg.titleEn}
                            </h4>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase ${
                              pkg.status === "Completed" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                              pkg.status === "Delayed" ? "bg-red-50 text-red-700 border border-red-100 animate-pulse" :
                              "bg-red-50 text-red-700 border border-red-100"
                            }`}>
                              {pkg.status}
                            </span>
                          </div>
                        </div>

                        {/* Description */}
                        <p className="text-xs text-slate-500 leading-relaxed pl-2">
                          {isAmharic ? pkg.descriptionAm : pkg.descriptionEn}
                        </p>

                        {/* Progress Bar slider */}
                        <div className="pl-2 space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <span className="text-slate-400">{isAmharic ? "የማጠናቀቅ ደረጃ:" : "Task Progress:"}</span>
                            <span className="text-slate-800 font-mono font-extrabold">{pkg.completionPercentage}%</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-red-600 transition-all duration-500" 
                              style={{ width: `${pkg.completionPercentage}%` }}
                            />
                          </div>
                        </div>

                        {/* Detail Info list Grid */}
                        <div className="pl-2 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200/60 text-xs font-sans text-slate-600">
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase font-black tracking-wider">
                              {isAmharic ? "የስራ ገደብ ዝርዝር (Scope of Work)" : "Detailed Work Scope"}
                            </span>
                            <span className="font-semibold block leading-tight text-[11px]">
                              {isAmharic ? pkg.scopeAm : pkg.scopeEn}
                            </span>
                          </div>
                          <div className="sm:text-right">
                            <span className="text-slate-400 block text-[10px] uppercase font-black tracking-wider">
                              {isAmharic ? "የሚያስፈልገው የአሉሚኒየም ፓነል" : "Formwork Asset Target"}
                            </span>
                            <span className="font-mono font-black text-slate-800 block text-xs">
                              {pkg.panelsRequired} {isAmharic ? "ቁራጮች" : "Panels Registered"}
                            </span>
                          </div>
                        </div>

                        {/* Interactive Buttons footer */}
                        <div className="pl-2 flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                          <div className="flex items-center gap-4 text-[11px] font-bold text-slate-400 font-mono">
                            <span className="flex items-center gap-1">
                              <Clock size={12} />
                              Target: {pkg.targetDays} {isAmharic ? "ቀናት" : "days"}
                            </span>
                            <span className="flex items-center gap-1">
                              <Plus size={12} />
                              Start: {pkg.startDate}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Daily Log button */}
                            {pkg.status !== "Completed" && (
                              <button
                                onClick={() => handleOpenLogProgress(pkg)}
                                className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-black transition-all flex items-center gap-1 cursor-pointer"
                              >
                                <Plus size={12} />
                                <span>{isAmharic ? "የቀን ስራ መዝግብ" : "Log Daily Progress"}</span>
                              </button>
                            )}

                            {/* RFI Pour Trigger */}
                            {pkg.status !== "Completed" && (
                              <button
                                onClick={() => handleRequestRFI(pkg)}
                                disabled={rfiState === "Submitted"}
                                className={`px-3 py-2 text-xs font-black rounded-lg transition-all flex items-center gap-1 cursor-pointer border ${
                                  rfiState === "Submitted"
                                    ? "bg-slate-50 text-slate-400 border-slate-200"
                                    : "bg-red-50 hover:bg-red-100 text-red-600 border-red-100"
                                }`}
                              >
                                <Send size={12} />
                                <span>
                                  {rfiState === "Submitted" 
                                    ? (isAmharic ? "RFI ተልኳል (በመጠባበቅ ላይ)" : "RFI Pending Review") 
                                    : (isAmharic ? "የኮንክሪት ሙሌት ፍቃድ ጠይቅ (RFI)" : "Request Pour Inspection")}
                                </span>
                              </button>
                            )}

                            {pkg.status === "Completed" && (
                              <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 text-xs font-black">
                                <CheckCircle2 size={13} />
                                <span>{isAmharic ? "የተጠናቀቀ ጥቅል" : "Package Completed"}</span>
                              </div>
                            )}
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}

              {/* RECENT SUBMITTED PROGRESS LOGS FROM SUB CONTRACTOR */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase text-slate-400 font-mono tracking-wider">
                  {isAmharic ? "በቅርቡ የተላኩ የንዑስ ተቋራጭ የእለት ሪፖርቶች" : "Your Recently Submitted Progress Records"}
                </h4>
                {filteredProgressLogs.length === 0 ? (
                  <div className="bg-slate-50 border border-dashed border-slate-200/80 rounded-xl p-4 text-center">
                    <p className="text-[11px] text-slate-400 font-bold">
                      {isAmharic ? "እስካሁን የተመዘገበ ዕለታዊ ሪፖርት የለም።" : "No daily formwork progress logs compiled yet."}
                    </p>
                  </div>
                ) : (
                  <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden divide-y divide-slate-100">
                    {filteredProgressLogs.slice(0, 3).map((log) => (
                      <div key={log.id} className="p-3.5 flex items-center justify-between text-xs font-sans hover:bg-slate-50 transition-colors">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-slate-800">{log.zone}</span>
                            <span className="text-[10px] font-mono text-slate-400">{log.date}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 italic max-w-sm truncate">
                            &quot;{log.comments}&quot;
                          </p>
                        </div>

                        <div className="text-right flex items-center gap-3">
                          <div className="text-[11px]">
                            <span className="text-slate-400 font-medium block">Installed / Removed</span>
                            <span className="font-mono font-black text-slate-700 block text-xs">
                              {log.installedPanels} / {log.removedPanels} panels
                            </span>
                          </div>

                          <span className={`px-2 py-0.5 rounded-full font-mono text-[9px] font-black ${
                            log.inspectionStatus === "Approved" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700 animate-pulse"
                          }`}>
                            {log.inspectionStatus}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* COLUMNS 3: CREW ATTENDANCE & SNAG MONITORS */}
            <div className="space-y-6">
              
              {/* SUBCONTRACTOR CREW LIST W/ ATTTENDANCE */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-1.5 text-slate-800">
                    <Users size={16} className="text-red-500" />
                    <h4 className="text-xs font-black uppercase tracking-wider font-sans">
                      {isAmharic ? "የሳይት ሰራተኞችዎ እና መገኘት" : "Active Sub Crew Attendance"}
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md">
                    {filteredWorkers.length} {isAmharic ? "ጠቅላላ" : "Registered"}
                  </span>
                </div>

                {filteredWorkers.length === 0 ? (
                  <div className="py-6 text-center space-y-1">
                    <Users size={24} className="text-slate-300 mx-auto" />
                    <p className="text-[11px] text-slate-400 font-bold">
                      {isAmharic ? "ምንም የተመደበ ሰራተኛ አልተገኘም።" : "No crew workers linked in roster."}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                    {filteredWorkers.map(w => {
                      // Find if checked in today
                      const todayAtt = filteredAttendance.find(a => a.workerId === w.id);
                      
                      return (
                        <div key={w.id} className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100 transition-colors">
                          <div className="flex items-center gap-2.5">
                            {w.photo ? (
                              <img src={w.photo} referrerPolicy="no-referrer" alt={w.name} className="w-8 h-8 rounded-full border border-slate-200 shrink-0" />
                            ) : (
                              <div className="w-8 h-8 bg-slate-200 text-slate-500 rounded-full flex items-center justify-center font-bold font-mono text-[11px] shrink-0">
                                {w.name.charAt(0)}
                              </div>
                            )}

                            <div>
                              <span className="text-xs font-black text-slate-800 leading-tight block">
                                {w.name}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium block">
                                {w.trade} | {w.id}
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            {todayAtt ? (
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase font-mono ${
                                todayAtt.status === "Present" ? "bg-emerald-50 text-emerald-700" :
                                todayAtt.status === "Late" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"
                              }`}>
                                {todayAtt.status}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-slate-200 text-slate-500 font-mono">
                                Not Checked
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* QUALITY ISSUES OUTSTANDING WIDGET */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-1.5 text-slate-800">
                    <AlertTriangle size={16} className="text-red-500" />
                    <h4 className="text-xs font-black uppercase tracking-wider font-sans">
                      {isAmharic ? "በሳይትዎ ያሉ ክፍተቶች / ጉድለቶች" : "Outstanding Quality Snags"}
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                    {filteredSnags.length} {isAmharic ? "ጠቅላላ" : "Issues"}
                  </span>
                </div>

                {filteredSnags.length === 0 ? (
                  <div className="py-6 text-center space-y-1">
                    <CheckCircle2 size={24} className="text-emerald-500 mx-auto" />
                    <p className="text-[11px] text-emerald-600 font-black">
                      {isAmharic ? "በሳይትዎ ምንም ክፍተት አልተገኘም! በጣም ጥሩ።" : "100% Quality Compliance! Zero Snags."}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredSnags.map(snag => (
                      <div key={snag.id} className="p-3 bg-red-50/40 border border-red-100 rounded-xl space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-black text-red-600 text-[10px] bg-red-100/60 px-1.5 py-0.5 rounded">
                            {snag.id}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                            snag.status === "Open" ? "bg-red-600 text-white animate-pulse" :
                            snag.status === "In Progress" ? "bg-amber-500 text-white" : "bg-emerald-600 text-white"
                          }`}>
                            {snag.status}
                          </span>
                        </div>
                        <p className="font-semibold text-slate-700 leading-snug">
                          {snag.description}
                        </p>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                          <span>Category: {snag.defectType}</span>
                          <span>Reported: {snag.reportedDate}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

          </div>

        </div>
      )}

      {/* DIALOG 1: LOG DAILY PROGRESS */}
      <AnimatePresence>
        {logProgressOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 no-print">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl border border-slate-200 p-6 max-w-md w-full shadow-2xl space-y-5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {isAmharic ? "ዕለታዊ ፎርምወርክ ስራ ሂደት ምዝገባ" : "Report Formwork Output"}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {isAmharic 
                      ? "የተከናወነውን የፓነል ተከላ መጠንና የኮንክሪት ዝግጁነት ሁኔታዎችን ይሙሉ" 
                      : "Declare active panel counts mounted/demounted and concrete pre-pour checks."}
                  </p>
                </div>
                <button 
                  onClick={() => setLogProgressOpen(false)}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <Lock size={15} />
                </button>
              </div>

              <form onSubmit={handleProgressSubmit} className="space-y-4">
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black uppercase text-slate-500 block">
                      {isAmharic ? "የተገጠሙ አዳዲስ ፓነሎች (Installed)" : "Panels Installed"}
                    </label>
                    <input 
                      type="number" 
                      min={0}
                      value={installedCount}
                      onChange={(e) => setInstalledCount(parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500/20 font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black uppercase text-slate-500 block">
                      {isAmharic ? "የተነሱ የድሮ ፓነሎች (Stripped)" : "Panels Stripped"}
                    </label>
                    <input 
                      type="number" 
                      min={0}
                      value={removedCount}
                      onChange={(e) => setRemovedCount(parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500/20 font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-3 rounded-xl">
                  <input
                    type="checkbox"
                    id="concrete-pour-ready-check"
                    checked={concreteReadyChecked}
                    onChange={(e) => setConcreteReadyChecked(e.target.checked)}
                    className="w-4 h-4 text-red-600 border-slate-300 rounded-sm focus:ring-red-500 cursor-pointer"
                  />
                  <label htmlFor="concrete-pour-ready-check" className="text-xs font-bold text-slate-700 cursor-pointer leading-tight">
                    {isAmharic 
                      ? "ለኮንክሪት ሙሌት ዝግጁ ነው? (Pre-pour inspection check passed)" 
                      : "Formwork alignment passed, verified and locked ready for concrete pouring?"}
                  </label>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase text-slate-500 block">
                    {isAmharic ? "የሳይት ስራ ማስታወሻዎች" : "Site Log Notes / Comments"}
                  </label>
                  <textarea
                    rows={3}
                    placeholder={isAmharic ? "አስፈላጊ የስራ ዝርዝሮችን ወይም ያሉ ችግሮችን እዚህ ይፃፉ..." : "Enter adjustment details, plumb angle corrections, prop lock issues..."}
                    value={formworkComment}
                    onChange={(e) => setFormworkComment(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setLogProgressOpen(false)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase transition-all cursor-pointer text-center"
                  >
                    {isAmharic ? "ሰርዝ" : "Cancel"}
                  </button>

                  <button
                    type="submit"
                    disabled={isLoggingInProcess}
                    className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-red-900/20"
                  >
                    {isLoggingInProcess ? (
                      <span>{isAmharic ? "በመመዝገብ ላይ..." : "Submitting..."}</span>
                    ) : (
                      <>
                        <Send size={12} />
                        <span>{isAmharic ? "መዝግብ" : "Submit Progress"}</span>
                      </>
                    )}
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DIALOG 2: SELF REPORT QUALITY DEFECT */}
      <AnimatePresence>
        {snagReportOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 no-print">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl border border-slate-200 p-6 max-w-md w-full shadow-2xl space-y-5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {isAmharic ? "የጥራት መዛባት / ጉድለት ሪፖርት ማድረጊያ" : "Self-Report Quality Snag"}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {isAmharic 
                      ? "በአሉሚኒየም ፎርምወርክ አሰላለፍ ወይም ተዛማጅ ክፍተቶች ላይ የተመለከቱትን ችግር ይመዝግቡ" 
                      : "Transparently file an alignment defect or panel gap to alert site engineering teams early."}
                  </p>
                </div>
                <button 
                  onClick={() => setSnagReportOpen(false)}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <Lock size={15} />
                </button>
              </div>

              <form onSubmit={handleSnagSubmit} className="space-y-4">
                
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase text-slate-500 block">
                    {isAmharic ? "የጉድለት አይነት" : "Defect Category"}
                  </label>
                  <select
                    value={snagType}
                    onChange={(e) => setSnagType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                  >
                    <option value="Formwork Alignment">Formwork Alignment</option>
                    <option value="Honeycombing">Honeycombing (የኮንክሪት ቀዳዳ)</option>
                    <option value="Panel Gap">Panel Gap (የፓነል ክፍተት)</option>
                    <option value="Slurry Leak">Slurry Leak (የሲሚንቶ ፈሳሽ መፍሰስ)</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase text-slate-500 block">
                    {isAmharic ? "የችግሩ መግለጫ" : "Detailed Snag Description"}
                  </label>
                  <textarea
                    rows={4}
                    placeholder={isAmharic ? "ያገኙትን ጉድለት ወይም የተበላሸውን ፓነል ሁኔታ በዝርዝር እዚህ ይፃፉ..." : "e.g. Wall panel AFP-1003 has 4mm offset on bottom pin wedge connection..."}
                    required
                    value={snagDescription}
                    onChange={(e) => setSnagDescription(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSnagReportOpen(false)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase transition-all cursor-pointer text-center"
                  >
                    {isAmharic ? "ሰርዝ" : "Cancel"}
                  </button>

                  <button
                    type="submit"
                    disabled={isSnagSubmitting}
                    className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-red-900/20"
                  >
                    {isSnagSubmitting ? (
                      <span>{isAmharic ? "በመላክ ላይ..." : "Submitting..."}</span>
                    ) : (
                      <>
                        <Send size={12} />
                        <span>{isAmharic ? "ሪፖርት አድርግ" : "Submit Snag Report"}</span>
                      </>
                    )}
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
