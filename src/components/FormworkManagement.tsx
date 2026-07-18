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
  Info
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
  AuditLog
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
  const [isLoading, setIsLoading] = useState(true);

  // --- UI/Interaction States ---
  const [activeSubTab, setActiveSubTab] = useState<"dashboard" | "database" | "movement" | "usage" | "damage_repair" | "missing" | "scanner" | "bundle_calc">("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [locationFilter, setLocationFilter] = useState<string>("All");

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

  // Move Panel Form
  const [moveDestination, setMoveDestination] = useState("Digital Saris Block B");
  const [moveZone, setMoveZone] = useState("Floor 1 Zone B");
  const [moveNotes, setMoveNotes] = useState("");

  // Damage Report Form
  const [damageSeverity, setDamageSeverity] = useState<"Low" | "Medium" | "High">("Medium");
  const [damageDescription, setDamageDescription] = useState("");

  // Repair Form
  const [repairTechnician, setRepairTechnician] = useState("");
  const [repairDetails, setRepairDetails] = useState("");
  const [repairCost, setRepairCost] = useState(1200);

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

      setPanels(dbPanels);
      setMovementLogs(dbMovements);
      setDamageReports(dbDamages);
      setRepairRecords(dbRepairs);
    } catch (err) {
      console.error("Error loading formwork data", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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
      createdAt: new Date().toISOString()
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
    if (!selectedPanelForDamage || !damageDescription.trim()) return;

    // Update panel status to Damaged
    const updatedPanel: AluminumFormworkPanel = {
      ...selectedPanelForDamage,
      status: PanelStatus.DAMAGED
    };

    await DbService.updateFormworkPanel(updatedPanel);

    // Create damage report
    const damageId = `PDR-${Date.now()}`;
    const report: PanelDamageReport = {
      id: damageId,
      panelId: selectedPanelForDamage.id,
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
          <span>{t("📷 QR & Camera Scanner", "📷 ኪውአር እና ካሜራ ስካነር")}</span>
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
                            <td className="p-3 font-mono font-bold text-slate-900">{panel.id}</td>
                            <td className="p-3 font-mono text-slate-600">{panel.serialNumber}</td>
                            <td className="p-3 font-mono">
                              <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] text-slate-600">{panel.bundleNumber}</span>
                            </td>
                            <td className="p-3 text-slate-600">{panel.size}</td>
                            <td className="p-3">
                              <span className="font-medium text-slate-800">{panel.type}</span>
                            </td>
                            <td className="p-3 font-bold">{panel.quantity}</td>
                            <td className="p-3">
                              <div className="space-y-0.5">
                                <span className="font-semibold text-slate-900">{panel.location}</span>
                                <span className="block text-[10px] text-slate-400 font-medium">{panel.zone}</span>
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
                      <span className="text-[10px] bg-red-50 text-red-700 px-2 py-0.5 rounded font-bold">
                        {damageReports.filter(d => d.status !== "Repaired").length} {t("Active", "አሁኑኑ የሚፈለጉ")}
                      </span>
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

                      {/* Info sheet list */}
                      <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div className="flex justify-between py-1 border-b border-slate-200">
                          <span className="text-slate-500">{t("Active Location:", "አሁን ያለበት ቦታ፡")}</span>
                          <strong className="text-slate-900">{scannedPanel.location}</strong>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-200">
                          <span className="text-slate-500">{t("Layout Zone:", "የስራ ዞን፡")}</span>
                          <strong className="text-slate-900">{scannedPanel.zone}</strong>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-200">
                          <span className="text-slate-500">{t("Cycle Pours Count:", "የአጠቃቀም ዑደት፡")}</span>
                          <strong className="text-slate-900 font-mono">{scannedPanel.usageCount} {t("cycles", "ዑደት")}</strong>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-200">
                          <span className="text-slate-500">{t("Asset Condition Status:", "የፓነል የስራ ሁኔታ፡")}</span>
                          <span 
                            className="px-2 py-0.5 rounded text-[10px] font-bold"
                            style={{ backgroundColor: `${STATUS_COLORS[scannedPanel.status]}15`, color: STATUS_COLORS[scannedPanel.status] }}
                          >
                            {scannedPanel.status}
                          </span>
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

          </motion.div>
        </AnimatePresence>
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
      {showDamageModal && selectedPanelForDamage && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-100"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <AlertTriangle className="text-red-600" size={18} />
                <span>{t(`Report Panel Damage Defect: ${selectedPanelForDamage.id}`, `የፓነል ብልሽት ሪፖርት ማድረጊያ፡ ${selectedPanelForDamage.id}`)}</span>
              </h3>
              <button 
                onClick={() => {
                  setShowDamageModal(false);
                  setSelectedPanelForDamage(null);
                }}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                {t("Close", "ዝጋ")}
              </button>
            </div>

            <form onSubmit={handleReportDamage} className="space-y-4 text-xs">
              
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

    </div>
  );
};
