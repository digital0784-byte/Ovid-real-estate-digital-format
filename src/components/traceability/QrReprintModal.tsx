import React, { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { TraceablePanel } from "../../types";
import { PanelTraceabilityService } from "../../services/panelTraceabilityService";
import { 
  X, 
  Printer, 
  QrCode, 
  Search, 
  AlertTriangle, 
  CheckCircle, 
  ShieldCheck, 
  History, 
  Info, 
  FileText,
  Tag,
  MapPin,
  Sparkles
} from "lucide-react";

interface Props {
  initialPanel?: TraceablePanel | null;
  onClose: () => void;
  onSuccess: (updatedPanel: TraceablePanel) => void;
  isAmharic: boolean;
  currentUser: { id: string; name: string; role: string };
}

export const QrReprintModal: React.FC<Props> = ({
  initialPanel,
  onClose,
  onSuccess,
  isAmharic,
  currentUser
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [panel, setPanel] = useState<TraceablePanel | null>(initialPanel || null);
  const [searchError, setSearchError] = useState("");

  // Replacement reason fields
  const [oldQrStatus, setOldQrStatus] = useState<string>("Damaged");
  const [replacementReason, setReplacementReason] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [actionError, setActionError] = useState("");

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSearchError("");
    if (!searchQuery.trim()) {
      setSearchError(isAmharic ? "እባክዎን ሲሪያል ቁጥር፣ የፓነል ኮድ ወይም መለያ ያስገቡ" : "Please enter a Serial Number, Panel Code, or Panel ID.");
      return;
    }

    const found = PanelTraceabilityService.findPanel(searchQuery);
    if (!found) {
      setSearchError(
        isAmharic 
          ? `የተፈለገው ፓነል '${searchQuery}' አልተገኘም። እባክዎን ትክክለኛውን ሲሪያል ወይም ኮድ ያረጋግጡ።` 
          : `Panel '${searchQuery}' not found. Please verify the Serial Number or Panel Code.`
      );
    } else {
      setPanel(found);
      setIsSubmitted(false);
    }
  };

  const handleConfirmReprint = () => {
    if (!panel) return;
    setActionError("");

    if (!replacementReason.trim()) {
      setActionError(
        isAmharic 
          ? "እባክዎን የQR መለያው የተቀየረበትን ምክንያት ያስገቡ (ለምሳሌ፡ የተቀደደ፣ የደበዘዘ፣ የተበላሸ)" 
          : "Please specify the replacement reason (e.g. Scratched during cleaning, Torn during crane movement)."
      );
      return;
    }

    const result = PanelTraceabilityService.reprintOrReplaceQrCode({
      panelIdOrQuery: panel.panelId,
      oldQrStatus,
      replacementReason,
      user: currentUser
    });

    if (!result.success || !result.panel) {
      setActionError(result.error || "Failed to process QR reprint");
    } else {
      setPanel(result.panel);
      setIsSubmitted(true);
      onSuccess(result.panel);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-500">
              <Printer size={20} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-black text-white uppercase tracking-tight">
                  {isAmharic ? "የQR ኮድ ምትክ እና ዳግም ህትመት" : "QR Code Replacement & Reprint"}
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/80 border border-amber-800 text-amber-300">
                  REPRINT ENGINE
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {isAmharic 
                  ? "የተበላሸ፣ የተቀደደ ወይም የማይነበብ የQR መለያን በነበረው ማንነት መልሶ ማተሚያ" 
                  : "Regenerate/Reprint original QR identity for damaged, torn, or unreadable tags without altering history"}
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

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs flex-1">
          {/* Step 1: Panel Lookup Search if not pre-selected or change */}
          <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
                <Search size={14} className="text-red-400" />
                <span>{isAmharic ? "1. ፓነሉን ፈልግ (በሲሪያል፣ ኮድ ወይም ID)" : "1. Search Panel (By Serial Number, Panel Code, or Panel ID)"}</span>
              </span>
              {panel && (
                <button
                  type="button"
                  onClick={() => { setPanel(null); setIsSubmitted(false); }}
                  className="text-red-400 hover:underline text-[11px] cursor-pointer"
                >
                  {isAmharic ? "ሌላ ፓነል ምረጥ" : "Change Panel"}
                </button>
              )}
            </div>

            <form onSubmit={handleSearch} className="flex space-x-2">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder={isAmharic 
                    ? "ሲሪያል ቁጥር (ለምሳሌ: AL-001245) ወይም የፓነል ኮድ (IWP-1200-600) አስገባ..." 
                    : "Enter Serial Number (e.g. AL-001245) or Panel Code (IWP-1200-600) or Panel ID..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono placeholder-slate-500 focus:outline-none focus:border-red-500"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold transition-colors cursor-pointer flex items-center space-x-1"
              >
                <span>{isAmharic ? "ፈልግ" : "Search"}</span>
              </button>
            </form>

            {searchError && (
              <p className="text-red-400 text-xs font-semibold">{searchError}</p>
            )}
          </div>

          {/* Step 2: Panel Details & Integrity Confirmation */}
          {panel ? (
            <div className="space-y-4">
              {/* Existing Panel Summary Banner */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-base font-black text-white">{panel.serialNumber}</span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[11px]">
                      {panel.panelCode}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 text-[10px] font-bold">
                      {panel.status}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Panel ID: <strong className="font-mono text-slate-300">{panel.panelId}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-500 block">Type:</span>
                    <span className="text-slate-200 font-medium">{panel.panelType}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Dimensions:</span>
                    <span className="text-slate-200 font-mono">{panel.dimensions}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Condition:</span>
                    <span className="text-slate-200 font-medium">{panel.condition}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Reprint Count:</span>
                    <span className="font-mono text-amber-300 font-bold">{panel.qrReplacementCount || 0} times</span>
                  </div>
                </div>

                <div className="pt-1 flex items-center space-x-1.5 text-amber-300 text-[11px]">
                  <MapPin size={13} className="shrink-0" />
                  <span className="truncate">{panel.currentLocation}</span>
                </div>
              </div>

              {/* Strict Integrity Notice */}
              <div className="p-3 bg-blue-950/40 border border-blue-900/60 rounded-xl text-blue-200 text-xs flex items-start space-x-2.5">
                <ShieldCheck size={16} className="text-blue-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5 leading-relaxed">
                  <strong className="block text-white">
                    {isAmharic ? "የማንነት እና ታሪክ ጥበቃ ማረጋገጫ (Identity Protection Guarantee):" : "Single Identity & History Protection Guarantee:"}
                  </strong>
                  <p className="text-[11px] text-blue-300">
                    {isAmharic 
                      ? "ይህ ሂደት አዲስ ፓነል ወይም አዲስ ሲሪያል አይፈጥርም። ነባሩን የፓነል ማንነት፣ የቦታ ታሪክ፣ የብልሽት መዝገብና ምደባ ሳይነካ የቀደመውን QR ኮድ መልሶ ያትማል።" 
                      : "This operation will reprint the SAME permanent QR identity. No new panel or serial is created. All movement logs, location history, damage records, and workforce assignments remain preserved."}
                  </p>
                </div>
              </div>

              {/* Step 3: Replacement Reason Form */}
              <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-3">
                <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px] block border-b border-slate-800 pb-2">
                  {isAmharic ? "2. የQR መለያ ሁኔታ እና የመተኪያ ምክንያት" : "2. QR Label Condition & Replacement Directive"}
                </span>

                {actionError && (
                  <div className="p-2.5 bg-red-950/70 border border-red-800 text-red-300 text-xs rounded-lg flex items-center space-x-2">
                    <AlertTriangle size={14} className="shrink-0" />
                    <span>{actionError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">
                      {isAmharic ? "የቀደመው QR መለያ ሁኔታ (Old QR Status) *" : "Old QR Status / Defect *"}
                    </label>
                    <select
                      value={oldQrStatus}
                      onChange={(e) => setOldQrStatus(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-medium"
                    >
                      <option value="Damaged">Damaged (የተበላሸ / የተቧጠጠ)</option>
                      <option value="Torn">Torn (የተቀደደ)</option>
                      <option value="Unreadable">Unreadable / Faded (የማይነበብ / የደበዘዘ)</option>
                      <option value="Lost">Lost / Peeled Off (የጠፋ / የተላጠ)</option>
                      <option value="Preventive Replacement">Preventive Replacement (የቅድመ ጥንቃቄ ምትክ)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">
                      {isAmharic ? "የፈቀደው / ያተመው ባለሙያ" : "Authorized Replaced By"}
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={`${currentUser.name} (${currentUser.role})`}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-400 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">
                    {isAmharic ? "የምትክ ምክንያት (Replacement Reason) *" : "Specific Replacement Reason / Field Observation *"}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={isAmharic 
                      ? "ለምሳሌ: በኮንክሪት ዝቃጭ ምክንያት ስካነሩ ማንበብ አልቻለም..." 
                      : "e.g. Chemical washing stripped QR matrix; Label torn during crane bundle hoisting"}
                    value={replacementReason}
                    onChange={(e) => setReplacementReason(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              {/* Step 4: High-Fidelity Printable QR Tag Preview */}
              <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-3">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
                    <Tag size={14} className="text-red-400" />
                    <span>{isAmharic ? "3. የህትመት ቅድመ ዕይታ (Thermal / Vinyl Label Preview)" : "3. Printable Heavy-Duty Industrial Label Preview"}</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">100mm × 75mm standard</span>
                </div>

                {/* Industrial Printable Label Card */}
                <div id="printable-qr-tag" className="bg-white text-slate-950 p-5 rounded-xl border-2 border-slate-900 shadow-xl max-w-md mx-auto space-y-3">
                  {/* Tag Header */}
                  <div className="border-b-2 border-slate-900 pb-2 flex items-center justify-between">
                    <div>
                      <div className="font-black text-xs uppercase tracking-wider text-slate-900">
                        DIGITAL CONSTRUCTION ERP SYSTEM
                      </div>
                      <div className="text-[9px] font-mono font-bold text-slate-600">
                        FORMWORK ASSET IDENTIFICATION TAG
                      </div>
                    </div>
                    <div className="px-2 py-0.5 bg-slate-900 text-white rounded text-[9px] font-mono font-bold">
                      REPRINT #{panel.qrReplacementCount ? panel.qrReplacementCount + 1 : 1}
                    </div>
                  </div>

                  {/* QR Code and Specs Grid */}
                  <div className="flex items-center space-x-4">
                    {/* Visual QR Code Display */}
                    <div className="p-2 border-2 border-slate-900 rounded-lg bg-white flex flex-col items-center justify-center shrink-0">
                      <QRCodeSVG 
                        value={panel.QRCode || `DIGITAL-ERP://PANEL/${panel.serialNumber}`} 
                        size={92} 
                        level="M" 
                      />
                      <span className="text-[8px] font-mono mt-1 font-bold text-slate-700">SCAN ME</span>
                    </div>

                    {/* Metadata text */}
                    <div className="space-y-1 text-slate-900">
                      <div className="font-mono text-lg font-black tracking-tight">
                        {panel.serialNumber}
                      </div>
                      <div className="text-xs font-bold font-mono text-slate-800">
                        {panel.panelCode}
                      </div>
                      <div className="text-[11px] font-semibold text-slate-700">
                        {panel.panelCategory}
                      </div>
                      <div className="text-[10px] font-mono text-slate-600">
                        Dim: {panel.dimensions}
                      </div>
                      <div className="text-[9px] font-mono text-slate-500 truncate max-w-[170px]" title={panel.currentLocation}>
                        Loc: {panel.currentLocation}
                      </div>
                    </div>
                  </div>

                  {/* Barcode representation */}
                  <div className="border-t-2 border-slate-900 pt-2 flex items-center justify-between text-[10px] font-mono font-bold">
                    <span className="tracking-widest">||| | | || ||| | ||| ||</span>
                    <span>{panel.barcode}</span>
                  </div>

                  {/* Footer Notice */}
                  <div className="text-[8px] text-slate-500 font-mono text-center pt-0.5 border-t border-slate-300">
                    Original identity preserved • Duplicate serialized tags strictly prohibited
                  </div>
                </div>
              </div>

              {isSubmitted && (
                <div className="p-3 bg-emerald-950/60 border border-emerald-800 text-emerald-300 rounded-xl text-xs flex items-center space-x-2">
                  <CheckCircle size={16} className="text-emerald-400 shrink-0" />
                  <span>
                    {isAmharic 
                      ? "የQR ምትክ በተሳካ ሁኔታ ተመዝግቧል! በኦዲት መዝገብ ውስጥ ቋሚ ማስረጃ ተይዟል።" 
                      : "QR code reprint recorded successfully in immutable audit trail!"}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center text-slate-500 space-y-2">
              <QrCode size={36} className="mx-auto text-slate-600 opacity-60" />
              <p className="text-xs">
                {isAmharic 
                  ? "እባክዎን ከላይ ያለውን የፍለጋ ሳጥን በመጠቀም ፓነሉን በሲሪያል ወይም በኮድ ይፈልጉ" 
                  : "Search for a panel above by Serial Number, Panel Code, or Panel ID to reprint its QR label."}
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {panel && (
          <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
            <span className="text-[11px] text-slate-400">
              {isSubmitted ? (
                <span className="text-emerald-400 font-bold">✓ Audit Recorded</span>
              ) : (
                <span>Click confirm to log event into audit trail</span>
              )}
            </span>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handlePrint}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1.5 cursor-pointer"
              >
                <Printer size={14} />
                <span>{isAmharic ? "መለያውን አትም (Print)" : "Print Label"}</span>
              </button>

              <button
                type="button"
                onClick={handleConfirmReprint}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-red-950/40 flex items-center space-x-1.5 cursor-pointer"
              >
                <CheckCircle size={14} />
                <span>{isAmharic ? "ምክንያቱን መዝግብ እና አፅድቅ" : "Confirm & Record Audit"}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
