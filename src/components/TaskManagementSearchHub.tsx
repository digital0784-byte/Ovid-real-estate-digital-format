import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  Filter,
  ArrowUpDown,
  Plus,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  FileText,
  User,
  Building2,
  MapPin,
  Tag,
  Download,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Shield,
  Layers,
  Sparkles,
  QrCode,
  X,
  SlidersHorizontal,
  Bookmark,
  Check,
  Paperclip
} from "lucide-react";
import {
  ErpTask,
  TaskStatus,
  TaskPriority,
  TaskFilterPreferences,
  UserRole,
  ProjectZone,
  Worker
} from "../types";
import { DbService } from "../services/db";

interface TaskManagementSearchHubProps {
  currentUserRole: UserRole;
  currentUserProfile?: any;
  zones?: ProjectZone[];
  workers?: Worker[];
  isAmharic: boolean;
  onLogAction?: (action: string, details: string) => void;
}

export const TaskManagementSearchHub: React.FC<TaskManagementSearchHubProps> = ({
  currentUserRole,
  currentUserProfile,
  zones = [],
  workers = [],
  isAmharic,
  onLogAction
}) => {
  const currentUserName = currentUserProfile?.displayName || "Nuriye Ahmed Adem";
  const currentUserId = currentUserProfile?.uid || "super-admin-nuriye";

  const [tasks, setTasks] = useState<ErpTask[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedTask, setSelectedTask] = useState<ErpTask | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [notificationMsg, setNotificationMsg] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  // Search, Filters & Preferences
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filterProject, setFilterProject] = useState<string>("ALL");
  const [filterSite, setFilterSite] = useState<string>("ALL");
  const [filterBuilding, setFilterBuilding] = useState<string>("ALL");
  const [filterFloor, setFilterFloor] = useState<string>("ALL");
  const [filterZone, setFilterZone] = useState<string>("ALL");
  const [filterAssigned, setFilterAssigned] = useState<string>("ALL");
  const [filterCreator, setFilterCreator] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterPriority, setFilterPriority] = useState<string>("ALL");
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [dateFilterType, setDateFilterType] = useState<TaskFilterPreferences["dateFilterType"]>("all");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");

  // Sorting & Pagination
  const [sortField, setSortField] = useState<TaskFilterPreferences["sortField"]>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 8;

  // New/Edit Task Form State
  const [formTaskName, setFormTaskName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formProject, setFormProject] = useState("Addis Ababa Tower Block A");
  const [formSite, setFormSite] = useState("Central Addis Site");
  const [formBuilding, setFormBuilding] = useState("Block A");
  const [formFloor, setFormFloor] = useState<number | string>(4);
  const [formZone, setFormZone] = useState("Zone A");
  const [formAssignedId, setFormAssignedId] = useState("");
  const [formDueDate, setFormDueDate] = useState(new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10));
  const [formPriority, setFormPriority] = useState<TaskPriority>("High");
  const [formCategory, setFormCategory] = useState("Formwork Assembly");
  const [formStatus, setFormStatus] = useState<TaskStatus>("Pending");
  const [formRelatedSerials, setFormRelatedSerials] = useState("");
  const [formNotes, setFormNotes] = useState("");

  // Role Permissions
  const canCreateTask = useMemo(() => {
    return [
      UserRole.SUPER_ADMIN,
      UserRole.HEAD_OFFICE,
      UserRole.PROJECT_MANAGER,
      UserRole.SITE_ENGINEER,
      UserRole.SUPERVISOR,
      UserRole.TEAM_LEADER,
      UserRole.GANG_CHIEF,
      UserRole.HR_MANAGER
    ].includes(currentUserRole);
  }, [currentUserRole]);

  // Load Saved Preferences from LocalStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("dcerp_task_filter_prefs");
      if (saved) {
        const p: TaskFilterPreferences = JSON.parse(saved);
        if (p.sortField) setSortField(p.sortField);
        if (p.sortDirection) setSortDirection(p.sortDirection);
        if (p.status) setFilterStatus(p.status);
        if (p.priority) setFilterPriority(p.priority);
      }
    } catch {}
  }, []);

  // Subscribe to real-time Tasks in Firestore
  useEffect(() => {
    setIsLoading(true);
    const unsub = DbService.subscribeTasks(
      (loaded) => {
        setTasks(loaded);
        setIsLoading(false);
      },
      () => {
        setTasks(DbService.getCachedTasks());
        setIsLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // Save Filter Preferences
  const handleSavePreferences = () => {
    const prefs: TaskFilterPreferences = {
      searchTerm,
      projectId: filterProject,
      siteName: filterSite,
      building: filterBuilding,
      floor: filterFloor,
      zone: filterZone,
      assignedPerson: filterAssigned,
      createdByName: filterCreator,
      status: filterStatus,
      priority: filterPriority,
      category: filterCategory,
      dateFilterType,
      customStartDate,
      customEndDate,
      sortField,
      sortDirection
    };
    try {
      localStorage.setItem("dcerp_task_filter_prefs", JSON.stringify(prefs));
      setNotificationMsg({
        type: "success",
        text: isAmharic ? "የማጣሪያ ምርጫዎች በተሳካ ሁኔታ ተቀምጠዋል!" : "Filter preferences saved successfully!"
      });
      setTimeout(() => setNotificationMsg(null), 3500);
    } catch {
      setNotificationMsg({
        type: "error",
        text: isAmharic ? "ምርጫዎችን ማስቀመጥ አልተቻለም" : "Failed to save preferences"
      });
    }
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setFilterProject("ALL");
    setFilterSite("ALL");
    setFilterBuilding("ALL");
    setFilterFloor("ALL");
    setFilterZone("ALL");
    setFilterAssigned("ALL");
    setFilterCreator("ALL");
    setFilterStatus("ALL");
    setFilterPriority("ALL");
    setFilterCategory("ALL");
    setDateFilterType("all");
    setCustomStartDate("");
    setCustomEndDate("");
    setCurrentPage(1);
  };

  // Distinct Filter Value Options derived from tasks & zones
  const projectOptions = useMemo(() => Array.from(new Set(tasks.map(t => t.projectName).filter(Boolean))), [tasks]);
  const siteOptions = useMemo(() => Array.from(new Set(tasks.map(t => t.siteName).filter(Boolean))), [tasks]);
  const buildingOptions = useMemo(() => Array.from(new Set(tasks.map(t => t.building).filter(Boolean))), [tasks]);
  const floorOptions = useMemo(() => Array.from(new Set(tasks.map(t => String(t.floor || "")).filter(Boolean))), [tasks]);
  const zoneOptions = useMemo(() => Array.from(new Set(tasks.map(t => t.zone).filter(Boolean))), [tasks]);
  const assignedOptions = useMemo(() => Array.from(new Set(tasks.map(t => t.assignedToName).filter(Boolean))), [tasks]);
  const creatorOptions = useMemo(() => Array.from(new Set(tasks.map(t => t.createdByName).filter(Boolean))), [tasks]);
  const categoryOptions = useMemo(() => Array.from(new Set(tasks.map(t => t.category).filter(Boolean))), [tasks]);

  // Date Filter Predicate
  const matchesDateRange = (taskDateStr: string): boolean => {
    if (!taskDateStr || dateFilterType === "all") return true;
    const taskDate = new Date(taskDateStr);
    const now = new Date();

    if (dateFilterType === "today") {
      return taskDate.toDateString() === now.toDateString();
    }
    if (dateFilterType === "yesterday") {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      return taskDate.toDateString() === yesterday.toDateString();
    }
    if (dateFilterType === "last7") {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return taskDate >= sevenDaysAgo && taskDate <= now;
    }
    if (dateFilterType === "last30") {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return taskDate >= thirtyDaysAgo && taskDate <= now;
    }
    if (dateFilterType === "thisMonth") {
      return taskDate.getFullYear() === now.getFullYear() && taskDate.getMonth() === now.getMonth();
    }
    if (dateFilterType === "custom") {
      if (customStartDate && new Date(taskDateStr) < new Date(customStartDate)) return false;
      if (customEndDate && new Date(taskDateStr) > new Date(customEndDate + "T23:59:59")) return false;
      return true;
    }
    return true;
  };

  // Filtered and Searched Tasks
  const filteredTasks = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();

    return tasks.filter((t) => {
      // 1. Text Search across supported normalized fields
      if (term) {
        const matchesName = t.taskName?.toLowerCase().includes(term);
        const matchesId = t.taskId?.toLowerCase().includes(term) || t.id?.toLowerCase().includes(term);
        const matchesProject = t.projectName?.toLowerCase().includes(term) || t.projectId?.toLowerCase().includes(term);
        const matchesSite = t.siteName?.toLowerCase().includes(term) || t.siteId?.toLowerCase().includes(term);
        const matchesBuilding = t.building?.toLowerCase().includes(term);
        const matchesZone = t.zone?.toLowerCase().includes(term);
        const matchesFloor = String(t.floor || "").toLowerCase().includes(term);
        const matchesAssigned = t.assignedToName?.toLowerCase().includes(term) || t.assignedToId?.toLowerCase().includes(term);
        const matchesCreator = t.createdByName?.toLowerCase().includes(term);
        const matchesCategory = t.category?.toLowerCase().includes(term);
        const matchesPanels = t.relatedPanelSerials?.some(s => s.toLowerCase().includes(term));
        const matchesDesc = t.description?.toLowerCase().includes(term);

        if (!(matchesName || matchesId || matchesProject || matchesSite || matchesBuilding || matchesZone || matchesFloor || matchesAssigned || matchesCreator || matchesCategory || matchesPanels || matchesDesc)) {
          return false;
        }
      }

      // 2. Combined Field Dropdowns
      if (filterProject !== "ALL" && t.projectName !== filterProject) return false;
      if (filterSite !== "ALL" && t.siteName !== filterSite) return false;
      if (filterBuilding !== "ALL" && t.building !== filterBuilding) return false;
      if (filterFloor !== "ALL" && String(t.floor || "") !== filterFloor) return false;
      if (filterZone !== "ALL" && t.zone !== filterZone) return false;
      if (filterAssigned !== "ALL" && t.assignedToName !== filterAssigned) return false;
      if (filterCreator !== "ALL" && t.createdByName !== filterCreator) return false;
      if (filterStatus !== "ALL" && t.status !== filterStatus) return false;
      if (filterPriority !== "ALL" && t.priority !== filterPriority) return false;
      if (filterCategory !== "ALL" && t.category !== filterCategory) return false;

      // 3. Date Filters
      if (!matchesDateRange(t.createdAt)) return false;

      return true;
    });
  }, [
    tasks,
    searchTerm,
    filterProject,
    filterSite,
    filterBuilding,
    filterFloor,
    filterZone,
    filterAssigned,
    filterCreator,
    filterStatus,
    filterPriority,
    filterCategory,
    dateFilterType,
    customStartDate,
    customEndDate
  ]);

  // Deterministic Sorting with Secondary Sort (ID)
  const sortedTasks = useMemo(() => {
    return [...filteredTasks].sort((a, b) => {
      let comparison = 0;
      if (sortField === "createdAt") {
        comparison = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      } else if (sortField === "taskName") {
        comparison = (a.taskName || "").localeCompare(b.taskName || "");
      } else if (sortField === "dueDate") {
        comparison = new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime();
      } else if (sortField === "updatedAt") {
        comparison = new Date(a.updatedAt || 0).getTime() - new Date(b.updatedAt || 0).getTime();
      } else if (sortField === "priority") {
        const order: Record<TaskPriority, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };
        comparison = (order[a.priority] || 0) - (order[b.priority] || 0);
      } else if (sortField === "status") {
        comparison = (a.status || "").localeCompare(b.status || "");
      } else if (sortField === "completionDate") {
        comparison = new Date(a.completionDate || 0).getTime() - new Date(b.completionDate || 0).getTime();
      }

      if (comparison !== 0) {
        return sortDirection === "asc" ? comparison : -comparison;
      }
      // Deterministic secondary sort
      return (a.id || "").localeCompare(b.id || "");
    });
  }, [filteredTasks, sortField, sortDirection]);

  // Paginated Slices
  const totalPages = Math.max(1, Math.ceil(sortedTasks.length / pageSize));
  const paginatedTasks = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedTasks.slice(start, start + pageSize);
  }, [sortedTasks, currentPage, pageSize]);

  // Export to CSV
  const handleExportCSV = () => {
    if (sortedTasks.length === 0) return;
    const headers = [
      "Task ID",
      "Task Name",
      "Project",
      "Site",
      "Building",
      "Floor",
      "Zone",
      "Assigned Person",
      "Created By",
      "Status",
      "Priority",
      "Created Date",
      "Due Date",
      "Completion Date",
      "Category"
    ];

    const rows = sortedTasks.map(t => [
      `"${t.taskId}"`,
      `"${(t.taskName || "").replace(/"/g, '""')}"`,
      `"${(t.projectName || "").replace(/"/g, '""')}"`,
      `"${(t.siteName || "").replace(/"/g, '""')}"`,
      `"${t.building || ""}"`,
      `"${t.floor || ""}"`,
      `"${t.zone || ""}"`,
      `"${(t.assignedToName || "").replace(/"/g, '""')}"`,
      `"${(t.createdByName || "").replace(/"/g, '""')}"`,
      `"${t.status}"`,
      `"${t.priority}"`,
      `"${t.createdAt}"`,
      `"${t.dueDate}"`,
      `"${t.completionDate || ""}"`,
      `"${t.category || ""}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `DC_ERP_Tasks_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (onLogAction) {
      onLogAction("Task Records Exported", `Exported ${sortedTasks.length} task records to CSV format.`);
    }
  };

  // Create Task Submission
  const handleCreateTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTaskName.trim()) return;

    const assignedWorker = workers.find(w => w.id === formAssignedId);
    const newTaskId = `TSK-${Date.now().toString().slice(-6)}`;
    const nowIso = new Date().toISOString();

    const serialsList = formRelatedSerials
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);

    const newTask: ErpTask = {
      id: newTaskId,
      taskId: newTaskId,
      taskName: formTaskName.trim(),
      description: formDescription.trim(),
      projectId: "PRJ-ADDIS-01",
      projectName: formProject,
      siteName: formSite,
      building: formBuilding,
      floor: formFloor,
      zone: formZone,
      assignedToId: assignedWorker?.id || formAssignedId || currentUserId,
      assignedToName: assignedWorker?.name || currentUserName,
      assignedToRole: assignedWorker?.trade || assignedWorker?.position || "Worker",
      createdById: currentUserId,
      createdByName: currentUserName,
      createdByRole: currentUserRole,
      createdAt: nowIso,
      dueDate: formDueDate,
      status: formStatus,
      priority: formPriority,
      updatedAt: nowIso,
      updatedByName: currentUserName,
      category: formCategory,
      completionPercentage: formStatus === "Completed" ? 100 : 0,
      relatedPanelSerials: serialsList,
      notes: formNotes.trim(),
      relatedEvidence: []
    };

    try {
      await DbService.addTask(newTask);
      setIsCreateModalOpen(false);
      setNotificationMsg({
        type: "success",
        text: isAmharic ? `አዲስ ተግባር ተመዝግቧል (${newTaskId})` : `Task ${newTaskId} created successfully!`
      });
      if (onLogAction) {
        onLogAction("ERP Task Created", `Created Task ${newTaskId}: "${newTask.taskName}" for ${newTask.assignedToName}`);
      }
      setTimeout(() => setNotificationMsg(null), 3500);
      // Reset form
      setFormTaskName("");
      setFormDescription("");
      setFormRelatedSerials("");
      setFormNotes("");
    } catch (err: any) {
      setNotificationMsg({
        type: "error",
        text: isAmharic ? "ተግባሩን ማስመዝገብ አልተሳካም" : `Error creating task: ${err.message || String(err)}`
      });
    }
  };

  // Status Change Quick Action
  const handleUpdateStatus = async (task: ErpTask, nextStatus: TaskStatus) => {
    const updated: ErpTask = {
      ...task,
      status: nextStatus,
      updatedAt: new Date().toISOString(),
      updatedById: currentUserId,
      updatedByName: currentUserName,
      completionDate: nextStatus === "Completed" ? new Date().toISOString() : task.completionDate,
      completionPercentage: nextStatus === "Completed" ? 100 : task.completionPercentage
    };
    try {
      await DbService.updateTask(updated);
      if (selectedTask?.id === task.id) setSelectedTask(updated);
      setNotificationMsg({
        type: "success",
        text: isAmharic ? `የተግባር ሁኔታ ተቀይሯል: ${nextStatus}` : `Status updated to ${nextStatus}`
      });
      if (onLogAction) {
        onLogAction("Task Status Updated", `Task ${task.taskId} updated to ${nextStatus}`);
      }
      setTimeout(() => setNotificationMsg(null), 3000);
    } catch (err: any) {
      setNotificationMsg({
        type: "error",
        text: `Update failed: ${err.message || String(err)}`
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1.5">
          <div className="flex items-center space-x-2">
            <span className="p-2 bg-red-600 rounded-xl text-white shadow-lg shadow-red-600/30">
              <CheckCircle2 size={20} />
            </span>
            <span className="text-xs uppercase tracking-widest font-extrabold text-red-500">
              {isAmharic ? "የግንባታ ተግባራትና የስራ ትዕዛዞች ማዕከል" : "Field Task Management & Execution Engine"}
            </span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white">
            {isAmharic ? "የስራ ትዕዛዞች ፍለጋ፣ ማጣሪያ እና ቁጥጥር" : "Task Management, Multi-Field Search & Audit"}
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            {isAmharic
              ? "የግንባታ፣ የአሉሚኒየም ፎርምወርክ፣ የኮንክሪት እና የጥራት ቁጥጥር ስራዎችን በፕሮጀክት፣ ሳይት፣ ፎቅ፣ ዞን እና ፓነል ተከታትሎ የመቆጣጠሪያ ማዕከል።"
              : "Search, filter, assign, and track construction execution across projects, sites, zones, and panel serial numbers with full Firestore synchronization."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {canCreateTask && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black transition-all flex items-center space-x-2 shadow-lg shadow-red-600/20 cursor-pointer"
            >
              <Plus size={16} />
              <span>{isAmharic ? "+ አዲስ ተግባር መዝግብ" : "+ Create New Task"}</span>
            </button>
          )}

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer"
            title="Export filtered records to CSV"
          >
            <Download size={15} className="text-slate-400" />
            <span>{isAmharic ? "መረጃ ላክ (CSV)" : "Export CSV"}</span>
          </button>

          <button
            onClick={handleSavePreferences}
            className="px-3.5 py-2.5 bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer"
            title="Save current filter preferences"
          >
            <Bookmark size={15} />
            <span>{isAmharic ? "ምርጫ አስቀምጥ" : "Save Preferences"}</span>
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {notificationMsg && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center justify-between transition-all ${
            notificationMsg.type === "success"
              ? "bg-emerald-950/70 border-emerald-500/30 text-emerald-300"
              : notificationMsg.type === "error"
              ? "bg-red-950/70 border-red-500/30 text-red-300"
              : "bg-blue-950/70 border-blue-500/30 text-blue-300"
          }`}
        >
          <div className="flex items-center space-x-2">
            <CheckCircle2 size={16} />
            <span>{notificationMsg.text}</span>
          </div>
          <button onClick={() => setNotificationMsg(null)} className="cursor-pointer text-slate-400 hover:text-white">
            <X size={14} />
          </button>
        </div>
      )}

      {/* SEARCH AND MULTI-CRITERIA FILTER CONTROL PANEL */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
        {/* Row 1: Universal Search Input + Sort Fields */}
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              placeholder={
                isAmharic
                  ? "በተግባር ስም፣ መለያ፣ ሰራተኛ፣ ፕሮጀክት፣ ሳይት፣ ፎቅ፣ ዞን ወይም ፓነል ሲሪያል ፈልግ..."
                  : "Search task name, ID, assignee, project, site, floor, zone, panel serial..."
              }
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Sort Controls */}
          <div className="flex items-center space-x-2 shrink-0">
            <span className="text-[11px] font-bold text-slate-500 flex items-center space-x-1">
              <ArrowUpDown size={14} />
              <span>{isAmharic ? "ቅደም ተከተል:" : "Sort:"}</span>
            </span>
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="createdAt">{isAmharic ? "የተመዘገበበት ቀን" : "Created Date"}</option>
              <option value="dueDate">{isAmharic ? "የማጠናቀቂያ ቀን" : "Due Date"}</option>
              <option value="taskName">{isAmharic ? "የተግባር ስም (A-Z)" : "Task Name"}</option>
              <option value="priority">{isAmharic ? "የአስቸኳይነት ደረጃ" : "Priority"}</option>
              <option value="status">{isAmharic ? "ሁኔታ" : "Status"}</option>
              <option value="updatedAt">{isAmharic ? "የተሻሻለበት ቀን" : "Last Updated"}</option>
            </select>
            <button
              onClick={() => setSortDirection(prev => prev === "asc" ? "desc" : "asc")}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              title="Toggle sort direction"
            >
              {sortDirection === "asc" ? (isAmharic ? "ከዝቅተኛ ↑" : "Asc ↑") : (isAmharic ? "ከከፍተኛ ↓" : "Desc ↓")}
            </button>
          </div>
        </div>

        {/* Row 2: Date Filters Bar */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 text-xs">
          <span className="text-[11px] font-bold text-slate-500 flex items-center space-x-1 mr-1">
            <Calendar size={13} />
            <span>{isAmharic ? "የቀን ገደብ:" : "Date Filter:"}</span>
          </span>
          {[
            { id: "all", labelEn: "All Dates", labelAm: "ሁሉም ቀናት" },
            { id: "today", labelEn: "Today", labelAm: "ዛሬ" },
            { id: "yesterday", labelEn: "Yesterday", labelAm: "ትናንት" },
            { id: "last7", labelEn: "Last 7 Days", labelAm: "ያለፉት 7 ቀናት" },
            { id: "last30", labelEn: "Last 30 Days", labelAm: "ያለፉት 30 ቀናት" },
            { id: "thisMonth", labelEn: "This Month", labelAm: "የዚህ ወር" },
            { id: "custom", labelEn: "Custom Range", labelAm: "የተመረጠ ቀን" },
          ].map(d => (
            <button
              key={d.id}
              onClick={() => { setDateFilterType(d.id as any); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer text-[11px] ${
                dateFilterType === d.id
                  ? "bg-red-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {isAmharic ? d.labelAm : d.labelEn}
            </button>
          ))}

          {dateFilterType === "custom" && (
            <div className="flex items-center space-x-2 ml-2">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => { setCustomStartDate(e.target.value); setCurrentPage(1); }}
                className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
              <span className="text-slate-400">-</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => { setCustomEndDate(e.target.value); setCurrentPage(1); }}
                className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
            </div>
          )}
        </div>

        {/* Row 3: Combined Multi-Dropdown Filters Panel */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 pt-2 border-t border-slate-100">
          {/* Status */}
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
              {isAmharic ? "ሁኔታ" : "Status"}
            </label>
            <select
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-2 text-xs font-semibold focus:outline-none"
            >
              <option value="ALL">{isAmharic ? "ሁሉም ሁኔታዎች" : "All Statuses"}</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Overdue">Overdue</option>
              <option value="Rejected">Rejected</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
              {isAmharic ? "ቅድሚያ" : "Priority"}
            </label>
            <select
              value={filterPriority}
              onChange={(e) => { setFilterPriority(e.target.value); setCurrentPage(1); }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-2 text-xs font-semibold focus:outline-none"
            >
              <option value="ALL">{isAmharic ? "ሁሉም ቅድሚያ" : "All Priorities"}</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {/* Project */}
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
              {isAmharic ? "ፕሮጀክት" : "Project"}
            </label>
            <select
              value={filterProject}
              onChange={(e) => { setFilterProject(e.target.value); setCurrentPage(1); }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-2 text-xs font-semibold focus:outline-none truncate"
            >
              <option value="ALL">{isAmharic ? "ሁሉም ፕሮጀክቶች" : "All Projects"}</option>
              {projectOptions.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Site */}
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
              {isAmharic ? "ሳይት" : "Site"}
            </label>
            <select
              value={filterSite}
              onChange={(e) => { setFilterSite(e.target.value); setCurrentPage(1); }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-2 text-xs font-semibold focus:outline-none truncate"
            >
              <option value="ALL">{isAmharic ? "ሁሉም ሳይቶች" : "All Sites"}</option>
              {siteOptions.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Building / Zone */}
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
              {isAmharic ? "ዞን" : "Zone"}
            </label>
            <select
              value={filterZone}
              onChange={(e) => { setFilterZone(e.target.value); setCurrentPage(1); }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-2 text-xs font-semibold focus:outline-none"
            >
              <option value="ALL">{isAmharic ? "ሁሉም ዞኖች" : "All Zones"}</option>
              {zoneOptions.map(z => (
                <option key={z} value={z}>{z}</option>
              ))}
            </select>
          </div>

          {/* Assigned Person */}
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
              {isAmharic ? "የተመደበለት" : "Assigned Person"}
            </label>
            <select
              value={filterAssigned}
              onChange={(e) => { setFilterAssigned(e.target.value); setCurrentPage(1); }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-2 text-xs font-semibold focus:outline-none truncate"
            >
              <option value="ALL">{isAmharic ? "ሁሉም ሰራተኞች" : "All Staff"}</option>
              {assignedOptions.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter Summary & Reset Bar */}
        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
          <div className="text-slate-500">
            {isAmharic ? "የተገኙ ውጤቶች:" : "Filtered Results:"}{" "}
            <span className="font-extrabold text-slate-800">{sortedTasks.length}</span>{" "}
            {isAmharic ? "ተግባራት" : "tasks"}
          </div>
          <button
            onClick={handleClearFilters}
            className="text-red-600 hover:text-red-700 font-bold transition-colors cursor-pointer text-xs"
          >
            {isAmharic ? "ማጣሪያዎችን አጽዳ (Reset Filters)" : "Clear Filters"}
          </button>
        </div>
      </div>

      {/* TASK CARDS / TABLE VIEW */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <RefreshCw size={24} className="animate-spin mx-auto text-red-500" />
            <p className="text-xs font-bold">{isAmharic ? "ተግባራት በመጫን ላይ ናቸው..." : "Loading tasks from Firestore..."}</p>
          </div>
        ) : sortedTasks.length === 0 ? (
          <div className="p-16 text-center text-slate-400 space-y-3">
            <SlidersHorizontal size={36} className="mx-auto text-slate-300" />
            <h3 className="text-base font-bold text-slate-700">
              {isAmharic ? "ምንም አይነት ተግባር አልተገኘም" : "No Tasks Matched Your Criteria"}
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {isAmharic
                ? "የፍለጋ ቃሉን ወይም የማጣሪያ ምርጫዎችን በማስተካከል ደግመው ይሞክሩ።"
                : "Try broadening your search term or clearing one of the active filters."}
            </p>
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              {isAmharic ? "ሁሉንም አጽዳ" : "Reset All Filters"}
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-slate-200 text-[11px] font-black uppercase tracking-wider">
                  <th className="py-3 px-4">{isAmharic ? "ተግባር መለያ" : "Task ID"}</th>
                  <th className="py-3 px-4">{isAmharic ? "የተግባር ስም & ዝርዝር" : "Task Name & Description"}</th>
                  <th className="py-3 px-4">{isAmharic ? "ፕሮጀክት & ሳይት" : "Project & Site"}</th>
                  <th className="py-3 px-4">{isAmharic ? "ዞን / ፎቅ" : "Zone / Floor"}</th>
                  <th className="py-3 px-4">{isAmharic ? "የተመደበለት" : "Assigned Person"}</th>
                  <th className="py-3 px-4">{isAmharic ? "የማጠናቀቂያ ቀን" : "Due Date"}</th>
                  <th className="py-3 px-4">{isAmharic ? "ቅድሚያ" : "Priority"}</th>
                  <th className="py-3 px-4">{isAmharic ? "ሁኔታ" : "Status"}</th>
                  <th className="py-3 px-4 text-center">{isAmharic ? "ተግባራት" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {paginatedTasks.map((task) => {
                  const statusColors: Record<TaskStatus, string> = {
                    Pending: "bg-amber-50 text-amber-700 border-amber-200",
                    "In Progress": "bg-blue-50 text-blue-700 border-blue-200",
                    Completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
                    Overdue: "bg-red-50 text-red-700 border-red-200 font-extrabold animate-pulse",
                    Rejected: "bg-rose-50 text-rose-700 border-rose-200",
                    Cancelled: "bg-slate-100 text-slate-600 border-slate-200"
                  };

                  const priorityColors: Record<TaskPriority, string> = {
                    Critical: "text-red-600 font-extrabold bg-red-50 border-red-200",
                    High: "text-orange-600 font-bold bg-orange-50 border-orange-200",
                    Medium: "text-blue-600 font-semibold bg-blue-50 border-blue-200",
                    Low: "text-slate-600 font-medium bg-slate-50 border-slate-200"
                  };

                  return (
                    <tr key={task.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800 text-[11px]">
                        {task.taskId}
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-bold text-slate-900 truncate" title={task.taskName}>
                          {task.taskName}
                        </div>
                        <p className="text-[11px] text-slate-500 truncate" title={task.description}>
                          {task.description}
                        </p>
                        {task.relatedPanelSerials && task.relatedPanelSerials.length > 0 && (
                          <div className="flex items-center space-x-1 mt-1 text-[10px] text-indigo-600 font-mono">
                            <QrCode size={11} />
                            <span className="truncate">
                              {task.relatedPanelSerials.slice(0, 2).join(", ")}
                              {task.relatedPanelSerials.length > 2 && ` +${task.relatedPanelSerials.length - 2}`}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800 truncate">{task.projectName}</div>
                        <div className="text-[10px] text-slate-400 truncate">{task.siteName}</div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 bg-slate-100 rounded-md font-mono text-[11px] font-bold text-slate-700">
                          {task.building ? `${task.building} ` : ""}{task.floor ? `FL${task.floor} ` : ""}{task.zone}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-800">{task.assignedToName}</div>
                        <div className="text-[10px] text-slate-400">{task.assignedToRole || "Field Staff"}</div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px]">
                        {task.dueDate}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] border ${priorityColors[task.priority] || ""}`}>
                          {task.priority}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${statusColors[task.status] || ""}`}>
                          {task.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            onClick={() => setSelectedTask(task)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                            title="View full task details"
                          >
                            <Eye size={14} />
                          </button>

                          {/* Quick Status Toggles */}
                          {task.status !== "Completed" && (
                            <button
                              onClick={() => handleUpdateStatus(task, "Completed")}
                              className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                              title="Mark as Completed"
                            >
                              <CheckCircle2 size={14} />
                            </button>
                          )}
                          {task.status === "Pending" && (
                            <button
                              onClick={() => handleUpdateStatus(task, "In Progress")}
                              className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 rounded-lg transition-colors cursor-pointer"
                              title="Start Work (In Progress)"
                            >
                              <Clock size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footnote */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-slate-500 font-medium">
            {isAmharic ? "ገፅ" : "Page"} <span className="font-bold text-slate-800">{currentPage}</span> {isAmharic ? "ከ" : "of"}{" "}
            <span className="font-bold text-slate-800">{totalPages}</span> —{" "}
            <span className="font-bold text-slate-800">{sortedTasks.length}</span> {isAmharic ? "ተግባራት በጠቅላላ" : "total records"}
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
              const pNum = i + 1;
              return (
                <button
                  key={pNum}
                  onClick={() => setCurrentPage(pNum)}
                  className={`px-3 py-1 rounded-lg font-bold text-xs cursor-pointer ${
                    currentPage === pNum ? "bg-red-600 text-white" : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {pNum}
                </button>
              );
            })}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* DETAIL MODAL */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="px-2.5 py-1 bg-red-100 text-red-700 font-mono text-[11px] font-bold rounded-lg">
                  {selectedTask.taskId}
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-2">{selectedTask.taskName}</h3>
                <p className="text-xs text-slate-500">{selectedTask.category || "General Civil Task"}</p>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="font-bold text-slate-700 block mb-1">{isAmharic ? "ዝርዝር መግለጫ:" : "Description:"}</span>
                <p className="text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  {selectedTask.description}
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">{isAmharic ? "ፕሮጀክት:" : "Project:"}</span>
                  <span className="font-bold text-slate-800">{selectedTask.projectName}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">{isAmharic ? "ሳይት:" : "Site:"}</span>
                  <span className="font-bold text-slate-800">{selectedTask.siteName}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">{isAmharic ? "ቦታ (ህንፃ/ፎቅ/ዞን):" : "Location:"}</span>
                  <span className="font-bold text-slate-800">{selectedTask.building} FL{selectedTask.floor} {selectedTask.zone}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">{isAmharic ? "የተመደበለት ሰው:" : "Assigned To:"}</span>
                  <span className="font-bold text-slate-800">{selectedTask.assignedToName}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">{isAmharic ? "የፈጠረው ሰው:" : "Created By:"}</span>
                  <span className="font-bold text-slate-800">{selectedTask.createdByName}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">{isAmharic ? "የማጠናቀቂያ ቀን:" : "Due Date:"}</span>
                  <span className="font-bold text-slate-800 font-mono">{selectedTask.dueDate}</span>
                </div>
              </div>

              {selectedTask.relatedPanelSerials && selectedTask.relatedPanelSerials.length > 0 && (
                <div>
                  <span className="font-bold text-slate-700 block mb-1">
                    {isAmharic ? "ተዛማጅ የአሉሚኒየም ፓነል ሲሪያል ቁጥሮች:" : "Related Panel Serials:"}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedTask.relatedPanelSerials.map((sn) => (
                      <span key={sn} className="px-2 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg font-mono text-[11px] font-bold">
                        {sn}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedTask.relatedEvidence && selectedTask.relatedEvidence.length > 0 && (
                <div>
                  <span className="font-bold text-slate-700 block mb-1">{isAmharic ? "የተያያዙ ማስረጃዎች/ሰነዶች:" : "Related Evidence & Docs:"}</span>
                  <div className="space-y-1.5">
                    {selectedTask.relatedEvidence.map((ev) => (
                      <div key={ev.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2">
                          <Paperclip size={14} className="text-slate-400" />
                          <span className="font-bold text-slate-800">{ev.name}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">{ev.uploadedBy}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Status Update Quick Buttons */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-600">{isAmharic ? "ሁኔታውን ቀይር:" : "Update Lifecycle State:"}</span>
                <div className="flex flex-wrap gap-1.5">
                  {(["Pending", "In Progress", "Completed", "Overdue", "Rejected", "Cancelled"] as TaskStatus[]).map(st => (
                    <button
                      key={st}
                      onClick={() => handleUpdateStatus(selectedTask, st)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                        selectedTask.status === st ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE NEW TASK MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-900">
                {isAmharic ? "አዲስ የግንባታ ተግባር መዝግብ" : "Create New ERP Execution Task"}
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTaskSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {isAmharic ? "የተግባሩ ስም *" : "Task Name *"}
                </label>
                <input
                  type="text"
                  required
                  value={formTaskName}
                  onChange={(e) => setFormTaskName(e.target.value)}
                  placeholder="e.g. Assemble Wall Panels on Floor 4 Zone A"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500 font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {isAmharic ? "ዝርዝር መግለጫ" : "Description"}
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Describe task scope, requirements, safety hazards..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">{isAmharic ? "ፕሮጀክት" : "Project"}</label>
                  <input
                    type="text"
                    value={formProject}
                    onChange={(e) => setFormProject(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">{isAmharic ? "ሳይት" : "Site"}</label>
                  <input
                    type="text"
                    value={formSite}
                    onChange={(e) => setFormSite(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">{isAmharic ? "ህንፃ" : "Building"}</label>
                  <input
                    type="text"
                    value={formBuilding}
                    onChange={(e) => setFormBuilding(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">{isAmharic ? "ፎቅ" : "Floor"}</label>
                  <input
                    type="number"
                    value={formFloor}
                    onChange={(e) => setFormFloor(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">{isAmharic ? "ዞን" : "Zone"}</label>
                  <input
                    type="text"
                    value={formZone}
                    onChange={(e) => setFormZone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">{isAmharic ? "የተመደበለት ሰራተኛ" : "Assigned Person"}</label>
                  <select
                    value={formAssignedId}
                    onChange={(e) => setFormAssignedId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  >
                    <option value="">{currentUserName} (Self)</option>
                    {workers.map(w => (
                      <option key={w.id} value={w.id}>{w.name} ({w.trade || w.department})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">{isAmharic ? "የማጠናቀቂያ ቀን *" : "Due Date *"}</label>
                  <input
                    type="date"
                    required
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">{isAmharic ? "ቅድሚያ" : "Priority"}</label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  >
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">{isAmharic ? "ስራ አይነት" : "Category"}</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  >
                    <option value="Formwork Assembly">Formwork Assembly</option>
                    <option value="Concrete Cast">Concrete Cast</option>
                    <option value="Quality Inspection">Quality Inspection</option>
                    <option value="Safety Rectification">Safety Rectification</option>
                    <option value="Panel Movement">Panel Movement</option>
                    <option value="General Civil">General Civil</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">{isAmharic ? "ሁኔታ" : "Initial Status"}</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {isAmharic ? "የተያያዙ የፓነል ሲሪያል ቁጥሮች (በኮማ ለይተው ይፃፉ)" : "Related Panel Serials (comma separated)"}
                </label>
                <input
                  type="text"
                  value={formRelatedSerials}
                  onChange={(e) => setFormRelatedSerials(e.target.value)}
                  placeholder="e.g. SN-WP-0001, SN-WP-0002"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  {isAmharic ? "ሰርዝ" : "Cancel"}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl shadow-lg shadow-red-600/20 cursor-pointer"
                >
                  {isAmharic ? "መዝግብ" : "Create Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
