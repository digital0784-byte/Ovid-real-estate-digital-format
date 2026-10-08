import React, { useState, useMemo } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  X,
  Building2,
  MapPin,
  Shield,
  User,
  Phone,
  Calendar,
  FileText,
  Camera,
  Upload,
  Plus,
  Trash2,
  Edit3,
  Layers,
  Box,
  CheckCircle,
  AlertTriangle,
  QrCode,
  Printer,
  Eye,
  Hash,
  Sparkles,
  Info
} from "lucide-react";
import { 
  RegisteredWarehouse, 
  WarehousePanelTypeEntry, 
  AluminumFormworkPanel, 
  PanelStatus, 
  PanelType,
  UserRole
} from "../../types";
import { DbService } from "../../services/db";
import { AddPanelTypeModal } from "./AddPanelTypeModal";

interface WarehouseRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWarehouseRegistered?: (newWarehouse: RegisteredWarehouse) => void;
  currentUserProfile?: any;
  currentUserRole?: UserRole | string;
  isAmharic?: boolean;
}

export const WarehouseRegistrationModal: React.FC<WarehouseRegistrationModalProps> = ({
  isOpen,
  onClose,
  onWarehouseRegistered,
  currentUserProfile,
  currentUserRole,
  isAmharic = false
}) => {
  // 1. Warehouse Details Form State
  const [warehouseId, setWarehouseId] = useState<string>(
    () => `WH-AL-${Math.floor(100 + Math.random() * 899)}`
  );
  const [warehouseName, setWarehouseName] = useState<string>("");
  const [warehouseNameAmharic, setWarehouseNameAmharic] = useState<string>("");
  const [warehouseCode, setWarehouseCode] = useState<string>(
    () => `WH-CEN-${Math.floor(10 + Math.random() * 89)}`
  );
  const [warehouseType, setWarehouseType] = useState<RegisteredWarehouse["type"]>("Main Warehouse");
  const [locationRegion, setLocationRegion] = useState<string>("Addis Ababa / Akaki Kality");
  const [citySite, setCitySite] = useState<string>("Akaki Kality Central Logistics Hub");
  const [address, setAddress] = useState<string>("Industrial Zone Sector 4, Gate 02");
  const [gpsCoordinates, setGpsCoordinates] = useState<string>("8.9500° N, 38.7500° E");
  const [gpsAcquiring, setGpsAcquiring] = useState<boolean>(false);
  const [warehouseManager, setWarehouseManager] = useState<string>(
    currentUserProfile?.displayName || "Ato Dawit Tadesse"
  );
  const [managerPhone, setManagerPhone] = useState<string>("+251 911 234 567");
  const [securityGuardName, setSecurityGuardName] = useState<string>("Alemayehu Bekele");
  const [securityGuardPhone, setSecurityGuardPhone] = useState<string>("+251 912 345 678");
  const [totalCapacitySqM, setTotalCapacitySqM] = useState<number>(10000);
  const [currentCapacityUtilized, setCurrentCapacityUtilized] = useState<number>(35);
  const [status, setStatus] = useState<RegisteredWarehouse["status"]>("Active");
  const [registrationDate, setRegistrationDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [notes, setNotes] = useState<string>(
    "Central staging, repair depot, and distribution terminal for aluminum formwork panels."
  );
  const [photoUrl, setPhotoUrl] = useState<string>(
    "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80"
  );

  // Attached Documents
  const [documents, setDocuments] = useState<Array<{ id: string; name: string; type: string; uploadDate: string; fileSize?: string }>>([
    {
      id: "DOC-WH-01",
      name: "Warehouse_Layout_Plan_Rev3.pdf",
      type: "CAD Drawing",
      uploadDate: new Date().toISOString().split("T")[0],
      fileSize: "4.8 MB"
    },
    {
      id: "DOC-WH-02",
      name: "Industrial_Safety_Clearance_2026.pdf",
      type: "Safety Document",
      uploadDate: new Date().toISOString().split("T")[0],
      fileSize: "1.2 MB"
    }
  ]);
  const [newDocName, setNewDocName] = useState("");
  const [newDocType, setNewDocType] = useState("CAD Drawing");

  // 2. Aluminum Formwork Panel Inventory Table State (Seed with typical initial batch)
  const [panelTypes, setPanelTypes] = useState<WarehousePanelTypeEntry[]>([
    {
      id: "PT-INIT-001",
      warehouseId: `WH-AL-101`,
      warehouseName: "Central Logistics Hub",
      panelTypeName: "Wall Panel",
      panelCode: "WP-600-2400",
      panelCategory: "Wall",
      description: "6061-T6 High tensile aluminum standard wall panel with 65mm side rails",
      dimension: {
        length: 2400,
        width: 600,
        heightThickness: 65,
        unit: "mm",
        formatted: "600 × 2400 mm"
      },
      condition: "Good",
      serialMode: "Range",
      serialPrefix: "WP",
      serialRangeStart: "001",
      serialRangeEnd: "050",
      serialRangeFormatted: "WP-001–WP-050",
      individualSerialNumbers: Array.from({ length: 50 }, (_, i) => `WP-${String(i + 1).padStart(3, "0")}`),
      quantity: 50,
      location: {
        warehouse: "Central Logistics Hub",
        section: "Section A",
        row: "Row 01",
        rack: "Rack 01",
        bay: "Bay 01",
        stack: "Stack 01",
        bin: "A1",
        formattedLocation: "Section A → Rack 01 → Bay 01 → Stack 01 (A1)"
      },
      status: "Available",
      unitCostEtb: 4500,
      qrCodePayload: "ERP-PANEL:WP-600-2400:WP-001-WP-050:A1",
      barcode: "BC-WP6002400-50"
    },
    {
      id: "PT-INIT-002",
      warehouseId: `WH-AL-101`,
      warehouseName: "Central Logistics Hub",
      panelTypeName: "Slab Panel",
      panelCode: "SP-900-1800",
      panelCategory: "Slab",
      description: "Standard deck slab formwork panel with reinforced ribs",
      dimension: {
        length: 1800,
        width: 900,
        heightThickness: 65,
        unit: "mm",
        formatted: "900 × 1800 mm"
      },
      condition: "Good",
      serialMode: "Range",
      serialPrefix: "SP",
      serialRangeStart: "001",
      serialRangeEnd: "030",
      serialRangeFormatted: "SP-001–SP-030",
      individualSerialNumbers: Array.from({ length: 30 }, (_, i) => `SP-${String(i + 1).padStart(3, "0")}`),
      quantity: 30,
      location: {
        warehouse: "Central Logistics Hub",
        section: "Section A",
        row: "Row 02",
        rack: "Rack 02",
        bay: "Bay 01",
        stack: "Stack 01",
        bin: "A2",
        formattedLocation: "Section A → Rack 02 → Bay 01 → Stack 01 (A2)"
      },
      status: "Available",
      unitCostEtb: 4200,
      qrCodePayload: "ERP-PANEL:SP-900-1800:SP-001-SP-030:A2",
      barcode: "BC-SP9001800-30"
    },
    {
      id: "PT-INIT-003",
      warehouseId: `WH-AL-101`,
      warehouseName: "Central Logistics Hub",
      panelTypeName: "Corner Panel",
      panelCode: "CP-300-2400",
      panelCategory: "Corner",
      description: "Internal corner transition panel (IC) 90 degree",
      dimension: {
        length: 2400,
        width: 300,
        heightThickness: 65,
        unit: "mm",
        formatted: "300 × 2400 mm"
      },
      condition: "Used",
      serialMode: "Range",
      serialPrefix: "CP",
      serialRangeStart: "001",
      serialRangeEnd: "015",
      serialRangeFormatted: "CP-001–CP-015",
      individualSerialNumbers: Array.from({ length: 15 }, (_, i) => `CP-${String(i + 1).padStart(3, "0")}`),
      quantity: 15,
      location: {
        warehouse: "Central Logistics Hub",
        section: "Section B",
        row: "Row 01",
        rack: "Rack 01",
        bay: "Bay 01",
        stack: "Stack 01",
        bin: "B1",
        formattedLocation: "Section B → Rack 01 → Bay 01 → Stack 01 (B1)"
      },
      status: "Available",
      unitCostEtb: 3800,
      qrCodePayload: "ERP-PANEL:CP-300-2400:CP-001-CP-015:B1",
      barcode: "BC-CP3002400-15"
    }
  ]);

  // Modal for Adding / Editing a Panel Type
  const [showAddPanelModal, setShowAddPanelModal] = useState<boolean>(false);
  const [editingPanelEntry, setEditingPanelEntry] = useState<WarehousePanelTypeEntry | null>(null);

  // QR / Barcode Quick Inspect Modal State
  const [inspectingPanel, setInspectingPanel] = useState<WarehousePanelTypeEntry | null>(null);

  // Submitting state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Computations
  const totalPanelQuantity = useMemo(() => {
    return panelTypes.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  }, [panelTypes]);

  const totalEstimatedPanelValueEtb = useMemo(() => {
    return panelTypes.reduce((sum, item) => sum + ((Number(item.quantity) || 0) * (Number(item.unitCostEtb) || 4000)), 0);
  }, [panelTypes]);

  // All registered serial numbers in table for duplicate prevention
  const allExistingSerials = useMemo(() => {
    const list: string[] = [];
    panelTypes.forEach(p => {
      p.individualSerialNumbers.forEach(s => list.push(s));
    });
    return list;
  }, [panelTypes]);

  // Handlers
  const handleAcquireLiveGps = () => {
    if (!navigator.geolocation) {
      alert(isAmharic ? "አሳሽዎ GPS አይደግፍም!" : "Geolocation is not supported by your browser.");
      return;
    }
    setGpsAcquiring(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        const coords = `${pos.coords.latitude.toFixed(4)}° N, ${pos.coords.longitude.toFixed(4)}° E`;
        setGpsCoordinates(coords);
        setGpsAcquiring(false);
      },
      err => {
        console.warn("GPS error:", err);
        setGpsCoordinates("8.9500° N, 38.7500° E (Central Hub Default)");
        setGpsAcquiring(false);
      },
      { timeout: 8000 }
    );
  };

  const handleAddDocument = () => {
    if (!newDocName.trim()) return;
    const docObj = {
      id: `DOC-WH-${Date.now().toString().slice(-4)}`,
      name: newDocName.trim(),
      type: newDocType,
      uploadDate: new Date().toISOString().split("T")[0],
      fileSize: "2.5 MB"
    };
    setDocuments(prev => [...prev, docObj]);
    setNewDocName("");
  };

  const handleRemoveDocument = (docId: string) => {
    setDocuments(prev => prev.filter(d => d.id !== docId));
  };

  const handleSavePanelType = (entry: WarehousePanelTypeEntry) => {
    if (editingPanelEntry) {
      setPanelTypes(prev => prev.map(p => (p.id === entry.id ? entry : p)));
      setEditingPanelEntry(null);
    } else {
      setPanelTypes(prev => [...prev, entry]);
    }
  };

  const handleDeletePanelType = (id: string) => {
    if (confirm(isAmharic ? "ይህንን የፓነል ዓይነት ከሰንጠረዡ ማስወገድ ይፈልጋሉ?" : "Remove this panel type from registration?")) {
      setPanelTypes(prev => prev.filter(p => p.id !== id));
    }
  };

  const handleInlineQuantityChange = (id: string, newQty: number) => {
    if (newQty < 1) return;
    setPanelTypes(prev =>
      prev.map(p => {
        if (p.id === id) {
          // If in range mode, update range end if numeric
          return { ...p, quantity: newQty };
        }
        return p;
      })
    );
  };

  // Final Warehouse Registration Submission
  const handleSubmitWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!warehouseName.trim()) {
      setErrorMessage(isAmharic ? "እባክዎን የመጋዘኑን ስም ያስገቡ!" : "Please enter the warehouse name!");
      return;
    }

    if (!warehouseCode.trim()) {
      setErrorMessage(isAmharic ? "እባክዎን የመጋዘኑን ኮድ ያስገቡ!" : "Please enter the warehouse code!");
      return;
    }

    if (panelTypes.length === 0) {
      if (!confirm(isAmharic ? "ምንም የአሉሚኒየም ፎርምወርክ ፓነል አልተመዘገበም። ያለ ፓነል ክምችት መቀጠል ይፈልጋሉ?" : "No aluminum formwork panel types are registered. Continue without panels?")) {
        return;
      }
    }

    // Validate serials against quantities
    for (const pt of panelTypes) {
      if (pt.serialMode === "Individual" && pt.individualSerialNumbers.length !== pt.quantity) {
        setErrorMessage(
          isAmharic
            ? `የሴሪያል ቁጥሮች ብዛት (${pt.individualSerialNumbers.length}) ለፓነል '${pt.panelTypeName}' ከተጠቀሰው ብዛት (${pt.quantity}) ጋር እኩል አይደለም!`
            : `Serial number count (${pt.individualSerialNumbers.length}) for panel '${pt.panelTypeName}' does not match quantity (${pt.quantity}). Please fix before saving.`
        );
        return;
      }
    }

    try {
      setIsSubmitting(true);

      const resolvedWarehouseId = warehouseId.trim() || `WH-AL-${Math.floor(100 + Math.random() * 899)}`;
      const resolvedWarehouseName = warehouseName.trim();

      const newWarehouseObj: RegisteredWarehouse = {
        id: resolvedWarehouseId,
        code: warehouseCode.trim().toUpperCase(),
        name: resolvedWarehouseName,
        nameAmharic: warehouseNameAmharic.trim() || resolvedWarehouseName,
        type: warehouseType,
        isMainWarehouse: warehouseType === "Main Warehouse" || warehouseType === "Central Warehouse",
        locationRegion: locationRegion.trim() || "Addis Ababa",
        citySite: citySite.trim() || "Central Logistics Hub",
        address: address.trim(),
        gpsCoordinates: gpsCoordinates.trim() || "8.9500° N, 38.7500° E",
        warehouseManager: warehouseManager.trim() || "Warehouse Manager",
        managerPhone: managerPhone.trim(),
        securityGuardName: securityGuardName.trim(),
        securityGuardPhone: securityGuardPhone.trim(),
        securityGuardOnDuty: `${securityGuardName.trim()} (${securityGuardPhone.trim()})`,
        totalCapacitySqM: Number(totalCapacitySqM) || 5000,
        currentCapacityUtilized: Number(currentCapacityUtilized) || 20,
        activePanelsCount: totalPanelQuantity,
        materialItemsCount: panelTypes.length,
        status,
        linkedSitesCount: 1,
        registrationDate,
        notes,
        photoUrl,
        documents,
        panelTypes: panelTypes.map(pt => ({
          ...pt,
          warehouseId: resolvedWarehouseId,
          warehouseName: resolvedWarehouseName
        }))
      };

      // 1. Save warehouse to Firestore
      await DbService.addWarehouse(newWarehouseObj);

      // 2. Save panel types to Firestore collection `panelTypes`
      if (panelTypes.length > 0) {
        const syncedPanelTypes = panelTypes.map(pt => ({
          ...pt,
          warehouseId: resolvedWarehouseId,
          warehouseName: resolvedWarehouseName
        }));
        await DbService.saveWarehousePanelTypes(syncedPanelTypes);

        // 3. Save individual/group formwork panels to `formworkPanels`
        for (const pt of syncedPanelTypes) {
          const formworkPanel: AluminumFormworkPanel = {
            id: `PANEL-${pt.panelCode}-${Date.now().toString().slice(-4)}`,
            serialNumber: pt.serialRangeFormatted || pt.panelCode,
            bundleNumber: `BNDL-${resolvedWarehouseId.slice(-3)}`,
            size: pt.dimension.formatted,
            type: pt.panelCategory as any,
            dimensions: pt.dimension.formatted,
            location: resolvedWarehouseName,
            allocatedSite: resolvedWarehouseName,
            zone: pt.location.section || "Section A",
            status: pt.condition === "New" ? PanelStatus.NEW : pt.condition === "Damaged" ? PanelStatus.DAMAGED : PanelStatus.UNDER_REPAIR,
            usageCount: pt.condition === "New" ? 0 : 4,
            weight: 16.5,
            unitPriceEtb: pt.unitCostEtb || 4200,
            quantity: pt.quantity,
            createdAt: registrationDate
          };
          await DbService.addFormworkPanel(formworkPanel);
        }

        // 4. Log initial inventory intake audit log
        await DbService.addPanelMovementLog({
          id: `LOG-REG-${Date.now()}`,
          panelId: resolvedWarehouseId,
          fromLocation: "Supplier / Manufacturing Depot",
          fromZone: "Intake Bay",
          toLocation: resolvedWarehouseName,
          toZone: "Section A",
          timestamp: registrationDate,
          movedBy: warehouseManager.trim() || "Warehouse Manager",
          notes: `Initial warehouse registration intake: ${totalPanelQuantity} aluminum panels registered across ${panelTypes.length} types.`
        });
      }

      // 5. System Notification
      await DbService.addNotification({
        id: `NOTIF-WH-REG-${Date.now()}`,
        title: `New Warehouse Registered: ${resolvedWarehouseName}`,
        titleAm: `አዲስ መጋዘን ተመዝግቧል፡ ${resolvedWarehouseName}`,
        message: `Registered warehouse ${resolvedWarehouseName} (${warehouseCode}) with ${totalPanelQuantity} aluminum formwork panels.`,
        description: `Registered warehouse ${resolvedWarehouseName} (${warehouseCode}) with ${totalPanelQuantity} aluminum formwork panels. Manager: ${warehouseManager}.`,
        messageAm: `መጋዘን ${resolvedWarehouseName} (${warehouseCode}) ከ${totalPanelQuantity} የአሉሚኒየም ፓነሎች ጋር ተመዝግቧል።`,
        descriptionAm: `መጋዘን ${resolvedWarehouseName} (${warehouseCode}) ከ${totalPanelQuantity} የአሉሚኒየም ፓነሎች ጋር ተመዝግቧል። ኃላፊ፡ ${warehouseManager}።`,
        category: "Warehouse Logistics",
        priority: "High",
        status: "Unread",
        read: false,
        isRead: false,
        type: "Warehouse Registered",
        projectName: resolvedWarehouseName,
        sender: currentUserProfile?.displayName || "Warehouse Manager",
        senderRole: String(currentUserRole || "Warehouse Manager"),
        targetRoles: [UserRole.SUPER_ADMIN, UserRole.HEAD_OFFICE, UserRole.WAREHOUSE_MANAGER],
        actionTab: "warehouse-dashboard",
        timestamp: new Date().toISOString(),
        date: registrationDate,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      });

      setIsSubmitting(false);
      onWarehouseRegistered?.(newWarehouseObj);
      onClose();
    } catch (err: any) {
      console.error("Error submitting warehouse:", err);
      setIsSubmitting(false);
      setErrorMessage(err?.message || "Failed to register warehouse in database. Please check Firestore connection.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 border-2 border-amber-500/40 rounded-3xl max-w-5xl w-full my-6 overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-6 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/70 border-b border-amber-500/30 flex justify-between items-center shrink-0">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 bg-amber-500/20 rounded-2xl border border-amber-500/40 text-amber-400 shadow-lg shadow-amber-500/10">
              <Building2 size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold uppercase tracking-wider">
                  ERP Phase 2 Registration
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold uppercase">
                  Firestore Connected
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-wide mt-0.5">
                {isAmharic 
                  ? "አዲስ መጋዘን መመዝገቢያ እና የአሉሚኒየም ፎርምወርክ ፓነሎች ክምችት" 
                  : "Add New Warehouse & Aluminum Formwork Panel Inventory"}
              </h2>
              <p className="text-xs text-slate-400">
                {isAmharic
                  ? "የመጋዘኑን ዝርዝር መረጃ እና የመጀመሪያ የፓነል ዓይነቶች ክምችት በአንድ ላይ ይመዝግቡ"
                  : "Register warehouse facility parameters and initial aluminum panel inventory in one streamlined workflow."}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2.5 text-slate-400 hover:text-white rounded-2xl hover:bg-slate-800 cursor-pointer transition"
          >
            <X size={22} />
          </button>
        </div>

        {/* ERROR BANNER */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 bg-rose-950/80 border border-rose-500/50 rounded-2xl text-rose-200 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-rose-300 hover:text-white font-bold text-[10px] uppercase">
              Dismiss
            </button>
          </div>
        )}

        {/* SCROLLABLE FORM BODY */}
        <form onSubmit={handleSubmitWarehouse} className="p-4 sm:p-6 space-y-8 overflow-y-auto text-xs text-slate-200">
          
          {/* SECTION 1: WAREHOUSE GENERAL INFORMATION */}
          <div className="p-5 bg-slate-950/90 rounded-3xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2 text-amber-400">
                <Building2 size={18} />
                <span className="text-xs font-black uppercase tracking-wider">
                  1. New Warehouse Registration Information (የመጋዘን መረጃ)
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">Section 1 of 2</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  {isAmharic ? "የመጋዘን መለያ (Warehouse ID)" : "Warehouse ID"} *
                </label>
                <input
                  type="text"
                  required
                  value={warehouseId}
                  onChange={e => setWarehouseId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-amber-400 font-mono font-bold rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  {isAmharic ? "የመጋዘን ኮድ (Warehouse Code)" : "Warehouse Code"} *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. WH-CEN-01"
                  value={warehouseCode}
                  onChange={e => setWarehouseCode(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-white font-mono rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  {isAmharic ? "የመጋዘን ዓይነት (Warehouse Type)" : "Warehouse Type"} *
                </label>
                <select
                  value={warehouseType}
                  onChange={e => setWarehouseType(e.target.value as RegisteredWarehouse["type"])}
                  className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500 font-bold"
                >
                  <option value="Main Warehouse">Main Warehouse (ዋና መጋዘን)</option>
                  <option value="Central Warehouse">Central Warehouse (ማዕከላዊ መጋዘን)</option>
                  <option value="Site Warehouse">Site Warehouse (የሳይት መጋዘን)</option>
                  <option value="Temporary Warehouse">Temporary Warehouse (ጊዜያዊ መጋዘን)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  {isAmharic ? "የመጋዘን ስም (Warehouse Name - English)" : "Warehouse Name"} *
                </label>
                <input
                  type="text"
                  required
                  placeholder={isAmharic ? "ምሳሌ፡ Kality Central Formwork Hub" : "e.g. Kality Central Formwork Hub"}
                  value={warehouseName}
                  onChange={e => setWarehouseName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  {isAmharic ? "የመጋዘን ስም በአማርኛ (Amharic Name)" : "Warehouse Name (Amharic)"}
                </label>
                <input
                  type="text"
                  placeholder="ምሳሌ፡ የቃሊቲ ማዕከላዊ ፎርምወርክ መጋዘን"
                  value={warehouseNameAmharic}
                  onChange={e => setWarehouseNameAmharic(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  {isAmharic ? "ክልል / ዞን (Location Region)" : "Location / Region"} *
                </label>
                <input
                  type="text"
                  required
                  value={locationRegion}
                  onChange={e => setLocationRegion(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  {isAmharic ? "አካባቢ / ማዕከል (City Site)" : "City / Subcity / Hub"} *
                </label>
                <input
                  type="text"
                  required
                  value={citySite}
                  onChange={e => setCitySite(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  {isAmharic ? "ትክክለኛ አድራሻ (Address)" : "Physical Address"}
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="Industrial Park Road, Gate 4..."
                  className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  {isAmharic ? "የጂፒኤስ መጋጠሚያዎች (GPS Coordinates)" : "GPS Coordinates"}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={gpsCoordinates}
                    onChange={e => setGpsCoordinates(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 text-white font-mono rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={handleAcquireLiveGps}
                    disabled={gpsAcquiring}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-xl text-xs font-bold cursor-pointer transition flex items-center gap-1.5 shrink-0"
                  >
                    <MapPin size={14} className={gpsAcquiring ? "animate-bounce" : ""} />
                    <span>{gpsAcquiring ? "Locating..." : (isAmharic ? "ቀጥታ GPS" : "Live GPS")}</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  {isAmharic ? "የመመዝገቢያ ቀን (Registration Date)" : "Registration Date"}
                </label>
                <input
                  type="date"
                  value={registrationDate}
                  onChange={e => setRegistrationDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>
            </div>

            {/* Manager and Guard Details */}
            <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800/80 space-y-3">
              <div className="text-[11px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Shield size={14} />
                <span>Personnel on Duty (የኃላፊዎች እና የጥበቃ መረጃ)</span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">
                    {isAmharic ? "የመጋዘን ሥራ አስኪያጅ (Manager Name)" : "Warehouse Manager"} *
                  </label>
                  <input
                    type="text"
                    required
                    value={warehouseManager}
                    onChange={e => setWarehouseManager(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">
                    {isAmharic ? "የሥራ አስኪያጅ ስልክ (Manager Phone)" : "Manager Phone"}
                  </label>
                  <input
                    type="text"
                    value={managerPhone}
                    onChange={e => setManagerPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white font-mono rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 text-amber-300 font-bold">
                    {isAmharic ? "የዘበኛ ስም (Security Guard Name)" : "Security Guard Name"} *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Alemayehu Bekele"
                    value={securityGuardName}
                    onChange={e => setSecurityGuardName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 text-amber-300 font-bold">
                    {isAmharic ? "የዘበኛ ስልክ ቁጥር (Guard Phone)" : "Guard Phone Number"} *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="+251 912 ..."
                    value={securityGuardPhone}
                    onChange={e => setSecurityGuardPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white font-mono rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Capacity & Operational Status */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  {isAmharic ? "የመጋዘን ስፋት በካሬ ሜትር (Capacity SqM)" : "Total Capacity (SqM)"}
                </label>
                <input
                  type="number"
                  min={100}
                  value={totalCapacitySqM}
                  onChange={e => setTotalCapacitySqM(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 text-white font-mono rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  {isAmharic ? "የተያዘ ቦታ በመቶኛ (% Capacity Utilized)" : "Capacity Utilized (%)"}
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={currentCapacityUtilized}
                  onChange={e => setCurrentCapacityUtilized(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 text-white font-mono rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  {isAmharic ? "የመጋዘኑ ሁኔታ (Status)" : "Operational Status"}
                </label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as RegisteredWarehouse["status"])}
                  className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500 font-bold"
                >
                  <option value="Active">Active (በሥራ ላይ)</option>
                  <option value="Full">Full (የሞላ)</option>
                  <option value="Maintenance">Maintenance (በጥገና ላይ)</option>
                  <option value="Under Expansion">Under Expansion (በማስፋፋት ላይ)</option>
                  <option value="Temporary">Temporary (ጊዜያዊ)</option>
                </select>
              </div>
            </div>

            {/* Warehouse Photo & Attached Documents */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* Warehouse Photo */}
              <div className="p-3 bg-slate-900/60 rounded-2xl border border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-300 flex items-center gap-1.5">
                    <Camera size={14} className="text-amber-400" />
                    <span>{isAmharic ? "የመጋዘኑ ፎቶ (Warehouse Photo)" : "Warehouse Facility Photo"}</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">Image URL / Upload</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={photoUrl}
                    onChange={e => setPhotoUrl(e.target.value)}
                    placeholder="https://... image link"
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-2.5 py-1.5 text-xs font-mono"
                  />
                  <div className="w-10 h-8 rounded-lg overflow-hidden shrink-0 border border-slate-700 bg-slate-950">
                    <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                </div>
              </div>

              {/* Documents */}
              <div className="p-3 bg-slate-900/60 rounded-2xl border border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-300 flex items-center gap-1.5">
                    <FileText size={14} className="text-cyan-400" />
                    <span>{isAmharic ? "ሰነዶች (Documents / Plans)" : "Facility Documents & Layouts"}</span>
                  </span>
                  <span className="text-[10px] font-mono text-cyan-400">{documents.length} Files</span>
                </div>
                
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="New document name (e.g. Safety_Certificate.pdf)"
                    value={newDocName}
                    onChange={e => setNewDocName(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 text-white rounded-xl px-2 py-1 text-[11px]"
                  />
                  <select
                    value={newDocType}
                    onChange={e => setNewDocType(e.target.value)}
                    className="bg-slate-950 border border-slate-800 text-white rounded-xl px-2 py-1 text-[11px]"
                  >
                    <option value="CAD Drawing">CAD Drawing</option>
                    <option value="Safety Document">Safety Document</option>
                    <option value="Layout Plan">Layout Plan</option>
                    <option value="Other">Other</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleAddDocument}
                    className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-[11px] font-bold cursor-pointer"
                  >
                    + Add
                  </button>
                </div>

                <div className="space-y-1 max-h-20 overflow-y-auto pr-1">
                  {documents.map(d => (
                    <div key={d.id} className="flex items-center justify-between bg-slate-950 px-2 py-1 rounded-lg text-[10px] border border-slate-800/70">
                      <span className="text-slate-300 truncate max-w-[220px]">{d.name} ({d.type})</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveDocument(d.id)}
                        className="text-rose-400 hover:text-rose-200 cursor-pointer"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-slate-300 font-bold block mb-1">
                {isAmharic ? "ተጨማሪ ማስታወሻዎች እና መመሪያዎች (Notes)" : "Notes & Operational Guidelines"}
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* SECTION 2: ALUMINUM FORMWORK PANEL INVENTORY */}
          <div className="p-5 bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/40 rounded-3xl border-2 border-amber-500/40 space-y-4">
            
            {/* Section Header with KPI & Add Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-500/30 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-amber-500/20 text-amber-400 rounded-lg">
                    <Layers size={18} />
                  </div>
                  <h3 className="text-sm sm:text-base font-black text-amber-400 uppercase tracking-wider">
                    2. ALUMINUM FORMWORK PANEL INVENTORY (የአሉሚኒየም ፎርምወርክ ፓነሎች ክምችት)
                  </h3>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {isAmharic
                    ? "በዚህ መጋዘን ውስጥ የሚገኙ የተለያዩ የፓነል ዓይነቶችን በዝርዝር ሰንጠረዥ ይመዝግቡ።"
                    : "Register multiple aluminum formwork panel types, dimensions, conditions, and serial numbers."}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingPanelEntry(null);
                    setShowAddPanelModal(true);
                  }}
                  className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center space-x-2 shadow-lg shadow-amber-500/20 cursor-pointer transition transform active:scale-95"
                >
                  <Plus size={16} />
                  <span>{isAmharic ? "+ አዲስ የፓነል ዓይነት መዝግብ" : "+ Add Panel Type"}</span>
                </button>
              </div>
            </div>

            {/* Inventory KPI Summary Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-950 p-3 rounded-2xl border border-amber-500/30">
                <span className="text-[10px] text-slate-400 block uppercase font-mono">
                  {isAmharic ? "የተመዘገቡ የፓነል ዓይነቶች" : "Panel Types Count"}
                </span>
                <span className="text-xl font-black text-amber-400 font-mono">
                  {panelTypes.length} <span className="text-xs font-normal text-slate-400">Types</span>
                </span>
              </div>

              <div className="bg-slate-950 p-3 rounded-2xl border border-emerald-500/30">
                <span className="text-[10px] text-slate-400 block uppercase font-mono">
                  {isAmharic ? "ጠቅላላ የፓነል ብዛት" : "Total Panel Quantity"}
                </span>
                <span className="text-xl font-black text-emerald-400 font-mono">
                  {totalPanelQuantity.toLocaleString()} <span className="text-xs font-normal text-slate-400">Pcs</span>
                </span>
              </div>

              <div className="bg-slate-950 p-3 rounded-2xl border border-cyan-500/30">
                <span className="text-[10px] text-slate-400 block uppercase font-mono">
                  {isAmharic ? "ጠቅላላ የተገመተ ዋጋ" : "Est. Asset Value"}
                </span>
                <span className="text-lg font-black text-cyan-400 font-mono">
                  ETB {totalEstimatedPanelValueEtb.toLocaleString()}
                </span>
              </div>

              <div className="bg-slate-950 p-3 rounded-2xl border border-purple-500/30">
                <span className="text-[10px] text-slate-400 block uppercase font-mono">
                  {isAmharic ? "የሁኔታ ቅንብር" : "Condition Mix"}
                </span>
                <div className="flex gap-1.5 mt-1 text-[10px] font-mono">
                  <span className="text-emerald-400 font-bold">
                    {panelTypes.filter(p => p.condition === "New" || p.condition === "Good").length} Good
                  </span>
                  <span className="text-slate-500">•</span>
                  <span className="text-amber-400 font-bold">
                    {panelTypes.filter(p => p.condition === "Used").length} Used
                  </span>
                  <span className="text-slate-500">•</span>
                  <span className="text-rose-400 font-bold">
                    {panelTypes.filter(p => p.condition === "Damaged" || p.condition === "Under Repair").length} Dmg
                  </span>
                </div>
              </div>
            </div>

            {/* PANEL TYPE TABLE (Section 3 of requirement) */}
            <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
              <div className="p-3 bg-slate-900/80 border-b border-slate-800 flex justify-between items-center">
                <span className="font-bold text-slate-300 flex items-center gap-2">
                  <Box size={14} className="text-amber-400" />
                  <span>Panel Inventory Manifest (No. | Panel Type | Dimension | Condition | Serial Number | Quantity | Location | Status)</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {panelTypes.length} Row{panelTypes.length === 1 ? "" : "s"}
                </span>
              </div>

              {panelTypes.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <p className="text-slate-400 text-xs">
                    {isAmharic ? "እስካሁን ምንም የፓነል ዓይነት አልተመዘገበም።" : "No aluminum formwork panel types registered yet."}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingPanelEntry(null);
                      setShowAddPanelModal(true);
                    }}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    {isAmharic ? "+ የመጀመሪያውን የፓነል ዓይነት መዝግብ" : "+ Add First Panel Type"}
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-900 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                        <th className="py-2.5 px-3">No.</th>
                        <th className="py-2.5 px-3">Panel Type</th>
                        <th className="py-2.5 px-3">Dimension</th>
                        <th className="py-2.5 px-3">Condition</th>
                        <th className="py-2.5 px-3">Serial Number</th>
                        <th className="py-2.5 px-3">Quantity</th>
                        <th className="py-2.5 px-3">Storage Location</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {panelTypes.map((panel, idx) => (
                        <tr key={panel.id} className="hover:bg-slate-900/50 transition">
                          {/* 1. No */}
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-400">
                            {idx + 1}
                          </td>

                          {/* 2. Panel Type */}
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-white flex items-center gap-1.5">
                              <span>{panel.panelTypeName}</span>
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-amber-300">
                                {panel.panelCategory}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] font-mono text-slate-400">{panel.panelCode}</span>
                              {panel.accessories && panel.accessories.length > 0 && (
                                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  +{panel.accessories.length} Acc ({panel.accessories.reduce((sum, a) => sum + (Number(a.quantity) || 0), 0)} pcs)
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 3. Dimension */}
                          <td className="py-2.5 px-3 font-mono font-bold text-cyan-300">
                            {panel.dimension.formatted}
                          </td>

                          {/* 4. Condition */}
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                                panel.condition === "New"
                                  ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                                  : panel.condition === "Good"
                                  ? "bg-blue-950 text-blue-300 border border-blue-800"
                                  : panel.condition === "Used"
                                  ? "bg-amber-950 text-amber-300 border border-amber-800"
                                  : panel.condition === "Under Repair"
                                  ? "bg-purple-950 text-purple-300 border border-purple-800"
                                  : "bg-rose-950 text-rose-300 border border-rose-800"
                              }`}
                            >
                              <span>●</span>
                              <span>{panel.condition}</span>
                            </span>
                          </td>

                          {/* 5. Serial Number */}
                          <td className="py-2.5 px-3 font-mono text-slate-300">
                            <div className="flex items-center gap-1">
                              <span className="font-bold text-amber-300">
                                {panel.serialRangeFormatted || panel.individualSerialNumbers.slice(0, 2).join(", ")}
                              </span>
                              {panel.individualSerialNumbers.length > 2 && panel.serialMode === "Individual" && (
                                <span className="text-[10px] text-slate-500">
                                  (+{panel.individualSerialNumbers.length - 2})
                                </span>
                              )}
                            </div>
                            <span className="text-[9px] text-slate-500 block">
                              Mode: {panel.serialMode}
                            </span>
                          </td>

                          {/* 6. Quantity (Dedicated input) */}
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                min={1}
                                value={panel.quantity}
                                onChange={e => handleInlineQuantityChange(panel.id, Number(e.target.value))}
                                className="w-16 bg-slate-900 border border-slate-700 text-white font-mono font-bold rounded-lg px-2 py-1 text-xs text-center focus:outline-none focus:border-amber-500"
                              />
                              <span className="text-[10px] text-slate-400 font-mono">Pcs</span>
                            </div>
                          </td>

                          {/* 7. Location */}
                          <td className="py-2.5 px-3 font-mono text-slate-300">
                            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[11px] block max-w-[180px] truncate" title={panel.location.formattedLocation}>
                              {panel.location.formattedLocation}
                            </span>
                          </td>

                          {/* 8. Status */}
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-slate-900 text-slate-300 border border-slate-800">
                              {panel.status}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end space-x-1.5">
                              <button
                                type="button"
                                onClick={() => setInspectingPanel(panel)}
                                title="Inspect QR / Barcode"
                                className="p-1.5 text-slate-400 hover:text-amber-400 rounded-lg hover:bg-slate-900 cursor-pointer"
                              >
                                <QrCode size={15} />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingPanelEntry(panel);
                                  setShowAddPanelModal(true);
                                }}
                                title="Edit Panel Type"
                                className="p-1.5 text-slate-400 hover:text-cyan-400 rounded-lg hover:bg-slate-900 cursor-pointer"
                              >
                                <Edit3 size={15} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeletePanelType(panel.id)}
                                title="Delete"
                                className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-900 cursor-pointer"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-900/90 border-t border-slate-800 text-slate-200 font-bold">
                        <td colSpan={5} className="py-3 px-3 text-right font-mono uppercase text-slate-400">
                          {isAmharic ? "ጠቅላላ የፓነል ብዛት (Total Calculated Panels):" : "Total Calculated Panel Quantity:"}
                        </td>
                        <td className="py-3 px-3 font-mono font-black text-amber-400 text-sm">
                          {totalPanelQuantity.toLocaleString()} Pcs
                        </td>
                        <td colSpan={3} className="py-3 px-3 text-right text-[11px] font-mono text-cyan-400">
                          Est. ETB {totalEstimatedPanelValueEtb.toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* FINAL SUBMIT BUTTON BAR */}
          <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <Info size={14} className="text-amber-400" />
              <span>
                {isAmharic
                  ? "መጋዘኑ ሲመዘገብ መረጃው ወደ Firestore ይቀመጣል እንዲሁም የፓነል ክምችት ወዲያውኑ ንቁ ይሆናል።"
                  : "Saving commits warehouse to Firestore and activates initial panel inventory with serial tracking."}
              </span>
            </div>

            <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl text-xs font-bold cursor-pointer transition"
              >
                {isAmharic ? "ሰርዝ" : "Cancel"}
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-400 text-slate-950 rounded-2xl text-xs font-black uppercase tracking-wider shadow-xl shadow-amber-500/20 cursor-pointer transition transform active:scale-95 flex items-center space-x-2"
              >
                {isSubmitting ? (
                  <span>{isAmharic ? "እየተመዘገበ ነው..." : "Registering..."}</span>
                ) : (
                  <>
                    <CheckCircle size={16} />
                    <span>{isAmharic ? "መጋዘን እና ፓነሎችን መዝግብ ✓" : "Register Warehouse & Panel Inventory ✓"}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* EMBEDDED ADD / EDIT PANEL TYPE MODAL */}
      <AddPanelTypeModal
        isOpen={showAddPanelModal}
        onClose={() => {
          setShowAddPanelModal(false);
          setEditingPanelEntry(null);
        }}
        onSave={handleSavePanelType}
        existingSerials={allExistingSerials}
        initialData={editingPanelEntry}
        warehouseName={warehouseName || "New Central Warehouse"}
        warehouseId={warehouseId}
        isAmharic={isAmharic}
      />

      {/* QUICK QR / BARCODE INSPECTION MODAL */}
      {inspectingPanel && (
        <div className="fixed inset-0 z-60 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-scaleUp">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl max-w-md w-full p-6 space-y-4 text-center">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <span className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <QrCode size={16} />
                <span>Panel Tag & QR Inspector</span>
              </span>
              <button onClick={() => setInspectingPanel(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
              <div className="w-32 h-32 mx-auto bg-white p-2 rounded-xl flex items-center justify-center">
                <QRCodeSVG 
                  value={inspectingPanel.qrCodePayload || inspectingPanel.panelCode || inspectingPanel.id} 
                  size={110} 
                  level="M" 
                />
              </div>
              <span className="text-xs font-mono font-bold text-amber-400 block">{inspectingPanel.panelCode}</span>
              <span className="text-[11px] font-mono text-slate-300 block">{inspectingPanel.dimension.formatted}</span>
              <span className="text-[10px] font-mono text-slate-500 block">{inspectingPanel.qrCodePayload}</span>
            </div>

            <div className="text-left text-xs space-y-1 bg-slate-950 p-3 rounded-xl border border-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-400">Condition:</span>
                <span className="text-white font-bold">{inspectingPanel.condition}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Serials:</span>
                <span className="text-amber-300 font-mono font-bold">{inspectingPanel.serialRangeFormatted}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Location:</span>
                <span className="text-cyan-300 font-mono text-[11px]">{inspectingPanel.location.formattedLocation}</span>
              </div>
              {inspectingPanel.accessories && inspectingPanel.accessories.length > 0 && (
                <div className="pt-2 border-t border-slate-800">
                  <span className="text-slate-400 block mb-1 font-bold text-[10px] uppercase text-amber-400">
                    Attached Master Accessories ({inspectingPanel.accessories.length}):
                  </span>
                  <div className="space-y-1 max-h-28 overflow-y-auto">
                    {inspectingPanel.accessories.map((a, i) => (
                      <div key={i} className="flex justify-between text-[10px] bg-slate-900/80 px-2 py-1 rounded border border-slate-800">
                        <span className="text-white font-medium">{a.accessoryName} ({a.accessoryCode})</span>
                        <span className="font-mono text-amber-300 font-bold">{a.quantity} {a.unit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => {
                alert(`Printing barcode tag for ${inspectingPanel.panelCode} (${inspectingPanel.quantity} copies)`);
                setInspectingPanel(null);
              }}
              className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-lg"
            >
              <Printer size={16} />
              <span>Print Industrial Tag / Barcode</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
