import React, { useState, useEffect, useMemo } from "react";
import { 
  Bell, 
  Search, 
  Filter, 
  Sparkles, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCheck, 
  Clock, 
  CheckCircle2, 
  Archive, 
  Trash2, 
  ExternalLink, 
  RefreshCw, 
  PlusCircle, 
  Layers, 
  Building2, 
  MapPin, 
  UserCheck, 
  Send, 
  SlidersHorizontal, 
  Download, 
  Check, 
  Zap, 
  Calendar, 
  Radio, 
  ShieldCheck, 
  Globe, 
  Mail, 
  MessageSquare, 
  Smartphone, 
  X, 
  ChevronDown, 
  Eye, 
  ChevronRight
} from "lucide-react";
import { 
  EnterpriseNotification, 
  NotificationCategory, 
  NotificationPriority, 
  NotificationStatus, 
  UserRole, 
  NotificationFilterState 
} from "../types";
import { NotificationService } from "../services/notificationService";

interface EnterpriseNotificationCenterProps {
  currentUserRole: UserRole | string;
  selectedProject: string;
  onNavigateToTab?: (tabName: string) => void;
  onLogAudit?: (action: string, details: string) => void;
}

const ALL_CATEGORIES: NotificationCategory[] = [
  "Attendance Notifications",
  "Warehouse Notifications",
  "Site Store Notifications",
  "Material Request Notifications",
  "Material Approval Notifications",
  "Material Transfer Notifications",
  "Material Return Notifications",
  "Aluminum Formwork Panel Tracking Notifications",
  "Procurement Notifications",
  "Purchase Order Notifications",
  "Delivery Notifications",
  "Finance Notifications",
  "Payroll Notifications",
  "Budget Notifications",
  "Project Progress Notifications",
  "Daily Report Notifications",
  "QA/QC Notifications",
  "NCR Notifications",
  "HSE Notifications",
  "Toolbox Meeting Notifications",
  "PPE Inspection Notifications",
  "Hazard Notifications",
  "Near Miss Notifications",
  "Equipment Notifications",
  "Vehicle Notifications",
  "Asset Notifications",
  "AI Alerts",
  "Maintenance Notifications",
  "Document Approval Notifications",
  "User Approval Notifications",
  "System Update Notifications"
];

export const EnterpriseNotificationCenter: React.FC<EnterpriseNotificationCenterProps> = ({
  currentUserRole,
  selectedProject,
  onNavigateToTab,
  onLogAudit
}) => {
  const [notifications, setNotifications] = useState<EnterpriseNotification[]>([]);
  const [selectedNotif, setSelectedNotif] = useState<EnterpriseNotification | null>(null);
  const [showAiGeneratorModal, setShowAiGeneratorModal] = useState(false);
  const [showChannelSettingsModal, setShowChannelSettingsModal] = useState(false);
  const [showCreateCustomModal, setShowCreateCustomModal] = useState(false);
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>("ALL");
  const [langDisplayMode, setLangDisplayMode] = useState<"both" | "en" | "am">("both");

  // Filter State
  const [filters, setFilters] = useState<NotificationFilterState>({
    searchQuery: "",
    category: "ALL",
    priority: "ALL",
    status: "ALL",
    projectName: selectedProject || "ALL",
    onlyAiAlerts: false,
    dateRange: "all"
  });

  // Channel settings state
  const [channels, setChannels] = useState({
    inApp: true,
    push: true,
    email: true,
    sms: false
  });

  // Subscribe to NotificationService
  useEffect(() => {
    const unsubscribe = NotificationService.subscribe(() => {
      const filtered = NotificationService.getNotificationsForRoleAndProject(
        currentUserRole,
        selectedProject
      );
      setNotifications(filtered);
    });
    return () => unsubscribe();
  }, [currentUserRole, selectedProject]);

  // Sync project filter if top dropdown changes
  useEffect(() => {
    setFilters(prev => ({ ...prev, projectName: selectedProject || "ALL" }));
  }, [selectedProject]);

  // Filtered Notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      // Search
      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase();
        const matchesTitle = n.title.toLowerCase().includes(q) || (n.titleAm && n.titleAm.toLowerCase().includes(q));
        const matchesDesc = n.description.toLowerCase().includes(q) || (n.descriptionAm && n.descriptionAm.toLowerCase().includes(q));
        const matchesCategory = n.category.toLowerCase().includes(q);
        const matchesSender = n.sender.toLowerCase().includes(q);
        const matchesProject = n.projectName.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesCategory && !matchesSender && !matchesProject) {
          return false;
        }
      }

      // Category tab or filter
      if (selectedCategoryTab !== "ALL" && n.category !== selectedCategoryTab) {
        return false;
      }
      if (filters.category !== "ALL" && n.category !== filters.category) {
        return false;
      }

      // Priority
      if (filters.priority !== "ALL" && n.priority !== filters.priority) {
        return false;
      }

      // Status
      if (filters.status === "Archived") {
        if (!n.isArchived) return false;
      } else {
        if (n.isArchived) return false; // hide archived in normal views
        if (filters.status !== "ALL" && n.status !== filters.status) {
          return false;
        }
      }

      // Project
      if (filters.projectName !== "ALL" && n.projectName !== "Global System" && n.projectName !== filters.projectName) {
        return false;
      }

      // AI Only
      if (filters.onlyAiAlerts && !n.isAiGenerated) {
        return false;
      }

      // Date Range
      if (filters.dateRange !== "all") {
        const notifDate = new Date(n.date).getTime();
        const now = Date.now();
        if (filters.dateRange === "today") {
          const oneDay = 86400000;
          if (now - notifDate > oneDay) return false;
        } else if (filters.dateRange === "week") {
          const oneWeek = 86400000 * 7;
          if (now - notifDate > oneWeek) return false;
        } else if (filters.dateRange === "month") {
          const oneMonth = 86400000 * 30;
          if (now - notifDate > oneMonth) return false;
        }
      }

      return true;
    });
  }, [notifications, filters, selectedCategoryTab]);

  // Statistics
  const stats = useMemo(() => {
    const total = notifications.filter(n => !n.isArchived).length;
    const unread = notifications.filter(n => n.status === "Unread" && !n.isArchived).length;
    const critical = notifications.filter(n => n.priority === "Critical" && !n.isArchived).length;
    const aiGenerated = notifications.filter(n => n.isAiGenerated && !n.isArchived).length;
    const acknowledged = notifications.filter(n => (n.status === "Acknowledged" || n.status === "Completed") && !n.isArchived).length;
    return { total, unread, critical, aiGenerated, acknowledged };
  }, [notifications]);

  // Priority Styles
  const getPriorityStyle = (priority: NotificationPriority) => {
    switch (priority) {
      case "Critical":
        return {
          badge: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30 font-bold animate-pulse",
          border: "border-l-4 border-l-red-600 dark:border-l-red-500",
          cardBg: "bg-red-50/30 dark:bg-red-950/10 hover:bg-red-50/70 dark:hover:bg-red-950/20"
        };
      case "High":
        return {
          badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 font-bold",
          border: "border-l-4 border-l-amber-500",
          cardBg: "bg-amber-50/20 dark:bg-amber-950/10 hover:bg-amber-50/50 dark:hover:bg-amber-950/20"
        };
      case "Medium":
        return {
          badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 font-semibold",
          border: "border-l-4 border-l-blue-500",
          cardBg: "bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60"
        };
      default:
        return {
          badge: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30",
          border: "border-l-4 border-l-slate-400",
          cardBg: "bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60"
        };
    }
  };

  // Actions
  const handleMarkAllRead = () => {
    NotificationService.markAllAsRead(currentUserRole, selectedProject);
    if (onLogAudit) onLogAudit("NOTIFICATIONS_MARK_ALL_READ", `Role: ${currentUserRole}, Project: ${selectedProject}`);
  };

  const handleActionClick = (notif: EnterpriseNotification, action: "read" | "unread" | "ack" | "complete" | "snooze" | "archive" | "delete") => {
    switch (action) {
      case "read":
        NotificationService.markAsRead(notif.id);
        break;
      case "unread":
        NotificationService.markAsUnread(notif.id);
        break;
      case "ack":
        NotificationService.acknowledge(notif.id);
        break;
      case "complete":
        NotificationService.markAsCompleted(notif.id);
        break;
      case "snooze":
        NotificationService.snooze(notif.id, 4);
        break;
      case "archive":
        NotificationService.archive(notif.id);
        break;
      case "delete":
        NotificationService.deleteNotification(notif.id);
        break;
    }
    if (onLogAudit) {
      onLogAudit(`NOTIFICATION_${action.toUpperCase()}`, `Notification ID: ${notif.id}, Title: ${notif.title}`);
    }
  };

  const handleTriggerAiAlert = (type: 
    | "lowStock"
    | "missingPanels"
    | "delayedDelivery"
    | "budgetOverrun"
    | "attendanceAnomaly"
    | "safetyRisk"
    | "materialShortage"
    | "equipmentMaintenance"
    | "projectDelay"
    | "unusualActivity"
  ) => {
    const created = NotificationService.triggerAiAlertGenerator(type);
    setShowAiGeneratorModal(false);
    if (onLogAudit) onLogAudit("AI_ALERT_GENERATED", `Alert Type: ${type}, Notification ID: ${created.id}`);
  };

  // Export CSV
  const handleExportCsv = () => {
    const headers = ["ID", "Title", "Category", "Priority", "Status", "Project", "Site", "Sender", "Date", "Time", "Is AI"];
    const rows = filteredNotifications.map(n => [
      n.id,
      `"${n.title.replace(/"/g, '""')}"`,
      `"${n.category}"`,
      n.priority,
      n.status,
      `"${n.projectName}"`,
      `"${n.siteName}"`,
      `"${n.sender}"`,
      n.date,
      n.time,
      n.isAiGenerated ? "YES" : "NO"
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `BuildSync_Notifications_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="enterprise-notification-center-root" className="min-h-screen bg-slate-900 text-slate-100 p-4 lg:p-8 space-y-6">
      {/* Top Banner & Header */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 rounded-2xl p-6 border border-amber-500/30 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-10">
          <Bell className="w-64 h-64 text-amber-500" />
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-3 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/40 shadow-inner">
                <Bell className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-2xl font-black tracking-tight text-white">
                    Enterprise Notification Center
                  </h1>
                  <span className="px-2.5 py-0.5 text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full flex items-center space-x-1">
                    <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                    <span>Real-Time FCM Active</span>
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  BuildSync Smart Construction ERP • RBAC Context: <span className="text-amber-400 font-semibold">{currentUserRole}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Top Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Language Selector Mode */}
            <div className="bg-slate-800 p-1 rounded-xl border border-slate-700 flex items-center space-x-1 text-xs">
              <Globe className="w-3.5 h-3.5 text-amber-400 ml-1.5 mr-0.5" />
              <button
                onClick={() => setLangDisplayMode("both")}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  langDisplayMode === "both"
                    ? "bg-amber-500 text-slate-950 shadow-sm"
                    : "text-slate-300 hover:bg-slate-700"
                }`}
                title="English & Amharic Dual View"
              >
                ሁለቱም (Both)
              </button>
              <button
                onClick={() => setLangDisplayMode("am")}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  langDisplayMode === "am"
                    ? "bg-amber-500 text-slate-950 shadow-sm"
                    : "text-slate-300 hover:bg-slate-700"
                }`}
                title="Amharic Only Mode"
              >
                አማርኛ
              </button>
              <button
                onClick={() => setLangDisplayMode("en")}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  langDisplayMode === "en"
                    ? "bg-amber-500 text-slate-950 shadow-sm"
                    : "text-slate-300 hover:bg-slate-700"
                }`}
                title="English Only Mode"
              >
                English
              </button>
            </div>

            <button
              id="btn-trigger-ai-generator"
              onClick={() => setShowAiGeneratorModal(true)}
              className="px-3.5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all flex items-center space-x-2"
            >
              <Sparkles className="w-4 h-4 text-slate-950" />
              <span>የኤአይ ማስጠንቀቂያዎች (AI Alert Sim)</span>
            </button>

            <button
              id="btn-channel-settings"
              onClick={() => setShowChannelSettingsModal(true)}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center space-x-2"
            >
              <Smartphone className="w-4 h-4 text-amber-400" />
              <span>የመቀበያ መንገዶች (Channels)</span>
            </button>

            <button
              id="btn-export-notifications"
              onClick={handleExportCsv}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center space-x-2"
            >
              <Download className="w-4 h-4 text-blue-400" />
              <span>Export CSV</span>
            </button>

            {stats.unread > 0 && (
              <button
                id="btn-mark-all-read-main"
                onClick={handleMarkAllRead}
                className="px-3.5 py-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold transition-all flex items-center space-x-2"
              >
                <CheckCheck className="w-4 h-4 text-emerald-400" />
                <span>ሁሉንም አንብብ (Mark Read)</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 flex items-center justify-between shadow-md">
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Active</p>
            <p className="text-2xl font-black text-white mt-1">{stats.total}</p>
          </div>
          <div className="p-3 bg-slate-700/50 rounded-xl text-slate-300">
            <Bell className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-amber-950/30 border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between shadow-md">
          <div>
            <p className="text-xs text-amber-300 font-semibold uppercase tracking-wider">Unread Alerts</p>
            <p className="text-2xl font-black text-amber-400 mt-1">{stats.unread}</p>
          </div>
          <div className="p-3 bg-amber-500/20 rounded-xl text-amber-400">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
        </div>

        <div className="bg-red-950/30 border border-red-500/30 rounded-2xl p-4 flex items-center justify-between shadow-md">
          <div>
            <p className="text-xs text-red-300 font-semibold uppercase tracking-wider">Critical Priority</p>
            <p className="text-2xl font-black text-red-400 mt-1">{stats.critical}</p>
          </div>
          <div className="p-3 bg-red-500/20 rounded-xl text-red-400">
            <ShieldAlert className="w-5 h-5 animate-bounce" />
          </div>
        </div>

        <div className="bg-indigo-950/30 border border-indigo-500/30 rounded-2xl p-4 flex items-center justify-between shadow-md">
          <div>
            <p className="text-xs text-indigo-300 font-semibold uppercase tracking-wider">AI Generated</p>
            <p className="text-2xl font-black text-indigo-400 mt-1">{stats.aiGenerated}</p>
          </div>
          <div className="p-3 bg-indigo-500/20 rounded-xl text-indigo-400">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-2xl p-4 flex items-center justify-between shadow-md col-span-2 sm:col-span-1">
          <div>
            <p className="text-xs text-emerald-300 font-semibold uppercase tracking-wider">Acknowledged</p>
            <p className="text-2xl font-black text-emerald-400 mt-1">{stats.acknowledged}</p>
          </div>
          <div className="p-3 bg-emerald-500/20 rounded-xl text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Horizontal Category Chips Bar (Scrollable) */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-3 shadow-md">
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
            <Layers className="w-4 h-4 text-amber-400" />
            <span>Filter by Category ({ALL_CATEGORIES.length} Categories)</span>
          </span>

          {selectedCategoryTab !== "ALL" && (
            <button
              onClick={() => setSelectedCategoryTab("ALL")}
              className="text-xs text-amber-400 hover:underline font-semibold"
            >
              Reset Category Filter
            </button>
          )}
        </div>

        <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-700">
          <button
            onClick={() => setSelectedCategoryTab("ALL")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              selectedCategoryTab === "ALL"
                ? "bg-amber-500 text-slate-950 shadow-md"
                : "bg-slate-700/60 text-slate-300 hover:bg-slate-700"
            }`}
          >
            All Categories ({notifications.filter(n => !n.isArchived).length})
          </button>

          {ALL_CATEGORIES.map((cat) => {
            const count = notifications.filter(n => n.category === cat && !n.isArchived).length;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategoryTab(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all flex items-center space-x-1.5 ${
                  selectedCategoryTab === cat
                    ? "bg-amber-500 text-slate-950 font-bold shadow-md"
                    : count > 0
                    ? "bg-slate-700/80 text-amber-200 hover:bg-slate-700 border border-amber-500/20"
                    : "bg-slate-900/40 text-slate-400 hover:bg-slate-800 border border-slate-800"
                }`}
              >
                <span>{cat.replace(" Notifications", "")}</span>
                {count > 0 && (
                  <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-bold ${
                    selectedCategoryTab === cat ? "bg-slate-950 text-amber-400" : "bg-amber-500/20 text-amber-300"
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Filter & Search Control Bar */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 space-y-4 shadow-lg">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search */}
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search notifications by title, sender, project, location..."
              value={filters.searchQuery}
              onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
              className="w-full bg-slate-900/90 text-slate-100 placeholder-slate-400 text-xs pl-10 pr-4 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
            {filters.searchQuery && (
              <button
                onClick={() => setFilters(prev => ({ ...prev, searchQuery: "" }))}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Priority Filter */}
          <div className="md:col-span-2">
            <select
              value={filters.priority}
              onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value as any }))}
              className="w-full bg-slate-900/90 text-slate-100 text-xs px-3 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            >
              <option value="ALL">All Priorities</option>
              <option value="Critical">🔴 Critical Only</option>
              <option value="High">🟠 High Only</option>
              <option value="Medium">🔵 Medium Only</option>
              <option value="Low">⚪ Low Only</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="md:col-span-2">
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as any }))}
              className="w-full bg-slate-900/90 text-slate-100 text-xs px-3 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            >
              <option value="ALL">All Statuses</option>
              <option value="Unread">Unread</option>
              <option value="Read">Read</option>
              <option value="Acknowledged">Acknowledged</option>
              <option value="Completed">Completed</option>
              <option value="Archived">📂 Archived</option>
            </select>
          </div>

          {/* Date Range Filter */}
          <div className="md:col-span-3 flex items-center space-x-2">
            <select
              value={filters.dateRange}
              onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value as any }))}
              className="w-full bg-slate-900/90 text-slate-100 text-xs px-3 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            >
              <option value="all">All Dates</option>
              <option value="today">Today Only</option>
              <option value="week">Past 7 Days</option>
              <option value="month">Past 30 Days</option>
            </select>

            {/* AI Only Toggle Button */}
            <button
              onClick={() => setFilters(prev => ({ ...prev, onlyAiAlerts: !prev.onlyAiAlerts }))}
              className={`px-3 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 whitespace-nowrap transition-all border ${
                filters.onlyAiAlerts
                  ? "bg-indigo-600 text-white border-indigo-400 shadow-md"
                  : "bg-slate-900/80 text-slate-300 border-slate-700 hover:bg-slate-800"
              }`}
            >
              <Sparkles className={`w-3.5 h-3.5 ${filters.onlyAiAlerts ? "text-amber-300" : "text-indigo-400"}`} />
              <span>AI Only</span>
            </button>
          </div>
        </div>
      </div>

      {/* Notifications List View */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1 text-xs text-slate-400">
          <span>
            Showing <strong className="text-slate-200">{filteredNotifications.length}</strong> notifications
          </span>

          <div className="flex items-center space-x-2">
            <span className="text-[11px] text-slate-400">Sort: Newest First</span>
          </div>
        </div>

        {filteredNotifications.length === 0 ? (
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-12 text-center text-slate-400 space-y-3">
            <CheckCheck className="w-12 h-12 text-emerald-400/50 mx-auto" />
            <h3 className="text-lg font-bold text-slate-200">No Notifications Match Filters</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Try adjusting search terms, resetting category filters, or switching project contexts.
            </p>
            <button
              onClick={() => {
                setFilters({
                  searchQuery: "",
                  category: "ALL",
                  priority: "ALL",
                  status: "ALL",
                  projectName: "ALL",
                  onlyAiAlerts: false,
                  dateRange: "all"
                });
                setSelectedCategoryTab("ALL");
              }}
              className="px-4 py-2 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl hover:bg-amber-600 transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          filteredNotifications.map((notif) => {
            const style = getPriorityStyle(notif.priority);

            return (
              <div
                key={notif.id}
                className={`border rounded-2xl p-4 transition-all duration-200 shadow-md ${style.border} ${style.cardBg} ${
                  notif.status === "Unread"
                    ? "border-amber-500/40 ring-1 ring-amber-500/20"
                    : "border-slate-800"
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left Metadata & Body */}
                  <div className="space-y-2 flex-1 min-w-0">
                    {/* Header Chips */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className={`px-2.5 py-0.5 rounded-full border text-[10px] uppercase font-bold tracking-wider ${style.badge}`}>
                        {notif.priority}
                      </span>

                      <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-semibold">
                        {notif.category}
                      </span>

                      {notif.isAiGenerated && (
                        <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[10px] font-bold flex items-center space-x-1">
                          <Sparkles className="w-3 h-3 text-amber-300" />
                          <span>AI Engine ({Math.round((notif.aiConfidence || 0.95) * 100)}%)</span>
                        </span>
                      )}

                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                        notif.status === "Unread"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                          : notif.status === "Acknowledged"
                          ? "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                          : notif.status === "Completed"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                          : "bg-slate-700/60 text-slate-400"
                      }`}>
                        {notif.status}
                      </span>

                      <span className="text-[11px] text-slate-400 ml-auto flex items-center space-x-1">
                        <Clock className="w-3 h-3 inline mr-0.5" />
                        <span>{notif.date} at {notif.time}</span>
                      </span>
                    </div>

                    {/* Titles (EN & Amharic) */}
                    <div>
                      {(langDisplayMode === "both" || langDisplayMode === "en") && (
                        <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                          <span>{notif.title}</span>
                        </h3>
                      )}
                      {(langDisplayMode === "both" || langDisplayMode === "am") && notif.titleAm && (
                        <p className={`font-semibold text-amber-200/90 ${langDisplayMode === "am" ? "text-sm sm:text-base text-white font-bold" : "text-xs mt-0.5"}`}>
                          {notif.titleAm}
                        </p>
                      )}
                    </div>

                    {/* Descriptions */}
                    {(langDisplayMode === "both" || langDisplayMode === "en") && (
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {notif.description}
                      </p>
                    )}
                    {(langDisplayMode === "both" || langDisplayMode === "am") && notif.descriptionAm && (
                      <p className={`text-xs text-slate-300 leading-relaxed ${langDisplayMode === "both" ? "text-slate-400 italic" : ""}`}>
                        {notif.descriptionAm}
                      </p>
                    )}

                    {/* Location & Sender Tags */}
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-1">
                      <span className="flex items-center space-x-1 text-slate-300">
                        <Building2 className="w-3.5 h-3.5 text-amber-400" />
                        <strong className="text-white">{notif.projectName}</strong>
                      </span>

                      {notif.siteName && (
                        <span className="flex items-center space-x-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>{notif.siteName}</span>
                        </span>
                      )}

                      {(notif.building || notif.floor || notif.zone) && (
                        <span className="flex items-center space-x-1 bg-slate-800/80 px-2 py-0.5 rounded-lg border border-slate-700 text-slate-300">
                          <Layers className="w-3 h-3 text-indigo-400" />
                          <span>
                            {[notif.building, notif.floor, notif.zone].filter(Boolean).join(" • ")}
                          </span>
                        </span>
                      )}

                      <span className="flex items-center space-x-1 text-slate-400">
                        <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Sender: <strong>{notif.sender}</strong> ({notif.senderRole || "System"})</span>
                      </span>
                    </div>
                  </div>

                  {/* Right Action Buttons Toolbar */}
                  <div className="flex flex-wrap lg:flex-col items-center justify-end gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800">
                    <div className="flex items-center space-x-1.5">
                      {notif.status === "Unread" ? (
                        <button
                          onClick={() => handleActionClick(notif, "read")}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow transition-all flex items-center space-x-1"
                          title="Mark as Read"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Read</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleActionClick(notif, "unread")}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl border border-slate-700 transition-all"
                          title="Mark as Unread"
                        >
                          Unread
                        </button>
                      )}

                      {notif.status !== "Acknowledged" && notif.status !== "Completed" && (
                        <button
                          onClick={() => handleActionClick(notif, "ack")}
                          className="px-3 py-1.5 bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/40 text-xs font-bold rounded-xl transition-all flex items-center space-x-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Acknowledge</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleActionClick(notif, "snooze")}
                        className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs transition-all"
                        title="Snooze 4 Hours"
                      >
                        <Clock className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => setSelectedNotif(notif)}
                        className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs transition-all"
                        title="View Full Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleActionClick(notif, "archive")}
                        className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-amber-400 border border-slate-700 rounded-xl text-xs transition-all"
                        title="Archive"
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleActionClick(notif, "delete")}
                        className="p-2 bg-slate-800 hover:bg-red-900/40 text-slate-400 hover:text-red-400 border border-slate-700 rounded-xl text-xs transition-all"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {notif.actionTab && onNavigateToTab && (
                      <button
                        onClick={() => onNavigateToTab(notif.actionTab!)}
                        className="w-full px-3 py-1.5 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-amber-400 font-bold border border-amber-500/40 rounded-xl text-xs transition-all flex items-center justify-center space-x-1.5"
                      >
                        <span>Open Module</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* AI Generator Simulator Modal */}
      {showAiGeneratorModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2 text-amber-400">
                <Sparkles className="w-5 h-5" />
                <h3 className="font-black text-lg text-white">BuildSync AI Alert Generator</h3>
              </div>
              <button
                onClick={() => setShowAiGeneratorModal(false)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Select an automated AI alert type below to trigger live real-time simulation across all authorized user views and FCM push listeners:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[360px] overflow-y-auto pr-1">
              {[
                { type: "lowStock", label: "📦 Low Warehouse Stock", desc: "Chemical & rebar depletion alert" },
                { type: "missingPanels", label: "🏗️ Missing Panels", desc: "Aluminum formwork missing deck panels" },
                { type: "delayedDelivery", label: "🚚 Delayed Delivery", desc: "Transit truck GPS delay alert" },
                { type: "budgetOverrun", label: "💰 Budget Overrun", desc: "EVM variance cost overrun spike" },
                { type: "attendanceAnomaly", label: "👥 Attendance Anomaly", desc: "Duplicate face/GPS scan fraud check" },
                { type: "safetyRisk", label: "⚠️ Safety Risk", desc: "Unsecured perimeter cable vision detection" },
                { type: "materialShortage", label: "📋 Material Shortage", desc: "Tie rod supply forecast shortage" },
                { type: "equipmentMaintenance", label: "⚙️ Maintenance Due", desc: "Tower crane cable strain telemetry" },
                { type: "projectDelay", label: "⏱️ Project Delay", desc: "Concrete cure climate SLA extension" },
                { type: "unusualActivity", label: "🔒 Security Patrol", desc: "Late night unauthorized movement" }
              ].map(item => (
                <button
                  key={item.type}
                  onClick={() => handleTriggerAiAlert(item.type as any)}
                  className="p-3 bg-slate-800/90 hover:bg-amber-500/20 hover:border-amber-500/50 border border-slate-700/80 rounded-xl text-left transition-all group"
                >
                  <p className="text-xs font-bold text-white group-hover:text-amber-300">
                    {item.label}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {item.desc}
                  </p>
                </button>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowAiGeneratorModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delivery Channels Settings Modal */}
      {showChannelSettingsModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2 text-amber-400">
                <Smartphone className="w-5 h-5" />
                <h3 className="font-black text-base text-white">Delivery Channel Configuration</h3>
              </div>
              <button
                onClick={() => setShowChannelSettingsModal(false)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Configure delivery methods for role-based notifications for <strong className="text-amber-400">{currentUserRole}</strong>:
            </p>

            <div className="space-y-3">
              {[
                { key: "inApp", label: "In-App Notification Center", icon: Bell, desc: "Real-time popover & top bar bell badge" },
                { key: "push", label: "Firebase Push Notifications (FCM)", icon: Radio, desc: "Mobile & browser instant alerts" },
                { key: "email", label: "Email Notifications", icon: Mail, desc: "Digest and critical instant emails" },
                { key: "sms", label: "SMS Urgent Alerts", icon: MessageSquare, desc: "SMS for critical safety & budget overruns" }
              ].map(ch => (
                <div key={ch.key} className="flex items-center justify-between p-3 bg-slate-800/80 rounded-xl border border-slate-700/80">
                  <div className="flex items-center space-x-3">
                    <ch.icon className="w-4 h-4 text-amber-400" />
                    <div>
                      <p className="text-xs font-bold text-white">{ch.label}</p>
                      <p className="text-[10px] text-slate-400">{ch.desc}</p>
                    </div>
                  </div>

                  <input
                    type="checkbox"
                    checked={(channels as any)[ch.key]}
                    onChange={(e) => setChannels(prev => ({ ...prev, [ch.key]: e.target.checked }))}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-slate-900 border-slate-700"
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowChannelSettingsModal(false)}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow"
              >
                Save Channel Preferences
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Full Detail Modal */}
      {selectedNotif && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <span className={`px-2.5 py-0.5 rounded-full border text-[10px] uppercase font-bold ${getPriorityStyle(selectedNotif.priority).badge}`}>
                  {selectedNotif.priority} Priority
                </span>
                <span className="text-xs font-bold text-amber-400">{selectedNotif.category}</span>
              </div>

              <button
                onClick={() => setSelectedNotif(null)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <h2 className="text-lg font-bold text-white">{selectedNotif.title}</h2>
              {selectedNotif.titleAm && (
                <p className="text-xs text-amber-200 font-medium mt-1">{selectedNotif.titleAm}</p>
              )}
            </div>

            <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 text-xs text-slate-200 space-y-2">
              <p>{selectedNotif.description}</p>
              {selectedNotif.descriptionAm && (
                <p className="text-slate-400 italic pt-1 border-t border-slate-700/60">{selectedNotif.descriptionAm}</p>
              )}
            </div>

            {/* Smart Fields Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-slate-950/60 p-4 rounded-xl border border-slate-800">
              <div>
                <p className="text-slate-400 text-[10px]">Project Name</p>
                <p className="font-bold text-white mt-0.5">{selectedNotif.projectName}</p>
              </div>
              <div>
                <p className="text-slate-400 text-[10px]">Site Name</p>
                <p className="font-bold text-white mt-0.5">{selectedNotif.siteName || "N/A"}</p>
              </div>
              <div>
                <p className="text-slate-400 text-[10px]">Building / Floor / Zone</p>
                <p className="font-bold text-white mt-0.5">
                  {[selectedNotif.building, selectedNotif.floor, selectedNotif.zone].filter(Boolean).join(" • ") || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-slate-400 text-[10px]">Sender</p>
                <p className="font-bold text-white mt-0.5">{selectedNotif.sender} ({selectedNotif.senderRole || "System"})</p>
              </div>
              <div>
                <p className="text-slate-400 text-[10px]">Receiver / Role Targets</p>
                <p className="font-bold text-white mt-0.5">{selectedNotif.receiver}</p>
              </div>
              <div>
                <p className="text-slate-400 text-[10px]">Timestamp</p>
                <p className="font-bold text-white mt-0.5">{selectedNotif.date} {selectedNotif.time}</p>
              </div>
            </div>

            {/* Target RBAC Roles List */}
            <div className="text-xs space-y-1">
              <p className="text-slate-400 font-medium">Authorized RBAC Target Roles:</p>
              <div className="flex flex-wrap gap-1">
                {selectedNotif.targetRoles.map((role, idx) => (
                  <span key={idx} className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded-md border border-slate-700 text-[10px]">
                    {String(role)}
                  </span>
                ))}
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-800">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    handleActionClick(selectedNotif, "ack");
                    setSelectedNotif(null);
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl"
                >
                  Acknowledge
                </button>
                <button
                  onClick={() => {
                    handleActionClick(selectedNotif, "snooze");
                    setSelectedNotif(null);
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl"
                >
                  Snooze 4h
                </button>
              </div>

              {selectedNotif.actionTab && onNavigateToTab && (
                <button
                  onClick={() => {
                    onNavigateToTab(selectedNotif.actionTab!);
                    setSelectedNotif(null);
                  }}
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl flex items-center space-x-1"
                >
                  <span>Open ERP Module</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
