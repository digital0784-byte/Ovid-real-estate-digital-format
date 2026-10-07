import React from "react";
import { 
  TraceablePanel, 
  PanelTraceabilityStatus 
} from "../../types";
import { 
  Layers, 
  CheckCircle, 
  ArrowUpRight, 
  Building2, 
  AlertTriangle, 
  Wrench, 
  HelpCircle, 
  Truck, 
  RotateCcw,
  Activity,
  Layers3,
  MapPin,
  Clock
} from "lucide-react";

interface Props {
  panels: TraceablePanel[];
  onFilterStatus: (status: PanelTraceabilityStatus | "ALL") => void;
  selectedStatus: PanelTraceabilityStatus | "ALL";
  isAmharic: boolean;
}

export const TraceabilityDashboard: React.FC<Props> = ({
  panels,
  onFilterStatus,
  selectedStatus,
  isAmharic
}) => {
  const total = panels.length;
  const countByStatus = (status: PanelTraceabilityStatus) => 
    panels.filter(p => p.status === status).length;

  const available = countByStatus("AVAILABLE");
  const issued = countByStatus("ISSUED");
  const installed = countByStatus("INSTALLED");
  const inUse = countByStatus("IN_USE");
  const returned = countByStatus("RETURNED");
  const damaged = countByStatus("DAMAGED");
  const underRepair = countByStatus("UNDER_REPAIR");
  const missing = countByStatus("MISSING");
  const lost = countByStatus("LOST");
  const inTransit = countByStatus("IN_TRANSIT");

  // Breakdown aggregates
  const whCount: Record<string, number> = {};
  const storeCount: Record<string, number> = {};
  const projCount: Record<string, number> = {};
  const floorCount: Record<string, number> = {};

  panels.forEach(p => {
    if (p.currentWarehouseId) {
      whCount[p.currentWarehouseId] = (whCount[p.currentWarehouseId] || 0) + 1;
    }
    if (p.currentSiteStoreId) {
      storeCount[p.currentSiteStoreId] = (storeCount[p.currentSiteStoreId] || 0) + 1;
    }
    if (p.currentProjectId) {
      projCount[p.currentProjectId] = (projCount[p.currentProjectId] || 0) + 1;
    }
    if (p.currentFloorId) {
      floorCount[p.currentFloorId] = (floorCount[p.currentFloorId] || 0) + 1;
    }
  });

  const cards = [
    { status: "ALL", label: isAmharic ? "ጠቅላላ ፓነሎች" : "Total Panels", count: total, color: "border-slate-700 bg-slate-900 text-slate-100", icon: Layers },
    { status: "AVAILABLE", label: isAmharic ? "ዝግጁ / በክምችት" : "Available", count: available, color: "border-emerald-600/40 bg-emerald-950/30 text-emerald-300", icon: CheckCircle },
    { status: "ISSUED", label: isAmharic ? "የወጡ" : "Issued", count: issued, color: "border-amber-600/40 bg-amber-950/30 text-amber-300", icon: ArrowUpRight },
    { status: "INSTALLED", label: isAmharic ? "የተገጠሙ" : "Installed", count: installed, color: "border-blue-600/40 bg-blue-950/30 text-blue-300", icon: Building2 },
    { status: "IN_USE", label: isAmharic ? "በአገልግሎት ላይ" : "In Use", count: inUse, color: "border-indigo-600/40 bg-indigo-950/30 text-indigo-300", icon: Activity },
    { status: "RETURNED", label: isAmharic ? "የተመለሱ" : "Returned", count: returned, color: "border-teal-600/40 bg-teal-950/30 text-teal-300", icon: RotateCcw },
    { status: "IN_TRANSIT", label: isAmharic ? "በጉዞ ላይ" : "In Transit", count: inTransit, color: "border-sky-600/40 bg-sky-950/30 text-sky-300", icon: Truck },
    { status: "DAMAGED", label: isAmharic ? "የተጎዱ" : "Damaged", count: damaged, color: "border-rose-600/40 bg-rose-950/30 text-rose-300", icon: AlertTriangle },
    { status: "UNDER_REPAIR", label: isAmharic ? "በጥገና ላይ" : "Under Repair", count: underRepair, color: "border-orange-600/40 bg-orange-950/30 text-orange-300", icon: Wrench },
    { status: "MISSING", label: isAmharic ? "የጠፉ / የጎደሉ" : "Missing", count: missing, color: "border-red-600/50 bg-red-950/40 text-red-400", icon: HelpCircle },
    { status: "LOST", label: isAmharic ? "የተሰረቁ/የጠፉ" : "Lost", count: lost, color: "border-red-900 bg-red-950/60 text-red-500", icon: HelpCircle },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {cards.map(card => {
          const Icon = card.icon;
          const isSelected = selectedStatus === card.status;
          return (
            <button
              key={card.status}
              onClick={() => onFilterStatus(card.status as any)}
              className={`p-3.5 rounded-xl border text-left transition-all duration-150 flex flex-col justify-between cursor-pointer ${card.color} ${
                isSelected ? "ring-2 ring-red-500 shadow-lg scale-[1.02]" : "hover:border-slate-500 opacity-90 hover:opacity-100"
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold mb-2 opacity-80">
                <span className="truncate">{card.label}</span>
                <Icon size={15} />
              </div>
              <div className="text-2xl font-black font-mono tracking-tight">{card.count}</div>
              <div className="text-[10px] opacity-60 mt-1">
                {total > 0 ? `${((card.count / total) * 100).toFixed(0)}% of fleet` : "0%"}
              </div>
            </button>
          );
        })}
      </div>

      {/* Location Hierarchy Distribution Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center space-x-2 text-xs font-bold text-amber-400 mb-3 uppercase tracking-wider">
            <Building2 size={14} />
            <span>{isAmharic ? "ስርጭት በፕሮጀክት" : "Panels by Project"}</span>
          </div>
          <div className="space-y-2 text-xs">
            {Object.keys(projCount).length === 0 ? (
              <p className="text-slate-500 text-[11px]">{isAmharic ? "ምንም አልተገኘም" : "No project assignments"}</p>
            ) : (
              Object.entries(projCount).map(([prj, count]) => (
                <div key={prj} className="flex justify-between items-center py-1 border-b border-slate-800/60">
                  <span className="text-slate-300 font-medium truncate">{prj}</span>
                  <span className="font-mono bg-slate-800 px-2 py-0.5 rounded text-amber-300 font-bold">{count}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center space-x-2 text-xs font-bold text-blue-400 mb-3 uppercase tracking-wider">
            <MapPin size={14} />
            <span>{isAmharic ? "ስርጭት በመጋዘን / ስቶር" : "Panels by Facility"}</span>
          </div>
          <div className="space-y-2 text-xs">
            {Object.entries({ ...whCount, ...storeCount }).map(([fac, count]) => (
              <div key={fac} className="flex justify-between items-center py-1 border-b border-slate-800/60">
                <span className="text-slate-300 font-medium truncate">{fac}</span>
                <span className="font-mono bg-slate-800 px-2 py-0.5 rounded text-blue-300 font-bold">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center space-x-2 text-xs font-bold text-rose-400 mb-3 uppercase tracking-wider">
            <AlertTriangle size={14} />
            <span>{isAmharic ? "ልዩ ትኩረት የሚሹ ፓነሎች" : "Alerts & Scans Required"}</span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
              <span className="text-rose-300">{isAmharic ? "ብልሽት ያለባቸው (Damaged)" : "Damaged Panels"}</span>
              <span className="font-mono bg-rose-950/60 border border-rose-800 text-rose-300 px-2 py-0.5 rounded font-bold">{damaged}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
              <span className="text-red-400">{isAmharic ? "የጠፉ / የጎደሉ (Missing)" : "Missing Panels"}</span>
              <span className="font-mono bg-red-950/60 border border-red-800 text-red-300 px-2 py-0.5 rounded font-bold">{missing}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
              <span className="text-orange-300">{isAmharic ? "በጥገና ላይ ያሉ (Repair)" : "Under Repair"}</span>
              <span className="font-mono bg-orange-950/60 border border-orange-800 text-orange-300 px-2 py-0.5 rounded font-bold">{underRepair}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
