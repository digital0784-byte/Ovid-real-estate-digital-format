import React, { useState } from "react";
import {
  Search,
  Plus,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Wrench,
  Boxes,
  Truck,
  ArrowUpRight,
  ArrowDownLeft,
  RotateCcw,
  BarChart3,
  Layers,
  Settings,
  QrCode,
  Barcode,
  Edit,
  Trash2,
  Eye,
  Info,
  ShieldCheck,
  FileText,
  DollarSign,
  Building2,
  Package,
  Clock,
  Sparkles,
  Download,
  PlusCircle,
  HelpCircle,
  SlidersHorizontal,
  Printer,
  Check,
  Image as ImageIcon,
  ExternalLink,
  Power,
  ChevronDown,
  X
} from "lucide-react";
import {
  FormworkAccessoryRecord,
  AccessoryMovementLog,
  AccessoryMaintenanceRecord,
} from "../types";
import {
  ACCESSORY_CATEGORIES as INITIAL_CATEGORIES,
  ACCESSORY_MATERIALS,
  ACCESSORY_UNITS,
  INITIAL_PRESET_SIZES,
  INITIAL_ACCESSORY_MASTER_DATABASE,
} from "../data/accessoryMasterDatabase";

interface AccessoryMasterDatabaseViewProps {
  accessories?: FormworkAccessoryRecord[];
  onUpdateAccessories?: (updated: FormworkAccessoryRecord[]) => void;
}

export const AccessoryMasterDatabaseView: React.FC<AccessoryMasterDatabaseViewProps> = ({
  accessories: externalAccessories,
  onUpdateAccessories,
}) => {
  // Master Inventory Items State
  const [items, setItems] = useState<FormworkAccessoryRecord[]>(
    externalAccessories || INITIAL_ACCESSORY_MASTER_DATABASE
  );

  // Settings Dynamic Master Categories & Sizes State
  const [categories, setCategories] = useState<string[]>(INITIAL_CATEGORIES);
  const [presetSizes, setPresetSizes] = useState<{ id: string; name: string; category: string; active: boolean }[]>(
    INITIAL_PRESET_SIZES
  );

  // Movement & Maintenance Logs State
  const [movementLogs, setMovementLogs] = useState<AccessoryMovementLog[]>([
    {
      id: "ACC-MV-1001",
      accessoryId: "ACC-1001",
      accessoryCode: "PW-1650",
      accessoryName: "Standard Pin & Wedge Set 16x50mm",
      transactionType: "Issue to Site",
      quantity: 1200,
      fromLocation: "Central Yard - Rack A-01",
      toLocation: "Tower A - Floor 4 - Zone A",
      projectName: "Commercial Tower Project",
      building: "Tower A",
      floor: 4,
      zone: "Zone A",
      handledBy: "Abebe Kebede (Store Manager)",
      driverName: "Tewodros Kassaye",
      truckPlate: "ET-3-89012",
      notes: "Issued for wall panel assembly on floor 4.",
      timestamp: "2026-07-24 09:30 AM",
    },
    {
      id: "ACC-MV-1002",
      accessoryId: "ACC-1009",
      accessoryCode: "PRP-1525",
      accessoryName: "Turnbuckle Push-Pull Prop (1.5m - 2.5m)",
      transactionType: "Return from Site",
      quantity: 80,
      goodConditionQty: 75,
      damagedQty: 3,
      missingQty: 2,
      fromLocation: "Block B - Floor 2",
      toLocation: "Central Yard - Heavy Yard Section D",
      projectName: "Residential Complex B",
      handledBy: "Fikru Tolossa (Supervisor)",
      driverName: "Dawit Wolde",
      truckPlate: "ET-2-55412",
      notes: "3 units routed to maintenance for thread re-greasing.",
      timestamp: "2026-07-23 04:15 PM",
    },
  ]);

  const [maintenanceRecords, setMaintenanceRecords] = useState<AccessoryMaintenanceRecord[]>([
    {
      id: "ACC-MNT-1001",
      accessoryId: "ACC-1009",
      accessoryCode: "PRP-1525",
      accessoryName: "Turnbuckle Push-Pull Prop (1.5m - 2.5m)",
      maintenanceType: "Thread Retapping",
      conditionRating: "80% Good",
      technician: "Mulugeta Haile (Senior Mechanic)",
      cost: 45.0,
      details: "Re-threaded turnbuckle collar and applied anti-rust zinc coating.",
      maintenanceDate: "2026-07-22",
      nextScheduledDate: "2026-10-22",
    },
  ]);

  // Active View Tabs
  const [activeTab, setActiveTab] = useState<
    "inventory" | "movements" | "maintenance" | "integrations" | "settings"
  >("inventory");

  // Filtering State
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [materialFilter, setMaterialFilter] = useState("All");

  // Modals state
  const [selectedAccessory, setSelectedAccessory] = useState<FormworkAccessoryRecord | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAccessory, setEditingAccessory] = useState<FormworkAccessoryRecord | null>(null);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);

  // Settings Management Modals
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showAddSizeModal, setShowAddSizeModal] = useState(false);
  const [newSizeForm, setNewSizeForm] = useState({ name: "", category: categories[0] || "Fasteners & Pins" });

  // QR Code Label Generator & Printing State
  const [showQrPrintModal, setShowQrPrintModal] = useState(false);
  const [qrModalItem, setQrModalItem] = useState<FormworkAccessoryRecord | null>(null);
  const [labelCopies, setLabelCopies] = useState<number>(2);
  const [labelFormat, setLabelFormat] = useState<"thermal" | "industrial" | "grid_a4">("thermal");
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);

  // Form states for Add / Edit
  const [formData, setFormData] = useState<Partial<FormworkAccessoryRecord>>({
    code: "",
    name: "",
    category: categories[0] || "Fasteners & Pins",
    description: "",
    material: ACCESSORY_MATERIALS[0],
    size: "",
    unit: ACCESSORY_UNITS[0],
    weightKg: 0.5,
    compatiblePanelTypes: ["Internal Wall Panels", "External Wall Panels"],
    minStock: 100,
    maxStock: 1000,
    currentStock: 500,
    issuedStock: 0,
    inMaintenanceStock: 0,
    warehouseLocation: "Central Yard - Rack A-01",
    supplier: "SANY Formwork Hardware Co.",
    manufacturer: "Jiangsu Heavy Hardware Corp",
    purchasePrice: 5.0,
    rentalPrice: 0.2,
    photoUrl: "",
    status: "Available",
  });

  const [duplicateError, setDuplicateError] = useState("");

  // Searchable Dropdown States for Modals
  const [issueSearch, setIssueSearch] = useState("");
  const [isIssueDropdownOpen, setIsIssueDropdownOpen] = useState(false);

  const [returnSearch, setReturnSearch] = useState("");
  const [isReturnDropdownOpen, setIsReturnDropdownOpen] = useState(false);

  const [maintSearch, setMaintSearch] = useState("");
  const [isMaintDropdownOpen, setIsMaintDropdownOpen] = useState(false);

  // Issue Form State
  const [issueForm, setIssueForm] = useState({
    accessoryId: "",
    quantity: 10,
    projectName: "Commercial Tower Project",
    building: "Tower A",
    floor: 1,
    zone: "Zone A",
    driverName: "",
    truckPlate: "",
    notes: "",
  });

  // Return Form State
  const [returnForm, setReturnForm] = useState({
    accessoryId: "",
    goodQty: 10,
    damagedQty: 0,
    missingQty: 0,
    projectName: "Commercial Tower Project",
    notes: "",
  });

  // Maintenance Form State
  const [maintForm, setMaintForm] = useState({
    accessoryId: "",
    maintenanceType: "Cleaning & Oiling",
    conditionRating: "80% Good",
    technician: "Mulugeta Haile",
    cost: 25,
    details: "",
  });

  // Sync Helper
  const updateItemsList = (newList: FormworkAccessoryRecord[]) => {
    setItems(newList);
    if (onUpdateAccessories) {
      onUpdateAccessories(newList);
    }
  };

  // Filtered Inventory List
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      !searchQuery ||
      item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.warehouseLocation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.supplier.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.material.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = categoryFilter === "All" || item.category === categoryFilter;
    const matchesStatus = statusFilter === "All" || item.status === statusFilter;
    const matchesMaterial = materialFilter === "All" || item.material === materialFilter;

    return matchesSearch && matchesCategory && matchesStatus && matchesMaterial;
  });

  // Key KPI Calculations
  const totalAccessoryTypes = items.length;
  const totalStockQty = items.reduce((acc, curr) => acc + curr.currentStock, 0);
  const totalIssuedQty = items.reduce((acc, curr) => acc + curr.issuedStock, 0);
  const totalValuation = items.reduce(
    (acc, curr) => acc + curr.currentStock * curr.purchasePrice,
    0
  );
  const lowStockCount = items.filter(
    (item) => item.currentStock <= item.minStock && item.currentStock > 0 && item.status !== "Deactivated"
  ).length;
  const outOfStockCount = items.filter((item) => item.currentStock === 0 && item.status !== "Deactivated").length;

  // Handle New Accessory Submission with Duplicate Prevention
  const handleSaveNewAccessory = (e: React.FormEvent) => {
    e.preventDefault();
    setDuplicateError("");

    if (!formData.code || !formData.name) {
      setDuplicateError("Accessory Code and Name are required.");
      return;
    }

    const duplicateCode = items.some(
      (item) => item.code.trim().toLowerCase() === formData.code?.trim().toLowerCase()
    );
    const duplicateName = items.some(
      (item) => item.name.trim().toLowerCase() === formData.name?.trim().toLowerCase()
    );

    if (duplicateCode) {
      setDuplicateError(`Accessory Code '${formData.code}' already exists in the master database.`);
      return;
    }

    if (duplicateName) {
      setDuplicateError(`Accessory Name '${formData.name}' already exists in the master database.`);
      return;
    }

    const newId = `ACC-${1000 + items.length + 1}`;
    const newRecord: FormworkAccessoryRecord = {
      id: newId,
      code: formData.code!.trim().toUpperCase(),
      name: formData.name!.trim(),
      category: formData.category || categories[0],
      description: formData.description || "Standard aluminum formwork accessory.",
      material: formData.material || ACCESSORY_MATERIALS[0],
      size: formData.size || "Standard",
      unit: formData.unit || "Pcs",
      weightKg: Number(formData.weightKg) || 0.5,
      compatiblePanelTypes: formData.compatiblePanelTypes || [
        "Internal Wall Panels",
        "External Wall Panels",
      ],
      minStock: Number(formData.minStock) || 50,
      maxStock: Number(formData.maxStock) || 500,
      currentStock: Number(formData.currentStock) || 100,
      issuedStock: 0,
      inMaintenanceStock: 0,
      warehouseLocation: formData.warehouseLocation || "Central Yard - Bin A-01",
      supplier: formData.supplier || "SANY Formwork Hardware Co.",
      manufacturer: formData.manufacturer || "Jiangsu Heavy Hardware Corp",
      purchasePrice: Number(formData.purchasePrice) || 5.0,
      rentalPrice: Number(formData.rentalPrice) || 0.2,
      barcode: `BAR-890123-${items.length + 100}`,
      qrCode: `QR-${newId}-${formData.code}`,
      serialNumber: `SN-${formData.code}-2026`,
      status: Number(formData.currentStock) > 0 ? "Available" : "Out of Stock",
      photoUrl: formData.photoUrl || "",
      isCustom: true,
      createdAt: new Date().toISOString(),
    };

    updateItemsList([newRecord, ...items]);
    setShowAddModal(false);
    setFormData({
      code: "",
      name: "",
      category: categories[0],
      description: "",
      size: "",
      currentStock: 100,
      minStock: 50,
      maxStock: 500,
      weightKg: 0.5,
      photoUrl: "",
    });
  };

  // Open Edit Modal
  const handleOpenEditModal = (item: FormworkAccessoryRecord) => {
    setEditingAccessory(item);
    setFormData({ ...item });
    setDuplicateError("");
    setShowEditModal(true);
  };

  // Save Edit Accessory with Duplicate Prevention
  const handleSaveEditAccessory = (e: React.FormEvent) => {
    e.preventDefault();
    setDuplicateError("");

    if (!editingAccessory || !formData.code || !formData.name) return;

    // Check duplicate code or name against other items
    const duplicateCode = items.some(
      (item) => item.id !== editingAccessory.id && item.code.trim().toLowerCase() === formData.code?.trim().toLowerCase()
    );
    const duplicateName = items.some(
      (item) => item.id !== editingAccessory.id && item.name.trim().toLowerCase() === formData.name?.trim().toLowerCase()
    );

    if (duplicateCode) {
      setDuplicateError(`Accessory Code '${formData.code}' is used by another record.`);
      return;
    }

    if (duplicateName) {
      setDuplicateError(`Accessory Name '${formData.name}' is used by another record.`);
      return;
    }

    const updated = items.map((item) => {
      if (item.id === editingAccessory.id) {
        const currStock = Number(formData.currentStock) ?? item.currentStock;
        return {
          ...item,
          code: formData.code!.trim().toUpperCase(),
          name: formData.name!.trim(),
          category: formData.category || item.category,
          material: formData.material || item.material,
          size: formData.size || item.size,
          unit: formData.unit || item.unit,
          weightKg: Number(formData.weightKg) || item.weightKg,
          minStock: Number(formData.minStock) || item.minStock,
          maxStock: Number(formData.maxStock) || item.maxStock,
          currentStock: currStock,
          warehouseLocation: formData.warehouseLocation || item.warehouseLocation,
          supplier: formData.supplier || item.supplier,
          manufacturer: formData.manufacturer || item.manufacturer,
          purchasePrice: Number(formData.purchasePrice) || item.purchasePrice,
          rentalPrice: Number(formData.rentalPrice) || item.rentalPrice,
          description: formData.description || item.description,
          photoUrl: formData.photoUrl || "",
          status: item.status === "Deactivated" ? "Deactivated" : currStock === 0 ? "Out of Stock" : currStock <= (formData.minStock || item.minStock) ? "Low Stock" : "Available",
          updatedAt: new Date().toISOString(),
        };
      }
      return item;
    });

    updateItemsList(updated);
    setShowEditModal(false);
    setEditingAccessory(null);
  };

  // Toggle Deactivation / Reactivation
  const handleToggleStatus = (id: string) => {
    const updated = items.map((item) => {
      if (item.id === id) {
        const isDeactivated = item.status === "Deactivated";
        const newStatus = isDeactivated
          ? item.currentStock === 0
            ? "Out of Stock"
            : item.currentStock <= item.minStock
            ? "Low Stock"
            : "Available"
          : "Deactivated";
        return { ...item, status: newStatus as any };
      }
      return item;
    });
    updateItemsList(updated);
  };

  // Handle Issue Accessory
  const handleIssueSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueForm.accessoryId) return;

    const targetIndex = items.findIndex((i) => i.id === issueForm.accessoryId);
    if (targetIndex === -1) return;

    const target = items[targetIndex];
    if (target.currentStock < issueForm.quantity) {
      alert("Cannot issue more quantity than current available stock.");
      return;
    }

    const updated = [...items];
    const newStock = target.currentStock - issueForm.quantity;
    const newIssued = target.issuedStock + issueForm.quantity;

    updated[targetIndex] = {
      ...target,
      currentStock: newStock,
      issuedStock: newIssued,
      status: target.status === "Deactivated" ? "Deactivated" : newStock === 0 ? "Out of Stock" : newStock <= target.minStock ? "Low Stock" : "Available",
    };

    updateItemsList(updated);

    const newLog: AccessoryMovementLog = {
      id: `ACC-MV-${1000 + movementLogs.length + 1}`,
      accessoryId: target.id,
      accessoryCode: target.code,
      accessoryName: target.name,
      transactionType: "Issue to Site",
      quantity: issueForm.quantity,
      fromLocation: target.warehouseLocation,
      toLocation: `${issueForm.projectName} - ${issueForm.building} (${issueForm.zone})`,
      projectName: issueForm.projectName,
      building: issueForm.building,
      floor: issueForm.floor,
      zone: issueForm.zone,
      handledBy: "Store Manager",
      driverName: issueForm.driverName || "Site Driver",
      truckPlate: issueForm.truckPlate || "ET-TRUCK",
      notes: issueForm.notes,
      timestamp: new Date().toLocaleString(),
    };

    setMovementLogs([newLog, ...movementLogs]);
    setShowIssueModal(false);
  };

  // Handle Return Accessory
  const handleReturnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnForm.accessoryId) return;

    const targetIndex = items.findIndex((i) => i.id === returnForm.accessoryId);
    if (targetIndex === -1) return;

    const target = items[targetIndex];
    const updated = [...items];

    const totalReturn = returnForm.goodQty + returnForm.damagedQty;
    const newStock = target.currentStock + returnForm.goodQty;
    const newIssued = Math.max(0, target.issuedStock - totalReturn);
    const newMaint = target.inMaintenanceStock + returnForm.damagedQty;

    updated[targetIndex] = {
      ...target,
      currentStock: newStock,
      issuedStock: newIssued,
      inMaintenanceStock: newMaint,
      status: target.status === "Deactivated" ? "Deactivated" : newStock <= target.minStock ? "Low Stock" : "Available",
    };

    updateItemsList(updated);

    const newLog: AccessoryMovementLog = {
      id: `ACC-MV-${1000 + movementLogs.length + 1}`,
      accessoryId: target.id,
      accessoryCode: target.code,
      accessoryName: target.name,
      transactionType: "Return from Site",
      quantity: totalReturn,
      goodConditionQty: returnForm.goodQty,
      damagedQty: returnForm.damagedQty,
      missingQty: returnForm.missingQty,
      fromLocation: returnForm.projectName,
      toLocation: target.warehouseLocation,
      projectName: returnForm.projectName,
      handledBy: "Store Inspector",
      notes: returnForm.notes || `Returned ${returnForm.goodQty} good, ${returnForm.damagedQty} damaged.`,
      timestamp: new Date().toLocaleString(),
    };

    setMovementLogs([newLog, ...movementLogs]);
    setShowReturnModal(false);
  };

  // Add Category Handler in Settings
  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    if (categories.some((c) => c.toLowerCase() === newCategoryName.trim().toLowerCase())) {
      alert("Category already exists!");
      return;
    }
    setCategories([...categories, newCategoryName.trim()]);
    setNewCategoryName("");
    setShowAddCategoryModal(false);
  };

  // Add Preset Size Handler in Settings
  const handleAddSize = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSizeForm.name.trim()) return;
    const newObj = {
      id: `SZ-${10 + presetSizes.length + 1}`,
      name: newSizeForm.name.trim(),
      category: newSizeForm.category,
      active: true,
    };
    setPresetSizes([...presetSizes, newObj]);
    setNewSizeForm({ name: "", category: categories[0] });
    setShowAddSizeModal(false);
  };

  // Toggle Size Active
  const handleToggleSizeActive = (id: string) => {
    setPresetSizes(
      presetSizes.map((s) => (s.id === id ? { ...s, active: !s.active } : s))
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Navigation Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 text-white rounded-2xl p-6 shadow-xl border border-amber-500/20 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-10">
          <Boxes className="w-64 h-64 text-amber-300" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3 mb-1">
              <span className="px-3 py-1 bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-md">
                MASTER ACCESSORY LIBRARY
              </span>
              <span className="text-amber-300/80 text-xs font-mono font-medium">
                የአሉሚኒየም ፎርምዎርክ አክሰሰሪዎች ማስተር ዳታቤዝ
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Aluminum Formwork Accessories Master System
            </h1>
            <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-3xl">
              Worldwide standard aluminum formwork hardware catalog. Includes pin & wedge fasteners, wall ties, turnbuckle shoring props, corner keys, alignment walers, and safety brackets with barcode/QR tracking, duplicate prevention, and cross-module sync.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setFormData({
                  code: "",
                  name: "",
                  category: categories[0],
                  description: "",
                  size: "",
                  currentStock: 100,
                  minStock: 50,
                  maxStock: 500,
                  weightKg: 0.5,
                  photoUrl: "",
                });
                setDuplicateError("");
                setShowAddModal(true);
              }}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg transition flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Accessory</span>
            </button>

            <button
              onClick={() => {
                setQrModalItem(null);
                setSelectedBatchIds(items.map((i) => i.id));
                setShowQrPrintModal(true);
              }}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 font-bold text-xs rounded-xl transition flex items-center space-x-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>Print Labels</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Categories / Items</span>
            <Boxes className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <div className="text-xl font-black text-slate-900 font-mono">{totalAccessoryTypes} Types</div>
            <div className="text-[10px] text-slate-400 font-medium">{categories.length} Worldwide Categories</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Warehouse Stock</span>
            <Package className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <div className="text-xl font-black text-emerald-600 font-mono">
              {totalStockQty.toLocaleString()}
            </div>
            <div className="text-[10px] text-emerald-700 font-semibold">Available Units in Yard</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Issued On Construction Sites</span>
            <Truck className="w-4 h-4 text-sky-600" />
          </div>
          <div>
            <div className="text-xl font-black text-sky-600 font-mono">
              {totalIssuedQty.toLocaleString()}
            </div>
            <div className="text-[10px] text-sky-700 font-medium">Deployed Active Accessories</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Asset Valuation</span>
            <DollarSign className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <div className="text-xl font-black text-slate-900 font-mono">
              ${totalValuation.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-indigo-600 font-medium">Inventory Capital Value</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Alerts & Reorders</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div>
            <div className="text-xl font-black text-rose-600 font-mono">
              {lowStockCount + outOfStockCount} Items
            </div>
            <div className="text-[10px] text-rose-700 font-medium">
              {lowStockCount} Low | {outOfStockCount} Out of Stock
            </div>
          </div>
        </div>
      </div>

      {/* Main View Tab Selector */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2 overflow-x-auto text-xs font-bold">
        <button
          onClick={() => setActiveTab("inventory")}
          className={`px-4 py-2 rounded-xl transition flex items-center space-x-2 ${
            activeTab === "inventory"
              ? "bg-slate-900 text-amber-400 shadow"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>Accessory Inventory Master ({filteredItems.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("movements")}
          className={`px-4 py-2 rounded-xl transition flex items-center space-x-2 ${
            activeTab === "movements"
              ? "bg-slate-900 text-amber-400 shadow"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Issue & Return Ledger ({movementLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("maintenance")}
          className={`px-4 py-2 rounded-xl transition flex items-center space-x-2 ${
            activeTab === "maintenance"
              ? "bg-slate-900 text-amber-400 shadow"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <Wrench className="w-4 h-4" />
          <span>Servicing & Maintenance ({maintenanceRecords.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("integrations")}
          className={`px-4 py-2 rounded-xl transition flex items-center space-x-2 ${
            activeTab === "integrations"
              ? "bg-slate-900 text-amber-400 shadow"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Module Integrations Hub</span>
        </button>

        <button
          onClick={() => setActiveTab("settings")}
          className={`px-4 py-2 rounded-xl transition flex items-center space-x-2 ${
            activeTab === "settings"
              ? "bg-slate-900 text-amber-400 shadow"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Admin Governance & Settings</span>
        </button>
      </div>

      {/* --- TAB 1: MASTER ACCESSORY INVENTORY CATALOG --- */}
      {activeTab === "inventory" && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Autocomplete search by code, name, location, or supplier..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center space-x-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
                <Filter className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-transparent text-xs font-medium text-slate-700 focus:outline-none py-1 px-1"
                >
                  <option value="All">All Categories ({categories.length})</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-transparent text-xs font-medium text-slate-700 focus:outline-none py-1 px-1"
                >
                  <option value="All">All Statuses</option>
                  <option value="Available">Available</option>
                  <option value="Low Stock">Low Stock</option>
                  <option value="Out of Stock">Out of Stock</option>
                  <option value="Deactivated">Deactivated</option>
                </select>
              </div>

              <div className="flex items-center space-x-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
                <select
                  value={materialFilter}
                  onChange={(e) => setMaterialFilter(e.target.value)}
                  className="bg-transparent text-xs font-medium text-slate-700 focus:outline-none py-1 px-1"
                >
                  <option value="All">All Materials</option>
                  {ACCESSORY_MATERIALS.map((mat) => (
                    <option key={mat} value={mat}>
                      {mat}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => {
                  setIssueSearch("");
                  setIssueForm({ ...issueForm, accessoryId: filteredItems[0]?.id || "" });
                  setShowIssueModal(true);
                }}
                className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-lg shadow transition flex items-center space-x-1"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Issue To Site</span>
              </button>

              <button
                onClick={() => {
                  setReturnSearch("");
                  setReturnForm({ ...returnForm, accessoryId: filteredItems[0]?.id || "" });
                  setShowReturnModal(true);
                }}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow transition flex items-center space-x-1"
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
                <span>Receive Return</span>
              </button>
            </div>
          </div>

          {/* Table View */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                    <th className="py-3 px-4">Photo & Code</th>
                    <th className="py-3 px-4">Accessory Name & Category</th>
                    <th className="py-3 px-4">Material & Size</th>
                    <th className="py-3 px-4">Unit Weight</th>
                    <th className="py-3 px-4">Stock Levels</th>
                    <th className="py-3 px-4">Storage Location</th>
                    <th className="py-3 px-4">Purchase / Rental Price</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        No accessories found matching the search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => {
                      const isLowStock = item.currentStock <= item.minStock && item.currentStock > 0 && item.status !== "Deactivated";
                      const isOutOfStock = item.currentStock === 0 && item.status !== "Deactivated";

                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-amber-50/40 transition-colors ${
                            item.status === "Deactivated" ? "opacity-60 bg-slate-50" : ""
                          }`}
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-2">
                              {item.photoUrl ? (
                                <img
                                  src={item.photoUrl}
                                  alt={item.name}
                                  className="w-9 h-9 rounded-lg object-cover border border-slate-200 shrink-0"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = "none";
                                  }}
                                />
                              ) : (
                                <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs shrink-0 border border-amber-200">
                                  {item.code.substring(0, 3)}
                                </div>
                              )}
                              <div>
                                <div className="font-mono font-bold text-amber-600 flex items-center gap-1">
                                  {item.code}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono">{item.id}</div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900">{item.name}</div>
                            <div className="text-[10px] text-slate-500">{item.category}</div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-medium text-slate-800">{item.material}</div>
                            <div className="text-[10px] text-slate-500">Size: {item.size}</div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-mono">{item.weightKg} kg</div>
                            <div className="text-[10px] text-slate-400">{item.unit}</div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-2">
                              <span
                                className={`font-mono font-bold text-sm ${
                                  item.status === "Deactivated"
                                    ? "text-slate-400"
                                    : isOutOfStock
                                    ? "text-rose-600"
                                    : isLowStock
                                    ? "text-amber-600"
                                    : "text-emerald-600"
                                }`}
                              >
                                {item.currentStock.toLocaleString()} {item.unit}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Min: {item.minStock} | Max: {item.maxStock} | Issued: {item.issuedStock}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-medium text-slate-800">{item.warehouseLocation}</div>
                            <div className="text-[10px] text-slate-400">{item.supplier}</div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-mono font-semibold text-slate-900">
                              ${item.purchasePrice.toFixed(2)}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              ${item.rentalPrice.toFixed(2)}/day
                            </div>
                          </td>

                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                                item.status === "Deactivated"
                                  ? "bg-slate-200 text-slate-600"
                                  : item.status === "Available"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : item.status === "Low Stock"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-rose-100 text-rose-800"
                              }`}
                            >
                              {item.status}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end space-x-1">
                              <button
                                onClick={() => {
                                  setSelectedAccessory(item);
                                  setShowDetailModal(true);
                                }}
                                className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded"
                                title="View Specs & Photo"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => handleOpenEditModal(item)}
                                className="p-1.5 text-sky-600 hover:text-sky-800 hover:bg-sky-50 rounded"
                                title="Edit Accessory Details"
                              >
                                <Edit className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => {
                                  setQrModalItem(item);
                                  setSelectedBatchIds([item.id]);
                                  setShowQrPrintModal(true);
                                }}
                                className="p-1.5 text-amber-700 hover:text-amber-900 hover:bg-amber-100 rounded"
                                title="Print QR Sticker Labels"
                              >
                                <Printer className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => handleToggleStatus(item.id)}
                                className={`p-1.5 rounded text-xs font-semibold ${
                                  item.status === "Deactivated"
                                    ? "text-emerald-600 hover:bg-emerald-50"
                                    : "text-rose-600 hover:bg-rose-50"
                                }`}
                                title={
                                  item.status === "Deactivated" ? "Reactivate Item" : "Deactivate Item"
                                }
                              >
                                <Power className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 2: ISSUE & RETURN LEDGER --- */}
      {activeTab === "movements" && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Site Store Issue & Return Ledger</h3>
              <p className="text-xs text-slate-500">
                Track full dispatch history, site locations, truck plate numbers, and damaged/missing counts.
              </p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  setIssueSearch("");
                  setShowIssueModal(true);
                }}
                className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-lg shadow"
              >
                + Issue Gate Pass
              </button>
              <button
                onClick={() => {
                  setReturnSearch("");
                  setShowReturnModal(true);
                }}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow"
              >
                + Receive Site Return
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-bold uppercase text-slate-500 border-b border-slate-200">
                  <th className="py-2.5 px-3">Log Ref & Date</th>
                  <th className="py-2.5 px-3">Transaction Type</th>
                  <th className="py-2.5 px-3">Accessory Item</th>
                  <th className="py-2.5 px-3">Quantity</th>
                  <th className="py-2.5 px-3">From Location</th>
                  <th className="py-2.5 px-3">To Location</th>
                  <th className="py-2.5 px-3">Driver & Truck Plate</th>
                  <th className="py-2.5 px-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {movementLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3">
                      <div className="font-mono font-bold text-slate-900">{log.id}</div>
                      <div className="text-[10px] text-slate-400">{log.timestamp}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.transactionType === "Issue to Site"
                            ? "bg-sky-100 text-sky-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {log.transactionType}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">{log.accessoryCode}</div>
                      <div className="text-[10px] text-slate-500">{log.accessoryName}</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-mono font-bold text-slate-900">{log.quantity.toLocaleString()} Pcs</div>
                      {log.damagedQty !== undefined && log.damagedQty > 0 && (
                        <div className="text-[10px] text-amber-600">Damaged: {log.damagedQty}</div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-600">{log.fromLocation}</td>
                    <td className="py-3 px-3 font-medium text-slate-900">{log.toLocation}</td>
                    <td className="py-3 px-3">
                      <div>{log.driverName || "N/A"}</div>
                      <div className="font-mono text-[10px] text-slate-400">{log.truckPlate}</div>
                    </td>
                    <td className="py-3 px-3 text-slate-500 italic max-w-xs">{log.notes || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB 3: SERVICING & MAINTENANCE HISTORY --- */}
      {activeTab === "maintenance" && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Accessory Maintenance & Refurbishment</h3>
              <p className="text-xs text-slate-500">
                Log thread retapping, anti-rust oiling, prop collar straightening, and welding repairs.
              </p>
            </div>
            <button
              onClick={() => {
                setMaintSearch("");
                setShowMaintenanceModal(true);
              }}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-lg shadow"
            >
              + Log Servicing Action
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-bold uppercase text-slate-500 border-b border-slate-200">
                  <th className="py-2.5 px-3">Service Ref</th>
                  <th className="py-2.5 px-3">Accessory</th>
                  <th className="py-2.5 px-3">Service Type</th>
                  <th className="py-2.5 px-3">Condition Rating</th>
                  <th className="py-2.5 px-3">Technician</th>
                  <th className="py-2.5 px-3">Cost ($)</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {maintenanceRecords.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-mono font-bold text-amber-700">{m.id}</td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">{m.accessoryCode}</div>
                      <div className="text-[10px] text-slate-500">{m.accessoryName}</div>
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-800">{m.maintenanceType}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded">
                        {m.conditionRating}
                      </span>
                    </td>
                    <td className="py-3 px-3">{m.technician}</td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">${m.cost.toFixed(2)}</td>
                    <td className="py-3 px-3">{m.maintenanceDate}</td>
                    <td className="py-3 px-3 text-slate-500 italic max-w-xs">{m.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB 4: MODULE INTEGRATIONS HUB --- */}
      {activeTab === "integrations" && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <h3 className="text-base font-bold text-slate-900">ERP Ecosystem Module Integration Hub</h3>
            <p className="text-xs text-slate-500">
              The Master Accessory Library synchronizes bidirectionally with all 8 core ERP construction modules.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-amber-400 transition space-y-2">
              <div className="flex items-center space-x-2 text-amber-700 font-bold">
                <Boxes className="w-4 h-4" />
                <span>Warehouse Module</span>
              </div>
              <p className="text-slate-600 text-[11px]">
                Central yard storage bin locations, inventory valuation, and minimum stock threshold reorder alerts.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-amber-400 transition space-y-2">
              <div className="flex items-center space-x-2 text-sky-700 font-bold">
                <Building2 className="w-4 h-4" />
                <span>Site Store Module</span>
              </div>
              <p className="text-slate-600 text-[11px]">
                Site gate-pass issuing, storekeeper receipt verification, and project zone tracking.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-amber-400 transition space-y-2">
              <div className="flex items-center space-x-2 text-indigo-700 font-bold">
                <Package className="w-4 h-4" />
                <span>Procurement Module</span>
              </div>
              <p className="text-slate-600 text-[11px]">
                Supplier purchase order generation, unit pricing catalogs, and manufacturer specs.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-amber-400 transition space-y-2">
              <div className="flex items-center space-x-2 text-emerald-700 font-bold">
                <Wrench className="w-4 h-4" />
                <span>Installation & Dismantling</span>
              </div>
              <p className="text-slate-600 text-[11px]">
                Pin-to-panel ratios, wedge quantity calculators per wall height, and stripping tools.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 5: ADMIN GOVERNANCE & SETTINGS --- */}
      {activeTab === "settings" && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Administrator Governance & Standards Configuration
              </h3>
              <p className="text-xs text-slate-500">
                Configure worldwide accessory categories, preset size catalogs, and custom accessory types.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Manage Categories */}
            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase text-slate-800 tracking-wider">
                  Accessory Categories ({categories.length})
                </h4>
                <button
                  onClick={() => setShowAddCategoryModal(true)}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white font-bold text-[11px] rounded"
                >
                  + Add Category
                </button>
              </div>

              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                {categories.map((cat) => (
                  <div
                    key={cat}
                    className="p-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 flex justify-between items-center"
                  >
                    <span>{cat}</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {items.filter((i) => i.category === cat).length} items
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Manage Preset Sizes */}
            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase text-slate-800 tracking-wider">
                  Standard Size Catalog ({presetSizes.length})
                </h4>
                <button
                  onClick={() => setShowAddSizeModal(true)}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white font-bold text-[11px] rounded"
                >
                  + Add Size Preset
                </button>
              </div>

              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                {presetSizes.map((s) => (
                  <div
                    key={s.id}
                    className={`p-2.5 border rounded-lg text-xs font-medium flex justify-between items-center ${
                      s.active ? "bg-white border-slate-200 text-slate-800" : "bg-slate-100 border-slate-200 text-slate-400 line-through"
                    }`}
                  >
                    <div>
                      <span className="font-bold">{s.name}</span>
                      <span className="text-[10px] text-slate-400 ml-2 font-normal">({s.category})</span>
                    </div>
                    <button
                      onClick={() => handleToggleSizeActive(s.id)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        s.active ? "bg-rose-100 text-rose-700 hover:bg-rose-200" : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                      }`}
                    >
                      {s.active ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: DETAIL SPECIFICATIONS & PHOTO PREVIEW --- */}
      {showDetailModal && selectedAccessory && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 animate-fadeIn">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="px-2.5 py-1 bg-amber-500 text-slate-950 font-mono font-bold text-xs rounded">
                  {selectedAccessory.code}
                </span>
                <h3 className="text-base font-bold text-white">{selectedAccessory.name}</h3>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Photo Preview if photoUrl exists */}
              {selectedAccessory.photoUrl && (
                <div className="w-full h-48 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 relative flex items-center justify-center">
                  <img
                    src={selectedAccessory.photoUrl}
                    alt={selectedAccessory.name}
                    className="w-full h-full object-contain"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                  <span className="text-slate-400 text-[10px] block uppercase font-bold">Accessory ID</span>
                  <span className="font-mono font-bold text-slate-900">{selectedAccessory.id}</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                  <span className="text-slate-400 text-[10px] block uppercase font-bold">Category</span>
                  <span className="font-semibold text-slate-900">{selectedAccessory.category}</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                  <span className="text-slate-400 text-[10px] block uppercase font-bold">Material</span>
                  <span className="font-semibold text-slate-900">{selectedAccessory.material}</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                  <span className="text-slate-400 text-[10px] block uppercase font-bold">Dimensions / Size</span>
                  <span className="font-semibold text-slate-900">{selectedAccessory.size}</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                <span className="text-slate-400 text-[10px] block uppercase font-bold mb-1">
                  Description & Specs
                </span>
                <p className="text-slate-700">{selectedAccessory.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-900 text-white rounded-xl text-center">
                <div className="flex flex-col items-center justify-center border-r border-slate-800 pr-2">
                  <QrCode className="w-16 h-16 text-amber-400 mb-2" />
                  <span className="font-mono text-[10px] text-amber-300">{selectedAccessory.qrCode}</span>
                </div>
                <div className="flex flex-col items-center justify-center pl-2">
                  <Barcode className="w-20 h-12 text-slate-300 mb-2" />
                  <span className="font-mono text-[10px] text-slate-300">{selectedAccessory.barcode}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-100 p-4 flex items-center justify-between">
              <button
                onClick={() => {
                  setQrModalItem(selectedAccessory);
                  setSelectedBatchIds([selectedAccessory.id]);
                  setShowDetailModal(false);
                  setShowQrPrintModal(true);
                }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-lg shadow flex items-center space-x-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Print QR Sticker Labels</span>
              </button>
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs rounded-lg"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: REGISTER NEW ACCESSORY (WITH PHOTO LINK URL) --- */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 animate-fadeIn">
            <div className="bg-amber-600 text-white p-5 flex items-center justify-between">
              <h3 className="text-base font-bold">Register New Accessory Type / Size</h3>
              <button onClick={() => setShowAddModal(false)} className="text-white hover:text-amber-200 p-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveNewAccessory} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {duplicateError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center gap-2 font-medium">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{duplicateError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Accessory Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="e.g. PW-1650"
                    className="w-full p-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Accessory Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Standard Wedge Pin 16x50mm"
                    className="w-full p-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full p-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Material</label>
                  <select
                    value={formData.material}
                    onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                    className="w-full p-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                  >
                    {ACCESSORY_MATERIALS.map((mat) => (
                      <option key={mat} value={mat}>
                        {mat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Dimensions / Size</label>
                  <input
                    type="text"
                    value={formData.size}
                    onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                    placeholder="e.g. 16mm x 50mm"
                    className="w-full p-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Unit Weight (Kg)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.weightKg}
                    onChange={(e) => setFormData({ ...formData, weightKg: parseFloat(e.target.value) })}
                    className="w-full p-2 text-xs border border-slate-300 rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Unit</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full p-2 text-xs border border-slate-300 rounded-lg"
                  >
                    {ACCESSORY_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Photo Link URL (የፎቶ ሊንክ URL)</label>
                <input
                  type="url"
                  value={formData.photoUrl || ""}
                  onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
                  placeholder="https://example.com/photos/accessory.jpg"
                  className="w-full p-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 font-mono"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg shadow"
                >
                  Save & Register Accessory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: EDIT ACCESSORY --- */}
      {showEditModal && editingAccessory && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 animate-fadeIn">
            <div className="bg-sky-700 text-white p-5 flex items-center justify-between">
              <h3 className="text-base font-bold">Edit Accessory Details ({editingAccessory.code})</h3>
              <button onClick={() => setShowEditModal(false)} className="text-white hover:text-sky-200 p-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditAccessory} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {duplicateError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center gap-2 font-medium">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{duplicateError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Accessory Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full p-2 text-xs border border-slate-300 rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Accessory Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full p-2 text-xs border border-slate-300 rounded-lg"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Material</label>
                  <select
                    value={formData.material}
                    onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                    className="w-full p-2 text-xs border border-slate-300 rounded-lg"
                  >
                    {ACCESSORY_MATERIALS.map((mat) => (
                      <option key={mat} value={mat}>
                        {mat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Size</label>
                  <input
                    type="text"
                    value={formData.size}
                    onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                    className="w-full p-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Current Stock</label>
                  <input
                    type="number"
                    value={formData.currentStock}
                    onChange={(e) => setFormData({ ...formData, currentStock: parseInt(e.target.value) || 0 })}
                    className="w-full p-2 text-xs border border-slate-300 rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Purchase Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.purchasePrice}
                    onChange={(e) => setFormData({ ...formData, purchasePrice: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 text-xs border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Photo Link URL (የፎቶ ሊንክ URL)</label>
                <input
                  type="url"
                  value={formData.photoUrl || ""}
                  onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
                  placeholder="https://example.com/photos/accessory.jpg"
                  className="w-full p-2 text-xs border border-slate-300 rounded-lg font-mono"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-700 hover:bg-sky-600 text-white text-xs font-bold rounded-lg shadow"
                >
                  Update Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: ISSUE ACCESSORY (WITH AUTOCOMPLETE SEARCHABLE DROPDOWN) --- */}
      {showIssueModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-200 animate-fadeIn">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <h3 className="text-base font-bold">Issue Accessories to Site Store</h3>
              <button onClick={() => setShowIssueModal(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleIssueSubmit} className="p-6 space-y-4">
              {/* Searchable Autocomplete Input */}
              <div className="relative">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Select Accessory Item (Search Code or Name)
                </label>
                <div
                  onClick={() => setIsIssueDropdownOpen(!isIssueDropdownOpen)}
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-lg flex items-center justify-between cursor-pointer bg-slate-50 hover:bg-white transition"
                >
                  <span className="font-semibold text-slate-900">
                    {items.find((i) => i.id === issueForm.accessoryId)
                      ? `${items.find((i) => i.id === issueForm.accessoryId)?.code} - ${
                          items.find((i) => i.id === issueForm.accessoryId)?.name
                        } (Stock: ${items.find((i) => i.id === issueForm.accessoryId)?.currentStock})`
                      : "-- Choose or Type Accessory Name --"}
                  </span>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </div>

                {isIssueDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 max-h-56 overflow-y-auto p-2">
                    <input
                      type="text"
                      value={issueSearch}
                      onChange={(e) => setIssueSearch(e.target.value)}
                      placeholder="Type code, e.g. PW-1650 or Flat Tie..."
                      className="w-full p-2 mb-2 bg-slate-100 border border-slate-300 rounded text-xs font-medium"
                      autoFocus
                    />
                    {items
                      .filter(
                        (i) =>
                          i.status !== "Deactivated" &&
                          (i.code.toLowerCase().includes(issueSearch.toLowerCase()) ||
                            i.name.toLowerCase().includes(issueSearch.toLowerCase()))
                      )
                      .map((i) => (
                        <div
                          key={i.id}
                          onClick={() => {
                            setIssueForm({ ...issueForm, accessoryId: i.id });
                            setIsIssueDropdownOpen(false);
                          }}
                          className={`p-2 hover:bg-amber-50 cursor-pointer rounded text-xs flex justify-between items-center ${
                            i.id === issueForm.accessoryId ? "bg-amber-100 font-bold" : ""
                          }`}
                        >
                          <div>
                            <span className="font-mono text-amber-700 font-bold mr-2">{i.code}</span>
                            <span className="text-slate-800">{i.name}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono">
                            Stock: {i.currentStock}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Quantity to Issue</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={issueForm.quantity}
                    onChange={(e) =>
                      setIssueForm({ ...issueForm, quantity: parseInt(e.target.value) || 1 })
                    }
                    className="w-full p-2 text-xs border border-slate-300 rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Project Site</label>
                  <input
                    type="text"
                    required
                    value={issueForm.projectName}
                    onChange={(e) => setIssueForm({ ...issueForm, projectName: e.target.value })}
                    className="w-full p-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowIssueModal(false)}
                  className="px-4 py-2 border text-xs font-semibold rounded-lg hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-lg shadow"
                >
                  Confirm Issue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: RETURN ACCESSORY --- */}
      {showReturnModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-200 animate-fadeIn">
            <div className="bg-emerald-700 text-white p-5 flex items-center justify-between">
              <h3 className="text-base font-bold">Log Returned Accessories & Condition</h3>
              <button onClick={() => setShowReturnModal(false)} className="text-slate-200 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleReturnSubmit} className="p-6 space-y-4">
              <div className="relative">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Select Accessory Item
                </label>
                <select
                  required
                  value={returnForm.accessoryId}
                  onChange={(e) => setReturnForm({ ...returnForm, accessoryId: e.target.value })}
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-medium"
                >
                  <option value="">-- Choose Accessory --</option>
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.code} - {i.name} (Issued: {i.issuedStock})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-emerald-800 mb-1">Good Qty</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={returnForm.goodQty}
                    onChange={(e) =>
                      setReturnForm({ ...returnForm, goodQty: parseInt(e.target.value) || 0 })
                    }
                    className="w-full p-2 text-xs border border-emerald-300 rounded-lg font-mono bg-emerald-50/50"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-amber-800 mb-1">Damaged Qty</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={returnForm.damagedQty}
                    onChange={(e) =>
                      setReturnForm({ ...returnForm, damagedQty: parseInt(e.target.value) || 0 })
                    }
                    className="w-full p-2 text-xs border border-amber-300 rounded-lg font-mono bg-amber-50/50"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-rose-800 mb-1">Missing Qty</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={returnForm.missingQty}
                    onChange={(e) =>
                      setReturnForm({ ...returnForm, missingQty: parseInt(e.target.value) || 0 })
                    }
                    className="w-full p-2 text-xs border border-rose-300 rounded-lg font-mono bg-rose-50/50"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowReturnModal(false)}
                  className="px-4 py-2 border text-xs font-semibold rounded-lg hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow"
                >
                  Log Return & Update Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: ADD CATEGORY --- */}
      {showAddCategoryModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4">Add New Accessory Category</h3>
            <form onSubmit={handleAddCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Category Name</label>
                <input
                  type="text"
                  required
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="e.g. Scaffolding & Walkway Consoles"
                  className="w-full p-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddCategoryModal(false)}
                  className="px-4 py-2 border text-xs font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-lg"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: ADD SIZE PRESET --- */}
      {showAddSizeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4">Add Preset Dimension Size</h3>
            <form onSubmit={handleAddSize} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Dimension / Size Text</label>
                <input
                  type="text"
                  required
                  value={newSizeForm.name}
                  onChange={(e) => setNewSizeForm({ ...newSizeForm, name: e.target.value })}
                  placeholder="e.g. 18mm x 75mm or 3.0m x 4.5m"
                  className="w-full p-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Category</label>
                <select
                  value={newSizeForm.category}
                  onChange={(e) => setNewSizeForm({ ...newSizeForm, category: e.target.value })}
                  className="w-full p-2 text-xs border border-slate-300 rounded-lg"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddSizeModal(false)}
                  className="px-4 py-2 border text-xs font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-lg"
                >
                  Save Preset Size
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: QR CODE LABEL PRINTING STATION --- */}
      {showQrPrintModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-auto">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <h3 className="text-base font-bold flex items-center gap-2">
                <QrCode className="w-5 h-5 text-amber-400" />
                <span>Accessory QR Code Label Printing Station</span>
              </h3>
              <button onClick={() => setShowQrPrintModal(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Label Copies per Item</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={labelCopies}
                    onChange={(e) => setLabelCopies(parseInt(e.target.value) || 1)}
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Label Format</label>
                  <select
                    value={labelFormat}
                    onChange={(e) => setLabelFormat(e.target.value as any)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  >
                    <option value="thermal">Thermal Sticker (50mm x 30mm)</option>
                    <option value="industrial">Industrial Large (70mm x 50mm)</option>
                    <option value="grid_a4">A4 Sheet Grid</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={() => alert(`Sent ${selectedBatchIds.length * labelCopies} labels to barcode printer.`)}
                    className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-lg shadow flex items-center justify-center space-x-1.5"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print All Selected Labels</span>
                  </button>
                </div>
              </div>

              {/* Live Preview Container */}
              <div className="p-4 bg-slate-100 rounded-xl max-h-72 overflow-y-auto grid grid-cols-2 md:grid-cols-3 gap-3">
                {items
                  .filter((item) => (qrModalItem ? item.id === qrModalItem.id : selectedBatchIds.includes(item.id)))
                  .slice(0, 12)
                  .map((item) => (
                    <div key={item.id} className="bg-white p-3 rounded-lg border border-slate-300 shadow-sm text-center">
                      <div className="font-mono font-bold text-amber-600 text-xs">{item.code}</div>
                      <div className="text-[10px] text-slate-800 font-semibold truncate">{item.name}</div>
                      <div className="my-1 flex justify-center">
                        <QrCode className="w-12 h-12 text-slate-900" />
                      </div>
                      <div className="text-[9px] text-slate-500 font-mono">{item.qrCode}</div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
