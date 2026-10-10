import React, { useState, useMemo } from "react";
import {
  ShieldCheck,
  Search,
  Filter,
  Clock,
  User,
  MapPin,
  Compass,
  Download,
  Calendar,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  CheckCircle2,
  X
} from "lucide-react";
import { AuditLog, UserRole } from "../types";

interface AuditLogViewProps {
  logs: AuditLog[];
  isAmharic: boolean;
  t: (key: string) => string;
}

export const AuditLogView: React.FC<AuditLogViewProps> = ({ logs, isAmharic, t }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("All");
  const [dateFilterType, setDateFilterType] = useState<"all" | "today" | "yesterday" | "last7" | "last30" | "custom">("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [sortDirection, setSortDirection] = useState<"desc" | "asc">("desc");

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 12;

  // Date filter predicate
  const matchesDateRange = (timestampStr: string): boolean => {
    if (!timestampStr || dateFilterType === "all") return true;
    const logDate = new Date(timestampStr.replace(" ", "T"));
    if (isNaN(logDate.getTime())) return true;
    const now = new Date();

    if (dateFilterType === "today") {
      return logDate.toDateString() === now.toDateString();
    }
    if (dateFilterType === "yesterday") {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      return logDate.toDateString() === yesterday.toDateString();
    }
    if (dateFilterType === "last7") {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return logDate >= sevenDaysAgo && logDate <= now;
    }
    if (dateFilterType === "last30") {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return logDate >= thirtyDaysAgo && logDate <= now;
    }
    if (dateFilterType === "custom") {
      if (customStartDate && logDate < new Date(customStartDate)) return false;
      if (customEndDate && logDate > new Date(customEndDate + "T23:59:59")) return false;
      return true;
    }
    return true;
  };

  const filteredLogs = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return logs.filter((log) => {
      if (term) {
        const matchesSearch =
          (log.userName || "").toLowerCase().includes(term) ||
          (log.userId || "").toLowerCase().includes(term) ||
          (log.action || "").toLowerCase().includes(term) ||
          (log.details || "").toLowerCase().includes(term) ||
          (log.id || "").toLowerCase().includes(term);
        if (!matchesSearch) return false;
      }

      if (selectedRole !== "All" && log.role !== selectedRole && log.userRole !== selectedRole) {
        return false;
      }

      if (!matchesDateRange(log.timestamp)) {
        return false;
      }

      return true;
    });
  }, [logs, searchTerm, selectedRole, dateFilterType, customStartDate, customEndDate]);

  // Deterministic sorting with secondary sort
  const sortedLogs = useMemo(() => {
    return [...filteredLogs].sort((a, b) => {
      const timeA = new Date(a.timestamp || 0).getTime();
      const timeB = new Date(b.timestamp || 0).getTime();
      if (timeA !== timeB) {
        return sortDirection === "desc" ? timeB - timeA : timeA - timeB;
      }
      return (b.id || "").localeCompare(a.id || "");
    });
  }, [filteredLogs, sortDirection]);

  // Pagination slice
  const totalPages = Math.max(1, Math.ceil(sortedLogs.length / pageSize));
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedLogs.slice(start, start + pageSize);
  }, [sortedLogs, currentPage, pageSize]);

  // CSV Export
  const handleExportCSV = () => {
    if (sortedLogs.length === 0) return;
    const headers = ["Log ID", "Timestamp", "User ID", "User Name", "Role", "Action", "Details", "GPS Status"];
    const rows = sortedLogs.map(l => [
      `"${l.id}"`,
      `"${l.timestamp}"`,
      `"${l.userId || ""}"`,
      `"${(l.userName || "").replace(/"/g, '""')}"`,
      `"${l.role || l.userRole || ""}"`,
      `"${(l.action || "").replace(/"/g, '""')}"`,
      `"${(l.details || "").replace(/"/g, '""')}"`,
      `"${l.gps?.status || "N/A"}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `DC_ERP_AuditLogs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const roleColors: Record<string, string> = {
    [UserRole.SUPER_ADMIN]: "bg-violet-50 text-violet-700 border-violet-200",
    [UserRole.HEAD_OFFICE]: "bg-red-50 text-red-700 border-red-200",
    [UserRole.PROJECT_MANAGER]: "bg-rose-50 text-rose-700 border-rose-200",
    [UserRole.SECTION_HEAD]: "bg-indigo-50 text-indigo-700 border-indigo-200",
    [UserRole.SUPERVISOR]: "bg-teal-50 text-teal-700 border-teal-200",
    [UserRole.SITE_ENGINEER]: "bg-cyan-50 text-cyan-700 border-cyan-200",
    [UserRole.SURVEYOR]: "bg-sky-50 text-sky-700 border-sky-200",
    [UserRole.TEAM_LEADER]: "bg-blue-50 text-blue-700 border-blue-200",
    [UserRole.GANG_CHIEF]: "bg-purple-50 text-purple-700 border-purple-200",
    [UserRole.TIME_KEEPER]: "bg-amber-50 text-amber-700 border-amber-200",
    [UserRole.ASSEMBLER]: "bg-emerald-50 text-emerald-700 border-emerald-200",
    [UserRole.WAREHOUSE_MANAGER]: "bg-amber-50 text-amber-800 border-amber-300",
    [UserRole.STORE_OWNER]: "bg-orange-50 text-orange-700 border-orange-200",
    [UserRole.STORE_MANAGER]: "bg-orange-50 text-orange-700 border-orange-200",
    [UserRole.WORKER]: "bg-emerald-50 text-emerald-700 border-emerald-200",
    [UserRole.HR_MANAGER]: "bg-pink-50 text-pink-700 border-pink-200",
    [UserRole.FINANCE_MANAGER]: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200",
    [UserRole.HSE_OFFICER]: "bg-emerald-100 text-emerald-900 border-emerald-300",
    [UserRole.DRIVER]: "bg-stone-50 text-stone-700 border-stone-200",
    [UserRole.AUDITOR]: "bg-slate-100 text-slate-800 border-slate-300"
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1.5">
          <div className="flex items-center space-x-2">
            <span className="p-2 bg-red-600 rounded-xl text-white shadow-lg shadow-red-600/30">
              <ShieldCheck size={20} />
            </span>
            <span className="text-xs uppercase tracking-wider font-extrabold text-red-500">
              {isAmharic ? "የደህንነት ቁጥጥር መዝገብ" : "Security & Immutable Audit Trail"}
            </span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white">
            {isAmharic ? "የኦዲት መከታተያ መዝገብ" : "System Audit Trail & Action Logs"}
          </h2>
          <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
            {isAmharic
              ? "በሲስተሙ ውስጥ የሚከናወኑ ማንኛቸውም ተግባራት በተጠቃሚ ስም፣ ሰዓት እና የስራ ሚና ተመዝግበው የሚቀመጡበት አስተማማኝ የማይሰረዝ መዝገብ።"
              : "Cryptographically bound, real-time logging of user logins, structural approvals, attendance check-ins, and inventory mutations."}
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer"
          >
            <Download size={14} className="text-slate-400" />
            <span>{isAmharic ? "መረጃ ላክ (CSV)" : "Export CSV"}</span>
          </button>

          <div className="bg-slate-800 px-4 py-2.5 rounded-xl border border-slate-700 flex items-center space-x-2">
            <ShieldCheck className="text-emerald-500" size={20} />
            <div>
              <span className="text-[10px] block uppercase text-slate-400 tracking-wider font-bold">
                Integrity Check
              </span>
              <span className="text-xs font-mono text-emerald-400 font-semibold">
                IMMUTABLE_LOGS_ACTIVE
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search controls */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3.5">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={isAmharic ? "በተግባር፣ በስም፣ ወይም በመለያ ፈልግ..." : "Search action, user, log ID, or details..."}
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-2xl text-xs font-semibold bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <Filter size={15} className="text-slate-400 shrink-0" />
            <span className="text-xs text-slate-500 whitespace-nowrap">{isAmharic ? "በሚና አጣራ:" : "Filter Role:"}</span>
            <select
              value={selectedRole}
              onChange={(e) => { setSelectedRole(e.target.value); setCurrentPage(1); }}
              className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="All">{isAmharic ? "ሁሉም ሚናዎች" : "All Roles"}</option>
              {Array.from(new Set(Object.values(UserRole))).map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>

            <button
              onClick={() => setSortDirection(p => p === "desc" ? "asc" : "desc")}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1"
            >
              <ArrowUpDown size={13} />
              <span>{sortDirection === "desc" ? "Newest" : "Oldest"}</span>
            </button>
          </div>
        </div>

        {/* Date Filter Badges */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <span className="text-[11px] font-bold text-slate-500 mr-1 flex items-center space-x-1">
            <Calendar size={13} />
            <span>{isAmharic ? "ቀን:" : "Date:"}</span>
          </span>
          {[
            { id: "all", label: "All Time" },
            { id: "today", label: "Today" },
            { id: "yesterday", label: "Yesterday" },
            { id: "last7", label: "Last 7 Days" },
            { id: "last30", label: "Last 30 Days" },
            { id: "custom", label: "Custom Range" }
          ].map(d => (
            <button
              key={d.id}
              onClick={() => { setDateFilterType(d.id as any); setCurrentPage(1); }}
              className={`px-3 py-1 rounded-xl text-[11px] font-bold cursor-pointer transition-all ${
                dateFilterType === d.id ? "bg-red-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {d.label}
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
      </div>

      {/* Audit log Table */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-slate-200 text-[11px] font-black uppercase tracking-wider">
                <th className="py-3 px-4">{isAmharic ? "የምዝግብ መለያ" : "Log ID"}</th>
                <th className="py-3 px-4">{isAmharic ? "ቀንና ሰዓት" : "Timestamp"}</th>
                <th className="py-3 px-4">{isAmharic ? "ተጠቃሚ" : "User Profile"}</th>
                <th className="py-3 px-4">{isAmharic ? "ሚና" : "Assigned Role"}</th>
                <th className="py-3 px-4">{isAmharic ? "ተግባር" : "Action"}</th>
                <th className="py-3 px-4">{isAmharic ? "ዝርዝር መግለጫ" : "Details"}</th>
                <th className="py-3 px-4">{isAmharic ? "የጂፒኤስ መገኛ" : "GPS Location"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                    {isAmharic ? "ምንም ዓይነት የኦዲት መዝገብ አልተገኘም።" : "No audit trail logs match your query."}
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log, index) => {
                  const roleStr = String(log.role || log.userRole || "");
                  return (
                    <tr key={`${log.id}-${index}`} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono text-[11px] font-bold text-slate-500 whitespace-nowrap">
                        {log.id}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                        {log.timestamp}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                          <User size={13} className="text-slate-400" />
                          <span>{log.userName}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono ml-4.5">{log.userId}</span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${roleColors[roleStr] || "bg-slate-100 text-slate-700 border-slate-200"}`}>
                          {roleStr || "System"}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800 max-w-xs truncate" title={log.action}>
                        {log.action}
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-md" title={log.details}>
                        <p className="line-clamp-2 leading-relaxed">{log.details}</p>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                        {log.gps && log.gps.status === "acquired" ? (
                          <div className="flex items-center space-x-1 text-emerald-600 font-bold">
                            <MapPin size={13} />
                            <span>{log.gps.latitude.toFixed(4)}, {log.gps.longitude.toFixed(4)}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">{log.gps?.status || "N/A"}</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-slate-500 font-medium">
            Page <strong className="text-slate-800">{currentPage}</strong> of <strong className="text-slate-800">{totalPages}</strong> —{" "}
            <strong className="text-slate-800">{sortedLogs.length}</strong> total records
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-3 py-1 bg-red-600 text-white rounded-lg font-bold">
              {currentPage}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
