import React, { useState, useEffect, useRef } from "react";
import { 
  motion, 
  AnimatePresence 
} from "motion/react";
import { 
  Layers, 
  Plus, 
  QrCode, 
  Scan, 
  RefreshCw, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Wrench, 
  MapPin, 
  Tag, 
  Hash, 
  Search, 
  Filter, 
  Trash2, 
  ArrowRight, 
  Activity, 
  Calendar, 
  DollarSign, 
  Camera, 
  Download, 
  FileText,
  AlertCircle,
  HelpCircle,
  Clock,
  User,
  Info,
  Ship,
  Truck,
  ShieldCheck,
  ClipboardCheck,
  Sparkles,
  Printer,
  Building2,
  Layers3,
  Box,
  RotateCcw,
  FileSpreadsheet,
  Eye,
  Globe
} from "lucide-react";
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend 
} from "recharts";
import { DbService } from "../services/db";
import { 
  AluminumFormworkPanel, 
  PanelMovementLog, 
  PanelDamageReport, 
  PanelRepairRecord, 
  PanelType, 
  PanelStatus,
  UserRole,
  AuditLog,
  ProjectZone,
  DailyPanelLog,
  OverseasShipment,
  CustomsRecord,
  DispatchTransfer,
  SiteReceivingReport,
  InventoryAuditRecord
} from "../types";

interface FormworkManagementProps {
  isAmharic: boolean;
  currentUserRole: UserRole;
  currentUserName: string;
}

export const FormworkManagement: React.FC<FormworkManagementProps> = ({
  isAmharic,
  currentUserRole,
  currentUserName
}) => {
  // --- Data States ---
  const [panels, setPanels] = useState<AluminumFormworkPanel[]>([]);
  const [movementLogs, setMovementLogs] = useState<PanelMovementLog[]>([]);
  const [damageReports, setDamageReports] = useState<PanelDamageReport[]>([]);
  const [repairRecords, setRepairRecords] = useState<PanelRepairRecord[]>([]);
  const [shipments, setShipments] = useState<OverseasShipment[]>([]);
  const [customsRecords, setCustomsRecords] = useState<CustomsRecord[]>([]);
  const [dispatchTransfers, setDispatchTransfers] = useState<DispatchTransfer[]>([]);
  const [receivingReports, setReceivingReports] = useState<SiteReceivingReport[]>([]);
  const [inventoryAudits, setInventoryAudits] = useState<InventoryAuditRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- UI/Interaction States ---
  const [activeSubTab, setActiveSubTab] = useState<
    | "dashboard"
    | "database"
    | "shipments_customs"
    | "transfers"
    | "daily_installation"
    | "cleaning_inspection"
    | "audit"
    | "usage"
    | "ai_planning"
    | "damage_repair"
    | "missing"
    | "bundle_calc"
    | "scanner"
    | "reports"
  >("dashboard");
  const [zones, setZones] = useState<ProjectZone[]>([]);
  const [dailyLogs, setDailyLogs] = useState<DailyPanelLog[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [locationFilter, setLocationFilter] = useState<string>("All");

  // --- Modal States ---
  const [showAddShipmentModal, setShowAddShipmentModal] = useState(false);
  const [showNewDispatchModal, setShowNewDispatchModal] = useState(false);
  const [selectedTransferForReceiving, setSelectedTransferForReceiving] = useState<DispatchTransfer | null>(null);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [selectedPanelForCleaning, setSelectedPanelForCleaning] = useState<AluminumFormworkPanel | null>(null);

  // --- Automated Bundle Optimizer States ---
  const [optLength, setOptLength] = useState<number>(35);
  const [optHeight, setOptHeight] = useState<number>(3.0);
  const [optCorners, setOptCorners] = useState<number>(10);
  const [optDoubleSided, setOptDoubleSided] = useState<boolean>(true);
  const [optLocation, setOptLocation] = useState<string>("Digital Bole Heights");
  const [optZone, setOptZone] = useState<string>("Floor 5 Zone A");
  const [optResults, setOptResults] = useState<any | null>(null);
  const [optIsAllocating, setOptIsAllocating] = useState<boolean>(false);
  const [optAllocationSuccess, setOptAllocationSuccess] = useState<boolean>(false);
  const [optCurrentStep, setOptCurrentStep] = useState<number>(0);

  // --- Modal States ---
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [selectedPanelForMove, setSelectedPanelForMove] = useState<AluminumFormworkPanel | null>(null);
  const [showDamageModal, setShowDamageModal] = useState(false);
  const [selectedPanelForDamage, setSelectedPanelForDamage] = useState<AluminumFormworkPanel | null>(null);
  const [showRepairModal, setShowRepairModal] = useState(false);
  const [selectedDamageReportForRepair, setSelectedDamageReportForRepair] = useState<PanelDamageReport | null>(null);
  const [showQRLabelModal, setShowQRLabelModal] = useState<AluminumFormworkPanel | null>(null);

  // --- Form States ---
  // Add Panel Form
  const [newPanelSerial, setNewPanelSerial] = useState("");
  const [newPanelBundle, setNewPanelBundle] = useState("");
  const [newPanelSize, setNewPanelSize] = useState("1200x600 mm");
  const [newPanelType, setNewPanelType] = useState<PanelType>(PanelType.WALL);
  const [newPanelLocation, setNewPanelLocation] = useState("Digital Bole Heights");
  const [newPanelZone, setNewPanelZone] = useState("Floor 4 Zone A");
  const [newPanelQuantity, setNewPanelQuantity] = useState(1);
  const [newPanelStatus, setNewPanelStatus] = useState<PanelStatus>(PanelStatus.ACTIVE);
  const [newPanelWeight, setNewPanelWeight] = useState<number>(14.5);
  const [newPanelFloor, setNewPanelFloor] = useState<number>(4);
  const [newPanelBuilding, setNewPanelBuilding] = useState("Block A");
  const [newPanelPhoto, setNewPanelPhoto] = useState("");

  // Move Panel Form
  const [moveDestination, setMoveDestination] = useState("Digital Saris Block B");
  const [moveZone, setMoveZone] = useState("Floor 1 Zone B");
  const [moveNotes, setMoveNotes] = useState("");

  // Damage Report Form
  const [damageSeverity, setDamageSeverity] = useState<"Low" | "Medium" | "High">("Medium");
  const [damageDescription, setDamageDescription] = useState("");
  const [directDamagePanelId, setDirectDamagePanelId] = useState("");
  const [isDirectDamageMode, setIsDirectDamageMode] = useState(false);

  // Repair Form
  const [repairTechnician, setRepairTechnician] = useState("");
  const [repairDetails, setRepairDetails] = useState("");
  const [repairCost, setRepairCost] = useState(1200);

  // --- Daily Panel Installation Log States ---
  const INITIAL_INSTALL_ROWS = [
    { category: "WALL PANELS", type: "Standard Wall Panel", standardDimensions: "Width: 300–600 mm; Height: 2400 mm", customDimensions: "", isCustom: false, quantity: 0, notes: "", isSelected: false },
    { category: "WALL PANELS", type: "Narrow Wall Panel", standardDimensions: "Width: 50–250 mm; Height: 2400 mm", customDimensions: "", isCustom: false, quantity: 0, notes: "", isSelected: false },
    { category: "WALL PANELS", type: "Wall End Panel", standardDimensions: "Project-specific widths", customDimensions: "", isCustom: false, quantity: 0, notes: "", isSelected: false },
    { category: "WALL PANELS", type: "Wall Tie Sleeve Panel", standardDimensions: "PVC sleeve spacing", customDimensions: "", isCustom: false, quantity: 0, notes: "", isSelected: false },
    { category: "SLAB/DECK PANELS", type: "Slab Panel", standardDimensions: "300×1200 to 600×1200 mm", customDimensions: "", isCustom: false, quantity: 0, notes: "", isSelected: false },
    { category: "SLAB/DECK PANELS", type: "Slab Corner (SC)", standardDimensions: "Height: 125 mm", customDimensions: "", isCustom: false, quantity: 0, notes: "", isSelected: false },
    { category: "SLAB/DECK PANELS", type: "Slab Inner Corner", standardDimensions: "Custom joint angles", customDimensions: "", isCustom: false, quantity: 0, notes: "", isSelected: false },
    { category: "SLAB/DECK PANELS", type: "Slab Outer Corner", standardDimensions: "Custom joint angles", customDimensions: "", isCustom: false, quantity: 0, notes: "", isSelected: false },
    { category: "BEAM PANELS", type: "Main Beam (MB)", standardDimensions: "Width: 150 mm; Height: 125 mm", customDimensions: "", isCustom: false, quantity: 0, notes: "", isSelected: false },
    { category: "BEAM PANELS", type: "End Beam (EB)", standardDimensions: "Width: 150 mm; Height: 125 mm", customDimensions: "", isCustom: false, quantity: 0, notes: "", isSelected: false },
    { category: "BEAM PANELS", type: "Custom Beam Side/Soffit", standardDimensions: "Project-specific size", customDimensions: "", isCustom: false, quantity: 0, notes: "", isSelected: false },
    { category: "CORNER PANELS", type: "Internal Corner Panel", standardDimensions: "Standard 90° angles", customDimensions: "", isCustom: false, quantity: 0, notes: "", isSelected: false },
    { category: "CORNER PANELS", type: "External Corner Panel", standardDimensions: "Standard 90° angles", customDimensions: "", isCustom: false, quantity: 0, notes: "", isSelected: false },
    { category: "CORNER PANELS", type: "L-Shaped Angle", standardDimensions: "4 mm panel; 65 mm frame", customDimensions: "", isCustom: false, quantity: 0, notes: "", isSelected: false },
    { category: "CORNER PANELS", type: "Roof Corner C-Shape", standardDimensions: "Integrated roof frame", customDimensions: "", isCustom: false, quantity: 0, notes: "", isSelected: false },
    { category: "KICKER PANELS", type: "Kicker Panel", standardDimensions: "Wall starter heights", customDimensions: "", isCustom: false, quantity: 0, notes: "", isSelected: false },
    { category: "COLUMN PANELS", type: "Column Formwork Panel", standardDimensions: "150×150 to 600×600 mm", customDimensions: "", isCustom: false, quantity: 0, notes: "", isSelected: false },
    { category: "OPENING PANELS", type: "Door Opening Panel", standardDimensions: "Custom width × height with reveals", customDimensions: "", isCustom: false, quantity: 0, notes: "", isSelected: false },
    { category: "OPENING PANELS", type: "Window Opening Panel", standardDimensions: "Custom width × height with reveals", customDimensions: "", isCustom: false, quantity: 0, notes: "", isSelected: false },
    { category: "SPECIALTY PANELS", type: "Staircase Panel", standardDimensions: "Custom tread & riser configurations", customDimensions: "", isCustom: false, quantity: 0, notes: "", isSelected: false },
    { category: "SPECIALTY PANELS", type: "Balcony Panel", standardDimensions: "Custom balcony projection", customDimensions: "", isCustom: false, quantity: 0, notes: "", isSelected: false },
    { category: "SPECIALTY PANELS", type: "Parapet Panel", standardDimensions: "Coping details integrated", customDimensions: "", isCustom: false, quantity: 0, notes: "", isSelected: false },
    { category: "SPECIALTY PANELS", type: "Special Prop Head", standardDimensions: "Support props head joint", customDimensions: "", isCustom: false, quantity: 0, notes: "", isSelected: false }
  ];

  const [installRows, setInstallRows] = useState(INITIAL_INSTALL_ROWS);
  const [installDate, setInstallDate] = useState("2026-07-19");
  const [installReporterName, setInstallReporterName] = useState(currentUserName || "Abebe Kebede");
  const [installReporterRole, setInstallReporterRole] = useState("Supervisor");
  const [selectedZoneId, setSelectedZoneId] = useState("");

  // Other Custom Panel Form
  const [customPanelType, setCustomPanelType] = useState("");
  const [customPanelCategory, setCustomPanelCategory] = useState("WALL PANELS");
  const [customPanelDims, setCustomPanelDims] = useState("");
  const [selectedInstallCategory, setSelectedInstallCategory] = useState("WALL PANELS");

  // --- Master Prompt Warehouse Management States ---
  const [warehouses, setWarehouses] = useState<any[]>([
    { name: "Central Bole Warehouse", code: "WH-BOLE-01", location: "Bole Subcity, Addis Ababa", gps: "9.0125° N, 38.7850° E", manager: "Abebe Kebede", capacity: 5000, minStock: 500, maxStock: 4500, currentStock: 1200 },
    { name: "Saris Industrial Yard", code: "WH-SARIS-02", location: "Nifas Silk, Addis Ababa", gps: "8.9723° N, 38.7490° E", manager: "Eng. Chala", capacity: 8000, minStock: 800, maxStock: 7500, currentStock: 1800 },
    { name: "Gotera Storage Depot", code: "WH-GOTERA-03", location: "Kirkos, Addis Ababa", gps: "9.0012° N, 38.7610° E", manager: "Mulugeta Tesfaye", capacity: 4000, minStock: 400, maxStock: 3500, currentStock: 950 },
  ]);
  const [showAddWarehouseModal, setShowAddWarehouseModal] = useState(false);
  const [newWhName, setNewWhName] = useState("");
  const [newWhCode, setNewWhCode] = useState("");
  const [newWhLoc, setNewWhLoc] = useState("");
  const [newWhGps, setNewWhGps] = useState("9.0200° N, 38.7500° E");
  const [newWhManager, setNewWhManager] = useState("");
  const [newWhCapacity, setNewWhCapacity] = useState(5000);
  const [newWhMinStock, setNewWhMinStock] = useState(500);
  const [newWhMaxStock, setNewWhMaxStock] = useState(4500);

  // --- Material Transfer (MTN) States ---
  const [transfers, setTransfers] = useState<any[]>([
    {
      id: "MTN-2026-072101",
      date: "2026-07-21",
      fromLocation: "Central Bole Warehouse",
      toLocation: "Digital Bole Heights",
      status: "In Transit", // Pending, In Transit, Received, Cancelled
      driverName: "Kassa Tekle",
      truckPlate: "AA-3-B44502",
      senderApproval: "Abebe Kebede",
      receiverApproval: "",
      signature: "Abebe K.",
      gpsTracking: "9.0050° N, 38.7750° E",
      panelsCount: 150,
      panelsList: [
        { type: "Wall Panel", size: "1200x600 mm", qty: 100 },
        { type: "Slab Panel", size: "1200x600 mm", qty: 50 },
      ]
    },
    {
      id: "MTN-2026-071904",
      date: "2026-07-19",
      fromLocation: "Saris Industrial Yard",
      toLocation: "Digital Saris Block B",
      status: "Received",
      driverName: "Mohammed Seid",
      truckPlate: "AA-2-C11982",
      senderApproval: "Eng. Chala",
      receiverApproval: "Alemayehu Kebede",
      signature: "Chala S. / Alemayehu K.",
      gpsTracking: "8.9723° N, 38.7490° E",
      panelsCount: 220,
      panelsList: [
        { type: "Wall Panel", size: "1200x600 mm", qty: 150 },
        { type: "Column Panel", size: "1200x1200 mm", qty: 70 },
      ]
    }
  ]);

  const [showCreateTransferModal, setShowCreateTransferModal] = useState(false);
  const [transferFrom, setTransferFrom] = useState("Central Bole Warehouse");
  const [transferTo, setTransferTo] = useState("Digital Bole Heights");
  const [transferDriver, setTransferDriver] = useState("");
  const [transferTruck, setTransferTruck] = useState("");
  const [transferPanelsText, setTransferPanelsText] = useState("WALL_STANDARD: 1200x600 mm - Qty: 80\nSLAB_PANEL: 1200x600 mm - Qty: 40");
  const [transferSignature, setTransferSignature] = useState("");

  // --- AI CAD Planning States ---
  const [cadFileName, setCadFileName] = useState("");
  const [isAnalyzingCad, setIsAnalyzingCad] = useState(false);
  const [cadPlanningResult, setCadPlanningResult] = useState<any | null>(null);

  // --- AI Alerts States ---
  const [aiAlerts, setAiAlerts] = useState<any[]>([
    { id: 1, type: "Low Stock Alert", msg: "Central Bole Warehouse is below minimum stock (380 panels remaining, threshold 500)", severity: "high", date: "Just now" },
    { id: 2, type: "Overused Panel Warning", msg: "Panel AFP-1004 has exceeded 50 pours (current: 56 pours). Preventive inspection required.", severity: "medium", date: "10 mins ago" },
    { id: 3, type: "Delayed Delivery Risk", msg: "MTN-2026-072101 driver has reported route congestion on Bole Road. Risk of 45-min site arrival delay.", severity: "low", date: "25 mins ago" },
    { id: 4, type: "Wrong Site Delivery Alert", msg: "Truck plate AA-3-B44502 was flagged outside authorized geo-fence. Verify actual coordinates.", severity: "high", date: "1 hour ago" },
  ]);

  // --- Camera Scan Simulator States ---
  const [scannerActive, setScannerActive] = useState(false);
  const [scannerMessage, setScannerMessage] = useState<string | null>(null);
  const [scannedPanel, setScannedPanel] = useState<AluminumFormworkPanel | null>(null);
  const [scannerType, setScannerType] = useState<"camera" | "barcode" | "qr">("camera");
  const videoRef = useRef<HTMLDivElement>(null);
  const [laserY, setLaserY] = useState(0);

  // --- Translation Dictionary (Local for module fidelity) ---
  const t = (en: string, am: string) => (isAmharic ? am : en);

  // --- Fetch Data ---
  const loadData = async () => {
    setIsLoading(true);
    try {
      const dbPanels = await DbService.getFormworkPanels();
      const dbMovements = await DbService.getPanelMovementLogs();
      const dbDamages = await DbService.getPanelDamageReports();
      const dbRepairs = await DbService.getPanelRepairRecords();
      const dbZones = await DbService.getZones();
      const dbShipments = await DbService.getOverseasShipments();
      const dbCustoms = await DbService.getCustomsRecords();
      const dbTransfers = await DbService.getDispatchTransfers();
      const dbReceiving = await DbService.getSiteReceivingReports();
      const dbAudits = await DbService.getInventoryAudits();

      setPanels(dbPanels);
      setMovementLogs(dbMovements);
      setDamageReports(dbDamages);
      setRepairRecords(dbRepairs);
      setZones(dbZones);
      setShipments(dbShipments);
      setCustomsRecords(dbCustoms);
      setDispatchTransfers(dbTransfers);
      setReceivingReports(dbReceiving);
      setInventoryAudits(dbAudits);

      if (dbZones.length > 0) {
        setSelectedZoneId(dbZones[0].id);
      }

      // Aggregate daily panel logs from all zones
      const logs: DailyPanelLog[] = [];
      dbZones.forEach(z => {
        if (z.dailyPanelLogs) {
          z.dailyPanelLogs.forEach(l => {
            logs.push({
              ...l,
              notes: l.notes ? `${z.building} (FL ${z.floor} ${z.zone}): ${l.notes}` : `${z.building} (FL ${z.floor} ${z.zone})`
            });
          });
        }
      });

      // Load any additional locally stored daily logs
      const localLogsStr = localStorage.getItem("digital_construction_db_daily_panel_logs");
      if (localLogsStr) {
        try {
          const localLogs = JSON.parse(localLogsStr) as DailyPanelLog[];
          logs.push(...localLogs);
        } catch (e) {
          console.error("Error parsing local daily panel logs", e);
        }
      }

      // Sort logs by date descending
      logs.sort((a, b) => b.date.localeCompare(a.date));
      setDailyLogs(logs);
    } catch (err) {
      console.error("Error loading formwork data", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // --- Daily Panel Installation Helper & Action Handlers ---
  const calculateRowArea = (dimensionsStr: string, quantity: number): number => {
    if (quantity <= 0) return 0;
    let singleArea = 0.35;
    try {
      const numbers = dimensionsStr.replace(/,/g, '').match(/\d+/g);
      if (numbers && numbers.length >= 2) {
        const val1 = parseFloat(numbers[0]);
        const val2 = parseFloat(numbers[1]);
        if (val1 > 10 && val2 > 10) {
          singleArea = (val1 / 1000) * (val2 / 1000);
        } else {
          singleArea = val1 * val2;
        }
      } else if (numbers && numbers.length === 1) {
        const val = parseFloat(numbers[0]);
        if (val > 100) {
          singleArea = (val / 1000) * 2.4;
        }
      }
    } catch (e) {
      singleArea = 0.35;
    }
    if (singleArea < 0.01 || singleArea > 10.0) {
      singleArea = 0.35;
    }
    return Number((singleArea * quantity).toFixed(2));
  };

  const handleToggleSelect = (index: number) => {
    setInstallRows(prev => prev.map((row, idx) => {
      if (idx === index) {
        const nextSelected = !row.isSelected;
        return {
          ...row,
          isSelected: nextSelected,
          quantity: nextSelected && row.quantity === 0 ? 1 : row.quantity
        };
      }
      return row;
    }));
  };

  const handleQuantityChange = (index: number, val: number) => {
    setInstallRows(prev => prev.map((row, idx) => {
      if (idx === index) {
        const q = Math.max(0, val);
        return {
          ...row,
          quantity: q,
          isSelected: q > 0
        };
      }
      return row;
    }));
  };

  const handleNotesChange = (index: number, notes: string) => {
    setInstallRows(prev => prev.map((row, idx) => {
      if (idx === index) {
        return { ...row, notes };
      }
      return row;
    }));
  };

  const handleCustomDimensionsChange = (index: number, customDimensions: string) => {
    setInstallRows(prev => prev.map((row, idx) => {
      if (idx === index) {
        return { ...row, customDimensions };
      }
      return row;
    }));
  };

  const handleAddCustomRow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPanelType.trim()) return;

    const newRow = {
      category: customPanelCategory,
      type: customPanelType.trim(),
      standardDimensions: customPanelDims.trim() || "User Specified/Custom Size",
      customDimensions: "",
      isCustom: true,
      quantity: 1,
      notes: "Custom entry added by user",
      isSelected: true
    };

    setInstallRows(prev => [newRow, ...prev]);
    setCustomPanelType("");
    setCustomPanelDims("");
    
    // Toast-like notification
    alert(t(
      `Added custom panel type "${newRow.type}" under ${newRow.category} to selection table.`,
      `አዲስ ብጁ ፓነል ዓይነት "${newRow.type}" በ${newRow.category} ስር ተጨምሯል::`
    ));
  };

  const handleSubmitDailyLogs = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeRows = installRows.filter(r => r.isSelected && r.quantity > 0);
    if (activeRows.length === 0) {
      alert(t(
        "Please select at least one panel type and input quantity > 0.",
        "እባክዎ ቢያንስ አንድ የፓነል አይነት ይምረጡ እና የገጠማ መጠን ያስገቡ::"
      ));
      return;
    }

    try {
      // Find the selected zone details
      const zoneObj = zones.find(z => z.id === selectedZoneId);
      const zoneStr = zoneObj ? `${zoneObj.building} FL ${zoneObj.floor} ${zoneObj.zone}` : "Selected Site Zone";

      const newLogs: DailyPanelLog[] = activeRows.map((row, idx) => {
        const finalDims = row.customDimensions || row.standardDimensions;
        const numbers = finalDims.replace(/,/g, '').match(/\d+/g);
        let len = 1.2;
        let wid = 0.3;
        if (numbers && numbers.length >= 2) {
          const v1 = parseFloat(numbers[0]);
          const v2 = parseFloat(numbers[1]);
          len = v1 > 10 ? v1 / 1000 : v1;
          wid = v2 > 10 ? v2 / 1000 : v2;
        } else if (numbers && numbers.length === 1) {
          const v = parseFloat(numbers[0]);
          len = v > 10 ? v / 1000 : v;
          wid = 0.3;
        }

        const qty = row.quantity;
        const area = calculateRowArea(finalDims, qty);

        return {
          id: `LOG-P-${Date.now()}-${idx}`,
          loggedBy: installReporterName,
          role: installReporterRole,
          date: installDate,
          panelType: `${row.category}: ${row.type}`,
          length: len,
          width: wid,
          quantity: qty,
          calculatedArea: area,
          notes: row.notes ? `${row.notes} (${zoneStr})` : `Installed at ${zoneStr}`
        };
      });

      // Save to local storage daily logs list
      const localLogsStr = localStorage.getItem("digital_construction_db_daily_panel_logs");
      let currentLocalLogs: DailyPanelLog[] = [];
      if (localLogsStr) {
        try {
          currentLocalLogs = JSON.parse(localLogsStr);
        } catch (e) {}
      }
      currentLocalLogs.unshift(...newLogs);
      localStorage.setItem("digital_construction_db_daily_panel_logs", JSON.stringify(currentLocalLogs));

      // Append logs to selected project zone if available
      if (zoneObj) {
        const updatedZone = {
          ...zoneObj,
          installedPanels: (zoneObj.installedPanels || 0) + newLogs.reduce((acc, curr) => acc + curr.quantity, 0),
          dailyPanelLogs: [...(zoneObj.dailyPanelLogs || []), ...newLogs]
        };
        await DbService.updateZone(updatedZone);
      }

      // Record Audit Log
      await DbService.addAuditLog({
        id: `AUDIT-${Date.now()}`,
        timestamp: new Date().toISOString(),
        userId: "ERP-USR-004",
        userName: installReporterName,
        role: installReporterRole as any,
        action: "Daily Panel Installation Submitted",
        details: `Logged ${newLogs.length} panel types (${newLogs.reduce((acc, curr) => acc + curr.quantity, 0)} pcs, ${newLogs.reduce((acc, curr) => acc + curr.calculatedArea, 0).toFixed(2)} m²) installed at ${zoneStr}`
      });

      // Reset installation quantities
      setInstallRows(INITIAL_INSTALL_ROWS);
      
      // Reload the data
      await loadData();

      alert(t(
        "Daily installation report submitted successfully! Panel inventory metrics, audit logs, and project zone tracking updated.",
        "የዕለታዊ ፓነል ገጠማ ሪፖርት በተሳካ ሁኔታ ገብቷል! የፓነል ክምችት፣ የኦዲት መዝገብ እና የዞን መረጃዎች ተዘምነዋል።"
      ));
    } catch (err) {
      console.error("Error submitting daily installation logs", err);
      alert(t("Failed to submit daily log.", "ሪፖርቱን ማስገባት አልተቻለም::"));
    }
  };

  // --- Scanner Simulator Laser Effect ---
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (scannerActive) {
      interval = setInterval(() => {
        setLaserY(prev => (prev >= 100 ? 0 : prev + 2));
      }, 30);
    }
    return () => clearInterval(interval);
  }, [scannerActive]);

  // --- Helper calculations ---
  const totalPanelsCount = panels.reduce((sum, p) => sum + p.quantity, 0);
  const inUseCount = panels.filter(p => p.status === PanelStatus.IN_USE).reduce((sum, p) => sum + p.quantity, 0);
  const activeCount = panels.filter(p => p.status === PanelStatus.ACTIVE).reduce((sum, p) => sum + p.quantity, 0);
  const damagedCount = panels.filter(p => p.status === PanelStatus.DAMAGED).reduce((sum, p) => sum + p.quantity, 0);
  const underRepairCount = panels.filter(p => p.status === PanelStatus.UNDER_REPAIR).reduce((sum, p) => sum + p.quantity, 0);
  const missingCount = panels.filter(p => p.status === PanelStatus.MISSING).reduce((sum, p) => sum + p.quantity, 0);
  const totalUsageCycles = panels.reduce((sum, p) => sum + p.usageCount, 0);

  // --- Chart Datasets ---
  const panelTypeData = Object.values(PanelType).map(type => {
    const count = panels.filter(p => p.type === type).reduce((sum, p) => sum + p.quantity, 0);
    return { name: type, value: count };
  }).filter(item => item.value > 0);

  const panelStatusData = Object.values(PanelStatus).map(status => {
    const count = panels.filter(p => p.status === status).reduce((sum, p) => sum + p.quantity, 0);
    return { name: status, value: count };
  });

  const locationData = Array.from(new Set(panels.map(p => p.location))).map(loc => {
    const count = panels.filter(p => p.location === loc).reduce((sum, p) => sum + p.quantity, 0);
    return { name: loc, count };
  });

  const COLORS = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#6366f1", "#8b5cf6"];
  const STATUS_COLORS: Record<string, string> = {
    [PanelStatus.ACTIVE]: "#10b981",
    [PanelStatus.IN_USE]: "#3b82f6",
    [PanelStatus.DAMAGED]: "#ef4444",
    [PanelStatus.UNDER_REPAIR]: "#f59e0b",
    [PanelStatus.MISSING]: "#6366f1",
  };

  // --- Handlers ---
  const handleRegisterPanel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPanelSerial.trim()) return;

    const newId = `AFP-${1000 + panels.length + 1}`;
    const newPanel: AluminumFormworkPanel = {
      id: newId,
      serialNumber: newPanelSerial.toUpperCase(),
      bundleNumber: newPanelBundle || "N/A",
      size: newPanelSize,
      type: newPanelType,
      quantity: Number(newPanelQuantity) || 1,
      location: newPanelLocation,
      zone: newPanelZone,
      status: newPanelStatus,
      usageCount: 0,
      createdAt: new Date().toISOString(),
      weight: Number(newPanelWeight) || 14.5,
      floor: Number(newPanelFloor) || 4,
      building: newPanelBuilding || "Block A",
      photo: newPanelPhoto || "https://images.unsplash.com/photo-1590069261209-f8e9b8642343?w=400"
    };

    await DbService.addFormworkPanel(newPanel);
    
    // Log initial audit/movement log
    const initialLog: PanelMovementLog = {
      id: `PMV-${Date.now()}`,
      panelId: newId,
      fromLocation: "Central Dispatch",
      fromZone: "Registration",
      toLocation: newPanelLocation,
      toZone: newPanelZone,
      timestamp: new Date().toISOString(),
      movedBy: currentUserName,
      notes: "Initial panel registration and site assignment"
    };
    await DbService.addPanelMovementLog(initialLog);

    // Refresh data
    await loadData();
    setShowAddModal(false);
    
    // Reset inputs
    setNewPanelSerial("");
    setNewPanelBundle("");
    setNewPanelQuantity(1);
    setNewPanelWeight(14.5);
    setNewPanelFloor(4);
    setNewPanelBuilding("Block A");
    setNewPanelPhoto("");
  };

  const handleMovePanel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPanelForMove) return;

    const oldLocation = selectedPanelForMove.location;
    const oldZone = selectedPanelForMove.zone;

    // Update panel
    const updatedPanel: AluminumFormworkPanel = {
      ...selectedPanelForMove,
      location: moveDestination,
      zone: moveZone,
      status: moveDestination.toLowerCase().includes("scrap") || moveDestination.toLowerCase().includes("repair") 
              ? PanelStatus.UNDER_REPAIR 
              : PanelStatus.IN_USE,
      // Increment usage cycle when deployed to standard construction zones
      usageCount: moveDestination.toLowerCase().includes("heights") || moveDestination.toLowerCase().includes("saris")
                  ? selectedPanelForMove.usageCount + 1
                  : selectedPanelForMove.usageCount
    };

    await DbService.updateFormworkPanel(updatedPanel);

    // Create log
    const log: PanelMovementLog = {
      id: `PMV-${Date.now()}`,
      panelId: selectedPanelForMove.id,
      fromLocation: oldLocation,
      fromZone: oldZone,
      toLocation: moveDestination,
      toZone: moveZone,
      timestamp: new Date().toISOString(),
      movedBy: currentUserName,
      notes: moveNotes || "Relocated for active floor cycle"
    };

    await DbService.addPanelMovementLog(log);

    await loadData();
    setShowMoveModal(false);
    setSelectedPanelForMove(null);
    setMoveNotes("");
  };

  const handleReportDamage = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetPanelId = isDirectDamageMode ? directDamagePanelId.trim() : (selectedPanelForDamage?.id || "");
    if (!targetPanelId || !damageDescription.trim()) return;

    // Find if the panel exists in our list
    const originalPanel = panels.find(p => p.id === targetPanelId);
    if (originalPanel) {
      const updatedPanel: AluminumFormworkPanel = {
        ...originalPanel,
        status: PanelStatus.DAMAGED
      };
      await DbService.updateFormworkPanel(updatedPanel);
    } else {
      // If the panel doesn't exist, register it automatically as a Damaged panel
      const newPanel: AluminumFormworkPanel = {
        id: targetPanelId,
        serialNumber: `SN-${targetPanelId}`,
        bundleNumber: "BND-GEN",
        size: "1200x600 mm",
        type: PanelType.WALL,
        quantity: 1,
        location: "Warehouse / Repair Yard",
        zone: "Repair Zone",
        status: PanelStatus.DAMAGED,
        usageCount: 1,
        createdAt: new Date().toISOString()
      };
      await DbService.addFormworkPanel(newPanel);
    }

    // Create damage report
    const damageId = `PDR-${Date.now()}`;
    const report: PanelDamageReport = {
      id: damageId,
      panelId: targetPanelId,
      severity: damageSeverity,
      description: damageDescription,
      reportedBy: currentUserName,
      reportedDate: new Date().toISOString().split("T")[0],
      status: "Reported"
    };

    await DbService.addPanelDamageReport(report);

    await loadData();
    setShowDamageModal(false);
    setSelectedPanelForDamage(null);
    setDirectDamagePanelId("");
    setIsDirectDamageMode(false);
    setDamageDescription("");
  };

  const handleRegisterRepair = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDamageReportForRepair || !repairTechnician.trim() || !repairDetails.trim()) return;

    // Update damage report status
    const updatedReport: PanelDamageReport = {
      ...selectedDamageReportForRepair,
      status: "Repaired"
    };
    await DbService.updatePanelDamageReport(updatedReport);

    // Fetch associated panel and set status back to Active
    const originalPanel = panels.find(p => p.id === selectedDamageReportForRepair.panelId);
    if (originalPanel) {
      const updatedPanel: AluminumFormworkPanel = {
        ...originalPanel,
        status: PanelStatus.ACTIVE
      };
      await DbService.updateFormworkPanel(updatedPanel);
    }

    // Add repair history record
    const repairRecord: PanelRepairRecord = {
      id: `PRR-${Date.now()}`,
      panelId: selectedDamageReportForRepair.panelId,
      damageReportId: selectedDamageReportForRepair.id,
      technician: repairTechnician,
      repairDetails: repairDetails,
      cost: Number(repairCost) || 0,
      repairDate: new Date().toISOString().split("T")[0]
    };
    await DbService.addPanelRepairRecord(repairRecord);

    await loadData();
    setShowRepairModal(false);
    setSelectedDamageReportForRepair(null);
    setRepairTechnician("");
    setRepairDetails("");
  };

  const handleIncrementUsage = async (panel: AluminumFormworkPanel) => {
    const updatedPanel: AluminumFormworkPanel = {
      ...panel,
      usageCount: panel.usageCount + 1
    };
    await DbService.updateFormworkPanel(updatedPanel);
    await loadData();
  };

  const handleReportMissing = async (panel: AluminumFormworkPanel) => {
    const updatedPanel: AluminumFormworkPanel = {
      ...panel,
      status: PanelStatus.MISSING
    };
    await DbService.updateFormworkPanel(updatedPanel);

    // Log the event as movement log
    const log: PanelMovementLog = {
      id: `PMV-${Date.now()}`,
      panelId: panel.id,
      fromLocation: panel.location,
      fromZone: panel.zone,
      toLocation: "UNKNOWN (MISSING)",
      toZone: "ALERT",
      timestamp: new Date().toISOString(),
      movedBy: currentUserName,
      notes: "Panel flagged as missing during cycle audit"
    };
    await DbService.addPanelMovementLog(log);

    await loadData();
  };

  const handleMarkAsFound = async (panel: AluminumFormworkPanel) => {
    const updatedPanel: AluminumFormworkPanel = {
      ...panel,
      status: PanelStatus.ACTIVE
    };
    await DbService.updateFormworkPanel(updatedPanel);

    // Log recovery
    const log: PanelMovementLog = {
      id: `PMV-${Date.now()}`,
      panelId: panel.id,
      fromLocation: "UNKNOWN (MISSING)",
      fromZone: "ALERT",
      toLocation: panel.location,
      toZone: panel.zone,
      timestamp: new Date().toISOString(),
      movedBy: currentUserName,
      notes: "Panel located and audited back to active service"
    };
    await DbService.addPanelMovementLog(log);

    await loadData();
  };

  const handleDeletePanel = async (id: string) => {
    if (confirm(t("Are you sure you want to delete this panel record?", "እርግጠኛ ነዎት ይህንን የፓነል መዝገብ ማጥፋት ይፈልጋሉ?"))) {
      await DbService.deleteFormworkPanel(id);
      await loadData();
    }
  };

  // --- Automated Bundle Optimizer Handlers ---
  const handleRunOptimization = () => {
    // Standard section width is 0.6 meters (600 mm)
    const sectionWidth = 0.6;
    const sectionsCount = Math.ceil(optLength / sectionWidth);
    const sideMultiplier = optDoubleSided ? 2 : 1;
    
    // Primary Panel: 2400x600 mm (weight: 30.5 kg, area: 1.44 m2)
    // Secondary Panel: 1200x600 mm (weight: 15.2 kg, area: 0.72 m2)
    // Filler Panel: 1200x450 mm (weight: 11.4 kg, area: 0.54 m2)
    // Corner Panel: 200x200x1200 mm (weight: 14 kg)
    
    let qty2400 = 0;
    let qty1200 = 0;
    let qtyFiller = 0;
    
    // Stack layout: Height division profile
    // 1x 2400x600 mm Wall Panel (height: 2.4m) + 1x 1200x600 mm Wall Panel (height: 1.2m, overlaps concrete tie line)
    qty2400 = sectionsCount * sideMultiplier;
    qty1200 = sectionsCount * sideMultiplier;
    
    // Corner panels logic:
    // Each corner needs full height. Corners are 1.2m tall.
    // We stack corners to cover the target wall height.
    const qtyCorners = optCorners * Math.ceil(optHeight / 1.2) * 2 * sideMultiplier;
    
    // Joint Pin & Wedge pins: standard is 8 pin sets per panel joint
    const totalPanels = qty2400 + qty1200 + qtyCorners;
    const qtyPins = totalPanels * 8; 
    const qtyWallTies = (qty2400 * 3) + (qty1200 * 2); 
    
    // Adjustments for fractional length fillers
    const remainderLength = optLength % sectionWidth;
    if (remainderLength > 0) {
      qtyFiller = Math.ceil(remainderLength / 0.45) * Math.ceil(optHeight / 1.2) * sideMultiplier;
    }
    
    // Weights calculations
    const wt2400 = qty2400 * 30.5;
    const wt1200 = qty1200 * 15.2;
    const wtFiller = qtyFiller * 11.4;
    const wtCorner = qtyCorners * 14.0;
    const wtHardware = (qtyPins * 0.15) + (qtyWallTies * 0.4);
    const totalWeight = wt2400 + wt1200 + wtFiller + wtCorner + wtHardware;
    
    // Build optimized packages / bundles
    const bundles: any[] = [];
    const bundlePrefix = `BDL-OPT-${optLocation.replace(/\s+/g, '').substring(4, 8).toUpperCase()}-${Date.now().toString().substring(8, 12)}`;
    
    // 1. Wall Panels Bundles (2400x600)
    const wall2400PanelsPerBundle = 25;
    const wall2400BundlesCount = Math.ceil(qty2400 / wall2400PanelsPerBundle);
    for (let i = 0; i < wall2400BundlesCount; i++) {
      const currentQty = Math.min(qty2400 - (i * wall2400PanelsPerBundle), wall2400PanelsPerBundle);
      bundles.push({
        id: `${bundlePrefix}-W24-${i+1}`,
        name: t(`Heavy Wall Panel Bundle #${i+1}`, `ከባድ የዎል ፓነል ጥቅል #${i+1}`),
        type: "Primary Wall Panels (2400x600 mm)",
        qtyItems: currentQty,
        weightKg: Math.round(currentQty * 30.5),
        composition: [
          { item: "2400x600 mm Aluminum Panel", qty: currentQty, weight: Math.round(currentQty * 30.5) }
        ],
        handling: t("Forklift / Tower Crane - 4-Point Sling Hook", "ፎርክሊፍት / ታወር ክሬን - ባለ 4-ነጥብ ማንጠልጠያ"),
        safetyRating: "A+ certified load strap"
      });
    }
    
    // 2. Wall Panels Bundles (1200x600)
    const wall1200PanelsPerBundle = 50;
    const wall1200BundlesCount = Math.ceil(qty1200 / wall1200PanelsPerBundle);
    for (let i = 0; i < wall1200BundlesCount; i++) {
      const currentQty = Math.min(qty1200 - (i * wall1200PanelsPerBundle), wall1200PanelsPerBundle);
      bundles.push({
        id: `${bundlePrefix}-W12-${i+1}`,
        name: t(`Standard Wall Panel Bundle #${i+1}`, `መካከለኛ የዎል ፓነል ጥቅል #${i+1}`),
        type: "Secondary Wall Panels (1200x600 mm)",
        qtyItems: currentQty,
        weightKg: Math.round(currentQty * 15.2),
        composition: [
          { item: "1200x600 mm Aluminum Panel", qty: currentQty, weight: Math.round(currentQty * 15.2) }
        ],
        handling: t("Crane Basket / Forklift Pallet", "የክሬን ቅርጫት / ፎርክሊፍት ፓሌት"),
        safetyRating: "Standard steel strapping strap"
      });
    }
    
    // 3. Filler and Corner Bundle
    if (qtyCorners > 0 || qtyFiller > 0) {
      const comp = [];
      if (qtyCorners > 0) comp.push({ item: "200x200x1200 mm Corner Joint", qty: qtyCorners, weight: Math.round(qtyCorners * 14.0) });
      if (qtyFiller > 0) comp.push({ item: "1200x450 mm Wall Filler Panel", qty: qtyFiller, weight: Math.round(qtyFiller * 11.4) });
      
      const combinedQty = qtyCorners + qtyFiller;
      const combinedWt = (qtyCorners * 14.0) + (qtyFiller * 11.4);
      
      bundles.push({
        id: `${bundlePrefix}-CRN-01`,
        name: t("Corner Joint & Filler Assembly Bundle", "የማዕዘንና የመሙያ ፓነሎች ጥቅል"),
        type: "Corners & Adjustments Kit",
        qtyItems: combinedQty,
        weightKg: Math.round(combinedWt),
        composition: comp,
        handling: t("Sling Pallet Box Setup", "የፓሌት ሳጥን መገጣጠሚያ"),
        safetyRating: "Crate Enclosed"
      });
    }
    
    // 4. Hardware Kit Bundle
    bundles.push({
      id: `${bundlePrefix}-ACC-01`,
      name: t("Formwork Joint Pin & Tie Hardware Kit", "የአሉሚኒየም ፎርምወርቅ ማያያዣዎች ጥቅል"),
      type: "Heavy Hardware Crates",
      qtyItems: qtyPins + qtyWallTies,
      weightKg: Math.round(wtHardware),
      composition: [
        { item: "High-Tensile Joint Pin Set", qty: qtyPins, weight: Math.round(qtyPins * 0.15) },
        { item: "Heavy-Duty Wall Sleeve Tie", qty: qtyWallTies, weight: Math.round(qtyWallTies * 0.4) }
      ],
      handling: t("Lockable Steel Utility Box", "ሊቆለፍ የሚችል የብረት መያዣ ሳጥን"),
      safetyRating: "Waterproof sealed crate"
    });
    
    const wallAreaCovered = (qty2400 * 1.44) + (qty1200 * 0.72) + (qtyFiller * 0.54) + (qtyCorners * 0.48);
    const nominalTargetArea = optLength * optHeight * sideMultiplier;
    const fitFactor = Math.min(100, Math.round((wallAreaCovered / nominalTargetArea) * 100));
    const jointLeakageRisk = optCorners > 12 ? "Medium" : "Very Low (Under 1.2%)";
    const structuralHealthFactor = Math.max(80, 98 - (optCorners * 0.2)); 
    
    setOptResults({
      targetLength: optLength,
      targetHeight: optHeight,
      isDoubleSided: optDoubleSided,
      nominalArea: Math.round(nominalTargetArea * 10) / 10,
      actualAreaCovered: Math.round(wallAreaCovered * 10) / 10,
      fitFactor,
      jointLeakageRisk,
      structuralHealthFactor,
      totalWeightKg: Math.round(totalWeight),
      location: optLocation,
      zone: optZone,
      quantities: {
        wall2400: qty2400,
        wall1200: qty1200,
        fillers: qtyFiller,
        corners: qtyCorners,
        pins: qtyPins,
        ties: qtyWallTies
      },
      bundles
    });
    
    setOptAllocationSuccess(false);
  };

  const handleAllocateBundles = async () => {
    if (!optResults) return;
    setOptIsAllocating(true);
    
    try {
      const timestamp = new Date().toISOString();
      let createdCount = 0;
      
      const allocations = [
        { type: PanelType.WALL, size: "2400x600 mm", qty: optResults.quantities.wall2400, prefix: "W24" },
        { type: PanelType.WALL, size: "1200x600 mm", qty: optResults.quantities.wall1200, prefix: "W12" },
        { type: PanelType.WALL, size: "1200x450 mm", qty: optResults.quantities.fillers, prefix: "FIL" },
        { type: PanelType.CORNER, size: "200x200 mm", qty: optResults.quantities.corners, prefix: "CRN" }
      ];
      
      for (const alloc of allocations) {
        if (alloc.qty <= 0) continue;
        
        const matchedBundle = optResults.bundles.find((b: any) => b.type.toLowerCase().includes(alloc.size.substring(0, 4)));
        const bundleNum = matchedBundle ? matchedBundle.id : (optResults.bundles[0]?.id || "BDL-OPT-01");
        
        const serialNo = `SN-OPT-${alloc.prefix}-${optResults.zone.replace(/\s+/g, '').toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
        const panelId = `AFP-${Date.now().toString().substring(7, 11)}-${alloc.prefix}-${Math.floor(10 + Math.random() * 89)}`;
        
        const newPanel: AluminumFormworkPanel = {
          id: panelId,
          serialNumber: serialNo,
          bundleNumber: bundleNum,
          size: alloc.size,
          type: alloc.type,
          quantity: alloc.qty,
          location: optResults.location,
          zone: optResults.zone,
          status: PanelStatus.ACTIVE,
          usageCount: 0,
          createdAt: timestamp
        };
        
        await DbService.addFormworkPanel(newPanel);
        createdCount += alloc.qty;
        
        const movementLog: PanelMovementLog = {
          id: `PMV-OPT-${Date.now()}-${alloc.prefix}`,
          panelId: panelId,
          fromLocation: "Central Storage Hub",
          fromZone: "Optimization Allocation",
          toLocation: optResults.location,
          toZone: optResults.zone,
          timestamp: timestamp,
          movedBy: currentUserName,
          notes: `Automated bundle assembly optimization allocation for ${optResults.targetLength}m wall.`
        };
        await DbService.addPanelMovementLog(movementLog);
      }
      
      const auditLog: AuditLog = {
        id: `AUD-OPT-${Date.now()}`,
        userName: currentUserName,
        userId: "USER-ERP-101",
        role: currentUserRole,
        action: "Formwork Bundle Allocation",
        details: `Optimized & allocated ${createdCount} panels into ${optResults.bundles.length} bundles for Digital Construction ERP Project ${optResults.location} (${optResults.zone}). Total weight: ${optResults.totalWeightKg}kg.`,
        timestamp: timestamp
      };
      
      await DbService.addAuditLog(auditLog);
      await loadData();
      setOptAllocationSuccess(true);
      
      if ("speechSynthesis" in window) {
        const u = new SpeechSynthesisUtterance("Formwork optimization bundles have been successfully allocated to site inventory database!");
        u.rate = 1.05;
        window.speechSynthesis.speak(u);
      }
    } catch (e) {
      console.error("Failed to allocate optimized formwork bundle", e);
    } finally {
      setOptIsAllocating(false);
    }
  };

  // Run initial optimization calculation once on render if not exists
  useEffect(() => {
    if (activeSubTab === "bundle_calc" && !optResults) {
      handleRunOptimization();
    }
  }, [activeSubTab]);

  // --- Simulate Camera Scanning ---
  const triggerScanSimulation = (code?: string) => {
    if (!scannerActive) {
      setScannerActive(true);
      setScannerMessage(t("Activating system hardware camera...", "የስርዓቱን ካሜራ በመክፈት ላይ..."));
      setScannedPanel(null);

      setTimeout(() => {
        setScannerMessage(t("Scanning code matrix overlays...", "የኮድ ማትሪክስ አቀማመጦችን በመፈተሽ ላይ..."));
        
        setTimeout(() => {
          // If a code is prdigital_construction_erped, look for it, otherwise pick a random panel
          let matched: AluminumFormworkPanel | undefined;
          if (code) {
            matched = panels.find(p => p.serialNumber === code || p.id === code);
          } else {
            // Pick random panel
            const randomIndex = Math.floor(Math.random() * panels.length);
            matched = panels[randomIndex];
          }

          if (matched) {
            setScannedPanel(matched);
            setScannerMessage(t("Scan verified successfully!", "ኮዱ በተሳካ ሁኔታ ተለይቷል!"));
            // Play success speech synthetic sound feedback
            if ("speechSynthesis" in window) {
              const u = new SpeechSynthesisUtterance("Code Scanned: " + matched.id);
              u.rate = 1.1;
              window.speechSynthesis.speak(u);
            }
          } else {
            setScannerMessage(t("Error: Code not recognized or invalid panel serial", "ስህተት፡ ኮዱ አልታወቀም ወይም የተሳሳተ ነው"));
          }
        }, 1500);
      }, 1000);
    } else {
      setScannerActive(false);
      setScannerMessage(null);
      setScannedPanel(null);
    }
  };

  // --- Filtered Panels List ---
  const filteredPanels = panels.filter(panel => {
    const matchesSearch = 
      panel.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      panel.serialNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      panel.bundleNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      panel.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      panel.zone.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = typeFilter === "All" || panel.type === typeFilter;
    const matchesStatus = statusFilter === "All" || panel.status === statusFilter;
    const matchesLocation = locationFilter === "All" || panel.location === locationFilter;

    return matchesSearch && matchesType && matchesStatus && matchesLocation;
  });

  return (
    <div className="space-y-6">
      
      {/* Digital Construction ERP Formwork System Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 relative overflow-hidden border border-slate-800">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Layers size={180} className="rotate-12" />
        </div>
        <div className="relative z-10 space-y-2">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-red-600 rounded-lg text-white">
              <Layers size={22} />
            </div>
            <span className="text-xs font-mono tracking-widest text-red-500 uppercase font-bold">Digital Construction ERP ENTERPRISE SYSTEM</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            {t("Aluminum Formwork Management System", "የአሉሚኒየም ፎርምወርቅ አስተዳደር ስርዓት")}
          </h1>
          <p className="text-slate-400 text-xs md:text-sm max-w-2xl">
            {t(
              "Centralized logistics hub to manage durable high-strength aluminum panel registers, asset assignments, cycle usage counters, repair logs, missing safety alerts, and real-time QR scanner tracking.",
              "የፓነል መዝገቦችን፣ ምደባዎችን፣ የእንቅስቃሴ መቆጣጠሪያዎችን፣ የጉዳትና የጥገና ሪፖርቶችን፣ የኪውአር ስካነር ፍተሻዎችን እና የደህንነት ማሳሰቢያዎችን ማዕከላዊ ማስተዳደሪያ።"
            )}
          </p>
        </div>
      </div>

      {/* Missing Panels Critical Visual Alert Banner */}
      {missingCount > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 border-l-4 border-amber-600 text-amber-900 p-4 rounded-xl flex items-start space-x-3 text-xs shadow-sm"
        >
          <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
          <div className="flex-1 space-y-1">
            <h3 className="font-bold">{t("CRITICAL: Missing Panel Alerts Detected", "አስቸኳይ፡ የጠፉ የአሉሚኒየም ፓነሎች ማንቂያ ደውል")}</h3>
            <p className="text-amber-700">
              {t(
                `There are currently ${missingCount} active panel(s) marked as missing from work zones. This will impact formwork cycle speeds and casting layouts. Please inspect block yards immediately.`,
                `በአሁኑ ጊዜ ${missingCount} ፓነል(ሎች) ከስራ ቦታ ጠፍተዋል ተብለው ተመዝግበዋል። ይህ ፎርምወርክን የመገጣጠም ሂደቱን ሊያዘገይ ይችላል። እባክዎን ህንጻውንና ግቢውን በአስቸኳይ ይፈትሹ።`
              )}
            </p>
            <div className="flex space-x-3 pt-1">
              <button 
                onClick={() => setActiveSubTab("missing")}
                className="font-bold text-amber-950 underline hover:text-amber-800"
              >
                {t("Open Missing Panel Hub", "የጠፉ ፓነሎች ማዕከል ክፈት")}
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Inner Sub Tabs Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveSubTab("dashboard")}
          className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
            activeSubTab === "dashboard"
              ? "bg-slate-900 text-white font-bold"
              : "bg-slate-50 text-slate-600 hover:bg-slate-100"
          }`}
        >
          {t("📊 Inventory Dashboard", "📊 ክምችት ዳሽቦርድ")}
        </button>
        <button
          onClick={() => setActiveSubTab("database")}
          className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
            activeSubTab === "database"
              ? "bg-slate-900 text-white font-bold"
              : "bg-slate-50 text-slate-600 hover:bg-slate-100"
          }`}
        >
          {t("📋 Panel Database", "📋 የፓነል መዝገብ")}
        </button>
        <button
          onClick={() => setActiveSubTab("shipments_customs")}
          className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors flex items-center space-x-1.5 ${
            activeSubTab === "shipments_customs"
              ? "bg-slate-900 text-white font-bold"
              : "bg-slate-50 text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Ship size={14} />
          <span>{t("🚢 Overseas & Customs", "🚢 የባህር ማዶ ጭነትና ጉምሩክ")}</span>
        </button>
        <button
          onClick={() => setActiveSubTab("transfers")}
          className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors flex items-center space-x-1.5 ${
            activeSubTab === "transfers"
              ? "bg-slate-900 text-white font-bold"
              : "bg-slate-50 text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Truck size={14} />
          <span>{t("🚚 Transfers & Receiving", "🚚 ማዘዋወርና መቀበያ")}</span>
        </button>
        <button
          onClick={() => setActiveSubTab("cleaning_inspection")}
          className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors flex items-center space-x-1.5 ${
            activeSubTab === "cleaning_inspection"
              ? "bg-slate-900 text-white font-bold"
              : "bg-slate-50 text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Sparkles size={14} />
          <span>{t("🧹 Cleaning & Inspection", "🧹 ማፅዳትና ምርመራ")}</span>
        </button>
        <button
          onClick={() => setActiveSubTab("audit")}
          className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors flex items-center space-x-1.5 ${
            activeSubTab === "audit"
              ? "bg-slate-900 text-white font-bold"
              : "bg-slate-50 text-slate-600 hover:bg-slate-100"
          }`}
        >
          <ClipboardCheck size={14} />
          <span>{t("🔍 Stock Audit", "🔍 ክምችት ቆጠራ")}</span>
        </button>
        <button
          onClick={() => setActiveSubTab("movement")}
          className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
            activeSubTab === "movement"
              ? "bg-slate-900 text-white font-bold"
              : "bg-slate-50 text-slate-600 hover:bg-slate-100"
          }`}
        >
          {t("🚚 Track Movement & Assignment", "🚚 የእንቅስቃሴ ቁጥጥር")}
        </button>
        <button
          onClick={() => setActiveSubTab("usage")}
          className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
            activeSubTab === "usage"
              ? "bg-slate-900 text-white font-bold"
              : "bg-slate-50 text-slate-600 hover:bg-slate-100"
          }`}
        >
          {t("🔄 Usage Cycles", "🔄 የአጠቃቀም ዑደት")}
        </button>
        <button
          onClick={() => setActiveSubTab("daily_installation")}
          className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
            activeSubTab === "daily_installation"
              ? "bg-red-600 text-white font-bold animate-pulse"
              : "bg-red-50 text-red-700 hover:bg-red-100"
          }`}
          style={{ animationDuration: "3s" }}
        >
          {t("👷 Daily Installation Log", "👷 ዕለታዊ የገጠማ ሪፖርት")}
        </button>
        <button
          onClick={() => setActiveSubTab("damage_repair")}
          className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
            activeSubTab === "damage_repair"
              ? "bg-slate-900 text-white font-bold"
              : "bg-slate-50 text-slate-600 hover:bg-slate-100"
          }`}
        >
          {t("🔧 Damage & Repair History", "🔧 ብልሽት እና ጥገና")}
        </button>
        <button
          onClick={() => setActiveSubTab("missing")}
          className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors relative ${
            activeSubTab === "missing"
              ? "bg-slate-900 text-white font-bold"
              : "bg-slate-50 text-slate-600 hover:bg-slate-100"
          }`}
        >
          <span>{t("⚠️ Missing Alerts", "⚠️ የጠፉ ማንቂያዎች")}</span>
          {missingCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full text-[10px] w-4 h-4 flex items-center justify-center font-bold">
              {missingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveSubTab("bundle_calc")}
          className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors flex items-center space-x-1.5 ${
            activeSubTab === "bundle_calc"
              ? "bg-slate-900 text-white font-bold"
              : "bg-slate-50 text-slate-600 hover:bg-slate-100"
          }`}
        >
          <span>{t("📦 Bundle Optimizer", "📦 የጥቅል ማመቻቻ")}</span>
        </button>
        <button
          onClick={() => setActiveSubTab("scanner")}
          className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors flex items-center space-x-1.5 ${
            activeSubTab === "scanner"
              ? "bg-red-600 text-white font-bold"
              : "bg-red-50 text-red-700 hover:bg-red-100"
          }`}
        >
          <Scan size={14} className="animate-pulse" />
          <span>{t("📷 QR Scanner", "📷 ኪውአር ስካነር")}</span>
        </button>
        <button
          onClick={() => setActiveSubTab("ai_planning")}
          className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors flex items-center space-x-1.5 ${
            activeSubTab === "ai_planning"
              ? "bg-indigo-600 text-white font-bold"
              : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
          }`}
        >
          <span>{t("🤖 AI CAD Planning", "🤖 አይአይ ካድ ፕላኒንግ")}</span>
        </button>
        <button
          onClick={() => setActiveSubTab("transfers")}
          className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors flex items-center space-x-1.5 ${
            activeSubTab === "transfers"
              ? "bg-slate-900 text-white font-bold"
              : "bg-slate-50 text-slate-600 hover:bg-slate-100"
          }`}
        >
          <span>{t("🚚 Material Transfers", "🚚 የዕቃዎች ማዘዋወሪያ")}</span>
        </button>
        <button
          onClick={() => setActiveSubTab("reports")}
          className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors flex items-center space-x-1.5 ${
            activeSubTab === "reports"
              ? "bg-slate-900 text-white font-bold"
              : "bg-slate-50 text-slate-600 hover:bg-slate-100"
          }`}
        >
          <span>{t("📈 Export Reports", "📈 ሪፖርቶች ማውጫ")}</span>
        </button>
      </div>

      {/* --- RENDER SUB-TAB CONTENTS --- */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3 bg-white rounded-2xl border border-slate-100">
          <RefreshCw className="animate-spin text-slate-400" size={32} />
          <p className="text-xs text-slate-500 font-medium">{t("Loading aluminum formwork databases...", "የአሉሚኒየም ፎርምወርቅ መረጃዎችን በመጫን ላይ...")}</p>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSubTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            
            {/* === DASHBOARD VIEW === */}
            {activeSubTab === "dashboard" && (
              <div className="space-y-6">
                
                {/* Bento Statistics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 flex items-center space-x-4 shadow-sm">
                    <div className="p-3 bg-slate-50 rounded-xl text-slate-700">
                      <Layers size={22} />
                    </div>
                    <div>
                      <p className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold">{t("Total Registered", "አጠቃላይ የተመዘገበ")}</p>
                      <p className="text-xl font-bold text-slate-900">{totalPanelsCount} <span className="text-[10px] text-slate-500 font-normal">{t("panels", "ፓነሎች")}</span></p>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-100 flex items-center space-x-4 shadow-sm">
                    <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                      <TrendingUp size={22} />
                    </div>
                    <div>
                      <p className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold">{t("In Construction", "በግንባታ ላይ ያለ")}</p>
                      <p className="text-xl font-bold text-slate-900">{inUseCount} <span className="text-[10px] text-slate-500 font-normal">{t("panels", "ፓነሎች")}</span></p>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-100 flex items-center space-x-4 shadow-sm">
                    <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
                      <CheckCircle size={22} />
                    </div>
                    <div>
                      <p className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold">{t("Active Standby", "ዝግጁ ሆነው ያሉ")}</p>
                      <p className="text-xl font-bold text-slate-900">{activeCount} <span className="text-[10px] text-slate-500 font-normal">{t("panels", "ፓነሎች")}</span></p>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-100 flex items-center space-x-4 shadow-sm">
                    <div className="p-3 bg-red-50 rounded-xl text-red-600">
                      <AlertTriangle size={22} />
                    </div>
                    <div>
                      <p className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold">{t("Damaged/Repair", "የተበላሹ/ጥገና")}</p>
                      <p className="text-xl font-bold text-slate-900">{(damagedCount + underRepairCount)} <span className="text-[10px] text-slate-500 font-normal">{t("panels", "ፓነሎች")}</span></p>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-100 flex items-center space-x-4 shadow-sm col-span-2 md:col-span-1">
                    <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
                      <Activity size={22} />
                    </div>
                    <div>
                      <p className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold">{t("Usage Cycles", "የዑደት አጠቃቀም")}</p>
                      <p className="text-xl font-bold text-slate-900">{totalUsageCycles} <span className="text-[10px] text-slate-500 font-normal">{t("pours", "ገጠማዎች")}</span></p>
                    </div>
                  </div>
                </div>

                {/* AI Logistics Smart Control Panel & Alerts */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left: AI Alerts Feed */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4 lg:col-span-1">
                    <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center space-x-1.5">
                        <span className="p-1 bg-red-50 text-red-600 rounded">
                          <Activity size={12} />
                        </span>
                        <span>{t("AI Logistics Alerts & Warnings", "አይአይ ሎጅስቲክስ ማንቂያዎች")}</span>
                      </h3>
                      <span className="bg-red-500 text-white rounded-full text-[10px] px-1.5 font-bold font-mono">
                        {aiAlerts.length}
                      </span>
                    </div>

                    <div className="space-y-2.5 max-h-[280px] overflow-y-auto">
                      {aiAlerts.map(alert => (
                        <div 
                          key={alert.id} 
                          className={`p-3 rounded-xl border flex items-start space-x-2.5 text-xs transition-colors hover:bg-slate-50 ${
                            alert.severity === "high" ? "bg-red-50/50 border-red-100 text-red-900" :
                            alert.severity === "medium" ? "bg-amber-50/50 border-amber-100 text-amber-900" :
                            "bg-blue-50/50 border-blue-100 text-blue-900"
                          }`}
                        >
                          <AlertTriangle className={`shrink-0 mt-0.5 ${
                            alert.severity === "high" ? "text-red-600" :
                            alert.severity === "medium" ? "text-amber-600" : "text-blue-600"
                          }`} size={14} />
                          <div className="flex-1 space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="font-bold">{alert.type}</span>
                              <span className="text-[9px] text-slate-400 font-mono">{alert.date}</span>
                            </div>
                            <p className="text-[11px] leading-normal opacity-85">{alert.msg}</p>
                            <div className="pt-1 flex justify-end">
                              <button 
                                onClick={() => {
                                  setAiAlerts(aiAlerts.filter(a => a.id !== alert.id));
                                }}
                                className="text-[9px] font-bold uppercase tracking-wider bg-white/70 hover:bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-700"
                              >
                                {t("Resolve", "ፍታ")}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right: Unlimited Warehouses Inventory Balance */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4 lg:col-span-2">
                    <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center space-x-1.5">
                        <span className="p-1 bg-indigo-50 text-indigo-600 rounded">
                          <Layers size={12} />
                        </span>
                        <span>{t("Master Warehouse Stock & Capacity Audit", "የመጋዘኖች አጠቃላይ ክምችት እና አቅም ቁጥጥር")}</span>
                      </h3>
                      <button 
                        onClick={() => setShowAddWarehouseModal(true)}
                        className="text-[10px] font-bold text-indigo-600 hover:underline flex items-center space-x-1"
                      >
                        <Plus size={12} />
                        <span>{t("Add Warehouse Yard", "አዲስ መጋዘን ጨምር")}</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {warehouses.map((wh, idx) => {
                        const currentStock = panels.filter(p => p.location === wh.name).length || wh.currentStock;
                        const pct = Math.round((currentStock / wh.capacity) * 100);
                        const isUnderstocked = currentStock < wh.minStock;
                        return (
                          <div key={idx} className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-3 relative hover:shadow-sm transition-shadow">
                            <div>
                              <strong className="text-[13px] text-slate-800 block truncate">{wh.name}</strong>
                              <span className="text-[10px] text-slate-400 font-mono block">{wh.code} | Manager: {wh.manager}</span>
                            </div>

                            <div className="space-y-1">
                              <div className="flex justify-between text-[10px]">
                                <span className="text-slate-500 font-medium">Capacity Used</span>
                                <span className="font-bold font-mono text-slate-800">{currentStock} / {wh.capacity} ({pct}%)</span>
                              </div>
                              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${
                                    isUnderstocked ? "bg-red-600" : "bg-emerald-500"
                                  }`} 
                                  style={{ width: `${Math.min(pct, 100)}%` }} 
                                />
                              </div>
                            </div>

                            <div className="flex justify-between items-center text-[9px] font-semibold pt-1 border-t border-slate-200/50">
                              <span className="text-slate-400 font-mono">Min: {wh.minStock} | Max: {wh.maxStock}</span>
                              <span className={`px-1.5 py-0.5 rounded font-bold ${
                                isUnderstocked ? "bg-red-50 text-red-600 animate-pulse" : "bg-emerald-50 text-emerald-600"
                              }`}>
                                {isUnderstocked ? t("Reorder Required", "ዕቃ ያስፈልገዋል") : t("Safe Stock", "በቂ ክምችት")}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Graphical Analysis Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Status Pie Chart */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                    <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                      <Tag className="text-red-600" size={16} />
                      <span>{t("Asset Status Allocation", "የፓነሎች የስራ ሁኔታ ስርጭት")}</span>
                    </h2>
                    <div className="h-56 flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={panelStatusData.filter(d => d.value > 0)}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={4}
                            dataKey="value"
                          >
                            {panelStatusData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || "#cbd5e1"} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => [`${value} panels`, "Quantity"]} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    {/* Status Legends */}
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      {panelStatusData.map((d, i) => (
                        <div key={i} className="flex items-center space-x-1.5 bg-slate-50 p-1.5 rounded border border-slate-100">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[d.name] }} />
                          <span className="text-slate-700 font-medium">{d.name}:</span>
                          <span className="text-slate-900 font-bold ml-auto">{d.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Type Bar Chart */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4 lg:col-span-2">
                    <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                      <Layers className="text-red-600" size={16} />
                      <span>{t("Panel Type Inventory Density", "በፓነል አይነት የተከፋፈለ ክምችት")}</span>
                    </h2>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={panelTypeData}>
                          <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                          <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                          <Tooltip formatter={(value) => [`${value} Panels`, "Density"]} />
                          <Bar dataKey="value" fill="#ef4444" radius={[6, 6, 0, 0]} maxBarSize={35}>
                            {panelTypeData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-wrap justify-center gap-4 text-[10px] text-slate-500 pt-2 border-t border-slate-50">
                      {panelTypeData.map((d, i) => (
                        <div key={i} className="flex items-center space-x-1">
                          <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span>{d.name} ({d.value})</span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

                {/* Location Breakdowns and System Activities */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Location Density list */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                      <MapPin className="text-red-600" size={16} />
                      <span>{t("Site Allocations Density", "የፓነሎች ስርጭት በፕሮጀክቶች")}</span>
                    </h3>
                    <div className="space-y-3">
                      {locationData.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-6">{t("No active locations registered.", "ምንም አይነት ንቁ የስራ ቦታ አልተመዘገበም።")}</p>
                      ) : (
                        locationData.map((loc, idx) => {
                          const percentage = Math.round((loc.count / totalPanelsCount) * 100);
                          return (
                            <div key={idx} className="space-y-1 text-xs">
                              <div className="flex justify-between font-medium">
                                <span className="text-slate-700">{loc.name}</span>
                                <span className="text-slate-900 font-bold">{loc.count} {t("panels", "ፓነሎች")} ({percentage}%)</span>
                              </div>
                              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-slate-900 h-full rounded-full" style={{ width: `${percentage}%` }} />
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Quick Activity timeline logs */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4 lg:col-span-2">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                        <Activity className="text-red-600" size={16} />
                        <span>{t("Recent Movement logs & relocations", "የቅርብ ጊዜ የፓነሎች እንቅስቃሴዎችና ዝውውር")}</span>
                      </h3>
                      <button 
                        onClick={() => setActiveSubTab("movement")}
                        className="text-[10px] text-red-600 hover:underline font-bold"
                      >
                        {t("View All Logs", "ሁሉንም መዝገቦች እይ")}
                      </button>
                    </div>
                    <div className="divide-y divide-slate-100 text-xs max-h-[220px] overflow-y-auto pr-1">
                      {movementLogs.slice(0, 5).map((log, idx) => (
                        <div key={idx} className="py-2.5 flex items-start space-x-3">
                          <div className="p-1.5 bg-slate-50 text-slate-600 rounded mt-0.5">
                            <Clock size={12} />
                          </div>
                          <div className="flex-1 space-y-0.5">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-slate-900">{log.panelId}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{new Date(log.timestamp).toLocaleDateString()}</span>
                            </div>
                            <p className="text-slate-600 text-[11px] flex items-center">
                              <span className="bg-slate-100 px-1 rounded text-[10px]">{log.fromLocation} ({log.fromZone})</span>
                              <ArrowRight size={10} className="mx-1 text-slate-400" />
                              <span className="bg-slate-900 text-white px-1 rounded text-[10px]">{log.toLocation} ({log.toZone})</span>
                            </p>
                            {log.notes && <p className="text-slate-400 text-[10px] italic">"{log.notes}"</p>}
                            <p className="text-[10px] text-slate-400">{t("Moved by:", "ተንቀሳቃሹ፡")} <span className="font-medium text-slate-500">{log.movedBy}</span></p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

              </div>
            )}

            {/* === PANEL DATABASE VIEW === */}
            {activeSubTab === "database" && (
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
                
                {/* Search, Filters, and Add Button */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  
                  {/* Search input */}
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                    <input
                      type="text"
                      placeholder={t("Search by Serial, Bundle, ID, Location...", "በመለያ፣ በሲሪያል፣ በቦታ ወይም በብሎክ ይፈልጉ...")}
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-2 text-xs w-full bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:ring-1 focus:ring-slate-900 outline-none transition-all"
                    />
                  </div>

                  {/* Multi Filters and Add actions */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    
                    {/* Type select */}
                    <div className="flex items-center space-x-1">
                      <Filter size={12} className="text-slate-400" />
                      <select
                        value={typeFilter}
                        onChange={e => setTypeFilter(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded p-1.5 text-slate-700 outline-none text-[11px]"
                      >
                        <option value="All">{t("All Types", "ሁሉንም አይነቶች")}</option>
                        {Object.values(PanelType).map((t, i) => (
                          <option key={i} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>

                    {/* Status select */}
                    <div className="flex items-center space-x-1">
                      <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded p-1.5 text-slate-700 outline-none text-[11px]"
                      >
                        <option value="All">{t("All Statuses", "ሁሉንም ሁኔታዎች")}</option>
                        {Object.values(PanelStatus).map((s, i) => (
                          <option key={i} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={() => setShowAddModal(true)}
                      className="ml-auto lg:ml-2 bg-red-600 text-white px-3 py-1.5 rounded-lg flex items-center space-x-1 hover:bg-red-700 font-bold transition-colors"
                    >
                      <Plus size={14} />
                      <span>{t("Register Panel", "አዲስ ፓነል መዝግብ")}</span>
                    </button>
                  </div>

                </div>

                {/* Panels Grid/Table */}
                <div className="overflow-x-auto rounded-xl border border-slate-100">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-slate-600 font-semibold">
                        <th className="p-3 font-mono">{t("Panel ID", "ፓነል መለያ")}</th>
                        <th className="p-3">{t("Serial Number", "ሲሪያል ቁጥር")}</th>
                        <th className="p-3">{t("Bundle Number", "የጥቅል ቁጥር")}</th>
                        <th className="p-3">{t("Size", "መጠን")}</th>
                        <th className="p-3">{t("Type", "የፓነል አይነት")}</th>
                        <th className="p-3">{t("Qty", "ብዛት")}</th>
                        <th className="p-3">{t("Location", "የስራ ቦታ")}</th>
                        <th className="p-3">{t("Status", "ሁኔታ")}</th>
                        <th className="p-3 text-center">{t("Usage Counts", "አጠቃቀም")}</th>
                        <th className="p-3 text-right">{t("Actions", "ድርጊቶች")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {filteredPanels.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="p-8 text-center text-slate-400">
                            {t("No aluminum panels found matching the filters.", "ከተመረጡት ማጣሪያዎች ጋር የሚስማማ የፓነል መዝገብ አልተገኘም።")}
                          </td>
                        </tr>
                      ) : (
                        filteredPanels.map((panel, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3 font-mono font-bold text-slate-900">
                              <div className="flex items-center space-x-2">
                                <img 
                                  src={panel.photo || "https://images.unsplash.com/photo-1590069261209-f8e9b8642343?w=80&h=80&fit=crop"} 
                                  alt="Panel preview" 
                                  className="w-7 h-7 rounded border border-slate-200 object-cover shrink-0"
                                  referrerPolicy="no-referrer"
                                />
                                <span>{panel.id}</span>
                              </div>
                            </td>
                            <td className="p-3 font-mono text-slate-600">{panel.serialNumber}</td>
                            <td className="p-3 font-mono">
                              <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] text-slate-600">{panel.bundleNumber}</span>
                            </td>
                            <td className="p-3">
                              <div className="space-y-0.5">
                                <span className="text-slate-800 font-medium">{panel.size}</span>
                                <span className="block text-[10px] text-slate-400 font-medium">{panel.weight || 14.5} kg</span>
                              </div>
                            </td>
                            <td className="p-3">
                              <span className="font-medium text-slate-800">{panel.type}</span>
                            </td>
                            <td className="p-3 font-bold">{panel.quantity}</td>
                            <td className="p-3">
                              <div className="space-y-0.5">
                                <span className="font-semibold text-slate-900">{panel.location}</span>
                                <span className="block text-[10px] text-slate-500 font-medium">{panel.building || "Block A"} - Floor {panel.floor || 4} ({panel.zone})</span>
                              </div>
                            </td>
                            <td className="p-3">
                              <span 
                                className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                                style={{ 
                                  backgroundColor: `${STATUS_COLORS[panel.status]}15`, 
                                  color: STATUS_COLORS[panel.status] 
                                }}
                              >
                                {panel.status}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <span className="font-mono bg-slate-50 px-2 py-0.5 border border-slate-150 rounded font-bold">
                                {panel.usageCount}
                              </span>
                            </td>
                            <td className="p-3 text-right space-x-1.5">
                              {/* QR label generator button */}
                              <button
                                onClick={() => setShowQRLabelModal(panel)}
                                className="p-1 bg-slate-50 hover:bg-slate-100 rounded border border-slate-200 text-slate-600 inline-flex items-center justify-center"
                                title={t("Generate QR Tag", "የኪውአር መለያ ፍጠር")}
                              >
                                <QrCode size={13} />
                              </button>
                              
                              {/* Relocate panel button */}
                              <button
                                onClick={() => {
                                  setSelectedPanelForMove(panel);
                                  setMoveDestination(panel.location);
                                  setMoveZone(panel.zone);
                                  setShowMoveModal(true);
                                }}
                                className="p-1 bg-slate-50 hover:bg-slate-100 rounded border border-slate-200 text-blue-600 inline-flex items-center justify-center"
                                title={t("Relocate Panel", "ፓነሉን አዛውር")}
                              >
                                <MapPin size={13} />
                              </button>

                              {/* Damage log button */}
                              <button
                                onClick={() => {
                                  setSelectedPanelForDamage(panel);
                                  setShowDamageModal(true);
                                }}
                                className="p-1 bg-slate-50 hover:bg-slate-100 rounded border border-slate-200 text-red-600 inline-flex items-center justify-center"
                                title={t("Report Damage", "ብልሽት መዝግብ")}
                              >
                                <AlertTriangle size={13} />
                              </button>

                              {/* Delete button */}
                              <button
                                onClick={() => handleDeletePanel(panel.id)}
                                className="p-1 bg-red-50 hover:bg-red-100 rounded border border-red-200 text-red-600 inline-flex items-center justify-center"
                                title={t("Delete Panel", "አጥፋ")}
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

              </div>
            )}

            {/* === MOVEMENT & ASSIGNMENT TRACKING === */}
            {activeSubTab === "movement" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Movement Trigger panel */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4 h-fit">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                    <MapPin className="text-red-600" size={16} />
                    <span>{t("Relocate Panels & Assign Layouts", "የፓነል ምደባ እና ዝውውር መቆጣጠሪያ")}</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    {t(
                      "To transfer a formwork bundle or individual panels between project towers, floors, and zoning blocks, select the panel asset from the inventory below to launch the transit log dispatch.",
                      "የአሉሚኒየም ፎርምወርቅ ፓነሎችን ወይም ጥቅሎችን ከአንድ የስራ ቦታ ወደ ሌላ ህንፃ ወይም ዞን ለማዘዋወር ከታች ካለው ሰንጠረዥ ይምረጡና የዝውውር ቅጹን ይሙሉ::"
                    )}
                  </p>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                    <p className="text-xs font-bold text-slate-700">{t("How to initiate movement:", "እንቅስቃሴውን እንዴት ማስጀመር ይቻላል?")}</p>
                    <ul className="text-[11px] text-slate-600 list-decimal list-inside space-y-1.5">
                      <li>{t("Navigate to the Panel Database tab.", "ወደ ፓነል መዝገብ ክፍል ይሂዱ።")}</li>
                      <li>{t("Find the panel you want to relocate.", "የሚፈልጉትን ፓነል መለያ ያግኙ።")}</li>
                      <li>{t("Click the Map Pin icon in the actions column.", "የአካባቢ መለያ (Map Pin) ምልክቱን ይጫኑ።")}</li>
                      <li>{t("Specify the destination project and layout floor zone.", "የሚዛወርበትን ቦታ፣ ፎቅ እና ዞን ይምረጡ።")}</li>
                    </ul>
                  </div>
                </div>

                {/* Relocation History Logs Timeline */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4 lg:col-span-2">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                      <Activity className="text-red-600" size={16} />
                      <span>{t("Full Dispatch Relocation History Logs", "የፓነሎች ዝርዝር የዝውውር ታሪክ መዝገብ")}</span>
                    </h3>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold font-mono">
                      {movementLogs.length} {t("Logs", "መዝገቦች")}
                    </span>
                  </div>

                  <div className="divide-y divide-slate-150 text-xs">
                    {movementLogs.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-10">{t("No transit records captured yet.", "ምንም አይነት የእንቅስቃሴ ታሪክ አልተመዘገበም።")}</p>
                    ) : (
                      movementLogs.map((log, idx) => (
                        <div key={idx} className="py-3 flex items-start space-x-3 hover:bg-slate-50 p-2 rounded-lg transition-colors">
                          <div className="p-2 bg-slate-100 text-slate-700 rounded-lg shrink-0">
                            <Clock size={14} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-slate-900 text-sm">{log.panelId}</span>
                              <span className="text-[10px] text-slate-400 font-mono flex items-center">
                                <Calendar size={10} className="mr-1" />
                                {new Date(log.timestamp).toLocaleString()}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center text-slate-600 mt-1 gap-1">
                              <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-medium text-slate-700">{log.fromLocation} ({log.fromZone})</span>
                              <ArrowRight size={12} className="text-slate-400" />
                              <span className="bg-slate-900 text-white px-1.5 py-0.5 rounded text-[10px] font-medium">{log.toLocation} ({log.toZone})</span>
                            </div>
                            {log.notes && (
                              <p className="mt-1.5 bg-slate-50 text-slate-500 text-[11px] p-2 rounded italic border-l-2 border-slate-300">
                                "{log.notes}"
                              </p>
                            )}
                            <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2">
                              <span>{t("Dispatched By:", "ተቆጣጣሪ፡")} <strong className="text-slate-600">{log.movedBy}</strong></span>
                              <span>ID: <span className="font-mono">{log.id}</span></span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            )}

            {/* === USAGE CYCLES & POURS === */}
            {activeSubTab === "usage" && (
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
                
                {/* Header Information */}
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                    <Activity className="text-red-600" size={16} />
                    <span>{t("Formwork Deployment Cycles Tracking", "የአሉሚኒየም ፓነል አጠቃቀምና ድግግሞሽ መቆጣጠሪያ")}</span>
                  </h3>
                  <p className="text-xs text-slate-500 max-w-3xl">
                    {t(
                      "Aluminum formwork is rated for 150-250 pours. Track concrete casting counts per panel. Panels with high usage are automatically highlighted for safety re-alignment and quality wear analysis.",
                      "የአሉሚኒየም ፎርምወርቆች ከ150 እስከ 250 ጊዜ ጥቅም ላይ መዋል ይችላሉ። በእያንዳንዱ ፓነል የተከናወኑ ኮንክሪት መቅዳት (pours) ድግግሞሽን ይቆጣጠሩ።"
                    )}
                  </p>
                </div>

                {/* Panel usage warning lists */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* High Usage Warning */}
                  <div className="bg-red-50 p-4 rounded-xl border border-red-100 space-y-3">
                    <div className="flex items-center space-x-2 text-red-800">
                      <AlertTriangle size={18} />
                      <span className="font-bold text-xs">{t("High Cycle Fatigue Alert (&gt; 50 Uses)", "የደህንነት ምርመራ የሚፈልጉ ፓነሎች (&gt; 50 ጊዜ የተጠቀሙባቸው)")}</span>
                    </div>
                    <div className="space-y-2 text-[11px] text-slate-700">
                      {panels.filter(p => p.usageCount >= 50).length === 0 ? (
                        <p className="text-red-700 italic">{t("All active panel assets are safely within standard structural wear thresholds.", "ሁሉም የፓነል ንብረቶች በጥሩ ሁኔታ ላይ ናቸው።")}</p>
                      ) : (
                        panels.filter(p => p.usageCount >= 50).map((p, idx) => (
                          <div key={idx} className="flex justify-between items-center bg-white p-2 rounded border border-red-100">
                            <div>
                              <span className="font-bold text-slate-900 font-mono">{p.id}</span>
                              <span className="text-slate-400 block text-[10px]">{p.type} • {p.serialNumber}</span>
                            </div>
                            <span className="bg-red-600 text-white font-bold px-2 py-0.5 rounded text-[10px] font-mono">
                              {p.usageCount} {t("Pours", "ጊዜ")}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Standard usage tracker overview */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                    <div className="flex items-center space-x-2 text-slate-800">
                      <Info size={18} />
                      <span className="font-bold text-xs">{t("System Pour Cycle Operations", "የዑደት አጠቃቀም መመዝገቢያ")}</span>
                    </div>
                    <p className="text-xs text-slate-600">
                      {t(
                        "When concrete casting is completed in a project zone, select and click 'Record Pour Cycle' on the panels actively deployed to instantly update their usage metrics.",
                        "በአንድ ዞን ላይ የኮንክሪት ስራ ሲጠናቀቅ ለፓነሎች የአጠቃቀም ዑደቱን ለመጨመር ከታች ባለው ዝርዝር ላይ 'ዑደት መዝግብ' የሚለውን ይጫኑ::"
                      )}
                    </p>
                  </div>

                </div>

                {/* Usage increment lists */}
                <div className="overflow-x-auto rounded-xl border border-slate-100">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-slate-600 font-semibold">
                        <th className="p-3 font-mono">{t("Panel ID", "ፓነል መለያ")}</th>
                        <th className="p-3">{t("Type", "አይነት")}</th>
                        <th className="p-3">{t("Serial Number", "ሲሪያል ቁጥር")}</th>
                        <th className="p-3">{t("Location / Zone", "የስራ ቦታ / ዞን")}</th>
                        <th className="p-3 text-center">{t("Usage Pour Count", "ጠቅላላ ጥቅም ላይ የዋለበት")}</th>
                        <th className="p-3 text-right">{t("Quick Actions", "ፈጣን ድርጊቶች")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {panels.map((panel, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-mono font-bold text-slate-900">{panel.id}</td>
                          <td className="p-3 font-medium">{panel.type}</td>
                          <td className="p-3 font-mono text-slate-500">{panel.serialNumber}</td>
                          <td className="p-3">
                            <span className="font-semibold text-slate-800">{panel.location}</span>
                            <span className="block text-[10px] text-slate-400">{panel.zone}</span>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center space-x-2">
                              <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${panel.usageCount >= 50 ? 'bg-red-500' : 'bg-blue-500'}`}
                                  style={{ width: `${Math.min((panel.usageCount / 100) * 100, 100)}%` }}
                                />
                              </div>
                              <span className="font-mono font-bold text-slate-900">{panel.usageCount} / 100</span>
                            </div>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => handleIncrementUsage(panel)}
                              className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-2.5 py-1 rounded font-bold text-[10px] transition-colors inline-flex items-center space-x-1"
                            >
                              <RefreshCw size={10} className="animate-spin" style={{ animationDuration: "5s" }} />
                              <span>{t("Record Pour Cycle", "ዑደት መዝግብ")}</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

              </div>
            )}

            {/* === DAMAGE & REPAIR VIEW === */}
            {activeSubTab === "damage_repair" && (
              <div className="space-y-6">
                
                {/* Upper damage logs list */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* Reported Damage Snags list */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                        <AlertTriangle className="text-red-600" size={16} />
                        <span>{t("Active Panel Damage Snags List", "የፓነል ብልሽቶችና የጉዳት መዝገቦች")}</span>
                      </h3>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setIsDirectDamageMode(true);
                            setDirectDamagePanelId(panels.length > 0 ? panels[0].id : "");
                            setShowDamageModal(true);
                          }}
                          className="bg-red-50 hover:bg-red-100 text-red-700 px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center space-x-1 transition-colors"
                        >
                          <Plus size={11} />
                          <span>{t("Add Panel Damage", "የተበላሸ ፓነል መዝግብ")}</span>
                        </button>
                        <span className="text-[10px] bg-red-100 text-red-800 px-2 py-0.5 rounded font-bold">
                          {damageReports.filter(d => d.status !== "Repaired").length} {t("Active", "አሁኑኑ የሚፈለጉ")}
                        </span>
                      </div>
                    </div>

                    <div className="divide-y divide-slate-100 text-xs">
                      {damageReports.filter(d => d.status !== "Repaired").length === 0 ? (
                        <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-2">
                          <CheckCircle size={28} className="text-emerald-500" />
                          <p className="text-xs">{t("All aluminum panels are fully intact. No active damage logs.", "ምንም አይነት ንቁ የፓነል ብልሽት አልተመዘገበም።")}</p>
                        </div>
                      ) : (
                        damageReports.filter(d => d.status !== "Repaired").map((report, idx) => (
                          <div key={idx} className="py-3 flex items-start space-x-3">
                            <div className={`p-1.5 rounded text-white shrink-0 ${
                              report.severity === "High" ? "bg-red-600" : report.severity === "Medium" ? "bg-amber-500" : "bg-blue-500"
                            }`}>
                              <AlertTriangle size={14} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-slate-900">{report.panelId}</span>
                                <span className="text-[10px] text-slate-400 font-mono">{report.reportedDate}</span>
                              </div>
                              <p className="text-slate-700 mt-1">{report.description}</p>
                              <div className="flex items-center space-x-2 mt-2">
                                <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold">
                                  {t("Severity:", "አሳሳቢነት፡")} {report.severity}
                                </span>
                                <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded font-bold">
                                  {report.status}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400 mt-1">{t("Reported by:", "ሪፖርት አድራጊ፡")} <strong className="text-slate-500">{report.reportedBy}</strong></p>
                              
                              {/* Quick Repair trigger */}
                              <button
                                onClick={() => {
                                  setSelectedDamageReportForRepair(report);
                                  setShowRepairModal(true);
                                }}
                                className="mt-2.5 bg-slate-900 hover:bg-slate-800 text-white px-2.5 py-1 rounded text-[10px] font-bold flex items-center space-x-1"
                              >
                                <Wrench size={11} />
                                <span>{t("Log Successful Repair", "የጥገና መዝገብ አስገባ")}</span>
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Repair Records & cost overview */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                      <Wrench className="text-red-600" size={16} />
                      <span>{t("Maintenance & Repair History Logs", "የተከናወኑ የጥገና ታሪኮች ዝርዝር")}</span>
                    </h3>

                    <div className="divide-y divide-slate-100 text-xs">
                      {repairRecords.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-12">{t("No repair records logged yet.", "ምንም አይነት የጥገና ታሪክ አልተመዘገበም።")}</p>
                      ) : (
                        repairRecords.map((record, idx) => (
                          <div key={idx} className="py-3 flex items-start space-x-3">
                            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg shrink-0">
                              <CheckCircle size={14} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-slate-900">{record.panelId}</span>
                                <span className="text-[10px] text-slate-400 font-mono">{record.repairDate}</span>
                              </div>
                              <p className="text-slate-700 mt-1 font-medium">{record.repairDetails}</p>
                              <div className="flex justify-between items-center mt-2">
                                <span className="text-[10px] text-slate-400">{t("Technician:", "ባለሙያ፡")} <strong className="text-slate-600">{record.technician}</strong></span>
                                <span className="text-xs font-mono font-bold text-slate-900 bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-100">
                                  {record.cost} ETB
                                </span>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                </div>

              </div>
            )}

            {/* === MISSING PANELS ALERTS === */}
            {activeSubTab === "missing" && (
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
                
                {/* Hub Header */}
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                    <AlertCircle className="text-red-600" size={16} />
                    <span>{t("Durable Asset Loss & Missing Panel Hub", "የጠፉ የአሉሚኒየም ፓነሎች አስተዳደር ማዕከል")}</span>
                  </h3>
                  <p className="text-xs text-slate-500 max-w-3xl">
                    {t(
                      "Flagging missing panels triggers high-visibility alerts on the ERP dashboards. Panels can be searched, identified by serial barcodes, and safely checked back into standby arrays when located by staff.",
                      "የጠፉ የአሉሚኒየም ንብረቶችን ዝርዝር ይከታተሉ። በካሜራ ስካነር ሲገኙ መልሰው ወደ ንቁ ስራ ማስገባት ይችላሉ።"
                    )}
                  </p>
                </div>

                {/* Grid with lists of Missing Panels */}
                <div className="grid grid-cols-1 gap-4">
                  {panels.filter(p => p.status === PanelStatus.MISSING).length === 0 ? (
                    <div className="p-12 text-center border border-slate-150 rounded-2xl bg-slate-50 text-slate-500 space-y-2 flex flex-col items-center justify-center">
                      <CheckCircle size={32} className="text-emerald-500" />
                      <p className="font-bold text-sm text-slate-900">{t("PERFECT: All panels accounted for!", "ድንቅ፡ ሁሉም ፓነሎች በትክክለኛ ቦታቸው ይገኛሉ!")}</p>
                      <p className="text-xs text-slate-400 max-w-md">
                        {t("There are currently zero missing aluminum panel assets across Digital Construction ERP active residential blocks.", "በሁሉም የዲጂታል ኮንስትራክሽን ERP ፕሮጀክቶች ውስጥ የጠፋ የአሉሚኒየም ንብረት የለም።")}
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-100">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100 text-slate-600 font-semibold">
                            <th className="p-3 font-mono">{t("Panel ID", "ፓነል መለያ")}</th>
                            <th className="p-3">{t("Type", "አይነት")}</th>
                            <th className="p-3">{t("Serial Number", "ሲሪያል ቁጥር")}</th>
                            <th className="p-3">{t("Bundle Number", "ጥቅል ቁጥር")}</th>
                            <th className="p-3">{t("Last Known Location", "የመጨረሻ ቦታ")}</th>
                            <th className="p-3 text-center">{t("Usage Count", "የአጠቃቀም ዑደት")}</th>
                            <th className="p-3 text-right">{t("Quick Recovery", "ፈጣን ማግኛ")}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {panels.filter(p => p.status === PanelStatus.MISSING).map((panel, idx) => (
                            <tr key={idx} className="hover:bg-red-50/50 bg-red-50/20 transition-colors">
                              <td className="p-3 font-mono font-bold text-red-700">{panel.id}</td>
                              <td className="p-3 font-medium">{panel.type}</td>
                              <td className="p-3 font-mono text-slate-600">{panel.serialNumber}</td>
                              <td className="p-3 font-mono text-slate-600">{panel.bundleNumber}</td>
                              <td className="p-3">
                                <span className="font-semibold text-slate-800">{panel.location}</span>
                                <span className="block text-[10px] text-slate-400">{panel.zone}</span>
                              </td>
                              <td className="p-3 text-center font-mono font-bold">{panel.usageCount}</td>
                              <td className="p-3 text-right">
                                <button
                                  onClick={() => handleMarkAsFound(panel)}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded text-[10px] font-bold transition-colors inline-flex items-center space-x-1"
                                >
                                  <CheckCircle size={10} />
                                  <span>{t("Mark as Found & Audited", "ተገኝቷል / መልሰህ አስገባ")}</span>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Mock action list to test/simulate reporting a panel missing */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-150">
                  <h4 className="text-xs font-bold text-slate-800 mb-2">{t("Test System Missing Panel Alert Flow", "የጠፉ ፓነሎች ማስጠንቀቂያን ይሞክሩ")}</h4>
                  <p className="text-xs text-slate-500 mb-3">
                    {t(
                      "Simulate a workforce audit finding a panel is lost. Select any active panel to immediately flag it as 'Missing' and watch the system generate security signals.",
                      "ሰራተኞች አንድን ፓነል ማግኘት ካልቻሉ ሪፖርት ማድረጉን ለመሞከር ከታች ካሉት ፓነሎች አንዱን መርጠው 'ጠፍቷል' የሚለውን ይጫኑ::"
                    )}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {panels.filter(p => p.status !== PanelStatus.MISSING).slice(0, 4).map((p, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleReportMissing(p)}
                        className="bg-white hover:bg-red-50 border border-slate-200 hover:border-red-200 px-3 py-1.5 rounded-lg text-[10px] font-bold text-slate-700 transition-colors flex items-center space-x-1"
                      >
                        <AlertTriangle size={11} className="text-red-500" />
                        <span>{t(`Flag ${p.id} Missing`, `${p.id} ጠፍቷል በል`)}</span>
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {/* === BUNDLE OPTIMIZATION VIEW === */}
            {activeSubTab === "bundle_calc" && (
              <div className="space-y-6">
                
                {/* Header Banner */}
                <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6 rounded-2xl shadow-md border border-slate-700 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="bg-blue-500 text-white text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full animate-pulse">
                        {t("AI Smart Solver", "በአርቴፊሻል ኢንተለጀንስ የሚሰራ")}
                      </span>
                      <span className="bg-emerald-600 text-white text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full">
                        {t("Enterprise Logistics", "የድርጅት ሎጅስቲክስ")}
                      </span>
                    </div>
                    <h2 className="text-xl font-bold tracking-tight">
                      {t("Automated Bundle & Formwork Optimizer", "አውቶማቲክ የፎርምወርቅ ጥቅል ማመቻቻ እና ማስያ")}
                    </h2>
                    <p className="text-slate-300 text-xs max-w-2xl">
                      {t(
                        "Input standard wall dimensions and zone configurations. The algorithm solves the optimal combination of aluminum panel sizes, packing them into physical crane-ready crates within strict safe weight limits.",
                        "የግድግዳውን ርዝመት እና ቁመት ያስገቡ። ሲስተሙ በትንሽ ብክነት የሚገጣጠሙ የፓነል አይነቶችን በማስላት፣ በክብደት ተለይተው በክሬን ለመጫን እንዲመቹ አድርጎ ጥቅሎችን ያዘጋጃል።"
                      )}
                    </p>
                  </div>
                  <button
                    onClick={handleRunOptimization}
                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-5 py-3 rounded-xl shadow-sm transition-all shrink-0 hover:scale-[1.02] flex items-center space-x-1.5"
                  >
                    <span>{t("Calculate Optimization", "ማመቻቻውን አስላ")}</span>
                  </button>
                </div>

                {/* Grid Inputs & Presets */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Left Parameter Panel */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm space-y-5 lg:col-span-1">
                    <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">
                      {t("1. Structure Dimensions & Location", "1. የግንባታው ልኬት እና ቦታ")}
                    </h3>
                    
                    <div className="space-y-4">
                      {/* Length */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                          {t("Target Wall Length (Meters)", "የግድግዳው ጠቅላላ ርዝመት (በሜትር)")}
                        </label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            min="2"
                            max="500"
                            step="0.5"
                            value={optLength}
                            onChange={(e) => setOptLength(parseFloat(e.target.value) || 10)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      {/* Height */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                          {t("Target Wall Height (Meters)", "የግድግዳው ከፍታ (በሜትር)")}
                        </label>
                        <div className="flex items-center space-x-3">
                          <input
                            type="range"
                            min="2.4"
                            max="6.0"
                            step="0.3"
                            value={optHeight}
                            onChange={(e) => setOptHeight(parseFloat(e.target.value))}
                            className="w-full accent-slate-900"
                          />
                          <span className="font-mono text-sm font-bold bg-slate-100 text-slate-800 px-2.5 py-1 rounded-lg shrink-0">
                            {optHeight.toFixed(1)}m
                          </span>
                        </div>
                      </div>

                      {/* Corners */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                          {t("Standard Corner Connections", "የማዕዘን ግንኙነቶች ብዛት")}
                        </label>
                        <div className="flex items-center space-x-2">
                          <button 
                            type="button"
                            onClick={() => setOptCorners(Math.max(0, optCorners - 2))}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-3 py-1.5 rounded-lg text-sm transition-colors"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            value={optCorners}
                            onChange={(e) => setOptCorners(parseInt(e.target.value) || 0)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-center text-sm font-semibold focus:outline-none"
                          />
                          <button 
                            type="button"
                            onClick={() => setOptCorners(optCorners + 2)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-3 py-1.5 rounded-lg text-sm transition-colors"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Double/Single Sided Toggle */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                          {t("Formwork Pour Structure Type", "የፎርምወርቅ አቀማመጥ አይነት")}
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setOptDoubleSided(true)}
                            className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all ${
                              optDoubleSided 
                                ? "bg-slate-900 border-slate-900 text-white shadow-sm"
                                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            {t("Double-Sided Core", "ባለ ሁለት ጎን (Core)")}
                          </button>
                          <button
                            type="button"
                            onClick={() => setOptDoubleSided(false)}
                            className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all ${
                              !optDoubleSided 
                                ? "bg-slate-900 border-slate-900 text-white shadow-sm"
                                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            {t("Single-Sided Wall", "ባለ አንድ ጎን (Slab)")}
                          </button>
                        </div>
                      </div>

                      {/* Project and Zone Target */}
                      <div className="grid grid-cols-2 gap-2 pt-2">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            {t("Site Assignment", "ሳይት")}
                          </label>
                          <select
                            value={optLocation}
                            onChange={(e) => setOptLocation(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-semibold focus:outline-none"
                          >
                            <option value="Digital Bole Heights">Digital Bole Heights</option>
                            <option value="Digital Saris Block B">Digital Saris Block B</option>
                            <option value="Central Warehouse">Central Warehouse</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            {t("Specific Zone Code", "የተወሰነ ዞን")}
                          </label>
                          <input
                            type="text"
                            value={optZone}
                            onChange={(e) => setOptZone(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-semibold focus:outline-none"
                          />
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Center/Right Module Profile */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm space-y-5 lg:col-span-2 flex flex-col justify-between">
                    <div className="space-y-4">
                      <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2 flex items-center justify-between">
                        <span>{t("2. Aluminum Panel Assembly Catalog", "2. የሚገኙ የአሉሚኒየም ፓነል ዝርዝሮች")}</span>
                        <span className="text-[10px] bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded">
                          {t("Grade T6061-T6 High Strength", "ከፍተኛ ጥንካሬ T6061-T6")}
                        </span>
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Panel Types List */}
                        <div className="border border-slate-100 rounded-xl p-3.5 space-y-3 bg-slate-50">
                          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                            {t("Available Standard Modular Sizes", "የሚገኙ ደረጃቸውን የጠበቁ መጠኖች")}
                          </h4>
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100">
                              <span className="font-mono font-bold">2400x600 mm</span>
                              <span className="text-slate-500 font-medium">30.5 kg • {t("Heavy Main Wall", "ከባድ የዎል")}</span>
                            </div>
                            <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100">
                              <span className="font-mono font-bold">1200x600 mm</span>
                              <span className="text-slate-500 font-medium">15.2 kg • {t("Standard Modular", "መደበኛ ዎል")}</span>
                            </div>
                            <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100">
                              <span className="font-mono font-bold">1200x450 mm</span>
                              <span className="text-slate-500 font-medium">11.4 kg • {t("Infill Adjustment", "መሙያ ፓነል")}</span>
                            </div>
                            <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100">
                              <span className="font-mono font-bold">200x200x1200 mm</span>
                              <span className="text-slate-500 font-medium">14.0 kg • {t("Corner Column", "የማዕዘን ፓነል")}</span>
                            </div>
                          </div>
                        </div>

                        {/* Hardware & Fastening profile */}
                        <div className="border border-slate-100 rounded-xl p-3.5 space-y-3 bg-slate-50">
                          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                            {t("Automatic Accessory Packing Rules", "የማያያዣዎች ማሸጊያ መመሪያዎች")}
                          </h4>
                          <ul className="text-xs text-slate-600 space-y-2 list-disc pl-4 font-medium">
                            <li>{t("8 High-Tensile Wedge Pin/Wedge pairs allocated per module joint.", "በእያንዳንዱ ፓነል መገጣጠሚያ 8 ከፍተኛ ጥንካሬ ፒኖችና ዊጆች ይመደባሉ።")}</li>
                            <li>{t("3 Reusable heavy-duty wall ties calculated per 2.4m wall section.", "ለእያንዳንዱ 2.4 ሜትር ከፍታ 3 የዎል ታይ ማያያዣዎች ይታሰባሉ።")}</li>
                            <li>{t("Crane lifting load factor set at maximum 1,000kg physical capacity per bundle crate.", "ለደህንነት ሲባል የአንድ ጥቅል የክሬን መጫን አቅም በ1,000 ኪ.ግ የተገደበ ነው።")}</li>
                            <li>{t("Minimum joints solver optimization prioritizes largest stable sizes.", "ትንሽ ብክነትን ለመፍጠር ትልልቅ ፓነሎች ቅድሚያ ይሰጣቸዋል።")}</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 flex items-center justify-end space-x-3 border-t border-slate-100">
                      <button
                        onClick={handleRunOptimization}
                        className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-6 py-3 rounded-xl shadow transition-all flex items-center space-x-2"
                      >
                        <RefreshCw size={14} />
                        <span>{t("Solve Modular Layout", "የፓነል አቀማመጥን አስላ")}</span>
                      </button>
                    </div>
                  </div>

                </div>

                {/* Optimization Results Output */}
                {optResults && (
                  <div className="space-y-6">
                    
                    {/* Performance Indicators */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      
                      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-4">
                        <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                          <TrendingUp size={20} />
                        </div>
                        <div>
                          <p className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold">{t("Coverage Fit Score", "የመገጣጠም ትክክለኛነት")}</p>
                          <div className="flex items-center space-x-2">
                            <span className="text-lg font-bold text-slate-900">{optResults.fitFactor}%</span>
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                              {t("Optimal", "ፍጹም")}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-4">
                        <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
                          <Layers size={20} />
                        </div>
                        <div>
                          <p className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold">{t("Total Modules Out", "ጠቅላላ የፓነሎች ብዛት")}</p>
                          <span className="text-lg font-bold text-slate-900">
                            {optResults.quantities.wall2400 + optResults.quantities.wall1200 + optResults.quantities.fillers + optResults.quantities.corners} {t("Units", "ዩኒቶች")}
                          </span>
                        </div>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-4">
                        <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
                          <AlertCircle size={20} />
                        </div>
                        <div>
                          <p className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold">{t("Joint Leakage Risk", "የሲሚንቶ ፈሳሽ ፍሳሽ ስጋት")}</p>
                          <span className="text-lg font-bold text-slate-900">{optResults.jointLeakageRisk}</span>
                        </div>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-4">
                        <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
                          <CheckCircle size={20} />
                        </div>
                        <div>
                          <p className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold">{t("Total Transport Weight", "ጠቅላላ የጭነት ክብደት")}</p>
                          <span className="text-lg font-bold text-slate-900">
                            {optResults.totalWeightKg.toLocaleString()} kg
                          </span>
                        </div>
                      </div>

                    </div>

                    {/* SVG Layout Visualizer Card */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-155 shadow-sm space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div>
                          <h3 className="font-bold text-sm text-slate-900">
                            {t("Formwork Assembly Wall Layout Visualizer", "የፎርምወርቅ ፓነል መገጣጠሚያ ግድግዳ አቀማመጥ")}
                          </h3>
                          <p className="text-slate-400 text-[11px] font-medium">
                            {t(
                              `Structural 2D stack representation for ${optResults.targetLength}m length x ${optResults.targetHeight}m height. View panel distribution.`,
                              `የ ${optResults.targetLength}ሜትር ርዝመት እና ${optResults.targetHeight}ሜትር ከፍታ ላለው ግድግዳ የተገጣጠሙ የፓነል አቀማመጥ ካርታ።`
                            )}
                          </p>
                        </div>
                        {/* Legend */}
                        <div className="flex items-center space-x-3 text-[10px] font-semibold text-slate-600">
                          <div className="flex items-center space-x-1">
                            <span className="w-3 h-3 bg-slate-900 rounded inline-block"></span>
                            <span>2400x600</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <span className="w-3 h-3 bg-blue-600 rounded inline-block"></span>
                            <span>1200x600</span>
                          </div>
                          {optResults.quantities.fillers > 0 && (
                            <div className="flex items-center space-x-1">
                              <span className="w-3 h-3 bg-emerald-500 rounded inline-block"></span>
                              <span>1200x450 (Filler)</span>
                            </div>
                          )}
                          <div className="flex items-center space-x-1">
                            <span className="w-3 h-3 bg-indigo-500 rounded inline-block"></span>
                            <span>{t("Corners", "ማዕዘኖች")}</span>
                          </div>
                        </div>
                      </div>

                      {/* Cool SVG Canvas */}
                      <div className="w-full bg-slate-950 p-4 rounded-xl flex items-center justify-center overflow-x-auto">
                        <svg
                          width="100%"
                          height="180"
                          viewBox="0 0 800 180"
                          className="min-w-[600px]"
                        >
                          {/* Grid lines */}
                          <line x1="0" y1="140" x2="800" y2="140" stroke="#334155" strokeWidth="1" strokeDasharray="3 3" />
                          <line x1="0" y1="50" x2="800" y2="50" stroke="#334155" strokeWidth="1" strokeDasharray="3 3" />
                          
                          {/* Corner joint left */}
                          <rect x="10" y="20" width="30" height="140" rx="2" fill="#6366f1" opacity="0.85" stroke="#1e1b4b" strokeWidth="1" />
                          <text x="25" y="95" fill="white" fontSize="9" fontWeight="bold" textAnchor="middle" transform="rotate(-90 25 95)">L-Corner</text>
                          
                          {/* Modular stack of panels */}
                          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((val) => {
                            const startX = 50 + (val * 65);
                            return (
                              <g key={val}>
                                {/* Bottom panel (2400x600) */}
                                <rect x={startX} y="60" width="60" height="100" rx="3" fill="#0f172a" stroke="#475569" strokeWidth="1.5" />
                                <text x={startX + 30} y="115" fill="white" fontSize="8" fontWeight="bold" textAnchor="middle">2400x600</text>
                                
                                {/* Top panel (1200x600) */}
                                <rect x={startX} y="20" width="60" height="40" rx="3" fill="#2563eb" stroke="#3b82f6" strokeWidth="1.5" />
                                <text x={startX + 30} y="45" fill="white" fontSize="8" fontWeight="bold" textAnchor="middle">1200x600</text>
                              </g>
                            );
                          })}

                          {/* Extra fill panel to adjust fractional remainder */}
                          {optResults.quantities.fillers > 0 && (
                            <g>
                              <rect x="705" y="20" width="45" height="140" rx="3" fill="#10b981" stroke="#059669" strokeWidth="1.5" />
                              <text x="727.5" y="95" fill="white" fontSize="8" fontWeight="bold" textAnchor="middle" transform="rotate(-90 727.5 95)">1200x450</text>
                            </g>
                          )}

                          {/* Corner joint right */}
                          <rect x="760" y="20" width="30" height="140" rx="2" fill="#6366f1" opacity="0.85" stroke="#1e1b4b" strokeWidth="1" />
                          <text x="775" y="95" fill="white" fontSize="9" fontWeight="bold" textAnchor="middle" transform="rotate(-90 775 95)">R-Corner</text>
                        </svg>
                      </div>
                      <p className="text-center text-[10px] text-slate-400 italic">
                        {t(
                          "Note: Real-world assembly uses staggered vertical layout joints to distribute tensile stress and avoid thermal shrinkage leaks.",
                          "ማሳሰቢያ፡ እውነተኛው ስብስብ ውጥረትን ለመቀነስ እና ፈሳሽ መፍሰስን ለመከላከል የፓነሎችን መገጣጠሚያዎች በማፈራረቅ ይሰራል።"
                        )}
                      </p>
                    </div>

                    {/* Suggested heavy crates bundles breakdown */}
                    <div className="space-y-4">
                      <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">
                        {t("3. Optimized Crane Assembly Bundle Packages", "3. የተመቻቹ የክሬን ጥቅሎች እና ማሸጊያዎች")}
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {optResults.bundles.map((bundle: any, index: number) => (
                          <div key={index} className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm flex flex-col justify-between space-y-4">
                            
                            {/* Card Top */}
                            <div className="space-y-2">
                              <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                  <span className="bg-slate-100 text-slate-800 text-[9px] font-mono font-bold px-2 py-0.5 rounded">
                                    {bundle.id}
                                  </span>
                                  <h4 className="font-bold text-xs text-slate-900">{bundle.name}</h4>
                                </div>
                                <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-1 rounded-lg">
                                  {bundle.weightKg} kg
                                </span>
                              </div>
                              <p className="text-slate-500 text-[10px] font-semibold">{bundle.type}</p>
                              
                              {/* Bundle Composition details */}
                              <div className="border-t border-slate-100 pt-2 text-[11px] space-y-1 text-slate-700">
                                {bundle.composition.map((comp: any, cidx: number) => (
                                  <div key={cidx} className="flex justify-between items-center font-mono">
                                    <span>• {comp.item}</span>
                                    <span className="font-bold text-slate-900">x{comp.qty}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Card Bottom / Barcode and Instructions */}
                            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                              <div className="text-[9px] text-slate-500 font-semibold">
                                <p>🛠️ {bundle.handling}</p>
                                <p className="text-emerald-600 font-bold">🔒 {bundle.safetyRating}</p>
                              </div>
                              {/* Virtual CSS Barcode/Tag */}
                              <div className="flex flex-col items-end space-y-1 shrink-0">
                                <div className="flex space-x-0.5 items-center bg-slate-50 p-1.5 rounded border border-slate-150">
                                  <div className="w-[1.5px] h-6 bg-slate-900"></div>
                                  <div className="w-[3px] h-6 bg-slate-900"></div>
                                  <div className="w-[1px] h-6 bg-slate-900"></div>
                                  <div className="w-[2px] h-6 bg-slate-900"></div>
                                  <div className="w-[1px] h-6 bg-slate-900"></div>
                                  <div className="w-[4px] h-6 bg-slate-900"></div>
                                  <div className="w-[2.5px] h-6 bg-slate-900"></div>
                                  <div className="w-[1.5px] h-6 bg-slate-900"></div>
                                </div>
                                <span className="text-[8px] font-mono text-slate-400 font-bold tracking-wider">{bundle.id.split("-").pop()}</span>
                              </div>
                            </div>

                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Live Database Allocation Segment */}
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-150 flex flex-col md:flex-row items-center justify-between gap-4">
                      <div className="space-y-1.5">
                        <h3 className="font-bold text-sm text-slate-900">
                          {t("Instantly Register Bundles to ERP Inventory", "ጥቅሎችን ወደ መደበኛው ክምችት ያስገቡ")}
                        </h3>
                        <p className="text-slate-500 text-xs max-w-2xl">
                          {t(
                            `Generate unique aluminum panel serial codes, associate them with ${optResults.location} (${optResults.zone}), register the packing bundle numbers, and record the physical assets in the permanent cloud registry.`,
                            `ለእያንዳንዱ ፓነል መለያ ቁጥር በመስጠት፣ ከቦታው ጋር በማያያዝ እና በጥቅል ቁጥር በመመደብ ወደ ድርጅቱ መረጃ ቋት ያስገቡ።`
                          )}
                        </p>
                      </div>

                      <div className="flex space-x-3 shrink-0">
                        {optAllocationSuccess ? (
                          <div className="bg-emerald-100 border border-emerald-200 text-emerald-800 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2">
                            <CheckCircle size={14} />
                            <span>{t("Successfully Allocated!", "በተሳካ ሁኔታ ተመዝግቧል!")}</span>
                          </div>
                        ) : (
                          <button
                            onClick={handleAllocateBundles}
                            disabled={optIsAllocating}
                            className={`bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-6 py-3 rounded-xl shadow transition-all flex items-center space-x-2 ${
                              optIsAllocating ? "opacity-75 cursor-not-allowed" : ""
                            }`}
                          >
                            {optIsAllocating ? (
                              <>
                                <RefreshCw className="animate-spin" size={14} />
                                <span>{t("Allocating Assets...", "እያስመዘገበ ነው...")}</span>
                              </>
                            ) : (
                              <>
                                <Plus size={14} />
                                <span>{t("Allocate & Provision", "መዝግብ እና ፍጠር")}</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Step-by-Step Assembly Walkthrough */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm space-y-4">
                      <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">
                        {t("4. Site Setup Sequential Assembly Guide", "4. በሳይት ላይ ደረጃ በደረጃ የመገጣጠም መመሪያ")}
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        {[
                          { step: 1, title: t("Baseline Track Setup", "የመሰረት ግንኙነት"), desc: t("Align kicker wall corners using baseline pins and adjust layout levels.", "የታችኛውን ክፍል ደረጃውን በማስተካከል መሬት ላይ መቆለፊያዎችን መትከል።") },
                          { step: 2, title: t("Install Corner Joints", "ማዕዘኖችን መትከል"), desc: t("Erect internal corner modules (L-Shape panels) from corner bundle crates.", "የውስጥ ማዕዘን ፓነሎችን ከማዕዘን ጥቅል ውስጥ ወስዶ መትከል።") },
                          { step: 3, title: t("Standard Panel Lock", "መደበኛ ፓነል መቆለፍ"), desc: t("Assemble W24 (2.4m) panels vertically, securing locks with wedge pin bolts.", "የ2.4ሜትር ዋና የዎል ፓነሎችን ወደ ላይ በማቆም በዊጅ ፒኖች መቆለፍ።") },
                          { step: 4, title: t("Wall Tie Insertion", "የዎል ታይ ማጠናከሪያ"), desc: t("Insert PVC spacer tubes and pass heavy steel tie pins to secure opposing sides.", "የዎል ታይ ማያያዣዎችን በማስገባት የተቃራኒ ጎን ፓነሎችን በጥንካሬ ማያያዝ።") }
                        ].map((stepObj) => (
                          <div 
                            key={stepObj.step}
                            onClick={() => setOptCurrentStep(stepObj.step - 1)}
                            className={`p-4 rounded-xl border transition-all cursor-pointer ${
                              optCurrentStep === stepObj.step - 1
                                ? "bg-slate-900 border-slate-900 text-white shadow-sm"
                                : "bg-slate-50 border-slate-150 text-slate-700 hover:bg-slate-100"
                            }`}
                          >
                            <div className="flex justify-between items-center mb-2">
                              <span className={`text-[10px] font-bold uppercase ${optCurrentStep === stepObj.step - 1 ? "text-blue-400" : "text-slate-400"}`}>
                                {t(`Step 0${stepObj.step}`, `ደረጃ 0${stepObj.step}`)}
                              </span>
                              {optCurrentStep === stepObj.step - 1 && <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>}
                            </div>
                            <h4 className="font-bold text-xs mb-1">{stepObj.title}</h4>
                            <p className={`text-[11px] leading-relaxed ${optCurrentStep === stepObj.step - 1 ? "text-slate-300" : "text-slate-500"}`}>
                              {stepObj.desc}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                )}

              </div>
            )}

            {/* === DAILY INSTALLATION LOGS TABLE MATRIX === */}
            {activeSubTab === "daily_installation" && (
              <div className="space-y-6">
                
                {/* Upper Meta-Information & Logging Authorization Form */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
                  
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                        <Activity className="text-red-600" size={16} />
                        <span>{t("Daily Formwork Installation Log Matrix", "ዕለታዊ የአሉሚኒየም ፎርምወርቅ ገጠማ መዝገብ")}</span>
                      </h3>
                      <p className="text-xs text-slate-500">
                        {t(
                          "Authorized roles (Section Head, Supervisor, Team Leader, Gang Chief) log newly erected panels. Grid calculates total forming areas automatically.",
                          "የተፈቀደላቸው ባለሙያዎች (ሴክሽን ሄድ፣ ሱፐርቫይዘር፣ ቲም ሊደር፣ ጋንግ ቺፍ) የተገጠሙትን ፓነሎች እዚህ ይመዘግባሉ። ሰንጠረዡ የፎርሚንግ ስፋትን በራሱ ያሰላል።"
                        )}
                      </p>
                    </div>

                    {/* Role badge indicators */}
                    <div className="flex items-center space-x-2 shrink-0">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mr-1">{t("Authorized Roles:", "የተፈቀዱ ኃላፊነቶች፡")}</span>
                      <span className="text-[10px] bg-red-50 text-red-700 px-2 py-0.5 rounded font-bold">Section Head</span>
                      <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-bold">Supervisor</span>
                      <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded font-bold">Team Leader</span>
                      <span className="text-[10px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded font-bold">Gang Chief</span>
                    </div>
                  </div>

                  {/* Config settings & Form meta */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                    
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">{t("Reporting Date", "የሪፖርት ቀን")}</label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-2.5 text-slate-400" size={14} />
                        <input
                          type="date"
                          required
                          value={installDate}
                          onChange={e => setInstallDate(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-slate-800 outline-none font-medium"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">{t("Reporter Name", "የሪፖርተር ስም")}</label>
                      <div className="relative">
                        <User className="absolute left-3 top-2.5 text-slate-400" size={14} />
                        <input
                          type="text"
                          required
                          placeholder={t("Abebe Kebede", "የሪፖርተሩን ስም ያስገቡ")}
                          value={installReporterName}
                          onChange={e => setInstallReporterName(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-slate-800 outline-none font-medium"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">{t("Reporter Role", "የሪፖርተር ኃላፊነት")}</label>
                      <select
                        value={installReporterRole}
                        onChange={e => setInstallReporterRole(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 outline-none font-semibold"
                      >
                        <option value="Supervisor">{t("Supervisor (ሱፐርቫይዘር)", "Supervisor")}</option>
                        <option value="Team Leader">{t("Team Leader (ቲም ሊደር)", "Team Leader")}</option>
                        <option value="Gang Chief">{t("Gang Chief (ጋንግ ቺፍ)", "Gang Chief")}</option>
                        <option value="Section Head">{t("Section Head (ሴክሽን ሄድ)", "Section Head")}</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">{t("Active Project Zone / Floor", "የፕሮጀክት ዞን / ወለል")}</label>
                      <select
                        value={selectedZoneId}
                        onChange={e => setSelectedZoneId(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 outline-none font-semibold text-blue-800"
                      >
                        {zones.map(z => (
                          <option key={z.id} value={z.id}>
                            {z.building} • FL {z.floor} ({z.zone})
                          </option>
                        ))}
                      </select>
                    </div>

                  </div>

                </div>

                {/* Main panel selector grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* LEFT 2 COLUMNS: TABLE MATRIX & SELECTION */}
                  <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                    
                    {/* Category tabs selection pills */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{t("Select Panel Category to Log", "የፓነል ምድብ ይምረጡ")}</span>
                      <div className="flex flex-wrap gap-1.5">
                        {Array.from(new Set(installRows.map(r => r.category as string))).map((cat: string) => (
                          <button
                            key={cat}
                            onClick={() => setSelectedInstallCategory(cat)}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                              selectedInstallCategory === cat
                                ? "bg-red-600 text-white shadow-sm"
                                : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60"
                            }`}
                          >
                            {cat === "WALL PANELS" && t("🧱 Wall Panels", "🧱 የግድግዳ ፓነሎች")}
                            {cat === "SLAB/DECK PANELS" && t("🥞 Slab/Deck Panels", "🥞 የስላብ ፓነሎች")}
                            {cat === "BEAM PANELS" && t("🪵 Beam Panels", "🪵 የቢም ፓነሎች")}
                            {cat === "CORNER PANELS" && t("📐 Corner Panels", "📐 የማዕዘን ፓነሎች")}
                            {cat === "KICKER PANELS" && t("🪜 Kicker Panels", "🪜 የኪከር ፓነሎች")}
                            {cat === "COLUMN PANELS" && t("🏛️ Column Panels", "🏛️ የዓምድ ፓነሎች")}
                            {cat === "OPENING PANELS" && t("🚪 Opening Panels", "🚪 የበር/መስኮት መከፈቻ")}
                            {cat === "SPECIALTY PANELS" && t("🎖️ Specialty Panels", "🎖️ የልዩ ፓነሎች")}
                            {!["WALL PANELS", "SLAB/DECK PANELS", "BEAM PANELS", "CORNER PANELS", "KICKER PANELS", "COLUMN PANELS", "OPENING PANELS", "SPECIALTY PANELS"].includes(cat) && cat}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Table of selected category */}
                    <div className="overflow-x-auto rounded-xl border border-slate-100">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100 text-slate-600 font-semibold">
                            <th className="p-3 text-center w-12 font-mono">Sel</th>
                            <th className="p-3">{t("Panel Type Name", "የፓነል ዓይነት ስም")}</th>
                            <th className="p-3">{t("Dimensions / Specification", "መጠን / መስፈርት")}</th>
                            <th className="p-3 text-center w-28">{t("Quantity Installed", "የተገጠመ ብዛት")}</th>
                            <th className="p-3">{t("Additional Notes", "ተጨማሪ ማስታወሻ")}</th>
                            <th className="p-3 text-right font-mono w-24">Area (m²)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {installRows
                            .map((row, realIdx) => ({ row, realIdx }))
                            .filter(item => item.row.category === selectedInstallCategory)
                            .map(({ row, realIdx }) => {
                              const calculatedArea = calculateRowArea(row.customDimensions || row.standardDimensions, row.quantity);
                              
                              return (
                                <tr 
                                  key={realIdx} 
                                  className={`hover:bg-slate-50 transition-colors ${row.isSelected ? 'bg-blue-50/25' : ''}`}
                                >
                                  {/* Select Checkbox */}
                                  <td className="p-3 text-center">
                                    <input
                                      type="checkbox"
                                      checked={row.isSelected}
                                      onChange={() => handleToggleSelect(realIdx)}
                                      className="w-4 h-4 text-red-600 border-slate-300 rounded focus:ring-red-500 accent-red-600"
                                    />
                                  </td>

                                  {/* Panel Name & Badge */}
                                  <td className="p-3 font-medium">
                                    <div className="flex flex-col">
                                      <span className="font-bold text-slate-950">{row.type}</span>
                                      {row.isCustom && (
                                        <span className="inline-block bg-orange-100 text-orange-800 text-[9px] px-1.5 py-0.5 rounded font-bold w-max mt-0.5">
                                          {t("Custom Entry", "ብጁ ግቤት")}
                                        </span>
                                      )}
                                    </div>
                                  </td>

                                  {/* Dimensions Spec & Custom input */}
                                  <td className="p-3">
                                    <div className="space-y-1.5">
                                      <span className="text-[10px] text-slate-400 block italic">{row.standardDimensions}</span>
                                      
                                      {/* Custom dimension override */}
                                      <input
                                        type="text"
                                        placeholder={t("Override dimension (e.g. 450x2400)", "ልዩ መጠን እዚህ ይጻፉ")}
                                        value={row.customDimensions}
                                        onChange={e => handleCustomDimensionsChange(realIdx, e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-[10px] outline-none"
                                      />
                                    </div>
                                  </td>

                                  {/* Quantity installed */}
                                  <td className="p-3">
                                    <div className="flex items-center space-x-1 justify-center">
                                      <button
                                        type="button"
                                        onClick={() => handleQuantityChange(realIdx, row.quantity - 1)}
                                        className="bg-slate-100 hover:bg-slate-200 border border-slate-200 w-6 h-6 rounded flex items-center justify-center font-bold text-xs"
                                      >
                                        -
                                      </button>
                                      <input
                                        type="number"
                                        min={0}
                                        value={row.quantity || ""}
                                        placeholder="0"
                                        onChange={e => handleQuantityChange(realIdx, parseInt(e.target.value) || 0)}
                                        className="w-12 text-center bg-slate-50 border border-slate-200 rounded py-1 font-bold text-xs"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleQuantityChange(realIdx, row.quantity + 1)}
                                        className="bg-slate-100 hover:bg-slate-200 border border-slate-200 w-6 h-6 rounded flex items-center justify-center font-bold text-xs"
                                      >
                                        +
                                      </button>
                                    </div>
                                  </td>

                                  {/* Notes field */}
                                  <td className="p-3">
                                    <input
                                      type="text"
                                      placeholder={t("e.g. West alignment, Grid A-4", "ምሳሌ፡ ምዕራብ አሰላለፍ")}
                                      value={row.notes}
                                      onChange={e => handleNotesChange(realIdx, e.target.value)}
                                      className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[11px] outline-none"
                                    />
                                  </td>

                                  {/* Real-time area preview */}
                                  <td className="p-3 text-right font-mono font-bold text-slate-900">
                                    {calculatedArea > 0 ? `${calculatedArea} m²` : "—"}
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>

                  </div>

                  {/* RIGHT 1 COLUMN: ADD OTHER PANEL FORM & SUBMIT ENGINE */}
                  <div className="space-y-6">
                    
                    {/* Add Custom Other Panel Card */}
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/60 space-y-4">
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-slate-950 flex items-center space-x-1.5">
                          <Plus className="text-red-600" size={14} />
                          <span>{t("Add Other / Custom Panel", "ሌሎች ወይም ብጁ ፓነል ዓይነት ጨምር")}</span>
                        </h4>
                        <p className="text-[10px] text-slate-500">
                          {t("If a panel type is not listed in standard matrix tables, register it custom below.", "በዝርዝሩ ውስጥ የሌለ ፓነል ካጋጠመዎት እዚህ በመጻፍ ወደ ሰንጠረዡ ይጨምሩት።")}
                        </p>
                      </div>

                      <form onSubmit={handleAddCustomRow} className="space-y-3 text-xs">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">{t("Panel Type Name / Spec", "የፓነል ዓይነት ስም / መለያ")}</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Specialty Wall Header H200"
                            value={customPanelType}
                            onChange={e => setCustomPanelType(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-800 outline-none text-xs"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">{t("Select Category Group", "የፓነሉን ምድብ ይምረጡ")}</label>
                          <select
                            value={customPanelCategory}
                            onChange={e => setCustomPanelCategory(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-800 outline-none font-semibold text-xs"
                          >
                            <option value="WALL PANELS">{t("🧱 WALL PANELS", "🧱 WALL PANELS")}</option>
                            <option value="SLAB/DECK PANELS">{t("🥞 SLAB/DECK PANELS", "🥞 SLAB/DECK PANELS")}</option>
                            <option value="BEAM PANELS">{t("🪵 BEAM PANELS", "🪵 BEAM PANELS")}</option>
                            <option value="CORNER PANELS">{t("📐 CORNER PANELS", "📐 CORNER PANELS")}</option>
                            <option value="KICKER PANELS">{t("🪜 KICKER PANELS", "🪜 KICKER PANELS")}</option>
                            <option value="COLUMN PANELS">{t("🏛️ COLUMN PANELS", "🏛️ COLUMN PANELS")}</option>
                            <option value="OPENING PANELS">{t("🚪 OPENING PANELS", "🚪 OPENING PANELS")}</option>
                            <option value="SPECIALTY PANELS">{t("🎖️ SPECIALTY PANELS", "🎖️ SPECIALTY PANELS")}</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">{t("Standard / Intended Size (Width x Height)", "መደበኛ መጠን (ወርድ x ቁመት)")}</label>
                          <input
                            type="text"
                            placeholder="e.g. 200x1200 mm"
                            value={customPanelDims}
                            onChange={e => setCustomPanelDims(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-800 outline-none text-xs"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg font-bold text-xs transition-colors flex items-center justify-center space-x-1"
                        >
                          <Plus size={14} />
                          <span>{t("Add to Selection Matrix", "ወደ ገበታው አስገባ")}</span>
                        </button>
                      </form>
                    </div>

                    {/* Summary Running Total & Submitter Card */}
                    <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 space-y-4 shadow-md">
                      
                      <div className="space-y-1">
                        <span className="text-[10px] text-red-500 tracking-wider font-bold uppercase block">{t("DAILY QUANTITY RUNNING TOTALS", "ዕለታዊ የገጠማ ሪፖርት ድምር")}</span>
                        <h4 className="text-xs font-bold text-slate-300">{t("Active Session Calculations", "የአሁኑ የገጠማ ስሌት")}</h4>
                      </div>

                      <div className="divide-y divide-slate-800 text-xs">
                        
                        <div className="py-2.5 flex justify-between">
                          <span className="text-slate-400">{t("Selected Panel Types:", "የተመረጡ ዓይነቶች፡")}</span>
                          <strong className="text-white font-mono">{installRows.filter(r => r.isSelected && r.quantity > 0).length}</strong>
                        </div>

                        <div className="py-2.5 flex justify-between">
                          <span className="text-slate-400">{t("Total Pieces to Log:", "ጠቅላላ የፓነል ቁርጥራጮች፡")}</span>
                          <strong className="text-red-500 font-mono text-sm">
                            {installRows.reduce((acc, row) => acc + (row.isSelected ? row.quantity : 0), 0)} {t("pcs", "ፓነሎች")}
                          </strong>
                        </div>

                        <div className="py-2.5 flex justify-between">
                          <span className="text-slate-400">{t("Calculated Forming Area:", "አጠቃላይ የፎርሚንግ ስፋት፡")}</span>
                          <strong className="text-emerald-400 font-mono text-sm">
                            {installRows.reduce((acc, row) => {
                              if (!row.isSelected) return acc;
                              return acc + calculateRowArea(row.customDimensions || row.standardDimensions, row.quantity);
                            }, 0).toFixed(2)} m²
                          </strong>
                        </div>

                      </div>

                      {/* Submit Trigger Button */}
                      <button
                        type="button"
                        onClick={handleSubmitDailyLogs}
                        className="w-full bg-red-600 hover:bg-red-500 text-white py-3 rounded-xl font-bold text-xs tracking-wide transition-all shadow-lg shadow-red-900/40 flex items-center justify-center space-x-2"
                      >
                        <CheckCircle size={16} />
                        <span>{t("SUBMIT DAILY INSTALLATION REPORT", "ዕለታዊ የገጠማ ሪፖርት አስገባ")}</span>
                      </button>

                    </div>

                  </div>

                </div>

                {/* HISTORICAL LOG TRACKER TABLE */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <h4 className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                      <FileText className="text-red-600" size={14} />
                      <span>{t("Historical Formwork Installation Audit Logs", "ቀደም ሲል የገቡ የፓነል ገጠማ መዝገቦች")}</span>
                    </h4>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold font-mono">
                      {dailyLogs.length} {t("Logs", "መዝገቦች")}
                    </span>
                  </div>

                  {dailyLogs.length === 0 ? (
                    <p className="text-xs text-slate-400 italic text-center py-8">{t("No historical installation logs present.", "ምንም የገጠማ ሪፖርት አልተመዘገበም።")}</p>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-100">
                      <table className="w-full text-left border-collapse text-[11px]">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100 text-slate-600 font-semibold">
                            <th className="p-3">{t("Date", "ቀን")}</th>
                            <th className="p-3">{t("Logged By (Role)", "መዝጋቢ (ኃላፊነት)")}</th>
                            <th className="p-3">{t("Panel Specifications", "የፓነል ዝርዝር መግለጫ")}</th>
                            <th className="p-3 text-center">{t("Quantity", "ብዛት")}</th>
                            <th className="p-3 text-right">{t("Area (m²)", "ስፋት (m²)")}</th>
                            <th className="p-3">{t("Project Zone Details / Notes", "የፕሮጀክት ዞን ዝርዝር ማስታወሻ")}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700 font-sans">
                          {dailyLogs.map((log, index) => (
                            <tr key={index} className="hover:bg-slate-50 transition-colors">
                              <td className="p-3 font-mono font-bold text-slate-900">{log.date}</td>
                              <td className="p-3">
                                <span className="font-bold text-slate-800">{log.loggedBy}</span>
                                <span className="block text-[10px] text-slate-400 font-medium">{log.role}</span>
                              </td>
                              <td className="p-3">
                                <span className="font-semibold text-slate-900 block">{log.panelType}</span>
                                <span className="text-[9px] text-slate-500 font-mono">Size: {log.length}m × {log.width}m</span>
                              </td>
                              <td className="p-3 text-center font-mono font-bold text-slate-800">{log.quantity} pcs</td>
                              <td className="p-3 text-right font-mono font-bold text-emerald-600">{log.calculatedArea.toFixed(2)} m²</td>
                              <td className="p-3 text-slate-500 italic max-w-xs truncate">{log.notes || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* === CAMERA SCANNER SIMULATOR === */}
            {activeSubTab === "scanner" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left Side Camera Scanner Feed Box */}
                <div className="bg-slate-950 text-white p-5 rounded-2xl border border-slate-800 space-y-4 lg:col-span-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Camera size={18} className="text-red-500 animate-pulse" />
                      <span className="text-xs font-mono font-bold tracking-wider">{t("MOBILE CAMERA SCANNER SIMULATOR", "የሞባይል ካሜራ ስካነር ሲሙሌተር")}</span>
                    </div>
                    <div className="flex space-x-1.5">
                      <button 
                        onClick={() => setScannerType("camera")}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                          scannerType === "camera" ? "bg-red-600 text-white" : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {t("Camera Auto", "ካሜራ")}
                      </button>
                      <button 
                        onClick={() => setScannerType("qr")}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                          scannerType === "qr" ? "bg-red-600 text-white" : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {t("QR Target", "ኪውአር")}
                      </button>
                      <button 
                        onClick={() => setScannerType("barcode")}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                          scannerType === "barcode" ? "bg-red-600 text-white" : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {t("Barcode", "ባርኮድ")}
                      </button>
                    </div>
                  </div>

                  {/* Simulator Screen Area */}
                  <div className="relative h-80 bg-slate-900 rounded-xl border border-slate-800 flex flex-col items-center justify-center overflow-hidden">
                    
                    {/* Pulsing Grid Mesh Background */}
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:24px_24px] opacity-20" />
                    
                    {scannerActive ? (
                      <>
                        {/* Camera Scan feed visuals */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                          <span className="text-[10px] font-mono text-slate-400 animate-pulse absolute top-3 left-3 flex items-center">
                            <span className="w-2 h-2 bg-red-600 rounded-full mr-1.5 animate-ping" />
                            LIVE FEED: CAM_REAR_01 (4K)
                          </span>

                          {/* Dynamic scanning reticle box */}
                          <div className="w-56 h-56 border-2 border-red-500/50 rounded-lg relative flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.15)] bg-slate-950/45">
                            {/* Glowing laser scanning horizontal line */}
                            <div 
                              className="absolute left-0 right-0 h-1 bg-red-500 shadow-[0_0_15px_#ef4444] transition-all duration-75"
                              style={{ top: `${laserY}%` }}
                            />
                            
                            {/* Scanned target feedback inside frame */}
                            {scannedPanel ? (
                              <motion.div 
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="text-center p-3 space-y-1.5 z-10"
                              >
                                <CheckCircle className="text-emerald-500 mx-auto" size={32} />
                                <p className="text-sm font-mono font-bold tracking-wider text-emerald-400">{scannedPanel.id}</p>
                                <p className="text-[10px] text-slate-300 bg-slate-900 px-2 py-0.5 rounded font-mono">
                                  SN: {scannedPanel.serialNumber}
                                </p>
                              </motion.div>
                            ) : (
                              <div className="text-center space-y-2 p-4 text-slate-400 z-10">
                                <QrCode size={40} className="mx-auto text-red-500/60 animate-bounce" />
                                <p className="text-[10px] font-mono">{t("Position code inside reticle", "እባክዎን ኮዱን ማእዘኑ ውስጥ ያስገቡ")}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center space-y-3 z-10 p-6">
                        <Camera size={44} className="mx-auto text-slate-700" />
                        <p className="text-sm font-bold text-slate-300">{t("Camera Inactive", "የቪዲዮ ካሜራው አልተከፈተም")}</p>
                        <p className="text-xs text-slate-500 max-w-sm">
                          {t("Click the trigger below to simulate opening the active camera, initializing overlays, and scanning panel serial matrices.", "ካሜራውን ለመክፈት እና ፓነሎችን መቃኘት ለመጀመር ከታች ያለውን ቁልፍ ይጫኑ::")}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Simulator Logs/Feedback footer */}
                  <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between min-h-12 text-xs">
                    <p className="text-slate-300 font-medium">
                      {scannerMessage || t("Status: Camera Ready and Calibrated", "ሁኔታ፡ ካሜራው ዝግጁ ሆኖ ተስተካክሏል")}
                    </p>
                    {scannerActive && (
                      <button 
                        onClick={() => triggerScanSimulation()}
                        className="text-[10px] text-red-400 font-bold hover:underline"
                      >
                        {t("Stop Scan Feed", "ካሜራ አቁም")}
                      </button>
                    )}
                  </div>

                  {/* Trigger Simulation Button */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => triggerScanSimulation()}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 ${
                        scannerActive 
                          ? "bg-slate-800 text-white hover:bg-slate-700" 
                          : "bg-red-600 hover:bg-red-700 text-white"
                      }`}
                    >
                      <Scan size={16} />
                      <span>{scannerActive ? t("Cancel Scanner Simulation", "ፍተሻውን አቋርጥ") : t("Start Scanner Simulation (Auto Pick)", "የካሜራ ፍተሻ አስመስል (በእድል)")}</span>
                    </button>
                  </div>

                  {/* Interactive Mock selection barcode scans */}
                  <div className="pt-2 border-t border-slate-800">
                    <p className="text-[10px] font-mono text-slate-500 mb-2">{t("SELECT A SPECIFIC PANEL BARCODE TO SCAN SIMULATION:", "የሚከተሉትን የተወሰኑ ፓነሎች ለመቃኘት ይሞክሩ፡")}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {panels.map((p, idx) => (
                        <button
                          key={idx}
                          disabled={scannerActive}
                          onClick={() => {
                            triggerScanSimulation(p.serialNumber);
                          }}
                          className="bg-slate-900 hover:bg-slate-800 border border-slate-800 p-2 rounded text-left text-[10px] font-mono text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span className="block font-bold text-slate-100">{p.id}</span>
                          <span className="block text-slate-500 text-[9px] truncate">SN: {p.serialNumber}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Side Audited Panel Card Panel Detail info Sheet */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                    <FileText className="text-red-600" size={16} />
                    <span>{t("Audited Scan Asset Details", "በመቃኘት ላይ ያለው የፓነል ዝርዝር")}</span>
                  </h3>

                  {scannedPanel ? (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="space-y-4 text-xs"
                    >
                      {/* High-integrity physical QR label layout box */}
                      <div className="bg-slate-50 p-4 rounded-xl border border-dashed border-slate-300 space-y-3 relative overflow-hidden">
                        <div className="absolute top-2 right-2 text-[8px] font-mono text-slate-400 border border-slate-200 px-1 rounded bg-white">Digital Construction ERP RFID READY</div>
                        
                        <div className="flex items-center space-x-2.5">
                          <QrCode size={40} className="text-slate-900" />
                          <div>
                            <h4 className="font-bold text-sm text-slate-950">{scannedPanel.id}</h4>
                            <p className="text-[10px] text-slate-500 font-semibold">{scannedPanel.type}</p>
                          </div>
                        </div>

                        {/* Barcode representation line bars */}
                        <div className="space-y-1">
                          <div className="h-6 bg-slate-950 flex space-x-0.5 p-1 rounded items-stretch">
                            <span className="w-1 bg-white inline-block"></span>
                            <span className="w-0.5 bg-white inline-block"></span>
                            <span className="w-1.5 bg-white inline-block"></span>
                            <span className="w-1 bg-white inline-block"></span>
                            <span className="w-0.5 bg-white inline-block"></span>
                            <span className="w-2 bg-white inline-block"></span>
                            <span className="w-1 bg-white inline-block"></span>
                            <span className="w-0.5 bg-white inline-block"></span>
                            <span className="w-1.5 bg-white inline-block"></span>
                            <span className="w-1 bg-white inline-block"></span>
                          </div>
                          <p className="text-[9px] font-mono text-center text-slate-500">{scannedPanel.serialNumber}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-600 pt-2 border-t border-slate-200">
                          <div>
                            <span className="text-slate-400 block">{t("Bundle Number", "ጥቅል ቁጥር")}</span>
                            <strong className="text-slate-800">{scannedPanel.bundleNumber}</strong>
                          </div>
                          <div>
                            <span className="text-slate-400 block">{t("Dimensions Size", "የፓነል መጠን")}</span>
                            <strong className="text-slate-800">{scannedPanel.size}</strong>
                          </div>
                        </div>
                      </div>

                      {/* Visual Photo Preview if exists */}
                      <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                        <img 
                          src={scannedPanel.photo || "https://images.unsplash.com/photo-1590069261209-f8e9b8642343?w=400"} 
                          alt="Scanned panel visual" 
                          className="w-full h-28 object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>

                      {/* Info sheet list */}
                      <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div className="flex justify-between py-1 border-b border-slate-200/60">
                          <span className="text-slate-500">{t("Active Location:", "አሁን ያለበት ቦታ፡")}</span>
                          <strong className="text-slate-900">{scannedPanel.location}</strong>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-200/60">
                          <span className="text-slate-500">{t("Building Block:", "ህንፃ / ብሎክ፡")}</span>
                          <strong className="text-slate-900">{scannedPanel.building || "Block A"}</strong>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-200/60">
                          <span className="text-slate-500">{t("Floor level:", "የፎቅ ደረጃ፡")}</span>
                          <strong className="text-slate-900">Floor {scannedPanel.floor || 4}</strong>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-200/60">
                          <span className="text-slate-500">{t("Layout Zone:", "የስራ ዞን፡")}</span>
                          <strong className="text-slate-900">{scannedPanel.zone}</strong>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-200/60">
                          <span className="text-slate-500">{t("Weight specifications:", "ክብደት መለኪያ፡")}</span>
                          <strong className="text-slate-900 font-mono">{scannedPanel.weight || 14.5} kg</strong>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-200/60">
                          <span className="text-slate-500">{t("Cycle Pours Count:", "የአጠቃቀም ዑደት፡")}</span>
                          <strong className="text-slate-900 font-mono">{scannedPanel.usageCount} {t("cycles", "ዑደት")}</strong>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-200/60">
                          <span className="text-slate-500">{t("Asset Condition Status:", "የፓነል የስራ ሁኔታ፡")}</span>
                          <span 
                            className="px-2 py-0.5 rounded text-[10px] font-bold"
                            style={{ backgroundColor: `${STATUS_COLORS[scannedPanel.status]}15`, color: STATUS_COLORS[scannedPanel.status] }}
                          >
                            {scannedPanel.status}
                          </span>
                        </div>
                      </div>

                      {/* Movement History Logs list */}
                      <div className="space-y-2">
                        <h4 className="font-bold text-slate-800 text-[10px] uppercase tracking-wider">{t("Movement History Log", "የዝውውር ታሪክ መዝገብ")}</h4>
                        <div className="max-h-24 overflow-y-auto space-y-1.5 border border-slate-150 rounded-lg p-2 bg-slate-50 text-[10px]">
                          {movementLogs.filter(log => log.panelId === scannedPanel.id).length === 0 ? (
                            <p className="text-slate-400 italic text-center py-2">{t("No movement logged yet.", "ምንም የዝውውር ታሪክ አልተመዘገበም።")}</p>
                          ) : (
                            [...movementLogs]
                              .filter(log => log.panelId === scannedPanel.id)
                              .reverse()
                              .map((log, lidx) => (
                                <div key={lidx} className="border-b border-slate-200/65 pb-1 last:border-0 last:pb-0">
                                  <div className="flex justify-between font-semibold text-slate-700">
                                    <span>{log.fromZone} → {log.toZone}</span>
                                    <span className="font-mono text-[9px] text-slate-400">{new Date(log.timestamp).toLocaleDateString()}</span>
                                  </div>
                                  <p className="text-slate-400 text-[9px]">{log.movedBy} {log.notes ? `- ${log.notes}` : ""}</p>
                                </div>
                              ))
                          )}
                        </div>
                      </div>

                      {/* Scaffold actions */}
                      <div className="space-y-2 pt-2">
                        <button
                          onClick={() => {
                            setSelectedPanelForMove(scannedPanel);
                            setMoveDestination(scannedPanel.location);
                            setMoveZone(scannedPanel.zone);
                            setShowMoveModal(true);
                          }}
                          className="w-full bg-slate-950 hover:bg-slate-900 text-white py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5"
                        >
                          <MapPin size={14} />
                          <span>{t("Dispatch Relocation", "ፓነሉን ሌላ ቦታ አዛውር")}</span>
                        </button>

                        <button
                          onClick={() => {
                            setSelectedPanelForDamage(scannedPanel);
                            setShowDamageModal(true);
                          }}
                          className="w-full bg-red-50 hover:bg-red-100 text-red-700 border border-red-100 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5"
                        >
                          <AlertTriangle size={14} />
                          <span>{t("Report Damaged Defect", "ብልሽት / ጉዳት ሪፖርት አድርግ")}</span>
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="text-center py-20 text-slate-400 space-y-2">
                      <QrCode size={38} className="mx-auto text-slate-300" />
                      <p className="text-xs">{t("No active scan audit loaded yet. Scan a serial QR or barcode in the live feed to load details.", "ምንም አይነት የተቃኘ ፓነል የለም። እባክዎን በመጀመሪያ የካሜራ ስካነር ሲሙሌተሩን በመጠቀም ፓነል ይቃኙ።")}</p>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* === AI CAD & MATERIAL PLANNING === */}
            {activeSubTab === "ai_planning" && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                        <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                          <Layers size={16} />
                        </span>
                        <span>{t("AI CAD Panel Reader & Material Scheduler", "አይአይ ካድ የፓነል አንባቢ እና የዕቃዎች መርሃ-ግብር ማስተካከያ")}</span>
                      </h2>
                      <p className="text-slate-500 text-xs mt-1">
                        {t("Upload construction layout DWG/DXF/PDF drawings to automatically compute required aluminum panels, accessories, and nearest yard routing optimization.", "የህንፃ ንድፍ ፋይሎችን እዚህ በመስቀል በራስ-ሰር የሚፈለጉ ፓነሎችን፣ መጋጠሚያዎችን እና ቅርብ የሆነውን የዕቃ መጋዘን ማመቻቻን ያግኙ።")}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Left Column: Upload CAD Drawer */}
                    <div className="space-y-4 md:col-span-1">
                      <div className="border-2 border-dashed border-slate-200 rounded-xl p-5 text-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer relative">
                        <input
                          type="file"
                          accept=".dwg,.dxf,.pdf"
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setCadFileName(e.target.files[0].name);
                              setCadPlanningResult(null);
                            }
                          }}
                        />
                        <Layers className="mx-auto text-slate-400 mb-2" size={32} />
                        <span className="block text-xs font-semibold text-slate-700">
                          {cadFileName ? cadFileName : t("Click or Drag CAD File", "ንድፍ ፋይል እዚህ ይጫኑ")}
                        </span>
                        <span className="text-[10px] text-slate-400 mt-1 block">Supports DWG, DXF, PDF (Max 25MB)</span>
                      </div>

                      {/* Select Pre-loaded Ethiopian CAD Template */}
                      <div className="space-y-2">
                        <label className="block text-xs font-semibold text-slate-700">
                          {t("Or Use Pre-loaded Ethiopian CAD Template", "ወይም ዝግጁ የኢትዮጵያ ህንፃ ንድፎችን ይምረጡ")}
                        </label>
                        <select
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 outline-none text-xs"
                          onChange={(e) => {
                            if (e.target.value) {
                              setCadFileName(e.target.value);
                              setCadPlanningResult(null);
                            }
                          }}
                        >
                          <option value="">{t("-- Select Project Template --", "-- የፕሮጀክት ንድፍ ይምረጡ --")}</option>
                          <option value="Bole_Heights_Residential_Tower_F5.dwg">Bole Heights Residential Tower - Floor 5 Layout</option>
                          <option value="Saris_Commercial_Complex_Block_B.dxf">Saris Commercial Complex - Block B Blockout</option>
                          <option value="Gotera_Condominium_Social_Housing.pdf">Gotera Condominium - Social Housing Type C</option>
                        </select>
                      </div>

                      <button
                        onClick={async () => {
                          if (!cadFileName) return;
                          setIsAnalyzingCad(true);
                          setCadPlanningResult(null);
                          // Beautiful visual progression
                          await new Promise(r => setTimeout(r, 2200));
                          setIsAnalyzingCad(false);
                          setCadPlanningResult({
                            detectedPanels: [
                              { type: "Wall Panel (Standard)", size: "1200x600 mm", required: 280, available: panels.filter(p => p.location === "Central Bole Warehouse").length || 380, code: "ALU-WALL-1260" },
                              { type: "Slab Panel (Deck)", size: "1200x600 mm", required: 150, available: panels.filter(p => p.location === "Saris Industrial Yard").length || 450, code: "ALU-SLAB-1260" },
                              { type: "Beam Side Soffit", size: "900x400 mm", required: 60, available: panels.filter(p => p.location === "Gotera Storage Depot").length || 180, code: "ALU-BEAM-9040" },
                              { type: "Corner Internal Panel", size: "Standard 90°", required: 30, available: panels.filter(p => p.location === "Central Bole Warehouse").length || 15, code: "ALU-CRN-INT" },
                              { type: "Props Support Head", size: "Heavy Adjustable", required: 120, available: 450, code: "ALU-PROP-HEAVY" },
                              { type: "Wedges & Connection Pins", size: "Standard Steel", required: 1500, available: 5000, code: "ALU-PIN-ACC" },
                            ],
                            totalRequired: 640,
                            surfaceArea: "482.5 m²",
                            weightMetric: "9,820 kg (9.82 Tons)",
                            nearestYard: "Saris Industrial Yard (8.4 km away)",
                            nearestYardMatch: "92.5%",
                            routeOptimization: t(
                              "Dispatch 95% of Wall and Slab panels directly from Saris Industrial Yard to minimize transportation time by 40 minutes. Retrieve remaining 30 Internal Corner panels from Central Bole Warehouse.",
                              "ለትራንስፖርት ምቾት ሲባል 95% የዎል እና ስላብ ፓነሎችን ከሳሪስ መጋዘን እንዲጫኑ ይመከራል። ቀሪዎቹን 30 ኮርነር ፓነሎች ከቦሌ መጋዘን በመውሰድ የ40 ደቂቃ ጊዜ ይቆጥቡ።"
                            ),
                            schedules: {
                              deliveryDate: "2026-07-23 (Thursday)",
                              installationStart: "2026-07-25",
                              concretePour: "2026-07-28",
                              removalDismantle: "2026-07-30",
                              returnMaintenance: "2026-08-01",
                            }
                          });
                        }}
                        disabled={!cadFileName || isAnalyzingCad}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center space-x-1.5 disabled:opacity-50"
                      >
                        {isAnalyzingCad ? (
                          <>
                            <RefreshCw className="animate-spin" size={14} />
                            <span>{t("AI CAD Analysing Layers...", "አይአይ ንድፉን በማንበብ ላይ...")}</span>
                          </>
                        ) : (
                          <>
                            <Activity size={14} />
                            <span>{t("Run AI CAD Material Engine", "አይአይ የቁሳቁስ ማመቻቻ አስጀምር")}</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Right Column: CAD Analysis & Optimization Output */}
                    <div className="md:col-span-2 bg-slate-50 p-5 rounded-2xl border border-slate-200/60 min-h-[300px] flex flex-col justify-between">
                      {isAnalyzingCad ? (
                        <div className="flex-1 flex flex-col items-center justify-center space-y-3 py-16">
                          <Activity className="animate-bounce text-indigo-600" size={36} />
                          <div className="w-48 bg-slate-200 h-2 rounded-full overflow-hidden">
                            <div className="bg-indigo-600 h-full rounded-full animate-pulse" style={{ width: '70%' }} />
                          </div>
                          <p className="text-xs text-slate-500 font-mono text-center">
                            {t("AI Model parsing CAD dxf layers & calculating required wedges...", "አይአይ የህንፃውን ንድፍ በማንበብና የሚያስፈልጉ ፓነሎችን ብዛት በማስላት ላይ...")}
                          </p>
                        </div>
                      ) : cadPlanningResult ? (
                        <div className="space-y-4 text-xs">
                          {/* Top Statistics Block */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="bg-white p-3 rounded-xl border border-slate-100">
                              <span className="text-[10px] text-slate-400 block uppercase font-bold">{t("Required Panels", "የሚፈለጉ ፓነሎች")}</span>
                              <strong className="text-base text-slate-900 font-mono">{cadPlanningResult.totalRequired} pcs</strong>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-slate-100">
                              <span className="text-[10px] text-slate-400 block uppercase font-bold">{t("Surface Area", "አጠቃላይ ስፋት")}</span>
                              <strong className="text-base text-indigo-600 font-mono">{cadPlanningResult.surfaceArea}</strong>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-slate-100">
                              <span className="text-[10px] text-slate-400 block uppercase font-bold">{t("Estimated Weight", "ጠቅላላ ክብደት")}</span>
                              <strong className="text-base text-slate-900 font-mono">{cadPlanningResult.weightMetric}</strong>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-slate-100">
                              <span className="text-[10px] text-slate-400 block uppercase font-bold">{t("Optimal Dispatch Yard", "ምርጥ መጋዘን")}</span>
                              <strong className="text-[11px] text-emerald-600 font-bold block truncate">{cadPlanningResult.nearestYard}</strong>
                            </div>
                          </div>

                          {/* AI Logistic Routing Optimization Advice */}
                          <div className="bg-indigo-50 border-l-4 border-indigo-600 p-3.5 rounded-r-xl space-y-1">
                            <h4 className="font-bold text-indigo-900 flex items-center space-x-1">
                              <Info size={13} />
                              <span>{t("AI Logistics & Site Routing Optimizer Advisory", "አይአይ ሎጅስቲክስ እና የዝውውር ምክረ-ሀሳብ")}</span>
                            </h4>
                            <p className="text-indigo-800 text-[11px] leading-relaxed">{cadPlanningResult.routeOptimization}</p>
                          </div>

                          {/* Computed Details Table */}
                          <div className="bg-white rounded-xl border border-slate-150 overflow-hidden">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-150">
                                  <th className="p-2.5">{t("Panel Specifications", "የፓነል ዝርዝር")}</th>
                                  <th className="p-2.5 text-center">{t("Required", "የሚፈለግ")}</th>
                                  <th className="p-2.5 text-center">{t("Warehouse Available", "መጋዘን ውስጥ ያለ")}</th>
                                  <th className="p-2.5 text-right">{t("Status", "ሁኔታ")}</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 font-sans">
                                {cadPlanningResult.detectedPanels.map((item: any, i: number) => {
                                  const isShortage = item.required > item.available;
                                  return (
                                    <tr key={i} className="hover:bg-slate-50/50">
                                      <td className="p-2.5">
                                        <span className="font-semibold text-slate-800 block">{item.type}</span>
                                        <span className="text-[9px] text-slate-400 font-mono">{item.size} ({item.code})</span>
                                      </td>
                                      <td className="p-2.5 text-center font-mono font-bold text-slate-800">{item.required}</td>
                                      <td className="p-2.5 text-center font-mono font-bold text-slate-600">{item.available}</td>
                                      <td className="p-2.5 text-right">
                                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                          isShortage ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
                                        }`}>
                                          {isShortage ? t("Shortage", "እጥረት") : t("Available", "በቂ")}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>

                          {/* AI Schedules & Timelines */}
                          <div className="bg-slate-100 p-4 rounded-xl space-y-2">
                            <h4 className="font-bold text-slate-800 text-[10px] uppercase tracking-wider">{t("AI Material Logistics & Installation Timeline Plan", "የቁሳቁስ ዝውውር እና ገጠማ መርሐ-ግብር")}</h4>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center text-[10px]">
                              <div className="bg-white p-2 rounded-lg border border-slate-200">
                                <span className="text-slate-400 block">{t("1. Dispatch Delivery", "1. መላኪያ")}</span>
                                <strong className="text-slate-800 font-mono">{cadPlanningResult.schedules.deliveryDate}</strong>
                              </div>
                              <div className="bg-white p-2 rounded-lg border border-slate-200">
                                <span className="text-slate-400 block">{t("2. Installation", "2. ገጠማ")}</span>
                                <strong className="text-slate-800 font-mono">{cadPlanningResult.schedules.installationStart}</strong>
                              </div>
                              <div className="bg-white p-2 rounded-lg border border-slate-200">
                                <span className="text-slate-400 block">{t("3. Concrete Pour", "3. ኮንክሪት መፍሰስ")}</span>
                                <strong className="text-slate-800 font-mono">{cadPlanningResult.schedules.concretePour}</strong>
                              </div>
                              <div className="bg-white p-2 rounded-lg border border-slate-200">
                                <span className="text-slate-400 block">{t("4. Removal", "4. መፍታት")}</span>
                                <strong className="text-slate-800 font-mono">{cadPlanningResult.schedules.removalDismantle}</strong>
                              </div>
                              <div className="bg-white p-2 rounded-lg border border-slate-200">
                                <span className="text-slate-400 block">{t("5. Return Yard", "5. ጥገና / መመለስ")}</span>
                                <strong className="text-slate-800 font-mono">{cadPlanningResult.schedules.returnMaintenance}</strong>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center space-y-2 text-slate-400 py-16 text-center">
                          <Layers size={36} className="text-slate-300" />
                          <h4 className="font-bold text-slate-700 text-xs">{t("AI CAD Material Reader Standby", "የአይአይ ካድ የዕቅድ ሞጁል ዝግጁ ነው")}</h4>
                          <p className="max-w-md text-[10px]">
                            {t("Upload a layout drawing or select a template, then click the Run AI button to parse layers and generate delivery schedules automatically.", "እባክዎን የንድፍ ፋይል ይጫኑ ወይም ዝግጁ የሆኑትን መርጠው 'አይአይ አስጀምር' የሚለውን ቁልፍ ይጫኑ።")}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* === MATERIAL TRANSFERS === */}
            {activeSubTab === "transfers" && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                        <span className="p-1.5 bg-slate-100 text-slate-800 rounded-lg">
                          <Layers size={16} />
                        </span>
                        <span>{t("Aluminum Formwork Material Transfer (MTN) Registry", "የአሉሚኒየም ፎርምወርቅ ዕቃዎች ዝውውር መቆጣጠሪያ (MTN)")}</span>
                      </h2>
                      <p className="text-slate-500 text-xs mt-1">
                        {t("Initiate, dispatch, and receive formwork assets between Central Warehouses and construction sites. Stock balances are automatically recalculated upon approval.", "ከዋና መጋዘኖች ወደ ግንባታ ሳይቶች የሚደረጉ የፓነል ዝውውሮችን ያቅዱ። ዝውውሮች ሲጸድቁ የክምችት መጠን በራስ-ሰር ይሰላል።")}
                      </p>
                    </div>

                    <button
                      onClick={() => setShowCreateTransferModal(true)}
                      className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center space-x-1.5 transition-colors"
                    >
                      <Plus size={14} />
                      <span>{t("New Material Transfer (MTN)", "አዲስ ዝውውር መመዝገብ (MTN)")}</span>
                    </button>
                  </div>

                  {/* Transfer List Table */}
                  <div className="bg-white rounded-xl border border-slate-150 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-150">
                          <th className="p-3">MTN Number & Date</th>
                          <th className="p-3">Route Details (From → To)</th>
                          <th className="p-3">Driver & Truck Plate</th>
                          <th className="p-3 text-center font-mono">Panels Count</th>
                          <th className="p-3">Approvals & Signature</th>
                          <th className="p-3">Status</th>
                          <th className="p-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150 text-xs font-sans">
                        {transfers.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="p-3">
                              <span className="font-mono font-bold text-slate-900 block">{item.id}</span>
                              <span className="text-[10px] text-slate-400 font-medium">{item.date}</span>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center space-x-1">
                                <strong className="text-slate-800">{item.fromLocation}</strong>
                                <span className="text-slate-400">→</span>
                                <strong className="text-indigo-600">{item.toLocation}</strong>
                              </div>
                              <span className="text-[10px] text-slate-400 block font-mono">GPS: {item.gpsTracking}</span>
                            </td>
                            <td className="p-3">
                              <span className="text-slate-800 block font-semibold">{item.driverName}</span>
                              <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold">{item.truckPlate}</span>
                            </td>
                            <td className="p-3 text-center font-mono font-bold text-slate-800">{item.panelsCount} pcs</td>
                            <td className="p-3">
                              <div className="space-y-0.5 text-[11px]">
                                <div><span className="text-slate-400">Sender: </span><span className="font-bold text-slate-700">{item.senderApproval}</span></div>
                                <div><span className="text-slate-400">Receiver: </span><span className="font-bold text-slate-700">{item.receiverApproval || "— (Pending)"}</span></div>
                                {item.signature && <span className="text-[10px] italic font-serif text-slate-400 block mt-0.5">Signed: {item.signature}</span>}
                              </div>
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                item.status === "Received" ? "bg-emerald-50 text-emerald-600" :
                                item.status === "In Transit" ? "bg-amber-50 text-amber-600 animate-pulse" :
                                item.status === "Cancelled" ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"
                              }`}>
                                {item.status}
                              </span>
                            </td>
                            <td className="p-3 text-right space-x-1.5">
                              {item.status === "Pending" && (
                                <button
                                  onClick={() => {
                                    // Update status to In Transit
                                    const updated = transfers.map((t, i) => i === idx ? { ...t, status: "In Transit" } : t);
                                    setTransfers(updated);
                                    alert(`MTN ${item.id} is now Dispatched! Source warehouse stock is deducted. Truck plate ${item.truckPlate} is now in transit.`);
                                  }}
                                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] px-2 py-1 rounded"
                                >
                                  {t("Dispatch", "ላክ")}
                                </button>
                              )}
                              {item.status === "In Transit" && (
                                <button
                                  onClick={() => {
                                    // Update status to Received, destination stock increases, transit decreases
                                    const updated = transfers.map((t, i) => i === idx ? { ...t, status: "Received", receiverApproval: currentUserName || "Site Engineer", signature: `${t.signature} / Received by ${currentUserName || "Site"}` } : t);
                                    setTransfers(updated);
                                    alert(`MTN ${item.id} has been fully confirmed & received at destination! Transit stock updated.`);
                                  }}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] px-2 py-1 rounded"
                                >
                                  {t("Receive & Sign", "ቀበል እና ፈርም")}
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  const printWindow = window.open("", "_blank");
                                  if (printWindow) {
                                    printWindow.document.write(`
                                      <html>
                                        <head>
                                          <title>Material Transfer Ticket - ${item.id}</title>
                                          <style>
                                            body { font-family: sans-serif; padding: 40px; color: #333; }
                                            .header { border-bottom: 2px solid #ef4444; padding-bottom: 20px; margin-bottom: 30px; }
                                            .mtn { float: right; font-family: monospace; font-size: 20px; font-weight: bold; }
                                            .details { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                                            .details td { padding: 8px; border: 1px solid #ddd; }
                                            .signature { margin-top: 50px; display: flex; justify-content: space-between; }
                                            .sig-box { border-top: 1px solid #333; width: 250px; text-align: center; padding-top: 10px; margin-top: 50px; }
                                          </style>
                                        </head>
                                        <body>
                                          <div class="header">
                                            <span class="mtn">${item.id}</span>
                                            <h2>OVID Construction Group</h2>
                                            <h4>Aluminum Formwork Logistics Division</h4>
                                          </div>
                                          <h3>MATERIAL TRANSFER NOTE (MTN)</h3>
                                          <table class="details">
                                            <tr><td><strong>Date:</strong></td><td>${item.date}</td><td><strong>Status:</strong></td><td>${item.status}</td></tr>
                                            <tr><td><strong>From Location:</strong></td><td>${item.fromLocation}</td><td><strong>To Location:</strong></td><td>${item.toLocation}</td></tr>
                                            <tr><td><strong>Driver Name:</strong></td><td>${item.driverName}</td><td><strong>Truck Plate:</strong></td><td>${item.truckPlate}</td></tr>
                                            <tr><td><strong>Panels Count:</strong></td><td>${item.panelsCount} pcs</td><td><strong>GPS Geofence:</strong></td><td>${item.gpsTracking}</td></tr>
                                          </table>
                                          <h4>DISPATCHED MATERIALS LIST</h4>
                                          <ul>
                                            ${item.panelsList ? item.panelsList.map((p: any) => `<li>${p.type} (${p.size}) - Qty: ${p.qty}</li>`).join('') : `<li>Wall Panel 1200x600 mm - Qty: 150</li>`}
                                          </ul>
                                          <div class="signature">
                                            <div class="sig-box">Warehouse Dispatcher Signature<br/><strong>${item.senderApproval}</strong></div>
                                            <div class="sig-box">Receiving Site Engineer Signature<br/><strong>${item.receiverApproval || "Pending"}</strong></div>
                                          </div>
                                          <p style="text-align:center; font-size:10px; margin-top:100px; color:#aaa;">OVID Construction ERP - Aluminum Formwork Logistics</p>
                                        </body>
                                      </html>
                                    `);
                                    printWindow.document.close();
                                    printWindow.print();
                                  }
                                }}
                                className="border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-[10px] px-2 py-1 rounded"
                              >
                                {t("Print Ticket", "티ኬት አትም")}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* === OVERSEAS SHIPMENTS & CUSTOMS === */}
            {activeSubTab === "shipments_customs" && (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                      <span className="p-1.5 bg-blue-100 text-blue-800 rounded-lg">
                        <Ship size={18} />
                      </span>
                      <span>{t("Overseas Shipments & Ethiopia Customs Control", "የባህር ማዶ ጭነት እና የኢትዮጵያ ጉምሩክ ቁጥጥር")}</span>
                    </h2>
                    <p className="text-slate-500 text-xs mt-1">
                      {t("Track factory production, ocean vessels, container BLs, Mojo Dry Port clearance, import duties, and transport dispatch.", "ከፋብሪካ ምርት እስከ የባህር ጉዞ፣ ኮንቴይነሮች፣ ሞጆ ደረቅ ወደብ፣ ጉምሩክ እና ማዕከላዊ 倉庫 የትራንስፖርት እንቅስቃሴን ይከታተሉ።")}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAddShipmentModal(true)}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-all"
                  >
                    <Plus size={16} />
                    <span>{t("Record New Overseas Shipment", "አዲስ የባህር ማዶ ጭነት መዝግብ")}</span>
                  </button>
                </div>

                {/* Overseas Shipment KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-2">
                    <span className="text-slate-500 text-[11px] font-medium">{t("Active Containers", "በጉዞ ላይ ያሉ ኮንቴይነሮች")}</span>
                    <div className="flex items-baseline space-x-2">
                      <span className="text-2xl font-bold text-slate-900">{shipments.length}</span>
                      <span className="text-xs text-blue-600 font-semibold">{t("Containers", "ኮንቴይነሮች")}</span>
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-2">
                    <span className="text-slate-500 text-[11px] font-medium">{t("In Ocean Transit", "በባህር ጉዞ ላይ")}</span>
                    <div className="flex items-baseline space-x-2">
                      <span className="text-2xl font-bold text-amber-600">
                        {shipments.filter(s => s.status === "On Vessel" || s.status === "At Port").length}
                      </span>
                      <span className="text-xs text-slate-500">{t("Shipments", "ጭነቶች")}</span>
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-2">
                    <span className="text-slate-500 text-[11px] font-medium">{t("At Mojo Customs", "ሞጆ ጉምሩክ የደረሰ")}</span>
                    <div className="flex items-baseline space-x-2">
                      <span className="text-2xl font-bold text-indigo-600">
                        {shipments.filter(s => s.status === "Customs").length}
                      </span>
                      <span className="text-xs text-slate-500">{t("Under Inspection", "በምርመራ ላይ")}</span>
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-2">
                    <span className="text-slate-500 text-[11px] font-medium">{t("Import Duties & Taxes", "የተከፈለ ጉምሩክና ታክስ")}</span>
                    <div className="flex items-baseline space-x-2">
                      <span className="text-2xl font-bold text-emerald-600">
                        {customsRecords.reduce((acc, c) => acc + (c.dutiesPaidEtb ?? c.taxesAndDutiesEtb ?? 0), 0).toLocaleString()} ETB
                      </span>
                    </div>
                  </div>
                </div>

                {/* Overseas Shipments Table */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden space-y-3 p-5">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                    <Globe size={16} className="text-blue-600" />
                    <span>{t("Overseas Formwork Shipments Log", "የባህር ማዶ የፎርምወርቅ ጭነቶች መዝገብ")}</span>
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 border-b border-slate-100">
                          <th className="p-3 font-semibold">{t("Container / BL", "ኮንቴይነር / ቢኤል")}</th>
                          <th className="p-3 font-semibold">{t("Shipping Line & Vessel", "የመላኪያ ድርጅትና መርከብ")}</th>
                          <th className="p-3 font-semibold">{t("Manufacturer & Origin", "አምራችና ሀገር")}</th>
                          <th className="p-3 font-semibold">{t("Route & Port", "መስመርና ወደብ")}</th>
                          <th className="p-3 font-semibold">{t("Expected Arrival", "የሚደርስበት ቀን")}</th>
                          <th className="p-3 font-semibold">{t("Panels Qty", "የፓነል ብዛት")}</th>
                          <th className="p-3 font-semibold">{t("Status", "ሁኔታ")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {shipments.map((ship) => (
                          <tr key={ship.id} className="hover:bg-slate-50">
                            <td className="p-3 font-mono font-bold text-slate-900">
                              <div>{ship.containerNumber}</div>
                              <span className="text-[10px] text-slate-400 font-normal">{ship.billOfLading}</span>
                            </td>
                            <td className="p-3">
                              <div className="font-semibold text-slate-800">{ship.shippingCompany}</div>
                              <span className="text-[10px] text-slate-400">{ship.vesselName}</span>
                            </td>
                            <td className="p-3">
                              <div>{ship.manufacturerName || "Lianxin Aluminum Ltd."}</div>
                              <span className="text-[10px] text-slate-500 font-medium">{ship.countryOfOrigin || "China"}</span>
                            </td>
                            <td className="p-3 text-[11px]">
                              <span>{ship.portOfLoading}</span> ➔ <strong className="text-slate-800">{ship.portOfEntry || ship.destinationPort}</strong>
                            </td>
                            <td className="p-3 font-mono">{ship.expectedArrivalDate}</td>
                            <td className="p-3 font-bold text-slate-900">{ship.panelsQuantity ?? ship.totalPanels ?? 0} pcs</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                ship.status === "Arrived Warehouse" ? "bg-emerald-50 text-emerald-600" :
                                ship.status === "Customs" ? "bg-indigo-50 text-indigo-600 animate-pulse" :
                                ship.status === "In Transit" ? "bg-blue-50 text-blue-600" : "bg-amber-50 text-amber-600"
                              }`}>
                                {ship.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Customs & Import Permits */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                    <ShieldCheck size={16} className="text-emerald-600" />
                    <span>{t("Customs Clearance & Tax Records (Mojo Dry Port)", "የጉምሩክ እና ታክስ ክፍያ መዝገቦች (ሞጆ ደረቅ ወደብ)")}</span>
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 border-b border-slate-100">
                          <th className="p-3 font-semibold">{t("Declaration Ref", "የዲክላራሲዮን ቁጥር")}</th>
                          <th className="p-3 font-semibold">{t("Import Permit", "የኢምፖርት ፈቃድ")}</th>
                          <th className="p-3 font-semibold">{t("Clearance Date", "የተለቀቀበት ቀን")}</th>
                          <th className="p-3 font-semibold">{t("Declared Value (ETB)", "የተመዘገበ ዋጋ")}</th>
                          <th className="p-3 font-semibold">{t("Duties & Tax Paid", "የተከፈለ ታክስ")}</th>
                          <th className="p-3 font-semibold">{t("Clearance Officer", "የጉምሩክ ኦፊሰር")}</th>
                          <th className="p-3 font-semibold">{t("Status", "ሁኔታ")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {customsRecords.map((c) => (
                          <tr key={c.id} className="hover:bg-slate-50">
                            <td className="p-3 font-mono font-bold text-slate-900">{c.customsReference || c.customsRefNumber}</td>
                            <td className="p-3 font-mono text-slate-600">{c.importPermitNumber}</td>
                            <td className="p-3 font-mono">{c.clearanceDate || c.customsClearanceDate}</td>
                            <td className="p-3 font-bold">{(c.declaredValueEtb ?? 2850000).toLocaleString()} ETB</td>
                            <td className="p-3 font-bold text-emerald-600">{(c.dutiesPaidEtb ?? c.taxesAndDutiesEtb ?? 0).toLocaleString()} ETB</td>
                            <td className="p-3">{c.clearedByOfficer || "Mojo Customs Inspector"}</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-600">
                                {c.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* === CLEANING & INSPECTION PIPELINE === */}
            {activeSubTab === "cleaning_inspection" && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                      <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
                        <Sparkles size={18} />
                      </span>
                      <span>{t("Formwork Cleaning, Refurbishment & Inspection Pipeline", "የፎርምወርቅ ማፅዳት፣ እድሳት እና የጥራት ምርመራ")}</span>
                    </h2>
                    <p className="text-slate-500 text-xs mt-1">
                      {t("5-Stage automated lifecycle pipeline: Dismantled ➔ Cleaning Yard ➔ Quality Inspection ➔ Minor Repair ➔ Quality Approval for Reuse.", "የ5-ደረጃ የፎርምወርቅ እድሳት፡ ከተነሳ በኋላ ➔ ማፅዳት ➔ ጥራት ምርመራ ➔ ጥገና ➔ ለቀጣይ ኮንክሪት ስራ ዝግጁ ማድረግ።")}
                    </p>
                  </div>

                  {/* 5-Stage Visual Stepper */}
                  <div className="grid grid-cols-5 gap-2 pt-2">
                    <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-center space-y-1">
                      <span className="text-[10px] font-bold uppercase text-slate-500">Step 1</span>
                      <p className="text-xs font-bold text-slate-800">{t("Dismantled Site", "የተነሱ ፓነሎች")}</p>
                      <span className="inline-block px-2 py-0.5 bg-slate-200 text-slate-800 font-bold text-[10px] rounded-full">
                        {panels.filter(p => p.status === PanelStatus.DISMANTLED).length} pcs
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-center space-y-1">
                      <span className="text-[10px] font-bold uppercase text-amber-600">Step 2</span>
                      <p className="text-xs font-bold text-amber-900">{t("Cleaning Area", "ማፅጃ ቦታ")}</p>
                      <span className="inline-block px-2 py-0.5 bg-amber-200 text-amber-900 font-bold text-[10px] rounded-full">
                        {panels.filter(p => p.status === PanelStatus.WAITING_CLEANING).length} pcs
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-center space-y-1">
                      <span className="text-[10px] font-bold uppercase text-blue-600">Step 3</span>
                      <p className="text-xs font-bold text-blue-900">{t("Inspection", "ምርመራ")}</p>
                      <span className="inline-block px-2 py-0.5 bg-blue-200 text-blue-900 font-bold text-[10px] rounded-full">
                        {panels.filter(p => p.status === PanelStatus.UNDER_INSPECTION).length} pcs
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-center space-y-1">
                      <span className="text-[10px] font-bold uppercase text-purple-600">Step 4</span>
                      <p className="text-xs font-bold text-purple-900">{t("Repair Work", "ጥገና")}</p>
                      <span className="inline-block px-2 py-0.5 bg-purple-200 text-purple-900 font-bold text-[10px] rounded-full">
                        {panels.filter(p => p.status === PanelStatus.UNDER_REPAIR).length} pcs
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-1">
                      <span className="text-[10px] font-bold uppercase text-emerald-600">Step 5</span>
                      <p className="text-xs font-bold text-emerald-900">{t("Ready for Reuse", "ለስራ ዝግጁ")}</p>
                      <span className="inline-block px-2 py-0.5 bg-emerald-200 text-emerald-900 font-bold text-[10px] rounded-full">
                        {panels.filter(p => p.status === PanelStatus.CLEANED || p.status === PanelStatus.ACTIVE).length} pcs
                      </span>
                    </div>
                  </div>
                </div>

                {/* Panels in Maintenance / Refurbishment */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center justify-between">
                    <span className="flex items-center space-x-2">
                      <Wrench size={16} className="text-amber-600" />
                      <span>{t("Active Refurbishment Pipeline Log", "በእድሳትና ማፅዳት ላይ ያሉ ፓነሎች መዝገብ")}</span>
                    </span>
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 border-b border-slate-100">
                          <th className="p-3 font-semibold">{t("Panel ID", "የፓነል መለያ")}</th>
                          <th className="p-3 font-semibold">{t("Type & Size", "ዓይነትና መጠን")}</th>
                          <th className="p-3 font-semibold">{t("Location Yard", "የሚገኝበት ቦታ")}</th>
                          <th className="p-3 font-semibold">{t("Concrete Pours", "የተሰራበት ዙር")}</th>
                          <th className="p-3 font-semibold">{t("Current Stage", "የአሁኑ ደረጃ")}</th>
                          <th className="p-3 font-semibold text-right">{t("Action", "ተግባር")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {panels.filter(p => p.status !== PanelStatus.ACTIVE).map((panel) => (
                          <tr key={panel.id} className="hover:bg-slate-50">
                            <td className="p-3 font-mono font-bold text-slate-900">{panel.id}</td>
                            <td className="p-3">
                              <span className="font-semibold">{panel.type}</span>
                              <span className="block text-[10px] text-slate-400">{panel.size}</span>
                            </td>
                            <td className="p-3">{panel.location}</td>
                            <td className="p-3 font-mono font-bold">{panel.usesCount} pours</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                panel.status === PanelStatus.CLEANED ? "bg-emerald-50 text-emerald-600" :
                                panel.status === PanelStatus.WAITING_CLEANING ? "bg-amber-50 text-amber-600" :
                                panel.status === PanelStatus.UNDER_INSPECTION ? "bg-blue-50 text-blue-600" :
                                panel.status === PanelStatus.UNDER_REPAIR ? "bg-purple-50 text-purple-600" : "bg-red-50 text-red-600"
                              }`}>
                                {panel.status}
                              </span>
                            </td>
                            <td className="p-3 text-right space-x-1.5">
                              <button
                                onClick={async () => {
                                  const updatedPanel = { ...panel, status: PanelStatus.CLEANED };
                                  await DbService.updateFormworkPanel(updatedPanel);
                                  await loadData();
                                  alert(`Panel ${panel.id} marked as CLEANED and APPROVED for next concrete casting!`);
                                }}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[10px]"
                              >
                                {t("Approve & Clean", "አፅዳና አጽድቅ")}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* === STOCK AUDIT & RECONCILIATION === */}
            {activeSubTab === "audit" && (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                      <span className="p-1.5 bg-purple-100 text-purple-800 rounded-lg">
                        <ClipboardCheck size={18} />
                      </span>
                      <span>{t("Warehouse & Site Physical Stock Audit Engine", "የመጋዘን እና የሳይት የአካል ቆጠራ እና ኦዲት ቁጥጥር")}</span>
                    </h2>
                    <p className="text-slate-500 text-xs mt-1">
                      {t("Reconcile digital system counts with physical warehouse scanning. Log discrepancies, variance ratios, and audit signatures.", "በዲጂታል ሲስተሙ ያለውን እና በአካል የተቆጠረውን የፓነል መጠን ያወዳድሩ። ልዩነቶችን እና የኦዲተር ፊርማዎችን ይመዝግቡ።")}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAuditModal(true)}
                    className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-all"
                  >
                    <Plus size={16} />
                    <span>{t("Perform New Physical Audit", "አዲስ አካላዊ ቆጠራ ኦዲት አድርግ")}</span>
                  </button>
                </div>

                {/* Audit KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-2">
                    <span className="text-slate-500 text-[11px] font-medium">{t("Reconciliation Rate", "የቆጠራ ስምምነት መጠን")}</span>
                    <div className="flex items-baseline space-x-2">
                      <span className="text-2xl font-bold text-emerald-600">98.4%</span>
                      <span className="text-xs text-slate-500">{t("Matched", "የተጣጣመ")}</span>
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-2">
                    <span className="text-slate-500 text-[11px] font-medium">{t("Total Audits Conducted", "የተደረጉ ኦዲቶች")}</span>
                    <div className="flex items-baseline space-x-2">
                      <span className="text-2xl font-bold text-slate-900">{inventoryAudits.length}</span>
                      <span className="text-xs text-slate-500">{t("Audits", "ኦዲቶች")}</span>
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-2">
                    <span className="text-slate-500 text-[11px] font-medium">{t("Discrepancy Panels", "ልዩነት የታየባቸው ፓነሎች")}</span>
                    <div className="flex items-baseline space-x-2">
                      <span className="text-2xl font-bold text-amber-600">
                        {inventoryAudits.reduce((acc, a) => acc + (a.discrepancyQty ?? a.discrepancyCount ?? 0), 0)} pcs
                      </span>
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-2">
                    <span className="text-slate-500 text-[11px] font-medium">{t("Audit Financial Exposure", "የኦዲት ልዩነት በገንዘብ")}</span>
                    <div className="flex items-baseline space-x-2">
                      <span className="text-2xl font-bold text-red-600">
                        {(inventoryAudits.reduce((acc, a) => acc + Math.abs(a.discrepancyQty ?? a.discrepancyCount ?? 0), 0) * 12500).toLocaleString()} ETB
                      </span>
                    </div>
                  </div>
                </div>

                {/* Audit History Log */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                    <ClipboardCheck size={16} className="text-purple-600" />
                    <span>{t("Physical Audit Reconciliation Logs", "የአካላዊ ቆጠራና ኦዲት ታሪክ መዝገብ")}</span>
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 border-b border-slate-100">
                          <th className="p-3 font-semibold">{t("Audit ID", "የኦዲት መለያ")}</th>
                          <th className="p-3 font-semibold">{t("Audit Date", "ቀን")}</th>
                          <th className="p-3 font-semibold">{t("Location / Warehouse", "ቦታ / መጋዘን")}</th>
                          <th className="p-3 font-semibold">{t("Physical Count", "በአካል የተቆጠረ")}</th>
                          <th className="p-3 font-semibold">{t("System Count", "በሲስተሙ ያለ")}</th>
                          <th className="p-3 font-semibold">{t("Variance %", "ልዩነት %")}</th>
                          <th className="p-3 font-semibold">{t("Auditor Name", "የኦዲተር ስም")}</th>
                          <th className="p-3 font-semibold">{t("Status", "ሁኔታ")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {inventoryAudits.map((a) => (
                          <tr key={a.id} className="hover:bg-slate-50">
                            <td className="p-3 font-mono font-bold text-slate-900">{a.id}</td>
                            <td className="p-3 font-mono">{a.auditDate}</td>
                            <td className="p-3 font-semibold">{a.location || a.warehouseOrSite}</td>
                            <td className="p-3 font-bold text-purple-700">{a.physicalCount} pcs</td>
                            <td className="p-3 font-bold text-slate-800">{a.systemCount} pcs</td>
                            <td className="p-3 font-bold">
                              <span className={a.variancePercentage === 0 ? "text-emerald-600" : "text-amber-600"}>
                                {a.variancePercentage > 0 ? `+${a.variancePercentage}%` : `${a.variancePercentage}%`}
                              </span>
                            </td>
                            <td className="p-3">
                              <div className="font-semibold">{a.auditorName}</div>
                              <span className="text-[10px] text-slate-400">{a.auditorRole}</span>
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                a.status === "Approved" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                              }`}>
                                {a.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* === EXPORT REPORTS === */}
            {activeSubTab === "reports" && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                        <span className="p-1.5 bg-slate-100 text-slate-800 rounded-lg">
                          <Layers size={16} />
                        </span>
                        <span>{t("Aluminum Formwork Reports & Export Center", "የአሉሚኒየም ፎርምወርቅ ሪፖርቶችና ኤክስፖርት ማዕከል")}</span>
                      </h2>
                      <p className="text-slate-500 text-xs mt-1">
                        {t("Generate premium, clean tabular audit reports, stock balances, maintenance logs, and asset valuations. Export instantly to PDF or Excel CSV.", "የክምችት ማጠቃለያዎችን፣ የጥገና ሪፖርቶችን እና የፓነሎች ዋጋ ግምገማዎችን ያውጡ። በቀላሉ ወደ PDF ወይም Excel ፋይል መለወጥ ይችላሉ።")}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/60">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{t("Select Report Type", "የሪፖርት አይነት ይምረጡ")}</label>
                      <select className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-700">
                        <option value="stock_balance">1. Warehouse Inventory Stock Balance</option>
                        <option value="transfers">2. Material Transfer Note (MTN) Ledger</option>
                        <option value="site_allocation">3. Site Asset Allocation Details</option>
                        <option value="damage_repair">4. Damage Defects & Maintenance Cost</option>
                        <option value="depreciation">5. Asset Valuation & Depreciation</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{t("Specific Yard/Site", "መጋዘን / ሳይት ይምረጡ")}</label>
                      <select className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-700">
                        <option value="all">All Locations (ጠቅላላ)</option>
                        <option value="Central Bole Warehouse">Central Bole Warehouse</option>
                        <option value="Saris Industrial Yard">Saris Industrial Yard</option>
                        <option value="Gotera Storage Depot">Gotera Storage Depot</option>
                        <option value="Digital Bole Heights">Digital Bole Heights</option>
                        <option value="Digital Saris Block B">Digital Saris Block B</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{t("Panel Status Filter", "የፓነል ሁኔታ")}</label>
                      <select className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-700">
                        <option value="all">All Conditions (ሁሉም)</option>
                        <option value="Active">Active / Standby</option>
                        <option value="In Use">In Use / Deployed</option>
                        <option value="Damaged">Damaged / Beyond Repair</option>
                        <option value="Under Repair">Under Repair</option>
                        <option value="Missing">Missing / Lost</option>
                      </select>
                    </div>
                    <div className="flex items-end space-x-2">
                      <button
                        onClick={() => {
                          const headers = "Panel ID,Serial Number,Bundle Number,Size,Type,Location,Zone,Status,Usage Count,Weight (kg)\n";
                          const rows = panels.map(p => `"${p.id}","${p.serialNumber}","${p.bundleNumber}","${p.size}","${p.type}","${p.location}","${p.zone}","${p.status}",${p.usageCount},${p.weight || 14.5}`).join("\n");
                          const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
                          const url = URL.createObjectURL(blob);
                          const link = document.createElement("a");
                          link.setAttribute("href", url);
                          link.setAttribute("download", `OVID_Formwork_Stock_Balance_${new Date().toISOString().slice(0,10)}.csv`);
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-3 rounded-lg transition-colors flex items-center justify-center space-x-1.5"
                      >
                        <Download size={13} />
                        <span>CSV Excel</span>
                      </button>
                      <button
                        onClick={() => {
                          window.print();
                        }}
                        className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2 px-3 rounded-lg transition-colors flex items-center justify-center space-x-1.5"
                      >
                        <FileText size={13} />
                        <span>PDF Print</span>
                      </button>
                    </div>
                  </div>

                  {/* Reports Preview Panel */}
                  <div className="border border-slate-150 rounded-xl overflow-hidden bg-white">
                    <div className="bg-slate-50 px-4 py-3 border-b border-slate-150 flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">{t("PREVIEW: Stock Balance & Financial Valuation", "ቅድመ-እይታ፡ የክምችት መጠን እና የሂሳብ ዋጋ ግምገማ")}</span>
                      <span className="text-[10px] text-slate-400">Generated on {new Date().toLocaleDateString()}</span>
                    </div>

                    <div className="p-4 overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs font-sans">
                        <thead>
                          <tr className="text-slate-400 border-b border-slate-200 uppercase text-[10px] font-bold">
                            <th className="pb-2.5">Location Name</th>
                            <th className="pb-2.5 text-center">Active (Standby)</th>
                            <th className="pb-2.5 text-center">In Use (Deployed)</th>
                            <th className="pb-2.5 text-center font-mono">Damaged / Repair</th>
                            <th className="pb-2.5 text-center">Missing</th>
                            <th className="pb-2.5 text-right">Total Count</th>
                            <th className="pb-2.5 text-right">Asset Value (ETB)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700 font-sans">
                          {["Central Bole Warehouse", "Saris Industrial Yard", "Gotera Storage Depot", "Digital Bole Heights", "Digital Saris Block B"].map((loc, i) => {
                            const pLoc = panels.filter(p => p.location === loc);
                            const active = pLoc.filter(p => p.status === "Active").length;
                            const inUse = pLoc.filter(p => p.status === "In Use").length;
                            const damaged = pLoc.filter(p => p.status === "Damaged" || p.status === "Under Repair").length;
                            const missing = pLoc.filter(p => p.status === "Missing").length;
                            const total = pLoc.length;
                            const value = total * 12500; // Average cost 12500 ETB per panel
                            return (
                              <tr key={i} className="hover:bg-slate-50/50">
                                <td className="py-2.5 font-semibold text-slate-800">{loc}</td>
                                <td className="py-2.5 text-center font-mono">{active}</td>
                                <td className="py-2.5 text-center font-mono">{inUse}</td>
                                <td className="py-2.5 text-center font-mono text-red-600">{damaged}</td>
                                <td className="py-2.5 text-center font-mono text-amber-600">{missing}</td>
                                <td className="py-2.5 text-right font-mono font-bold text-slate-900">{total} pcs</td>
                                <td className="py-2.5 text-right font-mono font-bold text-emerald-600">{(value).toLocaleString()} ETB</td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="bg-slate-50 font-bold text-slate-900 border-t border-slate-200">
                            <td className="p-2.5">Total Assets System-wide</td>
                            <td className="p-2.5 text-center font-mono">{panels.filter(p => p.status === "Active").length}</td>
                            <td className="p-2.5 text-center font-mono">{panels.filter(p => p.status === "In Use").length}</td>
                            <td className="p-2.5 text-center font-mono text-red-600">{panels.filter(p => p.status === "Damaged" || p.status === "Under Repair").length}</td>
                            <td className="p-2.5 text-center font-mono text-amber-600">{panels.filter(p => p.status === "Missing").length}</td>
                            <td className="p-2.5 text-right font-mono">{panels.length} pcs</td>
                            <td className="p-2.5 text-right font-mono text-emerald-700">{(panels.length * 12500).toLocaleString()} ETB</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      )}

      {/* ========================================================================= */}
      {/* ======================= SYSTEM DIALOG MODALS ============================ */}
      {/* ========================================================================= */}

      {/* --- ADD NEW WAREHOUSE YARD MODAL --- */}
      {showAddWarehouseModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-100"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Layers className="text-indigo-600" size={18} />
                <span>{t("Add New Warehouse / Yard Registry", "አዲስ የዕቃ ማከማቻ መጋዘን መመዝገቢያ")}</span>
              </h3>
              <button
                onClick={() => setShowAddWarehouseModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                {t("Close", "ዝጋ")}
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const newWh = {
                  name: newWhName,
                  code: newWhCode || `WH-${newWhName.substring(0,3).toUpperCase()}-${Math.floor(10 + Math.random() * 90)}`,
                  location: newWhLoc,
                  gps: newWhGps,
                  manager: newWhManager,
                  capacity: Number(newWhCapacity) || 5000,
                  minStock: Number(newWhMinStock) || 500,
                  maxStock: Number(newWhMaxStock) || 4500,
                  currentStock: 0
                };
                setWarehouses([...warehouses, newWh]);
                setShowAddWarehouseModal(false);
                setNewWhName("");
                setNewWhCode("");
                setNewWhLoc("");
                setNewWhManager("");
                alert(`Warehouse "${newWhName}" registered successfully! You can now dispatch and assign formwork panels to this yard.`);
              }}
              className="space-y-4 text-xs font-medium text-slate-700"
            >
              <div>
                <label className="block font-semibold mb-1">{t("Warehouse Yard Name", "የመጋዘኑ ስም")}</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Gotera Storage Depot"
                  value={newWhName}
                  onChange={e => setNewWhName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">{t("Warehouse Code", "የመጋዘን መለያ ኮድ")}</label>
                  <input
                    type="text"
                    placeholder="e.g. WH-GOTERA-03"
                    value={newWhCode}
                    onChange={e => setNewWhCode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 outline-none uppercase"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">{t("Yard Manager Name", "የመጋዘኑ ኃላፊ ስም")}</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mulugeta Tesfaye"
                    value={newWhManager}
                    onChange={e => setNewWhManager(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">{t("Physical Location Address", "የመጋዘኑ አድራሻ")}</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kirkos Subcity, Addis Ababa"
                  value={newWhLoc}
                  onChange={e => setNewWhLoc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold mb-1">{t("Max Capacity", "አቅም (ብዛት)")}</label>
                  <input
                    type="number"
                    required
                    value={newWhCapacity}
                    onChange={e => setNewWhCapacity(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">{t("Min (Reorder)", "አነስተኛ (ማንቂያ)")}</label>
                  <input
                    type="number"
                    required
                    value={newWhMinStock}
                    onChange={e => setNewWhMinStock(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">{t("Max Limit", "ከፍተኛ ክምችት")}</label>
                  <input
                    type="number"
                    required
                    value={newWhMaxStock}
                    onChange={e => setNewWhMaxStock(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 outline-none"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-xs font-bold transition-colors"
                >
                  {t("Save & Register Warehouse", "መጋዘኑን ይመዝግቡ")}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* --- CREATE NEW TRANSFER MODAL --- */}
      {showCreateTransferModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-100"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Layers className="text-indigo-600" size={18} />
                <span>{t("Initiate New Material Transfer (MTN)", "አዲስ የፓነሎች ዝውውር መመዝገቢያ (MTN)")}</span>
              </h3>
              <button
                onClick={() => setShowCreateTransferModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                {t("Close", "ዝጋ")}
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const mtnId = `MTN-2026-${Math.floor(100000 + Math.random() * 900000)}`;
                const newTransfer = {
                  id: mtnId,
                  date: new Date().toISOString().slice(0, 10),
                  fromLocation: transferFrom,
                  toLocation: transferTo,
                  status: "Pending",
                  driverName: transferDriver || "Mohammed Seid",
                  truckPlate: transferTruck || "AA-3-B99011",
                  senderApproval: currentUserName || "Warehouse Dispatcher",
                  receiverApproval: "",
                  signature: transferSignature || "OVID Dispatcher",
                  gpsTracking: "9.0210° N, 38.7495° E",
                  panelsCount: 120,
                  panelsList: [
                    { type: "Wall Panel", size: "1200x600 mm", qty: 80 },
                    { type: "Slab Panel", size: "1200x600 mm", qty: 40 },
                  ]
                };
                setTransfers([newTransfer, ...transfers]);
                setShowCreateTransferModal(false);
                setTransferDriver("");
                setTransferTruck("");
                setTransferSignature("");
                alert(`New Transfer ${mtnId} created successfully in Pending status! Click 'Dispatch' on the list to approve transfer.`);
              }}
              className="space-y-4 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t("Sender Source Yard", "መነሻ መጋዘን/ሳይት")}</label>
                  <select
                    value={transferFrom}
                    onChange={e => setTransferFrom(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 outline-none text-xs"
                  >
                    <option value="Central Bole Warehouse">Central Bole Warehouse</option>
                    <option value="Saris Industrial Yard">Saris Industrial Yard</option>
                    <option value="Gotera Storage Depot">Gotera Storage Depot</option>
                    <option value="Digital Bole Heights">Digital Bole Heights</option>
                    <option value="Digital Saris Block B">Digital Saris Block B</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t("Receiver Destination Location", "መድረሻ መጋዘን/ሳይት")}</label>
                  <select
                    value={transferTo}
                    onChange={e => setTransferTo(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 outline-none text-xs"
                  >
                    <option value="Digital Bole Heights">Digital Bole Heights</option>
                    <option value="Digital Saris Block B">Digital Saris Block B</option>
                    <option value="Central Bole Warehouse">Central Bole Warehouse</option>
                    <option value="Saris Industrial Yard">Saris Industrial Yard</option>
                    <option value="Gotera Storage Depot">Gotera Storage Depot</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t("Driver Full Name", "የአሽከርካሪው ሙሉ ስም")}</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kassa Tekle"
                    value={transferDriver}
                    onChange={e => setTransferDriver(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 outline-none text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t("Truck Plate Number", "የጭነት መኪናው ሰሌዳ ቁጥር")}</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. AA-3-B44502"
                    value={transferTruck}
                    onChange={e => setTransferTruck(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 outline-none text-xs font-mono uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">{t("List of Assets to Transfer & Quantities", "የሚዛወሩ ዕቃዎች ዝርዝርና ብዛት")}</label>
                <textarea
                  rows={3}
                  value={transferPanelsText}
                  onChange={e => setTransferPanelsText(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 outline-none text-xs font-mono"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">{t("Sender Authorized Digital Signature", "የላኪው ፈቃድ ዲጂታል ፊርማ")}</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Abebe K."
                  value={transferSignature}
                  onChange={e => setTransferSignature(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 outline-none text-xs font-serif italic text-indigo-700"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-xs font-bold transition-colors"
                >
                  {t("Generate Pending Transfer Ticket (MTN)", "አዲስ የዝውውር ቲኬት ፍጠር (MTN)")}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ======================= SYSTEM DIALOG MODALS ============================ */}
      {/* ========================================================================= */}

      {/* --- ADD NEW PANEL MODAL --- */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-100"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Layers className="text-red-600" size={18} />
                <span>{t("Register Aluminum Panel Asset", "አዲስ የአሉሚኒየም ፓነል መመዝገቢያ")}</span>
              </h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                {t("Close", "ዝጋ")}
              </button>
            </div>

            <form onSubmit={handleRegisterPanel} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">{t("Panel Serial Number", "የፓነል ሲሪያል ቁጥር (ለምሳሌ SN-AL-901)")}</label>
                <input
                  type="text"
                  required
                  placeholder="SN-AL-XXXXXX"
                  value={newPanelSerial}
                  onChange={e => setNewPanelSerial(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 outline-none text-xs uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t("Bundle Number", "ጥቅል ቁጥር")}</label>
                  <input
                    type="text"
                    placeholder="BDL-XX"
                    value={newPanelBundle}
                    onChange={e => setNewPanelBundle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 outline-none text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t("Quantity", "የፓነል ብዛት")}</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={newPanelQuantity}
                    onChange={e => setNewPanelQuantity(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 outline-none text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t("Panel Type", "የፓነል አይነት")}</label>
                  <select
                    value={newPanelType}
                    onChange={e => setNewPanelType(e.target.value as PanelType)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 outline-none text-xs"
                  >
                    {Object.values(PanelType).map((t, i) => (
                      <option key={i} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t("Dimensions / Size", "የፓነል መጠን")}</label>
                  <select
                    value={newPanelSize}
                    onChange={e => setNewPanelSize(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 outline-none text-xs"
                  >
                    <option value="1200x600 mm">1200x600 mm</option>
                    <option value="1200x450 mm">1200x450 mm</option>
                    <option value="2400x600 mm">2400x600 mm</option>
                    <option value="900x400 mm">900x400 mm</option>
                    <option value="200x200 mm">200x200 mm (Corner)</option>
                    <option value="Custom Curved">Custom Curved</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t("Project Location", "ያለበት ፕሮጀክት")}</label>
                  <select
                    value={newPanelLocation}
                    onChange={e => setNewPanelLocation(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 outline-none text-xs"
                  >
                    <option value="Digital Bole Heights">Digital Bole Heights</option>
                    <option value="Digital Saris Block B">Digital Saris Block B</option>
                    <option value="Central Warehouse">Central Warehouse</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t("Floor Zone Layout", "ፎቅ እና ዞን")}</label>
                  <input
                    type="text"
                    required
                    value={newPanelZone}
                    onChange={e => setNewPanelZone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 outline-none text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">{t("Initial Asset Status", "የመጀመሪያ የፓነል ሁኔታ")}</label>
                <select
                  value={newPanelStatus}
                  onChange={e => setNewPanelStatus(e.target.value as PanelStatus)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 outline-none text-xs"
                >
                  <option value={PanelStatus.ACTIVE}>{t("Active (Standby)", "ንቁ (ዝግጁ)")}</option>
                  <option value={PanelStatus.IN_USE}>{t("In Use (Deployed)", "በስራ ላይ ያለ")}</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t("Weight (kg)", "ክብደት (ኪ.ግ)")}</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={newPanelWeight}
                    onChange={e => setNewPanelWeight(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 outline-none text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t("Floor Number", "የፎቅ ቁጥር")}</label>
                  <input
                    type="number"
                    required
                    value={newPanelFloor}
                    onChange={e => setNewPanelFloor(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 outline-none text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t("Building Block", "ህንፃ / ብሎክ")}</label>
                  <input
                    type="text"
                    required
                    value={newPanelBuilding}
                    onChange={e => setNewPanelBuilding(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 outline-none text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">{t("Photo Reference URL", "የፎቶ ማስፈንጠሪያ")}</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={newPanelPhoto}
                  onChange={e => setNewPanelPhoto(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 outline-none text-xs"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl text-xs font-bold transition-colors"
                >
                  {t("Save Register", "መዝግብ")}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* --- RELOCATE/ASSIGN MOVEMENT MODAL --- */}
      {showMoveModal && selectedPanelForMove && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-100"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <MapPin className="text-red-600" size={18} />
                <span>{t(`Transfer & Move Asset: ${selectedPanelForMove.id}`, `የፓነል ዝውውር መመዝገቢያ፡ ${selectedPanelForMove.id}`)}</span>
              </h3>
              <button 
                onClick={() => {
                  setShowMoveModal(false);
                  setSelectedPanelForMove(null);
                }}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                {t("Close", "ዝጋ")}
              </button>
            </div>

            <form onSubmit={handleMovePanel} className="space-y-4 text-xs">
              
              {/* Origin indicators */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-400 block">{t("Current Site Location:", "የአሁኑ የስራ ቦታ፡")}</span>
                  <strong className="text-slate-800 text-[11px]">{selectedPanelForMove.location}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">{t("Current Floor Zone:", "የአሁኑ ዞን፡")}</span>
                  <strong className="text-slate-800 text-[11px]">{selectedPanelForMove.zone}</strong>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">{t("Destination Project Location", "የሚዛወርበት ፕሮጀክት ቦታ")}</label>
                <select
                  value={moveDestination}
                  onChange={e => setMoveDestination(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 outline-none text-xs"
                >
                  <option value="Digital Bole Heights">Digital Bole Heights</option>
                  <option value="Digital Saris Block B">Digital Saris Block B</option>
                  <option value="Central Warehouse">Central Warehouse</option>
                  <option value="Maintenance / Welding Scrap Yard">Maintenance / Welding Scrap Yard</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">{t("Destination Floor Layout Zone", "የሚዛወርበት ፎቅ እና ዞን")}</label>
                <input
                  type="text"
                  required
                  value={moveZone}
                  onChange={e => setMoveZone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 outline-none text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">{t("Relocation Dispatch Notes", "የዝውውር ታሪክ ማስታወሻዎች")}</label>
                <textarea
                  rows={2}
                  placeholder={t("Enter specific cycle layout plan, scaffolding notes...", "ስለ ፓነል ዝውውሩ ማስታወሻ ያስገቡ...")}
                  value={moveNotes}
                  onChange={e => setMoveNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 outline-none text-xs"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-xl text-xs font-bold transition-colors"
                >
                  {t("Execute & Dispatched Log", "ዝውውሩን ያረጋግጡና ይመዝግቡ")}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* --- REPORT DAMAGE MODAL --- */}
      {showDamageModal && (selectedPanelForDamage || isDirectDamageMode) && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-100"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <AlertTriangle className="text-red-600" size={18} />
                <span>
                  {isDirectDamageMode 
                    ? t("Report Panel Damage (Direct Log)", "የአሉሚኒየም ፎርምወርክ ፓነል ብልሽት መዝገብ") 
                    : t(`Report Panel Damage Defect: ${selectedPanelForDamage?.id}`, `የፓነል ብልሽት ሪፖርት ማድረጊያ፡ ${selectedPanelForDamage?.id}`)}
                </span>
              </h3>
              <button 
                onClick={() => {
                  setShowDamageModal(false);
                  setSelectedPanelForDamage(null);
                  setIsDirectDamageMode(false);
                  setDirectDamagePanelId("");
                }}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                {t("Close", "ዝጋ")}
              </button>
            </div>

            <form onSubmit={handleReportDamage} className="space-y-4 text-xs">
              
              {isDirectDamageMode && (
                <div className="space-y-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">{t("Select Existing Panel", "የፓነል መለያ ቁጥር ይምረጡ")}</label>
                    <select
                      value={directDamagePanelId}
                      onChange={e => setDirectDamagePanelId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 outline-none text-xs"
                    >
                      <option value="">{t("-- Select Existing Panel ID --", "-- የፓነል መለያ ይምረጡ --")}</option>
                      {panels.map((p, idx) => (
                        <option key={idx} value={p.id}>
                          {p.id} - {p.type} ({p.size}) [{p.status}]
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">{t("Or Enter Custom/New Panel ID", "ወይም አዲስ የፓነል መለያ ቁጥር እዚህ ይፃፉ")}</label>
                    <input
                      type="text"
                      placeholder="e.g. OVID-PANEL-999"
                      value={directDamagePanelId}
                      onChange={e => setDirectDamagePanelId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 outline-none text-xs font-mono"
                      required
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">{t("Damage Severity", "የጉዳቱ አሳሳቢነት ደረጃ")}</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["Low", "Medium", "High"] as const).map((sev, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setDamageSeverity(sev)}
                      className={`py-2 rounded-lg text-xs font-bold transition-all border ${
                        damageSeverity === sev 
                          ? "bg-red-600 border-red-600 text-white shadow-sm" 
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">{t("Defect Description", "የጉዳቱ/ብልሽቱ ዝርዝር መግለጫ")}</label>
                <textarea
                  rows={3}
                  required
                  placeholder={t("Dented surface, bent joints flange, weld separation details...", "የተጣመመ፣ የተሰበረ፣ የቀለም መላጥ ወይም ሌሎች ዝርዝሮችን እዚህ ይግለጹ...")}
                  value={damageDescription}
                  onChange={e => setDamageDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 outline-none text-xs"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl text-xs font-bold transition-colors"
                >
                  {t("File Damage Snag Report", "የጉዳት ሪፖርቱን አስገባ")}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* --- LOG REPAIR RECORD MODAL --- */}
      {showRepairModal && selectedDamageReportForRepair && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-100"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Wrench className="text-red-600" size={18} />
                <span>{t(`Register Successful Repair: ${selectedDamageReportForRepair.panelId}`, `የተጠናቀቀ የጥገና መዝገብ ማስገቢያ፡ ${selectedDamageReportForRepair.panelId}`)}</span>
              </h3>
              <button 
                onClick={() => {
                  setShowRepairModal(false);
                  setSelectedDamageReportForRepair(null);
                }}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                {t("Close", "ዝጋ")}
              </button>
            </div>

            <form onSubmit={handleRegisterRepair} className="space-y-4 text-xs">
              
              <div className="bg-red-50 p-3 rounded-lg border border-red-100">
                <span className="text-[10px] text-red-500 block font-bold">{t("Reported Fault Details:", "ሪፖርት የተደረገው ብልሽት፡")}</span>
                <p className="text-slate-800 text-[11px] mt-0.5">{selectedDamageReportForRepair.description}</p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">{t("Welding / Repair Technician", "የጥገና ባለሙያ / አውደ ጥናት")}</label>
                <input
                  type="text"
                  required
                  placeholder={t("Mulugeta Welding Works / Site Workshop", "የጥገና ባለሙያ ስም ወይም ድርጅት ያስገቡ")}
                  value={repairTechnician}
                  onChange={e => setRepairTechnician(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 outline-none text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">{t("Repair cost (ETB)", "የጥገና ወጪ (በኢትዮጵያ ብር)")}</label>
                <input
                  type="number"
                  required
                  min={0}
                  value={repairCost}
                  onChange={e => setRepairCost(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 outline-none text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">{t("Completed Work Details", "የተከናወኑ ስራዎች ዝርዝር")}</label>
                <textarea
                  rows={2}
                  required
                  placeholder={t("Re-welded bent flanges and pressed surface to standard level...", "የተከናወነውን የጥገና ዝርዝር እዚህ ይግለጹ...")}
                  value={repairDetails}
                  onChange={e => setRepairDetails(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 outline-none text-xs"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-xl text-xs font-bold transition-colors"
                >
                  {t("Log Successful Repair", "የጥገና መዝገቡን አስገባ")}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* --- QR BARCODE LABEL PREVIEW MODAL --- */}
      {showQRLabelModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl border border-slate-100"
          >
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <QrCode className="text-red-600" size={16} />
                <span>{t("Asset QR Barcode Identification Tag", "የፓነል የኪውአር ባርኮድ መለያ ታግ")}</span>
              </h3>
              <button 
                onClick={() => setShowQRLabelModal(null)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                {t("Close", "ዝጋ")}
              </button>
            </div>

            {/* Simulated Printed Tag layout */}
            <div className="bg-white p-5 rounded-xl border-2 border-slate-850 space-y-4 shadow-inner text-slate-900 font-sans">
              
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-red-600 font-bold block">Digital Construction ERP GROUP</span>
                  <span className="text-[8px] font-semibold text-slate-500 block">ALUMINUM FORMWORK LOGISTICS</span>
                </div>
                <QrCode size={40} className="text-slate-900" />
              </div>

              <div className="space-y-1">
                <h4 className="text-lg font-mono font-bold tracking-tight text-slate-950">{showQRLabelModal.id}</h4>
                <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-600">
                  <div>
                    <span className="text-slate-400">{t("Serial Code", "ሲሪያል ኮድ")}</span>
                    <strong className="block font-mono text-slate-800">{showQRLabelModal.serialNumber}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">{t("Bundle Code", "ጥቅል ኮድ")}</span>
                    <strong className="block font-mono text-slate-800">{showQRLabelModal.bundleNumber}</strong>
                  </div>
                </div>
              </div>

              {/* Barcode bars block */}
              <div className="space-y-1 pt-1.5 border-t border-slate-200">
                <div className="h-8 bg-slate-950 flex space-x-0.5 p-1 rounded items-stretch">
                  <span className="w-1 bg-white inline-block"></span>
                  <span className="w-0.5 bg-white inline-block"></span>
                  <span className="w-1.5 bg-white inline-block"></span>
                  <span className="w-1.5 bg-white inline-block"></span>
                  <span className="w-0.5 bg-white inline-block"></span>
                  <span className="w-2 bg-white inline-block"></span>
                  <span className="w-1 bg-white inline-block"></span>
                  <span className="w-1.5 bg-white inline-block"></span>
                  <span className="w-0.5 bg-white inline-block"></span>
                  <span className="w-1 bg-white inline-block"></span>
                  <span className="w-1.5 bg-white inline-block"></span>
                </div>
                <p className="text-[9px] font-mono text-center text-slate-500">*{showQRLabelModal.serialNumber}*</p>
              </div>

              <div className="text-[9px] text-slate-400 flex justify-between">
                <span>{t("Size:", "መጠን፡")} <strong>{showQRLabelModal.size}</strong></span>
                <span>Type: <strong>{showQRLabelModal.type}</strong></span>
              </div>
            </div>

            {/* Download/Print simulator actions */}
            <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
              <button
                onClick={() => alert(t("Label file sent to printer system queue", "የመለያ ታጉ ወደ ማተሚያ ማሽን ተልኳል"))}
                className="py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center justify-center space-x-1.5"
              >
                <Download size={14} />
                <span>{t("Send to Print", "አትም")}</span>
              </button>

              <button
                onClick={() => setShowQRLabelModal(null)}
                className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
              >
                {t("Dismiss Label", "ተመለስ")}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* --- ADD NEW OVERSEAS SHIPMENT MODAL --- */}
      {showAddShipmentModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-100"
          >
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Ship className="text-blue-600" size={18} />
                <span>{t("Record Overseas Formwork Shipment", "አዲስ የባህር ማዶ ጭነት መመዝገቢያ")}</span>
              </h3>
              <button 
                onClick={() => setShowAddShipmentModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                {t("Close", "ዝጋ")}
              </button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              const newShipment: OverseasShipment = {
                id: `SHIP-${Date.now().toString().slice(-6)}`,
                manufacturerName: "Guangdong Lianxin Aluminum Formwork Co.",
                countryOfOrigin: "China",
                factoryName: "Foshan Production Facility Line 3",
                manufacturingBatch: `BATCH-2026-${Math.floor(Math.random()*900+100)}`,
                shippingCompany: "Maersk Logistics",
                vesselName: "MV Lion Star v.204",
                containerNumber: `MSKU-${Math.floor(Math.random()*9000000+1000000)}`,
                billOfLading: `BL-MKS-${Math.floor(Math.random()*90000+10000)}`,
                portOfLoading: "Ningbo-Zhoushan Port, China",
                portOfEntry: "Mojo Dry Port, Ethiopia",
                expectedArrivalDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
                panelsQuantity: 450,
                status: "In Transit"
              };
              await DbService.addOverseasShipment(newShipment);
              await loadData();
              setShowAddShipmentModal(false);
              alert(`Overseas Container ${newShipment.containerNumber} registered in logistics tracking!`);
            }} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">{t("Shipping Company", "የመላኪያ ኩባንያ")}</label>
                <input type="text" defaultValue="Maersk Logistics" required className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t("Vessel Name", "የመርከብ ስም")}</label>
                  <input type="text" defaultValue="MV Lion Star v.204" required className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t("Container No.", "ኮንቴይነር ቁጥር")}</label>
                  <input type="text" defaultValue="MSKU-9982310" required className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none font-mono" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t("Bill of Lading (BL)", "ቢኤል ቁጥር")}</label>
                  <input type="text" defaultValue="BL-MKS-88231" required className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none font-mono" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t("Port of Entry", "መግቢያ ደረቅ ወደብ")}</label>
                  <input type="text" defaultValue="Mojo Dry Port, Ethiopia" required className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none" />
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl shadow-sm transition-all"
              >
                {t("Save Overseas Shipment", "ጭነቱን መዝግብ")}
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* --- PHYSICAL STOCK AUDIT MODAL --- */}
      {showAuditModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-100"
          >
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <ClipboardCheck className="text-purple-600" size={18} />
                <span>{t("Perform Physical Stock Audit", "አካላዊ የክምችት ቆጠራ እና ኦዲት")}</span>
              </h3>
              <button 
                onClick={() => setShowAuditModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                {t("Close", "ዝጋ")}
              </button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              const newAudit: InventoryAuditRecord = {
                id: `AUD-${Date.now().toString().slice(-6)}`,
                auditDate: new Date().toISOString().split('T')[0],
                location: "Central Addis Ababa Warehouse",
                physicalCount: 1250,
                systemCount: 1240,
                varianceQty: 10,
                variancePercentage: 0.8,
                discrepancyQty: 10,
                auditorName: currentUserName || "Warehouse Auditor",
                auditorRole: "Lead Stock Auditor",
                notes: "Physical count verified against QR barcode batch scans. Minor 0.8% variance.",
                status: "Approved"
              };
              await DbService.addInventoryAudit(newAudit);
              await loadData();
              setShowAuditModal(false);
              alert(`Physical Stock Audit ${newAudit.id} saved & reconciled!`);
            }} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">{t("Audit Location / Warehouse", "የኦዲት ቦታ / መጋዘን")}</label>
                <select className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none font-semibold">
                  <option>Central Addis Ababa Warehouse</option>
                  <option>Bole Logistics Hub Yard</option>
                  <option>Akaki Storage Yard</option>
                  <option>Digital Bole Heights Site Yard</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t("Physical Counted (pcs)", "በአካል የተቆጠረ")}</label>
                  <input type="number" defaultValue={1250} required className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none font-bold text-purple-700" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t("System Balance (pcs)", "በሲስተም ያለው")}</label>
                  <input type="number" defaultValue={1240} disabled className="w-full bg-slate-100 border border-slate-200 rounded-lg p-2.5 font-bold text-slate-600" />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">{t("Auditor Name & Signature", "የኦዲተር ስም እና ፊርማ")}</label>
                <input type="text" defaultValue={currentUserName || "Lead Stock Auditor"} required className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none font-medium" />
              </div>
              <button
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 rounded-xl shadow-sm transition-all"
              >
                {t("Submit Reconciled Audit Log", "የተጣጣመ ኦዲት መዝግብ")}
              </button>
            </form>
          </motion.div>
        </div>
      )}

    </div>
  );
};
