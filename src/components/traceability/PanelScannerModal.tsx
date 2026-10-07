import React, { useState } from "react";
import { TraceablePanel } from "../../types";
import { PanelTraceabilityService } from "../../services/panelTraceabilityService";
import { 
  X, 
  Scan, 
  QrCode, 
  Search, 
  Camera, 
  AlertTriangle, 
  CheckCircle, 
  HelpCircle,
  ShieldAlert,
  Sparkles
} from "lucide-react";

interface Props {
  onClose: () => void;
  onPanelFound: (panel: TraceablePanel) => void;
  isAmharic: boolean;
  currentUserRole?: string;
}

export const PanelScannerModal: React.FC<Props> = ({
  onClose,
  onPanelFound,
  isAmharic,
  currentUserRole
}) => {
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [isSimulatingCamera, setIsSimulatingCamera] = useState(true);

  const canScan = PanelTraceabilityService.canRoleScanQR(currentUserRole);

  const handleScanSubmit = (codeToSearch?: string) => {
    setError("");
    const target = codeToSearch || query;
    if (!target.trim()) {
      setError(isAmharic ? "እባክዎን የፓነል QR፣ ባርኮድ ወይም ሲሪያል ያስገቡ" : "Please enter or scan a panel QR code / serial.");
      return;
    }

    const panel = PanelTraceabilityService.findPanel(target);
    if (!panel) {
      setError(
        isAmharic 
          ? `የተፈለገው ፓነል (${target}) በመረጃ ቋቱ ውስጥ አልተገኘም።` 
          : `Panel '${target}' not found in the Digital Construction ERP registry.`
      );
    } else {
      onPanelFound(panel);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400">
              <Scan size={18} className="animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {isAmharic ? "የፓነል QR እና ባርኮድ ስካነር" : "QR & Barcode Panel Scanner"}
              </h3>
              <p className="text-[11px] text-slate-400">
                {isAmharic ? "ፈጣን መለያ እና የእንቅስቃሴ ቁጥጥር" : "High-Speed Optical Traceability Scanner"}
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

        {/* Security / Permission Notice */}
        {!canScan && (
          <div className="p-3 bg-amber-950/40 border-b border-amber-800 text-amber-300 text-xs flex items-center space-x-2">
            <AlertTriangle size={15} className="shrink-0 text-amber-400" />
            <span>
              {isAmharic 
                ? "ማሳሰቢያ፡ የQR ስካኒንግ እና ዝውውር ፈቃድ የሚሰጠው ለተፈቀደላቸው የሥራ ድርሻዎች ብቻ ነው።" 
                : "Notice: Full panel scanning is authorized for Site Engineers, Supervisors, Store Owners, Team Leaders, and Managers."}
            </span>
          </div>
        )}

        {/* Scanner Viewport */}
        <div className="p-5 space-y-4 text-xs">
          {/* Simulated Camera Window */}
          <div className="relative aspect-video bg-black rounded-xl border-2 border-dashed border-red-500/60 overflow-hidden flex flex-col items-center justify-center text-center p-4 group">
            {/* Corner Targeting Reticles */}
            <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-red-500" />
            <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-red-500" />
            <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-red-500" />
            <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-red-500" />

            {/* Scanning Laser Line Animation */}
            <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent animate-bounce opacity-80" />

            <Camera size={36} className="text-slate-600 mb-2" />
            <p className="text-slate-400 text-xs font-semibold">
              {isAmharic ? "ካሜራውን ወደ ፓነሉ QR ወይም ባርኮድ ያነጣጥሩ" : "Align panel QR code or barcode within frame"}
            </p>
            <span className="text-[10px] text-slate-500 font-mono mt-1">
              Supports: DIGITAL-ERP://PANEL/* • Barcode-128
            </span>
          </div>

          {/* Quick Demo Pre-scans */}
          <div className="space-y-1.5">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              {isAmharic ? "የሙከራ ፓነሎች (Demo Panels for Fast Test):" : "Instant Demo Scans:"}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: "AL-001245 (Installed Wall)", code: "AL-001245" },
                { label: "STAIR-2026-001 (Stair Panel)", code: "STAIR-2026-001" },
                { label: "CA-00892 (Damaged Angle)", code: "CA-00892" },
                { label: "AL-001246 (Site Store)", code: "AL-001246" }
              ].map(demo => (
                <button
                  key={demo.code}
                  onClick={() => handleScanSubmit(demo.code)}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-[11px] font-mono transition-colors cursor-pointer"
                >
                  ⚡ {demo.label}
                </button>
              ))}
            </div>
          </div>

          {/* Manual Input Fallback */}
          <div className="pt-2 border-t border-slate-800 space-y-2">
            <label className="text-[11px] text-slate-300 font-semibold block">
              {isAmharic ? "በእጅ ያስገቡ (Manual Serial / QR Payload):" : "Or enter Serial / QR Payload manually:"}
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="e.g. AL-001245 or DIGITAL-ERP://PANEL/AL-001245"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleScanSubmit()}
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-red-500"
              />
              <button
                onClick={() => handleScanSubmit()}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer flex items-center space-x-1"
              >
                <Search size={14} />
                <span>{isAmharic ? "ፈልግ" : "Inspect"}</span>
              </button>
            </div>
            {error && (
              <p className="text-red-400 text-xs font-semibold mt-1">
                {error}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
