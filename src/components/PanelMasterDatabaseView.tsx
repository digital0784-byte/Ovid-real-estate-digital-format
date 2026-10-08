import React, { useState, useMemo } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  MASTER_PANEL_DATABASE,
  MASTER_CATEGORIES,
  MASTER_WIDTHS,
  MASTER_HEIGHTS,
  MasterPanelRecord,
  generateSqlExport,
  generateJsonExport,
  generateCsvExport,
  downloadExcelFile,
  triggerTextDownload,
} from "../data/panelMasterDatabase";
import {
  Search,
  Download,
  FileSpreadsheet,
  FileCode2,
  FileJson,
  FileText,
  Filter,
  CheckCircle2,
  Layers,
  Grid,
  Box,
  QrCode,
  Barcode,
  Sparkles,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Info,
  RefreshCw,
  Tag,
  Wrench,
  ShieldCheck,
  Building,
  Ruler,
  Weight,
  X,
  Plus,
  Trash2,
  Edit3,
  Sliders,
  CheckSquare,
  Square,
  Calculator,
  ArrowRight,
  Check,
  XCircle,
  Settings2,
  SlidersHorizontal
} from "lucide-react";
import { INITIAL_ACCESSORY_CATALOG, MasterDataService } from "../services/masterDataService";
import { AccessoryMasterCatalogItem } from "../types";

interface PanelMasterDatabaseViewProps {
  isAmharic?: boolean;
  currentUserRole?: string;
  currentUserName?: string;
}

export const PanelMasterDatabaseView: React.FC<PanelMasterDatabaseViewProps> = ({
  isAmharic = false,
  currentUserRole = "Head Office",
  currentUserName = "System Admin",
}) => {
  // Filters & State
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedWidth, setSelectedWidth] = useState<string>("ALL");
  const [selectedHeight, setSelectedHeight] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedManufacturer, setSelectedManufacturer] = useState<string>("ALL");

  // Sorting
  const [sortField, setSortField] = useState<keyof MasterPanelRecord>("panelId");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Selected Record Detail Modal
  const [activeRecord, setActiveRecord] = useState<MasterPanelRecord | null>(null);
  const [qrModalRecord, setQrModalRecord] = useState<MasterPanelRecord | null>(null);

  // --- SUB-TABS: Panels Catalog, Accessories Catalog, Compatibility Matrix ---
  const [masterViewTab, setMasterViewTab] = useState<"panels" | "accessories" | "compatibility">("panels");

  // Accessories Master State
  const [accessoriesList, setAccessoriesList] = useState<AccessoryMasterCatalogItem[]>(INITIAL_ACCESSORY_CATALOG);
  const [accSearchTerm, setAccSearchTerm] = useState("");
  const [accCategoryFilter, setAccCategoryFilter] = useState("ALL");
  const [accManufacturerFilter, setAccManufacturerFilter] = useState("ALL");
  const [accActiveOnly, setAccActiveOnly] = useState(false);
  const [isAddAccessoryModalOpen, setIsAddAccessoryModalOpen] = useState(false);
  const [editingAccessory, setEditingAccessory] = useState<AccessoryMasterCatalogItem | null>(null);

  // New / Edit Accessory Form State
  const [accFormName, setAccFormName] = useState("");
  const [accFormType, setAccFormType] = useState("");
  const [accFormCategory, setAccFormCategory] = useState("Tie System");
  const [accFormCode, setAccFormCode] = useState("");
  const [accFormDimension, setAccFormDimension] = useState("");
  const [accFormUnit, setAccFormUnit] = useState("mm");
  const [accFormMfr, setAccFormMfr] = useState("Mivan Technology Corp");
  const [accFormPanels, setAccFormPanels] = useState("Wall Panel, Column Panel");
  const [accFormRatio, setAccFormRatio] = useState<number>(2);
  const [accFormDesc, setAccFormDesc] = useState("");
  const [accFormWeight, setAccFormWeight] = useState<number>(0.5);
  const [accFormActive, setAccFormActive] = useState(true);

  // Compatibility Calculator Simulation State
  const [simPanelType, setSimPanelType] = useState("Standard Wall Panel");
  const [simPanelQty, setSimPanelQty] = useState(50);

  // Filtered dataset
  const filteredPanels = useMemo(() => {
    return MASTER_PANEL_DATABASE.filter((panel) => {
      // Search
      const term = (searchTerm || "").trim().toLowerCase();
      if (term) {
        const matchId = String(panel.panelId || "").toLowerCase().includes(term);
        const matchCode = String(panel.panelCode || "").toLowerCase().includes(term);
        const matchName = String(panel.panelName || "").toLowerCase().includes(term);
        const matchBarcode = String(panel.barcode || "").toLowerCase().includes(term);
        const matchSerial = String(panel.serialNumber || "").toLowerCase().includes(term);
        const matchCategory = String(panel.category || "").toLowerCase().includes(term);
        const matchMfr = String(panel.manufacturer || "").toLowerCase().includes(term);
        if (
          !matchId &&
          !matchCode &&
          !matchName &&
          !matchBarcode &&
          !matchSerial &&
          !matchCategory &&
          !matchMfr
        ) {
          return false;
        }
      }

      // Category filter
      if (selectedCategory !== "ALL" && panel.category !== selectedCategory) {
        return false;
      }

      // Width filter
      if (selectedWidth !== "ALL" && panel.widthMm !== Number(selectedWidth)) {
        return false;
      }

      // Height filter
      if (selectedHeight !== "ALL" && panel.heightMm !== Number(selectedHeight)) {
        return false;
      }

      // Status filter
      if (selectedStatus !== "ALL" && panel.status !== selectedStatus) {
        return false;
      }

      // Manufacturer filter
      if (selectedManufacturer !== "ALL" && panel.manufacturer !== selectedManufacturer) {
        return false;
      }

      return true;
    });
  }, [
    searchTerm,
    selectedCategory,
    selectedWidth,
    selectedHeight,
    selectedStatus,
    selectedManufacturer,
  ]);

  // Sorted dataset
  const sortedPanels = useMemo(() => {
    return [...filteredPanels].sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (typeof valA === "string") {
        valA = (valA as string).toLowerCase();
        valB = (valB as string).toLowerCase();
      }

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredPanels, sortField, sortOrder]);

  // Paginated records
  const totalPages = Math.ceil(sortedPanels.length / pageSize) || 1;
  const paginatedPanels = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedPanels.slice(start, start + pageSize);
  }, [sortedPanels, currentPage, pageSize]);

  // Handle Sort Change
  const handleSort = (field: keyof MasterPanelRecord) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Reset all filters
  const resetFilters = () => {
    setSearchTerm("");
    setSelectedCategory("ALL");
    setSelectedWidth("ALL");
    setSelectedHeight("ALL");
    setSelectedStatus("ALL");
    setSelectedManufacturer("ALL");
    setCurrentPage(1);
  };

  // Manufacturers list derived
  const manufacturers = useMemo(() => {
    return Array.from(new Set(MASTER_PANEL_DATABASE.map((p) => p.manufacturer))).sort();
  }, []);

  // Totals calculations
  const totalWeight = useMemo(() => {
    return filteredPanels.reduce((sum, p) => sum + p.weightKg, 0);
  }, [filteredPanels]);

  const totalArea = useMemo(() => {
    return filteredPanels.reduce((sum, p) => sum + p.areaM2, 0);
  }, [filteredPanels]);

  // Export Trigger Handlers
  const handleExportExcel = () => {
    downloadExcelFile(
      filteredPanels,
      `Aluminum_Formwork_Master_Database_${filteredPanels.length}_Records.xlsx`
    );
  };

  const handleExportSql = () => {
    const sqlText = generateSqlExport(filteredPanels);
    triggerTextDownload(
      sqlText,
      `aluminum_formwork_master_db_${filteredPanels.length}.sql`,
      "text/plain"
    );
  };

  const handleExportCsv = () => {
    const csvText = generateCsvExport(filteredPanels);
    triggerTextDownload(
      csvText,
      `aluminum_formwork_master_db_${filteredPanels.length}.csv`,
      "text/csv"
    );
  };

  const handleExportJson = () => {
    const jsonText = generateJsonExport(filteredPanels);
    triggerTextDownload(
      jsonText,
      `aluminum_formwork_master_db_${filteredPanels.length}.json`,
      "application/json"
    );
  };

  // Accessories filtering & action handlers
  const filteredAccessories = useMemo(() => {
    return accessoriesList.filter(acc => {
      if (accActiveOnly && !acc.isActive) return false;
      if (accCategoryFilter !== "ALL" && acc.accessoryCategory !== accCategoryFilter) return false;
      if (accManufacturerFilter !== "ALL" && acc.manufacturer !== accManufacturerFilter) return false;
      if (accSearchTerm.trim()) {
        const q = accSearchTerm.toLowerCase().trim();
        const m1 = (acc.accessoryName || "").toLowerCase().includes(q);
        const m2 = (acc.accessoryCode || "").toLowerCase().includes(q);
        const m3 = (acc.accessoryType || "").toLowerCase().includes(q);
        const m4 = (acc.standardDimension || "").toLowerCase().includes(q);
        const m5 = (acc.manufacturer || "").toLowerCase().includes(q);
        if (!m1 && !m2 && !m3 && !m4 && !m5) return false;
      }
      return true;
    });
  }, [accessoriesList, accActiveOnly, accCategoryFilter, accManufacturerFilter, accSearchTerm]);

  const handleToggleAccActive = (id: string) => {
    setAccessoriesList(prev => prev.map(a => a.id === id ? { ...a, isActive: !a.isActive } : a));
  };

  const handleDeleteAcc = (id: string) => {
    if (confirm("Are you sure you want to remove this accessory from the master catalog?")) {
      setAccessoriesList(prev => prev.filter(a => a.id !== id));
    }
  };

  const handleOpenAddAccModal = (itemToEdit?: AccessoryMasterCatalogItem) => {
    if (itemToEdit) {
      setEditingAccessory(itemToEdit);
      setAccFormName(itemToEdit.accessoryName);
      setAccFormType(itemToEdit.accessoryType);
      setAccFormCategory(itemToEdit.accessoryCategory as string);
      setAccFormCode(itemToEdit.accessoryCode);
      setAccFormDimension(itemToEdit.standardDimension);
      setAccFormUnit(itemToEdit.unit);
      setAccFormMfr(itemToEdit.manufacturer);
      setAccFormPanels(itemToEdit.compatiblePanelTypes.join(", "));
      setAccFormRatio(itemToEdit.defaultQtyRatioPerPanel || 2);
      setAccFormDesc(itemToEdit.description || "");
      setAccFormWeight(itemToEdit.weightKg || 0.5);
      setAccFormActive(itemToEdit.isActive);
    } else {
      setEditingAccessory(null);
      setAccFormName("Tie Rod");
      setAccFormType("Formwork Tie");
      setAccFormCategory("Tie System");
      setAccFormCode(`TR-${Date.now().toString().slice(-4)}`);
      setAccFormDimension("15 mm");
      setAccFormUnit("mm");
      setAccFormMfr("Mivan Technology Corp");
      setAccFormPanels("Wall Panel, Column Panel");
      setAccFormRatio(2);
      setAccFormDesc("");
      setAccFormWeight(1.2);
      setAccFormActive(true);
    }
    setIsAddAccessoryModalOpen(true);
  };

  const handleSaveAccModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accFormName.trim() || !accFormCode.trim()) {
      alert("Please provide accessory name and code.");
      return;
    }

    const panelTypesArray = accFormPanels
      .split(/[,]+/)
      .map(p => p.trim())
      .filter(Boolean);

    const updatedItem: AccessoryMasterCatalogItem = {
      id: editingAccessory?.id || `CAT-ACC-${accFormCode.replace(/[^a-zA-Z0-9]/g, "").toUpperCase()}`,
      accessoryName: accFormName.trim(),
      accessoryType: accFormType.trim() || "Formwork Component",
      accessoryCategory: accFormCategory,
      accessoryCode: accFormCode.trim().toUpperCase(),
      standardDimension: accFormDimension.trim() || "Standard",
      unit: accFormUnit.trim() || "mm",
      manufacturer: accFormMfr.trim() || "Mivan Technology Corp",
      compatiblePanelTypes: panelTypesArray.length > 0 ? panelTypesArray : ["ALL"],
      defaultQtyRatioPerPanel: Number(accFormRatio) || 1,
      description: accFormDesc.trim(),
      weightKg: Number(accFormWeight) || undefined,
      isVerifiedStandard: true,
      isActive: accFormActive
    };

    setAccessoriesList(prev => {
      const idx = prev.findIndex(a => a.id === updatedItem.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = updatedItem;
        return copy;
      }
      return [updatedItem, ...prev];
    });

    setIsAddAccessoryModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-red-950 to-slate-900 text-white rounded-2xl p-6 shadow-xl border border-red-900/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-8">
          <Layers size={220} className="text-red-400" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 bg-red-900/60 border border-red-700/60 px-3 py-1 rounded-full text-xs font-bold text-red-200 mb-2">
              <Sparkles size={13} className="text-amber-400" />
              <span>
                {isAmharic
                  ? "የአሉሚኒየም ፎርምወርክ ማስተር ዳታቤዝ (2,000+ ፓነሎች)"
                  : "Master Formwork Database (2,000+ Standard Records)"}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              {isAmharic
                ? "የአሉሚኒየም ፎርምወርክ ፓነል ማስተር ዳታቤዝ"
                : "Aluminum Formwork Panel Master Database"}
            </h1>
            <p className="text-slate-300 text-xs md:text-sm mt-1 max-w-2xl">
              {isAmharic
                ? "በህንፃ ግንባታ ዘመናዊ ERP የተረጋገጠ አጠቃላይ የአሉሚኒየም ፎርምወርክ ፓነሎች መዝገብ። የፓነል ኮድ፣ ስፋት፣ ቁመት፣ ስፋት (m²)፣ ክብደት፣ ባርኮድ፣ ኪውአር ኮድ እና የባንድል ዝርዝሮችን የያዘ።"
                : "Complete standard specs for 2,000+ aluminum formwork panels across 21 categories, 23 widths, and 26 heights with auto-calculated area, bundle metrics, unique barcodes, and serial numbers."}
            </p>
          </div>

          {/* Quick Stats Pill */}
          <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md p-2 rounded-xl border border-slate-700">
            <div className="px-3 py-1.5 text-center border-r border-slate-700">
              <span className="block text-xs text-slate-400 font-semibold">
                {isAmharic ? "ጠቅላላ ፓነሎች" : "Total Panels"}
              </span>
              <span className="text-lg font-black text-red-400">
                {MASTER_PANEL_DATABASE.length.toLocaleString()}
              </span>
            </div>
            <div className="px-3 py-1.5 text-center border-r border-slate-700">
              <span className="block text-xs text-slate-400 font-semibold">
                {isAmharic ? "ካቴጎሪዎች" : "Categories"}
              </span>
              <span className="text-lg font-black text-amber-400">
                {MASTER_CATEGORIES.length}
              </span>
            </div>
            <div className="px-3 py-1.5 text-center">
              <span className="block text-xs text-slate-400 font-semibold">
                {isAmharic ? "ልዩነቶች" : "Dimensions"}
              </span>
              <span className="text-lg font-black text-emerald-400">
                {MASTER_WIDTHS.length}×{MASTER_HEIGHTS.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Centralized Master Catalog Main Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => setMasterViewTab("panels")}
            className={`px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition cursor-pointer ${
              masterViewTab === "panels"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Layers size={14} className="text-red-500" />
            <span>1. Formwork Panels Catalog</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-mono">
              2,000+
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMasterViewTab("accessories")}
            className={`px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition cursor-pointer ${
              masterViewTab === "accessories"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Wrench size={14} className="text-amber-500" />
            <span>2. Formwork Accessories Master</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-mono">
              {accessoriesList.length} Items
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMasterViewTab("compatibility")}
            className={`px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition cursor-pointer ${
              masterViewTab === "compatibility"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Calculator size={14} className="text-emerald-500" />
            <span>3. Compatibility & Bundle Calculator</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-mono">
              Smart Cascading
            </span>
          </button>
        </div>

        {masterViewTab === "accessories" && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleOpenAddAccModal()}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <Plus size={14} />
              <span>+ Add Master Accessory</span>
            </button>
          </div>
        )}
      </div>

      {masterViewTab === "panels" && (
        <>
          {/* Overview Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center font-bold">
            <Layers size={20} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              {isAmharic ? "የተመረጡ ፓነሎች" : "Filtered Panels"}
            </span>
            <span className="text-xl font-black text-slate-900">
              {filteredPanels.length.toLocaleString()} /{" "}
              <span className="text-slate-400 text-sm">
                {MASTER_PANEL_DATABASE.length.toLocaleString()}
              </span>
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Ruler size={20} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              {isAmharic ? "ጠቅላላ ስፋት (m²)" : "Total Formwork Area"}
            </span>
            <span className="text-xl font-black text-slate-900">
              {totalArea.toFixed(1).toLocaleString()} m²
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Weight size={20} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              {isAmharic ? "ጠቅላላ ክብደት (ቶን)" : "Total Panel Weight"}
            </span>
            <span className="text-xl font-black text-slate-900">
              {(totalWeight / 1000).toFixed(2)} Tons
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Barcode size={20} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              {isAmharic ? "ባርኮድ እና QR" : "Barcodes & Serials"}
            </span>
            <span className="text-xl font-black text-slate-900">100% Unique</span>
          </div>
        </div>
      </div>

      {/* Export Action Bar */}
      <div className="bg-slate-900 text-white p-4 rounded-xl shadow-md border border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center space-x-2">
          <Download size={18} className="text-red-400" />
          <span className="font-bold text-sm">
            {isAmharic
              ? "መረጃዎችን በተለያዩ ቅርጸቶች ያውርዱ (Export Full Database):"
              : "Export Master Panel Database Records:"}
          </span>
          <span className="bg-red-950 text-red-300 border border-red-800 text-[10px] px-2 py-0.5 rounded font-mono font-bold">
            {filteredPanels.length} Items Selected
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center space-x-1.5 shadow-sm"
            title="Download formatted Excel workbook"
          >
            <FileSpreadsheet size={15} />
            <span>Excel (.xlsx)</span>
          </button>

          <button
            onClick={handleExportSql}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition flex items-center space-x-1.5 shadow-sm"
            title="Download SQL table schema and INSERT statements"
          >
            <FileCode2 size={15} />
            <span>SQL Dump (.sql)</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition flex items-center space-x-1.5 shadow-sm"
            title="Download standard CSV spreadsheet file"
          >
            <FileText size={15} />
            <span>CSV (.csv)</span>
          </button>

          <button
            onClick={handleExportJson}
            className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition flex items-center space-x-1.5 shadow-sm"
            title="Download structured JSON array"
          >
            <FileJson size={15} />
            <span>JSON (.json)</span>
          </button>
        </div>
      </div>

      {/* Quick Category Master Navigation Bar */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-2 overflow-x-auto">
        <span className="text-xs font-black uppercase text-slate-400 shrink-0 px-2">
          Master Library:
        </span>
        <button
          onClick={() => {
            setSelectedCategory("ALL");
            setCurrentPage(1);
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 flex items-center space-x-1.5 ${
            selectedCategory === "ALL"
              ? "bg-slate-900 text-white shadow-sm"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          <span>🏢 All Master Panels</span>
          <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded-full">
            {MASTER_PANEL_DATABASE.length}
          </span>
        </button>

        <button
          onClick={() => {
            setSelectedCategory("Internal Wall Panels");
            setCurrentPage(1);
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 flex items-center space-x-1.5 ${
            selectedCategory === "Internal Wall Panels"
              ? "bg-red-600 text-white shadow-sm"
              : "bg-red-50 text-red-800 border border-red-200 hover:bg-red-100"
          }`}
        >
          <span>🧱 Internal Wall Panels</span>
        </button>

        <button
          onClick={() => {
            setSelectedCategory("External Wall Panels");
            setCurrentPage(1);
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 flex items-center space-x-1.5 ${
            selectedCategory === "External Wall Panels"
              ? "bg-red-600 text-white shadow-sm"
              : "bg-red-50 text-red-800 border border-red-200 hover:bg-red-100"
          }`}
        >
          <span>🏢 External Wall Panels</span>
        </button>

        <button
          onClick={() => {
            setSelectedCategory("Stair Panels");
            setCurrentPage(1);
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 flex items-center space-x-1.5 ${
            selectedCategory === "Stair Panels" || selectedCategory === "Stair Formwork Panels"
              ? "bg-amber-600 text-white shadow-sm"
              : "bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100"
          }`}
        >
          <span>🪜 Stair Formwork Panels</span>
        </button>

        <button
          onClick={() => {
            setSelectedCategory("Slab Panels");
            setCurrentPage(1);
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 flex items-center space-x-1.5 ${
            selectedCategory === "Slab Panels"
              ? "bg-blue-600 text-white shadow-sm"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          <span>🏗 Slab Panels</span>
        </button>

        <button
          onClick={() => {
            setSelectedCategory("Corner Panels");
            setCurrentPage(1);
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 flex items-center space-x-1.5 ${
            selectedCategory === "Corner Panels"
              ? "bg-blue-600 text-white shadow-sm"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          <span>📐 Corner Panels</span>
        </button>
      </div>

      {/* Search & Multi-Filter Control Panel */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-3 text-slate-400" size={18} />
            <input
              type="text"
              placeholder={
                isAmharic
                  ? "በፓነል አይዲ፣ በፓነል ኮድ፣ በባርኮድ፣ በሴሪያል ወይም በካቴጎሪ ይፈልጉ..."
                  : "Search 2,000+ panels by ID, Code, Barcode, Serial, Category, Manufacturer..."
              }
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 font-medium outline-none focus:border-red-500 focus:bg-white transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <button
            onClick={resetFilters}
            className="px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shrink-0"
          >
            <RefreshCw size={14} />
            <span>{isAmharic ? "ፊልተሮችን አፅዳ" : "Reset Filters"}</span>
          </button>
        </div>

        {/* Dropdown Filters Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-2 border-t border-slate-100 text-xs">
          {/* Category Filter */}
          <div>
            <label className="block font-bold text-slate-600 mb-1">
              {isAmharic ? "ካቴጎሪ" : "Category"}
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 font-semibold outline-none focus:border-red-500"
            >
              <option value="ALL">All Categories ({MASTER_CATEGORIES.length})</option>
              {MASTER_CATEGORIES.map((cat, i) => (
                <option key={i} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Width Filter */}
          <div>
            <label className="block font-bold text-slate-600 mb-1">
              {isAmharic ? "ስፋት (Width mm)" : "Width (mm)"}
            </label>
            <select
              value={selectedWidth}
              onChange={(e) => {
                setSelectedWidth(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 font-semibold outline-none focus:border-red-500"
            >
              <option value="ALL">All Widths ({MASTER_WIDTHS.length})</option>
              {MASTER_WIDTHS.map((w) => (
                <option key={w} value={w.toString()}>
                  {w} mm
                </option>
              ))}
            </select>
          </div>

          {/* Height Filter */}
          <div>
            <label className="block font-bold text-slate-600 mb-1">
              {isAmharic ? "ቁመት (Height mm)" : "Height (mm)"}
            </label>
            <select
              value={selectedHeight}
              onChange={(e) => {
                setSelectedHeight(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 font-semibold outline-none focus:border-red-500"
            >
              <option value="ALL">All Heights ({MASTER_HEIGHTS.length})</option>
              {MASTER_HEIGHTS.map((h) => (
                <option key={h} value={h.toString()}>
                  {h} mm
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block font-bold text-slate-600 mb-1">
              {isAmharic ? "ሁኔታ" : "Status"}
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 font-semibold outline-none focus:border-red-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="Active Stock">Active Stock</option>
              <option value="In Use">In Use</option>
              <option value="Reserved for Project">Reserved for Project</option>
              <option value="New / Unused">New / Unused</option>
              <option value="Under Maintenance">Under Maintenance</option>
            </select>
          </div>

          {/* Manufacturer Filter */}
          <div>
            <label className="block font-bold text-slate-600 mb-1">
              {isAmharic ? "አምራች" : "Manufacturer"}
            </label>
            <select
              value={selectedManufacturer}
              onChange={(e) => {
                setSelectedManufacturer(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 font-semibold outline-none focus:border-red-500"
            >
              <option value="ALL">All Manufacturers</option>
              {manufacturers.map((m, i) => (
                <option key={i} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Controls Top */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs">
          <div className="text-slate-600 font-semibold">
            {isAmharic ? "በገጽ በመታየት ላይ ያለው፦ " : "Showing "}
            <span className="font-extrabold text-slate-900">
              {Math.min((currentPage - 1) * pageSize + 1, sortedPanels.length)} -{" "}
              {Math.min(currentPage * pageSize, sortedPanels.length)}
            </span>{" "}
            of <span className="font-extrabold text-slate-900">{sortedPanels.length}</span>{" "}
            {isAmharic ? "ፓነሎች" : "panels"}
          </div>

          <div className="flex items-center space-x-3">
            <span className="font-bold text-slate-600">
              {isAmharic ? "በገፅ ብዛት፦" : "Per Page:"}
            </span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-white border border-slate-300 rounded-lg px-2 py-1 font-bold text-slate-800 outline-none"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={250}>250</option>
            </select>
          </div>
        </div>

        {/* Scrollable Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                <th
                  onClick={() => handleSort("panelId")}
                  className="p-3 cursor-pointer hover:bg-slate-200 transition"
                >
                  <div className="flex items-center space-x-1">
                    <span>Panel ID</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>

                <th
                  onClick={() => handleSort("panelCode")}
                  className="p-3 cursor-pointer hover:bg-slate-200 transition"
                >
                  <div className="flex items-center space-x-1">
                    <span>Code</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>

                <th
                  onClick={() => handleSort("category")}
                  className="p-3 cursor-pointer hover:bg-slate-200 transition"
                >
                  <div className="flex items-center space-x-1">
                    <span>Category</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>

                <th
                  onClick={() => handleSort("widthMm")}
                  className="p-3 cursor-pointer hover:bg-slate-200 transition text-right"
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>Width</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>

                <th
                  onClick={() => handleSort("heightMm")}
                  className="p-3 cursor-pointer hover:bg-slate-200 transition text-right"
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>Height</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>

                <th
                  onClick={() => handleSort("areaM2")}
                  className="p-3 cursor-pointer hover:bg-slate-200 transition text-right"
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>Area (m²)</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>

                <th
                  onClick={() => handleSort("weightKg")}
                  className="p-3 cursor-pointer hover:bg-slate-200 transition text-right"
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>Weight (kg)</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>

                <th className="p-3 text-center">Bundle (Qty / Wt)</th>

                <th className="p-3">Barcode & Serial</th>

                <th
                  onClick={() => handleSort("status")}
                  className="p-3 cursor-pointer hover:bg-slate-200 transition"
                >
                  <div className="flex items-center space-x-1">
                    <span>Status</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>

                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-slate-800">
              {paginatedPanels.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-slate-400">
                    <Info size={32} className="mx-auto mb-2 text-slate-300" />
                    <p className="font-bold text-sm text-slate-600">
                      {isAmharic
                        ? "ምንም አይነት ፓነል አልተገኘም!"
                        : "No matching aluminum formwork panels found!"}
                    </p>
                    <p className="text-xs mt-1">
                      {isAmharic
                        ? "እባክዎ የፍለጋ ቃሉን ወይም ፊልተሩን ቀይረው ይሞክሩ።"
                        : "Try refining your search terms or clearing selected category filters."}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedPanels.map((panel, idx) => (
                  <tr
                    key={panel.panelId}
                    className="hover:bg-red-50/30 transition-colors"
                  >
                    {/* Panel ID */}
                    <td className="p-3 font-mono font-bold text-red-700">
                      {panel.panelId}
                    </td>

                    {/* Code */}
                    <td className="p-3 font-bold font-mono text-slate-900">
                      {panel.panelCode}
                    </td>

                    {/* Category */}
                    <td className="p-3 font-medium">
                      <span className="inline-block bg-slate-100 border border-slate-200 text-slate-700 px-2 py-0.5 rounded text-[11px] font-semibold">
                        {panel.category}
                      </span>
                    </td>

                    {/* Width */}
                    <td className="p-3 font-mono font-semibold text-right">
                      {panel.widthMm} mm
                    </td>

                    {/* Height */}
                    <td className="p-3 font-mono font-semibold text-right">
                      {panel.heightMm} mm
                    </td>

                    {/* Area */}
                    <td className="p-3 font-mono font-bold text-right text-emerald-700">
                      {panel.areaM2.toFixed(3)} m²
                    </td>

                    {/* Weight */}
                    <td className="p-3 font-mono font-bold text-right text-slate-900">
                      {panel.weightKg.toFixed(2)} kg
                    </td>

                    {/* Bundle */}
                    <td className="p-3 text-center">
                      <div className="flex flex-col items-center">
                        <span className="font-bold text-slate-800 text-[11px]">
                          {panel.bundleQuantity} pcs / bundle
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">
                          ({panel.bundleWeightKg} kg)
                        </span>
                      </div>
                    </td>

                    {/* Barcode & Serial */}
                    <td className="p-3">
                      <div className="flex flex-col text-[10px]">
                        <span className="font-mono text-slate-700 font-bold">
                          {panel.barcode}
                        </span>
                        <span className="font-mono text-slate-400">
                          {panel.serialNumber}
                        </span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="p-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          panel.status === "Active Stock"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : panel.status === "In Use"
                            ? "bg-blue-100 text-blue-800 border border-blue-200"
                            : panel.status === "Reserved for Project"
                            ? "bg-amber-100 text-amber-800 border border-amber-200"
                            : panel.status === "New / Unused"
                            ? "bg-purple-100 text-purple-800 border border-purple-200"
                            : "bg-red-100 text-red-800 border border-red-200"
                        }`}
                      >
                        {panel.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          onClick={() => setActiveRecord(panel)}
                          className="p-1.5 bg-slate-100 hover:bg-red-600 hover:text-white rounded-lg text-slate-700 transition"
                          title="View Full Panel Specification Sheet"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => setQrModalRecord(panel)}
                          className="p-1.5 bg-slate-100 hover:bg-slate-900 hover:text-white rounded-lg text-slate-700 transition"
                          title="View Barcode & QR Code"
                        >
                          <QrCode size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs">
          <div className="text-slate-500 font-medium">
            Page <span className="font-bold text-slate-900">{currentPage}</span> of{" "}
            <span className="font-bold text-slate-900">{totalPages}</span>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="p-2 border border-slate-200 bg-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 font-bold transition"
            >
              <ChevronLeft size={16} />
            </button>

            <span className="px-3 font-bold text-slate-700">
              {currentPage} / {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-2 border border-slate-200 bg-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 font-bold transition"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* 2. FORMWORK ACCESSORIES MASTER CATALOG VIEW */}
      {/* ========================================================================= */}
      {masterViewTab === "accessories" && (
        <div className="space-y-6">
          {/* Accessories Overview Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <Wrench size={20} />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Total Accessories
                </span>
                <span className="text-xl font-black text-slate-900">
                  {accessoriesList.length}{" "}
                  <span className="text-xs font-normal text-slate-500">Components</span>
                </span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Active in Catalog
                </span>
                <span className="text-xl font-black text-emerald-600">
                  {accessoriesList.filter(a => a.isActive).length} / {accessoriesList.length}
                </span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Grid size={20} />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  System Categories
                </span>
                <span className="text-xl font-black text-slate-900">
                  {Array.from(new Set(accessoriesList.map(a => a.accessoryCategory))).length} Types
                </span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                <Building size={20} />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Verified Suppliers
                </span>
                <span className="text-xl font-black text-slate-900">
                  {Array.from(new Set(accessoriesList.map(a => a.manufacturer))).length} Makers
                </span>
              </div>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              {/* Search input */}
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={accSearchTerm}
                  onChange={e => setAccSearchTerm(e.target.value)}
                  placeholder="Search accessory name, code, dimension, or manufacturer..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs focus:outline-none focus:border-amber-500 focus:bg-white transition"
                />
                {accSearchTerm && (
                  <button
                    onClick={() => setAccSearchTerm("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Category Filter */}
              <select
                value={accCategoryFilter}
                onChange={e => setAccCategoryFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:border-amber-500"
              >
                <option value="ALL">All Categories ({accessoriesList.length})</option>
                {Array.from(new Set(accessoriesList.map(a => a.accessoryCategory))).sort().map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              {/* Manufacturer Filter */}
              <select
                value={accManufacturerFilter}
                onChange={e => setAccManufacturerFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:border-amber-500"
              >
                <option value="ALL">All Manufacturers</option>
                {Array.from(new Set(accessoriesList.map(a => a.manufacturer))).sort().map(mfr => (
                  <option key={mfr} value={mfr}>{mfr}</option>
                ))}
              </select>

              {/* Active Only Filter */}
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer px-2">
                <input
                  type="checkbox"
                  checked={accActiveOnly}
                  onChange={e => setAccActiveOnly(e.target.checked)}
                  className="rounded text-amber-500 focus:ring-amber-500 cursor-pointer"
                />
                <span>Active Only</span>
              </label>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const csv = "ID,Name,Type,Category,Code,Dimension,Unit,Manufacturer,WeightKg,Active\n" +
                      filteredAccessories.map(a => `"${a.id}","${a.accessoryName}","${a.accessoryType}","${a.accessoryCategory}","${a.accessoryCode}","${a.standardDimension}","${a.unit}","${a.manufacturer}",${a.weightKg || 0},${a.isActive}`).join("\n");
                    triggerTextDownload(csv, `formwork_accessories_catalog_${filteredAccessories.length}.csv`, "text/csv");
                  }}
                  className="px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                  title="Export to CSV"
                >
                  <Download size={13} />
                  <span>CSV</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenAddAccModal()}
                  className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                >
                  <Plus size={14} />
                  <span>Add Accessory</span>
                </button>
              </div>
            </div>
          </div>

          {/* Accessories Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Accessory Name</th>
                    <th className="px-4 py-3">Type & Category</th>
                    <th className="px-4 py-3">Standard Dimension</th>
                    <th className="px-4 py-3">Accessory Code</th>
                    <th className="px-4 py-3">Manufacturer</th>
                    <th className="px-4 py-3">Compatible Panels</th>
                    <th className="px-4 py-3 text-center">Default Ratio</th>
                    <th className="px-4 py-3 text-center">Unit / Weight</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAccessories.map(acc => (
                    <tr key={acc.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3">
                        <div className="font-extrabold text-slate-900">{acc.accessoryName}</div>
                        <div className="text-[10px] text-slate-400 font-mono truncate max-w-xs">{acc.description}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-700 block">{acc.accessoryType}</span>
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                          {acc.accessoryCategory}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono font-bold text-amber-600 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded">
                          {acc.standardDimension}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono font-black text-slate-900">
                        {acc.accessoryCode}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {acc.manufacturer}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {acc.compatiblePanelTypes.slice(0, 3).map(p => (
                            <span key={p} className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                              {p}
                            </span>
                          ))}
                          {acc.compatiblePanelTypes.length > 3 && (
                            <span className="text-[9px] bg-slate-200 text-slate-600 px-1 py-0.5 rounded">
                              +{acc.compatiblePanelTypes.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center font-mono font-bold text-slate-800">
                        {acc.defaultQtyRatioPerPanel || 1}× / panel
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-mono text-slate-700">{acc.unit}</span>
                        {acc.weightKg && (
                          <span className="block text-[10px] text-slate-400 font-mono">{acc.weightKg} kg</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleAccActive(acc.id)}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition cursor-pointer ${
                            acc.isActive
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                              : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
                          }`}
                        >
                          {acc.isActive ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            type="button"
                            onClick={() => handleOpenAddAccModal(acc)}
                            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                            title="Edit Accessory"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAcc(acc.id)}
                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                            title="Delete Accessory"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
              <span>
                Showing <strong>{filteredAccessories.length}</strong> of <strong>{accessoriesList.length}</strong> accessories
              </span>
              <span className="text-[11px] text-slate-400 italic">
                * All dimensions standardized from international 6061-T6 aluminum extrusion guidelines
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. PANEL-ACCESSORY COMPATIBILITY MATRIX & REQUIREMENTS CALCULATOR */}
      {/* ========================================================================= */}
      {masterViewTab === "compatibility" && (
        <div className="space-y-6">
          {/* Cascading Relationship Flow Visual Diagram */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-5 rounded-2xl border border-slate-700 shadow-md space-y-3">
            <div className="flex items-center justify-between border-b border-slate-700 pb-2">
              <span className="font-extrabold text-amber-400 uppercase tracking-wider text-xs flex items-center gap-1.5">
                <Sparkles size={14} />
                <span>Standard Cascading Relationship Architecture (ቅደም ተከተላዊ ምርጫ)</span>
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                Centralized Master Governance
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs py-2">
              <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-700 text-center flex-1 min-w-[120px]">
                <span className="text-[10px] text-slate-400 block font-bold">Level 1</span>
                <span className="font-extrabold text-white">Panel List</span>
              </div>
              <ArrowRight size={14} className="text-amber-400 shrink-0 hidden sm:block" />

              <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-700 text-center flex-1 min-w-[120px]">
                <span className="text-[10px] text-slate-400 block font-bold">Level 2</span>
                <span className="font-extrabold text-amber-400">Panel Type</span>
              </div>
              <ArrowRight size={14} className="text-amber-400 shrink-0 hidden sm:block" />

              <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-700 text-center flex-1 min-w-[120px]">
                <span className="text-[10px] text-slate-400 block font-bold">Level 3</span>
                <span className="font-extrabold text-emerald-400">Dimension</span>
              </div>
              <ArrowRight size={14} className="text-amber-400 shrink-0 hidden sm:block" />

              <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-700 text-center flex-1 min-w-[120px]">
                <span className="text-[10px] text-slate-400 block font-bold">Level 4</span>
                <span className="font-extrabold text-blue-400">Panel Code</span>
              </div>
              <ArrowRight size={14} className="text-amber-400 shrink-0 hidden sm:block" />

              <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-700 text-center flex-1 min-w-[120px]">
                <span className="text-[10px] text-slate-400 block font-bold">Level 5</span>
                <span className="font-extrabold text-purple-400">Compatible Acc.</span>
              </div>
              <ArrowRight size={14} className="text-amber-400 shrink-0 hidden sm:block" />

              <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-700 text-center flex-1 min-w-[120px]">
                <span className="text-[10px] text-slate-400 block font-bold">Level 6</span>
                <span className="font-extrabold text-red-400">Acc. Type</span>
              </div>
              <ArrowRight size={14} className="text-amber-400 shrink-0 hidden sm:block" />

              <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-700 text-center flex-1 min-w-[120px]">
                <span className="text-[10px] text-slate-400 block font-bold">Level 7</span>
                <span className="font-extrabold text-amber-300">Dimension</span>
              </div>
              <ArrowRight size={14} className="text-amber-400 shrink-0 hidden sm:block" />

              <div className="p-2.5 bg-amber-500 text-slate-950 rounded-xl text-center flex-1 min-w-[120px] font-black shadow-md">
                <span className="text-[10px] text-slate-800 block">Level 8</span>
                <span>Accessory Code</span>
              </div>
            </div>
          </div>

          {/* Interactive Panel & Accessories Requirement Calculator */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                  <Calculator size={16} className="text-emerald-600" />
                  <span>Interactive Panel & Accessories Requirement Calculator</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select a panel type and quantity to auto-compute all verified locking hardware, tie systems, pins & props.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-slate-600">Panel Type:</label>
                  <select
                    value={simPanelType}
                    onChange={e => setSimPanelType(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-amber-500"
                  >
                    <option value="Standard Wall Panel">Standard Wall Panel (WP-600-2400)</option>
                    <option value="Slab Decking Panel">Slab Decking Panel (SP-600-1200)</option>
                    <option value="Column Panel">Column Formwork Panel (COL-450-2700)</option>
                    <option value="Beam Side Panel">Beam Side Panel (BP-400-2400)</option>
                    <option value="Internal Corner Panel">Internal Corner Panel (IC-100-2400)</option>
                    <option value="External Corner Panel">External Corner Panel (EC-50-2400)</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-slate-600">Quantity:</label>
                  <input
                    type="number"
                    min={1}
                    value={simPanelQty}
                    onChange={e => setSimPanelQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-mono font-bold text-slate-800 text-center focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Simulated Requirements Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {INITIAL_ACCESSORY_CATALOG.filter(a => {
                const types = (a.compatiblePanelTypes || []).map(t => t.toLowerCase());
                if (types.includes("all")) return true;
                const simLower = simPanelType.toLowerCase();
                return types.some(t => simLower.includes(t) || t.includes(simLower));
              }).map(acc => {
                const ratio = acc.defaultQtyRatioPerPanel || 2;
                const totalNeeded = ratio * simPanelQty;
                const totalWeight = acc.weightKg ? (acc.weightKg * totalNeeded).toFixed(1) : "—";
                return (
                  <div key={acc.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-slate-900 text-xs">{acc.accessoryName}</span>
                        <span className="font-mono text-[10px] bg-slate-200 text-slate-700 px-1 rounded font-bold">
                          {acc.accessoryCode}
                        </span>
                      </div>
                      <span className="text-[11px] text-amber-700 font-mono font-medium block">
                        {acc.standardDimension} ({acc.accessoryType})
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Ratio: {ratio}× per panel • {acc.manufacturer.split(" ")[0]}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-base font-black text-emerald-700 font-mono block">
                        {totalNeeded.toLocaleString()}{" "}
                        <span className="text-xs font-normal text-slate-500">{acc.unit}</span>
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        ≈ {totalWeight} kg
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Accessory Master Modal */}
      {isAddAccessoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 animate-fadeIn overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-5 shadow-2xl text-xs text-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/30">
                  <Wrench size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    {editingAccessory ? "Edit Formwork Master Accessory" : "Add New Master Formwork Accessory"}
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Centralized Formwork Accessories Master Catalog
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddAccessoryModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveAccModal} className="space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-slate-400 block mb-0.5 text-[10px] font-bold">Accessory Name *</label>
                  <input
                    type="text"
                    required
                    value={accFormName}
                    onChange={e => setAccFormName(e.target.value)}
                    placeholder="e.g. Tie Rod, Pin, Spacer"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-0.5 text-[10px] font-bold">Accessory Code *</label>
                  <input
                    type="text"
                    required
                    value={accFormCode}
                    onChange={e => setAccFormCode(e.target.value)}
                    placeholder="e.g. TR-15, WN-15"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-slate-400 block mb-0.5 text-[10px] font-bold">Accessory Type</label>
                  <input
                    type="text"
                    value={accFormType}
                    onChange={e => setAccFormType(e.target.value)}
                    placeholder="e.g. Formwork Tie, Fastener"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-0.5 text-[10px] font-bold">Category</label>
                  <select
                    value={accFormCategory}
                    onChange={e => setAccFormCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Tie System">Tie System</option>
                    <option value="Fasteners & Pins">Fasteners & Pins</option>
                    <option value="Alignment & Wedges">Alignment & Wedges</option>
                    <option value="Spacers & Cones">Spacers & Cones</option>
                    <option value="Support & Props">Support & Props</option>
                    <option value="Brackets & Clamps">Brackets & Clamps</option>
                    <option value="Wallers & Stiffeners">Wallers & Stiffeners</option>
                    <option value="Corner Accessories">Corner Accessories</option>
                    <option value="Platform Accessories">Platform Accessories</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-slate-400 block mb-0.5 text-[10px] font-bold">Standard Dimension *</label>
                  <input
                    type="text"
                    required
                    value={accFormDimension}
                    onChange={e => setAccFormDimension(e.target.value)}
                    placeholder="e.g. 15 mm, 16 × 50 mm"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-0.5 text-[10px] font-bold">Unit</label>
                  <select
                    value={accFormUnit}
                    onChange={e => setAccFormUnit(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="mm">mm</option>
                    <option value="Pcs">Pcs</option>
                    <option value="Box (250 pcs)">Box (250 pcs)</option>
                    <option value="Set">Set</option>
                    <option value="kg">kg</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-0.5 text-[10px] font-bold">Default Ratio</label>
                  <input
                    type="number"
                    min={1}
                    value={accFormRatio}
                    onChange={e => setAccFormRatio(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white font-mono text-center focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-slate-400 block mb-0.5 text-[10px] font-bold">Manufacturer</label>
                  <select
                    value={accFormMfr}
                    onChange={e => setAccFormMfr(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Mivan Technology Corp">Mivan Technology Corp</option>
                    <option value="Kumkang Kind Formwork">Kumkang Kind Formwork</option>
                    <option value="Geto Aluminum Formwork Co.">Geto Aluminum Formwork Co.</option>
                    <option value="AlumaSystems Global">AlumaSystems Global</option>
                    <option value="Doka Allied Hardware Ltd.">Doka Allied Hardware Ltd.</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-0.5 text-[10px] font-bold">Weight (kg)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={accFormWeight}
                    onChange={e => setAccFormWeight(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-0.5 text-[10px] font-bold">Compatible Panel Types (Comma separated)</label>
                <input
                  type="text"
                  value={accFormPanels}
                  onChange={e => setAccFormPanels(e.target.value)}
                  placeholder="e.g. Wall Panel, Column Panel, Beam Panel, ALL"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-0.5 text-[10px] font-bold">Description</label>
                <textarea
                  rows={2}
                  value={accFormDesc}
                  onChange={e => setAccFormDesc(e.target.value)}
                  placeholder="Technical specifications, load capacity, alloy grade..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={accFormActive}
                    onChange={e => setAccFormActive(e.target.checked)}
                    className="rounded text-amber-500 focus:ring-amber-500 cursor-pointer"
                  />
                  <span>Active in Master Catalog</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddAccessoryModalOpen(false)}
                    className="px-3 py-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition cursor-pointer shadow-md"
                  >
                    Save Master Accessory
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Panel Modal */}
      {activeRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl border border-slate-200 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setActiveRecord(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100"
            >
              <X size={20} />
            </button>

            <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
              <div className="w-12 h-12 rounded-xl bg-red-600 text-white flex items-center justify-center font-bold">
                <Box size={24} />
              </div>
              <div>
                <span className="text-xs font-mono font-bold text-red-600 block">
                  {activeRecord.panelId} • {activeRecord.serialNumber}
                </span>
                <h3 className="text-lg font-extrabold text-slate-900">
                  {activeRecord.panelName}
                </h3>
              </div>
            </div>

            {/* Spec Sheet Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-red-50 rounded-xl border border-red-150">
                <span className="block text-red-600 font-bold uppercase text-[10px]">
                  Panel Type
                </span>
                <span className="font-extrabold text-red-950 text-xs">
                  {activeRecord.panelType || "Standard Panel"}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-150">
                <span className="block text-slate-400 font-bold uppercase text-[10px]">
                  Panel Code
                </span>
                <span className="font-mono font-extrabold text-slate-900 text-sm">
                  {activeRecord.panelCode}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-150">
                <span className="block text-slate-400 font-bold uppercase text-[10px]">
                  Category
                </span>
                <span className="font-bold text-slate-900">{activeRecord.category}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-150">
                <span className="block text-slate-400 font-bold uppercase text-[10px]">
                  Width × Height
                </span>
                <span className="font-mono font-bold text-slate-900">
                  {activeRecord.widthMm} × {activeRecord.heightMm} mm
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-150">
                <span className="block text-slate-400 font-bold uppercase text-[10px]">
                  Thickness
                </span>
                <span className="font-mono font-bold text-slate-900">
                  {activeRecord.thicknessMm} mm Extrusion
                </span>
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-150">
                <span className="block text-emerald-600 font-bold uppercase text-[10px]">
                  Formwork Area
                </span>
                <span className="font-mono font-extrabold text-emerald-900 text-sm">
                  {activeRecord.areaM2} m²
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-150">
                <span className="block text-slate-400 font-bold uppercase text-[10px]">
                  Weight
                </span>
                <span className="font-mono font-bold text-slate-900">
                  {activeRecord.weightKg} kg
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-150">
                <span className="block text-slate-400 font-bold uppercase text-[10px]">
                  Bundle Quantity
                </span>
                <span className="font-bold text-slate-900">
                  {activeRecord.bundleQuantity} pcs / bundle
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-150">
                <span className="block text-slate-400 font-bold uppercase text-[10px]">
                  Bundle Weight
                </span>
                <span className="font-mono font-bold text-slate-900">
                  {activeRecord.bundleWeightKg} kg
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-150">
                <span className="block text-slate-400 font-bold uppercase text-[10px]">
                  Status
                </span>
                <span className="font-bold text-red-600">{activeRecord.status}</span>
              </div>
            </div>

            {/* Extra Technical Spec */}
            <div className="space-y-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <span className="font-bold text-slate-700 block mb-1">
                  Material & Surface Coating:
                </span>
                <p className="text-slate-600 font-medium">
                  {activeRecord.material} — {activeRecord.surfaceFinish}
                </p>
              </div>

              <div>
                <span className="font-bold text-slate-700 block mb-1">
                  Compatible Accessories:
                </span>
                <p className="text-slate-600 font-medium">
                  {activeRecord.compatibleAccessories}
                </p>
              </div>

              <div>
                <span className="font-bold text-slate-700 block mb-1">
                  Manufacturer & Quality Rating:
                </span>
                <p className="text-slate-600 font-medium">
                  {activeRecord.manufacturer} (Certified ISO 9001:2015 Structural Extrusions)
                </p>
              </div>

              <div>
                <span className="font-bold text-slate-700 block mb-1">
                  Engineering Notes:
                </span>
                <p className="text-slate-600 leading-relaxed italic">
                  {activeRecord.notes}
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setActiveRecord(null)}
                className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition"
              >
                Close Specification
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {qrModalRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 relative text-center">
            <button
              onClick={() => setQrModalRecord(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100"
            >
              <X size={20} />
            </button>

            <h3 className="text-base font-extrabold text-slate-900">
              Panel Digital Identification Tag
            </h3>

            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col items-center justify-center space-y-3">
              <div className="w-40 h-40 bg-white border-2 border-slate-900 p-2 rounded-xl flex items-center justify-center shadow-md">
                <QRCodeSVG 
                  value={qrModalRecord.qrCode || qrModalRecord.panelCode || qrModalRecord.panelId} 
                  size={130} 
                  level="M" 
                />
              </div>

              <div className="font-mono text-xs text-slate-700 font-bold space-y-1">
                <p className="text-red-700">{qrModalRecord.panelId}</p>
                <p className="text-slate-900">{qrModalRecord.panelCode}</p>
                <p className="text-[10px] text-slate-400">{qrModalRecord.qrCode}</p>
              </div>
            </div>

            <div className="p-3 bg-slate-100 rounded-xl text-left space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Barcode (EAN-13):</span>
                <span className="font-mono font-bold text-slate-900">
                  {qrModalRecord.barcode}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Serial Number:</span>
                <span className="font-mono font-bold text-slate-900">
                  {qrModalRecord.serialNumber}
                </span>
              </div>
            </div>

            <button
              onClick={() => setQrModalRecord(null)}
              className="w-full py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
