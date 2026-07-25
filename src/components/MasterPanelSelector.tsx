import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  MASTER_PANEL_DATABASE,
  MASTER_CATEGORIES,
  MASTER_WIDTHS,
  MASTER_HEIGHTS,
  MasterPanelRecord,
} from "../data/panelMasterDatabase";
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Layers,
  Ruler,
  Weight,
  Barcode,
  QrCode,
  ShieldCheck,
  Building,
  Wrench,
  PackageCheck,
  Plus,
  RefreshCw,
  ChevronDown,
  Info,
} from "lucide-react";

export interface MasterPanelSelectorResult {
  panelId: string;
  category: string;
  panelType: string;
  panelName: string;
  description: string;
  widthMm: number;
  heightMm: number;
  thicknessMm: number;
  areaM2: number;
  weightKg: number;
  material: string;
  surfaceFinish: string;
  manufacturer: string;
  bundleQuantity: number;
  bundleWeightKg: number;
  panelCode: string;
  barcode: string;
  qrCode: string;
  serialNumber: string;
  status: string;
  compatibleAccessories: string;
  notes: string;
  isDuplicate: boolean;
}

interface MasterPanelSelectorProps {
  onSelectPanel: (panel: MasterPanelSelectorResult) => void;
  existingPanelCodes?: string[];
  existingSerials?: string[];
  isAmharic?: boolean;
  currentUserRole?: string;
  currentUserName?: string;
  showAdminAddOption?: boolean;
}

export const MasterPanelSelector: React.FC<MasterPanelSelectorProps> = ({
  onSelectPanel,
  existingPanelCodes = [],
  existingSerials = [],
  isAmharic = false,
  currentUserRole = "Head Office",
  currentUserName = "Nuriye Ahmed Adem",
  showAdminAddOption = true,
}) => {
  // 4-Step state
  const [selectedCategory, setSelectedCategory] = useState<string>("Internal Wall Panels");
  const [selectedPanelType, setSelectedPanelType] = useState<string>("Standard Internal Wall Panel");
  const [selectedWidth, setSelectedWidth] = useState<number>(450);
  const [selectedHeight, setSelectedHeight] = useState<number>(2400);

  // Search terms for searchable dropdowns
  const [categorySearch, setCategorySearch] = useState<string>("");
  const [typeSearch, setTypeSearch] = useState<string>("");
  const [widthSearch, setWidthSearch] = useState<string>("");
  const [heightSearch, setHeightSearch] = useState<string>("");

  // Dropdown open toggles
  const [openStep, setOpenStep] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close step dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpenStep(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Serial number customization
  const [customSerial, setCustomSerial] = useState<string>("");

  // Admin Custom Modal State
  const [showAdminAddModal, setShowAdminAddModal] = useState<boolean>(false);
  const [customCategoryName, setCustomCategoryName] = useState<string>("Internal Wall Panels");
  const [customPanelTypeName, setCustomPanelTypeName] = useState<string>("");
  const [customWidth, setCustomWidth] = useState<number>(450);
  const [customHeight, setCustomHeight] = useState<number>(2400);
  const [customThickness, setCustomThickness] = useState<number>(65);
  const [customMfr, setCustomMfr] = useState<string>("Geto Aluminum Formwork Co.");

  // Dynamic custom panels added in current session
  const [customPanels, setCustomPanels] = useState<MasterPanelRecord[]>([]);

  // Combined Master Database
  const combinedDatabase = useMemo(() => {
    return [...MASTER_PANEL_DATABASE, ...customPanels];
  }, [customPanels]);

  // Step 1: Categories list (Sorted)
  const availableCategories = useMemo(() => {
    const cats = Array.from(new Set(combinedDatabase.map((p) => p.category)));
    return cats
      .filter((c) => String(c).toLowerCase().includes(categorySearch.toLowerCase()))
      .sort();
  }, [combinedDatabase, categorySearch]);

  // Step 2: Available Panel Types for selected category
  const availablePanelTypes = useMemo(() => {
    if (!selectedCategory) return [];
    const filtered = combinedDatabase.filter((p) => p.category === selectedCategory);
    const types = Array.from(new Set(filtered.map((p) => p.panelType || p.panelName)));
    return types
      .filter((t) => String(t).toLowerCase().includes(typeSearch.toLowerCase()))
      .sort();
  }, [combinedDatabase, selectedCategory, typeSearch]);

  // Step 3: Available Widths for selected category
  const availableWidths = useMemo(() => {
    return Array.from(MASTER_WIDTHS)
      .filter((w) => String(w).includes(widthSearch))
      .sort((a, b) => a - b);
  }, [widthSearch]);

  // Step 4: Available Heights for selected category & width
  const availableHeights = useMemo(() => {
    return Array.from(MASTER_HEIGHTS)
      .filter((h) => String(h).includes(heightSearch))
      .sort((a, b) => a - b);
  }, [heightSearch]);

  // Auto-fill active panel specification record matching selection
  const matchedPanelRecord = useMemo<MasterPanelRecord>(() => {
    // Exact match
    let match = combinedDatabase.find(
      (p) =>
        p.category === selectedCategory &&
        (p.panelType === selectedPanelType || p.panelName === selectedPanelType) &&
        p.widthMm === selectedWidth &&
        p.heightMm === selectedHeight
    );

    if (!match) {
      match = combinedDatabase.find(
        (p) => p.category === selectedCategory && p.widthMm === selectedWidth && p.heightMm === selectedHeight
      );
    }

    if (!match) {
      match = combinedDatabase.find((p) => p.category === selectedCategory);
    }

    if (!match) {
      match = combinedDatabase[0];
    }

    // Dynamic calculated values
    const width = selectedWidth || match.widthMm;
    const height = selectedHeight || match.heightMm;
    const areaM2 = parseFloat(((width * height) / 1000000).toFixed(4));
    const weightKg = parseFloat(Math.max(1.2, areaM2 * 19.8).toFixed(2));
    
    let bundleQty = 20;
    if (areaM2 < 0.2) bundleQty = 50;
    else if (areaM2 < 0.5) bundleQty = 30;
    else if (areaM2 < 1.0) bundleQty = 20;
    else bundleQty = 12;

    const prefix = selectedCategory === "Internal Wall Panels" ? "IWP" : selectedCategory === "External Wall Panels" ? "EWP" : selectedCategory.includes("Stair") ? "ST" : match.panelCode ? match.panelCode.split("-")[0] : "AP";
    const calculatedCode = `${prefix}-${width}x${height}`;
    const calculatedName = `${selectedCategory.replace(" Panels", "")} Panel ${width}x${height} mm`;

    let desc = match.description || `Standard ${selectedCategory} formwork panel ${width}x${height} mm`;
    if (selectedCategory === "Internal Wall Panels") {
      desc = `Internal wall formwork panel ${width}x${height} mm (${selectedPanelType}) for interior partition walls, corridors, and shear core concrete structures.`;
    } else if (selectedCategory === "External Wall Panels") {
      desc = `Heavy-duty exterior wall formwork panel ${width}x${height} mm (${selectedPanelType}) for perimeter building envelopes, exterior shear walls, and weather-facing concrete casting.`;
    } else if (selectedCategory.includes("Stair")) {
      desc = `Stair formwork element ${width}x${height} mm (${selectedPanelType}) engineered for concrete flight steps, risers, treads, landing platforms, side walls, and waist slabs.`;
    }

    return {
      ...match,
      panelId: match.panelId || `AFP-${prefix}-${width}x${height}`,
      panelType: selectedPanelType || match.panelType || "Standard Panel",
      description: desc,
      widthMm: width,
      heightMm: height,
      areaM2,
      weightKg,
      bundleQuantity: bundleQty,
      bundleWeightKg: parseFloat((weightKg * bundleQty).toFixed(2)),
      panelCode: calculatedCode,
      panelName: calculatedName,
    };
  }, [combinedDatabase, selectedCategory, selectedPanelType, selectedWidth, selectedHeight]);

  // Compute final serial number
  const finalSerialNumber = useMemo(() => {
    if (customSerial.trim()) return customSerial.trim().toUpperCase();
    return matchedPanelRecord.serialNumber || `SN-${matchedPanelRecord.panelCode}`;
  }, [customSerial, matchedPanelRecord]);

  // Duplicate Prevention Check
  const isDuplicate = useMemo(() => {
    const codeMatch = existingPanelCodes.some(
      (c) => c.toLowerCase() === matchedPanelRecord.panelCode.toLowerCase()
    );
    const serialMatch = existingSerials.some(
      (s) => s.toLowerCase() === finalSerialNumber.toLowerCase()
    );
    return codeMatch || serialMatch;
  }, [existingPanelCodes, existingSerials, matchedPanelRecord.panelCode, finalSerialNumber]);

  // Trigger parent update on selection changes
  useEffect(() => {
    const result: MasterPanelSelectorResult = {
      panelId: matchedPanelRecord.panelId,
      category: selectedCategory,
      panelType: matchedPanelRecord.panelType,
      panelName: matchedPanelRecord.panelName,
      description: matchedPanelRecord.description,
      widthMm: matchedPanelRecord.widthMm,
      heightMm: matchedPanelRecord.heightMm,
      thicknessMm: matchedPanelRecord.thicknessMm,
      areaM2: matchedPanelRecord.areaM2,
      weightKg: matchedPanelRecord.weightKg,
      material: matchedPanelRecord.material,
      surfaceFinish: matchedPanelRecord.surfaceFinish,
      manufacturer: matchedPanelRecord.manufacturer,
      bundleQuantity: matchedPanelRecord.bundleQuantity,
      bundleWeightKg: matchedPanelRecord.bundleWeightKg,
      panelCode: matchedPanelRecord.panelCode,
      barcode: matchedPanelRecord.barcode,
      qrCode: matchedPanelRecord.qrCode,
      serialNumber: finalSerialNumber,
      status: matchedPanelRecord.status,
      compatibleAccessories: matchedPanelRecord.compatibleAccessories,
      notes: matchedPanelRecord.notes,
      isDuplicate,
    };

    onSelectPanel(result);
  }, [
    selectedCategory,
    selectedPanelType,
    selectedWidth,
    selectedHeight,
    matchedPanelRecord,
    finalSerialNumber,
    isDuplicate,
  ]);

  // Synchronize initial panel type
  useEffect(() => {
    if (availablePanelTypes.length > 0 && !availablePanelTypes.includes(selectedPanelType)) {
      setSelectedPanelType(availablePanelTypes[0]);
    }
  }, [selectedCategory, availablePanelTypes]);

  // Admin add custom panel submit
  const handleAddCustomPanelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customCategoryName.trim()) return;

    const areaM2 = parseFloat(((customWidth * customHeight) / 1000000).toFixed(4));
    const weightKg = parseFloat(Math.max(1.5, areaM2 * 20.2).toFixed(2));
    const prefix = customCategoryName.substring(0, 3).toUpperCase();
    const newRecord: MasterPanelRecord = {
      panelId: `AFP-CUST-${Date.now().toString().slice(-4)}`,
      panelCode: `${prefix}-${customWidth}x${customHeight}`,
      panelName: `${customCategoryName} Panel ${customWidth}x${customHeight} mm`,
      category: customCategoryName.trim(),
      panelType: customPanelTypeName.trim() || `Custom ${customCategoryName} Panel`,
      description: `Custom ${customCategoryName} panel ${customWidth}x${customHeight} mm designed for modular formwork assemblies.`,
      widthMm: customWidth,
      heightMm: customHeight,
      thicknessMm: 65,
      areaM2,
      weightKg,
      material: "Aluminum Alloy 6061-T6 Structural",
      surfaceFinish: "Anodized Non-Stick Coating",
      compatibleAccessories: "Pin & Wedge, Flat Tie 16mm",
      bundleQuantity: 20,
      bundleWeightKg: parseFloat((weightKg * 20).toFixed(2)),
      barcode: `692026${Math.floor(1000000 + Math.random() * 9000000)}`,
      qrCode: `https://erp.construction.local/qr/panel/CUST-${Date.now()}`,
      serialNumber: `SN-${prefix}-${customWidth}x${customHeight}-${Math.floor(
        100 + Math.random() * 900
      )}`,
      status: "Active Stock",
      manufacturer: customMfr,
      notes: "Admin added custom panel dimension.",
    };

    setCustomPanels((prev) => [newRecord, ...prev]);
    setSelectedCategory(newRecord.category);
    setSelectedWidth(newRecord.widthMm);
    setSelectedHeight(newRecord.heightMm);
    setShowAdminAddModal(false);
    setCustomCategoryName("");
  };

  return (
    <div ref={containerRef} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-5">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="inline-flex items-center space-x-1.5 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-full text-[11px] font-bold text-red-700 mb-1">
            <Sparkles size={12} className="text-amber-500" />
            <span>
              {isAmharic
                ? "የአሉሚኒየም ፎርምወርክ ማስተር መምረጫ (Master Panel Selection Engine)"
                : "Standard Master Selection Engine (2,000+ Worldwide Panels)"}
            </span>
          </div>
          <h2 className="text-base font-extrabold text-slate-900">
            {isAmharic
              ? "የፓነል ካቴጎሪና ስፔስፊኬሽን መምረጫ (4-Step Guided Selection)"
              : "Guided 4-Step Master Panel Selection"}
          </h2>
          <p className="text-slate-500 text-xs">
            {isAmharic
              ? "የፓነል መረጃዎችን በነፃነት መጻፍ አያስፈልግም፤ ከስተንዳርድ መዝገቡ በ4 ደረጃዎች ይምረጡ።"
              : "Zero manual typing required. Select category, name, width, and height to auto-fill complete ERP specs."}
          </p>
        </div>

        {/* Admin Add Custom Panel Trigger */}
        {showAdminAddOption && (
          <button
            type="button"
            onClick={() => setShowAdminAddModal(true)}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1 shadow-sm shrink-0"
          >
            <Plus size={14} className="text-amber-400" />
            <span>{isAmharic ? "➕ አዲስ ፓነል አድሚን ጨምር" : "Admin: Add Custom Specs"}</span>
          </button>
        )}
      </div>

      {/* 4-Step Guided Selection Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        {/* STEP 1: CATEGORY */}
        <div className="space-y-1 relative">
          <label className="block font-bold text-slate-700 flex items-center justify-between">
            <span className="flex items-center space-x-1">
              <span className="w-5 h-5 rounded-full bg-red-600 text-white font-black text-[10px] flex items-center justify-center">
                1
              </span>
              <span>{isAmharic ? "1. ካቴጎሪ ይምረጡ" : "Step 1: Select Category"}</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {availableCategories.length} options
            </span>
          </label>

          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenStep(openStep === 1 ? null : 1)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-left font-bold text-slate-900 flex justify-between items-center focus:ring-2 focus:ring-red-500 focus:bg-white"
            >
              <span className="truncate">{selectedCategory || "Select Category"}</span>
              <ChevronDown size={14} className="text-slate-400 shrink-0" />
            </button>

            {openStep === 1 && (
              <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white border border-slate-200 rounded-xl shadow-xl p-2 space-y-2 max-h-60 overflow-y-auto">
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search Category..."
                    value={categorySearch}
                    onChange={(e) => setCategorySearch(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-2 py-1.5 text-xs text-slate-800 outline-none"
                  />
                </div>
                <div className="divide-y divide-slate-100">
                  {availableCategories.map((cat, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(cat);
                        setOpenStep(null);
                        setCategorySearch("");
                      }}
                      className={`w-full text-left p-2 rounded-lg font-semibold hover:bg-red-50 hover:text-red-700 transition flex items-center justify-between ${
                        selectedCategory === cat ? "bg-red-100 text-red-900 font-bold" : "text-slate-700"
                      }`}
                    >
                      <span>{cat}</span>
                      {selectedCategory === cat && <CheckCircle2 size={13} className="text-red-600" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* STEP 2: PANEL TYPE */}
        <div className="space-y-1 relative">
          <label className="block font-bold text-slate-700 flex items-center justify-between">
            <span className="flex items-center space-x-1">
              <span className="w-5 h-5 rounded-full bg-red-600 text-white font-black text-[10px] flex items-center justify-center">
                2
              </span>
              <span>{isAmharic ? "2. የፓነል አይነት (Panel Type)" : "Step 2: Panel Type"}</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {availablePanelTypes.length} types
            </span>
          </label>

          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenStep(openStep === 2 ? null : 2)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-left font-bold text-slate-900 flex justify-between items-center focus:ring-2 focus:ring-red-500 focus:bg-white"
            >
              <span className="truncate">
                {selectedPanelType || `Standard ${selectedCategory.replace(" Panels", "")}`}
              </span>
              <ChevronDown size={14} className="text-slate-400 shrink-0" />
            </button>

            {openStep === 2 && (
              <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white border border-slate-200 rounded-xl shadow-xl p-2 space-y-2 max-h-60 overflow-y-auto">
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search Panel Type..."
                    value={typeSearch}
                    onChange={(e) => setTypeSearch(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-2 py-1.5 text-xs text-slate-800 outline-none"
                  />
                </div>
                <div className="divide-y divide-slate-100">
                  {availablePanelTypes.length === 0 ? (
                    <div className="p-2 text-slate-400 italic text-center">
                      Standard {selectedCategory} Specification
                    </div>
                  ) : (
                    availablePanelTypes.map((typeName, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setSelectedPanelType(typeName);
                          setOpenStep(null);
                          setTypeSearch("");
                        }}
                        className={`w-full text-left p-2 rounded-lg font-semibold hover:bg-red-50 hover:text-red-700 transition flex items-center justify-between ${
                          selectedPanelType === typeName ? "bg-red-100 text-red-900 font-bold" : "text-slate-700"
                        }`}
                      >
                        <span className="truncate">{typeName}</span>
                        {selectedPanelType === typeName && <CheckCircle2 size={13} className="text-red-600" />}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* STEP 3: WIDTH (MM) */}
        <div className="space-y-1 relative">
          <label className="block font-bold text-slate-700 flex items-center justify-between">
            <span className="flex items-center space-x-1">
              <span className="w-5 h-5 rounded-full bg-red-600 text-white font-black text-[10px] flex items-center justify-center">
                3
              </span>
              <span>{isAmharic ? "3. ስፋት (Width mm)" : "Step 3: Width (mm)"}</span>
            </span>
          </label>

          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenStep(openStep === 3 ? null : 3)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-left font-bold font-mono text-slate-900 flex justify-between items-center focus:ring-2 focus:ring-red-500 focus:bg-white"
            >
              <span>{selectedWidth} mm</span>
              <ChevronDown size={14} className="text-slate-400 shrink-0" />
            </button>

            {openStep === 3 && (
              <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white border border-slate-200 rounded-xl shadow-xl p-2 space-y-2 max-h-60 overflow-y-auto">
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search Width (mm)..."
                    value={widthSearch}
                    onChange={(e) => setWidthSearch(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-2 py-1.5 text-xs text-slate-800 outline-none font-mono"
                  />
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {availableWidths.map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => {
                        setSelectedWidth(w);
                        setOpenStep(null);
                        setWidthSearch("");
                      }}
                      className={`p-2 rounded-lg font-mono font-bold text-center hover:bg-red-50 hover:text-red-700 transition border ${
                        selectedWidth === w
                          ? "bg-red-600 text-white border-red-600"
                          : "bg-slate-50 border-slate-200 text-slate-800"
                      }`}
                    >
                      {w} mm
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* STEP 4: HEIGHT (MM) */}
        <div className="space-y-1 relative">
          <label className="block font-bold text-slate-700 flex items-center justify-between">
            <span className="flex items-center space-x-1">
              <span className="w-5 h-5 rounded-full bg-red-600 text-white font-black text-[10px] flex items-center justify-center">
                4
              </span>
              <span>{isAmharic ? "4. ቁመት (Height mm)" : "Step 4: Height (mm)"}</span>
            </span>
          </label>

          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenStep(openStep === 4 ? null : 4)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-left font-bold font-mono text-slate-900 flex justify-between items-center focus:ring-2 focus:ring-red-500 focus:bg-white"
            >
              <span>{selectedHeight} mm</span>
              <ChevronDown size={14} className="text-slate-400 shrink-0" />
            </button>

            {openStep === 4 && (
              <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white border border-slate-200 rounded-xl shadow-xl p-2 space-y-2 max-h-60 overflow-y-auto">
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search Height (mm)..."
                    value={heightSearch}
                    onChange={(e) => setHeightSearch(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-2 py-1.5 text-xs text-slate-800 outline-none font-mono"
                  />
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {availableHeights.map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => {
                        setSelectedHeight(h);
                        setOpenStep(null);
                        setHeightSearch("");
                      }}
                      className={`p-2 rounded-lg font-mono font-bold text-center hover:bg-red-50 hover:text-red-700 transition border ${
                        selectedHeight === h
                          ? "bg-red-600 text-white border-red-600"
                          : "bg-slate-50 border-slate-200 text-slate-800"
                      }`}
                    >
                      {h} mm
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AUTO-FILLED PANEL SPECIFICATION CARD & DUPLICATE VERIFICATION */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-red-950 text-white rounded-xl p-4 shadow-md space-y-3 border border-slate-800">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-700/60 pb-3">
          <div>
            <span className="text-[10px] uppercase tracking-wider font-extrabold text-red-400 block">
              Auto-Calculated Master Specification
            </span>
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-black text-amber-400">
                {matchedPanelRecord.panelCode}
              </h3>
              <span className="text-xs font-semibold text-slate-300">
                ({matchedPanelRecord.panelName})
              </span>
            </div>
          </div>

          {/* Duplicate Verification Status Tag */}
          <div>
            {isDuplicate ? (
              <span className="inline-flex items-center space-x-1.5 bg-red-600/90 text-white border border-red-400 px-3 py-1 rounded-full text-xs font-bold shadow-sm animate-pulse">
                <AlertTriangle size={14} className="text-yellow-300" />
                <span>
                  {isAmharic ? "⚠️ ማስጠንቀቂያ፦ ይህ ሲሪያል አስቀድሞ ተመዝግቧል!" : "⚠️ Duplicate Detected in ERP"}
                </span>
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1.5 bg-emerald-900/80 text-emerald-200 border border-emerald-700 px-3 py-1 rounded-full text-xs font-bold">
                <CheckCircle2 size={14} className="text-emerald-400" />
                <span>
                  {isAmharic ? "✓ የተረጋገጠ አዲስ ፓነል (Unique Verified)" : "✓ Unique Spec Verified"}
                </span>
              </span>
            )}
          </div>
        </div>

        {/* Auto-filled Attributes Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/70">
            <span className="text-[10px] text-slate-400 font-bold block uppercase">
              Area (m²)
            </span>
            <span className="text-sm font-mono font-black text-emerald-400">
              {matchedPanelRecord.areaM2.toFixed(4)} m²
            </span>
          </div>

          <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/70">
            <span className="text-[10px] text-slate-400 font-bold block uppercase">
              Unit Weight
            </span>
            <span className="text-sm font-mono font-black text-amber-300">
              {matchedPanelRecord.weightKg} kg
            </span>
          </div>

          <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/70">
            <span className="text-[10px] text-slate-400 font-bold block uppercase">
              Standard Bundle
            </span>
            <span className="text-sm font-mono font-bold text-white">
              {matchedPanelRecord.bundleQuantity} pcs ({matchedPanelRecord.bundleWeightKg} kg)
            </span>
          </div>

          <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/70">
            <span className="text-[10px] text-slate-400 font-bold block uppercase">
              Extrusion Profile
            </span>
            <span className="text-xs font-bold text-slate-200">
              {matchedPanelRecord.thicknessMm}mm Depth • 6061-T6
            </span>
          </div>
        </div>

        {/* Secondary Specs & Serial Input */}
        <div className="pt-2 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-[10px] text-slate-400 font-bold block mb-1">
              {isAmharic ? "አምራችና እቃዎች፦" : "Manufacturer & Accessories:"}
            </span>
            <p className="text-slate-300 font-medium">
              {matchedPanelRecord.manufacturer} — {matchedPanelRecord.compatibleAccessories}
            </p>
          </div>

          {/* Custom Serial Number Override */}
          <div>
            <label className="text-[10px] text-amber-400 font-bold block mb-1">
              {isAmharic ? "የፓነል ሲሪያል ቁጥር (Custom Serial Number):" : "Auto-Generated Serial Number:"}
            </label>
            <input
              type="text"
              value={customSerial}
              onChange={(e) => setCustomSerial(e.target.value)}
              placeholder={matchedPanelRecord.serialNumber}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 font-mono text-amber-300 font-bold outline-none focus:border-amber-400 text-xs uppercase"
            />
          </div>
        </div>
      </div>

      {/* ADMIN ADD CUSTOM PANEL MODAL */}
      {showAdminAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 relative">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center font-bold">
                  <Plus size={18} />
                </div>
                <h3 className="font-extrabold text-slate-900 text-sm">
                  {isAmharic ? "አዲስ ብጁ ፓነል ስፔስፊኬሽን ጨምር (Admin Panel)" : "Admin: Add Custom Panel Spec"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAdminAddModal(false)}
                className="text-slate-400 hover:text-slate-700 text-xs font-bold"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleAddCustomPanelSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Category Name (e.g. Internal Wall Panels, External Wall Panels, Custom)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Internal Wall Panels"
                  value={customCategoryName}
                  onChange={(e) => setCustomCategoryName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 font-semibold outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Panel Type / Variant Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Single Tie-Hole Internal Panel"
                  value={customPanelTypeName}
                  onChange={(e) => setCustomPanelTypeName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 font-semibold outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Width (mm)</label>
                  <input
                    type="number"
                    required
                    min={10}
                    value={customWidth}
                    onChange={(e) => setCustomWidth(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono text-slate-800 font-bold outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Height (mm)</label>
                  <input
                    type="number"
                    required
                    min={10}
                    value={customHeight}
                    onChange={(e) => setCustomHeight(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono text-slate-800 font-bold outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Manufacturer Name</label>
                <input
                  type="text"
                  required
                  value={customMfr}
                  onChange={(e) => setCustomMfr(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 font-semibold outline-none"
                />
              </div>

              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAdminAddModal(false)}
                  className="w-1/2 py-2 border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition shadow-sm"
                >
                  Save Spec
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
