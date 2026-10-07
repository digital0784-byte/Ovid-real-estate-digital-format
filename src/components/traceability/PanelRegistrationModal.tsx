import React, { useState } from "react";
import { 
  StandardPanelCategory, 
  PanelPhysicalCondition, 
  PanelTraceabilityStatus 
} from "../../types";
import { 
  PanelTraceabilityService, 
  STANDARD_PANEL_CATEGORIES 
} from "../../services/panelTraceabilityService";
import { 
  X, 
  Plus, 
  QrCode, 
  CheckCircle, 
  AlertTriangle, 
  Layers, 
  Settings 
} from "lucide-react";

interface Props {
  onClose: () => void;
  onSuccess: () => void;
  isAmharic: boolean;
  currentUser: { id: string; name: string; role: string };
}

export const PanelRegistrationModal: React.FC<Props> = ({
  onClose,
  onSuccess,
  isAmharic,
  currentUser
}) => {
  const dimensionsLibrary = PanelTraceabilityService.getDimensionsLibrary();

  const [panelCategory, setPanelCategory] = useState<StandardPanelCategory>("Internal Wall Panel");
  const [panelCode, setPanelCode] = useState("IWP-1200-600");
  const [serialNumber, setSerialNumber] = useState(`AL-${Math.floor(100000 + Math.random() * 900000)}`);
  const [panelType, setPanelType] = useState("Internal Wall Standard Modular Panel");
  
  // Dimensions
  const [selectedDimId, setSelectedDimId] = useState(dimensionsLibrary[0]?.id || "");
  const [customLength, setCustomLength] = useState(1200);
  const [customWidth, setCustomWidth] = useState(600);
  const [customThickness, setCustomThickness] = useState(65);
  const [weight, setWeight] = useState(18.2);
  const [manufacturer, setManufacturer] = useState("Mivan Technology Corp");
  const [condition, setCondition] = useState<PanelPhysicalCondition>("NEW");
  const [status, setStatus] = useState<PanelTraceabilityStatus>("AVAILABLE");
  const [location, setLocation] = useState("Central Warehouse A → Section B → Rack 01");
  const [warehouseId, setWarehouseId] = useState("WH-CENTRAL-01");
  const [notes, setNotes] = useState("");

  // Stair configuration fields if Stair Panel
  const [isStair, setIsStair] = useState(false);
  const [riserHeight, setRiserHeight] = useState(175);
  const [treadDepth, setTreadDepth] = useState(280);
  const [totalSteps, setTotalSteps] = useState(16);
  const [flightAngle, setFlightAngle] = useState(32);

  const [error, setError] = useState("");

  const handleCategoryChange = (cat: StandardPanelCategory) => {
    setPanelCategory(cat);
    setIsStair(cat === "Stair Panel");
    // Auto-suggest code
    const prefix = cat.split(" ").map(w => w[0]).join("");
    setPanelCode(`${prefix}-1200-600`);
    setPanelType(`${cat} Standard`);
  };

  const handleDimensionSelect = (dimId: string) => {
    setSelectedDimId(dimId);
    const found = dimensionsLibrary.find(d => d.id === dimId);
    if (found) {
      setCustomLength(found.length);
      setCustomWidth(found.width);
      setCustomThickness(found.thickness);
      setWeight(found.weightKg);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!serialNumber.trim() || !panelCode.trim()) {
      setError("Serial Number and Panel Code are strictly required.");
      return;
    }

    const qrPayload = `DIGITAL-ERP://PANEL/${serialNumber.trim().toUpperCase()}`;
    const barcodeVal = `890${Math.floor(100000000 + Math.random() * 900000000)}`;

    const res = PanelTraceabilityService.registerPanel(
      {
        panelCode: panelCode.trim().toUpperCase(),
        serialNumber: serialNumber.trim().toUpperCase(),
        QRCode: qrPayload,
        barcode: barcodeVal,
        panelType,
        panelCategory,
        dimensions: `${customLength} × ${customWidth} × ${customThickness} mm`,
        length: customLength,
        width: customWidth,
        thickness: customThickness,
        weight,
        manufacturer,
        purchaseDate: new Date().toISOString().split("T")[0],
        condition,
        status,
        currentLocation: location,
        currentWarehouseId: warehouseId,
        installationStatus: "NOT_INSTALLED",
        notes,
        stairConfig: isStair ? {
          riserHeightMm: riserHeight,
          treadDepthMm: treadDepth,
          totalSteps,
          stairWidthMm: customWidth,
          flightAngleDeg: flightAngle,
          stringerType: "Integral Aluminum Stringer Box"
        } : undefined
      },
      currentUser
    );

    if (!res.success) {
      setError(res.error || "Failed to register panel");
      return;
    }

    onSuccess();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400">
              <Plus size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {isAmharic ? "አዲስ ቋሚ የፓነል መለያ መዝግብ" : "Register Permanent Panel Identity"}
              </h3>
              <p className="text-[11px] text-slate-400">
                {isAmharic ? "ልዩ ሲሪያል፣ QR እና ባርኮድ አመንጪ" : "Unique Serial, QR Code, and Barcode Generator"}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-red-950/70 border border-red-800 text-red-300 rounded-lg flex items-start space-x-2">
              <AlertTriangle size={15} className="shrink-0 mt-0.5 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Category & Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-slate-400 block mb-1 font-bold">
                {isAmharic ? "የፓነል ምድብ (Category) *" : "Panel Category *"}
              </label>
              <select
                value={panelCategory}
                onChange={(e) => handleCategoryChange(e.target.value as StandardPanelCategory)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-medium focus:border-red-500"
              >
                {STANDARD_PANEL_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 block mb-1 font-bold">
                {isAmharic ? "የፓነል ኮድ (Panel Code) *" : "Panel Code *"}
              </label>
              <input
                type="text"
                required
                value={panelCode}
                onChange={(e) => setPanelCode(e.target.value)}
                placeholder="e.g. IWP-1200-600"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:border-red-500"
              />
            </div>
          </div>

          {/* Serial Number & QR Code Preview */}
          <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-xl space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1 font-bold">
                  {isAmharic ? "ልዩ ሲሪያል ቁጥር (Unique Serial) *" : "Permanent Serial Number *"}
                </label>
                <input
                  type="text"
                  required
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  placeholder="e.g. AL-001245"
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-white font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1 font-bold">
                  Manufacturer OEM
                </label>
                <input
                  type="text"
                  value={manufacturer}
                  onChange={(e) => setManufacturer(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-white"
                />
              </div>
            </div>

            <div className="pt-2 text-[10px] text-slate-500 flex items-center space-x-1.5">
              <QrCode size={12} className="text-red-400" />
              <span>QR Payload: <strong className="text-slate-300 font-mono">DIGITAL-ERP://PANEL/{serialNumber.toUpperCase()}</strong></span>
            </div>
          </div>

          {/* Configurable Dimensions Selection (Section 2) */}
          <div className="space-y-2">
            <label className="text-[10px] text-slate-400 block font-bold">
              {isAmharic ? "ልኬት ከላይብረሪ ምረጥ (Configured Dimension Library)" : "Select Dimension from Formwork Library"}
            </label>
            <select
              value={selectedDimId}
              onChange={(e) => handleDimensionSelect(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs font-mono"
            >
              {dimensionsLibrary.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.formatted} ({d.category} - {d.name})
                </option>
              ))}
            </select>
          </div>

          {/* Custom Dimension Overrides */}
          <div className="grid grid-cols-4 gap-2">
            <div>
              <label className="text-[10px] text-slate-500 block mb-1">Length (mm)</label>
              <input
                type="number"
                value={customLength}
                onChange={(e) => setCustomLength(parseInt(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 block mb-1">Width (mm)</label>
              <input
                type="number"
                value={customWidth}
                onChange={(e) => setCustomWidth(parseInt(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 block mb-1">Thickness (mm)</label>
              <input
                type="number"
                value={customThickness}
                onChange={(e) => setCustomThickness(parseInt(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 block mb-1">Weight (kg)</label>
              <input
                type="number"
                step="0.1"
                value={weight}
                onChange={(e) => setWeight(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white font-mono"
              />
            </div>
          </div>

          {/* Initial Location & Warehouse */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-slate-400 block mb-1 font-bold">Initial Facility</label>
              <select
                value={warehouseId}
                onChange={(e) => {
                  setWarehouseId(e.target.value);
                  setLocation(e.target.value === "WH-CENTRAL-01" ? "Central Warehouse A → Section B → Rack 01" : "Site Store 01");
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
              >
                <option value="WH-CENTRAL-01">Central Warehouse A</option>
                <option value="STORE-BOL-01">Bole Heights Site Store 01</option>
                <option value="STORE-CMC-01">CMC CBD Site Store 01</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 block mb-1 font-bold">Storage Location Detail</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-medium"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-3 border-t border-slate-800 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
            >
              {isAmharic ? "ሰርዝ" : "Cancel"}
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-red-950/40 cursor-pointer flex items-center space-x-1.5"
            >
              <Plus size={14} />
              <span>{isAmharic ? "መዝግብ እና QR አፍልቅ" : "Register & Generate QR"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
