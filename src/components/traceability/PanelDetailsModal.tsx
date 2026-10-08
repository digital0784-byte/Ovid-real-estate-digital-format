import React, { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { 
  TraceablePanel, 
  PanelTraceabilityMovement, 
  PanelPhysicalCondition, 
  PanelTraceabilityAction 
} from "../../types";
import { PanelTraceabilityService } from "../../services/panelTraceabilityService";
import { 
  X, 
  QrCode, 
  Barcode, 
  Calendar, 
  MapPin, 
  Clock, 
  ShieldAlert, 
  Wrench, 
  ArrowRightLeft, 
  RotateCcw, 
  ArrowUpRight, 
  CheckCircle, 
  FileText, 
  Layers, 
  Building2, 
  Tag, 
  Plus, 
  Trash2,
  AlertTriangle,
  History,
  Info,
  Printer,
  Eye
} from "lucide-react";
import { QrReprintModal } from "./QrReprintModal";

interface Props {
  panel: TraceablePanel;
  onClose: () => void;
  onActionClick: (action: PanelTraceabilityAction, panel: TraceablePanel) => void;
  isAmharic: boolean;
  currentUserRole?: string;
  onRefreshPanel: () => void;
}

export const PanelDetailsModal: React.FC<Props> = ({
  panel,
  onClose,
  onActionClick,
  isAmharic,
  currentUserRole,
  onRefreshPanel
}) => {
  const [activeTab, setActiveTab] = useState<"DETAILS" | "HISTORY" | "ACCESSORIES" | "STAIR">("DETAILS");
  const [isReprintModalOpen, setIsReprintModalOpen] = useState(false);
  const [isViewQrModalOpen, setIsViewQrModalOpen] = useState(false);
  const [movements] = useState<PanelTraceabilityMovement[]>(() => 
    PanelTraceabilityService.getMovements(panel.panelId)
  );

  // Accessories attachment form state
  const [newAccType, setNewAccType] = useState<string>("Pin");
  const [newAccCode, setNewAccCode] = useState<string>("PIN-1650");
  const [newAccSerial, setNewAccSerial] = useState<string>("");
  const [newAccDim, setNewAccDim] = useState<string>("16 × 50 mm");
  const [newAccQty, setNewAccQty] = useState<number>(4);
  const [accError, setAccError] = useState<string>("");

  const permittedActions = PanelTraceabilityService.getPermittedActions(currentUserRole);

  const handleAddAccessory = () => {
    setAccError("");
    if (!newAccCode) {
      setAccError("Accessory Code is required");
      return;
    }
    const result = PanelTraceabilityService.attachAccessory(
      panel.panelId,
      {
        accessoryId: `ACC-${Date.now()}`,
        accessoryCode: newAccCode,
        serialNumber: newAccSerial || undefined,
        accessoryType: newAccType,
        dimensions: newAccDim,
        quantity: newAccQty,
        condition: "GOOD",
        currentLocation: panel.currentLocation
      },
      { id: "USER-CURRENT", name: "Authorized User", role: currentUserRole || "User" }
    );

    if (!result.success) {
      setAccError(result.error || "Failed to attach accessory");
    } else {
      setNewAccSerial("");
      onRefreshPanel();
    }
  };

  const handleDetachAccessory = (accId: string) => {
    PanelTraceabilityService.detachAccessory(
      panel.panelId,
      accId,
      { id: "USER-CURRENT", name: "Authorized User", role: currentUserRole || "User" }
    );
    onRefreshPanel();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-500">
              <QrCode size={20} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-black text-white font-mono">{panel.serialNumber}</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {panel.panelCode}
                </span>
              </div>
              <p className="text-xs text-slate-400">{panel.panelCategory} • {panel.dimensions}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 text-xs px-4 space-x-2 shrink-0">
          <button
            onClick={() => setActiveTab("DETAILS")}
            className={`py-2.5 px-3 border-b-2 font-bold cursor-pointer transition-colors ${
              activeTab === "DETAILS" ? "border-red-500 text-red-400" : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            {isAmharic ? "መሰረታዊ መረጃ" : "Panel Identity & Specs"}
          </button>
          <button
            onClick={() => setActiveTab("HISTORY")}
            className={`py-2.5 px-3 border-b-2 font-bold cursor-pointer transition-colors flex items-center space-x-1.5 ${
              activeTab === "HISTORY" ? "border-red-500 text-red-400" : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <History size={13} />
            <span>{isAmharic ? "የእንቅስቃሴ ታሪክ" : "Chronological History"} ({movements.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("ACCESSORIES")}
            className={`py-2.5 px-3 border-b-2 font-bold cursor-pointer transition-colors flex items-center space-x-1.5 ${
              activeTab === "ACCESSORIES" ? "border-red-500 text-red-400" : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <Layers size={13} />
            <span>{isAmharic ? "ተቀጥላዎች" : "Accessories"} ({panel.associatedAccessories?.length || 0})</span>
          </button>
          {panel.stairConfig && (
            <button
              onClick={() => setActiveTab("STAIR")}
              className={`py-2.5 px-3 border-b-2 font-bold cursor-pointer transition-colors ${
                activeTab === "STAIR" ? "border-purple-500 text-purple-400" : "border-transparent text-slate-400 hover:text-white"
              }`}
            >
              {isAmharic ? "የደረጃ ዝርዝር" : "Stair Configuration"}
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-6 flex-1 text-xs">
          {activeTab === "DETAILS" && (
            <div className="space-y-5">
              {/* Status and Location Summary Card */}
              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold mb-1">Status</span>
                  <span className="px-2.5 py-1 bg-red-950/80 border border-red-800 text-red-300 font-bold rounded-lg inline-block font-mono">
                    {panel.status}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold mb-1">Condition</span>
                  <span className="px-2.5 py-1 bg-slate-800 border border-slate-700 text-slate-200 font-semibold rounded-lg inline-block">
                    {panel.condition}
                  </span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold mb-1">Current Location</span>
                  <div className="flex items-center space-x-1.5 text-amber-300 font-medium">
                    <MapPin size={14} className="shrink-0" />
                    <span className="truncate">{panel.currentLocation}</span>
                  </div>
                </div>
              </div>

              {/* Unique Identity Fields (Section 1) */}
              <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-2 gap-2">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    {isAmharic ? "ቋሚ እና ልዩ መለያዎች (Unique Permanent Identity)" : "Unique Permanent Identity Fields"}
                  </h4>
                  {/* Action buttons: VIEW QR, PRINT QR, REPRINT QR */}
                  <div className="flex items-center space-x-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsViewQrModalOpen(true)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-[11px] font-bold flex items-center space-x-1 cursor-pointer transition-colors"
                      title={isAmharic ? "QR በሙሉ መጠን ተመልከት" : "View full-size QR code"}
                    >
                      <Eye size={12} className="text-blue-400" />
                      <span>{isAmharic ? "QR እይ" : "VIEW QR"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-[11px] font-bold flex items-center space-x-1 cursor-pointer transition-colors"
                      title={isAmharic ? "QR መለያ አትም" : "Print QR label"}
                    >
                      <Printer size={12} className="text-emerald-400" />
                      <span>{isAmharic ? "QR አትም" : "PRINT QR"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsReprintModalOpen(true)}
                      className="px-2.5 py-1 bg-amber-950/80 hover:bg-amber-900/90 text-amber-300 border border-amber-700/60 rounded-lg text-[11px] font-bold flex items-center space-x-1 cursor-pointer transition-colors"
                      title={isAmharic ? "የተበላሸ/የጠፋ QR በነበረው ማንነት መልሰህ አትም" : "Reprint identical QR for damaged/lost replacement"}
                    >
                      <QrCode size={12} className="text-amber-400" />
                      <span>{isAmharic ? "QR መልሰህ አትም" : "REPRINT QR"}</span>
                    </button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  {/* Visual QR Code Card */}
                  <div className="p-2.5 bg-white rounded-xl border border-slate-300 shadow-md flex flex-col items-center justify-center shrink-0">
                    <QRCodeSVG 
                      value={panel.QRCode || `DIGITAL-ERP://PANEL/${panel.serialNumber}`} 
                      size={96} 
                      level="M" 
                    />
                    <span className="text-[8px] font-mono font-bold text-slate-800 mt-1">VERIFIED TAG</span>
                  </div>

                  {/* Identity Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 flex-1 w-full">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Panel ID:</span>
                      <span className="font-mono text-slate-200 font-bold">{panel.panelId}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Serial Number:</span>
                      <span className="font-mono text-white font-bold">{panel.serialNumber}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Panel Code:</span>
                      <span className="font-mono text-slate-200">{panel.panelCode}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">QR Code Payload:</span>
                      <span className="font-mono text-xs text-red-400 truncate block" title={panel.QRCode}>{panel.QRCode}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Barcode:</span>
                      <span className="font-mono text-xs text-slate-300">{panel.barcode}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Installation Status:</span>
                      <span className="text-slate-300">{panel.installationStatus}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Physical Specifications */}
              <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider border-b border-slate-800 pb-2">
                  {isAmharic ? "መጠኖች እና ቴክኒካዊ መረጃዎች" : "Physical Dimensions & Manufacturer"}
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Dimensions:</span>
                    <span className="font-mono text-slate-200">{panel.dimensions}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Length × Width:</span>
                    <span className="font-mono text-slate-200">{panel.length} × {panel.width} mm</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Thickness:</span>
                    <span className="font-mono text-slate-200">{panel.thickness} mm</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Weight:</span>
                    <span className="font-mono text-slate-200">{panel.weight || "-"} kg</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Manufacturer:</span>
                    <span className="text-slate-200">{panel.manufacturer || "Certified OEM"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Purchase Date:</span>
                    <span className="text-slate-200">{panel.purchaseDate || "-"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Created At:</span>
                    <span className="text-slate-400">{new Date(panel.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Last Scanned By:</span>
                    <span className="text-slate-300">{panel.lastScannedBy || "Recent Scan"}</span>
                  </div>
                </div>
              </div>

              {panel.notes && (
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-400 text-xs flex items-start space-x-2">
                  <Info size={14} className="text-slate-400 shrink-0 mt-0.5" />
                  <span>{panel.notes}</span>
                </div>
              )}
            </div>
          )}

          {activeTab === "HISTORY" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center text-xs text-slate-400 border-b border-slate-800 pb-2">
                <span>{isAmharic ? "የእንቅስቃሴ ቅደም ተከተል (Immutable Chronological Log)" : "Immutable Movement History (Latest first)"}</span>
                <span className="font-mono text-slate-500">{movements.length} logs recorded</span>
              </div>

              <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                {movements.map((m, idx) => (
                  <div key={m.movementId || idx} className="relative">
                    <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-slate-900 border-2 border-red-500 flex items-center justify-center" />
                    <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-xl space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-red-400 uppercase tracking-wide text-xs">{m.action}</span>
                          <span className="text-[10px] px-2 py-0.5 bg-slate-800 rounded text-slate-400 font-mono">
                            {m.movementId}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 flex items-center space-x-1">
                          <Clock size={11} />
                          <span>{new Date(m.timestamp).toLocaleString()}</span>
                        </span>
                      </div>

                      <div className="text-slate-300 font-medium text-xs">
                        {m.fromLocation} <span className="text-red-500">→</span> {m.toLocation}
                      </div>

                      <div className="text-[11px] text-slate-400">
                        {m.reason}
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/60">
                        <span>By: <strong className="text-slate-300">{m.userName}</strong> ({m.userRole})</span>
                        <span>Condition: {m.conditionBefore} → <strong className="text-slate-300">{m.conditionAfter}</strong></span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "ACCESSORIES" && (
            <div className="space-y-4">
              <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  {isAmharic ? "አዲስ ተቀጥላ አያይዝ (Attach Accessory)" : "Attach Accessory to Panel"}
                </h4>
                {accError && (
                  <div className="p-2 bg-red-950/60 border border-red-800 text-red-300 text-xs rounded">
                    {accError}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Type</label>
                    <select
                      value={newAccType}
                      onChange={(e) => setNewAccType(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
                    >
                      <option value="Pin">Pin (ሚስማር/ፒን)</option>
                      <option value="Wedge">Wedge (ዋጅ)</option>
                      <option value="Tie">Tie (ታይ ሮድ)</option>
                      <option value="Corner accessory">Corner Bracket</option>
                      <option value="Support accessory">Support Prop</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Accessory Code</label>
                    <input
                      type="text"
                      value={newAccCode}
                      onChange={(e) => setNewAccCode(e.target.value)}
                      placeholder="e.g. PIN-1650"
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Serial (Optional)</label>
                    <input
                      type="text"
                      value={newAccSerial}
                      onChange={(e) => setNewAccSerial(e.target.value)}
                      placeholder="e.g. SN-098"
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Quantity</label>
                    <input
                      type="number"
                      min={1}
                      value={newAccQty}
                      onChange={(e) => setNewAccQty(parseInt(e.target.value) || 1)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={handleAddAccessory}
                      className="w-full py-1.5 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-bold transition-colors cursor-pointer flex items-center justify-center space-x-1"
                    >
                      <Plus size={13} />
                      <span>{isAmharic ? "አያይዝ" : "Attach"}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* List of accessories */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {isAmharic ? "የተያያዙ ተቀጥላዎች" : "Currently Associated Accessories"}
                </h4>
                {(!panel.associatedAccessories || panel.associatedAccessories.length === 0) ? (
                  <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-xl text-center text-slate-500">
                    {isAmharic ? "ምንም ተቀጥላ አልተያያዘም" : "No accessories associated with this panel"}
                  </div>
                ) : (
                  panel.associatedAccessories.map((acc) => (
                    <div
                      key={acc.accessoryId}
                      className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-white flex items-center space-x-2">
                          <span>{acc.accessoryType}</span>
                          <span className="font-mono text-cyan-400 text-[11px]">{acc.accessoryCode}</span>
                          {acc.serialNumber && (
                            <span className="text-[10px] px-1.5 py-0.2 bg-slate-800 rounded text-slate-400">
                              SN: {acc.serialNumber}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Dimensions: {acc.dimensions} • Qty: <strong className="text-white">{acc.quantity}</strong> • Location: {acc.currentLocation}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDetachAccessory(acc.accessoryId)}
                        className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                        title="Detach accessory"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === "STAIR" && panel.stairConfig && (
            <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-4">
              <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider border-b border-slate-800 pb-2">
                {isAmharic ? "የደረጃ ፎርምወርክ ጂኦሜትሪ" : "Stair Panel Geometry & Engineering Specifications"}
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <span className="text-slate-500 block text-[10px]">Riser Height:</span>
                  <span className="font-mono text-white text-sm font-bold">{panel.stairConfig.riserHeightMm} mm</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Tread Depth:</span>
                  <span className="font-mono text-white text-sm font-bold">{panel.stairConfig.treadDepthMm} mm</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Total Steps:</span>
                  <span className="font-mono text-white text-sm font-bold">{panel.stairConfig.totalSteps} steps</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Stair Width:</span>
                  <span className="font-mono text-white text-sm font-bold">{panel.stairConfig.stairWidthMm} mm</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Flight Angle:</span>
                  <span className="font-mono text-white text-sm font-bold">{panel.stairConfig.flightAngleDeg}°</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Landing Length:</span>
                  <span className="font-mono text-white text-sm font-bold">{panel.stairConfig.landingLengthMm || "-"} mm</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons Toolbar (Section 4 Quick Actions) */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="text-[11px] text-slate-400 font-semibold">
            {isAmharic ? "የተፈቀዱ ፈጣን እርምጃዎች:" : "Role Action Controls:"}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {permittedActions.includes("ISSUE") && (
              <button
                onClick={() => onActionClick("ISSUE", panel)}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition-colors flex items-center space-x-1 cursor-pointer"
              >
                <ArrowUpRight size={13} />
                <span>{isAmharic ? "አውጣ (Issue)" : "Issue"}</span>
              </button>
            )}

            {permittedActions.includes("RETURN") && (
              <button
                onClick={() => onActionClick("RETURN", panel)}
                className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-bold transition-colors flex items-center space-x-1 cursor-pointer"
              >
                <RotateCcw size={13} />
                <span>{isAmharic ? "መልስ (Return)" : "Return"}</span>
              </button>
            )}

            {permittedActions.includes("INSTALL") && (
              <button
                onClick={() => onActionClick("INSTALL", panel)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-colors flex items-center space-x-1 cursor-pointer"
              >
                <Building2 size={13} />
                <span>{isAmharic ? "ግጠም (Install)" : "Install"}</span>
              </button>
            )}

            {permittedActions.includes("TRANSFER") && (
              <button
                onClick={() => onActionClick("TRANSFER", panel)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold transition-colors flex items-center space-x-1 cursor-pointer"
              >
                <ArrowRightLeft size={13} />
                <span>{isAmharic ? "አዘዋውር (Transfer)" : "Transfer"}</span>
              </button>
            )}

            {permittedActions.includes("DAMAGE_REPORT") && (
              <button
                onClick={() => onActionClick("DAMAGE_REPORT", panel)}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition-colors flex items-center space-x-1 cursor-pointer"
              >
                <AlertTriangle size={13} />
                <span>{isAmharic ? "ጉዳት ሪፖርት (Damage)" : "Report Damage"}</span>
              </button>
            )}

            {permittedActions.includes("MISSING_REPORT") && (
              <button
                onClick={() => onActionClick("MISSING_REPORT", panel)}
                className="px-3 py-1.5 bg-red-900 hover:bg-red-800 text-red-200 border border-red-700 rounded-lg text-xs font-bold transition-colors flex items-center space-x-1 cursor-pointer"
              >
                <ShieldAlert size={13} />
                <span>{isAmharic ? "የጠፋ ሪፖርት (Missing)" : "Report Missing"}</span>
              </button>
            )}

            {/* Reprint QR Code Action (Always available to authorized roles) */}
            <button
              onClick={() => setIsReprintModalOpen(true)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-600/40 rounded-lg text-xs font-bold transition-colors flex items-center space-x-1 cursor-pointer"
            >
              <Printer size={13} className="text-amber-400" />
              <span>{isAmharic ? "QR መልሰህ አትም (Reprint QR)" : "Reprint QR Code"}</span>
            </button>
          </div>
        </div>

        {/* QR Code Replacement & Reprint Modal */}
        {isReprintModalOpen && (
          <QrReprintModal
            initialPanel={panel}
            onClose={() => setIsReprintModalOpen(false)}
            onSuccess={(updated) => {
              setIsReprintModalOpen(false);
              onRefreshPanel();
            }}
            isAmharic={isAmharic}
            currentUser={{
              id: "USER-CURRENT",
              name: "Authorized User",
              role: currentUserRole || "User"
            }}
          />
        )}

        {/* View Full-Size QR Identity Modal */}
        {isViewQrModalOpen && (
          <div className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl p-6 text-center space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2 text-left">
                  <div className="w-8 h-8 rounded-lg bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-500">
                    <QrCode size={16} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      {isAmharic ? "የፓነል ዲጂታል መለያ (QR Tag)" : "Panel Digital Identity Tag"}
                    </h4>
                    <p className="text-[10px] text-slate-400 font-mono">{panel.serialNumber}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsViewQrModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Crisp SVG QR display */}
              <div className="p-4 bg-white rounded-2xl border-2 border-slate-900 mx-auto inline-flex flex-col items-center justify-center shadow-lg">
                <QRCodeSVG
                  value={panel.QRCode || `DIGITAL-ERP://PANEL/${panel.serialNumber}`}
                  size={180}
                  level="M"
                />
                <span className="text-[10px] font-mono font-bold text-slate-800 mt-2 tracking-wider">
                  SCAN FOR TRACEABILITY
                </span>
              </div>

              {/* Specs info */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs font-mono space-y-1 text-left">
                <div className="flex justify-between">
                  <span className="text-slate-500">Panel ID:</span>
                  <span className="text-slate-200 font-bold">{panel.panelId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Serial Number:</span>
                  <span className="text-amber-400 font-bold">{panel.serialNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Panel Code:</span>
                  <span className="text-white">{panel.panelCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Dimensions:</span>
                  <span className="text-slate-300">{panel.dimensions}</span>
                </div>
                <div className="flex justify-between truncate">
                  <span className="text-slate-500">Location:</span>
                  <span className="text-slate-300 truncate max-w-[200px]" title={panel.currentLocation}>{panel.currentLocation}</span>
                </div>
              </div>

              {/* Buttons: Print, Reprint, Close */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="py-2.5 px-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 shadow-md shadow-red-950/50 cursor-pointer"
                >
                  <Printer size={14} />
                  <span>{isAmharic ? "QR አትም" : "PRINT QR"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsViewQrModalOpen(false);
                    setIsReprintModalOpen(true);
                  }}
                  className="py-2.5 px-3 bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-700/60 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <QrCode size={14} />
                  <span>{isAmharic ? "QR መልሰህ አትም" : "REPRINT QR"}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
