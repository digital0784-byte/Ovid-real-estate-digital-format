import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Building2, 
  Layers, 
  MapPin, 
  FileText, 
  Upload, 
  Trash2, 
  Edit, 
  Plus, 
  Compass, 
  Search, 
  Sliders, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Activity, 
  User, 
  Calendar, 
  Download, 
  Share2, 
  FileSpreadsheet, 
  ArrowRight, 
  ShieldCheck, 
  Globe, 
  Navigation, 
  ChevronRight, 
  Eye, 
  Database,
  RefreshCw,
  FolderOpen,
  CheckCircle2,
  Lock,
  PlusCircle,
  FileCode,
  FileDown
} from "lucide-react";
import { Worker, Team, AttendanceRecord, UserRole } from "../types";

// Types matching specification
export interface Project {
  id: string; // e.g. Digital Construction ERP-PROJ-001
  name: string;
  client: string;
  contractor: string;
  projectManager: string;
  supervisor: string;
  teamLeaders: string[];
  gangChiefs: string[];
  timeKeepers: string[];
  address: string;
  city: string;
  region: string;
  country: string;
  lat: number;
  lng: number;
  geofenceRadius: number; // in meters
  startDate: string;
  plannedCompletionDate: string;
  status: "Planning" | "In Progress" | "Completed" | "Delayed";
  description: string;
  zonesPerFloor?: number;
}

export interface Building {
  id: string;
  projectId: string;
  name: string;
  buildingNumber: string;
  floorsCount: number;
  basementLevels: number;
  roofLevel: number;
  totalArea: number; // m²
}

export interface Floor {
  id: string;
  buildingId: string;
  name: string;
  floorNumber: number;
  elevation: number; // in meters
  totalArea: number; // m²
}

export interface Zone {
  id: string;
  floorId: string;
  name: string;
  area: number; // m²
  workSequence: number;
  assignedTeamLeader: string;
  assignedGangChief: string;
  assignedSupervisor: string;
}

export interface CadDrawing {
  id: string;
  projectId: string;
  buildingId: string;
  floorId: string;
  zoneId: string;
  name: string;
  type: "DWG" | "PDF" | "IFC" | "Structural" | "Architectural" | "Aluminum Formwork Layout" | "Shop Drawing";
  revisionNumber: number;
  uploadDate: string;
  uploadedBy: string;
  status: "Pending Approval" | "Approved" | "Archived";
  fileSize: string;
}

export interface ProjectDocument {
  id: string;
  projectId: string;
  name: string;
  type: "Method Statement" | "Inspection Checklist" | "Safety Document" | "Material List" | "Panel List" | "Equipment List" | "Daily Report" | "Weekly Report" | "Monthly Report" | "Concrete Pour Schedule" | "Quality Inspection Report";
  fileExtension: "PDF" | "XLSX" | "DOCX" | "PNG" | "ZIP";
  uploadDate: string;
  uploadedBy: string;
  fileSize: string;
}

interface ProjectDocumentManagerProps {
  workers: Worker[];
  teams: Team[];
  attendance: AttendanceRecord[];
  isAmharic: boolean;
  currentUserRole: UserRole;
  onLogAction?: (action: string, details: string) => void;
}

export const ProjectDocumentManager: React.FC<ProjectDocumentManagerProps> = ({
  workers,
  teams,
  attendance,
  isAmharic,
  currentUserRole,
  onLogAction
}) => {
  // --- SUB TAB CONTROL ---
  const [activeSubTab, setActiveSubTab] = useState<"dashboard" | "registration" | "hierarchy" | "cads" | "documents">("dashboard");

  // --- SAMPLE SEED DATA ---
  const [projects, setProjects] = useState<Project[]>([
    {
      id: "Digital Construction ERP-PRJ-101",
      name: "Digital Bole Heights",
      client: "Federal Housing Corporation",
      contractor: "Digital Construction ERP",
      projectManager: "Eng. Yoseph Hailu",
      supervisor: "Kassa Hunegn",
      teamLeaders: ["Yohannes Bekele", "Hiwot Girma"],
      gangChiefs: ["Fikru Tolossa", "Chala Kebede"],
      timeKeepers: ["Abebe Girma"],
      address: "Bole District, Axis-4",
      city: "Addis Ababa",
      region: "Addis Ababa City Administration",
      country: "Ethiopia",
      lat: 9.0118,
      lng: 38.7954,
      geofenceRadius: 150,
      startDate: "2025-02-15",
      plannedCompletionDate: "2026-12-30",
      status: "In Progress",
      description: "Premium high-rise residential complex utilizing pre-engineered aluminum formwork cast in-situ technology. Aiming for 6-day cycle times per floor level.",
      zonesPerFloor: 3
    },
    {
      id: "Digital Construction ERP-PRJ-102",
      name: "Digital Construction ERP Ayat East Block",
      client: "Digital Construction ERP System",
      contractor: "Digital Construction ERP",
      projectManager: "Eng. Samuel Alene",
      supervisor: "Martha Hagos",
      teamLeaders: ["Bekele Tesfaye"],
      gangChiefs: ["Yosef Assefa"],
      timeKeepers: ["Tsion Demeke"],
      address: "Ayat Zone 3",
      city: "Addis Ababa",
      region: "Addis Ababa City Administration",
      country: "Ethiopia",
      lat: 9.0254,
      lng: 38.8612,
      geofenceRadius: 100,
      startDate: "2025-06-01",
      plannedCompletionDate: "2027-04-15",
      status: "In Progress",
      description: "Mass housing initiative targeting modern residential blocks. Rapid concrete casing utilizing composite aluminum shoring plates.",
      zonesPerFloor: 4
    },
    {
      id: "Digital Construction ERP-PRJ-103",
      name: "Lideta Smart Apartments",
      client: "Ministry of Urban Development",
      contractor: "Digital Construction ERP",
      projectManager: "Eng. Daniel Girma",
      supervisor: "Solomon Kassa",
      teamLeaders: ["Abeba Kebede"],
      gangChiefs: ["Tadesse Melaku"],
      timeKeepers: ["Ruth Hailu"],
      address: "Lideta Core Axis",
      city: "Addis Ababa",
      region: "Addis Ababa City Administration",
      country: "Ethiopia",
      lat: 9.0042,
      lng: 38.7412,
      geofenceRadius: 80,
      startDate: "2026-01-10",
      plannedCompletionDate: "2027-08-01",
      status: "Planning",
      description: "Urban renewal Smart Block. Formwork panels configured for interlocking shear walls and stairwell core configurations.",
      zonesPerFloor: 3
    }
  ]);

  const [buildings, setBuildings] = useState<Building[]>([
    { id: "BLD-101-A", projectId: "Digital Construction ERP-PRJ-101", name: "Tower Block A", buildingNumber: "B1", floorsCount: 15, basementLevels: 2, roofLevel: 16, totalArea: 18500 },
    { id: "BLD-101-B", projectId: "Digital Construction ERP-PRJ-101", name: "Tower Block B", buildingNumber: "B2", floorsCount: 12, basementLevels: 1, roofLevel: 13, totalArea: 14200 },
    { id: "BLD-102-A", projectId: "Digital Construction ERP-PRJ-102", name: "Ayat Tower 1", buildingNumber: "T1", floorsCount: 10, basementLevels: 1, roofLevel: 11, totalArea: 11000 }
  ]);

  const [floors, setFloors] = useState<Floor[]>([
    { id: "FLR-101-A-4", buildingId: "BLD-101-A", name: "4th Floor Flat Slab", floorNumber: 4, elevation: 12.8, totalArea: 1200 },
    { id: "FLR-101-A-3", buildingId: "BLD-101-A", name: "3rd Floor Flat Slab", floorNumber: 3, elevation: 9.6, totalArea: 1200 },
    { id: "FLR-101-B-2", buildingId: "BLD-101-B", name: "2nd Floor Main Deck", floorNumber: 2, elevation: 6.4, totalArea: 1150 }
  ]);

  const [zones, setZones] = useState<Zone[]>([
    { id: "ZN-101-A-4-A", floorId: "FLR-101-A-4", name: "Zone A - West Wing", area: 400, workSequence: 1, assignedTeamLeader: "Yohannes Bekele", assignedGangChief: "Fikru Tolossa", assignedSupervisor: "Kassa Hunegn" },
    { id: "ZN-101-A-4-B", floorId: "FLR-101-A-4", name: "Zone B - Core Shaft", area: 350, workSequence: 2, assignedTeamLeader: "Hiwot Girma", assignedGangChief: "Chala Kebede", assignedSupervisor: "Kassa Hunegn" },
    { id: "ZN-101-A-4-C", floorId: "FLR-101-A-4", name: "Zone C - Outer Deck", area: 450, workSequence: 3, assignedTeamLeader: "Yohannes Bekele", assignedGangChief: "Fikru Tolossa", assignedSupervisor: "Kassa Hunegn" }
  ]);

  const [drawings, setDrawings] = useState<CadDrawing[]>([
    { id: "CAD-201", projectId: "Digital Construction ERP-PRJ-101", buildingId: "BLD-101-A", floorId: "FLR-101-A-4", zoneId: "ZN-101-A-4-A", name: "Digital Construction ERP_BH_FL04_ZONE_A_REV3.dwg", type: "DWG", revisionNumber: 3, uploadDate: "2026-06-28", uploadedBy: "Senior Eng. Daniel Girma", status: "Approved", fileSize: "18.4 MB" },
    { id: "CAD-202", projectId: "Digital Construction ERP-PRJ-101", buildingId: "BLD-101-A", floorId: "FLR-101-A-4", zoneId: "ZN-101-A-4-B", name: "Digital Construction ERP_BH_FL04_ZONE_B_REV2.pdf", type: "PDF", revisionNumber: 2, uploadDate: "2026-06-25", uploadedBy: "Eng. Hana Tekle", status: "Approved", fileSize: "4.2 MB" },
    { id: "CAD-203", projectId: "Digital Construction ERP-PRJ-101", buildingId: "BLD-101-A", floorId: "FLR-101-A-4", zoneId: "ZN-101-A-4-A", name: "Digital Construction ERP_BH_FL04_ZONE_A_AL_FORMWORK.dwg", type: "Aluminum Formwork Layout", revisionNumber: 1, uploadDate: "2026-06-12", uploadedBy: "Eng. Daniel Girma", status: "Archived", fileSize: "12.1 MB" },
    { id: "CAD-204", projectId: "Digital Construction ERP-PRJ-102", buildingId: "BLD-102-A", floorId: "FLR-101-B-2", zoneId: "", name: "Digital Construction ERP_AY_FL02_BLOCK_1_REV1.ifc", type: "IFC", revisionNumber: 1, uploadDate: "2026-07-02", uploadedBy: "Samuel Alene", status: "Pending Approval", fileSize: "42.8 MB" }
  ]);

  const [projectDocs, setProjectDocs] = useState<ProjectDocument[]>([
    { id: "DOC-501", projectId: "Digital Construction ERP-PRJ-101", name: "MethodStatement_AluminumFormwork_PourSOP.pdf", type: "Method Statement", fileExtension: "PDF", uploadDate: "2026-06-15", uploadedBy: "Eng. Yoseph Hailu", fileSize: "2.1 MB" },
    { id: "DOC-502", projectId: "Digital Construction ERP-PRJ-101", name: "QualityChecklist_PreConcretePour_Audit.xlsx", type: "Inspection Checklist", fileExtension: "XLSX", uploadDate: "2026-07-01", uploadedBy: "Supervisor Kassa Hunegn", fileSize: "340 KB" },
    { id: "DOC-503", projectId: "Digital Construction ERP-PRJ-101", name: "HSE_SafetyRisk_ScaffoldingFall_Plan.pdf", type: "Safety Document", fileExtension: "PDF", uploadDate: "2026-06-20", uploadedBy: "Fikru Tolossa", fileSize: "1.2 MB" },
    { id: "DOC-504", projectId: "Digital Construction ERP-PRJ-101", name: "BillOfMaterials_CornerBrackets_Pins.xlsx", type: "Material List", fileExtension: "XLSX", uploadDate: "2026-07-04", uploadedBy: "Eng. Yoseph Hailu", fileSize: "890 KB" },
    { id: "DOC-505", projectId: "Digital Construction ERP-PRJ-102", name: "AyatBlockT1_DailyReport_July07.pdf", type: "Daily Report", fileExtension: "PDF", uploadDate: "2026-07-07", uploadedBy: "Martha Hagos", fileSize: "1.4 MB" }
  ]);

  // --- RECONCILING SYNC STATE ---
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<string>("Synced with Digital Construction ERP Cloud Server");

  const triggerRealTimeSync = (action: string) => {
    setIsSyncing(true);
    setSyncStatus("Pushing update to Head Office and all Site apps in real-time...");
    setTimeout(() => {
      setIsSyncing(false);
      setSyncStatus("Synced successfully across all endpoints");
    }, 1200);
  };

  // --- ACTIVE SELECTIONS FOR UI ---
  const [selectedProjectId, setSelectedProjectId] = useState<string>("Digital Construction ERP-PRJ-101");
  const selectedProject = useMemo(() => {
    return projects.find(p => p.id === selectedProjectId) || projects[0];
  }, [projects, selectedProjectId]);

  const [mapInteractiveLat, setMapInteractiveLat] = useState<number>(selectedProject?.lat || 9.0118);
  const [mapInteractiveLng, setMapInteractiveLng] = useState<number>(selectedProject?.lng || 38.7954);
  const [mapInteractiveRadius, setMapInteractiveRadius] = useState<number>(selectedProject?.geofenceRadius || 150);

  // Sync coords when active project changes
  React.useEffect(() => {
    if (selectedProject) {
      setMapInteractiveLat(selectedProject.lat);
      setMapInteractiveLng(selectedProject.lng);
      setMapInteractiveRadius(selectedProject.geofenceRadius);
    }
  }, [selectedProjectId]);

  // --- FORM STATES ---
  // 1. Project Form
  const [projName, setProjName] = useState<string>("");
  const [projClient, setProjClient] = useState<string>("");
  const [projContractor, setProjContractor] = useState<string>("Digital Construction ERP");
  const [projPM, setProjPM] = useState<string>("");
  const [projSupervisor, setProjSupervisor] = useState<string>("");
  const [projAddress, setProjAddress] = useState<string>("");
  const [projCity, setProjCity] = useState<string>("Addis Ababa");
  const [projRegion, setProjRegion] = useState<string>("Addis Ababa");
  const [projLat, setProjLat] = useState<number>(9.0118);
  const [projLng, setProjLng] = useState<number>(38.7954);
  const [projGeofence, setProjGeofence] = useState<number>(150);
  const [projStart, setProjStart] = useState<string>("");
  const [projEnd, setProjEnd] = useState<string>("");
  const [projDesc, setProjDesc] = useState<string>("");
  const [projZonesPerFloor, setProjZonesPerFloor] = useState<number>(3);

  // 2. Building Form
  const [selectedBldProj, setSelectedBldProj] = useState<string>("Digital Construction ERP-PRJ-101");
  const [bldName, setBldName] = useState<string>("");
  const [bldNumber, setBldNumber] = useState<string>("");
  const [bldFloors, setBldFloors] = useState<number>(10);
  const [bldBasements, setBldBasements] = useState<number>(1);
  const [bldRoof, setBldRoof] = useState<number>(11);
  const [bldArea, setBldArea] = useState<number>(12000);

  // 3. Floor Form
  const [selectedFloorBld, setSelectedFloorBld] = useState<string>("BLD-101-A");
  const currentFloorBldProjZones = useMemo(() => {
    const bld = buildings.find(b => b.id === selectedFloorBld);
    if (!bld) return 3;
    const proj = projects.find(p => p.id === bld.projectId);
    return proj?.zonesPerFloor || 3;
  }, [selectedFloorBld, buildings, projects]);
  const [flrName, setFlrName] = useState<string>("");
  const [flrNumber, setFlrNumber] = useState<number>(1);
  const [flrElevation, setFlrElevation] = useState<number>(3.2);
  const [flrArea, setFlrArea] = useState<number>(1200);

  // 4. Zone Form
  const [selectedZoneFlr, setSelectedZoneFlr] = useState<string>("FLR-101-A-4");
  const [znName, setZnName] = useState<string>("");
  const [znArea, setZnArea] = useState<number>(400);
  const [znSeq, setZnSeq] = useState<number>(1);
  const [znTL, setZnTL] = useState<string>("");
  const [znGC, setZnGC] = useState<string>("");
  const [znSupervisor, setZnSupervisor] = useState<string>("");

  // 5. CAD Form
  const [cadName, setCadName] = useState<string>("");
  const [cadType, setCadType] = useState<"DWG" | "PDF" | "IFC" | "Structural" | "Architectural" | "Aluminum Formwork Layout" | "Shop Drawing">("DWG");
  const [cadRev, setCadRev] = useState<number>(1);
  const [selectedCadBuilding, setSelectedCadBuilding] = useState<string>("BLD-101-A");
  const [selectedCadFloor, setSelectedCadFloor] = useState<string>("FLR-101-A-4");
  const [selectedCadZone, setSelectedCadZone] = useState<string>("ZN-101-A-4-A");

  // 6. Document Form
  const [docName, setDocName] = useState<string>("");
  const [docType, setDocType] = useState<"Method Statement" | "Inspection Checklist" | "Safety Document" | "Material List" | "Panel List" | "Equipment List" | "Daily Report" | "Weekly Report" | "Monthly Report" | "Concrete Pour Schedule" | "Quality Inspection Report">("Method Statement");
  const [docExt, setDocExt] = useState<"PDF" | "XLSX" | "DOCX" | "PNG" | "ZIP">("PDF");

  // --- SEARCH STATES ---
  const [projSearch, setProjSearch] = useState<string>("");
  const [docSearch, setDocSearch] = useState<string>("");
  const [cadSearch, setCadSearch] = useState<string>("");

  // --- REPORT MODAL STATE ---
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [activeReportType, setActiveReportType] = useState<string>("Project Site Portfolio");
  const [exportSuccess, setExportSuccess] = useState<boolean>(false);

  // --- NAVIGATION MAP SIMULATOR ---
  const [isNavigating, setIsNavigating] = useState<boolean>(false);
  const [navigationSteps, setNavigationSteps] = useState<string[]>([]);
  const [navProgress, setNavProgress] = useState<number>(0);

  // --- PERMISSIONS CHECKS ---
  const canRegisterAndEdit = currentUserRole === UserRole.HEAD_OFFICE;
  const canRegisterZone = currentUserRole === UserRole.HEAD_OFFICE ||
                          currentUserRole === UserRole.SUPER_ADMIN ||
                          currentUserRole === UserRole.SECTION_HEAD ||
                          currentUserRole === UserRole.TEAM_LEADER ||
                          currentUserRole === UserRole.SUPERVISOR ||
                          currentUserRole === UserRole.PROJECT_MANAGER;
  const canUploadDrawing = currentUserRole === UserRole.HEAD_OFFICE || currentUserRole === UserRole.SUPERVISOR;
  const canApproveDrawing = currentUserRole === UserRole.HEAD_OFFICE;
  const canUploadDoc = currentUserRole === UserRole.HEAD_OFFICE || currentUserRole === UserRole.SUPERVISOR || currentUserRole === UserRole.TEAM_LEADER;
  
  // --- REAL-TIME ROLE ACCESS FILTERING ---
  const filteredProjects = useMemo(() => {
    let list = projects;
    
    // Filter by search query
    if (projSearch.trim() !== "") {
      const q = projSearch.toLowerCase();
      list = list.filter(p => 
        p.name.toLowerCase().includes(q) || 
        p.id.toLowerCase().includes(q) || 
        p.client.toLowerCase().includes(q)
      );
    }

    // Role level filtering - Gang Chiefs and Team Leaders only see what they are assigned to
    if (currentUserRole === UserRole.GANG_CHIEF) {
      list = list.filter(p => p.gangChiefs.includes("Fikru Tolossa") || p.name === "Digital Bole Heights");
    } else if (currentUserRole === UserRole.TEAM_LEADER) {
      list = list.filter(p => p.teamLeaders.includes("Yohannes Bekele") || p.name === "Digital Bole Heights");
    } else if (currentUserRole === UserRole.TIME_KEEPER) {
      // Time keepers see all active sites for auditing
      list = list.filter(p => p.status === "In Progress");
    }

    return list;
  }, [projects, projSearch, currentUserRole]);

  // --- HANDLERS ---

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canRegisterAndEdit) return;

    const newId = `Digital Construction ERP-PRJ-${100 + projects.length + 1}`;
    const newProj: Project = {
      id: newId,
      name: projName || "Unnamed Project",
      client: projClient || "Internal Digital Construction ERP",
      contractor: projContractor,
      projectManager: projPM || "Unassigned",
      supervisor: projSupervisor || "Unassigned",
      teamLeaders: projPM ? ["Yohannes Bekele"] : [],
      gangChiefs: projSupervisor ? ["Fikru Tolossa"] : [],
      timeKeepers: ["Abebe Girma"],
      address: projAddress || "Addis Ababa Main Axis",
      city: projCity,
      region: projRegion,
      country: "Ethiopia",
      lat: Number(projLat),
      lng: Number(projLng),
      geofenceRadius: Number(projGeofence),
      startDate: projStart || new Date().toISOString().split("T")[0],
      plannedCompletionDate: projEnd || "2027-12-31",
      status: "Planning",
      description: projDesc || "Dynamic rapid housing project.",
      zonesPerFloor: Number(projZonesPerFloor)
    };

    setProjects(prev => [newProj, ...prev]);
    setSelectedProjectId(newId);

    // Reset Form fields
    setProjName("");
    setProjClient("");
    setProjPM("");
    setProjSupervisor("");
    setProjAddress("");
    setProjStart("");
    setProjEnd("");
    setProjDesc("");
    setProjZonesPerFloor(3);

    if (onLogAction) {
      onLogAction("Created Project Site", `Registered Digital Construction ERP Project ${newProj.name} (${newId}) with ${newProj.zonesPerFloor} zones per floor. GPS coordinate geofence: ${newProj.lat}, ${newProj.lng}`);
    }

    triggerRealTimeSync("CreateProject");
  };

  const handleCreateBuilding = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canRegisterAndEdit) return;

    const newBld: Building = {
      id: `BLD-${selectedBldProj.split("-").pop()}-${String.fromCharCode(65 + buildings.length)}`,
      projectId: selectedBldProj,
      name: bldName || "Block " + String.fromCharCode(65 + buildings.length),
      buildingNumber: bldNumber || "B" + (buildings.length + 1),
      floorsCount: Number(bldFloors),
      basementLevels: Number(bldBasements),
      roofLevel: Number(bldRoof),
      totalArea: Number(bldArea)
    };

    setBuildings(prev => [...prev, newBld]);
    setBldName("");
    setBldNumber("");

    if (onLogAction) {
      onLogAction("Registered Building", `Added Building ${newBld.name} to Project ${selectedBldProj}`);
    }
    triggerRealTimeSync("CreateBuilding");
  };

  const handleCreateFloor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canRegisterAndEdit) return;

    const newFlr: Floor = {
      id: `FLR-${selectedFloorBld.split("-").pop()}-${flrNumber}`,
      buildingId: selectedFloorBld,
      name: flrName || `${flrNumber}th Floor Flat Slab`,
      floorNumber: Number(flrNumber),
      elevation: Number(flrElevation),
      totalArea: Number(flrArea)
    };

    // Auto-generate floor zones based on the project's configured zones count
    const bld = buildings.find(b => b.id === selectedFloorBld);
    const proj = bld ? projects.find(p => p.id === bld.projectId) : undefined;
    const defaultZonesCount = proj?.zonesPerFloor || 3;

    const autoZones: Zone[] = [];
    for (let i = 0; i < defaultZonesCount; i++) {
      const zoneLetter = String.fromCharCode(65 + i); // 'A', 'B', 'C', ...
      autoZones.push({
        id: `ZN-${newFlr.id.replace("FLR-", "")}-${zoneLetter}`,
        floorId: newFlr.id,
        name: `Zone ${zoneLetter} - ${isAmharic ? "በራስ-ሰር የተፈጠረ" : "Auto-generated"}`,
        area: Math.round(newFlr.totalArea / defaultZonesCount),
        workSequence: i + 1,
        assignedTeamLeader: "Yohannes Bekele",
        assignedGangChief: "Fikru Tolossa",
        assignedSupervisor: proj?.supervisor || "Kassa Hunegn"
      });
    }

    setFloors(prev => [...prev, newFlr]);
    setZones(prev => [...prev, ...autoZones]);

    setFlrName("");
    setFlrNumber(flrNumber + 1);

    if (onLogAction) {
      onLogAction("Registered Floor Level", `Added Floor Level ${newFlr.name} to Building ${selectedFloorBld} and automatically mapped ${defaultZonesCount} floor zones.`);
    }
    triggerRealTimeSync("CreateFloor");
  };

  const handleCreateZone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canRegisterZone) return;

    const newZone: Zone = {
      id: `ZN-${selectedZoneFlr.split("-").pop()}-${String.fromCharCode(65 + zones.length)}`,
      floorId: selectedZoneFlr,
      name: znName || "Zone " + String.fromCharCode(65 + zones.length),
      area: Number(znArea),
      workSequence: Number(znSeq),
      assignedTeamLeader: znTL || "Yohannes Bekele",
      assignedGangChief: znGC || "Fikru Tolossa",
      assignedSupervisor: znSupervisor || "Kassa Hunegn"
    };

    setZones(prev => [...prev, newZone]);
    setZnName("");
    setZnSeq(znSeq + 1);

    if (onLogAction) {
      onLogAction("Registered Floor Zone", `Registered aluminum formwork cycle Zone ${newZone.name} on Floor ID ${selectedZoneFlr}`);
    }
    triggerRealTimeSync("CreateZone");
  };

  const handleUploadCad = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canUploadDrawing) return;

    const newCad: CadDrawing = {
      id: `CAD-${Date.now()}`,
      projectId: selectedProjectId,
      buildingId: selectedCadBuilding,
      floorId: selectedCadFloor,
      zoneId: selectedCadZone,
      name: cadName || `CAD_${selectedProjectId.replace(/\s+/g, "_")}_SHOP_REV${cadRev}.dwg`,
      type: cadType,
      revisionNumber: Number(cadRev),
      uploadDate: new Date().toISOString().split("T")[0],
      uploadedBy: currentUserRole === UserRole.HEAD_OFFICE ? "Senior Eng. Daniel Girma" : "Supervisor Martha Hagos",
      status: "Approved",
      fileSize: "14.5 MB"
    };

    setDrawings(prev => [newCad, ...prev]);
    setCadName("");

    if (onLogAction) {
      onLogAction("CAD Sheet Published", `Uploaded drawing template: ${newCad.name} under Project ID: ${newCad.projectId}`);
    }
    triggerRealTimeSync("UploadCad");
  };

  const handleUploadDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canUploadDoc) return;

    const newDoc: ProjectDocument = {
      id: `DOC-${Date.now()}`,
      projectId: selectedProjectId,
      name: docName || `MethodStatement_${selectedProjectId.replace(/\s+/g, "_")}_CycleLock.${docExt.toLowerCase()}`,
      type: docType,
      fileExtension: docExt,
      uploadDate: new Date().toISOString().split("T")[0],
      uploadedBy: currentUserRole === UserRole.HEAD_OFFICE ? "Eng. Yoseph Hailu" : "Supervisor Kassa Hunegn",
      fileSize: "1.8 MB"
    };

    setProjectDocs(prev => [newDoc, ...prev]);
    setDocName("");

    if (onLogAction) {
      onLogAction("Project Document Filed", `Filed Document: ${newDoc.name} under category ${newDoc.type}`);
    }
    triggerRealTimeSync("UploadDoc");
  };

  const handleApproveDrawing = (id: string) => {
    if (!canApproveDrawing) return;
    setDrawings(prev => prev.map(d => {
      if (d.id === id) {
        return { ...d, status: "Approved" };
      }
      return d;
    }));

    if (onLogAction) {
      onLogAction("Drawing Rev Approved", `Approved CAD drawing version sequence ID: ${id}`);
    }
    triggerRealTimeSync("ApproveDrawing");
  };

  const handleArchiveProject = (id: string) => {
    if (!canRegisterAndEdit) return;
    setProjects(prev => prev.map(p => {
      if (p.id === id) {
        return { ...p, status: "Completed" };
      }
      return p;
    }));

    if (onLogAction) {
      onLogAction("Project Archived", `Marked project ${id} as archived & completed.`);
    }
    triggerRealTimeSync("ArchiveProject");
  };

  // --- MAP ROUTING / NAVIGATION SIMULATOR ---
  const simulateNavigation = () => {
    setIsNavigating(true);
    setNavProgress(0);
    setNavigationSteps([
      "Acquiring satellite lock for Digital Construction ERP site coordinates...",
      "Routing from Digital Construction ERP Head Office (HQ, Addis Ababa) to " + selectedProject.name + "...",
      "Heading towards Bole Road / Ayat Roundabout depending on destination...",
      "Passing outer security gate & validating geofence coordinates...",
      "Success! Entered the configured " + selectedProject.geofenceRadius + "m Geofence area."
    ]);

    const interval = setInterval(() => {
      setNavProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => setIsNavigating(false), 2000);
          return 100;
        }
        return prev + 25;
      });
    }, 1000);
  };

  // --- REPORT GENERATOR ---
  const handleExportSubmit = () => {
    setExportSuccess(false);
    setTimeout(() => {
      setExportSuccess(true);
      setTimeout(() => {
        setIsReportModalOpen(false);
        setExportSuccess(false);
      }, 1500);
    }, 1200);
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER SYNCHRONIZATION TICKER */}
      <div className="bg-slate-950 border-b border-slate-800 text-white rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex items-center space-x-3.5 z-10">
          <div className="relative flex h-3 w-3">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isSyncing ? "bg-red-500" : "bg-emerald-400"}`}></span>
            <span className={`relative inline-flex rounded-full h-3 w-3 ${isSyncing ? "bg-red-600" : "bg-emerald-500"}`}></span>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <Database size={14} className="text-red-500" />
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-300">
                {isAmharic ? "Digital Construction ERP የደመና መረጃዎች ማመሳሰያ ሞዱል" : "Digital Construction ERP CLOUD SYNC MASTER"}
              </p>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              {isSyncing ? "Broadcasting live changes..." : syncStatus}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 z-10">
          <span className="text-[10px] bg-slate-900 border border-slate-800 px-3 py-1 rounded-full text-slate-300 font-bold uppercase tracking-wider">
            {isAmharic ? "የአሁኑ ሚና: " : "Role: "} <span className="text-red-500 font-sans">{currentUserRole.replace("_", " ")}</span>
          </span>
          <button 
            onClick={() => triggerRealTimeSync("manual")}
            disabled={isSyncing}
            className="p-1.5 bg-slate-900 hover:bg-slate-850 text-slate-300 rounded-lg border border-slate-800 hover:text-white transition-all cursor-pointer"
            title="Manual sync force"
          >
            <RefreshCw size={12} className={isSyncing ? "animate-spin text-red-500" : ""} />
          </button>
        </div>
      </div>

      {/* HORIZONTAL TAB SELECTOR */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap gap-1">
        {[
          { id: "dashboard", label: isAmharic ? "ዋና ማጠቃለያ (Dashboard)" : "Site Portfolio Dashboard", icon: Activity, color: "text-red-500" },
          { id: "registration", label: isAmharic ? "አዲስ ፕሮጀክት መመዝገቢያ" : "New Project Registration", icon: Compass, color: "text-blue-500" },
          { id: "hierarchy", label: isAmharic ? "ህንጻ እና ዞን ማውጫ" : "Hierarchy (Buildings & Zones)", icon: Building2, color: "text-amber-500" },
          { id: "cads", label: isAmharic ? "የCAD ስዕሎች ማከማቻ" : "CAD Drawing Vault", icon: FileCode, color: "text-indigo-500" },
          { id: "documents", label: isAmharic ? "የሰነዶች ቤተ-መጻሕፍት" : "Project Document Library", icon: FolderOpen, color: "text-emerald-500" }
        ].map((tab) => {
          const IconComponent = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === tab.id
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <IconComponent size={14} className={tab.color} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* CONTENT AREA BASED ON SELECTED TAB */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSubTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.15 }}
          className="space-y-6"
        >
          
          {/* ======================================= */}
          {/* TAB 1: SITE PORTFOLIO DASHBOARD */}
          {/* ======================================= */}
          {activeSubTab === "dashboard" && (
            <div className="space-y-6">
              
              {/* METRICS ROW */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-1">
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Total Projects</span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-black text-slate-800 font-mono">{projects.length}</span>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-black">Sites</span>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-1">
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Buildings Registered</span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-black text-slate-800 font-mono">{buildings.length}</span>
                    <span className="text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded font-black">Blocks</span>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-1">
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Total Floor Zones</span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-black text-slate-800 font-mono">{zones.length}</span>
                    <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-black">Active</span>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-1">
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">CAD Blueprints</span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-black text-slate-800 font-mono">{drawings.length}</span>
                    <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-black">Files</span>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs col-span-2 lg:col-span-1 space-y-1">
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Project Documents</span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-black text-slate-800 font-mono">{projectDocs.length}</span>
                    <span className="text-[10px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded font-black">Vaulted</span>
                  </div>
                </div>
              </div>

              {/* BENTO GRID: Active Project selector & Quick Map */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Active Projects List */}
                <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                      {isAmharic ? "ተግባራዊ የሪል እስቴት ፕሮጀክቶች" : "Active Digital Construction ERP System Sites"}
                    </h3>
                    <span className="text-[10px] text-slate-400">Select to display coordinates</span>
                  </div>

                  <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                    {filteredProjects.map((proj) => (
                      <div 
                        key={proj.id}
                        onClick={() => setSelectedProjectId(proj.id)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                          selectedProjectId === proj.id 
                            ? "bg-slate-900 border-slate-900 text-white" 
                            : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-800"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase font-mono ${
                              selectedProjectId === proj.id ? "bg-red-600 text-white" : "bg-slate-200 text-slate-700"
                            }`}>
                              {proj.id}
                            </span>
                            <h4 className="text-xs font-black mt-1">{proj.name}</h4>
                          </div>

                          <span className={`text-[9px] px-2 py-0.5 rounded font-black uppercase ${
                            proj.status === "In Progress" ? "bg-emerald-500/20 text-emerald-500" :
                            proj.status === "Planning" ? "bg-indigo-500/20 text-indigo-500" : "bg-amber-500/20 text-amber-500"
                          }`}>
                            {proj.status}
                          </span>
                        </div>

                        <p className={`text-[11px] leading-relaxed mt-2 line-clamp-2 ${
                          selectedProjectId === proj.id ? "text-slate-300" : "text-slate-500"
                        }`}>
                          {proj.description}
                        </p>

                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700/10 text-[10px] font-mono">
                          <span className="flex items-center space-x-1">
                            <MapPin size={11} className="text-red-500" />
                            <span>{proj.city}</span>
                          </span>
                          {proj.zonesPerFloor && (
                            <span className={`px-2 py-0.5 rounded font-black uppercase text-[9px] ${
                              selectedProjectId === proj.id ? "bg-red-600/30 text-red-200 border border-red-500/30" : "bg-red-50 text-red-600 border border-red-100"
                            }`}>
                              {proj.zonesPerFloor} {isAmharic ? "ዞኖች/ፎቅ" : "Zones/Floor"}
                            </span>
                          )}
                          <span>Start: {proj.startDate}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      setIsReportModalOpen(true);
                    }}
                    className="w-full bg-slate-900 hover:bg-slate-850 text-white py-2.5 rounded-xl text-xs font-black tracking-wider uppercase transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <FileText size={13} className="text-red-500 animate-pulse" />
                    <span>Generate Site Portfolio Reports</span>
                  </button>
                </div>

                {/* Google Maps Interactive Simulator */}
                <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                        🗺️ {isAmharic ? "የሳይት መገኛና የጂኦፌንስ ክልል መቆጣጠሪያ" : "Interactive Geofence & Location Intelligence Simulator"}
                      </h3>
                      <p className="text-[10px] text-slate-400">Verifies actual clock-ins with high-precision cellular satellite mesh</p>
                    </div>

                    <button
                      onClick={simulateNavigation}
                      disabled={isNavigating}
                      className="bg-red-600 hover:bg-red-700 text-white text-[11px] font-black px-3 py-1.5 rounded-lg flex items-center space-x-1 cursor-pointer"
                    >
                      <Navigation size={11} className={isNavigating ? "animate-spin" : ""} />
                      <span>{isNavigating ? "Navigating..." : "Navigate to Site"}</span>
                    </button>
                  </div>

                  {/* MAP CANVAS GRID PREVIEW */}
                  <div className="relative rounded-xl border border-slate-300 overflow-hidden bg-slate-950 h-[280px] flex items-center justify-center">
                    {/* Retro Blue-Dot Blueprint Map Mockup */}
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:20px_20px] opacity-25"></div>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#ef4444_0.5px,transparent_1px)] bg-[size:16px_16px] opacity-10"></div>
                    
                    {/* Render Selected Location representation */}
                    <div className="absolute text-center space-y-2 z-10">
                      
                      {/* Interactive Visual Geofence Circle Overlay */}
                      <div 
                        className="border-2 border-dashed border-red-500 bg-red-500/10 rounded-full animate-pulse transition-all"
                        style={{
                          width: `${Math.min(220, Math.max(80, mapInteractiveRadius))}px`,
                          height: `${Math.min(220, Math.max(80, mapInteractiveRadius))}px`
                        }}
                      ></div>
                      
                      {/* Blue dot pin */}
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                        <MapPin size={28} className="text-red-500 animate-bounce" />
                        <div className="w-2.5 h-2.5 bg-red-600 rounded-full absolute bottom-0 left-1/2 transform -translate-x-1/2 blur-[1px]"></div>
                      </div>
                    </div>

                    {/* Geofence info tooltip */}
                    <div className="absolute bottom-3 left-3 bg-slate-900/95 border border-slate-800 p-3 rounded-lg text-[10px] text-white font-mono space-y-1">
                      <p className="font-bold text-red-500">{selectedProject.name}</p>
                      <p className="text-slate-300">Lat: {mapInteractiveLat}° N</p>
                      <p className="text-slate-300">Lng: {mapInteractiveLng}° E</p>
                      <p className="text-slate-400">Geofence Radius: <strong className="text-white">{mapInteractiveRadius}m</strong></p>
                      {selectedProject.zonesPerFloor && (
                        <p className="text-red-400">
                          {isAmharic ? "በፎቅ የሚገኙ ዞኖች: " : "Zones per Floor: "}
                          <strong className="text-white">{selectedProject.zonesPerFloor}</strong>
                        </p>
                      )}
                    </div>

                    {/* Simulation logs Overlay */}
                    {isNavigating && (
                      <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 space-y-3 z-20">
                        <Compass className="text-red-500 animate-spin" size={32} />
                        <p className="text-xs font-bold text-white uppercase tracking-wider font-mono">SIMULATING ROUTE NAVIGATION</p>
                        
                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-red-500 h-full transition-all duration-1000" style={{ width: `${navProgress}%` }}></div>
                        </div>

                        <p className="text-[10px] text-emerald-400 text-center font-mono">
                          {navigationSteps[Math.min(navigationSteps.length - 1, Math.floor((navProgress / 100) * navigationSteps.length))]}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Geofence manual config settings */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div>
                      <label className="text-[9px] text-slate-400 uppercase font-black block mb-1">Set Geofence Radius (meters)</label>
                      <div className="flex items-center space-x-2">
                        <input 
                          type="range" 
                          min="50" 
                          max="500" 
                          step="25"
                          value={mapInteractiveRadius} 
                          onChange={(e) => {
                            setMapInteractiveRadius(Number(e.target.value));
                            // Save updated config
                            setProjects(prev => prev.map(p => {
                              if (p.id === selectedProjectId) {
                                return { ...p, geofenceRadius: Number(e.target.value) };
                              }
                              return p;
                            }));
                          }}
                          className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-red-500"
                        />
                        <span className="font-bold font-mono shrink-0">{mapInteractiveRadius}m</span>
                      </div>
                    </div>

                    <div>
                      <label className="text-[9px] text-slate-400 uppercase font-black block mb-1">Interactive Coordinates</label>
                      <p className="font-mono text-slate-700 font-bold">{mapInteractiveLat.toFixed(4)}° N, {mapInteractiveLng.toFixed(4)}° E</p>
                    </div>

                    <div>
                      <label className="text-[9px] text-slate-400 uppercase font-black block mb-1">Attendance Validation</label>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-700 px-2 py-0.5 rounded font-black uppercase inline-block">
                        Active Protection
                      </span>
                    </div>
                  </div>

                </div>

              </div>

            </div>
          )}

          {/* ======================================= */}
          {/* TAB 2: NEW PROJECT REGISTRATION FORM */}
          {/* ======================================= */}
          {activeSubTab === "registration" && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    🏗️ {isAmharic ? "አዲስ የግንባታ ፕሮጀክት መመዝገቢያ ፎርም" : "Project Registration Workspace"}
                  </h3>
                  <p className="text-[10px] text-slate-400">Use this form to initiate a new Digital Construction ERP site and assign relevant engineering personnel.</p>
                </div>
                <span className="text-[9px] bg-slate-100 px-2.5 py-1 rounded text-slate-500 font-bold uppercase">
                  {canRegisterAndEdit ? "HO AUTHORIZED" : "READ ONLY"}
                </span>
              </div>

              {canRegisterAndEdit ? (
                <form onSubmit={handleCreateProject} className="space-y-6">
                  
                  {/* General Fields Section */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">
                        {isAmharic ? "የፕሮጀክት ስም *" : "Project Name *"}
                      </label>
                      <input 
                        type="text" 
                        required
                        value={projName}
                        onChange={(e) => setProjName(e.target.value)}
                        placeholder={isAmharic ? "ለምሳሌ ቦሌ ሃይትስ ብሎክ C" : "e.g. Digital Construction ERP Ayat East Block C"}
                        className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:border-red-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">
                        {isAmharic ? "የደንበኛ ስም *" : "Client Name *"}
                      </label>
                      <input 
                        type="text" 
                        required
                        value={projClient}
                        onChange={(e) => setProjClient(e.target.value)}
                        placeholder={isAmharic ? "ለምሳሌ የቤቶች ልማት ኮርፖሬሽን" : "e.g. Digital Construction ERP System"}
                        className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:border-red-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">
                        {isAmharic ? "የኮንትራክተር ስም" : "Contractor Name"}
                      </label>
                      <input 
                        type="text" 
                        value={projContractor}
                        onChange={(e) => setProjContractor(e.target.value)}
                        className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:border-red-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-red-500 uppercase block mb-1">
                        {isAmharic ? "በአንድ ፎቅ ውስጥ የሚገኙ ዞኖች ብዛት *" : "Zones per Floor *"}
                      </label>
                      <input 
                        type="number" 
                        required
                        min="1"
                        max="10"
                        value={projZonesPerFloor}
                        onChange={(e) => setProjZonesPerFloor(Math.max(1, Number(e.target.value)))}
                        className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-red-200 focus:border-red-500 rounded-lg p-2.5 focus:outline-none"
                      />
                      <p className="text-[9px] text-slate-400 mt-0.5">
                        {isAmharic ? "ይህ ፕሮጀክት በአንድ ፎቅ ውስጥ የሚኖረውን የዞኖች ብዛት ይገልጻል" : "Specifies default concrete-pour zones per floor levels."}
                      </p>
                    </div>
                  </div>

                  {/* Assignments Section */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Project Manager Assigned</label>
                      <input 
                        type="text" 
                        value={projPM}
                        onChange={(e) => setProjPM(e.target.value)}
                        placeholder="e.g. Eng. Yoseph Hailu"
                        className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:border-red-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Supervisor Assigned</label>
                      <input 
                        type="text" 
                        value={projSupervisor}
                        onChange={(e) => setProjSupervisor(e.target.value)}
                        placeholder="e.g. Kassa Hunegn"
                        className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:border-red-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Start Date</label>
                      <input 
                        type="date" 
                        value={projStart}
                        onChange={(e) => setProjStart(e.target.value)}
                        className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:border-red-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Planned Completion Date</label>
                      <input 
                        type="date" 
                        value={projEnd}
                        onChange={(e) => setProjEnd(e.target.value)}
                        className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:border-red-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Geography Coordinates and Radius */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="md:col-span-4 border-b border-slate-200 pb-2">
                      <h4 className="text-xs font-black uppercase text-slate-800">Geofence Location Coordinates</h4>
                      <p className="text-[10px] text-slate-400">Prdigital_construction_erpe direct coordinates for mobile check-in verification maps.</p>
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">GPS Latitude (N)</label>
                      <input 
                        type="number" 
                        step="0.0001"
                        value={projLat}
                        onChange={(e) => setProjLat(Number(e.target.value))}
                        className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg p-2.5 focus:border-red-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">GPS Longitude (E)</label>
                      <input 
                        type="number" 
                        step="0.0001"
                        value={projLng}
                        onChange={(e) => setProjLng(Number(e.target.value))}
                        className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg p-2.5 focus:border-red-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Geofence Radius (m)</label>
                      <select 
                        value={projGeofence}
                        onChange={(e) => setProjGeofence(Number(e.target.value))}
                        className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg p-2.5 focus:border-red-500 focus:outline-none"
                      >
                        <option value="50">50 meters</option>
                        <option value="100">100 meters</option>
                        <option value="150">150 meters</option>
                        <option value="200">200 meters</option>
                        <option value="300">300 meters</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Site City / Address</label>
                      <input 
                        type="text" 
                        value={projAddress}
                        onChange={(e) => setProjAddress(e.target.value)}
                        placeholder="e.g. Bole Axis-4"
                        className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg p-2.5 focus:border-red-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Project Description</label>
                    <textarea 
                      rows={3}
                      value={projDesc}
                      onChange={(e) => setProjDesc(e.target.value)}
                      placeholder="Specify total aluminum formwork panels count, structural constraints or target tower metrics..."
                      className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:border-red-500 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="bg-slate-900 hover:bg-slate-850 text-white rounded-xl py-3 px-6 text-xs font-black tracking-wider uppercase transition-all shadow-sm flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <PlusCircle size={14} className="text-red-500" />
                    <span>Register Site & Activate Geofence</span>
                  </button>

                </form>
              ) : (
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 text-center space-y-3">
                  <Lock size={28} className="text-slate-400 mx-auto" />
                  <p className="text-sm font-bold text-slate-700">Access Restricted</p>
                  <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                    Only authorized personnel belonging to the **Head Office** can register new construction sites, adjust location geofence profiles, or assign structural supervisors.
                  </p>
                </div>
              )}

            </div>
          )}

          {/* ======================================= */}
          {/* TAB 3: SITE HIERARCHY MANAGER */}
          {/* ======================================= */}
          {activeSubTab === "hierarchy" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* LEFT COLUMN: Select project and register buildings */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-6">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    🏢 1. Building Block Registry
                  </h3>
                  <p className="text-[10px] text-slate-400">Configure building counts for the active project.</p>
                </div>

                <form onSubmit={handleCreateBuilding} className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Target Project</label>
                    <select
                      value={selectedBldProj}
                      onChange={(e) => setSelectedBldProj(e.target.value)}
                      className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:border-red-500 focus:outline-none"
                    >
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Building Name</label>
                    <input 
                      type="text" 
                      required
                      value={bldName}
                      onChange={(e) => setBldName(e.target.value)}
                      placeholder="e.g. Tower Block A"
                      className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:border-red-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Building Code</label>
                      <input 
                        type="text" 
                        required
                        value={bldNumber}
                        onChange={(e) => setBldNumber(e.target.value)}
                        placeholder="e.g. B1"
                        className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2.5"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Total Floors</label>
                      <input 
                        type="number" 
                        value={bldFloors}
                        onChange={(e) => setBldFloors(Number(e.target.value))}
                        className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2.5"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Basement Levels</label>
                      <input 
                        type="number" 
                        value={bldBasements}
                        onChange={(e) => setBldBasements(Number(e.target.value))}
                        className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2.5"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Roof Elevation</label>
                      <input 
                        type="number" 
                        value={bldRoof}
                        onChange={(e) => setBldRoof(Number(e.target.value))}
                        className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2.5"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Total Area (sq.m)</label>
                    <input 
                      type="number" 
                      value={bldArea}
                      onChange={(e) => setBldArea(Number(e.target.value))}
                      className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2.5"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!canRegisterAndEdit}
                    className="w-full bg-slate-900 hover:bg-slate-850 text-white rounded-xl py-2 text-xs font-black uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
                  >
                    Register Building
                  </button>
                </form>
              </div>

              {/* MIDDLE COLUMN: Register Floors */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-6">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    📶 2. Floor Level Registry
                  </h3>
                  <p className="text-[10px] text-slate-400">Map concrete elevation levels inside registered structures.</p>
                </div>

                <form onSubmit={handleCreateFloor} className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Select Building</label>
                    <select
                      value={selectedFloorBld}
                      onChange={(e) => setSelectedFloorBld(e.target.value)}
                      className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:border-red-500 focus:outline-none"
                    >
                      {buildings.map(b => (
                        <option key={b.id} value={b.id}>{b.name} ({b.buildingNumber})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Floor Designation Name</label>
                    <input 
                      type="text" 
                      required
                      value={flrName}
                      onChange={(e) => setFlrName(e.target.value)}
                      placeholder="e.g. 4th Floor Flat Slab"
                      className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:border-red-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Floor No</label>
                      <input 
                        type="number" 
                        required
                        value={flrNumber}
                        onChange={(e) => setFlrNumber(Number(e.target.value))}
                        className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2.5"
                      />
                    </div>
                    <div className="col-span-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Elevation (m)</label>
                      <input 
                        type="number" 
                        step="0.1"
                        value={flrElevation}
                        onChange={(e) => setFlrElevation(Number(e.target.value))}
                        className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2.5"
                      />
                    </div>
                    <div className="col-span-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Area (sq.m)</label>
                      <input 
                        type="number" 
                        value={flrArea}
                        onChange={(e) => setFlrArea(Number(e.target.value))}
                        className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2.5"
                      />
                    </div>
                  </div>

                  {currentFloorBldProjZones && (
                    <div className="p-3 bg-red-50 rounded-xl border border-red-100 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <p className="text-[10px] font-black uppercase text-red-600">
                          {isAmharic ? "የራስ-ሰር ዞኖች ማስተካከያ" : "Auto-Zone Generator"}
                        </p>
                        <p className="text-[9px] text-slate-500">
                          {isAmharic
                            ? `ይህንን ፎቅ ሲመዘግቡ ${currentFloorBldProjZones} ዞኖች በራስ-ሰር ይፈጠራሉ።`
                            : `Creating this floor will auto-generate ${currentFloorBldProjZones} zones.`}
                        </p>
                      </div>
                      <span className="text-xs font-black bg-red-600 text-white px-2.5 py-1 rounded-lg font-mono">
                        {currentFloorBldProjZones}
                      </span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={!canRegisterAndEdit}
                    className="w-full bg-slate-900 hover:bg-slate-850 text-white rounded-xl py-2.5 text-xs font-black uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
                  >
                    Register Floor
                  </button>
                </form>
              </div>

              {/* RIGHT COLUMN: Register Zones and Assign Officers */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-6">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    🔄 3. Cycle Zone Registry
                  </h3>
                  <p className="text-[10px] text-slate-400">Subdivide floors into localized aluminum pouring cycles.</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    <span className="text-[8px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-black uppercase">
                      {isAmharic ? "ሴክሽን ሄድ" : "Section Head"}
                    </span>
                    <span className="text-[8px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-black uppercase">
                      {isAmharic ? "ቲም ሊደር" : "Team Leader"}
                    </span>
                    <span className="text-[8px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-black uppercase">
                      {isAmharic ? "ሱፐርቫይዘር" : "Supervisor"}
                    </span>
                  </div>
                </div>

                <form onSubmit={handleCreateZone} className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Select Floor Level</label>
                    <select
                      value={selectedZoneFlr}
                      onChange={(e) => setSelectedZoneFlr(e.target.value)}
                      className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:border-red-500 focus:outline-none"
                    >
                      {floors.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Zone Name</label>
                      <input 
                        type="text" 
                        required
                        value={znName}
                        onChange={(e) => setZnName(e.target.value)}
                        placeholder="e.g. Zone A"
                        className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2.5"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Sequence Order</label>
                      <input 
                        type="number" 
                        value={znSeq}
                        onChange={(e) => setZnSeq(Number(e.target.value))}
                        className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2.5"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Zone Area (sq.m)</label>
                    <input 
                      type="number" 
                      value={znArea}
                      onChange={(e) => setZnArea(Number(e.target.value))}
                      className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:border-red-500 focus:outline-none"
                    />
                  </div>

                  <div className="bg-slate-50 p-3 rounded-lg space-y-2.5 border border-slate-200">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Assigned Officers</span>
                    
                    <div>
                      <label className="text-[9px] text-slate-500 font-bold block mb-0.5">Assigned Supervisor</label>
                      <input 
                        type="text" 
                        value={znSupervisor}
                        onChange={(e) => setZnSupervisor(e.target.value)}
                        placeholder="Kassa Hunegn"
                        className="w-full text-[11px] font-bold text-slate-700 bg-white border border-slate-200 rounded-md p-1.5"
                      />
                    </div>

                    <div>
                      <label className="text-[9px] text-slate-500 font-bold block mb-0.5">Assigned Team Leader</label>
                      <input 
                        type="text" 
                        value={znTL}
                        onChange={(e) => setZnTL(e.target.value)}
                        placeholder="Yohannes Bekele"
                        className="w-full text-[11px] font-bold text-slate-700 bg-white border border-slate-200 rounded-md p-1.5"
                      />
                    </div>

                    <div>
                      <label className="text-[9px] text-slate-500 font-bold block mb-0.5">Assigned Gang Chief</label>
                      <input 
                        type="text" 
                        value={znGC}
                        onChange={(e) => setZnGC(e.target.value)}
                        placeholder="Fikru Tolossa"
                        className="w-full text-[11px] font-bold text-slate-700 bg-white border border-slate-200 rounded-md p-1.5"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={!canRegisterZone}
                    className="w-full bg-slate-900 hover:bg-slate-850 text-white rounded-xl py-2 text-xs font-black uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
                  >
                    Register Zone Segment
                  </button>
                </form>
              </div>

              {/* LIST HIERARCHY ACCORDION/PREVIEW AT BOTTOM */}
              <div className="lg:col-span-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="border-b border-slate-100 pb-2">
                  <h4 className="text-xs font-black uppercase text-slate-800">Hierarchy Breakdown: {selectedProject.name}</h4>
                  <p className="text-[10px] text-slate-400">Synchronized site parameters outlining structures, flat slabs, and pouring cycles.</p>
                </div>

                <div className="space-y-4">
                  {buildings.filter(b => b.projectId === selectedProject.id).map(b => (
                    <div key={b.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                      <div className="flex justify-between items-center text-xs font-bold text-slate-800">
                        <span className="flex items-center space-x-2">
                          <Building2 size={14} className="text-amber-500" />
                          <span>{b.name} (Code: {b.buildingNumber})</span>
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">Floors: {b.floorsCount} | Area: {b.totalArea} m²</span>
                      </div>

                      {/* Floors under building */}
                      <div className="pl-6 space-y-2 border-l border-slate-300">
                        {floors.filter(f => f.buildingId === b.id).map(f => (
                          <div key={f.id} className="bg-white p-2.5 rounded-lg border border-slate-150 space-y-2">
                            <div className="flex justify-between items-center text-[11px] font-bold text-slate-700">
                              <span className="flex items-center space-x-1.5">
                                <Layers size={12} className="text-indigo-500" />
                                <span>Level {f.floorNumber}: {f.name}</span>
                              </span>
                              <span>Elev: {f.elevation}m</span>
                            </div>

                            {/* Zones under floor */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 pl-4">
                              {zones.filter(z => z.floorId === f.id).map(z => (
                                <div key={z.id} className="p-2 bg-slate-50 border border-slate-200 rounded-md text-[10px]">
                                  <div className="flex justify-between items-center font-bold text-slate-800 mb-1">
                                    <span>{z.name}</span>
                                    <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded text-[8px]">Seq {z.workSequence}</span>
                                  </div>
                                  <p className="text-slate-500">Area: {z.area}m²</p>
                                  <p className="text-slate-400 font-mono mt-0.5 text-[8px] truncate">TL: {z.assignedTeamLeader}</p>
                                  <p className="text-slate-400 font-mono text-[8px] truncate">GC: {z.assignedGangChief}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* ======================================= */}
          {/* TAB 4: CAD DRAWING VAULT */}
          {/* ======================================= */}
          {activeSubTab === "cads" && (
            <div className="space-y-6">
              
              {/* TWO COLUMN DRAWING LAYOUT */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* CAD Drawing Upload section */}
                <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                      📐 Upload New Blueprint
                    </h3>
                    <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-bold uppercase">
                      {canUploadDrawing ? "Allowed" : "Forbidden"}
                    </span>
                  </div>

                  {canUploadDrawing ? (
                    <form onSubmit={handleUploadCad} className="space-y-4">
                      <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Target Project</label>
                        <select
                          value={selectedProjectId}
                          onChange={(e) => setSelectedProjectId(e.target.value)}
                          className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:border-red-500 focus:outline-none"
                        >
                          {projects.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Target Block</label>
                          <select
                            value={selectedCadBuilding}
                            onChange={(e) => setSelectedCadBuilding(e.target.value)}
                            className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2 focus:border-red-500"
                          >
                            {buildings.filter(b => b.projectId === selectedProjectId).map(b => (
                              <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Target Floor</label>
                          <select
                            value={selectedCadFloor}
                            onChange={(e) => setSelectedCadFloor(e.target.value)}
                            className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2 focus:border-red-500"
                          >
                            {floors.map(f => (
                              <option key={f.id} value={f.id}>{f.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Drawing Label Name</label>
                        <input 
                          type="text" 
                          required
                          value={cadName}
                          onChange={(e) => setCadName(e.target.value)}
                          placeholder="Digital Construction ERP_BH_FL04_ZONE_A_REV3.dwg"
                          className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:border-red-500 focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Format Type</label>
                          <select
                            value={cadType}
                            onChange={(e) => setCadType(e.target.value as any)}
                            className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2 focus:border-red-500"
                          >
                            <option value="DWG">DWG (AutoCAD)</option>
                            <option value="PDF">PDF Drawing</option>
                            <option value="IFC">IFC Building</option>
                            <option value="Structural">Structural</option>
                            <option value="Architectural">Architectural</option>
                            <option value="Aluminum Formwork Layout">Formwork Layout</option>
                            <option value="Shop Drawing">Shop Drawing</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Revision Number</label>
                          <input 
                            type="number" 
                            min="1"
                            value={cadRev}
                            onChange={(e) => setCadRev(Number(e.target.value))}
                            className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2 focus:border-red-500"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-slate-900 hover:bg-slate-850 text-white rounded-xl py-2.5 text-xs font-black uppercase transition-all flex items-center justify-center space-x-1"
                      >
                        <Upload size={13} className="text-red-500" />
                        <span>Publish Drawing</span>
                      </button>
                    </form>
                  ) : (
                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 text-center space-y-2">
                      <Lock size={24} className="text-slate-400 mx-auto" />
                      <p className="text-xs font-bold text-slate-700">Supervisor and Head Office Only</p>
                      <p className="text-[10px] text-slate-400 leading-relaxed">
                        Gang Chiefs and Team Leaders only retain viewing permissions for drawings.
                      </p>
                    </div>
                  )}
                </div>

                {/* Drawings List & Search */}
                <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                      📁 Registered Drawings Vault
                    </h3>
                    
                    <div className="relative">
                      <input 
                        type="text" 
                        value={cadSearch}
                        onChange={(e) => setCadSearch(e.target.value)}
                        placeholder="Search blueprints..."
                        className="bg-slate-50 text-[11px] font-bold border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:border-red-500 w-full sm:w-48"
                      />
                      <Search size={12} className="text-slate-400 absolute left-2.5 top-2.5" />
                    </div>
                  </div>

                  <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                    {drawings
                      .filter(d => d.projectId === selectedProjectId && (cadSearch.trim() === "" || d.name.toLowerCase().includes(cadSearch.toLowerCase())))
                      .map(d => (
                        <div key={d.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-4">
                          <div className="flex items-center space-x-3 min-w-0">
                            <div className="bg-indigo-100 text-indigo-700 p-2 rounded-lg shrink-0">
                              <FileText size={18} />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs font-black text-slate-800 truncate">{d.name}</h4>
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                Type: <strong className="text-slate-600">{d.type}</strong> | Rev: <strong className="text-red-500">{d.revisionNumber}</strong> | Size: {d.fileSize}
                              </p>
                              <p className="text-[9px] text-slate-400 mt-0.5">Uploaded on {d.uploadDate} by {d.uploadedBy}</p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            {d.status === "Pending Approval" ? (
                              canApproveDrawing ? (
                                <button
                                  onClick={() => handleApproveDrawing(d.id)}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black px-2.5 py-1 rounded-lg cursor-pointer"
                                >
                                  Approve Revision
                                </button>
                              ) : (
                                <span className="bg-amber-150 text-amber-700 px-2 py-0.5 rounded text-[9px] font-black uppercase">
                                  Pending Review
                                </span>
                              )
                            ) : (
                              <span className={`text-[9px] px-2 py-0.5 rounded font-black uppercase ${
                                d.status === "Approved" ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-slate-200 text-slate-600"
                              }`}>
                                {d.status}
                              </span>
                            )}

                            <button 
                              onClick={() => {
                                alert(`Downloading ${d.name} file mock bundle...`);
                              }}
                              className="p-1.5 hover:bg-slate-200 rounded text-slate-600 transition-colors"
                              title="Download Blueprint File"
                            >
                              <Download size={13} />
                            </button>
                          </div>
                        </div>
                      ))}

                    {drawings.filter(d => d.projectId === selectedProjectId).length === 0 && (
                      <div className="text-center py-8 text-slate-400 text-xs">
                        No active blueprints on file for this project.
                      </div>
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* ======================================= */}
          {/* TAB 5: PROJECT DOCUMENT LIBRARY */}
          {/* ======================================= */}
          {activeSubTab === "documents" && (
            <div className="space-y-6">
              
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Document Upload section */}
                <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                      📄 File Site Document
                    </h3>
                    <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-bold uppercase">
                      {canUploadDoc ? "Allowed" : "Read-Only"}
                    </span>
                  </div>

                  {canUploadDoc ? (
                    <form onSubmit={handleUploadDoc} className="space-y-4">
                      <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Target Project</label>
                        <select
                          value={selectedProjectId}
                          onChange={(e) => setSelectedProjectId(e.target.value)}
                          className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2.5"
                        >
                          {projects.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Document File Name</label>
                        <input 
                          type="text" 
                          required
                          value={docName}
                          onChange={(e) => setDocName(e.target.value)}
                          placeholder="e.g. HSE_ScaffoldingRiskPlan.pdf"
                          className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:border-red-500 focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Category Type</label>
                          <select
                            value={docType}
                            onChange={(e) => setDocType(e.target.value as any)}
                            className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2 focus:border-red-500"
                          >
                            <option value="Method Statement">Method Statement</option>
                            <option value="Inspection Checklist">Inspection Checklist</option>
                            <option value="Safety Document">Safety Document</option>
                            <option value="Material List">Material List</option>
                            <option value="Panel List">Panel List</option>
                            <option value="Equipment List">Equipment List</option>
                            <option value="Daily Report">Daily Report</option>
                            <option value="Weekly Report">Weekly Report</option>
                            <option value="Monthly Report">Monthly Report</option>
                            <option value="Concrete Pour Schedule">Pour Schedule</option>
                            <option value="Quality Inspection Report">Quality Report</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Extension</label>
                          <select
                            value={docExt}
                            onChange={(e) => setDocExt(e.target.value as any)}
                            className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2 focus:border-red-500"
                          >
                            <option value="PDF">PDF Document</option>
                            <option value="XLSX">Excel Sheet</option>
                            <option value="DOCX">Word Document</option>
                            <option value="PNG">Image file</option>
                            <option value="ZIP">ZIP Bundle</option>
                          </select>
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-slate-900 hover:bg-slate-850 text-white rounded-xl py-2.5 text-xs font-black uppercase transition-all flex items-center justify-center space-x-1"
                      >
                        <Upload size={13} className="text-red-500" />
                        <span>Publish Document</span>
                      </button>
                    </form>
                  ) : (
                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 text-center space-y-2">
                      <Lock size={24} className="text-slate-400 mx-auto" />
                      <p className="text-xs font-bold text-slate-700">Filing Restricted</p>
                      <p className="text-[10px] text-slate-400 leading-relaxed">
                        Only Supervisors, PMs and Team Leaders can publish checklists or pour schedules.
                      </p>
                    </div>
                  )}
                </div>

                {/* Documents List & Search */}
                <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                      📁 Project Document Registry
                    </h3>
                    
                    <div className="relative">
                      <input 
                        type="text" 
                        value={docSearch}
                        onChange={(e) => setDocSearch(e.target.value)}
                        placeholder="Search document names..."
                        className="bg-slate-50 text-[11px] font-bold border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:border-red-500 w-full sm:w-48"
                      />
                      <Search size={12} className="text-slate-400 absolute left-2.5 top-2.5" />
                    </div>
                  </div>

                  <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                    {projectDocs
                      .filter(doc => doc.projectId === selectedProjectId && (docSearch.trim() === "" || doc.name.toLowerCase().includes(docSearch.toLowerCase())))
                      .map(doc => (
                        <div key={doc.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-4">
                          <div className="flex items-center space-x-3 min-w-0">
                            <div className={`p-2 rounded-lg shrink-0 ${
                              doc.fileExtension === "PDF" ? "bg-red-50 text-red-700" :
                              doc.fileExtension === "XLSX" ? "bg-emerald-50 text-emerald-700" :
                              "bg-indigo-50 text-indigo-700"
                            }`}>
                              <FileText size={18} />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs font-black text-slate-800 truncate">{doc.name}</h4>
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                Category: <strong className="text-slate-600">{doc.type}</strong> | Size: {doc.fileSize}
                              </p>
                              <p className="text-[9px] text-slate-400 mt-0.5">Filed on {doc.uploadDate} by {doc.uploadedBy}</p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <button 
                              onClick={() => {
                                alert(`Simulating safe download of structural document: ${doc.name}`);
                              }}
                              className="p-1.5 hover:bg-slate-200 rounded text-slate-600 transition-colors"
                              title="Download document bundle"
                            >
                              <Download size={13} />
                            </button>
                          </div>
                        </div>
                      ))}

                    {projectDocs.filter(d => d.projectId === selectedProjectId).length === 0 && (
                      <div className="text-center py-8 text-slate-400 text-xs">
                        No registered documents on file for this project.
                      </div>
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}

        </motion.div>
      </AnimatePresence>

      {/* REPORT EXPORT MODAL PANEL */}
      <AnimatePresence>
        {isReportModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 animate-fade-in">
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 shadow-xl"
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">Configure Report Downloads</h4>
                <button 
                  onClick={() => setIsReportModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-black block mb-1">Select Report Package</label>
                  <select
                    value={activeReportType}
                    onChange={(e) => setActiveReportType(e.target.value)}
                    className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-0"
                  >
                    <option value="Project Site Portfolio">Project Site Portfolio (Complete Summary)</option>
                    <option value="Attendance Audit Verification">Geofence Attendance Verification (Audit Log)</option>
                    <option value="CAD Revision History Log">CAD Blueprint Revision History Log</option>
                    <option value="Daily Pour inspection Checklist">Concrete Pour Inspection Report Checklist</option>
                  </select>
                </div>

                <div className="space-y-2.5">
                  <span className="text-[10px] text-slate-400 uppercase font-black block">Export Formats Available</span>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleExportSubmit}
                      className="bg-slate-50 hover:bg-slate-100 border border-slate-200 p-3 rounded-xl flex flex-col items-center justify-center text-center space-y-1 transition-all cursor-pointer"
                    >
                      <FileText size={18} className="text-red-600" />
                      <span className="text-[10px] font-black text-slate-700">Export as PDF</span>
                    </button>

                    <button
                      onClick={handleExportSubmit}
                      className="bg-slate-50 hover:bg-slate-100 border border-slate-200 p-3 rounded-xl flex flex-col items-center justify-center text-center space-y-1 transition-all cursor-pointer"
                    >
                      <FileSpreadsheet size={18} className="text-emerald-600" />
                      <span className="text-[10px] font-black text-slate-700">Export as Excel</span>
                    </button>
                  </div>
                </div>

                {exportSuccess ? (
                  <div className="bg-emerald-50 text-emerald-800 text-[11px] font-bold p-3 rounded-xl text-center border border-emerald-100 flex items-center justify-center space-x-1.5">
                    <CheckCircle2 size={13} className="text-emerald-600 animate-bounce" />
                    <span>Report compiled and successfully downloaded!</span>
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400 leading-relaxed text-center font-mono">
                    Compiled packages are securely stored in our encrypted Cloud backups.
                  </p>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
