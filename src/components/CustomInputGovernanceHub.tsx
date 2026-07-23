import React, { useState, useEffect, useMemo } from "react";
import { CustomInputCategory, CustomMasterEntry, CustomInputAuditItem, UserRole } from "../types";
import { CustomInputService } from "../services/customInputService";
import { SmartCustomSelect } from "./SmartCustomSelect";
import {
  Database,
  Search,
  Plus,
  CheckCircle,
  Clock,
  XCircle,
  Star,
  Edit3,
  Trash2,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Filter,
  Sparkles,
  RefreshCw,
  Eye,
  FileSpreadsheet,
  Cpu,
  User,
  Users,
  Lock,
  ArrowRightLeft,
  Tag,
  BookOpen,
  Activity,
  Printer,
  ShieldAlert,
  GitMerge
} from "lucide-react";

interface CustomInputGovernanceHubProps {
  isAmharic?: boolean;
  currentUserRole?: UserRole | string;
  currentUserName?: string;
  onLogAction?: (action: string, details: string) => void;
  onSwitchRole?: (role: UserRole) => void;
}

const CATEGORIES_LIST: CustomInputCategory[] = [
  "Material Name",
  "Material Type",
  "Material Dimension",
  "Supplier Name",
  "Manufacturer",
  "Building Name",
  "Block Name",
  "Floor Name",
  "Zone Name",
  "Defect Type",
  "Hazard Type",
  "Equipment Name",
  "Vehicle Name",
  "Customer Name",
  "Contractor Name",
  "Panel Status",
  "Remarks",
  "Comments"
];

export const CustomInputGovernanceHub: React.FC<CustomInputGovernanceHubProps> = ({
  isAmharic = true,
  currentUserRole = UserRole.SUPER_ADMIN,
  currentUserName = "Nuriye Ahmed Adem (Admin)",
  onLogAction,
  onSwitchRole
}) => {
  const [activeTab, setActiveTab] = useState<
    "dictionary" | "pending" | "sandbox" | "rbac" | "audit"
  >("dictionary");

  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "Approved" | "Pending" | "Rejected">("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  const [masterEntries, setMasterEntries] = useState<CustomMasterEntry[]>([]);
  const [auditLogs, setAuditLogs] = useState<CustomInputAuditItem[]>([]);

  // Modals & Edit States
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    category: "Material Name" as CustomInputCategory,
    value: "",
    labelAm: "",
    description: "",
    reason: "",
    project: "Addis Ababa Tower Block A",
    site: "Main Building Site - East Core",
    userName: currentUserName
  });

  const [editingEntry, setEditingEntry] = useState<CustomMasterEntry | null>(null);
  const [editForm, setEditForm] = useState({ value: "", labelAm: "" });

  const [editBeforeApproveEntry, setEditBeforeApproveEntry] = useState<CustomMasterEntry | null>(null);
  const [editApproveForm, setEditApproveForm] = useState({ value: "", labelAm: "" });

  const [mergeEntryItem, setMergeEntryItem] = useState<CustomMasterEntry | null>(null);
  const [mergeTargetValue, setMergeTargetValue] = useState("");

  const [submissionNotice, setSubmissionNotice] = useState<{ msg: string; isError?: boolean } | null>(null);

  // Sandbox state
  const [sandboxState, setSandboxState] = useState<Record<string, string>>({
    "Material Name": "C30 Pre-mix Structural Concrete",
    "Supplier Name": "Mugher Cement Factory PLC",
    "Floor Name": "Ground Floor (+0.00m)",
    "Defect Type": "Honeycombing Concrete Surface"
  });

  // Reload data
  const loadData = () => {
    setMasterEntries(CustomInputService.getEntries());
    setAuditLogs(CustomInputService.getAuditLogs());
  };

  useEffect(() => {
    loadData();
  }, []);

  // Permission checks
  const permissions = useMemo(() => {
    return CustomInputService.checkPermissions(currentUserRole);
  }, [currentUserRole]);

  // Filtered master entries
  const filteredEntries = useMemo(() => {
    return masterEntries.filter(entry => {
      const matchCat = selectedCategoryFilter === "ALL" || entry.category === selectedCategoryFilter;
      const matchStatus = statusFilter === "ALL" || entry.status === statusFilter;
      const matchSearch = (
        entry.value + " " + 
        (entry.labelAm || "") + " " + 
        entry.category + " " + 
        entry.createdBy
      ).toLowerCase().includes(searchTerm.toLowerCase());

      return matchCat && matchStatus && matchSearch;
    });
  }, [masterEntries, selectedCategoryFilter, statusFilter, searchTerm]);

  // Pending approval list
  const pendingEntries = useMemo(() => {
    return masterEntries.filter(e => e.status === "Pending");
  }, [masterEntries]);

  // Handlers
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.value.trim()) return;

    const result = CustomInputService.submitCustomValue({
      category: addForm.category,
      value: addForm.value,
      labelAm: addForm.labelAm,
      description: addForm.description,
      reason: addForm.reason,
      project: addForm.project,
      site: addForm.site,
      userName: addForm.userName || currentUserName,
      userRole: currentUserRole
    });

    if (result.isDuplicate) {
      setSubmissionNotice({
        msg: isAmharic ? `"${addForm.value}" ቀደም ሲል በቋሚ መዝገብ ውስጥ አለ!` : `"${addForm.value}" already exists in the master database!`,
        isError: true
      });
      setTimeout(() => setSubmissionNotice(null), 4000);
    } else {
      setSubmissionNotice({
        msg: result.requiresApproval
          ? (isAmharic ? "አዲስ ብጁ እሴት ጥያቄ ለአስተዳዳሪ ማጽደቂያ ተልኳል (Status: Pending Approval)!" : "New custom value request submitted for approval (Status: Pending Approval)!")
          : (isAmharic ? "አዲሱ እሴት ጸድቆ በቋሚ መዝገብ ላይ ተጨምሯል!" : "New custom value approved & synchronized to master database!"),
        isError: false
      });
      setTimeout(() => setSubmissionNotice(null), 4000);
    }

    setShowAddModal(false);
    setAddForm({
      category: "Material Name",
      value: "",
      labelAm: "",
      description: "",
      reason: "",
      project: "Addis Ababa Tower Block A",
      site: "Main Building Site - East Core",
      userName: currentUserName
    });
    loadData();
    onLogAction?.("Request Custom Value", `Submitted value "${addForm.value}" for field "${addForm.category}"`);
  };

  const handleApprove = (entryId: string, category: CustomInputCategory) => {
    const perm = CustomInputService.checkPermissions(currentUserRole, category);
    if (!perm.canApprove) {
      alert(isAmharic ? `ለዚህ ምድብ (${category}) ማጽደቅ ፈቃድ የለዎትም። (${perm.authorizedScope})` : `No approval permission for category ${category}. (${perm.authorizedScope})`);
      return;
    }
    CustomInputService.approveEntry(entryId, currentUserName, String(currentUserRole));
    loadData();
    onLogAction?.("Approve Custom Value", `Approved custom entry ${entryId}`);
  };

  const handleReject = (entryId: string, category: CustomInputCategory) => {
    const perm = CustomInputService.checkPermissions(currentUserRole, category);
    if (!perm.canApprove) {
      alert(isAmharic ? `ለዚህ ምድብ (${category}) ውድቅ ማድረግ ፈቃድ የለዎትም።` : `No permission to reject for category ${category}.`);
      return;
    }
    const reasonPrompt = prompt(
      isAmharic ? "እባክዎን ውድቅ የተደረገበትን ምክንያት ያስገቡ:" : "Please enter reason for rejection:",
      "Does not comply with construction standardization rules"
    );
    if (reasonPrompt === null) return;

    CustomInputService.rejectEntry(entryId, currentUserName, String(currentUserRole), reasonPrompt);
    loadData();
    onLogAction?.("Reject Custom Value", `Rejected custom entry ${entryId}`);
  };

  const handleStartEditBeforeApprove = (entry: CustomMasterEntry) => {
    setEditBeforeApproveEntry(entry);
    setEditApproveForm({ value: entry.value, labelAm: entry.labelAm || entry.value });
  };

  const handleSaveEditBeforeApprove = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editBeforeApproveEntry) return;
    CustomInputService.editAndApproveEntry(
      editBeforeApproveEntry.id,
      editApproveForm.value,
      editApproveForm.labelAm,
      currentUserName,
      String(currentUserRole)
    );
    setEditBeforeApproveEntry(null);
    loadData();
    onLogAction?.("Edit & Approve Custom Value", `Edited & Approved custom entry ${editBeforeApproveEntry.id}`);
  };

  const handleStartMerge = (entry: CustomMasterEntry) => {
    const approvedSameCat = masterEntries.filter(e => e.category === entry.category && e.status === "Approved" && e.id !== entry.id);
    if (approvedSameCat.length === 0) {
      alert(isAmharic ? "ለዚህ ምድብ የሚዋሃድ ሌላ የጸደቀ እሴት አልተገኘም።" : "No other approved master value available in this category to merge with.");
      return;
    }
    setMergeEntryItem(entry);
    setMergeTargetValue(approvedSameCat[0].value);
  };

  const handleExecuteMerge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mergeEntryItem || !mergeTargetValue) return;

    CustomInputService.mergeEntry(
      mergeEntryItem.id,
      mergeTargetValue,
      currentUserName,
      String(currentUserRole)
    );
    setMergeEntryItem(null);
    loadData();
    onLogAction?.("Merge Custom Value", `Merged entry ${mergeEntryItem.value} into ${mergeTargetValue}`);
  };

  const handleDelete = (entryId: string, valName: string) => {
    if (!permissions.canDelete) return;
    if (confirm(isAmharic ? `እርግጠኛ ነዎት "${valName}" ከቋሚ መዝገብ ይሰረዝ?` : `Are you sure you want to delete "${valName}"?`)) {
      CustomInputService.deleteEntry(entryId, currentUserName, String(currentUserRole));
      loadData();
      onLogAction?.("Delete Custom Value", `Deleted entry "${valName}"`);
    }
  };

  const handleStartEdit = (entry: CustomMasterEntry) => {
    setEditingEntry(entry);
    setEditForm({ value: entry.value, labelAm: entry.labelAm || entry.value });
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry) return;
    CustomInputService.updateEntry(
      editingEntry.id,
      editForm.value,
      editForm.labelAm,
      currentUserName,
      String(currentUserRole)
    );
    setEditingEntry(null);
    loadData();
  };

  const handleToggleFavorite = (entry: CustomMasterEntry) => {
    CustomInputService.toggleFavorite(entry.id, currentUserName, String(currentUserRole));
    loadData();
  };

  // CSV Export
  const handleExportCsv = () => {
    const csvRows = masterEntries.map(e => ({
      ID: e.id,
      Category: e.category,
      ValueEn: e.value,
      ValueAm: e.labelAm || "",
      Status: e.status,
      Type: e.isPredefined ? "Predefined" : "User Defined",
      CreatedBy: e.createdBy,
      CreatedRole: e.createdByRole,
      CreatedDate: e.createdDate,
      ApprovedBy: e.approvedBy || "",
      UsageCount: e.usageCount
    }));

    if (csvRows.length === 0) return;
    const keys = Object.keys(csvRows[0]);
    let csv = keys.join(",") + "\n";
    csvRows.forEach(row => {
      csv += keys.map(k => `"${String((row as any)[k]).replace(/"/g, '""')}"`).join(",") + "\n";
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `buildsync_custom_input_master_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    onLogAction?.("Export Custom Input Master", "Exported custom master dictionary to CSV");
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 text-slate-100 shadow-2xl max-w-7xl mx-auto space-y-6" id="custom-input-governance-root">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-5 gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-amber-600 rounded-2xl shadow-lg shadow-amber-600/20 text-white">
            <BookOpen size={26} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                {isAmharic ? "የብጁ መረጃዎች ማዕከልና ቋሚ መዝገብ" : "Custom Input & Master Dictionary Hub"}
              </h1>
              <span className="px-2.5 py-0.5 bg-amber-950 text-amber-400 border border-amber-800 text-[10px] font-black uppercase rounded-md tracking-wider">
                RBAC Governed
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {isAmharic
                ? "የተጠቃሚ ብጁ መረጃዎች ማሰባሰቢያ፣ ፍለጋ፣ አውቶሜቲክ ትምህርት (Auto-learning) እና የአስተዳዳሪ ማጽደቂያ ስርዓት"
                : "Dynamic custom entry system with auto-complete, auto-learning master dictionary, and RBAC governance."}
            </p>
          </div>
        </div>

        {/* Header Control Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Submission Notice Banner */}
          {submissionNotice && (
            <div className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center space-x-2 ${
              submissionNotice.isError ? 'bg-red-950 border-red-800 text-red-300' : 'bg-emerald-950 border-emerald-800 text-emerald-300'
            }`}>
              <span>{submissionNotice.msg}</span>
            </div>
          )}

          {/* Role Switcher with all Step 1 and Step 2 roles */}
          {onSwitchRole && (
            <div className="relative group">
              <button className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer">
                <ArrowRightLeft size={14} className="text-amber-400" />
                <span>Switch Role ({currentUserRole})</span>
              </button>
              <div className="absolute right-0 top-full mt-2 w-64 bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl p-2 hidden group-hover:block z-50 space-y-1 text-xs max-h-80 overflow-y-auto">
                <div className="px-2 py-1 text-[10px] font-black uppercase text-amber-400 tracking-wider">Approver Roles</div>
                <button onClick={() => onSwitchRole(UserRole.SUPER_ADMIN)} className="w-full text-left px-2.5 py-1.5 hover:bg-slate-800 rounded-xl font-bold text-amber-400">Admin / Super Admin (Global)</button>
                <button onClick={() => onSwitchRole(UserRole.HEAD_OFFICE)} className="w-full text-left px-2.5 py-1.5 hover:bg-slate-800 rounded-xl font-bold text-amber-300">Head Office (Global)</button>
                <button onClick={() => onSwitchRole(UserRole.WAREHOUSE_MANAGER)} className="w-full text-left px-2.5 py-1.5 hover:bg-slate-800 rounded-xl font-bold text-emerald-400">Warehouse Manager (Material/Inventory)</button>
                <button onClick={() => onSwitchRole(UserRole.PROJECT_MANAGER)} className="w-full text-left px-2.5 py-1.5 hover:bg-slate-800 rounded-xl font-bold text-emerald-300">Project Manager (Project Fields)</button>
                
                <div className="px-2 py-1 text-[10px] font-black uppercase text-blue-400 tracking-wider border-t border-slate-900 mt-1 pt-1">Request Submitter Roles</div>
                <button onClick={() => onSwitchRole(UserRole.STORE_OWNER)} className="w-full text-left px-2.5 py-1.5 hover:bg-slate-800 rounded-xl font-medium text-slate-300">Store Owner</button>
                <button onClick={() => onSwitchRole(UserRole.SITE_ENGINEER)} className="w-full text-left px-2.5 py-1.5 hover:bg-slate-800 rounded-xl font-medium text-slate-300">Site Engineer</button>
                <button onClick={() => onSwitchRole(UserRole.SECTION_HEAD)} className="w-full text-left px-2.5 py-1.5 hover:bg-slate-800 rounded-xl font-medium text-slate-300">Section Head</button>
                <button onClick={() => onSwitchRole(UserRole.SUPERVISOR)} className="w-full text-left px-2.5 py-1.5 hover:bg-slate-800 rounded-xl font-medium text-slate-300">Supervisor</button>
                <button onClick={() => onSwitchRole(UserRole.TEAM_LEADER)} className="w-full text-left px-2.5 py-1.5 hover:bg-slate-800 rounded-xl font-medium text-slate-300">Team Leader</button>
                <button onClick={() => onSwitchRole(UserRole.TIME_KEEPER)} className="w-full text-left px-2.5 py-1.5 hover:bg-slate-800 rounded-xl font-medium text-slate-300">Time Keeper</button>
                <button onClick={() => onSwitchRole(UserRole.GANG_CHIEF)} className="w-full text-left px-2.5 py-1.5 hover:bg-slate-800 rounded-xl font-medium text-slate-300">Gang Chief</button>
                <button onClick={() => onSwitchRole(UserRole.QAQC_ENGINEER)} className="w-full text-left px-2.5 py-1.5 hover:bg-slate-800 rounded-xl font-medium text-slate-300">QA/QC Engineer</button>
                <button onClick={() => onSwitchRole(UserRole.HSE_OFFICER)} className="w-full text-left px-2.5 py-1.5 hover:bg-slate-800 rounded-xl font-medium text-slate-300">HSE Officer</button>
              </div>
            </div>
          )}

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-amber-600 to-red-600 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center space-x-1.5 shadow hover:opacity-95 transition cursor-pointer"
          >
            <Plus size={15} />
            <span>{isAmharic ? "አዲስ እሴት ጠይቅ" : "Request New Value"}</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer"
          >
            <FileSpreadsheet size={14} className="text-emerald-400" />
            <span>{isAmharic ? "ኤክስፖርት" : "CSV Export"}</span>
          </button>
        </div>
      </div>

      {/* TOP KPI STATS SUMMARY */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Stat 1: Total Master Entries */}
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {isAmharic ? "ጠቅላላ ቋሚ እሴቶች" : "Total Master Entries"}
              </span>
              <span className="text-2xl font-black text-white mt-1 block">
                {masterEntries.length}
              </span>
            </div>
            <div className="p-2.5 bg-amber-950/80 border border-amber-800 rounded-xl text-amber-400">
              <Database size={18} />
            </div>
          </div>
          <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between">
            <span>Categories: <strong>17 Active</strong></span>
            <span className="text-emerald-400 font-bold">{masterEntries.filter(e => e.status === "Approved").length} Approved</span>
          </div>
        </div>

        {/* Stat 2: Pending Approval Queue */}
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {isAmharic ? "የጸደቀ ጥያቄዎች" : "Pending Approval"}
              </span>
              <span className="text-2xl font-black text-amber-400 mt-1 block">
                {pendingEntries.length}
              </span>
            </div>
            <div className="p-2.5 bg-amber-950/80 border border-amber-800 rounded-xl text-amber-400">
              <Clock size={18} />
            </div>
          </div>
          <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between">
            <span>Requires Admin Review</span>
            <span className="text-amber-300 font-bold">{pendingEntries.length > 0 ? "Action Required" : "All Clear"}</span>
          </div>
        </div>

        {/* Stat 3: Auto-Learned User Entries */}
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {isAmharic ? "የተማሩ ብጁ እሴቶች" : "Auto-Learned User Values"}
              </span>
              <span className="text-2xl font-black text-emerald-400 mt-1 block">
                {masterEntries.filter(e => !e.isPredefined && e.status === "Approved").length}
              </span>
            </div>
            <div className="p-2.5 bg-emerald-950/80 border border-emerald-800 rounded-xl text-emerald-400">
              <Sparkles size={18} />
            </div>
          </div>
          <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between">
            <span>Learned from site input</span>
            <span className="text-emerald-400 font-bold">100% Shared</span>
          </div>
        </div>

        {/* Stat 4: Permission Role State */}
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {isAmharic ? "የአሁኑ ተጠቃሚ ፈቃድ" : "RBAC Permission State"}
              </span>
              <span className="text-base font-black text-blue-400 mt-1 block truncate">
                {currentUserRole}
              </span>
            </div>
            <div className="p-2.5 bg-blue-950/80 border border-blue-800 rounded-xl text-blue-400">
              <ShieldCheck size={18} />
            </div>
          </div>
          <div className="mt-2 text-[10px] text-slate-400 flex justify-between">
            <span>Can Approve: <strong className={permissions.canApprove ? "text-emerald-400" : "text-red-400"}>{permissions.canApprove ? "YES" : "NO"}</strong></span>
            <span>Can Edit: <strong className={permissions.canEdit ? "text-emerald-400" : "text-red-400"}>{permissions.canEdit ? "YES" : "NO"}</strong></span>
          </div>
        </div>

      </div>

      {/* NAVIGATION TABS */}
      <div className="flex flex-wrap border-b border-slate-800 gap-2">
        {[
          { id: "dictionary", label: isAmharic ? "ቋሚ መዝገብ (Master Dictionary)" : "Master Dictionary", icon: BookOpen, badge: masterEntries.length },
          { id: "pending", label: isAmharic ? "ማጽደቂያ ወረፋ (Pending Approvals)" : "Pending Approvals", icon: Clock, badge: pendingEntries.length },
          { id: "sandbox", label: isAmharic ? "የቀጥታ ፍተሻ ሞዴል (Interactive Sandbox)" : "Dropdown Sandbox", icon: Sparkles },
          { id: "rbac", label: isAmharic ? "የፈቃድ ማትሪክስ (RBAC Governance)" : "RBAC Matrix", icon: Lock },
          { id: "audit", label: isAmharic ? "የእንቅስቃሴ ኦዲት (Audit Log)" : "Audit Log", icon: Activity, badge: auditLogs.length }
        ].map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 flex items-center space-x-2 text-xs font-extrabold uppercase tracking-wider rounded-t-xl transition cursor-pointer ${
                active 
                  ? "bg-amber-600 text-white shadow-lg shadow-amber-600/20" 
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <Icon size={15} />
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                  active ? "bg-white text-amber-900" : "bg-slate-800 text-slate-300"
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* VIEWPORT CONTENT */}
      <div>

        {/* TAB 1: MASTER DICTIONARY BROWSER */}
        {activeTab === "dictionary" && (
          <div className="space-y-4">
            
            {/* Search & Category Filter Toolbar */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row justify-between items-center gap-3">
              
              {/* Category Dropdown Filter */}
              <div className="w-full md:w-64">
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Filter Category:</label>
                <select
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="ALL">-- All Categories (17) --</option>
                  {CATEGORIES_LIST.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div className="w-full md:w-48">
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Filter Status:</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Approved">Approved</option>
                  <option value="Pending">Pending Approval</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>

              {/* Search Bar */}
              <div className="w-full md:flex-1 relative">
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Search Keywords:</label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={isAmharic ? "በእሴት ስም፣ በአማርኛ ወይም በደራሲ ፈልግ..." : "Search by value, translation, creator..."}
                    className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

            </div>

            {/* Master Entries Table */}
            <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900 text-[10px] uppercase font-black text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-3">Category</th>
                      <th className="p-3">Value (English)</th>
                      <th className="p-3">Label (Amharic)</th>
                      <th className="p-3">Source & Status</th>
                      <th className="p-3">Usage</th>
                      <th className="p-3">Created By</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900">
                    {filteredEntries.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-500 text-xs">
                          {isAmharic ? "ምንም የሚመሳሰል መረጃ አልተገኘም።" : "No master entries match your search criteria."}
                        </td>
                      </tr>
                    ) : (
                      filteredEntries.map(entry => (
                        <tr key={entry.id} className="hover:bg-slate-900/60 transition">
                          <td className="p-3 font-bold text-amber-400 whitespace-nowrap">
                            <div className="flex items-center space-x-1.5">
                              <Tag size={12} className="text-amber-500" />
                              <span>{entry.category}</span>
                            </div>
                          </td>

                          <td className="p-3 font-semibold text-white max-w-xs truncate">
                            {entry.value}
                          </td>

                          <td className="p-3 text-slate-300 font-medium">
                            {entry.labelAm || entry.value}
                          </td>

                          <td className="p-3 whitespace-nowrap">
                            <div className="flex items-center space-x-1.5">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                entry.status === "Approved" ? "bg-emerald-950 text-emerald-400 border border-emerald-800" :
                                entry.status === "Pending" ? "bg-amber-950 text-amber-400 border border-amber-800" :
                                "bg-red-950 text-red-400 border border-red-800"
                              }`}>
                                {entry.status}
                              </span>

                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                entry.isPredefined ? "bg-slate-900 text-slate-400 border border-slate-800" : "bg-blue-950 text-blue-300 border border-blue-800"
                              }`}>
                                {entry.isPredefined ? "System" : "User-Learned"}
                              </span>
                            </div>
                          </td>

                          <td className="p-3 font-mono text-slate-300 font-bold">
                            {entry.usageCount}
                          </td>

                          <td className="p-3 text-slate-400 text-[11px]">
                            <div>{entry.createdBy}</div>
                            <div className="text-[9px] font-mono text-slate-500">{entry.createdDate}</div>
                          </td>

                          <td className="p-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end space-x-1">
                              <button
                                onClick={() => handleToggleFavorite(entry)}
                                title="Toggle Favorite"
                                className={`p-1.5 rounded-lg transition ${
                                  entry.isFavorite ? "text-amber-400 hover:text-amber-300" : "text-slate-600 hover:text-amber-400"
                                }`}
                              >
                                <Star size={14} className={entry.isFavorite ? "fill-amber-400" : ""} />
                              </button>

                              {permissions.canEdit && (
                                <button
                                  onClick={() => handleStartEdit(entry)}
                                  title="Edit Entry"
                                  className="p-1.5 text-slate-400 hover:text-white transition"
                                >
                                  <Edit3 size={14} />
                                </button>
                              )}

                              {permissions.canApprove && entry.status === "Pending" && (
                                <button
                                  onClick={() => handleApprove(entry.id, entry.category)}
                                  title="Approve Entry"
                                  className="p-1.5 text-emerald-400 hover:text-emerald-300 transition"
                                >
                                  <CheckCircle size={14} />
                                </button>
                              )}

                              {permissions.canDelete && (
                                <button
                                  onClick={() => handleDelete(entry.id, entry.value)}
                                  title="Delete Entry"
                                  className="p-1.5 text-red-400 hover:text-red-300 transition"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: PENDING APPROVAL QUEUE */}
        {activeTab === "pending" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <Clock size={16} className="text-amber-400" />
                  <span>{isAmharic ? "ያልጸደቁ ብጁ መረጃዎች ማረጋገጫ ወረፋ" : "Pending Custom Value Approvals Queue"}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {isAmharic
                    ? "ከተጠቃሚዎች በሳይት ላይ የተላኩ ብጁ እሴቶች። ሲጸድቁ በሁሉም ተጠቃሚዎች ድሮፕዳውን ላይ ይጨመራሉ።"
                    : "User-entered custom values awaiting Admin verification before becoming visible to all ERP users."}
                </p>
              </div>

              {!permissions.canApprove && (
                <div className="bg-amber-950/80 border border-amber-800 text-amber-300 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5">
                  <Lock size={14} />
                  <span>Approval Permission Required</span>
                </div>
              )}
            </div>

            {pendingEntries.length === 0 ? (
              <div className="bg-slate-950 p-12 rounded-2xl border border-slate-800 text-center space-y-3">
                <div className="w-12 h-12 bg-emerald-950/80 border border-emerald-800 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto">
                  <CheckCircle2 size={24} />
                </div>
                <h4 className="text-sm font-bold text-white">
                  {isAmharic ? "ምንም ያልጸደቀ ጥያቄ የለም!" : "No Pending Approvals in Queue"}
                </h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  All user-defined custom entries have been verified or auto-learned into the master ERP dictionary.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingEntries.map(item => {
                  const itemPerm = CustomInputService.checkPermissions(currentUserRole, item.category);
                  return (
                    <div key={item.id} className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3 relative overflow-hidden flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <span className="px-2.5 py-0.5 bg-amber-950 text-amber-400 border border-amber-800 rounded-md text-[10px] font-black uppercase">
                            Field: {item.category}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">{item.createdDate} {item.createdTime || ""}</span>
                        </div>

                        <div>
                          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">New Value Requested:</div>
                          <h4 className="text-base font-bold text-white text-amber-300">{item.value}</h4>
                          {item.labelAm && (
                            <p className="text-xs text-slate-400 mt-0.5">{item.labelAm}</p>
                          )}
                        </div>

                        <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800/80 space-y-1 text-[11px]">
                          <div><span className="text-slate-500 font-bold">Reason:</span> <span className="text-slate-300">{item.reason || "Operational reporting"}</span></div>
                          <div><span className="text-slate-500 font-bold">Project:</span> <span className="text-slate-300">{item.project || "Addis Ababa Site"}</span></div>
                          <div><span className="text-slate-500 font-bold">Site/Zone:</span> <span className="text-slate-300">{item.site || "Core Wing"}</span></div>
                        </div>

                        <div className="pt-2 border-t border-slate-900 text-[11px] text-slate-400 flex justify-between items-center">
                          <span>Requested By: <strong>{item.createdBy}</strong></span>
                          <span className="text-slate-500 text-[10px]">{item.createdByRole}</span>
                        </div>
                      </div>

                      {itemPerm.canApprove ? (
                        <div className="pt-3 border-t border-slate-900 space-y-1.5">
                          <div className="grid grid-cols-2 gap-1.5">
                            <button
                              onClick={() => handleApprove(item.id, item.category)}
                              className="py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center justify-center space-x-1"
                            >
                              <CheckCircle size={13} />
                              <span>Approve</span>
                            </button>

                            <button
                              onClick={() => handleStartEditBeforeApprove(item)}
                              className="py-1.5 bg-blue-900/80 hover:bg-blue-800 text-blue-200 font-bold rounded-xl text-xs transition cursor-pointer flex items-center justify-center space-x-1"
                            >
                              <Edit3 size={13} />
                              <span>Edit & Approve</span>
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-1.5">
                            <button
                              onClick={() => handleStartMerge(item)}
                              className="py-1.5 bg-purple-900/80 hover:bg-purple-800 text-purple-200 font-bold rounded-xl text-xs transition cursor-pointer flex items-center justify-center space-x-1"
                            >
                              <GitMerge size={13} />
                              <span>Merge Value</span>
                            </button>

                            <button
                              onClick={() => handleReject(item.id, item.category)}
                              className="py-1.5 bg-red-950 hover:bg-red-900 text-red-300 font-bold rounded-xl text-xs transition cursor-pointer flex items-center justify-center space-x-1"
                            >
                              <XCircle size={13} />
                              <span>Reject</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-2 bg-slate-900 rounded-xl text-[10px] text-slate-400 text-center italic">
                          Approval restricted ({itemPerm.authorizedScope})
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: INTERACTIVE DROPDOWN SANDBOX DEMO */}
        {activeTab === "sandbox" && (
          <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Sparkles size={18} className="text-amber-400" />
                <span>{isAmharic ? "የስማርት ድሮፕዳውን የቀጥታ ፍተሻ ሞዴል (Dropdown Playground)" : "Smart Custom Select Field Playground"}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {isAmharic
                  ? "በስርዓቱ ውስጥ ያሉትን ድሮፕዳውኖች ፍለጋ፣ ተመራጮች (Favorites)፣ በቅርቡ የተጠቀሟቸው (Recents) እና 'ሌላ (በግልጽ ይግለጹ)' አማራጮችን እዚህ ላይ መሞከር ይችላሉ።"
                  : "Test live SmartCustomSelect dropdown components across categories with search, favorites, recents, and 'Other (Specify)' user-entry workflow."}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Field 1: Material Name */}
              <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-2">
                <SmartCustomSelect
                  category="Material Name"
                  labelEn="Construction Material Selection"
                  labelAm="የግንባታ ቁሳቁስ መምረጫ"
                  value={sandboxState["Material Name"] || ""}
                  onChange={(val) => setSandboxState(prev => ({ ...prev, "Material Name": val }))}
                  isAmharic={isAmharic}
                  currentUserRole={currentUserRole}
                  currentUserName={currentUserName}
                />
                <div className="p-2 bg-slate-950 rounded-xl text-[11px] text-slate-400 font-mono">
                  Active Value: <strong className="text-amber-400">{sandboxState["Material Name"]}</strong>
                </div>
              </div>

              {/* Field 2: Supplier Name */}
              <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-2">
                <SmartCustomSelect
                  category="Supplier Name"
                  labelEn="Material Supplier / Factory"
                  labelAm="የቁሳቁስ አቅራቢ / ፋብሪካ"
                  value={sandboxState["Supplier Name"] || ""}
                  onChange={(val) => setSandboxState(prev => ({ ...prev, "Supplier Name": val }))}
                  isAmharic={isAmharic}
                  currentUserRole={currentUserRole}
                  currentUserName={currentUserName}
                />
                <div className="p-2 bg-slate-950 rounded-xl text-[11px] text-slate-400 font-mono">
                  Active Value: <strong className="text-amber-400">{sandboxState["Supplier Name"]}</strong>
                </div>
              </div>

              {/* Field 3: Floor Name */}
              <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-2">
                <SmartCustomSelect
                  category="Floor Name"
                  labelEn="Building Floor Level"
                  labelAm="የህንፃው ፎቅ ደረጃ"
                  value={sandboxState["Floor Name"] || ""}
                  onChange={(val) => setSandboxState(prev => ({ ...prev, "Floor Name": val }))}
                  isAmharic={isAmharic}
                  currentUserRole={currentUserRole}
                  currentUserName={currentUserName}
                />
                <div className="p-2 bg-slate-950 rounded-xl text-[11px] text-slate-400 font-mono">
                  Active Value: <strong className="text-amber-400">{sandboxState["Floor Name"]}</strong>
                </div>
              </div>

              {/* Field 4: Defect Type */}
              <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-2">
                <SmartCustomSelect
                  category="Defect Type"
                  labelEn="QA/QC Defect Classification"
                  labelAm="የጥራት ጉድለት ዓይነት"
                  value={sandboxState["Defect Type"] || ""}
                  onChange={(val) => setSandboxState(prev => ({ ...prev, "Defect Type": val }))}
                  isAmharic={isAmharic}
                  currentUserRole={currentUserRole}
                  currentUserName={currentUserName}
                />
                <div className="p-2 bg-slate-950 rounded-xl text-[11px] text-slate-400 font-mono">
                  Active Value: <strong className="text-amber-400">{sandboxState["Defect Type"]}</strong>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 4: RBAC GOVERNANCE MATRIX */}
        {activeTab === "rbac" && (
          <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Lock size={18} className="text-amber-400" />
                <span>{isAmharic ? "በሚና ላይ የተመሰረተ መዳረሻና ፈቃዶች (RBAC Matrix)" : "Role-Based Access Control (RBAC) Governance Matrix"}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {isAmharic
                  ? "ማን አዲስ ብጁ እሴት ማዘጋጀት፣ ማረም፣ ማጽደቅ ወይም መሰረዝ እንደሚችል የሚወስኑ ህጎች።"
                  : "Security matrix defining user permissions for creating, editing, deleting, and approving custom input dictionary items."}
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900 text-[10px] uppercase font-black text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3">User Role</th>
                    <th className="p-3">Add Custom Value</th>
                    <th className="p-3">Edit Master Values</th>
                    <th className="p-3">Delete Master Values</th>
                    <th className="p-3">Approve Pending Values</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900">
                  {[
                    { role: UserRole.SUPER_ADMIN, add: true, edit: true, del: true, approve: true },
                    { role: UserRole.HEAD_OFFICE, add: true, edit: true, del: true, approve: true },
                    { role: UserRole.PROJECT_MANAGER, add: true, edit: true, del: false, approve: true },
                    { role: UserRole.FINANCE_MANAGER, add: true, edit: true, del: false, approve: true },
                    { role: UserRole.WAREHOUSE_MANAGER, add: true, edit: true, del: false, approve: false },
                    { role: UserRole.SITE_ENGINEER, add: true, edit: false, del: false, approve: false },
                    { role: UserRole.SUPERVISOR, add: true, edit: false, del: false, approve: false },
                    { role: UserRole.TIME_KEEPER, add: true, edit: false, del: false, approve: false }
                  ].map((r, idx) => (
                    <tr key={idx} className={`hover:bg-slate-900/60 ${r.role === currentUserRole ? "bg-amber-950/20 font-bold border-l-2 border-amber-500" : ""}`}>
                      <td className="p-3 text-white font-bold flex items-center space-x-2">
                        <span>{r.role}</span>
                        {r.role === currentUserRole && (
                          <span className="px-1.5 py-0.5 bg-amber-500 text-black text-[9px] font-black rounded">CURRENT</span>
                        )}
                      </td>

                      <td className="p-3">
                        <span className="text-emerald-400 font-bold">✓ Allowed (Pending Approval)</span>
                      </td>

                      <td className="p-3">
                        <span className={r.edit ? "text-emerald-400 font-bold" : "text-red-400"}>
                          {r.edit ? "✓ Authorized" : "✕ Restricted"}
                        </span>
                      </td>

                      <td className="p-3">
                        <span className={r.del ? "text-emerald-400 font-bold" : "text-red-400"}>
                          {r.del ? "✓ Authorized" : "✕ Restricted"}
                        </span>
                      </td>

                      <td className="p-3">
                        <span className={r.approve ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
                          {r.approve ? "✓ Direct Approve" : "Requires Admin Review"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: AUDIT LOG */}
        {activeTab === "audit" && (
          <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <Activity size={18} className="text-amber-400" />
                  <span>{isAmharic ? "የብጁ መረጃዎች እንቅስቃሴ ኦዲት (Audit Trails)" : "Custom Input Enterprise Security Audit Logs"}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Complete audit log recording Requested By, Approved By, Approver Role, Date, Time, Previous Value (if edited or merged), New Value, and Status.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900 text-[10px] uppercase font-black text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3">Date & Time</th>
                    <th className="p-3">Requested By</th>
                    <th className="p-3">Approved By & Role</th>
                    <th className="p-3">Field / Category</th>
                    <th className="p-3">Action</th>
                    <th className="p-3">Previous Value</th>
                    <th className="p-3">New / Final Value</th>
                    <th className="p-3">Status & Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-6 text-center text-slate-500 text-xs">
                        No custom input audit records found.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-900/60 transition font-mono text-[11px]">
                        <td className="p-3 text-slate-400 whitespace-nowrap">
                          <div>{log.date || log.timestamp.slice(0, 10)}</div>
                          <div className="text-[9px] text-slate-500">{log.time || log.timestamp.slice(11)}</div>
                        </td>
                        <td className="p-3 text-slate-200">
                          <div className="font-bold text-amber-300">{log.requestedBy || log.userName}</div>
                          <div className="text-[9px] text-slate-500">{log.role}</div>
                        </td>
                        <td className="p-3 text-slate-200">
                          {log.approvedBy ? (
                            <>
                              <div className="font-bold text-emerald-400">{log.approvedBy}</div>
                              <div className="text-[9px] text-slate-400">{log.approvedByRole || "Approver"}</div>
                            </>
                          ) : (
                            <span className="text-slate-500 italic">Pending Review</span>
                          )}
                        </td>
                        <td className="p-3 text-amber-400 font-bold">{log.category}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                            log.action === "Created" ? "bg-blue-950 text-blue-400 border border-blue-800" :
                            log.action === "Approved" ? "bg-emerald-950 text-emerald-400 border border-emerald-800" :
                            log.action === "Merged" ? "bg-purple-950 text-purple-400 border border-purple-800" :
                            log.action === "Rejected" ? "bg-red-950 text-red-400 border border-red-800" :
                            log.action === "Deleted" ? "bg-red-950 text-red-400 border border-red-800" :
                            "bg-slate-800 text-slate-300"
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="p-3 font-semibold text-slate-400">
                          {log.previousValue ? <span className="line-through text-red-400/80">{log.previousValue}</span> : "-"}
                        </td>
                        <td className="p-3 font-semibold text-white">{log.newValue || log.entryValue}</td>
                        <td className="p-3 text-slate-400 text-[10px] max-w-xs">{log.details}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* REQUEST NEW VALUE MODAL (Step 1) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <Plus size={18} className="text-amber-400" />
                  <span>{isAmharic ? "አዲስ ብጁ እሴት መጠየቂያ ቅጽ" : "Request New Custom Field Value"}</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Submit custom entry when required option is missing in ERP dropdowns.</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <XCircle size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Field Name (Category) / ምድብ:</label>
                  <select
                    value={addForm.category}
                    onChange={(e) => setAddForm(prev => ({ ...prev, category: e.target.value as any }))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500 font-bold"
                  >
                    {CATEGORIES_LIST.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Submitting User / ጠያቂ:</label>
                  <input
                    type="text"
                    required
                    value={addForm.userName}
                    onChange={(e) => setAddForm(prev => ({ ...prev, userName: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-amber-300 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">New Value / አዲስ እሴት (English):</label>
                <input
                  type="text"
                  required
                  value={addForm.value}
                  onChange={(e) => setAddForm(prev => ({ ...prev, value: e.target.value }))}
                  placeholder="e.g. Rapid-Setting Polymer Mortar 25kg"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-bold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Reason for Request / የተጠየቀበት ምክንያት:</label>
                <input
                  type="text"
                  required
                  value={addForm.reason}
                  onChange={(e) => setAddForm(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="e.g. Non-standard material required for basement waterproofing specification"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Project / ፕሮጀክት:</label>
                  <input
                    type="text"
                    required
                    value={addForm.project}
                    onChange={(e) => setAddForm(prev => ({ ...prev, project: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Site / Location / ቦታ:</label>
                  <input
                    type="text"
                    required
                    value={addForm.site}
                    onChange={(e) => setAddForm(prev => ({ ...prev, site: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Amharic Translation / አማርኛ:</label>
                  <input
                    type="text"
                    value={addForm.labelAm}
                    onChange={(e) => setAddForm(prev => ({ ...prev, labelAm: e.target.value }))}
                    placeholder="ምሳሌ፡ በፍጥነት የሚደርቅ ፖሊመር ሞርታር"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Current Role Scope:</label>
                  <div className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-amber-400 font-mono text-[11px] font-bold">
                    {currentUserRole} ({permissions.authorizedScope})
                  </div>
                </div>
              </div>

              <div className="pt-3 flex justify-end space-x-2 border-t border-slate-900">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold shadow"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT BEFORE APPROVAL MODAL (Step 2) */}
      {editBeforeApproveEntry && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Edit3 size={18} className="text-blue-400" />
                <span>Standardize & Approve Custom Value</span>
              </h3>
              <button onClick={() => setEditBeforeApproveEntry(null)} className="text-slate-400 hover:text-white">
                <XCircle size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditBeforeApprove} className="space-y-3 text-xs">
              <div className="p-3 bg-slate-900 rounded-2xl border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase font-bold">Requested By:</div>
                <div className="text-amber-300 font-bold">{editBeforeApproveEntry.createdBy} ({editBeforeApproveEntry.createdByRole})</div>
                <div className="text-[10px] text-slate-500 uppercase font-bold mt-2">Original Value:</div>
                <div className="text-slate-300 font-mono font-bold">{editBeforeApproveEntry.value}</div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Standardized Value (English):</label>
                <input
                  type="text"
                  required
                  value={editApproveForm.value}
                  onChange={(e) => setEditApproveForm(prev => ({ ...prev, value: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Standardized Label (Amharic):</label>
                <input
                  type="text"
                  value={editApproveForm.labelAm}
                  onChange={(e) => setEditApproveForm(prev => ({ ...prev, labelAm: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditBeforeApproveEntry(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold"
                >
                  Save & Approve
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MERGE ENTRY MODAL (Step 2) */}
      {mergeEntryItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <GitMerge size={18} className="text-purple-400" />
                <span>Merge Custom Value into Standard Option</span>
              </h3>
              <button onClick={() => setMergeEntryItem(null)} className="text-slate-400 hover:text-white">
                <XCircle size={18} />
              </button>
            </div>

            <form onSubmit={handleExecuteMerge} className="space-y-3 text-xs">
              <div className="p-3 bg-purple-950/40 border border-purple-800 rounded-2xl space-y-1">
                <div className="text-[10px] text-purple-300 font-bold uppercase">Requested Pending Value:</div>
                <div className="text-white font-bold font-mono">{mergeEntryItem.value}</div>
                <div className="text-[10px] text-slate-400">Category: {mergeEntryItem.category} | Requested by: {mergeEntryItem.createdBy}</div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Target Master Approved Option:</label>
                <select
                  value={mergeTargetValue}
                  onChange={(e) => setMergeTargetValue(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-bold focus:outline-none focus:border-purple-500"
                >
                  {masterEntries
                    .filter(e => e.category === mergeEntryItem.category && e.status === "Approved" && e.id !== mergeEntryItem.id)
                    .map(option => (
                      <option key={option.id} value={option.value}>
                        {option.value} {option.labelAm ? `(${option.labelAm})` : ''}
                      </option>
                    ))
                  }
                </select>
              </div>

              <div className="p-2 bg-slate-900 rounded-xl text-[10px] text-slate-400 italic">
                Merging will set status to "Approved", map references to the selected target value, and increment target usage count.
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setMergeEntryItem(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold shadow"
                >
                  Execute Merge
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ENTRY MODAL */}
      {editingEntry && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Edit3 size={18} className="text-amber-400" />
                <span>{isAmharic ? "እሴት አርም" : "Edit Master Value"}</span>
              </h3>
              <button onClick={() => setEditingEntry(null)} className="text-slate-400 hover:text-white">
                <XCircle size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 text-[10px] uppercase font-bold">Category:</label>
                <div className="text-amber-400 font-bold text-sm">{editingEntry.category}</div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Value (English):</label>
                <input
                  type="text"
                  required
                  value={editForm.value}
                  onChange={(e) => setEditForm(prev => ({ ...prev, value: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Amharic Label:</label>
                <input
                  type="text"
                  value={editForm.labelAm}
                  onChange={(e) => setEditForm(prev => ({ ...prev, labelAm: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingEntry(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold"
                >
                  Update Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
