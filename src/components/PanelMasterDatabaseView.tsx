import React, { useState, useMemo } from "react";
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
} from "lucide-react";

interface PanelMasterDatabaseViewProps {
  isAmharic?: boolean;
  currentUserRole?: string;
  currentUserName?: string;
}

export const PanelMasterDatabaseView: React.FC<PanelMasterDatabaseViewProps> = ({
  isAmharic = false,
  currentUserRole = "Head Office",
  currentUserName = "Nuriye Ahmed Adem",
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

  // Filtered dataset
  const filteredPanels = useMemo(() => {
    return MASTER_PANEL_DATABASE.filter((panel) => {
      // Search
      const term = searchTerm.trim().toLowerCase();
      if (term) {
        const matchId = panel.panelId.toLowerCase().includes(term);
        const matchCode = panel.panelCode.toLowerCase().includes(term);
        const matchName = panel.panelName.toLowerCase().includes(term);
        const matchBarcode = panel.barcode.toLowerCase().includes(term);
        const matchSerial = panel.serialNumber.toLowerCase().includes(term);
        const matchCategory = panel.category.toLowerCase().includes(term);
        const matchMfr = panel.manufacturer.toLowerCase().includes(term);
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
                <QrCode size={130} className="text-slate-900" />
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
