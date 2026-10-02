import React, { useState, useEffect } from "react";
import { 
  X, 
  Layers, 
  Hash, 
  CheckCircle, 
  AlertTriangle, 
  Plus, 
  QrCode, 
  Scan, 
  MapPin, 
  ShieldCheck, 
  Trash2,
  Sparkles
} from "lucide-react";
import { 
  WarehousePanelTypeEntry, 
  PanelConditionType, 
  PanelInventoryStatus, 
  PanelStorageLocation 
} from "../../types";

interface AddPanelTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: WarehousePanelTypeEntry) => void;
  existingSerials?: string[];
  initialData?: WarehousePanelTypeEntry | null;
  warehouseName: string;
  warehouseId: string;
  isAmharic?: boolean;
}

export const AddPanelTypeModal: React.FC<AddPanelTypeModalProps> = ({
  isOpen,
  onClose,
  onSave,
  existingSerials = [],
  initialData,
  warehouseName,
  warehouseId,
  isAmharic = false
}) => {
  // Basic Information
  const [panelTypeName, setPanelTypeName] = useState(initialData?.panelTypeName || "Wall Panel");
  const [panelCode, setPanelCode] = useState(initialData?.panelCode || "WP-600-2400");
  const [panelCategory, setPanelCategory] = useState<WarehousePanelTypeEntry["panelCategory"]>(
    initialData?.panelCategory || "Wall"
  );
  const [description, setDescription] = useState(initialData?.description || "");

  // Dimensions
  const [length, setLength] = useState<number>(initialData?.dimension.length || 2400);
  const [width, setWidth] = useState<number>(initialData?.dimension.width || 600);
  const [heightThickness, setHeightThickness] = useState<number>(initialData?.dimension.heightThickness || 65);
  const [unit, setUnit] = useState<"mm" | "m">(initialData?.dimension.unit || "mm");

  // Condition
  const [condition, setCondition] = useState<PanelConditionType>(initialData?.condition || "Good");

  // Serial Management
  const [serialMode, setSerialMode] = useState<"Range" | "Individual">(initialData?.serialMode || "Range");
  const [serialPrefix, setSerialPrefix] = useState(initialData?.serialPrefix || "WP");
  const [startNum, setStartNum] = useState(initialData?.serialRangeStart || "001");
  const [endNum, setEndNum] = useState(initialData?.serialRangeEnd || "050");
  const [individualInput, setIndividualInput] = useState(
    initialData?.individualSerialNumbers.join("\n") || ""
  );

  // Generator & Confirmation modal
  const [showConfirmGenerated, setShowConfirmGenerated] = useState(false);
  const [tempGeneratedList, setTempGeneratedList] = useState<string[]>([]);

  // Quantity
  const [quantity, setQuantity] = useState<number>(initialData?.quantity || 50);

  // Storage Location
  const [section, setSection] = useState(initialData?.location.section || "Section A");
  const [row, setRow] = useState(initialData?.location.row || "Row 01");
  const [rack, setRack] = useState(initialData?.location.rack || "Rack 01");
  const [bay, setBay] = useState(initialData?.location.bay || "Bay 01");
  const [stack, setStack] = useState(initialData?.location.stack || "Stack 01");
  const [bin, setBin] = useState(initialData?.location.bin || "Bin A1");

  // Status & Financials
  const [status, setStatus] = useState<PanelInventoryStatus>(initialData?.status || "Available");
  const [unitCostEtb, setUnitCostEtb] = useState<number>(initialData?.unitCostEtb || 4200);

  // Formatted string computations
  const formattedDimension = `${width} × ${length} ${unit}${heightThickness ? ` (${heightThickness}${unit} profile)` : ""}`;
  const formattedLocation = `${section}${rack ? ` → ${rack}` : ""}${bay ? ` → ${bay}` : ""}${row ? ` → ${row}` : ""}${stack ? ` → ${stack}` : ""}${bin ? ` (${bin})` : ""}`;

  // Auto-sync code prefix when panel type changes
  useEffect(() => {
    if (!initialData) {
      if (panelTypeName.toLowerCase().includes("wall")) {
        setPanelCode(`WP-${width}-${length}`);
        setSerialPrefix("WP");
        setPanelCategory("Wall");
      } else if (panelTypeName.toLowerCase().includes("slab")) {
        setPanelCode(`SP-${width}-${length}`);
        setSerialPrefix("SP");
        setPanelCategory("Slab");
      } else if (panelTypeName.toLowerCase().includes("corner")) {
        setPanelCode(`CP-${width}-${length}`);
        setSerialPrefix("CP");
        setPanelCategory("Corner");
      } else if (panelTypeName.toLowerCase().includes("column")) {
        setPanelCode(`COL-${width}-${length}`);
        setSerialPrefix("COL");
        setPanelCategory("Column");
      } else if (panelTypeName.toLowerCase().includes("deck")) {
        setPanelCode(`DP-${width}-${length}`);
        setSerialPrefix("DP");
        setPanelCategory("Deck");
      } else if (panelTypeName.toLowerCase().includes("beam")) {
        setPanelCode(`BP-${width}-${length}`);
        setSerialPrefix("BP");
        setPanelCategory("Beam");
      }
    }
  }, [panelTypeName, width, length, initialData]);

  // Parse individual serial numbers from textarea
  const parsedIndividualSerials = individualInput
    .split(/[\n,]+/)
    .map(s => s.trim().toUpperCase())
    .filter(s => s.length > 0);

  // Check for duplicates
  const internalDuplicates = parsedIndividualSerials.filter(
    (item, index) => parsedIndividualSerials.indexOf(item) !== index
  );
  const externalDuplicates = parsedIndividualSerials.filter(
    s => existingSerials.includes(s) && !initialData?.individualSerialNumbers.includes(s)
  );

  // Validation
  const hasDuplicateError = internalDuplicates.length > 0 || externalDuplicates.length > 0;
  const isIndividualCountMismatch = serialMode === "Individual" && parsedIndividualSerials.length !== quantity;

  // Handle Automatic Serial Generation
  const handleGenerateSerials = () => {
    const sInt = parseInt(startNum, 10);
    const eInt = parseInt(endNum, 10);
    if (isNaN(sInt) || isNaN(eInt) || eInt < sInt) {
      alert(isAmharic ? "እባክዎን ትክክለኛ መነሻ እና መድረሻ ቁጥር ያስገቡ።" : "Please enter a valid starting and ending number range.");
      return;
    }
    const padLength = Math.max(startNum.length, endNum.length, 3);
    const generated: string[] = [];
    for (let i = sInt; i <= eInt; i++) {
      const padded = String(i).padStart(padLength, "0");
      generated.push(`${serialPrefix.trim().toUpperCase()}-${padded}`);
    }
    setTempGeneratedList(generated);
    setShowConfirmGenerated(true);
  };

  const handleConfirmGenerated = () => {
    setIndividualInput(tempGeneratedList.join("\n"));
    setQuantity(tempGeneratedList.length);
    setSerialMode("Range");
    setShowConfirmGenerated(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (quantity <= 0) {
      alert(isAmharic ? "ብዛት ከዜሮ በላይ መሆን አለበት።" : "Quantity must be greater than zero.");
      return;
    }

    if (serialMode === "Individual" && isIndividualCountMismatch) {
      alert(
        isAmharic 
          ? `የተመዘገቡት የሴሪያል ቁጥሮች ብዛት (${parsedIndividualSerials.length}) ከተጠቀሰው ፓነል ብዛት (${quantity}) ጋር እኩል አይደለም!`
          : `Serial number count (${parsedIndividualSerials.length}) does not match panel quantity (${quantity}). Please resolve discrepancy.`
      );
      return;
    }

    if (hasDuplicateError) {
      alert(isAmharic ? "የተደጋገሙ የሴሪያል ቁጥሮች ተገኝተዋል! እባክዎን ያስተካክሉ።" : "Duplicate serial numbers detected! Please fix before submitting.");
      return;
    }

    const rangeFormatted = serialMode === "Range" 
      ? `${serialPrefix}-${startNum}–${serialPrefix}-${endNum}`
      : `${parsedIndividualSerials[0] || ""}...${parsedIndividualSerials[parsedIndividualSerials.length - 1] || ""}`;

    const locationObj: PanelStorageLocation = {
      warehouse: warehouseName,
      section,
      row,
      rack,
      bay,
      stack,
      bin,
      formattedLocation
    };

    const entry: WarehousePanelTypeEntry = {
      id: initialData?.id || `PT-${Date.now().toString().slice(-6)}`,
      warehouseId,
      warehouseName,
      panelTypeName,
      panelCode: panelCode.trim().toUpperCase(),
      panelCategory,
      description,
      dimension: {
        length: Number(length),
        width: Number(width),
        heightThickness: Number(heightThickness),
        unit,
        formatted: formattedDimension
      },
      condition,
      serialMode,
      serialPrefix: serialPrefix.trim().toUpperCase(),
      serialRangeStart: startNum,
      serialRangeEnd: endNum,
      serialRangeFormatted: rangeFormatted,
      individualSerialNumbers: serialMode === "Individual" ? parsedIndividualSerials : tempGeneratedList.length ? tempGeneratedList : [rangeFormatted],
      quantity: Number(quantity),
      location: locationObj,
      status,
      unitCostEtb: Number(unitCostEtb),
      qrCodePayload: `ERP-PANEL:${panelCode}:${rangeFormatted}:${warehouseName}:${formattedLocation}`,
      barcode: `BC-${panelCode.replace(/[^A-Z0-9]/gi, "")}-${quantity}`,
      updatedAt: new Date().toISOString().split("T")[0]
    };

    onSave(entry);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fadeIn overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full my-6 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex justify-between items-center shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-500/10 rounded-2xl border border-amber-500/30 text-amber-400">
              <Layers size={22} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-wider">
                {initialData 
                  ? (isAmharic ? "የአሉሚኒየም ፓነል ዓይነት ማስተካከያ" : "Edit Aluminum Formwork Panel Type")
                  : (isAmharic ? "አዲስ የአሉሚኒየም ፎርምወርክ ፓነል ዓይነት መመዝገቢያ" : "Add Aluminum Formwork Panel Type")}
              </h3>
              <p className="text-xs text-slate-400">
                {isAmharic ? `ለመጋዘን፡ ${warehouseName}` : `Target Warehouse: ${warehouseName} (${warehouseId})`}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 cursor-pointer transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6 overflow-y-auto text-xs text-slate-200">
          {/* SECTION 1: BASIC INFORMATION */}
          <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span className="font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Layers size={14} />
                <span>1. Basic Panel Information (የፓነል መሰረታዊ መረጃ)</span>
              </span>
              <span className="text-[10px] font-mono text-slate-500">Structured Type Spec</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-slate-400 block mb-1 font-bold">
                  {isAmharic ? "የፓነል ዓይነት ስም" : "Panel Type Name"} *
                </label>
                <select
                  value={panelTypeName}
                  onChange={e => setPanelTypeName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500"
                >
                  <option value="Wall Panel">Wall Panel (የግድግዳ ፓነል)</option>
                  <option value="Slab Panel">Slab Panel (የስላብ / የወለል ፓነል)</option>
                  <option value="Corner Panel">Corner Panel (የማዕዘን ፓነል / IC-OC)</option>
                  <option value="Column Panel">Column Panel (የአምድ ፓነል)</option>
                  <option value="Deck Panel">Deck Panel (የዴክ ፓነል)</option>
                  <option value="Beam Panel">Beam Panel (የቢም ፓነል)</option>
                  <option value="Kicker / Rocker">Kicker / Rocker (ኪከር)</option>
                  <option value="Soffit Panel">Soffit Panel (ሶፊት ፓነል)</option>
                  <option value="Stair Panel">Stair Panel (የደረጃ ፓነል)</option>
                  <option value="Special Profile">Special Profile (ልዩ ፕሮፋይል)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-bold">
                  {isAmharic ? "የፓነል ኮድ" : "Panel Code"} *
                </label>
                <input
                  type="text"
                  required
                  value={panelCode}
                  onChange={e => setPanelCode(e.target.value)}
                  placeholder="e.g. WP-600-2400"
                  className="w-full bg-slate-900 border border-slate-800 text-amber-400 font-mono font-bold rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-bold">
                  {isAmharic ? "ምድብ (Category)" : "Category"}
                </label>
                <select
                  value={panelCategory}
                  onChange={e => setPanelCategory(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500"
                >
                  <option value="Wall">Wall Formwork</option>
                  <option value="Slab">Slab Formwork</option>
                  <option value="Corner">Corner Connection</option>
                  <option value="Column">Column Shuttering</option>
                  <option value="Beam">Beam Bottom & Side</option>
                  <option value="Deck">Deck Formwork</option>
                  <option value="Accessory">Formwork Accessory</option>
                  <option value="Special">Special Fabrication</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-slate-400 block mb-1 font-bold">
                {isAmharic ? "መግለጫ / ማብራሪያ" : "Description / Specifications"}
              </label>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="High-tensile alloy 6061-T6, 4.0mm face sheet, robot-welded ribs..."
                className="w-full bg-slate-900 border border-slate-800 text-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* SECTION 2: DIMENSIONS & CONDITION */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Dimensions */}
            <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-3">
              <span className="font-black text-cyan-400 uppercase tracking-wider block">
                2. Dimensions (መጠኖች)
              </span>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1 font-mono text-[10px]">Width (ስፋት)</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={width}
                    onChange={e => setWidth(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 text-white font-mono rounded-xl px-2.5 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 font-mono text-[10px]">Length (ርዝመት)</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={length}
                    onChange={e => setLength(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 text-white font-mono rounded-xl px-2.5 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 font-mono text-[10px]">Thickness / Profile</label>
                  <input
                    type="number"
                    min={0}
                    value={heightThickness}
                    onChange={e => setHeightThickness(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 text-white font-mono rounded-xl px-2.5 py-1.5 text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-[11px]">Unit:</span>
                  <button
                    type="button"
                    onClick={() => setUnit("mm")}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${unit === "mm" ? "bg-cyan-600 text-white" : "bg-slate-800 text-slate-400"}`}
                  >
                    mm
                  </button>
                  <button
                    type="button"
                    onClick={() => setUnit("m")}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${unit === "m" ? "bg-cyan-600 text-white" : "bg-slate-800 text-slate-400"}`}
                  >
                    meters (m)
                  </button>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">Formatted Display:</span>
                  <span className="font-mono font-black text-cyan-300 text-xs">{formattedDimension}</span>
                </div>
              </div>
            </div>

            {/* Condition & Status */}
            <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-3">
              <span className="font-black text-emerald-400 uppercase tracking-wider block">
                3. Condition & Status (ሁኔታ)
              </span>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1 font-bold">
                    {isAmharic ? "የፓነል ሁኔታ" : "Panel Condition"} *
                  </label>
                  <select
                    value={condition}
                    onChange={e => setCondition(e.target.value as PanelConditionType)}
                    className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500 font-bold"
                  >
                    <option value="New">New (አዲስ)</option>
                    <option value="Good">Good (ጥሩ ሁኔታ)</option>
                    <option value="Used">Used (ጥቅም ላይ የዋለ)</option>
                    <option value="Damaged">Damaged (የተጎዳ)</option>
                    <option value="Under Repair">Under Repair (በጥገና ላይ)</option>
                    <option value="Unusable">Unusable (ከጥቅም ውጪ)</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 font-bold">
                    {isAmharic ? "የክምችት ሁኔታ" : "Inventory Status"}
                  </label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as PanelInventoryStatus)}
                    className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500 font-bold"
                  >
                    <option value="Available">Available (ዝግጁ)</option>
                    <option value="Reserved">Reserved (የተያዘ)</option>
                    <option value="Issued">Issued (ወጪ የተደረገ)</option>
                    <option value="Installed">Installed (የተገጠመ)</option>
                    <option value="In Transit">In Transit (በጉዞ ላይ)</option>
                    <option value="Returned">Returned (የተመለሰ)</option>
                    <option value="Damaged">Damaged (የተጎዳ)</option>
                    <option value="Under Repair">Under Repair (በጥገና)</option>
                    <option value="Missing">Missing (የጠፋ)</option>
                    <option value="Unusable">Unusable (የማያገለግል)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-mono text-[10px]">
                  Estimated Unit Value (ETB)
                </label>
                <input
                  type="number"
                  value={unitCostEtb}
                  onChange={e => setUnitCostEtb(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 text-emerald-400 font-mono font-bold rounded-xl px-3 py-2 text-xs"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: SERIAL NUMBER MANAGEMENT & QUANTITY */}
          <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
              <span className="font-black text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                <Hash size={14} />
                <span>4. Serial Numbers & Quantity (ሴሪያል ቁጥሮች እና ብዛት)</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSerialMode("Range")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    serialMode === "Range" ? "bg-purple-600 text-white shadow" : "bg-slate-900 text-slate-400 hover:text-white"
                  }`}
                >
                  Mode A: Serial Range
                </button>
                <button
                  type="button"
                  onClick={() => setSerialMode("Individual")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    serialMode === "Individual" ? "bg-purple-600 text-white shadow" : "bg-slate-900 text-slate-400 hover:text-white"
                  }`}
                >
                  Mode B: Individual Serials
                </button>
              </div>
            </div>

            {/* Quantity Input */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center bg-slate-900/60 p-3 rounded-xl border border-slate-800">
              <div className="sm:col-span-2">
                <label className="text-white block mb-0.5 font-black text-xs">
                  {isAmharic ? "የዚህ ፓነል ዓይነት ጠቅላላ ብዛት (Panel Quantity)" : "Total Quantity for this Panel Type"} *
                </label>
                <p className="text-[10px] text-slate-400">
                  {isAmharic 
                    ? "ይህ ቁጥር ለመጋዘኑ ጠቅላላ የፓነል ብዛት (Total Panel Quantity) በራስ-ሰር ይሰላል።"
                    : "Numeric value > 0. Automatically added to Total Warehouse Panels count."}
                </p>
              </div>
              <div>
                <input
                  type="number"
                  min={1}
                  required
                  value={quantity}
                  onChange={e => setQuantity(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-purple-500/50 text-purple-300 font-mono font-black text-base rounded-xl px-3 py-2 text-right focus:outline-none focus:border-purple-400"
                />
              </div>
            </div>

            {/* Mode A: Serial Range Generator */}
            {serialMode === "Range" && (
              <div className="space-y-3 bg-purple-950/20 p-3.5 rounded-xl border border-purple-800/40">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-300">
                    Range Generator: Prefix + Start Number + End Number
                  </span>
                  <span className="text-[10px] font-mono text-purple-400">
                    Preview: {serialPrefix}-{startNum} → {serialPrefix}-{endNum}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-mono">Prefix</label>
                    <input
                      type="text"
                      value={serialPrefix}
                      onChange={e => setSerialPrefix(e.target.value)}
                      placeholder="e.g. WP"
                      className="w-full bg-slate-950 border border-slate-800 text-white font-mono uppercase font-bold rounded-xl px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-mono">Starting Number</label>
                    <input
                      type="text"
                      value={startNum}
                      onChange={e => setStartNum(e.target.value)}
                      placeholder="001"
                      className="w-full bg-slate-950 border border-slate-800 text-white font-mono rounded-xl px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-mono">Ending Number</label>
                    <input
                      type="text"
                      value={endNum}
                      onChange={e => setEndNum(e.target.value)}
                      placeholder="050"
                      className="w-full bg-slate-950 border border-slate-800 text-white font-mono rounded-xl px-3 py-2 text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleGenerateSerials}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-black rounded-xl cursor-pointer flex items-center gap-1.5 shadow transition"
                  >
                    <Sparkles size={14} />
                    <span>Generate Serial Numbers</span>
                  </button>
                </div>
              </div>
            )}

            {/* Mode B: Individual Serial Numbers */}
            {serialMode === "Individual" && (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-300 font-bold">
                    Enter Individual Serials (one per line or comma-separated):
                  </span>
                  <span className={`font-mono text-xs font-black ${
                    parsedIndividualSerials.length === quantity ? "text-emerald-400" : "text-amber-400"
                  }`}>
                    Entered: {parsedIndividualSerials.length} / Required: {quantity}
                  </span>
                </div>

                <textarea
                  rows={4}
                  value={individualInput}
                  onChange={e => setIndividualInput(e.target.value)}
                  placeholder={`WP-0001\nWP-0002\nWP-0003\n...`}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 font-mono text-xs rounded-xl p-3 focus:outline-none focus:border-purple-500 leading-relaxed"
                />

                {/* Validation Warnings */}
                {isIndividualCountMismatch && (
                  <div className="p-2.5 bg-amber-950/40 border border-amber-500/40 rounded-xl text-amber-300 text-xs flex items-center gap-2">
                    <AlertTriangle size={16} className="text-amber-400 shrink-0" />
                    <span>
                      {isAmharic
                        ? `የሴሪያል ቁጥሮች ብዛት (${parsedIndividualSerials.length}) ከተጠቀሰው ፓነል ብዛት (${quantity}) ጋር እኩል አይደለም።`
                        : `Serial number count (${parsedIndividualSerials.length}) does not match panel quantity (${quantity}).`}
                    </span>
                  </div>
                )}

                {hasDuplicateError && (
                  <div className="p-2.5 bg-rose-950/40 border border-rose-500/40 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                    <AlertTriangle size={16} className="text-rose-400 shrink-0" />
                    <span>
                      Duplicate serials detected: {[...internalDuplicates, ...externalDuplicates].join(", ")}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SECTION 4: STORAGE LOCATION HIERARCHY */}
          <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span className="font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin size={14} />
                <span>5. Warehouse Storage Location (የማከማቻ ቦታ አድራሻ)</span>
              </span>
              <span className="font-mono text-xs text-amber-300 font-bold">{formattedLocation}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs">
              <div>
                <label className="text-slate-400 block mb-1 font-mono text-[10px]">Section</label>
                <input
                  type="text"
                  required
                  value={section}
                  onChange={e => setSection(e.target.value)}
                  placeholder="Section A"
                  className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-2.5 py-1.5 font-mono text-xs"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1 font-mono text-[10px]">Rack</label>
                <input
                  type="text"
                  value={rack}
                  onChange={e => setRack(e.target.value)}
                  placeholder="Rack 03"
                  className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-2.5 py-1.5 font-mono text-xs"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1 font-mono text-[10px]">Bay</label>
                <input
                  type="text"
                  value={bay}
                  onChange={e => setBay(e.target.value)}
                  placeholder="Bay 02"
                  className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-2.5 py-1.5 font-mono text-xs"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1 font-mono text-[10px]">Row</label>
                <input
                  type="text"
                  value={row}
                  onChange={e => setRow(e.target.value)}
                  placeholder="Row 01"
                  className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-2.5 py-1.5 font-mono text-xs"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1 font-mono text-[10px]">Stack</label>
                <input
                  type="text"
                  value={stack}
                  onChange={e => setStack(e.target.value)}
                  placeholder="Stack 01"
                  className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-2.5 py-1.5 font-mono text-xs"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1 font-mono text-[10px]">Bin</label>
                <input
                  type="text"
                  value={bin}
                  onChange={e => setBin(e.target.value)}
                  placeholder="Bin A1"
                  className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-2.5 py-1.5 font-mono text-xs"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold cursor-pointer transition"
            >
              {isAmharic ? "ሰርዝ" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={hasDuplicateError || (serialMode === "Individual" && isIndividualCountMismatch)}
              className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider cursor-pointer shadow-lg transition flex items-center gap-2"
            >
              <CheckCircle size={16} />
              <span>{initialData ? (isAmharic ? "ለውጡን አጽድቅ" : "Save Changes") : (isAmharic ? "ፓነሉን በሰንጠረዡ ጨምር" : "Add Panel Type to Inventory")}</span>
            </button>
          </div>
        </form>
      </div>

      {/* CONFIRM GENERATED SERIAL NUMBERS PREVIEW MODAL */}
      {showConfirmGenerated && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-purple-500/50 rounded-2xl max-w-md w-full p-5 space-y-4 animate-scaleUp text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-black text-sm text-purple-400 uppercase">
                Confirm Generated Serial Numbers
              </span>
              <span className="text-xs font-mono text-purple-300">
                Total: {tempGeneratedList.length} Serials
              </span>
            </div>

            <p className="text-xs text-slate-400">
              The following {tempGeneratedList.length} serial numbers will be generated and assigned to this panel type:
            </p>

            <div className="max-h-52 overflow-y-auto bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-xs space-y-1">
              {tempGeneratedList.map((sn, idx) => (
                <div key={sn} className="flex justify-between py-0.5 border-b border-slate-900 text-slate-300">
                  <span className="text-slate-500 text-[10px]">#{idx + 1}</span>
                  <span className="font-bold text-purple-300">{sn}</span>
                  <span className="text-emerald-400 text-[10px]">Valid</span>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmGenerated(false)}
                className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmGenerated}
                className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-black cursor-pointer shadow"
              >
                Confirm & Apply ({tempGeneratedList.length} Panels)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
