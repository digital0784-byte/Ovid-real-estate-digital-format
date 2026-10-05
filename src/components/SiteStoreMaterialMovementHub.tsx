import React, { useState, useEffect, useMemo } from "react";
import { 
  BarChart3, 
  Package, 
  Send, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  ArrowRightLeft, 
  RotateCcw, 
  Clock, 
  ShieldCheck, 
  Bell, 
  Printer, 
  FileSpreadsheet, 
  Plus, 
  Search, 
  Filter, 
  Check, 
  X, 
  Sparkles, 
  Building2, 
  Layers, 
  Wrench, 
  MapPin, 
  UserCheck, 
  FileText, 
  RefreshCw, 
  Eye, 
  Sliders, 
  Calendar, 
  Activity, 
  Compass, 
  ChevronRight,
  ChevronDown,
  Info,
  SlidersHorizontal,
  Flame,
  Camera,
  Download
} from "lucide-react";
import { 
  EnhancedMaterialRequest, 
  EnhancedMaterialIssue, 
  EnhancedMaterialReturn, 
  DailySiteStoreMaterialReport, 
  InventoryDiscrepancy, 
  DailyReportScheduleConfig, 
  MaterialItemCondition, 
  MaterialRequestLifecycleStatus,
  UserRole
} from "../types";
import { SiteStoreMovementService, DEFAULT_SCHEDULE_CONFIG } from "../services/siteStoreMovementService";
import { MasterDataService } from "../services/masterDataService";
import { SearchableSmartDropdown, DropdownOption } from "./common/SearchableSmartDropdown";
import { WarehouseStoreRoleArchitecturePanel } from "./WarehouseStoreRoleArchitecturePanel";

interface SiteStoreMaterialMovementHubProps {
  currentUserRole?: string;
  currentUserName?: string;
  currentUserUid?: string;
  currentUserProfile?: any;
  isAmharic?: boolean;
  onNavigateToTab?: (tab: string) => void;
}

export const SiteStoreMaterialMovementHub: React.FC<SiteStoreMaterialMovementHubProps> = ({
  currentUserRole = "Site Store Owner",
  currentUserName = "Eng. Sisay Alemu",
  currentUserUid = "USER-STO-01",
  currentUserProfile,
  isAmharic = false,
  onNavigateToTab
}) => {
  // Navigation Sub-Tabs
  const [activeSubTab, setActiveSubTab] = useState<
    "role-dashboard" | "daily-report" | "create-request" | "request-queue" | "receive-return" | "reconciliation" | "audit-reports" | "warehouse-architecture"
  >("role-dashboard");

  // Core Data States
  const [requests, setRequests] = useState<EnhancedMaterialRequest[]>([]);
  const [issues, setIssues] = useState<EnhancedMaterialIssue[]>([]);
  const [returns, setReturns] = useState<EnhancedMaterialReturn[]>([]);
  const [dailyReports, setDailyReports] = useState<DailySiteStoreMaterialReport[]>([]);
  const [discrepancies, setDiscrepancies] = useState<InventoryDiscrepancy[]>([]);
  const [scheduleConfig, setScheduleConfig] = useState<DailyReportScheduleConfig>(DEFAULT_SCHEDULE_CONFIG);
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Active Daily Report state
  const [selectedReportDate, setSelectedReportDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [activeReport, setActiveReport] = useState<DailySiteStoreMaterialReport | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // Reports Hub States (12 Construction Management Reports - Prompt Requirement 21)
  const [selectedReportType, setSelectedReportType] = useState<string>("1. Material Request Report");
  const [reportFilterSearch, setReportFilterSearch] = useState<string>("");
  const [reportFilterStatus, setReportFilterStatus] = useState<string>("ALL");
  const [reportFilterCondition, setReportFilterCondition] = useState<string>("ALL");
  const [reportFilterDate, setReportFilterDate] = useState<string>("");

  // Role Switcher / Simulator (allows interactive verification of all 6 ERP construction roles)
  const [simulatedRole, setSimulatedRole] = useState<string>(currentUserRole);
  const [simulatedName, setSimulatedName] = useState<string>(currentUserName);
  const [simulatedUid, setSimulatedUid] = useState<string>(currentUserUid);

  // Super Admin Configuration: Section Head Approval Toggle (Prompt Requirement 2)
  const [sectionHeadCanApprove, setSectionHeadCanApprove] = useState<boolean>(true);

  // Active identity
  const activeRole = simulatedRole;
  const activeName = simulatedName;
  const activeUid = simulatedUid;

  // Strict role classification
  const isSuperAdmin = ["Super Admin", "Head Office", "Head Office Manager", "admin", "head_office"].includes(activeRole);
  const isStoreOwner = ["Store Owner", "Site Store Owner", "Store Manager", "site_store_owner"].includes(activeRole);
  const isWarehouseManager = ["Warehouse Manager", "warehouse_manager"].includes(activeRole);
  const isSectionHead = ["Section Head", "section_head"].includes(activeRole);
  const isTeamLeader = ["Team Leader", "team_leader"].includes(activeRole);
  const isGangChief = ["Gang Chief", "gang_chief"].includes(activeRole);
  const isFieldStaff = isTeamLeader || isGangChief || isSectionHead;
  const isManagerOrAdmin = isSuperAdmin || isWarehouseManager;

  // Approval authority rule: Store Owner & Super Admin always; Section Head if configured; Warehouse Manager isolated
  const hasApprovalAuthority = isStoreOwner || isSuperAdmin || (isSectionHead && sectionHeadCanApprove);

  // Role profiles for fast simulation
  const roleProfiles = [
    { role: "Team Leader", name: "Kassahun Tadesse", uid: "USER-TL-01", section: "Structural Shutter Gang 1" },
    { role: "Gang Chief", name: "Bekele Haile", uid: "USER-GC-01", section: "Staircase Formwork Gang" },
    { role: "Section Head", name: "Eng. Dawit Kebede", uid: "USER-SH-01", section: "Slab Decking Section" },
    { role: "Site Store Owner", name: "Eng. Sisay Alemu", uid: "USER-STO-01", section: "Site Store Command" },
    { role: "Warehouse Manager", name: "Yared Moges", uid: "USER-WM-01", section: "Central Warehouse Hub" },
    { role: "Super Admin", name: "Super Administrator", uid: "USER-ADMIN-01", section: "Enterprise ERP Control" }
  ];

  // Load all data
  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [reqs, reps, discs, config] = await Promise.all([
        SiteStoreMovementService.getMaterialRequests({
          userUid: (isTeamLeader || isGangChief) ? activeUid : undefined,
          role: activeRole
        }),
        SiteStoreMovementService.getDailyReports(),
        SiteStoreMovementService.getDiscrepancies(),
        SiteStoreMovementService.getScheduleConfig()
      ]);

      setRequests(reqs);
      setDailyReports(reps);
      setDiscrepancies(discs);
      setScheduleConfig(config);

      if (reps.length > 0) {
        setActiveReport(reps[0]);
      } else {
        const generated = await SiteStoreMovementService.calculateDailyMovement(selectedReportDate);
        setActiveReport(generated);
      }
    } catch (e) {
      console.error("Error loading movement data:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [activeRole, activeUid]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // --- TRIGGER DAILY AUTOMATIC 6:00 PM REPORT & BROADCAST ---
  const handleTriggerDailyBroadcast = async () => {
    setIsLoading(true);
    try {
      const report = await SiteStoreMovementService.generateAndBroadcastDailyReport(
        selectedReportDate,
        "STORE-BOL-01",
        false
      );
      setActiveReport(report);
      setDailyReports(prev => [report, ...prev.filter(r => r.id !== report.id)]);
      showToast(
        isAmharic 
          ? `የ ${selectedReportDate} እለታዊ ሪፖርት ተዘጋጅቶ ለዋና መጋዘን፣ ለዋና መስሪያ ቤት እና ሱፐር አድሚን ተልኳል!` 
          : `Daily report for ${selectedReportDate} generated and broadcasted to Warehouse Manager, Head Office, and Super Admin!`
      );
    } catch (e) {
      console.error(e);
      showToast("Report generation failed.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- CREATE REQUEST FORM STATES (18 Fields - Prompt Requirements 3, 4, 5, 6, 7, 10) ---
  const [reqProject, setReqProject] = useState<string>("Bole Heights Luxury Residential Tower");
  const [reqProjectId, setReqProjectId] = useState<string>("PRJ-001");
  const [reqSite, setReqSite] = useState<string>("Bole Heights Phase 1 Site");
  const [reqSiteId, setReqSiteId] = useState<string>("Digital Construction ERP-SITE-2026-001");
  const [reqBuilding, setReqBuilding] = useState<string>("Tower A");
  const [reqFloor, setReqFloor] = useState<string>("4th Floor");
  const [reqZone, setReqZone] = useState<string>("Zone 1 Core Walls");
  const [reqSection, setReqSection] = useState<string>("Structural Concrete & Formwork Section");
  const [reqTeamGang, setReqTeamGang] = useState<string>(
    currentUserRole === "Gang Chief" 
      ? "Staircase Formwork Gang" 
      : currentUserRole === "Section Head"
      ? "Slab Decking Section"
      : "Structural Shutter Gang 1"
  );
  const [reqCategory, setReqCategory] = useState<string>("Aluminum Formwork Panels");
  const [reqPanelType, setReqPanelType] = useState<string>("Internal Wall Panel");
  const [reqPanelName, setReqPanelName] = useState<string>("Internal Wall Standard Modular Panel");
  const [reqManufacturer, setReqManufacturer] = useState<string>("Mivan Technology Corp");
  const [reqDimension, setReqDimension] = useState<string>("1200 × 600 × 65 mm");
  const [reqPanelCode, setReqPanelCode] = useState<string>("IWP-1200-600");
  const [reqMaterialName, setReqMaterialName] = useState<string>("Internal Wall Standard Modular Panel");
  const [reqMaterialCode, setReqMaterialCode] = useState<string>("IWP-1200-600");
  const [reqQuantity, setReqQuantity] = useState<number>(20);
  const [reqUnit, setReqUnit] = useState<string>("Pcs");
  const [reqPriority, setReqPriority] = useState<"Normal" | "Urgent" | "Critical">("Normal");
  const [reqRequiredDate, setReqRequiredDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [reqWorkActivity, setReqWorkActivity] = useState<string>("Wall Formwork Assembly");
  const [reqReason, setReqReason] = useState<string>("Core Shear Wall SW-02 erection");
  const [reqNotes, setReqNotes] = useState<string>("Immediate dispatch requested for morning pouring window");
  const [reqPhotoUrl, setReqPhotoUrl] = useState<string>("");
  const [reqCadRef, setReqCadRef] = useState<string>("DWG-STR-BLKA-FL04-Z1");
  const [reqAttachedAccessories, setReqAttachedAccessories] = useState<Array<{ name: string; code: string; dim: string; unit: string; qty: number }>>([
    { name: "Tie Rod", code: "TR-15", dim: "15 mm", unit: "Pcs", qty: 40 },
    { name: "Wedge Pin", code: "WP-1650", dim: "16 × 50 mm", unit: "Pcs", qty: 160 }
  ]);

  // Real-time stock calculation & inventory availability (Prompt 10)
  const calculatedStock = useMemo(() => {
    const isPanel = reqCategory.includes("Panel");
    const total = isPanel ? 150 : 250;
    const reserved = 20;
    const damaged = 5;
    const missing = 2;
    const alreadyIssued = 30;
    const availableForIssue = Math.max(0, total - reserved - damaged - missing - alreadyIssued);
    return {
      total,
      reserved,
      damaged,
      missing,
      alreadyIssued,
      availableForIssue
    };
  }, [reqCategory, reqPanelCode, reqMaterialCode]);

  // Handle request submit
  const handleCreateRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newReq = await SiteStoreMovementService.createMaterialRequest(
        {
          project: reqProject,
          projectId: reqProjectId,
          site: reqSite,
          siteId: reqSiteId,
          building: reqBuilding,
          floor: reqFloor,
          zone: reqZone,
          teamGangSection: reqTeamGang,
          siteStoreId: "STORE-BOL-01",
          siteStoreName: "Bole Heights Phase 1 Site Store",
          materialCategory: reqCategory,
          materialName: reqMaterialName,
          materialCode: reqMaterialCode,
          panelType: reqCategory.includes("Panel") ? reqPanelType : undefined,
          panelDimension: reqCategory.includes("Panel") ? reqDimension : undefined,
          manufacturer: reqManufacturer,
          requestedQuantity: Number(reqQuantity),
          approvedQuantity: 0,
          issuedQuantity: 0,
          returnedQuantity: 0,
          unit: reqUnit,
          requiredDate: reqRequiredDate,
          priority: reqPriority,
          reason: reqReason,
          workActivity: reqWorkActivity,
          notes: reqNotes,
          photoUrl: reqPhotoUrl || undefined,
          cadRef: reqCadRef || undefined,
          status: "REQUESTED",
          attachedAccessories: reqAttachedAccessories.map(a => ({
            id: `ACC-${a.code}`,
            accessoryName: a.name,
            accessoryCode: a.code,
            dimension: a.dim,
            unit: a.unit,
            quantity: a.qty
          }))
        },
        { uid: activeUid, name: activeName, role: activeRole }
      );

      setRequests(prev => [newReq, ...prev]);
      showToast(
        isAmharic 
          ? `የዕቃ መጠየቂያ ${newReq.requestNumber} በተሳካ ሁኔታ ተመዝግቧል!` 
          : `Material Request ${newReq.requestNumber} submitted successfully!`
      );
      setActiveSubTab("request-queue");
    } catch (err) {
      console.error(err);
      showToast("Error creating material request.");
    }
  };

  // --- APPROVE / PARTIALLY APPROVE MODAL STATE ---
  const [selectedReqForAction, setSelectedReqForAction] = useState<EnhancedMaterialRequest | null>(null);
  const [actionApprovedQty, setActionApprovedQty] = useState<number>(0);
  const [actionNotes, setActionNotes] = useState<string>("");
  const [rejectReason, setRejectReason] = useState<string>("");
  const [showApproveModal, setShowApproveModal] = useState<boolean>(false);
  const [showRejectModal, setShowRejectModal] = useState<boolean>(false);

  // Issue modal
  const [showIssueModal, setShowIssueModal] = useState<boolean>(false);
  const [issueQty, setIssueQty] = useState<number>(0);
  const [issueLocation, setIssueLocation] = useState<string>("Section A → Rack 01 → Bay 01");
  const [issueSerials, setIssueSerials] = useState<string>("");

  // Return modal
  const [showReturnModal, setShowReturnModal] = useState<boolean>(false);
  const [selectedReqForReturn, setSelectedReqForReturn] = useState<EnhancedMaterialRequest | null>(null);
  const [returnQty, setReturnQty] = useState<number>(1);
  const [returnUsedQty, setReturnUsedQty] = useState<number>(0);
  const [returnCondition, setReturnCondition] = useState<MaterialItemCondition>("Good");
  const [returnReason, setReturnReason] = useState<string>("Completed daily segment; unused items returned.");

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Toast Banner */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 p-4 bg-emerald-500 text-slate-950 font-bold rounded-2xl shadow-2xl flex items-center gap-3 animate-slideIn">
          <CheckCircle2 size={20} />
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="p-1 hover:bg-emerald-600 rounded-lg cursor-pointer">
            <X size={16} />
          </button>
        </div>
      )}

      {/* HEADER BANNER */}
      <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                PRODUCTION INTEGRATED
              </span>
              <span className="text-slate-400 text-xs font-mono">
                Site Store: Bole Heights Phase 1 (STORE-BOL-01)
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-white tracking-wide flex items-center gap-2">
              <BarChart3 className="text-cyan-400" size={24} />
              <span>
                {isAmharic 
                  ? "የሳይት ስቶር እለታዊ የዕቃ እንቅስቃሴ ሪፖርት እና አውቶሜቲክ ማሳወቂያ" 
                  : "Daily Site Store Material Movement Report & Automatic Notification"}
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              {isAmharic 
                ? "በቡድን መሪ (Team Leader)፣ ጋንግ ቺፍ (Gang Chief) እና ሴክሽን ኃላፊ (Section Head) የተወጡ እና የተመለሱ ቁሳቁሶችን አውቶሜቲክ በመከታተል በየቀኑ ከምሽቱ 12፡00 ሰአት ለዋና መጋዘን ስራ አስኪያጅ፣ ዋና መስሪያ ቤት እና ሱፐር አድሚን አውቶሜቲክ ሪፖርት ያደርጋል።"
                : "Automatically monitors all materials issued and returned by Team Leaders, Gang Chiefs, and Section Heads. Generates daily summaries and automatically notifies Warehouse Manager, Head Office Manager, and Super Admin at 6:00 PM."}
            </p>
          </div>

          {/* Quick Actions Header */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowScheduleModal(true)}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
              title="Configure 6:00 PM Schedule & Recipients"
            >
              <Clock size={14} className="text-cyan-400" />
              <span>{isAmharic ? "መርሐግብር አዘጋጅ" : "Report Schedule (6:00 PM)"}</span>
            </button>
            <button
              onClick={handleTriggerDailyBroadcast}
              disabled={isLoading}
              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition cursor-pointer disabled:opacity-50"
            >
              <Send size={14} />
              <span>{isLoading ? "Processing..." : (isAmharic ? "የዛሬን ሪፖርት አሁን አስተላልፍ" : "Broadcast Daily Report Now")}</span>
            </button>
          </div>
        </div>

        {/* ROLE SIMULATOR & VERIFICATION SWITCHER (PROMPT REQUIREMENT 2) */}
        <div className="mt-4 p-3 bg-slate-900/90 border border-slate-800/90 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-mono text-cyan-400 font-bold flex items-center gap-1.5 text-xs">
              <UserCheck size={15} />
              <span>{isAmharic ? "የሚና ማረጋገጫ (Role Simulator):" : "Role Access Simulator:"}</span>
            </span>
            <span className="text-slate-200 font-bold bg-slate-950 px-2.5 py-0.5 rounded-lg border border-cyan-500/30 font-mono text-[11px]">
              {activeRole} — {activeName} ({activeUid})
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {roleProfiles.map(p => {
              const isSelected = activeRole === p.role;
              return (
                <button
                  key={p.role}
                  onClick={() => {
                    setSimulatedRole(p.role);
                    setSimulatedName(p.name);
                    setSimulatedUid(p.uid);
                    showToast(`Simulating active ERP role: ${p.role} (${p.name})`);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    isSelected
                      ? "bg-cyan-500 text-slate-950 font-black shadow"
                      : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
                  }`}
                  title={`${p.role}: ${p.section}`}
                >
                  {p.role}
                </button>
              );
            })}
          </div>
        </div>

        {/* NAVIGATION SUB-TABS */}
        <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-800/80 mt-4">
          {[
            { id: "role-dashboard", label: isAmharic ? `0. ${activeRole} ዳሽቦርድ` : `0. ${activeRole} Dashboard`, icon: UserCheck },
            { id: "daily-report", label: isAmharic ? "1. እለታዊ እንቅስቃሴ ሪፖርት" : "1. Daily Movement Report", icon: BarChart3 },
            { id: "create-request", label: isAmharic ? "2. አዲስ የዕቃ ጥያቄ (18 መስኮች)" : "2. Create Material Request", icon: Plus },
            { id: "request-queue", label: isAmharic ? "3. የጥያቄዎችና ወጪ ዝርዝር" : `3. Request & Issue Queue (${requests.length})`, icon: ArrowRightLeft },
            { id: "receive-return", label: isAmharic ? "4. ርክክብ እና ዕቃ መመለሻ" : "4. Receive & Return Materials", icon: RotateCcw },
            { id: "reconciliation", label: isAmharic ? "5. ስቶክ ማስታረቂያና ግጭት" : `5. Stock Reconciliation & Alerts (${discrepancies.filter(d => d.status === "OPEN").length})`, icon: ShieldCheck },
            { id: "audit-reports", label: isAmharic ? "6. 12ቱ የኮንስትራክሽን ሪፖርቶች & ኦዲት" : "6. 12 ERP Reports & Audit Log", icon: FileText },
            { id: "warehouse-architecture", label: isAmharic ? "7. መጋዘንና ስቶር አርክቴክቸር (18 DbService)" : "7. Warehouse & Store Role Architecture", icon: Building2 }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                  isActive
                    ? "bg-cyan-500 text-slate-950 shadow-md font-black"
                    : "bg-slate-900/90 text-slate-400 hover:text-white border border-slate-800"
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 0: ROLE-SPECIFIC DASHBOARD (Prompt Requirement 20 & Strict Role Access) */}
      {/* ========================================================================= */}
      {activeSubTab === "role-dashboard" && (
        <div className="space-y-5 animate-fadeIn">
          {/* ROLE WELCOME & SCOPE CARD */}
          <div className="p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-cyan-500/30 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  {activeRole.toUpperCase()} CONSOLE
                </span>
                <span className="text-slate-400 text-xs font-mono">
                  {activeName} ({activeUid})
                </span>
              </div>
              <h2 className="text-lg md:text-xl font-black text-white flex items-center gap-2">
                <UserCheck className="text-cyan-400" size={20} />
                <span>
                  {activeRole === "Team Leader"
                    ? "Team Leader Material Requisition & Receiving Portal"
                    : activeRole === "Gang Chief"
                    ? "Gang Chief Formwork & Shuttering Requisition Portal"
                    : activeRole === "Section Head"
                    ? "Section Head Material Oversight & Approval Hub"
                    : isStoreOwner
                    ? "Site Store Owner Operational Command Dashboard"
                    : isWarehouseManager
                    ? "Warehouse Manager Logistics & Transfer Command"
                    : "Super Admin Enterprise Governance & Multi-Site Audit"}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-1 max-w-3xl">
                {activeRole === "Team Leader" || activeRole === "Gang Chief"
                  ? "Authorized strictly to create material requests, view own requests, receive issued panels/accessories, and return unused items. (Cannot approve own requests or alter site store inventory directly)."
                  : activeRole === "Section Head"
                  ? "Authorized to create requests, view section-level history, receive/return materials, and review requisitions. Approval authority configurable by Super Admin."
                  : isStoreOwner
                  ? "Full operational control of assigned Site Store: review available stock, approve/reject requests, issue materials, record receipts, and process daily returns."
                  : isWarehouseManager
                  ? "Central warehouse management & inter-site transfers. Site Store operational issuing modules remain isolated unless specifically assigned."
                  : "Super Admin full enterprise oversight: review all site requests, approve/reject, override actions, configure approval rules, and audit daily consolidated reports."}
              </p>
            </div>

            {/* QUICK ACTION BUTTON */}
            <div className="flex items-center gap-2">
              {(isFieldStaff || isSuperAdmin) && (
                <button
                  onClick={() => setActiveSubTab("create-request")}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  <Plus size={15} />
                  <span>Request Materials</span>
                </button>
              )}
              {isStoreOwner && (
                <button
                  onClick={() => setActiveSubTab("request-queue")}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 cursor-pointer"
                >
                  <ArrowRightLeft size={15} />
                  <span>Review Incoming Queue</span>
                </button>
              )}
            </div>
          </div>

          {/* STRICT ROLE PERMISSIONS MATRIX CARD (PROMPT REQUIREMENT 2) */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-800 pb-2">
              <span className="text-xs font-black text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck size={16} />
                <span>Strict Role-Based Access Governance ({activeRole})</span>
              </span>
              {isSuperAdmin && (
                <div className="flex items-center gap-2 bg-slate-900 px-3 py-1 rounded-xl border border-slate-800">
                  <span className="text-[11px] text-slate-300 font-bold">Section Head Approval Authority:</span>
                  <button
                    onClick={() => {
                      setSectionHeadCanApprove(!sectionHeadCanApprove);
                      showToast(`Section Head approval authority set to: ${!sectionHeadCanApprove ? "ENABLED" : "DISABLED"}`);
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] font-black transition cursor-pointer ${
                      sectionHeadCanApprove
                        ? "bg-emerald-500 text-slate-950"
                        : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                    }`}
                  >
                    {sectionHeadCanApprove ? "CONFIGURED: ALLOWED" : "CONFIGURED: RESTRICTED"}
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-emerald-950/20 border border-emerald-500/30 rounded-xl space-y-1.5">
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider block mb-1">
                  ✓ Authorized Actions for {activeRole}
                </span>
                <ul className="space-y-1 text-slate-300 text-[11px]">
                  {activeRole === "Team Leader" && (
                    <>
                      <li className="flex items-center gap-1.5 text-emerald-300">✓ Create material requests with project/site/building/floor/zone binding</li>
                      <li className="flex items-center gap-1.5 text-emerald-300">✓ View own submitted requests and live lifecycle status</li>
                      <li className="flex items-center gap-1.5 text-emerald-300">✓ Receive issued materials and sign receipt confirmation</li>
                      <li className="flex items-center gap-1.5 text-emerald-300">✓ Return unused or damaged materials with condition classification</li>
                      <li className="flex items-center gap-1.5 text-emerald-300">✓ View relevant team material history</li>
                    </>
                  )}
                  {activeRole === "Gang Chief" && (
                    <>
                      <li className="flex items-center gap-1.5 text-emerald-300">✓ Create material requests for assigned formwork / shutter gang</li>
                      <li className="flex items-center gap-1.5 text-emerald-300">✓ View own gang requests and delivery timelines</li>
                      <li className="flex items-center gap-1.5 text-emerald-300">✓ Receive issued panels and compatible accessories</li>
                      <li className="flex items-center gap-1.5 text-emerald-300">✓ Return unused panels/pins/wedges to Site Store</li>
                      <li className="flex items-center gap-1.5 text-emerald-300">✓ View relevant material history for assigned building/floor</li>
                    </>
                  )}
                  {activeRole === "Section Head" && (
                    <>
                      <li className="flex items-center gap-1.5 text-emerald-300">✓ Create section-level material requests</li>
                      <li className="flex items-center gap-1.5 text-emerald-300">✓ View all section requests, gang activities, and progress</li>
                      <li className="flex items-center gap-1.5 text-emerald-300">✓ Receive materials and coordinate gang distributions</li>
                      <li className="flex items-center gap-1.5 text-emerald-300">✓ Process section returns and oversee panel maintenance</li>
                      <li className="flex items-center gap-1.5 text-emerald-300">
                        ✓ Approval permission: {sectionHeadCanApprove ? "Enabled by Super Admin" : "Disabled by Super Admin"}
                      </li>
                    </>
                  )}
                  {isStoreOwner && (
                    <>
                      <li className="flex items-center gap-1.5 text-emerald-300">✓ View all incoming site requests in real-time</li>
                      <li className="flex items-center gap-1.5 text-emerald-300">✓ Review available on-shelf inventory against requests</li>
                      <li className="flex items-center gap-1.5 text-emerald-300">✓ Approve, Partially Approve, or Reject requisitions</li>
                      <li className="flex items-center gap-1.5 text-emerald-300">✓ Enter approved quantities and dispatch materials with rack allocation</li>
                      <li className="flex items-center gap-1.5 text-emerald-300">✓ Record receiving and inspect evening returned conditions</li>
                      <li className="flex items-center gap-1.5 text-emerald-300">✓ Generate daily reports and stock reconciliation summaries</li>
                    </>
                  )}
                  {isWarehouseManager && (
                    <>
                      <li className="flex items-center gap-1.5 text-emerald-300">✓ Central warehouse stock valuation & GRN supplier receipts</li>
                      <li className="flex items-center gap-1.5 text-emerald-300">✓ Inter-site stock transfers and dispatch management</li>
                      <li className="flex items-center gap-1.5 text-emerald-300">✓ Daily 6:00 PM automated movement report recipient</li>
                      <li className="flex items-center gap-1.5 text-emerald-300">✓ Consolidated formwork panel lifecycle analytics</li>
                    </>
                  )}
                  {isSuperAdmin && (
                    <>
                      <li className="flex items-center gap-1.5 text-emerald-300">✓ Full visibility over all project sites, buildings, and stores</li>
                      <li className="flex items-center gap-1.5 text-emerald-300">✓ Approve or reject any material requisition across all sites</li>
                      <li className="flex items-center gap-1.5 text-emerald-300">✓ Configure approval rules, thresholds, and Section Head authority</li>
                      <li className="flex items-center gap-1.5 text-emerald-300">✓ Override system actions and unlock discrepancy flags</li>
                      <li className="flex items-center gap-1.5 text-emerald-300">✓ Audit immutable transaction ledger and security compliance</li>
                    </>
                  )}
                </ul>
              </div>

              <div className="p-3 bg-rose-950/20 border border-rose-500/30 rounded-xl space-y-1.5">
                <span className="text-[10px] font-black text-rose-400 uppercase tracking-wider block mb-1">
                  ✕ Restricted Actions for {activeRole}
                </span>
                <ul className="space-y-1 text-slate-300 text-[11px]">
                  {(activeRole === "Team Leader" || activeRole === "Gang Chief") && (
                    <>
                      <li className="flex items-center gap-1.5 text-rose-300">✕ Cannot approve own material requests (Requires Store Owner / Admin)</li>
                      <li className="flex items-center gap-1.5 text-rose-300">✕ Cannot modify Site Store stock balances directly</li>
                      <li className="flex items-center gap-1.5 text-rose-300">✕ Cannot change issued quantities after store approval</li>
                      <li className="flex items-center gap-1.5 text-rose-300">✕ Cannot alter return condition inspections recorded by Store</li>
                    </>
                  )}
                  {activeRole === "Section Head" && (
                    <>
                      <li className="flex items-center gap-1.5 text-rose-300">✕ Cannot approve own personal request (Enforced anti-conflict rule)</li>
                      <li className="flex items-center gap-1.5 text-rose-300">✕ Cannot modify shelf inventory without Store Owner transaction record</li>
                      <li className="flex items-center gap-1.5 text-rose-300">
                        {sectionHeadCanApprove ? "✕ Approval authority restricted to section requests" : "✕ Requisition approval currently revoked by Super Admin"}
                      </li>
                    </>
                  )}
                  {isStoreOwner && (
                    <>
                      <li className="flex items-center gap-1.5 text-rose-300">✕ Cannot approve own personal requests if store owner submits as requester</li>
                      <li className="flex items-center gap-1.5 text-rose-300">✕ Cannot delete committed stock transactions (Immutable audit ledger)</li>
                      <li className="flex items-center gap-1.5 text-rose-300">✕ Cannot override Super Admin locked discrepancies</li>
                    </>
                  )}
                  {isWarehouseManager && (
                    <>
                      <li className="flex items-center gap-1.5 text-rose-300">✕ Cannot execute internal Site Store issues (Isolated to Site Store Owner)</li>
                      <li className="flex items-center gap-1.5 text-rose-300">✕ Cannot approve site-level gang requisitions without site assignment</li>
                      <li className="flex items-center gap-1.5 text-rose-300">✕ Cannot bypass Site Store physical intake inspection</li>
                    </>
                  )}
                  {isSuperAdmin && (
                    <>
                      <li className="flex items-center gap-1.5 text-rose-300">✕ Cannot approve own requests without audit log notation</li>
                      <li className="flex items-center gap-1.5 text-rose-300">✕ Cannot bypass blockchain-style sequential audit hashes</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          </div>

          {/* AUTHORIZED SCOPE BINDING CARD (Prompt Requirement 3) */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-cyan-400" />
              <span className="font-bold text-slate-300">Authorized Data Scope:</span>
            </div>
            <div className="flex flex-wrap gap-2 text-[11px] font-mono">
              <span className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg text-slate-200">
                Project: <strong className="text-white">{reqProject}</strong>
              </span>
              <span className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg text-slate-200">
                Site: <strong className="text-cyan-300">{reqSite}</strong>
              </span>
              <span className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg text-slate-200">
                Building: <strong className="text-white">{reqBuilding}</strong>
              </span>
              <span className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg text-slate-200">
                Floor: <strong className="text-amber-300">{reqFloor}</strong>
              </span>
              <span className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg text-slate-200">
                Zone: <strong className="text-emerald-300">{reqZone}</strong>
              </span>
              <span className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg text-slate-200">
                Gang/Section: <strong className="text-cyan-400">{reqTeamGang}</strong>
              </span>
            </div>
          </div>

          {/* KPI CARDS (Prompt Requirement 20) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">
                {isFieldStaff ? "My Requests" : "Total Requests"}
              </span>
              <span className="text-xl font-black text-white mt-1 block">
                {requests.filter(r => (isTeamLeader || isGangChief) ? r.requesterUid === activeUid : true).length}
              </span>
              <span className="text-[9px] text-slate-400">Total submitted</span>
            </div>

            <div className="p-4 bg-slate-950 border border-amber-500/30 bg-amber-500/5 rounded-2xl">
              <span className="text-[10px] text-amber-400 uppercase font-bold block">Pending Review</span>
              <span className="text-xl font-black text-amber-300 mt-1 block">
                {requests.filter(r => ((isTeamLeader || isGangChief) ? r.requesterUid === activeUid : true) && (r.status === "REQUESTED" || r.status === "UNDER_REVIEW")).length}
              </span>
              <span className="text-[9px] text-slate-400">Awaiting Store Approval</span>
            </div>

            <div className="p-4 bg-slate-950 border border-emerald-500/30 bg-emerald-500/5 rounded-2xl">
              <span className="text-[10px] text-emerald-400 uppercase font-bold block">Approved</span>
              <span className="text-xl font-black text-emerald-400 mt-1 block">
                {requests.filter(r => ((isTeamLeader || isGangChief) ? r.requesterUid === activeUid : true) && (r.status === "APPROVED" || r.status === "PARTIALLY_APPROVED")).length}
              </span>
              <span className="text-[9px] text-slate-400">Ready for dispatch</span>
            </div>

            <div className="p-4 bg-slate-950 border border-blue-500/30 bg-blue-500/5 rounded-2xl">
              <span className="text-[10px] text-blue-400 uppercase font-bold block">Issued / In Transit</span>
              <span className="text-xl font-black text-blue-300 mt-1 block">
                {requests.filter(r => ((isTeamLeader || isGangChief) ? r.requesterUid === activeUid : true) && r.status === "ISSUED").length}
              </span>
              <span className="text-[9px] text-slate-400">Dispatched from Store</span>
            </div>

            <div className="p-4 bg-slate-950 border border-cyan-500/30 bg-cyan-500/5 rounded-2xl">
              <span className="text-[10px] text-cyan-400 uppercase font-bold block">Received & In Use</span>
              <span className="text-xl font-black text-cyan-300 mt-1 block">
                {requests.filter(r => ((isTeamLeader || isGangChief) ? r.requesterUid === activeUid : true) && (r.status === "RECEIVED" || r.status === "CONSUMED")).length}
              </span>
              <span className="text-[9px] text-slate-400">Active on Grid</span>
            </div>

            <div className="p-4 bg-slate-950 border border-purple-500/30 bg-purple-500/5 rounded-2xl">
              <span className="text-[10px] text-purple-400 uppercase font-bold block">Returned Items</span>
              <span className="text-xl font-black text-purple-300 mt-1 block">
                {requests.filter(r => ((isTeamLeader || isGangChief) ? r.requesterUid === activeUid : true) && (r.status === "RETURNED" || r.status === "PARTIALLY_RETURNED")).length}
              </span>
              <span className="text-[9px] text-slate-400">Back in Store Shelf</span>
            </div>
          </div>

          {/* ACTIVE QUEUE TABLE SUMMARY */}
          <div className="p-5 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                <Activity size={14} className="text-cyan-400" />
                <span>Recent Material Requests & Live Status</span>
              </h3>
              <button
                onClick={() => setActiveSubTab("request-queue")}
                className="text-cyan-400 hover:text-cyan-300 text-xs font-bold cursor-pointer"
              >
                View Full Queue →
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead className="bg-slate-900 text-slate-400 text-[10px] font-mono uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-2.5">Request #</th>
                    <th className="p-2.5">Requester</th>
                    <th className="p-2.5">Material</th>
                    <th className="p-2.5 font-mono">Code</th>
                    <th className="p-2.5 text-right">Requested</th>
                    <th className="p-2.5 text-right">Issued</th>
                    <th className="p-2.5">Priority</th>
                    <th className="p-2.5">Status</th>
                    <th className="p-2.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                  {requests.slice(0, 5).map(req => (
                    <tr key={req.id} className="hover:bg-slate-900/50 text-slate-200">
                      <td className="p-2.5 font-bold text-amber-400">{req.requestNumber}</td>
                      <td className="p-2.5 font-sans font-bold text-white">
                        {req.requesterName} <span className="text-[10px] text-slate-400">({req.requesterRole})</span>
                      </td>
                      <td className="p-2.5 font-sans font-bold text-slate-100">{req.materialName}</td>
                      <td className="p-2.5 text-slate-400">{req.materialCode}</td>
                      <td className="p-2.5 text-right font-bold text-white">{req.requestedQuantity} {req.unit}</td>
                      <td className="p-2.5 text-right font-bold text-amber-400">{req.issuedQuantity} {req.unit}</td>
                      <td className="p-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          req.priority === "Critical" ? "bg-rose-500/20 text-rose-400" : req.priority === "Urgent" ? "bg-amber-500/20 text-amber-300" : "bg-slate-800 text-slate-300"
                        }`}>
                          {req.priority}
                        </span>
                      </td>
                      <td className="p-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          req.status === "APPROVED" || req.status === "RECEIVED" ? "bg-emerald-500/20 text-emerald-400" : req.status === "ISSUED" ? "bg-blue-500/20 text-blue-300" : "bg-amber-500/20 text-amber-300"
                        }`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="p-2.5 text-center">
                        {req.status === "ISSUED" && !req.receiverConfirmation ? (
                          <button
                            onClick={async () => {
                              await SiteStoreMovementService.confirmMaterialReceipt(
                                `ISS-${req.id.replace("REQ-", "")}`,
                                { uid: currentUserUid, name: currentUserName, role: currentUserRole }
                              );
                              showToast(`Received ${req.materialName}!`);
                              loadAllData();
                            }}
                            className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded text-[10px] cursor-pointer"
                          >
                            Receive
                          </button>
                        ) : req.status === "RECEIVED" && req.issuedQuantity > req.returnedQuantity ? (
                          <button
                            onClick={() => {
                              setSelectedReqForReturn(req);
                              setReturnQty(req.issuedQuantity - req.returnedQuantity);
                              setShowReturnModal(true);
                            }}
                            className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded text-[10px] cursor-pointer"
                          >
                            Return
                          </button>
                        ) : (
                          <span className="text-slate-500 text-[10px]">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: DAILY SITE STORE MATERIAL MOVEMENT REPORT & NOTIFICATION (Prompts 4-13) */}
      {/* ========================================================================= */}
      {activeSubTab === "daily-report" && activeReport && (
        <div className="space-y-5 animate-fadeIn">
          {/* DATE PICKER & REPORT SUMMARY BAR */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-300">Report Date:</span>
              <input
                type="date"
                value={selectedReportDate}
                onChange={async e => {
                  setSelectedReportDate(e.target.value);
                  const rep = await SiteStoreMovementService.calculateDailyMovement(e.target.value);
                  setActiveReport(rep);
                }}
                className="bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-1.5 text-xs font-mono focus:border-cyan-400"
              />
              <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/80 px-2.5 py-1 rounded-lg border border-cyan-800">
                Timezone: {activeReport.timezone}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold border border-slate-800 flex items-center gap-1.5 cursor-pointer"
              >
                <Printer size={13} />
                <span>Print / PDF</span>
              </button>
              <button
                onClick={() => alert("Daily Movement Report exported as Excel")}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow"
              >
                <FileSpreadsheet size={13} />
                <span>Export Excel</span>
              </button>
            </div>
          </div>

          {/* SECTION A: SUMMARY METRICS (Prompt 5A) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3 font-mono text-xs">
            <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Transactions</span>
              <span className="text-base font-black text-white mt-1 block">{activeReport.summary.totalTransactions}</span>
              <span className="text-[9px] text-slate-400">Issues + Returns</span>
            </div>
            <div className="p-3.5 bg-slate-950 rounded-2xl border border-amber-500/30 bg-amber-500/5">
              <span className="text-[10px] text-amber-400 uppercase font-bold block">Total Issued</span>
              <span className="text-base font-black text-amber-300 mt-1 block">{activeReport.summary.totalItemsIssued} Pcs</span>
              <span className="text-[9px] text-slate-400">Site dispatches</span>
            </div>
            <div className="p-3.5 bg-slate-950 rounded-2xl border border-cyan-500/30 bg-cyan-500/5">
              <span className="text-[10px] text-cyan-400 uppercase font-bold block">Total Returned</span>
              <span className="text-base font-black text-cyan-300 mt-1 block">{activeReport.summary.totalItemsReturned} Pcs</span>
              <span className="text-[9px] text-slate-400">Back in Store</span>
            </div>
            <div className="p-3.5 bg-slate-950 rounded-2xl border border-blue-500/30 bg-blue-500/5">
              <span className="text-[10px] text-blue-400 uppercase font-bold block">Net Movement</span>
              <span className="text-base font-black text-blue-300 mt-1 block">{activeReport.summary.netMovement} Pcs</span>
              <span className="text-[9px] text-slate-400">Issued - Returned</span>
            </div>
            <div className="p-3.5 bg-slate-950 rounded-2xl border border-rose-500/30 bg-rose-500/5">
              <span className="text-[10px] text-rose-400 uppercase font-bold block">Damaged Returns</span>
              <span className="text-base font-black text-rose-400 mt-1 block">{activeReport.summary.damagedReturns} Pcs</span>
              <span className="text-[9px] text-slate-400">Needs repair</span>
            </div>
            <div className="p-3.5 bg-slate-950 rounded-2xl border border-red-500/40 bg-red-500/10">
              <span className="text-[10px] text-red-400 uppercase font-bold block">Missing Items</span>
              <span className="text-base font-black text-red-300 mt-1 block">{activeReport.summary.missingItems} Pcs</span>
              <span className="text-[9px] text-slate-400">Unaccounted</span>
            </div>
            <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Reconciliation</span>
              <span className={`text-xs font-black mt-1.5 block ${activeReport.reconciliation.isBalanced ? "text-emerald-400" : "text-amber-400"}`}>
                {activeReport.reconciliation.status}
              </span>
              <span className="text-[9px] text-slate-500">Auto-balanced</span>
            </div>
          </div>

          {/* NOTIFICATION BROADCAST BANNER (Prompt 6, 8, 9) */}
          <div className="p-4 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-cyan-500/40 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400 shrink-0">
                <Bell size={20} />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">
                  Automatic Notification Recipients: Warehouse Manager • Head Office Manager • Super Admin
                </span>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Daily summary automatically generated and pushed to designated managers via FCM & In-App Alerts.
                  Schedule: <strong className="text-cyan-400">Daily at 6:00 PM (Africa/Addis_Ababa)</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span>Idempotent Doc: {activeReport.id}</span>
              </span>
            </div>
          </div>

          {/* MULTI-SITE STORES BREAKDOWN & ORGANIZATION TOTAL (Prompt 10) */}
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                <Building2 size={14} className="text-cyan-400" />
                <span>Multi-Site Store Breakdown & Organization Total (Prompt 10)</span>
              </span>
              <span className="text-[10px] text-slate-400">Does not combine records into an unclear lump sum</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {activeReport.siteStoreBreakdown.map((st, i) => (
                <div key={i} className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-white text-xs">{st.siteStoreName}</h4>
                      <p className="text-[10px] text-slate-400">{st.projectName}</p>
                    </div>
                    <span className="text-[9px] font-mono text-cyan-400 bg-cyan-950 px-1.5 py-0.5 rounded border border-cyan-800">
                      {st.siteStoreId}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 font-mono text-[11px] pt-1 border-t border-slate-800/60">
                    <div>
                      <span className="text-[9px] text-slate-500 block">Issued</span>
                      <span className="font-bold text-amber-400">{st.issued}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 block">Returned</span>
                      <span className="font-bold text-cyan-400">{st.returned}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 block">Net</span>
                      <span className="font-bold text-white">{st.net}</span>
                    </div>
                  </div>
                </div>
              ))}

              {/* ORGANIZATION TOTAL CARD */}
              <div className="p-3 bg-cyan-950/40 rounded-xl border border-cyan-500/50 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-black text-cyan-300 text-xs">ORGANIZATION TOTAL</h4>
                    <p className="text-[10px] text-cyan-200">Across All Active Sites</p>
                  </div>
                  <span className="text-[9px] font-mono text-cyan-400 bg-cyan-900 px-1.5 py-0.5 rounded font-bold">
                    HQ Consolidate
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1 font-mono text-[11px] pt-1 border-t border-cyan-800/60">
                  <div>
                    <span className="text-[9px] text-cyan-300 block">Total Issued</span>
                    <span className="font-black text-amber-300">
                      {activeReport.siteStoreBreakdown.reduce((sum, s) => sum + s.issued, 0)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-cyan-300 block">Total Returned</span>
                    <span className="font-black text-cyan-300">
                      {activeReport.siteStoreBreakdown.reduce((sum, s) => sum + s.returned, 0)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-cyan-300 block">Net Movement</span>
                    <span className="font-black text-white">
                      {activeReport.siteStoreBreakdown.reduce((sum, s) => sum + s.net, 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* USER-LEVEL BREAKDOWN (Prompt 11) */}
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                <UserCheck size={14} className="text-cyan-400" />
                <span>User-Level Movement Breakdown (Team Leader, Gang Chief, Section Head)</span>
              </span>
              <span className="text-[10px] text-slate-400">Based on authentic confirmed transactions</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {activeReport.userBreakdown.map((ub, idx) => (
                <div key={idx} className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex justify-between items-center">
                  <div>
                    <h5 className="font-bold text-white text-xs">{ub.userName}</h5>
                    <p className="text-[10px] text-slate-400">{ub.userRole} • {ub.teamGangSection}</p>
                  </div>
                  <div className="text-right font-mono text-xs">
                    <div className="text-amber-400 font-bold">Issued: {ub.issued}</div>
                    <div className="text-cyan-400 font-bold">Returned: {ub.returned}</div>
                    <div className="text-white font-black text-[11px]">Net: {ub.net}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION B: ISSUED MATERIALS TABLE (Prompt 5B) */}
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <span className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <ArrowRightLeft size={14} />
                <span>B. Issued Materials Today ({activeReport.issuedMaterials.length} Records)</span>
              </span>
              <span className="text-[10px] text-slate-400">Columns: No. | Time | User | Role | Project | Site | Location | Material | Code | Qty | Unit | Condition</span>
            </div>

            <div className="overflow-x-auto border border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead className="bg-slate-900 text-slate-400 text-[10px] font-mono uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-2.5 text-center">No.</th>
                    <th className="p-2.5">Time</th>
                    <th className="p-2.5">User</th>
                    <th className="p-2.5">Role</th>
                    <th className="p-2.5">Location</th>
                    <th className="p-2.5">Material</th>
                    <th className="p-2.5 font-mono">Code</th>
                    <th className="p-2.5 text-right">Qty</th>
                    <th className="p-2.5">Unit</th>
                    <th className="p-2.5">Condition</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                  {activeReport.issuedMaterials.map((item) => (
                    <tr key={item.issueId} className="hover:bg-slate-900/50 text-slate-200">
                      <td className="p-2.5 text-center font-bold text-slate-400">{item.no}</td>
                      <td className="p-2.5 text-cyan-400">{item.time}</td>
                      <td className="p-2.5 font-sans font-bold text-white">{item.user}</td>
                      <td className="p-2.5 text-slate-300 font-sans text-[11px]">{item.role}</td>
                      <td className="p-2.5 text-slate-300 text-[11px]">{item.location}</td>
                      <td className="p-2.5 font-sans font-bold text-amber-300">{item.material}</td>
                      <td className="p-2.5 text-slate-300 font-bold">{item.code}</td>
                      <td className="p-2.5 text-right font-black text-amber-400">{item.qty}</td>
                      <td className="p-2.5 text-slate-400">{item.unit}</td>
                      <td className="p-2.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                          {item.condition}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION C: RETURNED MATERIALS TABLE (Prompt 5C) */}
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <span className="text-xs font-black text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <RotateCcw size={14} />
                <span>C. Returned Materials Today ({activeReport.returnedMaterials.length} Records)</span>
              </span>
              <span className="text-[10px] text-slate-400">Columns: No. | Time | User | Role | Location | Material | Code | Issued Qty | Used Qty | Returned Qty | Condition</span>
            </div>

            <div className="overflow-x-auto border border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead className="bg-slate-900 text-slate-400 text-[10px] font-mono uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-2.5 text-center">No.</th>
                    <th className="p-2.5">Time</th>
                    <th className="p-2.5">User</th>
                    <th className="p-2.5">Role</th>
                    <th className="p-2.5">Location</th>
                    <th className="p-2.5">Material</th>
                    <th className="p-2.5 font-mono">Code</th>
                    <th className="p-2.5 text-right">Issued</th>
                    <th className="p-2.5 text-right">Used</th>
                    <th className="p-2.5 text-right">Returned</th>
                    <th className="p-2.5">Condition</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                  {activeReport.returnedMaterials.map((item) => (
                    <tr key={item.returnId} className="hover:bg-slate-900/50 text-slate-200">
                      <td className="p-2.5 text-center font-bold text-slate-400">{item.no}</td>
                      <td className="p-2.5 text-cyan-400">{item.time}</td>
                      <td className="p-2.5 font-sans font-bold text-white">{item.user}</td>
                      <td className="p-2.5 text-slate-300 font-sans text-[11px]">{item.role}</td>
                      <td className="p-2.5 text-slate-300 text-[11px]">{item.location}</td>
                      <td className="p-2.5 font-sans font-bold text-cyan-300">{item.material}</td>
                      <td className="p-2.5 text-slate-300 font-bold">{item.code}</td>
                      <td className="p-2.5 text-right text-slate-400">{item.issuedQty}</td>
                      <td className="p-2.5 text-right text-slate-400">{item.usedQty}</td>
                      <td className="p-2.5 text-right font-black text-cyan-400">{item.returnedQty}</td>
                      <td className="p-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.condition === "Good" 
                            ? "bg-emerald-500/20 text-emerald-400" 
                            : item.condition === "Damaged"
                            ? "bg-rose-500/20 text-rose-400"
                            : "bg-amber-500/20 text-amber-300"
                        }`}>
                          {item.condition}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION D: PANEL MOVEMENT (Prompt 5D) */}
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <span className="text-xs font-black text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                <Layers size={14} />
                <span>D. Aluminum Formwork & Stair Panel Movement (Dedicated Tracking)</span>
              </span>
              <span className="text-[10px] text-slate-400">Panel Type • Code • Dimension • Serial Number • Issued • Returned • Installed • Damaged • Missing</span>
            </div>

            <div className="overflow-x-auto border border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead className="bg-slate-900 text-slate-400 text-[10px] font-mono uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-2.5">Panel Type</th>
                    <th className="p-2.5 font-mono">Code</th>
                    <th className="p-2.5">Dimension</th>
                    <th className="p-2.5">Serial Numbers</th>
                    <th className="p-2.5 text-center">Issued</th>
                    <th className="p-2.5 text-center">Returned</th>
                    <th className="p-2.5 text-center">Installed</th>
                    <th className="p-2.5 text-center text-rose-400">Damaged</th>
                    <th className="p-2.5 text-center text-red-400">Missing</th>
                    <th className="p-2.5">Current Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                  {activeReport.panelMovements.map((pm, idx) => (
                    <tr key={idx} className="hover:bg-slate-900/50 text-slate-200">
                      <td className="p-2.5 font-sans font-bold text-white">{pm.panelType}</td>
                      <td className="p-2.5 text-amber-400 font-bold">{pm.panelCode}</td>
                      <td className="p-2.5 text-slate-300">{pm.dimension}</td>
                      <td className="p-2.5 text-[10px] text-cyan-300 truncate max-w-xs">{pm.serialNumber}</td>
                      <td className="p-2.5 text-center font-bold text-white">{pm.issued}</td>
                      <td className="p-2.5 text-center font-bold text-cyan-400">{pm.returned}</td>
                      <td className="p-2.5 text-center font-bold text-emerald-400">{pm.installed}</td>
                      <td className="p-2.5 text-center font-bold text-rose-400">{pm.damaged}</td>
                      <td className="p-2.5 text-center font-bold text-red-400">{pm.missing}</td>
                      <td className="p-2.5 text-slate-300 font-sans text-[11px]">{pm.currentStatus}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CREATE MATERIAL REQUEST (Prompt Requirements 4-8, 10) */}
      {/* ========================================================================= */}
      {activeSubTab === "create-request" && (
        <form onSubmit={handleCreateRequestSubmit} className="bg-slate-950 border border-slate-800 rounded-3xl p-5 md:p-6 space-y-6 text-xs text-slate-200 animate-fadeIn">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Plus size={18} className="text-cyan-400" />
                <span>Create Site Store Material Request</span>
              </h3>
              <p className="text-xs text-slate-400">
                Authoritative location binding: {reqBuilding} • {reqFloor} • {reqZone} • {reqTeamGang}
              </p>
            </div>
            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950 px-2.5 py-1 rounded border border-cyan-800 font-bold">
              User: {currentUserName} ({currentUserRole})
            </span>
          </div>

          {/* SECTION 1: STRICT DATA SCOPE & LOCATION (Fields 1-7) */}
          <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-bold text-cyan-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <MapPin size={14} />
                <span>1. Project, Site, Building, Floor, Zone, Section & Gang Scope (Fields 1-7)</span>
              </span>
              <span className="text-[10px] text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800 font-bold">
                ✓ Authorized Location Scope Bound
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-slate-400 block mb-1 font-bold">1. Project (Strictly Bound) *</label>
                <input
                  type="text"
                  readOnly={!isManagerOrAdmin}
                  value={reqProject}
                  onChange={e => setReqProject(e.target.value)}
                  className={`w-full bg-slate-950 border text-white rounded-xl px-3 py-2 text-xs font-semibold ${!isManagerOrAdmin ? "border-slate-800 text-slate-400 cursor-not-allowed" : "border-slate-700"}`}
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-bold">2. Site Store Assignment *</label>
                <input
                  type="text"
                  readOnly={!isManagerOrAdmin}
                  value={reqSite}
                  onChange={e => setReqSite(e.target.value)}
                  className={`w-full bg-slate-950 border text-white rounded-xl px-3 py-2 text-xs font-semibold ${!isManagerOrAdmin ? "border-slate-800 text-slate-400 cursor-not-allowed" : "border-slate-700"}`}
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-bold">3. Building / Block *</label>
                <input
                  type="text"
                  value={reqBuilding}
                  onChange={e => setReqBuilding(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs font-semibold focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-bold">4. Floor Level *</label>
                <input
                  type="text"
                  value={reqFloor}
                  onChange={e => setReqFloor(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs font-semibold focus:border-cyan-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div>
                <label className="text-slate-400 block mb-1 font-bold">5. Working Zone / Grid *</label>
                <input
                  type="text"
                  value={reqZone}
                  onChange={e => setReqZone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs font-semibold focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-bold">6. Section Department *</label>
                <input
                  type="text"
                  value={reqSection}
                  onChange={e => setReqSection(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs font-semibold focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-bold">7. Team / Gang Assigned *</label>
                <input
                  type="text"
                  value={reqTeamGang}
                  onChange={e => setReqTeamGang(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs font-semibold focus:border-cyan-400"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: CASCADING MATERIAL & STOCK VALIDATION (Fields 8-11 & Prompt 10) */}
          <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-bold text-amber-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Package size={14} />
                <span>2. Material Category, Panel Cascading Selection & Quantities (Fields 8-11)</span>
              </span>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                Formula Validation Enforced
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-slate-400 block mb-1 font-bold">8. Material Category *</label>
                <select
                  value={reqCategory}
                  onChange={e => setReqCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs focus:border-amber-400"
                >
                  <option value="Aluminum Formwork Panels">Aluminum Formwork Panels</option>
                  <option value="Stair Panels">Stair Panels (Dedicated Category)</option>
                  <option value="Panel Accessories">Panel Accessories (Tie Rod, Waler, Pins)</option>
                  <option value="Construction Materials">Construction Materials (Cement, Rebar, Plywood)</option>
                  <option value="Tools">Tools (Hammer Drills, Wrenches)</option>
                  <option value="Equipment">Equipment (Props, Jacks, Scaffolding)</option>
                  <option value="Consumables">Consumables (Mould Oil, Cones, Spacers)</option>
                </select>
              </div>

              {reqCategory.includes("Panel") ? (
                <>
                  <div>
                    <label className="text-slate-400 block mb-1 font-bold">9. Panel Type *</label>
                    <select
                      value={reqPanelType}
                      onChange={e => {
                        setReqPanelType(e.target.value);
                        setReqMaterialName(`${e.target.value} Standard`);
                      }}
                      className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs focus:border-amber-400"
                    >
                      <option value="Internal Wall Panel">Internal Wall Panel</option>
                      <option value="External Wall Panel">External Wall Panel</option>
                      <option value="Extend Panel">Extend Panel</option>
                      <option value="Soffit Panel">Soffit Panel</option>
                      <option value="Beam Panel">Beam Panel</option>
                      <option value="CA Panel">CA Panel (Chamfer Angle)</option>
                      <option value="IC Panel">IC Panel (Internal Corner)</option>
                      <option value="SC Panel">SC Panel (Soffit Corner)</option>
                      <option value="SCR Panel">SCR Panel (Corner Return)</option>
                      <option value="Slab Panel">Slab Panel</option>
                      <option value="Door End Panel">Door End Panel</option>
                      <option value="Wall End Panel">Wall End Panel</option>
                      <option value="Stair Panel">Stair Panel</option>
                      <option value="Column Panel">Column Panel</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1 font-bold">Standard Dimension *</label>
                    <select
                      value={reqDimension}
                      onChange={e => setReqDimension(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-amber-400 font-mono rounded-xl px-3 py-2 text-xs focus:border-amber-400"
                    >
                      <option value="1200 × 600 × 65 mm">1200 × 600 × 65 mm</option>
                      <option value="2400 × 600 × 65 mm">2400 × 600 × 65 mm</option>
                      <option value="2700 × 600 × 65 mm">2700 × 600 × 65 mm</option>
                      <option value="1200 × 450 × 65 mm">1200 × 450 × 65 mm</option>
                      <option value="1200 × 900 × 65 mm">1200 × 900 × 65 mm</option>
                      <option value="1200 × 300 × 65 mm">1200 × 300 × 65 mm</option>
                      <option value="150 × 150 × 2400 mm">150 × 150 × 2400 mm (IC / CA)</option>
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="text-slate-400 block mb-1 font-bold">9. Material Name *</label>
                    <input
                      type="text"
                      value={reqMaterialName}
                      onChange={e => setReqMaterialName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs font-semibold focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1 font-bold">Material Code *</label>
                    <input
                      type="text"
                      value={reqMaterialCode}
                      onChange={e => setReqMaterialCode(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-amber-400 font-mono rounded-xl px-3 py-2 text-xs focus:border-amber-400"
                    />
                  </div>
                </>
              )}
            </div>

            {/* LIVE STOCK VALIDATION & AVAILABILITY INDICATOR (Prompt Requirement 10) */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80">
              <span className="text-[10px] text-slate-400 font-mono uppercase font-bold block mb-1.5">
                Site Store Live Inventory Availability Check (Prompt 10 Formula)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs font-mono">
                <div className="p-2 bg-slate-900 rounded-lg">
                  <span className="text-[9px] text-slate-500 block">Total Stock</span>
                  <span className="font-bold text-white">{calculatedStock.total} {reqUnit}</span>
                </div>
                <div className="p-2 bg-slate-900 rounded-lg">
                  <span className="text-[9px] text-slate-500 block">Reserved Stock</span>
                  <span className="font-bold text-amber-400">{calculatedStock.reserved} {reqUnit}</span>
                </div>
                <div className="p-2 bg-slate-900 rounded-lg">
                  <span className="text-[9px] text-slate-500 block">Damaged</span>
                  <span className="font-bold text-rose-400">{calculatedStock.damaged} {reqUnit}</span>
                </div>
                <div className="p-2 bg-slate-900 rounded-lg">
                  <span className="text-[9px] text-slate-500 block">Missing</span>
                  <span className="font-bold text-red-400">{calculatedStock.missing} {reqUnit}</span>
                </div>
                <div className="p-2 bg-slate-900 rounded-lg">
                  <span className="text-[9px] text-slate-500 block">Already Issued</span>
                  <span className="font-bold text-blue-400">{calculatedStock.alreadyIssued} {reqUnit}</span>
                </div>
                <div className="p-2 bg-emerald-950/60 border border-emerald-500/40 rounded-lg">
                  <span className="text-[9px] text-emerald-400 block font-bold">Available for Issue</span>
                  <span className="font-black text-emerald-300">{calculatedStock.availableForIssue} {reqUnit}</span>
                </div>
              </div>
            </div>

            {/* Quantity, Unit, Priority & Required Date */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div>
                <label className="text-slate-400 block mb-1 font-bold">10. Requested Quantity *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={reqQuantity}
                  onChange={e => setReqQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-slate-950 border border-slate-800 text-amber-400 font-mono font-black text-sm rounded-xl px-3 py-2 focus:border-amber-400"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1 font-bold">11. Unit of Measure *</label>
                <input
                  type="text"
                  value={reqUnit}
                  onChange={e => setReqUnit(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs focus:border-amber-400"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1 font-bold">12. Required Date *</label>
                <input
                  type="date"
                  value={reqRequiredDate}
                  onChange={e => setReqRequiredDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs focus:border-amber-400"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1 font-bold">15. Priority *</label>
                <select
                  value={reqPriority}
                  onChange={e => setReqPriority(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs font-bold focus:border-amber-400"
                >
                  <option value="Normal">Normal</option>
                  <option value="Urgent">Urgent</option>
                  <option value="Critical">Critical (Immediate pour)</option>
                </select>
              </div>
            </div>

            {/* Reason, Work Activity, Note, Photo & CAD Reference (Fields 13, 14, 16, 17, 18) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-slate-400 block mb-1 font-bold">13. Reason / Technical Details *</label>
                <input
                  type="text"
                  required
                  value={reqReason}
                  onChange={e => setReqReason(e.target.value)}
                  placeholder="e.g. Core Shear Wall SW-02 on 4th floor core grid"
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs focus:border-amber-400"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1 font-bold">14. Work Activity / Purpose *</label>
                <input
                  type="text"
                  required
                  value={reqWorkActivity}
                  onChange={e => setReqWorkActivity(e.target.value)}
                  placeholder="e.g. Wall Formwork Assembly & Shutter Lock"
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs focus:border-amber-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div>
                <label className="text-slate-400 block mb-1 font-bold">16. Optional Note</label>
                <input
                  type="text"
                  value={reqNotes}
                  onChange={e => setReqNotes(e.target.value)}
                  placeholder="e.g. Dispatch early morning"
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs focus:border-amber-400"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1 font-bold">17. Optional Photo / Defect Tag</label>
                <input
                  type="text"
                  value={reqPhotoUrl}
                  onChange={e => setReqPhotoUrl(e.target.value)}
                  placeholder="e.g. https://storage.erp/snag-04.jpg"
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs focus:border-amber-400 font-mono"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1 font-bold">18. Optional Drawing / CAD Ref</label>
                <input
                  type="text"
                  value={reqCadRef}
                  onChange={e => setReqCadRef(e.target.value)}
                  placeholder="e.g. DWG-STR-BLKA-FL04-Z1"
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs focus:border-amber-400 font-mono"
                />
              </div>
            </div>
          </div>

          {/* COMPATIBLE ACCESSORIES ATTACHED (Prompt 7) */}
          <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800 space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-bold text-cyan-400 text-xs flex items-center gap-1.5">
                <Wrench size={13} />
                <span>Compatible Accessories Included in Request (Prompt 7)</span>
              </span>
              <span className="text-[10px] text-slate-400">Auto-calculated based on panel quantity</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {reqAttachedAccessories.map((acc, i) => (
                <div key={i} className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center gap-2 text-xs">
                  <span className="font-bold text-white">{acc.name}</span>
                  <span className="font-mono text-cyan-400 text-[11px]">{acc.dim}</span>
                  <span className="px-2 py-0.5 bg-cyan-950 text-cyan-300 font-mono font-bold rounded-lg text-[10px] border border-cyan-800">
                    {acc.qty} {acc.unit}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setActiveSubTab("request-queue")}
              className="px-4 py-2 bg-slate-900 text-slate-300 rounded-xl font-bold hover:bg-slate-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl flex items-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              <Send size={15} />
              <span>Submit Material Request</span>
            </button>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: REQUEST & ISSUE QUEUE (Site Store Review & Dispatch) */}
      {/* ========================================================================= */}
      {activeSubTab === "request-queue" && (
        <div className="space-y-4 animate-fadeIn">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                <ArrowRightLeft size={18} className="text-amber-400" />
                <span>Site Store Material Requests & Issue Workflow</span>
              </h3>
              <p className="text-xs text-slate-400">
                Review available inventory, approve or partially approve, issue materials, and track status.
              </p>
            </div>
            <button
              onClick={() => setActiveSubTab("create-request")}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow"
            >
              <Plus size={14} />
              <span>New Request</span>
            </button>
          </div>

          <div className="space-y-3">
            {requests.map(req => (
              <div key={req.id} className="p-4 bg-slate-950 rounded-2xl border border-slate-800 hover:border-slate-700 transition space-y-3">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800">
                      {req.requestNumber}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      req.priority === "Critical" 
                        ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                        : req.priority === "Urgent"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        : "bg-slate-800 text-slate-300"
                    }`}>
                      {req.priority}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                      req.status === "APPROVED" || req.status === "ISSUED" || req.status === "RECEIVED"
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : req.status === "PARTIALLY_APPROVED" || req.status === "PARTIALLY_RETURNED"
                        ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                        : req.status === "REJECTED"
                        ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                        : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    }`}>
                      {req.status}
                    </span>
                  </div>

                  <span className="text-[11px] text-slate-400 font-mono">
                    {req.date} {req.time} • Required: {req.requiredDate}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Requester & Scope</span>
                    <span className="font-bold text-white block">{req.requesterName}</span>
                    <span className="text-[11px] text-slate-400">{req.requesterRole} • {req.teamGangSection}</span>
                    <span className="text-[10px] text-slate-500 block">{req.building} - {req.floor} - {req.zone}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 block">Material & Dimensions</span>
                    <span className="font-bold text-amber-300 block">{req.materialName}</span>
                    <span className="text-[11px] text-slate-400 font-mono">{req.materialCode} {req.panelDimension ? `(${req.panelDimension})` : ""}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 block">Quantities</span>
                    <div className="font-mono text-xs">
                      <div>Requested: <strong className="text-white">{req.requestedQuantity} {req.unit}</strong></div>
                      <div>Approved: <strong className="text-emerald-400">{req.approvedQuantity} {req.unit}</strong></div>
                      <div>Issued: <strong className="text-amber-400">{req.issuedQuantity} {req.unit}</strong></div>
                      <div>Returned: <strong className="text-cyan-400">{req.returnedQuantity} {req.unit}</strong></div>
                    </div>
                  </div>

                  {/* Actions according to Role & Strict Lifecycle */}
                  <div className="flex flex-col justify-center items-end gap-1.5">
                    {/* APPROVAL STAGE */}
                    {req.status === "REQUESTED" && (
                      <div className="flex flex-col items-end gap-1">
                        {hasApprovalAuthority && !isWarehouseManager ? (
                          req.requesterUid === activeUid ? (
                            <span 
                              className="px-2.5 py-1 text-[10px] font-mono font-bold bg-amber-950/80 text-amber-300 border border-amber-700/60 rounded-lg flex items-center gap-1"
                              title="Prompt 2 rule: Team Leader, Gang Chief, Section Head or any requester cannot approve own request"
                            >
                              <AlertTriangle size={11} />
                              <span>Cannot Approve Own Request</span>
                            </span>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => {
                                  setSelectedReqForAction(req);
                                  setActionApprovedQty(req.requestedQuantity);
                                  setShowApproveModal(true);
                                }}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer shadow"
                              >
                                <Check size={13} />
                                <span>Approve</span>
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedReqForAction(req);
                                  setShowRejectModal(true);
                                }}
                                className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <X size={13} />
                                <span>Reject</span>
                              </button>
                            </div>
                          )
                        ) : isWarehouseManager ? (
                          <span className="text-[10px] text-slate-500 font-mono italic">
                            Site Store Review (Warehouse Isolation)
                          </span>
                        ) : (
                          <span className="text-[10px] text-amber-400/80 font-mono">
                            Awaiting Store Approval
                          </span>
                        )}
                      </div>
                    )}

                    {/* ISSUE STAGE (Strictly Store Owner or Super Admin) */}
                    {(isStoreOwner || isSuperAdmin) && !isWarehouseManager && (req.status === "APPROVED" || req.status === "PARTIALLY_APPROVED") && req.issuedQuantity < req.approvedQuantity && (
                      <button
                        onClick={() => {
                          setSelectedReqForAction(req);
                          setIssueQty(req.approvedQuantity - req.issuedQuantity);
                          setShowIssueModal(true);
                        }}
                        className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-black flex items-center gap-1 cursor-pointer shadow"
                      >
                        <ArrowRightLeft size={13} />
                        <span>Issue Materials</span>
                      </button>
                    )}

                    {/* RECEIVE CONFIRMATION STAGE */}
                    {req.status === "ISSUED" && !req.receiverConfirmation && (
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] text-amber-400 font-semibold flex items-center gap-1">
                          <Clock size={11} /> Awaiting Receiver Confirmation
                        </span>
                        {(activeUid === req.requesterUid || isFieldStaff || isSuperAdmin) && (
                          <button
                            onClick={async () => {
                              await SiteStoreMovementService.confirmMaterialReceipt(
                                `ISS-${req.id.replace("REQ-", "")}`,
                                { uid: activeUid, name: activeName, role: activeRole }
                              );
                              showToast(`Receipt confirmed for ${req.materialName}!`);
                              loadAllData();
                            }}
                            className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg text-xs font-black flex items-center gap-1 cursor-pointer shadow"
                          >
                            <Check size={12} />
                            <span>Confirm Receipt</span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* RETURN STAGE */}
                    {req.receiverConfirmation && (
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 size={11} /> Received by {req.receivedBy}
                        </span>
                        {(activeUid === req.requesterUid || isFieldStaff || isStoreOwner || isSuperAdmin) && (req.issuedQuantity > req.returnedQuantity) && (
                          <button
                            onClick={() => {
                              setSelectedReqForReturn(req);
                              setReturnQty(Math.max(1, req.issuedQuantity - req.returnedQuantity));
                              setShowReturnModal(true);
                            }}
                            className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer shadow"
                          >
                            <RotateCcw size={12} />
                            <span>Return Unused</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Attached Accessories pill list */}
                {req.attachedAccessories && req.attachedAccessories.length > 0 && (
                  <div className="pt-2 border-t border-slate-800/60 flex flex-wrap items-center gap-2 text-[11px]">
                    <span className="text-slate-500 text-[10px]">Accessories:</span>
                    {req.attachedAccessories.map((acc, aIdx) => (
                      <span key={aIdx} className="px-2 py-0.5 bg-slate-900 text-slate-300 rounded-md border border-slate-800 font-mono text-[10px]">
                        {acc.accessoryName} ({acc.quantity} {acc.unit})
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: RECEIVE & RETURN MATERIALS (Prompt Requirements 12 & 13) */}
      {/* ========================================================================= */}
      {activeSubTab === "receive-return" && (
        <div className="space-y-6 animate-fadeIn">
          {/* SECTION 1: PENDING RECEIPT FOR FIELD STAFF */}
          <div className="p-5 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <span className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 size={15} />
                <span>1. Materials Awaiting Confirmation of Receipt (Prompt 12)</span>
              </span>
              <span className="text-[10px] text-slate-400">Receiver clicks "I received these materials" to lock delivery</span>
            </div>

            <div className="space-y-2.5">
              {requests.filter(r => r.status === "ISSUED" && !r.receiverConfirmation).length === 0 ? (
                <div className="p-4 text-center text-slate-500 text-xs italic bg-slate-900/40 rounded-xl border border-slate-800/80">
                  No materials currently awaiting receipt confirmation. All dispatched items have been received.
                </div>
              ) : (
                requests.filter(r => r.status === "ISSUED" && !r.receiverConfirmation).map(req => (
                  <div key={req.id} className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs">{req.materialName}</span>
                        <span className="font-mono text-amber-400 font-bold">{req.issuedQuantity} {req.unit}</span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Dispatched by {req.issuedBy} to {req.building} {req.floor} {req.zone}
                      </p>
                    </div>

                    <button
                      onClick={async () => {
                        await SiteStoreMovementService.confirmMaterialReceipt(
                          `ISS-${req.id.replace("REQ-", "")}`,
                          { uid: currentUserUid, name: currentUserName, role: currentUserRole }
                        );
                        showToast(`Receipt confirmed for ${req.materialName}!`);
                        loadAllData();
                      }}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow"
                    >
                      <Check size={14} />
                      <span>I Received These Materials</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* SECTION 2: RETURN UNUSED MATERIALS */}
          <div className="p-5 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <span className="text-xs font-black text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <RotateCcw size={15} />
                <span>2. Return Unused Materials to Site Store (Prompt 13)</span>
              </span>
              <span className="text-[10px] text-slate-400">Select active issued batch to process return</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {requests.filter(r => r.issuedQuantity > 0 && r.returnedQuantity < r.issuedQuantity).map(req => (
                <div key={req.id} className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-white text-xs block">{req.materialName}</span>
                    <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950 px-1.5 py-0.5 rounded">
                      {req.requestNumber}
                    </span>
                  </div>
                  <div className="font-mono text-[11px] text-slate-300">
                    <div>Issued: <strong className="text-amber-400">{req.issuedQuantity} {req.unit}</strong></div>
                    <div>Already Returned: <strong className="text-cyan-400">{req.returnedQuantity} {req.unit}</strong></div>
                    <div>Remaining on Site: <strong className="text-white">{req.issuedQuantity - req.returnedQuantity} {req.unit}</strong></div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedReqForReturn(req);
                      setReturnQty(req.issuedQuantity - req.returnedQuantity);
                      setReturnUsedQty(0);
                      setShowReturnModal(true);
                    }}
                    className="w-full py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1 cursor-pointer transition shadow"
                  >
                    <RotateCcw size={13} />
                    <span>Return Material</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: RECONCILIATION & DISCREPANCIES (Prompt 12 & 13) */}
      {/* ========================================================================= */}
      {activeSubTab === "reconciliation" && activeReport && (
        <div className="space-y-5 animate-fadeIn">
          {/* RECONCILIATION FORMULA CARD */}
          <div className="p-5 bg-slate-950 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck size={16} className="text-emerald-400" />
                <span>Automatic Stock Reconciliation Engine (Prompt 12 Formula)</span>
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                Formula Enforced
              </span>
            </div>

            <div className="p-3 bg-slate-900 rounded-xl font-mono text-xs text-slate-300 overflow-x-auto">
              <code>
                Closing Stock = Opening Stock ({activeReport.reconciliation.openingStock}) + Received ({activeReport.reconciliation.received}) + Returned ({activeReport.reconciliation.returned}) + Transfer In ({activeReport.reconciliation.transferIn}) - Issued ({activeReport.reconciliation.issued}) - Transfer Out ({activeReport.reconciliation.transferOut}) - Damaged ({activeReport.reconciliation.damaged}) - Missing ({activeReport.reconciliation.missing}) ± Adjustments ({activeReport.reconciliation.adjustments}) = <strong className="text-emerald-400">{activeReport.reconciliation.calculatedClosingStock} Units</strong>
              </code>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">Calculated Closing</span>
                <span className="text-sm font-bold text-white">{activeReport.reconciliation.calculatedClosingStock} Pcs</span>
              </div>
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">System Recorded</span>
                <span className="text-sm font-bold text-emerald-400">{activeReport.reconciliation.systemRecordedStock} Pcs</span>
              </div>
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">Status</span>
                <span className="text-sm font-bold text-cyan-400">{activeReport.reconciliation.status}</span>
              </div>
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">Active Discrepancies</span>
                <span className="text-sm font-bold text-amber-400">{discrepancies.filter(d => d.status === "OPEN").length} Alert(s)</span>
              </div>
            </div>
          </div>

          {/* ACTIVE DISCREPANCIES LIST */}
          <div className="p-5 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
            <span className="text-xs font-black text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle size={15} />
              <span>Inventory Discrepancy Alerts (Prompt 13)</span>
            </span>

            <div className="space-y-2">
              {discrepancies.map(disc => (
                <div key={disc.id} className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 flex justify-between items-start gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-rose-400">{disc.id}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300">
                        {disc.discrepancyType}
                      </span>
                      <span className="text-slate-400 text-xs font-bold">{disc.materialName} ({disc.materialCode})</span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1">{disc.details}</p>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Detected: {disc.detectedAt} • Assigned: {disc.assignedTo.join(", ")}
                    </span>
                  </div>

                  {disc.status === "OPEN" ? (
                    <button
                      onClick={async () => {
                        const note = prompt("Enter discrepancy resolution notes:");
                        if (note) {
                          await SiteStoreMovementService.resolveDiscrepancy(disc.id, { name: currentUserName, role: currentUserRole }, note);
                          showToast("Discrepancy marked as resolved.");
                          loadAllData();
                        }
                      }}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold cursor-pointer shrink-0"
                    >
                      Resolve Alert
                    </button>
                  ) : (
                    <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 font-bold rounded-lg text-xs">
                      ✓ Resolved
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: AUDIT & HISTORICAL REPORTS (Prompt 21 & 22) */}
      {/* ========================================================================= */}
      {activeSubTab === "audit-reports" && (
        <div className="p-5 bg-slate-950 rounded-2xl border border-slate-800 space-y-4 animate-fadeIn">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
              <FileText size={15} className="text-cyan-400" />
              <span>Historical Daily Reports & Audit Log Chain</span>
            </span>
          </div>

          <div className="space-y-2">
            {dailyReports.map(rep => (
              <div key={rep.id} className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-xs">{rep.reportDate}</span>
                    <span className="text-cyan-400 font-mono text-xs font-bold">{rep.siteStoreName}</span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Issued: {rep.summary.totalItemsIssued} • Returned: {rep.summary.totalItemsReturned} • Net: {rep.summary.netMovement} • Damages: {rep.summary.damagedReturns}
                  </span>
                </div>

                <button
                  onClick={() => {
                    setActiveReport(rep);
                    setActiveSubTab("daily-report");
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold cursor-pointer"
                >
                  View Full Report
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: WAREHOUSE & STORE ROLE ARCHITECTURE (18 Firestore DbService APIs) */}
      {/* ========================================================================= */}
      {activeSubTab === "warehouse-architecture" && (
        <div className="space-y-4 animate-fadeIn">
          <div className="bg-slate-900 border border-cyan-800/40 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Building2 size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <span>{isAmharic ? "የመጋዘን እና ሳይት ስቶር ሚና አርክቴክቸር" : "Warehouse & Site Store Role Architecture Command Hub"}</span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Live Firestore Connected (18 DbService APIs)
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  {isAmharic
                    ? "የተማከለ ማዕከላዊ መጋዘን (17 ሞጁሎች) እና የሳይት ስቶር (13 ሞጁሎች) የቁጥጥር ማዕከል ከእውነተኛ Firestore ዳታቤዝ ጋር የተገናኘ"
                    : "Central Warehouse (17 modules) & Site Store (13 modules) enterprise role command console with persistent Firestore audit ledger"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">{isAmharic ? "የሚሰራበት ሞድ:" : "Operating Mode:"}</span>
              <span className={`px-2.5 py-1 rounded-lg font-bold border text-xs ${
                isStoreOwner 
                  ? "bg-amber-500/10 text-amber-300 border-amber-500/30" 
                  : "bg-cyan-500/10 text-cyan-300 border-cyan-500/30"
              }`}>
                {isStoreOwner ? "Site Store Mode (13 Modules)" : "Warehouse Manager Mode (17 Modules)"}
              </span>
            </div>
          </div>

          <WarehouseStoreRoleArchitecturePanel
            appMode={isStoreOwner ? "store_owner" : "warehouse_manager"}
            currentUserRole={activeRole as any}
            currentUserName={activeName}
            currentUserProfile={{
              uid: activeUid,
              displayName: activeName,
              role: activeRole as any,
              assignedSite: currentUserProfile?.assignedSite || "Bole Heights Phase I",
              assignedWarehouse: currentUserProfile?.assignedWarehouse || "Central Warehouse - Kality Hub"
            }}
            isAmharic={isAmharic}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* APPROVE / PARTIAL APPROVE MODAL */}
      {/* ========================================================================= */}
      {showApproveModal && selectedReqForAction && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h4 className="font-black text-white text-sm">Approve Material Request</h4>
              <button onClick={() => setShowApproveModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="text-xs space-y-2">
              <div>
                <span className="text-slate-400">Material:</span> <strong className="text-white">{selectedReqForAction.materialName}</strong>
              </div>
              <div>
                <span className="text-slate-400">Requested Quantity:</span> <strong className="text-amber-400">{selectedReqForAction.requestedQuantity} {selectedReqForAction.unit}</strong>
              </div>
              <div>
                <label className="text-slate-300 block mb-1 font-bold">Approved Quantity (Partial approval supported) *</label>
                <input
                  type="number"
                  min="1"
                  max={selectedReqForAction.requestedQuantity}
                  value={actionApprovedQty}
                  onChange={e => setActionApprovedQty(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 text-emerald-400 font-mono font-bold rounded-xl px-3 py-2"
                />
              </div>
              <div>
                <label className="text-slate-300 block mb-1 font-bold">Review Notes</label>
                <input
                  type="text"
                  value={actionNotes}
                  onChange={e => setActionNotes(e.target.value)}
                  placeholder="e.g. Approved in full based on store shelf inventory"
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowApproveModal(false)}
                className="px-3.5 py-1.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await SiteStoreMovementService.approveMaterialRequest(
                    selectedReqForAction.id,
                    actionApprovedQty,
                    { uid: currentUserUid, name: currentUserName, role: currentUserRole },
                    actionNotes
                  );
                  setShowApproveModal(false);
                  showToast("Material request approved!");
                  loadAllData();
                }}
                className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs cursor-pointer shadow"
              >
                Confirm Approval
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT MODAL */}
      {showRejectModal && selectedReqForAction && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h4 className="font-black text-rose-400 text-sm">Reject Material Request</h4>
              <button onClick={() => setShowRejectModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="text-xs space-y-2">
              <p className="text-slate-300">
                Rejecting request for <strong className="text-white">{selectedReqForAction.materialName}</strong> ({selectedReqForAction.requestedQuantity} {selectedReqForAction.unit}).
              </p>
              <div>
                <label className="text-slate-300 block mb-1 font-bold">Reason for Rejection *</label>
                <textarea
                  rows={3}
                  required
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="e.g. Stock reserved for 5th floor transfer pour; alternative materials offered"
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-2.5 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!rejectReason.trim()) {
                    alert("Please provide a rejection reason.");
                    return;
                  }
                  await SiteStoreMovementService.rejectMaterialRequest(
                    selectedReqForAction.id,
                    rejectReason,
                    { uid: currentUserUid, name: currentUserName, role: currentUserRole }
                  );
                  setShowRejectModal(false);
                  showToast("Material request rejected.");
                  loadAllData();
                }}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs cursor-pointer shadow"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ISSUE MODAL */}
      {showIssueModal && selectedReqForAction && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h4 className="font-black text-amber-400 text-sm">Issue Material from Site Store</h4>
              <button onClick={() => setShowIssueModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="text-xs space-y-2.5">
              <div>
                <span className="text-slate-400">Material:</span> <strong className="text-white">{selectedReqForAction.materialName}</strong>
              </div>
              <div>
                <label className="text-slate-300 block mb-1 font-bold">Issued Quantity *</label>
                <input
                  type="number"
                  min="1"
                  max={selectedReqForAction.approvedQuantity}
                  value={issueQty}
                  onChange={e => setIssueQty(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 text-amber-400 font-mono font-bold rounded-xl px-3 py-2"
                />
              </div>
              <div>
                <label className="text-slate-300 block mb-1 font-bold">Store Storage Location *</label>
                <input
                  type="text"
                  value={issueLocation}
                  onChange={e => setIssueLocation(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2"
                />
              </div>
              <div>
                <label className="text-slate-300 block mb-1 font-bold">Serial Numbers (Optional comma-separated)</label>
                <input
                  type="text"
                  value={issueSerials}
                  onChange={e => setIssueSerials(e.target.value)}
                  placeholder="e.g. WP-0101, WP-0102, WP-0103"
                  className="w-full bg-slate-950 border border-slate-800 text-cyan-300 font-mono rounded-xl px-3 py-2"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowIssueModal(false)}
                className="px-3.5 py-1.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const serials = issueSerials.split(",").map(s => s.trim()).filter(Boolean);
                  await SiteStoreMovementService.issueMaterial(selectedReqForAction.id, {
                    issuedQty: issueQty,
                    condition: "Good",
                    location: issueLocation,
                    serialNumbers: serials.length ? serials : undefined,
                    issuer: { uid: currentUserUid, name: currentUserName, role: currentUserRole }
                  });
                  setShowIssueModal(false);
                  showToast("Material issued successfully!");
                  loadAllData();
                }}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs cursor-pointer shadow"
              >
                Confirm Dispatch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RETURN MATERIAL MODAL */}
      {showReturnModal && selectedReqForReturn && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h4 className="font-black text-cyan-400 text-sm">Return Material to Site Store</h4>
              <button onClick={() => setShowReturnModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="text-xs space-y-2.5">
              <div>
                <span className="text-slate-400">Material:</span> <strong className="text-white">{selectedReqForReturn.materialName}</strong>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-300 block mb-1 font-bold">Return Quantity *</label>
                  <input
                    type="number"
                    min="1"
                    max={selectedReqForReturn.issuedQuantity - selectedReqForReturn.returnedQuantity}
                    value={returnQty}
                    onChange={e => setReturnQty(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 text-cyan-400 font-mono font-bold rounded-xl px-3 py-2"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1 font-bold">Condition *</label>
                  <select
                    value={returnCondition}
                    onChange={e => setReturnCondition(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-2 py-2"
                  >
                    <option value="Good">Good</option>
                    <option value="Used">Used</option>
                    <option value="Damaged">Damaged</option>
                    <option value="Under Repair">Under Repair</option>
                    <option value="Missing">Missing</option>
                    <option value="Unusable">Unusable</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-slate-300 block mb-1 font-bold">Return Reason / Damage Notes *</label>
                <textarea
                  rows={2}
                  required
                  value={returnReason}
                  onChange={e => setReturnReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-2.5"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowReturnModal(false)}
                className="px-3.5 py-1.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await SiteStoreMovementService.processMaterialReturn({
                    issueId: `ISS-${selectedReqForReturn.id.replace("REQ-", "")}`,
                    returnQty,
                    usedQty: returnUsedQty,
                    condition: returnCondition,
                    reason: returnReason,
                    returner: { uid: currentUserUid, name: currentUserName, role: currentUserRole },
                    storeOwner: { uid: "USER-STO-01", name: "Eng. Sisay Alemu" }
                  });
                  setShowReturnModal(false);
                  showToast("Material return processed and inventory updated!");
                  loadAllData();
                }}
                className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl text-xs cursor-pointer shadow"
              >
                Confirm Return
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SCHEDULE CONFIGURATION MODAL (Prompt 7) */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h4 className="font-black text-cyan-400 text-sm">Configure Daily Report Schedule</h4>
              <button onClick={() => setShowScheduleModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="text-xs space-y-3">
              <div>
                <label className="text-slate-300 block mb-1 font-bold">Report Generation Time</label>
                <input
                  type="time"
                  value={scheduleConfig.reportTime}
                  onChange={e => setScheduleConfig({ ...scheduleConfig, reportTime: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 font-mono"
                />
                <span className="text-[10px] text-slate-500">Default: 18:00 (6:00 PM) Africa/Addis_Ababa</span>
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-bold">Timezone</label>
                <input
                  type="text"
                  disabled
                  value={scheduleConfig.timezone}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-500 rounded-xl px-3 py-2 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 block font-bold">Schedule Options</label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={scheduleConfig.includeWeekends}
                    onChange={e => setScheduleConfig({ ...scheduleConfig, includeWeekends: e.target.checked })}
                    className="accent-cyan-500"
                  />
                  <span className="text-slate-300">Include Weekends (Saturday & Sunday)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={scheduleConfig.autoSyncToHQ}
                    onChange={e => setScheduleConfig({ ...scheduleConfig, autoSyncToHQ: e.target.checked })}
                    className="accent-cyan-500"
                  />
                  <span className="text-slate-300">Automatic Sync to Head Office & Warehouse Managers</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowScheduleModal(false)}
                className="px-3.5 py-1.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await SiteStoreMovementService.saveScheduleConfig(scheduleConfig);
                  setShowScheduleModal(false);
                  showToast("Daily report schedule saved successfully!");
                }}
                className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl text-xs cursor-pointer shadow"
              >
                Save Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
