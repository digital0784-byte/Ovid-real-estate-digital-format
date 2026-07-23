import React, { useState, useMemo, useEffect } from "react";
import { DbService } from "../services/db";
import { ProjectZone, AluminumFormworkPanel, UserRole, RegisteredSite } from "../types";
import {
  Store,
  Package,
  QrCode,
  Scan,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  RotateCcw,
  Wrench,
  Search,
  Plus,
  ArrowRightLeft,
  Truck,
  MapPin,
  FileText,
  Printer,
  Download,
  Building2,
  Layers,
  Cpu,
  Bell,
  Clock,
  ShieldCheck,
  Shield,
  Send,
  UserCheck,
  Users,
  BarChart3,
  RefreshCw,
  Box,
  ClipboardList,
  Flame,
  Key,
  Database,
  Camera,
  Eye,
  PenTool,
  Check,
  X,
  Sparkles,
  PieChart as PieIcon,
  Sliders,
  Radio,
  FileSpreadsheet,
  Calendar,
  Navigation,
  Phone,
  Activity,
  Compass
} from "lucide-react";

// --- INTERFACES ---
export interface TruckFleetItem {
  id: string;
  truckPlate: string;
  driverName: string;
  driverPhone: string;
  cargoType: string;
  cargoQty: string;
  origin: string;
  destination: string;
  status: "En Route" | "At Gate" | "Loading" | "Delivered" | "Maintenance";
  speedKmH: number;
  eta: string;
  departureTime: string;
  routeProgress: number; // 0 to 100
  gpsCoordinates: string;
  gatePassId: string;
}

export interface InterSiteTransferVoucher {
  id: string;
  voucherNo: string;
  sourceSite: string;
  destinationSite: string;
  materialName: string;
  quantity: number;
  unit: string;
  driverName: string;
  truckPlate: string;
  transferDate: string;
  status: "In Transit" | "Dispatched" | "Verified & Received" | "Pending Approval";
  approvedBy: string;
  notes?: string;
}

export interface SupplierDeliverySchedule {
  id: string;
  poNumber: string;
  supplierName: string;
  materialName: string;
  quantity: number;
  unit: string;
  expectedArrival: string;
  deliveryBay: string;
  contactPerson: string;
  phone: string;
  status: "Scheduled" | "En Route" | "Arrived Gate" | "Inspected & Received" | "Delayed";
  gatePassCode: string;
}

export interface StoreMaterialItem {
  id: string;
  category: "Cement" | "Rebar" | "Aluminum Panels" | "Beams" | "Props" | "Brackets" | "Plywood" | "Tools" | "Consumables" | "Spare Parts";
  name: string;
  code: string;
  dimensions: string;
  unit: string;
  totalStock: number;
  availableStock: number;
  reservedStock: number;
  minThreshold: number;
  warehouseLocation: string;
  status: "In Stock" | "Low Stock" | "Out of Stock" | "Reserved";
}

export interface MaterialReceivingReport {
  id: string;
  materialName: string;
  materialType: string;
  dimensions: string;
  quantity: number;
  unit: string;
  source: "Warehouse" | "Supplier" | "Other Construction Site";
  batchNumber: string;
  bundleNumber: string;
  serialNumber: string;
  qrCode: string;
  deliveryDate: string;
  driverName: string;
  truckPlate: string;
  gpsLocation: string;
  receivedBy: string;
  signatureSigned: boolean;
  photoUploaded: boolean;
}

export interface MaterialIssueRecord {
  id: string;
  receiverName: string;
  receiverRole: string;
  department: string;
  siteName: string;
  building: string;
  floor: string;
  zone: string;
  materialName: string;
  quantity: number;
  unit: string;
  issueDate: string;
  qrScanned: boolean;
  gpsLocation: string;
  signatureSigned: boolean;
}

export interface MaterialReturnRecord {
  id: string;
  materialName: string;
  quantity: number;
  returnedBy: string;
  condition: "Good Condition" | "Needs Cleaning" | "Needs Inspection" | "Needs Repair" | "Damaged" | "Scrap";
  returnDate: string;
  notes: string;
}

export interface MaterialRequestItem {
  id: string;
  requesterName: string;
  requesterRole: string;
  siteName: string;
  building: string;
  floor: string;
  zone: string;
  materialName: string;
  requestedQty: number;
  unit: string;
  purpose: string;
  status: "Pending" | "Approved" | "Rejected" | "Issued";
  requestDate: string;
}

export interface StoreAuditRecord {
  id: string;
  auditType: "Daily Count" | "Weekly Count" | "Monthly Count";
  itemName: string;
  physicalCount: number;
  systemCount: number;
  discrepancy: number;
  auditorName: string;
  auditDate: string;
  status: "Balanced" | "Discrepancy Detected" | "Resolved";
}

export interface SitePanelBreakdown {
  id: string;
  siteName: string;
  panelType: string;
  dimensions: string;
  totalAllocated: number;
  installedCount: number;
  inStoreCount: number;
  damagedCount: number;
  inTransitCount: number;
  missingCount: number;
  conditionScore: number;
  lastReportDate: string;
  lastReporter: string;
}

export interface DailyMaterialRequisition {
  id: string;
  date: string;
  requestedAt: string;
  projectName: string;
  siteName: string;
  buildingNumber: string;
  blockNumber: string;
  floorNumber: string;
  zoneNumber: string;
  requestedBy: string;
  employeeId: string;
  jobPosition: "Assembler" | "Gang Chief" | "Team Leader" | "Supervisor" | "Section Head";
  submissionMode: "Mobile App" | "Tablet" | "Desktop" | "Paper Form (Manual Entry)";
  materialName: string;
  materialType: "Formwork Accessory" | "Aluminum Panel" | "Consumable" | "Concrete / Block";
  materialSize: string;
  unit: string;
  quantityRequested: number;
  quantityIssued: number;
  purposeOfUse: string;
  workType: "Wall" | "Slab" | "Beam" | "Column";
  priority: "Normal" | "Urgent" | "Emergency";
  expectedReturnDate: string;
  status: "Draft" | "Pending Approval" | "Approved" | "Partially Approved" | "Issued" | "Rejected";
  approvedBy: string;
  issuedBy: string;
  stockAvailability: "In Stock" | "Low Stock" | "Out of Stock";
  qrScanVerified: boolean;
  receiverSignature: string;
  gpsLocation: string;
  pinsQty: number;
  wedgesQty: number;
  tieRodsQty: number;
  conduitsQty: number;
  blocksQty: number;
  floorItemsQty: number;
  notes: string;
}

export interface DailyConsumptionVariance {
  id: string;
  requisitionId: string;
  date: string;
  siteName: string;
  blockNumber: string;
  floorNumber: string;
  materialName: string;
  jobPosition: string;
  requestedBy: string;
  quantityRequested: number;
  quantityIssued: number;
  quantityUsed: number;
  quantityReturned: number;
  quantityLost: number;
  quantityDamaged: number;
  quantityRemaining: number;
  varianceQty: number;
  variancePercent: number;
  varianceStatus: "Balanced (0% Loss)" | "Acceptable Tolerance" | "High Loss Variance" | "Audit Required";
  reportedBy: string;
  verifiedByStorekeeper: boolean;
}

export interface ApprovalRuleLimit {
  jobPosition: "Assembler" | "Gang Chief" | "Team Leader" | "Supervisor" | "Section Head";
  amharicTitle: string;
  maxQtyWithoutApproval: number;
  requiresHigherApproval: boolean;
  approverRoleRequired: string;
  allowedPriorities: string[];
}

export interface RequisitionAuditLog {
  id: string;
  requisitionId: string;
  action: string;
  performedBy: string;
  jobPosition: string;
  timestamp: string;
  gpsLocation: string;
  digitalSignature: string;
  details: string;
  ledgerDelta: string;
}

export interface DailyReturnReport {
  id: string;
  requisitionId: string;
  date: string;
  siteName: string;
  blockNumber: string;
  floorNumber: string;
  gangChiefName: string;
  siteStoreOwnerName: string;
  status: "Pending Return" | "Fully Returned" | "With Loss" | "With Damage";
  pinsReturned: number;
  pinsLost: number;
  pinsDamaged: number;
  wedgesReturned: number;
  wedgesLost: number;
  wedgesDamaged: number;
  tieRodsReturned: number;
  tieRodsLost: number;
  tieRodsDamaged: number;
  conduitsReturned: number;
  conduitsLost: number;
  conduitsDamaged: number;
  damageDescription: string;
  photoUploaded: boolean;
  photoEvidence?: boolean;
  photoUrl?: string;
  gangChiefSigned: boolean;
  storeOwnerSigned: boolean;
  returnedAt: string;
}

export interface DailyConsolidatedReport {
  id: string;
  date: string;
  siteName: string;
  projectName: string;
  siteStoreOwner: string;
  totalRequisitions: number;
  totalReturns: number;
  totalItemsIssued: number;
  totalItemsReturned: number;
  totalItemsLost: number;
  totalItemsDamaged: number;
  totalLossValueETB: number;
  totalDamageValueETB: number;
  sentToWarehouseAt: string;
  sentToHeadOfficeAt: string;
  syncStatus: "Auto-Synced to HQ & Warehouse" | "Sync Pending";
  materialSummaries: Array<{
    materialName: string;
    openingStock: number;
    received: number;
    issued: number;
    returned: number;
    lost: number;
    damaged: number;
    closingStock: number;
    unit: string;
  }>;
  blockSummaries: Array<{
    blockNumber: string;
    pinsIssued: number;
    pinsLost: number;
    wedgesIssued: number;
    wedgesLost: number;
    tieRodsIssued: number;
    tieRodsLost: number;
    blocksUsed: number;
  }>;
}

interface StoreOwnerAppProps {
  isAmharic: boolean;
  currentUserRole?: UserRole;
  onLogAction?: (action: string, details: string) => void;
  initialMode?: "warehouse_manager" | "store_owner";
}

export const StoreOwnerApp: React.FC<StoreOwnerAppProps> = ({
  isAmharic,
  currentUserRole = UserRole.STORE_MANAGER,
  onLogAction,
  initialMode = "warehouse_manager"
}) => {
  // App Mode State: "warehouse_manager" vs "store_owner"
  const [appMode, setAppMode] = useState<"warehouse_manager" | "store_owner">(initialMode);

  useEffect(() => {
    if (initialMode) {
      setAppMode(initialMode);
    }
  }, [initialMode]);

  // Navigation State across Master Modules
  const [activeTab, setActiveTab] = useState<
    | "warehouse-dashboard"
    | "dashboard"
    | "receiving"
    | "issue"
    | "returns"
    | "formwork-tracking"
    | "site-panel-breakdown"
    | "morning-requisitions"
    | "evening-returns"
    | "daily-auto-reports"
    | "inventory"
    | "audit"
    | "requests"
    | "qr-barcode"
    | "notifications"
    | "reports"
    | "ai-analytics"
    | "role-access"
    | "integrations"
  >("warehouse-dashboard");

  const lang = isAmharic ? "am" : "en";

  // Language Dictionary
  const dict: Record<string, Record<string, string>> = {
    en: {
      title: appMode === "warehouse_manager" 
        ? "BuildSync ERP – Warehouse Manager App" 
        : "BuildSync ERP – Site Store Owner App",
      subtitle: appMode === "warehouse_manager" 
        ? "Central Warehouse Hub, Truck Dispatching, Supplier Intake & Multi-Site Fleet Logistics" 
        : "Dedicated Construction Materials & Formwork Site Store Management System",
      totalMaterials: "Total Material Stock",
      formworkPanels: "Aluminum Formwork Panels",
      availableStock: "Available Stock",
      reservedStock: "Reserved Stock",
      incomingMaterials: "Incoming Materials",
      outgoingMaterials: "Outgoing Materials",
      returnedMaterials: "Returned Materials",
      damagedMaterials: "Damaged Materials",
      missingMaterials: "Missing Materials",
      cleaningQueue: "Cleaning Queue",
      repairQueue: "Repair Queue",
      dailyRequests: "Daily Material Requests",
      dailyIssues: "Daily Material Issues",
      lowStockAlerts: "Low Stock Alerts",
      aiStockForecast: "AI Stock Forecast"
    },
    am: {
      title: appMode === "warehouse_manager"
        ? "BuildSync ERP – የመጋዘን አስተዳዳሪ መተግበሪያ (Warehouse Manager App)"
        : "BuildSync ERP – የሳይት ስቶር አቃቤ መተግበሪያ (Site Store Owner App)",
      subtitle: appMode === "warehouse_manager"
        ? "የማዕከላዊ መጋዘን፣ የጭነት መኪኖች መላኪያ፣ የአቅራቢዎች ደረሰኝ እና የእቃዎች ስርጭት መቆጣጠሪያ ማዕከል"
        : "የግንባታ እቃዎች እና የአሉሚኒየም ፎርምወርክ ስቶር አስተዳደር እና ቁጥጥር ስርዓት",
      totalMaterials: "ጠቅላላ የእቃዎች ክምችት",
      formworkPanels: "የአሉሚኒየም ፎርምወርክ ፓነሎች",
      availableStock: "ዝግጁ የሆነ ክምችት",
      reservedStock: "የተያዘ (Reserved) ክምችት",
      incomingMaterials: "የሚገቡ እቃዎች",
      outgoingMaterials: "የሚወጡ እቃዎች",
      returnedMaterials: "የተመለሱ እቃዎች",
      damagedMaterials: "የተጎዱ እቃዎች",
      missingMaterials: "የጠፉ እቃዎች",
      cleaningQueue: "ጽዳት የሚጠብቁ",
      repairQueue: "ጥገና የሚጠብቁ",
      dailyRequests: "የእለት የእቃዎች ጥያቄ",
      dailyIssues: "የእለት የተሰጡ እቃዎች",
      lowStockAlerts: "የክምችት ማነስ ማስጠንቀቂያ",
      aiStockForecast: "AI የክምችት ትንበያ"
    }
  };

  const t = (key: string): string => dict[lang][key] || key;

  // DB-linked panels & sites state
  const [dbPanels, setDbPanels] = useState<AluminumFormworkPanel[]>([]);
  const [registeredSitesList, setRegisteredSitesList] = useState<RegisteredSite[]>([]);
  const [loadingDb, setLoadingDb] = useState(true);

  const fetchSites = async () => {
    try {
      const sites = await DbService.getRegisteredSites();
      if (sites) setRegisteredSitesList(sites);
    } catch (err) {
      console.error("Failed to fetch registered sites:", err);
    }
  };

  useEffect(() => {
    let active = true;
    const loadStoreData = async () => {
      try {
        setLoadingDb(true);
        const [panels, sites] = await Promise.all([
          DbService.getFormworkPanels(),
          DbService.getRegisteredSites()
        ]);
        if (active) {
          setDbPanels(panels || []);
          if (sites) setRegisteredSitesList(sites);
          setLoadingDb(false);
        }
      } catch (err) {
        console.error("Failed to fetch store database:", err);
        if (active) setLoadingDb(false);
      }
    };
    loadStoreData();

    const handleSync = () => {
      fetchSites();
    };
    window.addEventListener("sites_updated", handleSync);
    window.addEventListener("storage", handleSync);

    return () => { 
      active = false; 
      window.removeEventListener("sites_updated", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  // MASTER INVENTORY DATA (10 Categories)
  const [storeItems, setStoreItems] = useState<StoreMaterialItem[]>([
    { id: "MAT-001", category: "Cement", name: "Dangote OPC 42.5N Cement", code: "CEM-OPC-50", dimensions: "50kg Bag", unit: "Bags", totalStock: 1200, availableStock: 1050, reservedStock: 150, minThreshold: 300, warehouseLocation: "Store Shed A1", status: "In Stock" },
    { id: "MAT-002", category: "Rebar", name: "High Tensile Deformed Steel Bar 16mm", code: "ST-REB-16", dimensions: "12m Length", unit: "Pcs", totalStock: 850, availableStock: 780, reservedStock: 70, minThreshold: 200, warehouseLocation: "Yard Bay 3", status: "In Stock" },
    { id: "MAT-003", category: "Aluminum Panels", name: "Standard Wall Panel 1200x600", code: "AL-PNL-1260", dimensions: "1200mm x 600mm", unit: "Pcs", totalStock: 450, availableStock: 390, reservedStock: 60, minThreshold: 100, warehouseLocation: "Formwork Rack B1", status: "In Stock" },
    { id: "MAT-004", category: "Beams", name: "H20 Timber Formwork Beam", code: "BM-H20-29", dimensions: "2.9m Length", unit: "Pcs", totalStock: 320, availableStock: 280, reservedStock: 40, minThreshold: 80, warehouseLocation: "Store Shed B2", status: "In Stock" },
    { id: "MAT-005", category: "Props", name: "Heavy Duty Adjustable Steel Prop 3.5m", code: "PRP-STL-35", dimensions: "2.0m - 3.5m", unit: "Pcs", totalStock: 600, availableStock: 520, reservedStock: 80, minThreshold: 150, warehouseLocation: "Yard Bay 1", status: "In Stock" },
    { id: "MAT-006", category: "Brackets", name: "K-Plate & Wall Tie Assembly", code: "BRK-KPL-01", dimensions: "Standard", unit: "Sets", totalStock: 2500, availableStock: 2100, reservedStock: 400, minThreshold: 500, warehouseLocation: "Bins C1-C4", status: "In Stock" },
    { id: "MAT-007", category: "Plywood", name: "Film Faced Shuttering Plywood 18mm", code: "PLY-FLM-18", dimensions: "2440x1220mm", unit: "Sheets", totalStock: 180, availableStock: 45, reservedStock: 135, minThreshold: 60, warehouseLocation: "Store Shed A2", status: "Low Stock" },
    { id: "MAT-008", category: "Tools", name: "Bosch Heavy Rotary Hammer Drill", code: "TL-DRILL-02", dimensions: "1100W SDS-Plus", unit: "Units", totalStock: 14, availableStock: 12, reservedStock: 2, minThreshold: 5, warehouseLocation: "Tool Vault 1", status: "In Stock" },
    { id: "MAT-009", category: "Consumables", name: "Formwork Release Oil / Mould Agent", code: "CNS-OIL-200", dimensions: "200L Drum", unit: "Drums", totalStock: 8, availableStock: 2, reservedStock: 6, minThreshold: 3, warehouseLocation: "Chemical Shed", status: "Low Stock" },
    { id: "MAT-010", category: "Spare Parts", name: "Panel Alignment Pin & Wedge Sets", code: "SPR-PIN-WDG", dimensions: "Box of 200", unit: "Boxes", totalStock: 45, availableStock: 38, reservedStock: 7, minThreshold: 10, warehouseLocation: "Bins D1", status: "In Stock" }
  ]);

  // MATERIAL RECEIVING REPORTS
  const [receivingReports, setReceivingReports] = useState<MaterialReceivingReport[]>([
    {
      id: "REC-2026-101",
      materialName: "Standard Wall Panel 1200x600",
      materialType: "Aluminum Formwork",
      dimensions: "1200x600mm",
      quantity: 120,
      unit: "Pcs",
      source: "Warehouse",
      batchNumber: "BATCH-2026-AL08",
      bundleNumber: "BNDL-402",
      serialNumber: "SN-AL-8890-8910",
      qrCode: "QR-REC-101-AL",
      deliveryDate: "2026-07-20 09:30",
      driverName: "Getachew Zewde",
      truckPlate: "ET-3-89021",
      gpsLocation: "9.0102° N, 38.7612° E (Bole Site Store)",
      receivedBy: "Abebe Storekeeper",
      signatureSigned: true,
      photoUploaded: true
    },
    {
      id: "REC-2026-102",
      materialName: "Dangote OPC 42.5N Cement",
      materialType: "Cement",
      dimensions: "50kg Bags",
      quantity: 400,
      unit: "Bags",
      source: "Supplier",
      batchNumber: "CEM-DANG-092",
      bundleNumber: "PALLET-12",
      serialNumber: "N/A",
      qrCode: "QR-REC-102-CEM",
      deliveryDate: "2026-07-21 08:15",
      driverName: "Teshome Bikila",
      truckPlate: "ET-3-44102",
      gpsLocation: "9.0102° N, 38.7612° E",
      receivedBy: "Abebe Storekeeper",
      signatureSigned: true,
      photoUploaded: true
    }
  ]);

  // MATERIAL ISSUE RECORDS
  const [issueRecords, setIssueRecords] = useState<MaterialIssueRecord[]>([
    {
      id: "ISS-2026-301",
      receiverName: "Alemayehu Kebede",
      receiverRole: "Section Head",
      department: "Structural Civil Team",
      siteName: "Bole Heights Phase I",
      building: "Building A",
      floor: "Floor 4",
      zone: "Zone 2",
      materialName: "K-Plate & Wall Tie Assembly",
      quantity: 350,
      unit: "Sets",
      issueDate: "2026-07-21 10:00",
      qrScanned: true,
      gpsLocation: "9.0105° N, 38.7615° E",
      signatureSigned: true
    },
    {
      id: "ISS-2026-302",
      receiverName: "Fikru Tolossa",
      receiverRole: "Gang Chief",
      department: "Formwork Gang B",
      siteName: "Bole Heights Phase I",
      building: "Building A",
      floor: "Floor 4",
      zone: "Zone 1",
      materialName: "Heavy Duty Adjustable Steel Prop 3.5m",
      quantity: 80,
      unit: "Pcs",
      issueDate: "2026-07-21 11:20",
      qrScanned: true,
      gpsLocation: "9.0105° N, 38.7615° E",
      signatureSigned: true
    }
  ]);

  // MATERIAL RETURN RECORDS
  const [returnRecords, setReturnRecords] = useState<MaterialReturnRecord[]>([
    {
      id: "RET-2026-05",
      materialName: "Standard Wall Panel 1200x600",
      quantity: 24,
      returnedBy: "Kassa Hunegn (Supervisor)",
      condition: "Needs Cleaning",
      returnDate: "2026-07-20 16:45",
      notes: "Concrete slurry residue on face. Sent to cleaning station."
    },
    {
      id: "RET-2026-06",
      materialName: "Heavy Duty Adjustable Steel Prop 3.5m",
      quantity: 4,
      returnedBy: "Yohannes Bekele (Team Leader)",
      condition: "Needs Repair",
      returnDate: "2026-07-21 09:10",
      notes: "Pin thread bent during stripping. Maintenance scheduled."
    }
  ]);

  // MATERIAL REQUEST WORKFLOW
  const [materialRequests, setMaterialRequests] = useState<MaterialRequestItem[]>([
    {
      id: "REQ-2026-88",
      requesterName: "Sintayehu Alula",
      requesterRole: "Site Engineer",
      siteName: "Bole Heights Phase I",
      building: "Building B",
      floor: "Floor 2",
      zone: "Zone 1",
      materialName: "Film Faced Shuttering Plywood 18mm",
      requestedQty: 30,
      unit: "Sheets",
      purpose: "Beam side shuttering for high span slab",
      status: "Pending",
      requestDate: "2026-07-21 08:30"
    },
    {
      id: "REQ-2026-89",
      requesterName: "Fikru Tolossa",
      requesterRole: "Gang Chief",
      siteName: "Bole Heights Phase I",
      building: "Building A",
      floor: "Floor 5",
      zone: "Zone 1",
      materialName: "Panel Alignment Pin & Wedge Sets",
      requestedQty: 5,
      unit: "Boxes",
      purpose: "Wall formwork locking hardware",
      status: "Approved",
      requestDate: "2026-07-21 09:15"
    }
  ]);

  // STORE AUDIT RECORDS
  const [auditRecords, setAuditRecords] = useState<StoreAuditRecord[]>([
    {
      id: "AUD-2026-01",
      auditType: "Daily Count",
      itemName: "Dangote OPC 42.5N Cement",
      physicalCount: 1200,
      systemCount: 1200,
      discrepancy: 0,
      auditorName: "Internal Auditor Girma",
      auditDate: "2026-07-21 07:00",
      status: "Balanced"
    },
    {
      id: "AUD-2026-02",
      auditType: "Weekly Count",
      itemName: "K-Plate & Wall Tie Assembly",
      physicalCount: 2480,
      systemCount: 2500,
      discrepancy: -20,
      auditorName: "Store Manager Abebe",
      auditDate: "2026-07-20 18:00",
      status: "Discrepancy Detected"
    }
  ]);

  // WAREHOUSE MANAGER DASHBOARD STATES
  const [truckFleets, setTruckFleets] = useState<TruckFleetItem[]>([
    {
      id: "TRK-101",
      truckPlate: "ET-3-11029",
      driverName: "Mulugeta Tadesse",
      driverPhone: "+251-911-203940",
      cargoType: "Dangote OPC Cement & Steel Props",
      cargoQty: "500 Bags + 50 Props",
      origin: "Central Warehouse Yard 01",
      destination: "Bole Heights Phase 1 Site Store",
      status: "En Route",
      speedKmH: 42,
      eta: "14:30 (In 15 Mins)",
      departureTime: "13:10",
      routeProgress: 75,
      gpsCoordinates: "9.0211° N, 38.7502° E",
      gatePassId: "GP-882-ET11029"
    },
    {
      id: "TRK-102",
      truckPlate: "ET-3-89021",
      driverName: "Getachew Zewde",
      driverPhone: "+251-912-883019",
      cargoType: "Aluminum Wall Panels (1200x600)",
      cargoQty: "120 Pcs",
      origin: "Central Warehouse Yard 01",
      destination: "Saris Project Site Store",
      status: "At Gate",
      speedKmH: 0,
      eta: "Arrived at Gate",
      departureTime: "12:30",
      routeProgress: 100,
      gpsCoordinates: "8.9890° N, 38.7420° E",
      gatePassId: "GP-883-ET89021"
    },
    {
      id: "TRK-103",
      truckPlate: "ET-3-44102",
      driverName: "Teshome Bikila",
      driverPhone: "+251-913-445012",
      cargoType: "Deformed Steel Rebar 16mm",
      cargoQty: "40 Tons",
      origin: "Akaki Steel Yard Depot",
      destination: "Central Warehouse Yard 01",
      status: "En Route",
      speedKmH: 55,
      eta: "15:00 (In 35 Mins)",
      departureTime: "13:45",
      routeProgress: 45,
      gpsCoordinates: "8.9500° N, 38.7900° E",
      gatePassId: "GP-884-ET44102"
    },
    {
      id: "TRK-104",
      truckPlate: "ET-3-99201",
      driverName: "Kifle Worku",
      driverPhone: "+251-914-771102",
      cargoType: "Film Faced Shuttering Plywood 18mm",
      cargoQty: "300 Sheets",
      origin: "Central Warehouse Yard 01",
      destination: "Mercato Tower Project Site",
      status: "Loading",
      speedKmH: 0,
      eta: "Departing 14:45",
      departureTime: "14:45",
      routeProgress: 10,
      gpsCoordinates: "9.0300° N, 38.7400° E",
      gatePassId: "GP-885-ET99201"
    }
  ]);

  const [supplierSchedules, setSupplierSchedules] = useState<SupplierDeliverySchedule[]>([
    {
      id: "SUP-2026-401",
      poNumber: "PO-2026-8801",
      supplierName: "Meso Metal & Aluminum Mfg PLC",
      materialName: "Aluminum Formwork Accessories (Pins & Wedges)",
      quantity: 5000,
      unit: "Sets",
      expectedArrival: "Today 15:30",
      deliveryBay: "Central Yard Bay B",
      contactPerson: "Ato Tadesse",
      phone: "+251-911-334455",
      status: "En Route",
      gatePassCode: "GP-SUP-401"
    },
    {
      id: "SUP-2026-402",
      poNumber: "PO-2026-8802",
      supplierName: "Derba MIDROC Cement PLC",
      materialName: "OPC 42.5N Cement Bags",
      quantity: 600,
      unit: "Bags",
      expectedArrival: "Today 16:30",
      deliveryBay: "Central Yard Bay A",
      contactPerson: "Ato Yonas",
      phone: "+251-912-556677",
      status: "Scheduled",
      gatePassCode: "GP-SUP-402"
    }
  ]);

  const [interSiteTransfers, setInterSiteTransfers] = useState<InterSiteTransferVoucher[]>([
    {
      id: "TRF-2026-001",
      voucherNo: "TRF-VO-9901",
      sourceSite: "Central Warehouse Yard",
      destinationSite: "Bole Heights Site Store",
      materialName: "H20 Timber Formwork Beams 2.9m",
      quantity: 320,
      unit: "Pcs",
      driverName: "Mulugeta Tadesse",
      truckPlate: "ET-3-11029",
      transferDate: "2026-07-21 13:10",
      status: "In Transit",
      approvedBy: "Eng. Dawit Tesfaye (Warehouse Mgr)",
      notes: "High priority slab casting transfer"
    },
    {
      id: "TRF-2026-002",
      voucherNo: "TRF-VO-9902",
      sourceSite: "Central Warehouse Yard",
      destinationSite: "Saris Project Site Store",
      materialName: "Aluminum Wall Panels 1200x600",
      quantity: 120,
      unit: "Pcs",
      driverName: "Getachew Zewde",
      truckPlate: "ET-3-89021",
      transferDate: "2026-07-21 12:30",
      status: "Dispatched",
      approvedBy: "Eng. Dawit Tesfaye (Warehouse Mgr)",
      notes: "Core wall shuttering package"
    },
    {
      id: "TRF-2026-003",
      voucherNo: "TRF-VO-9903",
      sourceSite: "Saris Project Site Store",
      destinationSite: "Mercato Project Site Store",
      materialName: "Adjustable Heavy Duty Steel Props 3.5m",
      quantity: 150,
      unit: "Pcs",
      driverName: "Hailemariam Assefa",
      truckPlate: "ET-3-33201",
      transferDate: "2026-07-21 10:15",
      status: "Verified & Received",
      approvedBy: "Eng. Solomon Tadesse (Project Mgr)",
      notes: "Inter-site redistribution verified at gate"
    },
    {
      id: "TRF-2026-004",
      voucherNo: "TRF-VO-9904",
      sourceSite: "Central Warehouse Yard",
      destinationSite: "Kazanchis Commercial Hub",
      materialName: "K-Plate & Wall Tie Assembly Sets",
      quantity: 500,
      unit: "Sets",
      driverName: "Tewodros Kassaye",
      truckPlate: "ET-3-77402",
      transferDate: "2026-07-21 14:00",
      status: "Pending Approval",
      approvedBy: "Pending HQ Verification"
    }
  ]);

  // CROSS-SITE FORMWORK PANEL & ACCESSORIES BREAKDOWN STATE
  const [sitePanelBreakdowns, setSitePanelBreakdowns] = useState<SitePanelBreakdown[]>([
    {
      id: "SPB-001",
      siteName: "Bole Heights Phase I",
      panelType: "Standard Wall Panel 1200x600",
      dimensions: "1200mm x 600mm",
      totalAllocated: 450,
      installedCount: 320,
      inStoreCount: 110,
      damagedCount: 12,
      inTransitCount: 0,
      missingCount: 8,
      conditionScore: 95.5,
      lastReportDate: "2026-07-22 08:30",
      lastReporter: "Alemayehu Kebede (Section Head)"
    },
    {
      id: "SPB-002",
      siteName: "Bole Heights Phase I",
      panelType: "Column Panel 1200x400",
      dimensions: "1200mm x 400mm",
      totalAllocated: 280,
      installedCount: 210,
      inStoreCount: 62,
      damagedCount: 5,
      inTransitCount: 0,
      missingCount: 3,
      conditionScore: 96.8,
      lastReportDate: "2026-07-22 08:30",
      lastReporter: "Fikru Tolossa (Gang Chief)"
    },
    {
      id: "SPB-003",
      siteName: "Kazanchis Financial Tower",
      panelType: "Standard Wall Panel 1200x600",
      dimensions: "1200mm x 600mm",
      totalAllocated: 600,
      installedCount: 480,
      inStoreCount: 95,
      damagedCount: 15,
      inTransitCount: 0,
      missingCount: 10,
      conditionScore: 94.2,
      lastReportDate: "2026-07-22 09:15",
      lastReporter: "Kassa Hunegn (Supervisor)"
    },
    {
      id: "SPB-004",
      siteName: "Kazanchis Financial Tower",
      panelType: "Deck Panel 1200x600",
      dimensions: "1200mm x 600mm",
      totalAllocated: 520,
      installedCount: 400,
      inStoreCount: 100,
      damagedCount: 12,
      inTransitCount: 0,
      missingCount: 8,
      conditionScore: 95.0,
      lastReportDate: "2026-07-22 09:15",
      lastReporter: "Yohannes Bekele (Team Leader)"
    },
    {
      id: "SPB-005",
      siteName: "Gotera Interchange Project",
      panelType: "Standard Wall Panel 1200x600",
      dimensions: "1200mm x 600mm",
      totalAllocated: 380,
      installedCount: 260,
      inStoreCount: 90,
      damagedCount: 18,
      inTransitCount: 10,
      missingCount: 2,
      conditionScore: 92.8,
      lastReportDate: "2026-07-21 17:00",
      lastReporter: "Birhanu Tesfa (Gang Chief)"
    },
    {
      id: "SPB-006",
      siteName: "CMC Residential Complex",
      panelType: "Inner Corner Profile 1200x150",
      dimensions: "1200mm x 150mm",
      totalAllocated: 200,
      installedCount: 150,
      inStoreCount: 42,
      damagedCount: 6,
      inTransitCount: 0,
      missingCount: 2,
      conditionScore: 96.0,
      lastReportDate: "2026-07-21 16:45",
      lastReporter: "Chala Bekele (Gang Chief)"
    },
    {
      id: "SPB-007",
      siteName: "Kilinto Industrial Zone",
      panelType: "Alignment Pin & Wedge Sets",
      dimensions: "16mm Heavy Duty",
      totalAllocated: 1500,
      installedCount: 1100,
      inStoreCount: 320,
      damagedCount: 45,
      inTransitCount: 0,
      missingCount: 35,
      conditionScore: 91.5,
      lastReportDate: "2026-07-21 18:00",
      lastReporter: "Abebe Kebede (Site Store Owner)"
    }
  ]);

  const [sitePanelFilterSite, setSitePanelFilterSite] = useState<string>("ALL");
  const [sitePanelFilterType, setSitePanelFilterType] = useState<string>("ALL");

  // CONFIGURABLE APPROVAL RULE LIMITS (By Role / Position)
  const [approvalRuleLimits] = useState<ApprovalRuleLimit[]>([
    {
      jobPosition: "Assembler",
      amharicTitle: "አገጣጣሚ (Assembler)",
      maxQtyWithoutApproval: 50,
      requiresHigherApproval: true,
      approverRoleRequired: "Gang Chief / Team Leader",
      allowedPriorities: ["Normal"]
    },
    {
      jobPosition: "Gang Chief",
      amharicTitle: "የቡድን መሪ (Gang Chief)",
      maxQtyWithoutApproval: 200,
      requiresHigherApproval: true,
      approverRoleRequired: "Team Leader / Supervisor",
      allowedPriorities: ["Normal", "Urgent"]
    },
    {
      jobPosition: "Team Leader",
      amharicTitle: "የቡድን አስተባባሪ (Team Leader)",
      maxQtyWithoutApproval: 500,
      requiresHigherApproval: true,
      approverRoleRequired: "Supervisor / Section Head",
      allowedPriorities: ["Normal", "Urgent", "Emergency"]
    },
    {
      jobPosition: "Supervisor",
      amharicTitle: "ሱፐርቫይዘር (Supervisor)",
      maxQtyWithoutApproval: 1500,
      requiresHigherApproval: false,
      approverRoleRequired: "Section Head / Storekeeper Direct",
      allowedPriorities: ["Normal", "Urgent", "Emergency"]
    },
    {
      jobPosition: "Section Head",
      amharicTitle: "የክፍል ኃላፊ (Section Head)",
      maxQtyWithoutApproval: 5000,
      requiresHigherApproval: false,
      approverRoleRequired: "Direct Store Issue",
      allowedPriorities: ["Normal", "Urgent", "Emergency"]
    }
  ]);

  // DAILY MATERIAL REQUISITION STATE (Morning Requisitions)
  const [dailyRequisitions, setDailyRequisitions] = useState<DailyMaterialRequisition[]>([
    {
      id: "REQ-20260722-001",
      date: "2026-07-22",
      requestedAt: "06:15 AM",
      projectName: "Bole Heights Commercial Tower",
      siteName: "Bole Heights Phase I",
      buildingNumber: "Bldg 01",
      blockNumber: "Block A",
      floorNumber: "Floor 4",
      zoneNumber: "Zone 2",
      requestedBy: "Fikru Tolossa",
      employeeId: "EMP-4091",
      jobPosition: "Gang Chief",
      submissionMode: "Mobile App",
      materialName: "Aluminum Formwork Pin & Wedge Set (16mm)",
      materialType: "Formwork Accessory",
      materialSize: "16mm Heavy Duty",
      unit: "Sets",
      quantityRequested: 400,
      quantityIssued: 400,
      purposeOfUse: "Wall formwork assembly for Zone 2 shear wall concrete pour",
      workType: "Wall",
      priority: "Normal",
      expectedReturnDate: "2026-07-23",
      status: "Approved",
      approvedBy: "Eng. Kassa Hunegn (Supervisor)",
      issuedBy: "Abebe Storekeeper",
      stockAvailability: "In Stock",
      qrScanVerified: true,
      receiverSignature: "Signed (Fikru Tolossa - Fingerprint Auth)",
      gpsLocation: "8.9806° N, 38.7578° E",
      pinsQty: 150,
      wedgesQty: 250,
      tieRodsQty: 80,
      conduitsQty: 40,
      blocksQty: 0,
      floorItemsQty: 30,
      notes: "High priority wall formwork erection for Zone 2 concrete pouring"
    },
    {
      id: "REQ-20260722-002",
      date: "2026-07-22",
      requestedAt: "06:45 AM",
      projectName: "Kazanchis Financial Tower",
      siteName: "Kazanchis Financial Tower",
      buildingNumber: "Tower 01",
      blockNumber: "Block 1",
      floorNumber: "Floor 8",
      zoneNumber: "Zone 1",
      requestedBy: "Tiruneh Girma",
      employeeId: "EMP-5102",
      jobPosition: "Team Leader",
      submissionMode: "Tablet",
      materialName: "High Strength Tie Rods 1200mm & Waterstop Nuts",
      materialType: "Formwork Accessory",
      materialSize: "1200mm x 16mm",
      unit: "Pcs",
      quantityRequested: 250,
      quantityIssued: 0,
      purposeOfUse: "Slab formwork decking & prop bracing for heavy beam casting",
      workType: "Slab",
      priority: "Urgent",
      expectedReturnDate: "2026-07-24",
      status: "Pending Approval",
      approvedBy: "Awaiting Supervisor & Section Head Approval",
      issuedBy: "Pending",
      stockAvailability: "In Stock",
      qrScanVerified: false,
      receiverSignature: "Pending Signature",
      gpsLocation: "9.0182° N, 38.7631° E",
      pinsQty: 200,
      wedgesQty: 350,
      tieRodsQty: 120,
      conduitsQty: 60,
      blocksQty: 0,
      floorItemsQty: 50,
      notes: "Slab formwork decking & prop bracing"
    }
  ]);

  // DAILY END-OF-DAY CONSUMPTION VARIANCE STATE
  const [dailyConsumptionVariances, setDailyConsumptionVariances] = useState<DailyConsumptionVariance[]>([
    {
      id: "VAR-20260722-01",
      requisitionId: "REQ-20260722-001",
      date: "2026-07-22",
      siteName: "Bole Heights Phase I",
      blockNumber: "Block A",
      floorNumber: "Floor 4",
      materialName: "Aluminum Formwork Pin & Wedge Set",
      jobPosition: "Gang Chief",
      requestedBy: "Fikru Tolossa",
      quantityRequested: 400,
      quantityIssued: 400,
      quantityUsed: 385,
      quantityReturned: 10,
      quantityLost: 3,
      quantityDamaged: 2,
      quantityRemaining: 0,
      varianceQty: 0,
      variancePercent: 1.25,
      varianceStatus: "Acceptable Tolerance",
      reportedBy: "Fikru Tolossa (Gang Chief)",
      verifiedByStorekeeper: true
    }
  ]);

  // PERMANENT REQUISITION AUDIT LOG STATE
  const [requisitionAuditLogs, setRequisitionAuditLogs] = useState<RequisitionAuditLog[]>([
    {
      id: "AUD-REQ-901",
      requisitionId: "REQ-20260722-001",
      action: "REQUEST_CREATED",
      performedBy: "Fikru Tolossa (EMP-4091)",
      jobPosition: "Gang Chief",
      timestamp: "2026-07-22 06:15:22",
      gpsLocation: "8.9806° N, 38.7578° E",
      digitalSignature: "SIG-ETH-88201-OK",
      details: "Created requisition REQ-20260722-001 for 400 Pcs Pin & Wedge Sets (Mobile App)",
      ledgerDelta: "0 Pcs (Pending Approval)"
    },
    {
      id: "AUD-REQ-902",
      requisitionId: "REQ-20260722-001",
      action: "APPROVAL_GRANTED",
      performedBy: "Eng. Kassa Hunegn (EMP-2010)",
      jobPosition: "Supervisor",
      timestamp: "2026-07-22 06:22:10",
      gpsLocation: "8.9806° N, 38.7578° E",
      digitalSignature: "SIG-ETH-99302-SUP",
      details: "Supervisor approved requisition REQ-20260722-001 after stock verification",
      ledgerDelta: "400 Pcs Reserved in Site Store"
    },
    {
      id: "AUD-REQ-903",
      requisitionId: "REQ-20260722-001",
      action: "MATERIAL_ISSUED_QR",
      performedBy: "Abebe Storekeeper (EMP-1002)",
      jobPosition: "Store Owner",
      timestamp: "2026-07-22 06:30:45",
      gpsLocation: "8.9806° N, 38.7578° E",
      digitalSignature: "SIG-ETH-77401-STORE",
      details: "Materials issued via Bluetooth Barcode Scanner & receiver fingerprint signature captured. Live notification sent to HQ & Warehouse.",
      ledgerDelta: "-400 Pcs Site Store Stock"
    }
  ]);

  const [showNewRequisitionModal, setShowNewRequisitionModal] = useState(false);
  const [newReqForm, setNewReqForm] = useState({
    projectName: "Bole Heights Commercial Tower",
    siteName: "Bole Heights Phase I",
    buildingNumber: "Bldg 01",
    blockNumber: "Block A",
    floorNumber: "Floor 4",
    zoneNumber: "Zone 2",
    requestedBy: "Fikru Tolossa",
    employeeId: "EMP-4091",
    jobPosition: "Gang Chief" as "Assembler" | "Gang Chief" | "Team Leader" | "Supervisor" | "Section Head",
    submissionMode: "Mobile App" as "Mobile App" | "Tablet" | "Desktop" | "Paper Form (Manual Entry)",
    materialName: "Aluminum Formwork Pin & Wedge Set (16mm)",
    materialType: "Formwork Accessory" as "Formwork Accessory" | "Aluminum Panel" | "Consumable" | "Concrete / Block",
    materialSize: "16mm Heavy Duty",
    unit: "Sets",
    quantityRequested: 200,
    purposeOfUse: "Wall formwork erection for Zone 2 shear wall concrete pour",
    workType: "Wall" as "Wall" | "Slab" | "Beam" | "Column",
    priority: "Normal" as "Normal" | "Urgent" | "Emergency",
    expectedReturnDate: "2026-07-23",
    pinsQty: 100,
    wedgesQty: 150,
    tieRodsQty: 50,
    conduitsQty: 30,
    blocksQty: 200,
    floorItemsQty: 20,
    notes: "Morning shift material dispatch"
  });

  // EVENING DISMANTLING & RETURN REPORT STATE
  const [selectedPhotoReturn, setSelectedPhotoReturn] = useState<DailyReturnReport | null>(null);
  const [dailyReturnReports, setDailyReturnReports] = useState<DailyReturnReport[]>([
    {
      id: "RET-20260721-001",
      requisitionId: "REQ-20260721-098",
      date: "2026-07-21",
      siteName: "Bole Heights Phase I",
      blockNumber: "Block A",
      floorNumber: "Floor 3",
      gangChiefName: "Fikru Tolossa",
      siteStoreOwnerName: "Abebe Storekeeper",
      status: "With Damage",
      pinsReturned: 142,
      pinsLost: 5,
      pinsDamaged: 3,
      wedgesReturned: 240,
      wedgesLost: 8,
      wedgesDamaged: 2,
      tieRodsReturned: 75,
      tieRodsLost: 3,
      tieRodsDamaged: 2,
      conduitsReturned: 38,
      conduitsLost: 1,
      conduitsDamaged: 1,
      damageDescription: "2 Tie rods bent during wedge pin removal. 3 pins head mushroomed.",
      photoUploaded: true,
      photoEvidence: true,
      photoUrl: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800&auto=format&fit=crop",
      gangChiefSigned: true,
      storeOwnerSigned: true,
      returnedAt: "05:45 PM"
    },
    {
      id: "RET-20260722-002",
      requisitionId: "REQ-20260722-104",
      date: "2026-07-22",
      siteName: "Kazanchis Financial Tower",
      blockNumber: "Block B",
      floorNumber: "Floor 6",
      gangChiefName: "Yosef Assefa",
      siteStoreOwnerName: "Abebe Storekeeper",
      status: "With Damage",
      pinsReturned: 180,
      pinsLost: 2,
      pinsDamaged: 4,
      wedgesReturned: 310,
      wedgesLost: 4,
      wedgesDamaged: 1,
      tieRodsReturned: 90,
      tieRodsLost: 1,
      tieRodsDamaged: 3,
      conduitsReturned: 45,
      conduitsLost: 0,
      conduitsDamaged: 2,
      damageDescription: "Micro-fracture detected on 4 pins after concrete stripping cycle.",
      photoUploaded: true,
      photoEvidence: true,
      photoUrl: "https://images.unsplash.com/photo-1590069261209-f8e9b8642343?w=800&auto=format&fit=crop",
      gangChiefSigned: true,
      storeOwnerSigned: true,
      returnedAt: "05:15 PM"
    },
    {
      id: "RET-20260722-003",
      requisitionId: "REQ-20260722-108",
      date: "2026-07-22",
      siteName: "Gotera Interchange Project",
      blockNumber: "Section 1",
      floorNumber: "Pier 2",
      gangChiefName: "Tadesse Melaku",
      siteStoreOwnerName: "Abebe Storekeeper",
      status: "Fully Returned",
      pinsReturned: 120,
      pinsLost: 0,
      pinsDamaged: 0,
      wedgesReturned: 200,
      wedgesLost: 0,
      wedgesDamaged: 0,
      tieRodsReturned: 60,
      tieRodsLost: 0,
      tieRodsDamaged: 0,
      conduitsReturned: 30,
      conduitsLost: 0,
      conduitsDamaged: 0,
      damageDescription: "All formwork accessories dismantled in pristine condition.",
      photoUploaded: true,
      photoEvidence: true,
      photoUrl: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&auto=format&fit=crop",
      gangChiefSigned: true,
      storeOwnerSigned: true,
      returnedAt: "05:50 PM"
    }
  ]);

  const [showNewReturnModal, setShowNewReturnModal] = useState(false);
  const [newReturnForm, setNewReturnForm] = useState({
    requisitionId: "REQ-20260722-001",
    siteName: "Bole Heights Phase I",
    blockNumber: "Block A",
    floorNumber: "Floor 4",
    gangChiefName: "Fikru Tolossa",
    siteStoreOwnerName: "Abebe Storekeeper",
    pinsReturned: 145, pinsLost: 3, pinsDamaged: 2,
    wedgesReturned: 242, wedgesLost: 5, wedgesDamaged: 3,
    tieRodsReturned: 76, tieRodsLost: 2, tieRodsDamaged: 2,
    conduitsReturned: 39, conduitsLost: 1, conduitsDamaged: 0,
    damageDescription: "Minor thread damage on 2 tie rods.",
    photoUploaded: true
  });

  // Requisition & Return Form aliases & Submit Handlers
  const reqForm = newReqForm;
  const setReqForm = setNewReqForm;
  const returnForm = newReturnForm;
  const setReturnForm = setNewReturnForm;

  const handleCreateRequisition = (e: React.FormEvent) => {
    e.preventDefault();
    const reqId = `REQ-${new Date().toISOString().substring(0, 10).replace(/-/g, "")}-${Math.floor(100 + Math.random() * 900)}`;
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Check approval limits based on role
    const limitRule = approvalRuleLimits.find(r => r.jobPosition === newReqForm.jobPosition);
    const requiresApproval = limitRule ? (newReqForm.quantityRequested > limitRule.maxQtyWithoutApproval || limitRule.requiresHigherApproval) : true;

    const newReq: DailyMaterialRequisition = {
      id: reqId,
      date: new Date().toISOString().substring(0, 10),
      requestedAt: nowTime,
      projectName: newReqForm.projectName,
      siteName: newReqForm.siteName,
      buildingNumber: newReqForm.buildingNumber,
      blockNumber: newReqForm.blockNumber,
      floorNumber: newReqForm.floorNumber,
      zoneNumber: newReqForm.zoneNumber,
      requestedBy: newReqForm.requestedBy,
      employeeId: newReqForm.employeeId,
      jobPosition: newReqForm.jobPosition,
      submissionMode: newReqForm.submissionMode,
      materialName: newReqForm.materialName,
      materialType: newReqForm.materialType,
      materialSize: newReqForm.materialSize,
      unit: newReqForm.unit,
      quantityRequested: newReqForm.quantityRequested,
      quantityIssued: requiresApproval ? 0 : newReqForm.quantityRequested,
      purposeOfUse: newReqForm.purposeOfUse,
      workType: newReqForm.workType,
      priority: newReqForm.priority,
      expectedReturnDate: newReqForm.expectedReturnDate,
      status: requiresApproval ? "Pending Approval" : "Approved",
      approvedBy: requiresApproval ? `Awaiting ${limitRule?.approverRoleRequired || "Supervisor"} Approval` : `${newReqForm.requestedBy} (Self-Authorized)`,
      issuedBy: "Pending Site Store",
      stockAvailability: "In Stock",
      qrScanVerified: false,
      receiverSignature: `Digital Signature Verified (${newReqForm.requestedBy})`,
      gpsLocation: "8.9806° N, 38.7578° E (Site GPS Tagged)",
      pinsQty: newReqForm.pinsQty,
      wedgesQty: newReqForm.wedgesQty,
      tieRodsQty: newReqForm.tieRodsQty,
      conduitsQty: newReqForm.conduitsQty,
      blocksQty: newReqForm.blocksQty,
      floorItemsQty: newReqForm.floorItemsQty,
      notes: newReqForm.notes
    };

    setDailyRequisitions(prev => [newReq, ...prev]);

    // Append Audit Trail
    const newAudit: RequisitionAuditLog = {
      id: `AUD-REQ-${Math.floor(1000 + Math.random() * 9000)}`,
      requisitionId: reqId,
      action: "REQUEST_CREATED",
      performedBy: `${newReqForm.requestedBy} (${newReqForm.employeeId})`,
      jobPosition: newReqForm.jobPosition,
      timestamp: `${new Date().toISOString().substring(0, 10)} ${nowTime}`,
      gpsLocation: "8.9806° N, 38.7578° E",
      digitalSignature: `SIG-REQ-${Math.floor(10000 + Math.random() * 90000)}`,
      details: `Created requisition ${reqId} for ${newReqForm.quantityRequested} ${newReqForm.unit} of ${newReqForm.materialName} (${newReqForm.submissionMode})`,
      ledgerDelta: requiresApproval ? "0 Pcs (Pending Approval)" : `-${newReqForm.quantityRequested} Pcs Reserved`
    };
    setRequisitionAuditLogs(prev => [newAudit, ...prev]);

    setShowNewRequisitionModal(false);
    onLogAction?.("Morning Requisition Created", `Submitted morning requisition ${newReq.id} for ${newReq.blockNumber} ${newReq.floorNumber} by ${newReq.jobPosition} ${newReq.requestedBy}`);
  };

  const handleCreateReturn = (e: React.FormEvent) => {
    e.preventDefault();
    const newRet: DailyReturnReport = {
      id: `RET-${new Date().toISOString().substring(0, 10).replace(/-/g, "")}-${Math.floor(100 + Math.random() * 900)}`,
      requisitionId: newReturnForm.requisitionId,
      date: new Date().toISOString().substring(0, 10),
      siteName: newReturnForm.siteName,
      blockNumber: newReturnForm.blockNumber,
      floorNumber: newReturnForm.floorNumber,
      gangChiefName: newReturnForm.gangChiefName,
      siteStoreOwnerName: newReturnForm.siteStoreOwnerName,
      status: (newReturnForm.pinsLost > 0 || newReturnForm.pinsDamaged > 0) ? "With Damage" : "Fully Returned",
      pinsReturned: newReturnForm.pinsReturned,
      pinsLost: newReturnForm.pinsLost,
      pinsDamaged: newReturnForm.pinsDamaged,
      wedgesReturned: newReturnForm.wedgesReturned,
      wedgesLost: newReturnForm.wedgesLost,
      wedgesDamaged: newReturnForm.wedgesDamaged,
      tieRodsReturned: newReturnForm.tieRodsReturned,
      tieRodsLost: newReturnForm.tieRodsLost,
      tieRodsDamaged: newReturnForm.tieRodsDamaged,
      conduitsReturned: newReturnForm.conduitsReturned,
      conduitsLost: newReturnForm.conduitsLost,
      conduitsDamaged: newReturnForm.conduitsDamaged,
      damageDescription: newReturnForm.damageDescription,
      photoUploaded: newReturnForm.photoUploaded,
      photoEvidence: newReturnForm.photoUploaded,
      photoUrl: newReturnForm.photoUploaded ? "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800&auto=format&fit=crop" : undefined,
      gangChiefSigned: true,
      storeOwnerSigned: true,
      returnedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setDailyReturnReports(prev => [newRet, ...prev]);
    setShowNewReturnModal(false);
    onLogAction?.("Evening Return Audit Logged", `Logged dismantling return audit ${newRet.id} for requisition ${newRet.requisitionId}`);
  };

  // DAILY CONSOLIDATED AUTO-REPORTS STATE (Transmitted live to Warehouse & HQ)
  const [dailyConsolidatedReports, setDailyConsolidatedReports] = useState<DailyConsolidatedReport[]>([
    {
      id: "DCR-20260721-BOLE",
      date: "2026-07-21",
      siteName: "Bole Heights Phase I",
      projectName: "Commercial Tower & Apartments",
      siteStoreOwner: "Abebe Storekeeper",
      totalRequisitions: 8,
      totalReturns: 8,
      totalItemsIssued: 1450,
      totalItemsReturned: 1395,
      totalItemsLost: 35,
      totalItemsDamaged: 20,
      totalLossValueETB: 14500,
      totalDamageValueETB: 8200,
      sentToWarehouseAt: "2026-07-21 18:30",
      sentToHeadOfficeAt: "2026-07-21 18:30",
      syncStatus: "Auto-Synced to HQ & Warehouse",
      materialSummaries: [
        { materialName: "Pins (ፒን 16mm)", openingStock: 500, received: 200, issued: 150, returned: 142, lost: 5, damaged: 3, closingStock: 490, unit: "Pcs" },
        { materialName: "Wedges (ዌጅ Standard)", openingStock: 800, received: 300, issued: 250, returned: 240, lost: 8, damaged: 2, closingStock: 840, unit: "Pcs" },
        { materialName: "Tie Rods (ታይሮድ 1.5m)", openingStock: 200, received: 100, issued: 80, returned: 75, lost: 3, damaged: 2, closingStock: 215, unit: "Pcs" },
        { materialName: "Conduits (ኮንድት PVC)", openingStock: 150, received: 50, issued: 40, returned: 38, lost: 1, damaged: 1, closingStock: 159, unit: "Pcs" }
      ],
      blockSummaries: [
        { blockNumber: "Block A", pinsIssued: 80, pinsLost: 3, wedgesIssued: 130, wedgesLost: 4, tieRodsIssued: 45, tieRodsLost: 2, blocksUsed: 150 },
        { blockNumber: "Block B", pinsIssued: 70, pinsLost: 2, wedgesIssued: 120, wedgesLost: 4, tieRodsIssued: 35, tieRodsLost: 1, blocksUsed: 150 }
      ]
    }
  ]);

  // WAREHOUSE DASHBOARD SEARCH & FILTERS
  const [warehouseSearch, setWarehouseSearch] = useState("");
  const [warehouseTabFilter, setWarehouseTabFilter] = useState<"all" | "fleets" | "transfers" | "suppliers">("all");

  // MODAL STATES FOR WAREHOUSE MANAGER
  const [showDispatchTruckModal, setShowDispatchTruckModal] = useState(false);
  const [dispatchTruckForm, setDispatchTruckForm] = useState({
    truckPlate: "ET-3-55901",
    driverName: "Kebede Michael",
    driverPhone: "+251-911-998877",
    cargoType: "H20 Beams & Steel Props Package",
    cargoQty: "200 Pcs",
    origin: "Central Warehouse Yard 01",
    destination: "Bole Heights Phase 1 Site Store",
    eta: "In 30 Mins"
  });

  const [showNewTransferModal, setShowNewTransferModal] = useState(false);
  const [newTransferForm, setNewTransferForm] = useState({
    sourceSite: "Central Warehouse Yard",
    destinationSite: "Saris Project Site Store",
    materialName: "Dangote OPC 42.5N Cement",
    quantity: 200,
    unit: "Bags",
    driverName: "Mulugeta Tadesse",
    truckPlate: "ET-3-11029",
    notes: "Site urgent request"
  });

  const [showNewSupplierModal, setShowNewSupplierModal] = useState(false);
  const [newSupplierForm, setNewSupplierForm] = useState({
    poNumber: "PO-2026-9910",
    supplierName: "Derba MIDROC Cement PLC",
    materialName: "OPC 42.5N Cement Bags",
    quantity: 500,
    unit: "Bags",
    expectedArrival: "Today 16:00",
    deliveryBay: "Central Yard Bay A",
    contactPerson: "Ato Dawit",
    phone: "+251-911-223344"
  });

  // WAREHOUSE MANAGER ACTIONS & SIMULATIONS
  const handleSimulateFleetMovement = () => {
    setTruckFleets(prev => prev.map(trk => {
      if (trk.status === "En Route") {
        const nextProgress = Math.min(100, trk.routeProgress + 15);
        const nextStatus = nextProgress >= 100 ? "At Gate" : "En Route";
        return {
          ...trk,
          routeProgress: nextProgress,
          status: nextStatus,
          speedKmH: nextProgress >= 100 ? 0 : Math.floor(35 + Math.random() * 25),
          eta: nextProgress >= 100 ? "Arrived at Gate" : `In ${Math.max(2, 20 - Math.floor(nextProgress / 5))} Mins`
        };
      }
      return trk;
    }));
    onLogAction?.("Fleet Telemetry Updated", "Updated live GPS progression for trucks en route");
  };

  const handleMarkTruckAtGate = (truckId: string) => {
    setTruckFleets(prev => prev.map(t => t.id === truckId ? { ...t, status: "At Gate", routeProgress: 100, speedKmH: 0, eta: "Arrived at Gate" } : t));
    onLogAction?.("Truck Gate Arrival", `Truck ${truckId} marked as arrived at gate.`);
  };

  const handleMarkTruckDelivered = (truckId: string) => {
    setTruckFleets(prev => prev.map(t => t.id === truckId ? { ...t, status: "Delivered", speedKmH: 0 } : t));
    onLogAction?.("Truck Cargo Delivered", `Cargo on truck ${truckId} delivered and offloaded.`);
  };

  const handleApproveTransferVoucher = (voucherId: string) => {
    setInterSiteTransfers(prev => prev.map(trf => trf.id === voucherId ? { ...trf, status: "In Transit", approvedBy: "Eng. Dawit (Warehouse Mgr)" } : trf));
    onLogAction?.("Transfer Voucher Approved", `Approved inter-site transfer voucher ${voucherId}`);
  };

  const handleConfirmTransferReceived = (voucherId: string) => {
    setInterSiteTransfers(prev => prev.map(trf => trf.id === voucherId ? { ...trf, status: "Verified & Received" } : trf));
    onLogAction?.("Transfer Received Verified", `Verified inter-site transfer receipt for voucher ${voucherId}`);
  };

  const handleMarkSupplierArrived = (supId: string) => {
    setSupplierSchedules(prev => prev.map(s => s.id === supId ? { ...s, status: "Arrived Gate" } : s));
    onLogAction?.("Supplier Delivery Arrived", `Supplier shipment ${supId} arrived at main warehouse gate.`);
  };

  const handleScanReceiveSupplierCargo = (supId: string) => {
    const shipment = supplierSchedules.find(s => s.id === supId);
    if (!shipment) return;

    setSupplierSchedules(prev => prev.map(s => s.id === supId ? { ...s, status: "Inspected & Received" } : s));

    // Automatically credit central store stock
    setStoreItems(prev => prev.map(item => {
      if (item.name.toLowerCase().includes(shipment.materialName.toLowerCase()) || shipment.materialName.toLowerCase().includes(item.category.toLowerCase())) {
        return {
          ...item,
          totalStock: item.totalStock + shipment.quantity,
          availableStock: item.availableStock + shipment.quantity,
          status: "In Stock"
        };
      }
      return item;
    }));

    onLogAction?.("Supplier Cargo Inspected & Received", `Inspected & credited ${shipment.quantity} ${shipment.unit} of ${shipment.materialName} to central inventory.`);
  };

  const handleDispatchTruckSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newTruck: TruckFleetItem = {
      id: `TRK-${Math.floor(105 + Math.random() * 900)}`,
      truckPlate: dispatchTruckForm.truckPlate,
      driverName: dispatchTruckForm.driverName,
      driverPhone: dispatchTruckForm.driverPhone,
      cargoType: dispatchTruckForm.cargoType,
      cargoQty: dispatchTruckForm.cargoQty,
      origin: dispatchTruckForm.origin,
      destination: dispatchTruckForm.destination,
      status: "En Route",
      speedKmH: 48,
      eta: dispatchTruckForm.eta,
      departureTime: new Date().toISOString().substring(11, 16),
      routeProgress: 5,
      gpsCoordinates: "9.0150° N, 38.7550° E",
      gatePassId: `GP-${Math.floor(880 + Math.random() * 100)}-${dispatchTruckForm.truckPlate.replace(/[^A-Z0-9]/gi, "")}`
    };
    setTruckFleets(prev => [newTruck, ...prev]);
    setShowDispatchTruckModal(false);
    onLogAction?.("Truck Dispatched", `Dispatched ${newTruck.truckPlate} with ${newTruck.cargoType} to ${newTruck.destination}`);
  };

  const handleCreateTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newTrf: InterSiteTransferVoucher = {
      id: `TRF-2026-${Math.floor(100 + Math.random() * 900)}`,
      voucherNo: `TRF-VO-${Math.floor(9900 + Math.random() * 99)}`,
      sourceSite: newTransferForm.sourceSite,
      destinationSite: newTransferForm.destinationSite,
      materialName: newTransferForm.materialName,
      quantity: Number(newTransferForm.quantity),
      unit: newTransferForm.unit,
      driverName: newTransferForm.driverName,
      truckPlate: newTransferForm.truckPlate,
      transferDate: new Date().toISOString().replace("T", " ").substring(0, 16),
      status: "In Transit",
      approvedBy: "Eng. Dawit Tesfaye (Warehouse Mgr)",
      notes: newTransferForm.notes
    };
    setInterSiteTransfers(prev => [newTrf, ...prev]);
    setShowNewTransferModal(false);
    onLogAction?.("Inter-Site Transfer Voucher Created", `Created transfer ${newTrf.voucherNo} from ${newTrf.sourceSite} to ${newTrf.destinationSite}`);
  };

  const handleScheduleSupplierSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newSup: SupplierDeliverySchedule = {
      id: `SUP-2026-${Math.floor(405 + Math.random() * 500)}`,
      poNumber: newSupplierForm.poNumber,
      supplierName: newSupplierForm.supplierName,
      materialName: newSupplierForm.materialName,
      quantity: Number(newSupplierForm.quantity),
      unit: newSupplierForm.unit,
      expectedArrival: newSupplierForm.expectedArrival,
      deliveryBay: newSupplierForm.deliveryBay,
      contactPerson: newSupplierForm.contactPerson,
      phone: newSupplierForm.phone,
      status: "Scheduled",
      gatePassCode: `GP-SUP-${Math.floor(400 + Math.random() * 99)}`
    };
    setSupplierSchedules(prev => [newSup, ...prev]);
    setShowNewSupplierModal(false);
    onLogAction?.("Supplier Delivery Scheduled", `Scheduled delivery PO ${newSup.poNumber} from ${newSup.supplierName}`);
  };

  // FORM STATES
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [receiveForm, setReceiveForm] = useState({
    materialName: "Standard Wall Panel 1200x600",
    materialType: "Aluminum Formwork",
    dimensions: "1200x600mm",
    quantity: 50,
    unit: "Pcs",
    source: "Warehouse" as const,
    batchNumber: "BATCH-2026-091",
    bundleNumber: "BNDL-501",
    serialNumber: "SN-AL-9000-9050",
    driverName: "Mulugeta Tadesse",
    truckPlate: "ET-3-11029",
    gpsLocation: "9.0102° N, 38.7612° E (Site Store)",
    receivedBy: "Store Owner Abebe"
  });

  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueForm, setIssueForm] = useState({
    receiverName: "Sintayehu Alula",
    receiverRole: "Site Engineer",
    department: "Structural Engineering",
    siteName: "Bole Heights Phase I",
    building: "Building A",
    floor: "Floor 4",
    zone: "Zone 3",
    materialName: "Dangote OPC 42.5N Cement",
    quantity: 50,
    unit: "Bags"
  });

  // QR / Barcode Simulator State
  const [scannedCode, setScannedCode] = useState("");
  const [scanResult, setScanResult] = useState<StoreMaterialItem | null>(null);

  // Filter state for Store Inventory
  const [searchFilter, setSearchFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");

  // Filtered store inventory
  const filteredStoreItems = useMemo(() => {
    return storeItems.filter(item => {
      const matchSearch = item.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
                          item.code.toLowerCase().includes(searchFilter.toLowerCase()) ||
                          item.warehouseLocation.toLowerCase().includes(searchFilter.toLowerCase());
      const matchCategory = categoryFilter === "All" || item.category === categoryFilter;
      return matchSearch && matchCategory;
    });
  }, [storeItems, searchFilter, categoryFilter]);

  // COMPUTED DASHBOARD METRICS
  const totalMaterialStockSum = useMemo(() => storeItems.reduce((acc, i) => acc + i.totalStock, 0), [storeItems]);
  const availableStockSum = useMemo(() => storeItems.reduce((acc, i) => acc + i.availableStock, 0), [storeItems]);
  const reservedStockSum = useMemo(() => storeItems.reduce((acc, i) => acc + i.reservedStock, 0), [storeItems]);
  const lowStockCount = useMemo(() => storeItems.filter(i => i.availableStock <= i.minThreshold).length, [storeItems]);

  const totalFormworkPanelsCount = dbPanels.length || 850;
  const cleaningQueueCount = 18;
  const repairQueueCount = 12;
  const damagedPanelsCount = 8;
  const missingPanelsCount = 5;

  // HANDLERS
  const handleReceiveMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    const newReport: MaterialReceivingReport = {
      id: `REC-2026-${Math.floor(100 + Math.random() * 900)}`,
      materialName: receiveForm.materialName,
      materialType: receiveForm.materialType,
      dimensions: receiveForm.dimensions,
      quantity: Number(receiveForm.quantity),
      unit: receiveForm.unit,
      source: receiveForm.source,
      batchNumber: receiveForm.batchNumber,
      bundleNumber: receiveForm.bundleNumber,
      serialNumber: receiveForm.serialNumber,
      qrCode: `QR-${Date.now()}`,
      deliveryDate: new Date().toISOString().replace("T", " ").substring(0, 16),
      driverName: receiveForm.driverName,
      truckPlate: receiveForm.truckPlate,
      gpsLocation: receiveForm.gpsLocation,
      receivedBy: receiveForm.receivedBy,
      signatureSigned: true,
      photoUploaded: true
    };

    setReceivingReports(prev => [newReport, ...prev]);

    // Automatically update stock
    setStoreItems(prev => prev.map(item => {
      if (item.name.toLowerCase().includes(receiveForm.materialName.toLowerCase())) {
        return {
          ...item,
          totalStock: item.totalStock + Number(receiveForm.quantity),
          availableStock: item.availableStock + Number(receiveForm.quantity),
          status: "In Stock"
        };
      }
      return item;
    }));

    setShowReceiveModal(false);
    onLogAction?.("Material Received", `Received ${receiveForm.quantity} ${receiveForm.unit} of ${receiveForm.materialName}`);
  };

  const handleIssueMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    const newIssue: MaterialIssueRecord = {
      id: `ISS-2026-${Math.floor(100 + Math.random() * 900)}`,
      receiverName: issueForm.receiverName,
      receiverRole: issueForm.receiverRole,
      department: issueForm.department,
      siteName: issueForm.siteName,
      building: issueForm.building,
      floor: issueForm.floor,
      zone: issueForm.zone,
      materialName: issueForm.materialName,
      quantity: Number(issueForm.quantity),
      unit: issueForm.unit,
      issueDate: new Date().toISOString().replace("T", " ").substring(0, 16),
      qrScanned: true,
      gpsLocation: "9.0102° N, 38.7612° E",
      signatureSigned: true
    };

    setIssueRecords(prev => [newIssue, ...prev]);

    // Automatically reduce stock
    setStoreItems(prev => prev.map(item => {
      if (item.name.toLowerCase().includes(issueForm.materialName.toLowerCase())) {
        const newAvail = Math.max(0, item.availableStock - Number(issueForm.quantity));
        return {
          ...item,
          availableStock: newAvail,
          status: newAvail <= item.minThreshold ? "Low Stock" : "In Stock"
        };
      }
      return item;
    }));

    setShowIssueModal(false);
    onLogAction?.("Material Issued", `Issued ${issueForm.quantity} ${issueForm.unit} of ${issueForm.materialName} to ${issueForm.receiverName}`);
  };

  const handleApproveRequest = (reqId: string) => {
    setMaterialRequests(prev => prev.map(r => r.id === reqId ? { ...r, status: "Approved" } : r));
    onLogAction?.("Approve Material Request", `Approved request ${reqId}`);
  };

  const handleRejectRequest = (reqId: string) => {
    setMaterialRequests(prev => prev.map(r => r.id === reqId ? { ...r, status: "Rejected" } : r));
    onLogAction?.("Reject Material Request", `Rejected request ${reqId}`);
  };

  const handleSimulateScan = (code: string) => {
    setScannedCode(code);
    const found = storeItems.find(i => i.code.toLowerCase() === code.toLowerCase() || i.id.toLowerCase() === code.toLowerCase());
    setScanResult(found || storeItems[0]);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-slate-100 shadow-2xl max-w-7xl mx-auto space-y-8" id="store-owner-app-root">
      
      {/* MODE SWITCHER HEADER BAR */}
      <div className="bg-slate-950 p-2 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              setAppMode("warehouse_manager");
              onLogAction?.("App Mode Switched", "Switched workspace mode to Central Warehouse Manager App");
            }}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center space-x-2 transition cursor-pointer ${
              appMode === "warehouse_manager"
                ? "bg-amber-500 text-slate-950 shadow-lg font-bold"
                : "bg-slate-900 text-slate-300 hover:bg-slate-800"
            }`}
          >
            <Building2 size={16} />
            <span>{isAmharic ? "1. የመጋዘን አስተዳዳሪ መተግበሪያ (Warehouse Manager)" : "1. Warehouse Manager App"}</span>
          </button>

          <button
            onClick={() => {
              setAppMode("store_owner");
              onLogAction?.("App Mode Switched", "Switched workspace mode to Site Store Owner App");
            }}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center space-x-2 transition cursor-pointer ${
              appMode === "store_owner"
                ? "bg-amber-500 text-slate-950 shadow-lg font-bold"
                : "bg-slate-900 text-slate-300 hover:bg-slate-800"
            }`}
          >
            <Store size={16} />
            <span>{isAmharic ? "2. የሳይት ስቶር አቃቤ መተግበሪያ (Site Store Owner)" : "2. Site Store Owner App"}</span>
          </button>
        </div>

        <div className="text-right px-2">
          <span className="text-[10px] font-mono text-amber-400 font-bold uppercase block">
            {appMode === "warehouse_manager" ? "CENTRAL WAREHOUSE & FLEET ACTIVE" : "LOCAL SITE STORE ACTIVE"}
          </span>
          <span className="text-[9px] text-slate-400">
            {isAmharic ? "ሁለቱም ሞዶች በቅጽበት የተገናኙ ናቸው" : "Real-time Multi-Tier Syncing"}
          </span>
        </div>
      </div>

      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-6 gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-amber-600 rounded-2xl shadow-lg shadow-amber-500/20 text-white">
            {appMode === "warehouse_manager" ? <Building2 size={26} className="animate-pulse" /> : <Store size={26} className="animate-pulse" />}
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white">{t("title")}</h1>
            <p className="text-xs text-slate-400 mt-1">{t("subtitle")}</p>
          </div>
        </div>

        {/* Sync Indicator & Quick Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 flex items-center space-x-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] font-mono font-bold text-slate-300 uppercase">
              {isAmharic ? "ከስቶርና ከአሉሚኒየም ፎርምወርክ ጋር ተገናኝቷል" : "Site Store & Firebase Live Connected"}
            </span>
          </div>

          <button
            onClick={() => setShowReceiveModal(true)}
            className="px-3.5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center space-x-2 shadow-md hover:opacity-95 transition cursor-pointer"
          >
            <Plus size={14} />
            <span>{isAmharic ? "እቃዎች ተቀበል" : "Receive Material"}</span>
          </button>

          <button
            onClick={() => setShowIssueModal(true)}
            className="px-3.5 py-2 bg-amber-600 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center space-x-2 shadow-md hover:opacity-95 transition cursor-pointer"
          >
            <ArrowRightLeft size={14} />
            <span>{isAmharic ? "እቃዎች አስረክብ (Issue)" : "Issue Material"}</span>
          </button>
        </div>
      </div>

      {/* CENTRAL WAREHOUSE SPECIALIZED SUMMARY BANNER */}
      {appMode === "warehouse_manager" && (
        <div className="bg-gradient-to-r from-amber-950/60 via-slate-950 to-amber-950/60 p-5 rounded-2xl border border-amber-500/30 space-y-3">
          <div className="flex justify-between items-center border-b border-amber-500/20 pb-2">
            <div className="flex items-center space-x-2 text-amber-400">
              <Building2 size={18} />
              <span className="text-xs font-black uppercase tracking-wider">
                {isAmharic ? "የማዕከላዊ መጋዘን አስተዳደር ማጠቃለያ (Central Warehouse Logistics)" : "Central Warehouse Logistics & Fleet Control"}
              </span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
              {isAmharic ? "ማዕከላዊ መጋዘን፡ ንቁ" : "MAIN WAREHOUSE HUB ACTIVE"}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block uppercase font-mono">{isAmharic ? "የማዕከላዊ እቃዎች ክምችት" : "Central Yard Stock"}</span>
              <span className="text-lg font-black text-amber-400 font-mono">18,450 Units</span>
            </div>
            <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block uppercase font-mono">{isAmharic ? "ንቁ የጭነት መኪኖች" : "Dispatch Trucks"}</span>
              <span className="text-lg font-black text-emerald-400 font-mono">6 Fleets</span>
            </div>
            <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block uppercase font-mono">{isAmharic ? "የአቅራቢዎች ደረሰኝ" : "Supplier Deliveries"}</span>
              <span className="text-lg font-black text-cyan-400 font-mono">4 Shipments</span>
            </div>
            <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block uppercase font-mono">{isAmharic ? "የሳይቶች ማስተላለፊያ" : "Inter-Site Transfers"}</span>
              <span className="text-lg font-black text-indigo-400 font-mono">12 Vouchers</span>
            </div>
          </div>
        </div>
      )}

      {/* TABS TOP NAVIGATION */}
      <div className="flex flex-wrap border-b border-slate-800 gap-1 overflow-x-auto pb-1">
        {[
          { id: "warehouse-dashboard", label: isAmharic ? "መጋዘን ዳሽቦርድ" : "Warehouse Dashboard", icon: Building2 },
          { id: "dashboard", label: isAmharic ? "ዳሽቦርድ" : "Store Dashboard", icon: Layers },
          { id: "site-panel-breakdown", label: isAmharic ? "በየሳይቱ ያሉ የፓነል ዝርዝሮች" : "Cross-Site Panel Breakdown", icon: Box },
          { id: "morning-requisitions", label: isAmharic ? "የጠዋት እቃዎች ጥያቄ" : "Morning Requisitions", icon: FileText },
          { id: "evening-returns", label: isAmharic ? "የማታ ዘገባ & መመለሻ" : "Evening Dismantling Returns", icon: RotateCcw },
          { id: "daily-auto-reports", label: isAmharic ? "የሳይት እለታዊ ሪፖርት (HQ Sync)" : "Daily Site Reports (HQ Sync)", icon: BarChart3 },
          { id: "receiving", label: isAmharic ? "እቃዎች መቀበያ" : "Receiving", icon: Truck },
          { id: "issue", label: isAmharic ? "እቃዎች ማስረከቢያ" : "Issue", icon: ArrowRightLeft },
          { id: "returns", label: isAmharic ? "የተመለሱ እቃዎች" : "Returns", icon: RotateCcw },
          { id: "formwork-tracking", label: isAmharic ? "ፎርምወርክ መከታተያ" : "Formwork GPS", icon: Package },
          { id: "inventory", label: isAmharic ? "የስቶር ዝርዝር" : "Inventory", icon: Box },
          { id: "audit", label: isAmharic ? "የስቶር ኦዲት" : "Audit", icon: ClipboardList },
          { id: "requests", label: isAmharic ? "የእቃዎች ጥያቄ" : "Requests", icon: FileText },
          { id: "qr-barcode", label: isAmharic ? "QR / Barcode" : "QR & Barcode", icon: QrCode },
          { id: "notifications", label: isAmharic ? "ማስጠንቀቂያዎች" : "Notifications", icon: Bell },
          { id: "reports", label: isAmharic ? "ሪፖርቶች" : "Reports", icon: BarChart3 },
          { id: "ai-analytics", label: isAmharic ? "AI ትንበያ" : "AI Analytics", icon: Cpu },
          { id: "role-access", label: isAmharic ? "የፈቃድ ደረጃዎች" : "Role Access", icon: ShieldCheck },
          { id: "integrations", label: isAmharic ? "የስርዓት ትስስር" : "ERP Sync", icon: RefreshCw }
        ].map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-2 flex items-center space-x-1.5 text-[11px] font-extrabold uppercase tracking-wider rounded-t-xl transition cursor-pointer whitespace-nowrap ${
                active
                  ? "bg-amber-600 text-white shadow-lg shadow-amber-600/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* VIEWPORT ROUTER */}
      <div className="transition-all duration-300">

        {/* 0. WAREHOUSE MANAGER DASHBOARD */}
        {activeTab === "warehouse-dashboard" && (
          <div className="space-y-6 animate-fadeIn">
            {/* TOP ACTIONS & SEARCH FILTER BAR */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                {/* Search & Category Filter */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative min-w-[240px]">
                    <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder={isAmharic ? "በሰሌዳ ቁጥር፣ እቃ ወይም ሳይት ፈልግ..." : "Search truck plate, material, PO or site..."}
                      value={warehouseSearch}
                      onChange={(e) => setWarehouseSearch(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>

                  <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-[11px] font-bold">
                    <button
                      onClick={() => setWarehouseTabFilter("all")}
                      className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                        warehouseTabFilter === "all" ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {isAmharic ? "ሁሉንም አሳይ" : "All Overview"}
                    </button>
                    <button
                      onClick={() => setWarehouseTabFilter("fleets")}
                      className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                        warehouseTabFilter === "fleets" ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {isAmharic ? "የጭነት መኪኖች" : "Truck Fleets"}
                    </button>
                    <button
                      onClick={() => setWarehouseTabFilter("transfers")}
                      className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                        warehouseTabFilter === "transfers" ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {isAmharic ? "የሳይቶች ማስተላለፊያ" : "Inter-Site Transfers"}
                    </button>
                    <button
                      onClick={() => setWarehouseTabFilter("suppliers")}
                      className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                        warehouseTabFilter === "suppliers" ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {isAmharic ? "የአቅራቢዎች ደረሰኝ" : "Supplier Schedules"}
                    </button>
                  </div>
                </div>

                {/* Quick Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleSimulateFleetMovement}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-xl text-xs font-bold flex items-center space-x-1.5 border border-slate-700 cursor-pointer transition"
                  >
                    <Radio size={14} className="animate-pulse text-emerald-400" />
                    <span>{isAmharic ? "የGPS ቦታ ማደስ" : "Simulate GPS Movement"}</span>
                  </button>

                  <button
                    onClick={() => setShowDispatchTruckModal(true)}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center space-x-1.5 cursor-pointer shadow-lg transition"
                  >
                    <Truck size={14} />
                    <span>{isAmharic ? "መኪና ላክ" : "Dispatch Truck"}</span>
                  </button>

                  <button
                    onClick={() => setShowNewTransferModal(true)}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center space-x-1.5 cursor-pointer shadow-lg transition"
                  >
                    <ArrowRightLeft size={14} />
                    <span>{isAmharic ? "አዲስ ማስተላለፊያ" : "New Inter-Site Transfer"}</span>
                  </button>

                  <button
                    onClick={() => setShowNewSupplierModal(true)}
                    className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center space-x-1.5 cursor-pointer shadow-lg transition"
                  >
                    <Calendar size={14} />
                    <span>{isAmharic ? "የአቅራቢ ቀጠሮ" : "Schedule Supplier Delivery"}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* SECTION 1: TRUCK FLEET REAL-TIME TRACKING */}
            {(warehouseTabFilter === "all" || warehouseTabFilter === "fleets") && (
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <h2 className="text-sm font-black uppercase text-amber-400 flex items-center space-x-2">
                    <Truck size={18} />
                    <span>{isAmharic ? "የጭነት መኪኖች የቀጥታ መከታተያ (Real-Time Truck Fleet Logistics)" : "Truck Fleet GPS Live Dispatch & Route Tracker"}</span>
                  </h2>
                  <span className="text-[10px] font-mono text-slate-400">{truckFleets.length} Fleets Active</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {truckFleets
                    .filter(t => 
                      warehouseSearch === "" ||
                      t.truckPlate.toLowerCase().includes(warehouseSearch.toLowerCase()) ||
                      t.driverName.toLowerCase().includes(warehouseSearch.toLowerCase()) ||
                      t.cargoType.toLowerCase().includes(warehouseSearch.toLowerCase()) ||
                      t.destination.toLowerCase().includes(warehouseSearch.toLowerCase())
                    )
                    .map(truck => (
                      <div key={truck.id} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-xs font-black text-white font-mono flex items-center gap-1.5">
                                <Truck size={14} className="text-amber-400" />
                                {truck.truckPlate}
                              </span>
                              <span className="text-[10px] text-slate-400 block font-mono mt-0.5">{truck.driverName}</span>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black font-mono border ${
                              truck.status === "En Route" ? "bg-amber-950 text-amber-300 border-amber-800 animate-pulse" :
                              truck.status === "At Gate" ? "bg-emerald-950 text-emerald-300 border-emerald-800" :
                              truck.status === "Delivered" ? "bg-blue-950 text-blue-300 border-blue-800" :
                              "bg-slate-800 text-slate-300 border-slate-700"
                            }`}>
                              {truck.status}
                            </span>
                          </div>

                          <div className="mt-3 bg-slate-900 p-2.5 rounded-xl border border-slate-800/80 space-y-1.5 text-[10px]">
                            <div className="flex justify-between text-slate-300 font-mono">
                              <span className="text-slate-500">Cargo:</span>
                              <span className="font-bold text-slate-200 truncate max-w-[150px]">{truck.cargoType}</span>
                            </div>
                            <div className="flex justify-between text-slate-300 font-mono">
                              <span className="text-slate-500">Destination:</span>
                              <span className="font-bold text-amber-400 truncate max-w-[150px]">{truck.destination}</span>
                            </div>
                            <div className="flex justify-between text-slate-300 font-mono">
                              <span className="text-slate-500">ETA / Speed:</span>
                              <span className="font-bold text-emerald-400">{truck.eta} ({truck.speedKmH} km/h)</span>
                            </div>
                            <div className="flex justify-between text-slate-300 font-mono text-[9px]">
                              <span className="text-slate-500">Gate Pass:</span>
                              <span className="text-slate-400">{truck.gatePassId}</span>
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="mt-3 space-y-1">
                            <div className="flex justify-between text-[9px] font-mono text-slate-400">
                              <span>Route Progress</span>
                              <span className="font-bold text-amber-400">{truck.routeProgress}%</span>
                            </div>
                            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                              <div 
                                className="bg-gradient-to-r from-amber-500 to-emerald-400 h-full transition-all duration-500" 
                                style={{ width: `${truck.routeProgress}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Truck Actions */}
                        <div className="pt-2 border-t border-slate-900 flex items-center justify-between gap-1.5">
                          <a
                            href={`tel:${truck.driverPhone}`}
                            className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded text-[10px] font-mono flex items-center gap-1 border border-slate-800"
                          >
                            <Phone size={10} />
                            <span>Call</span>
                          </a>

                          {truck.status === "En Route" && (
                            <button
                              onClick={() => handleMarkTruckAtGate(truck.id)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-black uppercase cursor-pointer transition"
                            >
                              Arrived Gate
                            </button>
                          )}

                          {truck.status === "At Gate" && (
                            <button
                              onClick={() => handleMarkTruckDelivered(truck.id)}
                              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[10px] font-black uppercase cursor-pointer transition"
                            >
                              Confirm Offloaded
                            </button>
                          )}

                          {truck.status === "Delivered" && (
                            <span className="text-[9px] font-mono text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 size={12} /> Complete
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* SECTION 2: INTER-SITE MATERIAL TRANSFERS */}
            {(warehouseTabFilter === "all" || warehouseTabFilter === "transfers") && (
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <h2 className="text-sm font-black uppercase text-indigo-400 flex items-center space-x-2">
                    <ArrowRightLeft size={18} />
                    <span>{isAmharic ? "የሳይቶች የእቃዎች ማስተላለፊያ ቫውቸሮች (Inter-Site Material Transfer Log)" : "Inter-Site Material Transfer Vouchers"}</span>
                  </h2>
                  <span className="text-[10px] font-mono text-slate-400">{interSiteTransfers.length} Active Vouchers</span>
                </div>

                <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-900 text-[10px] font-black uppercase text-slate-400 border-b border-slate-800 font-mono">
                          <th className="p-3">Voucher No</th>
                          <th className="p-3">Source Site</th>
                          <th className="p-3">Destination Site</th>
                          <th className="p-3">Material & Quantity</th>
                          <th className="p-3">Carrier / Truck</th>
                          <th className="p-3">Transfer Date</th>
                          <th className="p-3">Status</th>
                          <th className="p-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-xs font-mono">
                        {interSiteTransfers
                          .filter(trf => 
                            warehouseSearch === "" ||
                            trf.voucherNo.toLowerCase().includes(warehouseSearch.toLowerCase()) ||
                            trf.materialName.toLowerCase().includes(warehouseSearch.toLowerCase()) ||
                            trf.destinationSite.toLowerCase().includes(warehouseSearch.toLowerCase()) ||
                            trf.sourceSite.toLowerCase().includes(warehouseSearch.toLowerCase())
                          )
                          .map(trf => (
                            <tr key={trf.id} className="hover:bg-slate-900/50 transition">
                              <td className="p-3 text-white font-bold">{trf.voucherNo}</td>
                              <td className="p-3 text-slate-300">{trf.sourceSite}</td>
                              <td className="p-3 text-amber-400 font-bold">{trf.destinationSite}</td>
                              <td className="p-3 text-emerald-400 font-bold">
                                {trf.quantity} {trf.unit} - <span className="text-slate-300 font-normal">{trf.materialName}</span>
                              </td>
                              <td className="p-3 text-slate-300">
                                {trf.driverName} <span className="text-slate-500 font-bold">({trf.truckPlate})</span>
                              </td>
                              <td className="p-3 text-slate-400 text-[10px]">{trf.transferDate}</td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                                  trf.status === "In Transit" ? "bg-amber-950 text-amber-300 border-amber-800" :
                                  trf.status === "Verified & Received" ? "bg-emerald-950 text-emerald-300 border-emerald-800" :
                                  trf.status === "Dispatched" ? "bg-cyan-950 text-cyan-300 border-cyan-800" :
                                  "bg-slate-800 text-slate-300 border-slate-700"
                                }`}>
                                  {trf.status}
                                </span>
                              </td>
                              <td className="p-3 text-right">
                                {trf.status === "Pending Approval" && (
                                  <button
                                    onClick={() => handleApproveTransferVoucher(trf.id)}
                                    className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-[10px] font-black uppercase cursor-pointer"
                                  >
                                    Approve
                                  </button>
                                )}
                                {trf.status === "In Transit" && (
                                  <button
                                    onClick={() => handleConfirmTransferReceived(trf.id)}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-black uppercase cursor-pointer"
                                  >
                                    Verify Received
                                  </button>
                                )}
                                {trf.status === "Verified & Received" && (
                                  <span className="text-[10px] text-emerald-400 font-bold flex items-center justify-end gap-1">
                                    <Check size={12} /> Received
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 3: SUPPLIER DELIVERY SCHEDULES */}
            {(warehouseTabFilter === "all" || warehouseTabFilter === "suppliers") && (
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <h2 className="text-sm font-black uppercase text-cyan-400 flex items-center space-x-2">
                    <Calendar size={18} />
                    <span>{isAmharic ? "የአቅራቢዎች ደረሰኝ እና የእቃዎች አቅርቦት ቀጠሮ (Supplier Delivery Schedules & Intake)" : "Supplier Material Delivery Schedules"}</span>
                  </h2>
                  <span className="text-[10px] font-mono text-slate-400">{supplierSchedules.length} Shipments Listed</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {supplierSchedules
                    .filter(sup => 
                      warehouseSearch === "" ||
                      sup.poNumber.toLowerCase().includes(warehouseSearch.toLowerCase()) ||
                      sup.supplierName.toLowerCase().includes(warehouseSearch.toLowerCase()) ||
                      sup.materialName.toLowerCase().includes(warehouseSearch.toLowerCase())
                    )
                    .map(sup => (
                      <div key={sup.id} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-3">
                        <div>
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-xs font-black text-amber-400 font-mono">{sup.poNumber}</span>
                              <h3 className="text-sm font-extrabold text-white mt-0.5">{sup.supplierName}</h3>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black font-mono border ${
                              sup.status === "En Route" ? "bg-amber-950 text-amber-300 border-amber-800 animate-pulse" :
                              sup.status === "Arrived Gate" ? "bg-cyan-950 text-cyan-300 border-cyan-800" :
                              sup.status === "Inspected & Received" ? "bg-emerald-950 text-emerald-300 border-emerald-800" :
                              "bg-slate-800 text-slate-300 border-slate-700"
                            }`}>
                              {sup.status}
                            </span>
                          </div>

                          <div className="mt-3 bg-slate-900 p-2.5 rounded-xl border border-slate-800/80 grid grid-cols-2 gap-2 text-[10px] font-mono">
                            <div>
                              <span className="text-slate-500 block">Material Cargo:</span>
                              <span className="font-bold text-emerald-400">{sup.quantity} {sup.unit} {sup.materialName}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 block">Expected Arrival:</span>
                              <span className="font-bold text-white">{sup.expectedArrival}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 block">Delivery Bay:</span>
                              <span className="font-bold text-amber-400">{sup.deliveryBay}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 block">Gate Pass Code:</span>
                              <span className="font-bold text-slate-300">{sup.gatePassCode}</span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-900 flex items-center justify-between">
                          <span className="text-[10px] text-slate-400 font-mono">
                            Contact: {sup.contactPerson} ({sup.phone})
                          </span>

                          <div className="flex items-center space-x-2">
                            {sup.status === "Scheduled" && (
                              <button
                                onClick={() => handleMarkSupplierArrived(sup.id)}
                                className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-[10px] font-black uppercase cursor-pointer"
                              >
                                Mark Arrived
                              </button>
                            )}

                            {(sup.status === "Arrived Gate" || sup.status === "En Route") && (
                              <button
                                onClick={() => handleScanReceiveSupplierCargo(sup.id)}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-black uppercase cursor-pointer flex items-center gap-1"
                              >
                                <CheckCircle2 size={12} />
                                <span>Inspect & Credit Yard Stock</span>
                              </button>
                            )}

                            {sup.status === "Inspected & Received" && (
                              <span className="text-[10px] text-emerald-400 font-bold font-mono flex items-center gap-1">
                                <Check size={12} /> Credited to Central Stock
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 1. STORE DASHBOARD */}
        {activeTab === "dashboard" && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* Real-time KPI Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col justify-between">
                <span className="text-[10px] font-black uppercase text-slate-400">{t("totalMaterials")}</span>
                <span className="text-xl font-mono font-black text-white mt-2">{totalMaterialStockSum.toLocaleString()}</span>
                <span className="text-[9px] text-slate-500 mt-1">Across 10 site store categories</span>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col justify-between">
                <span className="text-[10px] font-black uppercase text-slate-400">{t("formworkPanels")}</span>
                <span className="text-xl font-mono font-black text-amber-400 mt-2">{totalFormworkPanelsCount} Pcs</span>
                <span className="text-[9px] text-slate-500 mt-1">Active aluminum formwork panels</span>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col justify-between">
                <span className="text-[10px] font-black uppercase text-slate-400">{t("availableStock")}</span>
                <span className="text-xl font-mono font-black text-emerald-400 mt-2">{availableStockSum.toLocaleString()}</span>
                <span className="text-[9px] text-emerald-500 mt-1">Ready for immediate issue</span>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col justify-between">
                <span className="text-[10px] font-black uppercase text-slate-400">{t("reservedStock")}</span>
                <span className="text-xl font-mono font-black text-blue-400 mt-2">{reservedStockSum.toLocaleString()}</span>
                <span className="text-[9px] text-slate-500 mt-1">Allocated to active zones</span>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col justify-between">
                <span className="text-[10px] font-black uppercase text-slate-400">{t("lowStockAlerts")}</span>
                <span className={`text-xl font-mono font-black mt-2 ${lowStockCount > 0 ? "text-red-400 animate-pulse" : "text-emerald-400"}`}>
                  {lowStockCount} Items
                </span>
                <span className="text-[9px] text-slate-500 mt-1">Below minimum threshold</span>
              </div>
            </div>

            {/* Secondary Operational Status Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 font-mono text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-[9px] text-slate-500 uppercase font-bold block">{t("incomingMaterials")}</span>
                <span className="text-sm font-black text-emerald-400 mt-1 block">520 Pcs</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-[9px] text-slate-500 uppercase font-bold block">{t("outgoingMaterials")}</span>
                <span className="text-sm font-black text-amber-400 mt-1 block">430 Pcs</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-[9px] text-slate-500 uppercase font-bold block">{t("returnedMaterials")}</span>
                <span className="text-sm font-black text-blue-400 mt-1 block">28 Pcs</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-[9px] text-slate-500 uppercase font-bold block">{t("cleaningQueue")}</span>
                <span className="text-sm font-black text-purple-400 mt-1 block">{cleaningQueueCount} Pcs</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-[9px] text-slate-500 uppercase font-bold block">{t("repairQueue")}</span>
                <span className="text-sm font-black text-amber-400 mt-1 block">{repairQueueCount} Pcs</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-[9px] text-slate-500 uppercase font-bold block">{t("damagedMaterials")}</span>
                <span className="text-sm font-black text-red-400 mt-1 block">{damagedPanelsCount} Pcs</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-[9px] text-slate-500 uppercase font-bold block">{t("missingMaterials")}</span>
                <span className="text-sm font-black text-red-500 mt-1 block">{missingPanelsCount} Pcs</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-[9px] text-slate-500 uppercase font-bold block">{t("dailyRequests")}</span>
                <span className="text-sm font-black text-slate-100 mt-1 block">{materialRequests.length} Active</span>
              </div>
            </div>

            {/* AI Alert & Forecast Panel */}
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-purple-950/80 border border-purple-800 rounded-xl text-purple-400">
                  <Sparkles size={22} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase text-white tracking-widest">{t("aiStockForecast")}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {isAmharic 
                      ? "AI ትንበያ፡ በሚቀጥሉት 3 ቀናት ውስጥ የሲሚንቶ እና የRelease Oil ክምችት ስለሚያልቅ አዲስ ትዕዛዝ ይስጡ።" 
                      : "AI Alert: Cement and Release Oil stock projected to breach min threshold in 3 days based on Floor 4 casting schedule."}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveTab("ai-analytics")}
                className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                {isAmharic ? "AI ዝርዝር ይመልከቱ" : "View AI Insights"}
              </button>
            </div>

          </div>
        )}

        {/* 1. CROSS-SITE FORMWORK PANEL & ACCESSORIES BREAKDOWN */}
        {activeTab === "site-panel-breakdown" && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-black uppercase text-white flex items-center space-x-2">
                  <Box className="text-amber-400" size={20} />
                  <span>{isAmharic ? "በየሳይቱ ያሉ የፓነል አይነቶች እና ዝርዝሮች (Cross-Site Live Status)" : "Cross-Site Formwork Panel & Accessories Breakdown"}</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  {isAmharic 
                    ? "ከሳይት በሚላከው እለታዊ ሪፖርት መሰረት በየሳይቱ ያሉትን የፓነል አይነቶች፣ መጠኖች፣ የተገጠሙ፣ በስቶር ያሉ፣ የተጎዱ እና የጠፉ አውቶሜቲክ ማሳያ" 
                    : "Automatically updated panel types, specifications, allocated, installed, in-store, and damaged inventory across all sites"}
                </p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={sitePanelFilterSite}
                  onChange={(e) => setSitePanelFilterSite(e.target.value)}
                  className="bg-slate-900 border border-slate-800 text-white text-xs rounded-xl px-3 py-2 font-mono focus:outline-none focus:border-amber-500"
                >
                  <option value="ALL">{isAmharic ? "ሁሉንም ሳይቶች" : "All Construction Sites"}</option>
                  {registeredSitesList.map(s => (
                    <option key={s.id} value={s.projectName}>{s.projectName}</option>
                  ))}
                  {registeredSitesList.length === 0 && (
                    <>
                      <option value="Bole Heights Phase I">Bole Heights Phase I</option>
                      <option value="Kazanchis Financial Tower">Kazanchis Financial Tower</option>
                      <option value="Gotera Interchange Project">Gotera Interchange Project</option>
                      <option value="CMC Residential Complex">CMC Residential Complex</option>
                      <option value="Kilinto Industrial Zone">Kilinto Industrial Zone</option>
                    </>
                  )}
                </select>

                <select
                  value={sitePanelFilterType}
                  onChange={(e) => setSitePanelFilterType(e.target.value)}
                  className="bg-slate-900 border border-slate-800 text-white text-xs rounded-xl px-3 py-2 font-mono focus:outline-none focus:border-amber-500"
                >
                  <option value="ALL">{isAmharic ? "ሁሉንም የፓነል አይነቶች" : "All Panel & Accessory Types"}</option>
                  <option value="Standard Wall Panel">Standard Wall Panels</option>
                  <option value="Column Panel">Column Panels</option>
                  <option value="Deck Panel">Deck Panels</option>
                  <option value="Corner Profile">Corner Profiles</option>
                  <option value="Alignment Pin">Alignment Pins & Wedges</option>
                </select>
              </div>
            </div>

            {/* CROSS-SITE SUMMARY CARDS */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 font-mono text-xs">
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Total Allocated</span>
                <span className="text-base font-black text-white mt-1 block">
                  {sitePanelBreakdowns.reduce((acc, item) => acc + item.totalAllocated, 0).toLocaleString()} Pcs
                </span>
              </div>
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Installed On-Site</span>
                <span className="text-base font-black text-emerald-400 mt-1 block">
                  {sitePanelBreakdowns.reduce((acc, item) => acc + item.installedCount, 0).toLocaleString()} Pcs
                </span>
              </div>
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">In Site Store</span>
                <span className="text-base font-black text-cyan-400 mt-1 block">
                  {sitePanelBreakdowns.reduce((acc, item) => acc + item.inStoreCount, 0).toLocaleString()} Pcs
                </span>
              </div>
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Damaged / Repair</span>
                <span className="text-base font-black text-amber-400 mt-1 block">
                  {sitePanelBreakdowns.reduce((acc, item) => acc + item.damagedCount, 0).toLocaleString()} Pcs
                </span>
              </div>
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">In Transit</span>
                <span className="text-base font-black text-indigo-400 mt-1 block">
                  {sitePanelBreakdowns.reduce((acc, item) => acc + item.inTransitCount, 0).toLocaleString()} Pcs
                </span>
              </div>
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Missing / Lost</span>
                <span className="text-base font-black text-rose-400 mt-1 block">
                  {sitePanelBreakdowns.reduce((acc, item) => acc + item.missingCount, 0).toLocaleString()} Pcs
                </span>
              </div>
            </div>

            {/* BREAKDOWN TABLE */}
            <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                <span className="text-xs font-black uppercase text-white tracking-wider">
                  {isAmharic ? "በየሳይቱ ያሉ የፓነሎች ዝርዝር ማጠቃለያ" : "Detailed Site-by-Site Panel Inventory Matrix"}
                </span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-800 flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Auto-Synced from Site Daily Reports</span>
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900 border-b border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <th className="p-4">Site Name</th>
                      <th className="p-4">Panel / Accessory Type</th>
                      <th className="p-4">Dimensions</th>
                      <th className="p-4 text-center">Allocated</th>
                      <th className="p-4 text-center">Installed</th>
                      <th className="p-4 text-center">In Store</th>
                      <th className="p-4 text-center">Damaged</th>
                      <th className="p-4 text-center">Missing</th>
                      <th className="p-4 text-center">Condition</th>
                      <th className="p-4">Last Reported</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                    {sitePanelBreakdowns
                      .filter(item => sitePanelFilterSite === "ALL" || item.siteName === sitePanelFilterSite)
                      .filter(item => sitePanelFilterType === "ALL" || item.panelType.toLowerCase().includes(sitePanelFilterType.toLowerCase()))
                      .map(item => (
                        <tr key={item.id} className="hover:bg-slate-900/40 text-slate-200">
                          <td className="p-4 font-sans font-bold text-white flex items-center space-x-1.5">
                            <Building2 size={13} className="text-amber-400" />
                            <span>{item.siteName}</span>
                          </td>
                          <td className="p-4 font-sans font-semibold text-cyan-300">{item.panelType}</td>
                          <td className="p-4 text-slate-400">{item.dimensions}</td>
                          <td className="p-4 text-center font-bold text-white">{item.totalAllocated}</td>
                          <td className="p-4 text-center font-bold text-emerald-400">{item.installedCount}</td>
                          <td className="p-4 text-center font-bold text-cyan-400">{item.inStoreCount}</td>
                          <td className="p-4 text-center font-bold text-amber-400">{item.damagedCount}</td>
                          <td className="p-4 text-center font-bold text-rose-400">{item.missingCount}</td>
                          <td className="p-4 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              item.conditionScore >= 95 ? "bg-emerald-950 text-emerald-400" :
                              item.conditionScore >= 90 ? "bg-cyan-950 text-cyan-400" :
                              "bg-amber-950 text-amber-400"
                            }`}>
                              {item.conditionScore}%
                            </span>
                          </td>
                          <td className="p-4 text-[10px] text-slate-400 font-sans">
                            <div className="font-bold text-slate-300">{item.lastReporter}</div>
                            <div className="text-[9px] text-slate-500 font-mono">{item.lastReportDate}</div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 2. MORNING MATERIAL REQUISITION MODULE */}
        {activeTab === "morning-requisitions" && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-black uppercase text-white flex items-center space-x-2">
                  <FileText className="text-emerald-400" size={20} />
                  <span>{isAmharic ? "የሳይት ስቶር የእቃዎች ጥያቄ እና ማፅደቂያ (Site Store Material Request & Approval Workflow)" : "Site Store Material Request & Approval Workflow"}</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  {isAmharic 
                    ? "አገጣጣሚ (Assembler) | የቡድን መሪ (Gang Chief) | የቡድን አስተባባሪ (Team Leader) | ሱፐርቫይዘር (Supervisor) | የክፍል ኃላፊ (Section Head)" 
                    : "Authorized Requisitions: Assembler -> Gang Chief -> Team Leader -> Supervisor -> Section Head -> Site Store Auto-Ledger"}
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowNewRequisitionModal(true)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center space-x-2 cursor-pointer shadow-md"
                >
                  <Plus size={14} />
                  <span>{isAmharic ? "አዲስ የእቃዎች ጥያቄ አስገባ" : "New Material Requisition"}</span>
                </button>
              </div>
            </div>

            {/* APPROVAL LIMITS & POLICY RULE CARDS */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-black uppercase text-amber-400 flex items-center space-x-1.5">
                  <ShieldCheck size={14} />
                  <span>{isAmharic ? "የኃላፊነት እና የማፅደቂያ ገደቦች ደንብ (Configurable Approval Rules & Limits)" : "Configurable Approval Rules & Quantity Limits"}</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Enforced by ERP Core</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs font-mono">
                {approvalRuleLimits.map(rule => (
                  <div key={rule.jobPosition} className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
                    <div className="font-bold text-white text-[11px] font-sans">{rule.amharicTitle}</div>
                    <div className="text-[10px] text-emerald-400 mt-1">
                      Limit: <strong className="text-white">{rule.maxQtyWithoutApproval.toLocaleString()} Pcs</strong>
                    </div>
                    <div className="text-[9px] text-slate-400 mt-0.5 font-sans truncate">
                      {rule.requiresHigherApproval ? `Approver: ${rule.approverRoleRequired}` : "Direct Store Issue"}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* REQUISITION REGISTER TABLE */}
            <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-black uppercase text-white tracking-wider">
                    {isAmharic ? "የዛሬ የእቃዎች ጥያቄዎች መዝገብ" : "Live Material Requisitions Register"}
                  </span>
                  <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 rounded-full text-[10px] font-bold border border-emerald-800">
                    {dailyRequisitions.length} Requests Active
                  </span>
                </div>
                <span className="text-[10px] font-mono text-cyan-400 flex items-center space-x-1">
                  <Radio size={12} className="animate-pulse" />
                  <span>HQ & Warehouse Broadcast Live</span>
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900 border-b border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <th className="p-4">Req No & Time</th>
                      <th className="p-4">Project & Location</th>
                      <th className="p-4">Requester & Position</th>
                      <th className="p-4">Material Details</th>
                      <th className="p-4 text-center">Priority & Return</th>
                      <th className="p-4 text-center">Stock & Signature</th>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4 text-right">Workflow Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                    {dailyRequisitions.map(req => (
                      <tr key={req.id} className="hover:bg-slate-900/40 text-slate-200">
                        <td className="p-4 font-bold text-amber-400">
                          <div>{req.id}</div>
                          <div className="text-[10px] text-slate-400 font-sans">{req.requestedAt}</div>
                          <span className="inline-block mt-1 px-1.5 py-0.2 bg-slate-900 text-purple-300 rounded text-[9px]">
                            {req.submissionMode || "Mobile App"}
                          </span>
                        </td>
                        <td className="p-4 font-sans font-bold text-white">
                          <div className="text-xs text-white">{req.siteName}</div>
                          <div className="text-[10px] text-cyan-400 font-mono mt-0.5">
                            {req.buildingNumber || "Bldg 01"} • {req.blockNumber} • {req.floorNumber} ({req.zoneNumber || "Zone 1"})
                          </div>
                        </td>
                        <td className="p-4 font-sans text-xs">
                          <div className="font-bold text-white">{req.requestedBy}</div>
                          <div className="text-[10px] text-slate-400 font-mono">ID: {req.employeeId || "EMP-102"}</div>
                          <span className="inline-block mt-0.5 px-2 py-0.5 bg-indigo-950 text-indigo-300 rounded text-[10px] font-bold border border-indigo-800">
                            {req.jobPosition}
                          </span>
                        </td>
                        <td className="p-4 font-mono text-xs">
                          <div className="font-bold text-amber-300 font-sans">{req.materialName}</div>
                          <div className="text-[10px] text-slate-400">Type: {req.materialType} ({req.materialSize})</div>
                          <div className="text-[11px] text-emerald-400 font-bold mt-1">
                            Req: {req.quantityRequested} {req.unit} | Issued: {req.quantityIssued} {req.unit}
                          </div>
                        </td>
                        <td className="p-4 text-center font-sans">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            req.priority === "Emergency" ? "bg-rose-950 text-rose-400 border border-rose-800" :
                            req.priority === "Urgent" ? "bg-amber-950 text-amber-400 border border-amber-800" :
                            "bg-slate-900 text-slate-300 border border-slate-800"
                          }`}>
                            {req.priority}
                          </span>
                          <div className="text-[9px] text-slate-400 mt-1 font-mono">
                            Return: {req.expectedReturnDate || "2026-07-23"}
                          </div>
                        </td>
                        <td className="p-4 text-center font-sans text-xs">
                          <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 rounded text-[10px] font-bold border border-emerald-800">
                            {req.stockAvailability || "In Stock"}
                          </span>
                          <div className="text-[9px] text-slate-400 mt-1 font-mono truncate max-w-[130px]">
                            {req.gpsLocation || "8.9806° N, 38.7578° E"}
                          </div>
                          <div className="text-[9px] text-cyan-400 font-mono mt-0.5">
                            {req.receiverSignature ? "✓ Signed" : "Pending Signature"}
                          </div>
                        </td>
                        <td className="p-4 text-center font-sans">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                            req.status === "Approved" ? "bg-emerald-950 text-emerald-400 border border-emerald-800" :
                            req.status === "Issued" ? "bg-cyan-950 text-cyan-400 border border-cyan-800" :
                            req.status === "Rejected" ? "bg-rose-950 text-rose-400 border border-rose-800" :
                            "bg-amber-950 text-amber-400 border border-amber-800"
                          }`}>
                            {req.status}
                          </span>
                          <div className="text-[9px] text-slate-400 mt-1 font-mono">
                            {req.approvedBy}
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          {req.status === "Pending Approval" && (
                            <div className="flex justify-end space-x-1">
                              <button
                                onClick={() => {
                                  setDailyRequisitions(prev => prev.map(r => r.id === req.id ? { 
                                    ...r, 
                                    status: "Approved", 
                                    approvedBy: "Eng. Kassa Hunegn (Supervisor)",
                                    quantityIssued: r.quantityRequested
                                  } : r));
                                  onLogAction?.("Requisition Approved", `Approved material request ${req.id} for ${req.quantityRequested} ${req.unit}`);
                                }}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold cursor-pointer"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => {
                                  setDailyRequisitions(prev => prev.map(r => r.id === req.id ? { 
                                    ...r, 
                                    status: "Rejected", 
                                    approvedBy: "Rejected by Supervisor (Limit Exceeded)" 
                                  } : r));
                                  onLogAction?.("Requisition Rejected", `Rejected material request ${req.id}`);
                                }}
                                className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold cursor-pointer"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                          {req.status === "Approved" && (
                            <button
                              onClick={() => {
                                setDailyRequisitions(prev => prev.map(r => r.id === req.id ? { 
                                  ...r, 
                                  status: "Issued", 
                                  issuedBy: "Abebe Storekeeper",
                                  qrScanVerified: true,
                                  receiverSignature: `Fingerprint Signature Captured (${req.requestedBy})`
                                } : r));
                                onLogAction?.("Materials Issued via QR", `Scanned QR & issued ${req.quantityRequested} ${req.unit} for ${req.id}. Auto-deducted from store stock.`);
                              }}
                              className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-[10px] font-bold cursor-pointer flex items-center space-x-1 ml-auto"
                            >
                              <QrCode size={12} />
                              <span>Scan & Issue</span>
                            </button>
                          )}
                          {req.status === "Issued" && (
                            <div className="text-[10px] text-emerald-400 font-mono font-bold flex items-center justify-end space-x-1">
                              <CheckCircle2 size={12} />
                              <span>Issued & Synced</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* END OF DAY CONSUMPTION VARIANCE MATRIX */}
            <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden space-y-2">
              <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                <div>
                  <h3 className="text-xs font-black uppercase text-amber-400 tracking-wider">
                    {isAmharic ? "የቀን ማጠቃለያ የፍጆታ እና ልዩነት ሰንጠረዥ (Daily Consumption & Variance Matrix)" : "Daily Material Consumption & Variance Matrix"}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                    Compares Requested Qty vs Issued Qty vs Used Qty vs Returned Qty vs Lost Qty vs Damaged Qty
                  </p>
                </div>
                <span className="text-[10px] font-mono text-slate-400">Variance Calculation: Automatic</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse font-mono">
                  <thead>
                    <tr className="bg-slate-900 border-b border-slate-800 text-[10px] font-black uppercase text-slate-400">
                      <th className="p-3">Req ID</th>
                      <th className="p-3">Material Name</th>
                      <th className="p-3 text-center">Requested</th>
                      <th className="p-3 text-center">Issued</th>
                      <th className="p-3 text-center text-emerald-400">Used</th>
                      <th className="p-3 text-center text-cyan-400">Returned</th>
                      <th className="p-3 text-center text-rose-400">Lost</th>
                      <th className="p-3 text-center text-amber-400">Damaged</th>
                      <th className="p-3 text-center font-bold">Variance %</th>
                      <th className="p-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-xs">
                    {dailyConsumptionVariances.map(v => (
                      <tr key={v.id} className="hover:bg-slate-900/40 text-slate-200">
                        <td className="p-3 font-bold text-amber-400">{v.requisitionId}</td>
                        <td className="p-3 font-sans font-semibold text-white">{v.materialName}</td>
                        <td className="p-3 text-center">{v.quantityRequested}</td>
                        <td className="p-3 text-center text-cyan-300 font-bold">{v.quantityIssued}</td>
                        <td className="p-3 text-center text-emerald-400 font-bold">{v.quantityUsed}</td>
                        <td className="p-3 text-center text-cyan-400 font-bold">{v.quantityReturned}</td>
                        <td className="p-3 text-center text-rose-400 font-bold">{v.quantityLost}</td>
                        <td className="p-3 text-center text-amber-400 font-bold">{v.quantityDamaged}</td>
                        <td className="p-3 text-center font-bold text-purple-300">{v.variancePercent}%</td>
                        <td className="p-3 text-center font-sans">
                          <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 rounded text-[10px] font-bold border border-emerald-800">
                            {v.varianceStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* PERMANENT REQUISITION AUDIT TRAIL LOG */}
            <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                <span className="text-xs font-black uppercase text-cyan-400 tracking-wider flex items-center space-x-1.5">
                  <Shield size={14} />
                  <span>{isAmharic ? "የማይሰረዝ የኦዲት መዝገብ (Immutable Requisition Audit Log)" : "Immutable Requisition Audit Log"}</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Permanent Firestore Ledger Records</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse font-mono">
                  <thead>
                    <tr className="bg-slate-900 border-b border-slate-800 text-[10px] font-black uppercase text-slate-400">
                      <th className="p-3">Audit ID</th>
                      <th className="p-3">Req ID</th>
                      <th className="p-3">Action</th>
                      <th className="p-3">Performed By</th>
                      <th className="p-3">Timestamp & GPS</th>
                      <th className="p-3">Digital Signature</th>
                      <th className="p-3">Inventory Delta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-[11px]">
                    {requisitionAuditLogs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-900/40 text-slate-300">
                        <td className="p-3 font-bold text-slate-400">{log.id}</td>
                        <td className="p-3 font-bold text-amber-400">{log.requisitionId}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 bg-purple-950 text-purple-300 rounded text-[9px] font-bold border border-purple-800">
                            {log.action}
                          </span>
                        </td>
                        <td className="p-3 font-sans text-white">{log.performedBy} ({log.jobPosition})</td>
                        <td className="p-3 font-sans">
                          <div className="text-slate-300">{log.timestamp}</div>
                          <div className="text-[9px] text-slate-500 font-mono">{log.gpsLocation}</div>
                        </td>
                        <td className="p-3 font-mono text-cyan-400 text-[10px]">{log.digitalSignature}</td>
                        <td className="p-3 font-bold text-emerald-400">{log.ledgerDelta}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 3. EVENING DISMANTLING & RETURN REPORT MODULE */}
        {activeTab === "evening-returns" && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-black uppercase text-white flex items-center space-x-2">
                  <RotateCcw className="text-purple-400" size={20} />
                  <span>{isAmharic ? "የማታ ዘገባ & እቃዎች መመለሻ (Evening Dismantling & Return Logs)" : "Daily Dismantling & Return Reporting"}</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  {isAmharic 
                    ? "ከምሽቱ 11፡00 ሰአት የቡድን መሪዎች የተፈቱ እና የተመለሱ፣ የጠፉ እና የተጎዱ እቃዎችን ማስመዝገቢያ" 
                    : "5:00 PM Dismantling Return: Report returned, lost, and damaged accessories with photo proof and digital signatures"}
                </p>
              </div>

              <button
                onClick={() => setShowNewReturnModal(true)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center space-x-2 cursor-pointer shadow-md"
              >
                <Plus size={14} />
                <span>{isAmharic ? "አዲስ የማታ ዘገባ አስገባ" : "New Evening Return Log"}</span>
              </button>
            </div>

            {/* RETURN REGISTER TABLE */}
            <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                <span className="text-xs font-black uppercase text-white tracking-wider">
                  {isAmharic ? "የማታ የመለሱ እቃዎች እና የጉዳት/ኪሳራ ዘገባዎች" : "Evening Dismantling Return Register"}
                </span>
                <span className="text-[10px] font-mono text-purple-400">
                  Return Audits Logged: {dailyReturnReports.length}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900 border-b border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <th className="p-4">Return ID</th>
                      <th className="p-4">Requisition Ref</th>
                      <th className="p-4">Block & Floor</th>
                      <th className="p-4">Returned Items</th>
                      <th className="p-4">Lost Items</th>
                      <th className="p-4">Damaged Items</th>
                      <th className="p-4">Photo Evidence & Signatures</th>
                      <th className="p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                    {dailyReturnReports.map(ret => (
                      <tr key={ret.id} className="hover:bg-slate-900/40 text-slate-200">
                        <td className="p-4 font-bold text-purple-400">
                          <div>{ret.id}</div>
                          <div className="text-[10px] text-slate-500 font-sans">{ret.returnedAt}</div>
                        </td>
                        <td className="p-4 font-mono text-slate-400">{ret.requisitionId}</td>
                        <td className="p-4 font-sans font-bold text-white">
                          <div>{ret.siteName}</div>
                          <div className="text-[11px] text-cyan-400 font-mono">{ret.blockNumber} • {ret.floorNumber}</div>
                        </td>
                        <td className="p-4 text-emerald-400 font-mono text-[11px]">
                          <div>Pins: {ret.pinsReturned}</div>
                          <div>Wedges: {ret.wedgesReturned}</div>
                          <div>Tie Rods: {ret.tieRodsReturned}</div>
                        </td>
                        <td className="p-4 text-rose-400 font-mono text-[11px] font-bold">
                          <div>Pins: {ret.pinsLost}</div>
                          <div>Wedges: {ret.wedgesLost}</div>
                          <div>Tie Rods: {ret.tieRodsLost}</div>
                        </td>
                        <td className="p-4 text-amber-400 font-mono text-[11px] font-bold">
                          <div>Pins: {ret.pinsDamaged}</div>
                          <div>Wedges: {ret.wedgesDamaged}</div>
                          <div>Tie Rods: {ret.tieRodsDamaged}</div>
                        </td>
                        <td className="p-4 font-sans text-[10px]">
                          <div className="flex items-center space-x-1.5 text-emerald-400 font-bold">
                            <CheckCircle2 size={12} />
                            <span>Gang Chief Signed</span>
                          </div>
                          <div className="flex items-center space-x-1.5 text-cyan-400 font-bold">
                            <CheckCircle2 size={12} />
                            <span>Storekeeper Verified</span>
                          </div>
                          {(ret.photoEvidence || ret.photoUploaded) ? (
                            <div className="mt-2 flex items-center space-x-2">
                              <div 
                                onClick={() => setSelectedPhotoReturn(ret)}
                                className="relative group cursor-pointer overflow-hidden rounded-lg border border-amber-500/40 w-16 h-11 bg-slate-900 shrink-0 shadow-sm hover:border-amber-400 transition-all"
                              >
                                <img 
                                  src={ret.photoUrl || "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=300&auto=format&fit=crop"} 
                                  alt="Return evidence photo"
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                  referrerPolicy="no-referrer"
                                />
                                <div className="absolute inset-0 bg-slate-950/40 group-hover:bg-slate-950/10 flex items-center justify-center transition-colors">
                                  <Camera size={14} className="text-amber-300 drop-shadow-md" />
                                </div>
                              </div>
                              <button 
                                onClick={() => setSelectedPhotoReturn(ret)}
                                className="text-[10px] font-bold text-amber-300 hover:text-amber-200 bg-amber-950/80 hover:bg-amber-900 px-2.5 py-1.5 rounded-lg border border-amber-800/80 cursor-pointer flex items-center space-x-1 transition-all shadow-sm"
                              >
                                <Eye size={12} />
                                <span>View Photo</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-500 text-[10px] italic mt-1 block">No photo attached</span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-amber-950 text-amber-400 border border-amber-800">
                            {ret.status}
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

        {/* 4. DAILY AUTOMATED SITE CONSOLIDATED REPORTS MODULE */}
        {activeTab === "daily-auto-reports" && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-black uppercase text-white flex items-center space-x-2">
                  <BarChart3 className="text-cyan-400" size={20} />
                  <span>{isAmharic ? "የሳይት እለታዊ ማጠቃለያ ሪፖርት (Automatic HQ Transmit)" : "Automated Site Daily Consolidated Reports"}</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  {isAmharic 
                    ? "በየቀኑ ከምሽቱ 12፡00 ሰአት አውቶሜቲክ ተዘጋጅቶ ለዋና መጋዘን ስራ አስኪያጅ እና ለዋና መስሪያ ቤት (Head Office) የሚላክ ሪፖርት" 
                    : "Auto-generated daily reports sent directly to Warehouse Manager & Head Office with material flow, loss values, and block breakdowns"}
                </p>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => alert("Daily Site Consolidated Report exported as PDF!")}
                  className="px-3.5 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer"
                >
                  <Printer size={14} />
                  <span>Export PDF</span>
                </button>
                <button
                  onClick={() => alert("Daily Site Consolidated Report exported as Excel!")}
                  className="px-3.5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer"
                >
                  <FileSpreadsheet size={14} />
                  <span>Export Excel</span>
                </button>
              </div>
            </div>

            {/* CONSOLIDATED REPORT CARDS */}
            {dailyConsolidatedReports.map(dcr => (
              <div key={dcr.id} className="p-5 bg-slate-950 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-[10px] font-mono text-cyan-400 uppercase font-bold block">{dcr.id} • {dcr.date}</span>
                    <h3 className="text-base font-black text-white">{dcr.siteName} — {dcr.projectName}</h3>
                    <p className="text-xs text-slate-400">Site Storekeeper: {dcr.siteStoreOwner}</p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="px-3 py-1 bg-emerald-950 border border-emerald-800 text-emerald-400 text-xs font-mono font-bold rounded-full flex items-center space-x-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                      <span>{dcr.syncStatus}</span>
                    </span>
                  </div>
                </div>

                {/* METRICS ROW */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 font-mono text-xs">
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Total Items Issued</span>
                    <span className="text-sm font-black text-white mt-1 block">{dcr.totalItemsIssued} Pcs</span>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Items Returned</span>
                    <span className="text-sm font-black text-emerald-400 mt-1 block">{dcr.totalItemsReturned} Pcs</span>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Items Lost</span>
                    <span className="text-sm font-black text-rose-400 mt-1 block">{dcr.totalItemsLost} Pcs</span>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Loss Financial Value</span>
                    <span className="text-sm font-black text-amber-400 mt-1 block">ETB {dcr.totalLossValueETB.toLocaleString()}</span>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Transmitted To HQ</span>
                    <span className="text-[10px] text-slate-300 mt-1 block font-sans">{dcr.sentToHeadOfficeAt}</span>
                  </div>
                </div>

                {/* MATERIAL FLOW SUMMARY TABLE */}
                <div className="border border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-900 border-b border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <th className="p-3">Material Category</th>
                        <th className="p-3 text-center">Opening</th>
                        <th className="p-3 text-center">Received</th>
                        <th className="p-3 text-center">Issued</th>
                        <th className="p-3 text-center">Returned</th>
                        <th className="p-3 text-center">Lost</th>
                        <th className="p-3 text-center">Damaged</th>
                        <th className="p-3 text-center">Closing Stock</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                      {dcr.materialSummaries.map((mat, idx) => (
                        <tr key={idx} className="hover:bg-slate-900/40 text-slate-200">
                          <td className="p-3 font-sans font-bold text-white">{mat.materialName}</td>
                          <td className="p-3 text-center text-slate-400">{mat.openingStock}</td>
                          <td className="p-3 text-center text-emerald-400">{mat.received}</td>
                          <td className="p-3 text-center text-amber-400">{mat.issued}</td>
                          <td className="p-3 text-center text-cyan-400">{mat.returned}</td>
                          <td className="p-3 text-center text-rose-400 font-bold">{mat.lost}</td>
                          <td className="p-3 text-center text-amber-300 font-bold">{mat.damaged}</td>
                          <td className="p-3 text-center text-white font-bold">{mat.closingStock}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 5. MATERIAL RECEIVING MODULE */}
        {activeTab === "receiving" && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-black uppercase text-white">Material Receiving Register</h2>
                <p className="text-xs text-slate-400">{isAmharic ? "ከመጋዘን፣ ከአቅራቢዎች እና ከሌሎች ሳይቶች የመጡ እቃዎችን መረከቢያ" : "Verify Batch, Bundle, Serial, QR Code, GPS & Digital Signature"}</p>
              </div>

              <button
                onClick={() => setShowReceiveModal(true)}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center space-x-2 cursor-pointer shadow-md"
              >
                <Plus size={14} />
                <span>{isAmharic ? "አዲስ እቃ ተቀበል" : "Receive Shipment"}</span>
              </button>
            </div>

            {/* Receiving Table */}
            <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900 border-b border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <th className="p-4">Report ID</th>
                      <th className="p-4">Material Name</th>
                      <th className="p-4">Quantity</th>
                      <th className="p-4">Source</th>
                      <th className="p-4">Batch / Bundle</th>
                      <th className="p-4">Driver & Truck</th>
                      <th className="p-4">GPS Verification</th>
                      <th className="p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                    {receivingReports.map(rep => (
                      <tr key={rep.id} className="hover:bg-slate-900/40 text-slate-200">
                        <td className="p-4 font-bold text-slate-400">{rep.id}</td>
                        <td className="p-4 font-sans font-bold text-white">{rep.materialName}</td>
                        <td className="p-4 font-black text-emerald-400">{rep.quantity} {rep.unit}</td>
                        <td className="p-4"><span className="px-2 py-0.5 bg-slate-900 border border-slate-800 rounded text-[10px] font-bold">{rep.source}</span></td>
                        <td className="p-4 text-slate-400">{rep.batchNumber} / {rep.bundleNumber}</td>
                        <td className="p-4 font-sans text-slate-300">{rep.driverName} ({rep.truckPlate})</td>
                        <td className="p-4 text-[10px] text-slate-400 flex items-center space-x-1">
                          <MapPin size={12} className="text-emerald-400" />
                          <span>{rep.gpsLocation}</span>
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-900 rounded text-[10px] font-black uppercase flex items-center space-x-1 w-fit">
                            <CheckCircle2 size={10} />
                            <span>Received</span>
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

        {/* 3. MATERIAL ISSUE MODULE */}
        {activeTab === "issue" && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-black uppercase text-white">Material Issue Log (Dispatch to Site)</h2>
                <p className="text-xs text-slate-400">{isAmharic ? "ለኢንጂነሮች፣ ለሱፐርቫይዘሮች እና ለጋንግ ቺፎች እቃዎችን ማስረከቢያ" : "Track receiver name, building, floor, zone & reduce stock automatically"}</p>
              </div>

              <button
                onClick={() => setShowIssueModal(true)}
                className="px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center space-x-2 cursor-pointer shadow-md"
              >
                <ArrowRightLeft size={14} />
                <span>{isAmharic ? "እቃዎች አስረክብ" : "Issue to Site"}</span>
              </button>
            </div>

            {/* Issue Table */}
            <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900 border-b border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <th className="p-4">Issue ID</th>
                      <th className="p-4">Receiver</th>
                      <th className="p-4">Role / Dept</th>
                      <th className="p-4">Target Location</th>
                      <th className="p-4">Material Issued</th>
                      <th className="p-4">Quantity</th>
                      <th className="p-4">Issue Time</th>
                      <th className="p-4">Signature</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                    {issueRecords.map(iss => (
                      <tr key={iss.id} className="hover:bg-slate-900/40 text-slate-200">
                        <td className="p-4 font-bold text-slate-400">{iss.id}</td>
                        <td className="p-4 font-sans font-bold text-white">{iss.receiverName}</td>
                        <td className="p-4 text-slate-400">{iss.receiverRole} ({iss.department})</td>
                        <td className="p-4 text-slate-300 font-sans">{iss.building} - {iss.floor} ({iss.zone})</td>
                        <td className="p-4 font-sans font-bold text-amber-400">{iss.materialName}</td>
                        <td className="p-4 font-black text-white">{iss.quantity} {iss.unit}</td>
                        <td className="p-4 text-slate-400">{iss.issueDate}</td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-900 rounded text-[10px] font-bold flex items-center space-x-1 w-fit">
                            <PenTool size={10} />
                            <span>Signed</span>
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

        {/* 4. MATERIAL RETURNS MODULE */}
        {activeTab === "returns" && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h2 className="text-lg font-black uppercase text-white">Material Return & Condition Inspection</h2>
              <p className="text-xs text-slate-400">{isAmharic ? "ከሳይት የተመለሱ እቃዎችን ሁኔታ መመደቢያ (Good, Cleaning, Repair, Scrap)" : "Automated inventory reintegration based on physical inspection"}</p>
            </div>

            <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <th className="p-4">Return ID</th>
                    <th className="p-4">Material Name</th>
                    <th className="p-4">Quantity</th>
                    <th className="p-4">Returned By</th>
                    <th className="p-4">Classified Condition</th>
                    <th className="p-4">Inspection Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                  {returnRecords.map(ret => (
                    <tr key={ret.id} className="hover:bg-slate-900/40 text-slate-200">
                      <td className="p-4 font-bold text-slate-400">{ret.id}</td>
                      <td className="p-4 font-sans font-bold text-white">{ret.materialName}</td>
                      <td className="p-4 font-black text-blue-400">{ret.quantity} Pcs</td>
                      <td className="p-4 font-sans text-slate-300">{ret.returnedBy}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          ret.condition === "Good Condition" ? "bg-emerald-950 text-emerald-400" :
                          ret.condition === "Needs Cleaning" ? "bg-purple-950 text-purple-400" :
                          "bg-amber-950 text-amber-400"
                        }`}>
                          {ret.condition}
                        </span>
                      </td>
                      <td className="p-4 font-sans text-slate-400 text-[11px]">{ret.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 5. FORMWORK TRACKING MODULE */}
        {activeTab === "formwork-tracking" && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h2 className="text-lg font-black uppercase text-white">Aluminum Formwork Panel Tracking</h2>
              <p className="text-xs text-slate-400">{isAmharic ? "እያንዳንዱን የአሉሚኒየም ፓነል በቦታው፣ በፎቅ፣ በዞን እና በኃላፊ ሰው መከታተያ" : "Real-time panel status, serial numbers & current zone locations"}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 font-mono text-xs">
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Total Stocked Panels</span>
                <span className="text-lg font-black text-white mt-1 block">{totalFormworkPanelsCount} Pcs</span>
              </div>
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Installed at Building A</span>
                <span className="text-lg font-black text-emerald-400 mt-1 block">420 Pcs</span>
              </div>
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">In Transit / Dispatched</span>
                <span className="text-lg font-black text-blue-400 mt-1 block">150 Pcs</span>
              </div>
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">In Store Shed</span>
                <span className="text-lg font-black text-amber-400 mt-1 block">280 Pcs</span>
              </div>
            </div>
          </div>
        )}

        {/* 6. SITE STORE INVENTORY MODULE */}
        {activeTab === "inventory" && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-lg font-black uppercase text-white">Site Store Master Inventory</h2>
                <p className="text-xs text-slate-400">{isAmharic ? "10 የክፍል ዓይነቶች፡ ሲሚንቶ፣ ብረት፣ ፎርምወርክ፣ መሳርያዎች እና መለዋወጫዎች" : "10 Material Categories: Cement, Rebar, Formwork, Tools, Spare Parts"}</p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={e => setSearchFilter(e.target.value)}
                    placeholder={isAmharic ? "እቃ ፈልግ..." : "Search items..."}
                    className="bg-slate-950 border border-slate-800 text-xs pl-8 pr-3 py-1.5 rounded-xl text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <select
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-xs px-3 py-1.5 rounded-xl text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="All">All Categories</option>
                  <option value="Cement">Cement</option>
                  <option value="Rebar">Rebar</option>
                  <option value="Aluminum Panels">Aluminum Panels</option>
                  <option value="Beams">Beams</option>
                  <option value="Props">Props</option>
                  <option value="Brackets">Brackets</option>
                  <option value="Plywood">Plywood</option>
                  <option value="Tools">Tools</option>
                  <option value="Consumables">Consumables</option>
                  <option value="Spare Parts">Spare Parts</option>
                </select>
              </div>
            </div>

            {/* Inventory Table */}
            <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900 border-b border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <th className="p-4">Code / ID</th>
                      <th className="p-4">Material Name</th>
                      <th className="p-4">Category</th>
                      <th className="p-4">Total Stock</th>
                      <th className="p-4">Available</th>
                      <th className="p-4">Reserved</th>
                      <th className="p-4">Shed Location</th>
                      <th className="p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                    {filteredStoreItems.map(item => (
                      <tr key={item.id} className="hover:bg-slate-900/40 text-slate-200">
                        <td className="p-4 text-slate-400 font-bold">{item.code}</td>
                        <td className="p-4 font-sans font-bold text-white">{item.name}</td>
                        <td className="p-4"><span className="px-2 py-0.5 bg-slate-900 border border-slate-800 rounded text-[10px] font-bold">{item.category}</span></td>
                        <td className="p-4 font-black text-white">{item.totalStock} {item.unit}</td>
                        <td className="p-4 font-black text-emerald-400">{item.availableStock} {item.unit}</td>
                        <td className="p-4 text-blue-400">{item.reservedStock} {item.unit}</td>
                        <td className="p-4 font-sans text-slate-300">{item.warehouseLocation}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            item.status === "In Stock" ? "bg-emerald-950 text-emerald-400" : "bg-red-950 text-red-400"
                          }`}>
                            {item.status}
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

        {/* 7. INVENTORY AUDIT MODULE */}
        {activeTab === "audit" && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h2 className="text-lg font-black uppercase text-white">Store Inventory Audit & Physical Count Comparison</h2>
              <p className="text-xs text-slate-400">{isAmharic ? "በእጅ የተቆጠረ (Physical Count) ከስርዓቱ (System Count) ጋር ማነፃፀሪያ" : "Auto-generate discrepancy report and variance log"}</p>
            </div>

            <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <th className="p-4">Audit ID</th>
                    <th className="p-4">Audit Type</th>
                    <th className="p-4">Item Name</th>
                    <th className="p-4">Physical Count</th>
                    <th className="p-4">System Count</th>
                    <th className="p-4">Variance</th>
                    <th className="p-4">Auditor</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                  {auditRecords.map(aud => (
                    <tr key={aud.id} className="hover:bg-slate-900/40 text-slate-200">
                      <td className="p-4 text-slate-400 font-bold">{aud.id}</td>
                      <td className="p-4 font-sans font-bold text-white">{aud.auditType}</td>
                      <td className="p-4 font-sans text-slate-300">{aud.itemName}</td>
                      <td className="p-4 font-black text-emerald-400">{aud.physicalCount}</td>
                      <td className="p-4 font-black text-white">{aud.systemCount}</td>
                      <td className={`p-4 font-black ${aud.discrepancy === 0 ? "text-slate-400" : "text-red-400"}`}>{aud.discrepancy}</td>
                      <td className="p-4 font-sans text-slate-400">{aud.auditorName}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${aud.status === "Balanced" ? "bg-emerald-950 text-emerald-400" : "bg-red-950 text-red-400"}`}>
                          {aud.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 8. MATERIAL REQUEST WORKFLOW MODULE */}
        {activeTab === "requests" && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h2 className="text-lg font-black uppercase text-white">Material Request Approval Workflow</h2>
              <p className="text-xs text-slate-400">{isAmharic ? "ከሳይት መሃንዲሶችና ሱፐርቫይዘሮች የተላኩ የእቃዎች ጥያቄ ማፅደቂያ" : "Approve or Reject requests based on real-time stock availability"}</p>
            </div>

            <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <th className="p-4">Req ID</th>
                    <th className="p-4">Requester</th>
                    <th className="p-4">Target Site & Zone</th>
                    <th className="p-4">Material Requested</th>
                    <th className="p-4">Qty Needed</th>
                    <th className="p-4">Purpose</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                  {materialRequests.map(req => (
                    <tr key={req.id} className="hover:bg-slate-900/40 text-slate-200">
                      <td className="p-4 text-slate-400 font-bold">{req.id}</td>
                      <td className="p-4 font-sans font-bold text-white">{req.requesterName} ({req.requesterRole})</td>
                      <td className="p-4 font-sans text-slate-300">{req.building} - {req.floor}</td>
                      <td className="p-4 font-sans font-bold text-amber-400">{req.materialName}</td>
                      <td className="p-4 font-black text-white">{req.requestedQty} {req.unit}</td>
                      <td className="p-4 font-sans text-slate-400 text-[11px]">{req.purpose}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          req.status === "Approved" ? "bg-emerald-950 text-emerald-400" :
                          req.status === "Rejected" ? "bg-red-950 text-red-400" : "bg-amber-950 text-amber-400"
                        }`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="p-4">
                        {req.status === "Pending" ? (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleApproveRequest(req.id)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold cursor-pointer"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleRejectRequest(req.id)}
                              className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-bold cursor-pointer"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[10px]">Processed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 9. QR & BARCODE SYSTEM MODULE */}
        {activeTab === "qr-barcode" && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h2 className="text-lg font-black uppercase text-white">QR Code & Barcode Scanner / Generator</h2>
              <p className="text-xs text-slate-400">{isAmharic ? "QR እና Barcode በመስራትና በካሜራ በማንበብ እቃዎችን መለየያ" : "Simulated camera/laser scanner for store receiving and dispatch"}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Scan Simulator */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
                <h3 className="text-xs font-black uppercase text-amber-400 flex items-center space-x-2">
                  <Scan size={16} />
                  <span>Interactive Scanner Simulation</span>
                </h3>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Enter Code or Click Quick Test:</label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={scannedCode}
                      onChange={e => setScannedCode(e.target.value)}
                      placeholder="e.g. CEM-OPC-50 or ST-REB-16"
                      className="flex-grow bg-slate-900 border border-slate-800 text-xs px-3 py-2 rounded-xl text-white font-mono focus:outline-none focus:border-amber-500"
                    />
                    <button
                      onClick={() => handleSimulateScan(scannedCode || "CEM-OPC-50")}
                      className="px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold uppercase cursor-pointer"
                    >
                      Scan Code
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <button onClick={() => handleSimulateScan("CEM-OPC-50")} className="px-2.5 py-1 bg-slate-900 border border-slate-800 text-[10px] font-mono rounded text-slate-300 hover:border-amber-500 cursor-pointer">
                    Scan Cement (CEM-OPC-50)
                  </button>
                  <button onClick={() => handleSimulateScan("ST-REB-16")} className="px-2.5 py-1 bg-slate-900 border border-slate-800 text-[10px] font-mono rounded text-slate-300 hover:border-amber-500 cursor-pointer">
                    Scan Rebar (ST-REB-16)
                  </button>
                  <button onClick={() => handleSimulateScan("AL-PNL-1260")} className="px-2.5 py-1 bg-slate-900 border border-slate-800 text-[10px] font-mono rounded text-slate-300 hover:border-amber-500 cursor-pointer">
                    Scan Formwork (AL-PNL-1260)
                  </button>
                </div>

                {/* Scan Details Result */}
                {scanResult && (
                  <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 space-y-2 animate-fadeIn">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-emerald-400 flex items-center space-x-1">
                        <CheckCircle2 size={14} />
                        <span>Valid Code Verified</span>
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">{scanResult.code}</span>
                    </div>
                    <div className="text-xs font-sans font-bold text-white">{scanResult.name}</div>
                    <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-300">
                      <div>Total Stock: <span className="text-white font-bold">{scanResult.totalStock}</span></div>
                      <div>Available: <span className="text-emerald-400 font-bold">{scanResult.availableStock}</span></div>
                      <div>Location: <span className="text-amber-400">{scanResult.warehouseLocation}</span></div>
                      <div>Status: <span className="text-emerald-400">{scanResult.status}</span></div>
                    </div>
                  </div>
                )}
              </div>

              {/* QR Generator Mock */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
                <h3 className="text-xs font-black uppercase text-emerald-400 flex items-center space-x-2">
                  <QrCode size={16} />
                  <span>Generated Store Label QR</span>
                </h3>

                <div className="flex flex-col items-center justify-center p-6 bg-white rounded-xl text-slate-900 space-y-3">
                  <div className="p-4 border-4 border-slate-900 rounded-lg">
                    <QrCode size={96} className="text-slate-900" />
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-900 tracking-widest">BUILD-SYNC-STORE-2026</span>
                  <span className="text-[10px] font-sans font-semibold text-slate-600">Bole Heights Phase I Site Store Shed A</span>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* 10. NOTIFICATIONS MODULE */}
        {activeTab === "notifications" && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h2 className="text-lg font-black uppercase text-white">Automated Cross-Department System Alerts</h2>
              <p className="text-xs text-slate-400">{isAmharic ? "ለዋና መስሪያ ቤት፣ ለፋይናንስ፣ ለዋና መጋዘንና ለሳይት መሃንዲሶች የሚላኩ አውቶሜቲክ መልእክቶች" : "Real-time alerts for low stock, material arrivals, issues & damaged stock"}</p>
            </div>

            <div className="space-y-3">
              {[
                { title: "Low Stock Alert: Shuttering Plywood 18mm", time: "10 mins ago", type: "warning", desc: "Available stock (45 Sheets) is below minimum threshold (60 Sheets)." },
                { title: "Material Arrival: 400 Bags Dangote Cement Received", time: "1 hour ago", type: "info", desc: "Shipment REC-2026-102 verified by Storekeeper Abebe." },
                { title: "Material Issue: 350 K-Plates Issued to Floor 4", time: "2 hours ago", type: "success", desc: "Dispatched to Section Head Alemayehu Kebede. Stock updated." }
              ].map((notif, idx) => (
                <div key={idx} className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex items-start space-x-3">
                  <div className={`p-2 rounded-lg ${notif.type === "warning" ? "bg-amber-950 text-amber-400" : "bg-emerald-950 text-emerald-400"}`}>
                    <Bell size={16} />
                  </div>
                  <div className="flex-grow space-y-0.5">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-white">{notif.title}</span>
                      <span className="text-[10px] font-mono text-slate-500">{notif.time}</span>
                    </div>
                    <p className="text-xs text-slate-400 font-sans">{notif.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 11. REPORTS CENTER MODULE */}
        {activeTab === "reports" && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-black uppercase text-white">Store Reports Generator & PDF/Excel Export</h2>
                <p className="text-xs text-slate-400">{isAmharic ? "የእለታዊ ስቶር፣ የደረሰኝ፣ የመስረከቢያ፣ የጉዳትና የክምችት ሪፖርቶች" : "8 Official Store Reports ready for PDF and Excel export"}</p>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => alert("Store Inventory Report exported as PDF!")}
                  className="px-3.5 py-2 bg-red-600 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer"
                >
                  <Printer size={14} />
                  <span>Export PDF</span>
                </button>
                <button
                  onClick={() => alert("Store Inventory Report exported as Excel!")}
                  className="px-3.5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer"
                >
                  <FileSpreadsheet size={14} />
                  <span>Export Excel</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                "Daily Stock Report",
                "Material Receiving Report",
                "Material Issue Report",
                "Material Return Report",
                "Damage & Loss Report",
                "Missing Material Report",
                "Master Inventory Valuation",
                "Panel Location Report"
              ].map((repName, idx) => (
                <div key={idx} className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                  <FileText size={20} className="text-amber-400" />
                  <span className="text-xs font-bold text-white block">{repName}</span>
                  <span className="text-[10px] text-slate-500 block">Auto-generated for site audit</span>
                  <button
                    onClick={() => alert(`Generated ${repName}`)}
                    className="w-full mt-2 py-1 bg-slate-900 border border-slate-800 text-slate-300 text-[10px] font-bold rounded hover:bg-amber-600 hover:text-white transition cursor-pointer"
                  >
                    Generate
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 12. AI ANALYTICS MODULE */}
        {activeTab === "ai-analytics" && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h2 className="text-lg font-black uppercase text-white">AI Material Stock Analytics Engine</h2>
              <p className="text-xs text-slate-400">{isAmharic ? "የእቃዎች እጥረት ትንበያ፣ የስቶር ማዘዋወር ምክረ-ሐሳብ እና የፓነሎች መከታተያ AI" : "AI material shortage forecast, transfer recommendations & CAD usage comparison"}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-2">
                <Cpu size={24} className="text-purple-400" />
                <h3 className="text-xs font-bold text-white">Predicted Material Shortages</h3>
                <p className="text-xs text-slate-400">Plywood 18mm projected to deplete in 48 hours. Recommend PO placement.</p>
              </div>

              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-2">
                <ArrowRightLeft size={24} className="text-emerald-400" />
                <h3 className="text-xs font-bold text-white">Recommended Stock Transfers</h3>
                <p className="text-xs text-slate-400">Transfer 100 Props from Yeka Hills Site Store (Surplus) to Bole Site Store.</p>
              </div>

              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-2">
                <BarChart3 size={24} className="text-amber-400" />
                <h3 className="text-xs font-bold text-white">CAD Drawing vs Usage Check</h3>
                <p className="text-xs text-slate-400">Formwork panel usage matches CAD Floor 4 structural model with 99.2% accuracy.</p>
              </div>
            </div>
          </div>
        )}

        {/* 13. ROLE BASED ACCESS CONTROL MODULE */}
        {activeTab === "role-access" && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h2 className="text-lg font-black uppercase text-white">Role-Based Access Control (RBAC) Matrix</h2>
              <p className="text-xs text-slate-400">{isAmharic ? "ለተለያዩ የስራ ሃላፊነቶች (Admin, Finance, Site Eng, Gang Chief) የተሰጡ የስቶር ፈቃዶች" : "Enterprise permission tiers across store management functions"}</p>
            </div>

            <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <th className="p-4">User Role</th>
                    <th className="p-4">Store Access Tier</th>
                    <th className="p-4">Receive Stock</th>
                    <th className="p-4">Issue Stock</th>
                    <th className="p-4">Audit Approval</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {[
                    { role: "Admin / Head Office", tier: "Full Access", receive: "Yes", issue: "Yes", audit: "Yes" },
                    { role: "Store Manager / Store Owner", tier: "Full Access", receive: "Yes", issue: "Yes", audit: "Yes" },
                    { role: "Finance Manager", tier: "Financial Read-Only", receive: "No", issue: "No", audit: "Read" },
                    { role: "Site Engineer / Section Head", tier: "Site Zone Access", receive: "Confirm", issue: "Request", audit: "No" },
                    { role: "Gang Chief / Assembler", tier: "Zone Confirmation Only", receive: "No", issue: "Confirm", audit: "No" }
                  ].map((r, idx) => (
                    <tr key={idx} className="hover:bg-slate-900/40 text-slate-200">
                      <td className="p-4 font-sans font-bold text-white">{r.role}</td>
                      <td className="p-4 text-amber-400 font-bold">{r.tier}</td>
                      <td className="p-4 text-emerald-400">{r.receive}</td>
                      <td className="p-4 text-emerald-400">{r.issue}</td>
                      <td className="p-4 text-blue-400">{r.audit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 14. INTEGRATIONS & ERP SYNC MODULE */}
        {activeTab === "integrations" && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h2 className="text-lg font-black uppercase text-white">Real-Time ERP System Synchronization Matrix</h2>
              <p className="text-xs text-slate-400">{isAmharic ? "ከ16 የBuildSync ERP መተግበሪያዎች ጋር የቀጥታ የደመና መረጃ መለዋወጫ" : "Real-time synchronization across 16 BuildSync ERP modules"}</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono text-xs">
              {[
                "Admin App",
                "Head Office App",
                "Warehouse Manager App",
                "Finance Manager App",
                "Procurement Manager App",
                "Project Manager App",
                "Site Engineer App",
                "Section Head App",
                "Supervisor App",
                "Team Leader App",
                "Gang Chief App",
                "Surveyor App",
                "Attendance & Payroll",
                "CAD Drawing Module",
                "Drone Monitoring",
                "AI Digital Twin"
              ].map((mod, idx) => (
                <div key={idx} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                  <span className="font-sans font-bold text-white text-[11px]">{mod}</span>
                  <span className="flex items-center space-x-1 text-[10px] text-emerald-400 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    <span>Live</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* RECEIVE MATERIAL MODAL */}
      {showReceiveModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 animate-scaleUp text-slate-100">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black uppercase text-white flex items-center space-x-2">
                <Truck size={18} className="text-emerald-400" />
                <span>{isAmharic ? "የእቃዎች መቀበያ መመዝገቢያ" : "Receive Shipment into Store"}</span>
              </h3>
              <button onClick={() => setShowReceiveModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleReceiveMaterial} className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Material Name</label>
                <input
                  type="text"
                  required
                  value={receiveForm.materialName}
                  onChange={e => setReceiveForm({ ...receiveForm, materialName: e.target.value })}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Quantity</label>
                  <input
                    type="number"
                    required
                    value={receiveForm.quantity}
                    onChange={e => setReceiveForm({ ...receiveForm, quantity: Number(e.target.value) })}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Unit</label>
                  <input
                    type="text"
                    required
                    value={receiveForm.unit}
                    onChange={e => setReceiveForm({ ...receiveForm, unit: e.target.value })}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Driver Name</label>
                  <input
                    type="text"
                    required
                    value={receiveForm.driverName}
                    onChange={e => setReceiveForm({ ...receiveForm, driverName: e.target.value })}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Truck Plate</label>
                  <input
                    type="text"
                    required
                    value={receiveForm.truckPlate}
                    onChange={e => setReceiveForm({ ...receiveForm, truckPlate: e.target.value })}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowReceiveModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold cursor-pointer"
                >
                  Save & Notify ERP
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ISSUE MATERIAL MODAL */}
      {showIssueModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 animate-scaleUp text-slate-100">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black uppercase text-white flex items-center space-x-2">
                <ArrowRightLeft size={18} className="text-amber-400" />
                <span>{isAmharic ? "ለሳይት እቃዎችን ማስረከቢያ" : "Issue Material to Site"}</span>
              </h3>
              <button onClick={() => setShowIssueModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleIssueMaterial} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Receiver Name</label>
                  <input
                    type="text"
                    required
                    value={issueForm.receiverName}
                    onChange={e => setIssueForm({ ...issueForm, receiverName: e.target.value })}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Role</label>
                  <input
                    type="text"
                    required
                    value={issueForm.receiverRole}
                    onChange={e => setIssueForm({ ...issueForm, receiverRole: e.target.value })}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Material Name</label>
                <select
                  value={issueForm.materialName}
                  onChange={e => setIssueForm({ ...issueForm, materialName: e.target.value })}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500"
                >
                  {storeItems.map(i => (
                    <option key={i.id} value={i.name}>{i.name} (Available: {i.availableStock} {i.unit})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Quantity</label>
                  <input
                    type="number"
                    required
                    value={issueForm.quantity}
                    onChange={e => setIssueForm({ ...issueForm, quantity: Number(e.target.value) })}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Target Building / Floor</label>
                  <input
                    type="text"
                    required
                    value={`${issueForm.building} - ${issueForm.floor}`}
                    onChange={e => setIssueForm({ ...issueForm, building: e.target.value })}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowIssueModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold cursor-pointer"
                >
                  Dispatch & Update Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DISPATCH TRUCK MODAL */}
      {showDispatchTruckModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 animate-scaleUp text-slate-100">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black uppercase text-white flex items-center space-x-2">
                <Truck size={18} className="text-amber-400" />
                <span>{isAmharic ? "አዲስ የጭነት መኪና መላኪያ (Dispatch Truck Fleet)" : "Dispatch New Truck Fleet"}</span>
              </h3>
              <button onClick={() => setShowDispatchTruckModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleDispatchTruckSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Truck Plate No</label>
                  <input
                    type="text"
                    required
                    value={dispatchTruckForm.truckPlate}
                    onChange={e => setDispatchTruckForm({ ...dispatchTruckForm, truckPlate: e.target.value })}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Driver Name</label>
                  <input
                    type="text"
                    required
                    value={dispatchTruckForm.driverName}
                    onChange={e => setDispatchTruckForm({ ...dispatchTruckForm, driverName: e.target.value })}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Driver Phone</label>
                  <input
                    type="text"
                    required
                    value={dispatchTruckForm.driverPhone}
                    onChange={e => setDispatchTruckForm({ ...dispatchTruckForm, driverPhone: e.target.value })}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Estimated ETA</label>
                  <input
                    type="text"
                    required
                    value={dispatchTruckForm.eta}
                    onChange={e => setDispatchTruckForm({ ...dispatchTruckForm, eta: e.target.value })}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Cargo Material & Quantity</label>
                <input
                  type="text"
                  required
                  value={dispatchTruckForm.cargoType}
                  onChange={e => setDispatchTruckForm({ ...dispatchTruckForm, cargoType: e.target.value })}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Origin Depot</label>
                  <input
                    type="text"
                    required
                    value={dispatchTruckForm.origin}
                    onChange={e => setDispatchTruckForm({ ...dispatchTruckForm, origin: e.target.value })}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Destination Site Store</label>
                  <input
                    type="text"
                    required
                    value={dispatchTruckForm.destination}
                    onChange={e => setDispatchTruckForm({ ...dispatchTruckForm, destination: e.target.value })}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowDispatchTruckModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold cursor-pointer"
                >
                  Confirm Fleet Dispatch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NEW INTER-SITE TRANSFER MODAL */}
      {showNewTransferModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 animate-scaleUp text-slate-100">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black uppercase text-white flex items-center space-x-2">
                <ArrowRightLeft size={18} className="text-indigo-400" />
                <span>{isAmharic ? "አዲስ የሳይት ማስተላለፊያ ቫውቸር" : "Create Inter-Site Transfer Voucher"}</span>
              </h3>
              <button onClick={() => setShowNewTransferModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTransferSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Source Location</label>
                  <input
                    type="text"
                    required
                    value={newTransferForm.sourceSite}
                    onChange={e => setNewTransferForm({ ...newTransferForm, sourceSite: e.target.value })}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Destination Site Store</label>
                  <input
                    type="text"
                    required
                    value={newTransferForm.destinationSite}
                    onChange={e => setNewTransferForm({ ...newTransferForm, destinationSite: e.target.value })}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Material Name</label>
                <input
                  type="text"
                  required
                  value={newTransferForm.materialName}
                  onChange={e => setNewTransferForm({ ...newTransferForm, materialName: e.target.value })}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Quantity</label>
                  <input
                    type="number"
                    required
                    value={newTransferForm.quantity}
                    onChange={e => setNewTransferForm({ ...newTransferForm, quantity: Number(e.target.value) })}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Unit (Pcs / Bags / Tons)</label>
                  <input
                    type="text"
                    required
                    value={newTransferForm.unit}
                    onChange={e => setNewTransferForm({ ...newTransferForm, unit: e.target.value })}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Driver Name</label>
                  <input
                    type="text"
                    required
                    value={newTransferForm.driverName}
                    onChange={e => setNewTransferForm({ ...newTransferForm, driverName: e.target.value })}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Truck Plate</label>
                  <input
                    type="text"
                    required
                    value={newTransferForm.truckPlate}
                    onChange={e => setNewTransferForm({ ...newTransferForm, truckPlate: e.target.value })}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowNewTransferModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer"
                >
                  Generate Transfer Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SCHEDULE SUPPLIER DELIVERY MODAL */}
      {showNewSupplierModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 animate-scaleUp text-slate-100">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black uppercase text-white flex items-center space-x-2">
                <Calendar size={18} className="text-cyan-400" />
                <span>{isAmharic ? "የአቅራቢዎች ደረሰኝ ቀጠሮ ማስመዝገቢያ" : "Schedule Supplier Delivery"}</span>
              </h3>
              <button onClick={() => setShowNewSupplierModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleScheduleSupplierSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">PO Number</label>
                  <input
                    type="text"
                    required
                    value={newSupplierForm.poNumber}
                    onChange={e => setNewSupplierForm({ ...newSupplierForm, poNumber: e.target.value })}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Supplier Company</label>
                  <input
                    type="text"
                    required
                    value={newSupplierForm.supplierName}
                    onChange={e => setNewSupplierForm({ ...newSupplierForm, supplierName: e.target.value })}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Material Name</label>
                <input
                  type="text"
                  required
                  value={newSupplierForm.materialName}
                  onChange={e => setNewSupplierForm({ ...newSupplierForm, materialName: e.target.value })}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Quantity</label>
                  <input
                    type="number"
                    required
                    value={newSupplierForm.quantity}
                    onChange={e => setNewSupplierForm({ ...newSupplierForm, quantity: Number(e.target.value) })}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Expected Arrival</label>
                  <input
                    type="text"
                    required
                    value={newSupplierForm.expectedArrival}
                    onChange={e => setNewSupplierForm({ ...newSupplierForm, expectedArrival: e.target.value })}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Delivery Bay / Yard</label>
                  <input
                    type="text"
                    required
                    value={newSupplierForm.deliveryBay}
                    onChange={e => setNewSupplierForm({ ...newSupplierForm, deliveryBay: e.target.value })}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Contact Phone</label>
                  <input
                    type="text"
                    required
                    value={newSupplierForm.phone}
                    onChange={e => setNewSupplierForm({ ...newSupplierForm, phone: e.target.value })}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowNewSupplierModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl font-bold cursor-pointer"
                >
                  Save Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NEW MORNING REQUISITION MODAL */}
      {showNewRequisitionModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 space-y-4 animate-scaleUp text-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-black uppercase text-white flex items-center space-x-2">
                  <FileText size={18} className="text-emerald-400" />
                  <span>{isAmharic ? "አዲስ የሳይት ስቶር እቃዎች ጥያቄ ማመልከቻ" : "Site Store Material Request Form"}</span>
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Authorized Roles: Assembler, Gang Chief, Team Leader, Supervisor, Section Head
                </p>
              </div>
              <button onClick={() => setShowNewRequisitionModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateRequisition} className="space-y-3 text-xs">
              {/* REQUESTER INFORMATION */}
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                <span className="text-[10px] font-black uppercase text-amber-400 block">1. Requester & Job Position (የጠያቂው መረጃ)</span>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Requester Name</label>
                    <input
                      type="text"
                      required
                      value={newReqForm.requestedBy}
                      onChange={e => setNewReqForm({ ...newReqForm, requestedBy: e.target.value })}
                      className="w-full mt-1 bg-slate-900 border border-slate-800 text-white rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Employee ID</label>
                    <input
                      type="text"
                      required
                      value={newReqForm.employeeId}
                      onChange={e => setNewReqForm({ ...newReqForm, employeeId: e.target.value })}
                      className="w-full mt-1 bg-slate-900 border border-slate-800 text-white rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Job Position</label>
                    <select
                      value={newReqForm.jobPosition}
                      onChange={e => setNewReqForm({ ...newReqForm, jobPosition: e.target.value as any })}
                      className="w-full mt-1 bg-slate-900 border border-slate-800 text-white rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-emerald-500 font-sans"
                    >
                      <option value="Assembler">Assembler (አገጣጣሚ)</option>
                      <option value="Gang Chief">Gang Chief (የቡድን መሪ)</option>
                      <option value="Team Leader">Team Leader (የቡድን አስተባባሪ)</option>
                      <option value="Supervisor">Supervisor (ሱፐርቫይዘር)</option>
                      <option value="Section Head">Section Head (የክፍል ኃላፊ)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Submission Mode</label>
                    <select
                      value={newReqForm.submissionMode}
                      onChange={e => setNewReqForm({ ...newReqForm, submissionMode: e.target.value as any })}
                      className="w-full mt-1 bg-slate-900 border border-slate-800 text-white rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-emerald-500 font-sans"
                    >
                      <option value="Mobile App">Mobile App</option>
                      <option value="Tablet">Tablet</option>
                      <option value="Desktop">Desktop</option>
                      <option value="Paper Form (Manual Entry)">Paper Form (Manual Entry)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* LOCATION DETAILS */}
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                <span className="text-[10px] font-black uppercase text-cyan-400 block">2. Location Hierarchy (የሳይት እና ህንጻ ቦታ)</span>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Project / Site Name</label>
                    <input
                      type="text"
                      required
                      list="registered-sites-list"
                      value={newReqForm.siteName}
                      onChange={e => setNewReqForm({ ...newReqForm, siteName: e.target.value })}
                      className="w-full mt-1 bg-slate-900 border border-slate-800 text-white rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-emerald-500 text-xs font-mono"
                      placeholder="Select or enter site name"
                    />
                    <datalist id="registered-sites-list">
                      {registeredSitesList.map(s => (
                        <option key={s.id} value={s.projectName} />
                      ))}
                      <option value="Digital Bole Heights" />
                      <option value="Digital Construction ERP Ayat East Block T2" />
                      <option value="Lideta Smart Apartments" />
                    </datalist>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Building No & Block</label>
                    <div className="grid grid-cols-2 gap-1 mt-1">
                      <input
                        type="text"
                        placeholder="Bldg"
                        value={newReqForm.buildingNumber}
                        onChange={e => setNewReqForm({ ...newReqForm, buildingNumber: e.target.value })}
                        className="bg-slate-900 border border-slate-800 text-white rounded-xl px-2 py-1.5 focus:outline-none focus:border-emerald-500"
                      />
                      <input
                        type="text"
                        placeholder="Block"
                        value={newReqForm.blockNumber}
                        onChange={e => setNewReqForm({ ...newReqForm, blockNumber: e.target.value })}
                        className="bg-slate-900 border border-slate-800 text-white rounded-xl px-2 py-1.5 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Floor No & Zone</label>
                    <div className="grid grid-cols-2 gap-1 mt-1">
                      <input
                        type="text"
                        placeholder="Floor"
                        value={newReqForm.floorNumber}
                        onChange={e => setNewReqForm({ ...newReqForm, floorNumber: e.target.value })}
                        className="bg-slate-900 border border-slate-800 text-white rounded-xl px-2 py-1.5 focus:outline-none focus:border-emerald-500"
                      />
                      <input
                        type="text"
                        placeholder="Zone"
                        value={newReqForm.zoneNumber}
                        onChange={e => setNewReqForm({ ...newReqForm, zoneNumber: e.target.value })}
                        className="bg-slate-900 border border-slate-800 text-white rounded-xl px-2 py-1.5 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* MATERIAL ITEM SPECIFICATION */}
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                <span className="text-[10px] font-black uppercase text-emerald-400 block">3. Requested Material Specification (የእቃው ዝርዝር)</span>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Material Name</label>
                    <input
                      type="text"
                      required
                      value={newReqForm.materialName}
                      onChange={e => setNewReqForm({ ...newReqForm, materialName: e.target.value })}
                      className="w-full mt-1 bg-slate-900 border border-slate-800 text-white rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Material Type</label>
                    <select
                      value={newReqForm.materialType}
                      onChange={e => setNewReqForm({ ...newReqForm, materialType: e.target.value as any })}
                      className="w-full mt-1 bg-slate-900 border border-slate-800 text-white rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-emerald-500 font-sans"
                    >
                      <option value="Formwork Accessory">Formwork Accessory</option>
                      <option value="Aluminum Panel">Aluminum Panel</option>
                      <option value="Consumable">Consumable</option>
                      <option value="Concrete / Block">Concrete / Block</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Size / Specification</label>
                    <input
                      type="text"
                      value={newReqForm.materialSize}
                      onChange={e => setNewReqForm({ ...newReqForm, materialSize: e.target.value })}
                      className="w-full mt-1 bg-slate-900 border border-slate-800 text-white rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Unit</label>
                    <input
                      type="text"
                      value={newReqForm.unit}
                      onChange={e => setNewReqForm({ ...newReqForm, unit: e.target.value })}
                      className="w-full mt-1 bg-slate-900 border border-slate-800 text-white rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Requested Quantity</label>
                    <input
                      type="number"
                      required
                      value={newReqForm.quantityRequested}
                      onChange={e => setNewReqForm({ ...newReqForm, quantityRequested: Number(e.target.value) })}
                      className="w-full mt-1 bg-slate-900 border border-slate-800 text-amber-300 font-bold rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Priority Level</label>
                    <select
                      value={newReqForm.priority}
                      onChange={e => setNewReqForm({ ...newReqForm, priority: e.target.value as any })}
                      className="w-full mt-1 bg-slate-900 border border-slate-800 text-white rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-emerald-500 font-sans"
                    >
                      <option value="Normal">Normal</option>
                      <option value="Urgent">Urgent</option>
                      <option value="Emergency">Emergency</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Purpose of Use</label>
                  <input
                    type="text"
                    required
                    value={newReqForm.purposeOfUse}
                    onChange={e => setNewReqForm({ ...newReqForm, purposeOfUse: e.target.value })}
                    className="w-full mt-1 bg-slate-900 border border-slate-800 text-white rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* ACCESSORIES BREAKDOWN */}
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                <span className="text-[10px] font-black uppercase text-amber-400 block">4. Accessory Items (ፒኖች፣ ዌጆች፣ ታይሮድ፣ ኮንድቶች)</span>
                <div className="grid grid-cols-3 gap-2 font-mono">
                  <div>
                    <label className="text-[9px] text-slate-400 block">Pins (ፒን)</label>
                    <input
                      type="number"
                      value={newReqForm.pinsQty}
                      onChange={e => setNewReqForm({ ...newReqForm, pinsQty: Number(e.target.value) })}
                      className="w-full mt-0.5 bg-slate-900 border border-slate-800 text-white rounded-lg px-2 py-1 text-center"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 block">Wedges (ዌጅ)</label>
                    <input
                      type="number"
                      value={newReqForm.wedgesQty}
                      onChange={e => setNewReqForm({ ...newReqForm, wedgesQty: Number(e.target.value) })}
                      className="w-full mt-0.5 bg-slate-900 border border-slate-800 text-white rounded-lg px-2 py-1 text-center"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 block">Tie Rods (ታይሮድ)</label>
                    <input
                      type="number"
                      value={newReqForm.tieRodsQty}
                      onChange={e => setNewReqForm({ ...newReqForm, tieRodsQty: Number(e.target.value) })}
                      className="w-full mt-0.5 bg-slate-900 border border-slate-800 text-white rounded-lg px-2 py-1 text-center"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 block">PVC Conduits</label>
                    <input
                      type="number"
                      value={newReqForm.conduitsQty}
                      onChange={e => setNewReqForm({ ...newReqForm, conduitsQty: Number(e.target.value) })}
                      className="w-full mt-0.5 bg-slate-900 border border-slate-800 text-white rounded-lg px-2 py-1 text-center"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 block">Concrete Blocks</label>
                    <input
                      type="number"
                      value={newReqForm.blocksQty}
                      onChange={e => setNewReqForm({ ...newReqForm, blocksQty: Number(e.target.value) })}
                      className="w-full mt-0.5 bg-slate-900 border border-slate-800 text-white rounded-lg px-2 py-1 text-center"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 block">Floor Panels</label>
                    <input
                      type="number"
                      value={newReqForm.floorItemsQty}
                      onChange={e => setNewReqForm({ ...newReqForm, floorItemsQty: Number(e.target.value) })}
                      className="w-full mt-0.5 bg-slate-900 border border-slate-800 text-white rounded-lg px-2 py-1 text-center"
                    />
                  </div>
                </div>
              </div>

              {/* GPS & SIGNATURE STAMP */}
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex justify-between items-center text-[10px] font-mono text-slate-400">
                <span className="flex items-center space-x-1 text-emerald-400">
                  <CheckCircle2 size={12} />
                  <span>GPS Location: 8.9806° N, 38.7578° E (Site Auto-Tagged)</span>
                </span>
                <span className="text-cyan-400">Digital Signature Hash Verified</span>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowNewRequisitionModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold cursor-pointer flex items-center space-x-1.5"
                >
                  <Send size={14} />
                  <span>Submit Material Request</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NEW EVENING RETURN LOG MODAL */}
      {showNewReturnModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 animate-scaleUp text-slate-100">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black uppercase text-white flex items-center space-x-2">
                <RotateCcw size={18} className="text-purple-400" />
                <span>{isAmharic ? "5:00 PM የማታ ዘገባ & እቃዎች መመለሻ" : "5:00 PM Dismantling Return Audit Log"}</span>
              </h3>
              <button onClick={() => setShowNewReturnModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateReturn} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Select Requisition Reference</label>
                  <select
                    value={returnForm.requisitionId}
                    onChange={e => setReturnForm({ ...returnForm, requisitionId: e.target.value })}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 focus:outline-none focus:border-purple-500 font-mono"
                  >
                    {dailyRequisitions.map(r => (
                      <option key={r.id} value={r.id}>{r.id} ({r.blockNumber}-{r.floorNumber})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Gang Chief Name</label>
                  <input
                    type="text"
                    required
                    value={returnForm.gangChiefName}
                    onChange={e => setReturnForm({ ...returnForm, gangChiefName: e.target.value })}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* RETURNED & LOST QUANTITIES */}
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                <span className="text-[10px] font-black uppercase text-purple-400 block">Dismantled Accessories Audit</span>
                <div className="grid grid-cols-3 gap-2 font-mono text-[10px]">
                  <div>
                    <label className="text-[9px] text-emerald-400 font-bold block">Pins Returned</label>
                    <input
                      type="number"
                      required
                      value={returnForm.pinsReturned}
                      onChange={e => setReturnForm({ ...returnForm, pinsReturned: Number(e.target.value) })}
                      className="w-full mt-0.5 bg-slate-900 border border-slate-800 text-white rounded-lg px-2 py-1 text-center"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-rose-400 font-bold block">Pins Lost</label>
                    <input
                      type="number"
                      required
                      value={returnForm.pinsLost}
                      onChange={e => setReturnForm({ ...returnForm, pinsLost: Number(e.target.value) })}
                      className="w-full mt-0.5 bg-slate-900 border border-slate-800 text-white rounded-lg px-2 py-1 text-center"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-amber-400 font-bold block">Pins Damaged</label>
                    <input
                      type="number"
                      required
                      value={returnForm.pinsDamaged}
                      onChange={e => setReturnForm({ ...returnForm, pinsDamaged: Number(e.target.value) })}
                      className="w-full mt-0.5 bg-slate-900 border border-slate-800 text-white rounded-lg px-2 py-1 text-center"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] text-emerald-400 font-bold block">Wedges Returned</label>
                    <input
                      type="number"
                      required
                      value={returnForm.wedgesReturned}
                      onChange={e => setReturnForm({ ...returnForm, wedgesReturned: Number(e.target.value) })}
                      className="w-full mt-0.5 bg-slate-900 border border-slate-800 text-white rounded-lg px-2 py-1 text-center"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-rose-400 font-bold block">Wedges Lost</label>
                    <input
                      type="number"
                      required
                      value={returnForm.wedgesLost}
                      onChange={e => setReturnForm({ ...returnForm, wedgesLost: Number(e.target.value) })}
                      className="w-full mt-0.5 bg-slate-900 border border-slate-800 text-white rounded-lg px-2 py-1 text-center"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-amber-400 font-bold block">Wedges Damaged</label>
                    <input
                      type="number"
                      required
                      value={returnForm.wedgesDamaged}
                      onChange={e => setReturnForm({ ...returnForm, wedgesDamaged: Number(e.target.value) })}
                      className="w-full mt-0.5 bg-slate-900 border border-slate-800 text-white rounded-lg px-2 py-1 text-center"
                    />
                  </div>
                </div>
              </div>

              {/* PHOTO UPLOAD & SIGNATURE VERIFICATION */}
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <Camera size={16} className="text-amber-400" />
                  <span className="text-[10px] text-slate-300 font-sans">Damage / Loss Photo Proof</span>
                </div>
                <button
                  type="button"
                  onClick={() => setReturnForm({ ...returnForm, photoUploaded: !returnForm.photoUploaded })}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold cursor-pointer ${
                    returnForm.photoUploaded ? "bg-emerald-900 text-emerald-300 border border-emerald-700" : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {returnForm.photoUploaded ? "Photo Attached ✓" : "Attach Photo"}
                </button>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowNewReturnModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold cursor-pointer"
                >
                  Submit Return Audit Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EVENING RETURN PHOTO EVIDENCE PREVIEW MODAL */}
      {selectedPhotoReturn && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-amber-500/10 rounded-xl border border-amber-500/30 text-amber-400">
                  <Camera size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center space-x-2">
                    <span>Photo Evidence Inspection</span>
                    <span className="text-xs font-mono text-purple-400 px-2 py-0.5 rounded bg-purple-950/60 border border-purple-800/60">
                      {selectedPhotoReturn.id}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {selectedPhotoReturn.siteName} • {selectedPhotoReturn.blockNumber} ({selectedPhotoReturn.floorNumber})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPhotoReturn(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Left Column: Photo Preview */}
              <div className="space-y-3">
                <div className="relative group rounded-xl overflow-hidden border border-slate-700 bg-black aspect-4/3 shadow-inner">
                  <img
                    src={selectedPhotoReturn.photoUrl || "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800&auto=format&fit=crop"}
                    alt="Return Evidence Photo"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-2 right-2 bg-slate-900/80 backdrop-blur px-2.5 py-1 rounded-full text-[10px] font-mono text-emerald-400 border border-emerald-500/30 flex items-center space-x-1">
                    <CheckCircle2 size={11} />
                    <span>Verified Site Capture</span>
                  </div>
                  <div className="absolute bottom-2 left-2 right-2 bg-slate-950/80 backdrop-blur p-2 rounded-lg text-[10px] text-slate-300 border border-slate-800 flex justify-between items-center">
                    <span className="font-mono text-amber-300">Timestamp: {selectedPhotoReturn.date} {selectedPhotoReturn.returnedAt}</span>
                    <span className="font-sans font-semibold text-slate-400">Dismantling Return</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Condition & Damage Remarks:</div>
                  <p className="text-xs text-slate-200 font-sans leading-relaxed">
                    {selectedPhotoReturn.damageDescription || "All returned formwork accessories passed visual inspection with zero structural defects."}
                  </p>
                </div>
              </div>

              {/* Right Column: Return Audit Breakdown */}
              <div className="space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Requisition Reference:</span>
                      <span className="font-mono font-bold text-cyan-400">{selectedPhotoReturn.requisitionId}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Gang Chief:</span>
                      <span className="font-bold text-white">{selectedPhotoReturn.gangChiefName}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Verified By Storekeeper:</span>
                      <span className="font-bold text-white">{selectedPhotoReturn.siteStoreOwnerName}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Return Status:</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        selectedPhotoReturn.status === "With Damage" ? "bg-amber-950 text-amber-400 border border-amber-800" :
                        selectedPhotoReturn.status === "With Loss" ? "bg-rose-950 text-rose-400 border border-rose-800" :
                        "bg-emerald-950 text-emerald-400 border border-emerald-800"
                      }`}>
                        {selectedPhotoReturn.status}
                      </span>
                    </div>
                  </div>

                  {/* Accessory Inventory Balance Table */}
                  <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden text-xs font-mono">
                    <div className="p-2.5 bg-slate-900 border-b border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Returned Accessory Audit Breakdown
                    </div>
                    <div className="p-3 space-y-2">
                      <div className="grid grid-cols-4 gap-2 text-[10px] font-bold text-slate-400 uppercase border-b border-slate-800/60 pb-1">
                        <span>Item</span>
                        <span className="text-emerald-400">Returned</span>
                        <span className="text-rose-400">Lost</span>
                        <span className="text-amber-400">Damaged</span>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-xs">
                        <span className="text-slate-300 font-sans font-semibold">Alignment Pins</span>
                        <span className="text-emerald-400 font-bold">{selectedPhotoReturn.pinsReturned}</span>
                        <span className="text-rose-400 font-bold">{selectedPhotoReturn.pinsLost}</span>
                        <span className="text-amber-400 font-bold">{selectedPhotoReturn.pinsDamaged}</span>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-xs">
                        <span className="text-slate-300 font-sans font-semibold">Wedges</span>
                        <span className="text-emerald-400 font-bold">{selectedPhotoReturn.wedgesReturned}</span>
                        <span className="text-rose-400 font-bold">{selectedPhotoReturn.wedgesLost}</span>
                        <span className="text-amber-400 font-bold">{selectedPhotoReturn.wedgesDamaged}</span>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-xs">
                        <span className="text-slate-300 font-sans font-semibold">Tie Rods</span>
                        <span className="text-emerald-400 font-bold">{selectedPhotoReturn.tieRodsReturned}</span>
                        <span className="text-rose-400 font-bold">{selectedPhotoReturn.tieRodsLost}</span>
                        <span className="text-amber-400 font-bold">{selectedPhotoReturn.tieRodsDamaged}</span>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-xs">
                        <span className="text-slate-300 font-sans font-semibold">PVC Conduits</span>
                        <span className="text-emerald-400 font-bold">{selectedPhotoReturn.conduitsReturned}</span>
                        <span className="text-rose-400 font-bold">{selectedPhotoReturn.conduitsLost}</span>
                        <span className="text-amber-400 font-bold">{selectedPhotoReturn.conduitsDamaged}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-[10px] text-emerald-400 font-bold">
                    <CheckCircle2 size={13} />
                    <span>Biometric & Photo Evidence Stored</span>
                  </div>
                  <button
                    onClick={() => setSelectedPhotoReturn(null)}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl cursor-pointer shadow transition-colors"
                  >
                    Close Preview
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
