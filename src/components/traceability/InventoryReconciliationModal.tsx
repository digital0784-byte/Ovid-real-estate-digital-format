import React, { useState } from "react";
import { PanelInventoryReconciliationRecord } from "../../types";
import { PanelTraceabilityService } from "../../services/panelTraceabilityService";
import { 
  X, 
  RotateCw, 
  AlertTriangle, 
  CheckCircle, 
  Building2, 
  FileText, 
  Layers,
  ArrowRight
} from "lucide-react";

interface Props {
  onClose: () => void;
  isAmharic: boolean;
  currentUser: { id: string; name: string; role: string };
}

export const InventoryReconciliationModal: React.FC<Props> = ({
  onClose,
  isAmharic,
  currentUser
}) => {
  const [facility, setFacility] = useState({
    id: "WH-CENTRAL-01",
    name: "Central Warehouse A",
    type: "WAREHOUSE" as const
  });
  const [records, setRecords] = useState<PanelInventoryReconciliationRecord[]>(() =>
    PanelTraceabilityService.getReconciliations()
  );
  const [isRunning, setIsRunning] = useState(false);
  const [feedback, setFeedback] = useState("");

  const handleRunReconciliation = () => {
    setIsRunning(true);
    setFeedback("");
    setTimeout(() => {
      const results = PanelTraceabilityService.performReconciliation({
        facilityId: facility.id,
        facilityName: facility.name,
        facilityType: facility.type,
        user: currentUser
      });
      setRecords(results);
      setIsRunning(false);
      setFeedback(isAmharic 
        ? `የክምችት ማስታረቅ ተጠናቋል! ${results.length} የፓነል ምድቦች ተመርምረዋል።` 
        : `Reconciliation audit completed! Audited ${results.length} panel product lines.`
      );
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400">
              <RotateCw size={18} className={isRunning ? "animate-spin" : ""} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {isAmharic ? "የፓነል ክምችት ማስታረቂያ (Automated Reconciliation)" : "Panel Inventory Reconciliation Hub"}
              </h3>
              <p className="text-[11px] text-slate-400">
                {isAmharic ? "የሲስተም ክምችት vs አካላዊ ቆጠራ ልዩነት ፈላጊ" : "System Stock vs Physical Stock vs Installed vs Missing Discrepancy Engine"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Controls */}
        <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2">
            <label className="text-slate-400 font-semibold">{isAmharic ? "ማዕከል ምረጥ:" : "Select Facility:"}</label>
            <select
              value={facility.id}
              onChange={(e) => {
                const id = e.target.value;
                if (id === "WH-CENTRAL-01") {
                  setFacility({ id, name: "Central Warehouse A", type: "WAREHOUSE" });
                } else if (id === "STORE-BOL-01") {
                  setFacility({ id, name: "Bole Heights Site Store 01", type: "SITE_STORE" });
                } else {
                  setFacility({ id, name: "CMC CBD Tower 2 Store", type: "SITE_STORE" });
                }
              }}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
            >
              <option value="WH-CENTRAL-01">Central Warehouse A</option>
              <option value="STORE-BOL-01">Bole Heights Site Store 01</option>
              <option value="STORE-CMC-01">CMC CBD Tower 2 Store</option>
            </select>
          </div>

          <button
            onClick={handleRunReconciliation}
            disabled={isRunning}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:bg-slate-700 text-white rounded-lg font-bold text-xs transition-colors flex items-center space-x-1.5 cursor-pointer shadow-md shadow-red-950/40"
          >
            <RotateCw size={14} className={isRunning ? "animate-spin" : ""} />
            <span>{isAmharic ? "አሁን አስታርቅ" : "Run Reconciliation Audit"}</span>
          </button>
        </div>

        {feedback && (
          <div className="p-3 bg-emerald-950/50 border-b border-emerald-800 text-emerald-300 text-xs flex items-center space-x-2">
            <CheckCircle size={15} className="shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {/* Audit Results Table */}
        <div className="p-5 overflow-y-auto flex-1 text-xs space-y-4">
          <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950">
            <table className="w-full text-left">
              <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 font-bold">
                <tr>
                  <th className="px-4 py-3">Panel Code / Type</th>
                  <th className="px-3 py-3 text-center">System Stock</th>
                  <th className="px-3 py-3 text-center">Physical Stock</th>
                  <th className="px-3 py-3 text-center">Issued / Assigned</th>
                  <th className="px-3 py-3 text-center">Installed</th>
                  <th className="px-3 py-3 text-center">Damaged</th>
                  <th className="px-3 py-3 text-center">Missing</th>
                  <th className="px-3 py-3 text-center">Discrepancy</th>
                  <th className="px-3 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-10 text-slate-500">
                      {isAmharic ? "ምንም የማስታረቂያ መዝገብ የለም። 'አሁን አስታርቅ' የሚለውን ይጫኑ።" : "No reconciliation records. Click 'Run Reconciliation Audit' to evaluate."}
                    </td>
                  </tr>
                ) : (
                  records.map((r) => {
                    const hasDiscrepancy = r.discrepancyCount !== 0;
                    return (
                      <tr key={r.reconciliationId} className="hover:bg-slate-900/40">
                        <td className="px-4 py-3">
                          <div className="font-bold text-white">{r.panelCode}</div>
                          <div className="text-[10px] text-slate-400">{r.panelType} • {r.dimension}</div>
                        </td>
                        <td className="px-3 py-3 text-center font-mono font-bold text-slate-200">{r.systemStock}</td>
                        <td className="px-3 py-3 text-center font-mono font-bold text-slate-200">{r.physicalStock}</td>
                        <td className="px-3 py-3 text-center font-mono text-amber-300">{r.issuedPanels}</td>
                        <td className="px-3 py-3 text-center font-mono text-blue-300">{r.installedPanels}</td>
                        <td className="px-3 py-3 text-center font-mono text-rose-300">{r.damagedPanels}</td>
                        <td className="px-3 py-3 text-center font-mono text-red-400">{r.missingPanels}</td>
                        <td className="px-3 py-3 text-center font-mono font-black">
                          {hasDiscrepancy ? (
                            <span className="text-red-400 bg-red-950 px-2 py-0.5 rounded border border-red-800">
                              {r.discrepancyCount > 0 ? `-${r.discrepancyCount}` : `+${Math.abs(r.discrepancyCount)}`}
                            </span>
                          ) : (
                            <span className="text-emerald-400">0</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <span className={`px-2 py-0.5 rounded text-[10px] border font-bold ${
                            hasDiscrepancy
                              ? "bg-red-950/80 border-red-800 text-red-300 animate-pulse"
                              : "bg-emerald-950/80 border-emerald-800 text-emerald-300"
                          }`}>
                            {r.status}
                          </span>
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
    </div>
  );
};
