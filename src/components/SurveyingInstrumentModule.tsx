import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Compass, 
  Database, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Plus, 
  FileText, 
  Sparkles, 
  Upload, 
  Layers, 
  Download, 
  Eye, 
  MapPin, 
  ChevronRight, 
  Maximize2, 
  FileSpreadsheet, 
  Activity, 
  Cpu, 
  ShieldAlert, 
  Wrench, 
  UserCheck, 
  HardHat, 
  CheckSquare, 
  FileCode,
  Sliders,
  TrendingUp,
  Map,
  Grid,
  X,
  FileDown,
  Users,
  Settings,
  HelpCircle,
  AlertCircle
} from "lucide-react";
import { UserRole } from "../types";
import { 
  ResponsiveContainer, 
  ScatterChart, 
  Scatter, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  BarChart, 
  Bar, 
  Cell,
  LineChart,
  Line,
  PieChart,
  Pie
} from "recharts";

// ==========================================
// DATA INTERFACES
// ==========================================

export interface SurveyEquipment {
  id: string;
  name: string;
  type: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  calibrationCertNo: string;
  calibrationDate: string;
  nextCalibrationDate: string;
  assignedEngineer: string;
  status: "Available" | "In Use" | "Maintenance";
}

export interface ControlPoint {
  id: string;
  project: string;
  eastingX: number;
  northingY: number;
  elevationZ: number;
  gpsCoordinates: string;
  benchmarkRef: string;
  accuracyLevel: "High-Precision (1st Order)" | "Standard (2nd Order)" | "Kinematic (3rd Order)";
  surveyDate: string;
  surveyEngineer: string;
}

export interface VerificationElement {
  id: string;
  name: string; // Grid Lines, Axis, etc.
  status: "Passed" | "Deviation Detected" | "Pending";
  plannedX: number;
  plannedY: number;
  plannedZ: number;
  measuredX: number;
  measuredY: number;
  measuredZ: number;
  deviationMm: number;
}

export interface AluminumFormworkPanel {
  panelId: string;
  size: string;
  location: string;
  type: "Beam Panel" | "Wall Panel" | "Deck Panel" | "Corner Panel" | "Internal Corner" | "External Corner";
  quantity: number;
  status: "Correct" | "Missing" | "Mismatched";
  installedLocation: string;
}

export interface ProgressSummary {
  plannedProgress: number; // %
  actualProgress: number;  // %
  remainingWork: number;   // %
  productivityTeam: { team: string; panelsPerDay: number; score: number }[];
  productivityZone: { zone: string; panelsPerDay: number }[];
  completionDate: string;
  delayStatus: string;
  delayDays: number;
}

export interface ProjectStageOverview {
  project: string;
  building: string;
  activeFloor: number;
  status: "Approved" | "Waiting for Survey" | "Ready for Formwork" | "Ready for Concrete" | "Completed";
  stages: {
    surveyCompleted: boolean;
    cadCompared: boolean;
    formworkInspected: boolean;
    alignmentInspected: boolean;
    safetyInspected: boolean;
    photoInspected: boolean;
    supervisorApproved: boolean;
    engineerApproved: boolean;
  };
}

// ==========================================
// PRE-SEED DATA
// ==========================================

const INITIAL_EQUIPMENT: SurveyEquipment[] = [
  {
    id: "EQ-01",
    name: "High Precision Total Station",
    type: "Total Station",
    manufacturer: "Sokkia",
    model: "CX-105 Pro",
    serialNumber: "TS-Sokkia-98442",
    calibrationCertNo: "CERT-2025-9981",
    calibrationDate: "2025-10-15",
    nextCalibrationDate: "2026-10-15",
    assignedEngineer: "Surv. Abel Tesfaye",
    status: "In Use"
  },
  {
    id: "EQ-02",
    name: "GNSS Geodetic GPS Receiver",
    type: "GNSS / RTK GPS",
    manufacturer: "Trimble",
    model: "R12i LT",
    serialNumber: "Trimble-R12i-88210",
    calibrationCertNo: "CERT-2025-4421",
    calibrationDate: "2025-08-10",
    nextCalibrationDate: "2026-08-10",
    assignedEngineer: "Surv. Abel Tesfaye",
    status: "Available"
  },
  {
    id: "EQ-03",
    name: "Digital Level Control Station",
    type: "Digital Level",
    manufacturer: "Leica",
    model: "Sprinter 250M",
    serialNumber: "LEICA-DL-112",
    calibrationCertNo: "CERT-2026-004",
    calibrationDate: "2026-06-01",
    nextCalibrationDate: "2026-07-15", // Expiring soon!
    assignedEngineer: "Surv. Hana Kebede",
    status: "Available"
  },
  {
    id: "EQ-04",
    name: "High-Frequency 3D Laser Scanner",
    type: "3D Laser Scanner",
    manufacturer: "Faro",
    model: "Focus Premium",
    serialNumber: "FARO-3D-9982",
    calibrationCertNo: "CERT-2025-1102",
    calibrationDate: "2025-05-12",
    nextCalibrationDate: "2026-05-12", // Expired calibration!
    assignedEngineer: "Eng. Melaku Zewdu",
    status: "Maintenance"
  }
];

const INITIAL_CONTROL_POINTS: ControlPoint[] = [
  {
    id: "CP-BOLE-01",
    project: "OVID Bole Heights",
    eastingX: 472911.205,
    northingY: 994200.412,
    elevationZ: 2315.420,
    gpsCoordinates: "9.0124° N, 38.7845° E",
    benchmarkRef: "BM-OVID-H1",
    accuracyLevel: "High-Precision (1st Order)",
    surveyDate: "2026-01-10",
    surveyEngineer: "Surv. Abel Tesfaye"
  },
  {
    id: "CP-BOLE-02",
    project: "OVID Bole Heights",
    eastingX: 472985.618,
    northingY: 994215.118,
    elevationZ: 2314.980,
    gpsCoordinates: "9.0125° N, 38.7852° E",
    benchmarkRef: "BM-OVID-H2",
    accuracyLevel: "High-Precision (1st Order)",
    surveyDate: "2026-01-11",
    surveyEngineer: "Surv. Abel Tesfaye"
  },
  {
    id: "CP-AYAT-01",
    project: "OVID Ayat East Block T2",
    eastingX: 481200.550,
    northingY: 991400.992,
    elevationZ: 2402.110,
    gpsCoordinates: "8.9954° N, 38.8611° E",
    benchmarkRef: "BM-AYAT-T2",
    accuracyLevel: "Standard (2nd Order)",
    surveyDate: "2026-02-15",
    surveyEngineer: "Surv. Hana Kebede"
  }
];

const INITIAL_STAGES: ProjectStageOverview[] = [
  {
    project: "OVID Bole Heights",
    building: "Tower Block A",
    activeFloor: 4,
    status: "Ready for Concrete",
    stages: {
      surveyCompleted: true,
      cadCompared: true,
      formworkInspected: true,
      alignmentInspected: true,
      safetyInspected: true,
      photoInspected: true,
      supervisorApproved: true,
      engineerApproved: true
    }
  },
  {
    project: "OVID Bole Heights",
    building: "Tower Block A",
    activeFloor: 5,
    status: "Waiting for Survey",
    stages: {
      surveyCompleted: false,
      cadCompared: false,
      formworkInspected: false,
      alignmentInspected: false,
      safetyInspected: false,
      photoInspected: false,
      supervisorApproved: false,
      engineerApproved: false
    }
  },
  {
    project: "OVID Ayat East Block T2",
    building: "Block T2",
    activeFloor: 2,
    status: "Ready for Formwork",
    stages: {
      surveyCompleted: true,
      cadCompared: true,
      formworkInspected: false,
      alignmentInspected: false,
      safetyInspected: false,
      photoInspected: false,
      supervisorApproved: false,
      engineerApproved: false
    }
  }
];

const INITIAL_VERIFICATION_ELEMENTS: VerificationElement[] = [
  { id: "V-01", name: "Axis & Grid Lines Alignment", status: "Passed", plannedX: 100.0, plannedY: 150.0, plannedZ: 12.8, measuredX: 100.002, measuredY: 149.999, measuredZ: 12.8, deviationMm: 2.1 },
  { id: "V-02", name: "Column Position Core Offset", status: "Passed", plannedX: 105.5, plannedY: 150.0, plannedZ: 12.8, measuredX: 105.501, measuredY: 150.003, measuredZ: 12.801, deviationMm: 3.2 },
  { id: "V-03", name: "Wall Panel Verticality (West Wing)", status: "Deviation Detected", plannedX: 102.5, plannedY: 154.2, plannedZ: 12.8, measuredX: 102.506, measuredY: 154.194, measuredZ: 12.798, deviationMm: 6.8 }, // Over 4mm!
  { id: "V-04", name: "Beam Alignment Control", status: "Passed", plannedX: 108.0, plannedY: 154.2, plannedZ: 12.8, measuredX: 108.001, measuredY: 154.202, measuredZ: 12.8, deviationMm: 2.2 },
  { id: "V-05", name: "Slab Deck Levels Control", status: "Passed", plannedX: 112.4, plannedY: 154.2, plannedZ: 12.8, measuredX: 112.401, measuredY: 154.198, measuredZ: 12.803, deviationMm: 3.0 },
  { id: "V-06", name: "Opening Positions (Windows/Ducts)", status: "Passed", plannedX: 115.0, plannedY: 158.0, plannedZ: 12.8, measuredX: 115.001, measuredY: 158.002, measuredZ: 12.801, deviationMm: 2.4 },
  { id: "V-07", name: "Elevator & Stair Core Layout", status: "Deviation Detected", plannedX: 120.0, plannedY: 160.0, plannedZ: 12.8, measuredX: 120.005, measuredY: 160.007, measuredZ: 12.802, deviationMm: 8.6 } // Over 4mm!
];

const INITIAL_FORMWORK_PANELS: AluminumFormworkPanel[] = [
  { panelId: "P-WALL-001", size: "1200x2300", location: "West Shear Wall", type: "Wall Panel", quantity: 8, status: "Correct", installedLocation: "S-10" },
  { panelId: "P-BEAM-014", size: "450x1500", location: "Main Beam Girder", type: "Beam Panel", quantity: 4, status: "Correct", installedLocation: "B-2" },
  { panelId: "P-DECK-085", size: "600x1200", location: "Center Slab Bay", type: "Deck Panel", quantity: 24, status: "Missing", installedLocation: "D-8" }, // Flagged Missing!
  { panelId: "P-CRN-005", size: "300x300", location: "Corner Bracing Left", type: "Corner Panel", quantity: 2, status: "Correct", installedLocation: "C-1" },
  { panelId: "P-ICRN-002", size: "200x200", location: "Internal Corner Joint", type: "Internal Corner", quantity: 4, status: "Mismatched", installedLocation: "IC-4" }, // Flagged Mismatched!
  { panelId: "P-ECRN-009", size: "200x200", location: "External Corner Edge", type: "External Corner", quantity: 4, status: "Correct", installedLocation: "EC-2" }
];

const INITIAL_PROGRESS: ProgressSummary = {
  plannedProgress: 88,
  actualProgress: 79,
  remainingWork: 21,
  productivityTeam: [
    { team: "Carpentry Team Alpha", panelsPerDay: 48, score: 94 },
    { team: "Steel Fixer Team Beta", panelsPerDay: 35, score: 88 },
    { team: "Concrete Pour Squad T1", panelsPerDay: 42, score: 91 }
  ],
  productivityZone: [
    { zone: "Zone A - West Wing", panelsPerDay: 45 },
    { zone: "Zone B - Core Shaft", panelsPerDay: 32 },
    { zone: "Zone C - Elevator Bay", panelsPerDay: 28 }
  ],
  completionDate: "2026-07-22",
  delayStatus: "Delayed by 3 Days due to Elevator shaft alignment drift",
  delayDays: 3
};

// ==========================================
// COMPONENT DEFINITION
// ==========================================

interface SurveyingInstrumentModuleProps {
  isAmharic: boolean;
  currentUserRole: UserRole;
  onLogAction?: (action: string, details: string) => void;
}

export const SurveyingInstrumentModule: React.FC<SurveyingInstrumentModuleProps> = ({
  isAmharic,
  currentUserRole,
  onLogAction
}) => {
  // --- SUB TAB CONTROL ---
  const [activeTab, setActiveTab] = useState<"dashboard" | "equipment" | "verification" | "progress" | "signoff" | "approval">("dashboard");

  // --- STATE STORES ---
  const [equipmentList, setEquipmentList] = useState<SurveyEquipment[]>(INITIAL_EQUIPMENT);
  const [controlPoints, setControlPoints] = useState<ControlPoint[]>(INITIAL_CONTROL_POINTS);
  const [projectStages, setProjectStages] = useState<ProjectStageOverview[]>(INITIAL_STAGES);
  const [verificationElements, setVerificationElements] = useState<VerificationElement[]>(INITIAL_VERIFICATION_ELEMENTS);
  const [formworkPanels, setFormworkPanels] = useState<AluminumFormworkPanel[]>(INITIAL_FORMWORK_PANELS);
  
  // --- CUSTOM PANEL DIMENSION INPUT STATE (FOR AUTOMATIC AREA CALCULATION) ---
  const [panelTypeInput, setPanelTypeInput] = useState<string>("Wall Panel");
  const [panelWidthInput, setPanelWidthInput] = useState<string>("600");
  const [panelHeightInput, setPanelHeightInput] = useState<string>("240");
  const [panelQtyInput, setPanelQtyInput] = useState<number>(1);
  const [panelLocationInput, setPanelLocationInput] = useState<string>("Tower A Floor 4");

  const [progressSummary, setProgressSummary] = useState<ProgressSummary>(INITIAL_PROGRESS);
  const [selectedProject, setSelectedProject] = useState<string>("OVID Bole Heights");

  // --- NEW SURVEY REVIEW & PANEL APPROVAL STATE ---
  const [selectedBuilding, setSelectedBuilding] = useState("Tower Block A");
  const [selectedFloor, setSelectedFloor] = useState(4);
  const [selectedZone, setSelectedZone] = useState("Zone A - West Wing");
  
  // Active Simulated Reviewer Role
  const [activeReviewerRole, setActiveReviewerRole] = useState<"Site Engineer" | "Supervisor" | "Team Leader">("Site Engineer");
  const [panelApprovalComment, setPanelApprovalComment] = useState("");
  
  // Quality Records Audit Trail
  const [qualityAuditTrail, setQualityAuditTrail] = useState<{
    id: string;
    timestamp: string;
    project: string;
    building: string;
    floor: number;
    zone: string;
    surveyStatus: string;
    cadComparison: string;
    action: string;
    user: string;
    comments: string;
  }[]>([
    {
      id: "AUD-SURV-101",
      timestamp: "2026-07-08 14:00",
      project: "OVID Bole Heights",
      building: "Tower Block A",
      floor: 4,
      zone: "Zone A - West Wing",
      surveyStatus: "Completed & Verified",
      cadComparison: "Passed (Max Dev 3.2mm)",
      action: "Approved for Panel Installation",
      user: "Eng. Melaku Zewdu (Site Engineer)",
      comments: "Final CAD alignment check matches ±3mm. Approved for assembly."
    },
    {
      id: "AUD-SURV-100",
      timestamp: "2026-07-08 11:15",
      project: "OVID Bole Heights",
      building: "Tower Block A",
      floor: 4,
      zone: "Zone A - West Wing",
      surveyStatus: "Completed",
      cadComparison: "Passed",
      action: "Field Verified & Recommended",
      user: "Sup. Almaz Tekle (Supervisor)",
      comments: "Field conditions verified, vertical bracing solid."
    }
  ]);

  // Current approval workflow state for selected project/building/floor/zone
  const [zoneApprovals, setZoneApprovals] = useState<Record<string, {
    teamLeader: { status: "Approved" | "Pending" | "Rejected"; comment: string; user: string; time: string };
    supervisor: { status: "Approved" | "Pending" | "Rejected"; comment: string; user: string; time: string };
    siteEngineer: { status: "Approved" | "Pending" | "Rejected"; comment: string; user: string; time: string };
  }>>({
    "OVID Bole Heights_Tower Block A_4_Zone A - West Wing": {
      teamLeader: { status: "Approved", comment: "Scaffold and tools ready, crew briefed on panels.", user: "TL. Chala Kebede", time: "2026-07-08 09:30" },
      supervisor: { status: "Approved", comment: "Field conditions verified, vertical bracing solid.", user: "Sup. Almaz Tekle", time: "2026-07-08 11:15" },
      siteEngineer: { status: "Approved", comment: "Final CAD alignment check matches ±3mm. Approved for assembly.", user: "Eng. Melaku Zewdu", time: "2026-07-08 14:00" }
    },
    "OVID Bole Heights_Tower Block A_5_Zone B - Elevator Shaft": {
      teamLeader: { status: "Pending", comment: "", user: "TL. Chala Kebede", time: "" },
      supervisor: { status: "Pending", comment: "", user: "Sup. Almaz Tekle", time: "" },
      siteEngineer: { status: "Pending", comment: "", user: "Eng. Melaku Zewdu", time: "" }
    },
    "OVID Ayat East Block T2_Block T2_2_Zone C - Staircase Core": {
      teamLeader: { status: "Approved", comment: "Slab ready, tools prepped.", user: "TL. Chala Kebede", time: "2026-07-09 08:00" },
      supervisor: { status: "Pending", comment: "Checking alignment controls today.", user: "Sup. Almaz Tekle", time: "" },
      siteEngineer: { status: "Pending", comment: "", user: "Eng. Melaku Zewdu", time: "" }
    }
  });

  // Interactive alignment checklists for each zone
  const [zoneAlignmentChecks, setZoneAlignmentChecks] = useState<Record<string, Record<string, { status: "PASSED" | "EXCEEDED" | "PENDING"; deviation: number }>>>({
    "OVID Bole Heights_Tower Block A_4_Zone A - West Wing": {
      gridLine: { status: "PASSED", deviation: 1.8 },
      axisLine: { status: "PASSED", deviation: 2.1 },
      controlPoints: { status: "PASSED", deviation: 1.5 },
      columnLayout: { status: "PASSED", deviation: 2.4 },
      wallLayout: { status: "PASSED", deviation: 3.2 },
      beamLayout: { status: "PASSED", deviation: 2.0 },
      slabLevel: { status: "PASSED", deviation: -1.2 },
      verticalAlignment: { status: "PASSED", deviation: 2.9 },
      horizontalAlignment: { status: "PASSED", deviation: 1.7 },
      openingLocations: { status: "PASSED", deviation: 2.3 },
      elevatorCore: { status: "PASSED", deviation: 3.5 },
      stairCore: { status: "PASSED", deviation: 2.1 }
    },
    "OVID Bole Heights_Tower Block A_5_Zone B - Elevator Shaft": {
      gridLine: { status: "PASSED", deviation: 2.2 },
      axisLine: { status: "PASSED", deviation: 2.8 },
      controlPoints: { status: "PASSED", deviation: 1.9 },
      columnLayout: { status: "PASSED", deviation: 3.1 },
      wallLayout: { status: "EXCEEDED", deviation: 6.8 },
      beamLayout: { status: "PASSED", deviation: 2.5 },
      slabLevel: { status: "EXCEEDED", deviation: -5.4 },
      verticalAlignment: { status: "EXCEEDED", deviation: 5.9 },
      horizontalAlignment: { status: "PASSED", deviation: 2.0 },
      openingLocations: { status: "PASSED", deviation: 3.2 },
      elevatorCore: { status: "EXCEEDED", deviation: 8.6 },
      stairCore: { status: "PASSED", deviation: 3.0 }
    },
    "OVID Ayat East Block T2_Block T2_2_Zone C - Staircase Core": {
      gridLine: { status: "PASSED", deviation: 2.0 },
      axisLine: { status: "PASSED", deviation: 1.9 },
      controlPoints: { status: "PASSED", deviation: 1.2 },
      columnLayout: { status: "PASSED", deviation: 2.5 },
      wallLayout: { status: "PASSED", deviation: 2.2 },
      beamLayout: { status: "PASSED", deviation: 3.4 },
      slabLevel: { status: "PASSED", deviation: 1.5 },
      verticalAlignment: { status: "PASSED", deviation: 3.1 },
      horizontalAlignment: { status: "PASSED", deviation: 2.2 },
      openingLocations: { status: "PASSED", deviation: 1.8 },
      elevatorCore: { status: "PASSED", deviation: 2.9 },
      stairCore: { status: "PASSED", deviation: 3.6 }
    }
  });

  // Real-time Cloud Sync Simulated States
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState("Connected to OVID Geodetic Network — Satellite lock solid");

  // Equipment Form States
  const [newEqName, setNewEqName] = useState("");
  const [newEqType, setNewEqType] = useState("Total Station");
  const [newEqMfg, setNewEqMfg] = useState("");
  const [newEqModel, setNewEqModel] = useState("");
  const [newEqSN, setNewEqSN] = useState("");
  const [newEqCalCert, setNewEqCalCert] = useState("");
  const [newEqCalDate, setNewEqCalDate] = useState("");
  const [newEqNextCalDate, setNewEqNextCalDate] = useState("");
  const [newEqEngineer, setNewEqEngineer] = useState("");

  // Control Point Form States
  const [newCpId, setNewCpId] = useState("");
  const [newCpX, setNewCpX] = useState("");
  const [newCpY, setNewCpY] = useState("");
  const [newCpZ, setNewCpZ] = useState("");
  const [newCpGps, setNewCpGps] = useState("");
  const [newCpBM, setNewCpBM] = useState("");
  const [newCpAcc, setNewCpAcc] = useState("High-Precision (1st Order)");

  // Active Report Select State (For report simulation)
  const [activeReportType, setActiveReportType] = useState<"dailyConstruction" | "survey" | "attendance" | "productivity" | "concreteReadiness">("dailyConstruction");
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Filter Active Project Stage
  const activeStage = useMemo(() => {
    return projectStages.find(s => s.project === selectedProject) || projectStages[0];
  }, [projectStages, selectedProject]);

  // Calibration Expiring Soon Calculator
  const calibrationWarnings = useMemo(() => {
    return equipmentList.filter(eq => {
      const nextCal = new Date(eq.nextCalibrationDate);
      const today = new Date();
      const diffTime = nextCal.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 30 || eq.status === "Maintenance";
    });
  }, [equipmentList]);

  // --- HANDLERS ---

  const triggerCloudSync = () => {
    setIsSyncing(true);
    setSyncStatusMsg(isAmharic ? "ከሰርቬይ መለኪያ መረጃዎች ወደ ዋናው ቢሮ በቅጽበት እየተመሳሰለ ነው..." : "Broadcasting geodetic measurements to Head Office central server...");
    setTimeout(() => {
      setIsSyncing(false);
      setSyncStatusMsg(isAmharic ? "የደመና ማመሳሰል ተጠናቋል። ሁሉም የአቀባዊነት መዛባቶች ተረጋግጠዋል።" : "Cloud synchronization complete. All verticality deviations validated against central blueprints.");
      if (onLogAction) {
        onLogAction("Real-time Cloud Sync", "Synchronized survey records & formwork deviation logs with Head Office");
      }
    }, 1200);
  };

  const handleAddEquipment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEqName || !newEqSN) return;

    const newEq: SurveyEquipment = {
      id: `EQ-0${equipmentList.length + 1}`,
      name: newEqName,
      type: newEqType,
      manufacturer: newEqMfg || "Leica",
      model: newEqModel || "Alpha Series",
      serialNumber: newEqSN,
      calibrationCertNo: newEqCalCert || `CERT-2026-0${equipmentList.length + 1}`,
      calibrationDate: newEqCalDate || "2026-01-01",
      nextCalibrationDate: newEqNextCalDate || "2027-01-01",
      assignedEngineer: newEqEngineer || "Surv. Abel Tesfaye",
      status: "Available"
    };

    setEquipmentList(prev => [...prev, newEq]);
    setNewEqName("");
    setNewEqSN("");
    setNewEqMfg("");
    setNewEqModel("");
    setNewEqCalCert("");

    if (onLogAction) {
      onLogAction("Registered Survey Equipment", `Added ${newEqName} (S/N: ${newEqSN}) to calibration pool.`);
    }
  };

  const handleAddControlPoint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCpId || !newCpX || !newCpY) return;

    const newCP: ControlPoint = {
      id: newCpId,
      project: selectedProject,
      eastingX: Number(newCpX),
      northingY: Number(newCpY),
      elevationZ: Number(newCpZ) || 2300.0,
      gpsCoordinates: newCpGps || "9.000° N, 38.000° E",
      benchmarkRef: newCpBM || "BM-LOCAL-01",
      accuracyLevel: newCpAcc as any,
      surveyDate: new Date().toISOString().split("T")[0],
      surveyEngineer: "Surv. Abel Tesfaye"
    };

    setControlPoints(prev => [...prev, newCP]);
    setNewCpId("");
    setNewCpX("");
    setNewCpY("");
    setNewCpZ("");
    setNewCpGps("");
    setNewCpBM("");

    if (onLogAction) {
      onLogAction("Created Geodetic Control Point", `Established CP ${newCpId} for project ${selectedProject}`);
    }
  };

  const handleExport = (format: "PDF" | "Excel", reportTitle: string) => {
    setExportNotice(isAmharic ? `የ${reportTitle} ሪፖርት በ${format} ቅርጸት በመዘጋጀት ላይ ነው...` : `Generating ${reportTitle} in ${format} format...`);
    setTimeout(() => {
      setExportNotice(null);
      alert(isAmharic ? `የ${reportTitle} ሪፖርት በተሳካ ሁኔታ ወደ ${format} ተልኳል!` : `Successfully exported ${reportTitle} to ${format}!`);
      if (onLogAction) {
        onLogAction("Exported Operational Report", `Downloaded ${reportTitle} report as ${format}`);
      }
    }, 1500);
  };

  const handleToggleVerificationElement = (id: string) => {
    setVerificationElements(prev => prev.map(el => {
      if (el.id === id) {
        const nextStatus = el.status === "Passed" ? "Deviation Detected" : "Passed";
        return {
          ...el,
          status: nextStatus,
          deviationMm: nextStatus === "Passed" ? 1.5 : 7.2
        };
      }
      return el;
    }));
  };

  const handleToggleQualitySignoff = (stageKey: keyof ProjectStageOverview["stages"]) => {
    if (currentUserRole === UserRole.WORKER) {
      alert("Unauthorized: Worker role cannot sign off quality verification steps.");
      return;
    }

    setProjectStages(prev => prev.map(proj => {
      if (proj.project === selectedProject) {
        const nextStages = { ...proj.stages, [stageKey]: !proj.stages[stageKey] };
        
        // Compute active floor concrete readiness
        const allChecked = Object.values(nextStages).every(v => v === true);
        const hasFormworkDefects = verificationElements.some(el => el.status === "Deviation Detected");
        
        let finalStatus = proj.status;
        if (allChecked && !hasFormworkDefects) {
          finalStatus = "Ready for Concrete";
        } else if (hasFormworkDefects) {
          finalStatus = "Waiting for Survey"; // Defect correction needed
        } else {
          finalStatus = "Ready for Formwork";
        }

        return {
          ...proj,
          stages: nextStages,
          status: finalStatus as any
        };
      }
      return proj;
    }));

    if (onLogAction) {
      onLogAction("Toggled Control Quality Checkpoint", `Site QA engineer altered checklist state: ${stageKey}`);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* ======================================================== */}
      {/* GEODETIC CONTROLS TOP REAL-TIME INTERLOCK */}
      {/* ======================================================== */}
      <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="flex items-center space-x-3 z-10">
          <div className="relative flex h-3 w-3">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isSyncing ? "bg-red-500" : "bg-red-500"}`}></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <Compass size={16} className="text-red-500 animate-spin-slow" />
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-200">
                {isAmharic ? "OVID የሰርቬይንግ እና ኮንክሪት መቆጣጠሪያ ሞጁል" : "OVID SURVEY & CONSTRUCTION INST. CONTROL"}
              </p>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              {isSyncing ? "Replicating parameters to central DB..." : syncStatusMsg}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5 z-10">
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="text-[11px] bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-slate-200 font-bold focus:outline-none focus:border-red-500"
          >
            <option value="OVID Bole Heights">OVID Bole Heights</option>
            <option value="OVID Ayat East Block T2">OVID Ayat East Block T2</option>
          </select>

          <span className="text-[10px] bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg text-slate-300 font-mono font-bold tracking-wider">
            {isAmharic ? "ሚና: " : "Role: "} <span className="text-red-500">{currentUserRole.replace("_", " ")}</span>
          </span>
          
          <button 
            onClick={triggerCloudSync}
            disabled={isSyncing}
            className="p-1.5 bg-slate-950 hover:bg-slate-850 text-slate-300 rounded-lg border border-slate-800 hover:text-white transition-all cursor-pointer"
            title="Force Global Real-Time Sync"
          >
            <RefreshCw size={13} className={isSyncing ? "animate-spin text-red-500" : ""} />
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* CALIBRATION ALERTS HEADER NOTIFICATION */}
      {/* ======================================================== */}
      {calibrationWarnings.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-900 rounded-xl p-3 flex items-center justify-between gap-4 text-xs">
          <div className="flex items-center space-x-2">
            <AlertTriangle size={16} className="text-amber-600 animate-bounce shrink-0" />
            <div>
              <span className="font-bold">
                {isAmharic ? "የመሣሪያዎች ካሊብሬሽን ማስጠንቀቂያ: " : "Equipment Calibration Warnings: "}
              </span>
              <span>
                {isAmharic 
                  ? `${calibrationWarnings.length} መሣሪያዎች አስቸኳይ የካሊብሬሽን ፍተሻ ያስፈልጋቸዋል።` 
                  : `${calibrationWarnings.length} surveying instruments require calibration verification or are currently in maintenance.`}
              </span>
            </div>
          </div>
          <button 
            onClick={() => setActiveTab("equipment")}
            className="bg-amber-600/20 hover:bg-amber-600/30 text-amber-800 font-bold px-2.5 py-1 rounded transition-colors shrink-0"
          >
            {isAmharic ? "አሁን አስተካክል" : "Manage Now"}
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* SIX-TAB TOP SELECTOR */}
      {/* ======================================================== */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap gap-1">
        {[
          { id: "dashboard", label: isAmharic ? "የቁጥጥር ሰሌዳ እና ሪፖርቶች" : "Integrated Controls & Reports", icon: Activity, color: "text-red-500" },
          { id: "equipment", label: isAmharic ? "የመሣሪያዎች እና መቆጣጠሪያ ነጥብ" : "Instruments & Control Points", icon: Settings, color: "text-blue-500" },
          { id: "verification", label: isAmharic ? "የCAD እና ፎርምወርክ ማረጋገጫ" : "CAD & Aluminum Formwork", icon: Layers, color: "text-indigo-500" },
          { id: "approval", label: isAmharic ? "የሰርቬይ ፍተሻ እና ፓነል ፈቃድ" : "Survey Review & Panel Approval", icon: FileText, color: "text-red-600" },
          { id: "progress", label: isAmharic ? "የእድገት ሰሌዳ እና AI ረዳት" : "Progress Analytics & AI Core", icon: Sparkles, color: "text-amber-500" },
          { id: "signoff", label: isAmharic ? "የኮንክሪት ዝግጁነት ፈቃድ" : "Concrete Pour Signoff", icon: UserCheck, color: "text-emerald-500" }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === tab.id
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon size={14} className={tab.color} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ======================================================== */}
      {/* SUB-TABS VIEWS */}
      {/* ======================================================== */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.15 }}
          className="space-y-6"
        >

          {/* -------------------------------------------------------- */}
          {/* TAB 1: INTEGRATED CONTROLS & AUTOMATIC REPORTS */}
          {/* -------------------------------------------------------- */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              
              {/* Executive Indicators Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                  { label: isAmharic ? "አጠቃላይ ሳይቶች" : "Total Projects", val: "3", sub: "Active Blocks", color: "text-slate-800" },
                  { label: isAmharic ? "አጠቃላይ ፎቆች" : "Total Floors Logged", val: "148", sub: "Formwork Cycles", color: "text-slate-800" },
                  { label: isAmharic ? "ለኮንክሪት ዝግጁ" : "Ready for Pour", val: "5 Floors", sub: "Passed All QA", color: "text-emerald-600" },
                  { label: isAmharic ? "የዘገዩ ወለሎች" : "Delayed Floors", val: "12", sub: "Verticality Offset", color: "text-red-500" },
                  { label: isAmharic ? "ካሊብሬሽን ጤናማ" : "Instrument Status", val: "Healthy", sub: "Next-gen GPS", color: "text-blue-500" }
                ].map((stat, idx) => (
                  <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-1">
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">{stat.label}</span>
                    <p className={`text-xl font-black font-mono ${stat.color}`}>{stat.val}</p>
                    <span className="text-[10px] text-slate-400 block font-medium">{stat.sub}</span>
                  </div>
                ))}
              </div>

              {/* Main Control Panel split */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Left side: Integrated Survey Dashboard */}
                <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                        🏢 {isAmharic ? "የሳይት ሰርቬይ እና የግንባታ ደረጃዎች" : "Integrated Structural Stage Dashboard"}
                      </h3>
                      <p className="text-[10px] text-slate-400">Reconciled building cycle milestones per project</p>
                    </div>
                    <span className="text-[10px] bg-red-500/10 text-red-600 px-2 py-0.5 rounded font-black font-mono">LIVE MATCH</span>
                  </div>

                  {/* Active Projects Stages Status Grid */}
                  <div className="space-y-4">
                    {projectStages.map((stage, sIdx) => (
                      <div key={sIdx} className="p-3.5 rounded-xl border border-slate-150 bg-slate-50/50 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-xs font-black text-slate-800">{stage.project} — {stage.building}</h4>
                            <p className="text-[10px] text-slate-400 font-mono">Current active level: Floor {stage.activeFloor}</p>
                          </div>
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                            stage.status === "Ready for Concrete" ? "bg-emerald-100 text-emerald-800" :
                            stage.status === "Waiting for Survey" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
                          }`}>
                            {stage.status}
                          </span>
                        </div>

                        {/* Stage Progress Pills */}
                        <div className="grid grid-cols-4 gap-2 text-[10px] font-semibold text-center">
                          <div className={`p-1.5 rounded-md border ${stage.stages.surveyCompleted ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-slate-100 border-slate-200 text-slate-400"}`}>
                            Surveyed
                          </div>
                          <div className={`p-1.5 rounded-md border ${stage.stages.cadCompared ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-slate-100 border-slate-200 text-slate-400"}`}>
                            CAD Checked
                          </div>
                          <div className={`p-1.5 rounded-md border ${stage.stages.formworkInspected ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-slate-100 border-slate-200 text-slate-400"}`}>
                            Formwork OK
                          </div>
                          <div className={`p-1.5 rounded-md border ${stage.stages.engineerApproved ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-slate-100 border-slate-200 text-slate-400"}`}>
                            Eng. Approved
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* AI Risk Alert Panel */}
                  <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-4 space-y-2">
                    <span className="text-[10px] text-red-600 font-extrabold uppercase tracking-widest block">AI RISK ALERTS</span>
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center space-x-2 text-slate-700 font-semibold">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full shrink-0"></span>
                        <p>Tower Block A Floor 4 Elevator Shaft verticality offset is close to maximum tolerance (3.8mm).</p>
                      </div>
                      <div className="flex items-center space-x-2 text-slate-700 font-semibold">
                        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full shrink-0"></span>
                        <p>Weekly productivity for Carpentry Squad has slowed by 4% due to material corner pre-staging delays.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right side: Attendance & Productivity Rollups */}
                <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                      📊 {isAmharic ? "ምርታማነት እና ስራ ማጠቃለያ" : "Attendance & Productivity Analytics"}
                    </h3>
                    <span className="text-[10px] text-slate-400">Head Office Feed</span>
                  </div>

                  {/* Present summary */}
                  <div className="space-y-3">
                    <div className="flex justify-between text-xs font-bold text-slate-600">
                      <span>{isAmharic ? "የሰራተኛ አጠቃላይ ተሳትፎ" : "Daily Workforce Attendance"}</span>
                      <span className="font-mono text-slate-800">82% Present</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: "82%" }}></div>
                    </div>

                    <div className="flex justify-between text-xs font-bold text-slate-600 pt-1">
                      <span>{isAmharic ? "የፎርምወርክ ማጠናቀቅ ፍጥነት" : "Installed Panels vs Target"}</span>
                      <span className="font-mono text-slate-800">79% Done</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-blue-500 h-full rounded-full" style={{ width: "79%" }}></div>
                    </div>
                  </div>

                  {/* Recharts Productivity Chart */}
                  <div className="h-[180px] pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={progressSummary.productivityTeam}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="team" stroke="#94a3b8" fontSize={9} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} />
                        <Tooltip />
                        <Bar dataKey="panelsPerDay" fill="#4f46e5" radius={[4, 4, 0, 0]} name="Panels/Day">
                          <Cell fill="#4f46e5" />
                          <Cell fill="#ef4444" />
                          <Cell fill="#10b981" />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>

              {/* ========================================== */}
              {/* SYSTEM AUTOMATIC REPORTS SECTION */}
              {/* ========================================== */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                      📄 {isAmharic ? "አውቶማቲክ የግንባታ ሪፖርቶች" : "Automatic System Report Generator"}
                    </h3>
                    <p className="text-[10px] text-slate-400">Export high-precision engineering logs to PDF/Excel dynamically</p>
                  </div>

                  {/* Export Trigger Actions */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleExport("PDF", activeReportType)}
                      className="bg-red-600 hover:bg-red-700 text-white text-[10px] font-black uppercase px-3 py-1.5 rounded-lg flex items-center space-x-1 transition-all cursor-pointer"
                    >
                      <FileDown size={12} />
                      <span>Export PDF</span>
                    </button>
                    <button
                      onClick={() => handleExport("Excel", activeReportType)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase px-3 py-1.5 rounded-lg flex items-center space-x-1 transition-all cursor-pointer"
                    >
                      <FileSpreadsheet size={12} />
                      <span>Export Excel</span>
                    </button>
                  </div>
                </div>

                {/* Export Notice Overlay */}
                {exportNotice && (
                  <div className="bg-slate-900 text-white p-3 rounded-lg text-xs font-mono animate-pulse">
                    🚀 {exportNotice}
                  </div>
                )}

                {/* Selector for active preview report */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {[
                    { id: "dailyConstruction", label: isAmharic ? "ዕለታዊ ግንባታ ሪፖርት" : "Daily Construction" },
                    { id: "survey", label: isAmharic ? "የሰርቬይ ሪፖርት" : "Daily Geodetic Survey" },
                    { id: "attendance", label: isAmharic ? "የሰራተኞች ሪፖርት" : "Attendance Summary" },
                    { id: "productivity", label: isAmharic ? "ምርታማነት ሪፖርት" : "Productivity Matrix" },
                    { id: "concreteReadiness", label: isAmharic ? "የኮንክሪት ዝግጁነት" : "Concrete Readiness" }
                  ].map((rep) => (
                    <button
                      key={rep.id}
                      onClick={() => setActiveReportType(rep.id as any)}
                      className={`px-3 py-2 text-[11px] font-black uppercase rounded-lg border text-center transition-all cursor-pointer ${
                        activeReportType === rep.id
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {rep.label}
                    </button>
                  ))}
                </div>

                {/* Report Live Simulated Preview Frame */}
                <div className="bg-slate-950 text-slate-300 p-5 rounded-xl border border-slate-800 font-mono text-[11px] space-y-4">
                  <div className="flex justify-between border-b border-slate-800 pb-2 text-[10px] text-slate-400">
                    <span>OVID ERP REPORT MODULE v3.4</span>
                    <span>TIMESTAMP: 2026-07-08 23:50 UTC</span>
                  </div>

                  {activeReportType === "dailyConstruction" && (
                    <div className="space-y-2">
                      <h4 className="text-white font-bold text-xs uppercase border-b border-slate-800 pb-1">DAILY CONSTRUCTION EXECUTIVE REPORT</h4>
                      <p>Project Site: <span className="text-white">{selectedProject}</span></p>
                      <p>Total Aluminum Panels Checked: <span className="text-white">1,420 SQM Installed</span></p>
                      <p>Overall QA Quality Checklist Score: <span className="text-emerald-500">92% Compliance</span></p>
                      <p>Current Delay Factor: <span className="text-red-400">None detected for upcoming casting cycle</span></p>
                      <p>Verified By: Lead Engineer signature verified on security chain.</p>
                    </div>
                  )}

                  {activeReportType === "survey" && (
                    <div className="space-y-2">
                      <h4 className="text-white font-bold text-xs uppercase border-b border-slate-800 pb-1">GEODETIC FIELD SURVEY SUMMARY</h4>
                      <p>Active Instrument Serial: <span className="text-white">Trimble-R12i-88210</span></p>
                      <p>Grid Alignments Verified: <span className="text-emerald-500">All columns locked in core +/- 2mm</span></p>
                      <p>Elevation Variance: <span className="text-emerald-500">-1.2mm offset vs CAD design</span></p>
                      <p>Field Calibration Check: <span className="text-white">Next Calibration due 2026-08-10</span></p>
                    </div>
                  )}

                  {activeReportType === "attendance" && (
                    <div className="space-y-2">
                      <h4 className="text-white font-bold text-xs uppercase border-b border-slate-800 pb-1">DAILY LABOR ATTENDANCE ROLLUP</h4>
                      <p>Total Workforce Registered: <span className="text-white">128 Carpenters & Ironworkers</span></p>
                      <p>Check-In Verification Mode: <span className="text-white">Face Recognition / Biometric Fingerprint</span></p>
                      <p>Late Ingress Logged: <span className="text-amber-500">4 daily laborers under observation</span></p>
                      <p>Shift Work Hours Completed: <span className="text-white">1,024 Total Man-Hours</span></p>
                    </div>
                  )}

                  {activeReportType === "productivity" && (
                    <div className="space-y-2">
                      <h4 className="text-white font-bold text-xs uppercase border-b border-slate-800 pb-1">DAILY PRODUCTIVITY & SPEED MATRIX</h4>
                      <p>Zone A Speed: <span className="text-emerald-400">45 panels/day (Optimal)</span></p>
                      <p>Zone B Speed: <span className="text-amber-400">32 panels/day (Bracing bottleneck)</span></p>
                      <p>Worker Team Alpha Efficiency: <span className="text-emerald-400">94% score</span></p>
                      <p>Daily Recommendation: Reallocate 3 panel fitters to active Elevator core zone.</p>
                    </div>
                  )}

                  {activeReportType === "concreteReadiness" && (
                    <div className="space-y-2">
                      <h4 className="text-white font-bold text-xs uppercase border-b border-slate-800 pb-1">CONCRETE READINESS COMPLIANCE VERDICT</h4>
                      <p>Target Zone: <span className="text-white">{selectedProject} Floor 4 Zone A</span></p>
                      <p>Survey Calibration Lock: <span className="text-emerald-400">PASSED</span></p>
                      <p>Formwork Alignment Level: <span className="text-emerald-400">PASSED</span></p>
                      <p>Site Supervisor Approval: <span className="text-emerald-400">APPROVED</span></p>
                      <p>Lead Engineer Casting Release: <span className="text-red-400">WAITING FOR FINAL SIGN-OFF</span></p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* -------------------------------------------------------- */}
          {/* TAB 2: EQUIPMENT & CONTROL POINT MANAGEMENT */}
          {/* -------------------------------------------------------- */}
          {activeTab === "equipment" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column: Equipment Management List */}
              <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                      🛠️ {isAmharic ? "የሰርቬይንግ መሳሪያዎች መቆጣጠሪያ" : "Registered Geodetic Site Instruments"}
                    </h3>
                    <p className="text-[10px] text-slate-400">Calibration certificate logs and availability matrix</p>
                  </div>
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold font-mono">
                    {equipmentList.length} Active Devices
                  </span>
                </div>

                {/* Instruments List Cards */}
                <div className="space-y-3">
                  {equipmentList.map((eq) => {
                    const isExpiring = new Date(eq.nextCalibrationDate) <= new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000);
                    return (
                      <div key={eq.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-[9px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono font-black">{eq.id}</span>
                            <h4 className="text-xs font-black text-slate-800">{eq.name}</h4>
                          </div>
                          <p className="text-[10px] text-slate-500 font-mono">
                            {eq.manufacturer} {eq.model} — S/N: {eq.serialNumber}
                          </p>
                          <div className="flex items-center space-x-2 pt-1">
                            <span className="text-[9px] text-slate-400 font-bold">Calibration Cert: {eq.calibrationCertNo}</span>
                            <span className="text-slate-300">|</span>
                            <span className={`text-[9px] font-black font-mono ${isExpiring ? "text-red-500 animate-pulse" : "text-slate-500"}`}>
                              Next Cal: {eq.nextCalibrationDate}
                            </span>
                          </div>
                        </div>

                        <div className="flex sm:flex-col items-end gap-2 sm:gap-1 w-full sm:w-auto justify-between">
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                            eq.status === "Available" ? "bg-emerald-100 text-emerald-800" :
                            eq.status === "In Use" ? "bg-blue-100 text-blue-800" : "bg-red-100 text-red-800"
                          }`}>
                            {eq.status}
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono">Eng: {eq.assignedEngineer}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Equipment Form */}
                <form onSubmit={handleAddEquipment} className="p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/20 space-y-3">
                  <span className="text-[10px] text-slate-500 font-black uppercase block">Add New Instrument</span>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      required
                      placeholder="Instrument Name"
                      value={newEqName}
                      onChange={(e) => setNewEqName(e.target.value)}
                      className="text-xs border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-red-500 bg-white"
                    />
                    <select
                      value={newEqType}
                      onChange={(e) => setNewEqType(e.target.value)}
                      className="text-xs border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-red-500 bg-white"
                    >
                      <option value="Total Station">Total Station</option>
                      <option value="GNSS / RTK GPS">GNSS / RTK GPS</option>
                      <option value="Digital Level">Digital Level</option>
                      <option value="3D Laser Scanner">3D Laser Scanner</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <input
                      type="text"
                      placeholder="Manufacturer"
                      value={newEqMfg}
                      onChange={(e) => setNewEqMfg(e.target.value)}
                      className="text-xs border border-slate-200 rounded-lg p-2 focus:outline-none bg-white"
                    />
                    <input
                      type="text"
                      placeholder="Model"
                      value={newEqModel}
                      onChange={(e) => setNewEqModel(e.target.value)}
                      className="text-xs border border-slate-200 rounded-lg p-2 focus:outline-none bg-white"
                    />
                    <input
                      type="text"
                      required
                      placeholder="Serial Number"
                      value={newEqSN}
                      onChange={(e) => setNewEqSN(e.target.value)}
                      className="text-xs border border-slate-200 rounded-lg p-2 focus:outline-none bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[8px] font-black text-slate-400 block mb-0.5">CALIBRATION DATE</label>
                      <input
                        type="date"
                        value={newEqCalDate}
                        onChange={(e) => setNewEqCalDate(e.target.value)}
                        className="text-xs border border-slate-200 rounded-lg p-1.5 focus:outline-none w-full"
                      />
                    </div>
                    <div>
                      <label className="text-[8px] font-black text-slate-400 block mb-0.5">NEXT DUE DATE</label>
                      <input
                        type="date"
                        value={newEqNextCalDate}
                        onChange={(e) => setNewEqNextCalDate(e.target.value)}
                        className="text-xs border border-slate-200 rounded-lg p-1.5 focus:outline-none w-full"
                      />
                    </div>
                    <div>
                      <label className="text-[8px] font-black text-slate-400 block mb-0.5">CERTIFICATE NUMBER</label>
                      <input
                        type="text"
                        placeholder="CERT-XXXX"
                        value={newEqCalCert}
                        onChange={(e) => setNewEqCalCert(e.target.value)}
                        className="text-xs border border-slate-200 rounded-lg p-1.5 focus:outline-none w-full"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black uppercase py-2 rounded-lg"
                  >
                    Register Device & Active Cert Log
                  </button>
                </form>
              </div>

              {/* Right Column: Control Point Management */}
              <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                      📍 {isAmharic ? "ቋሚ የቁጥጥር ነጥቦች" : "Permanent Geodetic Benchmarks"}
                    </h3>
                    <p className="text-[10px] text-slate-400">Primary reference control points for current and future scans</p>
                  </div>
                  <span className="text-[10px] bg-red-500/10 text-red-600 px-2 py-0.5 rounded font-bold font-mono">OVID REF</span>
                </div>

                {/* CP Cards */}
                <div className="space-y-3">
                  {controlPoints.map((cp) => (
                    <div key={cp.id} className="p-3 rounded-xl border border-slate-150 bg-slate-50/50 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-mono font-black text-xs text-red-600">{cp.id}</span>
                        <span className="text-[9px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono font-bold">
                          {cp.accuracyLevel.split(" ")[0]}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-1 text-[10px] font-mono text-slate-600">
                        <div>Easting X: <strong className="text-slate-800">{cp.eastingX}</strong></div>
                        <div>Northing Y: <strong className="text-slate-800">{cp.northingY}</strong></div>
                        <div>Elev Z: <strong className="text-slate-800">{cp.elevationZ}m</strong></div>
                      </div>

                      <div className="flex justify-between items-center pt-1 border-t border-slate-200 text-[9px] text-slate-400 font-mono">
                        <span>Ref: {cp.benchmarkRef}</span>
                        <span>Eng: {cp.surveyEngineer}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Control Point Form */}
                <form onSubmit={handleAddControlPoint} className="p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/20 space-y-3">
                  <span className="text-[10px] text-slate-500 font-black uppercase block">Establish New Control Point</span>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      required
                      placeholder="Control Point ID (e.g., CP-03)"
                      value={newCpId}
                      onChange={(e) => setNewCpId(e.target.value)}
                      className="text-xs border border-slate-200 rounded-lg p-2 focus:outline-none bg-white"
                    />
                    <input
                      type="text"
                      placeholder="Benchmark Ref (e.g. BM-BOLE)"
                      value={newCpBM}
                      onChange={(e) => setNewCpBM(e.target.value)}
                      className="text-xs border border-slate-200 rounded-lg p-2 focus:outline-none bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="Easting X"
                      value={newCpX}
                      onChange={(e) => setNewCpX(e.target.value)}
                      className="text-xs border border-slate-200 rounded-lg p-2 focus:outline-none bg-white"
                    />
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="Northing Y"
                      value={newCpY}
                      onChange={(e) => setNewCpY(e.target.value)}
                      className="text-xs border border-slate-200 rounded-lg p-2 focus:outline-none bg-white"
                    />
                    <input
                      type="number"
                      step="any"
                      placeholder="Elevation Z"
                      value={newCpZ}
                      onChange={(e) => setNewCpZ(e.target.value)}
                      className="text-xs border border-slate-200 rounded-lg p-2 focus:outline-none bg-white"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black uppercase py-2 rounded-lg"
                  >
                    Lock Benchmark reference
                  </button>
                </form>
              </div>

            </div>
          )}

          {/* -------------------------------------------------------- */}
          {/* TAB 3: FLOOR SURVEY & ALUMINUM FORMWORK CAD VERIFICATION */}
          {/* -------------------------------------------------------- */}
          {activeTab === "verification" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column: Floor Survey Verification */}
              <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                      📐 {isAmharic ? "የወለል ላይ የሰርቬይ መለኪያ ቁጥጥር (Floor Verification)" : "Floor Survey Verification Checklist"}
                    </h3>
                    <p className="text-[10px] text-slate-400">Comparing measured field locations with CAD design</p>
                  </div>
                  <span className="text-[9px] bg-red-500/10 text-red-600 px-2 py-0.5 rounded font-black font-mono">TOLERANCE +/- 4mm</span>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed">
                  Before starting Aluminum Formwork assembly, ensure all coordinate references match. Click on any item below to resolve/flag deviations.
                </p>

                {/* List of verification checklist */}
                <div className="space-y-2.5">
                  {verificationElements.map((el) => {
                    const isDefect = el.status === "Deviation Detected";
                    return (
                      <div
                        key={el.id}
                        onClick={() => handleToggleVerificationElement(el.id)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer hover:bg-slate-50 flex items-center justify-between ${
                          isDefect ? "border-red-200 bg-red-500/5" : "border-slate-150 bg-slate-50/50"
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          {isDefect ? (
                            <AlertCircle size={16} className="text-red-500 animate-pulse shrink-0" />
                          ) : (
                            <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                          )}
                          <div>
                            <h4 className="text-xs font-black text-slate-800">{el.name}</h4>
                            <p className="text-[10px] text-slate-400 font-mono">
                              Planned X: {el.plannedX.toFixed(1)}m | Measured X: {el.measuredX.toFixed(3)}m
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className={`text-[9px] font-mono font-black block ${isDefect ? "text-red-600" : "text-emerald-600"}`}>
                            {el.deviationMm}mm Dev
                          </span>
                          <span className="text-[8px] uppercase tracking-widest text-slate-400 block font-bold">
                            {isDefect ? "CRITICAL" : "PASSED"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Aluminum Formwork Verification */}
              <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                      🧱 {isAmharic ? "የአሉሚኒየም ፎርምወርክ ቁጥጥር (CAD vs Actual)" : "Aluminum Formwork Panel Verification"}
                    </h3>
                    <p className="text-[10px] text-slate-400">Reconciling physical installed panels with CAD layout</p>
                  </div>
                  <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded font-black font-mono">
                    PANELS AUDIT
                  </span>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed">
                  The system scans individual panels (Wall panels, Beam panels, Corner panels) and flags mismatches or missing elements compared to drawing schedules.
                </p>

                {/* Panel reconcilation simulator button */}
                <button
                  onClick={() => {
                    alert(isAmharic ? "የአሉሚኒየም ፎርምወርክ ፓነል ፍተሻ እንደገና እየተሰላ ነው..." : "Re-scanning panel placements with CAD drawing...");
                    setFormworkPanels(prev => prev.map(p => ({ ...p, status: "Correct" })));
                  }}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-black uppercase py-2.5 rounded-xl flex items-center justify-center space-x-1.5 transition-all cursor-pointer shadow-sm animate-pulse"
                >
                  <RefreshCw size={13} className="text-indigo-400 animate-spin-slow" />
                  <span>Simulate Scanner CAD Reconciliation</span>
                </button>

                {/* DYNAMIC PANEL INPUT & AUTOMATIC AREA CALCULATOR */}
                <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/60 space-y-3.5">
                  <div className="flex items-center space-x-2 border-b border-slate-200/60 pb-2">
                    <Sliders className="text-indigo-600 animate-pulse" size={15} />
                    <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                      {isAmharic ? "የፓነል አይነት እና መጠን ማስገቢያ (Automatic Area Calculator)" : "Panel Dimension Input & Auto Area Calculator"}
                    </h4>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Panel Type Selection */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide block">
                        {isAmharic ? "የፓነል አይነት" : "Panel Type"}
                      </label>
                      <select
                        value={panelTypeInput}
                        onChange={(e) => setPanelTypeInput(e.target.value)}
                        className="w-full bg-white border border-slate-250 rounded-lg p-1.5 text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 font-sans font-medium"
                      >
                        <option value="Wall Panel">{isAmharic ? "Wall Panel (የግድግዳ)" : "Wall Panel"}</option>
                        <option value="Beam Panel">{isAmharic ? "Beam Panel (የጋርደር)" : "Beam Panel"}</option>
                        <option value="Deck Panel">{isAmharic ? "Deck Panel (የወለል)" : "Deck Panel"}</option>
                        <option value="Corner Panel">{isAmharic ? "Corner Panel (የማዕዘን)" : "Corner Panel"}</option>
                        <option value="Internal Corner">{isAmharic ? "Internal Corner (የውስጥ)" : "Internal Corner"}</option>
                        <option value="External Corner">{isAmharic ? "External Corner (የውጭ)" : "External Corner"}</option>
                      </select>
                    </div>

                    {/* Installed Location */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide block">
                        {isAmharic ? "የመገጣጠሚያ አካባቢ" : "Location / Area"}
                      </label>
                      <input
                        type="text"
                        value={panelLocationInput}
                        onChange={(e) => setPanelLocationInput(e.target.value)}
                        placeholder="e.g. Shear Wall B, Floor 4"
                        className="w-full bg-white border border-slate-250 rounded-lg p-1.5 text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 font-sans"
                      />
                    </div>
                  </div>

                  {/* Dimensions Row */}
                  <div className="grid grid-cols-3 gap-2">
                    {/* Width (mm) */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide block">
                        {isAmharic ? "ስፋት (ሚ.ሜ)" : "Width (mm)"}
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={panelWidthInput}
                        onChange={(e) => setPanelWidthInput(e.target.value)}
                        className="w-full bg-white border border-slate-250 rounded-lg p-1.5 text-xs font-mono font-bold text-slate-800 focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    {/* Height (mm) */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide block">
                        {isAmharic ? "ቁመት (ሚ.ሜ)" : "Height (mm)"}
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={panelHeightInput}
                        onChange={(e) => setPanelHeightInput(e.target.value)}
                        className="w-full bg-white border border-slate-250 rounded-lg p-1.5 text-xs font-mono font-bold text-slate-800 focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    {/* Quantity */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide block">
                        {isAmharic ? "ብዛት" : "Qty"}
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={panelQtyInput}
                        onChange={(e) => setPanelQtyInput(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full bg-white border border-slate-250 rounded-lg p-1.5 text-xs font-mono font-bold text-slate-800 focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Automatic Real-Time Area Calculations */}
                  <div className="bg-slate-900 text-white rounded-xl p-3 border border-slate-800 flex items-center justify-between gap-2 shadow-inner">
                    <div className="space-y-1">
                      <span className="text-[8px] uppercase tracking-widest text-indigo-400 font-extrabold block">
                        {isAmharic ? "የአንድ ፓነል ስፋት" : "Single Panel Area"}
                      </span>
                      <div className="flex items-baseline space-x-1.5">
                        <span className="text-lg font-black font-mono text-emerald-400">
                          {((parseFloat(panelWidthInput) || 0) * (parseFloat(panelHeightInput) || 0) / 1000000).toFixed(4)}
                        </span>
                        <span className="text-[9px] text-slate-400 font-bold">m²</span>
                      </div>
                    </div>

                    <div className="text-right space-y-1">
                      <span className="text-[8px] uppercase tracking-widest text-indigo-400 font-extrabold block">
                        {isAmharic ? "ጠቅላላ ስፋት (m²)" : "Total Batch Area (m²)"}
                      </span>
                      <div className="flex items-baseline justify-end space-x-1.5">
                        <span className="text-xl font-black font-mono text-indigo-300">
                          {(((parseFloat(panelWidthInput) || 0) * (parseFloat(panelHeightInput) || 0) * panelQtyInput) / 1000000).toFixed(3)}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold">m²</span>
                      </div>
                    </div>
                  </div>

                  {/* Helper Dimension Example text */}
                  <div className="text-[9px] text-slate-400 font-medium leading-relaxed italic bg-slate-100/50 p-2 rounded-lg">
                    💡 {isAmharic 
                      ? "ለምሳሌ፦ የግድግዳ ፓነል (Wall Panels) መጠን 600×240 ሚ.ሜ ሲሆን፣ ሲስተሙ በራስ-ሰር 0.144 m² የፓነል ስፋት ያሰላል።" 
                      : "Example: For Wall Panels with dimensions 600×240 mm, the system automatically computes an area of 0.144 m² per unit."}
                  </div>

                  {/* Add button */}
                  <button
                    type="button"
                    onClick={() => {
                      const w = parseFloat(panelWidthInput) || 0;
                      const h = parseFloat(panelHeightInput) || 0;
                      if (w <= 0 || h <= 0) {
                        alert(isAmharic ? "እባክዎን ትክክለኛ ስፋት እና ቁመት ያስገቡ" : "Please input valid width and height dimensions.");
                        return;
                      }
                      
                      const panelArea = (w * h * panelQtyInput) / 1000000;
                      const newId = `P-CST-${Date.now().toString().slice(-4)}`;
                      const newRecord: AluminumFormworkPanel = {
                        panelId: newId,
                        size: `${w}x${h}`,
                        location: panelLocationInput || (isAmharic ? "ማዕከላዊ ግንባታ ቦታ" : "Central Formwork Location"),
                        type: panelTypeInput as any,
                        quantity: panelQtyInput,
                        status: "Correct",
                        installedLocation: `${panelTypeInput.charAt(0)}-${Math.floor(Math.random() * 20) + 1}`
                      };

                      setFormworkPanels(prev => [newRecord, ...prev]);

                      if (onLogAction) {
                        onLogAction(
                          isAmharic ? "አዲስ የፎርምወርክ ፓነል ተመዝግቧል" : "Registered Custom Formwork Panel",
                          isAmharic 
                            ? `የፓነል አይነት: ${panelTypeInput}፣ መጠን: ${w}x${h} ሚ.ሜ፣ ብዛት: ${panelQtyInput}፣ በራስ-ሰር የተሰላ ስፋት: ${panelArea.toFixed(3)} m²`
                            : `Added custom ${panelTypeInput} [${w}x${h}mm], Qty: ${panelQtyInput}, Calculated Area: ${panelArea.toFixed(3)} m² to CAD log.`
                        );
                      }

                      // Reset location input & show success confirmation toast/alert via log
                      setPanelLocationInput("");
                      setPanelQtyInput(1);
                    }}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-2.5 px-3 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/10 active:scale-95"
                  >
                    <Plus size={13} />
                    <span>{isAmharic ? "አዲስ ፓነል ወደ መዝገብ ጨምር" : "Add Panel to Audit Inventory"}</span>
                  </button>
                </div>

                {/* Panels Status List */}
                <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                  {formworkPanels.map((panel, idx) => {
                    const isMismatched = panel.status === "Mismatched" || panel.status === "Missing";
                    return (
                      <div key={idx} className={`p-3 rounded-xl border flex items-center justify-between ${
                        panel.status === "Missing" ? "bg-red-500/5 border-red-200" :
                        panel.status === "Mismatched" ? "bg-amber-500/5 border-amber-200" : "bg-slate-50/50 border-slate-150"
                      }`}>
                        <div className="space-y-0.5">
                          <div className="flex items-center space-x-2">
                            <span className="text-[9px] font-black font-mono bg-slate-200 text-slate-700 px-1 py-0.5 rounded">{panel.panelId}</span>
                            <span className="text-xs font-black text-slate-800">{panel.type}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-mono">Size: {panel.size}mm | Area: {panel.location}</p>
                        </div>

                        <div className="text-right">
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                            panel.status === "Correct" ? "bg-emerald-100 text-emerald-800" :
                            panel.status === "Missing" ? "bg-red-100 text-red-800 animate-pulse" : "bg-amber-100 text-amber-800"
                          }`}>
                            {panel.status}
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono block mt-1">Qty: {panel.quantity}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* -------------------------------------------------------- */}
          {/* TAB 4: DAILY PROGRESS & AI CONSTRUCTION ASSISTANT */}
          {/* -------------------------------------------------------- */}
          {activeTab === "progress" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column: Progress Calculator Charts */}
              <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                      📈 {isAmharic ? "ዕለታዊ የግንባታ ምርታማነት እና የጊዜ ሰሌዳ ስሌት" : "Daily Construction Speed & Progress Estimator"}
                    </h3>
                    <p className="text-[10px] text-slate-400">Integrated calculation from CAD layout and site imagery logs</p>
                  </div>
                  <span className="text-[10px] bg-amber-500/10 text-amber-600 px-2.5 py-1 rounded font-black font-mono">
                    CALCULATED
                  </span>
                </div>

                {/* Progress Bar Side-by-side */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/60 space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">PLANNED CYCLE PROGRESS</span>
                    <p className="text-xl font-black text-indigo-600 font-mono">{progressSummary.plannedProgress}%</p>
                    <span className="text-[9px] text-slate-400 block font-medium">As per structural sequence</span>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/60 space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">ESTIMATED ACTUAL SPEED</span>
                    <p className="text-xl font-black text-amber-500 font-mono">{progressSummary.actualProgress}%</p>
                    <span className="text-[9px] text-red-500 block font-bold">-9% Behind Schedule</span>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/60 space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">EST. COMPLETION DATE</span>
                    <p className="text-xs font-black text-slate-800 font-mono">{progressSummary.completionDate}</p>
                    <span className="text-[9px] text-amber-600 block font-bold">3 Days Deviation</span>
                  </div>
                </div>

                {/* Recharts Progress visualizer */}
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={[
                      { name: "Mon", Planned: 20, Actual: 18 },
                      { name: "Tue", Planned: 40, Actual: 35 },
                      { name: "Wed", Planned: 60, Actual: 52 },
                      { name: "Thu", Planned: 80, Actual: 68 },
                      { name: "Fri", Planned: 88, Actual: 79 }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} />
                      <YAxis stroke="#94a3b8" fontSize={9} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 9 }} />
                      <Line type="monotone" dataKey="Planned" stroke="#4f46e5" strokeWidth={3} activeDot={{ r: 6 }} name="Planned Cycles" />
                      <Line type="monotone" dataKey="Actual" stroke="#f59e0b" strokeWidth={3} name="Actual Panels Installed" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Productivity per zone */}
                <div className="space-y-2">
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase block">Productivity per active zone (Panels/shift)</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {progressSummary.productivityZone.map((zone, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700">{zone.zone.split(" ")[0]}</span>
                        <strong className="font-mono text-slate-900">{zone.panelsPerDay} units/day</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: AI Construction Assistant */}
              <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
                    <Sparkles size={18} className="text-red-500 animate-pulse shrink-0" />
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                        🤖 {isAmharic ? "OVID AI የግንባታ ረዳት" : "OVID AI Construction Assistant Core"}
                      </h3>
                      <p className="text-[10px] text-slate-400">Predictive insights from site sensors & schedule feeds</p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-4">
                    {/* Recommendation Card 1: Priority Zones */}
                    <div className="bg-slate-55 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center space-x-2 text-indigo-600 font-bold uppercase text-[10px]">
                        <Compass size={12} />
                        <span>Tomorrow's Priority Zone</span>
                      </div>
                      <p className="text-slate-800 font-semibold leading-relaxed">
                        "Focus geodetic leveling on Tower Block A, Floor 4, Zone B Shaft. Speeding up formwork alignment will unlock Wednesday's 120m³ pour cycle."
                      </p>
                    </div>

                    {/* Recommendation Card 2: Workers */}
                    <div className="bg-slate-55 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center space-x-2 text-emerald-600 font-bold uppercase text-[10px]">
                        <Users size={12} />
                        <span>Manpower Reallocation</span>
                      </div>
                      <p className="text-slate-800 font-semibold leading-relaxed">
                        "Allocate 4 additional carpenters from completed Zone C to active Zone B shear-walls. This covering covers the 9% daily deficit."
                      </p>
                    </div>

                    {/* Recommendation Card 3: Materials */}
                    <div className="bg-slate-55 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center space-x-2 text-amber-600 font-bold uppercase text-[10px]">
                        <Layers size={12} />
                        <span>Materials Pre-staging</span>
                      </div>
                      <p className="text-slate-800 font-semibold leading-relaxed">
                        "Pre-stage 12 wall corners and 4 deck panel fillers near elevator core crane access point tonight."
                      </p>
                    </div>

                    {/* Safety Warnings */}
                    <div className="bg-red-500/5 p-3.5 rounded-xl border border-red-200 text-xs space-y-1.5">
                      <div className="flex items-center space-x-2 text-red-600 font-bold uppercase text-[10px]">
                        <ShieldAlert size={12} className="animate-bounce" />
                        <span>AI Safety & Wind Warnings</span>
                      </div>
                      <p className="text-slate-800 font-semibold leading-relaxed">
                        "Wind gusts are expected to reach 18 knots tomorrow. Instruct Gang Chiefs to anchor all loose aluminum deck panels on Floor 4 immediately."
                      </p>
                    </div>
                  </div>
                </div>

                <div className="text-[9px] text-slate-400 font-mono text-center border-t border-slate-100 pt-3">
                  AI insights assist scheduling decisions and do not override professional engineer approval.
                </div>
              </div>

            </div>
          )}

          {/* -------------------------------------------------------- */}
          {/* TAB 5: COMPREHENSIVE QUALITY & CONCRETE POUR SIGNOFF */}
          {/* -------------------------------------------------------- */}
          {activeTab === "signoff" && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    🏗️ {isAmharic ? "ለኮንክሪት ዝግጁነት አጠቃላይ ማረጋገጫ ማእከል" : "Full Floor Pour Authorization Signoff"}
                  </h3>
                  <p className="text-[10px] text-slate-400">Verifying structural, safety, and survey compliance parameters before casting</p>
                </div>

                <div className={`text-xs font-black uppercase px-4 py-1.5 rounded-full text-center ${
                  activeStage.status === "Ready for Concrete" ? "bg-emerald-100 text-emerald-800 animate-pulse" : "bg-red-100 text-red-800"
                }`}>
                  {isAmharic ? "የወለል ሁኔታ: " : "Floor Status: "} {activeStage.status}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Left side: Checklist details */}
                <div className="lg:col-span-8 space-y-4">
                  <p className="text-xs text-slate-500">
                    A floor zone cannot be marked **Ready for Concrete** until all 8 mandatory survey, CAD, safety, and photo verification parameters are checked.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {[
                      { key: "surveyCompleted", label: isAmharic ? "1. የሰርቬይ ፍተሻ ተጠናቋል" : "1. Geodetic Field Survey Complete", desc: "Permanent benchmark levels verified" },
                      { key: "cadCompared", label: isAmharic ? "2. የCAD ንጽጽር ተደርጓል" : "2. CAD Comparison Approved", desc: "No coordinate drift exceeds +/- 4mm" },
                      { key: "formworkInspected", label: isAmharic ? "3. የፎርምወርክ ስብስብ ተረጋግጧል" : "3. Formwork Placements Inspected", desc: "Missing corner pins or panels corrected" },
                      { key: "alignmentInspected", label: isAmharic ? "4. የአቀባዊነት ቁጥጥር ተከናውኗል" : "4. Vertical Alignment Checked", desc: "Supporting bracing locked tight" },
                      { key: "safetyInspected", label: isAmharic ? "5. የደህንነት ፍተሻ ተጠናቋል" : "5. Site Safety Inspection Done", desc: "PPE checks and wind risk evaluation" },
                      { key: "photoInspected", label: isAmharic ? "6. የዕለት ፎቶ ፍተሻ ጸድቋል" : "6. Photogrammetry Check Approved", desc: "Daily site photo upload verified" },
                      { key: "supervisorApproved", label: isAmharic ? "7. የሳይት ሱፐርቫይዘር ፈቃድ" : "7. Supervisor Digital Signoff", desc: "Site construction leader clearance" },
                      { key: "engineerApproved", label: isAmharic ? "8. የዋና መሃንዲስ ፈቃድ" : "8. Lead Engineer Authorization", desc: "Final concrete release release" }
                    ].map((step) => {
                      const isChecked = activeStage.stages[step.key as keyof ProjectStageOverview["stages"]];
                      return (
                        <div
                          key={step.key}
                          onClick={() => handleToggleQualitySignoff(step.key as any)}
                          className={`p-3.5 rounded-xl border transition-all cursor-pointer hover:bg-slate-50 flex items-start space-x-3 ${
                            isChecked ? "bg-emerald-500/5 border-emerald-200" : "bg-slate-50/50 border-slate-150"
                          }`}
                        >
                          <div className={`w-4 h-4 rounded-md border mt-0.5 flex items-center justify-center shrink-0 ${isChecked ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300"}`}>
                            {isChecked && <CheckSquare size={12} />}
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-slate-800">{step.label}</h4>
                            <p className="text-[10px] text-slate-400 font-medium">{step.desc}</p>
                          </div>
                        </div>
                      );
                    })}

                  </div>
                </div>

                {/* Right side: Verification results & Audit Stamp */}
                <div className="lg:col-span-4 bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase block">Cast Release Interlock Audit</span>
                    
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between font-mono">
                        <span>Survey Status:</span>
                        <strong className={activeStage.stages.surveyCompleted ? "text-emerald-600" : "text-red-500"}>
                          {activeStage.stages.surveyCompleted ? "OK" : "PENDING"}
                        </strong>
                      </div>
                      <div className="flex justify-between font-mono">
                        <span>CAD Alignment Check:</span>
                        <strong className={activeStage.stages.cadCompared ? "text-emerald-600" : "text-red-500"}>
                          {activeStage.stages.cadCompared ? "OK" : "PENDING"}
                        </strong>
                      </div>
                      <div className="flex justify-between font-mono">
                        <span>Supervisor Approval:</span>
                        <strong className={activeStage.stages.supervisorApproved ? "text-emerald-600" : "text-red-500"}>
                          {activeStage.stages.supervisorApproved ? "SIGNED" : "PENDING"}
                        </strong>
                      </div>
                      <div className="flex justify-between font-mono">
                        <span>Lead Engineer Release:</span>
                        <strong className={activeStage.stages.engineerApproved ? "text-emerald-600" : "text-red-500"}>
                          {activeStage.stages.engineerApproved ? "GRANTED" : "PENDING"}
                        </strong>
                      </div>
                    </div>

                    <div className="p-3 bg-white rounded-lg border border-slate-200 text-[10px] text-slate-400 font-mono text-center">
                      🔐 DIGITAL KEY: SHA-256 Verified on Central OVID Ledger.
                    </div>
                  </div>

                  {/* Manual Override Action */}
                  <button
                    onClick={() => {
                      if (currentUserRole === UserRole.WORKER) {
                        alert("Unauthorized: Worker role cannot sign off concrete readiness.");
                        return;
                      }
                      
                      setProjectStages(prev => prev.map(proj => {
                        if (proj.project === selectedProject) {
                          return {
                            ...proj,
                            status: "Ready for Concrete",
                            stages: {
                              surveyCompleted: true,
                              cadCompared: true,
                              formworkInspected: true,
                              alignmentInspected: true,
                              safetyInspected: true,
                              photoInspected: true,
                              supervisorApproved: true,
                              engineerApproved: true
                            }
                          };
                        }
                        return proj;
                      }));

                      if (onLogAction) {
                        onLogAction("Admin Override Pour Release", `Manually authorized concrete pour release for ${selectedProject}`);
                      }
                    }}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-black uppercase py-2.5 rounded-lg text-center"
                  >
                    Quick-Sign All Checks (Admin)
                  </button>
                </div>

              </div>

            </div>
          )}

          {/* -------------------------------------------------------- */}
          {/* TAB 6: SURVEY REVIEW & PANEL INSTALLATION APPROVAL MODULE */}
          {/* -------------------------------------------------------- */}
          {activeTab === "approval" && (
            <div className="space-y-6">
              
              {/* Top Banner explaining module role access */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-3">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center space-x-2">
                      <span className="text-red-600">📋</span>
                      <span>{isAmharic ? "የሰርቬይ ፍተሻ እና የአሉሚኒየም ፎርምወርክ መገጣጠም ፈቃድ ማእከል" : "Survey Review & Panel Installation Authorization"}</span>
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      Cross-comparing field survey with approved CAD blueprints before formwork assembly
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] bg-red-500/10 text-red-600 px-3 py-1 rounded-full font-black font-mono">
                      {isAmharic ? "የኢንጂነሪንግ መቻቻል: ±4mm" : "Engineering Tolerance: ±4mm"}
                    </span>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-mono font-bold">
                      Real-time Sync Active
                    </span>
                  </div>
                </div>

                {/* Grid for Active Location Selection */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="text-[9px] font-black text-slate-400 block mb-1 uppercase">Project Selection</label>
                    <select
                      value={selectedProject}
                      onChange={(e) => {
                        const proj = e.target.value;
                        setSelectedProject(proj);
                        if (proj === "OVID Ayat East Block T2") {
                          setSelectedBuilding("Block T2");
                          setSelectedFloor(2);
                          setSelectedZone("Zone C - Staircase Core");
                        } else {
                          setSelectedBuilding("Tower Block A");
                          setSelectedFloor(4);
                          setSelectedZone("Zone A - West Wing");
                        }
                      }}
                      className="w-full border border-slate-200 rounded-lg p-2 font-bold bg-slate-50 focus:outline-none focus:border-red-500 animate-none"
                    >
                      <option value="OVID Bole Heights">OVID Bole Heights</option>
                      <option value="OVID Ayat East Block T2">OVID Ayat East Block T2</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[9px] font-black text-slate-400 block mb-1 uppercase">Building Block</label>
                    <select
                      value={selectedBuilding}
                      onChange={(e) => setSelectedBuilding(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg p-2 font-bold bg-slate-50 focus:outline-none"
                    >
                      {selectedProject === "OVID Bole Heights" ? (
                        <option value="Tower Block A">Tower Block A</option>
                      ) : (
                        <option value="Block T2">Block T2</option>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="text-[9px] font-black text-slate-400 block mb-1 uppercase">Floor Level</label>
                    <select
                      value={selectedFloor}
                      onChange={(e) => {
                        const fl = Number(e.target.value);
                        setSelectedFloor(fl);
                        if (fl === 5) {
                          setSelectedZone("Zone B - Elevator Shaft");
                        } else if (fl === 4) {
                          setSelectedZone("Zone A - West Wing");
                        } else {
                          setSelectedZone("Zone C - Staircase Core");
                        }
                      }}
                      className="w-full border border-slate-200 rounded-lg p-2 font-mono font-bold bg-slate-50 focus:outline-none"
                    >
                      {selectedProject === "OVID Bole Heights" ? (
                        <>
                          <option value={4}>Floor 4 (Active)</option>
                          <option value={5}>Floor 5 (Pending)</option>
                        </>
                      ) : (
                        <option value={2}>Floor 2 (Formwork Ready)</option>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="text-[9px] font-black text-slate-400 block mb-1 uppercase">Formwork Zone</label>
                    <select
                      value={selectedZone}
                      onChange={(e) => setSelectedZone(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg p-2 font-bold bg-slate-50 focus:outline-none"
                    >
                      {selectedFloor === 4 && <option value="Zone A - West Wing">Zone A - West Wing</option>}
                      {selectedFloor === 5 && <option value="Zone B - Elevator Shaft">Zone B - Elevator Shaft</option>}
                      {selectedFloor === 2 && <option value="Zone C - Staircase Core">Zone C - Staircase Core</option>}
                    </select>
                  </div>
                </div>
              </div>

              {/* Dynamic computed parameters */}
              {(() => {
                const currentKey = `${selectedProject}_${selectedBuilding}_${selectedFloor}_${selectedZone}`;
                const currentChecklist = (zoneAlignmentChecks[currentKey] || zoneAlignmentChecks["OVID Bole Heights_Tower Block A_4_Zone A - West Wing"]) as Record<string, { status: string; deviation: number }>;
                const currentApproval = (zoneApprovals[currentKey] || zoneApprovals["OVID Bole Heights_Tower Block A_4_Zone A - West Wing"]) as {
                  teamLeader: { status: "Approved" | "Pending" | "Rejected"; comment: string; user: string; time: string };
                  supervisor: { status: "Approved" | "Pending" | "Rejected"; comment: string; user: string; time: string };
                  siteEngineer: { status: "Approved" | "Pending" | "Rejected"; comment: string; user: string; time: string };
                };

                const exceededItems = Object.entries(currentChecklist).filter(([_, item]) => item.status === "EXCEEDED");
                const exceededCount = exceededItems.length;
                const maxDeviation = Math.max(...Object.values(currentChecklist).map((item: any) => Math.abs(item.deviation)));

                let recommendation: "Ready for Panel Installation" | "Review Required" | "Not Ready" = "Ready for Panel Installation";
                let recColor = "bg-emerald-500/10 text-emerald-800 border-emerald-200";
                let recDesc = isAmharic 
                  ? "ሰርቬይ መረጃዎች በሙሉ የተፈቀደውን መቻቻል ያከብራሉ፤ የአሉሚኒየም ፎርምወርክ ስብስብ መጀመር ይችላል።" 
                  : "All structural measurements are within allowable tolerances. Safe to initiate aluminum formwork assembly.";

                if (exceededCount > 1 || maxDeviation > 7.0) {
                  recommendation = "Not Ready";
                  recColor = "bg-red-500/10 text-red-800 border-red-200";
                  recDesc = isAmharic 
                    ? "ከባድ የደረጃ መዛባቶች ተገኝተዋል! የአሉሚኒየም ፎርምወርቅ ከመጫኑ በፊት በአስቸኳይ መስተካከል አለበት።" 
                    : "CRITICAL DEVIATIONS DETECTED! Do not assemble panels until structural alignment is corrected.";
                } else if (exceededCount > 0) {
                  recommendation = "Review Required";
                  recColor = "bg-amber-500/10 text-amber-800 border-amber-200";
                  recDesc = isAmharic 
                    ? "አነስተኛ መዛባቶች ተገኝተዋል። የሱፐርቫይዘር እና የሳይት መሃንዲስ ተጨማሪ ማረጋገጫ ያስፈልጋል።" 
                    : "Minor deviations logged. Site Engineer review is mandatory to approve tolerance buffer.";
                }

                // Check if all approvals are complete
                const isAllApproved = 
                  currentApproval.teamLeader.status === "Approved" &&
                  currentApproval.supervisor.status === "Approved" &&
                  currentApproval.siteEngineer.status === "Approved";

                return (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    
                    {/* LEFT COLUMN (8 cols): Interactive Dashboard & CAD View */}
                    <div className="lg:col-span-8 space-y-6">
                      
                      {/* Interactive Survey Verification Info & CAD Map Overlay */}
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <div>
                            <span className="text-[9px] text-slate-400 font-extrabold uppercase">Field Verification Record</span>
                            <h4 className="text-xs font-black text-slate-800">
                              {selectedProject} — {selectedBuilding} — Floor {selectedFloor} ({selectedZone})
                            </h4>
                          </div>

                          <div className="text-right text-[10px] font-mono text-slate-500">
                            <div>Date: <strong className="text-slate-800">2026-07-09</strong></div>
                            <div>Lead Surveyor: <strong className="text-slate-800">Surv. Abel Tesfaye</strong></div>
                          </div>
                        </div>

                        {/* Recommendation Banner */}
                        <div className={`p-4 rounded-xl border flex items-start space-x-3 ${recColor}`}>
                          <div className="p-1 rounded bg-white shrink-0 shadow-xs text-sm">
                            {recommendation === "Ready for Panel Installation" ? "✅" : recommendation === "Review Required" ? "⚠️" : "❌"}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs font-black uppercase tracking-wider">
                                {isAmharic ? "የኢንጂነሪንግ ምክረ-ሃሳብ: " : "ENGINEERING RECOMMENDATION: "}
                              </span>
                              <span className="text-xs font-black font-mono underline">{recommendation}</span>
                            </div>
                            <p className="text-[11px] font-semibold mt-1 leading-normal">{recDesc}</p>
                          </div>
                        </div>

                        {/* Interactive CAD Blueprint Overlay (Mock SVG) */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-slate-400 font-extrabold uppercase flex items-center space-x-1">
                              <Layers size={11} className="text-indigo-500 animate-pulse" />
                              <span>Approved CAD Blueprint Overlay (DWG Link)</span>
                            </span>
                            <span className="text-[9px] font-mono text-slate-400">
                              Drawing Ref: {selectedFloor === 4 ? "DWG-BH-T4-A-REV3.dxf" : selectedFloor === 5 ? "DWG-BH-T5-B-REV2.dxf" : "DWG-AY-T2-F2-REV1.dxf"}
                            </span>
                          </div>

                          {/* SVG Drawing Canvas */}
                          <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 relative min-h-[280px] flex flex-col justify-between overflow-hidden">
                            
                            {/* CAD Coordinate Grids background */}
                            <div className="absolute inset-0 grid grid-cols-8 grid-rows-6 opacity-[0.05] pointer-events-none">
                              {Array.from({ length: 48 }).map((_, i) => (
                                <div key={i} className="border-b border-r border-slate-100"></div>
                              ))}
                            </div>

                            {/* SVG Blueprint */}
                            <svg viewBox="0 0 400 200" className="w-full h-full z-10">
                              {/* Grid lines in background */}
                              <line x1="30" y1="20" x2="370" y2="20" stroke="#1e293b" strokeWidth="1" strokeDasharray="3,3" />
                              <line x1="30" y1="100" x2="370" y2="100" stroke="#1e293b" strokeWidth="1" strokeDasharray="3,3" />
                              <line x1="30" y1="180" x2="370" y2="180" stroke="#1e293b" strokeWidth="1" strokeDasharray="3,3" />
                              
                              <line x1="50" y1="10" x2="50" y2="190" stroke="#1e293b" strokeWidth="1" strokeDasharray="3,3" />
                              <line x1="200" y1="10" x2="200" y2="190" stroke="#1e293b" strokeWidth="1" strokeDasharray="3,3" />
                              <line x1="350" y1="10" x2="350" y2="190" stroke="#1e293b" strokeWidth="1" strokeDasharray="3,3" />

                              {/* Structural design outline (cyan) */}
                              <rect x="60" y="40" width="280" height="120" fill="none" stroke="#06b6d4" strokeWidth="1.5" strokeOpacity="0.4" />
                              
                              {/* Columns, walls (cyan design) */}
                              {/* Column 1 (West) */}
                              <rect x="70" y="50" width="30" height="30" fill="none" stroke="#06b6d4" strokeWidth="1.5" strokeOpacity="0.8" />
                              {/* Column 2 (East) */}
                              <rect x="300" y="50" width="30" height="30" fill="none" stroke="#06b6d4" strokeWidth="1.5" strokeOpacity="0.8" />
                              {/* Elevator Core (Center) */}
                              <rect x="170" y="80" width="60" height="40" fill="none" stroke="#06b6d4" strokeWidth="1.5" strokeOpacity="0.8" />

                              {/* Actual measured points from Geodetic GPS/Total Station (green or red based on deviation) */}
                              {/* If Floor 5 (Elevator Shaft Zone), render offset deviations */}
                              {selectedFloor === 5 ? (
                                <>
                                  {/* Drifted wall panel west (red highlight) */}
                                  <line x1="60" y1="40" x2="60" y2="160" stroke="#ef4444" strokeWidth="2" className="animate-pulse" />
                                  <text x="65" y="150" fill="#ef4444" fontSize="8" fontFamily="monospace" fontWeight="bold">Wall drift +6.8mm</text>
                                  <circle cx="60" cy="90" r="4" fill="#ef4444" className="animate-ping" />
                                  <circle cx="60" cy="90" r="3.5" fill="#ef4444" />

                                  {/* Drifted Elevator Core (red highlight) */}
                                  <rect x="175" y="83" width="62" height="42" fill="none" stroke="#ef4444" strokeWidth="2" className="animate-pulse" />
                                  <text x="178" y="115" fill="#ef4444" fontSize="8" fontFamily="monospace" fontWeight="bold">Core drift +8.6mm</text>
                                  <circle cx="200" cy="100" r="4" fill="#ef4444" className="animate-ping" />
                                  <circle cx="200" cy="100" r="3.5" fill="#ef4444" />

                                  {/* Other elements within tolerance (green) */}
                                  <rect x="301" y="51" width="29" height="29" fill="none" stroke="#10b981" strokeWidth="1" />
                                  <circle cx="315" cy="65" r="3.5" fill="#10b981" />
                                </>
                              ) : (
                                <>
                                  {/* Floor 4 / Floor 2: Everything aligned beautifully within tolerance (green points) */}
                                  <circle cx="85" cy="65" r="3.5" fill="#10b981" />
                                  <circle cx="315" cy="65" r="3.5" fill="#10b981" />
                                  <circle cx="200" cy="100" r="3.5" fill="#10b981" />
                                  
                                  <rect x="71" y="51" width="28" height="28" fill="none" stroke="#10b981" strokeWidth="1" />
                                  <rect x="301" y="51" width="28" height="28" fill="none" stroke="#10b981" strokeWidth="1" />
                                  <rect x="171" y="81" width="58" height="38" fill="none" stroke="#10b981" strokeWidth="1" />
                                  
                                  <text x="75" y="45" fill="#10b981" fontSize="7" fontFamily="monospace">Col-W1 (Passed)</text>
                                  <text x="290" y="45" fill="#10b981" fontSize="7" fontFamily="monospace">Col-E2 (Passed)</text>
                                  <text x="175" y="130" fill="#10b981" fontSize="7" fontFamily="monospace">Elevator Core (Passed)</text>
                                </>
                              )}
                            </svg>

                            <div className="flex justify-between items-center text-[9px] font-mono text-slate-500 pt-2 border-t border-slate-900">
                              <div className="flex items-center space-x-2">
                                <span className="flex items-center space-x-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                                  <span>CAD Blueprint</span>
                                </span>
                                <span className="flex items-center space-x-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                  <span>Measured (Passed)</span>
                                </span>
                                <span className="flex items-center space-x-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                  <span>Exceeded Tolerance</span>
                                </span>
                              </div>
                              <span>Interactive CAD Zoom: 1.0x</span>
                            </div>
                          </div>
                        </div>

                      </div>

                      {/* Detailed Alignment Review Matrix Checklist */}
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <div>
                            <span className="text-[10px] text-slate-400 font-extrabold uppercase">Tolerance Check Table</span>
                            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                              📏 {isAmharic ? "ዝርዝር የአሰላለፍ እና የመዛባት ፍተሻ ማጠቃለያ" : "Comprehensive Alignment Review Matrix"}
                            </h3>
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => {
                              // Reset the current checklist to all passed
                              setZoneAlignmentChecks(prev => ({
                                ...prev,
                                [currentKey]: Object.fromEntries(
                                  Object.entries(currentChecklist).map(([k, item]) => [
                                    k,
                                    { ...item, status: "PASSED", deviation: Math.floor(Math.random() * 20 + 10) / 10 }
                                  ])
                                )
                              }));
                              
                              if (onLogAction) {
                                onLogAction("Reset Alignment Tolerance Checks", `Recalibrated all geodetic offsets to Passed for zone: ${selectedZone}`);
                              }
                            }}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-black uppercase px-2.5 py-1 rounded-lg transition-all"
                          >
                            {isAmharic ? "ሁሉም ይለፍ (Force All Pass)" : "Recalibrate Alignment to Pass"}
                          </button>
                        </div>

                        {/* Interactive Alignment Review Checklist */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {[
                            { key: "gridLine", label: "Grid Line Alignment", desc: "Permanent grid axes intersection" },
                            { key: "axisLine", label: "Axis Line Alignment", desc: "Layout line string alignment" },
                            { key: "controlPoints", label: "Geodetic Control Points", desc: "Coordinates benchmark verification" },
                            { key: "columnLayout", label: "Column Layout Placements", desc: "Column foundation layout" },
                            { key: "wallLayout", label: "Wall Layout Verticality", desc: "Shear wall forms plumbness" },
                            { key: "beamLayout", label: "Beam Location Offsets", desc: "Slab girders and beam joints" },
                            { key: "slabLevel", label: "Slab Level Elevation", desc: "Floor deck casting height" },
                            { key: "verticalAlignment", label: "Vertical Alignment (Plumb)", desc: "Aluminum vertical columns" },
                            { key: "horizontalAlignment", label: "Horizontal Alignment (Level)", desc: "Deck supports horizontal alignment" },
                            { key: "openingLocations", label: "Opening Locations (Windows)", desc: "Structural voids and ducts dimensions" },
                            { key: "elevatorCore", label: "Elevator Core Layout", desc: "Elevator lift shaft alignment" },
                            { key: "stairCore", label: "Stair Core Placements", desc: "Staircase load-bearing blocks" }
                          ].map((item) => {
                            const val = currentChecklist[item.key as keyof typeof currentChecklist] || { status: "PASSED", deviation: 1.5 };
                            const isExceeded = val.status === "EXCEEDED";
                            
                            return (
                              <div
                                key={item.key}
                                onClick={() => {
                                  // Toggle status between PASSED and EXCEEDED
                                  const newStatus = val.status === "PASSED" ? "EXCEEDED" : "PASSED";
                                  const newDev = newStatus === "EXCEEDED" ? 6.4 : 1.8;
                                  
                                  setZoneAlignmentChecks(prev => ({
                                    ...prev,
                                    [currentKey]: {
                                      ...currentChecklist,
                                      [item.key]: { status: newStatus, deviation: newDev }
                                    }
                                  }));
                                }}
                                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                                  isExceeded 
                                    ? "bg-red-500/5 border-red-300 hover:bg-red-500/10 text-red-950" 
                                    : "bg-slate-50 border-slate-150 hover:bg-slate-100"
                                }`}
                              >
                                <div className="space-y-0.5">
                                  <div className="flex items-center space-x-2">
                                    <span className={`w-2 h-2 rounded-full ${isExceeded ? "bg-red-600 animate-ping" : "bg-emerald-500"}`}></span>
                                    <h4 className="text-xs font-bold">{item.label}</h4>
                                  </div>
                                  <p className="text-[10px] text-slate-400">{item.desc}</p>
                                </div>

                                <div className="text-right">
                                  <span className={`text-xs font-mono font-black ${isExceeded ? "text-red-600" : "text-emerald-600"}`}>
                                    {val.deviation > 0 ? "+" : ""}{val.deviation}mm
                                  </span>
                                  <span className="text-[8px] font-black uppercase tracking-wider block opacity-70">
                                    {isExceeded ? "⚠️ EXCEEDED" : "✅ PASSED"}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                    </div>

                    {/* RIGHT COLUMN (4 cols): Live Approval workflow & Quality Log */}
                    <div className="lg:col-span-4 space-y-6">
                      
                      {/* Interactive Simulator Controller */}
                      <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 space-y-4 shadow-lg">
                        
                        <div className="border-b border-slate-800 pb-2">
                          <span className="text-[10px] text-red-500 font-extrabold uppercase block">Role Simulation Console</span>
                          <h4 className="text-xs font-black">Authorized Workflow Signoff</h4>
                        </div>

                        <p className="text-[11px] text-slate-400 leading-normal">
                          Only Team Leaders, Supervisors, and Site Engineers can sign off. Select simulated user to sign or reject this zone:
                        </p>

                        {/* Dropdown for role switcher */}
                        <div className="space-y-2">
                          <label className="text-[9px] text-slate-400 font-extrabold uppercase block">Select Simulated User</label>
                          <div className="grid grid-cols-1 gap-2">
                            {[
                              { role: "Team Leader", name: "Chala Kebede (Team Leader)" },
                              { role: "Supervisor", name: "Almaz Tekle (Supervisor)" },
                              { role: "Site Engineer", name: "Eng. Melaku Zewdu (Site Eng.)" }
                            ].map((user) => (
                              <button
                                key={user.role}
                                type="button"
                                onClick={() => setActiveReviewerRole(user.role as any)}
                                className={`p-2 rounded-lg text-left text-xs font-bold border transition-all ${
                                  activeReviewerRole === user.role
                                    ? "bg-red-600 text-white border-red-600 shadow"
                                    : "bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-850"
                                }`}
                              >
                                👤 {user.name}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Interactive Signoff Controls */}
                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                          <span className="text-[9px] text-red-500 font-extrabold uppercase block">
                            Active Action for {activeReviewerRole}
                          </span>

                          <textarea
                            value={panelApprovalComment}
                            onChange={(e) => setPanelApprovalComment(e.target.value)}
                            placeholder={`Enter review comments as ${activeReviewerRole}...`}
                            className="w-full h-16 bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-red-500"
                          />

                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <button
                              type="button"
                              onClick={() => {
                                const commentText = panelApprovalComment || `Approved by ${activeReviewerRole}. All alignments checked.`;
                                const key = activeReviewerRole === "Team Leader" ? "teamLeader" : activeReviewerRole === "Supervisor" ? "supervisor" : "siteEngineer";
                                const userLabel = activeReviewerRole === "Team Leader" ? "TL. Chala Kebede" : activeReviewerRole === "Supervisor" ? "Sup. Almaz Tekle" : "Eng. Melaku Zewdu";
                                const timestampStr = "2026-07-09 " + new Date().toTimeString().split(" ")[0].substring(0, 5);

                                setZoneApprovals(prev => ({
                                  ...prev,
                                  [currentKey]: {
                                    ...currentApproval,
                                    [key]: { status: "Approved", comment: commentText, user: userLabel, time: timestampStr }
                                  }
                                }));

                                // Write to audit trail
                                const newAuditId = "AUD-SURV-" + Math.floor(Math.random() * 1000 + 200);
                                setQualityAuditTrail(prev => [
                                  {
                                    id: newAuditId,
                                    timestamp: timestampStr,
                                    project: selectedProject,
                                    building: selectedBuilding,
                                    floor: selectedFloor,
                                    zone: selectedZone,
                                    surveyStatus: "Completed & Verified",
                                    cadComparison: exceededCount > 0 ? "Exceeded (Buffer Approved)" : "Passed",
                                    action: `Approved for Panel Installation`,
                                    user: `${userLabel} (${activeReviewerRole})`,
                                    comments: commentText
                                  },
                                  ...prev
                                ]);

                                setPanelApprovalComment("");
                                alert(`${activeReviewerRole} Signoff granted! Central OVID Sync Complete.`);
                                if (onLogAction) {
                                  onLogAction("Survey Verification Approved", `${activeReviewerRole} authorized Panel Installation for ${selectedZone}`);
                                }
                              }}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase py-2 rounded-lg text-center cursor-pointer"
                            >
                              👍 Approve Sign
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                const commentText = panelApprovalComment || `Correction requested by ${activeReviewerRole}. Alignments exceed allowable limits.`;
                                const key = activeReviewerRole === "Team Leader" ? "teamLeader" : activeReviewerRole === "Supervisor" ? "supervisor" : "siteEngineer";
                                const userLabel = activeReviewerRole === "Team Leader" ? "TL. Chala Kebede" : activeReviewerRole === "Supervisor" ? "Sup. Almaz Tekle" : "Eng. Melaku Zewdu";
                                const timestampStr = "2026-07-09 " + new Date().toTimeString().split(" ")[0].substring(0, 5);

                                setZoneApprovals(prev => ({
                                  ...prev,
                                  [currentKey]: {
                                    ...currentApproval,
                                    [key]: { status: "Rejected", comment: commentText, user: userLabel, time: timestampStr }
                                  }
                                }));

                                // Write to audit trail
                                const newAuditId = "AUD-SURV-" + Math.floor(Math.random() * 1000 + 200);
                                setQualityAuditTrail(prev => [
                                  {
                                    id: newAuditId,
                                    timestamp: timestampStr,
                                    project: selectedProject,
                                    building: selectedBuilding,
                                    floor: selectedFloor,
                                    zone: selectedZone,
                                    surveyStatus: "Revision Requested",
                                    cadComparison: "Failed",
                                    action: "Requested Correction & Realignment",
                                    user: `${userLabel} (${activeReviewerRole})`,
                                    comments: commentText
                                  },
                                  ...prev
                                ]);

                                setPanelApprovalComment("");
                                alert(`${activeReviewerRole} has requested alignment corrections.`);
                                if (onLogAction) {
                                  onLogAction("Survey Verification Rejected", `${activeReviewerRole} requested core alignment corrections for ${selectedZone}`);
                                }
                              }}
                              className="bg-red-600 hover:bg-red-700 text-white font-black uppercase py-2 rounded-lg text-center cursor-pointer"
                            >
                              ❌ Reject/Correction
                            </button>
                          </div>
                        </div>

                      </div>

                      {/* Timeline Workflow Visualizer */}
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                        <span className="text-[10px] text-slate-400 font-extrabold uppercase block">3-Tier Approval Status</span>
                        
                        <div className="space-y-4 relative pl-4 before:content-[''] before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                          
                          {/* Step 1: Team Leader */}
                          <div className="relative space-y-1">
                            <span className={`absolute -left-4 w-3.5 h-3.5 rounded-full border border-white top-1 ${
                              currentApproval.teamLeader.status === "Approved" ? "bg-emerald-500" :
                              currentApproval.teamLeader.status === "Rejected" ? "bg-red-500" : "bg-amber-400"
                            }`}></span>
                            <div className="flex justify-between text-xs font-bold">
                              <span>1. Team Leader (Work Readiness)</span>
                              <span className={`text-[9px] font-black uppercase ${
                                currentApproval.teamLeader.status === "Approved" ? "text-emerald-600" :
                                currentApproval.teamLeader.status === "Rejected" ? "text-red-600" : "text-amber-600"
                              }`}>{currentApproval.teamLeader.status}</span>
                            </div>
                            {currentApproval.teamLeader.user && (
                              <p className="text-[10px] text-slate-500 font-medium">
                                Signed by {currentApproval.teamLeader.user} at {currentApproval.teamLeader.time}
                              </p>
                            )}
                            {currentApproval.teamLeader.comment && (
                              <p className="text-[10px] bg-slate-50 p-2 rounded-lg text-slate-600 italic">
                                "{currentApproval.teamLeader.comment}"
                              </p>
                            )}
                          </div>

                          {/* Step 2: Supervisor */}
                          <div className="relative space-y-1">
                            <span className={`absolute -left-4 w-3.5 h-3.5 rounded-full border border-white top-1 ${
                              currentApproval.supervisor.status === "Approved" ? "bg-emerald-500" :
                              currentApproval.supervisor.status === "Rejected" ? "bg-red-500" : "bg-amber-400"
                            }`}></span>
                            <div className="flex justify-between text-xs font-bold">
                              <span>2. Supervisor (Field Conditions)</span>
                              <span className={`text-[9px] font-black uppercase ${
                                currentApproval.supervisor.status === "Approved" ? "text-emerald-600" :
                                currentApproval.supervisor.status === "Rejected" ? "text-red-600" : "text-amber-600"
                              }`}>{currentApproval.supervisor.status}</span>
                            </div>
                            {currentApproval.supervisor.user && (
                              <p className="text-[10px] text-slate-500 font-medium">
                                Signed by {currentApproval.supervisor.user} at {currentApproval.supervisor.time}
                              </p>
                            )}
                            {currentApproval.supervisor.comment && (
                              <p className="text-[10px] bg-slate-50 p-2 rounded-lg text-slate-600 italic">
                                "{currentApproval.supervisor.comment}"
                              </p>
                            )}
                          </div>

                          {/* Step 3: Site Engineer */}
                          <div className="relative space-y-1">
                            <span className={`absolute -left-4 w-3.5 h-3.5 rounded-full border border-white top-1 ${
                              currentApproval.siteEngineer.status === "Approved" ? "bg-emerald-500" :
                              currentApproval.siteEngineer.status === "Rejected" ? "bg-red-500" : "bg-amber-400"
                            }`}></span>
                            <div className="flex justify-between text-xs font-bold">
                              <span>3. Site Engineer (Final Release)</span>
                              <span className={`text-[9px] font-black uppercase ${
                                currentApproval.siteEngineer.status === "Approved" ? "text-emerald-600" :
                                currentApproval.siteEngineer.status === "Rejected" ? "text-red-600" : "text-amber-600"
                              }`}>{currentApproval.siteEngineer.status}</span>
                            </div>
                            {currentApproval.siteEngineer.user && (
                              <p className="text-[10px] text-slate-500 font-medium">
                                Signed by {currentApproval.siteEngineer.user} at {currentApproval.siteEngineer.time}
                              </p>
                            )}
                            {currentApproval.siteEngineer.comment && (
                              <p className="text-[10px] bg-slate-50 p-2 rounded-lg text-slate-600 italic">
                                "{currentApproval.siteEngineer.comment}"
                              </p>
                            )}
                          </div>

                        </div>

                        {/* Approved Zone Status Badge */}
                        <div className={`p-4 rounded-xl text-center border font-mono ${
                          isAllApproved 
                            ? "bg-emerald-500 text-white border-emerald-400 animate-pulse shadow-md"
                            : "bg-slate-50 text-slate-400 border-slate-200"
                        }`}>
                          <span className="text-[10px] uppercase font-black tracking-widest block">Core Zone Status</span>
                          <strong className="text-sm font-black uppercase block tracking-wider">
                            {isAllApproved ? "🎉 Approved for Panel Installation" : "⏳ Sign-off Chain Incomplete"}
                          </strong>
                        </div>
                      </div>

                    </div>

                    {/* QUALITY RECORDS & HISTORICAL AUDIT TRAIL TABLE (Full Width) */}
                    <div className="lg:col-span-12 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <div>
                          <span className="text-[10px] text-slate-400 font-extrabold uppercase">Durable Quality Logs</span>
                          <h4 className="text-xs font-black text-slate-800">
                            🛡️ {isAmharic ? "የሳይት ጥራት መዛግብት እና የኦዲት መዝገብ" : "Durable Quality Inspection Archives & Audit Trail"}
                          </h4>
                        </div>
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-3 py-1 rounded font-mono font-bold">
                          {qualityAuditTrail.length} Records Persisted
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[9px]">
                              <th className="p-3">Audit ID</th>
                              <th className="p-3">Timestamp</th>
                              <th className="p-3">Location Block</th>
                              <th className="p-3">Survey Status</th>
                              <th className="p-3">CAD Verdict</th>
                              <th className="p-3">Workflow Action</th>
                              <th className="p-3">Signee User</th>
                              <th className="p-3">Reviewer Comments</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium">
                            {qualityAuditTrail.map((record) => (
                              <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="p-3 font-mono font-bold text-red-600 text-[10px]">{record.id}</td>
                                <td className="p-3 text-slate-500 text-[10px] font-mono whitespace-nowrap">{record.timestamp}</td>
                                <td className="p-3 whitespace-nowrap">
                                  {record.building} (Fl {record.floor} - {record.zone.split(" ")[0]})
                                </td>
                                <td className="p-3">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                    record.surveyStatus.includes("Verified") || record.surveyStatus.includes("Completed") ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                                  }`}>
                                    {record.surveyStatus}
                                  </span>
                                </td>
                                <td className="p-3 text-[10px] font-mono">{record.cadComparison}</td>
                                <td className="p-3 font-semibold">{record.action}</td>
                                <td className="p-3 font-bold text-slate-700 whitespace-nowrap">{record.user}</td>
                                <td className="p-3 text-slate-500 text-[11px] leading-relaxed italic max-w-xs truncate" title={record.comments}>
                                  "{record.comments}"
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                  </div>
                );
              })()}

            </div>
          )}

        </motion.div>
      </AnimatePresence>

    </div>
  );
};
