import React, { useState, useMemo } from "react";
import { 
  TraceablePanel, 
  PanelTraceabilityStatus, 
  PanelPhysicalCondition, 
  StandardPanelCategory 
} from "../../types";
import { 
  Search, 
  Filter, 
  QrCode, 
  Eye, 
  Layers, 
  Wrench, 
  AlertTriangle, 
  Building2, 
  MapPin, 
  Plus, 
  RefreshCw,
  SlidersHorizontal,
  ChevronRight,
  Printer
} from "lucide-react";

interface Props {
  panels: TraceablePanel[];
  onSelectPanel: (panel: TraceablePanel) => void;
  onOpenRegisterModal: () => void;
  onOpenReprintModal?: (panel: TraceablePanel) => void;
  isAmharic: boolean;
  selectedStatus: PanelTraceabilityStatus | "ALL";
  onStatusChange: (status: PanelTraceabilityStatus | "ALL") => void;
}

export const PanelRegistryTable: React.FC<Props> = ({
  panels,
  onSelectPanel,
  onOpenRegisterModal,
  onOpenReprintModal,
  isAmharic,
  selectedStatus,
  onStatusChange
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [filterCondition, setFilterCondition] = useState<string>("ALL");

  const filteredPanels = useMemo(() => {
    return panels.filter(panel => {
      // Status filter
      if (selectedStatus !== "ALL" && panel.status !== selectedStatus) return false;
      // Category filter
      if (filterCategory !== "ALL" && panel.panelCategory !== filterCategory) return false;
      // Condition filter
      if (filterCondition !== "ALL" && panel.condition !== filterCondition) return false;

      // Multi-field global search term (Section 13)
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matches = 
          panel.serialNumber.toLowerCase().includes(q) ||
          panel.panelCode.toLowerCase().includes(q) ||
          panel.QRCode.toLowerCase().includes(q) ||
          panel.barcode.toLowerCase().includes(q) ||
          panel.panelType.toLowerCase().includes(q) ||
          panel.dimensions.toLowerCase().includes(q) ||
          panel.currentLocation.toLowerCase().includes(q) ||
          (panel.currentProjectId && panel.currentProjectId.toLowerCase().includes(q)) ||
          (panel.currentBuildingId && panel.currentBuildingId.toLowerCase().includes(q)) ||
          (panel.currentFloorId && panel.currentFloorId.toLowerCase().includes(q)) ||
          (panel.currentZoneId && panel.currentZoneId.toLowerCase().includes(q)) ||
          (panel.assignedTeamLeaderId && panel.assignedTeamLeaderId.toLowerCase().includes(q)) ||
          (panel.assignedGangChiefId && panel.assignedGangChiefId.toLowerCase().includes(q)) ||
          panel.status.toLowerCase().includes(q) ||
          panel.condition.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [panels, selectedStatus, filterCategory, filterCondition, searchTerm]);

  const getStatusBadge = (status: PanelTraceabilityStatus) => {
    const badges: Record<PanelTraceabilityStatus, string> = {
      AVAILABLE: "bg-emerald-950/70 border-emerald-700 text-emerald-300",
      RESERVED: "bg-blue-950/70 border-blue-700 text-blue-300",
      REQUESTED: "bg-amber-950/70 border-amber-700 text-amber-300",
      APPROVED: "bg-cyan-950/70 border-cyan-700 text-cyan-300",
      ISSUED: "bg-amber-950/70 border-amber-600 text-amber-200",
      IN_TRANSIT: "bg-sky-950/70 border-sky-700 text-sky-300",
      AT_SITE_STORE: "bg-teal-950/70 border-teal-700 text-teal-300",
      ASSIGNED: "bg-indigo-950/70 border-indigo-700 text-indigo-300",
      INSTALLED: "bg-blue-950/70 border-blue-600 text-blue-200 font-bold",
      IN_USE: "bg-violet-950/70 border-violet-700 text-violet-300",
      DISASSEMBLED: "bg-slate-800 border-slate-600 text-slate-300",
      RETURNED: "bg-emerald-950/70 border-emerald-600 text-emerald-200",
      DAMAGED: "bg-rose-950/80 border-rose-700 text-rose-300 font-bold animate-pulse",
      UNDER_REPAIR: "bg-orange-950/70 border-orange-700 text-orange-300",
      MISSING: "bg-red-950/90 border-red-700 text-red-300 font-bold",
      LOST: "bg-red-950 border-red-800 text-red-400",
      RETIRED: "bg-slate-900 border-slate-700 text-slate-500 line-through"
    };
    return badges[status] || "bg-slate-800 text-slate-300";
  };

  const getConditionBadge = (cond: PanelPhysicalCondition) => {
    const badges: Record<PanelPhysicalCondition, string> = {
      NEW: "text-emerald-400 border-emerald-800/80 bg-emerald-950/40",
      GOOD: "text-emerald-300 border-emerald-800/60 bg-emerald-950/30",
      USED_GOOD: "text-blue-300 border-blue-800/60 bg-blue-950/30",
      MINOR_DAMAGE: "text-amber-300 border-amber-800/60 bg-amber-950/30",
      DAMAGED: "text-rose-400 border-rose-800/80 bg-rose-950/40 font-bold",
      CRITICAL_DAMAGE: "text-red-400 border-red-800 bg-red-950/60 font-bold",
      UNDER_REPAIR: "text-orange-300 border-orange-800/80 bg-orange-950/40",
      UNUSABLE: "text-slate-400 border-slate-700 bg-slate-900"
    };
    return badges[cond] || "text-slate-400";
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between shadow-md">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={isAmharic 
              ? "በሲሪያል፣ QR፣ ባርኮድ፣ ዓይነት፣ ሳይዝ፣ ፕሮጀክት ወይም ዞን ፈልግ..." 
              : "Search by Serial, QR, Barcode, Type, Dimension, Location, Team..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-700/80 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-red-500 transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Dropdown */}
          <select
            value={selectedStatus}
            onChange={(e) => onStatusChange(e.target.value as any)}
            className="bg-slate-950 border border-slate-700/80 text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-red-500"
          >
            <option value="ALL">{isAmharic ? "ሁሉም ሁኔታ (All Status)" : "All Status"}</option>
            <option value="AVAILABLE">AVAILABLE (ዝግጁ)</option>
            <option value="AT_SITE_STORE">AT_SITE_STORE (በስቶር ውስጥ)</option>
            <option value="ISSUED">ISSUED (የወጣ)</option>
            <option value="ASSIGNED">ASSIGNED (የተመደበ)</option>
            <option value="INSTALLED">INSTALLED (የተገጠመ)</option>
            <option value="IN_USE">IN_USE (በአገልግሎት)</option>
            <option value="DISASSEMBLED">DISASSEMBLED (የተነሳ)</option>
            <option value="RETURNED">RETURNED (የተመለሰ)</option>
            <option value="DAMAGED">DAMAGED (የተጎዳ)</option>
            <option value="UNDER_REPAIR">UNDER_REPAIR (በጥገና ላይ)</option>
            <option value="MISSING">MISSING (የጠፋ)</option>
            <option value="IN_TRANSIT">IN_TRANSIT (በጉዞ ላይ)</option>
          </select>

          {/* Condition Dropdown */}
          <select
            value={filterCondition}
            onChange={(e) => setFilterCondition(e.target.value)}
            className="bg-slate-950 border border-slate-700/80 text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-red-500"
          >
            <option value="ALL">{isAmharic ? "ሁሉም ይዞታ (Condition)" : "All Conditions"}</option>
            <option value="NEW">NEW (አዲስ)</option>
            <option value="GOOD">GOOD (ጥሩ)</option>
            <option value="USED_GOOD">USED_GOOD (ያገለገለ-ጥሩ)</option>
            <option value="MINOR_DAMAGE">MINOR_DAMAGE (ቀላል ብልሽት)</option>
            <option value="DAMAGED">DAMAGED (የተጎዳ)</option>
            <option value="CRITICAL_DAMAGE">CRITICAL_DAMAGE (ከባድ ጉዳት)</option>
            <option value="UNDER_REPAIR">UNDER_REPAIR (በጥገና ላይ)</option>
            <option value="UNUSABLE">UNUSABLE (ከጥቅም ውጪ)</option>
          </select>

          <button
            onClick={onOpenRegisterModal}
            className="px-3.5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 shadow-md shadow-red-950/40 cursor-pointer"
          >
            <Plus size={14} />
            <span>{isAmharic ? "አዲስ ፓነል መዝግብ" : "Register Panel"}</span>
          </button>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex justify-between items-center text-xs text-slate-400 px-1">
        <span>
          {isAmharic ? "የተገኙ ፓነሎች:" : "Showing panels:"} <strong className="text-white font-mono">{filteredPanels.length}</strong> / {panels.length}
        </span>
        {searchTerm && (
          <button 
            onClick={() => setSearchTerm("")} 
            className="text-red-400 hover:underline cursor-pointer"
          >
            {isAmharic ? "ፍለጋ አጽዳ" : "Clear filter"}
          </button>
        )}
      </div>

      {/* Panels Table */}
      <div className="overflow-x-auto bg-slate-900 border border-slate-800 rounded-xl shadow-lg">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 font-bold">
            <tr>
              <th className="px-4 py-3">{isAmharic ? "ሲሪያል ቁጥር / QR" : "Serial / QR"}</th>
              <th className="px-3 py-3">{isAmharic ? "የፓነል ኮድ እና ዓይነት" : "Panel Code & Type"}</th>
              <th className="px-3 py-3">{isAmharic ? "ልኬት (Dimensions)" : "Dimensions"}</th>
              <th className="px-3 py-3">{isAmharic ? "ሁኔታ (Status)" : "Status"}</th>
              <th className="px-3 py-3">{isAmharic ? "ይዞታ (Condition)" : "Condition"}</th>
              <th className="px-3 py-3">{isAmharic ? "ወቅታዊ መገኛ" : "Current Location"}</th>
              <th className="px-3 py-3">{isAmharic ? "ተቀጥላዎች (Accessories)" : "Accessories"}</th>
              <th className="px-3 py-3 text-right">{isAmharic ? "እርምጃ" : "Actions"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-medium">
            {filteredPanels.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-slate-500">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <Layers size={28} className="text-slate-600" />
                    <p>{isAmharic ? "ምንም የሚዛመድ ፓነል አልተገኘም" : "No matching panels found"}</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredPanels.map((p) => (
                <tr 
                  key={p.panelId}
                  className="hover:bg-slate-800/50 transition-colors group cursor-pointer"
                  onClick={() => onSelectPanel(p)}
                >
                  <td className="px-4 py-3 font-mono font-bold text-white whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-red-400 group-hover:border-red-500">
                        <QrCode size={13} />
                      </div>
                      <div>
                        <div>{p.serialNumber}</div>
                        <div className="text-[10px] text-slate-500 font-normal font-sans">{p.panelId}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="font-semibold text-slate-100">{p.panelCode}</div>
                    <div className="text-[10px] text-slate-400">{p.panelCategory}</div>
                    {p.stairConfig && (
                      <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] bg-purple-950 text-purple-300 border border-purple-800">
                        Stair Config
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-slate-300 font-mono whitespace-nowrap">
                    {p.dimensions}
                    {p.weight && (
                      <span className="block text-[10px] text-slate-500">{p.weight} kg</span>
                    )}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] border ${getStatusBadge(p.status)}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded border text-[10px] ${getConditionBadge(p.condition)}`}>
                      {p.condition}
                    </span>
                  </td>
                  <td className="px-3 py-3 max-w-[200px] truncate text-slate-300" title={p.currentLocation}>
                    <div className="flex items-center space-x-1.5">
                      <MapPin size={12} className="text-amber-400 shrink-0" />
                      <span className="truncate">{p.currentLocation}</span>
                    </div>
                    {p.assignedTeamLeaderId && (
                      <div className="text-[10px] text-slate-500 truncate">Leader: {p.assignedTeamLeaderId}</div>
                    )}
                  </td>
                  <td className="px-3 py-3 text-slate-400">
                    {p.associatedAccessories && p.associatedAccessories.length > 0 ? (
                      <span className="px-1.5 py-0.5 bg-slate-800 rounded text-[10px] text-cyan-300 font-mono">
                        {p.associatedAccessories.length} items
                      </span>
                    ) : (
                      <span className="text-slate-600 text-[10px]">-</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end space-x-1.5">
                      {onOpenReprintModal && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenReprintModal(p);
                          }}
                          className="p-1.5 text-slate-400 hover:text-amber-300 hover:bg-slate-800 rounded transition-colors cursor-pointer border border-transparent hover:border-slate-700"
                          title={isAmharic ? "QR መልሰህ አትም (Reprint QR)" : "Reprint QR Label"}
                        >
                          <Printer size={13} />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectPanel(p);
                        }}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-[11px] font-semibold transition-colors flex items-center space-x-1 cursor-pointer"
                      >
                        <Eye size={12} />
                        <span>{isAmharic ? "ዝርዝር" : "Inspect"}</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
