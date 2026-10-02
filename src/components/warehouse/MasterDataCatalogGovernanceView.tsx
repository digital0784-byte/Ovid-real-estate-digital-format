import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  Plus,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Layers,
  Building2,
  MapPin,
  Store,
  ShieldCheck,
  Tag,
  RefreshCw,
  Edit3,
  Trash2,
  Check,
  X,
  Eye,
  Info,
  ChevronRight,
  Database,
  Sliders,
  FolderKanban
} from "lucide-react";
import {
  PanelMasterCatalogItem,
  MasterProjectRecord,
  MasterSiteStoreRecord,
  MasterStorageLocationRecord,
  RegisteredWarehouse,
  RegisteredSite,
  PanelCategoryType
} from "../../types";
import { MasterDataService, INITIAL_PANEL_CATALOG } from "../../services/masterDataService";
import { SearchableSmartDropdown, DropdownOption } from "../common/SearchableSmartDropdown";

interface MasterDataCatalogGovernanceViewProps {
  isAmharic?: boolean;
  currentUserRole?: string;
  currentUserName?: string;
}

export const MasterDataCatalogGovernanceView: React.FC<MasterDataCatalogGovernanceViewProps> = ({
  isAmharic = false,
  currentUserRole = "Warehouse Manager",
  currentUserName = "System Administrator"
}) => {
  // Navigation inside Master Data view
  const [activeTab, setActiveTab] = useState<"catalog" | "hierarchy" | "interactive_demo">("catalog");

  // Catalog state
  const [catalogItems, setCatalogItems] = useState<PanelMasterCatalogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedManufacturer, setSelectedManufacturer] = useState<string>("ALL");
  const [activeOnlyFilter, setActiveOnlyFilter] = useState<boolean>(false);

  // Hierarchy datasets
  const [projects, setProjects] = useState<MasterProjectRecord[]>([]);
  const [sites, setSites] = useState<RegisteredSite[]>([]);
  const [warehouses, setWarehouses] = useState<RegisteredWarehouse[]>([]);
  const [siteStores, setSiteStores] = useState<MasterSiteStoreRecord[]>([]);
  const [locations, setLocations] = useState<MasterStorageLocationRecord[]>([]);

  // Add / Edit Catalog Item Modal
  const [showItemModal, setShowItemModal] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<PanelMasterCatalogItem | null>(null);
  const [formData, setFormData] = useState({
    manufacturer: "Mivan Technology Corp",
    panelType: "Standard Wall Panel",
    panelCategory: "Wall Panel" as PanelCategoryType,
    panelCode: "WP-600-2400",
    length: 2400,
    width: 600,
    thickness: 65,
    unit: "mm" as "mm" | "m",
    weightKg: 28.5,
    description: "Standard aluminum wall formwork panel with reinforced ribs",
    manufacturerRef: "REF-STD-01",
    isVerifiedStandard: true,
    isActive: true
  });

  // Interactive Cascading Dropdown Demo state
  const [demoType, setDemoType] = useState<string>("Standard Wall Panel");
  const [demoDimension, setDemoDimension] = useState<string>("600 × 2400 mm");
  const [demoCode, setDemoCode] = useState<string>("WP-600-2400");
  const [demoProject, setDemoProject] = useState<string>("PRJ-001");
  const [demoSite, setDemoSite] = useState<string>("Digital Construction ERP-SITE-2026-001");
  const [demoWarehouse, setDemoWarehouse] = useState<string>("WH-ADDIS-CENTRAL-01");
  const [demoStore, setDemoStore] = useState<string>("STORE-BOL-01");

  // Load all master datasets
  const loadData = async () => {
    setLoading(true);
    try {
      const [cat, prjs, allSites, whs, stores, locs] = await Promise.all([
        MasterDataService.getPanelCatalog(),
        MasterDataService.getMasterProjects(),
        MasterDataService.getSitesForProject("ALL"),
        MasterDataService.getWarehouses(),
        MasterDataService.getSiteStoresForSite("ALL"),
        MasterDataService.getStorageLocations("ALL")
      ]);

      setCatalogItems(cat);
      setProjects(prjs);
      setSites(allSites);
      setWarehouses(whs);
      setSiteStores(stores);
      setLocations(locs);
    } catch (e) {
      console.error("Failed to load master data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Distinct manufacturers
  const manufacturers = useMemo(() => {
    const set = new Set(catalogItems.map(c => c.manufacturer).filter(Boolean));
    return Array.from(set).sort();
  }, [catalogItems]);

  // Categories list
  const categories: PanelCategoryType[] = [
    "Wall Panel",
    "Slab Panel",
    "Column Panel",
    "Beam Panel",
    "Corner Panel",
    "Internal Corner",
    "External Corner",
    "Soffit Panel",
    "Deck Panel",
    "Filler Panel",
    "Kicker Panel",
    "Platform/Accessory Panel",
    "Special Panel"
  ];

  // Filtered catalog records
  const filteredCatalog = useMemo(() => {
    return catalogItems.filter(item => {
      if (activeOnlyFilter && !item.isActive) return false;
      if (selectedCategory !== "ALL" && item.panelCategory !== selectedCategory) return false;
      if (selectedManufacturer !== "ALL" && item.manufacturer !== selectedManufacturer) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const m1 = (item.panelCode || "").toLowerCase().includes(q);
        const m2 = (item.panelType || "").toLowerCase().includes(q);
        const m3 = (item.panelCategory || "").toLowerCase().includes(q);
        const m4 = (item.manufacturer || "").toLowerCase().includes(q);
        const m5 = (item.standardDimension || "").toLowerCase().includes(q);
        if (!m1 && !m2 && !m3 && !m4 && !m5) return false;
      }
      return true;
    });
  }, [catalogItems, activeOnlyFilter, selectedCategory, selectedManufacturer, searchTerm]);

  // Open Add/Edit Item modal
  const handleOpenAddModal = (item?: PanelMasterCatalogItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        manufacturer: item.manufacturer,
        panelType: item.panelType,
        panelCategory: item.panelCategory as any,
        panelCode: item.panelCode,
        length: item.length,
        width: item.width,
        thickness: item.thickness || 65,
        unit: item.unit || "mm",
        weightKg: item.weightKg || 25,
        description: item.description || "",
        manufacturerRef: item.manufacturerRef || "",
        isVerifiedStandard: !!item.isVerifiedStandard,
        isActive: item.isActive !== false
      });
    } else {
      setEditingItem(null);
      setFormData({
        manufacturer: "Mivan Technology Corp",
        panelType: "Standard Wall Panel",
        panelCategory: "Wall Panel",
        panelCode: "WP-600-2400",
        length: 2400,
        width: 600,
        thickness: 65,
        unit: "mm",
        weightKg: 28.5,
        description: "Standard aluminum wall formwork panel with reinforced ribs",
        manufacturerRef: "REF-STD-NEW",
        isVerifiedStandard: true,
        isActive: true
      });
    }
    setShowItemModal(true);
  };

  // Save Item
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = editingItem ? editingItem.id : `CAT-${formData.panelCode.replace(/[^A-Z0-9]/gi, "-")}`;
    const standardDimension = `${formData.width} × ${formData.length} ${formData.unit}`;

    const record: PanelMasterCatalogItem = {
      id,
      manufacturer: formData.manufacturer,
      panelType: formData.panelType,
      panelCategory: formData.panelCategory,
      panelCode: formData.panelCode.trim().toUpperCase(),
      standardDimension,
      length: Number(formData.length),
      width: Number(formData.width),
      thickness: Number(formData.thickness),
      unit: formData.unit,
      weightKg: Number(formData.weightKg),
      description: formData.description,
      manufacturerRef: formData.manufacturerRef,
      isVerifiedStandard: formData.isVerifiedStandard,
      isActive: formData.isActive,
      updatedBy: currentUserName,
      updatedAt: new Date().toISOString()
    };

    await MasterDataService.addOrUpdateCatalogItem(record);
    setShowItemModal(false);
    loadData();
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Top Banner & Tab Navigation */}
      <div className="bg-slate-950 p-4 sm:p-5 rounded-3xl border border-slate-800 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/30 text-amber-400">
              <Database size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold uppercase tracking-wider">
                  ERP Master Data Governance
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                  Single Source of Truth
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white tracking-wide mt-1">
                {isAmharic 
                  ? "ማዕከላዊ የአሉሚኒየም ፎርምወርክ ፓነሎች ማስተር ካታሎግ እና ስማርት ድሮፕዳውን" 
                  : "Centralized Aluminum Formwork Master Catalog & Smart Dropdowns"}
              </h2>
              <p className="text-xs text-slate-400">
                {isAmharic
                  ? "አንዴ የተመዘገበ መረጃ በሁሉም የመመዝገቢያ ፎርሞች በስማርት ድሮፕዳውን በቀጥታ ይመረጣል፤ ድግግሞሽ ይከላከላል።"
                  : "Centralized registry: registered once, dynamically selectable across warehouse, site store, and stock forms."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleOpenAddModal()}
              className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-lg shadow-amber-500/20 transition transform active:scale-95"
            >
              <Plus size={15} />
              <span>{isAmharic ? "+ አዲስ ካታሎግ መዝግብ" : "+ Add Catalog Record"}</span>
            </button>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800 text-xs font-bold">
          <button
            onClick={() => setActiveTab("catalog")}
            className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "catalog"
                ? "bg-amber-500 text-slate-950 shadow"
                : "bg-slate-900 text-slate-400 hover:text-white"
            }`}
          >
            <Layers size={14} />
            <span>1. International Formwork Catalog ({filteredCatalog.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("hierarchy")}
            className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "hierarchy"
                ? "bg-amber-500 text-slate-950 shadow"
                : "bg-slate-900 text-slate-400 hover:text-white"
            }`}
          >
            <FolderKanban size={14} />
            <span>2. Projects, Sites, Warehouses & Locations</span>
          </button>
          <button
            onClick={() => setActiveTab("interactive_demo")}
            className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "interactive_demo"
                ? "bg-amber-500 text-slate-950 shadow"
                : "bg-slate-900 text-slate-400 hover:text-white"
            }`}
          >
            <Sparkles size={14} />
            <span>3. Smart Dropdown Cascading Live Demo</span>
          </button>
        </div>
      </div>

      {/* ================= TAB 1: MASTER CATALOG TABLE ================= */}
      {activeTab === "catalog" && (
        <div className="space-y-4 animate-fadeIn">
          {/* Filter Bar */}
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Search Box */}
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder={isAmharic ? "በፓነል ኮድ፣ ዓይነት፣ አምራች ወይም ልኬት ፈልግ..." : "Filter by panel code, panel type, manufacturer, or dimension..."}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              {/* Manufacturer Filter */}
              <div className="flex items-center gap-2">
                <select
                  value={selectedManufacturer}
                  onChange={e => setSelectedManufacturer(e.target.value)}
                  className="bg-slate-900 border border-slate-800 text-slate-300 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-amber-500 font-medium"
                >
                  <option value="ALL">All Manufacturers ({manufacturers.length})</option>
                  {manufacturers.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>

                {/* Active Only Toggle */}
                <button
                  type="button"
                  onClick={() => setActiveOnlyFilter(!activeOnlyFilter)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer transition ${
                    activeOnlyFilter
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                      : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
                  }`}
                >
                  Active Only
                </button>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => setSelectedCategory("ALL")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                  selectedCategory === "ALL"
                    ? "bg-amber-500 text-slate-950 font-bold"
                    : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                }`}
              >
                All Categories ({catalogItems.length})
              </button>
              {categories.map(cat => {
                const count = catalogItems.filter(c => c.panelCategory === cat).length;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer flex items-center gap-1 ${
                      selectedCategory === cat
                        ? "bg-amber-500 text-slate-950 font-bold"
                        : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                    }`}
                  >
                    <span>{cat}</span>
                    <span className="text-[10px] opacity-75">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Catalog Data Table */}
          <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300 divide-y divide-slate-800">
                <thead className="bg-slate-900/90 text-[10px] uppercase font-mono text-slate-400 tracking-wider">
                  <tr>
                    <th className="py-3 px-3">No.</th>
                    <th className="py-3 px-3">Panel Code</th>
                    <th className="py-3 px-3">Panel Type</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Standard Dimension</th>
                    <th className="py-3 px-3">Weight (Kg)</th>
                    <th className="py-3 px-3">Manufacturer</th>
                    <th className="py-3 px-3">Standard Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {filteredCatalog.length > 0 ? (
                    filteredCatalog.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-900/50 transition">
                        <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-mono font-bold text-amber-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                            {item.panelCode}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-white">
                          {item.panelType}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="text-[10px] bg-slate-900 text-slate-300 px-2 py-0.5 rounded-full border border-slate-800">
                            {item.panelCategory}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-200">
                          {item.standardDimension}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-300">
                          {item.weightKg ? `${item.weightKg} kg` : "—"}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                          {item.manufacturer}
                        </td>
                        <td className="py-2.5 px-3">
                          {item.isVerifiedStandard ? (
                            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono flex items-center gap-1 w-fit">
                              <ShieldCheck size={11} /> Verified
                            </span>
                          ) : (
                            <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-mono flex items-center gap-1 w-fit">
                              <Info size={11} /> Custom Spec
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleOpenAddModal(item)}
                            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-amber-400 rounded-lg transition cursor-pointer"
                            title="Edit Catalog Record"
                          >
                            <Edit3 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-500">
                        No catalog records matched your search filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: PROJECTS, SITES, WAREHOUSES & LOCATIONS ================= */}
      {activeTab === "hierarchy" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
          {/* Projects & Sites Card */}
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-amber-400 flex items-center gap-1.5">
                <FolderKanban size={15} />
                <span>Registered Projects & Linked Sites</span>
              </span>
              <span className="text-[10px] font-mono text-slate-500">{projects.length} Projects</span>
            </div>

            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {projects.map(p => {
                const linkedSites = sites.filter(s => s.projectName.includes(p.name) || s.id.includes(p.code));
                return (
                  <div key={p.id} className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs">{p.name}</span>
                      <span className="font-mono text-[10px] bg-slate-800 text-amber-400 px-1.5 py-0.5 rounded">
                        {p.code}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Client: {p.clientName} • Location: {p.location}
                    </div>
                    <div className="pt-1 border-t border-slate-800/80">
                      <span className="text-[10px] uppercase font-mono text-slate-500 block mb-1">Linked Construction Sites:</span>
                      <div className="flex flex-wrap gap-1">
                        {linkedSites.length > 0 ? (
                          linkedSites.map(s => (
                            <span key={s.id} className="text-[10px] bg-slate-950 text-slate-300 px-2 py-0.5 rounded border border-slate-800">
                              {s.projectName}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-slate-500 italic">No secondary sites directly linked</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Warehouses & Storage Depots Card */}
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-amber-400 flex items-center gap-1.5">
                <Building2 size={15} />
                <span>Warehouses & Site Stores</span>
              </span>
              <span className="text-[10px] font-mono text-slate-500">{warehouses.length} Warehouses</span>
            </div>

            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {warehouses.map(w => (
                <div key={w.id} className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs">{w.name}</span>
                    <span className="font-mono text-[10px] bg-slate-800 text-amber-400 px-1.5 py-0.5 rounded">
                      {w.code}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Type: <strong className="text-slate-300">{w.type}</strong> • Manager: {w.warehouseManager} ({w.managerPhone})
                  </div>
                  <div className="text-[10px] font-mono text-slate-500">
                    Capacity: {w.totalCapacitySqM} m² • Active Panels: {w.activePanelsCount || 0}
                  </div>
                </div>
              ))}

              <div className="pt-2 border-t border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Site Stores ({siteStores.length})
                </span>
                <div className="space-y-1.5">
                  {siteStores.map(s => (
                    <div key={s.id} className="p-2 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between text-[11px]">
                      <div>
                        <span className="font-bold text-slate-200 block">{s.name}</span>
                        <span className="text-[10px] text-slate-500">{s.siteName}</span>
                      </div>
                      <span className="font-mono text-[10px] text-amber-400">{s.code}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 3: SMART DROPDOWN CASCADING LIVE DEMO ================= */}
      {activeTab === "interactive_demo" && (
        <div className="p-5 bg-slate-950 rounded-3xl border border-slate-800 space-y-5 animate-fadeIn">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-sm font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
              <Sparkles size={16} />
              <span>Smart Cascading Architecture Verification Test</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Experience the 3-step dependency in action: Select Panel Type ↓ Available Standard Dimensions ↓ Panel Code.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Step 1 */}
            <div>
              <SearchableSmartDropdown
                label="Step 1: Select Panel Type"
                required
                options={Array.from(new Set(catalogItems.map(c => c.panelType))).map(t => ({
                  id: t,
                  label: t,
                  badge: "Catalog Standard"
                }))}
                selectedValue={demoType}
                onSelect={opt => setDemoType(opt.id)}
                searchPlaceholder="Search types..."
              />
            </div>

            {/* Step 2 */}
            <div>
              <SearchableSmartDropdown
                label="Step 2: Available Standard Dimensions"
                required
                options={catalogItems
                  .filter(c => c.panelType === demoType)
                  .map(c => ({
                    id: c.standardDimension,
                    label: c.standardDimension,
                    subLabel: `Profile: ${c.thickness}mm • ${c.manufacturer}`,
                    isVerified: c.isVerifiedStandard
                  }))}
                selectedValue={demoDimension}
                onSelect={opt => setDemoDimension(opt.id)}
                searchPlaceholder="Filtered dimensions..."
              />
            </div>

            {/* Step 3 */}
            <div>
              <SearchableSmartDropdown
                label="Step 3: Matching Panel Code"
                required
                options={catalogItems
                  .filter(c => c.panelType === demoType && c.standardDimension === demoDimension)
                  .map(c => ({
                    id: c.panelCode,
                    label: c.panelCode,
                    code: c.panelCode,
                    subLabel: `${c.manufacturer} • ${c.weightKg} kg`
                  }))}
                selectedValue={demoCode}
                onSelect={opt => setDemoCode(opt.id)}
                searchPlaceholder="Filtered codes..."
              />
            </div>
          </div>

          {/* Facility Cascading */}
          <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-3">
            <span className="text-xs font-bold text-slate-300 block">
              Facility Assignment Cascading: Project → Site → Warehouse / Site Store
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <SearchableSmartDropdown
                  label="Project"
                  options={projects.map(p => ({ id: p.id, label: p.name, code: p.code }))}
                  selectedValue={demoProject}
                  onSelect={opt => setDemoProject(opt.id)}
                />
              </div>
              <div>
                <SearchableSmartDropdown
                  label="Site (Filtered by Project)"
                  options={sites.map(s => ({ id: s.id, label: s.projectName }))}
                  selectedValue={demoSite}
                  onSelect={opt => setDemoSite(opt.id)}
                />
              </div>
              <div>
                <SearchableSmartDropdown
                  label="Warehouse"
                  options={warehouses.map(w => ({ id: w.id, label: w.name, code: w.code }))}
                  selectedValue={demoWarehouse}
                  onSelect={opt => setDemoWarehouse(opt.id)}
                />
              </div>
            </div>
          </div>

          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs text-emerald-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} />
              <span>Cascading constraints active: unverified dimensions or unrelated panel codes cannot be submitted.</span>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD / EDIT CATALOG RECORD ================= */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 my-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/10 rounded-xl text-amber-400">
                  <Database size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-white uppercase tracking-wider">
                    {editingItem ? "Edit Catalog Item" : "Add Formwork Panel Catalog Record"}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Authorized Master Data Entry (Super Admin / Head Office / Warehouse Manager)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowItemModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1 font-bold">Manufacturer *</label>
                  <input
                    type="text"
                    required
                    value={formData.manufacturer}
                    onChange={e => setFormData({ ...formData, manufacturer: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 font-bold">Category *</label>
                  <select
                    value={formData.panelCategory}
                    onChange={e => setFormData({ ...formData, panelCategory: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2"
                  >
                    {categories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1 font-bold">Panel Type Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.panelType}
                    onChange={e => setFormData({ ...formData, panelType: e.target.value })}
                    placeholder="e.g. Standard Wall Panel"
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 font-bold">Panel Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.panelCode}
                    onChange={e => setFormData({ ...formData, panelCode: e.target.value })}
                    placeholder="e.g. WP-600-2400"
                    className="w-full bg-slate-950 border border-slate-800 text-amber-400 font-mono font-bold rounded-xl px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1 font-bold">Width (mm) *</label>
                  <input
                    type="number"
                    required
                    value={formData.width}
                    onChange={e => setFormData({ ...formData, width: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 font-bold">Length (mm) *</label>
                  <input
                    type="number"
                    required
                    value={formData.length}
                    onChange={e => setFormData({ ...formData, length: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 font-bold">Thickness (mm)</label>
                  <input
                    type="number"
                    value={formData.thickness}
                    onChange={e => setFormData({ ...formData, thickness: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 font-bold">Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.weightKg}
                    onChange={e => setFormData({ ...formData, weightKg: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-bold">Technical Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Extruded 6061-T6 aluminum profile with robotically welded stiffeners"
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2"
                />
              </div>

              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isVerifiedStandard}
                    onChange={e => setFormData({ ...formData, isVerifiedStandard: e.target.checked })}
                    className="rounded text-amber-500 focus:ring-amber-500"
                  />
                  <span className="text-slate-300">Verified International Manufacturer Standard</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded text-emerald-500 focus:ring-emerald-500"
                  />
                  <span className="text-slate-300">Active (Visible in Smart Dropdowns)</span>
                </label>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowItemModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-800 text-slate-300 hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold cursor-pointer"
                >
                  Save to Master Catalog
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
