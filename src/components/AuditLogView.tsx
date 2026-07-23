import React, { useState } from "react";
import { ShieldCheck, Search, ShieldAlert, Filter, Clock, User, MapPin, Compass } from "lucide-react";
import { AuditLog, UserRole } from "../types";

interface AuditLogViewProps {
  logs: AuditLog[];
  isAmharic: boolean;
  t: (key: string) => string;
}

export const AuditLogView: React.FC<AuditLogViewProps> = ({ logs, isAmharic, t }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("All");

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = selectedRole === "All" || log.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center space-x-2">
            <span className="p-2 bg-red-600 rounded-lg text-white">
              <ShieldCheck size={20} />
            </span>
            <span className="text-xs uppercase tracking-wider font-extrabold text-red-500">
              {isAmharic ? "የደህንነት ቁጥጥር መዝገብ" : "Security & RBAC Controls"}
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">
            {isAmharic ? "የኦዲት መከታተያ መዝገብ" : "System Audit Trail Logs"}
          </h2>
          <p className="text-xs text-slate-400">
            {isAmharic
              ? "በሲስተሙ ውስጥ የሚከናወኑ ማንኛቸውም ተግባራት በተጠቃሚ ስም፣ ሰዓት እና የስራ ሚና ተመዝግበው የሚቀመጡበት አስተማማኝ መዝገብ።"
              : "Cryptographically bound, real-time logging of structural approvals, attendance check-ins, and manpower changes."}
          </p>
        </div>
        <div className="bg-slate-800 px-4 py-3 rounded-xl border border-slate-700 flex items-center space-x-2.5">
          <ShieldCheck className="text-emerald-500" size={24} />
          <div>
            <span className="text-[10px] block uppercase text-slate-400 tracking-wider font-bold">
              Integrity Check
            </span>
            <span className="text-xs font-mono text-emerald-400 font-semibold">
              SECURE-LOGS_ACTIVE
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={isAmharic ? "በተግባር ወይም በስም ፈልግ..." : "Search actions, names..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <Filter size={15} className="text-slate-400 shrink-0" />
          <span className="text-xs text-slate-500 whitespace-nowrap">{isAmharic ? "በሚና አጣራ:" : "Filter Role:"}</span>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-red-500 w-full sm:w-44"
          >
            <option value="All">{isAmharic ? "ሁሉም ሚናዎች" : "All Roles"}</option>
            {Object.values(UserRole).map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Audit log Table/Cards */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-slate-200 text-[11px] font-bold uppercase tracking-wider">
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
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 font-medium">
                    {isAmharic ? "ምንም ዓይነት የኦዲት መዝገብ አልተገኘም።" : "No audit trail logs match your query."}
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log, index) => {
                  // Role-specific badge styling
                  const roleColors: Record<UserRole, string> = {
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
                    [UserRole.HR_MANAGER]: "bg-pink-50 text-pink-700 border-pink-200",
                    [UserRole.FINANCE_MANAGER]: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200",
                    [UserRole.PROCUREMENT_MANAGER]: "bg-yellow-50 text-yellow-800 border-yellow-300",
                    [UserRole.QAQC_ENGINEER]: "bg-lime-50 text-lime-800 border-lime-300",
                    [UserRole.HSE_OFFICER]: "bg-emerald-100 text-emerald-900 border-emerald-300",
                    [UserRole.DRIVER]: "bg-stone-50 text-stone-700 border-stone-200",
                    [UserRole.CLIENT_CONSULTANT]: "bg-blue-100 text-blue-900 border-blue-300",
                    [UserRole.AUDITOR]: "bg-slate-100 text-slate-800 border-slate-300",
                    [UserRole.VISITOR]: "bg-gray-50 text-gray-600 border-gray-200"
                  };

                  return (
                    <tr key={`${log.id}-${index}`} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono text-[10px] font-bold text-slate-500">
                        {log.id}
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-mono text-[10px] whitespace-nowrap">
                        <div className="flex items-center space-x-1.5">
                          <Clock size={12} className="text-slate-400" />
                          <span>{log.timestamp}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-[10px]">
                            {log.userName.charAt(0)}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-800 block">{log.userName}</span>
                            <span className="text-[10px] text-slate-400 block font-mono">ID: {log.userId}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${roleColors[log.role] || "bg-slate-50 text-slate-600"}`}>
                          {log.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {log.action}
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={log.details}>
                        {log.details}
                      </td>
                      <td className="py-3 px-4">
                        {log.gps ? (
                          log.gps.status === "locating" ? (
                            <span className="inline-flex items-center gap-1.5 text-[10px] bg-amber-50/70 text-amber-700 font-mono py-0.5 px-2 rounded-md border border-amber-200/50">
                              <Compass size={11} className="animate-spin text-amber-500" />
                              <span>{isAmharic ? "በመፈለግ ላይ..." : "Locating..."}</span>
                            </span>
                          ) : log.gps.status === "acquired" ? (
                            <div className="space-y-0.5 max-w-[120px]">
                              <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 font-mono py-0.2 px-1.5 rounded-md border border-emerald-200 font-bold">
                                <MapPin size={10} className="text-emerald-500 animate-pulse" />
                                <span>{isAmharic ? "የተገኘ" : "Secure GPS"}</span>
                              </span>
                              <div className="text-[10px] text-slate-700 font-mono font-semibold block tracking-tight leading-none">
                                {log.gps.latitude}, {log.gps.longitude}
                              </div>
                              {log.gps.accuracy && (
                                <span className="text-[8px] text-slate-400 block font-mono leading-none">
                                  {isAmharic ? `ትክክለኛነት: ±${log.gps.accuracy}ሜ` : `Accuracy: ±${log.gps.accuracy}m`}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] bg-rose-50 text-rose-600 font-mono py-0.5 px-2 rounded-md border border-rose-200">
                              <ShieldAlert size={11} />
                              <span>{isAmharic ? "አልተሳካም" : "Failed"}</span>
                            </span>
                          )
                        ) : (
                          <span className="text-slate-300 font-mono text-[10px]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
