import React, { useState, useEffect } from "react";
import { 
  TraceablePanel, 
  PanelTraceabilityStatus, 
  PanelTraceabilityAction,
  PanelTraceabilityAuditLog
} from "../types";
import { PanelTraceabilityService, DEFAULT_DIMENSION_LIBRARY } from "../services/panelTraceabilityService";
import { TraceabilityDashboard } from "./traceability/TraceabilityDashboard";
import { PanelRegistryTable } from "./traceability/PanelRegistryTable";
import { PanelDetailsModal } from "./traceability/PanelDetailsModal";
import { PanelScannerModal } from "./traceability/PanelScannerModal";
import { PanelMovementModal } from "./traceability/PanelMovementModal";
import { InventoryReconciliationModal } from "./traceability/InventoryReconciliationModal";
import { DailyMovementReportModal } from "./traceability/DailyMovementReportModal";
import { PanelRegistrationModal } from "./traceability/PanelRegistrationModal";
import { QrReprintModal } from "./traceability/QrReprintModal";
import { 
  Scan, 
  Plus, 
  RotateCw, 
  FileText, 
  ShieldCheck, 
  Settings, 
  History, 
  Layers, 
  QrCode, 
  Sparkles,
  Download,
  CheckCircle,
  Clock,
  Printer
} from "lucide-react";

interface Props {
  isAmharic?: boolean;
  currentUserRole?: string;
  currentUserId?: string;
  currentUserName?: string;
}

export const PanelTraceabilityModule: React.FC<Props> = ({
  isAmharic = false,
  currentUserRole = "Super Admin",
  currentUserId = "USER-ADMIN-01",
  currentUserName = "Administrator"
}) => {
  const [panels, setPanels] = useState<TraceablePanel[]>(() => PanelTraceabilityService.getPanels());
  const [selectedStatus, setSelectedStatus] = useState<PanelTraceabilityStatus | "ALL">("ALL");

  // Active view tab
  const [activeTab, setActiveTab] = useState<"DASHBOARD" | "REGISTRY" | "AUDIT" | "DIMENSIONS">("DASHBOARD");

  // Modals state
  const [inspectedPanel, setInspectedPanel] = useState<TraceablePanel | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isReconcileOpen, setIsReconcileOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isReprintModalOpen, setIsReprintModalOpen] = useState(false);

  // Movement modal state
  const [movementActionState, setMovementActionState] = useState<{
    action: PanelTraceabilityAction;
    panel: TraceablePanel;
  } | null>(null);

  // Audit logs state
  const [auditLogs, setAuditLogs] = useState<PanelTraceabilityAuditLog[]>(() =>
    PanelTraceabilityService.getAuditLogs()
  );

  const refreshData = () => {
    const updated = PanelTraceabilityService.getPanels();
    setPanels([...updated]);
    setAuditLogs(PanelTraceabilityService.getAuditLogs());
    if (inspectedPanel) {
      const match = updated.find(p => p.panelId === inspectedPanel.panelId);
      if (match) setInspectedPanel(match);
    }
  };

  useEffect(() => {
    const handleUpdate = () => {
      refreshData();
    };
    window.addEventListener("traceable_panels_updated", handleUpdate);
    window.addEventListener("panel_audit_logs_updated", handleUpdate);
    window.addEventListener("panel_movements_updated", handleUpdate);
    return () => {
      window.removeEventListener("traceable_panels_updated", handleUpdate);
      window.removeEventListener("panel_audit_logs_updated", handleUpdate);
      window.removeEventListener("panel_movements_updated", handleUpdate);
    };
  }, [inspectedPanel]);

  const currentUser = {
    id: currentUserId,
    name: currentUserName,
    role: currentUserRole
  };

  return (
    <div className="w-full space-y-6 text-slate-100 p-4 sm:p-6 bg-slate-950 min-h-screen">
      {/* Module Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-red-600 to-amber-600 flex items-center justify-center text-white shadow-lg shadow-red-950/50">
            <QrCode size={24} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-black text-white tracking-tight uppercase">
                {isAmharic ? "የአሉሚኒየም ፎርምወርክ ፓነል ዱካ መከታተያ" : "Panel Traceability Module"}
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-950/80 border border-red-800 text-red-300">
                ERP CORE
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {isAmharic 
                ? "ዲጂታል ኮንስትራክሽን ERP - የፓነሎች ቋሚ መለያ፣ QR ስካነር፣ ሙሉ የህይወት ዑደትና ኦዲት ቁጥጥር" 
                : "Digital Construction ERP System • End-to-End Aluminum Formwork Lifecycle & QR Traceability"}
            </p>
          </div>
        </div>

        {/* Action Header Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsScannerOpen(true)}
            className="px-3.5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-red-950/40 flex items-center space-x-1.5 cursor-pointer"
          >
            <Scan size={14} className="animate-pulse" />
            <span>{isAmharic ? "📷 QR ስካን አድርግ" : "📷 Scan QR / Barcode"}</span>
          </button>

          <button
            onClick={() => setIsRegisterOpen(true)}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center space-x-1.5 cursor-pointer"
          >
            <Plus size={14} />
            <span>{isAmharic ? "አዲስ ፓነል" : "Register Panel"}</span>
          </button>

          <button
            onClick={() => setIsReconcileOpen(true)}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center space-x-1.5 cursor-pointer"
          >
            <RotateCw size={14} />
            <span>{isAmharic ? "ክምችት አስታርቅ" : "Reconcile"}</span>
          </button>

          <button
            onClick={() => setIsReportOpen(true)}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center space-x-1.5 cursor-pointer"
          >
            <FileText size={14} />
            <span>{isAmharic ? "ዕለታዊ ሪፖርት" : "Daily Report"}</span>
          </button>

          <button
            onClick={() => setIsReprintModalOpen(true)}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-600/40 rounded-xl text-xs font-bold transition-colors flex items-center space-x-1.5 cursor-pointer shadow-sm"
          >
            <Printer size={14} className="text-amber-400" />
            <span>{isAmharic ? "🏷️ QR ምትክ / ዳግም ህትመት" : "🏷️ Reprint QR Code"}</span>
          </button>
        </div>
      </div>

      {/* Main Navigation Subtabs */}
      <div className="flex border-b border-slate-800 bg-slate-900/60 rounded-xl p-1 text-xs gap-1">
        <button
          onClick={() => setActiveTab("DASHBOARD")}
          className={`py-2 px-4 rounded-lg font-bold transition-colors cursor-pointer flex items-center space-x-2 ${
            activeTab === "DASHBOARD" ? "bg-red-600 text-white shadow-md shadow-red-950/50" : "text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
        >
          <Layers size={14} />
          <span>{isAmharic ? "ዳሽቦርድ እና ሁኔታዎች" : "Traceability Dashboard"}</span>
        </button>

        <button
          onClick={() => setActiveTab("REGISTRY")}
          className={`py-2 px-4 rounded-lg font-bold transition-colors cursor-pointer flex items-center space-x-2 ${
            activeTab === "REGISTRY" ? "bg-red-600 text-white shadow-md shadow-red-950/50" : "text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
        >
          <QrCode size={14} />
          <span>{isAmharic ? "የፓነሎች መዝገብ እና ፍለጋ" : "Panel Master Registry & Search"}</span>
          <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] font-mono font-normal">
            {panels.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("AUDIT")}
          className={`py-2 px-4 rounded-lg font-bold transition-colors cursor-pointer flex items-center space-x-2 ${
            activeTab === "AUDIT" ? "bg-red-600 text-white shadow-md shadow-red-950/50" : "text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
        >
          <ShieldCheck size={14} />
          <span>{isAmharic ? "የማይታጠፍ ኦዲት መዝገብ" : "Immutable Audit Trail"}</span>
        </button>

        <button
          onClick={() => setActiveTab("DIMENSIONS")}
          className={`py-2 px-4 rounded-lg font-bold transition-colors cursor-pointer flex items-center space-x-2 ${
            activeTab === "DIMENSIONS" ? "bg-red-600 text-white shadow-md shadow-red-950/50" : "text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
        >
          <Settings size={14} />
          <span>{isAmharic ? "የልኬት ላይብረሪ አስተዳደር" : "Dimension Library & Master Data"}</span>
        </button>
      </div>

      {/* Tab 1: Dashboard */}
      {activeTab === "DASHBOARD" && (
        <TraceabilityDashboard
          panels={panels}
          selectedStatus={selectedStatus}
          onFilterStatus={(s) => {
            setSelectedStatus(s);
            setActiveTab("REGISTRY");
          }}
          isAmharic={isAmharic}
        />
      )}

      {/* Tab 2: Registry & Search */}
      {activeTab === "REGISTRY" && (
        <PanelRegistryTable
          panels={panels}
          onSelectPanel={(panel) => setInspectedPanel(panel)}
          onOpenRegisterModal={() => setIsRegisterOpen(true)}
          onOpenReprintModal={(panel) => {
            setInspectedPanel(panel);
            setIsReprintModalOpen(true);
          }}
          isAmharic={isAmharic}
          selectedStatus={selectedStatus}
          onStatusChange={setSelectedStatus}
        />
      )}

      {/* Tab 3: Immutable Audit Trail (Requirement 16) */}
      {activeTab === "AUDIT" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <ShieldCheck size={16} className="text-red-400" />
                <span>{isAmharic ? "የፓነል እንቅስቃሴዎች ቋሚ ኦዲት መዝገብ" : "Permanent Traceability Audit Logs"}</span>
              </h3>
              <p className="text-xs text-slate-400">
                {isAmharic 
                  ? "ይህ መዝገብ ለማንም ተጠቃሚ የማይሰረዝ እና የማይቀየር ቋሚ ማስረጃ ነው" 
                  : "Cryptographically append-only audit records. Modifying or deleting records is prohibited."}
              </p>
            </div>
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer"
            >
              <Printer size={13} />
              <span>{isAmharic ? "አትም" : "Export Logs"}</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 font-bold">
                <tr>
                  <th className="px-3 py-2.5">Audit ID</th>
                  <th className="px-3 py-2.5">Timestamp</th>
                  <th className="px-3 py-2.5">User & Role</th>
                  <th className="px-3 py-2.5">Action</th>
                  <th className="px-3 py-2.5">Serial / Panel</th>
                  <th className="px-3 py-2.5">Location Transition</th>
                  <th className="px-3 py-2.5">Status Transition</th>
                  <th className="px-3 py-2.5">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium font-mono text-[11px]">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-slate-500 font-sans">
                      {isAmharic ? "ምንም የኦዲት መዝገብ አልተገኘም" : "No audit entries recorded yet"}
                    </td>
                  </tr>
                ) : (
                  auditLogs.slice(0, 100).map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/40">
                      <td className="px-3 py-2 text-slate-400">{log.id}</td>
                      <td className="px-3 py-2 text-slate-400 font-sans whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-3 py-2 font-sans">
                        <div className="text-white font-semibold">{log.userName}</div>
                        <div className="text-[10px] text-slate-400">{log.userRole}</div>
                      </td>
                      <td className="px-3 py-2 text-red-400 font-bold uppercase">{log.action}</td>
                      <td className="px-3 py-2 text-amber-300 font-bold">{log.serialNumber}</td>
                      <td className="px-3 py-2 font-sans truncate max-w-[180px]" title={`${log.previousLocation} → ${log.newLocation}`}>
                        {log.previousLocation} → {log.newLocation}
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-slate-400">{log.previousStatus}</span> → <span className="text-white font-bold">{log.newStatus}</span>
                      </td>
                      <td className="px-3 py-2 font-sans text-slate-400 max-w-[200px] truncate" title={log.notes}>
                        {log.notes}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Dimension Library & Master Data (Requirement 2) */}
      {activeTab === "DIMENSIONS" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Settings size={16} className="text-amber-400" />
                <span>{isAmharic ? "የአሉሚኒየም ፎርምወርክ ልኬት ላይብረሪ" : "Formwork Dimension Master Library"}</span>
              </h3>
              <p className="text-xs text-slate-400">
                {isAmharic 
                  ? "በሱፐር አድሚን የሚዋቀር የልኬት ካታሎግ (በአምራች ያልተገደበ ክፍት ላይብረሪ)" 
                  : "Super Admin configurable dimension specifications. Not hardcoded to any single OEM."}
              </p>
            </div>
            <button
              onClick={() => setIsRegisterOpen(true)}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold cursor-pointer"
            >
              + {isAmharic ? "አዲስ ልኬት መዝግብ" : "Add Dimension Specification"}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {PanelTraceabilityService.getDimensionsLibrary().map((dim) => (
              <div key={dim.id} className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-white">{dim.name}</span>
                  <span className="text-[10px] px-2 py-0.5 bg-slate-900 border border-slate-800 rounded text-amber-300 font-mono font-bold">
                    {dim.category}
                  </span>
                </div>
                <div className="text-base font-black font-mono text-red-400">
                  {dim.formatted}
                </div>
                <div className="text-[10px] text-slate-400 flex justify-between">
                  <span>Weight: {dim.weightKg} kg</span>
                  <span>ID: {dim.id}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODALS */}
      {/* 1. Panel Details Modal */}
      {inspectedPanel && (
        <PanelDetailsModal
          panel={inspectedPanel}
          onClose={() => setInspectedPanel(null)}
          onActionClick={(action, panel) => {
            setMovementActionState({ action, panel });
          }}
          isAmharic={isAmharic}
          currentUserRole={currentUserRole}
          onRefreshPanel={refreshData}
        />
      )}

      {/* 2. QR / Barcode Scanner Modal */}
      {isScannerOpen && (
        <PanelScannerModal
          onClose={() => setIsScannerOpen(false)}
          onPanelFound={(panel) => {
            setIsScannerOpen(false);
            setInspectedPanel(panel);
          }}
          isAmharic={isAmharic}
          currentUserRole={currentUserRole}
        />
      )}

      {/* 3. Panel Registration Modal */}
      {isRegisterOpen && (
        <PanelRegistrationModal
          onClose={() => setIsRegisterOpen(false)}
          onSuccess={() => {
            setIsRegisterOpen(false);
            refreshData();
          }}
          isAmharic={isAmharic}
          currentUser={currentUser}
        />
      )}

      {/* 4. Movement / Quick Action Modal */}
      {movementActionState && (
        <PanelMovementModal
          panel={movementActionState.panel}
          action={movementActionState.action}
          onClose={() => setMovementActionState(null)}
          onSuccess={() => {
            setMovementActionState(null);
            refreshData();
          }}
          isAmharic={isAmharic}
          currentUser={currentUser}
        />
      )}

      {/* 5. Inventory Reconciliation Modal */}
      {isReconcileOpen && (
        <InventoryReconciliationModal
          onClose={() => setIsReconcileOpen(false)}
          isAmharic={isAmharic}
          currentUser={currentUser}
        />
      )}

      {/* 6. Daily Movement Report Modal */}
      {isReportOpen && (
        <DailyMovementReportModal
          onClose={() => setIsReportOpen(false)}
          isAmharic={isAmharic}
          currentUser={currentUser}
        />
      )}

      {/* 7. QR Code Replacement & Reprint Modal */}
      {isReprintModalOpen && (
        <QrReprintModal
          initialPanel={inspectedPanel}
          onClose={() => setIsReprintModalOpen(false)}
          onSuccess={(updated) => {
            refreshData();
          }}
          isAmharic={isAmharic}
          currentUser={currentUser}
        />
      )}
    </div>
  );
};
