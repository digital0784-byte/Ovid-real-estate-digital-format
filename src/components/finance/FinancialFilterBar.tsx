import React from "react";
import { Calendar, Filter, Lock, RotateCcw, Search } from "lucide-react";
import { FinancialFilterState, FinancialPeriodPreset } from "../../types";

interface FinancialFilterBarProps {
  isAmharic: boolean;
  filters: FinancialFilterState;
  onChange: (next: FinancialFilterState) => void;
  onReset: () => void;
  options: {
    projects: string[];
    departments: string[];
    customers: string[];
    suppliers: string[];
    categories: string[];
    statuses: string[];
  };
  isProjectScopedOnly?: boolean;
  assignedProjects?: string[];
  resolvedPeriodLabel?: string;
  resolvedRangeDates?: { startDate: string; endDate: string };
}

export const FinancialFilterBar: React.FC<FinancialFilterBarProps> = ({
  isAmharic,
  filters,
  onChange,
  onReset,
  options,
  isProjectScopedOnly = false,
  assignedProjects = [],
  resolvedPeriodLabel,
  resolvedRangeDates,
}) => {
  const periods: { id: FinancialPeriodPreset; labelEn: string; labelAm: string }[] = [
    { id: "daily", labelEn: "Daily", labelAm: "ዕለታዊ" },
    { id: "weekly", labelEn: "Weekly", labelAm: "ሳምንታዊ" },
    { id: "monthly", labelEn: "Monthly", labelAm: "ወርሃዊ" },
    { id: "bimonthly", labelEn: "Every Two Months", labelAm: "በየሁለት ወሩ" },
    { id: "quarterly", labelEn: "Quarterly", labelAm: "በየሩብ ዓመቱ" },
    { id: "semiannual", labelEn: "Semi-Annual", labelAm: "በየስድስት ወሩ" },
    { id: "annual", labelEn: "Annual", labelAm: "ዓመታዊ" },
    { id: "custom", labelEn: "Custom Range", labelAm: "ብጁ ቀን" },
  ];

  const update = (patch: Partial<FinancialFilterState>) => {
    onChange({ ...filters, ...patch });
  };

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3" id="financial-filter-bar">
      {/* Top Row: Period Presets + Range Display + Reset */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-bold uppercase tracking-wider shrink-0 mr-1">
            <Calendar size={14} className="text-red-500" />
            <span>{isAmharic ? "ጊዜ:" : "Period:"}</span>
          </div>
          {periods.map((p) => {
            const active = filters.periodPreset === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => update({ periodPreset: p.id })}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition cursor-pointer border ${
                  active
                    ? "bg-red-600 text-white border-red-500"
                    : "bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white"
                }`}
              >
                {isAmharic ? p.labelAm : p.labelEn}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {resolvedRangeDates && (
            <span className="text-[11px] font-mono text-slate-400 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg tabular-nums whitespace-nowrap">
              {resolvedPeriodLabel ? `${resolvedPeriodLabel}: ` : ""}
              {resolvedRangeDates.startDate} → {resolvedRangeDates.endDate}
            </span>
          )}
          <button
            type="button"
            onClick={onReset}
            className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <RotateCcw size={12} />
            <span>{isAmharic ? "አጽዳ" : "Reset"}</span>
          </button>
        </div>
      </div>

      {/* Custom Date Range Row */}
      {filters.periodPreset === "custom" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              {isAmharic ? "መነሻ ቀን" : "Start Date"}
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => update({ startDate: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-red-500"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              {isAmharic ? "መጨረሻ ቀን" : "End Date"}
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => update({ endDate: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-red-500"
            />
          </div>
        </div>
      )}

      {/* Dimension Filters Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-2.5 items-end">
        {/* Project */}
        <div>
          <label className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            {isProjectScopedOnly && <Lock size={10} className="text-amber-400" />}
            <span>{isAmharic ? "ፕሮጀክት" : "Project"}</span>
          </label>
          <select
            value={filters.project}
            disabled={isProjectScopedOnly && assignedProjects.length <= 1}
            onChange={(e) => update({ project: e.target.value })}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-red-500 disabled:opacity-60"
          >
            {!isProjectScopedOnly && (
              <option value="ALL">{isAmharic ? "ሁሉም ፕሮጀክቶች" : "All Projects"}</option>
            )}
            {isProjectScopedOnly && assignedProjects.length > 1 && (
              <option value="ALL">{isAmharic ? "የተመደቡ ፕሮጀክቶች" : "All Assigned Projects"}</option>
            )}
            {isProjectScopedOnly && assignedProjects.length === 0 && (
              <option value="ALL">{isAmharic ? "የተመደበ ፕሮጀክት የለም" : "No Project Assigned"}</option>
            )}
            {options.projects.map((proj) => (
              <option key={proj} value={proj}>
                {proj}
              </option>
            ))}
          </select>
        </div>

        {/* Department */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            {isAmharic ? "ክፍል / ዲፓርትመንት" : "Department"}
          </label>
          <select
            value={filters.department}
            onChange={(e) => update({ department: e.target.value })}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-red-500"
          >
            <option value="ALL">{isAmharic ? "ሁሉም ክፍሎች" : "All Departments"}</option>
            {options.departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        {/* Customer */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            {isAmharic ? "ደንበኛ" : "Customer"}
          </label>
          <select
            value={filters.customer}
            onChange={(e) => update({ customer: e.target.value, supplier: e.target.value !== "ALL" ? "ALL" : filters.supplier })}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-red-500"
          >
            <option value="ALL">{isAmharic ? "ሁሉም ደንበኞች" : "All Customers"}</option>
            {options.customers.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Supplier */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            {isAmharic ? "አቅራቢ" : "Supplier"}
          </label>
          <select
            value={filters.supplier}
            onChange={(e) => update({ supplier: e.target.value, customer: e.target.value !== "ALL" ? "ALL" : filters.customer })}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-red-500"
          >
            <option value="ALL">{isAmharic ? "ሁሉም አቅራቢዎች" : "All Suppliers"}</option>
            {options.suppliers.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Financial Category */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            {isAmharic ? "የፋይናንስ ዘርፍ" : "Category"}
          </label>
          <select
            value={filters.category}
            onChange={(e) => update({ category: e.target.value })}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-red-500"
          >
            <option value="ALL">{isAmharic ? "ሁሉም ዘርፎች" : "All Categories"}</option>
            {options.categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Transaction Status */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            {isAmharic ? "የግብይት ሁኔታ" : "Status"}
          </label>
          <select
            value={filters.status}
            onChange={(e) => update({ status: e.target.value })}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-red-500"
          >
            <option value="ALL">{isAmharic ? "ሁሉም ሁኔታዎች" : "All Statuses"}</option>
            {options.statuses.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div>
          <label className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            <Filter size={10} />
            <span>{isAmharic ? "ፈልግ" : "Search"}</span>
          </label>
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-2 text-slate-500 pointer-events-none" />
            <input
              type="text"
              value={filters.searchTerm || ""}
              onChange={(e) => update({ searchTerm: e.target.value })}
              placeholder={isAmharic ? "መለያ / ስም..." : "Ref, Client, Vendor..."}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-red-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
